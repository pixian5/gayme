/* ========================================
   樱时信笺 · 游戏引擎 (engine.js) v2
   新增：日程UI / 心条 / 关键词 / 信件 / CG图鉴
        / 流程图 / 回忆 / BGM / 多周目 / 迷你游戏
   v2.7.9：接入玩法框架基座 GameKit（js/gamekit.js），
           后日谈 5 个玩法迁至 js/games/afterword.js
   v2.8.0：身心感知 8 个玩法迁至 js/games/senses.js；
           已迁移玩法统一经 window.GameKit.run(type, config, nodeId) 触发
   v2.8.1：内容纵深——沈屿家庭线铺垫与三人旧交回忆（节点数据见 js/script.js）
   v2.8.2：长链分章呼吸点与学姐中段线索（节点数据见 js/script.js）
   v2.8.3：工程瘦身——saves.js 引入 recordStore/unlockListStore 工厂（1918→1208 行）；
           自托管 Noto Serif SC 子集字体（fonts/，约 320KB/字重）
   v2.8.4：玩法模板减量（第 1 批 / 共 6 批）——手作与器物 13 个玩法迁至
           js/games/craft.js（engine.js 16172→14612 行）
   v2.8.5：通用玩法分发——gotoNode 以 GameKit.types() 循环统一分发已注册玩法，
           删除 23 个逐类型手写分支（triage/wall/proofread 特殊分支保留）
   v2.8.6：玩法模板减量（第 2 批 / 共 6 批）——自然天象 13 个玩法迁至
           js/games/nature.js（astronomy/wind/rain/constellation/foggy/kite/orbit/
           firefly/windchime/starchart/eclipse/celestial/vane）
   v2.8.7：玩法模板减量（第 3 批 / 共 6 批）——知觉与心绪 14 个玩法迁至
           js/games/perception.js（tarot/dreamweave/stethoscope/puzzle/perfume/tea/
           dice/decode/rubbing/collect/focus/scentmem/tealeaf/sugar）
   v2.8.8：玩法模板减量（第 4 批 / 共 6 批）——机械与律动 14 个玩法迁至
           js/games/mechanism.js（dial/chime/hourglass/lock/compass/telegraph/balance/
           pendulum/metronome/tuning/abacus/gear/sundial/clepsydra）
   v2.8.9：玩法模板减量（第 5 批 / 共 6 批）——图像与光影 12 个玩法迁至
           js/games/imagery.js（shadow/candle/stamp/astrolabe/sandpaint/kaleido/topo/
           windmill/ripple/bottle/echoloc/lens）
   v2.9.0：修复 v2.8.7 迁移回归——matchTarotCombo / matchDreamweave 辅助函数移至
           perception.js；tarot / dreamweave / compass 三处效果块补入 finish
           （applyAdd 等引擎内部符号在 games 文件不可达，原样遗留会 ReferenceError）
   v2.9.1：玩法模板减量（第 6 批 / 共 6 批，全部完成）——直跳型 10 个玩法迁至
           js/games/direct.js（doodle/collage/photo/rhythm/scent/silenceChoice/touch/
           temperature/handwriting/spectrum）；matchConstellation/matchPuzzle/matchPerfume
           辅助函数同步移入对应 games 文件；engine.js 降为纯引擎（约 3.4k 行）
   v2.9.2：CSS 拆分——玩法浮层样式（v0.6.0 起全部分节）拆至 css/games.css（约 7.3k 行），
           style.css 保留基础与引擎 UI（约 1.2k 行）；加载顺序保持级联不变
   v2.9.3：字体子集治理——tools/collect_font_charset.py（字符集收集）、
           tools/check_font_coverage.py（cmap 覆盖检查）、tools/rebuild_font_subset.sh
           （一键重建，含 WiFi 提示）；当前基线缺 30 字符（13 汉字 + 符号），待重建
   v2.9.4：发布链路——GitHub Actions CI（推送/PR 跑全部测试）+ GitHub Pages 自动部署
           （测试通过后发布仓库根目录，configure-pages 自动开启 Pages，附 .nojekyll）
   v2.9.5：仓库整理——7 份多模型分析文档归档 docs/analysis/；根目录截图与临时产物清理；
           新增「文档索引.md」（逐篇介绍 docs/）；README 全面刷新（进度 / 路线 / 约定 / 工具链）
   v2.9.6：玩法结果影响叙事——d15 旗阵 / d4 拼图 / d5 调香的结果分流到 5 个新叙事节点；
           关键词合成解锁时写入「合成回忆」（6 段，进记忆图鉴，COMPOSED_MEMORIES 数据驱动）
   v2.9.7：音频升级——BGM 重写为三层程序化配乐（和弦垫 / 低音 / 五声随机游走旋律，
           look-ahead 调度器按音频时钟排程）；新增 5 种程序化音效（信件 / 关键词 /
           记忆 / 成功 / 失败），经 window.GameSfx 暴露；设置面板加音效音量滑杆
   v2.9.8：自动存档——推进节点即静默记录最后位置（3 秒节流，pagehide/切后台强制落盘），
           「继续游戏」自动取自动存档与快存槽中更新的一份；刷新 / 关页不再丢进度
   v2.9.9：字体本机优先——font-family 改为 Songti SC / STSong 在前（本机全字库统一，
           不再有缺字回退混排），Noto 子集降级为无宋体平台的按需兜底；移除两条字体
           preload（本机优先后不再常需下载）；待 Noto 源下载后再评估是否切回
   v3.0.0：移动端打磨 v1——viewport-fit=cover + 安全区（顶栏/日程条/心条/对话框）；
           触控目标 ≥40px（顶栏按钮 32→40px，窄屏换行右对齐防溢出）；选项按钮小屏
           86% 宽 / 最小高 48px；全局 touch-action: manipulation 禁双击缩放
   v3.0.1：剧情合理性修补（全量走查 12 项）——学园祭时间锚与三人约定回响；
           学姐身份「信之影子」自洽解释；真结局/后日谈 57 节点补日期（流程图不再第?日）；
           破环引导（true_5 学姐提示合成）；bad 结局日期对齐（13/28）；时段修正；
           文本去重与长链中段句式改写
   v3.1.0：立绘全面重绘——5 张角色 SVG 从「字符画」升级为精细插画
           （渐变发色/发丝/眼睛层次/腮红/轮廓光/服装褶皱，每角色独立配色与表情设计：
            诗雨·眼镜安静 / 夏织·高马尾开朗 / 苏念·淡紫忧郁+耳后画笔 /
            沈屿·碎发平静 / 学姐·闭眼温笑+低马尾），script.js +17KB
   v3.1.1：10 张 CG 同步重绘——场景纵深（窗光/看台/摊位/聚光灯）、人物穿校服、
           学园祭灯笼去表情化加棱线穗子、真结局樱花树冠重建（+17KB）
   v3.1.2：移动端顶栏折叠——窄屏默认只留 8 个高频按钮，低频 5 个（朋友圈/历史/
           关键词/CG/流程图）收进「⋯」展开，不再换行占两行
   （v3.1.2 同步：README 进度/路线刷新至当前状态）
   v3.1.3：部署扩展——自有服务器 oh.sbbz.tech 上线（nginx · HTTPS 8080 · 通配符证书），
           tools/deploy.sh 一键部署（tar over ssh :2424）；与 GitHub Pages 双源并行
   v3.2.0：发布与体验基建——PWA 离线化（manifest + Service Worker 预缓存，bump 工具
           同步缓存版本）；OG 分享卡片（assets/og-cover.jpg + meta）；CI 自动部署
           自有服务器（专用密钥 + deploy-server.yml）；证书续期 reloadcmd 闭环；
           prefers-reduced-motion 减动效（CSS 动画 + 粒子）
   v3.2.1：e2e 收尾——新增 tests/browser/engine.e2e.mjs 浏览器运行时回归并接入 CI
           （e2e.yml）；__game 导出补齐 closeOverlay（与 openOverlay 对称，供测试/调试）
   v3.2.2：多周目内容纵深 + 发行体验（详见 docs）——①P1-1 主线 39 节点新增 loopText
           多周目差异化文本（序章/共通线/循环点/女主线重走，随 loopCount 变化）；
           ②P1-2 合成系统扩展（樱花信补专属回忆 + 新增 4 组双关键词组合，回忆 6→11 段、
           配方 7→11 条）；③P1-3 学姐线形态 B（后日谈插入学姐视角回忆 3 节点，不动结局结构）；
           ④P0-2 符号兜底（btn-more ⋯→☰；check_font_coverage 符号回退区扩展，91 汉字缺字
           待 P0-1 字体重建，需 WiFi 排队）；⑤P2-1 关于页反馈入口（mailto）+ 版本号统一为
           GAME_VERSION 常量（bump 脚本同步，修复 renderAbout 写死 v2.7.8）；⑥P2-2 首屏性能
           （index.html 14 脚本 defer 化；服务器 nginx gzip 已开启覆盖主要类型）；
           ⑦P3 存档审计（107 键无重复无容量风险，README 同步）；⑧e2e 保持 chromium 单浏览器
   v3.2.3：部署链路去 GitHub CI/CD——移除 .github/workflows 全部 4 个 workflow（ci/e2e/
           deploy-pages/deploy-server），GitHub 仓库降级纯备份；服务器改为 root cron 每 3 分钟
           自动拉取部署（/usr/local/bin/sakura-deploy.sh：gitee 主源→github 备源，rsync 到
           /var/www/sakura，版本校验，日志 /var/log/sakura-deploy.log）；本地测试为唯一门槛，
           push 后不阻塞等 CI；新增根目录「经验」文件夹（部署/规范/避坑/内容 4 篇经验）
   v3.2.4：字体子集重建——修正 noto-cjk 源地址（SubsetOTF/SC），补齐 91 个缺失汉字
           （覆盖检查 0 缺失）；字体栈改为本机优先（两处玩法样式去掉硬编码 Noto），
           @font-face 限定 unicode-range，本机有宋体时不再下载 woff2；
           语法测试改为扫描 js 目录全部脚本与 sw.js；README 计数、死链与版本约定修正
   v3.3.0：学姐线形态 A——二周目（loopCount≥1 且解锁 true_unbroken）第 5 日路线出现隐藏
           第 4 选项「⟲ 去旧校舍找学姐」；24 节点专属剧情（3 选择点 + 1 次自由写信 4 分支 +
           4 段记忆 + CG「看见」+ SIDE 结局 senior_shadow，图鉴 13 张）；引擎新增
           requires_ending 选项过滤；free letter 回信记忆统一字符串 id（修 4 组对象格式
           既有 bug，引擎兼容旧数据）；consistency 新增 memory 契约测试（共 35 项）
   v3.3.1：图鉴收集率统计——结局图鉴 / CG 图鉴 / 关键词面板顶部新增收集进度条
           （结局 x/13、CG x/11、关键词/合成/记忆计数）；saveMemory 增加 title 字段，
           记忆卡片展示友好标题（旧存档无 title 时回退 id）；e2e 补收集进度断言
   v3.3.2：分支记忆 id 独立化——7 组分支互斥记忆共用 id（saveMemory 按 id 去重）导致
           后解锁分支的记忆被吞、图鉴永远缺分支记忆；15 处拆分独立 id
           （诗雨·开场·鼓励/安静、回声·敢·承认/否认/沉默、诗雨·题记·丰沛/省略、
           夏织·同步·跟上/乱了、苏念·海报·取景/未取、沉默·回信·承认/沉默、
           苏念·一笔·用力/安静）；consistency 新增 memory id 全局唯一契约（共 36 项）
   v3.3.3：CG 解锁缺口修复 + 引用契约——cg_festival「学园祭之夜」写了但从未有节点
           cg_unlock 引用（玩家永远拿不到），接入后日谈开篇 afterword_entry；
           深度审计全数据引用（结局/CG/关键词/配方/requires_* 无断链，
           requires_memory 修正口径后全部有效）；consistency 新增 CG 解锁点契约与
           requires_memory 契约（共 38 项）
   v3.3.4：记忆/图鉴数据契约再修复——inbox 免费回信记忆取 id 错误（字符串取 .id 得
           undefined 回退成匹配键，写入 "brave" 等英文 id）；inbox 2 组分支互斥记忆
           （诗雨·凌晨 / 夏织·教练）共用 id → 拆分独立；性格画像补齐 8 维度中文映射与
           默认结构（careful/patient/calm/creative 原以英文键名显示）；consistency 唯一性
           契约升级为对象 + 字符串全覆盖，新增 personality 白名单契约（共 39 项）
   v3.3.5：交互 / 无障碍 / 设置面板修复——打字机对白区改用 aria-busy（避免屏幕阅读器逐字
           播报）；修复 settings.sfx 不存在导致音效总开关恒假，改为按音效音量判定；设置面板
           新增「背景音乐音量」滑杆；perspective-layer 补 class（视角浮层不再逃过交互锁/清理）；
           minigame 节点隐藏对话框；删除选项空回执死代码；新增 settings 键白名单契约（共 40 项）
   v3.3.6：inbox 限时消息倒计时持久化（首次打开时间戳，反复开关不再无限重置）；浮层焦点
           陷阱（Tab 不再逃逸到背后顶栏/标题）；快进模式「跳过已读」自动连跳；localhost 也注册
           Service Worker（e2e 可覆盖）；删除 engine.js 中与 js/games 重复的 66 块 node schema
           注释（-904 行，纯体积）；e2e 补 SW/焦点/倒计时断言
   v3.3.7：图鉴记忆标题补全 + 多周目文本扩展——inbox / 自由回信 / 视角三处字符串 memory
           写入补传 title（15 个 memoryTitle），图鉴卡片不再显示 id；d4_night_family×2、
           d10_senior_slip×2、afterword_entry 补 loopText（40→45 节点）；consistency 新增
           memoryTitle 覆盖与 loopText 结构契约（共 42 项）
   v3.3.8：多周目文本继续扩散——三条女主线高信号节点补 loopText（sy_9 / sy_13_good /
           sy_11_bad / xz_7 / xz_9 / xz_14_good / sn_6 / sn_9 / sn_13_good，共 45→54
           节点），均按「加深不反转」原则书写；引擎运行时无逻辑改动
   v3.3.9：多周目文本再扩散——共通线 day2 与后日谈高信号节点补 loopText（d2_library_8 /
           d2_field_5 / d2_art_3 / d2_senior_easter_3 / d2_senior_easter_4 / afterword_three /
           afterword_4 / afterword_stamp / afterword_autumn / afterword_wall，共 54→64 节点）
   v3.3.10：键盘无障碍 + 数据统计——选项/信件按钮支持方向键移动、Enter/Space 确认、数字键
            1-9 快选，并补 role/aria-label/aria-keyshortcuts 与 :focus-visible 焦点环；
            新增「数据统计」浮层（剧情进度/结局/CG/关键词/合成/记忆/周目/累计时长）；
            累计时长写入独立 STATS_KEY（不碰剧情 flags）
   v3.3.11：CG 大图查看器——图鉴中点击已解锁 CG 弹出放大视图（上一张/下一张、Esc/点击空白
            关闭；浮层 class 以 -layer 结尾，纳入交互锁与返回标题清理）
   v3.3.12：设置扩展——新增「减少动效」开关（关粒子 + 停动画过渡，与系统 prefers-reduced-motion
            叠加）与「界面字号」缩放（--ui-scale 应用到对白，0.9–1.3）；均纳入 DEFAULT_SETTINGS
            与设置键白名单契约
   v3.3.13：存档增强 + 新手引导——存档槽支持重命名（name 字段）/ 单槽导出 / 导入（本地 JSON）；
            新档首次进入弹出可跳过的新手引导（tutorialSeen 标记，只出现一次）
   v3.3.14：多周目文本 Phase 2 起步——学姐线 13 个高信号节点补 loopText（senior_2/3/4a/4b/4c/
            5/6/7/8/10/11/14/ending，64→77 节点），按「加深不反转」原则书写；纯数据改动
   v3.3.15：真实 BGM 落地——5 个场景 mood 接入自托管免版权 Ogg 曲目
            （audio/bgm/daily|bright|sad|calm|active.ogg，Patrick de Arteaga，CC BY 4.0）；
            双 audio 元素交叉淡入淡出 1.2 秒，循环播放；自动播放被拦截时等用户手势重试；
            音频缺失/解码失败回退原程序化配乐；SW 预缓存加入 5 首曲目（离线可听）
   ======================================== */

(function () {
  "use strict";

  /* 运行时版本号（renderAbout 等展示用；由 tools/bump_version.py 同步） */
  const GAME_VERSION = "3.3.15";

  /* ---------- DOM 引用 ---------- */
  const el = {
    bgLayer:     document.getElementById("bg-layer"),
    bgOverlay:   document.getElementById("bg-overlay"),
    particles:   document.getElementById("particles"),
    charLayer:   document.getElementById("char-layer"),
    topBar:      document.getElementById("top-bar"),
    dialogBox:   document.getElementById("dialog-box"),
    speaker:     document.getElementById("speaker"),
    dialogText:  document.getElementById("dialog-text"),
    clickHint:   document.getElementById("click-hint"),
    choices:     document.getElementById("choices"),
    titleScreen: document.getElementById("title-screen"),
    overlay:     document.getElementById("overlay"),
    overlayTitle:document.getElementById("overlay-title"),
    overlayBody: document.getElementById("overlay-body"),
    endingScreen:document.getElementById("ending-screen"),
    endingType:  document.getElementById("ending-type"),
    endingTitle: document.getElementById("ending-title"),
    endingText:  document.getElementById("ending-text"),
    dayBar:      document.getElementById("day-bar"),
    heartBar:    document.getElementById("heart-bar"),
    clueLayer:   document.getElementById("clue-layer"),
    inboxBadge:  document.getElementById("inbox-badge"),
    inboxBtn:    document.getElementById("btn-inbox"),
  };

  /* ---------- 游戏状态 ---------- */
  const state = {
    currentNode: null,
    currentBg: null,
    variables: { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } },
    history: [],
    isTyping: false,
    typeTimer: null,
    typingText: "",
    typeOnDone: null,
    autoMode: false,
    autoTimer: null,
    skipMode: false,
    pendingInteraction: false,
    inGame: false,
    playCount: Saves.getFlag("playCount", 0),
    visitedNodes: Saves.getFlag("visitedNodes", {}),
    loopCount: Saves.getFlag("loopCount", 0), // 剧情内循环次数（每次非真结局+1）
    perspectiveActive: false, // 视角切换：当前是否在对方视角
    sessionId: 0,
  };

  const MAX_HISTORY = 200;
  const AFFECTION_MAX = 10;
  const SAVE_NODE_ALIASES = Object.freeze({
    d5_check_xiazhi: "d5_route_check",
    d5_check_sunian: "d5_route_check",
    d5_default_choice: "d5_route_check",
  });

  function normalizeSaveNodeId(nodeId) {
    return SAVE_NODE_ALIASES[nodeId] || nodeId;
  }

  function createDefaultVariables() {
    return { affection: { shiyu: 0, xiazhi: 0, sunian: 0 } };
  }

  /* ============ 工具：深层取值/赋值 ============ */
  function getByPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  }
  function setByPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  function applyAdd(add) {
    if (!add) return;
    for (const key in add) {
      const val = add[key];
      if (typeof val === "object" && !Array.isArray(val)) {
        for (const sub in val) {
          const path = `${key}.${sub}`;
          const cur = getByPath(state.variables, path) || 0;
          setByPath(state.variables, path, cur + val[sub]);
        }
      } else {
        const cur = getByPath(state.variables, key) || 0;
        setByPath(state.variables, key, cur + val);
      }
    }
  }
  function applySet(set) {
    if (!set) return;
    for (const key in set) setByPath(state.variables, key, set[key]);
  }

  function getCharacterMeta(speaker) {
    if (!speaker) return null;
    return CHARACTERS[speaker] || Object.values(CHARACTERS).find((char) => char.name === speaker) || null;
  }

  /* ============ 场景/背景 ============ */
  function hasSceneStyle(bg) {
    const selector = `.scene-${CSS.escape(bg)}`;
    return Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).some((rule) => {
          if (typeof rule.selectorText !== "string") return false;
          return rule.selectorText.split(",").some((item) => item.trim() === selector);
        });
      } catch (e) {
        return false;
      }
    });
  }

  function setScene(bg) {
    if (!bg || bg === state.currentBg) return;
    if (!hasSceneStyle(bg) && bg !== "cherry_full") {
      console.warn("场景样式不存在，使用樱花全景:", bg);
      bg = "cherry_full";
    }
    state.currentBg = bg;
    el.bgLayer.className = "bg-scene scene-" + bg;
    el.bgLayer.classList.add("fade-transition");
    setTimeout(() => el.bgLayer.classList.remove("fade-transition"), 700);
    updateParticles(bg);
    playBgmForScene(bg);
  }

  /* ============ 立绘 ============ */
  function renderCharacters(node) {
    let chars = null;
    if (node.chars) chars = node.chars;
    else if (node.char !== undefined) {
      if (node.char === null) chars = [];
      else chars = [{ id: node.char, pos: "center" }];
    } else return;
    el.charLayer.innerHTML = "";
    chars.forEach((c, idx) => {
      if (!PORTRAITS[c.id]) return;
      const div = document.createElement("div");
      div.className = `char-sprite pos-${c.pos || "center"}`;
      if (c.dim) div.classList.add("dim");
      div.innerHTML = PORTRAITS[c.id];
      el.charLayer.appendChild(div);
      requestAnimationFrame(() => {
        setTimeout(() => div.classList.add("show"), idx * 80);
      });
    });
  }

  /* ============ 打字机 ============ */
  function typewriter(text, onDone) {
    clearTimeout(state.typeTimer);
    state.isTyping = true;
    state.typingText = text;
    state.typeOnDone = onDone || null;
    el.clickHint.style.opacity = "0";
    el.dialogText.innerHTML = "";
    // v3.3.5：无障碍——打字期间置 aria-busy，屏幕阅读器等打完整句再一次性朗读，
    // 避免逐字修改 aria-live 区被逐字播报淹没
    el.dialogText.setAttribute("aria-busy", "true");
    let i = 0;
    const speed = state.skipMode ? 5 : Math.max(5, Saves.settings.textSpeed);
    function tick() {
      if (i >= text.length) {
        completeTyping();
        return;
      }
      el.dialogText.textContent = text.slice(0, i + 1);
      i++;
      state.typeTimer = setTimeout(tick, speed);
    }
    tick();
  }

  function completeTyping() {
    if (!state.isTyping) return;
    clearTimeout(state.typeTimer);
    state.isTyping = false;
    el.dialogText.innerHTML = state.typingText;
    el.dialogText.setAttribute("aria-busy", "false");
    el.clickHint.style.opacity = "1";
    const onDone = state.typeOnDone;
    state.typeOnDone = null;
    if (onDone) onDone();
  }

  function skipTyping() {
    completeTyping();
  }

  /* ============ 历史记录 ============ */
  function pushHistory(speaker, text, nodeId) {
    state.history.push({ speaker, text, nodeId, ts: Date.now() });
    if (state.history.length > MAX_HISTORY) state.history.shift();
  }

  /* ============ 日程UI ============ */
  function updateDayBar(node) {
    if (!node || !node.day) { if (el.dayBar) el.dayBar.style.opacity = "0"; return; }
    if (el.dayBar) {
      const dayLabel = ["", "第 1 日", "第 2 日", "第 3 日", "第 4 日", "第 5 日", "第 6 日", "第 7 日", "第 8 日", "第 9 日"][node.day] || `第 ${node.day} 日`;
      const timeLabel = { morning: "上午", noon: "中午", afternoon: "下午", evening: "傍晚", night: "夜晚" }[node.time] || "";
      el.dayBar.textContent = `${dayLabel} · ${timeLabel}`;
      el.dayBar.style.opacity = "1";
      // 循环徽章：显示当前循环次数
      if (state.loopCount > 0) el.dayBar.dataset.loop = state.loopCount;
      else delete el.dayBar.dataset.loop;
    }
  }

  /* ============ 好感度心条 ============ */
  function updateHeartBar() {
    if (!el.heartBar) return;
    const aff = state.variables.affection;
    const heroines = [
      { id: "shiyu", name: "诗雨", color: "#a8c5e8", val: aff.shiyu || 0 },
      { id: "xiazhi", name: "夏织", color: "#f0b878", val: aff.xiazhi || 0 },
      { id: "sunian", name: "苏念", color: "#c8a8e0", val: aff.sunian || 0 },
    ];
    el.heartBar.innerHTML = heroines.map(h => {
      const pct = Math.min(100, (h.val / AFFECTION_MAX) * 100);
      const hearts = Math.min(5, Math.floor(h.val / 2));
      return `<div class="heart-row" title="${h.name}: ${h.val}">
        <span class="heart-name" style="color:${h.color}">${h.name}</span>
        <div class="heart-track"><div class="heart-fill" style="width:${pct}%;background:${h.color}"></div></div>
        <span class="heart-hearts">${"❤".repeat(hearts)}${"♡".repeat(5 - hearts)}</span>
      </div>`;
    }).join("");
  }

  /* ============ 推进/跳转 ============ */
  function advance() {
    if (state.pendingInteraction || hasActiveInteractionLayer()) return;
    const node = SCRIPT[state.currentNode];
    if (!node) return;
    if (node.next) gotoNode(node.next);
  }

  function onTextComplete(node) {
    if (node.ending) {
      const sessionId = state.sessionId;
      setTimeout(() => {
        if (state.inGame && state.sessionId === sessionId && SCRIPT[state.currentNode] === node) showEnding(node.ending);
      }, 1000);
      return;
    }
    // v3.3.6：快进模式下的「跳过已读」自动连跳——仅对读过（visited>1）且无互动的纯文本节点，
    // 播完即自动推进；遇到未读节点或选项/信件/小游戏等互动节点会自动停下
    if (state.skipMode) {
      const nodeId = state.currentNode;
      const isPlain = !node.choice && !node.letter && !node.minigame && !node.echo
        && !node.perspective && !node.dream && !node.scentRecall;
      if (isPlain && (state.visitedNodes[nodeId] || 0) > 1 && node.next) {
        clearTimeout(state.autoTimer);
        state.autoTimer = setTimeout(() => {
          if (!state.skipMode) return;
          if (state.pendingInteraction || hasActiveInteractionLayer()) return;
          if (state.currentNode === nodeId && SCRIPT[nodeId] === node) advance();
        }, 80);
        return;
      }
    }
    if (state.autoMode) {
      clearTimeout(state.autoTimer);
      state.autoTimer = setTimeout(() => {
        if (state.pendingInteraction || hasActiveInteractionLayer()) return;
        if (node.next) gotoNode(node.next);
      }, Saves.settings.autoDelay);
    }
  }

  function gotoNode(nodeId, options = {}) {
    const node = SCRIPT[nodeId];
    if (!node) { console.error("节点不存在:", nodeId); return; }
    const restoring = options.restoring === true;
    clearTimeout(state.autoTimer);
    state.currentNode = nodeId;
    state.pendingInteraction = false;

    if (!restoring) {
      // 只有首次进入节点才应用状态变更；读档只负责恢复画面。
      state.visitedNodes[nodeId] = (state.visitedNodes[nodeId] || 0) + 1;
      applyAdd(node.add);
      applySet(node.set);

      if (node.keyword) {
        const keywords = Array.isArray(node.keyword) ? node.keyword : [node.keyword];
        const unlocked = keywords.filter(keyword => Saves.unlockKeyword(keyword));
        if (unlocked.length) { flashHint(`新关键词：${unlocked.join("、")}`); playSfx("keyword"); }
      }
      if (node.cg_unlock) {
        if (Saves.unlockCG(node.cg_unlock)) flashHint(`新 CG：${CGS.find(c => c.id === node.cg_unlock)?.title || ""}`);
      }
      if (node.memory && !Saves.isMemoryUnlocked(node.memory.id)) {
        if (Saves.saveMemory(node.memory.id, node.memory.text, node.memory.title)) {
          flashHint(`✦ 记忆片段：${node.memory.title || node.memory.id}`);
          playSfx("memory");
        }
      }
      if (node.inbox) {
        const list = Array.isArray(node.inbox) ? node.inbox : [node.inbox];
        list.forEach((m) => {
          if (Saves.saveInbox(m)) flashHint(`📩 新消息：${m.from || "未知"}`);
        });
        updateInboxBadge();
      }
      if (node.moment) {
        const list = Array.isArray(node.moment) ? node.moment : [node.moment];
        list.forEach((mid) => {
          if (Saves.addMoment(mid)) flashHint(`🌸 新动态：${mid}`);
        });
      }
      if (node.personality) {
        for (const dim in node.personality) Saves.addPersonality(dim, node.personality[dim]);
      }
      if (node.echoSave) {
        const list = Array.isArray(node.echoSave) ? node.echoSave : [node.echoSave];
        list.forEach(e => {
          Saves.saveEcho(e.id, e.text, e.ctx);
        });
      }
      deliverTimecapsules(nodeId);

      // 自动存档：推进到新节点即静默记录最后位置（读档恢复 restoring 时不写）
      autoSave();
    }

    // 环境线索属于画面状态，读档时也必须重新渲染。
    renderClues(node);

    if (restoring) {
      updateInboxBadge();
    }

    // 循环文本：根据 loopCount 显示不同文本
    let displayNode = node;
    if (node.loopText && Array.isArray(node.loopText)) {
      const idx = Math.min(state.loopCount, node.loopText.length - 1);
      displayNode = Object.assign({}, node, { text: node.loopText[idx] });
    }

    // 条件节点
    if (node.if) {
      const cond = node.if;
      let value;
      if (cond.var === "_playCount") value = state.playCount;
      else if (cond.var === "_visitedCount") value = Object.keys(state.visitedNodes).length;
      else if (cond.var === "_lastScore") value = state.variables.lastMinigameScore || 0;
      else value = getByPath(state.variables, cond.var);
      let matched = false;
      if (cond.gte !== undefined) matched = (value >= cond.gte);
      else if (cond.eq !== undefined) matched = (value === cond.eq);
      else if (cond.gt !== undefined) matched = (value > cond.gt);
      else if (cond.flag !== undefined) matched = !!Saves.getFlag(cond.flag, false);
      else if (cond.ending !== undefined) matched = Saves.isEndingUnlocked(cond.ending);
      if (matched) gotoNode(cond.then, options);
      else if (node.else) gotoNode(node.else, options);
      return;
    }

    // 信件节点
    if (node.letter) {
      playSfx("letter");
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const speakerMeta = getCharacterMeta(node.speaker);
      const speakerName = node.speaker ? (speakerMeta?.name || node.speaker) : "";
      el.speaker.textContent = speakerName;
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            showLetter(node.letter, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // 选项节点
    if (node.choice) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.add("hidden");
      showChoices(node.choice, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // 迷你游戏节点
    if (node.minigame) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.add("hidden"); // v3.3.5：与 letter/choice 节点一致，隐藏对话框
      runMinigame(node.minigame, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.5.0 梦境节点
    if (node.dream) {
      setScene(node.bg);
      renderCharacters(node);
      enterDream(node.dream, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v0.7.0 气味闪回触发节点
    if (node.scentRecall) {
      setScene(node.bg);
      renderCharacters(node);
      triggerScentRecall(node.scentRecall, nodeId);
      updateDayBar(node);
      updateHeartBar();
      return;
    }













    // v2.7.3 后日谈回信分拣
    if (node.triage) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            window.GameKit?.run("triage", node.triage, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.7.4 后日谈留言墙
    if (node.wall) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            window.GameKit?.run("wall", node.wall, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // v2.7.6 后日谈校刊校对
    if (node.proofread) {
      setScene(node.bg);
      renderCharacters(node);
      el.dialogBox.classList.remove("hidden");
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            window.GameKit?.run("proofread", node.proofread, nodeId);
          }
        }, 400);
      });
      updateDayBar(node);
      updateHeartBar();
      return;
    }

    // 通用玩法分发：所有经 GameKit 注册的已迁移玩法（js/games/*.js）在此统一触发。
    // 带打字机前置的特殊玩法（triage / wall / proofread）已在上方各自分支处理；
    // 尚未迁移的玩法仍走上方各自的 if (node.xxx) 分支——它们的类型不在注册表里，不会被此循环命中。
    if (window.GameKit) {
      for (const type of window.GameKit.types()) {
        if (node[type]) {
          setScene(node.bg);
          renderCharacters(node);
          window.GameKit.run(type, node[type], nodeId);
          updateDayBar(node);
          updateHeartBar();
          return;
        }
      }
    }

    // 普通节点/结局节点
    setScene(node.bg);
    renderCharacters(node);

    const speakerMeta = getCharacterMeta(node.speaker);
    const speakerName = node.speaker ? (speakerMeta?.name || node.speaker) : "";
    el.speaker.textContent = speakerName;
    el.speaker.style.background = speakerName
      ? `linear-gradient(135deg, ${speakerMeta?.color || "#d87090"}, ${speakerMeta?.accent || "#b8608a"})`
      : "rgba(40,40,60,0.7)";
    el.dialogBox.classList.remove("hidden");

    // 视角切换支持：节点定义了 perspective 时显示切换按钮
    renderPerspectiveButton(node);

    // v0.6.0 回声触发：节点定义 echo 时，在文本完成后弹出回声
    if (node.echo) {
      const sessionId = state.sessionId;
      state.pendingInteraction = true;
      typewriter(displayNode.text || "", () => {
        onTextComplete(node);
        setTimeout(() => {
          if (state.inGame && state.sessionId === sessionId && state.currentNode === nodeId) {
            state.pendingInteraction = false;
            triggerEcho(node.echo, nodeId);
          }
        }, 600);
      });
    } else {
      typewriter(displayNode.text || "", () => onTextComplete(node));
    }

    if (speakerName && displayNode.text) pushHistory(speakerName, displayNode.text, nodeId);
    else if (displayNode.text) pushHistory("旁白", displayNode.text, nodeId);

    updateDayBar(node);
    updateHeartBar();
    updateLoopBadge();
  }

  /* ============ 视角切换 ============ */
  let perspectiveBtn = null;
  function renderPerspectiveButton(node) {
    if (perspectiveBtn) { perspectiveBtn.remove(); perspectiveBtn = null; }
    if (!node.perspective) return;
    if (!Saves.isMemoryUnlocked(node.perspective.memory) && node.perspective.requiresMemory !== false) return;
    perspectiveBtn = document.createElement("button");
    perspectiveBtn.id = "perspective-btn";
    perspectiveBtn.innerHTML = "👁";
    perspectiveBtn.style.cssText = "position:absolute;right:14px;bottom:160px;width:44px;height:44px;border-radius:50%;background:rgba(20,18,32,0.8);border:1px solid rgba(255,200,220,0.5);color:#ffd8e4;font-size:18px;cursor:pointer;z-index:20;transition:transform 0.2s;backdrop-filter:blur(6px);";
    perspectiveBtn.title = "切换视角";
    perspectiveBtn.onmouseenter = () => perspectiveBtn.style.transform = "scale(1.1)";
    perspectiveBtn.onmouseleave = () => perspectiveBtn.style.transform = "scale(1)";
    perspectiveBtn.onclick = () => showPerspective(node.perspective);
    document.getElementById("game").appendChild(perspectiveBtn);
  }

  function showPerspective(p) {
    let layer = document.getElementById("perspective-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "perspective-layer";
      // v3.3.5：补 class（以 -layer 结尾），使 hasActiveInteractionLayer 能识别——此前
      // 视角浮层开着时按空格/回车会误推进剧情、返回标题的通用清理也覆盖不到它
      layer.className = "perspective-layer";
      layer.style.cssText = "position:absolute;inset:0;background:rgba(10,5,20,0.85);backdrop-filter:blur(8px);z-index:30;display:flex;align-items:center;justify-content:center;padding:40px;";
      layer.onclick = (e) => { if (e.target === layer) layer.remove(); };
      document.getElementById("game").appendChild(layer);
    }
    layer.innerHTML = "";
    const card = document.createElement("div");
    card.style.cssText = "max-width:580px;width:100%;padding:36px 40px;background:linear-gradient(135deg, rgba(40,20,55,0.95), rgba(60,30,75,0.95));border:1px solid rgba(255,200,220,0.3);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,0.6);";
    const tag = document.createElement("div");
    tag.style.cssText = "font-size:12px;letter-spacing:6px;color:rgba(255,200,220,0.5);margin-bottom:14px;text-align:center;";
    tag.textContent = "❝ 内心独白 ❞";
    const who = document.createElement("div");
    who.style.cssText = "font-size:16px;color:#ffd8e4;letter-spacing:4px;text-align:center;margin-bottom:24px;";
    who.textContent = p.who || "——";
    const text = document.createElement("div");
    text.style.cssText = "font-size:16px;line-height:2.1;color:rgba(255,240,248,0.9);letter-spacing:1px;text-indent:2em;";
    text.textContent = p.text;
    const close = document.createElement("button");
    close.textContent = "合上";
    close.style.cssText = "margin:28px auto 0;display:block;padding:10px 28px;background:rgba(180,80,120,0.4);border:1px solid rgba(255,200,220,0.5);border-radius:8px;color:#ffd8e4;font-family:inherit;font-size:14px;letter-spacing:3px;cursor:pointer;";
    close.onclick = () => layer.remove();
    card.appendChild(tag); card.appendChild(who); card.appendChild(text); card.appendChild(close);
    layer.appendChild(card);
    if (p.memory && !Saves.isMemoryUnlocked(p.memory)) {
      Saves.saveMemory(p.memory, p.text, p.memoryTitle);
      flashHint(`✦ 解锁视角记忆`);
    }
  }

  /* ============ 循环徽章 ============ */
  function updateLoopBadge() {
    if (!el.dayBar) return;
    if (state.loopCount > 0) {
      el.dayBar.dataset.loop = state.loopCount;
    }
  }

  /* ============ 选项 ============ */
  function showChoices(choice, currentNodeId) {
    el.choices.innerHTML = "";
    el.choices.classList.remove("hidden");

    const prompt = document.createElement("div");
    prompt.style.cssText = "position:absolute;top:18%;left:50%;transform:translateX(-50%);font-size:20px;letter-spacing:3px;color:#ffd8e4;text-shadow:0 2px 8px rgba(0,0,0,0.8);";
    prompt.textContent = choice.prompt || "请选择";
    el.choices.appendChild(prompt);

    // 循环解锁的额外选项
    let options = choice.options.slice();
    if (choice.loopChoice && Array.isArray(choice.loopChoice)) {
      choice.loopChoice.forEach((extra) => {
        if (state.loopCount >= (extra.minLoop || 1)) options.push(extra);
      });
    }

    options.forEach((opt) => {
      // 多周目解锁隐藏选项
      if (opt.requires && !opt.requires()) return;
      // 合成关键词解锁的隐藏选项
      if (opt.requires_compose && !Saves.isComposed(opt.requires_compose)) return;
      // 记忆解锁的隐藏选项
      if (opt.requires_memory && !Saves.isMemoryUnlocked(opt.requires_memory)) return;
      // 结局解锁的隐藏选项
      if (opt.requires_ending && !Saves.isEndingUnlocked(opt.requires_ending)) return;
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      if (opt.composed) btn.classList.add("composed-choice");
      // 二周目彩蛋
      if (state.playCount >= 1 && opt.easter && state.visitedNodes[opt.next] > 0) {
        btn.textContent = opt.text + " ♪";
      } else {
        btn.textContent = opt.text;
      }
      btn.onclick = () => {
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        applyAdd(opt.add);
        applySet(opt.set);
        // v3.3.5：删除此处空的「信件回执存储」块（无实现的死代码，无任何读取方）；
        // 剧情里 choice 的 value 字段暂保留，后续若要做选择回响再统一接入
        gotoNode(opt.next);
      };
      el.choices.appendChild(btn);
    });
    // v3.3.10：键盘无障碍——给选项容器补语义，并把焦点落到首个可选项
    // （方向键在选项间移动、Enter/Space 确认、数字键快选由全局 keydown 处理）
    el.choices.setAttribute("role", "group");
    el.choices.setAttribute("aria-label", choice.prompt || "请选择");
    Array.from(el.choices.querySelectorAll("button")).forEach((b, i) => {
      if (i < 9 && !b.disabled) b.setAttribute("aria-keyshortcuts", String(i + 1));
    });
    requestAnimationFrame(() => {
      const first = Array.from(el.choices.querySelectorAll("button"))
        .find((b) => !b.disabled && b.offsetParent !== null);
      if (first) first.focus();
    });
  }

  /* ============ 信件系统 ============ */
  function showLetter(letter, currentNodeId) {
    el.choices.innerHTML = "";
    el.choices.classList.remove("hidden");
    const prompt = document.createElement("div");
    prompt.style.cssText = "position:absolute;top:14%;left:50%;transform:translateX(-50%);font-size:22px;letter-spacing:4px;color:#ffd8e4;text-shadow:0 2px 8px rgba(0,0,0,0.8);max-width:80%;text-align:center;";
    prompt.textContent = letter.prompt || "请选择";
    el.choices.appendChild(prompt);

    const subPrompt = document.createElement("div");
    subPrompt.style.cssText = "position:absolute;top:20%;left:50%;transform:translateX(-50%);font-size:14px;color:rgba(255,200,220,0.6);letter-spacing:2px;";
    subPrompt.textContent = "—— 回信 ——";
    el.choices.appendChild(subPrompt);

    // 自由书写模式：玩家自己打字写信
    if (letter.type === "free") {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;top:26%;left:50%;transform:translateX(-50%);width:min(560px,90%);display:flex;flex-direction:column;gap:12px;";
      const ta = document.createElement("textarea");
      ta.placeholder = letter.hint || "在此写下你想说的话…";
      ta.style.cssText = "width:100%;height:140px;padding:16px;background:rgba(20,15,30,0.85);border:1px solid rgba(255,200,220,0.3);border-radius:10px;color:#ffe8f0;font-family:inherit;font-size:15px;line-height:1.8;letter-spacing:1px;resize:none;";
      ta.maxLength = 200;
      wrap.appendChild(ta);

      const hint = document.createElement("div");
      hint.style.cssText = "font-size:12px;color:rgba(255,200,220,0.5);text-align:right;letter-spacing:1px;";
      hint.textContent = "0 / 200";
      ta.oninput = () => { hint.textContent = `${ta.value.length} / 200`; };
      wrap.appendChild(hint);

      const sendBtn = document.createElement("button");
      sendBtn.textContent = "✉ 寄出";
      sendBtn.className = "choice-btn";
      sendBtn.style.cssText = "padding:12px 28px;background:linear-gradient(135deg, rgba(180,80,120,0.6), rgba(140,60,160,0.6));border:1px solid rgba(255,200,220,0.5);border-radius:10px;color:#ffd8e4;font-family:inherit;font-size:15px;letter-spacing:4px;cursor:pointer;";
      sendBtn.onclick = () => {
        const content = ta.value.trim();
        if (!content) { flashHint("信件不能为空"); return; }
        // 关键词检测：根据玩家输入的内容匹配关键词，决定回信分支
        const matched = (letter.matchings || []).filter(m => m.keywords.some(kw => content.includes(kw)));
        // 保存信件内容
        Saves.saveLetter(letter.id, { content, matched: matched.map(m => m.id) });
        // 给出回信
        const reply = matched.length > 0 ? matched[0] : (letter.defaultReply || { next: currentNodeId });
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        // 解锁记忆（如果配对中包含）：memory 规范为字符串 id，兼容旧数据对象格式
        if (reply.memory) {
          const memId = typeof reply.memory === "string" ? reply.memory : reply.memory.id;
          if (!Saves.isMemoryUnlocked(memId)) Saves.saveMemory(memId, content, reply.memoryTitle);
        }
        gotoNode(reply.next);
      };
      wrap.appendChild(sendBtn);
      el.choices.appendChild(wrap);
      return;
    }

    // 经典选项模式
    let options = letter.options.slice();
    if (letter.loopChoice && Array.isArray(letter.loopChoice)) {
      letter.loopChoice.forEach((extra) => {
        if (state.loopCount >= (extra.minLoop || 1)) options.push(extra);
      });
    }
    options.forEach((opt) => {
      if (opt.requires && !opt.requires()) return;
      if (opt.requires_compose && !Saves.isComposed(opt.requires_compose)) return;
      if (opt.requires_memory && !Saves.isMemoryUnlocked(opt.requires_memory)) return;
      if (opt.requires_ending && !Saves.isEndingUnlocked(opt.requires_ending)) return;
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.style.background = "linear-gradient(135deg, rgba(60,40,80,0.85), rgba(80,60,100,0.85))";
      btn.textContent = "✉ " + opt.text;
      btn.onclick = () => {
        Saves.saveLetter(letter.id, opt.value);
        el.choices.classList.add("hidden");
        el.choices.innerHTML = "";
        gotoNode(opt.next);
      };
      el.choices.appendChild(btn);
    });
  }

  /* ============ 迷你游戏 ============ */
  async function runMinigame(gameType, currentNodeId) {
    const sessionId = state.sessionId;
    if (!window.Minigames) {
      console.warn("Minigames 模块未加载，跳过");
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
      return;
    }
    let score = 50;
    try {
      if (gameType === "writing") score = await window.Minigames.writing();
      else if (gameType === "running") score = await window.Minigames.running();
      else if (gameType === "painting") score = await window.Minigames.painting();
    } catch (e) {
      console.warn("迷你游戏出错:", e);
    }
    if (!state.inGame || state.sessionId !== sessionId || state.currentNode !== currentNodeId) return;
    state.variables.lastMinigameScore = score;
    const node = SCRIPT[currentNodeId];
    if (!node) return;
    // 按分数加成好感度
    if (node.scoreBonus) {
      const factor = score / 100;
      const scaleAdd = (obj) => {
        const out = {};
        for (const k in obj) {
          if (typeof obj[k] === "object" && !Array.isArray(obj[k])) {
            out[k] = scaleAdd(obj[k]);
          } else {
            out[k] = Math.round(obj[k] * factor);
          }
        }
        return out;
      };
      applyAdd(scaleAdd(node.scoreBonus));
      updateHeartBar();
      const grade = score >= 80 ? "完美" : (score >= 50 ? "不错" : "一般");
      flashHint(`${grade}！得分 ${score}`);
    } else {
      flashHint(`得分 ${score}`);
    }
    // 按分数跳转
    if (node.scoreJump) {
      for (const jump of node.scoreJump) {
        if (score >= jump.min) { gotoNode(jump.next); return; }
      }
    }
    if (node.next) gotoNode(node.next);
  }

  /* ============ 结局 ============ */
  function showEnding(ending) {
    const isNew = Saves.unlockEnding(ending.id);
    state.inGame = false;
    // 循环系统：真结局打破循环，其他结局触发循环重置
    if (ending.id === "true_end") {
      Saves.setFlag("playCount", state.playCount + 1);
      state.playCount += 1;
      // 真结局重置 loopCount
      Saves.setFlag("loopCount", 0);
      state.loopCount = 0;
      flashHint("★ 循环打破 ★");
    } else if (ending.id !== "afterword") {
      // 普通结局：循环+1
      Saves.setFlag("loopCount", state.loopCount + 1);
      state.loopCount += 1;
      flashHint(`⟲ 时间回溯 · 第 ${state.loopCount} 次循环`);
    }
    el.endingType.textContent = ending.type;
    el.endingType.style.color = ending.type.includes("TRUE") ? "#ffd88a" : (ending.type.includes("BAD") ? "#a8a8a8" : "#ffb8c8");
    el.endingTitle.textContent = ending.title;
    el.endingText.textContent = ending.text;

    // 循环提示
    let loopHint = document.getElementById("ending-loop-hint");
    if (!loopHint) {
      loopHint = document.createElement("div");
      loopHint.id = "ending-loop-hint";
      loopHint.style.cssText = "text-align:center;margin-top:18px;font-size:13px;color:rgba(255,200,220,0.5);letter-spacing:4px;";
      el.endingScreen.querySelector(".ending-content").appendChild(loopHint);
    }
    if (ending.id === "true_end") {
      loopHint.textContent = "✦ 你打破了时间的循环 ✦";
      loopHint.style.color = "#ffd88a";
    } else if (ending.id === "afterword") {
      loopHint.textContent = "✦ 后日谈结束 · 故事交还给今天 ✦";
      loopHint.style.color = "#ffd88a";
    } else {
      loopHint.textContent = `⟲ 第 ${state.loopCount} 次循环 · 关键词与记忆将被保留`;
      loopHint.style.color = "rgba(255,200,220,0.5)";
    }

    el.endingScreen.classList.remove("hidden");
    el.topBar.classList.remove("show");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    if (el.dayBar) el.dayBar.style.opacity = "0";
    if (el.heartBar) el.heartBar.style.opacity = "0";
    if (perspectiveBtn) { perspectiveBtn.remove(); perspectiveBtn = null; }
  }

  /* ============ 新游戏 ============ */
  function newGame() {
    state.sessionId += 1;
    removeActiveInteractionLayers();
    playTickAt = Date.now(); // v3.3.10：开始计时本次游玩
    state.variables = createDefaultVariables();
    state.history = [];
    state.currentNode = null;
    state.currentBg = null;
    state.inGame = true;
    state.autoMode = false;
    state.skipMode = false;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "1";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    gotoNode(START_NODE);
    // v3.3.13：新档首次进入时弹出可跳过的操作引导（只出现一次）
    if (!Saves.getFlag("tutorialSeen", false)) {
      Saves.setFlag("tutorialSeen", true);
      showTutorial();
    }
  }

  // v3.3.13：新手引导浮层（点击/空格/回车/Esc 均可关闭）
  function showTutorial() {
    const old = document.getElementById("tutorial-layer");
    if (old) old.remove();
    const layer = document.createElement("div");
    layer.id = "tutorial-layer";
    layer.className = "tutorial-layer"; // 以 -layer 结尾：纳入交互锁与返回标题清理
    layer.tabIndex = -1;
    layer.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-title">欢迎来到樱时信笺</div>
        <ul class="tutorial-list">
          <li><b>推进剧情</b>：点击对话框，或按 <kbd>空格</kbd> / <kbd>回车</kbd></li>
          <li><b>选择 / 回信</b>：方向键移动、<kbd>回车</kbd> 确认，或数字键 <kbd>1-9</kbd></li>
          <li><b>推进辅助</b>：<kbd>S</kbd> 快存、<kbd>A</kbd> 自动播放、快进可跳过已读</li>
          <li><b>随时回看</b>：顶栏可打开 设置 / 存档 / 图鉴 / 统计</li>
        </ul>
        <button class="tutorial-ok">开始故事</button>
      </div>`;
    document.getElementById("game").appendChild(layer);
    const layerClose = () => layer.remove();
    layer.querySelector(".tutorial-ok").onclick = (e) => { e.stopPropagation(); layerClose(); };
    layer.onclick = (e) => { if (e.target === layer) layerClose(); };
    layer.onkeydown = (e) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.stopPropagation(); e.preventDefault(); layerClose();
      }
    };
    layer.focus();
  }

  function startAfterword() {
    if (!isTrueEndUnlocked()) {
      flashHint("完成真正的樱花信结局后才能进入后日谈");
      return;
    }
    state.sessionId += 1;
    removeActiveInteractionLayers();
    state.variables = createDefaultVariables();
    state.history = [];
    state.currentNode = null;
    state.currentBg = null;
    state.inGame = true;
    state.autoMode = false;
    state.skipMode = false;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "0";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    gotoNode("afterword_entry");
  }

  /* ============ 存档快照 ============ */
  function snapshot() {
    const node = SCRIPT[state.currentNode];
    const speakerMeta = getCharacterMeta(node?.speaker);
    const speakerName = node?.speaker ? (speakerMeta?.name || node.speaker) : "";
    return {
      nodeId: state.currentNode,
      variables: JSON.parse(JSON.stringify(state.variables)),
      sceneLabel: SCENE_LABELS[state.currentBg] || "",
      dialogPreview: (speakerName ? `【${speakerName}】` : "（旁白）") + (node?.text || "").slice(0, 30),
      day: node?.day,
      time: node?.time,
      currentBg: state.currentBg,
      history: state.history.slice(-MAX_HISTORY),
      visitedNodes: JSON.parse(JSON.stringify(state.visitedNodes)),
      loopCount: state.loopCount,
      playCount: state.playCount,
    };
  }

  function quickSave() {
    if (!state.inGame) return;
    flashHint(Saves.quickSave(snapshot()) ? "已快存" : "快存失败：浏览器存储不可用");
  }

  /* 自动存档（v2.9.8）：静默记录最后位置，防刷新 / 关页丢失。
     节流 3 秒；读档恢复（restoring）与标题页不写；pagehide / 切后台时强制落盘。 */
  let lastAutoSaveAt = 0;
  // v3.3.10：累计游玩时长——记录上次计时点，落盘时把增量累加到 playTimeMs 标记
  let playTickAt = Date.now();
  function autoSave(force = false) {
    if (!state.inGame) return;
    const now = Date.now();
    if (!force && now - lastAutoSaveAt < 3000) return;
    lastAutoSaveAt = now;
    // 累计时长（写入独立统计键，不碰剧情 flags；上限单次 1 小时，防休眠前跳变）
    Saves.addPlayMs(Math.min(Math.max(0, now - playTickAt), 3600000));
    playTickAt = now;
    Saves.autoSave(snapshot());
  }

  function saveToSlot(slot) {
    if (!state.inGame) { flashHint("当前无法存档"); return; }
    if (Saves.save(slot, snapshot())) {
      renderSaveSlots("save");
      flashHint(`已保存到槽位 ${slot + 1}`);
    } else {
      flashHint("保存失败：浏览器存储不可用");
    }
  }

  function removeActiveInteractionLayers() {
    window.GameLifecycle?.cancelAll();
    if (window.Minigames?.cancelAll) window.Minigames.cancelAll();
    const baseLayers = new Set([el.bgLayer, el.charLayer, el.clueLayer]);
    document.querySelectorAll("#game > [class]").forEach((candidate) => {
      if (baseLayers.has(candidate)) return;
      if (Array.from(candidate.classList).some((name) => name.endsWith("-layer"))) candidate.remove();
    });
    el.choices.classList.add("hidden");
    el.choices.innerHTML = "";
  }

  function restoreSnapshot(data) {
    const nodeId = normalizeSaveNodeId(data?.nodeId);
    if (!data || !SCRIPT[nodeId]) {
      flashHint("存档损坏或剧情节点不存在");
      return false;
    }
    state.sessionId += 1;
    removeActiveInteractionLayers();
    playTickAt = Date.now(); // v3.3.10：读档后重新开始计时
    state.currentNode = nodeId;
    state.variables = data.variables && typeof data.variables === "object"
      ? JSON.parse(JSON.stringify(data.variables)) : createDefaultVariables();
    const affection = state.variables.affection;
    state.variables.affection = affection && typeof affection === "object" ? affection : {};
    for (const id of ["shiyu", "xiazhi", "sunian"]) {
      state.variables.affection[id] = Number.isFinite(state.variables.affection[id])
        ? state.variables.affection[id] : 0;
    }
    state.currentBg = null;
    state.history = Array.isArray(data.history) ? data.history.slice(-MAX_HISTORY) : [];
    state.visitedNodes = data.visitedNodes && typeof data.visitedNodes === "object"
      ? JSON.parse(JSON.stringify(data.visitedNodes)) : {};
    state.loopCount = Number.isFinite(data.loopCount) ? data.loopCount : Saves.getFlag("loopCount", 0);
    state.playCount = Number.isFinite(data.playCount) ? data.playCount : Saves.getFlag("playCount", 0);
    state.inGame = true;
    state.autoMode = false;
    state.skipMode = false;
    el.titleScreen.classList.add("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.remove("hidden");
    el.topBar.classList.add("show");
    if (el.dayBar) el.dayBar.style.opacity = "1";
    if (el.heartBar) el.heartBar.style.opacity = "1";
    closeOverlay();
    gotoNode(nodeId, { restoring: true });
    return true;
  }

  function loadFromSlot(slot) {
    const data = Saves.load(slot);
    if (!data) { flashHint("该槽位为空"); return; }
    restoreSnapshot(data);
  }

  /* ============ 顶部提示 ============ */
  let hintTimer = null;
  function flashHint(text) {
    let hint = document.getElementById("flash-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "flash-hint";
      hint.setAttribute("role", "status");
      hint.setAttribute("aria-live", "polite");
      hint.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:14px 28px;background:rgba(20,18,32,0.9);border:1px solid rgba(255,200,220,0.4);border-radius:12px;color:#ffd8e4;font-size:16px;letter-spacing:2px;z-index:9999;pointer-events:none;transition:opacity 0.3s;";
      document.body.appendChild(hint);
    }
    hint.textContent = text;
    hint.style.opacity = "1";
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.style.opacity = "0"; }, 1200);
  }

  /* ============ 浮层 ============ */
  let overlayMode = null;
  function openOverlay(type) {
    overlayMode = type;
    const titles = {
      save: "存档", load: "读档", config: "设置", history: "历史文本",
      gallery: "结局图鉴", about: "关于", keywords: "关键词", cg: "CG 图鉴",
      flowchart: "流程图", inbox: "收件箱", moments: "朋友圈", stats: "数据统计",
    };
    el.overlayTitle.textContent = titles[type] || type;
    el.overlay.classList.remove("hidden");
    el.overlayBody.focus();
    if (type === "save" || type === "load") renderSaveSlots(type);
    else if (type === "config") renderConfig();
    else if (type === "history") renderHistory();
    else if (type === "gallery") renderGallery();
    else if (type === "about") renderAbout();
    else if (type === "keywords") renderKeywords();
    else if (type === "cg") renderCGGallery();
    else if (type === "flowchart") renderFlowchart();
    else if (type === "inbox") renderInbox();
    else if (type === "moments") renderMoments();
    else if (type === "stats") renderStats();
  }
  function closeOverlay() {
    el.overlay.classList.add("hidden");
    overlayMode = null;
    const active = document.activeElement;
    if (active && active.closest?.("#overlay")) el.topBar.querySelector("button")?.focus();
  }
  // v3.3.6：浮层焦点陷阱——Tab / Shift+Tab 在浮层内循环，焦点不再逃逸到背后的顶栏与标题按钮
  el.overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusables = Array.from(
      el.overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((node) => !node.disabled && node.offsetParent !== null);
    if (!focusables.length) { e.preventDefault(); el.overlayBody.focus(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !el.overlay.contains(active)) { e.preventDefault(); last.focus(); }
    } else if (active === last || !el.overlay.contains(active)) {
      e.preventDefault(); first.focus();
    }
  });

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

  // v3.3.13：从本地 JSON 文件导入到指定槽位
  function importSlotFromFile(slot, mode) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          if (Saves.importSlot(slot, obj)) {
            renderSaveSlots(mode);
            flashHint(`已导入到槽位 ${slot + 1}`);
          } else {
            flashHint("导入失败：文件不是有效的存档");
          }
        } catch (err) {
          flashHint("导入失败：无法解析 JSON");
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
    if (!state.history.length) {
      el.overlayBody.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px;">暂无历史记录</div>';
      return;
    }
    el.overlayBody.innerHTML = state.history.slice().reverse().map((h) =>
      `<div class="history-entry">
        <div class="h-speaker">${escapeHtml(h.speaker)}</div>
        <div class="h-text">${escapeHtml(h.text)}</div>
      </div>`
    ).join("");
  }

  // v3.3.10：数据统计页——汇总剧情进度 / 收集率 / 周目 / 累计时长
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
      </div>`;
    }).join("") + "</div>";
  }

  function renderAbout() {
    el.overlayBody.innerHTML = `
      <div style="text-align:center;padding:30px 10px;line-height:2;">
        <h2 style="font-size:36px;letter-spacing:8px;background:linear-gradient(180deg,#ffe8f0,#ffb8c8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;">樱时信笺</h2>
        <p style="color:rgba(255,200,220,0.6);letter-spacing:4px;margin-bottom:20px;">Sakura · Letters</p>
        <p style="color:#e8e0d0;">v${GAME_VERSION} · Demo</p>
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
        <p style="color:rgba(255,255,255,0.35);margin-top:22px;font-size:12px;line-height:1.9;">
          BGM：Patrick de Arteaga ·
          <a href="https://patrickdearteaga.com" target="_blank" rel="noopener" style="color:#ffb8c8;">patrickdearteaga.com</a>
          （CC BY 4.0）<br>字体：Noto Serif SC（SIL OFL 1.1）
        </p>
      </div>
      ${renderPersonalityCard()}
    `;
  }

  /* ============ 关键词面板（含合成台） ============ */
  function renderKeywords() {
    const unlocked = Saves.getKeywords();
    const composed = Saves.getComposed();
    const memoryList = Saves.getMemories();
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
    html += Object.entries(KEYWORDS).map(([kw, desc]) => {
      const isUnlocked = unlocked.includes(kw);
      return `<div class="gallery-card ${isUnlocked ? "unlocked" : "locked"}">
        <div class="g-type">关键词</div>
        <div class="g-title">${isUnlocked ? kw : "？？？？"}</div>
        <div class="g-desc">${isUnlocked ? desc : "尚未发现"}</div>
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

  /* ============ CG 图鉴 ============ */
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
        ${unlocked ? cg.svg : `<div class="cg-locked-placeholder"><div>？？？</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">${cg.heroine}</div></div>`}
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

  // v3.3.11：CG 大图查看器（放大已解锁 CG，方向键切换、Esc 关闭）
  function openCgViewer(startId) {
    const unlocked = CGS.filter((cg) => Saves.isCGUnlocked(cg.id));
    if (!unlocked.length) return;
    let idx = Math.max(0, unlocked.findIndex((cg) => cg.id === startId));
    const old = document.getElementById("cg-viewer-layer");
    if (old) old.remove();
    const layer = document.createElement("div");
    layer.id = "cg-viewer-layer";
    layer.className = "cg-viewer-layer"; // 以 -layer 结尾：纳入交互锁与返回标题清理
    layer.tabIndex = -1;
    layer.innerHTML = `
      <div class="cg-viewer-inner">
        <div class="cg-viewer-art"></div>
        <div class="cg-viewer-bar">
          <button class="cg-view-btn" data-nav="-1" aria-label="上一张">‹ 上一张</button>
          <span class="cg-viewer-title"></span>
          <button class="cg-view-btn" data-nav="1" aria-label="下一张">下一张 ›</button>
        </div>
        <button class="cg-viewer-close" aria-label="关闭大图">✕</button>
      </div>`;
    document.getElementById("game").appendChild(layer);
    const art = layer.querySelector(".cg-viewer-art");
    const titleEl = layer.querySelector(".cg-viewer-title");
    const show = () => {
      const cg = unlocked[idx];
      art.innerHTML = cg.svg;
      titleEl.textContent = `${cg.title} · ${cg.heroine}（${idx + 1} / ${unlocked.length}）`;
    };
    const nav = (d) => { idx = (idx + d + unlocked.length) % unlocked.length; show(); };
    show();
    layer.querySelectorAll("[data-nav]").forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); nav(parseInt(b.dataset.nav, 10)); };
    });
    layer.querySelector(".cg-viewer-close").onclick = (e) => { e.stopPropagation(); layer.remove(); };
    layer.onclick = (e) => { if (e.target === layer) layer.remove(); };
    layer.onkeydown = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); layer.remove(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); nav(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nav(1); }
    };
    layer.focus();
  }

  /* ============ 流程图 ============ */
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ============================================================
     v0.5.0 新玩法实现
     ============================================================ */

  /* ============ 环境线索 ============ */
  function renderClues(node) {
    if (!el.clueLayer) return;
    el.clueLayer.innerHTML = "";
    if (!node || !node.clues || !Array.isArray(node.clues)) return;
    node.clues.forEach((clue) => {
      const found = Saves.isClueFound(clue.id);
      const spot = document.createElement("div");
      spot.className = "clue-hotspot" + (found ? " found" : "");
      spot.style.left = clue.x + "%";
      spot.style.top = clue.y + "%";
      spot.style.width = (clue.w || 8) + "%";
      spot.style.height = (clue.h || 8) + "%";
      spot.title = found ? "已发现" : "可探索";
      spot.onclick = (e) => {
        e.stopPropagation();
        if (found) return;
        Saves.markClueFound(clue.id);
        spot.classList.add("found");
        if (clue.keyword && Saves.unlockKeyword(clue.keyword)) flashHint(`✦ 线索解锁关键词：${clue.keyword}`);
        if (clue.memory && !Saves.isMemoryUnlocked(clue.memory.id)) {
          Saves.saveMemory(clue.memory.id, clue.memory.text || clue.text, clue.memory.title);
          flashHint(`✦ 记忆片段：${clue.memory.id}`);
        }
        if (clue.personality) {
          for (const dim in clue.personality) Saves.addPersonality(dim, clue.personality[dim]);
        }
        showClueTip(clue, spot);
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

  /* ============ 收件箱 ============ */
  function updateInboxBadge() {
    if (!el.inboxBadge) return;
    const n = Saves.inboxUnreadCount();
    if (n > 0) {
      el.inboxBadge.textContent = n > 9 ? "9+" : n;
      el.inboxBadge.classList.remove("hidden");
      el.inboxBadge.classList.add("pulse");
    } else {
      el.inboxBadge.classList.add("hidden");
      el.inboxBadge.classList.remove("pulse");
    }
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

  /* ============ 朋友圈 ============ */
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

  /* ============ 梦境 ============ */
  function enterDream(dream, currentNodeId) {
    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "dream-layer";
    const title = document.createElement("div");
    title.className = "dream-title";
    title.textContent = dream.title || "❉ 梦 境 ❉";
    layer.appendChild(title);
    const hint = document.createElement("div");
    hint.className = "dream-hint";
    hint.textContent = dream.hint || "点击场景探索 · 收集梦境碎片";
    layer.appendChild(hint);
    document.getElementById("game").appendChild(layer);

    const scenes = dream.scenes || [];
    const positions = [
      { left: "12%", top: "30%" }, { right: "12%", top: "30%" },
      { left: "30%", top: "62%" }, { right: "30%", top: "62%" },
      { left: "50%", top: "15%", transform: "translateX(-50%)" },
      { left: "50%", top: "82%", transform: "translateX(-50%)" },
    ];
    scenes.forEach((sc, idx) => {
      const pos = positions[idx % positions.length];
      const btn = document.createElement("div");
      btn.className = "dream-scene";
      Object.assign(btn.style, pos);
      btn.innerHTML = `<div class="ds-icon">${sc.icon || "✦"}</div><div>${escapeHtml(sc.label || "场景")}</div>`;
      btn.onclick = () => {
        if (btn.classList.contains("visited")) return;
        btn.classList.add("visited");
        // 显示场景对话
        const txt = document.createElement("div");
        txt.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:520px;padding:24px 32px;background:rgba(20,16,28,0.92);border:1px solid rgba(200,168,224,0.5);border-radius:14px;color:#ffd8e4;font-size:15px;line-height:2;letter-spacing:1px;box-shadow:0 8px 30px rgba(0,0,0,0.7);z-index:37;";
        txt.innerHTML = `<div style="color:#c8a8e0;font-size:13px;letter-spacing:3px;margin-bottom:10px;">${escapeHtml(sc.label || "场景")}</div>${escapeHtml(sc.text || "")}`;
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "合上";
        closeBtn.style.cssText = "margin-top:18px;display:block;margin-left:auto;padding:8px 20px;background:rgba(180,80,120,0.4);border:1px solid rgba(255,200,220,0.5);border-radius:8px;color:#ffd8e4;font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer;";
        closeBtn.onclick = (e) => { e.stopPropagation(); txt.remove(); };
        txt.appendChild(closeBtn);
        layer.appendChild(txt);
        // 收集碎片
        if (sc.shard) {
          if (Saves.addDreamShard(sc.shard.id, sc.shard.text)) {
            flashHint(`✦ 梦境碎片：${sc.shard.id}`);
          }
        }
        // 累积性格
        if (sc.personality) {
          for (const dim in sc.personality) Saves.addPersonality(dim, sc.personality[dim]);
        }
      };
      layer.appendChild(btn);
    });

    // 退出按钮
    const exit = document.createElement("button");
    exit.textContent = "✕ 醒来";
    exit.style.cssText = "position:absolute;top:20px;right:20px;padding:8px 18px;background:rgba(60,30,75,0.8);border:1px solid rgba(255,200,220,0.4);border-radius:8px;color:#ffd8e4;font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer;z-index:37;";
    exit.onclick = () => {
      layer.remove();
      const node = SCRIPT[currentNodeId];
      if (node && node.next) gotoNode(node.next);
    };
    layer.appendChild(exit);
  }


  function triggerEcho(echo, currentNodeId) {
    const layer = document.createElement("div");
    layer.className = "echo-layer";
    layer.id = "echo-layer";

    const head = document.createElement("div");
    head.className = "echo-head";
    head.innerHTML = `<span class="echo-icon">❝</span> 回 声 <span class="echo-icon">❞</span>`;
    layer.appendChild(head);

    const quote = document.createElement("div");
    quote.className = "echo-quote";
    quote.textContent = echo.text || "";
    layer.appendChild(quote);

    const ctx = document.createElement("div");
    ctx.className = "echo-ctx";
    ctx.textContent = echo.ctx ? `—— ${echo.ctx}` : "—— 你曾经说过";
    layer.appendChild(ctx);

    // 检查是否已保存为回声
    const saved = Saves.getEcho(echo.id);
    if (saved && saved.acknowledged) {
      const ack = document.createElement("div");
      ack.className = "echo-acknowledged";
      ack.textContent = `（你已选择：${saved.acknowledged === "admit" ? "承认" : saved.acknowledged === "deny" ? "否认" : "沉默"}）`;
      layer.appendChild(ack);
      const close = document.createElement("button");
      close.className = "echo-close";
      close.textContent = "✕ 继续";
      close.onclick = () => { layer.remove(); };
      layer.appendChild(close);
      document.getElementById("game").appendChild(layer);
      return;
    }

    const choices = echo.choices || [];
    const btns = document.createElement("div");
    btns.className = "echo-choices";
    choices.forEach(c => {
      const b = document.createElement("button");
      b.className = "echo-choice";
      b.textContent = c.text;
      b.onclick = () => {
        Saves.acknowledgeEcho(echo.id, c.value);
        if (c.add) { applyAdd(c.add); updateHeartBar(); }
        if (c.personality) for (const dim in c.personality) Saves.addPersonality(dim, c.personality[dim]);
        if (c.memory && !Saves.isMemoryUnlocked(c.memory.id)) {
          Saves.saveMemory(c.memory.id, c.memory.text, c.memory.title);
          flashHint(`✦ 记忆片段：${c.memory.id}`);
        }
        layer.remove();
        if (c.next) gotoNode(c.next);
      };
      btns.appendChild(b);
    });
    layer.appendChild(btns);

    document.getElementById("game").appendChild(layer);
  }


  function triggerScentRecall(recall, currentNodeId) {
    const node = SCRIPT[currentNodeId];
    const hasScent = Saves.isScentCollected(recall.scentId);
    const already = Saves.isScentRecalled(recall.scentId, recall.recallId);

    if (!hasScent) {
      // 未收集过该气味 → 直接跳过
      const jumpTo = recall.skipNext || (node && node.next);
      if (jumpTo) gotoNode(jumpTo);
      return;
    }

    // 已收集且已触发过 → 视为已确认，直接走已确认分支（避免重复弹窗）
    if (already) {
      const ack = recall.acknowledgedNext || (node && node.next);
      if (ack) gotoNode(ack);
      return;
    }

    el.dialogBox.classList.add("hidden");
    const layer = document.createElement("div");
    layer.className = "scent-recall-layer";
    layer.id = "scent-recall-layer";
    layer.innerHTML = `
      <div class="scent-recall-quote">
        <div class="scent-recall-label">✦ 气味闪回</div>
        <div class="scent-recall-text">${recall.text || ""}</div>
        <div class="scent-recall-flashback">${recall.flashback || ""}</div>
      </div>
      <div class="scent-recall-choices"></div>
    `;
    const choicesEl = layer.querySelector(".scent-recall-choices");

    (recall.choices || []).forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "scent-recall-btn";
      btn.textContent = choice.text;
      btn.onclick = () => {
        if (choice.add) { applyAdd(choice.add); updateHeartBar(); }
        if (choice.personality) {
          for (const dim in choice.personality) Saves.addPersonality(dim, choice.personality[dim]);
        }
        if (choice.memory) {
          if (!Saves.isMemoryUnlocked(choice.memory.id)) {
            Saves.saveMemory(choice.memory.id, choice.memory.text, choice.memory.title);
            flashHint(`✦ 新记忆：${choice.memory.title}`);
          }
        }
        Saves.markScentRecalled(recall.scentId, recall.recallId);
        layer.remove();
        const jumpTo = choice.next || (node && node.next);
        if (jumpTo) gotoNode(jumpTo);
      };
      choicesEl.appendChild(btn);
    });

    document.getElementById("game").appendChild(layer);
  }





  // 在指定节点触发时光胶囊投递（读取未投递的胶囊）
  function deliverTimecapsules(nodeId) {
    const caps = Saves.getTimecapsulesForNode(nodeId);
    if (!caps.length) return;
    const layer = document.createElement("div");
    layer.className = "timecapsule-deliver-layer";
    layer.id = "timecapsule-deliver-layer";
    const capsHtml = caps.map((c, i) => `<div class="tc-deliver-item" data-idx="${i}">
      <div class="tc-deliver-label">来自过去的胶囊 #${i + 1}</div>
      <div class="tc-deliver-msg">${(c.message || "").replace(/</g, "&lt;")}</div>
    </div>`).join("");
    layer.innerHTML = `
      <div class="tc-deliver-wrap">
        <div class="tc-deliver-title">——过去的自己寄来了一封信——</div>
        ${capsHtml}
        <button class="tc-deliver-close">读完</button>
      </div>
    `;
    layer.querySelector(".tc-deliver-close").onclick = () => {
      caps.forEach(c => Saves.markTimecapsuleDelivered(c.sourceNodeId));
      layer.remove();
    };
    document.getElementById("game").appendChild(layer);
  }





























































  /* ============ 性格画像浮层（在关于页展示） ============ */
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

  /* ============ 返回标题 ============ */
  function backToTitle() {
    state.sessionId += 1;
    window.GameLifecycle?.cancelAll();
    if (window.Minigames?.cancelAll) window.Minigames.cancelAll();
    clearTimeout(state.autoTimer);
    clearTimeout(state.typeTimer);
    state.autoMode = false;
    state.skipMode = false;
    state.isTyping = false;
    state.typingText = "";
    state.typeOnDone = null;
    state.currentNode = null;
    state.pendingInteraction = false;
    state.inGame = false;
    stopBgm();
    if (perspectiveBtn) { perspectiveBtn.remove(); perspectiveBtn = null; }
    const pLayer = document.getElementById("perspective-layer");
    if (pLayer) pLayer.remove();
    // 清理 v0.5.0 浮层
    const dreamLayer = document.querySelector(".dream-layer");
    if (dreamLayer) dreamLayer.remove();
    const doodleLayer = document.querySelector(".doodle-layer");
    if (doodleLayer) doodleLayer.remove();
    const inboxReply = document.getElementById("inbox-reply-layer");
    if (inboxReply) inboxReply.remove();
    // 清理 v0.6.0 浮层
    const collageLayer = document.querySelector(".collage-layer");
    if (collageLayer) collageLayer.remove();
    const echoLayer = document.getElementById("echo-layer");
    if (echoLayer) echoLayer.remove();
    const photoLayer = document.querySelector(".photo-layer");
    if (photoLayer) photoLayer.remove();
    const rhythmLayer = document.querySelector(".rhythm-layer");
    if (rhythmLayer) rhythmLayer.remove();
    // 清理 v0.7.0 浮层（用 querySelectorAll 防止重复残留）
    document.querySelectorAll(".scent-layer").forEach(e => e.remove());
    document.querySelectorAll(".scent-recall-layer").forEach(e => e.remove());
    document.querySelectorAll(".silence-layer").forEach(e => e.remove());
    document.querySelectorAll(".touch-layer").forEach(e => e.remove());
    document.querySelectorAll(".temperature-layer").forEach(e => e.remove());
    // 清理 v0.8.0 浮层
    document.querySelectorAll(".tarot-layer").forEach(e => e.remove());
    document.querySelectorAll(".dreamweave-layer").forEach(e => e.remove());
    document.querySelectorAll(".handwriting-layer").forEach(e => e.remove());
    document.querySelectorAll(".spectrum-layer").forEach(e => e.remove());
    // 清理 v0.9.0 浮层
    document.querySelectorAll(".constellation-layer").forEach(e => e.remove());
    document.querySelectorAll(".stethoscope-layer").forEach(e => e.remove());
    document.querySelectorAll(".puzzle-layer").forEach(e => e.remove());
    document.querySelectorAll(".perfume-layer").forEach(e => e.remove());
    // 清理 v1.0.0 浮层
    document.querySelectorAll(".breath-layer").forEach(e => e.remove());
    document.querySelectorAll(".timecapsule-layer").forEach(e => e.remove());
    document.querySelectorAll(".timecapsule-deliver-layer").forEach(e => e.remove());
    document.querySelectorAll(".fold-layer").forEach(e => e.remove());
    document.querySelectorAll(".reflection-layer").forEach(e => e.remove());
    // 清理 v1.1.0 浮层
    document.querySelectorAll(".lightdraw-layer").forEach(e => e.remove());
    document.querySelectorAll(".mimic-layer").forEach(e => e.remove());
    document.querySelectorAll(".season-layer").forEach(e => e.remove());
    document.querySelectorAll(".pulse-layer").forEach(e => e.remove());
    document.querySelectorAll(".tea-layer").forEach(e => e.remove());
    document.querySelectorAll(".astronomy-layer").forEach(e => e.remove());
    document.querySelectorAll(".palette-layer").forEach(e => e.remove());
    document.querySelectorAll(".piano-layer").forEach(e => e.remove());
    document.querySelectorAll(".dice-layer").forEach(e => e.remove());
    document.querySelectorAll(".wind-layer").forEach(e => e.remove());
    document.querySelectorAll(".decode-layer").forEach(e => e.remove());
    document.querySelectorAll(".rain-layer").forEach(e => e.remove());
    document.querySelectorAll(".rubbing-layer").forEach(e => e.remove());
    document.querySelectorAll(".collect-layer").forEach(e => e.remove());
    document.querySelectorAll(".focus-layer").forEach(e => e.remove());
    document.querySelectorAll(".scentmem-layer").forEach(e => e.remove());
    document.querySelectorAll(".tealeaf-layer").forEach(e => e.remove());
    document.querySelectorAll(".shadow-layer").forEach(e => e.remove());
    document.querySelectorAll(".candle-layer").forEach(e => e.remove());
    document.querySelectorAll(".dial-layer").forEach(e => e.remove());
    document.querySelectorAll(".foggy-layer").forEach(e => e.remove());
    document.querySelectorAll(".sugar-layer").forEach(e => e.remove());
    document.querySelectorAll(".chime-layer").forEach(e => e.remove());
    document.querySelectorAll(".hourglass-layer").forEach(e => e.remove());
    document.querySelectorAll(".kite-layer").forEach(e => e.remove());
    document.querySelectorAll(".lock-layer").forEach(e => e.remove());
    document.querySelectorAll(".origami-layer").forEach(e => e.remove());
    document.querySelectorAll(".orbit-layer").forEach(e => e.remove());
    document.querySelectorAll(".firefly-layer").forEach(e => e.remove());
    document.querySelectorAll(".windchime-layer").forEach(e => e.remove());
    document.querySelectorAll(".bottle-layer").forEach(e => e.remove());
    document.querySelectorAll(".echoloc-layer").forEach(e => e.remove());
    document.querySelectorAll(".compass-layer").forEach(e => e.remove());
    document.querySelectorAll(".telegraph-layer").forEach(e => e.remove());
    document.querySelectorAll(".balance-layer").forEach(e => e.remove());
    document.querySelectorAll(".pendulum-layer").forEach(e => e.remove());
    document.querySelectorAll(".metronome-layer").forEach(e => e.remove());
    document.querySelectorAll(".starchart-layer").forEach(e => e.remove());
    document.querySelectorAll(".lens-layer").forEach(e => e.remove());
    document.querySelectorAll(".tuning-layer").forEach(e => e.remove());
    document.querySelectorAll(".eclipse-layer").forEach(e => e.remove());
    document.querySelectorAll(".stamp-layer").forEach(e => e.remove());
    document.querySelectorAll(".astrolabe-layer").forEach(e => e.remove());
    document.querySelectorAll(".sandpaint-layer").forEach(e => e.remove());
    document.querySelectorAll(".kaleido-layer").forEach(e => e.remove());
    document.querySelectorAll(".abacus-layer").forEach(e => e.remove());
    document.querySelectorAll(".gear-layer").forEach(e => e.remove());
    document.querySelectorAll(".topo-layer").forEach(e => e.remove());
    document.querySelectorAll(".sundial-layer").forEach(e => e.remove());
    document.querySelectorAll(".dye-layer").forEach(e => e.remove());
    document.querySelectorAll(".windmill-layer").forEach(e => e.remove());
    document.querySelectorAll(".weave-layer").forEach(e => e.remove());
    document.querySelectorAll(".mirror-layer").forEach(e => e.remove());
    document.querySelectorAll(".lantern-layer").forEach(e => e.remove());
    document.querySelectorAll(".ripple-layer").forEach(e => e.remove());
    document.querySelectorAll(".mosaic-layer").forEach(e => e.remove());
    document.querySelectorAll(".stele-layer").forEach(e => e.remove());
    document.querySelectorAll(".celestial-layer").forEach(e => e.remove());
    document.querySelectorAll(".drum-layer").forEach(e => e.remove());
    document.querySelectorAll(".vane-layer").forEach(e => e.remove());
    document.querySelectorAll(".clepsydra-layer").forEach(e => e.remove());
    document.querySelectorAll(".jigsaw-layer").forEach(e => e.remove());
    document.querySelectorAll(".chess-layer").forEach(e => e.remove());
    document.querySelectorAll(".flag-layer").forEach(e => e.remove());
    document.querySelectorAll(".postcard-layer").forEach(e => e.remove());
    document.querySelectorAll(".timeline-layer").forEach(e => e.remove());
    document.querySelectorAll(".triage-layer").forEach(e => e.remove());
    document.querySelectorAll(".wall-layer").forEach(e => e.remove());
    document.querySelectorAll(".proofread-layer").forEach(e => e.remove());
    // 恢复温度叠加
    if (el.bgOverlay) el.bgOverlay.style.background = "transparent";
    if (el.clueLayer) el.clueLayer.innerHTML = "";
    el.titleScreen.classList.remove("hidden");
    el.endingScreen.classList.add("hidden");
    el.dialogBox.classList.add("hidden");
    el.choices.classList.add("hidden");
    el.topBar.classList.remove("show");
    el.charLayer.innerHTML = "";
    if (el.dayBar) { el.dayBar.style.opacity = "0"; delete el.dayBar.dataset.loop; }
    if (el.heartBar) el.heartBar.style.opacity = "0";
    setScene("cherry_full");
    updateTrueEndAccess();
    updateAfterwordAccess();
    updateLoopBadge();
    updateInboxBadge();
  }

  function updateTrueEndAccess() {
    const trueBtn = el.titleScreen.querySelector("button[data-action='trueend']");
    if (!trueBtn) return;
    if (hasAllGoodEndings()) {
      trueBtn.classList.remove("hidden");
      trueBtn.style.display = "";
      trueBtn.classList.add("special");
    } else {
      trueBtn.classList.add("hidden");
      trueBtn.style.display = "none";
    }
  }

  function updateAfterwordAccess() {
    const afterwordButton = el.titleScreen.querySelector("button[data-action='afterword']");
    if (!afterwordButton) return;
    const unlocked = isTrueEndUnlocked();
    afterwordButton.classList.toggle("hidden", !unlocked);
    afterwordButton.style.display = unlocked ? "" : "none";
    if (unlocked) afterwordButton.classList.add("special");
  }

  /* ============ 粒子系统 ============ */
  const particleCanvas = el.particles;
  const pctx = particleCanvas.getContext("2d");
  let particles = [];
  let particleAnim = null;
  let particleType = "none";

  function resizeCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function getParticleType(scene) {
    if (!Saves.settings.particles || Saves.settings.reduceMotion) return "none";
    if (scene === "rain") return "rain";
    if (["winter", "ending_bad", "ending_normal"].includes(scene)) return "snow";
    if (["cherry_full", "school_gate", "classroom", "library", "hallway", "art_room", "home_room", "cafeteria", "festival"].includes(scene)) return "sakura";
    return "none";
  }

  function updateParticles(scene) {
    // 减动效：系统「减弱动态效果」或设置项开启时都不生成粒子
    if (Saves.settings.reduceMotion || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { stopParticles(); return; }
    const newType = getParticleType(scene);
    if (newType === particleType) return;
    particleType = newType;
    particles = [];
    if (particleType === "none") { stopParticles(); return; }
    const count = particleType === "rain" ? 100 : 60;
    for (let i = 0; i < count; i++) particles.push(createParticle());
    if (!particleAnim) animateParticles();
  }

  function stopParticles() {
    if (particleAnim) { cancelAnimationFrame(particleAnim); particleAnim = null; }
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  }

  function createParticle() {
    const w = particleCanvas.width, h = particleCanvas.height;
    if (particleType === "sakura") {
      return { x: Math.random()*w, y: Math.random()*h, size: 4+Math.random()*6, speed: 0.4+Math.random()*1.2, sway: Math.random()*2-1, swayPhase: Math.random()*Math.PI*2, rot: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.04, alpha: 0.5+Math.random()*0.4, hue: 340+Math.random()*20 };
    } else if (particleType === "rain") {
      return { x: Math.random()*w, y: Math.random()*h, len: 12+Math.random()*14, speed: 8+Math.random()*6, alpha: 0.3+Math.random()*0.4 };
    } else if (particleType === "snow") {
      return { x: Math.random()*w, y: Math.random()*h, size: 2+Math.random()*3, speed: 0.6+Math.random()*1.2, sway: Math.random()*2-1, swayPhase: Math.random()*Math.PI*2, alpha: 0.5+Math.random()*0.5 };
    }
  }

  function animateParticles() {
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const w = particleCanvas.width, h = particleCanvas.height;
    particles.forEach((p) => {
      if (particleType === "sakura") {
        p.swayPhase += 0.02; p.x += Math.sin(p.swayPhase)*p.sway*0.8; p.y += p.speed; p.rot += p.rotSpeed;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random()*w; }
        pctx.save(); pctx.translate(p.x, p.y); pctx.rotate(p.rot); pctx.globalAlpha = p.alpha;
        pctx.fillStyle = `hsl(${p.hue}, 80%, 85%)`;
        pctx.beginPath(); pctx.ellipse(0, 0, p.size, p.size*0.55, 0, 0, Math.PI*2); pctx.fill(); pctx.restore();
      } else if (particleType === "rain") {
        p.y += p.speed; p.x -= p.speed*0.2;
        if (p.y > h) { p.y = -20; p.x = Math.random()*w; }
        pctx.strokeStyle = `rgba(180,200,220,${p.alpha})`; pctx.lineWidth = 1;
        pctx.beginPath(); pctx.moveTo(p.x, p.y); pctx.lineTo(p.x - p.speed*0.2, p.y - p.len); pctx.stroke();
      } else if (particleType === "snow") {
        p.swayPhase += 0.02; p.x += Math.sin(p.swayPhase)*p.sway*0.6; p.y += p.speed;
        if (p.y > h) { p.y = -10; p.x = Math.random()*w; }
        pctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        pctx.beginPath(); pctx.arc(p.x, p.y, p.size, 0, Math.PI*2); pctx.fill();
      }
    });
    if (particleType !== "none") particleAnim = requestAnimationFrame(animateParticles);
  }

  /* ============ BGM 与音效（v3.3.4 真实配乐 + 程序化兜底）============
     场景 mood → audio/bgm/*.ogg（免版权曲目，作者 Patrick de Arteaga，见「关于」）。
     切场景时两个 HTMLAudioElement 交叉淡入淡出（1.2 秒），循环播放。
     自动播放被浏览器拦截时挂起，等下一次用户手势重试；
     本地音频缺失/解码失败时回退到 v2.9.7 的三层程序化配乐
     （和弦垫 + 低音 + 五声音阶随机游走旋律）。
     另提供 5 种程序化音效（信件 / 关键词 / 记忆 / 成功 / 失败），经 window.GameSfx 暴露。 */
  let audioCtx = null;
  let bgmGain = null;
  let sfxGain = null;
  // 真实配乐
  const BGM_TRACKS = {
    default: "audio/bgm/daily.ogg",
    bright: "audio/bgm/bright.ogg",
    sad: "audio/bgm/sad.ogg",
    calm: "audio/bgm/calm.ogg",
    active: "audio/bgm/active.ogg",
  };
  const BGM_FADE_MS = 1200;
  let bgmTracks = null;           // mood → HTMLAudioElement
  let bgmAudioEl = null;          // 当前曲目
  let bgmMood = null;             // 当前 mood
  let bgmFadeRaf = null;          // 交叉淡入淡出动画帧
  let bgmRealUnavailable = false; // 真实音频整体不可用 → 全部走程序化
  let bgmUnlockBound = false;     // 是否已挂起「等用户手势重试」
  // 程序化兜底
  let currentBgm = null;
  let bgmSchedulerTimer = null;
  let bgmStep = 0;
  let bgmNextTime = 0;
  let bgmConfig = null;
  let bgmMelIdx = 2;

  const midiFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* 每个 mood：4 小节和弦进行（MIDI 三和弦）、旋律音阶（MIDI）、
     旋律密度（每八分音符发声概率）、音色与三层音量配比 */
  const BGM_MOODS = {
    default: { bpm: 76, chords: [[48, 55, 52], [45, 52, 48], [41, 48, 45], [43, 50, 47]],
               scale: [60, 62, 64, 67, 69, 72, 74, 76], density: 0.5,
               melodyWave: "sine", padLevel: 0.05, bassLevel: 0.09, melLevel: 0.16 },
    bright:  { bpm: 100, chords: [[55, 59, 62], [60, 64, 67], [55, 59, 62], [50, 57, 54]],
               scale: [67, 69, 71, 74, 76, 79, 81], density: 0.62,
               melodyWave: "triangle", padLevel: 0.045, bassLevel: 0.08, melLevel: 0.14 },
    sad:     { bpm: 66, chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]],
               scale: [57, 60, 62, 64, 67, 69, 72], density: 0.38,
               melodyWave: "sine", padLevel: 0.055, bassLevel: 0.09, melLevel: 0.15 },
    calm:    { bpm: 60, chords: [[43, 50, 47], [41, 48, 45], [45, 52, 48], [43, 50, 47]],
               scale: [60, 62, 64, 67, 69, 72], density: 0.32,
               melodyWave: "sine", padLevel: 0.05, bassLevel: 0.08, melLevel: 0.14 },
    active:  { bpm: 116, chords: [[52, 56, 59], [55, 59, 62], [57, 61, 64], [55, 59, 62]],
               scale: [64, 67, 69, 71, 74, 76, 79], density: 0.7,
               melodyWave: "triangle", padLevel: 0.04, bassLevel: 0.09, melLevel: 0.15 },
  };

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = audioCtx.createGain();
        bgmGain.gain.value = Saves.settings.bgmVolume;
        bgmGain.connect(audioCtx.destination);
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = Saves.settings.sfxVolume ?? 0.6;
        sfxGain.connect(audioCtx.destination);
      } catch (e) { console.warn("AudioContext 不可用", e); }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function bgmVolume() {
    return Math.max(0, Math.min(1, Saves.settings.bgmVolume ?? 0.4));
  }

  /* 真实配乐：首次使用时创建并缓存 5 个 audio 元素 */
  function ensureBgmTracks() {
    if (bgmTracks) return bgmTracks;
    bgmTracks = {};
    Object.entries(BGM_TRACKS).forEach(([mood, src]) => {
      const audio = new Audio();
      audio.src = src;
      audio.loop = true;
      audio.preload = "none";
      audio.volume = 0;
      bgmTracks[mood] = audio;
    });
    return bgmTracks;
  }

  function playBgmForScene(scene) {
    if (!Saves.settings.bgm) { stopBgm(); return; }
    let mood = "default";
    if (["ending_good", "cherry_full", "festival"].includes(scene)) mood = "bright";
    else if (["ending_bad", "rain", "winter"].includes(scene)) mood = "sad";
    else if (["art_room", "library", "home_room", "night"].includes(scene)) mood = "calm";
    else if (["field", "sportsmeet", "summer"].includes(scene)) mood = "active";
    if (bgmMood === mood && (bgmAudioEl ? !bgmAudioEl.paused : !!currentBgm)) return;
    stopProgramBgm();
    bgmMood = mood;
    if (startRealBgm(mood)) return;
    // 兜底：先停掉可能仍在播的旧真实曲目，再启用程序化配乐
    if (bgmAudioEl) { bgmAudioEl.pause(); bgmAudioEl.currentTime = 0; bgmAudioEl.volume = 0; bgmAudioEl = null; }
    playMelody(mood);
  }

  /* 启动真实曲目；返回 false 表示该 mood 不可用，调用方回退程序化配乐 */
  function startRealBgm(mood) {
    if (bgmRealUnavailable) return false;
    const track = ensureBgmTracks()[mood];
    if (!track) return false;
    const prev = bgmAudioEl;
    bgmAudioEl = track;
    track.currentTime = 0;
    track.volume = 0;
    track.onerror = () => {
      // 音频缺失或解码失败：切换全局兜底
      bgmRealUnavailable = true;
      if (bgmMood === mood) {
        stopBgm();
        bgmMood = mood;
        playMelody(mood);
      }
    };
    const played = track.play();
    if (played && played.catch) {
      played.catch((err) => {
        // 自动播放策略拦截：等下一次用户手势再重试
        if (err && err.name === "NotAllowedError") bindBgmUnlock();
        else if (track.onerror) track.onerror();
      });
    }
    fadeBgm(prev, track);
    return true;
  }

  /* 双曲交叉淡入淡出：新曲 0→目标音量，旧曲目标→0 后暂停
     目标音量每帧从设置读取，滑杆拖动时无需重启动画也能跟上 */
  function fadeBgm(prev, next) {
    if (bgmFadeRaf) { cancelAnimationFrame(bgmFadeRaf); bgmFadeRaf = null; }
    const startVol = prev ? prev.volume : 0;
    const start = performance.now();
    const tick = (now) => {
      // rAF 时间戳可能早于 performance.now()，k 需夹在 [0,1]，否则音量会变成负值
      const k = Math.max(0, Math.min(1, (now - start) / BGM_FADE_MS));
      const target = bgmVolume();
      next.volume = target * k;
      if (prev && prev !== next) prev.volume = startVol * (1 - k);
      if (k < 1) { bgmFadeRaf = requestAnimationFrame(tick); return; }
      bgmFadeRaf = null;
      if (prev && prev !== next) { prev.pause(); prev.currentTime = 0; prev.volume = 0; }
    };
    bgmFadeRaf = requestAnimationFrame(tick);
  }

  function bindBgmUnlock() {
    if (bgmUnlockBound) return;
    bgmUnlockBound = true;
    const retry = () => {
      bgmUnlockBound = false;
      document.removeEventListener("pointerdown", retry);
      document.removeEventListener("keydown", retry);
      if (Saves.settings.bgm && state.currentBg) playBgmForScene(state.currentBg);
    };
    document.addEventListener("pointerdown", retry);
    document.addEventListener("keydown", retry);
  }

  function stopBgm() {
    if (bgmFadeRaf) { cancelAnimationFrame(bgmFadeRaf); bgmFadeRaf = null; }
    if (bgmAudioEl) {
      bgmAudioEl.pause();
      bgmAudioEl.currentTime = 0;
      bgmAudioEl.volume = 0;
      bgmAudioEl = null;
    }
    bgmMood = null;
    stopProgramBgm();
  }

  function stopProgramBgm() {
    if (bgmSchedulerTimer) { clearInterval(bgmSchedulerTimer); bgmSchedulerTimer = null; }
    currentBgm = null;
    bgmConfig = null;
  }

  /* 程序化兜底配乐（真实音频不可用时使用） */
  function playMelody(mood) {
    ensureAudio();
    if (!audioCtx) return;
    stopProgramBgm();
    currentBgm = mood;
    bgmConfig = BGM_MOODS[mood] || BGM_MOODS.default;
    bgmStep = 0;
    bgmMelIdx = Math.min(2, bgmConfig.scale.length - 1);
    bgmNextTime = audioCtx.currentTime + 0.1;
    const stepDur = 60 / bgmConfig.bpm / 4;   // 十六分音符
    bgmSchedulerTimer = setInterval(() => {
      if (!audioCtx || currentBgm !== mood) return;
      while (bgmNextTime < audioCtx.currentTime + 0.5) {
        scheduleBgmStep(bgmConfig, bgmStep, bgmNextTime, stepDur);
        bgmStep++;
        bgmNextTime += stepDur;
      }
    }, 150);
  }

  /* 排程一个十六分音符步：和弦垫 / 低音 / 旋律 */
  function scheduleBgmStep(cfg, step, when, stepDur) {
    const inBar = step % 16;
    const chord = cfg.chords[Math.floor(step / 16) % cfg.chords.length];
    // 和弦垫：每小节第一拍铺满整小节（慢起慢落）
    if (inBar === 0) {
      chord.forEach((n) => {
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = midiFreq(n);
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(cfg.padLevel, when + stepDur * 6);
        env.gain.linearRampToValueAtTime(0, when + stepDur * 16);
        osc.connect(env); env.connect(bgmGain);
        osc.start(when); osc.stop(when + stepDur * 16 + 0.05);
      });
    }
    // 低音：每半小节一个根音（低八度）
    if (inBar === 0 || inBar === 8) {
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = midiFreq(chord[0] - 12);
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(cfg.bassLevel, when + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 7);
      osc.connect(env); env.connect(bgmGain);
      osc.start(when); osc.stop(when + stepDur * 8);
    }
    // 旋律：八分音符网格上的随机游走（80% 级进 / 20% 跳进，偶发长音）
    if (inBar % 2 === 0 && Math.random() < cfg.density) {
      const leap = Math.random() < 0.8 ? 1 : 2;
      bgmMelIdx = Math.max(0, Math.min(cfg.scale.length - 1,
        bgmMelIdx + (Math.random() < 0.5 ? leap : -leap)));
      const dur = stepDur * (Math.random() < 0.3 ? 6 : 3);
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = cfg.melodyWave;
      osc.frequency.value = midiFreq(cfg.scale[bgmMelIdx]);
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(cfg.melLevel, when + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, when + dur);
      osc.connect(env); env.connect(bgmGain);
      osc.start(when); osc.stop(when + dur + 0.05);
    }
  }

  /* 程序化音效：kind → (时间偏移, 频率) 序列，sine 短包络 */
  function playSfx(kind) {
    ensureAudio();
    // v3.3.5：此前判断的 settings.sfx 字段根本不存在（恒假、形同虚设）；
    // 按音效音量判定，拉到 0 即静音
    if (!audioCtx || (Saves.settings.sfxVolume ?? 0.6) <= 0) return;
    const t = audioCtx.currentTime;
    const seq = {
      letter:  [[0, 880], [0.09, 1174.66]],
      keyword: [[0, 987.77], [0.08, 1318.51]],
      memory:  [[0, 1318.51], [0.07, 1567.98], [0.14, 2093.0]],
      success: [[0, 523.25], [0.09, 659.25], [0.18, 783.99], [0.27, 1046.5]],
      fail:    [[0, 392.0], [0.12, 311.13]],
    }[kind];
    if (!seq) return;
    seq.forEach(([dt, freq]) => {
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, t + dt);
      env.gain.linearRampToValueAtTime(0.22, t + dt + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.5);
      osc.connect(env); env.connect(sfxGain);
      osc.start(t + dt); osc.stop(t + dt + 0.55);
    });
  }
  window.GameSfx = { play: playSfx };

  /* ============ 事件绑定 ============ */
  el.dialogBox.addEventListener("click", () => {
    if (state.isTyping) skipTyping();
    else if (state.inGame) advance();
  });

  // 移动端折叠菜单入口（v3.1.2）：切换低频按钮显隐
  document.getElementById("btn-more").onclick = () => {
    el.topBar.classList.toggle("expanded");
  };

  el.topBar.querySelectorAll("button[data-menu]").forEach((btn) => {
    btn.onclick = () => {
      const m = btn.dataset.menu;
      if (m === "title") {
        if (confirm("返回标题画面？未保存的进度会丢失。")) backToTitle();
      } else {
        openOverlay(m);
      }
    };
  });

  document.getElementById("btn-auto").onclick = function () {
    state.autoMode = !state.autoMode;
    this.classList.toggle("active", state.autoMode);
    flashHint(state.autoMode ? "自动模式 开" : "自动模式 关");
    if (state.autoMode) {
      ensureAudio();
      const node = SCRIPT[state.currentNode];
      if (node && !state.isTyping) onTextComplete(node);
    } else clearTimeout(state.autoTimer);
  };

  document.getElementById("btn-skip").onclick = function () {
    state.skipMode = !state.skipMode;
    this.classList.toggle("active", state.skipMode);
    flashHint(state.skipMode ? "快进 开" : "快进 关");
  };

  document.querySelector(".overlay-close").onclick = closeOverlay;
  el.overlay.addEventListener("click", (e) => { if (e.target === el.overlay) closeOverlay(); });

  // 标题画面按钮
  el.titleScreen.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = () => {
      ensureAudio();
      const a = btn.dataset.action;
      if (a === "new") newGame();
      else if (a === "continue") {
        // 自动存档与快存槽都算「继续」的候选，取时间戳更新的一份
        const auto = Saves.getAutoSnapshot();
        const quick = Saves.getQuickSave();
        const candidates = [];
        if (quick) candidates.push({ data: quick, at: quick.timestamp || 0 });
        if (auto) candidates.push({ data: auto.snapshot, at: auto.savedAt || 0 });
        candidates.sort((a, b) => b.at - a.at);
        if (candidates.length) restoreSnapshot(candidates[0].data);
        else flashHint("没有可继续的存档");
      } else if (a === "load") openOverlay("load");
      else if (a === "gallery") openOverlay("gallery");
      else if (a === "keywords") openOverlay("keywords");
      else if (a === "cg") openOverlay("cg");
      else if (a === "flowchart") openOverlay("flowchart");
      else if (a === "stats") openOverlay("stats");
      else if (a === "trueend") {
        if (!hasAllGoodEndings()) {
          flashHint("先完成三位女主的 GOOD 结局");
          return;
        }
        state.inGame = true;
        el.titleScreen.classList.add("hidden");
        el.dialogBox.classList.remove("hidden");
        el.topBar.classList.add("show");
        if (el.dayBar) el.dayBar.style.opacity = "1";
        if (el.heartBar) el.heartBar.style.opacity = "1";
        gotoNode("true_end_entry");
      }
      else if (a === "afterword") startAfterword();
      else if (a === "about") openOverlay("about");
    };
  });

  // 结局画面按钮
  el.endingScreen.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = () => {
      const a = btn.dataset.action;
      if (a === "title") backToTitle();
      else if (a === "gallery") openOverlay("gallery");
    };
  });

  function isEditableTarget(target) {
    return target instanceof Element && !!target.closest(
      "input, textarea, select, button, [contenteditable='true'], [role='textbox']"
    );
  }

  function hasActiveInteractionLayer() {
    if (!el.choices.classList.contains("hidden")) return true;
    if (document.querySelector(".mg-overlay")) return true;
    const baseLayers = new Set([el.bgLayer, el.charLayer, el.clueLayer]);
    return Array.from(document.querySelectorAll("#game > [class]")).some((candidate) => {
      return !baseLayers.has(candidate)
        && Array.from(candidate.classList).some((name) => name.endsWith("-layer"));
    });
  }

  // 快捷键
  document.addEventListener("keydown", (e) => {
    if (el.overlay.classList.contains("hidden") === false) {
      if (e.key === "Escape") closeOverlay();
      return;
    }
    if (!state.inGame || e.repeat || isEditableTarget(e.target)) return;
    if (e.key === "Escape") {
      backToTitle();
      return;
    }
    // v3.3.10：选项 / 信件按钮的键盘操作——方向键在按钮间移动、Enter/Space 确认、
    // 数字键 1-9 快选（仅在选项层可见、且未在输入框内时生效）
    if (!el.choices.classList.contains("hidden")) {
      const btns = Array.from(el.choices.querySelectorAll("button"))
        .filter((b) => !b.disabled && b.offsetParent !== null);
      if (btns.length) {
        const at = btns.indexOf(document.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          btns[(at + 1 + btns.length) % btns.length].focus();
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          btns[(at - 1 + btns.length) % btns.length].focus();
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (btns.includes(document.activeElement) ? document.activeElement : btns[0]).click();
          return;
        }
        if (/^[1-9]$/.test(e.key)) {
          const pick = btns[parseInt(e.key, 10) - 1];
          if (pick) { e.preventDefault(); pick.click(); }
          return;
        }
      }
    }
    if (hasActiveInteractionLayer()) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (state.isTyping) skipTyping();
      else advance();
    } else if (e.key === "s" || e.key === "S") quickSave();
    else if (e.key === "a" || e.key === "A") document.getElementById("btn-auto").click();
  });

  // 自动存档兜底：关页 / 切后台时把未落盘的进度强制写入（绕过节流）
  window.addEventListener("pagehide", () => autoSave(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") autoSave(true);
  });

  /* ============ 启动 ============ */
  // v2.7.9 起：向玩法框架基座注入宿主能力（剧情跳转 / 数值加成 / 心条刷新 / 顶部提示 / 转义）
  window.GameKit?.attachHost({ gotoNode, applyAdd, updateHeartBar, flashHint, escapeHtml });

  // v3.3.12：把界面类设置应用到文档（字号缩放 --ui-scale、减少动效 class）
  function applyUiSettings() {
    const s = Saves.settings || {};
    document.documentElement.style.setProperty("--ui-scale", String(s.fontScale ?? 1));
    document.body.classList.toggle("reduce-motion", !!s.reduceMotion);
  }

  function init() {
    applyUiSettings();
    setScene("cherry_full");
    updateParticles("cherry_full");
    updateTrueEndAccess();
    updateAfterwordAccess();
    updateInboxBadge();
  }
  init();

  // 暴露调试接口
  window.__game = { state, gotoNode, newGame, backToTitle, openOverlay, closeOverlay };
})();
