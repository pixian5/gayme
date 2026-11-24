/* 樱时信笺 · 账号安全工具
 * - scrypt 密码/找回码哈希（v3.4.56 起异步：计算期间不阻塞整个服务）
 * - 会话 token 只存 SHA-256
 * - Cookie / 客户端地址 / 限流 / 校验
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

/* v3.4.56：哈希改用异步 scrypt。
 * 此前用同步版本：一次校验约 190 毫秒，这期间整个账号服务无响应（Node 是单线程），
 * 其他玩家的请求都得排队。异步版本把计算放到线程池，事件循环照常处理别的请求。
 * 算法与参数没变，v3.4.56 之前存的哈希照常可验。 */
const SCRYPT_OPTIONS = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM };

function scryptHex(secret, saltHex) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(secret), Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN, SCRYPT_OPTIONS, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}

export async function scryptHash(secret, saltHex = crypto.randomBytes(16).toString("hex")) {
  const hash = await scryptHex(secret, saltHex);
  return { hash, salt: saltHex };
}

export async function scryptVerify(secret, saltHex, expectedHex) {
  if (!saltHex || !expectedHex) return false;
  try {
    const actual = Buffer.from(await scryptHex(secret, saltHex), "hex");
    const expected = Buffer.from(String(expectedHex), "hex");
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

/* 地址规范化：去掉 IPv4 映射前缀（::ffff:1.2.3.4 → 1.2.3.4）；不像地址的值返回空串 */
function normalizeIp(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const plain = text.toLowerCase().startsWith("::ffff:") ? text.slice(7) : text;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(plain)) return plain;
  if (plain.includes(":") && /^[0-9a-f:]+$/.test(plain)) return plain.toLowerCase();
  return "";
}

/* 客户端网络地址：用于限流、登录失败锁定、会话与审计记录。
 * v3.4.56：取 X-Forwarded-For 的**最后一项**，而不是第一项。
 * 这个头的每一跳由经过的代理依次追加：只有「离我们最近的一跳可信代理」写入的那一项（最后一项）
 * 是代理自己看到的真实对端；它前面的各项客户端都可以随意伪造。
 * 前提：反向代理必须原样透传上游写入的 X-Forwarded-For，不要再往后追加自己的地址
 * （nginx 用 $http_x_forwarded_for，不要用 $proxy_add_x_forwarded_for，见 tools/patch_nginx_account.py）。
 * 取不到可信值时，用 TCP 连接的对端地址。 */
export function clientIp(req, trustProxy = false) {
  const rawRemote = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
  const remote = normalizeIp(rawRemote) || String(rawRemote || "").slice(0, 80);
  if (trustProxy || isLoopbackAddress(remote)) {
    const parts = String(req.headers["x-forwarded-for"] || "").split(",").map((item) => item.trim()).filter(Boolean);
    const last = parts.length ? normalizeIp(parts[parts.length - 1]) : "";
    if (last) return last;
  }
  return remote || "unknown";
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
