/* ========================================
   樱时信笺 · 知觉与心绪玩法集 (games/perception.js) v2.8.7
   —— 从 engine.js 迁出的 14 个玩法：
      塔罗占卜 / 梦境编织 / 心声听诊 / 信物拼图 / 气味调香 / 茶席品茗 / 命运骰子 / 密文解读 / 纹理拓印 / 拾物收集 / 专注凝视 / 气味记忆 / 叶底读茶 / 甜度调配
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, flashHint } = window.GameKit;

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
  /* ============================================================
     v0.8.0 占卜抽牌 tarot · 组合判定辅助
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
     v0.8.0 梦境编织 dreamweave · 解读判定辅助
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

  function matchPerfume(pf, ids) {
    const recipes = pf.recipes || [];
    for (const r of recipes) {
      if (r.ids && r.ids.length === ids.length && r.ids.every(id => ids.includes(id))) {
        return r;
      }
    }
    return pf.fallback || { tag: "default", label: "——香不成方", next: null };
  }

  register("tarot", function (tarot, nodeId) {

    const shell = createShell({ kind: "tarot", prefix: "tarot", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${combo.label || "解读"}`,
        text: `${combo.text || ""}`,
        add: combo.add,
        personality: combo.personality,
        memory: combo.memory,
        record: () => Saves.saveTarotRecord(nodeId,
          past ? { id: past.id, name: past.name, reversed: past._reversed } : null,
          present ? { id: present.id, name: present.name, reversed: present._reversed } : null,
          future ? { id: future.id, name: future.name, reversed: future._reversed } : null,
          combo.tag),
        next: combo.next,
      });
    };

  });

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
  register("dreamweave", function (dw, nodeId) {
    const shell = createShell({ kind: "dreamweave", prefix: "dw", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${interp.label || "解读"}`,
        text: `${interp.text || ""}`,
        add: interp.add,
        personality: interp.personality,
        memory: interp.memory,
        record: () => Saves.saveDreamweaveRecord(nodeId, sequence.slice(), interp.text || "", interp.tag),
        next: interp.next,
      });
    };

  });

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
  register("stethoscope", function (st, nodeId) {
    // 原实现无清理钩子：读档 / 返回标题后残留的 rAF 与 setTimeout(finishStethoscope)
    // 会照常触发并写入记录、加成好感——迁移时经 onCancel 置 finished 拦截，修复该问题
    const shell = createShell({ kind: "stethoscope", prefix: "st", nodeId,
      onCancel: () => {
        finished = true;
        if (animId) cancelAnimationFrame(animId);
        document.removeEventListener("keydown", onKey);
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · ${Math.round(accuracy * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveStethoscopeRecord(nodeId, hits, totalBeats, accuracy, matched.tag),
        next: matched.next,
      });
    }

  });

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
  register("puzzle", function (pz, nodeId) {
    const shell = createShell({ kind: "puzzle", prefix: "pz", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${interp.label || "解读"}`,
        text: `${interp.text || ""}`,
        add: interp.add,
        personality: interp.personality,
        memory: interp.memory,
        record: () => Saves.savePuzzleRecord(nodeId, sequence.slice(), interp.tag),
        next: interp.next,
      });
    };

  });

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
  register("perfume", function (pf, nodeId) {
    const shell = createShell({ kind: "perfume", prefix: "pf", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${recipe.label || "解读"}`,
        text: `${recipe.text || ""}`,
        add: recipe.add,
        personality: recipe.personality,
        memory: recipe.memory,
        record: () => Saves.savePerfumeRecord(nodeId, { ...selected }, recipe.tag),
        next: recipe.next,
      });
    };

  });

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
  register("tea", function (t, nodeId) {
    const shell = createShell({ kind: "tea", prefix: "tea", nodeId });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 相似度 ${Math.round(score * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveTeaRecord(nodeId, p, a, ti, diff, matched.tag),
        next: matched.next,
      });
    };

    update();
  });

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
  register("dice", function (d, nodeId) {
    const shell = createShell({ kind: "dice", prefix: "di", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 总和 ${sum}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveDiceRecord(nodeId, dice.slice(), sum, matched.tag),
        next: matched.next,
      });
    };


  });

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
  register("decode", function (dc, nodeId) {
    const shell = createShell({ kind: "decode", prefix: "de", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"}${correct ? " · 正确" : ""}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveDecodeRecord(nodeId, current, correct, matched.tag),
        next: matched.next,
      });
    };


    renderPool();
    renderAnswer();
  });

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
  register("rubbing", function (rb, nodeId) {
    const shell = createShell({ kind: "rubbing", prefix: "ru", nodeId,
      onCancel: () => {
      aborted = true;
      if (ro) ro.disconnect();
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 覆盖率 ${Math.round(coverage * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveRubbingRecord(nodeId, coverage, matched.tag),
        next: matched.next,
      });
    };

    const ro = new ResizeObserver(() => { if (!aborted) resize(); });

    ro.observe(canvas);
    resize();
  });

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
  register("collect", function (c, nodeId) {
    const shell = createShell({ kind: "collect", prefix: "cl", nodeId,
      onCancel: () => {
      aborted = true;
      if (spawnTimer) clearInterval(spawnTimer);
      if (endTimer) clearTimeout(endTimer);
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 收集 ${collected} / ${total}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveCollectRecord(nodeId, collected, total, accuracy, matched.tag),
        next: matched.next,
      });
    }


  });

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
  register("focus", function (f, nodeId) {
    const shell = createShell({ kind: "focus", prefix: "fo", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 清晰度 ${Math.round(score * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveFocusRecord(nodeId, v, diff, matched.tag),
        next: matched.next,
      });
    };


    update();
  });

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
  register("scentmem", function (sm, nodeId) {
    const shell = createShell({ kind: "scentmem", prefix: "sm", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · 正确 ${correctPicks} / ${totalTargets}`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveScentmemRecord(nodeId, correctPicks, totalTargets, matched.tag),
        next: matched.next,
      });
    };


  });

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
  register("tealeaf", function (tl, nodeId) {
    const shell = createShell({ kind: "tealeaf", prefix: "tl", nodeId,
      onCancel: () => {
      aborted = true;
      } });
    const layer = shell.layer;
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
      shell.finish({
        label: `${matched.label || "解读"} · ${shapeName} · 信度 ${Math.round(score * 100)}%`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveTealeafRecord(nodeId, shapeName, score, matched.tag),
        next: matched.next,
      });
    };


    resize();
  });

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
  register("sugar", function (sg, nodeId) {
    const shell = createShell({ kind: "sugar", prefix: "sg", nodeId,
      onCancel: () => {
      aborted = true;
      releaseHandlers.forEach(handler => {
        document.removeEventListener("mouseup", handler);
        document.removeEventListener("touchend", handler);
      });
      } });
    const layer = shell.layer;
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
    const releaseHandlers = [];

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
      // 目标格不属于糖块本身，释放事件必须在文档级收尾。
      document.addEventListener("mouseup", end);
      document.addEventListener("touchend", end);
      releaseHandlers.push(end);
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
      releaseHandlers.forEach(handler => {
        document.removeEventListener("mouseup", handler);
        document.removeEventListener("touchend", handler);
      });
      pieceDoms.forEach(d => d.style.pointerEvents = "none");
      const ratio = placedCount / Math.max(1, total);
      const thresholds = sg.thresholds || [];
      let matched = sg.fallback || { tag: "miss", label: "——没拼好", next: null };
      for (const t of thresholds) {
        if (ratio >= t.min) { matched = t; break; }
      }
      shell.finish({
        label: `${matched.label || "解读"} · ${placedCount} / ${total} 块就位`,
        text: `${matched.text || ""}`,
        add: matched.add,
        personality: matched.personality,
        memory: matched.memory,
        record: () => Saves.saveSugarRecord(nodeId, placedCount, total, matched.tag),
        next: matched.next,
      });
    };


  });

})();
