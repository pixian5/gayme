/* ========================================
   樱时信笺 · 直跳型玩法集 (games/direct.js) v2.9.1
   —— 从 engine.js 迁出的 10 个早期直跳型玩法（无结果面板，判定后直接跳转）：
      自由涂鸦 / 拼贴诗 / 摄影构图 / 节奏敲击 / 气味收集 / 沉默选择 / 触觉关怀 / 温度感知 / 笔迹选择 / 情绪光谱
   与标准玩法的差异：无结果面板，收尾（记录/加成/跳转）保留在各自交互逻辑里，
   宿主能力经 GameKit.host 调用；浮层外壳与生命周期仍由 GameKit.createShell 统一管理。
   依赖：GameKit（register / createShell / flashHint / host）、Saves、SCRIPT、PORTRAITS
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, flashHint, host } = window.GameKit;

  /* 当前背景场景名：经背景层 DOM 读取（与引擎 state.currentBg 等价，避免依赖引擎内部符号） */
  function bgNow() {
    const m = /scene-([\w-]+)/.exec(document.getElementById("bg-layer")?.className || "");
    return m ? m[1] : null;
  }

  /* ============ 涂鸦 ============ */  register("doodle", function (doodle, nodeId) {
    const shell = createShell({ kind: "doodle" });
    const layer = shell.layer;
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
      Saves.saveDoodle(nodeId, mood, stats);
      // 影响：根据 doodle.moodBonus 中匹配 mood
      if (doodle.moodBonus) {
        const bonus = doodle.moodBonus[mood];
        if (bonus) {
          host.applyAdd(bonus);
          host.updateHeartBar();
        }
      }
      if (doodle.moodJump) {
        const jump = doodle.moodJump[mood];
        if (jump) {
          shell.cleanup();
          host.gotoNode(jump);
          return;
        }
      }
      flashHint(`✦ 你画出了 ${mood}`);
      shell.cleanup();
      const node = SCRIPT[nodeId];
      if (node && node.next) host.gotoNode(node.next);
    };
    layer.appendChild(submit);

  });


  /* ============================================================
     v0.6.0 拼贴诗系统 collage
     —— 把已解锁关键词拖到画布，按意象密度判定走向
     node.collage = {
       prompt, minWords, maxWords,
       words (可选: 自定义词表；不填则用已解锁关键词+合成词),
       tag (评分维度阈值，{good:5,bad:2}),
       scoreBonus: { good:{...}, normal:{...}, bad:{...} },
       scoreJump:  { good:"nodeId", normal:"nodeId", bad:"nodeId" }
     }
     ============================================================ */  register("collage", function (collage, nodeId) {
    const shell = createShell({ kind: "collage", keepDialog: true });
    const layer = shell.layer;

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
      Saves.saveCollage(nodeId, placed.slice(), poem, parseFloat(density.toFixed(2)), tag);
      if (collage.scoreBonus && collage.scoreBonus[tag]) {
        host.applyAdd(collage.scoreBonus[tag]);
        host.updateHeartBar();
      }
      flashHint(`✦ 你拼出的诗：${poem}（${tag === "good" ? "意象丰沛" : tag === "bad" ? "克制简素" : "恰到好处"}）`);
      if (collage.scoreJump && collage.scoreJump[tag]) {
        shell.cleanup();
        host.gotoNode(collage.scoreJump[tag]);
        return;
      }
      shell.cleanup();
      const node = SCRIPT[nodeId];
      if (node && node.next) host.gotoNode(node.next);
    };
    controls.appendChild(clear);
    controls.appendChild(submit);
    layer.appendChild(controls);

  });


  /* ============================================================
     v0.6.0 摄影构图系统 photo
     —— 场景内拖动取景框，按构图规则评分
     node.photo = {
       prompt, scene (可选: 自定义场景图，不填用当前 bg),
       rules: ["thirds","center","diagonal"], // 评分规则
       targets: [{x,y,w,h, label}],           // 取景目标（可点击的高价值区）
       scoreBonus: { high:{...}, mid:{...}, low:{...} },
       scoreJump:  { high:"nodeId", mid:"nodeId", low:"nodeId" }
     }
     ============================================================ */  register("photo", function (photo, nodeId) {
    const shell = createShell({ kind: "photo", keepDialog: true, onCancel: () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      } });
    const layer = shell.layer;

    const prompt = document.createElement("div");
    prompt.className = "photo-prompt";
    prompt.textContent = photo.prompt || "拖动取景框，按下快门";
    layer.appendChild(prompt);

    const scene = document.createElement("div");
    scene.className = "photo-scene";
    // 用当前背景作为取景画面
    const cbg = bgNow();
    const bgClass = cbg ? `bg-scene scene-${cbg}` : "bg-scene scene-cherry_full";
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
      Saves.savePhoto(nodeId, composition, score, tag);

      if (photo.scoreBonus && photo.scoreBonus[tag]) {
        host.applyAdd(photo.scoreBonus[tag]);
        host.updateHeartBar();
      }
      flashHint(`📸 构图：${composition}（${score} 分）`);
      if (photo.scoreJump && photo.scoreJump[tag]) {
        shell.cleanup();
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        host.gotoNode(photo.scoreJump[tag]);
        return;
      }
      shell.cleanup();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const node = SCRIPT[nodeId];
      if (node && node.next) host.gotoNode(node.next);
    };
    controls.appendChild(submit);
    layer.appendChild(controls);

  });


  /* ============================================================
     v0.6.0 节奏敲击系统 rhythm
     —— 对话中按节奏点击，模拟心跳/呼吸同步
     node.rhythm = {
       prompt,
       bpm (节拍速度，60-180),
       beats (总节拍数，8-32),
       pattern (可选：自定义强弱拍 [1,0,1,0,...])
       scoreBonus: { high:{...}, mid:{...}, low:{...} },
       scoreJump:  { high:"nodeId", mid:"nodeId", low:"nodeId" }
     }
     ============================================================ */  register("rhythm", function (rhythm, nodeId) {
    const shell = createShell({ kind: "rhythm", keepDialog: true, onCancel: () => {
        clearTimeout(timer);
        document.removeEventListener("keydown", rhythmKeyHandler);
      } });
    const layer = shell.layer;

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
      Saves.saveRhythm(nodeId, hits.slice(), accuracy, tag);
      if (rhythm.scoreBonus && rhythm.scoreBonus[tag]) {
        host.applyAdd(rhythm.scoreBonus[tag]);
        host.updateHeartBar();
      }
      stats.textContent = `完成！命中率 ${accuracy}% · ${perfectCount} 次完美`;
      flashHint(`♪ 命中率 ${accuracy}%（${tag === "high" ? "心跳同步" : tag === "mid" ? "勉强跟上" : "完全乱了"}）`);
      if (rhythm.scoreJump && rhythm.scoreJump[tag]) {
        shell.cleanup();
        host.gotoNode(rhythm.scoreJump[tag]);
        return;
      }
      setTimeout(() => {
        if (shell.signal?.aborted) return;
        shell.cleanup();
        const node = SCRIPT[nodeId];
        if (node && node.next) host.gotoNode(node.next);
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


    const startBtn = document.createElement("button");
    startBtn.className = "rhythm-start";
    startBtn.textContent = "▶ 开始";
    startBtn.onclick = start;
    layer.appendChild(startBtn);

  });


  /* ============================================================
     v0.7.0 气味收集系统 scent
     node.scent = {
       prompt: "图书馆里有几种气味——细闻哪一个？",
       items: [
         { id, name, desc, scene?, tag? }
       ],
       min: 1,                  // 至少细闻几个
       next: "nodeId"            // 可选，覆盖默认 next
     }
     ============================================================ */  register("scent", function (scent, nodeId) {

    const shell = createShell({ kind: "scent" });
    const layer = shell.layer;
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
            id: item.id, name: item.name, desc: item.desc, scene: item.scene || bgNow()
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
      shell.cleanup();
      const node = SCRIPT[nodeId];
      const jumpTo = scent.next || (node && node.next);
      if (jumpTo) host.gotoNode(jumpTo);
    };

  });


  /* ============================================================
     v0.7.0 沉默选择 silenceChoice
     node.silenceChoice = {
       prompt: "她问：你为什么不说话？",
       duration: 10,            // 倒计时秒数
       options: [{ text, value, add?, personality?, memory?, next }],
       silent: {                // 超时进入的沉默分支
         text, add?, personality?, memory?, next
       }
     }
     ============================================================ */  register("silenceChoice", function (silence, nodeId) {
    const shell = createShell({ kind: "silenceChoice", onCancel: () => {
        clearInterval(timer);
        settled = true;
      } });
    const layer = shell.layer;

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
      Saves.saveSilenceRecord(nodeId, choice.value || "silent", silent);
      if (choice.add) { host.applyAdd(choice.add); host.updateHeartBar(); }
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
          if (shell.signal?.aborted) return;
          shell.cleanup();
          const node = SCRIPT[nodeId];
          const jumpTo = choice.next || (node && node.next);
          if (jumpTo) host.gotoNode(jumpTo);
        }, 1800);
      } else {
        shell.cleanup();
        const node = SCRIPT[nodeId];
        const jumpTo = choice.next || (node && node.next);
        if (jumpTo) host.gotoNode(jumpTo);
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

  });


  /* ============================================================
     v0.7.0 触觉关怀 touch
     node.touch = {
       prompt: "她看上去很难过——",
       char: "shiyu",            // 立绘角色（仅用于定位，渲染由 node.char 决定）
       parts: [
         { id, label, x, y, w, h, dialogue, add?, personality?, memory? }
       ],
       exitText: "（你收回手。）",
       next: "nodeId"           // 可选
     }
     ============================================================ */  register("touch", function (touch, nodeId) {
    const shell = createShell({ kind: "touch" });
    const layer = shell.layer;
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
        if (part.add) { host.applyAdd(part.add); host.updateHeartBar(); }
        if (part.personality) {
          for (const dim in part.personality) Saves.addPersonality(dim, part.personality[dim]);
        }
        if (part.memory) {
          if (!Saves.isMemoryUnlocked(part.memory.id)) {
            Saves.saveMemory(part.memory.id, part.memory.text);
            flashHint(`✦ 新记忆：${part.memory.title}`);
          }
        }
        Saves.saveTouchRecord(nodeId, part.id, part.label);
        touched.add(part.id);
        // 全部触碰过或至少碰过 1 个就解锁退出
        exitBtn.disabled = touched.size < Math.min(touch.min || 1, parts.length);
      };
      portraitBox.appendChild(hot);
    });

    exitBtn.onclick = () => {
      if (exitBtn.disabled) return;
      shell.cleanup();
      const node = SCRIPT[nodeId];
      const jumpTo = touch.next || (node && node.next);
      if (jumpTo) host.gotoNode(jumpTo);
    };

  });


  /* ============================================================
     v0.7.0 温度感知 temperature
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
     ============================================================ */  register("temperature", function (temp, nodeId) {

    const shell = createShell({ kind: "temperature" });
    const layer = shell.layer;
    const bgOverlay = document.getElementById("bg-overlay");
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
      bgOverlay.style.background =
        tag === "warm" ? "linear-gradient(180deg, rgba(255,180,120,0.18), rgba(255,120,80,0.10))" :
        tag === "cool" ? "linear-gradient(180deg, rgba(120,180,255,0.18), rgba(80,120,200,0.10))" :
        "transparent";
    }
    slider.oninput = () => update(parseInt(slider.value, 10));
    update(0);

    confirmBtn.onclick = () => {
      const v = parseInt(slider.value, 10);
      const { tag } = tagFor(v);
      Saves.saveTemperatureRecord(nodeId, v, tag);
      if (temp.scoreBonus && temp.scoreBonus[tag]) {
        host.applyAdd(temp.scoreBonus[tag]);
        host.updateHeartBar();
      }
      // 恢复背景叠加
      bgOverlay.style.background = "transparent";
      flashHint(`🌡 心境温度：${v > 0 ? "+" : ""}${v}（${tagEl.textContent}）`);
      shell.cleanup();
      const node = SCRIPT[nodeId];
      const jumpTo = (temp.scoreJump && temp.scoreJump[tag]) || temp.next || (node && node.next);
      if (jumpTo) host.gotoNode(jumpTo);
    };

  });


  /* ============================================================
     v0.8.0 笔迹选择 handwriting
     node.handwriting = {
       prompt: "你拿笔开始写——选一种笔迹",
       letter: "letter_2",
       styles: [
         { id, label, desc, add?, personality?, memory?, next }
       ]
     }
     ============================================================ */  register("handwriting", function (hw, nodeId) {
    const shell = createShell({ kind: "handwriting" });
    const layer = shell.layer;
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
        Saves.saveHandwritingRecord(nodeId, style.id, style.label);
        if (style.add) { host.applyAdd(style.add); host.updateHeartBar(); }
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
        shell.cleanup();
        const node = SCRIPT[nodeId];
        const jumpTo = style.next || hw.next || (node && node.next);
        if (jumpTo) host.gotoNode(jumpTo);
      };
      stylesEl.appendChild(btn);
    });

  });


  /* ============================================================
     v0.8.0 情绪光谱 spectrum
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
     ============================================================ */  register("spectrum", function (spec, nodeId) {
    const shell = createShell({ kind: "spectrum", onCancel: () => {
        cleanupDocumentListeners();
      } });
    const layer = shell.layer;
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
    function onMouseMove(e) {
      if (!dragging) return;
      const v = stageToValue(e.clientX, e.clientY);
      updatePoint(v.x, v.y);
    }
    function onMouseUp() { dragging = false; }
    function cleanupDocumentListeners() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
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
      Saves.saveSpectrumRecord(nodeId, curX, curY, tag);
      if (qdef.add) { host.applyAdd(qdef.add); host.updateHeartBar(); }
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
      cleanupDocumentListeners();
      shell.cleanup();
      const node = SCRIPT[nodeId];
      const jumpTo = qdef.next || (node && node.next);
      if (jumpTo) host.gotoNode(jumpTo);
    };


  });


})();
