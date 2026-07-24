# HyperFrames 隐藏契约与踩坑（实战蒸馏，违反 = lint error 或渲染废片）

## Contents
- 结构契约（不满足直接报错）
- 坐标坑（最常犯）
- seek-safe 动效契约
- IP 小人 rig 坑
- 字体
- 暗底字幕 token 反转
- 调试口径

---

## 结构契约
- **子合成根节点必须带 `data-start="0" data-duration="<dur>"`**——交叉溶解 inject 靠出场帧根的 duration 延长 hold，缺了报 `no data-composition-id root`。
- **同帧每个 `class="clip"` 唯一 `data-track-index`**——全时长 clip 共轨必报 `overlapping_clips_same_track`。生成器按文档序自增，别手改。
- 所有 `<style>/<script>`（含 gsap CDN）必须**在 `<template>` 内**——运行时只克隆 template 内容，head 全丢弃。
- 帧根样式走 `#root` 选择器，禁 class（渲染时 class 会失配 → 整帧裸奔）。
- 全屏底色是 **clip 层**，禁写在 `#root` 上（根被 clip-gated，后续帧会漏黑底）。

## 坐标坑（同一坑咬过四次）
**`position:absolute` 的 top/left 相对「最近定位祖先」，不是画布。** 标签放进已定位的 viz 容器里，必须用容器相对坐标（= 画布 Y − 容器 top）。判据：一批标签整体消失/掉进字幕带，DOM 里却在 → 查父容器是不是定位元素。
另：SVG 容器高宽比必须匹配 viewBox 比例，否则 `preserveAspectRatio` 等比缩放让所有坐标偏移。

## SVG 样式坑（本 skill 生成器专属，咬过一整集）
- **`.vz` 基线类会覆盖 SVG 的 fill/stroke 属性**（CSS 规则优先级 > presentation attribute）：`fill="#E63946" stroke="none"` 写成属性会被 `.vz path/circle {fill:none;stroke:#FFF}` 盖掉——红点变白圈、实心变描边。**彩色/实心元素一律写 inline style**（`style="fill:#E63946;stroke:none"`，style 优先级最高）。
- **`<ellipse>` 不在 `.vz` 选择器清单里**：拿不到 `fill:none` 基线，吃 SVG 默认黑 fill，把底下的巨字整个盖没。用 ellipse/新标签时必须自带 `style="fill:none;..."`（或干脆按 frame-recipes 的圈注规范用 path）。
- **外层 `<g style="opacity:0">` 不会被子元素动画点亮**：gsap fromTo 作用在子 path 上时父组仍是 0，整组永久隐形。初始隐藏放在**子元素**的 opacity 属性上，或动画直接作用于组。
- **HTML 同坑（div 版，实战踩过）**：容器 class 写 `opacity:0`（如 `.sub { ...; opacity:0 }`）+ 只动画内层 `<span>` → 副题整块永久隐形，且**快照抽查前排帧发现不了**（问题帧在中后段）。规矩：初始隐藏和动画目标必须是**同一个元素**——动画打在内层 span 上，容器就别带 opacity:0；反之动画容器。自查：grep 每帧 css 里的 `opacity:0`，逐个确认它就是 tl 动画的目标选择器。
- **`data-draw` 的容器必须挂 `vz` class**（实战踩过）：DRAWSETUP 选择器是 `.vz [data-draw]`——容器忘写 `vz`（如 `class="clip circ4"`）时 draw-on **静默失效**，路径从帧首就整条可见，补间 strokeDashoffset 空转不报错。终态快照看不出来（反正最后是画完的），**帧首快照才暴露**。自查：grep `data-draw` 所在容器逐个确认带 `vz`。

## Hero 图/HUD 帧坑（勘测配方专属）
- **虚线 path 禁挂 `data-draw`**：DRAWSETUP 把 `stroke-dasharray` 改写成路径总长做 draw-on，虚线样式直接被覆盖（虚线变实线或整条消失）。虚线出现用淡入；换锚点用 `attr:{x2,y2}` 端点补间。
- **typewriter 禁 CSS steps()/transition/gsap TextPlugin**（不 seek-safe）：onUpdate 里按 t 算可见字符数截 textContent；光标位置用 `offsetLeft+offsetWidth` 测量跟随（显示文本的纯函数，seek-safe）。
- **图片必须 snapshot 验证加载**：裂图在暗底上不易察觉（就是一块黑）。hero 图放 `public/`，**引用用项目根相对路径 `public/xxx.png`，禁 `../` 父级穿越**——子合成克隆进 host 页后相对路径按项目根解析，`../../public/` 渲染侧能被改写但 Studio 404，lint 判 `invalid_parent_traversal_in_asset_path` error（2026-07-18 形式库扩容 smoke 实测）；小图可 data-URI 内联最稳。

## seek-safe 动效契约
- 渲染 = 暂停 GSAP 时间线逐帧 seek：禁 `repeat/yoyo/Math.random/Date.now`、禁 CSS transition/@keyframes 做动效。
- 循环感（呼吸/浮动/眨眼/口型）一律 **onUpdate 里用时间 t 的确定性函数**算，SVG 变换用 `setAttribute('transform', 'rotate(a cx cy)'/'matrix(...)')` **显式支点**（GSAP 的 transform-origin 配 fill-box 在细线/组上会漂）。
- 入场用 `fromTo`（seek 到 t=0 状态才正确）；非末帧禁 exit 动效（harness 转场就是 exit）。
- 沿路径运动：`getPointAtLength(progress * totalLength)` 在 onUpdate 里采样——确定性且 seek-safe。

## IP 小人 rig 坑
- **姿势组必须全量接管，不能只管 `poses` 里列出的**（2026-07-24 咬穿一集）：rig 里 `if-pose-explain-*` 初始就可见（其余三组带 `opacity:0`），而旧版 animChar 只按 `poses` 建 PG 映射——某帧 `poses` 不含 explain（如 `[[0,"point"],[t,"raise"]]`）时，explain 那组**永不被隐藏**，与当前姿势叠成「多条手臂」重影。判据：小人举手/指向时，身侧还挂着一对垂下的手。修法：PG 按四个姿势名 `['explain','point','raise','welcome']` 全量建，每帧先全置 0 再点亮当前组。
- **姿势切换用硬切，不用交叉淡入**：不同姿势的手臂位置差太远，插值不出中间态——0.3s 交叉期两组都接近实心，观感是重影而不是过渡。改成硬切 + 0.18s 快速淡入（`0.55→1`），任一时刻只有一组手臂可见。

## 字体
- Google Fonts `@import` 可过渲染（producer 编译期解析），但 `font-family` 里**禁留无 @font-face 的系统 CJK 名**（PingFang SC / Microsoft YaHei → `font_family_without_font_face` error）。中文 = `"Noto Sans SC", sans-serif` 就够。

## 暗底字幕 token 反转
caption 的 `canvas` 语义 token 一键双驱：assemble 拿它当**视频底色**（要暗），字幕皮肤拿它当**文字色**（要亮）。暗色品牌破法：frame.md 里命名反转 `ink:#FFFFFF`（前景）/ `canvas:#0A0A0A`（底色），字幕皮肤用 `--cap-ink` 当亮字；并用 `#caption-stage .caption-word...`（ID 特异性 1,1,0）盖掉 captions.mjs 对暗底**强插在末尾的红色卡拉OK块**——守住「字幕零红」。

## 调试口径
- lint / 预览 / 成片三个口径会打架：**判对错只信成片**（`ffprobe` 查流 + `ffmpeg` 抽帧）。
- `hyperframes init` 的 skill 链接阶段可能卡死——核心文件几秒就落盘，`timeout 90` 后查 `hyperframes.json` 存在即继续（new_project.sh 已内置）。
- `audio_meta.json` 是项目资产：建帧后**禁重算**（词时序漂移 = 口型/字幕/reveal 全失联）；改稿必须整链重跑。
- 开源组件边界：**d3-shape 可用**（纯函数出 path）；shadcn/Recharts 等 React 系**不可用**（要构建、非确定性时钟）；ECharts 只能关动画当静态渲染器，会抢品牌样式，默认不用。
