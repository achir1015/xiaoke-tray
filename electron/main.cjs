'use strict';
// 小柯機器人3D托盤生成器：桌面版主程式
// 網頁本體（dist/）透過自訂協定 xktray:// 載入，wasm 與 Web Worker 都能正常運作，
// 設定與範本存在 localStorage，關閉視窗即結束程式。
const { app, BrowserWindow, ipcMain, protocol, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { Updater } = require('./updater.cjs');
const bambu = require('./bambu.cjs');

const SCHEME = 'xktray';
const DIST = path.join(__dirname, '..', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const updater = new Updater();
let win = null;

function settingsFile() {
  return path.join(app.getPath('userData'), 'xiaoke-settings.json');
}
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}
function writeSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
}

function createWindow() {
  const s = readSettings();
  win = new BrowserWindow({
    width: s.bounds?.width || 1400,
    height: s.bounds?.height || 900,
    x: s.bounds?.x,
    y: s.bounds?.y,
    minWidth: 900,
    minHeight: 600,
    title: '小柯機器人3D托盤生成器',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#f3f0ea',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (s.maximized) win.maximize();
  win.loadURL(`${SCHEME}://app/index.html`);
  // 外部連結用系統瀏覽器開啟
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${SCHEME}://`)) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });
  // 網頁觸發的下載（STL／3MF／STEP／專案檔）存到「文件\小柯托盤」，並讓使用者選位置
  win.webContents.session.on('will-download', (e, item) => {
    const dir = bambu.outputDir(app);
    item.setSaveDialogOptions({ defaultPath: path.join(dir, item.getFilename()) });
  });
  const remember = () => {
    if (!win || win.isDestroyed()) return;
    const cur = readSettings();
    cur.maximized = win.isMaximized();
    if (!cur.maximized && !win.isMinimized()) cur.bounds = win.getBounds();
    writeSettings(cur);
  };
  win.on('close', remember);
  win.on('closed', () => (win = null));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle(SCHEME, async (req) => {
    const url = new URL(req.url);
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('forbidden', { status: 403 });
    try {
      const data = await fs.promises.readFile(file);
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      return new Response(data, { headers: { 'content-type': type, 'cache-control': 'no-cache' } });
    } catch {
      return new Response('not found', { status: 404 });
    }
  });

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('bambu:find', () => bambu.find(readSettings().bambuExe));
  ipcMain.handle('bambu:pick', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: '選擇 Bambu Studio 執行檔',
      defaultPath: 'C:\\Program Files\\Bambu Studio',
      filters: [{ name: 'Bambu Studio', extensions: process.platform === 'win32' ? ['exe'] : ['app', '*'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const s = readSettings();
    s.bambuExe = r.filePaths[0];
    writeSettings(s);
    return s.bambuExe;
  });
  ipcMain.handle('bambu:open', async (e, name, data) => {
    const file = bambu.saveModel(app, name, Buffer.from(data));
    let exe = bambu.find(readSettings().bambuExe);
    if (!exe) {
      const r = await dialog.showMessageBox(win, {
        type: 'question',
        title: '找不到 Bambu Studio',
        message: '找不到 Bambu Studio。',
        detail: `3MF 已存到：\n${file}\n\n要手動選擇 Bambu Studio 的執行檔嗎？`,
        buttons: ['選擇執行檔', '開啟資料夾', '取消'],
        defaultId: 0,
        cancelId: 2,
      });
      if (r.response === 1) shell.showItemInFolder(file);
      if (r.response !== 0) return { ok: false, path: file };
      const pick = await dialog.showOpenDialog(win, { title: '選擇 Bambu Studio 執行檔', properties: ['openFile'], filters: [{ name: 'Bambu Studio', extensions: ['exe', 'app', '*'] }] });
      if (pick.canceled || !pick.filePaths[0]) return { ok: false, path: file };
      const s = readSettings();
      s.bambuExe = exe = pick.filePaths[0];
      writeSettings(s);
    }
    try {
      await bambu.launch(exe, file);
      return { ok: true, path: file, exe };
    } catch (err) {
      return { ok: false, path: file, exe, error: String(err && err.message) };
    }
  });

  ipcMain.handle('update:check', () => updater.check());
  ipcMain.handle('update:download', (e) => updater.download((got, total) => {
    if (!e.sender.isDestroyed()) e.sender.send('update:progress', { got, total });
  }));
  ipcMain.handle('update:install', (e, file) => updater.install(file));
  ipcMain.handle('update:openPage', () => shell.openExternal(updater.info?.page || 'https://github.com/achir1015/xiaoke-tray/releases/latest'));

  createWindow();
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

// 關閉視窗就結束程式（含背景 Worker）
app.on('window-all-closed', () => app.quit());
