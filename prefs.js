/* とおくの窓：設定（この端末のブラウザに保存） */
(function () {
  'use strict';
  const KEY = 'tooku-prefs-v1';
  const DEF = {
    timbre: 'auto', mode: 'normal', slow: 0, vol: 55, volCurve: 2, amb: 35, volOk: false, chatMin: false, dragHint: false, calm: true, notes: 'caption', noteLen: 'long', moods: [], order: 'shuffle', off: [],
    scene: 'auto', interval: 10, tod: 'clock', weather: 'random', fps: 15, frame: 'none', wake: false, info: true, cc: true,
    av: { on: false, name: '', hair: 0, hc: 0, skin: 0, cloth: 1, size: 1, face: 0, act: 'pc', x: 0.5, y: 0.82 }
  };
  let v = Object.assign({}, DEF);
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const k in DEF) if (k in s) v[k] = s[k];
    // 曲の音量の目盛りを2乗に変えた（2026-11）。前に保存した数字は、同じ大きさに聞こえる数字に一度だけ置き換える
    if ('vol' in s && s.volCurve !== 2) { v.vol = Math.round(Math.sqrt(Math.max(0, Math.min(100, +s.vol || 0)) / 100) * 100); v.volCurve = 2; localStorage.setItem(KEY, JSON.stringify(v)); }
  } catch (e) {}
  const subs = {};
  window.TOOKU_PREFS = {
    get: k => v[k],
    set(k, val) { if (JSON.stringify(v[k]) === JSON.stringify(val)) return; v[k] = val; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} (subs[k] || []).forEach(f => { try { f(val); } catch (e) { console.warn(e); } }); },
    on(k, f) { (subs[k] = subs[k] || []).push(f); },
    reset() { v = Object.assign({}, DEF); try { localStorage.removeItem(KEY); } catch (e) {} },
    DEF
  };
})();
