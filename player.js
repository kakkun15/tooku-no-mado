/* とおくの窓：再生（ふつう＝Web Audio／バックグラウンド＝audio要素）と環境音 */
(function () {
  'use strict';
  const PIECES = (window.CHILL_MUSIC || []).concat(window.CHILL_MUSIC_CC || []);
  const FAMILY_NAME = { soft: 'やさしい', box: 'オルゴール', chip: 'ファミコン' };
  const GROUP_NAME = { shuumatsu: '終末ニュースの盤', yukikoro: 'ゆきころバトルの曲', mutopia: '新しく足した曲', cc: '表示が必要な曲（CC）' };

  /* ---------- 合成を別スレッドで ---------- */
  let worker = null, jobs = {}, jobN = 0, local = null;
  function makeWorker() {
    try { const w = new Worker('synth.js'); w.onerror = () => { if (worker === w) { worker = null; tryBlob(); } }; return w; }
    catch (e) { return null; }
  }
  function tryBlob() {
    try {
      const code = TookuSynth.toString() + '\nconst M=TookuSynth();self.onmessage=async e=>{const {job,piece,opt,wantWav}=e.data;try{const r=await M.render(piece,opt,null);if(wantWav){const w=M.wav(r.pcm,r.sr);self.postMessage({job,wav:w,sr:r.sr,dur:r.dur},[w]);}else self.postMessage({job,pcm:r.pcm,sr:r.sr,dur:r.dur},[r.pcm.buffer]);}catch(err){self.postMessage({job,error:String(err)});}};';
      worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      worker.onmessage = onMsg; worker.onerror = () => { worker = null; };
    } catch (e) { worker = null; }
  }
  function onMsg(e) { const j = jobs[e.data.job]; if (!j) return; delete jobs[e.data.job]; e.data.error ? j.rej(new Error(e.data.error)) : j.res(e.data); }
  worker = makeWorker(); if (worker) worker.onmessage = onMsg; else tryBlob();
  function renderJob(piece, opt, wantWav) {
    if (worker) {
      return new Promise((res, rej) => {
        const job = ++jobN; jobs[job] = { res, rej };
        worker.postMessage({ job, piece: { id: piece.id, n: piece.n, i: piece.i, chip: piece.chip }, opt, wantWav });
        setTimeout(() => { if (jobs[job]) { delete jobs[job]; worker = null; rej(new Error('timeout')); } }, 90000);
      }).catch(err => { if (!worker) return renderLocal(piece, opt, wantWav); throw err; });
    }
    return renderLocal(piece, opt, wantWav);
  }
  async function renderLocal(piece, opt, wantWav) {
    if (!local) local = TookuSynth();
    const r = await local.render(piece, opt, () => new Promise(res => setTimeout(res, 0)));
    return wantWav ? { wav: local.wav(r.pcm, r.sr), sr: r.sr, dur: r.dur } : r;
  }

  /* ---------- 音の出口 ---------- */
  let ac = null, master = null, musicGain = null, ambGain = null, keepAlive = null;
  const el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', ''); el.crossOrigin = 'anonymous';
  function silentWav() {
    const n = 2000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  const SILENT = silentWav();
  function ensureAC() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.connect(master);
      ambGain = ac.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
      applyVolumes();
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (ac.state !== 'running') { const r = ac.resume(); if (r && r.catch) r.catch(() => {}); }
    return ac;
  }

  /* ---------- 設定 ---------- */
  const P = window.TOOKU_PREFS;
  function applyVolumes() {
    if (!ac) return;
    const t = ac.currentTime;
    // setTargetAtTime だけだと Safari で反映が遅れることがあるので、今の値から短く傾けて切り替える
    const to = (prm, v, sec) => { try { prm.cancelScheduledValues(t); prm.setValueAtTime(prm.value, t); prm.linearRampToValueAtTime(v, t + sec); } catch (e) { prm.value = v; } };
    to(musicGain.gain, P.get('mode') === 'bg' ? 0 : P.get('vol') / 100, 0.04);
    to(ambGain.gain, P.get('amb') / 100 * 0.9, 0.08);
    el.volume = Math.min(1, P.get('vol') / 100);
  }

  /* ---------- 選曲 ---------- */
  // 表示が必要な曲（CC）を流すか。録画・配信のときはオフにする
  const allowed = p => p.g !== 'cc' || P.get('cc') !== false;
  const enabledIds = () => { const off = new Set(P.get('off') || []); return PIECES.filter(p => !off.has(p.id) && allowed(p)).map(p => p.id); };
  let bag = [], history = [];
  function nextId(after) {
    const ids = enabledIds(); if (!ids.length) return null;
    if (P.get('order') === 'seq') {
      const i = after ? ids.indexOf(after) : -1;
      return ids[(i + 1) % ids.length];
    }
    bag = bag.filter(id => ids.includes(id));
    if (!bag.length) { bag = ids.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } if (bag[0] === after && bag.length > 1) bag.push(bag.shift()); }
    return bag.shift();
  }
  function pickFamily(piece) {
    const f = P.get('timbre');
    if (f !== 'auto') return f;
    const r = Math.random();
    if (piece.i === 'chip') return r < 0.55 ? 'chip' : r < 0.8 ? 'soft' : 'box';
    return r < 0.55 ? 'soft' : r < 0.8 ? 'box' : 'chip';
  }

  /* ---------- 再生 ---------- */
  const S = { playing: false, cur: null, next: null, src: null, startAt: 0, offset: 0, loading: false, gen: 0, url: null };
  const listeners = new Set();
  const emit = () => listeners.forEach(f => { try { f(state()); } catch (e) {} });
  function state() {
    const c = S.cur;
    return { playing: S.playing, loading: S.loading, piece: c && c.piece, family: c && c.family, familyName: c && FAMILY_NAME[c.family], pos: position(), dur: c ? c.dur : 0 };
  }
  function position() {
    if (!S.cur) return 0;
    if (P.get('mode') === 'bg') return el.currentTime || 0;
    return S.playing && ac ? S.offset + (ac.currentTime - S.startAt) : S.offset;
  }
  async function prepare(id, family) {
    const piece = PIECES.find(p => p.id === id); if (!piece) return null;
    family = family || pickFamily(piece);
    const bg = P.get('mode') === 'bg', opt = { family, slow: !!P.get('slow'), seed: Math.random() * 1000 | 0 };
    const r = await renderJob(piece, opt, bg);
    const item = { piece, family, dur: r.dur, bg, opt };
    if (bg) { item.wav = r.wav; item.url = wavUrl(r.wav); }
    else { ensureAC(); const b = ac.createBuffer(1, r.pcm.length, r.sr); if (b.copyToChannel) b.copyToChannel(r.pcm, 0); else b.getChannelData(0).set(r.pcm); item.buf = b; }
    return item;
  }
  function release(item) { if (item && item.url) URL.revokeObjectURL(item.url); }
  // iPhone・iPad では audio 要素の音量を変えられない（いつも最大）。そこで音量を掛けた WAV を作って流す
  const FIXED_VOL = (() => { try { const a = new Audio(); a.volume = 0.5; return Math.abs(a.volume - 0.5) > 0.01; } catch (e) { return false; } })();
  function wavUrl(wav) {
    const g = FIXED_VOL ? Math.min(1, P.get('vol') / 100) : 1;
    if (g >= 0.999) return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    const src = new Int16Array(wav, 44), out = new ArrayBuffer(wav.byteLength), dst = new Int16Array(out, 44);
    new Uint8Array(out, 0, 44).set(new Uint8Array(wav, 0, 44));
    for (let i = 0; i < src.length; i++) dst[i] = src[i] * g;
    return URL.createObjectURL(new Blob([out], { type: 'audio/wav' }));
  }
  let swapping = false;
  function reapplyBgVolume() {
    if (!FIXED_VOL) return;
    for (const it of [S.next]) if (it && it.wav) { const u = wavUrl(it.wav); release(it); it.url = u; }
    const c = S.cur; if (!c || !c.wav) return;
    const isCur = el.src === c.url, pos = el.currentTime || 0, wasPlaying = isCur && !el.paused;
    const u = wavUrl(c.wav); release(c); c.url = u;
    if (!isCur) return;
    swapping = true; el.src = u;
    el.addEventListener('loadedmetadata', () => {
      try { el.currentTime = pos; } catch (e) {}
      if (wasPlaying) { const r = el.play(); if (r && r.catch) r.catch(() => {}); }
      setTimeout(() => { swapping = false; }, 300);
    }, { once: true });
  }
  function stopSource() { if (S.src) { try { S.src.onended = null; S.src.stop(); } catch (e) {} S.src = null; } }
  function startCurrent(offset) {
    const c = S.cur; if (!c) return;
    offset = Math.max(0, Math.min(offset || 0, c.dur - 0.5));
    if (c.bg) {
      stopSource();
      el.src = c.url; el.currentTime = 0;
      const go = () => { try { el.currentTime = offset; } catch (e) {} const r = el.play(); if (r && r.catch) r.catch(() => { S.playing = false; emit(); }); };
      if (el.readyState >= 1) go(); else el.addEventListener('loadedmetadata', go, { once: true });
    } else {
      el.pause();
      ensureAC(); stopSource();
      const s = ac.createBufferSource(); s.buffer = c.buf; s.connect(musicGain);
      s.onended = () => { if (S.src === s) advance(); };
      s.start(ac.currentTime + 0.05, offset); S.src = s; S.startAt = ac.currentTime + 0.05; S.offset = offset;
    }
    S.playing = true; mediaMeta(); emit(); prefetch();
  }
  let prefetching = null;
  function prefetch() {
    if (S.next || prefetching || !S.cur) return;
    const gen = S.gen, id = nextId(S.cur.piece.id);
    if (!id) return;
    prefetching = prepare(id).then(it => { if (gen === S.gen && !S.next) S.next = it; else release(it); }).catch(() => {}).finally(() => { prefetching = null; });
  }
  async function advance() {
    history.push(S.cur && S.cur.piece.id); if (history.length > 50) history.shift();
    if (S.next) { release(S.cur); S.cur = S.next; S.next = null; startCurrent(0); return; }
    if (prefetching) { S.loading = true; emit(); await prefetching; S.loading = false; if (S.next) return advance(); }
    await playId(nextId(S.cur && S.cur.piece.id));
  }
  async function playId(id, family, offset, paused) {
    if (!id) return;
    const gen = ++S.gen; S.loading = true; emit();
    if (S.next) { release(S.next); S.next = null; }
    try {
      const it = await prepare(id, family);
      if (gen !== S.gen) { release(it); return; }
      stopSource(); release(S.cur); S.cur = it; S.loading = false;
      const off = typeof offset === 'function' ? offset(it.dur) : (offset || 0);
      if (paused) { S.offset = off; S.playing = false; if (it.bg) { el.src = it.url; } mediaMeta(); emit(); prefetch(); }
      else startCurrent(off);
    } catch (e) { S.loading = false; emit(); console.warn(e); }
  }
  el.addEventListener('ended', () => { if (P.get('mode') === 'bg' && S.cur && S.cur.url && el.src === S.cur.url) advance(); });
  el.addEventListener('pause', () => { if (!swapping && P.get('mode') === 'bg' && !el.ended && S.playing && S.cur && el.src === S.cur.url) { S.playing = false; emit(); } });
  el.addEventListener('play', () => { if (P.get('mode') === 'bg' && S.cur && el.src === S.cur.url) { S.playing = true; emit(); } });

  function unlock() {           // 最初のタップの中で音の出口を開けておく
    ensureAC();
    if (P.get('mode') === 'bg' && !el.src) { el.src = SILENT; const r = el.play(); if (r && r.catch) r.catch(() => {}); }
    if (!keepAlive && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
      // iOS：無音を流してページを「再生中」にする（ホームから戻ったときの復帰を助ける）
      keepAlive = new Audio(SILENT); keepAlive.loop = true; keepAlive.volume = 0.01; keepAlive.setAttribute('playsinline', '');
      const r = keepAlive.play(); if (r && r.catch) r.catch(() => {});
    }
  }
  function play() {
    unlock();
    if (S.cur && !S.playing) { startCurrent(S.offset || position()); return; }
    if (!S.cur && !S.loading) playId(nextId(null));
  }
  function pause() {
    if (!S.cur) return;
    S.offset = position(); S.playing = false;
    if (S.cur.bg) el.pause(); else stopSource();
    emit();
  }
  function toggle() { S.playing ? pause() : play(); }
  function skip() { unlock(); if (S.loading) return; if (S.cur) { stopSource(); if (S.cur.bg) el.pause(); } advance(); }
  function prev() {
    unlock();
    if (position() > 5 || !history.length) { if (S.cur) startCurrent(0); return; }
    const id = history.pop(); if (id) playId(id);
  }
  function playPiece(id) { unlock(); playId(id); }
  // 音色・速さ・方式が変わったら、今の曲をその位置から作り直す
  function rebuild(keepFamily) {
    if (!S.cur) return;
    const ratio = position() / Math.max(1, S.cur.dur), id = S.cur.piece.id;
    const fam = keepFamily ? S.cur.family : (P.get('timbre') === 'auto' ? S.cur.family : P.get('timbre'));
    const wasPlaying = S.playing;
    if (S.next) { release(S.next); S.next = null; }
    playId(id, fam, d => ratio * d, !wasPlaying);
  }
  P.on('timbre', () => rebuild(false));
  P.on('slow', () => rebuild(true));
  P.on('mode', () => { applyVolumes(); unlock(); rebuild(true); });
  let volT = 0;
  P.on('vol', () => { applyVolumes(); if (FIXED_VOL && P.get('mode') === 'bg') { clearTimeout(volT); volT = setTimeout(reapplyBgVolume, 350); } });
  P.on('amb', applyVolumes);
  P.on('cc', v => {
    if (S.next && !allowed(S.next.piece)) { release(S.next); S.next = null; prefetch(); }
    if (!v && S.cur && !allowed(S.cur.piece) && enabledIds().length) skip();   // 録画の直前に切り替えることが多いので、すぐ次の曲へ
  });
  P.on('off', () => { if (S.next && (P.get('off') || []).includes(S.next.piece.id)) { release(S.next); S.next = null; prefetch(); } });

  /* ---------- ロック画面の操作 ---------- */
  function mediaMeta() {
    if (!('mediaSession' in navigator) || !S.cur) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: S.cur.piece.t, artist: S.cur.piece.c + '（' + FAMILY_NAME[S.cur.family] + '）', album: 'とおくの窓', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
      navigator.mediaSession.playbackState = S.playing ? 'playing' : 'paused';
    } catch (e) {}
  }
  if ('mediaSession' in navigator) {
    const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} };
    h('play', play); h('pause', pause); h('nexttrack', skip); h('previoustrack', prev);
  }
  listeners.add(() => { if ('mediaSession' in navigator) try { navigator.mediaSession.playbackState = S.playing ? 'playing' : 'paused'; } catch (e) {} });

  // ふつう再生：ページが隠れたら音の出口が止まることがある。戻ったら自動で再開する
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ac && ac.state !== 'running') { const r = ac.resume(); if (r && r.catch) r.catch(() => {}); }
  });

  /* ================= 環境音 ================= */
  const AMB = { nodes: [], timers: [], kinds: '' };
  let noiseBuf = null, brownBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const n = ac.sampleRate * 3; noiseBuf = ac.createBuffer(1, n, ac.sampleRate); brownBuf = ac.createBuffer(1, n, ac.sampleRate);
    const d = noiseBuf.getChannelData(0), b = brownBuf.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; d[i] = w; last = (last + 0.02 * w) / 1.02; b[i] = last * 3.5; }
    return noiseBuf;
  }
  function loopSrc(brown) { noise(); const s = ac.createBufferSource(); s.buffer = brown ? brownBuf : noiseBuf; s.loop = true; s.start(0, Math.random() * 2.5); AMB.nodes.push(s); return s; }
  function filt(type, f, q) { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; AMB.nodes.push(x); return x; }
  function gainN(v) { const g = ac.createGain(); g.gain.value = v; AMB.nodes.push(g); return g; }
  function every(ms, jitter, fn) { let alive = true; const tick = () => { if (!alive) return; try { fn(); } catch (e) {} AMB.timers.push(setTimeout(tick, ms + Math.random() * jitter)); }; AMB.timers.push(setTimeout(tick, Math.random() * ms)); AMB.timers.push({ stop: () => { alive = false; } }); }
  function blip(freq, dur, vol, type, sweepTo) {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + 0.02;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ambGain); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(fc, q, dur, vol) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + 0.01;
    noise(); s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(ambGain); s.start(t, Math.random() * 2); s.stop(t + dur + 0.02);
  }
  const KIND = {
    fire(l) { const s = loopSrc(true), f = filt('lowpass', 260), g = gainN(0.35 * l); s.connect(f); f.connect(g); g.connect(ambGain);
      every(70, 260, () => { if (Math.random() < 0.8) burst(1800 + Math.random() * 3000, 1.5, 0.01 + Math.random() * 0.03, (0.05 + Math.random() * 0.25) * l); }); },
    stream(l) { const s = loopSrc(), f1 = filt('bandpass', 900, 0.6), f2 = filt('bandpass', 2600, 1.2), g = gainN(0.16 * l), g2 = gainN(0.05 * l);
      s.connect(f1); f1.connect(g); g.connect(ambGain); s.connect(f2); f2.connect(g2); g2.connect(ambGain);
      every(110, 120, () => { g.gain.setTargetAtTime((0.11 + Math.random() * 0.1) * l, ac.currentTime, 0.08); f1.frequency.setTargetAtTime(700 + Math.random() * 500, ac.currentTime, 0.1); }); },
    falls(l) { const s = loopSrc(), f = filt('lowpass', 1400), g = gainN(0.14 * l); s.connect(f); f.connect(g); g.connect(ambGain); },
    wind(l) { const s = loopSrc(), f = filt('lowpass', 420), g = gainN(0.12 * l); s.connect(f); f.connect(g); g.connect(ambGain);
      every(2500, 3000, () => { const t = ac.currentTime; g.gain.setTargetAtTime((0.04 + Math.random() * 0.16) * l, t, 1.2); f.frequency.setTargetAtTime(260 + Math.random() * 500, t, 1.5); }); },
    rain(l) { const s = loopSrc(), f = filt('highpass', 1200), f2 = filt('lowpass', 7000), g = gainN(0.13 * l); s.connect(f); f.connect(f2); f2.connect(g); g.connect(ambGain);
      every(40, 90, () => burst(2500 + Math.random() * 4000, 3, 0.02, (0.02 + Math.random() * 0.05) * l)); },
    waves(l) { const s = loopSrc(), f = filt('lowpass', 650), g = gainN(0.02); s.connect(f); f.connect(g); g.connect(ambGain);
      every(7000, 3500, () => { const t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.3 * l, t, 1.4); g.gain.setTargetAtTime(0.03 * l, t + 3, 1.8); f.frequency.setTargetAtTime(900, t, 1); f.frequency.setTargetAtTime(450, t + 3, 2); }); },
    crickets(l) { const voices = [4400, 4900, 5300].slice(0, 2 + (Math.random() * 2 | 0));
      voices.forEach(fq => every(900, 900, () => { for (let k = 0; k < 3; k++) setTimeout(() => blip(fq, 0.035, 0.012 * l), k * 70); })); },
    birds(l) { every(3500, 9000, () => { const n = 2 + (Math.random() * 4 | 0), b = 2200 + Math.random() * 1800; for (let k = 0; k < n; k++) setTimeout(() => blip(b * (0.9 + Math.random() * 0.3), 0.09, 0.02 * l, 'sine', b * (1.2 + Math.random() * 0.4)), k * (90 + Math.random() * 60)); }); },
    gulls(l) { every(9000, 12000, () => { for (let k = 0; k < 2 + (Math.random() * 2 | 0); k++) setTimeout(() => blip(1300, 0.32, 0.012 * l, 'triangle', 800), k * 380); }); },
    town(l) { const s = loopSrc(true), f = filt('lowpass', 160), g = gainN(0.2 * l); s.connect(f); f.connect(g); g.connect(ambGain); },
    chimes(l) { const sc = [1046, 1175, 1318, 1568, 1760, 2093]; every(5000, 9000, () => { const n = 1 + (Math.random() * 3 | 0); for (let k = 0; k < n; k++) setTimeout(() => blip(sc[Math.random() * sc.length | 0], 2.2, 0.01 * l), k * (150 + Math.random() * 300)); }); },
  };
  function setAmbience(kinds) {
    const key = JSON.stringify(kinds);
    if (key === AMB.kinds) return; AMB.kinds = key;
    if (!ac) return;
    for (const n of AMB.nodes) { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }
    for (const t of AMB.timers) { if (t && t.stop) t.stop(); else clearTimeout(t); }
    AMB.nodes = []; AMB.timers = [];
    for (const [k, l] of kinds) if (KIND[k]) KIND[k](l);
  }
  function ambEvent(name) {
    if (!ac || P.get('amb') <= 0) return;
    if (name === 'crossing') { let k = 0; const id = setInterval(() => { blip(k % 2 ? 1250 : 1400, 0.35, 0.02); blip(k % 2 ? 2500 : 2800, 0.25, 0.006); if (++k > 16) clearInterval(id); }, 420); }
    if (name === 'splash') burst(1500, 0.8, 0.25, 0.06);
    if (name === 'owl') { blip(420, 0.35, 0.03, 'sine', 380); setTimeout(() => blip(400, 0.6, 0.03, 'sine', 360), 600); }
  }

  window.TookuPlayer = {
    PIECES, FAMILY_NAME, GROUP_NAME, LICENSES: window.CHILL_LICENSES || {}, allowed, enabledIds, state, play, pause, toggle, skip, prev, playPiece, unlock,
    on: f => { listeners.add(f); return () => listeners.delete(f); },
    setAmbience: kinds => { if (ac) setAmbience(kinds); else AMB.pending = kinds; },
    startAmbience: () => { ensureAC(); if (AMB.pending) { const k = AMB.pending; AMB.pending = null; AMB.kinds = ''; setAmbience(k); } },
    ambEvent,
    get context() { return ac; }
  };
})();
