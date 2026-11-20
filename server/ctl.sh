#!/bin/bash
# 樱时信笺 · 账号服务本地/服务器启停脚本
# 用法：
#   bash server/ctl.sh start      # 后台启动（读 server/.env，缺省 127.0.0.1:8096）
#   bash server/ctl.sh stop       # 停止
#   bash server/ctl.sh restart    # 重启
#   bash server/ctl.sh status     # 进程 + /api/health
#   bash server/ctl.sh logs       # tail -f 日志
#   bash server/ctl.sh backup     # SQLite 在线备份到 server/data/backups/
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${GAYME_DATA_DIR:-$ROOT/server/data}"
PID_FILE="$DATA_DIR/account.pid"
LOG_FILE="$DATA_DIR/account.log"
ENV_FILE="$ROOT/server/.env"

mkdir -p "$DATA_DIR"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

PORT="${GAYME_ACCOUNT_PORT:-8096}"
HOST="${GAYME_ACCOUNT_HOST:-127.0.0.1}"
DB_PATH="${GAYME_DB_PATH:-$DATA_DIR/game.db}"
export GAYME_DB_PATH="$DB_PATH"
export GAYME_ACCOUNT_PORT="$PORT"
export GAYME_ACCOUNT_HOST="$HOST"

is_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

start() {
  if is_running; then
    echo "账号服务已在运行（PID $(cat "$PID_FILE")，端口 ${PORT}）"
    return 0
  fi
  rm -f "$PID_FILE"
  echo "==> 启动账号服务：${HOST}:${PORT}，数据库 ${DB_PATH}"
  nohup node "$ROOT/server/index.mjs" >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  if is_running; then
    echo "已启动（PID $(cat "$PID_FILE")），日志 $LOG_FILE"
  else
    echo "启动失败，最后 30 行日志："
    tail -30 "$LOG_FILE" 2>/dev/null || true
    return 1
  fi
}

stop() {
  if ! is_running; then
    echo "账号服务未运行"
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  echo "==> 停止账号服务（PID ${pid}）"
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.25
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "未在 5 秒内退出，强制结束"
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  echo "已停止"
}

health() {
  curl -fsS --max-time 5 "http://$HOST:$PORT/api/health" 2>/dev/null || \
    curl -fsS --max-time 5 "http://127.0.0.1:$PORT/api/health" 2>/dev/null
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status)
    if is_running; then echo "运行中：PID $(cat "$PID_FILE")"; else echo "未运行"; fi
    health && echo || echo "健康检查失败" ;;
  logs) tail -n 100 -f "$LOG_FILE" ;;
  backup) node "$ROOT/server/backup_db.mjs" ;;
  *)
    echo "用法：bash server/ctl.sh {start|stop|restart|status|logs|backup}" >&2
    exit 2 ;;
esac
