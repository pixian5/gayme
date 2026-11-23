#!/bin/bash
# 手动直推 InstaBox 盒子（现役自有服务器，默认盒子名 sbjp）——不等 cron 的发版通道
# 用法：bash tools/deploy_box.sh            # 可用 SAKURA_BOX=<盒子名> 覆盖默认盒子
# v3.4.55：动线上文件之前先备份数据库（备份失败则中止）；部署后刷新每日备份计划任务
# 原理：instabox push 把 git 跟踪文件（gzipped tar，≤1GiB）推到盒子暂存区
#       /data/home/sakura-incoming/gayme（push 会按本地目录名落盘，故先暂存），
#       再盒内 rsync --delete 同步到站点根 /data/home/sakura——与盒子 cron 的
#       /root/sakura-deploy.sh 同一套清理语义，避免残留旧文件。
# 站点根被 sakura-web（8090 明文）与 sakura-tls（2096 TLS）两个 nginx:alpine 容器只读挂载。
# 常规发版 push origin(GitHub) 后 cron 每 3 分钟自动拉取；本脚本用于不想等 cron 的手动直推。
# 服务器端配置见 docs/20261107-0200-服务器迁移盒子与域名切换-GLM.md
set -euo pipefail
cd "$(dirname "$0")/.."

BOX="${SAKURA_BOX:-sbjp}"   # 盒子曾名 box-c6119b、xjp，2026-11-24 起为 sbjp
INCOMING="/data/home/sakura-incoming"
WEB="${SAKURA_WEB:-/data/home/sakura}"
URL="${SAKURA_URL:-https://8090-agqxoy6u363jxgfufg2onqxbm4.instabox.tech}"
LOCAL_V="$(tr -d '\r\n' < VERSION)"

command -v instabox >/dev/null || { echo "缺 instabox CLI（https://instabox.sh）"; exit 1; }

echo "==> 推送 git 跟踪文件到 $BOX:$INCOMING"
instabox push "$BOX" . "$INCOMING"

echo "==> 盒内定位暂存内容并 rsync 到 $WEB （--delete 清残留）"
REMOTE_SCRIPT=$(cat <<'EOS'
set -e
INCOMING="$1"
WEB="$2"
SRC="$INCOMING"
if [ ! -f "$SRC/VERSION" ]; then
  SRC=$(find "$INCOMING" -maxdepth 2 -name VERSION -printf '%h\n' 2>/dev/null | head -1)
fi
[ -n "$SRC" ] || SRC="$INCOMING"
# v3.4.55：动线上文件之前先备份数据库（新版本可能带表结构迁移）；备份失败则中止本次部署
if [ -f "$SRC/tools/box_backup.sh" ]; then
  sudo -n bash "$SRC/tools/box_backup.sh" --backup-only --quiet
fi
sudo -n rsync -a --delete --delete-excluded --exclude .git --exclude docs --exclude tests --exclude tools --exclude 经验 --exclude qa-results --exclude server "$SRC/" "$WEB/"
echo "SYNCED_FROM=$SRC"
# 账号服务代码同步到非公开目录，并重启容器；站点根不能出现 server/ 源码
ACCOUNT_APP=/data/home/gayme-account/app
sudo -n install -d -m 755 "$ACCOUNT_APP"
sudo -n rsync -a --delete "$SRC/server/" "$ACCOUNT_APP/server/"
sudo -n cp "$SRC/VERSION" "$ACCOUNT_APP/VERSION"
sudo -n chmod -R a+rX "$ACCOUNT_APP"
if sudo -n docker inspect sakura-account >/dev/null 2>&1; then
  sudo -n docker restart sakura-account >/dev/null   # 手动直推没有「上一次部署的提交」可比，照常重启
fi
if [ -f "$SRC/tools/patch_site_origin.py" ]; then
  ( cd "$WEB" && sudo -n python3 "$SRC/tools/patch_site_origin.py" "$URL" ) || echo "!! origin 注入失败" >&2
fi
if [ -f "$SRC/tools/patch_nginx.py" ]; then
  sudo -n python3 "$SRC/tools/patch_nginx.py" || echo "!! nginx 修正失败（站点仍可访问）" >&2
fi
if [ -f "$SRC/tools/patch_nginx_account.py" ]; then
  sudo -n python3 "$SRC/tools/patch_nginx_account.py" || echo "!! 账号代理修正失败" >&2
fi
# 刷新每日备份计划任务（幂等）
if [ -f "$SRC/tools/box_backup.sh" ]; then
  sudo -n bash "$SRC/tools/box_backup.sh" --install-only --quiet || echo "!! 备份计划任务刷新失败" >&2
fi
EOS
)
instabox exec "$BOX" -- bash -lc "$REMOTE_SCRIPT" _ "$INCOMING" "$WEB"

echo "==> 清理暂存区"
instabox exec "$BOX" -- sudo -n rm -rf "$INCOMING"

echo "==> 健康检查 $URL"
sleep 1
REMOTE_V=$(curl -s --max-time 15 "$URL/VERSION" | tr -d '\r\n')
echo "    线上 v${REMOTE_V:-未知} / 本地 v${LOCAL_V}"
if [ "${REMOTE_V:-}" = "$LOCAL_V" ]; then
  echo "==> 部署成功 ✓  $URL"
else
  echo "!! 版本不一致：若刚推的是新版本，CDN 可能仍在刷新，稍后再查" >&2
  exit 1
fi
