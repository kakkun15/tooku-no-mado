import sys, os, json, mido
sys.path.insert(0, os.path.dirname(__file__))
from mid2notes import notes; from encode import roles, encode
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIC = {'by-sa-2.5': ('CC BY-SA 2.5', 'https://creativecommons.org/licenses/by-sa/2.5/'),
       'by-sa-3.0': ('CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/'),
       'by-sa-4.0': ('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'),
       'by-4.0': ('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/')}
P = [
 dict(id='moonlight', t='月光 第1楽章', c='ベートーヴェン', i='piano', mid='moonlight/moonlight1-a4.midi', lic='by-sa-2.5', by='Stewart Holmes', path='BeethovenLv/O27/moonlight'),
 dict(id='nocturne2', t='ノクターン 第2番 変ホ長調', c='ショパン', i='piano', mid='nocturne2/chopin_nocturne_op9_n2.midi', lic='by-sa-3.0', by='Renato Biolcati Rinaldi', path='ChopinFF/O9/chopin_nocturne_op9_n2'),
 dict(id='danube', t='美しく青きドナウ（主題）', c='J.シュトラウス2世', i='piano', mid='danube/blue_danube.midi', lic='by-sa-4.0', by='Nikos Kouremenos', path='StraussJJ/O314/blue_danube', note='主題だけの易しい版（ハ長調）'),
 dict(id='largo', t='家路（新世界より 第2楽章）', c='ドヴォルザーク', i='strings', mid='largo/Mvt2_Largo-1.midi', lic='by-sa-3.0', by='Keith OHara', path='DvorakA/O95/Sym9', cut_tick=68352, note='冒頭から最初の部分の終わり（45小節目あたり）までの抜粋'),
 dict(id='gnossienne1', t='グノシエンヌ 第1番', c='サティ', i='piano', mid='gnossienne1/no_1-1.midi', lic='by-sa-4.0', by='Knute Snortum', path='SatieE/Gnossienne/no_1'),
 dict(id='goldberg', t='ゴルトベルク変奏曲 アリア', c='バッハ', i='piano', mid='goldberg/bwv-988-aria.midi', lic='by-sa-3.0', by='JD Erickson', path='BachJS/BWV988/bwv-988-aria'),
 dict(id='k545', t='ピアノソナタ K.545 第1楽章', c='モーツァルト', i='piano', mid='k545/K545-1.midi', lic='by-sa-3.0', by='Alejandro Sierra', path='MozartWA/KV545/K545-1'),
 dict(id='canon_orig', t='カノン（3つのヴァイオリンと通奏低音・原曲版）', c='パッヘルベル', i='strings', mid='canon_orig/canon_per_3_violini_e_basso.midi', lic='by-4.0', by='Michael Fischer v. Mollard', path='PachelbelJ/Canon_per_3_Violini_e_Basso'),
]
LOW = ('down', 'lower', 'cello', 'bass', 'bassoon', 'trombone', 'timpani', 'violoncello')
out = []
for p in P:
    f = S + '/cc/' + p['mid']; mf = mido.MidiFile(f)
    names = [(t.name or '').lower() for t in mf.tracks]
    low = {i for i, n in enumerate(names) if any(n.startswith(k) for k in LOW)}
    if not low:  # 名前が無いときは、平均の音が一番低いトラック
        avg = {}
        for n in notes(f): avg.setdefault(n[3], []).append(n[2])
        low = {min(avg, key=lambda k: sum(avg[k]) / len(avg[k]))}
    ns = notes(f)
    if 'cut_tick' in p:
        tpb = mf.ticks_per_beat; tempos = []
        for tr in mf.tracks:
            t = 0
            for m in tr:
                t += m.time
                if m.type == 'set_tempo': tempos.append((t, m.tempo))
        tempos.sort(); cut = 0; lt, lp = 0, tempos[0][1]
        for tt, tp in tempos[1:]:
            if tt >= p['cut_tick']: break
            cut += (tt - lt) * lp / tpb / 1e6; lt, lp = tt, tp
        cut += (p['cut_tick'] - lt) * lp / tpb / 1e6
        ns = [(t, min(d, cut - t + 1.5), n, tr, v) for t, d, n, tr, v in ns if t < cut - 0.02]
    t0 = min(n[0] for n in ns); ns = [(t - t0, d, n, tr, v) for t, d, n, tr, v in ns]
    rs = roles(ns, low)
    end = max(t + d for t, d, *_ in rs)
    e = dict(id=p['id'], t=p['t'], c=p['c'], i=p['i'], g='cc', s=round(end), lic=p['lic'], by=p['by'],
             src='https://www.mutopiaproject.org/ftp/' + p['path'] + '/', n=encode(rs))
    if p.get('note'): e['note'] = p['note']
    from collections import Counter
    print(p['id'], len(rs), f"{int(end//60)}:{int(end%60):02d}", Counter(r[3] for r in rs), 'low', sorted(low), file=sys.stderr)
    out.append(e)
head = '''/* とおくの窓：表示が必要な曲（Creative Commons）の音符データ。
   各曲の音符データは、Mutopia Project の楽譜（LilyPond）を MIDI に変換し、繰り返しを展開して作ったもので、
   元の楽譜のライセンスを引き継ぎます（lic：ライセンス、by：楽譜の入力者、src：元の楽譜、note：加えた変更）。
   ライセンスの本文：''' + ' / '.join(f'{v[0]} {v[1]}' for v in LIC.values()) + '''
   このファイル以外（再生のしくみ・景色・Public Domain の曲）には、これらのライセンスはかかりません。 */
window.CHILL_LICENSES = ''' + json.dumps({k: {'name': v[0], 'url': v[1]} for k, v in LIC.items()}, ensure_ascii=False) + ''';
window.CHILL_MUSIC_CC = ''' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(sys.argv[1], 'w').write(head)
print(len(head), 'bytes', file=sys.stderr)
