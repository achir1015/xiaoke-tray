#!/bin/bash
# 把網頁（先在專案根目錄 npx vite build 產生 dist）複製到 ios/web，
# 版本號跟著 package.json，再產生 Xcode 專案。在 Mac 上執行：bash ios/sync.sh
set -e
cd "$(dirname "$0")"
[ -f ../dist/index.html ] || { echo "找不到 ../dist，請先執行 npx vite build"; exit 1; }
rm -rf web && cp -R ../dist web
rm -rf web/ios   # 安裝頁不用放進 App
V=$(python3 -c 'import json;print(json.load(open("../package.json"))["version"])')
# 版本號：1.2.0 → build 10200
B=$(python3 -c "a,b,c=(int(x) for x in '$V'.split('.'));print(a*10000+b*100+c)")
sed -i '' "s/MARKETING_VERSION: \".*\"/MARKETING_VERSION: \"$V\"/; s/CURRENT_PROJECT_VERSION: \".*\"/CURRENT_PROJECT_VERSION: \"$B\"/" project.yml
XG=$(command -v xcodegen || echo /usr/local/bin/xcodegen)
"$XG" generate --quiet
echo "web ok, version $V ($B)"
