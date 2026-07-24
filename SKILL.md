---
name: interflow-ip-video
description: 把中文文稿做成 Interflow Bold-Mono 竖屏口播视频——火山引擎声音复刻配音（你自己的克隆音，1.2x 紧凑口播）、RMS 响度包络驱动口型的常驻 IP 小人（浮动/眨眼/点头/指向/抬手/欢迎）、暗底网格+辉光线稿的数据可视化（d3 平滑图表/迁移弧线/时间轴/象限等 10+ 种形式）、玻璃拟态词级字幕，渲染成 1080x1920 MP4。用户说「IP 小人视频 / 用我的声音出片 / interflow 风格文生视频 / bold-mono 出片」，或给一段中文文稿要做成带小人配音的竖屏视频时使用。
---

# Interflow IP 小人口播视频

**输入一段中文文稿 → 你的克隆音配音 + IP 小人讲解 + 数据可视化 → 竖屏 MP4。**
底座 HyperFrames（faceless-explainer 管线脚本），设计系统 = Bold-Mono 暗底质感版
+ **v2 设计 DNA**（guizang 秩序：8 档字阶/间距档位/图内文字纪律）+ **动效系统**（Emil 决策树：EASE/DUR tokens + fadeUp/popIn helpers），都已进生成器与 gate。

## 依赖（首次先查；环境搭建步骤见 README.md）
- `npx hyperframes --version` 可用（≥0.7.5x），`ffmpeg/ffprobe` 可用
- 管线 skill `faceless-explainer`（HyperFrames 套件，提供 audio/captions/assemble/transitions 脚本）
- TTS Python 环境：任意 venv 装好 `requests soundfile numpy faster-whisper edge-tts`（建议再装 `zhconv`），
  并 `export TTS_PYTHON=<venv>/bin/python`（未设则脚本用 `python3`）
- 声音（三档，详见 README「声音的三档」）：**第 0 档** edge-tts 免费声——零账号零凭证，走
  `scripts/tts_free.py`，**无 .env 时用这档，照常出完整片**；**第 1 档** 火山标准音色 / **第 2 档**
  你自己的声音复刻——`cp .env.example .env` 填入你自己的 VOLC_APPID / VOLC_ACCESS_TOKEN /
  VOLC_SPEAKER_ID（`.env` 已在 .gitignore，绝不提交/外传）
- 可选但建议：`scripts/voice_baseline.py` 从你的真实录音提 `voice_baseline.json` 存 skill 根——
  take 筛选与验收的语速项按它比；没有基准时这些检查自动跳过
- 个人层（可选）：skill 根若存在 `LOCAL.md`（已在 .gitignore，永不入库），先读它——这台机器
  主人的私人触发词与默认声音档位在里面，与本文件冲突时以 LOCAL.md 为准。
- 管线脚本路径：**必须用 realpath** `FE=$(cd ~/.claude/skills/faceless-explainer/scripts && pwd -P)`。
  坑：若 `faceless-explainer` 目录是 symlink，Node ESM 会 realpath 模块，
  导致 `captions.mjs` 的自运行守卫 `resolve(argv[1])===import.meta.url` 不匹配 → **静默退出 0、不产字幕**
  （assemble 报 `captions track2: no`）。用 `pwd -P` 拿真实路径调所有 `$FE/*.mjs` 即可绕过。

## 工作流（复制此清单逐步走）

- [ ] **1 起项目**：`bash <SKILL_DIR>/scripts/new_project.sh videos/<项目名>`（init + 拷入 frame.md / character.svg / 玻璃字幕皮肤）
- [ ] **2 写 SCRIPT.md**：**先过口语化改写**（`references/oral-script.md`：短句 ≤20 字、标点即停顿标记、`……` 思考长停每稿 ≥2 处、语气词进稿、个人语感禁用词——**书面语禁止直接进 TTS**，稿首加 `<!-- oral-rewrite -->` 留痕）。一镜一句，格式硬约束——`## Line N — <标签> (Frame N)` 标题 + **4 空格缩进**的口播原文（解析器只认缩进行）。8–12 镜、每句 ≤35 字为宜。**写完先分幕**：把句子分成 **3–5 个场景组（幕）**，每幕一个论点——这决定步骤 3 的幕尾气口、步骤 4 的转场和步骤 5 的骨架继承，是节奏的总开关。
- [ ] **3 配音**：正式出片走**双 take 路径**——`"${TTS_PYTHON:-python3}" <SKILL_DIR>/scripts/tts_takes.py --script SCRIPT.md --out-dir . --baseline <SKILL_DIR>/voice_baseline.json --gap-map "<幕尾帧号>"`（每句 2 take：ASR 回读毙错读/吞字、语速对真人基准带筛、`……` 长停不足在词边界物理补静音；exit 3 = 有句要改写重跑，exit 2 = 拿不准句在 `takes/undecided.json` 给用户人耳选条后加 `--choose "帧:tag"` 定稿；额外产 **beat_map.json** = 词级时间戳唯一时间源）。**`--baseline` 可选**：还没提基准就先不传（语速带不筛，只靠 ASR 回读关），但建议尽早用 `scripts/voice_baseline.py` 从你的真实录音提一份（换克隆音/口播风格变后重提）。**首词时间戳信 RMS 起振不信 whisper 句首值**（脚本已自动对齐，别手改 beat_map）。冒烟/快速草稿可退回单 take：`tts_clone.py --script SCRIPT.md --out-dir . --gap-map "<幕尾帧号>"`。**没有火山凭证（免费声档/文生视频模式）**：`"${TTS_PYTHON:-python3}" <SKILL_DIR>/scripts/tts_free.py --script SCRIPT.md --out-dir . --gap-map "<幕尾帧号>" [--voice zh-CN-XiaoxiaoNeural]`——产物契约完全相同（**含 beat_map.json + 首词 RMS 起振对齐**，wordT/pauseT 照常可用），口型/字幕/动效照常；双 take 与语速基准筛选是克隆音专用，不适用
  产出 `audio/NN.wav`（尾部已拼气口）+ `audio_meta.json`（词级时序 + 每帧 30fps RMS 口型包络）。**气口**：默认 auto 模式——按句尾标点分档（？！0.5–0.65s / ，0.3–0.4s / 。0.4–0.55s）+ 档内随机抖动，幕尾帧（`--gap-map`）用最长档 0.65–0.85s。没气口 = 语音墙对墙听着喘；气口长度死板整齐（固定 0.45/0.7s 一类）= 听着像节拍器不自然，两个都要避。传 `--gap <秒数>` 可退回旧的固定等长模式。**audio_meta 是项目资产，建帧后禁重算**（时序漂移 = 口型/字幕失联）。
- [ ] **4 写 STORYBOARD.md**：**文件头必须 YAML frontmatter `format: portrait`**（缺了 assemble 默认 1920×1080 横屏，整条片方向反掉）。每镜 `## Frame N — 标题` + `duration`（先估，步骤 6 会同步真值）+ `transition_in` + `scene` + `voiceover`(原文) + `media`（见下）+ `src: compositions/frames/NN-<slug>.html`。**转场按幕走：幕内 `transition_in: cut`（同一镜头在推进），幕间 `transition_in: crossfade`**——整片 crossfade 到底 = 每 4s 全屏换血，节奏太跳。
  **media 字段（语义命中才配，无命中回退）**：先 `node <SKILL_DIR>/scripts/media_lib.mjs list --project .` 看合并素材清单（库层+当天项目 assets/，同 id 项目覆盖库）。beat 口播里的**实体/动作/场景**与素材 tags/desc 说同一件事 = 命中，写 `- media: broll:<id> (media-full|media-pip|media-bg)`；**无命中一律 `- media: none`，回退纸雕或图表帧，禁止硬配无关图**。命中的素材过 `bash <SKILL_DIR>/scripts/prep_media.sh <源> . --dur <beat秒> --id <id>` 进 `public/media/`（视频自动物理静音+裁至 min(beat,4s)+烘焙旋转；beat 控制在 ≤4s 语音）。数字人段不走 media 字段，步骤 5 配 `avatar`。规范：`references/media-library.md`。
- [ ] **5 建帧（生成器，不派 subagent）**：`cp <SKILL_DIR>/assets/generator-base.mjs episode.mjs`，每镜写一个 config（可视化形式按 `references/frame-recipes.md` 选型 + **「节奏与场景组」+「变奏轴」两节**：全片 distinct 形式 ≤5、幕内帧继承前帧骨架、相邻幕换变奏组合），`node episode.mjs`。
  **⚠ 内容分工铁律（frame-recipes「内容分工」节，最高频返工点）**：上层可视化是把这句话**抽成一个点**（数字/符号/关系/关键词），**绝不把 voiceover 原句照抄到画面上**——底部字幕已经逐字念了，上层复读=可视化白做。逐帧自检上层文字 vs voiceover 字面重合 ≥60% 就重做。文字+符号同排（`信→做`/`✕✓`）用 **flex 容器**排布，别把符号绝对定位塞进文字缝（会撞字）。旁白词级时间戳（audio_meta.json 的 words[]）就是 reveal 的节拍锚点。**每集 ≥1 个菜单外新形式**，验收后蒸馏一行回 frame-recipes 选型表（形式库靠出片长大，不是封闭集）。
  STORYBOARD 命中的素材帧写 `media:{id,type,path,form}`（图入帧+自动 Ken Burns，视频帧内只出占位窗）；贴纸 `stickers:[...]`（≤2/帧，弹入锚 words[]）；数字人段 `avatar:{provider:"local-rig"}`；**确实通篇纯文字的帧标 `kind:"text"`**。建帧同时产 `slots.json`（gate 媒体红线只查它）。规范见 frame-recipes「媒体帧与贴纸」节。
  **动效触发时刻禁手写秒数**：一律 `wordT(帧,"词")` / `pauseT(帧,n)` 从 beat_map 取（poses/nods/reveal/强调全适用，调用自动记进 slots.json 的 anchors[] 供验收核对）；装饰性 stagger 跟在锚点 0.6s 手势窗内。
  **动效值与字号走 v2 tokens（gate 硬校验）**：标准入场一律 `fadeUp/popIn/fadeIn`（EASE/DUR/RISE/STAGGER 自动带对——入场 power4.out、在场移动 power3.inOut，**永不 `*.in`、永不 scale(0)**）；字号只取 8 档字阶 26/34/44/64/92/130/180/260（COMMON 有 `.t-*` 类，每帧 ≤4 档，SVG viewBox 内除外）。规范：frame-recipes「设计 DNA v2」+「动效系统」。
- [ ] **6 管线**（顺序执行，`FE` 见上）：
  ```bash
  node $FE/audio.mjs sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md
  node $FE/captions.mjs build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json
  node $FE/assemble-index.mjs --storyboard ./STORYBOARD.md --hyperframes .
  node $FE/transitions.mjs inject --storyboard ./STORYBOARD.md --hyperframes .
  node $FE/transitions.mjs verify --storyboard ./STORYBOARD.md --index ./index.html
  node <SKILL_DIR>/scripts/inject_broll.mjs --project .   # 有视频 B-roll 才生效;必须在 verify 之后
  ```
  注意：sync-durations 后若 duration 变了，需回步骤 5 重跑生成器对齐（生成器读 audio_meta 的 duration，一般一次到位）。**重跑 assemble 会丢注入的视频，末尾的 inject_broll 要跟着重跑**（幂等，多跑无害）。
- [ ] **7 质检**：`node <SKILL_DIR>/scripts/gate_redlines.mjs --project .` → **必须 GATE PASS**（可脚本化红线的硬校验：portrait/气口/**字幕产物（symlink 静默缺字幕坑）**/vz+data-draw/track-index/红色计数/**字阶 8 档+禁 ease-in+禁 scale(0)**/lint errors=0）；再 snapshot 逐帧核对 `references/frame-recipes.md` 底部的质感 checklist。注意：`--at` **一次只认一个时间点**，且每次运行会**清空 snapshots/**——用循环逐个拍、拍完立刻 `cp` 到别处再拍下一张；幕内切点要拍**帧首快照**对比前帧终态。
- [ ] **8 渲染**：`npx hyperframes render --quality high --protocol-timeout=900000 --output renders/video.mp4` → `node <SKILL_DIR>/scripts/gate_redlines.mjs --project . --render renders/video.mp4`（ffprobe 双流+时长校验已含在内）。若报 `Runtime.evaluate timed out` 直接重试一次（常见于机器忙，非片子问题）。
  **⚠ 1.2x 出片体感（实战反馈）**：TTS 的 `--speed 1.2` 参数体感上不明显，观众会觉得「没有 1.2 倍速」。成片默认交 1.2x 版——渲完对 `renders/video.mp4` 做整体时间压缩（画面+音频同步、保音高不变调）：`ffmpeg -y -i renders/video.mp4 -filter:v "setpts=PTS/1.2" -filter:a "atempo=1.2" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k renders/video_1.2x.mp4`。口型/字幕/动效已烘进帧，整体压缩不失同步；**重渲后要重跑这步**（非幂等）。交付 1.2x 版，用户嫌快/慢再调倍数。
- [ ] **9 一眼假验收**（双 take 路径出片必跑）：`node <SKILL_DIR>/scripts/review_gate.mjs --project . --render renders/video.mp4` → 脚本判定动效锚点 ≤150ms / 无手写秒数孤儿 / 口型开口对首词 / 无 ≥3s 冻结段 / 语速曲线在真人基准带（无 voice_baseline.json 时语速项自动跳过并留痕）；再看 `qc/pauses/` 停顿截帧逐张确认有可读 hold 画面。全过才交付，不过按 REVIEW_REPORT 模式一次修一个变量。**免费声档看 a/b/c 项即可**：`d 语速`会拿克隆音的 `voice_baseline.json` 去比 edge-tts，必然出带（含英文的句子按字符算 cps 还会虚高）——那不是片子的问题，留痕跳过。

## 无人值守模式（服务端 / Agent Runner 跑法）

被服务端 Runner 调用、或任务说明"无人值守/产品出片"时，在标准工作流上叠加以下约定：

1. **关闭新形式探索**：只用 frame-recipes 选型表内已验证形式 + 变奏轴组合，「每集 ≥1 菜单外新形式」规则不适用（那是交互式出片时的复利机制）——无人值守的目标是质量方差最小，不是探索。
2. **质检自动化**：快照自查照跑（发现问题修复以一轮为限），结束前**必须**跑 `scripts/gate_redlines.mjs --project . --render renders/video.mp4`，以其退出码为最终成败判定。
3. **产物约定**：成片 `renders/video.mp4` + 封面 `qc/cover.png`（开场帧 ~1s 处快照）。
4. **失败约定**：gate 不过 / 渲染失败重试一次仍败 → 打印 `FAIL: <原因>` 后退出，**不交付半成品**；audio_meta 相关失败必须整链重跑而不是带着漂移出片。
5. **换机/镜像验证**：部署新环境先跑 `bash <SKILL_DIR>/checks/smoke.sh`（3 镜零 LLM 全链路冒烟；无火山凭证的环境改跑 `bash <SKILL_DIR>/checks/smoke_free.sh` 免费声档版，零凭证零费用）；改到素材层/媒体形式/gate 时加跑 `bash <SKILL_DIR>/checks/smoke_media.sh`（3 图+1 视频六镜:media 形式/贴纸/avatar 降级/注入/媒体红线），双绿再接真实任务。

## 红线（违反 = 返工）
0. **素材红线（gate 查 slots.json）**：连续纯文字帧 ≤2；非纯文字帧占比 ≥40%；素材语义命中才配（无命中回退纸雕/图表，禁硬配）；视频 B-roll 必须过 prep_media.sh（物理静音+裁 ≤4s）；贴纸 ≤2/帧且不入字幕安全区（y≥1500）；全片仅一个音色；avatar 只认 local-rig（heygen 自动降级，永不阻塞）。
1. **每帧红色（#E63946）只出现一处**，字幕永远零红。
2. **底部对话排 y1500–1750**（皮肤已锁死）：IP 小人在左下（框 40–236, 1500–1750），字幕是带小尾巴的玻璃对话气泡，排在小人右侧（x264–1044）、垂直居中对齐——内容全部在 **y≤1360**，对话排不进内容。kicker ~y260 起，主体带 y280–1360，y1360–1500 留空当呼吸带。
3. 每个 `class="clip"` **唯一 data-track-index**（生成器自动自增，别手改）。
4. 动效 seek-safe：无 `repeat/yoyo/Math.random/Date.now`；循环感一律用「时间 t 的确定性函数」在 onUpdate 里算。
5. 定位容器内的标签用**容器相对坐标**，不是画布坐标（最常犯的坑，见 pitfalls.md）。
6. **设计 DNA/动效红线（已进 gate）**：字号 ∉ 8 档字阶或帧内 >4 档、GSAP `*.in` ease、`scale(0)` 入场 = GATE FAIL；图内标签 2–5 字 ≤5 个、一帧一隐喻、stagger 60–90ms 靠快照复核。

## 深入
- **环境搭建 / 首次使用 / 自定义（换小人、换品牌色、换语感）**：`README.md`
- **可视化选型 + 质感/图表/动效规范**：`references/frame-recipes.md`
- **素材库（B-roll/贴纸/数字人）：manifest schema / 合并 / 命中与回退 / 注入链路**：`references/media-library.md`
- **口语稿规范（书面语禁进 TTS：短句/标点停顿/……长停/语气词/个人语感层）**：`references/oral-script.md`
- **真人语音基准（可选，不随包）**：`voice_baseline.json`——用 `scripts/voice_baseline.py` 从**你自己的真实录音**提取（语速带/停顿分布/句长），声音层筛 take 和验收语速曲线都对它比；没有它相关检查自动跳过
- **HyperFrames 隐藏契约与踩坑**：`references/pitfalls.md`
- **完整可跑的 12 镜生成器实例**（作者一集已公开发布片源的实战原件：6 幕 / 骨架继承 / 点阵贯穿 / 气口留白）：`assets/_generator-full-example.mjs`
- **验收评估场景**：`references/evals.md`
