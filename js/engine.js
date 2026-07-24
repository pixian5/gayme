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
    // v0.6.0 回声：保存玩家说过的重要台词
    if (node.echoSave) {
      const list = Array.isArray(node.echoSave) ? node.echoSave : [node.echoSave];
      list.forEach(e => {
        if (Saves.saveEcho(e.id, e.text, e.ctx)) {
          // 静默保存，不打扰流程
        }
      });
    }

    // v1.0.0 时光胶囊：在节点进入时投递过去的胶囊
    deliverTimecapsules(nodeId);

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

    // v0.6.0 拼贴诗节点
    if (node.collage) {
      setScene(node.bg);
      renderCharacters(node);
      runCollage(node.collage, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.6.0 摄影构图节点
    if (node.photo) {
      setScene(node.bg);
      renderCharacters(node);
      runPhoto(node.photo, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.6.0 节奏敲击节点
    if (node.rhythm) {
      setScene(node.bg);
      renderCharacters(node);
      runRhythm(node.rhythm, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.7.0 气味收集节点
    if (node.scent) {
      setScene(node.bg);
      renderCharacters(node);
      runScent(node.scent, nodeId);
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

    // v0.7.0 沉默选择节点
    if (node.silenceChoice) {
      setScene(node.bg);
      renderCharacters(node);
      runSilenceChoice(node.silenceChoice, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.7.0 触觉关怀节点
    if (node.touch) {
      setScene(node.bg);
      renderCharacters(node);
      runTouch(node.touch, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.7.0 温度感知节点
    if (node.temperature) {
      setScene(node.bg);
      renderCharacters(node);
      runTemperature(node.temperature, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.8.0 占卜抽牌节点
    if (node.tarot) {
      setScene(node.bg);
      renderCharacters(node);
      runTarot(node.tarot, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.8.0 梦境编织节点
    if (node.dreamweave) {
      setScene(node.bg);
      renderCharacters(node);
      runDreamweave(node.dreamweave, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.8.0 笔迹选择节点
    if (node.handwriting) {
      setScene(node.bg);
      renderCharacters(node);
      runHandwriting(node.handwriting, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.8.0 情绪光谱节点
    if (node.spectrum) {
      setScene(node.bg);
      renderCharacters(node);
      runSpectrum(node.spectrum, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.9.0 星座连线节点
    if (node.constellation) {
      setScene(node.bg);
      renderCharacters(node);
      runConstellation(node.constellation, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.9.0 心声听诊节点
    if (node.stethoscope) {
      setScene(node.bg);
      renderCharacters(node);
      runStethoscope(node.stethoscope, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.9.0 信物拼图节点
    if (node.puzzle) {
      setScene(node.bg);
      renderCharacters(node);
      runPuzzle(node.puzzle, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.9.0 气味调香节点
    if (node.perfume) {
      setScene(node.bg);
      renderCharacters(node);
      runPerfume(node.perfume, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.0.0 呼吸引导节点
    if (node.breath) {
      setScene(node.bg);
      renderCharacters(node);
      runBreath(node.breath, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.0.0 时光胶囊节点
    if (node.timecapsule) {
      setScene(node.bg);
      renderCharacters(node);
      runTimecapsule(node.timecapsule, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.0.0 信纸折痕节点
    if (node.fold) {
      setScene(node.bg);
      renderCharacters(node);
      runFold(node.fold, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.0.0 倒影对齐节点
    if (node.reflection) {
      setScene(node.bg);
      renderCharacters(node);
      runReflection(node.reflection, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.1.0 光影描绘节点
    if (node.lightdraw) {
      setScene(node.bg);
      renderCharacters(node);
      runLightdraw(node.lightdraw, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.1.0 声音模仿节点
    if (node.mimic) {
      setScene(node.bg);
      renderCharacters(node);
      runMimic(node.mimic, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.1.0 季节切换节点
    if (node.season) {
      setScene(node.bg);
      renderCharacters(node);
      runSeason(node.season, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.1.0 脉搏同步节点
    if (node.pulse) {
      setScene(node.bg);
      renderCharacters(node);
      runPulse(node.pulse, nodeId);
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

    // v0.6.0 回声触发：节点定义 echo 时，在文本完成后弹出回声
    if (node.echo) {
      typewriter(displayNode.text || "", () => {
        onTextComplete(node);
        setTimeout(() => triggerEcho(node.echo, nodeId), 600);
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
     ============================================================ */
  function runCollage(collage, currentNodeId) {
    const layer = document.createElement("div");
    layer.className = "collage-layer";

    const prompt = document.createElement("div");
    prompt.className = "collage-prompt";
    prompt.textContent = collage.prompt || "拖动词语到画布上，拼成一句诗";
    layer.appendChild(prompt);

    const canvas = document.createElement("div");
    canvas.className = "collage-canvas";
    const canvasHint = document.createElement("div");
    canvasHint.className = "collage-hint";
    canvasHint.textContent = "— 把词语拖到这里 —";
    canvas.appendChild(canvasHint);
    layer.appendChild(canvas);

    const pool = document.createElement("div");
    pool.className = "collage-pool";
    layer.appendChild(pool);

    // 词库：自定义 or 已解锁关键词+合成词
    let words = collage.words;
    if (!words) {
      const unlocked = Saves.getKeywords();
      const composed = Saves.getComposed();
      words = unlocked.concat(composed);
    }
    if (!Array.isArray(words)) words = [];
    // 加点装饰词
    const decoWords = ["花瓣", "回声", "指尖", "夜晚", "空", "熄灭", "重新"];
    words = words.concat(decoWords.filter(w => !words.includes(w)));

    const placed = [];
    function makeWordChip(word) {
      const chip = document.createElement("div");
      chip.className = "collage-chip";
      chip.textContent = word;
      chip.draggable = true;
      chip.dataset.word = word;
      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", word);
        chip.classList.add("dragging");
      });
      chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
      // 点击也能放置（移动端友好）
      chip.addEventListener("click", () => placeWord(chip));
      return chip;
    }
    words.forEach(w => pool.appendChild(makeWordChip(w)));

    function placeWord(chip) {
      if (chip.parentElement === canvas) return;
      canvasHint.style.display = "none";
      const placedChip = chip.cloneNode(true);
      placedChip.classList.add("placed");
      placedChip.addEventListener("click", () => {
        placedChip.remove();
        const i = placed.indexOf(placedChip.dataset.word);
        if (i >= 0) placed.splice(i, 1);
        if (!canvas.querySelector(".collage-chip.placed")) canvasHint.style.display = "";
      });
      canvas.appendChild(placedChip);
      placed.push(placedChip.dataset.word);
    }

    canvas.addEventListener("dragover", (e) => { e.preventDefault(); canvas.classList.add("drag-over"); });
    canvas.addEventListener("dragleave", () => canvas.classList.remove("drag-over"));
    canvas.addEventListener("drop", (e) => {
      e.preventDefault();
      canvas.classList.remove("drag-over");
      const word = e.dataTransfer.getData("text/plain");
      const chip = pool.querySelector(`.collage-chip[data-word="${word}"]`);
      if (chip) placeWord(chip);
    });

    const controls = document.createElement("div");
    controls.className = "collage-controls";
    const clear = document.createElement("button");
    clear.textContent = "✕ 清空";
    clear.onclick = () => {
      canvas.querySelectorAll(".collage-chip.placed").forEach(c => c.remove());
      placed.length = 0;
      canvasHint.style.display = "";
    };
    const submit = document.createElement("button");
    submit.className = "collage-submit";
    submit.textContent = "✦ 完成";
    submit.onclick = () => {
      if (placed.length === 0) { flashHint("画布是空的"); return; }
      const poem = placed.join(" · ");
      // 评分：意象密度 = 词数 × 唯一词比例
      const unique = new Set(placed).size;
      const density = placed.length * (unique / Math.max(1, placed.length));
      let tag = "normal";
      const thresholds = collage.tag || { good: 5, bad: 2 };
      if (density >= thresholds.good) tag = "good";
      else if (density <= thresholds.bad) tag = "bad";
      Saves.saveCollage(currentNodeId, placed.slice(), poem, parseFloat(density.toFixed(2)), tag);
      if (collage.scoreBonus && collage.scoreBonus[tag]) {
        applyAdd(collage.scoreBonus[tag]);
        updateHeartBar();
      }
      flashHint(`✦ 你拼出的诗：${poem}（${tag === "good" ? "意象丰沛" : tag === "bad" ? "克制简素" : "恰到好处"}）`);
      if (collage.scoreJump && collage.scoreJump[tag]) {
        layer.remove();
        gotoNode(collage.scoreJump[tag]);
        return;
      }
      layer.remove();
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
    };
    controls.appendChild(clear);
    controls.appendChild(submit);
    layer.appendChild(controls);

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runPhoto(photo, currentNodeId) {
    const layer = document.createElement("div");
    layer.className = "photo-layer";

    const prompt = document.createElement("div");
    prompt.className = "photo-prompt";
    prompt.textContent = photo.prompt || "拖动取景框，按下快门";
    layer.appendChild(prompt);

    const scene = document.createElement("div");
    scene.className = "photo-scene";
    // 用当前背景作为取景画面
    const bgClass = state.currentBg ? `bg-scene scene-${state.currentBg}` : "bg-scene scene-cherry_full";
    scene.className += " " + bgClass;

    // 取景目标（高价值区）
    const targets = photo.targets || [];
    targets.forEach(t => {
      const tg = document.createElement("div");
      tg.className = "photo-target";
      tg.style.left = t.x + "%";
      tg.style.top = t.y + "%";
      tg.style.width = (t.w || 10) + "%";
      tg.style.height = (t.h || 10) + "%";
      tg.dataset.label = t.label || "目标";
      scene.appendChild(tg);
    });

    // 取景框
    const frame = document.createElement("div");
    frame.className = "photo-frame";
    frame.style.left = "35%";
    frame.style.top = "35%";
    frame.style.width = "30%";
    frame.style.height = "30%";
    // 三分线
    const grid = document.createElement("div");
    grid.className = "photo-grid";
    frame.appendChild(grid);
    scene.appendChild(frame);

    let dragging = false, startX = 0, startY = 0, startLeft = 35, startTop = 35;
    frame.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startLeft = parseFloat(frame.style.left);
      startTop = parseFloat(frame.style.top);
      e.preventDefault();
    });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    function onMove(e) {
      if (!dragging) return;
      const r = scene.getBoundingClientRect();
      const dx = (e.clientX - startX) / r.width * 100;
      const dy = (e.clientY - startY) / r.height * 100;
      let nl = Math.max(0, Math.min(70, startLeft + dx));
      let nt = Math.max(0, Math.min(70, startTop + dy));
      frame.style.left = nl + "%";
      frame.style.top = nt + "%";
    }
    function onUp() { dragging = false; }

    layer.appendChild(scene);

    const controls = document.createElement("div");
    controls.className = "photo-controls";
    const submit = document.createElement("button");
    submit.className = "photo-submit";
    submit.textContent = "📸 按下快门";
    submit.onclick = () => {
      const fl = parseFloat(frame.style.left);
      const ft = parseFloat(frame.style.top);
      const fw = parseFloat(frame.style.width);
      const fh = parseFloat(frame.style.height);
      const fcx = fl + fw / 2;
      const fcy = ft + fh / 2;
      // 评分：取景框中心是否靠近目标中心
      let score = 0;
      let hitTarget = null;
      targets.forEach(t => {
        const tcx = t.x + (t.w || 10) / 2;
        const tcy = t.y + (t.h || 10) / 2;
        const d = Math.sqrt((fcx - tcx) ** 2 + (fcy - tcy) ** 2);
        if (d < 15) {
          score = Math.max(score, 100 - d * 5);
          hitTarget = t;
        }
      });
      // 三分法加分：取景框中心靠近三分之一线
      const thirds = [33.3, 66.7];
      const distToThird = Math.min(
        Math.abs(fcx - thirds[0]), Math.abs(fcx - thirds[1]),
        Math.abs(fcy - thirds[0]), Math.abs(fcy - thirds[1])
      );
      score += Math.max(0, 20 - distToThird * 1.5);
      score = Math.min(100, Math.round(score));

      let tag = "low";
      if (score >= 70) tag = "high";
      else if (score >= 40) tag = "mid";

      const composition = hitTarget ? hitTarget.label : "自由构图";
      Saves.savePhoto(currentNodeId, composition, score, tag);

      if (photo.scoreBonus && photo.scoreBonus[tag]) {
        applyAdd(photo.scoreBonus[tag]);
        updateHeartBar();
      }
      flashHint(`📸 构图：${composition}（${score} 分）`);
      if (photo.scoreJump && photo.scoreJump[tag]) {
        layer.remove();
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        gotoNode(photo.scoreJump[tag]);
        return;
      }
      layer.remove();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
    };
    controls.appendChild(submit);
    layer.appendChild(controls);

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runRhythm(rhythm, currentNodeId) {
    const layer = document.createElement("div");
    layer.className = "rhythm-layer";

    const prompt = document.createElement("div");
    prompt.className = "rhythm-prompt";
    prompt.textContent = rhythm.prompt || "按下节拍，让心跳同步";
    layer.appendChild(prompt);

    const track = document.createElement("div");
    track.className = "rhythm-track";
    layer.appendChild(track);

    const beats = rhythm.beats || 16;
    const bpm = rhythm.bpm || 80;
    const interval = 60000 / bpm; // ms per beat
    const pattern = rhythm.pattern || Array.from({length: beats}, (_, i) => i % 2);
    const beatEls = [];
    for (let i = 0; i < beats; i++) {
      const b = document.createElement("div");
      b.className = "rhythm-beat" + (pattern[i] ? " strong" : "");
      b.dataset.idx = i;
      track.appendChild(b);
      beatEls.push(b);
    }

    const hitArea = document.createElement("div");
    hitArea.className = "rhythm-hit";
    hitArea.textContent = "点击此处 / 按 空格";
    layer.appendChild(hitArea);

    const stats = document.createElement("div");
    stats.className = "rhythm-stats";
    stats.textContent = "准备…";
    layer.appendChild(stats);

    let idx = 0;
    let hits = [];
    let timer = null;
    let started = false;

    function nextBeat() {
      if (idx >= beats) {
        finish();
        return;
      }
      beatEls.forEach(b => b.classList.remove("current"));
      const cur = beatEls[idx];
      cur.classList.add("current");
      cur.dataset.t0 = Date.now();
      idx++;
      timer = setTimeout(nextBeat, interval);
    }

    function hit() {
      if (!started || idx === 0 || idx > beats) return;
      const curIdx = idx - 1;
      const cur = beatEls[curIdx];
      if (!cur) return;
      const t0 = parseInt(cur.dataset.t0 || 0);
      const dt = Date.now() - t0;
      // 偏差越小越准
      const offset = Math.abs(dt - interval / 2);
      let grade = "miss";
      if (offset < interval * 0.15) grade = "perfect";
      else if (offset < interval * 0.3) grade = "good";
      else if (offset < interval * 0.5) grade = "ok";
      cur.classList.add("hit-" + grade);
      hits.push({ idx: curIdx, dt, grade });
      stats.textContent = `命中：${hits.filter(h => h.grade !== "miss").length} / ${idx}（最近：${grade}）`;
    }

    function finish() {
      const total = beats;
      const hitCount = hits.filter(h => h.grade !== "miss").length;
      const perfectCount = hits.filter(h => h.grade === "perfect").length;
      const accuracy = Math.round(hitCount / total * 100);
      let tag = "low";
      if (accuracy >= 80 && perfectCount >= beats * 0.3) tag = "high";
      else if (accuracy >= 50) tag = "mid";
      Saves.saveRhythm(currentNodeId, hits.slice(), accuracy, tag);
      if (rhythm.scoreBonus && rhythm.scoreBonus[tag]) {
        applyAdd(rhythm.scoreBonus[tag]);
        updateHeartBar();
      }
      stats.textContent = `完成！命中率 ${accuracy}% · ${perfectCount} 次完美`;
      flashHint(`♪ 命中率 ${accuracy}%（${tag === "high" ? "心跳同步" : tag === "mid" ? "勉强跟上" : "完全乱了"}）`);
      if (rhythm.scoreJump && rhythm.scoreJump[tag]) {
        layer.remove();
        gotoNode(rhythm.scoreJump[tag]);
        return;
      }
      setTimeout(() => {
        layer.remove();
        const node = SCRIPT[currentNodeId];
        if (node && node.next) gotoNode(node.next);
      }, 1200);
    }

    function start() {
      if (started) return;
      started = true;
      stats.textContent = "开始！";
      nextBeat();
    }

    hitArea.addEventListener("click", () => {
      if (!started) { start(); return; }
      hit();
    });
    document.addEventListener("keydown", rhythmKeyHandler);
    function rhythmKeyHandler(e) {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!started) { start(); return; }
      hit();
    }

    // 退出时清理
    const observer = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        clearTimeout(timer);
        document.removeEventListener("keydown", rhythmKeyHandler);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });

    const startBtn = document.createElement("button");
    startBtn.className = "rhythm-start";
    startBtn.textContent = "▶ 开始";
    startBtn.onclick = start;
    layer.appendChild(startBtn);

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runScent(scent, currentNodeId) {
    el.dialogBox.classList.add("hidden");

    const layer = document.createElement("div");
    layer.className = "scent-layer";
    layer.innerHTML = `
      <div class="scent-prompt">${scent.prompt || "细闻——"}</div>
      <div class="scent-grid"></div>
      <div class="scent-status"></div>
      <div class="scent-actions">
        <button class="scent-confirm" disabled>继续</button>
      </div>
    `;
    const grid = layer.querySelector(".scent-grid");
    const statusEl = layer.querySelector(".scent-status");
    const confirmBtn = layer.querySelector(".scent-confirm");

    const collected = [];
    const items = scent.items || [];
    let remaining = items.length;

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "scent-card";
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="scent-icon">${item.icon || "🌸"}</div>
        <div class="scent-name">${item.name}</div>
      `;
      card.onclick = () => {
        if (card.classList.contains("collected")) return;
        card.classList.add("collected");
        // 弹出气味描述卡片
        const desc = document.createElement("div");
        desc.className = "scent-desc-popup";
        desc.innerHTML = `
          <div class="scent-desc-name">${item.icon || "🌸"} ${item.name}</div>
          <div class="scent-desc-text">${item.desc || ""}</div>
          <button class="scent-desc-close">收下</button>
        `;
        desc.querySelector(".scent-desc-close").onclick = () => {
          desc.remove();
          const isNew = Saves.collectScent({
            id: item.id, name: item.name, desc: item.desc, scene: item.scene || state.currentBg
          });
          if (isNew) flashHint(`🌿 收集气味：${item.name}`);
          collected.push(item.id);
          statusEl.textContent = `已细闻 ${collected.length} / ${items.length}`;
          if (collected.length >= Math.min(scent.min || 1, items.length)) {
            confirmBtn.disabled = false;
          }
        };
        layer.appendChild(desc);
      };
      grid.appendChild(card);
    });

    if (!items.length) {
      // 没有物品，直接放行
      confirmBtn.disabled = false;
    } else {
      statusEl.textContent = `已细闻 0 / ${items.length}`;
    }

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      layer.remove();
      const node = SCRIPT[currentNodeId];
      const jumpTo = scent.next || (node && node.next);
      if (jumpTo) gotoNode(jumpTo);
    };

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runSilenceChoice(silence, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "silence-layer";
    layer.id = "silence-layer";

    const duration = Math.max(2, silence.duration || 8);
    let timeLeft = duration;
    let settled = false;

    layer.innerHTML = `
      <div class="silence-prompt">${silence.prompt || ""}</div>
      <div class="silence-timer">
        <svg viewBox="0 0 60 60" class="silence-ring">
          <circle cx="30" cy="30" r="26" class="silence-ring-bg"/>
          <circle cx="30" cy="30" r="26" class="silence-ring-fg" id="silence-ring-fg"/>
        </svg>
        <span class="silence-time" id="silence-time">${timeLeft}</span>
      </div>
      <div class="silence-hint">不选也是一种选择 · 倒计时归零即沉默</div>
      <div class="silence-options"></div>
    `;
    const optionsEl = layer.querySelector(".silence-options");
    const ringFg = layer.querySelector("#silence-ring-fg");
    const timeEl = layer.querySelector("#silence-time");

    // 圆环周长 = 2π·26 ≈ 163.36
    const CIRC = 2 * Math.PI * 26;
    ringFg.style.strokeDasharray = CIRC;
    ringFg.style.strokeDashoffset = 0;

    function settle(choice, silent) {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      Saves.saveSilenceRecord(currentNodeId, choice.value || "silent", silent);
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
      // 沉默分支有专属文本时，先短暂显示
      if (silent && choice.text) {
        layer.querySelector(".silence-prompt").textContent = choice.text;
        layer.querySelector(".silence-options").innerHTML = "";
        layer.querySelector(".silence-timer").style.opacity = "0";
        layer.querySelector(".silence-hint").style.opacity = "0";
        setTimeout(() => {
          layer.remove();
          const node = SCRIPT[currentNodeId];
          const jumpTo = choice.next || (node && node.next);
          if (jumpTo) gotoNode(jumpTo);
        }, 1800);
      } else {
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = choice.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      }
    }

    (silence.options || []).forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "silence-btn";
      btn.textContent = choice.text;
      btn.onclick = () => settle(choice, false);
      optionsEl.appendChild(btn);
    });

    const timer = setInterval(() => {
      timeLeft--;
      if (timeEl) timeEl.textContent = Math.max(0, timeLeft);
      const offset = CIRC * (1 - timeLeft / duration);
      if (ringFg) ringFg.style.strokeDashoffset = offset;
      if (timeLeft <= 3) {
        ringFg && ringFg.classList.add("silence-ring-warning");
      }
      if (timeLeft <= 0) {
        clearInterval(timer);
        settle(silence.silent || { value: "silent", next: silence.silent && silence.silent.next }, true);
      }
    }, 1000);

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runTouch(touch, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "touch-layer";
    layer.id = "touch-layer";
    layer.innerHTML = `
      <div class="touch-prompt">${touch.prompt || ""}</div>
      <div class="touch-stage"></div>
      <div class="touch-dialog" id="touch-dialog"></div>
      <div class="touch-actions">
        <button class="touch-exit" disabled>${touch.exitText || "（收回手）"}</button>
      </div>
    `;
    const stage = layer.querySelector(".touch-stage");
    const dialogEl = layer.querySelector("#touch-dialog");
    const exitBtn = layer.querySelector(".touch-exit");

    const touched = new Set();
    const parts = touch.parts || [];

    // 立绘占位（实际立绘在 #char-layer，这里只是热区容器）
    const portraitBox = document.createElement("div");
    portraitBox.className = "touch-portrait";
    // 用 svg 占位（如果立绘层已渲染就不重复渲染）
    portraitBox.innerHTML = PORTRAITS[touch.char] || `<div class="touch-portrait-empty">（无立绘）</div>`;
    stage.appendChild(portraitBox);

    // 在立绘上叠加可点击热区（按百分比定位）
    parts.forEach(part => {
      const hot = document.createElement("div");
      hot.className = "touch-hotspot";
      hot.style.left = `${part.x}%`;
      hot.style.top = `${part.y}%`;
      hot.style.width = `${part.w}%`;
      hot.style.height = `${part.h}%`;
      hot.dataset.id = part.id;
      hot.innerHTML = `<span class="touch-hotspot-label">${part.label}</span>`;
      hot.onclick = () => {
        if (hot.classList.contains("touched")) return;
        hot.classList.add("touched");
        // 显示对话
        dialogEl.innerHTML = `<div class="touch-dialogue-text">${part.dialogue || ""}</div>`;
        // 应用效果
        if (part.add) { applyAdd(part.add); updateHeartBar(); }
        if (part.personality) {
          for (const dim in part.personality) Saves.addPersonality(dim, part.personality[dim]);
        }
        if (part.memory) {
          if (!Saves.isMemoryUnlocked(part.memory.id)) {
            Saves.saveMemory(part.memory.id, part.memory.text);
            flashHint(`✦ 新记忆：${part.memory.title}`);
          }
        }
        Saves.saveTouchRecord(currentNodeId, part.id, part.label);
        touched.add(part.id);
        // 全部触碰过或至少碰过 1 个就解锁退出
        exitBtn.disabled = touched.size < Math.min(touch.min || 1, parts.length);
      };
      portraitBox.appendChild(hot);
    });

    exitBtn.onclick = () => {
      if (exitBtn.disabled) return;
      layer.remove();
      const node = SCRIPT[currentNodeId];
      const jumpTo = touch.next || (node && node.next);
      if (jumpTo) gotoNode(jumpTo);
    };

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runTemperature(temp, currentNodeId) {
    el.dialogBox.classList.add("hidden");

    const layer = document.createElement("div");
    layer.className = "temperature-layer";
    layer.id = "temperature-layer";
    layer.innerHTML = `
      <div class="temp-prompt">${temp.prompt || "调节心境温度——"}</div>
      <div class="temp-display">
        <span class="temp-value" id="temp-value">0</span>
        <span class="temp-tag" id="temp-tag">常温</span>
      </div>
      <div class="temp-slider-wrap">
        <span class="temp-label-cold">冷</span>
        <input type="range" min="-100" max="100" value="0" step="1" class="temp-slider" id="temp-slider"/>
        <span class="temp-label-warm">暖</span>
      </div>
      <div class="temp-preview" id="temp-preview"></div>
      <div class="temp-actions">
        <button class="temp-confirm" id="temp-confirm">就这样</button>
      </div>
    `;
    const slider = layer.querySelector("#temp-slider");
    const valueEl = layer.querySelector("#temp-value");
    const tagEl = layer.querySelector("#temp-tag");
    const previewEl = layer.querySelector("#temp-preview");
    const confirmBtn = layer.querySelector("#temp-confirm");

    function tagFor(v) {
      if (v >= 30) return { tag: "warm", label: "暖" };
      if (v <= -30) return { tag: "cool", label: "冷" };
      return { tag: "neutral", label: "常温" };
    }
    function previewText(tag) {
      if (tag === "warm") return temp.previewWarm || "——把心放暖一点。";
      if (tag === "cool") return temp.previewCool || "——退一步，凉一点。";
      return temp.previewNeutral || "——就在此刻，不偏不倚。";
    }

    function update(v) {
      valueEl.textContent = (v > 0 ? "+" : "") + v;
      const { tag, label } = tagFor(v);
      tagEl.textContent = label;
      tagEl.dataset.tag = tag;
      previewEl.textContent = previewText(tag);
      // 影响背景色调（实时预览）
      el.bgOverlay.style.background =
        tag === "warm" ? "linear-gradient(180deg, rgba(255,180,120,0.18), rgba(255,120,80,0.10))" :
        tag === "cool" ? "linear-gradient(180deg, rgba(120,180,255,0.18), rgba(80,120,200,0.10))" :
        "transparent";
    }
    slider.oninput = () => update(parseInt(slider.value, 10));
    update(0);

    confirmBtn.onclick = () => {
      const v = parseInt(slider.value, 10);
      const { tag } = tagFor(v);
      Saves.saveTemperatureRecord(currentNodeId, v, tag);
      if (temp.scoreBonus && temp.scoreBonus[tag]) {
        applyAdd(temp.scoreBonus[tag]);
        updateHeartBar();
      }
      // 恢复背景叠加
      el.bgOverlay.style.background = "transparent";
      flashHint(`🌡 心境温度：${v > 0 ? "+" : ""}${v}（${tagEl.textContent}）`);
      layer.remove();
      const node = SCRIPT[currentNodeId];
      const jumpTo = (temp.scoreJump && temp.scoreJump[tag]) || temp.next || (node && node.next);
      if (jumpTo) gotoNode(jumpTo);
    };

    document.getElementById("game").appendChild(layer);
  }

  /* ============================================================
     v0.8.0 占卜抽牌 runTarot
     node.tarot = {
       prompt: "学姐翻开牌阵——过去 / 现在 / 未来",
       deck: [
         { id, name, upright, reversed, svg? }
       ],
       positions: ["过去", "现在", "未来"],
       // 抽完牌后按组合判定
       combos: [
         { ids: ["a","b","c"], tag: "triple_light", label: "三张全是光明",
           add?, personality?, memory?, next },
         { ids: ["a","b"], tag: "pair_ab", next } // 部分匹配也支持
       ],
       fallback: { tag: "default", next } // 都不匹配
     }
     ============================================================ */
  function runTarot(tarot, currentNodeId) {
    el.dialogBox.classList.add("hidden");

    const layer = document.createElement("div");
    layer.className = "tarot-layer";
    layer.id = "tarot-layer";
    layer.innerHTML = `
      <div class="tarot-prompt">${tarot.prompt || "抽三张牌——"}</div>
      <div class="tarot-slots"></div>
      <div class="tarot-deck"></div>
      <div class="tarot-actions">
        <button class="tarot-confirm" disabled>解读</button>
      </div>
    `;
    const slotsEl = layer.querySelector(".tarot-slots");
    const deckEl = layer.querySelector(".tarot-deck");
    const confirmBtn = layer.querySelector(".tarot-confirm");

    const positions = tarot.positions || ["过去", "现在", "未来"];
    const deck = tarot.deck || [];
    const drawCount = positions.length;
    const drawn = []; // 抽出的牌 id 列表

    // 渲染牌阵槽位
    positions.forEach(pos => {
      const slot = document.createElement("div");
      slot.className = "tarot-slot";
      slot.innerHTML = `<div class="tarot-slot-label">${pos}</div>
                        <div class="tarot-slot-card"></div>`;
      slotsEl.appendChild(slot);
    });

    // 渲染牌堆（叠成一摞）
    const deckWrap = document.createElement("div");
    deckWrap.className = "tarot-deck-stack";
    if (deck.length) {
      // 渲染最多 6 张可见层
      const stackVisible = Math.min(6, deck.length);
      for (let i = 0; i < stackVisible; i++) {
        const card = document.createElement("div");
        card.className = "tarot-deck-card";
        card.style.transform = `translateY(${-i * 2}px) translateX(${i * 1}px) rotate(${(i - 2.5) * 0.6}deg)`;
        card.style.zIndex = stackVisible - i;
        deckWrap.appendChild(card);
      }
    }
    deckEl.appendChild(deckWrap);

    let deckClicks = 0;
    deckWrap.onclick = () => {
      if (drawn.length >= drawCount) return;
      // 随机抽一张未抽过的
      const remaining = deck.filter(c => !drawn.includes(c.id));
      if (!remaining.length) return;
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      // 50% 概率逆位
      const reversed = Math.random() < 0.5;
      drawn.push(pick.id);
      // 填入下一个槽位
      const slotIdx = drawn.length - 1;
      const slotCard = slotsEl.children[slotIdx].querySelector(".tarot-slot-card");
      slotCard.innerHTML = `<div class="tarot-card ${reversed ? "reversed" : ""}">
        <div class="tarot-card-name">${pick.name}</div>
        <div class="tarot-card-orient">${reversed ? "逆位" : "正位"}</div>
      </div>`;
      slotsEl.children[slotIdx].classList.add("filled");
      // 临时保存抽到的牌信息（用于 combo 匹配）
      pick._reversed = reversed;
      if (drawn.length >= drawCount) {
        confirmBtn.disabled = false;
        deckEl.style.opacity = "0.3";
        deckEl.style.pointerEvents = "none";
      }
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      // 匹配 combo
      const pickedCards = drawn.map(id => deck.find(c => c.id === id));
      const combo = matchTarotCombo(tarot, pickedCards);
      // 保存
      const past = pickedCards[0], present = pickedCards[1], future = pickedCards[2];
      Saves.saveTarotRecord(currentNodeId,
        past ? { id: past.id, name: past.name, reversed: past._reversed } : null,
        present ? { id: present.id, name: present.name, reversed: present._reversed } : null,
        future ? { id: future.id, name: future.name, reversed: future._reversed } : null,
        combo.tag);
      // 应用效果
      if (combo.add) { applyAdd(combo.add); updateHeartBar(); }
      if (combo.personality) {
        for (const dim in combo.personality) Saves.addPersonality(dim, combo.personality[dim]);
      }
      if (combo.memory) {
        if (!Saves.isMemoryUnlocked(combo.memory.id)) {
          Saves.saveMemory(combo.memory.id, combo.memory.text);
          flashHint(`✦ 新记忆：${combo.memory.title}`);
        }
      }
      // 显示解读
      const reading = document.createElement("div");
      reading.className = "tarot-reading";
      reading.innerHTML = `<div class="tarot-reading-title">${combo.label || "解读"}</div>
        <div class="tarot-reading-text">${combo.text || ""}</div>
        <button class="tarot-reading-close">继续</button>`;
      reading.querySelector(".tarot-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = combo.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  function matchTarotCombo(tarot, pickedCards) {
    const drawnIds = pickedCards.map(c => c?.id).filter(Boolean);
    const combos = tarot.combos || [];
    // 优先匹配完整组合
    for (const c of combos) {
      if (c.ids && c.ids.length === drawnIds.length &&
          c.ids.every(id => drawnIds.includes(id))) {
        return c;
      }
    }
    // 再匹配部分组合（2 张）
    for (const c of combos) {
      if (c.ids && c.ids.length === 2 && c.ids.every(id => drawnIds.includes(id))) {
        return c;
      }
    }
    // 最后单张
    for (const c of combos) {
      if (c.ids && c.ids.length === 1 && drawnIds.includes(c.ids[0])) {
        return c;
      }
    }
    return tarot.fallback || { tag: "default", label: "——牌阵无言", next: null };
  }

  /* ============================================================
     v0.8.0 梦境编织 runDreamweave
     node.dreamweave = {
       prompt: "把碎片按你的直觉拖进画布——",
       fragments: [
         { id, label, desc, color }
       ],
       // 解析拼接顺序
       interpretations: [
         { seq: ["a","b","c"], tag: "flow", label, text, add?, memory?, next }
       ],
       fallback: { tag: "default", next }
     }
     ============================================================ */
  function runDreamweave(dw, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "dreamweave-layer";
    layer.id = "dreamweave-layer";
    layer.innerHTML = `
      <div class="dw-prompt">${dw.prompt || "编织梦境——"}</div>
      <div class="dw-canvas" id="dw-canvas"></div>
      <div class="dw-pool" id="dw-pool"></div>
      <div class="dw-actions">
        <button class="dw-reset">重置</button>
        <button class="dw-confirm" disabled>解读梦境</button>
      </div>
    `;
    const canvas = layer.querySelector("#dw-canvas");
    const pool = layer.querySelector("#dw-pool");
    const confirmBtn = layer.querySelector(".dw-confirm");
    const resetBtn = layer.querySelector(".dw-reset");

    const fragments = dw.fragments || [];
    const sequence = []; // 已放入画布的碎片 id

    fragments.forEach(frag => {
      const chip = document.createElement("div");
      chip.className = "dw-fragment";
      chip.dataset.id = frag.id;
      chip.style.borderLeftColor = frag.color || "#d8a8e8";
      chip.innerHTML = `<span class="dw-frag-label">${frag.label}</span>`;
      chip.onclick = () => {
        if (chip.classList.contains("placed")) return;
        chip.classList.add("placed");
        // 加入画布
        const node = document.createElement("div");
        node.className = "dw-node";
        node.style.borderColor = frag.color || "#d8a8e8";
        node.innerHTML = `<div class="dw-node-label">${frag.label}</div>
          <div class="dw-node-desc">${frag.desc || ""}</div>`;
        node.dataset.id = frag.id;
        canvas.appendChild(node);
        sequence.push(frag.id);
        // 添加连接线
        if (sequence.length > 1) {
          const line = document.createElement("div");
          line.className = "dw-connector";
          canvas.appendChild(line);
        }
        confirmBtn.disabled = sequence.length < Math.min(dw.min || 2, fragments.length);
      };
      pool.appendChild(chip);
    });

    resetBtn.onclick = () => {
      canvas.innerHTML = "";
      sequence.length = 0;
      pool.querySelectorAll(".dw-fragment").forEach(c => c.classList.remove("placed"));
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      // 匹配解读
      const interp = matchDreamweave(dw, sequence);
      // 保存
      Saves.saveDreamweaveRecord(currentNodeId, sequence.slice(), interp.text || "", interp.tag);
      if (interp.add) { applyAdd(interp.add); updateHeartBar(); }
      if (interp.personality) {
        for (const dim in interp.personality) Saves.addPersonality(dim, interp.personality[dim]);
      }
      if (interp.memory) {
        if (!Saves.isMemoryUnlocked(interp.memory.id)) {
          Saves.saveMemory(interp.memory.id, interp.memory.text);
          flashHint(`✦ 新记忆：${interp.memory.title}`);
        }
      }
      // 显示解读
      const reading = document.createElement("div");
      reading.className = "dw-reading";
      reading.innerHTML = `<div class="dw-reading-title">${interp.label || "解读"}</div>
        <div class="dw-reading-text">${interp.text || ""}</div>
        <button class="dw-reading-close">继续</button>`;
      reading.querySelector(".dw-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = interp.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  function matchDreamweave(dw, seq) {
    const interps = dw.interpretations || [];
    // 优先匹配完全相同顺序
    for (const i of interps) {
      if (i.seq && i.seq.length === seq.length && i.seq.every((id, idx) => id === seq[idx])) {
        return i;
      }
    }
    // 再匹配包含（顺序无关，只要都包含）
    for (const i of interps) {
      if (i.seq && i.seq.length === seq.length && i.seq.every(id => seq.includes(id))) {
        return i;
      }
    }
    return dw.fallback || { tag: "default", label: "——梦不成形", next: null };
  }

  /* ============================================================
     v0.8.0 笔迹选择 runHandwriting
     node.handwriting = {
       prompt: "你拿笔开始写——选一种笔迹",
       letter: "letter_2",
       styles: [
         { id, label, desc, add?, personality?, memory?, next }
       ]
     }
     ============================================================ */
  function runHandwriting(hw, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "handwriting-layer";
    layer.id = "handwriting-layer";
    layer.innerHTML = `
      <div class="hw-prompt">${hw.prompt || "选一种笔迹——"}</div>
      <div class="hw-styles"></div>
      <div class="hw-preview" id="hw-preview"></div>
    `;
    const stylesEl = layer.querySelector(".hw-styles");
    const previewEl = layer.querySelector("#hw-preview");

    const styles = hw.styles || [];
    styles.forEach(style => {
      const btn = document.createElement("button");
      btn.className = `hw-style hw-${style.id}`;
      btn.innerHTML = `<div class="hw-label">${style.label}</div>
                       <div class="hw-desc">${style.desc || ""}</div>`;
      btn.onmouseenter = () => {
        previewEl.textContent = style.preview || style.label;
        previewEl.className = `hw-preview hw-${style.id}-preview`;
      };
      btn.onclick = () => {
        Saves.saveHandwritingRecord(currentNodeId, style.id, style.label);
        if (style.add) { applyAdd(style.add); updateHeartBar(); }
        if (style.personality) {
          for (const dim in style.personality) Saves.addPersonality(dim, style.personality[dim]);
        }
        if (style.memory) {
          if (!Saves.isMemoryUnlocked(style.memory.id)) {
            Saves.saveMemory(style.memory.id, style.memory.text);
            flashHint(`✦ 新记忆：${style.memory.title}`);
          }
        }
        flashHint(`✒ 笔迹：${style.label}`);
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = style.next || hw.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      stylesEl.appendChild(btn);
    });

    document.getElementById("game").appendChild(layer);
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
     ============================================================ */
  function runSpectrum(spec, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "spectrum-layer";
    layer.id = "spectrum-layer";
    layer.innerHTML = `
      <div class="sp-prompt">${spec.prompt || "此刻你的心，在哪？"}</div>
      <div class="sp-stage" id="sp-stage">
        <svg class="sp-axes" viewBox="-110 -110 220 220">
          <line x1="-100" y1="0" x2="100" y2="0" class="sp-axis"/>
          <line x1="0" y1="-100" x2="0" y2="100" class="sp-axis"/>
          <circle cx="0" cy="0" r="60" class="sp-ring"/>
          <circle cx="0" cy="0" r="30" class="sp-ring"/>
          <text x="98" y="-4" class="sp-axis-label">愉悦 →</text>
          <text x="-100" y="-4" class="sp-axis-label">← 不悦</text>
          <text x="4" y="-96" class="sp-axis-label">↑ 激昂</text>
          <text x="4" y="100" class="sp-axis-label">↓ 平静</text>
        </svg>
        <div class="sp-point" id="sp-point"></div>
      </div>
      <div class="sp-info" id="sp-info">点击或拖动选择位置</div>
      <div class="sp-actions">
        <button class="sp-confirm" id="sp-confirm" disabled>确定</button>
      </div>
    `;
    const stage = layer.querySelector("#sp-stage");
    const point = layer.querySelector("#sp-point");
    const info = layer.querySelector("#sp-info");
    const confirmBtn = layer.querySelector("#sp-confirm");

    let curX = 0, curY = 0, hasSelected = false;

    function stageToValue(clientX, clientY) {
      const rect = stage.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      // 限制在 -100..100
      let x = Math.round((clientX - rect.left - cx) / (rect.width / 2) * 100);
      let y = Math.round(-(clientY - rect.top - cy) / (rect.height / 2) * 100); // y 翻转
      x = Math.max(-100, Math.min(100, x));
      y = Math.max(-100, Math.min(100, y));
      return { x, y };
    }
    function updatePoint(x, y) {
      curX = x; curY = y;
      point.style.left = `${50 + x / 2}%`;
      point.style.top = `${50 - y / 2}%`;
      const q = quadrantOf(x, y);
      const qdef = spec.quadrants && spec.quadrants[q];
      info.textContent = qdef ? `${qdef.label}（${x > 0 ? "+" : ""}${x}, ${y > 0 ? "+" : ""}${y}）` : `${x}, ${y}`;
      info.dataset.quadrant = q;
      confirmBtn.disabled = false;
    }
    function quadrantOf(x, y) {
      if (x >= 0 && y >= 0) return "q_tr";
      if (x < 0 && y >= 0) return "q_tl";
      if (x >= 0 && y < 0) return "q_br";
      return "q_bl";
    }

    let dragging = false;
    stage.addEventListener("mousedown", e => {
      dragging = true;
      const v = stageToValue(e.clientX, e.clientY);
      updatePoint(v.x, v.y);
      hasSelected = true;
    });
    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      const v = stageToValue(e.clientX, e.clientY);
      updatePoint(v.x, v.y);
    });
    document.addEventListener("mouseup", () => { dragging = false; });
    // 触屏支持
    stage.addEventListener("touchstart", e => {
      const t = e.touches[0];
      const v = stageToValue(t.clientX, t.clientY);
      updatePoint(v.x, v.y);
      hasSelected = true;
      e.preventDefault();
    }, { passive: false });
    stage.addEventListener("touchmove", e => {
      const t = e.touches[0];
      const v = stageToValue(t.clientX, t.clientY);
      updatePoint(v.x, v.y);
      e.preventDefault();
    }, { passive: false });

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const q = quadrantOf(curX, curY);
      const qdef = (spec.quadrants && spec.quadrants[q]) || spec.fallback || { tag: q, next: null };
      const tag = qdef.tag || q;
      Saves.saveSpectrumRecord(currentNodeId, curX, curY, tag);
      if (qdef.add) { applyAdd(qdef.add); updateHeartBar(); }
      if (qdef.personality) {
        for (const dim in qdef.personality) Saves.addPersonality(dim, qdef.personality[dim]);
      }
      if (qdef.memory) {
        if (!Saves.isMemoryUnlocked(qdef.memory.id)) {
          Saves.saveMemory(qdef.memory.id, qdef.memory.text);
          flashHint(`✦ 新记忆：${qdef.memory.title}`);
        }
      }
      flashHint(`✦ 情绪：${qdef.label}`);
      layer.remove();
      const node = SCRIPT[currentNodeId];
      const jumpTo = qdef.next || (node && node.next);
      if (jumpTo) gotoNode(jumpTo);
    };

    document.getElementById("game").appendChild(layer);
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
  function runConstellation(cs, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "constellation-layer";
    layer.id = "constellation-layer";
    layer.innerHTML = `
      <div class="cs-prompt">${cs.prompt || "夜空散布星点——按你的直觉连线"}</div>
      <div class="cs-stage" id="cs-stage">
        <svg class="cs-lines" id="cs-lines" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
        <div class="cs-stars" id="cs-stars"></div>
      </div>
      <div class="cs-info" id="cs-info">点击星点连线（至少 ${cs.min || 2} 颗）</div>
      <div class="cs-actions">
        <button class="cs-reset">重置</button>
        <button class="cs-confirm" disabled>解读星图</button>
      </div>
    `;
    const stage = layer.querySelector("#cs-stage");
    const linesSvg = layer.querySelector("#cs-lines");
    const starsEl = layer.querySelector("#cs-stars");
    const info = layer.querySelector("#cs-info");
    const confirmBtn = layer.querySelector(".cs-confirm");
    const resetBtn = layer.querySelector(".cs-reset");

    const stars = cs.stars || [];
    const sequence = [];

    stars.forEach(star => {
      const dot = document.createElement("div");
      dot.className = "cs-star";
      dot.style.left = star.x + "%";
      dot.style.top = star.y + "%";
      dot.dataset.id = star.id;
      dot.innerHTML = `<span class="cs-star-dot"></span><span class="cs-star-name">${star.name || ""}</span>`;
      dot.onclick = () => {
        if (dot.classList.contains("lit")) return;
        dot.classList.add("lit");
        sequence.push(star.id);
        drawLines();
        const minReq = Math.min(cs.min || 2, stars.length);
        confirmBtn.disabled = sequence.length < minReq;
        info.textContent = `已连接 ${sequence.length} 颗：${sequence.map(id => stars.find(s => s.id === id).name || id).join(" → ")}`;
      };
      starsEl.appendChild(dot);
    });

    function drawLines() {
      linesSvg.innerHTML = "";
      for (let i = 0; i < sequence.length - 1; i++) {
        const a = stars.find(s => s.id === sequence[i]);
        const b = stars.find(s => s.id === sequence[i + 1]);
        if (!a || !b) continue;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", a.x);
        line.setAttribute("y1", a.y);
        line.setAttribute("x2", b.x);
        line.setAttribute("y2", b.y);
        line.setAttribute("class", "cs-line");
        linesSvg.appendChild(line);
      }
    }

    resetBtn.onclick = () => {
      sequence.length = 0;
      linesSvg.innerHTML = "";
      starsEl.querySelectorAll(".cs-star.lit").forEach(s => s.classList.remove("lit"));
      confirmBtn.disabled = true;
      info.textContent = `点击星点连线（至少 ${cs.min || 2} 颗）`;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const interp = matchConstellation(cs, sequence);
      Saves.saveConstellationRecord(currentNodeId, sequence.slice(), interp.tag);
      if (interp.add) { applyAdd(interp.add); updateHeartBar(); }
      if (interp.personality) {
        for (const dim in interp.personality) Saves.addPersonality(dim, interp.personality[dim]);
      }
      if (interp.memory) {
        if (!Saves.isMemoryUnlocked(interp.memory.id)) {
          Saves.saveMemory(interp.memory.id, interp.memory.text);
          flashHint(`✦ 新记忆：${interp.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "cs-reading";
      reading.innerHTML = `<div class="cs-reading-title">${interp.label || "解读"}</div>
        <div class="cs-reading-text">${interp.text || ""}</div>
        <button class="cs-reading-close">继续</button>`;
      reading.querySelector(".cs-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = interp.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  function matchConstellation(cs, seq) {
    const consts = cs.constellations || [];
    for (const c of consts) {
      if (c.stars && c.stars.length === seq.length && c.stars.every((id, i) => id === seq[i])) {
        return c;
      }
    }
    for (const c of consts) {
      if (c.stars && c.stars.length === seq.length && c.stars.every(id => seq.includes(id))) {
        return c;
      }
    }
    for (const c of consts) {
      if (c.stars && c.stars.every(id => seq.includes(id))) {
        return c;
      }
    }
    return cs.fallback || { tag: "default", label: "——星图无言", next: null };
  }

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
  function runStethoscope(st, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "stethoscope-layer";
    layer.id = "stethoscope-layer";
    layer.innerHTML = `
      <div class="st-prompt">${st.prompt || "跟随心跳——"}</div>
      <div class="st-stage" id="st-stage">
        <canvas class="st-wave" id="st-wave" width="600" height="160"></canvas>
        <div class="st-marker" id="st-marker"></div>
      </div>
      <div class="st-info" id="st-info">点击/空格同步心跳</div>
      <div class="st-actions">
        <button class="st-start">开始</button>
        <button class="st-tap" id="st-tap" disabled>同步（空格）</button>
      </div>
    `;
    const canvas = layer.querySelector("#st-wave");
    const ctx = canvas.getContext("2d");
    const marker = layer.querySelector("#st-marker");
    const info = layer.querySelector("#st-info");
    const startBtn = layer.querySelector(".st-start");
    const tapBtn = layer.querySelector("#st-tap");

    const bpm = st.bpm || 72;
    const totalBeats = st.beats || 12;
    const beatInterval = 60000 / bpm;
    const windowSec = (st.window || 0.3) * 1000;
    const beats = [];
    let hits = 0;
    let started = false;
    let finished = false;
    let beatIdx = 0;
    let startTime = 0;
    let animId = null;

    function ecgY(t) {
      // 心电图波形：在每拍中点产生尖峰
      const phase = (t % beatInterval) / beatInterval;
      if (phase < 0.1) return 0;
      if (phase < 0.15) return -30;
      if (phase < 0.18) return 60;
      if (phase < 0.21) return -40;
      if (phase < 0.25) return 10;
      return 0;
    }

    function draw() {
      if (finished) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      // 网格
      ctx.strokeStyle = "rgba(180,255,200,0.1)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      // 波形（滚动窗口，显示最近 3 秒）
      const showMs = 3000;
      const startMs = elapsed - showMs;
      ctx.strokeStyle = "#7aff9a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let first = true;
      for (let x = 0; x < W; x++) {
        const t = startMs + (x / W) * showMs;
        if (t < 0) continue;
        const y = H / 2 - ecgY(t);
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 当前位置标记
      marker.style.left = "100%";
      // 节拍点（在窗口内显示）
      beats.forEach(b => {
        const t = b.time - startMs;
        if (t < 0 || t > showMs) return;
        const x = (t / showMs) * W;
        const hit = b.hit;
        ctx.fillStyle = hit ? "#7aff9a" : "rgba(255,120,120,0.5)";
        ctx.beginPath();
        ctx.arc(x, H / 2, hit ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      // 检查是否结束
      if (beatIdx >= totalBeats && elapsed > beats[totalBeats - 1].time + windowSec) {
        finishStethoscope();
        return;
      }
      animId = requestAnimationFrame(draw);
    }

    function registerBeat() {
      const now = performance.now();
      const beatTime = startTime + beatIdx * beatInterval;
      // 判断玩家是否在窗口内点击
      const diff = Math.abs(now - beatTime);
      if (diff < windowSec) {
        beats[beatIdx].hit = true;
        hits++;
        flashHint(`♥ 同步 ${Math.round((1 - diff / windowSec) * 100)}%`);
      }
      beatIdx++;
      info.textContent = `命中 ${hits} / ${beatIdx}（窗口 ${(windowSec / 1000).toFixed(1)}s）`;
      if (beatIdx >= totalBeats) {
        setTimeout(finishStethoscope, windowSec + 50);
      }
    }

    function onKey(e) {
      if (e.code === "Space" && started && !finished) {
        e.preventDefault();
        registerBeat();
      }
    }

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startBtn.disabled = true;
      tapBtn.disabled = false;
      startTime = performance.now();
      // 预生成所有节拍时间
      for (let i = 0; i < totalBeats; i++) {
        beats.push({ time: startTime + i * beatInterval, hit: false });
      }
      info.textContent = `跟随心跳——命中 0 / ${totalBeats}`;
      document.addEventListener("keydown", onKey);
      draw();
    };

    tapBtn.onclick = () => {
      if (!started || finished) return;
      registerBeat();
    };

    function finishStethoscope() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", onKey);
      const accuracy = hits / totalBeats;
      const thresholds = st.thresholds || [];
      let matched = st.fallback || { tag: "miss", label: "——错拍", next: null };
      for (const t of thresholds) {
        if (accuracy >= t.min) { matched = t; break; }
      }
      Saves.saveStethoscopeRecord(currentNodeId, hits, totalBeats, accuracy, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "st-reading";
      reading.innerHTML = `<div class="st-reading-title">${matched.label || "解读"} · ${Math.round(accuracy * 100)}%</div>
        <div class="st-reading-text">${matched.text || ""}</div>
        <button class="st-reading-close">继续</button>`;
      reading.querySelector(".st-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    }

    document.getElementById("game").appendChild(layer);
  }

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
  function runPuzzle(pz, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "puzzle-layer";
    layer.id = "puzzle-layer";
    layer.innerHTML = `
      <div class="pz-prompt">${pz.prompt || "把碎片拼起来——"}</div>
      <div class="pz-board" id="pz-board"></div>
      <div class="pz-pool" id="pz-pool"></div>
      <div class="pz-actions">
        <button class="pz-reset">重置</button>
        <button class="pz-confirm" disabled>解读拼图</button>
      </div>
    `;
    const board = layer.querySelector("#pz-board");
    const pool = layer.querySelector("#pz-pool");
    const confirmBtn = layer.querySelector(".pz-confirm");
    const resetBtn = layer.querySelector(".pz-reset");

    const pieces = pz.pieces || [];
    const sequence = [];

    pieces.forEach(piece => {
      const chip = document.createElement("div");
      chip.className = "pz-piece";
      chip.dataset.id = piece.id;
      chip.innerHTML = `<div class="pz-piece-label">${piece.label}</div>
        <div class="pz-piece-desc">${piece.desc || ""}</div>`;
      chip.onclick = () => {
        if (chip.classList.contains("placed")) return;
        chip.classList.add("placed");
        const slot = document.createElement("div");
        slot.className = "pz-slot filled";
        slot.dataset.id = piece.id;
        slot.innerHTML = `<div class="pz-slot-label">${piece.label}</div>`;
        board.appendChild(slot);
        sequence.push(piece.id);
        confirmBtn.disabled = sequence.length < Math.min(pz.min || 2, pieces.length);
      };
      pool.appendChild(chip);
    });

    resetBtn.onclick = () => {
      board.innerHTML = "";
      sequence.length = 0;
      pool.querySelectorAll(".pz-piece.placed").forEach(c => c.classList.remove("placed"));
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const interp = matchPuzzle(pz, sequence);
      Saves.savePuzzleRecord(currentNodeId, sequence.slice(), interp.tag);
      if (interp.add) { applyAdd(interp.add); updateHeartBar(); }
      if (interp.personality) {
        for (const dim in interp.personality) Saves.addPersonality(dim, interp.personality[dim]);
      }
      if (interp.memory) {
        if (!Saves.isMemoryUnlocked(interp.memory.id)) {
          Saves.saveMemory(interp.memory.id, interp.memory.text);
          flashHint(`✦ 新记忆：${interp.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "pz-reading";
      reading.innerHTML = `<div class="pz-reading-title">${interp.label || "解读"}</div>
        <div class="pz-reading-text">${interp.text || ""}</div>
        <button class="pz-reading-close">继续</button>`;
      reading.querySelector(".pz-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = interp.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  function matchPuzzle(pz, seq) {
    const interps = pz.interpretations || [];
    for (const i of interps) {
      if (i.order && i.order.length === seq.length && i.order.every((id, idx) => id === seq[idx])) {
        return i;
      }
    }
    for (const i of interps) {
      if (i.order && i.order.length === seq.length && i.order.every(id => seq.includes(id))) {
        return i;
      }
    }
    return pz.fallback || { tag: "default", label: "——拼不成形", next: null };
  }

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
  function runPerfume(pf, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "perfume-layer";
    layer.id = "perfume-layer";
    const notes = pf.notes || ["前调", "中调", "后调"];
    layer.innerHTML = `
      <div class="pf-prompt">${pf.prompt || "调一瓶香水——"}</div>
      <div class="pf-blends" id="pf-blends"></div>
      <div class="pf-ingredients" id="pf-ingredients"></div>
      <div class="pf-actions">
        <button class="pf-reset">重置</button>
        <button class="pf-confirm" disabled>解读香方</button>
      </div>
    `;
    const blendsEl = layer.querySelector("#pf-blends");
    const ingEl = layer.querySelector("#pf-ingredients");
    const confirmBtn = layer.querySelector(".pf-confirm");
    const resetBtn = layer.querySelector(".pf-reset");

    const ingredients = pf.ingredients || [];
    const selected = {}; // note -> ingredient id

    // 渲染调香槽
    notes.forEach(note => {
      const slot = document.createElement("div");
      slot.className = "pf-slot";
      slot.dataset.note = note;
      slot.innerHTML = `<div class="pf-slot-label">${note}</div>
        <div class="pf-slot-fill" data-note="${note}">—</div>`;
      blendsEl.appendChild(slot);
    });

    // 渲染材料
    ingredients.forEach(ing => {
      const chip = document.createElement("div");
      chip.className = `pf-ingredient pf-ing-${ing.note}`;
      chip.dataset.id = ing.id;
      chip.dataset.note = ing.note;
      chip.innerHTML = `<div class="pf-ing-label">${ing.label}</div>
        <div class="pf-ing-note">${ing.note}</div>
        <div class="pf-ing-desc">${ing.desc || ""}</div>`;
      chip.onclick = () => {
        // 取消同 note 的旧选择
        const note = ing.note;
        if (selected[note]) {
          const oldChip = ingEl.querySelector(`.pf-ingredient[data-id="${selected[note]}"]`);
          if (oldChip) oldChip.classList.remove("selected");
        }
        if (chip.classList.contains("selected")) {
          chip.classList.remove("selected");
          delete selected[note];
          blendsEl.querySelector(`.pf-slot-fill[data-note="${note}"]`).textContent = "—";
        } else {
          chip.classList.add("selected");
          selected[note] = ing.id;
          blendsEl.querySelector(`.pf-slot-fill[data-note="${note}"]`).textContent = ing.label;
        }
        confirmBtn.disabled = Object.keys(selected).length < notes.length;
      };
      ingEl.appendChild(chip);
    });

    resetBtn.onclick = () => {
      Object.keys(selected).forEach(k => delete selected[k]);
      ingEl.querySelectorAll(".pf-ingredient.selected").forEach(c => c.classList.remove("selected"));
      notes.forEach(note => {
        blendsEl.querySelector(`.pf-slot-fill[data-note="${note}"]`).textContent = "—";
      });
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const ids = notes.map(n => selected[n]).filter(Boolean);
      const recipe = matchPerfume(pf, ids);
      Saves.savePerfumeRecord(currentNodeId, { ...selected }, recipe.tag);
      if (recipe.add) { applyAdd(recipe.add); updateHeartBar(); }
      if (recipe.personality) {
        for (const dim in recipe.personality) Saves.addPersonality(dim, recipe.personality[dim]);
      }
      if (recipe.memory) {
        if (!Saves.isMemoryUnlocked(recipe.memory.id)) {
          Saves.saveMemory(recipe.memory.id, recipe.memory.text);
          flashHint(`✦ 新记忆：${recipe.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "pf-reading";
      reading.innerHTML = `<div class="pf-reading-title">${recipe.label || "解读"}</div>
        <div class="pf-reading-text">${recipe.text || ""}</div>
        <button class="pf-reading-close">继续</button>`;
      reading.querySelector(".pf-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = recipe.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  function matchPerfume(pf, ids) {
    const recipes = pf.recipes || [];
    for (const r of recipes) {
      if (r.ids && r.ids.length === ids.length && r.ids.every(id => ids.includes(id))) {
        return r;
      }
    }
    return pf.fallback || { tag: "default", label: "——香不成方", next: null };
  }

  /* ============================================================
     v1.0.0 呼吸引导 runBreath
     node.breath = {
       prompt: "深呼吸——长按吸气，松开呼气",
       cycles: 3,           // 完成几个呼吸循环
       inhaleMs: 4000,      // 吸气时长
       holdMs: 1000,        // 屏息时长
       exhaleMs: 6000,      // 呼气时长
       thresholds: [
         { min: 0.8, tag: "calm", label, text, add?, memory?, next },
         { min: 0.5, tag: "ok", label, text, next }
       ],
       fallback: { tag: "miss", next }
     }
     ============================================================ */
  function runBreath(br, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "breath-layer";
    layer.id = "breath-layer";
    layer.innerHTML = `
      <div class="br-prompt">${br.prompt || "深呼吸——"}</div>
      <div class="br-stage" id="br-stage">
        <div class="br-circle" id="br-circle"></div>
        <div class="br-text" id="br-text">准备</div>
      </div>
      <div class="br-info" id="br-info">长按圆形区域吸气，松开呼气</div>
      <div class="br-progress" id="br-progress"></div>
      <div class="br-actions">
        <button class="br-start" id="br-start">开始</button>
      </div>
    `;
    const circle = layer.querySelector("#br-circle");
    const textEl = layer.querySelector("#br-text");
    const info = layer.querySelector("#br-info");
    const progress = layer.querySelector("#br-progress");
    const startBtn = layer.querySelector("#br-start");

    const totalCycles = br.cycles || 3;
    const inhaleMs = br.inhaleMs || 4000;
    const holdMs = br.holdMs || 1000;
    const exhaleMs = br.exhaleMs || 6000;
    let currentCycle = 0;
    let phase = "idle"; // idle / inhale / hold / exhale / done
    let phaseStartTime = 0;
    let pressStartTime = 0;
    let syncSum = 0;
    let syncCount = 0;
    let started = false;
    let rafId = null;
    let aborted = false;

    // 渲染进度点
    for (let i = 0; i < totalCycles; i++) {
      const dot = document.createElement("span");
      dot.className = "br-dot";
      progress.appendChild(dot);
    }

    function updateProgress() {
      const dots = progress.querySelectorAll(".br-dot");
      dots.forEach((d, i) => {
        d.classList.toggle("done", i < currentCycle);
      });
    }

    function setCircle(scale, color) {
      circle.style.transform = `scale(${scale})`;
      circle.style.background = color;
    }

    function startInhale() {
      phase = "inhale";
      phaseStartTime = performance.now();
      textEl.textContent = "吸——";
      info.textContent = `第 ${currentCycle + 1} / ${totalCycles} 次 · 吸气`;
      setCircle(1.0, "radial-gradient(circle, rgba(180,220,255,0.6), rgba(120,160,220,0.4))");
      // 用动画过渡
      circle.style.transition = `transform ${inhaleMs}ms ease-in-out, background ${inhaleMs}ms ease`;
    }

    function startHold() {
      phase = "hold";
      phaseStartTime = performance.now();
      textEl.textContent = "屏息";
      info.textContent = `第 ${currentCycle + 1} / ${totalCycles} 次 · 屏息`;
      setCircle(1.0, "radial-gradient(circle, rgba(255,255,200,0.6), rgba(220,200,120,0.4))");
      circle.style.transition = "transform 0.3s ease, background 0.3s ease";
    }

    function startExhale() {
      phase = "exhale";
      phaseStartTime = performance.now();
      textEl.textContent = "呼——";
      info.textContent = `第 ${currentCycle + 1} / ${totalCycles} 次 · 呼气`;
      setCircle(0.4, "radial-gradient(circle, rgba(255,180,200,0.5), rgba(216,112,144,0.3))");
      circle.style.transition = `transform ${exhaleMs}ms ease-in-out, background ${exhaleMs}ms ease`;
    }

    function nextPhase() {
      if (phase === "inhale") {
        startHold();
      } else if (phase === "hold") {
        startExhale();
      } else if (phase === "exhale") {
        currentCycle++;
        updateProgress();
        if (currentCycle >= totalCycles) {
          finishBreath();
          return;
        }
        startInhale();
      }
    }

    function finishBreath() {
      if (phase === "done") return;
      phase = "done";
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      const avgSync = syncCount ? syncSum / syncCount : 0;
      const thresholds = br.thresholds || [];
      let matched = br.fallback || { tag: "miss", label: "——乱息", next: null };
      for (const t of thresholds) {
        if (avgSync >= t.min) { matched = t; break; }
      }
      Saves.saveBreathRecord(currentNodeId, currentCycle, avgSync, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "br-reading";
      reading.innerHTML = `<div class="br-reading-title">${matched.label || "解读"} · ${Math.round(avgSync * 100)}%</div>
        <div class="br-reading-text">${matched.text || ""}</div>
        <button class="br-reading-close">继续</button>`;
      reading.querySelector(".br-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    }

    // 主循环：用 requestAnimationFrame 推进阶段
    function loop() {
      if (aborted || phase === "idle" || phase === "done") return;
      const now = performance.now();
      const elapsed = now - phaseStartTime;
      if (phase === "inhale" && elapsed >= inhaleMs) {
        nextPhase();
      } else if (phase === "hold" && elapsed >= holdMs) {
        nextPhase();
      } else if (phase === "exhale" && elapsed >= exhaleMs) {
        nextPhase();
      }
      if (!aborted && phase !== "idle" && phase !== "done") {
        rafId = requestAnimationFrame(loop);
      }
    }

    // 玩家长按：判定同步度
    function onPressDown(e) {
      if (!started || phase === "done" || phase === "idle") return;
      e.preventDefault();
      pressStartTime = performance.now();
      // 只有吸气阶段长按才算同步
      if (phase === "inhale") {
        const idealStart = phaseStartTime;
        const diff = Math.abs(pressStartTime - idealStart);
        const sync = Math.max(0, 1 - diff / inhaleMs);
        syncSum += sync;
        syncCount++;
      }
    }
    function onPressUp() {
      if (!started || phase === "done") return;
      if (phase === "exhale") {
        const releaseTime = performance.now();
        const idealEnd = phaseStartTime + exhaleMs;
        const diff = Math.abs(releaseTime - idealEnd);
        const sync = Math.max(0, 1 - diff / exhaleMs);
        syncSum += sync;
        syncCount++;
      }
    }

    circle.addEventListener("mousedown", onPressDown);
    circle.addEventListener("mouseup", onPressUp);
    circle.addEventListener("touchstart", onPressDown, { passive: false });
    circle.addEventListener("touchend", onPressUp);

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startBtn.disabled = true;
      startInhale();
      rafId = requestAnimationFrame(loop);
    };

    // layer 被外部移除时取消 rAF，避免 backToTitle 后空转
    const cleanup = () => {
      aborted = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      circle.removeEventListener("mousedown", onPressDown);
      circle.removeEventListener("mouseup", onPressUp);
      circle.removeEventListener("touchstart", onPressDown);
      circle.removeEventListener("touchend", onPressUp);
    };
    // MutationObserver 监听 layer 被移除
    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        cleanup();
        mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

  /* ============================================================
     v1.0.0 时光胶囊 runTimecapsule
     node.timecapsule = {
       prompt: "给未来的自己写一句话——",
       placeholder: "（最多 60 字）",
       maxLength: 60,
       deliverAt: "d5_evening",   // 投递到的未来节点 id
       onSubmit: { tag, label, text, add?, memory?, next }   // 写完的反馈
     }
     ============================================================ */
  function runTimecapsule(tc, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "timecapsule-layer";
    layer.id = "timecapsule-layer";
    const maxLen = tc.maxLength || 60;
    layer.innerHTML = `
      <div class="tc-prompt">${tc.prompt || "给未来的自己写一句话——"}</div>
      <div class="tc-wrap">
        <textarea class="tc-input" id="tc-input" maxlength="${maxLen}" placeholder="${tc.placeholder || '写点什么……'}"></textarea>
        <div class="tc-count"><span id="tc-count">0</span> / ${maxLen}</div>
      </div>
      <div class="tc-actions">
        <button class="tc-skip">跳过</button>
        <button class="tc-submit" id="tc-submit" disabled>封存</button>
      </div>
    `;
    const input = layer.querySelector("#tc-input");
    const count = layer.querySelector("#tc-count");
    const submitBtn = layer.querySelector("#tc-submit");
    const skipBtn = layer.querySelector(".tc-skip");

    input.addEventListener("input", () => {
      count.textContent = input.value.length;
      submitBtn.disabled = input.value.trim().length === 0;
    });

    function finish(submitted) {
      const message = input.value.trim();
      const tag = submitted ? (tc.onSubmit && tc.onSubmit.tag || "written") : "skipped";
      Saves.saveTimecapsuleRecord(currentNodeId, message, tc.deliverAt || null, tag);
      const feedback = submitted ? (tc.onSubmit || {}) : (tc.onSkip || { tag: "skipped", label: "——没写", text: "你没写。也许以后再写。", next: null });
      if (feedback.add) { applyAdd(feedback.add); updateHeartBar(); }
      if (feedback.personality) {
        for (const dim in feedback.personality) Saves.addPersonality(dim, feedback.personality[dim]);
      }
      if (feedback.memory) {
        if (!Saves.isMemoryUnlocked(feedback.memory.id)) {
          Saves.saveMemory(feedback.memory.id, feedback.memory.text);
          flashHint(`✦ 新记忆：${feedback.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "tc-reading";
      reading.innerHTML = `<div class="tc-reading-title">${feedback.label || "——封存"}</div>
        <div class="tc-reading-text">${feedback.text || ""}</div>
        <button class="tc-reading-close">继续</button>`;
      reading.querySelector(".tc-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = feedback.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    }

    submitBtn.onclick = () => { if (input.value.trim()) finish(true); };
    skipBtn.onclick = () => finish(false);

    document.getElementById("game").appendChild(layer);
    setTimeout(() => input.focus(), 100);
  }

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
     v1.0.0 信纸折痕 runFold
     node.fold = {
       prompt: "按顺序折叠信纸——",
       folds: [ { id, label, desc } ],
       interpretations: [
         { order: ["a","b","c"], tag, label, text, add?, memory?, next }
       ],
       min: 2,
       fallback: { tag: "default", next }
     }
     ============================================================ */
  function runFold(fd, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "fold-layer";
    layer.id = "fold-layer";
    layer.innerHTML = `
      <div class="fd-prompt">${fd.prompt || "按顺序折叠信纸——"}</div>
      <div class="fd-paper" id="fd-paper">
        <div class="fd-paper-text">樱·时·信·笺</div>
      </div>
      <div class="fd-actions" id="fd-actions"></div>
      <div class="fd-controls">
        <button class="fd-reset">重置</button>
        <button class="fd-confirm" disabled>解读折痕</button>
      </div>
    `;
    const paper = layer.querySelector("#fd-paper");
    const actionsEl = layer.querySelector("#fd-actions");
    const confirmBtn = layer.querySelector(".fd-confirm");
    const resetBtn = layer.querySelector(".fd-reset");

    const folds = fd.folds || [];
    const sequence = [];

    folds.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "fd-action";
      btn.dataset.id = f.id;
      btn.innerHTML = `<div class="fd-action-label">${f.label}</div>
        <div class="fd-action-desc">${f.desc || ""}</div>`;
      btn.onclick = () => {
        if (btn.classList.contains("used")) return;
        btn.classList.add("used");
        sequence.push(f.id);
        // 累加折痕视觉
        const crease = document.createElement("div");
        crease.className = `fd-crease fd-crease-${sequence.length}`;
        paper.appendChild(crease);
        paper.classList.add(`fold-step-${sequence.length}`);
        confirmBtn.disabled = sequence.length < Math.min(fd.min || 2, folds.length);
      };
      actionsEl.appendChild(btn);
    });

    resetBtn.onclick = () => {
      sequence.length = 0;
      paper.className = "fd-paper";
      paper.querySelectorAll(".fd-crease").forEach(c => c.remove());
      actionsEl.querySelectorAll(".fd-action.used").forEach(b => b.classList.remove("used"));
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const interp = matchFold(fd, sequence);
      Saves.saveFoldRecord(currentNodeId, sequence.slice(), interp.tag);
      if (interp.add) { applyAdd(interp.add); updateHeartBar(); }
      if (interp.personality) {
        for (const dim in interp.personality) Saves.addPersonality(dim, interp.personality[dim]);
      }
      if (interp.memory) {
        if (!Saves.isMemoryUnlocked(interp.memory.id)) {
          Saves.saveMemory(interp.memory.id, interp.memory.text);
          flashHint(`✦ 新记忆：${interp.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "fd-reading";
      reading.innerHTML = `<div class="fd-reading-title">${interp.label || "解读"}</div>
        <div class="fd-reading-text">${interp.text || ""}</div>
        <button class="fd-reading-close">继续</button>`;
      reading.querySelector(".fd-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = interp.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  function matchFold(fd, seq) {
    const interps = fd.interpretations || [];
    for (const i of interps) {
      if (i.order && i.order.length === seq.length && i.order.every((id, idx) => id === seq[idx])) {
        return i;
      }
    }
    for (const i of interps) {
      if (i.order && i.order.length === seq.length && i.order.every(id => seq.includes(id))) {
        return i;
      }
    }
    return fd.fallback || { tag: "default", label: "——折不成形", next: null };
  }

  /* ============================================================
     v1.0.0 倒影对齐 runReflection
     node.reflection = {
       prompt: "拖动下半，让倒影与上半对齐——",
       upper: "樱花飘落",       // 上半画面文案
       lower: "倒影模糊",       // 下半初始文案
       // 玩家拖动下半左右滑动；越接近中心对齐度越高
       thresholds: [
         { min: 0.9, tag: "aligned", label, text, add?, memory?, next },
         { min: 0.6, tag: "close", label, text, next }
       ],
       fallback: { tag: "miss", next }
     }
     ============================================================ */
  function runReflection(rf, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "reflection-layer";
    layer.id = "reflection-layer";
    layer.innerHTML = `
      <div class="rf-prompt">${rf.prompt || "拖动下半，让倒影与上半对齐——"}</div>
      <div class="rf-stage" id="rf-stage">
        <div class="rf-upper" id="rf-upper">${rf.upper || ""}</div>
        <div class="rf-water"></div>
        <div class="rf-lower" id="rf-lower">${rf.lower || ""}</div>
      </div>
      <div class="rf-info" id="rf-info">拖动下半调整位置</div>
      <div class="rf-actions">
        <button class="rf-confirm" id="rf-confirm">确定对齐</button>
      </div>
    `;
    const lower = layer.querySelector("#rf-lower");
    const info = layer.querySelector("#rf-info");
    const confirmBtn = layer.querySelector("#rf-confirm");

    let offsetX = 0;  // 像素
    let dragging = false;
    let dragStartX = 0;
    let startOffset = 0;
    const maxOffset = 120; // 最大偏移像素

    function updateInfo() {
      const ratio = 1 - Math.min(1, Math.abs(offsetX) / maxOffset);
      info.textContent = `对齐度：${Math.round(ratio * 100)}%`;
      info.dataset.ratio = ratio.toFixed(3);
    }

    function onDown(clientX) {
      dragging = true;
      dragStartX = clientX;
      startOffset = offsetX;
    }
    function onMove(clientX) {
      if (!dragging) return;
      let next = startOffset + (clientX - dragStartX);
      next = Math.max(-maxOffset, Math.min(maxOffset, next));
      offsetX = next;
      lower.style.transform = `translateX(${offsetX}px)`;
      updateInfo();
    }
    function onUp() { dragging = false; }

    const onMouseDown = e => onDown(e.clientX);
    const onMouseMove = e => onMove(e.clientX);
    const onMouseUp = () => onUp();
    const onTouchStart = e => { const t = e.touches[0]; onDown(t.clientX); e.preventDefault(); };
    const onTouchMove = e => { if (!dragging) return; const t = e.touches[0]; onMove(t.clientX); e.preventDefault(); };
    const onTouchEnd = () => onUp();

    lower.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    lower.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    // layer 移除时清理 document 上的监听，避免泄漏
    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
        mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    // 初始偏移到一边
    offsetX = maxOffset * 0.7;
    lower.style.transform = `translateX(${offsetX}px)`;
    updateInfo();

    confirmBtn.onclick = () => {
      const ratio = 1 - Math.min(1, Math.abs(offsetX) / maxOffset);
      const accuracy = ratio;
      const thresholds = rf.thresholds || [];
      let matched = rf.fallback || { tag: "miss", label: "——错位", next: null };
      for (const t of thresholds) {
        if (accuracy >= t.min) { matched = t; break; }
      }
      Saves.saveReflectionRecord(currentNodeId, offsetX, accuracy, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "rf-reading";
      reading.innerHTML = `<div class="rf-reading-title">${matched.label || "解读"} · ${Math.round(accuracy * 100)}%</div>
        <div class="rf-reading-text">${matched.text || ""}</div>
        <button class="rf-reading-close">继续</button>`;
      reading.querySelector(".rf-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
  }

  /* ============================================================
     v1.1.0 光影描绘 runLightdraw
     node.lightdraw = {
       prompt: "用光点亮窗台上的东西——",
       targets: [
         { id, x, y, r, label, desc?, memory? }   // x/y/r 为百分比
       ],
       min: 2,  // 最少点亮数
       thresholds: [
         { min: 0.8, tag, label, text, add?, memory?, next },
         { min: 0.4, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */
  function runLightdraw(ld, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "lightdraw-layer";
    layer.id = "lightdraw-layer";
    const targets = ld.targets || [];
    layer.innerHTML = `
      <div class="ld-prompt">${ld.prompt || "用光拖过黑暗——"}</div>
      <div class="ld-stage" id="ld-stage">
        <canvas class="ld-canvas" id="ld-canvas"></canvas>
        ${targets.map((t, i) => `<div class="ld-target" data-id="${t.id}" data-idx="${i}" style="left:${t.x}%;top:${t.y}%;width:${(t.r||4)*2}%;height:${(t.r||4)*2}%;">
          <div class="ld-target-core"></div>
          <div class="ld-target-label">${t.label || ""}</div>
        </div>`).join("")}
      </div>
      <div class="ld-info" id="ld-info">已点亮 <span id="ld-count">0</span> / ${targets.length}</div>
      <div class="ld-actions">
        <button class="ld-reset">重置</button>
        <button class="ld-confirm" id="ld-confirm" disabled>收光</button>
      </div>
    `;
    const stage = layer.querySelector("#ld-stage");
    const canvas = layer.querySelector("#ld-canvas");
    const ctx = canvas.getContext("2d");
    const countEl = layer.querySelector("#ld-count");
    const infoEl = layer.querySelector("#ld-info");
    const confirmBtn = layer.querySelector(".ld-confirm");
    const resetBtn = layer.querySelector(".ld-reset");

    const litSet = new Set();
    let drawing = false;
    let lastX = 0, lastY = 0;
    let strokes = []; // {x, y}[] 列表的列表
    let currentStroke = null;
    let aborted = false;
    let mo = null;

    function resize() {
      const rect = stage.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      redraw();
    }
    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 光路：用淡金色叠加
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(8, canvas.width * 0.025);
      ctx.strokeStyle = "rgba(255,220,140,0.5)";
      ctx.shadowBlur = 24;
      ctx.shadowColor = "rgba(255,200,120,0.7)";
      strokes.forEach(s => {
        if (s.length < 2) {
          if (s.length === 1) {
            ctx.beginPath();
            ctx.arc(s[0].x, s[0].y, ctx.lineWidth/2, 0, Math.PI*2);
            ctx.fillStyle = "rgba(255,220,140,0.5)";
            ctx.fill();
          }
          return;
        }
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    function checkTargets() {
      const stageRect = stage.getBoundingClientRect();
      targets.forEach((t, i) => {
        if (litSet.has(t.id)) return;
        const tx = (t.x / 100) * stageRect.width;
        const ty = (t.y / 100) * stageRect.height;
        const tr = ((t.r || 4) / 100) * Math.max(stageRect.width, stageRect.height);
        // 检查任何 stroke 点是否落在目标半径内
        for (const s of strokes) {
          for (const p of s) {
            const dx = p.x - tx, dy = p.y - ty;
            if (dx*dx + dy*dy <= tr*tr) {
              litSet.add(t.id);
              const el = stage.querySelector(`.ld-target[data-idx="${i}"]`);
              if (el) el.classList.add("lit");
              if (t.memory && !Saves.isMemoryUnlocked(t.memory.id)) {
                Saves.saveMemory(t.memory.id, t.memory.text);
                flashHint(`✦ 新记忆：${t.memory.title || t.id}`);
              }
              break;
            }
          }
          if (litSet.has(t.id)) break;
        }
      });
      countEl.textContent = litSet.size;
      infoEl.textContent = `已点亮 ${litSet.size} / ${targets.length}`;
      confirmBtn.disabled = litSet.size < Math.min(ld.min || 1, targets.length);
    }

    function getPos(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onDown(clientX, clientY) {
      drawing = true;
      currentStroke = [];
      const p = getPos(clientX, clientY);
      currentStroke.push(p);
      strokes.push(currentStroke);
      redraw();
      checkTargets();
    }
    function onMove(clientX, clientY) {
      if (!drawing) return;
      const p = getPos(clientX, clientY);
      // 简化：距离过近不加
      const last = currentStroke[currentStroke.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
      currentStroke.push(p);
      redraw();
      checkTargets();
    }
    function onUp() {
      drawing = false;
      currentStroke = null;
    }

    const onMouseDown = e => { e.preventDefault(); onDown(e.clientX, e.clientY); };
    const onMouseMove = e => onMove(e.clientX, e.clientY);
    const onMouseUp = () => onUp();
    const onTouchStart = e => { const t = e.touches[0]; onDown(t.clientX, t.clientY); e.preventDefault(); };
    const onTouchMove = e => { if (!drawing) return; const t = e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); };
    const onTouchEnd = () => onUp();

    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    resetBtn.onclick = () => {
      strokes = [];
      litSet.clear();
      stage.querySelectorAll(".ld-target.lit").forEach(el => el.classList.remove("lit"));
      countEl.textContent = "0";
      infoEl.textContent = `已点亮 0 / ${targets.length}`;
      confirmBtn.disabled = true;
      redraw();
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const coverage = targets.length ? litSet.size / targets.length : 0;
      const thresholds = ld.thresholds || [];
      let matched = ld.fallback || { tag: "miss", label: "——暗着", next: null };
      for (const t of thresholds) {
        if (coverage >= t.min) { matched = t; break; }
      }
      Saves.saveLightdrawRecord(currentNodeId, Array.from(litSet), coverage, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "ld-reading";
      reading.innerHTML = `<div class="ld-reading-title">${matched.label || "解读"} · ${Math.round(coverage * 100)}%</div>
        <div class="ld-reading-text">${matched.text || ""}</div>
        <button class="ld-reading-close">继续</button>`;
      reading.querySelector(".ld-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    // layer 移除时清理 document 监听 + ResizeObserver
    mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    // ResizeObserver 监听 stage 尺寸变化
    const ro = new ResizeObserver(() => { if (!aborted) resize(); });
    ro.observe(stage);
    resize();
  }

  /* ============================================================
     v1.1.0 声音模仿 runMimic
     node.mimic = {
       prompt: "学她刚才说话的语气——",
       target: { pitch: 0.6, tempo: 0.4 },   // 0~1 目标值
       tolerance: 0.15,                      // 容差
       thresholds: [
         { min: 0.8, tag, label, text, add?, memory?, next },
         { min: 0.5, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */
  function runMimic(mm, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "mimic-layer";
    layer.id = "mimic-layer";
    const tgt = mm.target || { pitch: 0.5, tempo: 0.5 };
    layer.innerHTML = `
      <div class="mm-prompt">${mm.prompt || "学她刚才说话的语气——"}</div>
      <div class="mm-target">目标 · 音调 <span id="mm-tgt-pitch">${Math.round(tgt.pitch*100)}</span> · 语速 <span id="mm-tgt-tempo">${Math.round(tgt.tempo*100)}</span></div>
      <div class="mm-wave" id="mm-wave"></div>
      <div class="mm-controls">
        <div class="mm-row">
          <label>音调</label>
          <input type="range" id="mm-pitch" min="0" max="1" step="0.01" value="0.5">
          <span id="mm-pitch-val">50</span>
        </div>
        <div class="mm-row">
          <label>语速</label>
          <input type="range" id="mm-tempo" min="0" max="1" step="0.01" value="0.5">
          <span id="mm-tempo-val">50</span>
        </div>
      </div>
      <div class="mm-info" id="mm-info">差异：——</div>
      <div class="mm-actions">
        <button class="mm-confirm" id="mm-confirm">就这样</button>
      </div>
    `;
    const pitchEl = layer.querySelector("#mm-pitch");
    const tempoEl = layer.querySelector("#mm-tempo");
    const pitchVal = layer.querySelector("#mm-pitch-val");
    const tempoVal = layer.querySelector("#mm-tempo-val");
    const info = layer.querySelector("#mm-info");
    const confirmBtn = layer.querySelector("#mm-confirm");
    const wave = layer.querySelector("#mm-wave");

    function update() {
      const p = parseFloat(pitchEl.value);
      const t = parseFloat(tempoEl.value);
      pitchVal.textContent = Math.round(p * 100);
      tempoVal.textContent = Math.round(t * 100);
      const diff = (Math.abs(p - tgt.pitch) + Math.abs(t - tgt.tempo)) / 2;
      const score = Math.max(0, 1 - diff);
      info.textContent = `差异：${Math.round(diff * 100)}% · 相似度：${Math.round(score * 100)}%`;
      // 波形：根据 pitch 调整振幅，tempo 调整频率
      const freq = 4 + t * 8;
      const amp = 20 + p * 30;
      let path = "M0,40 ";
      for (let x = 0; x <= 200; x += 2) {
        const y = 40 + Math.sin((x / 200) * Math.PI * 2 * freq) * amp * 0.5;
        path += `L${x},${y.toFixed(1)} `;
      }
      wave.innerHTML = `<svg viewBox="0 0 200 80" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="#ffb8c8" stroke-width="2"/></svg>`;
    }
    pitchEl.addEventListener("input", update);
    tempoEl.addEventListener("input", update);

    confirmBtn.onclick = () => {
      const p = parseFloat(pitchEl.value);
      const t = parseFloat(tempoEl.value);
      const diff = (Math.abs(p - tgt.pitch) + Math.abs(t - tgt.tempo)) / 2;
      const score = Math.max(0, 1 - diff);
      const thresholds = mm.thresholds || [];
      let matched = mm.fallback || { tag: "miss", label: "——不像", next: null };
      for (const th of thresholds) {
        if (score >= th.min) { matched = th; break; }
      }
      Saves.saveMimicRecord(currentNodeId, p, t, diff, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "mm-reading";
      reading.innerHTML = `<div class="mm-reading-title">${matched.label || "解读"} · 相似度 ${Math.round(score * 100)}%</div>
        <div class="mm-reading-text">${matched.text || ""}</div>
        <button class="mm-reading-close">继续</button>`;
      reading.querySelector(".mm-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
    update();
  }

  /* ============================================================
     v1.1.0 季节切换 runSeason
     node.season = {
       prompt: "滑动切换四季——",
       seasons: ["spring","summer","autumn","winter"],
       target: "autumn",   // 正确季节
       clue: "秋天的落叶里有她夹的字条",
       thresholds: [
         { isTarget: true, tag, label, text, add?, memory?, next },
         { isTarget: false, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */
  function runSeason(sn, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "season-layer";
    layer.id = "season-layer";
    const seasons = sn.seasons || ["spring","summer","autumn","winter"];
    const target = sn.target;
    const seasonLabels = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
    layer.innerHTML = `
      <div class="sn-prompt">${sn.prompt || "滑动切换四季——"}</div>
      <div class="sn-stage" id="sn-stage">
        <div class="sn-scene" id="sn-scene"></div>
        <div class="sn-clue" id="sn-clue"></div>
      </div>
      <div class="sn-slider-wrap">
        <input type="range" id="sn-slider" min="0" max="${seasons.length - 1}" step="1" value="0">
        <div class="sn-labels">${seasons.map((s,i) => `<span data-i="${i}">${seasonLabels[s]||s}</span>`).join("")}</div>
      </div>
      <div class="sn-info" id="sn-info">当前：春</div>
      <div class="sn-actions">
        <button class="sn-confirm" id="sn-confirm">就选这个季节</button>
      </div>
    `;
    const slider = layer.querySelector("#sn-slider");
    const sceneEl = layer.querySelector("#sn-scene");
    const clueEl = layer.querySelector("#sn-clue");
    const info = layer.querySelector("#sn-info");
    const confirmBtn = layer.querySelector("#sn-confirm");

    function renderSeason(idx) {
      const s = seasons[idx];
      sceneEl.className = "sn-scene sn-" + s;
      let sceneHtml = "";
      if (s === "spring") sceneHtml = `<div class="sn-cherry"></div>`;
      else if (s === "summer") sceneHtml = `<div class="sn-sun"></div>`;
      else if (s === "autumn") sceneHtml = `<div class="sn-leaf"></div>`;
      else if (s === "winter") sceneHtml = `<div class="sn-snow"></div>`;
      sceneEl.innerHTML = sceneHtml;
      if (s === target) {
        clueEl.textContent = sn.clue || "";
        clueEl.classList.add("show");
      } else {
        clueEl.textContent = "";
        clueEl.classList.remove("show");
      }
      info.textContent = `当前：${seasonLabels[s] || s}`;
    }
    slider.addEventListener("input", () => renderSeason(parseInt(slider.value)));

    confirmBtn.onclick = () => {
      const idx = parseInt(slider.value);
      const chosen = seasons[idx];
      const isTarget = chosen === target;
      const thresholds = sn.thresholds || [];
      let matched = sn.fallback || { tag: "miss", label: "——选错了", next: null };
      for (const t of thresholds) {
        if (t.isTarget === isTarget) { matched = t; break; }
      }
      Saves.saveSeasonRecord(currentNodeId, chosen, isTarget, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "sn-reading";
      reading.innerHTML = `<div class="sn-reading-title">${matched.label || "解读"}</div>
        <div class="sn-reading-text">${matched.text || ""}</div>
        <button class="sn-reading-close">继续</button>`;
      reading.querySelector(".sn-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
    renderSeason(0);
  }

  /* ============================================================
     v1.1.0 脉搏同步 runPulse
     node.pulse = {
       prompt: "让你的心跳跟上她——",
       bpm: 72,
       beats: 8,
       tolerance: 0.18,   // 容差（占一拍比例）
       thresholds: [
         { min: 0.8, tag, label, text, add?, memory?, next },
         { min: 0.5, tag, label, text, next }
       ],
       fallback: { tag, next }
     }
     ============================================================ */
  function runPulse(pl, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "pulse-layer";
    layer.id = "pulse-layer";
    layer.innerHTML = `
      <div class="pl-prompt">${pl.prompt || "让你的心跳跟上她——"}</div>
      <div class="pl-stage">
        <canvas class="pl-canvas" id="pl-canvas"></canvas>
        <div class="pl-info" id="pl-info">点击节奏与对方心跳对齐 · 0 / ${pl.beats || 8}</div>
      </div>
      <div class="pl-actions">
        <button class="pl-start" id="pl-start">开始</button>
      </div>
    `;
    const canvas = layer.querySelector("#pl-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#pl-info");
    const startBtn = layer.querySelector("#pl-start");

    const bpm = pl.bpm || 72;
    const totalBeats = pl.beats || 8;
    const tolerance = pl.tolerance || 0.2;
    const beatMs = 60000 / bpm;
    let hits = 0;
    let hitWindow = 0;
    let beatCount = 0;
    let started = false;
    let startTime = 0;
    let rafId = null;
    let aborted = false;
    let mo = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
    }
    const ro = new ResizeObserver(() => { if (!aborted) resize(); });

    // 对方心跳：固定 BPM；玩家心跳：按点击节奏插值
    let playerBeats = []; // {time, hit}

    function draw(now) {
      if (aborted) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 中线
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

      const elapsed = now - startTime;
      const scrollPx = (elapsed / 2000) * w; // 2秒一屏滚动

      // 对方波形（上半）
      ctx.strokeStyle = "#f0b878";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = (x + scrollPx) / w; // 屏内时间比例
        const beatPhase = (t * 2) % 1; // 一拍周期
        let y = h * 0.25;
        // 模拟心跳脉冲：尖峰
        const peak = Math.exp(-Math.pow((beatPhase - 0.2) / 0.05, 2)) * 30;
        y -= peak;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 玩家波形（下半）
      ctx.strokeStyle = "#a8c5e8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = (x + scrollPx) / w;
        // 用玩家点击节拍构造波形
        const beatPhase = ((t * 2) % 1);
        let y = h * 0.75;
        // 玩家点击：找最近一次 beat
        const realTime = elapsed - (w - x) * (2000 / w);
        let nearest = null, nearestDist = Infinity;
        for (const pb of playerBeats) {
          const d = Math.abs(pb.time - realTime);
          if (d < nearestDist) { nearestDist = d; nearest = pb; }
        }
        if (nearest && nearestDist < beatMs * 0.5) {
          const phase = nearestDist / (beatMs * 0.5);
          y -= Math.exp(-Math.pow(phase / 0.3, 2)) * 25;
        }
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 命中窗口指示（中线中心）
      const centerX = w * 0.5;
      const beatPhase = ((elapsed / beatMs) % 1);
      ctx.fillStyle = beatPhase < tolerance || beatPhase > (1 - tolerance)
        ? "rgba(255,220,140,0.4)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(centerX - 4, 0, 8, h);

      // 推进节拍计数
      const totalElapsedBeats = Math.floor(elapsed / beatMs);
      while (beatCount < totalElapsedBeats && beatCount < totalBeats) {
        beatCount++;
        info.textContent = `点击节奏与对方心跳对齐 · ${hits} / ${totalBeats}（第 ${beatCount} 拍）`;
      }
      if (beatCount >= totalBeats) {
        finishPulse();
        return;
      }
      rafId = requestAnimationFrame(draw);
    }

    function onTap() {
      if (!started || aborted) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const phase = (elapsed % beatMs) / beatMs;
      // 距离最近拍点的相位差
      const diff = Math.min(phase, 1 - phase);
      const ok = diff <= tolerance;
      playerBeats.push({ time: elapsed, hit: ok });
      if (ok) {
        hits++;
        flashHint("✓");
      } else {
        flashHint("✗");
      }
      info.textContent = `点击节奏与对方心跳对齐 · ${hits} / ${totalBeats}（第 ${beatCount + 1} 拍）`;
    }

    function finishPulse() {
      if (aborted) return;
      aborted = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      const accuracy = totalBeats ? hits / totalBeats : 0;
      const thresholds = pl.thresholds || [];
      let matched = pl.fallback || { tag: "miss", label: "——没跟上", next: null };
      for (const t of thresholds) {
        if (accuracy >= t.min) { matched = t; break; }
      }
      Saves.savePulseRecord(currentNodeId, hits, totalBeats, accuracy, matched.tag);
      if (matched.add) { applyAdd(matched.add); updateHeartBar(); }
      if (matched.personality) {
        for (const dim in matched.personality) Saves.addPersonality(dim, matched.personality[dim]);
      }
      if (matched.memory) {
        if (!Saves.isMemoryUnlocked(matched.memory.id)) {
          Saves.saveMemory(matched.memory.id, matched.memory.text);
          flashHint(`✦ 新记忆：${matched.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "pl-reading";
      reading.innerHTML = `<div class="pl-reading-title">${matched.label || "解读"} · ${Math.round(accuracy * 100)}%</div>
        <div class="pl-reading-text">${matched.text || ""}</div>
        <button class="pl-reading-close">继续</button>`;
      reading.querySelector(".pl-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    }

    canvas.addEventListener("click", onTap);
    canvas.addEventListener("touchstart", e => { onTap(); e.preventDefault(); }, { passive: false });
    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startBtn.disabled = true;
      startTime = performance.now();
      rafId = requestAnimationFrame(draw);
    };

    // 清理
    mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    ro.observe(canvas);
    resize();
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
