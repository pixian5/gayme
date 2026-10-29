import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
const engine = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const minigames = fs.readFileSync(new URL("../js/minigames.js", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = fs.readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();

test("版本和静态资源一致", () => {
  assert.match(html, new RegExp(`v${version.replaceAll(".", "\\.")}`));
  assert.match(engine, new RegExp(`v${version.replaceAll(".", "\\.")}`));
  assert.equal(packageJson.version, version);
  for (const asset of ["favicon.svg", "js/saves.js", "js/script.js", "js/minigames.js", "js/game-help.js", "js/gamekit.js", "js/games/afterword.js", "js/games/senses.js", "js/games/craft.js", "js/games/nature.js", "js/games/perception.js", "js/games/mechanism.js", "js/games/imagery.js", "js/games/direct.js", "js/ui/panels.js", "js/engine.js", "css/style.css", "css/games.css", "fonts/NotoSerifSC-Regular.woff2", "fonts/NotoSerifSC-Bold.woff2", "audio/bgm/daily.ogg", "audio/bgm/bright.ogg", "audio/bgm/sad.ogg", "audio/bgm/calm.ogg", "audio/bgm/active.ogg", "assets/cg/cg_meet_shiyu.webp", "assets/cg/cg_meet_xiazhi.webp", "assets/cg/cg_meet_sunian.webp", "assets/cg/cg_letter.webp", "assets/cg/cg_sportsmeet.webp", "assets/cg/cg_festival.webp", "assets/cg/cg_shiyu_good.webp", "assets/cg/cg_xiazhi_good.webp", "assets/cg/cg_sunian_good.webp", "assets/cg/cg_senior_shadow.webp", "assets/cg/cg_true.webp"]) {
    assert.equal(fs.existsSync(new URL(`../${asset}`, import.meta.url)), true, asset);
  }
});

test("Service Worker 预缓存与页面版本化资源一一对应", () => {
  // 页面用 ?v= 做缓存击穿，SW 预缓存也必须用完全相同的地址；
  // 否则 install 阶段会按裸路径再抓一遍，首访把同批 JS/CSS 下载两次。
  const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const block = sw.split("const PRECACHE = [")[1].split("];")[0];
  const entries = [...block.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const pageAssets = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+?)\?v=[\d.]+"/g)].map(match => match[1]);
  assert.ok(pageAssets.length >= 16, `页面版本化资源数量异常：${pageAssets.length}`);
  for (const asset of pageAssets) {
    assert.ok(entries.includes(`${asset}?v=${version}`), `PRECACHE 缺少与页面完全一致的地址：${asset}?v=${version}`);
  }
  const appEntries = entries.filter(entry => /^(?:js|css)\//.test(entry));
  const versionSuffix = new RegExp("\\?v=" + version.replaceAll(".", "\\.") + "$");
  for (const entry of appEntries) assert.match(entry, versionSuffix, entry);
  assert.equal(new Set(appEntries.map(entry => entry.replace(/\?v=[\d.]+/, ""))).size, appEntries.length, "PRECACHE 出现重复应用代码路径");
});

test("声明的中文字体有本地 @font-face 支撑", () => {
  // style.css 使用 "Noto Serif SC" 时，必须存在自托管字体，否则会静默回退到系统字体
  assert.match(css, /font-family:\s*"Noto Serif SC"/);
  for (const weight of ["400", "700"]) {
    assert.match(
      css,
      new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*"Noto Serif SC"[^}]*font-weight:\\s*${weight}[^}]*\\}`),
      `缺少 ${weight} 字重的 @font-face`,
    );
  }
  assert.match(css, /@font-face\s*\{[^}]*fonts\/NotoSerifSC-Regular\.woff2/);
  assert.match(css, /@font-face\s*\{[^}]*fonts\/NotoSerifSC-Bold\.woff2/);
});

test("基础控件具备可访问名称", () => {
  for (const id of ["dialog-box", "dialog-text", "choices", "overlay", "overlay-body", "ending-screen"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(engine, /aria-live/);
});

test("所有剧情背景都有 CSS 场景", () => {
  const scenes = [...script.matchAll(/bg:\s*"([\w-]+)"/g)].map(match => match[1]);
  for (const scene of new Set(scenes)) assert.match(css, new RegExp(`\\.scene-${scene}(?:\\W|$)`), scene);
});

test("场景切换按样式表规则校验背景", () => {
  assert.match(engine, /function hasSceneStyle\(bg\)[\s\S]*?sheet\.cssRules/);
  assert.doesNotMatch(engine, /document\.querySelector\(`\.scene-\\$\{CSS\.escape\(bg\)\}`\)/);
});

test("涂色玩法把目标颜色呈现给玩家", () => {
  assert.match(minigames, /el\.style\.background = t\.color/);
  assert.match(minigames, /目标色块/);
});

test("延迟互动层出现前不会跳过剧情", () => {
  assert.match(engine, /function advance\(\) \{\s+if \(state\.pendingInteraction \|\| hasActiveInteractionLayer\(\)\) return;/);
  assert.match(engine, /if \(state\.pendingInteraction \|\| hasActiveInteractionLayer\(\)\) return;[\s\S]*?if \(node\.next\) gotoNode\(node\.next\);/);
  assert.match(engine, /state\.pendingInteraction = true;[\s\S]*?GameKit\?\.run\("triage", node\.triage, nodeId\)/);
  assert.match(engine, /state\.pendingInteraction = true;[\s\S]*?GameKit\?\.run\("wall", node\.wall, nodeId\)/);
  assert.match(engine, /state\.pendingInteraction = true;[\s\S]*?GameKit\?\.run\("proofread", node\.proofread, nodeId\)/);
  assert.match(engine, /state\.pendingInteraction = false;[\s\S]*?showLetter\(node\.letter, nodeId\)/);
});

test("自动存档连续失败会提示并引导导出备份", () => {
  // v3.4.28：配额满 / 隐私模式下 autoSave 静默失败会让玩家误以为进度已存，
  // 刷新后回到旧位置；连续 2 次失败必须提示一次（同会话不重复刷屏）。
  assert.match(engine, /if \(Saves\.autoSave\(snapshot\(\)\)\) \{\s+autoSaveFailStreak = 0;/);
  assert.match(engine, /autoSaveFailStreak >= 2 && !autoSaveWarned/);
  assert.match(engine, /flashHint\("自动存档不可用：请在设置 → 数据备份 导出 JSON"\)/);
});

test("立绘位图清单与素材文件一一对应", () => {
  // v3.4.29：PORTRAIT_BITMAPS 里每个 id 都必须有对应的透明 webp，
  // 且该 id 在 SVG 兜底名单 PORTRAITS 中存在，否则换机会静默不显示立绘。
  const block = engine.match(/const PORTRAIT_BITMAPS = new Set\(\[([^\]]*)\]\);/) || [];
  const ids = [...(block[1] || "").matchAll(/"([\w-]+)"/g)].map(match => match[1]);
  assert.ok(ids.length >= 5, `PORTRAIT_BITMAPS 数量异常：${ids.length}`);
  for (const id of ids) {
    assert.equal(fs.existsSync(new URL(`../assets/portraits/${id}.webp`, import.meta.url)), true, `缺少立绘 ${id}.webp`);
    assert.match(script, new RegExp(`\\n  ${id}: \`<svg`), `PORTRAITS 缺少 ${id} 的 SVG 兜底`);
  }
});

test("立绘走 Service Worker 媒体缓存", () => {
  // 立绘约 100KB/张，走 sakura-media 运行时缓存可跨版本复用，不必每次发版重下；
  // 若误走核心层，bump 版本就会让老玩家把整组立绘重新下载一遍。
  const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /url\.pathname\.includes\("\/assets\/portraits\/"\)/);
  assert.match(sw, /const MEDIA_CACHE = /);
});
