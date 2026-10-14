/* とおくの窓：景色に共通の部品（木・人・鳥・光る虫など）と場面の登録 */
(function () {
  'use strict';
  const E = window.TookuEngine, { RNG, fbm, noise1, bay, clamp, lerp } = E;
  const SCENES = [];

  /* 地平線の位置：横長なら下寄り、縦長なら手前を広く */
  const groundDepth = (H, frac, lo, hi) => clamp(Math.round(H * frac), lo, hi);

  /* 針葉樹。snow なら枝に雪 */
  function pine(T, env, x, base, h, depth, opt) {
    opt = opt || {};
    const dark = env.col(opt.dark || '#1e4434', depth), light = env.col(opt.light || '#2d5e44', depth), snow = env.col('#f2f6fb', depth), trunk = env.col('#4a3426', depth);
    const top = base - h, tiers = Math.max(2, Math.round(h / 6)), wMax = Math.max(2, h * (opt.wide || 0.36));
    T.R(x, base - Math.max(2, h * 0.16), 1, Math.max(2, h * 0.16) + 1, trunk);
    for (let y = top; y < base - h * 0.12; y++) {
      const f = (y - top) / (h * 0.88), tierF = (f * tiers) % 1, hw = Math.max(0, (0.25 + 0.75 * f) * wMax * (0.55 + 0.45 * tierF));
      const w = Math.round(hw);
      T.R(x - w, y, w * 2 + 1, 1, dark);
      if (w > 0) T.R(x - w, y, Math.max(1, Math.round(w * 0.7)), 1, light);
      if (opt.snow && tierF < 0.34 && w > 0) T.R(x - w, y, Math.max(1, w + 1), 1, snow);
    }
    if (opt.snow) T.P(x, top, snow);
  }
  /* 広葉樹：丸い葉の塊をいくつか */
  function leafy(T, env, x, base, h, depth, opt) {
    opt = opt || {};
    const r = RNG(Math.round(x * 13 + base * 7 + h)), trunkH = Math.round(h * 0.38);
    const cT = env.col(opt.trunk || '#5a4030', depth), c1 = env.col(opt.dark || '#2f6236', depth), c2 = env.col(opt.mid || '#3f7a3e', depth), c3 = env.col(opt.light || '#5c9a4a', depth);
    T.R(x - (h > 18 ? 1 : 0), base - trunkH, h > 18 ? 3 : 2, trunkH + 1, cT);
    if (h > 14) { T.line(x, base - trunkH * 0.7, x - h * 0.18, base - trunkH * 1.2, cT); T.line(x + 1, base - trunkH * 0.8, x + h * 0.2, base - trunkH * 1.25, cT); }
    const cy = base - trunkH - h * 0.28, rw = h * 0.36, blobs = [];
    for (let k = 0; k < 5 + h / 6; k++) blobs.push([x + r.range(-rw, rw), cy + r.range(-h * 0.26, h * 0.18), Math.max(2, Math.round(r.range(h * 0.16, h * 0.28)))]);
    for (const [bx, by, br] of blobs) T.circ(bx, by + 1, br, c1);
    for (const [bx, by, br] of blobs) T.circ(bx - 0.5, by - 0.5, Math.max(1, br - 1), c2);
    for (const [bx, by, br] of blobs) if (br > 2) T.circ(bx - br * 0.35, by - br * 0.4, Math.max(1, Math.round(br * 0.45)), c3);
    if (opt.snow) for (const [bx, by, br] of blobs) T.R(bx - br * 0.6, by - br, br * 1.2, 1, env.col('#f2f6fb', depth));
  }
  /* ヤシの木 */
  function palm(T, env, x, base, h, depth, lean) {
    const tr = env.col('#8a6a44', depth), tr2 = env.col('#6e5234', depth), lf = env.col('#3f8a3c', depth), lf2 = env.col('#2c6a30', depth);
    let px = x, py = base;
    for (let i = 0; i < h; i++) { const f = i / h; px = x + lean * f * f * h * 0.35; py = base - i; T.P(px, py, i % 3 === 0 ? tr2 : tr); T.P(px + 1, py, tr2); }
    const fr = [[-1, 0.2], [-0.7, -0.3], [-0.2, -0.55], [0.4, -0.45], [0.8, -0.1], [1, 0.3]];
    for (const [dx, dy] of fr) for (let k = 1; k <= h * 0.42; k++) { const f = k / (h * 0.42); T.P(px + dx * k, py + dy * k + f * f * h * 0.18, k % 2 ? lf : lf2); }
  }
  /* 草むらのふさ */
  function tuft(T, x, y, h, c1, c2) { for (let i = -2; i <= 2; i++) { const hh = Math.max(1, h - Math.abs(i)); T.V(x + i, y - hh + 1, hh, (i & 1) ? c1 : c2); } }
  /* 岩 */
  function rock(T, env, x, y, w, h, depth, snow) {
    const c1 = env.col('#7c7a78', depth), c2 = env.col('#5d5b5a', depth), c3 = env.col('#9c9a96', depth);
    T.ellipse(x, y, w, h, c2); T.ellipse(x - 0.5, y - 0.6, Math.max(1, w - 1), Math.max(1, h - 1), c1); T.ellipse(x - w * 0.35, y - h * 0.45, Math.max(1, w * 0.4 | 0), Math.max(1, h * 0.35 | 0), c3);
    if (snow) T.ellipse(x, y - h * 0.6, Math.max(1, w - 1), Math.max(1, h * 0.4 | 0), env.col('#f2f6fb', depth));
  }

  /* 鳥の群れ（遠くを横切る） */
  function birds(T, env, s, t, dt, opt) {
    opt = opt || {};
    if (!s._birds) s._birds = { list: [], next: 8 + Math.random() * 20 };
    const B = s._birds; B.next -= dt;
    if (B.next < 0 && env.night < 0.5 && env.weather !== 'rain') {
      const n = 3 + (Math.random() * 6 | 0), dir = Math.random() < 0.5 ? 1 : -1, y0 = opt.y0 !== undefined ? opt.y0 : env.H * 0.15, y1 = opt.y1 !== undefined ? opt.y1 : env.H * 0.4, y = y0 + Math.random() * (y1 - y0);
      for (let i = 0; i < n; i++) B.list.push({ x: dir > 0 ? -8 - i * 4 : env.W + 8 + i * 4, y: y + (i % 2 ? i : -i) * 1.2 + Math.random() * 2, v: dir * (9 + Math.random() * 3), ph: Math.random() * 6 });
      B.next = 25 + Math.random() * 50;
    }
    const c = env.col(opt.color || '#2b2a33', opt.depth || 0.2);
    B.list = B.list.filter(b => {
      b.x += b.v * dt; const up = Math.sin(t * 9 + b.ph) > 0;
      T.P(b.x, b.y, c); T.P(b.x - 1, b.y + (up ? -1 : 0), c); T.P(b.x + 1, b.y + (up ? -1 : 0), c);
      return b.x > -20 && b.x < env.W + 20;
    });
  }
  /* 蛍 */
  function fireflies(g, env, s, t, area, n) {
    if (env.night < 0.45 || env.weather === 'snow' || env.weather === 'rain') return;
    if (!s._ff) { const r = RNG(env.seed + 9); s._ff = []; for (let i = 0; i < n; i++) s._ff.push({ x: area.x + r() * area.w, y: area.y + r() * area.h, ph: r() * 9, sp: 0.4 + r() * 0.8 }); }
    for (const f of s._ff) {
      const x = f.x + Math.sin(t * 0.3 * f.sp + f.ph) * 6, y = f.y + Math.sin(t * 0.45 * f.sp + f.ph * 2) * 3, a = Math.max(0, Math.sin(t * 1.3 * f.sp + f.ph)) * env.night;
      if (a > 0.05) { E.glow(g, x, y, 3, '#c8f070', a * 0.9, 2); g.fillStyle = `rgba(230,255,150,${a})`; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
    }
  }
  /* 窓の灯り（夜にともる。時々消えたりつく） */
  function windowLights(g, env, s, list, t) {
    if (env.lights < 0.05) return;
    for (const w of list) {
      const on = w.th < env.lights * 0.75 && (Math.floor((t + w.ph * 600) / w.per) % 7 !== 0 || w.steady);
      if (!on) continue;
      g.fillStyle = `rgba(255,${w.warm ? 214 : 236},${w.warm ? 140 : 190},${0.75 + 0.25 * env.lights})`;
      g.fillRect(w.x, w.y, w.w, w.h);
      if (w.glow !== false) E.glow(g, w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h) + 2, '#ffb860', 0.18 * env.lights, 2);
    }
  }
  function makeWindow(x, y, w, h, r) { return { x, y, w, h, th: r(), ph: r(), per: 120 + r() * 400, warm: r() < 0.8 }; }

  /* 架空の電線：たるんだ線 */
  function wire(T, x0, y0, x1, y1, sag, c) {
    const n = Math.max(2, Math.abs(x1 - x0)); let px = x0, py = y0;
    for (let i = 1; i <= n; i++) { const f = i / n, x = lerp(x0, x1, f), y = lerp(y0, y1, f) + sag * 4 * f * (1 - f); T.line(px, py, x, y, c); px = x; py = y; }
  }

  function add(def) { SCENES.push(def); }
  window.TookuArt = { SCENES, add, groundDepth, pine, leafy, palm, tuft, rock, birds, fireflies, windowLights, makeWindow, wire };
})();
