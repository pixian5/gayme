/* ========================================
   樱时信笺 · 图像与光影玩法集 (games/imagery.js) v2.8.9
   —— 从 engine.js 迁出的 12 个玩法：
      光影描形 / 烛光守夜 / 邮戳盖印 / 星盘环扣 / 流沙成画 / 万花筒 / 等高线 / 风车叶片 / 水波涟漪 / 瓶中回音 / 回声定位 / 透镜聚光
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, flashHint } = window.GameKit;

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
  register("shadow", function (sh, nodeId) {
    const shell = createShell({ kind: "shadow", prefix: "sh", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 重合度 ${Math.round(o * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveShadowRecord(nodeId, o, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("candle", function (cd, nodeId) {
    const shell = createShell({ kind: "candle", prefix: "cd", nodeId,
      onCancel: () => {
      aborted = true;
      if (windTimer) clearTimeout(windTimer);
      if (gapTimer) clearTimeout(gapTimer);
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 守住 ${windsSurvived} / ${windsTotal} 阵风`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveCandleRecord(nodeId, windsSurvived, windsTotal, ratio, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("stamp", function (st, nodeId) {
    const shell = createShell({ kind: "stamp", prefix: "st", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${err.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveStampRecord(nodeId, angle, target, err, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("astrolabe", function (ab_data, nodeId) {
    const shell = createShell({ kind: "astrolabe", prefix: "ab", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 平均偏差 ${avgErr.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveAstrolabeRecord(nodeId, angles, targets, avgErr, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("sandpaint", function (sp, nodeId) {
    const shell = createShell({ kind: "sandpaint", prefix: "sp", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matchedOpt.label || "解读"} · 匹配 ${matched}/${targetCount} · 偏差 ${mismatched}`,
        text: `${matchedOpt.text || ""}`,
        add: matchedOpt.add,
        personality: matchedOpt.personality,
        memory: matchedOpt.memory,
        record: () => Saves.saveSandpaintRecord(nodeId, grid, matched, targetCount, matchedOpt.tag),
        next: matchedOpt.next,
      });
    };


    resize();
  });

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
  register("kaleido", function (ka, nodeId) {
    const shell = createShell({ kind: "kaleido", prefix: "ka", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${err.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveKaleidoRecord(nodeId, angle, target, err, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("topo", function (tp, nodeId) {
    const shell = createShell({ kind: "topo", prefix: "to", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matchedOpt.label || "解读"} · 匹配 ${matched}/${expectedPoints.length} · 偏差 ${mismatched}`,
        text: `${matchedOpt.text || ""}`,
        add: matchedOpt.add,
        personality: matchedOpt.personality,
        memory: matchedOpt.memory,
        record: () => Saves.saveTopoRecord(nodeId, Array.from(selected), matched, expectedPoints.length, matchedOpt.tag),
        next: matchedOpt.next,
      });
    };


    resize();
  });

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
  register("windmill", function (wm, nodeId) {
    const shell = createShell({ kind: "windmill", prefix: "wm", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 平均偏差 ${avgErr.toFixed(1)}°`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveWindmillRecord(nodeId, angles, target, avgErr, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("ripple", function (rp, nodeId) {
    const shell = createShell({ kind: "ripple", prefix: "ri", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 覆盖 ${coveredCount}/${targets.length}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveRippleRecord(nodeId, ripples.length, targets.length, targets.length - coveredCount, matched.tag),
        next: matched.next,
      });
    };


    resize();
    draw();
  });

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
  register("bottle", function (bt, nodeId) {
    const shell = createShell({ kind: "bottle", prefix: "bt", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      Saves.saveBottleRecord(nodeId, power, reached ? 1 : 0, reached ? "perfect" : Math.abs(bottle.distRatio - target) <= tolerance * 2 ? "good" : "miss");
      const thresholds = bt.thresholds || [];
      let matched = bt.fallback || { tag: "miss", label: "——瓶沉了", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? tolerance)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 落点 ${(bottle.distRatio * 100).toFixed(0)}% · 偏差 ${(error * 100).toFixed(1)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        next: matched.next,
      });
    };


    resize();
    bottle.x = cw * 0.1;
    bottle.y = ch * 0.65;
    draw();
  });

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
  register("echoloc", function (ec, nodeId) {
    const shell = createShell({ kind: "echoloc", prefix: "ec", nodeId,
      onCancel: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      } });
    const layer = shell.layer;
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
      Saves.saveEcholocRecord(nodeId, estimate, actual, error, error <= tolerance ? "perfect" : error <= tolerance * 2 ? "good" : "miss");
      const thresholds = ec.thresholds || [];
      let matched = ec.fallback || { tag: "miss", label: "——估算偏差", next: null };
      for (const t of thresholds) {
        if (error <= (t.max ?? tolerance)) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · 估算 ${(estimate * 100).toFixed(0)}% · 实际 ${(actual * 100).toFixed(0)}%`,
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
     v2.0.0 透镜聚焦 runLens
     node.lens = {
       prompt: "调节透镜焦距——让光线汇聚到目标点",
       target: 0.6,
       tolerance: 0.05,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("lens", function (ln, nodeId) {
    const shell = createShell({ kind: "lens", prefix: "ln", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 偏差 ${err.toFixed(3)}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveLensRecord(nodeId, focus, target, err, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

})();
