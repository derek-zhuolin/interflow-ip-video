#!/usr/bin/env bash
# smoke_media.sh — 素材全链路冒烟(3 图+1 视频,零 LLM)。GOAL:形式库扩容验收第 6 条。
# 覆盖:素材合成(视频故意带音轨+7s)→ 项目层 manifest + media_lib 合并 → prep_media
#       (静音/裁剪/验收)→ TTS → 建帧(generator-base 机器 + smoke-media.configs 拼接,
#       含 media-full/pip/bg/avatar 降级/纯文字回退/贴纸)→ FE 五步管线 → inject_broll →
#       gate(含媒体红线) → render → gate post。
# 消耗:一次 6 句短稿火山 TTS(几分钱)+ 约 3-6 分钟渲染。
set -uo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
PROJ="$SKILL/videos/_smoke_media"
FE="$HOME/.claude/skills/faceless-explainer/scripts"
TTSPY="${TTS_PYTHON:-python3}"

fail() { echo ""; echo "✗ SMOKE-MEDIA FAIL @ $1"; exit 1; }

echo "== smoke-media: 依赖检查 =="
"$TTSPY" -c "import requests, numpy, soundfile, faster_whisper" 2>/dev/null \
  || fail "TTS Python 缺依赖(requests/numpy/soundfile/faster-whisper) —— 建 venv 后 export TTS_PYTHON=<venv>/bin/python(见 README.md)"
[ -d "$FE" ] || fail "缺 faceless-explainer 管线脚本 $FE"
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || fail "缺 ffmpeg/ffprobe"
[ -f "$SKILL/.env" ] || fail "缺火山凭证 .env —— cp .env.example .env 填入你自己的火山凭证(见 README.md)"

echo "== smoke-media: 起项目 =="
rm -rf "$PROJ"
bash "$SKILL/scripts/new_project.sh" "$PROJ" >/dev/null || fail "new_project.sh"
cd "$PROJ"

echo "== smoke-media: 合成素材(3 图 + 1 条 7s 带音轨视频)=="
mkdir -p assets/broll
ffmpeg -y -v error -f lavfi -i "gradients=s=1080x1440:c0=0x1B2B4A:c1=0x0B0E13:nb_colors=2" -frames:v 1 assets/broll/img-a.png 2>/dev/null \
  || ffmpeg -y -v error -f lavfi -i "testsrc2=s=1080x1440" -frames:v 1 assets/broll/img-a.png || fail "img-a"
ffmpeg -y -v error -f lavfi -i "gradients=s=1080x1920:c0=0x3A2437:c1=0x0C0C0F:nb_colors=2" -frames:v 1 assets/broll/img-b.png 2>/dev/null \
  || ffmpeg -y -v error -f lavfi -i "testsrc2=s=1080x1920" -frames:v 1 assets/broll/img-b.png || fail "img-b"
ffmpeg -y -v error -f lavfi -i "gradients=s=1080x1440:c0=0x14332B:c1=0x0B0E13:nb_colors=2" -frames:v 1 assets/broll/img-c.png 2>/dev/null \
  || ffmpeg -y -v error -f lavfi -i "testsrc2=s=1080x1440" -frames:v 1 assets/broll/img-c.png || fail "img-c"
ffmpeg -y -v error -f lavfi -i "testsrc2=s=720x1280:r=30" -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -t 7 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest assets/broll/site-clip-raw.mp4 || fail "site-clip-raw"

cat > assets/broll/manifest.json <<'EOF'
{
  "version": 1,
  "kind": "broll",
  "items": [
    { "id": "img-a", "type": "image", "path": "img-a.png", "tags": ["工作室", "日常"], "desc": "工作室日常(冒烟合成图)", "duration": null },
    { "id": "img-b", "type": "image", "path": "img-b.png", "tags": ["系统", "底层"], "desc": "系统底层(冒烟合成图)", "duration": null },
    { "id": "img-c", "type": "image", "path": "img-c.png", "tags": ["城市", "夜景"], "desc": "语义未命中样张——应保持未使用(回退纸雕/图表)", "duration": null },
    { "id": "site-clip", "type": "video", "path": "site-clip-raw.mp4", "tags": ["出发", "工作台", "快"], "desc": "7s 带音轨原素材(prep 应裁 ≤4s + 物理静音)", "duration": 7.0 }
  ]
}
EOF

echo "== smoke-media: media_lib 合并(库贴纸 + 项目 broll)=="
LIB="$(node "$SKILL/scripts/media_lib.mjs" list --project . 2>&1)" || fail "media_lib list"
echo "$LIB" | grep -q "site-clip" || fail "合并清单缺项目层 broll"
echo "$LIB" | grep -q "arrow-red" || fail "合并清单缺库层贴纸"

echo "== smoke-media: prep_media(静音/裁剪/验收)=="
bash "$SKILL/scripts/prep_media.sh" assets/broll/img-a.png . --id img-a || fail "prep img-a"
bash "$SKILL/scripts/prep_media.sh" assets/broll/img-b.png . --id img-b || fail "prep img-b"
bash "$SKILL/scripts/prep_media.sh" assets/broll/site-clip-raw.mp4 . --id site-clip || fail "prep site-clip"
bash "$SKILL/scripts/prep_media.sh" "$SKILL/assets/stickers/arrow-red.svg" . --id arrow-red || fail "prep arrow-red"
bash "$SKILL/scripts/prep_media.sh" "$SKILL/assets/stickers/spark-white.svg" . --id spark-white || fail "prep spark-white"
# img-c 故意不 prep = 语义未命中素材保持未使用(回退路径)

cat > SCRIPT.md <<'EOF'
# smoke-media — 口播稿

## Line 1 — 日常 (Frame 1)
    这是我们工作室的日常。

## Line 2 — 出发 (Frame 2)
    每一条片子都从这里出发。

## Line 3 — 系统 (Frame 3)
    底层是同一套系统。

## Line 4 — 当面 (Frame 4)
    我来当面说一句。

## Line 5 — 关注 (Frame 5)
    关注我们，看更多实验。

## Line 6 — 落版 (Frame 6)
    出片，就是这么快。
EOF

echo "== smoke-media: TTS =="
"$TTSPY" "$SKILL/scripts/tts_clone.py" --script SCRIPT.md --out-dir . --gap-map "3,6" || fail "TTS"
grep -q '"voice_type"' audio_meta.json || fail "audio_meta 缺 voice_type(音色红线数据源)"

cat > STORYBOARD.md <<'EOF'
---
format: portrait
title: smoke-media
---

## Frame 1 — 日常
- duration: 3s
- transition_in: crossfade
- scene: media-full 图 img-a + 巨字「工作室日常」+ 红下划线 + 星芒贴纸
- voiceover: 这是我们工作室的日常。
- media: broll:img-a (media-full)
- src: compositions/frames/01-full.html

## Frame 2 — 出发
- duration: 3s
- transition_in: cut
- scene: media-pip 视频 site-clip + 巨字「从这里出发」红点
- voiceover: 每一条片子都从这里出发。
- media: broll:site-clip (media-pip)
- src: compositions/frames/02-pip.html

## Frame 3 — 系统
- duration: 3s
- transition_in: crossfade
- scene: media-bg 图 img-b 暗化垫底 + 巨字「同一套系统」红下划线
- voiceover: 底层是同一套系统。
- media: broll:img-b (media-bg)
- src: compositions/frames/03-bg.html

## Frame 4 — 当面
- duration: 3s
- transition_in: crossfade
- scene: avatar-frame 数字人段(local-rig 大小人居中)
- voiceover: 我来当面说一句。
- media: none
- src: compositions/frames/04-avatar.html

## Frame 5 — 关注
- duration: 3s
- transition_in: cut
- scene: 纯文字回退帧 + 红箭头贴纸(该帧唯一红)
- voiceover: 关注我们，看更多实验。
- media: none
- src: compositions/frames/05-cta.html

## Frame 6 — 落版
- duration: 3s
- transition_in: crossfade
- scene: media-bg 视频 site-clip(under 注入)+ 巨字「就是这么快」红徽章
- voiceover: 出片，就是这么快。
- media: broll:site-clip (media-bg)
- src: compositions/frames/06-bgvid.html
EOF

echo "== smoke-media: 建帧(generator-base 机器 + smoke 配置拼接)=="
SKILL_DIR="$SKILL" python3 - <<'PY' || fail "拼接 episode.mjs"
import os
skill = os.environ["SKILL_DIR"]
base = open(os.path.join(skill, "assets/generator-base.mjs")).read()
head, rest = base.split("const F = [];", 1)
tail = rest.split("/* ====================== END FRAME CONFIGS ====================== */", 1)[1]
cfgs = open(os.path.join(skill, "checks/smoke-media.configs.mjs")).read()
open("episode.mjs", "w").write(
    head + "const F = [];\n" + cfgs
    + "\n/* ============ END FRAME CONFIGS(smoke-media 拼接自 generator-base)============ */" + tail)
PY
BUILD_LOG="$(node episode.mjs 2>&1)" || { echo "$BUILD_LOG"; fail "建帧"; }
echo "$BUILD_LOG"
echo "$BUILD_LOG" | grep -q "降级 local-rig" || fail "heygen 未触发自动降级 warn"
grep -rq "<video" compositions/frames/ && fail "帧内出现 <video>(子合成媒体 = assemble HARD FAIL)"
# 小人开标签必须闭合(模板改坏一次:style 后丢 > → 小人全片消失,像素上极难察觉)
MISS="$(grep -L 'pointer-events:none;">' compositions/frames/*.html || true)"
[ -z "$MISS" ] || fail "IP 小人开标签未闭合(char 模板损坏): $MISS"
[ -f slots.json ] || fail "slots.json 未产出"
grep -q '"provider": "local-rig"' slots.json || fail "slots.json avatar 未降级 local-rig"

echo "== smoke-media: FE 管线 =="
node "$FE/audio.mjs" sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md || fail "sync-durations"
node "$FE/captions.mjs" build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json || fail "captions"
node "$FE/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes . || fail "assemble"
node "$FE/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes . || fail "transitions inject"
node "$FE/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html || fail "transitions verify"

echo "== smoke-media: inject_broll =="
node "$SKILL/scripts/inject_broll.mjs" --project . || fail "inject_broll"
N=$(grep -c 'data-broll="1"' index.html || true)
[ "$N" = "2" ] || fail "index.html 注入视频数 $N != 2(F2 over + F6 under)"

echo "== smoke-media: gate (pre-render, 含媒体红线) =="
node "$SKILL/scripts/gate_redlines.mjs" --project . || fail "gate pre-render"

echo "== smoke-media: render =="
mkdir -p renders
npx hyperframes render --quality high --protocol-timeout=900000 --output renders/video.mp4 || fail "render"

echo "== smoke-media: gate (post-render) =="
node "$SKILL/scripts/gate_redlines.mjs" --project . --render renders/video.mp4 || fail "gate post-render"

echo ""
echo "✓ SMOKE-MEDIA PASS → $PROJ/renders/video.mp4"
