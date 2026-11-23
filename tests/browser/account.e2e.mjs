/* 账号系统浏览器 e2e（v3.4.53 新增）
   覆盖：设置页账号 UI → 注册并展示一次性找回码 → 进入账号 →
        上传本机存档到云端 → 新浏览器上下文登录 → 从云端恢复 →
        退出登录。使用真实 Node 账号服务 + 临时 SQLite，不污染正式库。
   运行：npm run test:account:e2e */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 19310 + Math.floor(Math.random() * 80);
const BASE = `http://127.0.0.1:${PORT}`;
let server = null;
let tmpDir = null;

async function waitHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch { /* 服务尚未监听 */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("账号服务启动超时");
}

test.before(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "gayme-account-e2e-"));
  server = spawn(process.execPath, ["server/index.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      GAYME_ACCOUNT_PORT: String(PORT),
      GAYME_DB_PATH: join(tmpDir, "e2e.db"),
      GAYME_LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", (chunk) => {
    const text = String(chunk || "");
    if (text.trim()) console.error("[account-server]", text.trim());
  });
  await waitHealth();
});

test.after(async () => {
  try {
    server?.kill("SIGTERM");
    await new Promise((resolve) => {
      if (!server || server.exitCode !== null) return resolve();
      server.once("exit", resolve);
      setTimeout(resolve, 3000);
    });
  } catch { /* 已退出则忽略 */ }
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

test("账号注册、云存档上传、换设备恢复与退出", { timeout: 120_000 }, async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const username = "e2e_ui_" + Date.now().toString().slice(-9);
  const password = "Passw0rd!";
  const errors = [];

  try {
    const ctx1 = await browser.newContext();
    const page = await ctx1.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      if (m.text().includes("Navigated away from page")) return;
      errors.push("console: " + m.text());
    });

    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
    await page.evaluate(() => { Saves.setFlag("tutorialSeen", true); window.__game.newGame(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__game.quickSave());

    // 账号 UI 挂在设置页；开局后从顶栏进入。
    await page.click('#top-bar button[data-menu="config"]', { timeout: 8000 });
    await page.waitForSelector("#cfg-account .acct-card", { timeout: 8000 });
    assert.match(await page.locator("#cfg-account").innerText(), /登录账号/);

    await page.click('[data-acct-action="tab-register"]');
    await page.fill('form[data-acct-form="register"] input[name="username"]', username);
    await page.fill('form[data-acct-form="register"] input[name="password"]', password);
    await page.fill('form[data-acct-form="register"] input[name="confirm"]', password);
    await page.fill('form[data-acct-form="register"] input[name="nickname"]', "E2E 测试");
    await page.click('form[data-acct-form="register"] button[type="submit"]');

    const codeEl = page.locator(".acct-code");
    await codeEl.waitFor({ state: "visible", timeout: 8000 });
    const recoveryCode = (await codeEl.innerText()).trim();
    assert.match(recoveryCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await page.click('[data-acct-action="finish-register"]');
    await page.waitForSelector(".acct-block-title", { timeout: 8000 });
    assert.match(await page.locator("#cfg-account").innerText(), /@[\w]+/);

    await page.click('[data-acct-action="upload"]');
    await page.waitForFunction(() => document.querySelector("#cfg-account")?.innerText.includes("已上传到云端"),
      null, { timeout: 10000 });
    const revision1 = await page.evaluate(() => window.AccountUI?.state?.cloud?.revision ?? null);
    assert.ok(revision1 === null || revision1 >= 1, "上传后应有云端修订号");

    // v3.4.55：退出登录先让玩家选「是否一并清除本机存档」（公用电脑用）；这里选仅退出
    await page.click('[data-acct-action="logout"]');
    await page.waitForSelector('[data-acct-action="logout-keep"]', { timeout: 8000 });
    await page.click('[data-acct-action="logout-keep"]');
    await page.waitForSelector('form[data-acct-form="login"]', { timeout: 8000 });

    // 新浏览器上下文 = 换设备：本地无存档，登录后从云端恢复。
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    page2.on("pageerror", (e) => errors.push("page2 pageerror: " + e.message));
    await page2.goto(BASE, { waitUntil: "load" });
    await page2.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
    await page2.evaluate(() => window.__game.openOverlay('config'));
    await page2.waitForSelector('form[data-acct-form="login"]', { timeout: 8000 });
    await page2.fill('form[data-acct-form="login"] input[name="username"]', username);
    await page2.fill('form[data-acct-form="login"] input[name="password"]', password);
    await page2.click('form[data-acct-form="login"] button[type="submit"]');
    await page2.waitForFunction(() => document.querySelector("#cfg-account")?.innerText.includes("已登录"),
      null, { timeout: 10000 });
    assert.equal(await page2.evaluate(() => {
      const r = Saves.exportData().records;
      return Boolean(r.sakura_letters_saves_v2 || r.sakura_letters_autosave_v2);
    }), false, "新设备初始应无本地存档");

    await page2.click('[data-acct-action="download"]');
    await page2.waitForSelector('[data-acct-action="download-confirm"]', { timeout: 8000 });
    await page2.click('[data-acct-action="download-confirm"]');
    await page2.waitForFunction(() => {
      const r = Saves.exportData().records;
      return Boolean(r.sakura_letters_saves_v2 || r.sakura_letters_autosave_v2);
    }, null, { timeout: 12000 });

    assert.equal(await page2.evaluate(() => {
      const r = Saves.exportData().records;
      return Boolean(r.sakura_letters_saves_v2 || r.sakura_letters_autosave_v2);
    }), true, "恢复后本地应出现存档记录");

    await ctx1.close();
    await ctx2.close();
    assert.deepEqual(errors, [], "账号流程不应有控制台错误");
  } finally {
    await browser.close();
  }
});
