/* ========================================
   樱时信笺 · 手作与器物玩法集 (games/craft.js) v2.8.4
   —— 从 engine.js 迁出的 13 个玩法：
      折纸 / 拼图 / 马赛克 / 编织 / 扎染 / 碑刻 / 调色 / 灯笼 / 镜面 / 棋 / 旗帜 / 鼓 / 琴键
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell } = window.GameKit;

  /* ============================================================
     v1.7.0 折纸造型 origami
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
  register("origami", function (og, nodeId) {
    const shell = createShell({ kind: "origami", prefix: "og", nodeId });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"}`,
        record: () => Saves.saveOrigamiRecord(nodeId, sequence.slice(), matched.tag),
      });
    };
  });

  /* ============================================================
     v2.6.0 拼图归位 jigsaw
     node.jigsaw = {
       prompt: "点击碎片归位，拼出完整图案",
       target: [1, 2, 0, 3],   // 目标位置序列（碎片 i 应放到 target[i] 位置）
       tolerance: 0,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("jigsaw", function (jg, nodeId) {
    const shell = createShell({ kind: "jigsaw", prefix: "ji", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

    const target = jg.target || [0,1,2,3];
    const count = target.length;
    const tolerance = jg.tolerance ?? 0;
    const placed = target.map((_, i) => i);
    layer.innerHTML = `
      <div class="ji-prompt">${jg.prompt || "点击碎片归位，拼出完整图案"}</div>
      <div class="ji-stage">
        <div class="ji-slots" id="ji-slots"></div>
        <div class="ji-info" id="ji-info">点击两个碎片交换位置</div>
      </div>
      <div class="ji-progress" id="ji-progress">0 / ${count}</div>
      <div class="ji-actions">
        <button class="ji-reset">重置</button>
        <button class="ji-confirm" id="ji-confirm">确认</button>
      </div>
    `;
    const slotsEl = layer.querySelector("#ji-slots");
    const info = layer.querySelector("#ji-info");
    const progressEl = layer.querySelector("#ji-progress");
    const confirmBtn = layer.querySelector(".ji-confirm");
    const resetBtn = layer.querySelector(".ji-reset");

    let aborted = false;
    let selected = -1;

    slotsEl.style.gridTemplateColumns = `repeat(${Math.ceil(count/2)}, 1fr)`;

    function render() {
      slotsEl.innerHTML = "";
      let correctCount = 0;
      for (let i = 0; i < count; i++) {
        const slot = document.createElement("div");
        slot.className = "ji-slot";
        const fragIdx = placed[i];
        const isCorrect = (target[i] === fragIdx);
        if (isCorrect) { slot.classList.add("ji-correct"); correctCount++; }
        if (selected === i) slot.classList.add("ji-selected");
        const frag = document.createElement("div");
        frag.className = "ji-fragment ji-frag-" + (fragIdx % 4);
        frag.textContent = "片" + (fragIdx + 1);
        slot.appendChild(frag);
        slot.addEventListener("click", () => {
          if (aborted) return;
          if (selected === -1) {
            selected = i;
          } else if (selected === i) {
            selected = -1;
          } else {
            const tmp = placed[selected];
            placed[selected] = placed[i];
            placed[i] = tmp;
            selected = -1;
          }
          render();
        });
        slotsEl.appendChild(slot);
      }
      progressEl.textContent = `${correctCount} / ${count}`;
      info.textContent = `已对 ${correctCount}/${count} · ${selected === -1 ? "点击碎片选择" : "点击另一碎片交换"}`;
    }
    render();

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let i = 0; i < count; i++) placed[i] = i;
      selected = -1;
      render();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let mismatched = 0;
      for (let i = 0; i < count; i++) {
        if (placed[i] !== target[i]) mismatched++;
      }
      const thresholds = jg.thresholds || [];
      let matched = jg.fallback || { tag: "miss", label: "——没拼上", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matched = t; break; }
      }
      const matchedCount = count - mismatched;
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 对 ${matchedCount}/${count} · 错 ${mismatched}`,
        record: () => Saves.saveJigsawRecord(nodeId, placed.slice(), target, matchedCount, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.4.0 马赛克拼图 mosaic
     node.mosaic = {
       prompt: "点选小方块，拼出目标图案",
       pattern: [ [0,1,1,0], [1,1,1,1], [1,1,1,1], [0,1,1,0] ],  // 1=填，0=空
       tolerance: 2,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("mosaic", function (mo_, nodeId) {
    const shell = createShell({ kind: "mosaic", prefix: "mo", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 匹配 ${matchedCount}/${rows * cols} · 错 ${mismatched}`,
        record: () => Saves.saveMosaicRecord(nodeId, grid, matchedCount, rows * cols, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.3.0 经纬编织 weave
     node.weave = {
       prompt: "交替点选经纬线，编织目标图案",
       pattern: [ [0,1,0,1], [1,0,1,0], [0,1,0,1], [1,0,1,0] ], // 目标图案，1=经，0=纬
       tolerance: 2,            // 允许错误格数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("weave", function (wv, nodeId) {
    const shell = createShell({ kind: "weave", prefix: "wv", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 匹配 ${matchedCount}/${rows * cols} · 错 ${mismatched}`,
        record: () => Saves.saveWeaveRecord(nodeId, grid, matchedCount, rows * cols, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.3.0 染缸调色 dye
     node.dye = {
       prompt: "调节三色染缸，调出目标颜色",
       target: { r: 200, g: 100, b: 80 },
       tolerance: 30,            // 单通道容差
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("dye", function (dy, nodeId) {
    const shell = createShell({ kind: "dye", prefix: "dy", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 色差 ${dist.toFixed(0)}`,
        record: () => Saves.saveDyeRecord(nodeId, rgb, target, dist, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.5.0 碑帖拼合 stele
     node.stele = {
       prompt: "拖动碎片到正确位置，拼合碑文",
       target: [2, 0, 3, 1],   // 目标位置序列（碎片 i 应放到 target[i] 位置）
       tolerance: 0,           // 允许错位数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("stele", function (st, nodeId) {
    const shell = createShell({ kind: "stele", prefix: "st", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

    const target = st.target || [0,1,2,3];
    const count = target.length;
    const tolerance = st.tolerance ?? 0;
    // 当前每个位置上的碎片索引（初始化为 [0,1,2,3]，玩家点击两个位置交换）
    const placed = target.map((_, i) => i);
    layer.innerHTML = `
      <div class="st-prompt">${st.prompt || "拖动碎片到正确位置，拼合碑文"}</div>
      <div class="st-stage">
        <div class="st-slots" id="st-slots"></div>
        <div class="st-info" id="st-info">点击两个碎片交换位置</div>
      </div>
      <div class="st-progress" id="st-progress">0 / ${count}</div>
      <div class="st-actions">
        <button class="st-reset">重置</button>
        <button class="st-confirm" id="st-confirm">确认</button>
      </div>
    `;
    const slotsEl = layer.querySelector("#st-slots");
    const info = layer.querySelector("#st-info");
    const progressEl = layer.querySelector("#st-progress");
    const confirmBtn = layer.querySelector(".st-confirm");
    const resetBtn = layer.querySelector(".st-reset");

    let aborted = false;
    let selected = -1;

    slotsEl.style.gridTemplateColumns = `repeat(${count}, 1fr)`;

    function render() {
      slotsEl.innerHTML = "";
      let correctCount = 0;
      for (let i = 0; i < count; i++) {
        const slot = document.createElement("div");
        slot.className = "st-slot";
        const fragIdx = placed[i];
        const isCorrect = (target[i] === fragIdx);
        if (isCorrect) { slot.classList.add("st-correct"); correctCount++; }
        if (selected === i) slot.classList.add("st-selected");
        const frag = document.createElement("div");
        frag.className = "st-fragment";
        frag.textContent = "碑" + (fragIdx + 1);
        slot.appendChild(frag);
        slot.addEventListener("click", () => {
          if (aborted) return;
          if (selected === -1) {
            selected = i;
          } else if (selected === i) {
            selected = -1;
          } else {
            // 交换
            const tmp = placed[selected];
            placed[selected] = placed[i];
            placed[i] = tmp;
            selected = -1;
          }
          render();
        });
        slotsEl.appendChild(slot);
      }
      progressEl.textContent = `${correctCount} / ${count}`;
      info.textContent = `已对 ${correctCount}/${count} · ${selected === -1 ? "点击碎片选择" : "点击另一碎片交换"}`;
    }
    render();

    resetBtn.onclick = () => {
      if (aborted) return;
      for (let i = 0; i < count; i++) placed[i] = i;
      selected = -1;
      render();
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      let mismatched = 0;
      for (let i = 0; i < count; i++) {
        if (placed[i] !== target[i]) mismatched++;
      }
      const thresholds = st.thresholds || [];
      let matched = st.fallback || { tag: "miss", label: "——没拼上", next: null };
      for (const t of thresholds) {
        if (mismatched <= (t.max ?? tolerance)) { matched = t; break; }
      }
      const matchedCount = count - mismatched;
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 对 ${matchedCount}/${count} · 错 ${mismatched}`,
        record: () => Saves.saveSteleRecord(nodeId, placed, target, matchedCount, matched.tag),
      });
    };
  });

  /* ============================================================
     v1.2.0 颜料调配 palette
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
  register("palette", function (p, nodeId) {
    const shell = createShell({ kind: "palette", prefix: "pa", nodeId });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 相似度 ${Math.round(score * 100)}%`,
        record: () => Saves.savePaletteRecord(nodeId, r, g, b, diff, matched.tag),
      });
    };

    update();
  });

  /* ============================================================
     v2.4.0 灯笼排列 lantern
     node.lantern = {
       prompt: "按顺序点亮灯笼，还原目标序列",
       target: [2, 0, 3, 1],     // 目标索引序列
       count: 4,                  // 灯笼总数
       tolerance: 0,              // 允许错位数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("lantern", function (la, nodeId) {
    const shell = createShell({ kind: "lantern", prefix: "la", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 对 ${matchedCount}/${target.length} · 错 ${mismatched}`,
        record: () => Saves.saveLanternRecord(nodeId, order, target, matchedCount, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.4.0 镜面对称 mirror
     node.mirror = {
       prompt: "点选格子让左半镜像右半",
       pattern: [ [1,0,0,1], [0,1,1,0], [1,0,0,1], [0,1,1,0] ],  // 目标对称图案
       tolerance: 1,            // 允许错误格数
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("mirror", function (mi, nodeId) {
    const shell = createShell({ kind: "mirror", prefix: "mi", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 匹配 ${matchedCount}/${rows * cols} · 错 ${mismatched}`,
        record: () => Saves.saveMirrorRecord(nodeId, grid, matchedCount, rows * cols, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.6.0 棋局推演 chess
     node.chess = {
       prompt: "移动棋子到目标位置",
       size: 4,
       start: { x: 0, y: 0 },
       target: { x: 3, y: 3 },
       obstacles: [ { x: 1, y: 1 } ],
       maxMoves: 8,
       tolerance: 2,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("chess", function (ch, nodeId) {
    const shell = createShell({ kind: "chess", prefix: "chs", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

    const size = ch.size || 4;
    const start = ch.start || { x: 0, y: 0 };
    const target = ch.target || { x: size - 1, y: size - 1 };
    const obstacles = ch.obstacles || [];
    const maxMoves = ch.maxMoves || size * 2;
    const tolerance = ch.tolerance ?? 2;
    const moves = [];
    let piece = { x: start.x, y: start.y };
    layer.innerHTML = `
      <div class="chs-prompt">${ch.prompt || "移动棋子到目标位置"}</div>
      <div class="chs-stage">
        <div class="chs-board" id="chs-board"></div>
        <div class="chs-info" id="chs-info">点击格子移动棋子（每步一格）</div>
      </div>
      <div class="chs-progress" id="chs-progress">0 / ${maxMoves} 步</div>
      <div class="chs-actions">
        <button class="chs-reset">重置</button>
        <button class="chs-confirm" id="chs-confirm">确认</button>
      </div>
    `;
    const boardEl = layer.querySelector("#chs-board");
    const info = layer.querySelector("#chs-info");
    const progressEl = layer.querySelector("#chs-progress");
    const confirmBtn = layer.querySelector(".chs-confirm");
    const resetBtn = layer.querySelector(".chs-reset");

    let aborted = false;

    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    function isObstacle(x, y) {
      return obstacles.some(o => o.x === x && o.y === y);
    }
    function isAdjacent(x, y) {
      return Math.abs(x - piece.x) + Math.abs(y - piece.y) === 1;
    }

    function render() {
      boardEl.innerHTML = "";
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cell = document.createElement("div");
          cell.className = "chs-cell";
          if ((x + y) % 2 === 0) cell.classList.add("chs-light");
          else cell.classList.add("chs-dark");
          if (isObstacle(x, y)) cell.classList.add("chs-obstacle");
          if (x === target.x && y === target.y) cell.classList.add("chs-target");
          if (piece.x === x && piece.y === y) cell.classList.add("chs-piece");
          if (isAdjacent(x, y) && !isObstacle(x, y)) cell.classList.add("chs-movable");
          cell.addEventListener("click", () => {
            if (aborted) return;
            if (moves.length >= maxMoves) return;
            if (!isAdjacent(x, y)) return;
            if (isObstacle(x, y)) return;
            piece = { x, y };
            moves.push({ x, y });
            render();
            if (x === target.x && y === target.y) {
              info.textContent = "到达目标！点确认查看结果";
            } else {
              info.textContent = `移动到 (${x},${y}) · 剩余 ${maxMoves - moves.length} 步`;
            }
          });
          boardEl.appendChild(cell);
        }
      }
      const dist = Math.abs(piece.x - target.x) + Math.abs(piece.y - target.y);
      progressEl.textContent = `${moves.length} / ${maxMoves} 步 · 距目标 ${dist}`;
    }
    render();

    resetBtn.onclick = () => {
      if (aborted) return;
      piece = { x: start.x, y: start.y };
      moves.length = 0;
      render();
      info.textContent = "点击格子移动棋子（每步一格）";
    };

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      const dist = Math.abs(piece.x - target.x) + Math.abs(piece.y - target.y);
      const reached = (piece.x === target.x && piece.y === target.y);
      const thresholds = ch.thresholds || [];
      let matched = ch.fallback || { tag: "miss", label: "——没走到", next: null };
      for (const t of thresholds) {
        if (dist <= (t.max ?? tolerance)) { matched = t; break; }
      }
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 距目标 ${dist} · ${moves.length} 步`,
        record: () => Saves.saveChessRecord(nodeId, moves.slice(), target, reached ? 1 : 0, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.6.0 旗阵辨识 flag
     node.flag = {
       prompt: "按描述选择正确的旗帜",
       description: "红底白圆居中",
       options: [ { id: 0, label: "红底白圆居中" }, ... ],
       target: 0,
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("flag", function (fl, nodeId) {
    const shell = createShell({ kind: "flag", prefix: "fl", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

    const options = fl.options || [];
    const target = fl.target ?? 0;
    layer.innerHTML = `
      <div class="fl-prompt">${fl.prompt || "按描述选择正确的旗帜"}</div>
      <div class="fl-description">${fl.description || ""}</div>
      <div class="fl-stage">
        <div class="fl-options" id="fl-options"></div>
      </div>
      <div class="fl-info" id="fl-info">点击选择一面旗帜</div>
      <div class="fl-actions">
        <button class="fl-confirm" id="fl-confirm" disabled>确认</button>
      </div>
    `;
    const optionsEl = layer.querySelector("#fl-options");
    const info = layer.querySelector("#fl-info");
    const confirmBtn = layer.querySelector(".fl-confirm");

    let aborted = false;
    let selected = -1;

    function renderFlags() {
      optionsEl.innerHTML = "";
      options.forEach((opt, i) => {
        const flag = document.createElement("div");
        flag.className = "fl-flag fl-pattern-" + (opt.pattern || i % 4);
        if (selected === i) flag.classList.add("fl-selected");
        flag.innerHTML = `
          <div class="fl-flag-canvas">
            <div class="fl-pattern fl-pattern-${opt.pattern || (i % 4)}"></div>
          </div>
          <div class="fl-flag-label">${opt.label || ("旗" + (i + 1))}</div>
        `;
        flag.addEventListener("click", () => {
          if (aborted) return;
          selected = i;
          renderFlags();
          info.textContent = `已选：${opt.label || ("旗" + (i + 1))}`;
          confirmBtn.disabled = false;
        });
        optionsEl.appendChild(flag);
      });
    }
    renderFlags();

    confirmBtn.onclick = () => {
      if (aborted || selected === -1) return;
      aborted = true;
      confirmBtn.disabled = true;
      const correct = (selected === target);
      const thresholds = fl.thresholds || [];
      let matched = fl.fallback || { tag: "miss", label: "——选错了", next: null };
      for (const t of thresholds) {
        if (t.max === 0 && correct) { matched = t; break; }
        if (t.max === 1 && !correct) { matched = t; break; }
      }
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · ${correct ? "选对" : "选错"}`,
        record: () => Saves.saveFlagRecord(nodeId, selected, target, correct ? 1 : 0, matched.tag),
      });
    };
  });

  /* ============================================================
     v2.5.0 节拍鼓点 drum
     node.drum = {
       prompt: "按节拍敲击鼓面，复现目标节奏",
       sequence: [800, 400, 800, 400, 400],   // 每次敲击间隔（毫秒）
       tolerance: 150,    // 允许时间误差毫秒
       thresholds: [ { max, tag, label, text, add?, personality?, memory?, next } ],
       fallback: { tag, next }
     }
     ============================================================ */
  register("drum", function (dr, nodeId) {
    const shell = createShell({ kind: "drum", prefix: "dr", nodeId, onCancel: () => {
      aborted = true;
      demoTimers.forEach(t => clearTimeout(t));
    } });
    const layer = shell.layer;

    const sequence = dr.sequence || [800, 400, 800];
    const tolerance = dr.tolerance ?? 150;
    const hits = [];   // 玩家敲击时间戳
    let startTime = 0;
    let listening = false;
    layer.innerHTML = `
      <div class="dr-prompt">${dr.prompt || "按节拍敲击鼓面，复现目标节奏"}</div>
      <div class="dr-stage">
        <div class="dr-target">目标节奏：${sequence.length} 拍</div>
        <div class="dr-drum" id="dr-drum">击鼓</div>
        <div class="dr-info" id="dr-info">点「开始」后按节奏敲击鼓面</div>
      </div>
      <div class="dr-progress" id="dr-progress">0 / ${sequence.length}</div>
      <div class="dr-actions">
        <button class="dr-start" id="dr-start">开始</button>
        <button class="dr-confirm" id="dr-confirm" disabled>确认</button>
      </div>
    `;
    const drum = layer.querySelector("#dr-drum");
    const info = layer.querySelector("#dr-info");
    const progressEl = layer.querySelector("#dr-progress");
    const startBtn = layer.querySelector("#dr-start");
    const confirmBtn = layer.querySelector("#dr-confirm");

    let aborted = false;

    // 演示目标节奏
    let demoTimers = [];
    function playDemo() {
      info.textContent = "听一遍目标节奏…";
      let t = 0;
      sequence.forEach((interval, i) => {
        t += interval;
        const timer = setTimeout(() => {
          if (aborted) return;
          drum.classList.add("dr-flash");
          setTimeout(() => drum.classList.remove("dr-flash"), 200);
          if (i === sequence.length - 1) {
            setTimeout(() => {
              if (aborted) return;
              info.textContent = "现在按节奏敲击鼓面！";
              listening = true;
              startTime = Date.now();
            }, 400);
          }
        }, t);
        demoTimers.push(timer);
      });
    }

    startBtn.onclick = () => {
      if (aborted || listening) return;
      startBtn.disabled = true;
      playDemo();
    };

    drum.addEventListener("click", () => {
      if (aborted || !listening) return;
      const t = Date.now() - startTime;
      hits.push(t);
      progressEl.textContent = `${hits.length} / ${sequence.length}`;
      drum.classList.add("dr-hit");
      setTimeout(() => drum.classList.remove("dr-hit"), 100);
      if (hits.length >= sequence.length) {
        listening = false;
        confirmBtn.disabled = false;
        info.textContent = "完成！点确认查看结果";
      }
    });

    confirmBtn.onclick = () => {
      if (aborted) return;
      aborted = true;
      confirmBtn.disabled = true;
      // 计算累计误差
      let totalError = 0;
      let correctCount = 0;
      let expected = 0;
      sequence.forEach((interval, i) => {
        expected += interval;
        const actual = hits[i] || 0;
        const diff = Math.abs(actual - expected);
        if (diff <= tolerance) correctCount++;
        totalError += diff;
      });
      const thresholds = dr.thresholds || [];
      let matched = dr.fallback || { tag: "miss", label: "——没跟上", next: null };
      for (const t of thresholds) {
        if ((sequence.length - correctCount) <= (t.max ?? 0)) { matched = t; break; }
      }
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 对 ${correctCount}/${sequence.length}`,
        record: () => Saves.saveDrumRecord(nodeId, hits.slice(), sequence, correctCount, matched.tag),
      });
    };
  });

  /* ============================================================
     v1.2.0 琴键演奏 piano
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
  register("piano", function (p, nodeId) {
    const shell = createShell({ kind: "piano", prefix: "pi", nodeId, onCancel: () => {
      aborted = true;
    } });
    const layer = shell.layer;

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
      shell.finish({
        ...matched,
        label: `${matched.label || "解读"} · 正确率 ${Math.round(accuracy * 100)}%`,
        record: () => Saves.savePianoRecord(nodeId, playerSeq.join(","), correct, sequence.length, accuracy, matched.tag),
      });
    };
  });
})();
