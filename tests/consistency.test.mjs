import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

/* v2.8.0 新增：版本号与脚本加载的一致性契约，避免发布时漏改版本或漏引脚本 */

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = fs.readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();

test("版本号在 VERSION / index.html / package.json 三处一致", () => {
  assert.match(version, /^\d+\.\d+\.\d+$/, "VERSION 必须是 x.y.z 格式");
  assert.equal(packageJson.version, version, "package.json 版本与 VERSION 不一致");

  // 资源版本参数（css 与全部脚本）：?v=x.y.z
  const assetVersions = [...html.matchAll(/\?v=(\d+\.\d+\.\d+)/g)].map(match => match[1]);
  assert.ok(assetVersions.length >= 7, `index.html 的 ?v= 版本参数过少（${assetVersions.length}）`);
  for (const found of new Set(assetVersions)) {
    assert.equal(found, version, `index.html 中 ?v=${found} 与 VERSION(${version}) 不一致`);
  }

  // 标题页版本展示
  assert.match(html, new RegExp(`v${version.replaceAll(".", "\\.")} · Demo`), "标题页版本号未同步");

  // engine.js 头注释含当前版本行（v3.4.8 契约：文档先行时防止 VERSION 落后漂移）
  const engineHead = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8").split("*/")[0];
  assert.match(engineHead, new RegExp(`v${version.replaceAll(".", "\\.")}：`), "engine.js 头注释缺少当前版本行（先 bump 再写说明）");

  // 更新日志首条 = 当前版本（v3.4.10 契约：关于页展示的 changelog 不许过期）
  const engineFull = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
  const changelogHead = engineFull.match(/GAME_CHANGELOG = \[\s*\{ ver: "([\d.]+)"/);
  assert.ok(changelogHead, "engine.js 缺少 GAME_CHANGELOG 常量");
  assert.equal(changelogHead[1], version, `更新日志首条 v${changelogHead[1]} 与 VERSION(${version}) 不一致——bump 后请在 GAME_CHANGELOG 追加`);
});

test("js 目录下所有脚本都在 index.html 中加载，且 engine.js 最后加载", () => {
  // v3.3.0：支持 <script src> 与 <script defer src>（defer 化后属性顺序变化）
  const loaded = [...html.matchAll(/<script[^>]*src="([^"?]+)/g)].map(match => match[1]);
  const rootFiles = fs.readdirSync(new URL("../js", import.meta.url))
    .filter(name => name.endsWith(".js"))
    .map(name => `js/${name}`);
  const gameFiles = fs.readdirSync(new URL("../js/games", import.meta.url))
    .filter(name => name.endsWith(".js"))
    .map(name => `js/games/${name}`);

  for (const file of [...rootFiles, ...gameFiles]) {
    assert.ok(loaded.includes(file), `${file} 未在 index.html 中加载`);
  }
  assert.equal(loaded[loaded.length - 1], "js/engine.js", "engine.js 必须最后加载");
});

test("free letter 回信分支的 memory 必须为字符串 id（v3.3.0 契约）", () => {
  // 引擎 showLetter 只支持字符串 memory id（Saves.saveMemory 严格 === 比较）；
  // 对象格式 { id, text } 会导致记忆永远无法解锁。此前 4 组 matchings 曾用对象格式。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const bad = [...script.matchAll(/\{ id: "[^"]*", keywords: \[[^\]]*\]\s*,([^}]*?)memory: \{/g)];
  assert.deepEqual(
    bad.map((m) => m[0].slice(0, 60)),
    [],
    "letter matchings 中出现对象格式 memory（应改为字符串 id）"
  );
});
test("SCRIPT 内 memory id 全局唯一（v3.3.4 契约：对象 + 字符串全覆盖）", () => {
  // v3.3.2 修复：7 组分支互斥记忆共用 id，saveMemory 按 id 去重导致后解锁分支的记忆
  // 被吞（图鉴永远缺分支记忆）。契约：同一 memory id 只能出现一次。
  // v3.3.4 补强：此前只匹配对象格式 memory，漏掉 inbox / perspective / letter 的字符串
  // memory；实测又发现 2 组 inbox 分支互斥记忆（诗雨·凌晨 / 夏织·教练）共用 id，同类问题。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const objectIds = [...script.matchAll(/memory: \{[^}]*?id: "([^"]+)"/g)].map((m) => m[1]);
  const stringIds = [...script.matchAll(/(?<![_\w])memory: "([^"]+)"/g)].map((m) => m[1]);
  const ids = [...objectIds, ...stringIds];
  assert.ok(ids.length >= 130, `memory 字段数量异常（${ids.length}）`);
  const seen = new Set();
  const dups = new Set();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  assert.deepEqual(
    [...dups],
    [],
    `存在重复 memory id（会吞掉后解锁的分支记忆）：${[...dups].join("、")}`
  );
});

test("每张 CG 至少有一个解锁点（v3.3.3 契约）", () => {
  // v3.3.3 修复：cg_festival「学园祭之夜」写了但从未有节点 cg_unlock 引用，
  // 玩家永远无法解锁。契约：CGS 中每张 CG 必须有至少一个 cg_unlock 引用。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const cgIds = [...script.matchAll(/id: "(cg_[a-z_]+)", title:/g)].map((m) => m[1]);
  assert.ok(cgIds.length >= 10, `CGS 数量异常（${cgIds.length}）`);
  const unlocked = new Set([...script.matchAll(/cg_unlock: "(cg_[a-z_]+)"/g)].map((m) => m[1]));
  const missing = cgIds.filter((id) => !unlocked.has(id));
  assert.deepEqual(missing, [], `存在无解锁点的 CG（玩家永远拿不到）：${missing.join("、")}`);
});

test("requires_memory 引用的记忆 id 必须存在于数据源（v3.3.4 契约）", () => {
  // 静态 memory 对象 id ∪ 字符串 memory（perspective / 回信）必须覆盖全部 requires_memory。
  // v3.3.4 修正：字符串 memory 的正则若不加左界，会把 `requires_memory: "..."` 本身也匹配进来，
  // 导致本契约恒真（自证）。用 (?<![_\w]) 排除前缀词，断言才有效。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const objIds = new Set([...script.matchAll(/memory: \{ [^}]*?id: "([^"]+)"/g)].map((m) => m[1]));
  const strIds = new Set([...script.matchAll(/(?<![_\w])memory: "([^"]+)"/g)].map((m) => m[1]));
  const all = new Set([...objIds, ...strIds]);
  const reqs = new Set([...script.matchAll(/requires_memory: "([^"]+)"/g)].map((m) => m[1]));
  const missing = [...reqs].filter((id) => !all.has(id));
  assert.deepEqual(missing, [], `requires_memory 引用不存在的记忆：${missing.join("、")}`);
});

test("剧情 personality 维度均在画像白名单内（v3.3.4 契约）", () => {
  // saves.js 的 PERSONALITY_DIMS / PERSONALITY_LABELS 定义画像完整 8 维度；
  // 剧情只能写这些维度，否则画像面板会出现游离维度、以英文键名显示（v3.3.4 已补齐映射）。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const saves = fs.readFileSync(new URL("../js/saves.js", import.meta.url), "utf8");
  const dims = JSON.parse(saves.match(/const PERSONALITY_DIMS = (\[[^\]]+\])/)[1]);
  const used = new Set();
  for (const m of script.matchAll(/personality: \{([^}]*)\}/g)) {
    for (const k of m[1].matchAll(/([a-z]+):/g)) used.add(k[1]);
  }
  const unknown = [...used].filter((d) => !dims.includes(d));
  assert.deepEqual(unknown, [], `personality 出现白名单外维度：${unknown.join("、")}`);
  // 每个白名单维度都要有中文标签，否则画像条形会显示英文
  const labelsBlock = saves.match(/const PERSONALITY_LABELS = \{([\s\S]*?)\};/)[1];
  const noLabel = dims.filter((d) => !new RegExp(`\\b${d}:`).test(labelsBlock));
  assert.deepEqual(noLabel, [], `PERSONALITY_LABELS 缺少维度标签：${noLabel.join("、")}`);
});

test("引擎引用的 settings 键必须都在 DEFAULT_SETTINGS 中（v3.3.5 契约）", () => {
  // v3.3.5 修复：playSfx 判断了根本不存在的 settings.sfx（恒假、形同虚设）。
  // 契约：engine.js 中所有 Saves.settings.<key> 引用都必须是 DEFAULT_SETTINGS 的已知键。
  const engine = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
  const saves = fs.readFileSync(new URL("../js/saves.js", import.meta.url), "utf8");
  const block = saves.match(/const DEFAULT_SETTINGS = Object\.freeze\(\{([\s\S]*?)\}\)/)[1];
  const known = new Set([...block.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]));
  assert.ok(known.size >= 5, `DEFAULT_SETTINGS 解析异常（${known.size}）`);
  const used = new Set([...engine.matchAll(/Saves\.settings\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
  const unknown = [...used].filter((k) => !known.has(k));
  assert.deepEqual(unknown, [], `engine.js 引用了未定义的 settings 键：${unknown.join("、")}`);
});

test("每个字符串 memory 都配有 memoryTitle（v3.3.7 契约）", () => {
  // v3.3.7：inbox / letter / perspective 的字符串 memory 此前无 title，图鉴卡片显示 id。
  // 契约：script.js 中每个字符串 memory（排除 requires_memory）都要有对应 memoryTitle，
  // 由引擎在 saveMemory 时传入，保证图鉴显示友好标题。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const memories = [...script.matchAll(/(?<![_\w])memory: "([^"]+)"/g)].map((m) => m[1]);
  const titles = [...script.matchAll(/memoryTitle: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(memories.length >= 15, `字符串 memory 数量异常（${memories.length}）`);
  assert.equal(memories.length, titles.length,
    `字符串 memory 数(${memories.length}) 与 memoryTitle 数(${titles.length}) 不一致——有记忆缺图鉴标题`);
  const seen = new Set();
  const dups = titles.filter((t) => (seen.has(t) ? true : (seen.add(t), false)));
  assert.deepEqual(dups, [], `memoryTitle 重复：${dups.join("、")}`);
});

test("loopText 数组结构规范（v3.3.7 契约）", () => {
  // 多周目文本 loopText 至少 2 段（初周 + 至少一个既视感变体），字符串成对不成孤；
  // 引擎按 idx = min(loopCount, len-1) 取文本，段数不足会退化成始终显示原句。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const arrays = [...script.matchAll(/loopText: \[([\s\S]*?)\]/g)].map((m) => m[1]);
  assert.ok(arrays.length >= 45, `loopText 节点数量异常（${arrays.length}）`);
  const bad = [];
  for (const body of arrays) {
    const quotes = (body.match(/"/g) || []).length;
    if (quotes % 2 !== 0) bad.push("引号不成对");
    else if (quotes / 2 < 2) bad.push(`仅 ${quotes / 2} 段`);
  }
  assert.deepEqual(bad, [], `loopText 结构异常：${bad.join("、")}`);
});

test("每个玩法都有 GAME_HELP 说明（v3.4.16 契约）", () => {
  const help = fs.readFileSync(new URL("../js/game-help.js", import.meta.url), "utf8");
  const gamesDir = new URL("../js/games/", import.meta.url);
  const registered = new Set();
  for (const f of fs.readdirSync(gamesDir)) {
    if (!f.endsWith(".js")) continue;
    for (const m of fs.readFileSync(new URL(f, gamesDir), "utf8").matchAll(/register\("([\w-]+)"/g)) {
      registered.add(m[1]);
    }
  }
  const missing = [...registered].filter((t) => !new RegExp(`\\b${t}:\\s*\\{\\s*how:`).test(help));
  assert.deepEqual(missing, [], `以下玩法缺少说明（how/goal）：${missing.join("、")}`);
  assert.ok(registered.size >= 85, `注册玩法数异常（${registered.size}）`);
});
