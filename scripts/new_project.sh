#!/usr/bin/env bash
# new_project.sh <project-dir> — 起一个 interflow-ip-video 项目：
# hyperframes init（限时，防 skill-link 步骤卡死）+ 拷入设计系统/人物/玻璃字幕皮肤。
set -uo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DST="${1:?用法: new_project.sh <project-dir>}"

if [ ! -f "$DST/hyperframes.json" ]; then
  # init 的 skill 链接阶段可能极慢；核心文件几秒就落盘，90s 后放弃等待并自检
  timeout 90 npx hyperframes init "$DST" --non-interactive --example=blank >/dev/null 2>&1 || true
fi
[ -f "$DST/hyperframes.json" ] || { echo "✗ init 失败：$DST/hyperframes.json 不存在"; exit 1; }

mkdir -p "$DST/public" "$DST/.hyperframes" "$DST/compositions/frames" "$DST/audio"
cp "$SKILL/assets/frame.md"          "$DST/frame.md"
cp "$SKILL/assets/character.svg"     "$DST/public/character.svg"
cp "$SKILL/assets/caption-skin.html" "$DST/.hyperframes/caption-skin.html"

echo "✓ 项目就绪: $DST"
echo "  下一步: 写 SCRIPT.md → tts_clone.py → STORYBOARD.md → cp $SKILL/assets/generator-base.mjs episode.mjs"
