/* 樱时信笺 · SQLite 数据层
 * 表：users / sessions / saves / audit_log
 * 使用 Node 内置 node:sqlite（Node 22.5+，启动时可能打印实验特性警告）。
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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
      updated_at INTEGER NOT NULL
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
  return createStore(db);
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
      (user_id, revision, data, bytes, sha256, schema_version, exported_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        revision = excluded.revision, data = excluded.data, bytes = excluded.bytes,
        sha256 = excluded.sha256, schema_version = excluded.schema_version,
        exported_at = excluded.exported_at, updated_at = excluded.updated_at`),

    audit: db.prepare("INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)"),
    recentAudit: db.prepare(`SELECT action, detail, ip, created_at FROM audit_log
      WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`),
    clearAudit: db.prepare("DELETE FROM audit_log WHERE user_id = ?"),
    cleanupSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    cleanupAudit: db.prepare("DELETE FROM audit_log WHERE created_at < ?"),
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
        save.schemaVersion, save.exportedAt || null, save.updatedAt);
    },

    audit(userId, action, detail, ip, at = Date.now()) {
      stmt.audit.run(userId || null, String(action), detail === null || detail === undefined ? null : String(detail), ip || null, at);
    },
    recentAudit(userId, limit = 200) { return stmt.recentAudit.all(userId, limit); },
    clearAudit(userId) { stmt.clearAudit.run(userId); },
    cleanup(now, auditCutoff) {
      stmt.cleanupSessions.run(now);
      stmt.cleanupAudit.run(auditCutoff);
    },
    close() { db.close(); },
  };
}
