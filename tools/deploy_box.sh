#!/bin/bash
# 手动直推 InstaBox 盒子（现役自有服务器 box-c6119b）——不等 cron 的发版通道
# 用法：bash tools/deploy_box.sh
# 原理：instabox push 把 git 跟踪文件（gzipped tar，≤1GiB）推到盒子暂存区
#       /data/home/sakura-incoming/gayme（push 会按本地目录名落盘，故先暂存），
#       再盒内 rsync --delete 同步到站点根 /data/home/sakura——与盒子 cron 的
#       /root/sakura-deploy.sh 同一套清理语义，避免残留旧文件。
# 站点根被 sakura-web（8090 明文）与 sakura-tls（2096 TLS）两个 nginx:alpine 容器只读挂载。
# 常规发版 push gitee 后 cron 每 3 分钟自动拉取；本脚本用于不想等 cron 的手动直推。
# 服务器端配置见 docs/20261107-0200-服务器迁移盒子与域名切换-GLM.md
set -euo pipefail
cd "$(dirname "$0")/.."

BOX="${SAKURA_BOX:-box-c6119b}"
INCOMING="/data/home/sakura-incoming"
WEB="${SAKURA_WEB:-/data/home/sakura}"
URL="${SAKURA_URL:-https://8090-agqxoy6u363jxgfufg2onqxbm4.instabox.tech}"
LOCAL_V="$(tr -d '\r\n' < VERSION)"

command -v instabox >/dev/null || { echo "缺 instabox CLI（https://instabox.sh）"; exit 1; }

echo "==> 推送 git 跟踪文件到 $BOX:$INCOMING"
instabox push "$BOX" . "$INCOMING"

echo "==> 盒内 rsync 同步到 $WEB （--delete 清残留）"
instabox exec "$BOX" -- sudo -n rsync -a --delete --delete-excluded \
  --exclude .git --exclude docs --exclude tests --exclude tools --exclude 经验 \
  "$INCOMING/gayme/" "$WEB/"

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
