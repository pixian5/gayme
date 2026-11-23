#!/bin/bash
# 樱时信笺 · 盒子上的账号数据库备份（在 InstaBox 盒子上以 root 执行，幂等）
#
# v3.4.55 新增：server/backup_db.mjs 早已写好，但此前从未被调度——线上数据库没有任何备份。
#
# 用法：
#   sudo bash tools/box_backup.sh                 # 安装/刷新每日备份计划任务，并立即备份一次
#   sudo bash tools/box_backup.sh --backup-only   # 只备份（部署前调用；失败返回非零）
#   sudo bash tools/box_backup.sh --install-only  # 只安装/刷新计划任务
#   sudo bash tools/box_backup.sh --verify        # 备份 + 恢复演练（把最新备份恢复到临时实例并校验）
#
# 可用环境变量调整：SAKURA_ACCOUNT_CONTAINER（默认 sakura-account）
#                   SAKURA_ACCOUNT_DATA（默认 /data/home/gayme-account/data）
#                   SAKURA_ACCOUNT_APP（默认 /data/home/gayme-account/app）
# 告警：/root/.sakura-bark 里放一行推送地址（Bark）时，备份失败或数据盘超过 80% 会推送；
#       不放则只记日志。推送地址属于凭据，不要写进仓库。
set -uo pipefail

CONTAINER="${SAKURA_ACCOUNT_CONTAINER:-sakura-account}"
DATA_DIR="${SAKURA_ACCOUNT_DATA:-/data/home/gayme-account/data}"
APP_DIR="${SAKURA_ACCOUNT_APP:-/data/home/gayme-account/app}"
IMAGE="${SAKURA_ACCOUNT_IMAGE:-node:24-bookworm-slim}"
LOG="${SAKURA_BACKUP_LOG:-/var/log/sakura-backup.log}"
BARK_FILE="/root/.sakura-bark"
MARK="sakura-account-backup"

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

notify() {
  [ -s "$BARK_FILE" ] || return 0
  local url
  url=$(head -n 1 "$BARK_FILE" | tr -d '[:space:]')
  [ -n "$url" ] || return 0
  curl -s --max-time 10 -X POST "$url" -H "Content-Type: application/json; charset=utf-8" \
    -d "{\"title\":\"樱时信笺·盒子\",\"body\":\"$1\"}" >/dev/null 2>&1 || true
}

# 安装/刷新计划任务：每天 03:30 备份一次。带标记的旧条目先摘掉再追加，重复执行结果一致
install_cron() {
  local entry="30 3 * * * docker exec -e NODE_NO_WARNINGS=1 ${CONTAINER} node /app/server/backup_db.mjs >> ${LOG} 2>&1 # ${MARK}"
  local tmp before after rc
  tmp=$(mktemp) || return 1
  crontab -l 2>/dev/null | grep -v "# ${MARK}\$" > "$tmp" || true
  echo "$entry" >> "$tmp"
  # 保护：除本任务外的条目数必须不变，防止管道意外清空整个计划任务表
  before=$(crontab -l 2>/dev/null | grep -v "# ${MARK}\$" | grep -c '[^[:space:]]' || true)
  after=$(grep -c '[^[:space:]]' "$tmp" || true)
  if [ "${before:-0}" != "${after:-0}" ]; then
    rm -f "$tmp"
    log "!! 计划任务条目数不一致（${before:-0} → ${after:-0}），放弃修改"
    return 1
  fi
  crontab "$tmp"; rc=$?
  rm -f "$tmp"
  if [ $rc -eq 0 ]; then log "每日备份计划任务已就位（03:30，标记 ${MARK}）"; fi
  return $rc
}

# 备份一次。没有账号容器或数据库尚未创建时视为成功（无数据可备份）
run_backup() {
  if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
    log "账号容器 ${CONTAINER} 不存在，无数据可备份"
    return 0
  fi
  if [ ! -f "$DATA_DIR/game.db" ]; then
    log "数据库文件尚未创建，无数据可备份"
    return 0
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" != "true" ]; then
    log "账号容器未运行，先启动再备份"
    docker start "$CONTAINER" >/dev/null 2>&1 || true
    sleep 3
  fi
  local out rc
  out=$(docker exec -e NODE_NO_WARNINGS=1 "$CONTAINER" node /app/server/backup_db.mjs 2>&1); rc=$?
  if [ $rc -ne 0 ]; then
    log "!! 备份失败：${out}"
    notify "账号数据库备份失败"
    return 1
  fi
  log "${out}"
}

# 数据盘使用率超过 80% 时告警
check_disk() {
  local pct
  pct=$(df -P "$DATA_DIR" 2>/dev/null | awk 'NR==2 {gsub("%", "", $5); print $5}')
  if [ -n "$pct" ] && [ "$pct" -ge 80 ] 2>/dev/null; then
    log "!! 数据盘使用率 ${pct}%"
    notify "数据盘使用率 ${pct}%"
  fi
}

# 恢复演练：把最新备份复制一份，用与正式相同的镜像和代码起临时实例（只监听本机回环地址），
# 确认能启动、健康检查通过、表里读得出数。没有演练过的备份不算备份。
verify_latest() {
  local latest
  latest=$(ls -1 "$DATA_DIR"/backups/game-*.db 2>/dev/null | sort | tail -1)
  if [ -z "$latest" ]; then
    log "!! 没有可用的备份文件，无法演练"
    return 1
  fi
  local dir port cid i health counts
  dir=$(mktemp -d /tmp/sakura-restore-XXXXXX) || return 1
  cp "$latest" "$dir/game.db"
  port=$(( 21100 + RANDOM % 200 ))
  cid=$(docker run -d --rm -p 127.0.0.1:${port}:8096 \
    -v "$APP_DIR:/app:ro" -v "$dir:/data" \
    -e GAYME_ACCOUNT_HOST=0.0.0.0 -e GAYME_ACCOUNT_PORT=8096 -e GAYME_DB_PATH=/data/game.db \
    -e GAYME_LOG_REQUESTS=0 -e NODE_NO_WARNINGS=1 \
    "$IMAGE" node /app/server/index.mjs 2>&1)
  if [ -z "$cid" ] || ! docker inspect "$cid" >/dev/null 2>&1; then
    log "!! 恢复演练：临时实例启动失败（${cid}）"
    case "$dir" in /tmp/sakura-restore-*) rm -rf -- "$dir" ;; esac
    return 1
  fi
  health=""
  for i in $(seq 1 30); do
    health=$(curl -fsS --max-time 2 "http://127.0.0.1:${port}/api/health" 2>/dev/null) && break
    sleep 1
  done
  counts=$(docker exec "$cid" node -e '
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync("/data/game.db", { readOnly: true });
    console.log(["users", "saves"].map((t) => t + "=" + db.prepare("SELECT COUNT(*) AS n FROM " + t).get().n).join(" "));
    db.close();' 2>/dev/null)
  docker rm -f "$cid" >/dev/null 2>&1
  case "$dir" in /tmp/sakura-restore-*) rm -rf -- "$dir" ;; esac
  if echo "$health" | grep -q '"database":"ok"'; then
    log "恢复演练通过：$(basename "$latest") → 临时实例健康检查正常，${counts}"
    return 0
  fi
  log "!! 恢复演练失败：$(basename "$latest") 健康检查=${health:-无响应}"
  notify "账号数据库恢复演练失败"
  return 1
}

touch "$LOG"
rc=0
case "${1:-}" in
  --backup-only)  run_backup || rc=1; check_disk ;;
  --install-only) install_cron || rc=1 ;;
  --verify)       run_backup || rc=1; verify_latest || rc=1; check_disk ;;
  "")             install_cron || rc=1; run_backup || rc=1; check_disk ;;
  *)
    echo "用法：sudo bash tools/box_backup.sh [--backup-only|--install-only|--verify]" >&2
    exit 2 ;;
esac
tail -n 3 "$LOG"
exit $rc
