#!/usr/bin/env node
/* 部署后校验分享卡片（v3.4.50 新增）
   用法：node scripts/check-meta.mjs [origin]
        origin 省略时从 index.html 的 og:url 推导。
   断言：og:url / og:image / twitter:image 均可 200 取到；图片 content-type 为 image/*。
   退出码：0 全通；1 有失败（部署脚本里按 warning 处理，不阻断发布）。 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(join(ROOT, "index.html"), "utf8");
const pick = (re) => (html.match(re) || [])[1];
const ogUrl = pick(/<meta property="og:url" content="([^"]+)">/);
const ogImage = pick(/<meta property="og:image" content="([^"]+)">/);
const twImage = pick(/<meta name="twitter:image" content="([^"]+)">/);
const origin = process.argv[2] || (ogUrl ? new URL(ogUrl).origin + "/" : null);

if (!origin) { console.error("无法确定 origin（index.html 缺 og:url）"); process.exit(1); }

const targets = [["og:url", origin], ["og:image", ogImage], ["twitter:image", twImage]];
let failed = 0;
for (const [name, url] of targets) {
  if (!url) { console.log(`FAIL ${name}: 缺失`); failed++; continue; }
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    const type = res.headers.get("content-type") || "";
    const ok = res.status === 200 && (!name.includes("image") || type.startsWith("image/"));
    console.log(`${ok ? "OK  " : "FAIL"} ${name}: ${res.status} ${type} ${url}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ${name}: ${err.name} ${err.message} ${url}`);
    failed++;
  }
}
console.log(failed ? `\n${failed} 项未通过` : "\n分享卡片全部可达 ✓");
process.exit(failed ? 1 : 0);
