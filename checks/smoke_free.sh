#!/usr/bin/env bash
# smoke_free.sh — 免费声档（第 0 档 edge-tts）全链路冒烟（3 镜短稿，零 LLM，零凭证）。
# 覆盖：起项目 → TTS(edge-tts 免费声+气口+口型包络) → 建帧(episode.smoke.mjs) →
#       FE 五步管线 → gate_redlines(pre) → render → gate_redlines(post, ffprobe)。
# 用途：改 skill / 换机部署 / 容器镜像验证后跑一次，绿了 = 机械链路可用（Waza test.yml 思路）。
# 消耗：零费用（edge-tts 免费）+ 约 2-4 分钟渲染。需联网。
set -uo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
PROJ="$SKILL/videos/_smoke_free"
# 必须 realpath(pwd -P):faceless-explainer 是 symlink,非真实路径调 captions.mjs 会静默退出 0
# 不产字幕(SKILL「依赖」节 2026-07-19 坑;本文件 2026-07-20 前就中过——字幕缺失但 smoke 报绿)
FE="$(cd "$HOME/.claude/skills/faceless-explainer/scripts" && pwd -P)"
TTSPY="${TTS_PYTHON:-python3}"

fail() { echo ""; echo "✗ SMOKE-FREE FAIL @ $1"; exit 1; }

echo "== smoke-free: 依赖检查 =="
"$TTSPY" -c "import requests, numpy, soundfile, faster_whisper, edge_tts" 2>/dev/null \
  || fail "TTS Python 缺依赖(requests/numpy/soundfile/faster-whisper/edge-tts) —— 建 venv 后 export TTS_PYTHON=<venv>/bin/python(见 README.md)"
[ -d "$FE" ] || fail "缺 faceless-explainer 管线脚本 $FE"
command -v ffprobe >/dev/null || fail "缺 ffprobe"
# 免费声档：不需要任何凭证

echo "== smoke-free: 起项目 =="
rm -rf "$PROJ"
bash "$SKILL/scripts/new_project.sh" "$PROJ" >/dev/null || fail "new_project.sh"
cd "$PROJ"

cat > SCRIPT.md <<'EOF'
# smoke — 口播稿

## Line 1 — 钩子 (Frame 1)
    AI 出片只要十分钟。

## Line 2 — 难点 (Frame 2)
    真正难的是把它做成系统。

## Line 3 — 落版 (Frame 3)
    这就是我们在做的事。
EOF

echo "== smoke-free: TTS =="
"$TTSPY" "$SKILL/scripts/tts_free.py" --script SCRIPT.md --out-dir . --gap-map "3" || fail "TTS"

cat > STORYBOARD.md <<'EOF'
---
format: portrait
title: smoke
---

## Frame 1 — 钩子
- duration: 3s
- transition_in: crossfade
- scene: 巨字「十分钟」+ 红下划线 draw-on
- voiceover: AI 出片只要十分钟。
- src: compositions/frames/01-hook.html

## Frame 2 — 难点
- duration: 3s
- transition_in: crossfade
- scene: 玻璃卡「做成系统」+ 红三角
- voiceover: 真正难的是把它做成系统。
- src: compositions/frames/02-system.html

## Frame 3 — 落版
- duration: 3s
- transition_in: crossfade
- scene: 巨字「我们在做」+ 红事件行，welcome 收尾
- voiceover: 这就是我们在做的事。
- src: compositions/frames/03-cta.html
EOF

echo "== smoke-free: 建帧 =="
cp "$SKILL/checks/episode.smoke.mjs" episode.mjs
node episode.mjs || fail "建帧"

echo "== smoke-free: FE 管线 =="
node "$FE/audio.mjs" sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md || fail "sync-durations"
node "$FE/captions.mjs" build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json || fail "captions"
node "$FE/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes . || fail "assemble"
node "$FE/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes . || fail "transitions inject"
node "$FE/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html || fail "transitions verify"

echo "== smoke-free: gate (pre-render) =="
node "$SKILL/scripts/gate_redlines.mjs" --project . || fail "gate pre-render"

echo "== smoke-free: render =="
mkdir -p renders
npx hyperframes render --quality high --protocol-timeout=900000 --output renders/video.mp4 || fail "render"

echo "== smoke-free: gate (post-render) =="
node "$SKILL/scripts/gate_redlines.mjs" --project . --render renders/video.mp4 || fail "gate post-render"

echo ""
echo "✓ SMOKE-FREE PASS → $PROJ/renders/video.mp4"
