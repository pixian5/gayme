#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""版本号同步工具：把 VERSION / package.json / index.html（?v= 与标题页）统一更新到指定版本。

用法：python3 tools/bump_version.py 2.8.6
说明：js/engine.js 头部注释的版本行由各版本提交时手工补充（含变更说明），本工具不做处理。
"""

import json
import re
import sys


def main():
    if len(sys.argv) != 2:
        raise SystemExit("用法: python3 tools/bump_version.py <新版本号，如 2.8.6>")
    ver = sys.argv[1]
    if not re.match(r"^\d+\.\d+\.\d+$", ver):
        raise SystemExit(f"版本号格式不合法: {ver}")

    # VERSION
    with open("VERSION", "w", encoding="utf-8") as f:
        f.write(ver + "\n")

    # package.json（保持 JSON 格式与结尾换行）
    with open("package.json", encoding="utf-8") as f:
        pkg = json.load(f)
    pkg["version"] = ver
    with open("package.json", "w", encoding="utf-8") as f:
        json.dump(pkg, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # package-lock.json（root 与 packages[""] 的 version —— npm install 会把它写成 package.json 的当前版本，
    # v3.3.3 起纳入同步，避免 lock 版本漂移（曾滞留在 3.2.0））
    with open("package-lock.json", encoding="utf-8") as f:
        lock = json.load(f)
    lock["version"] = ver
    if isinstance(lock.get("packages"), dict) and "" in lock["packages"]:
        lock["packages"][""]["version"] = ver
    with open("package-lock.json", "w", encoding="utf-8") as f:
        json.dump(lock, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # index.html：所有 ?v=x.y.z 与标题页 vX.Y.Z · Demo
    with open("index.html", encoding="utf-8") as f:
        html = f.read()
    html, n1 = re.subn(r"\?v=[\d.]+", f"?v={ver}", html)
    html, n2 = re.subn(r"v[\d.]+ · Demo", f"v{ver} · Demo", html)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

    # sw.js 缓存版本（PWA 预缓存随版本换仓，保证更新可达）
    sw = open("sw.js", encoding="utf-8").read()
    sw, n3 = re.subn(r"sakura-v[\d.]+", f"sakura-v{ver}", sw)
    # sw.js 预缓存里的应用代码条目（js/ 与 css/）必须与 index.html 的 ?v= 同步；
    # 字体条目维持 ?v=3.2.4（@font-face 引用的 URL 不变），不参与替换。
    def _bump_app_entry(match):
        return f'"{match.group(1)}?v={ver}"'

    sw, n3b = re.subn(r'"(js/[^"]+|css/[^"]+)\?v=[\d.]+"', _bump_app_entry, sw)
    with open("sw.js", "w", encoding="utf-8") as f:
        f.write(sw)

    # engine.js 运行时版本常量（renderAbout 展示用）
    eng = open("js/engine.js", encoding="utf-8").read()
    eng, n4 = re.subn(r'GAME_VERSION = "[\d.]+"', f'GAME_VERSION = "{ver}"', eng)
    with open("js/engine.js", "w", encoding="utf-8") as f:
        f.write(eng)

    # engine.js 头注释需手工补版本行（含变更说明）；缺失则提示（不自动生成，避免误写）
    eng = open("js/engine.js", encoding="utf-8").read()
    if f"v{ver}" not in eng.split("*/")[0]:
        print(f"⚠️ js/engine.js 头注释缺少 v{ver} 行——请手工补一行变更说明")

    print(f"版本号已同步为 v{ver}（index.html: {n1} 处 ?v=，{n2} 处标题页；sw.js 缓存 {n3} 处、预缓存条目 {n3b} 处；engine.js 常量 {n4} 处；package-lock.json 已同步）")


if __name__ == "__main__":
    main()
