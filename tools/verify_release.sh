#!/bin/bash
# 发版后线上自检：一次核对站点版本、账号健康检查、响应头、缓存标记与目录泄露。
# 起因：v3.4.57 部署后站点已是 3.4.57，/api/health 却还报 3.4.56（账号服务缓存了 VERSION），
#       手工 curl 两条地址很容易漏看其中一条。本脚本把这类不一致变成非零退出码。
#
# 用法：
#   bash tools/verify_release.sh                    # 核默认线上地址
#   bash tools/verify_release.sh <网址>              # 核指定站点（如本机预览）
#   bash tools/verify_release.sh --with-box         # 额外核盒内 2096 的响应头（需要 INSTABOX_API_KEY）
#   GAYME_EXPECTED_VERSION=3.4.60 bash ...          # 临时改期望版本（离线测试用）
#   GAYME_SITE_URL=... bash ...                     # 环境变量指定网址
# 退出码：0 全部通过；1 有问题；2 用法/环境错误。
set -u
export LC_ALL=C

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/.." && pwd)
SITE="${GAYME_SITE_URL:-https://8090-agqxoy6u363jxgfufg2onqxbm4.instabox.tech}"
WITH_BOX=0
BOX="${GAYME_BOX:-sbjp}"

# ---------- 参数 ----------
for arg in "$@"; do
  case "$arg" in
    --with-box) WITH_BOX=1 ;;
    -h|--help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    http://*|https://*) SITE="$arg" ;;
    *) echo "未知参数：$arg（只接受网址或 --with-box）" >&2; exit 2 ;;
  esac
done
SITE="${SITE%/}"

LOCAL_VER=$(tr -d '[:space:]' < "$ROOT/VERSION")
EXPECT_VER="${GAYME_EXPECTED_VERSION:-$LOCAL_VER}"

# ---------- 计数与输出 ----------
pass=0
fail=0
ok()   { pass=$((pass + 1)); echo "  通过: $1"; }
bad()  { fail=$((fail + 1)); echo "  失败: $1${2:+（$2）}"; }
have() { # 名称 实际值 期望值
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "得到「$2」，预期「$3」"; fi
}
have_ci() { # 同上，忽略大小写（响应头名大小写随服务器而变，BSD awk 又不支持 IGNORECASE）
  a=$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]')
  e=$(printf '%s' "$3" | tr '[:upper:]' '[:lower:]')
  if [ "$a" = "$e" ]; then ok "$1"; else bad "$1" "得到「$2」，预期「$3」"; fi
}
contain() { # 名称 文本 期望子串
  case "$2" in *"$3"*) ok "$1" ;; *) bad "$1" "找不到：$3" ;; esac
}

tmp=$(mktemp -d /tmp/verifyrelease.XXXXXX)
trap 'rm -rf "$tmp"' EXIT

get() { # get <路径> <输出文件> → 打印 HTTP 状态码
  curl -sS --max-time 15 -o "$2" -w '%{http_code}' "$SITE$1" 2>"$tmp/curlerr" || true
}
head_code() { # head_code <路径>
  curl -sS --max-time 15 -o /dev/null -w '%{http_code}' -I "$SITE$1" 2>/dev/null || true
}
headers_of() { # headers_of <路径> <输出文件>
  curl -sS --max-time 15 -D "$2" -o /dev/null "$SITE$1" 2>/dev/null || true
}

echo "发版自检：$SITE（本地 VERSION $LOCAL_VER，期望 $EXPECT_VER）"

# ---------- 1. 站点版本 ----------
echo "[1/6] 站点版本"
code=$(get /VERSION "$tmp/version")
site_ver=$(tr -d '[:space:]' < "$tmp/version" 2>/dev/null)
have "GET /VERSION 返回 200" "$code" "200"
have "/VERSION 与本地一致" "$site_ver" "$EXPECT_VER"

# ---------- 2. 账号健康检查 ----------
echo "[2/6] 账号健康检查"
code=$(get /api/health "$tmp/health")
have "GET /api/health 返回 200" "$code" "200"
health_out=$(python3 - "$tmp/health" "$EXPECT_VER" << 'PY'
import json, sys
try:
    data = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception as exc:
    print(f"  失败: /api/health 不是合法 JSON（{exc}）")
    sys.exit(1)
expect = sys.argv[2]
checks = [
    ("ok 为 true", data.get("ok") is True, data.get("ok")),
    ("database 为 ok", data.get("database") == "ok", data.get("database")),
    ("版本号与本地一致", data.get("version") == expect, data.get("version")),
]
bad = 0
for name, good, val in checks:
    if good:
        print(f"  通过: {name}")
    else:
        print(f"  失败: {name}（得到「{val}」）")
        bad += 1
sys.exit(1 if bad else 0)
PY
)
printf '%s\n' "$health_out"
pass=$((pass + $(printf '%s\n' "$health_out" | grep -c '^  通过')))
fail=$((fail + $(printf '%s\n' "$health_out" | grep -c '^  失败')))

# ---------- 3. 首页响应头（防嵌入） ----------
echo "[3/6] 首页响应头"
headers_of / "$tmp/head"
# 统一小写后再解析：线上 nginx 走 HTTP/2 时头名是小写，本地假站点可能是大写
tr -d '\r' < "$tmp/head" | tr '[:upper:]' '[:lower:]' > "$tmp/head.lower"
xfo=$(awk '/^x-frame-options:/{sub(/^[^:]*:[ ]*/,""); print; exit}' "$tmp/head.lower")
csp=$(awk '/^content-security-policy:/{sub(/^[^:]*:[ ]*/,""); print; exit}' "$tmp/head.lower")
have_ci "X-Frame-Options: SAMEORIGIN" "$xfo" "SAMEORIGIN"
contain "CSP 含 frame-ancestors 'self'" "$csp" "frame-ancestors 'self'"

# ---------- 4. 首页内容标记 ----------
echo "[4/6] 首页与缓存标记"
code=$(get /index.html "$tmp/index")
have "GET /index.html 返回 200" "$code" "200"
contain "index.html 带当前版本参数" "$(cat "$tmp/index")" "?v=$EXPECT_VER"
account_tag=$(grep -o 'name="gayme-account-api" content="[^"]*"' "$tmp/index" 2>/dev/null | head -1)
have "账号开关为同源（content 为空）" "$account_tag" 'name="gayme-account-api" content=""'
code=$(get /sw.js "$tmp/sw")
have "GET /sw.js 返回 200" "$code" "200"
contain "sw.js 缓存仓版本正确" "$(cat "$tmp/sw")" "sakura-v$EXPECT_VER"

# ---------- 5. 公开目录不该泄露 ----------
echo "[5/6] 敏感路径应 404"
for path in /server/api.mjs /tests/static.test.mjs /tools/box_cron_deploy.sh /docs/发版流程.md /经验/ /文档索引.md /.github/workflows/test.yml; do
  c=$(head_code "$path")
  have "$path 不可访问" "$c" "404"
done

# ---------- 6. 盒内 2096（可选） ----------
echo "[6/6] 盒内 2096 响应头"
if [ "$WITH_BOX" = "1" ]; then
  if ! command -v instabox >/dev/null 2>&1; then
    bad "找不到 instabox 命令（跳过 2096 检查）"
  elif [ -z "${INSTABOX_API_KEY:-}" ]; then
    bad "未设置 INSTABOX_API_KEY（跳过 2096 检查）"
  else
    out=$(INSTABOX_API_KEY="$INSTABOX_API_KEY" instabox exec "$BOX" -- \
      'curl -k -sI https://127.0.0.1:2096/' 2>/dev/null)
    case "$out" in
      *"200"*) ok "2096 首页返回 200" ;;
      *) bad "2096 首页不可用" "${out:0:80}" ;;
    esac
    printf '%s' "$out" | grep -qi 'x-frame-options: *SAMEORIGIN' \
      && ok "2096 有 X-Frame-Options" || bad "2096 缺少 X-Frame-Options"
    printf '%s' "$out" | grep -qi "frame-ancestors 'self'" \
      && ok "2096 有 CSP frame-ancestors" || bad "2096 缺少 CSP frame-ancestors"
  fi
else
  echo "  跳过: 默认不查盒内 2096（需要时加 --with-box）"
fi

# ---------- 汇总 ----------
echo "-----"
echo "通过 $pass 项，失败 $fail 项"
if [ "$fail" -ne 0 ]; then
  echo "发版自检未通过：请核对上面的失败项（部署日志见盒内 /var/log/sakura-deploy.log）" >&2
  exit 1
fi
echo "发版自检全部通过"
