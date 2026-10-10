#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""收集项目实际使用的字符集，供字体子集裁剪使用。

扫描 index.html + css/*.css + js/**/*.js 的全部字符，补齐 ASCII 可打印字符与
常用中文标点 / 全角符号，输出到 /tmp/font_charset.txt（与 v2.8.3 建子集时的口径一致）。

用法：python3 tools/collect_font_charset.py [输出路径，默认 /tmp/font_charset.txt]
"""

import glob
import sys

EXTRA_PUNCT = (
    "，。！？：；、·—…「」『』（）《》〈〉【】〖〗〔〕"
    "“”‘’￥％℃°×÷±→←↑↓■□▲△▼▽◆◇○●☆★♥♡❤✦✧✕✓✗"
    "　５０％．－"
)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/font_charset.txt"
    chars = set()
    files = ["index.html"] + sorted(glob.glob("css/*.css")) + sorted(glob.glob("js/**/*.js", recursive=True))
    for path in files:
        with open(path, encoding="utf-8") as f:
            chars.update(f.read())
    # ASCII 可打印 + 常用标点补充
    chars.update(chr(c) for c in range(0x20, 0x7F))
    chars.update(EXTRA_PUNCT)
    # 去掉控制字符
    chars = {c for c in chars if ord(c) >= 0x20 or c == "\t"}
    text = "".join(sorted(chars))
    hanzi = sum(1 for c in chars if "\u4e00" <= c <= "\u9fff")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"字符集 {len(chars)} 个（其中汉字 {hanzi} 个）→ {out_path}")


if __name__ == "__main__":
    main()
