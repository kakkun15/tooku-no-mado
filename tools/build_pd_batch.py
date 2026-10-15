import sys, json, re, os, glob, mido
sys.path.insert(0,'tools'); import ly2midi, verify
from mid2notes import notes; from encode import roles, encode
from collections import Counter
from multiprocessing import Pool
M=''+os.environ.get('MUTOPIA','work/mutopia')+'/ftp/'
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
P=[ # id, 題, 作曲, 音色, path, テンポ指定がなかったときの四分音符
 ('gonbe','権兵衛が種まく','日本の俗謡','koto','Traditional/JPM001-GonbeGaTanemaku',96),
 ('oedo','お江戸日本橋','日本の俗謡','koto','Traditional/JPM007-O-Edo-Nihonbashi',96),
 ('kappore','かっぽれ','日本の俗謡','koto','Traditional/JPM024-Kappore',100),
 ('kurokami','黒髪','日本の俗謡','koto','Traditional/JPM040-Kuro-Kami',72),
 ('echigo','越後獅子','日本の俗謡','koto','Traditional/JPM096-Echigo-Jishi-hiragana',96),
 ('iyobushi','伊予節','日本の俗謡','koto','Traditional/JPM072-Iyo-Bushi',92),
 ('stars','星条旗よ永遠なれ','スーザ','piano','SousaJP/TheStarsAndStripesForever',None),
 ('libertybell','自由の鐘','スーザ','piano','SousaJP/TheLibertyBell',None),
 ('slumber','おやすみ、いとしい子（Slumber My Darling）','フォスター','piano','FosterSC/slumber',None),
 ('easywinners','イージー・ウィナーズ','ジョプリン','piano','JoplinS/winners',72),
 ('elite','エリート・シンコペーションズ','ジョプリン','piano','JoplinS/EliteSyncopations',72),
 ('midnightclear','真夜中に澄み渡る（It Came Upon the Midnight Clear）','ウィリス','strings','WillisRS/carol',None),
]
def conv(p):
    sid=p[0]; ly=verify.mainly(M+p[4]); mids=ly2midi.run(ly, os.path.abspath('pd2/'+sid))
    return sid, ly, mids
if __name__=='__main__':
    with Pool(4) as pool: res={r[0]:r for r in pool.map(conv,P)}
    out=[]
    for sid,t,c,inst,path,q in P:
        _,ly,mids=res[sid]
        if not mids: print('FAIL',sid,ly); continue
        f=mids[0]; mf=mido.MidiFile(f)
        tempos=[m.tempo for tr in mf.tracks for m in tr if m.type=='set_tempo']
        ns=notes(f); k=1
        if q and (not tempos or all(abs(mido.tempo2bpm(x)-60)<0.5 for x in tempos)): k=60/q   # 既定の60のままなら合わせる
        ns=[(a*k,d*k,p,tr,v) for a,d,p,tr,v in ns]
        avg={}
        for a,d,p,tr,v in ns: avg.setdefault(tr,[]).append(p)
        order=sorted(avg,key=lambda tr:sum(avg[tr])/len(avg[tr]))
        low=set(order[:1]) if len(order)>1 else set()
        rs=roles(ns,low); t0=min(r[0] for r in rs); rs=[(a-t0,)+tuple(r[1:]) for r in rs for a in [r[0]]]
        end=max(a+d for a,d,*_ in rs)
        out.append(dict(id=sid,t=t,c=c,i=inst,g='mutopia',s=round(end),n=encode(rs),src=path))
        print(sid, os.path.basename(f), len(mids), len(rs), f'{int(end//60)}:{int(end%60):02d}', 'tempo', sorted({round(mido.tempo2bpm(x)) for x in tempos}), Counter(r[3] for r in rs))
    json.dump(out, open('pd2.json','w'), ensure_ascii=False)
