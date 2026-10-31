/* 移动端玩法溢出扫描（v3.4.33）：390×844 视口下逐一挂载全部玩法节点，
   检查是否有元素横向溢出视口（窄屏被切边是手机上最容易被漏掉的一类缺陷）。

   由来：v3.4.32 全量回归审计时人工扫了 90 个玩法节点，发现钢琴 / 倒影 / 糖块
   三处在 390px 下超宽或超出舞台。人工扫描留不下防线，故沉淀成此脚本——
   以后任何玩法改尺寸，只要窄屏放不下就会被这里拦下。

   用法：npm run test:overflow（需 npx playwright install chromium-headless-shell）
   说明：只查「横向溢出」，纵向滚动属正常；等待 1600ms 是因为玩法浮层在打字机
        结束后才挂载（后日谈三处实测需要 ~1.4s）。 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readdir, readFile as readFileFs } from "node:fs/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 41794;
const VIEWPORT = { width: 390, height: 844 };
const TOLERANCE = 1;          // 亚像素误差容限
const WAIT_MS = 1600;         // 玩法浮层挂载等待
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".webmanifest": "application/manifest+json", ".ogg": "audio/ogg",
};

const server = createServer(async (req, res) => {
  const path = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const data = await readFile(join(ROOT, decodeURIComponent(path)));
    res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});
await new Promise((resolve) => server.listen(PORT, resolve));

/* 从 js/games/*.js 里抽出全部已注册的玩法 kind（register("piano", …)） */
async function collectGameKinds() {
  const dir = join(ROOT, "js/games");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  const kinds = new Set();
  for (const f of files) {
    const code = await readFileFs(join(dir, f), "utf8");
    for (const m of code.matchAll(/register\(\s*"([a-z0-9_]+)"/g)) kinds.add(m[1]);
  }
  return [...kinds];
}

let browser = null;
test.after(async () => {
  try { await browser?.close(); } catch { /* 已关闭则忽略 */ }
  await new Promise((resolve) => server.close(resolve));
  server.closeAllConnections?.();
});

test("移动端全部玩法节点无横向溢出（390×844）", { timeout: 600_000 }, async () => {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.text().includes("Navigated away from page")) return;
    errors.push("console: " + m.text());
  });

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 15000 });
  // 规矩：浏览器实测前必须静音
  await page.evaluate(() => {
    Saves.updateSetting("bgm", false);
    Saves.updateSetting("sfxVolume", 0);
    Saves.updateSetting("textSpeed", 5);
    window.__game.newGame();
  });
  await page.waitForTimeout(300);
  await page.locator("#tutorial-layer .tutorial-ok").click({ timeout: 2000 }).catch(() => {});

  // 全部玩法节点：SCRIPT 里带玩法 kind 字段的。
  // kind 清单来自 js/games/*.js 的 register("xxx")——玩法节点用的是各自 kind 字段名
  // （piano / reflection / sugar …），没有统一的 minigame 字段（那是另一类老玩法）。
  const kinds = await collectGameKinds();
  const nodes = await page.evaluate((ks) =>
    Object.keys(SCRIPT).filter((id) => {
      const n = SCRIPT[id];
      if (!n) return false;
      if (n.minigame) return true;                       // v1 老玩法
      return ks.some((k) => n[k] && typeof n[k] === "object");
    }), kinds);
  assert.ok(nodes.length > 50, `玩法节点数量异常：${nodes.length}`);

  const overflow = [];
  for (const id of nodes) {
    await page.evaluate((nid) => window.__game.gotoNode(nid), id);
    await page.waitForTimeout(WAIT_MS);
    const bad = await page.evaluate((tol) => {
      const vw = window.innerWidth;
      const out = [];
      document.querySelectorAll("#game *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const overRight = Math.round(r.right - vw);
        const overLeft = Math.round(-r.left);
        if (overRight > tol || overLeft > tol) {
          out.push(`${(el.className || el.id || el.tagName).toString().slice(0, 30)}[左${overLeft} 右${overRight}]`);
        }
      });
      return { docScroll: document.documentElement.scrollWidth, vw, items: out.slice(0, 4), count: out.length };
    }, TOLERANCE);
    if (bad.count > 0) overflow.push(`${id}（${bad.count} 处）→ ${bad.items.join("，")}`);
  }

  console.log(`[overflow] 扫描 ${nodes.length} 个玩法节点，横向溢出 ${overflow.length} 个`);
  overflow.forEach((x) => console.log("   " + x));
  assert.deepEqual(overflow, [], `以下玩法在 390px 视口横向溢出：\n  ${overflow.join("\n  ")}`);
  assert.deepEqual(errors, [], `控制台错误：${errors.join(" | ")}`);
});
