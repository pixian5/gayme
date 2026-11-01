/* 樱时信笺 · Service Worker（v3.2.0）
   —— 预缓存全部静态资源：离线可玩 / 添加到主屏幕。
   缓存版本由 tools/bump_version.py 随版本号自动同步（SW_CACHE_VERSION）；
   应用代码（js/、css/）条目必须带与 index.html 相同的 ?v=<VERSION>，
   否则 SW 安装会按裸路径再抓一遍，首访把同批 JS/CSS 下载两次。 */
const CACHE_VERSION = "sakura-v3.4.35";   // 核心层缓存（bump 工具自动同步）
const MEDIA_CACHE = "sakura-media";        // 媒体层缓存：跨版本沿用，不随发版清空
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "css/style.css?v=3.4.35",
  "css/games.css?v=3.4.35",
  "js/saves.js?v=3.4.35",
  "js/script.js?v=3.4.35",
  "js/lifecycle.js?v=3.4.35",
  "js/minigames.js?v=3.4.35",
  "js/game-help.js?v=3.4.35",
  "js/gamekit.js?v=3.4.35",
  "js/games/afterword.js?v=3.4.35",
  "js/games/senses.js?v=3.4.35",
  "js/games/craft.js?v=3.4.35",
  "js/games/nature.js?v=3.4.35",
  "js/games/perception.js?v=3.4.35",
  "js/games/mechanism.js?v=3.4.35",
  "js/games/imagery.js?v=3.4.35",
  "js/games/direct.js?v=3.4.35",
  "js/ui/panels.js?v=3.4.35",
  "js/engine.js?v=3.4.35",
  // v3.4.0：立绘位图走媒体层运行时缓存（/assets/portraits/），跨版本沿用
  "fonts/NotoSerifSC-Regular.woff2?v=3.2.4",
  "fonts/NotoSerifSC-Bold.woff2?v=3.2.4",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // 只清核心层旧版本仓；媒体层（sakura-media）跨版本沿用，避免重下 10MB
      Promise.all(keys.filter((k) => k.startsWith("sakura-v") && k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* v3.4.33：统一的网络失败兜底。
   respondWith() 的参数必须 resolve 出一个 Response——解析成 undefined 会让
   Firefox 抛 "ServiceWorker encountered an unexpected error"（e2e 偶发失败的元凶）。
   所有失败分支都走这里，保证永远有东西可返回。 */
function offlineResponse() {
  return new Response("", { status: 504, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先（保证更新及时到达），断网回退缓存
  // v3.4.33：兜底必须保证 resolve 出 Response——旧写法可能解析成 undefined，
  // Firefox 会直接抛 "ServiceWorker encountered an unexpected error"。
  if (req.mode === "navigate" || url.pathname.endsWith("index.html")) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // 写缓存失败不能影响响应，也不能留未处理的 rejection
          try {
            const cache = await caches.open(CACHE_VERSION);
            const put = cache.put(req, res.clone());
            if (put && typeof put.catch === "function") put.catch(() => {});
          } catch { /* 忽略 */ }
          return res;
        } catch {
          // 断网：回退缓存；缓存也拿不到就 504，绝不 resolve 成 undefined
          try {
            return (await caches.match(req)) || (await caches.match("index.html")) || offlineResponse();
          } catch {
            return offlineResponse();
          }
        }
      })()
    );
    return;
  }

  // 媒体资源（BGM / CG / 立绘位图）：运行时缓存进 sakura-media（跨版本沿用，不随发版清空）
  // 媒体资源（BGM / CG / 立绘位图）：v3.4.33 起**不再由 SW 拦截**，交给浏览器原生加载。
  // 原因（实测数据）：Firefox 下「SW 拦截媒体请求 + 请求在页面刷新时被取消」会让浏览器
  // 报 "A ServiceWorker intercepted the request and encountered an unexpected error"，
  // 立绘因此加载失败。这是**拦截行为本身**触发的，与响应是否正确无关——
  //   实验 A 媒体不拦截        6/6 通过
  //   实验 B 拦截（无后台请求）0/6，报错 3~7 条
  //   实验 C 媒体层预缓存立绘  0/6
  //   实验 D 立绘画进核心预缓存 0/6
  // 代价：离线时 BGM/CG 不可用、立绘回退内联 SVG（引擎已内置该降级）；
  // 换来的是零控制台错误 + 双内核回归稳定。核心层（HTML/CSS/JS/字体/图标）仍预缓存，
  // 离线可玩不受影响。
  const isMedia = url.pathname.includes("/audio/") || url.pathname.includes("/assets/cg/") || url.pathname.includes("/assets/portraits/");
  if (isMedia) return;

  const store = CACHE_VERSION;

  // v3.4.33：respondWith() 的 Promise 既不能 resolve 成 undefined、也不能 reject，
  // 两者在 Firefox 下都会报 "ServiceWorker encountered an unexpected error"。
  // 所以整个处理链用 async 包起来，全路径 try/catch，任何异常都兜成 504 Response。
  const respond = async () => {
    // 1) 先查缓存。缓存环境被销毁（页面刷新 / context 关闭）时 caches API 可能直接
    //    reject——一律当成「未命中」，绝不让异常冒到 respondWith。
    let hit = null;
    try {
      hit = await caches.match(req);
    } catch { hit = null; }
    if (hit) {
      // 命中：立即返回缓存。v3.4.33：这里刻意不再挂后台刷新请求——
      // 页面刷新取消 in-flight 请求是 Firefox 报 unexpected error 的触发条件。
      return hit;
    }
    // 2) 未命中：走网络，成功后写缓存（写失败同样不影响响应）
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        try {
          const cache = await caches.open(store);
          const put = cache.put(req, res.clone());
          if (put && typeof put.catch === "function") put.catch(() => {});
        } catch { /* 写缓存失败不影响响应 */ }
      }
      return res;
    } catch {
      return offlineResponse();
    }
  };

  event.respondWith(
    respond().catch(() => offlineResponse())   // 最后一道闸：永远 resolve 出 Response
  );
});
