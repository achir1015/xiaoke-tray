# CLAUDE.md — 小柯機器人3D托盤生成器（xiaoke-tray）

給新的 Claude Code 工作階段：先讀這份，再讀 `docs/開發紀錄.md`（完整過程與決策）。本機專用資訊（路徑、裝置、金鑰）在 `CLAUDE.local.md`（不進 git）。

## 與使用者合作

- **一律用繁體中文回覆**（App 按鈕原名可保留英文）。
- 開發者署名：吳玉柱 先生 與 Claude AI Opus 5.5。
- 推送、發佈 Release、上傳安裝檔等對外動作先問過使用者；使用者會在 GitHub 網頁直接改 README，推送前先 `git pull --rebase`。
- commit 作者用 GitHub noreply 信箱（repo 的 git config 已設定）；任何檔案、package.json、安裝檔都不要放使用者的 email。

## 專案是什麼

Fork 自 [TechnikWeber/Genstrio](https://github.com/TechnikWeber/Genstrio)（AGPL-3.0，repo 必須公開）。瀏覽器內的參數化 3D 列印產生器（replicad／OpenCascade WASM＋three.js）。我們加了：

- 原創「便當托盤」產生器：`src/generators/build/tray.ts`、`src/generators/meta.ts` 的 `tray`、`tests/tray.test.ts`
- 繁體中文 `zh`（預設）：`src/i18n.ts`
- 小柯功能：`src/xiaoke.ts`（語音動態教學、版本更新、桌面／iOS／Android 橋接、`saveFile`）
- 一鍵送到 Bambu Studio（桌面版）：`electron/bambu.cjs`

## 目錄

| 路徑 | 內容 |
|---|---|
| `src/` | 網頁本體（所有平台共用） |
| `public/ios/` | iPhone／iPad 線上安裝頁（vite 會複製到 `dist/ios`）；`manifest.plist` 的 bundle-version 要跟版本改 |
| `electron/` | 桌面版：`main.cjs`（`xktray://` 協定）、`bambu.cjs`、`updater.cjs`、`preload.cjs` |
| `ios/` | XcodeGen 專案、`sync.sh`、`build-ipa.sh`（在 Mac 執行） |
| `android/` | 無 Gradle 的 `build.py`、`MainActivity.java`、`Bridge.java` |
| `e2e/` | `desktop.mjs`、`android.mjs`、`update-check.mjs`、`update-install.mjs`、`wait-ci.mjs` |
| `scripts/` | `make_icon.py`（圖示）、`mac-install-test.sh` |
| `.github/workflows/` | `build.yml`（Win＋Mac 安裝檔與 Release）、`pages.yml`（線上版） |

## 常用指令（Node 22，見 CLAUDE.local.md 的路徑）

```bash
npm run dev                      # 網頁開發
npx tsc                          # 型別檢查
npx vitest run tests/tray.test.ts  # 托盤測試（全部 npm test 約 6 分鐘）
npx vite build                   # 產生 dist/
npm run app                      # 建置後以 Electron 開啟
node e2e/desktop.mjs [--bambu]   # 桌面冒煙（XK_EXE= 測打包版）
npx electron-builder --win nsis portable --x64 --publish never
python android/build.py [debug] [install]
```

## 發佈新版

1. 改 `package.json` 的 `version`，更新 `.github/release-notes.md`、`public/ios/manifest.plist` 的 bundle-version。
2. 推 main → `build.yml` 自動建 Windows＋Mac 並建立 Release `v<版本>`；`pages.yml` 自動更新線上版。等待：`WF=build.yml node e2e/wait-ci.mjs`（需 GITHUB_TOKEN 環境變數）。
3. iPhone／iPad：把 `package.json`、`dist`、`ios` 傳到 Mac → 在 Mac 的終端機執行 `ios/build-ipa.sh` → 上傳 `xiaoke-tray-ios.ipa`（檔名固定）到 Release。
4. Android：`python android/build.py` → 上傳成 `XiaokeTray-<版本>-android.apk`。
5. 沒有 gh CLI：用 `git credential fill` 取 token 打 GitHub API；JSON 用 Python 直接寫 UTF-8 檔再上傳（終端機輸出是 cp950 會亂碼）。

## 已知的坑

- PATH 裡的 `node`／`npx` 是 Node 20，vite 8 跑不動 → 直接用 nvm 的 Node 22 執行 `node_modules/.../bin`。
- 上游檔案是 CRLF；`.gitattributes` 已統一 LF，`ios/*.sh` 一定要 LF。
- `tar` 在 Git Bash 遇到 `C:` 路徑要加 `--force-local`。
- 語音教學：有些語音引擎 cancel 後不觸發 onend（用 `cutSpeech`）；Android WebView 沒有網頁語音（改用 Bridge 的系統 TTS）。
- Windows 靜默更新會裝到 `C:\Program Files\XiaokeTray`（全使用者捷徑）。
- 單一實例：使用者自己開著 App 時，測試腳本會連不上，要先徵求同意再關掉。
- Android：手機允許 USB 偵錯後 adb 仍 unauthorized → `adb kill-server` 後再 `adb devices`。
- iOS：`build-ipa.sh` 要在 Mac 畫面上的終端機跑（SSH 進去鑰匙圈鎖住，簽章會失敗）。
