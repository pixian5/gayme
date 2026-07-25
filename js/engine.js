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

    // v1.2.0 茶席品茗节点
    if (node.tea) {
      setScene(node.bg);
      renderCharacters(node);
      runTea(node.tea, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.2.0 星象观测节点
    if (node.astronomy) {
      setScene(node.bg);
      renderCharacters(node);
      runAstronomy(node.astronomy, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.2.0 颜料调配节点
    if (node.palette) {
      setScene(node.bg);
      renderCharacters(node);
      runPalette(node.palette, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.2.0 琴键演奏节点
    if (node.piano) {
      setScene(node.bg);
      renderCharacters(node);
      runPiano(node.piano, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.3.0 占星骰子节点
    if (node.dice) {
      setScene(node.bg);
      renderCharacters(node);
      runDice(node.dice, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.3.0 风向感知节点
    if (node.wind) {
      setScene(node.bg);
      renderCharacters(node);
      runWind(node.wind, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.3.0 梦境解码节点
    if (node.decode) {
      setScene(node.bg);
      renderCharacters(node);
      runDecode(node.decode, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.3.0 雨滴节奏节点
    if (node.rain) {
      setScene(node.bg);
      renderCharacters(node);
      runRain(node.rain, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.4.0 拓印节点
    if (node.rubbing) {
      setScene(node.bg);
      renderCharacters(node);
      runRubbing(node.rubbing, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.4.0 集字节点
    if (node.collect) {
      setScene(node.bg);
      renderCharacters(node);
      runCollect(node.collect, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.4.0 光影对焦节点
    if (node.focus) {
      setScene(node.bg);
      renderCharacters(node);
      runFocus(node.focus, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.4.0 气味记忆节点
    if (node.scentmem) {
      setScene(node.bg);
      renderCharacters(node);
      runScentmem(node.scentmem, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.5.0 茶渍占卜节点
    if (node.tealeaf) {
      setScene(node.bg);
      renderCharacters(node);
      runTealeaf(node.tealeaf, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.5.0 影子对齐节点
    if (node.shadow) {
      setScene(node.bg);
      renderCharacters(node);
      runShadow(node.shadow, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.5.0 烛火守护节点
    if (node.candle) {
      setScene(node.bg);
      renderCharacters(node);
      runCandle(node.candle, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.5.0 电话拨号节点
    if (node.dial) {
      setScene(node.bg);
      renderCharacters(node);
      runDial(node.dial, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.6.0 雾窗描绘节点
    if (node.foggy) {
      setScene(node.bg);
      renderCharacters(node);
      runFoggy(node.foggy, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.6.0 糖块拼图节点
    if (node.sugar) {
      setScene(node.bg);
      renderCharacters(node);
      runSugar(node.sugar, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.6.0 钟调共振节点
    if (node.chime) {
      setScene(node.bg);
      renderCharacters(node);
      runChime(node.chime, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.6.0 沙漏计时节点
    if (node.hourglass) {
      setScene(node.bg);
      renderCharacters(node);
      runHourglass(node.hourglass, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.7.0 风筝引线节点
    if (node.kite) {
      setScene(node.bg);
      renderCharacters(node);
      runKite(node.kite, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.7.0 密码锁节点
    if (node.lock) {
      setScene(node.bg);
      renderCharacters(node);
      runLock(node.lock, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.7.0 折纸造型节点
    if (node.origami) {
      setScene(node.bg);
      renderCharacters(node);
      runOrigami(node.origami, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.7.0 星轨追踪节点
    if (node.orbit) {
      setScene(node.bg);
      renderCharacters(node);
      runOrbit(node.orbit, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.8.0 萤火引路节点
    if (node.firefly) {
      setScene(node.bg);
      renderCharacters(node);
      runFirefly(node.firefly, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.8.0 风铃调音节点
    if (node.windchime) {
      setScene(node.bg);
      renderCharacters(node);
      runWindchime(node.windchime, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.8.0 瓶中信节点
    if (node.bottle) {
      setScene(node.bg);
      renderCharacters(node);
      runBottle(node.bottle, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.8.0 回声定位节点
    if (node.echoloc) {
      setScene(node.bg);
      renderCharacters(node);
      runEcholoc(node.echoloc, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.9.0 罗盘导航节点
    if (node.compass) {
      setScene(node.bg);
      renderCharacters(node);
      runCompass(node.compass, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.9.0 密码电报节点
    if (node.telegraph) {
      setScene(node.bg);
      renderCharacters(node);
      runTelegraph(node.telegraph, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.9.0 天平称重节点
    if (node.balance) {
      setScene(node.bg);
      renderCharacters(node);
      runBalance(node.balance, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v1.9.0 钟摆节奏节点
    if (node.pendulum) {
      setScene(node.bg);
      renderCharacters(node);
      runPendulum(node.pendulum, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.0.0 节拍器同步节点
    if (node.metronome) {
      setScene(node.bg);
      renderCharacters(node);
      runMetronome(node.metronome, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.0.0 星图连线节点
    if (node.starchart) {
      setScene(node.bg);
      renderCharacters(node);
      runStarchart(node.starchart, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.0.0 透镜聚焦节点
    if (node.lens) {
      setScene(node.bg);
      renderCharacters(node);
      runLens(node.lens, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.0.0 弦音调音节点
    if (node.tuning) {
      setScene(node.bg);
      renderCharacters(node);
      runTuning(node.tuning, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.1.0 日蚀对位节点
    if (node.eclipse) {
      setScene(node.bg);
      renderCharacters(node);
      runEclipse(node.eclipse, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.1.0 印章对齐节点
    if (node.stamp) {
      setScene(node.bg);
      renderCharacters(node);
      runStamp(node.stamp, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.1.0 星盘仪节点
    if (node.astrolabe) {
      setScene(node.bg);
      renderCharacters(node);
      runAstrolabe(node.astrolabe, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.1.0 沙画凝形节点
    if (node.sandpaint) {
      setScene(node.bg);
      renderCharacters(node);
      runSandpaint(node.sandpaint, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.2.0 万花筒节点
    if (node.kaleido) {
      setScene(node.bg);
      renderCharacters(node);
      runKaleido(node.kaleido, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.2.0 算盘珠节点
    if (node.abacus) {
      setScene(node.bg);
      renderCharacters(node);
      runAbacus(node.abacus, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.2.0 齿轮咬合节点
    if (node.gear) {
      setScene(node.bg);
      renderCharacters(node);
      runGear(node.gear, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.2.0 等高线节点
    if (node.topo) {
      setScene(node.bg);
      renderCharacters(node);
      runTopo(node.topo, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.3.0 日晷对时节点
    if (node.sundial) {
      setScene(node.bg);
      renderCharacters(node);
      runSundial(node.sundial, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.3.0 染缸调色节点
    if (node.dye) {
      setScene(node.bg);
      renderCharacters(node);
      runDye(node.dye, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.3.0 风车叶片节点
    if (node.windmill) {
      setScene(node.bg);
      renderCharacters(node);
      runWindmill(node.windmill, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.3.0 经纬编织节点
    if (node.weave) {
      setScene(node.bg);
      renderCharacters(node);
      runWeave(node.weave, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.4.0 镜面对称节点
    if (node.mirror) {
      setScene(node.bg);
      renderCharacters(node);
      runMirror(node.mirror, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.4.0 灯笼排列节点
    if (node.lantern) {
      setScene(node.bg);
      renderCharacters(node);
      runLantern(node.lantern, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.4.0 水波纹节点
    if (node.ripple) {
      setScene(node.bg);
      renderCharacters(node);
      runRipple(node.ripple, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.4.0 马赛克拼图节点
    if (node.mosaic) {
      setScene(node.bg);
      renderCharacters(node);
      runMosaic(node.mosaic, nodeId);
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
  function runTea(t, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "tea-layer";
    layer.id = "tea-layer";
    const tgt = t.target || { temp: 0.5, amount: 0.5, time: 0.5 };
    layer.innerHTML = `
      <div class="tea-prompt">${t.prompt || "泡一壶茶——"}</div>
      <div class="tea-stage">
        <div class="tea-cup" id="tea-cup">
          <div class="tea-liquid" id="tea-liquid"></div>
          <div class="tea-steam" id="tea-steam"></div>
        </div>
        <div class="tea-target">目标 · 水温${Math.round(tgt.temp*100)} · 茶量${Math.round(tgt.amount*100)} · 时间${Math.round(tgt.time*100)}</div>
      </div>
      <div class="tea-controls">
        <div class="tea-row">
          <label>水温</label>
          <input type="range" id="tea-temp" min="0" max="1" step="0.01" value="0.5">
          <span id="tea-temp-val">50</span>
        </div>
        <div class="tea-row">
          <label>茶量</label>
          <input type="range" id="tea-amount" min="0" max="1" step="0.01" value="0.5">
          <span id="tea-amount-val">50</span>
        </div>
        <div class="tea-row">
          <label>浸泡</label>
          <input type="range" id="tea-time" min="0" max="1" step="0.01" value="0.5">
          <span id="tea-time-val">50</span>
        </div>
      </div>
      <div class="tea-info" id="tea-info">相似度：——</div>
      <div class="tea-actions">
        <button class="tea-confirm" id="tea-confirm">奉茶</button>
      </div>
    `;
    const tempEl = layer.querySelector("#tea-temp");
    const amountEl = layer.querySelector("#tea-amount");
    const timeEl = layer.querySelector("#tea-time");
    const tempVal = layer.querySelector("#tea-temp-val");
    const amountVal = layer.querySelector("#tea-amount-val");
    const timeVal = layer.querySelector("#tea-time-val");
    const info = layer.querySelector("#tea-info");
    const confirmBtn = layer.querySelector("#tea-confirm");
    const liquid = layer.querySelector("#tea-liquid");
    const steam = layer.querySelector("#tea-steam");

    function update() {
      const p = parseFloat(tempEl.value);
      const a = parseFloat(amountEl.value);
      const ti = parseFloat(timeEl.value);
      tempVal.textContent = Math.round(p * 100);
      amountVal.textContent = Math.round(a * 100);
      timeVal.textContent = Math.round(ti * 100);
      const diff = (Math.abs(p - tgt.temp) + Math.abs(a - tgt.amount) + Math.abs(ti - tgt.time)) / 3;
      const score = Math.max(0, 1 - diff);
      info.textContent = `相似度：${Math.round(score * 100)}%`;
      // 茶汤颜色：水温高偏红，茶量多偏深，时间长偏浓
      const r = Math.round(120 + p * 100);
      const g = Math.round(60 + (1-a) * 40);
      const b = Math.round(20 + (1-ti) * 30);
      liquid.style.background = `linear-gradient(180deg, rgba(${r},${g},${b},0.9), rgba(${r-30},${g-20},${b-10},0.95))`;
      // 蒸汽：水温越高越明显
      steam.style.opacity = p * 0.8;
    }
    tempEl.addEventListener("input", update);
    amountEl.addEventListener("input", update);
    timeEl.addEventListener("input", update);

    confirmBtn.onclick = () => {
      const p = parseFloat(tempEl.value);
      const a = parseFloat(amountEl.value);
      const ti = parseFloat(timeEl.value);
      const diff = (Math.abs(p - tgt.temp) + Math.abs(a - tgt.amount) + Math.abs(ti - tgt.time)) / 3;
      const score = Math.max(0, 1 - diff);
      const thresholds = t.thresholds || [];
      let matched = t.fallback || { tag: "miss", label: "——没泡好", next: null };
      for (const th of thresholds) {
        if (score >= th.min) { matched = th; break; }
      }
      Saves.saveTeaRecord(currentNodeId, p, a, ti, diff, matched.tag);
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
      reading.className = "tea-reading";
      reading.innerHTML = `<div class="tea-reading-title">${matched.label || "解读"} · 相似度 ${Math.round(score * 100)}%</div>
        <div class="tea-reading-text">${matched.text || ""}</div>
        <button class="tea-reading-close">继续</button>`;
      reading.querySelector(".tea-reading-close").onclick = () => {
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
  function runAstronomy(a, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "astronomy-layer";
    layer.id = "astronomy-layer";
    const constellations = a.constellations || ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio"];
    const target = a.target;
    const conLabels = {
      aries:"白羊座", taurus:"金牛座", gemini:"双子座", cancer:"巨蟹座",
      leo:"狮子座", virgo:"处女座", libra:"天秤座", scorpio:"天蝎座",
      sagittarius:"射手座", capricorn:"摩羯座", aquarius:"水瓶座", pisces:"双鱼座"
    };
    layer.innerHTML = `
      <div class="as-prompt">${a.prompt || "旋转星图盘——"}</div>
      <div class="as-stage">
        <div class="as-disk" id="as-disk">
          <div class="as-sky"></div>
          <div class="as-window" id="as-window"></div>
          <div class="as-pointer"></div>
        </div>
        <div class="as-clue" id="as-clue"></div>
      </div>
      <div class="as-slider-wrap">
        <input type="range" id="as-slider" min="0" max="${constellations.length - 1}" step="1" value="0">
        <div class="as-labels">${constellations.map((c,i) => `<span data-i="${i}">${conLabels[c]||c}</span>`).join("")}</div>
      </div>
      <div class="as-info" id="as-info">当前：${conLabels[constellations[0]] || constellations[0]}</div>
      <div class="as-actions">
        <button class="as-confirm" id="as-confirm">确认星象</button>
      </div>
    `;
    const slider = layer.querySelector("#as-slider");
    const disk = layer.querySelector("#as-disk");
    const windowEl = layer.querySelector("#as-window");
    const clueEl = layer.querySelector("#as-clue");
    const info = layer.querySelector("#as-info");
    const confirmBtn = layer.querySelector("#as-confirm");

    function renderCon(idx) {
      const c = constellations[idx];
      // 旋转星盘角度
      const angle = (idx / constellations.length) * 360;
      disk.style.transform = `rotate(${angle}deg)`;
      windowEl.innerHTML = `<div class="as-stars as-${c}"></div>`;
      if (c === target) {
        clueEl.textContent = a.clue || "";
        clueEl.classList.add("show");
      } else {
        clueEl.textContent = "";
        clueEl.classList.remove("show");
      }
      info.textContent = `当前：${conLabels[c] || c}`;
    }
    slider.addEventListener("input", () => renderCon(parseInt(slider.value)));

    confirmBtn.onclick = () => {
      const idx = parseInt(slider.value);
      const chosen = constellations[idx];
      const isTarget = chosen === target;
      const thresholds = a.thresholds || [];
      let matched = a.fallback || { tag: "miss", label: "——选错了", next: null };
      for (const t of thresholds) {
        if (t.isTarget === isTarget) { matched = t; break; }
      }
      Saves.saveAstronomyRecord(currentNodeId, idx, isTarget ? 0 : 1, matched.tag);
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
      reading.className = "as-reading";
      reading.innerHTML = `<div class="as-reading-title">${matched.label || "解读"}</div>
        <div class="as-reading-text">${matched.text || ""}</div>
        <button class="as-reading-close">继续</button>`;
      reading.querySelector(".as-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    document.getElementById("game").appendChild(layer);
    renderCon(0);
  }

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
  function runPalette(p, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "palette-layer";
    layer.id = "palette-layer";
    const tgt = p.target || { r: 216, g: 112, b: 144 };
    layer.innerHTML = `
      <div class="pa-prompt">${p.prompt || "调出目标颜色——"}</div>
      <div class="pa-stage">
        <div class="pa-target">
          <div class="pa-label">目标色</div>
          <div class="pa-color" id="pa-target-color" style="background: rgb(${tgt.r},${tgt.g},${tgt.b})"></div>
        </div>
        <div class="pa-current">
          <div class="pa-label">你的色</div>
          <div class="pa-color" id="pa-current-color"></div>
        </div>
      </div>
      <div class="pa-controls">
        <div class="pa-row">
          <label style="color:#ff8080">红</label>
          <input type="range" id="pa-r" min="0" max="255" step="1" value="128">
          <span id="pa-r-val">128</span>
        </div>
        <div class="pa-row">
          <label style="color:#80ff80">绿</label>
          <input type="range" id="pa-g" min="0" max="255" step="1" value="128">
          <span id="pa-g-val">128</span>
        </div>
        <div class="pa-row">
          <label style="color:#8080ff">蓝</label>
          <input type="range" id="pa-b" min="0" max="255" step="1" value="128">
          <span id="pa-b-val">128</span>
        </div>
      </div>
      <div class="pa-info" id="pa-info">差异：——</div>
      <div class="pa-actions">
        <button class="pa-confirm" id="pa-confirm">就这色</button>
      </div>
    `;
    const rEl = layer.querySelector("#pa-r");
    const gEl = layer.querySelector("#pa-g");
    const bEl = layer.querySelector("#pa-b");
    const rVal = layer.querySelector("#pa-r-val");
    const gVal = layer.querySelector("#pa-g-val");
    const bVal = layer.querySelector("#pa-b-val");
    const info = layer.querySelector("#pa-info");
    const confirmBtn = layer.querySelector("#pa-confirm");
    const currentColor = layer.querySelector("#pa-current-color");

    function update() {
      const r = parseInt(rEl.value);
      const g = parseInt(gEl.value);
      const b = parseInt(bEl.value);
      rVal.textContent = r;
      gVal.textContent = g;
      bVal.textContent = b;
      currentColor.style.background = `rgb(${r},${g},${b})`;
      const dr = Math.abs(r - tgt.r);
      const dg = Math.abs(g - tgt.g);
      const db = Math.abs(b - tgt.b);
      const diff = (dr + dg + db) / 3;
      const score = Math.max(0, 1 - diff / 255);
      info.textContent = `差异：${Math.round(diff)} · 相似度：${Math.round(score * 100)}%`;
    }
    rEl.addEventListener("input", update);
    gEl.addEventListener("input", update);
    bEl.addEventListener("input", update);

    confirmBtn.onclick = () => {
      const r = parseInt(rEl.value);
      const g = parseInt(gEl.value);
      const b = parseInt(bEl.value);
      const dr = Math.abs(r - tgt.r);
      const dg = Math.abs(g - tgt.g);
      const db = Math.abs(b - tgt.b);
      const diff = (dr + dg + db) / 3;
      const score = Math.max(0, 1 - diff / 255);
      const thresholds = p.thresholds || [];
      let matched = p.fallback || { tag: "miss", label: "——不像", next: null };
      for (const th of thresholds) {
        if (score >= th.min) { matched = th; break; }
      }
      Saves.savePaletteRecord(currentNodeId, r, g, b, diff, matched.tag);
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
      reading.className = "pa-reading";
      reading.innerHTML = `<div class="pa-reading-title">${matched.label || "解读"} · 相似度 ${Math.round(score * 100)}%</div>
        <div class="pa-reading-text">${matched.text || ""}</div>
        <button class="pa-reading-close">继续</button>`;
      reading.querySelector(".pa-reading-close").onclick = () => {
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
  function runPiano(p, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "piano-layer";
    layer.id = "piano-layer";
    const numKeys = p.keys || 8;
    const sequence = p.sequence || [0,2,4,2,0];
    const noteNames = ["Do","Re","Mi","Fa","Sol","La","Si","Do","Re","Mi"];
    layer.innerHTML = `
      <div class="pi-prompt">${p.prompt || "弹奏旋律——"}</div>
      <div class="pi-stage">
        <div class="pi-sequence" id="pi-sequence"></div>
        <div class="pi-progress" id="pi-progress">序列：0 / ${sequence.length}</div>
      </div>
      <div class="pi-piano" id="pi-piano"></div>
      <div class="pi-info" id="pi-info">先听一遍旋律——</div>
      <div class="pi-actions">
        <button class="pi-play" id="pi-play">播放旋律</button>
        <button class="pi-confirm" id="pi-confirm" disabled>完成</button>
      </div>
    `;
    const piano = layer.querySelector("#pi-piano");
    const seqEl = layer.querySelector("#pi-sequence");
    const progress = layer.querySelector("#pi-progress");
    const info = layer.querySelector("#pi-info");
    const playBtn = layer.querySelector("#pi-play");
    const confirmBtn = layer.querySelector("#pi-confirm");

    // 生成琴键
    const keyEls = [];
    for (let i = 0; i < numKeys; i++) {
      const key = document.createElement("div");
      key.className = "pi-key";
      key.dataset.idx = i;
      key.innerHTML = `<div class="pi-key-label">${noteNames[i] || i}</div>`;
      piano.appendChild(key);
      keyEls.push(key);
    }

    // 显示目标序列（用问号，播放后才揭示）
    function renderSeq(revealed) {
      seqEl.innerHTML = sequence.map((k, i) => {
        const label = revealed ? noteNames[k] : "?";
        return `<div class="pi-note" data-idx="${i}">${label}</div>`;
      }).join("");
    }
    renderSeq(!p.showSequence);

    let playerSeq = [];
    let playing = false;
    let aborted = false;

    function flashKey(idx, duration = 300) {
      const k = keyEls[idx];
      if (!k) return;
      k.classList.add("active");
      setTimeout(() => k.classList.remove("active"), duration);
    }

    function playSequence() {
      if (playing) return;
      playing = true;
      playBtn.disabled = true;
      info.textContent = "听旋律……";
      renderSeq(true);
      let i = 0;
      const iv = setInterval(() => {
        if (aborted || !document.body.contains(layer)) { clearInterval(iv); return; }
        if (i >= sequence.length) {
          clearInterval(iv);
          playing = false;
          playBtn.disabled = false;
          info.textContent = "按顺序点击琴键演奏——";
          return;
        }
        flashKey(sequence[i]);
        i++;
      }, 600);
    }
    playBtn.onclick = playSequence;

    function onKeyClick(idx) {
      if (playing || aborted) return;
      if (playerSeq.length >= sequence.length) return;
      flashKey(idx);
      playerSeq.push(idx);
      progress.textContent = `序列：${playerSeq.length} / ${sequence.length}`;
      // 标记已弹音符
      const notes = seqEl.querySelectorAll(".pi-note");
      if (notes[playerSeq.length - 1]) {
        notes[playerSeq.length - 1].classList.add("played");
      }
      if (playerSeq.length >= sequence.length) {
        confirmBtn.disabled = false;
        info.textContent = "可以提交了——";
      }
    }
    keyEls.forEach((k, i) => {
      k.addEventListener("click", () => onKeyClick(i));
    });

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || playing) return;
      let correct = 0;
      for (let i = 0; i < sequence.length; i++) {
        if (playerSeq[i] === sequence[i]) correct++;
      }
      const accuracy = sequence.length ? correct / sequence.length : 0;
      const thresholds = p.thresholds || [];
      let matched = p.fallback || { tag: "miss", label: "——弹错了", next: null };
      for (const th of thresholds) {
        if (accuracy >= th.min) { matched = th; break; }
      }
      Saves.savePianoRecord(currentNodeId, playerSeq.join(","), correct, sequence.length, accuracy, matched.tag);
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
      reading.className = "pi-reading";
      reading.innerHTML = `<div class="pi-reading-title">${matched.label || "解读"} · 正确率 ${Math.round(accuracy * 100)}%</div>
        <div class="pi-reading-text">${matched.text || ""}</div>
        <button class="pi-reading-close">继续</button>`;
      reading.querySelector(".pi-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    // 清理
    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runDice(d, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "dice-layer";
    layer.id = "dice-layer";
    layer.innerHTML = `
      <div class="di-prompt">${d.prompt || "掷三个骰子——解读命运"}</div>
      <div class="di-stage">
        <div class="di-dice" id="di-dice"></div>
        <div class="di-sum" id="di-sum">点数：——</div>
      </div>
      <div class="di-info" id="di-info">点击骰子掷出</div>
      <div class="di-actions">
        <button class="di-roll" id="di-roll">掷骰</button>
        <button class="di-confirm" id="di-confirm" disabled>解读</button>
      </div>
    `;
    const diceEl = layer.querySelector("#di-dice");
    const sumEl = layer.querySelector("#di-sum");
    const info = layer.querySelector("#di-info");
    const rollBtn = layer.querySelector("#di-roll");
    const confirmBtn = layer.querySelector("#di-confirm");

    // 生成 3 个骰子
    const dice = [1, 1, 1];
    for (let i = 0; i < 3; i++) {
      const die = document.createElement("div");
      die.className = "di-die";
      die.dataset.idx = i;
      die.innerHTML = `<div class="di-die-face">?</div>`;
      diceEl.appendChild(die);
    }
    const dieEls = diceEl.querySelectorAll(".di-die");

    let rolled = false;
    let rolling = false;
    let aborted = false;

    function renderDie(idx, val, rolling) {
      const face = dieEls[idx].querySelector(".di-die-face");
      dieEls[idx].classList.toggle("rolling", rolling);
      face.textContent = rolling ? "?" : val;
    }

    function rollDice() {
      if (rolling || aborted) return;
      rolling = true;
      rollBtn.disabled = true;
      info.textContent = "骰子转动中……";
      let ticks = 0;
      const iv = setInterval(() => {
        if (aborted || !document.body.contains(layer)) { clearInterval(iv); return; }
        for (let i = 0; i < 3; i++) {
          dice[i] = Math.floor(Math.random() * 6) + 1;
          renderDie(i, dice[i], true);
        }
        ticks++;
        if (ticks >= 10) {
          clearInterval(iv);
          for (let i = 0; i < 3; i++) renderDie(i, dice[i], false);
          const sum = dice.reduce((a,b) => a+b, 0);
          sumEl.textContent = `点数：${dice.join(" + ")} = ${sum}`;
          info.textContent = `掷出 ${dice.join("、")}，总和 ${sum}——可以解读了`;
          rolling = false;
          rolled = true;
          rollBtn.disabled = false;
          confirmBtn.disabled = false;
        }
      }, 80);
    }
    rollBtn.onclick = rollDice;

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || !rolled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      rollBtn.disabled = true;
      const sum = dice.reduce((a,b) => a+b, 0);
      const thresholds = d.thresholds || [];
      let matched = d.fallback || { tag: "miss", label: "——平淡", next: null };
      for (const t of thresholds) {
        if (sum >= t.min) { matched = t; break; }
      }
      Saves.saveDiceRecord(currentNodeId, dice.slice(), sum, matched.tag);
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
      reading.className = "di-reading";
      reading.innerHTML = `<div class="di-reading-title">${matched.label || "解读"} · 总和 ${sum}</div>
        <div class="di-reading-text">${matched.text || ""}</div>
        <button class="di-reading-close">继续</button>`;
      reading.querySelector(".di-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runWind(w, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "wind-layer";
    layer.id = "wind-layer";
    const target = w.target || 80;
    const maxAttempts = w.maxAttempts || 6;
    layer.innerHTML = `
      <div class="wd-prompt">${w.prompt || "调整帆角度——借风前进"}</div>
      <div class="wd-stage">
        <canvas class="wd-canvas" id="wd-canvas"></canvas>
        <div class="wd-info" id="wd-info">进度：0 / ${target} · 剩余 ${maxAttempts} 次</div>
      </div>
      <div class="wd-controls">
        <div class="wd-row">
          <label>帆角度</label>
          <input type="range" id="wd-sail" min="-90" max="90" step="1" value="0">
          <span id="wd-sail-val">0°</span>
        </div>
      </div>
      <div class="wd-actions">
        <button class="wd-sail-btn" id="wd-sail-btn">扬帆</button>
      </div>
    `;
    const canvas = layer.querySelector("#wd-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#wd-info");
    const sailEl = layer.querySelector("#wd-sail");
    const sailVal = layer.querySelector("#wd-sail-val");
    const sailBtn = layer.querySelector("#wd-sail-btn");

    let progress = 0;
    let attempts = 0;
    let windDir = 30;  // 当前风向（度）
    let aborted = false;
    let finished = false;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      redraw();
    }
    function redraw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 海面
      ctx.fillStyle = "rgba(60,120,160,0.4)";
      ctx.fillRect(0, h*0.7, w, h*0.3);
      // 进度条
      const barW = w - 40;
      const barH = 8;
      const barY = 20;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(20, barY, barW, barH);
      ctx.fillStyle = "#ffb8c8";
      ctx.fillRect(20, barY, barW * Math.min(1, progress / target), barH);
      // 目标线
      ctx.strokeStyle = "rgba(255,220,140,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20 + barW * 0.95, barY - 4);
      ctx.lineTo(20 + barW * 0.95, barY + barH + 4);
      ctx.stroke();
      // 船
      const boatX = 60 + (w - 120) * Math.min(1, progress / target);
      const boatY = h * 0.6;
      ctx.fillStyle = "#d87090";
      ctx.beginPath();
      ctx.moveTo(boatX - 20, boatY);
      ctx.lineTo(boatX + 20, boatY);
      ctx.lineTo(boatX + 12, boatY + 12);
      ctx.lineTo(boatX - 12, boatY + 12);
      ctx.closePath();
      ctx.fill();
      // 桅杆
      ctx.strokeStyle = "#f5e8d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boatX, boatY);
      ctx.lineTo(boatX, boatY - 30);
      ctx.stroke();
      // 帆（根据 sail 角度旋转）
      const sailAngle = parseFloat(sailEl.value) * Math.PI / 180;
      ctx.save();
      ctx.translate(boatX, boatY - 20);
      ctx.rotate(sailAngle);
      ctx.fillStyle = "rgba(255,240,220,0.8)";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 风向指示
      const windRad = windDir * Math.PI / 180;
      ctx.strokeStyle = "rgba(180,220,255,0.6)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 30;
        const y = h * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(windRad) * 20, y + Math.sin(windRad) * 20);
        ctx.stroke();
      }
    }
    function updateInfo() {
      info.textContent = `进度：${Math.round(progress)} / ${target} · 剩余 ${maxAttempts - attempts} 次`;
    }
    sailEl.addEventListener("input", () => {
      sailVal.textContent = `${sailEl.value}°`;
      redraw();
    });

    sailBtn.onclick = () => {
      if (finished || aborted) return;
      if (attempts >= maxAttempts) return;
      attempts++;
      // 风向：每次随机变化
      windDir = Math.random() * 120 - 60;
      const sailAngle = parseFloat(sailEl.value);
      // 帆角度与风向夹角越小，前进越多
      const diff = Math.abs(sailAngle - windDir);
      const aligned = Math.max(0, 1 - diff / 90);
      const gain = aligned * 20;
      progress = Math.min(target + 10, progress + gain);
      redraw();
      updateInfo();
      if (progress >= target) {
        finished = true;
        sailBtn.disabled = true;
        setTimeout(() => finishWind(), 400);
      } else if (attempts >= maxAttempts) {
        finished = true;
        sailBtn.disabled = true;
        setTimeout(() => finishWind(), 400);
      }
    };

    function finishWind() {
      if (aborted) return;
      aborted = true;
      finished = true;
      sailBtn.disabled = true;
      const ratio = Math.min(1, progress / target);
      const thresholds = w.thresholds || [];
      let matched = w.fallback || { tag: "miss", label: "——没到", next: null };
      for (const t of thresholds) {
        if (ratio >= t.min) { matched = t; break; }
      }
      Saves.saveWindRecord(currentNodeId, progress, attempts, matched.tag);
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
      reading.className = "wd-reading";
      reading.innerHTML = `<div class="wd-reading-title">${matched.label || "解读"} · 进度 ${Math.round(ratio * 100)}%</div>
        <div class="wd-reading-text">${matched.text || ""}</div>
        <button class="wd-reading-close">继续</button>`;
      reading.querySelector(".wd-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
        if (ro) ro.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });
    const ro = new ResizeObserver(() => { if (!aborted) resize(); });

    document.getElementById("game").appendChild(layer);
    ro.observe(canvas);
    resize();
    updateInfo();
  }

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
  function runDecode(dc, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "decode-layer";
    layer.id = "decode-layer";
    const scrambled = dc.scrambled || [];
    const answer = dc.answer || "";
    layer.innerHTML = `
      <div class="de-prompt">${dc.prompt || "把梦境碎片重排成一句完整的话——"}</div>
      <div class="de-stage">
        <div class="de-answer" id="de-answer"></div>
        <div class="de-pool" id="de-pool"></div>
      </div>
      <div class="de-info" id="de-info">点击碎片排序——</div>
      <div class="de-actions">
        <button class="de-reset">重置</button>
        <button class="de-confirm" id="de-confirm">解读</button>
      </div>
    `;
    const answerEl = layer.querySelector("#de-answer");
    const poolEl = layer.querySelector("#de-pool");
    const info = layer.querySelector("#de-info");
    const confirmBtn = layer.querySelector("#de-confirm");
    const resetBtn = layer.querySelector(".de-reset");

    // 打乱顺序
    const order = scrambled.map((s, i) => ({ s, i })).sort(() => Math.random() - 0.5);
    const picked = []; // [{s, idx}]
    let aborted = false;

    function renderPool() {
      poolEl.innerHTML = "";
      order.forEach((item, i) => {
        if (picked.find(p => p.i === item.i)) return;
        const chip = document.createElement("div");
        chip.className = "de-chip";
        chip.textContent = item.s;
        chip.onclick = () => {
          if (aborted) return;
          picked.push(item);
          renderPool();
          renderAnswer();
        };
        poolEl.appendChild(chip);
      });
    }
    function renderAnswer() {
      answerEl.innerHTML = "";
      picked.forEach((item, i) => {
        const chip = document.createElement("div");
        chip.className = "de-chip de-chip-picked";
        chip.textContent = item.s;
        chip.onclick = () => {
          if (aborted) return;
          picked.splice(i, 1);
          renderPool();
          renderAnswer();
        };
        answerEl.appendChild(chip);
      });
      const current = picked.map(p => p.s).join("");
      info.textContent = current ? `当前：${current}` : "点击碎片排序——";
    }
    resetBtn.onclick = () => {
      picked.length = 0;
      renderPool();
      renderAnswer();
    };

    confirmBtn.onclick = () => {
      if (aborted || confirmBtn.disabled) return;
      aborted = true;
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
      const current = picked.map(p => p.s).join("");
      const correct = current === answer;
      const score = correct ? 1 : (current.length > 0 ? Math.max(0, current.length / answer.length * 0.5) : 0);
      const thresholds = dc.thresholds || [];
      let matched = dc.fallback || { tag: "miss", label: "——没解开", next: null };
      for (const t of thresholds) {
        if (score >= t.min) { matched = t; break; }
      }
      Saves.saveDecodeRecord(currentNodeId, current, correct, matched.tag);
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
      reading.className = "de-reading";
      reading.innerHTML = `<div class="de-reading-title">${matched.label || "解读"}${correct ? " · 正确" : ""}</div>
        <div class="de-reading-text">${matched.text || ""}</div>
        <button class="de-reading-close">继续</button>`;
      reading.querySelector(".de-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    renderPool();
    renderAnswer();
  }

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
  function runRain(r, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "rain-layer";
    layer.id = "rain-layer";
    const totalDrops = r.drops || 8;
    const interval = r.interval || 1200;
    const tolerance = r.tolerance || 0.25;
    layer.innerHTML = `
      <div class="rn-prompt">${r.prompt || "听雨滴节奏——按节奏点击窗台"}</div>
      <div class="rn-stage">
        <canvas class="rn-canvas" id="rn-canvas"></canvas>
        <div class="rn-info" id="rn-info">点击「开始」听雨——</div>
      </div>
      <div class="rn-actions">
        <button class="rn-start" id="rn-start">开始</button>
      </div>
    `;
    const canvas = layer.querySelector("#rn-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#rn-info");
    const startBtn = layer.querySelector("#rn-start");

    let hits = 0;
    let dropCount = 0;
    let started = false;
    let aborted = false;
    let rafId = null;
    let dropTimers = [];
    let dropTimes = [];   // 每滴雨的预期时间
    let playerTaps = [];  // {time}
    let startTime = 0;
    let mo = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
    }
    const ro = new ResizeObserver(() => { if (!aborted) resize(); });

    function draw(now) {
      if (aborted) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 窗框
      ctx.strokeStyle = "rgba(255,220,180,0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, w-20, h-20);
      // 雨滴
      const elapsed = now - startTime;
      const activeDrops = [];
      dropTimes.forEach((t, i) => {
        const age = elapsed - t;
        if (age > -200 && age < 800) {
          activeDrops.push({ i, age });
        }
      });
      activeDrops.forEach(({ i, age }) => {
        const x = (w / (totalDrops + 1)) * (i + 1);
        let y, alpha;
        if (age < 0) {
          y = -20;
          alpha = 0;
        } else {
          y = (age / 800) * (h - 40);
          alpha = 1 - age / 800;
        }
        ctx.fillStyle = `rgba(180,200,230,${alpha * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(x, y + 20, 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // 落地涟漪
        if (age > 0 && age < 300) {
          ctx.strokeStyle = `rgba(200,220,240,${(1 - age/300) * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, h - 30, age / 300 * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      // 命中窗口指示
      const nextDrop = dropTimes.find(t => elapsed < t + 200);
      if (nextDrop) {
        const phase = (elapsed - nextDrop) / interval;
        ctx.fillStyle = phase > -tolerance && phase < tolerance
          ? "rgba(255,220,140,0.3)" : "rgba(255,255,255,0.05)";
        ctx.fillRect(0, h - 35, w, 6);
      }
      if (dropCount < totalDrops || elapsed < dropTimes[dropTimes.length-1] + 1000) {
        rafId = requestAnimationFrame(draw);
      } else {
        finishRain();
      }
    }

    function startRain() {
      if (started || aborted) return;
      started = true;
      startBtn.disabled = true;
      startTime = performance.now();
      // 生成雨滴时间表
      for (let i = 0; i < totalDrops; i++) {
        dropTimes.push(interval * (i + 1));
      }
      dropCount = totalDrops;
      info.textContent = `听雨滴落地——按节奏点击 · 0 / ${totalDrops}`;
      rafId = requestAnimationFrame(draw);
    }
    startBtn.onclick = startRain;

    function onTap() {
      if (!started || aborted) return;
      const now = performance.now();
      const elapsed = now - startTime;
      playerTaps.push({ time: elapsed });
      // 检查是否命中某个雨滴时间
      let best = null, bestDist = Infinity;
      for (const t of dropTimes) {
        const d = Math.abs(elapsed - t);
        if (d < bestDist) { bestDist = d; best = t; }
      }
      if (best && bestDist <= interval * tolerance) {
        hits++;
        flashHint("✓");
      } else {
        flashHint("✗");
      }
      info.textContent = `听雨滴落地——按节奏点击 · ${hits} / ${totalDrops}`;
    }
    canvas.addEventListener("click", onTap);
    canvas.addEventListener("touchstart", e => { onTap(); e.preventDefault(); }, { passive: false });

    function finishRain() {
      if (aborted) return;
      aborted = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      const accuracy = totalDrops ? hits / totalDrops : 0;
      const thresholds = r.thresholds || [];
      let matched = r.fallback || { tag: "miss", label: "——没跟上", next: null };
      for (const t of thresholds) {
        if (accuracy >= t.min) { matched = t; break; }
      }
      Saves.saveRainRecord(currentNodeId, hits, totalDrops, accuracy, matched.tag);
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
      reading.className = "rn-reading";
      reading.innerHTML = `<div class="rn-reading-title">${matched.label || "解读"} · 命中率 ${Math.round(accuracy * 100)}%</div>
        <div class="rn-reading-text">${matched.text || ""}</div>
        <button class="rn-reading-close">继续</button>`;
      reading.querySelector(".rn-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    }

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
  function runRubbing(rb, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "rubbing-layer";
    layer.id = "rubbing-layer";
    layer.innerHTML = `
      <div class="ru-prompt">${rb.prompt || "用铅笔拓印——"}</div>
      <div class="ru-stage">
        <canvas class="ru-canvas" id="ru-canvas"></canvas>
        <div class="ru-info" id="ru-info">覆盖率：0%</div>
      </div>
      <div class="ru-actions">
        <button class="ru-reset">重置</button>
        <button class="ru-confirm" id="ru-confirm" disabled>完成拓印</button>
      </div>
    `;
    const canvas = layer.querySelector("#ru-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ru-info");
    const confirmBtn = layer.querySelector("#ru-confirm");
    const resetBtn = layer.querySelector(".ru-reset");

    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let aborted = false;
    const pattern = rb.pattern || "leaf";
    let mask = null;
    let maskCtx = null;
    let cellW = 0, cellH = 0;
    const GRID = 40;

    function seeded(n) {
      const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      mask = document.createElement("canvas");
      mask.width = GRID;
      mask.height = GRID;
      maskCtx = mask.getContext("2d");
      cellW = canvas.width / GRID;
      cellH = canvas.height / GRID;
      drawPattern();
    }

    function drawPattern() {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      if (pattern === "leaf") {
        ctx.strokeStyle = "rgba(100,140,80,0.5)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          const x = (w / 8) * (i + 1);
          ctx.moveTo(x, h * 0.2);
          ctx.bezierCurveTo(x - 30, h * 0.4, x + 30, h * 0.6, x, h * 0.8);
          ctx.stroke();
          for (let j = 0; j < 6; j++) {
            const t = j / 6;
            const cy = h * 0.2 + (h * 0.6) * t;
            const off = (seeded(i * 10 + j) - 0.5) * 40;
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(x + off, cy + 20);
            ctx.stroke();
          }
        }
      } else if (pattern === "stone") {
        for (let i = 0; i < 30; i++) {
          const r = 100 + seeded(i) * 40;
          ctx.fillStyle = `rgba(${r},${r},${r},0.4)`;
          ctx.beginPath();
          ctx.arc(seeded(i + 1) * w, seeded(i + 2) * h, 10 + seeded(i + 3) * 20, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pattern === "wood") {
        ctx.strokeStyle = "rgba(120,80,40,0.4)";
        for (let i = 0; i < 15; i++) {
          ctx.lineWidth = 1 + seeded(i) * 2;
          ctx.beginPath();
          const y = (h / 15) * i;
          ctx.moveTo(0, y);
          for (let x = 0; x < w; x += 20) {
            ctx.lineTo(x, y + Math.sin(x * 0.05) * 5);
          }
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = "rgba(180,160,140,0.3)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 4) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 4) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }
      ctx.restore();
      if (maskCtx) {
        maskCtx.clearRect(0, 0, GRID, GRID);
        maskCtx.fillStyle = "#000";
        maskCtx.fillRect(0, 0, GRID, GRID);
      }
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function markMask(x, y) {
      if (!maskCtx) return;
      const gx = Math.max(0, Math.min(GRID - 1, Math.floor(x / cellW)));
      const gy = Math.max(0, Math.min(GRID - 1, Math.floor(y / cellH)));
      maskCtx.fillStyle = "#fff";
      maskCtx.fillRect(gx - 1, gy - 1, 3, 3);
    }

    function startDraw(e) {
      if (aborted) return;
      isDrawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      drawDot(p.x, p.y);
    }
    function drawDot(x, y) {
      ctx.fillStyle = "rgba(240,230,210,0.7)";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      markMask(x, y);
    }
    function moveDraw(e) {
      if (!isDrawing || aborted) return;
      e.preventDefault();
      const p = getPos(e);
      const dx = p.x - lastX, dy = p.y - lastY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const steps = Math.max(1, Math.floor(dist / 4));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        drawDot(lastX + dx * t, lastY + dy * t);
      }
      lastX = p.x; lastY = p.y;
      updateCoverage();
    }
    function endDraw() { isDrawing = false; }

    function getCoverage() {
      if (!maskCtx) return 0;
      const data = maskCtx.getImageData(0, 0, GRID, GRID).data;
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 128) lit++;
      }
      return lit / (GRID * GRID);
    }

    function updateCoverage() {
      const estimated = getCoverage();
      info.textContent = `覆盖率：${Math.round(estimated * 100)}%`;
      const minCov = rb.min || 0.5;
      if (estimated >= minCov) confirmBtn.disabled = false;
    }

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", moveDraw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", e => { startDraw(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", e => { moveDraw(e); }, { passive: false });
    canvas.addEventListener("touchend", endDraw);

    resetBtn.onclick = () => {
      if (aborted) return;
      drawPattern();
      updateCoverage();
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
      isDrawing = false;
      const coverage = getCoverage();
      const thresholds = rb.thresholds || [];
      let matched = rb.fallback || { tag: "miss", label: "——没拓清", next: null };
      for (const t of thresholds) {
        if (coverage >= t.min) { matched = t; break; }
      }
      Saves.saveRubbingRecord(currentNodeId, coverage, matched.tag);
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
      reading.className = "ru-reading";
      reading.innerHTML = `<div class="ru-reading-title">${matched.label || "解读"} · 覆盖率 ${Math.round(coverage * 100)}%</div>
        <div class="ru-reading-text">${matched.text || ""}</div>
        <button class="ru-reading-close">继续</button>`;
      reading.querySelector(".ru-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
        if (ro) ro.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });
    const ro = new ResizeObserver(() => { if (!aborted) resize(); });

    document.getElementById("game").appendChild(layer);
    ro.observe(canvas);
    resize();
  }

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
  function runCollect(c, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "collect-layer";
    layer.id = "collect-layer";
    const target = c.target || "雨";
    const total = c.total || 5;
    const duration = c.duration || 15000;
    // 干扰字
    const distractors = c.distractors || ["风","云","月","花","叶","雪","霜","露"];
    layer.innerHTML = `
      <div class="cl-prompt">${c.prompt || "在飘落的字符中收集目标字——"}</div>
      <div class="cl-target">目标字：<span class="cl-target-char">${target}</span> · 已收集 <span id="cl-count">0</span> / ${total}</div>
      <div class="cl-stage" id="cl-stage"></div>
      <div class="cl-info" id="cl-info">点击「开始」启动</div>
      <div class="cl-actions">
        <button class="cl-start" id="cl-start">开始</button>
      </div>
    `;
    const stage = layer.querySelector("#cl-stage");
    const info = layer.querySelector("#cl-info");
    const countEl = layer.querySelector("#cl-count");
    const startBtn = layer.querySelector("#cl-start");

    let collected = 0;
    let started = false;
    let aborted = false;
    let spawnTimer = null;
    let endTimer = null;
    let chars = [];

    function spawnChar() {
      if (aborted) return;
      const isTarget = Math.random() < 0.4;
      const ch = isTarget ? target : distractors[Math.floor(Math.random() * distractors.length)];
      const el = document.createElement("div");
      el.className = "cl-char" + (isTarget ? " cl-char-target" : "");
      el.textContent = ch;
      el.style.left = (Math.random() * 90 + 5) + "%";
      el.style.top = "-40px";
      el.dataset.target = isTarget ? "1" : "0";
      stage.appendChild(el);
      chars.push(el);
      // 动画下落
      const duration = 4000 + Math.random() * 2000;
      el.style.transition = `top ${duration}ms linear, opacity 0.3s`;
      requestAnimationFrame(() => {
        el.style.top = (stage.clientHeight + 20) + "px";
      });
      // 点击收集
      el.onclick = () => {
        if (aborted) return;
        if (el.dataset.target === "1") {
          collected++;
          countEl.textContent = collected;
          el.classList.add("cl-char-hit");
          setTimeout(() => el.remove(), 300);
        } else {
          // 点错扣分（视觉反馈）
          el.classList.add("cl-char-miss");
          setTimeout(() => el.remove(), 300);
        }
      };
      // 自动清理
      setTimeout(() => { if (el.parentNode) el.remove(); }, duration + 500);
    }

    function startGame() {
      if (started || aborted) return;
      started = true;
      startBtn.disabled = true;
      info.textContent = `收集中—— ${duration/1000}秒`;
      spawnTimer = setInterval(() => {
        if (aborted || !document.body.contains(layer)) { clearInterval(spawnTimer); return; }
        spawnChar();
      }, 600);
      endTimer = setTimeout(() => finishGame(), duration);
    }
    startBtn.onclick = startGame;

    function finishGame() {
      if (aborted) return;
      aborted = true;
      if (spawnTimer) clearInterval(spawnTimer);
      if (endTimer) clearTimeout(endTimer);
      // 清理所有字符
      stage.querySelectorAll(".cl-char").forEach(c => c.remove());
      const accuracy = total ? Math.min(1, collected / total) : 0;
      const thresholds = c.thresholds || [];
      let matched = c.fallback || { tag: "miss", label: "——没收集到", next: null };
      for (const t of thresholds) {
        if (accuracy >= t.min) { matched = t; break; }
      }
      Saves.saveCollectRecord(currentNodeId, collected, total, accuracy, matched.tag);
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
      reading.className = "cl-reading";
      reading.innerHTML = `<div class="cl-reading-title">${matched.label || "解读"} · 收集 ${collected} / ${total}</div>
        <div class="cl-reading-text">${matched.text || ""}</div>
        <button class="cl-reading-close">继续</button>`;
      reading.querySelector(".cl-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    }

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (spawnTimer) clearInterval(spawnTimer);
        if (endTimer) clearTimeout(endTimer);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runFocus(f, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "focus-layer";
    layer.id = "focus-layer";
    const tgt = f.target !== undefined ? f.target : 0.5;
    layer.innerHTML = `
      <div class="fo-prompt">${f.prompt || "调整焦距——让画面变清晰"}</div>
      <div class="fo-stage">
        <div class="fo-scene" id="fo-scene">
          <div class="fo-scene-content">远方的樱花树下，有一个等待的人影</div>
        </div>
      </div>
      <div class="fo-controls">
        <div class="fo-row">
          <label>焦距</label>
          <input type="range" id="fo-slider" min="0" max="1" step="0.01" value="0">
          <span id="fo-val">0</span>
        </div>
      </div>
      <div class="fo-info" id="fo-info">差异：——</div>
      <div class="fo-actions">
        <button class="fo-confirm" id="fo-confirm">确认焦距</button>
      </div>
    `;
    const slider = layer.querySelector("#fo-slider");
    const valEl = layer.querySelector("#fo-val");
    const info = layer.querySelector("#fo-info");
    const confirmBtn = layer.querySelector("#fo-confirm");
    const scene = layer.querySelector("#fo-scene");

    function update() {
      const v = parseFloat(slider.value);
      valEl.textContent = Math.round(v * 100);
      const diff = Math.abs(v - tgt);
      const score = Math.max(0, 1 - diff);
      info.textContent = `差异：${Math.round(diff * 100)} · 清晰度：${Math.round(score * 100)}%`;
      // 模糊度：越接近目标越清晰
      const blur = diff * 20;
      scene.style.filter = `blur(${blur}px) brightness(${0.7 + score * 0.3})`;
    }
    slider.addEventListener("input", update);

    let aborted = false;
    confirmBtn.onclick = () => {
      if (aborted || confirmBtn.disabled) return;
      aborted = true;
      confirmBtn.disabled = true;
      slider.disabled = true;
      const v = parseFloat(slider.value);
      const diff = Math.abs(v - tgt);
      const score = Math.max(0, 1 - diff);
      const thresholds = f.thresholds || [];
      let matched = f.fallback || { tag: "miss", label: "——没对上焦", next: null };
      for (const t of thresholds) {
        if (score >= t.min) { matched = t; break; }
      }
      Saves.saveFocusRecord(currentNodeId, v, diff, matched.tag);
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
      reading.className = "fo-reading";
      reading.innerHTML = `<div class="fo-reading-title">${matched.label || "解读"} · 清晰度 ${Math.round(score * 100)}%</div>
        <div class="fo-reading-text">${matched.text || ""}</div>
        <button class="fo-reading-close">继续</button>`;
      reading.querySelector(".fo-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    update();
  }

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
  function runScentmem(sm, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "scentmem-layer";
    layer.id = "scentmem-layer";
    const samples = sm.samples || [];
    // 打乱顺序
    const shuffled = samples.slice().sort(() => Math.random() - 0.5);
    layer.innerHTML = `
      <div class="sm-prompt">${sm.prompt || "辨认之前闻过的气味——"}</div>
      <div class="sm-stage" id="sm-stage"></div>
      <div class="sm-info" id="sm-info">点击气味卡片辨认——</div>
      <div class="sm-actions">
        <button class="sm-confirm" id="sm-confirm" disabled>确认</button>
      </div>
    `;
    const stage = layer.querySelector("#sm-stage");
    const info = layer.querySelector("#sm-info");
    const confirmBtn = layer.querySelector("#sm-confirm");

    const picked = []; // {id, isTarget, picked: true/false}
    let aborted = false;

    shuffled.forEach(s => {
      const card = document.createElement("div");
      card.className = "sm-card";
      card.dataset.id = s.id;
      card.innerHTML = `
        <div class="sm-card-icon">${s.icon || "✦"}</div>
        <div class="sm-card-name">${s.name}</div>
        <div class="sm-card-desc">${s.desc}</div>
      `;
      card.onclick = () => {
        if (aborted) return;
        const isPicked = card.classList.toggle("sm-card-picked");
        const existing = picked.find(p => p.id === s.id);
        if (isPicked && !existing) {
          picked.push({ id: s.id, isTarget: s.isTarget });
        } else if (!isPicked && existing) {
          const i = picked.indexOf(existing);
          picked.splice(i, 1);
        }
        info.textContent = picked.length > 0 ? `已选 ${picked.length} 个气味` : "点击气味卡片辨认——";
        confirmBtn.disabled = picked.length === 0;
      };
      stage.appendChild(card);
    });

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const targets = samples.filter(s => s.isTarget);
      const correctPicks = picked.filter(p => p.isTarget).length;
      const wrongPicks = picked.filter(p => !p.isTarget).length;
      const totalTargets = targets.length;
      const accuracy = Math.max(0, (correctPicks - wrongPicks) / Math.max(1, totalTargets));
      const thresholds = sm.thresholds || [];
      let matched = sm.fallback || { tag: "miss", label: "——记错了", next: null };
      for (const t of thresholds) {
        if (accuracy >= t.min) { matched = t; break; }
      }
      Saves.saveScentmemRecord(currentNodeId, correctPicks, totalTargets, matched.tag);
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
      reading.className = "sm-reading";
      reading.innerHTML = `<div class="sm-reading-title">${matched.label || "解读"} · 正确 ${correctPicks} / ${totalTargets}</div>
        <div class="sm-reading-text">${matched.text || ""}</div>
        <button class="sm-reading-close">继续</button>`;
      reading.querySelector(".sm-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runTealeaf(tl, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "tealeaf-layer";
    layer.id = "tealeaf-layer";
    layer.innerHTML = `
      <div class="tl-prompt">${tl.prompt || "拖动茶杯——让茶渍在杯底流转"}</div>
      <div class="tl-stage">
        <canvas class="tl-canvas" id="tl-canvas"></canvas>
        <div class="tl-info" id="tl-info">覆盖率：0%</div>
      </div>
      <div class="tl-actions">
        <button class="tl-reset">重置</button>
        <button class="tl-confirm" id="tl-confirm" disabled>解读茶渍</button>
      </div>
    `;
    const canvas = layer.querySelector("#tl-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#tl-info");
    const confirmBtn = layer.querySelector("#tl-confirm");
    const resetBtn = layer.querySelector(".tl-reset");

    let isDragging = false;
    let lastX = 0, lastY = 0;
    let aborted = false;
    const SECTORS = 6;
    let cupCx = 0, cupCy = 0, cupR = 0;
    let mask = null, maskCtx = null;
    const GRID = 60;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cupCx = canvas.width / 2;
      cupCy = canvas.height / 2;
      cupR = Math.min(canvas.width, canvas.height) * 0.42;
      mask = document.createElement("canvas");
      mask.width = GRID; mask.height = GRID;
      maskCtx = mask.getContext("2d");
      drawCup();
    }

    function drawCup() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 杯壁
      const grd = ctx.createRadialGradient(cupCx, cupCy, cupR * 0.2, cupCx, cupCy, cupR);
      grd.addColorStop(0, "#f5e6c8");
      grd.addColorStop(1, "#a89066");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cupCx, cupCy, cupR, 0, Math.PI * 2);
      ctx.fill();
      // 茶汤底色
      ctx.fillStyle = "rgba(120,70,40,0.35)";
      ctx.beginPath();
      ctx.arc(cupCx, cupCy, cupR * 0.92, 0, Math.PI * 2);
      ctx.fill();
      // 杯沿
      ctx.strokeStyle = "rgba(80,50,30,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cupCx, cupCy, cupR, 0, Math.PI * 2);
      ctx.stroke();
      // 扇区分隔（淡）
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < SECTORS; i++) {
        const a = (i / SECTORS) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cupCx, cupCy);
        ctx.lineTo(cupCx + Math.cos(a) * cupR * 0.9, cupCy + Math.sin(a) * cupR * 0.9);
        ctx.stroke();
      }
      if (maskCtx) {
        maskCtx.clearRect(0, 0, GRID, GRID);
      }
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function inCup(x, y) {
      const dx = x - cupCx, dy = y - cupCy;
      return dx * dx + dy * dy <= cupR * cupR * 0.85;
    }

    function markMask(x, y) {
      if (!maskCtx) return;
      const gx = Math.max(0, Math.min(GRID - 1, Math.floor((x / canvas.width) * GRID)));
      const gy = Math.max(0, Math.min(GRID - 1, Math.floor((y / canvas.height) * GRID)));
      maskCtx.fillStyle = "#fff";
      maskCtx.fillRect(gx - 1, gy - 1, 3, 3);
    }

    function drop(x, y, vx, vy) {
      if (!inCup(x, y)) return;
      // 按速度方向洒一串茶渍点
      const speed = Math.sqrt(vx * vx + vy * vy);
      const count = Math.min(8, 2 + Math.floor(speed / 4));
      for (let i = 0; i < count; i++) {
        const ox = (Math.random() - 0.5) * 6 + vx * 0.3;
        const oy = (Math.random() - 0.5) * 6 + vy * 0.3;
        const px = x + ox, py = y + oy;
        if (!inCup(px, py)) continue;
        const r = 2 + Math.random() * 4;
        ctx.fillStyle = `rgba(60,30,15,${0.4 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        markMask(px, py);
      }
    }

    function startDrag(e) {
      if (aborted) return;
      isDragging = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      drop(p.x, p.y, 0, 0);
      updateCoverage();
    }
    function moveDrag(e) {
      if (!isDragging || aborted) return;
      e.preventDefault();
      const p = getPos(e);
      const vx = p.x - lastX, vy = p.y - lastY;
      drop(p.x, p.y, vx, vy);
      lastX = p.x; lastY = p.y;
      updateCoverage();
    }
    function endDrag() { isDragging = false; }

    function getCoverage() {
      if (!maskCtx) return 0;
      const data = maskCtx.getImageData(0, 0, GRID, GRID).data;
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 128) lit++;
      }
      return lit / (GRID * GRID);
    }

    function updateCoverage() {
      const c = getCoverage();
      info.textContent = `覆盖率：${Math.round(c * 100)}%`;
      const minCov = tl.min || 0.3;
      if (c >= minCov) confirmBtn.disabled = false;
    }

    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", moveDrag);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);
    canvas.addEventListener("touchstart", e => { startDrag(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", e => { moveDrag(e); }, { passive: false });
    canvas.addEventListener("touchend", endDrag);

    resetBtn.onclick = () => {
      if (aborted) return;
      drawCup();
      updateCoverage();
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
      isDragging = false;
      const coverage = getCoverage();
      // 计算每个扇区的茶渍量
      const sectorCounts = new Array(SECTORS).fill(0);
      if (maskCtx) {
        const data = maskCtx.getImageData(0, 0, GRID, GRID).data;
        for (let y = 0; y < GRID; y++) {
          for (let x = 0; x < GRID; x++) {
            const idx = (y * GRID + x) * 4;
            if (data[idx] <= 128) continue;
            const wx = (x / GRID) * canvas.width;
            const wy = (y / GRID) * canvas.height;
            const dx = wx - cupCx, dy = wy - cupCy;
            if (dx * dx + dy * dy > cupR * cupR * 0.85) continue;
            let ang = Math.atan2(dy, dx) + Math.PI / 2;
            if (ang < 0) ang += Math.PI * 2;
            const s = Math.floor((ang / (Math.PI * 2)) * SECTORS) % SECTORS;
            sectorCounts[s]++;
          }
        }
      }
      const total = sectorCounts.reduce((a, b) => a + b, 0) || 1;
      // 匹配 shape
      const shapes = tl.shapes || [];
      let bestShape = null;
      let bestScore = -1;
      for (const sh of shapes) {
        const areas = sh.areas || [];
        let score = 0;
        for (let i = 0; i < SECTORS; i++) {
          const want = areas.includes(i) ? 1 : 0;
          const have = sectorCounts[i] / total;
          score += want ? have : (1 - have) / SECTORS;
        }
        if (score > bestScore) { bestScore = score; bestShape = sh; }
      }
      const shapeScore = Math.max(0, Math.min(1, bestScore));
      // 综合分数 = 覆盖率 * 0.4 + shape 匹配度 * 0.6
      const score = coverage * 0.4 + shapeScore * 0.6;
      const thresholds = tl.thresholds || [];
      let matched = tl.fallback || { tag: "miss", label: "——看不清", next: null };
      for (const t of thresholds) {
        if (score >= t.min) { matched = t; break; }
      }
      const shapeName = bestShape ? bestShape.name : "无相";
      Saves.saveTealeafRecord(currentNodeId, shapeName, score, matched.tag);
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
      reading.className = "tl-reading";
      reading.innerHTML = `<div class="tl-reading-title">${matched.label || "解读"} · ${shapeName} · 信度 ${Math.round(score * 100)}%</div>
        <div class="tl-reading-text">${matched.text || ""}</div>
        <button class="tl-reading-close">继续</button>`;
      reading.querySelector(".tl-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runShadow(sh, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "shadow-layer";
    layer.id = "shadow-layer";
    layer.innerHTML = `
      <div class="sh-prompt">${sh.prompt || "拖动物体——让影子与目标轮廓重合"}</div>
      <div class="sh-stage">
        <canvas class="sh-canvas" id="sh-canvas"></canvas>
        <div class="sh-info" id="sh-info">重合度：0%</div>
      </div>
      <div class="sh-actions">
        <button class="sh-reset">重置</button>
        <button class="sh-confirm" id="sh-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#sh-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#sh-info");
    const confirmBtn = layer.querySelector("#sh-confirm");
    const resetBtn = layer.querySelector(".sh-reset");

    let aborted = false;
    let dragging = false;
    let objX = 0, objY = 0;
    let dragOffX = 0, dragOffY = 0;
    const lightAng = (sh.lightAngle ?? 45) * Math.PI / 180;
    const target = (sh.target || []).map(p => ({ x: p.x, y: p.y }));
    let mask = null, maskCtx = null;
    let tgtMask = null, tgtMaskCtx = null;
    const GRID = 80;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      mask = document.createElement("canvas");
      mask.width = GRID; mask.height = GRID;
      maskCtx = mask.getContext("2d");
      tgtMask = document.createElement("canvas");
      tgtMask.width = GRID; tgtMask.height = GRID;
      tgtMaskCtx = tgtMask.getContext("2d");
      // 物体初始位置（左侧）
      objX = canvas.width * 0.25;
      objY = canvas.height * 0.5;
      drawTargetMask();
      draw();
    }

    function drawTargetMask() {
      tgtMaskCtx.clearRect(0, 0, GRID, GRID);
      tgtMaskCtx.fillStyle = "#fff";
      // 把目标点连成多边形
      if (target.length < 3) return;
      tgtMaskCtx.beginPath();
      target.forEach((p, i) => {
        const x = p.x * GRID, y = p.y * GRID;
        if (i === 0) tgtMaskCtx.moveTo(x, y);
        else tgtMaskCtx.lineTo(x, y);
      });
      tgtMaskCtx.closePath();
      tgtMaskCtx.fill();
    }

    function shadowPolygon() {
      // 物体是一个 30x30 的方块，根据光源角度投影到地面（y 较大方向）
      const size = Math.min(canvas.width, canvas.height) * 0.06;
      const half = size / 2;
      // 光源方向单位向量（光从该方向来）
      const lx = Math.cos(lightAng), ly = Math.sin(lightAng);
      // 物体四个角
      const corners = [
        { x: objX - half, y: objY - half },
        { x: objX + half, y: objY - half },
        { x: objX + half, y: objY + half },
        { x: objX - half, y: objY + half }
      ];
      // 投影方向：光前进方向
      const projLen = size * 2.5;
      const proj = corners.map(c => ({
        x: c.x + lx * projLen,
        y: c.y + ly * projLen
      }));
      // 影子多边形：物角点和对应的投影点
      return [corners[0], corners[1], proj[1], proj[2], proj[3], corners[3]];
    }

    function drawShadowMask() {
      maskCtx.clearRect(0, 0, GRID, GRID);
      maskCtx.fillStyle = "#fff";
      const poly = shadowPolygon();
      maskCtx.beginPath();
      poly.forEach((p, i) => {
        const gx = (p.x / canvas.width) * GRID;
        const gy = (p.y / canvas.height) * GRID;
        if (i === 0) maskCtx.moveTo(gx, gy);
        else maskCtx.lineTo(gx, gy);
      });
      maskCtx.closePath();
      maskCtx.fill();
    }

    function overlap() {
      if (!maskCtx || !tgtMaskCtx) return 0;
      const a = maskCtx.getImageData(0, 0, GRID, GRID).data;
      const b = tgtMaskCtx.getImageData(0, 0, GRID, GRID).data;
      let inter = 0, union = 0;
      for (let i = 0; i < a.length; i += 4) {
        const pa = a[i] > 128, pb = b[i] > 128;
        if (pa && pb) inter++;
        if (pa || pb) union++;
      }
      return union > 0 ? inter / union : 0;
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 背景（地面）
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#5a4a3a");
      grd.addColorStop(1, "#3a2a1a");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      // 光源方向指示
      const lx = Math.cos(lightAng), ly = Math.sin(lightAng);
      const arrCx = w * 0.5, arrCy = h * 0.15;
      ctx.strokeStyle = "rgba(255,240,180,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arrCx - lx * 30, arrCy - ly * 30);
      ctx.lineTo(arrCx + lx * 30, arrCy + ly * 30);
      ctx.stroke();
      // 箭头
      ctx.beginPath();
      ctx.moveTo(arrCx + lx * 30, arrCy + ly * 30);
      ctx.lineTo(arrCx + lx * 20 - ly * 8, arrCy + ly * 20 + lx * 8);
      ctx.moveTo(arrCx + lx * 30, arrCy + ly * 30);
      ctx.lineTo(arrCx + lx * 20 + ly * 8, arrCy + ly * 20 - lx * 8);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,240,180,0.7)";
      ctx.font = "12px serif";
      ctx.fillText("光", arrCx - 6, arrCy - 12);

      // 目标轮廓（虚线）
      if (target.length >= 3) {
        ctx.strokeStyle = "rgba(255,200,100,0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        target.forEach((p, i) => {
          const x = p.x * w, y = p.y * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,200,100,0.12)";
        ctx.fill();
      }
      // 影子
      drawShadowMask();
      const poly = shadowPolygon();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      poly.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      // 物体（一个木块）
      const size = Math.min(w, h) * 0.06;
      ctx.fillStyle = "#8a6040";
      ctx.fillRect(objX - size / 2, objY - size / 2, size, size);
      ctx.strokeStyle = "#4a2810";
      ctx.lineWidth = 2;
      ctx.strokeRect(objX - size / 2, objY - size / 2, size, size);

      const o = overlap();
      info.textContent = `重合度：${Math.round(o * 100)}%`;
      const minO = sh.min || 0.5;
      if (o >= minO) confirmBtn.disabled = false;
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    }
    function startDrag(e) {
      if (aborted) return;
      const p = getPos(e);
      const size = Math.min(canvas.width, canvas.height) * 0.06;
      if (Math.abs(p.x - objX) < size && Math.abs(p.y - objY) < size) {
        dragging = true;
        dragOffX = p.x - objX;
        dragOffY = p.y - objY;
      }
    }
    function moveDrag(e) {
      if (!dragging || aborted) return;
      e.preventDefault();
      const p = getPos(e);
      objX = Math.max(0, Math.min(canvas.width, p.x - dragOffX));
      objY = Math.max(0, Math.min(canvas.height, p.y - dragOffY));
      draw();
    }
    function endDrag() { dragging = false; }

    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", moveDrag);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);
    canvas.addEventListener("touchstart", e => { startDrag(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", e => { moveDrag(e); }, { passive: false });
    canvas.addEventListener("touchend", endDrag);

    resetBtn.onclick = () => {
      if (aborted) return;
      objX = canvas.width * 0.25;
      objY = canvas.height * 0.5;
      draw();
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
      dragging = false;
      const o = overlap();
      const thresholds = sh.thresholds || [];
      let matched = sh.fallback || { tag: "miss", label: "——没对上", next: null };
      for (const t of thresholds) {
        if (o >= t.min) { matched = t; break; }
      }
      Saves.saveShadowRecord(currentNodeId, o, matched.tag);
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
      reading.className = "sh-reading";
      reading.innerHTML = `<div class="sh-reading-title">${matched.label || "解读"} · 重合度 ${Math.round(o * 100)}%</div>
        <div class="sh-reading-text">${matched.text || ""}</div>
        <button class="sh-reading-close">继续</button>`;
      reading.querySelector(".sh-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runCandle(cd, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "candle-layer";
    layer.id = "candle-layer";
    layer.innerHTML = `
      <div class="cd-prompt">${cd.prompt || "旋转挡风板——守护烛火不被风吹灭"}</div>
      <div class="cd-stage">
        <canvas class="cd-canvas" id="cd-canvas"></canvas>
        <div class="cd-info" id="cd-info">第 0 / ${cd.winds || 6} 阵风 · 火焰 100%</div>
      </div>
      <div class="cd-actions">
        <button class="cd-start" id="cd-start">开始</button>
        <button class="cd-confirm" id="cd-confirm" disabled>结束</button>
      </div>
    `;
    const canvas = layer.querySelector("#cd-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#cd-info");
    const startBtn = layer.querySelector("#cd-start");
    const confirmBtn = layer.querySelector("#cd-confirm");

    let aborted = false;
    let started = false;
    let shieldAng = 0;       // 挡风板角度（弧度）
    let windAng = 0;         // 当前风方向
    let windActive = false;
    let flame = 1.0;         // 火焰强度 0-1
    let windsTotal = cd.winds || 6;
    let windsPassed = 0;
    let windsSurvived = 0;
    let windTimer = null;
    let gapTimer = null;
    let rafId = null;
    let cx = 0, cy = 0, R = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      R = Math.min(canvas.width, canvas.height) * 0.4;
      draw();
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 背景
      const grd = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.4);
      grd.addColorStop(0, "#3a2a30");
      grd.addColorStop(1, "#0a0510");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      // 风向指示（外圈箭头）
      if (windActive) {
        const dist = R * 1.1;
        const ax = cx + Math.cos(windAng) * dist;
        const ay = cy + Math.sin(windAng) * dist;
        ctx.strokeStyle = "rgba(180,220,255,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(cx + Math.cos(windAng) * R * 0.85, cy + Math.sin(windAng) * R * 0.85);
        ctx.stroke();
        // 箭头头
        ctx.fillStyle = "rgba(180,220,255,0.9)";
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(windAng) * R * 0.85, cy + Math.sin(windAng) * R * 0.85);
        ctx.lineTo(cx + Math.cos(windAng + 0.3) * R * 0.95, cy + Math.sin(windAng + 0.3) * R * 0.95);
        ctx.lineTo(cx + Math.cos(windAng - 0.3) * R * 0.95, cy + Math.sin(windAng - 0.3) * R * 0.95);
        ctx.closePath();
        ctx.fill();
      }
      // 挡风板（弧形）
      ctx.strokeStyle = "rgba(216,180,140,0.9)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.7, shieldAng - 0.5, shieldAng + 0.5);
      ctx.stroke();
      // 板手柄
      ctx.fillStyle = "#a87850";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(shieldAng) * R * 0.7, cy + Math.sin(shieldAng) * R * 0.7, 6, 0, Math.PI * 2);
      ctx.fill();
      // 蜡烛
      ctx.fillStyle = "#e8d8b0";
      ctx.fillRect(cx - 6, cy + 20, 12, 40);
      // 火焰
      const fh = 25 + flame * 25;
      const fw = 8 + flame * 6;
      const fy = cy + 20 - fh;
      const fgrd = ctx.createLinearGradient(cx, fy, cx, fy + fh);
      fgrd.addColorStop(0, `rgba(255,${Math.floor(180 + flame * 60)},80,${0.9})`);
      fgrd.addColorStop(1, `rgba(255,80,30,${0.4 + flame * 0.4})`);
      ctx.fillStyle = fgrd;
      ctx.beginPath();
      ctx.ellipse(cx, fy + fh / 2, fw / 2, fh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // 火心
      if (flame > 0.1) {
        ctx.fillStyle = "rgba(255,240,200,0.7)";
        ctx.beginPath();
        ctx.ellipse(cx, fy + fh / 2 + 2, fw / 4, fh / 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      info.textContent = `第 ${windsPassed} / ${windsTotal} 阵风 · 火焰 ${Math.round(flame * 100)}%`;
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    let rotating = false;
    function startRot(e) {
      if (aborted) return;
      rotating = true;
      updateRot(e);
    }
    function updateRot(e) {
      if (!rotating || aborted) return;
      e.preventDefault();
      const p = getPos(e);
      shieldAng = Math.atan2(p.y - cy, p.x - cx);
      draw();
    }
    function endRot() { rotating = false; }

    canvas.addEventListener("mousedown", startRot);
    canvas.addEventListener("mousemove", updateRot);
    canvas.addEventListener("mouseup", endRot);
    canvas.addEventListener("mouseleave", endRot);
    canvas.addEventListener("touchstart", e => { startRot(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", e => { updateRot(e); }, { passive: false });
    canvas.addEventListener("touchend", endRot);

    function loop() {
      if (aborted) return;
      // 风吹火焰衰减
      if (windActive) {
        const angDiff = Math.abs(angleDiff(windAng - shieldAng));
        // 挡住则衰减慢，没挡住则快
        const block = angDiff < 0.6 ? 1 : 0;
        const decay = block ? 0.002 : 0.012;
        flame = Math.max(0, flame - decay);
        if (flame <= 0) {
          endGame(false);
          return;
        }
      } else {
        // 没风时缓慢恢复
        flame = Math.min(1, flame + 0.003);
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function angleDiff(d) {
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    function startGame() {
      if (aborted || started) return;
      started = true;
      startBtn.disabled = true;
      flame = 1.0;
      windsPassed = 0;
      windsSurvived = 0;
      nextWind();
      rafId = requestAnimationFrame(loop);
    }

    function nextWind() {
      if (aborted) return;
      if (windsPassed >= windsTotal) {
        endGame(true);
        return;
      }
      windsPassed++;
      windAng = Math.random() * Math.PI * 2;
      windActive = true;
      windTimer = setTimeout(() => {
        if (aborted) return;
        if (flame > 0) windsSurvived++;
        windActive = false;
        gapTimer = setTimeout(nextWind, cd.gap || 800);
      }, cd.duration || 2500);
    }

    function endGame(success) {
      if (aborted) return;
      aborted = true;
      if (windTimer) clearTimeout(windTimer);
      if (gapTimer) clearTimeout(gapTimer);
      if (rafId) cancelAnimationFrame(rafId);
      windActive = false;
      startBtn.disabled = true;
      confirmBtn.disabled = false;
      confirmBtn.textContent = success ? "完成" : "继续";
    }

    startBtn.onclick = startGame;

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || !started || aborted && !confirmBtn.dataset.ready) {
        // 防止 endGame 后多次点击
      }
      if (confirmBtn.disabled) return;
      // 已经 endGame
      aborted = true;
      confirmBtn.disabled = true;
      const ratio = windsSurvived / Math.max(1, windsTotal);
      const thresholds = cd.thresholds || [];
      let matched = cd.fallback || { tag: "miss", label: "——灭了", next: null };
      for (const t of thresholds) {
        if (ratio >= t.min) { matched = t; break; }
      }
      Saves.saveCandleRecord(currentNodeId, windsSurvived, windsTotal, ratio, matched.tag);
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
      reading.className = "cd-reading";
      reading.innerHTML = `<div class="cd-reading-title">${matched.label || "解读"} · 守住 ${windsSurvived} / ${windsTotal} 阵风</div>
        <div class="cd-reading-text">${matched.text || ""}</div>
        <button class="cd-reading-close">继续</button>`;
      reading.querySelector(".cd-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (windTimer) clearTimeout(windTimer);
        if (gapTimer) clearTimeout(gapTimer);
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runDial(dl, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "dial-layer";
    layer.id = "dial-layer";
    const target = String(dl.target || "");
    layer.innerHTML = `
      <div class="dl-prompt">${dl.prompt || "拨出你记得的号码"}</div>
      <div class="dl-display" id="dl-display"></div>
      <div class="dl-info" id="dl-info"></div>
      <div class="dl-pad" id="dl-pad"></div>
      <div class="dl-actions">
        <button class="dl-back" id="dl-back">退格</button>
        <button class="dl-clear">清空</button>
        <button class="dl-confirm" id="dl-confirm" disabled>拨号</button>
      </div>
    `;
    const display = layer.querySelector("#dl-display");
    const info = layer.querySelector("#dl-info");
    const pad = layer.querySelector("#dl-pad");
    const backBtn = layer.querySelector("#dl-back");
    const clearBtn = layer.querySelector(".dl-clear");
    const confirmBtn = layer.querySelector("#dl-confirm");

    let aborted = false;
    let dialed = "";
    const previewMs = dl.preview ?? 4000;

    // 预览阶段
    function showPreview() {
      if (previewMs > 0) {
        display.textContent = target;
        display.classList.add("dl-preview");
        info.textContent = `记住这个号码… (${Math.ceil(previewMs / 1000)}s)`;
        confirmBtn.disabled = true;
        setTimeout(() => {
          if (aborted) return;
          display.textContent = "";
          display.classList.remove("dl-preview");
          info.textContent = "拨出刚才的号码——";
          buildPad();
        }, previewMs);
      } else {
        info.textContent = "拨出号码——";
        buildPad();
      }
    }

    function buildPad() {
      pad.innerHTML = "";
      const layout = ["1","2","3","4","5","6","7","8","9","*","0","#"];
      layout.forEach(n => {
        const b = document.createElement("button");
        b.className = "dl-key";
        b.textContent = n;
        b.dataset.key = n;
        b.onclick = () => {
          if (aborted) return;
          if (dialed.length >= 12) return;
          dialed += n;
          updateDisplay();
        };
        pad.appendChild(b);
      });
    }

    function updateDisplay() {
      display.textContent = dialed;
      confirmBtn.disabled = dialed.length === 0;
    }

    backBtn.onclick = () => {
      if (aborted) return;
      dialed = dialed.slice(0, -1);
      updateDisplay();
    };
    clearBtn.onclick = () => {
      if (aborted) return;
      dialed = "";
      updateDisplay();
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      backBtn.disabled = true;
      clearBtn.disabled = true;
      pad.querySelectorAll(".dl-key").forEach(b => b.disabled = true);
      const correct = dialed === target ? 1 : (dialed.length > 0 ? Math.max(0, dialed.length / target.length * 0.5) : 0);
      const thresholds = dl.thresholds || [];
      let matched = dl.fallback || { tag: "miss", label: "——拨错了", next: null };
      for (const t of thresholds) {
        if (correct >= t.min) { matched = t; break; }
      }
      Saves.saveDialRecord(currentNodeId, dialed, target, correct, matched.tag);
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
      reading.className = "dl-reading";
      reading.innerHTML = `<div class="dl-reading-title">${matched.label || "解读"} · 你拨的：${dialed} / 目标：${target}</div>
        <div class="dl-reading-text">${matched.text || ""}</div>
        <button class="dl-reading-close">继续</button>`;
      reading.querySelector(".dl-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    showPreview();
  }

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
  function runFoggy(fg, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "foggy-layer";
    layer.id = "foggy-layer";
    layer.innerHTML = `
      <div class="fg-prompt">${fg.prompt || "在起雾的玻璃上拖动手指——描绘那个形状"}</div>
      <div class="fg-stage">
        <canvas class="fg-canvas" id="fg-canvas"></canvas>
        <div class="fg-info" id="fg-info">描绘：0%</div>
      </div>
      <div class="fg-actions">
        <button class="fg-reset">擦掉重画</button>
        <button class="fg-confirm" id="fg-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#fg-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#fg-info");
    const confirmBtn = layer.querySelector("#fg-confirm");
    const resetBtn = layer.querySelector(".fg-reset");

    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let aborted = false;
    const hintPath = fg.hintPath || [];
    let mask = null, maskCtx = null;
    let tgtMask = null, tgtMaskCtx = null;
    const GRID = 80;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      mask = document.createElement("canvas");
      mask.width = GRID; mask.height = GRID;
      maskCtx = mask.getContext("2d");
      tgtMask = document.createElement("canvas");
      tgtMask.width = GRID; tgtMask.height = GRID;
      tgtMaskCtx = tgtMask.getContext("2d");
      drawFog();
      drawTargetMask();
    }

    function drawFog() {
      const w = canvas.width, h = canvas.height;
      // 雾面背景
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "rgba(220,225,235,0.85)");
      grd.addColorStop(1, "rgba(180,190,210,0.85)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      // 模糊纹理（伪雾点）
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 0, Math.PI * 2);
        ctx.fill();
      }
      // 显示淡淡的目标轮廓（提示）
      if (hintPath.length >= 2) {
        ctx.strokeStyle = "rgba(120,140,180,0.25)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        hintPath.forEach((p, i) => {
          const x = p.x * w, y = p.y * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (maskCtx) maskCtx.clearRect(0, 0, GRID, GRID);
    }

    function drawTargetMask() {
      tgtMaskCtx.clearRect(0, 0, GRID, GRID);
      if (hintPath.length < 2) return;
      tgtMaskCtx.fillStyle = "#fff";
      tgtMaskCtx.strokeStyle = "#fff";
      tgtMaskCtx.lineWidth = 6;
      tgtMaskCtx.beginPath();
      hintPath.forEach((p, i) => {
        const x = p.x * GRID, y = p.y * GRID;
        if (i === 0) tgtMaskCtx.moveTo(x, y);
        else tgtMaskCtx.lineTo(x, y);
      });
      tgtMaskCtx.stroke();
      // 形成粗路径mask
      tgtMaskCtx.lineWidth = 8;
      tgtMaskCtx.stroke();
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function markMask(x, y) {
      if (!maskCtx) return;
      const gx = Math.max(0, Math.min(GRID - 1, Math.floor((x / canvas.width) * GRID)));
      const gy = Math.max(0, Math.min(GRID - 1, Math.floor((y / canvas.height) * GRID)));
      maskCtx.fillStyle = "#fff";
      maskCtx.fillRect(gx - 1, gy - 1, 3, 3);
    }

    function clearAt(x, y) {
      // 在玻璃上"擦"出透明区，模拟手指划开雾
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 恢复透出的"窗外"暗色（用半透黑覆盖让笔迹可见）
      ctx.fillStyle = "rgba(20,30,50,0.35)";
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      markMask(x, y);
    }

    function startDraw(e) {
      if (aborted) return;
      isDrawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      clearAt(p.x, p.y);
      updateCoverage();
    }
    function moveDraw(e) {
      if (!isDrawing || aborted) return;
      e.preventDefault();
      const p = getPos(e);
      const dx = p.x - lastX, dy = p.y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 6));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        clearAt(lastX + dx * t, lastY + dy * t);
      }
      lastX = p.x; lastY = p.y;
      updateCoverage();
    }
    function endDraw() { isDrawing = false; }

    function coverage() {
      if (!maskCtx || !tgtMaskCtx) return 0;
      const a = maskCtx.getImageData(0, 0, GRID, GRID).data;
      const b = tgtMaskCtx.getImageData(0, 0, GRID, GRID).data;
      let inter = 0, union = 0;
      for (let i = 0; i < a.length; i += 4) {
        const pa = a[i] > 128, pb = b[i] > 128;
        if (pa && pb) inter++;
        if (pa || pb) union++;
      }
      return union > 0 ? inter / union : 0;
    }

    function updateCoverage() {
      const c = coverage();
      info.textContent = `描绘：${Math.round(c * 100)}%`;
      const minC = fg.min || 0.3;
      if (c >= minC) confirmBtn.disabled = false;
    }

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", moveDraw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", e => { startDraw(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", e => { moveDraw(e); }, { passive: false });
    canvas.addEventListener("touchend", endDraw);

    resetBtn.onclick = () => {
      if (aborted) return;
      drawFog();
      updateCoverage();
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
      isDrawing = false;
      const c = coverage();
      const thresholds = fg.thresholds || [];
      let matched = fg.fallback || { tag: "miss", label: "——没成", next: null };
      for (const t of thresholds) {
        if (c >= t.min) { matched = t; break; }
      }
      Saves.saveFoggyRecord(currentNodeId, c, fg.shape || "unknown", matched.tag);
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
      reading.className = "fg-reading";
      reading.innerHTML = `<div class="fg-reading-title">${matched.label || "解读"} · 描绘 ${Math.round(c * 100)}%</div>
        <div class="fg-reading-text">${matched.text || ""}</div>
        <button class="fg-reading-close">继续</button>`;
      reading.querySelector(".fg-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runSugar(sg, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "sugar-layer";
    layer.id = "sugar-layer";
    const cols = sg.grid?.cols || 4;
    const rows = sg.grid?.rows || 3;
    const cellPx = sg.grid?.cell || 56;
    layer.innerHTML = `
      <div class="sg-prompt">${sg.prompt || "把糖块拖到对应位置——拼出图案"}</div>
      <div class="sg-stage" id="sg-stage"></div>
      <div class="sg-info" id="sg-info">已就位：0 / ${sg.pieces?.length || 0}</div>
      <div class="sg-actions">
        <button class="sg-reset">重置</button>
        <button class="sg-confirm" id="sg-confirm" disabled>确认</button>
      </div>
    `;
    const stage = layer.querySelector("#sg-stage");
    const info = layer.querySelector("#sg-info");
    const confirmBtn = layer.querySelector("#sg-confirm");
    const resetBtn = layer.querySelector(".sg-reset");

    let aborted = false;
    const pieces = (sg.pieces || []).map(p => ({
      ...p,
      x: p.x ?? 0.1,
      y: p.y ?? 0.1,
      placed: false
    }));
    const total = pieces.length;
    let placedCount = 0;

    // 棋盘背景
    const board = document.createElement("div");
    board.className = "sg-board";
    board.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    board.style.gridTemplateRows = `repeat(${rows}, ${cellPx}px)`;
    for (let i = 0; i < cols * rows; i++) {
      const c = document.createElement("div");
      c.className = "sg-cell";
      board.appendChild(c);
    }
    stage.appendChild(board);

    function targetCell(gx, gy) {
      return board.children[gy * cols + gx];
    }

    function makePiece(p, idx) {
      const elDom = document.createElement("div");
      elDom.className = "sg-piece";
      elDom.dataset.idx = idx;
      const cw = p.shape?.[0]?.length || 1;
      const ch = p.shape?.length || 1;
      elDom.style.width = (cw * cellPx - 6) + "px";
      elDom.style.height = (ch * cellPx - 6) + "px";
      elDom.style.background = p.color || "#ff8a8a";
      elDom.style.left = (p.x * 100) + "%";
      elDom.style.top = (p.y * 100) + "%";
      elDom.textContent = p.label || "";
      let drag = false, ox = 0, oy = 0;
      function start(e) {
        if (aborted || p.placed) return;
        drag = true;
        const t = e.touches ? e.touches[0] : e;
        const r = elDom.getBoundingClientRect();
        ox = t.clientX - r.left;
        oy = t.clientY - r.top;
        e.preventDefault();
      }
      function move(e) {
        if (!drag || aborted) return;
        e.preventDefault();
        const t = e.touches ? e.touches[0] : e;
        const sr = stage.getBoundingClientRect();
        let nx = (t.clientX - sr.left - ox) / sr.width;
        let ny = (t.clientY - sr.top - oy) / sr.height;
        nx = Math.max(0, Math.min(0.95, nx));
        ny = Math.max(0, Math.min(0.95, ny));
        elDom.style.left = (nx * 100) + "%";
        elDom.style.top = (ny * 100) + "%";
      }
      function end(e) {
        if (!drag || aborted) return;
        drag = false;
        // 检查是否落在 target 格附近
        const pr = elDom.getBoundingClientRect();
        const br = board.getBoundingClientRect();
        const cx = pr.left + pr.width / 2;
        const cy = pr.top + pr.height / 2;
        const gx = Math.floor((cx - br.left) / cellPx);
        const gy = Math.floor((cy - br.top) / cellPx);
        const tg = p.target;
        if (gx === tg.gx && gy === tg.gy) {
          p.placed = true;
          elDom.classList.add("placed");
          const cell = targetCell(gx, gy);
          if (cell) {
            const cr = cell.getBoundingClientRect();
            const sr = stage.getBoundingClientRect();
            elDom.style.left = ((cr.left - sr.left) / sr.width * 100 + 0.5) + "%";
            elDom.style.top = ((cr.top - sr.top) / sr.height * 100 + 0.5) + "%";
          }
          placedCount++;
          info.textContent = `已就位：${placedCount} / ${total}`;
          if (placedCount / total >= (sg.min || 0.6)) confirmBtn.disabled = false;
        }
      }
      elDom.addEventListener("mousedown", start);
      elDom.addEventListener("mousemove", move);
      elDom.addEventListener("mouseup", end);
      elDom.addEventListener("touchstart", start, { passive: false });
      elDom.addEventListener("touchmove", move, { passive: false });
      elDom.addEventListener("touchend", end);
      stage.appendChild(elDom);
      return elDom;
    }

    const pieceDoms = pieces.map((p, i) => makePiece(p, i));

    resetBtn.onclick = () => {
      if (aborted) return;
      pieces.forEach((p, i) => {
        p.placed = false;
        pieceDoms[i].classList.remove("placed");
        pieceDoms[i].style.left = (p.x * 100) + "%";
        pieceDoms[i].style.top = (p.y * 100) + "%";
      });
      placedCount = 0;
      info.textContent = `已就位：0 / ${total}`;
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
      pieceDoms.forEach(d => d.style.pointerEvents = "none");
      const ratio = placedCount / Math.max(1, total);
      const thresholds = sg.thresholds || [];
      let matched = sg.fallback || { tag: "miss", label: "——没拼好", next: null };
      for (const t of thresholds) {
        if (ratio >= t.min) { matched = t; break; }
      }
      Saves.saveSugarRecord(currentNodeId, placedCount, total, matched.tag);
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
      reading.className = "sg-reading";
      reading.innerHTML = `<div class="sg-reading-title">${matched.label || "解读"} · ${placedCount} / ${total} 块就位</div>
        <div class="sg-reading-text">${matched.text || ""}</div>
        <button class="sg-reading-close">继续</button>`;
      reading.querySelector(".sg-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runChime(ch, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "chime-layer";
    layer.id = "chime-layer";
    layer.innerHTML = `
      <div class="ch-prompt">${ch.prompt || "调整钟摆角度——让它的音与目标共振"}</div>
      <div class="ch-stage">
        <canvas class="ch-canvas" id="ch-canvas"></canvas>
        <div class="ch-info" id="ch-info">音差：——</div>
      </div>
      <div class="ch-actions">
        <button class="ch-strike" id="ch-strike">敲一下</button>
        <button class="ch-confirm" id="ch-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ch-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ch-info");
    const strikeBtn = layer.querySelector("#ch-strike");
    const confirmBtn = layer.querySelector("#ch-confirm");

    let aborted = false;
    let angle = 0;          // 当前钟摆角度（度，-90~90）
    let dragging = false;
    const target = ch.target ?? 35;
    const tolerance = ch.tolerance ?? 5;
    let striking = 0;        // 振动幅度
    let struck = false;
    let rafId = null;
    let cx = 0, cy = 0, R = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cx = canvas.width / 2;
      cy = canvas.height * 0.3;
      R = Math.min(canvas.width, canvas.height) * 0.35;
      draw();
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 背景
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#3a3a5a");
      grd.addColorStop(1, "#1a1a2a");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      // 横梁
      ctx.fillStyle = "#5a4030";
      ctx.fillRect(cx - 80, cy - 12, 160, 8);
      // 目标角度刻度
      ctx.strokeStyle = "rgba(255,200,120,0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      const tr = target * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(tr) * R, cy + Math.cos(tr) * R);
      ctx.stroke();
      ctx.setLineDash([]);
      // 目标标签
      ctx.fillStyle = "rgba(255,200,120,0.7)";
      ctx.font = "12px serif";
      ctx.fillText(`目标 ${target}°`, cx + Math.sin(tr) * R + 8, cy + Math.cos(tr) * R);
      // 钟摆
      const ar = angle * Math.PI / 180;
      const px = cx + Math.sin(ar) * (R + striking * 8);
      const py = cy + Math.cos(ar) * (R + striking * 8);
      ctx.strokeStyle = "#a89066";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      // 钟
      const bellR = 24 + striking * 6;
      const bellGrd = ctx.createRadialGradient(px - 6, py - 6, 4, px, py, bellR);
      bellGrd.addColorStop(0, "#e8c890");
      bellGrd.addColorStop(1, "#8a6040");
      ctx.fillStyle = bellGrd;
      ctx.beginPath();
      ctx.arc(px, py, bellR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a2810";
      ctx.lineWidth = 2;
      ctx.stroke();
      // 振动波
      if (struck && striking > 0.05) {
        for (let i = 1; i <= 3; i++) {
          ctx.strokeStyle = `rgba(255,220,150,${0.3 * striking / i})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, bellR + i * 10 * striking, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 当前角度
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "14px serif";
      ctx.fillText(`当前 ${angle.toFixed(0)}°`, 10, h - 12);
    }

    function loop() {
      if (aborted) return;
      if (struck) {
        striking = Math.max(0, striking - 0.012);
        if (striking < 0.02) { struck = false; striking = 0; }
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function startDrag(e) {
      if (aborted) return;
      dragging = true;
      updateAngle(e);
    }
    function updateAngle(e) {
      if (!dragging || aborted) return;
      e.preventDefault();
      const p = getPos(e);
      const dx = p.x - cx, dy = p.y - cy;
      angle = Math.atan2(dx, dy) * 180 / Math.PI;
      angle = Math.max(-90, Math.min(90, angle));
      const diff = Math.abs(angle - target);
      info.textContent = `音差：${diff.toFixed(1)}°`;
      if (diff <= tolerance) confirmBtn.disabled = false;
    }
    function endDrag() { dragging = false; }

    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", updateAngle);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);
    canvas.addEventListener("touchstart", e => { startDrag(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", e => { updateAngle(e); }, { passive: false });
    canvas.addEventListener("touchend", endDrag);

    strikeBtn.onclick = () => {
      if (aborted || struck) return;
      struck = true;
      striking = 1.0;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      strikeBtn.disabled = true;
      dragging = false;
      if (rafId) cancelAnimationFrame(rafId);
      const diff = Math.abs(angle - target);
      const thresholds = ch.thresholds || [];
      let matched = ch.fallback || { tag: "miss", label: "——没对上", next: null };
      for (const t of thresholds) {
        if (diff <= t.max) { matched = t; break; }
      }
      Saves.saveChimeRecord(currentNodeId, diff, matched.tag);
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
      reading.className = "ch-reading";
      reading.innerHTML = `<div class="ch-reading-title">${matched.label || "解读"} · 音差 ${diff.toFixed(1)}°</div>
        <div class="ch-reading-text">${matched.text || ""}</div>
        <button class="ch-reading-close">继续</button>`;
      reading.querySelector(".ch-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
    rafId = requestAnimationFrame(loop);
  }

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
  function runHourglass(hg, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "hourglass-layer";
    layer.id = "hourglass-layer";
    layer.innerHTML = `
      <div class="hg-prompt">${hg.prompt || "在沙漏完前翻转——让它在指定时刻落完"}</div>
      <div class="hg-stage">
        <canvas class="hg-canvas" id="hg-canvas"></canvas>
        <div class="hg-info" id="hg-info">点击「开始」计时</div>
      </div>
      <div class="hg-actions">
        <button class="hg-start" id="hg-start">开始</button>
        <button class="hg-flip" id="hg-flip" disabled>翻转</button>
        <button class="hg-confirm" id="hg-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#hg-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#hg-info");
    const startBtn = layer.querySelector("#hg-start");
    const flipBtn = layer.querySelector("#hg-flip");
    const confirmBtn = layer.querySelector("#hg-confirm");

    let aborted = false;
    let started = false;
    let flipped = false;
    let startTime = 0;
    let flipTime = 0;
    let rafId = null;
    const total = hg.duration || 8000;
    const target = hg.target ?? 5000;
    const tolerance = hg.tolerance ?? 600;
    let cx = 0, cy = 0, glassH = 0, glassW = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      glassH = Math.min(canvas.height * 0.7, 280);
      glassW = 80;
      draw();
    }

    function sandProgress(now) {
      if (!started) return 0;
      const elapsed = now - startTime;
      return Math.min(1, elapsed / total);
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 背景
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#4a3a2a");
      grd.addColorStop(1, "#2a1a10");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      // 沙漏外框
      const topY = cy - glassH / 2;
      const botY = cy + glassH / 2;
      const neckY = cy;
      ctx.strokeStyle = "rgba(216,180,140,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - glassW, topY);
      ctx.lineTo(cx + glassW, topY);
      ctx.lineTo(cx + 4, neckY);
      ctx.lineTo(cx + glassW, botY);
      ctx.lineTo(cx - glassW, botY);
      ctx.lineTo(cx - 4, neckY);
      ctx.closePath();
      ctx.stroke();
      // 顶底装饰
      ctx.fillStyle = "#5a4030";
      ctx.fillRect(cx - glassW - 8, topY - 6, (glassW + 8) * 2, 6);
      ctx.fillRect(cx - glassW - 8, botY, (glassW + 8) * 2, 6);

      const now = performance.now();
      const p = sandProgress(now);

      // 上半沙（剩余）
      if (!flipped) {
        const remainTop = 1 - p;
        // 三角形区域填充
        ctx.fillStyle = "#e8c890";
        ctx.beginPath();
        const topFillH = (neckY - topY) * remainTop;
        const ratio = remainTop;
        ctx.moveTo(cx - glassW * ratio, neckY - topFillH);
        ctx.lineTo(cx + glassW * ratio, neckY - topFillH);
        ctx.lineTo(cx, neckY);
        ctx.closePath();
        ctx.fill();
        // 下半沙（堆积）
        const bottomFill = p;
        if (bottomFill > 0) {
          const fillH = (botY - neckY) * bottomFill;
          ctx.beginPath();
          ctx.moveTo(cx - glassW * bottomFill, botY);
          ctx.lineTo(cx + glassW * bottomFill, botY);
          ctx.lineTo(cx + glassW * bottomFill * 0.4, botY - fillH);
          ctx.lineTo(cx - glassW * bottomFill * 0.4, botY - fillH);
          ctx.closePath();
          ctx.fill();
        }
        // 流沙
        if (p > 0 && p < 1) {
          ctx.strokeStyle = "rgba(232,200,144,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, neckY);
          ctx.lineTo(cx, neckY + (botY - neckY) * Math.min(1, p * 2));
          ctx.stroke();
        }
      } else {
        // 翻转后：上半重新填，进度按 flipTime 起算
        const flipElapsed = now - flipTime;
        const p2 = Math.min(1, flipElapsed / total);
        const remainTop = p2;
        const bottomFill = 1 - p2;
        ctx.fillStyle = "#e8c890";
        // 上半（剩余翻转后是从满到空）
        const topFillH = (neckY - topY) * remainTop;
        const ratio = remainTop;
        ctx.beginPath();
        ctx.moveTo(cx - glassW * ratio, neckY - topFillH);
        ctx.lineTo(cx + glassW * ratio, neckY - topFillH);
        ctx.lineTo(cx, neckY);
        ctx.closePath();
        ctx.fill();
        // 下半
        if (bottomFill > 0) {
          const fillH = (botY - neckY) * bottomFill;
          ctx.beginPath();
          ctx.moveTo(cx - glassW * bottomFill, botY);
          ctx.lineTo(cx + glassW * bottomFill, botY);
          ctx.lineTo(cx + glassW * bottomFill * 0.4, botY - fillH);
          ctx.lineTo(cx - glassW * bottomFill * 0.4, botY - fillH);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 信息
      const elapsed = started ? (now - startTime) : 0;
      info.textContent = `已过：${(elapsed / 1000).toFixed(1)}s · 目标 ${(target / 1000).toFixed(1)}s${flipped ? " · 已翻转" : ""}`;
    }

    function loop() {
      if (aborted) return;
      draw();
      // 沙落完自动结束
      const now = performance.now();
      if (started) {
        const elapsed = now - startTime;
        if (!flipped && elapsed >= total) {
          // 沙落完未翻转，自动结束
          endGame(now);
          return;
        }
        if (flipped) {
          const flipElapsed = now - flipTime;
          if (flipElapsed >= total) {
            endGame(now);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    }

    function startGame() {
      if (aborted || started) return;
      started = true;
      startTime = performance.now();
      startBtn.disabled = true;
      flipBtn.disabled = false;
      rafId = requestAnimationFrame(loop);
    }

    function flipGlass() {
      if (aborted || !started || flipped) return;
      flipped = true;
      flipTime = performance.now();
      flipBtn.disabled = true;
    }

    function endGame(now) {
      if (aborted) return;
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      startBtn.disabled = true;
      flipBtn.disabled = true;
      confirmBtn.disabled = false;
      // 计算"目标时刻"的偏差
      // 若翻转：错误 = |target - (flipTime - startTime)|
      // 若未翻转且沙落完：错误 = |total - target|
      let error;
      if (flipped) {
        error = Math.abs(target - (flipTime - startTime));
      } else {
        error = Math.abs(total - target);
      }
      confirmBtn.dataset.error = error;
    }

    startBtn.onclick = startGame;
    flipBtn.onclick = flipGlass;

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || aborted && !confirmBtn.dataset.error) return;
      if (confirmBtn.disabled) return;
      aborted = true;
      confirmBtn.disabled = true;
      const error = parseFloat(confirmBtn.dataset.error || "0");
      const thresholds = hg.thresholds || [];
      let matched = hg.fallback || { tag: "miss", label: "——没卡上", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? 1000)) { matched = t; break; }
      }
      Saves.saveHourglassRecord(currentNodeId, error, matched.tag);
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
      reading.className = "hg-reading";
      reading.innerHTML = `<div class="hg-reading-title">${matched.label || "解读"} · 偏差 ${(error / 1000).toFixed(2)}s</div>
        <div class="hg-reading-text">${matched.text || ""}</div>
        <button class="hg-reading-close">继续</button>`;
      reading.querySelector(".hg-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runKite(k, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "kite-layer";
    layer.id = "kite-layer";
    layer.innerHTML = `
      <div class="kt-prompt">${k.prompt || "牵引风筝穿过云阵，到达指定高度——"}</div>
      <div class="kt-stage">
        <canvas class="kt-canvas" id="kt-canvas"></canvas>
        <div class="kt-info" id="kt-info">按住风筝拖动 · 目标高度 ${(k.target ?? 80)}%</div>
      </div>
      <div class="kt-actions">
        <button class="kt-start" id="kt-start">开始</button>
        <button class="kt-confirm" id="kt-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#kt-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#kt-info");
    const startBtn = layer.querySelector("#kt-start");
    const confirmBtn = layer.querySelector("#kt-confirm");

    let aborted = false;
    let started = false;
    let ended = false;
    let startTime = 0;
    let rafId = null;
    const total = k.duration || 12000;
    const targetH = (k.target ?? 80) / 100;
    const obstacleCount = k.obstacles ?? 6;
    let kite = { x: 0, y: 0.85, dragging: false, vx: 0, vy: 0 };
    let obstacles = [];
    let hits = 0;
    let maxTopReached = 1.0;  // y越小越高
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width;
      ch = canvas.height;
      if (!started) {
        kite.x = cw / 2;
        kite.y = ch * 0.85;
      }
      buildObstacles();
      draw();
    }

    function buildObstacles() {
      obstacles = [];
      const types = ["cloud", "bird"];
      for (let i = 0; i < obstacleCount; i++) {
        obstacles.push({
          x: Math.random() * cw,
          y: ch * (0.15 + Math.random() * 0.6),
          r: 18 + Math.random() * 14,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 0.4,
          type: types[Math.floor(Math.random() * types.length)],
        });
      }
    }

    function draw() {
      const w = cw, h = ch;
      // 天空渐变
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#9ec9ff");
      grad.addColorStop(1, "#fde8f0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // 远山
      ctx.fillStyle = "rgba(120, 100, 140, 0.4)";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.85);
      ctx.lineTo(w * 0.2, h * 0.7);
      ctx.lineTo(w * 0.45, h * 0.82);
      ctx.lineTo(w * 0.7, h * 0.68);
      ctx.lineTo(w, h * 0.8);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      // 目标高度线
      const targetY = h * (1 - targetH);
      ctx.strokeStyle = "rgba(255, 100, 140, 0.5)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(w, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 100, 140, 0.7)";
      ctx.font = "12px sans-serif";
      ctx.fillText(`目标 ${Math.round(targetH * 100)}%`, 8, targetY - 4);

      // 障碍
      obstacles.forEach(o => {
        if (o.type === "cloud") {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
          ctx.arc(o.x + o.r * 0.8, o.y + 2, o.r * 0.8, 0, Math.PI * 2);
          ctx.arc(o.x - o.r * 0.8, o.y + 2, o.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#444";
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(o.x - o.r, o.y - o.r * 0.4);
          ctx.lineTo(o.x - o.r * 0.4, o.y);
          ctx.lineTo(o.x - o.r, o.y + o.r * 0.4);
          ctx.closePath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(o.x + o.r, o.y - o.r * 0.4);
          ctx.lineTo(o.x + o.r * 0.4, o.y);
          ctx.lineTo(o.x + o.r, o.y + o.r * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      });

      // 风筝线
      ctx.strokeStyle = "rgba(80,60,80,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, h);
      ctx.lineTo(kite.x, kite.y);
      ctx.stroke();
      // 风筝
      ctx.save();
      ctx.translate(kite.x, kite.y);
      ctx.fillStyle = "#ff6b9d";
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 飘带
      ctx.strokeStyle = "rgba(255,200,220,0.8)";
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.quadraticCurveTo(6, 24, 0, 32);
      ctx.quadraticCurveTo(-6, 24, 0, 16);
      ctx.stroke();
      ctx.restore();

      // 信息
      const heightPct = Math.round((1 - kite.y / h) * 100);
      const reachedTarget = (1 - kite.y / h) >= targetH;
      info.textContent = `高度 ${heightPct}% · 碰撞 ${hits} 次${reachedTarget ? " · 已到达目标" : ""}${started && !ended ? " · 拖动风筝" : ""}`;
    }

    function loop(now) {
      if (aborted) return;
      // 障碍移动
      obstacles.forEach(o => {
        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -o.r) o.x = cw + o.r;
        if (o.x > cw + o.r) o.x = -o.r;
        if (o.y < ch * 0.1) o.vy = Math.abs(o.vy);
        if (o.y > ch * 0.8) o.vy = -Math.abs(o.vy);
        // 碰撞检测
        if (!ended) {
          const dx = o.x - kite.x;
          const dy = o.y - kite.y;
          if (Math.hypot(dx, dy) < o.r + 14) {
            hits++;
            // 推开
            o.vx = -o.vx;
            o.x += o.vx * 6;
            o.y += o.vy * 6;
            kite.vy += 0.4;  // 略微下落
          }
        }
      });
      // 风筝重力（不下垂太多）
      if (!kite.dragging && !ended) {
        kite.vy += 0.05;
        kite.y += kite.vy;
        if (kite.y > ch - 20) { kite.y = ch - 20; kite.vy = 0; }
        if (kite.y < 0) { kite.y = 0; kite.vy = 0; }
      }
      if (kite.y < maxTopReached) maxTopReached = kite.y;
      draw();
      // 时间到自动结束
      if (started && !ended && (now - startTime) >= total) {
        endGame();
      }
      if (!aborted) rafId = requestAnimationFrame(loop);
    }

    function endGame() {
      if (ended) return;
      ended = true;
      confirmBtn.disabled = false;
      startBtn.disabled = true;
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }

    function onDown(e) {
      if (!started || ended) return;
      const p = getPos(e);
      if (Math.hypot(p.x - kite.x, p.y - kite.y) < 30) {
        kite.dragging = true;
        kite.vx = 0; kite.vy = 0;
      }
    }
    function onMove(e) {
      if (!kite.dragging) return;
      e.preventDefault();
      const p = getPos(e);
      kite.x = Math.max(20, Math.min(cw - 20, p.x));
      kite.y = Math.max(20, Math.min(ch - 20, p.y));
    }
    function onUp() { kite.dragging = false; }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startTime = performance.now();
      startBtn.disabled = true;
      rafId = requestAnimationFrame(loop);
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      confirmBtn.disabled = true;
      // 清理事件
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      const heightPct = (1 - kite.y / ch) * 100;
      const reachedTarget = heightPct >= targetH * 100;
      // 综合评分：碰撞次数 + 是否到达目标
      const error = hits + (reachedTarget ? 0 : 10);
      const thresholds = k.thresholds || [];
      let matched = k.fallback || { tag: "miss", label: "——线断了", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? 5)) { matched = t; break; }
      }
      Saves.saveKiteRecord(currentNodeId, reachedTarget, matched.tag);
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
      reading.className = "kt-reading";
      reading.innerHTML = `<div class="kt-reading-title">${matched.label || "解读"} · 高度 ${Math.round(heightPct)}% · 碰撞 ${hits}</div>
        <div class="kt-reading-text">${matched.text || ""}</div>
        <button class="kt-reading-close">继续</button>`;
      reading.querySelector(".kt-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runLock(lk, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "lock-layer";
    layer.id = "lock-layer";
    const target = String(lk.target || "0000").replace(/[^0-9]/g, "");
    const len = target.length || 4;
    const hints = lk.hints || [];
    const previewMs = lk.preview ?? 4000;
    layer.innerHTML = `
      <div class="lk-prompt">${lk.prompt || "根据线索拨出密码——"}</div>
      <div class="lk-hints" id="lk-hints"></div>
      <div class="lk-dial" id="lk-dial"></div>
      <div class="lk-info" id="lk-info">${previewMs > 0 ? "记住密码预览..." : "拨出密码"}</div>
      <div class="lk-actions">
        <button class="lk-start" id="lk-start">开始</button>
        <button class="lk-confirm" id="lk-confirm" disabled>解锁</button>
      </div>
    `;
    const dialEl = layer.querySelector("#lk-dial");
    const infoEl = layer.querySelector("#lk-info");
    const startBtn = layer.querySelector("#lk-start");
    const confirmBtn = layer.querySelector("#lk-confirm");
    const hintsEl = layer.querySelector("#lk-hints");

    if (hints.length) {
      hintsEl.innerHTML = hints.map(h => `<span class="lk-hint">${h}</span>`).join("");
    } else {
      hintsEl.innerHTML = `<span class="lk-hint">线索隐藏在剧情中</span>`;
    }

    // 构建 N 个数字盘
    const digits = new Array(len).fill(0);
    const digitEls = [];
    for (let i = 0; i < len; i++) {
      const wrap = document.createElement("div");
      wrap.className = "lk-digit";
      wrap.innerHTML = `
        <button class="lk-up" data-i="${i}">▲</button>
        <div class="lk-val" data-i="${i}">0</div>
        <button class="lk-down" data-i="${i}">▼</button>
      `;
      dialEl.appendChild(wrap);
      digitEls.push(wrap.querySelector(".lk-val"));
      wrap.querySelector(".lk-up").onclick = () => {
        digits[i] = (digits[i] + 1) % 10;
        digitEls[i].textContent = digits[i];
      };
      wrap.querySelector(".lk-down").onclick = () => {
        digits[i] = (digits[i] + 9) % 10;
        digitEls[i].textContent = digits[i];
      };
    }

    let started = false;
    let previewing = false;
    let aborted = false;

    function showPreview() {
      previewing = true;
      infoEl.textContent = `密码预览：${target.split("").join(" ")}（${(previewMs / 1000).toFixed(1)}s）`;
      for (let i = 0; i < len; i++) {
        digitEls[i].textContent = target[i];
        digitEls[i].classList.add("preview");
      }
      setTimeout(() => {
        if (aborted) return;
        previewing = false;
        for (let i = 0; i < len; i++) {
          digits[i] = 0;
          digitEls[i].textContent = "0";
          digitEls[i].classList.remove("preview");
        }
        infoEl.textContent = "拨出密码";
        confirmBtn.disabled = false;
      }, previewMs);
    }

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startBtn.disabled = true;
      if (previewMs > 0) showPreview();
      else {
        confirmBtn.disabled = false;
        infoEl.textContent = "拨出密码";
      }
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || previewing) return;
      aborted = true;
      confirmBtn.disabled = true;
      const input = digits.join("");
      let correct = 0;
      for (let i = 0; i < len; i++) {
        if (digits[i] === parseInt(target[i])) correct++;
        digitEls[i].classList.add(digits[i] === parseInt(target[i]) ? "ok" : "err");
      }
      Saves.saveLockRecord(currentNodeId, input, target, correct, correct === len ? "perfect" : correct >= 2 ? "good" : "miss");
      const thresholds = lk.thresholds || [];
      let matched = lk.fallback || { tag: "miss", label: "——锁没开", next: null };
      for (const t of thresholds) {
        if (correct >= (t.min ?? 4)) { matched = t; break; }
      }
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
      reading.className = "lk-reading";
      reading.innerHTML = `<div class="lk-reading-title">${matched.label || "解读"} · 正确 ${correct}/${len}</div>
        <div class="lk-reading-text">${matched.text || ""}</div>
        <button class="lk-reading-close">继续</button>`;
      reading.querySelector(".lk-reading-close").onclick = () => {
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
  function runOrigami(og, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "origami-layer";
    layer.id = "origami-layer";
    layer.innerHTML = `
      <div class="og-prompt">${og.prompt || "按步骤折叠纸张——"}</div>
      <div class="og-paper" id="og-paper">
        <div class="og-paper-text">樱·时·信·笺</div>
      </div>
      <div class="og-actions" id="og-actions"></div>
      <div class="og-controls">
        <button class="og-reset">重置</button>
        <button class="og-confirm" disabled>成型解读</button>
      </div>
    `;
    const paper = layer.querySelector("#og-paper");
    const actionsEl = layer.querySelector("#og-actions");
    const confirmBtn = layer.querySelector(".og-confirm");
    const resetBtn = layer.querySelector(".og-reset");

    const steps = og.steps || [];
    const sequence = [];

    steps.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "og-action";
      btn.dataset.id = s.id;
      btn.innerHTML = `<div class="og-action-label">${s.label}</div>
        <div class="og-action-desc">${s.desc || ""}</div>`;
      btn.onclick = () => {
        if (btn.classList.contains("used")) return;
        btn.classList.add("used");
        sequence.push(s.id);
        const crease = document.createElement("div");
        crease.className = `og-crease og-crease-${sequence.length}`;
        paper.appendChild(crease);
        paper.classList.add(`origami-step-${sequence.length}`);
        confirmBtn.disabled = sequence.length < Math.min(og.min || 3, steps.length);
      };
      actionsEl.appendChild(btn);
    });

    resetBtn.onclick = () => {
      sequence.length = 0;
      paper.className = "og-paper";
      paper.querySelectorAll(".og-crease").forEach(c => c.remove());
      actionsEl.querySelectorAll(".og-action.used").forEach(b => b.classList.remove("used"));
      confirmBtn.disabled = true;
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const targets = og.targets || [];
      let matched = og.fallback || { tag: "default", label: "——一张纸", next: null };
      let bestScore = -1;
      for (const t of targets) {
        const tgt = t.steps || [];
        let score = 0;
        const minLen = Math.min(tgt.length, sequence.length);
        for (let i = 0; i < minLen; i++) {
          if (tgt[i] === sequence[i]) score++;
        }
        score = score - Math.abs(tgt.length - sequence.length) * 0.5;
        if (score > bestScore) { bestScore = score; matched = t; }
      }
      Saves.saveOrigamiRecord(currentNodeId, sequence.slice(), matched.tag);
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
      reading.className = "og-reading";
      reading.innerHTML = `<div class="og-reading-title">${matched.label || "解读"}</div>
        <div class="og-reading-text">${matched.text || ""}</div>
        <button class="og-reading-close">继续</button>`;
      reading.querySelector(".og-reading-close").onclick = () => {
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
  function runOrbit(ob, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "orbit-layer";
    layer.id = "orbit-layer";
    layer.innerHTML = `
      <div class="ob-prompt">${ob.prompt || "追踪星轨——"}</div>
      <div class="ob-stage">
        <canvas class="ob-canvas" id="ob-canvas"></canvas>
        <div class="ob-info" id="ob-info">点击「开始」追踪星轨</div>
      </div>
      <div class="ob-actions">
        <button class="ob-start" id="ob-start">开始</button>
        <button class="ob-confirm" id="ob-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ob-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ob-info");
    const startBtn = layer.querySelector("#ob-start");
    const confirmBtn = layer.querySelector("#ob-confirm");

    let aborted = false;
    let started = false;
    let ended = false;
    let startTime = 0;
    let rafId = null;
    const total = ob.duration || 10000;
    const tolerance = ob.tolerance ?? 30;
    const samples = ob.samples ?? 6;
    let cw = 0, ch = 0;
    let stars = [];      // 背景星
    let trail = [];      // 目标星轨迹采样点
    let cursor = { x: 0, y: 0, visible: false };
    let cursorTrail = [];
    let sampleIndex = 0;
    let errors = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width;
      ch = canvas.height;
      buildStars();
      buildTrail();
      draw();
    }

    function buildStars() {
      stars = [];
      for (let i = 0; i < 60; i++) {
        stars.push({
          x: Math.random() * cw,
          y: Math.random() * ch,
          r: 0.5 + Math.random() * 1.5,
          tw: Math.random() * Math.PI * 2,
        });
      }
    }

    function buildTrail() {
      trail = [];
      // 生成椭圆/弧形轨迹
      const cx = cw / 2, cy = ch / 2;
      const rx = Math.min(cw, ch) * 0.35;
      const ry = Math.min(cw, ch) * 0.25;
      const startA = -Math.PI / 2;
      const endA = startA + Math.PI * 1.4;
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1);
        const a = startA + (endA - startA) * t;
        trail.push({
          x: cx + Math.cos(a) * rx,
          y: cy + Math.sin(a) * ry,
          lit: false,
        });
      }
    }

    function draw() {
      const w = cw, h = ch;
      // 夜空背景
      ctx.fillStyle = "#0a0a1f";
      ctx.fillRect(0, 0, w, h);
      // 星
      stars.forEach(s => {
        s.tw += 0.04;
        const alpha = 0.4 + Math.sin(s.tw) * 0.3;
        ctx.fillStyle = `rgba(255,255,220,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 目标轨迹连线（虚线）
      if (started) {
        ctx.strokeStyle = "rgba(180, 200, 255, 0.3)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        // 目标采样点
        trail.forEach((p, i) => {
          ctx.fillStyle = p.lit ? "#7fff9d" : "rgba(255,200,100,0.8)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, i === sampleIndex ? 12 : 8, 0, Math.PI * 2);
          ctx.fill();
          if (i === sampleIndex && !ended) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }

      // 玩家轨迹
      if (cursorTrail.length > 1) {
        ctx.strokeStyle = "rgba(255, 220, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        cursorTrail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      // 光标
      if (cursor.visible) {
        ctx.fillStyle = "#ff8ec7";
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 200, 220, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 信息
      const remain = started && !ended ? Math.max(0, total - (performance.now() - startTime)) : 0;
      info.textContent = started && !ended
        ? `采样 ${sampleIndex}/${samples} · 剩余 ${(remain / 1000).toFixed(1)}s`
        : ended ? `完成 ${sampleIndex}/${samples} 采样` : "点击「开始」追踪星轨";
    }

    function loop() {
      if (aborted) return;
      draw();
      if (started && !ended) {
        const elapsed = performance.now() - startTime;
        if (elapsed >= total) endGame();
      }
      if (!aborted) rafId = requestAnimationFrame(loop);
    }

    function tryHit(x, y) {
      if (!started || ended) return;
      if (sampleIndex >= samples) return;
      const t = trail[sampleIndex];
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < tolerance + 16) {
        t.lit = true;
        errors.push(Math.max(0, d - 8));  // 记录误差
        sampleIndex++;
        if (sampleIndex >= samples) endGame();
      }
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }

    function onDown(e) {
      const p = getPos(e);
      cursor.x = p.x; cursor.y = p.y; cursor.visible = true;
      cursorTrail.push({ x: p.x, y: p.y });
      if (cursorTrail.length > 60) cursorTrail.shift();
      tryHit(p.x, p.y);
    }
    function onMove(e) {
      if (!cursor.visible) return;
      e.preventDefault();
      const p = getPos(e);
      cursor.x = p.x; cursor.y = p.y;
      cursorTrail.push({ x: p.x, y: p.y });
      if (cursorTrail.length > 60) cursorTrail.shift();
    }
    function onUp() { cursor.visible = false; }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    function endGame() {
      if (ended) return;
      ended = true;
      confirmBtn.disabled = false;
    }

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startTime = performance.now();
      startBtn.disabled = true;
      rafId = requestAnimationFrame(loop);
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      confirmBtn.disabled = true;
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      const avgError = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 999;
      const missing = samples - sampleIndex;
      const totalError = avgError + missing * 30;
      Saves.saveOrbitRecord(currentNodeId, totalError, sampleIndex === samples ? "perfect" : sampleIndex >= samples / 2 ? "good" : "miss");
      const thresholds = ob.thresholds || [];
      let matched = ob.fallback || { tag: "miss", label: "——星辰失散", next: null };
      for (const t of thresholds) {
        if (totalError <= (t.max ?? 50)) { matched = t; break; }
      }
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
      reading.className = "ob-reading";
      reading.innerHTML = `<div class="ob-reading-title">${matched.label || "解读"} · 采样 ${sampleIndex}/${samples} · 均偏 ${avgError.toFixed(1)}px</div>
        <div class="ob-reading-text">${matched.text || ""}</div>
        <button class="ob-reading-close">继续</button>`;
      reading.querySelector(".ob-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runFirefly(ff, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "firefly-layer";
    layer.id = "firefly-layer";
    layer.innerHTML = `
      <div class="ff-prompt">${ff.prompt || "拖动光点引导萤火虫归队——"}</div>
      <div class="ff-stage">
        <canvas class="ff-canvas" id="ff-canvas"></canvas>
        <div class="ff-info" id="ff-info">点击「开始」放出光点</div>
      </div>
      <div class="ff-actions">
        <button class="ff-start" id="ff-start">开始</button>
        <button class="ff-confirm" id="ff-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ff-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ff-info");
    const startBtn = layer.querySelector("#ff-start");
    const confirmBtn = layer.querySelector("#ff-confirm");

    let aborted = false;
    let started = false;
    let ended = false;
    let startTime = 0;
    let rafId = null;
    const total = ff.total ?? 8;
    const duration = ff.duration || 15000;
    const tolerance = ff.tolerance ?? 40;
    let cw = 0, ch = 0;
    let fireflies = [];
    let lure = { x: 0, y: 0, visible: false };
    let trail = [];
    let gathered = 0;
    let totalDeviation = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width;
      ch = canvas.height;
      buildFireflies();
      draw();
    }

    function buildFireflies() {
      fireflies = [];
      for (let i = 0; i < total; i++) {
        fireflies.push({
          x: Math.random() * cw,
          y: Math.random() * ch,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 3 + Math.random() * 2,
          twinkle: Math.random() * Math.PI * 2,
          gathered: false,
        });
      }
    }

    function draw() {
      // 夜林背景
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#0a1a10");
      grad.addColorStop(1, "#02080a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      // 远处树林剪影
      ctx.fillStyle = "rgba(20,40,30,0.6)";
      ctx.beginPath();
      ctx.moveTo(0, ch * 0.9);
      for (let i = 0; i <= 10; i++) {
        const x = (cw / 10) * i;
        const y = ch * 0.9 - Math.sin(i * 1.3) * 30 - Math.random() * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cw, ch);
      ctx.lineTo(0, ch);
      ctx.closePath();
      ctx.fill();

      // 萤火虫
      fireflies.forEach(f => {
        if (f.gathered) return;
        f.twinkle += 0.06;
        const alpha = 0.5 + Math.sin(f.twinkle) * 0.4;
        // 光晕
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
        glow.addColorStop(0, `rgba(255,240,150,${alpha * 0.8})`);
        glow.addColorStop(1, "rgba(255,240,150,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2);
        ctx.fill();
        // 核心
        ctx.fillStyle = `rgba(255,255,200,${alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 已归队的萤火虫（聚集点）
      ctx.fillStyle = "rgba(255,255,200,0.3)";
      for (let i = 0; i < gathered; i++) {
        const a = (i / Math.max(1, total)) * Math.PI * 2;
        const gx = cw * 0.5 + Math.cos(a) * 18;
        const gy = ch * 0.92 + Math.sin(a) * 8;
        ctx.beginPath();
        ctx.arc(gx, gy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // 归队目标圈
      ctx.strokeStyle = "rgba(255,240,150,0.4)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cw * 0.5, ch * 0.92, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 玩家光点轨迹
      if (trail.length > 1) {
        ctx.strokeStyle = "rgba(255,255,220,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      // 光点
      if (lure.visible) {
        const lureGlow = ctx.createRadialGradient(lure.x, lure.y, 0, lure.x, lure.y, 28);
        lureGlow.addColorStop(0, "rgba(255,255,255,0.9)");
        lureGlow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = lureGlow;
        ctx.beginPath();
        ctx.arc(lure.x, lure.y, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(lure.x, lure.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 信息
      const remain = started && !ended ? Math.max(0, duration - (performance.now() - startTime)) : 0;
      info.textContent = started && !ended
        ? `归队 ${gathered}/${total} · 剩余 ${(remain / 1000).toFixed(1)}s`
        : ended ? `归队 ${gathered}/${total}` : "点击「开始」放出光点";
    }

    function loop() {
      if (aborted) return;
      // 萤火虫移动 + 被光点吸引
      fireflies.forEach(f => {
        if (f.gathered) return;
        f.x += f.vx; f.y += f.vy;
        if (f.x < 10) f.vx = Math.abs(f.vx);
        if (f.x > cw - 10) f.vx = -Math.abs(f.vx);
        if (f.y < 10) f.vy = Math.abs(f.vy);
        if (f.y > ch - 10) f.vy = -Math.abs(f.vy);
        // 光点吸引
        if (lure.visible) {
          const dx = lure.x - f.x;
          const dy = lure.y - f.y;
          const d = Math.hypot(dx, dy);
          if (d < tolerance * 2.5) {
            f.vx += (dx / d) * 0.15;
            f.vy += (dy / d) * 0.15;
            // 限速
            const sp = Math.hypot(f.vx, f.vy);
            if (sp > 1.8) { f.vx = (f.vx / sp) * 1.8; f.vy = (f.vy / sp) * 1.8; }
          }
        }
        // 到达归队圈
        const dToGoal = Math.hypot(cw * 0.5 - f.x, ch * 0.92 - f.y);
        if (dToGoal < 24) {
          f.gathered = true;
          gathered++;
          totalDeviation += dToGoal;
          if (gathered >= total) endGame();
        }
      });
      draw();
      if (started && !ended && (performance.now() - startTime) >= duration) endGame();
      if (!aborted) rafId = requestAnimationFrame(loop);
    }

    function endGame() {
      if (ended) return;
      ended = true;
      confirmBtn.disabled = false;
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    function onDown(e) {
      if (!started || ended) return;
      const p = getPos(e);
      lure.x = p.x; lure.y = p.y; lure.visible = true;
      trail.push({ x: p.x, y: p.y });
      if (trail.length > 50) trail.shift();
    }
    function onMove(e) {
      if (!lure.visible) return;
      e.preventDefault();
      const p = getPos(e);
      lure.x = p.x; lure.y = p.y;
      trail.push({ x: p.x, y: p.y });
      if (trail.length > 50) trail.shift();
    }
    function onUp() { lure.visible = false; }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startTime = performance.now();
      startBtn.disabled = true;
      rafId = requestAnimationFrame(loop);
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      confirmBtn.disabled = true;
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      const avgDev = gathered ? totalDeviation / gathered : 999;
      const missing = total - gathered;
      const error = avgDev + missing * 30;
      Saves.saveFireflyRecord(currentNodeId, gathered, total, avgDev, gathered === total ? "perfect" : gathered >= total / 2 ? "good" : "miss");
      const thresholds = ff.thresholds || [];
      let matched = ff.fallback || { tag: "miss", label: "——萤火散了", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? 30)) { matched = t; break; }
      }
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
      reading.className = "ff-reading";
      reading.innerHTML = `<div class="ff-reading-title">${matched.label || "解读"} · 归队 ${gathered}/${total}</div>
        <div class="ff-reading-text">${matched.text || ""}</div>
        <button class="ff-reading-close">继续</button>`;
      reading.querySelector(".ff-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runWindchime(wc, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "windchime-layer";
    layer.id = "windchime-layer";
    const target = wc.target || [0.2, 0.35, 0.5, 0.65];
    const tolerance = wc.tolerance ?? 0.05;
    layer.innerHTML = `
      <div class="wc-prompt">${wc.prompt || "拖动风铃片到对应高度"}</div>
      <div class="wc-stage">
        <div class="wc-bar" id="wc-bar"></div>
        <div class="wc-targets" id="wc-targets"></div>
      </div>
      <div class="wc-info" id="wc-info">参考目标线 · 拖动铃片对齐</div>
      <div class="wc-actions">
        <button class="wc-reset">重置</button>
        <button class="wc-confirm" disabled>敲击试音</button>
      </div>
    `;
    const bar = layer.querySelector("#wc-bar");
    const targetsEl = layer.querySelector("#wc-targets");
    const confirmBtn = layer.querySelector(".wc-confirm");
    const resetBtn = layer.querySelector(".wc-reset");
    const infoEl = layer.querySelector("#wc-info");

    // 构建目标线（虚线）
    target.forEach((h, i) => {
      const line = document.createElement("div");
      line.className = "wc-target-line";
      line.style.top = `${h * 100}%`;
      line.dataset.i = i;
      targetsEl.appendChild(line);
    });

    // 构建 4 个铃片（位置随机打乱）
    const positions = target.map((_, i) => i);
    // 随机打乱初始位置
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const chimes = [];
    target.forEach((_, i) => {
      const chime = document.createElement("div");
      chime.className = "wc-chime";
      chime.dataset.i = i;
      // 初始位置打乱
      const initH = 0.1 + Math.random() * 0.7;
      chime.style.top = `${initH * 100}%`;
      chime.innerHTML = `<div class="wc-chime-cap"></div><div class="wc-chime-rod"></div>`;
      bar.appendChild(chime);
      chimes.push({ el: chime, h: initH, dragging: false });

      const onDown = (e) => {
        e.preventDefault();
        const t = e.touches ? e.touches[0] : e;
        chime.dataset.dragging = "1";
        chime.classList.add("dragging");
        chime._startY = t.clientY;
        chime._startH = chimes[i].h;
      };
      chime.addEventListener("mousedown", onDown);
      chime.addEventListener("touchstart", onDown, { passive: false });
    });

    function onMove(e) {
      const dragging = bar.querySelector('.wc-chime[data-dragging="1"]');
      if (!dragging) return;
      e.preventDefault();
      const t = e.touches ? e.touches[0] : e;
      const dy = t.clientY - parseFloat(dragging._startY);
      const barRect = bar.getBoundingClientRect();
      const dh = dy / barRect.height;
      let newH = parseFloat(dragging._startH) + dh;
      newH = Math.max(0.05, Math.min(0.95, newH));
      const idx = parseInt(dragging.dataset.i);
      chimes[idx].h = newH;
      dragging.style.top = `${newH * 100}%`;
      updateInfo();
    }
    function onUp() {
      const dragging = bar.querySelector('.wc-chime[data-dragging="1"]');
      if (dragging) {
        dragging.removeAttribute("data-dragging");
        dragging.classList.remove("dragging");
      }
      updateInfo();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    function updateInfo() {
      // 计算每个铃片偏离最近目标线的距离
      let matched = 0;
      let totalDev = 0;
      const usedTargets = new Set();
      chimes.forEach(c => {
        let bestD = 999, bestIdx = -1;
        target.forEach((h, idx) => {
          if (usedTargets.has(idx)) return;
          const d = Math.abs(c.h - h);
          if (d < bestD) { bestD = d; bestIdx = idx; }
        });
        if (bestIdx >= 0) {
          usedTargets.add(bestIdx);
          totalDev += bestD;
          if (bestD <= tolerance) matched++;
        }
      });
      confirmBtn.disabled = matched < target.length;
      infoEl.textContent = `对齐 ${matched}/${target.length} · 总偏差 ${(totalDev * 100).toFixed(1)}%`;
    }

    resetBtn.onclick = () => {
      chimes.forEach(c => {
        c.h = 0.1 + Math.random() * 0.7;
        c.el.style.top = `${c.h * 100}%`;
      });
      updateInfo();
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      // 计算匹配度和偏差
      let matched = 0;
      let totalDev = 0;
      const usedTargets = new Set();
      chimes.forEach(c => {
        let bestD = 999, bestIdx = -1;
        target.forEach((h, idx) => {
          if (usedTargets.has(idx)) return;
          const d = Math.abs(c.h - h);
          if (d < bestD) { bestD = d; bestIdx = idx; }
        });
        if (bestIdx >= 0) {
          usedTargets.add(bestIdx);
          totalDev += bestD;
          if (bestD <= tolerance) matched++;
        }
      });
      Saves.saveWindchimeRecord(currentNodeId, matched, target.length, totalDev, matched === target.length ? "perfect" : matched >= target.length / 2 ? "good" : "miss");
      const thresholds = wc.thresholds || [];
      let matchedT = wc.fallback || { tag: "miss", label: "——音散了", next: null };
      for (const t of thresholds) {
        if (totalDev <= (t.max ?? 0.2)) { matchedT = t; break; }
      }
      if (matchedT.add) { applyAdd(matchedT.add); updateHeartBar(); }
      if (matchedT.personality) {
        for (const dim in matchedT.personality) Saves.addPersonality(dim, matchedT.personality[dim]);
      }
      if (matchedT.memory) {
        if (!Saves.isMemoryUnlocked(matchedT.memory.id)) {
          Saves.saveMemory(matchedT.memory.id, matchedT.memory.text);
          flashHint(`✦ 新记忆：${matchedT.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "wc-reading";
      reading.innerHTML = `<div class="wc-reading-title">${matchedT.label || "解读"} · 对齐 ${matched}/${target.length}</div>
        <div class="wc-reading-text">${matchedT.text || ""}</div>
        <button class="wc-reading-close">继续</button>`;
      reading.querySelector(".wc-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matchedT.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    updateInfo();
    document.getElementById("game").appendChild(layer);
  }

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
  function runBottle(bt, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "bottle-layer";
    layer.id = "bottle-layer";
    const target = bt.target ?? 0.7;
    const tolerance = bt.tolerance ?? 0.08;
    layer.innerHTML = `
      <div class="bt-prompt">${bt.prompt || "调整力度把瓶子投到对岸"}</div>
      <div class="bt-stage">
        <canvas class="bt-canvas" id="bt-canvas"></canvas>
        <div class="bt-info" id="bt-info">拖动滑块调整力度，点「投出」</div>
      </div>
      <div class="bt-controls">
        <div class="bt-slider-wrap">
          <span>力度</span>
          <input type="range" class="bt-slider" id="bt-slider" min="0" max="100" value="50">
          <span class="bt-power-val" id="bt-power-val">0.50</span>
        </div>
      </div>
      <div class="bt-actions">
        <button class="bt-reset">重置</button>
        <button class="bt-throw" id="bt-throw">投出</button>
        <button class="bt-confirm" id="bt-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#bt-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#bt-info");
    const slider = layer.querySelector("#bt-slider");
    const powerVal = layer.querySelector("#bt-power-val");
    const throwBtn = layer.querySelector("#bt-throw");
    const confirmBtn = layer.querySelector("#bt-confirm");
    const resetBtn = layer.querySelector(".bt-reset");

    let aborted = false;
    let thrown = false;
    let landed = false;
    let power = 0.5;
    let rafId = null;
    // 瓶子状态
    let bottle = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, landed: false, distRatio: 0 };
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width;
      ch = canvas.height;
      draw();
    }

    function draw() {
      // 海平面背景
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#9ec9ff");
      grad.addColorStop(0.6, "#7da8d8");
      grad.addColorStop(1, "#3a5a8a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      // 起点岸
      ctx.fillStyle = "#d8a878";
      ctx.fillRect(0, ch * 0.7, cw * 0.1, ch * 0.3);
      // 对岸（目标）
      const targetX = cw * (0.1 + target * 0.8);
      ctx.fillStyle = "#a89078";
      ctx.fillRect(targetX - 8, ch * 0.65, 16, ch * 0.35);
      // 目标范围
      ctx.fillStyle = "rgba(255,180,140,0.3)";
      ctx.fillRect(cw * (0.1 + (target - tolerance) * 0.8), ch * 0.65, cw * tolerance * 1.6, ch * 0.35);
      // 目标线
      ctx.strokeStyle = "rgba(255,100,140,0.7)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(targetX, ch * 0.5);
      ctx.lineTo(targetX, ch);
      ctx.stroke();
      ctx.setLineDash([]);

      // 轨迹（投出后）
      if (thrown && trail.length > 1) {
        ctx.strokeStyle = "rgba(255,200,150,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      // 瓶子
      ctx.save();
      ctx.translate(bottle.x, bottle.y);
      ctx.rotate(bottle.rot);
      ctx.fillStyle = "#a8d8e8";
      ctx.strokeStyle = "#5a8a98";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-8, -4, 16, 8, 2);
      ctx.fill();
      ctx.stroke();
      // 瓶颈
      ctx.fillStyle = "#88b8c8";
      ctx.fillRect(-2, -8, 4, 4);
      // 瓶中信
      ctx.fillStyle = "#f8e8c0";
      ctx.fillRect(-4, -3, 8, 5);
      ctx.restore();

      // 信息
      info.textContent = thrown && !landed
        ? "飞行中..."
        : landed ? `落在 ${(bottle.distRatio * 100).toFixed(0)}% 处` : `力度 ${(power).toFixed(2)} · 目标 ${(target * 100).toFixed(0)}%`;
    }

    let trail = [];

    function loop() {
      if (aborted) return;
      if (thrown && !landed) {
        // 物理模拟：水平速度 vx，垂直 vy 受重力
        bottle.x += bottle.vx;
        bottle.y += bottle.vy;
        bottle.vy += 0.35;
        bottle.rot += bottle.vrot;
        trail.push({ x: bottle.x, y: bottle.y });
        if (trail.length > 80) trail.shift();
        // 着陆判定：到达对岸高度
        if (bottle.y >= ch * 0.7) {
          bottle.y = ch * 0.7;
          landed = true;
          // 计算落点比例（基于x位置）
          const startX = cw * 0.1;
          const endX = cw * 0.9;
          bottle.distRatio = Math.max(0, Math.min(1, (bottle.x - startX) / (endX - startX)));
          confirmBtn.disabled = false;
          throwBtn.disabled = true;
        }
        draw();
      }
      if (!aborted) rafId = requestAnimationFrame(loop);
    }

    slider.addEventListener("input", () => {
      if (thrown) return;
      power = parseFloat(slider.value) / 100;
      powerVal.textContent = power.toFixed(2);
      draw();
    });

    throwBtn.onclick = () => {
      if (thrown) return;
      thrown = true;
      throwBtn.disabled = true;
      slider.disabled = true;
      bottle.x = cw * 0.1;
      bottle.y = ch * 0.65;
      // 力度映射：力度 0.5 时大约飞到 target
      // 简化：水平速度与 power 成正比
      bottle.vx = power * 6 + 1;
      bottle.vy = -(power * 8 + 4);
      bottle.vrot = (Math.random() - 0.5) * 0.2;
      trail = [];
      rafId = requestAnimationFrame(loop);
    };

    resetBtn.onclick = () => {
      thrown = false;
      landed = false;
      bottle = { x: cw * 0.1, y: ch * 0.65, vx: 0, vy: 0, rot: 0, vrot: 0, landed: false, distRatio: 0 };
      trail = [];
      slider.disabled = false;
      throwBtn.disabled = false;
      confirmBtn.disabled = true;
      draw();
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      confirmBtn.disabled = true;
      const error = Math.abs(bottle.distRatio - target);
      const reached = error <= tolerance;
      Saves.saveBottleRecord(currentNodeId, power, reached ? 1 : 0, reached ? "perfect" : Math.abs(bottle.distRatio - target) <= tolerance * 2 ? "good" : "miss");
      const thresholds = bt.thresholds || [];
      let matched = bt.fallback || { tag: "miss", label: "——瓶沉了", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? tolerance)) { matched = t; break; }
      }
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
      reading.className = "bt-reading";
      reading.innerHTML = `<div class="bt-reading-title">${matched.label || "解读"} · 落点 ${(bottle.distRatio * 100).toFixed(0)}% · 偏差 ${(error * 100).toFixed(1)}%</div>
        <div class="bt-reading-text">${matched.text || ""}</div>
        <button class="bt-reading-close">继续</button>`;
      reading.querySelector(".bt-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
    bottle.x = cw * 0.1;
    bottle.y = ch * 0.65;
    draw();
  }

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
  function runEcholoc(ec, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "echoloc-layer";
    layer.id = "echoloc-layer";
    const actual = ec.actual ?? 0.6;
    const tolerance = ec.tolerance ?? 0.08;
    const duration = ec.duration || 8000;
    layer.innerHTML = `
      <div class="ec-prompt">${ec.prompt || "听回声估算距离"}</div>
      <div class="ec-stage">
        <canvas class="ec-canvas" id="ec-canvas"></canvas>
        <div class="ec-info" id="ec-info">点「发出」听到回声，再点画面估算位置</div>
      </div>
      <div class="ec-actions">
        <button class="ec-emit" id="ec-emit">发出</button>
        <button class="ec-confirm" id="ec-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ec-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ec-info");
    const emitBtn = layer.querySelector("#ec-emit");
    const confirmBtn = layer.querySelector("#ec-confirm");

    let aborted = false;
    let emitted = false;
    let estimated = false;
    let emitTime = 0;
    let echoReturnTime = 0;
    let listenTimer = null;
    let estimate = -1;
    let estimateX = -1;
    let rafId = null;
    let cw = 0, ch = 0;
    // 波纹动画
    let waveFront = 0;
    let waveReturning = false;
    let waveBack = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width;
      ch = canvas.height;
      draw();
    }

    function draw() {
      // 隧道/夜空背景
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#0a0a1f");
      grad.addColorStop(1, "#02020a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      // 地平线
      ctx.strokeStyle = "rgba(180,200,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ch * 0.5);
      ctx.lineTo(cw, ch * 0.5);
      ctx.stroke();
      // 起点（你）
      ctx.fillStyle = "#ff8ec7";
      ctx.beginPath();
      ctx.arc(cw * 0.1, ch * 0.5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,142,199,0.3)";
      ctx.font = "12px sans-serif";
      ctx.fillText("你", cw * 0.1 - 8, ch * 0.5 + 24);
      // 障碍（实际位置 - 隐藏不显示）
      const obstacleX = cw * (0.1 + actual * 0.8);
      ctx.fillStyle = estimated ? "rgba(180,200,255,0.6)" : "rgba(180,200,255,0.0)";
      ctx.beginPath();
      ctx.arc(obstacleX, ch * 0.5, 10, 0, Math.PI * 2);
      ctx.fill();
      if (estimated) {
        ctx.strokeStyle = "rgba(180,200,255,0.5)";
        ctx.beginPath();
        ctx.arc(obstacleX, ch * 0.5, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 玩家估算点
      if (estimateX >= 0) {
        ctx.strokeStyle = "#7fff9d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(estimateX, ch * 0.5 - 18);
        ctx.lineTo(estimateX, ch * 0.5 + 18);
        ctx.stroke();
        ctx.fillStyle = "#7fff9d";
        ctx.beginPath();
        ctx.arc(estimateX, ch * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // 波纹
      if (emitted && waveFront > 0) {
        const sx = cw * 0.1;
        ctx.strokeStyle = waveReturning ? "rgba(255,200,150,0.6)" : "rgba(180,200,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, ch * 0.5, waveFront, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        if (waveReturning) {
          ctx.strokeStyle = "rgba(255,200,150,0.4)";
          ctx.beginPath();
          ctx.arc(obstacleX, ch * 0.5, waveBack, Math.PI / 2, -Math.PI / 2);
          ctx.stroke();
        }
      }
      // 信息
      info.textContent = !emitted ? "点「发出」听到回声"
        : (waveReturning || (waveFront > 0 && !waveReturning)) ? "听..."
        : estimate >= 0 ? `估算 ${(estimate * 100).toFixed(0)}% · 点「确认」` : "回声消失——点画面估算位置";
    }

    function loop() {
      if (aborted) return;
      if (emitted) {
        const obstacleX = cw * (0.1 + actual * 0.8);
        const startX = cw * 0.1;
        const distance = obstacleX - startX;
        if (!waveReturning) {
          waveFront += 4;
          if (waveFront >= distance) {
            waveReturning = true;
            waveBack = 0;
            echoReturnTime = performance.now();
          }
        } else {
          waveBack += 4;
          if (waveBack >= distance) {
            // 回声回到起点
            emitted = false; // 停止波纹
            waveFront = 0;
            waveBack = 0;
            waveReturning = false;
            info.textContent = "回声消失——点画面估算位置";
          }
        }
        draw();
      }
      if (!aborted) rafId = requestAnimationFrame(loop);
    }

    emitBtn.onclick = () => {
      if (emitted) return;
      emitted = true;
      estimated = false;
      estimate = -1;
      estimateX = -1;
      waveFront = 0;
      waveReturning = false;
      emitTime = performance.now();
      emitBtn.disabled = true;
      rafId = requestAnimationFrame(loop);
      // 自动启用确认（也可以等回声回来）
      setTimeout(() => {
        if (!aborted) confirmBtn.disabled = false;
      }, 1500);
    };

    function onClick(e) {
      if (!emitted && performance.now() - emitTime > 1000) {
        // 已发出且回声已过，可以估算
      }
      if (emitBtn.disabled) {
        // 已发出，可以估算
        const rect = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        const x = t.clientX - rect.left;
        estimateX = x;
        const startX = cw * 0.1;
        const endX = cw * 0.9;
        estimate = Math.max(0, Math.min(1, (x - startX) / (endX - startX)));
        draw();
      }
    }
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", onClick, { passive: false });

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      if (estimate < 0) {
        info.textContent = "请先点画面估算位置";
        return;
      }
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      confirmBtn.disabled = true;
      const error = Math.abs(estimate - actual);
      Saves.saveEcholocRecord(currentNodeId, estimate, actual, error, error <= tolerance ? "perfect" : error <= tolerance * 2 ? "good" : "miss");
      const thresholds = ec.thresholds || [];
      let matched = ec.fallback || { tag: "miss", label: "——估算偏差", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? tolerance)) { matched = t; break; }
      }
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
      reading.className = "ec-reading";
      reading.innerHTML = `<div class="ec-reading-title">${matched.label || "解读"} · 估算 ${(estimate * 100).toFixed(0)}% · 实际 ${(actual * 100).toFixed(0)}%</div>
        <div class="ec-reading-text">${matched.text || ""}</div>
        <button class="ec-reading-close">继续</button>`;
      reading.querySelector(".ec-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runCompass(cp, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "compass-layer";
    layer.id = "compass-layer";
    layer.innerHTML = `
      <div class="cp-prompt">${cp.prompt || "拖动罗盘——让指针对准她说的方向"}</div>
      <div class="cp-stage">
        <canvas class="cp-canvas" id="cp-canvas"></canvas>
        <div class="cp-info" id="cp-info">拖动罗盘外圈旋转指针</div>
      </div>
      <div class="cp-actions">
        <button class="cp-reset">重置</button>
        <button class="cp-confirm" id="cp-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#cp-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#cp-info");
    const confirmBtn = layer.querySelector("#cp-confirm");
    const resetBtn = layer.querySelector(".cp-reset");

    let aborted = false;
    let dragging = false;
    let angle = 0;            // 当前指针角度（0-360，顺时针，0=北/上方）
    let cw = 0, ch = 0, cx = 0, cy = 0, radius = 0;
    const target = cp.target ?? 135;
    const tolerance = cp.tolerance ?? 8;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      cx = cw / 2; cy = ch / 2;
      radius = Math.min(cw, ch) * 0.42;
      draw();
    }

    function draw() {
      // 背景
      ctx.fillStyle = "#0a1a2a";
      ctx.fillRect(0, 0, cw, ch);
      // 罗盘外圈
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
      grad.addColorStop(0, "#3a5a7a");
      grad.addColorStop(1, "#1a2a3a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,200,240,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // 刻度
      ctx.strokeStyle = "rgba(180,200,240,0.5)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 360; i += 15) {
        const rad = (i - 90) * Math.PI / 180;
        const r1 = radius * 0.88, r2 = i % 90 === 0 ? radius * 0.72 : radius * 0.82;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
        ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        ctx.stroke();
      }
      // 方位字母 N/E/S/W
      ctx.fillStyle = "#ffe890";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const dirs = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
      dirs.forEach(([d, deg]) => {
        const rad = (deg - 90) * Math.PI / 180;
        ctx.fillText(d, cx + Math.cos(rad) * radius * 0.62, cy + Math.sin(rad) * radius * 0.62);
      });
      // 目标方位（隐藏，只在结束时显示）
      if (aborted) {
        const trad = (target - 90) * Math.PI / 180;
        ctx.strokeStyle = "rgba(255,140,180,0.8)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(trad) * radius * 0.7, cy + Math.sin(trad) * radius * 0.7);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // 当前指针
      const arad = (angle - 90) * Math.PI / 180;
      ctx.strokeStyle = "#ff5070";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(arad) * radius * 0.7, cy + Math.sin(arad) * radius * 0.7);
      ctx.stroke();
      // 指针箭头
      ctx.fillStyle = "#ff5070";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(arad) * radius * 0.7, cy + Math.sin(arad) * radius * 0.7, 5, 0, Math.PI * 2);
      ctx.fill();
      // 中心
      ctx.fillStyle = "#ffe890";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      // 信息
      info.textContent = `当前方位 ${Math.round(angle)}° · 目标方位隐藏`;
    }

    function getAngleFromEvent(e) {
      const t = e.touches ? e.touches[0] : e;
      const rect = canvas.getBoundingClientRect();
      const dx = t.clientX - rect.left - cx;
      const dy = t.clientY - rect.top - cy;
      let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (deg < 0) deg += 360;
      return deg;
    }
    function onDown(e) {
      e.preventDefault();
      dragging = true;
      angle = getAngleFromEvent(e);
      draw();
    }
    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      angle = getAngleFromEvent(e);
      draw();
    }
    function onUp() { dragging = false; }
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    resetBtn.onclick = () => { angle = 0; draw(); };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      // 计算最小角度差
      let diff = Math.abs(angle - target);
      if (diff > 180) diff = 360 - diff;
      const thresholds = cp.thresholds || [];
      let matched = cp.fallback || { tag: "miss", label: "——方向偏了", next: null };
      for (const t of thresholds) {
        if (diff <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveCompassRecord(currentNodeId, Math.round(angle), target, diff, matched.tag);
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
      draw();
      const reading = document.createElement("div");
      reading.className = "cp-reading";
      reading.innerHTML = `<div class="cp-reading-title">${matched.label || "解读"} · 偏差 ${diff.toFixed(0)}°</div>
        <div class="cp-reading-text">${matched.text || ""}</div>
        <button class="cp-reading-close">继续</button>`;
      reading.querySelector(".cp-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runTelegraph(tg, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "telegraph-layer";
    layer.id = "telegraph-layer";
    const code = tg.code || "SOS";
    const options = tg.options || [code, "OK", "HI", "NO"];
    layer.innerHTML = `
      <div class="tg-prompt">${tg.prompt || "听完电报——选出对应的字母"}</div>
      <div class="tg-stage">
        <div class="tg-display" id="tg-display">— · — · —</div>
        <div class="tg-wave" id="tg-wave"></div>
        <div class="tg-info" id="tg-info">点「播放」听电报节奏</div>
      </div>
      <div class="tg-actions">
        <button class="tg-play" id="tg-play">播放</button>
        <button class="tg-confirm" id="tg-confirm" disabled>确认</button>
      </div>
      <div class="tg-options" id="tg-options"></div>
    `;
    const display = layer.querySelector("#tg-display");
    const waveEl = layer.querySelector("#tg-wave");
    const info = layer.querySelector("#tg-info");
    const playBtn = layer.querySelector("#tg-play");
    const confirmBtn = layer.querySelector("#tg-confirm");
    const optionsEl = layer.querySelector("#tg-options");

    let aborted = false;
    let played = false;
    let selected = null;
    const MORSE = {
      "A": ".-",   "B": "-...", "C": "-.-.", "D": "-..",  "E": ".",
      "F": "..-.", "G": "--.",  "H": "....", "I": "..",   "J": ".---",
      "K": "-.-",  "L": ".-..", "M": "--",   "N": "-.",   "O": "---",
      "P": ".--.", "Q": "--.-", "R": ".-.",  "S": "...",  "T": "-",
      "U": "..-",  "V": "...-", "W": ".--",  "X": "-..-", "Y": "-.--",
      "Z": "--..", "0": "-----","1": ".----","2": "..---","3": "...--",
      "4": "....-","5": ".....","6": "-....","7": "--...","8": "---..","9": "----."
    };
    // 构建显示文本：将 code 转成摩斯码
    const morseSeq = code.toUpperCase().split("").map(ch => MORSE[ch] || "").filter(Boolean);
    const morseText = morseSeq.join(" / ");
    display.textContent = played ? morseText : "— · — · —";

    // 构建选项按钮
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "tg-option";
      btn.textContent = opt;
      btn.dataset.value = opt;
      btn.onclick = () => {
        if (aborted) return;
        optionsEl.querySelectorAll(".tg-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selected = opt;
        confirmBtn.disabled = false;
      };
      optionsEl.appendChild(btn);
    });

    playBtn.onclick = () => {
      if (played) {
        // 允许重复播放
        played = false;
        waveEl.innerHTML = "";
      }
      played = true;
      display.textContent = morseText;
      playBtn.disabled = true;
      // 构建嘀嗒动画序列
      const flat = morseSeq.join(""); // 例如 "......---..."
      const DOT = 220, DASH = 660, GAP = 220, SEP = 660;
      let delay = 0;
      waveEl.innerHTML = "";
      flat.split("").forEach((sym, i) => {
        const span = document.createElement("span");
        span.className = "tg-beat " + (sym === "." ? "dot" : "dash");
        span.style.animationDelay = (delay) + "ms";
        waveEl.appendChild(span);
        delay += (sym === "." ? DOT : DASH) + GAP;
      });
      // 字母间额外间隔已隐含在 join 里，简化处理
      setTimeout(() => { if (!aborted) playBtn.disabled = false; }, delay + 200);
      info.textContent = "听完后——选出对应的字母";
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled || selected === null) return;
      aborted = true;
      confirmBtn.disabled = true;
      playBtn.disabled = true;
      const correct = selected === code ? 1 : 0;
      const error = correct ? 0 : 1;
      const thresholds = tg.thresholds || [];
      let matched = tg.fallback || { tag: "miss", label: "——译错了", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? 0)) { matched = t; break; }
      }
      Saves.saveTelegraphRecord(currentNodeId, code, selected, correct, matched.tag);
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
      reading.className = "tg-reading";
      reading.innerHTML = `<div class="tg-reading-title">${matched.label || "解读"} · 你选「${selected}」 · 正解「${code}」</div>
        <div class="tg-reading-text">${matched.text || ""}</div>
        <button class="tg-reading-close">继续</button>`;
      reading.querySelector(".tg-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runBalance(bl, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "balance-layer";
    layer.id = "balance-layer";
    const items = bl.items || [3, 5, 7, 2, 4];
    layer.innerHTML = `
      <div class="bl-prompt">${bl.prompt || "把物品放到天平两端——让它平衡"}</div>
      <div class="bl-stage">
        <canvas class="bl-canvas" id="bl-canvas"></canvas>
        <div class="bl-info" id="bl-info">点击物品，再点左盘或右盘放入</div>
      </div>
      <div class="bl-pool" id="bl-pool"></div>
      <div class="bl-actions">
        <button class="bl-reset">重置</button>
        <button class="bl-confirm" id="bl-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#bl-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#bl-info");
    const poolEl = layer.querySelector("#bl-pool");
    const confirmBtn = layer.querySelector("#bl-confirm");
    const resetBtn = layer.querySelector(".bl-reset");

    let aborted = false;
    let selected = -1;            // 当前选中的物品索引（在 pool 中）
    let pool = items.map((w, i) => ({ w, id: i }));
    let left = [];                // 左盘物品
    let right = [];               // 右盘物品
    let cw = 0, ch = 0;
    let tilt = 0;                 // 当前倾斜角（度）
    const tolerance = bl.tolerance ?? 0.5;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(0, 0, cw, ch);
      const baseY = ch * 0.78;
      const centerX = cw / 2;
      // 底座
      ctx.fillStyle = "#5a4030";
      ctx.fillRect(centerX - 30, baseY, 60, ch * 0.12);
      ctx.beginPath();
      ctx.arc(centerX, baseY, 30, 0, Math.PI * 2);
      ctx.fill();
      // 立柱
      ctx.fillStyle = "#7a5040";
      ctx.fillRect(centerX - 4, ch * 0.2, 8, baseY - ch * 0.2);
      // 横梁（按倾斜角旋转）
      const beamY = ch * 0.32;
      const beamLen = Math.min(cw * 0.42, 220);
      const leftEnd = { x: centerX - beamLen, y: beamY + tilt * 1.2 };
      const rightEnd = { x: centerX + beamLen, y: beamY - tilt * 1.2 };
      ctx.strokeStyle = "#a88060";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(leftEnd.x, leftEnd.y);
      ctx.lineTo(rightEnd.x, rightEnd.y);
      ctx.stroke();
      // 左右吊绳
      ctx.strokeStyle = "#c8a880";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftEnd.x, leftEnd.y); ctx.lineTo(leftEnd.x, leftEnd.y + 80); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightEnd.x, rightEnd.y); ctx.lineTo(rightEnd.x, rightEnd.y + 80); ctx.stroke();
      // 左右托盘
      const drawPan = (x, y, items, highlight) => {
        ctx.save();
        ctx.translate(x, y + 80);
        ctx.fillStyle = highlight ? "rgba(255,200,100,0.6)" : "rgba(180,150,120,0.6)";
        ctx.strokeStyle = "#d8b890";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 60, 12, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // 物品
        items.forEach((it, i) => {
          ctx.fillStyle = "#e8c890";
          ctx.strokeStyle = "#8a6840";
          ctx.lineWidth = 1;
          const ix = (i - (items.length - 1) / 2) * 22;
          ctx.fillRect(ix - 9, -22, 18, 22);
          ctx.strokeRect(ix - 9, -22, 18, 22);
          ctx.fillStyle = "#3a2a1a";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(it.w, ix, -11);
        });
        ctx.restore();
      };
      drawPan(leftEnd.x, leftEnd.y, left, selected === "left");
      drawPan(rightEnd.x, rightEnd.y, right, selected === "right");
      // 中心支点
      ctx.fillStyle = "#ffe890";
      ctx.beginPath();
      ctx.arc(centerX, beamY, 6, 0, Math.PI * 2);
      ctx.fill();
      // 信息
      const leftSum = left.reduce((s, x) => s + x.w, 0);
      const rightSum = right.reduce((s, x) => s + x.w, 0);
      info.textContent = `左 ${leftSum} · 右 ${rightSum} · 差 ${Math.abs(leftSum - rightSum)}`;
    }

    function updateTilt() {
      const leftSum = left.reduce((s, x) => s + x.w, 0);
      const rightSum = right.reduce((s, x) => s + x.w, 0);
      // 倾斜：左重则左低（tilt>0），右重则右低（tilt<0）
      const target = Math.max(-20, Math.min(20, (leftSum - rightSum) * 2));
      const step = () => {
        if (aborted) return;
        const delta = target - tilt;
        if (Math.abs(delta) < 0.1) { tilt = target; draw(); return; }
        tilt += delta * 0.15;
        draw();
        if (Math.abs(delta) > 0.1) requestAnimationFrame(step);
      };
      step();
    }

    function renderPool() {
      poolEl.innerHTML = "";
      pool.forEach((it, i) => {
        const btn = document.createElement("button");
        btn.className = "bl-item" + (selected === i ? " selected" : "");
        btn.textContent = it.w;
        btn.dataset.i = i;
        btn.onclick = () => {
          selected = (selected === i) ? -1 : i;
          renderPool();
          draw();
        };
        poolEl.appendChild(btn);
      });
    }

    // 点击 canvas 上的托盘放入
    canvas.addEventListener("click", (e) => {
      if (aborted) return;
      if (selected === -1 || selected === "left" || selected === "right") {
        // 也可以点击托盘取出
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const beamY = ch * 0.32 + 80;
        const beamLen = Math.min(cw * 0.42, 220);
        const leftX = cw / 2 - beamLen;
        const rightX = cw / 2 + beamLen;
        if (Math.abs(x - leftX) < 60) {
          // 取出左盘最后一个
          if (left.length > 0) {
            const it = left.pop();
            pool.push(it);
            selected = -1;
            renderPool();
            updateTilt();
          }
        } else if (Math.abs(x - rightX) < 60) {
          if (right.length > 0) {
            const it = right.pop();
            pool.push(it);
            selected = -1;
            renderPool();
            updateTilt();
          }
        }
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const beamLen = Math.min(cw * 0.42, 220);
      const leftX = cw / 2 - beamLen;
      const rightX = cw / 2 + beamLen;
      if (Math.abs(x - leftX) < 60) {
        const it = pool.splice(selected, 1)[0];
        left.push(it);
        selected = -1;
        renderPool();
        updateTilt();
      } else if (Math.abs(x - rightX) < 60) {
        const it = pool.splice(selected, 1)[0];
        right.push(it);
        selected = -1;
        renderPool();
        updateTilt();
      }
    });

    resetBtn.onclick = () => {
      pool = items.map((w, i) => ({ w, id: i }));
      left = []; right = []; selected = -1;
      renderPool();
      updateTilt();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const leftSum = left.reduce((s, x) => s + x.w, 0);
      const rightSum = right.reduce((s, x) => s + x.w, 0);
      const diff = Math.abs(leftSum - rightSum);
      const thresholds = bl.thresholds || [];
      let matched = bl.fallback || { tag: "miss", label: "——没平衡", next: null };
      for (const t of thresholds) {
        if (diff <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveBalanceRecord(currentNodeId, leftSum, rightSum, diff, matched.tag);
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
      reading.className = "bl-reading";
      reading.innerHTML = `<div class="bl-reading-title">${matched.label || "解读"} · 左 ${leftSum} · 右 ${rightSum}</div>
        <div class="bl-reading-text">${matched.text || ""}</div>
        <button class="bl-reading-close">继续</button>`;
      reading.querySelector(".bl-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    renderPool();
    resize();
  }

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
  function runMetronome(mt, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "metronome-layer";
    layer.id = "metronome-layer";
    const bpm = mt.bpm || 80;
    const total = mt.total || 12;
    const tolerance = mt.tolerance ?? 0.12;
    layer.innerHTML = `
      <div class="mt-prompt">${mt.prompt || "跟着节拍点击——每响一次，点一次「同步」"}</div>
      <div class="mt-stage">
        <canvas class="mt-canvas" id="mt-canvas"></canvas>
        <div class="mt-info" id="mt-info">点「开始」启动节拍器</div>
      </div>
      <div class="mt-progress" id="mt-progress">0 / ${total}</div>
      <div class="mt-actions">
        <button class="mt-start" id="mt-start">开始</button>
        <button class="mt-sync" id="mt-sync" disabled>同步</button>
      </div>
    `;
    const canvas = layer.querySelector("#mt-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#mt-info");
    const progressEl = layer.querySelector("#mt-progress");
    const startBtn = layer.querySelector("#mt-start");
    const syncBtn = layer.querySelector("#mt-sync");

    let aborted = false;
    let started = false;
    let finished = false;
    let startTime = 0;
    let nextBeatAt = 0;
    let beatIdx = 0;
    let hits = 0;
    const hitRecords = [];
    const period = 60000 / bpm;
    let cw = 0, ch = 0;
    let lastBeatFlash = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#1a2438");
      grad.addColorStop(1, "#0a0e1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch * 0.18;
      const len = Math.min(cw * 0.3, ch * 0.45);
      let angle = 0;
      if (started && !finished) {
        const t = (performance.now() - startTime) % period / period;
        angle = Math.sin(t * Math.PI * 2) * 0.6;
      }
      ctx.strokeStyle = "#c8a880";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const px = cx + Math.sin(angle) * len;
      const py = cy + Math.cos(angle) * len;
      ctx.lineTo(px, py);
      ctx.stroke();
      const flash = (performance.now() - lastBeatFlash) < 120;
      ctx.fillStyle = flash ? "#fff080" : "#ffd060";
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe890";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      // 节拍刻度
      for (let i = 0; i < total; i++) {
        const ix = (cw * 0.1) + i * ((cw * 0.8) / Math.max(1, total - 1));
        const filled = i < hitRecords.length;
        ctx.fillStyle = filled ? "#ff8090" : "rgba(200,168,128,0.3)";
        ctx.beginPath();
        ctx.arc(ix, ch * 0.85, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!started) info.textContent = "点「开始」启动节拍器";
      else if (finished) {
        const acc = hits / total;
        info.textContent = `同步 ${hits}/${total} · 准确率 ${(acc * 100).toFixed(0)}%`;
      } else {
        info.textContent = `节拍 ${beatIdx + 1}/${total} · ${bpm} BPM`;
      }
    }

    function loop() {
      if (aborted) return;
      if (started && !finished) {
        const now = performance.now();
        while (now >= nextBeatAt) {
          lastBeatFlash = now;
          beatIdx++;
          if (beatIdx >= total) {
            finished = true;
            syncBtn.disabled = true;
            break;
          }
          nextBeatAt += period;
        }
        draw();
      }
      if (!aborted) requestAnimationFrame(loop);
    }

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startTime = performance.now();
      nextBeatAt = startTime + period;
      beatIdx = 0;
      startBtn.disabled = true;
      syncBtn.disabled = false;
      lastBeatFlash = startTime;
      requestAnimationFrame(loop);
    };

    syncBtn.onclick = () => {
      if (aborted || !started || finished) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const beatCount = Math.floor(elapsed / period);
      const targetTime = startTime + beatCount * period;
      const err = Math.abs(now - targetTime) / period;
      hitRecords.push({ beatIdx: beatCount, error: err });
      if (err <= tolerance) hits++;
      progressEl.textContent = `${hitRecords.length} / ${total}`;
      if (hitRecords.length >= total) {
        finished = true;
        syncBtn.disabled = true;
        draw();
        const accuracy = hits / total;
        const confirmBtn = document.createElement("button");
        confirmBtn.className = "mt-confirm";
        confirmBtn.textContent = "确认";
        confirmBtn.onclick = () => {
          if (aborted) return;
          aborted = true;
          confirmBtn.disabled = true;
          const thresholds = mt.thresholds || [];
          let matched = mt.fallback || { tag: "miss", label: "——节奏乱了", next: null };
          for (const t of thresholds) {
            if (accuracy >= (t.min ?? 0)) { matched = t; break; }
          }
          Saves.saveMetronomeRecord(currentNodeId, hits, total, accuracy, matched.tag);
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
          reading.className = "mt-reading";
          reading.innerHTML = `<div class="mt-reading-title">${matched.label || "解读"} · 准确率 ${(accuracy * 100).toFixed(0)}%</div>
            <div class="mt-reading-text">${matched.text || ""}</div>
            <button class="mt-reading-close">继续</button>`;
          reading.querySelector(".mt-reading-close").onclick = () => {
            reading.remove();
            layer.remove();
            const node = SCRIPT[currentNodeId];
            const jumpTo = matched.next || (node && node.next);
            if (jumpTo) gotoNode(jumpTo);
          };
          layer.appendChild(reading);
        };
        layer.querySelector(".mt-actions").appendChild(confirmBtn);
      } else {
        draw();
      }
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runStarchart(sc, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "starchart-layer";
    layer.id = "starchart-layer";
    const stars = sc.stars || [];
    const expected = sc.expectedOrder || [];
    const tolerance = sc.tolerance ?? 1;
    layer.innerHTML = `
      <div class="sc-prompt">${sc.prompt || "按亮度顺序连接星星"}</div>
      <div class="sc-stage">
        <canvas class="sc-canvas" id="sc-canvas"></canvas>
        <div class="sc-info" id="sc-info">点击星星连线</div>
      </div>
      <div class="sc-progress" id="sc-progress">0 / ${expected.length}</div>
      <div class="sc-actions">
        <button class="sc-reset">重置</button>
        <button class="sc-confirm" id="sc-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#sc-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#sc-info");
    const progressEl = layer.querySelector("#sc-progress");
    const confirmBtn = layer.querySelector("#sc-confirm");
    const resetBtn = layer.querySelector(".sc-reset");

    let aborted = false;
    let sequence = [];
    let cw = 0, ch = 0;
    let starPositions = {};

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      starPositions = {};
      stars.forEach(s => {
        starPositions[s.id] = {
          x: s.x * cw,
          y: s.y * ch,
          brightness: s.brightness,
          label: s.label
        };
      });
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#0a1430");
      grad.addColorStop(1, "#020410");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = "rgba(255,230,150,0.7)";
      ctx.lineWidth = 2;
      for (let i = 1; i < sequence.length; i++) {
        const a = starPositions[sequence[i - 1]];
        const b = starPositions[sequence[i]];
        if (a && b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      stars.forEach(s => {
        const p = starPositions[s.id];
        if (!p) return;
        const r = 2 + s.brightness * 6;
        const isSelected = sequence.includes(s.id);
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        halo.addColorStop(0, `rgba(255,240,180,${0.4 + s.brightness * 0.3})`);
        halo.addColorStop(1, "rgba(255,240,180,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isSelected ? "#ff9050" : "#fff8d0";
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (s.label) {
          ctx.fillStyle = "rgba(200,180,140,0.7)";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(s.label, p.x, p.y + r + 14);
        }
      });
      progressEl.textContent = `${sequence.length} / ${expected.length}`;
      confirmBtn.disabled = sequence.length !== expected.length;
      info.textContent = sequence.length < expected.length
        ? `点击星星（已选 ${sequence.length}）`
        : "可点击「确认」提交";
    }

    canvas.addEventListener("click", (e) => {
      if (aborted) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let hit = null;
      let minD = 20;
      for (const s of stars) {
        const p = starPositions[s.id];
        if (!p) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < minD) { minD = d; hit = s; }
      }
      if (!hit) return;
      if (sequence.includes(hit.id)) {
        const idx = sequence.indexOf(hit.id);
        sequence = sequence.slice(0, idx);
      } else {
        if (sequence.length >= expected.length) return;
        sequence.push(hit.id);
      }
      draw();
    });

    resetBtn.onclick = () => {
      if (aborted) return;
      sequence = [];
      draw();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let matched = 0;
      for (let i = 0; i < expected.length; i++) {
        if (sequence[i] === expected[i]) matched++;
      }
      const errors = expected.length - matched;
      const thresholds = sc.thresholds || [];
      let matchedOpt = sc.fallback || { tag: "miss", label: "——画错了星图", next: null };
      for (const t of thresholds) {
        if (errors <= (t.max ?? tolerance)) { matchedOpt = t; break; }
      }
      Saves.saveStarchartRecord(currentNodeId, sequence, matched, expected.length, matchedOpt.tag);
      if (matchedOpt.add) { applyAdd(matchedOpt.add); updateHeartBar(); }
      if (matchedOpt.personality) {
        for (const dim in matchedOpt.personality) Saves.addPersonality(dim, matchedOpt.personality[dim]);
      }
      if (matchedOpt.memory) {
        if (!Saves.isMemoryUnlocked(matchedOpt.memory.id)) {
          Saves.saveMemory(matchedOpt.memory.id, matchedOpt.memory.text);
          flashHint(`✦ 新记忆：${matchedOpt.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "sc-reading";
      reading.innerHTML = `<div class="sc-reading-title">${matchedOpt.label || "解读"} · 匹配 ${matched}/${expected.length}</div>
        <div class="sc-reading-text">${matchedOpt.text || ""}</div>
        <button class="sc-reading-close">继续</button>`;
      reading.querySelector(".sc-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matchedOpt.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runLens(ln, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "lens-layer";
    layer.id = "lens-layer";
    layer.innerHTML = `
      <div class="ln-prompt">${ln.prompt || "调节透镜焦距——让光线汇聚到目标点"}</div>
      <div class="ln-stage">
        <canvas class="ln-canvas" id="ln-canvas"></canvas>
        <div class="ln-info" id="ln-info">拖动滑块调节焦距</div>
      </div>
      <div class="ln-slider-wrap">
        <input type="range" class="ln-slider" id="ln-slider" min="0" max="100" value="50">
        <span class="ln-value" id="ln-value">50</span>
      </div>
      <div class="ln-actions">
        <button class="ln-confirm" id="ln-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ln-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ln-info");
    const slider = layer.querySelector("#ln-slider");
    const valueEl = layer.querySelector("#ln-value");
    const confirmBtn = layer.querySelector("#ln-confirm");

    let aborted = false;
    const target = ln.target ?? 0.6;
    const tolerance = ln.tolerance ?? 0.05;
    let focus = 0.5;
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#0a1a2a");
      grad.addColorStop(1, "#04060a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const axisY = ch * 0.5;
      ctx.strokeStyle = "rgba(180,180,200,0.2)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, axisY);
      ctx.lineTo(cw, axisY);
      ctx.stroke();
      ctx.setLineDash([]);
      const srcX = cw * 0.1;
      ctx.fillStyle = "#ffe890";
      ctx.beginPath();
      ctx.arc(srcX, axisY, 8, 0, Math.PI * 2);
      ctx.fill();
      const lensX = cw * 0.35;
      ctx.strokeStyle = "rgba(150,200,255,0.8)";
      ctx.fillStyle = "rgba(120,180,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(lensX, axisY, 12, ch * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const targetX = cw * 0.1 + target * cw * 0.8;
      ctx.strokeStyle = "rgba(255,150,150,0.6)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(targetX, axisY - 20);
      ctx.lineTo(targetX, axisY + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      const focusX = cw * 0.1 + focus * cw * 0.8;
      ctx.strokeStyle = "rgba(255,240,150,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(srcX, axisY);
      ctx.lineTo(lensX, axisY);
      ctx.lineTo(focusX, axisY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(srcX, axisY);
      ctx.lineTo(lensX, axisY - ch * 0.2);
      ctx.lineTo(focusX, axisY);
      ctx.lineTo(lensX, axisY + ch * 0.2);
      ctx.lineTo(srcX, axisY);
      ctx.stroke();
      const err = Math.abs(focus - target);
      const inTol = err <= tolerance;
      const halo = ctx.createRadialGradient(focusX, axisY, 0, focusX, axisY, 24);
      halo.addColorStop(0, inTol ? "rgba(150,255,150,0.8)" : "rgba(255,180,100,0.6)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(focusX, axisY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = inTol ? "#80ff80" : "#ffb060";
      ctx.beginPath();
      ctx.arc(focusX, axisY, 6, 0, Math.PI * 2);
      ctx.fill();
      info.textContent = `焦距 ${focus.toFixed(2)} · 目标 ${target.toFixed(2)} · 偏差 ${err.toFixed(3)}`;
    }

    slider.addEventListener("input", () => {
      if (aborted) return;
      focus = parseInt(slider.value, 10) / 100;
      valueEl.textContent = slider.value;
      draw();
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const err = Math.abs(focus - target);
      const thresholds = ln.thresholds || [];
      let matched = ln.fallback || { tag: "miss", label: "——没对焦", next: null };
      for (const t of thresholds) {
        if (err <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveLensRecord(currentNodeId, focus, target, err, matched.tag);
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
      reading.className = "ln-reading";
      reading.innerHTML = `<div class="ln-reading-title">${matched.label || "解读"} · 偏差 ${err.toFixed(3)}</div>
        <div class="ln-reading-text">${matched.text || ""}</div>
        <button class="ln-reading-close">继续</button>`;
      reading.querySelector(".ln-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runTuning(tn, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "tuning-layer";
    layer.id = "tuning-layer";
    const strings = tn.strings || [];
    const tolerance = tn.tolerance ?? 0.05;
    layer.innerHTML = `
      <div class="tn-prompt">${tn.prompt || "调节琴弦张力——让它接近目标音高"}</div>
      <div class="tn-stage">
        <canvas class="tn-canvas" id="tn-canvas"></canvas>
        <div class="tn-info" id="tn-info">点选琴弦，拖动张力滑块</div>
      </div>
      <div class="tn-list" id="tn-list"></div>
      <div class="tn-slider-wrap">
        <input type="range" class="tn-slider" id="tn-slider" min="0" max="100" value="50" disabled>
        <span class="tn-value" id="tn-value">—</span>
        <button class="tn-pluck" id="tn-pluck" disabled>弹一下</button>
      </div>
      <div class="tn-actions">
        <button class="tn-confirm" id="tn-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#tn-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#tn-info");
    const listEl = layer.querySelector("#tn-list");
    const slider = layer.querySelector("#tn-slider");
    const valueEl = layer.querySelector("#tn-value");
    const pluckBtn = layer.querySelector("#tn-pluck");
    const confirmBtn = layer.querySelector("#tn-confirm");

    let aborted = false;
    let currentIdx = -1;
    const tensions = strings.map(() => 0.5);
    let cw = 0, ch = 0;
    let pluckAnim = { idx: -1, t: 0 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#2a1a1a");
      grad.addColorStop(1, "#0a0505");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "#3a2a1a";
      ctx.strokeStyle = "#8a6040";
      ctx.lineWidth = 4;
      ctx.fillRect(cw * 0.1, ch * 0.15, cw * 0.8, ch * 0.7);
      ctx.strokeRect(cw * 0.1, ch * 0.15, cw * 0.8, ch * 0.7);
      const stringSpacing = (ch * 0.7) / Math.max(1, strings.length + 1);
      strings.forEach((s, i) => {
        const sy = ch * 0.15 + stringSpacing * (i + 1);
        const isSelected = i === currentIdx;
        let amp = 0;
        if (pluckAnim.idx === i) {
          const elapsed = performance.now() - pluckAnim.t;
          if (elapsed < 800) {
            amp = Math.sin(elapsed * 0.04) * 8 * (1 - elapsed / 800);
          } else {
            pluckAnim.idx = -1;
          }
        }
        ctx.strokeStyle = isSelected ? "#ffd060" : "#c0a070";
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        const startX = cw * 0.1;
        const endX = cw * 0.9;
        if (amp === 0) {
          ctx.moveTo(startX, sy);
          ctx.lineTo(endX, sy);
        } else {
          ctx.moveTo(startX, sy);
          for (let x = startX; x <= endX; x += 4) {
            const phase = (x - startX) / (endX - startX) * Math.PI;
            ctx.lineTo(x, sy + Math.sin(phase) * amp);
          }
        }
        ctx.stroke();
        ctx.fillStyle = "rgba(200,168,128,0.7)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(s.label || `弦 ${i + 1}`, 8, sy + 4);
      });
      if (currentIdx === -1) {
        info.textContent = "请选择一根琴弦进行调音";
      } else {
        const s = strings[currentIdx];
        const t = tensions[currentIdx];
        const err = Math.abs(t - s.target);
        info.textContent = `${s.label || "弦 " + (currentIdx + 1)} · 张力 ${t.toFixed(2)} · 目标 ${s.target.toFixed(2)} · 偏差 ${err.toFixed(3)}`;
      }
      if (pluckAnim.idx !== -1) {
        requestAnimationFrame(draw);
      }
    }

    function renderList() {
      listEl.innerHTML = "";
      strings.forEach((s, i) => {
        const btn = document.createElement("button");
        btn.className = "tn-string" + (currentIdx === i ? " selected" : "");
        btn.textContent = s.label || `弦 ${i + 1}`;
        btn.onclick = () => {
          if (aborted) return;
          currentIdx = i;
          slider.disabled = false;
          pluckBtn.disabled = false;
          slider.value = Math.round(tensions[i] * 100);
          valueEl.textContent = slider.value;
          renderList();
          draw();
        };
        listEl.appendChild(btn);
      });
    }

    slider.addEventListener("input", () => {
      if (aborted || currentIdx === -1) return;
      tensions[currentIdx] = parseInt(slider.value, 10) / 100;
      valueEl.textContent = slider.value;
      draw();
    });

    pluckBtn.onclick = () => {
      if (aborted || currentIdx === -1) return;
      pluckAnim = { idx: currentIdx, t: performance.now() };
      draw();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let totalDiff = 0;
      let worstIdx = 0;
      let worstDiff = 0;
      strings.forEach((s, i) => {
        const d = Math.abs(tensions[i] - s.target);
        totalDiff += d;
        if (d > worstDiff) { worstDiff = d; worstIdx = i; }
      });
      const avgDiff = totalDiff / Math.max(1, strings.length);
      const thresholds = tn.thresholds || [];
      let matched = tn.fallback || { tag: "miss", label: "——音不准", next: null };
      for (const t of thresholds) {
        if (avgDiff <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveTuningRecord(currentNodeId, worstIdx, tensions[worstIdx], avgDiff, matched.tag);
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
      reading.className = "tn-reading";
      reading.innerHTML = `<div class="tn-reading-title">${matched.label || "解读"} · 平均偏差 ${avgDiff.toFixed(3)}</div>
        <div class="tn-reading-text">${matched.text || ""}</div>
        <button class="tn-reading-close">继续</button>`;
      reading.querySelector(".tn-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    renderList();
    resize();
  }

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
  function runEclipse(ec, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "eclipse-layer";
    layer.id = "eclipse-layer";
    layer.innerHTML = `
      <div class="ec-prompt">${ec.prompt || "拖动月亮，让它的影子遮住那颗星"}</div>
      <div class="ec-stage">
        <canvas class="ec-canvas" id="ec-canvas"></canvas>
        <div class="ec-info" id="ec-info">拖动月亮对齐目标</div>
      </div>
      <div class="ec-slider-wrap">
        <input type="range" class="ec-slider" id="ec-slider" min="0" max="100" value="50">
        <span class="ec-value" id="ec-value">50</span>
      </div>
      <div class="ec-actions">
        <button class="ec-confirm" id="ec-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ec-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ec-info");
    const slider = layer.querySelector("#ec-slider");
    const valueEl = layer.querySelector("#ec-value");
    const confirmBtn = layer.querySelector("#ec-confirm");

    let aborted = false;
    const target = ec.target ?? 0.65;
    const tolerance = ec.tolerance ?? 0.05;
    let moon = 0.5;
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#0a0a20");
      grad.addColorStop(1, "#02020a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cy = ch * 0.5;
      // 星空
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137) % cw;
        const sy = ((i * 71) % ch);
        ctx.fillStyle = `rgba(220,220,255,${0.3 + (i % 5) * 0.1})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      // 目标星
      const targetX = cw * 0.1 + target * cw * 0.8;
      ctx.fillStyle = "#fff080";
      ctx.beginPath();
      ctx.arc(targetX, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,240,128,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(targetX, cy, 22, 0, Math.PI * 2);
      ctx.stroke();
      // 月亮
      const moonX = cw * 0.1 + moon * cw * 0.8;
      ctx.fillStyle = "#d8d8e0";
      ctx.beginPath();
      ctx.arc(moonX, cy, 24, 0, Math.PI * 2);
      ctx.fill();
      // 阴影
      const err = Math.abs(moon - target);
      const inTol = err <= tolerance;
      ctx.fillStyle = inTol ? "rgba(40,40,80,0.95)" : "rgba(80,30,30,0.5)";
      ctx.beginPath();
      ctx.arc(moonX, cy, 24, 0, Math.PI * 2);
      ctx.fill();
      info.textContent = `月亮 ${moon.toFixed(2)} · 目标 ${target.toFixed(2)} · 偏差 ${err.toFixed(3)}`;
    }

    slider.addEventListener("input", () => {
      if (aborted) return;
      moon = parseInt(slider.value, 10) / 100;
      valueEl.textContent = slider.value;
      draw();
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const err = Math.abs(moon - target);
      const thresholds = ec.thresholds || [];
      let matched = ec.fallback || { tag: "miss", label: "——没遮住", next: null };
      for (const t of thresholds) {
        if (err <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveEclipseRecord(currentNodeId, moon, target, err, matched.tag);
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
      reading.className = "ec-reading";
      reading.innerHTML = `<div class="ec-reading-title">${matched.label || "解读"} · 偏差 ${err.toFixed(3)}</div>
        <div class="ec-reading-text">${matched.text || ""}</div>
        <button class="ec-reading-close">继续</button>`;
      reading.querySelector(".ec-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runStamp(st, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "stamp-layer";
    layer.id = "stamp-layer";
    layer.innerHTML = `
      <div class="st-prompt">${st.prompt || "旋转印章，让图案对齐目标角度"}</div>
      <div class="st-stage">
        <canvas class="st-canvas" id="st-canvas"></canvas>
        <div class="st-info" id="st-info">拖动滑块调节角度</div>
      </div>
      <div class="st-slider-wrap">
        <input type="range" class="st-slider" id="st-slider" min="0" max="359" value="0">
        <span class="st-value" id="st-value">0°</span>
      </div>
      <div class="st-actions">
        <button class="st-confirm" id="st-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#st-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#st-info");
    const slider = layer.querySelector("#st-slider");
    const valueEl = layer.querySelector("#st-value");
    const confirmBtn = layer.querySelector("#st-confirm");

    let aborted = false;
    const target = st.target ?? 135;
    const tolerance = st.tolerance ?? 5;
    let angle = 0;
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#2a1a0a");
      grad.addColorStop(1, "#0a0505");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch / 2;
      const r = Math.min(cw, ch) * 0.38;
      // 目标圈
      ctx.strokeStyle = "rgba(255,150,150,0.6)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 目标指示
      const targetRad = (target - 90) * Math.PI / 180;
      ctx.strokeStyle = "#ff8080";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(targetRad) * r, cy + Math.sin(targetRad) * r);
      ctx.stroke();
      ctx.fillStyle = "#ff5050";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(targetRad) * r, cy + Math.sin(targetRad) * r, 6, 0, Math.PI * 2);
      ctx.fill();
      // 印章圆盘
      ctx.fillStyle = "rgba(180,60,40,0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c8a060";
      ctx.lineWidth = 3;
      ctx.stroke();
      // 印章图案（三角形指向上）
      const angleRad = (angle - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);
      ctx.fillStyle = "#fff0c0";
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(r * 0.45, r * 0.4);
      ctx.lineTo(-r * 0.45, r * 0.4);
      ctx.closePath();
      ctx.fill();
      // 印章中心字
      ctx.fillStyle = "#3a1a0a";
      ctx.font = `${r * 0.25}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("樱", 0, 0);
      ctx.restore();
      // 角度刻度
      for (let i = 0; i < 12; i++) {
        const a = i * 30 * Math.PI / 180;
        const x1 = cx + Math.cos(a) * r * 0.95;
        const y1 = cy + Math.sin(a) * r * 0.95;
        const x2 = cx + Math.cos(a) * r * 1.05;
        const y2 = cy + Math.sin(a) * r * 1.05;
        ctx.strokeStyle = "rgba(200,168,128,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      const err = Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target));
      const inTol = err <= tolerance;
      ctx.strokeStyle = inTol ? "#80ff80" : "#ffb060";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
      ctx.stroke();
      info.textContent = `角度 ${angle}° · 目标 ${target}° · 偏差 ${err.toFixed(1)}°`;
    }

    slider.addEventListener("input", () => {
      if (aborted) return;
      angle = parseInt(slider.value, 10);
      valueEl.textContent = angle + "°";
      draw();
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const err = Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target));
      const thresholds = st.thresholds || [];
      let matched = st.fallback || { tag: "miss", label: "——盖歪了", next: null };
      for (const t of thresholds) {
        if (err <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveStampRecord(currentNodeId, angle, target, err, matched.tag);
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
      reading.innerHTML = `<div class="st-reading-title">${matched.label || "解读"} · 偏差 ${err.toFixed(1)}°</div>
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
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runAstrolabe(ab_data, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "astrolabe-layer";
    layer.id = "astrolabe-layer";
    const targets = ab_data.targets || [0, 0, 0];
    layer.innerHTML = `
      <div class="ab-prompt">${ab_data.prompt || "调整三层星盘，对齐目标刻度"}</div>
      <div class="ab-stage">
        <canvas class="ab-canvas" id="ab-canvas"></canvas>
        <div class="ab-info" id="ab-info">拖动三个滑块对齐目标</div>
      </div>
      <div class="ab-sliders" id="ab-sliders"></div>
      <div class="ab-actions">
        <button class="ab-confirm" id="ab-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ab-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ab-info");
    const slidersWrap = layer.querySelector("#ab-sliders");
    const confirmBtn = layer.querySelector("#ab-confirm");

    let aborted = false;
    const tolerance = ab_data.tolerance ?? 6;
    const angles = targets.map(() => 0);
    let cw = 0, ch = 0;

    // 构建三个滑块
    targets.forEach((t, i) => {
      const wrap = document.createElement("div");
      wrap.className = "ab-slider-row";
      wrap.innerHTML = `
        <span class="ab-slider-label">层 ${i + 1}</span>
        <input type="range" class="ab-slider" min="0" max="359" value="0" data-idx="${i}">
        <span class="ab-slider-value" data-idx="${i}">0°</span>
      `;
      slidersWrap.appendChild(wrap);
      const sl = wrap.querySelector(".ab-slider");
      const vl = wrap.querySelector(".ab-slider-value");
      sl.addEventListener("input", () => {
        if (aborted) return;
        angles[i] = parseInt(sl.value, 10);
        vl.textContent = angles[i] + "°";
        draw();
      });
    });

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#0a1a2a");
      grad.addColorStop(1, "#020410");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch / 2;
      const r = Math.min(cw, ch) * 0.45;
      // 三层环
      const colors = ["#c060c0", "#60c0c0", "#c0c060"];
      const targetColors = ["#ff6080", "#60ff80", "#ffe060"];
      for (let i = 0; i < 3; i++) {
        const layerR = r * (1 - i * 0.28);
        // 目标
        const tRad = (targets[i] - 90) * Math.PI / 180;
        ctx.fillStyle = targetColors[i] + "60";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(tRad) * layerR, cy + Math.sin(tRad) * layerR, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = targetColors[i];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(tRad) * layerR, cy + Math.sin(tRad) * layerR);
        ctx.stroke();
        // 当前
        const aRad = (angles[i] - 90) * Math.PI / 180;
        const err = Math.min(Math.abs(angles[i] - targets[i]), 360 - Math.abs(angles[i] - targets[i]));
        const inTol = err <= tolerance;
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, layerR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = inTol ? targetColors[i] : colors[i];
        ctx.beginPath();
        ctx.arc(cx + Math.cos(aRad) * layerR, cy + Math.sin(aRad) * layerR, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      // 总偏差
      let totalErr = 0;
      for (let i = 0; i < 3; i++) {
        totalErr += Math.min(Math.abs(angles[i] - targets[i]), 360 - Math.abs(angles[i] - targets[i]));
      }
      const avgErr = totalErr / 3;
      info.textContent = `平均偏差 ${avgErr.toFixed(1)}°`;
    }

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let totalErr = 0;
      for (let i = 0; i < 3; i++) {
        totalErr += Math.min(Math.abs(angles[i] - targets[i]), 360 - Math.abs(angles[i] - targets[i]));
      }
      const avgErr = totalErr / 3;
      const thresholds = ab_data.thresholds || [];
      let matched = ab_data.fallback || { tag: "miss", label: "——没对齐", next: null };
      for (const t of thresholds) {
        if (avgErr <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveAstrolabeRecord(currentNodeId, angles, targets, avgErr, matched.tag);
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
      reading.className = "ab-reading";
      reading.innerHTML = `<div class="ab-reading-title">${matched.label || "解读"} · 平均偏差 ${avgErr.toFixed(1)}°</div>
        <div class="ab-reading-text">${matched.text || ""}</div>
        <button class="ab-reading-close">继续</button>`;
      reading.querySelector(".ab-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runSandpaint(sp, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "sandpaint-layer";
    layer.id = "sandpaint-layer";
    const pattern = sp.pattern || [];
    const rows = pattern.length;
    const cols = pattern[0] ? pattern[0].length : 0;
    const totalCells = rows * cols;
    const targetCount = pattern.flat().filter(v => v === 1).length;
    layer.innerHTML = `
      <div class="sp-prompt">${sp.prompt || "在沙盘上点选格子，还原星图"}</div>
      <div class="sp-stage">
        <canvas class="sp-canvas" id="sp-canvas"></canvas>
        <div class="sp-info" id="sp-info">点击格子放沙</div>
      </div>
      <div class="sp-progress" id="sp-progress">0 / ${targetCount}</div>
      <div class="sp-actions">
        <button class="sp-reset">重置</button>
        <button class="sp-confirm" id="sp-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#sp-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#sp-info");
    const progressEl = layer.querySelector("#sp-progress");
    const confirmBtn = layer.querySelector(".sp-confirm");
    const resetBtn = layer.querySelector(".sp-reset");

    let aborted = false;
    const tolerance = sp.tolerance ?? 4;
    const grid = pattern.map(row => row.map(() => 0));
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#3a2a1a");
      grad.addColorStop(1, "#1a0a05");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cellW = cw / cols;
      const cellH = ch / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellW;
          const y = r * cellH;
          ctx.strokeStyle = "rgba(200,168,128,0.3)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellW, cellH);
          if (grid[r][c]) {
            // 沙粒
            for (let i = 0; i < 6; i++) {
              const px = x + cellW * (0.2 + Math.random() * 0.6);
              const py = y + cellH * (0.2 + Math.random() * 0.6);
              ctx.fillStyle = "#ffd060";
              ctx.beginPath();
              ctx.arc(px, py, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      const filled = grid.flat().filter(v => v === 1).length;
      progressEl.textContent = `${filled} / ${targetCount}`;
      info.textContent = `点选格子放沙（已放 ${filled}）`;
    }

    canvas.addEventListener("click", (e) => {
      if (aborted) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / (cw / cols));
      const r = Math.floor(y / (ch / rows));
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      grid[r][c] = grid[r][c] ? 0 : 1;
      draw();
    });

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = 0;
      draw();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let matched = 0;
      let mismatched = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === pattern[r][c]) {
            if (pattern[r][c] === 1) matched++;
          } else {
            mismatched++;
          }
        }
      }
      const thresholds = sp.thresholds || [];
      let matchedOpt = sp.fallback || { tag: "miss", label: "——画错了", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matchedOpt = t; break; }
      }
      Saves.saveSandpaintRecord(currentNodeId, grid, matched, targetCount, matchedOpt.tag);
      if (matchedOpt.add) { applyAdd(matchedOpt.add); updateHeartBar(); }
      if (matchedOpt.personality) {
        for (const dim in matchedOpt.personality) Saves.addPersonality(dim, matchedOpt.personality[dim]);
      }
      if (matchedOpt.memory) {
        if (!Saves.isMemoryUnlocked(matchedOpt.memory.id)) {
          Saves.saveMemory(matchedOpt.memory.id, matchedOpt.memory.text);
          flashHint(`✦ 新记忆：${matchedOpt.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "sp-reading";
      reading.innerHTML = `<div class="sp-reading-title">${matchedOpt.label || "解读"} · 匹配 ${matched}/${targetCount} · 偏差 ${mismatched}</div>
        <div class="sp-reading-text">${matchedOpt.text || ""}</div>
        <button class="sp-reading-close">继续</button>`;
      reading.querySelector(".sp-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matchedOpt.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runKaleido(ka, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "kaleido-layer";
    layer.id = "kaleido-layer";
    layer.innerHTML = `
      <div class="ka-prompt">${ka.prompt || "旋转万花筒，让图案对齐目标角度"}</div>
      <div class="ka-stage">
        <canvas class="ka-canvas" id="ka-canvas"></canvas>
        <div class="ka-info" id="ka-info">拖动滑块调节角度</div>
      </div>
      <div class="ka-slider-wrap">
        <input type="range" class="ka-slider" id="ka-slider" min="0" max="359" value="0">
        <span class="ka-value" id="ka-value">0°</span>
      </div>
      <div class="ka-actions">
        <button class="ka-confirm" id="ka-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ka-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ka-info");
    const slider = layer.querySelector("#ka-slider");
    const valueEl = layer.querySelector("#ka-value");
    const confirmBtn = layer.querySelector("#ka-confirm");

    let aborted = false;
    const target = ka.target ?? 90;
    const tolerance = ka.tolerance ?? 5;
    let angle = 0;
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#1a0a2a");
      grad.addColorStop(1, "#050208");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch / 2;
      const r = Math.min(cw, ch) * 0.42;
      // 目标圈
      ctx.strokeStyle = "rgba(255,150,200,0.6)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 目标指示
      const targetRad = (target - 90) * Math.PI / 180;
      ctx.strokeStyle = "#ff80a0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(targetRad) * r, cy + Math.sin(targetRad) * r);
      ctx.stroke();
      // 万花筒六瓣图案
      const angleRad = (angle - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 3);
        const petalGrad = ctx.createLinearGradient(0, 0, r, 0);
        petalGrad.addColorStop(0, "rgba(200,100,200,0.4)");
        petalGrad.addColorStop(1, "rgba(100,200,255,0.6)");
        ctx.fillStyle = petalGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.5, 0, r * 0.4, r * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // 中心
      const err = Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target));
      const inTol = err <= tolerance;
      ctx.fillStyle = inTol ? "#80ff80" : "#ff80a0";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      info.textContent = `角度 ${angle}° · 目标 ${target}° · 偏差 ${err.toFixed(1)}°`;
    }

    slider.addEventListener("input", () => {
      if (aborted) return;
      angle = parseInt(slider.value, 10);
      valueEl.textContent = angle + "°";
      draw();
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const err = Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target));
      const thresholds = ka.thresholds || [];
      let matched = ka.fallback || { tag: "miss", label: "——没对上", next: null };
      for (const t of thresholds) {
        if (err <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveKaleidoRecord(currentNodeId, angle, target, err, matched.tag);
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
      reading.className = "ka-reading";
      reading.innerHTML = `<div class="ka-reading-title">${matched.label || "解读"} · 偏差 ${err.toFixed(1)}°</div>
        <div class="ka-reading-text">${matched.text || ""}</div>
        <button class="ka-reading-close">继续</button>`;
      reading.querySelector(".ka-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runAbacus(ab, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "abacus-layer";
    layer.id = "abacus-layer";
    const targets = ab.targets || [0];
    const maxPerRod = ab.maxPerRod ?? 7;
    layer.innerHTML = `
      <div class="ab_ac-prompt">${ab.prompt || "拨算珠，让每档数量等于目标"}</div>
      <div class="ab_ac-stage">
        <canvas class="ab_ac-canvas" id="ab_ac-canvas"></canvas>
        <div class="ab_ac-info" id="ab_ac-info">点击算珠上下拨动</div>
      </div>
      <div class="ab_ac-progress" id="ab_ac-progress">0 / ${targets.length}</div>
      <div class="ab_ac-actions">
        <button class="ab_ac-confirm" id="ab_ac-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ab_ac-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ab_ac-info");
    const progressEl = layer.querySelector("#ab_ac-progress");
    const confirmBtn = layer.querySelector("#ab_ac-confirm");

    let aborted = false;
    const tolerance = ab.tolerance ?? 0;
    const counts = targets.map(() => 0);
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#3a2a1a");
      grad.addColorStop(1, "#1a0a05");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const rodCount = targets.length;
      const rodSpacing = cw / (rodCount + 1);
      const beadR = Math.min(rodSpacing * 0.4, 18);
      const topY = ch * 0.15;
      const botY = ch * 0.85;
      for (let i = 0; i < rodCount; i++) {
        const x = (i + 1) * rodSpacing;
        // 杆
        ctx.strokeStyle = "#5a4030";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, botY);
        ctx.stroke();
        // 目标提示
        ctx.fillStyle = "rgba(255,200,100,0.7)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`目标 ${targets[i]}`, x, topY - 10);
        // 算珠
        for (let b = 0; b < maxPerRod; b++) {
          const isUp = b < counts[i];
          const y = isUp
            ? botY - (b + 1) * (beadR * 2 + 2)
            : topY + (b - counts[i]) * (beadR * 2 + 2);
          const isTarget = isUp && b < targets[i];
          ctx.fillStyle = isTarget ? "#ffd060" : "#8a6040";
          ctx.beginPath();
          ctx.arc(x, y, beadR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#3a2010";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      // 计数显示
      const matchedRods = counts.filter((c, i) => Math.abs(c - targets[i]) <= tolerance).length;
      progressEl.textContent = `${matchedRods} / ${rodCount}`;
      info.textContent = `已对 ${matchedRods}/${rodCount} 档`;
    }

    canvas.addEventListener("click", (e) => {
      if (aborted) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rodCount = targets.length;
      const rodSpacing = cw / (rodCount + 1);
      const beadR = Math.min(rodSpacing * 0.4, 18);
      const topY = ch * 0.15;
      const botY = ch * 0.85;
      for (let i = 0; i < rodCount; i++) {
        const rodX = (i + 1) * rodSpacing;
        if (Math.abs(x - rodX) > beadR + 5) continue;
        // 判断点击上区或下区
        if (y > ch / 2) {
          // 下区：增加
          if (counts[i] < maxPerRod) counts[i]++;
        } else {
          // 上区：减少
          if (counts[i] > 0) counts[i]--;
        }
        draw();
        return;
      }
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let totalDiff = 0;
      counts.forEach((c, i) => { totalDiff += Math.abs(c - targets[i]); });
      const thresholds = ab.thresholds || [];
      let matched = ab.fallback || { tag: "miss", label: "——拨错了", next: null };
      for (const t of thresholds) {
        if (totalDiff <= (t.max ?? tolerance * targets.length)) { matched = t; break; }
      }
      Saves.saveAbacusRecord(currentNodeId, counts, targets, totalDiff, matched.tag);
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
      reading.className = "ab_ac-reading";
      reading.innerHTML = `<div class="ab_ac-reading-title">${matched.label || "解读"} · 总偏差 ${totalDiff}</div>
        <div class="ab_ac-reading-text">${matched.text || ""}</div>
        <button class="ab_ac-reading-close">继续</button>`;
      reading.querySelector(".ab_ac-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runGear(gd, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "gear-layer";
    layer.id = "gear-layer";
    const teeth = gd.teeth || [10, 10, 10];
    const targets = teeth.map(() => 0); // 都对齐顶部 0°
    layer.innerHTML = `
      <div class="gr-prompt">${gd.prompt || "旋转齿轮，让标记齿对齐顶部"}</div>
      <div class="gr-stage">
        <canvas class="gr-canvas" id="gr-canvas"></canvas>
        <div class="gr-info" id="gr-info">拖动滑块对齐顶部</div>
      </div>
      <div class="gr-sliders" id="gr-sliders"></div>
      <div class="gr-actions">
        <button class="gr-confirm" id="gr-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#gr-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#gr-info");
    const slidersWrap = layer.querySelector("#gr-sliders");
    const confirmBtn = layer.querySelector("#gr-confirm");

    let aborted = false;
    const tolerance = gd.tolerance ?? 6;
    const angles = teeth.map(() => 0);
    let cw = 0, ch = 0;

    teeth.forEach((t, i) => {
      const wrap = document.createElement("div");
      wrap.className = "gr-slider-row";
      wrap.innerHTML = `
        <span class="gr-slider-label">齿 ${i + 1}</span>
        <input type="range" class="gr-slider" min="0" max="359" value="0" data-idx="${i}">
        <span class="gr-slider-value" data-idx="${i}">0°</span>
      `;
      slidersWrap.appendChild(wrap);
      const sl = wrap.querySelector(".gr-slider");
      const vl = wrap.querySelector(".gr-slider-value");
      sl.addEventListener("input", () => {
        if (aborted) return;
        angles[i] = parseInt(sl.value, 10);
        vl.textContent = angles[i] + "°";
        draw();
      });
    });

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#1a2a3a");
      grad.addColorStop(1, "#050a15");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const gearCount = teeth.length;
      const gearR = Math.min(cw / (gearCount * 2.4), ch * 0.32);
      const centerY = ch * 0.55;
      for (let i = 0; i < gearCount; i++) {
        const cx = cw * (i + 1) / (gearCount + 1);
        const cy = centerY;
        const r = gearR;
        const t = teeth[i];
        const angle = angles[i];
        const angleRad = angle * Math.PI / 180;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angleRad);
        // 齿
        ctx.fillStyle = "#6080a0";
        ctx.strokeStyle = "#a0c0e0";
        ctx.lineWidth = 1;
        for (let k = 0; k < t; k++) {
          const a1 = (k / t) * Math.PI * 2;
          const a2 = ((k + 0.5) / t) * Math.PI * 2;
          const a3 = ((k + 1) / t) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
          ctx.lineTo(Math.cos(a1) * r * 1.18, Math.sin(a1) * r * 1.18);
          ctx.lineTo(Math.cos(a2) * r * 1.18, Math.sin(a2) * r * 1.18);
          ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        // 内圆
        ctx.fillStyle = "#3a5070";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 标记齿（k=0）红色
        ctx.fillStyle = "#ff6080";
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.1, -r * 1.18);
        ctx.lineTo(-r * 0.1, -r * 1.18);
        ctx.closePath();
        ctx.fill();
        // 中心
        ctx.fillStyle = "#a0c0e0";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // 顶部目标指示
        ctx.strokeStyle = "rgba(255,255,100,0.6)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 1.3);
        ctx.lineTo(cx, cy - r * 0.8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // 计算偏差
      let totalErr = 0;
      for (let i = 0; i < angles.length; i++) {
        const err = Math.min(Math.abs(angles[i] - targets[i]), 360 - Math.abs(angles[i] - targets[i]));
        totalErr += err;
      }
      const avgErr = totalErr / angles.length;
      info.textContent = `平均偏差 ${avgErr.toFixed(1)}°`;
    }

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let totalErr = 0;
      for (let i = 0; i < angles.length; i++) {
        totalErr += Math.min(Math.abs(angles[i] - targets[i]), 360 - Math.abs(angles[i] - targets[i]));
      }
      const avgErr = totalErr / angles.length;
      const thresholds = gd.thresholds || [];
      let matched = gd.fallback || { tag: "miss", label: "——没对齐", next: null };
      for (const t of thresholds) {
        if (avgErr <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveGearRecord(currentNodeId, angles, targets, avgErr, matched.tag);
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
      reading.className = "gr-reading";
      reading.innerHTML = `<div class="gr-reading-title">${matched.label || "解读"} · 平均偏差 ${avgErr.toFixed(1)}°</div>
        <div class="gr-reading-text">${matched.text || ""}</div>
        <button class="gr-reading-close">继续</button>`;
      reading.querySelector(".gr-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runTopo(tp, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "topo-layer";
    layer.id = "topo-layer";
    const points = tp.points || [];
    const targetH = tp.targetH ?? 0.6;
    const tolerance = tp.tolerance ?? 0.05;
    const expectedPoints = points.filter(p => Math.abs(p.h - targetH) <= tolerance);
    layer.innerHTML = `
      <div class="to-prompt">${tp.prompt || "在地图上点选海拔相同的点"}</div>
      <div class="to-stage">
        <canvas class="to-canvas" id="to-canvas"></canvas>
        <div class="to-info" id="to-info">点击海拔接近 ${targetH.toFixed(2)} 的点</div>
      </div>
      <div class="to-progress" id="to-progress">0 / ${expectedPoints.length}</div>
      <div class="to-actions">
        <button class="to-reset">重置</button>
        <button class="to-confirm" id="to-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#to-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#to-info");
    const progressEl = layer.querySelector("#to-progress");
    const confirmBtn = layer.querySelector(".to-confirm");
    const resetBtn = layer.querySelector(".to-reset");

    let aborted = false;
    const selected = new Set();
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#1a3a2a");
      grad.addColorStop(1, "#0a1a15");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      // 等高线
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(120,200,140,${0.15 + i * 0.05})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cw / 2, ch / 2, cw * (0.2 + i * 0.1), ch * (0.15 + i * 0.08), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 所有点
      points.forEach((p, i) => {
        const x = p.x * cw;
        const y = p.y * ch;
        const isExpected = Math.abs(p.h - targetH) <= tolerance;
        const isSelected = selected.has(i);
        // 海拔颜色：低=深绿，高=黄
        const hue = (1 - p.h) * 120;
        ctx.fillStyle = isSelected
          ? "#ffe060"
          : `hsl(${hue}, 60%, 50%)`;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 10 : 6, 0, Math.PI * 2);
        ctx.fill();
        if (isExpected && !isSelected) {
          ctx.strokeStyle = "rgba(255,224,96,0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      progressEl.textContent = `${selected.size} / ${expectedPoints.length}`;
      info.textContent = `已选 ${selected.size}/${expectedPoints.length} 个目标点`;
    }

    canvas.addEventListener("click", (e) => {
      if (aborted) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let hit = -1;
      let minD = 18;
      points.forEach((p, i) => {
        const px = p.x * cw;
        const py = p.y * ch;
        const d = Math.hypot(px - x, py - y);
        if (d < minD) { minD = d; hit = i; }
      });
      if (hit === -1) return;
      if (selected.has(hit)) selected.delete(hit);
      else selected.add(hit);
      draw();
    });

    resetBtn.onclick = () => {
      if (aborted) return;
      selected.clear();
      draw();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let matched = 0;
      let mismatched = 0;
      // 统计：选中的是否都在目标点中，未选中的目标点
      expectedPoints.forEach((p, idx) => {
        const realIdx = points.indexOf(p);
        if (selected.has(realIdx)) matched++;
        else mismatched++;
      });
      // 多选的（不在 expected 中）
      selected.forEach(i => {
        if (!expectedPoints.includes(points[i])) mismatched++;
      });
      const thresholds = tp.thresholds || [];
      let matchedOpt = tp.fallback || { tag: "miss", label: "——选错了", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance * 10)) { matchedOpt = t; break; }
      }
      Saves.saveTopoRecord(currentNodeId, Array.from(selected), matched, expectedPoints.length, matchedOpt.tag);
      if (matchedOpt.add) { applyAdd(matchedOpt.add); updateHeartBar(); }
      if (matchedOpt.personality) {
        for (const dim in matchedOpt.personality) Saves.addPersonality(dim, matchedOpt.personality[dim]);
      }
      if (matchedOpt.memory) {
        if (!Saves.isMemoryUnlocked(matchedOpt.memory.id)) {
          Saves.saveMemory(matchedOpt.memory.id, matchedOpt.memory.text);
          flashHint(`✦ 新记忆：${matchedOpt.memory.title}`);
        }
      }
      const reading = document.createElement("div");
      reading.className = "to-reading";
      reading.innerHTML = `<div class="to-reading-title">${matchedOpt.label || "解读"} · 匹配 ${matched}/${expectedPoints.length} · 偏差 ${mismatched}</div>
        <div class="to-reading-text">${matchedOpt.text || ""}</div>
        <button class="to-reading-close">继续</button>`;
      reading.querySelector(".to-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matchedOpt.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runSundial(sd, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "sundial-layer";
    layer.id = "sundial-layer";
    layer.innerHTML = `
      <div class="su-prompt">${sd.prompt || "旋转日晷指针，对齐目标时间刻度"}</div>
      <div class="su-stage">
        <canvas class="su-canvas" id="su-canvas"></canvas>
        <div class="su-info" id="su-info">拖动滑块对齐目标时间</div>
      </div>
      <div class="su-slider-wrap">
        <input type="range" class="su-slider" id="su-slider" min="0" max="359" value="0">
        <span class="su-value" id="su-value">0°</span>
      </div>
      <div class="su-actions">
        <button class="su-confirm" id="su-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#su-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#su-info");
    const slider = layer.querySelector("#su-slider");
    const valueEl = layer.querySelector("#su-value");
    const confirmBtn = layer.querySelector("#su-confirm");

    let aborted = false;
    const target = sd.target ?? 90;
    const tolerance = sd.tolerance ?? 8;
    let angle = 0;
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#3a2a1a");
      grad.addColorStop(1, "#0f0805");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch / 2;
      const r = Math.min(cw, ch) * 0.42;
      // 日晷盘刻度
      ctx.strokeStyle = "rgba(220,180,100,0.4)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
      // 外圆
      ctx.strokeStyle = "#ffd060";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // 目标指针（虚线）
      const targetRad = (target - 90) * Math.PI / 180;
      ctx.strokeStyle = "rgba(255,180,80,0.7)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(targetRad) * r * 0.9, cy + Math.sin(targetRad) * r * 0.9);
      ctx.stroke();
      ctx.setLineDash([]);
      // 当前指针
      const angleRad = (angle - 90) * Math.PI / 180;
      ctx.strokeStyle = "#ffe080";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angleRad) * r * 0.9, cy + Math.sin(angleRad) * r * 0.9);
      ctx.stroke();
      // 中心
      const err = Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target));
      const inTol = err <= tolerance;
      ctx.fillStyle = inTol ? "#80ff80" : "#ffd060";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      // 时间刻度文本
      ctx.fillStyle = "rgba(255,208,96,0.7)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      const hourLabels = ["12","3","6","9"];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(hourLabels[i], cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12 + 4);
      }
      info.textContent = `角度 ${angle}° · 目标 ${target}° · 偏差 ${err.toFixed(1)}°`;
    }

    slider.addEventListener("input", () => {
      if (aborted) return;
      angle = parseInt(slider.value, 10);
      valueEl.textContent = angle + "°";
      draw();
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const err = Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target));
      const thresholds = sd.thresholds || [];
      let matched = sd.fallback || { tag: "miss", label: "——没对上", next: null };
      for (const t of thresholds) {
        if (err <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveSundialRecord(currentNodeId, angle, target, err, matched.tag);
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
      reading.className = "su-reading";
      reading.innerHTML = `<div class="su-reading-title">${matched.label || "解读"} · 偏差 ${err.toFixed(1)}°</div>
        <div class="su-reading-text">${matched.text || ""}</div>
        <button class="su-reading-close">继续</button>`;
      reading.querySelector(".su-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runDye(dy, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "dye-layer";
    layer.id = "dye-layer";
    const target = dy.target || { r: 200, g: 100, b: 80 };
    layer.innerHTML = `
      <div class="dy-prompt">${dy.prompt || "调节三色染缸，调出目标颜色"}</div>
      <div class="dy-stage">
        <div class="dy-swatches">
          <div class="dy-target">
            <div class="dy-swatch" id="dy-target-swatch"></div>
            <div class="dy-label">目标</div>
          </div>
          <div class="dy-current">
            <div class="dy-swatch" id="dy-current-swatch"></div>
            <div class="dy-label">当前</div>
          </div>
        </div>
        <div class="dy-sliders" id="dy-sliders"></div>
        <div class="dy-info" id="dy-info">拖动滑块调节颜色</div>
      </div>
      <div class="dy-actions">
        <button class="dy-confirm" id="dy-confirm">确认</button>
      </div>
    `;
    const targetSwatch = layer.querySelector("#dy-target-swatch");
    const currentSwatch = layer.querySelector("#dy-current-swatch");
    const slidersWrap = layer.querySelector("#dy-sliders");
    const info = layer.querySelector("#dy-info");
    const confirmBtn = layer.querySelector("#dy-confirm");

    let aborted = false;
    const tolerance = dy.tolerance ?? 30;
    const rgb = { r: 128, g: 128, b: 128 };

    targetSwatch.style.background = `rgb(${target.r}, ${target.g}, ${target.b})`;
    currentSwatch.style.background = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

    ["r", "g", "b"].forEach(ch => {
      const wrap = document.createElement("div");
      wrap.className = "dy-slider-row";
      const labels = { r: "红", g: "绿", b: "蓝" };
      wrap.innerHTML = `
        <span class="dy-slider-label">${labels[ch]}</span>
        <input type="range" class="dy-slider dy-slider-${ch}" min="0" max="255" value="128" data-ch="${ch}">
        <span class="dy-slider-value" data-ch="${ch}">128</span>
      `;
      slidersWrap.appendChild(wrap);
      const sl = wrap.querySelector(".dy-slider");
      const vl = wrap.querySelector(".dy-slider-value");
      sl.addEventListener("input", () => {
        if (aborted) return;
        rgb[ch] = parseInt(sl.value, 10);
        vl.textContent = rgb[ch];
        currentSwatch.style.background = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        updateInfo();
      });
    });

    function updateInfo() {
      const dr = rgb.r - target.r;
      const dg = rgb.g - target.g;
      const db = rgb.b - target.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      info.textContent = `色差 ${dist.toFixed(0)}（目标 ≤ ${tolerance * 3}）`;
    }
    updateInfo();

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const dr = rgb.r - target.r;
      const dg = rgb.g - target.g;
      const db = rgb.b - target.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      const thresholds = dy.thresholds || [];
      let matched = dy.fallback || { tag: "miss", label: "——调错了", next: null };
      for (const t of thresholds) {
        if (dist <= (t.max ?? tolerance * 3)) { matched = t; break; }
      }
      Saves.saveDyeRecord(currentNodeId, rgb, target, dist, matched.tag);
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
      reading.className = "dy-reading";
      reading.innerHTML = `<div class="dy-reading-title">${matched.label || "解读"} · 色差 ${dist.toFixed(0)}</div>
        <div class="dy-reading-text">${matched.text || ""}</div>
        <button class="dy-reading-close">继续</button>`;
      reading.querySelector(".dy-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runWindmill(wm, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "windmill-layer";
    layer.id = "windmill-layer";
    const blades = wm.blades || 4;
    const target = wm.target ?? 90;
    layer.innerHTML = `
      <div class="wm-prompt">${wm.prompt || "旋转每个叶片，让风车正对风向"}</div>
      <div class="wm-stage">
        <canvas class="wm-canvas" id="wm-canvas"></canvas>
        <div class="wm-info" id="wm-info">拖动滑块对齐风向</div>
      </div>
      <div class="wm-sliders" id="wm-sliders"></div>
      <div class="wm-actions">
        <button class="wm-confirm" id="wm-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#wm-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#wm-info");
    const slidersWrap = layer.querySelector("#wm-sliders");
    const confirmBtn = layer.querySelector("#wm-confirm");

    let aborted = false;
    const tolerance = wm.tolerance ?? 8;
    const angles = new Array(blades).fill(0);
    let cw = 0, ch = 0;

    for (let i = 0; i < blades; i++) {
      const wrap = document.createElement("div");
      wrap.className = "wm-slider-row";
      wrap.innerHTML = `
        <span class="wm-slider-label">叶 ${i + 1}</span>
        <input type="range" class="wm-slider" min="0" max="359" value="0" data-idx="${i}">
        <span class="wm-slider-value" data-idx="${i}">0°</span>
      `;
      slidersWrap.appendChild(wrap);
      const sl = wrap.querySelector(".wm-slider");
      const vl = wrap.querySelector(".wm-slider-value");
      sl.addEventListener("input", () => {
        if (aborted) return;
        angles[i] = parseInt(sl.value, 10);
        vl.textContent = angles[i] + "°";
        draw();
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      draw();
    }

    function draw() {
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
      grad.addColorStop(0, "#1a3a3a");
      grad.addColorStop(1, "#051515");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch / 2;
      const r = Math.min(cw, ch) * 0.36;
      // 风向指示
      const windRad = (target - 90) * Math.PI / 180;
      ctx.strokeStyle = "rgba(255,200,100,0.6)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(windRad) * r * 1.3, cy - Math.sin(windRad) * r * 1.3);
      ctx.lineTo(cx + Math.cos(windRad) * r * 1.3, cy + Math.sin(windRad) * r * 1.3);
      ctx.stroke();
      ctx.setLineDash([]);
      // 风向箭头
      ctx.fillStyle = "#ffd060";
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(windRad) * r * 1.3, cy + Math.sin(windRad) * r * 1.3);
      ctx.lineTo(cx + Math.cos(windRad + 2.5) * r * 1.15, cy + Math.sin(windRad + 2.5) * r * 1.15);
      ctx.lineTo(cx + Math.cos(windRad - 2.5) * r * 1.15, cy + Math.sin(windRad - 2.5) * r * 1.15);
      ctx.closePath();
      ctx.fill();
      // 叶片
      for (let i = 0; i < blades; i++) {
        const baseAngle = (i / blades) * Math.PI * 2;
        const angleRad = (angles[i] - 90) * Math.PI / 180;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(baseAngle + angleRad);
        const bladeGrad = ctx.createLinearGradient(0, 0, r, 0);
        bladeGrad.addColorStop(0, "rgba(160,220,200,0.9)");
        bladeGrad.addColorStop(1, "rgba(80,160,140,0.7)");
        ctx.fillStyle = bladeGrad;
        ctx.strokeStyle = "#a0d0c0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.12);
        ctx.quadraticCurveTo(r * 0.5, -r * 0.18, r, -r * 0.05);
        ctx.lineTo(r, r * 0.05);
        ctx.quadraticCurveTo(r * 0.5, r * 0.18, 0, r * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // 中心轴
      ctx.fillStyle = "#a0d0c0";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#60807a";
      ctx.lineWidth = 1;
      ctx.stroke();
      // 平均偏差
      let totalErr = 0;
      for (let i = 0; i < angles.length; i++) {
        totalErr += Math.min(Math.abs(angles[i] - target), 360 - Math.abs(angles[i] - target));
      }
      const avgErr = totalErr / angles.length;
      info.textContent = `平均偏差 ${avgErr.toFixed(1)}°`;
    }

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let totalErr = 0;
      for (let i = 0; i < angles.length; i++) {
        totalErr += Math.min(Math.abs(angles[i] - target), 360 - Math.abs(angles[i] - target));
      }
      const avgErr = totalErr / angles.length;
      const thresholds = wm.thresholds || [];
      let matched = wm.fallback || { tag: "miss", label: "——没对齐", next: null };
      for (const t of thresholds) {
        if (avgErr <= (t.max ?? tolerance)) { matched = t; break; }
      }
      Saves.saveWindmillRecord(currentNodeId, angles, target, avgErr, matched.tag);
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
      reading.className = "wm-reading";
      reading.innerHTML = `<div class="wm-reading-title">${matched.label || "解读"} · 平均偏差 ${avgErr.toFixed(1)}°</div>
        <div class="wm-reading-text">${matched.text || ""}</div>
        <button class="wm-reading-close">继续</button>`;
      reading.querySelector(".wm-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
  }

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
  function runWeave(wv, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "weave-layer";
    layer.id = "weave-layer";
    const pattern = wv.pattern || [[0,1],[1,0]];
    const rows = pattern.length;
    const cols = pattern[0].length;
    const tolerance = wv.tolerance ?? 2;
    // 玩家选择：0=未定, 1=经(深色), 2=纬(浅色)
    const grid = pattern.map(row => row.map(() => 0));
    layer.innerHTML = `
      <div class="wv-prompt">${wv.prompt || "交替点选经纬线，编织目标图案"}</div>
      <div class="wv-stage">
        <div class="wv-grid" id="wv-grid"></div>
        <div class="wv-info" id="wv-info">点击格子切换经纬</div>
      </div>
      <div class="wv-progress" id="wv-progress">0 / ${rows * cols}</div>
      <div class="wv-actions">
        <button class="wv-reset">重置</button>
        <button class="wv-confirm" id="wv-confirm">确认</button>
      </div>
    `;
    const gridEl = layer.querySelector("#wv-grid");
    const info = layer.querySelector("#wv-info");
    const progressEl = layer.querySelector("#wv-progress");
    const confirmBtn = layer.querySelector(".wv-confirm");
    const resetBtn = layer.querySelector(".wv-reset");

    let aborted = false;

    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    function render() {
      gridEl.innerHTML = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement("div");
          cell.className = "wv-cell";
          cell.dataset.r = r;
          cell.dataset.c = c;
          if (grid[r][c] === 1) cell.classList.add("wv-warp");
          else if (grid[r][c] === 2) cell.classList.add("wv-weft");
          cell.addEventListener("click", () => {
            if (aborted) return;
            grid[r][c] = (grid[r][c] + 1) % 3;
            render();
          });
          gridEl.appendChild(cell);
        }
      }
      // 进度
      let filled = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== 0) filled++;
        }
      }
      progressEl.textContent = `${filled} / ${rows * cols}`;
      info.textContent = `已填 ${filled}/${rows * cols} 格`;
    }
    render();

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) grid[r][c] = 0;
      }
      render();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let mismatched = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const expected = pattern[r][c];
          const actual = grid[r][c] === 1 ? 1 : (grid[r][c] === 2 ? 0 : -1);
          if (actual === -1 || actual !== expected) mismatched++;
        }
      }
      const thresholds = wv.thresholds || [];
      let matched = wv.fallback || { tag: "miss", label: "——编错了", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matched = t; break; }
      }
      const matchedCount = rows * cols - mismatched;
      Saves.saveWeaveRecord(currentNodeId, grid, matchedCount, rows * cols, matched.tag);
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
      reading.className = "wv-reading";
      reading.innerHTML = `<div class="wv-reading-title">${matched.label || "解读"} · 匹配 ${matchedCount}/${rows * cols} · 错 ${mismatched}</div>
        <div class="wv-reading-text">${matched.text || ""}</div>
        <button class="wv-reading-close">继续</button>`;
      reading.querySelector(".wv-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runMirror(mi, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "mirror-layer";
    layer.id = "mirror-layer";
    const pattern = mi.pattern || [[1,0,0,1],[0,1,1,0],[1,0,0,1],[0,1,1,0]];
    const rows = pattern.length;
    const cols = pattern[0].length;
    const tolerance = mi.tolerance ?? 1;
    const grid = pattern.map(row => row.map(() => 0));
    layer.innerHTML = `
      <div class="mi-prompt">${mi.prompt || "点选格子让左半镜像右半"}</div>
      <div class="mi-stage">
        <div class="mi-grid" id="mi-grid"></div>
        <div class="mi-info" id="mi-info">点击格子切换亮/灭，让图案左右对称</div>
      </div>
      <div class="mi-progress" id="mi-progress">0 / ${rows * cols}</div>
      <div class="mi-actions">
        <button class="mi-reset">重置</button>
        <button class="mi-confirm" id="mi-confirm">确认</button>
      </div>
    `;
    const gridEl = layer.querySelector("#mi-grid");
    const info = layer.querySelector("#mi-info");
    const progressEl = layer.querySelector("#mi-progress");
    const confirmBtn = layer.querySelector(".mi-confirm");
    const resetBtn = layer.querySelector(".mi-reset");

    let aborted = false;

    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    function render() {
      gridEl.innerHTML = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement("div");
          cell.className = "mi-cell";
          if (grid[r][c] === 1) cell.classList.add("mi-on");
          cell.addEventListener("click", () => {
            if (aborted) return;
            grid[r][c] = grid[r][c] ? 0 : 1;
            render();
          });
          gridEl.appendChild(cell);
        }
      }
      let filled = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c]) filled++;
      progressEl.textContent = `${filled} / ${rows * cols}`;
      info.textContent = `已亮 ${filled}/${rows * cols} 格`;
    }
    render();

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = 0;
      render();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let mismatched = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== pattern[r][c]) mismatched++;
        }
      }
      const thresholds = mi.thresholds || [];
      let matched = mi.fallback || { tag: "miss", label: "——没对称", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matched = t; break; }
      }
      const matchedCount = rows * cols - mismatched;
      Saves.saveMirrorRecord(currentNodeId, grid, matchedCount, rows * cols, matched.tag);
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
      reading.className = "mi-reading";
      reading.innerHTML = `<div class="mi-reading-title">${matched.label || "解读"} · 匹配 ${matchedCount}/${rows * cols} · 错 ${mismatched}</div>
        <div class="mi-reading-text">${matched.text || ""}</div>
        <button class="mi-reading-close">继续</button>`;
      reading.querySelector(".mi-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runLantern(la, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "lantern-layer";
    layer.id = "lantern-layer";
    const target = la.target || [0,1,2,3];
    const count = la.count || target.length;
    const tolerance = la.tolerance ?? 0;
    const order = []; // 玩家点亮的索引
    layer.innerHTML = `
      <div class="la-prompt">${la.prompt || "按顺序点亮灯笼，还原目标序列"}</div>
      <div class="la-stage">
        <div class="la-target">目标顺序：${target.map(i => "灯" + (i+1)).join(" → ")}</div>
        <div class="la-lanterns" id="la-lanterns"></div>
        <div class="la-info" id="la-info">点击灯笼按顺序点亮</div>
      </div>
      <div class="la-progress" id="la-progress">0 / ${count}</div>
      <div class="la-actions">
        <button class="la-reset">重置</button>
        <button class="la-confirm" id="la-confirm">确认</button>
      </div>
    `;
    const lanternsEl = layer.querySelector("#la-lanterns");
    const info = layer.querySelector("#la-info");
    const progressEl = layer.querySelector("#la-progress");
    const confirmBtn = layer.querySelector(".la-confirm");
    const resetBtn = layer.querySelector(".la-reset");

    let aborted = false;

    for (let i = 0; i < count; i++) {
      const lantern = document.createElement("div");
      lantern.className = "la-lantern";
      lantern.dataset.idx = i;
      lantern.innerHTML = `<div class="la-body">灯${i+1}</div>`;
      lantern.addEventListener("click", () => {
        if (aborted) return;
        if (lantern.classList.contains("la-lit")) return;
        lantern.classList.add("la-lit");
        order.push(i);
        progressEl.textContent = `${order.length} / ${count}`;
        info.textContent = `已点 ${order.length}/${count}`;
      });
      lanternsEl.appendChild(lantern);
    }

    resetBtn.onclick = () => {
      if (aborted) return;
      order.length = 0;
      lanternsEl.querySelectorAll(".la-lantern").forEach(l => l.classList.remove("la-lit"));
      progressEl.textContent = `0 / ${count}`;
      info.textContent = `点击灯笼按顺序点亮`;
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let mismatched = 0;
      for (let i = 0; i < target.length; i++) {
        if (order[i] !== target[i]) mismatched++;
      }
      const thresholds = la.thresholds || [];
      let matched = la.fallback || { tag: "miss", label: "——排错了", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matched = t; break; }
      }
      const matchedCount = target.length - mismatched;
      Saves.saveLanternRecord(currentNodeId, order, target, matchedCount, matched.tag);
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
      reading.className = "la-reading";
      reading.innerHTML = `<div class="la-reading-title">${matched.label || "解读"} · 对 ${matchedCount}/${target.length} · 错 ${mismatched}</div>
        <div class="la-reading-text">${matched.text || ""}</div>
        <button class="la-reading-close">继续</button>`;
      reading.querySelector(".la-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runRipple(rp, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "ripple-layer";
    layer.id = "ripple-layer";
    const targets = rp.targets || [];
    const tolerance = rp.tolerance ?? 0.08;
    const duration = rp.duration || 8000;
    layer.innerHTML = `
      <div class="ri-prompt">${rp.prompt || "点击水面，让波纹覆盖所有目标点"}</div>
      <div class="ri-stage">
        <canvas class="ri-canvas" id="ri-canvas"></canvas>
        <div class="ri-info" id="ri-info">点击水面产生波纹</div>
      </div>
      <div class="ri-progress" id="ri-progress">0 / ${targets.length}</div>
      <div class="ri-actions">
        <button class="ri-confirm" id="ri-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ri-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ri-info");
    const progressEl = layer.querySelector("#ri-progress");
    const confirmBtn = layer.querySelector("#ri-confirm");

    let aborted = false;
    const ripples = [];     // { x, y, t }
    const covered = new Array(targets.length).fill(false);
    let startTime = Date.now();
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
    }

    function draw() {
      if (aborted) return;
      const now = Date.now();
      const elapsed = now - startTime;
      ctx.fillStyle = "rgba(10,30,50,0.3)";
      ctx.fillRect(0, 0, cw, ch);
      // 目标点
      targets.forEach((p, i) => {
        const x = p.x * cw;
        const y = p.y * ch;
        ctx.fillStyle = covered[i] ? "rgba(160,240,255,0.9)" : "rgba(255,180,80,0.6)";
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      });
      // 波纹
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        const age = (now - rip.t) / 1000;
        if (age > 2.5) { ripples.splice(i, 1); continue; }
        const r = age * 120;
        ctx.strokeStyle = `rgba(160,240,255,${Math.max(0, 0.7 - age * 0.3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 检测覆盖
      targets.forEach((p, i) => {
        if (covered[i]) return;
        const px = p.x * cw;
        const py = p.y * ch;
        for (const rip of ripples) {
          const age = (now - rip.t) / 1000;
          const r = age * 120;
          const dist = Math.hypot(px - rip.x, py - rip.y);
          if (Math.abs(dist - r) < 18) {
            covered[i] = true;
            break;
          }
        }
      });
      const coveredCount = covered.filter(c => c).length;
      progressEl.textContent = `${coveredCount} / ${targets.length}`;
      info.textContent = `已覆盖 ${coveredCount}/${targets.length} · 时间 ${Math.max(0, (duration - elapsed) / 1000).toFixed(1)}s`;
      if (elapsed > duration) {
        confirmBtn.click();
        return;
      }
      requestAnimationFrame(draw);
    }

    canvas.addEventListener("click", (e) => {
      if (aborted) return;
      const rect = canvas.getBoundingClientRect();
      ripples.push({
        x: (e.clientX - rect.left) * (cw / rect.width),
        y: (e.clientY - rect.top) * (ch / rect.height),
        t: Date.now()
      });
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const coveredCount = covered.filter(c => c).length;
      const thresholds = rp.thresholds || [];
      let matched = rp.fallback || { tag: "miss", label: "——没覆盖", next: null };
      for (const t of thresholds) {
        if ((targets.length - coveredCount) <= (t.max ?? tolerance * targets.length)) { matched = t; break; }
      }
      Saves.saveRippleRecord(currentNodeId, ripples.length, targets.length, targets.length - coveredCount, matched.tag);
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
      reading.className = "ri-reading";
      reading.innerHTML = `<div class="ri-reading-title">${matched.label || "解读"} · 覆盖 ${coveredCount}/${targets.length}</div>
        <div class="ri-reading-text">${matched.text || ""}</div>
        <button class="ri-reading-close">继续</button>`;
      reading.querySelector(".ri-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
    resize();
    draw();
  }

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
  function runMosaic(mo_, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "mosaic-layer";
    layer.id = "mosaic-layer";
    const pattern = mo_.pattern || [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]];
    const rows = pattern.length;
    const cols = pattern[0].length;
    const tolerance = mo_.tolerance ?? 2;
    const grid = pattern.map(row => row.map(() => 0));
    layer.innerHTML = `
      <div class="mo-prompt">${mo_.prompt || "点选小方块，拼出目标图案"}</div>
      <div class="mo-stage">
        <div class="mo-target-wrap">
          <div class="mo-grid mo-target" id="mo-target"></div>
          <div class="mo-label">目标</div>
        </div>
        <div class="mo-current-wrap">
          <div class="mo-grid mo-current" id="mo-current"></div>
          <div class="mo-label">当前</div>
        </div>
      </div>
      <div class="mo-info" id="mo-info">点击格子切换填/空</div>
      <div class="mo-progress" id="mo-progress">0 / ${rows * cols}</div>
      <div class="mo-actions">
        <button class="mo-reset">重置</button>
        <button class="mo-confirm" id="mo-confirm">确认</button>
      </div>
    `;
    const targetEl = layer.querySelector("#mo-target");
    const currentEl = layer.querySelector("#mo-current");
    const info = layer.querySelector("#mo-info");
    const progressEl = layer.querySelector("#mo-progress");
    const confirmBtn = layer.querySelector(".mo-confirm");
    const resetBtn = layer.querySelector(".mo-reset");

    let aborted = false;

    [targetEl, currentEl].forEach(el => {
      el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    });

    function renderTarget() {
      targetEl.innerHTML = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement("div");
          cell.className = "mo-cell" + (pattern[r][c] ? " mo-on" : "");
          targetEl.appendChild(cell);
        }
      }
    }

    function renderCurrent() {
      currentEl.innerHTML = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement("div");
          cell.className = "mo-cell" + (grid[r][c] ? " mo-on" : "");
          cell.addEventListener("click", () => {
            if (aborted) return;
            grid[r][c] = grid[r][c] ? 0 : 1;
            renderCurrent();
          });
          currentEl.appendChild(cell);
        }
      }
      let filled = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c]) filled++;
      progressEl.textContent = `${filled} / ${rows * cols}`;
      info.textContent = `已填 ${filled}/${rows * cols} 格`;
    }
    renderTarget();
    renderCurrent();

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = 0;
      renderCurrent();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let mismatched = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== pattern[r][c]) mismatched++;
        }
      }
      const thresholds = mo_.thresholds || [];
      let matched = mo_.fallback || { tag: "miss", label: "——拼错了", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matched = t; break; }
      }
      const matchedCount = rows * cols - mismatched;
      Saves.saveMosaicRecord(currentNodeId, grid, matchedCount, rows * cols, matched.tag);
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
      reading.className = "mo-reading";
      reading.innerHTML = `<div class="mo-reading-title">${matched.label || "解读"} · 匹配 ${matchedCount}/${rows * cols} · 错 ${mismatched}</div>
        <div class="mo-reading-text">${matched.text || ""}</div>
        <button class="mo-reading-close">继续</button>`;
      reading.querySelector(".mo-reading-close").onclick = () => {
        reading.remove();
        layer.remove();
        const node = SCRIPT[currentNodeId];
        const jumpTo = matched.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      layer.appendChild(reading);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
  }

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
  function runPendulum(pd, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "pendulum-layer";
    layer.id = "pendulum-layer";
    layer.innerHTML = `
      <div class="pd-prompt">${pd.prompt || "钟摆摆到目标位置时——点「停」"}</div>
      <div class="pd-stage">
        <canvas class="pd-canvas" id="pd-canvas"></canvas>
        <div class="pd-info" id="pd-info">点「开始」摆动钟摆</div>
      </div>
      <div class="pd-actions">
        <button class="pd-start" id="pd-start">开始</button>
        <button class="pd-stop" id="pd-stop" disabled>停</button>
      </div>
    `;
    const canvas = layer.querySelector("#pd-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#pd-info");
    const startBtn = layer.querySelector("#pd-start");
    const stopBtn = layer.querySelector("#pd-stop");

    let aborted = false;
    let started = false;
    let stopped = false;
    let startTime = 0;
    let rafId = null;
    let phase = 0;             // 摆动相位
    const target = pd.target ?? 0.85;
    const tolerance = pd.tolerance ?? 0.06;
    const duration = pd.duration || 12000;
    let cw = 0, ch = 0, cx = 0, cy = 0, len = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      cx = cw / 2; cy = ch * 0.18;
      len = ch * 0.6;
      draw();
    }

    function posFromPhase(p) {
      // sin(phase) ∈ [-1, 1]，映射到 0-1（0=左，1=右）
      return (Math.sin(p) + 1) / 2;
    }

    function draw() {
      // 背景
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#2a1a2a");
      grad.addColorStop(1, "#0a0a1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      // 顶部刻度（目标范围）
      const targetX = cx + (target - 0.5) * 2 * (cw * 0.4);
      ctx.fillStyle = "rgba(255,200,150,0.25)";
      const tolW = tolerance * 2 * (cw * 0.4);
      ctx.fillRect(targetX - tolW / 2, 10, tolW, 16);
      // 目标线
      ctx.strokeStyle = "rgba(255,200,150,0.7)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(targetX, 10);
      ctx.lineTo(targetX, ch * 0.18 + len + 30);
      ctx.stroke();
      ctx.setLineDash([]);
      // 顶部固定点
      ctx.fillStyle = "#ffe890";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      // 钟摆位置
      const pos = posFromPhase(phase);
      const px = cx + (pos - 0.5) * 2 * (cw * 0.4);
      const py = cy + len;
      // 摆杆
      ctx.strokeStyle = "#c8a880";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      // 摆锤
      ctx.fillStyle = stopped ? "#ff5070" : "#ffd060";
      ctx.beginPath();
      ctx.arc(px, py, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a6840";
      ctx.lineWidth = 2;
      ctx.stroke();
      // 信息
      if (!started) info.textContent = "点「开始」摆动钟摆";
      else if (stopped) {
        const posNow = posFromPhase(phase);
        const err = Math.abs(posNow - target);
        info.textContent = `停在 ${(posNow * 100).toFixed(0)}% · 目标 ${(target * 100).toFixed(0)}% · 偏差 ${(err * 100).toFixed(1)}%`;
      } else {
        const remain = Math.max(0, duration - (performance.now() - startTime));
        info.textContent = `剩余 ${(remain / 1000).toFixed(1)}s · 目标 ${(target * 100).toFixed(0)}%`;
      }
    }

    function loop() {
      if (aborted) return;
      if (started && !stopped) {
        // 摆动相位增长
        phase += 0.045;
        // 超时自动停
        if ((performance.now() - startTime) >= duration) {
          stopped = true;
          stopBtn.disabled = true;
        }
        draw();
      }
      if (!aborted) rafId = requestAnimationFrame(loop);
    }

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startTime = performance.now();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      rafId = requestAnimationFrame(loop);
    };

    stopBtn.onclick = () => {
      if (!started || stopped) return;
      stopped = true;
      stopBtn.disabled = true;
      if (rafId) cancelAnimationFrame(rafId);
      draw();
      // 不立即结束，让玩家确认
      const posNow = posFromPhase(phase);
      const err = Math.abs(posNow - target);
      // 显示一个确认按钮
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "pd-confirm";
      confirmBtn.textContent = "确认";
      confirmBtn.onclick = () => {
        if (aborted) return;
        aborted = true;
        confirmBtn.disabled = true;
        const thresholds = pd.thresholds || [];
        let matched = pd.fallback || { tag: "miss", label: "——停早了", next: null };
        for (const t of thresholds) {
          if (err <= (t.max ?? tolerance)) { matched = t; break; }
        }
        Saves.savePendulumRecord(currentNodeId, posNow, target, err, matched.tag);
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
        reading.className = "pd-reading";
        reading.innerHTML = `<div class="pd-reading-title">${matched.label || "解读"} · 停在 ${(posNow * 100).toFixed(0)}%</div>
          <div class="pd-reading-text">${matched.text || ""}</div>
          <button class="pd-reading-close">继续</button>`;
        reading.querySelector(".pd-reading-close").onclick = () => {
          reading.remove();
          layer.remove();
          const node = SCRIPT[currentNodeId];
          const jumpTo = matched.next || (node && node.next);
          if (jumpTo) gotoNode(jumpTo);
        };
        layer.appendChild(reading);
      };
      layer.querySelector(".pd-actions").appendChild(confirmBtn);
    };

    const mo = new MutationObserver(() => {
      if (!document.body.contains(layer)) {
        aborted = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (mo) mo.disconnect();
      }
    });
    mo.observe(document.getElementById("game"), { childList: true });

    document.getElementById("game").appendChild(layer);
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
