# 上传 gayme 到 GitCode（2026-10-24）

> 模型：Doubao｜时间：2026-10-24 03:47｜类型：操作记录

## 背景

用户询问 gayme 是否已上传 GitCode。此前项目远程只有 Gitee（origin）与 GitHub，未配置 GitCode；本机 git 全局邮箱为 `sbxwn@noreply.gitcode.com`（GitCode 用户 laotongtian / 劳通天），但 GitCode 上无 gayme 仓库。

## 过程

1. **探查**：`git remote -v` 确认无 gitcode 远程；全项目 grep 无 gitcode 记录；keychain 无 gitcode 凭据；curl 探测 `gitcode.com/laotongtian/gayme` 返回 404（仓库不存在），用户主页 200。
2. **登录态判断（重要）**：GitCode 用户主页/项目列表是公开页面，未登录也能看到；判断登录态要看受保护接口。实测 `web-api.gitcode.com/api/v2/groups/user_groups/manageable_namespace` 返回 401 → 确认浏览器**未登录**，交棒用户登录后返回 200。
3. **创建仓库**：GitCode 新建仓库页面为 `https://gitcode.com/create`（`/repos/new`、`/projects/new` 等均 404）。表单填写：名称 gayme、所有者劳通天、路径 gayme、介绍、取消 README/.gitignore/LICENSE 初始化（避免与本地仓库冲突）、公开。
4. **推送**：`git remote add gitcode https://gitcode.com/laotongtian/gayme.git && git push gitcode main`，直接成功（系统凭据可用），88 次提交全量上传。

## 结果

- 仓库：https://gitcode.com/laotongtian/gayme（公开，88 commits，README/语言统计正常）
- 本地新增远程 `gitcode`，与 gitee/github 并列

## 经验沉淀

- **GitCode 新建仓库入口**：网页入口是 `gitcode.com/create`；文档称"右上角新建"，但窄视口下顶部按钮被隐藏，直接访问该 URL 最稳。
- **GitCode 登录判断**：不能凭"能看到用户主页"判断已登录（公开页面）；用受保护 API（manageable_namespace / 创建类接口）的 401/200 判断最可靠。
- **GitCode HTTPS push**：本机 git 系统凭据可用（登录后 keychain 生效），无需额外 PAT。
- **GitCode API**：`api.gitcode.com/api/v5/...` 需要 access_token；`web-api.gitcode.com` 有反爬（418），命令行 curl 直接调不可用，浏览器会话可带 cookie。
- **owner 下拉显示 "-1 请选择"**：`-1` 是个人用户的 namespace id，登录后正常显示"劳通天"，无需手动选组织。
