#!/usr/bin/env python3
"""tts_free.py — 第 0 档免费声音出片（edge-tts，零账号零凭证）+ whisper 词级对齐 + RMS 口型包络。

「三档声音」的开箱档：没有火山凭证也能完整出片（文生视频模式）——
口型/字幕/动效吃的是音频的**响度包络与词级时间戳**，跟"谁的声音"无关，
所以免费声音驱动的小人动效与克隆音完全一致。
产物契约与 tts_clone.py 完全相同（audio/NN.wav 尾部拼气口 + audio_meta.json），下游零改动。

依赖: TTS venv 里多装一个 edge-tts（`$TTS_PYTHON -m pip install edge-tts`）。
     微软 Edge 在线合成，免费、无需账号；属非官方接口，偶发限流/失效时
     先升级包（pip install -U edge-tts），仍不行就换第 1 档火山标准音色（见 README）。
用法: "$TTS_PYTHON" tts_free.py --script SCRIPT.md --out-dir . [--voice zh-CN-YunxiNeural]
                    [--speed 1.2] [--asr-model small] [--gap-map "1,4"] [--gap 0.45]
常用中文声音: zh-CN-YunxiNeural(男·默认) / zh-CN-XiaoxiaoNeural(女) / zh-CN-YunjianNeural(男·沉)
     全表: "$TTS_PYTHON" -m edge_tts --list-voices | grep zh-CN
注意: 双 take 基准筛选（tts_takes.py）是克隆音专用路径；免费档走本脚本单 take。
"""
import argparse, asyncio, os, sys, json, random, subprocess, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tts_clone import envelope, classify_gap, GAP_TIERS, ENV_FPS  # noqa: E402  复用气口/包络（同一契约）
from script_lib import parse_script, rebuild_words  # noqa: E402

try:
    import numpy as np
    import soundfile as sf
except ImportError as e:
    sys.exit(f"✗ 缺依赖 {e.name}。用 TTS venv 跑: $TTS_PYTHON {__file__} ...（venv 配置见 README.md）")
try:
    import edge_tts
except ImportError:
    sys.exit("✗ 缺 edge-tts。装一下: $TTS_PYTHON -m pip install edge-tts")

RETRIES = 3  # 免费在线接口偶发抖动：指数退避 1s/2s/4s


def synth_free(text, voice, rate_pct, wav_path):
    """edge-tts 合成一句 → 统一转 24k 单声道 wav（ffmpeg 是管线硬依赖，比读 mp3 更稳）。"""
    rate = f"{'+' if rate_pct >= 0 else ''}{rate_pct}%"
    fd, tmp = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)
    last = None
    try:
        for attempt in range(RETRIES):
            try:
                asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(tmp))
                if os.path.getsize(tmp) == 0:
                    raise RuntimeError("edge-tts 返回空音频")
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp,
                                "-ar", "24000", "-ac", "1", wav_path], check=True)
                return
            except Exception as e:  # noqa: BLE001  网络/限流/转码统一重试
                last = e
                if attempt < RETRIES - 1:
                    time.sleep(2 ** attempt)
        raise RuntimeError(f"edge-tts 合成重试 {RETRIES} 次失败: {last}（升级 edge-tts 或换火山标准音色，见 README）")
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--voice", default="zh-CN-YunxiNeural",
                    help="edge-tts 声音名（默认云希·男声；全表 `-m edge_tts --list-voices`）")
    ap.add_argument("--speed", type=float, default=1.2,
                    help="语速倍率，映射为 edge-tts rate（1.2 = +20%%，紧凑口播）")
    ap.add_argument("--asr-model", default="small",
                    help="faster-whisper 型号；只借时间锚点，small 足够")
    ap.add_argument("--gap", type=float, default=None,
                    help="固定气口秒数（覆盖标点语义化 auto 模式；不传 = auto）")
    ap.add_argument("--gap-map", default="",
                    help='幕尾（场景组末帧）帧号列表，如 "1,4,6,9"——这些帧用最长档 act_end')
    a = ap.parse_args()

    act_end_frames = set()
    if a.gap_map:
        for tok in a.gap_map.split(","):
            tok = tok.strip()
            if tok:
                act_end_frames.add(int(tok))
    rate_pct = int(round((a.speed - 1.0) * 100))

    out = os.path.expanduser(a.out_dir)
    audio_dir = os.path.join(out, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    lines = parse_script(open(os.path.expanduser(a.script), encoding="utf-8").read())
    if not lines:
        sys.exit("✗ SCRIPT.md 解析到 0 句——检查标题带 (Frame N) 且口播文本为 4 空格缩进行")
    mode = f"固定 {a.gap}s" if a.gap is not None else "auto（按标点分档+抖动）"
    print(f"解析 {len(lines)} 句 · 免费声 {a.voice} · rate {rate_pct:+d}% · gap {mode}"
          + (f" · 幕尾帧 {sorted(act_end_frames)}" if act_end_frames else ""))

    from faster_whisper import WhisperModel
    asr = WhisperModel(a.asr_model, device="cpu", compute_type="int8")

    voices = []
    for it in lines:
        fr, text = it["frame"], it["text"]
        wp = os.path.join(audio_dir, f"{fr:02d}.wav")
        print(f"[{fr:02d}] 合成 · {text[:18]}…", flush=True)
        tmp_wav = wp + ".part.wav"
        synth_free(text, a.voice, rate_pct, tmp_wav)
        os.replace(tmp_wav, wp)  # 原子落盘，中断不留半截
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
                       "voice_type": a.voice,  # 音色标记:gate「全片一个音色」红线按它数
                       "words": rebuild_words(fr, text, ww),
                       "mouth_env": envelope(wp), "env_fps": ENV_FPS})
        print(f"[{fr:02d}] ok · {dur:.2f}s（含气口 {gap:.2f}s）")

    meta_path = os.path.join(out, "audio_meta.json")
    json.dump({"bgm": None, "voice_type": a.voice, "voices": voices, "sfx": []},
              open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    tot = sum(v["duration_s"] for v in voices)
    print(f"✓ {meta_path} · {len(voices)} 段 · {tot:.2f}s")


if __name__ == "__main__":
    main()
