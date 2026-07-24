#!/usr/bin/env python3
"""script_lib.py — SCRIPT.md 解析 + 字幕短句对齐（skill 内置库，零外部 skill 依赖）。

供 tts_clone.py / tts_takes.py import：
  parse_script(md)                    -> [{frame, text}]  解析 `## … (Frame N)` + 4 空格缩进口播行
  rebuild_words(fr, text, whisper_ww) -> words[]          字幕文字用 SCRIPT 原文，时间借 whisper 锚点插值

字幕分词是**短句级**（按标点分短句，中文长句按 ~7 字切，英文/数字整词）：
captions.mjs 每组 word cap 只有 2–4，逐字分词会让一屏只有 2–4 个字、太窄太跳；
短句级 = 一屏一短句，字幕更宽、切换更慢更自然。标点并入短句尾。
"""
import re

# ── 归一化（whisper 词与稿件同口径计字符位；全角折半角 + 剥标点/空白）──────────
_NORM_RE = re.compile("[，。？！、；：—…,.!?\\s\"'“”‘’：:()（）-]")


def _fold(s):
    out = []
    for c in (s or ""):
        o = ord(c)
        if 0xFF01 <= o <= 0xFF5E:
            out.append(chr(o - 0xFEE0))   # 全角 ASCII → 半角
        elif o == 0x3000:
            out.append(" ")               # 全角空格 → 半角空格
        else:
            out.append(c)
    return "".join(out)


def norm(s):
    return _NORM_RE.sub("", _fold(s or ""))


# ── SCRIPT.md 解析（`## … (Frame N)` 标题 + 4 空格缩进块 = 口播词）────────────
def parse_script(md):
    out, cur = [], None
    for line in md.splitlines():
        h = re.match(r'^#{2,3}\s+.*?\(frame\s+(\d+)\)', line, re.I)
        if h:
            if cur and cur['text'].strip(): out.append(cur)
            cur = {'frame': int(h.group(1)), 'text': ''}
            continue
        if cur is None: continue
        if re.match(r'^\s*\*\*', line): continue
        if re.match(r'^(\s{4,}|\t)\S', line): cur['text'] += line.strip()
    if cur and cur['text'].strip(): out.append(cur)
    return out


# ── 字幕分词：短句级（见文件头注释）──────────────────────────────────────────
def tokenize(text):
    segs = re.findall(r'[^，。？！、；：—…,.!?]+[，。？！、；：—…,.!?]*', text)
    toks = []
    for seg in segs:
        seg = seg.strip()
        if not seg: continue
        parts = re.findall(r'[A-Za-z0-9]+|[一-鿿]+|[^\sA-Za-z0-9一-鿿]+', seg)
        buf = ''
        def flush(_b=None):
            nonlocal buf
            if buf: toks.append(buf); buf = ''
        for p in parts:
            if re.match(r'^[A-Za-z0-9]+$', p):        # 英文/数字整词
                flush(); toks.append(p)
            elif re.match(r'^[一-鿿]+$', p):           # 中文串（超长切 ~7 字）
                buf += p
                while len(buf) >= 9:
                    toks.append(buf[:7]); buf = buf[7:]
            else:                                      # 标点并入当前短句尾
                buf += p
        flush()
    return [t for t in toks if t]


# ── whisper 词级锚点：(累计**归一化**字符位, 该词起点) ────────────────────────
# 词文本必须过与脚本同一个 norm()：whisper 会吐前导空格（' 時間'）和标点（'，'），
# 用裸 len() 计位会把字符位撑大——比例映射整体拉伸，触发词漂移 70~409ms。
def _anchors(whisper_words):
    pts, pos = [], 0
    for w in whisper_words:
        pts.append((pos, w['start']))
        pos += max(1, len(norm(w['text'])))
    pts.append((pos, whisper_words[-1]['end']))
    return pts, (pos or 1)


def _interp_cp(pts, cp):
    """按**字符位**分段线性插值。"""
    for j in range(len(pts) - 1):
        c0, t0 = pts[j]; c1, t1 = pts[j + 1]
        if c0 <= cp <= c1:
            return t0 + (t1 - t0) * ((cp - c0) / (c1 - c0) if c1 > c0 else 0)
    return pts[-1][1]


def _interp(pts, total, frac):
    return _interp_cp(pts, frac * total)


# ── 用 SCRIPT 原文校正字幕：时间戳借 whisper 累计字符插值（保留真实语音节奏）──
# 输出的是**短句块**（为字幕设计，见 tokenize 注释），不是逐词。
def rebuild_words(fr, script_text, whisper_words):
    if not whisper_words:
        return [{'id': f"{fr:02d}-0", 'text': script_text, 'start': 0.0, 'end': 1.0}]
    pts, total = _anchors(whisper_words)
    def interp(frac):
        return _interp(pts, total, frac)
    toks = tokenize(script_text)
    lens = [len(re.sub(r'[^A-Za-z0-9一-鿿]', '', t)) or 1 for t in toks]
    csum = [0]
    for L in lens: csum.append(csum[-1] + L)
    tot = csum[-1] or 1
    words = []
    for i, t in enumerate(toks):
        s = interp(csum[i] / tot); e = interp(csum[i + 1] / tot)
        words.append({'id': f"{fr:02d}-{i}", 'text': t,
                      'start': round(s, 3), 'end': round(max(e, s + 0.05), 3)})
    return words
