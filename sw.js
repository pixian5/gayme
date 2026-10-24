/* 樱时信笺 · Service Worker（v3.2.0）
   —— 预缓存全部静态资源：离线可玩 / 添加到主屏幕。
   缓存版本由 tools/bump_version.py 随版本号自动同步（SW_CACHE_VERSION）。 */
const CACHE_VERSION = "sakura-v3.3.18";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "assets/og-cover.jpg",
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
  "audio/bgm/daily.ogg",
  "audio/bgm/bright.ogg",
  "audio/bgm/sad.ogg",
  "audio/bgm/calm.ogg",
  "audio/bgm/active.ogg",
  "assets/cg/cg_meet_shiyu.jpg",
  "assets/cg/cg_meet_xiazhi.jpg",
  "assets/cg/cg_meet_sunian.jpg",
  "assets/cg/cg_letter.jpg",
  "assets/cg/cg_sportsmeet.jpg",
  "assets/cg/cg_festival.jpg",
  "assets/cg/cg_shiyu_good.jpg",
  "assets/cg/cg_xiazhi_good.jpg",
  "assets/cg/cg_sunian_good.jpg",
  "assets/cg/cg_senior_shadow.jpg",
  "assets/cg/cg_true.jpg",
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
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
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

  // 其余静态资源：缓存优先 + 后台更新（stale-while-revalidate）
  event.respondWith(
    caches.match(req).then((hit) => {
      const fetching = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fetching;
    })
  );
});
