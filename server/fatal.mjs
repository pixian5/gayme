/* 樱时信笺 · 致命错误处理（v3.4.56）
 * 未捕获的异常 / 未处理的 Promise 拒绝意味着进程状态已经不可信。带着未知状态继续处理请求，
 * 可能把问题放大（例如把坏数据写进库）。做法：记日志 → 关闭资源 → 退出；
 * 账号容器配置了重启策略（unless-stopped），退出后会被自动拉起。
 * v3.4.56 之前只是打一行日志然后继续运行。
 * 单独成模块是为了能在测试里用子进程验证「真的会退出」。 */
export function installFatalHandlers({
  onClose,                                   // 退出前要做的清理：停止接收新请求、关闭数据库
  logger = console.error,
  schedule = (fn, ms) => setTimeout(fn, ms),
  graceMs = 200,                             // 给日志落盘留的时间
  target = process,
} = {}) {
  let crashing = false;
  const crash = (kind, err) => {
    // 崩溃处理过程中再抛出的异常不重复处理
    if (crashing) return;
    crashing = true;
    try { logger(`[gayme-account] ${kind}（进程即将退出，由容器重启）:`, err && err.stack || err); } catch (_) {}
    if (onClose) {
      try { onClose(); }
      catch (closeErr) { try { logger("[gayme-account] 退出前清理失败:", closeErr && closeErr.stack || closeErr); } catch (_) {} }
    }
    // 先把退出码置为 1：即使事件循环先于定时器排空，进程也会以失败码退出，而不是「正常结束」的 0
    target.exitCode = 1;
    const timer = schedule(() => target.exit(1), graceMs);
    if (timer && timer.unref) timer.unref();
  };
  target.on("uncaughtException", (err) => crash("uncaughtException", err));
  target.on("unhandledRejection", (err) => crash("unhandledRejection", err));
  return { crashed: () => crashing };
}
