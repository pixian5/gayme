# origin 固定指向 GitHub（v3.4.35）

> 记录时间：2026-11-01 10:15 · 模型：Auto · 性质：工程规范收口（无玩法改动，版本号按规约同步）

## 一、要求与背景

用户明确要求：**`origin` 始终是 GitHub**，不再作为部署源使用。

此前本机状态（v3.4.34 及以前）为：`origin` = gitee（部署主源）、`github` = GitHub。
虽然 2026-10-29 的文档曾写着「origin 改指 GitHub」，但实际仓库后来又被改回 gitee，
属于命名漂移——两套文档与三种说法并存，换机器时容易推错源。

## 二、执行步骤

```bash
git remote rename origin gitee      # 先腾出 origin 这个名字
git remote rename github origin     # GitHub 接管 origin
git branch -u origin/main main      # 重置 upstream（否则 git push 报 no upstream branch）
```

互换后的验证（三项都要对）：

| 检查 | 命令 | 期望 |
| --- | --- | --- |
| 远程列表 | `git remote -v` | `origin` → github.com/pixian5/gayme；`gitee` → gitee.com/ibjxk/gayme；`gitcode` → gitcode.com |
| 上游跟踪 | `git branch -vv` | `main ... [origin/main]` |
| 配置项 | `git config branch.main.remote` | `origin` |

结果：三项全部符合，本地提交未受影响（`git remote rename` 会自动迁移 remote-tracking 引用）。

## 三、连带自查

- `.githooks/pre-push`：只跑静态测试 / 语法 / `git diff --check`，**不读取远程名**，互换不影响。
- `tools/deploy.sh`：直连服务器 tar 传输 + 版本校验，**不读取远程名**，仅注释提到“push GitHub”。
- 服务器侧 `/usr/local/bin/sakura-deploy.sh` 在服务器自己的仓库里操作，其 remote 配置独立于本机，
  本地改名不影响 cron 拉取（gitee 仍是部署主源）。
- 结论：改名是纯本地行为，唯一影响是**发版时必须显式 `git push gitee main`**，否则线上不更新。

## 四、固化的规约

1. `origin` **永远** = github.com/pixian5/gayme，托管平台（gitee / gitcode）不得占用该名字。
2. 每次发版推三个远程：`git push origin main`（GitHub）+ `git push gitee main`（部署）+ `git push gitcode main`。
3. 三远程一致性用 `git ls-remote --heads origin gitee gitcode` 核对，不看本地 tracking 的缓存值。
4. 线上是否生效用 `curl https://oh.sbbz.tech:8080/VERSION` 判断（cron 约 3 分钟一轮）。

## 五、文档同步

- README「远程仓库与云端测试」表：`origin` 标注为「固定指向 GitHub（硬规约）」，
  gitee 标注「部署主源，发版必须显式推送」；提交规约段同步为 `git push origin main`(GitHub) +
  `git push gitee main` + `git push gitcode main`。
- `经验/发布与部署经验.md`：把「origin 硬约束」升级为**用户明确要求、不得改回**，并补互换后的三项自查。
