// Android 實機測試：先用除錯版 APK（python android/build.py debug install），
// adb forward tcp:9335 localabstract:webview_devtools_remote_<pid>，再執行 node e2e/android.mjs
const PORT = process.env.CDP_PORT || 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0;
let fail = 0;
const check = (name, cond, info = '') => {
  if (cond) ok++;
  else fail++;
  console.log(`${cond ? '✔' : '✘'} ${name}${info ? ` — ${info}` : ''}`);
};
const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const evaluate = (expr) => new Promise((r) => {
  const id = ++seq;
  pending.set(id, (m) => r(m.result?.result?.value ?? m.result?.exceptionDetails?.exception?.description));
  ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true } }));
});
const waitFor = async (expr, ms = 60000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(`return !!(${expr})`)) return true;
    await sleep(400);
  }
  return false;
};
const status = () => evaluate("return document.querySelector('#status').textContent");

try {
  await evaluate("document.querySelector('.xk-close')?.click(); return 1");
  await sleep(800);
  check('Android 橋接', await evaluate('return typeof window.XiaokeAndroid?.beginSave === "function"'));
  check('系統語音可用', await evaluate('return window.XiaokeAndroid.ttsAvailable()'));
  check('首頁第一張卡是便當托盤', (await evaluate("return document.querySelector('#tools button strong').textContent")) === '便當托盤');
  check('沒有桌面版下載連結', await evaluate("return !document.querySelector('.xk-desktop-link')"));
  await evaluate("window.xkApp.select('tray'); return 1");
  check('托盤模型建好（WebAssembly）', await waitFor("/完成/.test(document.querySelector('#status').textContent)", 90000), await status());
  await evaluate("window.xkApp.setParams({ width: 140, depth: 90, columns: 3, rows: 2, pattern: 'hex' }); return 1");
  await sleep(500);
  check('改參數後重建', await waitFor("/140 × 90/.test(document.querySelector('#status').textContent)", 90000), await status());
  check('綠色按鈕文字', (await evaluate("return document.querySelector('#send-bambu').textContent")) === '儲存 3MF（下載／小柯托盤）');
  const name = `xk-test-${Date.now().toString(36)}.3mf`;
  const saved = await evaluate(`const r = JSON.parse(window.XiaokeAndroid.beginSave(${JSON.stringify(name)})); window.XiaokeAndroid.writeChunk(r.token, btoa('PK test')); return window.XiaokeAndroid.endSave(r.token);`);
  check('存檔到下載資料夾', /"status":"ok"/.test(saved), saved);
  await evaluate("document.querySelector('#send-bambu').click(); return 1");
  check('按綠色按鈕存 3MF', await waitFor("!document.querySelector('#send-bambu').disabled", 30000));
  const upd = await evaluate('return window.XiaokeAndroid.checkUpdate()');
  check('檢查更新查得到 GitHub', /"status":"ok"/.test(upd), upd.slice(0, 120));
  check('返回鍵回首頁', (await evaluate('return window.__xkBack()')) === true && (await waitFor("!document.querySelector('#home').hidden", 5000)));
  check('首頁返回鍵交給系統', (await evaluate('return window.__xkBack()')) === false);
  await evaluate("document.querySelector('.xk-guide-btn').click(); return 1");
  check('教學出現', await waitFor("document.querySelector('.xk-text')?.textContent.length > 5", 5000));
  await sleep(2500);
  check('教學正在說話', await evaluate("return document.querySelector('.xk-robot').classList.contains('talk')"));
  await evaluate("document.querySelector('.xk-close').click(); return 1");
  check('教學可關閉', await waitFor("!document.querySelector('.xk-guide')", 5000));
} catch (e) {
  fail++;
  console.log('✘ 例外', e.message);
} finally {
  ws.close();
  console.log(`\n通過 ${ok}，失敗 ${fail}`);
  process.exit(fail ? 1 : 0);
}
