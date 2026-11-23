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
// v3.4.55：账号开关用例临时置真——模拟「部署把开关打开了，但接口不可用」。
// 平时为假：本服务器原样提供仓库文件，也就是「纯静态部署」的样子（仓库默认开关为 off）
let indexFlagOn = false;
const server = createServer(async (req, res) => {
  const p = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    let data = await readFile(join(ROOT, decodeURIComponent(p)));
    if (p === "/index.html" && indexFlagOn) {
      data = Buffer.from(data.toString("utf8")
        .replace('name="gayme-account-api" content="off"', 'name="gayme-account-api" content=""'));
    }
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

/* ---------- v3.4.55：账号功能由部署决定 ----------
   仓库默认 off：纯静态部署（安装包、静态镜像、测试环境）不显示账号区块、不探测 /api/。
   此前无论部署里有没有账号服务，每个玩家打开设置页都会多一次 /api/health 404。 */
// 注意：本文件顶部的常量 URL 是服务器地址，遮蔽了全局的 URL 类——解析地址必须写 globalThis.URL
//（2026-11-24 踩坑：监听器里 new URL() 抛异常，监听形同虚设，「不应有请求」的断言空洞地通过）
function watchApi(page) {
  const seen = { total: 0, requests: [], errors: [], pageErrors: [] };
  page.on("request", (req) => {
    seen.total += 1;
    const u = new globalThis.URL(req.url());
    if (u.pathname.startsWith("/api/")) seen.requests.push(`${req.method()} ${u.pathname}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) seen.errors.push(`${res.status()} ${new globalThis.URL(res.url()).pathname}`);
  });
  page.on("pageerror", (err) => seen.pageErrors.push(String(err)));
  return seen;
}
async function openConfig(page) {
  await page.click('#top-bar button[data-menu="config"]', { timeout: 8000 });
  await page.waitForSelector("#cfg-blur", { state: "visible", timeout: 8000 });
}
const accountBox = (page) => page.evaluate(() => {
  const box = document.getElementById("cfg-account");
  return box && { hidden: box.hidden, display: getComputedStyle(box).display,
    height: Math.round(box.getBoundingClientRect().height), text: box.textContent.trim() };
});

test("纯静态部署（仓库默认开关）：设置页不显示账号区块，也不向 /api/ 发任何请求", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const seen = watchApi(page);
  await openGame(page);
  await openConfig(page);
  // 账号模块若启用，会在这段时间里探测 /api/health
  await page.waitForTimeout(1200);
  let box = await accountBox(page);
  assert.ok(box, "设置页里应有账号容器 #cfg-account");
  assert.equal(box.hidden, true, "账号区块应带 hidden");
  assert.equal(box.display, "none", "账号区块不应占位");
  assert.equal(box.height, 0, "账号区块高度应为 0");
  assert.equal(box.text, "", "账号区块内不应有任何内容");
  assert.equal(await page.evaluate(() => window.AccountUI.enabled), false, "AccountUI.enabled 应为 false");
  // 监听器自检：确实观察到了页面的其它请求，否则下面「没有 /api/ 请求」是空洞的通过
  assert.ok(seen.total >= 10, `监听器应观察到页面请求（实际 ${seen.total} 条）`);
  assert.deepEqual(seen.requests, [], "纯静态部署不应向 /api/ 发任何请求");
  assert.deepEqual(seen.errors, [], "不应出现 4xx / 5xx 响应（此前每次打开设置页都有一条 /api/health 404）");
  assert.deepEqual(seen.pageErrors, [], "不应有未捕获异常");

  // 关掉设置页再打开（容器会被重建、重新挂载）：仍然不请求
  await page.evaluate(() => window.__game.closeOverlay());
  await openConfig(page);
  await page.waitForTimeout(600);
  box = await accountBox(page);
  assert.equal(box.hidden, true, "重新打开设置页后账号区块仍应隐藏");
  assert.deepEqual(seen.requests, [], "重新打开设置页也不应请求 /api/");

  // 没启用账号功能时，「清空」的确认文案不该提云端与自动同步
  await page.evaluate(() => {
    window.__confirmText = null;
    window.confirm = (text) => { window.__confirmText = text; return false; };
  });
  await page.click("#cfg-clear");
  const tip = await page.evaluate(() => window.__confirmText);
  assert.match(tip || "", /确定清空所有存档/, "应弹出清空确认");
  assert.doesNotMatch(tip, /云端|自动同步/, "没启用账号功能时不该提云端");
  assert.deepEqual(seen.requests, [], "点「清空」也不应请求 /api/");
  await ctx.close();
});

test("部署打开了账号开关但接口不可用：只显示友好提示，设置页其它功能照常", async () => {
  indexFlagOn = true;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const seen = watchApi(page);
  try {
    await openGame(page);
    await openConfig(page);
    await page.waitForSelector("#cfg-account .acct-note", { state: "attached", timeout: 8000 });
    const box = await accountBox(page);
    assert.equal(box.hidden, false, "开关打开时账号区块应显示");
    assert.notEqual(box.display, "none", "账号区块应可见");
    assert.match(box.text, /账号服务暂时连不上/, "应说明账号服务连不上，且本地存档不受影响");
    assert.ok(seen.total >= 10, `监听器应观察到页面请求（实际 ${seen.total} 条）`);
    assert.doesNotMatch(box.text, /undefined|\[object Object\]/, "界面不应出现程序内部字样");
    assert.deepEqual(seen.requests, ["GET /api/health"], "接口不可用时应只探测一次健康检查，不应反复重试");
    assert.deepEqual(seen.errors, ["404 /api/health"], "这里的那一条 404 是预期的");
    assert.deepEqual(seen.pageErrors, [], "接口不可用不应产生未捕获异常");
    // 设置页其它功能不受影响
    await page.selectOption("#cfg-blur", "false");
    assert.equal(await hasNoBlur(page), true, "账号服务不可用时界面设置仍应立即生效");
    assert.equal(await page.evaluate(() => Saves.settings.textSpeed !== undefined), true, "本地设置照常可读写");
  } finally {
    indexFlagOn = false;
    await ctx.close();
  }
});
