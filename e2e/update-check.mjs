// 檢查程式內更新：啟動 XK_EXE 指定的打包版，呼叫 window.xk.update.check() 印出結果。
import { spawn, execSync } from 'node:child_process';

const child = spawn(process.env.XK_EXE, ['--remote-debugging-port=9348'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
for (let i = 0; i < 60 && !page; i++) {
  try {
    page = (await (await fetch('http://127.0.0.1:9348/json/list')).json()).find((t) => t.url.startsWith('xktray://'));
  } catch {
    // 還沒啟動
  }
  await sleep(500);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const res = await new Promise((r) => {
  ws.addEventListener('message', (e) => r(JSON.parse(e.data)));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'window.xk.update.check()', awaitPromise: true, returnByValue: true } }));
});
console.log(JSON.stringify(res.result?.result?.value ?? res, null, 1));
ws.close();
execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
