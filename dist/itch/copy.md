# 樱时信笺 · Sakura Letters — itch.io 页面物料

生成时间：2026-10-30 · 版本 v3.4.30 · 由 `tools/make-itch-assets.mjs` 生成图片

## 文件清单

| 文件 | 尺寸 | 用途 |
|---|---|---|
| `cover-630x500.png` | 630×500 | itch 项目封面（Cover image） |
| `01-hallway-shiyu.png` | 1280×720 | 截图：序章 · 走廊初遇（林诗雨） |
| `02-field-xiazhi.png` | 1280×720 | 截图：序章 · 田径场（夏织） |
| `03-artroom-sunian.png` | 1280×720 | 截图：序章 · 美术室（苏念） |
| `04-hallway-senior.png` | 1280×720 | 截图：二周目 · 旧校舍走廊（学姐） |
| `05-festival-night.png` | 1280×720 | 截图：真结局 · 樱花祭之夜 |

## 标题

樱时信笺 · Sakura Letters

## 一句话简介（Short description / tagline，≤160 字符）

在樱花开的季节，写一封会改变时间的回信。校园群像 × 时间循环 × 多结局的 HTML5 视觉小说。

## 页面简介（Description）

**樱时信笺 · Sakura Letters** 是一款以「写信 / 回信」为核心交互的 HTML5 视觉小说。

转学生沈屿来到樱海学园的第一个樱花季，遇见了三位困在自己困境里的女孩——
把自己绷得太紧的班长林诗雨、在跑道上追着时间的夏织、把话都画进画里的苏念。
你写给她们的回信，会改变她们接下来的几天；而当时间开始循环，你要写的最后一封信，
是给自己。

- **441 个剧情节点 · 13 个结局**：选择会被记住，回信的内容会真的送到对方手里
- **88 种内置互动**：写信、翻找、拼图、节奏、涂色……剧情里的动作由你来完成
- **时间循环**：二周目起，同样的场景会多出一层「似曾相识」的文本
- **零安装**：纯前端 HTML5，浏览器打开即玩；支持键盘操作、减少动效、界面字号缩放
- **自动存档**：进度随时记录，刷新 / 关页不丢；支持存档导出备份

单周目约 30–40 分钟，全结局收集约 2–3 小时。

## 操作说明（Controls）

- 鼠标 / 触屏：点击对话框推进，点击选项做选择
- 键盘：`Space` / `Enter` 推进，`1–9` 快选选项，方向键在选项间移动
- 快捷键：`S` 快存，`Esc` 关闭浮层；顶部菜单可打开消息、朋友圈、历史、存档、设置

## 标签（Tags）

visual novel, html5, anime, romance, time loop, multiple endings, story rich, slice of life, chinese, free

## 分类与嵌入设置

- Kind of project：HTML
- Viewport：1280×800，勾选 Fullscreen button 与 Mobile friendly
- Classification：无（BGM 内嵌在包内）
- 价格：Free（可开「Pay what you want」）

## 素材与授权（Credits）

- 剧情 / 代码 / UI：本项目原创
- BGM：Patrick de Arteaga（CC BY 4.0），曲目见游戏「关于」页
- 字体：Noto Serif SC（SIL Open Font License 1.1，子集自托管）
- 角色立绘与 CG：AI 生成（见下方说明）

## AI 生成内容说明（建议填进 itch 的「AI disclosure」）

本作的角色立绘与场景 CG 由生成式 AI 产出，再经人工挑选、抠图与统一调色；
剧情、代码、界面与音乐授权均为人工完成 / 合法引用。游戏内不含 AI 实时生成内容。

## 上传步骤（需人工操作）

1. itch.io → Create new project → Kind of project: **HTML**
2. 上传 `dist/sakura-letters-v3.4.30-itch.zip`（先跑 `bash tools/pack-itch.sh`）
3. 上传本目录 `cover-630x500.png` 作为 Cover image；截图按 01–05 顺序上传
4. 粘贴上方标题 / 简介 / 标签 / 操作说明；填写 AI disclosure
5. 保存后先 私密预览，确认 iframe 内可开始游戏、存档与音量正常，再公开
