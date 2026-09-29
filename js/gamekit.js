/* ========================================
   樱时信笺 · 玩法框架基座 (gamekit.js) v2.8.0
   —— 统一玩法浮层的创建、进度显示、结果收尾与生命周期注册。
   玩法通过 GameKit.register(type, handler) 注册；
   engine.js 的 gotoNode 通过 GameKit.run(type, config, nodeId) 触发。
   宿主能力（跳转 / 数值 / 提示 / 转义）由 engine.js 启动时经 attachHost 注入。
   v2.8.0：结果面板支持独立前缀（br / tc / fd …）、收尾支持记忆解锁、
           取消钩子（onCancel）替代各玩法自建的 MutationObserver 清理。
   ======================================== */
(function () {
  "use strict";

  const registry = new Map();

  /* ---------- 宿主桥（由 engine.js 注入） ---------- */
  const host = {
    gotoNode: null,          // 剧情跳转
    applyAdd: null,          // 应用数值加成
    updateHeartBar: null,    // 刷新好感度心条
    flashHint: null,         // 顶部提示（记忆解锁等）
    escapeHtml: (value) => String(value == null ? "" : value),
  };

  function attachHost(partial) {
    if (!partial) return;
    for (const key in host) {
      if (typeof partial[key] === "function") host[key] = partial[key];
    }
  }

  function escapeHtml(value) {
    return host.escapeHtml(value);
  }

  /* 顶部提示（记忆解锁、心跳命中反馈等） */
  function flashHint(message) {
    host.flashHint?.(message);
  }

  /* ---------- 注册与执行 ---------- */
  function register(type, handler) {
    if (typeof type !== "string" || !type || typeof handler !== "function") return false;
    registry.set(type, handler);
    return true;
  }

  function has(type) {
    return registry.has(type);
  }

  function run(type, config, nodeId) {
    const handler = registry.get(type);
    if (!handler) {
      console.error("[GameKit] 未注册的玩法类型:", type);
      return false;
    }
    handler(config || {}, nodeId);
    return true;
  }

  /* ---------- 浮层外壳 ---------- */
  /* 统一负责：创建浮层、隐藏对话框、注册生命周期、结果面板与跳转收尾。
     玩法只专注自己的交互主体（card 内部 UI 与判定）。
     options = {
       kind,      // 浮层类名：<kind>-layer
       prefix,    // 结果面板类名前缀，默认与 kind 相同（历史玩法用 br / tc / fd 等缩写）
       nodeId,
       onCancel   // 读档 / 返回标题时的额外清理（取消 rAF、移除窗口监听等）
     } */
  function createShell(options) {
    const kind = options.kind;
    const prefix = options.prefix || kind;
    const nodeId = options.nodeId;
    const layer = document.createElement("div");
    layer.className = `${kind}-layer`;
    layer.id = `${kind}-layer`;

    document.getElementById("dialog-box")?.classList.add("hidden");
    document.getElementById("game").appendChild(layer);

    let cleaned = false;
    let lifecycle = null;
    // 读档 / 返回标题时，由统一生命周期销毁浮层并执行取消钩子
    if (window.GameLifecycle?.register) {
      lifecycle = window.GameLifecycle.register(layer, () => { cleanup(); });
    }

    /* 幂等清理：移除浮层 → 执行取消钩子 → 注销生命周期 */
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      layer.remove();
      try {
        options.onCancel?.();
      } catch (err) {
        console.error("[GameKit] onCancel 清理异常:", err);
      }
      lifecycle?.finish();
    }

    /* 统一收尾：写入记录 → 应用数值/性格/记忆 → 展示结果面板 → 关闭并跳转
       result: { label, text, add?, personality?, memory?, next?, record? } */
    function finish(result) {
      const matched = result || {};
      if (typeof matched.record === "function") matched.record();
      if (matched.add) {
        host.applyAdd?.(matched.add);
        host.updateHeartBar?.();
      }
      if (matched.personality && window.Saves?.addPersonality) {
        for (const dim in matched.personality) window.Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory && window.Saves && !window.Saves.isMemoryUnlocked(matched.memory.id)) {
        window.Saves.saveMemory(matched.memory.id, matched.memory.text);
        host.flashHint?.(`✦ 新记忆：${matched.memory.title}`);
      }
      showReading({
        layer,
        prefix,
        matched,
        onClose: () => { cleanup(); jumpNext(nodeId, matched.next); },
      });
    }

    return { layer, kind, prefix, nodeId, cleanup, finish, signal: lifecycle?.signal };
  }

  /* 关闭浮层后的统一跳转：优先使用结果指定的 next，否则走节点默认 next */
  function jumpNext(nodeId, override) {
    const node = typeof SCRIPT !== "undefined" ? SCRIPT[nodeId] : null;
    const jumpTo = override || (node && node.next);
    if (jumpTo) host.gotoNode?.(jumpTo);
  }

  /* 统一结果面板（prefix 决定类名前缀，如 br / tc / fd / postcard） */
  function showReading({ layer, prefix, matched, onClose }) {
    const reading = document.createElement("div");
    reading.className = `${prefix}-reading`;
    reading.innerHTML = `<div class="${prefix}-reading-title">${escapeHtml(matched.label || "")}</div>
      <div class="${prefix}-reading-text">${escapeHtml(matched.text || "")}</div>
      <button class="${prefix}-reading-close" type="button">继续</button>`;
    reading.querySelector(`.${prefix}-reading-close`).addEventListener("click", () => {
      reading.remove();
      onClose();
    });
    layer.appendChild(reading);
  }

  /* ---------- 进度文案 ---------- */
  function formatProgress(count, total, verb) {
    return `${verb || "已处理"} ${count} / ${total}`;
  }

  window.GameKit = { attachHost, register, has, run, createShell, showReading, formatProgress, escapeHtml, flashHint };
})();