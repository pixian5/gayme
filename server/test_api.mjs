/* 樱时信笺 · 账号 API 集成测试
 * 启动临时端口 + 临时数据库，覆盖注册/登录/会话/云存档/找回码/注销/异常请求。
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
