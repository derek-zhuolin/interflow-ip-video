#!/usr/bin/env node
// gate_redlines.mjs — interflow-ip-video 无人值守硬校验（exit-1 gate 模式）。
// 把可脚本化的红线从"文档约束靠 agent 自律"转成硬校验：不过 = exit 1 + 打印修法。
//
// 用法（在项目根目录）:
//   node <SKILL_DIR>/scripts/gate_redlines.mjs [--project .] [--render renders/video.mp4]
//   --render 传成片路径时追加 ffprobe 校验（双流 + 时长 vs 语音总长）。
//
// 检查项：
//   1 STORYBOARD frontmatter format: portrait（缺 = 整片横屏）+ src 帧文件存在
//   2 audio_meta voices 数 = STORYBOARD 帧数；每帧尾部气口 ≥0.25s（防语音墙对墙回归）
//   2b 字幕产物：caption_groups.json 存在且 groups>0、compositions/captions.html 存在、
//     index.html 挂了字幕轨（symlink 坑：FE 非 realpath 调 captions.mjs 会静默退出 0，
//     字幕整条缺失但其余全绿——2026-07-20 实锤 smoke.sh 自己就中过）
//   3 逐帧 HTML：data-draw 容器必须带 vz（否则 draw-on 静默失效，pitfalls 实战坑）、
//     data-track-index 帧内唯一、根节点带 data-composition-id、template 外无 style/script、
//     红色元素计数（0 个 = warn 可能缺强调；>4 个 = error 红色泛滥）
//   3b 设计 DNA v2（2026-07-20，规范 frame-recipes「设计 DNA v2/动效系统」）：
//     字号只取 8 档字阶 {26,34,44,64,92,130,180,260}（SVG viewBox 内是另一坐标空间不查）、
//     每帧 distinct 字号 ≤4 档、GSAP 禁 `*.in` ease（入场 ease-out/在场 inOut，Emil 红线）、
//     禁 scale(0)/scale:0 入场（无物从无而来；面板 0.92+/小件 ≥0.6）
//   4 npx hyperframes lint --json errorCount 必须 = 0
//   5 [--render] ffprobe：视频+音频双流、时长与语音总长偏差 ≤1.5s
//   6 slots.json 媒体红线（只查声明层,不看像素;无 slots.json 的扩容前老项目跳过）：
//     连续纯文字帧 ≤2、非纯文字帧占比 ≥40%、引用素材存在且可解码（视频 B-roll 加验
//     无音轨 + ≤4s,即必须过 prep_media.sh）、贴纸 ≤2/帧且外接盒不入字幕安全区
//     （y≥1500）、全片仅允许一个音色（audio_meta/slots 的 voice_type 全集 ≤1）、
//     avatar provider 只认 local-rig（heygen 未接入,声明到 slots = 生成器降级失效）
//
// 注意：字幕零红不在此检查（captions.mjs 强插的红色块由 caption-skin 特异性覆盖，
//   文件里红 hex 仍存在属预期，见 pitfalls「暗底字幕 token 反转」）。
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PROJ = opt("--project", ".");
const RENDER = opt("--render", null);
const errors = [];
const warns = [];

// ---- 1 STORYBOARD ----
let sbFrameCount = 0;
const sbPath = join(PROJ, "STORYBOARD.md");
if (!existsSync(sbPath)) {
  errors.push("STORYBOARD.md 不存在");
} else {
  const sb = readFileSync(sbPath, "utf8");
  if (!/^---[\s\S]*?\bformat:\s*portrait\b[\s\S]*?---/m.test(sb))
    errors.push("STORYBOARD.md 缺 YAML frontmatter `format: portrait` —— assemble 会按 1920x1080 横屏出片");
  for (const m of sb.matchAll(/^- src:\s*(\S+)/gm))
    if (!existsSync(join(PROJ, m[1]))) errors.push(`STORYBOARD src 不存在: ${m[1]} —— 先跑 node episode.mjs 建帧`);
  sbFrameCount = [...sb.matchAll(/^## Frame /gm)].length;
  if (sbFrameCount === 0) errors.push("STORYBOARD.md 没有任何 `## Frame` 段");
}

// ---- 2 audio_meta ----
const amPath = join(PROJ, "audio_meta.json");
let audioTotal = 0;
let amData = null; // 检查 6e(音色唯一)复用
if (!existsSync(amPath)) {
  errors.push("audio_meta.json 不存在 —— 先跑 tts_clone.py");
} else {
  const am = JSON.parse(readFileSync(amPath, "utf8"));
  amData = am;
  const voices = am.voices || [];
  audioTotal = voices.reduce((s, v) => s + (v.duration_s || 0), 0);
  if (sbFrameCount && voices.length !== sbFrameCount)
    errors.push(`audio_meta voices(${voices.length}) != STORYBOARD 帧数(${sbFrameCount}) —— 改稿后必须整链重跑`);
  for (const v of voices) {
    const lastEnd = v.words?.length ? v.words[v.words.length - 1].end : 0;
    const gap = (v.duration_s || 0) - lastEnd;
    if (gap < 0.25)
      errors.push(`F${String(v.frame).padStart(2, "0")} 尾部气口 ${gap.toFixed(2)}s < 0.25s —— 语音墙对墙听着喘，检查 tts_clone.py 气口参数`);
  }
}

// ---- 2b 字幕产物（症状：FE 用 symlink 路径调 captions.mjs → 静默退出 0，字幕缺失但其余全绿） ----
const cgPath = join(PROJ, "caption_groups.json");
if (!existsSync(cgPath)) {
  errors.push("caption_groups.json 不存在 —— 步骤 6 captions build 没跑或静默退出（FE 必须 pwd -P realpath，SKILL「依赖」节）");
} else {
  let cgGroups = 0;
  try { cgGroups = (JSON.parse(readFileSync(cgPath, "utf8")).groups || []).length; } catch { /* 空文件/坏 JSON = 0 */ }
  if (!cgGroups)
    errors.push("caption_groups.json 空/0 组 —— captions.mjs 静默退出（symlink 坑）：FE 用 $(cd …/scripts && pwd -P) 重跑步骤 6");
  else if (!existsSync(join(PROJ, "compositions/captions.html")))
    errors.push("compositions/captions.html 不存在 —— captions build 产物不完整，重跑步骤 6");
}
const idxPath = join(PROJ, "index.html");
if (existsSync(idxPath) && !readFileSync(idxPath, "utf8").includes("captions.html"))
  errors.push("index.html 未挂字幕轨（无 captions.html 引用）—— captions build 后必须重跑 assemble，字幕缺失渲出来才发现 = 白渲");

// ---- 3 逐帧 HTML ----
const framesDir = join(PROJ, "compositions/frames");
if (!existsSync(framesDir)) {
  errors.push("compositions/frames 不存在");
} else {
  for (const f of readdirSync(framesDir).filter((x) => x.endsWith(".html")).sort()) {
    const html = readFileSync(join(framesDir, f), "utf8");
    const markup = html.split(/<script/i)[0]; // 标记区（首个 script 之前）

    // data-draw 容器必须带 vz（DRAWSETUP 选择器是 .vz [data-draw]，漏 vz = draw-on 静默失效）
    const parts = markup.split(/class="clip/);
    for (let i = 1; i < parts.length; i++) {
      const seg = parts[i];
      const cls = "clip" + seg.slice(0, Math.max(0, seg.indexOf('"')));
      // 该 clip 容器的内容 = 本段直到下一个 clip 开头
      if (seg.includes("data-draw") && !/\bvz\b/.test(cls))
        errors.push(`${f}: data-draw 所在容器缺 vz class（class="${cls}"）—— draw-on 会静默失效，路径帧首整条可见`);
    }

    // track-index 帧内唯一
    const tis = [...html.matchAll(/data-track-index="(\d+)"/g)].map((m) => m[1]);
    if (new Set(tis).size !== tis.length)
      errors.push(`${f}: data-track-index 有重复 —— 会报 overlapping_clips_same_track（别手改生成器的自增）`);

    // 根节点契约
    if (!/data-composition-id=/.test(html))
      errors.push(`${f}: 根节点缺 data-composition-id —— 交叉溶解 inject 需要它`);

    // style/script 必须在 template 内
    const beforeTemplate = html.split("<template>")[0] || "";
    if (/<style|<script/i.test(beforeTemplate))
      errors.push(`${f}: <template> 之外有 style/script —— 运行时只克隆 template 内容，外面的全丢`);

    // 红色计数：零红检查扫全 markup（含 <style> 里的类定义），泛滥检查只数内联标签
    const redAny = /#E63946/i.test(markup);
    const redEls = (markup.match(/<[^>]*#E63946[^>]*>/gi) || []).length;
    if (!redAny) warns.push(`${f}: 全帧（含 style）没有 #E63946 —— 检查该帧是否缺"一处红"强调`);
    if (redEls > 4) errors.push(`${f}: 含红色的内联元素 ${redEls} 个（>4）—— 红线：每帧视觉上红只出现一处`);

    // 3b-1 字阶（设计 DNA v2）：SVG 内部是 viewBox 单位空间（缩放后语义不同）→ 剔除后再查；
    //      COMMON 的 .kick{...34px} 定义每帧都带，剔掉它只数配置真正写下的字号
    const TYPE_SCALE = new Set([26, 34, 44, 64, 92, 130, 180, 260]);
    const T_CLASS = { note: 26, label: 34, body: 44, h3: 64, h2: 92, h1: 130, giant: 180, mega: 260 };
    // 基座 COMMON 的 .kick 与 8 条 .t-* 工具类定义**每帧都带**，不代表该帧用了它们 —— 先剔除定义，
    // 再把 markup 里真正 class="t-xxx" 用到的档位计回（否则任何用 v2 基座的项目都被误判成「8 档」FAIL）
    const noSvg = markup.replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/\.kick\s*\{[^}]*\}/, "")
      .replace(/\.t-(?:note|label|body|h3|h2|h1|giant|mega)\s*\{[^}]*\}/g, "");
    const sizes = [...noSvg.matchAll(/font-size:\s*([\d.]+)px/gi)].map((m) => parseFloat(m[1]));
    for (const [k, v] of Object.entries(T_CLASS))
      if (new RegExp(`class="[^"]*\\bt-${k}\\b`).test(markup)) sizes.push(v);
    const offScale = [...new Set(sizes.filter((n) => !TYPE_SCALE.has(n)))];
    if (offScale.length)
      errors.push(`${f}: 字号 ${offScale.join("/")}px 不在 8 档字阶 {26,34,44,64,92,130,180,260} —— 取最近档，别发明中间值（SVG viewBox 内除外；frame-recipes「设计 DNA v2」）`);
    const distinctFs = new Set(sizes);
    if (distinctFs.size > 4)
      errors.push(`${f}: 帧内 distinct 字号 ${distinctFs.size} 档（${[...distinctFs].join("/")}）> 4 —— 层级多 = 没层级，减档（guizang DNA）`);

    // 3b-2 动效红线（Emil）：入场永不 ease-in；无物从无而来（scale(0) 禁）
    const easeIn = [...html.matchAll(/ease:\s*["'](?:power[1-4]|expo|circ|sine|back|elastic|bounce|quad|cubic|quart|quint|slow|steps)\.in["']/gi)];
    if (easeIn.length)
      errors.push(`${f}: GSAP "*.in" ease ${easeIn.length} 处 —— 红线：入场/UI 永不 ease-in（起步慢在观众正盯着的那一刻）；入场 EASE.enter、在场移动 EASE.move`);
    if (/scale\s*[:(]\s*0(?![.\d])/.test(html))
      errors.push(`${f}: scale(0)/scale:0 入场 —— 红线：无物从无而来；面板从 0.92 起、小件 ≥0.6（frame-recipes「动效系统·物理感」）`);
  }
}

// ---- 6 slots.json 媒体红线(只查声明层,不看像素) ----
const slotsPath = join(PROJ, "slots.json");
if (!existsSync(slotsPath)) {
  // 扩容前老项目没有 slots.json:媒体红线跳过;但帧里已引用素材却无声明 = 生成器过旧,必须报
  let refsMedia = false;
  if (existsSync(framesDir)) {
    for (const f of readdirSync(framesDir).filter((x) => x.endsWith(".html"))) {
      if (readFileSync(join(framesDir, f), "utf8").includes("public/media/")) { refsMedia = true; break; }
    }
  }
  if (refsMedia) errors.push("帧引用了 public/media/ 素材但没有 slots.json —— 用扩容后的生成器重建帧");
  else warns.push("无 slots.json(扩容前老项目)—— 媒体红线跳过");
} else {
  let slots = null;
  try { slots = JSON.parse(readFileSync(slotsPath, "utf8")); } catch (e) { errors.push("slots.json 解析失败: " + e.message); }
  if (slots) {
    const fr = slots.frames || [];
    if (sbFrameCount && fr.length !== sbFrameCount)
      errors.push(`slots.json 帧数(${fr.length}) != STORYBOARD 帧数(${sbFrameCount}) —— 重跑生成器`);

    // 6a 连续纯文字帧 ≤2
    let run = 0, maxRun = 0, runStart = 0, maxStart = 0;
    fr.forEach((f, idx) => {
      if (f.kind === "text") { if (run === 0) runStart = idx; run++; if (run > maxRun) { maxRun = run; maxStart = runStart; } }
      else run = 0;
    });
    if (maxRun > 2)
      errors.push(`连续纯文字帧 ${maxRun} 个(F${String(fr[maxStart]?.frame ?? "?").padStart(2, "0")} 起)> 2 —— 中间插素材/图表/数字人帧`);

    // 6b 非纯文字帧占比 ≥40%
    if (fr.length) {
      const nonText = fr.filter((f) => f.kind !== "text").length;
      if (nonText / fr.length < 0.4)
        errors.push(`非纯文字帧占比 ${Math.round((nonText / fr.length) * 100)}%(${nonText}/${fr.length})< 40% —— 加素材/图表/数字人帧`);
    }

    // 6c 素材存在且可解码(视频加验:无音轨 + ≤4s = 必须过 prep_media.sh)
    // 6d 贴纸 ≤2/帧、外接盒不入字幕安全区;avatar provider 只认 local-rig
    const CAPTION_SAFE_Y = 1500, BROLL_MAX = 4;
    const probe = (sel) => { try { return execSync(`ffprobe -v error ${sel}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch { return null; } };
    for (const f of fr) {
      const tag = `F${String(f.frame).padStart(2, "0")}`;
      if (f.media) {
        const p = join(PROJ, f.media.path || "");
        if (!f.media.path || !existsSync(p)) {
          errors.push(`${tag} 素材不存在: ${f.media.path} —— 先跑 prep_media.sh`);
        } else if (f.media.type === "video") {
          const v = probe(`-select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${p}"`);
          if (!v || !v.trim()) errors.push(`${tag} 视频素材不可解码: ${f.media.path}`);
          const a = probe(`-select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${p}"`);
          if (a && a.trim()) errors.push(`${tag} 视频 B-roll 带音轨(${a.trim()})—— 红线:必须 prep_media.sh 物理静音`);
          const d = parseFloat(probe(`-show_entries format=duration -of csv=p=0 "${p}"`) || "");
          if (Number.isFinite(d) && d > BROLL_MAX + 0.15)
            errors.push(`${tag} 视频 B-roll ${d.toFixed(2)}s > ${BROLL_MAX}s —— 红线:prep_media.sh 裁至 beat 时长(≤${BROLL_MAX}s)`);
        } else if (probe(`"${p}"`) === null) {
          errors.push(`${tag} 图片素材不可解码: ${f.media.path}`);
        }
      }
      const st = f.stickers || [];
      if (st.length > 2) errors.push(`${tag} 贴纸 ${st.length} 个 > 2 —— 红线:任何帧 ≤2 个`);
      for (const s of st) {
        const sp = join(PROJ, s.path || "");
        if (!s.path || !existsSync(sp)) { errors.push(`${tag} 贴纸不存在: ${s.path}`); continue; }
        if (/\.svg$/i.test(s.path)) {
          if (!readFileSync(sp, "utf8").slice(0, 512).toLowerCase().includes("<svg")) errors.push(`${tag} 贴纸不是有效 svg: ${s.path}`);
        } else if (probe(`"${sp}"`) === null) errors.push(`${tag} 贴纸不可解码: ${s.path}`);
        if ([s.x, s.y, s.w, s.h].some((n) => !Number.isFinite(n)) || s.y + s.h > CAPTION_SAFE_Y || s.y < 0 || s.x < 0 || s.x + s.w > 1080)
          errors.push(`${tag} 贴纸 ${s.id} 外接盒(${s.x},${s.y},${s.w}×${s.h})出画布或入字幕安全区(y≥${CAPTION_SAFE_Y})`);
      }
      if (f.avatar && f.avatar.provider !== "local-rig")
        errors.push(`${tag} avatar provider "${f.avatar.provider}" 未接入 —— 只认 local-rig(heygen 由生成器自动降级,slots 里出现说明降级失效)`);
    }

    // 6e 全片仅允许一个音色(audio_meta + slots 的 voice_type 全集)
    const voiceSet = new Set();
    if (amData?.voice_type) voiceSet.add(amData.voice_type);
    for (const v of amData?.voices || []) if (v.voice_type) voiceSet.add(v.voice_type);
    if (slots.voice?.voice_type) voiceSet.add(slots.voice.voice_type);
    if (voiceSet.size > 1)
      errors.push(`检出 ${voiceSet.size} 个音色(${[...voiceSet].join(", ")})—— 红线:全片仅允许一个音色,整链重跑 TTS`);
    else if (voiceSet.size === 0)
      warns.push("audio_meta/slots 无 voice_type 标记(老 TTS 产物)—— 音色红线跳过");
  }
}

// ---- 4 hyperframes lint ----
// lint 有 error 时进程本身退出非零——要从 e.stdout 里捞 JSON 报出具体 findings,不能吞成"执行失败"
let lintOut = null;
try {
  lintOut = execSync("npx hyperframes lint --json", { cwd: PROJ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  lintOut = e && e.stdout ? String(e.stdout) : null;
  if (!lintOut || !lintOut.includes("{"))
    errors.push("hyperframes lint 执行失败: " + String(e.message || e).slice(0, 200));
}
if (lintOut && lintOut.includes("{")) {
  try {
    const j = JSON.parse(lintOut.slice(lintOut.indexOf("{")));
    if ((j.errorCount ?? 1) > 0) {
      const first = (j.findings || []).filter((x) => x.severity === "error").slice(0, 3)
        .map((x) => `${x.code}@${(x.file || "").split("/").pop()}`).join(", ");
      errors.push(`hyperframes lint errorCount=${j.errorCount}（${first}）`);
    }
  } catch (e) {
    errors.push("hyperframes lint 输出解析失败: " + String(e.message || e).slice(0, 200));
  }
}

// ---- 5 可选：成片校验 ----
if (RENDER) {
  const rp = join(PROJ, RENDER);
  if (!existsSync(rp)) {
    errors.push(`成片不存在: ${RENDER}`);
  } else {
    try {
      const probe = (selArgs) => execSync(`ffprobe -v error ${selArgs} -of default=noprint_wrappers=1 "${rp}"`, { encoding: "utf8" });
      if (!/codec_name=/.test(probe("-select_streams v:0 -show_entries stream=codec_name"))) errors.push("成片无视频流");
      if (!/codec_name=/.test(probe("-select_streams a:0 -show_entries stream=codec_name"))) errors.push("成片无音频流");
      const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${rp}"`, { encoding: "utf8" }).trim());
      if (audioTotal && Math.abs(dur - audioTotal) > 1.5)
        errors.push(`成片时长 ${dur.toFixed(1)}s 与语音总长 ${audioTotal.toFixed(1)}s 偏差 >1.5s`);
    } catch (e) {
      errors.push("ffprobe 失败: " + String(e.message || e).slice(0, 150));
    }
  }
}

// ---- 输出 ----
for (const w of warns) console.log("⚠ " + w);
if (errors.length) {
  for (const e of errors) console.error("✗ " + e);
  console.error(`\nGATE FAIL: ${errors.length} error(s), ${warns.length} warning(s)`);
  process.exit(1);
}
console.log(`✓ GATE PASS（${warns.length} warning(s)）`);
