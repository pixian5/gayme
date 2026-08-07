import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/lifecycle.js", import.meta.url), "utf8");

test("生命周期令牌可完成并批量取消", () => {
  const context = { window: {}, AbortController };
  vm.createContext(context);
  vm.runInContext(source, context);
  const lifecycle = context.window.GameLifecycle;
  let cancelled = 0;
  const first = lifecycle.register({}, () => { cancelled += 1; });
  const second = lifecycle.register({}, () => { cancelled += 1; });
  assert.equal(lifecycle.activeCount(), 2);
  first.finish();
  assert.equal(lifecycle.activeCount(), 1);
  assert.equal(first.signal.aborted, true);
  lifecycle.cancelAll();
  assert.equal(cancelled, 1);
  assert.equal(second.signal.aborted, true);
  assert.equal(lifecycle.activeCount(), 0);
});
