/* とおくの窓：みんなの窓（P2P）。同じ部屋の人と、景色・アバターの位置・チャットを分け合う。
   つながり方：PeerJS（WebRTC）。部屋を作った人（ホスト）が全員とつながり、届いたものを配る（スター型）。
   部屋の機能を使うまでは、外のサーバーには一切つながない。 */
(function () {
  'use strict';
  const P = window.TOOKU_PREFS, ST = window.TookuStage, AV = window.TookuAvatar, PL = window.TookuPlayer;
  const PREFIX = 'tooku-no-mado-', MAX = 8, CHAT_MAX = 80;
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const R = { peer: null, role: null, code: '', myId: '', conns: new Map(), names: new Map(), host: null, leaving: false, log: [], rate: new Map() };
  const subs = new Set();
  const emit = () => subs.forEach(f => { try { f(state()); } catch (e) { console.warn(e); } });
  function state() { return { role: R.role, code: R.code, count: R.role ? R.names.size + 1 : 0, names: [...R.names.entries()], log: R.log.slice(), busy: R.busy || '' }; }

  /* ---------- PeerJS を必要になったときだけ読み込む ---------- */
  let loading = null;
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js';
      s.onload = () => window.Peer ? res() : rej(new Error('PeerJS が読み込めませんでした'));
      s.onerror = () => { loading = null; rej(new Error('PeerJS が読み込めませんでした（ネットにつながっているか確かめてください）')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  /* ---------- 送る・配る ---------- */
  const send = (c, m) => { try { if (c && c.open) c.send(m); } catch (e) {} };
  const toAll = (m, except) => { for (const [id, c] of R.conns) if (id !== except) send(c, m); };
  const nameOf = id => id === R.myId ? (AV.mine().name || 'あなた') : ((R.names.get(id) || {}).name || 'ななし');
  function addLog(id, text, sys) {
    R.log.push({ id, name: sys ? '' : nameOf(id), me: id === R.myId, text, sys: !!sys, at: Date.now() });
    if (R.log.length > 120) R.log.shift();
    if (!sys) AV.say(id === R.myId ? 'me' : id, text);
    emit(); window.dispatchEvent(new CustomEvent('tooku-chat', { detail: { sys } }));
  }
  // 1人あたりの送る回数を抑える（いたずら・暴走よけ）
  function allow(id, kind, perSec) {
    const k = id + kind, now = performance.now(), last = R.rate.get(k) || 0;
    if (now - last < 1000 / perSec) return false; R.rate.set(k, now); return true;
  }
  const cleanText = t => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, CHAT_MAX);

  /* ---------- ホスト ---------- */
  async function host() {
    if (R.role) return;
    R.busy = '部屋を作っています…'; emit();
    try { await loadPeer(); } catch (e) { R.busy = ''; emit(); throw e; }
    for (let tries = 0; tries < 4; tries++) {
      const code = Array.from({ length: 4 }, () => ABC[Math.random() * ABC.length | 0]).join('');
      try { await openHost(code); return; }
      catch (e) { if (e.type !== 'unavailable-id') { R.busy = ''; emit(); throw friendly(e); } }
    }
    R.busy = ''; emit(); throw new Error('部屋の番号が作れませんでした。もう一度ためしてください');
  }
  function openHost(code) {
    return new Promise((res, rej) => {
      const peer = new window.Peer(PREFIX + code, { debug: 0 });
      let opened = false;
      peer.on('open', id => {
        opened = true; R.peer = peer; R.role = 'host'; R.code = code; R.myId = id; R.busy = ''; R.leaving = false;
        addLog(R.myId, '部屋を作りました。番号を友だちに伝えてください', true); res();
      });
      peer.on('error', e => {
        if (!opened) { try { peer.destroy(); } catch (x) {} rej(e); return; }
        if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') toast('仲介サーバーとの接続が不安定です。つながっている人とはそのまま話せます');
      });
      peer.on('disconnected', () => { if (R.role === 'host' && !R.leaving) setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
      peer.on('connection', conn => {
        conn.on('open', () => {
          if (R.conns.size >= MAX - 1) { send(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; }
          R.conns.set(conn.peer, conn);
        });
        conn.on('data', d => fromGuest(conn, d));
        conn.on('close', () => dropGuest(conn.peer));
        conn.on('error', () => dropGuest(conn.peer));
      });
    });
  }
  function fromGuest(conn, d) {
    if (!d || typeof d !== 'object' || !R.conns.has(conn.peer)) return;
    const id = conn.peer;                                  // 名乗った id ではなく、実際の接続相手で区別する
    if (d.t === 'hello') {
      const a = AV.sanitize(d.a), isNew = !R.names.has(id);
      R.names.set(id, a); AV.setPerson(id, a);
      const members = { [R.myId]: AV.mineNet() }; for (const [k, v] of R.names) members[k] = AV.netOf(k) || v;
      send(conn, { t: 'welcome', you: id, host: R.myId, members, scene: ST.snapshot(), music: PL.syncState() });
      toAll({ t: 'me', id, a }, id);
      if (isNew) addLog(id, nameOf(id) + ' さんが来ました', true);
      emit();
    } else if (d.t === 'me' && R.names.has(id) && allow(id, 'me', 12)) {
      const a = AV.sanitize(d.a); R.names.set(id, a); AV.setPerson(id, a); toAll({ t: 'me', id, a }, id); emit();
    } else if (d.t === 'chat' && R.names.has(id) && allow(id, 'chat', 1.2)) {
      const text = cleanText(d.text); if (!text) return;
      toAll({ t: 'chat', id, text }, id); addLog(id, text);
    }
  }
  function dropGuest(id) {
    if (!R.conns.has(id)) return;
    const had = R.names.has(id), name = nameOf(id);
    R.conns.delete(id); R.names.delete(id); AV.removePerson(id);
    toAll({ t: 'bye', id });
    if (had) addLog(id, name + ' さんが出ました', true);
    emit();
  }

  /* ---------- 入る人 ---------- */
  async function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) throw new Error('部屋の番号は4文字です');
    if (R.role) return;
    R.busy = 'つないでいます…'; emit();
    try { await loadPeer(); } catch (e) { R.busy = ''; emit(); throw e; }
    return new Promise((res, rej) => {
      const peer = new window.Peer({ debug: 0 });
      let done = false;
      const fail = e => { if (done) return; done = true; try { peer.destroy(); } catch (x) {} R.busy = ''; emit(); rej(friendly(e)); };
      const timer = setTimeout(() => fail({ type: 'timeout' }), 20000);
      peer.on('error', e => { if (!done) { clearTimeout(timer); fail(e); } else if (e.type === 'network') toast('通信が不安定です'); });
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code, { reliable: true });
        conn.on('open', () => {
          send(conn, { t: 'hello', a: AV.mineNet() });
        });
        conn.on('data', d => {
          if (d && d.t === 'full') { clearTimeout(timer); fail({ type: 'full' }); return; }
          if (d && d.t === 'welcome' && !done) {
            done = true; clearTimeout(timer);
            R.peer = peer; R.role = 'guest'; R.code = code; R.host = conn; R.myId = String(d.you || peer.id); R.busy = ''; R.leaving = false;
            fromHost(d); addLog(R.myId, '部屋に入りました', true); res(); return;
          }
          if (done) fromHost(d);
        });
        conn.on('close', () => { if (done) hostLost(); });
      });
    });
  }
  function fromHost(d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'welcome') {
      for (const [id, a] of Object.entries(d.members || {})) if (id !== R.myId) { const s = AV.sanitize(a); R.names.set(id, s); AV.setPerson(id, s); }
      if (d.scene) ST.follow(d.scene);
      if (d.music) PL.follow(d.music);
      emit();
    } else if (d.t === 'me' && d.id && d.id !== R.myId) {
      const a = AV.sanitize(d.a), isNew = !R.names.has(d.id); R.names.set(d.id, a); AV.setPerson(d.id, a);
      if (isNew) addLog(d.id, nameOf(d.id) + ' さんが来ました', true); emit();
    } else if (d.t === 'bye' && d.id) {
      const name = nameOf(d.id); R.names.delete(d.id); AV.removePerson(d.id); addLog(d.id, name + ' さんが出ました', true); emit();
    } else if (d.t === 'chat' && d.id && d.id !== R.myId) {
      const text = cleanText(d.text); if (text) addLog(d.id, text);
    } else if (d.t === 'scene' && d.s) ST.follow(d.s);
    else if (d.t === 'music' && d.m) PL.follow(d.m);
  }
  function hostLost() {
    if (R.leaving || R.role !== 'guest') return;
    const code = R.code; cleanup();
    toast('ホストとの接続が切れました。番号はそのまま残しています');
    lastCode = code; emit();
  }

  /* ---------- 出る ---------- */
  function cleanup() {
    for (const id of R.names.keys()) AV.removePerson(id);
    R.names.clear(); R.conns.clear(); R.rate.clear();
    try { if (R.peer) R.peer.destroy(); } catch (e) {}
    R.peer = null; R.host = null; R.role = null; R.code = ''; R.busy = '';
    ST.unfollow(); PL.unfollow();
  }
  function leave() {
    if (!R.role) return;
    R.leaving = true;
    if (R.role === 'host') toAll({ t: 'bye', id: R.myId });
    cleanup(); R.log = []; emit();
  }
  window.addEventListener('pagehide', () => { if (R.role) { R.leaving = true; try { R.peer && R.peer.destroy(); } catch (e) {} } });

  /* ---------- 自分のことを伝える ---------- */
  function chat(text) {
    text = cleanText(text); if (!text || !R.role) return false;
    if (!allow('me', 'chat', 1.2)) { toast('少し待ってから送ってください'); return false; }
    if (R.role === 'host') toAll({ t: 'chat', id: R.myId, text }); else send(R.host, { t: 'chat', text });
    addLog(R.myId, text); return true;
  }
  // アバターが変わったら伝える。動かしている間も 0.15 秒ごとに送り、最後の位置は必ず届ける
  let meT = 0, meAt = 0;
  function sendMe() {
    meT = 0; meAt = performance.now();
    const a = AV.mineNet();
    if (R.role === 'host') toAll({ t: 'me', id: R.myId, a }); else send(R.host, { t: 'me', a });
  }
  // がんばるを押した・終えたときも伝える（経過時間は受け取った側で数える）
  if (window.TookuGanbaru) window.TookuGanbaru.on(() => { if (R.role && !meT) meT = setTimeout(sendMe, 150); });
  P.on('av', () => {
    if (!R.role || meT) return;
    const wait = Math.max(0, 150 - (performance.now() - meAt));
    meT = setTimeout(sendMe, wait);
  });
  // ホストの景色が変わったら配る（時計に合わせた時刻のずれも、ときどき直す）
  let scT = 0;
  const pushScene = () => { if (R.role === 'host') { clearTimeout(scT); scT = setTimeout(() => toAll({ t: 'scene', s: ST.snapshot() }), 300); } };
  ST.on(pushScene); setInterval(pushScene, 60000);
  // ホストの曲も配る：曲が変わった・止めた・流したときと、ずれ直しのために15秒ごと
  let muKey = '', muT = 0;
  const pushMusic = force => { if (R.role !== 'host') return; const m = PL.syncState(); if (!m) return; const k = m.id + m.family + m.playing; if (!force && k === muKey) return; muKey = k; clearTimeout(muT); muT = setTimeout(() => toAll({ t: 'music', m: PL.syncState() }), 150); };
  PL.on(() => pushMusic(false)); setInterval(() => pushMusic(true), 15000);

  /* ---------- わかりやすいエラー ---------- */
  function friendly(e) {
    const t = e && e.type;
    const msg = t === 'peer-unavailable' ? 'その番号の部屋が見つかりませんでした。番号と、ホストの画面が開いたままかを確かめてください'
      : t === 'full' ? '部屋がいっぱいです（' + MAX + '人まで）'
      : t === 'timeout' ? 'つながりませんでした。回線によっては直接つながらないことがあります。少し待ってもう一度ためしてください'
      : t === 'browser-incompatible' ? 'このブラウザは直接つながる機能（WebRTC）に対応していません'
      : t === 'network' || t === 'server-error' || t === 'socket-error' ? '仲介サーバーにつながりませんでした。ネットの接続を確かめてください'
      : (e && e.message) || 'つながりませんでした';
    const err = new Error(msg); err.type = t; return err;
  }
  function toast(t) { window.dispatchEvent(new CustomEvent('tooku-toast', { detail: t })); }
  let lastCode = '';

  window.TookuRoom = { host, join, leave, chat, state, on: f => { subs.add(f); return () => subs.delete(f); }, get lastCode() { return lastCode; }, MAX, CHAT_MAX };
})();
