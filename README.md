# Interflow IP 小人口播视频（Claude Code Skill）

一段中文文稿 → **你自己的克隆音**配音 + 口型随声音开合的 IP 小人 + 暗底辉光数据可视化 + 玻璃拟态词级字幕 → 1080×1920 竖屏 MP4。

无人出镜、零手工剪辑、本地渲染。装好后对 Claude Code 说一句「把这段文稿做成 IP 小人视频」即可，完整工作流见 [SKILL.md](SKILL.md)。

> 这是一个 **Claude Code skill**，需要本机 node / ffmpeg / Python（不能在 claude.ai 网页版运行）。

## 声音的三档（零配置也能出片）

**这个仓库里没有、也永远不会有任何人的声音。** 口型、字幕、动效节拍吃的是音频的**响度包络 + 词级时间戳**，跟"谁的声音"无关——三档声音驱动的画面效果完全一致，差别只在"听起来是谁"：

| 档 | 声音 | 需要什么 | 怎么用 |
|---|---|---|---|
| **0 · 免费声**（开箱即用） | edge-tts 在线合成（云希/晓晓等中文音色） | **零账号零凭证**，装个 `edge-tts` 包 | `scripts/tts_free.py`，装好即「文生视频」 |
| **1 · 火山标准音色** | 豆包系标准音色，稳定、商用合规 | 火山引擎账号 + API 凭证（**不用克隆**） | `.env` 填凭证；`VOLC_CLUSTER` 按控制台改（一般 `volcano_tts`），`VOLC_SPEAKER_ID` 填标准音色的 voice_type |
| **2 · 你的克隆音**（完全体） | 火山「声音复刻」训练出的**你自己的声音** | 火山账号 + 按官方流程录参考音克隆 | `.env` 填 `S_` 开头的 SPEAKER_ID；正式出片走 `tts_takes.py` 双 take + ASR 回读筛选 |

**克隆是怎么回事（第 2 档）**：火山控制台开通「语音技术 → 声音复刻」→ 录一段你自己的朗读参考音 → 平台训练出专属音色，给你一个 `S_` 开头的 SPEAKER_ID → 出片时 skill 调火山 TTS 把稿子逐句合成为你的声音（默认 1.2x 紧凑口播）。随后本地 faster-whisper 提**词级时间戳** + 算 30fps **RMS 响度包络**——这一份数据同时驱动 IP 小人的**口型开合**、**词级字幕**的卡拉OK填充、画面动效 reveal 的**节拍锚点**。声音和画面因此天然咬合。

**没配 `.env` 会怎样？** 自动落在第 0 档：免费声音照常出**完整**的片，口型/字幕/动效一个不少。edge-tts 是微软 Edge 的非官方免费接口，偶发限流/失效时先 `pip install -U edge-tts`，仍不行就升到第 1 档。

## 一切都可以定制

这套 skill 是一个**模板系统**，不是某个人的专属工具。每一层都有明确的替换口：

| 层 | 改哪里 | 说明 |
|---|---|---|
| **声音** | `.env` 或 `tts_free.py --voice` | 三档任选：免费 edge-tts 声 / 火山标准音色 / 你的克隆音，见上一节 |
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
~/.venvs/interflow-tts/bin/pip install requests soundfile numpy faster-whisper edge-tts zhconv
```

然后把这行加进你的 shell 配置（`~/.zshrc`）：

```bash
export TTS_PYTHON=~/.venvs/interflow-tts/bin/python
```

（不设的话脚本会退回用 `python3`，只要那个环境装了上面的包也行。）

**4.（可选）你的声音凭证——第 1/2 档才需要**

```bash
cd ~/.claude/skills/interflow-ip-video
cp .env.example .env
```

填入你自己的 `VOLC_APPID` / `VOLC_ACCESS_TOKEN` / `VOLC_SPEAKER_ID`（获取方式见上面「声音的三档」）。**跳过这步 = 用第 0 档免费声，一样能出片。**

> `.env` 已在 `.gitignore` 里。**这是你的私人凭证：不进 git、不截图、不转发。**

**5.（可选，建议）真人语音基准**

```bash
"$TTS_PYTHON" scripts/voice_baseline.py --out voice_baseline.json 你的录音1.wav 你的录音2.mp3
```

## 首次验证

```bash
bash checks/smoke_free.sh   # 没配 .env：免费声档全链路冒烟（零凭证零费用，约 2-4 分钟渲染）
bash checks/smoke.sh        # 配了 .env：火山声全链路冒烟（几分钱 TTS + 2-4 分钟渲染）
```

绿了（`SMOKE PASS`）说明整条机械链路可用。改过素材层/gate 后加跑 `bash checks/smoke_media.sh`。

## 隐私边界（给会再分享的你）

- 仓库不含任何 API 凭证、任何人的音色或语音数据——声音永远来自使用者自己的 `.env`
- `.env`、`videos/`（出片工程）、`*.wav` 都在 `.gitignore`；fork / PR / 转发前确认这三样没被带上
- `voice_baseline.json` 是从你个人录音提取的数据（含来源文件路径），同样不要提交

## License

代码、文档与管线 [MIT](LICENSE)；**品牌资产除外**——`assets/character.svg` 小人形象与 "Interflow" 名称保留所有权利（可随 skill 默认使用，不得单独再分发或用作你自己的品牌/IP 标识，详见 LICENSE 尾部声明）。
