// episode.smoke.mjs — 冒烟测试专用 3 镜建帧模板（零 LLM，配 checks/smoke.sh 使用）。
// 覆盖 gate 关注面：vz+data-draw 的 draw-on、每帧一处红、玻璃卡、track-index 自增、IP 小人口型。
// 壳与 assets/generator-base.mjs 同源；配置刻意极简——冒烟验证的是管线机械链路，不是创意质量。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const PROJ = process.cwd();
const meta = JSON.parse(readFileSync(PROJ + "/audio_meta.json", "utf8"));
const voice = (f) => meta.voices.find((v) => v.frame === f);
const envOf = (f) => JSON.stringify(voice(f).mouth_env);

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=Mr+Dafoe&family=Noto+Sans+SC:wght@400;500;700;900&display=swap');`;

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
        .kick { position: absolute; left: 0; width: 1080px; text-align: center; font-family: "Archivo", sans-serif; text-transform: uppercase; letter-spacing: 0.3em; font-size: 34px; color: #9A9A9A; }
`;
const BG = (D) => `
        <div class="clip bg" data-start="0" data-duration="${D}" data-track-index="0"></div>
        <div class="clip grid" data-start="0" data-duration="${D}" data-track-index="0" id="bggrid"></div>
        <div class="clip vig" data-start="0" data-duration="${D}" data-track-index="0"></div>`;

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

const ANIMATOR = `
        function animChar(tl, S, dur, gOff, env, poses, nods){
          var $=function(p){return document.getElementById(p+S);};
          var fl=$('if-float-'),hd=$('if-head-'),ey=$('if-eyes-'),mo=$('if-mouth-'),sh=$('if-shadow-');
          var PG={}; poses.forEach(function(pp){ PG[pp[1]]=$('if-pose-'+pp[1]+'-'); });
          var TAU=Math.PI*2, p={t:0};
          tl.to(p,{t:dur,duration:dur,ease:'none',onUpdate:function(){
            var t=p.t, g=t+gOff;
            var fy=Math.sin(TAU*g/3.5);
            fl.setAttribute('transform','translate(0 '+(12*fy).toFixed(2)+')');
            var ang=2*Math.sin(TAU*g/7), nod=0;
            for(var k=0;k<nods.length;k++){var d=t-nods[k]; if(d>=0&&d<0.5){nod+=9*Math.sin(Math.PI*d/0.5);}}
            hd.setAttribute('transform','rotate('+ang.toFixed(2)+' 180 232) translate(0 '+nod.toFixed(2)+')');
            var bp=((g%4.3)+4.3)%4.3;
            var eye=bp<0.13?(1-0.92*Math.sin(Math.PI*bp/0.13)):1;
            ey.setAttribute('transform','matrix(1,0,0,'+eye.toFixed(3)+',0,'+(162*(1-eye)).toFixed(2)+')');
            var idx=Math.floor(t*30); if(idx<0)idx=0; if(idx>=env.length)idx=env.length-1;
            var e=env.length?env[idx]:0, m=0.15+0.82*e;
            mo.setAttribute('transform','matrix(1,0,0,'+m.toFixed(3)+',0,'+(205*(1-m)).toFixed(2)+')');
            var high=Math.max(0,-fy), sx=(1-0.20*high);
            sh.setAttribute('transform','matrix('+sx.toFixed(3)+',0,0,1,'+(180*(1-sx)).toFixed(2)+',0)');
            sh.style.opacity=(0.55-0.28*high).toFixed(3);
            var seg=0; for(var i=0;i<poses.length;i++){ if(t>=poses[i][0]) seg=i; }
            var prog=Math.min(1,(t-poses[seg][0])/0.3), op={};
            op[poses[seg][1]]=(op[poses[seg][1]]||0)+prog;
            if(seg>0) op[poses[seg-1][1]]=(op[poses[seg-1][1]]||0)+(1-prog);
            for(var nm in PG){ PG[nm].style.opacity=(op[nm]||0).toFixed(3); }
          }},0);
        }`;

const DRAWSETUP = `document.querySelectorAll(".vz [data-draw]").forEach(function(p){var l=p.getTotalLength();p.style.strokeDasharray=l;p.style.strokeDashoffset=l;});`;

const SLOTS = []; // 形式声明 → slots.json(gate 媒体红线只查它;冒烟版无 media/贴纸/avatar 槽)

function frame(cfg) {
  const D = cfg.dur;
  const bodyHtml = cfg.body(D);
  const kind = cfg.kind || (/<svg|<img|<video/i.test(bodyHtml) ? "viz" : "text");
  SLOTS.push({ frame: cfg.envFrame, id: cfg.id, kind, form: cfg.form || null, media: null, stickers: [], avatar: null });
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
${bodyHtml}
        ${char(cfg.s, D)}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
      <script>
${ANIMATOR}
        var MOUTH_ENV = ${envOf(cfg.envFrame)};
        window.__timelines = window.__timelines || {};
        const tl = gsap.timeline({ paused: true });
        // 动效 tokens + helpers(与 generator-base 同源;规范 frame-recipes「动效系统」)
        var EASE={enter:"power4.out",move:"power3.inOut",draw:"power2.out",pop:"back.out(1.7)"};
        var DUR={pop:0.35,enter:0.5,panel:0.65,draw:1.0,breathe:2.0};
        var RISE=40, STAGGER=0.08;
        function fadeUp(sel,at,o){o=o||{};tl.fromTo(sel,{opacity:0,y:(o.y!=null?o.y:RISE)},{opacity:1,y:0,duration:(o.dur!=null?o.dur:DUR.enter),ease:o.ease||EASE.enter},at);}
        function popIn(sel,at,o){o=o||{};tl.fromTo(sel,{opacity:0,scale:(o.from!=null?o.from:0.92),transformOrigin:o.origin||"50% 50%"},{opacity:1,scale:1,duration:(o.dur!=null?o.dur:DUR.pop),ease:o.ease||EASE.pop},at);}
        function fadeIn(sel,at,o){o=o||{};tl.fromTo(sel,{opacity:0},{opacity:(o.to!=null?o.to:1),duration:(o.dur!=null?o.dur:DUR.pop),ease:o.ease||EASE.enter},at);}
        tl.fromTo("#bggrid",{opacity:0},{opacity:1,duration:0.6,ease:"power2.out"},0);
        try {
${cfg.tl}
        } catch(e){}
        animChar(tl, '${cfg.s}', ${D}, ${cfg.gOff}, MOUTH_ENV, ${JSON.stringify(cfg.poses)}, ${JSON.stringify(cfg.nods)});
        window.__timelines["${cfg.id}"] = tl;
      </script>
    </template>
  </body>
</html>
`;
  let ti = 0;
  html = html.replace(/data-track-index="[^"]*"/g, () => `data-track-index="${ti++}"`);
  return html;
}

const F = [];
const gOffTo = (n) => { let s = 0; for (let i = 1; i < n; i++) s += voice(i).duration_s; return s; };

// F1 — 巨字 + 红下划线（覆盖 vz+data-draw 的 draw-on 路径）
F.push({ id: "01-hook", s: "01", dur: voice(1).duration_s, gOff: gOffTo(1), envFrame: 1,
  poses: [[0, "explain"], [1.2, "raise"]], nods: [0.4],
  css: `
        .g1 { position:absolute; left:0; top:640px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:180px; line-height:1; color:#FFFFFF; }
        .uln1 { left:300px; top:880px; width:480px; height:80px; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k1" style="display:inline-block;opacity:0">SMOKE · TEN MINUTES</span></div>
        <div class="clip g1" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g1a">十分钟</span></div>
        <div class="clip vz uln1" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 480 80" xmlns="http://www.w3.org/2000/svg">
            <path id="uln1p" data-draw d="M22 44 C150 22, 330 24, 458 42" style="fill:none;stroke:#E63946;stroke-width:7;stroke-linecap:round"></path>
          </svg>
        </div>`,
  tl: `
        ${DRAWSETUP}
        fadeUp("#k1",0.15,{y:16,dur:DUR.pop});
        fadeUp("#g1a",0.4,{y:60,dur:0.55});
        tl.to("#uln1p",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},1.1);`
});

// F2 — 玻璃卡 + 红三角图标（覆盖玻璃拟态 + 内联 SVG 红）
F.push({ id: "02-system", s: "02", dur: voice(2).duration_s, gOff: gOffTo(2), envFrame: 2,
  poses: [[0, "explain"]], nods: [0.5],
  css: `
        .card2 { position:absolute; left:110px; top:640px; width:860px; height:300px; border-radius:44px; background:rgba(255,255,255,0.05); box-shadow:0 0 0 1.5px rgba(255,255,255,0.10); opacity:0; }
        .card2 .lb { position:absolute; left:52px; top:44px; font-family:"Archivo"; font-weight:600; font-size:26px; letter-spacing:0.3em; text-transform:uppercase; color:#9A9A9A; }
        .card2 .mn { position:absolute; left:52px; top:100px; font-family:"Noto Sans SC"; font-weight:900; font-size:92px; line-height:1; color:#FFFFFF; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k2" style="display:inline-block;opacity:0">THE HARD PART</span></div>
        <div class="clip card2" id="card2" data-start="0" data-duration="${D}" data-track-index="3">
          <div class="lb">SYSTEM</div>
          <div class="mn"><svg id="tri2" width="52" height="52" viewBox="0 0 52 52" style="display:inline-block;vertical-align:0.04em;margin-right:18px;"><path d="M26 8 L46 44 L6 44 Z" style="fill:#E63946;stroke:#E63946;stroke-width:9;stroke-linejoin:round"></path></svg>做成系统</div>
        </div>`,
  tl: `
        fadeUp("#k2",0.15,{y:16,dur:DUR.pop});
        fadeUp("#card2",0.7);`
});

// F3 — 落版巨字 + 红事件行（welcome 收尾）
F.push({ id: "03-cta", s: "03", dur: voice(3).duration_s, gOff: gOffTo(3), envFrame: 3,
  poses: [[0, "explain"], [1.4, "welcome"]], nods: [0.5, 1.5],
  css: `
        .g3 { position:absolute; left:0; top:620px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:180px; line-height:1; color:#FFFFFF; }
        .ev3 { position:absolute; left:0; top:860px; width:1080px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:34px; letter-spacing:0.24em; text-transform:uppercase; color:#E63946; opacity:0; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="2"><span id="k3" style="display:inline-block;opacity:0">WHAT WE BUILD</span></div>
        <div class="clip g3" data-start="0" data-duration="${D}" data-track-index="3"><span style="display:inline-block;opacity:0" id="g3a">我们在做</span></div>
        <div class="clip ev3" data-start="0" data-duration="${D}" data-track-index="4" id="ev3">INTERFLOW · SMOKE PASS</div>`,
  tl: `
        fadeUp("#k3",0.15,{y:16,dur:DUR.pop});
        fadeUp("#g3a",0.4,{y:60,dur:0.55});
        fadeIn("#ev3",1.2);`
});

mkdirSync(PROJ + "/compositions/frames", { recursive: true });
for (const cfg of F) {
  writeFileSync(PROJ + "/compositions/frames/" + cfg.id + ".html", frame(cfg));
  console.log("wrote", cfg.id + ".html");
}
writeFileSync(PROJ + "/slots.json", JSON.stringify({
  version: 1,
  voice: meta.voice_type ? { provider: "volcano", voice_type: meta.voice_type } : null,
  frames: SLOTS,
}, null, 2) + "\n");
console.log("wrote slots.json:", SLOTS.length, "frames");
console.log("done:", F.length, "frames");
