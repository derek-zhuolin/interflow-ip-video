#!/usr/bin/env bash
# prep_media.sh — 素材进项目的唯一关口(ffmpeg 封装,禁裸调)。
#
#   bash prep_media.sh <源文件> <项目根> [--dur <beat秒数>] [--id <素材id>]
#
# 视频:物理静音(去音轨)+ 裁至 min(beat, 4s) + 烘焙旋转/yuv420p(iPhone 竖拍假横屏坑)
#       + h264 faststart → public/media/<id>.mp4;产出后 ffprobe 验收(可解码/无音轨/时长)。
# 图片:HEIC/TIFF 转 png,PNG/JPG/WebP 直拷 → public/media/<id>.<ext>;验收可解码。
# 贴纸:svg/png 直拷 → public/media/stickers/<id>.<ext>。
#
# 物理裁剪是红线:「某段绝对不出声/不出现」只信文件层,播放窗口截断不算数。
set -uo pipefail

MAX_DUR=4          # B-roll 视频硬上限(秒)——红线,别调
SRC="${1:?用法: prep_media.sh <源文件> <项目根> [--dur <beat秒数>] [--id <素材id>]}"
PROJ="${2:?缺项目根}"
shift 2
DUR=""; ID=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dur) DUR="$2"; shift 2 ;;
    --id)  ID="$2";  shift 2 ;;
    *) echo "✗ 未知参数 $1"; exit 1 ;;
  esac
done

[ -f "$SRC" ] || { echo "✗ 源文件不存在: $SRC"; exit 1; }
[ -d "$PROJ" ] || { echo "✗ 项目根不存在: $PROJ"; exit 1; }
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || { echo "✗ 缺 ffmpeg/ffprobe"; exit 1; }

base="$(basename "$SRC")"; stem="${base%.*}"; ext_raw="${base##*.}"
ext="$(printf '%s' "$ext_raw" | tr '[:upper:]' '[:lower:]')"
name="${ID:-$stem}"

case "$ext" in
  mp4|mov|m4v|webm|avi|mkv)  KIND=video ;;
  png|jpg|jpeg|webp)         KIND=image ;;
  heic|heif|tif|tiff)        KIND=image_convert ;;
  svg)                       KIND=sticker ;;
  gif)                       echo "✗ gif 动图不 seek-safe,转 mp4 再来"; exit 1 ;;
  *) echo "✗ 不认识的格式 .$ext(视频 mp4/mov、图 png/jpg/heic、贴纸 svg/png)"; exit 1 ;;
esac

if [ "$KIND" = video ]; then
  mkdir -p "$PROJ/public/media"
  # 目标时长 = min(beat, 4s);没传 --dur 就直接 4s 上限
  T="$MAX_DUR"
  if [ -n "$DUR" ]; then
    T="$(awk -v d="$DUR" -v m="$MAX_DUR" 'BEGIN{printf "%.3f", (d<m)?d:m}')"
  fi
  OUT="$PROJ/public/media/$name.mp4"
  # -vf format=yuv420p 顺带烘焙 rotation flag(竖拍假横屏);-an 物理去音轨
  ffmpeg -y -v error -i "$SRC" -t "$T" -an \
    -vf "format=yuv420p" -c:v libx264 -preset medium -crf 18 -movflags +faststart \
    "$OUT" || { echo "✗ ffmpeg 转码失败: $SRC"; exit 1; }

  # —— 验收:可解码 / 无音轨 / 时长 ≤ 上限 ——
  vcodec="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$OUT" 2>/dev/null)"
  [ -n "$vcodec" ] || { echo "✗ 验收失败:产物无可解码视频流 $OUT"; exit 1; }
  acodec="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$OUT" 2>/dev/null)"
  [ -z "$acodec" ] || { echo "✗ 验收失败:产物仍带音轨($acodec)$OUT"; exit 1; }
  d="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")"
  awk -v d="$d" -v t="$T" 'BEGIN{exit (d <= t + 0.15) ? 0 : 1}' \
    || { echo "✗ 验收失败:时长 ${d}s > 目标 ${T}s"; exit 1; }
  echo "✓ video → $OUT(${d%$'\n'}s · $vcodec · 无音轨)"

elif [ "$KIND" = image_convert ]; then
  mkdir -p "$PROJ/public/media"
  OUT="$PROJ/public/media/$name.png"
  if command -v sips >/dev/null; then
    sips -s format png "$SRC" --out "$OUT" >/dev/null || { echo "✗ sips 转换失败: $SRC"; exit 1; }
  else
    ffmpeg -y -v error -i "$SRC" "$OUT" || { echo "✗ ffmpeg 转换失败: $SRC"; exit 1; }
  fi
  ffprobe -v error "$OUT" >/dev/null 2>&1 || { echo "✗ 验收失败:产物不可解码 $OUT"; exit 1; }
  echo "✓ image → $OUT"

elif [ "$KIND" = image ]; then
  mkdir -p "$PROJ/public/media"
  OUT="$PROJ/public/media/$name.$ext"
  cp "$SRC" "$OUT"
  ffprobe -v error "$OUT" >/dev/null 2>&1 || { echo "✗ 验收失败:产物不可解码 $OUT"; exit 1; }
  echo "✓ image → $OUT"

else # sticker(svg 直拷;png 贴纸走 image 分支后手挪也行,推荐 --id 命名)
  mkdir -p "$PROJ/public/media/stickers"
  OUT="$PROJ/public/media/stickers/$name.$ext"
  cp "$SRC" "$OUT"
  head -c 512 "$OUT" | grep -qi "<svg" || { echo "✗ 验收失败:不是 svg 文件 $OUT"; exit 1; }
  echo "✓ sticker → $OUT"
fi
