#!/bin/bash
# 在 Mac 上安裝指定的 dmg 到「應用程式」並跑冒煙測試。
# 用法：bash mac-install-test.sh <dmg> [--bambu]
set -e
DMG="$1"
shift || true
MP=$(hdiutil attach -nobrowse "$DMG" | grep -o '/Volumes/.*' | tail -1)
echo "掛載：$MP"
APP=$(ls -d "$MP"/*.app | head -1)
NAME=$(basename "$APP")
rm -rf "/Applications/$NAME"
cp -R "$APP" /Applications/
hdiutil detach -quiet "$MP"
xattr -dr com.apple.quarantine "/Applications/$NAME" 2>/dev/null || true
codesign --verify --deep --strict "/Applications/$NAME" && echo "簽章驗證通過"
EXE=$(ls "/Applications/$NAME/Contents/MacOS/" | head -1)
echo "已安裝：/Applications/$NAME（$EXE）"
cd ~/Developer/xiaoke-tray-test
git pull -q || true
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
XK_EXE="/Applications/$NAME/Contents/MacOS/$EXE" node e2e/desktop.mjs "$@"
