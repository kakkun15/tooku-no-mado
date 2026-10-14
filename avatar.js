/* とおくの窓：アバター（作りたい人だけ）。景色の上に小さなドット絵の人を置き、ゆっくり動かす。
   位置は画面の割合（0〜1）で持つので、画面の大きさが違う人どうしでも同じ場所に見える。 */
(function () {
  'use strict';
  const P = window.TOOKU_PREFS, ST = window.TookuStage;

  const PAL = {
    hair: ['#2b2420', '#6b4a2e', '#c9a46a', '#d8d2c8', '#3a4a7a', '#b8566a'],
    skin: ['#f2d0b0', '#d9a77e', '#a9744f', '#6e4a33'],
    cloth: ['#d9644a', '#4f7fb8', '#5f9a5c', '#e0b84a', '#8b6bb5', '#e8e4da', '#3b3b44']
  };
  const HAIR_NAME = ['みじかい', 'ながい', 'おだんご', 'ぼうし'];
  const ACTS = { pc: 'PC作業', game: 'ゲーム', read: '読書', rest: 'ひと休み', stand: 'ぼーっと立つ' };
  const DEF = { on: false, name: '', hair: 0, hc: 0, skin: 0, cloth: 1, act: 'pc', x: 0.5, y: 0.82 };

  // 受け取った値を、決まった範囲に収める（ほかの人から届いた値もここを通す）
  const int = (v, n) => { v = v | 0; return v < 0 || v >= n ? 0 : v; };
  const num = v => { v = +v; return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5; };
  function sanitize(a) {
    a = a && typeof a === 'object' ? a : {};
    return {
      on: !!a.on, name: String(a.name || '').replace(/[\u0000-\u001f]/g, '').slice(0, 12),
      hair: int(a.hair, HAIR_NAME.length), hc: int(a.hc, PAL.hair.length), skin: int(a.skin, PAL.skin.length), cloth: int(a.cloth, PAL.cloth.length),
      act: ACTS[a.act] ? a.act : 'pc', x: num(a.x), y: num(a.y)
    };
  }
  const mine = () => sanitize(Object.assign({}, DEF, P.get('av') || {}));

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
    's.cdc.s',
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
  function hairExtra(style, sit) {          // 髪型ごとの足し引き [x, y, 文字]
    if (style === 1) return sit ? [[1, 4, 'h'], [1, 5, 'h'], [0, 3, 'h']] : [[0, 4, 'h'], [6, 4, 'h'], [0, 5, 'h'], [6, 5, 'h']];
    if (style === 2) return sit ? [[1, -1, 'h'], [2, -1, 'h'], [1, -2, 'h']] : [[2, -1, 'h'], [3, -1, 'h'], [4, -1, 'h'], [3, -2, 'h']];
    if (style === 3) return sit ? [[1, 0, 'k'], [2, 0, 'k'], [3, 0, 'k'], [4, 0, 'k'], [1, 1, 'k'], [2, 1, 'k'], [3, 1, 'k'], [4, 1, 'k'], [5, 1, 'k'], [6, 1, 'k']]
      : [[2, 0, 'k'], [3, 0, 'k'], [4, 0, 'k'], [1, 1, 'k'], [2, 1, 'k'], [3, 1, 'k'], [4, 1, 'k'], [5, 1, 'k'], [6, 1, 'k'], [7, 1, 'k']];
    return [];
  }
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

  // a：アバター、x,y：足元（ドット）、t：時間、col：色を景色に合わせる関数、emi：光る色
  function drawOne(T, a, x, y, t, col, emi, seed) {
    const sit = a.act !== 'stand', rows = sit ? SIT : STAND, w = rows[0].length, h = rows.length;
    const ox = Math.round(x - w / 2), oy = Math.round(y - h);
    const ph = (t + seed * 0.37);
    const map = {
      h: col(PAL.hair[a.hc]), s: col(PAL.skin[a.skin]), e: col('#2a2028'), c: col(PAL.cloth[a.cloth]),
      d: col(shade(PAL.cloth[a.cloth], 0.72)), p: col(shade(PAL.cloth[a.cloth], 0.45)), b: col('#2e2a2a'), k: col(shade(PAL.cloth[a.cloth], 0.9))
    };
    // まばたき・ひと休みは目を閉じる
    const blink = (ph % 4.2) < 0.15 || a.act === 'rest';
    if (blink) map.e = map.s;
    // 影
    T.g.globalAlpha = 0.28; T.R(ox, y - 1, w + 1, 2, '#000'); T.g.globalAlpha = 1;
    let headDrop = a.act === 'rest' ? 1 : 0;
    for (let j = 0; j < h; j++) {
      const r = rows[j], dy = j < 5 ? headDrop : 0;
      for (let i = 0; i < w; i++) { const ch = r[i]; if (ch === '.' || !map[ch]) continue; T.P(ox + i, oy + j + dy, map[ch]); }
    }
    for (const [i, j, ch] of hairExtra(a.hair, sit)) T.P(ox + i, oy + j + (j < 5 ? headDrop : 0), map[ch]);
    // すること
    if (a.act === 'pc') {
      const lx = ox + 6, ly = oy + 3;
      T.R(lx + 2, ly, 1, 4, col('#3a3c44'));                    // 画面のふち
      T.R(lx + 1, ly + 1, 1, 3, emi('#a8dcff'));                // 光る画面
      T.R(lx - 1, ly + 4, 4, 1, col('#5a5e68'));                // キーボード
      const typing = Math.floor(ph / 0.38) % 2;                 // 手がゆっくり動く
      T.P(ox + 5 + typing, oy + 6, map.s);
      if (Math.floor(ph / 1.7) % 3 === 0) T.P(lx + 1, ly + 1 + (Math.floor(ph * 2) % 3), emi('#ffffff'));
    } else if (a.act === 'game') {
      T.R(ox + 5, oy + 5, 3, 2, col('#4a4d58'));
      const cs = ['#ff8a7a', '#8affc0', '#ffe27a', '#9fb6ff'];
      T.P(ox + 6, oy + 5, emi(cs[Math.floor(ph / 0.9) % cs.length]));
      T.P(ox + 4, oy + 6, map.s); T.P(ox + 8, oy + 6, map.s);
      if (Math.floor(ph / 2.6) % 4 === 0) T.P(ox + 4, oy + 5, map.s);  // ときどき指が跳ねる
    } else if (a.act === 'read') {
      const turn = (ph % 6) < 0.5;
      T.R(ox + 5, oy + 4, 3, 3, col('#f2ead8')); T.V(ox + 6, oy + 4, 3, col('#b8a888'));
      if (turn) T.R(ox + 6, oy + 3, 2, 1, col('#f2ead8'));
      T.P(ox + 4, oy + 6, map.s);
    } else if (a.act === 'rest') {
      for (let k = 0; k < 2; k++) {                             // Z がゆっくり上る
        const q = ((ph * 0.35 + k * 0.5) % 1), zx = ox + 5 + Math.round(q * 3), zy = oy - 1 - Math.round(q * 6);
        T.g.globalAlpha = 1 - q; T.H(zx, zy, 3, emi('#e8ecff')); T.P(zx + 1, zy + 1, emi('#e8ecff')); T.H(zx, zy + 2, 3, emi('#e8ecff')); T.g.globalAlpha = 1;
      }
    }
    return { top: oy + headDrop - (a.hair === 2 ? 2 : 0), h };
  }

  /* ---------- 景色の上に描く ---------- */
  const people = new Map();      // id → { a, bub, bubUntil, el }
  let layer = null;
  function setPerson(id, a) {
    let p = people.get(id); if (!p) { p = { a: null, bub: '', bubUntil: 0, el: null, seed: (Math.random() * 100) | 0 }; people.set(id, p); }
    p.a = sanitize(a);
  }
  function removePerson(id) { const p = people.get(id); if (p && p.el) p.el.remove(); people.delete(id); }
  function say(id, text) { const p = people.get(id); if (!p) return; p.bub = text; p.bubUntil = performance.now() + 6000 + text.length * 120; p.dirty = true; }
  function domFor(id, p) {
    if (!layer) layer = document.getElementById('people');
    if (!p.el) { p.el = document.createElement('div'); p.el.className = 'person'; p.el.innerHTML = '<div class="bub"></div><div class="nm"></div>'; layer.appendChild(p.el); }
    return p.el;
  }
  ST.addOverlay((T, env, t) => {
    const [W, H] = ST.size, sc = ST.scale;
    const col = hex => env.col(hex, 0), emi = hex => env.emi(hex);
    setPerson('me', mine());
    // 手前（下）にいる人ほどあとで描く
    const list = [...people.entries()].filter(([, p]) => p.a && p.a.on).sort((a, b) => a[1].a.y - b[1].a.y);
    const now = performance.now();
    for (const [id, p] of people) if (!p.a || !p.a.on) { if (p.el) p.el.style.display = 'none'; }
    for (const [id, p] of list) {
      const fx = p.a.x * W, fy = p.a.y * H;
      const r = drawOne(T, p.a, fx, fy, t, col, emi, p.seed);
      const el = domFor(id, p);
      const bub = now < p.bubUntil ? p.bub : '';
      const key = [Math.round(fx * sc), Math.round(r.top * sc), p.a.name, bub, id === 'me'].join('|');
      if (key !== p.key) {
        p.key = key; el.style.display = '';
        el.style.left = Math.round(fx * sc) + 'px'; el.style.top = Math.round(r.top * sc) + 'px';
        el.querySelector('.nm').textContent = p.a.name || (id === 'me' ? 'あなた' : 'ななし');
        const b = el.querySelector('.bub'); b.textContent = bub; b.style.display = bub ? '' : 'none';
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

  /* ---------- 置く場所をタップで選ぶ ---------- */
  let picking = null;
  function pick(done) {
    picking = done;
    document.body.classList.add('picking');
  }
  window.addEventListener('pointerup', e => {
    if (!picking) return;
    if (e.target.closest && e.target.closest('#bar, .sheet, #start')) return;
    const [W, H] = ST.size, sc = ST.scale;
    const x = Math.min(0.98, Math.max(0.02, e.clientX / (W * sc))), y = Math.min(0.99, Math.max(0.08, e.clientY / (H * sc)));
    const f = picking; picking = null; document.body.classList.remove('picking');
    f(x, y);
  }, true);

  window.TookuAvatar = { PAL, HAIR_NAME, ACTS, DEF, sanitize, mine, setPerson, removePerson, say, preview, pick, get picking() { return !!picking; } };
})();
