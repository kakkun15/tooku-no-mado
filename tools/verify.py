import sys, os, json, glob, re, difflib
sys.path.insert(0, os.path.dirname(__file__))
from notes import load, dec; from mid2notes import notes; import ly2midi
from multiprocessing import Pool
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def mainly(d):
    name = os.path.basename(d)
    c = glob.glob(f'{d}/{name}.ly') + glob.glob(f'{d}/{name}-lys/{name}.ly') + glob.glob(f'{d}/*-lys/{name}.ly')
    if c: return c[0]
    cands = [f for f in glob.glob(d + '/**/*.ly', recursive=True) if '\\score' in open(f, errors='replace').read() and 'part' not in os.path.basename(f).lower()]
    return sorted(cands, key=len)[0] if cands else None
def one(args):
    sid, path, stored = args
    try:
        ly = mainly(ROOT + '/mutopia/ftp/' + path)
        mids = ly2midi.run(ly, ROOT + '/build/' + sid)
        if not mids: return sid, 'NO MIDI', ly
        m = []
        for f in mids: m += notes(f)
        m.sort(key=lambda x: (round(x[0], 3), -x[2]))
        mp = [x[2] for x in m]
        s = sorted(dec(stored, True), key=lambda x: (x[0], -x[2])); sp = [x[2] for x in s]
        sm = difflib.SequenceMatcher(None, sp, mp, autojunk=False)
        matched = sum(b.size for b in sm.get_matching_blocks())
        return sid, f'{matched/len(sp):.3f} stored={len(sp)} regen={len(mp)}', os.path.basename(ly)
    except Exception as e:
        return sid, 'ERR ' + str(e)[:200], path
if __name__ == '__main__':
    m = json.load(open(ROOT + '/srcmap.json'))
    songs = {x['id']: x for x in load(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'music.js'))}
    ids = sys.argv[1:] or list(m)
    with Pool(4) as p:
        for r in p.imap_unordered(one, [(i, m[i], songs[i]['n']) for i in ids]): print(*r, flush=True)
