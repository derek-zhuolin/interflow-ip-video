#!/usr/bin/env python3
# voice_baseline.py — 从真人录音提取「像不像我」的客观底线:语速 / 停顿分布 / 句长习惯。
# 产出 voice_baseline.json(存 skill 根),声音层筛 take 和验收(语速曲线)都对它比。
#
# 用法(TTS venv,需 faster_whisper;可选步骤,提了基准 take 筛选/验收更接近真人节奏):
#   "$TTS_PYTHON" voice_baseline.py --out <SKILL_DIR>/voice_baseline.json 你的真实录音1.wav 录音2.mp3 ...
#
# 口径:
#   语速   = 每个呼吸组的 字数/发声时长(去停顿),给全局均值±std + 分位数
#   停顿   = 相邻词间 gap ≥0.18s 记为停顿,给分布分位数(短逗/句读/换气长停)
#   句长   = 呼吸组(停顿 ≥0.30s 切分)的字数分布
import argparse, json, statistics, sys, datetime

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("audio", nargs="+")
    args = ap.parse_args()

    from faster_whisper import WhisperModel
    model = WhisperModel("small", device="cpu", compute_type="int8")

    words = []          # (text, start, end, source)
    per_source = {}
    for path in args.audio:
        segs, _ = model.transcribe(path, language="zh", word_timestamps=True)
        n0 = len(words)
        for seg in segs:
            for w in seg.words or []:
                t = (w.word or "").strip()
                if t:
                    words.append((t, w.start, w.end, path))
        per_source[path] = len(words) - n0
        print(f"  {path}: {len(words)-n0} words", file=sys.stderr)

    if len(words) < 30:
        print("✗ 语料过少(<30 词),基准不可信", file=sys.stderr)
        sys.exit(1)

    # 停顿:同一来源内相邻词的 gap
    PAUSE_MIN, GROUP_SPLIT = 0.18, 0.30
    pauses = []
    groups = []          # 呼吸组: {chars, speech_s}
    cur_chars, cur_speech = 0, 0.0
    for i, (t, s, e, src) in enumerate(words):
        cur_chars += len(t)
        cur_speech += (e - s)
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt[1] - e) if (nxt and nxt[3] == src) else None
        if gap is not None and gap >= PAUSE_MIN:
            pauses.append(round(gap, 3))
        if gap is None or gap >= GROUP_SPLIT:
            if cur_chars >= 2 and cur_speech > 0.2:
                groups.append({"chars": cur_chars, "speech_s": round(cur_speech, 3),
                               "cps": round(cur_chars / cur_speech, 2)})
            cur_chars, cur_speech = 0, 0.0

    cps = [g["cps"] for g in groups]
    glen = [g["chars"] for g in groups]
    q = lambda xs, p: round(statistics.quantiles(xs, n=100)[p - 1], 3) if len(xs) >= 5 else None
    baseline = {
        "version": 1,
        "created": datetime.date.today().isoformat(),
        "sources": {p: per_source[p] for p in args.audio},
        "total_words": len(words),
        "speech_rate_cps": {   # 字/秒(去停顿的发声段口径)
            "mean": round(statistics.mean(cps), 2),
            "std": round(statistics.stdev(cps), 2) if len(cps) > 1 else 0,
            "p10": q(cps, 10), "p50": q(cps, 50), "p90": q(cps, 90),
        },
        "pause_s": {
            "count": len(pauses),
            "p25": q(pauses, 25), "p50": q(pauses, 50),
            "p75": q(pauses, 75), "p90": q(pauses, 90),
            "max": max(pauses) if pauses else None,
        },
        "breath_group_chars": {
            "mean": round(statistics.mean(glen), 1),
            "p50": q(glen, 50), "p90": q(glen, 90),
            "max": max(glen),
        },
        "thresholds": {   # 声音层筛 take / 验收语速曲线用的判定带(基准 ± 容差)
            "cps_lo": round(statistics.mean(cps) - 2 * (statistics.stdev(cps) if len(cps) > 1 else 0.5), 2),
            "cps_hi": round(statistics.mean(cps) + 2 * (statistics.stdev(cps) if len(cps) > 1 else 0.5), 2),
            "pause_min_s": PAUSE_MIN, "group_split_s": GROUP_SPLIT,
        },
        "groups_sample": groups[:12],
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: baseline[k] for k in ("speech_rate_cps", "pause_s", "breath_group_chars", "thresholds")},
                     ensure_ascii=False, indent=2))
    print(f"✓ voice_baseline → {args.out}", file=sys.stderr)

if __name__ == "__main__":
    main()
