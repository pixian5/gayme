# v3.2.3 部署链路去 GitHub CI 与经验沉淀（Doubao）

日期：2026-10-23 00:17 · 模型：Doubao · 版本：v3.2.3

## 背景

用户明确：**不使用 GitHub 进行 CI/CD**（GitHub Actions 的 e2e 曾在 runner 下载 chromium
卡 17 分钟；且用户本地无流量，不希望任何不必要的下载）。同时要求：**push 后不阻塞等待 CI**
（"跑不完你该干啥干啥去"）。用户确认"部署没问题"——接受方案①：本地测试 + 服务器自动部署。

## 一、改动清单

### 1. 移除 GitHub Actions（4 个 workflow 全部删除）

- 删除 `.github/workflows/`：ci.yml / e2e.yml / deploy-pages.yml / deploy-server.yml
- 影响：GitHub 不再自动跑测试、不再自动部署 Pages 与服务器；GitHub 仓库降级为**纯备份**
- GitHub Pages（pixian5.github.io/gayme）停留在最后一次部署（v3.2.2），不再自动更新
- 恢复方法：从 git 历史找回对应 yml 放回 `.github/workflows/` 即可

### 2. 服务器自动部署（root cron，每 3 分钟）

服务器侧一次性配置（已完成，可迁移）：

| 项 | 值 |
|---|---|
| 仓库 | `/opt/gayme-deploy`（首次自动 clone，gitee 主源，失败回退 github） |
| 部署脚本 | `/usr/local/bin/sakura-deploy.sh`（root，chmod +x） |
| cron | `*/3 * * * * bash /usr/local/bin/sakura-deploy.sh`（root crontab） |
| 部署目标 | `/var/www/sakura`（nginx 站点根，rsync -a --delete） |
| 版本校验 | 部署后 curl https://oh.sbbz.tech:8080/ 比对 VERSION |
| 日志 | `/var/log/sakura-deploy.log` |

脚本逻辑要点：
- 仓库不存在→自动 clone；fetch 失败自动切 github 备源再拉，之后恢复 gitee 主源
- **首次部署判定**：clone 后 HEAD 与 origin/main 相同（同一次提交），若只看
  "有更新才部署" 会跳过首次部署——用 `/var/run/sakura-last-deploy` 记录已部署 commit，
  区分"无更新"与"首次未部署"
- 脚本放 `/usr/local/bin`（仓库目录外），避免被 git pull 覆盖

### 3. 本地流程调整为唯一门槛

- 测试：`npm test`(32) + `npm run test:syntax` + `npm run test:e2e` + `git diff --check`
- 发版：改代码 → bump_version.py 3.2.3 → 测试 → 中文 commit → push 双远程
  （gitee origin + github 备份）→ 服务器 cron 3 分钟内自动部署 → 验证线上版本
- **不阻塞等 CI**：push 完即交付，服务器部署结果异步确认

### 4. 新增根目录「经验」文件夹

按用户新规则，把 docs 全量文档分类沉淀为 4 篇简洁经验（docs 不一定都对，以实测为准）：

| 文件 | 类别 |
|---|---|
| 经验/发布与部署经验.md | 双源→单源、服务器一键配置、cron 自动部署、手动回退、避坑 |
| 经验/版本与文档规范经验.md | 版本规则、bump 工具、docs/README/文档索引/经验规范、流程纪律 |
| 经验/工程避坑经验.md | 行号漂移、Unicode 码位、defer 正则、e2e 端口、字体覆盖、ssh 引号 |
| 经验/内容开发经验.md | 剧情基线、loopText 多周目、合成回忆、叙事一致性、字体 UI |

## 二、验证

- 服务器脚本首次运行：clone 760980b → rsync → 线上 v3.2.2 校验通过 ✓
- 脚本二次运行（无更新）：退出 0，不重复部署 ✓
- cron 已挂载：`sudo crontab -l` 显示 `*/3 * * * * bash /usr/local/bin/sakura-deploy.sh` ✓
- 本地全量测试（v3.2.3）：见验证结果（npm test / test:syntax / test:e2e / diff --check）
- 推送后等 cron 自动部署 → 线上应为 v3.2.3 · Demo

## 三、经验与教训

1. **自动部署脚本不能放仓库目录内**（会被 git pull 覆盖），放 /usr/local/bin
2. **首次部署要单独判定**：clone 后 HEAD=origin/main，"有更新才部署"会跳过首次
3. **服务器 cron 用 root**：避免 /opt 写权限与 git "dubious ownership"（root clone 的仓库
   ubuntu 用户访问会报 dubious ownership）
4. **ssh 批量命令输出为空多半是引号嵌套**：本地 shell 吃掉引号，改 scp 脚本文件再执行
5. GitHub Actions 与用户诉求冲突时，用户最新决定优先（AGENTS.md 旧规则"服务器程序要
   GitHub Actions 自动部署"已被新决定覆盖，机制等价换成服务器 cron）

## 四、后续

- 恢复 GitHub Pages 自动部署：git 历史找回 deploy-pages.yml 放回 .github/workflows/
- 如需 gitee webhook 实时部署（cron 3 分钟延迟可接受则不需要）：gitee 仓库设置 →
  WebHooks → 指向服务器监听脚本
