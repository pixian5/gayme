/* 离线端到端 e2e（商业级验收 · v3.4.44 新增）
   目标：真实验证「断网可玩」全链路——SW 预缓存接管启动 + 页面侧媒体缓存离线供图。
   与 defects.e2e 第 10 项的区别：那项在测试环境 SW 接管时序不稳会跳过；
   本套件用更长等待 + 主动 reload 循环确保接管，再断网走完整验证，不允许跳过。
   运行：npm run test:offline */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE_URL = process.env.BASE_URL || null;
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
let PORT = 41811;
for (let i = 0; i < 6; i++) {
  try { await new Promise((res, rej) => { server.once("error", rej); server.listen(PORT + i, res); }); PORT += i; break; }
  catch (e) { if (e.code !== "EADDRINUSE" || i === 5) throw e; }
}
const URL = BASE_URL || `http://127.0.0.1:${PORT}`;

const { chromium } = await import("playwright");

test("离线端到端（SW + 媒体缓存）", async () => {
  const browser = await chromium.launch({ args: [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
  ] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });   // 不屏蔽 SW
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push("pageerror: " + e.message));
  try {
    /* ---------- 阶段一：在线装 SW，直至接管（不放弃） ---------- */
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: "domcontentloaded", ...(BASE_URL ? { timeout: 90000 } : {}) });
    let controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
    for (let i = 0; i < 8 && !controlled; i++) {
      await page.waitForTimeout(1500);
      controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
      if (!controlled) await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    }
    if (!controlled) {
      // 最后手段：手动注册并等待 activated（本套件语义是「必须验证」，不设跳过分支）
      await page.evaluate(async () => {
        await navigator.serviceWorker.register("sw.js");
        await navigator.serviceWorker.ready;
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
    }
    console.log("SW_TAKEOVER_MS", Date.now() - t0);
    assert.ok(controlled, "SW 始终未接管——本用例不允许跳过，需人工排查测试环境");

    /* ---------- 阶段二：在线预热媒体缓存（CG + 立绘 + BGM 各一） ---------- */
    await page.waitForFunction("() => typeof Saves !== 'undefined' && !!window.__game && !!window.MediaCache");
    const warmed = await page.evaluate(async () => {
      const items = ["assets/cg/cg_meet_shiyu.webp", "assets/portraits/shiyu.webp", "audio/bgm/calm.ogg"];
      const rs = await Promise.all(items.map((p) => MediaCache.put(p)));
      return { rs, size: await MediaCache.size() };
    });
    assert.ok(warmed.rs.every(Boolean), "媒体预热失败: " + JSON.stringify(warmed));
    await page.evaluate(() => {
      Saves.updateSetting("bgm", false);
      Saves.updateSetting("sfxVolume", 0);
      Saves.unlockCG("cg_meet_shiyu");
    });

    /* ---------- 阶段三：断网重启，验证全链路 ---------- */
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction("() => typeof SCRIPT !== 'undefined' && !!window.__game && !!document.getElementById('title-screen')", null, { timeout: 15000 });
    const boot = await page.evaluate(() => ({
      controlled: !!navigator.serviceWorker?.controller,
      version: document.querySelector(".title-version")?.textContent,
    }));

    // 开新游戏 → 立绘走缓存 blob 或 SVG 兜底（离线都不允许空白）
    await page.evaluate(() => document.querySelector('#title-screen button[data-action="new"]')?.click());
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("#tutorial-layer button")?.click());
    await page.waitForTimeout(1200);
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const dlg = document.getElementById("dialog-box");
        if (dlg && !dlg.classList.contains("hidden")) { dlg.click(); setTimeout(() => dlg.click(), 90); }
      });
      await page.waitForTimeout(240);
    }
    await page.waitForTimeout(800);
    const portrait = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("#char-layer img")];
      const svg = [...document.querySelectorAll("#char-layer svg")];
      return {
        imgOk: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        imgTotal: imgs.length,
        svgCount: svg.length,
      };
    });

    // CG 查看器：离线打开已解锁 CG，位图应从媒体缓存 blob 加载
    const cg = await page.evaluate(async () => {
      window.__game.openCgViewer?.("cg_meet_shiyu");
      await new Promise((r) => setTimeout(r, 1500));
      const img = document.querySelector(".cg-viewer-art img");
      if (!img) return { has: false };
      return { has: true, complete: img.complete, w: img.naturalWidth, src: img.src.slice(0, 5) };
    });

    // 媒体缓存在离线状态仍可读（Cache API 不依赖网络）
    const mc = await page.evaluate(async () => ({
      size: await MediaCache.size(),
      blob: await MediaCache.cachedUrl("assets/cg/cg_meet_shiyu.webp"),
    }));

    await ctx.setOffline(false);
    const pass = boot.controlled && portrait.imgOk + portrait.svgCount > 0
      && (!cg.has || (cg.complete && cg.w > 0)) && mc.size >= 3 && !!mc.blob;
    console.log(JSON.stringify({ boot, portrait, cg, mc, pageErrors }, null, 1));
    assert.ok(pass, "离线链路验证失败（见上方明细）");
    console.log("离线端到端：通过（SW 启动 / 立绘 / CG blob / 缓存可读）");
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
    server.closeAllConnections?.();
  }
});
