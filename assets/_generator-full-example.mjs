// _generator-full-example.mjs — 完整可跑的 12 镜实战原件（作者已公开发布的一集片源）。
// NOTE(公开版): 本文件是作者一集已公开发布的真实视频的生成器原件,原样保留当参考
// (12 镜 / 6 幕 / 骨架继承 / 点阵贯穿 / 气口留白的完整实战写法)。文案属该集内容,
// 不是模板——写你自己的集子时抄结构与手法,别抄文案。
// 展示：分幕（6 幕）/ 幕内骨架继承（幕B 点阵贯穿·幕C 分屏延续·幕D 同骨架）/ 气口留白 / 每帧一红。
// 用法：对照学习结构；新项目仍从 generator-base.mjs 起步（cp 为 episode.mjs 后改 FRAME CONFIGS）。
// ⚠ 历史原件（2026-07-18，先于 v2 设计 DNA/动效 tokens）：抄它的「结构」（分幕/骨架继承/贯穿隐喻/词锚），
//   别抄它的「数值」——字号按 8 档字阶、动效走 fadeUp/popIn + EASE/DUR tokens（frame-recipes「设计 DNA v2/动效系统」），
//   直接照抄旧字号/旧 ease 会被 gate_redlines 拦下。
// 幕：A[1] B[2-4 点阵贯穿] C[5-6 分屏延续] D[7-9 巨字+图形带] E[10] F[11-12]。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
`;
const BG = (D) => `
        <div class="clip bg" data-start="0" data-duration="${D}" data-track-index="0"></div>
        <div class="clip grid" data-start="0" data-duration="${D}" data-track-index="0" id="bggrid"></div>
        <div class="clip vig" data-start="0" data-duration="${D}" data-track-index="0"></div>`;

// —— IP 小人（4 个可弯曲姿势: explain/point/raise/welcome; 口型/眨眼/点头由 animChar 驱动） ——
const char = (S, DUR) => `
        <div class="clip if-character" data-start="0" data-duration="${DUR}" data-track-index="9"
             style="position:absolute; left:40px; bottom:170px; width:196px; height:250px; z-index:5; pointer-events:none;">
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

function frame(cfg) {
  const D = cfg.dur;
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
${BG(D)}
${cfg.body(D)}
        ${char(cfg.s, D)}
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
        tl.fromTo("#bggrid",{opacity:0},{opacity:1,duration:0.6,ease:"power2.out"},0);
        try {
${cfg.tl}
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

/* ================== FRAME CONFIGS — 实战集 (12 镜 / 6 幕) ==================
幕内帧骨架继承：继承元素终态直出（初始 opacity=终态,不重播入场），kicker 静态延续，
只动画新增/变化元素；气口段(每帧末 0.45–0.8s)禁新元素进场，只留 pulses/浮动。
======================================================================== */
const F = [];
const gOffTo = (n) => { let s = 0; for (let i = 1; i < n; i++) s += voice(i).duration_s; return s; };

// —— 幕B 共享骨架（席位点排 y530 + 漏斗；S=帧后缀保证 id 跨帧唯一） ——
const B_KICK = "上海 · 互通有无 · 付费小局";
const B_STAGE_CSS = `.bstage { left:180px; top:460px; width:720px; height:900px; }`;
const bDotRow = (S, wOp) => `<g id="btop${S}">` +
  [30, 96, 162, 228, 294, 426, 492, 558, 624, 690]
    .map((x) => `<circle cx="${x}" cy="70" r="13" style="fill:#FFFFFF;stroke:none" opacity="${wOp}"></circle>`).join("") +
  `</g>`;
const bSeat = (S, redOp, whiteOp) => `
            <circle id="bseatr${S}" cx="360" cy="70" r="17" style="fill:#E63946;stroke:none" opacity="${redOp}"></circle>
            <circle id="bseatw${S}" cx="360" cy="70" r="17" style="fill:#FFFFFF;stroke:none" opacity="${whiteOp}"></circle>`;
const bFunnel = (S, { draw, lineOp, dotOp, badgeOp }) => `
            <path id="bfl${S}" ${draw ? "data-draw" : ""} d="M30 150 L300 470" stroke-width="3" opacity="${lineOp}"></path>
            <path id="bfr${S}" ${draw ? "data-draw" : ""} d="M690 150 L420 470" stroke-width="3" opacity="${lineOp}"></path>
            <path id="bsa${S}" ${draw ? "data-draw" : ""} d="M300 470 L300 560" stroke-width="3" opacity="${lineOp}"></path>
            <path id="bsb${S}" ${draw ? "data-draw" : ""} d="M420 470 L420 560" stroke-width="3" opacity="${lineOp}"></path>
            <g id="bbot${S}">
              <circle cx="326" cy="600" r="15" style="fill:#FFFFFF;stroke:none" opacity="${dotOp}"></circle>
              <circle cx="360" cy="600" r="15" style="fill:#FFFFFF;stroke:none" opacity="${dotOp}"></circle>
              <circle cx="394" cy="600" r="15" style="fill:#FFFFFF;stroke:none" opacity="${dotOp}"></circle>
            </g>
            <g id="bbadge${S}" opacity="${badgeOp}">
              <rect x="278" y="668" width="164" height="66" rx="33" style="fill:#E63946;stroke:none"></rect>
              <text x="360" y="712" text-anchor="middle" style="fill:#FFFFFF;stroke:none;font-family:'Noto Sans SC';font-weight:900;font-size:34px;">筛人</text>
            </g>`;
const B_GIANT_CSS = `.gB { position:absolute; left:0; top:620px; width:1080px; text-align:center; font-family:"Anton"; font-size:260px; line-height:0.9; letter-spacing:-0.02em; color:#FFFFFF; }
        .subB { position:absolute; left:0; top:920px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:500; font-size:38px; color:#9A9A9A; }`;

// ============ 幕A ============
// F1 — 代码生成钩子：终端 typewriter + 红圆角 play 三角（一处红，与 F11 首尾成环）
F.push({ id:"01-code", s:"01", dur: voice(1).duration_s, gOff: gOffTo(1), envFrame:1,
  poses:[[0,"explain"],[2.34,"point"]], nods:[0.4,2.4],
  pulses:[{sel:"#play1 path",rgb:"230,57,70",b:18,a:0.6}],
  css:`
        .term1 { left:140px; top:470px; width:800px; height:660px; border-radius:40px; background:rgba(255,255,255,0.045); box-shadow:0 0 0 1.5px rgba(255,255,255,0.12); opacity:0; }
        .term1 .dot { position:absolute; top:40px; width:20px; height:20px; border-radius:50%; background:#4A4A4E; }
        .term1 .row { position:absolute; left:52px; font-family:"IBM Plex Mono",monospace; font-size:34px; line-height:1.2; color:#FFFFFF; white-space:pre; }
        .term1 .cur { position:absolute; left:0; top:0; width:16px; height:34px; border-radius:5px; background:#FFFFFF; opacity:0; }
        .play1 { position:absolute; left:320px; top:410px; width:160px; height:160px; opacity:0; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k1" style="display:inline-block;opacity:0">代码生成 · NOT FILMED</span></div>
        <div class="clip term1" data-start="0" data-duration="${D}" data-track-index="4">
          <div class="dot" style="left:52px"></div><div class="dot" style="left:88px"></div><div class="dot" style="left:124px"></div>
          <div class="row" id="r1a" data-text="$ hyperframes render" style="top:120px"></div>
          <div class="row" id="r1b" data-text="> composing 12 frames" style="top:180px"></div>
          <div class="row" id="r1c" data-text="> done  video.mp4" style="top:240px; color:#9A9A9A;"></div>
          <div class="cur" id="cur1"></div>
          <div class="play1" id="play1">
            <svg viewBox="0 0 160 160">
              <rect x="8" y="8" width="144" height="144" rx="40" style="fill:none;stroke:#FFFFFF;stroke-width:4"></rect>
              <path d="M62 48 L116 80 L62 112 Z" style="fill:#E63946;stroke:#E63946;stroke-width:14;stroke-linejoin:round;stroke-linecap:round"></path>
            </svg>
          </div>
        </div>`,
  tl:`
        tl.fromTo("#k1",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.15);
        tl.fromTo(".term1",{opacity:0,y:30},{opacity:1,y:0,duration:0.55,ease:"power3.out"},0.3);
        var ROWS=[["r1a",0.6],["r1b",1.35],["r1c",2.05]], tw={t:0};
        tl.to(tw,{t:${voice(1).duration_s},duration:${voice(1).duration_s},ease:"none",onUpdate:function(){
          var act=null;
          ROWS.forEach(function(r){ var el=document.getElementById(r[0]); var full=el.getAttribute("data-text");
            var n=Math.max(0,Math.min(full.length,Math.floor((tw.t-r[1])*26)));
            el.textContent=full.slice(0,n); if(tw.t>=r[1]&&n<full.length+6) act=el; });
          var cur=document.getElementById("cur1");
          if(act){ cur.style.opacity=((tw.t%1.0)<0.5)?"1":"0";
            cur.style.transform="translate("+(act.offsetLeft+act.offsetWidth+8)+"px,"+(act.offsetTop-1)+"px)"; }
          else { cur.style.opacity="0"; }
        }},0);
        tl.fromTo("#play1",{opacity:0,scale:0.7,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.5,ease:"back.out(1.6)"},2.5);`
});

// ============ 幕B（点阵贯穿：席位排 → 落进漏斗 → 剩下认真的人） ============
// F2 — 幕B-1：kicker 入场一次(此后静态延续)，巨数字 10–15，席位点排进场，红席位=你
F.push({ id:"02-count", s:"02", dur: voice(2).duration_s, gOff: gOffTo(2), envFrame:2,
  poses:[[0,"explain"],[2.02,"point"]], nods:[0.5,2.1],
  pulses:[{sel:"#bseatr02",rgb:"230,57,70",b:15,a:0.6}],
  css:`
        ${B_STAGE_CSS}
        ${B_GIANT_CSS}`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k2" style="display:inline-block;opacity:0">${B_KICK}</span></div>
        <div class="clip gB" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g2a">10&#8211;15</span></div>
        <div class="clip subB" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="sub2a">一场只收这么多人</span></div>
        <div class="clip vz bstage" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 720 900" xmlns="http://www.w3.org/2000/svg">
            ${bDotRow("02", 0)}
            ${bSeat("02", 0, 0)}
          </svg>
        </div>`,
  tl:`
        tl.fromTo("#k2",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.15);
        tl.fromTo("#g2a",{opacity:0,y:60,scale:0.9,transformOrigin:"50% 60%"},{opacity:1,y:0,scale:1,duration:0.6,ease:"expo.out"},0.5);
        tl.fromTo("#sub2a",{opacity:0,y:16},{opacity:1,y:0,duration:0.45,ease:"power3.out"},1.5);
        tl.fromTo("#btop02 circle",{opacity:0,scale:0.3,transformOrigin:"50% 50%"},{opacity:0.9,scale:1,duration:0.3,ease:"power2.out",stagger:0.05},2.02);
        tl.fromTo("#bseatr02",{opacity:0,scale:0.3,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.4,ease:"back.out(1.8)"},3.0);`
});

// F3 — 幕B-2 骨架继承：点排/红席位/巨字终态直出；巨字退场，漏斗 draw-on，底 3 点 + 红徽章「筛人」，红席位转白
F.push({ id:"03-filter", s:"03", dur: voice(3).duration_s, gOff: gOffTo(3), envFrame:3,
  poses:[[0,"explain"],[1.52,"point"]], nods:[0.3,1.6],
  pulses:[{sel:"#bbadge03",rgb:"230,57,70",b:16,a:0.6}],
  css:`
        ${B_STAGE_CSS}
        ${B_GIANT_CSS}`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span>${B_KICK}</span></div>
        <div class="clip gB" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block" id="g3a">10&#8211;15</span></div>
        <div class="clip subB" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block" id="sub3a">一场只收这么多人</span></div>
        <div class="clip vz bstage" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 720 900" xmlns="http://www.w3.org/2000/svg">
            ${bDotRow("03", 0.9)}
            ${bSeat("03", 1, 0)}
            ${bFunnel("03", { draw: true, lineOp: 0.55, dotOp: 0, badgeOp: 0 })}
          </svg>
        </div>`,
  tl:`
        ${DRAWSETUP}
        tl.to("#g3a",{opacity:0.12,y:-30,scale:0.9,transformOrigin:"50% 50%",duration:0.5,ease:"power2.inOut"},0.05);
        tl.to("#sub3a",{opacity:0,duration:0.35},0.05);
        tl.to("#bfl03",{strokeDashoffset:0,duration:0.65,ease:"power2.out"},0.6);
        tl.to("#bfr03",{strokeDashoffset:0,duration:0.65,ease:"power2.out"},0.6);
        tl.to(["#bsa03","#bsb03"],{strokeDashoffset:0,duration:0.35,ease:"power2.out"},1.15);
        tl.to("#btop03 circle",{opacity:0.4,duration:0.5,ease:"power2.out"},1.52);
        tl.fromTo("#bbot03 circle",{opacity:0,scale:0.3,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.35,ease:"power3.out",stagger:0.1},1.7);
        tl.fromTo("#bbadge03",{opacity:0,y:16},{opacity:1,y:0,duration:0.45,ease:"power3.out"},2.3);
        tl.to("#bseatr03",{opacity:0,duration:0.4},2.3);
        tl.fromTo("#bseatw03",{opacity:0},{opacity:0.4,duration:0.4},2.3);`
});

// F4 — 幕B-3 骨架继承：漏斗/点阵调暗成环境（徽章淡出），巨字「认真的人」+ 手绘红圈压上
F.push({ id:"04-serious", s:"04", dur: voice(4).duration_s, gOff: gOffTo(4), envFrame:4,
  poses:[[0,"explain"],[2.74,"raise"]], nods:[0.4,2.8],
  pulses:[{sel:"#ring4",rgb:"230,57,70",b:16,a:0.6}],
  css:`
        ${B_STAGE_CSS}
        ${B_GIANT_CSS}
        .g4 { position:absolute; left:0; top:640px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:170px; line-height:1; color:#FFFFFF; }
        .circ4 { left:90px; top:560px; width:900px; height:400px; pointer-events:none; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span>${B_KICK}</span></div>
        <div class="clip gB" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0.12;transform:translateY(-30px) scale(0.9)" id="g4rem">10&#8211;15</span></div>
        <div class="clip vz bstage" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 720 900" xmlns="http://www.w3.org/2000/svg">
            ${bDotRow("04", 0.4)}
            ${bSeat("04", 0, 0.4)}
            ${bFunnel("04", { draw: false, lineOp: 0.55, dotOp: 1, badgeOp: 1 })}
          </svg>
        </div>
        <div class="clip g4" data-start="0" data-duration="${D}" data-track-index="5"><span style="display:inline-block;opacity:0" id="g4a">认真的人</span></div>
        <div class="clip vz circ4" data-start="0" data-duration="${D}" data-track-index="6">
          <svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
            <path id="ring4" data-draw d="M760 66 C450 22, 160 48, 100 176 C44 296, 200 348, 470 348 C760 348, 856 274, 834 172 C816 86, 600 58, 400 62 C344 63, 288 68, 250 82"
                  style="fill:none;stroke:#E63946;stroke-width:8;stroke-linecap:round;stroke-linejoin:round" transform="rotate(-4 450 200)"></path>
          </svg>
        </div>`,
  tl:`
        ${DRAWSETUP}
        tl.to("#g4rem",{opacity:0,duration:0.4},0.1);
        tl.to("#bbadge04",{opacity:0,duration:0.45,ease:"power2.in"},0.15);
        tl.to(["#bfl04","#bfr04","#bsa04","#bsb04"],{opacity:0.22,duration:0.5},0.15);
        tl.to("#btop04 circle",{opacity:0.25,duration:0.5},0.15);
        tl.to("#bseatw04",{opacity:0.25,duration:0.5},0.15);
        tl.to("#bbot04 circle",{opacity:0.85,duration:0.5},0.15);
        tl.fromTo("#g4a",{opacity:0,y:60},{opacity:1,y:0,duration:0.55,ease:"expo.out"},2.74);
        tl.to("#bbot04 circle",{opacity:1,scale:1.15,transformOrigin:"50% 50%",duration:0.4,ease:"power2.out"},2.74);
        tl.to("#ring4",{strokeDashoffset:0,duration:0.85,ease:"power2.inOut"},3.25);`
});

// ============ 幕C（分屏延续） ============
// F5 — 幕C-1：分屏立骨架，左「品牌人」点亮 + 红胶囊「还没 AI 作品」，右 BUILDER ghost
F.push({ id:"05-typeA", s:"05", dur: voice(5).duration_s, gOff: gOffTo(5), envFrame:5,
  poses:[[0,"explain"],[1.46,"point"]], nods:[0.4,3.2],
  pulses:[{sel:"#tagA5 span",rgb:"230,57,70",b:12,a:0.45}],
  css:`
        .hdC { position:absolute; width:460px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:96px; line-height:1; color:#FFFFFF; }
        .hdCe { position:absolute; width:460px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:80px; letter-spacing:0.04em; text-transform:uppercase; line-height:1; color:#FFFFFF; }
        .subC { position:absolute; width:460px; text-align:center; font-family:"Noto Sans SC"; font-weight:500; font-size:34px; color:#9A9A9A; }
        .tagC { position:absolute; width:460px; text-align:center; }
        .tagC span { display:inline-block; padding:12px 28px; border-radius:30px; border:2px solid #E63946; font-family:"Noto Sans SC"; font-weight:700; font-size:32px; color:#E63946; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k5" style="display:inline-block;opacity:0">想请两类人 · TWO KINDS</span></div>
        <div class="clip vz" data-start="0" data-duration="${D}" data-track-index="4" style="left:0;top:0;width:1080px;height:1360px;">
          <svg viewBox="0 0 1080 1360" style="width:1080px;height:1360px;"><path id="div5" data-draw d="M540 640 L540 940" stroke-width="2.5" opacity="0.5"></path></svg>
        </div>
        <div class="clip hdC" data-start="0" data-duration="${D}" data-track-index="3" id="hd5a" style="left:60px;top:680px;opacity:0;">品牌人</div>
        <div class="clip subC" data-start="0" data-duration="${D}" data-track-index="3" id="sub5a" style="left:60px;top:830px;opacity:0;">会讲故事 · 会卖东西</div>
        <div class="clip tagC" data-start="0" data-duration="${D}" data-track-index="3" id="tagA5" style="left:60px;top:920px;opacity:0;"><span>还没 AI 作品</span></div>
        <div class="clip hdCe" data-start="0" data-duration="${D}" data-track-index="3" id="hd5b" style="left:560px;top:690px;opacity:0;">BUILDER</div>
        <div class="clip subC" data-start="0" data-duration="${D}" data-track-index="3" id="sub5b" style="left:560px;top:830px;opacity:0;">做得出 · 不会卖</div>`,
  tl:`
        ${DRAWSETUP}
        tl.fromTo("#k5",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.15);
        tl.to("#div5",{strokeDashoffset:0,duration:0.6,ease:"power2.out"},0.5);
        tl.fromTo("#hd5a",{opacity:0,y:24},{opacity:0.5,y:0,duration:0.45,ease:"power3.out"},0.9);
        tl.fromTo("#hd5b",{opacity:0,y:24},{opacity:0.35,y:0,duration:0.45,ease:"power3.out"},1.02);
        tl.fromTo("#sub5b",{opacity:0},{opacity:0.4,duration:0.4},1.15);
        tl.to("#hd5a",{opacity:1,duration:0.4,ease:"power2.out"},1.46);
        tl.fromTo("#sub5a",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},1.7);
        tl.fromTo("#tagA5",{opacity:0,y:14,scale:0.9,transformOrigin:"50% 50%"},{opacity:1,y:0,scale:1,duration:0.45,ease:"back.out(1.6)"},3.3);`
});

// F6 — 幕C-2 骨架继承（F5 终态直出）：BUILDER 点亮，左侧降级，红胶囊淡出让位红互补双箭头
F.push({ id:"06-typeB", s:"06", dur: voice(6).duration_s, gOff: gOffTo(6), envFrame:6,
  poses:[[0,"explain"],[2.86,"raise"]], nods:[0.3,2.9],
  pulses:[{sel:"#link6",rgb:"230,57,70",b:15,a:0.55}],
  css:`
        .hdC { position:absolute; width:460px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:96px; line-height:1; color:#FFFFFF; }
        .hdCe { position:absolute; width:460px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:80px; letter-spacing:0.04em; text-transform:uppercase; line-height:1; color:#FFFFFF; }
        .subC { position:absolute; width:460px; text-align:center; font-family:"Noto Sans SC"; font-weight:500; font-size:34px; color:#9A9A9A; }
        .tagC { position:absolute; width:460px; text-align:center; }
        .tagC span { display:inline-block; padding:12px 28px; border-radius:30px; border:2px solid #E63946; font-family:"Noto Sans SC"; font-weight:700; font-size:32px; color:#E63946; }
        .cplbl6 { position:absolute; left:0; top:960px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:44px; color:#E63946; opacity:0; }
        .link6box { left:290px; top:1030px; width:500px; height:120px; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span>想请两类人 · TWO KINDS</span></div>
        <div class="clip vz" data-start="0" data-duration="${D}" data-track-index="4" style="left:0;top:0;width:1080px;height:1360px;">
          <svg viewBox="0 0 1080 1360" style="width:1080px;height:1360px;"><path d="M540 640 L540 940" stroke-width="2.5" opacity="0.5"></path></svg>
        </div>
        <div class="clip hdC" data-start="0" data-duration="${D}" data-track-index="3" id="hd6a" style="left:60px;top:680px;">品牌人</div>
        <div class="clip subC" data-start="0" data-duration="${D}" data-track-index="3" id="sub6a" style="left:60px;top:830px;">会讲故事 · 会卖东西</div>
        <div class="clip tagC" data-start="0" data-duration="${D}" data-track-index="3" id="tag6" style="left:60px;top:920px;"><span>还没 AI 作品</span></div>
        <div class="clip hdCe" data-start="0" data-duration="${D}" data-track-index="3" id="hd6b" style="left:560px;top:690px;opacity:0.35;">BUILDER</div>
        <div class="clip subC" data-start="0" data-duration="${D}" data-track-index="3" id="sub6b" style="left:560px;top:830px;opacity:0.4;">做得出 · 不会卖</div>
        <div class="clip cplbl6" data-start="0" data-duration="${D}" data-track-index="3" id="cplbl6">互补</div>
        <div class="clip vz link6box" data-start="0" data-duration="${D}" data-track-index="5">
          <svg viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg">
            <path id="link6" data-draw d="M70 60 L430 60" style="fill:none;stroke:#E63946;stroke-width:5;stroke-linecap:round"></path>
            <path id="lch6l" d="M96 42 L66 60 L96 78" style="fill:none;stroke:#E63946;stroke-width:5;stroke-linecap:round;stroke-linejoin:round" opacity="0"></path>
            <path id="lch6r" d="M404 42 L434 60 L404 78" style="fill:none;stroke:#E63946;stroke-width:5;stroke-linecap:round;stroke-linejoin:round" opacity="0"></path>
          </svg>
        </div>`,
  tl:`
        ${DRAWSETUP}
        tl.to("#hd6b",{opacity:1,duration:0.5,ease:"power2.out"},0.15);
        tl.to(["#hd6a","#sub6a"],{opacity:0.45,duration:0.5},0.15);
        tl.to("#sub6b",{opacity:1,duration:0.4,ease:"power2.out"},1.74);
        tl.to("#tag6",{opacity:0,duration:0.4,ease:"power2.in"},2.3);
        tl.to("#link6",{strokeDashoffset:0,duration:0.55,ease:"power2.inOut"},2.86);
        tl.fromTo("#cplbl6",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"back.out(1.6)"},3.0);
        tl.fromTo(["#lch6l","#lch6r"],{opacity:0},{opacity:1,duration:0.3},3.35);`
});

// ============ 幕D（骨架 = 巨字带 y460 + 图形带 y880；kicker 常驻，红点跨帧接力） ============
const D_KICK = "流程设计 · THE FORMAT";
const D_GIANT_CSS = `.gD { position:absolute; left:0; top:460px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:150px; line-height:1; color:#FFFFFF; }`;

// F7 — 幕D-1：巨字「轮到你」+ 时间轴分段（当前段红）
F.push({ id:"07-slot", s:"07", dur: voice(7).duration_s, gOff: gOffTo(7), envFrame:7,
  poses:[[0,"explain"],[1.8,"point"]], nods:[0.3,1.9],
  pulses:[{sel:"#seg7",rgb:"230,57,70",b:14,a:0.5}],
  css:`
        ${D_GIANT_CSS}
        .slot7 { left:120px; top:900px; width:840px; height:280px; }
        .sl7 { position:absolute; font-family:"Noto Sans SC"; font-weight:700; font-size:30px; color:#FFFFFF; opacity:0; text-align:center; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k7" style="display:inline-block;opacity:0">${D_KICK}</span></div>
        <div class="clip gD" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g7a">轮到你</span></div>
        <div class="clip vz slot7" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 840 280" xmlns="http://www.w3.org/2000/svg">
            <rect id="s7a" class="ln" x="25" y="110" width="150" height="60" rx="30" style="fill:none;stroke:#FFFFFF;stroke-width:2.5" opacity="0"></rect>
            <rect id="s7b" class="ln" x="195" y="110" width="150" height="60" rx="30" style="fill:none;stroke:#FFFFFF;stroke-width:2.5" opacity="0"></rect>
            <rect id="seg7" x="355" y="72" width="150" height="120" rx="44" style="fill:rgba(230,57,70,0.14);stroke:#E63946;stroke-width:4" opacity="0"></rect>
            <rect id="s7d" class="ln" x="525" y="110" width="150" height="60" rx="30" style="fill:none;stroke:#FFFFFF;stroke-width:2.5" opacity="0"></rect>
            <rect id="s7e" class="ln" x="695" y="110" width="120" height="60" rx="30" style="fill:none;stroke:#FFFFFF;stroke-width:2.5" opacity="0"></rect>
          </svg>
          <div class="sl7" id="sl7l" style="left:355px;top:210px;width:150px;">你的一段</div>
        </div>`,
  tl:`
        tl.fromTo("#k7",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.15);
        tl.fromTo("#g7a",{opacity:0,y:50},{opacity:1,y:0,duration:0.5,ease:"expo.out"},0.3);
        tl.fromTo(["#s7a","#s7b","#s7d","#s7e"],{opacity:0},{opacity:0.5,duration:0.4,ease:"power2.out",stagger:0.1},1.12);
        tl.fromTo("#seg7",{opacity:0,scaleY:0.5,transformOrigin:"50% 50%"},{opacity:1,scaleY:1,duration:0.5,ease:"power3.out"},1.8);
        tl.fromTo("#sl7l",{opacity:0,y:10},{opacity:1,y:0,duration:0.4,ease:"power3.out"},2.2);`
});

// F8 — 幕D-2 同骨架：图形带换迁移弧线，巨字「卖给谁」压 punchline（2.96 给谁）
F.push({ id:"08-feedback", s:"08", dur: voice(8).duration_s, gOff: gOffTo(8), envFrame:8,
  poses:[[0,"explain"],[1.84,"point"]], nods:[0.3,3.0],
  pulses:[{sel:"#dst8",rgb:"230,57,70",b:15,a:0.6}],
  css:`
        ${D_GIANT_CSS}
        .arc8 { left:140px; top:900px; width:800px; height:300px; }
        .a8l { position:absolute; font-family:"Noto Sans SC"; font-weight:700; font-size:30px; color:#FFFFFF; opacity:0; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span>${D_KICK}</span></div>
        <div class="clip gD" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g8a">卖给谁</span></div>
        <div class="clip vz arc8" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
            <line x1="40" y1="232" x2="760" y2="232" stroke="#FFFFFF" stroke-width="1.5" opacity="0.14"></line>
            <circle id="src8" cx="90" cy="226" r="10" style="fill:none;stroke:#FFFFFF;stroke-width:3.5" opacity="0"></circle>
            <path id="arc8p" data-draw class="glow-w" d="M98 218 Q400 22 682 190" stroke-width="4"></path>
            <path id="chev8" d="M-16 -10 L0 0 L-16 10" stroke="#FFFFFF" stroke-width="4" fill="none" opacity="0"></path>
            <circle id="trav8" r="6" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
            <circle id="dst8" cx="712" cy="212" r="13" style="fill:#E63946;stroke:none" opacity="0"></circle>
          </svg>
          <div class="a8l" id="a8la" style="left:22px;top:250px;width:140px;text-align:center;color:#9A9A9A;">你跑通的</div>
          <div class="a8l" id="a8lb" style="left:642px;top:246px;width:140px;text-align:center;color:#E63946;">买家在哪</div>
        </div>`,
  tl:`
        ${DRAWSETUP}
        var ap8=document.getElementById("arc8p"), L8=ap8.getTotalLength();
        var e8=ap8.getPointAtLength(L8), q8=ap8.getPointAtLength(L8-2);
        document.getElementById("chev8").setAttribute("transform","translate("+e8.x.toFixed(1)+" "+e8.y.toFixed(1)+") rotate("+(Math.atan2(e8.y-q8.y,e8.x-q8.x)*180/Math.PI).toFixed(1)+")");
        tl.fromTo("#src8",{opacity:0,scale:0.4,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.3},0.3);
        tl.fromTo("#a8la",{opacity:0},{opacity:1,duration:0.3},0.45);
        tl.to("#arc8p",{strokeDashoffset:0,duration:0.9,ease:"power2.out"},1.84);
        var tv8={p:0};
        tl.fromTo("#trav8",{opacity:0},{opacity:1,duration:0.15},1.9);
        tl.to(tv8,{p:1,duration:0.8,ease:"power2.out",onUpdate:function(){var pt=ap8.getPointAtLength(tv8.p*L8);var td=document.getElementById("trav8");td.setAttribute("cx",pt.x.toFixed(1));td.setAttribute("cy",pt.y.toFixed(1));}},1.88);
        tl.to("#trav8",{opacity:0,duration:0.2},2.68);
        tl.fromTo("#chev8",{opacity:0},{opacity:1,duration:0.25},2.66);
        tl.fromTo("#dst8",{opacity:0,scale:0.4,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.35,ease:"power3.out"},2.96);
        tl.fromTo("#g8a",{opacity:0,y:50},{opacity:1,y:0,duration:0.5,ease:"expo.out"},2.96);
        tl.fromTo("#a8lb",{opacity:0},{opacity:1,duration:0.3},3.1);`
});

// F9 — 幕D-3 同骨架：巨字「控场」，图形带换圆桌环，主持人节点红，副行落「不被淹没」
F.push({ id:"09-table", s:"09", dur: voice(9).duration_s, gOff: gOffTo(9), envFrame:9,
  poses:[[0,"explain"],[1.42,"point"]], nods:[0.3,2.8],
  pulses:[{sel:"#modn9",rgb:"230,57,70",b:16,a:0.6}],
  css:`
        ${D_GIANT_CSS}
        .sub9 { position:absolute; left:0; top:660px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:500; font-size:36px; color:#9A9A9A; }
        .tbl9 { left:190px; top:880px; width:700px; height:420px; }
        .modl9 { position:absolute; left:0; top:40px; width:700px; text-align:center; font-family:"Noto Sans SC"; font-weight:700; font-size:26px; color:#E63946; opacity:0; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span>${D_KICK}</span></div>
        <div class="clip gD" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g9a">控场</span></div>
        <div class="clip sub9" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="sub9a">主持人在场，你不被聊天高手淹没</span></div>
        <div class="clip vz tbl9" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg">
            <ellipse id="tbl9e" cx="350" cy="230" rx="240" ry="110" style="fill:none;stroke:#FFFFFF;stroke-width:2.5" opacity="0"></ellipse>
            <g id="seats9">
              <circle cx="590" cy="230" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
              <circle cx="520" cy="308" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
              <circle cx="350" cy="340" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
              <circle cx="180" cy="308" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
              <circle cx="110" cy="230" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
              <circle cx="180" cy="152" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
              <circle cx="520" cy="152" r="14" style="fill:#FFFFFF;stroke:none" opacity="0"></circle>
            </g>
            <circle id="modn9" cx="350" cy="120" r="20" style="fill:#E63946;stroke:none" opacity="0"></circle>
          </svg>
          <div class="modl9" id="modl9t">主持人</div>
        </div>`,
  tl:`
        tl.fromTo("#g9a",{opacity:0,y:50},{opacity:1,y:0,duration:0.5,ease:"expo.out"},0.2);
        tl.fromTo("#tbl9e",{opacity:0},{opacity:0.9,duration:0.6,ease:"power2.out"},0.6);
        tl.fromTo("#modn9",{opacity:0,scale:0.4,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.4,ease:"power3.out"},0.9);
        tl.fromTo("#modl9t",{opacity:0},{opacity:1,duration:0.35},1.1);
        tl.fromTo("#seats9 circle",{opacity:0,scale:0.3,transformOrigin:"50% 50%"},{opacity:0.92,scale:1,duration:0.32,ease:"power3.out",stagger:0.13},1.42);
        tl.fromTo("#sub9a",{opacity:0,y:14},{opacity:1,y:0,duration:0.45,ease:"power3.out"},2.7);`
});

// ============ 幕E（全片呼吸拍） ============
// F10 — 表达越稀缺：副行「能当面让人信你」→ 巨字「越稀缺」→ 红手绘下划线
F.push({ id:"10-scarce", s:"10", dur: voice(10).duration_s, gOff: gOffTo(10), envFrame:10,
  poses:[[0,"explain"],[2.7,"raise"]], nods:[0.5,2.75],
  pulses:[{sel:"#uline10",rgb:"230,57,70",b:14,a:0.55}],
  css:`
        .sub10 { position:absolute; left:0; top:640px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:500; font-size:46px; color:#B8B8B8; }
        .g10 { position:absolute; left:0; top:800px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:200px; line-height:1; color:#FFFFFF; }
        .uln10 { left:280px; top:1040px; width:520px; height:90px; pointer-events:none; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k10" style="display:inline-block;opacity:0">AI 越发达 · 越稀缺</span></div>
        <div class="clip sub10" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="sub10a">能当面让人信你</span></div>
        <div class="clip g10" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g10a">越稀缺</span></div>
        <div class="clip vz uln10" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 520 90" xmlns="http://www.w3.org/2000/svg">
            <path id="uline10" data-draw d="M24 48 C160 24, 360 26, 496 46" style="fill:none;stroke:#E63946;stroke-width:7;stroke-linecap:round"></path>
          </svg>
        </div>`,
  tl:`
        ${DRAWSETUP}
        tl.fromTo("#k10",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.15);
        tl.fromTo("#sub10a",{opacity:0,y:16},{opacity:1,y:0,duration:0.5,ease:"power3.out"},1.5);
        tl.fromTo("#g10a",{opacity:0,y:60},{opacity:1,y:0,duration:0.55,ease:"expo.out"},2.7);
        tl.to("#uline10",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},3.15);`
});

// ============ 幕F（绝活 + CTA） ============
// F11 — 两个绝活：双玻璃卡，卡2 红标「就是这条视频」回扣 F1
F.push({ id:"11-skills", s:"11", dur: voice(11).duration_s, gOff: gOffTo(11), envFrame:11,
  poses:[[0,"explain"],[1.92,"point"],[3.3,"point"]], nods:[0.4,2.0,3.4],
  pulses:[{sel:"#tag11",rgb:"230,57,70",b:14,a:0.55}],
  css:`
        .card11 { position:absolute; left:110px; width:860px; height:280px; border-radius:44px; background:rgba(255,255,255,0.05); box-shadow:0 0 0 1.5px rgba(255,255,255,0.10); opacity:0; }
        .card11 .lb { position:absolute; left:52px; top:40px; font-family:"Archivo"; font-weight:600; font-size:26px; letter-spacing:0.3em; text-transform:uppercase; color:#9A9A9A; }
        .card11 .mn { position:absolute; left:52px; top:92px; font-family:"Noto Sans SC"; font-weight:900; font-size:66px; line-height:1; color:#FFFFFF; }
        .card11 .nt { position:absolute; left:52px; top:200px; font-family:"Noto Sans SC"; font-size:28px; color:#9A9A9A; }
        .tag11 { position:absolute; right:44px; top:44px; padding:10px 24px; border-radius:26px; background:#E63946; font-family:"Noto Sans SC"; font-weight:700; font-size:28px; color:#FFFFFF; opacity:0; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k11" style="display:inline-block;opacity:0">当场拆两个绝活 · LIVE DEMO</span></div>
        <div class="clip card11" id="c11a" style="top:460px" data-start="0" data-duration="${D}" data-track-index="4">
          <div class="lb">绝活 01</div><div class="mn">抓小红书 · 做选题</div><div class="nt">找到真正能爆的题</div>
        </div>
        <div class="clip card11" id="c11b" style="top:800px" data-start="0" data-duration="${D}" data-track-index="5">
          <div class="lb">绝活 02</div><div class="mn">用代码 · 做视频</div><div class="nt">文生视频，当场跑</div>
          <div class="tag11" id="tag11">就是这条视频</div>
        </div>`,
  tl:`
        tl.fromTo("#k11",{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.15);
        tl.fromTo("#c11a",{opacity:0,y:40,scale:1.02,transformOrigin:"50% 50%"},{opacity:1,y:0,scale:1,duration:0.5,ease:"power3.out"},1.92);
        tl.to("#c11a",{opacity:0.7,duration:0.35},3.3);
        tl.fromTo("#c11b",{opacity:0,y:40,scale:1.02,transformOrigin:"50% 50%"},{opacity:1,y:0,scale:1,duration:0.5,ease:"power3.out"},3.3);
        tl.fromTo("#tag11",{opacity:0,scale:0.8,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.45,ease:"back.out(1.7)"},3.95);`
});

// F12 — 幕F-2 收束：日期巨字「0718」+ 红 AI COFFEE CHAT + 双路 CTA + 署名（kicker 静态直出）
F.push({ id:"12-cta", s:"12", dur: voice(12).duration_s, gOff: gOffTo(12), envFrame:12,
  poses:[[0,"explain"],[0.7,"point"],[2.62,"welcome"]], nods:[0.75,2.7],
  pulses:[{sel:"#ev12",rgb:"230,57,70",b:13,a:0.5}],
  css:`
        .g12 { position:absolute; left:0; top:500px; width:1080px; text-align:center; font-family:"Anton"; font-size:300px; line-height:0.9; letter-spacing:0.02em; color:#FFFFFF; }
        .ev12 { position:absolute; left:0; top:840px; width:1080px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:36px; letter-spacing:0.24em; text-transform:uppercase; color:#E63946; opacity:0; }
        .opt12 { position:absolute; left:0; top:960px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:700; font-size:44px; color:#FFFFFF; opacity:0; }
        .opt12 b { color:#9A9A9A; font-weight:500; }
        .sig12 { position:absolute; right:120px; top:1130px; transform:rotate(-4deg); font-family:"Mr Dafoe"; font-size:96px; color:#FFFFFF; opacity:0; }`,
  body:(D)=>`
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span>这一期 · 欢迎入场</span></div>
        <div class="clip g12" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g12a">0718</span></div>
        <div class="clip ev12" data-start="0" data-duration="${D}" data-track-index="3" id="ev12">AI COFFEE CHAT</div>
        <div class="clip opt12" data-start="0" data-duration="${D}" data-track-index="3" id="opt12">评论区 <b>·</b> 或私信我</div>
        <div class="clip sig12" data-start="0" data-duration="${D}" data-track-index="5" id="sig12">Interflow</div>`,
  tl:`
        tl.fromTo("#g12a",{opacity:0,y:60,scale:0.92,transformOrigin:"50% 60%"},{opacity:1,y:0,scale:1,duration:0.6,ease:"expo.out"},0.7);
        tl.fromTo("#ev12",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},1.5);
        tl.fromTo("#opt12",{opacity:0,y:16},{opacity:1,y:0,duration:0.5,ease:"power3.out"},2.62);
        tl.fromTo("#sig12",{opacity:0},{opacity:1,duration:0.55,ease:"power1.out"},3.5);`
});

/* ====================== END FRAME CONFIGS ====================== */

mkdirSync(PROJ + "/compositions/frames", { recursive: true });
for (const cfg of F) {
  writeFileSync(PROJ + "/compositions/frames/" + cfg.id + ".html", frame(cfg));
  console.log("wrote", cfg.id + ".html");
}
console.log("done:", F.length, "frames");
