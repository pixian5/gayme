#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""玩法迁移转换器：把 engine.js 里的 runXxx 标准模板玩法转换为 GameKit.register 形态。

用法：python3 tools/migrate_games.py <spec.json>
spec.json 形如：
[
  { "type": "rain", "func": "runRain", "file": "nature", "fileTitle": "自然天象玩法集", "cn": "听雨节奏" },
  ...
]

转换规则（与 v2.8.4 第 1 批手工迁移完全一致的等价变换）：
  1. 函数签名 runXxx(cfg, currentNodeId) → register("<type>", function (cfg, nodeId))
  2. 序言（dialogBox 隐藏 / layer 创建）→ createShell({ kind, prefix, nodeId, onCancel })
  3. 效果块（record / add / personality / memory）→ shell.finish({ record, add, personality, memory, ... })
  4. 手写结果面板（<prefix>-reading）→ shell.finish 的 label / text 属性
  5. MutationObserver 清理 → createShell 的 onCancel 钩子
  6. document.getElementById("game").appendChild(layer) → createShell 内部挂载
  7. currentNodeId → nodeId

任何一处样板与预期形态不符，该玩法会被列入 MANUAL 清单且不写入任何文件（严格模式，宁缺毋滥）。
"""

import json
import re
import sys


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def extract_function(lines, func_name):
    """返回 (doc_comment_lines, body_lines, start_idx, end_idx)。end 为函数结束 '  }' 行的下一行。"""
    sig_idx = None
    for i, l in enumerate(lines):
        if re.match(r"^  function %s\(" % re.escape(func_name), l):
            sig_idx = i
            break
    if sig_idx is None:
        return None
    # 文档注释：向上收集连续的注释行（跳过空行）
    j = sig_idx - 1
    while j >= 0 and lines[j].strip() == "":
        j -= 1
    doc = []
    if j >= 0 and lines[j].rstrip().endswith("*/"):
        k = j
        while k >= 0 and not lines[k].lstrip().startswith("/*"):
            k -= 1
        doc = lines[k:j + 1]
    # 函数体：到第一个恰为 "  }" 的行为止
    end = None
    for i in range(sig_idx + 1, len(lines)):
        if lines[i] == "  }":
            end = i + 1
            break
    if end is None:
        raise RuntimeError(f"{func_name}: 找不到函数结束")
    return doc, lines[sig_idx:end], sig_idx, end


PROLOGUE_HIDDEN = '    el.dialogBox.classList.add("hidden");'


def transform(func_name, type_name, doc, body, flags):
    """把单个函数体转换为 register 块。失败抛 ValueError（附带原因）。"""
    text = "\n".join(body) + "\n"

    # ---- 1. 签名 ----
    m = re.match(r"^  function \w+\((\w+), currentNodeId\) \{\n", text)
    if not m:
        raise ValueError("签名不是 (cfg, currentNodeId) 形态")
    param = m.group(1)
    text = re.sub(r"^  function \w+\((\w+), currentNodeId\) \{\n",
                  '  register("%s", function (\\1, nodeId) {\n' % type_name, text, count=1)

    # ---- 2. 序言 ----
    if PROLOGUE_HIDDEN + "\n" not in text:
        raise ValueError("缺少 dialogBox 隐藏序言行")
    text = text.replace(PROLOGUE_HIDDEN + "\n", "", 1)

    m = re.search(r'    const layer = document\.createElement\("div"\);\n'
                  r'    layer\.className = "([\w-]+)-layer";\n'
                  r'(?:    layer\.id = "[\w-]+-layer";\n|    layer\.className = "[\w-]+-layer"; layer\.id = "[\w-]+-layer";\n)',
                  text)
    if not m:
        raise ValueError("layer 创建序言不符（className/id）")
    kind = m.group(1)
    shell_indent = "    "
    shell = None  # 稍后在 observer 解析后填充 onCancel
    text = text[:m.start()] + "@@SHELL@@" + text[m.end():]

    # ---- 3. 结果面板 ----
    m = re.search(
        r'[ ]{6}const reading = document\.createElement\("div"\);\n'
        r'[ ]{6}reading\.className = "([\w-]+)-reading";\n'
        r'[ ]{6}reading\.innerHTML = `<div class="[\w-]+-reading-title">(.*?)</div>\n\s*'
        r'<div class="[\w-]+-reading-text">(.*?)</div>\n\s*'
        r'<button class="[\w-]+-reading-close">继续</button>`;\n'
        r'[ ]{6}reading\.querySelector\("\.[\w-]+-reading-close"\)\.(?:onclick|addEventListener\("click"\))[^=]*=?\s*\(? ?\(\) => \{\n'
        r'(.*?)\n[ ]{6}\};\n'
        r'[ ]{6}layer\.appendChild\(reading\);\n',
        text, re.S)
    if not m:
        raise ValueError("结果面板形态不符")
    prefix = m.group(1)
    title_expr = re.sub(r"\s+", " ", m.group(2)).strip()
    text_expr = re.sub(r"\s+", " ", m.group(3)).strip()
    close_body = m.group(4)

    # 关闭处理必须是标准跳转：reading.remove / layer.remove / SCRIPT 查表 / matched.next 覆盖
    mm = re.match(
        r'^(?:[ ]{8}reading\.remove\(\);\n)?'
        r'[ ]{8}layer\.remove\(\);\n'
        r'[ ]{8}const node = SCRIPT\[currentNodeId\];\n'
        r'[ ]{8}const jumpTo = (\w+)\.next \|\| \(node && node\.next\);\n'
        r'[ ]{8}if \(jumpTo\) gotoNode\(jumpTo\);$',
        close_body, re.S)
    if not mm:
        raise ValueError("结果面板关闭逻辑不是标准跳转（matched.next || node.next）")
    matched_var = mm.group(1)

    panel_start, panel_end = m.start(), m.end()

    # ---- 4. 效果块（紧贴结果面板之前的 record / add / personality / memory）----
    head = text[:panel_start]
    eff = {"record": None, "add": None, "personality": None, "memory": None}

    def strip_tail(pattern, flags2=0):
        nonlocal head
        mm2 = re.search(pattern + r"\Z", head, flags2)
        if not mm2:
            return False
        head = head[:mm2.start()]
        return mm2

    m_mem = strip_tail(
        r'[ ]{6}if \((\w+)\.memory\) \{\n'
        r'[ ]{8}if \(!Saves\.isMemoryUnlocked\(\1\.memory\.id\)\) \{\n'
        r'[ ]{10}Saves\.saveMemory\(\1\.memory\.id, \1\.memory\.text\);\n'
        r'[ ]{10}flashHint\(`✦ 新记忆：\$\{\1\.memory\.title\}`\);\n'
        r'[ ]{8}\}\n'
        r'[ ]{6}\}\n')
    if m_mem:
        eff["memory"] = m_mem.group(1)

    m_pers = strip_tail(
        r'[ ]{6}if \((\w+)\.personality\) \{\n'
        r'[ ]{8}for \(const dim in \1\.personality\) Saves\.addPersonality\(dim, \1\.personality\[dim\]\);\n'
        r'[ ]{6}\}\n')
    if m_pers:
        eff["personality"] = m_pers.group(1)

    m_add = strip_tail(
        r'[ ]{6}if \((\w+)\.add\) \{ applyAdd\(\1\.add\); updateHeartBar\(\); \}\n')
    if m_add:
        eff["add"] = m_add.group(1)

    # 记录行：可能多行（参数跨行），按括号配平吞并
    rec_lines = []
    while True:
        mm3 = re.search(r'([ ]{6}Saves\.save\w+\(currentNodeId[^\n]*\n)\Z', head)
        if not mm3:
            mm3 = re.search(r'([ ]{6}Saves\.save\w+\(currentNodeId[^\n]*\)\n)\Z', head)
            if not mm3:
                break
        cand = mm3.group(1)
        trial = head[:mm3.start()] + cand
        # 合并后括号应配平才算完整语句
        seg = "".join(rec_lines + [cand])
        if seg.count("(") == seg.count(")"):
            rec_lines.insert(0, cand)
            head = head[:mm3.start()]
            # 若配平，结束
            if cand.count("(") == cand.count(")"):
                break
        else:
            rec_lines.insert(0, cand)
            head = head[:mm3.start()]
    if rec_lines:
        eff["record"] = "".join(rec_lines)

    # 一致性：matched 变量名统一
    vars_used = {v for v in (eff["add"], eff["personality"], eff["memory"]) if v} | {matched_var}
    if len(vars_used) > 1:
        raise ValueError(f"matched 变量名不一致: {vars_used}")

    text = head + "@@FINISH@@" + text[panel_end:]

    # ---- 5. MutationObserver → onCancel ----
    cleanup = None
    m_obs = re.search(
        r'[ ]{4}(?:const |let )?mo = new MutationObserver\(\(\) => \{\n'
        r'[ ]{6}if \(!document\.body\.contains\(layer\)\) \{\n'
        r'((?:[ ]{8}.*\n)+?)'
        r'[ ]{6}\}\n'
        r'[ ]{4}\}\);\n'
        r'[ ]{4}mo\.observe\(document\.getElementById\("game"\), \{ childList: true \}\);\n',
        text)
    if m_obs:
        cleanup = m_obs.group(1)
        text = text[:m_obs.start()] + text[m_obs.end():]
    # 移除 let mo = null; 声明
    text = re.sub(r'[ ]{4}let mo = null;\n', "", text)
    text = re.sub(r'[ ]{4}let mo;\n', "", text)

    # ---- 6. 挂载行 ----
    if '    document.getElementById("game").appendChild(layer);\n' not in text:
        raise ValueError("缺少 appendChild(layer) 挂载行")
    text = text.replace('    document.getElementById("game").appendChild(layer);\n', "", 1)

    # ---- 7. currentNodeId → nodeId ----
    text = text.replace("currentNodeId", "nodeId")

    # ---- 8. 函数收尾：register() 调用需要把原函数的 "  }" 闭合为 "  });" ----
    tlines = text.rstrip("\n").split("\n")
    if tlines[-1] != "  }":
        raise ValueError(f"函数收尾不是 '  }}' 而是: {tlines[-1]!r}")
    tlines[-1] = "  });"
    text = "\n".join(tlines) + "\n"

    # ---- 组装 shell ----
    if cleanup:
        clean_body = "".join(
            l[2:] if l.startswith("  ") else l for l in cleanup.splitlines(keepends=True)
        )
        clean_body = "\n".join(
            l for l in clean_body.splitlines()
            if "mo.disconnect" not in l and not re.match(r"\s*mo = null;", l)
        )
        clean_body = "\n".join(l for l in clean_body.splitlines() if l.strip()) + "\n"
        shell = (f'{shell_indent}const shell = createShell({{ kind: "{kind}", prefix: "{prefix}", nodeId,\n'
                 f'{shell_indent}  onCancel: () => {{\n'
                 + "".join(clean_body) +
                 f'{shell_indent}  }} }});\n')
    else:
        if cleanup is None and re.search(r'\b(requestAnimationFrame|setInterval|setTimeout|window\.addEventListener)', text):
            flags.append("注意：无 MutationObserver 但含 rAF/定时器/窗口监听——onCancel 为空，请人工确认")
        shell = f'{shell_indent}const shell = createShell({{ kind: "{kind}", prefix: "{prefix}", nodeId }});\n'
    shell += f'{shell_indent}const layer = shell.layer;\n'

    # ---- 组装 finish ----
    props = [f'        label: `{title_expr}`,' if title_expr else None,
             f'        text: `{text_expr}`,' if text_expr else None]
    if eff["add"]:
        props.append(f'        add: {eff["add"]}.add,')
    if eff["personality"]:
        props.append(f'        personality: {eff["personality"]}.personality,')
    if eff["memory"]:
        props.append(f'        memory: {eff["memory"]}.memory,')
    if eff["record"]:
        rec = eff["record"].rstrip()
        if rec.count("(") != rec.count(")"):
            raise ValueError("record 语句括号不配平")
        rec_stmt = rec.strip().rstrip(";").replace("currentNodeId", "nodeId")
        props.append(f'        record: () => {rec_stmt},')
    if matched_var:
        props.append(f'        next: {matched_var}.next,')
    props = [p for p in props if p]
    finish = "      shell.finish({\n" + "\n".join(props) + "\n      });\n"

    text = text.replace("@@SHELL@@", shell, 1)
    text = text.replace("@@FINISH@@", finish, 1)

    # ---- 校验残留 ----
    for bad in ["MutationObserver", "mo.observe", "reading", "layer.remove()",
                'el.dialogBox', "appendChild(layer)"]:
        if bad in text:
            raise ValueError(f"转换后仍残留: {bad}")
    if "currentNodeId" in text:
        raise ValueError("转换后仍残留 currentNodeId")

    # 括号配平
    if text.count("{") != text.count("}"):
        raise ValueError(f"花括号不配平 {{={text.count('{')} }}={text.count('}')}")

    block = "\n".join(doc) + "\n" + text
    return block, param, kind, prefix


def remove_from_engine(engine, specs):
    """从 engine.js 删除函数（含文档注释）与标准分发分支，返回新文本与删除统计。"""
    lines = engine.split("\n")
    removed_funcs = []
    # 从后往前删，避免行号漂移
    spans = []
    for spec in specs:
        r = extract_function(lines, spec["func"])
        if r is None:
            raise RuntimeError(f'{spec["func"]}: engine.js 中未找到')
        doc, body, s, e = r
        # 连带函数上方的空行
        while s > 0 and lines[s - 1].strip() == "":
            s -= 1
        spans.append((s, e, spec["func"]))
    for s, e, name in sorted(spans, reverse=True):
        del lines[s:e]
        removed_funcs.append(name)
    engine2 = "\n".join(lines)

    # 删除标准分发分支
    removed_branches = 0
    for spec in specs:
        t = spec["type"]
        f = spec["func"]
        pat = re.compile(
            r"\n    // [^\n]*\n"
            r"    if \(node\." + t + r"\) \{\n"
            r"      setScene\(node\.bg\);\n"
            r"      renderCharacters\(node\);\n"
            r"      " + f + r"\(node\." + t + r", nodeId\);\n"
            r"      updateDayBar\(node\);\n"
            r"      updateHeartBar\(\);\n"
            r"      return;\n"
            r"    \}\n"
        )
        engine2, n = pat.subn("\n", engine2)
        removed_branches += n
        if n != 1:
            print(f"警告: 分发分支 {t} 匹配 {n} 次")
    return engine2, removed_funcs, removed_branches


def main():
    spec_path = sys.argv[1]
    specs = json.load(open(spec_path, encoding="utf-8"))

    engine = read("js/engine.js")
    games_files = sorted({s["file"] for s in specs})
    if len(games_files) != 1:
        raise SystemExit("本工具一次只支持写入一个 games 文件")
    target = f"js/games/{games_files[0]}.js"
    spec0 = specs[0]

    converted, manual = [], []
    blocks = []
    for spec in specs:
        flags = []
        lines = engine.split("\n")
        r = extract_function(lines, spec["func"])
        if r is None:
            manual.append((spec["type"], "engine.js 中未找到函数"))
            continue
        doc, body, _, _ = r
        try:
            block, param, kind, prefix = transform(spec["func"], spec["type"], doc, body, flags)
            size_before = len("\n".join(body).splitlines())
            converted.append((spec, size_before, len(block.splitlines()), kind, prefix, flags))
            blocks.append(block.rstrip("\n"))
        except ValueError as e:
            manual.append((spec["type"], str(e)))

    print(f"转换成功 {len(converted)} / {len(specs)}")
    for spec, before, after, kind, prefix, flags in converted:
        extra = f"  [{'; '.join(flags)}]" if flags else ""
        print(f"  {spec['type']:14s} {spec['func']:16s} {before:4d} → {after:4d} 行  kind={kind} prefix={prefix}{extra}")
    for t, why in manual:
        print(f"  MANUAL {t}: {why}")
    if manual:
        print("存在手工项，未写入任何文件。")
        return

    # 写 games 文件
    import os
    existing = os.path.exists(target)
    if existing:
        cur = read(target)
        idx = cur.rstrip().rfind("})();")
        cur = cur[:idx].rstrip("\n") + "\n\n" + "\n\n".join(blocks) + "\n\n})();\n"
        write(target, cur)
    else:
        cn_names = " / ".join(s.get("cn", s["type"]) for s in specs)
        header = (
            f"/* ========================================\n"
            f"   樱时信笺 · {spec0.get('fileTitle', '玩法集')} (games/{games_files[0]}.js) v{spec0['version']}\n"
            f"   —— 从 engine.js 迁出的 {len(specs)} 个玩法：\n"
            f"      {cn_names}\n"
            f"   玩法只负责交互主体与判定；浮层外壳、结果面板、生命周期与跳转统一交给 GameKit（js/gamekit.js）。\n"
            f"   依赖：GameKit、Saves（记录）、SCRIPT（剧情跳转，经 GameKit 宿主桥）\n"
            f"   ======================================== */\n"
            f"(function () {{\n"
            f'  "use strict";\n\n'
            f'  const {{ register, createShell, flashHint }} = window.GameKit;\n\n'
        )
        write(target, header + "\n\n".join(blocks) + "\n\n})();\n")

    # 改写 engine.js
    engine2, removed_funcs, removed_branches = remove_from_engine(engine, specs)
    write("js/engine.js", engine2)
    print(f"engine.js: 删除 {len(removed_funcs)} 个函数 / {removed_branches} 个分发分支")
    print(f"写入 {target}")


if __name__ == "__main__":
    main()
