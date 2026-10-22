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
# 已知走系统 emoji / 符号回退、不要求子集覆盖的字符类。
# v3.3.0 扩展：UI 按钮使用 emoji（💾⚙️▶▶ 等）与常见符号（⏩⏱⏳⟲⋯☰■□△▽◆◇〖〗％－￥），
# 这些字符在现代浏览器/系统字体（macOS PingFang、Windows Segoe UI Emoji、Linux Noto Color Emoji）均有回退，
# 与正文汉字缺失不同——不算子集缺口，只记录不阻断。
FALLBACK_RANGES = [
    (0x1F000, 0x1FAFF),  # 补充符号/表情符号区
    (0x2600, 0x27BF),    # 杂项符号与装饰（☰ ★ ♪ ⚙ 等）
    (0xFE00, 0xFE0F),    # 变体选择符
    (0x200D, 0x200D),    # 零宽连接符（emoji 序列）
    (0x2190, 0x21FF),    # 箭头
    (0x2300, 0x23FF),    # 杂项技术符号（⏩ ⏱ ⏳）
    (0x2500, 0x25FF),    # 框线与几何形状（■ □ △ ▽ ◆ ◇）
    (0x27C0, 0x27FF),    # 杂项数学符号-B（⟲）
    (0x22EE, 0x22EF),    # ⋮ 竖省略号 / ⋯ 横省略号
    (0x3010, 0x301F),    # CJK 括号（〖〗〔〕 等）
    (0xFF00, 0xFFEF),    # 全角形式（％ － ￥ 等）
]


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
        print("→ 需按 docs/20260930-0202-工程瘦身与自托管字体-GLM.md 重建子集"
             "（tools/rebuild_font_subset.sh，需字体源文件与 WiFi 环境）")
        sys.exit(1)
    print("覆盖完整 ✓")


if __name__ == "__main__":
    main()
