/* ========================================
   樱时信笺 · 玩法框架基座 (gamekit.js) v2.8.0
   —— 统一玩法浮层的创建、进度显示、结果收尾与生命周期注册。
   玩法通过 GameKit.register(type, handler) 注册；
   engine.js 的 gotoNode 通过 GameKit.run(type, config, nodeId) 触发。
   宿主能力（跳转 / 数值 / 提示 / 转义）由 engine.js 启动时经 attachHost 注入。
   v2.8.0：结果面板支持独立前缀（br / tc / fd …）、收尾支持记忆解锁、
           取消钩子（onCancel）替代各玩法自建的 MutationObserver 清理。
   v2.8.5：新增 types() 暴露注册表清单，引擎 gotoNode 用通用循环分发已注册玩法，
           不再为每个已迁移玩法手写分发分支。
   v2.9.1：createShell 支持 keepDialog（直跳型玩法保持对话框可见的原行为）；
           暴露 host 宿主桥对象，直跳型玩法的条件跳转 / 加成可直接调用宿主能力。
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
    isFastReplay: null,      // v3.4.13：该节点当前是否应「已读快通」（快进中且已读）
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

  /* 已注册玩法类型清单（按注册顺序），供引擎通用分发循环遍历 */
  function types() {
    return [...registry.keys()];
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
       onCancel,  // 读档 / 返回标题时的额外清理（取消 rAF、移除窗口监听等）
       help       // v3.4.16：本局玩法说明 { how, goal, tip? } —— 统一渲染可折叠说明栏
     } */
  function createShell(options) {
    const kind = options.kind;
    const prefix = options.prefix || kind;
    const nodeId = options.nodeId;
    const layer = document.createElement("div");
    layer.className = `${kind}-layer`;
    layer.id = `${kind}-layer`;

    // 直跳型玩法（collage/photo/rhythm 等）原本不隐藏对话框，用 keepDialog 保持原行为
    if (!options.keepDialog) document.getElementById("dialog-box")?.classList.add("hidden");
    document.getElementById("game").appendChild(layer);

    let cleaned = false;
    let lifecycle = null;
    // 读档 / 返回标题时，由统一生命周期销毁浮层并执行取消钩子
    if (window.GameLifecycle?.register) {
      lifecycle = window.GameLifecycle.register(layer, () => { cleanup(); });
    }

    /* v3.4.16 统一说明栏 + 跳过：所有玩法自动获得
       —— 「怎么看懂」：折叠式操作/目标说明（js/game-help.js 按 kind 取，可被 options.help 覆盖）
       —— 「怎么脱身」：跳过按钮 → 中性收尾（不写记录、不加成，直达 next） */
    /* 注意：玩法普遍在 createShell 后执行 layer.innerHTML = ...，会覆盖 layer 内部节点，
       因此说明栏挂到 #game 下作为兄弟节点（随 cleanup 一并移除），不放进 layer 内。 */
    const helpData = options.help || window.GAME_HELP?.[kind] || window.GAME_HELP?.[nodeId];
    const helpBar = attachHelpBar(kind, helpData, () => {
      if (cleaned) return;
      cleanup();
      jumpNext(nodeId, undefined);
    });

    /* v3.4.13 已读快通：快进中且已读的玩法，300ms 后自动中性收尾（无加成/不写记录，
       直接走节点 next）。点击提示条可取消、保留这次玩法——想重温的玩家不被剥夺。 */
    let fastCancel = null;
    if (host.isFastReplay?.(nodeId)) {
      const bar = document.createElement("div");
      bar.className = "fast-replay-bar";
      bar.textContent = "⟲ 已读 · 快通中…（点击保留这次玩法）";
      /* 与说明栏同理：玩法 handler 会在 createShell 后执行 layer.innerHTML = ...，
         挂 layer 内会被覆盖——挂 #game 作兄弟节点，cleanup 时一并移除 */
      (document.getElementById("game") || document.body).appendChild(bar);
      let fastTimer = setTimeout(() => {
        if (cleaned || !layer.isConnected) return;
        cleanup();
        jumpNext(nodeId, undefined);
      }, 300);
      fastCancel = () => { clearTimeout(fastTimer); bar.remove(); };
      bar.addEventListener("click", fastCancel, { once: true });
    }

    /* 幂等清理：移除浮层 → 执行取消钩子 → 注销生命周期 */
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      fastCancel?.();   // v3.4.13：任何清理路径都先撤快通定时器
      helpBar?.remove(); // v3.4.16：说明栏与浮层同生共死
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
      // 结果音效（v2.9.7）：完美 / 失败两档，其余静默
      window.GameSfx?.play(matched.tag === "perfect" ? "success"
        : matched.tag === "miss" ? "fail" : null);
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

    /* v3.4.21 确认按钮提示：按钮灰置（disabled）时补 title/aria-disabled 说明，
       让玩家知道「还要做什么才能点」。观察 layer 内的按钮状态变化，动态同步文案。 */
    const CONFIRM_SEL = 'button[class*="-confirm"], button[class*="-submit"], button[class*="-finish"]';
    function syncConfirmHints() {
      layer.querySelectorAll(CONFIRM_SEL).forEach((btn) => {
        const label = (btn.textContent || "").trim().slice(0, 8) || "确认";
        if (btn.disabled) {
          if (!btn.dataset.hintApplied) {
            btn.dataset.hintApplied = "1";
            btn.title = `还没完成交互——${label} 目前不可用`;
            btn.setAttribute("aria-disabled", "true");
            btn.classList.add("confirm-locked");
          }
        } else if (btn.dataset.hintApplied) {
          delete btn.dataset.hintApplied;
          btn.title = "";
          btn.removeAttribute("aria-disabled");
          btn.classList.remove("confirm-locked");
        }
      });
    }
    if (typeof MutationObserver === "function") {
      const mo = new MutationObserver(() => syncConfirmHints());
      mo.observe(layer, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled"] });
      syncConfirmHints();
      // 随 cleanup 断开，避免泄漏
      const prevCancel = options.onCancel;
      options.onCancel = () => { try { mo.disconnect(); } catch {} ; prevCancel?.(); };
    }

    return { layer, kind, prefix, nodeId, cleanup, finish, signal: lifecycle?.signal };
  }

  /* v3.4.16 统一说明栏（操作 + 目标）+ 跳过按钮
     help = { how: "怎么操作", goal: "目标是什么", tip: "可选补充" }
     说明栏默认展开「首次遇到该玩法」，之后折叠（localStorage 记 kind 集合） */
  const HELP_SEEN_KEY = "sakura_help_seen_v1";
  function helpSeenSet() {
    try { return new Set(JSON.parse(localStorage.getItem(HELP_SEEN_KEY) || "[]")); }
    catch { return new Set(); }
  }
  function markHelpSeen(kindName) {
    try {
      const set = helpSeenSet(); set.add(kindName);
      localStorage.setItem(HELP_SEEN_KEY, JSON.stringify([...set]));
    } catch {}
  }
  function attachHelpBar(kindName, help, onSkip) {
    // 单例：任何时刻只允许一个说明栏（跳转/重进玩法时清掉残留）
    document.querySelectorAll(".game-help-bar").forEach((b) => b.remove());
    if (!help || (!help.how && !help.goal)) return null;
    const seen = helpSeenSet().has(kindName);

    const bar = document.createElement("div");
    bar.className = "game-help-bar" + (seen ? " collapsed" : "");
    bar.innerHTML = `
      <div class="gh-head">
        <span class="gh-icon">?</span>
        <span class="gh-title">怎么玩</span>
        <button class="gh-toggle" type="button">${seen ? "展开" : "收起"}</button>
      </div>
      <div class="gh-body">
        ${help.how ? `<div class="gh-row"><b>操作</b>${escapeHtml(help.how)}</div>` : ""}
        ${help.goal ? `<div class="gh-row"><b>目标</b>${escapeHtml(help.goal)}</div>` : ""}
        ${help.tip ? `<div class="gh-row gh-tip"><b>提示</b>${escapeHtml(help.tip)}</div>` : ""}
        ${help.last ? `<div class="gh-row gh-last"><b>收尾</b>${escapeHtml(help.last)}</div>` : ""}
      </div>
      <button class="gh-skip" type="button">跳过这个玩法</button>
    `;
    const body = bar.querySelector(".gh-body");
    const toggle = bar.querySelector(".gh-toggle");
    const syncBody = () => { body.style.display = bar.classList.contains("collapsed") ? "none" : ""; };
    syncBody();
    toggle.addEventListener("click", () => {
      const collapsed = bar.classList.toggle("collapsed");
      toggle.textContent = collapsed ? "展开" : "收起";
      syncBody();
      if (collapsed) markHelpSeen(kindName);
    });
    if (!seen) markHelpSeen(kindName);

    bar.querySelector(".gh-skip").addEventListener("click", (e) => {
      e.stopPropagation();
      onSkip();
    });
    (document.getElementById("game") || document.body).appendChild(bar);
    return bar;
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

  window.GameKit = { attachHost, register, has, types, run, createShell, showReading, formatProgress, escapeHtml, flashHint, attachHelpBar, host };
})();