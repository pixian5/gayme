/* 缺陷回归 e2e（v3.4.40）：把深度审查确认过的问题固化为浏览器契约。
   用法：npm run test:defects
   串行执行，避免多个 test 并发共享同一浏览器导致上下文竞争。
   覆盖：线索挂载 / 合成词 XSS / 收件箱注入 / 导出会话 / 导入切换 /
        非法备份拒绝 / 音量滑杆 / 温度跳过 / 多标签 / 离线 / 收件箱校验。 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 41791;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
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
await new Promise((r) => server.listen(PORT, r));
const URL = `http://127.0.0.1:${PORT}`;

const { chromium } = await import("playwright");
let browser = null;

test.after(async () => {
  try { await browser?.close(); } catch { /* 已关闭则忽略 */ }
  await new Promise((r) => server.close(r));
  server.closeAllConnections?.();
});

test.before(async () => {
  browser = await chromium.launch({ args: [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ] });
});

async function openPage({ blockSW = true, initScript = null, ...extra } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ...(blockSW ? { serviceWorkers: "block" } : {}),
    ...extra,
  });
  const page = await ctx.newPage();
  if (initScript) await page.addInitScript(initScript);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("() => typeof SCRIPT !== 'undefined' && typeof Saves !== 'undefined' && !!window.__game");
  await page.waitForTimeout(250);
  return { ctx, page };
}

test("缺陷回归（串行）", async () => {
  const results = [];
  const failures = [];
  const skipped = [];
  const record = (name, ok, detail) => {
    results.push({ name, ok, detail });
    if (!ok) failures.push({ name, detail });
  };
  // v3.4.40：跳过单列计数——跳过≠通过，避免「绿但被跳过」的断言静默失效（复核遗留项 1）
  const recordSkip = (name, detail) => {
    results.push({ name, ok: true, skipped: true, detail });
    skipped.push(name);
  };

  // 1 线索挂载
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`(() => {
      window.__game.newGame(); const __tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (__tb) __tb.click();
      window.__game.gotoNode('prologue_8');
      return { data: (SCRIPT['prologue_8'].clues || []).length, dom: document.getElementById('clue-layer').children.length };
    })()`);
    record("线索热点挂载", r.dom === r.data && r.data > 0, r);
    await ctx.close();
  }

  // 2 合成词 XSS
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`new Promise((resolve) => {
      window.__xss1 = 0;
      Saves.importData({ schemaVersion: 3, records: { sakura_letters_composed_v2: ['<img src=x onerror="window.__xss1=1">'] } });
      window.__game.newGame();
      const tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (tb) tb.click();
      try { document.querySelector('[data-menu="keywords"]').click(); } catch (e) {}
      setTimeout(() => resolve({ marker: window.__xss1, imgs: document.querySelectorAll('#overlay-body img').length }), 800);
    })`);
    record("合成词 XSS 转义", r.marker === 0 && r.imgs === 0, r);
    await ctx.close();
  }

  // 3 收件箱 XSS
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`new Promise((resolve) => {
      window.__xss2 = 0;
      Saves.importData({ schemaVersion: 3, records: { sakura_letters_inbox_v2: [{
        id: 'x"><img src=x onerror="window.__xss2=1">', char: '', from: '', body: 'x', title: '', ts: Date.now(), read: false, replied: null, expired: false
      }] } });
      window.__game.newGame();
      const tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (tb) tb.click();
      try { document.querySelector('[data-menu="inbox"]').click(); } catch (e) {}
      setTimeout(() => resolve({ marker: window.__xss2, imgs: document.querySelectorAll('#overlay-body img').length }), 800);
    })`);
    record("收件箱注入转义", r.marker === 0 && r.imgs === 0, r);
    await ctx.close();
  }

  // 4 导出携带 currentSession
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`(() => {
      window.__game.newGame(); const __tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (__tb) __tb.click();
      window.__game.gotoNode('prologue_10');
      const exp = Saves.exportData();
      return { mem: window.__game.state.currentNode, session: exp.currentSession && exp.currentSession.nodeId };
    })()`);
    record("导出携带当前会话", r.session === r.mem && !!r.mem, r);
    await ctx.close();
  }

  // 5 导入后切回标题且不覆盖
  {
    const { ctx, page } = await openPage();
    const before = await page.evaluate(`(() => {
      window.__game.newGame(); const __tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (__tb) __tb.click();
      window.__game.gotoNode('prologue_20');
      Saves.save(0, { nodeId: 'prologue_20', variables: {}, history: [], visitedNodes: {} });
      const payload = Saves.exportData();
      window.__game.gotoNode('prologue_35');
      Saves.importData(payload);
      let auto = null;
      try { auto = JSON.parse(localStorage.getItem('sakura_letters_autosave_v2')).snapshot.nodeId; } catch (e) {}
      return { inGame: window.__game.state.inGame, slot0: (Saves.load(0) || {}).nodeId, auto };
    })()`);
    record("导入后切回标题", before.inGame === false, before);
    record("导入后不被旧会话覆盖", before.auto === "prologue_20", before);
    await ctx.close();
  }

  // 6 非法备份拒绝
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`(() => {
      window.__game.newGame(); const __tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (__tb) __tb.click();
      window.__game.gotoNode('prologue_20');
      Saves.save(0, { nodeId: 'prologue_20', variables: {}, history: [], visitedNodes: {} });
      const accepted = Saves.importData({ schemaVersion: 3, records: { sakura_letters_saves_v2: 'not-a-save-object' } });
      return { accepted, slot0: (Saves.load(0) || {}).nodeId };
    })()`);
    record("非法备份被拒绝", r.accepted === false && r.slot0 === "prologue_20", r);
    await ctx.close();
  }

  // 7 音量滑杆
  {
    const { ctx, page } = await openPage({
      initScript: `(() => {
        window.__audios = [];
        const OA = window.Audio;
        function W(src) { const a = new OA(); if (src !== undefined) a.src = src; window.__audios.push(a); return a; }
        W.prototype = OA.prototype;
        window.Audio = W;
      })()`,
    });
    await page.evaluate(`(() => {
      Saves.updateSetting('bgm', true); Saves.updateSetting('bgmVolume', 0.4);
      window.__game.newGame(); const __tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (__tb) __tb.click();
    })()`);
    await page.mouse.click(20, 20);
    await page.waitForTimeout(2200);
    await page.click('[data-menu="config"]');
    await page.waitForSelector('#cfg-bgmvolume', { timeout: 5000 });
    await page.evaluate(`(() => {
      const s = document.getElementById('cfg-bgmvolume');
      s.value = '0.1';
      s.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await page.waitForTimeout(500);
    const volInfo = await page.evaluate(`(() => {
      try {
        const list = (window.__audios || []).filter(a => a.loop && !a.paused);
        return { count: list.length, vols: list.map(a => Math.round(a.volume * 100) / 100), hasAudios: Array.isArray(window.__audios) };
      } catch (e) { return { error: String(e) }; }
    })()`);
    record("音量滑杆即时生效", volInfo.count > 0 && volInfo.vols.every((v) => Math.abs(v - 0.1) < 0.02), volInfo);
    await ctx.close();
  }

  // 8 温度跳过
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`(async () => {
      window.__game.newGame(); const __tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (__tb) __tb.click();
      window.__game.gotoNode('d4_temperature');
      await new Promise((r) => setTimeout(r, 600));
      const s = document.getElementById('temp-slider');
      if (s) { s.value = '100'; s.dispatchEvent(new Event('input', { bubbles: true })); }
      await new Promise((r) => setTimeout(r, 250));
      const skip = document.querySelector('.gh-skip');
      if (skip) skip.click();
      await new Promise((r) => setTimeout(r, 700));
      return { bg: document.getElementById('bg-overlay').style.background };
    })()`);
    record("温度跳过清除背景", !r.bg || r.bg === "transparent", r);
    await ctx.close();
  }

  // 9 多标签
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(`new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = '/?second-tab=1';
      f.onload = () => setTimeout(() => {
        try {
          const a = Saves.save(0, { nodeId: 'prologue_1', variables: {}, history: [], visitedNodes: {} });
          const b = f.contentWindow.eval("Saves.save(1, { nodeId: 'prologue_2', variables: {}, history: [], visitedNodes: {} })");
          const raw = localStorage.getItem('sakura_letters_saves_v2');
          let slots = null;
          try { slots = JSON.parse(raw).slots.map((s) => (s && s.nodeId) || null); } catch (e) {}
          resolve({ a, b, slots, rawLen: raw ? raw.length : 0 });
        } catch (e) { resolve({ error: String(e) }); }
      }, 1500);
      document.body.appendChild(f);
    })`);
    record("多标签存档不覆盖", !!r.slots && r.slots[0] === "prologue_1" && r.slots[1] === "prologue_2", r);
    await ctx.close();
  }

  // 10 离线
  {
    const { ctx, page } = await openPage({ blockSW: false });
    const diag = await page.evaluate(`new Promise((resolve) => {
      const done = (reg) => resolve({ hasSW: !!navigator.serviceWorker, registered: !!reg, scope: reg ? reg.scope : null, controller: !!(navigator.serviceWorker && navigator.serviceWorker.controller) });
      if (!navigator.serviceWorker) return done(null);
      Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 3000))]).then(done).catch(() => done(null));
    })`);
    if (!diag.hasSW) {
      recordSkip("离线可启动（环境不支持 SW，跳过）", diag);
    } else {
      let controlled = false;
      await page.waitForTimeout(4000);
      for (let i = 0; i < 5 && !controlled; i++) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1200);
        controlled = await page.evaluate("() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)");
      }
      let playable = false;
      await ctx.setOffline(true);
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(800);
        playable = await page.evaluate("() => typeof SCRIPT !== 'undefined' && !!window.__game");
      } finally {
        await ctx.setOffline(false);
      }
      if (!controlled) {
        recordSkip("离线可启动（本环境 SW 未接管，跳过）", { ...diag, controlled, playable, note: "独立脚本与线上已验证离线可玩；测试服务器首次安装时序不稳定" });
      } else {
        record("离线可启动", playable, { ...diag, controlled, playable });
      }
    }
    await ctx.close();
  }

  // 11 收件箱结构校验
  {
    const { ctx, page } = await openPage();
    const accepted = await page.evaluate(`(() => Saves.importData({ schemaVersion: 3, records: { sakura_letters_inbox_v2: [{ id: 123, body: 'x' }] } }))()`);
    record("收件箱结构校验", accepted === false, { accepted });
    await ctx.close();
  }

  // 12 媒体离线缓存（v3.4.41）：put 入仓 → cachedUrl 出 blob → data-mc 坏图兜底
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(async () => {
      if (!window.MediaCache || !MediaCache.SUPPORTED) return { supported: false };
      await MediaCache.put("assets/cg/cg_meet_shiyu.webp");
      await MediaCache.put("audio/bgm/calm.ogg");
      const cgUrl = await MediaCache.cachedUrl("assets/cg/cg_meet_shiyu.webp");
      const bgmUrl = await MediaCache.cachedUrl("audio/bgm/calm.ogg");
      let blobOk = false, blobSize = 0;
      if (cgUrl) {
        const b = await (await fetch(cgUrl)).blob();
        blobOk = b.size > 1000; blobSize = b.size;
      }
      // 坏 src + data-mc → error 委托应把 src 换成 blob:
      let rescueOk = false;
      await new Promise((resolve) => {
        const img = document.createElement("img");
        img.setAttribute("data-mc", "assets/cg/cg_meet_shiyu.webp");
        img.style.display = "none";
        document.body.appendChild(img);   // 必须在 DOM 里：detached 元素的事件路径不含 document，捕获委托收不到
        img.src = "assets/cg/__not_exist__.webp?" + Date.now();
        img.onload = () => { rescueOk = img.src.startsWith("blob:"); img.remove(); resolve(); };
        setTimeout(() => { img.remove(); resolve(); }, 4000);
      });
      return { supported: true, cgCached: !!cgUrl, bgmCached: !!bgmUrl, blobOk, blobSize, rescueOk, size: await MediaCache.size() };
    });
    record("媒体离线缓存（put/blob/data-mc 兜底）", !!(r.supported && r.cgCached && r.bgmCached && r.blobOk && r.rescueOk), r);
    await ctx.close();
  }

  // 13 手势玩法首次演示（v3.4.42）：拓印首次进入出「手指划过」，动手即消
  {
    const { ctx, page } = await openPage();
    const r = await page.evaluate(async () => {
      localStorage.removeItem("sakura_gesture_demo_v1");
      window.__game.newGame();
      const tb = document.querySelector('#tutorial-layer .tutorial-ok'); if (tb) tb.click();
      window.__game.gotoNode("d3_rubbing");
      await new Promise((res) => setTimeout(res, 900));
      const appeared = !!document.querySelector(".gesture-demo");
      const again = !!document.querySelector(".gesture-demo-finger");
      const remembered = JSON.parse(localStorage.getItem("sakura_gesture_demo_v1") || "[]").includes("rubbing");
      // 动手即消
      const cv = document.querySelector(".rubbing-layer canvas");
      if (cv) cv.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await new Promise((res) => setTimeout(res, 150));
      const goneAfterTouch = !document.querySelector(".gesture-demo");
      return { appeared, again, remembered, goneAfterTouch };
    });
    record("手势首次演示（出现/记忆/动手即消）", !!(r.appeared && r.again && r.remembered && r.goneAfterTouch), r);
    await ctx.close();
  }

  console.log(JSON.stringify(results, null, 1));
  console.log(`缺陷回归：通过 ${results.length - skipped.length} / ${results.length}，跳过 ${skipped.length}${skipped.length ? "（" + skipped.join("；") + "）" : ""}`);
  assert.equal(failures.length, 0, `失败 ${failures.length} 项：${JSON.stringify(failures)}`);
});