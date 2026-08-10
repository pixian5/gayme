# 樱时信笺 · Qwen 开发方案

> 版本：v2.7.7  
> 分析时间：2026-08-10  
> 分析范围：完整项目代码、文档、测试套件  
> 定位：作为 Qwen 模型对项目的全局分析与开发建议

---

## 一、项目现状总览

### 1.1 基本信息

| 项目 | 内容 |
|------|------|
| 游戏名称 | 樱时信笺（Sakura Letters） |
| 当前版本 | v2.7.7 |
| 类型 | HTML5 视觉小说 / 校园群像 / 时间循环叙事 |
| 技术栈 | 纯前端（HTML + CSS + 原生 JavaScript） |
| 代码规模 | HTML 108行 / CSS 8545行 / JS 24648行（5个文件） |
| 核心文件 | index.html / style.css / script.js / engine.js / saves.js / minigames.js / lifecycle.js |
| 测试覆盖 | 6个测试文件，覆盖静态检查、剧情图可达性、存档系统、生命周期 |

### 1.2 内容体量

| 维度 | 数量 |
|------|------|
| 剧本节点 | 700+ 个 |
| 结局数量 | 12个（3×3角色结局 + 真结局前章 + 真结局 + 后日谈） |
| 互动玩法 | 50+ 种（v0.5.0 ~ v2.7.7 渐进添加） |
| 关键词 | 10个基础 + 7个合成配方 |
| CG | 10张（SVG 字符画） |
| 角色立绘 | 5个（SVG） |
| 场景背景 | 30+ 个（CSS 渐变） |

### 1.3 核心特色

1. **主题统一**：所有系统围绕"写信/回信"和"时间循环"展开
2. **叙事与玩法融合**：小游戏不是填充，而是角色心理的隐喻
3. **循环结构有收束**：多周目不重复，有明确目标和解锁路径
4. **后日谈克制温暖**：不强行团圆，把成长落到具体行动

---

## 二、核心优势分析

### 2.1 叙事设计

#### 优势点

1. **角色弧光完整**
   - 三位女主都是"卡住的人"，困境具体且可共鸣
   - 沈屿作为"容器型主角"，让玩家能代入
   - 学姐作为"镜像角色"，是循环的上一任记录者

2. **关键词合成系统创新**
   - 把传统"收集"变成"创造"
   - 合成配方与剧情深度绑定（祭信 = 替别人回信，未寄信 = 替自己回信）
   - 只有合成"樱花信"才能破环，给玩家明确目标

3. **时间循环机制合理**
   - 仅保留两处回溯（d5_rewind、d15_rewind），有明确文本承接
   - 循环不是惩罚，而是"用来写的"
   - 多周目有差异化内容（学姐彩蛋、循环专属选项）

4. **后日谈设计成熟**
   - 时间线清晰：三天→一周→半年→又过半年
   - 每个玩法都练习"关怀的边界"
   - 不新增惩罚结局，正确错误都汇入反思

#### 数据支撑

- 剧情节点 700+ 个，覆盖序章→共通线→个人线→真结局→后日谈
- 12个结局各有特色，BAD 结局也有余韵
- 后日谈 8 个玩法，每个都围绕"不替别人做决定"的母题

### 2.2 技术实现

#### 优势点

1. **存档系统健壮**
   - localStorage 封装完善，100+ 键值对
   - 支持导入/导出，schema v3 有版本管理
   - 防御性 try/catch，失败回滚

2. **生命周期管理**
   - lifecycle.js 集中管理异步交互
   - 防止读档或返回标题后继续运行
   - AbortController 模式清晰

3. **测试覆盖较全**
   - 静态检查、剧情图可达性、时间线一致性
   - 互动层分发器测试
   - 存档边界测试

4. **迷你游戏质量高**
   - minigames.js 模块化 IIFE，样式只注入一次
   - Promise 化 + cleanup 干净
   - 通用工具函数（clampScore、startTimer）

#### 数据支撑

- saves.js 1918行，封装 100+ 存储键
- lifecycle.js 33行，简洁高效
- minigames.js 547行，三个基础游戏质量高
- 测试套件 6个文件，覆盖核心功能

### 2.3 视觉与体验

#### 优势点

1. **视觉风格统一**
   - 玻璃磨砂 + 樱花粉贯穿全文件
   - CSS 变量化（虽然没用 CSS 变量，但色值一致）
   - 动画分层清晰（20+ 个 @keyframes）

2. **响应式基础好**
   - 有 @media (max-width: 768px) 断点
   - 触控友好（按钮尺寸、点击区域）

3. **无障碍基础**
   - aria-label 基本覆盖
   - 键盘事件支持（Space/Enter 推进对话）
   - 语义化 HTML 结构

---

## 三、关键问题识别

### 3.1 技术债务（Critical）

#### 问题 1：巨型单文件

**现状**
- engine.js 17939行，script.js 4211行
- 所有逻辑混在一个文件，维护困难
- 多人协作会频繁冲突

**影响**
- 代码可读性差，新人上手成本高
- 修改一处可能影响全局
- 无法按需加载，首屏加载慢

**建议**
```
engine.js 拆分为：
├── core.js          # 状态机、节点推进
├── render.js        # 背景、立绘、UI 渲染
├── audio.js         # BGM/音效
├── save_load.js     # 存档读档
├── menus.js         # 菜单、流程图、图鉴
└── interactions/    # 每个小游戏一个模块

script.js 拆分为：
├── data/
│   ├── characters.js
│   ├── scenes.js
│   ├── keywords.js
│   ├── cgs.js
│   ├── endings.js
│   └── moments.js
└── story/
    ├── prologue.js
    ├── common.js
    ├── shiyu.js
    ├── xiazhi.js
    ├── sunian.js
    ├── true_end.js
    ├── afterword.js
    └── index.js
```

**优先级**：P0（最高）  
**工作量**：1-2周

#### 问题 2：gotoNode 巨型 if-else 链

**现状**
- engine.js line 335-1213 是 1000+ 行的 if-else 链
- 每个玩法类型一个 if 分支
- 难以扩展，新增玩法要改核心逻辑

**影响**
- 代码复杂度高，圈爆炸
- 测试覆盖困难
- 新增玩法成本高

**建议**
引入"节点类型注册表"：
```javascript
const NODE_HANDLERS = {
  choice: renderChoice,
  doodle: renderDoodle,
  minigame: renderMinigame,
  letter: renderLetter,
  // ...
};

function gotoNode(nodeId) {
  const node = SCRIPT[nodeId];
  const handler = NODE_HANDLERS[getNodeType(node)];
  if (handler) handler(node, nodeId);
}
```

**优先级**：P0  
**工作量**：3-5天

#### 问题 3：场景 CSS 缺失

**现状**
- script.js 引用了 30+ 个场景
- style.css 只定义了 16 个 scene-xxx 类
- 缺失场景会导致背景为空

**影响**
- 玩家进入缺失场景时背景突然变空
- 体验断裂，沉浸感破坏

**建议**
1. 立即补齐缺失的场景 CSS
2. 建立场景清单，确保引用和定义一致
3. 添加场景缺失的 fallback 机制

**优先级**：P0（立即修复）  
**工作量**：1-2天

#### 问题 4：孤儿节点

**现状**
- v1.4.0+ 插入的节点（d3_rubbing/collect/focus/scentmem）没有 next 链接到主流程
- 会被引擎跳过

**影响**
- 玩家无法体验这些玩法
- 内容浪费

**建议**
1. 绘制完整的剧情有向图
2. 修复孤儿节点的链接
3. 添加自动化测试检测孤儿节点

**优先级**：P0  
**工作量**：1天

### 3.2 剧情问题（High）

#### 问题 1：沈屿家庭线收束不足

**现状**
- 序章提到父母冷战三个月
- 直到 afterword_entry 才有一句"冷战终于有了第一道缝"
- 中间缺少铺垫

**影响**
- 男主人物弧光不完整
- "写下自己"不够具体

**建议**
在共通线第 3~5 日增加 1~2 段沈屿夜里给父母发消息但没发出的独白节点：
```javascript
d3_night_messsage: {
  day: 3, time: "night", bg: "home_room",
  speaker: "沈屿",
  text: "我打开和妈妈的对话框。打了'今天吃了什么'，又删掉。最后只发了一个表情。她回了一个微笑。",
  next: "d4_morning"
}
```

**优先级**：P1  
**工作量**：2-3天

#### 问题 2：三女主旧交待不明

**现状**
- d2_noon_9 诗雨说苏念"去年看了一会儿就走了"
- d3_sunian_5 苏念说"去年看一个人跑，她摔了，我没看完就走了"
- 从未正面展开三人初中时的交集

**影响**
- "三人之间是有故事的"沦为旁白空话
- 群像戏不够扎实

**建议**
在第 6~15 日长玩法链中插入 1 个回忆节点：
```javascript
d8_old_photo: {
  day: 8, time: "evening", bg: "attic",
  text: "旧相册里有一张照片：三个初中生站在樱花树下。左边是诗雨，中间是夏织，右边是苏念。她们笑得那么近。",
  next: "d9_morning"
}
```

**优先级**：P1  
**工作量**：1-2天

#### 问题 3：第 6~15 日叙事疲劳风险

**现状**
- 40+ 玩法连续推进
- 每段都是"她说——"句式
- 玩家容易跳过文本

**影响**
- 叙事节奏单一
- 玩家可能错过重要信息

**建议**
把长链拆成 3 个小章节，每章开头加沈屿的独白：
- 第 6~8 日「旧物」
- 第 9~11 日「节奏」
- 第 12~15 日「归位」

**优先级**：P1  
**工作量**：3-5天

### 3.3 玩法问题（Medium）

#### 问题 1：玩法结果对剧情影响过弱

**现状**
- 50+ 玩法仅通过 add.affection 和 personality 影响数值
- 没有实质性分支

**影响**
- 玩家感觉"玩得好 vs 玩得差"没区别
- 玩法与叙事割裂

**建议**
把至少 3 个关键玩法的完美/失败结果绑定到后续节点：
```javascript
// 旗阵玩法完美通过
d15_flag_perfect: {
  if: { var: "lastMinigameScore", gte: 90 },
  then: "d15_flag_secret",  // 解锁隐藏信息
  else: "d15_rewind"
}
```

**优先级**：P2  
**工作量**：3-5天

#### 问题 2：玩法同质化

**现状**
- 大量"拖动到目标 / 在目标时刻停 / 选对那个"类玩法
- 机制重叠

**影响**
- 玩家新鲜感下降
- 后期玩法缺乏记忆点

**建议**
引入新机制：
1. 多步骤推理（拼图 + 旗阵 + 棋局连续谜题）
2. 玩家输入文本影响后续（日记/便签）
3. 角色协作玩法（两位女主同时在场）

**优先级**：P2  
**工作量**：1-2周

#### 问题 3：关键词合成系统扩展不足

**现状**
- 7 个合成配方里只有"樱花信"是破环钥匙
- 其余 6 个合成后没有反馈

**影响**
- 合成动力不足
- 收集要素浪费

**建议**
给其余 6 个合成物各加一段"合成回忆"节点：
```javascript
compose_zhengzi: {
  text: "紫 + 挣 = 挣紫。你想起苏念说：'我想从紫里挣出来。'原来她早就告诉你了。",
  memory: { id: "合成·挣紫", text: "苏念真正想画的东西，是从紫里挣出来的自己。" }
}
```

**优先级**：P2  
**工作量**：2-3天

### 3.4 工程问题（Medium）

#### 问题 1：缺少构建工具

**现状**
- 纯原生 JS，没有构建
- 改一行要手动刷新
- 没有自动压缩、hash 文件名

**影响**
- 开发体验差
- 生产环境性能不优

**建议**
引入 Vite：
- 开发时热重载
- 生产时自动压缩
- 自动版本号管理

**优先级**：P2  
**工作量**：2-3天

#### 问题 2：CSS 重复度高

**现状**
- 每个玩法的浮层几乎都是同样结构
- 没有抽出公共 class
- 按钮 hover 样式重复 30+ 次

**影响**
- CSS 文件臃肿
- 维护困难

**建议**
```css
/* 公共浮层类 */
.game-layer {
  position: absolute;
  inset: 0;
  z-index: 38;
  background: radial-gradient(...);
  backdrop-filter: blur(14px);
}

/* 公共按钮样式 */
.game-btn {
  padding: 12px 24px;
  border-radius: 12px;
  transition: all 0.2s;
}
.game-btn:hover:not(:disabled) {
  transform: scale(1.05);
}
```

**优先级**：P2  
**工作量**：3-5天

#### 问题 3：测试覆盖不足

**现状**
- 21 项测试主要集中在剧情图可达性和存档边界
- 缺少玩法逻辑单元测试
- 缺少关键词合成组合测试
- 缺少时间回溯状态一致性测试

**影响**
- 改动后回归风险高
- 难以保证质量

**建议**
增加测试：
1. 玩法逻辑单元测试（如 d15_chess 最短路径）
2. 关键词合成组合测试
3. 时间回溯状态一致性测试
4. Playwright 端到端测试

**优先级**：P2  
**工作量**：1周

---

## 四、开发建议与路线图

### 4.1 第一阶段：地基修复（1-2周）

**目标**：解决最严重的技术债务，为后续开发打基础

#### 任务清单

1. **修复场景 CSS 缺失**（P0）
   - 补齐 14 个缺失的场景背景
   - 建立场景清单
   - 添加 fallback 机制
   - 预计：1-2天

2. **修复孤儿节点**（P0）
   - 绘制完整剧情有向图
   - 修复 d3_rubbing/collect/focus/scentmem 的链接
   - 添加自动化测试检测孤儿节点
   - 预计：1天

3. **拆分 engine.js**（P0）
   - 按职责拆分为 6 个子文件
   - 保持全局接口不变
   - 确保测试通过
   - 预计：3-5天

4. **拆分 script.js**（P0）
   - 按章节拆分为 10+ 个模块
   - 保持 SCRIPT 全局对象结构
   - 确保测试通过
   - 预计：2-3天

5. **引入 gotoNode 注册表**（P0）
   - 替换 if-else 链
   - 统一节点处理接口
   - 预计：1-2天

**验收标准**
- 所有场景背景正常显示
- 所有玩法可达
- npm test 全量通过
- 浏览器手动回归无报错

### 4.2 第二阶段：剧情补完（2-3周）

**目标**：补齐叙事短板，增强角色弧光

#### 任务清单

1. **沈屿家庭线收束**（P1）
   - 增加 2 段独白节点（第 3、4 日夜晚）
   - 与 afterword 的"缝"呼应
   - 预计：2-3天

2. **三女主旧交回忆**（P1）
   - 增加 d8_old_photo 节点
   - 明确三人初中时的交集
   - 预计：1-2天

3. **长玩法链分章节**（P1）
   - 拆成 3 个小章节
   - 每章开头加沈屿独白
   - 预计：3-5天

4. **苏念 BAD 余韵补完**（P1）
   - 增加离开前在画室留字条的节点
   - 让 BAD 也有"她留下了什么"的余韵
   - 预计：1天

5. **NORMAL 结局 CG 补完**（P1）
   - 为 3 个 NORMAL 结局各增加 1 张 CG
   - 让玩家记住"另一种活法"
   - 预计：2-3天

**验收标准**
- 男主人物弧光完整
- 三人旧交有明确交代
- 长链节奏有呼吸点
- 所有结局有余韵

### 4.3 第三阶段：玩法增强（2-3周）

**目标**：提升玩法与叙事的融合度

#### 任务清单

1. **关键玩法绑定叙事分支**（P2）
   - 选择 3 个关键玩法（旗阵、拼图、调香）
   - 完美/失败结果影响后续文本
   - 预计：3-5天

2. **合成回忆节点**（P2）
   - 为 6 个合成物各加一段回忆
   - 让合成不只是真结局门票
   - 预计：2-3天

3. **朋友圈/收件箱扩容**（P2）
   - 每条个人线增加 2-3 条朋友圈
   - 增加三女主"不在场"的生活感
   - 预计：2-3天

4. **新玩法机制**（P2）
   - 多步骤推理谜题
   - 玩家输入文本影响后续
   - 角色协作玩法
   - 预计：1-2周

**验收标准**
- 玩法结果有叙事差别
- 合成有情感反馈
- 朋友圈更丰富
- 有新机制玩法

### 4.4 第四阶段：工程优化（1-2周）

**目标**：提升开发体验和代码质量

#### 任务清单

1. **引入 Vite**（P2）
   - 配置开发服务器
   - 配置生产构建
   - 自动版本号管理
   - 预计：2-3天

2. **CSS 重构**（P2）
   - 抽取公共类
   - 引入 CSS 变量
   - 减少重复
   - 预计：3-5天

3. **测试增强**（P2）
   - 玩法逻辑单元测试
   - 关键词合成组合测试
   - 时间回溯状态测试
   - Playwright E2E 测试
   - 预计：1周

4. **GitHub Actions**（P2）
   - push 时跑测试
   - tag 时自动部署
   - 版本号一致性校验
   - 预计：1-2天

**验收标准**
- 开发体验提升（热重载）
- CSS 文件减小 20%+
- 测试覆盖率提升
- CI/CD 自动化

### 4.5 第五阶段：美术音频（1-2周）

**目标**：提升视听体验

#### 任务清单

1. **立绘表情差分**（P2）
   - 为三女主各增加 2-3 种表情
   - 喜/悲/怒/思
   - 预计：3-5天

2. **BGM 制作**（P2）
   - 标题画面：钢琴 + 樱花氛围
   - 共通线：日常轻柔
   - 个人线 GOOD：温暖弦乐
   - 个人线 BAD：钢琴单音
   - 真结局：空灵女声
   - 后日谈：木吉他
   - 预计：1周

3. **关键 CG 升级**（P2）
   - cg_letter（樱花瓣的信）
   - cg_true（樱花信）
   - cg_festival（学园祭之夜）
   - 预计：2-3天

**验收标准**
- 角色表情丰富
- BGM 覆盖所有场景
- 关键 CG 精美

---

## 五、技术细节建议

### 5.1 代码拆分详细方案

#### engine.js 拆分

```javascript
// js/engine/core.js
export const state = { /* ... */ };
export function gotoNode(nodeId, options) { /* ... */ }
export function advance() { /* ... */ }

// js/engine/render.js
export function setScene(bg) { /* ... */ }
export function renderCharacters(node) { /* ... */ }
export function typewriter(text, onDone) { /* ... */ }

// js/engine/audio.js
export function playBgmForScene(bg) { /* ... */ }
export function playSfx(name) { /* ... */ }

// js/engine/save_load.js
export function saveGame(slot) { /* ... */ }
export function loadGame(slot) { /* ... */ }

// js/engine/menus.js
export function showSaveMenu() { /* ... */ }
export function showLoadMenu() { /* ... */ }
export function showFlowchart() { /* ... */ }

// js/engine/interactions/
// 每个玩法一个文件
export function runDoodle(config, nodeId) { /* ... */ }
export function runCollage(config, nodeId) { /* ... */ }
// ...
```

#### script.js 拆分

```javascript
// js/script/data/characters.js
export const CHARACTERS = { /* ... */ };
export const PORTRAITS = { /* ... */ };

// js/script/data/scenes.js
export const SCENE_LABELS = { /* ... */ };

// js/script/data/keywords.js
export const KEYWORDS = { /* ... */ };
export const COMPOSE_RECIPES = [ /* ... */ ];

// js/script/data/cgs.js
export const CGS = [ /* ... */ ];

// js/script/data/endings.js
export const ENDINGS = [ /* ... */ ];

// js/script/data/moments.js
export const MOMENTS = [ /* ... */ ];

// js/script/story/prologue.js
export const prologueNodes = {
  prologue_1: { /* ... */ },
  prologue_2: { /* ... */ },
  // ...
};

// js/script/story/common.js
export const commonNodes = {
  common_day2_morning: { /* ... */ },
  // ...
};

// js/script/story/index.js
import { prologueNodes } from './prologue.js';
import { commonNodes } from './common.js';
// ...

export const SCRIPT = {
  ...prologueNodes,
  ...commonNodes,
  // ...
};
```

### 5.2 gotoNode 注册表实现

```javascript
// js/engine/router.js
const NODE_HANDLERS = {
  // 基础类型
  dialog: handleDialog,
  choice: handleChoice,
  ending: handleEnding,
  
  // 互动类型
  letter: handleLetter,
  doodle: handleDoodle,
  minigame: handleMinigame,
  collage: handleCollage,
  photo: handlePhoto,
  rhythm: handleRhythm,
  scent: handleScent,
  // ... 50+ 种类型
};

function getNodeType(node) {
  if (node.ending) return 'ending';
  if (node.choice) return 'choice';
  if (node.letter) return 'letter';
  if (node.doodle) return 'doodle';
  if (node.minigame) return 'minigame';
  // ... 按优先级判断
  return 'dialog';
}

export function gotoNode(nodeId, options = {}) {
  const node = SCRIPT[nodeId];
  if (!node) {
    console.error("节点不存在:", nodeId);
    return;
  }
  
  const type = getNodeType(node);
  const handler = NODE_HANDLERS[type];
  
  if (handler) {
    handler(node, nodeId, options);
  } else {
    console.error("未知节点类型:", type);
  }
}
```

### 5.3 CSS 重构方案

```css
/* css/variables.css */
:root {
  /* 主题色 */
  --primary: #ffb8c8;
  --accent: #ffd8e4;
  --dim: rgba(255,216,228,0.55);
  
  /* 层级 */
  --z-bg: 1;
  --z-overlay: 2;
  --z-particles: 3;
  --z-char: 4;
  --z-dialog: 10;
  --z-clue: 14;
  --z-choice: 15;
  --z-daybar: 18;
  --z-topbar: 20;
  --z-perspective: 30;
  --z-dream: 35;
  --z-game-layer: 38;
  --z-popup: 39;
  --z-screen: 50;
  --z-toast: 9999;
  
  /* 动画时长 */
  --transition-fast: 0.2s;
  --transition-normal: 0.3s;
  --transition-slow: 0.5s;
}

/* css/base.css */
.game-layer {
  position: absolute;
  inset: 0;
  z-index: var(--z-game-layer);
  background: radial-gradient(120% 80% at 50% 40%, rgba(255,184,200,0.15), transparent 70%);
  backdrop-filter: blur(14px) saturate(1.2);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in var(--transition-normal) ease;
}

.game-btn {
  padding: 12px 24px;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,200,220,0.3);
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.game-btn:hover:not(:disabled) {
  background: rgba(255,200,220,0.2);
  transform: scale(1.05);
}

.game-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 然后每个玩法只需要定义自己的特定样式 */
.doodle-layer .doodle-canvas {
  /* 涂鸦特定样式 */
}
```

### 5.4 测试增强方案

```javascript
// tests/interactions.test.mjs
import { test, expect } from 'node:test';
import { SCRIPT } from '../js/script/index.js';

test('旗阵玩法完美通过解锁隐藏信息', () => {
  const node = SCRIPT.d15_flag;
  expect(node.minigame).toBeDefined();
  
  // 模拟完美通过
  const perfectScore = 100;
  const nextNode = SCRIPT[node.minigame.nextOnPerfect];
  expect(nextNode).toBeDefined();
  expect(nextNode.text).toContain('隐藏信息');
});

test('关键词合成解锁回忆节点', () => {
  const recipe = COMPOSE_RECIPES.find(r => r.result === '挣紫');
  expect(recipe).toBeDefined();
  
  // 合成后应该解锁回忆
  const recallNode = SCRIPT[recipe.recallNode];
  expect(recallNode).toBeDefined();
  expect(recallNode.memory).toBeDefined();
});

// tests/e2e/flowchart.test.mjs
import { test, expect } from '@playwright/test';

test('完整流程：序章到第5日路线分岔', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // 点击新游戏
  await page.click('[data-action="new"]');
  
  // 等待序章完成
  await page.waitForSelector('#dialog-text', { timeout: 60000 });
  
  // 验证到达第5日
  const dayBar = await page.textContent('#day-bar');
  expect(dayBar).toContain('第 5 日');
});

test('三条个人线 GOOD 全通', async ({ page }) => {
  // 分别走三条线，验证都能到达 GOOD 结局
  // ...
});
```

---

## 六、风险评估与应对

### 6.1 技术风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 代码拆分导致回归 | 高 | 高 | 拆分前后都跑全量测试；保持全局接口不变 |
| 场景 CSS 遗漏 | 中 | 高 | 建立场景清单；添加自动化检测 |
| 孤儿节点遗漏 | 中 | 中 | 绘制剧情有向图；添加自动化检测 |
| Vite 配置问题 | 低 | 中 | 参考官方文档；保留原生构建作为 fallback |

### 6.2 内容风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 新增剧情与现有剧情冲突 | 中 | 高 | 先写设计文档；与现有节点对照 |
| 新增玩法破坏平衡 | 中 | 中 | 先做原型测试；收集玩家反馈 |
| 多周目体验不佳 | 低 | 中 | 明确多周目目标；提供差异化内容 |

### 6.3 进度风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 技术债务修复超预期 | 高 | 高 | 分阶段修复；优先 P0 |
| 剧情补完超预期 | 中 | 中 | 先写核心节点；迭代完善 |
| 测试覆盖不足 | 中 | 中 | 先覆盖核心流程；逐步扩展 |

---

## 七、总结与建议

### 7.1 核心结论

《樱时信笺》已经具备一部优秀视觉小说的骨架：
- **主题统一**：所有系统围绕"写信/回信"和"时间循环"
- **角色鲜明**：三位女主困境具体，弧光完整
- **叙事成熟**：循环有收束，后日谈克制温暖
- **技术扎实**：存档健壮，测试覆盖较全

当前最大的瓶颈是**代码体量和模块化程度**：
- engine.js 16999行，script.js 3743行
- gotoNode 巨型 if-else 链
- 场景 CSS 缺失、孤儿节点

### 7.2 下一步最核心的工作

1. **立即修复**（P0，1-2天）
   - 补齐缺失的场景 CSS
   - 修复孤儿节点链接

2. **地基修复**（P0，1-2周）
   - 拆分 engine.js 和 script.js
   - 引入 gotoNode 注册表
   - 建立场景清单和自动化检测

3. **剧情补完**（P1，2-3周）
   - 沈屿家庭线收束
   - 三女主旧交回忆
   - 长玩法链分章节

4. **玩法增强**（P2，2-3周）
   - 关键玩法绑定叙事分支
   - 合成回忆节点
   - 朋友圈/收件箱扩容

5. **工程优化**（P2，1-2周）
   - 引入 Vite
   - CSS 重构
   - 测试增强

### 7.3 长期愿景

完成上述工作后，项目将从"可运行的 Demo"升级为：
- **可长期维护**：模块化、可测试
- **可多人协作**：代码拆分、职责清晰
- **可扩展**：新增玩法成本低
- **可商业化**：视听体验达标、多平台打包

最终目标：成为一部"主题统一、叙事成熟、技术扎实"的完整视觉小说。

---

## 八、附录

### 8.1 关键文件索引

| 文件 | 说明 | 行数 |
|------|------|------|
| index.html | 主页面 | 108 |
| css/style.css | 全部样式 | 8545 |
| js/script.js | 剧本数据 | 4211 |
| js/engine.js | 游戏引擎 | 17939 |
| js/minigames.js | 基础迷你游戏 | 547 |
| js/saves.js | 存档系统 | 1918 |
| js/lifecycle.js | 生命周期管理 | 33 |
| tests/*.test.mjs | 自动化测试 | 6个文件 |

### 8.2 参考文档

- docs/v2.7.7-story-consistency.md — 剧情合理性复核
- 代码审查m3.md — v2.6.0 详细代码审查
- Kimi开发建议.md — 剧情梳理与技术建议
- glm开发建议.md — 技术架构分析
- seed开发建议.md — 剧情完整梳理

### 8.3 术语表

| 术语 | 说明 |
|------|------|
| 节点 | 剧本的最小单位，包含文本、选项、玩法等 |
| 玩法 | 互动小游戏，如涂鸦、拼贴诗、分拣等 |
| 关键词 | 通过剧情解锁的词汇，可两两合成 |
| 合成 | 把两个关键词合成为新关键词 |
| 循环 | 时间回溯机制，仅保留 d5_rewind 和 d15_rewind |
| 破环 | 打破时间循环，需要合成"樱花信" |
| 后日谈 | 真结局后的延伸剧情，时间线单调前进 |

---

**文档版本**：v1.0  
**最后更新**：2026-08-10  
**维护者**：Qwen
