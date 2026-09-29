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

/* v1.6.0 新玩法存储 */
const FOGGY_KEY   = "sakura_letters_foggy_v2";     // 雾窗描绘
const SUGAR_KEY   = "sakura_letters_sugar_v2";     // 糖块拼图
const CHIME_KEY   = "sakura_letters_chime_v2";     // 钟调共振
const HOURGLASS_KEY = "sakura_letters_hourglass_v2"; // 沙漏计时

/* v1.7.0 新玩法存储 */
const KITE_KEY    = "sakura_letters_kite_v2";       // 风筝引线
const LOCK_KEY    = "sakura_letters_lock_v2";       // 密码锁
const ORIGAMI_KEY = "sakura_letters_origami_v2";   // 折纸造型
const ORBIT_KEY   = "sakura_letters_orbit_v2";       // 星轨追踪

/* v1.8.0 新玩法存储 */
const FIREFLY_KEY    = "sakura_letters_firefly_v2";    // 萤火引路
const WINDCHIME_KEY  = "sakura_letters_windchime_v2"; // 风铃调音
const BOTTLE_KEY     = "sakura_letters_bottle_v2";    // 瓶中信
const ECHOLOC_KEY    = "sakura_letters_echoloc_v2";   // 回声定位

/* v1.9.0 新玩法存储 */
const COMPASS_KEY    = "sakura_letters_compass_v2";    // 罗盘导航
const TELEGRAPH_KEY  = "sakura_letters_telegraph_v2";  // 密码电报
const BALANCE_KEY    = "sakura_letters_balance_v2";    // 天平称重
const PENDULUM_KEY   = "sakura_letters_pendulum_v2";   // 钟摆节奏

/* v2.0.0 新玩法存储 */
const METRONOME_KEY  = "sakura_letters_metronome_v2";  // 节拍器同步
const STARCHART_KEY  = "sakura_letters_starchart_v2";  // 星图连线
const LENS_KEY        = "sakura_letters_lens_v2";        // 透镜聚焦
const TUNING_KEY      = "sakura_letters_tuning_v2";      // 弦音调音

/* v2.1.0 新玩法存储 */
const ECLIPSE_KEY     = "sakura_letters_eclipse_v2";     // 日蚀对位
const STAMP_KEY       = "sakura_letters_stamp_v2";       // 印章对齐
const ASTROLABE_KEY   = "sakura_letters_astrolabe_v2";   // 星盘仪
const SANDPAINT_KEY   = "sakura_letters_sandpaint_v2";   // 沙画凝形

/* v2.2.0 新玩法存储 */
const KALEIDO_KEY     = "sakura_letters_kaleido_v2";     // 万花筒
const ABACUS_KEY      = "sakura_letters_abacus_v2";      // 算盘珠
const GEAR_KEY        = "sakura_letters_gear_v2";        // 齿轮咬合
const TOPO_KEY        = "sakura_letters_topo_v2";        // 等高线

/* v2.3.0 新玩法存储 */
const SUNDIAL_KEY     = "sakura_letters_sundial_v2";     // 日晷对时
const DYE_KEY         = "sakura_letters_dye_v2";         // 染缸调色
const WINDMILL_KEY    = "sakura_letters_windmill_v2";    // 风车叶片
const WEAVE_KEY       = "sakura_letters_weave_v2";       // 经纬编织

/* v2.4.0 新玩法存储 */
const MIRROR_KEY      = "sakura_letters_mirror_v2";      // 镜面对称
const LANTERN_KEY     = "sakura_letters_lantern_v2";     // 灯笼排列
const RIPPLE_KEY      = "sakura_letters_ripple_v2";      // 水波纹
const MOSAIC_KEY     = "sakura_letters_mosaic_v2";      // 马赛克拼图

/* v2.5.0 新玩法存储 */
const STELE_KEY       = "sakura_letters_stele_v2";       // 碑帖拼合
const CELESTIAL_KEY   = "sakura_letters_celestial_v2";   // 星轨推演
const DRUM_KEY        = "sakura_letters_drum_v2";        // 节拍鼓点
const VANE_KEY        = "sakura_letters_vane_v2";        // 风向标

/* v2.6.0 新玩法存储 */
const CLEPSYDRA_KEY   = "sakura_letters_clepsydra_v2";   // 漏刻计时
const JIGSAW_KEY      = "sakura_letters_jigsaw_v2";      // 拼图归位
const CHESS_KEY       = "sakura_letters_chess_v2";       // 棋局推演
const FLAG_KEY        = "sakura_letters_flag_v2";        // 旗阵辨识
const TIMELINE_KEY     = "sakura_letters_timeline_v2";    // 后日谈时间线
const TRIAGE_KEY       = "sakura_letters_triage_v2";      // 后日谈回信分拣
const WALL_KEY         = "sakura_letters_wall_v2";        // 后日谈留言墙
const PROOFREAD_KEY    = "sakura_letters_proofread_v2";   // 后日谈校刊校对
const META_KEY        = "sakura_letters_meta_v3";
const STORAGE_SCHEMA_VERSION = 3;

const GAME_STORAGE_KEYS = [STORAGE_KEY, ENDINGS_KEY, KEYWORDS_KEY, CG_KEY, LETTERS_KEY,
  FLAGS_KEY, SETTINGS_KEY, COMPOSED_KEY, MEMORIES_KEY,
  CLUES_KEY, INBOX_KEY, MOMENTS_KEY, MOMENT_LIKES_KEY, MOMENT_COMMENTS_KEY,
  DREAM_KEY, PERSONALITY_KEY, DOODLE_KEY, COLLAGE_KEY, ECHO_KEY, PHOTO_KEY, RHYTHM_KEY,
  SCENT_KEY, SILENCE_KEY, TOUCH_KEY, TEMPERATURE_KEY, TAROT_KEY, DREAMWEAVE_KEY,
  HANDWRITING_KEY, SPECTRUM_KEY, CONSTELLATION_KEY, STETHOSCOPE_KEY, PUZZLE_KEY,
  PERFUME_KEY, BREATH_KEY, TIMECAPSULE_KEY, FOLD_KEY, REFLECTION_KEY, LIGHTDRAW_KEY,
  MIMIC_KEY, SEASON_KEY, PULSE_KEY, TEA_KEY, ASTRONOMY_KEY, PALETTE_KEY, PIANO_KEY,
  DICE_KEY, WIND_KEY, DECODE_KEY, RAIN_KEY, RUBBING_KEY, COLLECT_KEY, FOCUS_KEY,
  SCENTMEM_KEY, TEALEAF_KEY, SHADOW_KEY, CANDLE_KEY, DIAL_KEY, FOGGY_KEY, SUGAR_KEY,
  CHIME_KEY, HOURGLASS_KEY, KITE_KEY, LOCK_KEY, ORIGAMI_KEY, ORBIT_KEY, FIREFLY_KEY,
  WINDCHIME_KEY, BOTTLE_KEY, ECHOLOC_KEY, COMPASS_KEY, TELEGRAPH_KEY, BALANCE_KEY,
  PENDULUM_KEY, METRONOME_KEY, STARCHART_KEY, LENS_KEY, TUNING_KEY, ECLIPSE_KEY,
  STAMP_KEY, ASTROLABE_KEY, SANDPAINT_KEY, KALEIDO_KEY, ABACUS_KEY, GEAR_KEY, TOPO_KEY,
  SUNDIAL_KEY, DYE_KEY, WINDMILL_KEY, WEAVE_KEY, MIRROR_KEY, LANTERN_KEY, RIPPLE_KEY,
  MOSAIC_KEY, STELE_KEY, CELESTIAL_KEY, DRUM_KEY, VANE_KEY, CLEPSYDRA_KEY, JIGSAW_KEY,
  CHESS_KEY, FLAG_KEY, TIMELINE_KEY, TRIAGE_KEY, WALL_KEY, PROOFREAD_KEY];

const DEFAULT_SETTINGS = Object.freeze({
  textSpeed: 30,
  autoDelay: 1200,
  bgmVolume: 0.4,
  sfxVolume: 0.6,
  particles: true,
  bgm: true,
});

function createDefaultSaveData() {
  return { slots: new Array(SAVE_SLOTS).fill(null), lastSlot: null };
}

function createDefaultEndings() {
  return { unlocked: [], count: 0 };
}

function createDefaultSettings() {
  return Object.assign({}, DEFAULT_SETTINGS);
}

const NUMERIC_SETTING_RANGES = Object.freeze({
  textSpeed: { min: 5, max: 80, integer: true },
  autoDelay: { min: 500, max: 4000, integer: true },
  bgmVolume: { min: 0, max: 1, integer: false },
  sfxVolume: { min: 0, max: 1, integer: false },
});

function normalizeSettings(value) {
  const normalized = createDefaultSettings();
  if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;

  for (const [key, range] of Object.entries(NUMERIC_SETTING_RANGES)) {
    const raw = value[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const bounded = Math.min(range.max, Math.max(range.min, raw));
    normalized[key] = range.integer ? Math.round(bounded) : bounded;
  }
  for (const key of ["particles", "bgm"]) {
    if (typeof value[key] === "boolean") normalized[key] = value[key];
  }
  return normalized;
}

function isKnownSetting(key) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key);
}

function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/* ============ 存档方法工厂 ============
   历史上 100 多个 localStorage 键各自手写「读取 / 写入 / 读单条」三个方法，
   形态完全一致却重复上千行。以下两个工厂统一实现，仅保留键名与字段差异。 */

// 纯对象校验（排除数组与 null），作为默认的结构校验器
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// 「按 nodeId 记录」型：存储结构 { [nodeId]: { ...fields, ts } }
// 生成 getXxxRecords() / saveXxxRecord(nodeId, ...) / getXxxRecord(nodeId)
// names 用于覆盖方法名，兼容命名不规则的存储（如 Photo：getPhotos / savePhoto / getPhoto）
function recordStore(key, name, fields, names) {
  const listName = (names && names.list) || `get${name}Records`;
  const saveName = (names && names.save) || `save${name}Record`;
  const oneName = (names && names.one) || `get${name}Record`;
  return {
    [listName]() { return this._read(key, {}, isPlainObject); },
    [saveName](nodeId, ...args) {
      const all = this[listName]();
      const record = {};
      let argIndex = 0;
      // 字段可以是名字（取自入参），也可以是 [名字, 字面量]（固定默认值，如 delivered: false）
      fields.forEach((field) => {
        if (Array.isArray(field)) record[field[0]] = field[1];
        else record[field] = args[argIndex++];
      });
      record.ts = Date.now();
      all[nodeId] = record;
      return this._write(key, JSON.stringify(all));
    },
    [oneName](nodeId) { return this[listName]()[nodeId]; },
  };
}

// 「解锁型 id 列表」：存储结构 [id, id, ...]，已存在则返回 false，新增才写入
function unlockListStore(key, listName, addName, hasName) {
  return {
    [listName]() { return this._read(key, [], Array.isArray); },
    [addName](id) {
      const list = this[listName]();
      if (list.includes(id)) return false;
      list.push(id);
      return this._write(key, JSON.stringify(list));
    },
    [hasName](id) { return this[listName]().includes(id); },
  };
}

const Saves = {
  data: createDefaultSaveData(),
  endings: createDefaultEndings(),
  settings: createDefaultSettings(),
  lastStorageError: null,
  cache: new Map(),

  _write(key, value) {
    try {
      localStorage.setItem(key, value);
      try { this.cache.set(key, cloneValue(JSON.parse(value))); }
      catch (parseError) { this.cache.delete(key); }
      this.lastStorageError = null;
      return true;
    } catch (e) {
      this.lastStorageError = e;
      console.error(`写入本地存储失败 (${key}):`, e);
      return false;
    }
  },

  _remove(key) {
    try {
      localStorage.removeItem(key);
      this.cache.delete(key);
      this.lastStorageError = null;
      return true;
    } catch (e) {
      this.lastStorageError = e;
      console.error(`清理本地存储失败 (${key}):`, e);
      return false;
    }
  },

  _read(key, fallback, isValid) {
    try {
      if (this.cache.has(key)) return cloneValue(this.cache.get(key));
      const raw = localStorage.getItem(key);
      if (!raw) return cloneValue(fallback);
      const value = JSON.parse(raw);
      if (isValid && !isValid(value)) return cloneValue(fallback);
      this.cache.set(key, cloneValue(value));
      return cloneValue(value);
    } catch (e) {
      return cloneValue(fallback);
    }
  },

  /* ============ 存档槽位 ============ */
  init() {
    this._migrate();
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
  },

  _migrate() {
    const meta = this._read(META_KEY, {}, value => value && typeof value === "object" && !Array.isArray(value));
    const previousVersion = Number.isInteger(meta.schemaVersion) ? meta.schemaVersion : 0;
    if (previousVersion >= STORAGE_SCHEMA_VERSION) return;
    this._write(META_KEY, JSON.stringify({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      migratedAt: Date.now(),
      previousVersion,
    }));
  },

  exportData() {
    const records = {};
    for (const key of GAME_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) records[key] = JSON.parse(raw);
      } catch (e) {
        console.warn(`导出本地存储失败 (${key}):`, e);
      }
    }
    return { schemaVersion: STORAGE_SCHEMA_VERSION, exportedAt: Date.now(), records };
  },

  importData(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)
      || !payload.records || typeof payload.records !== "object" || Array.isArray(payload.records)) return false;
    if (!Number.isInteger(payload.schemaVersion) || payload.schemaVersion < 0 || payload.schemaVersion > STORAGE_SCHEMA_VERSION) return false;
    const before = new Map();
    for (const key of GAME_STORAGE_KEYS) {
      try { before.set(key, localStorage.getItem(key)); }
      catch (e) { return false; }
    }
    for (const [key, value] of Object.entries(payload.records)) {
      let serialized;
      try {
        const normalizedValue = key === SETTINGS_KEY ? normalizeSettings(value) : value;
        serialized = JSON.stringify(normalizedValue);
        if (serialized === undefined) throw new Error("记录值不可序列化");
      } catch (e) {
        serialized = null;
      }
      if (!GAME_STORAGE_KEYS.includes(key) || serialized === null || !this._write(key, serialized)) {
        for (const [rollbackKey, raw] of before) {
          if (raw === null) this._remove(rollbackKey); else this._write(rollbackKey, raw);
        }
        return false;
      }
    }
    for (const key of GAME_STORAGE_KEYS) {
      if (!(key in payload.records) && !this._remove(key)) {
        for (const [rollbackKey, raw] of before) {
          if (raw === null) this._remove(rollbackKey); else this._write(rollbackKey, raw);
        }
        return false;
      }
    }
    this.cache.clear();
    this._migrate();
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
    return true;
  },

  _loadSaves() {
    this.data = createDefaultSaveData();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.slots)) throw new Error("存档结构无效");
        this.data.slots = parsed.slots.slice(0, SAVE_SLOTS);
        this.data.lastSlot = Number.isInteger(parsed.lastSlot) && parsed.lastSlot >= 0 && parsed.lastSlot < SAVE_SLOTS
          ? parsed.lastSlot : null;
      }
      while (this.data.slots.length < SAVE_SLOTS) this.data.slots.push(null);
    } catch (e) {
      console.warn("读取存档失败:", e);
      this.data = createDefaultSaveData();
    }
  },

  _saveSaves() {
    return this._write(STORAGE_KEY, JSON.stringify(this.data));
  },

  save(slot, snapshot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SAVE_SLOTS || !snapshot || typeof snapshot !== "object") return false;
    const data = {
      slot,
      timestamp: Date.now(),
      nodeId: snapshot.nodeId,
      variables: snapshot.variables,
      sceneLabel: snapshot.sceneLabel || "",
      dialogPreview: snapshot.dialogPreview || "",
      day: snapshot.day,
      time: snapshot.time,
      currentBg: snapshot.currentBg || "",
      history: Array.isArray(snapshot.history) ? snapshot.history : [],
      visitedNodes: snapshot.visitedNodes && typeof snapshot.visitedNodes === "object" ? snapshot.visitedNodes : {},
      loopCount: Number.isFinite(snapshot.loopCount) ? snapshot.loopCount : 0,
      playCount: Number.isFinite(snapshot.playCount) ? snapshot.playCount : 0,
    };
    const previousSlot = this.data.slots[slot];
    const previousLastSlot = this.data.lastSlot;
    this.data.slots[slot] = data;
    this.data.lastSlot = slot;
    if (this._saveSaves()) return true;
    this.data.slots[slot] = previousSlot;
    this.data.lastSlot = previousLastSlot;
    return false;
  },

  load(slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < SAVE_SLOTS ? this.data.slots[slot] : null;
  },

  deleteSave(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SAVE_SLOTS) return false;
    const previousSlot = this.data.slots[slot];
    const previousLastSlot = this.data.lastSlot;
    this.data.slots[slot] = null;
    if (this.data.lastSlot === slot) this.data.lastSlot = null;
    if (this._saveSaves()) return true;
    this.data.slots[slot] = previousSlot;
    this.data.lastSlot = previousLastSlot;
    return false;
  },

  getQuickSave() { return this.data.slots[0]; },
  quickSave(snapshot) { return this.save(0, snapshot); },

  /* ============ 结局图鉴 ============ */
  _loadEndings() {
    this.endings = createDefaultEndings();
    try {
      const raw = localStorage.getItem(ENDINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.unlocked)) throw new Error("结局结构无效");
        this.endings.unlocked = parsed.unlocked.filter(id => typeof id === "string");
        this.endings.count = this.endings.unlocked.length;
      }
    } catch (e) { this.endings = createDefaultEndings(); }
  },

  unlockEnding(endingId) {
    if (typeof endingId !== "string") return false;
    if (!Array.isArray(this.endings.unlocked)) this.endings = createDefaultEndings();
    if (!this.endings.unlocked.includes(endingId)) {
      this.endings.unlocked.push(endingId);
      this.endings.count = this.endings.unlocked.length;
      if (this._write(ENDINGS_KEY, JSON.stringify(this.endings))) return true;
      this.endings.unlocked.pop();
      this.endings.count = this.endings.unlocked.length;
    }
    return false;
  },

  isEndingUnlocked(endingId) { return this.endings.unlocked.includes(endingId); },

  /* ============ 关键词收集 ============ */
  ...unlockListStore(KEYWORDS_KEY, "getKeywords", "unlockKeyword", "isKeywordUnlocked"),

  /* ============ CG 图鉴 ============ */
  ...unlockListStore(CG_KEY, "getCGs", "unlockCG", "isCGUnlocked"),

  /* ============ 信件回执 ============ */
  ...recordStore(LETTERS_KEY, "Letter", ["answers"],
    { list: "getLetters", save: "saveLetter", one: "getLetter" }),

  /* ============ 全局标记（多周目） ============ */
  getFlags() {
    return this._read(FLAGS_KEY, {}, v => v && typeof v === "object" && !Array.isArray(v));
  },

  setFlag(key, value) {
    const flags = this.getFlags();
    const previous = flags[key];
    flags[key] = value;
    if (this._write(FLAGS_KEY, JSON.stringify(flags))) return true;
    if (previous === undefined) delete flags[key]; else flags[key] = previous;
    return false;
  },

  getFlag(key, def) {
    const v = this.getFlags()[key];
    return v === undefined ? def : v;
  },

  /* ============ 设置 ============ */
  _loadSettings() {
    this.settings = createDefaultSettings();
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = normalizeSettings(parsed);
      }
    } catch (e) { /* 用默认 */ }
  },

  saveSettings() {
    const previous = this.settings;
    this.settings = normalizeSettings(this.settings);
    if (this._write(SETTINGS_KEY, JSON.stringify(this.settings))) return true;
    this.settings = previous;
    return false;
  },

  updateSetting(key, value) {
    if (!isKnownSetting(key)) return false;
    const candidate = Object.assign({}, this.settings, { [key]: value });
    if (key in NUMERIC_SETTING_RANGES && (typeof value !== "number" || !Number.isFinite(value))) return false;
    if ((key === "particles" || key === "bgm") && typeof value !== "boolean") return false;
    const previous = this.settings;
    this.settings = normalizeSettings(candidate);
    if (this._write(SETTINGS_KEY, JSON.stringify(this.settings))) return true;
    this.settings = previous;
    return false;
  },

  /* ============ 合成关键词 ============ */
  getComposed() {
    return this._read(COMPOSED_KEY, [], Array.isArray);
  },
  composeKeyword(a, b, recipe) {
    const list = this.getComposed();
    if (!list.includes(recipe)) {
      list.push(recipe);
      return this._write(COMPOSED_KEY, JSON.stringify(list));
    }
    return false;
  },
  isComposed(recipe) { return this.getComposed().includes(recipe); },

  /* ============ 记忆片段（循环） ============ */
  getMemories() {
    return this._read(MEMORIES_KEY, [], Array.isArray);
  },
  saveMemory(memoryId, text) {
    const list = this.getMemories();
    if (!list.find(m => m.id === memoryId)) {
      list.push({ id: memoryId, text, ts: Date.now() });
      return this._write(MEMORIES_KEY, JSON.stringify(list));
    }
    return false;
  },
  isMemoryUnlocked(memoryId) {
    return !!this.getMemories().find(m => m.id === memoryId);
  },

  /* ============ 环境线索（背景可点击） ============ */
  ...unlockListStore(CLUES_KEY, "getClues", "markClueFound", "isClueFound"),

  /* ============ 收件箱（角色主动来信） ============ */
  getInbox() {
    return this._read(INBOX_KEY, [], Array.isArray);
  },
  saveInbox(msg) {
    const list = this.getInbox();
    if (!list.find(m => m.id === msg.id)) {
      list.push(Object.assign({ ts: Date.now(), read: false, replied: null, expired: false }, msg));
      return this._write(INBOX_KEY, JSON.stringify(list));
    }
    return false;
  },
  markInboxRead(id) {
    const list = this.getInbox();
    const m = list.find(x => x.id === id);
    if (!m || m.read) return false;
    m.read = true;
    if (this._write(INBOX_KEY, JSON.stringify(list))) return true;
    m.read = false;
    return false;
  },
  markInboxReplied(id, value) {
    const list = this.getInbox();
    const m = list.find(x => x.id === id);
    if (!m) return false;
    const previous = { replied: m.replied, read: m.read };
    m.replied = value; m.read = true;
    if (this._write(INBOX_KEY, JSON.stringify(list))) return true;
    Object.assign(m, previous);
    return false;
  },
  markInboxExpired(id) {
    const list = this.getInbox();
    const m = list.find(x => x.id === id);
    if (!m || m.replied !== null || m.expired) return false;
    m.expired = true;
    if (this._write(INBOX_KEY, JSON.stringify(list))) return true;
    m.expired = false;
    return false;
  },
  inboxUnreadCount() {
    return this.getInbox().filter(m => !m.read).length;
  },

  /* ============ 朋友圈动态 ============ */
  getMoments() {
    return this._read(MOMENTS_KEY, [], Array.isArray);
  },
  addMoment(id) {
    const list = this.getMoments();
    if (!list.includes(id)) {
      list.push({ id, ts: Date.now() });
      return this._write(MOMENTS_KEY, JSON.stringify(list));
    }
    return false;
  },
  isMomentPublished(id) { return this.getMoments().some(m => m.id === id); },
  getLikedMoments() {
    return this._read(MOMENT_LIKES_KEY, [], Array.isArray);
  },
  toggleLikeMoment(id) {
    const list = this.getLikedMoments();
    const i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
      return this._write(MOMENT_LIKES_KEY, JSON.stringify(list)) ? false : null;
    }
    list.push(id);
    return this._write(MOMENT_LIKES_KEY, JSON.stringify(list)) ? true : null;
  },
  getMomentComments() {
    return this._read(MOMENT_COMMENTS_KEY, {}, v => v && typeof v === "object" && !Array.isArray(v));
  },
  addMomentComment(id, value) {
    const all = this.getMomentComments();
    if (!all[id]) all[id] = [];
    if (!all[id].includes(value)) {
      all[id].push(value);
      if (this._write(MOMENT_COMMENTS_KEY, JSON.stringify(all))) return true;
      all[id].pop();
      return false;
    }
    return false;
  },

  /* ============ 梦境碎片 ============ */
  getDreamShards() {
    return this._read(DREAM_KEY, [], Array.isArray);
  },
  addDreamShard(id, text) {
    const list = this.getDreamShards();
    if (!list.find(s => s.id === id)) {
      list.push({ id, text, ts: Date.now() });
      return this._write(DREAM_KEY, JSON.stringify(list));
    }
    return false;
  },
  isDreamShardFound(id) { return this.getDreamShards().some(s => s.id === id); },

  /* ============ 性格画像 ============ */
  getPersonality() {
    return this._read(PERSONALITY_KEY, { brave: 0, kind: 0, active: 0, honest: 0 },
      v => v && typeof v === "object" && !Array.isArray(v));
  },
  addPersonality(dim, delta) {
    const p = this.getPersonality();
    const previous = p[dim] || 0;
    p[dim] = (p[dim] || 0) + delta;
    if (this._write(PERSONALITY_KEY, JSON.stringify(p))) return true;
    p[dim] = previous;
    return false;
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
  ...recordStore(DOODLE_KEY, "Doodle", ["mood", "stats"],
    { list: "getDoodles", save: "saveDoodle", one: "getDoodle" }),

  /* ============ 拼贴诗 ============ */
  ...recordStore(COLLAGE_KEY, "Collage", ["words", "poem", "score", "tag"],
    { list: "getCollages", save: "saveCollage", one: "getCollage" }),

  /* ============ 回声台词（玩家说过的重要台词） ============ */
  getEchoes() {
    return this._read(ECHO_KEY, [], Array.isArray);
  },
  saveEcho(echoId, text, ctx) {
    const list = this.getEchoes();
    if (!list.find(e => e.id === echoId)) {
      list.push({ id: echoId, text, ctx: ctx || "", ts: Date.now() });
      return this._write(ECHO_KEY, JSON.stringify(list));
    }
    return false;
  },
  isEchoSaved(echoId) { return this.getEchoes().some(e => e.id === echoId); },
  getEcho(echoId) { return this.getEchoes().find(e => e.id === echoId); },
  acknowledgeEcho(echoId, choice) {
    const list = this.getEchoes();
    const e = list.find(x => x.id === echoId);
    if (!e) return false;
    const previous = e.acknowledged;
    e.acknowledged = choice;
    if (this._write(ECHO_KEY, JSON.stringify(list))) return true;
    if (previous === undefined) delete e.acknowledged; else e.acknowledged = previous;
    return false;
  },

  /* ============ 摄影构图 ============ */
  ...recordStore(PHOTO_KEY, "Photo", ["composition", "score", "tag"],
    { list: "getPhotos", save: "savePhoto", one: "getPhoto" }),

  /* ============ 节奏敲击 ============ */
  ...recordStore(RHYTHM_KEY, "Rhythm", ["hits", "accuracy", "tag"],
    { list: "getRhythms", save: "saveRhythm", one: "getRhythm" }),

  /* ============ v0.7.0 气味收集 ============ */
  // 气味卡结构：{ id, name, desc, scene, ts }
  getScents() {
    return this._read(SCENT_KEY, { collected: {}, recalled: {} },
      v => v && typeof v === "object" && !Array.isArray(v)
        && v.collected && typeof v.collected === "object" && !Array.isArray(v.collected)
        && v.recalled && typeof v.recalled === "object" && !Array.isArray(v.recalled));
  },
  collectScent(scent) {
    const all = this.getScents();
    if (all.collected[scent.id]) return false; // 已收集过
    all.collected[scent.id] = { ...scent, ts: Date.now() };
    return this._write(SCENT_KEY, JSON.stringify(all)); // true 表示新收集
  },
  isScentCollected(id) { return !!this.getScents().collected[id]; },
  // 闪回触发：用 scentId 关联已收集的气味
  markScentRecalled(scentId, recallId) {
    const all = this.getScents();
    if (!all.recalled[scentId]) all.recalled[scentId] = [];
    if (!all.recalled[scentId].includes(recallId)) {
      all.recalled[scentId].push(recallId);
      return this._write(SCENT_KEY, JSON.stringify(all));
    }
    return false;
  },
  isScentRecalled(scentId, recallId) {
    const r = this.getScents().recalled[scentId] || [];
    return r.includes(recallId);
  },

  /* ============ v0.7.0 沉默选择 ============ */
  // 记录每个沉默节点的最终选择：{ nodeId: { choice, silent, ts } }
  ...recordStore(SILENCE_KEY, "Silence", ["choice", "silent"]),
  getSilentCount() {
    const all = this.getSilenceRecords();
    return Object.values(all).filter(r => r.silent).length;
  },

  /* ============ v0.7.0 触觉关怀 ============ */
  // 记录每次触觉关怀的部位：{ nodeId: { parts: [], ts } }
  getTouchRecords() {
    return this._read(TOUCH_KEY, {}, v => v && typeof v === "object" && !Array.isArray(v));
  },
  saveTouchRecord(nodeId, partId, partLabel) {
    const all = this.getTouchRecords();
    if (!all[nodeId]) all[nodeId] = { parts: [], ts: Date.now() };
    if (!all[nodeId].parts.some(p => p.id === partId)) {
      all[nodeId].parts.push({ id: partId, label: partLabel });
      all[nodeId].ts = Date.now();
      return this._write(TOUCH_KEY, JSON.stringify(all));
    }
    return false;
  },
  getTouchRecord(nodeId) { return this.getTouchRecords()[nodeId]; },

  /* ============ v0.7.0 温度感知 ============ */
  // 记录每个温度节点的最终温度：{ nodeId: { temp, tag, ts } }
  ...recordStore(TEMPERATURE_KEY, "Temperature", ["temp", "tag"]),
  getCurrentTemperature() {
    const all = this.getTemperatureRecords();
    const vals = Object.values(all);
    if (!vals.length) return 0; // 默认常温
    return vals[vals.length - 1].temp;
  },

  /* ============ v0.8.0 占卜抽牌 ============ */
  // 记录每次占卜的三张牌：{ nodeId: { past, present, future, combo, ts } }
  ...recordStore(TAROT_KEY, "Tarot", ["past", "present", "future", "combo"]),
  getLastTarotCombo() {
    const all = this.getTarotRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1].combo;
  },

  /* ============ v0.8.0 梦境编织 ============ */
  // 记录每次拼接的顺序：{ nodeId: { sequence: [], meaning, tag, ts } }
  ...recordStore(DREAMWEAVE_KEY, "Dreamweave", ["sequence", "meaning", "tag"]),

  /* ============ v0.8.0 笔迹选择 ============ */
  // 记录每次写信的笔迹：{ nodeId: { style, label, ts } }
  ...recordStore(HANDWRITING_KEY, "Handwriting", ["style", "label"]),
  getLastHandwriting() {
    const all = this.getHandwritingRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1].style;
  },

  /* ============ v0.8.0 情绪光谱 ============ */
  // 记录每次选择的情绪点：{ nodeId: { x, y, tag, ts } }
  // x: -100(不悦)~+100(愉悦)，y: -100(平静)~+100(激活)
  ...recordStore(SPECTRUM_KEY, "Spectrum", ["x", "y", "tag"]),
  getLastSpectrum() {
    const all = this.getSpectrumRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1];
  },

  /* ============ v0.9.0 星座连线 ============ */
  // 记录每次连星的顺序：{ nodeId: { sequence: [], tag, ts } }
  ...recordStore(CONSTELLATION_KEY, "Constellation", ["sequence", "tag"]),

  /* ============ v0.9.0 心声听诊 ============ */
  // 记录每次心跳同步：{ nodeId: { hits, total, accuracy, tag, ts } }
  ...recordStore(STETHOSCOPE_KEY, "Stethoscope", ["hits", "total", "accuracy", "tag"]),

  /* ============ v0.9.0 信物拼图 ============ */
  // 记录每次拼图顺序：{ nodeId: { sequence: [], tag, ts } }
  ...recordStore(PUZZLE_KEY, "Puzzle", ["sequence", "tag"]),

  /* ============ v0.9.0 气味调香 ============ */
  // 记录每次调香配方：{ nodeId: { notes: { 前, 中, 后 }, tag, ts } }
  ...recordStore(PERFUME_KEY, "Perfume", ["notes", "tag"]),
  getLastPerfume() {
    const all = this.getPerfumeRecords();
    const vals = Object.values(all);
    if (!vals.length) return null;
    return vals[vals.length - 1];
  },

  /* ============ v1.0.0 呼吸引导 ============ */
  // 记录每次呼吸：{ nodeId: { cycles, avgSync, tag, ts } }
  ...recordStore(BREATH_KEY, "Breath", ["cycles", "avgSync", "tag"]),

  /* ============ v1.0.0 时光胶囊 ============ */
  // 记录每次写的胶囊：{ nodeId: { message, deliverAt, delivered, tag, ts } }
  // deliverAt 是未来某节点 id；delivered 标记是否已投递
  ...recordStore(TIMECAPSULE_KEY, "Timecapsule", ["message", "deliverAt", ["delivered", false], "tag"]),
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
      this._write(TIMECAPSULE_KEY, JSON.stringify(all));
    }
  },

  /* ============ v1.0.0 信纸折痕 ============ */
  // 记录每次折纸顺序：{ nodeId: { sequence: [], tag, ts } }
  ...recordStore(FOLD_KEY, "Fold", ["sequence", "tag"]),

  /* ============ v1.0.0 倒影对齐 ============ */
  // 记录每次对齐结果：{ nodeId: { offsetX, accuracy, tag, ts } }
  ...recordStore(REFLECTION_KEY, "Reflection", ["offsetX", "accuracy", "tag"]),

  /* ============ v1.1.0 光影描绘 ============ */
  // 记录每次描绘：{ nodeId: { litTargets: [...], coverage, tag, ts } }
  ...recordStore(LIGHTDRAW_KEY, "Lightdraw", ["litTargets", "coverage", "tag"]),

  /* ============ v1.1.0 声音模仿 ============ */
  // 记录每次模仿：{ nodeId: { pitch, tempo, diff, tag, ts } }
  ...recordStore(MIMIC_KEY, "Mimic", ["pitch", "tempo", "diff", "tag"]),

  /* ============ v1.1.0 季节切换 ============ */
  // 记录每次季节选择：{ nodeId: { chosenSeason, isTarget, tag, ts } }
  ...recordStore(SEASON_KEY, "Season", ["chosenSeason", "isTarget", "tag"]),

  /* ============ v1.1.0 脉搏同步 ============ */
  // 记录每次脉搏同步：{ nodeId: { hits, total, accuracy, tag, ts } }
  ...recordStore(PULSE_KEY, "Pulse", ["hits", "total", "accuracy", "tag"]),

  /* ============ v1.2.0 茶席品茗 ============ */
  // 记录每次泡茶：{ nodeId: { temp, amount, time, diff, tag, ts } }
  ...recordStore(TEA_KEY, "Tea", ["temp", "amount", "time", "diff", "tag"]),

  /* ============ v1.2.0 星象观测 ============ */
  // 记录每次星象对齐：{ nodeId: { angle, diff, tag, ts } }
  ...recordStore(ASTRONOMY_KEY, "Astronomy", ["angle", "diff", "tag"]),

  /* ============ v1.2.0 颜料调配 ============ */
  // 记录每次调色：{ nodeId: { r, g, b, diff, tag, ts } }
  ...recordStore(PALETTE_KEY, "Palette", ["r", "g", "b", "diff", "tag"]),

  /* ============ v1.2.0 琴键演奏 ============ */
  // 记录每次演奏：{ nodeId: { sequence, correct, total, accuracy, tag, ts } }
  ...recordStore(PIANO_KEY, "Piano", ["sequence", "correct", "total", "accuracy", "tag"]),

  /* ============ v1.3.0 占星骰子 ============ */
  // 记录每次掷骰：{ nodeId: { dice:[a,b,c], sum, tag, ts } }
  ...recordStore(DICE_KEY, "Dice", ["dice", "sum", "tag"]),

  /* ============ v1.3.0 风向感知 ============ */
  // 记录每次航行：{ nodeId: { progress, attempts, tag, ts } }
  ...recordStore(WIND_KEY, "Wind", ["progress", "attempts", "tag"]),

  /* ============ v1.3.0 梦境解码 ============ */
  // 记录每次解码：{ nodeId: { answer, correct, tag, ts } }
  ...recordStore(DECODE_KEY, "Decode", ["answer", "correct", "tag"]),

  /* ============ v1.3.0 雨滴节奏 ============ */
  // 记录每次雨滴：{ nodeId: { hits, total, accuracy, tag, ts } }
  ...recordStore(RAIN_KEY, "Rain", ["hits", "total", "accuracy", "tag"]),

  /* ============ v1.4.0 拓印 ============ */
  // 记录每次拓印：{ nodeId: { coverage, tag, ts } }
  ...recordStore(RUBBING_KEY, "Rubbing", ["coverage", "tag"]),

  /* ============ v1.4.0 集字 ============ */
  // 记录每次集字：{ nodeId: { collected, total, accuracy, tag, ts } }
  ...recordStore(COLLECT_KEY, "Collect", ["collected", "total", "accuracy", "tag"]),

  /* ============ v1.4.0 光影对焦 ============ */
  // 记录每次对焦：{ nodeId: { focus, diff, tag, ts } }
  ...recordStore(FOCUS_KEY, "Focus", ["focus", "diff", "tag"]),

  /* ============ v1.4.0 气味记忆 ============ */
  // 记录每次气味记忆：{ nodeId: { correct, total, tag, ts } }
  ...recordStore(SCENTMEM_KEY, "Scentmem", ["correct", "total", "tag"]),

  /* ============ v1.5.0 茶渍占卜 ============ */
  // { nodeId: { shape, score, tag, ts } }
  ...recordStore(TEALEAF_KEY, "Tealeaf", ["shape", "score", "tag"]),

  /* ============ v1.5.0 影子对齐 ============ */
  // { nodeId: { overlap, tag, ts } }
  ...recordStore(SHADOW_KEY, "Shadow", ["overlap", "tag"]),

  /* ============ v1.5.0 烛火守护 ============ */
  // { nodeId: { survived, total, ratio, tag, ts } }
  ...recordStore(CANDLE_KEY, "Candle", ["survived", "total", "ratio", "tag"]),

  /* ============ v1.5.0 电话拨号 ============ */
  // { nodeId: { dialed, target, correct, tag, ts } }
  ...recordStore(DIAL_KEY, "Dial", ["dialed", "target", "correct", "tag"]),

  /* ============ v1.6.0 雾窗描绘 ============ */
  // { nodeId: { coverage, shape, tag, ts } }
  ...recordStore(FOGGY_KEY, "Foggy", ["coverage", "shape", "tag"]),

  /* ============ v1.6.0 糖块拼图 ============ */
  // { nodeId: { placed, total, tag, ts } }
  ...recordStore(SUGAR_KEY, "Sugar", ["placed", "total", "tag"]),

  /* ============ v1.6.0 钟调共振 ============ */
  // { nodeId: { diff, tag, ts } }
  ...recordStore(CHIME_KEY, "Chime", ["diff", "tag"]),

  /* ============ v1.6.0 沙漏计时 ============ */
  // { nodeId: { error, tag, ts } }
  ...recordStore(HOURGLASS_KEY, "Hourglass", ["error", "tag"]),

  /* ============ v1.7.0 风筝引线 ============ */
  // { nodeId: { match, tag, ts } }
  ...recordStore(KITE_KEY, "Kite", ["match", "tag"]),

  /* ============ v1.7.0 密码锁 ============ */
  // { nodeId: { code, target, correct, tag, ts } }
  ...recordStore(LOCK_KEY, "Lock", ["code", "target", "correct", "tag"]),

  /* ============ v1.7.0 折纸造型 ============ */
  // { nodeId: { steps, tag, ts } }
  ...recordStore(ORIGAMI_KEY, "Origami", ["steps", "tag"]),

  /* ============ v1.7.0 星轨追踪 ============ */
  // { nodeId: { error, tag, ts } }
  ...recordStore(ORBIT_KEY, "Orbit", ["error", "tag"]),

  /* ============ v1.8.0 萤火引路 ============ */
  // { nodeId: { gathered, total, deviation, tag, ts } }
  ...recordStore(FIREFLY_KEY, "Firefly", ["gathered", "total", "deviation", "tag"]),

  /* ============ v1.8.0 风铃调音 ============ */
  // { nodeId: { matched, total, deviation, tag, ts } }
  ...recordStore(WINDCHIME_KEY, "Windchime", ["matched", "total", "deviation", "tag"]),

  /* ============ v1.8.0 瓶中信 ============ */
  // { nodeId: { power, reached, tag, ts } }
  ...recordStore(BOTTLE_KEY, "Bottle", ["power", "reached", "tag"]),

  /* ============ v1.8.0 回声定位 ============ */
  // { nodeId: { estimate, actual, error, tag, ts } }
  ...recordStore(ECHOLOC_KEY, "Echoloc", ["estimate", "actual", "error", "tag"]),

  /* ============ v1.9.0 罗盘导航 ============ */
  // { nodeId: { angle, target, error, tag, ts } }
  ...recordStore(COMPASS_KEY, "Compass", ["angle", "target", "error", "tag"]),

  /* ============ v1.9.0 密码电报 ============ */
  // { nodeId: { code, choice, correct, tag, ts } }
  ...recordStore(TELEGRAPH_KEY, "Telegraph", ["code", "choice", "correct", "tag"]),

  /* ============ v1.9.0 天平称重 ============ */
  // { nodeId: { left, right, diff, tag, ts } }
  ...recordStore(BALANCE_KEY, "Balance", ["left", "right", "diff", "tag"]),

  /* ============ v1.9.0 钟摆节奏 ============ */
  // { nodeId: { clickAt, targetAt, error, tag, ts } }
  ...recordStore(PENDULUM_KEY, "Pendulum", ["clickAt", "targetAt", "error", "tag"]),

  /* ============ v2.0.0 节拍器同步 ============ */
  // { nodeId: { hits, total, accuracy, tag, ts } }
  ...recordStore(METRONOME_KEY, "Metronome", ["hits", "total", "accuracy", "tag"]),

  /* ============ v2.0.0 星图连线 ============ */
  // { nodeId: { sequence, matched, total, tag, ts } }
  ...recordStore(STARCHART_KEY, "Starchart", ["sequence", "matched", "total", "tag"]),

  /* ============ v2.0.0 透镜聚焦 ============ */
  // { nodeId: { focus, target, error, tag, ts } }
  ...recordStore(LENS_KEY, "Lens", ["focus", "target", "error", "tag"]),

  /* ============ v2.0.0 弦音调音 ============ */
  // { nodeId: { stringIdx, tension, diff, tag, ts } }
  ...recordStore(TUNING_KEY, "Tuning", ["stringIdx", "tension", "diff", "tag"]),

  /* ============ v2.1.0 日蚀对位 ============ */
  // { nodeId: { moon, target, error, tag, ts } }
  ...recordStore(ECLIPSE_KEY, "Eclipse", ["moon", "target", "error", "tag"]),

  /* ============ v2.1.0 印章对齐 ============ */
  // { nodeId: { angle, target, error, tag, ts } }
  ...recordStore(STAMP_KEY, "Stamp", ["angle", "target", "error", "tag"]),

  /* ============ v2.1.0 星盘仪 ============ */
  // { nodeId: { angles, targets, avgError, tag, ts } }
  ...recordStore(ASTROLABE_KEY, "Astrolabe", ["angles", "targets", "avgError", "tag"]),

  /* ============ v2.1.0 沙画凝形 ============ */
  // { nodeId: { grid, matched, total, tag, ts } }
  ...recordStore(SANDPAINT_KEY, "Sandpaint", ["grid", "matched", "total", "tag"]),

  /* ============ v2.2.0 万花筒 ============ */
  // { nodeId: { angle, target, error, tag, ts } }
  ...recordStore(KALEIDO_KEY, "Kaleido", ["angle", "target", "error", "tag"]),

  /* ============ v2.2.0 算盘珠 ============ */
  // { nodeId: { counts, targets, diff, tag, ts } }
  ...recordStore(ABACUS_KEY, "Abacus", ["counts", "targets", "diff", "tag"]),

  /* ============ v2.2.0 齿轮咬合 ============ */
  // { nodeId: { angles, targets, avgError, tag, ts } }
  ...recordStore(GEAR_KEY, "Gear", ["angles", "targets", "avgError", "tag"]),

  /* ============ v2.2.0 等高线 ============ */
  // { nodeId: { points, matched, total, tag, ts } }
  ...recordStore(TOPO_KEY, "Topo", ["points", "matched", "total", "tag"]),

  /* ============ v2.3.0 日晷对时 ============ */
  // { nodeId: { angle, target, error, tag, ts } }
  ...recordStore(SUNDIAL_KEY, "Sundial", ["angle", "target", "error", "tag"]),

  /* ============ v2.3.0 染缸调色 ============ */
  // { nodeId: { rgb, target, diff, tag, ts } }
  ...recordStore(DYE_KEY, "Dye", ["rgb", "target", "diff", "tag"]),

  /* ============ v2.3.0 风车叶片 ============ */
  // { nodeId: { angles, target, avgError, tag, ts } }
  ...recordStore(WINDMILL_KEY, "Windmill", ["angles", "target", "avgError", "tag"]),

  /* ============ v2.3.0 经纬编织 ============ */
  // { nodeId: { grid, matched, total, tag, ts } }
  ...recordStore(WEAVE_KEY, "Weave", ["grid", "matched", "total", "tag"]),

  /* ============ v2.4.0 镜面对称 ============ */
  // { nodeId: { grid, matched, total, tag, ts } }
  ...recordStore(MIRROR_KEY, "Mirror", ["grid", "matched", "total", "tag"]),

  /* ============ v2.4.0 灯笼排列 ============ */
  // { nodeId: { order, target, matched, tag, ts } }
  ...recordStore(LANTERN_KEY, "Lantern", ["order", "target", "matched", "tag"]),

  /* ============ v2.4.0 水波纹 ============ */
  // { nodeId: { clicks, target, error, tag, ts } }
  ...recordStore(RIPPLE_KEY, "Ripple", ["clicks", "target", "error", "tag"]),

  /* ============ v2.4.0 马赛克拼图 ============ */
  // { nodeId: { grid, matched, total, tag, ts } }
  ...recordStore(MOSAIC_KEY, "Mosaic", ["grid", "matched", "total", "tag"]),

  /* ============ v2.5.0 碑帖拼合 ============ */
  // { nodeId: { placed, target, matched, tag, ts } }
  ...recordStore(STELE_KEY, "Stele", ["placed", "target", "matched", "tag"]),

  /* ============ v2.5.0 星轨推演 ============ */
  // { nodeId: { positions, target, error, tag, ts } }
  ...recordStore(CELESTIAL_KEY, "Celestial", ["positions", "target", "error", "tag"]),

  /* ============ v2.5.0 节拍鼓点 ============ */
  // { nodeId: { hits, target, matched, tag, ts } }
  ...recordStore(DRUM_KEY, "Drum", ["hits", "target", "matched", "tag"]),

  /* ============ v2.5.0 风向标 ============ */
  // { nodeId: { angle, target, error, tag, ts } }
  ...recordStore(VANE_KEY, "Vane", ["angle", "target", "error", "tag"]),

  /* ============ v2.6.0 漏刻计时 ============ */
  // { nodeId: { stopTime, target, error, tag, ts } }
  ...recordStore(CLEPSYDRA_KEY, "Clepsydra", ["stopTime", "target", "error", "tag"]),

  /* ============ v2.6.0 拼图归位 ============ */
  // { nodeId: { placed, target, matched, tag, ts } }
  ...recordStore(JIGSAW_KEY, "Jigsaw", ["placed", "target", "matched", "tag"]),

  /* ============ v2.6.0 棋局推演 ============ */
  // { nodeId: { moves, target, matched, tag, ts } }
  ...recordStore(CHESS_KEY, "Chess", ["moves", "target", "matched", "tag"]),

  /* ============ v2.6.0 旗阵辨识 ============ */
  // { nodeId: { selected, target, matched, tag, ts } }
  ...recordStore(FLAG_KEY, "Flag", ["selected", "target", "matched", "tag"]),

  /* ============ v2.7.3 后日谈时间线 ============ */
  // { nodeId: { order: [], correct, tag, ts } }
  ...recordStore(TIMELINE_KEY, "Timeline", ["order", "correct", "tag"]),

  /* ============ v2.7.3 后日谈回信分拣 ============ */
  // { nodeId: { assignment: { noteId: replyId }, correct, tag, ts } }
  ...recordStore(TRIAGE_KEY, "Triage", ["assignment", "correct", "tag"]),

  /* ============ v2.7.4 后日谈留言墙 ============ */
  // { nodeId: { assignment: { noteId: binId }, correct, tag, ts } }
  ...recordStore(WALL_KEY, "Wall", ["assignment", "correct", "tag"]),

  /* ============ v2.7.6 后日谈校刊校对 ============ */
  // { nodeId: { assignment: { cardId: binId }, correct, tag, ts } }
  ...recordStore(PROOFREAD_KEY, "Proofread", ["assignment", "correct", "tag"]),

  /* ============ 工具 ============ */
  formatTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  clearAll() {
    // 复用 GAME_STORAGE_KEYS，避免与上方清单重复维护（此前两处各列 100 多项，易漏键）
    const keys = [META_KEY, ...GAME_STORAGE_KEYS];
    let success = true;
    keys.forEach((key) => {
      if (!this._remove(key)) success = false;
    });
    this.cache.clear();
    this._loadSaves();
    this._loadEndings();
    this._loadSettings();
    this._migrate();
    return success;
  },
};

Saves.init();

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", (event) => {
    if (event.key) Saves.cache.delete(event.key);
    else Saves.cache.clear();
  });
}
