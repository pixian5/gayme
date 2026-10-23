# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v3.3.3**（开发测试版 · Demo）
- 技术形态：纯前端，零构建，浏览器直接运行（devDependency 仅 playwright，供 e2e 测试）
- 存档方式：localStorage（schema v3，9 个槽位，槽位 1 为快存槽；快捷键 S 快存）
- 自动进度：推进剧情即自动记录最后位置（防刷新 / 关页丢失），标题页「继续游戏」一键恢复
- 在线试玩：https://oh.sbbz.tech:8080/ （push 后服务器每 3 分钟自动拉取部署；`bash tools/deploy.sh` 手动备用）
- 备用源（静态快照，非实时）：https://pixian5.github.io/gayme/

## 运行方式

直接用浏览器打开 `index.html`；或起本地静态服务器：

```bash
python3 -m http.server 4173   # 然后访问 http://127.0.0.1:4173
```

## 测试

```bash
npm test                    # Node 原生测试：剧情图可达性 / 时间线一致性 / 存档边界 / 静态契约 / 生命周期（38 项）
npm run test:syntax         # 全部 JS 语法检查
npm run test:e2e            # 真实浏览器运行时回归（chromium；首次需 npx playwright install chromium）
```

改动完成门槛：`npm test` 全过 + `npm run test:syntax` + `npm run test:e2e` +
`git diff --check` + 浏览器回归。本地测试是**唯一门槛**——push 三远程后
服务器每 3 分钟自动拉取部署（gitee 主源→github 备源，gitcode 第三备份），不再依赖任何 CI。

## 【当前开发进度】

剧情主线、后日谈、92 种互动实现（89 个 GameKit 玩法 + 3 个基础小游戏）与存档/图鉴系统
全部完成（417 节点 + 学姐线 24 节点 = 441 节点），38 项静态测试 + 浏览器 e2e 回归全过。
**v3.3.3**：CG 解锁缺口修复——cg_festival「学园祭之夜」写了但从未有节点 cg_unlock 引用
（玩家永远拿不到），接入后日谈开篇；深度审计全数据引用（结局/CG/关键词/配方/requires_*
无断链，requires_memory 修正口径后全部有效）；consistency 新增 CG 解锁点与
requires_memory 契约（38 项）。
**v3.3.2**：分支记忆 id 独立化——修复 7 组分支互斥记忆共用 id（saveMemory 按 id 去重，
后解锁分支的记忆被吞、图鉴缺分支记忆），15 处拆分独立 id，二周目可补齐；consistency
新增 memory id 全局唯一契约（36 项）。
**v3.3.1**：图鉴收集率统计——结局图鉴 / CG 图鉴 / 关键词面板顶部新增收集进度条
（结局 x/13、CG x/11、关键词/合成/记忆计数），一眼看到收集缺口；记忆存档新增 title
字段，记忆卡片展示友好标题（旧存档无 title 回退 id）；e2e 补收集进度断言。
**v3.3.0**：学姐线形态 A——二周目（loopCount≥1 且解锁 true_unbroken）第 5 日出现隐藏
第 4 选项「⟲ 去旧校舍找学姐」；24 节点专属剧情（3 选择点 + 自由写信 4 分支 + 4 段记忆 +
CG「看见」+ SIDE 结局，图鉴 13 张）；引擎新增 requires_ending 过滤；修复 free letter
回信记忆对象格式既有 bug（4 组，改字符串 id + 引擎兼容旧数据）+ consistency memory 契约。
**v3.2.4**：字体子集重建——修正 noto-cjk 源地址并补齐 91 个缺失汉字（覆盖检查 0 缺失）；
语法测试改为扫描全部 `js/**/*.js` 与 `sw.js`。**v3.2.3**：部署链路去 GitHub CI/CD——移除全部 GitHub Actions
workflow（GitHub 仓库降级纯备份），服务器改 root cron 每 3 分钟自动拉取部署
（gitee 主源→github 备源，rsync + 版本校验）；本地测试为唯一门槛，push 后不阻塞等 CI；
新增根目录「经验」文件夹沉淀 4 类经验。**v3.2.2**：多周目内容纵深 + 发行体验——P1-1
主线 39 节点新增多周目差异化文本（loopText 随循环次数变化）；P1-2 合成系统扩展
（回忆 6→11 段、配方 7→11 条）；P1-3 学姐线形态 B（后日谈学姐视角回忆 3 节点）；
P0-2 符号兜底（91 汉字缺字已于 v3.2.4 补齐）；P2-1 关于页反馈入口 + GAME_VERSION 常量；
P2-2 首屏性能（脚本 defer + gzip）；P3 存档审计（107 键安全）。此前 v3.2.1：e2e 浏览器
回归落地并接入 CI；v2.8.5 → v3.2.0：工程债务清偿、功能增强、剧情治理、表现升级。

详细内容见 → [docs/20261024-0351-深度数据审计与CG解锁修复-Doubao.md](docs/20261024-0351-深度数据审计与CG解锁修复-Doubao.md)（进度快照 → [当前开发进度](docs/20261024-0351-当前开发进度-Doubao.md)）

## 【下一步待实现】

- **学姐线形态 A 已完成**（v3.3.0）；**图鉴收集率统计已完成**（v3.3.1）；
  **分支记忆 id 唯一性修复已完成**（v3.3.2）；**CG 解锁缺口修复已完成**（v3.3.3）。
- 剩余可选项：真实录音 BGM（需音频素材）、AI 位图立绘/CG（需生图服务或自备图片）、
  试玩反馈驱动的玩法同质化调整、itch.io 等外部平台分发（未确认）。
  完整分优先级的开发路线见 → [docs/20261022-2247-下一步开发方案-Doubao.md](docs/20261022-2247-下一步开发方案-Doubao.md)

详细内容见 → [docs/20261023-0017-下一步待实现-Doubao.md](docs/20261023-0017-下一步待实现-Doubao.md)

## 文档索引与经验

- 全部文档（版本记录 / 规划 / 外部分析 / 工具说明）逐篇介绍 → [文档索引.md](文档索引.md)
- 分类经验（部署 / 版本规范 / 工程避坑 / 内容开发）→ [经验/](经验/)（docs 不一定都对，以实测为准）

## 目录结构

```
index.html          入口（样式 style.css + games.css；脚本 14 个按序加载，engine.js 最后）
css/style.css       基础与引擎 UI 样式（顶部为自托管 @font-face）
css/games.css       全部玩法浮层样式（94 套，v2.9.2 拆出）
fonts/              自托管 Noto Serif SC 子集（非 Mac 平台兜底；macOS 优先用本机 Songti SC，重建见 tools/rebuild_font_subset.sh）
js/saves.js         存档与图鉴数据层（localStorage，107 个键；记录型存取由 recordStore 工厂生成）
js/script.js        剧情数据（CHARACTERS / PORTRAITS / KEYWORDS / CGS / SCRIPT 417 节点 + 学姐线 24 节点）
js/lifecycle.js     浮层异步生命周期（读档/返回标题时安全取消）
js/minigames.js     3 个基础迷你游戏（writing / running / painting）
js/gamekit.js       玩法框架基座：统一浮层外壳 / 结果收尾 / 生命周期 / host 桥 / 通用分发 types()
js/games/           全部 89 个玩法模块：afterword 5 / senses 8 / craft 13 / nature 13 /
                    perception 14 / mechanism 14 / imagery 12 / direct 10（直跳型）
js/engine.js        纯引擎：节点分发（GameKit.types() 通用循环）/ UI 浮层 / 存读档 / 图鉴 / 粒子 / BGM
sw.js               Service Worker：预缓存 26 项静态资源，缓存版本 sakura-vX.Y.Z 随发版同步
tools/              工程工具：玩法迁移转换器 / 等价性校验器 / 版本号同步 / 字体子集三件套
tests/              Node 原生测试（35 项）+ tests/browser/ 浏览器 e2e 回归（engine.e2e.mjs）
docs/               版本记录与规划文档（多模型分析文档在 docs/analysis/）
```

## 约定

- 版本号：每次修改 +0.0.1，满十进一（当前 v3.3.0，下一版 v3.3.1）
- 版本同步：`python3 tools/bump_version.py <新版本>` 一键同步 `VERSION` / `package.json` /
  `index.html`（`?v=` 与标题页）/ `sw.js`（PWA 缓存版本）/ `js/engine.js`（GAME_VERSION 常量）；
  `js/engine.js` 头注释手工补一行变更说明（一致性测试兜底）
- 玩法开发：新玩法一律 `GameKit.register()` + `createShell()` / `shell.finish()`，
  经引擎的通用分发循环自动触发；样式写进 css/games.css；实现放 js/games/ 对应主题文件
- 新增玩法存储：使用 `js/saves.js` 的 `recordStore` / `unlockListStore` 工厂
- games 文件内**禁止引用引擎内部符号**（applyAdd / gotoNode / state 等）——用 GameKit 宿主桥，
  tools/equivalence_check.py 会扫描
- 字体：新增文案若出现子集未覆盖的汉字 → `bash tools/rebuild_font_subset.sh`
- 字符集改动等价性：跨文件迁移/重构后跑 `tools/equivalence_check.py`（旧引擎快照 vs 新文件）
- 提交：中文 commit，完成后推送 gitee（origin）与 github（备份）；push 后服务器
  cron 每 3 分钟自动拉取部署到 oh.sbbz.tech（`tools/deploy.sh` 仅作手动备用）
- 部署链路：本地测试（npm test + test:syntax + test:e2e）是唯一门槛，不依赖任何 CI；
  服务器自动部署脚本 /usr/local/bin/sakura-deploy.sh（gitee 主源→github 备源）
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份
