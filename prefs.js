/* とおくの窓：設定（この端末のブラウザに保存） */
(function () {
  'use strict';
  const KEY = 'tooku-prefs-v1';
  const DEF = {
    timbre: 'auto', mode: 'normal', slow: false, vol: 30, amb: 35, volOk: false, chatMin: false, dragHint: false, calm: true, notes: 'caption', noteLen: 'long', moods: [], order: 'shuffle', off: [],
    scene: 'auto', interval: 10, tod: 'clock', weather: 'random', fps: 15, wake: false, info: true, cc: true,
    av: { on: false, name: '', hair: 0, hc: 0, skin: 0, cloth: 1, size: 1, face: 0, act: 'pc', x: 0.5, y: 0.82 }
  };
  let v = Object.assign({}, DEF);
  try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const k in DEF) if (k in s) v[k] = s[k]; } catch (e) {}
  const subs = {};
  window.TOOKU_PREFS = {
    get: k => v[k],
    set(k, val) { if (JSON.stringify(v[k]) === JSON.stringify(val)) return; v[k] = val; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} (subs[k] || []).forEach(f => { try { f(val); } catch (e) { console.warn(e); } }); },
    on(k, f) { (subs[k] = subs[k] || []).push(f); },
    reset() { v = Object.assign({}, DEF); try { localStorage.removeItem(KEY); } catch (e) {} },
    DEF
  };
})();
