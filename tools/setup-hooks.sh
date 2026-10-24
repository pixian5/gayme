#!/bin/bash
# 新机器 clone 后执行一次：启用本地 pre-push 质量门禁
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "已启用 .githooks（pre-push 自动跑 npm test + syntax + diff --check；PREPUSH_E2E=1 加 e2e）"
