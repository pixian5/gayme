#!/usr/bin/env python3
"""在 InstaBox 盒子内修正静态站 nginx：404 语义、长缓存、gzip。
幂等；修改前备份；失败不写入；最后 nginx -t + reload（容器 sakura-web）。"""
import re, shutil, subprocess, time

CONF = "/data/home/sakura-web/conf.d/default.conf"
NEW_LOC = '''    location ~* \\.(?:js|css|json|webmanifest|ogg|webp|jpg|jpeg|png|svg|woff2|woff|ttf|map|txt|xml|mp3)$ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }'''
GZIP = '''    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;'''

s = open(CONF, encoding="utf-8").read()
orig = s
if "try_files $uri =404;" not in s:
    s2, n = re.subn(r"location ~\* \\\.\([^)]*\)\s*\{[^}]*\}", NEW_LOC, s, count=1)
    if n == 0:
        s2 = s.replace("    location / {", NEW_LOC + "\n    location / {", 1)
    s = s2
# 站点无客户端路径路由：未知路径应 404，而不是回 index 掩盖缺失
s = s.replace("try_files $uri $uri/ /index.html;", "try_files $uri $uri/ =404;")
if "application/xml" not in s:
    s = s.replace("types {", "types {\n        application/xml                       xml;", 1)
if "gzip on;" not in s:
    s = s.replace("server {", "server {\n" + GZIP, 1)
if s == orig:
    print("nginx unchanged")
else:
    shutil.copy(CONF, CONF + ".bak-" + time.strftime("%Y%m%d%H%M%S"))
    open(CONF, "w", encoding="utf-8").write(s)
    print("nginx patched")
r = subprocess.run(["docker", "exec", "sakura-web", "nginx", "-t"], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
if r.returncode != 0:
    raise SystemExit("nginx -t failed, 未 reload")
subprocess.run(["docker", "exec", "sakura-web", "nginx", "-s", "reload"], check=True)
print("nginx reloaded")
