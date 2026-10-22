import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);

function jsFiles(dir) {
  return fs.readdirSync(new URL(dir, ROOT))
    .filter((name) => name.endsWith(".js"))
    .sort()
    .map((name) => `${dir}${name}`);
}

test("所有 JavaScript 文件语法正确", () => {
  const files = [...jsFiles("js/"), ...jsFiles("js/games/"), "sw.js"];
  for (const file of files) {
    execFileSync(process.execPath, ["--check", fileURLToPath(new URL(file, ROOT))], { stdio: "pipe" });
  }
});
