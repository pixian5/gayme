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
  for (const asset of ["favicon.svg", "js/saves.js", "js/script.js", "js/minigames.js", "js/gamekit.js", "js/games/afterword.js", "js/games/senses.js", "js/engine.js", "css/style.css", "fonts/NotoSerifSC-Regular.woff2", "fonts/NotoSerifSC-Bold.woff2"]) {
    assert.equal(fs.existsSync(new URL(`../${asset}`, import.meta.url)), true, asset);
  }
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
