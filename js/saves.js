/* ========================================
   樱时信笺 · 存档系统 (saves.js) v2
   - 多槽位存档 / 读档 (localStorage)
   - 结局图鉴 / CG 图鉴 / 关键词收集 / 信件
   - 全局设置 / 多周目标记 / 流程图缓存
   ======================================== */

const SAVE_SLOTS = 9;
const STORAGE_KEY   = "sakura_letters_saves_v2";
const SETTINGS_KEY  = "sakura_letters_settings_v2";
const ENDINGS_KEY   = "sakura_letters_endings_v2";
const KEYWORDS_KEY  = "sakura_letters_keywords_v2";
const CG_KEY        = "sakura_letters_cg_v2";
const LETTERS_KEY   = "sakura_letters_letters_v2";
const FLAGS_KEY     = "sakura_letters_flags_v2";
const COMPOSED_KEY  = "sakura_letters_composed_v2";
const MEMORIES_KEY  = "sakura_letters_memories_v2";
/* v0.5.0 新玩法存储 */
const CLUES_KEY        = "sakura_letters_clues_v2";       // 环境线索
const INBOX_KEY        = "sakura_letters_inbox_v2";       // 角色主动来信
const MOMENTS_KEY      = "sakura_letters_moments_v2";     // 朋友圈动态
const MOMENT_LIKES_KEY = "sakura_letters_moment_likes_v2";
const MOMENT_COMMENTS_KEY = "sakura_letters_moment_comments_v2";
const DREAM_KEY        = "sakura_letters_dream_v2";       // 梦境碎片
const PERSONALITY_KEY  = "sakura_letters_personality_v2"; // 性格画像
const DOODLE_KEY       = "sakura_letters_doodle_v2";     // 涂鸦记录
/* v0.6.0 新玩法存储 */
const COLLAGE_KEY      = "sakura_letters_collage_v2";    // 拼贴诗
const ECHO_KEY         = "sakura_letters_echo_v2";       // 回声台词
const PHOTO_KEY        = "sakura_letters_photo_v2";      // 摄影构图
const RHYTHM_KEY       = "sakura_letters_rhythm_v2";     // 节奏敲击

/* v0.7.0 新玩法存储 */
const SCENT_KEY        = "sakura_letters_scent_v2";       // 气味收集
const SILENCE_KEY      = "sakura_letters_silence_v2";     // 沉默选择记录
const TOUCH_KEY        = "sakura_letters_touch_v2";      // 触觉关怀记录
const TEMPERATURE_KEY  = "sakura_letters_temperature_v2";// 温度感知

/* v0.8.0 新玩法存储 */
const TAROT_KEY        = "sakura_letters_tarot_v2";       // 占卜抽牌
const DREAMWEAVE_KEY   = "sakura_letters_dreamweave_v2"; // 梦境编织
const HANDWRITING_KEY  = "sakura_letters_handwriting_v2";// 笔迹选择
const SPECTRUM_KEY     = "sakura_letters_spectrum_v2";   // 情绪光谱

/* v0.9.0 新玩法存储 */
const CONSTELLATION_KEY = "sakura_letters_constellation_v2"; // 星座连线
const STETHOSCOPE_KEY   = "sakura_letters_stethoscope_v2";   // 心声听诊
const PUZZLE_KEY        = "sakura_letters_puzzle_v2";         // 信物拼图
const PERFUME_KEY       = "sakura_letters_perfume_v2";       // 气味调香

/* v1.0.0 新玩法存储 */
const BREATH_KEY        = "sakura_letters_breath_v2";         // 呼吸引导
const TIMECAPSULE_KEY   = "sakura_letters_timecapsule_v2";   // 时光胶囊
const FOLD_KEY          = "sakura_letters_fold_v2";         // 信纸折痕
const REFLECTION_KEY    = "sakura_letters_reflection_v2";    // 倒影对齐

/* v1.1.0 新玩法存储 */
const LIGHTDRAW_KEY = "sakura_letters_lightdraw_v2";   // 光影描绘
const MIMIC_KEY     = "sakura_letters_mimic_v2";       // 声音模仿
const SEASON_KEY    = "sakura_letters_season_v2";      // 季节切换
const PULSE_KEY     = "sakura_letters_pulse_v2";       // 脉搏同步

/* v1.2.0 新玩法存储 */
const TEA_KEY       = "sakura_letters_tea_v2";         // 茶席品茗
const ASTRONOMY_KEY = "sakura_letters_astronomy_v2";   // 星象观测
const PALETTE_KEY   = "sakura_letters_palette_v2";     // 颜料调配
const PIANO_KEY     = "sakura_letters_piano_v2";       // 琴键演奏

/* v1.3.0 新玩法存储 */
const DICE_KEY    = "sakura_letters_dice_v2";        // 占星骰子
const WIND_KEY    = "sakura_letters_wind_v2";        // 风向感知
const DECODE_KEY  = "sakura_letters_decode_v2";      // 梦境解码
const RAIN_KEY    = "sakura_letters_rain_v2";        // 雨滴节奏

/* v1.4.0 新玩法存储 */
const RUBBING_KEY  = "sakura_letters_rubbing_v2";    // 拓印
const COLLECT_KEY  = "sakura_letters_collect_v2";    // 集字
const FOCUS_KEY    = "sakura_letters_focus_v2";      // 光影对焦
const SCENTMEM_KEY = "sakura_letters_scentmem_v2";   // 气味记忆

/* v1.5.0 新玩法存储 */
const TEALEAF_KEY = "sakura_letters_tealeaf_v2";   // 茶渍占卜
const SHADOW_KEY  = "sakura_letters_shadow_v2";    // 影子对齐
const CANDLE_KEY  = "sakura_letters_candle_v2";    // 烛火守护
const DIAL_KEY    = "sakura_letters_dial_v2";       // 电话拨号

const Saves = {
  data: { slots: [], lastSlot: null },
  endings: { unlocked: [], count: 0 },
  settings: {
    textSpeed: 30,
    autoDelay: 1200,
    bgmVolume: 0.4,
    sfxVolume: 0.6,
    particles: true,
    bgm: true,
  },

  /* ============ 存档槽位 ============ */
  init() {
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },

  _loadSaves() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        if (!this.data.slots) this.data.slots = [];
      }
      while (this.data.slots.length < SAVE_SLOTS) this.data.slots.push(null);
    } catch (e) {
      console.warn("读取存档失败:", e);
      this.data = { slots: new Array(SAVE_SLOTS).fill(null), lastSlot: null };
    }
  },

  _saveSaves() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.error("写入存档失败:", e); }
  },

  save(slot, snapshot) {
    const data = {
      slot,
      timestamp: Date.now(),
      nodeId: snapshot.nodeId,
      variables: snapshot.variables,
      sceneLabel: snapshot.sceneLabel || "",
      dialogPreview: snapshot.dialogPreview || "",
      day: snapshot.day,
      time: snapshot.time,
    };
    this.data.slots[slot] = data;
    this.data.lastSlot = slot;
    this._saveSaves();
    return true;
  },

  load(slot) { return this.data.slots[slot]; },

  deleteSave(slot) {
    this.data.slots[slot] = null;
    if (this.data.lastSlot === slot) this.data.lastSlot = null;
    this._saveSaves();
  },

  getQuickSave() { return this.data.slots[0]; },
  quickSave(snapshot) { return this.save(0, snapshot); },

  /* ============ 结局图鉴 ============ */
  _loadEndings() {
    try {
      const raw = localStorage.getItem(ENDINGS_KEY);
      if (raw) this.endings = JSON.parse(raw);
    } catch (e) { this.endings = { unlocked: [], count: 0 }; }
  },

  unlockEnding(endingId) {
    if (!this.endings.unlocked.includes(endingId)) {
      this.endings.unlocked.push(endingId);
      this.endings.count = this.endings.unlocked.length;
      localStorage.setItem(ENDINGS_KEY, JSON.stringify(this.endings));
      return true;
    }
    return false;
  },

  isEndingUnlocked(endingId) { return this.endings.unlocked.includes(endingId); },

  /* ============ 关键词收集 ============ */
  getKeywords() {
    try {
      const raw = localStorage.getItem(KEYWORDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  unlockKeyword(kw) {
    const list = this.getKeywords();
    if (!list.includes(kw)) {
      list.push(kw);
      localStorage.setItem(KEYWORDS_KEY, JSON.stringify(list));
      return true; // 新解锁
    }
    return false;
  },

  isKeywordUnlocked(kw) { return this.getKeywords().includes(kw); },

  /* ============ CG 图鉴 ============ */
  getCGs() {
    try {
      const raw = localStorage.getItem(CG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  unlockCG(cgId) {
    const list = this.getCGs();
    if (!list.includes(cgId)) {
      list.push(cgId);
      localStorage.setItem(CG_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },

  isCGUnlocked(cgId) { return this.getCGs().includes(cgId); },

  /* ============ 信件回执 ============ */
  getLetters() {
    try {
      const raw = localStorage.getItem(LETTERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  saveLetter(letterId, answers) {
    const letters = this.getLetters();
    letters[letterId] = { answers, ts: Date.now() };
    localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
  },

  getLetter(letterId) { return this.getLetters()[letterId]; },

  /* ============ 全局标记（多周目） ============ */
  getFlags() {
    try {
      const raw = localStorage.getItem(FLAGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  setFlag(key, value) {
    const flags = this.getFlags();
    flags[key] = value;
    localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
  },

  getFlag(key, def) {
    const v = this.getFlags()[key];
    return v === undefined ? def : v;
  },

  /* ============ 设置 ============ */
  _loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = Object.assign(this.settings, JSON.parse(raw));
    } catch (e) { /* 用默认 */ }
  },

  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); }
    catch (e) { console.error("保存设置失败:", e); }
  },

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  },

  /* ============ 合成关键词 ============ */
  getComposed() {
    try {
      const raw = localStorage.getItem(COMPOSED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  composeKeyword(a, b, recipe) {
    const list = this.getComposed();
    if (!list.includes(recipe)) {
      list.push(recipe);
      localStorage.setItem(COMPOSED_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  isComposed(recipe) { return this.getComposed().includes(recipe); },

  /* ============ 记忆片段（循环） ============ */
  getMemories() {
    try {
      const raw = localStorage.getItem(MEMORIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  saveMemory(memoryId, text) {
    const list = this.getMemories();
    if (!list.find(m => m.id === memoryId)) {
      list.push({ id: memoryId, text, ts: Date.now() });
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  isMemoryUnlocked(memoryId) {
    return !!this.getMemories().find(m => m.id === memoryId);
  },

  /* ============ 环境线索（背景可点击） ============ */
  getClues() {
    try {
      const raw = localStorage.getItem(CLUES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  markClueFound(clueId) {
    const list = this.getClues();
    if (!list.includes(clueId)) {
      list.push(clueId);
      localStorage.setItem(CLUES_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  isClueFound(clueId) { return this.getClues().includes(clueId); },

  /* ============ 收件箱（角色主动来信） ============ */
  getInbox() {
    try {
      const raw = localStorage.getItem(INBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  saveInbox(msg) {
    const list = this.getInbox();
    if (!list.find(m => m.id === msg.id)) {
      list.push(Object.assign({ ts: Date.now(), read: false, replied: null, expired: false }, msg));
      localStorage.setItem(INBOX_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  markInboxRead(id) {
    const list = this.getInbox();
    const m = list.find(x => x.id === id);
    if (m && !m.read) { m.read = true; localStorage.setItem(INBOX_KEY, JSON.stringify(list)); }
  },
  markInboxReplied(id, value) {
    const list = this.getInbox();
    const m = list.find(x => x.id === id);
    if (m) { m.replied = value; m.read = true; localStorage.setItem(INBOX_KEY, JSON.stringify(list)); }
  },
  markInboxExpired(id) {
    const list = this.getInbox();
    const m = list.find(x => x.id === id);
    if (m && m.replied === null) { m.expired = true; localStorage.setItem(INBOX_KEY, JSON.stringify(list)); }
  },
  inboxUnreadCount() {
    return this.getInbox().filter(m => !m.read).length;
  },

  /* ============ 朋友圈动态 ============ */
  getMoments() {
    try {
      const raw = localStorage.getItem(MOMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  addMoment(id) {
    const list = this.getMoments();
    if (!list.includes(id)) {
      list.push({ id, ts: Date.now() });
      localStorage.setItem(MOMENTS_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  isMomentPublished(id) { return this.getMoments().some(m => m.id === id); },
  getLikedMoments() {
    try {
      const raw = localStorage.getItem(MOMENT_LIKES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  toggleLikeMoment(id) {
    const list = this.getLikedMoments();
    const i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); localStorage.setItem(MOMENT_LIKES_KEY, JSON.stringify(list)); return false; }
    list.push(id); localStorage.setItem(MOMENT_LIKES_KEY, JSON.stringify(list)); return true;
  },
  getMomentComments() {
    try {
      const raw = localStorage.getItem(MOMENT_COMMENTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  addMomentComment(id, value) {
    const all = this.getMomentComments();
    if (!all[id]) all[id] = [];
    if (!all[id].includes(value)) { all[id].push(value); localStorage.setItem(MOMENT_COMMENTS_KEY, JSON.stringify(all)); return true; }
    return false;
  },

  /* ============ 梦境碎片 ============ */
  getDreamShards() {
    try {
      const raw = localStorage.getItem(DREAM_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  addDreamShard(id, text) {
    const list = this.getDreamShards();
    if (!list.find(s => s.id === id)) {
      list.push({ id, text, ts: Date.now() });
      localStorage.setItem(DREAM_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  isDreamShardFound(id) { return this.getDreamShards().some(s => s.id === id); },

  /* ============ 性格画像 ============ */
  getPersonality() {
    try {
      const raw = localStorage.getItem(PERSONALITY_KEY);
      return raw ? JSON.parse(raw) : { brave: 0, kind: 0, active: 0, honest: 0 };
    } catch (e) { return { brave: 0, kind: 0, active: 0, honest: 0 }; }
  },
  addPersonality(dim, delta) {
    const p = this.getPersonality();
    p[dim] = (p[dim] || 0) + delta;
    localStorage.setItem(PERSONALITY_KEY, JSON.stringify(p));
  },
  getPersonalityProfile() {
    const p = this.getPersonality();
    const tags = [];
    tags.push(p.brave >= 0 ? "敢" : "慎");
    tags.push(p.kind >= 0 ? "温" : "冷");
    tags.push(p.active >= 0 ? "行" : "思");
    tags.push(p.honest >= 0 ? "真" : "藏");
    return { tags, dims: p };
  },

  /* ============ 涂鸦记录 ============ */
  getDoodles() {
    try {
      const raw = localStorage.getItem(DOODLE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveDoodle(nodeId, mood, stats) {
    const all = this.getDoodles();
    all[nodeId] = { mood, stats, ts: Date.now() };
    localStorage.setItem(DOODLE_KEY, JSON.stringify(all));
  },
  getDoodle(nodeId) { return this.getDoodles()[nodeId]; },

  /* ============ 拼贴诗 ============ */
  getCollages() {
    try {
      const raw = localStorage.getItem(COLLAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveCollage(nodeId, words, poem, score, tag) {
    const all = this.getCollages();
    all[nodeId] = { words, poem, score, tag, ts: Date.now() };
    localStorage.setItem(COLLAGE_KEY, JSON.stringify(all));
    return true;
  },
  getCollage(nodeId) { return this.getCollages()[nodeId]; },

  /* ============ 回声台词（玩家说过的重要台词） ============ */
  getEchoes() {
    try {
      const raw = localStorage.getItem(ECHO_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  saveEcho(echoId, text, ctx) {
    const list = this.getEchoes();
    if (!list.find(e => e.id === echoId)) {
      list.push({ id: echoId, text, ctx: ctx || "", ts: Date.now() });
      localStorage.setItem(ECHO_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
  isEchoSaved(echoId) { return this.getEchoes().some(e => e.id === echoId); },
  getEcho(echoId) { return this.getEchoes().find(e => e.id === echoId); },
  acknowledgeEcho(echoId, choice) {
    const list = this.getEchoes();
    const e = list.find(x => x.id === echoId);
    if (e) { e.acknowledged = choice; localStorage.setItem(ECHO_KEY, JSON.stringify(list)); return true; }
    return false;
  },

  /* ============ 摄影构图 ============ */
  getPhotos() {
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  savePhoto(nodeId, composition, score, tag) {
    const all = this.getPhotos();
    all[nodeId] = { composition, score, tag, ts: Date.now() };
    localStorage.setItem(PHOTO_KEY, JSON.stringify(all));
    return true;
  },
  getPhoto(nodeId) { return this.getPhotos()[nodeId]; },

  /* ============ 节奏敲击 ============ */
  getRhythms() {
    try {
      const raw = localStorage.getItem(RHYTHM_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveRhythm(nodeId, hits, accuracy, tag) {
    const all = this.getRhythms();
    all[nodeId] = { hits, accuracy, tag, ts: Date.now() };
    localStorage.setItem(RHYTHM_KEY, JSON.stringify(all));
    return true;
  },
  getRhythm(nodeId) { return this.getRhythms()[nodeId]; },

  /* ============ v0.7.0 气味收集 ============ */
  // 气味卡结构：{ id, name, desc, scene, ts }
  getScents() {
    try {
      const raw = localStorage.getItem(SCENT_KEY);
      return raw ? JSON.parse(raw) : { collected: {}, recalled: {} };
    } catch (e) { return { collected: {}, recalled: {} }; }
  },
  collectScent(scent) {
    const all = this.getScents();
    if (all.collected[scent.id]) return false; // 已收集过
    all.collected[scent.id] = { ...scent, ts: Date.now() };
    localStorage.setItem(SCENT_KEY, JSON.stringify(all));
    return true; // true 表示新收集
  },
  isScentCollected(id) { return !!this.getScents().collected[id]; },
  // 闪回触发：用 scentId 关联已收集的气味
  markScentRecalled(scentId, recallId) {
    const all = this.getScents();
    if (!all.recalled[scentId]) all.recalled[scentId] = [];
    if (!all.recalled[scentId].includes(recallId)) {
      all.recalled[scentId].push(recallId);
      localStorage.setItem(SCENT_KEY, JSON.stringify(all));
      return true;
    }
    return false;
  },
  isScentRecalled(scentId, recallId) {
    const r = this.getScents().recalled[scentId] || [];
    return r.includes(recallId);
  },

  /* ============ v0.7.0 沉默选择 ============ */
  // 记录每个沉默节点的最终选择：{ nodeId: { choice, silent, ts } }
  getSilenceRecords() {
    try {
      const raw = localStorage.getItem(SILENCE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveSilenceRecord(nodeId, choice, silent) {
    const all = this.getSilenceRecords();
    all[nodeId] = { choice, silent, ts: Date.now() };
    localStorage.setItem(SILENCE_KEY, JSON.stringify(all));
    return true;
  },
  getSilenceRecord(nodeId) { return this.getSilenceRecords()[nodeId]; },
  getSilentCount() {
    const all = this.getSilenceRecords();
    return Object.values(all).filter(r => r.silent).length;
  },

  /* ============ v0.7.0 触觉关怀 ============ */
  // 记录每次触觉关怀的部位：{ nodeId: { parts: [], ts } }
  getTouchRecords() {
    try {
      const raw = localStorage.getItem(TOUCH_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveTouchRecord(nodeId, partId, partLabel) {
    const all = this.getTouchRecords();
    if (!all[nodeId]) all[nodeId] = { parts: [], ts: Date.now() };
    if (!all[nodeId].parts.some(p => p.id === partId)) {
      all[nodeId].parts.push({ id: partId, label: partLabel });
      all[nodeId].ts = Date.now();
      localStorage.setItem(TOUCH_KEY, JSON.stringify(all));
      return true;
    }
    return false;
  },
  getTouchRecord(nodeId) { return this.getTouchRecords()[nodeId]; },

  /* ============ v0.7.0 温度感知 ============ */
  // 记录每个温度节点的最终温度：{ nodeId: { temp, tag, ts } }
  getTemperatureRecords() {
    try {
      const raw = localStorage.getItem(TEMPERATURE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveTemperatureRecord(nodeId, temp, tag) {
    const all = this.getTemperatureRecords();
    all[nodeId] = { temp, tag, ts: Date.now() };
    localStorage.setItem(TEMPERATURE_KEY, JSON.stringify(all));
    return true;
  },
  getTemperatureRecord(nodeId) { return this.getTemperatureRecords()[nodeId]; },
  getCurrentTemperature() {
    const all = this.getTemperatureRecords();
    const vals = Object.values(all);
    if (!vals.length) return 0; // 默认常温
    return vals[vals.length - 1].temp;
  },

  /* ============ v0.8.0 占卜抽牌 ============ */
  // 记录每次占卜的三张牌：{ nodeId: { past, present, future, combo, ts } }
  getTarotRecords() {
    try {
      const raw = localStorage.getItem(TAROT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveTarotRecord(nodeId, past, present, future, combo) {
    const all = this.getTarotRecords();
    all[nodeId] = { past, present, future, combo, ts: Date.now() };
    localStorage.setItem(TAROT_KEY, JSON.stringify(all));
    return true;
  },
  getTarotRecord(nodeId) { return this.getTarotRecords()[nodeId]; },
  getLastTarotCombo() {
    const all = this.getTarotRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1].combo;
  },

  /* ============ v0.8.0 梦境编织 ============ */
  // 记录每次拼接的顺序：{ nodeId: { sequence: [], meaning, tag, ts } }
  getDreamweaveRecords() {
    try {
      const raw = localStorage.getItem(DREAMWEAVE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveDreamweaveRecord(nodeId, sequence, meaning, tag) {
    const all = this.getDreamweaveRecords();
    all[nodeId] = { sequence, meaning, tag, ts: Date.now() };
    localStorage.setItem(DREAMWEAVE_KEY, JSON.stringify(all));
    return true;
  },
  getDreamweaveRecord(nodeId) { return this.getDreamweaveRecords()[nodeId]; },

  /* ============ v0.8.0 笔迹选择 ============ */
  // 记录每次写信的笔迹：{ nodeId: { style, label, ts } }
  getHandwritingRecords() {
    try {
      const raw = localStorage.getItem(HANDWRITING_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveHandwritingRecord(nodeId, style, label) {
    const all = this.getHandwritingRecords();
    all[nodeId] = { style, label, ts: Date.now() };
    localStorage.setItem(HANDWRITING_KEY, JSON.stringify(all));
    return true;
  },
  getHandwritingRecord(nodeId) { return this.getHandwritingRecords()[nodeId]; },
  getLastHandwriting() {
    const all = this.getHandwritingRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1].style;
  },

  /* ============ v0.8.0 情绪光谱 ============ */
  // 记录每次选择的情绪点：{ nodeId: { x, y, tag, ts } }
  // x: -100(不悦)~+100(愉悦)，y: -100(平静)~+100(激活)
  getSpectrumRecords() {
    try {
      const raw = localStorage.getItem(SPECTRUM_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveSpectrumRecord(nodeId, x, y, tag) {
    const all = this.getSpectrumRecords();
    all[nodeId] = { x, y, tag, ts: Date.now() };
    localStorage.setItem(SPECTRUM_KEY, JSON.stringify(all));
    return true;
  },
  getSpectrumRecord(nodeId) { return this.getSpectrumRecords()[nodeId]; },
  getLastSpectrum() {
    const all = this.getSpectrumRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1];
  },

  /* ============ v0.9.0 星座连线 ============ */
  // 记录每次连星的顺序：{ nodeId: { sequence: [], tag, ts } }
  getConstellationRecords() {
    try {
      const raw = localStorage.getItem(CONSTELLATION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveConstellationRecord(nodeId, sequence, tag) {
    const all = this.getConstellationRecords();
    all[nodeId] = { sequence, tag, ts: Date.now() };
    localStorage.setItem(CONSTELLATION_KEY, JSON.stringify(all));
    return true;
  },
  getConstellationRecord(nodeId) { return this.getConstellationRecords()[nodeId]; },

  /* ============ v0.9.0 心声听诊 ============ */
  // 记录每次心跳同步：{ nodeId: { hits, total, accuracy, tag, ts } }
  getStethoscopeRecords() {
    try {
      const raw = localStorage.getItem(STETHOSCOPE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveStethoscopeRecord(nodeId, hits, total, accuracy, tag) {
    const all = this.getStethoscopeRecords();
    all[nodeId] = { hits, total, accuracy, tag, ts: Date.now() };
    localStorage.setItem(STETHOSCOPE_KEY, JSON.stringify(all));
    return true;
  },
  getStethoscopeRecord(nodeId) { return this.getStethoscopeRecords()[nodeId]; },

  /* ============ v0.9.0 信物拼图 ============ */
  // 记录每次拼图顺序：{ nodeId: { sequence: [], tag, ts } }
  getPuzzleRecords() {
    try {
      const raw = localStorage.getItem(PUZZLE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  savePuzzleRecord(nodeId, sequence, tag) {
    const all = this.getPuzzleRecords();
    all[nodeId] = { sequence, tag, ts: Date.now() };
    localStorage.setItem(PUZZLE_KEY, JSON.stringify(all));
    return true;
  },
  getPuzzleRecord(nodeId) { return this.getPuzzleRecords()[nodeId]; },

  /* ============ v0.9.0 气味调香 ============ */
  // 记录每次调香配方：{ nodeId: { notes: { 前, 中, 后 }, tag, ts } }
  getPerfumeRecords() {
    try {
      const raw = localStorage.getItem(PERFUME_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  savePerfumeRecord(nodeId, notes, tag) {
    const all = this.getPerfumeRecords();
    all[nodeId] = { notes, tag, ts: Date.now() };
    localStorage.setItem(PERFUME_KEY, JSON.stringify(all));
    return true;
  },
  getPerfumeRecord(nodeId) { return this.getPerfumeRecords()[nodeId]; },
  getLastPerfume() {
    const all = this.getPerfumeRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1];
  },

  /* ============ v1.0.0 呼吸引导 ============ */
  // 记录每次呼吸：{ nodeId: { cycles, avgSync, tag, ts } }
  getBreathRecords() {
    try {
      const raw = localStorage.getItem(BREATH_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveBreathRecord(nodeId, cycles, avgSync, tag) {
    const all = this.getBreathRecords();
    all[nodeId] = { cycles, avgSync, tag, ts: Date.now() };
    localStorage.setItem(BREATH_KEY, JSON.stringify(all));
    return true;
  },
  getBreathRecord(nodeId) { return this.getBreathRecords()[nodeId]; },

  /* ============ v1.0.0 时光胶囊 ============ */
  // 记录每次写的胶囊：{ nodeId: { message, deliverAt, delivered, tag, ts } }
  // deliverAt 是未来某节点 id；delivered 标记是否已投递
  getTimecapsuleRecords() {
    try {
      const raw = localStorage.getItem(TIMECAPSULE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveTimecapsuleRecord(nodeId, message, deliverAt, tag) {
    const all = this.getTimecapsuleRecords();
    all[nodeId] = { message, deliverAt, delivered: false, tag, ts: Date.now() };
    localStorage.setItem(TIMECAPSULE_KEY, JSON.stringify(all));
    return true;
  },
  getTimecapsuleRecord(nodeId) { return this.getTimecapsuleRecords()[nodeId]; },
  // 查找所有投递到 targetNodeId 的胶囊
  getTimecapsulesForNode(targetNodeId) {
    const all = this.getTimecapsuleRecords();
    return Object.entries(all)
      .filter(([k, v]) => v.deliverAt === targetNodeId && !v.delivered)
      .map(([k, v]) => ({ sourceNodeId: k, ...v }));
  },
  markTimecapsuleDelivered(nodeId) {
    const all = this.getTimecapsuleRecords();
    if (all[nodeId]) {
      all[nodeId].delivered = true;
      localStorage.setItem(TIMECAPSULE_KEY, JSON.stringify(all));
    }
  },

  /* ============ v1.0.0 信纸折痕 ============ */
  // 记录每次折纸顺序：{ nodeId: { sequence: [], tag, ts } }
  getFoldRecords() {
    try {
      const raw = localStorage.getItem(FOLD_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveFoldRecord(nodeId, sequence, tag) {
    const all = this.getFoldRecords();
    all[nodeId] = { sequence, tag, ts: Date.now() };
    localStorage.setItem(FOLD_KEY, JSON.stringify(all));
    return true;
  },
  getFoldRecord(nodeId) { return this.getFoldRecords()[nodeId]; },

  /* ============ v1.0.0 倒影对齐 ============ */
  // 记录每次对齐结果：{ nodeId: { offsetX, accuracy, tag, ts } }
  getReflectionRecords() {
    try {
      const raw = localStorage.getItem(REFLECTION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveReflectionRecord(nodeId, offsetX, accuracy, tag) {
    const all = this.getReflectionRecords();
    all[nodeId] = { offsetX, accuracy, tag, ts: Date.now() };
    localStorage.setItem(REFLECTION_KEY, JSON.stringify(all));
    return true;
  },
  getReflectionRecord(nodeId) { return this.getReflectionRecords()[nodeId]; },

  /* ============ v1.1.0 光影描绘 ============ */
  // 记录每次描绘：{ nodeId: { litTargets: [...], coverage, tag, ts } }
  getLightdrawRecords() {
    try {
      const raw = localStorage.getItem(LIGHTDRAW_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveLightdrawRecord(nodeId, litTargets, coverage, tag) {
    const all = this.getLightdrawRecords();
    all[nodeId] = { litTargets, coverage, tag, ts: Date.now() };
    localStorage.setItem(LIGHTDRAW_KEY, JSON.stringify(all));
    return true;
  },
  getLightdrawRecord(nodeId) { return this.getLightdrawRecords()[nodeId]; },

  /* ============ v1.1.0 声音模仿 ============ */
  // 记录每次模仿：{ nodeId: { pitch, tempo, diff, tag, ts } }
  getMimicRecords() {
    try {
      const raw = localStorage.getItem(MIMIC_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveMimicRecord(nodeId, pitch, tempo, diff, tag) {
    const all = this.getMimicRecords();
    all[nodeId] = { pitch, tempo, diff, tag, ts: Date.now() };
    localStorage.setItem(MIMIC_KEY, JSON.stringify(all));
    return true;
  },
  getMimicRecord(nodeId) { return this.getMimicRecords()[nodeId]; },

  /* ============ v1.1.0 季节切换 ============ */
  // 记录每次季节选择：{ nodeId: { chosenSeason, isTarget, tag, ts } }
  getSeasonRecords() {
    try {
      const raw = localStorage.getItem(SEASON_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveSeasonRecord(nodeId, chosenSeason, isTarget, tag) {
    const all = this.getSeasonRecords();
    all[nodeId] = { chosenSeason, isTarget, tag, ts: Date.now() };
    localStorage.setItem(SEASON_KEY, JSON.stringify(all));
    return true;
  },
  getSeasonRecord(nodeId) { return this.getSeasonRecords()[nodeId]; },

  /* ============ v1.1.0 脉搏同步 ============ */
  // 记录每次脉搏同步：{ nodeId: { hits, total, accuracy, tag, ts } }
  getPulseRecords() {
    try {
      const raw = localStorage.getItem(PULSE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  savePulseRecord(nodeId, hits, total, accuracy, tag) {
    const all = this.getPulseRecords();
    all[nodeId] = { hits, total, accuracy, tag, ts: Date.now() };
    localStorage.setItem(PULSE_KEY, JSON.stringify(all));
    return true;
  },
  getPulseRecord(nodeId) { return this.getPulseRecords()[nodeId]; },

  /* ============ v1.2.0 茶席品茗 ============ */
  // 记录每次泡茶：{ nodeId: { temp, amount, time, diff, tag, ts } }
  getTeaRecords() {
    try {
      const raw = localStorage.getItem(TEA_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveTeaRecord(nodeId, temp, amount, time, diff, tag) {
    const all = this.getTeaRecords();
    all[nodeId] = { temp, amount, time, diff, tag, ts: Date.now() };
    localStorage.setItem(TEA_KEY, JSON.stringify(all));
    return true;
  },
  getTeaRecord(nodeId) { return this.getTeaRecords()[nodeId]; },

  /* ============ v1.2.0 星象观测 ============ */
  // 记录每次星象对齐：{ nodeId: { angle, diff, tag, ts } }
  getAstronomyRecords() {
    try {
      const raw = localStorage.getItem(ASTRONOMY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveAstronomyRecord(nodeId, angle, diff, tag) {
    const all = this.getAstronomyRecords();
    all[nodeId] = { angle, diff, tag, ts: Date.now() };
    localStorage.setItem(ASTRONOMY_KEY, JSON.stringify(all));
    return true;
  },
  getAstronomyRecord(nodeId) { return this.getAstronomyRecords()[nodeId]; },

  /* ============ v1.2.0 颜料调配 ============ */
  // 记录每次调色：{ nodeId: { r, g, b, diff, tag, ts } }
  getPaletteRecords() {
    try {
      const raw = localStorage.getItem(PALETTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  savePaletteRecord(nodeId, r, g, b, diff, tag) {
    const all = this.getPaletteRecords();
    all[nodeId] = { r, g, b, diff, tag, ts: Date.now() };
    localStorage.setItem(PALETTE_KEY, JSON.stringify(all));
    return true;
  },
  getPaletteRecord(nodeId) { return this.getPaletteRecords()[nodeId]; },

  /* ============ v1.2.0 琴键演奏 ============ */
  // 记录每次演奏：{ nodeId: { sequence, correct, total, accuracy, tag, ts } }
  getPianoRecords() {
    try {
      const raw = localStorage.getItem(PIANO_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  savePianoRecord(nodeId, sequence, correct, total, accuracy, tag) {
    const all = this.getPianoRecords();
    all[nodeId] = { sequence, correct, total, accuracy, tag, ts: Date.now() };
    localStorage.setItem(PIANO_KEY, JSON.stringify(all));
    return true;
  },
  getPianoRecord(nodeId) { return this.getPianoRecords()[nodeId]; },

  /* ============ v1.3.0 占星骰子 ============ */
  // 记录每次掷骰：{ nodeId: { dice:[a,b,c], sum, tag, ts } }
  getDiceRecords() {
    try {
      const raw = localStorage.getItem(DICE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveDiceRecord(nodeId, dice, sum, tag) {
    const all = this.getDiceRecords();
    all[nodeId] = { dice, sum, tag, ts: Date.now() };
    localStorage.setItem(DICE_KEY, JSON.stringify(all));
    return true;
  },
  getDiceRecord(nodeId) { return this.getDiceRecords()[nodeId]; },

  /* ============ v1.3.0 风向感知 ============ */
  // 记录每次航行：{ nodeId: { progress, attempts, tag, ts } }
  getWindRecords() {
    try {
      const raw = localStorage.getItem(WIND_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveWindRecord(nodeId, progress, attempts, tag) {
    const all = this.getWindRecords();
    all[nodeId] = { progress, attempts, tag, ts: Date.now() };
    localStorage.setItem(WIND_KEY, JSON.stringify(all));
    return true;
  },
  getWindRecord(nodeId) { return this.getWindRecords()[nodeId]; },

  /* ============ v1.3.0 梦境解码 ============ */
  // 记录每次解码：{ nodeId: { answer, correct, tag, ts } }
  getDecodeRecords() {
    try {
      const raw = localStorage.getItem(DECODE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveDecodeRecord(nodeId, answer, correct, tag) {
    const all = this.getDecodeRecords();
    all[nodeId] = { answer, correct, tag, ts: Date.now() };
    localStorage.setItem(DECODE_KEY, JSON.stringify(all));
    return true;
  },
  getDecodeRecord(nodeId) { return this.getDecodeRecords()[nodeId]; },

  /* ============ v1.3.0 雨滴节奏 ============ */
  // 记录每次雨滴：{ nodeId: { hits, total, accuracy, tag, ts } }
  getRainRecords() {
    try {
      const raw = localStorage.getItem(RAIN_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveRainRecord(nodeId, hits, total, accuracy, tag) {
    const all = this.getRainRecords();
    all[nodeId] = { hits, total, accuracy, tag, ts: Date.now() };
    localStorage.setItem(RAIN_KEY, JSON.stringify(all));
    return true;
  },
  getRainRecord(nodeId) { return this.getRainRecords()[nodeId]; },

  /* ============ v1.4.0 拓印 ============ */
  // 记录每次拓印：{ nodeId: { coverage, tag, ts } }
  getRubbingRecords() {
    try {
      const raw = localStorage.getItem(RUBBING_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveRubbingRecord(nodeId, coverage, tag) {
    const all = this.getRubbingRecords();
    all[nodeId] = { coverage, tag, ts: Date.now() };
    localStorage.setItem(RUBBING_KEY, JSON.stringify(all));
    return true;
  },
  getRubbingRecord(nodeId) { return this.getRubbingRecords()[nodeId]; },

  /* ============ v1.4.0 集字 ============ */
  // 记录每次集字：{ nodeId: { collected, total, accuracy, tag, ts } }
  getCollectRecords() {
    try {
      const raw = localStorage.getItem(COLLECT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveCollectRecord(nodeId, collected, total, accuracy, tag) {
    const all = this.getCollectRecords();
    all[nodeId] = { collected, total, accuracy, tag, ts: Date.now() };
    localStorage.setItem(COLLECT_KEY, JSON.stringify(all));
    return true;
  },
  getCollectRecord(nodeId) { return this.getCollectRecords()[nodeId]; },

  /* ============ v1.4.0 光影对焦 ============ */
  // 记录每次对焦：{ nodeId: { focus, diff, tag, ts } }
  getFocusRecords() {
    try {
      const raw = localStorage.getItem(FOCUS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveFocusRecord(nodeId, focus, diff, tag) {
    const all = this.getFocusRecords();
    all[nodeId] = { focus, diff, tag, ts: Date.now() };
    localStorage.setItem(FOCUS_KEY, JSON.stringify(all));
    return true;
  },
  getFocusRecord(nodeId) { return this.getFocusRecords()[nodeId]; },

  /* ============ v1.4.0 气味记忆 ============ */
  // 记录每次气味记忆：{ nodeId: { correct, total, tag, ts } }
  getScentmemRecords() {
    try {
      const raw = localStorage.getItem(SCENTMEM_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveScentmemRecord(nodeId, correct, total, tag) {
    const all = this.getScentmemRecords();
    all[nodeId] = { correct, total, tag, ts: Date.now() };
    localStorage.setItem(SCENTMEM_KEY, JSON.stringify(all));
    return true;
  },
  getScentmemRecord(nodeId) { return this.getScentmemRecords()[nodeId]; },

  /* ============ v1.5.0 茶渍占卜 ============ */
  // { nodeId: { shape, score, tag, ts } }
  getTealeafRecords() {
    try {
      const raw = localStorage.getItem(TEALEAF_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveTealeafRecord(nodeId, shape, score, tag) {
    const all = this.getTealeafRecords();
    all[nodeId] = { shape, score, tag, ts: Date.now() };
    localStorage.setItem(TEALEAF_KEY, JSON.stringify(all));
    return true;
  },
  getTealeafRecord(nodeId) { return this.getTealeafRecords()[nodeId]; },

  /* ============ v1.5.0 影子对齐 ============ */
  // { nodeId: { overlap, tag, ts } }
  getShadowRecords() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveShadowRecord(nodeId, overlap, tag) {
    const all = this.getShadowRecords();
    all[nodeId] = { overlap, tag, ts: Date.now() };
    localStorage.setItem(SHADOW_KEY, JSON.stringify(all));
    return true;
  },
  getShadowRecord(nodeId) { return this.getShadowRecords()[nodeId]; },

  /* ============ v1.5.0 烛火守护 ============ */
  // { nodeId: { survived, total, ratio, tag, ts } }
  getCandleRecords() {
    try {
      const raw = localStorage.getItem(CANDLE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveCandleRecord(nodeId, survived, total, ratio, tag) {
    const all = this.getCandleRecords();
    all[nodeId] = { survived, total, ratio, tag, ts: Date.now() };
    localStorage.setItem(CANDLE_KEY, JSON.stringify(all));
    return true;
  },
  getCandleRecord(nodeId) { return this.getCandleRecords()[nodeId]; },

  /* ============ v1.5.0 电话拨号 ============ */
  // { nodeId: { dialed, target, correct, tag, ts } }
  getDialRecords() {
    try {
      const raw = localStorage.getItem(DIAL_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  saveDialRecord(nodeId, dialed, target, correct, tag) {
    const all = this.getDialRecords();
    all[nodeId] = { dialed, target, correct, tag, ts: Date.now() };
    localStorage.setItem(DIAL_KEY, JSON.stringify(all));
    return true;
  },
  getDialRecord(nodeId) { return this.getDialRecords()[nodeId]; },

  /* ============ 工具 ============ */
  formatTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENDINGS_KEY);
    localStorage.removeItem(KEYWORDS_KEY);
    localStorage.removeItem(CG_KEY);
    localStorage.removeItem(LETTERS_KEY);
    localStorage.removeItem(FLAGS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(COMPOSED_KEY);
    localStorage.removeItem(MEMORIES_KEY);
    [CLUES_KEY, INBOX_KEY, MOMENTS_KEY, MOMENT_LIKES_KEY, MOMENT_COMMENTS_KEY,
     DREAM_KEY, PERSONALITY_KEY, DOODLE_KEY,
     COLLAGE_KEY, ECHO_KEY, PHOTO_KEY, RHYTHM_KEY,
     SCENT_KEY, SILENCE_KEY, TOUCH_KEY, TEMPERATURE_KEY,
     TAROT_KEY, DREAMWEAVE_KEY, HANDWRITING_KEY, SPECTRUM_KEY,
     CONSTELLATION_KEY, STETHOSCOPE_KEY, PUZZLE_KEY, PERFUME_KEY,
     BREATH_KEY, TIMECAPSULE_KEY, FOLD_KEY, REFLECTION_KEY,
     LIGHTDRAW_KEY, MIMIC_KEY, SEASON_KEY, PULSE_KEY,
     TEA_KEY, ASTRONOMY_KEY, PALETTE_KEY, PIANO_KEY,
     DICE_KEY, WIND_KEY, DECODE_KEY, RAIN_KEY,
     RUBBING_KEY, COLLECT_KEY, FOCUS_KEY, SCENTMEM_KEY,
     TEALEAF_KEY, SHADOW_KEY, CANDLE_KEY, DIAL_KEY].forEach(k => localStorage.removeItem(k));
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },
};

Saves.init();
