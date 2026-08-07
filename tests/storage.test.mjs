import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/saves.js", import.meta.url), "utf8");
let store;
let failWrites;
let failRemoves;
let Saves;

function loadSaves() {
  store = new Map();
  failWrites = false;
  failRemoves = false;
  const localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw new Error("quota");
      store.set(key, value);
    },
    removeItem: key => {
      if (failRemoves) throw new Error("denied");
      store.delete(key);
    },
  };
  const context = { localStorage, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.__Saves = Saves;`, context);
  Saves = context.__Saves;
}

test.beforeEach(loadSaves);

test("槽位边界和损坏结构安全处理", () => {
  assert.equal(Saves.data.slots.length, 9);
  assert.equal(Saves.save(-1, { nodeId: "x" }), false);
  assert.equal(Saves.save(9, { nodeId: "x" }), false);
  assert.equal(Saves.load(9), null);
  store.set("sakura_letters_keywords_v2", "{}");
  assert.deepEqual(Array.from(Saves.getKeywords()), []);
  store.set("sakura_letters_scent_v2", "[]");
  const scents = Saves.getScents();
  assert.deepEqual(Object.keys(scents), ["collected", "recalled"]);
  assert.deepEqual(Object.keys(scents.collected), []);
  assert.deepEqual(Object.keys(scents.recalled), []);
});

test("存档和回声写入失败会回滚", () => {
  const snapshot = { nodeId: "prologue_1", variables: { affection: {} }, history: [] };
  assert.equal(Saves.save(1, snapshot), true);
  failWrites = true;
  assert.equal(Saves.save(1, { nodeId: "prologue_2" }), false);
  assert.equal(Saves.load(1).nodeId, "prologue_1");
  failWrites = false;
  assert.equal(Saves.saveEcho("echo", "测试"), true);
  failWrites = true;
  assert.equal(Saves.acknowledgeEcho("echo", "admit"), false);
  assert.equal(Saves.getEcho("echo").acknowledged, undefined);
});

test("清空失败返回 false，成功后恢复默认状态", () => {
  failRemoves = true;
  assert.equal(Saves.clearAll(), false);
  failRemoves = false;
  assert.equal(Saves.clearAll(), true);
  assert.equal(Saves.data.slots.length, 9);
  assert.deepEqual(Array.from(Saves.endings.unlocked), []);
});

test("备份导出、导入和版本校验", () => {
  assert.equal(Saves.save(2, { nodeId: "prologue_1", variables: {}, history: [] }), true);
  const backup = Saves.exportData();
  assert.equal(backup.schemaVersion, 3);
  assert.equal(typeof backup.records.sakura_letters_saves_v2, "object");

  assert.equal(Saves.clearAll(), true);
  assert.equal(Saves.load(2), null);
  assert.equal(Saves.importData(backup), true);
  assert.equal(Saves.load(2).nodeId, "prologue_1");
  assert.equal(Saves.importData({ schemaVersion: 999, records: {} }), false);
  assert.equal(Saves.importData({ schemaVersion: 3, records: { unknown: true } }), false);
});
