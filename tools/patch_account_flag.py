#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""部署期打开 / 关闭站点的账号功能开关（index.html 里的 meta[name="gayme-account-api"]）。

仓库默认 off：纯静态部署（安装包、静态镜像、测试环境）不探测 /api/，设置页也不显示账号区块。
带账号服务的部署（InstaBox 盒子）在同步站点后执行 on。

用法：python3 tools/patch_account_flag.py on|off [站点根目录]
幂等；已是目标状态时不写文件、不输出。退出码非零 = 没能改成目标状态。"""
import pathlib
import re
import sys

if len(sys.argv) < 2 or sys.argv[1] not in ("on", "off"):
    raise SystemExit("用法: python3 tools/patch_account_flag.py on|off [站点根目录]")
want = sys.argv[1]
root = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path(__file__).resolve().parent.parent
path = root / "index.html"
if not path.exists():
    raise SystemExit(f"找不到 {path}")

text = path.read_text(encoding="utf-8")
target = f'name="gayme-account-api" content="{"" if want == "on" else "off"}"'
new, count = re.subn(r'name="gayme-account-api"\s+content="[^"]*"', target, text)
if count != 1:
    # 一处都没有或有多处：不动文件，交给调用方处理
    raise SystemExit(f"index.html 里账号开关 meta 的数量异常（找到 {count} 处，应为 1），未修改")
# 已是目标状态时什么都不输出：部署脚本每次同步都会调用本工具，不能往部署日志里刷屏
if new != text:
    path.write_text(new, encoding="utf-8")
    print(f"账号功能已{'打开' if want == 'on' else '关闭'}：{path}")
