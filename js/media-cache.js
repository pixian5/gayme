/* ========================================
   樱时信笺 · 页面侧媒体缓存 (media-cache.js) v3.4.41
   —— 在 Service Worker 之外实现 BGM / CG / 位图立绘的离线可用。

   背景（为什么不用 SW 缓存媒体）：v3.4.33 四组对照实验证明 SW 拦截媒体请求会
   触发 Firefox 的 "ServiceWorker encountered an unexpected error"（媒体层 0/6 通过），
   因此 sw.js 对 /audio/ /assets/cg/ /assets/portraits/ 一律放行不拦截——代价是
   离线时 BGM 沉默、CG 空白、立绘回退 SVG。

   方案：用页面上下文即可用的 Cache API（window.caches）另开一个缓存仓，
   在线时后台预热；任何媒体加载失败（典型场景：离线）时先把 src 换成缓存里的
   blob URL 重试，缓存也没有才走原有兜底（程序化配乐 / SVG 立绘）。
   全程不经过 SW 拦截，Firefox 稳定性不受影响。

   仓名 "sakura-media-page-v1"：与 SW 的 sakura-v* / sakura-media 错开，
   且 activate 只清 sakura-v 前缀 → 本仓跨版本沿用；媒体文件本身换代时手动升 v1。
   ======================================== */
(function () {
  "use strict";

  const CACHE_NAME = "sakura-media-page-v1";
  // Cache API 需安全上下文（https / localhost）；file:// 打开时静默降级为直连
  const SUPPORTED = typeof caches !== "undefined" && window.isSecureContext && typeof fetch === "function";

  /* ---------- 读：命中返回 blob URL，未命中返回 null ---------- */
  async function cachedUrl(path) {
    if (!SUPPORTED) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match(path);
      if (!res || !res.ok) return null;
      const blob = await res.blob();
      if (!blob || !blob.size) return null;
      return URL.createObjectURL(blob);
    } catch (e) {
      return null;
    }
  }

  /* ---------- 写：拉取并入仓（已有则跳过）。返回是否可用 ---------- */
  async function put(path) {
    if (!SUPPORTED) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      if (await cache.match(path)) return true;
      const res = await fetch(path);
      if (!res || !res.ok) return false;
      await cache.put(path, res);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- 预热：顺序拉一批（并发 2，避免挤占首屏带宽） ----------
     返回 Promise<{ok,n,total}>；重复调用共享同一轮任务。 */
  let warming = null;
  function warm(list) {
    if (!SUPPORTED || warming) return warming || Promise.resolve({ ok: 0, n: 0, total: 0 });
    const paths = [...new Set(list)].filter(Boolean);
    warming = (async () => {
      let ok = 0, n = 0;
      const queue = paths.slice();
      const worker = async () => {
        while (queue.length) {
          const p = queue.shift();
          if (await put(p)) ok++;
          n++;
        }
      };
      await Promise.all([worker(), worker()]);
      warming = null;   // 本轮结束，允许之后再次触发（如 online 事件补热）
      return { ok, n, total: paths.length };
    })();
    return warming;
  }

  /* ---------- 统计：已缓存条目数（测试与诊断用） ---------- */
  async function size() {
    if (!SUPPORTED) return 0;
    try {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.keys()).length;
    } catch (e) {
      return 0;
    }
  }

  /* ---------- 统一的 <img> 失败兜底 ----------
     约定：带 data-mc="<原始路径>" 的图片加载失败时，自动换缓存 blob 重试一次。
     用 document 捕获阶段的 error 委托（img 的 error 不冒泡），一处监听覆盖
     CG 查看器 / 图鉴缩略图等所有 cgArt 输出，业务代码零改动。 */
  if (SUPPORTED) {
    document.addEventListener("error", (e) => {
      const t = e.target;
      if (!t || t.tagName !== "IMG") return;
      const path = t.getAttribute("data-mc");
      if (!path || t.dataset.mcTried) return;   // 只重试一次，防死循环
      t.dataset.mcTried = "1";
      cachedUrl(path).then((url) => {
        if (url && t.isConnected) t.src = url;
      });
    }, true);
  }

  window.MediaCache = { SUPPORTED, cachedUrl, put, warm, size, CACHE_NAME };
})();
