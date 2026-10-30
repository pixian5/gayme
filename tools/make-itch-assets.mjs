// 生成 itch.io 分发物料：630×500 封面 + 5 张 1280×720 游戏截图
// 用法：先起静态服（python3 -m http.server 800），再 node tools/make-itch-assets.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}dist/itch`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

// 1) itch 封面 630×500（HTML/CSS 合成，保证中文标题字形正确）
const cover = await browser.newPage({ viewport: { width: 630, height: 500 } });
await cover.goto(`file://${root}tools/itch-cover.html`);
await cover.evaluate(() => document.fonts.ready);
await cover.waitForTimeout(400);
await cover.screenshot({ path: `${outDir}/cover-630x500.png` });
await cover.close();

// 2) 游戏内截图 1280×720（16:9，itch 截图上限 5 张）
const shots = [
  ['prologue_6', '01-hallway-shiyu'],
  ['prologue_19', '02-field-xiazhi'],
  ['prologue_25', '03-artroom-sunian'],
  ['d2_loop_senior', '04-hallway-senior'],
  ['true_6', '05-festival-night'],
];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:800/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game);
await page.getByText('开始新游戏').click();
await page.waitForTimeout(500);
const startStory = page.getByText('开始故事');
if (await startStory.count()) await startStory.click();
await page.waitForTimeout(300);
for (const [node, name] of shots) {
  await page.evaluate((n) => window.__game.gotoNode(n), node);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('shot', name);
}
await browser.close();
console.log('console errors:', errors.length ? errors : 'none');
