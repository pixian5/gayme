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
     DREAM_KEY, PERSONALITY_KEY, DOODLE_KEY].forEach(k => localStorage.removeItem(k));
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },
};

Saves.init();
