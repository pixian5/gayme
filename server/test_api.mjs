/* 樱时信笺 · 账号 API 集成测试
 * 启动临时端口 + 临时数据库，覆盖注册/登录/会话/云存档/找回码/注销/异常请求。
 * v3.4.55 新增：空存档覆盖保护、收集进度变少保护、历史版本与保留上限、
 *              上传限流按账号计数、HEAD 健康检查、老库自动迁移、首页自动打开账号开关。
 * v3.4.56 新增：密码哈希不阻塞服务、客户端地址取转发头的最后一项、
 *              数据库文件权限 600（含老库收紧）、定期清理清掉孤儿审计记录。
 * 运行：node server/test_api.mjs
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PORT = 19000 + Math.floor(Math.random() * 500);
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gayme-account-test-"));
const DB_PATH = path.join(TMP_DIR, "test.db");
const BASE = `http://127.0.0.1:${PORT}`;

let child = null;
const cookies = new Map();

function cookieHeader(name) {
  const value = cookies.get(name);
  return value ? `gayme_session=${value}` : "";
}

function saveCookie(name, setCookies) {
  for (const raw of setCookies || []) {
    const first = String(raw).split(";")[0];
    const index = first.indexOf("=");
    if (index > 0) cookies.set(name, first.slice(index + 1));
  }
}

async function request(pathname, { method = "GET", body = null, rawBody = null, cookieName = null, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== null || rawBody !== null) h["Content-Type"] = "application/json";
  if (method !== "GET") h["X-Requested-With"] = "gayme-account";
  const cookie = cookieName ? cookieHeader(cookieName) : "";
  if (cookie) h.Cookie = cookie;
  const res = await fetch(BASE + pathname, {
    method,
    headers: h,
    body: rawBody !== null ? rawBody : (body === null ? undefined : JSON.stringify(body)),
    redirect: "manual",
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  const setCookies = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  if (cookieName && setCookies.length) saveCookie(cookieName, setCookies);
  return { status: res.status, data, setCookies, headers: res.headers };
}

async function waitHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("账号服务未能启动");
}

async function run() {
  child = spawn(process.execPath, [path.join(ROOT, "server/index.mjs")], {
    cwd: ROOT,
    env: {
      ...process.env,
      GAYME_ACCOUNT_PORT: String(PORT),
      GAYME_DB_PATH: DB_PATH,
      GAYME_LOG_REQUESTS: "0",
      GAYME_MAX_JSON_BYTES: String(8 * 1024 * 1024),
      // v3.4.55：把「每账号上传次数上限」调小，才能在测试里真的撞到限流
      GAYME_RATE_SAVE_USER: "40",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (d) => { logs += d.toString(); });
  child.stderr.on("data", (d) => { logs += d.toString(); });
  await waitHealth();

  let passed = 0;
  let failed = 0;
  const test = async (name, fn) => {
    try {
      await fn();
      passed += 1;
      console.log(`ok ${passed + failed} - ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`not ok ${passed + failed} - ${name}`);
      console.error(err && err.stack || err);
    }
  };

  let recoveryCode = "";
  let newRecoveryCode = "";
  let saveData = {
    schemaVersion: 3,
    exportedAt: 1000,
    records: {
      "sakura_letters_saves_v2": { slots: [{ nodeId: "d1_start", name: "测试槽" }], lastSlot: 0 },
      "sakura_letters_settings_v2": { textSpeed: 30, bgm: true },
    },
  };

  await test("健康检查", async () => {
    const r = await request("/api/health");
    assert.equal(r.status, 200);
    assert.equal(r.data.ok, true);
    assert.equal(r.data.database, "ok");
  });

  await test("畸形 URL 返回 400 且服务存活", async () => {
    const r = await request("/%");
    assert.equal(r.status, 400);
    const health = await request("/api/health");
    assert.equal(health.status, 200);
  });

  await test("注册用户名校验", async () => {
    const r = await request("/api/auth/register", { method: "POST", body: { username: "1", password: "Passw0rd!" } });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, "invalid_username");
  });

  await test("JSON null 请求体返回 400 而非 500", async () => {
    const r = await request("/api/auth/login", { method: "POST", rawBody: "null" });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, "invalid_json");
  });

  await test("注册成功并返回找回码", async () => {
    const r = await request("/api/auth/register", {
      method: "POST", cookieName: "tester",
      body: { username: "tester_01", password: "Passw0rd!", nickname: "测试者" },
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.user.username, "tester_01");
    assert.match(r.data.recoveryCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.ok(cookieHeader("tester"), "注册未下发会话 Cookie");
    recoveryCode = r.data.recoveryCode;
  });

  await test("用户名大小写不敏感且不可重复", async () => {
    const r = await request("/api/auth/register", {
      method: "POST", body: { username: "TESTER_01", password: "Passw0rd!" },
    });
    assert.equal(r.status, 409);
    assert.equal(r.data.error.code, "username_taken");
  });

  await test("登录态 /me", async () => {
    const r = await request("/api/auth/me", { cookieName: "tester" });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.username, "tester_01");
    assert.equal(r.data.save, null);
  });

  await test("上传云存档 rev1", async () => {
    const r = await request("/api/saves", {
      method: "PUT", cookieName: "tester",
      body: { data: saveData, baseRevision: 0, force: false },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.save.revision, 1);
    assert.ok(r.data.save.sha256);
  });

  await test("云端元信息与数据回读", async () => {
    const meta = await request("/api/saves", { cookieName: "tester" });
    assert.equal(meta.status, 200);
    assert.equal(meta.data.save.revision, 1);
    const full = await request("/api/saves/data", { cookieName: "tester" });
    assert.equal(full.status, 200);
    assert.deepEqual(full.data.data.records, saveData.records);
  });

  await test("修订号冲突返回 409", async () => {
    const r = await request("/api/saves", {
      method: "PUT", cookieName: "tester",
      body: { data: saveData, baseRevision: 0, force: false },
    });
    assert.equal(r.status, 409);
    assert.equal(r.data.error.code, "save_conflict");
    assert.equal(r.data.error.data.serverRevision, 1);
  });

  await test("force 覆盖冲突并推进 rev2", async () => {
    const r = await request("/api/saves", {
      method: "PUT", cookieName: "tester",
      body: { data: saveData, baseRevision: 0, force: true },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.save.revision, 2);
  });

  await test("退出登录后 /me 为游客", async () => {
    const r = await request("/api/auth/logout", { method: "POST", cookieName: "tester", body: {} });
    assert.equal(r.status, 200);
    const me = await request("/api/auth/me", { cookieName: "tester" });
    assert.equal(me.status, 200);
    assert.equal(me.data.user, null);
  });

  await test("错误密码与正确密码登录", async () => {
    const bad = await request("/api/auth/login", {
      method: "POST", body: { username: "tester_01", password: "WrongPass1" },
    });
    assert.equal(bad.status, 401);
    const good = await request("/api/auth/login", {
      method: "POST", cookieName: "tester", body: { username: "tester_01", password: "Passw0rd!" },
    });
    assert.equal(good.status, 200);
    assert.ok(cookieHeader("tester"));
  });

  await test("双设备登录与设备列表", async () => {
    const second = await request("/api/auth/login", {
      method: "POST", cookieName: "second", body: { username: "tester_01", password: "Passw0rd!" },
    });
    assert.equal(second.status, 200);
    const list = await request("/api/account/sessions", { cookieName: "tester" });
    assert.equal(list.status, 200);
    assert.ok(list.data.sessions.length >= 2);
    assert.ok(list.data.sessions.some((s) => s.current));
  });

  await test("退出另一台设备", async () => {
    const list = await request("/api/account/sessions", { cookieName: "tester" });
    const other = list.data.sessions.find((s) => !s.current);
    assert.ok(other, "没有可退出的其它设备");
    const r = await request(`/api/account/sessions/${encodeURIComponent(other.id)}`, {
      method: "DELETE", cookieName: "tester", body: {},
    });
    assert.equal(r.status, 200);
    const after = await request("/api/account/sessions", { cookieName: "tester" });
    assert.ok(!after.data.sessions.some((s) => s.id === other.id));
  });

  await test("修改昵称", async () => {
    const r = await request("/api/account/profile", {
      method: "POST", cookieName: "tester", body: { nickname: "新昵称" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.nickname, "新昵称");
  });

  await test("修改密码并踢其它设备", async () => {
    const r = await request("/api/account/password", {
      method: "POST", cookieName: "tester",
      body: { currentPassword: "Passw0rd!", newPassword: "NewPassw0rd!" },
    });
    assert.equal(r.status, 200);
    const old = await request("/api/auth/login", {
      method: "POST", body: { username: "tester_01", password: "Passw0rd!" },
    });
    assert.equal(old.status, 401);
    const fresh = await request("/api/auth/login", {
      method: "POST", cookieName: "tester", body: { username: "tester_01", password: "NewPassw0rd!" },
    });
    assert.equal(fresh.status, 200);
  });

  await test("找回码重置密码并返回新找回码", async () => {
    const r = await request("/api/auth/recover", {
      method: "POST", body: { username: "tester_01", recoveryCode, newPassword: "RecoveredPass1" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.ok, true);
    assert.match(r.data.recoveryCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.notEqual(r.data.recoveryCode, recoveryCode);
    newRecoveryCode = r.data.recoveryCode;
    const old = await request("/api/auth/login", {
      method: "POST", body: { username: "tester_01", password: "NewPassw0rd!" },
    });
    assert.equal(old.status, 401);
    const fresh = await request("/api/auth/login", {
      method: "POST", cookieName: "tester", body: { username: "tester_01", password: "RecoveredPass1" },
    });
    assert.equal(fresh.status, 200);
  });

  await test("导出账号数据包含云存档", async () => {
    const r = await request("/api/account/export", { cookieName: "tester" });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.username, "tester_01");
    assert.equal(r.data.save.meta.revision, 2);
    assert.deepEqual(r.data.save.data.records, saveData.records);
  });

  await test("错误密码不能注销账号", async () => {
    const r = await request("/api/account", {
      method: "DELETE", cookieName: "tester", body: { password: "wrong", ack: true },
    });
    assert.equal(r.status, 401);
  });

  await test("连续 5 次失败锁定登录", async () => {
    await request("/api/auth/register", {
      method: "POST", body: { username: "lock_user", password: "Passw0rd!" },
    });
    let last = null;
    for (let i = 0; i < 5; i += 1) {
      last = await request("/api/auth/login", {
        method: "POST", body: { username: "lock_user", password: "WrongPass1" },
      });
    }
    assert.equal(last.status, 401);
    const locked = await request("/api/auth/login", {
      method: "POST", body: { username: "lock_user", password: "Passw0rd!" },
    });
    assert.equal(locked.status, 429);
    assert.equal(locked.data.error.code, "locked_out");
  });

  await test("超大请求体返回 413 且服务存活", async () => {
    const r = await request("/api/auth/login", {
      method: "POST", rawBody: "x".repeat(9 * 1024 * 1024),
    });
    assert.equal(r.status, 413);
    const health = await request("/api/health");
    assert.equal(health.status, 200);
  });

  await test("静态页与目录隔离", async () => {
    const home = await fetch(`${BASE}/`);
    assert.equal(home.status, 200);
    const js = await fetch(`${BASE}/js/account.js`);
    assert.equal(js.status, 200);
    const secret = await fetch(`${BASE}/server/config.mjs`);
    assert.equal(secret.status, 404);
    const docs = await fetch(`${BASE}/docs/发版流程.md`);
    assert.equal(docs.status, 404);
  });

  await test("注销账号并清除云存档", async () => {
    const r = await request("/api/account", {
      method: "DELETE", cookieName: "tester", body: { password: "RecoveredPass1", ack: true },
    });
    assert.equal(r.status, 200);
    const me = await request("/api/auth/me", { cookieName: "tester" });
    assert.equal(me.data.user, null);
    const login = await request("/api/auth/login", {
      method: "POST", body: { username: "tester_01", password: "RecoveredPass1" },
    });
    assert.equal(login.status, 401);
  });

  /* ================= v3.4.55：云存档数据安全 ================= */
  // 带若干已解锁关键词的存档（收集进度 = 关键词个数），用于验证「进度变少」保护
  const withKeywords = (n, nodeId = "d1_start") => ({
    schemaVersion: 3,
    exportedAt: 1000,
    records: {
      "sakura_letters_saves_v2": { slots: [{ nodeId, name: "测试槽" }], lastSlot: 0 },
      "sakura_letters_keywords_v2": Array.from({ length: n }, (_, i) => `kw_${i}`),
    },
  });
  const emptyData = { schemaVersion: 3, exportedAt: 1000, records: { "sakura_letters_settings_v2": { textSpeed: 30 } } };
  const put = (cookieName, data, extra = {}) => request("/api/saves", {
    method: "PUT", cookieName, body: { data, baseRevision: 0, force: false, ...extra },
  });

  await test("空存档不能覆盖有内容的云端存档（empty_overwrite）", async () => {
    const reg = await request("/api/auth/register", {
      method: "POST", cookieName: "guard", body: { username: "guard_user", password: "Passw0rd!" },
    });
    assert.equal(reg.status, 201);
    const first = await put("guard", saveData, { baseRevision: 0 });
    assert.equal(first.status, 200);
    assert.equal(first.data.save.revision, 1);
    assert.equal(first.data.save.progress.hasProgress, true, "元信息应带进度量");

    const blocked = await put("guard", emptyData, { baseRevision: 1 });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.error.code, "empty_overwrite");
    assert.equal(blocked.data.error.data.serverRevision, 1);
    assert.equal(blocked.data.error.data.serverProgress.hasProgress, true);
    assert.equal(blocked.data.error.data.localProgress.hasProgress, false);

    // force 只豁免修订号冲突，不豁免这道保护
    const forced = await put("guard", emptyData, { baseRevision: 1, force: true });
    assert.equal(forced.status, 409);
    assert.equal(forced.data.error.code, "empty_overwrite");

    // 云端仍是原来那份
    const meta = await request("/api/saves", { cookieName: "guard" });
    assert.equal(meta.data.save.revision, 1);

    // 玩家明确确认后才带放行标记
    const allowed = await put("guard", emptyData, { baseRevision: 1, allowEmpty: true });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.data.save.revision, 2);
  });

  await test("收集进度变少不能直接覆盖云端（progress_shrink）", async () => {
    const more = await put("guard", withKeywords(3), { baseRevision: 2 });
    assert.equal(more.status, 200);
    assert.equal(more.data.save.progress.collect, 3);

    const less = await put("guard", withKeywords(1), { baseRevision: 3 });
    assert.equal(less.status, 409);
    assert.equal(less.data.error.code, "progress_shrink");
    assert.equal(less.data.error.data.serverProgress.collect, 3);
    assert.equal(less.data.error.data.localProgress.collect, 1);

    const forced = await put("guard", withKeywords(1), { baseRevision: 3, force: true });
    assert.equal(forced.status, 409, "force 不应豁免进度变少保护");

    const allowed = await put("guard", withKeywords(1), { baseRevision: 3, allowShrink: true });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.data.save.revision, 4);

    // 收集进度不减（相等或增加）时正常放行
    const grown = await put("guard", withKeywords(5), { baseRevision: 4 });
    assert.equal(grown.status, 200);
    assert.equal(grown.data.save.revision, 5);
  });

  await test("历史版本：列出、按修订号取回、只保留最近若干版", async () => {
    const list = await request("/api/saves/versions", { cookieName: "guard" });
    assert.equal(list.status, 200);
    assert.equal(list.data.currentRevision, 5);
    assert.equal(list.data.kept, 10);
    // 当前是修订号 5；被替换的 1~4 都在历史里（新到旧）
    assert.deepEqual(list.data.versions.map((v) => v.revision), [4, 3, 2, 1]);
    const third = list.data.versions.find((v) => v.revision === 3);
    assert.equal(third.progress.collect, 3, "历史版本应带当时的进度量");

    const old = await request("/api/saves/data?revision=3", { cookieName: "guard" });
    assert.equal(old.status, 200);
    assert.equal(old.data.save.revision, 3);
    assert.equal(old.data.data.records["sakura_letters_keywords_v2"].length, 3);

    const current = await request("/api/saves/data?revision=5", { cookieName: "guard" });
    assert.equal(current.status, 200);
    assert.equal(current.data.data.records["sakura_letters_keywords_v2"].length, 5);

    const missing = await request("/api/saves/data?revision=99", { cookieName: "guard" });
    assert.equal(missing.status, 404);
    assert.equal(missing.data.error.code, "no_version");

    // 再写 12 版：历史只留最近 10 版，最早的被裁掉
    let revision = 5;
    for (let i = 0; i < 12; i++) {
      const r = await put("guard", withKeywords(5 + i), { baseRevision: revision });
      assert.equal(r.status, 200);
      revision = r.data.save.revision;
    }
    const trimmed = await request("/api/saves/versions", { cookieName: "guard" });
    assert.equal(trimmed.data.versions.length, 10);
    assert.equal(trimmed.data.versions[0].revision, revision - 1, "最新的被替换版本排第一");
    assert.equal(trimmed.data.versions[9].revision, revision - 10, "只保留最近 10 版");
    assert.equal(trimmed.data.versions.some((v) => v.revision === 1), false, "最早的历史已被裁掉");
    // 当前版本不受历史裁剪影响
    const latest = await request("/api/saves/data", { cookieName: "guard" });
    assert.equal(latest.data.save.revision, revision);
  });

  await test("上传限流按账号计数：一个账号撞上限不影响另一个账号", async () => {
    // guard_user 到这里已经上传了 5 + 1 + 12 = 18 次？实际为 1+1+1+1+1+12 = 17 次成功，
    // 另有 5 次被保护拦下（被拦下的请求同样计入限流）→ 共 22 次，离上限 40 还差 18 次
    let last = null;
    for (let i = 0; i < 20; i++) {
      last = await put("guard", withKeywords(30 + i), { baseRevision: last ? last.data.save.revision : 17 });
      if (last.status === 429) break;
    }
    assert.equal(last.status, 429);
    assert.equal(last.data.error.code, "rate_limited");
    assert.ok(last.data.error.data.retryAfter > 0, "应告知多久后可重试");

    // 同一个网络地址（127.0.0.1）下，另一个账号的上传不受影响
    await request("/api/auth/register", {
      method: "POST", cookieName: "other", body: { username: "other_user", password: "Passw0rd!" },
    });
    const other = await put("other", saveData, { baseRevision: 0 });
    assert.equal(other.status, 200, "按账号计数：别的账号不应被连坐");
  });

  await test("HEAD /api/health 返回 200（监控工具常用 curl -I）", async () => {
    const res = await fetch(`${BASE}/api/health`, { method: "HEAD" });
    assert.equal(res.status, 200);
  });

  await test("v3.4.54 的老库启动时自动迁移：补进度量列并回填、建历史版本表", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const { scryptSync, randomBytes } = await import("node:crypto");
    // 按 v3.4.54 的表结构建库（没有 progress 列、没有 save_versions 表）
    const oldPath = path.join(TMP_DIR, "old-schema.db");
    const old = new DatabaseSync(oldPath);
    old.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        nickname TEXT NOT NULL DEFAULT '', pwd_hash TEXT NOT NULL, pwd_salt TEXT NOT NULL,
        recovery_hash TEXT, recovery_salt TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL, ua TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL DEFAULT '');
      CREATE TABLE saves (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, bytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL, schema_version INTEGER NOT NULL, exported_at INTEGER, updated_at INTEGER NOT NULL);
      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL, detail TEXT,
        ip TEXT, created_at INTEGER NOT NULL);
    `);
    const salt = randomBytes(16).toString("hex");
    const pwdHash = scryptSync("OldPassw0rd!", Buffer.from(salt, "hex"), 64,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex");
    old.prepare(`INSERT INTO users (id, username, nickname, pwd_hash, pwd_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run("u_old", "old_user", "旧用户", pwdHash, salt, 1, 1);
    const legacySave = JSON.stringify(withKeywords(3, "d5_old"));
    old.prepare(`INSERT INTO saves (user_id, revision, data, bytes, sha256, schema_version, exported_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("u_old", 7, legacySave, Buffer.byteLength(legacySave), "legacy-sha", 3, 1000, 1);
    old.close();

    // 用新代码起第二个实例指向这个老库
    const port2 = PORT + 1;
    const base2 = `http://127.0.0.1:${port2}`;
    const second = spawn(process.execPath, [path.join(ROOT, "server/index.mjs")], {
      cwd: ROOT,
      env: { ...process.env, GAYME_ACCOUNT_PORT: String(port2), GAYME_DB_PATH: oldPath, GAYME_LOG_REQUESTS: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      let up = false;
      for (let i = 0; i < 60 && !up; i++) {
        try { up = (await fetch(`${base2}/api/health`)).ok; } catch (_) {}
        if (!up) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(up, "迁移后服务应能启动");
      if (process.platform !== "win32") {
        // v3.4.56：这份老库是测试进程按默认掩码创建的（644），服务启动后应收紧为仅属主可读写
        assert.equal(fs.statSync(oldPath).mode & 0o777, 0o600, "已有的 644 数据库文件在服务启动后应收紧为 600");
      }

      const login = await fetch(`${base2}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "gayme-account" },
        body: JSON.stringify({ username: "old_user", password: "OldPassw0rd!" }),
      });
      assert.equal(login.status, 200, "老库里的账号应能照常登录");
      const cookie = (login.headers.getSetCookie?.() || [login.headers.get("set-cookie")])[0].split(";")[0];
      const call = (pathname, options = {}) => fetch(base2 + pathname, {
        ...options, headers: { Cookie: cookie, "Content-Type": "application/json", "X-Requested-With": "gayme-account", ...(options.headers || {}) },
      });

      const meta = await call("/api/saves");
      const metaBody = await meta.json();
      assert.equal(metaBody.save.revision, 7, "老存档原样保留");
      assert.deepEqual(metaBody.save.progress, { slots: 1, hasAutosave: false, collect: 3, hasProgress: true },
        "进度量应按老存档内容回填");

      // 回填的进度量要真正参与保护：进度变少的上传应被拦下
      const blocked = await call("/api/saves", { method: "PUT", body: JSON.stringify({ data: withKeywords(1, "d5_old"), baseRevision: 7 }) });
      assert.equal(blocked.status, 409);
      assert.equal((await blocked.json()).error.code, "progress_shrink");

      const history = await (await call("/api/saves/versions")).json();
      assert.deepEqual(history, { currentRevision: 7, kept: 10, versions: [] }, "老库的历史版本表应为空且可用");

      // 正常推进一版：老的那一份进历史
      const next = await call("/api/saves", { method: "PUT", body: JSON.stringify({ data: withKeywords(4, "d5_old"), baseRevision: 7 }) });
      assert.equal(next.status, 200);
      const after = await (await call("/api/saves/versions")).json();
      assert.deepEqual(after.versions.map((v) => v.revision), [7]);
      assert.equal(after.versions[0].progress.collect, 3);
    } finally {
      second.kill("SIGTERM");
    }
  });

  await test("自带接口时提供首页会自动打开账号功能开关（磁盘文件保持默认关闭）", async () => {
    const flagOn = 'name="gayme-account-api" content=""';
    const flagOff = 'name="gayme-account-api" content="off"';
    for (const pathname of ["/", "/index.html", "/index.html?t=1"]) {
      const res = await fetch(`${BASE}${pathname}`);
      assert.equal(res.status, 200, pathname);
      assert.match(res.headers.get("content-type") || "", /text\/html/, pathname);
      const body = await res.text();
      assert.ok(body.includes(flagOn), `${pathname} 应带已打开的账号开关`);
      assert.ok(!body.includes(flagOff), `${pathname} 不应再出现关闭状态的开关`);
      assert.equal(
        [...body.matchAll(/name="gayme-account-api"/g)].length, 1, "开关只能有一处");
    }
    // HEAD：有长度、无正文（监控与缓存工具依赖）
    const head = await fetch(`${BASE}/`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.ok(Number(head.headers.get("content-length")) > 0, "HEAD 应带 Content-Length");
    assert.equal((await head.arrayBuffer()).byteLength, 0, "HEAD 不应有正文");
    // 只在内存里改写：仓库里的 index.html 必须还是默认关闭（纯静态部署不探测 /api/）
    const onDisk = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    assert.ok(onDisk.includes(flagOff), "仓库里的 index.html 必须保持默认关闭");
  });

  /* ================= v3.4.56：账号服务加固 ================= */
  await test("密码哈希不阻塞服务：一次登录校验进行期间，健康检查照常先返回", async () => {
    // 同步哈希会占住事件循环（一次约 190 毫秒），期间到达的健康检查只能排在登录之后返回。
    // 这里不断言耗时，只断言先后顺序，不受机器快慢影响
    const order = [];
    const login = request("/api/auth/login", {
      method: "POST", body: { username: "no_such_user_hash", password: "Passw0rd!" },
    }).then((r) => { order.push("login"); return r; });
    const health = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const res = await fetch(`${BASE}/api/health`);
      order.push("health");
      return res.status;
    })();
    const [loginResult, healthStatus] = await Promise.all([login, health]);
    assert.equal(loginResult.status, 401, "不存在的用户应返回 401");
    assert.equal(healthStatus, 200);
    assert.equal(order[0], "health", `健康检查应先于登录校验返回（实际顺序：${order.join(" → ")}）`);
  });

  await test("客户端地址取转发头的最后一项：客户端伪造的前几项不生效", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const username = "xff_probe_user";
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "X-Requested-With": "gayme-account",
        // 前一项是客户端伪造的；后一项才是「最近一跳可信代理」写入的真实对端
        "X-Forwarded-For": "203.0.113.9, 198.51.100.7",
      },
      body: JSON.stringify({ username, password: "Passw0rd!" }),
    });
    assert.equal(res.status, 401);
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    try {
      const row = db.prepare("SELECT ip FROM audit_log WHERE action = 'login_failed' AND detail = ? ORDER BY id DESC LIMIT 1")
        .get(username);
      assert.ok(row, "应记录一条登录失败审计");
      assert.equal(row.ip, "198.51.100.7", "应取最近一跳代理写入的最后一项，而不是客户端伪造的第一项");
    } finally {
      db.close();
    }
  });

  await test("数据库与预写日志文件仅属主可读写（600）", async () => {
    if (process.platform === "win32") { console.log("  （Windows 不检查文件权限位）"); return; }
    for (const file of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
      assert.ok(fs.existsSync(file), `${path.basename(file)} 应已创建`);
      assert.equal(fs.statSync(file).mode & 0o777, 0o600, `${path.basename(file)} 应为 600`);
    }
  });

  await test("定期清理会清掉指向已不存在账号的审计记录，其余保留", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const { openDatabase } = await import("./db.mjs");
    const { cleanup } = await import("./api.mjs");
    const someUser = (() => {
      const db = new DatabaseSync(DB_PATH, { readOnly: true });
      try { return db.prepare("SELECT id FROM users LIMIT 1").get(); } finally { db.close(); }
    })();
    // 直接往测试库里写三种审计记录：孤儿的、匿名（没有账号）的、正常账号的
    const writer = new DatabaseSync(DB_PATH);
    try {
      const insert = writer.prepare("INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)");
      insert.run("ghost_user_that_no_longer_exists", "login", "孤儿审计探针", "127.0.0.1", Date.now());
      insert.run(null, "login_failed", "匿名审计探针", "127.0.0.1", Date.now());
      if (someUser) insert.run(someUser.id, "login", "正常账号审计探针", "127.0.0.1", Date.now());
    } finally {
      writer.close();
    }
    const count = (detail) => {
      const db = new DatabaseSync(DB_PATH, { readOnly: true });
      try { return db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE detail = ?").get(detail).n; } finally { db.close(); }
    };
    assert.equal(count("孤儿审计探针"), 1, "探针应已写入");
    assert.equal(count("匿名审计探针"), 1, "探针应已写入");
    const store = openDatabase(DB_PATH);
    try { cleanup(store); } finally { store.close(); }
    assert.equal(count("孤儿审计探针"), 0, "指向已不存在账号的审计记录应被清掉");
    assert.equal(count("匿名审计探针"), 1, "没有账号的审计记录（例如用户名不存在时的登录失败）必须保留");
    if (someUser) assert.equal(count("正常账号审计探针"), 1, "正常账号的审计记录必须保留");
  });

  await test("备份文件仅属主可读写，v3.4.56 之前生成的宽松权限会被收紧", async () => {
    if (process.platform === "win32") { console.log("  （Windows 不检查文件权限位）"); return; }
    const { openDatabase } = await import("./db.mjs");
    const { backupDatabase, verifyBackup } = await import("./backup_db.mjs");
    const dir = fs.mkdtempSync(path.join(TMP_DIR, "perm-"));
    const dbPath = path.join(dir, "game.db");
    const source = openDatabase(dbPath);
    source.close();
    const backupDir = path.join(dir, "backups");
    fs.mkdirSync(backupDir);
    // 模拟一份 v3.4.56 之前的备份（644）。时间取一小时前：保留策略会删掉 30 天以前的旧备份，
    // 文件名里的日期不能太早，否则这份「旧备份」在校验之前就被清理掉了
    const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    const legacy = path.join(backupDir, `game-${stamp(Date.now() - 3600 * 1000)}.db`);
    fs.copyFileSync(dbPath, legacy);
    fs.chmodSync(legacy, 0o644);
    const result = backupDatabase(dbPath);
    assert.equal(fs.statSync(result.target).mode & 0o777, 0o600, "新备份应为 600");
    assert.equal(fs.statSync(legacy).mode & 0o777, 0o600, "旧备份应收紧为 600");
    assert.ok(verifyBackup(result.target), "收紧权限后备份仍应校验通过");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.error("\n--- server logs ---\n" + logs);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err && err.stack || err);
  process.exitCode = 1;
}).finally(() => {
  if (child) child.kill("SIGTERM");
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (_) {}
});
