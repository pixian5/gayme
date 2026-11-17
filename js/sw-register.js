/* ========================================
   樱时信笺 · Service Worker 注册（sw-register.js）
   —— v3.4.48 从 index.html 末尾的 inline <script> 外置而来：
   为启用 CSP script-src 'self'（禁止一切内联脚本）铺路，逻辑与原 inline 版一字未改。
   ======================================== */
(function () {
  "use strict";
  // PWA：注册 Service Worker（仅安全上下文：https 或 localhost）
  // v3.3.6：补 localhost / 127.0.0.1 / ::1——此前只判 https，导致 e2e（http://localhost）
  // 从未覆盖 SW，注释与实际也不一致
  const __swSecure = location.protocol === "https:"
    || ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);
  if ("serviceWorker" in navigator && __swSecure) {
    addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("sw.js");
        // v3.4.10：每 5 分钟探新版本；有更新时提示玩家刷新（PWA 获取更新的唯一通道）
        // v3.4.24：register 在某些浏览器/策略下可能返回 undefined，
        // 此前直接 reg.update() 会抛 TypeError，连带跳过下方 controllerchange 监听注册
        if (reg && typeof reg.update === "function") {
          setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
        }
        let hinted = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (hinted) return; hinted = true;
          (window.flashHint || ((m) => console.info(m)))("✦ 新版本已就绪，刷新页面生效");
        });
      } catch (e) {}
    });
  }
})();
