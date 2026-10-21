(function () {
  'use strict';
  const P = window.TOOKU_PREFS, PL = window.TookuPlayer, ST = window.TookuStage, A = window.TookuArt;
  const $ = id => document.getElementById(id);
  const IC = window.TookuIcons; IC.fill();
  ST.init($('view'));
  // 前の版の「替えない」は「この景色のまま」に引き継ぐ
  if (+P.get('interval') === 0) { const i = ST.info(); P.set('interval', 10); if (i && P.get('scene') === 'auto') P.set('scene', i.id); }

  /* ---------- はじめる ---------- */
  let started = false;
  // はじめての人：音量を先に決めてもらう（いきなり大きな音が出ないように）
  if (!P.get('volOk')) {
    $('volFirst').style.display = '';
    [['v1', 'vol'], ['v2', 'amb']].forEach(([id, key]) => {
      const el = $(id), show = () => { $(id + 'n').textContent = el.value; };
      el.value = P.get(key); show();
      el.addEventListener('input', () => { P.set(key, +el.value); show(); });
      el.addEventListener('change', () => PL.sample());   // 指を離したら、その大きさで鳴らす
    });
    $('tryVol').onclick = () => PL.sample();
  }
  function start() {
    if (started) return; started = true;
    P.set('volOk', true);
    $('start').classList.add('gone');
    PL.unlock(); PL.startAmbience(); PL.play();
    poke(); wake();
  }
  $('go').addEventListener('click', start);
  $('start').addEventListener('click', e => { if (e.target === $('start')) start(); });

  /* ---------- 帯を出す・隠す ---------- */
  let hideT = 0;
  function poke() {
    if (!started) return;
    $('bar').classList.remove('hide'); document.body.classList.add('baron'); if (P.get('info')) $('where').classList.remove('hide');
    clearTimeout(hideT); hideT = setTimeout(() => { if (!document.querySelector('.sheet.open, .pop.open')) { $('bar').classList.add('hide'); document.body.classList.remove('baron'); $('where').classList.add('hide'); } }, 4500);
  }
  ['pointerdown', 'mousemove', 'keydown'].forEach(ev => window.addEventListener(ev, poke, { passive: true }));
  $('bar').addEventListener('pointerdown', e => e.stopPropagation());

  $('bPlay').onclick = () => { PL.toggle(); wake(); };
  const guestSay = () => toast('部屋のホストに合わせています');
  $('bNext').onclick = () => { if (PL.following) return guestSay(); PL.skip(); };
  $('bPrev').onclick = () => { if (PL.following) return guestSay(); PL.prev(); };
  /* ---------- 景色・音楽のパネル（帯の上） ---------- */
  const pops = { scene: $('popScene'), music: $('popMusic'), ganba: $('popGanba') };
  function openPop(k) {
    closeSheet(true);
    for (const [n, el] of Object.entries(pops)) el.classList.toggle('open', n === k && !el.classList.contains('open'));
    if (pops.scene.classList.contains('open')) renderScenePop();
    if (pops.music.classList.contains('open')) { renderMusicPop(); $('bMusic').classList.remove('unread'); }
    if (pops.ganba.classList.contains('open')) renderGanba();
    poke();
  }
  const closePops = () => { for (const el of Object.values(pops)) el.classList.remove('open'); };
  $('bScene').onclick = () => openPop('scene');
  $('bMusic').onclick = () => openPop('music');
  $('bGanba').onclick = () => openPop('ganba');
  document.querySelectorAll('[data-popclose]').forEach(b => b.onclick = () => { closePops(); poke(); });
  Object.values(pops).forEach(el => el.addEventListener('pointerdown', e => e.stopPropagation()));
  $('view').addEventListener('pointerdown', () => { if (!AV.picking) closePops(); });
  const openSheet = () => { closePops(); $('room').classList.remove('open'); $('sheet').classList.add('open'); $('shade').classList.add('open'); };
  function closeSheet(keepPops) { $('sheet').classList.remove('open'); $('room').classList.remove('open'); $('shade').classList.remove('open'); if (!keepPops) poke(); }
  $('bSet').onclick = openSheet;
  $('bClose').onclick = () => closeSheet();
  $('shade').addEventListener('click', () => closeSheet());
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); started ? PL.toggle() : start(); }
    if (e.key === 'n' || e.key === 'ArrowRight') PL.skip();
    if (e.key === 's' && !ST.next()) guestSay();
    if (e.key === 'Escape') { closePops(); closeSheet(); }
  });

  /* ---------- 再生中の表示 ---------- */
  let curId = null;
  PL.on(st => {
    if ($('bPlay').dataset.st !== String(st.playing)) { $('bPlay').dataset.st = st.playing; $('bPlay').innerHTML = IC.svg(st.playing ? 'pause' : 'play'); }
    if (st.loading && !st.piece) { $('nT').textContent = '曲を用意しています…'; $('nS').textContent = ''; }
    else if (st.piece) { $('nT').textContent = st.piece.t; $('nS').textContent = st.piece.c + '・' + (PL.moodOf(st.piece) ? moodName(PL.moodOf(st.piece)) + '・' : '') + st.familyName + (st.loading ? '・次を用意中…' : ''); }
    if (st.piece && st.piece.id !== curId) { if (curId && NOTES[curId]) { storyHist = storyHist.filter(x => x !== curId); storyHist.unshift(curId); storyHist.length = Math.min(storyHist.length, 6); } curId = st.piece.id; storyPick = null; storyTab = 0; markCur(); $('bMusic').classList.remove('unread'); if (pops.music.classList.contains('open')) renderMusicPop(); }
    if (pops.music.classList.contains('open')) $('pmNow').textContent = st.playing ? '再生中' : '一時停止中';
    const lic = st.piece && st.piece.lic ? PL.LICENSES[st.piece.lic] : null;
    $('nL').textContent = lic ? lic.name + '・楽譜の入力：' + st.piece.by + '（Mutopia Project）' : '';
    $('nL').classList.toggle('on', !!lic);
  });
  /* ---------- 曲の小話 ---------- */
  // 長さ：くわしく（数段落を曲のあいだに順に）・短く（はじめに1つ、半ばでもう1つ）・出さない
  // 出し方：字幕（画面の上に静かに）・小鳥（右下にとまって、ふきだしで1文ずつ）
  // 見逃しても、音楽のパネルに、その曲の話がいつでも全部出ている
  if (P.get('notes') === 'off') { P.set('noteLen', 'off'); P.set('notes', 'caption'); }   // 前の版の「出さない」を引き継ぐ
  if (P.get('notes') === 'avatar') P.set('notes', 'bird');                                // アバターに言わせる → 小鳥に
  const sentences = t => (t.match(/[^。！？]+[。！？」』）]*/g) || [t]).map(x => x.trim()).filter(Boolean);
  const bird = () => P.get('notes') === 'bird';
  function noteItems(piece) {
    const n = NOTES[piece.id], len = P.get('noteLen'); if (!n || len === 'off') return [];
    return len === 'long' && n.d && n.d.length ? n.d.slice() : n.f.slice();
  }
  const readSec = t => 7 + t.length * 0.13;   // 読み終わるまでの目安（秒）
  // その曲のあいだに、いつ何を出すか決める。曲が短くて入りきらない分は、音楽のパネルで読める
  function planNotes(piece, dur) {
    const items = noteItems(piece); if (!items.length) return [];
    if (P.get('noteLen') === 'short') return items.slice(0, dur > 40 ? 2 : 1).map((t, i) => ({ t, at: i ? dur * 0.5 : 6, i, n: items.length }));
    const need = items.reduce((s, t) => s + readSec(t) + 2, 0), room = Math.max(0, dur - 10);
    const gap = need < room ? (room - need) / items.length : 0;   // 時間に余裕があれば、間をあけて散らす
    let at = 6; const plan = [];
    items.forEach((t, i) => { if (at < dur - 4) plan.push({ t, at, i, n: items.length }); at += readSec(t) + 2 + gap; });
    return plan;
  }
  let noteFor = null, notePlan = [], noteT = 0;
  function showNote(piece, it) {
    if (!pops.music.classList.contains('open')) $('bMusic').classList.add('unread');   // 音符のボタンに「話がある」の印
    if (bird()) { birdSay(piece, it); return; }
    const hd = $('note').querySelector('.hd'); hd.innerHTML = IC.svg('note');
    hd.append(piece.t + (it.n > 1 ? '　' + (it.i + 1) + '/' + it.n : ''));
    $('note').querySelector('.tx').textContent = it.t;
    $('note').classList.add('show');
    clearTimeout(noteT); noteT = setTimeout(() => $('note').classList.remove('show'), readSec(it.t) * 1000);
  }
  setInterval(() => {
    const st = PL.state(); if (!st.piece) return;
    if (noteFor !== st.piece.id) { noteFor = st.piece.id; notePlan = planNotes(st.piece, st.dur || st.piece.s); clearTimeout(noteT); $('note').classList.remove('show'); }
    if (!st.playing) return;
    while (notePlan.length && st.pos >= notePlan[0].at) { const it = notePlan.shift(); if (st.pos < it.at + 20) showNote(st.piece, it); }
  }, 1000);
  const replan = () => { const st = PL.state(); if (!st.piece) return; notePlan = planNotes(st.piece, st.dur || st.piece.s).filter(it => it.at > st.pos); $('note').classList.remove('show'); if (P.get('noteLen') === 'off' || !bird()) birdLeave(true); };
  P.on('noteLen', replan); P.on('notes', replan);

  /* ---------- 小鳥 ---------- */
  // ドット絵の小鳥（左向き）。o=ふち b=からだ w=つばさ l=おなか k=くちばし e=目 c=ほお f=あし
  const BIRD_ROWS = {
    idle: ['.....oooo.....', '....obbbbo....', '...obebbbbo...', '..kobbbbbbo...', '...ocbbbbbbo..', '...olllbwwwbo.', '...ollllwwwbbo', '....olllbbbbo.', '.....oooooooo.', '......f..f....'],
    talk: ['.....oooo.....', '....obbbbo....', '...obebbbbo...', '.kkobbbbbbo...', '..k.cbbbbbbo..', '...olllbwwwbo.', '...ollllwwwbbo', '....olllbbbbo.', '.....oooooooo.', '......f..f....'],
    blink:['.....oooo.....', '....obbbbo....', '...obobbbbo...', '..kobbbbbbo...', '...ocbbbbbbo..', '...olllbwwwbo.', '...ollllwwwbbo', '....olllbbbbo.', '.....oooooooo.', '......f..f....']
  };
  const BIRD_COL = { o: '#2e2a3a', b: '#7fb2e0', w: '#5a8cc0', l: '#f4ead8', k: '#f0a040', e: '#1e1a28', c: '#f0a0a0', f: '#e08a40' };
  const birdSvg = {};
  for (const [k, rows] of Object.entries(BIRD_ROWS)) birdSvg[k] = `<svg viewBox="0 0 14 10" shape-rendering="crispEdges">${rows.map((r, y) => [...r].map((ch, x) => BIRD_COL[ch] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${BIRD_COL[ch]}"/>` : '').join('')).join('')}</svg>`;
  const B = { q: [], busy: false, leaveT: 0, frame: 'idle', talkUntil: 0 };
  const birdFrame = f => { if (B.frame !== f) { B.frame = f; $('bird').querySelector('.body').innerHTML = birdSvg[f]; } };
  birdFrame('blink'); birdFrame('idle');
  setInterval(() => {   // まばたきと、話しているあいだのくちばし
    if (!$('bird').classList.contains('in')) return;
    const now = performance.now();
    if (now < B.talkUntil) birdFrame(Math.floor(now / 180) % 2 ? 'talk' : 'idle');
    else birdFrame(Math.random() < 0.06 ? 'blink' : 'idle');
  }, 180);
  function birdSay(piece, it) {
    clearTimeout(B.leaveT);
    const el = $('bird'); el.classList.remove('out'); el.classList.add('in');
    B.q.push(...sentences(it.t).map(t => ({ t, title: piece.t })));
    if (!B.busy) setTimeout(birdNext, 900);
  }
  function birdNext() {
    const bub = $('bird').querySelector('.bub');
    const x = B.q.shift();
    if (!x) { B.busy = false; bub.classList.remove('show'); B.leaveT = setTimeout(() => birdLeave(), 5000); return; }
    B.busy = true; bub.innerHTML = ''; const sm = document.createElement('small'); sm.textContent = '♪ ' + x.title; bub.append(sm, document.createTextNode(x.t)); bub.classList.add('show');
    const sec = 3.5 + x.t.length * 0.14; B.talkUntil = performance.now() + Math.min(sec, 2.5) * 1000;
    setTimeout(() => { bub.classList.remove('show'); setTimeout(birdNext, 700); }, sec * 1000);
  }
  function birdLeave(now) { B.q = []; const el = $('bird'); el.querySelector('.bub').classList.remove('show'); if (el.classList.contains('in')) { el.classList.add('out'); el.classList.remove('in'); setTimeout(() => el.classList.remove('out'), 1200); } if (now) B.busy = false; }

  /* ---------- 音楽のパネル ---------- */
  let storyHist = [], storyTab = 0, storyPick = null;
  function storyHtml(id, withSrc) {
    const n = NOTES[id], p = PL.PIECES.find(q => q.id === id) || {};
    const lic = p.lic ? PL.LICENSES[p.lic] : null;
    const head = `<h4>${esc(p.t || '')}<small>${esc(p.c || '')}${PL.moodOf(p) ? '・' + esc(moodName(PL.moodOf(p))) : ''}</small></h4>` + (lic ? `<div class="lic">${esc(lic.name)}・楽譜の入力：${esc(p.by)}（Mutopia Project）</div>` : '');
    if (!n) return head + '<p class="muted">この曲の話は、まだありません（資料で確かめられたことだけを書いているため）。</p>';
    const body = (n.d && n.d.length ? n.d : n.f).map(t => '<p>' + esc(t) + '</p>').join('');
    return head + body + `<div class="src">出典：${n.src.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('、')}</div>`;
  }
  function renderMusicPop() {
    const following = PL.following, st = PL.state();
    pops.music.classList.toggle('locked', following);
    $('pmNow').textContent = st.playing ? '再生中' : '一時停止中';
    const ids = []; if (storyPick) ids.push(['えらんだ曲', storyPick]); if (curId) ids.push(['いまの曲', curId]); if (storyHist[0]) ids.push(['ひとつ前の曲', storyHist[0]]); if (storyHist[1]) ids.push(['ふたつ前', storyHist[1]]);
    storyTab = Math.min(storyTab, Math.max(0, ids.length - 1));
    $('pmStory').innerHTML = (ids.length > 1 ? `<div class="tabs">${ids.map(([l], i) => `<button data-st="${i}" class="${i === storyTab ? 'on' : ''}">${l}</button>`).join('')}</div>` : '') + (ids.length ? storyHtml(ids[storyTab][1]) : '<p class="muted">曲を用意しています…</p>');
    renderMoods(); renderSongs();
  }
  $('pmStory').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) { storyTab = +b.dataset.st; renderMusicPop(); } });

  /* ---------- 景色のパネル ---------- */
  function renderScenePop() {
    const following = ST.following, info = ST.info();
    pops.scene.classList.toggle('locked', following);
    const auto = P.get('scene') === 'auto';
    $('psNow').textContent = info ? info.name + '・' + info.tod + '・' + info.weather : '';
    $('psMode').querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.mode === 'auto') === auto));
    $('psInt').style.display = auto ? '' : 'none';
    const list = $('psList');
    if (!list.children.length) {
      list.innerHTML = A.SCENES.map(d => `<button data-scene="${d.id}"><span>${d.name}</span></button>`).join('');
      // 小さな絵は1枚ずつ、間をあけて描く（開いた瞬間に固まらないように）
      let i = 0; const step = () => { const b = list.children[i++]; if (!b) return; const cv = ST.thumb(b.dataset.scene, 150, 96); if (cv) b.prepend(cv); setTimeout(step, 30); }; setTimeout(step, 60);
    }
    list.querySelectorAll('[data-scene]').forEach(b => b.classList.toggle('on', info && b.dataset.scene === info.id));
    updLeft();
  }
  function updLeft() { const r = ST.remaining(); $('psLeft').textContent = r === null ? '' : r < 60 ? 'まもなく次の景色へ' : '次の景色まで あと' + Math.ceil(r / 60) + '分'; }
  setInterval(() => { if (pops.scene.classList.contains('open')) updLeft(); }, 5000);
  $('psMode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b || ST.following) return;
    if (b.dataset.mode === 'auto') { if (!+P.get('interval')) P.set('interval', 10); P.set('scene', 'auto'); toast(P.get('interval') + '分ごとに景色が替わります'); }
    else { const i = ST.info(); if (i) P.set('scene', i.id); toast('この景色のままにします'); }
    renderScenePop();
  });
  $('psList').addEventListener('click', e => {
    const b = e.target.closest('[data-scene]'); if (!b) return;
    if (ST.following) return guestSay();
    if (P.get('scene') === 'auto') ST.pick(b.dataset.scene); else P.set('scene', b.dataset.scene);
    setTimeout(renderScenePop, 50);
  });
  P.on('interval', () => setTimeout(updLeft, 30));
  ST.on(() => { if (pops.scene.classList.contains('open')) renderScenePop(); });

  setInterval(() => { const st = PL.state(); $('prog').firstElementChild.style.width = st.dur ? Math.min(100, st.pos / st.dur * 100) + '%' : '0'; }, 500);
  ST.on(i => { if (!i) return; $('where').innerHTML = i.name + '<small>' + i.tod + '・' + i.weather + '</small>'; });

  /* ---------- 設定の部品 ---------- */
  document.querySelectorAll('[data-pref]').forEach(el => {
    const key = el.dataset.pref;
    el.innerHTML = el.dataset.opts.split(',').map(o => { const [v, l] = o.split(':'); return `<button data-v="${v}">${l}</button>`; }).join('');
    const sync = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(P.get(key)) === b.dataset.v));
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; P.set(key, /^\d+$/.test(v) ? +v : v); sync(); });
    sync();
  });
  document.querySelectorAll('[data-switch]').forEach(el => {
    const key = el.dataset.switch, sync = () => el.classList.toggle('on', !!P.get(key));
    el.onclick = () => { P.set(key, !P.get(key)); sync(); }; sync();
  });
  document.querySelectorAll('[data-range]').forEach(el => { const key = el.dataset.range; el.value = P.get(key); el.oninput = () => P.set(key, +el.value); P.on(key, v => { if (+el.value !== v) el.value = v; }); });

  /* ---------- 曲の一覧 ---------- */
  function renderSongs() {
    const off = new Set(P.get('off') || []), box = $('songs'), groups = {};
    // カタカナ・ひらがな、全角・半角、大文字・小文字の違いは気にせずさがす
    const norm = t => String(t).normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s・ー]/g, '');
    const q = norm($('songQ').value || '');
    for (const p of PL.PIECES) if (!q || norm(p.t + p.c).includes(q)) (groups[p.g] = groups[p.g] || []).push(p);
    if (q && !Object.keys(groups).length) { box.innerHTML = '<p class="muted">見つかりませんでした</p>'; return; }
    const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    box.innerHTML = Object.entries(groups).map(([g, list]) => `
      <div class="grp"><span>${PL.GROUP_NAME[g] || g}（${list.length}曲）</span><span><button data-all="${g}" data-on="1">全部オン</button> ・ <button data-all="${g}" data-on="0">全部オフ</button></span></div>
      ${list.map(p => `<label class="song${p.id === curId ? ' cur' : ''}${PL.allowed(p) ? '' : ' muted'}" data-id="${p.id}"><input type="checkbox" ${off.has(p.id) ? '' : 'checked'}><span class="nm">${p.t}${moodTag(p)}${p.lic ? `<button class="lic" data-lic="${p.id}">${PL.LICENSES[p.lic].name}</button>` : ''}<small>${p.c}・${fmt(p.s)}</small></span>${NOTES[p.id] ? `<button class="info" data-info="${p.id}" aria-label="この曲の話を読む">話</button>` : ''}<button class="play" data-play="${p.id}">流す</button></label>${p.lic ? licInfo(p) : ''}`).join('')}`).join('');
  }
  const NOTES = window.CHILL_NOTES || {};
  // 気分：明るさ×勢いの6つ。色は 明るい=暖色、暗い=寒色、勢いが強いほど濃く
  const MOODS = window.CHILL_MOODS || [];
  const MOOD_COLOR = { yasuragu: '#f3e3b8', hogaraka: '#ffd07a', hazumu: '#ffa860', shinmiri: '#c4d2ec', monoomoi: '#a6b6e0', hageshii: '#d39ad0' };
  const moodName = id => (MOODS.find(m => m.id === id) || {}).name || '';
  const moodTag = p => { const m = PL.moodOf(p); return m ? `<span class="mood" style="background:${MOOD_COLOR[m]}">${moodName(m)}</span>` : ''; };
  function renderMoods() {
    const sel = new Set(P.get('moods') || []), counts = {};
    for (const p of PL.PIECES) { const m = PL.moodOf(p); counts[m] = (counts[m] || 0) + 1; }
    $('moods').innerHTML = MOODS.map(m => `<button data-mood="${m.id}" class="${sel.has(m.id) ? 'on' : ''}" style="${sel.has(m.id) ? 'background:' + MOOD_COLOR[m.id] : ''}" title="${m.help}">${m.name}<small>${counts[m.id] || 0}</small></button>`).join('');
  }
  $('moods').addEventListener('click', e => {
    const b = e.target.closest('[data-mood]'); if (!b) return;
    const sel = new Set(P.get('moods') || []); sel.has(b.dataset.mood) ? sel.delete(b.dataset.mood) : sel.add(b.dataset.mood);
    P.set('moods', [...sel]); renderMoods(); renderSongs();
    toast(sel.size ? [...sel].map(moodName).join('・') + ' の曲だけ流します' : '全部の気分の曲を流します');
  });
  const host = u => { try { return decodeURIComponent(new URL(u).hostname.replace(/^www\./, '')); } catch (e) { return '出典'; } };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function licInfo(p) {
    const L = PL.LICENSES[p.lic];
    return `<div class="licinfo" id="li-${p.id}">楽譜の入力：${esc(p.by)}（<a href="${p.src}" target="_blank" rel="noopener">Mutopia Project の楽譜</a>）<br>
      ライセンス：<a href="${L.url}" target="_blank" rel="noopener">${L.name}</a><br>
      変更：楽譜を MIDI にして繰り返しを展開し、音符の並びに変換${p.note ? '。' + esc(p.note) : ''}<br>
      この曲の音符データ（music-cc.js）も同じライセンスで公開しています</div>`;
  }
  $('songQ').addEventListener('input', renderSongs);
  function markCur() { document.querySelectorAll('.song').forEach(el => el.classList.toggle('cur', el.dataset.id === curId)); }
  $('songs').addEventListener('click', e => {
    const pl = e.target.closest('[data-play]'); if (pl) { e.preventDefault(); if (PL.following) return guestSay(); if (!PL.allowed(PL.PIECES.find(p => p.id === pl.dataset.play))) { toast('「表示が必要な曲も流す」がオフになっています'); return; } PL.playPiece(pl.dataset.play); return; }
    const ib = e.target.closest('[data-info]'); if (ib) { e.preventDefault(); storyPick = ib.dataset.info; storyTab = 0; renderMusicPop(); pops.music.scrollTop = 0; return; }
    const lb = e.target.closest('[data-lic]'); if (lb) { e.preventDefault(); const box = $('li-' + lb.dataset.lic); box.classList.toggle('open'); lb.classList.toggle('on', box.classList.contains('open')); return; }
    const all = e.target.closest('[data-all]');
    if (all) { const g = all.dataset.all, on = all.dataset.on === '1', off = new Set(P.get('off') || []); PL.PIECES.filter(p => p.g === g).forEach(p => on ? off.delete(p.id) : off.add(p.id)); P.set('off', [...off]); renderSongs(); }
  });
  $('songs').addEventListener('change', e => {
    const lab = e.target.closest('.song'); if (!lab) return; const off = new Set(P.get('off') || []);
    e.target.checked ? off.delete(lab.dataset.id) : off.add(lab.dataset.id);
    if (!PL.PIECES.some(p => !off.has(p.id) && PL.allowed(p))) { off.delete(lab.dataset.id); e.target.checked = true; toast('1曲は残してください'); }
    P.set('off', [...off]);
  });

  /* ---------- 画面をつけたままにする ---------- */
  // ふつうは Screen Wake Lock を使う。iPhone・iPad のホーム画面アプリでは iPadOS 18.4 より前だと効かないので、
  // 見えない小さな無音の動画をくり返し流して、画面が消えないようにする（ボタンを押したときにだけ始められる）
  let lock = null;
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const vid = $('keepAwake');
  async function wake() {
    const want = P.get('wake') && started && !document.hidden;
    if (!want) { if (lock) { try { lock.release(); } catch (e) {} lock = null; } if (!vid.paused) vid.pause(); return; }
    let ok = false;
    try { if ('wakeLock' in navigator) { if (!lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; if (P.get('wake') && !document.hidden) setTimeout(wake, 500); }); } ok = true; } } catch (e) { ok = false; }
    if (!ok || isApple) { try { const r = vid.play(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  }
  P.on('wake', v => { wake(); if (v) toast('画面をつけたままにします'); });
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pointerdown', () => { if (P.get('wake') && started && (vid.paused || !lock)) wake(); }, { passive: true });
  $('bFull').onclick = () => { const d = document; try { if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else { const el = d.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } } catch (e) { toast('このブラウザでは全画面にできません。ホーム画面に追加すると全画面で開けます'); } };
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600); }
  P.on('cc', v => {
    if (!v && !PL.enabledIds().length) { P.set('cc', true); document.querySelector('[data-switch=cc]').classList.add('on'); toast('ほかに流せる曲がないので、オフにできません'); return; }
    toast(v ? '表示が必要な曲（CC）も流します' : '表示が必要な曲（CC）は流しません'); renderSongs();
  });
  P.on('mode', v => toast(v === 'bg' ? 'バックグラウンド再生にしました（曲の用意に少し時間がかかります）' : 'ふつうの再生にしました'));

  /* ---------- がんばる ---------- */
  // 見張り・警告・自動停止はしない。押した時刻を覚えておくだけ（ganbaru.js）
  const G = window.TookuGanbaru;
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const md = ms => { const d = new Date(ms); return (d.getMonth() + 1) + '/' + d.getDate(); };
  const hm = ms => { const d = new Date(ms); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const level = ms => ms <= 0 ? 0 : ms < 3600e3 ? 1 : ms < 7200e3 ? 2 : ms < 14400e3 ? 3 : 4;
  let gOpen = -1;          // 直す欄を開いている記録
  function tickGanba() {
    const on = G.running(), el = G.elapsed();
    $('bGanba').classList.toggle('on', on);
    $('nG').textContent = on ? 'がんばり中 ' + G.fmt(el, true) : '';
    if (!pops.ganba.classList.contains('open')) return;
    $('pgNow').textContent = on ? 'がんばり中 ' + G.fmt(el, true) : '';
    $('gToday').textContent = G.fmt(G.today());
  }
  setInterval(tickGanba, 1000);
  function renderGanba() {
    const on = G.running();
    $('gGo').textContent = on ? 'おわる' : 'がんばる'; $('gGo').classList.toggle('stop', on);
    const days = G.days(), tk = G.dayKey(Date.now()), first = G.first();
    $('gToday').textContent = G.fmt(days[tk] || 0);
    $('gAddHelp').textContent = on ? 'いまの回の始まりを、その分だけ早めます（実はさっきから始めていたとき）' : '今まで、その分がんばっていたことにして記録します';
    $('gAddBtns').innerHTML = G.ADDS.map(m => `<button data-add="${m}">+${G.fmt(m * 60e3)}</button>`).join('');
    // マス目：はじめて使った日から今日まで（最初から一年分の空のマスは見せない。連続日数も出さない）
    const grid = $('gGrid');
    if (!first || G.dayKey(first) === tk) { grid.style.display = 'none'; $('gSub').textContent = ''; }
    else {
      grid.style.display = '';
      const DAY = 864e5, base = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const startDay = new Date(first - G.DAY_START * 3600e3), end = base(new Date(Date.now() - G.DAY_START * 3600e3));
      // はじめて使った週の日曜から。一年より長くなったら直近の53週だけ
      const t0 = Math.max(base(startDay) - startDay.getDay() * DAY, end - new Date(end).getDay() * DAY - 52 * 7 * DAY);
      const cells = []; let tot = 0;
      for (let t = t0; t <= end + 3600e3; t += DAY) {
        const d = new Date(t + 3600e3), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const v = days[k] || 0, before = t < base(startDay);
        cells.push(`<i class="${before ? 'none' : 'l' + level(v)}${k === tk ? ' today' : ''}" data-k="${k}" data-v="${v}" title="${d.getMonth() + 1}/${d.getDate()}（${WD[d.getDay()]}） ${G.fmt(v)}"></i>`);
      }
      for (const v of Object.values(days)) tot += v;
      grid.innerHTML = `<div class="cols">${cells.join('')}</div><div class="pick" id="gPick">マスを押すと、その日の時間が出ます</div>`;
      grid.scrollLeft = grid.scrollWidth;
      $('gSub').textContent = 'これまで ' + G.fmt(tot);
    }
    // 最近の記録（直すのは任意）
    const rec = G.recent(8);
    $('gList').innerHTML = rec.length ? '<h5>最近の記録</h5>' + rec.map(r => {
      const d = new Date(r.s);
      const fixed = (r.added ? '<small>あとから足した</small>' : '') + (r.adj ? `<small>直した ${r.adj > 0 ? '+' : '−'}${G.fmt(Math.abs(r.adj))}</small>` : '');
      return `<div class="grec"><span class="when">${md(r.s)}（${WD[d.getDay()]}） ${hm(r.s)}〜${hm(r.e)}</span><span class="len">${G.fmt(r.len)}${fixed}</span><button class="fix" data-fix="${r.i}">直す</button></div>
        <div class="gfix${gOpen === r.i ? ' open' : ''}" data-for="${r.i}">
          <div class="seg">${G.PRESETS.map(([n, m]) => `<button data-adj="${m}" data-i="${r.i}">${n}<small>−${G.fmt(-m * 60e3)}</small></button>`).join('')}</div>
          <div class="min">長さを分で直す <input class="txt" type="number" inputmode="numeric" min="0" step="1" data-min="${r.i}" value="${Math.round(r.len / 60e3)}"> 分${r.adj ? ` <button class="btn2" data-reset="${r.i}">元に戻す</button>` : ''}</div>
        </div>`;
    }).join('') : '';
    tickGanba();
  }
  $('gGo').onclick = () => {
    if (G.running()) { const i = G.stop(); const r = G.recent(1)[0]; toast(r && r.i === i ? 'おつかれさま。今回は ' + G.fmt(r.len) : 'おつかれさま'); }
    else { G.start(); toast('がんばりはじめました。押したまま休んでも大丈夫です'); }
    renderGanba();
  };
  const gAdd = min => { const on = G.running(); G.add(min * 60e3); toast(on ? 'いまの回の始まりを ' + G.fmt(min * 60e3) + ' 早めました' : G.fmt(min * 60e3) + ' を足しました'); $('gAdd').classList.remove('open'); $('gAddMin').value = ''; renderGanba(); };
  $('gAddT').onclick = () => $('gAdd').classList.toggle('open');
  $('gAddBtns').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) gAdd(+b.dataset.add); });
  $('gAddGo').onclick = () => { const v = Math.round(+$('gAddMin').value); if (v > 0) gAdd(Math.min(v, 1440)); };
  $('gAddMin').addEventListener('keydown', e => { if (e.key === 'Enter') $('gAddGo').click(); });
  $('gGrid').addEventListener('click', e => { const c = e.target.closest('i[data-k]'); if (!c || c.classList.contains('none')) return; const [y, m, d] = c.dataset.k.split('-').map(Number); $('gPick').textContent = `${m}/${d}（${WD[new Date(y, m - 1, d).getDay()]}）　${G.fmt(+c.dataset.v)}`; });
  $('gList').addEventListener('click', e => {
    const f = e.target.closest('[data-fix]'); if (f) { const i = +f.dataset.fix; gOpen = gOpen === i ? -1 : i; renderGanba(); return; }
    const a = e.target.closest('[data-adj]'); if (a) { G.adjust(+a.dataset.i, +a.dataset.adj * 60e3); renderGanba(); return; }
    const r = e.target.closest('[data-reset]'); if (r) { G.reset(+r.dataset.reset); renderGanba(); }
  });
  $('gList').addEventListener('change', e => { const m = e.target.closest('[data-min]'); if (m && m.value !== '' && isFinite(+m.value)) { G.setLen(+m.dataset.min, Math.max(0, Math.round(+m.value)) * 60e3); renderGanba(); } });
  G.on(() => { tickGanba(); if (pops.ganba.classList.contains('open')) renderGanba(); });
  tickGanba();

  /* ---------- みんなの窓 ---------- */
  const AV = window.TookuAvatar, RM = window.TookuRoom;
  const av = () => AV.mine();
  const setAv = patch => P.set('av', Object.assign(av(), patch));
  const openRoom = () => { closePops(); $('sheet').classList.remove('open'); $('room').classList.add('open'); $('shade').classList.add('open'); $('bRoom').classList.remove('unread'); syncAv(); renderRoom(RM.state()); };
  $('bRoom').onclick = openRoom;
  $('rClose').onclick = closeSheet;
  // 見た目の選択肢
  $('avHair').innerHTML = AV.HAIR_NAME.map((n, i) => `<button data-v="${i}">${n}</button>`).join('');
  $('avSize').innerHTML = AV.SIZE_NAME.map((n, i) => `<button data-v="${i}">${n}</button>`).join('');
  $('avFace').innerHTML = AV.FACE_NAME.map((n, i) => `<button data-v="${i}">${n}</button>`).join('');
  $('avSize').onclick = e => { const b = e.target.closest('button'); if (b) { setAv({ size: +b.dataset.v, on: true }); syncAv(); } };
  $('avFace').onclick = e => { const b = e.target.closest('button'); if (b) { setAv({ face: +b.dataset.v, on: true }); syncAv(); } };
  $('avAct').innerHTML = Object.entries(AV.ACTS).map(([k, n]) => `<button data-v="${k}">${n}</button>`).join('');
  [['avHc', 'hair', 'hc'], ['avSkin', 'skin', 'skin'], ['avCloth', 'cloth', 'cloth']].forEach(([id, pal, key]) => {
    $(id).innerHTML = AV.PAL[pal].map((c, i) => `<button data-v="${i}" style="background:${c}" aria-label="色${i + 1}"></button>`).join('');
    $(id).onclick = e => { const b = e.target.closest('button'); if (b) { setAv({ [key]: +b.dataset.v, on: true }); syncAv(); } };
  });
  $('avHair').onclick = e => { const b = e.target.closest('button'); if (b) { setAv({ hair: +b.dataset.v, on: true }); syncAv(); } };
  $('avAct').onclick = e => { const b = e.target.closest('button'); if (b) { setAv({ act: b.dataset.v, on: true }); syncAv(); } };
  $('avOn').onclick = () => { const on = !av().on; setAv({ on }); syncAv(); if (on) hintDrag(); };
  function hintDrag() { if (P.get('dragHint')) return; P.set('dragHint', true); toast('自分のアバターは、指（マウス）でつかんで動かせます'); }
  $('avName').oninput = () => setAv({ name: $('avName').value });
  $('avPlace').onclick = () => {
    setAv({ on: true }); closeSheet();
    toast('アバターを置きたい場所をタップしてください');
    AV.pick((x, y) => { setAv({ x, y }); toast('そこへ歩いていきます。あとは指でつかんでも動かせます'); });
  };
  function syncAv() {
    const a = av();
    $('avOn').classList.toggle('on', a.on);
    if (document.activeElement !== $('avName')) $('avName').value = a.name;
    $('avHair').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === a.hair));
    $('avSize').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === a.size));
    $('avFace').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === a.face));
    $('avAct').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === a.act));
    $('avHc').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === a.hc));
    $('avSkin').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === a.skin));
    $('avCloth').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === a.cloth));
  }
  setInterval(() => { if ($('room').classList.contains('open')) AV.preview($('avPrev'), av(), performance.now() / 1000); }, 150);
  // 部屋
  const busy = async (f) => { try { await f(); } catch (e) { toast(e.message || String(e)); } };
  $('rHost').onclick = () => busy(() => RM.host());
  $('rJoin').onclick = () => busy(() => RM.join($('rCode').value));
  $('rCode').onkeydown = e => { if (e.key === 'Enter') $('rJoin').click(); };
  $('rLeave').onclick = () => { RM.leave(); toast('部屋を出ました'); };
  // チャット欄
  const chatSend = () => { if (RM.chat($('chatIn').value)) $('chatIn').value = ''; };
  $('chatForm').addEventListener('submit', e => { e.preventDefault(); chatSend(); });
  $('chatIn').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();                                   // 変換の確定の Enter では送らない
    if (!e.isComposing && e.keyCode !== 229) chatSend();
  });
  const setChatMin = v => { P.set('chatMin', v); $('chat').classList.toggle('min', v); if (!v) $('chatOpen').classList.remove('unread'); };
  $('chatMin').onclick = () => setChatMin(true);
  $('chatOpen').onclick = () => { setChatMin(false); setTimeout(() => $('chatIn').focus(), 50); };
  ['pointerdown', 'pointerup', 'click'].forEach(ev => $('chat').addEventListener(ev, e => e.stopPropagation()));
  $('chat').classList.toggle('min', !!P.get('chatMin'));
  let chatLen = -1;
  function renderChat(st) {
    $('chat').classList.toggle('hide', !st.role);
    if (!st.role) { chatLen = -1; return; }
    if (st.log.length === chatLen) return;
    chatLen = st.log.length; const box = $('chatLines'); box.textContent = '';
    for (const m of st.log.slice(-40)) {
      const d = document.createElement('div'); d.dataset.at = m.at;
      if (m.sys) { d.className = 'sys'; d.textContent = m.text; }
      else { d.className = m.me ? 'me' : ''; const w = document.createElement('span'); w.className = 'who'; w.textContent = m.me ? (m.name || 'あなた') : m.name; d.append(w, document.createTextNode(m.text)); }
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight; ageChat();
  }
  function ageChat() { const now = Date.now(); document.querySelectorAll('#chatLines div').forEach(d => d.classList.toggle('old', now - +d.dataset.at > 30000 && document.activeElement !== $('chatIn'))); }
  setInterval(ageChat, 5000);
  $('chatIn').addEventListener('focus', ageChat); $('chatIn').addEventListener('blur', ageChat);
  document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-ex]').forEach(x => x.classList.toggle('on', x === b));
    $('exEasy').style.display = b.dataset.ex === 'easy' ? '' : 'none'; $('exPro').style.display = b.dataset.ex === 'pro' ? '' : 'none';
  });
  let logLen = -1;
  function renderRoom(st) {
    $('roomOut').style.display = st.role ? 'none' : ''; $('roomIn').style.display = st.role ? '' : 'none';
    $('rBusy').textContent = st.busy; $('rHost').disabled = $('rJoin').disabled = !!st.busy;
    if (!st.role && RM.lastCode && !$('rCode').value) $('rCode').value = RM.lastCode;
    if (!st.role) { logLen = -1; return; }
    $('rCodeShow').textContent = st.code;
    const names = st.names.map(([, a]) => a.name || 'ななし');
    $('rInfo').textContent = (st.role === 'host' ? 'あなたがホストです。この番号を友だちに伝えてください' : 'ホストの景色に合わせています') + '・' + st.count + '人' + (names.length ? '（' + names.join('、') + '）' : '');
    if (st.log.length !== logLen) {
      logLen = st.log.length; const box = $('chatLog'); box.textContent = '';
      for (const m of st.log) {
        const d = document.createElement('div');
        if (m.sys) { d.className = 'sys'; d.textContent = m.text; }
        else { d.className = m.me ? 'me' : ''; const w = document.createElement('span'); w.className = 'who'; w.textContent = m.me ? (m.name || 'あなた') : m.name; d.append(w, document.createTextNode(m.text)); }
        box.appendChild(d);
      }
      box.scrollTop = box.scrollHeight;
    }
  }
  RM.on(renderRoom); RM.on(renderChat);
  RM.on(st => { document.body.classList.toggle('guest', st.role === 'guest'); if (pops.scene.classList.contains('open')) renderScenePop(); if (pops.music.classList.contains('open')) renderMusicPop(); });
  window.addEventListener('tooku-toast', e => toast(e.detail));
  window.addEventListener('tooku-chat', e => { if (!e.detail.sys && P.get('chatMin')) $('chatOpen').classList.add('unread'); });
})();
