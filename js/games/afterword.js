/* ========================================
   樱时信笺 · 后日谈玩法集 (games/afterword.js) v2.7.9
   —— 从 engine.js 迁出的 5 个后日谈玩法：
      明信片印记 / 时间线排序 / 回信分拣 / 留言墙 / 校刊校对
   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转
   统一交给 GameKit（js/gamekit.js）。
   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）
   ======================================== */
(function () {
  "use strict";

  const { register, createShell, escapeHtml, formatProgress } = window.GameKit;

  /* ============================================================
     v2.6.4 明信片印记 postcard
     node.postcard = {
       prompt, hint, max,
       stamps: [ { id, label, desc } ],
       interpretations: [ { stamps, label, text, add?, personality?, next } ],
       fallback: { label, text, add?, personality?, next }
     }
     ============================================================ */
  register("postcard", function (pd, nodeId) {
    const shell = createShell({ kind: "postcard", nodeId });
    const layer = shell.layer;

    layer.innerHTML = `
      <div class="postcard-card">
        <div class="postcard-prompt">${escapeHtml(pd.prompt || "选择明信片印记")}</div>
        <div class="postcard-hint">${escapeHtml(pd.hint || "选出你想留下的印记")}</div>
        <div class="postcard-stamps" id="postcard-stamps"></div>
        <div class="postcard-info" id="postcard-info">请选择 ${pd.max || 2} 枚印记</div>
        <div class="postcard-actions">
          <button class="postcard-reset" type="button">重选</button>
          <button class="postcard-confirm" type="button" disabled>寄出明信片</button>
        </div>
      </div>
    `;
    const stampsEl = layer.querySelector("#postcard-stamps");
    const info = layer.querySelector("#postcard-info");
    const resetBtn = layer.querySelector(".postcard-reset");
    const confirmBtn = layer.querySelector(".postcard-confirm");
    const max = Math.max(1, Number(pd.max) || 2);
    const selected = [];

    function renderStamps() {
      stampsEl.innerHTML = "";
      (pd.stamps || []).forEach((stamp) => {
        const button = document.createElement("button");
        button.className = "postcard-stamp";
        button.type = "button";
        if (selected.includes(stamp.id)) button.classList.add("selected");
        button.innerHTML = `<strong>${escapeHtml(stamp.label || stamp.id)}</strong><span>${escapeHtml(stamp.desc || "")}</span>`;
        button.onclick = () => {
          const index = selected.indexOf(stamp.id);
          if (index >= 0) selected.splice(index, 1);
          else if (selected.length < max) selected.push(stamp.id);
          renderStamps();
          confirmBtn.disabled = selected.length !== max;
          info.textContent = `已选 ${selected.length} / ${max}：${selected.map(id => (pd.stamps.find(s => s.id === id) || {}).label || id).join("、")}`;
        };
        stampsEl.appendChild(button);
      });
    }
    renderStamps();

    resetBtn.onclick = () => {
      selected.length = 0;
      renderStamps();
      confirmBtn.disabled = true;
      info.textContent = `请选择 ${max} 枚印记`;
    };

    confirmBtn.onclick = () => {
      if (selected.length !== max) return;
      const selectedKey = selected.slice().sort().join("|");
      const matched = (pd.interpretations || []).find((item) => {
        return Array.isArray(item.stamps) && item.stamps.slice().sort().join("|") === selectedKey;
      }) || pd.fallback || { label: "——寄出", text: "明信片被寄了出去。", next: null };
      shell.finish(matched);
    };
  });

  /* ============================================================
     v2.7.3 后日谈时间线 timeline
     node.timeline = {
       prompt, hint,
       events: [ { id, date, label, desc } ],
       correctOrder: [id, ...],
       success: { label, text, add?, personality?, next? },
       retry: { label, text, add?, personality?, next? }
     }
     ============================================================ */
  register("timeline", function (tl, nodeId) {
    const shell = createShell({ kind: "timeline", nodeId });
    const layer = shell.layer;

    layer.innerHTML = `
      <div class="timeline-card">
        <div class="timeline-prompt">${escapeHtml(tl.prompt || "按时间排好事件")}</div>
        <div class="timeline-hint">${escapeHtml(tl.hint || "从最早发生的事开始")}</div>
        <div class="timeline-stage">
          <div class="timeline-order-label">已排顺序</div>
          <div class="timeline-order" id="timeline-order"><div class="timeline-empty">点击下方事件，从最早排到最近</div></div>
          <div class="timeline-pool-label">待整理事件</div>
          <div class="timeline-pool" id="timeline-pool"></div>
        </div>
        <div class="timeline-info" id="timeline-info">已排 0 / ${(tl.events || []).length}</div>
        <div class="timeline-actions">
          <button class="timeline-reset" type="button">重排</button>
          <button class="timeline-confirm" type="button" disabled>确认顺序</button>
        </div>
      </div>
    `;
    const orderEl = layer.querySelector("#timeline-order");
    const poolEl = layer.querySelector("#timeline-pool");
    const info = layer.querySelector("#timeline-info");
    const resetBtn = layer.querySelector(".timeline-reset");
    const confirmBtn = layer.querySelector(".timeline-confirm");
    const events = Array.isArray(tl.events) ? tl.events : [];
    const order = [];

    function eventById(id) { return events.find((event) => event.id === id) || {}; }

    function render() {
      orderEl.innerHTML = "";
      if (order.length === 0) {
        orderEl.innerHTML = '<div class="timeline-empty">点击下方事件，从最早排到最近</div>';
      } else {
        order.forEach((id, index) => {
          const event = eventById(id);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "timeline-event timeline-ordered";
          button.innerHTML = `<span class="timeline-index">${index + 1}</span><span><strong>${escapeHtml(event.date || "")}</strong>${escapeHtml(event.label || id)}<small>${escapeHtml(event.desc || "")}</small></span>`;
          button.onclick = () => {
            order.splice(index, 1);
            render();
          };
          orderEl.appendChild(button);
        });
      }
      poolEl.innerHTML = "";
      events.filter((event) => !order.includes(event.id)).forEach((event) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "timeline-event";
        button.innerHTML = `<strong>${escapeHtml(event.date || "")}</strong>${escapeHtml(event.label || event.id)}<small>${escapeHtml(event.desc || "")}</small>`;
        button.onclick = () => {
          order.push(event.id);
          render();
        };
        poolEl.appendChild(button);
      });
      info.textContent = `已排 ${order.length} / ${events.length}`;
      confirmBtn.disabled = events.length === 0 || order.length !== events.length;
    }

    resetBtn.onclick = () => {
      order.length = 0;
      render();
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const correctOrder = Array.isArray(tl.correctOrder) ? tl.correctOrder : [];
      const correct = order.length === correctOrder.length && order.every((id, index) => id === correctOrder[index]);
      const matched = (correct ? tl.success : tl.retry) || { label: "——顺序记下了", text: "你们把日期收好。", next: null };
      shell.finish({
        ...matched,
        record: () => Saves.saveTimelineRecord(nodeId, order.slice(), correct, correct ? "correct" : "retry"),
      });
    };

    render();
  });

  /* ============================================================
     双列匹配工厂（回信分拣 / 留言墙 / 校刊校对共用）
     —— 三者结构一致：左列条目 → 选中 → 右侧归类 → 全部归类后确认。
     spec = {
       kind, nodeId, config,
       leftList, rightList,         // 左右列容器名（triage-notes / triage-replies …）
       leftItem, rightItem, rightUsed, // 条目 class 后缀
       texts: { … },                // 各玩法文案（默认值、标签、状态提示）
       expectedId(item),            // 正确归类的目标 id
       save(assignment, correct),   // 记录写入
       defaultResult                // 无 success/retry 时的兜底结果
     }
     ============================================================ */
  function runMatchGame(spec) {
    const { kind, nodeId, config, texts } = spec;
    const shell = createShell({ kind, nodeId });
    const layer = shell.layer;
    const leftItems = Array.isArray(spec.items) ? spec.items : [];
    const rightItems = Array.isArray(spec.bins) ? spec.bins : [];

    layer.innerHTML = `
      <div class="${kind}-card">
        <div class="${kind}-prompt">${escapeHtml(config.prompt || texts.promptDefault)}</div>
        <div class="${kind}-hint">${escapeHtml(config.hint || texts.hintDefault)}</div>
        <div class="${kind}-progress" id="${kind}-progress">${formatProgress(0, leftItems.length, texts.progressVerb)}</div>
        <div class="${kind}-columns">
          <section class="${kind}-column">
            <div class="${kind}-column-label">${escapeHtml(texts.leftLabel)}</div>
            <div class="${kind}-${spec.leftList}" id="${kind}-${spec.leftList}"></div>
          </section>
          <section class="${kind}-column">
            <div class="${kind}-column-label">${escapeHtml(texts.rightLabel)}</div>
            <div class="${kind}-${spec.rightList}" id="${kind}-${spec.rightList}"></div>
          </section>
        </div>
        <div class="${kind}-info" id="${kind}-info">${escapeHtml(texts.initialInfo)}</div>
        <div class="${kind}-actions">
          <button class="${kind}-reset" type="button">${escapeHtml(texts.resetLabel)}</button>
          <button class="${kind}-confirm" type="button" disabled>${escapeHtml(texts.confirmLabel)}</button>
        </div>
      </div>
    `;
    const leftEl = layer.querySelector(`#${kind}-${spec.leftList}`);
    const rightEl = layer.querySelector(`#${kind}-${spec.rightList}`);
    const progressEl = layer.querySelector(`#${kind}-progress`);
    const infoEl = layer.querySelector(`#${kind}-info`);
    const resetBtn = layer.querySelector(`.${kind}-reset`);
    const confirmBtn = layer.querySelector(`.${kind}-confirm`);
    const assignment = Object.create(null);
    let selectedId = null;

    function rightById(id) { return rightItems.find((right) => right.id === id) || {}; }

    function render() {
      leftEl.innerHTML = "";
      leftItems.forEach((item) => {
        const assigned = assignment[item.id];
        const right = assigned ? rightById(assigned) : null;
        const button = document.createElement("button");
        button.type = "button";
        button.className = `${kind}-${spec.leftItem}`
          + (selectedId === item.id ? ` ${kind}-selected` : "")
          + (assigned ? ` ${kind}-assigned` : "");
        button.innerHTML = `<strong>${escapeHtml(item.label || item.id)}</strong><span>${escapeHtml(item.text || "")}</span>`
          + (right
            ? `<small>${escapeHtml(`${texts.assignedPrefix}${right.label || assigned}`)}</small>`
            : `<small>${escapeHtml(texts.leftEmptyHint)}</small>`);
        button.onclick = () => {
          if (assignment[item.id]) {
            delete assignment[item.id];
            selectedId = item.id;
            infoEl.textContent = texts.unassignInfo;
          } else {
            selectedId = item.id;
            infoEl.textContent = `${texts.selectPrefix}「${item.label || item.id}」${texts.selectSuffix}`;
          }
          render();
        };
        leftEl.appendChild(button);
      });

      rightEl.innerHTML = "";
      rightItems.forEach((right) => {
        const matchedLeft = leftItems.filter((item) => assignment[item.id] === right.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `${kind}-${spec.rightItem}` + (matchedLeft.length ? ` ${kind}-${spec.rightUsed}` : "");
        button.innerHTML = `<strong>${escapeHtml(right.label || right.id)}</strong><span>${escapeHtml(right.text || "")}</span>`
          + texts.rightStatus(matchedLeft);
        button.onclick = () => {
          if (!selectedId) {
            infoEl.textContent = texts.needLeftInfo;
            return;
          }
          /* 分拣类玩法一个回应只能对应一封信（exclusiveBin）；
             留言墙 / 校对允许多张放在同一位置，不做清空 */
          if (spec.exclusiveBin) {
            for (const item of leftItems) {
              if (assignment[item.id] === right.id) delete assignment[item.id];
            }
          }
          assignment[selectedId] = right.id;
          selectedId = null;
          infoEl.textContent = texts.assignInfo;
          render();
        };
        rightEl.appendChild(button);
      });

      const count = leftItems.filter((item) => assignment[item.id]).length;
      progressEl.textContent = formatProgress(count, leftItems.length, texts.progressVerb);
      confirmBtn.disabled = leftItems.length === 0 || count !== leftItems.length;
    }

    resetBtn.onclick = () => {
      for (const item of leftItems) delete assignment[item.id];
      selectedId = null;
      infoEl.textContent = texts.initialInfo;
      render();
    };

    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      const correct = leftItems.length > 0 && leftItems.every((item) => assignment[item.id] === spec.expectedId(item));
      const matched = (correct ? config.success : config.retry) || spec.defaultResult;
      shell.finish({
        ...matched,
        record: () => spec.save({ ...assignment }, correct, correct ? "correct" : "retry"),
      });
    };

    render();
  }

  /* ---------- v2.7.3 后日谈回信分拣 triage ---------- */
  register("triage", function (tg, nodeId) {
    runMatchGame({
      kind: "triage",
      nodeId,
      config: tg,
      items: Array.isArray(tg.notes) ? tg.notes : [],
      bins: Array.isArray(tg.replies) ? tg.replies : [],
      leftList: "notes",
      rightList: "replies",
      leftItem: "note",
      rightItem: "reply",
      rightUsed: "used",
      exclusiveBin: true,
      texts: {
        promptDefault: "匹配来信与回应",
        hintDefault: "先读来信，再选择回应",
        progressVerb: "已处理",
        leftLabel: "来信",
        rightLabel: "回应",
        assignedPrefix: "回应：",
        leftEmptyHint: "点击后选择回应",
        selectPrefix: "已选",
        selectSuffix: "，再选择右侧回应",
        unassignInfo: "已撤回这张纸条的回应，请重新选择",
        assignInfo: "已匹配。可以点击已匹配的纸条撤回并修改",
        needLeftInfo: "先选择左侧一张纸条",
        initialInfo: "先选择一张未处理的纸条",
        resetLabel: "重置匹配",
        confirmLabel: "确认回应",
        rightStatus: (matchedLeft) => matchedLeft.length
          ? `<small>已匹配：${escapeHtml(matchedLeft[0].label || matchedLeft[0].id)}</small>`
          : "",
      },
      expectedId: (note) => (tg.correctMapping || {})[note.id],
      save: (assignment, correct) => Saves.saveTriageRecord(nodeId, assignment, correct, correct ? "correct" : "retry"),
      defaultResult: { label: "——回应已写下", text: "你们把纸条贴回墙上。", next: null },
    });
  });

  /* ---------- v2.7.4 后日谈留言墙 wall ---------- */
  register("wall", function (wl, nodeId) {
    runMatchGame({
      kind: "wall",
      nodeId,
      config: wl,
      items: Array.isArray(wl.notes) ? wl.notes : [],
      bins: Array.isArray(wl.bins) ? wl.bins : [],
      leftList: "notes",
      rightList: "bins",
      leftItem: "note",
      rightItem: "bin",
      rightUsed: "bin-used",
      texts: {
        promptDefault: "整理留言墙",
        hintDefault: "先确认作者的意愿，再决定留言去哪里",
        progressVerb: "已处理",
        leftLabel: "待整理留言",
        rightLabel: "处理位置",
        assignedPrefix: "位置：",
        leftEmptyHint: "点击后选择处理位置",
        selectPrefix: "已选",
        selectSuffix: "，再选择右侧位置",
        unassignInfo: "已撤回这张留言，请重新选择位置",
        assignInfo: "已放入。点击已处理的留言可以撤回修改",
        needLeftInfo: "先选择左侧一张留言",
        initialInfo: "先选择一张留言",
        resetLabel: "重置整理",
        confirmLabel: "确认张贴",
        rightStatus: (matchedLeft) => `<small>${matchedLeft.length ? `已放入 ${matchedLeft.length} 张` : "点击放入选中的留言"}</small>`,
      },
      expectedId: (note) => note.target,
      save: (assignment, correct) => Saves.saveWallRecord(nodeId, assignment, correct, correct ? "correct" : "retry"),
      defaultResult: { label: "——留言已整理", text: "你们把纸条收好。", next: null },
    });
  });

  /* ---------- v2.7.6 后日谈校刊校对 proofread ---------- */
  register("proofread", function (pr, nodeId) {
    runMatchGame({
      kind: "proofread",
      nodeId,
      config: pr,
      items: Array.isArray(pr.cards) ? pr.cards : [],
      bins: Array.isArray(pr.bins) ? pr.bins : [],
      leftList: "cards",
      rightList: "bins",
      leftItem: "quote",
      rightItem: "bin",
      rightUsed: "bin-used",
      texts: {
        promptDefault: "校对稿件里的句子",
        hintDefault: "先区分能证实的事实，再把未知留在合适的位置",
        progressVerb: "已校对",
        leftLabel: "稿件句子",
        rightLabel: "校对标记",
        assignedPrefix: "标记：",
        leftEmptyHint: "点击后选择右侧标记",
        selectPrefix: "已选",
        selectSuffix: "，再选择右侧标记",
        unassignInfo: "已撤回这句稿件，请重新选择校对标记",
        assignInfo: "已标记。点击已处理的句子可以撤回修改",
        needLeftInfo: "先选择左侧一句稿件",
        initialInfo: "先选择一句稿件",
        resetLabel: "重新校对",
        confirmLabel: "确认稿件",
        rightStatus: (matchedLeft) => `<small>${matchedLeft.length ? `已标记 ${matchedLeft.length} 句` : "点击放入选中的句子"}</small>`,
      },
      expectedId: (card) => card.target,
      save: (assignment, correct) => Saves.saveProofreadRecord(nodeId, assignment, correct, correct ? "correct" : "retry"),
      defaultResult: { label: "——稿件已校对", text: "你们把句子逐一核对。", next: null },
    });
  });
})();