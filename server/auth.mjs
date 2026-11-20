/* 樱时信笺 · 账号安全工具
 * - scrypt 密码/找回码哈希
 * - 会话 token 只存 SHA-256
 * - Cookie / IP / 限流 / 校验
 */
import crypto from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export const COOKIE_NAME = "gayme_session";
export const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomId() {
  return crypto.randomUUID();
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Hex(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

export function scryptHash(secret, saltHex = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(secret), Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
  }).toString("hex");
  return { hash, salt: saltHex };
}

export function scryptVerify(secret, saltHex, expectedHex) {
  if (!saltHex || !expectedHex) return false;
  try {
    const actual = crypto.scryptSync(String(secret), Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
    });
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (_) {
    return false;
  }
}

export function generateRecoveryCode() {
  const pick = () => RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)];
  const groups = [];
  for (let g = 0; g < 3; g += 1) {
    let part = "";
    for (let i = 0; i < 4; i += 1) part += pick();
    groups.push(part);
  }
  return groups.join("-");
}

export function normalizeRecoveryCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidRecoveryCode(value) {
  const normalized = normalizeRecoveryCode(value);
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/.test(normalized);
}

export function formatRecoveryCode(normalized) {
  const s = normalizeRecoveryCode(normalized);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function charLength(value) {
  return Array.from(String(value || "")).length;
}

export function validUsername(value) {
  const username = String(value || "").trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return false;
  if (/^[0-9]+$/.test(username)) return false;
  return true;
}

export function validNickname(value) {
  const nickname = String(value || "").trim();
  return charLength(nickname) >= 1 && charLength(nickname) <= 24 && !/[\u0000-\u001f\u007f]/.test(nickname);
}

export function validPassword(value) {
  const password = String(value || "");
  const length = charLength(password);
  return length >= 8 && length <= 72 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    if (!key || out[key] !== undefined) continue;
    try { out[key] = decodeURIComponent(part.slice(index + 1).trim()); }
    catch (_) { out[key] = part.slice(index + 1).trim(); }
  }
  return out;
}

export function sessionCookie(token, { secure = false, maxAge = 30 * 24 * 60 * 60 } = {}) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie({ secure = false } = {}) {
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function isLoopbackAddress(addr) {
  const value = String(addr || "");
  return value === "127.0.0.1" || value === "::1" || value === "::ffff:127.0.0.1" || value === "localhost";
}

export function clientIp(req, trustProxy = false) {
  const remote = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
  if (trustProxy || isLoopbackAddress(remote)) {
    const header = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (header) return header.slice(0, 80);
  }
  return String(remote || "unknown").slice(0, 80);
}

/* 固定窗口限流：单进程内存实现；多实例部署时需要外部共享存储。 */
export class RateLimiter {
  constructor(limit, windowMs, name = "rate") {
    this.limit = limit;
    this.windowMs = windowMs;
    this.name = name;
    this.map = new Map();
    this.timer = setInterval(() => this.sweep(), Math.min(windowMs, 60_000));
    if (this.timer.unref) this.timer.unref();
  }

  hit(key) {
    const now = Date.now();
    const item = this.map.get(key);
    if (!item || now >= item.resetAt) {
      this.map.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, remaining: this.limit - 1, retryAfter: 0 };
    }
    if (item.count >= this.limit) {
      return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((item.resetAt - now) / 1000)) };
    }
    item.count += 1;
    return { ok: true, remaining: this.limit - item.count, retryAfter: 0 };
  }

  sweep() {
    const now = Date.now();
    for (const [key, item] of this.map) {
      if (now >= item.resetAt) this.map.delete(key);
    }
  }
}

/* 登录失败锁定：同一 用户名|IP 连续 5 次失败锁 15 分钟。 */
export class LoginGuard {
  constructor() {
    this.map = new Map();
    this.timer = setInterval(() => this.sweep(), 60_000);
    if (this.timer.unref) this.timer.unref();
  }

  lockedFor(key) {
    const item = this.map.get(key);
    if (!item || !item.until) return 0;
    const remain = item.until - Date.now();
    if (remain <= 0) {
      this.map.delete(key);
      return 0;
    }
    return Math.ceil(remain / 1000);
  }

  fail(key) {
    const now = Date.now();
    const item = this.map.get(key) || { fails: 0, until: 0 };
    item.fails += 1;
    if (item.fails >= 5) {
      item.fails = 0;
      item.until = now + 15 * 60 * 1000;
    }
    this.map.set(key, item);
  }

  success(key) {
    this.map.delete(key);
  }

  sweep() {
    const now = Date.now();
    for (const [key, item] of this.map) {
      if (item.until && item.until <= now) this.map.delete(key);
    }
  }
}
