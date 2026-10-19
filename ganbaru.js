/* とおくの窓：がんばる（がんばった時間を数えるストップウォッチ）。
   がんばったかどうかはアプリが判定しない。押した人の申告をそのまま記録する。
   見張り・警告・自動停止はしない。押した時刻を覚えておくだけなので、ページを閉じても数え続ける。
   あとから時間を直すのは任意（寝落ち −5時間 などの目安つき）。
   保存はこの端末のブラウザだけ（localStorage `tooku-ganbaru-v1`）。 */
(function () {
  'use strict';
  const KEY = 'tooku-ganbaru-v1';
  const DAY_START = 4;                 // 日付の区切りは朝4時（夜ふかしの分は前の日に入れる）
  const MAX_MS = 72 * 3600 * 1000;     // 1回の記録の上限（押しっぱなしで何日も経ったときの暴走よけ）
  // 記録：run＝いま数えている回の始まり（ミリ秒）、log＝終わった回 [始まり, 終わり, 直した分(ミリ秒)]
  let D = { run: null, log: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.log)) D = { run: typeof s.run === 'number' ? s.run : null, log: s.log.filter(x => Array.isArray(x) && x.length >= 2) }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  const subs = new Set();
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { console.warn(e); } });
  // 別のタブ・別のウィンドウで押したときも合わせる
  window.addEventListener('storage', e => { if (e.key !== KEY) return; try { const s = JSON.parse(e.newValue || 'null'); if (s && Array.isArray(s.log)) { D = { run: typeof s.run === 'number' ? s.run : null, log: s.log }; emit(); } } catch (x) {} });

  const running = () => D.run !== null;
  const elapsed = () => running() ? Math.max(0, Date.now() - D.run) : 0;
  function start() { if (running()) return; D.run = Date.now(); save(); emit(); }
  function stop() {
    if (!running()) return null;
    const s = D.run, e = Math.min(Date.now(), s + MAX_MS);
    D.run = null;
    if (e - s >= 1000) D.log.push([s, e, 0]);
    save(); emit();
    return D.log.length - 1;
  }
  // 直したあとの長さ（ミリ秒）。直した分は「終わり」を前後にずらすと考える（寝落ちなら終わりを早める）
  const effEnd = r => Math.max(r[0], r[1] + (r[2] || 0));
  const lenOf = r => effEnd(r) - r[0];
  function adjust(i, deltaMs) { const r = D.log[i]; if (!r) return; r[2] = Math.max(-(r[1] - r[0]), (r[2] || 0) + deltaMs); save(); emit(); }
  function setLen(i, ms) { const r = D.log[i]; if (!r) return; r[2] = Math.max(0, ms) - (r[1] - r[0]); save(); emit(); }
  function reset(i) { const r = D.log[i]; if (!r) return; r[2] = 0; save(); emit(); }

  /* 日ごとの合計（日付の区切りは朝4時）。日をまたいだ回は、それぞれの日に分ける */
  const dayKey = ms => { const d = new Date(ms - DAY_START * 3600 * 1000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function nextBoundary(ms) { const d = new Date(ms - DAY_START * 3600 * 1000); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d.getTime() + DAY_START * 3600 * 1000; }
  function addSpan(map, s, e) { while (s < e) { const b = Math.min(e, nextBoundary(s)); const k = dayKey(s); map[k] = (map[k] || 0) + (b - s); s = b; } }
  function days() {
    const map = {};
    for (const r of D.log) addSpan(map, r[0], effEnd(r));
    if (running()) addSpan(map, D.run, Date.now());
    return map;
  }
  const today = () => days()[dayKey(Date.now())] || 0;
  const total = () => Object.values(days()).reduce((a, b) => a + b, 0);
  const first = () => { let m = D.run || Infinity; for (const r of D.log) m = Math.min(m, r[0]); return isFinite(m) ? m : null; };
  // 新しい順に、最近の記録（直すため）
  function recent(n) { const out = []; for (let i = D.log.length - 1; i >= 0 && out.length < n; i--) out.push({ i, s: D.log[i][0], e: D.log[i][1], adj: D.log[i][2] || 0, len: lenOf(D.log[i]) }); return out; }

  /* 表示用：1時間23分・23分・45秒 */
  function fmt(ms, withSec) {
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    if (withSec) return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0');
    return h ? h + '時間' + (m ? m + '分' : '') : m ? m + '分' : s > 0 ? '1分未満' : '0分';
  }
  // 直すときの目安（押すとその分だけ減らす）
  const PRESETS = [['寝落ち', -5 * 60], ['ゲーム', -60], ['昼寝', -30], ['ちょっと休憩', -10]];

  window.TookuGanbaru = { start, stop, running, elapsed, adjust, setLen, reset, days, today, total, first, recent, dayKey, fmt, PRESETS, DAY_START, on: f => { subs.add(f); return () => subs.delete(f); } };
})();
