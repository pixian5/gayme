/* 全图运行时走查（v3.4.9）：443 个节点逐一在真实浏览器执行，
   抓「数据侧 OK 但运行时崩」类回归（v2.9.0 教训）。
   用法：npm run test:graph            （chromium，约 40-60s）
        BROWSER=firefox npm run test:graph
        VIEWPORT=390x844 npm run test:graph   （移动端视口走查，v3.4.14）
   不进 pre-push 默认集（耗时）；大版本/内容改动后必跑。PREPUSH_GRAPH=1 可并入。 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

// 项目根 = tests/browser 上一级；必须先用 dirname 取目录（直接对文件路径 join 会得到错误路径）
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 41791;
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

test.after(() => { server.close(); server.closeAllConnections?.(); });   // 失败路径也要释放端口

test(`全图运行时走查（${engineName}，441 节点）`, { timeout: 300_000 }, async () => {
  const browser = await engine.launch();
  const vpEnv = process.env.VIEWPORT;   // 例：390x844（移动端）
  const ctxOpts = vpEnv ? { viewport: { width: +vpEnv.split("x")[0], height: +vpEnv.split("x")[1] } } : {};
  const page = await browser.newPage(ctxOpts);
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.text().includes("Navigated away from page")) return; // Firefox 刷新良性噪音
    errors.push("console: " + m.text());
  });

  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(() => {
    Saves.updateSetting("bgm", false);
    Saves.updateSetting("sfxVolume", 0);
    window.__game.newGame();
  });

  const ids = await page.evaluate(() => Object.keys(SCRIPT));
  assert.ok(ids.length > 400, `剧本节点数异常（${ids.length}）`);
  console.log(`[graph] ${engineName} 走查 ${ids.length} 节点…`);

  // 节点间清理：取消全部生命周期（GameKit 浮层）+ 移除漏网层/选项/视角按钮
  const CLEANUP = `(() => {
    window.GameLifecycle?.cancelAll();
    document.querySelectorAll("#game > div, #game > button").forEach((el) => {
      const id = el.id || "";
      if (id.endsWith("-layer") && !["bg-layer", "char-layer", "clue-layer"].includes(id)) el.remove();
      else if (id === "perspective-btn" || id === "loop-hint") el.remove();
    });
    const ch = document.getElementById("choices");
    if (ch && !ch.classList.contains("hidden")) { ch.classList.add("hidden"); ch.innerHTML = ""; }
  })()`;

  const bad = [];
  const t0 = Date.now();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const errs0 = errors.length;
    await page.evaluate(`${CLEANUP}; window.__game.gotoNode(${JSON.stringify(id)});`);
    await page.waitForTimeout(60);
    const visual = await page.evaluate(`(() => {
      // id 或 class 以 -layer 结尾（dream/部分早期玩法只有 class）+ 基础迷你游戏 .mg-overlay
      const hasLayer = [...document.querySelectorAll("#game [id$='-layer'], #game [class$='-layer'], #game .mg-overlay")]
        .some((e) => !["bg-layer", "char-layer", "clue-layer"].includes(e.id || e.className));
      const dialog = !document.getElementById("dialog-box").classList.contains("hidden");
      const choices = !document.getElementById("choices").classList.contains("hidden");
      const ending = !document.getElementById("ending-screen").classList.contains("hidden");
      return hasLayer || dialog || choices || ending;
    })()`);
    const newErrs = errors.length - errs0;
    if (newErrs > 0) bad.push({ id, kind: "console", detail: errors.slice(errs0).join(" | ").slice(0, 300) });
    else if (!visual) bad.push({ id, kind: "no-visual", detail: "无浮层/对话框/选项/结局任何视觉反馈" });
    if ((i + 1) % 100 === 0) console.log(`  …${i + 1}/${ids.length}`);
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  await writeFile("/tmp/graph-walk.json",
    JSON.stringify({ engine: engineName, total: ids.length, bad, secs }, null, 1));
  console.log(`走查完成：${ids.length} 节点 / ${secs}s / 坏节点 ${bad.length}`);

  assert.deepEqual(bad, [], `坏节点 ${bad.length} 个（详见 /tmp/graph-walk.json）：\n` +
    bad.map((b) => `  ${b.id} [${b.kind}] ${b.detail}`).join("\n"));

  await browser.close();
});
