/* 樱时信笺 · 账号 API
 * 路由：/api/health、/api/auth/*、/api/account/*、/api/saves*
 * 认证：HttpOnly Cookie + 非 GET 必须带 X-Requested-With: gayme-account
 * 云存档：整包存储 Saves.exportData() 的 JSON，revision + baseRevision 做冲突检测
 */
import fs from "node:fs";
import path from "node:path";
import {
  COOKIE_NAME, LoginGuard, RateLimiter, charLength, clearCookie, clientIp,
  formatRecoveryCode, generateRecoveryCode, isValidRecoveryCode, normalizeRecoveryCode,
  parseCookies, randomId, randomToken, scryptHash, scryptVerify, sessionCookie,
  sha256Hex, validNickname, validPassword, validUsername,
} from "./auth.mjs";
import {
  ALLOWED_ORIGIN, AUDIT_RETENTION_DAYS, MAX_JSON_BYTES, MAX_SAVE_BYTES,
  SESSION_DAYS, SESSION_MAX_PER_USER, SITE_ROOT, TRUST_PROXY, isSecureRequest,
} from "./config.mjs";

const VERSION = (() => {
  try { return fs.readFileSync(path.join(SITE_ROOT, "VERSION"), "utf8").trim(); }
  catch (_) { return "dev"; }
})();

const DUMMY_PASSWORD_HASH = scryptHash("dummy-password-for-timing-1", "0123456789abcdef0123456789abcdef");

class ApiError extends Error {
  constructor(status, code, message, data) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const registerLimiter = new RateLimiter(5, 60 * 60 * 1000, "register");
const loginLimiter = new RateLimiter(20, 5 * 60 * 1000, "login");
const recoverLimiter = new RateLimiter(10, 15 * 60 * 1000, "recover");
const accountLimiter = new RateLimiter(30, 15 * 60 * 1000, "account");
const loginGuard = new LoginGuard();

function iso(ms) {
  return ms ? new Date(Number(ms)).toISOString() : null;
}

function userPublic(row) {
  return {
    username: row.username,
    nickname: row.nickname || row.username,
    createdAt: iso(row.created_at || row.user_created_at),
  };
}

function sessionPublic(row) {
  return {
    createdAt: iso(row.created_at),
    lastSeenAt: iso(row.last_seen_at),
    expiresAt: iso(row.expires_at),
  };
}

function saveMeta(row) {
  if (!row) return null;
  return {
    revision: Number(row.revision) || 0,
    bytes: Number(row.bytes) || 0,
    sha256: row.sha256 || "",
    schemaVersion: Number(row.schema_version) || 0,
    exportedAt: iso(row.exported_at),
    updatedAt: iso(row.updated_at),
  };
}

function corsHeaders(req) {
  if (!ALLOWED_ORIGIN) return {};
  const origin = String(req.headers.origin || "");
  if (origin !== ALLOWED_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

function json(req, res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
    ...corsHeaders(req),
    ...headers,
  });
  res.end(payload);
}

function requireJson(req) {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  if (!type.includes("application/json")) throw new ApiError(415, "json_required", "请求必须使用 application/json");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let settled = false;
    const chunks = [];
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        // 先停止收集并排空请求体，避免直接 destroy 让客户端只看到连接重置。
        fail(new ApiError(413, "request_too_large", "请求体超过上限"));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        reject(new ApiError(400, "invalid_json", "请求体不能为空"));
        return;
      }
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (_) { reject(new ApiError(400, "invalid_json", "JSON 格式不正确")); return; }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        reject(new ApiError(400, "invalid_json", "JSON 必须是对象"));
        return;
      }
      resolve(parsed);
    });
    req.on("error", () => fail(new ApiError(400, "bad_request", "请求体读取失败")));
  });
}

async function readJson(req) {
  requireJson(req);
  return readBody(req);
}

function assertCsrf(req, method) {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  if (String(req.headers["x-requested-with"] || "") !== "gayme-account") {
    throw new ApiError(403, "csrf_blocked", "缺少账号请求标记");
  }
  const origin = String(req.headers.origin || "");
  if (!origin) return;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim()
    || (req.socket && req.socket.encrypted ? "https" : "http");
  const expected = `${proto}://${host}`;
  if (origin !== expected && origin !== ALLOWED_ORIGIN) {
    // 反向代理后协议/主机头不一致时，记录实际值便于排查（不含敏感内容）。
    console.warn("[gayme-account] csrf 来源不匹配", JSON.stringify({
      origin, expected, hostHeader: req.headers.host,
      forwardedHost: req.headers["x-forwarded-host"] || null,
      forwardedProto: req.headers["x-forwarded-proto"] || null,
    }));
    throw new ApiError(403, "csrf_blocked", "请求来源不匹配");
  }
}

function authenticate(req, store) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  const row = store.sessionByHash(sha256Hex(token));
  if (!row) return null;
  if (Number(row.expires_at) <= Date.now()) {
    store.deleteSession(row.id);
    return null;
  }
  if (Date.now() - Number(row.last_seen_at) > 5 * 60 * 1000) {
    store.touchSession(row.id, Date.now());
    row.last_seen_at = Date.now();
  }
  return {
    token,
    session: row,
    user: {
      id: row.user_id,
      username: row.username,
      nickname: row.nickname,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
      // 仅供服务端校验使用，userPublic 不会把这些字段返回给客户端。
      pwd_hash: row.pwd_hash,
      pwd_salt: row.pwd_salt,
      recovery_hash: row.recovery_hash,
      recovery_salt: row.recovery_salt,
    },
  };
}

function requireAuth(req, store) {
  const ctx = authenticate(req, store);
  if (!ctx) throw new ApiError(401, "unauthenticated", "请先登录");
  return ctx;
}

function setSessionCookie(req, res, token) {
  res.setHeader("Set-Cookie", sessionCookie(token, { secure: isSecureRequest(req), maxAge: SESSION_DAYS * 24 * 60 * 60 }));
}

function clearSessionCookie(req, res) {
  res.setHeader("Set-Cookie", clearCookie({ secure: isSecureRequest(req) }));
}

function createSession(store, user, req) {
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const id = randomId();
  const token = randomToken();
  store.createSession({
    id,
    userId: user.id,
    tokenHash: sha256Hex(token),
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    ua: String(req.headers["user-agent"] || "").slice(0, 200),
    ip: clientIp(req, TRUST_PROXY),
  });
  const sessions = store.sessionsByUser(user.id, now);
  if (sessions.length > SESSION_MAX_PER_USER) {
    for (const old of store.oldestSessions(user.id, sessions.length - SESSION_MAX_PER_USER)) {
      store.deleteSession(old.id);
    }
  }
  return {
    token,
    session: { id, created_at: now, last_seen_at: now, expires_at: expiresAt,
      ua: String(req.headers["user-agent"] || "").slice(0, 200), ip: clientIp(req, TRUST_PROXY) },
  };
}

function audit(store, ctx, action, detail, req) {
  store.audit(ctx.user.id, action, detail, clientIp(req, TRUST_PROXY));
}

function requireBaseRevision(value) {
  if (!Number.isInteger(value) || value < 0) throw new ApiError(400, "invalid_revision", "baseRevision 必须是非负整数");
  return value;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateSavePayload(data) {
  if (!isPlainObject(data) || !isPlainObject(data.records)) {
    throw new ApiError(400, "invalid_saves", "存档必须是包含 records 的对象");
  }
  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 0 || data.schemaVersion > 3) {
    throw new ApiError(400, "invalid_saves", "存档 schemaVersion 不合法");
  }
  const keys = Object.keys(data.records);
  if (keys.length > 200) throw new ApiError(400, "invalid_saves", "存档记录数量异常");
  for (const key of keys) {
    if (!key.startsWith("sakura_letters_")) {
      throw new ApiError(400, "invalid_saves", "存档包含未知记录键");
    }
  }
  let serialized;
  try { serialized = JSON.stringify(data); }
  catch (_) { throw new ApiError(400, "invalid_saves", "存档无法序列化"); }
  const bytes = Buffer.byteLength(serialized);
  if (bytes > MAX_SAVE_BYTES) throw new ApiError(413, "saves_too_large", "云存档超过大小上限");
  return {
    serialized,
    bytes,
    sha256: sha256Hex(serialized),
    schemaVersion: data.schemaVersion,
    exportedAt: Number.isInteger(data.exportedAt) ? data.exportedAt : Date.now(),
  };
}

function rateLimit(limiter, req, suffix = "") {
  const key = `${clientIp(req, TRUST_PROXY)}${suffix ? "|" + suffix : ""}`;
  const result = limiter.hit(key);
  if (!result.ok) {
    throw new ApiError(429, "rate_limited", "操作太频繁，请稍后再试", { retryAfter: result.retryAfter });
  }
}

function parseSaveData(row) {
  if (!row) return null;
  try { return JSON.parse(row.data); }
  catch (_) { throw new ApiError(500, "save_corrupted", "云端存档损坏"); }
}

async function route(req, res, store, url) {
  const method = req.method;
  const pathname = url.pathname;
  const ip = clientIp(req, TRUST_PROXY);

  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  assertCsrf(req, method);

  if (method === "GET" && pathname === "/api/health") {
    let database = "ok";
    try { store.userById("__health__"); } catch (_) { database = "error"; }
    json(req, res, 200, { ok: true, service: "gayme-account", version: VERSION, time: new Date().toISOString(), database });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    rateLimit(registerLimiter, req);
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const nickname = String(body.nickname || "").trim() || username;
    if (!validUsername(username)) throw new ApiError(400, "invalid_username", "用户名需为 3-20 位字母、数字或下划线，且不能纯数字");
    if (!validPassword(password)) throw new ApiError(400, "weak_password", "密码需 8-72 位，且同时包含字母和数字");
    if (!validNickname(nickname)) throw new ApiError(400, "invalid_nickname", "昵称需为 1-24 个字符");
    if (store.userByUsername(username)) throw new ApiError(409, "username_taken", "用户名已被占用");
    const now = Date.now();
    const pwd = scryptHash(password);
    const recoveryCode = generateRecoveryCode();
    const rec = scryptHash(normalizeRecoveryCode(recoveryCode));
    const user = {
      id: randomId(), username, nickname,
      pwdHash: pwd.hash, pwdSalt: pwd.salt,
      recoveryHash: rec.hash, recoverySalt: rec.salt,
      createdAt: now, updatedAt: now,
    };
    try { store.insertUser(user); }
    catch (err) {
      if (String(err && err.code || "").includes("SQLITE_CONSTRAINT")) {
        throw new ApiError(409, "username_taken", "用户名已被占用");
      }
      throw err;
    }
    const session = createSession(store, user, req);
    store.audit(user.id, "register", null, ip);
    setSessionCookie(req, res, session.token);
    json(req, res, 201, {
      user: userPublic({ ...user, created_at: now }),
      session: sessionPublic(session.session),
      recoveryCode,
      save: null,
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    rateLimit(loginLimiter, req);
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!validUsername(username) || !password) throw new ApiError(401, "invalid_credentials", "用户名或密码错误");
    const guardKey = `${username.toLowerCase()}|${ip}`;
    const locked = loginGuard.lockedFor(guardKey);
    if (locked > 0) throw new ApiError(429, "locked_out", "失败次数过多，请稍后再试", { retryAfter: locked });
    const user = store.userByUsername(username);
    const ok = user
      ? scryptVerify(password, user.pwd_salt, user.pwd_hash)
      : scryptVerify(password, DUMMY_PASSWORD_HASH.salt, DUMMY_PASSWORD_HASH.hash);
    if (!user || !ok) {
      loginGuard.fail(guardKey);
      store.audit(user ? user.id : null, "login_failed", username, ip);
      throw new ApiError(401, "invalid_credentials", "用户名或密码错误");
    }
    loginGuard.success(guardKey);
    const session = createSession(store, user, req);
    store.audit(user.id, "login", null, ip);
    setSessionCookie(req, res, session.token);
    json(req, res, 200, {
      user: userPublic(user),
      session: sessionPublic(session.session),
      save: saveMeta(store.saveByUser(user.id)),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const ctx = authenticate(req, store);
    if (ctx) {
      store.deleteSession(ctx.session.id);
      store.audit(ctx.user.id, "logout", null, ip);
    }
    clearSessionCookie(req, res);
    json(req, res, 200, { ok: true });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/recover") {
    rateLimit(recoverLimiter, req);
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const recoveryCode = normalizeRecoveryCode(body.recoveryCode);
    const newPassword = String(body.newPassword || "");
    if (!validPassword(newPassword)) throw new ApiError(400, "weak_password", "密码需 8-72 位，且同时包含字母和数字");
    const user = validUsername(username) ? store.userByUsername(username) : null;
    const valid = user && isValidRecoveryCode(recoveryCode)
      && scryptVerify(recoveryCode, user.recovery_salt, user.recovery_hash);
    if (!valid) {
      store.audit(user ? user.id : null, "recover_failed", username, ip);
      throw new ApiError(401, "invalid_recovery", "用户名或找回码不正确");
    }
    const now = Date.now();
    const pwd = scryptHash(newPassword);
    const newRecovery = generateRecoveryCode();
    const rec = scryptHash(normalizeRecoveryCode(newRecovery));
    store.updatePassword(user.id, pwd.hash, pwd.salt, rec.hash, rec.salt, now);
    // 找回密码后所有旧会话失效，避免被盗令牌继续使用。
    store.deleteAllSessions(user.id);
    store.audit(user.id, "recover", null, ip);
    json(req, res, 200, { ok: true, recoveryCode: formatRecoveryCode(newRecovery) });
    return;
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const ctx = authenticate(req, store);
    if (!ctx) {
      json(req, res, 200, { user: null, session: null, save: null });
      return;
    }
    json(req, res, 200, {
      user: userPublic(ctx.user),
      session: sessionPublic(ctx.session),
      save: saveMeta(store.saveByUser(ctx.user.id)),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/account/profile") {
    rateLimit(accountLimiter, req, "profile");
    const ctx = requireAuth(req, store);
    const body = await readJson(req);
    const nickname = String(body.nickname || "").trim();
    if (!validNickname(nickname)) throw new ApiError(400, "invalid_nickname", "昵称需为 1-24 个字符");
    store.updateNickname(ctx.user.id, nickname, Date.now());
    ctx.user.nickname = nickname;
    audit(store, ctx, "profile_update", null, req);
    json(req, res, 200, { user: userPublic(ctx.user) });
    return;
  }

  if (method === "POST" && pathname === "/api/account/password") {
    rateLimit(accountLimiter, req, "password");
    const ctx = requireAuth(req, store);
    const body = await readJson(req);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!scryptVerify(currentPassword, ctx.user.pwd_salt, ctx.user.pwd_hash)) {
      throw new ApiError(401, "invalid_credentials", "当前密码不正确");
    }
    if (!validPassword(newPassword)) throw new ApiError(400, "weak_password", "密码需 8-72 位，且同时包含字母和数字");
    if (currentPassword === newPassword) throw new ApiError(400, "same_password", "新密码不能与旧密码相同");
    const pwd = scryptHash(newPassword);
    store.updatePassword(ctx.user.id, pwd.hash, pwd.salt, ctx.user.recovery_hash, ctx.user.recovery_salt, Date.now());
    store.deleteOtherSessions(ctx.user.id, ctx.session.id);
    audit(store, ctx, "password_change", null, req);
    json(req, res, 200, { ok: true });
    return;
  }

  if (method === "POST" && pathname === "/api/account/recovery-code") {
    rateLimit(accountLimiter, req, "recovery");
    const ctx = requireAuth(req, store);
    const body = await readJson(req);
    if (!scryptVerify(String(body.password || ""), ctx.user.pwd_salt, ctx.user.pwd_hash)) {
      throw new ApiError(401, "invalid_credentials", "密码不正确");
    }
    const code = generateRecoveryCode();
    const rec = scryptHash(normalizeRecoveryCode(code));
    store.updateRecovery(ctx.user.id, rec.hash, rec.salt, Date.now());
    audit(store, ctx, "recovery_rotate", null, req);
    json(req, res, 200, { recoveryCode: code });
    return;
  }

  if (method === "GET" && pathname === "/api/account/sessions") {
    const ctx = requireAuth(req, store);
    const sessions = store.sessionsByUser(ctx.user.id, Date.now()).map((s) => ({
      id: s.id,
      createdAt: iso(s.created_at),
      lastSeenAt: iso(s.last_seen_at),
      expiresAt: iso(s.expires_at),
      userAgent: s.ua || "",
      ip: s.ip || "",
      current: s.id === ctx.session.id,
    }));
    json(req, res, 200, { sessions });
    return;
  }

  if (method === "DELETE" && pathname.startsWith("/api/account/sessions/")) {
    const ctx = requireAuth(req, store);
    let id;
    try { id = decodeURIComponent(pathname.slice("/api/account/sessions/".length)); }
    catch (_) { throw new ApiError(400, "invalid_session", "会话不存在"); }
    if (!id) throw new ApiError(400, "invalid_session", "会话不存在");
    const own = store.sessionsByUser(ctx.user.id, Date.now()).find((s) => s.id === id);
    if (!own) throw new ApiError(404, "invalid_session", "会话不存在");
    store.deleteSession(id);
    if (id === ctx.session.id) clearSessionCookie(req, res);
    audit(store, ctx, "session_revoke", id, req);
    json(req, res, 200, { ok: true });
    return;
  }

  if (method === "GET" && pathname === "/api/account/export") {
    const ctx = requireAuth(req, store);
    const row = store.saveByUser(ctx.user.id);
    const sessions = store.sessionsByUser(ctx.user.id, Date.now()).map((s) => ({
      createdAt: iso(s.created_at), lastSeenAt: iso(s.last_seen_at), expiresAt: iso(s.expires_at),
      userAgent: s.ua || "", ip: s.ip || "", current: s.id === ctx.session.id,
    }));
    const auditLog = store.recentAudit(ctx.user.id, 200).map((a) => ({
      action: a.action, detail: a.detail, ip: a.ip, createdAt: iso(a.created_at),
    }));
    audit(store, ctx, "account_export", null, req);
    json(req, res, 200, {
      app: "sakura-letters",
      exportedAt: new Date().toISOString(),
      user: userPublic(ctx.user),
      sessions,
      audit: auditLog,
      save: row ? { meta: saveMeta(row), data: parseSaveData(row) } : null,
    });
    return;
  }

  if (method === "DELETE" && pathname === "/api/account") {
    const ctx = requireAuth(req, store);
    const body = await readJson(req);
    if (body.ack !== true) throw new ApiError(400, "ack_required", "请确认注销账号");
    if (!scryptVerify(String(body.password || ""), ctx.user.pwd_salt, ctx.user.pwd_hash)) {
      throw new ApiError(401, "invalid_credentials", "密码不正确");
    }
    // 先清审计，再删账号；用户删除后不保留可关联记录。
    store.clearAudit(ctx.user.id);
    store.deleteUser(ctx.user.id);
    clearSessionCookie(req, res);
    json(req, res, 200, { ok: true });
    return;
  }

  if (method === "GET" && pathname === "/api/saves") {
    const ctx = requireAuth(req, store);
    json(req, res, 200, { save: saveMeta(store.saveByUser(ctx.user.id)) });
    return;
  }

  if (method === "GET" && pathname === "/api/saves/data") {
    const ctx = requireAuth(req, store);
    const row = store.saveByUser(ctx.user.id);
    if (!row) throw new ApiError(404, "no_save", "云端还没有存档");
    json(req, res, 200, { save: saveMeta(row), data: parseSaveData(row) });
    return;
  }

  if (method === "PUT" && pathname === "/api/saves") {
    rateLimit(accountLimiter, req, "save");
    const ctx = requireAuth(req, store);
    const body = await readJson(req);
    const data = body.data;
    const baseRevision = requireBaseRevision(body.baseRevision);
    const force = body.force === true;
    const validated = validateSavePayload(data);
    const current = store.saveByUser(ctx.user.id);
    const currentRevision = current ? Number(current.revision) : 0;
    if (!force && baseRevision !== currentRevision) {
      store.audit(ctx.user.id, "save_conflict", `base=${baseRevision} server=${currentRevision}`, ip);
      throw new ApiError(409, "save_conflict", "云端存档已被其它设备更新", {
        serverRevision: currentRevision,
        serverUpdatedAt: current ? iso(current.updated_at) : null,
        serverBytes: current ? Number(current.bytes || 0) : 0,
      });
    }
    const revision = currentRevision + 1;
    const updatedAt = Date.now();
    store.putSave({
      userId: ctx.user.id, revision, data: validated.serialized, bytes: validated.bytes,
      sha256: validated.sha256, schemaVersion: validated.schemaVersion,
      exportedAt: validated.exportedAt, updatedAt,
    });
    store.audit(ctx.user.id, "save_upload", `rev=${revision} bytes=${validated.bytes}`, ip);
    json(req, res, 200, {
      save: saveMeta({ revision, bytes: validated.bytes, sha256: validated.sha256,
        schema_version: validated.schemaVersion, exported_at: validated.exportedAt, updated_at: updatedAt }),
    });
    return;
  }

  throw new ApiError(404, "not_found", "接口不存在");
}

export async function handleApi(req, res, store) {
  const url = new URL(req.url, "http://localhost");
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch (_) {
    json(req, res, 400, { error: { code: "invalid_url", message: "请求路径不合法" } });
    return;
  }
  const cleanUrl = { pathname };
  try {
    await route(req, res, store, cleanUrl);
  } catch (err) {
    if (res.headersSent) { try { res.end(); } catch (_) {} return; }
    if (err instanceof ApiError) {
      json(req, res, err.status, { error: { code: err.code, message: err.message, data: err.data || null } });
      return;
    }
    console.error("[gayme-account] 未处理异常:", err && err.stack || err);
    json(req, res, 500, { error: { code: "internal_error", message: "服务器内部错误" } });
  }
}

export function cleanup(store) {
  const now = Date.now();
  store.cleanup(now, now - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
