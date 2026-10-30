#!/bin/bash
# 部署樱时信笺到自有服务器 oh.sbbz.tech（nginx · HTTPS 8080）
# 用法：bash tools/deploy.sh
# 前置：本机 ~/.ssh 能用 /Users/x/ed25519 登录 ubuntu@18.225.92.148:2424（别名 oh2424）
# 说明：服务器为 releases/<sha> + symlink 原子布局，网站在 /var/www/sakura（指向当前 release）；
#       ubuntu 对该目录无写权限，需 sudo -n（服务器已配置免密），且必须写入 readlink -f 后的实体目录。
#       常规发版只需 push GitHub（root cron 每 3 分钟 sakura-deploy.sh 自动拉取部署）；
#       本脚本用于不想等 cron 时的手动直传（不更新 cron 的 last-deploy 标记，下一次 cron 会做同样的事）。
# 服务器端一次性配置见 docs/20261011-1300-自有服务器部署-GLM.md

set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-18.225.92.148}"
PORT="${DEPLOY_PORT:-2424}"
USER="${DEPLOY_USER:-ubuntu}"
KEY="${DEPLOY_KEY:-/Users/x/ed25519}"
DEST="/var/www/sakura"

echo "==> 解析线上发布目录 ${DEST}"
TARGET=$(ssh -i "$KEY" -p "$PORT" -o BatchMode=yes "${USER}@${HOST}" "readlink -f ${DEST}")
echo "    → ${TARGET}"

echo "==> 打包并上传到 ${USER}@${HOST}:${PORT}"
# tar 管道直传（macOS bsdtar 与服务器 GNU tar 兼容；xattr 告警无害）
# 生图源 jpg（assets/portraits/*_sample*.jpg）属中间产物，不上传
tar czf - --exclude='assets/portraits/*_sample*.jpg' \
  index.html css js fonts favicon.svg .nojekyll manifest.webmanifest sw.js assets icons audio 2>/dev/null \
  | ssh -i "$KEY" -p "$PORT" -o BatchMode=yes "${USER}@${HOST}" \
    "sudo -n mkdir -p '${TARGET}' && sudo -n tar xzf - -C '${TARGET}/' && echo '==> 上传完成'"

echo "==> 验证"
VER=$(curl -s --connect-timeout 10 "https://oh.sbbz.tech:8080/" | grep -o 'v[0-9.]* · Demo' | head -1)
LOCAL=$(cat VERSION | tr -d '\n')
echo "    线上版本: ${VER:-未知} / 本地 VERSION: v${LOCAL}"
if [ "${VER}" = "v${LOCAL} · Demo" ]; then
  echo "==> 部署成功 ✓  https://oh.sbbz.tech:8080/"
else
  echo "!! 版本不一致，请检查" >&2
  exit 1
fi
