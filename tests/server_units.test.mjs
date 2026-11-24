/* 服务端加固的单元测试（v3.4.56 新增）
 * 覆盖不依赖数据库、也不需要起服务的行为：
 *   客户端地址的取法 / 密码哈希异步且与旧哈希兼容 / 致命错误后进程退出 / 文件权限只收紧不放宽
 * 依赖数据库的行为在 server/test_api.mjs 里测（那一套需要 Node 22.5+ 的内置 SQLite）。
 * 运行：npm test（本文件被 tests/*.test.mjs 匹配到） */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { clientIp, scryptHash, scryptVerify } from "../server/auth.mjs";
import { tightenDirectoryTree, tightenFileMode } from "../server/permissions.mjs";

const posixOnly = process.platform !== "win32";

/* ---------- 客户端地址 ---------- */
const req = (remoteAddress, forwarded) => ({
  socket: { remoteAddress },
  headers: forwarded === undefined ? {} : { "x-forwarded-for": forwarded },
});

test("客户端地址：取转发头的最后一项，前几项（客户端可伪造）不生效", () => {
  assert.equal(clientIp(req("10.0.0.5", "203.0.113.9, 198.51.100.7"), true), "198.51.100.7");
  assert.equal(clientIp(req("10.0.0.5", "203.0.113.9 , 198.51.100.7 , 192.0.2.1"), true), "192.0.2.1");
  assert.equal(clientIp(req("10.0.0.5", "198.51.100.7"), true), "198.51.100.7");
  assert.equal(clientIp(req("10.0.0.5", "  198.51.100.7  "), true), "198.51.100.7");
});

test("客户端地址：取不到可信值时用连接的对端地址", () => {
  assert.equal(clientIp(req("10.0.0.5"), true), "10.0.0.5", "没有转发头");
  assert.equal(clientIp(req("10.0.0.5", ""), true), "10.0.0.5", "转发头为空");
  assert.equal(clientIp(req("10.0.0.5", "203.0.113.9, ,"), true), "203.0.113.9", "末尾的空项忽略");
  // 最后一项不像地址：整段都不可信
  assert.equal(clientIp(req("10.0.0.5", "203.0.113.9, unknown"), true), "10.0.0.5");
  assert.equal(clientIp(req("10.0.0.5", "not-an-ip"), true), "10.0.0.5");
  assert.equal(clientIp(req("10.0.0.5", "<script>"), true), "10.0.0.5");
});

test("客户端地址：不经代理时不理会转发头；本机回环连接视作本机代理", () => {
  assert.equal(clientIp(req("203.0.113.9", "198.51.100.7"), false), "203.0.113.9");
  assert.equal(clientIp(req("127.0.0.1", "198.51.100.7"), false), "198.51.100.7");
  assert.equal(clientIp(req("::ffff:127.0.0.1", "198.51.100.7"), false), "198.51.100.7");
  assert.equal(clientIp(req("::1", ""), false), "::1");
});

test("客户端地址：IPv4 映射地址会被还原成普通写法", () => {
  // 否则同一个玩家经 IPv6 入口和 IPv4 入口会被算成两个地址，各占一份限流额度
  assert.equal(clientIp(req("::ffff:203.0.113.9"), false), "203.0.113.9");
  assert.equal(clientIp(req("10.0.0.5", "::FFFF:198.51.100.7"), true), "198.51.100.7");
  assert.equal(clientIp(req("10.0.0.5", "2001:db8::1"), true), "2001:db8::1");
});

/* ---------- 密码哈希 ---------- */
const LEGACY_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

test("异步密码哈希与 v3.4.56 之前存的同步哈希互相兼容", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const legacy = crypto.scryptSync("Passw0rd!", Buffer.from(salt, "hex"), 64, LEGACY_OPTIONS).toString("hex");
  assert.equal(await scryptVerify("Passw0rd!", salt, legacy), true, "旧哈希必须仍能验证通过");
  assert.equal(await scryptVerify("wrong", salt, legacy), false, "错误密码不能通过");
  assert.equal(await scryptVerify("Passw0rd!", "", legacy), false, "缺盐不能通过");
  assert.equal(await scryptVerify("Passw0rd!", salt, ""), false, "缺哈希不能通过");
  assert.equal(await scryptVerify("Passw0rd!", "不是十六进制", legacy), false, "盐损坏按不通过处理，不抛错");
  const fresh = await scryptHash("Passw0rd!");
  assert.match(fresh.salt, /^[0-9a-f]{32}$/);
  assert.equal(await scryptVerify("Passw0rd!", fresh.salt, fresh.hash), true);
  assert.notEqual(fresh.hash, legacy, "每次哈希用新的随机盐");
});

test("哈希在后台线程计算：计算期间事件循环照常处理其它事情", async () => {
  let ticks = 0;
  const timer = setInterval(() => { ticks += 1; }, 5);
  try {
    await scryptHash("Passw0rd!");
  } finally {
    clearInterval(timer);
  }
  assert.ok(ticks >= 1, `哈希期间定时器应至少触发一次（实际 ${ticks} 次）——触发不了说明计算占住了事件循环`);
});

/* ---------- 致命错误后退出 ---------- */
// 子进程脚本：装上处理器 → 让事件循环保持活跃 2 秒 → 50 毫秒后制造致命错误。
// 如果处理器没有让进程退出，进程会「正常」跑完 2 秒并以 0 退出。
const FATAL_RUNNER = `
  import { installFatalHandlers } from ${JSON.stringify(new URL("../server/fatal.mjs", import.meta.url).href)};
  const kind = process.argv[1];
  let closed = 0;
  installFatalHandlers({
    onClose() { closed += 1; },
    logger: (line) => process.stderr.write("LOG " + line + "\\n"),
  });
  process.on("exit", (code) => process.stderr.write("EXIT code=" + code + " closed=" + closed + "\\n"));
  setTimeout(() => {}, 2000);
  setTimeout(() => {
    if (kind === "uncaught") throw new Error("boom-uncaught");
    Promise.reject(new Error("boom-rejection"));
  }, 50);
`;

for (const [kind, word] of [["uncaught", "uncaughtException"], ["rejection", "unhandledRejection"]]) {
  test(`致命错误后进程退出而不是带着未知状态继续运行（${word}）`, () => {
    const started = Date.now();
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", FATAL_RUNNER, kind],
      { encoding: "utf8", timeout: 15000 });
    const elapsed = Date.now() - started;
    assert.equal(result.status, 1, `应以退出码 1 结束（实际 ${result.status}）\n${result.stderr}`);
    assert.match(result.stderr, new RegExp(word), "日志里应写明是哪一类致命错误");
    assert.match(result.stderr, /EXIT code=1 closed=1/, "退出前应做清理（停止接收请求、关闭数据库），且退出码为 1");
    assert.ok(elapsed < 1500, `进程应及时退出（实际 ${elapsed} 毫秒）`);
  });
}

/* ---------- 文件权限 ---------- */
test("文件权限只收紧不放宽；目录、符号链接、不存在的路径不碰", (t) => {
  if (!posixOnly) { t.skip("Windows 没有这套权限位"); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gayme-perm-"));
  const file = path.join(dir, "game.db");
  const other = path.join(dir, "notes.txt");
  const link = path.join(dir, "link.db");
  try {
    fs.writeFileSync(file, "x");
    fs.writeFileSync(other, "x");
    fs.chmodSync(file, 0o644);
    assert.equal(tightenFileMode(file), true, "644 应被收紧");
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(tightenFileMode(file), false, "已是 600 不必再改");
    fs.chmodSync(file, 0o400);
    assert.equal(tightenFileMode(file), false, "400 比目标更严格，不应被放宽");
    assert.equal(fs.statSync(file).mode & 0o777, 0o400);

    assert.equal(tightenFileMode(dir), false, "目录不处理");
    assert.equal(fs.statSync(dir).mode & 0o777, 0o700, "临时目录权限未被改动");

    fs.chmodSync(file, 0o644);
    fs.symlinkSync(file, link);
    assert.equal(tightenFileMode(link), false, "符号链接本身不处理");
    assert.equal(fs.statSync(file).mode & 0o777, 0o644, "不跟随符号链接去改目标文件");

    assert.equal(tightenFileMode(path.join(dir, "missing.db")), false, "不存在的路径按「没改」处理");

    fs.chmodSync(other, 0o666);
    assert.deepEqual(tightenDirectoryTree(dir, { namePattern: /\.db$/ }), ["game.db"], "只动符合名单的文件");
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(fs.statSync(other).mode & 0o777, 0o666, "不在名单里的文件不动");
    assert.deepEqual(tightenDirectoryTree(path.join(dir, "no-such-dir")), [], "目录不存在时返回空列表");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
