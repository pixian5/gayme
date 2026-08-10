import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const engineSource = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(`${source}\nthis.__out = { SCRIPT, START_NODE };`, context);
const { SCRIPT, START_NODE } = context.__out;
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
    "afterword_mailbox_rule_ask", "afterword_mailbox_rule_space", "afterword_mailbox_triage", "afterword_wall", "afterword_wall_reflection", "afterword_ending"
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
  assert.equal(SCRIPT.afterword_wall_reflection.next, "afterword_ending");
});

test("后日谈入口只由真结局解锁", () => {
  assert.match(engineSource, /function updateAfterwordAccess\(\)[\s\S]*?const unlocked = isTrueEndUnlocked\(\);/);
});
