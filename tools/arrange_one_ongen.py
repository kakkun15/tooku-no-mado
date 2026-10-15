import sys, json, mido
sys.path.insert(0,'tools'); from encode import encode
from collections import defaultdict
mf=mido.MidiFile('one.mid'); tpb=mf.ticks_per_beat
sec=lambda tk: tk/tpb*0.5            # 120bpm 一定（テンポ変更なし）
def notes(ti):
    t=0;on={};out=[]
    for m in mf.tracks[ti]:
        t+=m.time
        if m.type=='note_on' and m.velocity>0: on[m.note]=(t,m.velocity)
        elif m.type in('note_off','note_on') and m.note in on: s,v=on.pop(m.note); out.append((s,t-s,m.note,v))
    return sorted(out)
def vel(v,lo,hi): return int(round(lo+(v-96)*(hi-lo)/31 if v>=96 else lo*v/96))
ev=[]
for s,d,p,v in notes(3): ev.append((sec(s),sec(d),p,1,vel(v,90,104)))              # 主旋律
g=defaultdict(list)
for n in notes(1): g[n[0]].append(n)
for s,ns in g.items():                                                              # 低音の和音
    lo=min(n[2] for n in ns)
    for s_,d,p,v in ns: ev.append((sec(s_),sec(d),p,2 if p==lo else 0,vel(v,80,92)))
for ti,lo,hi in ((2,70,82),(4,66,78),(5,60,72),(7,80,94)):
    for s,d,p,v in notes(ti): ev.append((sec(s),sec(d),p,0,vel(v,lo,hi)))
for s,d,p,v in notes(6):                                                            # 打楽器
    code = 5 if (p==48 and d>=1920) else 1 if p==50 else 4
    ev.append((sec(s),sec(d),code,3,max(40,vel(v,70,90))))
end=max(t+d for t,d,*_ in ev)
piece=dict(id='one_ongen', t='one ongen', c='kakkun15', i='strings', g='mine', s=round(end), n=encode(ev))
print(len(ev), round(end,1))
open(''+os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/music-mine.js','w').write('''/* とおくの窓：持ち込みの曲。作者から受け取った MIDI を、このページの音符データ（開始・長さ・音高・役割と強さ）にしたもの。
   トラックごとに役割（旋律・和音・低音・打楽器）を決め、強弱を少しならしてある。 */
window.CHILL_MUSIC_MINE = '''+json.dumps([piece],ensure_ascii=False,separators=(',',':'))+';\n')
