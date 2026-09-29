# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v2.7.9**（开发测试版 · Demo）
- 技术形态：纯前端，零依赖、零构建，浏览器直接运行
- 存档方式：localStorage（schema v3，6 槽位 + 自动存档）

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

## 【当前开发进度】

剧情主线、后日谈、90 个互动玩法与存档/图鉴系统全部完成，28 项测试全过；v2.7.9 已建立玩法框架基座（GameKit）并完成后日谈 5 个玩法的迁移验证，工程重心已从「新增玩法」转向「结构瘦身 + 内容纵深 + 表现升级」。

详细内容见 → [docs/202609292356当前开发进度.md](docs/202609292356当前开发进度.md)

## 【下一步待实现】

按 v2.7.9 → v2.8.7 路线推进：~~玩法框架基座（GameKit）~~ → 减重与一致性（v2.8.0）→ 内容纵深 → 音频/立绘 → 移动端打磨 → GitHub Pages 试玩发布。

详细内容见 → [docs/202609292356下一步开发方案.md](docs/202609292356下一步开发方案.md)

## 文档索引

### 进度与规划
| 文档 | 作用 |
|---|---|
| [docs/202609292356当前开发进度.md](docs/202609292356当前开发进度.md) | 当前版本的状态快照：已完成模块、代码体量、已知债务 |
| [docs/202609292356下一步开发方案.md](docs/202609292356下一步开发方案.md) | v2.7.9 → v2.8.7 的详细执行路线与验收标准 |

### 版本记录（docs/）
| 文档 | 作用 |
|---|---|
| [v2.6.1-review-fixes.md](docs/v2.6.1-review-fixes.md) | 序章到星座玩法断链修复、存档边界校验 |
| [v2.6.3-development-foundation.md](docs/v2.6.3-development-foundation.md) | 测试基座、存储 schema v3、生命周期令牌 |
| [v2.6.4-story-afterword.md](docs/v2.6.4-story-afterword.md) | 后日谈与明信片印记玩法 |
| [v2.6.9-story-playtest.md](docs/v2.6.9-story-playtest.md) | 第 15 日回溯承接、涂色玩法修复 |
| [v2.7.0-story-playtest.md](docs/v2.7.0-story-playtest.md) | 后日谈现实回信 |
| [v2.7.1-story-timeline.md](docs/v2.7.1-story-timeline.md) | 时间线排序玩法 |
| [v2.7.2-story-reply-corner.md](docs/v2.7.2-story-reply-corner.md) | 半年后回信角 |
| [v2.7.3-story-triage.md](docs/v2.7.3-story-triage.md) | 回信分拣与互动层竞态修复 |
| [v2.7.4-story-wall.md](docs/v2.7.4-story-wall.md) | 毕业前留言墙 |
| [v2.7.5-interaction-guard.md](docs/v2.7.5-interaction-guard.md) | 互动层推进保护 |
| [v2.7.6-story-proofread.md](docs/v2.7.6-story-proofread.md) | 校刊校对玩法 |
| [v2.7.7-story-consistency.md](docs/v2.7.7-story-consistency.md) | 剧情合理性复核（真结局判定、时间线、关键词解锁） |
| [v2.7.8-story-consistency.md](docs/v2.7.8-story-consistency.md) | 星座路径收束、旧存档节点别名兼容、favicon |
| [v2.7.9-gamekit.md](docs/v2.7.9-gamekit.md) | 玩法框架基座 GameKit、后日谈 5 个玩法迁移与回归修复 |

### 外部分析（项目根目录）
| 文档 | 作用 |
|---|---|
| [glm开发建议.md](glm开发建议.md) | GLM 的剧情全梳理 + 分层开发建议（含 10 条叙事约束，当前权威上下文） |
| [glm.md](glm.md) | GLM 的剧情合理性专项梳理（v2.7.7，指出学园祭缺失等时间线问题） |
| [Kimi开发建议.md](Kimi开发建议.md) | Kimi 的系统盘点与技术债/重构建议 |
| [qwen开发方案.md](qwen开发方案.md) | Qwen 的完整分析 + 代码拆分详细方案 |
| [seed开发建议.md](seed开发建议.md) | Seed 的剧情梳理与分优先级建议 |
| [seed开发方案.md](seed开发方案.md) | Seed 的开发方案（与上篇配套） |
| [代码审查m3.md](代码审查m3.md) | v2.6.0 时期的详细代码审查报告 |

## 目录结构

```
index.html          入口（含 7 个脚本按序加载）
css/style.css       全部视觉/动效/响应式
js/saves.js         存档与图鉴数据层（localStorage，106 个键）
js/script.js        剧情数据（CHARACTERS / PORTRAITS / KEYWORDS / CGS / SCRIPT 399 节点）
js/lifecycle.js     浮层异步生命周期（读档/返回标题时安全取消）
js/minigames.js     3 个基础迷你游戏（writing / running / painting）
js/gamekit.js       玩法框架基座：统一浮层外壳 / 结果收尾 / 生命周期 / 进度文案
js/games/           已迁移的玩法模块（v2.7.9 起分批从 engine.js 外迁）
js/engine.js        引擎 + 剩余玩法实现
tests/              Node 原生测试
docs/               版本记录与规划文档
```

## 约定

- 版本号：每次修改 +0.0.1，满十进一（当前 v2.7.8，下一版 v2.7.9）
- 提交：中文 commit，完成后推送 gitee（origin）与 github
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份