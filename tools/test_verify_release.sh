#!/bin/bash
# tools/verify_release.sh 的离线测试
# 用本地假站点覆盖各种「不一致」，不碰任何线上环境。
# 用法：bash tools/test_verify_release.sh   （排错：KEEP=1 保留工作目录）
set -u
export LC_ALL=C
HERE=$(cd "$(dirname "$0")" && pwd)
TOOL="$HERE/verify_release.sh"
W=$(mktemp -d /tmp/verifyrelease_test.XXXXXX)

fail=0
check() { if [ "$2" = "$3" ]; then echo "  通过: $1"; else echo "  失败: $1（得到「$2」，预期「$3」）"; fail=1; fi; }
has() { if printf '%s' "$2" | grep -q -- "$3"; then echo "  通过: $1"; else echo "  失败: $1（输出里找不到：$3）"; fail=1; fi; }

# ---------- 假站点：按 MODE 制造不同的异常 ----------
cat > "$W/mock.py" << 'PY'
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

mode = sys.argv[1]
port_file = sys.argv[2]
VER = "3.4.59"
SECRET_PATHS = [
    "/server/api.mjs", "/tests/static.test.mjs", "/tools/box_cron_deploy.sh",
    "/docs/发版流程.md", "/经验/", "/文档索引.md", "/.github/workflows/test.yml",
]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8", extra=None, head=False):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        for key, val in (extra or {}).items():
            self.send_header(key, val)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def do_GET(self):
        self.route(head=False)

    def do_HEAD(self):
        self.route(head=True)

    def route(self, head):
        path = unquote(self.path.split("?")[0])
        sec = {} if mode == "header-bad" else {
            "X-Frame-Options": "SAMEORIGIN",
            "Content-Security-Policy": "frame-ancestors 'self'",
        }
        if path == "/VERSION":
            body = ("3.4.58" if mode == "version-bad" else VER) + "\n"
            return self._send(200, body.encode(), head=head)
        if path == "/api/health":
            bad_ver = "3.4.58" if mode == "health-bad" else VER
            body = json.dumps({"ok": True, "service": "gayme-account",
                               "version": bad_ver, "database": "ok"}).encode()
            return self._send(200, body, "application/json", head=head)
        if path in ("/", "/index.html"):
            account = 'content="https://api.example.com"' if mode == "account-bad" else 'content=""'
            body = (
                '<!doctype html><title>假站点</title>'
                '<meta name="gayme-account-api" ' + account + '>'
                f'<script src="js/engine.js?v={VER}"></script>'
            ).encode()
            return self._send(200, body, "text/html; charset=utf-8", sec, head=head)
        if path == "/sw.js":
            return self._send(200, f"const CACHE = 'sakura-v{VER}';".encode(), head=head)
        if path in SECRET_PATHS:
            if mode == "leak-bad" and path == "/tools/box_cron_deploy.sh":
                return self._send(200, b"secret", head=head)
            return self._send(404, b"not found", head=head)
        return self._send(404, b"not found", head=head)


srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
with open(port_file, "w", encoding="utf-8") as f:
    f.write(str(srv.server_address[1]))
srv.serve_forever()
PY

start_mock() { # start_mock <mode> → 设置 PORT
  rm -f "$W/port"
  # 输出必须重定向到文件：后台进程若继承调用方的 stdout 管道，脚本结束后管道不关闭，
  # 上层（CI / 终端管道 / 代理）会一直等不到 EOF，表现为「测试卡死」。
  python3 "$W/mock.py" "$1" "$W/port" >> "$W/mock.log" 2>&1 &
  mock_pid=$!
  for _ in $(seq 1 50); do [ -s "$W/port" ] && break; sleep 0.2; done
  PORT=$(cat "$W/port" 2>/dev/null)
}
stop_mock() {
  [ -n "${mock_pid:-}" ] || return 0
  kill "$mock_pid" 2>/dev/null
  for _ in $(seq 1 20); do kill -0 "$mock_pid" 2>/dev/null || break; sleep 0.1; done
  kill -9 "$mock_pid" 2>/dev/null
  wait "$mock_pid" 2>/dev/null
  mock_pid=""
}
trap 'stop_mock 2>/dev/null || true; [ "${KEEP:-}" = "1" ] || rm -rf "$W"; [ "${KEEP:-}" = "1" ] && echo "工作目录保留：$W" >&2' EXIT

export GAYME_EXPECTED_VERSION=3.4.59

run_case() { # run_case <模式> <预期退出码>
  start_mock "$1"
  if [ -z "$PORT" ]; then
    stop_mock
    check "$1：假站点启动" "未启动" "已启动"
    CASE_OUT=""
    return
  fi
  out=$(bash "$TOOL" "http://127.0.0.1:$PORT" 2>&1)
  rc=$?
  stop_mock
  CASE_OUT="$out"
  check "$1：退出码" "$rc" "$2"
}

echo "[1/1] 发版自检脚本各情形"

# 1) 全部正常
run_case ok 0
has "正常站点：汇总无失败" "$CASE_OUT" "失败 0 项"
has "正常站点：结论通过" "$CASE_OUT" "发版自检全部通过"

# 2) 站点 VERSION 落后
run_case version-bad 1
has "版本落后：指出 /VERSION 不一致" "$CASE_OUT" "/VERSION 与本地一致"

# 3) 账号健康检查版本落后（v3.4.57 的真实事故）
run_case health-bad 1
has "健康检查落后：指出版本不一致" "$CASE_OUT" "版本号与本地一致"

# 4) 缺 X-Frame-Options / CSP
run_case header-bad 1
has "缺响应头：指出 X-Frame-Options" "$CASE_OUT" "X-Frame-Options"

# 5) 敏感目录泄漏
run_case leak-bad 1
has "目录泄漏：指出 tools 可访问" "$CASE_OUT" "/tools/box_cron_deploy.sh 不可访问"

# 6) 账号开关指向外部
run_case account-bad 1
has "账号开关异常：指出非同源" "$CASE_OUT" "账号开关为同源"

echo "-----"
if [ "$fail" -ne 0 ]; then
  echo "测试未通过" >&2
  exit 1
fi
echo "全部通过：6 个情形"
