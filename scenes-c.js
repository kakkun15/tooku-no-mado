/* とおくの窓：景色（砂漠・草原・緑に還った街・海辺の灯台） */
(function () {
  'use strict';
  const E = window.TookuEngine, A = window.TookuArt, { RNG, fbm, noise1, bay, clamp, lerp, glow } = E;

  /* ============ 砂漠 ============ */
  A.add({
    id: 'desert', name: '砂の海', weather: { clear: 6, cloudy: 2, rain: 1 }, milky: true,
    horizon: env => env.H - A.groundDepth(env.H, 0.44, 40, 116), cloudMul: 0.6,
    amb: () => [['wind', 0.8]],
    wind: () => -26,
    init(env, r) {
      const { W, H } = env, hz = H - A.groundDepth(H, 0.44, 40, 116);
      // 砂丘は3列。手前の2列は「砂丘がある所」と「平らな砂地」がまだらになるようにする（起伏だらけにしない）
      const layers = []; const n = 3;
      for (let i = 0; i < n; i++) { const f = i / (n - 1); layers.push({ base: Math.round(lerp(hz + 3, H - (H - hz) * 0.3, f)), amp: lerp(6, 18, f), fr: lerp(0.026, 0.011, f), d: lerp(0.6, 0, f), n: fbm(r() * 1e5 | 0, 3), mn: noise1(r() * 1e5 | 0), off: r() * 100, flat: i > 0 }); }
      return { hz, layers, car: { x: -40, next: 5 + r() * 15 }, sand: [] };
    },
    build(T, env, s) {
      const { W, H } = env, r = RNG(env.seed);
      const lit = '#e9bd7c', shade = '#c08654', base = '#dcaa6c';
      for (const L of s.layers) {
        // 風上はゆるく登り、稜線の先で急に落ちる砂丘の形
        L.mask = x => L.flat ? clamp((L.mn(x * 0.016 + L.off) - 0.45) * 3.4, 0, 1) : 1;   // 0 のところは平ら
        const prof = x => { const u = x * L.fr * 0.85 + L.off + L.n(x * L.fr * 0.6) * 1.4, p = u - Math.floor(u), k = Math.floor(u), amp = L.amp * (0.55 + 0.45 * Math.abs(Math.sin(k * 12.9898) % 1)) * L.mask(x);
          return [L.base - (1 - L.mask(x)) * (1 + Math.sin(x * 0.045 + L.off) * 1.2) - amp * (p < 0.72 ? Math.pow(p / 0.72, 1.4) : Math.pow(1 - (p - 0.72) / 0.28, 0.7)), p >= 0.72]; };
        L.crest = x => prof(x)[0];
        for (let x = 0; x < W; x++) {
          const [yf, slip0] = prof(x), y = Math.round(yf), m = L.mask(x), slip = slip0 && m > 0.25, depthBand = Math.round((6 + L.amp * 0.6) * (0.3 + 0.7 * m));
          T.R(x, y, 1, H - y, env.col(base, L.d));
          if (slip) { T.R(x, y, 1, depthBand + 4, env.col(shade, L.d)); for (let j = depthBand + 4; j < depthBand + 9; j++) if (bay(x, y + j) < (depthBand + 9 - j) / 6) T.P(x, y + j, env.col(shade, L.d)); }
          else { T.R(x, y, 1, 3, env.col(lit, L.d)); for (let j = 3; j < depthBand; j++) if (bay(x, y + j) < 1 - j / depthBand) T.P(x, y + j, env.col(lit, L.d)); }
          T.P(x, y, env.col(slip ? '#d49a62' : '#f8dca6', L.d));
        }
        // 風紋（平らなところは細い筋を多めに）
        if (L.d < 0.35) for (let i = 0; i < W * 0.8; i++) { const x = r() * W, y = L.crest(x) + 4 + r() * (H - L.crest(x)); if (y < H) T.H(x, y, r.int(2, 6), env.col(L.mask(x) < 0.3 ? '#cf9e64' : '#c8945c', L.d)); }
      }
      // オアシス
      // オアシスは、2列目のいちばん平らなところに置く
      const L2 = s.layers[1]; let ox = Math.round(W * 0.7), best = 9;
      for (let x = Math.round(W * 0.15); x < W * 0.88; x += 2) { const m = L2.mask(x) + L2.mask(x - 12) + L2.mask(x + 12); if (m < best) { best = m; ox = x; } }
      const oy = Math.round(L2.crest(ox)) + 6;
      T.ellipse(ox, oy, 9, 2, env.col('#5aa0c0', 0.4)); T.H(ox - 6, oy - 1, 5, env.col('#9ad0e8', 0.4));
      A.palm(T, env, ox - 8, oy + 1, 13, 0.4, -1); A.palm(T, env, ox + 7, oy + 1, 11, 0.4, 1); A.palm(T, env, ox + 2, oy, 9, 0.45, 0.4);
      for (let k = -10; k <= 10; k += 3) A.tuft(T, ox + k, oy + 2, 2, env.col('#5a8a3a', 0.4), env.col('#7aa04a', 0.4));
      // 隊商の通る尾根
      const L1 = s.layers[0]; s.crest = x => L1.crest(x);
    },
    front(T, env, s, t, dt) {
      const { W } = env, c = s.car;
      // 遠くを行く隊商（ゆっくり）
      c.x += 1.6 * dt; if (c.x > W + 40) c.x = -60;
      const col = env.col('#4a3426', 0.45), fr = Math.floor(t * 3) % 2;
      const camel = fr ? ['....hh', '.bb.h.', 'bbbbb.', 'b.b.b.', 'b...b.'] : ['....hh', '.bb.h.', 'bbbbb.', '.b.b..', '.b..b.'];
      for (let k = 0; k < 3; k++) { const x = c.x - k * 9; if (x < -8 || x > W + 8) continue; const y = s.crest(x) - 5; T.spr(camel, x, y, { b: col, h: col }); }
      const px = c.x + 6; if (px > -4 && px < W + 4) T.spr(['.h.', 'bbb', '.b.', 'b.b'], px, s.crest(px) - 4, { b: col, h: col });
      // 舞う砂
      if (env.weather !== 'rain' && Math.random() < dt * 20) s.sand.push({ x: W + 2, y: env.H * (0.7 + Math.random() * 0.3), v: 30 + Math.random() * 30 });
      s.sand = s.sand.filter(p => { p.x -= p.v * dt; p.y += Math.sin(p.x * 0.2) * 0.2; T.P(p.x, p.y, env.col('#f0d4a0', 0, 0.6)); return p.x > -2; });
    }
  });

  /* ============ 草原 ============ */
  A.add({
    id: 'plains', name: '風の草原', weather: { clear: 5, cloudy: 3, rain: 1, fog: 1, snow: 1 },
    horizon: env => env.H - A.groundDepth(env.H, 0.5, 44, 124), snowCaps: false,
    amb: env => [['wind', 0.6], env.night > 0.5 ? ['crickets', 0.7] : ['birds', 0.6]],
    init(env, r) {
      const { W, H } = env, hz = H - A.groundDepth(H, 0.5, 44, 124);
      const hills = []; for (let i = 0; i < 4; i++) { const f = i / 3; hills.push({ base: Math.round(lerp(hz - 2, H - (H - hz) * 0.25, f)), amp: lerp(8, 18, f), fr: lerp(0.03, 0.012, f), d: lerp(0.65, 0, f), n: fbm(r() * 1e5 | 0, 3) }); }
      const hy = x => hills[2].base - hills[2].n(x * hills[2].fr) * hills[2].amp;
      const sheep = []; for (let i = 0; i < 5; i++) sheep.push({ x: W * (0.15 + r() * 0.5), dir: r() < 0.5 ? 1 : -1, eat: r() * 5, go: 0 });
      return { hz, hills, hy, sheep, shadows: [0, 1].map(() => ({ x: r() * W, w: 30 + r() * 30, sp: 2 + r() * 2 })), blades: [] };
    },
    build(T, env, s) {
      const { W, H } = env, r = RNG(env.seed), snow = env.weather === 'snow';
      const greens = snow ? [['#e8eef6', '#d4deea'], ['#eef3f9', '#dce5f0'], ['#f2f6fb', '#e0e8f2'], ['#f6f9fc', '#e6edf5']] : [['#7aa2a0', '#6a9290'], ['#6aa058', '#5c9050'], ['#7ab45a', '#68a24e'], ['#8ac25e', '#76ae52']];
      s.hills.forEach((h, i) => {
        const fy = x => h.base - h.n(x * h.fr + i * 10) * h.amp;
        const c0 = env.col(greens[i][0], h.d), c1 = env.col(greens[i][1], h.d);
        for (let x = 0; x < W; x++) { const y = Math.round(fy(x)); T.R(x, y, 1, H - y, c0); for (let yy = y + 1; yy < H; yy++) if (bay(x, yy) < 0.2 + 0.2 * Math.sin(x * 0.1 + yy * 0.25)) T.P(x, yy, c1); }
        for (let x = 0; x < W; x++) { const y = Math.round(fy(x)); T.P(x, y, env.col(snow ? '#ffffff' : greens[i][1], h.d)); }
        if (i >= 2 && !snow) for (let k = 0; k < W * 0.5; k++) { const x = r() * W, y = fy(x) + 2 + r() * (H - fy(x)); T.P(x, y, env.col(r.pick(['#f6f2e0', '#f0d040', '#e88aa8', '#ffffff', '#b8a0e8']), h.d)); }
      });
      // 風車
      const h1 = s.hills[1], wx = Math.round(W * 0.24), wy = Math.round(h1.base - h1.n(wx * h1.fr + 10) * h1.amp) + 1;
      T.poly([[wx - 4, wy], [wx - 2, wy - 16], [wx + 2, wy - 16], [wx + 4, wy]], env.col('#efe8dc', 0.45)); T.poly([[wx - 3, wy - 16], [wx, wy - 20], [wx + 3, wy - 16]], env.col('#8a5a3e', 0.45)); T.R(wx - 1, wy - 4, 2, 4, env.col('#6a4a30', 0.45));
      s.mill = { x: wx, y: wy - 16 };
      // ひとりぼっちの木
      const h2 = s.hills[2], tx = Math.round(W * 0.7), ty = Math.round(s.hy(tx)) + 2;
      A.leafy(T, env, tx, ty, Math.round(18 + (H - s.hz) * 0.12), 0.1, { snow });
    },
    front(T, env, s, t, dt) {
      const { W, H } = env;
      // 風車の羽
      const m = s.mill, a = t * 0.6, c = env.col('#d8d0c0', 0.45);
      for (let k = 0; k < 4; k++) { const ang = a + k * Math.PI / 2; T.line(m.x, m.y, m.x + Math.cos(ang) * 9, m.y + Math.sin(ang) * 9, c); T.line(m.x + Math.cos(ang) * 3 + Math.cos(ang + 1.57), m.y + Math.sin(ang) * 3 + Math.sin(ang + 1.57), m.x + Math.cos(ang) * 9 + Math.cos(ang + 1.57) * 1.5, m.y + Math.sin(ang) * 9 + Math.sin(ang + 1.57) * 1.5, env.col('#b8b0a0', 0.45)); }
      // 羊
      if (env.weather !== 'snow') for (const sh of s.sheep) {
        sh.eat -= dt; if (sh.eat < 0) { sh.go = 2 + Math.random() * 3; sh.eat = 6 + Math.random() * 10; if (Math.random() < 0.4) sh.dir *= -1; }
        if (sh.go > 0) { sh.go -= dt; sh.x = clamp(sh.x + sh.dir * 2 * dt, 4, W - 4); }
        const y = Math.round(s.hy(sh.x)) + 2, head = sh.go > 0 ? 0 : 1;
        T.R(sh.x - 2, y - 3, 4, 2, env.col('#f4f2ea', 0.1)); T.P(sh.x - 1, y - 4, env.col('#ffffff', 0.1)); T.P(sh.x - 2, y - 1, env.col('#3a3a3a', 0.1)); T.P(sh.x + 1, y - 1, env.col('#3a3a3a', 0.1));
        T.P(sh.x + (sh.dir > 0 ? 2 : -3), y - 3 + head, env.col('#3a3a3a', 0.1));
      }
      // 雲の影
      if (env.weather === 'clear' && env.night < 0.5) for (const sd of s.shadows) {
        sd.x += sd.sp * dt; if (sd.x - sd.w > W) sd.x = -sd.w;
        const g = T.g; g.fillStyle = 'rgba(20,40,30,0.12)';
        for (let y = s.hz; y < H; y++) { const w = sd.w * (0.6 + 0.4 * Math.sin((y - s.hz) * 0.15)); for (let x = Math.round(sd.x - w / 2); x < sd.x + w / 2; x++) if (bay(x, y) < 0.5) g.fillRect(x, y, 1, 1); }
      }
      // 手前の揺れる草
      const g1 = env.col(env.weather === 'snow' ? '#c8d8c0' : '#5a8a3e'), g2 = env.col(env.weather === 'snow' ? '#e0e8e0' : '#7ab04e');
      for (let x = 0; x < W; x += 2) {
        const h = 4 + ((x * 37) % 7), lean = Math.sin(t * 1.4 + x * 0.12) * 1.6 + Math.sin(t * 0.5) * 0.8;
        for (let j = 0; j < h; j++) T.P(x + Math.round(lean * j / h), H - 1 - j, j > h * 0.6 ? g2 : g1);
      }
      A.birds(T, env, s, t, dt, { y0: H * 0.08, y1: s.hz * 0.6 });
    },
    glow(g, env, s, t) { A.fireflies(g, env, s, t, { x: 0, y: s.hz + 6, w: env.W, h: env.H - s.hz - 8 }, 16); }
  });

  /* ============ 緑に還った街（終末の世界のその後） ============ */
  A.add({
    id: 'overgrown', name: '緑に還った街', weather: { clear: 4, cloudy: 2, rain: 2, fog: 2, snow: 1 },
    horizon: env => env.H - A.groundDepth(env.H, 0.38, 36, 108),
    amb: env => [['wind', 0.3], env.night > 0.5 ? ['crickets', 0.7] : ['birds', 0.8]],
    init(env, r) {
      const { W, H } = env, hz = H - A.groundDepth(H, 0.38, 36, 108);
      return { hz, deer: { x: W * (0.3 + r() * 0.3), dir: 1, eat: 3, go: 0 }, butter: [0, 1, 2].map(() => ({ x: r() * W, y: hz + r() * (H - hz), c: r.pick(['#f0d040', '#f8f4ec', '#e88aa8']) })), rays: r() * 10 };
    },
    build(T, env, s) {
      const { W, H } = env, hz = s.hz, r = RNG(env.seed), snow = env.weather === 'snow';
      // 遠くの廃ビル群
      const vine = (x, y, h, d) => { for (let k = 0; k < h; k++) if (bay(x, y + k) < 0.85 - k / h * 0.6) T.P(x, y + k, env.col(k < 2 ? '#5a9a4a' : '#3f7a3a', d)); };
      for (const [d, hmin, hmax] of [[0.62, 0.35, 0.75], [0.35, 0.28, 0.6]]) {
        let x = r.int(-12, 0);
        while (x < W) {
          const w = r.int(12, 24), h = Math.round(hz * r.range(hmin, hmax)), top = hz - h, tilt = r() < 0.15 ? r.pick([-3, 3]) : 0;
          T.poly([[x, hz], [x + tilt, top], [x + w + tilt, top + (r() < 0.4 ? r.int(2, 8) : 0)], [x + w, hz]], env.col(r.pick(['#9a9c98', '#8c8f8e', '#a6a29a']), d));
          // 窓の格子
          for (let y = top + 3; y < hz - 2; y += 4) for (let k = 2; k < w - 2; k += 3) if (r() < 0.8) T.P(x + k + Math.round(tilt * (hz - y) / h), y, env.col(r() < 0.15 ? '#3a4a5a' : '#5a5e62', d));
          // 崩れた上部とつる
          if (r() < 0.5) { const bx = x + r.int(2, w - 6); T.poly([[bx, top - 1], [bx + 3, top + 5], [bx + 6, top - 1]], env.sky ? E.css(E.mixc(env.sky.mid, env.sky.bot, 0.5)) : '#888'); }
          T.H(x + tilt, top, w, env.col('#5a8a42', d));
          for (let k = 0; k < w; k += r.int(1, 3)) vine(x + k + Math.round(tilt * 0.5), top + 1, r.int(3, Math.min(h, 24)), d);
          if (r() < 0.4) A.leafy(T, env, x + w / 2 + tilt, top, r.int(6, 10), d, { snow });
          x += w + r.int(2, 9);
        }
      }
      // 地面：ひび割れた道路を覆う草
      T.R(0, hz, W, H - hz, env.col(snow ? '#e8eef4' : '#5e8a44'));
      const road0 = hz + Math.round((H - hz) * 0.35), road1 = hz + Math.round((H - hz) * 0.72);
      T.R(0, road0, W, road1 - road0, env.col(snow ? '#d0d8e0' : '#5a5c5e'));
      for (let x = 0; x < W; x += 9) T.R(x, Math.round((road0 + road1) / 2), 5, 1, env.col('#b8b49a'));
      if (!snow) {
        for (let i = 0; i < W * (road1 - road0) / 7; i++) { const x = r() * W, y = road0 + r() * (road1 - road0); T.R(x, y, r.int(1, 4), 1, env.col(r() < 0.6 ? '#5a8a42' : '#6e9a4c')); }
        for (let i = 0; i < 6; i++) { let x = r() * W, y = road0 + r() * (road1 - road0); for (let k = 0; k < 8; k++) { T.P(x, y, env.col('#3a3c3e')); x += r.int(-1, 1); y += r.int(0, 1); } }
        for (let i = 0; i < W / 2; i++) { const x = r() * W, y = hz + r() * (H - hz); if (y > road0 && y < road1) continue; A.tuft(T, x, y, r.int(2, 4), env.col('#4a7a36'), env.col('#6e9e4a')); }
        for (let i = 0; i < W / 3; i++) T.P(r() * W, hz + r() * (H - hz), env.col(r.pick(['#f4f0e0', '#f0d040', '#e88aa8', '#ff8a5a'])));
      }
      // 錆びた車
      const cx = Math.round(W * 0.68), cy = road1 - 2;
      T.R(cx - 9, cy - 5, 18, 4, env.col('#a0583a')); T.R(cx - 5, cy - 8, 10, 3, env.col('#8a4a30')); T.R(cx - 4, cy - 7, 3, 2, env.col('#2a3038')); T.R(cx + 1, cy - 7, 3, 2, env.col('#2a3038'));
      T.circ(cx - 6, cy - 1, 2, env.col('#2a2a2a')); T.circ(cx + 6, cy - 1, 2, env.col('#2a2a2a'));
      for (let k = -9; k < 9; k += 2) T.V(cx + k, cy - 8 + ((k * 7) % 3), r.int(2, 5), env.col('#4a8a3a'));
      A.tuft(T, cx - 9, cy, 4, env.col('#4a7a36'), env.col('#6e9e4a')); A.tuft(T, cx + 9, cy, 4, env.col('#4a7a36'), env.col('#6e9e4a'));
      // 倒れた標識
      const sx = Math.round(W * 0.2); T.line(sx, road0 - 1, sx + 10, road0 - 6, env.col('#7a7e80')); T.R(sx + 9, road0 - 10, 5, 5, env.col('#3a7a5a')); T.H(sx + 10, road0 - 8, 3, env.col('#e8e8e0'));
      // 道を割って生えた大きな木
      A.leafy(T, env, Math.round(W * 0.42), road1 + 2, Math.round(26 + (H - hz) * 0.25), 0, { snow, dark: '#2a5a30', mid: '#3a7038', light: '#5a9a48' });
      A.leafy(T, env, Math.round(W * 0.92), road0 + 1, Math.round(20 + (H - hz) * 0.18), 0.1, { snow });
      A.leafy(T, env, Math.round(W * 0.05), H + 2, Math.round(30 + (H - hz) * 0.3), 0, { snow, dark: '#2a5a30', mid: '#3a7038', light: '#5a9a48' });
      s.roadY = (road0 + road1) / 2;
    },
    front(T, env, s, t, dt) {
      const { W, H } = env, d = s.deer;
      // シカ
      if (env.weather !== 'rain') {
        d.eat -= dt; if (d.eat < 0) { d.go = 3 + Math.random() * 4; d.eat = 8 + Math.random() * 12; if (Math.random() < 0.4) d.dir *= -1; }
        if (d.go > 0) { d.go -= dt; d.x = clamp(d.x + d.dir * 3 * dt, 6, W - 6); }
        const y = Math.round(s.roadY) + 2, eat = d.go <= 0, fr = Math.floor(t * 5) % 2;
        const spr = eat ? ['.........', 'bbbbbb...', 'bbbbbbbh.', 'bb...bbhh', 'b.b..b.b.', 'b.b..b.b.'] : ['......a.a', '......hh.', 'bbbbbbbh.', 'bbbbbb...', fr ? 'b.b..b.b.' : '.b.b..bb.', fr ? 'b.b..b.b.' : '.b.b..b.b'];
        T.spr(spr, d.x - 4, y - 6, { b: env.col('#a06a3a'), h: env.col('#8a5a30'), a: env.col('#6a4a2a') }, d.dir < 0);
      }
      // チョウ
      if (env.night < 0.4 && env.weather === 'clear') for (const b of s.butter) { b.x += Math.sin(t * 0.7 + b.y) * 0.4; b.y += Math.cos(t * 1.1 + b.x * 0.1) * 0.3; b.x = (b.x + W) % W; b.y = clamp(b.y, s.hz + 2, H - 2); const up = Math.sin(t * 14 + b.x) > 0; T.P(b.x, b.y, env.col(b.c)); if (up) { T.P(b.x - 1, b.y - 1, env.col(b.c)); T.P(b.x + 1, b.y - 1, env.col(b.c)); } }
      A.birds(T, env, s, t, dt, { y0: H * 0.1, y1: s.hz * 0.6 });
    },
    glow(g, env, s, t) {
      // 光の筋（晴れた昼と夕方）
      if (env.weather === 'clear' && env.night < 0.4) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) { const x0 = env.W * (0.15 + k * 0.3) + Math.sin(t * 0.05 + k) * 6, a = 0.05 + 0.03 * Math.sin(t * 0.3 + k * 2);
          g.fillStyle = `rgba(255,240,200,${a})`;
          for (let y = 0; y < env.H; y++) { const x = x0 + y * 0.45; for (let i = 0; i < 6; i++) if (bay(x + i, y) < 0.6) g.fillRect(Math.round(x + i), y, 1, 1); } }
        g.restore();
      }
      A.fireflies(g, env, s, t, { x: 0, y: s.hz, w: env.W, h: env.H - s.hz }, 18);
    }
  });

  /* ============ 海辺の灯台 ============ */
  A.add({
    id: 'seaside', name: '海辺の灯台', weather: { clear: 5, cloudy: 2, rain: 1, fog: 2 },
    horizon: env => env.H - A.groundDepth(env.H, 0.5, 44, 126),
    amb: env => [['waves', 1], ['wind', 0.3], env.night < 0.5 ? ['gulls', 0.5] : ['crickets', 0]],
    init(env, r) {
      const { W, H } = env, hz = H - A.groundDepth(H, 0.5, 44, 126), beach = Math.round(H - (H - hz) * 0.32);
      return { hz, beach, gulls: [0, 1, 2].map(() => ({ x: r() * W, y: hz * (0.4 + r() * 0.5), ph: r() * 6, v: 4 + r() * 4 })), boat: { x: r() * W }, waves: Array.from({ length: 16 }, (_, i) => ({ y: i / 16, ph: r() * 6, xs: Array.from({ length: Math.ceil(W / 14) }, () => [r() * W, r() * 1.6 + 0.4, r() < 0.3]) })) };
    },
    build(T, env, s) {
      const { W, H } = env, hz = s.hz, r = RNG(env.seed);
      // 海：沖は濃く、岸に近いほど明るい。ノイズで色むらをつけて、横一色の帯に見えないようにする
      const sn = E.fbm2(env.seed + 21, 3), seaPal = ['#2e6e98', '#3a7ea8', '#4a8cb4', '#5a98bc', '#3f8aa6'];
      for (let y = hz; y < s.beach + 4; y++) { const f = (y - hz) / (s.beach - hz); for (let x = 0; x < W; x++) { const v = f * 0.55 + sn(x * 0.05, y * 0.4 / (0.3 + f)) * 0.6 - 0.1, i = clamp(Math.floor(v * 4 + (bay(x, y) < 0.3 ? 0.25 : 0)), 0, 3); T.P(x, y, env.col(seaPal[i], 0.35 * (1 - f))); } }
      T.H(0, hz, W, env.col('#8ab4d0', 0.5));
      // 崖：地層の縞をノイズでゆらし、ひびと草の垂れを足す
      const cx0 = Math.round(W * (W > H ? 0.72 : 0.6)), ctop = Math.round(hz - (H - hz) * 0.35), n = fbm(env.seed + 3, 3);
      const cy = x => { const f = (x - cx0) / (W - cx0 + 1); return Math.round(ctop + (1 - Math.min(1, f * 4)) * 14 + n(x * 0.2) * 4); };
      A.stoneFill(T, env, cx0, W, cy, () => H, { seed: env.seed + 31, sx: 0.08, sy: 0.3, pal: ['#4e4842', '#5e5650', '#6e665e', '#7e756c', '#8e857a'], crack: '#3e3834', speck: '#a49a8e',
        light: (x, y) => (x < cx0 + 6 ? -0.18 : 0) + (y - cy(x)) * -0.003 });
      for (let x = cx0; x < W; x++) { const y = cy(x); T.R(x, y - 1, 1, 2, env.col('#5a8a42')); if (n(x * 0.9) > 0.62) T.R(x, y + 1, 1, Math.round(n(x * 1.7) * 6), env.col('#4a7a3a')); }
      const lx = Math.round(cx0 + Math.min(18, (W - cx0) * 0.45)), ly = Math.round(ctop + n(lx * 0.2) * 4);
      T.poly([[lx - 4, ly], [lx - 3, ly - 22], [lx + 3, ly - 22], [lx + 4, ly]], env.col('#f0ece4'));
      for (const yy of [ly - 6, ly - 15]) T.R(lx - 4, yy, 9, 3, env.col('#c84040'));
      T.R(lx - 4, ly - 23, 9, 1, env.col('#2a2a2a')); T.R(lx - 2, ly - 27, 5, 4, env.col('#3a3a3a')); T.R(lx - 1, ly - 26, 3, 2, env.col('#f0e0a0')); T.poly([[lx - 3, ly - 27], [lx, ly - 30], [lx + 3, ly - 27]], env.col('#c84040'));
      T.R(lx + 4, ly - 4, 6, 4, env.col('#e8e0d0')); T.poly([[lx + 3, ly - 4], [lx + 7, ly - 7], [lx + 11, ly - 4]], env.col('#8a4a3a'));
      s.lamp = { x: lx, y: ly - 25 }; s.cliffX = cx0;
      // 砂浜
      T.R(0, s.beach, W, H - s.beach, env.col('#e4d0a0')); T.dith(0, s.beach, W, H - s.beach, env.col('#e4d0a0'), env.col('#d6c08e'), (i, j) => 0.15 + 0.15 * Math.sin(i * 0.3 + j));
      // 砂浜のつぶつぶと、貝殻・小石・ヒトデ・海藻（浜辺らしさ）
      for (let i = 0; i < W / 4; i++) T.P(r() * W, s.beach + 4 + r() * (H - s.beach), env.col(r.pick(['#f8f0e0', '#b8a07a', '#cdb88a', '#e8dcc0'])));
      const shells = [
        [['.ww.', 'wpwp', '.ww.'], { w: '#f6eee4', p: '#e8b0a0' }],            // ほたて
        [['.oo', 'ooc', '.o.'], { o: '#f2e2c8', c: '#c89a70' }],                // 巻き貝
        [['.s.', 'sss', 's.s'], { s: '#e8865a' }],                              // ヒトデ
        [['ww', 'pw'], { w: '#fbf6ee', p: '#d8c8b8' }],                         // 二枚貝
        [['gg.', '.gg'], { g: '#4a7a4a' }]                                       // 海藻
      ];
      for (let i = 0; i < Math.max(5, W / 22); i++) { const [rows, map] = r.pick(shells), m = {}; for (const k in map) m[k] = env.col(map[k]); const x = r.int(2, (s.cliffX || W) - 6), y = r.int(s.beach + 6, H - 4); T.spr(rows, x, y, m, r() < 0.5); }
      for (let i = 0; i < W / 14; i++) { const x = r.int(0, W), y = r.int(s.beach + 5, H - 2); T.R(x, y, 2, 1, env.col('#9a9088')); T.P(x, y - 1, env.col('#c8beb4')); }
      // 崖のふもとの岩（砂浜との境目をぼかす）
      for (let x = s.cliffX - 2; x < W; x += r.int(4, 9)) A.rock(T, env, x, s.beach + r.int(0, 2), r.int(3, 6), r.int(2, 3), 0.05);
      // 流木
      T.R(Math.round(W * 0.2), H - 6, 12, 2, env.col('#9a8064')); T.P(Math.round(W * 0.2) + 11, H - 7, env.col('#9a8064'));
    },
    front(T, env, s, t, dt) {
      const { W, H } = env, hz = s.hz, B = s.beach;
      // 沖の波
      for (const w of s.waves) { w.y += dt * 0.025; if (w.y > 1) { w.y = 0; w.xs = w.xs.map(() => [Math.random() * W, Math.random() * 1.6 + 0.4, Math.random() < 0.3]); } const y = Math.round(hz + 2 + Math.pow(w.y, 1.3) * (B - hz - 3)), a = Math.sin(w.y * Math.PI); for (const [x0, lm, dark] of w.xs) { const L = 1 + Math.round(w.y * 7 * lm), x = (x0 + Math.sin(t * 0.3 + w.ph) * 3); if (x < s.cliffX - L) T.H(x, y + (dark ? 1 : 0), L, env.col(dark ? '#2a6a94' : '#c4e0f0', 0.3 * (1 - w.y), ((dark ? 0.4 : 0.25) + 0.6 * a * (dark ? 0.5 : 1)).toFixed(2))); } }
      // 太陽・月のきらめき
      const sx = env.skyState.moon ? env.skyState.moon.x : (env.hour > 5.5 && env.hour < 19 && env.weather === 'clear' ? W * (0.08 + 0.84 * (env.hour - 5.6) / 13) : null);
      if (sx !== null && env.weather !== 'fog') for (let k = 0; k < 20; k++) { const y = hz + 1 + Math.pow(Math.random(), 1.5) * (B - hz), sp = 1 + (y - hz) * 0.12, gx = sx + (Math.random() - 0.5) * sp * 6, gl = 1 + Math.round(Math.random() * sp); if (gx + gl >= s.cliffX) continue; T.H(gx, y, gl, env.skyState.moon ? 'rgba(220,230,255,0.6)' : env.emi('#fff4d0', 0.7)); }
      // 打ち寄せる波
      const edge = B + 2 + Math.sin(t * 0.45) * 3;
      for (let x = 0; x < s.cliffX + 2; x++) { const y = Math.round(edge + Math.sin(x * 0.15 + t * 0.6) * 1.2); T.R(x, B - 1, 1, y - B + 1, env.col('#4a96b0')); if (bay(x, y) < 0.8) T.P(x, y, env.col('#ffffff')); if (bay(x, y + 1) < 0.4) T.P(x, y + 1, env.col('#e8f4f8')); T.P(x, y + 2, env.col('#c8b888')); }
      // 帆船
      const bt = s.boat; bt.x = (bt.x + dt * 0.8) % (W + 20); const bx = Math.round(bt.x - 10), by = hz + 2;
      if (bx < s.cliffX - 4) { T.R(bx - 3, by, 7, 1, env.col('#5a4a3a', 0.5)); T.poly([[bx, by - 1], [bx, by - 7], [bx + 4, by - 1]], env.col('#f4f0e8', 0.5)); T.V(bx, by - 7, 7, env.col('#5a4a3a', 0.5)); s.boatLight = { x: bx, y: by - 1 }; } else s.boatLight = null;
      // カモメ
      if (env.night < 0.5 && env.weather !== 'rain') for (const g of s.gulls) { g.x += g.v * dt; if (g.x > W + 6) g.x = -6; const y = g.y + Math.sin(t * 0.5 + g.ph) * 4, up = Math.sin(t * 6 + g.ph) > 0, c = env.col('#f8f8f8'), c2 = env.col('#9aa4ae'); T.P(g.x, y, c); T.P(g.x - 1, y - (up ? 1 : 0), c2); T.P(g.x + 1, y - (up ? 1 : 0), c2); T.P(g.x - 2, y - (up ? 2 : 0), c2); T.P(g.x + 2, y - (up ? 2 : 0), c2); }
    },
    glow(g, env, s, t) {
      const L = env.lights; if (L < 0.1) return;
      const a = t * 0.8, c = Math.cos(a), toward = Math.max(0, c);
      // 回るあかり
      g.save(); g.globalCompositeOperation = 'lighter';
      const len = env.W * 0.9, dir = Math.sin(a), lx = s.lamp.x, ly = s.lamp.y;
      for (let k = 0; k < len; k++) { const x = lx + dir * k * (dir < 0 ? 1 : 0.6), half = 1 + k * 0.08, al = (0.16 * (1 - k / len)) * L * (0.4 + 0.6 * Math.abs(dir)); g.fillStyle = `rgba(255,240,190,${al})`; for (let j = -half; j <= half; j++) if (bay(Math.round(x), Math.round(ly + j)) < 0.7) g.fillRect(Math.round(x), Math.round(ly + j), 1, 1); }
      g.restore();
      g.fillStyle = `rgba(255,240,180,${0.6 + 0.4 * toward})`; g.fillRect(lx - 1, ly - 1, 3, 2);
      glow(g, lx, ly, 8 + toward * 18, '#fff0b0', (0.35 + 0.6 * toward) * L, 5);
      if (s.boatLight) { g.fillStyle = `rgba(255,220,140,${0.8 * L})`; g.fillRect(s.boatLight.x, s.boatLight.y - 1, 1, 1); glow(g, s.boatLight.x, s.boatLight.y - 1, 3, '#ffb060', 0.5 * L, 2); }
    }
  });
})();
