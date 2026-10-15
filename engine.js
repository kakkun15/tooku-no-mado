/* とおくの窓：ドット絵の景色を描く土台（空・時間帯・天気・光・場面の切り替え） */
(function () {
  'use strict';
  /* ---------------- 乱数とノイズ ---------------- */
  function RNG(seed) { let s = (seed >>> 0) || 1; const f = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), s ^= s >>> 16, (s >>> 0) / 4294967296)); f.int = (a, b) => a + Math.floor(f() * (b - a + 1)); f.pick = a => a[Math.floor(f() * a.length)]; f.range = (a, b) => a + f() * (b - a); return f; }
  function noise1(seed) {
    const r = RNG(seed), T = new Float32Array(256); for (let i = 0; i < 256; i++) T[i] = r();
    return x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return T[i & 255] * (1 - u) + T[(i + 1) & 255] * u; };
  }
  function fbm(seed, oct) { const ns = []; for (let k = 0; k < (oct || 4); k++) ns.push(noise1(seed + k * 101)); return x => { let v = 0, a = 0.5, f = 1, sum = 0; for (const n of ns) { v += n(x * f) * a; sum += a; a *= 0.5; f *= 2; } return v / sum; }; }
  // 2次元のなめらかなノイズ（岩肌・水面・砂の模様を、くり返しに見えないようにするため）
  function noise2(seed) {
    seed |= 0;
    const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  }
  function fbm2(seed, oct) { const ns = []; for (let k = 0; k < (oct || 3); k++) ns.push(noise2(seed + k * 131)); return (x, y) => { let v = 0, a = 0.5, f = 1, sum = 0; for (const n of ns) { v += n(x * f, y * f) * a; sum += a; a *= 0.5; f *= 2; } return v / sum; }; }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- 色 ---------------- */
  const hexCache = {};
  function rgb(h) {
    if (hexCache[h]) return hexCache[h];
    let s = h.replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const n = parseInt(s, 16); return (hexCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  const css = (c, a) => a === undefined || a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  /* ---------------- 時間帯 ---------------- */
  // 時刻ごとの空と光の具合。間は滑らかにつなぐ
  const TOD = {
    night: { top: '#0a1026', mid: '#16214a', bot: '#2b3a6b', sun: '#000', mul: [0.34, 0.4, 0.64], sat: 0.55, haze: [6, 9, 22], lights: 1, stars: 1, cloud: '#3a4870', cloudS: '#232c4f' },
    dawn: { top: '#33457c', mid: '#b98aa2', bot: '#f8c79a', sun: '#ffd9a0', mul: [0.96, 0.84, 0.86], sat: 0.82, haze: [24, 12, 16], lights: 0.35, stars: 0.12, cloud: '#f6c6b6', cloudS: '#a8879e' },
    day: { top: '#4f97e2', mid: '#88c0ef', bot: '#cde5f5', sun: '#fff6d8', mul: [1, 1, 1], sat: 1, haze: [0, 0, 0], lights: 0, stars: 0, cloud: '#ffffff', cloudS: '#c7d6e6' },
    dusk: { top: '#2e3170', mid: '#c46c7c', bot: '#fbab5c', sun: '#ffb46a', mul: [1.02, 0.74, 0.62], sat: 0.88, haze: [22, 6, 10], lights: 0.7, stars: 0.05, cloud: '#ffb08a', cloudS: '#8a5876' }
  };
  const ANCH = [[0, 'night'], [4.5, 'night'], [6.0, 'dawn'], [7.7, 'day'], [16.2, 'day'], [17.9, 'dusk'], [19.3, 'night'], [24, 'night']];
  const FIXED_HOUR = { dawn: 6.1, day: 12.5, dusk: 17.9, night: 22.5 };
  function todAt(h) {
    h = ((h % 24) + 24) % 24; let i = 0; while (i < ANCH.length - 2 && ANCH[i + 1][0] <= h) i++;
    const [h0, k0] = ANCH[i], [h1, k1] = ANCH[i + 1], t = h1 > h0 ? (h - h0) / (h1 - h0) : 0, A = TOD[k0], B = TOD[k1];
    const m = (a, b) => mixc(rgb(a), rgb(b), t);
    return {
      hour: h, key: t < 0.5 ? k0 : k1, top: m(A.top, B.top), mid: m(A.mid, B.mid), bot: m(A.bot, B.bot), sun: m(A.sun, B.sun), cloud: m(A.cloud, B.cloud), cloudS: m(A.cloudS, B.cloudS),
      mul: [0, 1, 2].map(j => lerp(A.mul[j], B.mul[j], t)), sat: lerp(A.sat, B.sat, t), haze: [0, 1, 2].map(j => lerp(A.haze[j], B.haze[j], t)),
      lights: lerp(A.lights, B.lights, t), stars: lerp(A.stars, B.stars, t)
    };
  }
  const WEATHER = {
    clear: { name: '晴れ', clouds: 0.25, dim: 1, sat: 1, grey: 0 },
    cloudy: { name: 'くもり', clouds: 0.85, dim: 0.86, sat: 0.82, grey: 0.45 },
    rain: { name: '雨', clouds: 1, dim: 0.72, sat: 0.7, grey: 0.6 },
    snow: { name: '雪', clouds: 0.9, dim: 0.92, sat: 0.75, grey: 0.5 },
    fog: { name: '霧', clouds: 0.5, dim: 0.9, sat: 0.7, grey: 0.35 }
  };
  const TOD_NAME = { dawn: '朝', day: '昼', dusk: '夕方', night: '夜' };

  /* ---------------- 環境（色の変換を含む） ---------------- */
  function makeEnv(W, H, hour, weather, sceneSeed) {
    const td = todAt(hour), wd = WEATHER[weather] || WEATHER.clear;
    const greyTo = (c, a) => { const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return mixc(c, [l, l, l * 1.05], a); };
    let top = greyTo(td.top, wd.grey), mid = greyTo(td.mid, wd.grey), bot = greyTo(td.bot, wd.grey);
    if (weather === 'fog') { const f = mixc(bot, [200, 206, 214], 0.5 * (1 - td.stars * 0.6)); mid = mixc(mid, f, 0.5); bot = mixc(bot, f, 0.7); }
    if (weather !== 'clear') { top = top.map(v => v * (0.75 + 0.25 * wd.dim)); mid = mid.map(v => v * (0.8 + 0.2 * wd.dim)); }
    const env = {
      W, H, hour: td.hour, tod: td.key, todName: TOD_NAME[td.key], weather, weatherName: wd.name, seed: sceneSeed,
      lights: Math.max(td.lights, weather === 'rain' || weather === 'cloudy' ? td.lights * 0.6 + 0.15 * (1 - td.stars) * (td.lights > 0.1 ? 1 : 0) : 0),
      stars: weather === 'clear' ? td.stars : weather === 'fog' ? td.stars * 0.15 : td.stars * 0.25,
      night: td.stars, sky: { top, mid, bot, sun: td.sun, cloud: greyTo(td.cloud, wd.grey * 0.8).map(v => v * (weather === 'rain' ? 0.74 : weather === 'cloudy' ? 0.9 : weather === 'snow' ? 0.94 : 1)), cloudS: greyTo(td.cloudS, wd.grey * 0.6).map(v => v * (weather === 'rain' ? 0.8 : 1)) },
      cloudiness: wd.clouds, wd
    };
    const mul = td.mul.map(v => v * wd.dim), sat = td.sat * wd.sat, haze = td.haze.slice();
    if (weather === 'fog') { haze[0] += 26; haze[1] += 28; haze[2] += 30; }
    env.gradeKey = [hour.toFixed(2), weather].join();
    const memo = new Map(), farC = mixc(bot, mid, 0.25);
    // 景色の色を、時間帯と天気に合わせて変える。depth: 0=手前, 1=いちばん遠く
    env.col = (hex, depth, a) => {
      const k = hex + '|' + (depth || 0) + '|' + (a === undefined ? 1 : a); let v = memo.get(k); if (v) return v;
      const c = rgb(hex), l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      let o = [0, 1, 2].map(j => (l + (c[j] - l) * sat) * mul[j] + haze[j]);
      if (depth) o = mixc(o, farC, clamp(depth * (weather === 'fog' ? 0.95 : 0.62), 0, 0.97));
      v = css(o.map(x => clamp(x, 0, 255)), a); memo.set(k, v); return v;
    };
    env.colRGB = (hex, depth) => { const s = env.col(hex, depth); const m = /rgba?\((\d+),(\d+),(\d+)/.exec(s); return [+m[1], +m[2], +m[3]]; };
    // 光る物の色（時間帯で暗くならない）
    env.emi = (hex, a) => css(rgb(hex), a);
    return env;
  }

  /* ---------------- 描くための道具 ---------------- */
  function tools(g) {
    const T = {
      g,
      R(x, y, w, h, c) { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      P(x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
      H(x, y, w, c) { T.R(x, y, w, 1, c); },
      V(x, y, h, c) { T.R(x, y, 1, h, c); },
      // 走査線で多角形を塗る（にじまない）
      poly(pts, c) {
        g.fillStyle = c; let y0 = Infinity, y1 = -Infinity;
        for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        y0 = Math.floor(y0); y1 = Math.ceil(y1);
        for (let y = y0; y <= y1; y++) {
          const yc = y + 0.5, xs = [];
          for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
          xs.sort((p, q) => p - q);
          for (let i = 0; i + 1 < xs.length; i += 2) { const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]); if (xb > xa) g.fillRect(xa, y, xb - xa, 1); }
        }
      },
      circ(cx, cy, r, c) { g.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) + 0.35); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } },
      ellipse(cx, cy, rx, ry, c) { g.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))) + 0.3); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } },
      // 線（ブレゼンハム）
      line(x0, y0, x1, y1, c) { g.fillStyle = c; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
      // 地形：x ごとの高さ関数で下まで塗る
      ridge(x0, x1, fy, c, yBottom) { g.fillStyle = c; for (let x = Math.floor(x0); x < x1; x++) { const y = Math.round(fy(x)); g.fillRect(x, y, 1, (yBottom === undefined ? 9999 : yBottom) - y); } },
      // ディザで2色を混ぜた四角
      dith(x, y, w, h, c1, c2, f) { x = Math.round(x); y = Math.round(y); g.fillStyle = c1; g.fillRect(x, y, w, h); g.fillStyle = c2; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bay(x + i, y + j) < (typeof f === 'function' ? f(i, j) : f)) g.fillRect(x + i, y + j, 1, 1); },
      // 文字列の絵（'.' は透明）
      spr(rows, x, y, map, flip) {
        for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) { const ch = r[flip ? r.length - 1 - i : i]; if (ch === '.' || ch === ' ') continue; const c = map[ch]; if (!c) continue; g.fillStyle = c; g.fillRect(Math.round(x + i), Math.round(y + j), 1, 1); } }
      },
      text(str, x, y, c) { // 3x5 の小さい文字
        let cx = Math.round(x);
        for (const ch of str) { const gl = FONT[ch], gw = gl ? gl.length / 5 : 3; if (gl) { for (let j = 0; j < 5; j++) for (let i = 0; i < gw; i++) if (gl[j * gw + i] === '1') T.P(cx + i, y + j, c); } cx += ch === ' ' ? 2 : gw + 1; }
      },
      textW: str => [...str].reduce((w, ch) => w + (ch === ' ' ? 2 : (FONT[ch] ? FONT[ch].length / 5 : 3) + 1), 0) - 1
    };
    return T;
  }
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111',
    K: '101101110101101', L: '100100100100111', M: '1000111011101011000110001', N: '1000111001101011001110001',  O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '1000110001101011101110001', Y: '101101010010010', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '6': '011100111101111', '-': '000000111000000', "'": '010010000000000', '.': '000000000000010'
  };

  /* ---------------- 光（加算でにじむ丸。ドット絵らしく段をつける） ---------------- */
  const glowCache = new Map();
  function glowSprite(r, color, levels) {
    const key = r + color + levels; let c = glowCache.get(key); if (c) return c;
    const R = Math.ceil(r), n = R * 2 + 1, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const cg = cv.getContext('2d'), id = cg.createImageData(n, n), d = id.data, rc = rgb(color);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dd = Math.hypot(x - R, y - R) / r; if (dd >= 1) continue;
      let a = Math.pow(1 - dd, 1.8);                         // 中心ほど明るい
      const q = a * levels, lo = Math.floor(q);               // 段をつけてディザでつなぐ
      a = (lo + (bay(x, y) < q - lo ? 1 : 0)) / levels;
      const i = (y * n + x) * 4; d[i] = rc[0]; d[i + 1] = rc[1]; d[i + 2] = rc[2]; d[i + 3] = Math.round(a * 255);
    }
    cg.putImageData(id, 0, 0); glowCache.set(key, cv); if (glowCache.size > 300) glowCache.delete(glowCache.keys().next().value);
    return cv;
  }
  // 光（加算でにじむ丸。段とディザでドット絵らしく）
  function glow(g, x, y, r, color, inten, steps) {
    if (inten <= 0.01 || r < 1) return;
    if (color[0] !== '#') { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(color); color = '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join(''); }
    const rr = Math.max(1, Math.round(r)), sp = glowSprite(rr, color, steps ? Math.max(3, steps + 1) : 6);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, inten);
    g.drawImage(sp, Math.round(x) - rr, Math.round(y) - rr); g.restore();
  }

  /* ---------------- 空 ---------------- */
  function drawSky(T, env, st, t, horizon, opts) {
    const { W, H } = env, sk = env.sky, g = T.g, hz = horizon, part = (opts && opts.part) || 'all';
    if (part !== 'dyn') {
    // 縦のグラデーションをディザでつなぐ
    const stops = [[0, sk.top], [0.62, sk.mid], [1, sk.bot]];
    const colAt = f => { for (let i = 0; i < stops.length - 1; i++) { const [a, ca] = stops[i], [b, cb] = stops[i + 1]; if (f <= b) return mixc(ca, cb, (f - a) / (b - a)); } return stops[stops.length - 1][1]; };
    const bands = 14;
    for (let y = 0; y < H; y++) {
      const f = clamp(y / Math.max(1, hz), 0, 1), fb = f * bands, b0 = Math.floor(fb), fr = fb - b0;
      const c0 = css(colAt(b0 / bands)), c1 = css(colAt(Math.min(1, (b0 + 1) / bands)));
      g.fillStyle = c0; g.fillRect(0, y, W, 1);
      if (fr > 0.02) { g.fillStyle = c1; for (let x = 0; x < W; x++) if (bay(x, y) < fr) g.fillRect(x, y, 1, 1); }
    }
    // 天の川
    if (opts && opts.milky && env.stars > 0.2) {
      const a = env.stars * 0.5, r = RNG(env.seed + 77);
      for (let i = 0; i < W * H * 0.05; i++) {
        const u = r(), x = u * W, cy = hz * 0.15 + u * hz * 0.55 + (r() - 0.5) * hz * 0.28 * (0.6 + Math.sin(u * 7) * 0.4);
        if (cy < hz - 4) { g.fillStyle = css([180, 190, 235], a * (0.15 + r() * 0.35)); g.fillRect(x | 0, cy | 0, 1, 1); }
      }
    }
    }
    if (part === 'base') return;
    // 星
    if (env.stars > 0.02) {
      for (const s of st.stars) {
        if (s.y > hz - 3) continue;
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        g.fillStyle = css(s.c, Math.min(1, env.stars * tw * s.b)); g.fillRect(s.x, s.y, 1, 1);
        if (s.big && env.stars > 0.6) { g.fillStyle = css(s.c, env.stars * tw * 0.35); g.fillRect(s.x - 1, s.y, 3, 1); g.fillRect(s.x, s.y - 1, 1, 3); }
      }
    }
    // 太陽と月
    const h = env.hour;
    if (h > 5.4 && h < 19 && env.weather === 'clear' || h > 5.4 && h < 19 && env.weather === 'fog') {
      const p = (h - 5.6) / 13, sx = W * (0.08 + 0.84 * p), sy = hz - Math.sin(Math.PI * clamp(p, 0, 1)) * hz * 0.82 + 4;
      const fogA = env.weather === 'fog' ? 0.45 : 1;
      if (sy < hz + 6) { glow(g, sx, sy, 22, css(env.sky.sun), 0.5 * fogA); T.circ(sx, sy, 4, css(mixc(env.sky.sun, [255, 255, 255], 0.5), fogA)); }
    }
    if ((h > 18.2 || h < 6.6) && env.weather !== 'rain' && env.weather !== 'snow') {
      const p = ((h + 24 - 18.4) % 24) / 12, mx = W * (0.85 - 0.7 * p), my = hz - Math.sin(Math.PI * clamp(p, 0, 1)) * hz * 0.7 + 6;
      const a = env.weather === 'cloudy' ? 0.35 : env.weather === 'fog' ? 0.4 : 1;
      if (my < hz) {
        glow(g, mx, my, 14, '#9fb4e8', 0.35 * a);
        T.circ(mx, my, 3, css([236, 234, 214], a)); T.P(mx - 1, my - 1, css([206, 204, 186], a)); T.P(mx + 1, my + 1, css([214, 212, 194], a));
        st.moon = { x: mx, y: my };
      } else st.moon = null;
    } else st.moon = null;
  }
  function makeStars(env, n) {
    const r = RNG(env.seed + 5), out = [];
    for (let i = 0; i < n; i++) out.push({ x: r() * env.W | 0, y: Math.pow(r(), 1.4) * env.H | 0, b: 0.4 + r() * 0.6, sp: 0.5 + r() * 2.5, ph: r() * 6, big: r() < 0.04, c: r() < 0.2 ? [255, 220, 200] : r() < 0.3 ? [200, 215, 255] : [255, 255, 245] });
    return out;
  }
  // 雲：形の種類を混ぜる。ふわふわ（丸の集まり）・入道雲（下が平らで上にもくもく）・すじ雲・横長の層雲
  function makeClouds(env, n, yMax, rng) {
    const out = [];
    const heavy = env.cloudiness >= 0.8;
    if (heavy) n = Math.round(n * 1.3);
    const puff = (w, h, y, sp) => { const parts = []; for (let k = 0; k < Math.max(3, w / 6); k++) parts.push({ x: rng.range(-w / 2, w / 2), y: rng.range(-h / 3, h / 4), r: rng.range(h * 0.45, h * 0.95) }); return { kind: 'puff', x: rng() * (env.W + 60) - 30, y, w, h, parts, sp }; };
    for (let i = 0; i < n; i++) {
      const roll = rng();
      if (!heavy && roll < 0.16) {           // すじ雲（空の高いところ）
        const w = rng.int(24, 70), lines = [];
        for (let k = 0; k < rng.int(3, 6); k++) lines.push({ x: rng.range(-w / 2, w / 4), y: k * rng.int(1, 3) + rng.range(-1, 1), w: rng.range(w * 0.3, w * 0.8) });
        out.push({ kind: 'streak', x: rng() * (env.W + 60) - 30, y: rng.range(2, yMax * 0.45), w, lines, sp: rng.range(0.8, 1.6) });
      } else if (!heavy && roll < 0.28) {   // 横長の層雲
        const w = rng.int(40, 90), h = rng.int(3, 5);
        const c = puff(w, h, rng.range(yMax * 0.3, yMax), rng.range(0.4, 1)); c.kind = 'flat'; c.parts = c.parts.map(p => ({ ...p, y: p.y * 0.4, r: Math.max(3, p.r * 0.8) })); out.push(c);
      } else {
        const w = heavy ? rng.int(30, 80) : rng.int(10, 46), h = heavy ? rng.int(7, 14) : rng.int(4, 10);
        out.push(puff(w, h, heavy ? rng.range(-4, yMax * 0.8) : rng.range(4, yMax), rng.range(0.6, 2.2) * (rng() < 0.5 ? 1 : 0.6) * (heavy ? 0.6 : 1)));
      }
    }
    // 入道雲：晴れ・くもりの昼と夕方に、ときどき1つ。地平線の近くから大きく立ちのぼる
    if (!heavy && env.weather !== 'snow' && env.night < 0.5 && rng() < 0.55) {
      const W2 = rng.int(34, 64), H2 = Math.round(W2 * rng.range(0.9, 1.4)), parts = [], base = Math.round(yMax * rng.range(0.85, 1.25));
      for (let k = 0; k < 7; k++) parts.push({ x: (k / 6 - 0.5) * W2 * 0.95 + rng.range(-2, 2), y: -rng.range(2, 6), r: rng.range(W2 * 0.12, W2 * 0.2) });   // 平らな底の段
      let cx = rng.range(-W2 * 0.1, W2 * 0.1), cy = -W2 * 0.18;
      for (let k = 0; k < 9; k++) { const f = k / 8, wid = W2 * (0.42 - f * 0.22); for (let j = 0; j < 3; j++) parts.push({ x: cx + rng.range(-wid, wid), y: cy + rng.range(-3, 3), r: rng.range(W2 * (0.16 - f * 0.05), W2 * (0.24 - f * 0.08)) }); cy -= H2 * 0.1; cx += rng.range(-3, 3); }
      out.push({ kind: 'tower', x: rng() * (env.W + 40) - 20, y: base, w: W2, h: H2, parts, sp: rng.range(0.25, 0.5) });
    }
    // 遠いもの（入道雲・すじ雲）を先に描く
    const order = { tower: 0, streak: 1, flat: 2, puff: 3 };
    return out.sort((a, b) => order[a.kind] - order[b.kind]);
  }
  function drawClouds(T, env, clouds, t, alpha) {
    const heavy = env.cloudiness >= 0.8, c1 = css(env.sky.cloud, alpha), c2 = css(heavy ? mixc(env.sky.cloud, env.sky.cloudS, 0.45) : env.sky.cloudS, alpha);
    const hi = css(mixc(env.sky.cloud, [255, 255, 255], 0.5), alpha), mid = css(mixc(env.sky.cloud, env.sky.cloudS, 0.5), alpha), g = T.g;
    // 下を切った丸（入道雲の平らな底）
    const circB = (cx, cy, r, c, maxY) => { g.fillStyle = c; for (let y = -r; y <= r; y++) { const yy = Math.round(cy + y); if (yy > maxY) break; const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) + 0.35); g.fillRect(Math.round(cx - w), yy, w * 2 + 1, 1); } };
    for (const c of clouds) {
      const span = env.W + 80 + (c.w || 0), x = ((c.x + t * c.sp) % span + span) % span - 40 - (c.w || 0) / 2;
      if (c.kind === 'tower') {
        const by = c.y;
        for (const p of c.parts) circB(x + p.x, by + p.y + 1, Math.round(p.r), c2, by);
        for (const p of c.parts) circB(x + p.x - p.r * 0.12, by + p.y - p.r * 0.15, Math.round(p.r * 0.86), mid, by - 2);
        for (const p of c.parts) if (p.y < -c.h * 0.15) circB(x + p.x - p.r * 0.25, by + p.y - p.r * 0.3, Math.round(p.r * 0.62), c1, by - 4);
        g.fillStyle = c2; g.fillRect(Math.round(x - c.w * 0.5), by, Math.round(c.w), 1);
      } else if (c.kind === 'streak') {
        g.fillStyle = css(env.sky.cloud, alpha * 0.55);
        for (const l of c.lines) for (let i = 0; i < l.w; i++) { const e = Math.min(i, l.w - i); if (e > 3 || bay(Math.round(x + l.x + i), Math.round(c.y + l.y)) < e / 4) g.fillRect(Math.round(x + l.x + i), Math.round(c.y + l.y), 1, 1); }
      } else {
        for (const p of c.parts) T.circ(x + p.x, c.y + p.y + 1, Math.round(p.r), c2);
        for (const p of c.parts) T.circ(x + p.x, c.y + p.y - 0.5, Math.round(p.r * 0.85), c1);
        if (c.kind === 'puff' && !heavy) for (const p of c.parts) if (p.r > 3 && p.y < 0) T.circ(x + p.x - p.r * 0.3, c.y + p.y - p.r * 0.35, Math.round(p.r * 0.35), hi);
      }
    }
  }

  /* ---------------- 天気の粒 ---------------- */
  function makeWeather(env, rng) {
    const n = env.weather === 'rain' ? env.W * env.H / 55 : env.weather === 'snow' ? env.W * env.H / 70 : 0, ps = [];
    for (let i = 0; i < n; i++) ps.push({ x: rng() * env.W, y: rng() * env.H, z: 0.4 + rng() * 0.6, ph: rng() * 6.28, floor: env.H * (0.55 + rng() * 0.45) });
    const fog = []; if (env.weather === 'fog') for (let i = 0; i < 7; i++) fog.push({ y: rng() * env.H, h: 3 + rng() * 9, sp: (rng() - 0.5) * 3, a: 0.12 + rng() * 0.16, seed: rng() * 1000 | 0 });
    return { ps, fog, splash: [] };
  }
  function drawWeather(T, env, w, t, dt, wind) {
    const g = T.g, W = env.W, H = env.H;
    if (env.weather === 'rain') {
      const c = env.col('#b8c8e0', 0, 0.55), c2 = env.col('#d8e4f4', 0, 0.35);
      for (const p of w.ps) {
        p.y += dt * 120 * p.z; p.x += dt * (wind || -18) * p.z;
        if (p.y > p.floor) { if (Math.random() < 0.3) w.splash.push({ x: p.x, y: p.floor, t: 0 }); p.y = -4; p.x = Math.random() * (W + 20) - 10; }
        if (p.x < -4) p.x += W + 8; if (p.x > W + 4) p.x -= W + 8;
        const L = p.z > 0.75 ? 4 : 3; g.fillStyle = c; for (let k = 0; k < L; k++) g.fillRect(Math.round(p.x - k * (wind || -18) / 120), Math.round(p.y - k), 1, 1);
      }
      g.fillStyle = c2; w.splash = w.splash.filter(s => { s.t += dt; if (s.t < 0.15) { g.fillRect(Math.round(s.x - 1), Math.round(s.y), 1, 1); g.fillRect(Math.round(s.x + 1), Math.round(s.y), 1, 1); } return s.t < 0.15; });
    } else if (env.weather === 'snow') {
      const c = env.col('#ffffff', 0, 0.9), cf = env.col('#ffffff', 0, 0.55);
      for (const p of w.ps) {
        p.y += dt * 9 * p.z; p.x += dt * ((wind || 0) * 0.3 + Math.sin(t * 0.8 + p.ph) * 4 * p.z);
        if (p.y > H + 2) { p.y = -2; p.x = Math.random() * W; }
        if (p.x < -2) p.x += W + 4; if (p.x > W + 2) p.x -= W + 4;
        g.fillStyle = p.z > 0.8 ? c : cf; g.fillRect(Math.round(p.x), Math.round(p.y), p.z > 0.93 ? 2 : 1, p.z > 0.93 ? 2 : 1);
      }
    } else if (env.weather === 'fog') {
      for (const f of w.fog) {
        const n = noise1(f.seed), base = env.col('#e6ebf0', 0, f.a);
        g.fillStyle = base;
        for (let x = 0; x < W; x++) { const v = n((x + t * f.sp * 4) * 0.05), hh = Math.round(f.h * v); for (let j = 0; j < hh; j++) if (bay(x, j) < 0.7) g.fillRect(x, Math.round(f.y + (f.h - hh) / 2 + j), 1, 1); }
        f.y += f.sp * dt * 0.2; if (f.y > H) f.y = -f.h; if (f.y < -f.h) f.y = H;
      }
    }
  }

  window.TookuEngine = { RNG, noise1, fbm, noise2, fbm2, bay, clamp, lerp, rgb, css, mixc, todAt, makeEnv, tools, glow, drawSky, makeStars, makeClouds, drawClouds, makeWeather, drawWeather, WEATHER, TOD_NAME, FIXED_HOUR };
})();
