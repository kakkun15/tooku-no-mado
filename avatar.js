/* とおくの窓：アバター（作りたい人だけ）。景色の上に小さなドット絵の人を置き、ゆっくり動かす。
   位置は画面の割合（0〜1）で持つので、画面の大きさが違う人どうしでも同じ場所に見える。
   自分のアバターは指（マウス）でつかんで動かせる。ほかの人のアバターは、新しい場所まで歩いていく。 */
(function () {
  'use strict';
  const P = window.TOOKU_PREFS, ST = window.TookuStage;

  const PAL = {
    hair: ['#2b2420', '#6b4a2e', '#c9a46a', '#d8d2c8', '#3a4a7a', '#b8566a'],
    skin: ['#f2d0b0', '#d9a77e', '#a9744f', '#6e4a33'],
    cloth: ['#d9644a', '#4f7fb8', '#5f9a5c', '#e0b84a', '#8b6bb5', '#e8e4da', '#3b3b44']
  };
  const HAIR_NAME = ['みじかい', 'ながい', 'おだんご', 'ぼうし'];
  const SIZE_NAME = ['ちいさい', 'ふつう', 'おおきい'];
  const FACE_NAME = ['右むき', '左むき'];
  const ACTS = { pc: 'PC作業', game: 'ゲーム', read: '読書', draw: '絵を描く', tea: 'お茶', rest: 'ひと休み', phone: 'スマホ', wave: '手をふる', stroll: '散歩', stand: 'ぼーっと立つ' };
  const SIT_ACTS = new Set(['pc', 'game', 'read', 'draw', 'tea', 'rest']);
  const DEF = { on: false, name: '', hair: 0, hc: 0, skin: 0, cloth: 1, size: 1, face: 0, act: 'pc', x: 0.5, y: 0.82 };

  // 受け取った値を、決まった範囲に収める（ほかの人から届いた値もここを通す）
  const int = (v, n, d) => { v = v | 0; return v < 0 || v >= n ? (d || 0) : v; };
  const num = v => { v = +v; return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5; };
  function sanitize(a) {
    a = a && typeof a === 'object' ? a : {};
    return {
      on: !!a.on, name: String(a.name || '').replace(/[\u0000-\u001f]/g, '').slice(0, 12),
      hair: int(a.hair, HAIR_NAME.length), hc: int(a.hc, PAL.hair.length), skin: int(a.skin, PAL.skin.length), cloth: int(a.cloth, PAL.cloth.length),
      size: a.size === undefined ? 1 : int(a.size, 3, 1), face: int(a.face, 2),
      act: ACTS[a.act] ? a.act : 'pc', x: num(a.x), y: num(a.y),
      gb: Number.isFinite(+a.gb) && +a.gb > 0 ? Math.min(Math.floor(+a.gb), 30 * 86400) : 0     // がんばり中なら、その経過秒
    };
  }
  const mine = () => sanitize(Object.assign({}, DEF, P.get('av') || {}));
  const setMine = patch => P.set('av', Object.assign(mine(), patch));
  // ほかの人に送る形：がんばり中なら経過秒をつける（設定には保存しない）
  const G = () => window.TookuGanbaru;
  const mineNet = () => Object.assign(mine(), { gb: G() && G().running() ? Math.floor(G().elapsed() / 1000) + 1 : 0 });     // 押した直後も 0 にならないよう +1

  /* ---------- 絵 ---------- */
  // h:髪 s:肌 e:目 c:服 d:服の影 p:ズボン b:靴
  const STAND = [
    '..hhh..',
    '.hhhhh.',
    'hhssshh',
    'hsesesh',
    '.sssss.',
    '..ccc..',
    '.ccccc.',
    's.cdc.s',      // 7：手の行
    '..ccc..',
    '..p.p..',
    '..p.p..',
    '.bb.bb.'
  ];
  const SIT = [          // 右を向いて地面に座る
    '..hhh....',
    '.hhhhh...',
    '.hhsss...',
    '.hhses...',
    '..sss....',
    '..ccc....',
    '.cccc....',
    '.cdcppp..',
    '.pppppbb.'
  ];
  // 体格と歩く足で、行を足したり引いたりする
  function bodyRows(size, sit, step, act) {
    const r = (sit ? SIT : STAND).slice();
    if (sit) {
      if (size === 0) r.splice(6, 1); else if (size === 2) r.splice(6, 0, r[6]);
    } else {
      if (act === 'wave') r[7] = 's.cdc..';
      if (act === 'phone') r[7] = '..cdc..';
      if (step) { r[10] = '.p...p.'; r[11] = 'bb...bb'; }
      if (size === 0) { r.splice(10, 1); r.splice(8, 1); }
      else if (size === 2) { r.splice(10, 0, '..p.p..'); r.splice(8, 0, r[8]); }
    }
    return r;
  }
  function hairExtra(style, sit) {          // 髪型ごとの足し [x, y, 文字]（y は頭の上からの行）
    if (style === 1) return sit ? [[1, 4, 'h'], [1, 5, 'h'], [0, 3, 'h']] : [[0, 4, 'h'], [6, 4, 'h'], [0, 5, 'h'], [6, 5, 'h']];
    if (style === 2) return sit ? [[1, -1, 'h'], [2, -1, 'h'], [1, -2, 'h']] : [[2, -1, 'h'], [3, -1, 'h'], [4, -1, 'h'], [3, -2, 'h']];
    if (style === 3) return sit ? [[1, 0, 'k'], [2, 0, 'k'], [3, 0, 'k'], [4, 0, 'k'], [1, 1, 'k'], [2, 1, 'k'], [3, 1, 'k'], [4, 1, 'k'], [5, 1, 'k'], [6, 1, 'k']]
      : [[2, 0, 'k'], [3, 0, 'k'], [4, 0, 'k'], [1, 1, 'k'], [2, 1, 'k'], [3, 1, 'k'], [4, 1, 'k'], [5, 1, 'k'], [6, 1, 'k'], [7, 1, 'k']];
    return [];
  }
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

  // a：アバター、x,y：足元（ドット）、t：時間、col：色を景色に合わせる関数、emi：光る色
  // o.walk：歩いている、o.face：向き（0=右, 1=左。なければ a.face）
  function drawOne(T, a, x, y, t, col, emi, seed, o) {
    o = o || {};
    const walking = !!o.walk, sit = !walking && SIT_ACTS.has(a.act);
    const ph = t + seed * 0.37, step = walking && Math.floor(ph * 6) % 2 === 1;
    const rows = bodyRows(a.size, sit, step, walking ? '' : a.act), w = rows[0].length, h = rows.length;
    const flip = (o.face === undefined ? a.face : o.face) === 1;
    const ox = Math.round(x - w / 2), by = Math.round(y) - (step ? 1 : 0), oy = by - h;
    const X = i => flip ? ox + w - 1 - i : ox + i;
    const px = (i, yy, c) => T.P(X(i), yy, c);
    const map = {
      h: col(PAL.hair[a.hc]), s: col(PAL.skin[a.skin]), e: col('#2a2028'), c: col(PAL.cloth[a.cloth]),
      d: col(shade(PAL.cloth[a.cloth], 0.72)), p: col(shade(PAL.cloth[a.cloth], 0.45)), b: col('#2e2a2a'), k: col(shade(PAL.cloth[a.cloth], 0.9))
    };
    const act = walking ? 'walk' : a.act;
    if ((ph % 4.2) < 0.15 || act === 'rest') map.e = map.s;            // まばたき・ひと休みは目を閉じる
    T.g.globalAlpha = 0.28; T.R(ox, Math.round(y) - 1, w + 1, 2, '#000'); T.g.globalAlpha = 1;   // 影
    const headDrop = act === 'rest' ? 1 : 0;
    for (let j = 0; j < h; j++) {
      const r = rows[j], dy = j < 5 ? headDrop : 0;
      for (let i = 0; i < w; i++) { const ch = r[i]; if (ch === '.' || !map[ch]) continue; px(i, oy + j + dy, map[ch]); }
    }
    for (const [i, j, ch] of hairExtra(a.hair, sit)) px(i, oy + j + (j < 5 ? headDrop : 0), map[ch]);

    /* すること（座っているものは足元 by から数える） */
    if (act === 'pc') {
      for (let k = 3; k <= 6; k++) px(8, by - k, col('#3a3c44'));          // 画面のふち
      for (let k = 3; k <= 5; k++) px(7, by - k, emi('#a8dcff'));          // 光る画面
      for (let i = 5; i <= 8; i++) px(i, by - 2, col('#5a5e68'));          // キーボード
      px(5 + Math.floor(ph / 0.38) % 2, by - 3, map.s);                    // 手がゆっくり動く
      if (Math.floor(ph / 1.7) % 3 === 0) px(7, by - 5 + Math.floor(ph * 2) % 3, emi('#ffffff'));
    } else if (act === 'game') {
      for (let i = 5; i <= 7; i++) { px(i, by - 4, col('#4a4d58')); px(i, by - 3, col('#4a4d58')); }
      const cs = ['#ff8a7a', '#8affc0', '#ffe27a', '#9fb6ff'];
      px(6, by - 4, emi(cs[Math.floor(ph / 0.9) % cs.length]));
      px(4, by - 3, map.s); px(8, by - 3, map.s);
      if (Math.floor(ph / 2.6) % 4 === 0) px(4, by - 4, map.s);            // ときどき指が跳ねる
    } else if (act === 'read') {
      for (let i = 5; i <= 7; i++) for (let k = 3; k <= 5; k++) px(i, by - k, col('#f2ead8'));
      for (let k = 3; k <= 5; k++) px(6, by - k, col('#b8a888'));
      if ((ph % 6) < 0.5) { px(6, by - 6, col('#f2ead8')); px(7, by - 6, col('#f2ead8')); }   // ページをめくる
      px(4, by - 3, map.s);
    } else if (act === 'draw') {
      for (let i = 6; i <= 8; i++) for (let k = 3; k <= 7; k++) px(i, by - k, col('#f2ead8'));
      for (let k = 3; k <= 7; k++) px(9, by - k, col('#8a6a4a'));
      const dots = [[7, 6, '#d9644a'], [6, 5, '#5f9a5c'], [8, 5, '#4f7fb8'], [7, 4, '#e0b84a'], [6, 4, '#8b6bb5'], [8, 6, '#5f9a5c']];
      const n = Math.floor((ph * 0.35) % (dots.length + 2));            // 少しずつ描き足して、また新しい紙に
      for (let q = 0; q < Math.min(n, dots.length); q++) px(dots[q][0], by - dots[q][1], col(dots[q][2]));
      px(5, by - 4 - Math.floor(ph * 2.5) % 2, map.s);
    } else if (act === 'tea') {
      for (let i = 5; i <= 6; i++) { px(i, by - 4, col('#e8e4da')); px(i, by - 3, col('#e8e4da')); }
      px(7, by - 4, col('#e8e4da')); px(4, by - 3, map.s);
      const sip = (ph % 7) < 1.2;                                          // ときどき口もとへ
      if (sip) { px(4, by - 6, map.s); px(5, by - 6, col('#e8e4da')); }
      for (let k = 0; k < 2; k++) {                                        // 湯気
        const q = (ph * 0.5 + k * 0.5) % 1;
        T.g.globalAlpha = 0.55 * (1 - q); px(5 + Math.round(Math.sin((q + k) * 6)), by - 5 - Math.round(q * 4), emi('#ffffff')); T.g.globalAlpha = 1;
      }
    } else if (act === 'rest') {
      for (let k = 0; k < 2; k++) {                                        // Z がゆっくり上る
        const q = ((ph * 0.35 + k * 0.5) % 1), zx = 5 + Math.round(q * 3), zy = oy - 1 - Math.round(q * 6);
        T.g.globalAlpha = 1 - q;
        for (let i = 0; i < 3; i++) { px(zx + i, zy, emi('#e8ecff')); px(zx + i, zy + 2, emi('#e8ecff')); }
        px(zx + 1, zy + 1, emi('#e8ecff'));
        T.g.globalAlpha = 1;
      }
    } else if (act === 'wave') {
      const up = Math.floor(ph * 2.2) % 2;                                 // 手を左右にゆらす
      const hy = oy + 7;
      px(6, hy - 1, map.c); px(7, hy - 2, map.s); px(7 + up, hy - 3 - up, map.s);
    } else if (act === 'phone') {
      const hy = oy + 7;
      px(3, hy - 1, col('#2e3038')); px(3, hy, col('#2e3038'));
      px(3, hy - 1, emi(Math.floor(ph / 1.3) % 3 ? '#9fd0ff' : '#ffffff'));
      px(2, hy, map.s); px(4, hy, map.s);
    }
    return { top: oy + headDrop - (a.hair === 2 ? 2 : 0), h, w };
  }

  /* ---------- 景色の上に描く ---------- */
  const people = new Map();      // id → { a, bub, bubUntil, el, rx, ry, … }
  let layer = null;
  function setPerson(id, a) {
    let p = people.get(id); if (!p) { p = { a: null, bub: '', bubUntil: 0, el: null, seed: (Math.random() * 100) | 0, wface: 0 }; people.set(id, p); }
    p.a = sanitize(a);
    if (id !== 'me') {           // 届いた経過秒から、がんばりの始まりを出しておく（数秒のずれは気にしない）
      const st = p.a.gb ? Date.now() - p.a.gb * 1000 : 0;
      if (!st) p.gbStart = 0; else if (!p.gbStart || Math.abs(p.gbStart - st) > 5000) p.gbStart = st;
    }
  }
  // 部屋のホストが、あとから来た人へ配るとき用（経過秒を今の時点に合わせる）
  function netOf(id) { const p = people.get(id); if (!p || !p.a) return null; return Object.assign({}, p.a, { gb: p.gbStart ? Math.floor((Date.now() - p.gbStart) / 1000) + 1 : 0 }); }
  function removePerson(id) { const p = people.get(id); if (p && p.el) p.el.remove(); people.delete(id); }
  function say(id, text) { const p = people.get(id); if (!p) return; p.bub = text; p.bubUntil = performance.now() + 6000 + text.length * 120; }
  function domFor(p) {
    if (!layer) layer = document.getElementById('people');
    if (!p.el) { p.el = document.createElement('div'); p.el.className = 'person'; p.el.innerHTML = '<div class="bub"></div><div class="gb"></div><div class="nm"></div>'; layer.appendChild(p.el); }
    return p.el;
  }
  const WALK = 14;               // 歩く速さ（ドット／秒）
  ST.addOverlay((T, env, t, dt) => {
    const [W, H] = ST.size, sc = ST.scale;
    const col = hex => env.col(hex, 0), emi = hex => env.emi(hex);
    setPerson('me', mine());
    const now = performance.now();
    for (const [, p] of people) if (!p.a || !p.a.on) { if (p.el) p.el.style.display = 'none'; p.box = null; }
    const list = [...people.entries()].filter(([, p]) => p.a && p.a.on);
    for (const [, p] of list) {
      const tx = p.a.x * W, ty = p.a.y * H;
      if (p.rx === undefined || p.W !== W || p.H !== H) { p.rx = tx; p.ry = ty; p.W = W; p.H = H; }
      p.walk = false; p.face = undefined;
      if (p.drag) { p.rx = tx; p.ry = ty; p.walk = now - p.dragAt < 160; p.face = p.dragFace; }
      else {
        const dx = tx - p.rx, dy = ty - p.ry, d = Math.hypot(dx, dy);
        if (d > 0.5) {
          const s = Math.min(d, WALK * Math.min(dt || 0.06, 0.25)); p.rx += dx / d * s; p.ry += dy / d * s; p.walk = true;
          if (Math.abs(dx) > 0.3) p.wface = dx < 0 ? 1 : 0; p.face = p.wface;
        } else { p.rx = tx; p.ry = ty; }
      }
      p.dx = 0;
      if (!p.walk && !p.drag && p.a.act === 'stroll') {                 // 散歩：置いた場所のまわりを行ったり来たり
        const q = t * 0.22 + p.seed, v = Math.cos(q);
        p.dx = Math.sin(q) * 9;
        if (Math.abs(v) > 0.18) { p.walk = true; p.face = v > 0 ? 0 : 1; }
      }
    }
    list.sort((a, b) => a[1].ry - b[1].ry);                            // 手前（下）にいる人ほどあとで描く
    for (const [id, p] of list) {
      const fx = p.rx + p.dx, fy = p.ry;
      const r = drawOne(T, p.a, fx, fy, t, col, emi, p.seed, { walk: p.walk, face: p.face });
      p.box = { x0: (fx - r.w / 2 - 1) * sc, x1: (fx + r.w / 2 + 1) * sc, y0: (r.top - 1) * sc, y1: (fy + 2) * sc };
      const el = domFor(p);
      const bub = now < p.bubUntil ? p.bub : '';
      const gms = id === 'me' ? (G() && G().running() ? G().elapsed() : 0) : p.gbStart ? Date.now() - p.gbStart : 0;
      const gb = gms ? 'がんばり中 ' + G().fmt(gms) : '';
      const key = [Math.round(fx * sc), Math.round(r.top * sc), p.a.name, bub, gb, id === 'me'].join('|');
      if (key !== p.key) {
        p.key = key; el.style.display = '';
        el.style.left = Math.round(fx * sc) + 'px'; el.style.top = Math.round(r.top * sc) + 'px';
        el.querySelector('.nm').textContent = p.a.name || (id === 'me' ? 'あなた' : 'ななし');
        const b = el.querySelector('.bub'); b.textContent = bub; b.style.display = bub ? '' : 'none';
        const g = el.querySelector('.gb'); g.textContent = gb; g.style.display = gb ? '' : 'none';
        el.classList.toggle('me', id === 'me');
      }
    }
  });

  /* ---------- 見本の絵（設定の中） ---------- */
  function preview(canvas, a, t) {
    const g = canvas.getContext('2d'), T = window.TookuEngine.tools(g);
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height);
    drawOne(T, sanitize(Object.assign({}, a, { on: true })), canvas.width / 2, canvas.height - 2, t, h => h, h => h, 0);
  }

  /* ---------- 自分のアバターをつかんで動かす ---------- */
  const toNorm = (cx, cy) => { const [W, H] = ST.size, sc = ST.scale; return [Math.min(0.98, Math.max(0.02, cx / (W * sc))), Math.min(0.99, Math.max(0.08, cy / (H * sc)))]; };
  let drag = null, picking = null;
  const hit = (b, x, y) => { if (!b) return false; const padX = Math.max(10, (48 - (b.x1 - b.x0)) / 2), padY = Math.max(8, (48 - (b.y1 - b.y0)) / 2); return x >= b.x0 - padX && x <= b.x1 + padX && y >= b.y0 - padY && y <= b.y1 + padY; };
  function onDown(e) {
    if (picking) return;
    const me = people.get('me'); if (!me || !me.a || !me.a.on || !hit(me.box, e.clientX, e.clientY)) return;
    const sc = ST.scale;
    drag = { id: e.pointerId, offX: e.clientX - me.rx * sc, offY: e.clientY - me.ry * sc, lastX: e.clientX, sentAt: 0 };
    me.drag = true; me.dragAt = 0; me.dragFace = mine().face;
    try { e.target.setPointerCapture(e.pointerId); } catch (x) {}
    document.body.classList.add('dragging');
    e.preventDefault(); e.stopPropagation();
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const me = people.get('me'); if (!me) return;
    const [x, y] = toNorm(e.clientX - drag.offX, e.clientY - drag.offY);
    if (Math.abs(e.clientX - drag.lastX) > 2) { me.dragFace = e.clientX < drag.lastX ? 1 : 0; drag.lastX = e.clientX; }
    me.dragAt = performance.now();
    me.a.x = x; me.a.y = y;                                    // 描くのはすぐ
    const now = performance.now();
    if (now - drag.sentAt > 60) { drag.sentAt = now; setMine({ x, y }); }
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const me = people.get('me');
    if (me) { setMine({ x: me.a.x, y: me.a.y }); me.drag = false; }
    drag = null; document.body.classList.remove('dragging');
  }
  const view = document.getElementById('view');
  view.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  const isMine = (x, y) => { const me = people.get('me'); return !!(me && me.a && me.a.on && hit(me.box, x, y)); };

  /* ---------- 置く場所をタップで選ぶ（歩いて向かう） ---------- */
  function pick(done) { picking = done; document.body.classList.add('picking'); }
  window.addEventListener('pointerup', e => {
    if (!picking) return;
    if (e.target.closest && e.target.closest('#bar, .sheet, #start, #chat')) return;
    const [x, y] = toNorm(e.clientX, e.clientY);
    const f = picking; picking = null; document.body.classList.remove('picking');
    f(x, y);
  }, true);

  window.TookuAvatar = { PAL, HAIR_NAME, SIZE_NAME, FACE_NAME, ACTS, DEF, sanitize, mine, mineNet, netOf, setMine, setPerson, removePerson, say, preview, pick, isMine, get picking() { return !!picking; }, get dragging() { return !!drag; } };
})();
