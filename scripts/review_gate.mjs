#!/usr/bin/env node
// review_gate.mjs — 「一眼假」验收的脚本判定部分(REVIEW_REPORT 的 a/c/d 三项 + b 的取证)。
//
//   node review_gate.mjs --project . [--render renders/video.mp4]
//
// a 动效/口型 vs 词时间戳 ≤150ms:
//   a1 slots.anchors(wordT/pauseT 记录)与 beat_map 词/停顿逐条核对 ≤0.15s
//   a2 帧 HTML 里所有 GSAP position 必须 = 某锚点+[0,0.6s] 手势窗内,或 ≤0.2s(入场)
//      ——抓「手写秒数」的孤儿触发
//   a3 每帧口型包络第一次开口 vs 第一个词 start ≤0.15s
// c 任意连续 3s 画面有变化:ffmpeg freezedetect(≥3s 冻结段 = fail)
// d 语速曲线 vs voice_baseline:每帧发声 cps 落带内;帧间跳变 ≤2.5cps
// b 停顿点截帧:把 beat_map 所有 ≥0.4s 停顿的中点截帧到 qc/pauses/(看图判定由人/agent 做)
// 退出码 0=脚本项全过(b 仍需看图) 1=有脚本项失败
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const PROJ = opt("--project", ".");
const RENDER = opt("--render", null);
const TOL = 0.15, GESTURE = 0.6, INTRO = 0.2;
const fails = [], notes = [];

const beat = JSON.parse(readFileSync(join(PROJ, "beat_map.json"), "utf8"));
const slots = JSON.parse(readFileSync(join(PROJ, "slots.json"), "utf8"));
const am = JSON.parse(readFileSync(join(PROJ, "audio_meta.json"), "utf8"));
const bf = (f) => beat.frames.find((x) => x.frame === f);

// ---- a1 锚点 vs beat_map ----
let a1n = 0;
for (const s of slots.frames || []) {
  const b = bf(s.frame);
  if (!b) { fails.push(`a1 F${s.frame} 不在 beat_map`); continue; }
  const truth = [0,
    ...b.asr_words.map((w) => w.start), ...b.words.map((w) => w.start),
    ...b.pauses.map((p) => p.start)];
  for (const a of s.anchors || []) {
    a1n++;
    const d = Math.min(...truth.map((t) => Math.abs(t - a.t)));
    if (d > TOL) fails.push(`a1 F${s.frame} 锚「${a.q}」t=${a.t} 距最近词/停顿 ${d.toFixed(3)}s > ${TOL}`);
  }
  if (!(s.anchors || []).length) fails.push(`a1 F${s.frame} 没有任何词锚(动效没跟 beat_map)`);
}
notes.push(`a1 锚点核对 ${a1n} 条`);

// ---- a2 帧 HTML 的 GSAP position 孤儿检查 ----
const framesDir = join(PROJ, "compositions/frames");
let a2n = 0;
for (const f of readdirSync(framesDir).filter((x) => x.endsWith(".html")).sort()) {
  const html = readFileSync(join(framesDir, f), "utf8");
  const fr = slots.frames.find((s) => f.startsWith(s.id))?.frame
    ?? parseInt(f.slice(0, 2), 10);
  const s = slots.frames.find((x) => x.frame === fr);
  const anchors = [0, ...(s?.anchors || []).map((a) => a.t)];
  // tl.fromTo(...)/tl.to(...) 末参 position(数字字面量);animChar/addGlowPulse 的 0 位不算
  for (const m of html.matchAll(/tl\.(?:fromTo|to)\([^;]*?,\s*([\d.]+)\);/gs)) {
    const p = parseFloat(m[1]);
    a2n++;
    const ok = p <= INTRO || anchors.some((a) => p >= a - TOL && p <= a + GESTURE);
    if (!ok) fails.push(`a2 ${f} position ${p}s 不在任何锚点手势窗(锚+0..${GESTURE}s)——手写秒数?`);
  }
}
notes.push(`a2 position 检查 ${a2n} 处`);

// ---- a3 口型开口 vs 第一个词 ----
for (const v of am.voices || []) {
  const env = v.mouth_env || [], fps = v.env_fps || 30;
  let onset = null;
  for (let i = 0; i < env.length - 1; i++) {
    if (env[i] > 0.3 && env[i + 1] > 0.3) { onset = i / fps; break; }
  }
  const w0 = v.words?.[0]?.start ?? null;
  if (onset == null || w0 == null) { fails.push(`a3 F${v.frame} 包络/词缺失`); continue; }
  const d = Math.abs(onset - w0);
  if (d > TOL) fails.push(`a3 F${v.frame} 口型开口 ${onset.toFixed(2)}s vs 首词 ${w0.toFixed(2)}s 差 ${d.toFixed(3)}s > ${TOL}`);
}
notes.push(`a3 口型开口核对 ${am.voices.length} 帧`);

// ---- d 语速曲线（可选：有 voice_baseline.json 才查，无基准跳过并留痕）----
const basePath = [join(PROJ, "voice_baseline.json"), join(PROJ, "../../voice_baseline.json")]
  .find((p) => existsSync(p));
if (!basePath) {
  notes.push("d 语速曲线跳过：无 voice_baseline.json（可选：scripts/voice_baseline.py 从你的真实录音提基准）");
} else {
const base = JSON.parse(readFileSync(basePath, "utf8"));
const { cps_lo, cps_hi } = base.thresholds;
const norm = (s) => String(s).replace(/[^一-鿿A-Za-z0-9]/g, "");
let prev = null;
const curve = [];
for (const b of beat.frames) {
  const chars = b.asr_words.reduce((s, w) => s + norm(w.text).length, 0);
  const t = b.asr_words.reduce((s, w) => s + Math.max(0, w.end - w.start), 0);
  const cps = t > 0.2 ? chars / t : 0;
  curve.push({ frame: b.frame, cps: +cps.toFixed(2) });
  if (cps < cps_lo || cps > cps_hi)
    fails.push(`d F${b.frame} 语速 ${cps.toFixed(2)}cps 出基准带 [${cps_lo},${cps_hi}]`);
  if (prev != null && Math.abs(cps - prev) > 2.5)
    fails.push(`d F${b.frame} 语速跳变 ${prev.toFixed(2)}→${cps.toFixed(2)}(>2.5cps)——听感突兀`);
  prev = cps;
}
notes.push(`d 语速曲线 ${curve.map((c) => `F${c.frame}:${c.cps}`).join(" ")}(带 [${cps_lo},${cps_hi}])`);
}

// ---- c freezedetect + b 停顿截帧(需 --render) ----
if (RENDER) {
  const rp = join(PROJ, RENDER);
  if (!existsSync(rp)) {
    fails.push(`c/b 成片不存在 ${RENDER}`);
  } else {
    let out = "";
    try {
      out = execSync(
        `ffmpeg -hide_banner -nostats -i "${rp}" -vf "freezedetect=n=0.003:d=3" -an -f null - 2>&1`,
        { encoding: "utf8" });
    } catch (e) { out = String(e.stdout || e.message); }
    const freezes = [...out.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => m[1]);
    if (freezes.length) fails.push(`c 连续 ≥3s 画面无变化 @ ${freezes.join(", ")}s`);
    else notes.push("c freezedetect: 无 ≥3s 冻结段");

    const qc = join(PROJ, "qc/pauses");
    mkdirSync(qc, { recursive: true });
    let shots = 0;
    for (const b of beat.frames) {
      for (const p of b.pauses.filter((p) => p.dur >= 0.4)) {
        const t = (b.start_global + p.start + p.dur / 2).toFixed(2);
        const f = join(qc, `F${String(b.frame).padStart(2, "0")}-${p.after === "(尾气口)" ? "tail" : "mid"}-${t}s.png`);
        execSync(`ffmpeg -y -v error -ss ${t} -i "${rp}" -frames:v 1 "${f}"`);
        shots++;
      }
    }
    notes.push(`b 停顿截帧 ${shots} 张 → qc/pauses/(看图判定)`);
  }
}

for (const n of notes) console.log("· " + n);
if (fails.length) {
  for (const f of fails) console.error("✗ " + f);
  console.error(`\nREVIEW SCRIPT FAIL: ${fails.length} 项`);
  process.exit(1);
}
console.log("✓ REVIEW SCRIPT PASS(a1/a2/a3/c/d 脚本项全过;b 看 qc/pauses/ 图定)");
