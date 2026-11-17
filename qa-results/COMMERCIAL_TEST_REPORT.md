# 商业化测试报告（COMMERCIAL TEST REPORT）

> 2026-11-17 11:12 · 接手工程师（GLM）· 被测：v3.4.47 基线 → **v3.4.48（CSP 基线）**
> 环境：InstaBox box-c6119b（Debian / Node 22 / Chromium 156 + Firefox），
> 测试工作副本 `/data/home/gayme-test`（origin=AtomGit），线上即本盒 8090。
> 路径说明：交接指定的 `/workspace/qa-results/` 属 WorkBuddy 云机；本机无该路径，
> 报告落在仓库 `qa-results/`（无敏感信息，可入库）。
> **交接文档 `/workspace/HANDOFF-gayme.md` 在本机不存在**（已全盘检索留证），
> §4 P2 细节缺失部分以独立测量替代；§5 未用到（环境未被清理）。

---

## 0. 结论速览

| 项 | 结果 |
|---|---|
| 版本一致性 | 本地 = 盒 web = 线上 = **3.4.48**（核验时 3.4.47 → 本轮发版 3.4.48）|
| 测试矩阵（v3.4.47 基线） | 10 套全过 |
| 测试矩阵（v3.4.48 CSP 后） | **10 套全过**（五画像 0 控制台错误）|
| 线上安全头/缓存/SEO/404 | 全部通过（见 §3）|
| 线上 BASE_URL 离线端到端 | 通过（SW 接管 2037ms）|
| 首访性能 | DCL ~270-330ms / 可交互 ~330-390ms / 23 请求 / 0.33MB —— 无需再优化 |
| P1 CSP | **已完成**（v3.4.48）：inline SW 注册外置 + CSP 上线 + 全量回归 |
| 遗留 | git push 待用户给新 AtomGit PAT；LICENSE/授权两项待用户拍板（§6）|

## 1. 版本与工作树核验

- 本地：`6b4a892`（v3.4.47，ff 自 AtomGit `6b4a892`）→ 提交 `6a75cdd`（v3.4.48）等，工作树干净
- 远程：AtomGit=6b4a892（主源，匿名可拉取）；GitHub=旧 a7cf69a（v3.4.45，**滞后**）；GitCode=6b4a892
- **发现并修复的部署拓扑隐患**：盒 cron 部署克隆与测试克隆仍指向 GitHub（停在 v3.4.45），
  而盒 web 根已被并行线用 deploy_box.sh 直推到 v3.4.47——两克隆已切 AtomGit，
  cron 恢复与主源一致（无回滚风险）
- 线上：`curl /VERSION` = 3.4.47 → 发版后 3.4.48

## 2. 测试矩阵（任务 2）

**v3.4.47 基线（round3）与 v3.4.48 CSP 后（round4）各跑一轮，均为 10/10：**

| 套件 | v3.4.47 | v3.4.48 |
|---|---|---|
| npm test（54 契约） | ✅ 54/54 | ✅ 54/54 |
| test:syntax | ✅ | ✅ |
| test:e2e（chromium） | ✅ | ✅ |
| test:mobile | ✅ | ✅ |
| test:graph（443 节点） | ✅ | ✅ |
| test:defects | ✅ 13/14+1 明示跳过 | ✅ 同 |
| test:persistence（8 项） | ✅ 8/8 | ✅ 8/8 |
| test:overflow（95 玩法） | ✅ | ✅ |
| test:offline（本地） | ✅ | ✅ |
| test:play（五画像） | ✅ 全结局* | ✅ 全结局，**0 控制台错误** |

\* round3 的 test:play 每画像报 5 条控制台错误——**已排查定性**：串行复跑 0、
并行复跑 0（两次），归因为冷缓存下五上下文并发打满单进程测试 HTTP 服务的瞬时
资源加载失败（环境抖动，非产品缺陷）；为此给套件补了「错误非空打印全文」增强。

## 3. 线上核验（任务 3）

预热：两次 curl 200（本次未触发 Free 唤醒页）。

| 检查 | 结果 |
|---|---|
| /VERSION | 3.4.47→3.4.48 ✅ |
| HSTS | `max-age=31536000; includeSubDomains` ✅ |
| Permissions-Policy | geolocation/microphone/camera 全禁 ✅ |
| COOP / CORP | same-origin / same-origin ✅ |
| X-Content-Type-Options / Referrer-Policy | nosniff / strict-origin-when-cross-origin ✅ |
| 首页缓存 | `cache-control: no-store` ✅ |
| 版本化 JS | `public, max-age=31536000, immutable` + gzip ✅ |
| 首页 gzip | ✅ |
| 未知路径 / 缺失静态 | 均 404（不再 SPA 兜底）✅ |
| robots.txt | 200 text/plain，含 Sitemap 指向 ✅ |
| sitemap.xml | 200 **application/xml**（v3.4.47 MIME 修复生效）✅ |
| BASE_URL 线上离线端到端 | 通过；SW_TAKEOVER_MS=2037 ✅ |
| CSP（v3.4.48） | meta 在位；sw-register.js 200 immutable；首页 0 内联脚本 ✅ |
| 功能冒烟 | 首访性能探针三次：引擎就绪即 `__game` 可用、标题正常（含 CSP 下无一条违规报错）✅ |

## 4. P1：CSP 基线（已完成，v3.4.48）

- index.html 末尾 inline `<script>`（SW 注册）**原样外置**为 `js/sw-register.js`
  （逻辑一字未改；置于 engine.js 之前以满足「engine 最后加载」契约）
- 新增 CSP meta：`default-src 'self'; script-src 'self'`（零内联脚本）；style 保留
  `'unsafe-inline'`（首屏关键 CSS 与浮层内联样式依赖）；`img/media/connect` 含 `blob:`
  （页面侧媒体缓存 blob 直供、导出下载）；`object-src 'none'; base-uri/form-action 'self'`
- frame-ancestors 无法经 meta 生效——已由 nginx COOP/CORP 承担（注释说明）
- sw-register.js 纳入 SW 预缓存（一一对应契约）
- **暗雷排查**：全库无内联事件属性 / `javascript:` 伪协议 / `eval`——script-src 'self' 无坑
- 回归：契约 54/54 + 全矩阵 10/10 + 五画像 0 控制台错误（CSP 未拦任何合法路径）

## 5. P2：首访性能（独立测量，结论=无需改动）

线上三次全新 context 实测（v3.4.48）：

| 次 | DCL | 引擎就绪 | 请求 | 体积 |
|---|---|---|---|---|
| 1 | 296ms | 372ms | 23 | 0.33MB |
| 2 | 267ms | 334ms | 23 | 0.33MB |
| 3 | 328ms | 387ms | 23 | 0.33MB |

v3.4.46 的「SW 首装只预缓存核心、字体/图标后台预热」已把首访做到亚秒级可交互、
三分之一 MB——**无进一步动作**（注：测量点在盒上，公网用户会加一跳 RTT）。

## 6. 待用户拍板（不擅自处理）

1. **git push**：需要新的 AtomGit PAT（旧 token 401）。本机已有提交待推：
   `6a75cdd`（v3.4.48 CSP）+ playtest 增强提交。GitHub/GitCode 镜像同推。
2. **LICENSE**：仓库尚无 LICENSE 文件；NOTICE.md 已列 BGM(CC BY 4.0)/SFX(CC0)/字体(OFL)，
   **CG 与立绘的授权待你确认**（AI 生成物的商用授权口径由你定）。
3. 交接文档 §4 若还有本消息未覆盖的 P1/P2 细节，请把 HANDOFF-gayme.md 发我或告知路径。

## 7. 环境限制与未验证项（如实声明）

- `/workspace/HANDOFF-gayme.md`、原 `/workspace/qa-results/` 在本机不存在（云机路径）——
  已按任务消息中的明示要求执行，报告路径适配为仓库内 `qa-results/`
- WebKit/Safari 内核未纳入矩阵（上移动渠道前建议真机过一遍）
- defects 的「离线可启动」项在本地测试环境仍走明示跳过分支（语义已由
  不设跳过的 offline 套件 + 线上 BASE_URL 离线双覆盖）
- 测量与线上验证均在盒侧完成；未从公网异地视角测延迟
