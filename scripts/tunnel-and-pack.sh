#!/usr/bin/env bash
# 一键：起 cloudflared 快速隧道（无拦截页，Teams 可加载）→ 把公网 URL 套进 Tab-only
# 侧载 manifest → 打包 zip。前提：dev server 已在 5180（npm run dev）。
#
# 用法：  bash scripts/tunnel-and-pack.sh [dev端口，默认5180]
# 依赖：  cloudflared（brew install cloudflared 或 /tmp/cloudflared）
# 产物：  bipo-assistant.manifest.zip（可直接侧载）
set -euo pipefail

PORT="${1:-5180}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF="$(command -v cloudflared || echo /tmp/cloudflared)"
APP_ID="$(cat /tmp/bipo-appid 2>/dev/null || uuidgen | tr 'A-Z' 'a-z')"

echo "▶ dev 端口: $PORT ; cloudflared: $CF ; appId: $APP_ID"
[ -x "$CF" ] || { echo "❌ 找不到 cloudflared"; exit 1; }

# 起隧道，日志里抓 https://xxx.trycloudflare.com
LOG=/tmp/bipo-cf.log
pkill -f "cloudflared tunnel" 2>/dev/null || true
"$CF" tunnel --url "http://localhost:$PORT" > "$LOG" 2>&1 &
echo "▶ 等待隧道地址…"
URL=""
for i in $(seq 1 30); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "❌ 未取到隧道地址，看 $LOG"; tail -20 "$LOG"; exit 1; }
HOST="${URL#https://}"
echo "✅ 隧道: $URL"

# 套模板 → manifest.json（Tab-only 侧载版）
cd "$ROOT/manifest"
sed -e "s|__APP_ID__|$APP_ID|g" -e "s|__TAB_URL__|$URL|g" -e "s|__TAB_HOST__|$HOST|g" \
  manifest.sideload.template.json > manifest.json
echo "✅ 已生成 manifest/manifest.json (contentUrl=$URL/)"

# 打包
rm -f "$ROOT/bipo-assistant.manifest.zip"
zip -j -q "$ROOT/bipo-assistant.manifest.zip" manifest.json color.png outline.png
echo "✅ 打包完成: $ROOT/bipo-assistant.manifest.zip"
echo ""
echo "下一步：Teams → Apps → Manage your apps → Upload a custom app → 选该 zip"
echo "（隧道进程在后台，保持本终端/进程存活期间地址有效）"
