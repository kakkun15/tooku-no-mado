"""MIDI の音を、とおくの窓の音符データ（開始の差・長さ・音高・役割|強さ）にする。"""
import base64
TICK = 0.008
def roles(ns, low_tracks):
    """ns: [(秒,長さ,音高,トラック,強さ)]。役割 1=旋律 2=ベース 0=伴奏"""
    out = []
    groups = {}
    for n in ns: groups.setdefault(round(n[0] / 0.03), []).append(n)
    up_sounding = []   # 鳴っている旋律の音 (終わり, 音高)
    for k in sorted(groups):
        g = groups[k]; t = min(n[0] for n in g)
        up_sounding = [x for x in up_sounding if x[0] > t + 0.02]
        ups = [n for n in g if n[3] not in low_tracks]
        lows = [n for n in g if n[3] in low_tracks]
        top = max(ups, key=lambda n: n[2]) if ups else None
        if top and any(p > top[2] for e, p in up_sounding): top = None   # 上で旋律が伸びている間の動きは伴奏
        bot = min(lows, key=lambda n: n[2]) if lows else (min(g, key=lambda n: n[2]) if not ups or len(g) > 1 else None)
        for n in g:
            r = 1 if n is top else 2 if n is bot else 0
            out.append((n[0], n[1], n[2], r, n[4]))
        if top: up_sounding.append((top[0] + top[1], top[2]))
    return out
def encode(ns):
    ns = sorted(ns, key=lambda n: (n[0], -n[2]))
    b = bytearray(); last = 0
    def vi(v):
        while True:
            c = v & 127; v >>= 7
            b.append(c | (128 if v else 0))
            if not v: break
    for t, d, p, r, v in ns:
        ti = int(round(t / TICK)); di = max(1, int(round(d / TICK)))
        vi(ti - last); last = ti; vi(di); b.append(p & 127); b.append(((min(127, v) >> 1) << 2) | r)
    return base64.b64encode(bytes(b)).decode()
