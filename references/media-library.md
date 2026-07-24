# 素材库 — manifest schema / 合并 / 选型命中 / 回退(B-roll · 贴纸 · 数字人)

素材层的唯一事实源。形式怎么排(media-full/pip/bg/avatar-frame 的构图与红线)见
`frame-recipes.md`「媒体帧与贴纸」节;这里只管**素材从哪来、怎么进项目、怎么被选中**。

## Contents
- manifest schema(两库通用)
- 双层库与合并规则
- 素材进项目:prep_media.sh(视频静音+裁剪硬关口)
- 选型命中与回退(storyboard 逻辑)
- 视频 B-roll 的注入链路(为什么不能写进帧)
- 数字人 provider 契约(local-rig | heygen)

---

## manifest schema(assets/broll/ 与 assets/stickers/ 各一份 manifest.json)

```json
{
  "version": 1,
  "kind": "broll | stickers",
  "items": [
    {
      "id": "office-walkthrough",        // 全库唯一,kebab-case;选型/slots.json 都用它引用
      "type": "video | image | sticker", // broll 库 = video/image;stickers 库 = sticker
      "path": "office-walkthrough.mp4",  // 相对本 manifest 所在目录
      "tags": ["办公室", "走廊", "日常"],  // 语义命中的钩子:实体/动作/场景词,中文为主,3–6 个
      "desc": "工作室走廊平移,暖光",       // 一句话给选型时的人/agent 看,补 tags 表达不了的气质
      "duration": 12.4                   // 视频原始秒数;图片/贴纸 = null
    }
  ]
}
```

约束:`id` 唯一(两库各自空间);`tags` 写**内容词**不写形式词(写「办公室」不写「B-roll」);
新素材入库先跑 `ffprobe` 确认可解码再登记。

## 双层库与合并规则

- **库层**(跨集复用):`<SKILL_DIR>/assets/broll/`、`<SKILL_DIR>/assets/stickers/`
- **项目层**(当天素材):`<项目>/assets/broll/`、`<项目>/assets/stickers/`(同 schema,可缺省)
- **合并**(build 时自动):`node <SKILL_DIR>/scripts/media_lib.mjs list --project .`
  输出两库合并后的候选清单(含解析好的绝对路径);**同 id 项目层覆盖库层**。
  选型(STORYBOARD media 字段)只从这份合并清单里挑。

## 素材进项目:prep_media.sh

选中的素材必须落到项目 `public/media/`(贴纸落 `public/media/stickers/`)才能被帧引用。
一律走封装,不裸调 ffmpeg:

```bash
bash <SKILL_DIR>/scripts/prep_media.sh <源文件> <项目根> [--dur <beat秒数>] [--id <素材id>]
```

- **视频**:静音(去掉音轨,不是调 0 音量)+ 裁至 `min(beat 时长, 4s)` + 烘焙旋转/转 yuv420p
  (iPhone 竖拍假横屏坑)+ h264 faststart。产出后自动 ffprobe 验收:无音频流、时长达标、可解码。
- **图片**:HEIC/TIFF 转 png,PNG/JPG 直拷;验收可解码。
- **贴纸**(svg/png):直拷进 `public/media/stickers/`。

裁剪是**物理裁剪**(文件层),不是播放窗口截断——文件里没有的内容任何播放器都放不出来。
「某段绝对不出声/不出现」只信这条路。

## 选型命中与回退(storyboard 逻辑,写 STORYBOARD.md 时执行)

每个 beat(Frame)增加一行 `media` 字段:

```
- media: broll:office-walkthrough (media-pip)   ← 命中:库 id + 形式
- media: none                                    ← 无命中:回退
```

- **命中标准 = 语义对应**:beat 口播里的**实体/动作/场景**与素材 `tags/desc` 说的是同一件事
  (说「工作室日常」配走廊平移 = 命中;说「增长曲线」配办公室空镜 = 硬配)。
- **命中才配,无命中一律 `media: none`,回退纸雕(IP 小人/线稿)或图表帧**——
  frame-recipes 选型菜单照常走。**禁止硬配无关图**:凑不上就不配,宁缺毋滥。
- 视频 B-roll 的 beat 控制在 ≤4s 语音(素材裁剪上限 4s,超出的尾巴由帧内暗底/玻璃垫接住)。
- 贴纸不进 media 字段(它是 overlay 槽位不是形式),建帧 config 里挂,任何帧 ≤2 个。

## 视频 B-roll 的注入链路(为什么不能写进帧)

渲染链硬约束:**子合成(帧 HTML)里出现 `<video>/<audio>` = assemble HARD FAIL**
(运行时只驱动 host root 直属媒体,子合成媒体渲成黑块)。所以:

- **图片**素材:直接进帧 HTML(生成器 media 配置自动排版)。
- **视频**素材:帧内只画**占位窗**(玻璃垫底+边框),真正的 `<video>` 由
  `node <SKILL_DIR>/scripts/inject_broll.mjs --project .` 在 **transitions verify 之后**
  注入 index.html root(框架 archetype B,渲染链零改动)。注入幂等,重跑 assemble 后要重新注入。
- 视频窗口时间 = 该帧起点起 `min(素材时长, 帧时长)`,track lane 40+ 不与既有轨道冲突。

## 数字人 provider 契约(avatar-frame)

`avatar: { provider: "local-rig" | "heygen" }`

- **local-rig(已实现,默认)**:纸雕 IP 小人放大居中当数字人,口型走同一条 RMS 响度包络,
  角落常驻小人该帧隐藏(避免双人)。零外部依赖,永远可用。
- **heygen(未接入,只占坑)**:声明了也**自动降级 local-rig**(生成器打 warn 不阻塞)。
  将来接入时的硬约定:heygen 失败或超时 → 降级 local-rig,**永不阻塞出片**;
  且 heygen 段必须复用同一音色源(全片一个音色红线)。
