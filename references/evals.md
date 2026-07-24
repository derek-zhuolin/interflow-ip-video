# 验收评估场景（改 skill 后跑这些，对照 expected_behavior）

基线：无本 skill 时，同样任务会出现——扁平纯黑底、无小人/口型、字幕带红色卡拉OK块、
弧线箭头不贴切线、标签掉字幕带、图表硬折角、lint overlapping_clips 报错（实战记录）。

## 场景 1 · 核心链路（短稿）
- query: 「用我的声音把这段做成 IP 小人视频：『AI 出片只要十分钟。真正难的是把它做成系统。这就是我们在做的事。』」
- expected_behavior:
  - 3 镜左右；TTS 走火山克隆音 1.2x，audio_meta.json 含 words[] + mouth_env[]
  - 小人全程浮动/眨眼，说话段嘴随包络开合，至少一次换姿势
  - 每帧背景有网格+光晕+vignette；每帧红色 ≤1 处；字幕玻璃拟态且零红
  - lint errors=0；成片 ffprobe 有视频+音频双流

## 场景 2 · 图表镜（数字内容）
- query: 稿子含「三个月内从零涨到一万用户」一类增长句
- expected_behavior:
  - 该镜选平滑面积图（d3 monotone），有渐变面积/数据点/网格/刻度
  - 终点红徽章进 SVG（不与端点红点重叠）；文案无具体数字时不编造 count-up
  - 曲线 draw-on 0.8–1.2s，数据点 stagger ~100ms

## 场景 3 · 弧线镜 + 坐标回归（最易翻车处）
- query: 稿子含「嘉宾专门从美国飞回上海」一类迁移句
- expected_behavior:
  - 迁移弧线：箭头贴合切线、终点与箭头不重叠、有飞行小点、有地平基线
  - 两端标签可见且在图形旁（没掉进字幕带 = 容器相对坐标写对）
  - 快照抽查通过 frame-recipes.md 底部 checklist 全项

## 场景 4 · 节奏与气口（8 句以上长稿）
- query: 一段 8–12 句中文文稿的完整出片任务
- expected_behavior:
  - audio_meta 各帧气口不等长（auto 分档 + 抖动；无 --gap 固定值时禁全片一个数）；`--gap-map` 幕尾帧明显更长
  - STORYBOARD 分 3–5 幕：幕内 `transition_in: cut`、幕间 `crossfade`；幕内帧**帧首快照**与前帧终态一致（骨架继承，切镜隐形）
  - 全片 distinct 可视化形式 ≤5；语音结束点后无新元素进场（气口 = 静帧呼吸拍，小人闭嘴）
  - 相邻幕「入场性格 + 强调语法」组合不重复（变奏轴）；本集有 ≥1 菜单外新形式

## 场景 5 · 素材命中与回退（带 3 图+1 视频素材的稿子）
- query: 项目 assets/broll/ 带 manifest（3 图+1 视频），稿子里两句语义对得上素材、两句对不上
- expected_behavior:
  - 选型先跑 media_lib.mjs list（库+项目合并）；命中的 beat 写 `media: broll:<id> (形式)`，
    对不上的写 `media: none` 回退纸雕/图表帧——**没有一帧硬配无关图**
  - 视频素材过 prep_media.sh：public/media/ 产物无音轨、≤4s、可解码（ffprobe 验）
  - 视频帧 HTML 里没有 `<video>`（占位窗）；inject_broll 后 index.html root 有 data-broll 元素
  - slots.json 与帧一致；gate（含媒体红线）PASS：连续纯文字 ≤2、非纯文字 ≥40%、
    贴纸 ≤2/帧不入字幕安全区、全片一个音色
  - avatar-frame 写 provider=heygen 时生成器打 warn 降级 local-rig，建帧不阻塞
