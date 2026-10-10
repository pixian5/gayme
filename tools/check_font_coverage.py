#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""字体子集覆盖检查：对比「项目字符集」与「自托管 woff2 的 cmap」，报告缺失字符。

用法：python3 tools/check_font_coverage.py
前置：python3 tools/collect_font_charset.py（生成 /tmp/font_charset.txt）
依赖：.venv 里的 fonttools（.venv/bin/pip install "fonttools[woff]" brotli）
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ["fonts/NotoSerifSC-Regular.woff2", "fonts/NotoSerifSC-Bold.woff2"]
# 已知走系统 emoji / 符号回退、不要求子集覆盖的字符类（私人使用区与常见 emoji 区段）
FALLBACK_RANGES = [(0x1F000, 0x1FAFF), (0x2600, 0x27BF), (0xFE00, 0xFE0F), (0x200D, 0x200D)]


def is_fallback(cp):
    return any(lo <= cp <= hi for lo, hi in FALLBACK_RANGES)


def main():
    charset_file = Path("/tmp/font_charset.txt")
    if not charset_file.exists():
        subprocess.run([sys.executable, str(ROOT / "tools/collect_font_charset.py")], check=True)
    need = {ord(c) for c in charset_file.read_text(encoding="utf-8")}

    covered = set()
    venv_py = ROOT / ".venv/bin/python"
    for font in FONTS:
        code = (
            "from fontTools.ttLib import TTFont\n"
            f"print(' '.join(str(x) for x in TTFont({str(ROOT / font)!r}).getBestCmap().keys()))\n"
        )
        out = subprocess.run([str(venv_py), "-c", code], capture_output=True, text=True, check=True)
        cps = {int(x) for x in out.stdout.split()}
        print(f"{font}: cmap {len(cps)} 字形")
        covered |= cps

    missing = sorted(cp for cp in need - covered if not is_fallback(cp))
    skipped = sorted(cp for cp in need - covered if is_fallback(cp))
    print(f"需要 {len(need)} 字符：覆盖 {len(need - set(missing) - set(skipped))}，"
          f"缺失 {len(missing)}，符号回退（不处理）{len(skipped)}")
    if missing:
        print("缺失字符:", "".join(chr(c) for c in missing))
        print("→ 需按 docs/202609300202工程瘦身与自托管字体.md 重建子集"
             "（tools/rebuild_font_subset.sh，需字体源文件与 WiFi 环境）")
        sys.exit(1)
    print("覆盖完整 ✓")


if __name__ == "__main__":
    main()
