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
  const loaded = [...html.matchAll(/<script src="([^"?]+)/g)].map(match => match[1]);
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