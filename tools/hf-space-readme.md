---
title: 樱时信笺 Sakura Letters
emoji: 🌸
colorFrom: pink
colorTo: indigo
sdk: static
pinned: false
license: mit
short_description: 以写信/回信为核心交互的 HTML5 视觉小说（校园群像 + 时间循环 + 多结局）
---

# 🌸 樱时信笺 · Sakura Letters

一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

**点上面的「App」标签，或直接访问 https://xbzsb-sakura-letters.static.hf.space/index.html 开始游玩。**

- 纯前端零构建：浏览器直接运行，无需后端；存档在 localStorage（9 槽位 + 自动进度）
- 内容规模：441 个剧情节点、13 个结局、92 种互动玩法、11 张 CG、11 个关键词合成
- 音频：5 首免版权 BGM（Patrick de Arteaga，CC BY 4.0，署名见游戏「关于」页）
- 支持 PWA 离线游玩、键盘无障碍、多周目差异化文本、图鉴收集统计

## 操作

- 点击 / 空格推进对话；选项支持方向键 + Enter、数字键 1-9 快选
- 顶栏：日程、心条、关键词、信件、CG 图鉴、流程图、回忆、设置、统计
- 快捷键：S 快存

## 说明

- 本 Space 为**静态镜像**，源仓库在 GitHub：[pixian5/gayme](https://github.com/pixian5/gayme)
- 只同步运行所需文件（HTML / css / js / fonts / audio / assets / icons），
  不含 docs、经验、tests、tools 等开发资料
- 二进制资源（webp / ogg / woff2 / png）走 Git LFS（HF 的 Xet 存储），
  未加 LFS 规则会被 pre-receive hook 拒绝
- 版本号见页面「设置 → 关于」或仓库根目录 `VERSION`
