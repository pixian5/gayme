# 樱时信笺 · Sakura Letters

> 一款以「写信 / 回信」为核心交互的 HTML5 视觉小说：校园群像 + 时间循环 + 多结局。
> 在樱海学园的樱花季里，帮助三位女主角走出各自的困境，并最终写下自己。

- 当前版本：**v3.4.57**（开发测试版 · Demo）
- 技术形态：游戏本体纯前端、零构建，浏览器直接运行；账号与云存档为**可选**的同源 Node/SQLite 服务，不启动也能离线玩
- 存档方式：localStorage（schema v3，9 个槽位，槽位 1 为快存槽；快捷键 S 快存）；可选整包云同步
- 自动进度：推进剧情即自动记录最后位置（防刷新 / 关页丢失），标题页「继续游戏」一键恢复
- 在线试玩（唯一部署目标 · InstaBox 盒子）：https://8090-agqxoy6u363jxgfufg2onqxbm4.instabox.tech/
  （推 GitCode 后盒子的 root 计划任务每 3 分钟自动部署；`bash tools/deploy_box.sh` 可手动直推；
  **只在此部署与测试**）
- Hugging Face 镜像（**已停更**，停留在 v3.4.43 仅作静态展示）：
  https://xbzsb-sakura-letters.static.hf.space/index.html
- 自有域名 oh.sbbz.tech / play.sbbz.tech：已 CNAME → HF Space（橙云），**待在 CF 面板加一条
  Origin Rule（改写 Host 头为 xbzsb-sakura-letters.static.hf.space）即恢复**——旧 AWS 实例
  已回收、InstaBox 盒子无公网入站，域名只能借道 HF（详见
  [docs/20261107-0012-服务器迁移盒子与域名切换-GLM.md](docs/20261107-0012-服务器迁移盒子与域名切换-GLM.md)）
- 旧 Pages 链接已 301 重定向到唯一正式源（gh-pages 分支只放跳转页，v3.3.18）

## 运行方式

直接用浏览器打开 `index.html`；或起本地静态服务器：

```bash
python3 -m http.server 4173   # 然后访问 http://127.0.0.1:4173
```

## 可选账号与云存档

账号系统是独立可选组件：不登录时游戏仍是纯本地、离线可玩；账号服务未启动或不可达时，设置页只显示「账号服务未连接」，本地存档、剧情、图鉴、离线缓存全部照常。

**能力**：注册 / 登录 / 一次性找回码重置密码 / 修改昵称与密码 / 登录设备列表与单设备退出 / 导出账号数据 / 注销账号；云存档按整包同步（9 个槽位 + 图鉴 + 关键词 + 收件箱 + 设置），用 `revision` 检测多设备冲突，冲突时必须手动选择「云端覆盖本机」或「本机覆盖云端」，不会静默覆盖。

**本地启动**：

```bash
# 首次：可选复制环境变量
cp server/.env.example server/.env

bash server/ctl.sh start      # 默认 127.0.0.1:8096，SQLite 落在 server/data/game.db
bash server/ctl.sh status     # 进程 + /api/health
bash server/ctl.sh backup     # 在线备份 SQLite（保留最近 30 份）
bash server/ctl.sh stop
```

启动后访问 `http://127.0.0.1:8096/`（同一进程同时提供游戏静态页和 `/api`，Cookie 同源）。

**账号功能由部署决定（v3.4.55 起）**：仓库里 `index.html` 的 `<meta name="gayme-account-api" content="off">`
默认是**关闭**——纯静态部署（安装包、静态镜像、测试环境）不向 `/api/` 发任何请求，设置页也不显示账号区块。
带账号服务的部署在部署期把它改成空串（同源打开）：

| 部署方式 | 怎么打开 |
| --- | --- |
| `server/index.mjs` 自带接口 | 不用管：提供首页时在内存里自动改写，磁盘文件不动 |
| InstaBox 盒子（nginx 静态 + `/api/` 反代） | 不用管：`tools/box_cron_deploy.sh` 同步站点后执行 `tools/patch_account_flag.py on`，开关没打开算部署失败 |
| 其它静态服务器 + 账号服务 | 部署时手动执行 `python3 tools/patch_account_flag.py on <站点根目录>` |

开关关闭时本地游玩完全不受影响。

**生产部署**：建议 nginx/Cloudflare 终止 TLS 后反代到本进程，且让游戏与 `/api/` 同源；设置
`GAYME_TRUST_PROXY=1` 与 `GAYME_COOKIE_SECURE=auto`（HTTPS 自动加 Secure Cookie）。账号服务只需要 Node ≥ 22
（使用内置 `node:sqlite`），不依赖 npm 包；数据库与日志都在 `server/data/`，迁移时整目录复制即可。

## 测试

```bash
npm test                    # Node 原生测试：剧情图可达性 / 时间线一致性 / 存档边界 / 静态契约 / 生命周期 / 服务端单元测试（71 项）
npm run test:syntax         # 全部 JS 语法检查
npm run test:e2e            # 真实浏览器运行时回归（chromium；首次需 npx playwright install chromium）
npm run test:mobile         # 移动端触控回归（390×844 / hasTouch / isMobile，~5s）
npm run test:e2e:firefox    # 同上换 Firefox 内核（首次需 npx playwright install firefox + install-deps firefox）
npm run test:account        # 账号 API 集成测试（36 项，临时 SQLite；含老库迁移、覆盖保护、历史版本、哈希不阻塞、地址取法、文件权限、孤儿审计清扫）
npm run test:account:e2e    # 账号 UI 浏览器 e2e（注册/上传/换设备恢复）
npm run test:cloud          # 云存档数据安全浏览器 e2e（7 项：空存档不覆盖云端、换账号不串号、历史版本、自动同步…）
bash tools/test_box_cron_deploy.sh   # 盒子部署脚本的离线流程测试（11 类情形；不碰线上文件；需要 git / rsync / python3）
bash tools/test_nginx_patch.sh        # nginx 配置补丁工具的离线测试（8 类情形；不碰线上配置）
```

其余浏览器套件：`npm run test:settings`（界面设置与账号开关）、`test:perf`、`test:graph`、`test:defects`、
`test:persistence`、`test:overflow`、`test:offline`、`test:play`。**发版前 16 套全跑**（见 [发版流程](docs/发版流程.md)）。

**持续集成（v3.4.56 起）**：推到 GitHub 后流水线自动跑同一份清单（Node 22 与 24 各跑一遍账号相关套件，另加
Firefox 内核的引擎回归），约 8 分钟。`package.json` 里每新增一个测试脚本都必须同时加进
`.github/workflows/test.yml`，否则静态契约会拦。部署不依赖流水线结果（盒子从 GitCode 拉取）。

改动完成门槛：`npm test` 全过 + `npm run test:syntax` + `npm run test:e2e` + 涉及账号时 `test:account`、
`test:account:e2e`、`test:cloud` + `git diff --check`。测试只在 InstaBox 盒子的测试目录跑（本机只改代码）。

## 远程仓库与云端测试

| 远程名 | 地址 | 作用 |
| --- | --- | --- |
| `gitcode` | gitcode.com/laotongtian/gayme | **部署主源**：盒子的 root 计划任务每 3 分钟从这里拉取并自动部署（2026-11-24 在盒子上实测确认）。**AtomGit（atomgit.com）与本仓库是同一份代码的两个域名，不是第三个远程——不要重复配置/核对** |
| `origin` | github.com/pixian5/gayme（公开） | 镜像；持续集成（GitHub Actions）在这里跑。gitee 远程已彻底移除 |

> **`origin` 永远是 GitHub，这是硬规约**（2026-11-01 定）。gitcode 不得占用 `origin` 这个名字。
> **部署主源是 `gitcode`**：盒子上的部署克隆 `/data/home/gayme-deploy` 只配了 GitCode 一个远端。
> 此前文档写的「GitHub 是部署主源」已过时——只推 GitHub 不会触发部署。
> 双远程 `main` 应指向同一提交，发版后用 `git ls-remote gitcode main` 与 `git ls-remote origin main` 核对。
> **atomgit.com/laotongtian/gayme 与 gitcode.com/laotongtian/gayme 是同一个仓库**（两个域名指向同一托管），
> 无需单独添加远程、也不要在同步核对里重复计数。
> **GitHub 推送踩坑**：`curl https://api.github.com` 能通不代表 `git push` 能过——本沙箱 git 走
> GnuTLS，上传大包会报 `GnuTLS recv error (-110)`，需
> `git config http.postBuffer 524288000`（必要时再加 `http.version HTTP/1.1`）。

GitHub 上的分支：`main`（开发主线）+ `gh-pages`（只放跳转页，旧 Pages 链接 301 到正式源）。
本地 `main` 跟踪 `origin/main`（= GitHub），所以裸 `git push` 只推 GitHub、**不会触发部署**。
发版必须显式推部署主源：`git push gitcode main`（推完盒子计划任务 3 分钟内自动部署），再 `git push origin main` 同步镜像。

云端（干净克隆）跑测试，一条链路可复现：

```bash
git clone https://github.com/pixian5/gayme.git && cd gayme
npm ci                              # 只装 playwright 包（不含浏览器内核）
npx playwright install chromium     # 首次约 150MB；只跑 npm test 可跳过这步
npx playwright install chromium-headless-shell  # e2e 用 headless shell，部分版本不随 chromium 安装
npx playwright install-deps chromium           # 精简镜像缺 libatk 等系统库时补装
npm test && npm run test:syntax     # 静态门槛（56 项 + 语法）
npm run test:e2e                    # 运行时回归 ~8s
BROWSER=firefox npm run test:e2e    # Firefox 内核回归（需 npx playwright install firefox）
npm run test:mobile                 # 移动端触控回归 ~5s
npm run test:overflow               # 窄屏玩法溢出扫描 ~150s（390×844 扫全部 95 个玩法节点）
npm run test:defects                # 缺陷回归 11 项（线索/导入导出/XSS/音量/多标签/离线）~20s
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

**v3.4.57（2026-11-28）**：**防嵌入加固**——8090 与 2096 两个 nginx 站点都下发
`X-Frame-Options: SAMEORIGIN` 与 `Content-Security-Policy: frame-ancestors 'self'`，
游戏页面不能再被第三方站点用 iframe 套住做点击劫持。每个站点各建一份 `security_headers.conf`，
server 级与每个 `location` 各引入一次（location 自己写了 `add_header` 就不继承 server 级）。
本轮同时修掉工作区里 v3.4.57 半成品的四条问题：`changed_has` 未定义、测试预期与新逻辑冲突、
「配置没变只补文件」的分支被反向限制、新建安全头文件在 `nginx -t` 失败时无法回滚。
补丁工具离线测试扩到 9 个情形；`npm test` 71/71、语法通过、部署脚本流程测试全过。
没有玩法与剧情改动。详见
[v3.4.57 版本记录](docs/20261128-0937-v3.4.57-防嵌入加固-Doubao.md)、
[当前开发进度](docs/20261128-0937-当前开发进度-Doubao.md)、
[下一步待实现](docs/20261128-0937-下一步待实现-Doubao.md)。

**v3.4.56（2026-11-24）**：**持续集成与账号服务加固**——测试流水线从「只跑静态契约与语法」扩成全量
（16 套加 Firefox 内核，约 8 分钟），并用一次性分支验证过「改坏会变红」（补上了引擎回归红了四天没人发现的漏洞）；
新增契约保证 `package.json` 里每个测试脚本都出现在流水线里。账号服务加固七项：密码哈希改异步（一次校验不再让
其他玩家排队）、客户端地址只取可信代理写入的最后一项、未处理异常后退出由容器重启、数据库与备份文件权限 600、
孤儿审计记录随定期清理清掉、网页服务器不再回显版本号、隐私说明补上自动同步与历史版本。另新增仓库根目录
条目分类契约，nginx 补丁工具重写并配离线测试。没有玩法与剧情改动。盒子全量 17 项通过，已于 2026-11-24
部署并通过线上核对（文件权限 600、响应头不再带版本号、伪造地址不生效、孤儿审计记录 4 行 → 0 行），
GitHub 流水线五个任务全绿。详见
[v3.4.56 版本记录](docs/20261124-1120-v3.4.56-持续集成与账号服务加固-GLM-5.4.md)、
[当前开发进度](docs/20261124-1120-当前开发进度-GLM-5.4.md)、
[下一步待实现](docs/20261124-1120-下一步待实现-GLM-5.4.md)。

**v3.4.55（2026-11-24）**：**云存档数据安全与部署加固**——审查坐实的四条缺陷全部修复，每条都有回归用例：
①新设备勾选自动同步、②清空本地后重新开局，都不再能覆盖云端（服务端两道保护：空存档、收集进度变少；
前端当场提示并暂停自动同步）；③共用设备换账号不串号（本机存档记归属）；④自动同步失败一律可见，
且只在存档真的变化时才上传、两次至少间隔 60 秒、页面转后台立即补传、限流按账号计数。新增云端历史版本
（每账号 10 版，可恢复到本机）与 v3.4.54 老库自动迁移。**账号功能改由部署决定**（仓库默认关闭），
引擎端到端回归自 v3.4.53 起首次转绿。盒子部署脚本入库并加固：部署前备份、站点逐文件完整性核对、
站点根只放运行文件、自愈、自更新。测试 **16 套全过**（静态契约 59、账号接口 31、云存档保护 7、
部署脚本流程 104 条断言等）。详见 [v3.4.55 版本记录](docs/20261124-0534-v3.4.55-云存档数据安全与部署加固-GLM-5.4.md)、
[当前开发进度](docs/20261124-0534-当前开发进度-GLM-5.4.md)、[下一步待实现](docs/20261124-0534-下一步待实现-GLM-5.4.md)。

**v3.4.54 审查（2026-11-24，历史记录）**：拉取最新代码后对账号与云存档（v3.4.53 新增的后端）做了整
体审查。测试 14 套里 13 套通过，引擎端到端回归失败（v3.4.53 起引入的一条 404）。**复现了 4 条
产品缺陷**，全部集中在云存档：新设备勾选自动同步会把云端存档清空；清空本地后重新开局会覆盖
云端；共用设备换账号会把上一个人的存档传进新账号的云端；自动同步撞到限流后界面没有任何
提示。另有线上数据库零备份、许可证与 CG/立绘授权未决两项上线前必须解决的事项。审查当天未改游戏源码；
四条缺陷与零备份已在 v3.4.55 解决，审查用的复现脚本也已改写为正式回归用例
`tests/browser/cloud-guards.e2e.mjs`（`npm run test:cloud`）。审查原文见
[当前开发进度](docs/20261124-0309-当前开发进度-GLM-5.4.md) 与
[下一步待实现](docs/20261124-0309-下一步待实现-GLM-5.4.md)。下文「已知无产品缺陷」的旧结论已作废。

**v3.4.54（2026-11-20）**：**梦境碎片提示修复**——提示条从屏幕正中移到上方 88px，不再遮住梦境
场景正文；碎片提示改显玩家可读的碎片文本（删除 `dream_shard_*` 内部 ID 暴露），停留 2.6 秒；
同一时间只保留一张场景卡，连续点击不同场景不再叠卡。浏览器实测提示与正文矩形零重叠，
连点后场景卡数量为 1，控制台零错误；L0 56/56、语法 1/1、账号 API 24/24。详见
[梦境提示修复](docs/20261120-1354-v3.4.54-梦境提示修复-Doubao.md)。已提交 `78e37b7` 并推送
GitHub/GitCode；盒子 cron 已拉取，公网 `/VERSION` = 3.4.54。

**v3.4.53（2026-11-20）**：**可选账号与云存档**——新增同源 Node/SQLite 账号服务（`server/`）：
注册/登录/一次性找回码/改密/昵称/设备列表与单设备退出/导出/注销，云存档整包同步 + `revision`
冲突检测（409 后必须手动选择云端覆盖本机或本机覆盖云端）。设置页接入账号面板；不登录仍纯本地、
离线可玩，账号服务不可达只显示未连接。新增 `server/test_api.mjs`（24 项）、
`tests/browser/account.e2e.mjs`、`server/ctl.sh`、在线备份与 `tools/patch_nginx_account.py`。
线上 InstaBox 盒子已部署账号容器与 `/api/` 反代，`/api/health` = 3.4.53，
公网注册/上传/刷新保持登录实测通过。详见
[账号专题](docs/20261120-1321-v3.4.53-账号与云存档-Doubao.md)。

**v3.4.52（2026-11-20）**：**同节点空白兜底 + 部署期域名注入**——`gotoNode` 防重入分支补「界面已被清理则
重放渲染」兜底（气味闪回递归跳 `d4_silence` 二次进入会留空白，graph 走查实测 no-visual），并在节点切换时
清理残留玩法浮层；graph e2e 视觉等待由固定 60ms 改为 `waitForFunction`（≤1.2s），消掉高负载抢跑。新增
`tools/patch_site_origin.py`，`deploy_box.sh` rsync 后按 `SAKURA_URL` 改写 og:url / og:image / twitter:image /
robots Sitemap / sitemap loc——换盒子不再手改仓库。a11y 顶栏补 `role="navigation"`，nginx 补 `text/markdown`
（NOTICE/PRIVACY 不再被当二进制下载）。实测：L0 56/56、engine 7/7、graph 441/0（1.3s）。

**v3.4.51（2026-11-19）**：**字体补齐 + 元数据缓存**——按当前字符集（1909 字 / 汉字 1683）重建
Noto Serif SC 子集，字形 1722 → **1868**，此前缺失的 **127 个常用字**（曲/跨/纳/讲/绝/英/隙/迎/陷/蝉…，
正文出现 227 次）全部补回，不再回退系统字体；字体 URL `?v=` 3.2.4 → 3.4.51，CSS 与 SW 预缓存同步。
nginx 新增精确 location：`manifest.webmanifest` → `no-cache`，`robots.txt` / `sitemap.xml` →
`max-age=300`，不再被一年 immutable 规则锁死。实测：L0 56/56、graph 441/0、overflow 0 溢出（新字宽下）、
线上字体 368,944B / 1868 字形 / 0 控制台错误。

**v3.4.50（2026-11-19）**：**低配可玩性 + 分享卡片修复**——设置面板新增「界面模糊」开关
（`blurEffects`，默认开启、视觉零变化）：关闭时 `<body class="no-blur">` 摘掉常驻对白框 / 选项层 /
心条 / 日程条与全部 `*-layer` 玩法浮层的 `backdrop-filter`，并压实底色维持对比度。软件渲染实测
选项层 48.1ms（p95 66.7ms）→ 16.7ms（p95 16.7ms），3 秒采样帧数 62 → 180；新增
`tests/browser/settings.e2e.mjs`（4 项：开关生效 / 刷新保持 / 旧档默认 / 导入白名单 / 与减少动效独立）
与 `tests/browser/perf.e2e.mjs`（computed style 硬断言 + 帧耗时 A/B 记录）。同时修正分享卡片：
`og:url` 改为唯一真源，`og:image` / `twitter:image` 与其同源（此前三条 meta 仍指向已失效的
`oh.sbbz.tech:8080`，实测 301→HTTPS→**525**），测试从「硬编码域名」改为同源自洽断言，
新增 `scripts/check-meta.mjs` 发布后校验；`playtest` 点击预算 2s→8s 并统计慢点击（>1s 只告警不判失败）；
部署补丁给 `/qa-results/` 返回 404，rsync 同步排除该目录。

**v3.4.49（2026-11-18）**：**loopText 收官**——第三批 13 节点，全剧 214 处，d 链玩法
节点 43/43 全覆盖（v3.4.11 搁置的既定缺口清零）；**CSP 首个真矩阵全绿**（round6 十套 10/10，
五画像 0 控制台错误）——过程中抓出并修复测试基建的 iframe.eval 问题（游戏本体零 eval），
更正了 round4 的版本标注误差。推送 gitcode 主 + GitHub 镜像。
**v3.4.44（2026-11-17）**：**商业级全量测试通过**——12 套矩阵全绿（54 契约 + 六套 e2e +
Firefox 双内核 + 新增**持久化完整性 8 项**与**离线端到端不设跳过**两套），零产品缺陷，
过程修的 5 处全为测试侧编写问题（逐条对照源码核实）。发版规约：只部署 InstaBox 盒子
（GitHub 单源 cron），HF 停更留档。Cloudflare Tunnel 材料已备（cloudflared 已装盒 +
一键脚本），等面板令牌接线即复活 oh/play 域名。
**v3.4.43（2026-11-16 四连发）**：v3.4.40 发版流程固化 + GitHub Actions 纯测试 CI +
塔罗逆位修复；v3.4.41 **媒体离线缓存**（页面侧 Cache API + blob，离线也能听 BGM/看 CG/立绘，
不经 SW 拦截不影响 Firefox 稳定性）；v3.4.42 涂抹类玩法首次「手指划过」演示；
v3.4.43 loopText 首批 12 玩法节点（177→189）+ 记忆/关键词音效改配采样。
测试环境迁至 InstaBox 盒子（`/data/home/gayme-test`，每版六套全绿后发版）。
**v3.4.39（2026-11-16 合并）**：GitCode 并行线 4 提交并入主线——序章线索不可达修复、
备份导入两处 XSS 转义、跨标签存档加固、SW 运行时缓存白名单、离线立绘回退、
**新增第 6 套 e2e（11 项缺陷回归，`npm run test:defects`）**；三远程同步、HF 补部署 v3.4.39。
**v3.4.36**：视觉审计修复四连（首屏 FOUC 内联关键样式 / 旁白名牌残留 / 手机顶栏溢出 /
CG 查看器加载占位）——源自三轮真实浏览器截图审计。
剧情主线、后日谈、92 种互动实现与存档/图鉴系统全部完成（441 节点），
56 项静态测试 + 双内核 e2e（采样 8 项 + **全图走查 441 节点零错误**）全过。
**HF 线上试玩验收（2026-11-06）**：三画像（认真/懒人/探索）在 HF Space 上全部通关、
0 错误 0 卡点 0 缺文件；首进站约 2.83MB，回访 46/46 全 SW 缓存直供（出网≈0）。
注意 Space 版本停在 v3.4.25，建议尽快 `HF_TOKEN=... bash tools/deploy_hf.sh` 同步到 v3.4.35
（含真实音效）；自有服务器 2026-11-06 起两个入口均不可达（疑似临时实例又重建），HF 为唯一线上入口
→ [docs/20261106-2340-HF线上真人画像试玩-GLM.md](docs/20261106-2340-HF线上真人画像试玩-GLM.md)。
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
**v3.4.30**：**发行物料与分享卡片**——新增 `tools/make-itch-assets.mjs`（Playwright 可复现生成）：
itch 封面 630×500（HTML/CSS 合成，中文标题不走 AI 生图避免错字）+ 5 张 1280×720 游戏截图
（走廊 / 田径场 / 美术室 / 旧校舍 / 樱花祭夜景），文案见 `dist/itch/copy.md`（简介 / 标签 / 操作 /
授权 / AI disclosure）；`og:image` 改为唯一正式源绝对地址，补 `og:url` / `og:site_name` /
`twitter:image` / 尺寸声明，社媒分享不再丢图；新增分享卡片契约（50→51）。`pack-itch.sh` 实测出包 11MB。
**v3.4.31**：**真实音效落地**——8 个 CC0 录制采样进 `audio/sfx/`（点击 / 翻页 / 信纸 / 成功 / 失败 /
风铃 / 雨 / 蝉，约 187KB，ffmpeg 统一转 48kHz 单声道 Ogg）；`playSfx` 改为采样优先、未就绪或解码失败
回落程序化合成；雨 / 蝉作为短环境音随场景切换（rain / summer / field）播放，切场景时自动打断；
风铃接入 windchime 玩法；关于页补 Kenney 与 OpenGameArt 作者署名；新增采样清单一致性与回退路径
契约（51→53）。
**v3.4.32**：**音效可试听**——设置面板音效音量行新增「▶ 试听」按钮（播放信纸采样），滑杆松手也试听一次
（音量为 0 时不播），调音量后能立刻判断是否合适；窄屏下该行允许换行并收窄滑杆，避免横向溢出；
新增试听契约 + e2e 按钮点击断言（53→54）。
**v3.4.33**：**回归审计问题全修**——八套流程全量回归 + 24 张截图视觉审计后：
① **Firefox e2e 偶发失败根治**：SW 的 `respondWith` 改为全路径兜底（永不出 `undefined` / 不 reject），
并让媒体资源（BGM / CG / 立绘）改由浏览器原生加载——四组对照实验证明「Firefox 拦截媒体 + 刷新取消
请求」必报 `unexpected error`（不拦截 6/6 通过，拦截 0/6），代价是离线退化（无 BGM/CG、立绘回退 SVG）；
② **移动端三处溢出修复**：钢琴键宽自适应、倒影偏移按舞台宽度收敛、糖块格子收敛 + 位置 clamp；
③ 说明栏收起按钮触控热区 26×16 → 40px；④ 新增 `npm run test:overflow`（390×844 扫全部 95 个玩法节点，
横向溢出 0）；⑤ 文档计数对齐（loopText 176 节点 / 489 段）。
详见 [docs/20261101-0152-v3.4.33回归审计问题修复-Auto.md](docs/20261101-0152-v3.4.33回归审计问题修复-Auto.md)。
**v3.4.34**：**远程收口（无玩法改动）**——GitHub 备份源补齐到 `c0e35e8`（沙箱 git 走 GnuTLS，
push 大包报 `recv error -110`，`http.postBuffer=524288000` + `HTTP/1.1` 后成功）；
`origin`(当时=gitee) / `gitcode` / `github` 三远程 `main` 与线上 `/VERSION` 全部对齐，
gh-pages 分支保留未动；README 远程表按当时实际命名修正（v3.4.35 起 `origin` 已固定为 GitHub）。
详见 [docs/20261101-0850-GitHub远程补齐与三远程同步-Auto.md](docs/20261101-0850-GitHub远程补齐与三远程同步-Auto.md)。
**v3.4.35**：**远程命名定规（无玩法改动）**——`origin` 固定指向 GitHub（两次 `git remote rename`
互换 + `git branch -u origin/main main` 重置 upstream），gitee 作为部署主源、发版必须显式
`git push gitee main`；README 远程表与提交规约按此改写，经验档把「origin 硬约束」升级为不得改回。
详见 [docs/20261101-1015-origin固定指向GitHub-Auto.md](docs/20261101-1015-origin固定指向GitHub-Auto.md)。
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

**当前状态（v3.4.57，2026-11-28）**：内容闭环（441 节点 / 13 结局 / 214 处多周目文本）与安全基线成立；
云存档的四条数据缺陷已修复并有回归用例；持续集成跑全量；账号服务加固七项完成；
两个公网站点的防嵌入响应头已补齐。
**不需要拍板的开发项已经清空——下一步要先请你拍板。** 仍不适合接待真实用户的两件事不变：
备份只在盒子本机（没有异地副本）、服务跑在会自动暂停的免费沙箱上。

**美术素材新规则**：只用你提供的 GLM/CogView Key 生成，禁用内置 `image_gen`，生成后去掉右下角
「AI生成」水印。现有 11 张 CG 与 5 张立绘来自内置 `image_gen`（`seedream_5.0_flash`），
属历史资产；是否整套重制需要你拍板，重制需要 CogView Key。

| 优先级 | 事项 | 说明 | 需要你回答的 |
|---|---|---|---|
| P0 | 异地备份 | 本机备份、校验、演练、告警都有了；盒子丢了就全丢 | 放哪台主机 |
| P0 | 生产环境选址与迁移 | 迁到常驻主机；迁移步骤已写成可照做的清单 | 用哪台；域名是否走 Tunnel |
| P1 | 注销冷静期 | 现在注销立即生效且不可逆 | 做不做；几天（建议 7 天） |
| P1 | 邮箱找回 | 现在只有一次性找回码 | 是否强制绑定邮箱 |
| P1 | 许可证与素材授权 | 无 LICENSE；CG 11 张与立绘 5 张授权待确认 | 许可证类型；素材授权结论 |
| P1 | 真机矩阵 | 苹果、安卓真机不在自动化矩阵里 | 需要真机 |
| P1 | 账号容器降权 | 容器仍以 root 运行；文件权限已在 v3.4.56 收紧 | 随迁移一起做 |
| P2 | 其余加固与内容项 | 冲突界面用例、限流持久化、可访问性、手势演示扩面等 | — |

- **完整计划**（分阶段清单：工程体验 / 内容纵深 / 素材管线 / 分发多语言）
  → [docs/20261024-0934-下一步开发完整计划-DeepSeek.md](docs/20261024-0934-下一步开发完整计划-DeepSeek.md)
- **本轮进度分析（以此为准）** → [docs/20261120-0256-项目进度分析-v3.4.51-Doubao.md](docs/20261120-0256-项目进度分析-v3.4.51-Doubao.md)
- **当前进度与待实现（分篇，以此为准）** → [当前开发进度](docs/20261128-0937-当前开发进度-Doubao.md) ·
  [下一步待实现](docs/20261128-0937-下一步待实现-Doubao.md)
- 上一版分篇（v3.4.56 当天，历史快照） → [当前开发进度](docs/20261124-1120-当前开发进度-GLM-5.4.md) ·
  [下一步待实现](docs/20261124-1120-下一步待实现-GLM-5.4.md)
- 更早一版（v3.4.54 整体审查当天，历史快照） → [当前开发进度](docs/20261124-0309-当前开发进度-GLM-5.4.md) ·
  [下一步待实现](docs/20261124-0309-下一步待实现-GLM-5.4.md)
- 上一版分篇（v3.4.54 发布当天，历史快照） → [当前开发进度](docs/20261120-1354-当前开发进度-Doubao.md) ·
  [下一步待实现](docs/20261120-1354-下一步待实现-Doubao.md)
- **v3.4.44~51 补档** → [docs/20261120-0256-v3.4.44-51开发记录补档-Doubao.md](docs/20261120-0256-v3.4.44-51开发记录补档-Doubao.md)
- **发版步骤（两线共用）** → [docs/发版流程.md](docs/发版流程.md)

## 文档索引与经验

- 全部文档（版本记录 / 规划 / 外部分析 / 工具说明）逐篇介绍 → [文档索引.md](文档索引.md)
- 分类经验（部署 / 版本规范 / 工程避坑 / 内容开发）→ [经验/](经验/)（docs 不一定都对，以实测为准）

## 合规与许可

- 第三方素材许可清单：`NOTICE.md`
- 隐私说明（本地存储、无上传/无遥测）：`PRIVACY.md`
- 字体许可全文：`fonts/OFL.txt`
- 自有代码/剧情/美术的 LICENSE 由权利人另行提供（当前未声明）

## 目录结构

```
index.html          入口（样式 style.css + games.css；脚本 14 个按序加载，engine.js 最后）
css/style.css       基础与引擎 UI 样式（顶部为自托管 @font-face）
css/games.css       全部玩法浮层样式（94 套，v2.9.2 拆出）
fonts/              自托管 Noto Serif SC 子集（非 Mac 平台兜底；macOS 优先用本机 Songti SC，重建见 tools/rebuild_font_subset.sh）
audio/bgm/          5 首真实 BGM（Ogg，约 8MB；Patrick de Arteaga · CC BY 4.0，署名见游戏「关于」页）
audio/sfx/          8 个真实音效采样（Ogg，约 187KB；Kenney · OpenGameArt，CC0，署名见「关于」页）
assets/cg/          CG 位图 11 张（1600×960 JPEG，约 2.3MB；由 js/script.js 的 CGS.img 引用）
js/saves.js         存档与图鉴数据层（localStorage，107 个键；记录型存取由 recordStore 工厂生成）
js/script.js        剧情数据（CHARACTERS / PORTRAITS / KEYWORDS / CGS / SCRIPT 417 节点 + 学姐线 24 节点）
js/lifecycle.js     浮层异步生命周期（读档/返回标题时安全取消）
js/minigames.js     3 个基础迷你游戏（writing / running / painting）
js/gamekit.js       玩法框架基座：统一浮层外壳 / 结果收尾 / 生命周期 / host 桥 / 通用分发 types()
js/games/           全部 89 个玩法模块：afterword 5 / senses 8 / craft 13 / nature 13 /
                    perception 14 / mechanism 14 / imagery 12 / direct 10（直跳型）
js/engine.js        纯引擎：节点分发（GameKit.types() 通用循环）/ UI 浮层 / 存读档 / 图鉴 / 粒子 / BGM
sw.js               Service Worker：预缓存 23 项核心资源（字体/图标后台预热）（BGM / CG 走 sakura-media 运行时缓存），缓存版本 sakura-vX.Y.Z 随发版同步
tools/              工程工具：玩法迁移转换器 / 等价性校验器 / 版本号同步 / 字体子集三件套 /
                    deploy_hf.sh（抱脸 static Space 同步）+ hf-space-readme.md（Space 首页文案）
tests/              Node 原生测试（56 项）+ tests/browser/ 浏览器 e2e 回归（engine.e2e.mjs）
docs/               版本记录与规划文档（多模型分析文档在 docs/analysis/）
```

## 约定

- 版本号：每次修改 +0.0.1，满十进一（当前 v3.4.46）
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
- 音效：`audio/sfx/{click,page,letter,success,fail,windchime,rain,cicada}.ogg` 由引擎 `SFX_SAMPLES`
  引用，采样优先、解码失败自动回落程序化合成；素材为 CC0，Kenney 与 OpenGameArt 作者署名保留在「关于」页
- CG 位图：11 张已全部接入（`CGS.img` → `assets/cg/<id>.jpg`，1600×960、5:3、JPEG q82，
  单张 115–355KB）；新增/替换 CG 只需产图 + 改 `img` 路径（或加字段），并把新文件补进
  `sw.js` 预缓存与 `tests/static.test.mjs` 资源清单；无 `img` 的条目仍用内联 SVG 兜底。
  生图后统一后处理：裁掉底部白色 letterbox → `scale=1600:960:flags=lanczos`（详见
  [docs/20261024-1614-CG位图批量-Doubao.md](docs/20261024-1614-CG位图批量-Doubao.md)）
- 字符集改动等价性：跨文件迁移/重构后跑 `tools/equivalence_check.py`（旧引擎快照 vs 新文件）
- 提交：中文 commit，完成后推送双远程（先 `git push gitcode main`（部署主源），再 `git push origin main`
  （GitHub 镜像））；推完 InstaBox 盒子的计划任务 3 分钟内自动部署（`tools/deploy_box.sh` 手动直推备用）
- 云端测试：`origin` = GitHub（Trae 关联仓库依赖该命名与域名，**不要改成 gitee**），
  流程见上文「远程仓库与云端测试」；云端提交后记得把 `main` 同步推到 `origin`，否则盒子不会部署到最新
- 部署链路：本地测试（npm test + test:syntax + test:e2e）是唯一门槛，不依赖任何 CI；
  盒子自动部署脚本 /root/sakura-deploy.sh（GitHub 单源→rsync→健康检查→失败回滚）
- 部署到 Hugging Face：`HF_TOKEN=hf_xxx bash tools/deploy_hf.sh`（static Space，只同步运行文件，
  二进制走 Git LFS；Space README 源文件是 `tools/hf-space-readme.md`）；发版后手动跑一次即可
- 开发测试版：允许重构，无需兼容旧数据，但重构前先备份
