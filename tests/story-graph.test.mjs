import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(`${source}\nthis.__out = { SCRIPT, START_NODE };`, context);
const { SCRIPT, START_NODE } = context.__out;
const ids = new Set(Object.keys(SCRIPT));

function collectRefs(value, refs, from) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(item => collectRefs(item, refs, from));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string" && ids.has(child)) refs.push([from, child]);
    collectRefs(child, refs, from);
  }
}

const refs = [];
for (const [id, node] of Object.entries(SCRIPT)) collectRefs(node, refs, id);

test("剧情引用全部指向已定义节点", () => {
  const missing = refs.filter(([, target]) => !SCRIPT[target]);
  assert.deepEqual(missing, []);
});

test("主线和真结局入口可达", () => {
  const roots = [START_NODE, "true_end_entry"];
  const reachable = new Set(roots);
  const queue = roots.slice();
  while (queue.length) {
    const current = queue.shift();
    for (const [from, target] of refs) {
      if (from === current && SCRIPT[target] && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  for (const id of [
    "d1_night_stars", "d6_kite", "d7_firefly", "d8_compass",
    "d9_metronome", "d10_eclipse", "d11_kaleido", "d12_sundial",
    "d13_mosaic", "d14_stele", "d15_chess", "common_day3_afternoon",
    "common_day5_afternoon"
  ]) assert.equal(reachable.has(id), true, `${id} 不可达`);
});
