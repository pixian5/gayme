/* 持久化完整性 e2e（商业级验收 · v3.4.44 新增）
   覆盖：自动进度防刷新 / 手动存读档往返 / 多槽位独立性 / 数值随档恢复 /
        导出导入 roundtrip / 损坏存档防御 / 跨标签写冲突 / 快存快捷键。
   运行：npm run test:persistence（串行，单浏览器共享服务） */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".webp": "image/webp", ".ogg": "audio/ogg" };
const server = createServer(async (req, res) => {
  const p = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const data = await readFile(join(ROOT, decodeURIComponent(p)));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("nf"); }
});
let PORT = 41801;
for (let i = 0; i < 6; i++) {
  try { await new Promise((res, rej) => { server.once("error", rej); server.listen(PORT + i, res); }); PORT += i; break; }
  catch (e) { if (e.code !== "EADDRINUSE" || i === 5) throw e; }
}
const URL = `http://127.0.0.1:${PORT}`;

const { chromium } = await import("playwright");
let browser = null;
const errors = [];

test.after(async () => {
  try { await browser?.close(); } catch {}
  await new Promise((r) => server.close(r));
  server.closeAllConnections?.();
});

test.before(async () => {
  browser = await chromium.launch({ args: [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
  ] });
});

/* 每个用例新开干净上下文（独立 localStorage），返回 page */
async function freshPage(extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...extra });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Navigated away")) pageErrors.push("console: " + m.text); });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof SCRIPT !== 'undefined' && typeof Saves !== 'undefined' && !!window.__game);
  await page.evaluate(() => {
    Saves.updateSetting("bgm", false);
    Saves.updateSetting("sfxVolume", 0);
  });
  return { ctx, page, pageErrors };
}

/* 点对话框推进 n 个节点（跳字+前进两次点击算一步） */
async function advance(page, n) {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => {
      const dlg = document.getElementById("dialog-box");
      if (dlg && !dlg.classList.contains("hidden")) { dlg.click(); setTimeout(() => dlg.click(), 100); }
    });
    await page.waitForTimeout(260);
  }
}

test("持久化完整性（串行）", async () => {
  const R = [];
  const ok = (name, pass, detail) => R.push({ name, pass, detail });

  /* ---------- 1 自动进度：刷新不丢 ---------- */
  {
    const { ctx, page, pageErrors } = await freshPage();
    await page.evaluate(() => { document.querySelector('#title-screen button[data-action="new"]')?.click(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 14);
    const before = await page.evaluate(() => ({
      node: window.__game.state.currentNode,
      day: window.__game.state.currentDay ?? null,
    }));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.__game !== 'undefined');
    await page.waitForTimeout(600);
    const canContinue = await page.evaluate(() => !!document.querySelector('#title-screen button[data-action="continue"]'));
    await page.evaluate(() => document.querySelector('#title-screen button[data-action="continue"]')?.click());
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ node: window.__game.state.currentNode }));
    ok("自动进度防刷新", canContinue && after.node === before.node, { before, after, canContinue, pageErrors });
    await ctx.close();
  }

  /* ---------- 2 手动存档→推进→读档回滚 ---------- */
  {
    const { ctx, page } = await freshPage();
    await page.evaluate(() => { document.querySelector('#title-screen button[data-action="new"]')?.click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 12);
    const savedAt = await page.evaluate(() => {
      window.__game.quickSave();            // 槽位 1 快存
      return window.__game.state.currentNode;
    });
    await advance(page, 12);
    const drifted = await page.evaluate(() => window.__game.state.currentNode);
    const rolledBack = await page.evaluate(() => {
      window.__game.loadFromSlot(0);        // 读槽位 1
      return window.__game.state.currentNode;
    });
    ok("手动存读档往返（读档回滚）", savedAt === rolledBack && drifted !== savedAt, { savedAt, drifted, rolledBack });
    await ctx.close();
  }

  /* ---------- 3 多槽位独立性 + 元数据 ---------- */
  {
    const { ctx, page } = await freshPage();
    await page.evaluate(() => { document.querySelector('#title-screen button[data-action="new"]')?.click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 8);
    const nodeA = await page.evaluate(() => { window.__game.saveToSlot(2); Saves.renameSave(2, "槽三存档"); return window.__game.state.currentNode; });
    await advance(page, 10);
    const nodeB = await page.evaluate(() => { window.__game.saveToSlot(4); return window.__game.state.currentNode; });
    const meta = await page.evaluate(() => ({
      s3: Saves.load(2) ? { name: Saves.load(2).name, node: Saves.load(2).nodeId } : null,
      s5: Saves.load(4) ? { name: Saves.load(4).name, node: Saves.load(4).nodeId } : null,
    }));
    const loadS3 = await page.evaluate(() => { window.__game.loadFromSlot(2); return window.__game.state.currentNode; });
    ok("多槽位独立与元数据", nodeA !== nodeB && meta.s3?.name === "槽三存档" && meta.s3?.node === nodeA
        && meta.s5?.node === nodeB && loadS3 === nodeA, { nodeA, nodeB, meta, loadS3 });
    await ctx.close();
  }

  /* ---------- 4 数值/旗标随档恢复 ---------- */
  {
    const { ctx, page } = await freshPage();
    const prep = await page.evaluate(() => {
      document.querySelector('#title-screen button[data-action="new"]')?.click();
      return true;
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 16);
    // 模拟一周目结束后的旗标（结局/循环计数走 Saves 层）
    const before = await page.evaluate(() => {
      Saves.unlockEnding("sy_ending_good");
      Saves.setFlag("loopCount", 2);
      Saves.setFlag("playCount", 1);
      Saves.unlockKeyword("学姐");
      window.__game.quickSave();
      return {
        loopCount: Saves.getFlag("loopCount", 0), playCount: Saves.getFlag("playCount", 0),
        keyword: Saves.isKeywordUnlocked("学姐"), ending: Saves.isEndingUnlocked("sy_ending_good"),
      };
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof Saves !== 'undefined');
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      loopCount: Saves.getFlag("loopCount", 0), playCount: Saves.getFlag("playCount", 0),
      keyword: Saves.isKeywordUnlocked("学姐"), ending: Saves.isEndingUnlocked("sy_ending_good"),
    }));
    ok("结局/关键词/循环旗标跨刷新恢复", JSON.stringify(before) === JSON.stringify(after), { before, after });
    await ctx.close();
  }

  /* ---------- 5 导出→清库→导入 roundtrip ---------- */
  {
    const { ctx, page } = await freshPage();
    await page.evaluate(() => { document.querySelector('#title-screen button[data-action="new"]')?.click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 10);
    const exported = await page.evaluate(() => {
      Saves.unlockEnding("sy_ending_good");
      Saves.unlockKeyword("学姐");
      window.__game.quickSave();
      return Saves.exportData();
    });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof Saves !== 'undefined');
    await page.waitForTimeout(500);
    const wiped = await page.evaluate(() => ({ slots: Saves.load(0), ending: Saves.isEndingUnlocked("sy_ending_good") }));
    const imported = await page.evaluate((payload) => Saves.importData(payload), exported);
    const restored = await page.evaluate(() => ({
      slot: Saves.load(0) ? Saves.load(0).nodeId : null,
      ending: Saves.isEndingUnlocked("sy_ending_good"),
      keyword: Saves.isKeywordUnlocked("学姐"),
    }));
    ok("导出→清库→导入 roundtrip",
       imported && !wiped.slots && !wiped.ending && restored.slot === exported.currentSession?.nodeId && restored.ending && restored.keyword,
       { imported, wiped, restored, hasSession: !!exported.currentSession });
    await ctx.close();
  }

  /* ---------- 6 损坏存档防御 ---------- */
  {
    const { ctx, page, pageErrors } = await freshPage();
    // 预置垃圾数据进关键键，再刷新——游戏应正常起、标题可点、零页面错误
    await page.evaluate(() => {
      // 键名以 saves.js 实际常量为准（_v2 后缀）
      localStorage.setItem("sakura_letters_saves_v2", "{corrupted!!!");
      localStorage.setItem("sakura_letters_endings_v2", "[1,2,{bad");
      localStorage.setItem("sakura_letters_settings_v2", "not-json");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.__game !== 'undefined' && !!document.getElementById('title-screen'));
    await page.waitForTimeout(700);
    const titleUsable = await page.evaluate(() => !!document.querySelector('#title-screen button[data-action="new"]'));
    await page.evaluate(() => document.querySelector('#title-screen button[data-action="new"]')?.click());
    await page.waitForTimeout(700);
    const inGame = await page.evaluate(() => window.__game.state.inGame);
    ok("损坏存档防御（可启动可开局）", titleUsable && inGame && pageErrors.length === 0, { titleUsable, inGame, pageErrors });
    await ctx.close();
  }

  /* ---------- 7 跨标签写冲突（v3.4.39 修复的行为级验证） ---------- */
  {
    const { ctx, page } = await freshPage();
    const page2 = await ctx.newPage();
    await page2.goto(URL, { waitUntil: "domcontentloaded" });
    await page2.waitForFunction(() => typeof Saves !== 'undefined' && !!window.__game);
    await page2.evaluate(() => document.querySelector('#title-screen button[data-action="new"]')?.click());
    await page2.waitForTimeout(600);
    await page2.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page2, 3);
    await page.evaluate(() => {
      document.querySelector('#title-screen button[data-action="new"]')?.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 8);
    // A 标签写槽 1
    const nodeA = await page.evaluate(() => {
      window.__game.saveToSlot(0);
      return window.__game.state.currentNode;
    });
    // B 标签（旧内存）写槽 2——不得覆盖槽 1
    const nodeB = await page2.evaluate(() => {
      const snap = window.__game.snapshot();
      Saves.save(1, snap);
      return snap.nodeId;
    });
    const slot1 = await page2.evaluate(() => (Saves.load(0) ? Saves.load(0).nodeId : null));
    ok("跨标签写不互相覆盖", slot1 === nodeA && nodeB !== null, { nodeA, nodeB, slot1 });
    await ctx.close();
  }

  /* ---------- 8 快存快捷键 S ---------- */
  {
    const { ctx, page } = await freshPage();
    await page.evaluate(() => { document.querySelector('#title-screen button[data-action="new"]')?.click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await advance(page, 6);
    const target = await page.evaluate(() => window.__game.state.currentNode);
    await page.keyboard.press("s");
    await page.waitForTimeout(400);
    // 快存写的是槽位 1（slot 0）：按键后立即验证槽内容，证明绑定生效
    const quickSlot = await page.evaluate(() => (Saves.load(0) ? Saves.load(0).nodeId : null));
    await advance(page, 8);
    const drifted = await page.evaluate(() => window.__game.state.currentNode);
    // 读快存槽应回滚到按键时刻（「继续游戏」按钮走自动档属于设计行为，另测）
    const rolledBack = await page.evaluate(() => { window.__game.loadFromSlot(0); return window.__game.state.currentNode; });
    ok("快捷键 S 快存与读槽回滚", quickSlot === target && rolledBack === target && drifted !== target,
       { target, quickSlot, drifted, rolledBack });
    await ctx.close();
  }

  /* ---------- 汇总 ---------- */
  console.log(JSON.stringify(R, null, 1));
  const failed = R.filter((r) => !r.pass);
  console.log(`持久化：通过 ${R.length - failed.length} / ${R.length}`);
  assert.equal(failed.length, 0, `失败 ${failed.length} 项：${JSON.stringify(failed)}`);
});
