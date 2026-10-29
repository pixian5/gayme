# 部署链路修复：服务器迁移、GitHub 主源与手动部署脚本（DeepSeek）

日期：2026-10-30 03:45 · 版本：v3.4.29（本轮只改运维链路，不发版）

## 一、现象

- 本地已推送 v3.4.28 / v3.4.29 到 GitHub，线上 `https://oh.sbbz.tech:8080/` 仍是 **v3.4.25**，
  `/assets/portraits/*.webp` 一律 404。
- `bash tools/deploy.sh` 失败：`tar: assets/portraits：无法 mkdir: 权限不够`，且脚本里写的
  服务器 IP 是 `18.191.80.90`，DNS 解析 `oh.sbbz.tech` 已变成 `18.225.92.148`（AWS 新实例）。

## 二、根因（三条独立问题）

1. **服务器换过 IP**：`18.191.80.90:2424` 无法建 SSH（banner exchange timeout）；
   新地址 `18.225.92.148:2424`（ubuntu，密钥不变）可登录。
2. **自动部署主源是 gitee**：`/usr/local/bin/sakura-deploy.sh` 的 `GITEE_URL=gitee.com/ibjxk/gayme`，
   而本轮只推了 GitHub → cron 每 3 分钟拉到的是旧提交，线上停在 v3.4.25。
3. **手动 deploy.sh 与 v3.3.21 原子布局不兼容**：`/var/www/sakura` 已是指向
   `/var/www/releases/<sha>` 的 symlink 且属 root，ubuntu 直写必然 `权限不够`。

## 三、处置

| 项 | 操作 |
|---|---|
| 服务器脚本 | `/usr/local/bin/sakura-deploy.sh`：`GITEE_URL` 改为 `https://github.com/pixian5/gayme.git`（备份 `sakura-deploy.sh.bak-20261030`）；此后 cron 直接以 GitHub 为主源 |
| git 安全目录 | `sudo git config --global --add safe.directory /opt/gayme-deploy`（root 拉取仓库的 dubious ownership） |
| 立即部署 | 手动 `sudo git -C /opt/gayme-deploy fetch origin main` → 再跑 `sakura-deploy.sh`，原子切到 790f25d |
| 手动脚本 | `tools/deploy.sh`：默认 HOST 更新为 18.225.92.148；先 `readlink -f /var/www/sakura` 解析实体目录，再用 `sudo -n` 写入；tar 排除 `assets/portraits/*_sample*.jpg` |

## 四、验证（实测）

- `VERSION` = `3.4.29`；`assets/portraits/{shiyu,xiazhi,shen,senior}.webp` 全部 HTTP 200（体积与本地一致）。
- 部署日志：`原子切换 790f25d v3.4.29 → /var/www/sakura（prev: 3f5d2b3）· 部署成功 ✓`。
- 手动脚本重跑一次：`线上版本 v3.4.29 · Demo`，回归通过。

## 五、经验（下次别再踩）

1. **先 `dig oh.sbbz.tech` 再改脚本**：云主机重建后 IP 会变，密钥不变。
2. 线上从 gitee 主源改为 GitHub 后，只需 push GitHub 即自动部署；gitee 仓库未再更新。
3. 手动部署不要直接 `tar -C /var/www/sakura`：那是 symlink 且 root 属主；
   必须 `readlink -f` + `sudo -n`（ubuntu 已配免密 sudo）。
4. 沙箱内 SSH 需走 HTTP 代理：`ProxyCommand nc -X connect -x 127.0.0.1:18080 %h %p`
   （`~/.ssh/config` 里按 IP 配置，直连 TCP 不通）。
