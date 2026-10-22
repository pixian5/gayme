/* 引擎运行时 e2e 测试（v3.2.1）：真实浏览器跑引擎，覆盖静态测试测不到的行为回归。
   用法：
     npm i -D playwright && npx playwright install chromium   # 首次
     npm run test:e2e                 # 默认 chromium
     BROWSER=firefox npm run test:e2e # firefox
   CI：.github/workflows/e2e.yml 自动安装并运行。
   覆盖：页面加载 / 推进链 / 八个玩法模块抽样挂载 / 快存-刷新-读档 / 真结局破环链 / 控制台零错误。 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

// 项目根 = 本文件所在目录的上一级（tests/browser → 项目根）。必须先用 dirname 取目录，
// 直接 join(fileURLToPath(...), "../..") 会把文件名当作路径段参与拼接，得到错误的 tests/。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 41790;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json",
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

const { chromium, firefox } = await import("playwright");
const engineName = process.env.BROWSER === "firefox" ? "firefox" : "chromium";
const engine = engineName === "firefox" ? firefox : chromium;

// 清理兜底：无论测试成败都关闭浏览器与静态服务器，避免 node 进程挂着不退出
let browser = null;
test.after(async () => {
  try { await browser?.close(); } catch { /* 已关闭则忽略 */ }
  await new Promise((r) => server.close(r));
  server.closeAllConnections?.();
});

test.before(async () => {
  let probe;
  try {
    probe = await engine.launch();
    await probe.close();  // 仅探活，避免泄漏浏览器实例
  } catch (e) {
    console.error(`\n缺少浏览器内核：npx playwright install ${engineName}\n`);
    throw e;
  }
});

test(`引擎运行时回归（${engineName}）`, { timeout: 120_000 }, async () => {
  browser = await engine.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`http://localhost:${PORT}/`);
  // Saves 是顶层 const（全局词法绑定，不挂 window 属性），必须用 typeof 判断
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 15000 });
  await page.evaluate(() => {
    Saves.updateSetting("bgm", false);
    Saves.updateSetting("sfxVolume", 0);
  });
  console.log("[e2e] 1/6 页面加载完成");

  // 1) 新游戏 + 连续推进
  await page.evaluate(() => window.__game.newGame());
  for (const nid of ["prologue_8", "d2_noon", "common_day3_morning"]) {
    await page.evaluate((n) => window.__game.gotoNode(n), nid);
  }
  assert.equal(await page.evaluate("window.__game.state.currentNode"), "common_day3_morning");
  console.log("[e2e] 2/6 推进链通过");

  // 2) 八个玩法模块抽样挂载（每文件 1-2 个）
  const samples = {
    afterword: [["postcard", "afterword_postcard"], ["timeline", "afterword_timeline"]],
    senses: [["breath", "d4_breath"], ["timecapsule", "d4_timecapsule"]],
    craft: [["origami", "d6_origami"], ["piano", "d5_piano"]],
    nature: [["astronomy", "d4_astronomy"], ["rain", "d4_rain"]],
    perception: [["tarot", "d3_tarot"], ["puzzle", "d4_puzzle"]],
    mechanism: [["lock", "d6_lock"], ["compass", "d8_compass"]],
    imagery: [["shadow", "d4_shadow"], ["lens", "d9_lens"]],
    direct: [["doodle", "d2_library_doodle"], ["collage", "d4_shiyu_collage"]],
  };
  for (const [file, list] of Object.entries(samples)) {
    for (const [type, nodeId] of list) {
      await page.evaluate((n) => { window.__game.newGame(); window.__game.gotoNode(n); }, nodeId);
      await page.waitForTimeout(120);
      const mounted = await page.evaluate(() =>
        [...document.querySelectorAll("#game [id$='-layer']")]
          .some((e) => !["bg-layer", "char-layer", "clue-layer"].includes(e.id)));
      assert.ok(mounted, `${file} 玩法 ${type}（${nodeId}）浮层未挂载`);
    }
  }
  console.log("[e2e] 3/6 八模块玩法抽样挂载通过");

  // 3) 快存 → 真实刷新 → 继续游戏恢复
  await page.evaluate(() => { window.__game.newGame(); window.__game.gotoNode("d4_puzzle"); });
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));  // 触发自动存档兜底
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.querySelector('#title-screen button[data-action="continue"]').click());
  assert.equal(await page.evaluate("window.__game.state.currentNode"), "d4_puzzle", "刷新后继续游戏未恢复");
  console.log("[e2e] 4/6 快存-刷新-读档通过");

  // 4) 全部浮层面板可开关（UI 拆分后的主要安全网）
  await page.evaluate(() => window.__game.newGame());
  for (const panel of ["save", "load", "config", "history", "gallery", "about", "keywords", "cg", "flowchart"]) {
    await page.evaluate((p) => window.__game.openOverlay(p), panel);
    const open = await page.evaluate(() => !document.getElementById("overlay").classList.contains("hidden"));
    const bodyLen = await page.evaluate(() => document.getElementById("overlay-body").innerHTML.length);
    assert.ok(open && bodyLen > 50, `浮层 ${panel} 未正常渲染`);
    await page.evaluate(() => window.__game.closeOverlay());
  }
  console.log("[e2e] 5/6 浮层面板开关通过");

  // 5) 真结局破环链：伪造三线 GOOD + 合成樱花信 → 第 4 选项 → TRUE ENDING
  await page.evaluate(() => {
    const endings = JSON.parse(localStorage.getItem("sakura_letters_endings_v2") || "{}");
    endings.unlocked = ["shiyu_good", "xiazhi_good", "sunian_good"];
    localStorage.setItem("sakura_letters_endings_v2", JSON.stringify(endings));
    const flags = JSON.parse(localStorage.getItem("sakura_letters_flags_v2") || "{}");
    flags.loopCount = 3; flags.playCount = 3;
    localStorage.setItem("sakura_letters_flags_v2", JSON.stringify(flags));
    Saves.unlockKeyword("匿名信"); Saves.unlockKeyword("学姐"); Saves.unlockKeyword("回信"); Saves.unlockKeyword("樱花祭");
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => {
    Saves.composeKeyword("樱花祭", "回信", "祭信");
    Saves.composeKeyword("匿名信", "学姐", "未寄信");
    Saves.composeKeyword("祭信", "未寄信", "樱花信");
    window.__game.newGame();
    window.__game.gotoNode("true_end_entry");
  });
  await page.evaluate(() => {  // 推进到 true_choice
    let guard = 0;
    while (window.__game.state.currentNode !== "true_choice" && guard++ < 20) {
      const n = SCRIPT[window.__game.state.currentNode];
      if (n && n.next) window.__game.gotoNode(n.next); else break;
    }
  });
  const options = await page.evaluate(() => [...document.querySelectorAll("#choices button")].map((b) => b.textContent));
  assert.equal(options.length, 4, "破环隐藏选项未出现: " + JSON.stringify(options));
  await page.evaluate(() => {
    [...document.querySelectorAll("#choices button")].find((b) => b.textContent.includes("樱花信")).click();
  });
  const ending = await page.evaluate(() => {
    let guard = 0;
    while (guard++ < 30) {
      const n = SCRIPT[window.__game.state.currentNode];
      if (n && n.ending) return n.ending.id;
      if (n && n.next) window.__game.gotoNode(n.next); else break;
    }
    return null;
  });
  assert.equal(ending, "true_end", "破环链未到达 TRUE ENDING");
  console.log("[e2e] 6/6 真结局破环链通过");

  // 6) 全程控制台零错误
  assert.deepEqual(errors, [], "存在控制台错误: " + JSON.stringify(errors.slice(0, 5)));
  // 浏览器与服务器的关闭统一由 test.after 兜底（失败时也能退出进程）
});
