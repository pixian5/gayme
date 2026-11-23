/* 樱时信笺 · 存档「进度量」判定（v3.4.55）
 * 用途：云存档的两道保护——
 *   1) 空存档不得覆盖有内容的云端存档（empty_overwrite）
 *   2) 收集进度变少的存档不得静默覆盖云端（progress_shrink）
 * 服务端与前端（js/account.js 的 progressOf）用同一套口径。
 * 这里的键名必须与 js/saves.js 顶部的常量一致——tests/static.test.mjs 有契约校验。 */

export const SAVES_KEY = "sakura_letters_saves_v2";
export const AUTOSAVE_KEY = "sakura_letters_autosave_v2";

/* 「只会增加」的解锁类集合：清空存档会让他们归零，正常游玩不会变少 */
export const COLLECT_KEYS = [
  "sakura_letters_endings_v2",     // { unlocked: [结局编号, ...] }
  "sakura_letters_keywords_v2",    // [关键词, ...]
  "sakura_letters_cg_v2",          // [CG 编号, ...]
  "sakura_letters_clues_v2",       // [线索编号, ...]
  "sakura_letters_memories_v2",    // [{ 编号, 文本, ... }]
  "sakura_letters_composed_v2",    // [合成词, ...]
];

function countEntries(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    if (Array.isArray(value.unlocked)) return value.unlocked.length;
    return Object.keys(value).length;
  }
  return 0;
}

/* 由存档内容计算进度量：{ slots 存档槽数, hasAutosave 有无自动进度, collect 收集进度数, hasProgress } */
export function progressOf(records) {
  const rec = records && typeof records === "object" ? records : {};
  const saves = rec[SAVES_KEY];
  const slots = saves && Array.isArray(saves.slots)
    ? saves.slots.filter((slot) => slot && typeof slot === "object").length
    : 0;
  const auto = rec[AUTOSAVE_KEY];
  const hasAutosave = Boolean(auto && typeof auto === "object" && auto.snapshot && typeof auto.snapshot === "object");
  let collect = 0;
  for (const key of COLLECT_KEYS) collect += countEntries(rec[key]);
  return { slots, hasAutosave, collect, hasProgress: slots > 0 || hasAutosave };
}

const EMPTY = Object.freeze({ slots: 0, hasAutosave: false, collect: 0, hasProgress: false });

/* 数据库里存的进度量（JSON 文本）→ 对象；旧数据或损坏时按「未知」处理成空 */
export function parseProgress(text) {
  if (!text) return { ...EMPTY };
  try {
    const p = JSON.parse(text);
    if (!p || typeof p !== "object") return { ...EMPTY };
    return {
      slots: Number(p.slots) || 0,
      hasAutosave: Boolean(p.hasAutosave),
      collect: Number(p.collect) || 0,
      hasProgress: Boolean(p.hasProgress),
    };
  } catch (_) {
    return { ...EMPTY };
  }
}
