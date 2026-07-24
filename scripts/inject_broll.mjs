#!/usr/bin/env node
// inject_broll.mjs — 把视频 B-roll 注入 index.html root(框架 archetype B)。
//
// 为什么存在:子合成(帧 HTML)里出现 <video> = assemble HARD FAIL(运行时只驱动
// host root 直属媒体)。帧内只画占位窗,真 <video> 由本脚本在 transitions verify
// 之后注入 index.html。渲染链(FE 脚本)零改动。
//
// 用法: node <SKILL_DIR>/scripts/inject_broll.mjs --project .
// 读:  slots.json(生成器产出;media.type=video 的帧)+ audio_meta.json(帧起点累计)
// 写:  index.html(幂等——先剥掉旧的 data-broll 元素再注)
//
// 时间:视频窗口 = 帧起点起 min(素材实际时长, 帧时长);素材已被 prep_media.sh
//       物理裁到 ≤4s。track lane 40+i,每条视频独占一轨(不与 0/1/2/10/11/20+ 冲突)。
// 层级:layer=under 插在 root 开标签后(所有帧之下,media-bg 用——帧背景改半透明露出它);
//       layer=over 插在 captions 之前(帧之上字幕之下,media-full/pip 用)。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PROJ = opt("--project", ".");
const die = (m) => { console.error("✗ inject_broll: " + m); process.exit(1); };

const slotsPath = join(PROJ, "slots.json");
const indexPath = join(PROJ, "index.html");
const amPath = join(PROJ, "audio_meta.json");
if (!existsSync(indexPath)) die("index.html 不存在——先跑 assemble/transitions");
if (!existsSync(slotsPath)) { console.log("✓ 无 slots.json,无可注入视频(纯图/无素材项目跳过)"); process.exit(0); }

const slots = JSON.parse(readFileSync(slotsPath, "utf8"));
const vids = (slots.frames || []).filter((f) => f.media && f.media.type === "video");
let html = readFileSync(indexPath, "utf8");
// 幂等:剥掉上一轮注入的元素
html = html.replace(/[ \t]*<video[^>]*data-broll="1"[^>]*><\/video>\n?/g, "");
if (!vids.length) {
  writeFileSync(indexPath, html);
  console.log("✓ slots.json 无视频素材,无可注入(已清理旧注入)");
  process.exit(0);
}

if (!existsSync(amPath)) die("audio_meta.json 不存在——帧起点无从计算");
const am = JSON.parse(readFileSync(amPath, "utf8"));
const startOf = new Map(); // frame 号 → 累计起点(与 assemble 的 STORYBOARD 累计一致,来源都是 sync 后时长)
const durOf = new Map();
{
  let acc = 0;
  for (const v of (am.voices || []).slice().sort((a, b) => a.frame - b.frame)) {
    startOf.set(v.frame, Math.round(acc * 1000) / 1000);
    durOf.set(v.frame, v.duration_s || 0);
    acc += v.duration_s || 0;
  }
}

const probeDur = (p) => {
  try { return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`, { encoding: "utf8" }).trim()); }
  catch { return NaN; }
};

const under = [];
const over = [];
vids.forEach((f, i) => {
  const m = f.media;
  const abs = join(PROJ, m.path);
  if (!existsSync(abs)) die(`F${f.frame} 素材不存在: ${m.path}(先跑 prep_media.sh)`);
  const start = startOf.get(f.frame);
  const frameDur = durOf.get(f.frame);
  if (start == null || !frameDur) die(`F${f.frame} 在 audio_meta 里找不到时长/起点`);
  const fileDur = probeDur(abs);
  if (!Number.isFinite(fileDur) || fileDur <= 0) die(`F${f.frame} 素材不可解码: ${m.path}`);
  const dur = Math.round(Math.min(fileDur, frameDur) * 1000) / 1000;
  const b = m.box || { x: 0, y: 0, w: 1080, h: 1920, r: 0 };
  const el =
    `      <video data-broll="1" id="el-broll-${String(f.frame).padStart(2, "0")}" class="clip" src="${m.path}" muted playsinline preload="auto" ` +
    `data-start="${start}" data-duration="${dur}" data-track-index="${40 + i}" ` +
    `style="position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;object-fit:cover;` +
    `${b.r ? `border-radius:${b.r}px;` : ""}"></video>\n`;
  (m.layer === "under" ? under : over).push(el);
  console.log(`  F${String(f.frame).padStart(2, "0")} ${m.id} → ${m.layer || "over"} @${start}s ×${dur}s(素材 ${fileDur.toFixed(2)}s)`);
});

if (under.length) {
  const rootOpen = html.match(/<div\s+id="root"[\s\S]*?>/);
  if (!rootOpen) die("index.html 找不到 root 开标签");
  const at = rootOpen.index + rootOpen[0].length;
  html = html.slice(0, at) + "\n" + under.join("") + html.slice(at);
}
if (over.length) {
  const anchor = html.indexOf("<!-- captions -->");
  if (anchor >= 0) {
    const lineStart = html.lastIndexOf("\n", anchor) + 1;
    html = html.slice(0, lineStart) + over.join("") + html.slice(lineStart);
  } else {
    // 没有字幕层时兜底:插在 root 收尾 </div> 前
    const close = html.lastIndexOf("    </div>");
    if (close < 0) die("index.html 找不到插入锚点");
    html = html.slice(0, close) + over.join("") + html.slice(close);
  }
}

writeFileSync(indexPath, html);
console.log(`✓ 注入 ${vids.length} 条视频 B-roll(under ${under.length} / over ${over.length})→ index.html`);
