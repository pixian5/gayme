#!/usr/bin/env bash
# 部署到 Hugging Face Space（static SDK）
#
# 用法：
#   export HF_TOKEN=hf_xxx        # 需要 write 权限的 HF token（不要写进仓库）
#   bash tools/deploy_hf.sh       # 默认推送到 xbzsb/sakura-letters
#   HF_SPACE=用户/空间 bash tools/deploy_hf.sh   # 换目标 Space
#
# 说明：
# - 只同步运行所需文件（HTML / css / js / fonts / audio / assets / icons），
#   不含 docs、经验、tests、tools 等开发资料，避免把文档也塞进 Space。
# - HF 现在拒绝包含裸二进制文件的推送，所以 webp / ogg / woff2 / png 必须走
#   Git LFS（HF 会把它落到 Xet 存储），脚本会自动补齐 .gitattributes 规则。
# - Space 的 README 用 tools/hf-space-readme.md（带 sdk: static frontmatter），
#   不要用项目根 README（没有 frontmatter，Space 会认为配置缺失）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPACE="${HF_SPACE:-xbzsb/sakura-letters}"
WORK="${HF_WORKDIR:-/tmp/hf-space}"
VERSION="$(tr -d '\r\n' < "$ROOT/VERSION")"

: "${HF_TOKEN:?需要 HF_TOKEN 环境变量（Hugging Face write 权限 token）}"

command -v git-lfs >/dev/null || { echo "缺少 git-lfs：brew install git-lfs"; exit 1; }
git lfs version >/dev/null

URL="https://user:${HF_TOKEN}@huggingface.co/spaces/${SPACE}"

echo "==> 准备工作目录 $WORK"
if [ -d "$WORK/.git" ]; then
  git -C "$WORK" fetch -q "$URL" main
  git -C "$WORK" reset -q --hard FETCH_HEAD
else
  rm -rf "$WORK"
  git clone -q "$URL" "$WORK"
fi

echo "==> 同步运行文件（v${VERSION})"
rsync -a --delete \
  --exclude '.git' --exclude '.gitattributes' \
  "$ROOT/index.html" "$ROOT/favicon.svg" "$ROOT/manifest.webmanifest" \
  "$ROOT/sw.js" "$ROOT/VERSION" \
  "$ROOT/css" "$ROOT/js" "$ROOT/fonts" "$ROOT/audio" "$ROOT/assets" "$ROOT/icons" \
  "$WORK/"
cp "$ROOT/tools/hf-space-readme.md" "$WORK/README.md"

# git-lfs 仅对当前工作目录生效；.gitattributes 保留 HF 模板里的模型文件规则
git -C "$WORK" lfs install --local >/dev/null
for pat in webp jpg jpeg png ogg mp3 wav woff2 woff svg; do
  grep -q "^\\*.${pat} filter=lfs" "$WORK/.gitattributes" 2>/dev/null || \
    echo "*.${pat} filter=lfs diff=lfs merge=lfs -text" >> "$WORK/.gitattributes"
done

git -C "$WORK" add -A
git -C "$WORK" add --renormalize .

if git -C "$WORK" diff --cached --quiet && [ -z "$(git -C "$WORK" status --porcelain)" ]; then
  echo "==> 无变更，跳过推送"
else
  git -C "$WORK" -c user.name="xbzsb" -c user.email="sbxwn@noreply.huggingface.co" \
    commit -q -m "部署樱时信笺 v${VERSION} 静态站点" || true
  echo "==> 推送到 $SPACE"
  git -C "$WORK" push -q "$URL" main
fi

BASE="https://${SPACE//\//-}.static.hf.space/index.html"
echo "==> 等待生效"
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE" || true)
  if [ "$code" = "200" ]; then
    online=$(curl -s --max-time 15 "https://${SPACE//\//-}.static.hf.space/VERSION" | tr -d '\r\n')
    echo "==> 线上 v${online}（本地 v${VERSION}）  $BASE"
    [ "$online" = "$VERSION" ] || { echo "!! 版本不一致，稍后再查（CDN 可能仍在刷新）"; exit 1; }
    exit 0
  fi
  sleep 10
done
echo "!! 10 次轮询仍未就绪，请到 Space 页面查看构建日志：https://huggingface.co/spaces/$SPACE"
exit 1
