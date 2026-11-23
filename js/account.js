/* ========================================
   樱时信笺 · 账号与云存档界面（js/account.js）
   设计原则：
   1) 账号是可选增强：账号服务不可用时游戏照常离线玩，只在设置页提示；
   2) 云同步整包上传 Saves.exportData()（9 个本地槽 + 图鉴/关键词/设置等），
      与现有「导出 JSON / 导入 JSON」共用同一套结构；
   3) 冲突必须由用户选择：云端覆盖本机 / 本机覆盖云端，不做静默覆盖；
   4) 所有请求同源 Cookie（HttpOnly），非 GET 带 X-Requested-With。

   v3.4.55 数据安全（修复四条实测可复现的存档丢失 / 串号路径）：
   5) 用本机覆盖云端前先比「进度量」：本机没有存档、或收集进度比云端少时，
      自动同步与手动上传都必须停下来让玩家选择（与服务端两道保护同口径）；
   6) 本机存档记归属：换账号登录时，属于别的账号的存档不会被自动上传；
      退出登录可选「一并清除本机存档」；
   7) 只有本机存档真的有变化才上传；两次上传至少间隔 60 秒；
      页面转入后台或关闭时立即上传（带 keepalive），不再依赖会被浏览器冻结的定时器；
   8) 自动同步失败一律显示在面板上（原先只处理「冲突」，限流与登录过期都被吞掉）；
   9) 云端保留历史版本，可恢复到本机。
   ======================================== */
(function () {
  "use strict";

  // v3.4.55：账号功能由部署决定。content="off"（或没有这个 meta）= 本部署不含账号服务——
  // 不发任何请求、设置页不显示账号区块。此前无论有没有后端都会探测 /api/health，
  // 纯静态部署上每个玩家打开设置页都会多一次 404。
  const rootMeta = document.querySelector('meta[name="gayme-account-api"]');
  const metaValue = rootMeta && rootMeta.content != null ? String(rootMeta.content).trim() : "off";
  // 从本地文件直接打开（file:）时没有同源接口可用，同样视为关闭
  const ACCOUNT_ENABLED = metaValue !== "off" && location.protocol !== "file:";
  const API_PREFIX = ACCOUNT_ENABLED ? metaValue.replace(/\/+$/, "") : "";
  const META_KEY = (username) => `gayme_cloud_meta:${username}`;
  const AUTOSYNC_KEY = "gayme_account_autosync";
  const OWNER_KEY = "gayme_local_owner";       // v3.4.55：本机存档属于哪个账号（用户名小写）
  const DIRTY_KEY = "gayme_cloud_dirty";       // v3.4.55：本机存档自上次成功同步后有没有变化
  const REQUEST_TIMEOUT = 15000;
  const UPLOAD_TIMEOUT = 30000;
  const DEBOUNCE_MS = 5000;                    // 存档变化后等多久上传
  const KEEPALIVE_MAX_BYTES = 60 * 1024;       // 带 keepalive 的请求体上限（浏览器约定约 64KB，留余量）
  // v3.4.55 可调参数（测试可经 AccountUI._tune 覆盖）
  const tune = { minUploadIntervalMs: 60000 };

  const state = {
    root: null,
    ready: false,
    booting: false,
    health: "unknown",          // unknown | ok | down
    me: null,
    session: null,
    cloud: null,                // 云端元信息 {revision, bytes, updatedAt, progress, ...}
    localMeta: null,            // 本机同步锚点 {revision, updatedAt, syncedAt}
    sessions: [],
    view: "login",              // login | register | recover | registered | account
    message: null,              // {type, text}
    recoveryCode: null,
    conflict: null,             // {serverRevision, serverUpdatedAt, serverBytes}（修订号冲突）
    confirmDownload: false,
    busy: false,
    autoSync: false,
    autoPaused: false,
    autoTimer: null,
    suppressSync: false,
    booted: 0,
    authRev: 0,                 // 防止启动探测的迟到响应覆盖刚完成的登录/注册
    // ---- v3.4.55 ----
    guard: null,                // 数据保护拦下了覆盖：{ code, serverRevision, serverUpdatedAt, cloud, local }
    confirmGuard: null,         // 待玩家确认的强制覆盖（同 guard 结构，另带 force）
    ownerMismatch: null,        // 本机存档属于别的账号时的那个账号名
    confirmLogout: false,
    history: null,              // 历史版本列表（null = 未读取）
    historyKept: null,
    showHistory: false,
    pendingRevision: null,      // 待恢复到本机的历史修订号
    autoError: null,            // 最近一次自动同步失败 { code, text, at }
    dirty: false,               // 本机存档有未上传的变化
    dirtyGen: 0,                // 变化代数：每次存档写入加一，上传成功时据此判断期间有没有新变化
    uploadInFlight: false,
    lastUploadAt: 0,
    clearedLocally: false,      // 设置页点过「清空」：自动同步暂停，直到玩家上传或恢复
    restoredVersion: null,      // 刚恢复到本机的历史修订号：自动同步暂停
  };

  const ERR_TEXT = {
    invalid_username: "用户名需为 3-20 位字母、数字或下划线，且不能纯数字",
    invalid_nickname: "昵称需为 1-24 个字符",
    weak_password: "密码需 8-72 位，且同时包含字母和数字",
    username_taken: "这个用户名已被占用",
    invalid_credentials: "用户名或密码错误",
    locked_out: "失败次数过多，请 15 分钟后再试",
    rate_limited: "操作太频繁，请稍后再试",
    invalid_recovery: "用户名或找回码不正确",
    unauthenticated: "登录已过期，请重新登录",
    save_conflict: "云端存档已被其它设备更新",
    empty_overwrite: "本机没有存档，不能覆盖云端已有的存档",
    progress_shrink: "本机的收集进度比云端少，不能直接覆盖云端",
    saves_too_large: "存档超过云端大小上限，无法上传",
    invalid_saves: "存档格式异常，无法上传",
    save_corrupted: "云端存档损坏，请联系管理员",
    csrf_blocked: "请求被安全策略拦截，请刷新页面重试",
    json_required: "请求格式错误",
    invalid_revision: "同步版本无效，请刷新云端状态",
    no_save: "云端还没有存档",
    no_version: "没有这个历史版本",
    ack_required: "请先确认注销账号",
    internal_error: "服务器开小差了，请稍后再试",
    network: "账号服务连接失败，本地存档不受影响",
  };

  /* ---------- 进度量：与服务端 server/progress.mjs 同口径 ----------
     键名必须与 js/saves.js 顶部的常量一致（tests/static.test.mjs 有契约校验）。 */
  const SAVES_KEY = "sakura_letters_saves_v2";
  const AUTOSAVE_KEY = "sakura_letters_autosave_v2";
  const COLLECT_KEYS = [
    "sakura_letters_endings_v2", "sakura_letters_keywords_v2", "sakura_letters_cg_v2",
    "sakura_letters_clues_v2", "sakura_letters_memories_v2", "sakura_letters_composed_v2",
  ];

  function countEntries(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") {
      if (Array.isArray(value.unlocked)) return value.unlocked.length;
      return Object.keys(value).length;
    }
    return 0;
  }

  // { slots 存档槽数, hasAutosave 有无自动进度, collect 收集进度数, hasProgress }
  function progressOf(records) {
    const rec = records && typeof records === "object" ? records : {};
    const saves = rec[SAVES_KEY];
    const slots = saves && Array.isArray(saves.slots)
      ? saves.slots.filter((slot) => slot && typeof slot === "object").length
      : 0;
    const auto = rec[AUTOSAVE_KEY];
    const hasAutosave = Boolean(auto && typeof auto === "object" && auto.snapshot && typeof auto.snapshot === "object");
    let collect = 0;
    for (const key of COLLECT_KEYS) collect += countEntries(rec[key]);
    return { slots, hasAutosave, collect, hasProgress: slots > 0 || hasAutosave };
  }

  const EMPTY_PROGRESS = Object.freeze({ slots: 0, hasAutosave: false, collect: 0, hasProgress: false });

  // 云端元信息里的进度量（旧版服务端没有这个字段时按「未知」处理，不据此拦截）
  function cloudProgress() {
    const p = state.cloud && state.cloud.progress;
    return p && typeof p === "object" ? p : null;
  }

  function apiBase() {
    if (!ACCOUNT_ENABLED) return null;
    return API_PREFIX; // 空字符串 = 同源
  }

  function errText(code) {
    return ERR_TEXT[code] || ERR_TEXT.network;
  }

  async function request(path, { method = "GET", body = null, timeout = REQUEST_TIMEOUT, keepalive = false } = {}) {
    const base = apiBase();
    if (base == null) throw Object.assign(new Error("offline"), { code: "network" });
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
    const headers = { Accept: "application/json", "X-Requested-With": "gayme-account" };
    const json = body == null ? undefined : JSON.stringify(body);
    if (body != null) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers,
        credentials: "include",
        body: json,
        // keepalive：页面关闭后请求仍能发出。浏览器限制这类请求体约 64KB，超出的退回普通请求
        keepalive: keepalive && json != null && new Blob([json]).size <= KEEPALIVE_MAX_BYTES,
        signal: ctrl ? ctrl.signal : undefined,
      });
    } catch (_) {
      throw Object.assign(new Error("network"), { code: "network" });
    } finally {
      if (timer) clearTimeout(timer);
    }
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error((data && data.error && data.error.code) || `http_${res.status}`);
      err.code = (data && data.error && data.error.code) || `http_${res.status}`;
      err.status = res.status;
      err.data = data && data.error && data.error.data;
      throw err;
    }
    return data;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function fmtTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function bytesText(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function localSaveInfo() {
    try {
      const slots = (Saves.data && Saves.data.slots) || [];
      const filled = slots.filter(Boolean);
      const latest = filled.slice().sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))[0];
      return { count: filled.length, latestTime: latest ? latest.timestamp : null };
    } catch (_) {
      return { count: 0, latestTime: null };
    }
  }

  // 本机进度量：只读相关的那几个键，不走完整的导出流程（导出每次要解析上百个键）
  function localProgress() {
    const records = {};
    for (const key of [SAVES_KEY, AUTOSAVE_KEY, ...COLLECT_KEYS]) {
      try {
        const raw = localStorage.getItem(key);
        records[key] = raw ? JSON.parse(raw) : null;
      } catch (_) {
        records[key] = null;
      }
    }
    return progressOf(records);
  }

  function localMetaKey() {
    return state.me && state.me.username ? META_KEY(state.me.username) : null;
  }

  function loadLocalMeta() {
    const key = localMetaKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function saveLocalMeta(meta) {
    const key = localMetaKey();
    if (!key) return;
    state.localMeta = meta;
    try { localStorage.setItem(key, JSON.stringify(meta)); } catch (_) {}
  }

  function autoSyncEnabled() {
    try { return localStorage.getItem(AUTOSYNC_KEY) === "1"; } catch (_) { return false; }
  }

  function setAutoSyncPreference(on) {
    state.autoSync = on;
    try { localStorage.setItem(AUTOSYNC_KEY, on ? "1" : "0"); } catch (_) {}
  }

  /* ---------- v3.4.55 待同步标记：本机存档自上次成功同步后有没有变化 ---------- */
  function loadDirty() {
    try { return localStorage.getItem(DIRTY_KEY) === "1"; } catch (_) { return false; }
  }
  function markDirty() {
    state.dirty = true;
    state.dirtyGen += 1;
    try { localStorage.setItem(DIRTY_KEY, "1"); } catch (_) {}
  }
  function clearDirty() {
    state.dirty = false;
    try { localStorage.removeItem(DIRTY_KEY); } catch (_) {}
  }

  /* ---------- v3.4.55 本机存档归属 ---------- */
  function currentUsername() {
    return state.me && state.me.username ? String(state.me.username).toLowerCase() : "";
  }
  function currentOwner() {
    try { return String(localStorage.getItem(OWNER_KEY) || "").toLowerCase(); } catch (_) { return ""; }
  }
  function setOwner() {
    const name = currentUsername();
    if (!name) return;
    try { localStorage.setItem(OWNER_KEY, name); } catch (_) {}
  }

  // 登录或注册后调用：判断「这台设备上的存档」与「当前账号」的关系
  function applyOwnerPolicy() {
    if (!state.me) { state.ownerMismatch = null; return; }
    const owner = currentOwner();
    const name = currentUsername();
    if (!owner || owner === name || !localProgress().hasProgress) {
      // 第一次在这台设备上登录，或本机没有存档：本机现有的存档归当前账号
      if (owner !== name) setOwner();
      state.ownerMismatch = null;
      return;
    }
    // 本机存档属于另一个账号：不自动上传，等玩家决定
    state.ownerMismatch = owner;
  }

  function paintMessage() {
    if (!state.root) return;
    let box = state.root.querySelector(".acct-message");
    if (!box) {
      const wrap = document.createElement("div");
      wrap.className = "acct-message";
      state.root.appendChild(wrap);
      box = wrap;
    }
    box.className = "acct-message" + (state.message ? ` ${state.message.type}` : "");
    box.textContent = state.message ? state.message.text : "";
    box.hidden = !state.message;
  }

  function setMessage(text, type = "error") {
    state.message = text ? { type, text } : null;
    if (state.root && state.root.querySelector(".acct-message")) paintMessage();
    else render();
    if (text && type === "ok" && typeof window.flashHint === "function") window.flashHint(text);
  }

  function setBusy(busy) {
    state.busy = busy;
    render();
  }

  function shortUa(ua) {
    const value = String(ua || "");
    if (!value) return "未知设备";
    if (/iPhone|iPad/i.test(value)) return "iPhone / iPad";
    if (/Android/i.test(value)) return "Android";
    if (/Macintosh|Mac OS X/i.test(value)) return "Mac";
    if (/Windows/i.test(value)) return "Windows";
    if (/Firefox/i.test(value)) return "Firefox";
    if (/Edg\//i.test(value)) return "Edge";
    if (/Chrome/i.test(value)) return "Chrome";
    return value.slice(0, 32);
  }

  async function refreshSessions() {
    if (!state.me) return;
    try {
      const data = await request("/api/account/sessions");
      state.sessions = data.sessions || [];
    } catch (_) { state.sessions = []; }
  }

  async function refreshCloud() {
    if (!state.me) return null;
    const data = await request("/api/saves");
    state.cloud = data.save || null;
    return state.cloud;
  }

  async function loadHistory() {
    if (!state.me) return;
    try {
      const data = await request("/api/saves/versions");
      state.history = data.versions || [];
      state.historyKept = data.kept;
    } catch (_) {
      state.history = [];
    }
    if (state.root && state.root.isConnected) render();
  }

  // 登录后发现云端比本机锚点新、且本机有存档 → 修订号冲突，让玩家二选一
  function detectConflict() {
    const cloud = state.cloud;
    if (!(cloud && (!state.localMeta || cloud.revision > state.localMeta.revision))) return;
    if (localSaveInfo().count === 0) return;
    state.conflict = {
      serverRevision: cloud.revision,
      serverUpdatedAt: cloud.updatedAt,
      serverBytes: cloud.bytes,
    };
    state.autoPaused = true;
  }

  async function boot() {
    if (state.booting) return;
    state.booting = true;
    const bootId = ++state.booted;
    // 记录启动时的认证代号：若用户在 /me 返回前就完成注册/登录，旧的启动结果必须丢弃，
    // 否则会把刚显示的找回码界面覆盖回登录页。
    const authRevAtBoot = state.authRev;
    try {
      await request("/api/health", { timeout: 6000 });
      state.health = "ok";
    } catch (_) {
      state.health = "down";
      state.ready = true;
      state.booting = false;
      render();
      return;
    }
    try {
      const data = await request("/api/auth/me");
      if (bootId !== state.booted || authRevAtBoot !== state.authRev) return;
      if (!data.user) {
        state.me = null;
        state.view = "login";
      } else {
        state.me = data.user;
        state.session = data.session;
        state.cloud = data.save || null;
        state.localMeta = loadLocalMeta();
        state.autoSync = autoSyncEnabled();
        state.dirty = loadDirty();
        state.view = "account";
        detectConflict();
        applyOwnerPolicy();
        await refreshSessions();
      }
    } catch (e) {
      if (e.code === "network") state.health = "down";
      else if (e.code === "unauthenticated" || e.code === "http_401") {
        state.me = null;
        state.view = "login";
      }
    }
    state.ready = true;
    state.booting = false;
    if (bootId === state.booted && authRevAtBoot === state.authRev) {
      render();
      // v3.4.55：上次没传完的变化（比如被限流、断网时关了页面）在打开设置页后补传
      scheduleAutoUpload();
    }
  }

  function mount(container) {
    if (!container) return;
    state.root = container;
    if (!ACCOUNT_ENABLED) {
      // 本部署不含账号服务：整个区块不显示，也不发任何请求
      container.hidden = true;
      container.innerHTML = "";
      return;
    }
    container.hidden = false;
    if (state.ready) render();
    else boot();
  }

  function authFrame(title, body) {
    return `<div class="acct-card">
      <div class="acct-head"><div class="acct-avatar">樱</div><div class="acct-id"><div class="acct-name">${esc(title)}</div><div class="acct-sub">账号只在需要跨设备同步时使用，本地存档不受影响</div></div></div>
      ${body}
      <div class="acct-message" hidden></div>
    </div>`;
  }

  function renderGuest() {
    if (state.view === "register") {
      return authFrame("创建账号", `
        <form class="acct-form" data-acct-form="register">
          <label>用户名<input name="username" maxlength="20" required autocomplete="username" placeholder="3-20 位字母、数字或下划线"></label>
          <label>密码<input name="password" type="password" minlength="8" maxlength="72" required autocomplete="new-password" placeholder="至少 8 位，含字母和数字"></label>
          <label>确认密码<input name="confirm" type="password" minlength="8" maxlength="72" required autocomplete="new-password"></label>
          <label>昵称（可选）<input name="nickname" maxlength="24" placeholder="默认使用用户名"></label>
          <div class="acct-actions"><button class="acct-btn primary" type="submit">注册并登录</button><button class="acct-btn" type="button" data-acct-action="tab-login">返回登录</button></div>
          <div class="acct-note">注册成功后会显示一次性找回码，请立即保存；忘记密码时只能靠它重置。</div>
        </form>`);
    }
    if (state.view === "recover") {
      return authFrame("用找回码重置密码", `
        <form class="acct-form" data-acct-form="recover">
          <label>用户名<input name="username" maxlength="20" required autocomplete="username"></label>
          <label>找回码<input name="recoveryCode" maxlength="20" required placeholder="ABCD-EFGH-IJKL"></label>
          <label>新密码<input name="newPassword" type="password" minlength="8" maxlength="72" required autocomplete="new-password"></label>
          <label>确认新密码<input name="confirm" type="password" minlength="8" maxlength="72" required autocomplete="new-password"></label>
          <div class="acct-actions"><button class="acct-btn primary" type="submit">重置密码</button><button class="acct-btn" type="button" data-acct-action="tab-login">返回登录</button></div>
          <div class="acct-note">重置后旧设备全部退出，并生成新的找回码。</div>
        </form>`);
    }
    if (state.view === "registered" && state.recoveryCode) {
      return authFrame("账号已创建", `
        <div class="acct-recovery">
          <div class="acct-note">这是你的一次性找回码，只显示这一次：</div>
          <div class="acct-code">${esc(state.recoveryCode)}</div>
          <div class="acct-actions"><button class="acct-btn" type="button" data-acct-action="copy-recovery">复制找回码</button><button class="acct-btn primary" type="button" data-acct-action="finish-register">${state.me ? "我已保存，进入账号" : "我已保存，去登录"}</button></div>
          <div class="acct-note">忘记密码时，在登录页选择「用找回码重置」，输入用户名和这串码即可。</div>
        </div>`);
    }
    return authFrame("登录账号", `
      <form class="acct-form" data-acct-form="login">
        <label>用户名<input name="username" maxlength="20" required autocomplete="username"></label>
        <label>密码<input name="password" type="password" maxlength="72" required autocomplete="current-password"></label>
        <div class="acct-actions"><button class="acct-btn primary" type="submit">登录</button><button class="acct-btn" type="button" data-acct-action="tab-register">注册新账号</button></div>
      </form>
      <button class="acct-link" type="button" data-acct-action="tab-recover">忘记密码？用找回码重置</button>`);
  }

  /* ---------- 提示文案 ---------- */

  // 本机存档相对云端「不能直接覆盖」的情形（与服务端两道保护同口径）；没有问题返回 null
  function localBlocked(progress) {
    const cloud = cloudProgress();
    if (!cloud || !state.cloud) return null;
    const base = {
      serverRevision: state.cloud.revision,
      serverUpdatedAt: state.cloud.updatedAt,
      cloud,
      local: progress,
    };
    if (cloud.hasProgress && !progress.hasProgress) return { ...base, code: "empty_overwrite" };
    if (progress.collect < cloud.collect) return { ...base, code: "progress_shrink" };
    return null;
  }

  // 服务端拒绝时带回的数据 → 与 localBlocked 相同的结构
  function normalizeGuard(code, data) {
    return {
      code,
      serverRevision: data.serverRevision,
      serverUpdatedAt: data.serverUpdatedAt,
      cloud: data.serverProgress || null,
      local: data.localProgress || null,
    };
  }

  function guardText(guard) {
    const rev = guard.serverRevision != null
      ? `（云端 rev ${guard.serverRevision}${guard.serverUpdatedAt ? " · " + fmtTime(guard.serverUpdatedAt) : ""}）`
      : "";
    if (guard.code === "empty_overwrite") {
      return `本机没有存档，而云端有一份${rev}。直接同步会把云端的存档清空，已暂停自动同步。请选择：`;
    }
    const localCollect = guard.local ? guard.local.collect : 0;
    const cloudCollect = guard.cloud ? guard.cloud.collect : 0;
    return `本机的收集进度比云端少（本机 ${localCollect} 项，云端 ${cloudCollect} 项）${rev}。`
      + "直接同步会让云端多出的内容消失，已暂停自动同步。请选择：";
  }

  function pauseReasonText() {
    if (state.clearedLocally) {
      return "本地存档已清空，自动同步已暂停。云端存档仍在：要找回原来的进度请点「从云端恢复」；"
        + "要用新的进度替换云端，请点「上传到云端」并确认。";
    }
    if (state.restoredVersion != null) {
      return `已把历史版本 rev ${state.restoredVersion} 恢复到本机，自动同步已暂停。`
        + "确认无误后点「上传到云端」同步回云端；要回到最新一版请点「从云端恢复」。";
    }
    if (state.guard) return "自动同步已暂停。" + guardText(state.guard);
    if (state.conflict) {
      return "自动同步已暂停：云端存档已被其它设备更新，请先选择保留哪一份，或关闭后重新开启自动同步。";
    }
    return "自动同步已暂停。请先上传或从云端恢复，或关闭后重新开启自动同步。";
  }

  function renderAccount() {
    const u = state.me;
    const local = localSaveInfo();
    const cloud = state.cloud;
    const cloudRev = cloud ? cloud.revision : 0;
    const conflict = state.conflict;
    const guard = state.guard;
    const cp = cloudProgress();
    const lp = cp ? localProgress() : null;
    const lastSync = state.localMeta && state.localMeta.syncedAt ? fmtTime(state.localMeta.syncedAt) : "尚未同步";
    const busyAttr = state.busy ? "disabled" : "";
    const conflictHint = conflict && cp && lp ? `（本机收集进度 ${lp.collect} 项，云端 ${cp.collect} 项）` : "";
    const historyList = state.showHistory ? `
        <div class="acct-sessions">
          ${state.history === null
            ? '<div class="acct-note">正在读取历史版本…</div>'
            : state.history.length === 0
              ? '<div class="acct-note">还没有历史版本。云端存档每被替换一次，旧的那一份会保存在这里。</div>'
              : state.history.map((v) => `<div class="acct-session">
                  <div class="acct-session-main">修订号 ${v.revision} · ${bytesText(v.bytes)}${v.progress && v.progress.hasProgress
                    ? ` · ${v.progress.slots} 个存档槽 · 收集进度 ${v.progress.collect} 项` : " · 无存档"}</div>
                  <div class="acct-session-sub">被替换于 ${esc(fmtTime(v.createdAt))}</div>
                  <button class="acct-btn small" type="button" data-acct-action="restore-version" data-rev="${v.revision}" ${busyAttr}>恢复到此设备</button>
                </div>`).join("")}
        </div>` : "";
    const downloadText = state.pendingRevision != null
      ? `将把历史版本 rev ${state.pendingRevision} 恢复到本机，覆盖本机全部存档和收集进度；云端存档不变。确定继续？`
      : "云端存档将覆盖本机全部 9 个存档槽和收集进度；当前未保存的进度会丢失。确定继续？";
    return `<div class="acct-card">
      <div class="acct-head">
        <div class="acct-avatar">${esc((u.nickname || u.username).slice(0, 1))}</div>
        <div class="acct-id"><div class="acct-name">${esc(u.nickname || u.username)}</div><div class="acct-sub">@${esc(u.username)} · 注册于 ${esc(fmtTime(u.createdAt))}</div></div>
        <span class="acct-pill">已登录</span>
      </div>

      <div class="acct-block">
        <div class="acct-block-title">云存档</div>
        <div class="acct-kv"><span>云端版本</span><b>${cloudRev ? `rev ${cloudRev}` : "—"}</b></div>
        <div class="acct-kv"><span>云端更新时间</span><b>${esc(cloud ? fmtTime(cloud.updatedAt) : "尚无云端存档")}</b></div>
        <div class="acct-kv"><span>云端大小</span><b>${cloud ? bytesText(cloud.bytes) : "—"}</b></div>
        <div class="acct-kv"><span>本机存档</span><b>${local.count ? `${local.count} / 9 · ${esc(fmtTime(local.latestTime))}` : "还没有存档"}</b></div>
        <div class="acct-kv"><span>上次同步</span><b>${esc(lastSync)}</b></div>
        ${state.dirty ? '<div class="acct-kv"><span>待同步</span><b>本机存档有变化，尚未上传</b></div>' : ""}
        ${state.ownerMismatch ? `<div class="acct-conflict">
          <div>此浏览器上的存档属于账号 <b>${esc(state.ownerMismatch)}</b>，不是当前账号。要把它上传到 <b>${esc(u.username)}</b> 的云端吗？</div>
          <div class="acct-actions">
            <button class="acct-btn" type="button" data-acct-action="owner-adopt" ${busyAttr}>上传到当前账号</button>
            <button class="acct-btn" type="button" data-acct-action="owner-keep">留在本机，并关闭自动同步</button>
          </div>
        </div>` : ""}
        ${conflict ? `<div class="acct-conflict">
          <div>云端存档已被其它设备更新（rev ${esc(conflict.serverRevision)} · ${esc(fmtTime(conflict.serverUpdatedAt))}）。请选择保留哪一份${esc(conflictHint)}：</div>
          <div class="acct-actions">
            <button class="acct-btn danger" type="button" data-acct-action="download" ${busyAttr}>用云端覆盖本机</button>
            <button class="acct-btn" type="button" data-acct-action="upload-force" ${busyAttr}>用本机覆盖云端</button>
            <button class="acct-btn" type="button" data-acct-action="dismiss-conflict">暂不处理</button>
          </div>
        </div>` : ""}
        ${guard && !state.confirmGuard ? `<div class="acct-conflict">
          <div>${esc(guardText(guard))}</div>
          <div class="acct-actions">
            <button class="acct-btn danger" type="button" data-acct-action="download" ${busyAttr}>从云端恢复</button>
            <button class="acct-btn" type="button" data-acct-action="guard-force" ${busyAttr}>仍用本机覆盖云端</button>
            <button class="acct-btn" type="button" data-acct-action="dismiss-conflict">暂不处理</button>
          </div>
        </div>` : ""}
        ${state.confirmGuard ? `<div class="acct-conflict">
          <div>确定用本机覆盖云端？云端现在这一份会进入历史版本（可随时恢复），之后云端的内容以本机为准。</div>
          <div class="acct-actions">
            <button class="acct-btn danger" type="button" data-acct-action="guard-force-confirm" ${busyAttr}>确认覆盖</button>
            <button class="acct-btn" type="button" data-acct-action="guard-force-cancel">取消</button>
          </div>
        </div>` : ""}
        ${state.confirmDownload ? `<div class="acct-conflict">
          <div>${esc(downloadText)}</div>
          <div class="acct-actions"><button class="acct-btn danger" type="button" data-acct-action="download-confirm" ${busyAttr}>确认覆盖</button><button class="acct-btn" type="button" data-acct-action="download-cancel">取消</button></div>
        </div>` : ""}
        <div class="acct-actions">
          <button class="acct-btn primary" type="button" data-acct-action="upload" ${busyAttr}>上传到云端</button>
          <button class="acct-btn" type="button" data-acct-action="download" ${busyAttr}>从云端恢复</button>
          <button class="acct-btn" type="button" data-acct-action="refresh-cloud" ${busyAttr}>刷新云端状态</button>
          <button class="acct-btn" type="button" data-acct-action="toggle-history">${state.showHistory ? "收起历史版本" : "历史版本"}</button>
        </div>
        ${historyList}
        <label class="acct-check"><input type="checkbox" data-acct-auto ${state.autoSync ? "checked" : ""}> 自动同步（存档变化后上传）</label>
        <div class="acct-note">云存档按整包同步：9 个存档槽、图鉴、关键词、收件箱、设置等一起上传；同一账号最多保留 10 台登录设备。云端存档每被替换一次，旧的那一份会保留在「历史版本」里，可随时恢复到本机。</div>
        ${state.autoPaused ? `<div class="acct-note warn">${esc(pauseReasonText())}</div>` : ""}
        ${state.autoError ? `<div class="acct-note warn">自动同步失败：${esc(state.autoError.text)}（${esc(fmtTime(state.autoError.at))}）。本地存档不受影响。</div>` : ""}
      </div>

      <div class="acct-block">
        <div class="acct-block-title">昵称</div>
        <form class="acct-form acct-inline" data-acct-form="profile">
          <input name="nickname" maxlength="24" value="${esc(u.nickname || "")}" aria-label="昵称">
          <button class="acct-btn" type="submit">保存昵称</button>
        </form>
      </div>

      <div class="acct-block">
        <div class="acct-block-title">密码与找回码</div>
        <form class="acct-form" data-acct-form="password">
          <label>当前密码<input name="currentPassword" type="password" required autocomplete="current-password"></label>
          <label>新密码<input name="newPassword" type="password" minlength="8" maxlength="72" required autocomplete="new-password"></label>
          <label>确认新密码<input name="confirm" type="password" minlength="8" maxlength="72" required autocomplete="new-password"></label>
          <div class="acct-actions"><button class="acct-btn" type="submit">修改密码（其它设备退出）</button></div>
        </form>
        <form class="acct-form" data-acct-form="recovery">
          <label>输入密码以重新生成找回码<input name="password" type="password" required autocomplete="current-password"></label>
          <div class="acct-actions"><button class="acct-btn" type="submit">重新生成找回码</button></div>
        </form>
        ${state.recoveryCode ? `<div class="acct-recovery"><div class="acct-code">${esc(state.recoveryCode)}</div><div class="acct-note">新找回码只显示这一次，请立即保存。</div></div>` : ""}
      </div>

      <div class="acct-block">
        <div class="acct-block-title">登录设备</div>
        <div class="acct-sessions">
          ${state.sessions.length ? state.sessions.map((s) => `<div class="acct-session">
            <div class="acct-session-main"><b>${esc(shortUa(s.userAgent))}</b>${s.current ? ' <span class="acct-pill small">当前设备</span>' : ""}</div>
            <div class="acct-session-sub">最近活动 ${esc(fmtTime(s.lastSeenAt))} · 登录于 ${esc(fmtTime(s.createdAt))}</div>
            ${s.current ? "" : `<button class="acct-btn danger small" type="button" data-acct-action="revoke-session" data-id="${esc(s.id)}">退出该设备</button>`}
          </div>`).join("") : '<div class="acct-note">暂无设备信息</div>'}
        </div>
        <div class="acct-actions">
          <button class="acct-btn" type="button" data-acct-action="export-data">导出我的账号数据</button>
          <button class="acct-btn" type="button" data-acct-action="logout">退出登录</button>
        </div>
        ${state.confirmLogout ? `<div class="acct-conflict">
          <div>退出登录后，本机存档会保留在此浏览器里。如果是公用电脑，建议一并清除，避免下一个人看到你的进度。</div>
          <div class="acct-actions">
            <button class="acct-btn primary" type="button" data-acct-action="logout-keep" ${busyAttr}>仅退出登录</button>
            <button class="acct-btn danger" type="button" data-acct-action="logout-clear" ${busyAttr}>退出并清除本机存档</button>
            <button class="acct-btn" type="button" data-acct-action="logout-cancel">取消</button>
          </div>
        </div>` : ""}
      </div>

      <div class="acct-block danger-block">
        <div class="acct-block-title">注销账号</div>
        <div class="acct-note">注销会删除账号与云端存档；本机存档、图鉴和设置仍保留在浏览器。此操作不可撤销。</div>
        <form class="acct-form" data-acct-form="delete">
          <label class="acct-check"><input type="checkbox" name="ack" required> 我确认注销账号并删除云端数据</label>
          <label>密码<input name="password" type="password" required autocomplete="current-password"></label>
          <div class="acct-actions"><button class="acct-btn danger" type="submit">永久注销账号</button></div>
        </form>
      </div>
      <div class="acct-message" hidden></div>
    </div>`;
  }

  function render() {
    if (!state.root) return;
    if (state.health === "down") {
      state.root.innerHTML = `<div class="acct-card">
        <div class="acct-head"><div class="acct-avatar">!</div><div class="acct-id"><div class="acct-name">账号服务未连接</div><div class="acct-sub">本地存档、剧情和离线游玩不受影响</div></div></div>
        <div class="acct-note">账号服务暂时连不上，请稍后再试。本机存档、剧情和离线游玩都不受影响。</div>
        <div class="acct-actions"><button class="acct-btn" type="button" data-acct-action="retry-health">重新连接</button></div>
        <div class="acct-message" hidden></div>
      </div>`;
      paintMessage();
      return;
    }
    // 注册成功或找回密码后，先强制展示一次性找回码页面，确认保存后再进入账号面板。
    state.root.innerHTML = (state.me && state.view !== "registered") ? renderAccount() : renderGuest();
    paintMessage();
  }

  async function refreshAfterAuth(data) {
    state.me = data.user;
    state.session = data.session;
    state.cloud = data.save || null;
    state.localMeta = loadLocalMeta();
    state.autoSync = autoSyncEnabled();
    state.conflict = null;
    state.guard = null;
    state.confirmGuard = null;
    state.confirmDownload = false;
    state.pendingRevision = null;
    state.autoPaused = false;
    state.autoError = null;
    state.clearedLocally = false;
    state.restoredVersion = null;
    state.history = null;
    state.showHistory = false;
    state.dirty = loadDirty();
    state.lastUploadAt = 0;
    state.view = "account";
    await refreshSessions();
    detectConflict();
    applyOwnerPolicy();
    // 原实现在这里排定一次自动上传，但此时界面仍是「忙碌」，排定函数一进门就返回，
    // 等于从未执行。v3.4.55：改到登录流程收尾之后（见 doLogin）。
  }

  async function doLogin(form) {
    state.authRev += 1;
    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");
    if (!username || !password) return setMessage("请输入用户名和密码");
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/auth/login", { method: "POST", body: { username, password } });
      await refreshAfterAuth(data);
      setMessage("登录成功", "ok");
    } catch (e) {
      setMessage(errText(e.code));
    } finally {
      setBusy(false);
      // 登录期间本机存档若有未上传的变化，在这里补传（会先过数据保护与存档归属两道检查）
      scheduleAutoUpload();
    }
  }

  async function doRegister(form) {
    state.authRev += 1;
    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    const nickname = String(fd.get("nickname") || "").trim();
    if (password !== confirm) return setMessage("两次输入的密码不一致");
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/auth/register", { method: "POST", body: { username, password, nickname } });
      resetAuthState();
      state.me = data.user;
      state.session = data.session;
      state.cloud = null;
      state.localMeta = null;
      state.autoSync = autoSyncEnabled();
      state.recoveryCode = data.recoveryCode;
      state.dirty = loadDirty();
      state.view = "registered";
      state.authRev += 1;
      applyOwnerPolicy();
      render();
    } catch (e) {
      setMessage(errText(e.code));
    } finally { setBusy(false); }
  }

  async function doRecover(form) {
    state.authRev += 1;
    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim();
    const recoveryCode = String(fd.get("recoveryCode") || "").trim();
    const newPassword = String(fd.get("newPassword") || "");
    const confirm = String(fd.get("confirm") || "");
    if (newPassword !== confirm) return setMessage("两次输入的密码不一致");
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/auth/recover", { method: "POST", body: { username, recoveryCode, newPassword } });
      resetAuthState();
      state.recoveryCode = data.recoveryCode;
      state.view = "registered";
      render();
      setMessage("密码已重置，旧设备已退出；请保存新的找回码", "ok");
    } catch (e) {
      setMessage(errText(e.code));
    } finally { setBusy(false); }
  }

  function buildCloudPayload() {
    const payload = Saves.exportData();
    // 云端只保存存档数据，不保存当前设备的瞬时会话快照。
    delete payload.currentSession;
    delete payload.incompleteKeys;
    return payload;
  }

  // 上传成功后的统一收尾。gen 是发起上传时的变化代数：
  // 上传进行中本机又有新存档的话（代数已变），这次上传的内容里没有它，「待同步」标记必须保留。
  function afterUpload(save, gen) {
    state.cloud = save;
    state.conflict = null;
    state.guard = null;
    state.confirmGuard = null;
    state.autoPaused = false;
    state.autoError = null;
    state.clearedLocally = false;
    state.restoredVersion = null;
    if (gen === state.dirtyGen) clearDirty();
    setOwner();
    saveLocalMeta({
      revision: save.revision,
      updatedAt: save.updatedAt,
      syncedAt: new Date().toISOString(),
    });
  }

  /* 手动上传。force 只豁免「修订号冲突」；
     allowEmpty / allowShrink 是玩家在数据保护提示里明确确认后才带的放行标记。 */
  async function doUpload(force = false, { allowEmpty = false, allowShrink = false } = {}) {
    if (!state.me) return;
    // v3.4.55：本机存档属于另一个账号且玩家还没选择时，手动上传也不能绕过——
    // 必须先在「上传到当前账号 / 留在本机」里明确选一个
    if (state.ownerMismatch) {
      setMessage(`此浏览器上的存档属于账号 ${state.ownerMismatch}，请先在上方选择是否上传到当前账号`);
      return;
    }
    if (!allowEmpty && !allowShrink) {
      const blocked = localBlocked(localProgress());
      if (blocked) {
        // v3.4.55：本机没有存档、或收集进度比云端少——不能直接覆盖，先让玩家确认
        state.guard = blocked;
        state.confirmGuard = { ...blocked, force };
        state.autoPaused = true;
        render();
        setMessage(blocked.code === "empty_overwrite"
          ? "本机没有存档，不能直接覆盖云端" : "本机的收集进度比云端少，不能直接覆盖云端");
        return;
      }
    }
    const baseRevision = state.cloud ? state.cloud.revision : 0;
    const gen = state.dirtyGen;
    const payload = buildCloudPayload();
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/saves", {
        method: "PUT",
        timeout: UPLOAD_TIMEOUT,
        body: { data: payload, baseRevision, force, allowEmpty, allowShrink },
      });
      afterUpload(data.save, gen);
      state.lastUploadAt = Date.now();
      state.history = null;
      if (state.showHistory) loadHistory();
      render();
      setMessage("已上传到云端", "ok");
    } catch (e) {
      if (e.code === "save_conflict" && e.data) {
        state.conflict = e.data;
        state.autoPaused = true;
        render();
        setMessage("云端已被其它设备更新，请选择保留哪一份");
      } else if ((e.code === "empty_overwrite" || e.code === "progress_shrink") && e.data) {
        state.guard = normalizeGuard(e.code, e.data);
        state.autoPaused = true;
        render();
        setMessage(errText(e.code));
      } else {
        setMessage(errText(e.code));
      }
    } finally { setBusy(false); }
  }

  // 恢复到本机。revision 为空 = 云端最新；否则是历史版本（只恢复到本机，云端不变）
  async function doDownload(revision = null) {
    if (!state.me) return;
    setBusy(true); setMessage("");
    try {
      const query = revision != null ? `?revision=${encodeURIComponent(revision)}` : "";
      const data = await request(`/api/saves/data${query}`, { timeout: UPLOAD_TIMEOUT });
      state.suppressSync = true;
      const ok = Saves.importData(data.data);
      state.suppressSync = false;
      if (!ok) throw Object.assign(new Error("invalid"), { code: "invalid_saves" });
      // 导入一成功就清「待同步」并记归属（此时本机内容 == 取回的那一份），不等后面的网络请求
      setOwner();
      clearDirty();
      state.pendingRevision = null;
      state.confirmDownload = false;
      // 云端最新修订号不因恢复历史版本而变化：本机锚点仍指向云端最新，
      // 之后的上传才不会撞修订号冲突（内容差异由数据保护来提示）
      state.cloud = revision != null ? await refreshCloud() : data.save;
      state.autoError = null;
      saveLocalMeta({
        revision: state.cloud.revision,
        updatedAt: state.cloud.updatedAt,
        syncedAt: new Date().toISOString(),
      });
      if (revision != null) {
        // 恢复的是旧版本：自动同步暂停，等玩家确认后再决定要不要同步回云端
        state.conflict = null;
        state.guard = null;
        state.confirmGuard = null;
        state.clearedLocally = false;
        state.restoredVersion = revision;
        state.autoPaused = true;
      } else {
        state.conflict = null;
        state.guard = null;
        state.confirmGuard = null;
        state.clearedLocally = false;
        state.restoredVersion = null;
        state.autoPaused = false;
      }
      if (typeof window.flashHint === "function") {
        window.flashHint(revision != null
          ? `已把历史版本 rev ${revision} 恢复到本机，自动同步已暂停`
          : "云端存档已恢复，请点「继续游戏」");
      }
    } catch (e) {
      state.suppressSync = false;
      setMessage(errText(e.code));
      render();
    } finally { setBusy(false); }
  }

  async function doRefreshCloud() {
    if (!state.me) return;
    setBusy(true); setMessage("");
    try {
      await refreshCloud();
      if (state.cloud && state.localMeta && state.cloud.revision > state.localMeta.revision) {
        state.conflict = {
          serverRevision: state.cloud.revision,
          serverUpdatedAt: state.cloud.updatedAt,
          serverBytes: state.cloud.bytes,
        };
        state.autoPaused = true;
      }
      if (state.showHistory) await loadHistory();
      render();
      setMessage("云端状态已刷新", "ok");
    } catch (e) {
      setMessage(errText(e.code));
    } finally { setBusy(false); }
  }

  async function doProfile(form) {
    const fd = new FormData(form);
    const nickname = String(fd.get("nickname") || "").trim();
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/account/profile", { method: "POST", body: { nickname } });
      state.me = { ...state.me, ...data.user };
      render();
      setMessage("昵称已更新", "ok");
    } catch (e) { setMessage(errText(e.code)); }
    finally { setBusy(false); }
  }

  async function doPassword(form) {
    const fd = new FormData(form);
    const currentPassword = String(fd.get("currentPassword") || "");
    const newPassword = String(fd.get("newPassword") || "");
    const confirm = String(fd.get("confirm") || "");
    if (newPassword !== confirm) return setMessage("两次输入的密码不一致");
    setBusy(true); setMessage("");
    try {
      await request("/api/account/password", { method: "POST", body: { currentPassword, newPassword } });
      form.reset();
      await refreshSessions();
      render();
      setMessage("密码已修改，其它设备已退出", "ok");
    } catch (e) { setMessage(errText(e.code)); }
    finally { setBusy(false); }
  }

  async function doRotateRecovery(form) {
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/account/recovery-code", { method: "POST", body: { password } });
      state.recoveryCode = data.recoveryCode;
      form.reset();
      render();
      setMessage("新找回码已生成，请立即保存", "ok");
    } catch (e) { setMessage(errText(e.code)); }
    finally { setBusy(false); }
  }

  async function revokeSession(id) {
    setBusy(true); setMessage("");
    try {
      await request(`/api/account/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshSessions();
      render();
      setMessage("该设备已退出登录", "ok");
    } catch (e) { setMessage(errText(e.code)); }
    finally { setBusy(false); }
  }

  async function doExport() {
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/account/export", { timeout: UPLOAD_TIMEOUT });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sakura-account-${state.me.username}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("账号数据已导出", "ok");
    } catch (e) { setMessage(errText(e.code)); }
    finally { setBusy(false); }
  }

  async function doDelete(form) {
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    if (!fd.get("ack")) return setMessage("请先勾选确认注销");
    if (!window.confirm("确定注销账号并删除云端存档？本机存档仍会保留，此操作不可撤销。")) return;
    setBusy(true); setMessage("");
    try {
      await request("/api/account", { method: "DELETE", body: { password, ack: true } });
      state.authRev += 1;
      resetAuthState();
      render();
      setMessage("账号已注销，本机存档仍保留", "ok");
    } catch (e) {
      setMessage(errText(e.code));
    } finally { setBusy(false); }
  }

  function resetAuthState() {
    clearTimeout(state.autoTimer); state.autoTimer = null;
    state.me = null;
    state.session = null;
    state.cloud = null;
    state.sessions = [];
    state.localMeta = null;
    state.conflict = null;
    state.guard = null;
    state.confirmGuard = null;
    state.confirmDownload = false;
    state.pendingRevision = null;
    state.confirmLogout = false;
    state.recoveryCode = null;
    state.history = null;
    state.showHistory = false;
    state.ownerMismatch = null;
    state.autoError = null;
    state.clearedLocally = false;
    state.restoredVersion = null;
    state.view = "login";
    state.busy = false;
  }

  /* 退出登录。clearLocal = true：连同本机存档一起清除（公用电脑用）。
     v3.4.55：不清除时，本机存档与它的归属标记都保留——之后换账号登录，
     账号模块会据此提示「此浏览器上的存档属于另一个账号」，不再自动上传。 */
  async function doLogout(clearLocal) {
    state.authRev += 1;
    setBusy(true);
    try { await request("/api/auth/logout", { method: "POST", body: {} }); } catch (_) {}
    resetAuthState();
    if (clearLocal) {
      state.suppressSync = true;
      try { Saves.clearAll(); } catch (_) {}
      state.suppressSync = false;
      // 账号模块自己的标记一并清掉：归属、待同步、各账号的同步锚点、自动同步偏好
      try {
        for (const key of Object.keys(localStorage)) {
          if (key === OWNER_KEY || key === DIRTY_KEY || key === AUTOSYNC_KEY || key.startsWith("gayme_cloud_meta:")) {
            localStorage.removeItem(key);
          }
        }
      } catch (_) {}
      state.autoSync = false;
      state.dirty = false;
      if (typeof window.__game?.closeOverlay === "function") window.__game.closeOverlay();
      if (typeof window.__game?.backToTitle === "function") window.__game.backToTitle();
      if (typeof window.flashHint === "function") window.flashHint("已退出登录，并清除了此浏览器上的存档");
      return;
    }
    render();
    setMessage("已退出登录（本机存档保留在此浏览器）", "ok");
  }

  /* ================= 自动同步 ================= */

  // 自动同步当前被什么挡住：返回原因，空字符串表示可以上传
  function autoSyncBlocker() {
    if (!state.me || !state.autoSync) return "off";
    if (state.ownerMismatch) return "owner";
    if (state.autoPaused) return "paused";
    if (state.suppressSync || state.busy || state.uploadInFlight) return "busy";
    return "";
  }

  /* 存档变化后安排一次上传：DEBOUNCE_MS 内没有新变化就传。
     delayMs 指定等待时间（限流重试、间隔顺延时用）。 */
  function scheduleAutoUpload(delayMs = null) {
    const blocker = autoSyncBlocker();
    if (blocker === "off" || blocker === "owner" || blocker === "paused") return;
    clearTimeout(state.autoTimer);
    state.autoTimer = setTimeout(() => {
      state.autoTimer = null;
      const now = autoSyncBlocker();
      if (now === "off" || now === "owner" || now === "paused") return;
      if (now === "busy") { scheduleAutoUpload(1500); return; }   // 界面正忙，稍后再试
      // v3.4.55：两次上传之间至少间隔 tune.minUploadIntervalMs；不够就顺延到间隔期满
      const remain = tune.minUploadIntervalMs - (Date.now() - state.lastUploadAt);
      if (remain > 0) { scheduleAutoUpload(remain); return; }
      autoUpload();
    }, delayMs != null ? delayMs : DEBOUNCE_MS);
  }

  function handleAutoFailure(e) {
    if (e.code === "save_conflict" && e.data) {
      state.conflict = e.data;
      state.autoPaused = true;
      setMessage("自动同步暂停：云端已被其它设备更新，请选择保留哪一份");
      return;
    }
    if ((e.code === "empty_overwrite" || e.code === "progress_shrink") && e.data) {
      state.guard = normalizeGuard(e.code, e.data);
      state.autoPaused = true;
      setMessage("自动同步暂停：" + errText(e.code));
      return;
    }
    // v3.4.55：其余失败原先被直接吞掉——玩家以为在同步，其实早就停了。现在一律显示在面板上。
    if (e.code === "rate_limited") {
      const minutes = Math.max(1, Math.ceil(Number(e.data && e.data.retryAfter || 60) / 60));
      state.autoError = { code: e.code, text: `操作太频繁，约 ${minutes} 分钟后自动重试`, at: new Date().toISOString() };
      scheduleAutoUpload(Math.max(5, Number(e.data && e.data.retryAfter || 60)) * 1000 + 1000);
      return;
    }
    if (e.code === "unauthenticated" || e.code === "http_401") {
      state.autoError = { code: e.code, text: "登录已过期，请重新登录", at: new Date().toISOString() };
      return;
    }
    // 网络类失败不暂停自动同步，下一次存档变化会重试
    state.autoError = { code: e.code, text: errText(e.code), at: new Date().toISOString() };
  }

  async function autoUpload({ keepalive = false } = {}) {
    if (autoSyncBlocker()) return;
    // v3.4.55：没有变化就不上传。原先每次排定都会整包上传，修订号与限流额度被白白消耗。
    if (!state.dirty) return;
    // 数据保护先行在本机判断，省一次注定被拒的请求（服务端还有同样的检查兜底）
    const blocked = localBlocked(localProgress());
    if (blocked) {
      state.guard = blocked;
      state.autoPaused = true;
      setMessage("自动同步暂停：" + errText(blocked.code));
      return;
    }
    // 先记代数再打包：打包之后发生的存档写入都不在这次上传的内容里
    const gen = state.dirtyGen;
    const payload = buildCloudPayload();
    const baseRevision = state.cloud ? state.cloud.revision : 0;
    const startedAt = Date.now();
    state.uploadInFlight = true;
    try {
      const data = await request("/api/saves", {
        method: "PUT", timeout: UPLOAD_TIMEOUT, keepalive,
        body: { data: payload, baseRevision, force: false },
      });
      afterUpload(data.save, gen);
      state.lastUploadAt = startedAt;
      // 上传期间又有新变化：接着安排下一次（会遵守最小间隔）
      if (state.dirty) scheduleAutoUpload();
    } catch (e) {
      handleAutoFailure(e);
    } finally {
      state.uploadInFlight = false;
      if (state.root && state.root.isConnected) render();
    }
  }

  /* v3.4.55：页面转入后台或关闭时立即上传一次。
     原先只有「5 秒后上传」的定时器，而页面一隐藏定时器就被浏览器冻结，关页时根本来不及发出，
     云端经常落后于本机。带 keepalive 的请求在页面关闭后仍能发出。
     监听要晚于引擎注册（见文件末尾）：引擎在同样的事件里先写最后一次自动进度，这里随后就传。 */
  function flushOnHide() {
    if (document.visibilityState !== "hidden") return;
    const blocker = autoSyncBlocker();
    if (blocker || !state.dirty) return;
    clearTimeout(state.autoTimer);
    state.autoTimer = null;
    if (localBlocked(localProgress())) return;   // 需要玩家选择，留到下次打开面板时提示
    autoUpload({ keepalive: true });
  }

  // 设置页点「清空」之后调用（js/ui/panels.js）。云端存档不受影响；
  // 自动同步必须暂停，否则重新开局的第一次自动存档就会把空状态推上云端。
  function onLocalCleared() {
    if (!state.me) return;
    clearTimeout(state.autoTimer);
    state.autoTimer = null;
    state.clearedLocally = true;
    state.autoPaused = true;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => setMessage("找回码已复制", "ok")).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    try {
      area.select();
      document.execCommand("copy");
      setMessage("找回码已复制", "ok");
    } catch (_) {
      setMessage("复制失败，请手动选中保存");
    } finally {
      area.remove();
    }
  }

  function bind() {
    if (!state.root || state.root.dataset.acctBound === "1") return;
    state.root.dataset.acctBound = "1";

    state.root.addEventListener("submit", (e) => {
      const form = e.target.closest && e.target.closest("form[data-acct-form]");
      if (!form || !state.root.contains(form)) return;
      e.preventDefault();
      const kind = form.dataset.acctForm;
      if (kind === "login") doLogin(form);
      else if (kind === "register") doRegister(form);
      else if (kind === "recover") doRecover(form);
      else if (kind === "profile") doProfile(form);
      else if (kind === "password") doPassword(form);
      else if (kind === "recovery") doRotateRecovery(form);
      else if (kind === "delete") doDelete(form);
    });

    state.root.addEventListener("click", (e) => {
      const btn = e.target.closest && e.target.closest("[data-acct-action]");
      if (!btn || !state.root.contains(btn)) return;
      const action = btn.dataset.acctAction;
      if (action === "tab-login") { state.view = "login"; state.message = null; render(); }
      else if (action === "tab-register") { state.view = "register"; state.message = null; render(); }
      else if (action === "tab-recover") { state.view = "recover"; state.message = null; render(); }
      else if (action === "finish-register") { state.view = "account"; state.recoveryCode = null; render(); scheduleAutoUpload(); }
      else if (action === "copy-recovery") { if (state.recoveryCode) copyText(state.recoveryCode); }
      else if (action === "upload") doUpload(false);
      else if (action === "upload-force") doUpload(true);
      else if (action === "download") { state.confirmDownload = true; render(); }
      else if (action === "download-confirm") doDownload(state.pendingRevision);
      else if (action === "download-cancel") { state.confirmDownload = false; state.pendingRevision = null; render(); }
      else if (action === "dismiss-conflict") {
        state.conflict = null;
        state.guard = null;
        state.autoPaused = true;
        render();
        setMessage("已暂缓处理，自动同步保持暂停");
      }
      // v3.4.55 数据保护：仍要用本机覆盖云端 → 二次确认 → 带放行标记上传
      else if (action === "guard-force") { state.confirmGuard = { ...(state.guard || {}), force: false }; render(); }
      else if (action === "guard-force-cancel") { state.confirmGuard = null; render(); }
      else if (action === "guard-force-confirm") {
        const force = Boolean(state.confirmGuard && state.confirmGuard.force);
        state.confirmGuard = null;
        doUpload(force, { allowEmpty: true, allowShrink: true });
      }
      // v3.4.55 存档归属：本机存档属于另一个账号时的两个选择
      else if (action === "owner-adopt") {
        state.ownerMismatch = null;
        setOwner();
        render();
        doUpload(false);
      } else if (action === "owner-keep") {
        state.ownerMismatch = null;
        setAutoSyncPreference(false);
        clearTimeout(state.autoTimer); state.autoTimer = null;
        render();
        setMessage("本机存档已留在本机，自动同步已关闭", "ok");
      }
      // v3.4.55 历史版本
      else if (action === "toggle-history") {
        state.showHistory = !state.showHistory;
        render();
        if (state.showHistory && state.history === null) loadHistory();
      } else if (action === "restore-version") {
        state.pendingRevision = Number(btn.dataset.rev);
        state.confirmDownload = true;
        render();
      }
      else if (action === "refresh-cloud") doRefreshCloud();
      // v3.4.55 退出登录：先让玩家选是否一并清除本机存档（公用电脑）
      else if (action === "logout") { state.confirmLogout = true; render(); }
      else if (action === "logout-cancel") { state.confirmLogout = false; render(); }
      else if (action === "logout-keep") doLogout(false);
      else if (action === "logout-clear") doLogout(true);
      else if (action === "export-data") doExport();
      else if (action === "revoke-session") revokeSession(btn.dataset.id);
      else if (action === "retry-health") { state.ready = false; state.health = "unknown"; boot(); }
    });

    state.root.addEventListener("change", (e) => {
      const box = e.target.closest && e.target.closest("[data-acct-auto]");
      if (!box || !state.root.contains(box)) return;
      setAutoSyncPreference(!!box.checked);
      if (state.autoSync) {
        // v3.4.55：存档归属未解决时不能靠「重新勾选」绕过去——那会把别人的存档传进当前账号
        if (!state.ownerMismatch) state.autoPaused = false;
        // 开启的那一刻本机就没有存档、或收集进度比云端少：现在就说清楚并暂停，
        // 而不是等上传被拒（新设备上勾「自动同步」的玩家，多半以为它会把云端存档拉下来）
        const blocked = state.ownerMismatch ? null : localBlocked(localProgress());
        if (blocked) {
          state.guard = blocked;
          state.autoPaused = true;
          render();
          setMessage(blocked.code === "empty_overwrite"
            ? "本机没有存档，已暂停自动同步——请先从云端恢复" : "本机的收集进度比云端少，已暂停自动同步");
          return;
        }
        scheduleAutoUpload();
      } else {
        clearTimeout(state.autoTimer); state.autoTimer = null;
      }
    });
  }

  // mount 每次设置页重建都会替换容器；重新绑定事件，避免监听器丢失。
  const originalMount = mount;
  let mountedRoot = null;
  function mountWithBind(container) {
    if (!container) return;
    if (!ACCOUNT_ENABLED) { originalMount(container); return; }   // 关闭时不绑定任何事件
    if (container !== mountedRoot) {
      state.root = container;
      mountedRoot = container;
    }
    originalMount(container);
    bind();
  }

  window.addEventListener("sakura:saved", () => {
    if (!ACCOUNT_ENABLED) return;   // 账号功能关闭时连「待同步」标记都不用写
    // v3.4.55：记下「有未上传的变化」。没有变化的排定不再上传。
    if (!state.suppressSync) markDirty();
    scheduleAutoUpload();
  });
  window.addEventListener("i18nchange", () => { if (state.root && state.root.isConnected) render(); });

  // 页面转后台 / 关闭时补传。等页面脚本都跑完再注册：
  // 引擎在同样的事件里写最后一次自动进度，这里排在它后面才能把那次写入也传上去。
  if (ACCOUNT_ENABLED) {
    const registerFlush = () => {
      document.addEventListener("visibilitychange", flushOnHide);
      window.addEventListener("pagehide", flushOnHide);
    };
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", registerFlush, { once: true });
    } else {
      registerFlush();
    }
  }

  window.AccountUI = {
    mount: mountWithBind,
    enabled: ACCOUNT_ENABLED,   // v3.4.55：本部署是否启用账号功能
    state,
    boot,
    render,
    // v3.4.55：设置页「清空」后调用，暂停自动同步
    onLocalCleared,
    // v3.4.55：测试用——调整同步节奏参数
    _tune(overrides) { Object.assign(tune, overrides || {}); },
  };
})();
