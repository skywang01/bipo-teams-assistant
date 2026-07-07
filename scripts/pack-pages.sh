#!/usr/bin/env bash
# 把 GitHub Pages 地址套进 Tab-only manifest 并打包成可侧载的 zip。
# 用法：  bash scripts/pack-pages.sh https://<用户>.github.io/<repo>/
# 产物：  bipo-assistant.manifest.zip
set -euo pipefail

URL="${1:-}"
[ -n "$URL" ] || { echo "用法: bash scripts/pack-pages.sh https://<用户>.github.io/<repo>/"; exit 1; }
URL="${URL%/}/"                       # 规范化：确保结尾有一个 /
HOST="$(echo "$URL" | sed -E 's|https?://||; s|/.*||')"   # 取域名（validDomains 用）
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ID="$(cat /tmp/bipo-appid 2>/dev/null || uuidgen | tr 'A-Z' 'a-z')"

cd "$ROOT/manifest"
sed -e "s|__APP_ID__|$APP_ID|g" \
    -e "s|__TAB_URL__|${URL%/}|g" \
    -e "s|__TAB_HOST__|$HOST|g" \
    manifest.sideload.template.json > manifest.json

rm -f "$ROOT/bipo-assistant.manifest.zip"
zip -j -q "$ROOT/bipo-assistant.manifest.zip" manifest.json color.png outline.png
echo "✅ 打包完成: $ROOT/bipo-assistant.manifest.zip"
echo "   contentUrl = ${URL}"
echo "   validDomains = ${HOST}"
echo "   appId = ${APP_ID}"
echo ""
echo "下一步：在你的 M365 开发者租户 Teams → 应用 → 管理你的应用 → 上传自定义应用 → 选该 zip"
