/* 樱时信笺 · Service Worker（v3.2.0）
   —— 预缓存全部静态资源：离线可玩 / 添加到主屏幕。
   缓存版本由 tools/bump_version.py 随版本号自动同步（SW_CACHE_VERSION）。 */
const CACHE_VERSION = "sakura-v3.4.12";   // 核心层缓存（bump 工具自动同步）
const MEDIA_CACHE = "sakura-media";        // 媒体层缓存：跨版本沿用，不随发版清空
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "css/style.css",
  "css/games.css",
  "js/saves.js",
  "js/script.js",
  "js/lifecycle.js",
  "js/minigames.js",
  "js/gamekit.js",
  "js/games/afterword.js",
  "js/games/senses.js",
  "js/games/craft.js",
  "js/games/nature.js",
  "js/games/perception.js",
  "js/games/mechanism.js",
  "js/games/imagery.js",
  "js/games/direct.js",
  "js/engine.js",
  // v3.4.0：立绘位图上线时在下方追加 assets/portraits/*.webp
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

  // 媒体资源（BGM / CG 位图）：运行时缓存进 sakura-media（cache-first + 后台更新）
  const isMedia = url.pathname.includes("/audio/") || url.pathname.includes("/assets/cg/");
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
