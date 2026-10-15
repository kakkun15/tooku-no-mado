"""曲の気分を、音符データだけから測る（録音は使わない）。
   明るさ（valence）：長調らしさ（数秒ごとに調を推定して長調だった時間の割合）・旋律の高さ・ぶつかる音の少なさ
   勢い（energy）    ：1秒あたりの音の出だしの数・音の短さ・強さ
   使い方: python3 tools/analyze_mood.py  → moods.js を書き出す"""
import json, re, math, base64, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TICK = 0.008
MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

def load(fn, var):
    s = open(os.path.join(ROOT, fn)).read(); m = re.search(r'window\.' + var + r' = (\[.*?\]);\s*$', s, re.S | re.M)
    return json.loads(m.group(1)) if m else []
def dec(b64):
    b = base64.b64decode(b64); i = 0; t = 0; out = []
    def vi():
        nonlocal i
        v = 0; s = 0
        while True:
            c = b[i]; i += 1; v |= (c & 127) << s; s += 7
            if not c & 128: return v
    while i < len(b):
        t += vi(); d = vi(); p = b[i]; f = b[i + 1]; i += 2
        out.append((t * TICK, d * TICK, p, f & 3, ((f >> 2) << 1) / 127))
    return out
def corr(a, b):
    ma = sum(a) / 12; mb = sum(b) / 12
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b)); den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den if den else 0
def key_of(h):
    best = (-9, None)
    for k in range(12):
        r = h[k:] + h[:k]
        best = max(best, (corr(r, MAJ), 'maj'), (corr(r, MIN), 'min'))
    return best
def features(notes, jp=False):
    ns = [n for n in notes if n[3] != 3]
    end = max(t + d for t, d, *_ in ns)
    # 数秒ごとの調（長調だった時間の割合）。全体の調も足す
    W = 6.0; maj = tot = 0
    for w in range(int(end // W) + 1):
        h = [0.0] * 12
        for t, d, p, r, v in ns:
            a, b = max(t, w * W), min(t + d, (w + 1) * W)
            if b > a: h[p % 12] += b - a
        if sum(h) < 0.5: continue
        c, m = key_of(h); tot += 1; maj += (m == 'maj')
    hall = [0.0] * 12
    for t, d, p, *_ in ns: hall[p % 12] += d
    c, m = key_of(hall)
    # 終わりの和音：最後の低音を主音とみて、長3度と短3度のどちらが多く鳴っているか
    last = max(t for t, *_ in ns); fin = [n for n in ns if n[0] >= last - 0.3]
    tonic = min(fin, key=lambda n: n[2])[2] % 12
    m3 = sum(d for t, d, p, *_ in ns if t + d > end - 8 and p % 12 == (tonic + 3) % 12)
    M3 = sum(d for t, d, p, *_ in ns if t + d > end - 8 and p % 12 == (tonic + 4) % 12)
    endmaj = 1 if M3 > m3 else 0 if m3 > M3 else 0.5
    major = 0.5 * (maj / max(1, tot)) + 0.2 * (1 if m == 'maj' else 0) + 0.3 * endmaj
    if jp:
        # 日本の旋法：半音で動く（陰旋法・都節）ほど暗く、半音のない（陽旋法・民謡）ほど明るい
        ml = [p for t, d, p, r, v in sorted(ns) if r == 1]
        steps = [abs(b - a) for a, b in zip(ml, ml[1:]) if a != b]
        semi = sum(1 for x in steps if x == 1) / max(1, len(steps))
        major = max(0.0, 1 - semi * 5)
    mel = [p for t, d, p, r, v in ns if r == 1] or [p for *_, p, r, v in [(0, 0) + n[2:] for n in ns]]
    pitch = sum(mel) / len(mel)
    # ぶつかる音（半音・長7度で重なる）の割合
    # 重なって鳴っている時間のうち、半音・長7度でぶつかっている割合（声部の多さに左右されにくい）
    clash = 0; dur = 0
    srt = sorted(ns)
    for i, (t, d, p, r, v) in enumerate(srt):
        for (t2, d2, p2, *_ ) in srt[max(0, i - 24):i]:
            ov = min(t + d, t2 + d2) - t
            if ov <= 0 or p == p2: continue
            dur += ov
            if abs(p - p2) % 12 in (1, 11): clash += ov
    onsets = len({round(t, 2) for t, *_ in ns})
    dens = onsets / end
    avgd = sum(min(d, 2.0) for t, d, *_ in ns) / len(ns)
    vel = sum(v for *_, v in ns) / len(ns)
    return dict(major=major, pitch=pitch, clash=clash / max(dur, 1e-6), dens=dens, avgd=avgd, vel=vel, end=end)

MOODS = [  # 明るさ × 勢い
    ('yasuragu', 'やすらぐ', '明るくて静か'),
    ('hogaraka', 'ほがらか', '明るくて、ほどよく動く'),
    ('hazumu', 'はずむ', '明るくて、ノリがいい'),
    ('shinmiri', 'しんみり', '暗めで静か'),
    ('monoomoi', 'もの思い', '暗めで、ほどよく動く'),
    ('hageshii', 'はげしい', '暗めで、勢いがある'),
]
def main():
    songs = load('music.js', 'CHILL_MUSIC') + load('music-cc.js', 'CHILL_MUSIC_CC') + load('music-mine.js', 'CHILL_MUSIC_MINE')
    F = {p['id']: features(dec(p['n']), jp=p.get('i') == 'koto') for p in songs}
    def z(key):
        xs = [f[key] for f in F.values()]; m = sum(xs) / len(xs); s = math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs)) or 1
        return {k: (f[key] - m) / s for k, f in F.items()}
    Zm, Zp, Zc = z('major'), z('pitch'), z('clash')
    for f in F.values(): f['ldens'] = math.log(f['dens'])
    Zd, Za, Zv = z('ldens'), z('avgd'), z('vel')
    out = {}
    for k, f in F.items():
        val = Zm[k] * 1.0 + Zp[k] * 0.25 - Zc[k] * 0.3
        en = Zd[k] * 1.0 - Za[k] * 0.35 + Zv[k] * 0.15
        out[k] = dict(v=round(val, 2), e=round(en, 2))
    # しきい値：明るさは 0 で二分、勢いは3等分
    es = sorted(o['e'] for o in out.values()); lo, hi = es[len(es) // 3], es[2 * len(es) // 3]
    for k, o in out.items():
        lvl = 0 if o['e'] < lo else 1 if o['e'] < hi else 2
        o['m'] = MOODS[(0 if o['v'] >= 0 else 3) + lvl][0]
    js = ('/* とおくの窓：曲の気分。tools/analyze_mood.py が音符データから自動で出したもの（v：明るさ、e：勢い、m：気分）。 */\n'
          'window.CHILL_MOODS = ' + json.dumps([dict(id=m[0], name=m[1], help=m[2]) for m in MOODS], ensure_ascii=False) + ';\n'
          'window.CHILL_MOOD_OF = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(ROOT, 'moods.js'), 'w').write(js)
    return songs, out, F
if __name__ == '__main__':
    songs, out, F = main()
    names = {p['id']: p['t'] for p in songs}
    from collections import defaultdict
    g = defaultdict(list)
    for k, o in out.items(): g[o['m']].append((o['v'], o['e'], names[k]))
    for m in MOODS:
        print(f"== {m[1]} ({len(g[m[0]])})")
        for v, e, t in sorted(g[m[0]], key=lambda x: -x[0])[:60]: print(f"   {v:+.2f} {e:+.2f} {t}")
