#!/bin/bash
# tools/patch_nginx_account.py 的离线测试
# 用临时目录里的配置副本 + 假的 docker 命令，不碰任何线上配置、容器。
# 用法：bash tools/test_nginx_patch.sh   （排错：KEEP=1 保留工作目录）
set -u
export LC_ALL=C
HERE=$(cd "$(dirname "$0")" && pwd)
TOOL="$HERE/patch_nginx_account.py"
W=$(mktemp -d /tmp/nginxpatch.XXXXXX)
trap '[ "${KEEP:-}" = "1" ] || rm -rf "$W"; [ "${KEEP:-}" = "1" ] && echo "工作目录保留：$W" >&2' EXIT
mkdir -p "$W/bin" "$W/web" "$W/tls"
fail=0
check() { if [ "$2" = "$3" ]; then echo "  通过: $1"; else echo "  失败: $1（得到「$2」，预期「$3」）"; fail=1; fi; }
has() { if grep -q -- "$2" "$3" 2>/dev/null; then echo "  通过: $1"; else echo "  失败: $1（$3 里找不到：$2）"; fail=1; fi; }
hasnot() { if grep -q -- "$2" "$3" 2>/dev/null; then echo "  失败: $1（$3 里不应出现：$2）"; fail=1; else echo "  通过: $1"; fi; }
digest() { md5 -q "$1" 2>/dev/null || md5sum < "$1" | cut -d' ' -f1; }

# ---------- 假的 docker：只记录调用；FAKE/nginx_t_fail 存在时 nginx -t 返回非零 ----------
cat > "$W/bin/docker" << 'SH'
#!/bin/bash
echo "docker $*" >> "$FAKE/calls"
if [ "$4" = "-t" ] && [ -f "$FAKE/nginx_t_fail" ]; then echo "nginx: [emerg] 假的语法错误"; exit 1; fi
exit 0
SH
chmod +x "$W/bin/docker"
export PATH="$W/bin:$PATH"
export FAKE="$W"
export SAKURA_NGINX_WEB_CONF="$W/web/default.conf"
export SAKURA_NGINX_TLS_CONF="$W/tls/sakura.conf"
WEB="$W/web/default.conf"
TLS="$W/tls/sakura.conf"
run() { python3 "$TOOL"; echo $? > "$W/exit"; }
XFF_PASS='proxy_set_header X-Forwarded-For $http_x_forwarded_for;'
XFF_APPEND='proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;'

fresh_web() { cat > "$WEB" << 'CONF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location ~ ^/(docs|tests|tools|经验|\.nojekyll)(/|$) {
        deny all; return 404; }

    location / {
        try_files $uri $uri/ =404;
    }
}
CONF
}
fresh_tls() { cat > "$TLS" << 'CONF'
server {
    listen 443 ssl;
    server_name example.test;
    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
CONF
}
# v3.4.55 上线时的样子：已有 /api/，但 X-Forwarded-For 是「追加」写法，没有 server_tokens
old_web() { cat > "$WEB" << CONF
server {
    client_max_body_size 8m;
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    location ~ ^/(docs|tests|tools|经验|\.nojekyll)(/|$) {
        deny all; return 404; }

    location /api/ {
        proxy_pass http://172.17.0.1:8096;
        proxy_set_header Host \$host;
        $XFF_APPEND
        proxy_set_header X-Forwarded-Proto \$http_x_forwarded_proto;
    }
    location / {
        try_files \$uri \$uri/ =404;
    }
}
CONF
}
old_tls() { cat > "$TLS" << CONF
server {
    client_max_body_size 8m;
    listen 443 ssl;
    server_name example.test;

    location /api/ {
        proxy_pass http://172.17.0.1:8096;
        $XFF_APPEND
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
CONF
}
printf 'add_header X-Frame-Options "SAMEORIGIN" always;\n' > "$W/web/security_headers.conf"

echo "情形 1：两份配置都没有 /api/——首次打补丁"
fresh_web; fresh_tls; : > "$FAKE/calls"; rm -f "$FAKE/nginx_t_fail"
run; check "退出码" "$(cat "$W/exit")" "0"
has "8090：/api/ 反代已加入" "location /api/ {" "$WEB"
has "8090：转发地址头原样透传" "$XFF_PASS" "$WEB"
hasnot "8090：不再是追加写法" "proxy_add_x_forwarded_for" "$WEB"
has "8090：反代目标正确" "proxy_pass http://172.17.0.1:8096;" "$WEB"
has "8090：/api/ 里带安全头引入" "include /etc/nginx/conf.d/security_headers.conf;" "$WEB"
has "8090：上传大小上限" "client_max_body_size 8m;" "$WEB"
check "8090：上传大小上限只有一处" "$(grep -c "client_max_body_size" "$WEB")" "1"
has "8090：关闭版本号回显" "server_tokens off;" "$WEB"
has "8090：不对外目录名单含 scripts 与 dist" "(docs|tests|tools|scripts|dist|经验|\\\\.nojekyll)(/|\$)" "$WEB"
has "2096：/api/ 反代已加入" "location /api/ {" "$TLS"
has "2096：转发地址头原样透传" "$XFF_PASS" "$TLS"
has "2096：关闭版本号回显" "server_tokens off;" "$TLS"
check "2096：没有引入 8090 的安全头文件（它不存在于该目录）" "$(grep -c "security_headers.conf" "$TLS")" "0"
check "语法检查执行次数" "$(grep -c -- "nginx -t" "$FAKE/calls")" "2"
check "重载执行次数" "$(grep -c -- "nginx -s reload" "$FAKE/calls")" "2"
check "改动的配置各有一份备份" "$(ls "$W/web" "$W/tls" | grep -c "bak-hardening-")" "2"
cp "$WEB" "$W/web.after1"; cp "$TLS" "$W/tls.after1"

echo "情形 2：重复执行——不改文件、不重载"
: > "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
check "8090 内容不变" "$(digest "$WEB")" "$(digest "$W/web.after1")"
check "2096 内容不变" "$(digest "$TLS")" "$(digest "$W/tls.after1")"
check "没有任何 docker 调用" "$(wc -l < "$FAKE/calls" | tr -d ' ')" "0"
check "没有新增备份" "$(ls "$W/web" "$W/tls" | grep -c "bak-hardening-")" "2"

echo "情形 3：v3.4.55 上线时的旧写法——就地升级"
old_web; old_tls; : > "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
has "8090：改为原样透传" "$XFF_PASS" "$WEB"
hasnot "8090：追加写法已移除" "proxy_add_x_forwarded_for" "$WEB"
has "8090：关闭版本号回显" "server_tokens off;" "$WEB"
check "8090：上传大小上限没有被重复添加" "$(grep -c "client_max_body_size" "$WEB")" "1"
check "8090：/api/ 只有一处" "$(grep -c "location /api/ {" "$WEB")" "1"
has "8090：不对外目录名单已扩充" "scripts|dist" "$WEB"
has "2096：改为原样透传" "$XFF_PASS" "$TLS"
has "2096：关闭版本号回显" "server_tokens off;" "$TLS"
check "重载执行次数" "$(grep -c -- "nginx -s reload" "$FAKE/calls")" "2"
cp "$WEB" "$W/web.after3"; cp "$TLS" "$W/tls.after3"
run; check "再跑一次：8090 内容不变" "$(digest "$WEB")" "$(digest "$W/web.after3")"
check "再跑一次：2096 内容不变" "$(digest "$TLS")" "$(digest "$W/tls.after3")"

echo "情形 4：语法检查不通过——恢复备份、不重载、非零退出"
old_web; old_tls
cp "$WEB" "$W/web.before4"; cp "$TLS" "$W/tls.before4"
: > "$FAKE/calls"; touch "$FAKE/nginx_t_fail"
run; check "退出码" "$(cat "$W/exit")" "1"
check "8090 已恢复为改动前" "$(digest "$WEB")" "$(digest "$W/web.before4")"
check "2096 已恢复为改动前" "$(digest "$TLS")" "$(digest "$W/tls.before4")"
hasnot "没有重载" "nginx -s reload" "$FAKE/calls"
rm -f "$FAKE/nginx_t_fail"

echo "情形 5：/api/ 里的转发地址头是认不出的写法——拒绝修改"
cat > "$WEB" << 'CONF'
server {
    location /api/ {
        proxy_pass http://172.17.0.1:8096;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location / {
        try_files $uri =404;
    }
}
CONF
cp "$WEB" "$W/web.before5"; fresh_tls; : > "$FAKE/calls"
run; check "退出码（非零）" "$(cat "$W/exit")" "1"
check "文件未被改动" "$(digest "$WEB")" "$(digest "$W/web.before5")"
check "没有任何 docker 调用" "$(wc -l < "$FAKE/calls" | tr -d ' ')" "0"

echo "情形 5b：第一份能改、第二份认不出写法——两份都不落盘"
fresh_web
cat > "$TLS" << 'CONF'
server {
    location /api/ {
        proxy_pass http://172.17.0.1:8096;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location / {
        try_files $uri /index.html;
    }
}
CONF
cp "$WEB" "$W/web.before5b"; cp "$TLS" "$W/tls.before5b"; : > "$FAKE/calls"
rm -f "$W"/web/*.bak-hardening-* "$W"/tls/*.bak-hardening-*   # 清掉前面情形留下的备份
run; check "退出码（非零）" "$(cat "$W/exit")" "1"
check "8090 没有被改动" "$(digest "$WEB")" "$(digest "$W/web.before5b")"
check "2096 没有被改动" "$(digest "$TLS")" "$(digest "$W/tls.before5b")"
check "没有任何 docker 调用" "$(wc -l < "$FAKE/calls" | tr -d ' ')" "0"
check "没有留下备份" "$(ls "$W/web" "$W/tls" | grep -c "bak-hardening-")" "0"

echo "情形 6：没有 /api/ 也找不到「location /」锚点——拒绝修改"
printf 'server {\n    listen 80;\n}\n' > "$WEB"; cp "$WEB" "$W/web.before6"; : > "$FAKE/calls"
run; check "退出码（非零）" "$(cat "$W/exit")" "1"
check "文件未被改动" "$(digest "$WEB")" "$(digest "$W/web.before6")"
check "没有任何 docker 调用" "$(wc -l < "$FAKE/calls" | tr -d ' ')" "0"

echo "情形 7：只有一份配置存在——只处理存在的那份"
fresh_web; rm -f "$TLS"; : > "$FAKE/calls"
run; check "退出码" "$(cat "$W/exit")" "0"
has "8090 已打补丁" "$XFF_PASS" "$WEB"
check "只重载了 8090 的容器" "$(grep -c -- "docker exec sakura-web nginx -s reload" "$FAKE/calls")" "1"
check "没有碰 2096 的容器" "$(grep -c "sakura-tls" "$FAKE/calls")" "0"

echo
[ $fail = 0 ] && echo "nginx 配置补丁工具离线测试：全部通过" || { echo "nginx 配置补丁工具离线测试：有失败"; exit 1; }
