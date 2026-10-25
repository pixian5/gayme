/* ========================================
   樱时信笺 · 浮层渲染器 (js/ui/panels.js) v3.4.7
   —— 从 engine.js 迁出的浮层面板渲染：存读档/设置/历史+回响/统计/图鉴/关于/
      关键词合成台/CG 图鉴/流程图/性格画像/收件箱/朋友圈/线索提示。
   模式：工厂 + ctx 注入。engine.js 启动时构建 ctx，本文件零全局依赖。
   交互层（showChoices/showLetter/triggerEcho 等）与状态机耦合深，保留在引擎。
   ======================================== */
window.SakuraPanels = function (C) {
  "use strict";
  let historyTab = "dialog";   // 历史面板当前 Tab（工厂局部状态）
  const { el, state, Saves, SCRIPT, applyUiSettings, GAME_CHANGELOG, CGS, ENDINGS, KEYWORDS,
    applyAdd, applySet, updateHeartBar, cgArt, openCgViewer, showChoices, showLetter,
    triggerEcho, importSlotFromFile, fadeBgm, createDefaultVariables, COMPOSE_RECIPES, MOMENTS, escapeHtml, flashHint, playSfx, gotoNode, backToTitle, newGame, closeOverlay, openOverlay, snapshot, quickSave, saveToSlot, loadFromSlot, removeActiveInteractionLayers, startAfterword, hasAllGoodEndings, isTrueEndUnlocked, GAME_VERSION, updateInboxBadge, playBgmForScene, stopBgm, sfxGain, stopParticles, bgmAudioEl, bgmGain, bgmVolume, particles, playTickAt, updateParticles } = C;
  const get = (k) => C[k];

  function renderSaveSlots(mode) {
    let html = "";
    for (let i = 0; i < 9; i++) {
      const data = Saves.data.slots[i];
      const isQuick = i === 0;
      if (data) {
        html += `<div class="save-slot" data-slot="${i}">
          <div class="slot-no">${i + 1}</div>
          <div class="slot-info">
            <div class="slot-title">${escapeHtml(data.name || data.sceneLabel || "未知场景")}${isQuick ? " · 快存" : ""}</div>
            <div class="slot-meta">${Saves.formatTime(data.timestamp)} · ${escapeHtml(data.dialogPreview || "")}</div>
          </div>
          <div class="slot-actions">
            ${mode === "save" ? `<button data-act="save" data-slot="${i}">覆盖</button>` : `<button data-act="load" data-slot="${i}">读取</button>`}
            <button data-act="rename" data-slot="${i}">命名</button>
            <button data-act="export" data-slot="${i}">导出</button>
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
          <div class="slot-actions">${mode === "save" ? `<button data-act="save" data-slot="${i}">存档</button>` : ""}<button data-act="import" data-slot="${i}">导入</button></div>
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
        else if (act === "rename") {
          const data = Saves.load(slot);
          const name = window.prompt("为该存档命名（留空则清除）", data?.name || "");
          if (name !== null && Saves.renameSave(slot, name)) { renderSaveSlots(mode); flashHint("已命名"); }
        }
        else if (act === "export") {
          const slotData = Saves.exportSlot(slot);
          if (!slotData) { flashHint("该槽位没有存档"); return; }
          const blob = new Blob([JSON.stringify(slotData, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `sakura-save-slot${slot + 1}.json`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          flashHint(`已导出槽位 ${slot + 1}`);
        }
        else if (act === "import") importSlotFromFile(slot, mode);
        else if (act === "del") {
          if (Saves.deleteSave(slot)) {
            renderSaveSlots(mode);
            flashHint("已删除");
          } else {
            flashHint("删除失败：浏览器存储不可用");
          }
        }
      };
    });
  }

  function renderConfig() {
    const s = Saves.settings;
    el.overlayBody.innerHTML = `
      <div class="config-row">
        <label>文字速度（越小越快）</label>
        <input type="range" id="cfg-textspeed" min="5" max="80" value="${escapeHtml(String(s.textSpeed))}">
        <span id="cfg-textspeed-val" style="color:#ffb8c8;width:50px;">${escapeHtml(String(s.textSpeed))}ms</span>
      </div>
      <div class="config-row">
        <label>自动模式延迟</label>
        <input type="range" id="cfg-autodelay" min="500" max="4000" step="100" value="${escapeHtml(String(s.autoDelay))}">
        <span id="cfg-autodelay-val" style="color:#ffb8c8;width:70px;">${escapeHtml(String(s.autoDelay))}ms</span>
      </div>
      <div class="config-row"><label>粒子特效</label>
        <select id="cfg-particles"><option value="true" ${s.particles ? "selected" : ""}>开启</option><option value="false" ${!s.particles ? "selected" : ""}>关闭</option></select>
      </div>
      <div class="config-row"><label>减少动效</label>
        <select id="cfg-reducemotion"><option value="true" ${s.reduceMotion ? "selected" : ""}>开启</option><option value="false" ${!s.reduceMotion ? "selected" : ""}>关闭</option></select>
      </div>
      <div class="config-row">
        <label>界面字号</label>
        <input type="range" id="cfg-fontscale" min="0.9" max="1.3" step="0.05" value="${escapeHtml(String(s.fontScale ?? 1))}">
        <span id="cfg-fontscale-val" style="color:#ffb8c8;width:40px;">${Math.round((s.fontScale ?? 1) * 100)}%</span>
      </div>
      <div class="config-row"><label>背景音乐</label>
        <select id="cfg-bgm"><option value="true" ${s.bgm ? "selected" : ""}>开启</option><option value="false" ${!s.bgm ? "selected" : ""}>关闭</option></select>
      </div>
      <div class="config-row">
        <label>音效音量</label>
        <input type="range" id="cfg-sfxvolume" min="0" max="1" step="0.1" value="${escapeHtml(String(s.sfxVolume ?? 0.6))}">
        <span id="cfg-sfxvolume-val" style="color:#ffb8c8;width:40px;">${Math.round((s.sfxVolume ?? 0.6) * 100)}%</span>
      </div>
      <div class="config-row">
        <label>背景音乐音量</label>
        <input type="range" id="cfg-bgmvolume" min="0" max="1" step="0.1" value="${escapeHtml(String(s.bgmVolume ?? 0.4))}">
        <span id="cfg-bgmvolume-val" style="color:#ffb8c8;width:40px;">${Math.round((s.bgmVolume ?? 0.4) * 100)}%</span>
      </div>
      <div class="config-row">
        <label style="color:#ff8888;">清空所有存档与图鉴</label>
        <button id="cfg-clear" style="padding:8px 16px;background:rgba(255,80,80,0.4);border:1px solid rgba(255,100,100,0.6);border-radius:8px;color:#fff;cursor:pointer;font-family:inherit;">清空</button>
      </div>
      <div class="config-row config-data-actions">
        <label>数据备份</label>
        <div>
          <button id="cfg-export" type="button">导出 JSON</button>
          <button id="cfg-import" type="button">导入 JSON</button>
          <input id="cfg-import-file" type="file" accept="application/json,.json" hidden>
        </div>
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
    // v3.3.12：减少动效开关
    document.getElementById("cfg-reducemotion").onchange = (e) => {
      Saves.updateSetting("reduceMotion", e.target.value === "true");
      applyUiSettings();
      if (state.currentBg) updateParticles(state.currentBg);
    };
    document.getElementById("cfg-bgm").onchange = (e) => {
      Saves.updateSetting("bgm", e.target.value === "true");
      if (Saves.settings.bgm && state.currentBg) playBgmForScene(state.currentBg);
      else stopBgm();
    };
    const sfxSlider = document.getElementById("cfg-sfxvolume");
    const sfxVal = document.getElementById("cfg-sfxvolume-val");
    sfxSlider.oninput = () => {
      const v = parseFloat(sfxSlider.value);
      sfxVal.textContent = Math.round(v * 100) + "%";
      Saves.updateSetting("sfxVolume", v);
      if (sfxGain) sfxGain.gain.value = v;
    };
    // v3.3.5：背景音乐音量滑杆（此前设置面板只有音效音量，BGM 音量无 UI）
    const bgmSlider = document.getElementById("cfg-bgmvolume");
    const bgmVal = document.getElementById("cfg-bgmvolume-val");
    bgmSlider.oninput = () => {
      const v = parseFloat(bgmSlider.value);
      bgmVal.textContent = Math.round(v * 100) + "%";
      Saves.updateSetting("bgmVolume", v);
      if (bgmGain) bgmGain.gain.value = v;
      // v3.3.15：真实 BGM 直接改音量（淡入过程中目标值也由 fadeBgm 每帧重读）
      if (bgmAudioEl) bgmAudioEl.volume = v;
    };
    // v3.3.12：界面字号缩放滑杆
    const fontSlider = document.getElementById("cfg-fontscale");
    const fontVal = document.getElementById("cfg-fontscale-val");
    fontSlider.oninput = () => {
      const v = parseFloat(fontSlider.value);
      fontVal.textContent = Math.round(v * 100) + "%";
      Saves.updateSetting("fontScale", v);
      applyUiSettings();
    };
    document.getElementById("cfg-export").onclick = () => {
      const blob = new Blob([JSON.stringify(Saves.exportData(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sakura-letters-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      flashHint("备份已导出");
    };
    const importFile = document.getElementById("cfg-import-file");
    document.getElementById("cfg-import").onclick = () => importFile.click();
    importFile.onchange = () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (!Saves.importData(payload)) throw new Error("invalid backup");
          state.playCount = Saves.getFlag("playCount", 0);
          state.loopCount = Saves.getFlag("loopCount", 0);
          updateInboxBadge();
          flashHint("备份已导入");
          renderConfig();
        } catch (e) {
          flashHint("导入失败：备份格式无效或存储不可用");
        } finally {
          importFile.value = "";
        }
      };
      reader.readAsText(file);
    };
    document.getElementById("cfg-clear").onclick = () => {
      if (confirm("确定清空所有存档、图鉴、CG、关键词、合成、记忆和设置吗？此操作不可撤销。")) {
        if (!Saves.clearAll()) {
          flashHint("清空失败：浏览器存储不可用");
          return;
        }
        state.playCount = 0;
        state.visitedNodes = {};
        state.loopCount = 0;
        state.variables = createDefaultVariables();
        flashHint("已清空");
        closeOverlay();
      }
    };
  }

  function renderHistory() {
    const letters = Saves.getLetters();
    const echoes = Object.entries(letters)
      .filter(([id]) => String(id).startsWith("echo:"))
      .map(([id, rec]) => ({ id, answers: rec.answers || rec, ts: rec.ts }));
    const tabs = `<div style="display:flex;gap:8px;margin-bottom:12px;">
      <button data-tab="dialog" style="flex:1;padding:8px;background:${historyTab === "dialog" ? "rgba(180,80,120,0.7)" : "rgba(255,255,255,0.08)"};border:1px solid rgba(255,200,220,0.3);border-radius:8px;color:#ffd8e4;cursor:pointer;font-family:inherit;">对话</button>
      <button data-tab="echo" style="flex:1;padding:8px;background:${historyTab === "echo" ? "rgba(180,80,120,0.7)" : "rgba(255,255,255,0.08)"};border:1px solid rgba(255,200,220,0.3);border-radius:8px;color:#ffd8e4;cursor:pointer;font-family:inherit;">回响${echoes.length ? ` (${echoes.length})` : ""}</button>
    </div>`;

    if (historyTab === "echo") {
      if (!echoes.length) {
        el.overlayBody.innerHTML = tabs + '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px;">还没有留下选择——你的每一次回答，都会在这里留下回响</div>';
      } else {
        el.overlayBody.innerHTML = tabs + echoes.slice().sort((a, b) => b.ts - a.ts).map((l) => {
          const nodeId = String(l.id).slice(5);
          const node = SCRIPT[nodeId];
          const where = node ? (node.text || "").slice(0, 24) + "…" : nodeId;
          // v3.4.4：自由回信（answers.content）与选择回响（answers.text）都入列
          const what = (l.answers && (l.answers.text || l.answers.content)) || JSON.stringify(l.answers || "");
          return `<div class="history-entry">
            <div class="h-speaker">你的选择 · ${escapeHtml(where)}</div>
            <div class="h-text">${escapeHtml(what)}</div>
          </div>`;
        }).join("");
      }
      el.overlayBody.querySelectorAll("button[data-tab]").forEach((b) => {
        b.onclick = () => { historyTab = b.dataset.tab; renderHistory(); };
      });
      return;
    }

    if (!state.history.length) {
      el.overlayBody.innerHTML = tabs + '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px;">暂无历史记录</div>';
    } else {
      el.overlayBody.innerHTML = tabs + state.history.slice().reverse().map((h) =>
        `<div class="history-entry">
          <div class="h-speaker">${escapeHtml(h.speaker)}</div>
          <div class="h-text">${escapeHtml(h.text)}</div>
        </div>`
      ).join("");
    }
    el.overlayBody.querySelectorAll("button[data-tab]").forEach((b) => {
      b.onclick = () => { historyTab = b.dataset.tab; renderHistory(); };
    });
  }

  function renderStats() {
    const totalNodes = Object.keys(SCRIPT).length;
    const visited = Object.keys(state.visitedNodes).length;
    const endingsGot = ENDINGS.filter((e) => Saves.isEndingUnlocked(e.id)).length;
    const cgGot = Saves.getCGs().length;
    const kwGot = Saves.getKeywords().length;
    const composedGot = Saves.getComposed().length;
    const memGot = Saves.getMemories().length;
    const totalKw = Object.keys(KEYWORDS).length;
    const totalRecipes = (window.COMPOSE_RECIPES || []).length;
    const playMs = Saves.getStats().playMs + (state.inGame ? Math.max(0, Date.now() - playTickAt) : 0);
    const fmtMs = (ms) => {
      const min = Math.floor(ms / 60000);
      const h = Math.floor(min / 60);
      return h > 0 ? `${h} 时 ${min % 60} 分` : `${min} 分`;
    };
    const rows = [
      ["剧情进度", `${visited} / ${totalNodes}`, totalNodes ? visited / totalNodes : null],
      ["结局收集", `${endingsGot} / ${ENDINGS.length}`, ENDINGS.length ? endingsGot / ENDINGS.length : null],
      ["CG 收集", `${cgGot} / ${CGS.length}`, CGS.length ? cgGot / CGS.length : null],
      ["关键词", `${kwGot} / ${totalKw}`, totalKw ? kwGot / totalKw : null],
      ["合成回忆", `${composedGot} / ${totalRecipes}`, totalRecipes ? composedGot / totalRecipes : null],
      ["记忆片段", `${memGot} 条`, null],
      ["游玩周目", `第 ${state.playCount || 1} 周目`, null],
      ["累计时长", fmtMs(playMs), null],
    ];
    el.overlayBody.innerHTML = rows.map(([label, val, pct]) => `
      <div style="margin-bottom:12px;padding:14px 18px;background:linear-gradient(135deg, rgba(80,40,100,0.22), rgba(40,30,60,0.35));border:1px solid rgba(255,200,220,0.25);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:14px;color:#ffd8e4;letter-spacing:3px;">${label}</span>
          <span style="font-size:14px;color:#ffb8c8;">${val}</span>
        </div>
        ${pct === null ? "" : `<div style="height:8px;margin-top:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${Math.round(pct * 100)}%;background:linear-gradient(90deg,#ffb8c8,#c8a8e0);border-radius:4px;"></div>
        </div>`}
      </div>`).join("");
  }

  function renderGallery() {
    // 收集进度（v3.3.1）：已解锁结局 / 总结局，让玩家看到收集缺口
    const unlockedCount = ENDINGS.filter((e) => Saves.isEndingUnlocked(e.id)).length;
    const progressBar = `<div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg, rgba(80,40,100,0.22), rgba(40,30,60,0.35));border:1px solid rgba(255,200,220,0.25);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <span style="font-size:14px;color:#ffd8e4;letter-spacing:3px;">✦ 结局收集</span>
        <span style="font-size:13px;color:#ffb8c8;">${unlockedCount} / ${ENDINGS.length}</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${Math.round((unlockedCount / ENDINGS.length) * 100)}%;background:linear-gradient(90deg,#ffb8c8,#c8a8e0);border-radius:4px;"></div>
      </div>
    </div>`;
    el.overlayBody.innerHTML = progressBar + `<div class="gallery-grid">` + ENDINGS.map((e) => {
      const unlocked = Saves.isEndingUnlocked(e.id);
      return `<div class="gallery-card ${unlocked ? "unlocked" : "locked"}">
        <div class="g-type">${e.type} · ${e.heroine}</div>
        <div class="g-title">${unlocked ? e.title : "？？？？"}</div>
        <div class="g-desc">${unlocked ? e.desc : "尚未解锁"}</div>
        ${unlocked && e.note ? `<div style="margin-top:6px;font-size:11px;line-height:1.6;color:rgba(255,216,228,0.55);">${escapeHtml(e.note)}</div>` : ""}
      </div>`;
    }).join("") + "</div>";
  }

  function renderAbout() {
    el.overlayBody.innerHTML = `
      <div style="text-align:center;padding:30px 10px;line-height:2;">
        <h2 style="font-size:36px;letter-spacing:8px;background:linear-gradient(180deg,#ffe8f0,#ffb8c8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;">樱时信笺</h2>
        <p style="color:rgba(255,200,220,0.6);letter-spacing:4px;margin-bottom:20px;">Sakura · Letters</p>
        <p style="color:#e8e0d0;">v${GAME_VERSION} · Demo</p>
        <details style="margin-top:10px;text-align:left;max-width:420px;margin-left:auto;margin-right:auto;">
          <summary style="cursor:pointer;color:rgba(255,200,220,0.6);font-size:12px;letter-spacing:2px;">版本更新</summary>
          <div style="margin-top:8px;font-size:11.5px;line-height:1.9;color:rgba(255,240,244,0.75);">
            ${(GAME_CHANGELOG || []).map((c) => `<div><span style="color:#ffd88a;">v${c.ver}</span> — ${escapeHtml(c.note)}</div>`).join("")}
          </div>
        </details>
        <p style="color:rgba(255,255,255,0.6);margin-top:20px;">在樱花开落的季节，写下属于你的回信。</p>
        <p style="color:rgba(255,255,255,0.4);margin-top:30px;font-size:13px;">视觉小说 / 校园青春<br>3 位女主 + 学姐线 · 12 个结局 + 1 篇后日谈<br>多种互动玩法 · CG 图鉴 · 关键词收集<br>★ 时间循环 · 关键词合成 · 真实书写信件 · 视角切换<br>★ 环境线索探索 · 收件箱 · 朋友圈动态 · 梦境碎片 · 涂鸦系统 · 性格画像<br>多周目彩蛋 · 流程图 · BGM<br>建议在桌面浏览器全屏体验</p>
        <p style="margin-top:26px;">
          <a href="mailto:hqlak47@gmail.com?subject=%E3%80%8A%E6%A8%B1%E6%97%B6%E4%BF%A1%E7%AE%80%E3%80%8B%E5%8F%8D%E9%A6%88"
             style="display:inline-block;padding:8px 22px;border:1px solid rgba(255,200,220,0.4);border-radius:20px;
                    color:#ffd8e4;text-decoration:none;font-size:13px;letter-spacing:2px;background:rgba(180,80,120,0.15);">
            ✉ 反馈建议 · 邮件直达
          </a>
        </p>
        ${state.loopCount > 0 ? `<p style="color:#c8a8e0;margin-top:20px;">⟲ 当前处于第 ${state.loopCount} 次循环</p>` : ""}
        ${state.playCount >= 1 ? `<p style="color:#ffd88a;margin-top:6px;">已打破循环 ${state.playCount} 次。彩蛋已开启 ♪</p>` : ""}
        <p style="color:rgba(255,200,220,0.55);margin-top:16px;font-size:12px;">反馈与问题：<a href="https://gitee.com/ibjxk/gayme/issues" target="_blank" rel="noopener" style="color:#f0a8b8;">gitee issues</a>（附标题页右下角的版本号）</p><p style="color:rgba(255,255,255,0.35);margin-top:22px;font-size:12px;line-height:1.9;">
          BGM：Patrick de Arteaga ·
          <a href="https://patrickdearteaga.com" target="_blank" rel="noopener" style="color:#ffb8c8;">patrickdearteaga.com</a>
          （CC BY 4.0）<br>字体：Noto Serif SC（SIL OFL 1.1）
        </p>
      </div>
      ${renderPersonalityCard()}
    `;
  }

  function renderKeywords() {
    const unlocked = Saves.getKeywords();
    const composed = Saves.getComposed();
    const memoryList = Saves.getMemories().slice()
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));   // v3.3.28：按获得时间倒序
    const allAvailable = unlocked.concat(composed); // 合成产物也可作为新合成原料
    const recipes = (window.COMPOSE_RECIPES || []).filter(r => allAvailable.includes(r.a) && allAvailable.includes(r.b));

    // 收集进度（v3.3.1）：关键词 / 合成配方 / 记忆片段
    const kwTotal = Object.keys(KEYWORDS).length;
    const recipeTotal = (window.COMPOSE_RECIPES || []).length;
    const progressBar = `<div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg, rgba(80,40,100,0.22), rgba(40,30,60,0.35));border:1px solid rgba(255,200,220,0.25);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <span style="font-size:14px;color:#ffd8e4;letter-spacing:3px;">✦ 收集进度</span>
        <span style="font-size:13px;color:#ffb8c8;">关键词 ${unlocked.length}/${kwTotal} · 合成 ${composed.length}/${recipeTotal} · 记忆 ${memoryList.length} 段</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${Math.round(((unlocked.length + composed.length) / (kwTotal + recipeTotal)) * 100)}%;background:linear-gradient(90deg,#ffb8c8,#c8a8e0);border-radius:4px;"></div>
      </div>
    </div>`;

    let html = progressBar;

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
          <div class="g-title" style="color:#e8d8f0;">${escapeHtml(m.title || m.id)}</div>
          <div class="g-desc">${escapeHtml(m.text.slice(0, 50))}${m.text.length > 50 ? '…' : ''}</div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // 关键词列表
    html += `<div style="font-size:14px;color:#ffd8e4;letter-spacing:4px;margin-bottom:12px;">✦ 已发现关键词</div><div class="gallery-grid">`;
    const RARITY_LABEL = { normal: "", rare: "稀有", hidden: "隐藏" };
    const RARITY_COLOR = { normal: "rgba(255,255,255,0.35)", rare: "#c8a8e0", hidden: "#ffd88a" };
    html += Object.entries(KEYWORDS).map(([kw, def]) => {
      const desc = typeof def === "string" ? def : def.desc;       // 兼容旧字符串格式
      const rarity = typeof def === "string" ? "normal" : (def.rarity || "normal");
      const isUnlocked = unlocked.includes(kw);
      const tag = RARITY_LABEL[rarity] ? `<span style="font-size:10px;color:${RARITY_COLOR[rarity]};border:1px solid ${RARITY_COLOR[rarity]};border-radius:4px;padding:1px 5px;margin-left:6px;">${RARITY_LABEL[rarity]}</span>` : "";
      return `<div class="gallery-card ${isUnlocked ? "unlocked" : "locked"}">
        <div class="g-type">关键词${tag}</div>
        <div class="g-title">${isUnlocked ? kw : "？？？？"}</div>
        <div class="g-desc">${isUnlocked ? escapeHtml(desc) : "尚未发现"}</div>
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
          // 合成回忆（v2.9.6）：合成产物解锁时写入记忆图鉴，让合成不只是真结局门票
          const memory = window.COMPOSED_MEMORIES?.[result];
          if (memory && !Saves.isMemoryUnlocked(memory.id)) {
            Saves.saveMemory(memory.id, memory.text, memory.title);
            flashHint(`✦ 合成回忆：${memory.title}`);
            playSfx("memory");
          }
          renderKeywords();
        }
      };
    });
  }

  function renderCGGallery() {
    // 收集进度（v3.3.1）：已解锁 CG / 总 CG
    const unlockedCount = CGS.filter((cg) => Saves.isCGUnlocked(cg.id)).length;
    const progressBar = `<div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg, rgba(80,40,100,0.22), rgba(40,30,60,0.35));border:1px solid rgba(255,200,220,0.25);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <span style="font-size:14px;color:#ffd8e4;letter-spacing:3px;">✦ CG 收集</span>
        <span style="font-size:13px;color:#ffb8c8;">${unlockedCount} / ${CGS.length}</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${Math.round((unlockedCount / CGS.length) * 100)}%;background:linear-gradient(90deg,#ffb8c8,#c8a8e0);border-radius:4px;"></div>
      </div>
    </div>`;
    el.overlayBody.innerHTML = progressBar + `<div class="cg-grid">` + CGS.map((cg) => {
      const unlocked = Saves.isCGUnlocked(cg.id);
      return `<div class="cg-card ${unlocked ? "unlocked" : "locked"}"${unlocked ? ` data-cg="${cg.id}"` : ""}>
        ${unlocked ? cgArt(cg) : `<div class="cg-locked-placeholder"><div>？？？</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">${cg.heroine}</div></div>`}
        <div class="cg-info">
          <div class="cg-title">${unlocked ? cg.title : "未解锁"}</div>
          <div class="cg-heroine">${cg.heroine}</div>
        </div>
      </div>`;
    }).join("") + "</div>";
    // v3.3.11：点击已解锁 CG 打开大图查看器
    el.overlayBody.querySelectorAll("[data-cg]").forEach((card) => {
      card.style.cursor = "pointer";
      card.onclick = () => { closeOverlay(); openCgViewer(card.dataset.cg); };
    });
  }

  function renderFlowchart() {
    const groups = [
      { title: "序章 · 第 1 日", nodes: ["prologue_1", "prologue_8", "prologue_19", "prologue_25", "prologue_32"] },
      { title: "共通线 · 第 2-5 日", nodes: ["common_day2_morning", "day2_choice", "d2_senior_easter", "d2_noon", "common_day3_morning", "d3_choice", "d3_xiazhi_minigame", "d3_noon", "common_day4_morning", "d4_choice", "d4_shiyu_minigame", "d4_sunian_minigame", "d4_noon", "common_day5_morning", "d5_route_check"] },
      { title: "林诗雨线", nodes: ["route_shiyu_1", "sy_9", "sy_minigame", "sy_choice_1", "sy_ending_good", "sy_ending_normal", "sy_ending_bad"] },
      { title: "夏织线", nodes: ["route_xiazhi_1", "xz_9", "xz_minigame", "xz_choice_1", "xz_ending_good", "xz_ending_normal", "xz_ending_bad"] },
      { title: "苏念线", nodes: ["route_sunian_1", "sn_9", "sn_minigame", "sn_choice_1", "sn_ending_good", "sn_ending_normal", "sn_ending_bad"] },
      { title: "学姐线", nodes: ["route_senior_1", "senior_3", "senior_6", "senior_10", "senior_11", "senior_12", "senior_14", "senior_ending"] },
      { title: "真结局", nodes: ["true_end_entry", "true_choice", "true_ending"] },
      { title: "后日谈", nodes: ["afterword_entry", "afterword_postcard", "afterword_reply", "afterword_timeline", "afterword_autumn", "afterword_mailbox_reply", "afterword_mailbox_rules", "afterword_mailbox_triage", "afterword_wall", "afterword_wall_reflection", "afterword_proofread", "afterword_proofread_clean", "afterword_proofread_recheck", "afterword_ending"] },
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

  function renderPersonalityCard() {
    const prof = Saves.getPersonalityProfile();
    const p = prof.dims;
    // v3.3.4：维度中文名统一取自 Saves.personalityLabels（覆盖全部 8 维），
    // 此前仅 4 维映射，careful/patient/calm/creative 会直接显示英文键名
    const labels = Saves.personalityLabels();
    let bars = "";
    for (const dim in p) {
      const v = p[dim];
      const label = labels[dim] ? `${labels[dim][0]}/${labels[dim][1]}` : dim;
      const pct = Math.min(50, Math.abs(v) * 10);
      const left = v >= 0 ? 50 : 50 - pct;
      bars += `<div class="p-bar">
        <span style="width:48px;">${label}</span>
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

    // v3.3.6：限时消息倒计时持久化——首次打开记录时间戳；若离线期间已超时，
    // 打开即判定过期（此前每次打开都从满值倒计时，反复开关可无限续命）
    if (msg.replied === null && !msg.expired && msg.deadline) {
      const openedAt = Saves.markInboxOpened(msg.id);
      if (openedAt && Date.now() - openedAt >= msg.deadline) Saves.markInboxExpired(msg.id);
      msg = Saves.getInbox().find((x) => x.id === msg.id) || msg;
    }

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
      // 限时倒计时（v3.3.6：按首次打开时间推算剩余，反复开关不再重置）
      let remaining = Math.max(0, (msg.deadline || 0) - (Date.now() - (msg.openedAt || Date.now())));
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
          // v3.3.4：inbox 记忆规范为字符串 id（与 free letter 一致）；兼容旧对象格式 { id, text }
          // 修复前错误地取 memory.id（字符串取不到 id → 回退 matched[0].id），导致 "brave" 等英文 id 混入图鉴
          if (matched.length > 0 && matched[0].memory) {
            const memId = typeof matched[0].memory === "string" ? matched[0].memory : matched[0].memory.id;
            if (memId) Saves.saveMemory(memId, v, matched[0].memoryTitle);
          }
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
        if (nowLiked === null) {
          flashHint("操作失败：浏览器存储不可用");
          return;
        }
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

  return {
    renderSaveSlots, renderConfig, renderHistory, renderStats, renderGallery, renderAbout, renderKeywords, renderCGGallery, renderFlowchart, renderPersonalityCard, renderInbox, showInboxReply, renderMoments, showClueTip,
  };
};
