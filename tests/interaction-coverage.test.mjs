import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const script = fs.readFileSync(new URL("../js/script.js", import.meta.url), "utf8");
const engine = fs.readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
const afterword = fs.readFileSync(new URL("../js/games/afterword.js", import.meta.url), "utf8");
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
  spectrum: "runSpectrum", constellation: "runConstellation", stethoscope: "runStethoscope",
  puzzle: "runPuzzle", perfume: "runPerfume", tea: "runTea", astronomy: "runAstronomy",
  dice: "runDice", wind: "runWind",
  decode: "runDecode", rain: "runRain", rubbing: "runRubbing", collect: "runCollect",
  focus: "runFocus", scentmem: "runScentmem", tealeaf: "runTealeaf", shadow: "runShadow",
  candle: "runCandle", dial: "runDial", foggy: "runFoggy", sugar: "runSugar",
  chime: "runChime", hourglass: "runHourglass", kite: "runKite", lock: "runLock",
  orbit: "runOrbit", firefly: "runFirefly", windchime: "runWindchime",
  bottle: "runBottle", echoloc: "runEcholoc", compass: "runCompass", telegraph: "runTelegraph",
  balance: "runBalance", pendulum: "runPendulum", metronome: "runMetronome",
  starchart: "runStarchart", lens: "runLens", tuning: "runTuning", eclipse: "runEclipse",
  stamp: "runStamp", astrolabe: "runAstrolabe", sandpaint: "runSandpaint", kaleido: "runKaleido",
  abacus: "runAbacus", gear: "runGear", topo: "runTopo", sundial: "runSundial",
  windmill: "runWindmill",
  ripple: "runRipple", celestial: "runCelestial",
  vane: "runVane", clepsydra: "runClepsydra",
};

/* v2.7.9 起，后日谈与身心感知玩法迁出 engine.js，经 GameKit 注册、由引擎触发；
   v2.8.4 起，手作与器物玩法（craft.js）同样迁出 */
const senses = fs.readFileSync(new URL("../js/games/senses.js", import.meta.url), "utf8");
const craft = fs.readFileSync(new URL("../js/games/craft.js", import.meta.url), "utf8");
const gameFiles = { afterword, senses, craft };
const gameKitHandlers = {
  postcard: "afterword", timeline: "afterword", triage: "afterword", wall: "afterword", proofread: "afterword",
  breath: "senses", timecapsule: "senses", fold: "senses", reflection: "senses",
  lightdraw: "senses", mimic: "senses", season: "senses", pulse: "senses",
  origami: "craft", jigsaw: "craft", mosaic: "craft", weave: "craft", dye: "craft",
  stele: "craft", palette: "craft", lantern: "craft", mirror: "craft", chess: "craft",
  flag: "craft", drum: "craft", piano: "craft",
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
  for (const [field, source] of Object.entries(gameKitHandlers)) {
    const ids = Object.entries(SCRIPT).filter(([, node]) => node && node[field] !== undefined).map(([id]) => id);
    assert.ok(ids.length > 0, `${field} 没有剧情节点入口`);
    assert.match(engine, new RegExp(`if \\(node\\.${field}\\)`), `${field} 没有节点分发器`);
    assert.match(engine, new RegExp(`GameKit\\?\\.run\\("${field}"`), `${field} 未通过 GameKit 触发`);
    assert.match(gameFiles[source], new RegExp(`register\\("${field}"`), `${field} 缺少 GameKit 注册`);
  }
});
