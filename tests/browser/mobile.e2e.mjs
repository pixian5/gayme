/* 移动端触控与布局回归（v3.4.27）：390×844 真触控上下文。
   覆盖：标题页触控开始 / 8 个代表玩法浮层挂载 + 跳过按钮可点且在视口内 /
        菜单浮层触控开关 + 面板不越界 / 无横向溢出 / 动态视口高度 / 0 控制台错误。
   用法：npm run test:mobile（需 npx playwright install chromium-headless-shell） */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 41792;
const VIEWPORT = { width: 390, height: 844 };
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
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
await new Promise((resolve) => server.listen(PORT, resolve));

let browser = null;
test.after(async () => {
  try { await browser?.close(); } catch { /* 已关闭则忽略 */ }
  await new Promise((resolve) => server.close(resolve));
  server.closeAllConnections?.();
});

test("移动端触控与布局回归（390×844）", { timeout: 120_000 }, async () => {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.text().includes("Navigated away from page")) return;
    errors.push("console: " + m.text());
  });

  const tap = async (locator) => {
    const box = await locator.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, "触控目标不可见");
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  };
  const assertInViewport = (box, label) => {
    assert.ok(box, `${label} 无布局盒`);
    assert.ok(box.x >= -0.5 && box.y >= -0.5, `${label} 越出左/上边界：${JSON.stringify(box)}`);
    assert.ok(box.x + box.width <= VIEWPORT.width + 0.5, `${label} 越出右边界：${JSON.stringify(box)}`);
    assert.ok(box.y + box.height <= VIEWPORT.height + 0.5, `${label} 越出下边界：${JSON.stringify(box)}`);
  };
  const noOverflow = async (label) => {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `${label} 出现横向溢出 ${overflow}px`);
  };

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 15000 });
  await page.evaluate(() => {
    Saves.updateSetting("bgm", false);
    Saves.updateSetting("sfxVolume", 0);
    Saves.setFlag("tutorialSeen", true);
  });

  assert.ok(await page.evaluate(() => navigator.maxTouchPoints > 0), "触控上下文未生效");
  assert.equal(await page.evaluate(() => Math.round(document.getElementById("game").getBoundingClientRect().height)),
    VIEWPORT.height, "100dvh 未撑满视口");
  await noOverflow("标题页");
  console.log("[mobile] 1/5 触控上下文与标题页布局通过");

  await tap(page.locator('#title-screen button[data-action="new"]'));
  await page.waitForFunction(() => document.getElementById("title-screen").classList.contains("hidden"),
    null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => window.__game.state.currentNode), "prologue_1");
  console.log("[mobile] 2/5 标题页触控开始游戏通过");

  const nodes = ["d6_origami", "d5_piano", "d4_puzzle", "d4_shadow", "d6_lock", "d4_rain", "d4_breath", "d2_library_doodle"];
  for (const [index, nodeId] of nodes.entries()) {
    await page.evaluate((n) => { window.__game.newGame(); window.__game.gotoNode(n); }, nodeId);
    await page.waitForTimeout(300);
    const activeLayers = await page.evaluate(() =>
      [...document.querySelectorAll("#game [id$='-layer']")]
        .filter((e) => !["bg-layer", "char-layer", "clue-layer"].includes(e.id)).length);
    assert.ok(activeLayers > 0, `${nodeId} 玩法浮层未挂载`);
    const skip = page.locator(".gh-skip").first();
    await skip.waitFor({ state: "visible", timeout: 5000 });
    assertInViewport(await skip.boundingBox(), `${nodeId} 跳过按钮`);

    // 首个节点额外验证触控事件真的到达按钮：点说明栏折叠按钮应翻转 collapsed
    if (index === 0) {
      const toggle = page.locator(".gh-toggle").first();
      assertInViewport(await toggle.boundingBox(), `${nodeId} 说明栏折叠按钮`);
      const collapsedBefore = await page.evaluate(() =>
        document.querySelector(".game-help-bar").classList.contains("collapsed"));
      await tap(toggle);
      await page.waitForTimeout(200);
      const collapsedAfter = await page.evaluate(() =>
        document.querySelector(".game-help-bar").classList.contains("collapsed"));
      assert.notEqual(collapsedAfter, collapsedBefore, `${nodeId} 触控未能折叠/展开说明栏`);
    }

    // 标注当前玩法浮层，触控跳过后等它消失。
    // 注意：跳过会 cleanup + jumpNext，下一节点可能立刻挂载另一个玩法浮层，
    // 因此不能断言「全局浮层数为 0」，只断言本节点自己的浮层已关闭。
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("#game [id$='-layer']")) {
        if (["bg-layer", "char-layer", "clue-layer"].includes(el.id)) continue;
        el.dataset.mobileProbe = "1";
      }
    });
    await tap(skip);
    await page.waitForFunction(() => !document.querySelector('[data-mobile-probe="1"]'), null, { timeout: 5000 })
      .catch(() => assert.fail(`${nodeId} 触控跳过后本局玩法浮层未关闭`));
  }
  console.log("[mobile] 3/5 八个代表玩法触控挂载/跳过通过");

  await page.evaluate(() => window.__game.newGame());
  await tap(page.locator('#top-bar button[data-menu="save"]'));
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => !document.getElementById("overlay").classList.contains("hidden")),
    "存档浮层未打开");
  assertInViewport(await page.locator(".overlay-panel").boundingBox(), "存档浮层面板");
  await noOverflow("存档浮层");
  await tap(page.locator(".overlay-close").first());
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => document.getElementById("overlay").classList.contains("hidden")),
    "存档浮层未关闭");
  console.log("[mobile] 4/5 菜单浮层触控开关与边界通过");

  assert.deepEqual(errors, [], "移动端出现控制台错误");
  console.log("[mobile] 5/5 控制台零错误");
  await context.close();
});
