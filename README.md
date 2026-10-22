# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v3.2.1**（开发测试版 · Demo）
- 技术形态：纯前端，零构建，浏览器直接运行（devDependency 仅 playwright，供 e2e 测试）
- 存档方式：localStorage（schema v3，9 个槽位，槽位 1 为快存槽；快捷键 S 快存）
- 自动进度：推进剧情即自动记录最后位置（防刷新 / 关页丢失），标题页「继续游戏」一键恢复
- 在线试玩：https://pixian5.github.io/gayme/ （push 后 GitHub Actions 自动部署）
- 自有服务器：https://oh.sbbz.tech:8080/ （push 后 CI 自动同步部署；`bash tools/deploy.sh` 可手动备用）

## 运行方式

直接用浏览器打开 `index.html`；或起本地静态服务器：

```bash
python3 -m http.server 4173   # 然后访问 http://127.0.0.1:4173
```

## 测试

```bash
npm test                    # Node 原生测试：剧情图可达性 / 时间线一致性 / 存档边界 / 静态契约 / 生命周期（32 项）
npm run test:syntax         # 全部 JS 语法检查
npm run test:e2e            # 真实浏览器运行时回归（chromium；首次需 npx playwright install chromium）
```

改动完成门槛：`npm test` 全过 + `npm run test:syntax` + `npm run test:e2e` +
`git diff --check` + 浏览器回归。推送 main 后 GitHub Actions 自动跑全部测试并部署
（Pages + 自有服务器 + e2e）。

## 【当前开发进度】

剧情主线、后日谈、90 个互动玩法与存档/图鉴系统全部完成（414 个节点），32 项静态测试
+ 浏览器 e2e 回归全过。**v3.2.1**：e2e 浏览器回归落地（修复 4 个根因 bug：ROOT 路径 /
进程不退出 / window.Saves / closeOverlay）并接入 CI；`__game` 导出补齐 closeOverlay。
此前 v2.8.5 → v3.2.0：工程债务清偿（玩法全部模块化、engine.js 14,614→3,478 行纯引擎、
CSS 拆分、CI + Pages 自动部署）；功能增强（自动存档防刷新丢失、三层程序化 BGM + 5 种
音效、玩法结果影响叙事、合成回忆、PWA 离线化、OG 分享卡片、CI 自动部署服务器、证书
续期闭环）；剧情治理（414 节点全量走查 + 12 项合理性修补）；表现升级（移动端安全区与
触控适配、顶栏折叠菜单、5 张立绘 + 10 张 CG 全面重绘、减动效）。

详细内容见 → [docs/20261022-2226-当前开发进度-Doubao.md](docs/20261022-2226-当前开发进度-Doubao.md)

## 【下一步待实现】

剩余可选项：真实录音 BGM（需音频素材）、AI 位图立绘/CG（需生图服务或自备图片）、
试玩反馈驱动的玩法同质化调整、字体子集重建（缺 85 字符，需 WiFi 环境）。工程与美术
占位问题已全部关闭。完整分优先级的开发路线见 → [docs/20261022-2247-下一步开发方案-Doubao.md](docs/20261022-2247-下一步开发方案-Doubao.md)

详细内容见 → [docs/20261022-2226-下一步待实现-Doubao.md](docs/20261022-2226-下一步待实现-Doubao.md)

## 文档索引

全部文档（版本记录 / 规划 / 外部分析 / 工具说明）的逐篇介绍见 → [文档索引.md](文档索引.md)

## 目录结构

```
index.html          入口（字体 preload；样式 style.css + games.css；脚本 12 个按序加载，engine.js 最后）
css/style.css       基础与引擎 UI 样式（顶部为自托管 @font-face）
css/games.css       全部玩法浮层样式（94 套，v2.9.2 拆出）
fonts/              自托管 Noto Serif SC 子集（非 Mac 平台兜底；macOS 优先用本机 Songti SC，重建见 tools/rebuild_font_subset.sh）
js/saves.js         存档与图鉴数据层（localStorage，106 个键；记录型存取由 recordStore 工厂生成）
js/script.js        剧情数据（CHARACTERS / PORTRAITS / KEYWORDS / CGS / SCRIPT 409 节点）
js/lifecycle.js     浮层异步生命周期（读档/返回标题时安全取消）
js/minigames.js     3 个基础迷你游戏（writing / running / painting）
js/gamekit.js       玩法框架基座：统一浮层外壳 / 结果收尾 / 生命周期 / host 桥 / 通用分发 types()
js/games/           全部 89 个玩法模块：afterword 5 / senses 8 / craft 13 / nature 13 /
                    perception 14 / mechanism 14 / imagery 12 / direct 10（直跳型）
js/engine.js        纯引擎：节点分发（GameKit.types() 通用循环）/ UI 浮层 / 存读档 / 图鉴 / 粒子 / BGM
sw.js               Service Worker：预缓存 25 项静态资源，缓存版本 sakura-vX.Y.Z 随发版同步
tools/              工程工具：玩法迁移转换器 / 等价性校验器 / 版本号同步 / 字体子集三件套
tests/              Node 原生测试（32 项）+ tests/browser/ 浏览器 e2e 回归（engine.e2e.mjs）
docs/               版本记录与规划文档（多模型分析文档在 docs/analysis/）
```

## 约定

- 版本号：每次修改 +0.0.1，满十进一（当前 v3.2.1，下一版 v3.2.2）
- 版本同步：`python3 tools/bump_version.py <新版本>` 一键同步 `VERSION` / `package.json` /
  `index.html`（`?v=` 与标题页）/ `sw.js`（PWA 缓存版本）；`js/engine.js` 头注释手工补一行
  变更说明（一致性测试兜底）
- 玩法开发：新玩法一律 `GameKit.register()` + `createShell()` / `shell.finish()`，
  经引擎的通用分发循环自动触发；样式写进 css/games.css；实现放 js/games/ 对应主题文件
- 新增玩法存储：使用 `js/saves.js` 的 `recordStore` / `unlockListStore` 工厂
- games 文件内**禁止引用引擎内部符号**（applyAdd / gotoNode / state 等）——用 GameKit 宿主桥，
  tools/equivalence_check.py 会扫描
- 字体：新增文案若出现子集未覆盖的汉字 → `bash tools/rebuild_font_subset.sh`
- 字符集改动等价性：跨文件迁移/重构后跑 `tools/equivalence_check.py`（旧引擎快照 vs 新文件）
- 提交：中文 commit，完成后推送 gitee（origin）与 github；push main 后 CI 自动部署
  Pages 与自有服务器（`tools/deploy.sh` 仅作手动备用）
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份
