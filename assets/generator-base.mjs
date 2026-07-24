// generator-base.mjs — interflow-ip-video 每集建帧生成器基座。
// 用法: cp 到项目根为 episode.mjs → 只改底部 "EDIT: FRAME CONFIGS" 区 → node episode.mjs
// 共享壳(背景三层/IP小人/口型动画器/呼吸辉光)写死一处,全片齐更;每帧只描述可视化+时间线。
// 完整 12 镜实战原件见同目录 _generator-full-example.mjs(实战集:6 幕/骨架继承/气口)。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const PROJ = process.cwd();
const meta = JSON.parse(readFileSync(PROJ + "/audio_meta.json", "utf8"));
const voice = (f) => meta.voices.find((v) => v.frame === f);
const envOf = (f) => JSON.stringify(voice(f).mouth_env);

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=Mr+Dafoe&family=Noto+Sans+SC:wght@400;500;700;900&display=swap');`;

// —— 质感三层背景 + 线稿基线(2.5px round + 微辉光)。规范见 references/frame-recipes.md ——
const COMMON = `
        #root { position: absolute; inset: 0; overflow: hidden; }
        .clip { position: absolute; }
        .bg { inset: 0; background: radial-gradient(135% 105% at 50% 40%, #18181D 0%, #0C0C0F 46%, #070708 100%); }
        .grid { inset: 0; background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 32px 32px; opacity: 0; }
        .vig { inset: 0; box-shadow: inset 0 0 340px 90px rgba(0,0,0,0.55); pointer-events: none; }
        .vz path, .vz line, .vz polyline, .vz circle, .vz rect.ln { fill: none; stroke: #FFFFFF; stroke-width: 2.5px; stroke-linecap: round; stroke-linejoin: round; }
        .vz svg { filter: drop-shadow(0 0 7px rgba(255,255,255,0.20)); }
        .glow-w { filter: drop-shadow(0 0 10px rgba(255,255,255,0.35)); }
        .lbl { position: absolute; color: #FFFFFF; font-family: "Noto Sans SC", sans-serif; }
        .en { font-family: "Archivo", sans-serif; text-transform: uppercase; letter-spacing: 0.28em; }
        .kick { position: absolute; left: 0; width: 1080px; text-align: center; font-family: "Archivo", sans-serif; text-transform: uppercase; letter-spacing: 0.3em; font-size: 34px; color: #9A9A9A; }
        .muted { color: #9A9A9A; }
        /* 字阶 8 档（设计 DNA v2）：font-size 只取 26/34/44/64/92/130/180/260（SVG viewBox 内除外），
           每帧 ≤4 档——gate 硬校验。规范见 references/frame-recipes.md「设计 DNA v2」 */
        .t-note { font-size: 26px; line-height: 1.35; }
        .t-label { font-size: 34px; line-height: 1.2; }
        .t-body { font-size: 44px; line-height: 1.25; }
        .t-h3 { font-size: 64px; line-height: 1.1; }
        .t-h2 { font-size: 92px; line-height: 1.05; }
        .t-h1 { font-size: 130px; line-height: 1; }
        .t-giant { font-size: 180px; line-height: 1; }
        .t-mega { font-size: 260px; line-height: 0.95; }
        .bgdim { inset: 0; background: rgba(7,7,8,0.62); }
        .mslot { overflow: hidden; background: rgba(255,255,255,0.045); box-shadow: 0 0 0 1.5px rgba(255,255,255,0.12); }
        .mslot img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mfade { position: absolute; left: 0; right: 0; bottom: 0; height: 30%; background: linear-gradient(180deg, rgba(7,7,8,0) 0%, rgba(7,7,8,0.92) 100%); pointer-events: none; }
`;
const BG = (D) => `
        <div class="clip bg" data-start="0" data-duration="${D}" data-track-index="0"></div>
        <div class="clip grid" data-start="0" data-duration="${D}" data-track-index="0" id="bggrid"></div>
        <div class="clip vig" data-start="0" data-duration="${D}" data-track-index="0"></div>`;
// media-bg 视频用:背景改半透明暗垫,露出 inject_broll 注在 index root 的 under 层视频
const BG_DIM = (D) => `
        <div class="clip bgdim" data-start="0" data-duration="${D}" data-track-index="0"></div>
        <div class="clip grid" data-start="0" data-duration="${D}" data-track-index="0" id="bggrid"></div>
        <div class="clip vig" data-start="0" data-duration="${D}" data-track-index="0"></div>`;

// —— IP 小人（4 个可弯曲姿势: explain/point/raise/welcome; 口型/眨眼/点头由 animChar 驱动） ——
// 两个落位:角落常驻(默认) / avatar-frame 数字人段放大居中(local-rig,同一 animChar 驱动)
const CHAR_CORNER = `position:absolute; left:40px; bottom:170px; width:196px; height:250px; z-index:5; pointer-events:none;`;
const CHAR_AVATAR = `position:absolute; left:240px; top:520px; width:600px; height:766px; z-index:5; pointer-events:none;`;
const char = (S, DUR, style = CHAR_CORNER) => `
        <div class="clip if-character" data-start="0" data-duration="${DUR}" data-track-index="9"
             style="${style}">
          <svg viewBox="0 0 360 460">
            <g id="if-shadow-${S}"><ellipse cx="180" cy="438" rx="95" ry="13" fill="#000000" opacity="0.55"></ellipse></g>
            <g id="if-float-${S}">
              <g>
                <rect x="134" y="374" width="38" height="52" rx="10" fill="#3A3A3A"></rect>
                <rect x="188" y="374" width="38" height="52" rx="10" fill="#3A3A3A"></rect>
                <rect x="126" y="414" width="54" height="18" rx="9" fill="#ECECEC"></rect>
                <rect x="180" y="414" width="54" height="18" rx="9" fill="#ECECEC"></rect>
                <rect x="162" y="222" width="36" height="34" rx="8" fill="#A8A8A8"></rect>
                <path d="M104 382 Q98 262 180 256 Q262 262 256 382 Z" fill="#ECECEC"></path>
              </g>
              <g id="if-pose-explain-${S}">
                <path d="M112 284 Q84 300 76 330" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <path d="M248 284 Q276 300 284 330" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="73" cy="338" r="16" fill="#ECECEC"></circle><circle cx="287" cy="338" r="16" fill="#ECECEC"></circle>
              </g>
              <g id="if-pose-point-${S}" style="opacity:0">
                <path d="M112 286 Q94 306 100 334" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="102" cy="342" r="16" fill="#ECECEC"></circle>
                <path d="M248 282 Q292 274 306 256 Q320 240 342 226" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="350" cy="220" r="17" fill="#ECECEC"></circle>
                <path d="M360 212 L384 198" stroke="#ECECEC" stroke-width="12" stroke-linecap="round" fill="none"></path>
              </g>
              <g id="if-pose-raise-${S}" style="opacity:0">
                <path d="M112 286 Q94 306 100 334" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="102" cy="342" r="16" fill="#ECECEC"></circle>
                <path d="M250 280 Q290 248 302 200 Q310 172 308 148" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="307" cy="138" r="17" fill="#ECECEC"></circle>
                <path d="M307 126 L314 100" stroke="#ECECEC" stroke-width="11" stroke-linecap="round" fill="none"></path>
              </g>
              <g id="if-pose-welcome-${S}" style="opacity:0">
                <path d="M112 284 Q74 266 50 232 Q38 214 34 194" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="32" cy="184" r="17" fill="#ECECEC"></circle>
                <path d="M248 284 Q286 266 310 232 Q322 214 326 194" stroke="#C9C9C9" stroke-width="26" stroke-linecap="round" fill="none"></path>
                <circle cx="328" cy="184" r="17" fill="#ECECEC"></circle>
              </g>
              <g id="if-head-${S}">
                <ellipse cx="180" cy="150" rx="78" ry="82" fill="#C9C9C9"></ellipse>
                <path d="M102 146 Q102 49 180 49 Q258 49 258 146 Q258 101 180 98 Q102 101 102 146 Z" fill="#141414"></path>
                <path d="M130 133 Q143 125 157 133" stroke="#0E0E0E" stroke-width="5" stroke-linecap="round" fill="none"></path>
                <path d="M203 133 Q216 125 230 133" stroke="#0E0E0E" stroke-width="5" stroke-linecap="round" fill="none"></path>
                <g id="if-eyes-${S}"><ellipse cx="144" cy="162" rx="8" ry="10" fill="#0A0A0A"></ellipse><ellipse cx="216" cy="162" rx="8" ry="10" fill="#0A0A0A"></ellipse></g>
                <g id="if-mouth-${S}"><ellipse cx="180" cy="205" rx="20" ry="15" fill="#0E0E0E"></ellipse></g>
                <g>
                  <circle cx="144" cy="162" r="21" stroke="#0E0E0E" stroke-width="6" fill="none"></circle>
                  <circle cx="216" cy="162" r="21" stroke="#0E0E0E" stroke-width="6" fill="none"></circle>
                  <path d="M165 162 Q180 152 195 162" stroke="#0E0E0E" stroke-width="6" fill="none"></path>
                </g>
                <g>
                  <path d="M93 126 Q93 35 180 35 Q267 35 267 126" stroke="#F5F5F5" stroke-width="14" fill="none" stroke-linecap="round"></path>
                  <rect x="75" y="112" width="28" height="58" rx="14" fill="#F5F5F5"></rect>
                  <rect x="257" y="112" width="28" height="58" rx="14" fill="#F5F5F5"></rect>
                </g>
              </g>
            </g>
          </svg>
        </div>`;

// —— 动画器：seek-safe（onUpdate + setAttribute 显式支点；口型读 30fps RMS 包络） ——
const ANIMATOR = `
        function animChar(tl, S, dur, gOff, env, poses, nods){
          var $=function(p){return document.getElementById(p+S);};
          var fl=$('if-float-'),hd=$('if-head-'),ey=$('if-eyes-'),mo=$('if-mouth-'),sh=$('if-shadow-');
          var PG={}; poses.forEach(function(pp){ PG[pp[1]]=$('if-pose-'+pp[1]+'-'); });
          var TAU=Math.PI*2, p={t:0};
          tl.to(p,{t:dur,duration:dur,ease:'none',onUpdate:function(){
            var t=p.t, g=t+gOff;                                   // gOff=全片累计起点→浮动相位跨帧连续
            var fy=Math.sin(TAU*g/3.5);                            // 3.5s 浮动周期(品牌 idle token)
            fl.setAttribute('transform','translate(0 '+(12*fy).toFixed(2)+')');
            var ang=2*Math.sin(TAU*g/7), nod=0;                    // ±2° / 7s 摇摆
            for(var k=0;k<nods.length;k++){var d=t-nods[k]; if(d>=0&&d<0.5){nod+=9*Math.sin(Math.PI*d/0.5);}}
            hd.setAttribute('transform','rotate('+ang.toFixed(2)+' 180 232) translate(0 '+nod.toFixed(2)+')');
            var bp=((g%4.3)+4.3)%4.3;                              // 4.3s 眨一次,闭眼~0.13s
            var eye=bp<0.13?(1-0.92*Math.sin(Math.PI*bp/0.13)):1;
            ey.setAttribute('transform','matrix(1,0,0,'+eye.toFixed(3)+',0,'+(162*(1-eye)).toFixed(2)+')');
            var idx=Math.floor(t*30); if(idx<0)idx=0; if(idx>=env.length)idx=env.length-1;
            var e=env.length?env[idx]:0, m=0.15+0.82*e;            // 口型=响度包络,闭合0.15~全开0.97
            mo.setAttribute('transform','matrix(1,0,0,'+m.toFixed(3)+',0,'+(205*(1-m)).toFixed(2)+')');
            var high=Math.max(0,-fy), sx=(1-0.20*high);            // 影子与浮动反相
            sh.setAttribute('transform','matrix('+sx.toFixed(3)+',0,0,1,'+(180*(1-sx)).toFixed(2)+',0)');
            sh.style.opacity=(0.55-0.28*high).toFixed(3);
            var seg=0; for(var i=0;i<poses.length;i++){ if(t>=poses[i][0]) seg=i; }
            var prog=Math.min(1,(t-poses[seg][0])/0.3), op={};     // 姿势 0.3s 交叉淡入
            op[poses[seg][1]]=(op[poses[seg][1]]||0)+prog;
            if(seg>0) op[poses[seg-1][1]]=(op[poses[seg-1][1]]||0)+(1-prog);
            for(var nm in PG){ PG[nm].style.opacity=(op[nm]||0).toFixed(3); }
          }},0);
        }`;

const DRAWSETUP = `document.querySelectorAll(".vz [data-draw]").forEach(function(p){var l=p.getTotalLength();p.style.strokeDasharray=l;p.style.strokeDashoffset=l;});`;

// —— beat_map 词锚(动效触发时刻的唯一来源,禁手写秒数;tts_takes.py 产 beat_map.json) ——
// wordT(帧, "词")  → 该词开口时刻(帧内秒);pauseT(帧, n) → 第 n 个帧内停顿 {t, dur}。
// 每次调用自动记入 slots.json 的 anchors[],验收脚本核对「动效 vs 词时间戳 ≤150ms」。
const BEAT = existsSync(PROJ + "/beat_map.json")
  ? JSON.parse(readFileSync(PROJ + "/beat_map.json", "utf8")) : null;
const _anchorLog = [];
// 匹配前归一:阿拉伯数字→中文读法、两→二(ASR 对数字的写法不稳定)
const _CN = "零一二三四五六七八九";
const _n2c = (m) => { const n = +m; if (n < 10) return _CN[n]; if (n < 100) { const t = (n / 10) | 0, o = n % 10; return (t === 1 ? "" : _CN[t]) + "十" + (o ? _CN[o] : ""); } return String(m).split("").map((d) => _CN[+d]).join(""); };
const _normQ = (s) => String(s).toLowerCase().replace(/\d+/g, _n2c).replace(/两/g, "二").replace(/[^一-鿿a-z]/g, "");
function wordT(f, q, occ = 1) {
  const bf = BEAT && BEAT.frames.find((x) => x.frame === f);
  if (!bf) throw new Error(`wordT: beat_map.json 无 frame ${f} —— 先跑 tts_takes.py`);
  for (const src of [bf.asr_words, bf.words]) {
    if (!src || !src.length) continue;
    let str = "";
    const map = [];
    src.forEach((w, i) => { const n = _normQ(w.text); str += n; for (const _ of n) map.push(i); });
    let from = 0, hit = -1;
    for (let k = 0; k < occ; k++) { hit = str.indexOf(_normQ(q), from); if (hit < 0) break; from = hit + 1; }
    if (hit >= 0) {
      const t = +src[map[hit]].start.toFixed(3);
      _anchorLog.push({ frame: f, kind: "word", q, t });
      return t;
    }
  }
  throw new Error(`wordT: F${f} 找不到词「${q}」——查 beat_map 的 asr_words/words`);
}
function pauseT(f, n = 1) {
  const bf = BEAT && BEAT.frames.find((x) => x.frame === f);
  if (!bf) throw new Error(`pauseT: beat_map.json 无 frame ${f}`);
  const inner = bf.pauses.filter((p) => p.after !== "(尾气口)");
  const p = inner[n - 1] || bf.pauses[bf.pauses.length - 1];
  _anchorLog.push({ frame: f, kind: "pause", q: p.after, t: p.start });
  return { t: p.start, dur: p.dur };
}

// —— 素材/贴纸/数字人槽位（规范:frame-recipes「媒体帧与贴纸」;素材来源:references/media-library.md） ——
// 图片素材直接进帧;视频素材帧内只画占位窗(子合成里 <video> = assemble HARD FAIL),
// 真 <video> 由 scripts/inject_broll.mjs 按 slots.json 注入 index.html root。
const MEDIA_BOX = {
  "media-full": { x: 0, y: 0, w: 1080, h: 1360, r: 0 },
  "media-pip": { x: 110, y: 430, w: 860, h: 560, r: 44 },
  "media-bg": { x: 0, y: 0, w: 1080, h: 1920, r: 0 },
};
const CAPTION_SAFE_Y = 1500; // 字幕安全区上沿(底部对话排)——贴纸外接盒禁越过

function buildMedia(cfg, D) {
  const out = { css: "", body: "", tl: "", bgDim: false };
  const m = cfg.media;
  if (!m) return out;
  if (!MEDIA_BOX[m.form]) throw new Error(`${cfg.id}: media.form 只认 media-full/media-pip/media-bg,收到 "${m.form}"`);
  if (!m.id || !m.type || !m.path) throw new Error(`${cfg.id}: media 缺 id/type/path`);
  if (!existsSync(PROJ + "/" + m.path)) throw new Error(`${cfg.id}: 素材不存在 ${m.path} —— 先跑 prep_media.sh`);
  const dflt = MEDIA_BOX[m.form];
  m.box = { ...dflt, ...(m.box || {}) };
  m.layer = m.form === "media-bg" ? "under" : "over";
  const b = m.box, sid = `mslot${cfg.s}`;
  if (m.type === "image") {
    if (m.form === "media-bg") {
      // 全幅图垫底 + 暗化盖层(都在帧内,文字照常排 y280–1360)
      // 资产路径一律项目根相对(public/...):子合成克隆进 host 页后按项目根解析;
      // "../" 父级穿越 = lint error(Studio 404)
      out.body = `
        <div class="clip" data-start="0" data-duration="${D}" data-track-index="1" style="inset:0;overflow:hidden;"><img id="${sid}" src="${m.path}" style="width:100%;height:100%;object-fit:cover;display:block;" alt=""/></div>
        <div class="clip bgdim" data-start="0" data-duration="${D}" data-track-index="1"></div>`;
    } else {
      out.body = `
        <div class="clip mslot" data-start="0" data-duration="${D}" data-track-index="1" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;${b.r ? `border-radius:${b.r}px;` : ""}">
          <img id="${sid}" src="${m.path}" alt=""/>${m.form === "media-full" ? `<div class="mfade"></div>` : ""}
        </div>`;
    }
    // 静图 Ken Burns(ease none 匀速,seek-safe)——静帧也有生命
    out.tl = `
        tl.fromTo("#${sid}",{scale:1.02,transformOrigin:"50% 50%"},{scale:1.07,ease:"none",duration:${D}},0);`;
  } else if (m.type === "video") {
    if (m.form === "media-bg") {
      out.bgDim = true; // 背景换半透明暗垫,under 层视频从 root 透上来
    } else {
      // 占位玻璃窗:注入前的预览、以及素材(≤4s)比帧短时的尾巴,都由它接住
      out.body = `
        <div class="clip mslot" data-start="0" data-duration="${D}" data-track-index="1" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;${b.r ? `border-radius:${b.r}px;` : ""}"></div>`;
    }
  } else {
    throw new Error(`${cfg.id}: media.type 只认 image/video,收到 "${m.type}"`);
  }
  return out;
}

function buildStickers(cfg, D) {
  const st = cfg.stickers || [];
  const out = { body: "", tl: "" };
  if (st.length > 2) throw new Error(`${cfg.id}: 贴纸 ${st.length} 个 > 2 —— 红线:任何帧 ≤2 个`);
  st.forEach((s, i) => {
    if (!s.id || !s.path || [s.x, s.y, s.w, s.h].some((n) => !Number.isFinite(n)))
      throw new Error(`${cfg.id}: 贴纸缺 id/path/x/y/w/h`);
    if (s.y + s.h > CAPTION_SAFE_Y || s.y < 0 || s.x < 0 || s.x + s.w > 1080)
      throw new Error(`${cfg.id}: 贴纸 ${s.id} 外接盒(${s.x},${s.y},${s.w}×${s.h})出画布或入字幕安全区(y≥${CAPTION_SAFE_Y})`);
    if (!existsSync(PROJ + "/" + s.path)) throw new Error(`${cfg.id}: 贴纸不存在 ${s.path}`);
    const sid = `stk${cfg.s}_${i}`;
    out.body += `
        <div class="clip" id="${sid}" data-start="0" data-duration="${D}" data-track-index="8" style="left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;opacity:0;z-index:6;"><img src="${s.path}" style="width:100%;height:100%;display:block;" alt=""/></div>`;
    out.tl += `
        tl.fromTo("#${sid}",{opacity:0,scale:0.3,rotation:-14,transformOrigin:"50% 60%"},{opacity:1,scale:1,rotation:0,duration:0.55,ease:"back.out(1.8)"},${s.at ?? 0.5});`;
  });
  return out;
}

const SLOTS = []; // 每帧的形式/素材/贴纸声明 → slots.json(gate 红线只查它,不看像素)

function frame(cfg) {
  const D = cfg.dur;
  if (cfg.avatar && cfg.avatar.provider && cfg.avatar.provider !== "local-rig") {
    console.warn(`⚠ ${cfg.id}: avatar provider "${cfg.avatar.provider}" 未接入 —— 自动降级 local-rig(永不阻塞出片)`);
    cfg.avatar = { ...cfg.avatar, degraded_from: cfg.avatar.provider, provider: "local-rig" };
  }
  const media = buildMedia(cfg, D);
  const stick = buildStickers(cfg, D);
  const bodyHtml = cfg.body(D);
  // 纯文字帧判定:无素材/数字人,且 body 里没有任何图形主体(svg/img)——可用 cfg.kind 显式覆盖
  const kind = cfg.kind || (cfg.media ? "media" : cfg.avatar ? "avatar" : /<svg|<img|<video/i.test(bodyHtml) ? "viz" : "text");
  SLOTS.push({
    frame: cfg.envFrame, id: cfg.id, kind,
    form: cfg.media ? cfg.media.form : cfg.avatar ? "avatar-frame" : cfg.form || null,
    media: cfg.media ? { id: cfg.media.id, type: cfg.media.type, path: cfg.media.path, form: cfg.media.form, box: cfg.media.box, layer: cfg.media.layer } : null,
    stickers: (cfg.stickers || []).map((s) => ({ id: s.id, path: s.path, x: s.x, y: s.y, w: s.w, h: s.h, at: s.at ?? 0.5 })),
    avatar: cfg.avatar || null,
    anchors: _anchorLog.filter((a) => a.frame === cfg.envFrame), // 词锚调用记录(验收 ≤150ms 用)
  });
  let html = `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        ${FONT}
${COMMON}
${cfg.css}
      </style>
      <div id="root" data-composition-id="${cfg.id}" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
${media.bgDim ? BG_DIM(D) : BG(D)}${media.body}
${bodyHtml}${stick.body}
        ${char(cfg.s, D, cfg.avatar ? CHAR_AVATAR : CHAR_CORNER)}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
${cfg.scripts || ""}
      <script>
${ANIMATOR}
        function addGlowPulse(tl, dur, items){                     // 强调件 ~2s 呼吸辉光(确定性)
          if(!items||!items.length) return;
          var p={t:0};
          tl.to(p,{t:dur,duration:dur,ease:'none',onUpdate:function(){
            var ph=Math.sin(2*Math.PI*p.t/2.0);
            items.forEach(function(it){
              var els=document.querySelectorAll(it.sel), b=(it.b||10)*(1+0.4*ph), a=Math.max(0,(it.a||0.45)+0.22*ph);
              for(var i=0;i<els.length;i++){ els[i].style.filter='drop-shadow(0 0 '+b.toFixed(1)+'px rgba('+it.rgb+','+a.toFixed(2)+'))'; }
            });
          }},0);
        }
        var MOUTH_ENV = ${envOf(cfg.envFrame)};
        window.__timelines = window.__timelines || {};
        const tl = gsap.timeline({ paused: true });
        // —— 动效 tokens + 标准入场 helpers（Emil 决策树视频版；规范 frame-recipes「动效系统」）——
        // 入场=EASE.enter / 在场移动=EASE.move / draw=EASE.draw / 高光弹入=EASE.pop；永不 *.in（gate 硬查）。
        // 标准入场一律 fadeUp/popIn/fadeIn（tokens 自动带对）；raw gsap 留给复杂编排。
        // popIn 只用于 HTML 元素——SVG 组入场用 fadeUp（平移）或 onUpdate 显式支点（pitfalls）。
        var EASE={enter:"power4.out",move:"power3.inOut",draw:"power2.out",pop:"back.out(1.7)"};
        var DUR={pop:0.35,enter:0.5,panel:0.65,draw:1.0,breathe:2.0};
        var RISE=40, STAGGER=0.08;
        function fadeUp(sel,at,o){o=o||{};tl.fromTo(sel,{opacity:0,y:(o.y!=null?o.y:RISE)},{opacity:1,y:0,duration:(o.dur!=null?o.dur:DUR.enter),ease:o.ease||EASE.enter},at);}
        function popIn(sel,at,o){o=o||{};tl.fromTo(sel,{opacity:0,scale:(o.from!=null?o.from:0.92),transformOrigin:o.origin||"50% 50%"},{opacity:1,scale:1,duration:(o.dur!=null?o.dur:DUR.pop),ease:o.ease||EASE.pop},at);}
        function fadeIn(sel,at,o){o=o||{};tl.fromTo(sel,{opacity:0},{opacity:(o.to!=null?o.to:1),duration:(o.dur!=null?o.dur:DUR.pop),ease:o.ease||EASE.enter},at);}
        tl.fromTo("#bggrid",{opacity:0},{opacity:1,duration:0.6,ease:"power2.out"},0);
        try {
${media.tl}${cfg.tl}${stick.tl}
        } catch(e){}
        addGlowPulse(tl, ${D}, ${JSON.stringify(cfg.pulses || [])});
        animChar(tl, '${cfg.s}', ${D}, ${cfg.gOff}, MOUTH_ENV, ${JSON.stringify(cfg.poses)}, ${JSON.stringify(cfg.nods)});
        window.__timelines["${cfg.id}"] = tl;
      </script>
    </template>
  </body>
</html>
`;
  // 每个 clip 唯一 track-index(文档序自增)——避免 overlapping_clips_same_track
  let ti = 0;
  html = html.replace(/data-track-index="[^"]*"/g, () => `data-track-index="${ti++}"`);
  return html;
}

/* ================== EDIT: FRAME CONFIGS(每集只改这里) ==================
每镜一个 config:
  id       NN-slug(=STORYBOARD 的 src 文件名)   s  两位序号(人物元素后缀,防 id 冲突)
  dur      = audio_meta 该帧 duration_s           gOff = 之前所有帧 duration 累计(浮动相位连续)
  envFrame = audio_meta 的 frame 号
  poses    [[t,'explain'|'point'|'raise'|'welcome'],…]  语义节点换姿势(讲图时 point,落版 raise/welcome)
  nods     [t,…] 重音点头   pulses [{sel,rgb:'230,57,70',b,a}] 红色强调件呼吸辉光
  scripts  可选额外 CDN(如 d3-path+d3-shape 做平滑图表)
  css/body/tl  该帧专属——可视化形式选型 + reveal 按 words[] 时间戳排;规范/形式菜单见 references/frame-recipes.md
  —— 素材槽(可选;规范见 frame-recipes「媒体帧与贴纸」+ references/media-library.md):
  media    {id,type:'image'|'video',path:'public/media/x.mp4',form:'media-full'|'media-pip'|'media-bg',box?}
           STORYBOARD media 字段语义命中才配;素材必须先过 prep_media.sh。图入帧;
           视频帧内只出占位窗,管线末尾跑 inject_broll.mjs 注入(SKILL 步骤 6)
  stickers [{id,path:'public/media/stickers/x.svg',x,y,w,h,at}] ≤2 个/帧,GSAP 弹入;
           外接盒禁入字幕安全区(y≥1500);红贴纸 = 该帧唯一红
  avatar   {provider:'local-rig'} 数字人段:小人放大居中,角落常驻位自动让位;
           provider 只实现 local-rig,写 heygen 会打 warn 自动降级(永不阻塞)
  kind     显式覆盖帧分类('text'|'viz'|'media'|'avatar';默认按 media/avatar/body 是否含图形自判)
           ——纯文字帧必须如实为 'text':gate 红线「连续纯文字 ≤2、非纯文字 ≥40%」按它算
  建帧同时产 slots.json(每帧 form/media/stickers/avatar 声明)——gate 媒体红线只查它
坐标红线:内容 y≤1360;定位容器内标签用容器相对坐标;每帧一红。
设计 DNA v2(gate 硬校验,规范 frame-recipes「设计 DNA v2」):
  字号只取 8 档字阶 26/34/44/64/92/130/180/260(COMMON 有 .t-* 类;SVG viewBox 内除外),
  每帧 distinct ≤4 档;图内标签 2–5 字(6 封顶)且 ≤5 个,具体名词不抽象名词;一帧一隐喻。
动效 v2(gate 硬校验,规范 frame-recipes「动效系统」):
  标准入场一律 fadeUp/popIn/fadeIn(tokens 自动带对:入场 power4.out/在场移动 EASE.move/
  draw EASE.draw/高光 EASE.pop);永不 *.in ease、永不 scale(0)(面板从 0.92、小件 ≥0.6);
  stagger 60–90ms;kicker 等每帧恒常件 0.35s 淡入禁 overshoot;单入场 ≤0.7s、draw ≤1.2s;
  同一词锚的多动作错峰 ≤0.12s(一次协调运动);popIn 只用于 HTML 元素(SVG 组用 fadeUp/显式支点)。
构图带(定稿偏好):kicker ~y260-300 起,主体内容带 y280-1360;
  底部对话排 y1500-1750 = IP 小人(左下 40-236)+ 字幕对话气泡(264-1044,皮肤锁死在小人右侧),
  内容禁入;y1360-1500 留空当呼吸带,别把内容坠到对话排上。
圆润化(Apple 式圆角,拒硬直角):窗口/终端 rect rx≥36、卡片 rx≥44、手机 rx≥58;
  实心多边形(播放三角等)用同色粗描边+stroke-linejoin:round 圆角化;
  小色块(光标等)加 border-radius;线条一律 round cap(基线已内置)。
间距红线(元素贴脸 = 返工):垂直堆叠元素按**外接盒**留 ≥40px 净距——图标容器的
  实高按 svg viewBox 算(内容画到 viewBox 底就是容器底),标签/文字不得与图形外接盒
  相交;kicker 一律用 .kick(34px,别再手写 24px 小字)。
视觉重心:每帧恰好一个主导元素,标题/巨字 ≥3× 次级字号;清单/时间轴/多项帧
  当前项放大或高亮,禁止所有项等大平铺。
节奏与场景组(见 frame-recipes「节奏与场景组」节):全片 distinct 形式 ≤5;
  幕内帧继承前帧骨架——把前帧的 css/body 复制过来,继承元素**终态直出**
  (初始 opacity 写终态值,tl 里不重播它们的入场),只对新增元素做动画;
  kicker 幕内静态延续(直出,禁重新淡入);讲过的元素降 0.5–0.72 让主导。
  气口:语音结束点前发育完,气口段禁新元素进场(只留 pulses/浮动低频循环)。
  STORYBOARD 幕内 transition_in: cut,幕间 crossfade。
======================================================================== */
const F = [];

// 示例 A —— 平滑面积图(d3-shape;图表规范:曲线/渐变面积/数据点/网格/刻度/红徽章)
F.push({ id:"01-chart", s:"01", dur: voice(1).duration_s, gOff:0, envFrame:1,
  poses:[[0,"explain"],[2.0,"point"]], nods:[0.5],
  pulses:[{sel:"#badge1",rgb:"230,57,70",b:16,a:0.55}],
  scripts:`      <script src="https://cdn.jsdelivr.net/npm/d3-path@3"></script>
      <script src="https://cdn.jsdelivr.net/npm/d3-shape@3"></script>`,
  css:`
        .g1 { position:absolute; left:0; top:420px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:180px; line-height:1; color:#FFFFFF; }
        .chart1 { left:180px; top:760px; width:720px; height:440px; }`,
  body:(D)=>`
        <div class="clip g1" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g1a">标题词</span></div>
        <div class="clip vz chart1" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 720 440" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.30"></stop><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
            </linearGradient></defs>
            <path d="M56 400 L676 400" stroke-width="2.5" opacity="0.55"></path>
            <path d="M56 400 L56 46" stroke-width="2.5" opacity="0.55"></path>
            <path id="area1" style="fill:url(#ag1);stroke:none" d="" opacity="0"></path>
            <path id="line1" data-draw class="glow-w" d="M78 380 L658 68" stroke-width="6" stroke="#FFFFFF"></path>
            <g id="badge1" opacity="0">
              <rect x="524" y="6" width="150" height="54" rx="27" style="fill:#E63946;stroke:none"></rect>
              <text x="599" y="43" text-anchor="middle" style="fill:#FFFFFF;stroke:none;font-family:'Noto Sans SC';font-weight:900;font-size:30px;">徽章词</text>
            </g>
          </svg>
        </div>`,
  tl:`
        try {
          var PTS=[[78,380],[190,362],[330,322],[430,250],[558,140],[658,68]];
          document.getElementById("line1").setAttribute("d", d3.line().curve(d3.curveMonotoneX)(PTS));
          document.getElementById("area1").setAttribute("d", d3.area().x(function(d){return d[0]}).y1(function(d){return d[1]}).y0(400).curve(d3.curveMonotoneX)(PTS));
        } catch(e){}
        ${DRAWSETUP}
        fadeUp("#g1a",0.5,{y:60});
        tl.to("#line1",{strokeDashoffset:0,duration:1.1,ease:EASE.draw},1.6);
        fadeIn("#area1",2.0,{dur:0.8});
        fadeUp("#badge1",3.0,{y:14,dur:DUR.pop});`
});

// 示例 B —— 迁移弧线(切线对齐箭头 + 飞行点;坐标为容器相对)
F.push({ id:"02-arc", s:"02", dur: voice(2).duration_s, gOff: voice(1).duration_s, envFrame:2,
  poses:[[0,"explain"],[1.5,"point"]], nods:[0.8],
  pulses:[{sel:"#dst2",rgb:"230,57,70",b:15,a:0.6}],
  css:`
        .g2 { position:absolute; left:0; top:480px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:180px; line-height:1; color:#FFFFFF; }
        .arc2 { left:140px; top:900px; width:800px; height:300px; }
        .a2l { position:absolute; font-family:"Archivo"; font-weight:600; font-size:26px; letter-spacing:0.1em; color:#FFFFFF; opacity:0; }`,
  body:(D)=>`
        <div class="clip g2" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g2a">标题词</span></div>
        <div class="clip vz arc2" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
            <line x1="40" y1="232" x2="760" y2="232" stroke="#FFFFFF" stroke-width="1.5" opacity="0.14"></line>
            <circle id="src2" cx="90" cy="226" r="10" style="fill:none;stroke:#FFFFFF;stroke-width:3.5" opacity="0"></circle>
            <path id="arc2p" data-draw class="glow-w" d="M98 218 Q400 22 682 190" stroke-width="4"></path>
            <path id="chev2" d="M-16 -10 L0 0 L-16 10" stroke="#FFFFFF" stroke-width="4" fill="none" opacity="0"></path>
            <circle id="trav2" r="6" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
            <circle id="dst2" cx="712" cy="212" r="13" style="fill:#E63946;stroke:none" opacity="0"></circle>
          </svg>
          <div class="a2l" id="a2la" style="left:40px;top:250px;width:100px;text-align:center;">起点</div>
          <div class="a2l" id="a2lb" style="left:662px;top:246px;width:100px;text-align:center;color:#E63946;">终点</div>
        </div>`,
  tl:`
        ${DRAWSETUP}
        var ap=document.getElementById("arc2p"), L=ap.getTotalLength();
        var e=ap.getPointAtLength(L), q=ap.getPointAtLength(L-2);
        document.getElementById("chev2").setAttribute("transform","translate("+e.x.toFixed(1)+" "+e.y.toFixed(1)+") rotate("+(Math.atan2(e.y-q.y,e.x-q.x)*180/Math.PI).toFixed(1)+")");
        fadeUp("#g2a",0.4,{y:60});
        tl.fromTo("#src2",{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.3,ease:EASE.enter},1.2);
        fadeIn("#a2la",1.3,{dur:0.3});
        tl.to("#arc2p",{strokeDashoffset:0,duration:DUR.draw,ease:EASE.draw},1.4);
        var tv={p:0};
        fadeIn("#trav2",1.45,{dur:0.15});
        tl.to(tv,{p:1,duration:0.95,ease:"power2.out",onUpdate:function(){var pt=ap.getPointAtLength(tv.p*L);var td=document.getElementById("trav2");td.setAttribute("cx",pt.x.toFixed(1));td.setAttribute("cy",pt.y.toFixed(1));}},1.42);
        tl.to("#trav2",{opacity:0,duration:0.2},2.32);
        fadeIn("#chev2",2.3,{dur:0.25});
        tl.fromTo("#dst2",{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:DUR.pop,ease:EASE.enter},2.4);
        fadeIn("#a2lb",2.5,{dur:0.3});`
});

// 示例 C —— Hero 图勘测 HUD(单图讲解: hero 图 + 终端面板 typewriter + 虚线锚线红点 + macro 取景框)
// hero 图放项目 public/;引用路径以 snapshot 实测为准(裂图在暗底不易察觉)。规范见 frame-recipes「Hero 图勘测 HUD」节。
F.push({ id:"03-survey", s:"03", dur: voice(3).duration_s, gOff: voice(1).duration_s + voice(2).duration_s, envFrame:3,
  poses:[[0,"explain"],[1.4,"point"]], nods:[0.7],
  pulses:[{sel:"#anch3",rgb:"230,57,70",b:14,a:0.6}],
  css:`
        .hero3 { left:110px; top:330px; width:860px; height:620px; border-radius:44px; overflow:hidden; box-shadow:0 0 0 1.5px rgba(255,255,255,0.14); opacity:0; }
        .hero3 img { width:100%; height:100%; object-fit:cover; display:block; }
        .lead3 { left:0px; top:330px; width:1080px; height:1030px; pointer-events:none; }
        .hud3 { left:60px; top:1030px; width:600px; height:330px; border-radius:36px; background:rgba(255,255,255,0.055); box-shadow:0 0 0 1.5px rgba(255,255,255,0.12); opacity:0; }
        .hud3 .hd { position:absolute; left:40px; top:32px; font-family:"Archivo"; font-weight:600; font-size:26px; letter-spacing:0.28em; text-transform:uppercase; color:#9A9A9A; }
        .hud3 .row { position:absolute; left:40px; font-family:"IBM Plex Mono",monospace; font-size:26px; line-height:1.2; color:#FFFFFF; white-space:pre; }
        .hud3 .cur { position:absolute; left:0; top:0; width:14px; height:28px; border-radius:4px; background:#FFFFFF; opacity:0; }
        .mac3 { left:700px; top:1030px; width:320px; height:330px; border-radius:36px; overflow:hidden; opacity:0; box-shadow:0 0 0 1.5px rgba(255,255,255,0.12);
                background-image:url("public/hero.png"); background-repeat:no-repeat; background-size:2400px auto; background-position:-1050px -450px; }`,
  body:(D)=>`
        <div class="clip kick" style="top:254px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k3" style="display:inline-block;opacity:0">FIELD SURVEY</span></div>
        <div class="clip hero3" data-start="0" data-duration="${D}" data-track-index="3"><img src="public/hero.png" alt=""/></div>
        <div class="clip hud3" data-start="0" data-duration="${D}" data-track-index="4">
          <div class="hd">SURVEY LOG</div>
          <div class="row" id="r3a" data-text="> 部位A · 说明词" style="top:96px"></div>
          <div class="row" id="r3b" data-text="> 部位B · 说明词" style="top:160px"></div>
          <div class="row" id="r3c" data-text="+ COMPLETE" style="top:250px; color:#9A9A9A;"></div>
          <div class="cur" id="cur3"></div>
        </div>
        <div class="clip mac3" data-start="0" data-duration="${D}" data-track-index="5">
          <svg viewBox="0 0 320 330" style="position:absolute;inset:0;">
            <path d="M28 60 L28 32 Q28 28 32 28 L60 28" style="fill:none;stroke:#FFFFFF;stroke-width:4;stroke-linecap:round" opacity="0.85"></path>
            <path d="M260 28 L288 28 Q292 28 292 32 L292 60" style="fill:none;stroke:#FFFFFF;stroke-width:4;stroke-linecap:round" opacity="0.85"></path>
            <path d="M292 270 L292 298 Q292 302 288 302 L260 302" style="fill:none;stroke:#FFFFFF;stroke-width:4;stroke-linecap:round" opacity="0.85"></path>
            <path d="M60 302 L32 302 Q28 302 28 298 L28 270" style="fill:none;stroke:#FFFFFF;stroke-width:4;stroke-linecap:round" opacity="0.85"></path>
          </svg>
        </div>
        <div class="clip vz lead3" data-start="0" data-duration="${D}" data-track-index="6">
          <svg viewBox="0 0 1080 1030" xmlns="http://www.w3.org/2000/svg">
            <line id="ln3" x1="360" y1="700" x2="480" y2="330" style="stroke:#FFFFFF;stroke-width:3.5px;stroke-dasharray:3 14;stroke-linecap:round" opacity="0"></line>
            <circle id="anch3" cx="480" cy="330" r="9" style="fill:#E63946;stroke:none" opacity="0"></circle>
          </svg>
        </div>`,
  tl:`
        fadeUp("#k3",0.1,{y:20,dur:DUR.pop});
        fadeUp(".hero3",0.2,{y:30,dur:DUR.panel});
        fadeUp(".hud3",0.5,{y:30,dur:DUR.panel});
        fadeUp(".mac3",0.65,{y:30,dur:DUR.panel});
        tl.fromTo("#anch3",{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.3,ease:EASE.enter},1.0);
        fadeIn("#ln3",1.1,{to:0.8});
        // 换锚点第二拍(时刻锚 words[]): 端点补间 + macro 重新取景同拍(在场移动=EASE.move)——虚线禁 data-draw
        tl.to("#anch3",{attr:{cx:660,cy:520},duration:0.5,ease:EASE.move},2.4);
        tl.to("#ln3",{attr:{x2:660,y2:520},duration:0.5,ease:EASE.move},2.4);
        tl.to(".mac3",{backgroundPosition:"-1450px -900px",duration:0.6,ease:EASE.move},2.4);
        // typewriter + 光标: 确定性 onUpdate(字符数=t 的函数;光标用 offsetWidth 跟随,闪烁=(t%1)<0.5)
        var ROWS=[["r3a",0.9],["r3b",2.5],["r3c",4.0]], tw={t:0};
        tl.to(tw,{t:${D},duration:${D},ease:"none",onUpdate:function(){
          var act=null;
          ROWS.forEach(function(r){ var el=document.getElementById(r[0]); var full=el.getAttribute("data-text");
            var n=Math.max(0,Math.min(full.length,Math.floor((tw.t-r[1])*25)));
            el.textContent=full.slice(0,n); if(tw.t>=r[1]&&n<full.length+8) act=el; });
          var cur=document.getElementById("cur3");
          if(act){ cur.style.opacity=((tw.t%1.0)<0.5)?"1":"0";
            cur.style.transform="translate("+(act.offsetLeft+act.offsetWidth+8)+"px,"+(act.offsetTop-2)+"px)"; }
          else { cur.style.opacity="0"; }
        }},0);`
});

// 示例 D —— 玻璃 stat 卡逐张 stagger(2–3 个并列数据;进场时刻逐张锚 words[],当前卡亮其余暗)
F.push({ id:"04-stats", s:"04", dur: voice(4).duration_s, gOff: voice(1).duration_s + voice(2).duration_s + voice(3).duration_s, envFrame:4,
  poses:[[0,"explain"],[1.0,"point"]], nods:[0.5],
  pulses:[{sel:"#sic4",rgb:"230,57,70",b:12,a:0.55}],
  css:`
        .card4 { position:absolute; left:110px; width:860px; height:300px; border-radius:44px; background:rgba(255,255,255,0.05); box-shadow:0 0 0 1.5px rgba(255,255,255,0.10); opacity:0; }
        .card4 .lb { position:absolute; left:52px; top:42px; font-family:"Archivo"; font-weight:600; font-size:26px; letter-spacing:0.3em; text-transform:uppercase; color:#9A9A9A; }
        .card4 .num { position:absolute; left:52px; top:88px; font-family:"Anton"; font-size:130px; line-height:1; color:#FFFFFF; }
        .card4 .nt { position:absolute; left:52px; top:240px; font-family:"Noto Sans SC"; font-size:26px; color:#9A9A9A; }`,
  body:(D)=>`
        <div class="clip kick" style="top:254px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k4" style="display:inline-block;opacity:0">THE NUMBERS</span></div>
        <div class="clip card4" id="c4a" style="top:340px" data-start="0" data-duration="${D}" data-track-index="4">
          <div class="lb">标签A</div><div class="num">数字A</div><div class="nt">小注A</div>
        </div>
        <div class="clip card4" id="c4b" style="top:680px" data-start="0" data-duration="${D}" data-track-index="5">
          <div class="lb">标签B</div>
          <div class="num"><svg id="sic4" width="44" height="44" viewBox="0 0 44 44" style="display:inline-block;vertical-align:0.06em;margin-right:14px;"><path d="M22 6 L40 38 L4 38 Z" style="fill:#E63946;stroke:#E63946;stroke-width:8;stroke-linejoin:round"></path></svg>数字B</div>
          <div class="nt">小注B</div>
        </div>
        <div class="clip card4" id="c4c" style="top:1020px" data-start="0" data-duration="${D}" data-track-index="6">
          <div class="lb">标签C</div><div class="num">数字C</div><div class="nt">小注C</div>
        </div>`,
  tl:`
        fadeUp("#k4",0.1,{y:20,dur:DUR.pop});
        // 进场时刻逐张锚 words[](说到哪个数字哪张进),禁同帧齐出;当前卡亮其余降 0.72
        fadeUp("#c4a",0.6);
        tl.to("#c4a",{opacity:0.72,scale:1,duration:0.35},1.8);
        tl.fromTo("#c4b",{opacity:0,y:40,scale:1.02,transformOrigin:"50% 50%"},{opacity:1,y:0,duration:DUR.enter,ease:EASE.enter},1.8);
        tl.to("#c4b",{opacity:0.72,scale:1,duration:0.35},3.0);
        tl.fromTo("#c4c",{opacity:0,y:40,scale:1.02,transformOrigin:"50% 50%"},{opacity:1,y:0,duration:DUR.enter,ease:EASE.enter},3.0);
        // 收尾三张齐亮定格
        tl.to(["#c4a","#c4b"],{opacity:1,duration:0.4},4.2);`
});

// 示例 E —— media-pip 视频 B-roll + 贴纸(素材先过 prep_media.sh;帧内是占位窗+文字,
// 真视频由 inject_broll.mjs 注入。用前替换素材路径,不用就删——路径不存在会 fail-fast)
F.push({ id:"05-broll", s:"05", dur: voice(5).duration_s, gOff: [1,2,3,4].reduce((s,n)=>s+voice(n).duration_s,0), envFrame:5,
  poses:[[0,"explain"],[1.0,"point"]], nods:[0.6],
  pulses:[],
  media:{ id:"素材id", type:"video", path:"public/media/素材id.mp4", form:"media-pip" },
  stickers:[{ id:"arrow-red", path:"public/media/stickers/arrow-red.svg", x:790, y:330, w:150, h:150, at:1.4 }],
  css:`
        .cap5 { position:absolute; left:0; top:1080px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:92px; line-height:1; color:#FFFFFF; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k5" style="display:inline-block;opacity:1">FIELD FOOTAGE</span></div>
        <div class="clip cap5" data-start="0" data-duration="${D}" data-track-index="4"><span style="display:inline-block;opacity:0" id="c5a">画面说明词</span></div>`,
  tl:`
        fadeUp("#c5a",0.6);`
});

// 示例 F —— avatar-frame 数字人段(local-rig:小人放大居中,同一 RMS 口型;heygen 自动降级)
F.push({ id:"06-avatar", s:"06", dur: voice(6).duration_s, gOff: [1,2,3,4,5].reduce((s,n)=>s+voice(n).duration_s,0), envFrame:6,
  poses:[[0,"explain"],[1.2,"raise"],[2.6,"welcome"]], nods:[0.5,1.8],
  pulses:[{sel:"#av6up",rgb:"230,57,70",b:10,a:0.5}],
  avatar:{ provider:"local-rig" },
  css:`
        .av6t { position:absolute; left:0; top:330px; width:1080px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:34px; letter-spacing:0.3em; text-transform:uppercase; color:#9A9A9A; }
        .av6u { left:400px; top:392px; width:280px; height:36px; }`,
  body:(D)=>`
        <div class="clip av6t" data-start="0" data-duration="${D}" data-track-index="3"><span id="t6" style="display:inline-block;opacity:0">FACE TO FACE</span></div>
        <div class="clip vz av6u" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 280 36" xmlns="http://www.w3.org/2000/svg">
            <path id="av6up" data-draw d="M14 22 C 88 12, 196 13, 266 20" style="fill:none;stroke:#E63946;stroke-width:6;stroke-linecap:round"></path>
          </svg>
        </div>`,
  tl:`
        ${DRAWSETUP}
        fadeUp("#t6",0.15,{y:16,dur:DUR.pop});
        tl.to("#av6up",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},0.7);`
});

/* ====================== END FRAME CONFIGS ====================== */

mkdirSync(PROJ + "/compositions/frames", { recursive: true });
for (const cfg of F) {
  writeFileSync(PROJ + "/compositions/frames/" + cfg.id + ".html", frame(cfg));
  console.log("wrote", cfg.id + ".html");
}
// slots.json:形式/素材/贴纸/音色的结构化声明——gate 媒体红线只查它,不看像素
writeFileSync(PROJ + "/slots.json", JSON.stringify({
  version: 1,
  voice: meta.voice_type ? { provider: "volcano", voice_type: meta.voice_type } : null,
  frames: SLOTS,
}, null, 2) + "\n");
console.log("wrote slots.json:", SLOTS.length, "frames");
console.log("done:", F.length, "frames");
