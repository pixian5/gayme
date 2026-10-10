/* ========================================
   樱时信笺 · 机械与律动玩法集 (games/mechanism.js) v2.8.8
   —— 从 engine.js 迁出的 14 个玩法：
      转盘拨号 / 编钟音序 / 沙漏翻转 / 密码锁 / 罗盘校准 / 电报编码 / 天平配重 / 钟摆节奏 / 节拍器 / 调音听弦 / 算盘求和 / 齿轮咬合 / 日晷投影 / 水钟滴漏
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, flashHint } = window.GameKit;

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
  register("dial", function (dl, nodeId) {
    const shell = createShell({ kind: "dial", prefix: "dl", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 你拨的：${dialed} / 目标：${target}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveDialRecord(nodeId, dialed, target, correct, matched.tag),
        next: matched.next,
      });
    };


    showPreview();
  });

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
  register("chime", function (ch, nodeId) {
    const shell = createShell({ kind: "chime", prefix: "ch", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 音差 ${diff.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveChimeRecord(nodeId, diff, matched.tag),
        next: matched.next,
      });
    };


    resize();
    rafId = requestAnimationFrame(loop);
  });

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
  register("hourglass", function (hg, nodeId) {
    const shell = createShell({ kind: "hourglass", prefix: "hg", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${(error / 1000).toFixed(2)}s`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveHourglassRecord(nodeId, error, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("lock", function (lk, nodeId) {
    // 原实现无清理钩子：预览定时器只靠 aborted 守卫，却无处置位——onCancel 补上
    const shell = createShell({ kind: "lock", prefix: "lk", nodeId,
      onCancel: () => { aborted = true; } });
    const layer = shell.layer;
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
      Saves.saveLockRecord(nodeId, input, target, correct, correct === len ? "perfect" : correct >= 2 ? "good" : "miss");
      const thresholds = lk.thresholds || [];
      let matched = lk.fallback || { tag: "miss", label: "——锁没开", next: null };
      for (const t of thresholds) {
        if (correct >= (t.min ?? 4)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 正确 ${correct}/${len}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        next: matched.next,
      });
    };

  });

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
  register("compass", function (cp, nodeId) {
    const shell = createShell({ kind: "compass", prefix: "cp", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      draw();
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${diff.toFixed(0)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveCompassRecord(nodeId, Math.round(angle), target, diff, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("telegraph", function (tg, nodeId) {
    const shell = createShell({ kind: "telegraph", prefix: "tg", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 你选「${selected}」 · 正解「${code}」`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveTelegraphRecord(nodeId, code, selected, correct, matched.tag),
        next: matched.next,
      });
    };


  });

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
  register("balance", function (bl, nodeId) {
    const shell = createShell({ kind: "balance", prefix: "bl", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 左 ${leftSum} · 右 ${rightSum}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveBalanceRecord(nodeId, leftSum, rightSum, diff, matched.tag),
        next: matched.next,
      });
    };


    renderPool();
    resize();
  });

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
  register("pendulum", function (pd, nodeId) {
    const shell = createShell({ kind: "pendulum", prefix: "pd", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
        shell.finish({
          label: `${matched.label || "解读"} · 停在 ${(posNow * 100).toFixed(0)}%`,
          text: `${matched.text || ""}`,
          add: matched.add,
          personality: matched.personality,
          memory: matched.memory,
          record: () => Saves.savePendulumRecord(nodeId, posNow, target, err, matched.tag),
          next: matched.next,
        });
      };
      layer.querySelector(".pd-actions").appendChild(confirmBtn);
    };


    resize();
  });

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
  register("metronome", function (mt, nodeId) {
    const shell = createShell({ kind: "metronome", prefix: "mt", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
          shell.finish({
            label: `${matched.label || "解读"} · 准确率 ${(accuracy * 100).toFixed(0)}%`,
            text: `${matched.text || ""}`,
            add: matched.add,
            personality: matched.personality,
            memory: matched.memory,
            record: () => Saves.saveMetronomeRecord(nodeId, hits, total, accuracy, matched.tag),
            next: matched.next,
          });
        };
        layer.querySelector(".mt-actions").appendChild(confirmBtn);
      } else {
        draw();
      }
    };


    resize();
  });

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
  register("tuning", function (tn, nodeId) {
    const shell = createShell({ kind: "tuning", prefix: "tn", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 平均偏差 ${avgDiff.toFixed(3)}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveTuningRecord(nodeId, worstIdx, tensions[worstIdx], avgDiff, matched.tag),
        next: matched.next,
      });
    };


    renderList();
    resize();
  });

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
  register("abacus", function (ab, nodeId) {
    const shell = createShell({ kind: "abacus", prefix: "ab_ac", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 总偏差 ${totalDiff}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveAbacusRecord(nodeId, counts, targets, totalDiff, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("gear", function (gd, nodeId) {
    const shell = createShell({ kind: "gear", prefix: "gr", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 平均偏差 ${avgErr.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveGearRecord(nodeId, angles, targets, avgErr, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("sundial", function (sd, nodeId) {
    const shell = createShell({ kind: "sundial", prefix: "su", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${err.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveSundialRecord(nodeId, angle, target, err, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("clepsydra", function (cl, nodeId) {
    const shell = createShell({ kind: "clepsydra", prefix: "cly", nodeId,
      onCancel: () => {
      aborted = true;
      cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
    const target = cl.target ?? 5000;
    const tolerance = cl.tolerance ?? 200;
    const duration = cl.duration ?? 10000;
    let startTime = 0;
    let stopped = false;
    let stoppedAt = 0;
    let rafId = 0;
    layer.innerHTML = `
      <div class="cly-prompt">${cl.prompt || "在目标时刻停止水流"}</div>
      <div class="cly-stage">
        <canvas class="cly-canvas" id="cly-canvas"></canvas>
        <div class="cly-info" id="cly-info">点击「开始」放水，再点击「停止」</div>
      </div>
      <div class="cly-target-display">目标：${(target/1000).toFixed(1)}s · 误差 ≤ ${(tolerance/1000).toFixed(1)}s</div>
      <div class="cly-current" id="cly-current">当前：0.0s</div>
      <div class="cly-actions">
        <button class="cly-start" id="cly-start">开始</button>
        <button class="cly-stop" id="cly-stop" disabled>停止</button>
        <button class="cly-confirm" id="cly-confirm" disabled>确认</button>
      </div>
    `;
    const canvas = layer.querySelector("#cly-canvas");
    const ctx = canvas.getContext("2d");
    const info = layer.querySelector("#cly-info");
    const currentEl = layer.querySelector("#cly-current");
    const startBtn = layer.querySelector("#cly-start");
    const stopBtn = layer.querySelector("#cly-stop");
    const confirmBtn = layer.querySelector("#cly-confirm");

    let aborted = false;
    let cw = 0, ch = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      cw = canvas.width; ch = canvas.height;
    }

    function draw() {
      if (aborted) return;
      const elapsed = stopped ? stoppedAt : (startTime ? Date.now() - startTime : 0);
      const ratio = Math.min(1, elapsed / duration);
      // 背景
      ctx.fillStyle = "rgba(20,30,40,0.6)";
      ctx.fillRect(0, 0, cw, ch);
      // 漏刻容器
      const cx = cw / 2;
      const topY = ch * 0.15;
      const botY = ch * 0.85;
      const W = Math.min(cw * 0.4, 120);
      // 上瓶
      ctx.strokeStyle = "rgba(200,220,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - W/2, topY);
      ctx.lineTo(cx - W/2, topY + (botY - topY) * 0.4);
      ctx.lineTo(cx - W/4, topY + (botY - topY) * 0.5);
      ctx.lineTo(cx - W/4, botY - 10);
      ctx.lineTo(cx + W/4, botY - 10);
      ctx.lineTo(cx + W/4, topY + (botY - topY) * 0.5);
      ctx.lineTo(cx + W/2, topY + (botY - topY) * 0.4);
      ctx.lineTo(cx + W/2, topY);
      ctx.closePath();
      ctx.stroke();
      // 上瓶水位
      const waterTop = topY + (botY - topY) * 0.4 * (1 - ratio);
      const grad = ctx.createLinearGradient(0, waterTop, 0, botY - 10);
      grad.addColorStop(0, "rgba(120,180,220,0.7)");
      grad.addColorStop(1, "rgba(80,140,200,0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - W/2 + 2, waterTop, W - 4, botY - 10 - waterTop);
      // 水流
      if (startTime && !stopped && ratio < 1) {
        ctx.strokeStyle = "rgba(120,180,220,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, topY + (botY - topY) * 0.5);
        ctx.lineTo(cx, botY - 12);
        ctx.stroke();
      }
      // 目标线
      const targetY = topY + (botY - topY) * 0.4 * (1 - Math.min(1, target / duration));
      ctx.strokeStyle = "rgba(255,180,80,0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - W/2 - 10, targetY);
      ctx.lineTo(cx + W/2 + 10, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      // 时间显示
      currentEl.textContent = `当前：${(elapsed/1000).toFixed(1)}s · 目标：${(target/1000).toFixed(1)}s`;
      if (!stopped && startTime) {
        const diff = Math.abs(elapsed - target);
        info.textContent = diff <= tolerance ? "——可以停了！" : "继续放水…";
      } else if (stopped) {
        const diff = Math.abs(stoppedAt - target);
        info.textContent = `停止于 ${(stoppedAt/1000).toFixed(1)}s · 差 ${(diff/1000).toFixed(1)}s`;
      }
      rafId = requestAnimationFrame(draw);
    }

    startBtn.onclick = () => {
      if (aborted || startTime) return;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      startTime = Date.now();
    };

    stopBtn.onclick = () => {
      if (aborted || stopped || !startTime) return;
      stopped = true;
      stoppedAt = Date.now() - startTime;
      stopBtn.disabled = true;
      confirmBtn.disabled = false;
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      cancelAnimationFrame(rafId);
      const diff = Math.abs(stoppedAt - target);
      const thresholds = cl.thresholds || [];
      let matched = cl.fallback || { tag: "miss", label: "——没停准", next: null };
      for (const t of thresholds) {
        if (diff <= (t.max ?? tolerance)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 差 ${(diff/1000).toFixed(1)}s`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveClepsydraRecord(nodeId, stoppedAt, target, diff, matched.tag),
        next: matched.next,
      });
    };


    resize();
    draw();
  });

})();
