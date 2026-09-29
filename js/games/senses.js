/* ========================================
   樱时信笺 · 身心感知玩法集 (games/senses.js) v2.8.0
   —— 从 engine.js 迁出的 v1.0.0 / v1.1.0 批次玩法：
      时光胶囊 / 信纸折痕 / 呼吸引导 / 倒影对齐
      / 光影描绘 / 声音模仿 / 季节切换 / 脉搏同步
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转
   统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, flashHint } = window.GameKit;

  /* ============================================================
     v1.0.0 时光胶囊 timecapsule
     node.timecapsule = {
       prompt, placeholder, maxLength, deliverAt,
       onSubmit: { tag, label, text, add?, memory?, next? },
       onSkip:   { tag, label, text, add?, memory?, next? }
     }
     ============================================================ */
  register("timecapsule", function (tc, nodeId) {
    const shell = createShell({ kind: "timecapsule", prefix: "tc", nodeId });
    const layer = shell.layer;
    const maxLen = tc.maxLength || 60;
    layer.innerHTML = `
      <div class="tc-prompt">${tc.prompt || "给未来的自己写一句话——"}</div>
      <div class="tc-wrap">
        <textarea class="tc-input" id="tc-input" maxlength="${maxLen}" placeholder="${tc.placeholder || '写点什么……'}"></textarea>
        <div class="tc-count"><span id="tc-count">0</span> / ${maxLen}</div>
      </div>
      <div class="tc-actions">
        <button class="tc-skip" type="button">跳过</button>
        <button class="tc-submit" id="tc-submit" type="button" disabled>封存</button>
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

    function submit(submitted) {
      const message = input.value.trim();
      const tag = submitted ? (tc.onSubmit && tc.onSubmit.tag || "written") : "skipped";
      const feedback = submitted
        ? (tc.onSubmit || {})
        : (tc.onSkip || { tag: "skipped", label: "——没写", text: "你没写。也许以后再写。", next: null });
      shell.finish({
        ...feedback,
        record: () => Saves.saveTimecapsuleRecord(nodeId, message, tc.deliverAt || null, tag),
      });
    }

    submitBtn.onclick = () => { if (input.value.trim()) submit(true); };
    skipBtn.onclick = () => submit(false);

    setTimeout(() => input.focus(), 100);
  });

  /* ============================================================
     v1.0.0 信纸折痕 fold
     node.fold = {
       prompt,
       folds: [ { id, label, desc } ],
       interpretations: [ { order: ["a","b","c"], tag, label, text, add?, memory?, next? } ],
       min: 2,
       fallback: { tag: "default", next }
     }
     ============================================================ */
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

  register("fold", function (fd, nodeId) {
    const shell = createShell({ kind: "fold", prefix: "fd", nodeId });
    const layer = shell.layer;
    layer.innerHTML = `
      <div class="fd-prompt">${fd.prompt || "按顺序折叠信纸——"}</div>
      <div class="fd-paper" id="fd-paper">
        <div class="fd-paper-text">樱·时·信·笺</div>
      </div>
      <div class="fd-actions" id="fd-actions"></div>
      <div class="fd-controls">
        <button class="fd-reset" type="button">重置</button>
        <button class="fd-confirm" type="button" disabled>解读折痕</button>
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
      btn.type = "button";
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
      shell.finish({
        ...interp,
        record: () => Saves.saveFoldRecord(nodeId, sequence.slice(), interp.tag),
      });
    };
  });

  /* ============================================================
     v1.1.0 声音模仿 mimic
     node.mimic = {
       prompt,
       target: { pitch: 0.6, tempo: 0.4 },
       tolerance: 0.15,
       thresholds: [ { min: 0.8, tag, label, text, add?, memory?, next? }, … ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("mimic", function (mm, nodeId) {
    const shell = createShell({ kind: "mimic", prefix: "mm", nodeId });
    const layer = shell.layer;
    const tgt = mm.target || { pitch: 0.5, tempo: 0.5 };
    layer.innerHTML = `
      <div class="mm-prompt">${mm.prompt || "学她刚才说话的语气——"}</div>
      <div class="mm-target">目标 · 音调 <span id="mm-tgt-pitch">${Math.round(tgt.pitch * 100)}</span> · 语速 <span id="mm-tgt-tempo">${Math.round(tgt.tempo * 100)}</span></div>
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
        <button class="mm-confirm" id="mm-confirm" type="button">就这样</button>
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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 相似度 ${Math.round(score * 100)}%`,
        record: () => Saves.saveMimicRecord(nodeId, p, t, diff, matched.tag),
      });
    };

    update();
  });

  /* ============================================================
     v1.1.0 季节切换 season
     node.season = {
       prompt,
       seasons: ["spring","summer","autumn","winter"],
       target: "autumn",
       clue: "秋天的落叶里有她夹的字条",
       thresholds: [ { isTarget: true, tag, label, text, add?, memory?, next? }, … ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("season", function (sn, nodeId) {
    const shell = createShell({ kind: "season", prefix: "sn", nodeId });
    const layer = shell.layer;
    const seasons = sn.seasons || ["spring", "summer", "autumn", "winter"];
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
        <div class="sn-labels">${seasons.map((s, i) => `<span data-i="${i}">${seasonLabels[s] || s}</span>`).join("")}</div>
      </div>
      <div class="sn-info" id="sn-info">当前：春</div>
      <div class="sn-actions">
        <button class="sn-confirm" id="sn-confirm" type="button">就选这个季节</button>
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
      shell.finish({
        ...matched,
        record: () => Saves.saveSeasonRecord(nodeId, chosen, isTarget, matched.tag),
      });
    };

    renderSeason(0);
  });

  /* ============================================================
     v1.0.0 呼吸引导 breath
     node.breath = {
       prompt, cycles, inhaleMs, holdMs, exhaleMs,
       thresholds: [ { min: 0.8, tag, label, text, add?, memory?, next? }, … ],
       fallback: { tag: "miss", next }
     }
     ============================================================ */
  register("breath", function (br, nodeId) {
    let aborted = false;
    let rafId = null;
    const shell = createShell({
      kind: "breath",
      prefix: "br",
      nodeId,
      onCancel: () => {
        aborted = true;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      },
    });
    const layer = shell.layer;
    const on = shell.signal ? { signal: shell.signal } : undefined;
    const touchOn = shell.signal ? { passive: false, signal: shell.signal } : { passive: false };

    layer.innerHTML = `
      <div class="br-prompt">${br.prompt || "深呼吸——"}</div>
      <div class="br-stage" id="br-stage">
        <div class="br-circle" id="br-circle"></div>
        <div class="br-text" id="br-text">准备</div>
      </div>
      <div class="br-info" id="br-info">长按圆形区域吸气，松开呼气</div>
      <div class="br-progress" id="br-progress"></div>
      <div class="br-actions">
        <button class="br-start" id="br-start" type="button">开始</button>
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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · ${Math.round(avgSync * 100)}%`,
        record: () => Saves.saveBreathRecord(nodeId, currentCycle, avgSync, matched.tag),
      });
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

    // 事件随生命周期自动解绑（读档 / 返回标题 / 收尾时统一清理）
    circle.addEventListener("mousedown", onPressDown, on);
    circle.addEventListener("mouseup", onPressUp, on);
    circle.addEventListener("touchstart", onPressDown, touchOn);
    circle.addEventListener("touchend", onPressUp, on);

    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startBtn.disabled = true;
      startInhale();
      rafId = requestAnimationFrame(loop);
    };
  });

  /* ============================================================
     v1.0.0 倒影对齐 reflection
     node.reflection = {
       prompt, upper, lower,
       thresholds: [ { min: 0.9, tag, label, text, add?, memory?, next? }, … ],
       fallback: { tag: "miss", next }
     }
     ============================================================ */
  register("reflection", function (rf, nodeId) {
    const shell = createShell({ kind: "reflection", prefix: "rf", nodeId });
    const layer = shell.layer;
    const on = shell.signal ? { signal: shell.signal } : undefined;
    const touchOn = shell.signal ? { passive: false, signal: shell.signal } : { passive: false };

    layer.innerHTML = `
      <div class="rf-prompt">${rf.prompt || "拖动下半，让倒影与上半对齐——"}</div>
      <div class="rf-stage" id="rf-stage">
        <div class="rf-upper" id="rf-upper">${rf.upper || ""}</div>
        <div class="rf-water"></div>
        <div class="rf-lower" id="rf-lower">${rf.lower || ""}</div>
      </div>
      <div class="rf-info" id="rf-info">拖动下半调整位置</div>
      <div class="rf-actions">
        <button class="rf-confirm" id="rf-confirm" type="button">确定对齐</button>
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

    // 文档级监听随生命周期自动解绑（避免读档 / 返回标题后泄漏）
    lower.addEventListener("mousedown", onMouseDown, on);
    document.addEventListener("mousemove", onMouseMove, on);
    document.addEventListener("mouseup", onMouseUp, on);
    lower.addEventListener("touchstart", onTouchStart, touchOn);
    document.addEventListener("touchmove", onTouchMove, touchOn);
    document.addEventListener("touchend", onTouchEnd, on);

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · ${Math.round(accuracy * 100)}%`,
        record: () => Saves.saveReflectionRecord(nodeId, offsetX, accuracy, matched.tag),
      });
    };
  });

  /* ============================================================
     v1.1.0 光影描绘 lightdraw
     node.lightdraw = {
       prompt,
       targets: [ { id, x, y, r, label, desc?, memory? } ],   // x/y/r 为百分比
       min: 2,
       thresholds: [ { min: 0.8, tag, label, text, add?, memory?, next? }, … ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("lightdraw", function (ld, nodeId) {
    let aborted = false;
    let ro = null;
    const shell = createShell({
      kind: "lightdraw",
      prefix: "ld",
      nodeId,
      onCancel: () => {
        aborted = true;
        if (ro) ro.disconnect();
      },
    });
    const layer = shell.layer;
    const on = shell.signal ? { signal: shell.signal } : undefined;
    const touchOn = shell.signal ? { passive: false, signal: shell.signal } : { passive: false };

    const targets = ld.targets || [];
    layer.innerHTML = `
      <div class="ld-prompt">${ld.prompt || "用光拖过黑暗——"}</div>
      <div class="ld-stage" id="ld-stage">
        <canvas class="ld-canvas" id="ld-canvas"></canvas>
        ${targets.map((t, i) => `<div class="ld-target" data-id="${t.id}" data-idx="${i}" style="left:${t.x}%;top:${t.y}%;width:${(t.r || 4) * 2}%;height:${(t.r || 4) * 2}%;">
          <div class="ld-target-core"></div>
          <div class="ld-target-label">${t.label || ""}</div>
        </div>`).join("")}
      </div>
      <div class="ld-info" id="ld-info">已点亮 <span id="ld-count">0</span> / ${targets.length}</div>
      <div class="ld-actions">
        <button class="ld-reset" type="button">重置</button>
        <button class="ld-confirm" id="ld-confirm" type="button" disabled>收光</button>
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
    let strokes = []; // {x, y}[] 列表的列表
    let currentStroke = null;

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
            ctx.arc(s[0].x, s[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
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
            if (dx * dx + dy * dy <= tr * tr) {
              litSet.add(t.id);
              const targetEl = stage.querySelector(`.ld-target[data-idx="${i}"]`);
              if (targetEl) targetEl.classList.add("lit");
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

    // 文档级监听随生命周期自动解绑
    canvas.addEventListener("mousedown", onMouseDown, on);
    document.addEventListener("mousemove", onMouseMove, on);
    document.addEventListener("mouseup", onMouseUp, on);
    canvas.addEventListener("touchstart", onTouchStart, touchOn);
    document.addEventListener("touchmove", onTouchMove, touchOn);
    document.addEventListener("touchend", onTouchEnd, on);

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · ${Math.round(coverage * 100)}%`,
        record: () => Saves.saveLightdrawRecord(nodeId, Array.from(litSet), coverage, matched.tag),
      });
    };

    // ResizeObserver 监听 stage 尺寸变化（取消时由 onCancel 断开）
    ro = new ResizeObserver(() => { if (!aborted) resize(); });
    ro.observe(stage);
    resize();
  });

  /* ============================================================
     v1.1.0 脉搏同步 pulse
     node.pulse = {
       prompt, bpm, beats, tolerance,
       thresholds: [ { min: 0.8, tag, label, text, add?, memory?, next? }, … ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("pulse", function (pl, nodeId) {
    let aborted = false;
    let rafId = null;
    let ro = null;
    const shell = createShell({
      kind: "pulse",
      prefix: "pl",
      nodeId,
      onCancel: () => {
        aborted = true;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (ro) ro.disconnect();
      },
    });
    const layer = shell.layer;
    const on = shell.signal ? { signal: shell.signal } : undefined;
    const touchOn = shell.signal ? { passive: false, signal: shell.signal } : { passive: false };

    layer.innerHTML = `
      <div class="pl-prompt">${pl.prompt || "让你的心跳跟上她——"}</div>
      <div class="pl-stage">
        <canvas class="pl-canvas" id="pl-canvas"></canvas>
        <div class="pl-info" id="pl-info">点击节奏与对方心跳对齐 · 0 / ${pl.beats || 8}</div>
      </div>
      <div class="pl-actions">
        <button class="pl-start" id="pl-start" type="button">开始</button>
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
    let beatCount = 0;
    let started = false;
    let startTime = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
    }

    // 对方心跳：固定 BPM；玩家心跳：按点击节奏插值
    let playerBeats = []; // {time, hit}

    function draw(now) {
      if (aborted) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 中线
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · ${Math.round(accuracy * 100)}%`,
        record: () => Saves.savePulseRecord(nodeId, hits, totalBeats, accuracy, matched.tag),
      });
    }

    canvas.addEventListener("click", onTap, on);
    canvas.addEventListener("touchstart", e => { onTap(); e.preventDefault(); }, touchOn);
    startBtn.onclick = () => {
      if (started) return;
      started = true;
      startBtn.disabled = true;
      startTime = performance.now();
      rafId = requestAnimationFrame(draw);
    };

    ro = new ResizeObserver(() => { if (!aborted) resize(); });
    ro.observe(canvas);
    resize();
  });
})();