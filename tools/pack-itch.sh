#!/bin/bash
# 打包 itch.io 分发 zip（v3.4.1）：只含运行所需文件，剔除工程目录
# 用法：bash tools/pack-itch.sh [输出目录，默认 dist/]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist}"
VER=$(cat VERSION)
mkdir -p "$OUT"
ZIP="$OUT/sakura-letters-v$VER-itch.zip"
rm -f "$ZIP"
zip -r -q "$ZIP" \
  index.html manifest.webmanifest sw.js favicon.svg \
  css js fonts icons assets \
  -x "css/.DS_Store" "js/.DS_Store"
echo "打包完成: $ZIP ($(du -h "$ZIP" | cut -f1))"
echo "itch.io 上传建议：HTML5 嵌入模式，viewport 1280x800，勾选 mobile friendly；"
echo "页面文案：见 docs/20261025-0745-发行准备-GLM.md 附段。"
