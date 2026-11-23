#!/bin/bash
# box_cron_deploy.sh（盒子自动部署脚本）的离线流程测试
# 本机或盒子上以普通用户执行即可：不碰任何线上文件、容器、计划任务。
# 做法：把部署脚本复制一份并改掉写死的路径；用假的 docker、curl 顶替；
#       「GitCode」用本地裸仓库模拟；每日备份脚本用桩（stub）顶替。
#       work 目录扮演开发者（提交代码），repo 目录扮演盒子上的部署克隆（只有被测脚本会动它）。
# 用法：bash tools/test_box_cron_deploy.sh        （排错：KEEP=1 保留工作目录，TRACE=1 记录执行轨迹）
set -u
# 统一排序与输出规则：本机（macOS）与盒子（Ubuntu）的默认区域设置不同，文件清单类断言要可复现
export LC_ALL=C
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/box_cron_deploy.sh"
W=$(mktemp -d /tmp/crondeploy.XXXXXX)
trap '[ "${KEEP:-}" = "1" ] || rm -rf "$W"; [ "${KEEP:-}" = "1" ] && echo "工作目录保留：$W" >&2' EXIT
FAKE="$W/fake"
mkdir -p "$W/bin" "$FAKE" "$W/web" "$W/app" "$W/state" "$W/root" "$W/logdir"
export FAKE
fail=0
check() { if [ "$2" = "$3" ]; then echo "  通过: $1"; else echo "  失败: $1（得到「$2」，预期「$3」）"; fail=1; fi; }
has() { if grep -q -- "$2" "$3" 2>/dev/null; then echo "  通过: $1"; else echo "  失败: $1（$3 里找不到：$2）"; fail=1; fi; }
hasnot() { if grep -q -- "$2" "$3" 2>/dev/null; then echo "  失败: $1（$3 里不应出现：$2）"; fail=1; else echo "  通过: $1"; fi; }
yesno() { if eval "$1"; then echo 有; else echo 无; fi; }

# ---------- 假的 docker / curl ----------
cat > "$W/bin/docker" << 'SH'
#!/bin/bash
echo "docker $*" >> "$FAKE/calls"
case "$1 $2" in
  "inspect sakura-account") [ -f "$FAKE/container" ] ;;
  "restart sakura-account") touch "$FAKE/restarted"; echo "假容器名" ;;
esac
SH
cat > "$W/bin/curl" << 'SH'
#!/bin/bash
echo "curl $*" >> "$FAKE/calls"
case "$*" in
  *"127.0.0.1:8090/api/health"*)
    [ -f "$FAKE/api_ok" ] && echo '{"status":"ok","database":"ok"}' || exit 22 ;;
  *"127.0.0.1:8090/"*)
    if [ -f "$FAKE/web_ok" ]; then printf 200; else printf 500; fi ;;
esac
SH
# 假 rsync：平时原样转交真正的 rsync；FAKE/partial 存在时，真实同步故意漏掉 js/a.js
# （模拟同步中途被打断、磁盘写满），试运行（--dry-run）不漏——完整性检查靠试运行发现问题
REAL_RSYNC=$(command -v rsync)
cat > "$W/bin/rsync" << SH
#!/bin/bash
if [ -f "$FAKE/partial" ] && [[ " \$* " != *"--dry-run"* ]]; then set -- "\$@" --exclude=js/a.js; fi
exec $REAL_RSYNC "\$@"
SH
chmod +x "$W/bin/docker" "$W/bin/curl" "$W/bin/rsync"
export PATH="$W/bin:$PATH"
touch "$FAKE/container" "$FAKE/api_ok" "$FAKE/web_ok"

# ---------- 模拟仓库：origin.git 扮演 GitCode；work 是开发者目录；repo 是盒子上的部署克隆 ----------
git init -q --bare "$W/origin.git"
git -C "$W/origin.git" symbolic-ref HEAD refs/heads/main   # 线上默认分支是 main
git init -q "$W/work"
# 显式指定分支名（本机默认分支可能是 master，与线上的 main 不一致）
git -C "$W/work" symbolic-ref HEAD refs/heads/main
git -C "$W/work" remote add origin "$W/origin.git"
G="git -C $W/work -c user.email=t@example.com -c user.name=test -c commit.gpgsign=false"
commit_and_push() {
  # $1 = 提交说明
  $G add -A && $G commit -q -m "$1" || { echo "脚手架：提交失败（$1）"; exit 1; }
  $G push -q origin main || { echo "脚手架：推送失败（$1）"; exit 1; }
}
cd "$W/work"
mkdir -p js server tools
# v3.4.54 及之前的写法：开关是空串（同源打开）
printf '<!doctype html><html><head><meta name="gayme-account-api" content=""></head><body>旧</body></html>\n' > index.html
echo "3.4.54" > VERSION
echo "console.log(1)" > js/a.js
echo "export const a = 1;" > server/a.mjs
echo "console.log('账号服务入口');" > server/index.mjs
cp "$HERE/patch_account_flag.py" tools/
cp "$HERE/box_cron_deploy.sh" tools/
# 仓库里的非运行文件：绝不进站点根
mkdir -p dist/itch scripts .github/workflows
echo "截图" > dist/itch/cover.png
echo "console.log('开发脚本')" > scripts/check.mjs
echo "name: test" > .github/workflows/test.yml
echo "node_modules" > .gitignore
echo "{ \"name\": \"x\" }" > package.json
echo "说明" > README.md
cat > tools/box_backup.sh << 'SH'
#!/bin/bash
echo "backup $*" >> "$FAKE/calls"
case "${1:-}" in
  --backup-only) [ ! -f "$FAKE/backup_fail" ] ;;
  --install-only) exit 0 ;;
esac
SH
commit_and_push "C1 旧版本"
C1=$($G rev-parse HEAD)
git clone -q "$W/origin.git" "$W/repo"
R="git -C $W/repo"
# 线上站点根里有历史遗留的非运行文件（v3.4.54 及以前会被同步上去）：部署后必须被清掉
mkdir -p "$W/web/scripts" "$W/web/dist"
echo "遗留脚本" > "$W/web/scripts/leftover.mjs"
echo "遗留截图" > "$W/web/dist/old.png"
echo "遗留说明" > "$W/web/README.md"

# ---------- 被测脚本：改掉写死的路径 ----------
rewrite() {
  sed -e "s#^LOG=/var/log/sakura-deploy.log#LOG=$W/logdir/deploy.log#" \
      -e "s#^REPO=/data/home/gayme-deploy#REPO=$W/repo#" \
      -e "s#^WEB=/data/home/sakura#WEB=$W/web#" \
      -e "s#^ACCOUNT_APP=/data/home/gayme-account/app#ACCOUNT_APP=$W/app#" \
      -e "s#^STATE_DIR=/var/lib/sakura-deploy#STATE_DIR=$W/state#" \
      -e "s#^SELF=/root/sakura-deploy.sh#SELF=$W/root/sakura-deploy.sh#" \
      "$1" > "$2"
  chmod 755 "$2"
}
rewrite "$SRC" "$W/reference.sh"
if grep -nE "^(/data|/var|/root)/" "$W/reference.sh" | grep -qv "^[0-9]*:#"; then
  echo "失败: 被测脚本里仍有未改写的绝对路径"; grep -nE "^(/data|/var|/root)/" "$W/reference.sh"; exit 1
fi
LOG="$W/logdir/deploy.log"
FLAG_ON='name="gayme-account-api" content=""'
FLAG_OFF='name="gayme-account-api" content="off"'
# TRACE=1 时把被测脚本的执行轨迹追加到 $W/trace.log，便于排错。
# 每次运行前装上「改过路径的版本」；运行后把安装副本留存为 last.sh（自更新的结果就在里面），
# 再把安装副本恢复成改过路径的版本——否则下一次运行会去动真实路径。
run() {
  cp "$W/reference.sh" "$W/root/sakura-deploy.sh"
  if [ "${TRACE:-}" = "1" ]; then bash -x "$W/root/sakura-deploy.sh" 2>>"$W/trace.log"; else bash "$W/root/sakura-deploy.sh"; fi
  echo $? > "$W/exit"
  cp "$W/root/sakura-deploy.sh" "$W/root/last.sh"
  cp "$W/reference.sh" "$W/root/sakura-deploy.sh"
}
webver() { cat "$W/web/VERSION" 2>/dev/null; }

echo "情形 0：首次运行——没有新提交，但站点根是空的：把已检出的提交同步到位"
: > "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
check "站点版本" "$(webver)" "3.4.54"
has "日志：已重新同步" "站点版本与已部署提交不一致，已重新同步 ${C1:0:7} v3.4.54" "$LOG"
check "站点根文件清单（非运行文件不进公开目录）" "$(ls -A "$W/web" | tr '\n' ' ')" "VERSION index.html js "
check "历史遗留的 scripts/ 已被清掉" "$(yesno '[ -e "$W/web/scripts" ]')" "无"
check "历史遗留的 dist/ 已被清掉" "$(yesno '[ -e "$W/web/dist" ]')" "无"
check "历史遗留的 README.md 已被清掉" "$(yesno '[ -e "$W/web/README.md" ]')" "无"
hasnot "没有写「部署成功」（这不是一次新部署）" "部署成功" "$LOG"
hasnot "没有做部署前备份（没有要部署的新提交）" "backup" "$FAKE/calls"
hasnot "首次运行不报开关自愈失败" "自愈失败" "$LOG"
echo "  —— 再跑一次：无新提交且一切正常——什么都不做"
: > "$FAKE/calls"
before=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
run; check "退出码" "$(cat "$W/exit")" "0"
hasnot "没有备份 / 同步 / 重启 / 健康检查" "restart\|backup\|curl" "$FAKE/calls"
after=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
check "日志没有新增" "$after" "$before"

echo "情形 1：新提交把开关改成 off 并带来补丁工具——部署后站点上开关必须打开"
printf '<!doctype html><html><head>\n<!-- 账号开关：off = 关闭 -->\n<meta name="gayme-account-api" content="off">\n</head><body>新</body></html>\n' > index.html
echo "3.4.55" > VERSION
echo "export const a = 2;" > server/a.mjs
echo "console.log(2)" > js/a.js
commit_and_push "C2 新版本"
C2=$($G rev-parse HEAD)
rm -f "$FAKE/restarted" "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
check "站点版本" "$(webver)" "3.4.55"
has "站点首页开关已打开" "$FLAG_ON" "$W/web/index.html"
hasnot "站点首页不再有 off" "$FLAG_OFF" "$W/web/index.html"
has "仓库里的 index.html 保持默认关闭（只在站点副本上改）" "$FLAG_OFF" "$W/repo/index.html"
has "部署前做过备份" "^backup --backup-only" "$FAKE/calls"
has "server/ 有变化所以重启账号容器" "^docker restart sakura-account" "$FAKE/calls"
check "重启标记" "$(yesno '[ -f "$FAKE/restarted" ]')" "有"
has "日志：部署成功" "部署成功 ${C1:0:7}→${C2:0:7} v3.4.55" "$LOG"
check "失败记录已清除" "$(yesno '[ -f "$W/state/failed.sha" ]')" "无"
check "站点根文件清单（不出现 tools / server / tests）" "$(ls "$W/web" | tr '\n' ' ')" "VERSION index.html js "
check "账号服务目录清单（不出现站点文件）" "$(ls "$W/app" | tr '\n' ' ')" "VERSION server "
check "账号服务目录文件齐全" "$(ls "$W/app/server" | tr '\n' ' ')" "a.mjs index.mjs "
# 此时安装副本是「改过路径的」，与仓库版本必然不同——自更新会把仓库版本装上去（真实盒子上正是要这样）
has "日志：自更新" "部署脚本已自更新为仓库版本" "$LOG"
check "安装副本已换成仓库版本" "$(cmp -s "$W/repo/tools/box_cron_deploy.sh" "$W/root/last.sh"; echo $?)" "0"
check "安装副本可执行" "$([ -x "$W/root/last.sh" ]; echo $?)" "0"

echo "情形 2：账号服务没就绪——回滚到上一提交，并记住失败提交不再重试"
rm -f "$FAKE/api_ok"
echo "console.log(3)" > js/a.js
echo "3.4.56" > VERSION
commit_and_push "C3 账号服务起不来"
C3=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "1"
check "站点回滚后的版本" "$(webver)" "3.4.55"
check "部署克隆回到上一提交" "$($R rev-parse HEAD)" "$C2"
check "记住的失败提交" "$(cat "$W/state/failed.sha")" "$C3"
has "日志：回滚" "健康检查失败（账号服务未就绪），回滚到 ${C2:0:7}" "$LOG"
has "回滚后开关仍是打开的" "$FLAG_ON" "$W/web/index.html"
echo "  —— 再跑一次：失败提交不再重试"
: > "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
hasnot "没有再备份 / 同步 / 重启" "restart\|backup\|curl" "$FAKE/calls"
check "部署克隆仍停在上一提交" "$($R rev-parse HEAD)" "$C2"

echo "情形 3：开关打不开（新提交把 meta 删了）——健康检查必须判失败并回滚"
touch "$FAKE/api_ok"
printf '<!doctype html><html><head></head><body>没有开关</body></html>\n' > index.html
echo "3.4.57" > VERSION
commit_and_push "C4 开关丢失"
C4=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "1"
has "日志：回滚原因写明开关" "健康检查失败（账号功能开关未打开），回滚到 ${C2:0:7}" "$LOG"
has "日志：开关补丁工具的报错原因" "账号开关 meta 的数量异常" "$LOG"
check "记住的失败提交" "$(cat "$W/state/failed.sha")" "$C4"
check "站点回滚后的版本" "$(webver)" "3.4.55"
has "回滚后开关仍是打开的" "$FLAG_ON" "$W/web/index.html"
echo "  —— 用一个新提交解套（失败的提交不再重试，但新提交照常部署）"
printf '<!doctype html><html><head><meta name="gayme-account-api" content="off"></head><body>修好了</body></html>\n' > index.html
echo "3.4.58" > VERSION
commit_and_push "C5 修好开关"
C5=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "0"
check "站点版本" "$(webver)" "3.4.58"
has "站点首页开关已打开" "$FLAG_ON" "$W/web/index.html"
check "失败记录已清除" "$(yesno '[ -f "$W/state/failed.sha" ]')" "无"

echo "情形 4：已是最新提交但站点开关被关掉——下次运行自愈"
python3 - "$W/web/index.html" << 'PY'
import sys
p = sys.argv[1]
t = open(p, encoding="utf-8").read()
open(p, "w", encoding="utf-8").write(t.replace('name="gayme-account-api" content=""', 'name="gayme-account-api" content="off"'))
PY
run; check "退出码" "$(cat "$W/exit")" "0"
has "站点首页开关已自愈打开" "$FLAG_ON" "$W/web/index.html"
has "日志：自愈" "账号功能开关原本是关闭的，已自愈打开" "$LOG"
echo "  —— 开关正常时：自愈不写日志、不动文件"
before=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
: > "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
after=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
check "日志没有新增" "$after" "$before"
hasnot "只有容器存在性检查，没有任何写操作" "restart\|backup\|curl" "$FAKE/calls"

echo "情形 5：部署前备份失败——本次不部署，下次重试"
touch "$FAKE/backup_fail"
echo "console.log(5)" > js/a.js
echo "3.4.59" > VERSION
commit_and_push "C6 备份失败时的提交"
C6=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "1"
check "站点版本未变" "$(webver)" "3.4.58"
has "日志：不部署" "部署前数据库备份失败，本次不部署（下次重试）" "$LOG"
hasnot "没有同步站点" "rsync" "$LOG"
check "部署克隆回到部署前的提交" "$($R rev-parse HEAD)" "$C5"
rm -f "$FAKE/backup_fail"
run; check "退出码（重试成功）" "$(cat "$W/exit")" "0"
check "站点版本" "$(webver)" "3.4.59"

echo "情形 6：只有前端变化（server/ 没变）——不重启账号容器"
rm -f "$FAKE/restarted" "$FAKE/calls"
echo "console.log(9)" > js/a.js
commit_and_push "C7 只改前端"
run; check "退出码" "$(cat "$W/exit")" "0"
check "没有重启" "$(yesno '[ -f "$FAKE/restarted" ]')" "无"
hasnot "调用记录里没有 docker restart" "docker restart" "$FAKE/calls"

echo "情形 7：部署成功后仓库里的脚本有新版本——安装副本被换成仓库版本"
printf '\n# 新版脚本的标记行\n' >> tools/box_cron_deploy.sh
commit_and_push "C8 脚本更新"
run; check "退出码" "$(cat "$W/exit")" "0"
check "安装副本已换成仓库版本" "$(cmp -s "$W/repo/tools/box_cron_deploy.sh" "$W/root/last.sh"; echo $?)" "0"
has "安装副本确实是新版" "新版脚本的标记行" "$W/root/last.sh"
has "日志：自更新" "部署脚本已自更新为仓库版本（下次运行生效）" "$LOG"

echo "情形 8：没有账号容器——不要求开关，照常部署"
rm -f "$FAKE/container"
echo "console.log(10)" > js/a.js
commit_and_push "C9 无账号容器"
C9=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "0"
has "日志：部署成功" "部署成功" "$LOG"

echo "情形 9：同步中途被打断（漏了 js/a.js）——健康检查判失败并回滚；回滚后仍不完整则留下标记"
touch "$FAKE/container"
touch "$FAKE/partial"
echo "console.log(11)" > js/a.js
echo "3.4.60" > VERSION
commit_and_push "C10 同步会漏文件的提交"
C10=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "1"
has "日志：回滚原因写明文件不一致" "健康检查失败（站点文件与仓库不一致），回滚到 ${C9:0:7}" "$LOG"
check "记住的失败提交" "$(cat "$W/state/failed.sha")" "$C10"
check "站点版本已回到上一提交" "$(webver)" "3.4.59"
has "日志：回滚后仍不一致" "!! 回滚后站点文件仍与仓库不一致，需要人工检查" "$LOG"
check "留下「不完整」标记" "$(yesno '[ -f "$W/state/incomplete" ]')" "有"
echo "  —— 故障还在时：每次运行都静默重试，不刷日志"
before=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
run; check "退出码" "$(cat "$W/exit")" "0"
after=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
check "日志没有新增" "$after" "$before"
check "标记仍在" "$(yesno '[ -f "$W/state/incomplete" ]')" "有"
echo "  —— 故障排除后：即使没有新提交，下次运行也会把站点补齐"
rm -f "$FAKE/partial"
run; check "退出码" "$(cat "$W/exit")" "0"
has "站点文件已补齐" "站点文件已补齐并与仓库一致 ${C9:0:7} v3.4.59" "$LOG"
check "标记已清除" "$(yesno '[ -f "$W/state/incomplete" ]')" "无"
check "站点根文件清单完整" "$(ls "$W/web" | tr '\n' ' ')" "VERSION index.html js "
check "补齐的是已部署的提交（不是失败的那个）" "$(webver)" "3.4.59"

echo "情形 10：换新盒子——部署克隆已是最新提交，站点根与账号服务目录是空的"
rm -rf "$W/web" "$W/app"
mkdir -p "$W/web" "$W/app"
rm -f "$FAKE/restarted"
run; check "退出码" "$(cat "$W/exit")" "0"
check "站点版本" "$(webver)" "3.4.59"
has "站点首页开关已打开" "$FLAG_ON" "$W/web/index.html"
check "站点根文件清单" "$(ls "$W/web" | tr '\n' ' ')" "VERSION index.html js "
check "账号服务目录清单" "$(ls "$W/app" | tr '\n' ' ')" "VERSION server "
has "日志：已重新同步" "站点版本与已部署提交不一致，已重新同步 ${C9:0:7} v3.4.59" "$LOG"
check "账号服务目录原本是空的，所以重启了一次容器" "$(yesno '[ -f "$FAKE/restarted" ]')" "有"
echo "  —— 再跑一次：已一致，不再同步、不写日志、不重启"
rm -f "$FAKE/restarted"
before=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
run; check "退出码" "$(cat "$W/exit")" "0"
after=$(md5 -q "$LOG" 2>/dev/null || md5sum < "$LOG" | cut -d' ' -f1)
check "日志没有新增" "$after" "$before"
check "没有重启" "$(yesno '[ -f "$FAKE/restarted" ]')" "无"
echo "  —— 站点目录被重建但账号服务目录还在：只同步站点，不重启容器"
rm -rf "$W/web"
mkdir -p "$W/web"
run; check "退出码" "$(cat "$W/exit")" "0"
has "站点文件已恢复" "$FLAG_ON" "$W/web/index.html"
check "没有重启" "$(yesno '[ -f "$FAKE/restarted" ]')" "无"
has "日志：已重新同步" "站点版本与已部署提交不一致，已重新同步 ${C9:0:7} v3.4.59" "$LOG"
echo "  —— 线上文件被手工改动（版本号没变）：空闲时不做逐文件巡检，不去冲掉它"
echo "手工热修" >> "$W/web/js/a.js"
run; check "退出码" "$(cat "$W/exit")" "0"
has "手工改动仍在" "手工热修" "$W/web/js/a.js"
echo "  —— 但下一次部署（有新提交）会把它纠正回仓库内容"
echo "console.log(12)" > js/a.js
commit_and_push "C11 纠正线上手工改动"
C11=$($G rev-parse HEAD)
run; check "退出码" "$(cat "$W/exit")" "0"
hasnot "手工改动已被仓库内容覆盖" "手工热修" "$W/web/js/a.js"
has "日志：部署成功" "部署成功 ${C9:0:7}→${C11:0:7}" "$LOG"
check "失败记录已清除" "$(yesno '[ -f "$W/state/failed.sha" ]')" "无"

echo
echo "===== 部署日志全文 ====="
cat "$LOG"
echo "======================="
[ $fail = 0 ] && echo "盒子部署脚本流程测试：全部通过" || { echo "盒子部署脚本流程测试：有失败"; exit 1; }
