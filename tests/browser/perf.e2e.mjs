/* 低配模式性能 A/B（v3.4.50 新增）
   目的：确认 body.no-blur 真的摘掉了关键容器的 backdrop-filter，并记录两态帧耗时。
   硬断言只针对 computed style；帧率仅在 PERF_ASSERT=1 时按 ≥20% 改善断言
   （共享机器/软件渲染抖动大，避免把性能噪声变成红灯）。
   运行：CHROME_PATH=/usr/bin/chromium node tests/browser/perf.e2e.mjs
        PERF_ASSERT=1 ... 额外断言帧耗时改善 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".webp": "image/webp", ".ogg": "audio/ogg", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const p = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const data = await readFile(join(ROOT, decodeURIComponent(p)));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("nf"); }
});
let PORT = 41811;
for (let i = 0; i < 6; i++) {
  try { await new Promise((res, rej) => { server.once("error", rej); server.listen(PORT + i, res); }); PORT += i; break; }
  catch (e) { if (e.code !== "EADDRINUSE" || i === 5) throw e; }
}
const URL = `http://127.0.0.1:${PORT}`;

const { chromium } = await import("playwright");
let browser = null;

test.after(async () => {
  try { await browser?.close(); } catch {}
  await new Promise((r) => server.close(r));
  server.closeAllConnections?.();
});
test.before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: [
    "--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows" ] });
});

const sampleFrames = (page, ms) => page.evaluate(async (ms) => {
  const deltas = [];
  const t0 = performance.now();
  let last = t0;
  await new Promise((resolve) => {
    const step = (t) => {
      deltas.push(t - last); last = t;
      if (t - t0 < ms) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
  deltas.shift();
  if (!deltas.length) return { n: 0, avg: 0, p95: 0 };
  const sorted = [...deltas].sort((a, b) => a - b);
  return {
    n: deltas.length,
    avg: +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1),
    p95: +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(1),
  };
}, ms);

const filters = (page) => page.evaluate(() => ({
  choices: getComputedStyle(document.querySelector("#choices")).backdropFilter,
  dialog: getComputedStyle(document.querySelector("#dialog-box")).backdropFilter,
}));

test("no-blur 摘掉关键容器模糊，并记录帧耗时 A/B", { timeout: 120_000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
  await page.evaluate(() => { Saves.updateSetting("bgm", false); Saves.setFlag("tutorialSeen", true);
    window.__game.newGame(); window.__game.gotoNode("day2_choice"); });
  await page.waitForSelector("#choices button", { timeout: 15000 });
  await page.waitForTimeout(600);

  const before = await filters(page);
  assert.notEqual(before.choices, "none", "默认应有模糊");
  assert.notEqual(before.dialog, "none", "对白框默认应有模糊");
  const on = await sampleFrames(page, 3000);

  await page.evaluate(() => document.body.classList.add("no-blur"));
  await page.waitForTimeout(200);
  const after = await filters(page);
  assert.equal(after.choices, "none", "no-blur 后选项层应为 none");
  assert.equal(after.dialog, "none", "no-blur 后对白框应为 none");
  const off = await sampleFrames(page, 3000);

  console.log(`帧耗时  开模糊 avg=${on.avg}ms p95=${on.p95}ms (${on.n} 帧)`);
  console.log(`帧耗时  关模糊 avg=${off.avg}ms p95=${off.p95}ms (${off.n} 帧)`);
  console.log(`点击层 backdrop-filter: ${before.choices} → ${after.choices}`);

  if (process.env.PERF_ASSERT === "1" && on.n > 30 && off.n > 30) {
    assert.ok(off.p95 <= on.p95 * 0.8,
      `关闭模糊后 p95 应至少改善 20%：${on.p95}ms → ${off.p95}ms`);
  }
  await ctx.close();
});
