#!/bin/bash
# 重建自托管中文字体子集（Noto Serif SC Regular/Bold woff2）。
# 完整流程见 docs/202609300202工程瘦身与自托管字体.md。
#
# ⚠️ 第 0 步要下载约 23MB 字体源文件：请确认当前是 WiFi 而非手机热点再继续！
# 用法：bash tools/rebuild_font_subset.sh [字体源目录，默认 /tmp/noto-src]

set -euo pipefail
cd "$(dirname "$0")/.."

SRC_DIR="${1:-/tmp/noto-src}"
mkdir -p "$SRC_DIR"

# 1) 字体源文件（已存在则跳过下载）
for W in Regular Bold; do
  if [ ! -f "$SRC_DIR/NotoSerifSC-$W.otf" ]; then
    echo "下载 NotoSerifSC-$W.otf（约 11.6MB）..."
    curl -L --fail -o "$SRC_DIR/NotoSerifSC-$W.otf" \
      "https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/SimplifiedChinese/NotoSerifSC-$W.otf"
  fi
done

# 2) 工具
if [ ! -x .venv/bin/pyftsubset ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q "fonttools[woff]" brotli
fi

# 3) 收集字符集
.venv/bin/python tools/collect_font_charset.py /tmp/font_charset.txt

# 4) 裁剪（两个字重）
for W in Regular Bold; do
  .venv/bin/pyftsubset "$SRC_DIR/NotoSerifSC-$W.otf" \
    --text-file=/tmp/font_charset.txt \
    --flavor=woff2 --layout-features='*' --no-hinting --desubroutinize \
    --output-file="fonts/NotoSerifSC-$W.woff2"
done

# 5) 复查覆盖
.venv/bin/python tools/check_font_coverage.py
ls -lh fonts/*.woff2
echo "重建完成。注意：fonts/ 未带 ?v= 版本参数（CSS 引用），如需强刷用户缓存请改名并同时改 css/style.css 的 @font-face 与 index.html 的 preload。"
