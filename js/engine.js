/* ========================================
   樱时信笺 · 游戏引擎 (engine.js) v2
   新增：日程UI / 心条 / 关键词 / 信件 / CG图鉴
        / 流程图 / 回忆 / BGM / 多周目 / 迷你游戏
   v2.7.9：接入玩法框架基座 GameKit（js/gamekit.js），
           后日谈 5 个玩法迁至 js/games/afterword.js
   v2.8.0：身心感知 8 个玩法迁至 js/games/senses.js；
           已迁移玩法统一经 window.GameKit.run(type, config, nodeId) 触发
   v2.8.1：内容纵深——沈屿家庭线铺垫与三人旧交回忆（节点数据见 js/script.js）
   v2.8.2：长链分章呼吸点与学姐中段线索（节点数据见 js/script.js）
   v2.8.3：工程瘦身——saves.js 引入 recordStore/unlockListStore 工厂（1918→1208 行）；
           自托管 Noto Serif SC 子集字体（fonts/，约 320KB/字重）
   v2.8.4：玩法模板减量（第 1 批 / 共 6 批）——手作与器物 13 个玩法迁至
           js/games/craft.js（engine.js 16172→14612 行）
   v2.8.5：通用玩法分发——gotoNode 以 GameKit.types() 循环统一分发已注册玩法，
           删除 23 个逐类型手写分支（triage/wall/proofread 特殊分支保留）
   v2.8.6：玩法模板减量（第 2 批 / 共 6 批）——自然天象 13 个玩法迁至
           js/games/nature.js（astronomy/wind/rain/constellation/foggy/kite/orbit/
           firefly/windchime/starchart/eclipse/celestial/vane）
   v2.8.7：玩法模板减量（第 3 批 / 共 6 批）——知觉与心绪 14 个玩法迁至
           js/games/perception.js（tarot/dreamweave/stethoscope/puzzle/perfume/tea/
           dice/decode/rubbing/collect/focus/scentmem/tealeaf/sugar）
   v2.8.8：玩法模板减量（第 4 批 / 共 6 批）——机械与律动 14 个玩法迁至
           js/games/mechanism.js（dial/chime/hourglass/lock/compass/telegraph/balance/
           pendulum/metronome/tuning/abacus/gear/sundial/clepsydra）
   v2.8.9：玩法模板减量（第 5 批 / 共 6 批）——图像与光影 12 个玩法迁至
           js/games/imagery.js（shadow/candle/stamp/astrolabe/sandpaint/kaleido/topo/
           windmill/ripple/bottle/echoloc/lens）
   v2.9.0：修复 v2.8.7 迁移回归——matchTarotCombo / matchDreamweave 辅助函数移至
           perception.js；tarot / dreamweave / compass 三处效果块补入 finish
           （applyAdd 等引擎内部符号在 games 文件不可达，原样遗留会 ReferenceError）
   v2.9.1：玩法模板减量（第 6 批 / 共 6 批，全部完成）——直跳型 10 个玩法迁至
           js/games/direct.js（doodle/collage/photo/rhythm/scent/silenceChoice/touch/
           temperature/handwriting/spectrum）；matchConstellation/matchPuzzle/matchPerfume
           辅助函数同步移入对应 games 文件；engine.js 降为纯引擎（约 3.4k 行）
   v2.9.2：CSS 拆分——玩法浮层样式（v0.6.0 起全部分节）拆至 css/games.css（约 7.3k 行），
           style.css 保留基础与引擎 UI（约 1.2k 行）；加载顺序保持级联不变
   v2.9.3：字体子集治理——tools/collect_font_charset.py（字符集收集）、
           tools/check_font_coverage.py（cmap 覆盖检查）、tools/rebuild_font_subset.sh
           （一键重建，含 WiFi 提示）；当前基线缺 30 字符（13 汉字 + 符号），待重建
   v2.9.4：发布链路——GitHub Actions CI（推送/PR 跑全部测试）+ GitHub Pages 自动部署
           （测试通过后发布仓库根目录，configure-pages 自动开启 Pages，附 .nojekyll）
   ======================================== */

(function () {
  "use strict";

  /* ---------- DOM 引用 ---------- */
  const el = {
    bgLayer:     document.getElementById("bg-layer"),
    bgOverlay:   document.getElementById("bg-overlay"),
    particles:   document.getElementById("particles"),
    charLayer:   document.getElementById("char-layer"),
    topBar:      document.getElementById("top-bar"),
    dialogBox:   document.getElementById("dialog-box"),
    speaker:     document.getElementById("speaker"),
    dialogText:  document.getElementById("dialog-text"),
    clickHint:   document.getElementById("click-hint"),
    choices:     document.getElementById("choices"),
    titleScreen: document.getElementById("title-screen"),
    overlay:     document.getElementById("overlay"),
    overlayTitle:document.getElementById("overlay-title"),
    overlayBody: document.getElementById("overlay-body"),
    endingScreen:document.getElementById("ending-screen"),
    endingType:  document.getElementById("ending-type"),
    endingTitle: document.getElementById("ending-title"),
    endingText:  document.getElementById("ending-text"),
    dayBar:      document.getElementById("day-bar"),
    heartBar:    document.getElementById("heart-bar"),
    clueLayer:   document.getElementById("clue-layer"),
    inboxBadge:  document.getElementById("inbox-badge"),
    inboxBtn:    document.getElementById("btn-inbox"),
  };

  /* ---------- 游戏状态 ---------- */
  const state = {
    currentNode: null,
    currentBg: null,
    variables: { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } },
    history: [],
    isTyping: false,
    typeTimer: null,
    typingText: "",
    typeOnDone: null,
    autoMode: false,
    autoTimer: null,
    skipMode: false,
    pendingInteraction: false,
    inGame: false,
    playCount: Saves.getFlag("playCount", 0),
    visitedNodes: Saves.getFlag("visitedNodes", {}),
    loopCount: Saves.getFlag("loopCount", 0), // 剧情内循环次数（每次非真结局+1）
    perspectiveActive: false, // 视角切换：当前是否在对方视角
    sessionId: 0,
  };

  const MAX_HISTORY = 200;
  const AFFECTION_MAX = 10;
  const SAVE_NODE_ALIASES = Object.freeze({
    d5_check_xiazhi: "d5_route_check",
    d5_check_sunian: "d5_route_check",
    d5_default_choice: "d5_route_check",
  });

  function normalizeSaveNodeId(nodeId) {
    return SAVE_NODE_ALIASES[nodeId] || nodeId;
  }

  function createDefaultVariables() {
    return { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
  }

  /* ============ 工具：深层取值/赋值 ============ */
  function getByPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  }
  function setByPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  function applyAdd(add) {
    if (!add) return;
    for (const key in add) {
      const val = add[key];
      if (typeof val === "object" && !Array.isArray(val)) {
        for (const sub in val) {
          const path = `${key}.${sub}`;
          const cur = getByPath(state.variables, path) || 0;
          setByPath(state.variables, path, cur + val[sub]);
        }
      } else {
        const cur = getByPath(state.variables, key) || 0;
        setByPath(state.variables, key, cur + val);
      }
    }
  }
  function applySet(set) {
    if (!set) return;
    for (const key in set) setByPath(state.variables, key, set[key]);
  }

  function getCharacterMeta(speaker) {
    if (!speaker) return null;
    return CHARACTERS[speaker] || Object.values(CHARACTERS).find((char) => char.name === speaker) || null;
  }

  /* ============ 场景/背景 ============ */
  function hasSceneStyle(bg) {
    const selector = `.scene-${CSS.escape(bg)}`;
    return Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).some((rule) => {
          if (typeof rule.selectorText !== "string") return false;
          return rule.selectorText.split(",").some((item) => item.trim() === selector);
        });
      } catch (e) {
        return false;
      }
    });
  }

  function setScene(bg) {
    if (!bg || bg === state.currentBg) return;
    if (!hasSceneStyle(bg) && bg !== "cherry_full") {
      console.warn("场景样式不存在，使用樱花全景:", bg);
      bg = "cherry_full";
    }
    state.currentBg = bg;
    el.bgLayer.className = "bg-scene scene-" + bg;
    el.bgLayer.classList.add("fade-transition");
    setTimeout(() => el.bgLayer.classList.remove("fade-transition"), 700);
    updateParticles(bg);
    playBgmForScene(bg);
  }

  /* ============ 立绘 ============ */
  function renderCharacters(node) {
    let chars = null;
    if (node.chars) chars = node.chars;
    else if (node.char !== undefined) {
      if (node.char === null) chars = [];
      else chars = [{ id: node.char, pos: "center" }];
    } else return;
    el.charLayer.innerHTML = "";
    chars.forEach((c, idx) => {
      if (!PORTRAITS[c.id]) return;
      const div = document.createElement("div");
      div.className = `char-sprite pos-${c.pos || "center"}`;
      if (c.dim) div.classList.add("dim");
      div.innerHTML = PORTRAITS[c.id];
      el.charLayer.appendChild(div);
      requestAnimationFrame(() => {
        setTimeout(() => div.classList.add("show"), idx * 80);
      });
    });
  }

  /* ============ 打字机 ============ */
  function typewriter(text, onDone) {
    clearTimeout(state.typeTimer);
    state.isTyping = true;
    state.typingText = text;
    state.typeOnDone = onDone || null;
    el.clickHint.style.opacity = "0";
    el.dialogText.innerHTML = "";
    let i = 0;
    const speed = state.skipMode ? 5 : Math.max(5, Saves.settings.textSpeed);
    function tick() {
      if (i >= text.length) {
        completeTyping();
        return;
      }
      el.dialogText.textContent = text.slice(0, i + 1);
      i++;
      state.typeTimer = setTimeout(tick, speed);
    }
    tick();
  }

  function completeTyping() {
    if (!state.isTyping) return;
    clearTimeout(state.typeTimer);
    state.isTyping = false;
    el.dialogText.innerHTML = state.typingText;
    el.clickHint.style.opacity = "1";
    const onDone = state.typeOnDone;
    state.typeOnDone = null;
    if (onDone) onDone();
  }

  function skipTyping() {
    completeTyping();
  }

  /* ============ 历史记录 ============ */
  function pushHistory(speaker, text, nodeId) {
    state.history.push({ speaker, text, nodeId, ts: Date.now() });
    if (state.history.length > MAX_HISTORY) state.history.shift();
  }

  /* ============ 日程UI ============ */
  function updateDayBar(node) {
    if (!node || !node.day) { if (el.dayBar) el.dayBar.style.opacity = "0"; return; }
    if (el.dayBar) {
      const dayLabel = ["", "第 1 日", "第 2 日", "第 3 日", "第 4 日", "第 5 日", "第 6 日", "第 7 日", "第 8 日", "第 9 日"][node.day] || `第 ${node.day} 日`;
      const timeLabel = { morning: "上午", noon: "中午", afternoon: "下午", evening: "傍晚", night: "夜晚" }[node.time] || "";
      el.dayBar.textContent = `${dayLabel} · ${timeLabel}`;
      el.dayBar.style.opacity = "1";
      // 循环徽章：显示当前循环次数
      if (state.loopCount > 0) el.dayBar.dataset.loop = state.loopCount;
      else delete el.dayBar.dataset.loop;
    }
  }

  /* ============ 好感度心条 ============ */
  function updateHeartBar() {
    if (!el.heartBar) return;
    const aff = state.variables.affection;
    const heroines = [
      { id: "shiyu", name: "诗雨", color: "#a8c5e8", val: aff.shiyu || 0 },
      { id: "xiazhi", name: "夏织", color: "#f0b878", val: aff.xiazhi || 0 },
      { id: "sunian", name: "苏念", color: "#c8a8e0", val: aff.sunian || 0 },
    ];
    el.heartBar.innerHTML = heroines.map(h => {
      const pct = Math.min(100, (h.val / AFFECTION_MAX) * 100);
      const hearts = Math.min(5, Math.floor(h.val / 2));
      return `<div class="heart-row" title="${h.name}: ${h.val}">
        <span class="heart-name" style="color:${h.color}">${h.name}</span>
        <div class="heart-track"><div class="heart-fill" style="width:${pct}%;background:${h.color}"></div></div>
        <span class="heart-hearts">${"❤".repeat(hearts)}${"♡".repeat(5 - hearts)}</span>
      </div>`;
    }).join("");
  }

  /* ============ 推进/跳转 ============ */
  function advance() {
    if (state.pendingInteraction || hasActiveInteractionLayer()) return;
    const node = SCRIPT[state.currentNode];
    if (!node) return;
    if (node.next) gotoNode(node.next);
  }

  function onTextComplete(node) {
    if (node.ending) {
      const sessionId = state.sessionId;
      setTimeout(() => {
        if (state.inGame && state.sessionId === sessionId && SCRIPT[state.currentNode] === node) showEnding(node.ending);
      }, 1000);
      return;
    }
    if (state.autoMode) {
      clearTimeout(state.autoTimer);
      state.autoTimer = setTimeout(() => {
        if (state.pendingInteraction || hasActiveInteractionLayer()) return;
        if (node.next) gotoNode(node.next);
      }, Saves.settings.autoDelay);
    }
  }

  function gotoNode(nodeId, options = {}) {
    const node = SCRIPT[nodeId];
    if (!node) { console.error("节点不存在:", nodeId); return; }
    const restoring = options.restoring === true;
    clearTimeout(state.autoTimer);
    state.currentNode = nodeId;
    state.pendingInteraction = false;

    if (!restoring) {
      // 只有首次进入节点才应用状态变更；读档只负责恢复画面。
      state.visitedNodes[nodeId] = (state.visitedNodes[nodeId] || 0) + 1;
      applyAdd(node.add);
      applySet(node.set);

      if (node.keyword) {
        const keywords = Array.isArray(node.keyword) ? node.keyword : [node.keyword];
        const unlocked = keywords.filter(keyword => Saves.unlockKeyword(keyword));
        if (unlocked.length) flashHint(`新关键词：${unlocked.join("、")}`);
      }
      if (node.cg_unlock) {
        if (Saves.unlockCG(node.cg_unlock)) flashHint(`新 CG：${CGS.find(c => c.id === node.cg_unlock)?.title || ""}`);
      }
      if (node.memory && !Saves.isMemoryUnlocked(node.memory.id)) {
        if (Saves.saveMemory(node.memory.id, node.memory.text)) {
          flashHint(`✦ 记忆片段：${node.memory.title || node.memory.id}`);
        }
      }
      if (node.inbox) {
        const list = Array.isArray(node.inbox) ? node.inbox : [node.inbox];
        list.forEach((m) => {
          if (Saves.saveInbox(m)) flashHint(`📩 新消息：${m.from || "未知"}`);
        });
        updateInboxBadge();
      }
      if (node.moment) {
        const list = Array.isArray(node.moment) ? node.moment : [node.moment];
        list.forEach((mid) => {
          if (Saves.addMoment(mid)) flashHint(`🌸 新动态：${mid}`);
        });
      }
      if (node.personality) {
        for (const dim in node.personality) Saves.addPersonality(dim, node.personality[dim]);
      }
      if (node.echoSave) {
        const list = Array.isArray(node.echoSave) ? node.echoSave : [node.echoSave];
        list.forEach(e => {
          Saves.saveEcho(e.id, e.text, e.ctx);
        });
      }
      deliverTimecapsules(nodeId);
    }

    // 环境线索属于画面状态，读档时也必须重新渲染。
    renderClues(node);

    if (restoring) {
      updateInboxBadge();
    }

    // 循环文本：根据 loopCount 显示不同文本
    let displayNode = node;
    if (node.loopText && Array.isArray(node.loopText)) {
      const idx = Math.min(state.loopCount, node.loopText.length - 1);
      displayNode = Object.assign({}, node, { text: node.loopText[idx] });
    }

    // 条件节点
    if (node.if) {
      const cond = node.if;
      let value;
      if (cond.var === "_playCount") value = state.playCount;
      else if (cond.var === "_visitedCount") value = Object.keys(state.visitedNodes).length;
      else if (cond.var === "_lastScore") value = state.variables.lastMinigameScore || 0;
      else value = getByPath(state.variables, cond.var);
      let matched = false;
      if (cond.gte !== undefined) matched = (value >= cond.gte);
      else if (cond.eq !== undefined) matched = (value === cond.eq);
      else if (cond.gt !== undefined) matched = (value > cond.gt);
      else if (cond.flag !== undefined) matched = !!Saves.getFlag(cond.flag, false);
      else if (cond.ending !== undefined) matched = Saves.isEndingUnlocked(cond.ending);
      if (matched) gotoNode(cond.then, options);
      else if (node.else) gotoNode(node.else, options);
      return;
    }

    // 信件节点
    if (node.letter) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const speakerMeta = getCharacterMeta(node.speaker);
      const speakerName = node.speaker ? (speakerMeta?.name || node.speaker) : "";
      el.speaker.textContent = speakerName;
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            showLetter(node.letter, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // 选项节点
    if (node.choice) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.add("hidden");
      showChoices(node.choice, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // 迷你游戏节点
    if (node.minigame) {
      setScene(node.bg);
      renderCharacters(node);
      runMinigame(node.minigame, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.5.0 梦境节点
    if (node.dream) {
      setScene(node.bg);
      renderCharacters(node);
      enterDream(node.dream, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }



    // v0.7.0 气味闪回触发节点
    if (node.scentRecall) {
      setScene(node.bg);
      renderCharacters(node);
      triggerScentRecall(node.scentRecall, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

























    // v2.7.3 后日谈回信分拣
    if (node.triage) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            window.GameKit?.run("triage", node.triage, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.7.4 后日谈留言墙
    if (node.wall) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            window.GameKit?.run("wall", node.wall, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.7.6 后日谈校刊校对
    if (node.proofread) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            window.GameKit?.run("proofread", node.proofread, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // 通用玩法分发：所有经 GameKit 注册的已迁移玩法（js/games/*.js）在此统一触发。
    // 带打字机前置的特殊玩法（triage / wall / proofread）已在上方各自分支处理；
    // 尚未迁移的玩法仍走上方各自的 if (node.xxx) 分支——它们的类型不在注册表里，不会被此循环命中。
    if (window.GameKit) {
      for (const type of window.GameKit.types()) {
        if (node[type]) {
          setScene(node.bg);
          renderCharacters(node);
          window.GameKit.run(type, node[type], nodeId);
          updateDayBar(node);
          updateHeartBar();
          return;
        }
      }
    }

    // 普通节点/结局节点
    setScene(node.bg);
    renderCharacters(node);

    const speakerMeta = getCharacterMeta(node.speaker);
    const speakerName = node.speaker ? (speakerMeta?.name || node.speaker) : "";
    el.speaker.textContent = speakerName;
    el.speaker.style.background = speakerName
      ? `linear-gradient(135deg, ${speakerMeta?.color || "#d87090"}, ${speakerMeta?.accent || "#b8608a"})`
      : "rgba(40,40,60,0.7)";
    el.dialogBox.classList.remove("hidden");

    // 视角切换支持：节点定义了 perspective 时显示切换按钮
    renderPerspectiveButton(node);

    // v0.6.0 回声触发：节点定义 echo 时，在文本完成后弹出回声
    if (node.echo) {
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        onTextComplete(node);
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            triggerEcho(node.echo, nodeId);
          }
        }, 600);
      });
    } else {
      typewriter(displayNode.text || "", () => onTextComplete(node));
    }

    if (speakerName && displayNode.text) pushHistory(speakerName, displayNode.text, nodeId);
    else if (displayNode.text) pushHistory("旁白", displayNode.text, nodeId);

    updateDayBar(node);
    updateHeartBar();
    updateLoopBadge();
  }

  /* ============ 视角切换 ============ */
  let perspectiveBtn = null;
  function renderPerspectiveButton(node) {
    if (perspectiveBtn) { perspectiveBtn.remove(); perspectiveBtn = null; }
    if (!node.perspective) return;
    if (!Saves.isMemoryUnlocked(node.perspective.memory) && node.perspective.requiresMemory !== false) return;
    perspectiveBtn = document.createElement("button");
    perspectiveBtn.id = "perspective-btn";
    perspectiveBtn.innerHTML = "👁";
    perspectiveBtn.style.cssText = "position:absolute;right:14px;bottom:160px;width:44px;height:44px;border-radius:50%;background:rgba(20,18,32,0.8);border:1px solid rgba(255,200,220,0.5);color:#ffd8e4;font-size:18px;cursor:pointer;z-index:20;transition:transform 0.2s;backdrop-filter:blur(6px);";
    perspectiveBtn.title = "切换视角";
    perspectiveBtn.onmouseenter = () => perspectiveBtn.style.transform = "scale(1.1)";
    perspectiveBtn.onmouseleave = () => perspectiveBtn.style.transform = "scale(1)";
    perspectiveBtn.onclick = () => showPerspective(node.perspective);
    document.getElementById("game").appendChild(perspectiveBtn);
  }

  function showPerspective(p) {
    let layer = document.getElementById("perspective-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "perspective-layer";
      layer.style.cssText = "position:absolute;inset:0;background:rgba(10,5,20,0.85);backdrop-filter:blur(8px);z-index:30;display:flex;align-items:center;justify-content:center;padding:40px;";
      layer.onclick = (e) => { if (e.target === layer) layer.remove(); };
      document.getElementById("game").appendChild(layer);
    }
    layer.innerHTML = "";
    const card = document.createElement("div");
    card.style.cssText = "max-width:580px;width:100%;padding:36px 40px;background:linear-gradient(135deg, rgba(40,20,55,0.95), rgba(60,30,75,0.95));border:1px solid rgba(255,200,220,0.3);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,0.6);";
    const tag = document.createElement("div");
    tag.style.cssText = "font-size:12px;letter-spacing:6px;color:rgba(255,200,220,0.5);margin-bottom:14px;text-align:center;";
    tag.textContent = "❝ 内心独白 ❞";
    const who = document.createElement("div");
    who.style.cssText = "font-size:16px;color:#ffd8e4;letter-spacing:4px;text-align:center;margin-bottom:24px;";
    who.textContent = p.who || "——";
    const text = document.createElement("div");
    text.style.cssText = "font-size:16px;line-height:2.1;color:rgba(255,240,248,0.9);letter-spacing:1px;text-indent:2em;";
    text.textContent = p.text;
    const close = document.createElement("button");
    close.textContent = "合上";
    close.style.cssText = "margin:28px auto 0;display:block;padding:10px 28px;background:rgba(180,80,120,0.4);border:1px solid rgba(255,200,220,0.5);border-radius:8px;color:#ffd8e4;font-family:inherit;font-size:14px;letter-spacing:3px;cursor:pointer;";
    close.onclick = () => layer.remove();
    card.appendChild(tag); card.appendChild(who); card.appendChild(text); card.appendChild(close);
    layer.appendChild(card);
    if (p.memory && !Saves.isMemoryUnlocked(p.memory)) {
      Saves.saveMemory(p.memory, p.text);
      flashHint(`✦ 解锁视角记忆`);
    }
  }

  /* ============ 循环徽章 ============ */
  function updateLoopBadge() {
    if (!el.dayBar) return;
    if (state.loopCount > 0) {
      el.dayBar.dataset.loop = state.loopCount;
    }
  }

  /* ============ 选项 ============ */
  function showChoices(choice, currentNodeId) {
    el.choices.innerHTML = "";
    el.choices.classList.remove("hidden");

    const prompt = document.createElement("div");
    prompt.style.cssText = "position:absolute;top:18%;left:50%;transform:translateX(-50%);font-size:20px;letter-spacing:3px;color:#ffd8e4;text-shadow:0 2px 8px rgba(0,0,0,0.8);";
    prompt.textContent = choice.prompt || "请选择";
    el.choices.appendChild(prompt);

    // 循环解锁的额外选项
    let options = choice.options.slice();
    if (choice.loopChoice && Array.isArray(choice.loopChoice)) {
      choice.loopChoice.forEach((extra) => {
        if (state.loopCount >= (extra.minLoop || 1)) options.push(extra);
      });
    }

    options.forEach((opt) => {
      // 多周目解锁隐藏选项
      if (opt.requires && !opt.requires()) return;
      // 合成关键词解锁的隐藏选项
      if (opt.requires_compose && !Saves.isComposed(opt.requires_compose)) return;
      // 记忆解锁的隐藏选项
      if (opt.requires_memory && !Saves.isMemoryUnlocked(opt.requires_memory)) return;
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      if (opt.composed) btn.classList.add("composed-choice");
      // 二周目彩蛋
      if (state.playCount >= 1 && opt.easter && state.visitedNodes[opt.next] > 0) {
        btn.textContent = opt.text + " ♪";
      } else {
        btn.textContent = opt.text;
      }
      btn.onclick = () => {
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        applyAdd(opt.add);
        applySet(opt.set);
        if (opt.value && currentNodeId) {
          // 信件回执存储
        }
        gotoNode(opt.next);
      };
      el.choices.appendChild(btn);
    });
  }

  /* ============ 信件系统 ============ */
  function showLetter(letter, currentNodeId) {
    el.choices.innerHTML = "";
    el.choices.classList.remove("hidden");
    const prompt = document.createElement("div");
    prompt.style.cssText = "position:absolute;top:14%;left:50%;transform:translateX(-50%);font-size:22px;letter-spacing:4px;color:#ffd8e4;text-shadow:0 2px 8px rgba(0,0,0,0.8);max-width:80%;text-align:center;";
    prompt.textContent = letter.prompt || "请选择";
    el.choices.appendChild(prompt);

    const subPrompt = document.createElement("div");
    subPrompt.style.cssText = "position:absolute;top:20%;left:50%;transform:translateX(-50%);font-size:14px;color:rgba(255,200,220,0.6);letter-spacing:2px;";
    subPrompt.textContent = "—— 回信 ——";
    el.choices.appendChild(subPrompt);

    // 自由书写模式：玩家自己打字写信
    if (letter.type === "free") {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;top:26%;left:50%;transform:translateX(-50%);width:min(560px,90%);display:flex;flex-direction:column;gap:12px;";
      const ta = document.createElement("textarea");
      ta.placeholder = letter.hint || "在此写下你想说的话…";
      ta.style.cssText = "width:100%;height:140px;padding:16px;background:rgba(20,15,30,0.85);border:1px solid rgba(255,200,220,0.3);border-radius:10px;color:#ffe8f0;font-family:inherit;font-size:15px;line-height:1.8;letter-spacing:1px;resize:none;";
      ta.maxLength = 200;
      wrap.appendChild(ta);

      const hint = document.createElement("div");
      hint.style.cssText = "font-size:12px;color:rgba(255,200,220,0.5);text-align:right;letter-spacing:1px;";
      hint.textContent = "0 / 200";
      ta.oninput = () => { hint.textContent = `${ta.value.length} / 200`; };
      wrap.appendChild(hint);

      const sendBtn = document.createElement("button");
      sendBtn.textContent = "✉ 寄出";
      sendBtn.className = "choice-btn";
      sendBtn.style.cssText = "padding:12px 28px;background:linear-gradient(135deg, rgba(180,80,120,0.6), rgba(140,60,160,0.6));border:1px solid rgba(255,200,220,0.5);border-radius:10px;color:#ffd8e4;font-family:inherit;font-size:15px;letter-spacing:4px;cursor:pointer;";
      sendBtn.onclick = () => {
        const content = ta.value.trim();
        if (!content) { flashHint("信件不能为空"); return; }
        // 关键词检测：根据玩家输入的内容匹配关键词，决定回信分支
        const matched = (letter.matchings || []).filter(m => m.keywords.some(kw => content.includes(kw)));
        // 保存信件内容
        Saves.saveLetter(letter.id, { content, matched: matched.map(m => m.id) });
        // 给出回信
        const reply = matched.length > 0 ? matched[0] : (letter.defaultReply || { next: currentNodeId });
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        // 解锁记忆（如果配对中包含）
        if (reply.memory && !Saves.isMemoryUnlocked(reply.memory)) {
          Saves.saveMemory(reply.memory, content);
        }
        gotoNode(reply.next);
      };
      wrap.appendChild(sendBtn);
      el.choices.appendChild(wrap);
      return;
    }

    // 经典选项模式
    let options = letter.options.slice();
    if (letter.loopChoice && Array.isArray(letter.loopChoice)) {
      letter.loopChoice.forEach((extra) => {
        if (state.loopCount >= (extra.minLoop || 1)) options.push(extra);
      });
    }
    options.forEach((opt) => {
      if (opt.requires && !opt.requires()) return;
      if (opt.requires_compose && !Saves.isComposed(opt.requires_compose)) return;
      if (opt.requires_memory && !Saves.isMemoryUnlocked(opt.requires_memory)) return;
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.style.background = "linear-gradient(135deg, rgba(60,40,80,0.85), rgba(80,60,100,0.85))";
      btn.textContent = "✉ " + opt.text;
      btn.onclick = () => {
        Saves.saveLetter(letter.id, opt.value);
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        gotoNode(opt.next);
      };
      el.choices.appendChild(btn);
    });
  }

  /* ============ 迷你游戏 ============ */
  async function runMinigame(gameType, currentNodeId) {
    const sessionId = state.sessionId;
    if (!window.Minigames) {
      console.warn("Minigames 模块未加载，跳过");
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
      return;
    }
    let score = 50;
    try {
      if (gameType === "writing") score = await window.Minigames.writing();
      else if (gameType === "running") score = await window.Minigames.running();
      else if (gameType === "painting") score = await window.Minigames.painting();
    } catch (e) {
      console.warn("迷你游戏出错:", e);
    }
    if (!state.inGame || state.sessionId !== sessionId || state.currentNode !== currentNodeId) return;
    state.variables.lastMinigameScore = score;
    const node = SCRIPT[currentNodeId];
    if (!node) return;
    // 按分数加成好感度
    if (node.scoreBonus) {
      const factor = score / 100;
      const scaleAdd = (obj) => {
        const out = {};
        for (const k in obj) {
          if (typeof obj[k] === "object" && !Array.isArray(obj[k])) {
            out[k] = scaleAdd(obj[k]);
          } else {
            out[k] = Math.round(obj[k] * factor);
          }
        }
        return out;
      };
      applyAdd(scaleAdd(node.scoreBonus));
      updateHeartBar();
      const grade = score >= 80 ? "完美" : (score >= 50 ? "不错" : "一般");
      flashHint(`${grade}！得分 ${score}`);
    } else {
      flashHint(`得分 ${score}`);
    }
    // 按分数跳转
    if (node.scoreJump) {
      for (const jump of node.scoreJump) {
        if (score >= jump.min) { gotoNode(jump.next); return; }
      }
    }
    if (node.next) gotoNode(node.next);
  }

  /* ============ 结局 ============ */
  function showEnding(ending) {
    const isNew = Saves.unlockEnding(ending.id);
    state.inGame = false;
    // 循环系统：真结局打破循环，其他结局触发循环重置
    if (ending.id === "true_end") {
      Saves.setFlag("playCount", state.playCount + 1);
      state.playCount += 1;
      // 真结局重置 loopCount
      Saves.setFlag("loopCount", 0);
      state.loopCount = 0;
      flashHint("★ 循环打破 ★");
    } else if (ending.id !== "afterword") {
      // 普通结局：循环+1
      Saves.setFlag("loopCount", state.loopCount + 1);
      state.loopCount += 1;
      flashHint(`⟲ 时间回溯 · 第 ${state.loopCount} 次循环`);
    }
    el.endingType.textContent = ending.type;
    el.endingType.style.color = ending.type.includes("TRUE") ? "#ffd88a" : (ending.type.includes("BAD") ? "#a8a8a8" : "#ffb8c8");
    el.endingTitle.textContent = ending.title;
    el.endingText.textContent = ending.text;

    // 循环提示
    let loopHint = document.getElementById("ending-loop-hint");
    if (!loopHint) {
      loopHint = document.createElement("div");
      loopHint.id = "ending-loop-hint";
      loopHint.style.cssText = "text-align:center;margin-top:18px;font-size:13px;color:rgba(255,200,220,0.5);letter-spacing:4px;";
      el.endingScreen.querySelector(".ending-content").appendChild(loopHint);
    }
    if (ending.id === "true_end") {
      loopHint.textContent = "✦ 你打破了时间的循环 ✦";
      loopHint.style.color = "#ffd88a";
    } else if (ending.id === "afterword") {
      loopHint.textContent = "✦ 后日谈结束 · 故事交还给今天 ✦";
      loopHint.style.color = "#ffd88a";
    } else {
      loopHint.textContent = `⟲ 第 ${state.loopCount} 次循环 · 关键词与记忆将被保留`;
      loopHint.style.color = "rgba(255,200,220,0.5)";
    }

    el.endingScreen.classList.remove("hidden");
    el.topBar.classList.remove("show");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    if (el.dayBar) el.dayBar.style.opacity = "0";
    if (el.heartBar) el.heartBar.style.opacity = "0";
    if (perspectiveBtn) { perspectiveBtn.remove(); perspectiveBtn = null; }
  }

  /* ============ 新游戏 ============ */
  function newGame() {
    state.sessionId += 1;
    removeActiveInteractionLayers();
    state.variables = createDefaultVariables();
    state.history = [];
    state.currentNode = null;
    state.currentBg = null;
    state.inGame = true;
    state.autoMode = false;
    state.skipMode = false;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "1";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    gotoNode(START_NODE);
  }

  function startAfterword() {
    if (!isTrueEndUnlocked()) {
      flashHint("完成真正的樱花信结局后才能进入后日谈");
      return;
    }
    state.sessionId += 1;
    removeActiveInteractionLayers();
    state.variables = createDefaultVariables();
    state.history = [];
    state.currentNode = null;
    state.currentBg = null;
    state.inGame = true;
    state.autoMode = false;
    state.skipMode = false;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "0";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    gotoNode("afterword_entry");
  }

  /* ============ 存档快照 ============ */
  function snapshot() {
    const node = SCRIPT[state.currentNode];
    const speakerMeta = getCharacterMeta(node?.speaker);
    const speakerName = node?.speaker ? (speakerMeta?.name || node.speaker) : "";
    return {
      nodeId: state.currentNode,
      variables: JSON.parse(JSON.stringify(state.variables)),
      sceneLabel: SCENE_LABELS[state.currentBg] || "",
      dialogPreview: (speakerName ? `【${speakerName}】` : "（旁白）") + (node?.text || "").slice(0, 30),
      day: node?.day,
      time: node?.time,
      currentBg: state.currentBg,
      history: state.history.slice(-MAX_HISTORY),
      visitedNodes: JSON.parse(JSON.stringify(state.visitedNodes)),
      loopCount: state.loopCount,
      playCount: state.playCount,
    };
  }

  function quickSave() {
    if (!state.inGame) return;
    flashHint(Saves.quickSave(snapshot()) ? "已快存" : "快存失败：浏览器存储不可用");
  }

  function saveToSlot(slot) {
    if (!state.inGame) { flashHint("当前无法存档"); return; }
    if (Saves.save(slot, snapshot())) {
      renderSaveSlots("save");
      flashHint(`已保存到槽位 ${slot + 1}`);
    } else {
      flashHint("保存失败：浏览器存储不可用");
    }
  }

  function removeActiveInteractionLayers() {
    window.GameLifecycle?.cancelAll();
    if (window.Minigames?.cancelAll) window.Minigames.cancelAll();
    const baseLayers = new Set([el.bgLayer, el.charLayer, el.clueLayer]);
    document.querySelectorAll("#game > [class]").forEach((candidate) => {
      if (baseLayers.has(candidate)) return;
      if (Array.from(candidate.classList).some((name) => name.endsWith("-layer"))) candidate.remove();
    });
    el.choices.classList.add("hidden");
    el.choices.innerHTML = "";
  }

  function restoreSnapshot(data) {
    const nodeId = normalizeSaveNodeId(data?.nodeId);
    if (!data || !SCRIPT[nodeId]) {
      flashHint("存档损坏或剧情节点不存在");
      return false;
    }
    state.sessionId += 1;
    removeActiveInteractionLayers();
    state.currentNode = nodeId;
    state.variables = data.variables && typeof data.variables === "object"
      ? JSON.parse(JSON.stringify(data.variables)) : createDefaultVariables();
    const affection = state.variables.affection;
    state.variables.affection = affection && typeof affection === "object" ? affection : {};
    for (const id of ["shiyu", "xiazhi", "sunian"]) {
      state.variables.affection[id] = Number.isFinite(state.variables.affection[id])
        ? state.variables.affection[id] : 0;
    }
    state.currentBg = null;
    state.history = Array.isArray(data.history) ? data.history.slice(-MAX_HISTORY) : [];
    state.visitedNodes = data.visitedNodes && typeof data.visitedNodes === "object"
      ? JSON.parse(JSON.stringify(data.visitedNodes)) : {};
    state.loopCount = Number.isFinite(data.loopCount) ? data.loopCount : Saves.getFlag("loopCount", 0);
    state.playCount = Number.isFinite(data.playCount) ? data.playCount : Saves.getFlag("playCount", 0);
    state.inGame = true;
    state.autoMode = false;
    state.skipMode = false;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "1";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    closeOverlay();
    gotoNode(nodeId, { restoring: true });
    return true;
  }

  function loadFromSlot(slot) {
    const data = Saves.load(slot);
    if (!data) { flashHint("该槽位为空"); return; }
    restoreSnapshot(data);
  }

  /* ============ 顶部提示 ============ */
  let hintTimer = null;
  function flashHint(text) {
    let hint = document.getElementById("flash-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "flash-hint";
      hint.setAttribute("role", "status");
      hint.setAttribute("aria-live", "polite");
      hint.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:14px 28px;background:rgba(20,18,32,0.9);border:1px solid rgba(255,200,220,0.4);border-radius:12px;color:#ffd8e4;font-size:16px;letter-spacing:2px;z-index:9999;pointer-events:none;transition:opacity 0.3s;";
      document.body.appendChild(hint);
    }
    hint.textContent = text;
    hint.style.opacity = "1";
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.style.opacity = "0"; }, 1200);
  }

  /* ============ 浮层 ============ */
  let overlayMode = null;
  function openOverlay(type) {
    overlayMode = type;
    const titles = {
      save: "存档", load: "读档", config: "设置", history: "历史文本",
      gallery: "结局图鉴", about: "关于", keywords: "关键词", cg: "CG 图鉴",
      flowchart: "流程图", inbox: "收件箱", moments: "朋友圈",
    };
    el.overlayTitle.textContent = titles[type] || type;
    el.overlay.classList.remove("hidden");
    el.overlayBody.focus();
    if (type === "save" || type === "load") renderSaveSlots(type);
    else if (type === "config") renderConfig();
    else if (type === "history") renderHistory();
    else if (type === "gallery") renderGallery();
    else if (type === "about") renderAbout();
    else if (type === "keywords") renderKeywords();
    else if (type === "cg") renderCGGallery();
    else if (type === "flowchart") renderFlowchart();
    else if (type === "inbox") renderInbox();
    else if (type === "moments") renderMoments();
  }
  function closeOverlay() {
    el.overlay.classList.add("hidden");
    overlayMode = null;
    const active = document.activeElement;
    if (active && active.closest?.("#overlay")) el.topBar.querySelector("button")?.focus();
  }

  function renderSaveSlots(mode) {
    let html = "";
    for (let i = 0; i < 9; i++) {
      const data = Saves.data.slots[i];
      const isQuick = i === 0;
      if (data) {
        html += `<div class="save-slot" data-slot="${i}">
          <div class="slot-no">${i + 1}</div>
          <div class="slot-info">
            <div class="slot-title">${escapeHtml(data.sceneLabel || "未知场景")}${isQuick ? " · 快存" : ""}</div>
            <div class="slot-meta">${Saves.formatTime(data.timestamp)} · ${escapeHtml(data.dialogPreview || "")}</div>
          </div>
          <div class="slot-actions">
            ${mode === "save" ? `<button data-act="save" data-slot="${i}">覆盖</button>` : `<button data-act="load" data-slot="${i}">读取</button>`}
            <button data-act="del" data-slot="${i}">删除</button>
          </div>
        </div>`;
      } else {
        html += `<div class="save-slot" data-slot="${i}">
          <div class="slot-no">${i + 1}</div>
          <div class="slot-info">
            <div class="slot-title">${isQuick ? "快存槽" : "空槽位"}</div>
            <div class="slot-meta slot-empty">— 空 —</div>
          </div>
          <div class="slot-actions">${mode === "save" ? `<button data-act="save" data-slot="${i}">存档</button>` : ""}</div>
        </div>`;
      }
    }
    el.overlayBody.innerHTML = html;
    el.overlayBody.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const slot = parseInt(btn.dataset.slot);
        const act = btn.dataset.act;
        if (act === "save") saveToSlot(slot);
        else if (act === "load") loadFromSlot(slot);
        else if (act === "del") {
          if (Saves.deleteSave(slot)) {
            renderSaveSlots(mode);
            flashHint("已删除");
          } else {
            flashHint("删除失败：浏览器存储不可用");
          }
        }
      };
    });
  }

  function renderConfig() {
    const s = Saves.settings;
    el.overlayBody.innerHTML = `
      <div class="config-row">
        <label>文字速度（越小越快）</label>
        <input type="range" id="cfg-textspeed" min="5" max="80" value="${escapeHtml(String(s.textSpeed))}">
        <span id="cfg-textspeed-val" style="color:#ffb8c8;width:50px;">${escapeHtml(String(s.textSpeed))}ms</span>
      </div>
      <div class="config-row">
        <label>自动模式延迟</label>
        <input type="range" id="cfg-autodelay" min="500" max="4000" step="100" value="${escapeHtml(String(s.autoDelay))}">
        <span id="cfg-autodelay-val" style="color:#ffb8c8;width:70px;">${escapeHtml(String(s.autoDelay))}ms</span>
      </div>
      <div class="config-row"><label>粒子特效</label>
        <select id="cfg-particles"><option value="true" ${s.particles ? "selected" : ""}>开启</option><option value="false" ${!s.particles ? "selected" : ""}>关闭</option></select>
      </div>
      <div class="config-row"><label>背景音乐</label>
        <select id="cfg-bgm"><option value="true" ${s.bgm ? "selected" : ""}>开启</option><option value="false" ${!s.bgm ? "selected" : ""}>关闭</option></select>
      </div>
      <div class="config-row">
        <label style="color:#ff8888;">清空所有存档与图鉴</label>
        <button id="cfg-clear" style="padding:8px 16px;background:rgba(255,80,80,0.4);border:1px solid rgba(255,100,100,0.6);border-radius:8px;color:#fff;cursor:pointer;font-family:inherit;">清空</button>
      </div>
      <div class="config-row config-data-actions">
        <label>数据备份</label>
        <div>
          <button id="cfg-export" type="button">导出 JSON</button>
          <button id="cfg-import" type="button">导入 JSON</button>
          <input id="cfg-import-file" type="file" accept="application/json,.json" hidden>
        </div>
      </div>
      <div class="config-row"><label style="color:rgba(255,200,220,0.6);">已通关周目数</label><span style="color:#ffb8c8;">${state.playCount}</span></div>
    `;
    const ts = document.getElementById("cfg-textspeed");
    const tsVal = document.getElementById("cfg-textspeed-val");
    ts.oninput = () => { tsVal.textContent = ts.value + "ms"; Saves.updateSetting("textSpeed", parseInt(ts.value)); };
    const ad = document.getElementById("cfg-autodelay");
    const adVal = document.getElementById("cfg-autodelay-val");
    ad.oninput = () => { adVal.textContent = ad.value + "ms"; Saves.updateSetting("autoDelay", parseInt(ad.value)); };
    document.getElementById("cfg-particles").onchange = (e) => {
      Saves.updateSetting("particles", e.target.value === "true");
      if (!Saves.settings.particles) stopParticles();
      else if (state.currentBg) updateParticles(state.currentBg);
    };
    document.getElementById("cfg-bgm").onchange = (e) => {
      Saves.updateSetting("bgm", e.target.value === "true");
      if (Saves.settings.bgm && state.currentBg) playBgmForScene(state.currentBg);
      else stopBgm();
    };
    document.getElementById("cfg-export").onclick = () => {
      const blob = new Blob([JSON.stringify(Saves.exportData(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sakura-letters-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      flashHint("备份已导出");
    };
    const importFile = document.getElementById("cfg-import-file");
    document.getElementById("cfg-import").onclick = () => importFile.click();
    importFile.onchange = () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (!Saves.importData(payload)) throw new Error("invalid backup");
          state.playCount = Saves.getFlag("playCount", 0);
          state.loopCount = Saves.getFlag("loopCount", 0);
          updateInboxBadge();
          flashHint("备份已导入");
          renderConfig();
        } catch (e) {
          flashHint("导入失败：备份格式无效或存储不可用");
        } finally {
          importFile.value = "";
        }
      };
      reader.readAsText(file);
    };
    document.getElementById("cfg-clear").onclick = () => {
      if (confirm("确定清空所有存档、图鉴、CG、关键词、合成、记忆和设置吗？此操作不可撤销。")) {
        if (!Saves.clearAll()) {
          flashHint("清空失败：浏览器存储不可用");
          return;
        }
        state.playCount = 0;
        state.visitedNodes = {};
        state.loopCount = 0;
        state.variables = createDefaultVariables();
        flashHint("已清空");
        closeOverlay();
      }
    };
  }

  function renderHistory() {
    if (!state.history.length) {
      el.overlayBody.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px;">暂无历史记录</div>';
      return;
    }
    el.overlayBody.innerHTML = state.history.slice().reverse().map((h) =>
      `<div class="history-entry">
        <div class="h-speaker">${escapeHtml(h.speaker)}</div>
        <div class="h-text">${escapeHtml(h.text)}</div>
      </div>`
    ).join("");
  }

  function renderGallery() {
    el.overlayBody.innerHTML = `<div class="gallery-grid">` + ENDINGS.map((e) => {
      const unlocked = Saves.isEndingUnlocked(e.id);
      return `<div class="gallery-card ${unlocked ? "unlocked" : "locked"}">
        <div class="g-type">${e.type} · ${e.heroine}</div>
        <div class="g-title">${unlocked ? e.title : "？？？？"}</div>
        <div class="g-desc">${unlocked ? e.desc : "尚未解锁"}</div>
      </div>`;
    }).join("") + "</div>";
  }

  function renderAbout() {
    el.overlayBody.innerHTML = `
      <div style="text-align:center;padding:30px 10px;line-height:2;">
        <h2 style="font-size:36px;letter-spacing:8px;background:linear-gradient(180deg,#ffe8f0,#ffb8c8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;">樱时信笺</h2>
        <p style="color:rgba(255,200,220,0.6);letter-spacing:4px;margin-bottom:20px;">Sakura · Letters</p>
        <p style="color:#e8e0d0;">v2.7.8 · Demo</p>
        <p style="color:rgba(255,255,255,0.6);margin-top:20px;">在樱花开落的季节，写下属于你的回信。</p>
        <p style="color:rgba(255,255,255,0.4);margin-top:30px;font-size:13px;">视觉小说 / 校园青春<br>3 位女主 · 10 个主线结局 + 1 篇后日谈<br>多种互动玩法 · CG 图鉴 · 关键词收集<br>★ 时间循环 · 关键词合成 · 真实书写信件 · 视角切换<br>★ 环境线索探索 · 收件箱 · 朋友圈动态 · 梦境碎片 · 涂鸦系统 · 性格画像<br>多周目彩蛋 · 流程图 · BGM<br>建议在桌面浏览器全屏体验</p>
        ${state.loopCount > 0 ? `<p style="color:#c8a8e0;margin-top:20px;">⟲ 当前处于第 ${state.loopCount} 次循环</p>` : ""}
        ${state.playCount >= 1 ? `<p style="color:#ffd88a;margin-top:6px;">已打破循环 ${state.playCount} 次。彩蛋已开启 ♪</p>` : ""}
      </div>
      ${renderPersonalityCard()}
    `;
  }

  /* ============ 关键词面板（含合成台） ============ */
  function renderKeywords() {
    const unlocked = Saves.getKeywords();
    const composed = Saves.getComposed();
    const allAvailable = unlocked.concat(composed); // 合成产物也可作为新合成原料
    const recipes = (window.COMPOSE_RECIPES || []).filter(r => allAvailable.includes(r.a) && allAvailable.includes(r.b));

    let html = "";

    // 合成台
    if (recipes.length > 0) {
      html += `<div style="margin-bottom:24px;padding:18px;background:linear-gradient(135deg, rgba(80,40,100,0.25), rgba(40,30,60,0.4));border:1px solid rgba(255,200,220,0.3);border-radius:14px;">
        <div style="font-size:16px;color:#ffd8e4;letter-spacing:4px;margin-bottom:14px;">✦ 关键词合成台</div>
        <div style="font-size:12px;color:rgba(255,200,220,0.6);margin-bottom:16px;letter-spacing:1px;">将两个关键词融合，得到新的概念。合成产物可作为隐藏对话选项。</div>
        <div class="compose-list" style="display:flex;flex-direction:column;gap:10px;">`;
      recipes.forEach(r => {
        const isComposed = composed.includes(r.result);
        html += `<div class="compose-item" style="display:flex;align-items:center;gap:14px;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,200,220,0.15);border-radius:10px;">
          <span style="padding:4px 12px;background:rgba(168,197,232,0.2);border-radius:6px;color:#a8c5e8;font-size:13px;">${r.a}</span>
          <span style="color:rgba(255,200,220,0.5);">＋</span>
          <span style="padding:4px 12px;background:rgba(240,184,120,0.2);border-radius:6px;color:#f0b878;font-size:13px;">${r.b}</span>
          <span style="color:rgba(255,200,220,0.5);">→</span>
          <span style="padding:4px 12px;background:${isComposed ? 'rgba(255,216,138,0.25)' : 'rgba(255,255,255,0.06)'};border-radius:6px;color:${isComposed ? '#ffd88a' : 'rgba(255,255,255,0.5)'};font-size:13px;font-weight:600;">${isComposed ? r.resultName : '？？？？'}</span>
          ${isComposed ? '<span style="font-size:11px;color:rgba(255,200,220,0.4);letter-spacing:2px;">已合成</span>' : `<button class="compose-btn" data-a="${r.a}" data-b="${r.b}" data-result="${r.result}" data-result-name="${r.resultName}" style="padding:6px 14px;background:rgba(180,80,120,0.4);border:1px solid rgba(255,200,220,0.5);border-radius:6px;color:#ffd8e4;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:2px;">合成</button>`}
        </div>`;
      });
      html += `</div></div>`;
    }

    // 已合成产物
    if (composed.length > 0) {
      html += `<div style="margin-bottom:24px;">
        <div style="font-size:14px;color:#ffd88a;letter-spacing:4px;margin-bottom:12px;">✦ 已合成概念</div>
        <div class="gallery-grid">`;
      composed.forEach(c => {
        const recipe = (window.COMPOSE_RECIPES || []).find(r => r.result === c);
        const name = recipe ? recipe.resultName : c;
        const desc = recipe ? recipe.desc : "未知的概念。";
        html += `<div class="gallery-card unlocked" style="background:linear-gradient(135deg, rgba(255,216,138,0.18), rgba(216,144,90,0.18));border-color:rgba(255,220,150,0.5);">
          <div class="g-type" style="color:#ffd88a;">合成概念</div>
          <div class="g-title" style="color:#ffe8c0;">${name}</div>
          <div class="g-desc">${desc}</div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // 记忆片段
    const memories = Saves.getMemories();
    if (memories.length > 0) {
      html += `<div style="margin-bottom:24px;">
        <div style="font-size:14px;color:#c8a8e0;letter-spacing:4px;margin-bottom:12px;">✦ 记忆片段（循环保留）</div>
        <div class="gallery-grid">`;
      memories.forEach(m => {
        html += `<div class="gallery-card unlocked" style="background:linear-gradient(135deg, rgba(200,168,224,0.18), rgba(140,100,180,0.18));border-color:rgba(200,168,224,0.5);">
          <div class="g-type" style="color:#c8a8e0;">记忆</div>
          <div class="g-title" style="color:#e8d8f0;">${m.id}</div>
          <div class="g-desc">${escapeHtml(m.text.slice(0, 50))}${m.text.length > 50 ? '…' : ''}</div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // 关键词列表
    html += `<div style="font-size:14px;color:#ffd8e4;letter-spacing:4px;margin-bottom:12px;">✦ 已发现关键词</div><div class="gallery-grid">`;
    html += Object.entries(KEYWORDS).map(([kw, desc]) => {
      const isUnlocked = unlocked.includes(kw);
      return `<div class="gallery-card ${isUnlocked ? "unlocked" : "locked"}">
        <div class="g-type">关键词</div>
        <div class="g-title">${isUnlocked ? kw : "？？？？"}</div>
        <div class="g-desc">${isUnlocked ? desc : "尚未发现"}</div>
      </div>`;
    }).join("");
    html += "</div>";

    el.overlayBody.innerHTML = html;

    // 绑定合成按钮
    el.overlayBody.querySelectorAll(".compose-btn").forEach(btn => {
      btn.onclick = () => {
        const a = btn.dataset.a, b = btn.dataset.b;
        const result = btn.dataset.result, resultName = btn.dataset.resultName;
        if (Saves.composeKeyword(a, b, result)) {
          flashHint(`✦ 合成成功：${resultName}`);
          renderKeywords();
        }
      };
    });
  }

  /* ============ CG 图鉴 ============ */
  function renderCGGallery() {
    el.overlayBody.innerHTML = `<div class="cg-grid">` + CGS.map((cg) => {
      const unlocked = Saves.isCGUnlocked(cg.id);
      return `<div class="cg-card ${unlocked ? "unlocked" : "locked"}">
        ${unlocked ? cg.svg : `<div class="cg-locked-placeholder"><div>？？？</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">${cg.heroine}</div></div>`}
        <div class="cg-info">
          <div class="cg-title">${unlocked ? cg.title : "未解锁"}</div>
          <div class="cg-heroine">${cg.heroine}</div>
        </div>
      </div>`;
    }).join("") + "</div>";
  }

  /* ============ 流程图 ============ */
  function renderFlowchart() {
    const groups = [
      { title: "序章 · 第 1 日", nodes: ["prologue_1", "prologue_8", "prologue_19", "prologue_25", "prologue_32"] },
      { title: "共通线 · 第 2-5 日", nodes: ["common_day2_morning", "day2_choice", "d2_senior_easter", "d2_noon", "common_day3_morning", "d3_choice", "d3_xiazhi_minigame", "d3_noon", "common_day4_morning", "d4_choice", "d4_shiyu_minigame", "d4_sunian_minigame", "d4_noon", "common_day5_morning", "d5_route_check"] },
      { title: "林诗雨线", nodes: ["route_shiyu_1", "sy_9", "sy_minigame", "sy_choice_1", "sy_ending_good", "sy_ending_normal", "sy_ending_bad"] },
      { title: "夏织线", nodes: ["route_xiazhi_1", "xz_9", "xz_minigame", "xz_choice_1", "xz_ending_good", "xz_ending_normal", "xz_ending_bad"] },
      { title: "苏念线", nodes: ["route_sunian_1", "sn_9", "sn_minigame", "sn_choice_1", "sn_ending_good", "sn_ending_normal", "sn_ending_bad"] },
      { title: "真结局", nodes: ["true_end_entry", "true_choice", "true_ending"] },
      { title: "后日谈", nodes: ["afterword_entry", "afterword_postcard", "afterword_reply", "afterword_timeline", "afterword_autumn", "afterword_mailbox_reply", "afterword_mailbox_rules", "afterword_mailbox_triage", "afterword_wall", "afterword_wall_reflection", "afterword_proofread", "afterword_proofread_clean", "afterword_proofread_recheck", "afterword_ending"] },
    ];
    el.overlayBody.innerHTML = groups.map(g => {
      return `<div class="flow-group">
        <div class="flow-group-title">${g.title}</div>
        <div class="flow-nodes">${g.nodes.map(nid => {
          const node = SCRIPT[nid];
          if (!node) return "";
          const visited = state.visitedNodes[nid] > 0;
          const isEnding = node.ending;
          const text = node.ending ? node.ending.title : (node.choice ? "选择" : (node.text || "").slice(0, 16) + "…");
          return `<div class="flow-node ${visited ? "visited" : ""} ${isEnding ? "ending" : ""}" title="${escapeHtml(node.text || "")}">
            ${visited ? "" : "🔒"}${escapeHtml(text)}
          </div>`;
        }).join("")}</div>
      </div>`;
    }).join("") + `<div style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;font-size:12px;">已访问节点：${Object.keys(state.visitedNodes).length}</div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ============================================================
     v0.5.0 新玩法实现
     ============================================================ */

  /* ============ 环境线索 ============ */
  function renderClues(node) {
    if (!el.clueLayer) return;
    el.clueLayer.innerHTML = "";
    if (!node || !node.clues || !Array.isArray(node.clues)) return;
    node.clues.forEach((clue) => {
      const found = Saves.isClueFound(clue.id);
      const spot = document.createElement("div");
      spot.className = "clue-hotspot" + (found ? " found" : "");
      spot.style.left = clue.x + "%";
      spot.style.top = clue.y + "%";
      spot.style.width = (clue.w || 8) + "%";
      spot.style.height = (clue.h || 8) + "%";
      spot.title = found ? "已发现" : "可探索";
      spot.onclick = (e) => {
        e.stopPropagation();
        if (found) return;
        Saves.markClueFound(clue.id);
        spot.classList.add("found");
        if (clue.keyword && Saves.unlockKeyword(clue.keyword)) flashHint(`✦ 线索解锁关键词：${clue.keyword}`);
        if (clue.memory && !Saves.isMemoryUnlocked(clue.memory.id)) {
          Saves.saveMemory(clue.memory.id, clue.memory.text || clue.text);
          flashHint(`✦ 记忆片段：${clue.memory.id}`);
        }
        if (clue.personality) {
          for (const dim in clue.personality) Saves.addPersonality(dim, clue.personality[dim]);
        }
        showClueTip(clue, spot);
      };
      el.clueLayer.appendChild(spot);
    });
  }

  function showClueTip(clue, anchor) {
    document.querySelectorAll(".clue-tip").forEach(t => t.remove());
    const tip = document.createElement("div");
    tip.className = "clue-tip";
    const titleHtml = clue.title ? `<div style="color:#ffd88a;font-size:13px;margin-bottom:6px;letter-spacing:2px;">${escapeHtml(clue.title)}</div>` : "";
    tip.innerHTML = titleHtml + escapeHtml(clue.text);
    el.clueLayer.appendChild(tip);
    // 定位到锚点附近
    const rect = anchor.getBoundingClientRect();
    const gameRect = document.getElementById("game").getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.left - gameRect.left + rect.width + 8;
    let top = rect.top - gameRect.top;
    if (left + tipRect.width > gameRect.width - 10) left = rect.left - gameRect.left - tipRect.width - 8;
    if (top + tipRect.height > gameRect.height - 10) top = gameRect.height - tipRect.height - 10;
    if (top < 10) top = 10;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
    setTimeout(() => {
      const close = document.createElement("div");
      close.textContent = "✕ 收起";
      close.style.cssText = "margin-top:10px;text-align:right;color:rgba(255,200,220,0.6);font-size:12px;cursor:pointer;letter-spacing:2px;";
      close.onclick = (e) => { e.stopPropagation(); tip.remove(); };
      tip.appendChild(close);
    }, 100);
  }

  /* ============ 收件箱 ============ */
  function updateInboxBadge() {
    if (!el.inboxBadge) return;
    const n = Saves.inboxUnreadCount();
    if (n > 0) {
      el.inboxBadge.textContent = n > 9 ? "9+" : n;
      el.inboxBadge.classList.remove("hidden");
      el.inboxBadge.classList.add("pulse");
    } else {
      el.inboxBadge.classList.add("hidden");
      el.inboxBadge.classList.remove("pulse");
    }
  }

  function renderInbox() {
    const list = Saves.getInbox().slice().reverse();
    if (!list.length) {
      el.overlayBody.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:60px 10px;letter-spacing:3px;">收件箱是空的</div>';
      return;
    }
    const html = '<div class="inbox-list">' + list.map(m => {
      const ch = CHARACTERS[m.char] || { name: m.from || "未知", color: "#d8d8d8" };
      const avatar = m.char ? (ch.name?.slice(0,1) || "？") : "✉";
      const preview = (m.body || "").slice(0, 40);
      let tags = "";
      if (m.expired && m.replied === null) tags = `<span class="inbox-tag expired">超时</span>`;
      else if (m.replied !== null) tags = `<span class="inbox-tag replied">已回复</span>`;
      else if (!m.read) tags = `<span class="inbox-tag unread">未读</span>`;
      return `<div class="inbox-msg ${!m.read ? 'unread' : ''} ${m.expired && m.replied === null ? 'expired' : ''}" data-id="${m.id}">
        <div class="inbox-avatar" style="background:${ch.color};color:#1a1020;">${escapeHtml(avatar)}</div>
        <div class="inbox-body">
          <div class="inbox-from">${tags}${escapeHtml(ch.name)}</div>
          <div class="inbox-preview">${escapeHtml(preview || m.title || "（无内容）")}</div>
          <div class="inbox-meta">${m.title ? escapeHtml(m.title) + " · " : ""}${Saves.formatTime(m.ts)}</div>
        </div>
      </div>`;
    }).join("") + '</div>';
    el.overlayBody.innerHTML = html;
    el.overlayBody.querySelectorAll(".inbox-msg").forEach(node => {
      node.onclick = () => {
        const id = node.dataset.id;
        const msg = Saves.getInbox().find(x => x.id === id);
        if (!msg) return;
        Saves.markInboxRead(id);
        updateInboxBadge();
        showInboxReply(msg);
      };
    });
  }

  function showInboxReply(msg) {
    let layer = document.getElementById("inbox-reply-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "inbox-reply-layer";
      layer.className = "inbox-reply-layer";
      document.getElementById("game").appendChild(layer);
    }
    layer.innerHTML = "";
    const ch = CHARACTERS[msg.char] || { name: msg.from || "未知", color: "#d8d8d8" };
    const card = document.createElement("div");
    card.className = "inbox-reply-card";
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div class="inbox-avatar" style="background:${ch.color};color:#1a1020;width:42px;height:42px;">${escapeHtml(ch.name.slice(0,1))}</div>
        <div>
          <div style="font-size:15px;letter-spacing:3px;color:#ffd8e4;">${escapeHtml(ch.name)}</div>
          ${msg.title ? `<div style="font-size:12px;color:rgba(255,200,220,0.5);letter-spacing:2px;">${escapeHtml(msg.title)}</div>` : ""}
        </div>
      </div>
      <div style="font-size:14px;line-height:2;color:rgba(255,240,248,0.9);letter-spacing:1px;margin-bottom:18px;white-space:pre-wrap;">${escapeHtml(msg.body || "")}</div>
    `;
    layer.appendChild(card);

    const isExpired = msg.expired && msg.replied === null;
    const isReplied = msg.replied !== null;

    if (isReplied) {
      const replyShow = document.createElement("div");
      replyShow.style.cssText = "margin-top:8px;padding:12px;background:rgba(120,200,140,0.12);border-left:3px solid rgba(150,220,170,0.5);border-radius:6px;font-size:13px;color:#c8f0d0;line-height:1.8;letter-spacing:1px;";
      replyShow.innerHTML = `<b style="color:#a8d8b8;">你的回复：</b><br>${escapeHtml(typeof msg.replied === "string" ? msg.replied : "（已选择）")}`;
      card.appendChild(replyShow);
      const close = document.createElement("button");
      close.textContent = "关闭";
      close.className = "choice-btn";
      close.style.cssText = "margin-top:18px;display:block;margin-left:auto;padding:8px 22px;background:rgba(60,40,80,0.6);border:1px solid rgba(255,200,220,0.4);color:#ffd8e4;border-radius:8px;cursor:pointer;letter-spacing:3px;";
      close.onclick = () => layer.remove();
      card.appendChild(close);
    } else if (isExpired) {
      const note = document.createElement("div");
      note.style.cssText = "margin-top:8px;padding:12px;background:rgba(120,120,140,0.12);border-left:3px solid rgba(150,150,170,0.5);border-radius:6px;font-size:13px;color:#c0c0c0;line-height:1.8;";
      note.textContent = "未在限时内回复。消息已过期。";
      card.appendChild(note);
      const close = document.createElement("button");
      close.textContent = "关闭";
      close.className = "choice-btn";
      close.style.cssText = "margin-top:18px;display:block;margin-left:auto;padding:8px 22px;background:rgba(60,40,80,0.6);border:1px solid rgba(255,200,220,0.4);color:#ffd8e4;border-radius:8px;cursor:pointer;letter-spacing:3px;";
      close.onclick = () => layer.remove();
      card.appendChild(close);
    } else {
      // 限时倒计时
      let remaining = msg.deadline || 0;
      const countdown = document.createElement("div");
      countdown.className = "inbox-countdown";
      card.appendChild(countdown);
      function updateCountdown() {
        const s = Math.max(0, Math.floor(remaining / 1000));
        countdown.textContent = `⏳ 倒计时 ${s}s`;
        countdown.classList.toggle("warn", s <= 10);
      }
      updateCountdown();
      const timer = setInterval(() => {
        remaining -= 1000;
        if (remaining <= 0) {
          clearInterval(timer);
          Saves.markInboxExpired(msg.id);
          layer.remove();
          flashHint("消息超时未回复");
        } else updateCountdown();
      }, 1000);
      card._countdownTimer = timer;
      // 卸载时清理
      const origRemove = layer.remove.bind(layer);
      layer.remove = function() { clearInterval(timer); origRemove(); };

      // 回复区
      const replyArea = document.createElement("div");
      replyArea.style.cssText = "margin-top:14px;display:flex;flex-direction:column;gap:10px;";
      card.appendChild(replyArea);

      if (msg.type === "free") {
        const ta = document.createElement("textarea");
        ta.placeholder = msg.hint || "在此写下你想说的话…";
        ta.style.cssText = "width:100%;height:100px;padding:14px;background:rgba(20,15,30,0.85);border:1px solid rgba(255,200,220,0.3);border-radius:10px;color:#ffe8f0;font-family:inherit;font-size:14px;line-height:1.8;resize:none;";
        ta.maxLength = 160;
        replyArea.appendChild(ta);
        const send = document.createElement("button");
        send.textContent = "✉ 寄出";
        send.className = "choice-btn";
        send.style.cssText = "padding:10px 22px;background:linear-gradient(135deg,rgba(180,80,120,0.5),rgba(140,60,160,0.5));border:1px solid rgba(255,200,220,0.5);border-radius:8px;color:#ffd8e4;letter-spacing:3px;cursor:pointer;";
        send.onclick = () => {
          const v = ta.value.trim();
          if (!v) { flashHint("不能为空"); return; }
          clearInterval(timer);
          Saves.markInboxReplied(msg.id, v);
          // 关键词检测
          const matched = (msg.matchings || []).filter(m => m.keywords.some(kw => v.includes(kw)));
          if (matched.length > 0 && matched[0].add) applyAdd(matched[0].add);
          if (matched.length > 0 && matched[0].personality) {
            for (const dim in matched[0].personality) Saves.addPersonality(dim, matched[0].personality[dim]);
          }
          if (matched.length > 0 && matched[0].memory) Saves.saveMemory(matched[0].memory.id || matched[0].id, v);
          flashHint(matched.length > 0 ? `✦ 回复触发：${matched[0].id}` : "已寄出");
          layer.remove();
          updateHeartBar();
        };
        replyArea.appendChild(send);
      } else {
        (msg.options || []).forEach(opt => {
          const btn = document.createElement("button");
          btn.className = "choice-btn";
          btn.textContent = opt.text;
          btn.style.cssText = "padding:10px 18px;background:rgba(60,40,80,0.6);border:1px solid rgba(255,200,220,0.3);border-radius:8px;color:#ffd8e4;letter-spacing:2px;cursor:pointer;text-align:left;";
          btn.onclick = () => {
            clearInterval(timer);
            Saves.markInboxReplied(msg.id, opt.text);
            if (opt.add) { applyAdd(opt.add); updateHeartBar(); }
            if (opt.personality) {
              for (const dim in opt.personality) Saves.addPersonality(dim, opt.personality[dim]);
            }
            flashHint("已回复");
            layer.remove();
          };
          replyArea.appendChild(btn);
        });
      }
      // 稍后回复按钮
      const later = document.createElement("button");
      later.textContent = "稍后回复（保留倒计时）";
      later.style.cssText = "margin-top:4px;padding:6px 14px;background:transparent;border:none;color:rgba(255,200,220,0.5);font-size:12px;cursor:pointer;letter-spacing:2px;";
      later.onclick = () => { clearInterval(timer); layer.remove(); };
      card.appendChild(later);
    }
  }

  /* ============ 朋友圈 ============ */
  function renderMoments() {
    const moments = (window.MOMENTS || []);
    const published = Saves.getMoments().slice().reverse();
    if (!published.length) {
      el.overlayBody.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:60px 10px;letter-spacing:3px;">还没有动态</div>';
      return;
    }
    const liked = Saves.getLikedMoments();
    const allComments = Saves.getMomentComments();
    const html = '<div class="moments-list">' + published.map(pm => {
      const m = moments.find(x => x.id === pm.id);
      if (!m) return "";
      const ch = CHARACTERS[m.char] || { name: "未知", color: "#d8d8d8" };
      const isLiked = liked.includes(m.id);
      const myComments = allComments[m.id] || [];
      const commentHtml = m.comments
        ? `<div class="moment-comment-list" data-id="${m.id}">${myComments.map(c => {
            const opt = m.comments.find(o => o.value === c);
            return `<div class="moment-comment"><b>我：</b> ${escapeHtml(opt ? opt.text : c)}</div>`;
          }).join("")}</div>`
        : "";
      const commentOpts = (m.comments || []).filter(o => !myComments.includes(o.value));
      const commentBtns = commentOpts.length > 0
        ? `<div class="moment-comments" data-id="${m.id}">${commentOpts.map(o => `<span class="moment-action comment-opt" data-id="${m.id}" data-value="${escapeHtml(o.value)}" style="display:inline-block;margin-right:8px;margin-bottom:4px;font-size:12px;">${escapeHtml(o.text)}</span>`).join("")}</div>`
        : "";
      return `<div class="moment-card" data-id="${m.id}">
        <div class="moment-head">
          <div class="moment-avatar" style="background:${ch.color};color:#1a1020;">${escapeHtml(ch.name.slice(0,1))}</div>
          <div class="moment-name" style="color:${ch.color};">${escapeHtml(ch.name)}</div>
          <div class="moment-time">${Saves.formatTime(pm.ts).slice(5, 16)}</div>
        </div>
        <div class="moment-text">${escapeHtml(m.text)}</div>
        ${m.image ? `<img class="moment-image" src="${m.image}" alt="">` : ""}
        <div class="moment-actions">
          <span class="moment-action like-btn ${isLiked ? 'liked' : ''}" data-id="${m.id}">${isLiked ? '❤️' : '🤍'} ${isLiked ? '已赞' : '点赞'}</span>
          <span class="moment-action" style="color:rgba(255,200,220,0.5);">${(m.likes || 0) + (isLiked ? 1 : 0)} 人赞</span>
        </div>
        ${commentHtml}
        ${commentBtns}
      </div>`;
    }).join("") + '</div>';
    el.overlayBody.innerHTML = html;

    // 点赞
    el.overlayBody.querySelectorAll(".like-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const nowLiked = Saves.toggleLikeMoment(id);
        if (nowLiked === null) {
          flashHint("操作失败：浏览器存储不可用");
          return;
        }
        const m = moments.find(x => x.id === id);
        if (nowLiked && m && m.likeAffection) {
          applyAdd(m.likeAffection);
          updateHeartBar();
        }
        btn.classList.toggle("liked", nowLiked);
        btn.innerHTML = nowLiked ? '❤️ 已赞' : '🤍 点赞';
        flashHint(nowLiked ? "已点赞" : "取消点赞");
      };
    });
    // 评论
    el.overlayBody.querySelectorAll(".comment-opt").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const value = btn.dataset.value;
        if (Saves.addMomentComment(id, value)) {
          const m = moments.find(x => x.id === id);
          const opt = m?.comments?.find(o => o.value === value);
          if (opt && opt.add) { applyAdd(opt.add); updateHeartBar(); }
          if (opt && opt.personality) {
            for (const dim in opt.personality) Saves.addPersonality(dim, opt.personality[dim]);
          }
          flashHint("已评论");
          renderMoments(); // 刷新
        }
      };
    });
  }

  /* ============ 梦境 ============ */
  function enterDream(dream, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "dream-layer";
    const title = document.createElement("div");
    title.className = "dream-title";
    title.textContent = dream.title || "❉ 梦 境 ❉";
    layer.appendChild(title);
    const hint = document.createElement("div");
    hint.className = "dream-hint";
    hint.textContent = dream.hint || "点击场景探索 · 收集梦境碎片";
    layer.appendChild(hint);
    document.getElementById("game").appendChild(layer);

    const scenes = dream.scenes || [];
    const positions = [
      { left: "12%", top: "30%" }, { right: "12%", top: "30%" },
      { left: "30%", top: "62%" }, { right: "30%", top: "62%" },
      { left: "50%", top: "15%", transform: "translateX(-50%)" },
      { left: "50%", top: "82%", transform: "translateX(-50%)" },
    ];
    scenes.forEach((sc, idx) => {
      const pos = positions[idx % positions.length];
      const btn = document.createElement("div");
      btn.className = "dream-scene";
      Object.assign(btn.style, pos);
      btn.innerHTML = `<div class="ds-icon">${sc.icon || "✦"}</div><div>${escapeHtml(sc.label || "场景")}</div>`;
      btn.onclick = () => {
        if (btn.classList.contains("visited")) return;
        btn.classList.add("visited");
        // 显示场景对话
        const txt = document.createElement("div");
        txt.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:520px;padding:24px 32px;background:rgba(20,16,28,0.92);border:1px solid rgba(200,168,224,0.5);border-radius:14px;color:#ffd8e4;font-size:15px;line-height:2;letter-spacing:1px;box-shadow:0 8px 30px rgba(0,0,0,0.7);z-index:37;";
        txt.innerHTML = `<div style="color:#c8a8e0;font-size:13px;letter-spacing:3px;margin-bottom:10px;">${escapeHtml(sc.label || "场景")}</div>${escapeHtml(sc.text || "")}`;
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "合上";
        closeBtn.style.cssText = "margin-top:18px;display:block;margin-left:auto;padding:8px 20px;background:rgba(180,80,120,0.4);border:1px solid rgba(255,200,220,0.5);border-radius:8px;color:#ffd8e4;font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer;";
        closeBtn.onclick = (e) => { e.stopPropagation(); txt.remove(); };
        txt.appendChild(closeBtn);
        layer.appendChild(txt);
        // 收集碎片
        if (sc.shard) {
          if (Saves.addDreamShard(sc.shard.id, sc.shard.text)) {
            flashHint(`✦ 梦境碎片：${sc.shard.id}`);
          }
        }
        // 累积性格
        if (sc.personality) {
          for (const dim in sc.personality) Saves.addPersonality(dim, sc.personality[dim]);
        }
      };
      layer.appendChild(btn);
    });

    // 退出按钮
    const exit = document.createElement("button");
    exit.textContent = "✕ 醒来";
    exit.style.cssText = "position:absolute;top:20px;right:20px;padding:8px 18px;background:rgba(60,30,75,0.8);border:1px solid rgba(255,200,220,0.4);border-radius:8px;color:#ffd8e4;font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer;z-index:37;";
    exit.onclick = () => {
      layer.remove();
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
    };
    layer.appendChild(exit);
  }

  /* ============================================================
     v0.6.0 拼贴诗系统 runCollage
     —— 把已解锁关键词拖到画布，按意象密度判定走向
     node.collage = {
       prompt, minWords, maxWords,
       words (可选: 自定义词表；不填则用已解锁关键词+合成词),
       tag (评分维度阈值，{good:5,bad:2}),
       scoreBonus: { good:{...}, normal:{...}, bad:{...} },
       scoreJump:  { good:"nodeId", normal:"nodeId", bad:"nodeId" }
     }

  /* ============================================================
     v0.6.0 回声系统 triggerEcho
     —— 玩家说过的重要台词在关键节点复现，可选择承认/否认
     node.echo = {
       id (回声 ID), text (复现的台词), ctx (出处),
       choices: [
         { text:"承认", value:"admit", add:{...}, personality:{...}, next:"nodeId", memory:{...} },
         { text:"否认", value:"deny",  add:{...}, personality:{...}, next:"nodeId", memory:{...} },
         { text:"沉默", value:"silent", add:{...}, personality:{...}, next:"nodeId", memory:{...} }
       ]
     }
     ============================================================ */
  function triggerEcho(echo, currentNodeId) {
    const layer = document.createElement("div");
    layer.className = "echo-layer";
    layer.id = "echo-layer";

    const head = document.createElement("div");
    head.className = "echo-head";
    head.innerHTML = `<span class="echo-icon">❝</span> 回 声 <span class="echo-icon">❞</span>`;
    layer.appendChild(head);

    const quote = document.createElement("div");
    quote.className = "echo-quote";
    quote.textContent = echo.text || "";
    layer.appendChild(quote);

    const ctx = document.createElement("div");
    ctx.className = "echo-ctx";
    ctx.textContent = echo.ctx ? `—— ${echo.ctx}` : "—— 你曾经说过";
    layer.appendChild(ctx);

    // 检查是否已保存为回声
    const saved = Saves.getEcho(echo.id);
    if (saved && saved.acknowledged) {
      const ack = document.createElement("div");
      ack.className = "echo-acknowledged";
      ack.textContent = `（你已选择：${saved.acknowledged === "admit" ? "承认" : saved.acknowledged === "deny" ? "否认" : "沉默"}）`;
      layer.appendChild(ack);
      const close = document.createElement("button");
      close.className = "echo-close";
      close.textContent = "✕ 继续";
      close.onclick = () => { layer.remove(); };
      layer.appendChild(close);
      document.getElementById("game").appendChild(layer);
      return;
    }

    const choices = echo.choices || [];
    const btns = document.createElement("div");
    btns.className = "echo-choices";
    choices.forEach(c => {
      const b = document.createElement("button");
      b.className = "echo-choice";
      b.textContent = c.text;
      b.onclick = () => {
        Saves.acknowledgeEcho(echo.id, c.value);
        if (c.add) { applyAdd(c.add); updateHeartBar(); }
        if (c.personality) for (const dim in c.personality) Saves.addPersonality(dim, c.personality[dim]);
        if (c.memory && !Saves.isMemoryUnlocked(c.memory.id)) {
          Saves.saveMemory(c.memory.id, c.memory.text);
          flashHint(`✦ 记忆片段：${c.memory.id}`);
        }
        layer.remove();
        if (c.next) gotoNode(c.next);
      };
      btns.appendChild(b);
    });
    layer.appendChild(btns);

    document.getElementById("game").appendChild(layer);
  }

  /* ============================================================
     v0.6.0 摄影构图系统 runPhoto
     —— 场景内拖动取景框，按构图规则评分
     node.photo = {
       prompt, scene (可选: 自定义场景图，不填用当前 bg),
       rules: ["thirds","center","diagonal"], // 评分规则
       targets: [{x,y,w,h, label}],           // 取景目标（可点击的高价值区）
       scoreBonus: { high:{...}, mid:{...}, low:{...} },
       scoreJump:  { high:"nodeId", mid:"nodeId", low:"nodeId" }
     }

  /* ============================================================
     v0.6.0 节奏敲击系统 runRhythm
     —— 对话中按节奏点击，模拟心跳/呼吸同步
     node.rhythm = {
       prompt,
       bpm (节拍速度，60-180),
       beats (总节拍数，8-32),
       pattern (可选：自定义强弱拍 [1,0,1,0,...])
       scoreBonus: { high:{...}, mid:{...}, low:{...} },
       scoreJump:  { high:"nodeId", mid:"nodeId", low:"nodeId" }
     }

  /* ============================================================
     v0.7.0 气味收集系统 runScent
     node.scent = {
       prompt: "图书馆里有几种气味——细闻哪一个？",
       items: [
         { id, name, desc, scene?, tag? }
       ],
       min: 1,                  // 至少细闻几个
       next: "nodeId"            // 可选，覆盖默认 next
     }

  /* ============================================================
     v0.7.0 气味闪回触发 triggerScentRecall
     node.scentRecall = {
       scentId: "old_book",         // 要触发的气味 id（必须先收集过）
       recallId: "recall_d3_old_book", // 闪回唯一 id，避免重复触发
       text: "——我又闻到了那个味道。",
       flashback: "「纸的味道会变。」她那时候这么说。",
       choices: [
         { text, value, add?, personality?, memory?, next }
       ]
     }
     未收集过该气味时，跳过闪回，进入 node.next
     ============================================================ */
  function triggerScentRecall(recall, currentNodeId) {
    const node = SCRIPT[currentNodeId];
    const hasScent = Saves.isScentCollected(recall.scentId);
    const already = Saves.isScentRecalled(recall.scentId, recall.recallId);

    if (!hasScent) {
      // 未收集过该气味 → 直接跳过
      const jumpTo = recall.skipNext || (node && node.next);
      if (jumpTo) gotoNode(jumpTo);
      return;
    }

    // 已收集且已触发过 → 视为已确认，直接走已确认分支（避免重复弹窗）
    if (already) {
      const ack = recall.acknowledgedNext || (node && node.next);
      if (ack) gotoNode(ack);
      return;
    }

    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "scent-recall-layer";
    layer.id = "scent-recall-layer";
    layer.innerHTML = `
      <div class="scent-recall-quote">
        <div class="scent-recall-label">✦ 气味闪回</div>
        <div class="scent-recall-text">${recall.text || ""}</div>
        <div class="scent-recall-flashback">${recall.flashback || ""}</div>
      </div>
      <div class="scent-recall-choices"></div>
    `;
    const choicesEl = layer.querySelector(".scent-recall-choices");

    (recall.choices || []).forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "scent-recall-btn";
      btn.textContent = choice.text;
      btn.onclick = () => {
        if (choice.add) { applyAdd(choice.add); updateHeartBar(); }
        if (choice.personality) {
          for (const dim in choice.personality) Saves.addPersonality(dim, choice.personality[dim]);
        }
        if (choice.memory) {
          if (!Saves.isMemoryUnlocked(choice.memory.id)) {
            Saves.saveMemory(choice.memory.id, choice.memory.text);
            flashHint(`✦ 新记忆：${choice.memory.title}`);
          }
        }
        Saves.markScentRecalled(recall.scentId, recall.recallId);
        layer.remove();
        const jumpTo = choice.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      choicesEl.appendChild(btn);
    });

    document.getElementById("game").appendChild(layer);
  }

  /* ============================================================
     v0.7.0 沉默选择 runSilenceChoice
     node.silenceChoice = {
       prompt: "她问：你为什么不说话？",
       duration: 10,            // 倒计时秒数
       options: [{ text, value, add?, personality?, memory?, next }],
       silent: {                // 超时进入的沉默分支
         text, add?, personality?, memory?, next
       }
     }

  /* ============================================================
     v0.7.0 触觉关怀 runTouch
     node.touch = {
       prompt: "她看上去很难过——",
       char: "shiyu",            // 立绘角色（仅用于定位，渲染由 node.char 决定）
       parts: [
         { id, label, x, y, w, h, dialogue, add?, personality?, memory? }
       ],
       exitText: "（你收回手。）",
       next: "nodeId"           // 可选
     }

  /* ============================================================
     v0.7.0 温度感知 runTemperature
     node.temperature = {
       prompt: "她问：现在是什么感觉？",
       scoreBonus: {
         warm:    { affection: { ... }, personality: { ... } },
         neutral: { ... },
         cool:    { ... }
       },
       scoreJump: { warm: "...", neutral: "...", cool: "..." },
       next: "..."  // 默认跳转
     }
     温度范围 -100（极冷）到 +100（极暖），按 -30/+30 划分三档

  /* ============================================================
     v0.8.0 笔迹选择 runHandwriting
     node.handwriting = {
       prompt: "你拿笔开始写——选一种笔迹",
       letter: "letter_2",
       styles: [
         { id, label, desc, add?, personality?, memory?, next }
       ]
     }

  /* ============================================================
     v0.8.0 情绪光谱 runSpectrum
     node.spectrum = {
       prompt: "此刻你的心，在哪？",
       // x: -100(不悦) ~ +100(愉悦)；y: -100(平静) ~ +100(激活)
       quadrants: {
         // 象限 tag：右上愉悦激活/右下愉悦平静/左上不悦激活/左下不悦平静
         q_tr: { tag: "joy_active",   label: "愉悦·激昂", add?, personality?, memory?, next },
         q_br: { tag: "joy_calm",     label: "愉悦·平静", add?, personality?, memory?, next },
         q_tl: { tag: "sad_active",   label: "不悦·激昂", add?, personality?, memory?, next },
         q_bl: { tag: "sad_calm",     label: "不悦·平静", add?, personality?, memory?, next }
       },
       fallback: { tag: "center", next }
     }

  /* ============================================================
     v0.9.0 星座连线 runConstellation
     node.constellation = {
       prompt: "夜空散布星点——按你的直觉连线",
       stars: [ { id, x, y, name } ],   // x,y 为 0~100 百分比坐标
       constellations: [
         { stars: ["a","b","c"], tag: "trio", label, text, add?, personality?, memory?, next }
       ],
       min: 2,   // 至少连几颗
       fallback: { tag: "default", next }
     }
     ============================================================ */

  /* ============================================================
     v0.9.0 心声听诊 runStethoscope
     node.stethoscope = {
       prompt: "把听诊器贴在胸口——跟随心跳",
       bpm: 72,
       beats: 12,         // 总节拍数
       window: 0.3,       // 命中窗口（秒，前后各一半）
       thresholds: [
         { min: 0.8, tag: "sync", label, text, add?, memory?, next },
         { min: 0.5, tag: "half", label, text, next }
       ],
       fallback: { tag: "miss", next }
     }
     ============================================================ */

  /* ============================================================
     v0.9.0 信物拼图 runPuzzle
     node.puzzle = {
       prompt: "把碎片按你的记忆拼起来——",
       pieces: [ { id, label, desc } ],
       interpretations: [
         { order: ["a","b","c","d"], tag, label, text, add?, memory?, next }
       ],
       min: 2,
       fallback: { tag: "default", next }
     }
     ============================================================ */

  /* ============================================================
     v0.9.0 气味调香 runPerfume
     node.perfume = {
       prompt: "用三种香调调一瓶香水——",
       notes: ["前调", "中调", "后调"],
       ingredients: [ { id, label, desc, note } ],  // note = "前调"/"中调"/"后调"
       recipes: [
         { ids: ["a","b","c"], tag, label, text, add?, memory?, next }
       ],
       fallback: { tag: "default", next }
     }
     ============================================================ */

  // 在指定节点触发时光胶囊投递（读取未投递的胶囊）
  function deliverTimecapsules(nodeId) {
    const caps = Saves.getTimecapsulesForNode(nodeId);
    if (!caps.length) return;
    const layer = document.createElement("div");
    layer.className = "timecapsule-deliver-layer";
    layer.id = "timecapsule-deliver-layer";
    const capsHtml = caps.map((c, i) => `<div class="tc-deliver-item" data-idx="${i}">
      <div class="tc-deliver-label">来自过去的胶囊 #${i + 1}</div>
      <div class="tc-deliver-msg">${(c.message || "").replace(/</g, "&lt;")}</div>
    </div>`).join("");
    layer.innerHTML = `
      <div class="tc-deliver-wrap">
        <div class="tc-deliver-title">——过去的自己寄来了一封信——</div>
        ${capsHtml}
        <button class="tc-deliver-close">读完</button>
      </div>
    `;
    layer.querySelector(".tc-deliver-close").onclick = () => {
      caps.forEach(c => Saves.markTimecapsuleDelivered(c.sourceNodeId));
      layer.remove();
    };
    document.getElementById("game").appendChild(layer);
  }

  /* ============================================================
     v1.2.0 茶席品茗 runTea
     node.tea = {
       prompt: "泡一壶茶——",
       target: { temp: 0.6, amount: 0.4, time: 0.5 }, // 0~1 目标值
       tolerance: 0.15,
       thresholds: [
         { min: 0.85, tag, label, text, add?, memory?, next },
         { min: 0.55, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.2.0 星象观测 runAstronomy
     node.astronomy = {
       prompt: "旋转星图盘——对齐今夜的星座",
       constellations: ["aries","taurus","gemini",...],  // 盘上星座
       target: "libra",   // 目标星座
       clue: "天秤座的星辰今夜最亮",
       thresholds: [
         { isTarget: true, tag, label, text, add?, memory?, next },
         { isTarget: false, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.2.0 颜料调配 runPalette
     node.palette = {
       prompt: "调出她裙摆的颜色——",
       target: { r: 216, g: 112, b: 144 },   // 0~255
       tolerance: 30,
       thresholds: [
         { min: 0.85, tag, label, text, add?, memory?, next },
         { min: 0.55, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.2.0 琴键演奏 runPiano
     node.piano = {
       prompt: "弹奏她哼过的旋律——",
       keys: 8,                    // 琴键数
       sequence: [0,2,4,2,0],      // 目标序列（琴键索引）
       showSequence: true,         // 是否先展示序列
       thresholds: [
         { min: 0.85, tag, label, text, add?, memory?, next },
         { min: 0.55, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.3.0 占星骰子 runDice
     node.dice = {
       prompt: "掷三个骰子——解读命运",
       rolls: 3,                    // 掷几次（保留最后一次或求和）
       thresholds: [
         { min: 15, tag, label, text, add?, memory?, next },   // sum >= 15
         { min: 8,  tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.3.0 风向感知 runWind
     node.wind = {
       prompt: "调整帆角度——借风前进",
       target: 80,            // 目标进度（0~100）
       maxAttempts: 6,        // 最多调整次数
       thresholds: [
         { min: 0.85, tag, label, text, add?, memory?, next },
         { min: 0.5,  tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.3.0 梦境解码 runDecode
     node.decode = {
       prompt: "把梦境碎片重排成一句完整的话——",
       scrambled: ["雨","在","窗","外","停","了"],   // 乱序字符
       answer: "雨在窗外停了",                       // 正确答案
       thresholds: [
         { min: 1.0, tag, label, text, add?, memory?, next },   // 完全正确
         { min: 0.5, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.3.0 雨滴节奏 runRain
     node.rain = {
       prompt: "听雨滴节奏——按节奏点击窗台",
       drops: 8,                  // 雨滴数
       interval: 1200,           // 雨滴间隔（ms）
       tolerance: 0.25,          // 容差（占一拍比例）
       thresholds: [
         { min: 0.7, tag, label, text, add?, memory?, next },
         { min: 0.4, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.4.0 拓印 runRubbing
     node.rubbing = {
       prompt: "用铅笔拓印——",
       pattern: "leaf",   // 纹理类型（leaf/stone/wood/fabric）
       min: 0.7,          // 最小覆盖率
       thresholds: [
         { min: 0.8, tag, label, text, add?, memory?, next },
         { min: 0.5, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.4.0 集字 runCollect
     node.collect = {
       prompt: "在飘落的字符中收集目标字——",
       target: "雨",      // 目标字
       total: 5,          // 目标字总数
       duration: 15000,   // 持续时间 ms
       thresholds: [
         { min: 0.8, tag, label, text, add?, memory?, next },
         { min: 0.4, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.4.0 光影对焦 runFocus
     node.focus = {
       prompt: "调整焦距——让画面变清晰",
       target: 0.5,      // 目标焦距 0~1
       tolerance: 0.1,
       thresholds: [
         { min: 0.85, tag, label, text, add?, memory?, next },
         { min: 0.5, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.4.0 气味记忆 runScentmem
     node.scentmem = {
       prompt: "辨认之前闻过的气味——",
       samples: [
         { id, name, desc, isTarget: true },   // 之前闻过的
         { id, name, desc, isTarget: false }
       ],
       thresholds: [
         { min: 0.85, tag, label, text, add?, memory?, next },
         { min: 0.5, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.5.0 茶渍占卜 runTealeaf
     node.tealeaf = {
       prompt: "拖动茶杯——让茶渍在杯底流转",
       shapes: [
         { id: "heart", name: "心形", areas: [0,1,5], label, text, add?, personality?, memory?, next },
         ...
       ],
       min: 0.4,    // 最少茶渍覆盖率才能确认
       thresholds: [
         { min: 0.7, tag, label, text, add?, personality?, memory?, next },
         { min: 0.4, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.5.0 影子对齐 runShadow
     node.shadow = {
       prompt: "拖动物体——让影子与目标轮廓重合",
       lightAngle: 45,   // 光源角度（度）
       target: [{x,y}, ...],  // 目标影子轮廓（归一化 0-1 坐标）
       min: 0.6,
       thresholds: [...],
       fallback: {...}
     }
     ============================================================ */

  /* ============================================================
     v1.5.0 烛火守护 runCandle
     node.candle = {
       prompt: "旋转挡风板——守护烛火不被风吹灭",
       winds: 6,       // 风的阵数
       duration: 2500, // 每阵风持续毫秒
       gap: 800,       // 风之间间隔
       thresholds: [
         { min: 0.7, tag, label, text, add?, personality?, memory?, next },
         { min: 0.4, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.5.0 电话拨号 runDial
     node.dial = {
       prompt: "拨出你记得的号码",
       target: "1206437",   // 目标号码
       preview: 4000,       // 预览毫秒（0=一直显示）
       thresholds: [...],
       fallback: {...}
     }
     ============================================================ */

  /* ============================================================
     v1.6.0 雾窗描绘 runFoggy
     node.foggy = {
       prompt: "在起雾的玻璃上拖动手指——描绘那个形状",
       shape: "star",   // 目标形状 star/heart/moon/tree（用作 hint 与评分参考）
       hintPath: [{x,y}, ...],  // 归一化 0-1 的目标路径
       min: 0.4,
       thresholds: [...],
       fallback: {...}
     }
     ============================================================ */

  /* ============================================================
     v1.6.0 糖块拼图 runSugar
     node.sugar = {
       prompt: "把糖块拖到对应位置——拼出图案",
       pieces: [
         { id: "a", shape: [[1,1],[1,0]], color: "#ff8a8a", x: 0.1, y: 0.1, target: {gx:0, gy:0} },
         ...
       ],
       grid: { cols: 4, rows: 3, cell: 60 },
       min: 0.6,
       thresholds: [...],
       fallback: {...}
     }
     ============================================================ */

  /* ============================================================
     v1.6.0 钟调共振 runChime
     node.chime = {
       prompt: "调整钟摆角度——让它的音与目标共振",
       target: 35,       // 目标角度（度）
       tolerance: 5,     // 容差
       thresholds: [...],
       fallback: {...}
     }
     ============================================================ */

  /* ============================================================
     v1.6.0 沙漏计时 runHourglass
     node.hourglass = {
       prompt: "在沙漏完前翻转——让它在指定时刻落完",
       target: 5000,   // 目标毫秒（沙应在此刻恰好落完）
       duration: 8000, // 沙的总时长
       tolerance: 600,
       thresholds: [
         { max: 400, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.7.0 风筝引线 runKite
     node.kite = {
       prompt: "牵引风筝穿过云阵，到达指定高度——",
       target: 80,        // 目标高度（百分比 0-100）
       duration: 12000,   // 总时长
       obstacles: 6,      // 障碍数量（云/鸟）
       thresholds: [
         { max: 5, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.7.0 密码锁 runLock
     node.lock = {
       prompt: "根据线索拨出四位密码——",
       target: "3-7-2-9",       // 目标密码（用-分隔）
       preview: 4000,          // 预览毫秒（可选，0 表示不预览）
       hints: ["三月", "七月", "二日", "九时"],
       thresholds: [
         { correct: 4, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.7.0 折纸造型 runOrigami
     node.origami = {
       prompt: "按步骤折叠纸张——",
       steps: [ { id, label, desc } ],
       targets: [
         { steps: ["a","b","c","d"], tag, label, text, add?, personality?, memory?, next }
       ],
       min: 3,
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.7.0 星轨追踪 runOrbit
     node.orbit = {
       prompt: "追踪星轨——点击移动光标，跟随星点轨迹",
       duration: 10000,
       tolerance: 30,    // 像素容差
       samples: 6,       // 采样点数量
       thresholds: [
         { max: 50, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.8.0 萤火引路 runFirefly
     node.firefly = {
       prompt: "拖动光点引导萤火虫归队——",
       total: 8,            // 萤火虫总数
       duration: 15000,
       tolerance: 40,       // 拖动到萤火虫附近的吸引半径
       thresholds: [
         { max: 2, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.8.0 风铃调音 runWindchime
     node.windchime = {
       prompt: "拖动风铃片到对应高度——和目标音阶对齐",
       target: [0.2, 0.35, 0.5, 0.65],   // 目标高度比例（按顺序对应 4 个铃）
       tolerance: 0.05,
       thresholds: [
         { max: 0.1, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.8.0 瓶中信 runBottle
     node.bottle = {
       prompt: "调整力度把瓶子投到对岸——",
       target: 0.7,         // 目标距离比例（0-1）
       tolerance: 0.08,
       power: 1.0,          // 力度上限
       thresholds: [
         { max: 0.1, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.8.0 回声定位 runEcholoc
     node.echoloc = {
       prompt: "听回声估算距离——按「发出」按钮，再点你估计的位置",
       actual: 0.6,        // 实际距离比例（0-1）
       duration: 8000,     // 等待玩家估算的时间
       tolerance: 0.08,
       thresholds: [
         { max: 0.1, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.9.0 罗盘导航 runCompass
     node.compass = {
       prompt: "拖动罗盘——让指针对准她说的方向",
       target: 135,        // 目标角度（0-360，0=北）
       tolerance: 8,       // 容差（度）
       thresholds: [
         { max: 8, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.9.0 密码电报 runTelegraph
     node.telegraph = {
       prompt: "听完电报——选出对应的字母",
       code: "SOS",        // 目标字符
       options: ["SOS","OK","HI","NO"],  // 选项
       rhythm: [100,300,100,300,100,500], // 摩斯节奏：嘀(短)/嗒(长)/间隔(ms)
       tolerance: 1,        // 容错数（错选容差）
       thresholds: [
         { max: 0, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.9.0 天平称重 runBalance
     node.balance = {
       prompt: "把物品放到天平两端——让它平衡",
       items: [3, 5, 7, 2, 4],  // 可放置物品的重量
       target: "balance",       // "balance"=平衡 或 数字=目标左-右差值
       tolerance: 0.5,
       thresholds: [
         { max: 0.5, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.0.0 节拍器同步 runMetronome
     node.metronome = {
       prompt: "跟着节拍点击——节拍器每响一下，点一次「同步」",
       bpm: 80,             // 节拍速度
       total: 12,            // 总节拍数
       tolerance: 0.12,     // 误差容忍（占周期比例）
       thresholds: [
         { min, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.0.0 星图连线 runStarchart
     node.starchart = {
       prompt: "按亮度顺序连接星星——画出她想要的星图",
       stars: [ { id, x, y, brightness, label? } ],
       expectedOrder: ["s1","s2","s3"],
       tolerance: 1,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.0.0 透镜聚焦 runLens
     node.lens = {
       prompt: "调节透镜焦距——让光线汇聚到目标点",
       target: 0.6,
       tolerance: 0.05,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.0.0 弦音调音 runTuning
     node.tuning = {
       prompt: "调节琴弦张力——让它接近目标音高",
       strings: [ { id, target, label } ],
       tolerance: 0.05,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.1.0 日蚀对位 runEclipse
     node.eclipse = {
       prompt: "拖动月亮，让它的影子遮住那颗星",
       target: 0.65,        // 目标位置（0-1）
       tolerance: 0.05,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.1.0 印章对齐 runStamp
     node.stamp = {
       prompt: "旋转印章，让图案对齐目标角度",
       target: 135,          // 目标角度（0-359）
       tolerance: 5,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.1.0 星盘仪 runAstrolabe
     node.astrolabe = {
       prompt: "调整三层星盘，对齐目标刻度",
       targets: [45, 120, 210],  // 三层目标角度
       tolerance: 6,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.1.0 沙画凝形 runSandpaint
     node.sandpaint = {
       prompt: "在沙盘上点选格子，还原星图",
       pattern: 5x5 (0/1),     // 目标图案
       tolerance: 4,            // 允许偏差数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.2.0 万花筒 runKaleido
     node.kaleido = {
       prompt: "旋转万花筒，让图案对齐目标角度",
       target: 90,
       tolerance: 5,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.2.0 算盘珠 runAbacus
     node.abacus = {
       prompt: "拨算珠，让每档数量等于目标",
       targets: [3, 5, 2],     // 每档目标数量
       maxPerRod: 7,            // 每档最大珠数
       tolerance: 0,            // 单档允许偏差
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.2.0 齿轮咬合 runGear
     node.gear = {
       prompt: "旋转三个齿轮，让标记齿对齐顶部",
       teeth: [12, 10, 8],     // 每齿轮齿数
       tolerance: 6,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.2.0 等高线 runTopo
     node.topo = {
       prompt: "在地图上点选海拔相同的点",
       points: [ { x, y, h } ],  // 所有点（含海拔）
       targetH: 0.6,              // 目标海拔
       tolerance: 0.05,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.3.0 日晷对时 runSundial
     node.sundial = {
       prompt: "旋转日晷指针，对齐目标时间刻度",
       target: 135,            // 目标角度
       tolerance: 8,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.3.0 染缸调色 runDye
     node.dye = {
       prompt: "调节三色染缸，调出目标颜色",
       target: { r: 200, g: 100, b: 80 },
       tolerance: 30,            // 单通道容差
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.3.0 风车叶片 runWindmill
     node.windmill = {
       prompt: "旋转每个叶片，让风车正对风向",
       blades: 4,               // 叶片数
       target: 90,              // 目标角度（风向）
       tolerance: 8,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.3.0 经纬编织 runWeave
     node.weave = {
       prompt: "交替点选经纬线，编织目标图案",
       pattern: [ [0,1,0,1], [1,0,1,0], [0,1,0,1], [1,0,1,0] ], // 目标图案，1=经，0=纬
       tolerance: 2,            // 允许错误格数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.4.0 镜面对称 runMirror
     node.mirror = {
       prompt: "点选格子让左半镜像右半",
       pattern: [ [1,0,0,1], [0,1,1,0], [1,0,0,1], [0,1,1,0] ],  // 目标对称图案
       tolerance: 1,            // 允许错误格数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.4.0 灯笼排列 runLantern
     node.lantern = {
       prompt: "按顺序点亮灯笼，还原目标序列",
       target: [2, 0, 3, 1],     // 目标索引序列
       count: 4,                  // 灯笼总数
       tolerance: 0,              // 允许错位数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.4.0 水波纹 runRipple
     node.ripple = {
       prompt: "点击水面，让波纹覆盖所有目标点",
       targets: [ {x:0.3,y:0.4}, {x:0.7,y:0.5}, {x:0.5,y:0.7} ],   // 目标位置
       tolerance: 0.08,
       duration: 8000,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.4.0 马赛克拼图 runMosaic
     node.mosaic = {
       prompt: "点选小方块，拼出目标图案",
       pattern: [ [0,1,1,0], [1,1,1,1], [1,1,1,1], [0,1,1,0] ],  // 1=填，0=空
       tolerance: 2,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.5.0 碑帖拼合 runStele
     node.stele = {
       prompt: "拖动碎片到正确位置，拼合碑文",
       target: [2, 0, 3, 1],   // 目标位置序列（碎片 i 应放到 target[i] 位置）
       tolerance: 0,           // 允许错位数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.5.0 星轨推演 runCelestial
     node.celestial = {
       prompt: "滑动行星到目标角度",
       planets: [ { target: 90, color: "#ff8060" }, { target: 270, color: "#80a0ff" } ],  // 目标角度 0-360
       tolerance: 8,     // 允许误差度
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.5.0 节拍鼓点 runDrum
     node.drum = {
       prompt: "按节拍敲击鼓面，复现目标节奏",
       sequence: [800, 400, 800, 400, 400],   // 每次敲击间隔（毫秒）
       tolerance: 150,    // 允许时间误差毫秒
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.5.0 风向标 runVane
     node.vane = {
       prompt: "旋转风向标对齐目标方位",
       target: 135,       // 目标角度 0-360
       tolerance: 8,     // 允许误差度
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.6.0 漏刻计时 runClepsydra
     node.clepsydra = {
       prompt: "在目标时刻停止水流",
       target: 5000,      // 目标毫秒
       tolerance: 200,     // 允许误差毫秒
       duration: 10000,   // 漏完总时长
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.6.0 拼图归位 runJigsaw
     node.jigsaw = {
       prompt: "点击碎片归位，拼出完整图案",
       target: [1, 2, 0, 3],   // 目标位置序列（碎片 i 应放到 target[i] 位置）
       tolerance: 0,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.6.0 棋局推演 runChess
     node.chess = {
       prompt: "移动棋子到目标位置",
       size: 4,
       start: { x: 0, y: 0 },
       target: { x: 3, y: 3 },
       obstacles: [ { x: 1, y: 1 } ],
       maxMoves: 8,
       tolerance: 2,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v2.6.0 旗阵辨识 runFlag
     node.flag = {
       prompt: "按描述选择正确的旗帜",
       description: "红底白圆居中",
       options: [ { id: 0, label: "红底白圆居中" }, ... ],
       target: 0,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============================================================
     v1.9.0 钟摆节奏 runPendulum
     node.pendulum = {
       prompt: "钟摆摆到目标位置时——点「停」",
       target: 0.85,       // 目标位置（0-1，0=左极点，0.5=中，1=右极点）
       tolerance: 0.06,
       duration: 12000,    // 总时长
       thresholds: [
         { max: 0.06, tag, label, text, add?, personality?, memory?, next },
         ...
       ],
       fallback: { tag, next }
     }
     ============================================================ */

  /* ============ 性格画像浮层（在关于页展示） ============ */
  function renderPersonalityCard() {
    const prof = Saves.getPersonalityProfile();
    const p = prof.dims;
    const dimName = { brave: "敢/慎", kind: "温/冷", active: "行/思", honest: "真/藏" };
    let bars = "";
    for (const dim in p) {
      const v = p[dim];
      const pct = Math.min(50, Math.abs(v) * 10);
      const left = v >= 0 ? 50 : 50 - pct;
      bars += `<div class="p-bar">
        <span style="width:48px;">${dimName[dim] || dim}</span>
        <div class="p-bar-track"><div class="p-bar-fill" style="left:${left}%;width:${pct}%;"></div></div>
        <span style="width:30px;text-align:right;">${v > 0 ? "+" : ""}${v}</span>
      </div>`;
    }
    return `<div class="personality-card">
      <div style="font-size:14px;color:#ffd88a;letter-spacing:4px;">✦ 性格画像</div>
      <div class="personality-tags">${prof.tags.map(t => `<span class="p-tag">${t}</span>`).join("")}</div>
      ${bars}
    </div>`;
  }

  /* ============ 返回标题 ============ */
  function backToTitle() {
    state.sessionId += 1;
    window.GameLifecycle?.cancelAll();
    if (window.Minigames?.cancelAll) window.Minigames.cancelAll();
    clearTimeout(state.autoTimer);
    clearTimeout(state.typeTimer);
    state.autoMode = false;
    state.skipMode = false;
    state.isTyping = false;
    state.typingText = "";
    state.typeOnDone = null;
    state.currentNode = null;
    state.pendingInteraction = false;
    state.inGame = false;
    stopBgm();
    if (perspectiveBtn) { perspectiveBtn.remove(); perspectiveBtn = null; }
    const pLayer = document.getElementById("perspective-layer");
    if (pLayer) pLayer.remove();
    // 清理 v0.5.0 浮层
    const dreamLayer = document.querySelector(".dream-layer");
    if (dreamLayer) dreamLayer.remove();
    const doodleLayer = document.querySelector(".doodle-layer");
    if (doodleLayer) doodleLayer.remove();
    const inboxReply = document.getElementById("inbox-reply-layer");
    if (inboxReply) inboxReply.remove();
    // 清理 v0.6.0 浮层
    const collageLayer = document.querySelector(".collage-layer");
    if (collageLayer) collageLayer.remove();
    const echoLayer = document.getElementById("echo-layer");
    if (echoLayer) echoLayer.remove();
    const photoLayer = document.querySelector(".photo-layer");
    if (photoLayer) photoLayer.remove();
    const rhythmLayer = document.querySelector(".rhythm-layer");
    if (rhythmLayer) rhythmLayer.remove();
    // 清理 v0.7.0 浮层（用 querySelectorAll 防止重复残留）
    document.querySelectorAll(".scent-layer").forEach(e => e.remove());
    document.querySelectorAll(".scent-recall-layer").forEach(e => e.remove());
    document.querySelectorAll(".silence-layer").forEach(e => e.remove());
    document.querySelectorAll(".touch-layer").forEach(e => e.remove());
    document.querySelectorAll(".temperature-layer").forEach(e => e.remove());
    // 清理 v0.8.0 浮层
    document.querySelectorAll(".tarot-layer").forEach(e => e.remove());
    document.querySelectorAll(".dreamweave-layer").forEach(e => e.remove());
    document.querySelectorAll(".handwriting-layer").forEach(e => e.remove());
    document.querySelectorAll(".spectrum-layer").forEach(e => e.remove());
    // 清理 v0.9.0 浮层
    document.querySelectorAll(".constellation-layer").forEach(e => e.remove());
    document.querySelectorAll(".stethoscope-layer").forEach(e => e.remove());
    document.querySelectorAll(".puzzle-layer").forEach(e => e.remove());
    document.querySelectorAll(".perfume-layer").forEach(e => e.remove());
    // 清理 v1.0.0 浮层
    document.querySelectorAll(".breath-layer").forEach(e => e.remove());
    document.querySelectorAll(".timecapsule-layer").forEach(e => e.remove());
    document.querySelectorAll(".timecapsule-deliver-layer").forEach(e => e.remove());
    document.querySelectorAll(".fold-layer").forEach(e => e.remove());
    document.querySelectorAll(".reflection-layer").forEach(e => e.remove());
    // 清理 v1.1.0 浮层
    document.querySelectorAll(".lightdraw-layer").forEach(e => e.remove());
    document.querySelectorAll(".mimic-layer").forEach(e => e.remove());
    document.querySelectorAll(".season-layer").forEach(e => e.remove());
    document.querySelectorAll(".pulse-layer").forEach(e => e.remove());
    document.querySelectorAll(".tea-layer").forEach(e => e.remove());
    document.querySelectorAll(".astronomy-layer").forEach(e => e.remove());
    document.querySelectorAll(".palette-layer").forEach(e => e.remove());
    document.querySelectorAll(".piano-layer").forEach(e => e.remove());
    document.querySelectorAll(".dice-layer").forEach(e => e.remove());
    document.querySelectorAll(".wind-layer").forEach(e => e.remove());
    document.querySelectorAll(".decode-layer").forEach(e => e.remove());
    document.querySelectorAll(".rain-layer").forEach(e => e.remove());
    document.querySelectorAll(".rubbing-layer").forEach(e => e.remove());
    document.querySelectorAll(".collect-layer").forEach(e => e.remove());
    document.querySelectorAll(".focus-layer").forEach(e => e.remove());
    document.querySelectorAll(".scentmem-layer").forEach(e => e.remove());
    document.querySelectorAll(".tealeaf-layer").forEach(e => e.remove());
    document.querySelectorAll(".shadow-layer").forEach(e => e.remove());
    document.querySelectorAll(".candle-layer").forEach(e => e.remove());
    document.querySelectorAll(".dial-layer").forEach(e => e.remove());
    document.querySelectorAll(".foggy-layer").forEach(e => e.remove());
    document.querySelectorAll(".sugar-layer").forEach(e => e.remove());
    document.querySelectorAll(".chime-layer").forEach(e => e.remove());
    document.querySelectorAll(".hourglass-layer").forEach(e => e.remove());
    document.querySelectorAll(".kite-layer").forEach(e => e.remove());
    document.querySelectorAll(".lock-layer").forEach(e => e.remove());
    document.querySelectorAll(".origami-layer").forEach(e => e.remove());
    document.querySelectorAll(".orbit-layer").forEach(e => e.remove());
    document.querySelectorAll(".firefly-layer").forEach(e => e.remove());
    document.querySelectorAll(".windchime-layer").forEach(e => e.remove());
    document.querySelectorAll(".bottle-layer").forEach(e => e.remove());
    document.querySelectorAll(".echoloc-layer").forEach(e => e.remove());
    document.querySelectorAll(".compass-layer").forEach(e => e.remove());
    document.querySelectorAll(".telegraph-layer").forEach(e => e.remove());
    document.querySelectorAll(".balance-layer").forEach(e => e.remove());
    document.querySelectorAll(".pendulum-layer").forEach(e => e.remove());
    document.querySelectorAll(".metronome-layer").forEach(e => e.remove());
    document.querySelectorAll(".starchart-layer").forEach(e => e.remove());
    document.querySelectorAll(".lens-layer").forEach(e => e.remove());
    document.querySelectorAll(".tuning-layer").forEach(e => e.remove());
    document.querySelectorAll(".eclipse-layer").forEach(e => e.remove());
    document.querySelectorAll(".stamp-layer").forEach(e => e.remove());
    document.querySelectorAll(".astrolabe-layer").forEach(e => e.remove());
    document.querySelectorAll(".sandpaint-layer").forEach(e => e.remove());
    document.querySelectorAll(".kaleido-layer").forEach(e => e.remove());
    document.querySelectorAll(".abacus-layer").forEach(e => e.remove());
    document.querySelectorAll(".gear-layer").forEach(e => e.remove());
    document.querySelectorAll(".topo-layer").forEach(e => e.remove());
    document.querySelectorAll(".sundial-layer").forEach(e => e.remove());
    document.querySelectorAll(".dye-layer").forEach(e => e.remove());
    document.querySelectorAll(".windmill-layer").forEach(e => e.remove());
    document.querySelectorAll(".weave-layer").forEach(e => e.remove());
    document.querySelectorAll(".mirror-layer").forEach(e => e.remove());
    document.querySelectorAll(".lantern-layer").forEach(e => e.remove());
    document.querySelectorAll(".ripple-layer").forEach(e => e.remove());
    document.querySelectorAll(".mosaic-layer").forEach(e => e.remove());
    document.querySelectorAll(".stele-layer").forEach(e => e.remove());
    document.querySelectorAll(".celestial-layer").forEach(e => e.remove());
    document.querySelectorAll(".drum-layer").forEach(e => e.remove());
    document.querySelectorAll(".vane-layer").forEach(e => e.remove());
    document.querySelectorAll(".clepsydra-layer").forEach(e => e.remove());
    document.querySelectorAll(".jigsaw-layer").forEach(e => e.remove());
    document.querySelectorAll(".chess-layer").forEach(e => e.remove());
    document.querySelectorAll(".flag-layer").forEach(e => e.remove());
    document.querySelectorAll(".postcard-layer").forEach(e => e.remove());
    document.querySelectorAll(".timeline-layer").forEach(e => e.remove());
    document.querySelectorAll(".triage-layer").forEach(e => e.remove());
    document.querySelectorAll(".wall-layer").forEach(e => e.remove());
    document.querySelectorAll(".proofread-layer").forEach(e => e.remove());
    // 恢复温度叠加
    if (el.bgOverlay) el.bgOverlay.style.background = "transparent";
    if (el.clueLayer) el.clueLayer.innerHTML = "";
    el.titleScreen.classList.remove("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    el.topBar.classList.remove("show");
    el.charLayer.innerHTML = "";
    if (el.dayBar) { el.dayBar.style.opacity = "0"; delete el.dayBar.dataset.loop; }
    if (el.heartBar) el.heartBar.style.opacity = "0";
    setScene("cherry_full");
    updateTrueEndAccess();
    updateAfterwordAccess();
    updateLoopBadge();
    updateInboxBadge();
  }

  function updateTrueEndAccess() {
    const trueBtn = el.titleScreen.querySelector("button[data-action='trueend']");
    if (!trueBtn) return;
    if (hasAllGoodEndings()) {
      trueBtn.classList.remove("hidden");
      trueBtn.style.display = "";
      trueBtn.classList.add("special");
    } else {
      trueBtn.classList.add("hidden");
      trueBtn.style.display = "none";
    }
  }

  function updateAfterwordAccess() {
    const afterwordButton = el.titleScreen.querySelector("button[data-action='afterword']");
    if (!afterwordButton) return;
    const unlocked = isTrueEndUnlocked();
    afterwordButton.classList.toggle("hidden", !unlocked);
    afterwordButton.style.display = unlocked ? "" : "none";
    if (unlocked) afterwordButton.classList.add("special");
  }

  /* ============ 粒子系统 ============ */
  const particleCanvas = el.particles;
  const pctx = particleCanvas.getContext("2d");
  let particles = [];
  let particleAnim = null;
  let particleType = "none";

  function resizeCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function getParticleType(scene) {
    if (!Saves.settings.particles) return "none";
    if (scene === "rain") return "rain";
    if (["winter", "ending_bad", "ending_normal"].includes(scene)) return "snow";
    if (["cherry_full", "school_gate", "classroom", "library", "hallway", "art_room", "home_room", "cafeteria", "festival"].includes(scene)) return "sakura";
    return "none";
  }

  function updateParticles(scene) {
    const newType = getParticleType(scene);
    if (newType === particleType) return;
    particleType = newType;
    particles = [];
    if (particleType === "none") { stopParticles(); return; }
    const count = particleType === "rain" ? 100 : 60;
    for (let i = 0; i < count; i++) particles.push(createParticle());
    if (!particleAnim) animateParticles();
  }

  function stopParticles() {
    if (particleAnim) { cancelAnimationFrame(particleAnim); particleAnim = null; }
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  }

  function createParticle() {
    const w = particleCanvas.width, h = particleCanvas.height;
    if (particleType === "sakura") {
      return { x: Math.random()*w, y: Math.random()*h, size: 4+Math.random()*6, speed: 0.4+Math.random()*1.2, sway: Math.random()*2-1, swayPhase: Math.random()*Math.PI*2, rot: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.04, alpha: 0.5+Math.random()*0.4, hue: 340+Math.random()*20 };
    } else if (particleType === "rain") {
      return { x: Math.random()*w, y: Math.random()*h, len: 12+Math.random()*14, speed: 8+Math.random()*6, alpha: 0.3+Math.random()*0.4 };
    } else if (particleType === "snow") {
      return { x: Math.random()*w, y: Math.random()*h, size: 2+Math.random()*3, speed: 0.6+Math.random()*1.2, sway: Math.random()*2-1, swayPhase: Math.random()*Math.PI*2, alpha: 0.5+Math.random()*0.5 };
    }
  }

  function animateParticles() {
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const w = particleCanvas.width, h = particleCanvas.height;
    particles.forEach((p) => {
      if (particleType === "sakura") {
        p.swayPhase += 0.02; p.x += Math.sin(p.swayPhase)*p.sway*0.8; p.y += p.speed; p.rot += p.rotSpeed;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random()*w; }
        pctx.save(); pctx.translate(p.x, p.y); pctx.rotate(p.rot); pctx.globalAlpha = p.alpha;
        pctx.fillStyle = `hsl(${p.hue}, 80%, 85%)`;
        pctx.beginPath(); pctx.ellipse(0, 0, p.size, p.size*0.55, 0, 0, Math.PI*2); pctx.fill(); pctx.restore();
      } else if (particleType === "rain") {
        p.y += p.speed; p.x -= p.speed*0.2;
        if (p.y > h) { p.y = -20; p.x = Math.random()*w; }
        pctx.strokeStyle = `rgba(180,200,220,${p.alpha})`; pctx.lineWidth = 1;
        pctx.beginPath(); pctx.moveTo(p.x, p.y); pctx.lineTo(p.x - p.speed*0.2, p.y - p.len); pctx.stroke();
      } else if (particleType === "snow") {
        p.swayPhase += 0.02; p.x += Math.sin(p.swayPhase)*p.sway*0.6; p.y += p.speed;
        if (p.y > h) { p.y = -10; p.x = Math.random()*w; }
        pctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        pctx.beginPath(); pctx.arc(p.x, p.y, p.size, 0, Math.PI*2); pctx.fill();
      }
    });
    if (particleType !== "none") particleAnim = requestAnimationFrame(animateParticles);
  }

  /* ============ BGM（Web Audio 程序生成） ============ */
  let audioCtx = null;
  let bgmGain = null;
  let currentBgm = null;
  let bgmTimer = null;

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = audioCtx.createGain();
        bgmGain.gain.value = Saves.settings.bgmVolume;
        bgmGain.connect(audioCtx.destination);
      } catch (e) { console.warn("AudioContext 不可用", e); }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function playBgmForScene(scene) {
    if (!Saves.settings.bgm) { stopBgm(); return; }
    let mood = "default";
    if (["ending_good", "cherry_full", "festival"].includes(scene)) mood = "bright";
    else if (["ending_bad", "rain", "winter"].includes(scene)) mood = "sad";
    else if (["art_room", "library", "home_room", "night"].includes(scene)) mood = "calm";
    else if (["field", "sportsmeet", "summer"].includes(scene)) mood = "active";
    if (currentBgm === mood) return;
    currentBgm = mood;
    playMelody(mood);
  }

  function playMelody(mood) {
    if (!audioCtx) return;
    stopBgm();
    // 简单旋律：根据 mood 选不同的音阶
    const scales = {
      default: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], // C大调
      bright:  [392.00, 440.00, 493.88, 523.25, 587.33, 659.25],         // G大调上行
      sad:     [220.00, 246.94, 261.63, 293.66, 329.63, 349.23],         // A小调
      calm:    [196.00, 220.00, 261.63, 293.66, 329.63],                  // G五声
      active:  [329.63, 392.00, 440.00, 493.88, 523.25, 587.33],         // 跳跃
    };
    const scale = scales[mood] || scales.default;
    const tempo = { default: 600, bright: 400, sad: 800, calm: 900, active: 300 }[mood] || 600;

    let step = 0;
    function playNote() {
      if (!audioCtx || currentBgm !== mood) return;
      const freq = scale[Math.floor(Math.random() * scale.length)];
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, audioCtx.currentTime);
      env.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      env.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + tempo/1000);
      osc.connect(env);
      env.connect(bgmGain);
      osc.start();
      osc.stop(audioCtx.currentTime + tempo/1000 + 0.1);
      step++;
      bgmTimer = setTimeout(playNote, tempo);
    }
    playNote();
  }

  function stopBgm() {
    if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
    currentBgm = null;
  }

  /* ============ 事件绑定 ============ */
  el.dialogBox.addEventListener("click", () => {
    if (state.isTyping) skipTyping();
    else if (state.inGame) advance();
  });

  el.topBar.querySelectorAll("button[data-menu]").forEach((btn) => {
    btn.onclick = () => {
      const m = btn.dataset.menu;
      if (m === "title") {
        if (confirm("返回标题画面？未保存的进度会丢失。")) backToTitle();
      } else {
        openOverlay(m);
      }
    };
  });

  document.getElementById("btn-auto").onclick = function () {
    state.autoMode = !state.autoMode;
    this.classList.toggle("active", state.autoMode);
    flashHint(state.autoMode ? "自动模式 开" : "自动模式 关");
    if (state.autoMode) {
      ensureAudio();
      const node = SCRIPT[state.currentNode];
      if (node && !state.isTyping) onTextComplete(node);
    } else clearTimeout(state.autoTimer);
  };

  document.getElementById("btn-skip").onclick = function () {
    state.skipMode = !state.skipMode;
    this.classList.toggle("active", state.skipMode);
    flashHint(state.skipMode ? "快进 开" : "快进 关");
  };

  document.querySelector(".overlay-close").onclick = closeOverlay;
  el.overlay.addEventListener("click", (e) => { if (e.target === el.overlay) closeOverlay(); });

  // 标题画面按钮
  el.titleScreen.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = () => {
      ensureAudio();
      const a = btn.dataset.action;
      if (a === "new") newGame();
      else if (a === "continue") {
        const quick = Saves.getQuickSave();
        if (quick) restoreSnapshot(quick);
        else flashHint("没有可继续的存档");
      } else if (a === "load") openOverlay("load");
      else if (a === "gallery") openOverlay("gallery");
      else if (a === "keywords") openOverlay("keywords");
      else if (a === "cg") openOverlay("cg");
      else if (a === "flowchart") openOverlay("flowchart");
      else if (a === "trueend") {
        if (!hasAllGoodEndings()) {
          flashHint("先完成三位女主的 GOOD 结局");
          return;
        }
        state.inGame = true;
        el.titleScreen.classList.add("hidden");
        el.dialogBox.classList.remove("hidden");
        el.topBar.classList.add("show");
        if (el.dayBar) el.dayBar.style.opacity = "1";
        if (el.heartBar) el.heartBar.style.opacity = "1";
        gotoNode("true_end_entry");
      }
      else if (a === "afterword") startAfterword();
      else if (a === "about") openOverlay("about");
    };
  });

  // 结局画面按钮
  el.endingScreen.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = () => {
      const a = btn.dataset.action;
      if (a === "title") backToTitle();
      else if (a === "gallery") openOverlay("gallery");
    };
  });

  function isEditableTarget(target) {
    return target instanceof Element && !!target.closest(
      "input, textarea, select, button, [contenteditable='true'], [role='textbox']"
    );
  }

  function hasActiveInteractionLayer() {
    if (!el.choices.classList.contains("hidden")) return true;
    if (document.querySelector(".mg-overlay")) return true;
    const baseLayers = new Set([el.bgLayer, el.charLayer, el.clueLayer]);
    return Array.from(document.querySelectorAll("#game > [class]")).some((candidate) => {
      return !baseLayers.has(candidate)
        && Array.from(candidate.classList).some((name) => name.endsWith("-layer"));
    });
  }

  // 快捷键
  document.addEventListener("keydown", (e) => {
    if (el.overlay.classList.contains("hidden") === false) {
      if (e.key === "Escape") closeOverlay();
      return;
    }
    if (!state.inGame || e.repeat || isEditableTarget(e.target)) return;
    if (e.key === "Escape") {
      backToTitle();
      return;
    }
    if (hasActiveInteractionLayer()) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (state.isTyping) skipTyping();
      else advance();
    } else if (e.key === "s" || e.key === "S") quickSave();
    else if (e.key === "a" || e.key === "A") document.getElementById("btn-auto").click();
  });

  /* ============ 启动 ============ */
  // v2.7.9 起：向玩法框架基座注入宿主能力（剧情跳转 / 数值加成 / 心条刷新 / 顶部提示 / 转义）
  window.GameKit?.attachHost({ gotoNode, applyAdd, updateHeartBar, flashHint, escapeHtml });

  function init() {
    setScene("cherry_full");
    updateParticles("cherry_full");
    updateTrueEndAccess();
    updateAfterwordAccess();
    updateInboxBadge();
  }
  init();

  // 暴露调试接口
  window.__game = { state, gotoNode, newGame, backToTitle, openOverlay };
})();
