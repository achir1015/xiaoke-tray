// 實測程式內更新：啟動 XK_EXE（舊版），查詢→下載→安裝，等新版自動重開後讀版本號。
import { spawn, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const exe = process.env.XK_EXE;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const verOf = () => {
  try {
    return execSync(`powershell -NoProfile -Command "(Get-Item '${exe}').VersionInfo.ProductVersion"`, { encoding: 'utf8' }).trim();
  } catch {
    return '?';
  }
};
console.log('更新前版本', verOf());
const child = spawn(exe, ['--remote-debugging-port=9349'], { stdio: 'ignore', detached: true });
child.unref();
let page;
for (let i = 0; i < 60 && !page; i++) {
  try {
    page = (await (await fetch('http://127.0.0.1:9349/json/list')).json()).find((t) => t.url.startsWith('xktray://'));
  } catch {
    // 還沒啟動
  }
  await sleep(500);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  pending.get(m.id)?.(m);
});
const ev = (expression) => new Promise((r) => {
  const n = ++id;
  pending.set(n, (m) => r(m.result?.result?.value ?? m.result?.exceptionDetails));
  ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
});
const info = await ev('window.xk.update.check()');
console.log('查詢', info.current, '→', info.latest, 'newer', info.newer, info.asset?.name);
if (!info.newer) process.exit(1);
const t0 = Date.now();
const file = await ev('window.xk.update.download()');
console.log('下載完成', file, `${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
ev(`window.xk.update.install(${JSON.stringify(file)})`).catch(() => {});
// 安裝程式靜默安裝後會以 --force-run 重開新版
for (let i = 0; i < 120; i++) {
  await sleep(2000);
  const v = verOf();
  if (v.startsWith(info.latest)) {
    console.log('更新後版本', v);
    await sleep(5000);
    const running = execSync('tasklist /FI "IMAGENAME eq XiaokeTray.exe" /NH', { encoding: 'utf8' });
    console.log('新版已自動重開', /XiaokeTray\.exe/i.test(running));
    process.exit(0);
  }
}
console.log('逾時，版本仍是', verOf());
process.exit(1);
