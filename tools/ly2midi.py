"""Mutopia の .ly を MIDI にする。コピーを作り、convert-ly で書式を更新し、\\score に \\midi を足して、繰り返しを展開する。"""
import sys, os, re, shutil, subprocess, glob, lilypond
LY = lilypond.executable(); BIN = os.path.dirname(LY)
def run(src_ly, out_dir):
    src_dir = os.path.dirname(os.path.abspath(src_ly))
    out_dir = os.path.abspath(out_dir)
    if os.path.exists(out_dir): shutil.rmtree(out_dir)
    shutil.copytree(src_dir, out_dir, ignore_dangling_symlinks=True)
    main = os.path.join(out_dir, os.path.basename(src_ly))
    for f in glob.glob(out_dir + '/**/*.ly', recursive=True) + glob.glob(out_dir + '/**/*.ily', recursive=True):
        subprocess.run([os.path.join(BIN, 'convert-ly'), '-e', f], capture_output=True, cwd=os.path.dirname(f))
    s = open(main, encoding='utf-8', errors='replace').read()
    # \score { ... } の中身を \unfoldRepeats で包み、\midi を足す
    out = []; i = 0
    for m in re.finditer(r'\\score\s*\{', s):
        pass
    def patch(s):
        res = ''; pos = 0
        while True:
            m = re.search(r'\\score\s*\{', s[pos:])
            if not m: res += s[pos:]; break
            a = pos + m.end(); res += s[pos:a]
            depth = 1; j = a
            while depth and j < len(s):
                c = s[j]
                if c == '%':
                    if s[j:j+2] == '%{': j = s.find('%}', j) + 2; continue
                    j = s.find('\n', j); continue
                if c == '"':
                    j += 1
                    while s[j] != '"': j += 2 if s[j] == '\\' else 1
                elif c == '{': depth += 1
                elif c == '}': depth -= 1
                j += 1
            body = s[a:j-1]
            mt = ''
            mm0 = re.search(r'\\midi\s*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}', body)
            if mm0:
                tt = re.search(r'\\tempo[^\n}]*?=\s*\d+', mm0.group(0))
                if tt: mt = tt.group(0)
                body = body[:mm0.start()] + body[mm0.end():]
            # 音楽の部分 = \layout / \header より前
            k = len(body)
            for kw in (r'\\layout', r'\\header', r'\\midi', r'\\paper', r'\\include'):
                mm = re.search(kw + (r'\s*"' if kw.endswith('include') else r'\s*\{'), body)
                if mm: k = min(k, mm.start())
            res += ' \\unfoldRepeats { ' + body[:k] + ' } ' + body[k:] + ' \\midi { ' + mt + ' } }'
            pos = j
        return res
    s = re.sub(r'\\applyMusic\s*#unfold-repeats', '', s)
    s = patch(s)
    open(main, 'w', encoding='utf-8').write(s)
    r = subprocess.run([LY, '-dno-print-pages', '-dbackend=null', '-o', os.path.splitext(main)[0], main], capture_output=True, text=True, cwd=out_dir)
    mids = sorted(glob.glob(os.path.splitext(main)[0] + '*.mid*'))
    if not mids: print(r.stderr[-3000:])
    return mids
if __name__ == '__main__':
    print(run(sys.argv[1], sys.argv[2]))
