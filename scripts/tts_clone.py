#!/usr/bin/env python3
"""tts_clone.py — 火山声音复刻(你自己的克隆音) 1.2x 配音 + whisper 词级对齐 + RMS 口型包络。

产出（--out-dir 下）:
  audio/NN.wav        每镜一条（尾部已拼气口静音）
  audio_meta.json     {voices:[{frame,path,duration_s,words[],mouth_env[],env_fps}]}
    words[]    = 词级时间戳（字幕/建帧 reveal 锚点；文字=SCRIPT 原文，时间=whisper 锚点）
    mouth_env[] = 30fps 归一化 RMS 响度包络（IP 小人口型直接按帧索引读取）

气口（防"语音墙对墙听着喘"，同时防"死板节拍器听着不自然"）: 每条 wav 尾部拼一段静音，
  长度按该句**结尾标点**分档 + 档内随机抖动（不是固定数字，真人停顿本来就不整齐）：
    问句/感叹（？！）→ 0.50–0.65s   逗号收尾（，）→ 0.30–0.40s
    句号/默认        → 0.40–0.55s   幕尾（--gap-map 指定帧号）→ 0.65–0.85s
  拼静音在 ASR/包络之前做，所以 duration_s/口型闭合/字幕锚点全自动一致；
  crossfade 会落在静音尾巴上。--gap 传固定数值可退回旧的"每句一律等长"手动模式。

依赖: TTS Python 环境（requests soundfile numpy faster_whisper；建 venv 后
     export TTS_PYTHON=<venv>/bin/python，配置见 README.md）
凭证: --env 指定，否则读本 skill 根 .env（VOLC_APPID/VOLC_ACCESS_TOKEN/
     VOLC_CLUSTER/VOLC_SPEAKER_ID——你自己的火山账号 + 声音复刻音色，样例 .env.example）

用法: tts_clone.py --script SCRIPT.md --out-dir . [--speed 1.2] [--asr-model small]
                     [--gap-map "1,4,6,9"] [--gap 0.45（固定值，覆盖语义化 auto 模式）]
"""
import argparse, os, sys, json, base64, uuid, time, random

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)

try:
    import requests
    import numpy as np
    import soundfile as sf
except ImportError as e:
    sys.exit(f"✗ 缺依赖 {e.name}。用 TTS venv 跑: $TTS_PYTHON {__file__} ...（venv 配置见 README.md）")

sys.path.insert(0, HERE)
from script_lib import parse_script, rebuild_words  # 稿件解析 + 字幕短句对齐（skill 内置）

URL = "https://openspeech.bytedance.com/api/v1/tts"
ENV_FPS = 30          # 口型包络采样率 = 渲染帧率，建帧侧按 floor(t*30) 直接索引
SMOOTH_KERNEL = 3     # 3 帧滑动平均：去毛刺但保留音节起伏（更大就"糊嘴"）
NORM_PCT = 90         # 按 90 分位归一化：躲开偶发爆音，说话段基本贴 1.0
RETRIES = 3           # 网络抖动指数退避 1s/2s/4s；仍失败按帧序报错，wav 已落盘的可续

# 气口分档（秒，闭区间随机抖动）——真人停顿长度跟着标点/语义走，不是一个死数字
GAP_TIERS = {
    "ask": (0.50, 0.65),      # 句尾 ？！
    "comma": (0.30, 0.40),    # 句尾 ，、
    "period": (0.40, 0.55),   # 句尾 。或其它默认
    "act_end": (0.65, 0.85),  # 场景组末帧（--gap-map 指定），覆盖标点判断
}


def classify_gap(text):
    ch = text.rstrip()[-1:] if text.rstrip() else ""
    if ch in "？?！!":
        return GAP_TIERS["ask"]
    if ch in "，,、":
        return GAP_TIERS["comma"]
    return GAP_TIERS["period"]


def load_env(path):
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        os.environ.setdefault(k.strip(), v.split(" #")[0].strip())


def synth(text, speed, cfg):
    body = {
        "app": {"appid": cfg["appid"], "token": cfg["token"], "cluster": cfg["cluster"]},
        "user": {"uid": "interflow-ip-video"},
        "audio": {"voice_type": cfg["speaker"], "encoding": "wav",
                  "speed_ratio": speed, "volume_ratio": 1.0, "pitch_ratio": 1.0},
        "request": {"reqid": str(uuid.uuid4()), "text": text,
                    "text_type": "plain", "operation": "query"},
    }
    headers = {"Authorization": f"Bearer;{cfg['token']}", "Content-Type": "application/json"}
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.post(URL, json=body, headers=headers, timeout=60)
            r.raise_for_status()
            j = r.json()
            if j.get("code") != 3000 or not j.get("data"):
                raise RuntimeError(f"火山返回 code={j.get('code')} msg={j.get('message')}")
            return base64.b64decode(j["data"])
        except (requests.RequestException, RuntimeError) as e:
            last = e
            if attempt < RETRIES - 1:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"合成重试 {RETRIES} 次失败: {last}")


def envelope(wav_path):
    data, sr = sf.read(wav_path)
    if data.ndim > 1:
        data = data.mean(axis=1)
    hop = sr / ENV_FPS
    n = int(np.ceil(len(data) / hop))
    env = np.zeros(n)
    for i in range(n):
        a = int(i * hop)
        seg = data[a:int(min(len(data), a + hop))]
        env[i] = np.sqrt(np.mean(seg ** 2)) if len(seg) else 0.0
    p = np.percentile(env, NORM_PCT) or 1e-6
    env = np.clip(env / p, 0, 1)
    env = np.convolve(env, np.ones(SMOOTH_KERNEL) / SMOOTH_KERNEL, mode="same")
    return [round(float(x), 3) for x in env]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--speed", type=float, default=1.2,
                    help="火山原生语速（重合成，非变速拉伸；1.2 = 紧凑口播）")
    ap.add_argument("--asr-model", default="small",
                    help="faster-whisper 型号；只借时间锚点，small 足够，语速极快用 large-v3")
    ap.add_argument("--gap", type=float, default=None,
                    help="固定气口秒数，传了就对每句一律用这个值（退回旧的手动等长模式，"
                         "覆盖下面的标点语义化 auto 模式；不传 = 默认 auto）")
    ap.add_argument("--gap-map", default="",
                    help='幕尾（场景组末帧）帧号列表，如 "1,4,6,9"——这些帧用最长档 act_end，'
                         '不管句尾标点是什么')
    ap.add_argument("--env", default=None)
    a = ap.parse_args()

    act_end_frames = set()
    if a.gap_map:
        for tok in a.gap_map.split(","):
            tok = tok.strip()
            if tok:
                act_end_frames.add(int(tok))

    for p in [a.env, os.path.join(SKILL, ".env")]:
        if p:
            load_env(os.path.expanduser(p))
    cfg = {"appid": os.environ.get("VOLC_APPID", "").strip(),
           "token": os.environ.get("VOLC_ACCESS_TOKEN", "").strip(),
           "cluster": os.environ.get("VOLC_CLUSTER", "volcano_icl").strip(),
           "speaker": os.environ.get("VOLC_SPEAKER_ID", "").strip()}
    miss = [k for k, v in [("VOLC_APPID", cfg["appid"]), ("VOLC_ACCESS_TOKEN", cfg["token"]),
                           ("VOLC_SPEAKER_ID", cfg["speaker"])] if not v]
    if miss:
        sys.exit(f"✗ 缺凭证 {', '.join(miss)}——cp .env.example .env 填入你自己的火山凭证（见 README.md）")

    out = os.path.expanduser(a.out_dir)
    audio_dir = os.path.join(out, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    lines = parse_script(open(os.path.expanduser(a.script), encoding="utf-8").read())
    if not lines:
        sys.exit("✗ SCRIPT.md 解析到 0 句——检查标题带 (Frame N) 且口播文本为 4 空格缩进行")
    mode = f"固定 {a.gap}s" if a.gap is not None else "auto（按标点分档+抖动）"
    print(f"解析 {len(lines)} 句 · speed {a.speed}x · gap {mode}"
          + (f" · 幕尾帧 {sorted(act_end_frames)}" if act_end_frames else ""))

    from faster_whisper import WhisperModel
    asr = WhisperModel(a.asr_model, device="cpu", compute_type="int8")

    voices = []
    for it in lines:
        fr, text = it["frame"], it["text"]
        wp = os.path.join(audio_dir, f"{fr:02d}.wav")
        print(f"[{fr:02d}] 合成 · {text[:18]}…", flush=True)
        data = synth(text, a.speed, cfg)
        tmp = wp + ".part"
        open(tmp, "wb").write(data)
        os.replace(tmp, wp)  # 原子落盘，中断不留半截
        if a.gap is not None:
            gap = a.gap
        else:
            lo, hi = GAP_TIERS["act_end"] if fr in act_end_frames else classify_gap(text)
            gap = round(random.uniform(lo, hi), 3)
        if gap > 0:  # 尾部拼气口静音——必须在 ASR/包络之前，时长/口型/字幕锚点才自动一致
            pcm, sr = sf.read(wp)
            pad = np.zeros((int(sr * gap),) + pcm.shape[1:], dtype=pcm.dtype)
            sf.write(wp, np.concatenate([pcm, pad]), sr)
        dur = sf.info(wp).duration
        segs, _ = asr.transcribe(wp, language="zh", word_timestamps=True)
        ww = [{"text": w.word.strip(), "start": w.start, "end": w.end}
              for seg in segs for w in (seg.words or [])]
        voices.append({"frame": fr, "path": f"audio/{fr:02d}.wav", "duration_s": round(dur, 3),
                       "voice_type": cfg["speaker"],  # 音色标记:gate「全片一个音色」红线按它数
                       "words": rebuild_words(fr, text, ww),
                       "mouth_env": envelope(wp), "env_fps": ENV_FPS})
        print(f"[{fr:02d}] ok · {dur:.2f}s（含气口 {gap:.2f}s）")

    meta_path = os.path.join(out, "audio_meta.json")
    json.dump({"bgm": None, "voice_type": cfg["speaker"], "voices": voices, "sfx": []},
              open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    tot = sum(v["duration_s"] for v in voices)
    print(f"✓ {meta_path} · {len(voices)} 段 · {tot:.2f}s")


if __name__ == "__main__":
    main()
