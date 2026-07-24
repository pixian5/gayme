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
    autoMode: false,
    autoTimer: null,
    skipMode: false,
    inGame: false,
    playCount: Saves.getFlag("playCount", 0),
    visitedNodes: Saves.getFlag("visitedNodes", {}),
    loopCount: Saves.getFlag("loopCount", 0), // 剧情内循环次数（每次非真结局+1）
    perspectiveActive: false, // 视角切换：当前是否在对方视角
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
        // 信件节点：跳过打字后也要触发信件
        if (node.letter) {
          setTimeout(() => showLetter(node.letter, state.currentNode), 200);
        }
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
    if (node.keyword) {
      if (Saves.unlockKeyword(node.keyword)) flashHint(`新关键词：${node.keyword}`);
    }
    // 解锁 CG
    if (node.cg_unlock) {
      if (Saves.unlockCG(node.cg_unlock)) flashHint(`新 CG：${CGS.find(c => c.id === node.cg_unlock)?.title || ""}`);
    }
    // 解锁记忆片段（循环系统）
    if (node.memory && !Saves.isMemoryUnlocked(node.memory.id)) {
      Saves.saveMemory(node.memory.id, node.memory.text);
      flashHint(`✦ 记忆片段：${node.memory.title || node.memory.id}`);
    }

    // v0.5.0 新玩法：环境线索（渲染热点，但不阻断流程）
    renderClues(node);
    // 收件箱：触发角色主动来信
    if (node.inbox) {
      const list = Array.isArray(node.inbox) ? node.inbox : [node.inbox];
      list.forEach((m) => {
        if (Saves.saveInbox(m)) {
          flashHint(`📩 新消息：${m.from || "未知"}`);
        }
      });
      updateInboxBadge();
    }
    // 朋友圈：发布动态
    if (node.moment) {
      const list = Array.isArray(node.moment) ? node.moment : [node.moment];
      list.forEach((mid) => {
        if (Saves.addMoment(mid)) flashHint(`🌸 新动态：${mid}`);
      });
    }
    // 性格画像：累积玩家倾向
    if (node.personality) {
      for (const dim in node.personality) {
        Saves.addPersonality(dim, node.personality[dim]);
      }
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
      typewriter(displayNode.text || "", () => {
        setTimeout(() => showLetter(node.letter, nodeId), 400);
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

    // v0.5.0 涂鸦节点
    if (node.doodle) {
      setScene(node.bg);
      renderCharacters(node);
      runDoodle(node.doodle, nodeId);
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

    // 视角切换支持：节点定义了 perspective 时显示切换按钮
    renderPerspectiveButton(node);

    if (speakerName && displayNode.text) pushHistory(speakerName, displayNode.text, nodeId);
    else if (displayNode.text) pushHistory("旁白", displayNode.text, nodeId);

    updateDayBar(node);
    updateHeartBar();
    updateLoopBadge();

    typewriter(displayNode.text || "", () => onTextComplete(node));
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
    // 循环系统：真结局打破循环，其他结局触发循环重置
    if (ending.id === "true_end") {
      Saves.setFlag("playCount", state.playCount + 1);
      state.playCount += 1;
      // 真结局重置 loopCount
      Saves.setFlag("loopCount", 0);
      state.loopCount = 0;
      flashHint("★ 循环打破 ★");
    } else {
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
      flowchart: "流程图", inbox: "收件箱", moments: "朋友圈",
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
    else if (type === "inbox") renderInbox();
    else if (type === "moments") renderMoments();
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
      if (confirm("确定清空所有存档、图鉴、CG、关键词、合成、记忆和设置吗？此操作不可撤销。")) {
        Saves.clearAll();
        state.playCount = 0;
        state.visitedNodes = {};
        state.loopCount = 0;
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
        <p style="color:#e8e0d0;">v0.5.0 · Demo</p>
        <p style="color:rgba(255,255,255,0.6);margin-top:20px;">在樱花开落的季节，写下属于你的回信。</p>
        <p style="color:rgba(255,255,255,0.4);margin-top:30px;font-size:13px;">视觉小说 / 校园青春<br>3 位女主 · 10 个结局（含真结局）<br>3 个迷你游戏 · CG 图鉴 · 关键词收集<br>★ 时间循环 · 关键词合成 · 真实书写信件 · 视角切换<br>★ 环境线索探索 · 收件箱 · 朋友圈动态 · 梦境碎片 · 涂鸦系统 · 性格画像<br>多周目彩蛋 · 流程图 · BGM<br>建议在桌面浏览器全屏体验</p>
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

  /* ============ 涂鸦 ============ */
  function runDoodle(doodle, currentNodeId) {
    const layer = document.createElement("div");
    layer.className = "doodle-layer";
    const prompt = document.createElement("div");
    prompt.className = "doodle-prompt";
    prompt.textContent = doodle.prompt || "在画布上自由涂鸦";
    layer.appendChild(prompt);

    const wrap = document.createElement("div");
    wrap.className = "doodle-canvas-wrap";
    const canvas = document.createElement("canvas");
    canvas.id = "doodle-canvas";
    canvas.width = 560; canvas.height = 320;
    wrap.appendChild(canvas);
    layer.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff8ee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colors = [
      { name: "黑", hex: "#2a2030" },
      { name: "粉", hex: "#d87090" },
      { name: "紫", hex: "#7a68a8" },
      { name: "蓝", hex: "#5a8ec0" },
      { name: "黄", hex: "#e0a858" },
      { name: "绿", hex: "#7ab87a" },
    ];
    let curColor = colors[0].hex;
    const tools = document.createElement("div");
    tools.className = "doodle-tools";
    colors.forEach((c, i) => {
      const b = document.createElement("div");
      b.className = "doodle-color" + (i === 0 ? " active" : "");
      b.style.background = c.hex;
      b.title = c.name;
      b.onclick = () => {
        curColor = c.hex;
        tools.querySelectorAll(".doodle-color").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      };
      tools.appendChild(b);
    });
    layer.appendChild(tools);

    // 涂鸦数据
    let drawing = false;
    let last = null;
    let strokes = [];
    let curStroke = null;
    let totalDist = 0;
    let totalTime = 0;
    let pointCount = 0;

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * canvas.width / r.width;
      const y = (e.clientY - r.top) * canvas.height / r.height;
      return { x, y, t: Date.now() };
    }
    canvas.addEventListener("mousedown", (e) => {
      drawing = true;
      last = getPos(e);
      curStroke = { color: curColor, points: [last] };
    });
    canvas.addEventListener("mousemove", (e) => {
      if (!drawing) return;
      const p = getPos(e);
      const dx = p.x - last.x, dy = p.y - last.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const dt = Math.max(1, p.t - last.t);
      totalDist += d;
      totalTime += dt;
      pointCount++;
      ctx.strokeStyle = curColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      curStroke.points.push(p);
      last = p;
    });
    function endStroke() {
      if (!drawing) return;
      drawing = false;
      if (curStroke && curStroke.points.length > 1) strokes.push(curStroke);
      curStroke = null;
    }
    canvas.addEventListener("mouseup", endStroke);
    canvas.addEventListener("mouseleave", endStroke);

    const submit = document.createElement("button");
    submit.className = "doodle-submit";
    submit.textContent = "✦ 完成";
    submit.onclick = () => {
      // 简单情绪识别：基于速度、密度、颜色分布
      let mood = "平静";
      let stats = { strokes: strokes.length, dist: totalDist, points: pointCount };
      if (pointCount < 5) {
        mood = "克制";
      } else {
        const avgSpeed = totalDist / Math.max(1, totalTime); // px/ms
        const density = pointCount / Math.max(1, strokes.length);
        // 紧张度：高速 + 高密度
        // 激动：大量色彩 + 大幅快速
        // 平静：低速 + 平滑
        const colorVariance = new Set(strokes.map(s => s.color)).size;
        if (avgSpeed > 0.5 && density > 8) mood = "紧张";
        else if (colorVariance >= 4 || totalDist > 1500) mood = "激动";
        else if (avgSpeed < 0.2) mood = "平静";
        else mood = "用力";
        stats.avgSpeed = parseFloat(avgSpeed.toFixed(3));
        stats.density = parseFloat(density.toFixed(2));
        stats.colorVariance = colorVariance;
      }
      Saves.saveDoodle(currentNodeId, mood, stats);
      // 影响：根据 doodle.moodBonus 中匹配 mood
      if (doodle.moodBonus) {
        const bonus = doodle.moodBonus[mood];
        if (bonus) {
          applyAdd(bonus);
          updateHeartBar();
        }
      }
      if (doodle.moodJump) {
        const jump = doodle.moodJump[mood];
        if (jump) {
          layer.remove();
          gotoNode(jump);
          return;
        }
      }
      flashHint(`✦ 你画出了 ${mood}`);
      layer.remove();
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
    };
    layer.appendChild(submit);

    document.getElementById("game").appendChild(layer);
  }

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
    clearTimeout(state.autoTimer);
    clearTimeout(state.typeTimer);
    state.autoMode = false;
    state.skipMode = false;
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
    updateLoopBadge();
    updateInboxBadge();
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
    updateInboxBadge();
  }
  init();

  // 暴露调试接口
  window.__game = { state, gotoNode, newGame, backToTitle, openOverlay };
})();
