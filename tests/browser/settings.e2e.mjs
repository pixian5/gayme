/* 界面设置 e2e（v3.4.50 新增）
   覆盖：设置面板「界面模糊」开关 → body.no-blur 立即生效 → 刷新保持 /
        旧档缺键默认开启 / 导入（localStorage 直写，走 normalizeSettings）保留 false /
        与「减少动效」互相独立。
   运行：CHROME_PATH=/usr/bin/chromium node tests/browser/settings.e2e.mjs */
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
let PORT = 41810;
for (let i = 0; i < 6; i++) {
  try { await new Promise((res, rej) => { server.once("error", rej); server.listen(PORT + i, res); }); PORT += i; break; }
  catch (e) { if (e.code !== "EADDRINUSE" || i === 5) throw e; }
}
const URL = `http://127.0.0.1:${PORT}`;
const SETTINGS_KEY = "sakura_letters_settings_v2";

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

async function openGame(page) {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
  await page.evaluate(() => { Saves.setFlag("tutorialSeen", true); window.__game.newGame(); });
  await page.waitForTimeout(250);
}
const hasNoBlur = (page) => page.evaluate(() => document.body.classList.contains("no-blur"));

test("设置面板关闭界面模糊：立即生效、CSS 计算值变 none、刷新后保持", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await openGame(page);
  assert.equal(await hasNoBlur(page), false, "默认应为开启（无 no-blur）");

  await page.click('#top-bar button[data-menu="config"]', { timeout: 8000 });
  await page.waitForSelector("#cfg-blur", { state: "visible", timeout: 8000 });
  await page.selectOption("#cfg-blur", "false");
  assert.equal(await hasNoBlur(page), true, "选择关闭后应立即加 no-blur");
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.querySelector("#choices")).backdropFilter),
    "none", "关闭后选项层不应再有 backdrop-filter");
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.querySelector("#dialog-box")).backdropFilter),
    "none", "关闭后对白框不应再有 backdrop-filter");

  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
  assert.equal(await hasNoBlur(page), true, "刷新后应保持关闭");
  assert.equal(await page.evaluate(() => Saves.settings.blurEffects), false);
  await ctx.close();
});

test("旧档没有 blurEffects 键：默认开启且不报错", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ textSpeed: 30, autoDelay: 1200, bgmVolume: 0.4,
      sfxVolume: 0.6, particles: true, bgm: false, fontScale: 1, reduceMotion: false }));
  }, SETTINGS_KEY);
  await openGame(page);
  assert.equal(await page.evaluate(() => Saves.settings.blurEffects), true);
  assert.equal(await hasNoBlur(page), false);
  await ctx.close();
});

test("导入的设置保留 blurEffects=false（normalizeSettings 白名单）", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ textSpeed: 30, autoDelay: 1200, bgmVolume: 0.4,
      sfxVolume: 0.6, particles: true, bgm: false, fontScale: 1, reduceMotion: false, blurEffects: false }));
  }, SETTINGS_KEY);
  await openGame(page);
  assert.equal(await page.evaluate(() => Saves.settings.blurEffects), false, "导入时该键不能被丢弃");
  assert.equal(await hasNoBlur(page), true);
  await ctx.close();
});

test("「界面模糊」与「减少动效」互相独立", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await openGame(page);
  await page.evaluate(() => { Saves.updateSetting("reduceMotion", true); });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
  const cls = await page.evaluate(() => document.body.className);
  assert.match(cls, /reduce-motion/);
  assert.doesNotMatch(cls, /no-blur/, "只开减少动效不应关掉模糊");
  await ctx.close();
});
