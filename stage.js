/* とおくの窓：景色を動かす舞台（大きさ合わせ・時間帯の更新・場面の切り替え・描画の流れ） */
(function () {
  'use strict';
  const E = window.TookuEngine, A = window.TookuArt, P = window.TOOKU_PREFS;
  const { RNG } = E;
  const Q = new URLSearchParams(location.search);   // 確認用：?scene=river&hour=18&weather=rain

  let view, vg, W = 0, H = 0, scale = 1;
  const skyC = document.createElement('canvas'), stC = document.createElement('canvas');
  let cur = null, last = 0, tStart = performance.now() / 1000, running = true, trans = null;
  const listeners = new Set();
  const info = () => cur ? { id: cur.def.id, name: cur.def.name, tod: cur.env.todName, weather: cur.env.weatherName, hour: cur.env.hour } : null;
  const emit = () => listeners.forEach(f => { try { f(info()); } catch (e) {} });

  function fit() {
    const cw = Math.max(1, window.innerWidth), ch = Math.max(1, window.innerHeight);
    // 短い辺が 110〜140 ドットくらいになる、ちょうどの倍率
    const target = Q.get('px') ? +Q.get('px') : 124;
    scale = Math.max(2, Math.round(Math.min(cw, ch) / target));
    const nW = Math.ceil(cw / scale), nH = Math.ceil(ch / scale);
    view.style.width = nW * scale + 'px'; view.style.height = nH * scale + 'px';
    if (nW !== W || nH !== H) { W = nW; H = nH; view.width = W; view.height = H; vg = view.getContext('2d'); vg.imageSmoothingEnabled = false; if (cur) enter(cur.def, cur.weatherKey, 'seed'); }
  }

  /* ---------- 時刻と天気 ---------- */
  function currentHour() {
    if (Q.get('hour')) return +Q.get('hour');
    const m = P.get('tod');
    if (m === 'clock') { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
    if (m === 'random') return cur && cur.randHour !== undefined ? cur.randHour : E.FIXED_HOUR.day;
    return E.FIXED_HOUR[m] || 12;
  }
  function chooseWeather(def) {
    if (Q.get('weather')) return Q.get('weather');
    const pref = P.get('weather'), table = def.weather;
    if (pref !== 'random') return table[pref] ? pref : Object.keys(table).sort((a, b) => table[b] - table[a])[0];
    // 今いる季節を少しだけ反映（冬は雪が増え、夏は雪が出にくい）
    const mo = new Date().getMonth(), winter = mo === 11 || mo <= 1, summer = mo >= 5 && mo <= 8;
    let sum = 0; const ent = Object.entries(table).map(([k, w]) => { const ww = w * (k === 'snow' ? (winter ? 2 : summer ? 0.15 : 0.7) : 1); sum += ww; return [k, ww]; });
    let r = Math.random() * sum; for (const [k, w] of ent) { if ((r -= w) <= 0) return k; } return 'clear';
  }

  /* ---------- 場面に入る ---------- */
  function enter(def, weatherKey, keepState) {
    const seed = keepState && cur ? cur.seed : (Math.random() * 1e9) | 0;
    const keepS = keepState === true;
    const hour = currentHour(), env = E.makeEnv(W, H, hour, weatherKey, seed);
    const rng = RNG(seed);
    const hz = def.horizon(env);
    env.hz = hz;
    const st = { stars: E.makeStars(env, Math.round(W * H / 60)), moon: null };
    env.skyState = st;
    const s = keepS && cur && cur.def === def ? cur.s : (def.init ? def.init(env, rng) : {}) || {};
    const clouds = E.makeClouds(env, Math.round((W / 40) * (1 + env.cloudiness * 2.5) * (def.cloudMul || 1)), hz * (def.cloudTop || 0.55), RNG(seed + 3));
    const wthr = E.makeWeather(env, RNG(seed + 4));
    const prevRand = cur && cur.randHour;
    cur = { def, env, s, rng, seed, weatherKey, clouds, wthr, randHour: keepState ? prevRand : undefined, hourBuilt: hour };
    if (P.get('tod') === 'random' && !keepState) { cur.randHour = [6.1, 9.5, 12.5, 15, 17.9, 21, 23.5, 2][Math.random() * 8 | 0]; return enter(def, weatherKey, true); }
    rebuild();
    if (window.TookuPlayer) {
      const kinds = (def.amb ? def.amb(env) : []).slice();
      if (env.weather === 'rain') kinds.push(['rain', 1]);
      if (env.weather === 'snow') { for (const k of kinds) if (k[0] === 'crickets' || k[0] === 'birds') k[1] = 0; }
      window.TookuPlayer.setAmbience(kinds.filter(k => k[1] > 0));
    }
    emit();
  }
  function rebuild() {
    const { def, env } = cur;
    skyC.width = stC.width = W; skyC.height = stC.height = H;
    const sg = skyC.getContext('2d'); sg.imageSmoothingEnabled = false;
    E.drawSky(E.tools(sg), env, env.skyState, 0, env.hz, { part: 'base', milky: def.milky });
    const tg = stC.getContext('2d'); tg.clearRect(0, 0, W, H); tg.imageSmoothingEnabled = false;
    def.build(E.tools(tg), env, cur.s);
    if (env.weather === 'snow' && def.snowCaps !== false) snowCaps(tg, env);
  }
  // 雪の日：上に何もない縁に雪を乗せる
  function snowCaps(g, env) {
    const id = g.getImageData(0, 0, W, H), d = id.data, c = env.colRGB('#f4f8fc');
    const lim = def0 => def0;
    for (let y = H - 1; y >= 1; y--) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, j = ((y - 1) * W + x) * 4;
      if (d[i + 3] > 200 && d[j + 3] < 40 && y > (cur.def.snowFrom ? cur.def.snowFrom(env) : 0)) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    }
    g.putImageData(id, 0, 0); lim();
  }

  /* ---------- 毎フレーム ---------- */
  function loop(now) { requestAnimationFrame(loop); if (running && !document.hidden) frame(now / 1000, false); }
  function frame(ts, force) {
    if (!cur) return;
    const fps = P.get('fps') || 15;
    if (!force && ts - last < 1 / fps - 0.004) return;
    const dt = Math.min(0.25, last ? ts - last : 0.06); last = ts;
    const t = ts - tStart, { def, env, s } = cur;
    // 時計に合わせているときは、数分ごとに色を作り直す
    if (P.get('tod') === 'clock' && !Q.get('hour') && Math.abs(currentHour() - cur.hourBuilt) > 0.05 && Math.abs(currentHour() - cur.hourBuilt) < 23.9) enter(def, cur.weatherKey, true);
    const T = E.tools(vg);
    vg.globalCompositeOperation = 'source-over'; vg.globalAlpha = 1;
    vg.drawImage(skyC, 0, 0);
    E.drawSky(T, env, env.skyState, t, env.hz, { part: 'dyn' });
    if (def.skyExtra) def.skyExtra(T, env, s, t, dt);
    if (def.clouds !== false) E.drawClouds(T, env, cur.clouds, t, env.weather === 'clear' ? 0.92 : 1);
    if (def.back) def.back(T, env, s, t, dt);
    vg.drawImage(stC, 0, 0);
    if (def.front) def.front(T, env, s, t, dt);
    if (def.glow) { vg.save(); def.glow(vg, env, s, t, dt); vg.restore(); }
    E.drawWeather(T, env, cur.wthr, t, dt, def.wind ? def.wind(env, t) : undefined);
    if (def.over) def.over(T, env, s, t, dt);
    if (trans) drawTrans(ts);
  }
  // ドットがぱらぱら入れ替わる切り替え
  function drawTrans(ts) {
    const p = (performance.now() / 1000 - trans.t0) / 1.6;
    if (p >= 1 || trans.w !== W || trans.h !== H) { trans = null; return; }
    const nd = vg.getImageData(0, 0, W, H), a = nd.data, b = trans.img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (E.bay(x, y) * 0.9 + ((x * 7 + y * 13) % 11) / 110 > p) { const i = (y * W + x) * 4; a[i] = b[i]; a[i + 1] = b[i + 1]; a[i + 2] = b[i + 2]; }
    vg.putImageData(nd, 0, 0);
  }

  /* ---------- 場面の順番 ---------- */
  let bag = [], timer = 0, sceneStart = 0;
  function pickNext() {
    const list = A.SCENES.map(d => d.id);
    bag = bag.filter(id => list.includes(id));
    if (!bag.length) { bag = list.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } if (cur && bag[0] === cur.def.id && bag.length > 1) bag.push(bag.shift()); }
    return bag.shift();
  }
  function go(id, opt) {
    const def = A.SCENES.find(d => d.id === id) || A.SCENES[0];
    if (cur && vg && !(opt && opt.instant)) trans = { img: vg.getImageData(0, 0, W, H), t0: performance.now() / 1000, w: W, h: H };
    enter(def, chooseWeather(def), false);
    sceneStart = Date.now();
  }
  function next() { const pref = P.get('scene'); go(pref === 'auto' ? pickNext() : pref); }
  function schedule() {
    clearInterval(timer);
    timer = setInterval(() => {
      const min = +P.get('interval');
      if (P.get('scene') !== 'auto' || !min || Q.get('scene')) return;
      if (Date.now() - sceneStart > min * 60000) next();
    }, 5000);
  }

  function init(canvas) {
    view = canvas; fit();
    window.addEventListener('resize', () => { clearTimeout(fit._t); fit._t = setTimeout(fit, 120); });
    const first = Q.get('scene') || (P.get('scene') !== 'auto' ? P.get('scene') : pickNext());
    go(first, { instant: true });
    schedule();
    P.on('scene', () => next());
    P.on('weather', () => { if (cur) enter(cur.def, chooseWeather(cur.def), false); });
    P.on('tod', () => { if (cur) { cur.randHour = undefined; enter(cur.def, cur.weatherKey, true); if (P.get('tod') === 'random') enter(cur.def, cur.weatherKey, false); } });
    P.on('interval', () => { sceneStart = Date.now(); });
    requestAnimationFrame(loop);
  }
  window.TookuStage = {
    init, next, go, info, on: f => { listeners.add(f); return () => listeners.delete(f); },
    setRunning: v => { running = v; },
    // 確認用：時間を進めて1枚描く
    _step(seconds) { running = false; let ts = (last || performance.now() / 1000); const n = Math.max(1, Math.round(seconds * 15)); for (let i = 0; i < n; i++) { ts += 1 / 15; frame(ts, true); } },
    get scale() { return scale; }, get size() { return [W, H]; }
  };
})();
