#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""部署期把站点的绝对地址统一成当前 origin（og:url / og:image / twitter:image /
robots Sitemap / sitemap loc）。换盒子或换域名时只改部署参数，不用回改仓库。

用法：python3 tools/patch_site_origin.py https://8090-xxxx.instabox.tech
幂等：只替换 URL 的 scheme+host，保留路径与结尾斜杠。
"""
import re
import sys
from pathlib import Path

if len(sys.argv) < 2:
    raise SystemExit("用法: patch_site_origin.py https://host[:port]")

ORIGIN = sys.argv[1].rstrip("/")
PATTERN = re.compile(r"https?://[A-Za-z0-9.\-]+(?::\d+)?")
TARGETS = ["index.html", "robots.txt", "sitemap.xml"]

root = Path(__file__).resolve().parent.parent
for name in TARGETS:
    path = root / name
    if not path.exists():
        print(f"origin skip: {name}")
        continue
    text = path.read_text(encoding="utf-8")
    new = PATTERN.sub(ORIGIN, text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        print(f"origin patched: {name} -> {ORIGIN}")
    else:
        print(f"origin unchanged: {name}")
