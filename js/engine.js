/* ========================================
   樱时信笺 · 游戏引擎 (engine.js) v2
   新增：日程UI / 心条 / 关键词 / 信件 / CG图鉴
        / 流程图 / 回忆 / BGM / 多周目 / 迷你游戏
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
    quickAccess: document.getElementById("quick-access"),
  };

  /* ---------- 游戏状态 ---------- */
  const state = {
    currentNode: null,
    currentBg: null,
    variables: { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } },
    history: [],
    isTyping: false,
    typeTimer: null,
    autoMode: false,
    autoTimer: null,
    skipMode: false,
    inGame: false,
    playCount: Saves.getFlag("playCount", 0),
    visitedNodes: Saves.getFlag("visitedNodes", {}),
  };

  const MAX_HISTORY = 200;
  const AFFECTION_MAX = 10;

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

  /* ============ 场景/背景 ============ */
  function setScene(bg) {
    if (!bg || bg === state.currentBg) return;
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
    el.clickHint.style.opacity = "0";
    el.dialogText.innerHTML = "";
    let i = 0;
    const speed = state.skipMode ? 5 : Math.max(5, Saves.settings.textSpeed);
    function tick() {
      if (i >= text.length) {
        state.isTyping = false;
        el.dialogText.innerHTML = text;
        el.clickHint.style.opacity = "1";
        onDone && onDone();
        return;
      }
      el.dialogText.textContent = text.slice(0, i + 1);
      i++;
      state.typeTimer = setTimeout(tick, speed);
    }
    tick();
  }
  function skipTyping() {
    if (state.isTyping) {
      clearTimeout(state.typeTimer);
      state.isTyping = false;
      const node = SCRIPT[state.currentNode];
      if (node) {
        el.dialogText.innerHTML = node.text || "";
        el.clickHint.style.opacity = "1";
        onTextComplete(node);
      }
    }
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
      const timeLabel = { morning: "上午", noon: "中午", evening: "晚上" }[node.time] || "";
      el.dayBar.textContent = `${dayLabel} · ${timeLabel}`;
      el.dayBar.style.opacity = "1";
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
    const node = SCRIPT[state.currentNode];
    if (!node) return;
    if (node.next) gotoNode(node.next);
  }

  function onTextComplete(node) {
    if (node.ending) {
      setTimeout(() => showEnding(node.ending), 1000);
      return;
    }
    if (state.autoMode) {
      clearTimeout(state.autoTimer);
      state.autoTimer = setTimeout(() => {
        if (node.next) gotoNode(node.next);
      }, Saves.settings.autoDelay);
    }
  }

  function gotoNode(nodeId) {
    const node = SCRIPT[nodeId];
    if (!node) { console.error("节点不存在:", nodeId); return; }
    clearTimeout(state.autoTimer);
    state.currentNode = nodeId;

    // 标记访问（流程图用）
    state.visitedNodes[nodeId] = (state.visitedNodes[nodeId] || 0) + 1;

    applyAdd(node.add);
    applySet(node.set);

    // 解锁关键词
    if (node.keyword) Saves.unlockKeyword(node.keyword);
    // 解锁 CG
    if (node.cg_unlock) {
      if (Saves.unlockCG(node.cg_unlock)) flashHint(`新 CG：${CGS.find(c => c.id === node.cg_unlock)?.title || ""}`);
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
      if (matched) gotoNode(cond.then);
      else if (node.else) gotoNode(node.else);
      return;
    }

    // 信件节点
    if (node.letter) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const speakerName = node.speaker ? (CHARACTERS[node.speaker]?.name || node.speaker) : "";
      el.speaker.textContent = speakerName;
      el.dialogBox.classList.remove("hidden");
      typewriter(node.text || "", () => {
        setTimeout(() => showLetter(node.letter), 400);
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

    // 普通节点/结局节点
    setScene(node.bg);
    renderCharacters(node);

    const speakerName = node.speaker ? (CHARACTERS[node.speaker]?.name || node.speaker) : "";
    el.speaker.textContent = speakerName;
    el.speaker.style.background = speakerName
      ? `linear-gradient(135deg, ${CHARACTERS[node.speaker]?.color || "#d87090"}, ${CHARACTERS[node.speaker]?.accent || "#b8608a"})`
      : "rgba(40,40,60,0.7)";
    el.dialogBox.classList.remove("hidden");

    if (speakerName && node.text) pushHistory(speakerName, node.text, nodeId);
    else if (node.text) pushHistory("旁白", node.text, nodeId);

    updateDayBar(node);
    updateHeartBar();

    typewriter(node.text || "", () => onTextComplete(node));
  }

  /* ============ 选项 ============ */
  function showChoices(choice, currentNodeId) {
    el.choices.innerHTML = "";
    el.choices.classList.remove("hidden");

    const prompt = document.createElement("div");
    prompt.style.cssText = "position:absolute;top:18%;left:50%;transform:translateX(-50%);font-size:20px;letter-spacing:3px;color:#ffd8e4;text-shadow:0 2px 8px rgba(0,0,0,0.8);";
    prompt.textContent = choice.prompt || "请选择";
    el.choices.appendChild(prompt);

    choice.options.forEach((opt) => {
      // 多周目：解锁隐藏选项
      if (opt.requires && !opt.requires()) return;
      const btn = document.createElement("button");
      btn.className = "choice-btn";
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
  function showLetter(letter) {
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

    letter.options.forEach((opt) => {
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
    // 多周目计数
    if (ending.id === "true_end") {
      Saves.setFlag("playCount", state.playCount + 1);
      state.playCount += 1;
    }
    el.endingType.textContent = ending.type;
    el.endingType.style.color = ending.type.includes("TRUE") ? "#ffd88a" : (ending.type.includes("BAD") ? "#a8a8a8" : "#ffb8c8");
    el.endingTitle.textContent = ending.title;
    el.endingText.textContent = ending.text;
    el.endingScreen.classList.remove("hidden");
    el.topBar.classList.remove("show");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    if (el.dayBar) el.dayBar.style.opacity = "0";
    if (el.heartBar) el.heartBar.style.opacity = "0";
  }

  /* ============ 新游戏 ============ */
  function newGame() {
    state.variables = { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
    state.history = [];
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

  /* ============ 存档快照 ============ */
  function snapshot() {
    const node = SCRIPT[state.currentNode];
    const speakerName = node?.speaker ? (CHARACTERS[node.speaker]?.name || node.speaker) : "";
    return {
      nodeId: state.currentNode,
      variables: JSON.parse(JSON.stringify(state.variables)),
      sceneLabel: SCENE_LABELS[state.currentBg] || "",
      dialogPreview: (speakerName ? `【${speakerName}】` : "（旁白）") + (node?.text || "").slice(0, 30),
      day: node?.day,
      time: node?.time,
    };
  }

  function quickSave() {
    if (!state.inGame) return;
    Saves.quickSave(snapshot());
    flashHint("已快存");
  }

  function saveToSlot(slot) {
    if (!state.inGame) { flashHint("当前无法存档"); return; }
    Saves.save(slot, snapshot());
    renderSaveSlots("save");
    flashHint(`已保存到槽位 ${slot + 1}`);
  }

  function loadFromSlot(slot) {
    const data = Saves.load(slot);
    if (!data) { flashHint("该槽位为空"); return; }
    state.currentNode = data.nodeId;
    state.variables = data.variables || { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
    state.history = state.history || [];
    state.inGame = true;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "1";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    closeOverlay();
    gotoNode(data.nodeId);
  }

  /* ============ 顶部提示 ============ */
  let hintTimer = null;
  function flashHint(text) {
    let hint = document.getElementById("flash-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "flash-hint";
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
      flowchart: "流程图",
    };
    el.overlayTitle.textContent = titles[type] || type;
    el.overlay.classList.remove("hidden");
    if (type === "save" || type === "load") renderSaveSlots(type);
    else if (type === "config") renderConfig();
    else if (type === "history") renderHistory();
    else if (type === "gallery") renderGallery();
    else if (type === "about") renderAbout();
    else if (type === "keywords") renderKeywords();
    else if (type === "cg") renderCGGallery();
    else if (type === "flowchart") renderFlowchart();
  }
  function closeOverlay() { el.overlay.classList.add("hidden"); overlayMode = null; }

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
        else if (act === "del") { Saves.deleteSave(slot); renderSaveSlots(mode); flashHint("已删除"); }
      };
    });
  }

  function renderConfig() {
    const s = Saves.settings;
    el.overlayBody.innerHTML = `
      <div class="config-row">
        <label>文字速度（越小越快）</label>
        <input type="range" id="cfg-textspeed" min="5" max="80" value="${s.textSpeed}">
        <span id="cfg-textspeed-val" style="color:#ffb8c8;width:50px;">${s.textSpeed}ms</span>
      </div>
      <div class="config-row">
        <label>自动模式延迟</label>
        <input type="range" id="cfg-autodelay" min="500" max="4000" step="100" value="${s.autoDelay}">
        <span id="cfg-autodelay-val" style="color:#ffb8c8;width:70px;">${s.autoDelay}ms</span>
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
    document.getElementById("cfg-clear").onclick = () => {
      if (confirm("确定清空所有存档、图鉴、CG、关键词和设置吗？此操作不可撤销。")) {
        Saves.clearAll();
        state.playCount = 0;
        state.visitedNodes = {};
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
        <p style="color:#e8e0d0;">v0.3.0 · Demo</p>
        <p style="color:rgba(255,255,255,0.6);margin-top:20px;">在樱花开落的季节，写下属于你的回信。</p>
        <p style="color:rgba(255,255,255,0.4);margin-top:30px;font-size:13px;">视觉小说 / 校园青春<br>3 位女主 · 10 个结局（含真结局）<br>3 个迷你游戏 · CG 图鉴 · 关键词收集<br>多周目彩蛋 · 流程图 · BGM<br>建议在桌面浏览器全屏体验</p>
        ${state.playCount >= 1 ? `<p style="color:#ffd88a;margin-top:20px;">已通关 ${state.playCount} 周目。彩蛋已开启 ♪</p>` : ""}
      </div>
    `;
  }

  /* ============ 关键词面板 ============ */
  function renderKeywords() {
    const unlocked = Saves.getKeywords();
    el.overlayBody.innerHTML = `<div class="gallery-grid">` + Object.entries(KEYWORDS).map(([kw, desc]) => {
      const isUnlocked = unlocked.includes(kw);
      return `<div class="gallery-card ${isUnlocked ? "unlocked" : "locked"}">
        <div class="g-type">关键词</div>
        <div class="g-title">${isUnlocked ? kw : "？？？？"}</div>
        <div class="g-desc">${isUnlocked ? desc : "尚未发现"}</div>
      </div>`;
    }).join("") + "</div>";
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

  /* ============ 返回标题 ============ */
  function backToTitle() {
    clearTimeout(state.autoTimer);
    clearTimeout(state.typeTimer);
    state.autoMode = false;
    state.skipMode = false;
    state.inGame = false;
    stopBgm();
    el.titleScreen.classList.remove("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    el.topBar.classList.remove("show");
    el.charLayer.innerHTML = "";
    if (el.dayBar) el.dayBar.style.opacity = "0";
    if (el.heartBar) el.heartBar.style.opacity = "0";
    setScene("cherry_full");
    // 真结局入口检查
    updateTrueEndAccess();
  }

  function updateTrueEndAccess() {
    const trueBtn = el.titleScreen.querySelector("button[data-action='trueend']");
    if (!trueBtn) return;
    if (isTrueEndUnlocked()) {
      trueBtn.style.display = "block";
      trueBtn.classList.add("special");
    } else {
      trueBtn.style.display = "none";
    }
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
        if (quick) {
          state.currentNode = quick.nodeId;
          state.variables = quick.variables || { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
          state.history = [];
          state.inGame = true;
          el.titleScreen.classList.add("hidden");
          el.dialogBox.classList.remove("hidden");
          el.topBar.classList.add("show");
          if (el.dayBar) el.dayBar.style.opacity = "1";
          if (el.heartBar) el.heartBar.style.opacity = "1";
          gotoNode(quick.nodeId);
        } else flashHint("没有可继续的存档");
      } else if (a === "load") openOverlay("load");
      else if (a === "gallery") openOverlay("gallery");
      else if (a === "keywords") openOverlay("keywords");
      else if (a === "cg") openOverlay("cg");
      else if (a === "flowchart") openOverlay("flowchart");
      else if (a === "trueend") {
        state.inGame = true;
        el.titleScreen.classList.add("hidden");
        el.dialogBox.classList.remove("hidden");
        el.topBar.classList.add("show");
        if (el.dayBar) el.dayBar.style.opacity = "1";
        if (el.heartBar) el.heartBar.style.opacity = "1";
        gotoNode("true_end_entry");
      }
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

  // 快捷键
  document.addEventListener("keydown", (e) => {
    if (el.overlay.classList.contains("hidden") === false) {
      if (e.key === "Escape") closeOverlay();
      return;
    }
    if (!state.inGame) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (state.isTyping) skipTyping();
      else advance();
    } else if (e.key === "s" || e.key === "S") quickSave();
    else if (e.key === "a" || e.key === "A") document.getElementById("btn-auto").click();
    else if (e.key === "Escape") backToTitle();
  });

  /* ============ 启动 ============ */
  function init() {
    setScene("cherry_full");
    updateParticles("cherry_full");
    updateTrueEndAccess();
  }
  init();

  // 暴露调试接口
  window.__game = { state, gotoNode, newGame, backToTitle, openOverlay };
})();
