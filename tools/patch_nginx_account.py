#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给 InstaBox 盒子两个 nginx 站点补上账号服务反向代理。

背景：sakura-web（8090 明文）与 sakura-tls（2096 TLS）都由 nginx:alpine 容器提供，
站点根只读挂载；账号服务跑在宿主机 172.17.0.1:8096。本脚本幂等修改两份配置：
1. server 级 client_max_body_size 8m（云存档上传）；
2. /api/ 反代到 172.17.0.1:8096，透传原始 X-Forwarded-Host/Proto（否则同源 Origin 校验失败）；
3. 自动 nginx -t 并 reload。

用法（盒内 root）：sudo python3 tools/patch_nginx_account.py
"""
from pathlib import Path
import shutil
import subprocess
import time

CONFIGS = [
    Path("/data/home/sakura-web/conf.d/default.conf"),
    Path("/data/home/sakura-tls/conf.d/sakura.conf"),
]
CONTAINERS = ["sakura-web", "sakura-tls"]
API_BLOCK = """    location /api/ {
        {security}proxy_pass http://172.17.0.1:8096;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $http_x_forwarded_host;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_buffering off;
    }
"""

def patch(path: Path) -> bool:
    if not path.exists():
        print(f"SKIP {path}（不存在）")
        return False
    text = path.read_text(encoding="utf-8")
    if "location /api/" in text:
        print(f"OK {path}（已有 /api 代理）")
        return False
    backup = path.with_name(path.name + ".bak-account-" + time.strftime("%Y%m%d%H%M%S"))
    shutil.copy2(path, backup)
    security = ""
    if path.with_name("security_headers.conf").exists():
        security = "include /etc/nginx/conf.d/security_headers.conf;\n        "
    if "client_max_body_size" not in text:
        text = text.replace("server {\n", "server {\n    client_max_body_size 8m;\n", 1)
    block = API_BLOCK.replace("{security}", security)
    if "    location / {\n" not in text:
        raise SystemExit(f"找不到 location / 锚点：{path}")
    text = text.replace("    location / {\n", block + "    location / {\n", 1)
    path.write_text(text, encoding="utf-8")
    print(f"PATCHED {path}（备份 {backup.name}）")
    return True

def main():
    changed = False
    for path in CONFIGS:
        changed = patch(path) or changed
    if not changed:
        print("无需改动")
        return
    for name in CONTAINERS:
        subprocess.run(["docker", "exec", name, "nginx", "-t"], check=True)
        subprocess.run(["docker", "exec", name, "nginx", "-s", "reload"], check=True)
    print("nginx 已重载")

if __name__ == "__main__":
    main()
