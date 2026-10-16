(function(){
  const bc = () => new BroadcastChannel('peer-mock');
  class Conn { constructor(me, other){ this.me = me; this.peer = other; this.h = {}; this.open = false; }
    on(e, f){ (this.h[e] = this.h[e] || []).push(f); } emit(e, ...a){ (this.h[e] || []).forEach(f => f(...a)); }
    send(d){ this.me.ch.postMessage({ type: 'data', to: this.peer, from: this.me.id, d: JSON.parse(JSON.stringify(d)) }); } close(){} }
  class Peer { constructor(id, opts){ if (typeof id === 'object' || id === undefined) id = 'p' + Math.random().toString(36).slice(2, 8); this.id = id; this.h = {}; this.conns = {}; this.ch = bc();
      this.ch.onmessage = e => { const m = e.data; if (m.to !== this.id) return;
        if (m.type === 'connect') { const c = new Conn(this, m.from); this.conns[m.from] = c; this.emit('connection', c); setTimeout(() => { c.open = true; c.emit('open'); this.ch.postMessage({ type: 'accept', to: m.from, from: this.id }); }, 30); }
        else if (m.type === 'accept') { const c = this.conns[m.from]; if (c) { c.open = true; c.emit('open'); } }
        else if (m.type === 'data') { const c = this.conns[m.from]; if (c) c.emit('data', m.d); } };
      setTimeout(() => this.emit('open', this.id), 40); }
    connect(id){ const c = new Conn(this, id); this.conns[id] = c; this.ch.postMessage({ type: 'connect', to: id, from: this.id }); return c; }
    on(e, f){ (this.h[e] = this.h[e] || []).push(f); } emit(e, ...a){ (this.h[e] || []).forEach(f => f(...a)); } destroy(){ this.ch.close(); } reconnect(){} }
  window.Peer = Peer;
})();
