/* ========================================
   樱时信笺 · 账号与云存档界面（js/account.js）
   设计原则：
   1) 账号是可选增强：账号服务不可用时游戏照常离线玩，只在设置页提示；
   2) 云同步整包上传 Saves.exportData()（9 个本地槽 + 图鉴/关键词/设置等），
      与现有「导出 JSON / 导入 JSON」共用同一套结构；
   3) 冲突必须由用户选择：云端覆盖本机 / 本机覆盖云端，不做静默覆盖；
   4) 所有请求同源 Cookie（HttpOnly），非 GET 带 X-Requested-With。
   ======================================== */
(function () {
  "use strict";

  const rootMeta = document.querySelector('meta[name="gayme-account-api"]');
  const API_PREFIX = rootMeta && rootMeta.content ? String(rootMeta.content).replace(/\/+$/, "") : "";
  const META_KEY = (username) => `gayme_cloud_meta:${username}`;
  const AUTOSYNC_KEY = "gayme_account_autosync";
  const REQUEST_TIMEOUT = 15000;
  const UPLOAD_TIMEOUT = 30000;

  const state = {
    root: null,
    ready: false,
    booting: false,
    health: "unknown",          // unknown | ok | down
    me: null,
    session: null,
    cloud: null,                // 云端元信息 {revision, bytes, updatedAt, ...}
    localMeta: null,            // 本机同步锚点 {revision, updatedAt, syncedAt}
    sessions: [],
    view: "login",              // login | register | recover | registered | account
    message: null,              // {type, text}
    recoveryCode: null,
    conflict: null,             // {serverRevision, serverUpdatedAt, serverBytes}
    confirmDownload: false,
    busy: false,
    autoSync: false,
    autoPaused: false,
    autoTimer: null,
    suppressSync: false,
    booted: 0,
    authRev: 0,                 // 防止启动探测的迟到响应覆盖刚完成的登录/注册
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
    saves_too_large: "存档超过云端大小上限，无法上传",
    invalid_saves: "存档格式异常，无法上传",
    save_corrupted: "云端存档损坏，请联系管理员",
    csrf_blocked: "请求被安全策略拦截，请刷新页面重试",
    json_required: "请求格式错误",
    invalid_revision: "同步版本无效，请刷新云端状态",
    no_save: "云端还没有存档",
    ack_required: "请先确认注销账号",
    internal_error: "服务器开小差了，请稍后再试",
    network: "账号服务连接失败，本地存档不受影响",
  };

  function apiBase() {
    if (location.protocol === "file:") return null;
    return API_PREFIX; // 空字符串 = 同源
  }

  function errText(code) {
    return ERR_TEXT[code] || ERR_TEXT.network;
  }

  async function request(path, { method = "GET", body = null, timeout = REQUEST_TIMEOUT } = {}) {
    const base = apiBase();
    if (base == null) throw Object.assign(new Error("offline"), { code: "network" });
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
    const headers = { Accept: "application/json", "X-Requested-With": "gayme-account" };
    if (body != null) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers,
        credentials: "include",
        body: body == null ? undefined : JSON.stringify(body),
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
        state.view = "account";
        if (state.cloud && (!state.localMeta || state.cloud.revision > state.localMeta.revision)) {
          const local = localSaveInfo();
          if (local.count > 0) {
            state.conflict = {
              serverRevision: state.cloud.revision,
              serverUpdatedAt: state.cloud.updatedAt,
              serverBytes: state.cloud.bytes,
            };
            state.autoPaused = true;
          }
        }
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
    if (bootId === state.booted && authRevAtBoot === state.authRev) render();
  }

  function mount(container) {
    if (!container) return;
    state.root = container;
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

  function renderAccount() {
    const u = state.me;
    const local = localSaveInfo();
    const cloud = state.cloud;
    const cloudRev = cloud ? cloud.revision : 0;
    const conflict = state.conflict;
    const lastSync = state.localMeta && state.localMeta.syncedAt ? fmtTime(state.localMeta.syncedAt) : "尚未同步";
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
        ${conflict ? `<div class="acct-conflict">
          <div>云端存档已被其它设备更新（rev ${esc(conflict.serverRevision)} · ${esc(fmtTime(conflict.serverUpdatedAt))}）。请选择保留哪一份：</div>
          <div class="acct-actions">
            <button class="acct-btn danger" type="button" data-acct-action="download" ${state.busy ? "disabled" : ""}>用云端覆盖本机</button>
            <button class="acct-btn" type="button" data-acct-action="upload-force" ${state.busy ? "disabled" : ""}>用本机覆盖云端</button>
            <button class="acct-btn" type="button" data-acct-action="dismiss-conflict">暂不处理</button>
          </div>
        </div>` : ""}
        ${state.confirmDownload ? `<div class="acct-conflict">
          <div>云端存档将覆盖本机全部 9 个存档槽和收集进度；当前未保存的进度会丢失。确定继续？</div>
          <div class="acct-actions"><button class="acct-btn danger" type="button" data-acct-action="download-confirm" ${state.busy ? "disabled" : ""}>确认覆盖</button><button class="acct-btn" type="button" data-acct-action="download-cancel">取消</button></div>
        </div>` : ""}
        <div class="acct-actions">
          <button class="acct-btn primary" type="button" data-acct-action="upload" ${state.busy ? "disabled" : ""}>上传到云端</button>
          <button class="acct-btn" type="button" data-acct-action="download" ${state.busy ? "disabled" : ""}>从云端恢复</button>
          <button class="acct-btn" type="button" data-acct-action="refresh-cloud" ${state.busy ? "disabled" : ""}>刷新云端状态</button>
        </div>
        <label class="acct-check"><input type="checkbox" data-acct-auto ${state.autoSync ? "checked" : ""}> 自动同步（存档变化后上传）</label>
        <div class="acct-note">云存档按整包同步：9 个存档槽、图鉴、关键词、收件箱、设置等一起上传；同一账号最多保留 10 台登录设备。</div>
        ${state.autoPaused && !conflict ? `<div class="acct-note warn">自动同步已暂停：存在未解决的云端冲突。请先上传或恢复，或关闭后重新开启自动同步。</div>` : ""}
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
        <div class="acct-note">当前页面没有连上账号服务。请确认账号服务已启动，或检查 meta[name="gayme-account-api"] 的地址。</div>
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
    state.autoPaused = false;
    state.view = "account";
    await refreshSessions();
    if (state.cloud && (!state.localMeta || state.cloud.revision > state.localMeta.revision)) {
      const local = localSaveInfo();
      if (local.count > 0) {
        state.conflict = {
          serverRevision: state.cloud.revision,
          serverUpdatedAt: state.cloud.updatedAt,
          serverBytes: state.cloud.bytes,
        };
        state.autoPaused = true;
      }
    }
    if (state.autoSync && !state.autoPaused) scheduleAutoUpload();
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
    } finally { setBusy(false); }
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
      state.me = data.user;
      state.session = data.session;
      state.cloud = null;
      state.localMeta = null;
      state.autoSync = autoSyncEnabled();
      state.recoveryCode = data.recoveryCode;
      state.view = "registered";
      state.authRev += 1;
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
      state.me = null;
      state.session = null;
      state.cloud = null;
      state.sessions = [];
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

  async function doUpload(force = false) {
    if (!state.me) return;
    const baseRevision = state.cloud ? state.cloud.revision : 0;
    const payload = buildCloudPayload();
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/saves", {
        method: "PUT",
        timeout: UPLOAD_TIMEOUT,
        body: { data: payload, baseRevision, force },
      });
      state.cloud = data.save;
      state.conflict = null;
      state.confirmDownload = false;
      state.autoPaused = false;
      saveLocalMeta({
        revision: data.save.revision,
        updatedAt: data.save.updatedAt,
        syncedAt: new Date().toISOString(),
      });
      render();
      setMessage("已上传到云端", "ok");
    } catch (e) {
      if (e.code === "save_conflict" && e.data) {
        state.conflict = e.data;
        state.autoPaused = true;
        render();
        setMessage("云端已被其它设备更新，请选择保留哪一份");
      } else {
        setMessage(errText(e.code));
      }
    } finally { setBusy(false); }
  }

  async function doDownload() {
    if (!state.me) return;
    setBusy(true); setMessage("");
    try {
      const data = await request("/api/saves/data", { timeout: UPLOAD_TIMEOUT });
      state.suppressSync = true;
      const ok = Saves.importData(data.data);
      state.suppressSync = false;
      if (!ok) throw Object.assign(new Error("invalid"), { code: "invalid_saves" });
      state.cloud = data.save;
      state.conflict = null;
      state.confirmDownload = false;
      state.autoPaused = false;
      saveLocalMeta({
        revision: data.save.revision,
        updatedAt: data.save.updatedAt,
        syncedAt: new Date().toISOString(),
      });
      if (typeof window.flashHint === "function") window.flashHint("云端存档已恢复，请点「继续游戏」");
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
      state.me = null;
      state.session = null;
      state.cloud = null;
      state.sessions = [];
      state.localMeta = null;
      state.conflict = null;
      state.recoveryCode = null;
      state.view = "login";
      state.busy = false;
      render();
      setMessage("账号已注销，本机存档仍保留", "ok");
    } catch (e) {
      setMessage(errText(e.code));
    } finally { setBusy(false); }
  }

  async function doLogout() {
    state.authRev += 1;
    setBusy(true);
    try { await request("/api/auth/logout", { method: "POST", body: {} }); } catch (_) {}
    state.me = null;
    state.session = null;
    state.cloud = null;
    state.sessions = [];
    state.localMeta = null;
    state.conflict = null;
    state.recoveryCode = null;
    state.view = "login";
    state.busy = false;
    render();
    setMessage("已退出登录", "ok");
  }

  function scheduleAutoUpload() {
    if (!state.me || !state.autoSync || state.autoPaused || state.suppressSync || state.busy) return;
    clearTimeout(state.autoTimer);
    state.autoTimer = setTimeout(() => {
      if (!state.me || !state.autoSync || state.autoPaused || state.suppressSync || state.busy) return;
      autoUpload();
    }, 5000);
  }

  async function autoUpload() {
    if (!state.me || !state.autoSync || state.autoPaused || state.suppressSync || state.busy) return;
    const payload = buildCloudPayload();
    const baseRevision = state.cloud ? state.cloud.revision : 0;
    try {
      const data = await request("/api/saves", {
        method: "PUT",
        timeout: UPLOAD_TIMEOUT,
        body: { data: payload, baseRevision, force: false },
      });
      state.cloud = data.save;
      state.conflict = null;
      saveLocalMeta({
        revision: data.save.revision,
        updatedAt: data.save.updatedAt,
        syncedAt: new Date().toISOString(),
      });
      if (state.root && state.root.isConnected) render();
    } catch (e) {
      if (e.code === "save_conflict" && e.data) {
        state.conflict = e.data;
        state.autoPaused = true;
        if (state.root && state.root.isConnected) {
          render();
          setMessage("自动同步暂停：云端已被其它设备更新，请选择保留哪一份");
        }
      }
      // 网络失败不暂停自动同步，下一次存档事件会重试。
    }
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
      else if (action === "finish-register") { state.view = "account"; state.recoveryCode = null; render(); }
      else if (action === "copy-recovery") { if (state.recoveryCode) copyText(state.recoveryCode); }
      else if (action === "upload") doUpload(false);
      else if (action === "upload-force") doUpload(true);
      else if (action === "download") { state.confirmDownload = true; render(); }
      else if (action === "download-confirm") doDownload();
      else if (action === "download-cancel") { state.confirmDownload = false; render(); }
      else if (action === "dismiss-conflict") {
        state.conflict = null;
        state.autoPaused = true;
        render();
        setMessage("已暂缓冲突处理，自动同步保持暂停");
      } else if (action === "refresh-cloud") doRefreshCloud();
      else if (action === "logout") doLogout();
      else if (action === "export-data") doExport();
      else if (action === "revoke-session") revokeSession(btn.dataset.id);
      else if (action === "retry-health") { state.ready = false; state.health = "unknown"; boot(); }
    });

    state.root.addEventListener("change", (e) => {
      const box = e.target.closest && e.target.closest("[data-acct-auto]");
      if (!box || !state.root.contains(box)) return;
      state.autoSync = !!box.checked;
      try { localStorage.setItem(AUTOSYNC_KEY, state.autoSync ? "1" : "0"); } catch (_) {}
      if (state.autoSync) {
        state.autoPaused = false;
        scheduleAutoUpload();
      }
    });
  }

  // mount 每次设置页重建都会替换容器；重新绑定事件，避免监听器丢失。
  const originalMount = mount;
  let mountedRoot = null;
  function mountWithBind(container) {
    if (!container) return;
    if (container !== mountedRoot) {
      state.root = container;
      mountedRoot = container;
    }
    originalMount(container);
    bind();
  }

  window.addEventListener("sakura:saved", () => scheduleAutoUpload());
  window.addEventListener("i18nchange", () => { if (state.root && state.root.isConnected) render(); });

  window.AccountUI = {
    mount: mountWithBind,
    state,
    boot,
    render,
  };
})();
