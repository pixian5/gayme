/* 樱时信笺 · SQLite 在线备份
 * 使用 VACUUM INTO 在同一个数据库连接内生成一致性快照（WAL 下也安全），
 * 备份文件落在数据库同级的 backups/game-YYYYMMDD-HHMMSS.db（时间为协调世界时）。
 *
 * v3.4.55：
 * - 备份后立即校验（文件完整性 + 数据库完整性检查 + 各表行数），校验失败以非零状态退出，
 *   让计划任务和告警能发现「文件生成了但打不开」的情况。
 *   其中文件完整性单独检查：SQLite 自带的完整性检查只看逻辑结构，备份文件被截掉
 *   尾部未使用的页时它仍报「ok」（演练时实测），所以另查「长度 = 头部页数 × 页大小」。
 * - 保留策略改为「最近 48 小时全留 + 每天留一份、留 30 天」——
 *   部署前也会备份，开发密集时一天几十份，固定 30 份撑不过一两天。
 * - 校验与清理导出为函数，供恢复演练和测试直接调用。
 * 用法：node server/backup_db.mjs
 * 环境：GAYME_BACKUP_KEEP_DAYS 每日保留天数（默认 30） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { DB_PATH } from "./config.mjs";

const KEEP_ALL_HOURS = 48;
const TABLES = ["users", "sessions", "saves", "audit_log"];
const BACKUP_NAME = /^game-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db$/;

/* 备份文件名里的时间戳（协调世界时）→ 毫秒时间戳 */
function timestampOf(name) {
  const m = name.match(BACKUP_NAME);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
}

/* 校验一份备份文件：能打开、长度完整、结构无损、各表读得出数。失败抛错，成功返回统计 */
export function verifyBackup(target) {
  // 1) 文件头：必须是 SQLite 文件，且长度等于头部声明的页数 × 页大小（防截断、防写了一半）
  const head = Buffer.alloc(100);
  const fd = fs.openSync(target, "r");
  try {
    fs.readSync(fd, head, 0, 100, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (head.subarray(0, 16).toString("binary") !== "SQLite format 3\u0000") {
    throw new Error("不是 SQLite 数据库文件");
  }
  const pageSizeField = head.readUInt16BE(16);
  const pageSize = pageSizeField === 1 ? 65536 : pageSizeField;
  const pageCount = head.readUInt32BE(28);
  const size = fs.statSync(target).size;
  if (pageCount * pageSize !== size) {
    throw new Error(`文件不完整：实际 ${size} 字节，文件头声明 ${pageCount} 页 × ${pageSize} = ${pageCount * pageSize} 字节`);
  }

  // 2) 以只读方式打开：结构完整性 + 各表行数
  const check = new DatabaseSync(target, { readOnly: true });
  const counts = {};
  let integrity = "";
  try {
    integrity = Object.values(check.prepare("PRAGMA integrity_check").get() || {})[0] || "";
    for (const table of TABLES) {
      counts[table] = check.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    }
  } finally {
    check.close();
  }
  if (integrity !== "ok") throw new Error(`完整性检查未通过：${integrity}`);
  return { bytes: size, counts };
}

/* 清理旧备份：最近 48 小时全留；之后每天留当天最新的一份，留 keepDays 天。返回被删掉的文件名 */
export function pruneBackups(backupDir, { keepDays = 30, now = Date.now() } = {}) {
  const removed = [];
  const keptDays = new Set();
  const backups = fs.readdirSync(backupDir).filter((name) => BACKUP_NAME.test(name)).sort().reverse();
  for (const name of backups) {
    const age = now - timestampOf(name);
    const day = name.slice(5, 13);
    const keep = age <= KEEP_ALL_HOURS * 3600000
      || (age <= keepDays * 86400000 && !keptDays.has(day));
    if (keep) keptDays.add(day);
    else {
      fs.rmSync(path.join(backupDir, name), { force: true });
      removed.push(name);
    }
  }
  return removed;
}

/* 备份一次：一致性快照 → 校验 → 清理。成功返回备份文件路径 */
export function backupDatabase(dbPath = DB_PATH, { keepDays } = {}) {
  if (!fs.existsSync(dbPath)) throw new Error(`数据库不存在：${dbPath}`);
  const backupDir = path.join(path.dirname(dbPath), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const target = path.join(backupDir, `game-${stamp}.db`);
  // VACUUM INTO 要求目标文件不存在；同一分钟内重复备份时先清掉上一份
  fs.rmSync(target, { force: true });

  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA wal_checkpoint(PASSIVE)");
    // VACUUM INTO 生成的文件不包含 WAL 中的未合并页，适合做一致性备份。
    db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
  } finally {
    db.close();
  }

  const result = verifyBackup(target);
  const removed = pruneBackups(backupDir, { keepDays: keepDays ?? Math.max(1, Number(process.env.GAYME_BACKUP_KEEP_DAYS) || 30) });
  return { target, ...result, removed };
}

/* 直接执行时（node server/backup_db.mjs）：备份并打印一行结果 */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const r = backupDatabase();
    console.log(`备份完成并校验通过：${path.basename(r.target)}（${r.bytes} 字节）`
      + ` ${TABLES.map((t) => `${t}=${r.counts[t]}`).join(" ")}`);
  } catch (err) {
    console.error(`备份失败：${err && err.message || err}`);
    process.exit(1);
  }
}
