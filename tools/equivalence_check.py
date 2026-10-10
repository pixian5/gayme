#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""迁移等价性校验：对比「迁移前的 engine.js（git 旧版本）」与「迁移后的 games 文件」。

对每个玩法：取旧函数体 → 剥离已知被改写的样板行 → currentNodeId 归一化为 nodeId →
逐行（按去空白归一化）在新 games 文件中查找。未匹配行即潜在行为差异，需人工确认。

用法：python3 tools/equivalence_check.py <旧engine.js路径> <games文件> <func1> [func2 ...]
"""

import re
import sys


def extract(lines, func_name):
    sig = None
    for i, l in enumerate(lines):
        if re.match(r"^  function %s\(" % re.escape(func_name), l):
            sig = i
            break
    if sig is None:
        raise SystemExit(f"未找到 {func_name}")
    for i in range(sig + 1, len(lines)):
        if lines[i] == "  }":
            return lines[sig:i + 1]
    raise SystemExit(f"{func_name} 无结束")


# 已知被改写的样板行（整行正则，strip 后匹配）
BOILERPLATE = [
    r"^function run\w+\(.*currentNodeId\) \{$",
    r"^}$",
    r"^el\.dialogBox\.classList\.add\(\"hidden\"\);$",
    r"^const layer = document\.createElement\(\"div\"\);$",
    r"^layer\.className = \"[\w-]+-layer\"; ?layer\.id = \"[\w-]+-layer\";$",
    r"^layer\.className = \"[\w-]+-layer\";$",
    r"^layer\.id = \"[\w-]+-layer\";$",
    r"^document\.getElementById\(\"game\"\)\.appendChild\(layer\);$",
    # 结果面板
    r"^const reading = document\.createElement\(\"div\"\);$",
    r"^reading\.className = \"[\w-]+-reading\";$",
    r"^reading\.innerHTML = `.*`;$",
    r"^reading\.querySelector\(\"\.[\w-]+-reading\"\)$",
    r"^reading\.querySelector\(\"\.[\w-]+-reading-close\"\)\..*$",
    r"^reading\.remove\(\);$",
    r"^layer\.appendChild\(reading\);$",
    r"^const node = SCRIPT\[currentNodeId\];$",
    r"^const jumpTo = \w+\.next \|\| \(node && node\.next\);$",
    r"^if \(jumpTo\) gotoNode\(jumpTo\);$",
    # 效果块（finish() 等价接管）
    r"^if \(\w+\.add\) \{ applyAdd\(\w+\.add\); updateHeartBar\(\); \}$",
    r"^if \(\w+\.personality\) \{$",
    r"^for \(const dim in \w+\.personality\) Saves\.addPersonality\(dim, \w+\.personality\[dim\]\);$",
    r"^if \(\w+\.memory\) \{$",
    r"^if \(!Saves\.isMemoryUnlocked\(\w+\.memory\.id\)\) \{$",
    r"^Saves\.saveMemory\(\w+\.memory\.id, \w+\.memory\.text\);$",
    r"^flashHint\(`✦ 新记忆：\$\{\w+\.memory\.title\}`\);$",
    # MutationObserver（onCancel 接管；清理主体行不在剥离清单里，必须能在新文件找到）
    r"^(const|let)? ?mo = new MutationObserver\(\(\) => \{$",
    r"^mo = new MutationObserver\(\(\) => \{$",
    r"^if \(!document\.body\.contains\(layer\)\) \{$",
    r"^}$",
    r"^}\);$",
    r"^mo\.observe\(document\.getElementById\(\"game\"\), \{ childList: true \}\);$",
    r"^mo\.disconnect\(\);$",
    r"^if \(mo\) mo\.disconnect\(\);$",
    r"^let mo = null;$",
    r"^layer\.remove\(\);$",
    r"^reading\.innerHTML = `<div class=.*$",
    r"^<div class=\"[\w-]+-reading-text\">.*$",
    r"^<button class=\"[\w-]+-reading-close\">.*$",
    # GameKit 化后的固定新增
    r"^const shell = createShell\(.*$",
    r"^const layer = shell\.layer;$",
    r"^shell\.finish\(\{$",
    r"^shell\.finish\(.*\);$",
    r"^}\);$",
    r"^label: .*$",
    r"^text: .*$",
    r"^add: \w+\.add,$",
    r"^personality: \w+\.personality,$",
    r"^memory: \w+\.memory,$",
    r"^record: \(\) => .*$",
    r"^next: \w+\.next,$",
]


def main():
    old_path, games_path, *funcs = sys.argv[1:]
    old_lines = open(old_path, encoding="utf-8").read().split("\n")
    new_text = open(games_path, encoding="utf-8").read()
    new_line_set = {re.sub(r"\s+", " ", l.strip()) for l in new_text.split("\n")}

    # 新文件整体禁用标识符扫描（引擎内部符号在 games 文件中不可达）
    forbidden = []
    for i, l in enumerate(new_text.split("\n"), 1):
        if re.search(r'\b(applyAdd|updateHeartBar|gotoNode|applySet|setScene|renderCharacters|typewriter)\s*\(', l) or re.search(r'\bstate\.', l):
            forbidden.append(f"L{i}: {l.strip()[:120]}")
    if forbidden:
        print("!! 新文件存在引擎内部符号引用（运行时将 ReferenceError）:")
        for f in forbidden:
            print(f"    ! {f}")

    total_unmatched = 0
    for fn in funcs:
        body = extract(old_lines, fn)
        body_text = "\n".join(body)

        # 先摘出 record 语句（可能跨多行）做定向比对，再对剩余行做逐行检查
        extra_problems = []
        rec_spans = []
        for m in re.finditer(r"[ ]{6}(Saves\.save\w+\(currentNodeId.*?\));\n", body_text, re.S):
            stmt = re.sub(r"\s+", " ", m.group(1)).replace("currentNodeId", "nodeId")
            rec_spans.append((m.start(), m.end()))
            flat_new = re.sub(r"\s+", " ", new_text)
            # record 语句既可以是 finish 的 record 属性，也可以原样留在函数体内（顺序不变）
            if f"record: () => {stmt}," not in flat_new and stmt not in flat_new:
                extra_problems.append(f"record 不一致: {stmt[:120]}")
        for s, e in sorted(rec_spans, reverse=True):
            body_text = body_text[:s] + body_text[e:]

        unmatched = []
        for ln in body_text.split("\n"):
            norm = re.sub(r"\s+", " ", ln.strip())
            if not norm:
                continue
            if any(re.match(p, norm) for p in BOILERPLATE):
                continue
            norm = norm.replace("currentNodeId", "nodeId")
            if norm not in new_line_set:
                unmatched.append(norm)

        title_m = re.search(r'reading\.innerHTML = `<div class="[\w-]+-reading-title">(.*?)</div>', body_text, re.S)
        if title_m:
            expr = re.sub(r"\s+", " ", title_m.group(1)).strip()
            if f"label: `{expr}`" not in new_text:
                extra_problems.append(f"label 不一致: {expr[:120]}")
        text_m = re.search(r'reading-text">(.*?)</div>', body_text, re.S)
        if text_m:
            expr = re.sub(r"\s+", " ", text_m.group(1)).strip()
            if f"text: `{expr}`" not in new_text:
                extra_problems.append(f"text 不一致: {expr[:120]}")

        status = "OK " if not unmatched and not extra_problems else "DIFF"
        print(f"[{status}] {fn}: {len(body)} 行, 未匹配 {len(unmatched)}, 定向问题 {len(extra_problems)}")
        for u in unmatched:
            print(f"    ? {u[:150]}")
        for p in extra_problems:
            print(f"    ! {p}")
        total_unmatched += len(unmatched) + len(extra_problems)
    print(f"\n合计问题行: {total_unmatched}")


if __name__ == "__main__":
    main()
