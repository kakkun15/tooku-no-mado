/* とおくの窓：景色（森の焚き火・せせらぎ・誰もいない街角・雪だるまの丘） */
(function () {
  'use strict';
  const E = window.TookuEngine, A = window.TookuArt, { RNG, fbm, noise1, bay, clamp, lerp, glow } = E;

  /* ============ 森の焚き火 ============ */
  A.add({
    id: 'campfire', name: '森の焚き火', weather: { clear: 5, cloudy: 2, fog: 2, snow: 2 },
    horizon: env => env.H - A.groundDepth(env.H, 0.42, 40, 112),
    amb: env => [['fire', 1], ['wind', 0.3], env.night > 0.5 ? ['crickets', 0.6] : ['birds', 0.45]],
    init(env, r) {
      const { W, H } = env, hz = env.H - A.groundDepth(H, 0.42, 40, 112), fg = H - hz;
      const cx = Math.round(W * 0.5), cy = Math.round(H - fg * 0.4);
      return { hz, cx, cy, rx: Math.min(W * 0.27, 58), ry: Math.max(6, Math.round(fg * 0.2)), sparks: [], smoke: [], owl: { x: 0, y: 0, next: 30 }, blink: 0, f1: fbm(r() * 1e4 | 0, 3) };
    },
    build(T, env, s) {
      const { W, H } = env, hz = s.hz, r = RNG(env.seed), snow = env.weather === 'snow';
      const m1 = fbm(env.seed + 1, 4), m2 = fbm(env.seed + 2, 4);
      T.ridge(0, W, x => hz - 10 - m1(x * 0.02) * 26, env.col(snow ? '#9aaac4' : '#6c84a6', 0.85));
      T.ridge(0, W, x => hz - 4 - m2(x * 0.03 + 9) * 14, env.col(snow ? '#7b8ea8' : '#4f6e84', 0.6));
      // 森：奥の列と手前の列
      for (let x = -4; x < W + 6; x += r.int(3, 6)) A.pine(T, env, x, hz + r.int(1, 4), r.int(9, 17), 0.38, { snow });
      const ground = snow ? '#e6ecf4' : '#5d8644', ground2 = snow ? '#d2dcea' : '#6c9a4d';
      T.R(0, hz + 3, W, H - hz, env.col(ground));
      T.dith(0, hz + 3, W, H - hz - 3, env.col(ground), env.col(ground2), (i, j) => 0.25 + 0.2 * Math.sin(i * 0.07 + j * 0.3));
      for (let x = -6; x < W + 8; x += r.int(5, 9)) { if (Math.abs(x - s.cx) < s.rx + 18) continue; A.pine(T, env, x, hz + r.int(6, 10), r.int(16, 28), 0.12, { snow, wide: 0.4 }); }
      for (let x = -6; x < W + 8; x += r.int(7, 12)) { if (Math.abs(x - s.cx) < s.rx + 30) continue; A.pine(T, env, x, hz + r.int(12, 18), r.int(24, 36), 0.02, { snow, wide: 0.42 }); }
      // ひらけた地面
      const dirt = snow ? '#c9d2de' : '#8a6c4c', dirt2 = snow ? '#b8c2d0' : '#7a5c3e';
      const edge = fbm(env.seed + 7, 3), pts = [], pts2 = [];
      for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283, e = 0.82 + 0.3 * edge(k * 0.4); pts.push([s.cx + Math.cos(a) * s.rx * e, s.cy + 1 + Math.sin(a) * s.ry * e]); pts2.push([s.cx + Math.cos(a) * (s.rx * e - 2), s.cy + Math.sin(a) * (s.ry * e - 1)]); }
      T.poly(pts, env.col(dirt2)); T.poly(pts2, env.col(dirt));
      for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = r(); T.P(s.cx + Math.cos(a) * d * s.rx * 0.9, s.cy + Math.sin(a) * d * s.ry * 0.8, env.col(dirt2)); }
      // テント
      const tx = Math.round(s.cx - s.rx * 0.72), ty = Math.round(s.cy - s.ry * 0.15), tw = 13, th = 15;
      T.poly([[tx - tw, ty], [tx, ty - th], [tx + tw, ty]], env.col('#cf6d3a'));
      T.poly([[tx, ty - th], [tx + tw, ty], [tx + 2, ty]], env.col('#a6512c'));
      T.poly([[tx - 4, ty], [tx, ty - 8], [tx + 3, ty]], env.col('#3a2216'));
      T.line(tx - tw, ty, tx - tw - 4, ty + 1, env.col('#d8d0c0')); T.line(tx + tw, ty, tx + tw + 4, ty + 1, env.col('#d8d0c0'));
      T.V(tx, ty - th - 2, 2, env.col('#5a4030'));
      if (snow) { T.line(tx - tw + 2, ty - 2, tx, ty - th, env.col('#f2f6fb')); T.line(tx, ty - th, tx + tw - 2, ty - 2, env.col('#e4ecf6')); }
      // 薪の山
      for (let k = 0; k < 3; k++) for (let j = 0; j <= 2 - k; j++) { const lx = tx + tw + 5 + j * 3 + k * 1.5, ly = ty - k * 2; T.R(lx, ly - 2, 3, 2, env.col('#7a4a2a')); T.P(lx + 1, ly - 1, env.col('#c09a6a')); }
      // 丸太のベンチと座る人
      const bx = Math.round(s.cx + Math.min(s.rx * 0.45, 20)), by = Math.round(s.cy + s.ry * 0.2);
      T.R(bx - 7, by - 2, 15, 3, env.col('#6e4426')); T.R(bx - 7, by - 2, 15, 1, env.col('#8a5a34')); T.P(bx - 7, by - 1, env.col('#c6a070')); T.P(bx + 7, by - 1, env.col('#c6a070'));
      T.spr(['.hh.', 'hhhh', 'hffc', 'ccc.', 'ccc.', 'cccc', '.pp.', '.p.p'], bx - 2, by - 10, { h: env.col('#3d5d8c'), f: env.col('#e7c09a'), c: env.col('#4b6ea0'), p: env.col('#3a3a48') });
      // 寝ている猫
      T.spr(['.oo..', 'ooooo', 'oowoo'], bx - 14, by - 2, { o: env.col('#d8913c'), w: env.col('#f4e2c4') });
      // 石の輪と薪
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; A.rock(T, env, s.cx + Math.cos(a) * 7, s.cy + Math.sin(a) * 2.5 + 1, 2, 1, 0, snow); }
      T.line(s.cx - 4, s.cy + 1, s.cx + 4, s.cy - 1, env.col('#3e2a1c')); T.line(s.cx - 4, s.cy - 1, s.cx + 4, s.cy + 1, env.col('#4e3422'));
      // フクロウの位置（夜に目が光る）

      // 手前の草と、画面のふちの大きな木
      for (let x = 0; x < W; x += r.int(4, 9)) if (!snow) A.tuft(T, x, H - r.int(0, 3), r.int(2, 4), env.col('#4d7a3a'), env.col('#6b9a4a'));
      // 画面の両はしの木：背を控えめにし、幹と根元がはっきり見えるように画面の内側へ寄せる
      const big = Math.round((H - hz) * 0.66);
      s.owl.tree = { x: W - Math.max(8, Math.round(W * 0.05)), y: H - 5 - Math.round(big * 0.88 * 0.55) };
      for (const [x, h, base] of [[Math.max(7, Math.round(W * 0.04)), big, H - 3], [W - Math.max(8, Math.round(W * 0.05)), Math.round(big * 0.88), H - 5]]) {
        const trunkH = Math.round(h * 0.3), tw = h > 34 ? 3 : 2;
        T.R(x - (tw >> 1), base - trunkH, tw, trunkH + 1, env.col('#4a3426'));
        T.V(x - (tw >> 1), base - trunkH, trunkH, env.col('#6a4c36'));
        T.P(x - (tw >> 1) - 1, base, env.col('#4a3426')); T.P(x + tw - (tw >> 1), base, env.col('#4a3426'));   // 根元
        if (!snow) A.tuft(T, x, base + 1, 3, env.col('#4d7a3a'), env.col('#6b9a4a'));
        A.pine(T, env, x, base - Math.round(trunkH * 0.7), h - Math.round(trunkH * 0.7), 0, { snow, wide: 0.36 });
      }
      // テントのランタン
      s.lantern = { x: tx + tw - 3, y: ty - 6 };
      T.V(s.lantern.x, s.lantern.y - 2, 2, env.col('#3a3a3a')); T.R(s.lantern.x - 1, s.lantern.y, 3, 3, env.col('#4a4030')); T.P(s.lantern.x, s.lantern.y + 1, env.col('#e8c070'));
    },
    front(T, env, s, t, dt) {
      const fx = s.cx, fy = s.cy - 1, n = s.f1;
      // 炎
      for (let dx = -3; dx <= 3; dx++) {
        const h = Math.max(1, (6.2 - Math.abs(dx) * 1.45) * (0.6 + 0.6 * n(t * 5 + dx * 1.7)) + 1);
        for (let y = 0; y < h; y++) {
          const f = y / h; let c = f < 0.3 && Math.abs(dx) <= 1 ? '#fff4b0' : f < 0.55 ? '#ffc23c' : f < 0.82 ? '#ff7a1e' : '#d93a16';
          if (y === Math.floor(h) - 1 && Math.random() < 0.3) continue;
          T.P(fx + dx + (y > 3 ? Math.round(Math.sin(t * 9 + y) * 0.6) : 0), fy - y, c);
        }
      }
      // 火の粉
      if (Math.random() < dt * 7) s.sparks.push({ x: fx + (Math.random() - 0.5) * 4, y: fy - 5, vx: (Math.random() - 0.5) * 4, vy: -8 - Math.random() * 8, life: 1 + Math.random() * 1.4 });
      s.sparks = s.sparks.filter(p => { p.life -= dt; p.x += (p.vx + Math.sin(t * 3 + p.y) * 2) * dt; p.y += p.vy * dt; if (p.life > 0) T.P(p.x, p.y, `rgba(255,${150 + Math.random() * 80 | 0},60,${Math.min(1, p.life)})`); return p.life > 0; });
      // 煙
      if (Math.random() < dt * 1.6) s.smoke.push({ x: fx, y: fy - 7, r: 1, a: 0.28, age: 0 });
      s.smoke = s.smoke.filter(p => { p.age += dt; p.y -= 5 * dt; p.x += 2.5 * dt + Math.sin(p.age) * 0.1; p.r += 0.5 * dt; p.a -= 0.035 * dt; if (p.a > 0) T.circ(p.x, p.y, Math.round(p.r), env.col('#a3a8b0', 0, p.a.toFixed(2))); return p.a > 0 && p.y > -10; });
      // 夜のフクロウ
      if (env.night > 0.5) {
        s.owl.next -= dt; if (s.owl.next < 0) { s.owl.next = 45 + Math.random() * 70; if (window.TookuPlayer) window.TookuPlayer.ambEvent('owl'); }
        s.blink -= dt; if (s.blink < -4 - Math.random() * 3) s.blink = 0.15;
        // 右の木の枝にとまるフクロウ（夜だけ）。からだの形を見せて、目は2つそろって光り、ときどきまばたき
        const o = s.owl.tree; if (o) { const ox = o.x - 1, oy = o.y, b = env.col('#5a4636'), b2 = env.col('#3e3026');
          T.spr(['k...k', 'kbbbk', 'bbbbb', 'bbwbb', '.bbb.', '.f.f.'], ox - 2, oy - 6, { k: b2, b, w: env.col('#8a7458'), f: env.col('#c8a050') });
          T.H(ox - 4, oy, 9, env.col('#3a2a1e'));
          if (s.blink <= 0) { T.P(ox - 1, oy - 4, 'rgba(255,224,110,0.95)'); T.P(ox + 1, oy - 4, 'rgba(255,224,110,0.95)'); } else { T.P(ox - 1, oy - 4, b2); T.P(ox + 1, oy - 4, b2); } }
      }
    },
    glow(g, env, s, t) {
      const fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      glow(g, s.cx, s.cy - 3, (24 + 6 * env.night) * fl, '#ff9440', (0.25 + 0.5 * env.night) * fl, 6);
      glow(g, s.cx, s.cy - 3, 6 * fl, '#ffd070', 0.5 * fl, 3);
      if (env.lights > 0.2 && s.lantern) { g.fillStyle = 'rgba(255,220,140,0.9)'; g.fillRect(s.lantern.x, s.lantern.y + 1, 1, 1); glow(g, s.lantern.x, s.lantern.y + 1, 9, '#ffc060', 0.35 * env.lights, 3); }
    }
  });

  /* ============ せせらぎ ============ */
  A.add({
    id: 'river', name: 'せせらぎ', weather: { clear: 5, cloudy: 2, rain: 2, fog: 2, snow: 1 },
    horizon: env => env.H - A.groundDepth(env.H, 0.5, 46, 130),
    amb: env => [['stream', 1], ['falls', 0.45], ['wind', 0.15], env.night > 0.5 ? ['crickets', 0.7] : ['birds', 0.55]],
    init(env, r) {
      const { W, H } = env, hz = H - A.groundDepth(H, 0.5, 46, 130), sx = Math.round(W * 0.56), top = hz + 3;
      const ph = r() * 6.28;
      const cen = v => sx + (W * 0.5 - sx) * v + Math.sin(v * 3.4 + ph) * W * 0.16 * Math.pow(v, 0.8) - Math.sin(ph) * W * 0.16 * 0;
      const hw = v => 3 + W * 0.36 * Math.pow(v, 1.5);
      const xl = v => cen(v) - hw(v), xr = v => cen(v) + hw(v);
      const yv = v => top + (H - top) * v;
      const streaks = []; for (let i = 0; i < W * 0.45; i++) streaks.push({ u: r(), v: r(), sp: 0.6 + r() * 0.6, l: r() });
      const rocks = []; for (let i = 0; i < 5; i++) { const v = 0.3 + r() * 0.65, u = r() < 0.5 ? 0.08 + r() * 0.2 : 0.7 + r() * 0.22; rocks.push({ u, v, w: Math.round(2 + v * 5), h: Math.round(1 + v * 2) }); }
      return { hz, sx, top, xl, xr, yv, streaks, rocks, fish: null, nextFish: 15 + r() * 20, flies: [0, 1].map(() => ({ x: r() * W, y: H - 20 - r() * 15, vx: 0, vy: 0 })), ripples: [] };
    },
    build(T, env, s) {
      const { W, H } = env, hz = s.hz, r = RNG(env.seed), snow = env.weather === 'snow';
      const m1 = fbm(env.seed + 1, 4), m2 = fbm(env.seed + 2, 4);
      T.ridge(0, W, x => hz - 16 - m1(x * 0.018) * 30, env.col(snow ? '#a6b4cc' : '#7a8fb0', 0.85));
      T.ridge(0, W, x => hz - 6 - m2(x * 0.03 + 4) * 16, env.col(snow ? '#8696ae' : '#58788a', 0.6));
      for (let x = -4; x < W + 6; x += r.int(3, 6)) { if (r() < 0.55) A.pine(T, env, x, hz + r.int(2, 4), r.int(9, 16), 0.35, { snow }); else A.leafy(T, env, x, hz + r.int(3, 5), r.int(10, 15), 0.35, { snow }); }
      // 滝（岩の段から落ちる）
      const fx = s.sx, ft = hz - 8;
      T.poly([[fx - 13, hz + 4], [fx - 10, ft + 1], [fx - 5, ft - 2], [fx + 6, ft - 2], [fx + 11, ft + 2], [fx + 14, hz + 4]], env.col('#6a6e74', 0.3));
      T.poly([[fx - 10, ft + 1], [fx - 5, ft - 2], [fx + 6, ft - 2], [fx + 11, ft + 2], [fx + 6, ft], [fx - 5, ft]], env.col(snow ? '#eef2f8' : '#4e7a48', 0.3));
      T.line(fx - 9, ft + 4, fx - 7, hz + 2, env.col('#55595f', 0.3)); T.line(fx + 9, ft + 4, fx + 11, hz + 2, env.col('#55595f', 0.3));
      s.fall = { x: fx - 2, y: ft - 1, w: 5, h: hz + 4 - ft };
      // 滝の形を印の色で塗っておき、あとで木に隠れずに残ったところだけに水を流す（木の上に水しぶきが乗らないように）
      T.R(s.fall.x, s.fall.y, s.fall.w, s.fall.h, '#ff00fe');
      // 土手
      const bank = snow ? '#e8eef6' : '#5f8c46', bank2 = snow ? '#d4dee9' : '#6e9c52', mud = snow ? '#b8c2cc' : '#5c5240';
      T.R(0, hz + 3, W, H - hz, env.col(bank)); T.dith(0, hz + 3, W, H - hz - 3, env.col(bank), env.col(bank2), (i, j) => 0.3 + 0.25 * Math.sin(i * 0.11 + j * 0.2) * Math.sin(j * 0.05 + i * 0.02));
      // 岸の草むらと花（木より先に描く。花は小さなかたまりで、木の上には乗らない）
      if (!snow) for (let i = 0; i < W * (H - hz) / 90; i++) {
        const y = hz + 6 + Math.pow(r(), 0.7) * (H - hz - 6), v = (y - s.top) / (H - s.top), x = r() * W;
        if (x > s.xl(v) - 3 && x < s.xr(v) + 3) continue;
        if (r() < 0.62) A.tuft(T, x, y, Math.round(2 + v * 3), env.col('#4d7a3a'), env.col('#72a24e'));
        else { const fc = env.col(r.pick(['#f0d040', '#f0d040', '#e88aa8', '#b8a0e8', '#f4a060', '#f4f0e0'])), n2 = 1 + (v > 0.5 ? r.int(1, 3) : r.int(0, 1)); T.P(x, y + 1, env.col('#3f6a30')); for (let k = 0; k < n2; k++) T.P(x + r.int(-1, 1), y - r.int(0, 1), fc); }
      }
      // 奥の木々を岸に沿って
      for (let k = 0; k < 9; k++) { const v = 0.04 + k * 0.035 + r() * 0.03, left = k % 2 === 0, x = left ? s.xl(v) - 6 - r() * W * 0.1 : s.xr(v) + 6 + r() * W * 0.1; if (r() < 0.5) A.pine(T, env, x, s.yv(v), 10 + v * 40, 0.25 - v * 0.5, { snow }); else A.leafy(T, env, x, s.yv(v), 10 + v * 36, 0.25 - v * 0.5, { snow }); }
      // 川の形（岸はぬれた土）
      const N = 60, L = [], R = [];
      for (let k = 0; k <= N; k++) { const v = k / N; L.push([s.xl(v), s.yv(v)]); R.push([s.xr(v), s.yv(v)]); }
      T.poly(L.map(p => [p[0] - 2, p[1]]).concat(R.slice().reverse().map(p => [p[0] + 2, p[1]])), env.col(mud));
      // 水面：真ん中ほど深い色、ノイズで流れに沿った色むらをつける（同じ筋のくり返しにしない）
      const wn = E.fbm2(env.seed + 41, 3), wPal = ['#8ac0e2', '#6ea8d0', '#5a9ac8', '#4a8cc0', '#3a7cb2', '#336fa4'];
      for (let y = s.top; y < H; y++) {
        const v = (y - s.top) / (H - s.top), a = Math.round(s.xl(v)), b = Math.round(s.xr(v));
        for (let x = a; x < b; x++) {
          const u = (x - a) / Math.max(1, b - a), deep = Math.pow(Math.sin(u * Math.PI), 0.7), q = wn(x * 0.09 / (0.3 + v), y * 0.5 / (0.25 + v));
          const k = clamp(Math.floor((deep * 0.55 + q * 0.6 - 0.05 + v * 0.15) * wPal.length + (bay(x, y) < 0.35 ? 0.4 : 0)), 0, wPal.length - 1);
          T.P(x, y, env.col(wPal[k], 0.25 * (1 - v)));
        }
      }
      // 白い泡の筋：ところどころに、長さばらばらで少しだけ
      for (let i = 0; i < W * (H - s.top) / 70; i++) {
        const v = 0.08 + Math.pow(r(), 0.8) * 0.92, y = Math.round(s.yv(v)), a = s.xl(v), b = s.xr(v), L = 1 + r.int(0, Math.round(1 + v * 5)), x = a + r() * Math.max(1, b - a - L);
        if (wn(x * 0.2, y * 0.3) > 0.55) T.R(x, y, L, 1, env.col(r() < 0.5 ? '#b8dcf0' : '#2f6e9e', 0.2 * (1 - v)));
      }
      for (const rk of s.rocks) { const v = rk.v, x = lerp(s.xl(v), s.xr(v), rk.u), y = s.yv(v); A.rock(T, env, x, y, rk.w, rk.h, 0, snow); rk.x = x; rk.y = y; }
      // 岸の広葉樹と石
      const tl = Math.round(W * 0.14), tr = Math.round(W * 0.86);
      A.leafy(T, env, tl, Math.round(hz + (H - hz) * 0.42), Math.round(18 + (H - hz) * 0.18), 0.1, { snow });
      A.leafy(T, env, tr, Math.round(hz + (H - hz) * 0.32), Math.round(15 + (H - hz) * 0.14), 0.15, { snow });
      for (let i = 0; i < 8; i++) { const v = 0.25 + r() * 0.7, left = r() < 0.5; A.rock(T, env, left ? s.xl(v) - 3 - r() * 8 : s.xr(v) + 3 + r() * 8, s.yv(v), 2 + v * 3, 1 + v * 1.5, 0, snow); }
      // 水際のぬれた草
      for (let y = s.top; y < H; y++) { const v = (y - s.top) / (H - s.top); T.R(s.xl(v) - 3, y, 1 + v * 2, 1, env.col(snow ? '#c8d2dc' : '#3f6a36')); T.R(s.xr(v) + 2, y, 1 + v * 2, 1, env.col(snow ? '#c8d2dc' : '#3f6a36')); }
      // 滝の印の色が残ったところ＝見えている滝
      s.fallMask = null;
      { const f = s.fall, id = T.g.getImageData(f.x, f.y, f.w, f.h).data, m = []; for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) { const q = (j * f.w + i) * 4; if (id[q] >= 240 && id[q + 1] <= 20 && id[q + 2] >= 240) { m.push([i, j]); T.P(f.x + i, f.y + j, env.col('#bcdcf2', 0.25)); } } s.fallMask = m; }
      // 手前の葦
      if (!snow) {
        for (let x = 0; x < Math.min(W * 0.28, s.xl(0.95) + 10); x += r.int(1, 3)) { const h = r.int(6, 14), c = r() < 0.5 ? '#4f7a34' : '#6a9440'; T.V(x, H - h, h, env.col(c)); if (r() < 0.2) T.R(x, H - h - 3, 1, 3, env.col('#7a4a26')); }
        for (let x = Math.round(W * 0.85); x < W; x += r.int(2, 4)) A.tuft(T, x, H - 1, r.int(3, 6), env.col('#4d7a3a'), env.col('#6b9a4a'));
      }
    },
    front(T, env, s, t, dt) {
      const { W, H } = env;
      // 滝の流れ
      const f = s.fall;
      if (f && s.fallMask) {
        let lowest = -1;
        for (const [x, y] of s.fallMask) { const v = (((y * 2 - t * 26 + x * 5) % 7) + 7) % 7; T.P(f.x + x, f.y + y, env.col(v < 2.5 ? '#f2f8ff' : v < 5 ? '#bcdcf2' : '#8cc0e4', 0.25)); if (y > lowest) lowest = y; }
        // しぶきは、滝の下が見えているときだけ
        if (lowest >= f.h - 2) for (let k = 0; k < 6; k++) { const x = Math.floor(Math.random() * f.w); if (s.fallMask.some(([mx, my]) => mx === x && my >= f.h - 2)) T.P(f.x + x + Math.round((Math.random() - 0.5) * 2), f.y + f.h - 1 - Math.random() * 2, env.col('#ffffff', 0.2, 0.8)); }
      }
      // 水の流れ（手前ほど速く長い）
      const na = 1 - env.night * 0.65, hi = env.col('#cfe8f8', 0, (0.75 * na).toFixed(2)), hi2 = env.col('#9ccae8', 0, (0.6 * na).toFixed(2));   // 夜は流れの筋を控えめに
      for (const p of s.streaks) {
        p.v += dt * (0.03 + p.v * 0.06) * p.sp; if (p.v > 1) { p.v = 0; p.u = Math.random(); }
        const x = lerp(s.xl(p.v), s.xr(p.v), 0.04 + p.u * 0.92), y = s.yv(p.v), L = 1 + Math.round(p.v * (2 + p.l * 6));
        T.R(x, y, L, 1, p.sp > 0.9 ? hi : hi2);
      }
      for (const rk of s.rocks) if (rk.x !== undefined) for (let k = 0; k < 3; k++) T.P(rk.x - rk.w + Math.random() * rk.w * 2, rk.y - rk.h - 1 + Math.random() * 2, env.col('#ffffff', 0, 0.85));
      // 月の映り込み
      const mo = env.skyState.moon;
      // 月の映り込み：決まった場所に置き、ゆっくりゆらめかせる（毎回ばらばらに出すと速く流れて見える）
      if (mo && env.night > 0.5 && env.weather !== 'fog') for (let k = 0; k < 12; k++) { const v = 0.08 + k / 12 * 0.9, y = Math.round(s.yv(v)), xc = lerp(s.xl(v), s.xr(v), clamp((mo.x - s.xl(v)) / (s.xr(v) - s.xl(v)), 0.15, 0.85)), a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.7 + k * 2.1)); T.R(Math.round(xc - (1 + v * 3) / 2 + Math.sin(t * 0.5 + k) * 1.2), y, Math.round(1 + v * 4), 1, `rgba(230,236,255,${a.toFixed(2)})`); }
      // 雨の波紋
      if (env.weather === 'rain') { if (Math.random() < dt * 10) { const v = 0.1 + Math.random() * 0.9; s.ripples.push({ x: lerp(s.xl(v), s.xr(v), Math.random()), y: s.yv(v), r: 0 }); } }
      s.ripples = s.ripples.filter(q => { q.r += dt * 6; T.ellipse(q.x, q.y, Math.round(q.r), Math.max(0, Math.round(q.r * 0.35)), env.col('#d8ecfa', 0, Math.max(0, 0.5 - q.r * 0.12).toFixed(2))); return q.r < 4; });
      // 魚が跳ねる
      s.nextFish -= dt;
      if (s.nextFish < 0 && !s.fish && env.night < 0.6) { const v = 0.35 + Math.random() * 0.55; s.fish = { x: lerp(s.xl(v), s.xr(v), 0.3 + Math.random() * 0.4), y: s.yv(v), t: 0, dir: Math.random() < 0.5 ? 1 : -1 }; s.nextFish = 25 + Math.random() * 40; }
      if (s.fish) {
        const F = s.fish; F.t += dt; const p = F.t / 0.7;
        if (p < 1) { const x = F.x + F.dir * p * 6, y = F.y - Math.sin(p * Math.PI) * 6; T.R(x - 1, y, 3, 1, env.col('#c8d2dc')); T.P(x + F.dir * 2, y - 1, env.col('#9aa6b4')); }
        else { if (!F.splashed) { F.splashed = true; s.ripples.push({ x: F.x + F.dir * 6, y: F.y, r: 0 }); if (window.TookuPlayer) window.TookuPlayer.ambEvent('splash'); } if (p > 1.6) s.fish = null; }
      }
      // とんぼ（昼）
      if (env.night < 0.4 && env.weather !== 'rain' && env.weather !== 'snow') for (const d of s.flies) {
        d.vx += (Math.random() - 0.5) * 40 * dt; d.vy += (Math.random() - 0.5) * 30 * dt; d.vx *= 0.96; d.vy *= 0.94;
        d.x = clamp(d.x + d.vx * dt, 4, W - 4); d.y = clamp(d.y + d.vy * dt, H * 0.6, H - 6);
        T.R(d.x - 1, d.y, 3, 1, env.col('#3a6ad0')); if (Math.sin(t * 40) > 0) { T.P(d.x, d.y - 1, env.col('#e0f0ff', 0, 0.7)); T.P(d.x - 1, d.y - 1, env.col('#e0f0ff', 0, 0.7)); }
      }
    },
    glow(g, env, s, t) { A.fireflies(g, env, s, t, { x: 0, y: env.H * 0.62, w: env.W, h: env.H * 0.36 }, 14); }
  });

  /* ============ 誰もいない街角 ============ */
  const FACADE = [['#d9b48a', '#b8946c'], ['#c98f6a', '#a87250'], ['#e2d0a2', '#c2ae80'], ['#9fb6a4', '#7e9684'], ['#c9a7a2', '#a88884'], ['#b8a790', '#988870'], ['#d6c6b2', '#b4a490'], ['#a9b9ca', '#8899aa'], ['#e3c9b0', '#c2a68c']];
  A.add({
    id: 'town', name: '誰もいない街角', weather: { clear: 4, cloudy: 2, rain: 3, fog: 2, snow: 1 },
    horizon: env => Math.round(env.H * 0.62),
    cloudTop: 0.35,
    amb: env => [['town', 0.6], ['wind', 0.25], env.night < 0.5 ? ['birds', 0.25] : ['crickets', 0.2]],
    init(env, r) {
      const { W, H } = env, st = H - A.groundDepth(H, 0.27, 22, 66);
      return { st, wins: [], lamps: [], cat: null, nextCat: 10 + r() * 30, pigeons: [0, 1, 2].map(i => ({ x: W * (0.15 + i * 0.3) + r() * W * 0.12, ph: r() * 6 })) };
    },
    build(T, env, s) {
      const { W, H } = env, st = s.st, r = RNG(env.seed), snow = env.weather === 'snow';
      // 遠くの屋根と時計塔
      const far = env.col('#8a8fa8', 0.7);
      for (let x = -4; x < W; x += r.int(8, 16)) { const h = r.int(st * 0.28, st * 0.42); T.R(x, st - h, r.int(8, 16), h, far); if (r() < 0.35) T.poly([[x, st - h], [x + 6, st - h - 5], [x + 12, st - h]], far); }
      const tw = Math.round(W * (0.3 + r() * 0.4));
      T.R(tw - 3, st * 0.3, 7, st, env.col('#7a7f98', 0.6)); T.poly([[tw - 4, st * 0.3], [tw, st * 0.3 - 12], [tw + 4, st * 0.3]], env.col('#5f6a88', 0.6));
      T.circ(tw, st * 0.3 + 5, 2, env.col('#e8e0c8', 0.5)); s.clock = { x: tw, y: Math.round(st * 0.3 + 5) };
      // 建物
      s.wins = []; s.lamps = [];
      let x = -r.int(2, 12);
      while (x < W) {
        const w = r.int(24, 40), floors = clamp(Math.floor((st * (0.55 + r() * 0.22)) / 13), 2, 8), fh = 13, top = st - floors * fh - 4;
        const [c, c2] = FACADE[r.int(0, FACADE.length - 1)];
        T.R(x, top, w, st - top, env.col(c)); T.R(x + w - 2, top, 2, st - top, env.col(c2));
        // 屋根
        if (r() < 0.6) { T.poly([[x - 1, top], [x + 3, top - 8], [x + w - 3, top - 8], [x + w + 1, top]], env.col('#7a4a3c')); T.H(x - 1, top - 8, w + 2, env.col('#9a5e4a')); if (r() < 0.7) { const cx = x + r.int(4, w - 6); T.R(cx, top - 13, 3, 6, env.col('#8a5a48')); } }
        else { T.R(x - 1, top - 2, w + 2, 2, env.col(c2)); T.R(x - 1, top - 3, w + 2, 1, env.col('#efe6d6')); }
        // 窓
        const cols = Math.max(2, Math.floor((w - 6) / 8)), gap = (w - cols * 4) / (cols + 1), shut = r.pick(['#4a6e5a', '#4f6a8e', '#8a4a3e', null]);
        for (let f = 1; f < floors; f++) for (let k = 0; k < cols; k++) {
          const wx = Math.round(x + gap + k * (4 + gap)), wy = st - 4 - f * fh - 9;
          T.R(wx - 1, wy - 1, 6, 8, env.col('#efe6d6')); T.R(wx, wy, 4, 6, env.col('#3a4656')); T.R(wx, wy, 4, 1, env.col('#56647a'));
          if (shut) { T.R(wx - 2, wy, 1, 6, env.col(shut)); T.R(wx + 4, wy, 1, 6, env.col(shut)); }
          if (r() < 0.3) { T.R(wx - 1, wy + 6, 6, 1, env.col('#6a4a34')); for (let q = 0; q < 3; q++) T.P(wx + q * 2, wy + 5, env.col(r.pick(['#d84a5a', '#f0a0b0', '#e8d040', '#ffffff']))); }
          s.wins.push(A.makeWindow(wx, wy, 4, 6, r));
        }
        // 1階：店か入口
        const gy = st - 13;
        if (r() < 0.55) {
          T.R(x + 3, gy + 2, w - 6, 9, env.col('#2e3644')); T.R(x + 4, gy + 3, w - 8, 7, env.col('#46566a'));
          const aw = r.pick([['#c84a42', '#f2ece0'], ['#3f7a52', '#f2ece0'], ['#2f5a8a', '#f2ece0']]);
          for (let i = 0; i < w - 2; i++) T.R(x + 1 + i, gy - 1, 1, 3, env.col(aw[(i >> 1) & 1]));
          T.R(x + 1, gy + 2, w - 2, 1, env.col('#00000000'));
          s.wins.push(Object.assign(A.makeWindow(x + 4, gy + 3, w - 8, 7, r), { warm: true }));
        } else { const dx = x + Math.round(w / 2) - 2; T.R(dx, gy + 2, 5, 11, env.col('#5a3a2a')); T.R(dx, gy + 2, 5, 1, env.col('#8a6a4a')); T.P(dx + 3, gy + 7, env.col('#e0c060')); }
        x += w;
      }
      // 歩道と石畳
      T.R(0, st, W, 4, env.col('#a8a29a')); T.R(0, st, W, 1, env.col('#c8c2b8')); T.R(0, st + 4, W, 1, env.col('#6a6662'));
      for (let y = st + 5; y < H; y++) for (let xx = 0; xx < W; xx++) {
        const row = Math.floor((y - st - 5) / 3), off = (row % 2) * 2, edge = (y - st - 5) % 3 === 2 || (xx + off) % 5 === 4;
        T.P(xx, y, env.col(edge ? '#54504c' : ((xx + off) * 7 + row * 3) % 5 < 2 ? '#7c7772' : '#6c6863'));
      }
      if (env.weather === 'rain') for (let i = 0; i < W / 6; i++) T.ellipse(r() * W, st + 7 + r() * (H - st - 9), r.int(3, 7), 1, env.col('#4a5868'));
      // 街灯・ベンチ・自転車・カフェの椅子
      for (let lx = r.int(10, 30); lx < W; lx += r.int(46, 64)) {
        T.R(lx, st - 22, 1, 23, env.col('#2c3034')); T.R(lx - 1, st - 1, 3, 1, env.col('#2c3034'));
        T.R(lx - 2, st - 26, 5, 4, env.col('#2c3034')); T.R(lx - 1, st - 25, 3, 2, env.col('#d8d0b0')); T.H(lx - 2, st - 27, 5, env.col('#2c3034'));
        s.lamps.push({ x: lx, y: st - 24 });
      }
      const bxx = Math.round(W * 0.62); T.R(bxx, st - 4, 12, 1, env.col('#6a4a34')); T.R(bxx, st - 6, 12, 1, env.col('#6a4a34')); T.V(bxx + 1, st - 4, 4, env.col('#2c3034')); T.V(bxx + 10, st - 4, 4, env.col('#2c3034'));
      const bk = Math.round(W * 0.2); T.circ(bk, st - 2, 2, env.col('#2c3034')); T.circ(bk + 7, st - 2, 2, env.col('#2c3034')); T.circ(bk, st - 2, 1, env.col(FACADE[0][0])); T.circ(bk + 7, st - 2, 1, env.col(FACADE[0][0])); T.line(bk, st - 2, bk + 3, st - 6, env.col('#3a6a9a')); T.line(bk + 3, st - 6, bk + 7, st - 2, env.col('#3a6a9a')); T.line(bk + 3, st - 6, bk + 6, st - 6, env.col('#3a6a9a'));
      const cf = Math.round(W * 0.42); for (let k = 0; k < 2; k++) { T.R(cf + k * 9, st - 4, 5, 1, env.col('#d8d8d0')); T.V(cf + k * 9 + 2, st - 3, 3, env.col('#5a5a5a')); }
      if (snow) T.R(0, st, W, 1, env.col('#f4f8fc'));
    },
    front(T, env, s, t, dt) {
      const { W } = env, st = s.st;
      // 雨の日：街灯が路面に映る
      if (env.weather === 'rain' && env.lights > 0.1) for (const l of s.lamps) for (let y = st + 6; y < env.H; y += 2) if (Math.random() < 0.7) T.R(l.x - 1 + Math.sin(t * 3 + y) * 0.8, y, 2, 1, `rgba(255,214,140,${0.35 * env.lights * (1 - (y - st) / (env.H - st))})`);
      // ハト（昼）
      if (env.night < 0.4 && env.weather !== 'rain') for (const p of s.pigeons) {
        const vx = Math.sin(t * 0.3 + p.ph); p.x += vx * dt * 2; if (Math.abs(vx) > 0.05) p.face = vx < 0 ? -1 : 1; const peck = Math.sin(t * 2 + p.ph) > 0.6;   // 歩く向きに顔を向ける
        // 輪郭つきのハト（右向き。ふっくらした胴・首の緑・黄色い目・赤い足。ついばむときは頭を下げる）
        const spr = peck
          ? ['..........', '.ooooo....', 'obbbbbooo.', 'owwbbbggho', '.oooooohhe', '...f.f..ok']
          : ['......ooo.', '.....ohhho', '.....ohhek', '.ooooogg..', 'obbbbbbgo.', 'owwbbbbbo.', '.oooooooo.', '...f.f....'];
        T.spr(spr, p.x - 5, st + (peck ? 5 : 3), { o: env.col('#2a2c33'), b: env.col('#b4b8c4'), w: env.col('#8a8f9c'), g: env.col('#6a9a8a'), h: env.col('#7e8494'), e: env.col('#f0c040'), k: env.col('#d8b0a0'), f: env.col('#e0805a') }, (p.face || 1) < 0);
      }
      // 猫がときどき通る
      s.nextCat -= dt;
      if (s.nextCat < 0 && !s.cat) { s.cat = { x: -8, dir: 1, sit: 0, sitAt: W * (0.3 + Math.random() * 0.4) }; if (Math.random() < 0.5) { s.cat.x = W + 8; s.cat.dir = -1; } s.nextCat = 40 + Math.random() * 60; }
      if (s.cat) {
        const c = s.cat, col = { k: env.col('#2a2a30'), e: 'rgba(240,220,120,0.9)' };
        if (!c.sat && Math.abs(c.x - c.sitAt) < 1) { c.sit = 6 + Math.random() * 6; c.sat = true; }
        if (c.sit > 0) { c.sit -= dt; T.spr(['k.k.', 'kek.', 'kkk.', 'kkkk', 'kkkk'], c.x, st - 5, col, c.dir < 0); }
        else { c.x += c.dir * 6 * dt; const fr = Math.floor(t * 6) % 2; T.spr(fr ? ['k...k.', 'kkkkke', '.kkkk.', 'k.k..k'] : ['k...k.', 'kkkkke', '.kkkk.', '.k.kk.'], c.x, st - 4, col, c.dir < 0); }
        if (c.x < -12 || c.x > W + 12) s.cat = null;
      }
    },
    glow(g, env, s, t) {
      A.windowLights(g, env, s, s.wins, t);
      if (env.lights > 0.1) for (const l of s.lamps) {
        g.fillStyle = `rgba(255,230,170,${0.6 + 0.4 * env.lights})`; g.fillRect(l.x - 1, l.y - 1, 3, 2);
        glow(g, l.x, l.y, 16, '#ffc070', 0.45 * env.lights, 5);
        glow(g, l.x, s.st + 3, 10, '#ffc070', 0.25 * env.lights, 3);
      }
      if (env.lights > 0.2 && s.clock) glow(g, s.clock.x, s.clock.y, 4, '#fff0c0', 0.3 * env.lights, 2);
    }
  });

  /* ============ 雪だるまの丘（ゆきころバトルの別の日） ============ */
  const KID = [['.HH..', '.HH..', '.FF..', 'SSS..', 'JJJJ.', '.JJ..', '.L.L.'], ['.HH..', '.HH..', '.FF..', 'SSS..', 'JJJJ.', '.JJ..', '..LL.']];
  const KID_COL = [['#d8443c', '#f2c94c', '#c83a32'], ['#3a6ad0', '#e8e8f0', '#2f58b8'], ['#f0b030', '#d84a6a', '#e0a020']];
  A.add({
    id: 'snowman', name: '雪だるまの丘', weather: { snow: 4, clear: 3, cloudy: 2, fog: 1 },
    horizon: env => env.H - A.groundDepth(env.H, 0.5, 46, 130), snowCaps: false,
    amb: env => [['wind', 0.45], env.night < 0.4 ? ['birds', 0.15] : ['crickets', 0]],
    init(env, r) {
      const { W, H } = env, hz = H - A.groundDepth(H, 0.5, 46, 130), gy = Math.round(H - (H - hz) * 0.3);
      const lodge = { x: Math.round(W * (W < 140 ? 0.74 : 0.76)), y: Math.round(hz + (H - hz) * 0.28) };
      const s = { hz, gy, lodge, kids: KID_COL.map((c, i) => ({ x: W * (0.2 + i * 0.2), y: gy, c, dir: 1, walk: 0, jump: 0 })), balls: [], men: [], trail: [], phase: 'start', timer: 1, smoke: [], chairs: [] };
      // 最初からひとつ完成している
      s.men.push({ x: Math.round(W * 0.12 + 6), y: gy, r1: 6, r2: 4, deco: 1, hat: r() < 0.5 });
      return s;
    },
    build(T, env, s) {
      const { W, H } = env, hz = s.hz, r = RNG(env.seed);
      const m1 = fbm(env.seed + 1, 5), m2 = fbm(env.seed + 2, 4);
      // 三角の峰をいくつか重ねる。左の面に日が当たる
      const pk = []; for (let x = -20; x < W + 30; x += r.int(22, 40)) pk.push({ x, h: r.int(18, Math.min(52, hz - 6)), s: r.range(0.75, 1.25) });
      const peakOf = x => { let best = null, by = 1e9; for (const p of pk) { const y = hz - p.h + Math.abs(x - p.x) * p.s; if (y < by) { by = y; best = p; } } return [by + m1(x * 0.15) * 3, best]; };
      for (let x = 0; x < W; x++) {
        const [y, p] = peakOf(x), lit = x < p.x, top = Math.round(y);
        T.R(x, top, 1, hz - top + 2, env.col(lit ? '#f2f6fb' : '#b4c4da', 0.6));
        // 岩肌のすじ
        const n3 = m2(x * 0.5 + 40); if (n3 > 0.55) T.R(x, top + 3 + (n3 * 14 | 0), 1, 2 + (n3 * 6 | 0), env.col(lit ? '#c8d4e2' : '#8e9fb8', 0.6));
        const rockLine = hz - 6 - m2(x * 0.2) * 8; if (rockLine > top) T.R(x, rockLine, 1, hz - rockLine + 2, env.col(lit ? '#d8e2ee' : '#9fb0c8', 0.6));
      }
      T.ridge(0, W, x => hz - 4 - m2(x * 0.04 + 3) * 10, env.col('#dfe7f1', 0.4));
      for (let x = -4; x < W + 6; x += r.int(3, 6)) A.pine(T, env, x, hz + r.int(1, 4), r.int(8, 14), 0.3, { snow: true, dark: '#24483a', light: '#2f5a46' });
      // 雪の斜面
      T.R(0, hz + 3, W, H - hz, env.col('#f4f7fb'));
      T.dith(0, hz + 3, W, H - hz - 3, env.col('#f4f7fb'), env.col('#dfe8f3'), (i, j) => 0.18 + 0.28 * Math.sin(i * 0.05 + j * 0.15) * Math.sin(j * 0.07));
      for (let i = 0; i < 4; i++) T.ellipse(r() * W, hz + 6 + r() * (H - hz - 8), r.int(10, 24), r.int(2, 4), env.col('#e6edf6'));
      // 宿
      const L = s.lodge, lw = 26, lh = 12;
      T.R(L.x - lw / 2, L.y - lh, lw, lh, env.col('#8a5a3a'));
      for (let y = L.y - lh + 2; y < L.y; y += 3) T.H(L.x - lw / 2, y, lw, env.col('#74482c'));
      T.poly([[L.x - lw / 2 - 3, L.y - lh + 1], [L.x, L.y - lh - 12], [L.x + lw / 2 + 3, L.y - lh + 1]], env.col('#5e3a26'));
      T.poly([[L.x - lw / 2 - 3, L.y - lh], [L.x, L.y - lh - 13], [L.x + lw / 2 + 3, L.y - lh], [L.x + lw / 2 - 1, L.y - lh - 2], [L.x, L.y - lh - 10], [L.x - lw / 2 + 1, L.y - lh - 2]], env.col('#f6f9fc'));
      T.R(L.x + 6, L.y - lh - 14, 3, 6, env.col('#6a5a52')); T.R(L.x + 6, L.y - lh - 15, 3, 1, env.col('#f6f9fc'));
      s.wins = [];
      for (const dx of [-9, -3, 5]) { T.R(L.x + dx - 1, L.y - 9, 5, 5, env.col('#5e3a26')); T.R(L.x + dx, L.y - 8, 3, 3, env.col('#3a3040')); s.wins.push(Object.assign(A.makeWindow(L.x + dx, L.y - 8, 3, 3, r), { warm: true, steady: true, th: 0.1 })); }
      T.R(L.x - 1, L.y - 6, 3, 6, env.col('#4a2e1e'));
      T.R(L.x - lw / 2 - 2, L.y, lw + 4, 2, env.col('#f6f9fc'));
      s.chim = { x: L.x + 7, y: L.y - lh - 16 };
      // 手前の大きな木は別の絵に描き、雪だるまと子どもより前に重ねる（木の上に雪だるまが乗って見えないように）
      const fc = document.createElement('canvas'); fc.width = W; fc.height = H; const fg = fc.getContext('2d'), fT = E.tools(fg);
      const big = Math.min(Math.max(H - hz, H * 0.56), W * 1.1);
      A.bigPine(fT, env, Math.round(W * 0.02), H + 2, Math.round(big * 0.86), 0, { snow: true });
      A.bigPine(fT, env, Math.round(W * 0.98), H + 3, Math.round(big * 0.72), 0, { snow: true });
      s.fg = fc;
      // 雪だるまを作れる横の範囲：子どもの目の高さで木にかからないところ
      const row = fg.getImageData(0, s.gy - 12, W, 1).data, solid = x => row[x * 4 + 3] > 100;
      let a = 0; while (a < W && solid(a)) a++;
      let b = W - 1; while (b > a && solid(b)) b--;
      s.free = [a + 8, b - 8];
      if (s.men[0] && !s.men[0].placed) { s.men[0].x = Math.round(a + 10); s.men[0].placed = true; }
    },
    front(T, env, s, t, dt) {
      const { W } = env, sn = '#f6f9fc', sh = '#c8d4e4';
      // 煙突の煙
      if (s.chim && Math.random() < dt * 1.2) s.smoke.push({ x: s.chim.x, y: s.chim.y, r: 1, a: 0.35 });
      s.smoke = s.smoke.filter(p => { p.y -= 4 * dt; p.x += 2 * dt; p.r += 0.4 * dt; p.a -= 0.04 * dt; if (p.a > 0) T.circ(p.x, p.y, Math.round(p.r), env.col('#d8dce4', 0.2, p.a.toFixed(2))); return p.a > 0; });
      // 転がした跡
      for (const p of s.trail) T.P(p[0], p[1], env.col('#d4dfec'));
      // 完成した雪だるま
      const drawMan = m => {
        const c1 = env.col(sn), c2 = env.col(sh);
        T.circ(m.x, m.y - m.r1, m.r1, c2); T.circ(m.x - 0.5, m.y - m.r1 - 0.5, m.r1 - 1, c1);
        if (m.r2 && m.liftP !== undefined && m.liftP < 1) {
          const p = m.liftP, hyF = m.y - m.r1 * 2 - m.r2 + 1, hx = m.x + m.side * (m.r1 + m.r2 + 1) * (1 - p), hy = lerp(m.y - m.r2, hyF, p) - Math.sin(Math.PI * p) * 5;
          T.circ(hx, hy, m.r2, c2); T.circ(hx - 0.5, hy - 0.5, m.r2 - 1, c1); return;
        }
        if (m.r2) { const hy = m.y - m.r1 * 2 - m.r2 + 1; T.circ(m.x, hy, m.r2, c2); T.circ(m.x - 0.5, hy - 0.5, m.r2 - 1, c1);
          if (m.deco > 0.2) { T.P(m.x - 1, hy - 1, env.col('#222')); T.P(m.x + 1, hy - 1, env.col('#222')); }
          if (m.deco > 0.4) { T.P(m.x + 2, hy, env.col('#f08a2a')); T.P(m.x + 3, hy, env.col('#f08a2a')); }
          if (m.deco > 0.6) { T.line(m.x - m.r1 + 1, m.y - m.r1 - 1, m.x - m.r1 - 3, m.y - m.r1 - 4, env.col('#6a4a2a')); T.line(m.x + m.r1 - 1, m.y - m.r1 - 1, m.x + m.r1 + 3, m.y - m.r1 - 4, env.col('#6a4a2a')); }
          if (m.deco > 0.8) { T.P(m.x, m.y - m.r1 - 2, env.col('#333')); T.P(m.x, m.y - m.r1, env.col('#333')); }
          if (m.deco >= 1 && m.hat) { T.R(m.x - 3, hy - m.r2, 7, 1, env.col('#2a2a32')); T.R(m.x - 2, hy - m.r2 - 3, 5, 3, env.col('#2a2a32')); T.H(m.x - 2, hy - m.r2 - 1, 5, env.col('#c83a32')); }
          else if (m.deco >= 1) { T.R(m.x - 2, hy + m.r2 - 1, 5, 1, env.col('#3a8ad0')); }
        }
      };
      s.men.forEach(drawMan);
      const kidsOut = env.night < 0.6;
      if (!kidsOut) { if (s.fg) T.g.drawImage(s.fg, 0, 0); return; }
      // 子どもたちの作業
      const K = s.kids;
      s.timer -= dt;
      const walkTo = (k, x, sp) => { const d = x - k.x; if (Math.abs(d) < 0.6) { k.walk = 0; return true; } k.dir = Math.sign(d); k.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt); k.walk += dt; return false; };
      if (s.phase === 'start' && s.timer < 0) {
        const used = s.men.map(m => m.x);
        let bx = 0; for (let tries = 0; tries < 20; tries++) { const F = s.free || [W * 0.18, W * 0.68]; bx = F[0] + 14 + Math.random() * Math.max(1, F[1] - F[0] - 28); if (used.every(u => Math.abs(u - bx) > 18) && Math.abs(bx - s.lodge.x) > 22) break; }
        bx = Math.round(bx);
        const dirA = Math.random() < 0.5 ? 1 : -1;
        s.build = { bx, base: { x: bx - dirA * 36, r: 1.5, target: 6, dir: dirA, kid: 0, stop: bx }, head: { x: bx + dirA * 30, r: 1.5, target: 4, dir: -dirA, kid: 1, stop: bx + dirA * 11 } };
        s.balls = [s.build.base, s.build.head];
        s.phase = 'go';
      }
      if (s.phase === 'go') {
        let arrived = 0;
        for (const b of s.balls) {
          const k = K[b.kid], behind = b.x - b.dir * (b.r + 3);
          if (Math.abs(k.x - behind) > 1) { walkTo(k, behind, 9); }
          else if (Math.abs(b.x - b.stop) > 0.6) {
            const sp = 2.6; b.x += b.dir * sp * dt; b.r = Math.min(b.target, b.r + 0.32 * dt); k.x = b.x - b.dir * (b.r + 3); k.dir = b.dir; k.walk += dt;
            if (Math.random() < 0.5) { s.trail.push([Math.round(b.x), s.gy + 1]); if (s.trail.length > 400) s.trail.shift(); }
          } else { arrived++; k.walk = 0; }
        }
        walkTo(K[2], s.build.bx + 9, 7);
        if (arrived === 2) { s.phase = 'stack'; s.timer = 1.4; s.man = { x: s.build.bx, y: s.gy, r1: s.build.base.r, r2: s.build.head.r, deco: 0, liftP: 0, side: s.build.head.dir < 0 ? 1 : -1, hat: Math.random() < 0.5 }; s.balls = []; }
      }
      if (s.phase === 'stack') {
        s.man.liftP = clamp(1 - s.timer / 1.4, 0, 1); s.man.deco = 0;
        if (s.timer < 0) { s.man.liftP = 1; s.phase = 'deco'; s.timer = 4; }
      }
      if (s.phase === 'deco') { s.man.deco = Math.min(1, 1 - s.timer / 4); if (s.timer < 0) { s.phase = 'cheer'; s.timer = 3.5; s.men.push(s.man); if (s.men.length > 3) s.men.shift(); s.man = null; } }
      if (s.phase === 'cheer') { for (const k of K) k.jump = Math.abs(Math.sin(t * 7 + k.x)) * 3; if (s.timer < 0) { for (const k of K) k.jump = 0; s.phase = 'rest'; s.timer = 10 + Math.random() * 10; s.dest = K.map(() => { const F = s.free || [W * 0.15, W * 0.75]; return F[0] + Math.random() * (F[1] - F[0]); }); } }
      if (s.phase === 'rest') { K.forEach((k, i) => walkTo(k, s.dest[i], 5)); if (s.timer < 0) { s.phase = 'start'; s.timer = 0.5; } }
      // 作りかけ
      if (s.man) drawMan(s.man);
      for (const b of s.balls) { T.circ(b.x, s.gy - b.r, Math.round(b.r), env.col(sh)); T.circ(b.x - 0.5, s.gy - b.r - 0.5, Math.max(1, Math.round(b.r) - 1), env.col(sn)); }
      for (const k of K) {
        const fr = KID[Math.floor(k.walk * 6) % 2], map = { H: env.col(k.c[0]), F: env.col('#f2caa0'), S: env.col(k.c[1]), J: env.col(k.c[2]), L: env.col('#3a3f58') };
        T.spr(fr, k.x - 2, s.gy - 7 - (k.jump || 0), map, k.dir < 0);
      }
      if (s.fg) T.g.drawImage(s.fg, 0, 0);
    },
    glow(g, env, s, t) { A.windowLights(g, env, s, s.wins || [], t); if (env.lights > 0.1) glow(g, s.lodge.x, s.lodge.y - 6, 20, '#ffb060', 0.25 * env.lights, 4); }
  });
})();
