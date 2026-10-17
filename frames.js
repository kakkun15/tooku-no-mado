/* とおくの窓：眺め方（窓越し・テレビ越し・パソコン越し）。
   景色は layout() が返す四角の中に描かれ、そのまわりの部屋をここで描く。
   部屋の明るさは景色の時間帯に合わせる（夜は暗く、明かりで少し暖かい色に） */
(function () {
  'use strict';
  const E = window.TookuEngine, { clamp, bay } = E;

  /* 景色を描く四角（ビューのドット単位） */
  /* 景色を描く四角（ビューのドット単位）。テレビは 4:3（ブラウン管）、パソコンは 16:9 に固定して、画面の大きさに合わせて置く */
  const fitAspect = (maxW, maxH, ar) => { let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; } return [Math.round(w), Math.round(h)]; };
  function layout(kind, VW, VH) {
    const port = VH > VW * 1.15, R = (x, y, w, h) => ({ x: Math.round(x), y: Math.round(y), w: Math.max(40, Math.round(w)), h: Math.max(30, Math.round(h)) });
    if (kind === 'window') {
      const sx = Math.max(9, VW * 0.08), top = Math.max(10, VH * 0.075), bot = port ? VH * 0.24 : Math.max(22, VH * 0.2);
      return R(sx, top, VW - sx * 2, VH - top - bot);
    }
    if (kind === 'tv') {
      if (port) {        // 縦長：幅いっぱいのテレビを台に置く。下に床
        const [w, h] = fitAspect(VW * 0.8, VH * 0.4, 4 / 3), bottom = Math.round(VH * 0.64) - 8 - 14 - 4;
        return R((VW - w) / 2, bottom - h, w, h);
      }
      const panel = Math.max(24, Math.round(VW * 0.13)), [w, h] = fitAspect(VW * 0.86 - panel, VH * 0.6, 4 / 3);
      return R((VW - w - panel) / 2, Math.max(15, VH * 0.13), w, h);
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

  /* ---------- テレビ ---------- */
  function drawTV(T, c, VW, VH, F, env, port) {
    const b = 4, inner = 2, panelH = port ? 14 : 0, panelW = port ? 0 : Math.max(22, Math.round(VW * 0.13)) - b;
    const cab = { x: F.x - b, y: F.y - b, w: F.w + b * 2 + panelW, h: F.h + b * 2 + panelH };
    const legH = 8, floorY = Math.min(VH - 3, cab.y + cab.h + legH);
    wall(T, c, VW, VH, '#d6c7a4', '#cdbd98', floorY);
    // 夜はテレビの光が壁と床に映る
    if (env.night > 0.3) { const g = T.g, gr = g.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, 4, F.x + F.w / 2, F.y + F.h / 2, Math.max(F.w, F.h) * 1.1); gr.addColorStop(0, `rgba(150,180,255,${0.22 * env.night})`); gr.addColorStop(1, 'rgba(150,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, VW, floorY); }
    floorBoards(T, c, VW, floorY, VH, '#8c6a48', '#76583a');
    if (env.night > 0.3) { const g = T.g, gr = g.createRadialGradient(F.x + F.w / 2, floorY + 4, 2, F.x + F.w / 2, floorY + 4, F.w * 0.7); gr.addColorStop(0, `rgba(150,180,255,${0.16 * env.night})`); gr.addColorStop(1, 'rgba(150,180,255,0)'); g.fillStyle = gr; g.fillRect(0, floorY, VW, VH - floorY); }
    // 縦長の画面では床が広いので、敷物と、壁に時計
    if (port) {
      const ry = floorY + Math.round((VH - floorY) * 0.5), rw = Math.round(VW * 0.36), rh = Math.max(4, Math.round((VH - floorY) * 0.22));
      T.ellipse(VW / 2, ry, rw, rh, c('#9a5a4a')); T.ellipse(VW / 2, ry, rw - 3, Math.max(2, rh - 2), c('#b46e58'));
      for (let x = -rw + 6; x < rw - 6; x += 6) T.P(VW / 2 + x, ry, c('#d49a72'));
      const cx = Math.round(VW * 0.78), cy = Math.round(Math.max(10, (F.y - 18) * 0.55));
      if (cy > 8 && cy + 8 < cab.y - 16) { T.circ(cx, cy, 6, c('#6a4a30')); T.circ(cx, cy, 5, c('#f2ead8')); T.line(cx, cy, cx, cy - 3, c('#2a2a2a')); T.line(cx, cy, cx + 2, cy + 1, c('#2a2a2a')); }
    }
    // 脚
    const lx0 = cab.x + 6, lx1 = cab.x + cab.w - 7, ly = cab.y + cab.h;
    for (const [x, d] of [[lx0, -1], [lx1, 1]]) { T.line(x, ly, x + d * 2, floorY + 1, c('#3a2a1e')); T.line(x - d, ly, x + d, floorY + 1, c('#3a2a1e')); }
    T.R(cab.x + 4, floorY + 1, cab.w - 8, 1, c('#5e4630', 0.6));
    // アンテナ
    const ax = cab.x + Math.round(cab.w * (port ? 0.5 : 0.42)), ay = cab.y, al = Math.max(4, Math.min(15, ay - 2));
    T.R(ax - 3, ay - 2, 7, 2, c('#3a3a40'));
    const tip1 = [ax - Math.round(al * 0.9), ay - al], tip2 = [ax + Math.round(al * 0.75), ay - al - 1];
    T.line(ax - 1, ay - 2, tip1[0], tip1[1], c('#9aa0a8')); T.line(ax + 1, ay - 2, tip2[0], tip2[1], c('#9aa0a8'));
    T.P(tip1[0], tip1[1], c('#c8ccd2')); T.P(tip2[0], tip2[1], c('#c8ccd2'));
    // 木の箱
    T.R(cab.x, cab.y, cab.w, cab.h, c('#6e4a2e'));
    for (let y = cab.y + 2; y < cab.y + cab.h - 1; y += 3) for (let x = cab.x + ((y * 5) % 9); x < cab.x + cab.w - 2; x += 11) T.H(x, y, Math.min(5, cab.x + cab.w - 2 - x), c('#62412a'));
    T.H(cab.x, cab.y, cab.w, c('#8a6040')); T.V(cab.x, cab.y, cab.h, c('#7e5636')); T.H(cab.x, cab.y + cab.h - 1, cab.w, c('#4e3420')); T.V(cab.x + cab.w - 1, cab.y, cab.h, c('#4e3420'));
    // 画面のまわりの黒い縁
    T.R(F.x - inner, F.y - inner, F.w + inner * 2, F.h + inner * 2, c('#24242a'));
    T.g.clearRect(F.x, F.y, F.w, F.h);
    // 丸い角
    const rad = 4, dark = c('#24242a');
    for (let y = 0; y < rad; y++) for (let x = 0; x < rad; x++) if ((rad - x - 0.5) ** 2 + (rad - y - 0.5) ** 2 > rad * rad) {
      T.P(F.x + x, F.y + y, dark); T.P(F.x + F.w - 1 - x, F.y + y, dark); T.P(F.x + x, F.y + F.h - 1 - y, dark); T.P(F.x + F.w - 1 - x, F.y + F.h - 1 - y, dark);
    }
    // 走査線と、ガラスの丸みの映り込み・すみの暗さ
    for (let y = F.y + 1; y < F.y + F.h; y += 2) T.R(F.x, y, F.w, 1, 'rgba(0,0,0,0.07)');
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const u = (x / F.w - 0.5) * 2, v = (y / F.h - 0.5) * 2, d = u * u * u * u + v * v * v * v; if (d > 0.55 && bay(x, y) < (d - 0.55) * 0.9) T.P(F.x + x, F.y + y, 'rgba(0,0,0,0.35)'); }
    for (let k = 0; k < Math.min(F.w, F.h) * 0.3; k++) T.P(F.x + 5 + k, F.y + 3 + Math.round(k * k * 0.02), 'rgba(255,255,255,0.12)');
    // つまみとスピーカー
    const knob = (x, y) => { T.circ(x, y, 3, c('#2e2e34')); T.circ(x, y, 2, c('#c8c0b0')); T.P(x, y - 2, c('#2e2e34')); T.P(x - 1, y - 1, c('#e4ddcc')); };
    if (port) {
      const py = F.y + F.h + inner + 3, ph = cab.y + cab.h - py - 3;
      T.R(cab.x + 6, py, Math.round(cab.w * 0.55), ph, c('#4a3220'));
      for (let y = py + 1; y < py + ph; y += 2) T.H(cab.x + 7, y, Math.round(cab.w * 0.55) - 2, c('#2e2016'));
      knob(cab.x + cab.w - 18, py + ph / 2); knob(cab.x + cab.w - 9, py + ph / 2);
    } else {
      const px = F.x + F.w + inner + 3, pw = cab.x + cab.w - px - 3;
      knob(px + pw / 2, F.y + 6); knob(px + pw / 2, F.y + 15);
      const gy = F.y + 23, gh = Math.max(6, F.y + F.h - gy - 4);
      T.R(px, gy, pw, gh, c('#4a3220')); for (let y = gy + 1; y < gy + gh; y += 2) T.H(px + 1, y, pw - 2, c('#2e2016'));
    }
    const led = port ? [cab.x + cab.w - 5, cab.y + cab.h - 4] : [cab.x + cab.w - 5, F.y + F.h - 1];
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
        const books = ['#7a8fb0', '#c8846a', '#e0c070', '#6f9a7a', '#b06a7a', '#8a7ab0', '#d8d0c0'], r = E.RNG(VW * 3 + 7);
        let x = sx0 + 3; for (let i = 0; x < sx1 - 10 && i < 9; i++) { const h = 7 + (r() * 5 | 0), w = 2 + (r() * 2 | 0), col = books[i % books.length]; T.R(x, sy - h, w, h, c(col)); T.H(x, sy - h + 2, w, c('#f0e8d8', 0.5)); x += w + (r() < 0.2 ? 1 : 0); }
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
    if (!port) plant(T, c, Math.round(F.x + F.w + (VW - F.x - F.w) * 0.5), deskY + Math.min(6, surf - 2));
    return { mug: m };
  }

  const cache = { key: '', cv: null, info: null };
  function draw(kind, VW, VH, F, env) {
    const key = [kind, VW, VH, F.x, F.y, F.w, F.h, Math.round(env.night * 20), Math.round(env.lights * 20), env.weather].join(',');
    if (cache.key === key) return cache;
    const cv = cache.cv && cache.cv.width === VW && cache.cv.height === VH ? cache.cv : document.createElement('canvas');
    cv.width = VW; cv.height = VH;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, VW, VH);
    const T = E.tools(g), c = lighting(env), port = VH > VW * 1.15;
    const info = kind === 'window' ? drawWindow(T, c, VW, VH, F, env) : kind === 'tv' ? drawTV(T, c, VW, VH, F, env, port) : drawPC(T, c, VW, VH, F, env, port);
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
  window.TookuFrame = { layout, draw, live, KINDS: ['none', 'window', 'tv', 'pc'] };
})();
