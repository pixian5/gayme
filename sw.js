/* 樱时信笺 · Service Worker（v3.2.0）
   —— 预缓存全部静态资源：离线可玩 / 添加到主屏幕。
   缓存版本由 tools/bump_version.py 随版本号自动同步（SW_CACHE_VERSION）；
   应用代码（js/、css/）条目必须带与 index.html 相同的 ?v=<VERSION>，
   否则 SW 安装会按裸路径再抓一遍，首访把同批 JS/CSS 下载两次。 */
const CACHE_VERSION = "sakura-v3.4.29";   // 核心层缓存（bump 工具自动同步）
const MEDIA_CACHE = "sakura-media";        // 媒体层缓存：跨版本沿用，不随发版清空
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "css/style.css?v=3.4.29",
  "css/games.css?v=3.4.29",
  "js/saves.js?v=3.4.29",
  "js/script.js?v=3.4.29",
  "js/lifecycle.js?v=3.4.29",
  "js/minigames.js?v=3.4.29",
  "js/game-help.js?v=3.4.29",
  "js/gamekit.js?v=3.4.29",
  "js/games/afterword.js?v=3.4.29",
  "js/games/senses.js?v=3.4.29",
  "js/games/craft.js?v=3.4.29",
  "js/games/nature.js?v=3.4.29",
  "js/games/perception.js?v=3.4.29",
  "js/games/mechanism.js?v=3.4.29",
  "js/games/imagery.js?v=3.4.29",
  "js/games/direct.js?v=3.4.29",
  "js/ui/panels.js?v=3.4.29",
  "js/engine.js?v=3.4.29",
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先（保证更新及时到达），断网回退缓存
  if (req.mode === "navigate" || url.pathname.endsWith("index.html")) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
    );
    return;
  }

  // 媒体资源（BGM / CG / 立绘位图）：运行时缓存进 sakura-media（cache-first + 后台更新）
  const isMedia = url.pathname.includes("/audio/") || url.pathname.includes("/assets/cg/") || url.pathname.includes("/assets/portraits/");
  const store = isMedia ? MEDIA_CACHE : CACHE_VERSION;
  event.respondWith(
    caches.open(store).then((cache) =>
      cache.match(req).then((hit) => {
        const fetching = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fetching;
      })
    )
  );
});
