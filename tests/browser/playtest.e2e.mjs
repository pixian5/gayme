/* 五画像真人试玩（v3.4.25）
   —— 与 graph.e2e（直接 gotoNode 遍历 441 节点）互补：
      graph 证明「节点不崩」，本脚本证明「玩家点得下去」。

   模拟的五种真人行为：
     lazy    懒人：每个玩法都点「跳过这个玩法」
     careful 认真：读说明栏 → 按说明操作 → 点确认收尾（实在搞不定才兜底跳过）
     explore 探索：先展开说明栏读一遍再操作；选项优先走苏念线
     fast    快通：二周目 + 快进，什么都不点，看玩法是否自动中性收尾
     loop    二周目：注入全节点已读 + loopCount=2，验证循环计数/既视感文本，并优先走进学姐线隐藏入口

   全部走真实点击 / 真实鼠标拖动（Playwright），只做真人会做的动作，不强推。

   用法：npm run test:play                （chromium，五画像全跑，约 3-6 分钟）
        PERSONA=careful npm run test:play （只跑一个画像，排查用）
        BROWSER=firefox npm run test:play
   不进 pre-push 默认集（耗时）；内容/玩法大改后必跑。PREPUSH_PLAY=1 可并入。 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 41792;   // 与 engine.e2e / graph.e2e 错开，避免并行跑时端口打架
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

test.after(() => { server.close(); server.closeAllConnections?.(); });

const MAX_STEPS = Number(process.env.MAX_STEPS || 1200);   // 单画像步数上限（一周目实测 220~280 步）
const ALL = ["lazy", "careful", "explore", "fast", "loop"];
const ONLY = process.env.PERSONA ? process.env.PERSONA.split(",") : ALL;

/* ---------- 页面内：抓一份「现在屏幕上有什么」的快照 ---------- */
const SNAPSHOT = `(() => {
  const g = window.__game;
  const vis = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains("hidden"); };
  // 非玩法的常驻/可选层：背景层、新手引导、视角补充、CG 查看器 —— 不算「玩法浮层」
  const NOT_GAME = ["bg-layer", "char-layer", "clue-layer", "tutorial-layer", "perspective-layer", "cg-viewer-layer"];
  const layers = [...document.querySelectorAll("#game [id$='-layer'], #game [class$='-layer'], #game .mg-overlay")]
    .map((e) => e.id || e.className)
    .filter((n) => !NOT_GAME.includes(n));
  const help = document.querySelector(".game-help-bar");
  const enabled = (sel) => [...document.querySelectorAll(sel)].filter((b) => !b.disabled).map((b) => (b.textContent || "").trim());
  const node = SCRIPT[g.state.currentNode] || {};
  return {
    node: g.state.currentNode,
    hasEnding: !!node.ending,
    endingId: node.ending ? node.ending.id : null,
    endingShown: vis("ending-screen"),
    typing: !!g.state.isTyping,
    dialog: vis("dialog-box"),
    choices: vis("choices") ? [...document.querySelectorAll("#choices button")].map((b) => (b.textContent || "").trim()) : [],
    hasTextarea: !!document.querySelector("#choices textarea"),
    layers: layers.length,
    layerNames: layers.slice(0, 4),
    tutorial: !!document.getElementById("tutorial-layer"),
    perspective: !!document.getElementById("perspective-layer"),
    help: !!help,
    helpCollapsed: help ? help.classList.contains("collapsed") : null,
    fastBar: !!document.querySelector(".fast-replay-bar"),
    confirm: enabled('#game button[class*="-confirm"], #game button[class*="-submit"], #game button[class*="-finish"]'),
    reading: enabled('#game [class*="-reading-close"]'),
  };
})()`;

/* ---------- 页面内：给玩法浮层里的可操作元素打标记，供 Node 侧真实点击/拖动 ---------- */
const TAG = `(() => {
  const root = document.getElementById("game");
  root.querySelectorAll("[data-pt]").forEach((e) => e.removeAttribute("data-pt"));
  const areas = [...root.querySelectorAll("[id$='-layer'], [class$='-layer'], .mg-overlay")];
  const scope = areas.length ? areas : [root];
  let n = 0;
  const out = { buttons: [], sliders: [], canvases: [], cards: [], confirm: [], skip: [] };
  const mark = (el, kind, text) => {
    const m = kind + "-" + (n++);
    el.dataset.pt = m;
    if (out[kind]) out[kind].push({ m, text });
    return m;
  };
  for (const area of scope) {
    area.querySelectorAll("button").forEach((b) => {
      if (b.disabled) return;
      const t = (b.textContent || "").trim();
      if (t.includes("跳过")) { mark(b, "skip", t); return; }          // 兜底用，不当普通按钮点
      if (/-confirm|-submit|-finish/.test(b.className || "")) { mark(b, "confirm", t); return; }
      mark(b, "buttons", t);
    });
    area.querySelectorAll('input[type="range"]').forEach((el) => mark(el, "sliders", ""));
    area.querySelectorAll("canvas").forEach((el) => mark(el, "canvases", ""));
    // 卡片/格子类的可选元素（按钮已单独处理，避免重复点导致 toggle 型被取消选中）
    area.querySelectorAll("[class*='card'],[class*='tile'],[class*='opt'],[class*='item'],[class*='slot'],[class*='chip'],[class*='pick'],[class*='cell']")
      .forEach((el) => { if (!el.dataset.pt && el.tagName !== "BUTTON") mark(el, "cards", (el.textContent || "").trim().slice(0, 12)); });
  }
  return out;
})()`;

const snap = (page) => page.evaluate(SNAPSHOT);
const tag = (page) => page.evaluate(TAG);

async function clickMark(page, m) {
  const el = page.locator(`[data-pt="${m}"]`);
  if (await el.count() === 0) return false;
  try { await el.first().click({ timeout: 1500 }); return true; } catch { return false; }
}

async function dragMark(page, m, kind) {
  const el = page.locator(`[data-pt="${m}"]`);
  if (await el.count() === 0) return false;
  const box = await el.first().boundingBox().catch(() => null);
  if (!box || box.width < 4 || box.height < 4) return false;
  try {
    if (kind === "sliders") {
      // 滑杆：从左 1/4 拖到 ~72%
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.15, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.72, y, { steps: 8 });
      await page.mouse.up();
    } else {
      // 画布：之字形扫一遍（覆盖类玩法如拓印/茶渍需要扫够面积）
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        const y = box.y + box.height * ((r + 0.5) / rows);
        const left = r % 2 === 0;
        await page.mouse.move(box.x + (left ? box.width * 0.08 : box.width * 0.92), y);
        if (r === 0) await page.mouse.down();
        await page.mouse.move(box.x + (left ? box.width * 0.92 : box.width * 0.08), y, { steps: 10 });
      }
      await page.mouse.up();
    }
    return true;
  } catch { return false; }
}

/* 认真 / 探索画像：按说明栏的指引在玩法里真实操作一遍
   —— 一轮手势（启动键 → 滑杆 → 画布 → 卡片）→ 点确认；确认还灰着就再补两个按钮，
      仍不行才交给调用方兜底跳过。刻意压短等待：五画像要跑完近百个玩法。 */
async function playMinigame(page, stats, readHelpFirst) {
  if (readHelpFirst) {
    const help = page.locator(".game-help-bar.collapsed .gh-toggle");
    if (await help.count() > 0) await help.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  const t = await tag(page);
  // 1) 启动类按钮（开始/播放/试音/敲击…）
  const startLike = t.buttons.filter((b) => /开始|启动|播放|试音|敲击|翻面|翻开|抽取|播种|摇一摇|试一试|点我/.test(b.text));
  for (const b of startLike.slice(0, 2)) { await clickMark(page, b.m); await page.waitForTimeout(90); }
  // 2) 滑杆
  for (const s of t.sliders.slice(0, 2)) { await dragMark(page, s.m, "sliders"); await page.waitForTimeout(60); }
  // 3) 画布（优先 canvas 本体，别点外层容器——上一轮模拟器就是踩了这个坑）
  for (const c of t.canvases.slice(0, 1)) { await dragMark(page, c.m, "canvases"); await page.waitForTimeout(70); }
  // 4) 卡片/格子：每个最多点一次（toggle 型连点会取消选中）
  for (const c of t.cards.slice(0, 5)) { await clickMark(page, c.m); await page.waitForTimeout(45); }
  // 5) 收尾：有可用的确认按钮就点
  await page.waitForTimeout(200);
  const t2 = await tag(page);
  if (t2.confirm.length) {
    await clickMark(page, t2.confirm[0].m);
    await page.waitForTimeout(220);
    stats.played++;
    return true;
  }
  // 6) 还没完成：再补点两个普通按钮（仍跳过「跳过」键），然后看确认键是否点亮
  const rest = t2.buttons.slice(0, 2);
  for (const b of rest) { await clickMark(page, b.m); await page.waitForTimeout(80); }
  await page.waitForTimeout(160);
  const t3 = await tag(page);
  if (t3.confirm.length) {
    await clickMark(page, t3.confirm[0].m);
    await page.waitForTimeout(220);
    stats.played++;
    return true;
  }
  return false;   // 交给调用方兜底跳过
}

/* 兜底脱身：优先点「跳过这个玩法」；回声/气味闪回这类「选项型浮层」没有跳过键，
   真人的做法是选一个——选第一个（与懒人画像在选项节点的行为一致） */
async function dismissMinigame(page) {
  const t = await tag(page);
  if (t.skip.length) { await clickMark(page, t.skip[0].m); return "skip"; }
  const gh = page.locator(".gh-skip");
  if (await gh.count() > 0) { await gh.first().click({ timeout: 1500 }).catch(() => {}); return "skip"; }
  if (t.buttons.length) { await clickMark(page, t.buttons[0].m); return "choice"; }
  return "";
}

async function skipMinigame(page) {
  return (await dismissMinigame(page)) !== "";
}

const LETTER_TEXT = {
  lazy: "嗯，我知道了。",
  careful: "谢谢你把信写给我。这个春天，我会记住的。",
  explore: "我想把这句话原样还给你：写下去比写完重要。",
  fast: "嗯。",
  loop: "这一轮，换我先开口。",
};

async function pickChoice(page, texts, persona, stats) {
  let idx = 0;
  if (persona === "explore") {
    const found = texts.findIndex((t) => /苏念|美术室/.test(t));
    if (found >= 0) idx = found;
  }
  // 二周目画像：优先选隐藏的学姐线入口（v3.4.25 放宽门槛后 loopCount≥2 可见）——给入口改动做 e2e 覆盖
  if (persona === "loop") {
    const found = texts.findIndex((t) => /旧校舍后面/.test(t));
    if (found >= 0) { idx = found; if (stats) stats.seniorLine = true; }
  }
  const btn = page.locator("#choices button").nth(idx);
  await btn.click({ timeout: 2000 });
  return texts[idx] || "";
}

async function answerLetter(page, persona) {
  const ta = page.locator("#choices textarea");
  if (await ta.count() > 0) {
    await ta.first().fill(LETTER_TEXT[persona] || "嗯。");
    await page.waitForTimeout(80);
  }
  const send = page.locator("#choices button").last();   // 自由书写模式最后一个按钮 = ✉ 寄出
  await send.click({ timeout: 2000 });
}

async function setup(page, persona) {
  await page.evaluate(() => {
    Saves.updateSetting("bgm", false);          // 规矩：浏览器实测前必须静音
    Saves.updateSetting("sfxVolume", 0);
    Saves.updateSetting("textSpeed", 5);         // 打字机拉到最快，缩短试玩耗时
    window.__game.newGame();
  });
  // 新手引导（新档首次必现）会盖住顶栏按钮，真人的第一件事就是点「开始故事」
  await page.waitForTimeout(150);
  await page.locator("#tutorial-layer .tutorial-ok").click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(100);

  if (persona === "fast" || persona === "loop") {
    /* 二周目/快通画像：预设「全节点已读 + 循环计数」。
       必须放在 newGame 之后：newGame 不动 visitedNodes/loopCount（两者读自 Saves flag，引擎初始化时快照），
       但会重置 skipMode 与 variables——所以 #btn-skip 也必须放在 newGame 之后点，否则等于没开。 */
    await page.evaluate((loops) => {
      const visited = {};
      Object.keys(SCRIPT).forEach((id) => { visited[id] = 2; });   // 全节点已读
      window.__game.state.visitedNodes = visited;
      window.__game.state.loopCount = loops;
      Saves.setFlag("loopCount", loops);
    }, persona === "fast" ? 1 : 2);
    if (persona === "fast") {
      await page.click("#btn-skip", { timeout: 3000 });   // 开快进
      await page.waitForFunction(() => window.__game.state.skipMode === true, null, { timeout: 3000 }).catch(() => {});
    }
  }
}

async function runPersona(page, persona) {
  const stats = { persona, steps: 0, choices: 0, letters: 0, skipped: 0, played: 0, fallback: 0, fastAuto: 0, idle: 0 };
  const t0 = Date.now();
  await setup(page, persona);
  let lastKey = "";
  let lastNode = null;
  const trail = [];   // 最近走过的节点（失败时打印，便于定位死循环）

  while (stats.steps++ < MAX_STEPS) {
    const s = await snap(page);
    // 卡死检测：节点、浮层、选项数都没变 → 连续 10 步原地打转就判失败
    const key = [s.node, s.layerNames.join(","), s.choices.length, s.confirm.length, s.reading.length].join("|");
    if (key === lastKey) stats.idle++; else { stats.idle = 0; lastKey = key; }
    if (stats.idle > 10) {
      stats.stuckAt = s.node;
      stats.stuckLayers = s.layerNames;
      stats.trail = trail.slice(-40);
      stats.secs = ((Date.now() - t0) / 1000).toFixed(1);
      return stats;
    }
    if (s.node !== lastNode) { trail.push(s.node); if (trail.length > 60) trail.shift(); lastNode = s.node; }
    if (s.endingShown || (s.hasEnding && s.layers === 0)) {
      if (!s.endingShown) {
        await page.waitForFunction("!document.getElementById('ending-screen').classList.contains('hidden')",
          null, { timeout: 8000 }).catch(() => {});
      }
      stats.endingId = s.endingId || (await page.evaluate(() => (SCRIPT[window.__game.state.currentNode] || {}).ending?.id || null));
      // 快通画像：记录结局时的 skipMode——若被中途关掉，「已读快通」的覆盖就是假的
      stats.skipOn = await page.evaluate(() => !!window.__game.state.skipMode);
      stats.secs = ((Date.now() - t0) / 1000).toFixed(1);
      return stats;
    }
    // 1) 玩法结果面板 → 点「继续」
    if (s.reading.length) {
      await page.locator('#game [class*="-reading-close"]').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(120);
      continue;
    }
    // 2) 选项 / 回信
    if (s.choices.length || s.hasTextarea) {
      if (s.hasTextarea) { await answerLetter(page, persona); stats.letters++; }
      else { await pickChoice(page, s.choices, persona, stats); stats.choices++; }
      await page.waitForTimeout(150);
      continue;
    }
    // 3) 新手引导 / 视角补充（非玩法，直接关掉即可）
    if (s.tutorial) {
      await page.click("#tutorial-layer .tutorial-ok", { timeout: 2000 }).catch(() => {});
      stats.tutorial = (stats.tutorial || 0) + 1;
      await page.waitForTimeout(120);
      continue;
    }
    if (s.perspective) {
      const btn = page.locator("#perspective-layer button").last();
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(120);
      continue;
    }
    // 4) 玩法浮层
    if (s.layers > 0 || s.help || s.fastBar) {
      stats.layerNodes = stats.layerNodes || new Set();
      stats.layerNodes.add(s.node);
      if (persona === "lazy" || persona === "loop") {
        // 懒人全跳过；二周目画像只验证「循环计数 + 既视感文本」，玩法同样走跳过（否则一条线要 8 分钟）
        await skipMinigame(page); stats.skipped++;
        await page.waitForTimeout(120);
      } else if (persona === "fast") {
        // 快通：玩法层里什么都不点，等已读快通自动收尾（v3.4.13）。
        // 判定口径 = 节点是否自己变了（可能是下一个玩法节点，所以不能只看「有没有浮层」）
        const before = s.node;
        await page.waitForTimeout(700);
        const s2 = await snap(page);
        if (s2.node !== before) { stats.fastAuto++; continue; }
        if (s2.reading.length) {
          stats.fastAuto++;
          await page.locator('#game [class*="-reading-close"]').first().click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(100);
          continue;
        }
        // 回声/气味闪回这类非玩法浮层没有快通通道，真人还是要选一个
        stats.fallback++;
        stats.fbLayers = stats.fbLayers || [];
        if (stats.fbLayers.length < 20) stats.fbLayers.push(s2.layerNames.join("+") || "?");
        await skipMinigame(page);
        await page.waitForTimeout(120);
      } else {
        const ok = await playMinigame(page, stats, persona === "explore");
        if (!ok) { await skipMinigame(page); stats.fallback++; }
        await page.waitForTimeout(120);
      }
      continue;
    }
    // 5) 对白：点对话框推进（打字中点一次先跳过打字，再点一次推进）
    if (s.dialog) {
      await page.click("#dialog-box", { timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(s.typing ? 90 : 60);
      continue;
    }
    // 6) 什么都没有（无对白、无选项、无浮层）→ 等一拍再看
    await page.waitForTimeout(250);
  }
  stats.timeout = true;
  stats.trail = trail.slice(-40);
  stats.secs = ((Date.now() - t0) / 1000).toFixed(1);
  return stats;
}

function report(r) {
  console.log(`[play] ${r.persona.padEnd(7)} → ${r.endingId || (r.stuckAt ? "卡在 " + r.stuckAt : "未到结局")}` +
    ` | ${r.steps} 步 / ${r.secs}s | 玩法 跳过${r.skipped} 完成${r.played} 兜底${r.fallback} 快通${r.fastAuto}` +
    ` | 选项${r.choices} 回信${r.letters} | 浮层节点 ${r.layerNodes ? r.layerNodes.size : 0}` +
    (r.seniorLine ? " | 学姐线已进入" : "") + ` | 控制台错误 ${r.errors.length}`);
  if (!r.endingId) console.log(`       最近节点：${(r.trail || []).slice(-25).join(" → ")}` +
    (r.stuckLayers ? `\n       卡住时的浮层：${r.stuckLayers.join(" / ")}` : ""));
  if (r.fbLayers && r.fbLayers.length) console.log(`       未自动收尾的浮层：${r.fbLayers.join("，")}`);
}

test(`五画像真人试玩（${engineName}：${ONLY.join("/")}）`, { timeout: 900_000 }, async () => {
  const browser = await engine.launch();
  const allErrors = [];

  /* 每个画像独立 context：localStorage 互不干扰（快通/二周目画像要注入「全节点已读」）。
     默认并行——试玩绝大部分时间在等动画/等打字，并行不会互相污染，
     墙钟时间从「五条相加」降到「最慢的一条」。排查复现时可 SEQ=1 串行。 */
  const runOne = async (persona) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      if (m.text().includes("Navigated away from page")) return;   // Firefox 刷新良性噪音
      errors.push("console: " + m.text());
    });
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => typeof Saves !== "undefined" && window.__game, null, { timeout: 15000 });
    const r = await runPersona(page, persona);
    r.errors = errors.slice(0, 5);
    allErrors.push(...errors.map((e) => `[${persona}] ${e}`));
    report(r);
    await ctx.close();
    return r;
  };

  let results;
  if (process.env.SEQ) {
    results = [];
    for (const p of ONLY) results.push(await runOne(p));
  } else {
    results = await Promise.all(ONLY.map(runOne));
  }
  await browser.close();

  for (const r of results) {
    assert.ok(!r.timeout, `${r.persona} 画像超过 ${MAX_STEPS} 步未到结局（疑似死循环）`);
    assert.ok(!r.stuckAt, `${r.persona} 画像卡在节点 ${r.stuckAt}（连续 11 步无进展）`);
    assert.ok(r.endingId, `${r.persona} 画像未走到任何结局`);
    assert.deepEqual(r.errors, [], `${r.persona} 画像控制台报错：${r.errors.join(" | ")}`);
  }
  assert.deepEqual(allErrors, [], `控制台错误 ${allErrors.length} 条：\n  ${allErrors.slice(0, 10).join("\n  ")}`);

  /* 画像特有断言：防止「测试跑了但覆盖是假的」——
     快通画像必须全程保持快进且真的吃到已读快通；二周目画像必须走进学姐线入口（v3.4.25 门槛改动的 e2e 覆盖） */
  const by = Object.fromEntries(results.map((r) => [r.persona, r]));
  if (by.fast) {
    assert.ok(by.fast.skipOn, "快通画像结局时 skipMode 被关掉——「已读快通」覆盖不成立（setup 顺序是否又被改回去了？）");
    assert.ok(by.fast.fastAuto > 0, `快通画像一次自动收尾都没有（fastAuto=${by.fast.fastAuto}）——已读快通（v3.4.13）失效？`);
  }
  if (by.loop) {
    assert.ok(by.loop.seniorLine, "二周目画像没走进学姐线入口——门槛改动（playCount>=1 || loopCount>=2）没有 e2e 覆盖");
  }
  console.log(`[play] 全部到达结局：${results.map((r) => `${r.persona}=${r.endingId}`).join("，")}` +
    (by.fast ? ` | 快通自动收尾 ${by.fast.fastAuto} 次` : "") +
    (by.loop ? ` | 学姐线入口 ${by.loop.seniorLine ? "已进入" : "未进入"}` : ""));
});
