/* とおくの窓：音の合成。音符の並び（music.js）から、その場で音を作る。録音は使わない。
   この関数は文字列にして Web Worker の中でも動かすので、外の変数を参照しないこと。 */
function TookuSynth() {
  'use strict';
  const TICK = 0.008, TAB = 2048;
  const hz = p => 440 * Math.pow(2, (p - 69) / 12);

  /* ---------- 楽譜データを読む：開始の差・長さ・音高・(役割|強さ) ---------- */
  function decode(b64) {
    const bin = atob(b64), out = []; let i = 0, t = 0;
    const vi = () => { let v = 0, s = 0, b; do { b = bin.charCodeAt(i++); v |= (b & 127) << s; s += 7; } while (b & 128); return v; };
    while (i < bin.length) {
      t += vi(); const d = vi(), p = bin.charCodeAt(i++), f = bin.charCodeAt(i++);
      out.push({ t: t * TICK, d: d * TICK, p, r: f & 3, v: ((f >> 2) << 1) / 127 });
    }
    return out;
  }

  /* ---------- やわらかアレンジ：怖めの曲を、音はそのままに角を丸くする ---------- */
  // 強弱の差を小さくし、地鳴りのような低い音を1オクターブ上げ、低音のオクターブ重ねを1つにし、大きな太鼓とシンバルをやめる
  function calmNotes(src) {
    const out = [];
    for (const n of src) {
      if (n.r === 3 && (n.p === 2 || n.p === 5 || n.p === 6)) continue;
      let p = n.p; if (n.r !== 3) while (p < 36) p += 12;
      out.push({ t: n.t, d: n.d, p, r: n.r, v: 0.42 + 0.32 * n.v });
    }
    const groups = new Map();
    for (const n of out) { if (n.r === 3) continue; const k = Math.round(n.t * 50); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); }
    const drop = new Set();
    for (const g of groups.values()) for (const a of g) if (a.p < 52 && g.some(b => b !== a && b.p === a.p + 12 && !drop.has(b))) drop.add(a);
    return out.filter(n => !drop.has(n));
  }

  /* ---------- 波形表 ---------- */
  const tabCache = {};
  function table(h, key) {
    if (tabCache[key]) return tabCache[key];
    const t = new Float32Array(TAB + 1); let pk = 0;
    for (let i = 0; i < TAB; i++) { let v = 0; for (let k = 0; k < h.length; k++) if (h[k]) v += h[k] * Math.sin(2 * Math.PI * (k + 1) * i / TAB); t[i] = v; pk = Math.max(pk, Math.abs(v)); }
    for (let i = 0; i < TAB; i++) t[i] /= pk || 1;
    t[TAB] = t[0];
    return (tabCache[key] = t);
  }
  // 高い音ほど倍音を減らす（折り返しノイズを防ぐ）
  function bandTable(h, key, f, SR) {
    const n = Math.max(1, Math.min(h.length, Math.floor((SR * 0.45) / f)));
    return table(h.slice(0, n), key + n);
  }
  function pulseTable(duty, f, SR) {
    const n = Math.max(1, Math.min(40, Math.floor((SR * 0.45) / f))), key = 'pl' + duty + ':' + n;
    if (tabCache[key]) return tabCache[key];
    const h = []; for (let k = 1; k <= n; k++) h.push(Math.sin(Math.PI * k * duty) / k);
    // 位相をそろえるため cos 成分で作る
    const t = new Float32Array(TAB + 1); let pk = 0;
    for (let i = 0; i < TAB; i++) { let v = 0; for (let k = 1; k <= n; k++) v += h[k - 1] * Math.cos(2 * Math.PI * k * i / TAB); t[i] = v; pk = Math.max(pk, Math.abs(v)); }
    for (let i = 0; i < TAB; i++) t[i] /= pk || 1;
    t[TAB] = t[0];
    return (tabCache[key] = t);
  }
  function nesTriangle() {               // ファミコンの三角波は16段の階段
    if (tabCache.tri) return tabCache.tri;
    const t = new Float32Array(TAB + 1);
    for (let i = 0; i < TAB; i++) { const ph = i / TAB, v = ph < 0.5 ? ph * 2 : 2 - ph * 2; t[i] = (Math.floor(v * 15.99) / 7.5) - 1; }
    t[TAB] = t[0];
    return (tabCache.tri = t);
  }
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  /* ---------- 音色ごとの声 ---------- */
  // o: 出力, i0: 開始サンプル, f: 周波数, d: 長さ(秒), g: 音量, SR
  function oscVoice(o, i0, f, len, SR, tab, envFn, vib) {
    const n = Math.min(o.length - i0, len); if (n <= 0) return;
    const inc = f * TAB / SR; let ph = rnd() * TAB;
    const vw = 2 * Math.PI * (vib ? vib.rate : 0) / SR, vd = vib ? vib.depth : 0, vs = vib ? vib.start * SR : 0;
    for (let i = 0; i < n; i++) {
      const e = envFn(i); if (e === 0 && i > 64) { if (envFn.done && envFn.done(i)) break; }
      const k = ph | 0, fr = ph - k;
      o[i0 + i] += (tab[k] + (tab[k + 1] - tab[k]) * fr) * e;
      ph += inc * (vd && i > vs ? 1 + vd * Math.sin(vw * (i - vs)) * Math.min(1, (i - vs) / (SR * 0.4)) : 1);
      if (ph >= TAB) ph -= TAB;
    }
  }

  // やさしいピアノ：明るい倍音が先に消え、柔らかく残る
  const FELT_B = [1, .42, .22, .12, .07, .04, .025, .015], FELT_D = [1, .14, .04];
  function felt(o, i0, nt, SR, gain, bright) {
    const f = hz(nt.p), tb = bandTable(FELT_B, 'fb', f, SR), td = bandTable(FELT_D, 'fd', f, SR);
    const tau = Math.min(2.4, Math.max(0.35, 2.4 - (nt.p - 36) * 0.03)) * SR, bt = 0.11 * SR * (0.6 + 0.6 * nt.v);
    const on = Math.max(nt.d, 0.08) * SR, rel = 0.16 * SR, len = Math.min(on + rel * 4, tau * 5) | 0;
    const n = Math.min(o.length - i0, len); if (n <= 0) return;
    const inc = f * TAB / SR, inc2 = inc * 1.0011; let ph = rnd() * TAB, ph2 = rnd() * TAB;
    const kd = Math.exp(-1 / tau), kb = Math.exp(-1 / bt), kr = Math.exp(-1 / rel), aN = 0.005 * SR;
    let a = gain, b = bright;
    for (let i = 0; i < n; i++) {
      a *= i < on ? kd : kr; b *= kb;
      const env = i < aN ? i / aN : 1;
      const k = ph | 0, fr = ph - k, k2 = ph2 | 0, fr2 = ph2 - k2;
      const sb = tb[k] + (tb[k + 1] - tb[k]) * fr, sd = td[k] + (td[k + 1] - td[k]) * fr, s2 = td[k2] + (td[k2 + 1] - td[k2]) * fr2;
      o[i0 + i] += (sb * b + sd * (1 - b) * 0.85 + s2 * 0.25) * a * env;
      ph += inc; if (ph >= TAB) ph -= TAB; ph2 += inc2; if (ph2 >= TAB) ph2 -= TAB;
      if (a < 1e-5) break;
    }
  }
  // 弦のような柔らかい持続音（ふたつを少しずらして重ねる）
  const PAD = [1, .38, .2, .1, .05, .025];
  function pad(o, i0, nt, SR, gain, att, rel, vib) {
    const f = hz(nt.p), tab = bandTable(PAD, 'pd', f, SR);
    const aN = att * SR, dN = Math.max(nt.d, att) * SR, rN = rel * SR, len = (dN + rN) | 0;
    const env = i => (i < aN ? i / aN : i < dN ? 1 : Math.max(0, 1 - (i - dN) / rN)) * gain * 0.62;
    oscVoice(o, i0, f * 0.9985, len, SR, tab, env, vib ? { rate: 5.2, depth: 0.004, start: 0.3 } : null);
    oscVoice(o, i0, f * 1.0015, len, SR, tab, env, vib ? { rate: 4.7, depth: 0.003, start: 0.35 } : null);
  }
  // 笛のような旋律の声
  const FLUTE = [1, .2, .06, .02];
  function flute(o, i0, nt, SR, gain) {
    const f = hz(nt.p), tab = bandTable(FLUTE, 'fl', f, SR);
    const aN = 0.045 * SR, dN = Math.max(nt.d, 0.06) * SR, rN = 0.14 * SR, len = (dN + rN) | 0;
    const env = i => (i < aN ? i / aN : i < dN ? 1 - 0.12 * Math.min(1, (i - aN) / (SR * 1.5)) : Math.max(0, 1 - (i - dN) / rN) * 0.88) * gain;
    oscVoice(o, i0, f, len, SR, tab, env, { rate: 5, depth: 0.0045, start: 0.28 });
    const nb = Math.min(o.length - i0, (0.05 * SR) | 0); let lp = 0;   // 息の音
    for (let i = 0; i < nb; i++) { lp += ((rnd() * 2 - 1) - lp) * 0.3; o[i0 + i] += lp * gain * 0.05 * (1 - i / nb); }
  }
  // やわらかいオルガン
  const ORG = [1, .02, .3, 0, .08];
  function organ(o, i0, nt, SR, gain) {
    const f = hz(nt.p), tab = bandTable(ORG, 'og', f, SR);
    const aN = 0.04 * SR, dN = Math.max(nt.d, 0.05) * SR, rN = 0.18 * SR, len = (dN + rN) | 0;
    const env = i => (i < aN ? i / aN : i < dN ? 1 : Math.max(0, 1 - (i - dN) / rN)) * gain * 0.75;
    oscVoice(o, i0, f, len, SR, tab, env, { rate: 5.5, depth: 0.0015, start: 0.4 });
  }
  // オルゴール：細い金属の歯を弾く音。長さは関係なく鳴り切る
  function musicbox(o, i0, nt, SR, gain) {
    let p = nt.p; while (p < 60) p += 12; while (p > 98) p -= 12;
    const f = hz(p) * (1 + (rnd() - 0.5) * 0.004);
    const tau = Math.min(2.6, Math.max(0.55, 2.6 - (p - 60) * 0.045)) * SR;
    const n = Math.min(o.length - i0, (tau * 3.4) | 0); if (n <= 0) return;
    const ny = SR * 0.45, R = [1, 2, 4.07, 6.2], A = [1, 0.22, 0.3, 0.16], T = [tau, tau * 0.35, 0.05 * SR, 0.018 * SR];
    // 正弦波を回転で作る（Math.sin を毎回呼ばない）
    const parts = [];
    for (let j = 0; j < 4; j++) {
      if (f * R[j] >= ny) continue;
      const w = 2 * Math.PI * f * R[j] / SR, ph = rnd() * 6.28;
      parts.push({ c: Math.cos(w), s: Math.sin(w), x: Math.cos(ph), y: Math.sin(ph), a: gain * A[j], k: Math.exp(-1 / T[j]) });
    }
    for (const q of parts) {
      let x = q.x, y = q.y, a = q.a; const c = q.c, s = q.s, kk = q.k;
      for (let i = 0; i < n; i++) {
        const nx = x * c - y * s; y = x * s + y * c; x = nx;
        o[i0 + i] += y * a * (i < 24 ? i / 24 : 1);
        a *= kk; if (a < 1e-5) break;
      }
    }
  }
  // 弦をはじく音（Karplus-Strong）。ギターと箏
  function pluck(o, i0, nt, SR, gain, bright, bend) {
    const f = hz(nt.p); let D = SR / f - 0.5; if (D < 2) D = 2;
    const L = Math.ceil(D) + 3 + (bend ? Math.ceil(D * 0.05) : 0), buf = new Float32Array(L);
    // 励起：ノイズを強さに応じてなまらせる
    let lp = 0; const cut = 0.25 + 0.6 * bright * (0.5 + 0.5 * nt.v);
    for (let i = 0; i < L; i++) { lp += ((rnd() * 2 - 1) - lp) * cut; buf[i] = lp; }
    let m = 0; for (let i = 0; i < L; i++) m += buf[i]; m /= L; for (let i = 0; i < L; i++) buf[i] -= m;
    const tau = Math.min(3.2, Math.max(0.5, 3.4 - (nt.p - 40) * 0.05)), on = Math.max(nt.d, 0.1) * SR;
    const per = Math.exp(-(1 / f) / tau), perOff = Math.exp(-(1 / f) / 0.09);
    const n = Math.min(o.length - i0, (on + 0.4 * SR) | 0, (tau * 4 * SR) | 0); if (n <= 0) return;
    const blend = bright > 0.8 ? 0.62 : 0.5;
    let w = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      let d = D; if (bend) d = D / (1 + 0.025 * Math.exp(-i / (0.07 * SR)));
      let r = w - d; while (r < 0) r += L;
      const k = r | 0, fr = r - k, y = buf[k] + (buf[(k + 1) % L] - buf[k]) * fr;
      const fb = (y * blend + prev * (1 - blend)) * (i < on ? per : perOff);
      prev = y; buf[w] = fb; w = (w + 1) % L;
      o[i0 + i] += y * gain * (i < 30 ? i / 30 : 1);
    }
  }
  // ファミコン風：矩形波
  function chipPulse(o, i0, nt, SR, gain, duty, vib, sus) {
    const f = hz(nt.p), tab = pulseTable(duty, f, SR);
    const gl = Math.max(0.03, nt.d * 0.88) * SR, len = (gl + 0.02 * SR) | 0;
    const env = i => {
      let e = i < gl ? 0.55 + 0.45 * Math.exp(-i / (0.1 * SR)) : Math.max(0, 1 - (i - gl) / (0.02 * SR)) * 0.55;
      if (!sus && i > 0.3 * SR) e *= Math.exp(-(i - 0.3 * SR) / (1.6 * SR));
      return Math.round(e * 15) / 15 * gain;       // 16段の音量
    };
    oscVoice(o, i0, f, len, SR, tab, env, vib && nt.d > 0.3 ? { rate: 6, depth: 0.006, start: 0.22 } : null);
  }
  function chipTri(o, i0, nt, SR, gain) {
    let p = nt.p; while (p > 72) p -= 12;
    const f = hz(p), gl = Math.max(0.03, nt.d * 0.95) * SR, len = (gl + 0.01 * SR) | 0;
    oscVoice(o, i0, f, len, SR, nesTriangle(), i => (i < gl ? gain : Math.max(0, 1 - (i - gl) / (0.01 * SR)) * gain), null);
  }
  let lfsr = 1;
  function chipNoise(o, i0, len, SR, gain, period, decay, short) {
    const n = Math.min(o.length - i0, (len * SR) | 0); let c = 0, v = 1;
    for (let i = 0; i < n; i++) {
      if (++c >= period) { c = 0; const b = (lfsr ^ (lfsr >> (short ? 6 : 1))) & 1; lfsr = (lfsr >> 1) | (b << 14); v = (lfsr & 1) ? 1 : -1; }
      const e = Math.round(Math.exp(-i / (decay * SR)) * 15) / 15;
      o[i0 + i] += v * e * gain;
    }
  }
  function chipKick(o, i0, SR, gain, f0, f1, dur) {
    const n = Math.min(o.length - i0, (dur * SR) | 0), tab = nesTriangle(); let ph = 0;
    for (let i = 0; i < n; i++) { const f = f0 * Math.pow(f1 / f0, i / n); ph += f * TAB / SR; if (ph >= TAB) ph -= TAB; o[i0 + i] += tab[ph | 0] * gain * (1 - i / n); }
  }
  function chipDrum(o, i0, nt, SR, gain) {
    switch (nt.p) {
      case 1: chipKick(o, i0, SR, gain * 1.6, 160, 45, 0.12); break;
      case 2: chipNoise(o, i0, 0.14, SR, gain * 0.9, 3, 0.05, false); break;
      case 3: chipNoise(o, i0, 0.05, SR, gain * 0.45, 1, 0.012, false); break;
      case 4: chipNoise(o, i0, 0.04, SR, gain * 0.3, 1, 0.01, false); break;
      case 5: chipKick(o, i0, SR, gain * 2, 110, 32, 0.4); chipNoise(o, i0, 0.3, SR, gain * 0.5, 30, 0.08, false); break;
      case 6: chipNoise(o, i0, 0.7, SR, gain * 0.7, 2, 0.18, false); chipKick(o, i0, SR, gain * 1.4, 120, 40, 0.25); break;
    }
  }

  /* ---------- 残響（Freeverb を小さくしたもの） ---------- */
  function reverb(o, SR, wet, size) {
    if (wet <= 0) return;
    const sc = SR / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491].map(x => (x * sc * size) | 0), aps = [556, 441, 341].map(x => (x * sc) | 0);
    const fb = 0.8, damp = 0.32, n = o.length, wetBuf = new Float32Array(n);
    for (const L of combs) {
      const b = new Float32Array(L); let idx = 0, f = 0;
      for (let i = 0; i < n; i++) { const y = b[idx]; f = y * (1 - damp) + f * damp; b[idx] = o[i] * 0.015 + f * fb; wetBuf[i] += y; if (++idx >= L) idx = 0; }
    }
    for (const L of aps) {
      const b = new Float32Array(L); let idx = 0;
      for (let i = 0; i < n; i++) { const bo = b[idx], x = wetBuf[i]; wetBuf[i] = -x + bo; b[idx] = x + bo * 0.5; if (++idx >= L) idx = 0; }
    }
    for (let i = 0; i < n; i++) o[i] = o[i] * (1 - wet * 0.35) + wetBuf[i] * wet;
  }
  function lowpass(o, SR, fc) {
    const a = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0;
    for (let i = 0; i < o.length; i++) { y += (o[i] - y) * a; o[i] = y; }
  }

  /* ---------- 1曲を描き出す ---------- */
  const ROLE_GAIN = [0.62, 1, 0.82, 0.8];
  async function render(piece, opt, onYield) {
    const notes = opt.calm ? calmNotes(decode(piece.n)) : decode(piece.n), fam = opt.family, slow = (opt.slow ? 1 / 0.88 : 1) * (opt.calm ? 1 / 0.93 : 1);
    const end = notes.reduce((m, n) => Math.max(m, n.t + n.d), 0) * slow;
    const SR = end > 420 ? 16000 : 22050, tail = fam === 'box' ? 3.5 : 3;
    const total = Math.ceil((end + tail + 0.3) * SR), o = new Float32Array(total);
    seed = 0x2545 + piece.id.length * 977 + (opt.seed || 0);
    const inst = piece.i, chip = piece.chip || {}, isChipSong = inst === 'chip';
    // 同時に鳴る音が多い曲は伴奏を少し下げる
    let dense = 0; for (const n of notes) if (n.r === 0) dense++;
    const accDuck = dense / Math.max(1, notes.length) > 0.55 ? 0.8 : 1;
    let k = 0;
    for (const n0 of notes) {
      const nt = { t: n0.t * slow, d: n0.d * slow, p: n0.p, r: n0.r, v: n0.v };
      const i0 = Math.floor((nt.t + 0.3) * SR);
      const vg = 0.42 + 0.58 * Math.min(1, nt.v * 1.15), rg = ROLE_GAIN[nt.r] * (nt.r === 0 ? accDuck : 1);
      if (nt.r === 3) {                                     // 打楽器（ゆきころバトルの曲）
        if (fam === 'chip') chipDrum(o, i0, nt, SR, 0.08);
        else if (fam === 'soft' && (nt.p === 3 || nt.p === 4)) chipNoise(o, i0, 0.03, SR, 0.012, 1, 0.008, false);
      } else if (fam === 'chip') {
        if (nt.r === 2) chipTri(o, i0, nt, SR, 0.16 * vg);
        else if (nt.r === 1) chipPulse(o, i0, nt, SR, 0.1 * vg, chip.d1 || 0.25, true, isChipSong);
        else chipPulse(o, i0, nt, SR, 0.055 * vg * accDuck, chip.d2 || 0.125, false, isChipSong);
      } else if (fam === 'box') {
        musicbox(o, i0, nt, SR, (nt.r === 1 ? 0.17 : nt.r === 2 ? 0.1 : 0.085 * accDuck) * vg);
      } else {                                               // やさしい
        const g = 0.2 * vg * rg;
        if (inst === 'guitar') pluck(o, i0, nt, SR, g * 1.15, 0.55, false);
        else if (inst === 'koto') pluck(o, i0, nt, SR, g * 1.2, 0.95, true);
        else if (inst === 'musicbox') musicbox(o, i0, nt, SR, g * 0.85);
        else if (inst === 'strings') { if (nt.r === 1) pad(o, i0, nt, SR, g * 1.1, 0.07, 0.3, true); else pad(o, i0, nt, SR, g * 0.8, 0.14, 0.4, false); }
        else if (inst === 'organ') { if (nt.r === 1) flute(o, i0, nt, SR, g * 0.95); else organ(o, i0, nt, SR, g * 0.75); }
        else if (isChipSong) { if (nt.r === 1) flute(o, i0, nt, SR, g * 0.9); else if (nt.r === 2) felt(o, i0, nt, SR, g * 0.9, 0.3); else felt(o, i0, nt, SR, g * 0.55, 0.4); }
        else felt(o, i0, nt, SR, g * (nt.r === 1 ? 1.05 : 0.9), nt.r === 1 ? 0.75 : 0.5);
      }
      if (++k % 220 === 0 && onYield) await onYield(k / notes.length);
    }
    if (fam === 'soft') { lowpass(o, SR, inst === 'guitar' || inst === 'koto' ? 5200 : 4300); reverb(o, SR, 0.3, 1.15); }
    else if (fam === 'box') { reverb(o, SR, 0.36, 1.25); }
    else reverb(o, SR, 0.07, 0.7);
    // 曲ごとの音量をそろえる
    let sq = 0, pk = 0, cnt = 0;
    for (let i = 0; i < total; i += 4) { const a = Math.abs(o[i]); sq += a * a; cnt++; if (a > pk) pk = a; }
    const rms = Math.sqrt(sq / Math.max(1, cnt)) || 1e-4;
    const g = Math.min(0.14 / rms, 1.15 / Math.max(pk, 1e-4));
    for (let i = 0; i < total; i++) { const x = o[i] * g; o[i] = x > 0.85 ? 0.85 + Math.tanh((x - 0.85) * 4) * 0.13 : x < -0.85 ? -0.85 - Math.tanh((-x - 0.85) * 4) * 0.13 : x; }
    // 頭と終わりを静かに
    const fi = Math.min(total, (0.25 * SR) | 0); for (let i = 0; i < fi; i++) o[i] *= i / fi;
    const fo = Math.min(total, (1.2 * SR) | 0); for (let i = 0; i < fo; i++) o[total - 1 - i] *= i / fo;
    return { pcm: o, sr: SR, dur: total / SR };
  }

  /* ---------- WAV にする（バックグラウンド再生用） ---------- */
  function wav(pcm, SR) {
    const n = pcm.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, x < 0 ? x * 32768 : x * 32767, true); }
    return buf;
  }
  return { render, wav, decode };
}
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  // Worker の中
  const M = TookuSynth();
  self.onmessage = async e => {
    const { job, piece, opt, wantWav } = e.data;
    try {
      const r = await M.render(piece, opt, null);
      if (wantWav) { const w = M.wav(r.pcm, r.sr); self.postMessage({ job, wav: w, sr: r.sr, dur: r.dur }, [w]); }
      else self.postMessage({ job, pcm: r.pcm, sr: r.sr, dur: r.dur }, [r.pcm.buffer]);
    } catch (err) { self.postMessage({ job, error: String(err && err.message || err) }); }
  };
}
