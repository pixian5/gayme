#!/bin/bash
# 部署樱时信笺到自有服务器 oh.sbbz.tech（nginx · HTTPS 8080）
# 用法：bash tools/deploy.sh
# 前置：本机 ~/.ssh 能用 /Users/x/ed25519 登录 ubuntu@18.191.80.90:2424（别名 oh2424）
# 服务器端一次性配置（nginx 站点 + 证书）见 docs/20261011-1300-自有服务器部署-GLM.md

set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-18.191.80.90}"
PORT="${DEPLOY_PORT:-2424}"
USER="${DEPLOY_USER:-ubuntu}"
KEY="${DEPLOY_KEY:-/Users/x/ed25519}"
DEST="/var/www/sakura"

echo "==> 打包并上传到 ${USER}@${HOST}:${PORT} → ${DEST}"
# tar 管道直传（macOS bsdtar 与服务器 GNU tar 兼容；xattr 告警无害）
tar czf - index.html css js fonts favicon.svg .nojekyll manifest.webmanifest sw.js assets icons 2>/dev/null \
  | ssh -i "$KEY" -p "$PORT" -o BatchMode=yes "ubuntu@${HOST}" \
    "tar xzf - -C ${DEST}/ && echo '==> 上传完成'"

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
