/* 交互生命周期：集中取消异步浮层，防止读档或返回标题后继续运行。 */
(function () {
  "use strict";

  const active = new Map();
  let nextId = 1;

  function register(layer, cancel) {
    const id = nextId++;
    const controller = new AbortController();
    const entry = { layer, cancel, controller };
    active.set(id, entry);

    return {
      id,
      signal: controller.signal,
      finish() {
        active.delete(id);
        if (!controller.signal.aborted) controller.abort();
      },
    };
  }

  function cancelAll() {
    for (const [id, entry] of Array.from(active.entries())) {
      active.delete(id);
      if (!entry.controller.signal.aborted) entry.controller.abort();
      entry.cancel?.();
    }
  }

  window.GameLifecycle = { register, cancelAll, activeCount: () => active.size };
})();
