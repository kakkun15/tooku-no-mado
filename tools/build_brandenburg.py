import sys, os, json, re, mido
sys.path.insert(0,'tools'); from mid2notes import notes; from encode import roles, encode
from collections import Counter
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
P=[ # (id, 題, file, 元のテンポ, 目標テンポ, 低音トラック数, 音色, 置き場所, lic, by, path)
 ('bb2_1','ブランデンブルク協奏曲 第2番 第1楽章','bb/b2/score.midi',60,96,2,'organ','pd',None,'Andy Vaught','BachJS/BWV1047/brandenburg_2'),
 ('bb2_2','ブランデンブルク協奏曲 第2番 第2楽章','bb/b2/score-1.midi',60,56,1,'strings','pd',None,'Andy Vaught','BachJS/BWV1047/brandenburg_2'),
 ('bb2_3','ブランデンブルク協奏曲 第2番 第3楽章','bb/b2/score-2.midi',60,100,2,'organ','pd',None,'Andy Vaught','BachJS/BWV1047/brandenburg_2'),
 ('bb5_3','ブランデンブルク協奏曲 第5番 第3楽章','bb/b5/score.midi',120,120,3,'organ','pd',None,'Joshua Koo','BachJS/BWV1050/brand5-3'),
 ('bb1_1','ブランデンブルク協奏曲 第1番 第1楽章','bb/b1a/score.midi',90,90,3,'organ','cc','by-3.0','Ben Stewart','BachJS/BWV1046/Brandenburg1-1'),
 ('bb1_2','ブランデンブルク協奏曲 第1番 第2楽章','bb/b1b/score.midi',30,32,3,'strings','cc','by-3.0','Ben Stewart','BachJS/BWV1046/Brandenburg1-2'),
]
def load(fn, var):
    s=open(R+fn).read(); m=re.search(r'window\.'+var+r' = (\[.*\]);', s, re.S); return s, m, json.loads(m.group(1))
out={'pd':[], 'cc':[]}
for sid,t,f,b0,b1,nlow,inst,where,lic,by,path in P:
    ns=notes(f); k=b0/b1
    ns=[(a*k,d*k,p,tr,v) for a,d,p,tr,v in ns]
    avg={}
    for a,d,p,tr,v in ns: avg.setdefault(tr,[]).append(p)
    order=sorted(avg, key=lambda tr: sum(avg[tr])/len(avg[tr]))
    low=set(order[:nlow])
    rs=roles(ns, low); end=max(a+d for a,d,*_ in rs)
    e=dict(id=sid,t=t,c='バッハ',i=inst,g='mutopia' if where=='pd' else 'cc',s=round(end),n=encode(rs))
    if where=='cc': e.update(lic=lic, by=by, src='https://www.mutopiaproject.org/ftp/'+path+'/')
    out[where].append(e)
    print(sid, len(rs), f'{int(end//60)}:{int(end%60):02d}', Counter(r[3] for r in rs), 'low', sorted(low))
# 書き込み（同じ id があれば置き換え）
for fn,var,key in (('music.js','CHILL_MUSIC','pd'),('music-cc.js','CHILL_MUSIC_CC','cc')):
    s,m,arr=load(fn,var); ids={e['id'] for e in out[key]}
    arr=[e for e in arr if e['id'] not in ids]+out[key]
    s=s[:m.start(1)]+json.dumps(arr,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
    open(R+fn,'w').write(s)
# CC のライセンス一覧に by-3.0 を足す
s,m,lic=load('music-cc.js','CHILL_LICENSES') if False else (None,None,None)
