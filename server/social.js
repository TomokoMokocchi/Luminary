// Friends + direct messaging, identified by the per-browser KEY (not by name,
// since names aren't unique). Each user is keyed by the salted hash of their
// lum_key and gets a stable, shareable friend code derived from it. Friendships
// are mutual (request -> accept). DMs are stored per pair. Everything persists
// to a small JSON file so it survives restarts.

import fs from 'node:fs';
import fsp from 'node:fs/promises';

const ONLINE_MS = 70 * 1000;
const MAX_HISTORY = 300;

export class SocialStore {
  constructor({ storeFile, log = () => {} }) {
    this.storeFile = storeFile;
    this.log = log;
    this.users = new Map();   // hash -> user
    this.byCode = new Map();  // CODE -> hash
    this._saveTimer = null;
    this._load();
  }

  _load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.storeFile, 'utf8'));
      for (const u of raw.users || []) {
        this.users.set(u.hash, u);
        this.byCode.set(u.code, u.hash);
      }
      this.log(`[social] loaded ${this.users.size} user(s)`);
    } catch { /* no store yet */ }
  }
  _persist() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const data = { users: [...this.users.values()] };
      fsp.writeFile(this.storeFile, JSON.stringify(data)).catch((e) => this.log('[social] persist: ' + e.message));
    }, 400);
  }

  // A random, shareable friend code — DELIBERATELY unrelated to the user's
  // ownership key (hash). The key must never be derivable from anything public:
  // it authorizes editing/deleting that user's maps, so leaking it (even a slice
  // of its hash) would let someone impersonate them. The code is just a public
  // handle; it reveals nothing about the key.
  _newCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    for (;;) {
      let c = '';
      for (let i = 0; i < 8; i++) c += A[Math.floor(Math.random() * A.length)];
      c = c.slice(0, 4) + '-' + c.slice(4);
      if (!this.byCode.has(c)) return c;
    }
  }

  ensure(hash, name) {
    let u = this.users.get(hash);
    if (!u) {
      u = { hash, name: (name || 'Player').slice(0, 20), code: this._newCode(), friends: [], incoming: [], outgoing: [], dms: {}, lastSeen: 0 };
      this.users.set(hash, u);
      this.byCode.set(u.code, hash);
    }
    if (name) u.name = name.slice(0, 20);
    u.lastSeen = Date.now();
    return u;
  }
  online(u) { return u && (Date.now() - u.lastSeen) < ONLINE_MS; }
  _resolve(code) { return this.byCode.get(String(code || '').toUpperCase().trim().replace(/\s/g, '')); }

  view(u) {
    const friend = (h) => { const f = this.users.get(h); return f ? { code: f.code, name: f.name, online: this.online(f), unread: (u.dms[h] || []).filter((m) => !m.readByMe).length } : null; };
    return {
      code: u.code, name: u.name,
      friends: u.friends.map(friend).filter(Boolean).sort((a, b) => (b.online - a.online) || (b.unread - a.unread)),
      incoming: u.incoming.map((h) => { const f = this.users.get(h); return f ? { code: f.code, name: f.name } : null; }).filter(Boolean),
      unreadTotal: u.friends.reduce((s, h) => s + (u.dms[h] || []).filter((m) => !m.readByMe).length, 0),
    };
  }

  sync(hash, name) { const u = this.ensure(hash, name); this._persist(); return this.view(u); }

  add(hash, code, name) {
    const target = this._resolve(code);
    if (!target) return { status: 'notfound' };
    if (target === hash) return { status: 'self' };
    const me = this.ensure(hash, name), them = this.users.get(target);
    if (me.friends.includes(target)) return { status: 'friends' };
    if (me.incoming.includes(target)) return this.accept(hash, code, name); // they already asked
    if (!me.outgoing.includes(target)) me.outgoing.push(target);
    if (!them.incoming.includes(hash)) them.incoming.push(hash);
    this._persist();
    return { status: 'requested' };
  }
  accept(hash, code, name) {
    const target = this._resolve(code);
    if (!target) return { status: 'notfound' };
    const me = this.ensure(hash, name), them = this.users.get(target);
    me.incoming = me.incoming.filter((h) => h !== target); me.outgoing = me.outgoing.filter((h) => h !== target);
    them.incoming = them.incoming.filter((h) => h !== hash); them.outgoing = them.outgoing.filter((h) => h !== hash);
    if (!me.friends.includes(target)) me.friends.push(target);
    if (!them.friends.includes(hash)) them.friends.push(hash);
    this._persist();
    return { status: 'friends' };
  }
  remove(hash, code) {
    const target = this._resolve(code);
    if (!target) return { status: 'notfound' };
    const me = this.users.get(hash), them = this.users.get(target);
    if (me) { me.friends = me.friends.filter((h) => h !== target); me.incoming = me.incoming.filter((h) => h !== target); me.outgoing = me.outgoing.filter((h) => h !== target); }
    if (them) { them.friends = them.friends.filter((h) => h !== hash); them.incoming = them.incoming.filter((h) => h !== hash); them.outgoing = them.outgoing.filter((h) => h !== hash); }
    this._persist();
    return { status: 'removed' };
  }

  dm(hash, code, text, name) {
    const target = this._resolve(code);
    if (!target) return { error: 'notfound' };
    const me = this.ensure(hash, name), them = this.users.get(target);
    if (!me.friends.includes(target)) return { error: 'not friends' };
    text = String(text || '').slice(0, 500);
    if (!text.trim()) return { error: 'empty' };
    const ts = Date.now();
    (me.dms[target] = me.dms[target] || []).push({ from: hash, text, ts, readByMe: true });
    (them.dms[hash] = them.dms[hash] || []).push({ from: hash, text, ts, readByMe: false });
    if (me.dms[target].length > MAX_HISTORY) me.dms[target] = me.dms[target].slice(-MAX_HISTORY);
    if (them.dms[hash].length > MAX_HISTORY) them.dms[hash] = them.dms[hash].slice(-MAX_HISTORY);
    this._persist();
    return { ok: true };
  }
  history(hash, code, name) {
    const target = this._resolve(code);
    if (!target) return null;
    const me = this.ensure(hash, name);
    const arr = me.dms[target] || [];
    let changed = false;
    for (const m of arr) if (!m.readByMe) { m.readByMe = true; changed = true; }
    if (changed) this._persist();
    return arr.map((m) => ({ mine: m.from === hash, text: m.text, ts: m.ts }));
  }
}
