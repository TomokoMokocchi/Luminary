// WebRTC signalling + data-channel plumbing for the SFOTH client, with
// multi-server / multi-map support.
//
// The real server is the *offerer*: it opens two data channels ("state",
// unreliable/unordered, and "control", reliable) and hands the browser an SDP
// offer in the POST /api/guest/join response. The browser answers, the SCTP
// association comes up, and the client immediately runs a clock handshake on
// "control". We answer that handshake so the client reaches "connected".
//
// SERVERS
//   The world is no longer a single room. Every map can have one or more live
//   server *instances*, named server-1, server-2, ... (a single global counter,
//   so names never collide). A player joins an instance of the map they picked;
//   when every instance for that map is full a fresh one is started on demand,
//   and an instance is torn down the moment it empties. Each instance owns its
//   own authoritative simulation bound to that map's reference directory.
//
// We do NOT reimplement the authoritative Bepu physics simulation or the v23
// snapshot *encoder* (those live in the un-shipped server-side .NET assemblies,
// not in this client bundle). When the .NET runtime is unavailable the sim is
// simply off and no gameplay snapshots flow on "state" — transport, signalling,
// the clock and the roster are still real and the client reaches "connected".

import nodeDataChannel from 'node-datachannel';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeClockRequest, encodeClockResponse, opcodeOf, OP } from './protocol.js';
import { SimBridge } from './sim-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLOCK_HZ = 60; // client clock advances 0.06 ticks/ms == 60 ticks/s

export class GameServer {
  // resolveRefDir(mapId) -> Promise<string>  (map's reference directory)
  // onPlay(mapId)        -> void             (bump the map's play counter)
  constructor({ iceServers, log = () => {}, playerLimit = 15, resolveRefDir, onPlay } = {}) {
    this.iceServers = iceServers;
    this.log = log;
    this.playerLimit = playerLimit;
    this.resolveRefDir = resolveRefDir || (async () => path.resolve(__dirname, '..', 'SFOTH', 'reference'));
    this.onPlay = onPlay || (() => {});

    this.sessions = new Map();   // session token -> session record
    this.instances = new Map();  // roomId ("server-N") -> instance
    this.presence = new Map();   // playerId -> { appearance, code, name, room, mapId }
    this.startTime = Date.now();
    this.nextPlayerId = 500 + Math.floor(Math.random() * 500);
    this.totalPlays = 0;         // real join counter
    this.fragId = 0;
  }

  // ---------------------------------------------------------------------------
  // instances
  // ---------------------------------------------------------------------------
  // Names reflect how many servers are actually running: pick the lowest free
  // number, so when server-2 closes and a new server is needed it becomes
  // server-2 again (we never renumber a running server).
  _nextServerNum() {
    let n = 1;
    while (this.instances.has('server-' + n)) n++;
    return n;
  }

  _createInstance(mapId) {
    const id = 'server-' + this._nextServerNum();
    const inst = {
      id,
      mapId: mapId || 'heights',
      players: new Set(),     // session tokens
      sim: null,
      simStarted: false,
      createdAt: Date.now(),
    };
    this.instances.set(id, inst);
    this.log(`[server] started ${id} (map=${inst.mapId})`);
    return inst;
  }

  _ensureSim(inst) {
    if (inst.simStarted) return;
    inst.simStarted = true;
    inst.sim = new SimBridge({
      refDir: path.resolve(__dirname, '..', 'SFOTH', 'reference'),
      log: (...a) => this.log(`[${inst.id}]`, ...a),
      onSnapshot: (snap) => this.broadcastSnapshot(inst, snap),
    });
    // bind the map's reference directory, then start
    Promise.resolve(this.resolveRefDir(inst.mapId))
      .then((refDir) => { if (refDir) inst.sim.refDir = refDir; inst.sim.start(); })
      .catch((e) => { this.log(`[${inst.id}] sim start failed: ${e.message}`); try { inst.sim.start(); } catch {} });
  }

  _closeInstance(inst) {
    if (!this.instances.has(inst.id)) return;
    this.instances.delete(inst.id);
    try { inst.sim && inst.sim.stop(); } catch {}
    this.log(`[server] closed ${inst.id} (map=${inst.mapId}) — empty`);
  }

  // Pick (or create) an instance for a map. If roomId names a concrete,
  // joinable instance of the same map, reuse it; otherwise spill to the first
  // non-full instance of that map, or start a brand-new one.
  _allocate(mapId, roomId) {
    mapId = mapId || 'heights';
    if (roomId && this.instances.has(roomId)) {
      const want = this.instances.get(roomId);
      if (want.mapId === mapId && want.players.size < this.playerLimit) return want;
    }
    for (const inst of this.instances.values()) {
      if (inst.mapId === mapId && inst.players.size < this.playerLimit) return inst;
    }
    return this._createInstance(mapId);
  }

  // Public view of the servers hosting a given map (for the server browser).
  serverList(mapId) {
    mapId = mapId || 'heights';
    const servers = [];
    for (const inst of this.instances.values()) {
      if (inst.mapId !== mapId) continue;
      const humans = inst.players.size;
      servers.push({ id: inst.id, mapId, humans, playerLimit: this.playerLimit, available: humans < this.playerLimit });
    }
    servers.sort((a, b) => (a.id < b.id ? -1 : 1));
    return { mapId, playerLimit: this.playerLimit, servers };
  }

  // Parse the client's roomId field. Supported forms:
  //   "server-N"   -> a concrete instance (its map is used)
  //   "map:<id>"   -> any instance of that map (allocate/spill)
  //   undefined    -> fall back to the supplied default map (cookie / heights)
  _resolveTarget(roomId, defaultMapId) {
    let mapId = defaultMapId || 'heights';
    let wantRoom = null;
    const r = (roomId == null ? '' : String(roomId)).trim();
    if (r.startsWith('map:')) {
      mapId = r.slice(4) || 'heights';
    } else if (/^server-\d+$/.test(r)) {
      wantRoom = r;
      const inst = this.instances.get(r);
      if (inst) mapId = inst.mapId; // keep the instance's own map
    }
    return { mapId, wantRoom };
  }

  // Current authoritative tick for an instance — ALWAYS the sim's own tick (on
  // the sim's epoch), interpolated between snapshots, and 0 before the sim has
  // produced any. Never a boot-relative estimate: mixing epochs makes the
  // client's prediction snap across a huge gap and fling the character.
  serverTick(inst) {
    return inst && inst.sim ? inst.sim.currentTick() : 0;
  }

  // Wrap an op-2/11 snapshot in the v23 transport envelope (opcode 8, full
  // keyframe), fragment it (op3, <=1000-byte payloads) and push to this
  // instance's players only.
  broadcastSnapshot(inst, snap) {
    const innerLen = snap.length;
    if (innerLen < 12 || innerLen > 65535) return;
    const id = (this.fragId = (this.fragId + 1) >>> 0);

    const transport = Buffer.alloc(20 + innerLen);
    transport.writeUInt16LE(18003, 0);
    transport.writeUInt8(23, 2);
    transport.writeUInt8(8, 3);
    transport.writeUInt8(0, 4);          // mode 0 = full keyframe
    transport.writeUInt32LE(id, 8);      // frameId (must match fragment id)
    transport.writeUInt32LE(0, 12);      // baselineId (0 for full)
    transport.writeUInt16LE(innerLen, 16); // uncompressed length
    transport.writeUInt16LE(0, 18);      // compressed length (0 for full)
    snap.copy(transport, 20);

    const total = transport.length;
    const count = Math.ceil(total / 1000);
    const frags = [];
    for (let i = 0; i < count; i++) {
      const start = i * 1000;
      const end = Math.min(total, start + 1000);
      const frag = Buffer.alloc(12 + (end - start));
      frag.writeUInt16LE(18003, 0);
      frag.writeUInt8(23, 2);
      frag.writeUInt8(3, 3); // fragment opcode
      frag.writeUInt32LE(id, 4);
      frag.writeUInt8(i, 8);
      frag.writeUInt8(count, 9);
      frag.writeUInt16LE(total, 10);
      transport.copy(frag, 12, start, end);
      frags.push(frag);
    }
    for (const session of inst.players) {
      const rec = this.sessions.get(session);
      if (!rec || rec.closed || !rec.state) continue;
      try {
        if (!rec.state.isOpen || rec.state.isOpen()) for (const f of frags) rec.state.sendMessageBinary(f);
      } catch (e) { if (!this._warned) { this._warned = true; this.log('[snap] send error: ' + e.message); } }
    }
  }

  // --- player presence: appearance (for in-game avatars) + social code -----
  setPresence(session, data) {
    const rec = this.sessions.get(session);
    if (!rec || rec.closed) return false;
    this.presence.set(rec.playerId, {
      appearance: data.appearance || null,
      code: (data.code || '').toString().slice(0, 12),
      name: rec.nickname,
      room: rec.roomId,
      mapId: rec.mapId,
    });
    return true;
  }
  // { playerId: { appearance, code, name } } for players (optionally one room).
  presenceView(room) {
    const out = {};
    for (const [pid, p] of this.presence) {
      if (room && p.room !== room) continue;
      out[pid] = { appearance: p.appearance, code: p.code, name: p.name };
    }
    return out;
  }
  // Where is the player with this social code right now? (for "join a friend")
  presenceByCode(code) {
    if (!code) return null;
    for (const p of this.presence.values()) if (p.code === code) return p;
    return null;
  }

  // Live lobby view built from every connected player, grouped by instance.
  lobby(limit = this.playerLimit) {
    const rooms = [];
    let humans = 0;
    for (const inst of this.instances.values()) {
      const players = [];
      for (const session of inst.players) {
        const s = this.sessions.get(session);
        if (!s || s.closed) continue;
        players.push({ nickname: s.nickname, bot: false, id: s.playerId });
      }
      humans += players.length;
      rooms.push({
        id: inst.id, mapId: inst.mapId, available: players.length < limit,
        fresh: true, humans: players.length, bots: 0, players,
      });
    }
    rooms.sort((a, b) => (a.id < b.id ? -1 : 1));
    return { fresh: true, humans, bots: 0, playerLimit: limit, players: rooms.flatMap((r) => r.players), rooms };
  }

  // Create a peer connection as the offerer and gather a complete SDP offer.
  async join({ nickname, roomId, mapId }) {
    const target = this._resolveTarget(roomId, mapId);
    const inst = this._allocate(target.mapId, target.wantRoom);

    const session = crypto.randomBytes(32).toString('hex');
    const playerId = this.nextPlayerId++;
    this.totalPlays++;
    this.onPlay(inst.mapId);

    const pc = new nodeDataChannel.PeerConnection(`sfoth-${playerId}`, { iceServers: this.iceServers });

    const record = {
      session, playerId, roomId: inst.id, mapId: inst.mapId, nickname,
      pc, state: null, control: null, clockReplies: 0,
      createdAt: Date.now(), closed: false, joinedSim: false, inst,
    };
    this.sessions.set(session, record);
    inst.players.add(session);
    this._ensureSim(inst);

    pc.onStateChange((s) => {
      this.log(`[rtc ${playerId}] connection ${s}`);
      if (s === 'closed' || s === 'failed' || s === 'disconnected') this.destroy(session);
    });
    pc.onDataChannel((dc) => this.log(`[rtc ${playerId}] remote channel ${dc.getLabel()}`));

    // "state": unreliable, unordered snapshot channel.
    const state = pc.createDataChannel('state', { unordered: true, maxRetransmits: 0 });
    record.state = state;
    state.onOpen(() => {
      if (record.closed || record.joinedSim) return;
      record.joinedSim = true;
      try { inst.sim && inst.sim.join(playerId); } catch {}
      this.announcePlayer(record);
      this.log(`[rtc ${playerId}] joined ${inst.id}`);
    });
    state.onMessage((msg) => this.onStateMessage(record, msg));

    // "control": reliable, ordered channel. The client runs the clock here.
    const control = pc.createDataChannel('control', {});
    record.control = control;
    control.onOpen(() => this.log(`[rtc ${playerId}] control open`));
    control.onMessage((msg) => this.onControlMessage(record, msg));

    // Reap a session that signals but never actually opens its data channels
    // (e.g. a client that aborts, or a probe) so its instance does not linger
    // empty forever.
    record.connectTimer = setTimeout(() => {
      if (!record.closed && !record.joinedSim) {
        this.log(`[rtc ${playerId}] never connected — reaping`);
        this.destroy(session);
      }
    }, 45000);

    let sdp;
    try {
      sdp = await this.gatherOffer(pc, playerId);
    } catch (e) {
      this.destroy(session); // removes the player and closes the instance if empty
      throw e;
    }

    return {
      session,
      roomId: inst.id,
      mapId: inst.mapId,
      nickname,
      playerId,
      sdp,
      type: 'offer',
      protocol: 23,
      playerLimit: this.playerLimit,
      member: true,
      botLevel: 0,
    };
  }

  gatherOffer(pc, playerId) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        const ld = pc.localDescription();
        resolve(ld ? ld.sdp : '');
      };
      pc.onGatheringStateChange((s) => {
        this.log(`[rtc ${playerId}] gathering ${s}`);
        if (s === 'complete') finish();
      });
      try { if (typeof pc.setLocalDescription === 'function') pc.setLocalDescription(); } catch {}
      if (pc.gatheringState && pc.gatheringState() === 'complete') finish();
      setTimeout(finish, 2500);
    });
  }

  answer(session, sdp) {
    const rec = this.sessions.get(session);
    if (!rec || rec.closed) return false;
    rec.pc.setRemoteDescription(sdp, 'answer');
    this.log(`[rtc ${rec.playerId}] answer applied`);
    return true;
  }

  onControlMessage(rec, msg) {
    if (!Buffer.isBuffer(msg)) return;
    const req = decodeClockRequest(msg);
    if (req) {
      const reply = encodeClockResponse(req.id, req.sentAt, this.serverTick(rec.inst));
      try {
        rec.control.sendMessageBinary(reply);
        rec.clockReplies++;
        if (rec.clockReplies === 1) this.log(`[rtc ${rec.playerId}] clock synced`);
      } catch {}
      return;
    }
    const op = opcodeOf(msg);
    if (op === OP.INPUT) { try { rec.inst.sim && rec.inst.sim.input(rec.playerId, msg); } catch {} return; }
    if (msg.length && msg[0] === 0x7b) {
      let j;
      try { j = JSON.parse(msg.toString('utf8')); } catch { return; }
      if (!j) return;
      if (j.kind === 'chat' && typeof j.text === 'string') this.sendChat(rec, j.text);
      else if (j.kind === 'emote' && typeof j.variant === 'string') {
        const life = rec.inst.sim ? rec.inst.sim.generation(rec.playerId) : 1;
        const out = { kind: 'emote', id: rec.playerId, variant: j.variant.slice(0, 16), life };
        this.broadcastControlJson(rec.inst, out);
      }
    }
  }

  sendControlJson(rec, obj) {
    if (!rec || rec.closed || !rec.control) return;
    try { if (!rec.control.isOpen || rec.control.isOpen()) rec.control.sendMessageBinary(Buffer.from(JSON.stringify(obj), 'utf8')); } catch {}
  }

  broadcastControlJson(inst, obj) {
    for (const session of inst.players) {
      const rec = this.sessions.get(session);
      if (rec && !rec.closed) this.sendControlJson(rec, obj);
    }
  }

  announcePlayer(rec) {
    const info = (r) => ({ kind: 'player', id: r.playerId, nickname: r.nickname || 'Guest', bot: false, botLevel: 0 });
    this.broadcastControlJson(rec.inst, info(rec));           // tell everyone in the room about the joiner
    for (const session of rec.inst.players) {                 // tell the joiner about everyone in the room
      const other = this.sessions.get(session);
      if (other && other.joinedSim && other !== rec) this.sendControlJson(rec, info(other));
    }
  }

  sendChat(sender, text) {
    text = String(text).trim().slice(0, 180);
    if (!text) return;
    const nick = Buffer.from((sender.nickname || 'Guest').slice(0, 40), 'utf8');
    const body = Buffer.from(text, 'utf8');
    const pkt = Buffer.alloc(14 + nick.length + body.length);
    pkt.writeUInt32BE(1397113672, 0); // "SHAT"
    pkt.writeInt32LE((this.chatSeq = (this.chatSeq || 0) + 1), 4);
    pkt.writeInt32LE(sender.playerId, 8);
    pkt.writeUInt16LE(nick.length, 12);
    nick.copy(pkt, 14);
    body.copy(pkt, 14 + nick.length);
    for (const session of sender.inst.players) {
      const rec = this.sessions.get(session);
      if (!rec || rec.closed || !rec.control) continue;
      try { if (!rec.control.isOpen || rec.control.isOpen()) rec.control.sendMessageBinary(pkt); } catch {}
    }
    this.log(`[chat ${sender.inst.id}] ${sender.nickname}: ${text}`);
  }

  onStateMessage(rec, msg) {
    if (!Buffer.isBuffer(msg)) return;
    const op = opcodeOf(msg);
    if (op === OP.INPUT) { try { rec.inst.sim && rec.inst.sim.input(rec.playerId, msg); } catch {} return; }
    if (op === OP.SNAPSHOT_ACK) return;
  }

  destroy(session) {
    const rec = this.sessions.get(session);
    if (!rec || rec.closed) return;
    rec.closed = true;
    if (rec.connectTimer) { clearTimeout(rec.connectTimer); rec.connectTimer = null; }
    this.sessions.delete(session);
    this.presence.delete(rec.playerId);
    const inst = rec.inst;
    if (inst) {
      inst.players.delete(session);
      if (rec.joinedSim) try { inst.sim && inst.sim.leave(rec.playerId); } catch {}
    }
    try { rec.control && rec.control.close(); } catch {}
    try { rec.state && rec.state.close(); } catch {}
    try { rec.pc.close(); } catch {}
    this.log(`[rtc ${rec.playerId}] destroyed`);
    // tear the instance down once it empties
    if (inst && inst.players.size === 0) this._closeInstance(inst);
  }

  leave(session) { this.destroy(session); }

  shutdown() {
    for (const session of [...this.sessions.keys()]) this.destroy(session);
    for (const inst of [...this.instances.values()]) this._closeInstance(inst);
    try { nodeDataChannel.cleanup(); } catch {}
  }
}
