#!/usr/bin/env python3
"""在 InstaBox 盒子内修正静态站 nginx：404 语义、长缓存、gzip。
幂等；修改前备份；失败不写入；最后 nginx -t + reload（容器 sakura-web）。"""
import re, shutil, subprocess, time

CONF = "/data/home/sakura-web/conf.d/default.conf"
NEW_LOC = '''    location ~* \\.(?:js|css|json|webmanifest|ogg|webp|jpg|jpeg|png|svg|woff2|woff|ttf|map|txt|xml|mp3)$ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }'''
SEC_FILE = "/data/home/sakura-web/conf.d/security_headers.conf"
SEC_HEADERS = """add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;
add_header Permissions-Policy \"geolocation=(), microphone=(), camera=()\" always;
add_header Cross-Origin-Opener-Policy \"same-origin\" always;
add_header Cross-Origin-Resource-Policy \"same-origin\" always;
"""
GZIP = '''    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;'''

s = open(CONF, encoding="utf-8").read()
bak = CONF + ".bak"
orig = s
if "try_files $uri =404;" not in s:
    s2, n = re.subn(r"location ~\* \\\.\([^)]*\)\s*\{[^}]*\}", NEW_LOC, s, count=1)
    if n == 0:
        s2 = s.replace("    location / {", NEW_LOC + "\n    location / {", 1)
    s = s2
# v3.4.50：测试产物不对外（qa-results 含完整测试报告与缺陷清单）
if "/qa-results/" not in s:
    s = s.replace("    location / {", "    location ^~ /qa-results/ { return 404; }\n    location / {", 1)
# 站点无客户端路径路由：未知路径应 404，而不是回 index 掩盖缺失
s = s.replace("try_files $uri $uri/ /index.html;", "try_files $uri $uri/ =404;")
# 安全头：server 与每个 location 都 include，避免 add_header 继承被覆盖
try:
    cur = open(SEC_FILE, encoding="utf-8").read()
except FileNotFoundError:
    cur = ""
if SEC_HEADERS not in cur:
    open(SEC_FILE, "w", encoding="utf-8").write(SEC_HEADERS)
INC = "    include /etc/nginx/conf.d/security_headers.conf;"
if "security_headers.conf" not in s:
    s = s.replace("server {", "server {\n" + INC, 1)
    s = re.sub(r"(location[^\n{]*\{)", r"\1\n" + INC, s)
if "application/xml" not in s:
    s = s.replace("types {", "types {\n        application/xml                       xml;", 1)
# v3.4.52：Markdown 以 text/markdown 返回，避免 NOTICE/PRIVACY 被当二进制下载
if "text/markdown" not in s:
    s = s.replace("types {", "types {\n        text/markdown                         md;", 1)
if "gzip on;" not in s:
    s = s.replace("server {", "server {\n" + GZIP, 1)
# v3.4.51：元数据别吃一年 immutable——精确 location 优先级高于正则 location
CACHE_META = """    location = /manifest.webmanifest {
        include /etc/nginx/conf.d/security_headers.conf;
        default_type application/manifest+json;
        add_header Cache-Control "no-cache";
    }
    location = /robots.txt {
        include /etc/nginx/conf.d/security_headers.conf;
        default_type text/plain;
        add_header Cache-Control "public, max-age=300";
    }
    location = /sitemap.xml {
        include /etc/nginx/conf.d/security_headers.conf;
        default_type application/xml;
        add_header Cache-Control "public, max-age=300";
    }
"""
if "location = /manifest.webmanifest" not in s:
    s = s.replace(INC, INC + "\n" + CACHE_META.rstrip("\n"), 1)

if s == orig:
    print("nginx unchanged")
else:
    shutil.copy(CONF, CONF + ".bak-" + time.strftime("%Y%m%d%H%M%S"))
    open(CONF, "w", encoding="utf-8").write(s)
    print("nginx patched")
r = subprocess.run(["docker", "exec", "sakura-web", "nginx", "-t"], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
if r.returncode != 0:
    # 配置无效：恢复备份并保持线上运行配置不变
    try:
        shutil.copy(bak, CONF)
        subprocess.run(["docker", "exec", "sakura-web", "nginx", "-s", "reload"], check=False)
        print("已恢复备份:", bak)
    except Exception as e:
        print("恢复失败:", e)
    raise SystemExit("nginx -t failed, 已回滚，未 reload")
subprocess.run(["docker", "exec", "sakura-web", "nginx", "-s", "reload"], check=True)
print("nginx reloaded")
