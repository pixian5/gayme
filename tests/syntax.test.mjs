import { execFileSync } from "node:child_process";
import test from "node:test";

test("所有 JavaScript 文件语法正确", () => {
  for (const file of ["js/engine.js", "js/saves.js", "js/script.js", "js/minigames.js"]) {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  }
});
