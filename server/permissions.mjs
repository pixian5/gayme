/* 樱时信笺 · 文件权限收紧（v3.4.56）
 * 数据库、预写日志、备份文件里是全部用户的密码哈希、会话令牌哈希与云存档，
 * 同一台机器上的其他用户 / 容器不应该读得到。
 * 做法：进程启动时把掩码设为 077（新建文件 600、新建目录 700），并把已有的文件收紧为 600。
 * 只收紧、不放宽：已经比目标更严格的权限保持不变。 */
import fs from "node:fs";
import path from "node:path";

/* 把一个文件收紧为 mode（默认 600）。返回是否改动过。
 * 不是普通文件（目录、符号链接）、平台不支持、或没有权限时返回 false，不抛错 */
export function tightenFileMode(file, mode = 0o600) {
  try {
    // lstat：不跟随符号链接，避免顺手改到别处的文件
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return false;
    const current = stat.mode & 0o777;
    if ((current & ~mode) === 0) return false;   // 已经不比目标宽松
    fs.chmodSync(file, current & mode);
    return true;
  } catch (_) {
    return false;
  }
}

/* 把目录里符合 namePattern 的文件逐个收紧。返回改动过的文件名 */
export function tightenDirectoryTree(dir, { mode = 0o600, namePattern = /.*/ } = {}) {
  const changed = [];
  let names;
  try { names = fs.readdirSync(dir); }
  catch (_) { return changed; }
  for (const name of names) {
    if (!namePattern.test(name)) continue;
    if (tightenFileMode(path.join(dir, name), mode)) changed.push(name);
  }
  return changed;
}
