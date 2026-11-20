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

// 允许跨域的前端地址。留空表示账号服务与游戏静态页同源（推荐）。
export const ALLOWED_ORIGIN = process.env.GAYME_ALLOWED_ORIGIN || "";
// 反向代理场景可显式信任 X-Forwarded-For；默认只信任本机回环代理。
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
