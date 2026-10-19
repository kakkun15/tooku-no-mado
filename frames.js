/* とおくの窓：眺め方（窓越し・テレビ越し・パソコン越し）。
   景色は layout() が返す四角の中に描かれ、そのまわりの部屋をここで描く。
   部屋の明るさは景色の時間帯に合わせる（夜は暗く、明かりで少し暖かい色に） */
(function () {
  'use strict';
  const E = window.TookuEngine, { clamp, bay } = E;

  /* 景色を描く四角（ビューのドット単位） */
  /* 景色を描く四角（ビューのドット単位）。テレビは 4:3（ブラウン管）、パソコンは 16:9 に固定して、画面の大きさに合わせて置く */
  const fitAspect = (maxW, maxH, ar) => { let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; } return [Math.round(w), Math.round(h)]; };
  /* テレビの寸法：b＝画面まわりの木の縁、bev＝画面へ落ちこむ傾斜、panel＝横のつまみ板（横長のとき）、
     panelH＝下のスピーカー（縦長のとき）、dx・dy＝箱の上面と右の側面を見せる奥行き */
  function tvDims(VW, VH, port) {
    return { b: port ? 8 : 9, bev: 3, panel: port ? 0 : Math.max(18, Math.round(VW * 0.11)), panelH: port ? 14 : 0, dx: 5, dy: 3 };
  }
  function layout(kind, VW, VH) {
    const port = VH > VW * 1.15, R = (x, y, w, h) => ({ x: Math.round(x), y: Math.round(y), w: Math.max(40, Math.round(w)), h: Math.max(30, Math.round(h)) });
    if (kind === 'window') {
      const sx = Math.max(9, VW * 0.08), top = Math.max(10, VH * 0.075), bot = port ? VH * 0.24 : Math.max(22, VH * 0.2);
      return R(sx, top, VW - sx * 2, VH - top - bot);
    }
    if (kind === 'tv') {
      const d = tvDims(VW, VH, port);
      if (port) {        // 縦長：テレビを台に置く。下に床
        const [w, h] = fitAspect(VW * 0.7, VH * 0.34, 4 / 3), bottom = Math.round(VH * 0.64) - 8 - d.panelH - d.b;
        return R((VW - (w + d.b * 2 + d.dx)) / 2 + d.b, bottom - h, w, h);
      }
      // 横長：まわりに棚とライトを置くので、テレビは真ん中にやや小さく
      const [w, h] = fitAspect(VW * 0.58 - d.panel, VH * 0.48, 4 / 3), total = w + d.b * 2 + d.panel + d.dx;
      return R((VW - total) / 2 + d.b, Math.max(16, VH * 0.2), w, h);
    }
    if (kind === 'train') {     // 電車の窓。景色はこの四角より広く描いて、見える範囲を少しずつずらす（stage.js）
      if (port) return R(VW * 0.07, VH * 0.2, VW * 0.86, VH * 0.36);
      return R(VW * 0.09, Math.max(18, VH * 0.17), VW * 0.82, VH * 0.52);
    }
    if (kind === 'pc') {
      if (port) { const [w, h] = fitAspect(VW * 0.86, VH * 0.4, 16 / 9); return R((VW - w) / 2, VH * 0.36, w, h); }
      const [w, h] = fitAspect(VW * 0.84, VH * 0.56, 16 / 9);
      return R((VW - w) / 2, Math.max(12, VH * 0.08) + 6, w, h);
    }
    return { x: 0, y: 0, w: VW, h: VH };
  }
  /* 部屋の色：昼はそのまま、夜は暗く、明かりがついていれば暖かく */
  function lighting(env) {
    const n = env.night, warm = env.lights * n, dim = env.weather === 'rain' ? 0.88 : env.weather === 'cloudy' || env.weather === 'fog' ? 0.94 : 1;
    const m = [(1 - 0.6 * n + 0.3 * warm) * dim, (1 - 0.62 * n + 0.22 * warm) * dim, (1 - 0.58 * n + 0.1 * warm) * dim];
    return (hex, a) => {
      const v = parseInt(hex.slice(1), 16), r = clamp(((v >> 16) & 255) * m[0], 0, 255) | 0, g = clamp(((v >> 8) & 255) * m[1], 0, 255) | 0, b = clamp((v & 255) * m[2], 0, 255) | 0;
      return a === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
    };
  }

  /* 壁紙：細い縦じま＋下の腰板 */
  function wall(T, c, VW, VH, base, stripe, from) {
    T.R(0, 0, VW, VH, c(base));
    for (let x = 2; x < VW; x += 6) T.V(x, 0, from === undefined ? VH : from, c(stripe));
  }
  function floorBoards(T, c, VW, y0, VH, col, line) {
    T.R(0, y0, VW, VH - y0, c(col));
    for (let y = y0 + 3; y < VH; y += 4) T.H(0, y, VW, c(line));
    for (let y = y0, k = 0; y < VH; y += 4, k++) for (let x = (k * 13) % 23; x < VW; x += 23) T.V(x, y, 3, c(line));
    T.H(0, y0, VW, c(line));
  }
  function mug(T, c, x, y) {     // y は机・窓台の上の面
    T.R(x, y - 4, 4, 4, c('#ece6da')); T.V(x + 3, y - 4, 4, c('#c9c2b6')); T.H(x, y - 4, 4, c('#5a3a2a'));
    T.P(x + 4, y - 3, c('#ece6da')); T.P(x + 5, y - 3, c('#ece6da')); T.P(x + 5, y - 2, c('#ece6da')); T.P(x + 4, y - 1, c('#ece6da'));
    return [x + 2, y - 5];
  }
  function plant(T, c, x, y) {
    T.poly([[x - 3, y - 5], [x + 4, y - 5], [x + 3, y], [x - 2, y]], c('#b4643e')); T.H(x - 3, y - 5, 7, c('#c8784c'));
    const lv = [[-3, -8, 2], [1, -10, 2], [3, -7, 2], [-1, -12, 1], [-4, -11, 1], [4, -11, 1]];
    for (const [dx, dy, r] of lv) T.circ(x + dx, y + dy, r, c('#3f7a44'));
    for (const [dx, dy, r] of lv) T.P(x + dx - (r > 1 ? 1 : 0), y + dy - (r > 1 ? 1 : 0), c('#5e9e58'));
    T.V(x, y - 9, 4, c('#3a6a3a'));
  }

  /* ---------- 窓 ---------- */
  function drawWindow(T, c, VW, VH, F, env) {
    const fw = 3, sillY = F.y + F.h + fw, wain = sillY + Math.round((VH - sillY) * 0.45);
    wall(T, c, VW, VH, '#e8dbc2', '#e0d0b4', wain);
    // 腰板
    T.R(0, wain, VW, VH - wain, c('#b99a72')); T.H(0, wain, VW, c('#9a7a54')); T.H(0, wain + 1, VW, c('#cdb088'));
    for (let x = 4; x < VW - 6; x += 18) { T.R(x, wain + 4, 14, VH - wain - 7, c('#ad8e66')); T.H(x, wain + 4, 14, c('#977650')); T.V(x, wain + 4, VH - wain - 7, c('#977650')); }
    // 窓枠
    T.R(F.x - fw, F.y - fw, F.w + fw * 2, F.h + fw * 2, c('#8a5f3c'));
    T.H(F.x - fw, F.y - fw, F.w + fw * 2, c('#a87a50')); T.V(F.x - fw, F.y - fw, F.h + fw * 2, c('#a87a50'));
    T.g.clearRect(F.x, F.y, F.w, F.h);
    // 2枚の窓の合わせ目（真ん中より少し右）
    const mx = F.x + Math.round(F.w * 0.54);
    T.R(mx - 1, F.y, 2, F.h, c('#8a5f3c')); T.V(mx - 1, F.y, F.h, c('#a07250'));
    // ガラスの映り込み・天気
    const glass = (x, y, a) => T.P(x, y, `rgba(255,255,255,${a})`);
    for (let k = 0; k < F.h; k++) { const x1 = F.x + 4 + Math.round(k * 0.6); if (x1 + 3 < mx - 2 && k > F.h * 0.08 && k < F.h * 0.38) { glass(x1, F.y + k, 0.07); glass(x1 + 2, F.y + k, 0.05); } }
    for (let k = 0; k < F.h * 0.25; k++) { const x1 = mx + 6 + Math.round(k * 0.6); if (x1 < F.x + F.w - 2) glass(x1, F.y + F.h * 0.55 + k, 0.05); }
    if (env.weather === 'rain') {
      const r = E.RNG(F.w * 7 + F.h); for (let i = 0; i < F.w * F.h / 160; i++) { const x = F.x + 1 + (r() * (F.w - 2) | 0), y = F.y + 1 + (r() * (F.h - 3) | 0); glass(x, y, 0.45); T.P(x, y + 1, 'rgba(60,80,110,0.25)'); if (r() < 0.3) for (let k = 2; k < 2 + (r() * 5 | 0); k++) glass(x, y + k, 0.18); }
    }
    if (env.weather === 'snow') {      // 窓の下のすみに積もった雪
      for (const [x0, x1] of [[F.x, mx - 1], [mx + 1, F.x + F.w]]) for (let x = x0; x < x1; x++) { const e = Math.min(x - x0, x1 - 1 - x), h = e < 6 ? Math.round(3 - e * 0.35) : 0; for (let k = 0; k < h; k++) T.P(x, F.y + F.h - 1 - k, c(k === h - 1 ? '#dfe7f1' : '#f4f8fc')); }
      for (let x = F.x; x < F.x + F.w; x++) if (((x * 7) % 5) < 3) T.P(x, F.y + F.h - 1, c('#f4f8fc'));
    }
    if (env.weather === 'fog') T.R(F.x, F.y + F.h - 5, F.w, 5, 'rgba(240,244,248,0.12)');
    // 窓台
    T.R(F.x - fw - 4, sillY, F.w + fw * 2 + 8, 3, c('#9a6c44')); T.H(F.x - fw - 4, sillY, F.w + fw * 2 + 8, c('#c4935f')); T.H(F.x - fw - 3, sillY + 3, F.w + fw * 2 + 6, c('#b8a284'));
    plant(T, c, F.x + Math.round(F.w * 0.26), sillY);
    const m = mug(T, c, F.x + Math.round(F.w * 0.74), sillY);
    // カーテン（左は留めて寄せ、右はまっすぐ。左右をそろえない）
    const rodY = F.y - fw - 3;
    T.H(F.x - fw - 7, rodY, F.w + fw * 2 + 14, c('#5a4636')); T.R(F.x - fw - 8, rodY - 1, 2, 3, c('#5a4636')); T.R(F.x + F.w + fw + 6, rodY - 1, 2, 3, c('#5a4636'));
    const cur = (x0, wTop, y0, y1, dir, tieAt) => {
      for (let y = y0; y <= y1; y++) {
        const f = (y - y0) / (y1 - y0); let w = wTop;
        if (tieAt) { const d = f - tieAt; w = wTop * (d < 0 ? 1 - 0.55 * Math.pow(1 + d / tieAt, 2) : 0.45 + 0.75 * Math.min(1, d / (1 - tieAt))); }
        w = Math.max(2, Math.round(w));
        for (let i = 0; i < w; i++) {
          const x = dir > 0 ? x0 + i : x0 - i, band = ((i * 4 / Math.max(3, w)) | 0) % 2;
          T.P(x, y, c(i === w - 1 ? '#5f7866' : band ? '#7b967f' : '#91ab94'));
        }
        if (y % 2 === 0) T.P(dir > 0 ? x0 : x0, y, c('#a9c0aa'));
      }
      if (tieAt) { const ty = Math.round(y0 + (y1 - y0) * tieAt); const tw = Math.round(wTop * 0.45); for (let i = 0; i < tw + 1; i++) T.P(dir > 0 ? x0 + i : x0 - i, ty, c('#c8a060')); }
    };
    cur(F.x - fw - 5, Math.max(6, F.w * 0.17), rodY + 1, sillY + 6, 1, 0.62);
    cur(F.x + F.w + fw + 4, Math.max(4, F.w * 0.07), rodY + 1, sillY + 6, -1, 0);
    return { mug: m };
  }

  /* ---------- 部屋の小物（横長の画面で両わきが空かないように） ---------- */
  function books(T, c, x0, x1, base, seed, maxH) {
    const cols = ['#7a8fb0', '#c8846a', '#e0c070', '#6f9a7a', '#b06a7a', '#8a7ab0', '#d8d0c0'], r = E.RNG(seed);
    let x = x0;
    for (let i = 0; x < x1 - 2 && i < 12; i++) { const h = Math.max(4, maxH - (r() * 4 | 0)), w = 2 + (r() * 2 | 0), col = cols[(i * 3 + seed) % cols.length]; if (x + w > x1) break; T.R(x, base - h, w, h, c(col)); T.H(x, base - h + 2, w, c('#f0e8d8', 0.5)); x += w + (r() < 0.2 ? 1 : 0); }
    return x;
  }
  function clock(T, c, cx, cy) { T.circ(cx, cy, 6, c('#6a4a30')); T.circ(cx, cy, 5, c('#f2ead8')); T.line(cx, cy, cx, cy - 3, c('#2a2a2a')); T.line(cx, cy, cx + 2, cy + 1, c('#2a2a2a')); }
  /* 壁の小さな絵（丘と太陽）。額の縁は時間帯で暗くなる */
  function picture(T, c, x, y, w, h) {
    T.R(x, y, w, h, c('#5a3e28')); T.H(x, y, w, c('#76563a'));
    T.R(x + 1, y + 1, w - 2, h - 2, c('#e8e0cc'));
    const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
    T.R(ix, iy, iw, ih, c('#a8c8dc')); T.R(ix, iy + Math.round(ih * 0.45), iw, ih - Math.round(ih * 0.45), c('#c4dae6'));
    T.poly([[ix, iy + ih * 0.75], [ix + iw * 0.35, iy + ih * 0.42], [ix + iw * 0.62, iy + ih * 0.7], [ix + iw, iy + ih * 0.55], [ix + iw, iy + ih], [ix, iy + ih]], c('#7a9a78'));
    T.poly([[ix, iy + ih * 0.9], [ix + iw * 0.5, iy + ih * 0.72], [ix + iw, iy + ih * 0.86], [ix + iw, iy + ih], [ix, iy + ih]], c('#5f8462'));
    T.P(ix + Math.round(iw * 0.75), iy + 1, c('#f4e2a0')); T.P(ix + Math.round(iw * 0.75) + 1, iy + 1, c('#f4e2a0'));
    T.P(x + Math.round(w / 2), y - 2, c('#4a3a2a')); T.line(x + 2, y, x + Math.round(w / 2), y - 2, c('#4a3a2a', 0.6)); T.line(x + w - 3, y, x + Math.round(w / 2), y - 2, c('#4a3a2a', 0.6));
  }
  /* 床置きの低い棚：左にレコード、右に本。上に植物と寝かせた本 */
  function lowShelf(T, c, x, base, w, h, seed) {
    const top = base - h;
    T.R(x, top, w, h, c('#7a5436')); T.R(x - 1, top, w + 2, 2, c('#93684a')); T.H(x - 1, top, w + 2, c('#a87a54'));
    T.H(x, base - 1, w, c('#5a3c26'));
    const mid = x + Math.round(w * 0.48), cy = top + 3, ch = h - 5;
    T.R(x + 2, cy, mid - x - 3, ch, c('#4a3020')); T.R(mid + 1, cy, x + w - mid - 3, ch, c('#4a3020'));
    const rec = ['#2a2a2e', '#c8846a', '#2a2a2e', '#3a4a6a', '#e0c070', '#2a2a2e'];
    for (let xx = x + 2, i = 0; xx < mid - 1; xx++, i++) T.V(xx, cy + 1, ch - 1, c(rec[i % rec.length]));
    books(T, c, mid + 2, x + w - 2, cy + ch, seed, ch - 1);
    plant(T, c, x + Math.round(w * 0.74), top);
    T.R(x + 3, top - 2, 8, 2, c('#b06a7a')); T.R(x + 4, top - 4, 7, 2, c('#7a8fb0')); T.H(x + 4, top - 4, 7, c('#9aaed0'));
  }
  /* 立てるライト：夕方と夜は灯る */
  function floorLamp(T, c, x, base, top, env) {
    const on = env.lights > 0.25;
    if (on) { const g = T.g, gr = g.createRadialGradient(x, top + 4, 2, x, top + 4, 30); gr.addColorStop(0, `rgba(255,200,120,${(0.35 * env.lights).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 30, top - 26, 60, 60); }
    T.ellipse(x, base, 4, 1, c('#3a3030')); T.V(x, top + 7, base - top - 7, c('#4a4040')); T.V(x + 1, top + 7, base - top - 7, c('#2e2828'));
    T.poly([[x - 3, top], [x + 4, top], [x + 7, top + 7], [x - 6, top + 7]], on ? '#f6dc9c' : c('#e6d6b4'));
    T.H(x - 6, top + 7, 14, on ? '#e0b870' : c('#c8b48e')); T.H(x - 3, top, 7, on ? '#fff0c8' : c('#f0e4c8'));
    if (on) for (let k = 1; k < 5; k++) T.H(x - 5 - Math.round(k * 0.6), top + 7 + k, 12 + Math.round(k * 1.2), `rgba(255,220,150,${(0.16 * (5 - k) / 4 * env.lights).toFixed(3)})`);
  }
  /* 壁のコルクボード（メモと写真） */
  function corkboard(T, c, x, y, w, h) {
    T.R(x, y, w, h, c('#8a6040')); T.R(x + 1, y + 1, w - 2, h - 2, c('#c89a62'));
    for (let i = 0; i < w * h / 8; i++) { const px = x + 1 + ((i * 7) % (w - 2)), py = y + 1 + ((i * 11) % (h - 2)); T.P(px, py, c('#b5864f')); }
    const note = (nx, ny, nw, nh, col) => { if (nx + nw > x + w - 1 || ny + nh > y + h - 1) return; T.R(nx, ny, nw, nh, c(col)); T.H(nx + 1, ny + 2, nw - 2, c('#000000', 0.12)); T.P(nx + Math.round(nw / 2), ny, c('#c8463a')); };
    note(x + 2, y + 2, 6, 5, '#f2e6a0'); note(x + Math.round(w * 0.55), y + 3, 5, 5, '#f0b8b0'); note(x + 3, y + Math.round(h * 0.55), 5, 4, '#b8d8f0');
    const px = x + Math.round(w * 0.45), py = y + Math.round(h * 0.5);       // 写真
    if (px + 7 < x + w && py + 6 < y + h) { T.R(px, py, 7, 6, c('#f4f0e8')); T.R(px + 1, py + 1, 5, 2, c('#9ec0dc')); T.R(px + 1, py + 3, 5, 2, c('#7aa070')); T.P(px + 3, py, c('#3a6aa8')); }
  }
  /* 机のライト（腕を曲げて、頭を画面のほうへ）。夕方と夜は灯る */
  function deskLamp(T, c, x, desk, env, dir) {      // dir：頭を向ける側（-1＝左）
    const on = env.lights > 0.25, ex = x - dir * 3, ey = desk - 10, hx = x + dir * 2, hy = desk - 16;
    T.R(x - 4, desk - 2, 8, 2, c('#3a3c44')); T.H(x - 4, desk - 2, 8, c('#55585f'));
    T.line(x, desk - 2, ex, ey, c('#4a4c54')); T.line(ex, ey, hx, hy, c('#4a4c54')); T.P(ex, ey, c('#2e3036'));
    T.poly([[hx - dir, hy - 2], [hx + dir * 4, hy - 1], [hx + dir * 7, hy + 4], [hx + dir * 1, hy + 4]], c('#c85a4a'));
    T.P(hx, hy - 2, c('#e07a64')); T.P(hx + dir, hy - 2, c('#e07a64'));
    const lx = hx + dir * 4, ly = hy + 4;
    if (on) {
      const g = T.g, gr = g.createRadialGradient(lx, desk, 1, lx, desk, 24);
      gr.addColorStop(0, `rgba(255,210,140,${(0.34 * env.lights).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gr; g.fillRect(lx - 24, desk - 24, 48, 48);
      T.H(Math.min(hx + dir, hx + dir * 6), ly, 5, '#ffe6a8');
    }
  }

  /* ---------- テレビ ---------- */
  function drawTV(T, c, VW, VH, F, env, port) {
    const d = tvDims(VW, VH, port), { b, bev, dx, dy } = d;
    const cab = { x: F.x - b, y: F.y - b, w: F.w + b * 2 + d.panel, h: F.h + b * 2 + d.panelH };
    const legH = 8, floorY = Math.min(VH - 3, cab.y + cab.h + legH);
    wall(T, c, VW, VH, '#d6c7a4', '#cdbd98', floorY);
    // 夜はテレビの光が壁と床に映る
    if (env.night > 0.3) { const g = T.g, gr = g.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, 4, F.x + F.w / 2, F.y + F.h / 2, Math.max(F.w, F.h) * 1.1); gr.addColorStop(0, `rgba(150,180,255,${0.22 * env.night})`); gr.addColorStop(1, 'rgba(150,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, VW, floorY); }
    floorBoards(T, c, VW, floorY, VH, '#8c6a48', '#76583a');
    if (env.night > 0.3) { const g = T.g, gr = g.createRadialGradient(F.x + F.w / 2, floorY + 4, 2, F.x + F.w / 2, floorY + 4, F.w * 0.7); gr.addColorStop(0, `rgba(150,180,255,${0.16 * env.night})`); gr.addColorStop(1, 'rgba(150,180,255,0)'); g.fillStyle = gr; g.fillRect(0, floorY, VW, VH - floorY); }
    if (port) {         // 縦長の画面では床が広いので、敷物と、壁に時計
      const ry = floorY + Math.round((VH - floorY) * 0.5), rw = Math.round(VW * 0.36), rh = Math.max(4, Math.round((VH - floorY) * 0.22));
      T.ellipse(VW / 2, ry, rw, rh, c('#9a5a4a')); T.ellipse(VW / 2, ry, rw - 3, Math.max(2, rh - 2), c('#b46e58'));
      for (let x = -rw + 6; x < rw - 6; x += 6) T.P(VW / 2 + x, ry, c('#d49a72'));
      const cx = Math.round(VW * 0.78), cy = Math.round(Math.max(10, (cab.y - dy - 18) * 0.55));
      if (cy > 8 && cy + 8 < cab.y - dy - 16) clock(T, c, cx, cy);
    } else {            // 横長：左に低い棚と壁の絵、右に立てるライト（左右をそろえない）
      const left = cab.x - 3, rs = cab.x + cab.w + dx + 3;
      if (left >= 16) {
        const sw = Math.min(left - 4, 30), sh = clamp(Math.round(cab.h * 0.34), 12, 19), sx = Math.max(2, Math.round((left - sw) * 0.4)), base = floorY + 2;
        lowShelf(T, c, sx, base, sw, sh, VW);
        const pw = clamp(sw - 6, 10, 20), ph = Math.round(pw * 0.78), px = sx + Math.round((sw - pw) * 0.62), py = Math.min(cab.y + 10, base - sh - ph - 14);
        if (py > 4) picture(T, c, px, py, pw, ph);
      }
      if (VW - rs >= 12) floorLamp(T, c, rs + Math.round((VW - rs) * 0.5), floorY + 3, Math.max(4, cab.y - dy + 2), env);
    }
    // 脚
    const lx0 = cab.x + 6, lx1 = cab.x + cab.w - 7 + Math.round(dx / 2), ly = cab.y + cab.h;
    for (const [x, s] of [[lx0, -1], [lx1, 1]]) { T.line(x, ly, x + s * 2, floorY + 1, c('#3a2a1e')); T.line(x - s, ly, x + s, floorY + 1, c('#3a2a1e')); }
    T.R(cab.x + 4, floorY + 1, cab.w - 8 + dx, 1, c('#5e4630', 0.6));
    // 箱の上面と右の側面（奥行き）
    const x1 = cab.x + cab.w, y1 = cab.y + cab.h;
    T.poly([[cab.x, cab.y], [cab.x + dx, cab.y - dy], [x1 + dx, cab.y - dy], [x1, cab.y]], c('#94684a'));
    T.H(cab.x + dx, cab.y - dy, cab.w, c('#ad8058'));
    T.poly([[x1, cab.y], [x1 + dx, cab.y - dy], [x1 + dx, y1 - dy], [x1, y1]], c('#4a301e'));
    for (let y = cab.y + 2; y < y1 - dy; y += 4) T.line(x1 + 1, y + 1, x1 + dx - 1, y - dy + 2, c('#3e2818'));
    // アンテナ（上面に乗せる）
    const ax = cab.x + Math.round(cab.w * (port ? 0.5 : 0.42)) + 2, ay = cab.y - dy + 1, al = Math.max(4, Math.min(15, ay - 2));
    T.R(ax - 3, ay - 2, 7, 2, c('#3a3a40')); T.H(ax - 3, ay - 2, 7, c('#55555c'));
    const tip1 = [ax - Math.round(al * 0.9), ay - al], tip2 = [ax + Math.round(al * 0.75), ay - al - 1];
    T.line(ax - 1, ay - 2, tip1[0], tip1[1], c('#9aa0a8')); T.line(ax + 1, ay - 2, tip2[0], tip2[1], c('#9aa0a8'));
    T.P(tip1[0], tip1[1], c('#c8ccd2')); T.P(tip2[0], tip2[1], c('#c8ccd2'));
    // 正面の木の箱
    T.R(cab.x, cab.y, cab.w, cab.h, c('#6e4a2e'));
    for (let y = cab.y + 2; y < y1 - 1; y += 3) for (let x = cab.x + ((y * 5) % 9); x < x1 - 2; x += 11) T.H(x, y, Math.min(5, x1 - 2 - x), c('#62412a'));
    T.H(cab.x, cab.y, cab.w, c('#8a6040')); T.V(cab.x, cab.y, cab.h, c('#7e5636')); T.H(cab.x, y1 - 1, cab.w, c('#4e3420')); T.V(x1 - 1, cab.y, cab.h, c('#4e3420'));
    // 画面の穴のふち（上は影、下は光を受ける）
    const o = { x: F.x - bev, y: F.y - bev, w: F.w + bev * 2, h: F.h + bev * 2 };
    T.R(o.x - 1, o.y - 1, o.w + 2, 1, c('#4a3220')); T.R(o.x - 1, o.y - 1, 1, o.h + 2, c('#4a3220'));
    T.R(o.x - 1, o.y + o.h, o.w + 2, 1, c('#9a6e48')); T.R(o.x + o.w, o.y - 1, 1, o.h + 2, c('#8a6040'));
    // 画面へ落ちこむ傾斜（奥にある画面）
    for (let k = 0; k < bev; k++) {
      const x0 = o.x + k, yy0 = o.y + k, w = o.w - k * 2, h = o.h - k * 2, sh = k / bev;
      T.H(x0, yy0, w, c(sh < 0.5 ? '#1a1a1e' : '#141418'));
      T.V(x0, yy0 + 1, h - 2, c('#24242a'));
      T.V(x0 + w - 1, yy0 + 1, h - 2, c('#2c2c32'));
      T.H(x0, yy0 + h - 1, w, c(k === 0 ? '#4a4a52' : '#3a3a42'));
    }
    T.g.clearRect(F.x, F.y, F.w, F.h);
    // 丸い角
    const rad = 5, dark = c('#141418');
    for (let y = 0; y < rad; y++) for (let x = 0; x < rad; x++) if ((rad - x - 0.5) ** 2 + (rad - y - 0.5) ** 2 > rad * rad) {
      T.P(F.x + x, F.y + y, dark); T.P(F.x + F.w - 1 - x, F.y + y, dark); T.P(F.x + x, F.y + F.h - 1 - y, dark); T.P(F.x + F.w - 1 - x, F.y + F.h - 1 - y, dark);
    }
    // 走査線、上の縁が落とす影、ガラスの丸みの映り込み・すみの暗さ
    for (let y = F.y + 1; y < F.y + F.h; y += 2) T.R(F.x, y, F.w, 1, 'rgba(0,0,0,0.07)');
    T.R(F.x, F.y, F.w, 1, 'rgba(0,0,0,0.28)'); T.R(F.x, F.y + 1, F.w, 1, 'rgba(0,0,0,0.12)'); T.R(F.x, F.y, 1, F.h, 'rgba(0,0,0,0.14)');
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const u = (x / F.w - 0.5) * 2, v = (y / F.h - 0.5) * 2, dd = u * u * u * u + v * v * v * v; if (dd > 0.5 && bay(x, y) < (dd - 0.5) * 1.0) T.P(F.x + x, F.y + y, 'rgba(0,0,0,0.38)'); }
    const hl = Math.min(F.w, F.h);
    for (let k = 0; k < hl * 0.38; k++) { const yy = F.y + 4 + Math.round(k * k * 0.018); T.P(F.x + 6 + k, yy, 'rgba(255,255,255,0.16)'); T.P(F.x + 6 + k, yy + 1, 'rgba(255,255,255,0.07)'); }
    for (let k = 0; k < hl * 0.12; k++) T.P(F.x + 4, F.y + 7 + k, 'rgba(255,255,255,0.1)');
    // つまみとスピーカー
    const knob = (x, y) => { T.circ(x, y, 3, c('#2e2e34')); T.circ(x, y, 2, c('#c8c0b0')); T.P(x, y - 2, c('#2e2e34')); T.P(x - 1, y - 1, c('#e4ddcc')); T.P(x + 1, y + 3, c('#000000', 0.25)); };
    if (port) {
      const py = F.y + F.h + bev + 3, ph = y1 - py - 3;
      T.R(cab.x + 6, py, Math.round(cab.w * 0.55), ph, c('#4a3220'));
      for (let y = py + 1; y < py + ph; y += 2) T.H(cab.x + 7, y, Math.round(cab.w * 0.55) - 2, c('#2e2016'));
      knob(x1 - 18, py + ph / 2); knob(x1 - 9, py + ph / 2);
    } else {
      const px = F.x + F.w + bev + 4, pw = x1 - px - 4;
      knob(px + pw / 2, F.y + 4); knob(px + pw / 2, F.y + 13);
      const gy = F.y + 21, gh = Math.max(6, F.y + F.h - gy - 2);
      T.R(px, gy, pw, gh, c('#4a3220')); for (let y = gy + 1; y < gy + gh; y += 2) T.H(px + 1, y, pw - 2, c('#2e2016'));
    }
    const led = port ? [x1 - 5, y1 - 4] : [x1 - 5, F.y + F.h + 2];
    T.P(led[0], led[1], env.night > 0.3 ? '#ff5a3a' : c('#c84a30'));
    return {};
  }

  /* ---------- パソコン ---------- */
  function drawPC(T, c, VW, VH, F, env, port) {
    const b = 3, tb = 6, standH = Math.max(5, Math.round(F.h * 0.12)), deskY = F.y + F.h + b + standH;
    const surf = clamp(Math.round((VH - deskY) * (port ? 0.42 : 0.7)), 14, 44);
    wall(T, c, VW, VH, '#a9b4c2', '#a1acba', deskY);
    if (env.night > 0.3) { const g = T.g, gr = g.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, 4, F.x + F.w / 2, F.y + F.h / 2, Math.max(F.w, F.h) * 0.9); gr.addColorStop(0, `rgba(170,200,255,${0.2 * env.night})`); gr.addColorStop(1, 'rgba(170,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, VW, deskY + surf); }
    // 縦長の画面では、壁に棚と本
    if (port) {
      const sy = Math.round(F.y - tb - b - Math.max(10, (F.y - tb - b) * 0.35)), sx0 = Math.round(VW * 0.14), sx1 = Math.round(VW * 0.62);
      if (sy > 16) {
        T.R(sx0, sy, sx1 - sx0, 2, c('#8a6040')); T.H(sx0, sy, sx1 - sx0, c('#a87a50')); T.P(sx0 + 3, sy + 2, c('#6a4a30')); T.P(sx1 - 4, sy + 2, c('#6a4a30'));
        const x = books(T, c, sx0 + 3, sx1 - 10, sy, VW * 3 + 7, 11);
        T.poly([[x + 1, sy], [x + 9, sy - 7], [x + 11, sy - 6], [x + 3, sy]], c('#6f9a7a'));     // 寝かせた本
        plant(T, c, sx1 - 4, sy);
      }
    }
    // 机
    T.R(0, deskY, VW, VH - deskY, c('#5a4434'));
    T.R(0, deskY, VW, surf, c('#a87c52')); T.H(0, deskY, VW, c('#c8996a')); T.H(0, deskY + 1, VW, c('#b88a5c'));
    for (let y = deskY + 4; y < deskY + surf - 2; y += 5) for (let x = (y * 7) % 17; x < VW; x += 29) T.H(x, y, 9, c('#9a7048'));
    T.R(0, deskY + surf, VW, 3, c('#8a6040')); T.H(0, deskY + surf + 3, VW, c('#3e2e22'));
    // 台
    const cx = F.x + Math.round(F.w / 2), sw = Math.max(4, Math.round(F.w * 0.05));
    T.R(cx - sw / 2, F.y + F.h + b, sw, standH + 1, c('#3a3c44')); T.V(cx - sw / 2, F.y + F.h + b, standH, c('#50525c'));
    T.R(cx - F.w * 0.14, deskY, F.w * 0.28, 2, c('#3a3c44')); T.H(cx - F.w * 0.14, deskY, F.w * 0.28, c('#55585f'));
    // 画面の枠とタイトルの帯
    T.R(F.x - b, F.y - b - tb, F.w + b * 2, F.h + b * 2 + tb, c('#1c1e24'));
    T.R(F.x, F.y - tb, F.w, tb, c('#d4d8e0')); T.H(F.x, F.y - 1, F.w, c('#a8aeb8'));
    [['#d98a7a', 3], ['#e0c27a', 7], ['#8cc08a', 11]].forEach(([col, dx]) => { T.R(F.x + dx - 1, F.y - tb + 2, 2, 2, c(col)); });
    for (let k = 0; k < 4; k++) T.H(F.x + Math.round(F.w / 2) - 9 + k * 5, F.y - tb + 3, 3, c('#9aa0aa'));
    T.g.clearRect(F.x, F.y, F.w, F.h);
    T.P(F.x + F.w + b - 2, F.y + F.h + b - 2, env.night > 0.3 ? '#7ae07a' : c('#5aa05a'));
    // キーボード・マウス・マグ（画面の大きさに合わせる）
    const kw = Math.round(F.w * 0.62), kh = clamp(Math.round(kw * 0.16), 7, 14), kx = Math.round(cx - kw / 2 - F.w * 0.04), ky = deskY + clamp(Math.round((surf - kh) * 0.55), 3, 20);
    T.R(kx, ky, kw, kh, c('#c4c8ce')); T.R(kx + 1, ky + 1, kw - 2, kh - 2, c('#dfe1e5')); T.H(kx, ky + kh, kw, c('#7a5c3e'));
    const rows = Math.max(3, Math.floor((kh - 2) / 2));
    for (let r = 0; r < rows; r++) for (let x = kx + 2 + (r % 2); x < kx + kw - 3; x += 3) T.R(x, ky + 1 + r * 2, 2, 1, c('#aeb2ba'));
    if (rows >= 4) T.R(kx + Math.round(kw * 0.3), ky + 1 + (rows - 1) * 2, Math.round(kw * 0.36), 1, c('#aeb2ba'));      // スペースキー
    const mw = Math.max(4, Math.round(kh * 0.6)), mh = Math.max(6, Math.round(kh * 0.95)), mx = kx + kw + Math.max(4, Math.round(F.w * 0.05)), my = ky + Math.round((kh - mh) / 2);
    T.ellipse(mx + mw / 2, my + mh / 2, mw / 2, mh / 2, c('#dfe1e5')); T.H(mx + 1, my + Math.round(mh * 0.4), mw - 1, c('#aeb2ba')); T.V(mx + Math.round(mw / 2), my + 1, Math.round(mh * 0.4), c('#aeb2ba'));
    T.H(mx, my + mh + 1, mw + 1, c('#7a5c3e'));
    const m = mug(T, c, Math.max(3, kx - 10), ky + kh);
    if (!port) {       // 横長：左の壁にコルクボード、右の壁に本の棚と机のライト。机の左はしに植物
      const left = F.x - b - 3, rs = F.x + F.w + b + 3, top = F.y - b - tb;
      if (left >= 14) {
        const cw = Math.min(left - 4, 28), ch = clamp(Math.round(cw * 0.85), 12, Math.round(F.h * 0.6));
        corkboard(T, c, Math.round((left - cw) * 0.5) + 1, Math.round(top + F.h * 0.16), cw, ch);
        if (kx - 12 > 8) plant(T, c, Math.max(5, Math.round((kx - 12) * 0.35)), deskY + Math.min(6, surf - 2));
      }
      const rw = VW - rs;
      if (rw >= 12) {
        const sx0 = rs + Math.round(rw * 0.12), sx1 = VW - Math.max(2, Math.round(rw * 0.15)), sy = Math.round(top + F.h * 0.3);
        T.R(sx0 - 1, sy, sx1 - sx0 + 2, 2, c('#8a6040')); T.H(sx0 - 1, sy, sx1 - sx0 + 2, c('#a87a50')); T.P(sx0 + 1, sy + 2, c('#6a4a30')); T.P(sx1 - 2, sy + 2, c('#6a4a30'));
        books(T, c, sx0 + 1, sx1 - 1, sy, VW + 11, 9);
        if (rw >= 22) clock(T, c, sx0 + Math.round((sx1 - sx0) * 0.6), Math.max(8, sy - 20));
        deskLamp(T, c, rs + Math.round(rw * 0.6), deskY + Math.min(5, surf - 3), env, -1);
      }
    }
    return { mug: m };
  }

  /* ---------- 電車（ロングシートの向かいの窓） ---------- */
  function drawTrain(T, c, VW, VH, F, env, port) {
    const fw = 3, top = F.y - fw, bot = F.y + F.h + fw;
    // 壁：窓まわりはクリーム色、腰から下はうすい緑
    T.R(0, 0, VW, VH, c('#e6e0cc'));
    const waist = bot + 4;
    T.R(0, waist, VW, VH - waist, c('#c9d4c8')); T.H(0, waist, VW, c('#aeb8ac'));
    // 天井と、つり革のパイプ
    const ceil = Math.max(3, Math.round(top * 0.16));
    T.R(0, 0, VW, ceil, c('#f2efe4')); T.H(0, ceil, VW, c('#c8c2b0'));
    const pipeY = ceil + 2; T.H(0, pipeY, VW, c('#9aa2aa')); T.H(0, pipeY + 1, VW, c('#6e767e'));
    // 網棚（窓の上）。上の余白が狭い画面では、つり革だけにする
    const roomy = top - pipeY >= 22;
    const rackY = roomy ? Math.max(pipeY + 6, top - Math.max(6, Math.round(top * 0.28))) : top - 3;
    if (roomy) {
      T.H(0, rackY, VW, c('#8a929a')); T.H(0, rackY + 1, VW, c('#b8c0c8'));
      for (let x = 1; x < VW; x += 3) T.P(x, rackY + 2, c('#a0a8b0'));
      T.H(0, rackY + 3, VW, c('#8a929a'));
      for (let x = 6; x < VW; x += 26) { T.line(x, rackY + 3, x + 3, rackY + 7, c('#7a828a')); }
      // 網棚の上の荷物（かたよらせて2つだけ）
      T.R(Math.round(VW * 0.18), rackY - 4, 9, 4, c('#6a7a9a')); T.H(Math.round(VW * 0.18), rackY - 4, 9, c('#8090b0'));
      T.R(Math.round(VW * 0.66), rackY - 3, 6, 3, c('#b07a4a')); T.H(Math.round(VW * 0.66), rackY - 3, 6, c('#c8925e'));
    }
    // つり革（間をそろえすぎない）
    const strapLen = Math.max(6, Math.min(16, top - pipeY - 3));     // 網棚の手前に垂らす
    for (let i = 0, x = 7; x < VW - 4; i++, x += 15 + (i % 3)) {
      const sway = (i % 2) ? 1 : 0;
      T.V(x, pipeY + 2, strapLen - 4, c('#e8e4d8')); T.V(x + 1, pipeY + 2, strapLen - 4, c('#c8c2b0'));
      const ry = pipeY + strapLen - 2;
      T.R(x - 1 + sway, ry, 4, 4, c('#f0ece0')); T.R(x + sway, ry + 1, 2, 2, c('#e6e0cc'));
      T.P(x - 1 + sway, ry, c('#d8d2c2'));
    }
    // 窓枠（アルミ）と窓台
    T.R(F.x - fw, top, F.w + fw * 2, F.h + fw * 2, c('#b8bec4'));
    T.H(F.x - fw, top, F.w + fw * 2, c('#d8dde2')); T.H(F.x - fw, bot - 1, F.w + fw * 2, c('#8a9096'));
    T.R(F.x - fw - 2, bot, F.w + fw * 2 + 4, 3, c('#a8aeb4')); T.H(F.x - fw - 2, bot, F.w + fw * 2 + 4, c('#d0d6dc'));
    T.g.clearRect(F.x, F.y, F.w, F.h);
    // 窓の仕切り（真ん中からずらす）と、左の窓の上だけ開く窓の桟
    const mx = F.x + Math.round(F.w * 0.6);
    T.R(mx - 2, F.y, 4, F.h, c('#b8bec4')); T.V(mx - 2, F.y, F.h, c('#d8dde2')); T.V(mx + 1, F.y, F.h, c('#8a9096'));
    const sy = F.y + Math.round(F.h * 0.3);
    T.R(F.x, sy - 1, mx - 2 - F.x, 2, c('#b8bec4')); T.H(F.x, sy - 1, mx - 2 - F.x, c('#d8dde2'));
    // 角を丸く
    const rad = 3;
    for (const [x0, x1] of [[F.x, mx - 2], [mx + 2, F.x + F.w]]) for (let y = 0; y < rad; y++) for (let x = 0; x < rad; x++) if ((rad - x - 0.5) ** 2 + (rad - y - 0.5) ** 2 > rad * rad) {
      const col = c('#b8bec4'); T.P(x0 + x, F.y + y, col); T.P(x1 - 1 - x, F.y + y, col); T.P(x0 + x, F.y + F.h - 1 - y, col); T.P(x1 - 1 - x, F.y + F.h - 1 - y, col);
    }
    // ガラスの映り込み（夜は車内が映って少し白っぽく）
    for (let k = 0; k < F.h * 0.5; k++) { const x = F.x + 5 + Math.round(k * 0.7); if (x < mx - 4) { T.P(x, F.y + 2 + k, 'rgba(255,255,255,0.07)'); T.P(x + 2, F.y + 2 + k, 'rgba(255,255,255,0.05)'); } }
    if (env.night > 0.3) T.R(F.x, F.y, F.w, F.h, `rgba(220,230,240,${(0.07 * env.night).toFixed(3)})`);
    if (env.weather === 'rain') {      // 走っている電車の窓：雨つぶは風で斜め後ろ（左下）へ流れる
      const r = E.RNG(F.w * 5 + F.h);
      for (let i = 0; i < F.w * F.h / 90; i++) {
        const x = F.x + 2 + (r() * (F.w - 4) | 0), y = F.y + 1 + (r() * (F.h - 6) | 0), n = 2 + (r() * 4 | 0);
        for (let k = 0; k < n; k++) T.P(x - Math.round(k * 1.6), y + k, `rgba(255,255,255,${k ? 0.14 : 0.4})`);
      }
    }
    // ロングシート（背もたれと座面）
    const backTop = waist + Math.max(3, Math.round((VH - waist) * (port ? 0.12 : 0.1))), seatY = Math.round(backTop + (VH - backTop) * (port ? 0.42 : 0.5)), seatH = Math.max(5, Math.round((VH - seatY) * (port ? 0.3 : 0.42)));
    T.R(0, backTop, VW, seatY - backTop, c('#3d6670')); T.H(0, backTop, VW, c('#55808a'));
    for (let y = backTop + 2; y < seatY - 1; y += 3) for (let x = (y % 2) * 2; x < VW; x += 4) T.P(x, y, c('#355a63'));
    for (let x = Math.round(VW * 0.13); x < VW; x += Math.round(VW * 0.29)) T.V(x, backTop + 1, seatY - backTop - 1, c('#2f5058'));     // 座席の区切りの縫い目
    T.R(0, seatY, VW, seatH, c('#4a7680')); T.H(0, seatY, VW, c('#6a98a2')); T.H(0, seatY + seatH - 1, VW, c('#2e4c54'));
    for (let y = seatY + 2; y < seatY + seatH - 1; y += 3) for (let x = (y % 2) * 2 + 1; x < VW; x += 4) T.P(x, y, c('#426c76'));
    // 座席の下と床
    const fy = seatY + seatH;
    T.R(0, fy, VW, VH - fy, c('#5a5e62')); T.R(0, fy, VW, Math.min(3, VH - fy), c('#3e4246'));
    for (let x = 4; x < VW; x += 9) T.V(x, fy + 1, Math.min(2, VH - fy - 1), c('#6e7276'));       // 暖房のすき間
    // 縦長は床が広いので、床の継ぎ目と、だれかの紙袋
    if (port && VH - fy > 20) {
      for (let y = fy + 8; y < VH; y += 9) T.H(0, y, VW, c('#64686c'));
      const bx = Math.round(VW * 0.24), by = fy + Math.round((VH - fy) * 0.45);
      T.R(bx, by - 9, 10, 9, c('#c8a878')); T.H(bx, by - 9, 10, c('#d8bc8c')); T.V(bx + 9, by - 9, 9, c('#a88a5c'));
      T.line(bx + 2, by - 9, bx + 3, by - 12, c('#8a6a40')); T.line(bx + 7, by - 9, bx + 6, by - 12, c('#8a6a40')); T.H(bx + 3, by - 12, 4, c('#8a6a40'));
      T.ellipse(bx + 5, by + 1, 6, 1, c('#000000', 0.18));
    }
    // 手すり（座席の端に1本だけ）
    const hx = Math.round(VW * (port ? 0.86 : 0.93));
    T.R(hx, rackY + 4, 2, fy - rackY - 4, c('#c8ced4')); T.V(hx, rackY + 4, fy - rackY - 4, c('#e8ecf0'));
    // 手すりに立てかけた傘
    const uy = fy - 1, ux = hx - 3;
    T.line(ux, uy, ux + 3, uy - 22, c('#2e4a6a')); T.line(ux - 1, uy, ux + 2, uy - 20, c('#3a5a80')); T.line(ux + 1, uy - 2, ux + 3, uy - 19, c('#24405e'));
    T.R(ux + 2, uy - 25, 2, 3, c('#6a4a30')); T.P(ux + 1, uy - 25, c('#6a4a30'));
    // 窓の下の置き物：だれかの忘れた缶（左の窓の下）
    const can = F.x + Math.round(F.w * 0.22);
    T.R(can, bot - 4, 3, 4, c('#c84a3a')); T.H(can, bot - 4, 3, c('#e0e4e8')); T.P(can + 1, bot - 2, c('#f0e0c0'));
    return { train: F, mx, sy };
  }

  /* 電車の窓の中で動くもの：通り過ぎる電柱、トンネル。景色の上・窓枠の下に描く */
  function trainFx(T, F, t, env, tun) {
    const g = T.g; g.save(); g.beginPath(); g.rect(F.x, F.y, F.w, F.h); g.clip();
    if (!tun) {
      // 電柱：8〜13秒にひとつ、右から左へ0.7秒ほどで通る
      const per = 10.5, k = Math.floor(t / per), ph = t - k * per, start = (k * 37 % 5) * 0.6;
      const p = (ph - start) / 0.7;
      if (p > 0 && p < 1) {
        const x = F.x + F.w + 6 - p * (F.w + 16), col = env.night > 0.5 ? 'rgba(18,20,26,0.92)' : 'rgba(58,54,50,0.95)';
        T.R(x, F.y, 4, F.h, col); T.R(x - 6, F.y + Math.round(F.h * 0.12), 16, 2, col); T.R(x - 4, F.y + Math.round(F.h * 0.2), 12, 1, col);
        T.R(x - 4, F.y + Math.round(F.h * 0.12) - 2, 1, 2, col); T.R(x + 7, F.y + Math.round(F.h * 0.12) - 2, 1, 2, col);
      }
    } else {
      // トンネル：入口は右から暗くなり、中では灯りが流れ、出口は右から明るくなる
      const dark = '#0c0e14';
      if (tun.phase === 'in') T.R(F.x + F.w * (1 - tun.p), F.y, F.w * tun.p + 1, F.h, dark);
      else if (tun.phase === 'out') T.R(F.x, F.y, F.w * (1 - tun.p) + 1, F.h, dark);
      else T.R(F.x, F.y, F.w, F.h, dark);
      if (tun.phase === 'mid') {
        const ly = F.y + Math.round(F.h * 0.22);
        for (let i = 0; i < 3; i++) {
          const q = ((tun.time * 1.6 + i / 3) % 1), x = F.x + F.w + 4 - q * (F.w + 12);
          T.R(x, ly, 5, 2, '#ffb860'); g.fillStyle = 'rgba(255,184,96,0.18)'; g.fillRect(Math.round(x) - 4, ly - 3, 13, 8);
        }
        T.R(F.x, F.y, F.w, F.h, 'rgba(200,215,230,0.06)');        // 車内の明かりがガラスに映る
      }
    }
    g.restore();
  }

  const cache = { key: '', cv: null, info: null };
  function draw(kind, VW, VH, F, env) {
    const key = [kind, VW, VH, F.x, F.y, F.w, F.h, Math.round(env.night * 20), Math.round(env.lights * 20), env.weather].join(',');
    if (cache.key === key) return cache;
    const cv = cache.cv && cache.cv.width === VW && cache.cv.height === VH ? cache.cv : document.createElement('canvas');
    cv.width = VW; cv.height = VH;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, VW, VH);
    const T = E.tools(g), port = VH > VW * 1.15;
    // 電車は夜も車内の明かりがついているので、部屋ほど暗くしない
    const c = lighting(kind === 'train' ? { night: env.night * 0.3, lights: 0, weather: env.weather } : env);
    const info = kind === 'window' ? drawWindow(T, c, VW, VH, F, env) : kind === 'tv' ? drawTV(T, c, VW, VH, F, env, port) : kind === 'train' ? drawTrain(T, c, VW, VH, F, env, port) : drawPC(T, c, VW, VH, F, env, port);
    Object.assign(cache, { key, cv, info });
    return cache;
  }
  /* 毎フレーム動くところ（マグの湯気） */
  function live(T, info, t) {
    if (!info || !info.mug) return;
    const [mx, my] = info.mug;
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.35 + i / 3) % 1, x = mx + Math.sin(p * 5 + i * 2) * 1.3, y = my - p * 9;
      T.P(x, y, `rgba(255,255,255,${(0.32 * (1 - p)).toFixed(2)})`);
    }
  }
  window.TookuFrame = { layout, draw, live, trainFx, KINDS: ['none', 'window', 'tv', 'pc', 'train'] };
})();
