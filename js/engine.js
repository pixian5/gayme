/* ========================================
   樱时信笺 · 游戏引擎 (engine.js)
   - 状态机 / 打字机 / 选项 / 条件分支
   - 立绘 / 背景 / 粒子
   - 存档读档 / 历史 / 设置 / 图鉴 / 结局
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
    lastChars: null,
  };

  const MAX_HISTORY = 100;

  /* ---------- 工具：深层取值/赋值 ---------- */
  function getByPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
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
        // 嵌套：如 affection.shiyu
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
    for (const key in set) {
      setByPath(state.variables, key, set[key]);
    }
  }

  /* ---------- 场景 / 背景 ---------- */
  function setScene(bg) {
    if (!bg || bg === state.currentBg) return;
    state.currentBg = bg;
    // 切换 class
    el.bgLayer.className = "bg-scene scene-" + bg;
    el.bgLayer.classList.add("fade-transition");
    setTimeout(() => el.bgLayer.classList.remove("fade-transition"), 700);
    updateParticles(bg);
  }

  /* ---------- 立绘 ---------- */
  function renderCharacters(node) {
    let chars = null;
    if (node.chars) {
      chars = node.chars;
    } else if (node.char !== undefined) {
      if (node.char === null) chars = [];
      else chars = [{ id: node.char, pos: "center" }];
    } else {
      return; // 没有该字段，保持现状
    }
    state.lastChars = chars;
    el.charLayer.innerHTML = "";
    chars.forEach((c, idx) => {
      if (!PORTRAITS[c.id]) return;
      const div = document.createElement("div");
      div.className = `char-sprite pos-${c.pos || "center"}`;
      if (c.dim) div.classList.add("dim");
      div.innerHTML = PORTRAITS[c.id];
      el.charLayer.appendChild(div);
      // 触发淡入
      requestAnimationFrame(() => {
        setTimeout(() => div.classList.add("show"), idx * 80);
      });
    });
  }

  /* ---------- 打字机 ---------- */
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

  /* ---------- 历史记录 ---------- */
  function pushHistory(speaker, text) {
    state.history.push({ speaker, text, ts: Date.now() });
    if (state.history.length > MAX_HISTORY) state.history.shift();
  }

  /* ---------- 推进到下一节点 ---------- */
  function advance() {
    const node = SCRIPT[state.currentNode];
    if (!node) return;
    if (node.next) {
      gotoNode(node.next);
    } else if (node.ending) {
      // 已经在 onTextComplete 中处理
    }
  }

  /* ---------- 文本完成后 ---------- */
  function onTextComplete(node) {
    // 结局节点：打字完成后触发结局画面
    if (node.ending) {
      setTimeout(() => showEnding(node.ending), 1000);
      return;
    }
    // 自动模式：延迟后推进下一节点
    if (state.autoMode) {
      clearTimeout(state.autoTimer);
      state.autoTimer = setTimeout(() => {
        if (node.next) gotoNode(node.next);
      }, Saves.settings.autoDelay);
    }
  }

  /* ---------- 跳转到节点 ---------- */
  function gotoNode(nodeId) {
    const node = SCRIPT[nodeId];
    if (!node) {
      console.error("节点不存在:", nodeId);
      return;
    }
    clearTimeout(state.autoTimer);
    state.currentNode = nodeId;

    // 应用变量
    applyAdd(node.add);
    applySet(node.set);

    // 条件节点：不显示，直接跳转
    if (node.if) {
      const cond = node.if;
      const value = getByPath(state.variables, cond.var);
      let matched = false;
      if (cond.gte !== undefined) matched = (value >= cond.gte);
      else if (cond.eq !== undefined) matched = (value === cond.eq);
      else if (cond.gt !== undefined) matched = (value > cond.gt);

      if (matched) gotoNode(cond.then);
      else if (node.else) gotoNode(node.else);
      return;
    }

    // 选项节点
    if (node.choice) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.add("hidden");
      showChoices(node.choice, nodeId);
      return;
    }

    // 普通节点 / 结局节点
    setScene(node.bg);
    renderCharacters(node);

    const speakerName = node.speaker ? (CHARACTERS[node.speaker]?.name || node.speaker) : "";
    el.speaker.textContent = speakerName;
    el.speaker.style.background = speakerName
      ? `linear-gradient(135deg, ${CHARACTERS[node.speaker]?.color || "#d87090"}, ${CHARACTERS[node.speaker]?.accent || "#b8608a"})`
      : "rgba(40,40,60,0.7)";
    el.dialogBox.classList.remove("hidden");

    if (speakerName && node.text) {
      pushHistory(speakerName, node.text);
    } else if (node.text) {
      pushHistory("旁白", node.text);
    }

    typewriter(node.text || "", () => onTextComplete(node));
  }

  /* ---------- 选项 ---------- */
  function showChoices(choice, currentNodeId) {
    el.choices.innerHTML = "";
    el.choices.classList.remove("hidden");

    const prompt = document.createElement("div");
    prompt.style.cssText = "position:absolute;top:18%;left:50%;transform:translateX(-50%);font-size:20px;letter-spacing:3px;color:#ffd8e4;text-shadow:0 2px 8px rgba(0,0,0,0.8);";
    prompt.textContent = choice.prompt || "请选择";
    el.choices.appendChild(prompt);

    choice.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = opt.text;
      btn.onclick = () => {
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        applyAdd(opt.add);
        applySet(opt.set);
        gotoNode(opt.next);
      };
      el.choices.appendChild(btn);
    });
  }

  /* ---------- 结局 ---------- */
  function showEnding(ending) {
    const isNew = Saves.unlockEnding(ending.id);
    state.inGame = false;
    el.endingType.textContent = ending.type;
    el.endingTitle.textContent = ending.title;
    el.endingText.textContent = ending.text;
    el.endingScreen.classList.remove("hidden");
    // 隐藏游戏 UI
    el.topBar.classList.remove("show");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
  }

  /* ---------- 新游戏 ---------- */
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
    gotoNode(START_NODE);
  }

  /* ---------- 存档快照 ---------- */
  function snapshot() {
    const node = SCRIPT[state.currentNode];
    const speakerName = node?.speaker ? (CHARACTERS[node.speaker]?.name || node.speaker) : "";
    return {
      nodeId: state.currentNode,
      variables: JSON.parse(JSON.stringify(state.variables)),
      sceneLabel: SCENE_LABELS[state.currentBg] || "",
      dialogPreview: (speakerName ? `【${speakerName}】` : "（旁白）") + (node?.text || "").slice(0, 30),
    };
  }

  function quickSave() {
    if (!state.inGame) return;
    Saves.quickSave(snapshot());
    flashHint("已快存");
  }

  function saveToSlot(slot) {
    if (!state.inGame) {
      flashHint("当前无法存档");
      return;
    }
    Saves.save(slot, snapshot());
    renderSaveSlots("save");
    flashHint(`已保存到槽位 ${slot + 1}`);
  }

  function loadFromSlot(slot) {
    const data = Saves.load(slot);
    if (!data) {
      flashHint("该槽位为空");
      return;
    }
    state.currentNode = data.nodeId;
    state.variables = data.variables || { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
    state.history = state.history || [];
    state.inGame = true;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    closeOverlay();
    gotoNode(data.nodeId);
  }

  /* ---------- 顶部提示 ---------- */
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

  /* ---------- 浮层 ---------- */
  let overlayMode = null;

  function openOverlay(type) {
    overlayMode = type;
    const titles = { save: "存档", load: "读档", config: "设置", history: "历史文本", gallery: "结局图鉴", about: "关于" };
    el.overlayTitle.textContent = titles[type] || type;
    el.overlay.classList.remove("hidden");

    if (type === "save" || type === "load") renderSaveSlots(type);
    else if (type === "config") renderConfig();
    else if (type === "history") renderHistory();
    else if (type === "gallery") renderGallery();
    else if (type === "about") renderAbout();
  }

  function closeOverlay() {
    el.overlay.classList.add("hidden");
    overlayMode = null;
  }

  function renderSaveSlots(mode) {
    let html = "";
    for (let i = 0; i < 9; i++) {
      const data = Saves.data.slots[i];
      const isQuick = i === 0;
      if (data) {
        html += `
          <div class="save-slot" data-slot="${i}">
            <div class="slot-no">${i + 1}</div>
            <div class="slot-info">
              <div class="slot-title">${data.sceneLabel || "未知场景"}${isQuick ? " · 快存" : ""}</div>
              <div class="slot-meta">${Saves.formatTime(data.timestamp)} · ${escapeHtml(data.dialogPreview || "")}</div>
            </div>
            <div class="slot-actions">
              ${mode === "save"
                ? `<button data-act="save" data-slot="${i}">覆盖</button>`
                : `<button data-act="load" data-slot="${i}">读取</button>`}
              <button data-act="del" data-slot="${i}">删除</button>
            </div>
          </div>`;
      } else {
        html += `
          <div class="save-slot" data-slot="${i}">
            <div class="slot-no">${i + 1}</div>
            <div class="slot-info">
              <div class="slot-title">${isQuick ? "快存槽" : "空槽位"}</div>
              <div class="slot-meta slot-empty">— 空 —</div>
            </div>
            <div class="slot-actions">
              ${mode === "save" ? `<button data-act="save" data-slot="${i}">存档</button>` : ""}
            </div>
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
          Saves.deleteSave(slot);
          renderSaveSlots(mode);
          flashHint("已删除");
        }
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
      <div class="config-row">
        <label>粒子特效</label>
        <select id="cfg-particles">
          <option value="true" ${s.particles ? "selected" : ""}>开启</option>
          <option value="false" ${!s.particles ? "selected" : ""}>关闭</option>
        </select>
      </div>
      <div class="config-row">
        <label style="color:#ff8888;">清空所有存档与图鉴</label>
        <button id="cfg-clear" style="padding:8px 16px;background:rgba(255,80,80,0.4);border:1px solid rgba(255,100,100,0.6);border-radius:8px;color:#fff;cursor:pointer;font-family:inherit;">清空</button>
      </div>
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

    document.getElementById("cfg-clear").onclick = () => {
      if (confirm("确定清空所有存档、图鉴和设置吗？此操作不可撤销。")) {
        Saves.clearAll();
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
        <p style="color:#e8e0d0;">v0.0.1 · Demo</p>
        <p style="color:rgba(255,255,255,0.6);margin-top:20px;">在樱花开落的季节，写下属于你的回信。</p>
        <p style="color:rgba(255,255,255,0.4);margin-top:30px;font-size:13px;">视觉小说 / 校园青春<br>3 位女主 · 6 个结局<br>建议在桌面浏览器全屏体验</p>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- 返回标题 ---------- */
  function backToTitle() {
    clearTimeout(state.autoTimer);
    clearTimeout(state.typeTimer);
    state.autoMode = false;
    state.skipMode = false;
    state.inGame = false;
    el.titleScreen.classList.remove("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    el.topBar.classList.remove("show");
    el.charLayer.innerHTML = "";
    setScene("cherry_full");
  }

  /* ---------- 粒子系统 ---------- */
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
    if (["winter", "ending_bad"].includes(scene)) return "snow";
    if (["cherry_full", "school_gate", "classroom", "library", "hallway", "art_room", "home_room"].includes(scene)) return "sakura";
    return "none";
  }

  function updateParticles(scene) {
    const newType = getParticleType(scene);
    if (newType === particleType) return;
    particleType = newType;
    particles = [];
    if (particleType === "none") {
      stopParticles();
      return;
    }
    const count = particleType === "rain" ? 100 : 60;
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
    if (!particleAnim) animateParticles();
  }

  function stopParticles() {
    if (particleAnim) {
      cancelAnimationFrame(particleAnim);
      particleAnim = null;
    }
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  }

  function createParticle() {
    const w = particleCanvas.width;
    const h = particleCanvas.height;
    if (particleType === "sakura") {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: 4 + Math.random() * 6,
        speed: 0.4 + Math.random() * 1.2,
        sway: Math.random() * 2 - 1,
        swayPhase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        alpha: 0.5 + Math.random() * 0.4,
        hue: 340 + Math.random() * 20,
      };
    } else if (particleType === "rain") {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        len: 12 + Math.random() * 14,
        speed: 8 + Math.random() * 6,
        alpha: 0.3 + Math.random() * 0.4,
      };
    } else if (particleType === "snow") {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: 2 + Math.random() * 3,
        speed: 0.6 + Math.random() * 1.2,
        sway: Math.random() * 2 - 1,
        swayPhase: Math.random() * Math.PI * 2,
        alpha: 0.5 + Math.random() * 0.5,
      };
    }
  }

  function animateParticles() {
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const w = particleCanvas.width;
    const h = particleCanvas.height;

    particles.forEach((p, i) => {
      if (particleType === "sakura") {
        p.swayPhase += 0.02;
        p.x += Math.sin(p.swayPhase) * p.sway * 0.8;
        p.y += p.speed;
        p.rot += p.rotSpeed;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }

        pctx.save();
        pctx.translate(p.x, p.y);
        pctx.rotate(p.rot);
        pctx.globalAlpha = p.alpha;
        pctx.fillStyle = `hsl(${p.hue}, 80%, 85%)`;
        pctx.beginPath();
        pctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        pctx.fill();
        pctx.restore();
      } else if (particleType === "rain") {
        p.y += p.speed;
        p.x -= p.speed * 0.2;
        if (p.y > h) { p.y = -20; p.x = Math.random() * w; }
        pctx.strokeStyle = `rgba(180,200,220,${p.alpha})`;
        pctx.lineWidth = 1;
        pctx.beginPath();
        pctx.moveTo(p.x, p.y);
        pctx.lineTo(p.x - p.speed * 0.2, p.y - p.len);
        pctx.stroke();
      } else if (particleType === "snow") {
        p.swayPhase += 0.02;
        p.x += Math.sin(p.swayPhase) * p.sway * 0.6;
        p.y += p.speed;
        if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
        pctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pctx.fill();
      }
    });

    if (particleType !== "none") {
      particleAnim = requestAnimationFrame(animateParticles);
    }
  }

  /* ---------- 事件绑定 ---------- */
  // 对话框点击
  el.dialogBox.addEventListener("click", () => {
    if (state.isTyping) {
      skipTyping();
    } else if (state.inGame) {
      advance();
    }
  });

  // 顶部菜单
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

  // 自动 / 快进
  document.getElementById("btn-auto").onclick = function () {
    state.autoMode = !state.autoMode;
    this.classList.toggle("active", state.autoMode);
    flashHint(state.autoMode ? "自动模式 开" : "自动模式 关");
    if (state.autoMode) {
      const node = SCRIPT[state.currentNode];
      if (node && !state.isTyping) onTextComplete(node);
    } else {
      clearTimeout(state.autoTimer);
    }
  };

  document.getElementById("btn-skip").onclick = function () {
    state.skipMode = !state.skipMode;
    this.classList.toggle("active", state.skipMode);
    flashHint(state.skipMode ? "快进 开" : "快进 关");
  };

  // 浮层关闭
  document.querySelector(".overlay-close").onclick = closeOverlay;
  el.overlay.addEventListener("click", (e) => {
    if (e.target === el.overlay) closeOverlay();
  });

  // 标题画面按钮
  el.titleScreen.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = () => {
      const a = btn.dataset.action;
      if (a === "new") newGame();
      else if (a === "continue") {
        // 优先快存，否则最新槽
        const quick = Saves.getQuickSave();
        if (quick) {
          state.currentNode = quick.nodeId;
          state.variables = quick.variables || { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
          state.history = [];
          state.inGame = true;
          el.titleScreen.classList.add("hidden");
          el.dialogBox.classList.remove("hidden");
          el.topBar.classList.add("show");
          gotoNode(quick.nodeId);
        } else {
          flashHint("没有可继续的存档");
        }
      } else if (a === "load") openOverlay("load");
      else if (a === "gallery") openOverlay("gallery");
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
    } else if (e.key === "s" || e.key === "S") {
      quickSave();
    } else if (e.key === "a" || e.key === "A") {
      document.getElementById("btn-auto").click();
    } else if (e.key === "Escape") {
      backToTitle();
    }
  });

  /* ---------- 启动 ---------- */
  function init() {
    setScene("cherry_full");
    updateParticles("cherry_full");
  }
  init();

  // 暴露调试接口
  window.__game = { state, gotoNode, newGame, backToTitle };
})();
