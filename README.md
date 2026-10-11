# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v2.9.5**（开发测试版 · Demo）
- 技术形态：纯前端，零依赖、零构建，浏览器直接运行
- 存档方式：localStorage（schema v3，9 个槽位，槽位 1 为快存槽；快捷键 S 快存）
- 自动进度：推进剧情即自动记录最后位置（防刷新 / 关页丢失），标题页「继续游戏」一键恢复
- 在线试玩：https://pixian5.github.io/gayme/ （push 到 main 后由 GitHub Actions 自动部署）

## 运行方式

直接用浏览器打开 `index.html`；或起本地静态服务器：

```bash
python3 -m http.server 4173   # 然后访问 http://127.0.0.1:4173
```

## 测试

```bash
npm test           # Node 原生测试：剧情图可达性 / 时间线一致性 / 存档边界 / 静态契约 / 生命周期
npm run test:syntax
```

改动完成门槛：`npm test` 全过 + `npm run test:syntax` + `git diff --check` + 浏览器回归。
推送 main 后 GitHub Actions 会自动跑同一套测试并部署 Pages。

## 【当前开发进度】

剧情主线、后日谈、90 个互动玩法与存档/图鉴系统全部完成（409 个剧情节点），31 项测试全过。
**工程债务已清偿（v2.8.5 → v2.9.5）**：v2.8.5 GameKit 通用分发；v2.8.6~v2.9.1 六批玩法迁移收官
（engine.js 的 63 个玩法全部迁至 js/games/ 八个模块，engine.js 14,614 → 3,373 行，降为纯引擎；
迁移全程用自动化转换器 + 等价性校验器，并顺带修复 7 处监听/定时器泄漏与残留跳转 bug）；
v2.9.2 玩法样式拆至 css/games.css；v2.9.3 字体子集覆盖检查工具化（基线缺 30 字符待重建）；
v2.9.4 GitHub Actions CI + Pages 自动部署；v2.9.5 仓库整理（分析文档归档、文档索引）。

详细内容见 → [docs/20261011-0541-当前开发进度-GLM.md](docs/20261011-0541-当前开发进度-GLM.md)

## 【下一步待实现】

~~玩法框架基座~~ → ~~六批玩法迁移~~ → ~~CSS 拆分~~ → ~~发布链路~~ → 字体子集重建（WiFi 环境一条命令）
→ 浏览器全玩法回归 → 玩法结果影响叙事 → 真实音频 / 立绘 / CG（需资产）→ 移动端打磨 → 试玩发布。

详细内容见 → [docs/20261011-0541-下一步待实现-GLM.md](docs/20261011-0541-下一步待实现-GLM.md)

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
tools/              工程工具：玩法迁移转换器 / 等价性校验器 / 版本号同步 / 字体子集三件套
tests/              Node 原生测试（31 项）
docs/               版本记录与规划文档（7 份多模型分析文档在 docs/analysis/）
```

## 约定

- 版本号：每次修改 +0.0.1，满十进一（当前 v2.9.5，下一版 v2.9.6）
- 版本同步：`python3 tools/bump_version.py <新版本>` 一键同步 `VERSION` / `package.json` /
  `index.html`（`?v=` 与标题页）；`js/engine.js` 头注释手工补一行变更说明（一致性测试兜底）
- 玩法开发：新玩法一律 `GameKit.register()` + `createShell()` / `shell.finish()`，
  经引擎的通用分发循环自动触发；样式写进 css/games.css；实现放 js/games/ 对应主题文件
- 新增玩法存储：使用 `js/saves.js` 的 `recordStore` / `unlockListStore` 工厂
- games 文件内**禁止引用引擎内部符号**（applyAdd / gotoNode / state 等）——用 GameKit 宿主桥，
  tools/equivalence_check.py 会扫描
- 字体：新增文案若出现子集未覆盖的汉字 → `bash tools/rebuild_font_subset.sh`
- 字符集改动等价性：跨文件迁移/重构后跑 `tools/equivalence_check.py`（旧引擎快照 vs 新文件）
- 提交：中文 commit，完成后推送 gitee（origin）与 github
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份
