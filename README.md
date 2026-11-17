# 小柯機器人3D托盤生成器

<img width="800" height="599" alt="image" src="https://github.com/user-attachments/assets/1f0c315f-a74a-47dc-a7b8-316dc1ec2fcf" />
示範說明

https://github.com/user-attachments/assets/58fa11ce-4a93-43e0-9c2b-edb9dea6f107


參數化 3D 列印托盤生成器：輸入幾個尺寸，看著 3D 模型一步步建出來，一鍵送到拓竹 **Bambu Studio** 切片列印，或下載 STL／3MF／STEP。

- **便當托盤**（首頁第一個）：寬、深、高、壁厚、底板、圓角；平均分格或自訂比例分格；隔板高度與厚度；可堆疊底腳；指扣缺口；標籤斜台；底板鏤空（圓孔、長槽、蜂巢、三角、方格）；8 個內建範本。
- 另含 Genstrio 的全部產生器：電子外殼、管接頭、抽屜收納盒、Gridfinity、掛鉤支架、文字標誌、齒輪、QR 圖碼、標誌浮雕、餅乾模具、透光浮雕、鉸鏈螺栓——介面全繁體中文。
- **送到 Bambu Studio**：桌面版自動找到 Bambu Studio（登錄檔／常見位置／可手動指定），3MF 存到「文件\小柯托盤」並直接開啟。
- **語音動態教學**：小柯機器人逐步框出畫面、邊說明邊示範操作（第一次開啟自動播放，之後按機器人按鈕重聽）。
- **版本更新**：桌面版查 GitHub Release，下載後自動安裝並重新開啟。
- 幾何由 OpenCascade（WebAssembly）在本機計算，不上傳任何檔案。

## 平台

| 平台 | 狀態 |
| --- | --- |
| Windows 11 | ✅ 安裝版＋免安裝版 |
| macOS（MacBook Pro） | ✅ v1.1.0 起（Apple 晶片＋Intel） |
| 線上版（HTML） | ✅ https://achir1015.github.io/xiaoke-tray/ （不用安裝；送到 Bambu Studio 改為下載 3MF） |
| iPhone／iPad | ✅ v1.2.0 起，線上安裝 https://achir1015.github.io/xiaoke-tray/ios/ （限已登記裝置） |
| Android | ✅ v1.2.0 起，Release 下載 `XiaokeTray-…-android.apk`（模型存到「下載／小柯托盤」） |

## 開發

需要 Node.js 22。

```bash
npm install
npm run dev          # 網頁開發伺服器
npm run app          # 建置後以 Electron 開啟桌面版
npm test             # 幾何測試（含 tests/tray.test.ts）
node e2e/desktop.mjs # 桌面版冒煙測試（加 --bambu 會真的送到 Bambu Studio）
npm run dist:win     # 產生 release/ 下的安裝檔與免安裝版
npm run icon         # 重新產生圖示（需要 Python + Pillow）
```

- `src/generators/build/tray.ts`、`meta.ts` 的 `tray`：托盤產生器
- `src/xiaoke.ts`：語音教學、更新、桌面橋接
- `src/i18n.ts`：英文、德文、繁體中文
- `electron/`：桌面版主程式（自訂協定 `xktray://`、Bambu Studio 串接、更新）

## 授權

本專案基於 [Genstrio](https://github.com/TechnikWeber/Genstrio)（© TechnikWeber），依 **AGPL-3.0-or-later** 授權釋出，完整原始碼公開。你產生的模型完全屬於你。
另使用 replicad (MIT)、OpenCascade (LGPL-2.1)、three.js (MIT)、fflate (MIT)、qrcode-generator (MIT)；字型均為 SIL OFL 1.1。

開發者：吳玉柱 先生與 Claude AI Opus 5.5
