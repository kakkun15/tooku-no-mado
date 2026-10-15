import mido
def notes(path):
    """[(秒, 長さ秒, 音高, トラック番号, 強さ)] を返す。打楽器チャンネル(10)は除く"""
    mf = mido.MidiFile(path); tpb = mf.ticks_per_beat
    tempos = []
    for tr in mf.tracks:
        t = 0
        for m in tr:
            t += m.time
            if m.type == 'set_tempo': tempos.append((t, m.tempo))
    tempos.sort()
    if not tempos or tempos[0][0] > 0: tempos.insert(0, (0, 500000))
    def sec(tick):
        s = 0; last_t, last_tempo = 0, tempos[0][1]
        for tt, tp in tempos[1:]:
            if tt > tick: break
            s += (tt - last_t) * last_tempo / tpb / 1e6; last_t, last_tempo = tt, tp
        return s + (tick - last_t) * last_tempo / tpb / 1e6
    out = []
    for ti, tr in enumerate(mf.tracks):
        t = 0; on = {}
        for m in tr:
            t += m.time
            if m.type == 'note_on' and m.velocity > 0:
                if m.channel == 9: continue
                key = (m.channel, m.note)
                if key in on: s0, v = on.pop(key); out.append((sec(s0), sec(t) - sec(s0), m.note, ti, v))
                on[key] = (t, m.velocity)
            elif m.type in ('note_off', 'note_on'):
                key = (m.channel, m.note)
                if key in on: s0, v = on.pop(key); out.append((sec(s0), sec(t) - sec(s0), m.note, ti, v))
    out.sort(key=lambda x: (x[0], -x[2]))
    return out
