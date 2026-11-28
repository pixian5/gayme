#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""InstaBox 盒子上两个 nginx 站点的账号相关配置补丁。
幂等；修改前备份；nginx -t 不通过就恢复备份、不重载。

背景：sakura-web（8090 明文）与 sakura-tls（2096 TLS）都由 nginx:alpine 容器提供，
站点根只读挂载；账号服务跑在宿主机 172.17.0.1:8096。本脚本对两份配置各做这几件事：
1. server 级 client_max_body_size 8m（云存档上传）；
2. /api/ 反代到 172.17.0.1:8096，透传原始 X-Forwarded-Host / X-Forwarded-Proto
   （InstaBox 前置代理会把 Host 改成 127.0.0.1，不透传的话同源 Origin 校验必失败）；
3. v3.4.56：/api/ 的 X-Forwarded-For 改为**原样透传**（$http_x_forwarded_for）。
   原先是 $proxy_add_x_forwarded_for——nginx 往后追加自己看到的对端地址。配合账号服务
   「取第一项」的旧逻辑，前置代理一旦变成「追加」行为，客户端就能伪造地址绕过限流。
   现在账号服务取最后一项（最近一跳可信代理写入的值），所以 nginx 不能再往后追加。
4. v3.4.56：server_tokens off——响应头不再带 nginx 版本号。
5. v3.4.56（仅 8090 那份）：「不对外」的目录名单补上 scripts 与 dist。
   v3.4.55 实测这两个目录此前公网可以下载；部署脚本已不再把它们同步进站点根，这里是第二道防线。
6. v3.4.57：防嵌入（点击劫持）。实测游戏页面可以被任意别的网站用内嵌框架加载——
   页面 meta 里的内容安全策略管不了 frame-ancestors，COOP 管的是弹窗、CORP 也拦不住内嵌。
   这两个响应头只能由 nginx 发：X-Frame-Options: SAMEORIGIN 与 Content-Security-Policy: frame-ancestors 'self'。
   做法是每个站点在自己的 conf.d 下各放一份 security_headers.conf，再在 server 级与
   每个 location 里各 include 一次（location 里只要自己写了 add_header，就不会继承
   server 级的 add_header，所以不能只写在 server 级）。
   两个站点都对外，都要加；只有一份配置存在时只处理存在的那份。

**与账号服务的配合顺序**：本脚本可以让 nginx 先于服务端代码升级（旧服务端 + 新 nginx 仍然正确），
反过来（新服务端 + 旧 nginx）会把所有玩家当成同一个地址。所以带这版服务端的发版，先跑本脚本再推代码。

用法（盒内 root）：sudo python3 tools/patch_nginx_account.py
离线测试：bash tools/test_nginx_patch.sh
"""
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

# 配置文件路径可用环境变量改写——离线测试（tools/test_nginx_patch.sh）用临时目录里的副本来跑，
# docker 命令用 PATH 里的假命令顶替。线上照默认值。
SITES = [
    # (配置文件, 容器名)
    (Path(os.environ.get("SAKURA_NGINX_WEB_CONF", "/data/home/sakura-web/conf.d/default.conf")), "sakura-web"),
    (Path(os.environ.get("SAKURA_NGINX_TLS_CONF", "/data/home/sakura-tls/conf.d/sakura.conf")), "sakura-tls"),
]
ACCOUNT_HOST = "172.17.0.1:8096"

API_BLOCK = """    location /api/ {
        proxy_pass http://{account_host};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $http_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $http_x_forwarded_host;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_buffering off;
    }
"""
XFF_APPEND = "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
XFF_PASSTHROUGH = "proxy_set_header X-Forwarded-For $http_x_forwarded_for;"
# 8090 配置里「不对外」的目录名单（原本由别的脚本写入）；只在这一行存在时扩充它
DENY_OLD = r"(docs|tests|tools|经验|\.nojekyll)(/|$)"
DENY_NEW = r"(docs|tests|tools|scripts|dist|经验|\.nojekyll)(/|$)"
ANCHOR = "    location / {\n"

# v3.4.57：防嵌入的两个响应头（见文件说明第 6 条）
SECURITY_FILE = "security_headers.conf"
SECURITY_INCLUDE = "include /etc/nginx/conf.d/security_headers.conf;"
FRAME_HEADERS = [
    'add_header X-Frame-Options "SAMEORIGIN" always;',
    "add_header Content-Security-Policy \"frame-ancestors 'self'\" always;",
]


def api_block_span(text):
    """返回 /api/ 这个 location 块的 [起, 止) 下标；找不到返回 None。"""
    start = text.find("location /api/ {")
    if start < 0:
        return None
    indent = len(text[start:max(0, text.rfind("\n", 0, start) + 1)])  # 行首缩进
    closing = "\n" + " " * indent + "}"
    end = text.find(closing, start)
    if end < 0:
        raise SystemExit("location /api/ { 没有找到对应的右花括号")
    return start, end + len(closing)


def add_security_includes(text):
    """给 server 级与每个 location 补 include；已经有的不重复加。

    返回 (新内容, 新增次数)。只按文本位置插入，不改动其它内容。
    """
    added = 0
    if SECURITY_INCLUDE not in text:
        text = text.replace("server {\n", "server {\n    " + SECURITY_INCLUDE + "\n", 1)
        added += 1

    def repl(match):
        nonlocal added
        start = match.end()
        # location 开头 500 字符内已有 include 就跳过（避免重复插入、也避免误判别的块）
        if SECURITY_INCLUDE in text[start:start + 500]:
            return match.group(0)
        added += 1
        return match.group(0) + "\n        " + SECURITY_INCLUDE

    text = re.sub(r"(location[^\n{]*\{)", repl, text)
    return text, added


def patch(text, name):
    """对一份配置内容做幂等修改，返回 (新内容, 说明列表)。"""
    notes = []
    if "location /api/" not in text:
        if "client_max_body_size" not in text:
            text = text.replace("server {\n", "server {\n    client_max_body_size 8m;\n", 1)
        if ANCHOR not in text:
            raise SystemExit(f"找不到 location / 锚点：{name}")
        text = text.replace(ANCHOR, API_BLOCK.replace("{account_host}", ACCOUNT_HOST) + ANCHOR, 1)
        notes.append("新增 /api/ 反代")
    else:
        span = api_block_span(text)
        block = text[span[0]:span[1]]
        if XFF_APPEND in block:
            text = text[:span[0]] + block.replace(XFF_APPEND, XFF_PASSTHROUGH) + text[span[1]:]
            notes.append("/api/ 的 X-Forwarded-For 改为原样透传")
        elif XFF_PASSTHROUGH not in block:
            raise SystemExit(f"{name} 的 /api/ 里认不出 X-Forwarded-For 的写法，未修改")
    if "server_tokens" not in text:
        text = text.replace("server {\n", "server {\n    server_tokens off;\n", 1)
        notes.append("server_tokens off")
    if "location ~ ^/" + DENY_OLD in text:
        text = text.replace("location ~ ^/" + DENY_OLD, "location ~ ^/" + DENY_NEW, 1)
        notes.append("不对外目录名单补上 scripts 与 dist")
    text, added = add_security_includes(text)
    if added:
        notes.append("引入安全响应头文件（防嵌入）")
    return text, notes


def ensure_security_file(conf_dir, stamp):
    """保证 conf_dir/security_headers.conf 里有防嵌入的两个头。

    返回 (文件路径, 备份路径或 None)；没有改动返回 None。
    """
    path = conf_dir / SECURITY_FILE
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    missing = [line for line in FRAME_HEADERS if line not in current]
    if not missing:
        return None
    backup = None
    if path.exists():
        backup = path.with_name(path.name + ".bak-frames-" + stamp)
        shutil.copy2(path, backup)
    body = current if not current or current.endswith("\n") else current + "\n"
    path.write_text(body + "\n".join(missing) + "\n", encoding="utf-8")
    print(f"PATCHED {path}：补上防嵌入响应头（X-Frame-Options、frame-ancestors）")
    return path, backup


def main():
    stamp = time.strftime("%Y%m%d%H%M%S")

    # 第一步：配置全部先在内存里改。任何一份被拒绝（认不出的写法、找不到锚点）都在写盘之前抛出，
    # 不会出现「第一份已落盘、第二份没改」的半成品
    pending = []  # (路径, 原内容, 新内容, 说明列表, 容器名)
    for path, container in SITES:
        if not path.exists():
            print(f"SKIP {path}（不存在）")
            continue
        original = path.read_text(encoding="utf-8")
        updated, notes = patch(original, path)
        if updated == original:
            print(f"OK   {path}（已是目标状态）")
            continue
        pending.append((path, original, updated, notes, container))

    # 第二步：安全响应头文件。只要该站点（打完补丁后的）配置引用了它，就保证文件存在。
    # 这一步与配置是否变动无关——从 v3.4.56 升上来时配置没变、只缺这个文件，也要补。
    final_texts = {}
    for path, container in SITES:
        if not path.exists():
            continue
        final = path.read_text(encoding="utf-8")
        for p, _o, u, _n, c in pending:
            if p == path:
                final = u
        final_texts[path] = final
    frame_changes = []  # (文件路径, 备份路径或 None, 容器名)
    for path, container in SITES:
        if path not in final_texts or SECURITY_FILE not in final_texts[path]:
            continue
        record = ensure_security_file(path.parent, stamp)
        if record:
            frame_changes.append((record[0], record[1], container))

    # 第三步：备份并落盘配置
    config_changes = []  # (路径, 备份路径, 容器名)
    for path, original, updated, notes, container in pending:
        backup = path.with_name(path.name + ".bak-hardening-" + stamp)
        shutil.copy2(path, backup)
        path.write_text(updated, encoding="utf-8")
        config_changes.append((path, backup, container))
        print(f"PATCHED {path}：{'；'.join(notes)}（备份 {backup.name}）")

    changed = config_changes + frame_changes
    if not changed:
        print("无需改动")
        return 0

    containers = []
    for _, _, container in changed:
        if container not in containers:
            containers.append(container)
    for container in containers:
        check = subprocess.run(["docker", "exec", container, "nginx", "-t"], capture_output=True, text=True)
        output = (check.stdout + check.stderr).strip()
        if check.returncode != 0:
            # 配置无效：恢复本次改过的全部文件（新建的文件直接删掉），
            # 线上继续用改动前（仍在运行）的配置
            for path, backup, _ in changed:
                if backup is None:
                    path.unlink(missing_ok=True)
                else:
                    shutil.copy2(backup, path)
            print(output)
            print("!! nginx -t 未通过，已恢复全部备份，未重载")
            return 1
    for container in containers:
        subprocess.run(["docker", "exec", container, "nginx", "-s", "reload"], check=True)
    print(f"nginx 已重载：{'、'.join(containers)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
