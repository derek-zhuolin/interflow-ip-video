// smoke-media.configs.mjs — 素材冒烟的 6 镜 F 配置(配 checks/smoke_media.sh 使用)。
// 本文件不是完整生成器:smoke_media.sh 会把它拼进 generator-base.mjs 的 EDIT 区——
// 机器部分(buildMedia/buildStickers/avatar/slots)只有 generator-base 一份,冒烟测的就是真机器。
// 覆盖:media-full 图+贴纸 / media-pip 视频(over 注入) / media-bg 图 / avatar heygen 降级 /
//       纯文字回退+红贴纸 / media-bg 视频(under 注入,BG_DIM)。
const gOffTo = (n) => { let s = 0; for (let i = 1; i < n; i++) s += voice(i).duration_s; return s; };

// F1 — media-full 图(自动 Ken Burns + 底部渐隐)+ 白贴纸 + 红下划线
F.push({ id: "01-full", s: "01", dur: voice(1).duration_s, gOff: gOffTo(1), envFrame: 1,
  poses: [[0, "explain"], [1.2, "point"]], nods: [0.4],
  pulses: [{ sel: "#u1p", rgb: "230,57,70", b: 10, a: 0.5 }],
  media: { id: "img-a", type: "image", path: "public/media/img-a.png", form: "media-full" },
  stickers: [{ id: "spark-white", path: "public/media/stickers/spark-white.svg", x: 840, y: 150, w: 140, h: 140, at: 1.2 }],
  css: `
        .t1 { position:absolute; left:0; top:1110px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:130px; line-height:1; color:#FFFFFF; }
        .u1 { left:330px; top:1284px; width:420px; height:44px; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k1" style="display:inline-block;opacity:0">STUDIO DAILY</span></div>
        <div class="clip t1" data-start="0" data-duration="${D}" data-track-index="4"><span id="t1a" style="display:inline-block;opacity:0">工作室日常</span></div>
        <div class="clip vz u1" data-start="0" data-duration="${D}" data-track-index="5">
          <svg viewBox="0 0 420 44" xmlns="http://www.w3.org/2000/svg">
            <path id="u1p" data-draw d="M16 26 C 120 14, 300 15, 404 24" style="fill:none;stroke:#E63946;stroke-width:6;stroke-linecap:round"></path>
          </svg>
        </div>`,
  tl: `
        ${DRAWSETUP}
        fadeUp("#k1",0.15,{y:16,dur:DUR.pop});
        fadeUp("#t1a",0.5);
        tl.to("#u1p",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},1.0);`
});

// F2 — media-pip 视频(帧内占位窗,真 <video> 由 inject_broll 注 over 层)+ 红点强调
F.push({ id: "02-pip", s: "02", dur: voice(2).duration_s, gOff: gOffTo(2), envFrame: 2,
  poses: [[0, "explain"], [1.0, "point"]], nods: [0.5],
  pulses: [{ sel: "#d2", rgb: "230,57,70", b: 12, a: 0.55 }],
  media: { id: "site-clip", type: "video", path: "public/media/site-clip.mp4", form: "media-pip" },
  css: `
        .t2 { position:absolute; left:0; top:1100px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:92px; line-height:1; color:#FFFFFF; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k2" style="display:inline-block;opacity:0">FIELD FOOTAGE</span></div>
        <div class="clip t2" data-start="0" data-duration="${D}" data-track-index="4"><span id="t2a" style="display:inline-block;opacity:0"><svg id="d2" width="34" height="34" viewBox="0 0 34 34" style="display:inline-block;vertical-align:0.08em;margin-right:16px;"><circle cx="17" cy="17" r="12" style="fill:#E63946;stroke:none"></circle></svg>从这里出发</span></div>`,
  tl: `
        fadeUp("#k2",0.15,{y:16,dur:DUR.pop});
        fadeUp("#t2a",0.7);`
});

// F3 — media-bg 图(全幅暗化垫底,文字主体照常)
F.push({ id: "03-bg", s: "03", dur: voice(3).duration_s, gOff: gOffTo(3), envFrame: 3,
  poses: [[0, "explain"]], nods: [0.5],
  pulses: [{ sel: "#u3p", rgb: "230,57,70", b: 10, a: 0.5 }],
  media: { id: "img-b", type: "image", path: "public/media/img-b.png", form: "media-bg" },
  css: `
        .t3 { position:absolute; left:0; top:640px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:130px; line-height:1; color:#FFFFFF; }
        .u3 { left:280px; top:830px; width:520px; height:48px; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k3" style="display:inline-block;opacity:0">ONE SYSTEM</span></div>
        <div class="clip t3" data-start="0" data-duration="${D}" data-track-index="4"><span id="t3a" style="display:inline-block;opacity:0">同一套系统</span></div>
        <div class="clip vz u3" data-start="0" data-duration="${D}" data-track-index="5">
          <svg viewBox="0 0 520 48" xmlns="http://www.w3.org/2000/svg">
            <path id="u3p" data-draw d="M18 30 C 150 16, 370 17, 502 27" style="fill:none;stroke:#E63946;stroke-width:7;stroke-linecap:round"></path>
          </svg>
        </div>`,
  tl: `
        ${DRAWSETUP}
        fadeUp("#k3",0.15,{y:16,dur:DUR.pop});
        fadeUp("#t3a",0.5,{y:44,dur:0.55});
        tl.to("#u3p",{strokeDashoffset:0,duration:0.65,ease:"power2.inOut"},1.1);`
});

// F4 — avatar-frame:故意写 provider=heygen,验证自动降级 local-rig(建帧打 warn 不阻塞)
F.push({ id: "04-avatar", s: "04", dur: voice(4).duration_s, gOff: gOffTo(4), envFrame: 4,
  poses: [[0, "explain"], [1.0, "raise"], [2.2, "welcome"]], nods: [0.5, 1.6],
  pulses: [{ sel: "#u4p", rgb: "230,57,70", b: 10, a: 0.5 }],
  avatar: { provider: "heygen" },
  css: `
        .t4 { position:absolute; left:0; top:330px; width:1080px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:34px; letter-spacing:0.3em; text-transform:uppercase; color:#9A9A9A; }
        .u4 { left:400px; top:392px; width:280px; height:36px; }`,
  body: (D) => `
        <div class="clip t4" data-start="0" data-duration="${D}" data-track-index="3"><span id="t4a" style="display:inline-block;opacity:0">FACE TO FACE</span></div>
        <div class="clip vz u4" data-start="0" data-duration="${D}" data-track-index="4">
          <svg viewBox="0 0 280 36" xmlns="http://www.w3.org/2000/svg">
            <path id="u4p" data-draw d="M14 22 C 88 12, 196 13, 266 20" style="fill:none;stroke:#E63946;stroke-width:6;stroke-linecap:round"></path>
          </svg>
        </div>`,
  tl: `
        ${DRAWSETUP}
        fadeUp("#t4a",0.15,{y:16,dur:DUR.pop});
        tl.to("#u4p",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},0.7);`
});

// F5 — 纯文字回退帧(kind 自判 text)+ 红贴纸(= 该帧唯一红;svg 红不进 markup 计数属预期 warn)
F.push({ id: "05-cta", s: "05", dur: voice(5).duration_s, gOff: gOffTo(5), envFrame: 5,
  poses: [[0, "explain"], [1.2, "welcome"]], nods: [0.5],
  pulses: [],
  stickers: [{ id: "arrow-red", path: "public/media/stickers/arrow-red.svg", x: 860, y: 440, w: 140, h: 140, at: 1.0 }],
  css: `
        .t5 { position:absolute; left:0; top:640px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:180px; line-height:1; color:#FFFFFF; }
        .s5 { position:absolute; left:0; top:880px; width:1080px; text-align:center; font-family:"Archivo"; font-weight:600; font-size:34px; letter-spacing:0.24em; text-transform:uppercase; color:#9A9A9A; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k5" style="display:inline-block;opacity:0">FOLLOW ALONG</span></div>
        <div class="clip t5" data-start="0" data-duration="${D}" data-track-index="4"><span id="t5a" style="display:inline-block;opacity:0">关注我们</span></div>
        <div class="clip s5" data-start="0" data-duration="${D}" data-track-index="5"><span id="s5a" style="display:inline-block;opacity:0">MORE EXPERIMENTS</span></div>`,
  tl: `
        fadeUp("#k5",0.15,{y:16,dur:DUR.pop});
        fadeUp("#t5a",0.4,{y:60,dur:0.55});
        fadeIn("#s5a",1.1,{dur:0.4});`
});

// F6 — media-bg 视频(BG_DIM 半透明垫,真 <video> 注 under 层)+ 红徽章
F.push({ id: "06-bgvid", s: "06", dur: voice(6).duration_s, gOff: gOffTo(6), envFrame: 6,
  poses: [[0, "explain"], [1.4, "raise"]], nods: [0.6],
  pulses: [{ sel: "#bd6", rgb: "230,57,70", b: 14, a: 0.55 }],
  media: { id: "site-clip", type: "video", path: "public/media/site-clip.mp4", form: "media-bg" },
  css: `
        .t6 { position:absolute; left:0; top:640px; width:1080px; text-align:center; font-family:"Noto Sans SC"; font-weight:900; font-size:130px; line-height:1; color:#FFFFFF; }
        .b6 { left:420px; top:850px; width:240px; height:70px; }`,
  body: (D) => `
        <div class="clip kick" style="top:300px" data-start="0" data-duration="${D}" data-track-index="3"><span id="k6" style="display:inline-block;opacity:0">SHIP IT</span></div>
        <div class="clip t6" data-start="0" data-duration="${D}" data-track-index="4"><span id="t6a" style="display:inline-block;opacity:0">就是这么快</span></div>
        <div class="clip vz b6" data-start="0" data-duration="${D}" data-track-index="5">
          <svg viewBox="0 0 240 70" xmlns="http://www.w3.org/2000/svg">
            <g id="bd6" opacity="0">
              <rect x="8" y="8" width="224" height="54" rx="27" style="fill:#E63946;stroke:none"></rect>
              <text x="120" y="46" text-anchor="middle" style="fill:#FFFFFF;stroke:none;font-family:'Noto Sans SC';font-weight:900;font-size:28px;">出片</text>
            </g>
          </svg>
        </div>`,
  tl: `
        fadeUp("#k6",0.15,{y:16,dur:DUR.pop});
        fadeUp("#t6a",0.5,{y:44,dur:0.55});
        fadeUp("#bd6",1.3,{y:14,dur:DUR.pop});`
});
