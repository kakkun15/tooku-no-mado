/* とおくの窓：景色（山頂・空に浮かぶ街・どこかの住宅街・アメリカの田舎町） */
(function () {
  'use strict';
  const E = window.TookuEngine, A = window.TookuArt, { RNG, fbm, noise1, bay, clamp, lerp, glow } = E;

  /* ============ 山頂からの景色 ============ */
  A.add({
    id: 'summit', name: '誰も来ない山頂', weather: { clear: 5, cloudy: 2, fog: 2, snow: 2 }, milky: true,
    horizon: env => env.H - A.groundDepth(env.H, 0.46, 42, 126), cloudTop: 0.45, cloudMul: 0.6,
    amb: () => [['wind', 1]],
    wind: () => -30,
    init(env, r) {
      const { W, H } = env, sea = H - A.groundDepth(H, 0.46, 42, 126);
      return { sea, hawk: { a: 0, cx: W * 0.6, cy: sea - 30, on: false, next: 10 + r() * 30 }, n1: fbm(r() * 1e5 | 0, 4), n2: fbm(r() * 1e5 | 0, 3), flag: [] };
    },
    build(T, env, s) {
      const { W, H } = env, sea = s.sea, r = RNG(env.seed), snow = env.weather === 'snow';
      // 雲海から突き出る遠い峰々
      const peaks = []; for (let x = r.int(-10, 10); x < W + 20; x += r.int(18, 34)) peaks.push({ x, h: r.int(10, Math.min(46, sea * 0.55)), s: r.range(0.8, 1.4), d: r.range(0.45, 0.8) });
      peaks.sort((a, b) => b.d - a.d);
      for (const p of peaks) {
        const top = sea - p.h, w = p.h / p.s;
        for (let x = Math.round(p.x - w); x <= p.x + w; x++) {
          const y = top + Math.abs(x - p.x) * p.s + s.n2(x * 0.3) * 2, lit = x < p.x;
          T.R(x, y, 1, sea + 6 - y, env.col(lit ? '#8a9ab4' : '#66789a', p.d));
          const snowH = p.h * 0.45; if (y < top + snowH) T.R(x, y, 1, Math.max(1, top + snowH - y + s.n1(x * 0.4) * 3), env.col(lit ? '#f4f7fb' : '#c4d0e2', p.d));
        }
      }
      // 手前の岩の頂
      const px = Math.round(W * (W > H ? 0.36 : 0.45)), py = Math.round(H - (H - sea) * 0.78);
      const prof = x => { const d = (x - px) / W; return py + Math.abs(d) * (H - py) * (d < 0 ? 1.7 : 1.15) + s.n1(x * 0.12) * 5 - 2; };
      for (let x = 0; x < W; x++) {
        const y = Math.round(prof(x));
        for (let yy = y; yy < H; yy += 2) { const lit = x < px + (s.n2(yy * 0.15 + 3) - 0.5) * 18 + (yy - y) * 0.25; T.R(x, yy, 1, 2, env.col(lit ? '#7c736c' : '#5d5650')); }
        const lit = x < px;
        for (let k = 0; k < 3; k++) { const yy = y + 2 + ((s.n2(x * 0.7 + k * 9) * (H - y)) | 0); if ((x + k * 3) % 7 === 0) T.R(x, yy, 1, 2, env.col('#4a4440')); }
        T.P(x, y, env.col(lit ? '#9a918a' : '#6e6660'));
        if (snow || s.n2(x * 0.3) > 0.7) T.R(x, y, 1, snow ? 2 : 1, env.col('#eef2f8'));
      }
      for (let i = 0; i < W / 3; i++) { const x = r() * W, y = prof(x) + r() * (H - prof(x)); T.R(x, y, r.int(2, 4), 1, env.col('#a59c94')); }
      // 高山の草
      if (!snow) for (let i = 0; i < W / 4; i++) { const x = r() * W, y = prof(x) + 1 + r() * 6; A.tuft(T, x, y, r.int(1, 3), env.col('#6a7a44'), env.col('#8a9a54')); }
      // ケルン（石積み）と古い道標
      const cy = Math.round(prof(px)), cs = [[7, 2], [6, 2], [5, 2], [4, 2], [3, 1], [2, 1]];
      let yy = cy;
      for (const [w, h] of cs) { T.R(px - w / 2 + 1, yy - h, w, h, env.col('#8c847c')); T.H(px - w / 2 + 1, yy - h, w, env.col('#aca49a')); T.P(px - w / 2 + 1, yy - 1, env.col('#5e5852')); yy -= h; }
      const mx = px + 9, my = Math.round(prof(mx));
      T.R(mx, my - 14, 1, 14, env.col('#6a5040')); T.R(mx - 3, my - 12, 7, 2, env.col('#8a6a50'));
      s.flagAt = { x: mx + 1, y: my - 14 };
    },
    back(T, env, s, t) {
      const { W, H } = env, sea = s.sea;
      // 流れる雲海（奥から手前へ二層）
      const c1 = E.css(env.sky.cloud), c2 = E.css(env.sky.cloudS), c0 = E.css(E.mixc(env.sky.cloud, env.sky.bot, 0.5));
      for (let x = 0; x < W; x++) { const y = sea - 2 + s.n1((x + t * 0.8) * 0.04) * 7; T.R(x, y, 1, 3, c0); T.R(x, y + 3, 1, H - y, c2); }
      for (let x = 0; x < W; x++) { const y = sea + 4 + s.n2((x - t * 1.6) * 0.05 + 30) * 9; T.R(x, y, 1, 2, c1); T.R(x, y + 2, 1, 3, E.css(E.mixc(env.sky.cloud, env.sky.cloudS, 0.4))); T.R(x, y + 5, 1, H - y, c2); }
      // タカ
      const h = s.hawk;
      if (env.night < 0.4) {
        h.next -= 1 / 15; if (!h.on && h.next < 0) { h.on = true; h.a = 0; h.cx = W * (0.25 + Math.random() * 0.5); h.cy = sea * (0.35 + Math.random() * 0.3); }
        if (h.on) { h.a += 0.025; const x = h.cx + Math.cos(h.a) * 22, y = h.cy + Math.sin(h.a) * 6, up = Math.sin(t * 5) > 0.7, c = env.col('#3a3030', 0.2);
          T.R(x - 1, y, 3, 1, c); T.P(x - 2, y + (up ? -1 : 0), c); T.P(x + 2, y + (up ? -1 : 0), c); T.P(x - 3, y + (up ? -1 : 1), c); T.P(x + 3, y + (up ? -1 : 1), c);
          if (h.a > 6.28 * 2.5) { h.on = false; h.next = 40 + Math.random() * 60; } }
      }
    },
    front(T, env, s, t) {
      // はためく布切れ
      const f = s.flagAt; if (!f) return;
      const c = env.col('#c84040'), c2 = env.col('#a02e2e');
      for (let i = 0; i < 7; i++) { const y = f.y + Math.round(Math.sin(t * 6 - i * 0.9) * (i / 7) * 1.5); T.P(f.x + i, y, i % 2 ? c : c2); T.P(f.x + i, y + 1, c2); }
    }
  });

  /* ============ 空に浮かぶ街 ============ */
  A.add({
    id: 'sky_city', name: '空に浮かぶ街', weather: { clear: 5, cloudy: 2, fog: 1, rain: 1, snow: 1 },
    horizon: env => Math.round(env.H * 0.86), cloudTop: 0.8, cloudMul: 0.7,
    amb: () => [['wind', 0.35], ['falls', 0.2], ['chimes', 0.7]],
    init(env, r) {
      const { W, H } = env, isl = [];
      const big = Math.min(W * 0.42, 74);
      const spots = [[0.5, 0.48, big, 0.05], [0.16, 0.36, big * 0.55, 0.3], [0.84, 0.32, big * 0.6, 0.35], [0.3, 0.7, big * 0.35, 0.15], [0.76, 0.66, big * 0.42, 0.12]];
      for (const [fx, fy, w, d] of spots) if (fx * W > -10) isl.push({ x: Math.round(W * fx), y: Math.round(H * fy), w: Math.round(w), d, ph: r() * 6, falls: [] });
      return { isl, ship: { x: -40, y: H * 0.2, dir: 1, next: 5 + r() * 20, on: false }, lanterns: Array.from({ length: 10 }, () => ({ x: r() * W, y: H * (0.2 + r() * 0.6), ph: r() * 6 })), seaN: fbm(r() * 1e5 | 0, 3) };
    },
    skyExtra(T, env, s, t) {
      const { W, H } = env;
      // 大きな輪のある星
      const R = Math.round(Math.min(W, H) * 0.16), px = Math.round(W * 0.22), py = Math.round(H * 0.18), d = 0.55;
      T.circ(px, py, R, env.col('#b8a8d8', d)); for (let y = -R; y <= R; y += 3) T.H(px - Math.sqrt(Math.max(0, R * R - y * y)) | 0, py + y, (Math.sqrt(Math.max(0, R * R - y * y)) * 2) | 0, env.col('#a898c8', d));
      T.circ(px + R * 0.3, py - R * 0.3, Math.round(R * 0.5), env.col('#c8bae4', d));
      for (let a = 0; a < 6.283; a += 0.01) { const x = px + Math.cos(a) * R * 1.7, y = py + Math.sin(a) * R * 0.35 - Math.cos(a) * R * 0.15; if (Math.sin(a) > 0 || Math.hypot(x - px, y - py) > R) T.P(x, y, env.col('#e0d4f0', d)); }
      // オーロラ（晴れた夜）
      if (env.night > 0.5 && env.weather === 'clear') {
        const g = T.g; g.save(); g.globalCompositeOperation = 'lighter';
        for (let x = 0; x < W; x++) { const y0 = H * 0.12 + Math.sin(x * 0.05 + t * 0.15) * 8 + Math.sin(x * 0.13 - t * 0.1) * 4, hh = 10 + Math.sin(x * 0.08 + t * 0.2) * 6;
          for (let j = 0; j < hh; j++) if (bay(x, j) < 0.6) { g.fillStyle = `rgba(${j < hh * 0.4 ? 120 : 70},${200 - j * 4},${j < hh * 0.4 ? 170 : 140},${0.12 * env.night * (1 - j / hh)})`; g.fillRect(x, Math.round(y0 + j), 1, 1); } }
        g.restore();
      }
    },
    build(T, env, s) {
      const r = RNG(env.seed), snow = env.weather === 'snow';
      // 島の絵を別に描いておき、毎フレーム上下にゆらす
      for (const I of s.isl) {
        const w = I.w, h = Math.round(w * 0.85), cv = document.createElement('canvas'); cv.width = w * 2 + 8; cv.height = h + 60;
        const g = cv.getContext('2d'), t2 = E.tools(g), ox = w + 4, oy = 40, n = fbm(r() * 1e5 | 0, 3), d = I.d;
        // 岩の胴
        for (let x = -w; x <= w; x++) { const f = Math.abs(x) / w, depth = h * (1 - f * f * 0.9) * (0.75 + n(x * 0.15) * 0.45); t2.R(ox + x, oy, 1, depth, env.col(x < 0 ? '#8a7a6a' : '#6e5f52', d)); for (let y = 3; y < depth; y += 4 + ((x * 7) % 3)) t2.P(ox + x, oy + y, env.col('#5a4d42', d)); }
        for (let x = -w; x <= w; x++) { const y = oy + 2 + n(x * 0.4 + 5) * 3; t2.R(ox + x, y, 1, 2, env.col('#a39282', d)); }
        // 垂れ下がるつる
        for (let k = 0; k < w / 3; k++) { const x = ox + r.int(-w + 2, w - 2), L = r.int(3, 12); t2.R(x, oy + 2, 1, L, env.col('#3f7a3e', d)); }
        // 草の上面
        t2.R(ox - w, oy - 2, w * 2 + 1, 3, env.col(snow ? '#eef2f8' : '#5c9a4a', d)); t2.H(ox - w + 1, oy - 3, w * 2 - 1, env.col(snow ? '#ffffff' : '#7cb85a', d));
        // 建物
        const bw = [];
        I.wins = [];
        for (let x = -w + 4; x < w - 4; x += r.int(6, 11)) {
          const kind = r(), H2 = Math.round(r.int(6, 14) * (1 + w / 80));
          if (kind > 0.82) { // 小さな家
            const hw = r.int(5, 8), hh = r.int(4, 6); t2.R(ox + x, oy - 2 - hh, hw, hh, env.col(r.pick(['#efe6d8', '#e8d0b0', '#d8e0e8']), d)); t2.poly([[ox + x - 1, oy - 2 - hh], [ox + x + hw / 2, oy - 2 - hh - 4], [ox + x + hw + 1, oy - 2 - hh]], env.col(r.pick(['#c86a4a', '#5a7ac8', '#4a9a8a']), d));
            I.wins.push({ x: ox + x + 2, y: oy - 2 - hh + 2, w: 1, h: 2, th: r(), ph: r(), per: 260, warm: true, glow: false }); x += 2; continue;
          }
          if (kind < 0.32) { // 塔
            const tw = r.int(3, 5); t2.R(ox + x, oy - 3 - H2, tw, H2, env.col('#efe6d8', d)); t2.R(ox + x + tw - 1, oy - 3 - H2, 1, H2, env.col('#cfc4b2', d));
            const rc = r.pick(['#3fa2a8', '#5468c8', '#c85a6a']); t2.poly([[ox + x - 1, oy - 3 - H2], [ox + x + tw / 2, oy - 3 - H2 - tw * 2 - 2], [ox + x + tw + 1, oy - 3 - H2]], env.col(rc, d));
            for (let y = oy - H2; y < oy - 5; y += 4) { t2.P(ox + x + 1, y, env.col('#4a5068', d)); I.wins.push({ x: ox + x + 1, y, w: 1, h: 1, th: r(), ph: r(), per: 200 + r() * 300, warm: r() < 0.6, glow: false }); }
          } else if (kind < 0.5) { // 丸屋根
            const rr = r.int(3, 5); t2.R(ox + x, oy - 3 - rr, rr * 2 + 1, rr, env.col('#e8dccb', d)); t2.circ(ox + x + rr, oy - 3 - rr, rr, env.col('#d8a838', d)); t2.R(ox + x - 1, oy - 3 - rr, rr * 2 + 3, rr + 1, env.col('#e8dccb', d));
            t2.circ(ox + x + rr, oy - 3 - rr - 1, rr, env.col('#e0b040', d)); t2.R(ox + x, oy - 3 - rr, rr * 2 + 1, rr, env.col('#e8dccb', d));
            I.wins.push({ x: ox + x + rr, y: oy - 3 - rr + 2, w: 1, h: 2, th: r(), ph: r(), per: 300, warm: true, glow: false });
          } else { A.leafy(t2, env, ox + x + 2, oy - 2, r.int(7, 11), d, { snow }); }
        }
        I.cv = cv; I.ox = ox; I.oy = oy; I.h = h;
        // 滝の出口
        I.falls = []; if (w > 20) for (let k = 0; k < (w > 40 ? 2 : 1); k++) I.falls.push({ x: r.int(-w + 4, w - 4) });
      }
    },
    back(T, env, s, t) {
      const { W, H } = env;
      // 下に広がる雲
      const c1 = E.css(env.sky.cloud), c2 = E.css(env.sky.cloudS);
      for (let x = 0; x < W; x++) { const y = H * 0.82 + s.seaN((x + t) * 0.04) * 8; T.R(x, y, 1, 2, c1); T.R(x, y + 2, 1, H, c2); }
    },
    front(T, env, s, t, dt) {
      const { W, H } = env, g = T.g;
      const order = s.isl.slice().sort((a, b) => b.d - a.d);
      // 橋（島どうしをつなぐ）
      const pos = I => [I.x, I.y + Math.round(Math.sin(t * 0.5 + I.ph) * 1.5)];
      for (const I of order) {
        const [x, y] = pos(I);
        if (!I.cv) continue;
        // 滝
        for (const f of I.falls) for (let yy = 0; yy < 46; yy++) { const a = 1 - yy / 46; if (((yy * 3 - t * 30) % 5 + 5) % 5 < 3.2) T.R(x + f.x + (yy > 30 ? Math.sin(yy + t * 4) : 0), y + 2 + yy, 2, 1, env.col('#d8ecfa', I.d, (0.85 * a).toFixed(2))); }
        g.drawImage(I.cv, x - I.ox, y - I.oy);
      }
      const main = s.isl[0], left = s.isl[1], right = s.isl[2];
      const bridge = (A1, B1, a, b) => { const [x0, y0] = pos(A1), [x1, y1] = pos(B1), xa = x0 + a, xb = x1 + b; A.wire(T, xa, y0 - 3, xb, y1 - 3, 5, env.col('#6a4a30', 0.2)); for (let k = 1; k < 10; k++) { const f = k / 10; T.P(lerp(xa, xb, f), lerp(y0, y1, f) - 3 + 5 * 4 * f * (1 - f) + 1, env.col('#8a6a48', 0.2)); } };
      if (left && main) bridge(left, main, left.w - 2, -main.w + 2);
      if (right && main) bridge(main, right, main.w - 2, -right.w + 2);
      // 飛行船
      const sh = s.ship; sh.next -= dt;
      if (!sh.on && sh.next < 0) { sh.on = true; sh.dir = Math.random() < 0.5 ? 1 : -1; sh.x = sh.dir > 0 ? -30 : W + 30; sh.y = H * (0.12 + Math.random() * 0.25); }
      if (sh.on) {
        sh.x += sh.dir * 4 * dt; const x = Math.round(sh.x), y = Math.round(sh.y + Math.sin(t * 0.6) * 1);
        T.ellipse(x, y, 10, 4, env.col('#c8b898', 0.15)); T.ellipse(x - 1, y - 1, 9, 3, env.col('#e8dcc0', 0.15));
        for (let k = -6; k <= 6; k += 4) T.V(x + k, y - 3, 7, env.col('#c8a868', 0.15));
        T.R(x - 4, y + 5, 8, 3, env.col('#7a5434', 0.15)); T.line(x - 4, y + 5, x - 6, y + 3, env.col('#5a4030', 0.15)); T.line(x + 3, y + 5, x + 5, y + 3, env.col('#5a4030', 0.15));
        const pr = x - sh.dir * 6; T.V(pr, y + 4 + (Math.floor(t * 12) % 2), 2, env.col('#5a5a5a', 0.15));
        s.shipLight = { x: x - 3, y: y + 6 };
        if (sh.x < -40 || sh.x > W + 40) { sh.on = false; sh.next = 50 + Math.random() * 70; s.shipLight = null; }
      }
      A.birds(T, env, s, t, dt, { y0: H * 0.1, y1: H * 0.5, depth: 0.3 });
    },
    glow(g, env, s, t) {
      const L = Math.max(env.lights, 0.15);
      for (const l of s.lanterns) { const y = l.y + Math.sin(t * 0.7 + l.ph) * 3, a = (0.45 + 0.35 * Math.sin(t * 1.3 + l.ph)) * L; g.fillStyle = `rgba(255,${220},${150},${Math.min(1, a + 0.2)})`; g.fillRect(Math.round(l.x), Math.round(y), 1, 2); glow(g, l.x, y + 1, 5, '#ffb070', a, 3); }
      for (const I of s.isl) { const y = I.y + Math.round(Math.sin(t * 0.5 + I.ph) * 1.5); if (I.wins) A.windowLights(g, env, s, I.wins.map(w => ({ ...w, x: w.x - I.ox + I.x, y: w.y - I.oy + y })), t); }
      if (s.shipLight && env.lights > 0.1) glow(g, s.shipLight.x, s.shipLight.y, 5, '#ffd080', 0.6 * env.lights, 3);
    }
  });

  /* ============ どこかの住宅街（日本） ============ */
  A.add({
    id: 'jp_town', name: 'どこかの住宅街', weather: { clear: 5, cloudy: 2, rain: 2, snow: 1, fog: 1 },
    horizon: env => Math.round(env.H * 0.58), cloudTop: 0.5,
    amb: env => [['town', 0.35], env.night < 0.5 ? ['birds', 0.35] : ['crickets', 0.6], ['wind', 0.15]],
    init(env, r) {
      const { W, H } = env, road = H - A.groundDepth(H, 0.22, 18, 54);
      return { road, rail: Math.round(env.H * 0.58) - 2, train: { x: 0, on: false, next: 12 + r() * 20, dir: 1 }, bike: { on: false, next: 20 + r() * 30 }, cat: { sleep: true }, cross: null };
    },
    build(T, env, s) {
      const { W, H } = env, road = s.road, rail = s.rail, r = RNG(env.seed), snow = env.weather === 'snow';
      // 遠くの山
      const m1 = fbm(env.seed + 1, 4);
      T.ridge(0, W, x => rail - 12 - m1(x * 0.02) * 24, env.col('#6f8e84', 0.75));
      T.ridge(0, W, x => rail - 4 - m1(x * 0.05 + 7) * 10, env.col('#5c7c64', 0.55));
      // 遠くの団地
      for (let x = r.int(-10, 20); x < W; x += r.int(40, 70)) { const w = r.int(18, 30), h = r.int(10, 18); T.R(x, rail - h, w, h, env.col('#c8c8c0', 0.5)); for (let y = rail - h + 2; y < rail - 1; y += 3) for (let k = 2; k < w - 1; k += 3) T.P(x + k, y, env.col('#7a8090', 0.5)); }
      // 線路の土手
      T.R(0, rail, W, 4, env.col('#7a7a6c', 0.25)); T.H(0, rail, W, env.col('#9a9888', 0.25)); T.H(0, rail - 1, W, env.col('#5a5a5a', 0.25));
      for (let x = r.int(0, 20); x < W; x += 34) { T.V(x, rail - 16, 16, env.col('#6a6a66', 0.25)); T.H(x - 3, rail - 15, 7, env.col('#6a6a66', 0.25)); }
      T.H(0, rail - 14, W, env.col('#4a4a4a', 0.25));
      // 家々
      s.wins = []; const hb = road - 8;
      let x = -r.int(0, 10);
      while (x < W) {
        const w = r.int(22, 34), h = r.int(16, 22), wall = r.pick(['#ece6d8', '#e4dccb', '#d8d4cc', '#efe8dc', '#cdd2d4', '#e6d6c0']), roof = r.pick(['#4a5566', '#5a4a40', '#3e4a5a', '#6a5a50']);
        const top = hb - h;
        T.R(x, top, w, h + 8, env.col(wall)); T.R(x + w - 2, top, 2, h + 8, env.col('#b8b2a4'));
        T.poly([[x - 2, top + 1], [x + 3, top - 7], [x + w - 3, top - 7], [x + w + 2, top + 1]], env.col(roof)); T.H(x - 2, top + 1, w + 4, env.col('#2e3440'));
        for (let k = 0; k < 4; k++) T.H(x + 1 + k, top - 5 + k * 2, w - 2 - k * 2, env.col('#ffffff', 0, 0.06));
        // 窓（アルミ枠）
        for (let k = 0; k < 2; k++) { const wx = x + 4 + k * Math.round((w - 12) / 1), wy = top + 4; if (wx + 6 > x + w) break; T.R(wx, wy, 6, 5, env.col('#b8c0c8')); T.R(wx + 1, wy + 1, 2, 3, env.col('#8ab0d0')); T.R(wx + 3, wy + 1, 2, 3, env.col('#7aa0c0')); s.wins.push(A.makeWindow(wx + 1, wy + 1, 4, 3, r)); }
        // ベランダの洗濯物
        if (r() < 0.4) { const bx = x + 3; T.H(bx, top + 11, w - 6, env.col('#8a8a8a')); s.laundry = s.laundry || []; for (let k = 0; k < 3; k++) s.laundry.push({ x: bx + 2 + k * 5, y: top + 12, c: r.pick(['#ffffff', '#e8a0a0', '#a0c0e8', '#f0e090']) }); }
        // エアコンの室外機
        if (r() < 0.5) { T.R(x + w - 9, top + h - 2, 5, 4, env.col('#d8d8d0')); T.circ(x + w - 7, top + h, 1, env.col('#9a9a94')); }
        x += w + r.int(2, 6);
      }
      // 庭木
      for (let k = 0; k < W / 26; k++) { const tx = r.int(0, W), th = r.int(9, 14); A.leafy(T, env, tx, hb - 1, th, 0, { dark: '#2e5a34', mid: '#3d7040', light: '#5a8e4c', snow }); }
      // ブロック塀
      for (let xx = 0; xx < W; xx++) for (let y = hb - 1; y < road; y++) { const row = y - hb + 1; T.P(xx, y, env.col(((xx + (Math.floor(row / 2) % 2) * 4) % 8 === 0 || row % 2 === 1) ? '#8e8e86' : '#acaca2')); }
      T.H(0, hb - 2, W, env.col('#c4c4ba'));
      // 道路
      T.R(0, road, W, H - road, env.col('#5e5e62')); T.dith(0, road, W, H - road, env.col('#5e5e62'), env.col('#6a6a6e'), 0.25);
      T.H(0, road + 2, W, env.col('#e8e8e0')); T.H(0, road, W, env.col('#7a7a7a'));
      if (env.weather === 'rain') for (let i = 0; i < W / 8; i++) T.ellipse(r() * W, road + 4 + r() * (H - road - 5), r.int(3, 8), 1, env.col('#4e5866'));
      if (snow) { T.R(0, road, W, 2, env.col('#f2f6fa')); T.H(0, hb - 2, W, env.col('#f2f6fa')); }
      // 電柱と電線
      s.poles = [];
      for (let px = r.int(8, 24); px < W + 30; px += r.int(52, 70)) {
        const ptop = Math.round(top0(env) );
        s.poles.push(px);
        T.R(px, ptop, 2, road + 1 - ptop, env.col('#9a9a92')); T.V(px + 1, ptop, road - ptop, env.col('#7e7e78'));
        T.R(px - 6, ptop + 3, 14, 1, env.col('#6a6a64')); T.R(px - 4, ptop + 8, 10, 1, env.col('#6a6a64'));
        for (const dx of [-6, -2, 3, 7]) T.P(px + dx, ptop + 2, env.col('#e8e8e0'));
        if (r() < 0.5) { T.R(px + 2, ptop + 12, 4, 6, env.col('#8a8e8a')); T.H(px + 2, ptop + 12, 4, env.col('#a8aca8')); }
        T.R(px - 1, ptop + 22, 4, 6, env.col('#e8e4d8')); T.H(px - 1, ptop + 22, 4, env.col('#3a6ad0'));
      }
      const wc = env.col('#3a3e44'), wc2 = env.col('#4a4e54');
      const wires = (a, b) => { const pt = top0(env); A.wire(T, a - 6, pt + 3, b - 6, pt + 3, 4, wc); A.wire(T, a + 7, pt + 3, b + 7, pt + 3, 5, wc); A.wire(T, a - 4, pt + 8, b - 4, pt + 8, 6, wc2); };
      for (let i = 0; i < s.poles.length; i++) wires(s.poles[i], s.poles[i + 1] !== undefined ? s.poles[i + 1] : s.poles[i] + 60);
      if (s.poles[0] > 0) wires(s.poles[0] - 60, s.poles[0]);
      // 自販機
      const vx = Math.round(W * 0.58); T.R(vx, road - 13, 7, 13, env.col('#d83a34')); T.R(vx + 1, road - 12, 5, 5, env.col('#e8e8e0'));
      for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) T.P(vx + 1 + k * 2, road - 11 + j * 2, env.col(['#3a7ad0', '#e0b030', '#30a050'][k]));
      T.R(vx + 2, road - 5, 3, 2, env.col('#2a2a2a')); s.vend = { x: vx + 3, y: road - 9 };
      // カーブミラー
      const cmx = Math.round(W * 0.86); T.V(cmx, road - 22, 22, env.col('#e07a30')); T.circ(cmx, road - 25, 3, env.col('#e07a30')); T.circ(cmx, road - 25, 2, env.col('#a8c8e0'));
      // 踏切（右奥の路地）
      const cx = Math.round(W * 0.34); T.V(cx, rail - 12, 13, env.col('#e8e8e0')); for (let y = rail - 12; y < rail; y += 2) T.P(cx, y, env.col('#2a2a2a'));
      T.line(cx - 3, rail - 15, cx + 3, rail - 11, env.col('#f0d040')); T.line(cx - 3, rail - 11, cx + 3, rail - 15, env.col('#f0d040'));
      T.R(cx - 3, rail - 9, 2, 2, env.col('#5a1a1a')); T.R(cx + 2, rail - 9, 2, 2, env.col('#5a1a1a'));
      s.cross = { x: cx, y: rail - 8 };
      s.catAt = { x: Math.round(W * 0.2), y: hb - 3 };
    },
    back(T, env, s, t, dt) {
      const { W } = env, tr = s.train;
      tr.next -= dt;
      if (!tr.on && tr.next < 0) { tr.on = true; tr.dir = Math.random() < 0.5 ? 1 : -1; tr.cars = 4 + (Math.random() * 3 | 0); tr.x = tr.dir > 0 ? -tr.cars * 30 - 10 : W + 10; tr.c = ['#2f9a5a', '#e07830', '#3a6ad0', '#c8a020'][Math.random() * 4 | 0]; if (window.TookuPlayer) window.TookuPlayer.ambEvent('crossing'); }
      s.crossOn = false;
      if (tr.on) {
        tr.x += tr.dir * 34 * dt; const y = s.rail - 11;
        for (let k = 0; k < tr.cars; k++) {
          const x = Math.round(tr.x + k * 30);
          if (x > W + 2 || x < -32) continue;
          T.R(x, y, 28, 10, env.col('#d8dce0', 0.25)); T.H(x, y + 6, 28, env.col(tr.c, 0.25)); T.H(x, y, 28, env.col('#a8acb0', 0.25));
          for (let w = 2; w < 26; w += 4) T.R(x + w, y + 2, 3, 3, env.col('#4a5868', 0.25));
          T.line(x + 10, y - 1, x + 14, y - 4, env.col('#3a3a3a', 0.25)); T.line(x + 14, y - 4, x + 18, y - 1, env.col('#3a3a3a', 0.25));
        }
        s.trainWin = { x: tr.x, cars: tr.cars, y: y + 2 };
        s.crossOn = true;
        if (tr.x > W + 20 || tr.x < -tr.cars * 30 - 20) { tr.on = false; tr.next = 70 + Math.random() * 90; s.trainWin = null; }
      }
    },
    front(T, env, s, t, dt) {
      const { W } = env;
      // 洗濯物（昼だけ、雨と夜は取り込む）
      if (s.laundry && env.night < 0.4 && env.weather !== 'rain') for (const l of s.laundry) { const sw = Math.round(Math.sin(t * 2 + l.x) * 0.6); T.R(l.x + sw, l.y, 3, 4, env.col(l.c)); }
      // 塀の上の猫
      const ca = s.catAt;
      if (env.weather !== 'rain') { const sleep = Math.floor(t / 30) % 3 !== 2; T.spr(sleep ? ['.k.k.', 'kkkkk', 'kkkkkk'] : ['k.k..', 'kek..', 'kkkk.', 'kkkkk'], ca.x, ca.y - (sleep ? 3 : 4), { k: env.col('#e8e4dc'), e: env.col('#3a3a3a') }); if (sleep) T.P(ca.x + 5, ca.y - 1, env.col('#d8a050')); }
      // 自転車が通る
      const b = s.bike; b.next -= dt;
      if (!b.on && b.next < 0 && env.night < 0.7) { b.on = true; b.dir = Math.random() < 0.5 ? 1 : -1; b.x = b.dir > 0 ? -10 : W + 10; b.c = ['#3a6ad0', '#d84a4a', '#3a3a3a'][Math.random() * 3 | 0]; }
      if (b.on) {
        b.x += b.dir * 14 * dt; const x = Math.round(b.x), y = s.road + 6, sp = Math.floor(t * 8) % 2;
        T.circ(x - 3, y, 2, env.col('#2a2a2a')); T.circ(x + 3, y, 2, env.col('#2a2a2a')); T.P(x - 3, y, env.col(sp ? '#aaa' : '#2a2a2a')); T.P(x + 3, y, env.col(sp ? '#2a2a2a' : '#aaa'));
        T.line(x - 3, y, x, y - 3, env.col('#9aa0a8')); T.line(x, y - 3, x + 3, y, env.col('#9aa0a8'));
        T.spr(['.h.', '.f.', 'cc.', 'cc.', '.l.'], x - 1, y - 9, { h: env.col('#2a2a2a'), f: env.col('#f0c8a0'), c: env.col(b.c), l: env.col('#3a3f58') }, b.dir < 0);
        if (b.x < -14 || b.x > W + 14) { b.on = false; b.next = 50 + Math.random() * 60; }
      }
    },
    glow(g, env, s, t) {
      A.windowLights(g, env, s, s.wins || [], t);
      if (s.vend) { const a = Math.max(env.lights, 0.2); g.fillStyle = `rgba(255,255,240,${0.4 + 0.5 * a})`; g.fillRect(s.vend.x - 2, s.vend.y - 3, 5, 5); glow(g, s.vend.x, s.vend.y, 14, '#e8f0ff', 0.4 * a, 4); }
      if (s.crossOn && s.cross) { const on = Math.floor(t * 2.4) % 2; const x = s.cross.x + (on ? -3 : 2); g.fillStyle = 'rgba(255,60,40,0.95)'; g.fillRect(x, s.cross.y - 1, 2, 2); glow(g, x + 1, s.cross.y, 7, '#ff3020', 0.6, 3); }
      if (s.trainWin && env.lights > 0.2) for (let k = 0; k < s.trainWin.cars; k++) for (let w = 2; w < 26; w += 4) { const x = Math.round(s.trainWin.x + k * 30 + w); if (x > -4 && x < env.W) { g.fillStyle = `rgba(255,250,220,${0.8 * env.lights})`; g.fillRect(x, s.trainWin.y, 3, 3); } }
    }
  });
  function top0(env) { return Math.round(env.H * 0.58) - 30; }

  /* ============ アメリカの田舎町 ============ */
  A.add({
    id: 'us_town', name: 'ルート沿いの小さな町', weather: { clear: 6, cloudy: 2, rain: 1 }, milky: true,
    horizon: env => Math.round(env.H * 0.6),
    amb: env => [['wind', 0.5], ['town', 0.15], env.night > 0.5 ? ['crickets', 0.5] : ['birds', 0.15]],
    init(env, r) {
      const { H } = env, road = H - A.groundDepth(H, 0.26, 20, 62);
      return { road, cars: [], nextCar: 3 + r() * 8, tw: null, nextTw: 20 + r() * 30 };
    },
    build(T, env, s) {
      const { W, H } = env, hz = Math.round(H * 0.6), road = s.road, r = RNG(env.seed);
      // メサ（台地）
      for (const [d, base, hh, c] of [[0.75, hz - 2, 26, '#c07a58'], [0.5, hz + 2, 16, '#b0603e']]) {
        let x = r.int(-30, 0);
        while (x < W) { const w = r.int(26, 60), h = r.int(hh * 0.5, hh); T.poly([[x, base], [x + 5, base - h], [x + w - 6, base - h], [x + w, base]], env.col(c, d)); for (let y = base - h + 3; y < base; y += 4) T.H(x + 4, y, w - 8, env.col('#a85a3a', d)); x += w + r.int(10, 50); }
      }
      // 砂の大地
      T.R(0, hz, W, road - hz, env.col('#d8b07a')); T.dith(0, hz, W, road - hz, env.col('#d8b07a'), env.col('#c8a06a'), 0.2);
      for (let i = 0; i < W / 10; i++) { const x = r() * W, y = hz + 2 + r() * (road - hz - 4); A.tuft(T, x, y, r.int(1, 2), env.col('#8a8a4a'), env.col('#a0a058')); }
      // 建物：給水塔・ダイナー・ガソリンスタンド・モーテル
      const gy = road - 2; s.neon = []; s.wins = [];
      let x = Math.round(W * 0.04);
      const place = (w, fn) => { if (x + w > W + 10) return; fn(x); x += w + r.int(6, 14); };
      // 給水塔
      place(16, x0 => { const tx = x0 + 8, ty = gy - 34; for (const dx of [-6, 6]) T.line(tx + dx * 0.5, ty + 8, tx + dx, gy, env.col('#7a7a74')); T.line(tx - 5, gy - 10, tx + 5, gy - 10, env.col('#7a7a74')); T.R(tx - 7, ty - 2, 15, 10, env.col('#a8b0b8')); T.R(tx - 7, ty - 2, 4, 10, env.col('#c0c8d0')); T.poly([[tx - 8, ty - 2], [tx, ty - 7], [tx + 8, ty - 2]], env.col('#8a929a')); });
      // ダイナー
      place(36, x0 => {
        T.R(x0, gy - 14, 36, 14, env.col('#7cc4c0')); T.R(x0, gy - 14, 36, 2, env.col('#e8eef0')); T.H(x0, gy - 7, 36, env.col('#e05050')); T.H(x0, gy - 6, 36, env.col('#e8eef0'));
        for (let k = 3; k < 33; k += 5) { T.R(x0 + k, gy - 12, 4, 4, env.col('#3a4858')); s.wins.push({ x: x0 + k, y: gy - 12, w: 4, h: 4, th: 0.05, ph: 0, per: 999, warm: true, steady: true }); }
        T.R(x0 + 16, gy - 5, 4, 5, env.col('#3a4858'));
        T.R(x0 + 6, gy - 22, 24, 7, env.col('#2a2a30')); T.V(x0 + 10, gy - 15, 1, env.col('#5a5a5a')); T.V(x0 + 26, gy - 15, 1, env.col('#5a5a5a'));
        const tw = T.textW('DINER'); T.text('DINER', x0 + 18 - tw / 2, gy - 21, env.col('#e85050')); s.neon.push({ text: 'DINER', x: x0 + 18 - tw / 2, y: gy - 21, c: '#ff5a5a' });
      });
      // ガソリンスタンド
      place(30, x0 => {
        T.R(x0, gy - 16, 30, 3, env.col('#f0f0ec')); T.H(x0, gy - 14, 30, env.col('#d84040'));
        T.V(x0 + 3, gy - 13, 13, env.col('#c8c8c4')); T.V(x0 + 26, gy - 13, 13, env.col('#c8c8c4'));
        for (const px of [x0 + 10, x0 + 18]) { T.R(px, gy - 7, 3, 7, env.col('#d84040')); T.R(px, gy - 6, 3, 2, env.col('#f0f0e8')); T.V(px + 3, gy - 6, 4, env.col('#2a2a2a')); }
        T.V(x0 + 34, gy - 26, 26, env.col('#6a6a6a')); T.R(x0 + 30, gy - 32, 11, 7, env.col('#f0f0ec')); T.text('GAS', x0 + 31, gy - 31, env.col('#d84040')); s.neon.push({ text: 'GAS', x: x0 + 31, y: gy - 31, c: '#fff0c0', dim: true });
        s.canopy = { x: x0, y: gy - 13, w: 30 };
      });
      // モーテル
      place(52, x0 => {
        T.R(x0, gy - 11, 46, 11, env.col('#e8d8b8')); T.R(x0, gy - 13, 46, 2, env.col('#a85a3a'));
        for (let k = 0; k < 6; k++) { const dx = x0 + 3 + k * 7; T.R(dx, gy - 7, 3, 7, env.col(['#3a7ad0', '#d84a4a', '#e0b030'][k % 3])); T.R(dx + 4, gy - 8, 2, 2, env.col('#3a4858')); s.wins.push({ x: dx + 4, y: gy - 8, w: 2, h: 2, th: r(), ph: r(), per: 300 + r() * 400, warm: true }); }
        const sx = x0 + 48; T.V(sx, gy - 38, 38, env.col('#5a5a5a'));
        T.R(sx - 10, gy - 44, 22, 8, env.col('#2a6a5a')); T.text('MOTEL', sx - 9, gy - 43, env.col('#f0e8c8')); s.neon.push({ text: 'MOTEL', x: sx - 9, y: gy - 43, c: '#ffe080' });
        T.R(sx - 8, gy - 35, 32, 7, env.col('#2a2a30')); T.text('VACANCY', sx - 7, gy - 34, env.col('#d84a4a')); s.neon.push({ text: 'VACANCY', x: sx - 7, y: gy - 34, c: '#ff4a4a', flick: true });
      });
      // 電柱と電線
      const poles = []; for (let px = 6; px < W + 40; px += 46) { poles.push(px); T.V(px, gy - 30, 32, env.col('#6a5040')); T.H(px - 4, gy - 28, 9, env.col('#6a5040')); }
      for (let i = 0; i + 1 < poles.length; i++) for (const dx of [-4, 4]) A.wire(T, poles[i] + dx, gy - 28, poles[i + 1] + dx, gy - 28, 4, env.col('#2a2a2a'));
      // 道路
      T.R(0, road, W, H - road, env.col('#4a4a4e')); T.H(0, road, W, env.col('#8a8070')); T.H(0, H - 2, W, env.col('#8a8070'));
      const mid = Math.round((road + H) / 2); for (let xx = 0; xx < W; xx += 10) T.R(xx, mid, 6, 1, env.col('#e8c040'));
      s.lanes = [Math.round((road + mid) / 2) + 1, Math.round((mid + H) / 2) + 1];
    },
    front(T, env, s, t, dt) {
      const { W } = env;
      s.nextCar -= dt;
      if (s.nextCar < 0) { const dir = Math.random() < 0.5 ? 1 : -1; s.cars.push({ x: dir > 0 ? -16 : W + 16, dir, lane: dir > 0 ? s.lanes[1] : s.lanes[0], kind: Math.random() * 3 | 0, c: ['#c84040', '#3a8a9a', '#d8c070', '#4a6ad0', '#e8e4d8'][Math.random() * 5 | 0], v: 22 + Math.random() * 14 }); s.nextCar = 10 + Math.random() * 25; }
      s.cars = s.cars.filter(c => {
        c.x += c.dir * c.v * dt; const x = Math.round(c.x), y = c.lane;
        const bd = env.col(c.c), dk = env.col('#2a2a2a'), gl = env.col('#9ab8d0');
        if (c.kind === 0) { T.R(x - 7, y - 4, 14, 3, bd); T.R(x - 3 * c.dir - 2, y - 7, 6, 3, bd); T.R(x - 3 * c.dir - 1, y - 6, 4, 2, gl); }
        else if (c.kind === 1) { T.R(x - 8, y - 4, 16, 3, bd); T.R(x - 5, y - 7, 10, 3, bd); T.R(x - 4, y - 6, 3, 2, gl); T.R(x + 1, y - 6, 3, 2, gl); }
        else { T.R(x - 8, y - 5, 16, 4, bd); T.R(x - 6, y - 8, 10, 3, bd); T.R(x - 5, y - 7, 8, 2, gl); T.H(x - 8, y - 3, 16, env.col('#8a6a4a')); }
        T.circ(x - 5, y - 1, 1, dk); T.circ(x + 5, y - 1, 1, dk);
        c.head = { x: x + c.dir * 8, y: y - 3 };
        return c.x > -30 && c.x < W + 30;
      });
      // 回転草
      s.nextTw -= dt;
      if (!s.tw && s.nextTw < 0 && env.weather !== 'rain') s.tw = { x: -6, y: s.road - 3, a: 0 };
      if (s.tw) { const w = s.tw; w.x += 9 * dt; w.a += dt * 6; const bounce = Math.abs(Math.sin(w.a * 0.7)) * 3; T.circ(w.x, w.y - bounce, 2, env.col('#a07a4a')); T.P(w.x + Math.cos(w.a) * 2, w.y - bounce + Math.sin(w.a) * 2, env.col('#7a5a34')); T.P(w.x - Math.cos(w.a), w.y - bounce - Math.sin(w.a), env.col('#c8a070')); if (w.x > W + 8) { s.tw = null; s.nextTw = 40 + Math.random() * 60; } }
    },
    glow(g, env, s, t) {
      A.windowLights(g, env, s, s.wins || [], t);
      const L = env.lights; if (L < 0.08) return;
      const T = E.tools(g);
      for (const n of s.neon) {
        let a = L; if (n.flick && Math.sin(t * 0.7) > 0.96 && Math.random() < 0.5) a *= 0.2;
        g.save(); g.globalCompositeOperation = 'lighter'; T.text(n.text, n.x, n.y, E.css(E.rgb(n.c), Math.min(1, a))); g.restore();
        glow(g, n.x + T.textW(n.text) / 2, n.y + 2, T.textW(n.text) * 0.8 + 4, n.c, 0.3 * a, 4);
      }
      if (s.canopy) for (let k = 4; k < s.canopy.w; k += 9) { g.fillStyle = `rgba(255,255,235,${0.8 * L})`; g.fillRect(s.canopy.x + k, s.canopy.y, 3, 1); glow(g, s.canopy.x + k + 1, s.canopy.y + 5, 9, '#f0f4ff', 0.25 * L, 3); }
      for (const c of s.cars) if (c.head && L > 0.25) { g.fillStyle = 'rgba(255,250,220,0.9)'; g.fillRect(c.head.x, c.head.y, 1, 1); glow(g, c.head.x + c.dir * 6, c.head.y + 1, 9, '#fff4d0', 0.35 * L, 3); }
    }
  });
})();
