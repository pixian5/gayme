/* ========================================
   樱时信笺 · 自然天象玩法集 (games/nature.js) v2.8.6
   —— 从 engine.js 迁出的 13 个玩法：
      天文观测 / 听风辨位 / 听雨节奏 / 星座连线 / 迷雾辨认 / 风筝线控 / 轨道计算 / 萤火虫群 / 风铃音高 / 星图绘制 / 日食观测 / 天体运行 / 风向标
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, flashHint } = window.GameKit;

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

  register("astronomy", function (a, nodeId) {
    const shell = createShell({ kind: "astronomy", prefix: "as", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveAstronomyRecord(nodeId, idx, isTarget ? 0 : 1, matched.tag),
        next: matched.next,
      });
    };

    renderCon(0);
  });

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
  register("wind", function (w, nodeId) {
    const shell = createShell({ kind: "wind", prefix: "wd", nodeId,
      onCancel: () => {
      aborted = true;
      if (ro) ro.disconnect();
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 进度 ${Math.round(ratio * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveWindRecord(nodeId, progress, attempts, matched.tag),
        next: matched.next,
      });
    };

    const ro = new ResizeObserver(() => { if (!aborted) resize(); });

    ro.observe(canvas);
    resize();
    updateInfo();
  });

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
  register("rain", function (r, nodeId) {
    const shell = createShell({ kind: "rain", prefix: "rn", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (ro) ro.disconnect();
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 命中率 ${Math.round(accuracy * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveRainRecord(nodeId, hits, totalDrops, accuracy, matched.tag),
        next: matched.next,
      });
    }


    ro.observe(canvas);
    resize();
  });

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
  register("constellation", function (cs, nodeId) {
    const shell = createShell({ kind: "constellation", prefix: "cs", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${interp.label || "解读"}`,
        text: `${interp.text || ""}`,
        add: interp.add,
        personality: interp.personality,
        memory: interp.memory,
        record: () => Saves.saveConstellationRecord(nodeId, sequence.slice(), interp.tag),
        next: interp.next,
      });
    };

  });

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
  register("foggy", function (fg, nodeId) {
    const shell = createShell({ kind: "foggy", prefix: "fg", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 描绘 ${Math.round(c * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveFoggyRecord(nodeId, c, fg.shape || "unknown", matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("kite", function (k, nodeId) {
    const shell = createShell({ kind: "kite", prefix: "kt", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 高度 ${Math.round(heightPct)}% · 碰撞 ${hits}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveKiteRecord(nodeId, reachedTarget, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("orbit", function (ob, nodeId) {
    const shell = createShell({ kind: "orbit", prefix: "ob", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      Saves.saveOrbitRecord(nodeId, totalError, sampleIndex === samples ? "perfect" : sampleIndex >= samples / 2 ? "good" : "miss");
      const thresholds = ob.thresholds || [];
      let matched = ob.fallback || { tag: "miss", label: "——星辰失散", next: null };
      for (const t of thresholds) {
        if (totalError <= (t.max ?? 50)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 采样 ${sampleIndex}/${samples} · 均偏 ${avgError.toFixed(1)}px`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        next: matched.next,
      });
    };


    resize();
  });

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
  register("firefly", function (ff, nodeId) {
    const shell = createShell({ kind: "firefly", prefix: "ff", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      Saves.saveFireflyRecord(nodeId, gathered, total, avgDev, gathered === total ? "perfect" : gathered >= total / 2 ? "good" : "miss");
      const thresholds = ff.thresholds || [];
      let matched = ff.fallback || { tag: "miss", label: "——萤火散了", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? 30)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 归队 ${gathered}/${total}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        next: matched.next,
      });
    };


    resize();
  });

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
  register("windchime", function (wc, nodeId) {
    // 原实现无清理钩子（窗口监听仅正常完成时移除，读档/返回标题会泄漏）——迁移时经 onCancel 修复
    const shell = createShell({ kind: "windchime", prefix: "wc", nodeId,
      onCancel: () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      } });
    const layer = shell.layer;
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
      Saves.saveWindchimeRecord(nodeId, matched, target.length, totalDev, matched === target.length ? "perfect" : matched >= target.length / 2 ? "good" : "miss");
      const thresholds = wc.thresholds || [];
      let matchedT = wc.fallback || { tag: "miss", label: "——音散了", next: null };
      for (const t of thresholds) {
        if (totalDev <= (t.max ?? 0.2)) { matchedT = t; break; }
      }
      shell.finish({
        label: `${matchedT.label || "解读"} · 对齐 ${matched}/${target.length}`,
        text: `${matchedT.text || ""}`,
        add: matchedT.add,
        personality: matchedT.personality,
        memory: matchedT.memory,
        next: matchedT.next,
      });
    };

    updateInfo();
  });

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
  register("starchart", function (sc, nodeId) {
    const shell = createShell({ kind: "starchart", prefix: "sc", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matchedOpt.label || "解读"} · 匹配 ${matched}/${expected.length}`,
        text: `${matchedOpt.text || ""}`,
        add: matchedOpt.add,
        personality: matchedOpt.personality,
        memory: matchedOpt.memory,
        record: () => Saves.saveStarchartRecord(nodeId, sequence, matched, expected.length, matchedOpt.tag),
        next: matchedOpt.next,
      });
    };


    resize();
  });

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
  register("eclipse", function (ec, nodeId) {
    const shell = createShell({ kind: "eclipse", prefix: "ec", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${err.toFixed(3)}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveEclipseRecord(nodeId, moon, target, err, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("celestial", function (ce, nodeId) {
    const shell = createShell({ kind: "celestial", prefix: "ce", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
    const planets = ce.planets || [];
    const tolerance = ce.tolerance ?? 8;
    const angles = planets.map(() => 0);  // 初始角度都为 0
    layer.innerHTML = `
      <div class="ce-prompt">${ce.prompt || "滑动行星到目标角度"}</div>
      <div class="ce-stage">
        <canvas class="ce-canvas" id="ce-canvas"></canvas>
        <div class="ce-info" id="ce-info">拖动行星调整角度</div>
      </div>
      <div class="ce-progress" id="ce-progress">0 / ${planets.length}</div>
      <div class="ce-actions">
        <button class="ce-reset">重置</button>
        <button class="ce-confirm" id="ce-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#ce-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#ce-info");
    const progressEl = layer.querySelector("#ce-progress");
    const confirmBtn = layer.querySelector(".ce-confirm");
    const resetBtn = layer.querySelector(".ce-reset");

    let aborted = false;
    let draggingIdx = -1;
    let cw = 0, ch = 0, cx = 0, cy = 0, orbitR = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      cx = cw / 2; cy = ch / 2;
      orbitR = Math.min(cw, ch) * 0.38;
    }

    function draw() {
      if (aborted) return;
      ctx.fillStyle = "rgba(5,10,25,0.6)";
      ctx.fillRect(0, 0, cw, ch);
      // 星空背景
      ctx.fillStyle = "rgba(200,220,255,0.5)";
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 73) % cw);
        const sy = ((i * 137) % ch);
        ctx.fillRect(sx, sy, 1, 1);
      }
      // 轨道
      ctx.strokeStyle = "rgba(160,200,240,0.3)";
      ctx.lineWidth = 1;
      planets.forEach((p, i) => {
        const r = orbitR * (0.5 + i * 0.25);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      // 中心
      ctx.fillStyle = "rgba(255,220,150,0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      // 行星
      let correctCount = 0;
      planets.forEach((p, i) => {
        const r = orbitR * (0.5 + i * 0.25);
        const rad = (angles[i] - 90) * Math.PI / 180;
        const x = cx + Math.cos(rad) * r;
        const y = cy + Math.sin(rad) * r;
        const diff = Math.abs(((angles[i] - p.target + 540) % 360) - 180);
        if (diff <= tolerance) correctCount++;
        ctx.fillStyle = p.color || "#a0d8ff";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        if (draggingIdx === i) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      progressEl.textContent = `${correctCount} / ${planets.length}`;
      info.textContent = `已对 ${correctCount}/${planets.length} · ${draggingIdx >= 0 ? "拖动中" : "拖动行星调整角度"}`;
      requestAnimationFrame(draw);
    }

    function getPlanetAt(x, y) {
      for (let i = 0; i < planets.length; i++) {
        const r = orbitR * (0.5 + i * 0.25);
        const rad = (angles[i] - 90) * Math.PI / 180;
        const px = cx + Math.cos(rad) * r;
        const py = cy + Math.sin(rad) * r;
        if (Math.hypot(x - px, y - py) < 18) return i;
      }
      return -1;
    }

    canvas.addEventListener("mousedown", (e) => {
      if (aborted) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (cw / rect.width);
      const y = (e.clientY - rect.top) * (ch / rect.height);
      draggingIdx = getPlanetAt(x, y);
    });
    canvas.addEventListener("mousemove", (e) => {
      if (aborted || draggingIdx < 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (cw / rect.width);
      const y = (e.clientY - rect.top) * (ch / rect.height);
      const r = orbitR * (0.5 + draggingIdx * 0.25);
      // 只在轨道上移动
      const ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
      angles[draggingIdx] = (ang + 360) % 360;
    });
    const stopDrag = () => { draggingIdx = -1; };
    canvas.addEventListener("mouseup", stopDrag);
    canvas.addEventListener("mouseleave", stopDrag);

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let i = 0; i < angles.length; i++) angles[i] = 0;
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let totalError = 0;
      let correctCount = 0;
      planets.forEach((p, i) => {
        const diff = Math.abs(((angles[i] - p.target + 540) % 360) - 180);
        if (diff <= tolerance) correctCount++;
        totalError += diff;
      });
      const thresholds = ce.thresholds || [];
      let matched = ce.fallback || { tag: "miss", label: "——没对上", next: null };
      for (const t of thresholds) {
        if ((planets.length - correctCount) <= (t.max ?? tolerance)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 对 ${correctCount}/${planets.length}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveCelestialRecord(nodeId, angles.slice(), planets.map(p => p.target), totalError, matched.tag),
        next: matched.next,
      });
    };


    resize();
    draw();
  });

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
  register("vane", function (va, nodeId) {
    const shell = createShell({ kind: "vane", prefix: "va", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
    const target = va.target ?? 90;
    const tolerance = va.tolerance ?? 8;
    let angle = 0;
    let dragging = false;
    layer.innerHTML = `
      <div class="va-prompt">${va.prompt || "旋转风向标对齐目标方位"}</div>
      <div class="va-stage">
        <div class="va-target-display">目标方位：${target}°</div>
        <canvas class="va-canvas" id="va-canvas"></canvas>
        <div class="va-info" id="va-info">拖动指针调整角度</div>
      </div>
      <div class="va-current" id="va-current">当前：0°</div>
      <div class="va-actions">
        <button class="va-reset">重置</button>
        <button class="va-confirm" id="va-confirm">确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#va-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#va-info");
    const currentEl = layer.querySelector("#va-current");
    const confirmBtn = layer.querySelector(".va-confirm");
    const resetBtn = layer.querySelector(".va-reset");

    let aborted = false;
    let cw = 0, ch = 0, cx = 0, cy = 0, R = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
      cx = cw / 2; cy = ch / 2;
      R = Math.min(cw, ch) * 0.4;
    }

    function draw() {
      if (aborted) return;
      ctx.fillStyle = "rgba(10,20,30,0.6)";
      ctx.fillRect(0, 0, cw, ch);
      // 罗盘外圈
      ctx.strokeStyle = "rgba(200,220,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      // 刻度
      for (let i = 0; i < 360; i += 15) {
        const rad = (i - 90) * Math.PI / 180;
        const r1 = R;
        const r2 = R - (i % 90 === 0 ? 18 : 10);
        ctx.strokeStyle = i % 90 === 0 ? "rgba(255,220,150,0.9)" : "rgba(180,200,240,0.5)";
        ctx.lineWidth = i % 90 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
        ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        ctx.stroke();
      }
      // 方位字
      ctx.fillStyle = "rgba(255,220,150,0.9)";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ["北","东","南","西"].forEach((dir, i) => {
        const rad = (i * 90 - 90) * Math.PI / 180;
        ctx.fillText(dir, cx + Math.cos(rad) * (R - 28), cy + Math.sin(rad) * (R - 28));
      });
      // 目标角度（虚线）
      const trad = (target - 90) * Math.PI / 180;
      ctx.strokeStyle = "rgba(255,180,80,0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(trad) * R * 0.85, cy + Math.sin(trad) * R * 0.85);
      ctx.stroke();
      ctx.setLineDash([]);
      // 当前指针
      const arad = (angle - 90) * Math.PI / 180;
      ctx.strokeStyle = "#80e0ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(arad) * R * 0.85, cy + Math.sin(arad) * R * 0.85);
      ctx.stroke();
      // 指针箭头
      ctx.fillStyle = "#80e0ff";
      ctx.beginPath();
      const tipX = cx + Math.cos(arad) * R * 0.85;
      const tipY = cy + Math.sin(arad) * R * 0.85;
      ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
      ctx.fill();
      // 中心
      ctx.fillStyle = "rgba(180,220,255,0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      const diff = Math.abs(((angle - target + 540) % 360) - 180);
      currentEl.textContent = `当前：${Math.round(angle)}° · 目标：${target}° · 差 ${Math.round(diff)}°`;
      info.textContent = diff <= tolerance ? "——对齐了！" : "拖动指针调整角度";
      requestAnimationFrame(draw);
    }

    function angleFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (cw / rect.width);
      const y = (e.clientY - rect.top) * (ch / rect.height);
      const ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
      return (ang + 360) % 360;
    }

    canvas.addEventListener("mousedown", (e) => {
      if (aborted) return;
      dragging = true;
      angle = angleFromEvent(e);
    });
    canvas.addEventListener("mousemove", (e) => {
      if (aborted || !dragging) return;
      angle = angleFromEvent(e);
    });
    const stopDrag = () => { dragging = false; };
    canvas.addEventListener("mouseup", stopDrag);
    canvas.addEventListener("mouseleave", stopDrag);

    resetBtn.onclick = () => {
      if (aborted) return;
      angle = 0;
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const diff = Math.abs(((angle - target + 540) % 360) - 180);
      const thresholds = va.thresholds || [];
      let matched = va.fallback || { tag: "miss", label: "——没对上", next: null };
      for (const t of thresholds) {
        if (diff <= (t.max ?? tolerance)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 差 ${Math.round(diff)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveVaneRecord(nodeId, Math.round(angle), target, Math.round(diff), matched.tag),
        next: matched.next,
      });
    };


    resize();
    draw();
  });

})();
