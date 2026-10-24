/* 引擎运行时 e2e 测试（v3.3.0）：真实浏览器跑引擎，覆盖静态测试测不到的行为回归。
   用法：
     npm i -D playwright && npx playwright install chromium   # 首次
     npm run test:e2e                 # 默认 chromium
     BROWSER=firefox npm run test:e2e # firefox
   覆盖：页面加载 / 推进链 / 八个玩法模块抽样挂载 / 快存-刷新-读档 / 真结局破环链 /
        学姐线入口与结局 / 控制台零错误。 */
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
  // v3.3.6：localhost 也应注册 Service Worker（此前只判 https，e2e 从未覆盖 SW）
  const swRegistered = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    for (let i = 0; i < 30; i++) {
      if (await navigator.serviceWorker.getRegistration()) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  });
  assert.ok(swRegistered, "localhost 未注册 Service Worker");
  console.log("[e2e] 1/7 页面加载完成");

  // 1) 新游戏 + 连续推进
  await page.evaluate(() => window.__game.newGame());
  for (const nid of ["prologue_8", "d2_noon", "common_day3_morning"]) {
    await page.evaluate((n) => window.__game.gotoNode(n), nid);
  }
  assert.equal(await page.evaluate("window.__game.state.currentNode"), "common_day3_morning");
  console.log("[e2e] 2/7 推进链通过");

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
  console.log("[e2e] 3/7 八模块玩法抽样挂载通过");

  // 3) 快存 → 真实刷新 → 继续游戏恢复
  await page.evaluate(() => { window.__game.newGame(); window.__game.gotoNode("d4_puzzle"); });
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));  // 触发自动存档兜底
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.querySelector('#title-screen button[data-action="continue"]').click());
  assert.equal(await page.evaluate("window.__game.state.currentNode"), "d4_puzzle", "刷新后继续游戏未恢复");
  console.log("[e2e] 4/7 快存-刷新-读档通过");

  // 4) 全部浮层面板可开关（UI 拆分后的主要安全网）
  await page.evaluate(() => window.__game.newGame());
  for (const panel of ["save", "load", "config", "history", "gallery", "about", "keywords", "cg", "flowchart", "stats"]) {
    await page.evaluate((p) => window.__game.openOverlay(p), panel);
    const open = await page.evaluate(() => !document.getElementById("overlay").classList.contains("hidden"));
    const bodyLen = await page.evaluate(() => document.getElementById("overlay-body").innerHTML.length);
    assert.ok(open && bodyLen > 50, `浮层 ${panel} 未正常渲染`);
    if (panel === "config") {
      // v3.3.5：设置面板必须含 BGM / 音效音量控件，且滑杆改动能实时写入设置
      const hasVolumeControls = await page.evaluate(() =>
        !!document.getElementById("cfg-bgmvolume") && !!document.getElementById("cfg-sfxvolume"));
      assert.ok(hasVolumeControls, "设置面板缺少 BGM / 音效音量控件");
      await page.evaluate(() => {
        const slider = document.getElementById("cfg-bgmvolume");
        slider.value = "0.2";
        slider.dispatchEvent(new Event("input"));
      });
      assert.equal(await page.evaluate("Saves.settings.bgmVolume"), 0.2, "BGM 音量滑杆未写入设置");
      // v3.3.12：设置面板新增「减少动效」「界面字号」并立即生效
      assert.ok(await page.evaluate(() => !!document.getElementById("cfg-reducemotion") && !!document.getElementById("cfg-fontscale")),
        "设置面板缺少减少动效 / 界面字号控件");
      await page.evaluate(() => {
        const slider = document.getElementById("cfg-fontscale");
        slider.value = "1.2";
        slider.dispatchEvent(new Event("input"));
      });
      assert.equal(await page.evaluate("Saves.settings.fontScale"), 1.2, "界面字号滑杆未写入设置");
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-scale").trim()),
        "1.2", "界面字号未应用到 --ui-scale");
    }
    await page.evaluate(() => window.__game.closeOverlay());
  }
  // v3.3.6：浮层焦点陷阱——连续 Tab 不逃逸到浮层之外
  await page.evaluate(() => window.__game.openOverlay("config"));
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  const focusInside = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest?.("#overlay")));
  assert.ok(focusInside, "浮层焦点陷阱失效：Tab 逃逸到浮层之外");
  await page.evaluate(() => window.__game.closeOverlay());

  // v3.3.6：inbox 限时消息倒计时持久化——首次打开时间只记一次
  const inboxPersist = await page.evaluate(() => {
    Saves.saveInbox({ id: "e2e_msg", from: "测试", deadline: 30000 });
    const first = Saves.markInboxOpened("e2e_msg");
    const second = Saves.markInboxOpened("e2e_msg");
    return { first, second };
  });
  assert.ok(inboxPersist.first && inboxPersist.first === inboxPersist.second,
    "inbox 首次打开时间未持久化（倒计时可无限重置）");

  // v3.3.10：选项键盘操作——方向键移动焦点 + Enter 确认
  await page.evaluate(() => { window.__game.newGame(); window.__game.gotoNode("day2_choice"); });
  await page.waitForTimeout(150);
  const beforeChoice = await page.evaluate(() => window.__game.state.currentNode);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const afterChoice = await page.evaluate(() => window.__game.state.currentNode);
  assert.notEqual(afterChoice, beforeChoice, "选项键盘操作未生效（Enter 未确认选项）");

  // v3.3.11：CG 大图查看器——点击已解锁 CG 放大，Esc 关闭
  await page.evaluate(() => { Saves.unlockCG("cg_letter"); window.__game.openOverlay("cg"); });
  await page.evaluate(() => document.querySelector("#overlay-body [data-cg]")?.click());
  await page.waitForTimeout(120);
  assert.ok(await page.evaluate(() => !!document.getElementById("cg-viewer-layer")), "CG 大图查看器未打开");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => !document.getElementById("cg-viewer-layer")), "CG 大图 Esc 未关闭");
  console.log("[e2e] 5/7 浮层面板开关通过");

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
  console.log("[e2e] 6/7 真结局破环链通过");

  // 6) 学姐线：入口条件、隐藏选项、结局入图鉴、不解锁后日谈
  await page.evaluate(() => {
    const endings = JSON.parse(localStorage.getItem("sakura_letters_endings_v2") || "{}");
    endings.unlocked = ["true_unbroken"];
    localStorage.setItem("sakura_letters_endings_v2", JSON.stringify(endings));
    const flags = JSON.parse(localStorage.getItem("sakura_letters_flags_v2") || "{}");
    flags.loopCount = 0; flags.playCount = 1;
    localStorage.setItem("sakura_letters_flags_v2", JSON.stringify(flags));
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 15000 });
  await page.evaluate(() => { window.__game.newGame(); window.__game.gotoNode("d5_route_check"); });
  let routeOptions = await page.evaluate(() => [...document.querySelectorAll("#choices button")].map((b) => b.textContent));
  assert.equal(routeOptions.length, 3, "未满足循环条件时不应出现学姐线入口: " + JSON.stringify(routeOptions));

  await page.evaluate(() => {
    Saves.endings.unlocked = [];  // 模拟未解锁 true_unbroken
    window.__game.state.loopCount = 1;
    window.__game.newGame();
    window.__game.gotoNode("d5_route_check");
  });
  routeOptions = await page.evaluate(() => [...document.querySelectorAll("#choices button")].map((b) => b.textContent));
  assert.equal(routeOptions.length, 3, "缺少 true_unbroken 时不应出现学姐线入口: " + JSON.stringify(routeOptions));

  await page.evaluate(() => {
    Saves.endings.unlocked = ["true_unbroken"];
    Saves.setFlag("loopCount", 1);
    window.__game.state.loopCount = 1;  // newGame 不重读 flag，测试里同步运行时状态
    window.__game.newGame();
    window.__game.gotoNode("d5_route_check");
  });
  routeOptions = await page.evaluate(() => [...document.querySelectorAll("#choices button")].map((b) => b.textContent));
  assert.equal(routeOptions.length, 4, "学姐线隐藏入口未出现: " + JSON.stringify(routeOptions));
  assert.ok(routeOptions.some((text) => text.includes("旧校舍")), "学姐线入口文案缺失");
  await page.evaluate(() => {
    [...document.querySelectorAll("#choices button")].find((b) => b.textContent.includes("旧校舍")).click();
  });
  assert.equal(await page.evaluate("window.__game.state.currentNode"), "route_senior_1", "未进入学姐线");

  await page.evaluate(() => window.__game.gotoNode("senior_ending"));
  await page.waitForFunction(
    () => !document.getElementById("ending-screen").classList.contains("hidden"),
    null,
    { timeout: 15000 }
  );
  const seniorEnding = await page.evaluate(() => ({
    visible: !document.getElementById("ending-screen").classList.contains("hidden"),
    title: document.getElementById("ending-title").textContent,
    unlocked: Saves.isEndingUnlocked("senior_shadow"),
    trueEnd: Saves.isEndingUnlocked("true_end"),
    loopCount: window.__game.state.loopCount,
  }));
  assert.ok(seniorEnding.visible, "学姐结局画面未显示");
  assert.equal(seniorEnding.title, "看 见");
  assert.equal(seniorEnding.unlocked, true, "学姐结局未入图鉴");
  assert.equal(seniorEnding.trueEnd, false, "学姐线不应授予真结局");
  assert.equal(seniorEnding.loopCount, 2, "学姐线结局应作为普通循环结局 +1");

  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 15000 });
  const afterwordHidden = await page.evaluate(() => {
    const btn = document.querySelector('#title-screen button[data-action="afterword"]');
    return btn.classList.contains("hidden") || getComputedStyle(btn).display === "none";
  });
  assert.ok(afterwordHidden, "学姐线不应解锁后日谈");
  await page.evaluate(() => window.__game.openOverlay("gallery"));
  const galleryCards = await page.evaluate(() => document.querySelectorAll("#overlay-body .gallery-card").length);
  assert.equal(galleryCards, 13, "结局图鉴应为 13 张");
  // 收集进度（v3.3.1）：图鉴顶部应显示「已解锁结局 x/13」进度
  const progressText = await page.evaluate(() => document.querySelector("#overlay-body")?.textContent || "");
  assert.match(progressText, /\d+ \/ 13/, "结局图鉴应显示收集进度 x/13");
  // CG 图鉴与关键词面板同样带收集进度
  await page.evaluate(() => window.__game.openOverlay("cg"));
  const cgText = await page.evaluate(() => document.querySelector("#overlay-body")?.textContent || "");
  assert.match(cgText, /\d+ \/ \d+/, "CG 图鉴应显示收集进度 x/11");
  await page.evaluate(() => window.__game.openOverlay("keywords"));
  const kwText = await page.evaluate(() => document.querySelector("#overlay-body")?.textContent || "");
  assert.match(kwText, /收集进度/, "关键词面板应显示收集进度");
  console.log("[e2e] 7/7 学姐线入口与结局通过");

  // 7) 全程控制台零错误
  assert.deepEqual(errors, [], "存在控制台错误: " + JSON.stringify(errors.slice(0, 5)));
  // 浏览器与服务器的关闭统一由 test.after 兜底（失败时也能退出进程）
});
