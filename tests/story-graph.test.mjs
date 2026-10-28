import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const engineSource = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(source + "\nthis.__out = { SCRIPT, START_NODE, KEYWORDS, COMPOSE_RECIPES, ENDINGS, hasAllGoodEndings, isTrueEndUnlocked };", context);
const { SCRIPT, START_NODE, KEYWORDS, COMPOSE_RECIPES, ENDINGS, isTrueEndUnlocked } = context.__out;
const ids = new Set(Object.keys(SCRIPT));

function collectRefs(value, refs, from) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(item => collectRefs(item, refs, from));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string" && ids.has(child)) refs.push([from, child]);
    collectRefs(child, refs, from);
  }
}

const refs = [];
for (const [id, node] of Object.entries(SCRIPT)) collectRefs(node, refs, id);

function collectNextRefs(value, refs, from) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(item => collectNextRefs(item, refs, from));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "next" && typeof child === "string" && ids.has(child)) refs.push([from, child]);
    collectNextRefs(child, refs, from);
  }
}

test("剧情引用全部指向已定义节点", () => {
  const missing = refs.filter(([, target]) => !SCRIPT[target]);
  assert.deepEqual(missing, []);
});

test("主线和真结局入口可达", () => {
  const roots = [START_NODE, "true_end_entry"];
  const reachable = new Set(roots);
  const queue = roots.slice();
  while (queue.length) {
    const current = queue.shift();
    for (const [from, target] of refs) {
      if (from === current && SCRIPT[target] && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  for (const id of [
    "d1_night_stars", "d6_kite", "d7_firefly", "d8_compass",
    "d9_metronome", "d10_eclipse", "d11_kaleido", "d12_sundial",
    "d13_mosaic", "d14_stele", "d15_chess", "d5_loop_arrival",
    "common_day3_afternoon",
    "common_day5_afternoon"
  ]) assert.equal(reachable.has(id), true, `${id} 不可达`);
});

test("时间回溯有明确的叙事承接", () => {
  assert.equal(SCRIPT.d5_piano.next, "d5_rewind");
  assert.equal(SCRIPT.d5_rewind.timeLoop, true);
  assert.match(SCRIPT.d5_rewind.text, /第 5 日.*第 4 日/);
  assert.equal(SCRIPT.d15_flag.next, "d15_rewind");
  assert.equal(SCRIPT.d15_rewind.timeLoop, true);
  assert.match(SCRIPT.d15_rewind.text, /第 15 日.*第 5 日/);
  assert.equal(SCRIPT.d15_rewind.next, "d5_loop_arrival");
  assert.equal(SCRIPT.d5_loop_choice.choice.options.length, 3);
  assert.deepEqual(
    [...SCRIPT.d5_loop_choice.choice.options].map(option => option.next),
    ["d5_loop_letter", "d5_mimic", "d5_loop_signature"]
  );
  assert.equal(SCRIPT.d5_loop_letter.next, "d5_mimic");
  assert.equal(SCRIPT.d5_loop_signature.next, "d5_mimic");
  assert.match(SCRIPT.d5_loop_arrival.text, /匿名信/);
});

test("星座解读都会经过父母冲突收束", () => {
  const constellation = SCRIPT.d1_night_stars.constellation;
  assert.equal(SCRIPT.d1_night_stars.next, "d1_night_home");
  assert.equal(SCRIPT.d1_night_home.next, "common_day2_morning");
  for (const branch of constellation.constellations) {
    assert.equal(branch.next, "d1_night_home", `${branch.tag} 绕过了父母冲突收束`);
  }
  assert.equal(constellation.fallback.next, "d1_night_home");
});

test("全部结局节点都可达（v3.4.14 契约：ENDINGS 全量 BFS）", () => {
  // 真结局/后日谈入口是运行时门控（标题按钮，通关解锁），无数据边——按既有测试惯例特设为 BFS 根
  const roots = [START_NODE, "true_end_entry", "afterword_entry"];
  const reachable = new Set(roots);
  const queue = roots.slice();
  while (queue.length) {
    const current = queue.shift();
    for (const [from, target] of refs) {
      if (from === current && SCRIPT[target] && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  // 图鉴 id 是结局对象 id（如 shiyu_good），非节点 id（sy_ending_good）——经可达节点的 ending.id 比对
  const reachableEndingIds = new Set(
    [...reachable].map((id) => SCRIPT[id]).filter((n) => n && n.ending).map((n) => n.ending.id)
  );
  const unreachable = ENDINGS.filter((e) => !reachableEndingIds.has(e.id)).map((e) => e.id);
  // ENDINGS 来自 vm 跨 realm，filter 结果原型不同——spread 归一化到主 realm 再比较
  assert.deepEqual([...unreachable], [], `以下结局从入口不可达（引用完整≠可达）：${unreachable.join("、")}`);
});

test("真结局后日谈和明信片分支可达", () => {
  const roots = ["afterword_entry"];
  const reachable = new Set(roots);
  const queue = roots.slice();
  while (queue.length) {
    const current = queue.shift();
    for (const [from, target] of refs) {
      if (from === current && SCRIPT[target] && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  for (const id of [
    "afterword_three", "afterword_postcard", "afterword_stamp", "afterword_4",
    "afterword_signature", "afterword_signature_meet", "afterword_signature_care",
    "afterword_signature_blank", "afterword_reply_arrival", "afterword_reply",
    "afterword_reply_meet", "afterword_reply_release", "afterword_reply_write",
    "afterword_reply_default", "afterword_timeline", "afterword_autumn",
    "afterword_mailbox", "afterword_mailbox_reply", "afterword_mailbox_stay",
    "afterword_mailbox_step", "afterword_mailbox_listen", "afterword_mailbox_default",
    "afterword_mailbox_rules", "afterword_mailbox_rule_sign",
    "afterword_mailbox_rule_ask", "afterword_mailbox_rule_space", "afterword_mailbox_triage", "afterword_wall", "afterword_wall_reflection",
    "afterword_proofread", "afterword_proofread_clean", "afterword_proofread_recheck", "afterword_ending"
  ]) {
    assert.equal(reachable.has(id), true, `${id} 不可达`);
  }
  assert.equal(SCRIPT.afterword_postcard.postcard.max, 2);
  assert.equal(SCRIPT.afterword_postcard.postcard.interpretations.length, 4);
  assert.match(SCRIPT.afterword_postcard.text, /两枚印记/);
  for (const branch of SCRIPT.afterword_postcard.postcard.interpretations) {
    assert.equal(branch.stamps.length, 2);
    assert.equal(branch.next, "afterword_stamp");
  }
  assert.equal(SCRIPT.afterword_postcard.postcard.fallback.next, "afterword_stamp");
  assert.equal(SCRIPT.afterword_4.speaker, "沈屿");
  assert.equal(SCRIPT.afterword_4.next, "afterword_signature");
  assert.equal(SCRIPT.afterword_signature.choice.options.length, 3);
  assert.equal(SCRIPT.afterword_signature_meet.next, "afterword_reply_arrival");
  assert.equal(SCRIPT.afterword_reply.letter.type, "free");
  assert.equal(SCRIPT.afterword_reply.letter.matchings.length, 3);
  assert.equal(SCRIPT.afterword_reply.letter.defaultReply.next, "afterword_reply_default");
  assert.match(SCRIPT.afterword_reply_arrival.text, /新城市打开了一扇窗/);
  for (const id of ["afterword_reply_meet", "afterword_reply_release", "afterword_reply_write", "afterword_reply_default"]) {
    assert.equal(SCRIPT[id].next, "afterword_timeline");
  }
  assert.deepEqual([...SCRIPT.afterword_timeline.timeline.correctOrder], [
    "festival_letter", "school_cleanup", "postcard_reply", "today_reply"
  ]);
  assert.equal(SCRIPT.afterword_timeline.timeline.events.length, 4);
  assert.match(SCRIPT.afterword_timeline.text, /没有倒流/);
  assert.equal(SCRIPT.afterword_timeline.next, "afterword_autumn");
  assert.match(SCRIPT.afterword_autumn.text, /半年后/);
  assert.match(SCRIPT.afterword_autumn.text, /署名和日期/);
  assert.equal(SCRIPT.afterword_mailbox_reply.letter.type, "free");
  assert.equal(SCRIPT.afterword_mailbox_reply.letter.matchings.length, 3);
  assert.equal(SCRIPT.afterword_mailbox_reply.letter.defaultReply.next, "afterword_mailbox_default");
  for (const id of ["afterword_mailbox_stay", "afterword_mailbox_step", "afterword_mailbox_listen", "afterword_mailbox_default"]) {
    assert.equal(SCRIPT[id].next, "afterword_mailbox_rules");
  }
  assert.equal(SCRIPT.afterword_mailbox_rules.choice.options.length, 3);
  for (const id of ["afterword_mailbox_rule_sign", "afterword_mailbox_rule_ask", "afterword_mailbox_rule_space"]) {
    assert.equal(SCRIPT[id].next, "afterword_mailbox_triage");
  }
  assert.match(SCRIPT.afterword_mailbox_rule_sign.text, /匿名信不一样/);
  assert.equal(SCRIPT.afterword_mailbox_triage.triage.notes.length, 3);
  assert.equal(SCRIPT.afterword_mailbox_triage.triage.replies.length, 3);
  assert.equal(JSON.stringify(SCRIPT.afterword_mailbox_triage.triage.correctMapping), JSON.stringify({
    room: "space", step: "step", listen: "listen"
  }));
  assert.equal(SCRIPT.afterword_mailbox_triage.next, "afterword_wall");
  assert.equal(SCRIPT.afterword_wall.wall.notes.length, 4);
  assert.equal(SCRIPT.afterword_wall.wall.bins.length, 3);
  assert.deepEqual(
    Object.fromEntries(SCRIPT.afterword_wall.wall.notes.map(note => [note.id, note.target])),
    { poster: "public", private: "private", unfinished: "hold", friend: "hold" }
  );
  assert.equal(SCRIPT.afterword_wall.wall.success.next, "afterword_wall_reflection");
  assert.equal(SCRIPT.afterword_wall.wall.retry.next, "afterword_wall_reflection");
  assert.equal(SCRIPT.afterword_wall_reflection.next, "afterword_proofread");
  assert.equal(SCRIPT.afterword_proofread.proofread.cards.length, 6);
  assert.equal(SCRIPT.afterword_proofread.proofread.bins.length, 3);
  assert.deepEqual(
    Object.fromEntries(SCRIPT.afterword_proofread.proofread.cards.map(card => [card.id, card.target])),
    {
      senior_school: "fact",
      senior_return: "inference",
      senior_leave: "fact",
      anonymous_watch: "inference",
      sunian_gallery: "private",
      mailbox_answer: "inference"
    }
  );
  assert.equal(SCRIPT.afterword_proofread.proofread.success.next, "afterword_proofread_clean");
  assert.equal(SCRIPT.afterword_proofread.proofread.retry.next, "afterword_proofread_recheck");
  assert.equal(SCRIPT.afterword_proofread_clean.next, "afterword_ending");
  assert.equal(SCRIPT.afterword_proofread_recheck.next, "afterword_ending");
  assert.match(SCRIPT.afterword_proofread.text, /事实.*猜测/);
});

test("后日谈入口只由真结局解锁", () => {
  assert.match(engineSource, /function updateAfterwordAccess\(\)[\s\S]*?const unlocked = isTrueEndUnlocked\(\);/);
});

test("旧版第 5 日存档仍能恢复到路线选择", () => {
  assert.match(engineSource, /const SAVE_NODE_ALIASES = Object\.freeze\(\{[\s\S]*d5_check_xiazhi: "d5_route_check"/);
  assert.match(engineSource, /d5_check_sunian: "d5_route_check"/);
  assert.match(engineSource, /d5_default_choice: "d5_route_check"/);
  assert.match(engineSource, /function normalizeSaveNodeId\(nodeId\) \{[\s\S]*return SAVE_NODE_ALIASES\[nodeId\] \|\| nodeId;/);
  assert.match(engineSource, /const nodeId = normalizeSaveNodeId\(data\?\.nodeId\);[\s\S]*if \(!data \|\| !SCRIPT\[nodeId\]\)/);
  assert.match(engineSource, /state\.currentNode = nodeId;[\s\S]*gotoNode\(nodeId, \{ restoring: true \}\)/);
});

test("所有关键词和合成原料都有剧情解锁点", () => {
  const unlockedByStory = new Set();
  for (const node of Object.values(SCRIPT)) {
    const keywords = Array.isArray(node.keyword) ? node.keyword : [node.keyword];
    keywords.filter(Boolean).forEach(keyword => unlockedByStory.add(keyword));
  }
  for (const keyword of Object.keys(KEYWORDS)) {
    assert.equal(unlockedByStory.has(keyword), true, `${keyword} 没有剧情解锁点`);
  }
  const recipeResults = new Set(COMPOSE_RECIPES.map(recipe => recipe.result));
  const baseInputs = new Set(
    COMPOSE_RECIPES.flatMap(recipe => [recipe.a, recipe.b]).filter(keyword => !recipeResults.has(keyword))
  );
  for (const keyword of baseInputs) {
    assert.equal(unlockedByStory.has(keyword), true, `合成原料 ${keyword} 不可达`);
  }
  assert.match(engineSource, /Array\.isArray\(node\.keyword\)/);
});

test("真结局状态只由真正的破环结局授予", () => {
  assert.equal(SCRIPT.true_ending.ending.id, "true_unbroken");
  assert.equal(SCRIPT.true_break_ending.ending.id, "true_end");
  assert.equal(ENDINGS.some(ending => ending.id === "true_unbroken"), true);
  assert.match(source, /function isTrueEndUnlocked\(\)[\s\S]*?Saves\.isEndingUnlocked\("true_end"\)/);
  assert.match(engineSource, /function startAfterword\(\)[\s\S]*?if \(!isTrueEndUnlocked\(\)/);
  const unlocked = new Set(["shiyu_good", "xiazhi_good", "sunian_good"]);
  context.Saves = { isEndingUnlocked: id => unlocked.has(id) };
  assert.equal(isTrueEndUnlocked(), false);
  unlocked.add("true_end");
  assert.equal(isTrueEndUnlocked(), true);
});

test("无时间回溯标记的剧情边不会倒退", () => {
  const order = { morning: 0, noon: 1, afternoon: 2, evening: 3, night: 4 };
  const edges = [];
  for (const [id, node] of Object.entries(SCRIPT)) collectNextRefs(node, edges, id);
  const reverse = [];
  for (const [from, to] of edges) {
    const sourceNode = SCRIPT[from];
    const targetNode = SCRIPT[to];
    if (!sourceNode.day || !targetNode.day || sourceNode.timeLoop) continue;
    const sourceTime = sourceNode.day * 5 + order[sourceNode.time];
    const targetTime = targetNode.day * 5 + order[targetNode.time];
    if (sourceTime > targetTime) reverse.push(`${from} -> ${to}`);
  }
  assert.deepEqual(reverse, []);
});

test("剧情时间跨度和关键文本相互一致", () => {
  assert.equal(SCRIPT.d4_timecapsule.timecapsule.deliverAt, "d5_foggy");
  assert.match(SCRIPT.d4_timecapsule.text, /明早醒来/);
  assert.deepEqual(
    [SCRIPT.sy_13_good.day, SCRIPT.xz_12_good.day, SCRIPT.sn_12_good.day],
    [35, 35, 35]
  );
  assert.match(SCRIPT.xz_12_normal.text, /一个月后/);
  assert.match(SCRIPT.sn_13_good.text, /新作.*不是同一张/);
  assert.match(SCRIPT.afterword_postcard.text, /新城市的收件地址/);
  assert.match(SCRIPT.afterword_autumn.text, /明确选择匿名/);
  assert.match(SCRIPT.d1_night_home.text, /重新说上了话/);
  assert.equal(SCRIPT.d5_route_check.choice.options.length, 3);
  assert.equal(SCRIPT.d5_route_check.if, undefined);
});

test("day2 学姐线入口门槛：真结局一次或普通结局两次即可进入", () => {
  // 背景：day2 的「★ 旧校舍后面（？）★」原门槛为 playCount >= 1，而 playCount 只在真结局 +1，
  // 连续走普通结局的玩家 loopCount 一直涨、playCount 永远是 0 —— 这条线对其永久锁死。
  // v3.4.25 起放宽为 playCount >= 1 || loopCount >= 2，本契约锁死这四种组合的预期。
  const entry = SCRIPT.day2_choice.choice.options.find((opt) => opt.next === "d2_senior_easter");
  assert.ok(entry, "day2_choice 缺少学姐线入口");
  assert.equal(typeof entry.requires, "function", "学姐线入口必须带 requires 门槛");

  const probe = (playCount, loopCount) => {
    context.window.__game = { state: { playCount, loopCount } };
    return !!entry.requires();
  };
  try {
    assert.equal(probe(0, 0), false, "首周目不应出现入口");
    assert.equal(probe(0, 1), false, "仅一次普通结局仍不应出现入口（保留多周目奖励意味）");
    assert.equal(probe(1, 0), true, "真结局一次应出现入口");
    assert.equal(probe(0, 2), true, "两次普通结局应出现入口（普通结局玩家不再永久锁死）");
  } finally {
    delete context.window.__game;
  }
});

test("学姐线入口、结局与回信分支元数据正确", () => {
  const loopChoice = SCRIPT.d5_route_check.choice.loopChoice;
  assert.equal(loopChoice.length, 1);
  assert.equal(loopChoice[0].minLoop, 1);
  assert.equal(loopChoice[0].requires_ending, "true_unbroken");
  assert.equal(loopChoice[0].next, "route_senior_1");
  assert.match(engineSource, /opt\.requires_ending && !Saves\.isEndingUnlocked\(opt\.requires_ending\)/);

  assert.equal(SCRIPT.senior_ending.ending.id, "senior_shadow");
  assert.equal(SCRIPT.senior_ending.ending.type, "SIDE ENDING");
  assert.equal(ENDINGS.filter(ending => ending.id === "senior_shadow").length, 1);
  assert.equal(ENDINGS.length, 13);

  const letter = SCRIPT.senior_12.letter;
  assert.equal(letter.type, "free");
  assert.equal(letter.matchings.length, 3);
  const replies = [...letter.matchings, letter.defaultReply];
  for (const reply of replies) {
    let id = reply.next;
    let guard = 0;
    while (id && !SCRIPT[id]?.ending && guard++ < 10) id = SCRIPT[id].next;
    assert.equal(SCRIPT[id]?.ending?.id, "senior_shadow", `${reply.id || "默认"} 未接回学姐结局`);
  }
});

test("学姐线全部节点可达且不改真结局判定", () => {
  const roots = ["route_senior_1"];
  const reachable = new Set(roots);
  const queue = roots.slice();
  while (queue.length) {
    const current = queue.shift();
    for (const [from, target] of refs) {
      if (from === current && SCRIPT[target] && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  const routeIds = Object.keys(SCRIPT).filter(id => id === "route_senior_1" || id.startsWith("senior_"));
  assert.equal(routeIds.length, 24);
  assert.deepEqual(routeIds.filter(id => !reachable.has(id)), []);
  assert.match(source, /function isTrueEndUnlocked\(\)[\s\S]*?Saves\.isEndingUnlocked\("true_end"\)/);
  assert.doesNotMatch(source, /function isTrueEndUnlocked\(\)[\s\S]*?senior_shadow/);
});
