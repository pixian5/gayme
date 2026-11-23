#!/bin/bash
# sakura-deploy.sh —— 樱时信笺盒子自动部署（InstaBox 盒子上由 root 的计划任务每 3 分钟执行）
# 仓库留档：tools/box_cron_deploy.sh；盒子上安装为 /root/sakura-deploy.sh。
# v3.4.55 起入库（此前只存在于盒子上，换盒子要靠记忆重写）。
#
# 迁移到新盒子：
#   sudo cp tools/box_cron_deploy.sh /root/sakura-deploy.sh && sudo chmod +x /root/sakura-deploy.sh
#   (sudo crontab -l 2>/dev/null; echo "*/3 * * * * /root/sakura-deploy.sh >/dev/null 2>&1") | sudo crontab -
#   sudo bash tools/box_backup.sh            # 顺带装好每日备份
#   如需跳过「部署前备份」：sudo touch /var/lib/sakura-deploy/skip-backup
#
# 流程：GitCode 拉取 → 部署前备份数据库 → 同步站点（并打开账号功能开关）→ 同步账号服务（代码有变才重启）
#       → 网页 / 账号服务 / 账号开关 / 站点文件完整性 健康检查
#       → 失败则整体回滚并记住该提交（不再反复重试）
#       → 刷新备份计划任务 → 部署脚本自更新（仓库里的版本与本文件不同时，下次运行起用新版）
# 自愈（有没有新提交都会做，按这个顺序）：
#       ① 站点版本与已部署提交对不上（换盒子、站点目录被重建）→ 重新同步（同步时顺带打开账号开关）
#       ② 上一次同步被确认不完整（/var/lib/sakura-deploy/incomplete 还在）→ 重新同步并核对
#       ③ 账号开关是关的 → 补打开
#       修不好的（磁盘满、文件缺失）一律留下 incomplete 标记：之后每次运行静默重试，补齐后才写一行日志
# 离线流程测试：bash tools/test_box_cron_deploy.sh（不碰任何线上文件）
set -u
LOG=/var/log/sakura-deploy.log
REPO=/data/home/gayme-deploy
WEB=/data/home/sakura
ACCOUNT_APP=/data/home/gayme-account/app
STATE_DIR=/var/lib/sakura-deploy
FAILED_SHA="$STATE_DIR/failed.sha"
INCOMPLETE="$STATE_DIR/incomplete"    # 存在 = 上一次同步被确认不完整：每次运行先补同步，核对成功才清除
SELF=/root/sakura-deploy.sh          # 本脚本在盒子上的安装位置（自更新的目标）
# 站点根只放运行文件：server/ 源码、开发资料、构建产物、仓库配置一律不进公开目录。
# 配合 --delete-excluded：线上站点根里已有的这些文件会在下次部署时被清掉。
# v3.4.55 实测补充：此前 dist/（itch 上架截图）与 scripts/check-meta.mjs 虽无敏感内容，但公网可直接下载
EX="--exclude .git --exclude .DS_Store --exclude .github --exclude .githooks --exclude .gitignore --exclude .nojekyll --exclude docs --exclude tests --exclude tools --exclude 经验 --exclude .workbuddy --exclude qa-results --exclude server --exclude scripts --exclude dist --exclude package.json --exclude package-lock.json --exclude README.md --exclude 文档索引.md"

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

account_container_exists() { docker inspect sakura-account >/dev/null 2>&1; }

# 把当前检出的提交同步到位：站点根 + 账号服务代码（非公开目录）。
# --checksum：按内容比较而不是「大小 + 修改时间」。默认规则下，同一秒内先后部署的两个
# 同大小文件（例如 3.4.55 与 3.4.58）会被判成「没变化」而不拷贝——站点只有 15MB，按内容比较代价可忽略
sync_all() {
  rsync -a --checksum --delete --delete-excluded $EX "$REPO/" "$WEB/" 2>>"$LOG"
  install -d -m 755 "$ACCOUNT_APP"
  rsync -a --delete "$REPO/server/" "$ACCOUNT_APP/server/" 2>>"$LOG"
  cp "$REPO/VERSION" "$ACCOUNT_APP/VERSION" 2>>"$LOG"
  chmod -R a+rX "$ACCOUNT_APP" 2>>"$LOG"
  # v3.4.55：仓库里的 index.html 默认关闭账号功能（纯静态部署不去探测 /api/）；
  # 本机带账号服务，部署时打开。打不开时健康检查会判失败。
  # 每次同步都会把仓库里「关闭」的首页覆盖过来，所以每次都要重新打开；成功时的输出丢弃（否则故障期间
  # 每 3 分钟刷一行），只把失败原因（标准错误）写进日志
  if [ -f "$REPO/tools/patch_account_flag.py" ]; then
    python3 "$REPO/tools/patch_account_flag.py" on "$WEB" >/dev/null 2>>"$LOG" \
      || log "!! 账号功能开关未能打开：${WEB}/index.html"
  fi
}

# 账号功能开关是否已打开（带账号服务的部署必须打开，否则设置页不显示账号区块）
account_flag_on() {
  [ -f "$WEB/index.html" ] && grep -q 'name="gayme-account-api" content=""' "$WEB/index.html"
}

# 站点根是否与仓库内容一致（按内容逐文件比较，不靠大小与时间）。
# 用来确认同步真的完整——磁盘写满、同步中途被打断都会留下新旧混杂的文件。
# index.html 的账号开关在站点上被改写过，单独核对；只看内容差异，时间戳等属性差异不算
site_in_sync() {
  [ -f "$WEB/index.html" ] || return 1
  local patched
  patched=$(sed 's#name="gayme-account-api" content="off"#name="gayme-account-api" content=""#' "$REPO/index.html")
  [ "$patched" = "$(cat "$WEB/index.html")" ] || return 1
  if rsync -a --checksum --delete --delete-excluded $EX --dry-run --itemize-changes "$REPO/" "$WEB/" 2>/dev/null \
     | grep -v ' index\.html$' | grep -Eq '^(>f|\*deleting)'; then
    return 1
  fi
  return 0
}

# 自愈 ③：站点已经是最新的提交，但账号开关是关的（例如旧版部署脚本把新提交部署上去时还没这一步）。
# 只在带账号服务且开关未打开时才动手，平时每次计划任务只多一次 grep。
# 修不好时不反复报：记一次并留下 incomplete 标记，交给 ensure_complete 每次静默重试
ensure_account_flag() {
  account_flag_on && return 0
  account_container_exists || return 0
  [ -f "$REPO/tools/patch_account_flag.py" ] || return 0
  [ -f "$INCOMPLETE" ] && return 0
  if python3 "$REPO/tools/patch_account_flag.py" on "$WEB" >>"$LOG" 2>&1; then
    log "账号功能开关原本是关闭的，已自愈打开"
  else
    touch "$INCOMPLETE"
    log "!! 账号功能开关是关闭的，且自愈失败：${WEB}/index.html"
  fi
}

# 站点版本与已部署的提交是否对得上（只比 VERSION）
site_version_matches() {
  [ "$(cat "$WEB/VERSION" 2>/dev/null)" = "$(cat "$REPO/VERSION" 2>/dev/null)" ]
}

# 自愈 ①：没有新提交，但站点版本与已部署的提交对不上（换盒子后首次运行、站点目录被重建）。
# 把已检出的提交重新同步到位；账号服务目录原本是空的（新盒子）时顺带重启一次让容器加载代码。
# 只比 VERSION：不做逐文件巡检，免得把线上的临时手工改动在 3 分钟内悄悄冲掉
ensure_deployed() {
  local fresh=0
  site_version_matches && return 0
  if account_container_exists && [ ! -f "$ACCOUNT_APP/server/index.mjs" ]; then fresh=1; fi
  sync_all
  [ "$fresh" = 1 ] && restart_account
  if site_in_sync; then
    log "站点版本与已部署提交不一致，已重新同步 $(git rev-parse --short=7 HEAD 2>/dev/null) v$(cat "$REPO/VERSION" 2>/dev/null)"
  else
    log "!! 站点重新同步后仍与仓库不一致，提交 ${CUR:0:7}（之后每次运行都会重试）"
    touch "$INCOMPLETE"
  fi
}

# 自愈 ②：上一次同步被确认不完整（标记文件还在）。重新同步并核对，成功后清掉标记；
# 一直不成功就每次运行都静默重试，不刷日志。
# 核对的是仓库里当前检出的提交（HEAD），不是远端最新——失败的提交被回滚后 HEAD 就是上一版
ensure_complete() {
  [ -f "$INCOMPLETE" ] || return 0
  sync_all
  if site_in_sync; then
    rm -f "$INCOMPLETE"
    log "站点文件已补齐并与仓库一致 $(git rev-parse --short=7 HEAD 2>/dev/null) v$(cat "$REPO/VERSION" 2>/dev/null)"
  fi
}

restart_account() {
  if account_container_exists; then
    # docker restart 会把容器名打印到标准输出，只把错误写进日志
    docker restart sakura-account >/dev/null 2>>"$LOG" || log "账号服务重启失败"
  else
    log "账号服务容器不存在，跳过重启（按部署文档重建）"
  fi
}

# 网页与账号服务的健康检查：成功输出 ok，失败输出原因并返回非零
health_check() {
  local code i out
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://127.0.0.1:8090/)
  if [ "$code" != "200" ]; then echo "网页=$code"; return 1; fi
  # 同步必须完整：站点文件要与仓库逐文件一致（磁盘写满、同步被打断会留下新旧混杂的文件）
  if ! site_in_sync; then echo "站点文件与仓库不一致"; return 1; fi
  if account_container_exists; then
    out=""
    for i in $(seq 1 15); do
      out=$(curl -fsS --max-time 3 http://127.0.0.1:8090/api/health 2>/dev/null) && break
      sleep 1
    done
    if ! echo "$out" | grep -q '"database":"ok"'; then echo "账号服务未就绪"; return 1; fi
    if ! account_flag_on; then echo "账号功能开关未打开"; return 1; fi
  fi
  echo "ok"
}

mkdir -p "$STATE_DIR"
cd "$REPO" 2>/dev/null || { log "仓库目录缺失：$REPO"; exit 1; }

if ! git fetch -q origin main 2>>"$LOG"; then
  log "GitCode 拉取失败，保持现状（下次重试）"
  exit 1
fi

PREV=$(git rev-parse HEAD)
CUR=$(git rev-parse origin/main)

# 自愈与有没有新提交无关，放在最前面（否则「失败过的提交不再重试」会提前退出，走不到补齐那一步）。
# 顺序：先同步站点（目录可能是空的），再补齐，最后才单独看账号开关。
# 平时三项都只是几次文件读取，不会写任何东西
ensure_deployed
ensure_complete
ensure_account_flag

[ "$PREV" = "$CUR" ] && exit 0   # 无新提交

# 这个提交上次部署失败过：等新提交到来，不再每 3 分钟重试一次
[ "$(cat "$FAILED_SHA" 2>/dev/null)" = "$CUR" ] && exit 0

git reset -q --hard "$CUR"

# v3.4.55：动线上文件之前先备份数据库（新版本可能带表结构迁移）；备份失败则本次不部署
if [ -f "$REPO/tools/box_backup.sh" ]; then
  if [ -f "$STATE_DIR/skip-backup" ]; then
    log "已设置跳过部署前备份（$STATE_DIR/skip-backup），继续部署"
  elif ! bash "$REPO/tools/box_backup.sh" --backup-only --quiet >>"$LOG" 2>&1; then
    log "部署前数据库备份失败，本次不部署（下次重试）"
    git reset -q --hard "$PREV"
    exit 1
  fi
fi

sync_all
# v3.4.55：只有 server/ 有变化才重启账号容器（重启会中断在途请求、清空限流计数）
if ! git diff --quiet "$PREV" "$CUR" -- server/; then
  restart_account
fi

VER=$(cat "$WEB/VERSION" 2>/dev/null)
if RESULT=$(health_check) && [ -n "$VER" ]; then
  rm -f "$FAILED_SHA" "$INCOMPLETE"
  log "部署成功 ${PREV:0:7}→${CUR:0:7} v$VER"
else
  log "健康检查失败（${RESULT:-未知}），回滚到 ${PREV:0:7}"
  git reset -q --hard "$PREV"
  sync_all
  restart_account
  # 回滚后的同步被打断会留下新旧混杂的文件：再核一次，不一致就重做一遍；
  # 仍不一致则留下标记，之后每次运行都会重试（见 ensure_complete），直到补齐为止
  if ! site_in_sync; then
    sync_all
    site_in_sync || { touch "$INCOMPLETE"; log "!! 回滚后站点文件仍与仓库不一致，需要人工检查：${WEB}"; }
  fi
  echo "$CUR" > "$FAILED_SHA"
  log "已回滚到 ${PREV:0:7}；提交 ${CUR:0:7} 不再自动重试，等新提交"
  exit 1
fi

# 刷新每日备份的计划任务（幂等；重装或换盒子后靠这一步恢复）
if [ -f "$REPO/tools/box_backup.sh" ]; then
  bash "$REPO/tools/box_backup.sh" --install-only --quiet >>"$LOG" 2>&1 || log "备份计划任务刷新失败"
fi

# 部署脚本自更新：仓库里的版本与本文件不同时换成仓库版本。
# 先写临时文件再改名（原子替换）——正在运行的这份脚本读的是旧文件，不受影响，下次运行起用新版。
if [ -f "$REPO/tools/box_cron_deploy.sh" ] && ! cmp -s "$REPO/tools/box_cron_deploy.sh" "$0" 2>/dev/null; then
  if cp "$REPO/tools/box_cron_deploy.sh" "$STATE_DIR/sakura-deploy.sh.new" \
     && mv -f "$STATE_DIR/sakura-deploy.sh.new" "$SELF" \
     && chmod 755 "$SELF"; then
    log "部署脚本已自更新为仓库版本（下次运行生效）"
  else
    log "!! 部署脚本自更新失败（不影响本次部署）"
  fi
fi