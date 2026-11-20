/* 樱时信笺 · SQLite 在线备份
 * 使用 VACUUM INTO 在同一个数据库连接内生成一致性快照（WAL 下也安全），
 * 备份文件落在数据库同级的 backups/game-YYYYMMDD-HHMMSS.db，保留最近 30 份。
 * 用法：node server/backup_db.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DB_PATH } from "./config.mjs";

const backupDir = path.join(path.dirname(DB_PATH), "backups");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const target = path.join(backupDir, `game-${stamp}.db`);

if (!fs.existsSync(DB_PATH)) {
  console.error(`数据库不存在：${DB_PATH}`);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
try {
  db.exec("PRAGMA wal_checkpoint(PASSIVE)");
  // VACUUM INTO 生成的文件不包含 WAL 中的未合并页，适合做一致性备份。
  db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
  console.log(`备份完成：${target}（${fs.statSync(target).size} 字节）`);
} finally {
  db.close();
}

const backups = fs.readdirSync(backupDir)
  .filter((name) => name.startsWith("game-") && name.endsWith(".db"))
  .sort()
  .reverse();
for (const name of backups.slice(30)) {
  fs.rmSync(path.join(backupDir, name), { force: true });
  console.log(`清理旧备份：${name}`);
}
