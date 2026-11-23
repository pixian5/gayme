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
# 流程：GitCode 拉取 → 部署前备份数据库 → 同步站点 → 同步账号服务（代码有变才重启）
#       → 网页与账号服务健康检查 → 失败则整体回滚并记住该提交（不再反复重试）→ 刷新备份计划任务
set -u
LOG=/var/log/sakura-deploy.log
REPO=/data/home/gayme-deploy
WEB=/data/home/sakura
ACCOUNT_APP=/data/home/gayme-account/app
STATE_DIR=/var/lib/sakura-deploy
FAILED_SHA="$STATE_DIR/failed.sha"
# 站点根只放运行文件；server/ 源码与开发资料绝不能进公开目录
EX="--exclude .git --exclude docs --exclude tests --exclude tools --exclude 经验 --exclude .workbuddy --exclude qa-results --exclude server"

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

account_container_exists() { docker inspect sakura-account >/dev/null 2>&1; }

# 把当前检出的提交同步到位：站点根 + 账号服务代码（非公开目录）
sync_all() {
  rsync -a --delete --delete-excluded $EX "$REPO/" "$WEB/" 2>>"$LOG"
  install -d -m 755 "$ACCOUNT_APP"
  rsync -a --delete "$REPO/server/" "$ACCOUNT_APP/server/" 2>>"$LOG"
  cp "$REPO/VERSION" "$ACCOUNT_APP/VERSION" 2>>"$LOG"
  chmod -R a+rX "$ACCOUNT_APP" 2>>"$LOG"
}

restart_account() {
  if account_container_exists; then
    docker restart sakura-account >>"$LOG" 2>&1 || log "账号服务重启失败"
  else
    log "账号服务容器不存在，跳过重启（按部署文档重建）"
  fi
}

# 网页与账号服务的健康检查：成功输出 ok，失败输出原因并返回非零
health_check() {
  local code i out
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://127.0.0.1:8090/)
  if [ "$code" != "200" ]; then echo "网页=$code"; return 1; fi
  if account_container_exists; then
    out=""
    for i in $(seq 1 15); do
      out=$(curl -fsS --max-time 3 http://127.0.0.1:8090/api/health 2>/dev/null) && break
      sleep 1
    done
    if ! echo "$out" | grep -q '"database":"ok"'; then echo "账号服务未就绪"; return 1; fi
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
[ "$PREV" = "$CUR" ] && exit 0   # 无新提交

# 这个提交上次部署失败过：等新提交到来，不再每 3 分钟重试一次
[ "$(cat "$FAILED_SHA" 2>/dev/null)" = "$CUR" ] && exit 0

git reset -q --hard "$CUR"

# v3.4.55：动线上文件之前先备份数据库（新版本可能带表结构迁移）；备份失败则本次不部署
if [ -f "$REPO/tools/box_backup.sh" ]; then
  if [ -f "$STATE_DIR/skip-backup" ]; then
    log "已设置跳过部署前备份（$STATE_DIR/skip-backup），继续部署"
  elif ! bash "$REPO/tools/box_backup.sh" --backup-only >>"$LOG" 2>&1; then
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
  rm -f "$FAILED_SHA"
  log "部署成功 ${PREV:0:7}→${CUR:0:7} v$VER"
else
  log "健康检查失败（${RESULT:-未知}），回滚到 ${PREV:0:7}"
  git reset -q --hard "$PREV"
  sync_all
  restart_account
  echo "$CUR" > "$FAILED_SHA"
  log "已回滚到 ${PREV:0:7}；提交 ${CUR:0:7} 不再自动重试，等新提交"
  exit 1
fi

# 刷新每日备份的计划任务（幂等；重装或换盒子后靠这一步恢复）
if [ -f "$REPO/tools/box_backup.sh" ]; then
  bash "$REPO/tools/box_backup.sh" --install-only >>"$LOG" 2>&1 || log "备份计划任务刷新失败"
fi
