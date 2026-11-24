/* 樱时信笺 · 账号服务入口
 * 同一进程提供：
 *   1) /api/*  账号与云存档 API
 *   2) 其余路径 静态游戏站点（无需 nginx 也能本地跑）
 * 生产环境建议用 nginx/Cloudflare 终止 TLS 后反代到本进程，只监听 127.0.0.1。
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { DB_PATH, HOST, PORT, SITE_ROOT, ensureDataDir } from "./config.mjs";
import { openDatabase } from "./db.mjs";
import { cleanup, handleApi } from "./api.mjs";
import { installFatalHandlers } from "./fatal.mjs";
import { tightenFileMode } from "./permissions.mjs";

// v3.4.56：数据库与预写日志只允许属主读写。掩码必须在创建任何文件之前设置
// （新建文件 600、新建目录 700）
process.umask(0o077);
ensureDataDir();
const store = openDatabase(DB_PATH);
// 老文件的权限可能是 644（同机任何用户可读）：每次启动时收紧为 600
for (const file of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) tightenFileMode(file);
cleanup(store);
const cleanupTimer = setInterval(() => {
  try { cleanup(store); } catch (err) { console.error("[gayme-account] 定期清理失败:", err); }
}, 60 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const PUBLIC_ROOTS = ["assets/", "audio/", "css/", "fonts/", "icons/", "js/"];
const PUBLIC_FILES = new Set([
  "index.html", "sw.js", "favicon.svg", "manifest.webmanifest", "robots.txt", "sitemap.xml",
  "NOTICE.md", "PRIVACY.md",
]);
const DENY_PREFIXES = ["server/", "docs/", "tests/", "tools/", "经验/", ".git/", ".github/", "node_modules/"];

/* v3.4.55：仓库里的 index.html 默认把账号功能标成「关闭」（纯静态部署不去探测 /api/）。
   本进程自带账号接口，提供首页时把它打开；磁盘上的文件不动。 */
const ACCOUNT_FLAG_OFF = 'name="gayme-account-api" content="off"';
const ACCOUNT_FLAG_ON = 'name="gayme-account-api" content=""';
function readIndexHtml() {
  const html = fs.readFileSync(path.join(SITE_ROOT, "index.html"), "utf8");
  return html.includes(ACCOUNT_FLAG_OFF) ? html.replace(ACCOUNT_FLAG_OFF, ACCOUNT_FLAG_ON) : html;
}

function isPublicPath(rel) {
  const clean = rel.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!clean || clean.includes("\0") || clean.split("/").includes("..")) return false;
  if (PUBLIC_FILES.has(clean)) return true;
  if (DENY_PREFIXES.some((prefix) => clean.startsWith(prefix))) return false;
  return PUBLIC_ROOTS.some((prefix) => clean.startsWith(prefix));
}

function send(req, res, status, body, headers = {}) {
  res.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...headers,
  });
  if (req.method === "HEAD") res.end();
  else res.end(body);
}

function serveStatic(req, res, rawPath) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(req, res, 405, "Method Not Allowed", { "Content-Type": "text/plain; charset=utf-8", "Allow": "GET, HEAD" });
    return;
  }
  let decoded;
  try { decoded = decodeURIComponent(rawPath); }
  catch (_) { send(req, res, 400, "Bad Request", { "Content-Type": "text/plain; charset=utf-8" }); return; }
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (!isPublicPath(rel)) {
    send(req, res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  const abs = path.resolve(SITE_ROOT, rel);
  const rootWithSep = SITE_ROOT.endsWith(path.sep) ? SITE_ROOT : SITE_ROOT + path.sep;
  if (!abs.startsWith(rootWithSep)) {
    send(req, res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  let stat;
  try { stat = fs.statSync(abs); }
  catch (_) {
    send(req, res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  if (!stat.isFile()) {
    send(req, res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  // 首页要先改写账号开关再发：整份读入内存（只有几十 KB），不走下面的流式直发
  if (rel === "index.html") {
    const body = Buffer.from(readIndexHtml());
    send(req, res, 200, body, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
    });
    return;
  }
  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  };
  if (req.method === "HEAD") {
    res.writeHead(200, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let pathname = "/";
  try {
    const rawUrl = String(req.url || "/");
    pathname = rawUrl.split("?")[0] || "/";
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, store);
    } else {
      serveStatic(req, res, pathname);
    }
  } catch (err) {
    console.error("[gayme-account] 请求异常:", err && err.stack || err);
    if (!res.headersSent) {
      send(req, res, 500, "Internal Server Error", { "Content-Type": "text/plain; charset=utf-8" });
    } else {
      try { res.end(); } catch (_) {}
    }
  } finally {
    const ms = Date.now() - started;
    if (process.env.GAYME_LOG_REQUESTS !== "0") {
      console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} ${res.statusCode} ${ms}ms`);
    }
  }
});

server.on("clientError", (err, socket) => {
  console.warn("[gayme-account] clientError:", err && err.code || err);
  try { socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); } catch (_) {}
});

server.on("error", (err) => {
  console.error("[gayme-account] 服务启动失败:", err && err.stack || err);
  process.exitCode = 1;
});

// v3.4.56：未捕获的异常 / 未处理的 Promise 拒绝之后进程退出（由容器重启），
// 不再带着未知状态继续处理请求。请求处理里的异常都已在 handleApi 内捕获并返回 500，
// 走到这里的是预料之外的错误
installFatalHandlers({
  onClose() {
    clearInterval(cleanupTimer);
    try { server.close(); } catch (_) {}
    try { store.close(); } catch (_) {}
  },
});

function shutdown(signal) {
  console.log(`[gayme-account] 收到 ${signal}，正在关闭...`);
  clearInterval(cleanupTimer);
  server.close(() => {
    try { store.close(); } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(PORT, HOST, () => {
  console.log(`[gayme-account] 已启动 http://${HOST}:${PORT}  DB=${DB_PATH} VERSION=${(() => {
    try { return fs.readFileSync(path.join(SITE_ROOT, "VERSION"), "utf8").trim(); }
    catch (_) { return "dev"; }
  })()}`);
});
