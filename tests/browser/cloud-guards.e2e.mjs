/* 云存档数据安全 · 浏览器端到端（v3.4.55）
   前身是 v3.4.54 审查时的复现脚本：当时四条路径全部能复现（新设备勾自动同步清空云端 /
   共用设备换账号串号 / 清空本地后覆盖云端 / 自动同步撞限流后静默失效）。
   这里每条路径都是一个带断言的用例——修复后的行为必须保持。
   使用真实 Node 账号服务 + 临时 SQLite，不污染正式库。
   运行：npm run test:cloud */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 19560 + Math.floor(Math.random() * 60);
const BASE = `http://127.0.0.1:${PORT}`;
let server = null;
let tmpDir = null;
let browser = null;      // 浏览器只起一次，所有用例共用

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
  const { chromium } = await import("playwright");
  browser = await chromium.launch();
  tmpDir = await mkdtemp(join(tmpdir(), "gayme-cloud-e2e-"));
  server = spawn(process.execPath, ["server/index.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      GAYME_ACCOUNT_PORT: String(PORT),
      GAYME_DB_PATH: join(tmpDir, "e2e.db"),
      GAYME_LOG_REQUESTS: "0",
      // 把「每账号上传次数上限」调小，限流用例才能在几秒内撞到；
      // 其余用例里每个账号的上传次数都不超过 3 次，不受影响
      GAYME_RATE_SAVE_USER: "3",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});
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
  await browser?.close();
});

/* ---------- 操作方式与 tests/browser/account.e2e.mjs 一致：全部走真实界面 ---------- */
const PASSWORD = "Passw0rd!";
const stamp = Date.now().toString().slice(-8);
let userSeq = 0;
const nextUser = (tag) => `cg${tag}${(userSeq++).toString(36)}${stamp}`.slice(0, 20);

async function newDevice() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error" || m.text().includes("Navigated away")) return;
    // 浏览器对任何 4xx / 5xx 响应都会记一条「Failed to load resource」；
    // 这类是否算错误交给下面的响应监听按地址判定（用例自己预期的 404 / 429 不算）
    if (/Failed to load resource/.test(m.text())) return;
    errors.push("console: " + m.text());
  });
  page.on("response", (r) => {
    if (r.status() < 400) return;
    const url = r.url();
    if (url.includes("/api/saves/data") && r.status() === 404) return;   // 用例探测「云端还没有存档」
    if (url.includes("/api/saves") && r.status() === 429) return;        // 限流用例里预期的拒绝
    errors.push(`http ${r.status()} ${url}`);
  });
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game && window.AccountUI, null, { timeout: 20000 });
  return { ctx, page, errors };
}
async function startGame(page, nodes, manualSave = true) {
  await page.evaluate(() => {
    Saves.setFlag("tutorialSeen", true);
    Saves.updateSetting("bgm", false); Saves.updateSetting("sfxVolume", 0); Saves.updateSetting("textSpeed", 5);
    window.__game.newGame();
  });
  await page.waitForTimeout(300);
  for (let i = 0; i < nodes; i++) {
    await page.evaluate(() => { const d = document.getElementById("dialog-box"); if (d && !d.classList.contains("hidden")) d.click(); });
    await page.waitForTimeout(100);
    await page.evaluate(() => { const d = document.getElementById("dialog-box"); if (d && !d.classList.contains("hidden")) d.click(); });
    await page.waitForTimeout(330);
  }
  if (manualSave) await page.evaluate(() => window.__game.quickSave());
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const r = Saves.exportData().records;
    const slot = r.sakura_letters_saves_v2 && r.sakura_letters_saves_v2.slots.filter(Boolean)[0];
    return slot ? slot.nodeId : null;
  });
}
async function openAccount(page) {
  await page.evaluate(() => window.__game.openOverlay("config"));
  await page.waitForSelector("#cfg-account .acct-card", { timeout: 8000 });
}
const panelText = (page) => page.evaluate(() => document.querySelector("#cfg-account").innerText.replace(/\s+/g, " "));
async function register(page, username) {
  await openAccount(page);
  await page.click('[data-acct-action="tab-register"]');
  const f = 'form[data-acct-form="register"]';
  await page.fill(`${f} input[name="username"]`, username);
  await page.fill(`${f} input[name="password"]`, PASSWORD);
  await page.fill(`${f} input[name="confirm"]`, PASSWORD);
  await page.click(`${f} button[type="submit"]`);
  await page.locator(".acct-code").waitFor({ state: "visible", timeout: 8000 });
  await page.click('[data-acct-action="finish-register"]');
  await page.waitForSelector(".acct-block-title", { timeout: 8000 });
}
async function login(page, username) {
  await openAccount(page);
  await page.waitForSelector('form[data-acct-form="login"]', { timeout: 8000 });
  const f = 'form[data-acct-form="login"]';
  await page.fill(`${f} input[name="username"]`, username);
  await page.fill(`${f} input[name="password"]`, PASSWORD);
  await page.click(`${f} button[type="submit"]`);
  await page.waitForFunction(() => document.querySelector("#cfg-account")?.innerText.includes("已登录"), null, { timeout: 10000 });
  // 等设备列表拉取完（界面会重绘一次），避免紧接着的操作被打断
  await page.waitForTimeout(600);
}
async function manualUpload(page) {
  await page.click('[data-acct-action="upload"]');
  await page.waitForFunction(() => document.querySelector("#cfg-account")?.innerText.includes("已上传到云端"), null, { timeout: 10000 });
  await page.waitForTimeout(400);
}
// 勾选 / 取消「自动同步」：与真人点击复选框等价（触发 change 事件）
async function setAutoSync(page, on) {
  await page.waitForTimeout(300);
  const applied = await page.evaluate((want) => {
    const box = document.querySelector("[data-acct-auto]");
    if (box && box.checked !== want) box.click();
    return Boolean(window.AccountUI.state.autoSync) === want;
  }, on);
  if (!applied) throw new Error(`自动同步未能${on ? "开启" : "关闭"}`);
}
const cloudOf = (page) => page.evaluate(async () => {
  const r = await fetch("/api/saves/data", { headers: { "X-Requested-With": "gayme-account" }, credentials: "include" });
  const body = await r.json();
  const rec = (body && body.data && body.data.records) || {};
  const slots = rec.sakura_letters_saves_v2 ? rec.sakura_letters_saves_v2.slots.filter(Boolean) : [];
  return { status: r.status, revision: body && body.save ? body.save.revision : null,
    cloudSlots: slots.length, cloudSlot0: slots[0] ? slots[0].nodeId : null };
});
const localInfo = (page) => page.evaluate(() => {
  const r = Saves.exportData().records;
  const slots = r.sakura_letters_saves_v2 ? r.sakura_letters_saves_v2.slots.filter(Boolean) : [];
  return { filledSlots: slots.length, slot0: slots[0] ? slots[0].nodeId : null,
    autosyncFlag: localStorage.getItem("gayme_account_autosync"),
    owner: localStorage.getItem("gayme_local_owner") };
});

/* ================= 用例 ================= */

test("新设备只勾「自动同步」：云端存档不被清空，并提示先从云端恢复", { timeout: 90000 }, async () => {
  const user = nextUser("a");
  const A = await newDevice();
  const nodeA = await startGame(A.page, 10);
  await register(A.page, user);
  await manualUpload(A.page);
  const before = await cloudOf(A.page);
  assert.equal(before.cloudSlots, 1, "前置：云端应有一份存档");

  const B = await newDevice();                       // 全新浏览器上下文 = 新设备，本地无存档
  await login(B.page, user);
  assert.equal((await localInfo(B.page)).filledSlots, 0, "前置：新设备本机应没有存档");
  await setAutoSync(B.page, true);                   // 玩家只是勾了「自动同步」
  await B.page.waitForTimeout(7500);                 // 足够原来的 5 秒防抖触发

  const after = await cloudOf(A.page);
  assert.equal(after.revision, before.revision, "云端修订号不应变化——没有任何东西被上传");
  assert.equal(after.cloudSlots, 1, "云端的存档槽不应被清空");
  const text = await panelText(B.page);
  assert.match(text, /本机没有存档/, "应提示本机没有存档、云端有一份");
  assert.match(text, /从云端恢复/, "应给出「从云端恢复」的入口");

  // 顺着提示恢复：本机拿到云端存档，暂停解除
  await B.page.click('[data-acct-action="download"]');
  await B.page.waitForSelector('[data-acct-action="download-confirm"]', { timeout: 8000 });
  await B.page.click('[data-acct-action="download-confirm"]');
  await B.page.waitForFunction((node) => {
    const r = Saves.exportData().records;
    const slot = r.sakura_letters_saves_v2 && r.sakura_letters_saves_v2.slots.filter(Boolean)[0];
    return slot && slot.nodeId === node;
  }, nodeA, { timeout: 12000 });
  assert.deepEqual(B.errors, []);
  await A.ctx.close(); await B.ctx.close();
});

test("共用设备换账号：不会自动把上一个人的存档传进新账号，由玩家决定", { timeout: 120000 }, async () => {
  const userA = nextUser("oa");
  const userB = nextUser("ob");
  const Bdev = await newDevice();                    // B：已有账号，云端没有存档
  await register(Bdev.page, userB);
  await Bdev.ctx.close();

  // —— 第一段：默认不传，提示存档属于另一个账号 ——
  const S = await newDevice();                       // 共用设备
  const nodeA = await startGame(S.page, 10);
  await register(S.page, userA);
  await setAutoSync(S.page, true);
  await S.page.waitForTimeout(6500);                 // A 的存档自动进入 A 的云端
  assert.equal((await cloudOf(S.page)).cloudSlot0, nodeA, "前置：A 的存档已在 A 的云端");

  await S.page.click('[data-acct-action="logout"]');
  await S.page.waitForSelector('[data-acct-action="logout-keep"]', { timeout: 8000 });
  await S.page.click('[data-acct-action="logout-keep"]');   // 仅退出登录，本机存档保留
  await S.page.waitForSelector('form[data-acct-form="login"]', { timeout: 8000 });
  const afterLogout = await localInfo(S.page);
  assert.equal(afterLogout.filledSlots, 1, "仅退出登录：本机存档保留");

  await login(S.page, userB);                        // 同一台设备换 B 登录
  const textB = await panelText(S.page);
  assert.match(textB, new RegExp(`此浏览器上的存档属于账号 ${userA}`), "应提示本机存档属于另一个账号");
  await S.page.evaluate(() => window.__game.quickSave());   // B 玩家的一次普通存档
  await S.page.waitForTimeout(7000);
  assert.equal((await cloudOf(S.page)).status, 404, "B 的云端不应出现存档（修订前：A 的存档被传了进去）");
  assert.equal((await localInfo(S.page)).owner, userA, "归属标记仍是 A");

  // —— 第二段：玩家选择「留在本机」→ 自动同步关闭，之后也不会传 ——
  await S.page.click('[data-acct-action="owner-keep"]');
  await S.page.waitForTimeout(500);
  assert.equal((await localInfo(S.page)).autosyncFlag, "0", "选择留在本机后自动同步应关闭");
  await S.page.evaluate(() => window.__game.quickSave());
  await S.page.waitForTimeout(6500);
  assert.equal((await cloudOf(S.page)).status, 404, "关闭自动同步后更不应上传");

  // —— 第三段：玩家明确选择「上传到当前账号」→ 才上传 ——
  await setAutoSync(S.page, true);                   // 此时归属已解决，重新开启即恢复普通自动同步
  await S.page.waitForTimeout(7000);
  const adopted = await cloudOf(S.page);
  assert.equal(adopted.cloudSlot0, nodeA, "玩家明确同意后，存档才进入 B 的云端");
  assert.equal((await localInfo(S.page)).owner, userB, "归属标记改为 B");
  assert.deepEqual(S.errors, []);
  await S.ctx.close();
});

test("清空本地后重新开局：不会覆盖云端存档，自动同步暂停并说明原因", { timeout: 90000 }, async () => {
  const D = await newDevice();
  await startGame(D.page, 10);
  await register(D.page, nextUser("c"));
  await setAutoSync(D.page, true);
  await D.page.waitForTimeout(6500);                 // 本地进度进入云端
  const before = await cloudOf(D.page);
  assert.equal(before.cloudSlots, 1, "前置：云端应有一份存档");

  D.page.on("dialog", (d) => d.accept());            // 确认「清空」弹窗
  await D.page.evaluate(() => document.getElementById("cfg-clear").click());
  await D.page.waitForTimeout(600);
  assert.equal((await localInfo(D.page)).filledSlots, 0, "前置：本机已清空");

  await D.page.evaluate(() => window.__game.backToTitle());
  await D.page.waitForTimeout(500);
  await startGame(D.page, 3, false);                 // 重新开局，只靠自动进度
  await D.page.waitForTimeout(7500);
  const after = await cloudOf(D.page);
  assert.equal(after.revision, before.revision, "云端修订号不应变化（修订前：空状态被推上云端）");
  assert.equal(after.cloudSlots, 1, "云端的存档槽应原样保留");

  await openAccount(D.page);
  const text = await panelText(D.page);
  assert.match(text, /本地存档已清空，自动同步已暂停/, "应说明自动同步为何暂停");
  assert.match(text, /从云端恢复/, "应给出找回原进度的入口");
  assert.deepEqual(D.errors, []);
  await D.ctx.close();
});

test("退出登录可以一并清除本机存档（公用电脑）", { timeout: 60000 }, async () => {
  const P = await newDevice();
  await startGame(P.page, 8);
  const user = nextUser("l");
  await register(P.page, user);
  await setAutoSync(P.page, true);
  assert.equal((await localInfo(P.page)).owner, user);

  await P.page.click('[data-acct-action="logout"]');
  await P.page.waitForSelector('[data-acct-action="logout-clear"]', { timeout: 8000 });
  await P.page.click('[data-acct-action="logout-clear"]');
  await P.page.waitForFunction(() => !window.__game.state.inGame, null, { timeout: 8000 });   // 回到标题
  await P.page.waitForTimeout(500);
  const info = await localInfo(P.page);
  assert.equal(info.filledSlots, 0, "本机存档应被清除");
  assert.equal(info.owner, null, "归属标记应被清除");
  assert.equal(info.autosyncFlag, null, "自动同步偏好应被清除");
  assert.equal((await P.page.evaluate(() => localStorage.getItem("gayme_cloud_dirty"))), null, "待同步标记应被清除");
  assert.deepEqual(P.errors, []);
  await P.ctx.close();
});

test("历史版本：被替换的云端存档可以恢复到本机，云端不受影响", { timeout: 90000 }, async () => {
  const E = await newDevice();
  const nodeV1 = await startGame(E.page, 10);
  await register(E.page, nextUser("h"));
  await manualUpload(E.page);                        // 云端修订号 1
  const nodeV2 = await startGame(E.page, 6);        // 继续推进并再存一次
  assert.notEqual(nodeV2, nodeV1);
  await manualUpload(E.page);                        // 云端修订号 2（修订号 1 进历史）
  await openAccount(E.page);                         // 确保账号面板是打开的

  const versions = await E.page.evaluate(async () =>
    (await (await fetch("/api/saves/versions", { credentials: "include" })).json()).versions.map((v) => v.revision));
  assert.deepEqual(versions, [1], "云端当前是修订号 2，历史里应只有被替换的修订号 1");
  await E.page.click('[data-acct-action="toggle-history"]');
  await E.page.waitForFunction(() => /修订号 1/.test(document.querySelector("#cfg-account")?.innerText || ""), null, { timeout: 8000 });

  // 把修订号 1 恢复到本机
  await E.page.click('[data-acct-action="restore-version"][data-rev="1"]');
  await E.page.waitForSelector('[data-acct-action="download-confirm"]', { timeout: 8000 });
  await E.page.click('[data-acct-action="download-confirm"]');
  await E.page.waitForFunction((node) => {
    const r = Saves.exportData().records;
    const slot = r.sakura_letters_saves_v2 && r.sakura_letters_saves_v2.slots.filter(Boolean)[0];
    return slot && slot.nodeId === node;
  }, nodeV1, { timeout: 12000 });
  assert.equal((await cloudOf(E.page)).revision, 2, "恢复历史版本到本机，云端仍是最新一版");

  await E.page.waitForTimeout(600);
  await openAccount(E.page);
  const text = await panelText(E.page);
  assert.match(text, /已把历史版本 rev 1 恢复到本机，自动同步已暂停/, "恢复旧版本后应暂停自动同步并说明");
  assert.deepEqual(E.errors, []);
  await E.ctx.close();
});

test("自动同步：没有变化不上传；撞到限流时界面必须提示（修订前：静默失效）", { timeout: 120000 }, async () => {
  const C = await newDevice();
  await startGame(C.page, 10);
  await register(C.page, nextUser("r"));
  const puts = [];
  C.page.on("response", (r) => { if (r.request().method() === "PUT" && r.url().includes("/api/saves")) puts.push(r.status()); });
  // 最小上传间隔调到 0：本用例要连续上传去撞限流（间隔规则由下一个用例单独验证）
  await C.page.evaluate(() => window.AccountUI._tune({ minUploadIntervalMs: 0 }));

  await setAutoSync(C.page, true);
  await C.page.waitForTimeout(6200);                 // 勾选后 5 秒防抖 → 第 1 次上传
  assert.deepEqual(puts, [200], "开启自动同步后应上传一次");

  // 没有新变化：等下去也不应再上传
  await C.page.waitForTimeout(6000);
  assert.equal(puts.length, 1, "本机存档没有变化时不应重复上传");

  // 有变化 → 第 2 次上传
  await C.page.evaluate(() => window.__game.quickSave());
  await C.page.waitForTimeout(5600);
  assert.deepEqual(puts, [200, 200]);

  // 页面转入后台：不等 5 秒防抖，立即上传（第 3 次）
  await C.page.evaluate(() => window.__game.quickSave());
  await C.page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });
  await C.page.waitForTimeout(1500);
  assert.deepEqual(puts, [200, 200, 200], "页面转入后台后应立即上传，不等 5 秒");

  // 第 4 次：超过每账号 3 次 / 15 分钟的上限 → 被拒，界面必须提示
  await C.page.evaluate(() => window.__game.quickSave());
  await C.page.waitForTimeout(5600);
  assert.deepEqual(puts, [200, 200, 200, 429], "第 4 次上传应被限流拒绝");
  const st = await C.page.evaluate(() => ({
    error: window.AccountUI.state.autoError,
    warns: [...document.querySelectorAll("#cfg-account .acct-note.warn")].map((e) => e.textContent),
  }));
  assert.equal(st.error && st.error.code, "rate_limited", "失败原因应记录为限流");
  assert.ok(st.warns.some((t) => /自动同步失败：操作太频繁/.test(t)),
    "面板上应显示自动同步失败及原因（修订前：没有任何提示）；实际警示行：" + JSON.stringify(st.warns));
  assert.deepEqual(C.errors, []);
  await C.ctx.close();
});

test("自动同步：两次上传之间至少间隔 60 秒（默认节奏）", { timeout: 60000 }, async () => {
  const F = await newDevice();
  await startGame(F.page, 10);
  await register(F.page, nextUser("p"));
  const puts = [];
  F.page.on("response", (r) => { if (r.request().method() === "PUT" && r.url().includes("/api/saves")) puts.push(r.status()); });
  await setAutoSync(F.page, true);
  await F.page.waitForTimeout(6200);                 // 第 1 次上传
  assert.deepEqual(puts, [200]);
  await F.page.evaluate(() => window.__game.quickSave());
  await F.page.waitForTimeout(7000);                 // 超过 5 秒防抖，但远不到 60 秒间隔
  assert.equal(puts.length, 1, "间隔未到 60 秒时不应再次上传");
  assert.equal((await F.page.evaluate(() => localStorage.getItem("gayme_cloud_dirty"))), "1", "变化应保留为待同步");
  await F.ctx.close();
});
