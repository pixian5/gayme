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
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },
};

Saves.init();
