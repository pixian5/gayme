# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v3.3.17**（开发测试版 · Demo）
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
npm test                    # Node 原生测试：剧情图可达性 / 时间线一致性 / 存档边界 / 静态契约 / 生命周期（42 项）
npm run test:syntax         # 全部 JS 语法检查
npm run test:e2e            # 真实浏览器运行时回归（chromium；首次需 npx playwright install chromium）
```

改动完成门槛：`npm test` 全过 + `npm run test:syntax` + `npm run test:e2e` +
`git diff --check` + 浏览器回归。本地测试是**唯一门槛**——push 三远程后
服务器每 3 分钟自动拉取部署（gitee 主源→github 备源，gitcode 第三备份），不再依赖任何 CI。

## 【当前开发进度】

剧情主线、后日谈、92 种互动实现（89 个 GameKit 玩法 + 3 个基础小游戏）与存档/图鉴系统
全部完成（417 节点 + 学姐线 24 节点 = 441 节点），42 项静态测试 + 浏览器 e2e 回归全过。
**v3.3.17**：CG 位图全量接入——11 张 CG 全部换成 AI 位图（1600×960 JPEG，合计约 2.3MB，
水彩插画风 + 暖色黄昏基调，人物外观设定统一）；样张改名 `cg_meet_shiyu.jpg` 统一命名；
SW 预缓存补齐 11 张（离线图鉴可看），静态契约测试补资源存在性；内联 SVG 保留为兜底路径。
**v3.3.16**：CG 位图支持 + 首张样张——CGS 新增可选 `img`（优先于内联 SVG），
图鉴卡片与大图查看器统一走 `cgArt()`；「走廊的初次相遇」接入 AI 位图（1600×960，355KB）
用于确认美术风格，后续批量只需产图 + 加一行 `img`，未替换的 CG 继续用 SVG。
**v3.3.15**：真实 BGM 落地——5 个场景 mood 接入自托管免版权 Ogg 曲目
（daily / bright / sad / calm / active，Patrick de Arteaga，CC BY 4.0，合计约 8MB），
双曲交叉淡入淡出 1.2 秒、循环播放、自动播放被拦截时等用户手势重试；音频缺失时回退原程序化配乐；
SW 预缓存加入曲目（离线可听），「关于」页补音乐与字体署名，设置面板 BGM 音量滑杆同步作用于真实曲目；
e2e 新增 BGM 解码断言。
**v3.3.14**：学姐线多周目文本（Phase 2 · P2-1a）——学姐线 13 个高信号节点补 loopText
（senior_2/3/4a/4b/4c/5/6/7/8/10/11/14/ending，64→77 节点），按「加深不反转」书写。
**v3.3.13**：存档增强 + 新手引导（Phase 1 · P1-4 / P1-7）——存档槽支持重命名、单槽导出 / 导入
（本地 JSON）；新档首次弹出可跳过的新手引导（`tutorialSeen` 只出现一次）。
**v3.3.12**：设置扩展（Phase 1 · P1-3）——新增「减少动效」开关（停粒子 + 关动画过渡，与系统偏好
叠加）与「界面字号」缩放（`--ui-scale`，0.9–1.3，实时生效）；均纳入 `DEFAULT_SETTINGS` 与设置键契约。
**v3.3.11**：CG 大图查看器（Phase 1 · P1-2）——图鉴中点击已解锁 CG 弹出放大视图，
←/→ 切换、Esc 或点击空白关闭；浮层 class 以 `-layer` 结尾，自动纳入交互锁与返回标题清理。
**v3.3.10**：键盘无障碍 + 数据统计（按完整计划 Phase 1 推进，P1-1 / P1-5）——选项/信件按钮支持
方向键移动、Enter/Space 确认、数字键 1-9 快选，补 `role`/`aria` 与 `:focus-visible` 焦点环；
新增「数据统计」浮层（剧情进度/结局/CG/关键词/合成/记忆/周目/累计时长）；累计时长写入独立
`STATS_KEY`（不碰剧情 flags）。
**v3.3.9**：共通线与后日谈多周目文本——`d2_library_8 / d2_field_5 / d2_art_3 /
d2_senior_easter_3 / d2_senior_easter_4 / afterword_three / afterword_4 / afterword_stamp /
afterword_autumn / afterword_wall` 共 10 个高信号节点补 loopText（54→64 节点）；并产出
**下一步开发完整计划**（分阶段任务清单）。
**v3.3.8**：女主线多周目文本扩展——诗雨 `sy_9 / sy_13_good / sy_11_bad`、夏织
`xz_7 / xz_9 / xz_14_good`、苏念 `sn_6 / sn_9 / sn_13_good` 共 9 个高信号节点补 loopText
（45→54 节点），均按「加深不反转」原则书写；引擎运行时无逻辑改动。
**v3.3.7**：图鉴标题 + 多周目文本——inbox / 自由回信 / 视角三处字符串 memory 补 `memoryTitle`
（15 个，图鉴卡片不再显示 id）；d4_night_family×2、d10_senior_slip×2、afterword_entry 补
loopText（40→45 节点）；新增「字符串 memory 都配 memoryTitle」「loopText 结构规范」契约（42 项）。
**v3.3.6**：限时消息持久化 + 焦点陷阱 + 引擎瘦身——inbox 倒计时改为持久化首次打开时间戳
（反复开关不再无限重置）；浮层焦点陷阱（Tab 不再逃逸到背景）；快进模式「跳过已读」自动连跳；
localhost 也注册 Service Worker（e2e 可覆盖）；删除 engine.js 中与 `js/games/*.js` 重复的
66 块 `node.xxx` schema 注释（-904 行）；e2e 补 SW / 焦点 / 倒计时断言。
**v3.3.5**：交互 / 无障碍 / 设置面板修复——打字机对白区改用 `aria-busy`（避免屏幕阅读器逐字
播报）；修复 `settings.sfx` 不存在导致音效总开关恒假，改为按音效音量判定；设置面板新增
「背景音乐音量」滑杆；`perspective-layer` 补 class（视角浮层不再逃过交互锁/清理）；minigame
节点隐藏对话框；删除选项空回执死代码；新增 settings 键白名单契约（40 项）+ e2e 滑杆断言。
**v3.3.4**：记忆/图鉴数据契约再修复——inbox 免费回信记忆取 id 错误（字符串取 `.id` 回退成
匹配键，写入 `brave` 等英文 id）；inbox 2 组分支互斥记忆（诗雨·凌晨 / 夏织·教练）共用 id
→ 拆分独立；性格画像补齐 8 维度中文映射与默认结构（careful/patient/calm/creative 原显示
英文）；唯一性契约升级为对象 + 字符串全覆盖并修正 requires_memory 自证口径，新增 personality
白名单契约（39 项）。
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

详细内容见 → [docs/20261024-1614-CG位图批量-Doubao.md](docs/20261024-1614-CG位图批量-Doubao.md)（上一版 → [docs/20261024-1540-CG位图样张-Doubao.md](docs/20261024-1540-CG位图样张-Doubao.md)；BGM → [docs/20261024-1517-真实BGM落地-Doubao.md](docs/20261024-1517-真实BGM落地-Doubao.md)；进度快照 → [当前开发进度](docs/20261024-1517-当前开发进度-Doubao.md)）

## 【下一步待实现】

- **已完成**：学姐线形态 A（v3.3.0）；图鉴收集率（v3.3.1）；CG 解锁缺口（v3.3.3）；
  记忆/图鉴数据契约（v3.3.4）；交互/无障碍/设置面板（v3.3.5）；限时持久化+焦点陷阱+引擎瘦身（v3.3.6）；
  图鉴记忆标题+多周目文本（v3.3.7）；女主线多周目文本（v3.3.8）；共通线/后日谈多周目文本（v3.3.9）；
  **P1-1 键盘无障碍 + P1-5 数据统计（v3.3.10）**；**P1-2 图鉴大图（v3.3.11）**；**P1-3 设置扩展（v3.3.12）**；**P1-4 存档增强 + P1-7 新手引导（v3.3.13）**；**P2-1a 学姐线 loopText（v3.3.14）**；**真实 BGM（v3.3.15）**；**CG 位图样张（v3.3.16）**；**CG 位图全量 11 张（v3.3.17）**。
- **完整计划**（分阶段任务清单：工程体验 / 内容纵深 / 素材管线 / 分发多语言，含文件、验收、成本、版本号）
  → [docs/20261024-0934-下一步开发完整计划-DeepSeek.md](docs/20261024-0934-下一步开发完整计划-DeepSeek.md)
- **Phase 3 开发方向（执行级，当前以此为准）**：拉取 v3.3.17 后重排——P0 快跑债务止血（Pages 失同步 / PWA 首装 11MB 分层 / pre-push 本地门禁 / 服务器原子部署与回滚）→ P1 内容纵深（loopText 续批、44 处双「她说」清零、回响 Tab）→ 美术收尾（位图立绘 v3.4.0 里程碑、CG webp）→ 发行准备（itch.io）
  → [docs/20261025-0444-下一步开发方向Phase3-GLM.md](docs/20261025-0444-下一步开发方向Phase3-GLM.md)
- 上一版详细计划（Phase 2，P2-1a / BGM / CG 位图已完成）
  → [docs/20261024-1314-下一步开发详细计划-DeepSeek.md](docs/20261024-1314-下一步开发详细计划-DeepSeek.md)
- **Phase 1 基本完成**（仅剩 P1-6 性能预取，评估后改为 B1/B2 两项低成本增强）；下一步进入 **Phase 2 内容纵深**。
- **建议执行顺序**：P2-1a loopText 学姐线 → P2-1b 真结局线 → P2-2 回响落地（先定 UI）→ P2-3/P2-4 → B1/B2。
- 需素材/拍板：AI 位图立绘（5 张，需透明背景）、itch.io 分发、英文 i18n、真实音效素材、玩法同质化调整。
  CG 位图（11 张）与真实 BGM（5 首）均已落地（v3.3.17 / v3.3.15，署名见「关于」页）。
  历史路线另见 → [docs/20261022-2247-下一步开发方案-Doubao.md](docs/20261022-2247-下一步开发方案-Doubao.md)

详细内容见 → [docs/20261024-1314-下一步开发详细计划-DeepSeek.md](docs/20261024-1314-下一步开发详细计划-DeepSeek.md)

## 文档索引与经验

- 全部文档（版本记录 / 规划 / 外部分析 / 工具说明）逐篇介绍 → [文档索引.md](文档索引.md)
- 分类经验（部署 / 版本规范 / 工程避坑 / 内容开发）→ [经验/](经验/)（docs 不一定都对，以实测为准）

## 目录结构

```
index.html          入口（样式 style.css + games.css；脚本 14 个按序加载，engine.js 最后）
css/style.css       基础与引擎 UI 样式（顶部为自托管 @font-face）
css/games.css       全部玩法浮层样式（94 套，v2.9.2 拆出）
fonts/              自托管 Noto Serif SC 子集（非 Mac 平台兜底；macOS 优先用本机 Songti SC，重建见 tools/rebuild_font_subset.sh）
audio/bgm/          5 首真实 BGM（Ogg，约 8MB；Patrick de Arteaga · CC BY 4.0，署名见游戏「关于」页）
assets/cg/          CG 位图 11 张（1600×960 JPEG，约 2.3MB；由 js/script.js 的 CGS.img 引用）
js/saves.js         存档与图鉴数据层（localStorage，107 个键；记录型存取由 recordStore 工厂生成）
js/script.js        剧情数据（CHARACTERS / PORTRAITS / KEYWORDS / CGS / SCRIPT 417 节点 + 学姐线 24 节点）
js/lifecycle.js     浮层异步生命周期（读档/返回标题时安全取消）
js/minigames.js     3 个基础迷你游戏（writing / running / painting）
js/gamekit.js       玩法框架基座：统一浮层外壳 / 结果收尾 / 生命周期 / host 桥 / 通用分发 types()
js/games/           全部 89 个玩法模块：afterword 5 / senses 8 / craft 13 / nature 13 /
                    perception 14 / mechanism 14 / imagery 12 / direct 10（直跳型）
js/engine.js        纯引擎：节点分发（GameKit.types() 通用循环）/ UI 浮层 / 存读档 / 图鉴 / 粒子 / BGM
sw.js               Service Worker：预缓存 42 项静态资源（含 5 首 BGM + 11 张 CG），缓存版本 sakura-vX.Y.Z 随发版同步
tools/              工程工具：玩法迁移转换器 / 等价性校验器 / 版本号同步 / 字体子集三件套
tests/              Node 原生测试（42 项）+ tests/browser/ 浏览器 e2e 回归（engine.e2e.mjs）
docs/               版本记录与规划文档（多模型分析文档在 docs/analysis/）
```

## 约定

- 版本号：每次修改 +0.0.1，满十进一（当前 v3.3.17，下一版 v3.3.18）
- 版本同步：`python3 tools/bump_version.py <新版本>` 一键同步 `VERSION` / `package.json` /
  `package-lock.json`（v3.3.4 起）/ `index.html`（`?v=` 与标题页）/ `sw.js`（PWA 缓存版本）/
  `js/engine.js`（GAME_VERSION 常量）；
  `js/engine.js` 头注释手工补一行变更说明（一致性测试兜底）
- 玩法开发：新玩法一律 `GameKit.register()` + `createShell()` / `shell.finish()`，
  经引擎的通用分发循环自动触发；样式写进 css/games.css；实现放 js/games/ 对应主题文件
- 新增玩法存储：使用 `js/saves.js` 的 `recordStore` / `unlockListStore` 工厂
- games 文件内**禁止引用引擎内部符号**（applyAdd / gotoNode / state 等）——用 GameKit 宿主桥，
  tools/equivalence_check.py 会扫描
- 字体：新增文案若出现子集未覆盖的汉字 → `bash tools/rebuild_font_subset.sh`
- BGM：`audio/bgm/{daily,bright,sad,calm,active}.ogg` 对应 5 个场景 mood，替换同名文件即可；
  素材为 CC BY 4.0，署名必须保留在游戏「关于」页
- CG 位图：11 张已全部接入（`CGS.img` → `assets/cg/<id>.jpg`，1600×960、5:3、JPEG q82，
  单张 115–355KB）；新增/替换 CG 只需产图 + 改 `img` 路径（或加字段），并把新文件补进
  `sw.js` 预缓存与 `tests/static.test.mjs` 资源清单；无 `img` 的条目仍用内联 SVG 兜底。
  生图后统一后处理：裁掉底部白色 letterbox → `scale=1600:960:flags=lanczos`（详见
  [docs/20261024-1614-CG位图批量-Doubao.md](docs/20261024-1614-CG位图批量-Doubao.md)）
- 字符集改动等价性：跨文件迁移/重构后跑 `tools/equivalence_check.py`（旧引擎快照 vs 新文件）
- 提交：中文 commit，完成后推送 gitee（origin）与 github（备份）；push 后服务器
  cron 每 3 分钟自动拉取部署到 oh.sbbz.tech（`tools/deploy.sh` 仅作手动备用）
- 部署链路：本地测试（npm test + test:syntax + test:e2e）是唯一门槛，不依赖任何 CI；
  服务器自动部署脚本 /usr/local/bin/sakura-deploy.sh（gitee 主源→github 备源）
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份
