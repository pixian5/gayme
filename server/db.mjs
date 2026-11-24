/* 樱时信笺 · SQLite 数据层
 * 表：users / sessions / saves / save_versions / audit_log
 * 使用 Node 内置 node:sqlite（Node 22.5+，启动时可能打印实验特性警告）。
 *
 * v3.4.55：
 * - saves 表新增 progress 列（进度量：存档槽数 / 有无自动进度 / 收集进度数），
 *   用于「空存档不得覆盖有内容的云端存档」「收集进度变少不得静默覆盖」两道保护；
 *   老库启动时自动补列并按已有内容回填。
 * - 新增 save_versions 表：云端存档每次被替换，旧版本挪到这里，每账号保留最近若干版。
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { progressOf } from "./progress.mjs";

export function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      nickname TEXT NOT NULL DEFAULT '',
      pwd_hash TEXT NOT NULL,
      pwd_salt TEXT NOT NULL,
      recovery_hash TEXT,
      recovery_salt TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ua TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS saves (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      exported_at INTEGER,
      updated_at INTEGER NOT NULL,
      progress TEXT NOT NULL DEFAULT '{}'
    );

    -- v3.4.55 历史版本：云端存档被新版本替换时，旧版本挪到这里（每账号保留最近 N 版）
    CREATE TABLE IF NOT EXISTS save_versions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      data TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      progress TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, revision)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_log(user_id, created_at DESC);
  `);
  migrateSavesProgress(db);
  return createStore(db);
}

/* v3.4.55：saves 表的 progress 列。v3.4.54 及更早的库里没有这一列——补列，并按已有存档内容回填 */
function migrateSavesProgress(db) {
  const columns = db.prepare("PRAGMA table_info(saves)").all().map((column) => column.name);
  if (columns.includes("progress")) return;
  db.exec("ALTER TABLE saves ADD COLUMN progress TEXT NOT NULL DEFAULT '{}'");
  const rows = db.prepare("SELECT user_id, data FROM saves").all();
  const update = db.prepare("UPDATE saves SET progress = ? WHERE user_id = ?");
  for (const row of rows) {
    let progress = "{}";
    try {
      // data 存的是整个存档包 { schemaVersion, exportedAt, records }，进度量只看其中的 records
      const payload = JSON.parse(row.data);
      progress = JSON.stringify(progressOf(payload && payload.records));
    } catch (_) { /* 损坏的存档按「未知」处理 */ }
    update.run(progress, row.user_id);
  }
}

function createStore(db) {
  const stmt = {
    userByName: db.prepare("SELECT * FROM users WHERE username = ?"),
    userById: db.prepare("SELECT * FROM users WHERE id = ?"),
    insertUser: db.prepare(`INSERT INTO users
      (id, username, nickname, pwd_hash, pwd_salt, recovery_hash, recovery_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    updatePassword: db.prepare(`UPDATE users SET pwd_hash = ?, pwd_salt = ?, recovery_hash = ?,
      recovery_salt = ?, updated_at = ? WHERE id = ?`),
    updateNickname: db.prepare("UPDATE users SET nickname = ?, updated_at = ? WHERE id = ?"),
    updateRecovery: db.prepare("UPDATE users SET recovery_hash = ?, recovery_salt = ?, updated_at = ? WHERE id = ?"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),

    insertSession: db.prepare(`INSERT INTO sessions
      (id, user_id, token_hash, created_at, last_seen_at, expires_at, ua, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    sessionByHash: db.prepare(`SELECT s.*, u.username, u.nickname, u.created_at AS user_created_at,
      u.updated_at AS user_updated_at, u.pwd_hash, u.pwd_salt, u.recovery_hash, u.recovery_salt
      FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`),
    touchSession: db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?"),
    deleteSession: db.prepare("DELETE FROM sessions WHERE id = ?"),
    deleteOtherSessions: db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?"),
    deleteAllSessions: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
    sessionsByUser: db.prepare(`SELECT id, created_at, last_seen_at, expires_at, ua, ip
      FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC`),
    oldestSessions: db.prepare(`SELECT id FROM sessions WHERE user_id = ?
      ORDER BY created_at ASC LIMIT ?`),

    saveByUser: db.prepare("SELECT * FROM saves WHERE user_id = ?"),
    putSave: db.prepare(`INSERT INTO saves
      (user_id, revision, data, bytes, sha256, schema_version, exported_at, updated_at, progress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        revision = excluded.revision, data = excluded.data, bytes = excluded.bytes,
        sha256 = excluded.sha256, schema_version = excluded.schema_version,
        exported_at = excluded.exported_at, updated_at = excluded.updated_at, progress = excluded.progress`),
    archiveSave: db.prepare(`INSERT OR REPLACE INTO save_versions
      (user_id, revision, data, bytes, sha256, progress, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`),
    pruneVersions: db.prepare(`DELETE FROM save_versions WHERE user_id = ? AND revision NOT IN
      (SELECT revision FROM save_versions WHERE user_id = ? ORDER BY revision DESC LIMIT ?)`),
    versionByUserRev: db.prepare("SELECT * FROM save_versions WHERE user_id = ? AND revision = ?"),
    versionsByUser: db.prepare(`SELECT revision, bytes, progress, created_at FROM save_versions
      WHERE user_id = ? ORDER BY revision DESC`),

    audit: db.prepare("INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)"),
    recentAudit: db.prepare(`SELECT action, detail, ip, created_at FROM audit_log
      WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`),
    clearAudit: db.prepare("DELETE FROM audit_log WHERE user_id = ?"),
    cleanupSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    cleanupAudit: db.prepare("DELETE FROM audit_log WHERE created_at < ?"),
    // v3.4.56：指向已不存在的账号的审计记录。正常流程不会产生（注销账号时先清审计再删账号），
    // 但直接在库里删账号就会留下；这类记录没有保留价值，清掉
    cleanupOrphanAudit: db.prepare(`DELETE FROM audit_log
      WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)`),
  };

  return {
    raw: db,
    userByUsername(username) { return stmt.userByName.get(String(username)); },
    userById(id) { return stmt.userById.get(String(id)); },
    insertUser(user) {
      stmt.insertUser.run(user.id, user.username, user.nickname, user.pwdHash, user.pwdSalt,
        user.recoveryHash || null, user.recoverySalt || null, user.createdAt, user.updatedAt);
    },
    updatePassword(id, pwdHash, pwdSalt, recoveryHash, recoverySalt, updatedAt) {
      stmt.updatePassword.run(pwdHash, pwdSalt, recoveryHash || null, recoverySalt || null, updatedAt, id);
    },
    updateNickname(id, nickname, updatedAt) { stmt.updateNickname.run(nickname, updatedAt, id); },
    updateRecovery(id, recoveryHash, recoverySalt, updatedAt) {
      stmt.updateRecovery.run(recoveryHash, recoverySalt, updatedAt, id);
    },
    deleteUser(id) { stmt.deleteUser.run(id); },

    createSession(session) {
      stmt.insertSession.run(session.id, session.userId, session.tokenHash, session.createdAt,
        session.lastSeenAt, session.expiresAt, session.ua || "", session.ip || "");
    },
    sessionByHash(hash) { return stmt.sessionByHash.get(String(hash)); },
    touchSession(id, at) { stmt.touchSession.run(at, id); },
    deleteSession(id) { stmt.deleteSession.run(id); },
    deleteOtherSessions(userId, keepId) { stmt.deleteOtherSessions.run(userId, keepId); },
    deleteAllSessions(userId) { stmt.deleteAllSessions.run(userId); },
    sessionsByUser(userId, now) { return stmt.sessionsByUser.all(userId, now); },
    oldestSessions(userId, limit) { return stmt.oldestSessions.all(userId, limit); },

    saveByUser(userId) { return stmt.saveByUser.get(userId); },
    putSave(save) {
      stmt.putSave.run(save.userId, save.revision, save.data, save.bytes, save.sha256,
        save.schemaVersion, save.exportedAt || null, save.updatedAt, JSON.stringify(save.progress || {}));
    },

    /* v3.4.55：替换云端存档。被替换的那一份先进历史，再写入新版本，最后裁掉太旧的历史——
       三步放在同一个事务里，中途出错时云端存档保持原样。 */
    replaceSave({ userId, outgoing, incoming, keepVersions }) {
      db.exec("BEGIN IMMEDIATE");
      try {
        if (outgoing) {
          stmt.archiveSave.run(userId, outgoing.revision, outgoing.data, outgoing.bytes, outgoing.sha256,
            outgoing.progress || "{}", outgoing.updated_at);
        }
        stmt.putSave.run(userId, incoming.revision, incoming.data, incoming.bytes, incoming.sha256,
          incoming.schemaVersion, incoming.exportedAt || null, incoming.updatedAt, JSON.stringify(incoming.progress || {}));
        stmt.pruneVersions.run(userId, userId, keepVersions);
        db.exec("COMMIT");
      } catch (err) {
        try { db.exec("ROLLBACK"); } catch (_) { /* 事务未开启时忽略 */ }
        throw err;
      }
    },
    versionByUserRev(userId, revision) { return stmt.versionByUserRev.get(userId, revision); },
    versionsByUser(userId) { return stmt.versionsByUser.all(userId); },

    audit(userId, action, detail, ip, at = Date.now()) {
      stmt.audit.run(userId || null, String(action), detail === null || detail === undefined ? null : String(detail), ip || null, at);
    },
    recentAudit(userId, limit = 200) { return stmt.recentAudit.all(userId, limit); },
    clearAudit(userId) { stmt.clearAudit.run(userId); },
    cleanup(now, auditCutoff) {
      stmt.cleanupSessions.run(now);
      stmt.cleanupAudit.run(auditCutoff);
      stmt.cleanupOrphanAudit.run();
    },
    close() { db.close(); },
  };
}
