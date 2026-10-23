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
test("SCRIPT 内 memory id 全局唯一（v3.3.2 契约）", () => {
  // v3.3.2 修复：7 组分支互斥记忆共用 id，saveMemory 按 id 去重导致后解锁分支的记忆
  // 被吞（图鉴永远缺分支记忆）。契约：同一 memory id 只能出现一次。
  const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
  const ids = [...script.matchAll(/memory: \{[^}]*?id: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 100, `memory 字段数量异常（${ids.length}）`);
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
