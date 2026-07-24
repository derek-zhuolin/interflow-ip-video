#!/usr/bin/env python3
"""tts_takes.py — 声音层「双 take + ASR 回读 + 基准筛选」(过一眼假关的配音路径)。

每句合成 N 个 take(默认 2),逐 take 三重检查:
  1 ASR 回读 diff:吞字(连续缺 ≥2 字)/错读(CER>6%) = 该 take 不合格
  2 语速:发声段 字/秒 落在 voice_baseline.json 的 [cps_lo, cps_hi] 带内
  3 停顿:稿里的 …… 思考长停必须真的停(<0.45s 时在词边界物理拼静音补足——
    显式停顿标记由文件层保证,不赌 TTS 引擎心情)

选择:两 take 都不合格 → 列入「改写重合成」清单(exit 3,改稿后重跑);
      一好一坏 → 自动选;两个都好且分差明显 → 自动选分高的;
      分差小(拿不准)→ 写入 takes/undecided.json,人耳选条后用 --choose 重跑定稿。

定稿产物:audio/NN.wav(选中 take + 气口) + audio_meta.json(兼容既有管线)
        + beat_map.json(词级时间戳 + 停顿点 + 全局偏移 = 全片唯一时间源)

用法: "$TTS_PYTHON" tts_takes.py --script SCRIPT.md --out-dir . \
        [--baseline <SKILL>/voice_baseline.json] [--takes 2] [--gap-map "2,6,9"] \
        [--choose "3:b,7:a"]   # 人耳选条结果;未列的沿用自动选择
退出码: 0=定稿完成  2=有拿不准句待人耳选条  3=有句子需改写重合成
"""
import argparse, os, sys, json, random, difflib, re

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tts_clone import (synth, envelope, classify_gap, GAP_TIERS, load_env,
                       ENV_FPS, SKILL)  # noqa: E402
from script_lib import parse_script, rebuild_words  # noqa: E402

import numpy as np
import soundfile as sf

CER_FAIL = 0.06        # 错读线
CER_UNSURE = 0.03      # 两 take 都过时,CER 差 < 这个 且 语速差 <0.4cps = 拿不准
ELLIPSIS_MIN = 0.45    # …… 实测停顿低于此值就物理补静音
ELLIPSIS_PAD = (0.55, 0.75)

_CN_DIG = "零一二三四五六七八九"


def _int2cn(n):
    """整数→中文读法(0–9999 常用位),ASR 常把「三十秒」写成「30秒」、「三千九百」写成「3900」——比对前统一。"""
    if n < 10:
        return _CN_DIG[n]
    if n < 100:
        t, o = divmod(n, 10)
        return ("" if t == 1 else _CN_DIG[t]) + "十" + (_CN_DIG[o] if o else "")
    if n < 1000:
        h, r = divmod(n, 100)
        return _CN_DIG[h] + "百" + (("零" + _int2cn(r)) if 0 < r < 10 else (_int2cn(r) if r else ""))
    if n < 10000:
        k, r = divmod(n, 1000)
        return _CN_DIG[k] + "千" + (("零" + _int2cn(r)) if 0 < r < 100 else (_int2cn(r) if r else ""))
    return "".join(_CN_DIG[int(d)] for d in str(n))  # ≥10000 逐位兜底


def _num2cn(m):
    return _int2cn(int(m.group()))


def _num2cn_i(n):
    return _int2cn(int(n))


try:
    from zhconv import convert as _zhconv
except Exception:  # 无 zhconv 时退化(繁简差异会误伤短句 CER,建议装 zhconv)
    _zhconv = None


def norm(s):
    # whisper 常把简体读回成繁体(賺錢術問題),繁简差异在短句上会顶穿 CER 阈值 → 先折叠成简体
    if _zhconv:
        s = _zhconv(s, "zh-cn")
    s = re.sub(r"(?<=\d),(?=\d)", "", s)  # 剥掉千分位逗号(ASR「3,900」→「3900」)再转中文
    s = re.sub(r"\d+", _num2cn, s)
    return re.sub(r"[^一-鿿A-Za-z]", "", s).lower()


def cer_and_gaps(script_text, asr_text):
    """归一化字错率 + 最长连续缺字(吞字判定)。"""
    a, b = norm(script_text), norm(asr_text)
    if not a:
        return 0.0, 0
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    err, max_del = 0, 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        err += max(i2 - i1, j2 - j1)
        if tag in ("delete", "replace"):
            max_del = max(max_del, i2 - i1 if tag == "delete" else 0)
    return err / len(a), max_del


def speech_cps(words):
    """发声段口径 字/秒(与 voice_baseline 同口径:字数 / 词时长和)。"""
    chars = sum(len(norm(w["text"])) for w in words)
    t = sum(max(0.0, w["end"] - w["start"]) for w in words)
    return (chars / t) if t > 0.2 else 0.0


def ellipsis_char_offsets(text):
    """…… 前面的内容字数(归一化口径)——用来定位停顿应落在第几个字后。"""
    offs, seen = [], 0
    i = 0
    while i < len(text):
        if text[i] == "…":
            if seen > 0:
                offs.append(seen)
            while i < len(text) and text[i] == "…":
                i += 1
            continue
        if norm(text[i]):
            seen += 1
        i += 1
    return offs


def find_pause_at(words, char_off):
    """返回 (word_idx, gap_s):第 char_off 个内容字所在词 与 下一词 之间的 gap。"""
    seen = 0
    for i, w in enumerate(words):
        seen += len(norm(w["text"]))
        if seen >= char_off:
            if i + 1 < len(words):
                return i, max(0.0, words[i + 1]["start"] - w["end"])
            return i, None
    return None, None


def insert_silence(wav_path, at_s, dur_s):
    pcm, sr = sf.read(wav_path)
    cut = int(at_s * sr)
    pad = np.zeros((int(sr * dur_s),) + pcm.shape[1:], dtype=pcm.dtype)
    sf.write(wav_path, np.concatenate([pcm[:cut], pad, pcm[cut:]]), sr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--baseline", default=None,
                    help="voice_baseline.json（可选；不传 = 跳过语速带筛选，建议先用 scripts/voice_baseline.py 从你的真实录音提取）")
    ap.add_argument("--takes", type=int, default=2)
    ap.add_argument("--speed", type=float, default=1.2)
    ap.add_argument("--asr-model", default="small")
    ap.add_argument("--gap-map", default="")
    ap.add_argument("--choose", default="", help='人耳选条: "3:b,7:a"')
    ap.add_argument("--env", default=None)
    a = ap.parse_args()

    base = None
    if a.baseline:
        bp = os.path.expanduser(a.baseline)
        if not os.path.exists(bp):
            sys.exit(f"✗ --baseline 文件不存在: {bp}")
        base = json.load(open(bp, encoding="utf-8"))
    if base:
        cps_lo, cps_hi = base["thresholds"]["cps_lo"], base["thresholds"]["cps_hi"]
    else:
        cps_lo, cps_hi = 0.0, float("inf")  # 无基准：语速带不筛，只靠 ASR 回读/吞字关
        print("⚠ 未提供 voice_baseline —— 跳过语速带筛选。建议 scripts/voice_baseline.py "
              "从你的真实录音提基准后加 --baseline（筛 take 更接近真人节奏）。")
    act_end = {int(t) for t in a.gap_map.split(",") if t.strip()}
    chosen_override = {}
    for tok in a.choose.split(","):
        if ":" in tok:
            f, t = tok.split(":")
            chosen_override[int(f)] = t.strip()

    for p in [a.env, os.path.join(SKILL, ".env")]:
        if p:
            load_env(os.path.expanduser(p))
    cfg = {"appid": os.environ.get("VOLC_APPID", "").strip(),
           "token": os.environ.get("VOLC_ACCESS_TOKEN", "").strip(),
           "cluster": os.environ.get("VOLC_CLUSTER", "volcano_icl").strip(),
           "speaker": os.environ.get("VOLC_SPEAKER_ID", "").strip()}
    if not all([cfg["appid"], cfg["token"], cfg["speaker"]]):
        sys.exit("✗ 缺火山凭证(VOLC_APPID/VOLC_ACCESS_TOKEN/VOLC_SPEAKER_ID)")

    out = os.path.expanduser(a.out_dir)
    takes_dir = os.path.join(out, "takes")
    audio_dir = os.path.join(out, "audio")
    os.makedirs(takes_dir, exist_ok=True)
    os.makedirs(audio_dir, exist_ok=True)
    lines = parse_script(open(os.path.expanduser(a.script), encoding="utf-8").read())
    if not lines:
        sys.exit("✗ SCRIPT.md 解析到 0 句")
    band = f"基准带 cps [{cps_lo},{cps_hi}]" if base else "无基准（语速带不筛）"
    print(f"解析 {len(lines)} 句 × {a.takes} takes · {band}")

    from faster_whisper import WhisperModel
    asr = WhisperModel(a.asr_model, device="cpu", compute_type="int8")

    def read(wav):
        segs, _ = asr.transcribe(wav, language="zh", word_timestamps=True)
        ww = [{"text": w.word.strip(), "start": w.start, "end": w.end}
              for seg in segs for w in (seg.words or [])]
        return ww, "".join(w["text"] for w in ww)

    tags = "abcdefg"
    undecided, need_rewrite, report = [], [], []
    beat_frames, voices = [], []

    for it in lines:
        fr, text = it["frame"], it["text"]
        cands = []
        for k in range(a.takes):
            tag = tags[k]
            wp = os.path.join(takes_dir, f"{fr:02d}-{tag}.wav")
            if not os.path.exists(wp):  # take 落盘可续跑(选条重跑不再花钱)
                print(f"[{fr:02d}-{tag}] 合成 · {text[:16]}…", flush=True)
                open(wp + ".part", "wb").write(synth(text, a.speed, cfg))
                os.replace(wp + ".part", wp)
            ww, asr_text = read(wp)
            cer, max_del = cer_and_gaps(text, asr_text)
            cps = speech_cps(ww)
            ell = [find_pause_at(ww, off) for off in ellipsis_char_offsets(text)]
            ok = cer <= CER_FAIL and max_del < 2 and cps_lo <= cps <= cps_hi
            cands.append({"tag": tag, "path": wp, "words": ww, "cer": round(cer, 4),
                          "max_del": max_del, "cps": round(cps, 2), "ellipsis": ell, "ok": ok})
            print(f"[{fr:02d}-{tag}] cer {cer:.3f} del{max_del} cps {cps:.2f} "
                  f"{'✓' if ok else '✗'}", flush=True)

        good = [c for c in cands if c["ok"]]
        if fr in chosen_override:
            pick = next(c for c in cands if c["tag"] == chosen_override[fr])
        elif not good:
            need_rewrite.append({"frame": fr, "text": text,
                                 "detail": [{k: c[k] for k in ("tag", "cer", "max_del", "cps")} for c in cands]})
            report.append({"frame": fr, "pick": None, "cands": cands})
            continue
        elif len(good) == 1:
            pick = good[0]
        else:
            mean_cps = base["speech_rate_cps"]["mean"] if base else None
            score = lambda c: c["cer"] * 10 + (abs(c["cps"] - mean_cps) * 0.5 if mean_cps is not None else 0)
            good.sort(key=score)
            if (abs(good[0]["cer"] - good[1]["cer"]) < CER_UNSURE
                    and abs(good[0]["cps"] - good[1]["cps"]) < 0.4):
                undecided.append({"frame": fr, "text": text,
                                  "takes": [{"tag": c["tag"], "path": os.path.relpath(c["path"], out),
                                             "cer": c["cer"], "cps": c["cps"]} for c in good]})
                report.append({"frame": fr, "pick": None, "cands": cands})
                continue
            pick = good[0]
        report.append({"frame": fr, "pick": pick["tag"], "cands": cands})

        # —— 定稿:拷 take → …… 停顿不足则物理补静音 → 尾部气口 → 终 ASR/包络 ——
        final = os.path.join(audio_dir, f"{fr:02d}.wav")
        pcm, sr = sf.read(pick["path"])
        sf.write(final, pcm, sr)
        for off in ellipsis_char_offsets(text):
            ww, _ = read(final)  # 每次插入后重读,时间轴已变
            idx, gap = find_pause_at(ww, off)
            if idx is not None and gap is not None and gap < ELLIPSIS_MIN:
                pad = round(random.uniform(*ELLIPSIS_PAD) - gap, 3)
                insert_silence(final, ww[idx]["end"] + gap / 2, pad)
                print(f"[{fr:02d}] …… 实测 {gap:.2f}s → 补静音 {pad:.2f}s")
        lo, hi = GAP_TIERS["act_end"] if fr in act_end else classify_gap(text)
        gap = round(random.uniform(lo, hi), 3)
        pcm, sr = sf.read(final)
        sf.write(final, np.concatenate([pcm, np.zeros((int(sr * gap),) + pcm.shape[1:], dtype=pcm.dtype)]), sr)

        ww, _ = read(final)
        # whisper 在句首静音段把首词 start 压到 0.00(已知偏置)——用 RMS 起振对齐声学真值,
        # 否则字幕/词锚/口型验收全被首词带偏(REVIEW a3 实测 0.2-0.33s 系统性偏差)
        if ww:
            env0 = envelope(final)
            onset = next((i / ENV_FPS for i in range(len(env0) - 1)
                          if env0[i] > 0.3 and env0[i + 1] > 0.3), None)
            if onset is not None and ww[0]["start"] < onset - 0.05:
                ww[0]["start"] = round(min(onset, ww[0]["end"] - 0.02), 3)
        words = rebuild_words(fr, text, ww)  # 字幕/锚点口径(稿件原文短语)
        dur = sf.info(final).duration
        # 停顿从原始 ASR 词算(声学真值)——rebuild_words 是短语级,会把帧内停顿吞进跨度
        pauses = []
        for i in range(len(ww) - 1):
            g = ww[i + 1]["start"] - ww[i]["end"]
            if g >= 0.25:
                pauses.append({"after": ww[i]["text"], "start": round(ww[i]["end"], 3), "dur": round(g, 3)})
        last_end = ww[-1]["end"] if ww else 0
        pauses.append({"after": "(尾气口)", "start": round(last_end, 3), "dur": round(dur - last_end, 3)})
        beat_frames.append({"frame": fr, "take": pick["tag"], "duration_s": round(dur, 3),
                            "words": words,
                            "asr_words": [{"text": w["text"], "start": round(w["start"], 3),
                                           "end": round(w["end"], 3)} for w in ww],
                            "pauses": pauses})
        voices.append({"frame": fr, "path": f"audio/{fr:02d}.wav", "duration_s": round(dur, 3),
                       "voice_type": cfg["speaker"], "words": words,
                       "mouth_env": envelope(final), "env_fps": ENV_FPS})
        print(f"[{fr:02d}] 定稿 take-{pick['tag']} · {dur:.2f}s(尾气口 {gap:.2f}s)")

    json.dump(report, open(os.path.join(takes_dir, "report.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2, default=str)
    if need_rewrite:
        json.dump(need_rewrite, open(os.path.join(takes_dir, "need_rewrite.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        print(f"\n✗ {len(need_rewrite)} 句两个 take 都不合格 → takes/need_rewrite.json,改写后重跑")
        sys.exit(3)
    if undecided:
        json.dump(undecided, open(os.path.join(takes_dir, "undecided.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        print(f"\n⏸ {len(undecided)} 句拿不准 → takes/undecided.json,人耳选条后 --choose 重跑定稿")
        sys.exit(2)

    off = 0.0
    for bf in beat_frames:
        bf["start_global"] = round(off, 3)
        off += bf["duration_s"]
    json.dump({"version": 1, "source": "tts_takes", "total_s": round(off, 3),
               "baseline": os.path.basename(a.baseline) if a.baseline else None, "frames": beat_frames},
              open(os.path.join(out, "beat_map.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump({"bgm": None, "voice_type": cfg["speaker"], "voices": voices, "sfx": []},
              open(os.path.join(out, "audio_meta.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"✓ 定稿 {len(beat_frames)} 句 · {off:.2f}s → audio_meta.json + beat_map.json(唯一时间源)")


if __name__ == "__main__":
    main()
