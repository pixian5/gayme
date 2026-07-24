/* ========================================
   樱时信笺 · 存档系统 (saves.js)
   - 多槽位存档 / 读档 (localStorage)
   - 结局图鉴
   - 全局设置持久化
   ======================================== */

const SAVE_SLOTS = 9;
const STORAGE_KEY = "sakura_letters_saves_v1";
const SETTINGS_KEY = "sakura_letters_settings_v1";
const ENDINGS_KEY = "sakura_letters_endings_v1";

const Saves = {
  data: { slots: [], lastSlot: null },
  endings: { unlocked: [], count: 0 },
  settings: {
    textSpeed: 30,      // ms per char (越小越快)
    autoDelay: 1200,    // 自动模式延迟
    bgmVolume: 0.4,
    sfxVolume: 0.6,
    particles: true,
  },

  init() {
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },

  // ---- 存档 ----
  _loadSaves() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        if (!this.data.slots) this.data.slots = [];
      }
      // 补齐槽位
      while (this.data.slots.length < SAVE_SLOTS) {
        this.data.slots.push(null);
      }
    } catch (e) {
      console.warn("读取存档失败:", e);
      this.data = { slots: new Array(SAVE_SLOTS).fill(null), lastSlot: null };
    }
  },

  _saveSaves() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("写入存档失败:", e);
    }
  },

  save(slot, snapshot) {
    const data = {
      slot,
      timestamp: Date.now(),
      nodeId: snapshot.nodeId,
      variables: snapshot.variables,
      sceneLabel: snapshot.sceneLabel || "",
      dialogPreview: snapshot.dialogPreview || "",
    };
    this.data.slots[slot] = data;
    this.data.lastSlot = slot;
    this._saveSaves();
    return true;
  },

  load(slot) {
    return this.data.slots[slot];
  },

  deleteSave(slot) {
    this.data.slots[slot] = null;
    if (this.data.lastSlot === slot) this.data.lastSlot = null;
    this._saveSaves();
  },

  getQuickSave() {
    return this.data.slots[0]; // 槽位 0 作为快存
  },

  quickSave(snapshot) {
    return this.save(0, snapshot);
  },

  // ---- 结局 ----
  _loadEndings() {
    try {
      const raw = localStorage.getItem(ENDINGS_KEY);
      if (raw) {
        this.endings = JSON.parse(raw);
      }
    } catch (e) {
      this.endings = { unlocked: [], count: 0 };
    }
  },

  unlockEnding(endingId) {
    if (!this.endings.unlocked.includes(endingId)) {
      this.endings.unlocked.push(endingId);
      this.endings.count = this.endings.unlocked.length;
      localStorage.setItem(ENDINGS_KEY, JSON.stringify(this.endings));
      return true; // 新解锁
    }
    return false;
  },

  isEndingUnlocked(endingId) {
    return this.endings.unlocked.includes(endingId);
  },

  // ---- 设置 ----
  _loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        this.settings = Object.assign(this.settings, JSON.parse(raw));
      }
    } catch (e) { /* 用默认 */ }
  },

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error("保存设置失败:", e);
    }
  },

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  },

  // ---- 工具 ----
  formatTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENDINGS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },
};

Saves.init();
