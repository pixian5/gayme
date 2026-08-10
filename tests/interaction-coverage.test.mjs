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
  spectrum: "runSpectrum", constellation: "runConstellation", stethoscope: "runStethoscope",
  puzzle: "runPuzzle", perfume: "runPerfume", breath: "runBreath", timecapsule: "runTimecapsule",
  fold: "runFold", reflection: "runReflection", lightdraw: "runLightdraw", mimic: "runMimic",
  season: "runSeason", pulse: "runPulse", tea: "runTea", astronomy: "runAstronomy",
  palette: "runPalette", piano: "runPiano", dice: "runDice", wind: "runWind",
  decode: "runDecode", rain: "runRain", rubbing: "runRubbing", collect: "runCollect",
  focus: "runFocus", scentmem: "runScentmem", tealeaf: "runTealeaf", shadow: "runShadow",
  candle: "runCandle", dial: "runDial", foggy: "runFoggy", sugar: "runSugar",
  chime: "runChime", hourglass: "runHourglass", kite: "runKite", lock: "runLock",
  origami: "runOrigami", orbit: "runOrbit", firefly: "runFirefly", windchime: "runWindchime",
  bottle: "runBottle", echoloc: "runEcholoc", compass: "runCompass", telegraph: "runTelegraph",
  balance: "runBalance", pendulum: "runPendulum", metronome: "runMetronome",
  starchart: "runStarchart", lens: "runLens", tuning: "runTuning", eclipse: "runEclipse",
  stamp: "runStamp", astrolabe: "runAstrolabe", sandpaint: "runSandpaint", kaleido: "runKaleido",
  abacus: "runAbacus", gear: "runGear", topo: "runTopo", sundial: "runSundial", dye: "runDye",
  windmill: "runWindmill", weave: "runWeave", mirror: "runMirror", lantern: "runLantern",
  ripple: "runRipple", mosaic: "runMosaic", stele: "runStele", celestial: "runCelestial",
  drum: "runDrum", vane: "runVane", clepsydra: "runClepsydra", jigsaw: "runJigsaw",
  chess: "runChess", flag: "runFlag", postcard: "runPostcard", timeline: "runTimeline",
  triage: "runTriage",
};

test("每类剧情互动都有节点入口和引擎处理器", () => {
  for (const [field, handler] of Object.entries(handlers)) {
    const ids = Object.entries(SCRIPT).filter(([, node]) => node && node[field] !== undefined).map(([id]) => id);
    assert.ok(ids.length > 0, `${field} 没有剧情节点入口`);
    assert.match(engine, new RegExp(`if \\(node\\.${field}\\)`), `${field} 没有节点分发器`);
    assert.match(engine, new RegExp(`function ${handler}\\(`), `${field} 缺少 ${handler}`);
  }
});
