'use strict';
// 找到拓竹 Bambu Studio，並把產生的 3MF 交給它開啟。
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFileSync } = require('child_process');

function outputDir(app) {
  const dir = path.join(app.getPath('documents'), '小柯托盤');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 存到「文件\小柯托盤」；檔名去掉不合法字元。 */
function saveModel(app, name, buf) {
  const safe = String(name || 'tray.3mf').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
  const file = path.join(outputDir(app), safe.endsWith('.3mf') ? safe : `${safe}.3mf`);
  fs.writeFileSync(file, buf);
  return file;
}

function fromRegistry() {
  if (process.platform !== 'win32') return null;
  const keys = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Bambu Studio',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Bambu Studio',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Bambu Studio',
  ];
  for (const key of keys) {
    try {
      const out = execFileSync('reg', ['query', key], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      const icon = /DisplayIcon\s+REG_\w+\s+(.+)/i.exec(out);
      if (icon) {
        const exe = icon[1].trim().replace(/^"|"$/g, '').replace(/,\d+$/, '');
        if (fs.existsSync(exe)) return exe;
      }
      const loc = /InstallLocation\s+REG_\w+\s+(.+)/i.exec(out);
      if (loc) {
        const exe = path.join(loc[1].trim(), 'bambu-studio.exe');
        if (fs.existsSync(exe)) return exe;
      }
    } catch {
      // 沒有這個機碼
    }
  }
  return null;
}

/** 依序找：使用者指定 → 登錄檔 → 常見安裝位置。 */
function find(custom) {
  if (custom && fs.existsSync(custom)) return custom;
  if (process.platform === 'darwin') {
    for (const p of ['/Applications/BambuStudio.app', path.join(os.homedir(), 'Applications', 'BambuStudio.app')]) if (fs.existsSync(p)) return p;
    return null;
  }
  const reg = fromRegistry();
  if (reg) return reg;
  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Bambu Studio', 'bambu-studio.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Bambu Studio', 'bambu-studio.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Bambu Studio', 'bambu-studio.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/** 啟動 Bambu Studio 開啟檔案（已開著時，Bambu Studio 會依它自己的「單一實例」設定處理）。 */
function launch(exe, file) {
  return new Promise((resolve, reject) => {
    const child = process.platform === 'darwin'
      ? spawn('open', ['-a', exe, file], { detached: true, stdio: 'ignore' })
      : spawn(exe, [file], { detached: true, stdio: 'ignore', cwd: path.dirname(exe), windowsHide: false });
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
    child.once('error', reject);
  });
}

module.exports = { find, launch, saveModel, outputDir };
