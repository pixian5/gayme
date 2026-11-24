/* 樱时信笺 · 账号服务配置
 * 仅使用 Node 内置模块；默认端口 8096，数据库落在 server/data/game.db。
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = __dirname;
export const SITE_ROOT = path.resolve(__dirname, "..");

function envInt(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

export const PORT = envInt("GAYME_ACCOUNT_PORT", 8096);
export const HOST = process.env.GAYME_ACCOUNT_HOST || "127.0.0.1";
export const DB_PATH = process.env.GAYME_DB_PATH || path.join(__dirname, "data", "game.db");

export const SESSION_DAYS = 30;
export const SESSION_MAX_PER_USER = 10;
export const MAX_JSON_BYTES = envInt("GAYME_MAX_JSON_BYTES", 8 * 1024 * 1024);
export const MAX_SAVE_BYTES = envInt("GAYME_MAX_SAVE_BYTES", 6 * 1024 * 1024);
export const AUDIT_RETENTION_DAYS = 90;

// v3.4.55：每个账号的云端存档保留多少个历史版本（被替换的旧版本可恢复到本机）
export const SAVE_VERSIONS_KEEP = envInt("GAYME_SAVE_VERSIONS", 10);

/* v3.4.55 限流阈值（都可用环境变量调整）。
 * 原先全部按网络地址计数：校园网、公司网络下众多玩家共用一个出口地址，会互相抢额度——
 * 一个班只有 5 个人能注册、30 次上传额度被所有人分摊。现在：
 *   已登录的上传与账号操作按「账号」计数；网络地址维度只保留宽松的防滥用上限；
 *   注册 / 登录 / 找回仍按网络地址（它们发生在登录之前），阈值放宽。 */
export const RATE_LIMITS = Object.freeze({
  registerPerHourPerIp: envInt("GAYME_RATE_REGISTER", 20),        // 原值 5
  loginPerWindowPerIp: envInt("GAYME_RATE_LOGIN", 60),            // 原值 20（每 5 分钟）
  loginWindowMs: 5 * 60 * 1000,
  recoverPerWindowPerIp: envInt("GAYME_RATE_RECOVER", 10),        // 每 15 分钟
  recoverWindowMs: 15 * 60 * 1000,
  accountPerWindowPerUser: envInt("GAYME_RATE_ACCOUNT", 30),      // 资料 / 改密 / 找回码 / 注销
  savePerWindowPerUser: envInt("GAYME_RATE_SAVE_USER", 120),      // 上传云存档
  savePerWindowPerIp: envInt("GAYME_RATE_SAVE_IP", 600),          // 同一出口地址的防滥用上限
  saveWindowMs: 15 * 60 * 1000,
});

// 允许跨域的前端地址。留空表示账号服务与游戏静态页同源（推荐）。
export const ALLOWED_ORIGIN = process.env.GAYME_ALLOWED_ORIGIN || "";
// 反向代理场景可显式信任 X-Forwarded-For；默认只信任本机回环代理。
// v3.4.56 起只取这个头的最后一项（最近一跳可信代理写入的值），见 auth.clientIp；
// 反向代理必须原样透传该头，不要往后追加自己的地址
export const TRUST_PROXY = process.env.GAYME_TRUST_PROXY === "1";
// Cookie Secure：auto 按请求协议判断；1 强制；0 关闭（仅本机 HTTP 开发）。
export const COOKIE_SECURE_MODE = String(process.env.GAYME_COOKIE_SECURE || "auto").toLowerCase();

export function ensureDataDir() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

export function isSecureRequest(req) {
  if (COOKIE_SECURE_MODE === "1") return true;
  if (COOKIE_SECURE_MODE === "0") return false;
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return proto === "https" || Boolean(req.socket && req.socket.encrypted);
}
