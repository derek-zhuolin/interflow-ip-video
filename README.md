# Interflow IP 小人口播视频（Claude Code Skill）

一段中文文稿 → **你自己的克隆音**配音 + 口型随声音开合的 IP 小人 + 暗底辉光数据可视化 + 玻璃拟态词级字幕 → 1080×1920 竖屏 MP4。

无人出镜、零手工剪辑、本地渲染。装好后对 Claude Code 说一句「把这段文稿做成 IP 小人视频」即可，完整工作流见 [SKILL.md](SKILL.md)。

> 这是一个 **Claude Code skill**，需要本机 node / ffmpeg / Python（不能在 claude.ai 网页版运行）。

## 声音是怎么来的（声音复刻原理）

**这个仓库里没有、也永远不会有任何人的声音。** 全片的声音来自你自己在火山引擎克隆的音色：

1. **克隆**：在火山引擎控制台开通「语音技术 → 声音复刻」，按官方流程录一段你自己的朗读参考音，平台训练出你的专属音色，给你一个 `S_` 开头的音色 ID（SPEAKER_ID）。
2. **合成**：出片时 skill 调用火山 TTS API，用你的 SPEAKER_ID 把稿子逐句合成为你的声音（默认 1.2x 紧凑口播；正式出片走双 take + ASR 回读筛选，毙掉错读/吞字的条）。
3. **驱动**：本地 faster-whisper 对每句音频提**词级时间戳**，再算出 30fps 的 **RMS 响度包络**——这一份数据同时驱动三件事：IP 小人的**口型开合**、**词级字幕**的卡拉OK填充、画面动效 reveal 的**节拍锚点**。声音和画面因此天然咬合。

**不想克隆声音？** 填一个火山**标准音色**的 voice_type 也能跑通全链路（`VOLC_CLUSTER` 按控制台说明改，标准音色一般是 `volcano_tts`），之后随时换成自己的克隆音。

**没配凭证会怎样？** 配音步骤会友好报错停下，**不会出片**——音频是全片唯一的时间源，口型/字幕/动效都从它取锚点，没有音频就没有可渲染的工程。画面的抽象可视化风格（暗底网格 + 辉光线稿 + d3 图表）是设计系统决定的，跟用谁的声音无关。

## 一切都可以定制

这套 skill 是一个**模板系统**，不是某个人的专属工具。每一层都有明确的替换口：

| 层 | 改哪里 | 说明 |
|---|---|---|
| **声音** | `.env` 的 `VOLC_SPEAKER_ID` | 你的克隆音或任意火山音色，见上一节 |
| **IP 小人形象** | `assets/character.svg` | **完全可替换**。保持同名节点即可被动效系统驱动：`#character` 根组、`#head` / `#body` / `#shadow`、`#eyes`（眨眼）、`#mouth`（口型，随响度包络开合）、四个姿势组 `#pose-explain` / `#pose-point` / `#pose-raise` / `#pose-think`。画成你自己的形象（建议白描边圆头端点的线稿风），换完跑一次 `checks/smoke.sh` 验证口型和姿势切换 |
| **品牌色 / 字体** | `assets/frame.md` | `colors.signal` 就是全片那唯一一处强调红；`typography` 定字体。注意 `ink` / `canvas` 两个 key **名**是管线承重的（暗底反转机制），改值别改名 |
| **口播语感** | `references/oral-script.md` 「个人语感层」 | 默认是一套实战验证过的口播口径，把禁用词/常用句式换成你自己的风格 |
| **真人节奏基准** | `scripts/voice_baseline.py` | 可选：从你的真实录音提语速带/停顿分布，双 take 筛选和成片验收按它比；不建也能出片（相关检查自动跳过） |
| **可视化形式库** | `references/frame-recipes.md` 选型表 | 菜单是活的：每集长出的新形式验收后蒸馏一行回表，形式库随出片增长 |
| **素材库** | `assets/broll/` `assets/stickers/` | 跨集复用的 B-roll / 贴纸登记进 manifest（schema 见 `references/media-library.md`），单集素材放项目层，构建时自动合并 |

## 示例生成器：参考，不是模板

[`assets/_generator-full-example.mjs`](assets/_generator-full-example.mjs) 是作者一集**已公开发布**视频的生成器原件，原样保留——12 镜 / 6 幕 / 骨架继承 / 点阵贯穿 / 气口留白的完整实战写法都在里面。写你自己的集子时**抄结构与手法，别抄文案**；日常建帧从 `assets/generator-base.mjs` 起步即可。

## 安装（约 10 分钟）

**1. 放置 skill**

```bash
git clone https://github.com/derek-zhuolin/interflow-ip-video.git ~/.claude/skills/interflow-ip-video
```

**2. 基础依赖**

- Node 18+（`npx hyperframes --version` 能跑，≥0.7.5x）
- `ffmpeg` / `ffprobe`（`brew install ffmpeg`）
- HyperFrames 套件里的 `faceless-explainer` skill（本 skill 复用它的 audio/captions/assemble/transitions 管线脚本，路径 `~/.claude/skills/faceless-explainer/scripts`）

**3. TTS Python 环境**

```bash
python3 -m venv ~/.venvs/interflow-tts
~/.venvs/interflow-tts/bin/pip install requests soundfile numpy faster-whisper zhconv
```

然后把这行加进你的 shell 配置（`~/.zshrc`）：

```bash
export TTS_PYTHON=~/.venvs/interflow-tts/bin/python
```

（不设的话脚本会退回用 `python3`，只要那个环境装了上面的包也行。）

**4. 你的声音凭证**

```bash
cd ~/.claude/skills/interflow-ip-video
cp .env.example .env
```

填入你自己的 `VOLC_APPID` / `VOLC_ACCESS_TOKEN` / `VOLC_SPEAKER_ID`（获取方式见上面「声音是怎么来的」）。

> `.env` 已在 `.gitignore` 里。**这是你的私人凭证：不进 git、不截图、不转发。**

**5.（可选，建议）真人语音基准**

```bash
"$TTS_PYTHON" scripts/voice_baseline.py --out voice_baseline.json 你的录音1.wav 你的录音2.mp3
```

## 首次验证

```bash
bash checks/smoke.sh        # 3 镜全链路冒烟：TTS→建帧→管线→gate→渲染（消耗几分钱 TTS + 2-4 分钟渲染）
```

绿了（`SMOKE PASS`）说明整条机械链路可用。改过素材层/gate 后加跑 `bash checks/smoke_media.sh`。

## 隐私边界（给会再分享的你）

- 仓库不含任何 API 凭证、任何人的音色或语音数据——声音永远来自使用者自己的 `.env`
- `.env`、`videos/`（出片工程）、`*.wav` 都在 `.gitignore`；fork / PR / 转发前确认这三样没被带上
- `voice_baseline.json` 是从你个人录音提取的数据（含来源文件路径），同样不要提交
