# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v3.4.29**（开发测试版 · Demo）
- 技术形态：纯前端，零构建，浏览器直接运行（devDependency 仅 playwright，供 e2e 测试）
- 存档方式：localStorage（schema v3，9 个槽位，槽位 1 为快存槽；快捷键 S 快存）
- 自动进度：推进剧情即自动记录最后位置（防刷新 / 关页丢失），标题页「继续游戏」一键恢复
- 在线试玩：https://oh.sbbz.tech:8080/ （push 后服务器每 3 分钟自动拉取部署；`bash tools/deploy.sh` 手动备用）
- Hugging Face 镜像：https://xbzsb-sakura-letters.static.hf.space/index.html
  （[Space 页面](https://huggingface.co/spaces/xbzsb/sakura-letters)；`HF_TOKEN=... bash tools/deploy_hf.sh` 手动同步）
- 旧 Pages 链接已 301 重定向到唯一正式源（gh-pages 分支只放跳转页，v3.3.18）

## 运行方式

直接用浏览器打开 `index.html`；或起本地静态服务器：

```bash
python3 -m http.server 4173   # 然后访问 http://127.0.0.1:4173
```

## 测试

```bash
npm test                    # Node 原生测试：剧情图可达性 / 时间线一致性 / 存档边界 / 静态契约 / 生命周期（48 项）
npm run test:syntax         # 全部 JS 语法检查
npm run test:e2e            # 真实浏览器运行时回归（chromium；首次需 npx playwright install chromium）
npm run test:mobile         # 移动端触控回归（390×844 / hasTouch / isMobile，~5s）
npm run test:e2e:firefox    # 同上换 Firefox 内核（首次需 npx playwright install firefox + install-deps firefox）
```

改动完成门槛：`npm test` 全过 + `npm run test:syntax` + `npm run test:e2e` +
`git diff --check` + 浏览器回归。本地测试是**唯一门槛**——push 三远程后
服务器每 3 分钟自动拉取部署（gitee 主源→github 备源，gitcode 第三备份），不再依赖任何 CI。

## 远程仓库与云端测试

| 远程名 | 地址 | 作用 |
| --- | --- | --- |
| `origin` | github.com/pixian5/gayme（公开） | **云端克隆 / 云端测试主源**；Trae「关联 GitHub 仓库」只认 `origin` 且域名为 github.com |
| `gitee` | gitee.com/ibjxk/gayme | 服务器部署主源（cron 每 3 分钟拉取到 oh.sbbz.tech） |
| `gitcode` | gitcode.com/laotongtian/gayme | 第三备份（并行开发线） |

GitHub 上的分支：`main`（开发主线）+ `gh-pages`（只放跳转页，旧 Pages 链接 301 到正式源）。
三远程 `main` 均指向同一提交；本地 `main` 跟踪 `origin/main`（GitHub），
所以 `git pull` / `git push` 默认走 GitHub，部署时另推 `git push gitee main`。
（2026-10-29 前 `origin` 曾指向 gitee，为让 Trae 识别 GitHub 已改为上述命名。）

云端（干净克隆）跑测试，一条链路可复现：

```bash
git clone https://github.com/pixian5/gayme.git && cd gayme
npm ci                              # 只装 playwright 包（不含浏览器内核）
npx playwright install chromium     # 首次约 150MB；只跑 npm test 可跳过这步
npx playwright install chromium-headless-shell  # e2e 用 headless shell，部分版本不随 chromium 安装
npx playwright install-deps chromium           # 精简镜像缺 libatk 等系统库时补装
npm test && npm run test:syntax     # 静态门槛（48 项 + 语法）
npm run test:e2e                    # 运行时回归 ~8s
BROWSER=firefox npm run test:e2e    # Firefox 内核回归（需 npx playwright install firefox）
npm run test:mobile                 # 移动端触控回归 ~5s
npm run test:graph                  # 441 节点全图走查 ~28s
npm run test:play                   # 五画像真人试玩 ~190s（云端实测 ~330s）
```

- 环境要求：Node ≥ 22（本机基线 v24.21）、npm ≥ 10；纯前端零构建，不需要 Python / 虚拟环境
- pre-push 钩子（`.githooks/pre-push`，已装到 `.git/hooks`）只跑 `npm test` + `test:syntax` +
  `git diff --check`，**不下载浏览器**，云端可直接 push；需要 e2e 时设 `PREPUSH_E2E=1`
- 本地资源（5 首 Ogg、11 张 CG、字体子集）全部入库（226 个跟踪文件、仓库约 15MB），
  云端克隆即完整可跑，不依赖任何外部下载
- 2026-10-29 已用 GitHub 干净克隆实测：静态 46/46、e2e / graph / play 全过
  （详见 [docs/20261029-1318-GitHub云端测试基线-Doubao.md](docs/20261029-1318-GitHub云端测试基线-Doubao.md)）

## Hugging Face 演示站

- Space：https://huggingface.co/spaces/xbzsb/sakura-letters （static SDK）
- 直连游玩：https://xbzsb-sakura-letters.static.hf.space/index.html
- 同步：`HF_TOKEN=hf_xxx bash tools/deploy_hf.sh`（token 走环境变量，**不要写进仓库**）；
  脚本只同步运行文件（HTML / css / js / fonts / audio / assets / icons），
  Space 的 README 用 `tools/hf-space-readme.md`（带 `sdk: static` frontmatter）
- 坑：HF 拒绝裸二进制推送，webp / ogg / woff2 / png 必须走 Git LFS（落到 HF 的 Xet 存储），
  脚本会自动补 `.gitattributes` 规则；写死在首个提交里再改规则的话要 `git commit --amend`
  重写，否则旧 blob 仍在推送范围内被拒
- 直连域名是 `<user>-<space>.static.hf.space`（注意多一层 `.static`，
  `author-name.hf.space` 会 404）
- 详细记录 → [docs/20261029-1644-抱脸部署-Doubao.md](docs/20261029-1644-抱脸部署-Doubao.md)

## 【当前开发进度】

剧情主线、后日谈、92 种互动实现与存档/图鉴系统全部完成（441 节点），
50 项静态测试 + 双内核 e2e（采样 8 项 + **全图走查 441 节点零错误**）全过。
**云环境接管（2026-10-30，v3.4.26）**：Remote 沙箱（Linux / Node v24.1.0）实测六套全过——
`npm test` 47/47、`test:syntax`、`test:e2e` 11.4s、`test:graph` 29.1s、
`test:play` 五画像 332s（全部到达结局、0 错误）。内部预览＝沙箱静态服务（800 端口 + 内置浏览器），
Trae 预览代理只转发 IDE 注册端口，不转发 Agent 起的服务。**v3.4.26 首访去重**：SW 预缓存改用与
页面一致的 `?v=` 地址（顺带修掉 3 条裸 preload 与 panels.js 漏缓存），请求 25→19，
本地未压缩流量 2,341KB→1,750KB（-25%），二次访问仍 0KB。
**v3.4.27**：**移动端触控回归 + 动态视口**——`#game` 改用 `100dvh`（手机浏览器工具栏伸缩不再裁掉底部）；
新增 `tests/browser/mobile.e2e.mjs`（390×844 真触控：标题触控开始、8 个代表玩法挂载/说明栏折叠/
跳过收尾、存档浮层开关与边界、零横向溢出、零控制台错误，4.7s 全过）；Firefox 双内核实测全过
（e2e 14.1s、441 节点全图走查 32.2s，无引擎改动）——云端回归从六套扩到八套。
**v3.4.28**：**自动存档失败不再静默**——`Saves.autoSave` 写入失败（配额满 / 隐私模式 /
WebView 存储压力）此前只 `console.error`，玩家会误以为进度已存、刷新后回到旧位置；
现连续 2 次失败提示一次「自动存档不可用：请在设置 → 数据备份 导出 JSON」（同会话不重复），
新增静态契约（48 项）。
**v3.4.29**：**立绘位图全量上线**——5 名角色（诗雨 / 夏织 / 苏念 / 沈屿 / 学姐）AI 立绘接入，
替换 v3.4.0 的内联 SVG：纯白底生图 → 泛洪抠白 → 透明 webp（高 1536，单张 64~111KB，合计 475KB）；
`PORTRAIT_BITMAPS` 五项启用，SW 媒体层新增 `/assets/portraits/` 路由（跨版本复用、不随 bump 重下）；
新增「立绘清单与文件一致」「立绘走媒体缓存」两项静态契约（48→50）。游戏内 1440×900 与 390×844 实测
五张 `naturalWidth>0`、零控制台错误；桌面截图见 `docs/preview/portrait-*.webp`。
详见 [docs/20261030-0213-整体分析与下一步建议-DeepSeek-V4.1-Flash.md](docs/20261030-0213-整体分析与下一步建议-DeepSeek-V4.1-Flash.md)。
**云端测试基线（2026-10-29，不改版本号）**：GitHub 补齐到 v3.4.25（原落后 2 个提交），
三远程 `main` 对齐；GitHub 干净克隆实测 `npm test` 46/46 + `test:syntax` + `test:e2e` +
`test:graph`（441 节点）+ `test:play`（五画像）全过；README 新增「远程仓库与云端测试」
章节（克隆命令、Node ≥ 22、首次需 `npx playwright install chromium` 约 150MB）。
**v3.4.26**：**首访去重**（SW 的 `PRECACHE` 的 js/css 条目改为与 `index.html` 相同的 `?v=<VERSION>`，
不再按裸路径重复下载；顺带把 3 条裸 `preload` 版本化、补上漏掉的 `js/ui/panels.js`）；
新增「预缓存与页面版本化资源一一对应」契约 + e2e 裸路径断言（契约 46→47）。
实测：首访请求 25→19、本地未压缩 2,341KB→1,750KB，二次访问 0KB；DCL 242ms。
**v3.4.25**：**学姐线入口门槛放宽**（方案 B：`playCount>=1 || loopCount>=2`——普通结局玩家不再
永久锁死这条线，新增门槛契约四项断言）；**五画像真人试玩器入库** `npm run test:play`
（tests/browser/playtest.e2e.mjs，懒人/认真/探索/快通/二周目全部到达结局，0 错误）。
修真 bug：setup 顺序——`newGame()` 会重置 skipMode，快通画像的预设曾被开局清掉导致覆盖是假的
（已加断言防回归）；二周目画像（loopCount=2）现覆盖学姐线隐藏入口。
**v3.4.24**：**五画像点击驱动试玩**（懒人/认真/探索/快通/二周目全部到达结局，0 错误）——
修真 bug：SW 注册 `reg` 未判空导致 `reg.update` 抛错、连带丢失新版本提示；
发现设计问题：学姐线入口门槛 `playCount>=1` 仅真结局可增，普通结局玩家永久锁死（本轮已按方案 B 修复）；
17 个「未走通」玩法经专项探针实证**均可通关**（此前是模拟器手势不到位）。详见试玩报告。
**v3.4.23**：苏念三个视角门槛原借用林诗雨记忆（逻辑错配），改互斥记忆数组任一解锁。
**v3.4.22**：视角从互动节点降级为可选补充，快进不再被视角节点卡住。
**v3.4.21**：确认按钮灰置时自动补「还没完成交互——XX 目前不可用」说明。
**v3.4.19~20**：71 玩法说明补「收尾」行 + 视角节点 1→13（诗雨/夏织/苏念/学姐内心独白）。
**v3.4.15**：d 链 loopText 轻量层（15 锚点既视感，162→177）——重玩氛围与快通闭环。
**v3.4.14**：全结局可达性契约（13/13 BFS）+ 移动视口全图走查（390×844，0 坏节点）+
BGM calm 组补漏（学姐夜戏 8 场景不再配日常曲）。
**v3.4.13**：**已读快通**——快进中已读玩法 300ms 自动中性收尾（点提示条可保留），
GameKit 统一层 88 玩法 + 3 基础小游戏受益；**二周目重玩约 40 分钟 → 10 分钟**。
**v3.4.12**：学姐线叙事级通读（35 节点全文走查：入口门槛/时间线/影子设定/知识顺序/分支流
全部自洽，0 修复项）——多模型协作下的内容质量验收方法定型。
**v3.4.11**：loopText 终批（132→**162**）：后日谈全部 21 + 路线入口 4 + 序章情感 5；
**计划完结**——剩余缺口（d 链玩法 prompt/转场短句）明确不做，理由入档。
**v3.4.10**：SW 新版本提示（5 分钟轮询 + 刷新 toast，PWA 更新通道）+ 关于页「版本更新」
折叠日志（changelog 契约锁首条=当前版本）。
**v3.4.9**：e2e 全图运行时走查（`npm run test:graph`，441 节点逐一执行，双内核 28s 零坏节点）；
走查揪出并修复真缺陷：迷你游戏浮层挂 body 逃出引擎清理/减动效作用域 → 改挂 #game。
**v3.4.8**：reduce-motion 三组合验证（系统/设置双通道独立生效）。
**v3.4.7**：引擎 UI 拆分（14 个浮层渲染器 → js/ui/panels.js，engine 2,439 行）。
**v3.4.5~6**：loopText 批次四（女主 good 链+共通关键对话）+「她说」密度抽检制。
**v3.4.3~4**：pack-itch 修复（含 BGM 10MB）+ CF 加速前置 **https://play.sbbz.tech:2096/** +
回响 Tab 扩展（自由回信入列）+ e2e firefox。
（Phase 3 债务清偿 v3.3.18~v3.4.2 见文档索引；以下为 v3.3.x 历史记录）
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

详细内容见 → [docs/20261025-0733-整体分析与下一步建议-GLM.md](docs/20261025-0733-整体分析与下一步建议-GLM.md)
（学姐线通读 → [docs/20261025-1300-学姐线叙事通读报告-GLM.md](docs/20261025-1300-学姐线叙事通读报告-GLM.md)；
loopText 完结 → [docs/20261025-1240-loopText终批完结-GLM.md](docs/20261025-1240-loopText终批完结-GLM.md)）

## 【下一步待实现】

- **已完成**：学姐线形态 A（v3.3.0）；图鉴收集率（v3.3.1）；CG 解锁缺口（v3.3.3）；
  记忆/图鉴数据契约（v3.3.4）；交互/无障碍/设置面板（v3.3.5）；限时持久化+焦点陷阱+引擎瘦身（v3.3.6）；
  图鉴记忆标题+多周目文本（v3.3.7）；女主线多周目文本（v3.3.8）；共通线/后日谈多周目文本（v3.3.9）；
  **P1-1 键盘无障碍 + P1-5 数据统计（v3.3.10）**；**P1-2 图鉴大图（v3.3.11）**；**P1-3 设置扩展（v3.3.12）**；**P1-4 存档增强 + P1-7 新手引导（v3.3.13）**；**P2-1a 学姐线 loopText（v3.3.14）**；**真实 BGM（v3.3.15）**；**CG 位图样张（v3.3.16）**；**CG 位图全量 11 张（v3.3.17）**。
- **完整计划**（分阶段任务清单：工程体验 / 内容纵深 / 素材管线 / 分发多语言，含文件、验收、成本、版本号）
  → [docs/20261024-0934-下一步开发完整计划-DeepSeek.md](docs/20261024-0934-下一步开发完整计划-DeepSeek.md)
- **当前状态（v3.4.29）**：Phase 3 + 质量盲区 + **重玩体验** + **五画像真人试玩** + **首访去重** +
  **双内核/移动触控两张回归网** + **自动存档失败提示** + **立绘 ×5 位图上线**全部完成——
  快通 / loopText 177 / 44 处句式清零 / 回响 Tab / UI 拆分 / CG webp / 立绘位图管线（素材已接入）/
  itch 打包 / CF 加速 / 全图走查零错误 / SW 更新提示 / 学姐线通读验收 / 玩家画像试玩验收 /
  学姐线门槛放宽（方案 B）+ 试玩器入库（`npm run test:play`，契约 45→46）/ SW 版本化预缓存（契约 46→47）
  / Firefox 双内核 + 移动端触控回归（`npm run test:mobile`）/ 自动存档失败提示（契约 47→48）
  / 立绘位图 ×5（契约 48→50）。
  **剩余为真实 SFX 素材（需试听确认）与 itch 分发物料（封面/截图/文案）。**
- **下一步建议（2026-10-30）**：v3.4.30 真实 SFX（点击/翻页/信件展开/回忆闪回，需素材试听）
  → v3.5.0 itch 物料（og:image 绝对化、og:url、封面截图、商店文案）。
  完整分析见 [docs/20261030-0213-整体分析与下一步建议-DeepSeek-V4.1-Flash.md](docs/20261030-0213-整体分析与下一步建议-DeepSeek-V4.1-Flash.md)。
- **待你拍板**：~~学姐线入口门槛~~（v3.4.25 已按方案 B 落地：`playCount >= 1 || loopCount >= 2`）；
  ~~Firefox 内核双跑~~（v3.4.27 已实测全过）；~~立绘风格确认~~（v3.4.29 已按诗雨样张风格自主批量接入）。
  下一批候选：真实 SFX 素材授权确认、是否加 GitHub Actions 测试 workflow
  （只跑测试、不参与部署，push 即云端自动回归；与 v3.2.3「移除部署 CI」不冲突，但需你确认是否要这条通道）。
- **已完成（运行基线）**：GitHub 补齐至 v3.4.25 + 干净克隆五套测试实测全过
  （详见 [docs/20261029-1318-GitHub云端测试基线-Doubao.md](docs/20261029-1318-GitHub云端测试基线-Doubao.md)）。
- **云端测试提示**：GitHub 为公开克隆源；首次跑浏览器回归前需
  `npx playwright install chromium`（约 150MB）+ `npx playwright install chromium-headless-shell`
  + `npx playwright install-deps chromium`（精简镜像缺 libatk 等系统库）；云端提交后要把 `main` 同步到 gitee，服务器才会部署。
- **已完成（分发）**：Hugging Face static Space 上线（v3.4.25 镜像，11/11 CG + BGM + SW 实测通过）；
  **2026-10-30 起暂停使用**（按你的要求不再往 HF 推，站点未删）
  → https://xbzsb-sakura-letters.static.hf.space/index.html ；更新用 `HF_TOKEN=... bash tools/deploy_hf.sh`
  （详见 [docs/20261029-1644-抱脸部署-Doubao.md](docs/20261029-1644-抱脸部署-Doubao.md)）。
- **剩余（全部为外部依赖）**：① 位图立绘 ×5（生图后 webp 入 `assets/portraits/` + `PORTRAIT_BITMAPS` 登记）；
  ② 真实音效 SFX（CC0 素材）；③ i18n / 云存档 / 玩法同质化调整（需拍板 / 试玩反馈）
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
sw.js               Service Worker：预缓存 26 项核心资源（BGM / CG 走 sakura-media 运行时缓存），缓存版本 sakura-vX.Y.Z 随发版同步
tools/              工程工具：玩法迁移转换器 / 等价性校验器 / 版本号同步 / 字体子集三件套 /
                    deploy_hf.sh（抱脸 static Space 同步）+ hf-space-readme.md（Space 首页文案）
tests/              Node 原生测试（48 项）+ tests/browser/ 浏览器 e2e 回归（engine.e2e.mjs）
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
- 提交：中文 commit，完成后推送三远程（`git push origin main`（GitHub）+ `git push gitee main` +
  `git push gitcode main`）；push 后服务器 cron 每 3 分钟从 gitee 自动拉取部署到
  oh.sbbz.tech（`tools/deploy.sh` 仅作手动备用）
- 云端测试：`origin` = GitHub（Trae 关联仓库依赖该命名与域名），流程见上文「远程仓库与云端测试」；
  云端提交后记得把 `main` 同步到 `gitee`，否则服务器不会部署到最新
- 部署链路：本地测试（npm test + test:syntax + test:e2e）是唯一门槛，不依赖任何 CI；
  服务器自动部署脚本 /usr/local/bin/sakura-deploy.sh（gitee 主源→github 备源）
- 部署到 Hugging Face：`HF_TOKEN=hf_xxx bash tools/deploy_hf.sh`（static Space，只同步运行文件，
  二进制走 Git LFS；Space README 源文件是 `tools/hf-space-readme.md`）；发版后手动跑一次即可
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份
