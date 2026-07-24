/* ========================================
   樱时信笺 · 迷你游戏模块 (minigames.js)
   - writing()  写作打字游戏 (15s)
   - running()  跑步节奏游戏 (10s)
   - painting() 画画涂色匹配 (5s)
   全部返回 Promise<number>，resolve 0-100 整数得分
   玻璃磨砂粉色系 · 不依赖外部库
   ======================================== */

(function () {
  "use strict";

  /* ---------- 主题常量 ---------- */
  const THEME = {
    bg:      "rgba(20,18,32,0.86)",
    primary: "#ffb8c8",
    accent:  "#ffd8e4",
    dim:     "rgba(255,216,228,0.55)",
  };

  let styleInjected = false;

  /* ---------- 注入内联样式（仅一次） ---------- */
  function injectStyles() {
    if (styleInjected) return;
    const css = `
.mg-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: ${THEME.bg};
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  display: flex; align-items: center; justify-content: center;
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  color: ${THEME.accent};
  animation: mg-fade 0.3s ease;
}
@keyframes mg-fade { from { opacity: 0; } to { opacity: 1; } }
.mg-stage {
  width: 90%; max-width: 760px; padding: 24px;
  text-align: center; user-select: none;
}
.mg-skip {
  position: absolute; top: 18px; right: 18px;
  padding: 7px 18px; font-size: 13px; letter-spacing: 2px;
  color: ${THEME.accent}; background: rgba(255,184,200,0.12);
  border: 1px solid ${THEME.primary}; border-radius: 18px;
  cursor: pointer; font-family: inherit;
  transition: background .2s, transform .2s;
}
.mg-skip:hover { background: rgba(255,184,200,0.3); transform: translateY(-1px); }
.mg-title {
  font-size: 26px; letter-spacing: 6px;
  color: ${THEME.primary}; margin-bottom: 8px;
  text-shadow: 0 0 12px rgba(255,184,200,0.4);
}
.mg-hint {
  font-size: 13px; letter-spacing: 1px;
  color: ${THEME.dim}; margin-bottom: 22px;
}
.mg-timer {
  display: inline-block; min-width: 70px;
  font-size: 16px; color: ${THEME.accent};
  padding: 4px 14px; margin-bottom: 18px;
  border: 1px solid rgba(255,184,200,0.35);
  border-radius: 14px; background: rgba(255,184,200,0.06);
}
.mg-score {
  font-size: 14px; color: ${THEME.dim}; margin-top: 14px; letter-spacing: 1px;
}

/* —— 写作 —— */
.mg-poem {
  font-size: 34px; letter-spacing: 8px; line-height: 1.6;
  margin: 18px 0 26px; min-height: 1.6em;
}
.mg-poem .done { color: ${THEME.primary}; text-shadow: 0 0 10px rgba(255,184,200,0.5); }
.mg-poem .todo { color: rgba(255,216,228,0.35); }
.mg-poem .err { color: #ff8aa0; animation: mg-shake .3s; }
@keyframes mg-shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
.mg-input {
  width: 80%; max-width: 460px; padding: 12px 18px;
  font-size: 20px; text-align: center; letter-spacing: 4px;
  color: ${THEME.accent}; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,184,200,0.4); border-radius: 14px;
  font-family: inherit; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.mg-input:focus {
  border-color: ${THEME.primary};
  box-shadow: 0 0 16px rgba(255,184,200,0.35);
}

/* —— 跑步 —— */
.mg-arrow {
  font-size: 120px; line-height: 1; color: ${THEME.primary};
  text-shadow: 0 0 24px rgba(255,184,200,0.6);
  transition: transform .1s;
}
.mg-arrow.tap { transform: scale(1.15); }
.mg-arrow.wrong { color: #ff8aa0; animation: mg-shake .25s; }
.mg-combo {
  font-size: 18px; color: ${THEME.accent}; margin-top: 18px; letter-spacing: 2px;
}
.mg-combo b { color: ${THEME.primary}; font-size: 24px; margin: 0 4px; }

/* —— 涂色 —— */
.mg-paint-board {
  display: flex; flex-direction: column; gap: 28px; align-items: center;
}
.mg-paint-row { display: flex; gap: 22px; justify-content: center; }
.mg-target {
  width: 78px; height: 78px; border-radius: 14px;
  border: 2px dashed rgba(255,216,228,0.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: ${THEME.dim}; cursor: pointer;
  transition: border-color .2s, transform .2s;
}
.mg-target.sel { border-color: ${THEME.primary}; transform: scale(1.05); }
.mg-target.matched { border-style: solid; border-color: ${THEME.primary}; }
.mg-target.matched::after { content: "✓"; color: #fff; font-size: 28px; }
.mg-block {
  width: 78px; height: 78px; border-radius: 14px;
  border: 2px solid rgba(255,255,255,0.15); cursor: pointer;
  transition: transform .15s, box-shadow .15s, opacity .2s;
}
.mg-block:hover { transform: translateY(-3px); }
.mg-block.sel { transform: translateY(-6px); box-shadow: 0 6px 20px rgba(255,184,200,0.5); }
.mg-block.used { opacity: 0.25; pointer-events: none; }
.mg-paint-tip { font-size: 13px; color: ${THEME.dim}; letter-spacing: 1px; }
`;
    const style = document.createElement("style");
    style.id = "minigames-style";
    style.textContent = css;
    document.head.appendChild(style);
    styleInjected = true;
  }

  /* ---------- 通用：创建浮层 ---------- */
  function createOverlay(titleText, hintText, onSkip) {
    injectStyles();
    const overlay = document.createElement("div");
    overlay.className = "mg-overlay";

    const skip = document.createElement("button");
    skip.className = "mg-skip";
    skip.textContent = "跳过 ⏎";
    skip.type = "button";
    overlay.appendChild(skip);

    const stage = document.createElement("div");
    stage.className = "mg-stage";
    overlay.appendChild(stage);

    const title = document.createElement("div");
    title.className = "mg-title";
    title.textContent = titleText;
    stage.appendChild(title);

    const hint = document.createElement("div");
    hint.className = "mg-hint";
    hint.textContent = hintText;
    stage.appendChild(hint);

    const timer = document.createElement("div");
    timer.className = "mg-timer";
    stage.appendChild(timer);

    const body = document.createElement("div");
    stage.appendChild(body);

    const scoreLine = document.createElement("div");
    scoreLine.className = "mg-score";
    stage.appendChild(scoreLine);

    document.body.appendChild(overlay);

    let cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      overlay.remove();
    }
    skip.addEventListener("click", () => {
      if (cleaned) return;
      cleanup();
      onSkip();
    });

    return { overlay, stage, body, timer, scoreLine, cleanup };
  }

  /* ---------- 工具：分数限定 0-100 整数 ---------- */
  function clampScore(n) {
    n = Math.round(n);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  }

  /* ---------- 工具：倒计时 ---------- */
  function startTimer(timerEl, totalSec, onTick, onEnd) {
    let remain = totalSec;
    const fmt = (s) => (s < 10 ? "0" + s : "" + s);
    timerEl.textContent = "⏱ " + fmt(remain) + "s";
    const iv = setInterval(() => {
      remain--;
      if (remain < 0) remain = 0;
      timerEl.textContent = "⏱ " + fmt(remain) + "s";
      if (onTick) onTick(remain);
      if (remain <= 0) {
        clearInterval(iv);
        if (onEnd) onEnd();
      }
    }, 1000);
    return () => clearInterval(iv);
  }

  /* ========================================================
     游戏 1：writing 写作打字
     ======================================================== */
  function writing() {
    return new Promise((resolve) => {
      const POEMS = [
        "樱花落尽的春日",
        "月落乌啼霜满天",
        "春风又绿江南岸",
        "落霞与孤鹜齐飞",
        "人在天涯月如钩",
        "一寸相思一寸灰",
        "山有木兮木有枝",
      ];
      const target = POEMS[Math.floor(Math.random() * POEMS.length)];

      let resolved = false;
      const { body, timer, scoreLine, cleanup } = createOverlay(
        "写作 · 诗意",
        "在输入框中打出诗句 · 15 秒内打对越多分越高",
        () => finish(50)
      );

      const poem = document.createElement("div");
      poem.className = "mg-poem";
      body.appendChild(poem);

      const input = document.createElement("input");
      input.className = "mg-input";
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "在此输入…";
      body.appendChild(input);

      let correct = 0;
      let composing = false;

      function render() {
        let html = "";
        for (let i = 0; i < target.length; i++) {
          if (i < correct) html += `<span class="done">${target[i]}</span>`;
          else html += `<span class="todo">${target[i]}</span>`;
        }
        poem.innerHTML = html;
        scoreLine.textContent = `已正确 ${correct} / ${target.length} 字`;
      }
      render();

      function handleInput() {
        const typed = input.value;
        let n = 0;
        for (let i = 0; i < typed.length && i < target.length; i++) {
          if (typed[i] === target[i]) n++;
          else break;
        }
        if (n > correct) {
          correct = n;
          render();
          if (correct >= target.length) finish(100);
        } else if (n < correct) {
          correct = n;
          render();
        }
      }

      input.addEventListener("compositionstart", () => { composing = true; });
      input.addEventListener("compositionend", () => {
        composing = false;
        handleInput();
      });
      input.addEventListener("input", () => {
        if (!composing) handleInput();
      });

      setTimeout(() => input.focus(), 50);

      function finish(score) {
        if (resolved) return;
        resolved = true;
        stopTimer();
        const finalScore = clampScore(score);
        cleanup();
        resolve(finalScore);
      }

      const stopTimer = startTimer(timer, 15, null, () => {
        // 时间到：按正确率给分
        const s = (correct / target.length) * 100;
        finish(s);
      });
    });
  }

  /* ========================================================
     游戏 2：running 跑步节奏
     ======================================================== */
  function running() {
    return new Promise((resolve) => {
      let resolved = false;
      const { body, timer, scoreLine, cleanup } = createOverlay(
        "跑步 · 节奏",
        "按下屏幕显示的方向键 ← / → · 错一次中断 combo",
        () => finish(50)
      );

      const arrow = document.createElement("div");
      arrow.className = "mg-arrow";
      body.appendChild(arrow);

      const comboEl = document.createElement("div");
      comboEl.className = "mg-combo";
      body.appendChild(comboEl);

      let current = null;       // 'ArrowLeft' / 'ArrowRight'
      let count = 0;            // 累计正确次数
      let combo = 0;            // 当前连击
      let maxCombo = 0;

      function render() {
        arrow.textContent = current === "ArrowLeft" ? "←" : "→";
        arrow.classList.remove("wrong");
        arrow.classList.add("tap");
        setTimeout(() => arrow.classList.remove("tap"), 100);
        comboEl.innerHTML = `combo <b>${combo}</b> · 累计 <b>${count}</b> · 最高 <b>${maxCombo}</b>`;
      }

      function nextArrow() {
        current = Math.random() < 0.5 ? "ArrowLeft" : "ArrowRight";
        render();
      }

      function onKey(e) {
        if (resolved) return;
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        if (e.key === current) {
          count++;
          combo++;
          if (combo > maxCombo) maxCombo = combo;
          nextArrow();
        } else {
          combo = 0;
          arrow.classList.add("wrong");
          // 错误后换一张新方向，避免卡死
          setTimeout(() => {
            if (resolved) return;
            nextArrow();
          }, 180);
        }
      }

      document.addEventListener("keydown", onKey);
      nextArrow();

      function finish(score) {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("keydown", onKey);
        stopTimer();
        const finalScore = clampScore(score);
        cleanup();
        resolve(finalScore);
      }

      const stopTimer = startTimer(timer, 10, null, () => {
        // 时间到：count 主导，maxCombo 奖励
        const s = count * 8 + maxCombo * 2;
        finish(s);
      });
    });
  }

  /* ========================================================
     游戏 3：painting 画画涂色匹配
     ======================================================== */
  function painting() {
    return new Promise((resolve) => {
      let resolved = false;
      const { body, timer, scoreLine, cleanup } = createOverlay(
        "涂色 · 匹配",
        "先点下方色块，再点上方目标框 · 颜色一致即匹配",
        () => finish(50)
      );

      const board = document.createElement("div");
      board.className = "mg-paint-board";
      body.appendChild(board);

      const targetRow = document.createElement("div");
      targetRow.className = "mg-paint-row";
      board.appendChild(targetRow);

      const tip = document.createElement("div");
      tip.className = "mg-paint-tip";
      tip.textContent = "↓ 点击色块，再点击对应目标 ↓";
      board.appendChild(tip);

      const blockRow = document.createElement("div");
      blockRow.className = "mg-paint-row";
      board.appendChild(blockRow);

      let matched = 0;          // 累计成功匹配数
      let selectedBlock = null; // 当前选中的色块对象

      // 生成柔和颜色（HSL）
      function randomColor() {
        const h = Math.floor(Math.random() * 360);
        const s = 55 + Math.floor(Math.random() * 25);
        const l = 60 + Math.floor(Math.random() * 15);
        return `hsl(${h}, ${s}%, ${l}%)`;
      }

      function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      function newRound() {
        targetRow.innerHTML = "";
        blockRow.innerHTML = "";
        selectedBlock = null;

        const colors = [randomColor(), randomColor(), randomColor()];
        const targets = colors.map((c) => ({ color: c, matched: false, el: null }));
        const blocks = shuffle(colors.map((c) => ({ color: c, used: false, el: null })));

        // 渲染目标
        targets.forEach((t) => {
          const el = document.createElement("div");
          el.className = "mg-target";
          el.style.background = "rgba(255,255,255,0.04)";
          el.textContent = "目标";
          el.addEventListener("click", () => onTargetClick(t));
          t.el = el;
          targetRow.appendChild(el);
        });

        // 渲染色块
        blocks.forEach((b) => {
          const el = document.createElement("div");
          el.className = "mg-block";
          el.style.background = b.color;
          el.addEventListener("click", () => onBlockClick(b));
          b.el = el;
          blockRow.appendChild(el);
        });
      }

      function onBlockClick(b) {
        if (resolved || b.used) return;
        // 切换选中
        if (selectedBlock) selectedBlock.el.classList.remove("sel");
        selectedBlock = b;
        b.el.classList.add("sel");
      }

      function onTargetClick(t) {
        if (resolved || t.matched || !selectedBlock) return;
        if (t.color === selectedBlock.color) {
          // 匹配成功
          t.matched = true;
          selectedBlock.used = true;
          matched++;
          t.el.classList.add("matched");
          t.el.textContent = "";
          t.el.style.background = t.color;
          selectedBlock.el.classList.add("used");
          selectedBlock.el.classList.remove("sel");
          selectedBlock = null;
          scoreLine.textContent = `已匹配 ${matched} 组`;

          // 全部匹配 → 下一轮
          if ([...targetRow.children].every((e) => e.classList.contains("matched"))) {
            setTimeout(() => {
              if (!resolved) newRound();
            }, 200);
          }
        } else {
          // 匹配失败：取消选中
          selectedBlock.el.classList.remove("sel");
          selectedBlock = null;
        }
      }

      newRound();

      function finish(score) {
        if (resolved) return;
        resolved = true;
        stopTimer();
        const finalScore = clampScore(score);
        cleanup();
        resolve(finalScore);
      }

      const stopTimer = startTimer(timer, 5, null, () => {
        // 时间到：每组 15 分，上限 100
        const s = matched * 15;
        finish(s);
      });
    });
  }

  /* ---------- 导出 ---------- */
  window.Minigames = { writing, running, painting };
})();
