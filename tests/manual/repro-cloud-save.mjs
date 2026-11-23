/* 云存档缺陷复现 / 修复验收脚本（手动运行，不在 npm test 与各 npm run test:* 之内）
   —— v3.4.54 审查时用它坐实了四条数据丢失 / 串号路径（见 docs/20261124-*账号云存档审查*）。
   修复后重跑：四行结论应全部为「否」，末行应为「复现 0 / 4」。

   S1 新设备登录后只勾选「自动同步」（未点「从云端恢复」）→ 空存档覆盖云端
   S3 共用设备：A 退出登录后本地存档与自动同步标记残留 → B 登录后第一次存档，A 的存档进了 B 的云端
   S4 清空本地后重新开局 → 下一次自动存档把清空后的状态推上云端
   S2 自动同步：每次存档后停顿 ≥5 秒即上传一次整包；30 次 / 15 分钟后被 429 且界面无提示
      （约 3.5 分钟，默认跳过）

   运行环境：随机端口 + 临时 SQLite 的真实账号服务（server/index.mjs），不触碰正式库。
   用法（仓库根目录）：node tests/manual/repro-cloud-save.mjs [--with-rate-limit]
   需要节点能解析 playwright 并已安装 chromium。REPRO_JSON=1 时另打印完整明细。 */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WITH_RATE_LIMIT = process.argv.includes("--with-rate-limit");
const PORT = 19420 + Math.floor(Math.random() * 60);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = await mkdtemp(join(tmpdir(), "gayme-repro-"));
const server = spawn(process.execPath, ["server/index.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    GAYME_ACCOUNT_PORT: String(PORT),
    GAYME_DB_PATH: join(tmpDir, "repro.db"),
    GAYME_LOG_REQUESTS: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});
for (let i = 0; i < 75; i++) {
  try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* 服务尚未监听 */ }
  await new Promise((r) => setTimeout(r, 200));
}

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const out = {};
const stamp = Date.now().toString().slice(-8);
const PASSWORD = "Passw0rd!";

/* ---------- 操作方式与 tests/browser/account.e2e.mjs 一致：全部走真实界面 ---------- */
async function newDevice() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 20000 });
  return { ctx, page };
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
}
async function openAccount(page) {
  await page.evaluate(() => window.__game.openOverlay("config"));
  await page.waitForSelector("#cfg-account .acct-card", { timeout: 8000 });
}
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
}
// 勾选「自动同步」：与真人点击复选框等价（触发 change 事件）
async function tickAutoSync(page) {
  await page.waitForTimeout(300);
  const on = await page.evaluate(() => {
    const box = document.querySelector("[data-acct-auto]");
    if (box && !box.checked) box.click();
    return Boolean(window.AccountUI && window.AccountUI.state.autoSync);
  });
  if (!on) throw new Error("自动同步未能开启");
}
async function cloud(page) {
  return page.evaluate(async () => {
    const r = await fetch("/api/saves/data", { headers: { "X-Requested-With": "gayme-account" }, credentials: "include" });
    return { status: r.status, body: await r.json() };
  });
}
async function localInfo(page) {
  return page.evaluate(() => {
    const r = Saves.exportData().records;
    const slots = r.sakura_letters_saves_v2 ? r.sakura_letters_saves_v2.slots.filter(Boolean) : [];
    return {
      filledSlots: slots.length,
      slot0: slots[0] ? { nodeId: slots[0].nodeId, preview: slots[0].dialogPreview } : null,
      autosaveNode: r.sakura_letters_autosave_v2 ? (r.sakura_letters_autosave_v2.snapshot?.nodeId || null) : null,
      autosyncFlag: localStorage.getItem("gayme_account_autosync"),
    };
  });
}
function summarize(c) {
  const rec = (c.body && c.body.data && c.body.data.records) || {};
  const slots = rec.sakura_letters_saves_v2 ? rec.sakura_letters_saves_v2.slots.filter(Boolean) : [];
  return {
    httpStatus: c.status,
    revision: c.body && c.body.save ? c.body.save.revision : null,
    bytes: c.body && c.body.save ? c.body.save.bytes : null,
    cloudFilledSlots: slots.length,
    cloudSlot0Node: slots[0] ? slots[0].nodeId : null,
    cloudHasAutosave: Boolean(rec.sakura_letters_autosave_v2),
  };
}
const revText = (s) => `rev ${s.revision} / ${s.bytes}B / ${s.cloudFilledSlots} 槽`;

try {
  /* ================= S1 新设备只勾「自动同步」 ================= */
  {
    const A = await newDevice();
    await startGame(A.page, 10);
    await register(A.page, "rp1a" + stamp);
    await A.page.click('[data-acct-action="upload"]');
    await A.page.waitForFunction(() => document.querySelector("#cfg-account")?.innerText.includes("已上传到云端"), null, { timeout: 10000 });
    const cloudBefore = summarize(await cloud(A.page));

    const B = await newDevice();                       // 全新浏览器上下文 = 新设备，本地无存档
    await login(B.page, "rp1a" + stamp);
    const deviceB = await localInfo(B.page);
    const panelBeforeTick = await B.page.evaluate(() => document.querySelector("#cfg-account").innerText.replace(/\s+/g, " "));
    await tickAutoSync(B.page);                        // 玩家只是勾了「自动同步」
    await B.page.waitForTimeout(7500);                 // 5 秒防抖
    const cloudAfter = summarize(await cloud(A.page));
    out.S1 = { deviceBFilledSlots: deviceB.filledSlots, cloudBefore, cloudAfter,
      panelMentionsConflict: /已被其它设备更新|覆盖本机|覆盖云端/.test(panelBeforeTick),
      wiped: cloudBefore.cloudFilledSlots > 0 && cloudAfter.cloudFilledSlots === 0 && !cloudAfter.cloudHasAutosave };
    await A.ctx.close(); await B.ctx.close();
  }

  /* ================= S3 共用设备换账号 ================= */
  {
    const Bdev = await newDevice();                    // B：已有账号，但云端没有存档
    await register(Bdev.page, "rp3b" + stamp);
    await Bdev.ctx.close();

    const S = await newDevice();                       // 共用设备
    await startGame(S.page, 10);
    await register(S.page, "rp3a" + stamp);
    await tickAutoSync(S.page);
    await S.page.waitForTimeout(6500);                 // A 的存档自动进入 A 的云端
    const aLocal = await localInfo(S.page);
    await S.page.click('[data-acct-action="logout"]');
    await S.page.waitForSelector('form[data-acct-form="login"]', { timeout: 8000 });
    const afterLogout = await localInfo(S.page);

    await login(S.page, "rp3b" + stamp);               // 同一台设备换 B 登录
    await S.page.waitForTimeout(2000);
    const bCloudAfterLogin = summarize(await cloud(S.page));
    const bPanel = await S.page.evaluate(() => document.querySelector("#cfg-account").innerText.replace(/\s+/g, " "));
    await S.page.evaluate(() => window.__game.quickSave());   // B 玩家的一次普通存档
    await S.page.waitForTimeout(7000);
    const bCloudAfterSave = summarize(await cloud(S.page));
    out.S3 = { aSlot0Node: aLocal.slot0 && aLocal.slot0.nodeId,
      afterLogout: { filledSlots: afterLogout.filledSlots, autosyncFlag: afterLogout.autosyncFlag },
      bCloudAfterLogin, bCloudAfterSave,
      panelMentionsConflict: /已被其它设备更新|覆盖本机|覆盖云端/.test(bPanel),
      leakedToB: bCloudAfterSave.cloudSlot0Node !== null && bCloudAfterSave.cloudSlot0Node === (aLocal.slot0 && aLocal.slot0.nodeId) };
    await S.ctx.close();
  }

  /* ================= S4 清空本地后重新开局 ================= */
  {
    const D = await newDevice();
    await startGame(D.page, 10);
    await register(D.page, "rp4d" + stamp);
    await tickAutoSync(D.page);
    await D.page.waitForTimeout(6500);                 // 本地进度进入云端
    const cloudBefore = summarize(await cloud(D.page));

    D.page.on("dialog", (d) => d.accept());            // 确认「清空」弹窗
    await D.page.evaluate(() => document.getElementById("cfg-clear").click());
    await D.page.waitForTimeout(600);
    const afterClear = await localInfo(D.page);

    await D.page.evaluate(() => window.__game.backToTitle());
    await D.page.waitForTimeout(500);
    await startGame(D.page, 3, false);                 // 重新开局，只靠自动进度
    await D.page.waitForTimeout(7500);
    const cloudAfter = summarize(await cloud(D.page));
    out.S4 = { cloudBefore, afterClear: { filledSlots: afterClear.filledSlots, autosyncFlag: afterClear.autosyncFlag }, cloudAfter,
      overwritten: cloudBefore.revision !== null && cloudAfter.revision > cloudBefore.revision
        && cloudAfter.cloudSlot0Node !== cloudBefore.cloudSlot0Node };
    await D.ctx.close();
  }

  /* ================= S2 限流后静默失效（可选） ================= */
  if (WITH_RATE_LIMIT) {
    const C = await newDevice();
    await startGame(C.page, 10);
    await register(C.page, "rp2c" + stamp);
    const putStatuses = [];
    C.page.on("response", (r) => { if (r.request().method() === "PUT" && r.url().includes("/api/saves")) putStatuses.push(r.status()); });
    await tickAutoSync(C.page);
    await C.page.waitForTimeout(6200);                 // 勾选即触发首次上传
    for (let i = 0; i < 34; i++) {
      await C.page.evaluate(() => window.__game.quickSave());   // 一次存档写入（与自动进度走同一事件）
      await C.page.waitForTimeout(5400);                          // 停顿 ≥5 秒 → 防抖到期 → 整包上传
    }
    const ui = await C.page.evaluate(() => ({
      message: (document.querySelector("#cfg-account .acct-message")?.textContent || "").trim(),
      messageHidden: document.querySelector("#cfg-account .acct-message")?.hidden,
    }));
    out.S2 = { uploadsOK: putStatuses.filter((s) => s === 200).length,
      uploadsRejected429: putStatuses.filter((s) => s === 429).length,
      uiMessage: ui.message, uiMessageHidden: ui.messageHidden,
      // 限流桶按 IP 计：同一出口 IP 下所有账号共用（本脚本前面的场景也会扣减这里的额度）
      silent: putStatuses.includes(429) && ui.messageHidden };
    await C.ctx.close();
  }
} catch (err) {
  out.error = String(err && err.stack || err);
} finally {
  // 汇总：每条路径是否复现（修复后应全为「否」）
  const rows = [
    ["S1", "新设备勾选自动同步 → 云端被清空", out.S1 && out.S1.wiped, out.S1,
      out.S1 && `云端 ${revText(out.S1.cloudBefore)} → ${revText(out.S1.cloudAfter)}；勾选前有冲突提示: ${out.S1.panelMentionsConflict}`],
    ["S3", "共用设备换账号 → A 的存档进了 B 的云端", out.S3 && out.S3.leakedToB, out.S3,
      out.S3 && `退出后本地 ${out.S3.afterLogout.filledSlots} 槽、自动同步标记 ${out.S3.afterLogout.autosyncFlag}；` +
        `B 云端 ${out.S3.bCloudAfterLogin.httpStatus} → ${revText(out.S3.bCloudAfterSave)}；B 面板有冲突提示: ${out.S3.panelMentionsConflict}`],
    ["S4", "清空本地后新开局 → 原云端存档被覆盖", out.S4 && out.S4.overwritten, out.S4,
      out.S4 && `云端 ${revText(out.S4.cloudBefore)} → ${revText(out.S4.cloudAfter)}；清空后自动同步标记 ${out.S4.afterClear.autosyncFlag}`],
    ["S2", "自动同步撞限流后静默失效", out.S2 ? out.S2.silent : null, out.S2,
      out.S2 ? `成功 ${out.S2.uploadsOK} 次、被拒 ${out.S2.uploadsRejected429} 次；界面提示「${out.S2.uiMessage || "无"}」` : "未运行（加 --with-rate-limit）"],
  ];
  let reproduced = 0;
  for (const [id, title, hit, , detail] of rows) {
    if (hit === true) reproduced += 1;
    console.log(`[${id}] ${title}: ${hit === null ? "跳过" : hit ? "是（缺陷复现）" : "否"}` + (detail ? `  — ${detail}` : ""));
  }
  console.log(`复现 ${reproduced} / 4（修复后应为 0 / 4）` + (out.error ? `\n脚本异常: ${out.error}` : ""));
  if (process.env.REPRO_JSON) console.log("REPRO_RESULT " + JSON.stringify(out, null, 1));
  await browser.close();
  server.kill("SIGTERM");
  await rm(tmpDir, { recursive: true, force: true });
}
