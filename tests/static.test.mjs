import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
const engine = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const minigames = fs.readFileSync(new URL("../js/minigames.js", import.meta.url), "utf8");
const saves = fs.readFileSync(new URL("../js/saves.js", import.meta.url), "utf8");
const panels = fs.readFileSync(new URL("../js/ui/panels.js", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = fs.readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();

test("版本和静态资源一致", () => {
  assert.match(html, new RegExp(`v${version.replaceAll(".", "\\.")}`));
  assert.match(engine, new RegExp(`v${version.replaceAll(".", "\\.")}`));
  assert.equal(packageJson.version, version);
  for (const asset of ["favicon.svg", "js/saves.js", "js/script.js", "js/minigames.js", "js/game-help.js", "js/gamekit.js", "js/games/afterword.js", "js/games/senses.js", "js/games/craft.js", "js/games/nature.js", "js/games/perception.js", "js/games/mechanism.js", "js/games/imagery.js", "js/games/direct.js", "js/ui/panels.js", "js/engine.js", "css/style.css", "css/games.css", "fonts/NotoSerifSC-Regular.woff2", "fonts/NotoSerifSC-Bold.woff2", "audio/bgm/daily.ogg", "audio/bgm/bright.ogg", "audio/bgm/sad.ogg", "audio/bgm/calm.ogg", "audio/bgm/active.ogg", "assets/cg/cg_meet_shiyu.webp", "assets/cg/cg_meet_xiazhi.webp", "assets/cg/cg_meet_sunian.webp", "assets/cg/cg_letter.webp", "assets/cg/cg_sportsmeet.webp", "assets/cg/cg_festival.webp", "assets/cg/cg_shiyu_good.webp", "assets/cg/cg_xiazhi_good.webp", "assets/cg/cg_sunian_good.webp", "assets/cg/cg_senior_shadow.webp", "assets/cg/cg_true.webp"]) {
    assert.equal(fs.existsSync(new URL(`../${asset}`, import.meta.url)), true, asset);
  }
});

test("Service Worker 预缓存与页面版本化资源一一对应", () => {
  // 页面用 ?v= 做缓存击穿，SW 预缓存也必须用完全相同的地址；
  // 否则 install 阶段会按裸路径再抓一遍，首访把同批 JS/CSS 下载两次。
  const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const block = sw.split("const PRECACHE = [")[1].split("];")[0];
  const entries = [...block.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const pageAssets = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+?)\?v=[\d.]+"/g)].map(match => match[1]);
  assert.ok(pageAssets.length >= 16, `页面版本化资源数量异常：${pageAssets.length}`);
  for (const asset of pageAssets) {
    assert.ok(entries.includes(`${asset}?v=${version}`), `PRECACHE 缺少与页面完全一致的地址：${asset}?v=${version}`);
  }
  const appEntries = entries.filter(entry => /^(?:js|css)\//.test(entry));
  const versionSuffix = new RegExp("\\?v=" + version.replaceAll(".", "\\.") + "$");
  for (const entry of appEntries) assert.match(entry, versionSuffix, entry);
  assert.equal(new Set(appEntries.map(entry => entry.replace(/\?v=[\d.]+/, ""))).size, appEntries.length, "PRECACHE 出现重复应用代码路径");
});

test("声明的中文字体有本地 @font-face 支撑", () => {
  // style.css 使用 "Noto Serif SC" 时，必须存在自托管字体，否则会静默回退到系统字体
  assert.match(css, /font-family:\s*"Noto Serif SC"/);
  for (const weight of ["400", "700"]) {
    assert.match(
      css,
      new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*"Noto Serif SC"[^}]*font-weight:\\s*${weight}[^}]*\\}`),
      `缺少 ${weight} 字重的 @font-face`,
    );
  }
  assert.match(css, /@font-face\s*\{[^}]*fonts\/NotoSerifSC-Regular\.woff2/);
  assert.match(css, /@font-face\s*\{[^}]*fonts\/NotoSerifSC-Bold\.woff2/);
});

test("基础控件具备可访问名称", () => {
  for (const id of ["dialog-box", "dialog-text", "choices", "overlay", "overlay-body", "ending-screen"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(engine, /aria-live/);
});

test("所有剧情背景都有 CSS 场景", () => {
  const scenes = [...script.matchAll(/bg:\s*"([\w-]+)"/g)].map(match => match[1]);
  for (const scene of new Set(scenes)) assert.match(css, new RegExp(`\\.scene-${scene}(?:\\W|$)`), scene);
});

test("场景切换按样式表规则校验背景", () => {
  assert.match(engine, /function hasSceneStyle\(bg\)[\s\S]*?sheet\.cssRules/);
  assert.doesNotMatch(engine, /document\.querySelector\(`\.scene-\\$\{CSS\.escape\(bg\)\}`\)/);
});

test("涂色玩法把目标颜色呈现给玩家", () => {
  assert.match(minigames, /el\.style\.background = t\.color/);
  assert.match(minigames, /目标色块/);
});

test("延迟互动层出现前不会跳过剧情", () => {
  assert.match(engine, /function advance\(\) \{\s+if \(state\.pendingInteraction \|\| hasActiveInteractionLayer\(\)\) return;/);
  assert.match(engine, /if \(state\.pendingInteraction \|\| hasActiveInteractionLayer\(\)\) return;[\s\S]*?if \(node\.next\) gotoNode\(node\.next\);/);
  assert.match(engine, /state\.pendingInteraction = true;[\s\S]*?GameKit\?\.run\("triage", node\.triage, nodeId\)/);
  assert.match(engine, /state\.pendingInteraction = true;[\s\S]*?GameKit\?\.run\("wall", node\.wall, nodeId\)/);
  assert.match(engine, /state\.pendingInteraction = true;[\s\S]*?GameKit\?\.run\("proofread", node\.proofread, nodeId\)/);
  assert.match(engine, /state\.pendingInteraction = false;[\s\S]*?showLetter\(node\.letter, nodeId\)/);
});

test("自动存档连续失败会提示并引导导出备份", () => {
  // v3.4.28：配额满 / 隐私模式下 autoSave 静默失败会让玩家误以为进度已存，
  // 刷新后回到旧位置；连续 2 次失败必须提示一次（同会话不重复刷屏）。
  assert.match(engine, /if \(Saves\.autoSave\(snapshot\(\)\)\) \{\s+autoSaveFailStreak = 0;/);
  assert.match(engine, /autoSaveFailStreak >= 2 && !autoSaveWarned/);
  assert.match(engine, /flashHint\("自动存档不可用：请在设置 → 数据备份 导出 JSON"\)/);
});

test("立绘位图清单与素材文件一一对应", () => {
  // v3.4.29：PORTRAIT_BITMAPS 里每个 id 都必须有对应的透明 webp，
  // 且该 id 在 SVG 兜底名单 PORTRAITS 中存在，否则换机会静默不显示立绘。
  const block = engine.match(/const PORTRAIT_BITMAPS = new Set\(\[([^\]]*)\]\);/) || [];
  const ids = [...(block[1] || "").matchAll(/"([\w-]+)"/g)].map(match => match[1]);
  assert.ok(ids.length >= 5, `PORTRAIT_BITMAPS 数量异常：${ids.length}`);
  for (const id of ids) {
    assert.equal(fs.existsSync(new URL(`../assets/portraits/${id}.webp`, import.meta.url)), true, `缺少立绘 ${id}.webp`);
    assert.match(script, new RegExp(`\\n  ${id}: \`<svg`), `PORTRAITS 缺少 ${id} 的 SVG 兜底`);
  }
});

test("立绘走 Service Worker 媒体缓存", () => {
  // 立绘约 100KB/张，走 sakura-media 运行时缓存可跨版本复用，不必每次发版重下；
  // 若误走核心层，bump 版本就会让老玩家把整组立绘重新下载一遍。
  const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /url\.pathname\.includes\("\/assets\/portraits\/"\)/);
  assert.match(sw, /const MEDIA_CACHE = /);
});

test("分享卡片：og:url 是唯一真源，og:image / twitter:image 必须同源", () => {
  // v3.4.50：域名迁移后 meta 曾滞留在失效域名（oh.sbbz.tech:8080 → 301 → HTTPS → 525）。
  // 改为「以 og:url 为唯一真源」的自洽校验：换域名只改一处，站点地址与图片地址不可能再漂开。
  const pick = (re) => (html.match(re) || [])[1];
  const image = pick(/<meta property="og:image" content="([^"]+)">/);
  const url = pick(/<meta property="og:url" content="([^"]+)">/);
  const twitter = pick(/<meta name="twitter:image" content="([^"]+)">/);
  assert.match(url || "", /^https:\/\/[^/]+\/$/, `og:url 必须是带结尾斜杠的绝对地址：${url}`);
  const origin = new URL(url).origin + "/";
  assert.ok(image && image.startsWith(origin), `og:image 必须与 og:url 同源：${image}`);
  assert.ok(url.startsWith(origin), `og:url 自身必须是绝对地址：${url}`);
  assert.equal(twitter, image, "twitter:image 应与 og:image 一致");
  assert.equal(/oh\.sbbz\.tech/.test(html), false, "页面不应再引用已失效的旧域名");
  assert.match(html, /<meta property="og:image:width" content="1200">/);
  assert.match(html, /<meta property="og:image:height" content="630">/);
  assert.equal(fs.existsSync(new URL("../assets/og-cover.jpg", import.meta.url)), true, "缺少分享封面 assets/og-cover.jpg");
});

test("音效采样清单与 audio/sfx 文件一一对应", () => {
  // v3.4.31：SFX_SAMPLES 里每个 kind 都必须有对应的 Ogg 采样，
  // 且环境音场景映射只引用清单内的 kind，否则场景切换会静默无声。
  const block = engine.match(/const SFX_SAMPLES = \{([\s\S]*?)\};/) || [];
  const entries = [...(block[1] || "").matchAll(/(\w+):\s*"audio\/sfx\/([\w.-]+)"/g)];
  assert.equal(entries.length, 8, `SFX_SAMPLES 应有 8 个采样：${entries.length}`);
  for (const [, kind, file] of entries) {
    const path = new URL(`../audio/sfx/${file}`, import.meta.url);
    assert.equal(fs.existsSync(path), true, `缺少音效 audio/sfx/${file}`);
    const buf = fs.readFileSync(path);
    assert.equal(buf.subarray(0, 4).toString("ascii"), "OggS", `${file} 不是 Ogg 文件`);
    assert.ok(buf.length < 200 * 1024, `${file} 体积异常：${buf.length} 字节`);
  }
  const ambient = engine.match(/const AMBIENT_SCENES = \{([^}]*)\}/) || [];
  const kinds = new Set(entries.map(([, kind]) => kind));
  for (const [, kind] of [...(ambient[1] || "").matchAll(/: "(\w+)"/g)]) {
    assert.ok(kinds.has(kind), `环境音场景引用了未定义的采样：${kind}`);
  }
});

test("音效采样优先，解码失败回落程序化并保留署名", () => {
  // 采样缺失 / 解码失败时必须回落 v2.9.7 的合成音效，不能无声；
  // 音效素材为 CC0，但 Kenney 与 OpenGameArt 作者署名仍须保留在「关于」页。
  assert.match(engine, /function playSfx\(kind\)[\s\S]*?if \(playSfxSample\(kind\)\) return;[\s\S]*?const seq = \{/);
  assert.match(engine, /\.catch\(\(\) => \{ sfxCache\[kind\] = null; \}\);/, "采样加载/解码失败必须回落程序化");
  assert.match(engine, /Object\.keys\(SFX_SAMPLES\)\.forEach\(loadSfxSample\)/, "缺少采样预加载");
  const panels = fs.readFileSync(new URL("../js/ui/panels.js", import.meta.url), "utf8");
  assert.match(panels, /音效：Kenney Interface Sounds（CC0）/, "关于页缺少 Kenney 音效署名");
  assert.match(panels, /Kresiek The Furry/, "关于页缺少雨声作者署名");
  assert.match(panels, /syncopika/, "关于页缺少蝉声作者署名");
});

test("设置面板可试听音效", () => {
  // v3.4.32：音效音量变化后玩家需要一个即时确认手段——
  // 试听按钮播放信纸采样，滑杆松手也试听一次（音量为 0 时不播）。
  const panels = fs.readFileSync(new URL("../js/ui/panels.js", import.meta.url), "utf8");
  assert.match(panels, /id="cfg-sfx-test"/, "设置面板缺少音效试听按钮");
  assert.match(panels, /sfxTestBtn\.onclick = \(\) => playSfx\("letter"\)/, "试听按钮未接入 playSfx");
  assert.match(panels, /sfxSlider\.onchange = \(\) => \{\s+if \(\(Saves\.settings\.sfxVolume[\s\S]*?playSfx\("letter"\)/, "滑杆松手未试听");
  const css = fs.readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.config-sfx-test\s*\{/, "缺少试听按钮样式");
});

test("低配模式：界面模糊是已知设置，导入/读档时不被丢弃", () => {
  // v3.4.50：normalizeSettings 的布尔白名单必须包含新键，否则导入 JSON 会静默丢设置。
  assert.match(saves, /blurEffects:\s*true/);
  assert.match(saves, /"reduceMotion",\s*"blurEffects"/);
  assert.match(engine, /classList\.toggle\("no-blur",\s*s\.blurEffects === false\)/);
  assert.match(panels, /id="cfg-blur"/);
});

test("低配模式：CSS 覆盖常驻容器与一次性玩法浮层", () => {
  const block = css.split("v3.4.50 低配模式")[1] || "";
  for (const sel of ["#dialog-box", "#choices", "#day-bar", "#heart-bar", '[id$="-layer"]']) {
    assert.ok(block.includes(sel), `no-blur 规则缺少 ${sel}`);
  }
  assert.match(block, /backdrop-filter: none !important/);
  assert.match(block, /-webkit-backdrop-filter: none !important/);
});

test("云存档「进度量」用的存档键名与 js/saves.js 的常量一致（v3.4.55 契约）", () => {
  // 服务端（server/progress.mjs）与前端（js/account.js）各有一份同口径的进度量计算，
  // 用来判断「空存档覆盖」「收集进度变少」。键名任何一处与 saves.js 的常量对不上，
  // 那一侧就会算出 0——保护要么永远误报、要么永远不触发。改存档键名时这里必须一起改。
  const constantOf = (name) => {
    const m = saves.match(new RegExp(`const\\s+${name}\\s*=\\s*"([^"]+)"`));
    assert.ok(m, `js/saves.js 里找不到常量 ${name}`);
    return m[1];
  };
  const savesKey = constantOf("STORAGE_KEY");
  const autosaveKey = constantOf("AUTOSAVE_KEY");
  const collectKeys = ["ENDINGS_KEY", "KEYWORDS_KEY", "CG_KEY", "CLUES_KEY", "MEMORIES_KEY", "COMPOSED_KEY"].map(constantOf).sort();

  for (const [file, label] of [["../server/progress.mjs", "服务端"], ["../js/account.js", "前端"]]) {
    const src = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    const str = (name) => {
      const m = src.match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*"([^"]+)"`));
      assert.ok(m, `${label}里找不到 ${name}`);
      return m[1];
    };
    assert.equal(str("SAVES_KEY"), savesKey, `${label} SAVES_KEY 与 saves.js 不一致`);
    assert.equal(str("AUTOSAVE_KEY"), autosaveKey, `${label} AUTOSAVE_KEY 与 saves.js 不一致`);
    // 匹配到 "];" 为止——元素后面的注释里有 "]"，非贪婪匹配到第一个 "]" 会提前结束
    const block = src.match(/COLLECT_KEYS\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(block, `${label}里找不到 COLLECT_KEYS`);
    const found = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(found, collectKeys, `${label} COLLECT_KEYS 与 saves.js 不一致`);
  }
});

test("账号功能开关：仓库默认关闭，带账号服务的部署才打开（v3.4.55 契约）", () => {
  // 仓库里的 index.html 默认 off：纯静态部署（安装包、静态镜像、测试环境）不探测 /api/，
  // 设置页也不显示账号区块。带账号服务的部署在部署期把它改成空串（同源打开）。
  // 任何一处写法变了，部署期的改写就会静默失效——玩家要么看不到账号，要么每次打开设置页多一个 404。
  const metas = [...html.matchAll(/<meta\s+name="gayme-account-api"\s+content="([^"]*)"\s*\/?>/g)];
  assert.equal(metas.length, 1, "index.html 里账号开关 meta 应恰好一处");
  assert.equal(metas[0][1], "off", "仓库默认值必须是 off");

  // 前端：off 即关闭（不发请求、不显示账号区块）
  const account = fs.readFileSync(new URL("../js/account.js", import.meta.url), "utf8");
  assert.match(account, /const ACCOUNT_ENABLED = metaValue !== "off" && location\.protocol !== "file:"/);

  // 盒子部署脚本在同步站点后执行这个工具；它的匹配规则必须认得 index.html 里的写法
  const tool = fs.readFileSync(new URL("../tools/patch_account_flag.py", import.meta.url), "utf8");
  assert.ok(tool.includes(`re.subn(r'name="gayme-account-api"\\s+content="[^"]*"', target, text)`),
    "补丁工具的匹配规则变了：要确认它仍认得 index.html 里开关的写法");
  assert.match(tool, /if count != 1:/, "开关 meta 不是恰好一处时必须拒绝修改");
  const cron = fs.readFileSync(new URL("../tools/box_cron_deploy.sh", import.meta.url), "utf8");
  assert.match(cron, /patch_account_flag\.py" on "\$WEB"/);
  assert.match(cron, /if ! account_flag_on; then echo "账号功能开关未打开"; return 1; fi/);

  // 自带账号接口的服务进程提供首页时在内存里改写（磁盘文件不动）
  const server = fs.readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
  assert.match(server, /const ACCOUNT_FLAG_OFF = 'name="gayme-account-api" content="off"';/);
  assert.match(server, /const ACCOUNT_FLAG_ON = 'name="gayme-account-api" content=""';/);
  assert.match(server, /if \(rel === "index.html"\) \{\s*const body = Buffer\.from\(readIndexHtml\(\)\);/);
});

test("账号开关补丁工具：打开 / 关闭 / 幂等 / 写法异常时拒绝修改", (t) => {
  // 真实执行 tools/patch_account_flag.py（在临时目录里操作 index.html 的副本）
  const python = spawnSync("python3", ["--version"], { encoding: "utf8" });
  if (python.error) { t.skip("本机没有 python3，跳过"); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gayme-flag-"));
  const run = (...args) => spawnSync("python3", [
    new URL("../tools/patch_account_flag.py", import.meta.url).pathname, ...args, dir,
  ], { encoding: "utf8" });
  const read = () => fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const write = (text) => fs.writeFileSync(path.join(dir, "index.html"), text);
  const OFF = '<meta name="gayme-account-api" content="off">';
  const ON = '<meta name="gayme-account-api" content="">';
  try {
    write(`<!doctype html>\n<head>\n${OFF}\n</head>\n`);
    let r = run("on");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(read(), `<!doctype html>\n<head>\n${ON}\n</head>\n`, "打开：只改开关，别的一个字符都不动");
    // 幂等：已是目标状态时不写文件（修改时间不变）、不输出
    const before = fs.statSync(path.join(dir, "index.html")).mtimeMs;
    fs.utimesSync(path.join(dir, "index.html"), 1, 1);
    r = run("on");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "", "已是目标状态时不应输出（部署日志里会刷屏）");
    assert.equal(fs.statSync(path.join(dir, "index.html")).mtimeMs, 1000, "已是目标状态时不应重写文件");
    r = run("off");
    assert.equal(r.status, 0, r.stderr);
    assert.ok(read().includes(OFF), "关闭");

    // 写法异常：一处都没有、或有两处——都不许动文件，退出码非零（部署健康检查据此判失败）
    for (const broken of ["<!doctype html><head></head>", `${OFF}\n${OFF}`]) {
      write(broken);
      const mtime = 2000;
      fs.utimesSync(path.join(dir, "index.html"), 2, 2);
      r = run("on");
      assert.notEqual(r.status, 0, `写法异常时必须失败：${broken}`);
      assert.equal(read(), broken, "失败时不许改动文件");
      assert.equal(fs.statSync(path.join(dir, "index.html")).mtimeMs, mtime, "失败时不许重写文件");
    }
    // 开关值是别的（例如带接口前缀）：规范成目标值，而不是拒绝
    write('<meta name="gayme-account-api" content="/acct">');
    assert.equal(run("on").status, 0);
    assert.ok(read().includes(ON), "其它取值应被规范成目标值");
    // 参数错误
    assert.notEqual(run("nope").status, 0);
    assert.notEqual(spawnSync("python3", [new URL("../tools/patch_account_flag.py", import.meta.url).pathname], { encoding: "utf8" }).status, 0);
    // 目录里没有 index.html
    fs.rmSync(path.join(dir, "index.html"));
    assert.notEqual(run("on").status, 0);
    void before;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("账号服务加固契约：哈希异步、地址取最后一项、文件掩码、致命错误后退出（v3.4.56）", () => {
  // 这些都是「改回去也不会有任何功能用例变红」的写法，所以用契约钉住
  const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const auth = read("../server/auth.mjs");
  assert.match(auth, /crypto\.scrypt\(/, "密码哈希应使用异步 scrypt");
  for (const [file, label] of [["../server/auth.mjs", "auth.mjs"], ["../server/api.mjs", "api.mjs"]]) {
    assert.doesNotMatch(read(file), /scryptSync/, `${label} 不应再使用同步哈希（会占住整个服务）`);
  }
  assert.match(auth, /normalizeIp\(parts\[parts\.length - 1\]\)/, "客户端地址应取转发头的最后一项");
  assert.doesNotMatch(auth, /split\("、"\)\[0\]/, "不应再取第一项");

  const entry = read("../server/index.mjs");
  const umaskAt = entry.indexOf("process.umask(0o077);");
  assert.ok(umaskAt > 0, "入口应设置文件掩码 077（新建文件仅属主可读写）");
  assert.ok(entry.indexOf("ensureDataDir();") > umaskAt, "文件掩码必须在创建数据目录之前设置");
  assert.match(entry, /for \(const file of \[DB_PATH, `\$\{DB_PATH\}-wal`, `\$\{DB_PATH\}-shm`\]\) tightenFileMode\(file\);/,
    "启动时应把已有的数据库文件收紧为 600");
  assert.match(entry, /installFatalHandlers\(\{/, "入口应安装致命错误处理器");
  assert.doesNotMatch(entry, /process\.on\("uncaughtException"|process\.on\("unhandledRejection"/,
    "入口不应再自行注册「只记日志、继续运行」的处理器");

  const backup = read("../server/backup_db.mjs");
  assert.match(backup, /process\.umask\(0o077\)/, "备份进程应设置文件掩码");
  assert.match(backup, /tightenDirectoryTree\(backupDir/, "备份时应顺手收紧旧备份的权限");

  const db = read("../server/db.mjs");
  assert.match(db, /cleanupOrphanAudit: db\.prepare\([\s\S]*?NOT IN \(SELECT id FROM users\)/, "定期清理应包含孤儿审计记录");
  assert.match(db, /stmt\.cleanupOrphanAudit\.run\(\);/);

  const nginx = read("../tools/patch_nginx_account.py");
  assert.match(nginx, /XFF_PASSTHROUGH = "proxy_set_header X-Forwarded-For \$http_x_forwarded_for;"/,
    "nginx 应原样透传转发地址头——服务端取最后一项，nginx 再往后追加就会把所有玩家当成代理的地址");
  assert.ok(nginx.includes("server_tokens off;"), "nginx 应关闭版本号回显");
  assert.ok(nginx.includes("scripts|dist"), "nginx 的不对外目录名单应包含 scripts 与 dist");
});

test("持续集成跑的是全部测试套件（v3.4.56 契约）", () => {
  // 起因：引擎回归红了四天没人发现，因为流水线根本不跑它。
  // package.json 里每新增一个 test:* 脚本，都必须同时加进流水线，否则这里会红
  const workflow = fs.readFileSync(new URL("../.github/workflows/test.yml", import.meta.url), "utf8");
  const scripts = Object.keys(packageJson.scripts).filter((key) => key === "test" || key.startsWith("test:"));
  assert.ok(scripts.length >= 16, `测试脚本数量异常：${scripts.length}`);
  for (const key of scripts) {
    const command = key === "test" ? "npm test" : `npm run ${key}`;
    // 后面不能再紧跟冒号或字母数字，避免「npm run test:e2e」被「npm run test:e2e:firefox」蒙混过去
    const pattern = new RegExp(command.replaceAll(".", "\\.") + "(?![:\\w])");
    assert.match(workflow, pattern, `持续集成缺少「${command}」`);
  }
  for (const tool of ["tools/test_box_cron_deploy.sh", "tools/test_nginx_patch.sh"]) {
    assert.ok(workflow.includes(tool), `持续集成缺少 ${tool}`);
  }
});

test("仓库根目录的每个条目都已归类：站点运行文件，或明确不进公开目录（v3.4.56 契约）", () => {
  // 部署脚本用「排除法」决定哪些东西不进站点根。仓库根目录新增一个条目时，
  // 如果这里和排除名单都没登记，它就会被悄悄发布到公网——v3.4.55 就是这样发现
  // dist/ 与 scripts/ 可被下载的。所以新条目必须二选一。
  const cron = fs.readFileSync(new URL("../tools/box_cron_deploy.sh", import.meta.url), "utf8");
  const direct = fs.readFileSync(new URL("../tools/deploy_box.sh", import.meta.url), "utf8");
  // 定时部署脚本把名单写在引号里，最后一项会带着引号，去掉再比
  const excludesOf = (src) => new Set([...src.matchAll(/--exclude (\S+)/g)].map((match) => match[1].replace(/["']+$/, "")));
  const excluded = excludesOf(cron);
  assert.deepEqual([...excludesOf(direct)].sort(), [...excluded].sort(), "两个部署脚本的排除名单必须一致");

  // 站点运行需要的根目录条目（页面、离线缓存脚本、账号服务静态白名单引用到的公开路径）
  const runtime = [
    "VERSION", "NOTICE.md", "PRIVACY.md", "favicon.svg", "index.html", "manifest.webmanifest",
    "robots.txt", "sitemap.xml", "sw.js", "assets", "audio", "css", "fonts", "icons", "js",
  ];
  for (const name of runtime) {
    assert.ok(!excluded.has(name), `运行文件 ${name} 不该出现在排除名单里`);
    assert.ok(fs.existsSync(new URL(`../${name}`, import.meta.url)), `运行文件清单里的 ${name} 已不存在，请从清单移除`);
  }

  const root = fileURLToPath(new URL("..", import.meta.url));
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  assert.equal(listed.status, 0, "git ls-files 执行失败");
  const top = [...new Set(listed.stdout.split("\0").filter(Boolean).map((file) => file.split("/")[0]))].sort();
  assert.ok(top.length >= 10, `仓库根目录条目数量异常：${top.length}`);
  for (const name of top) {
    assert.ok(runtime.includes(name) || excluded.has(name),
      `仓库根目录的「${name}」没有归类：它是站点运行文件，就加进本测试的 runtime 清单；`
      + `不该公开，就加进 tools/box_cron_deploy.sh 与 tools/deploy_box.sh 的排除名单`);
  }
});
