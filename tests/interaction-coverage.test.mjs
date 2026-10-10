import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const engine = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(`${script}\nthis.__script = SCRIPT;`, context);
const SCRIPT = context.__script;

const handlers = {
  choice: "showChoices", letter: "showLetter", minigame: "runMinigame",
  dream: "enterDream", doodle: "runDoodle", collage: "runCollage", photo: "runPhoto",
  rhythm: "runRhythm", scent: "runScent", scentRecall: "triggerScentRecall",
  silenceChoice: "runSilenceChoice", touch: "runTouch", temperature: "runTemperature",
  tarot: "runTarot", dreamweave: "runDreamweave", handwriting: "runHandwriting",
  spectrum: "runSpectrum", stethoscope: "runStethoscope",
  puzzle: "runPuzzle", perfume: "runPerfume", tea: "runTea",
  dice: "runDice",
  decode: "runDecode", rubbing: "runRubbing", collect: "runCollect",
  focus: "runFocus", scentmem: "runScentmem", tealeaf: "runTealeaf", shadow: "runShadow",
  candle: "runCandle", dial: "runDial", sugar: "runSugar",
  chime: "runChime", hourglass: "runHourglass", lock: "runLock",
  
  bottle: "runBottle", echoloc: "runEcholoc", compass: "runCompass", telegraph: "runTelegraph",
  balance: "runBalance", pendulum: "runPendulum", metronome: "runMetronome",
  lens: "runLens", tuning: "runTuning",
  stamp: "runStamp", astrolabe: "runAstrolabe", sandpaint: "runSandpaint", kaleido: "runKaleido",
  abacus: "runAbacus", gear: "runGear", topo: "runTopo", sundial: "runSundial",
  windmill: "runWindmill",
  ripple: "runRipple",
  clepsydra: "runClepsydra",
};
/* v2.7.9 起，后日谈与身心感知玩法迁出 engine.js，经 GameKit 注册、由引擎触发；
   v2.8.4 起，手作与器物玩法（craft.js）同样迁出；
   v2.8.5 起引擎用通用分发循环触发所有已注册玩法；
   v2.8.6 起，自然天象玩法（nature.js）迁出 */
const afterword = fs.readFileSync(new URL("../js/games/afterword.js", import.meta.url), "utf8");
const senses = fs.readFileSync(new URL("../js/games/senses.js", import.meta.url), "utf8");
const craft = fs.readFileSync(new URL("../js/games/craft.js", import.meta.url), "utf8");
const nature = fs.readFileSync(new URL("../js/games/nature.js", import.meta.url), "utf8");
const gameFiles = { afterword, senses, craft, nature };
const gameKitHandlers = {
  postcard: "afterword", timeline: "afterword", triage: "afterword", wall: "afterword", proofread: "afterword",
  breath: "senses", timecapsule: "senses", fold: "senses", reflection: "senses",
  lightdraw: "senses", mimic: "senses", season: "senses", pulse: "senses",
  origami: "craft", jigsaw: "craft", mosaic: "craft", weave: "craft", dye: "craft",
  stele: "craft", palette: "craft", lantern: "craft", mirror: "craft", chess: "craft",
  flag: "craft", drum: "craft", piano: "craft",
  astronomy: "nature", wind: "nature", rain: "nature", constellation: "nature", foggy: "nature",
  kite: "nature", orbit: "nature", firefly: "nature", windchime: "nature", starchart: "nature",
  eclipse: "nature", celestial: "nature", vane: "nature",
};

test("每类剧情互动都有节点入口和引擎处理器", () => {
  for (const [field, handler] of Object.entries(handlers)) {
    const ids = Object.entries(SCRIPT).filter(([, node]) => node && node[field] !== undefined).map(([id]) => id);
    assert.ok(ids.length > 0, `${field} 没有剧情节点入口`);
    assert.match(engine, new RegExp(`if \\(node\\.${field}\\)`), `${field} 没有节点分发器`);
    assert.match(engine, new RegExp(`function ${handler}\\(`), `${field} 缺少 ${handler}`);
  }
});

test("已迁移玩法经 GameKit 注册并由引擎触发", () => {
  // v2.8.5 起引擎用通用分发循环统一触发所有已注册玩法，不再逐类型手写分支
  assert.match(engine, /for \(const type of window\.GameKit\.types\(\)\)/, "缺少通用玩法分发循环");
  for (const [field, source] of Object.entries(gameKitHandlers)) {
    const ids = Object.entries(SCRIPT).filter(([, node]) => node && node[field] !== undefined).map(([id]) => id);
    assert.ok(ids.length > 0, `${field} 没有剧情节点入口`);
    assert.match(gameFiles[source], new RegExp(`register\\("${field}"`), `${field} 缺少 GameKit 注册`);
  }
});
