// WebRTC signalling + data-channel plumbing for the SFOTH client.
//
// The real server is the *offerer*: it opens two data channels ("state",
// unreliable/unordered, and "control", reliable) and hands the browser an SDP
// offer in the POST /api/guest/join response. The browser answers, the SCTP
// association comes up, and the client immediately runs a clock handshake on
// "control". We answer that handshake so the client reaches "connected".
//
// We do NOT reimplement the authoritative Bepu physics simulation or the v23
// snapshot *encoder* (those live in the un-shipped server-side .NET assemblies,
// not in this client bundle), so no gameplay snapshots flow on "state". The
// transport, signalling and clock are real.

import nodeDataChannel from 'node-datachannel';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeClockRequest, encodeClockResponse, opcodeOf, OP } from './protocol.js';
import { SimBridge } from './sim-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLOCK_HZ = 60; // client clock advances 0.06 ticks/ms == 60 ticks/s

export class GameServer {
  constructor({ iceServers, log = () => {} }) {
    this.iceServers = iceServers;
    this.log = log;
    this.sessions = new Map(); // session token -> session
    this.startTime = Date.now();
    this.nextPlayerId = 500 + Math.floor(Math.random() * 500);
    this.totalPlays = 0; // real join counter
    this.rooms = ['heights-91']; // one authoritative world
    this.fragId = 0;

    // The authoritative .NET simulation; snapshots are fragmented to every
    // connected player's unreliable "state" channel.
    this.sim = new SimBridge({
      refDir: path.resolve(__dirname, '..', 'SFOTH', 'reference'),
      log,
      onSnapshot: (snap) => this.broadcastSnapshot(snap),
    });
    this.sim.start();
  }

  // Switch the authoritative world to a different map's reference directory.
  reloadMap(refDir) {
    if (!this.sim) return false;
    return this.sim.restart(refDir);
  }

  // Current authoritative tick — follows the simulation when it is running.
  serverTick() {
    if (this.sim && this.sim.lastTick > 0) return this.sim.lastTick;
    return Math.max(0, Math.round((Date.now() - this.startTime) * (CLOCK_HZ / 1000)));
  }

  // Wrap an op-2/11 snapshot in the v23 transport envelope (opcode 8, full
  // keyframe), then fragment (op3, <=1000-byte payloads) and push to everyone.
  broadcastSnapshot(snap) {
    const innerLen = snap.length;
    if (innerLen < 12 || innerLen > 65535) return;
    const id = (this.fragId = (this.fragId + 1) >>> 0);

    // transport envelope: [18003,23,8, mode=0, 0,0,0, frameId, baselineId=0, uLen, cLen=0, inner]
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
    let sent = 0;
    for (const rec of this.sessions.values()) {
      if (rec.closed || !rec.state) continue;
      try {
        if (!rec.state.isOpen || rec.state.isOpen()) { for (const f of frags) rec.state.sendMessageBinary(f); sent++; }
      } catch (e) { if (!this._warned) { this._warned = true; this.log('[snap] send error: ' + e.message); } }
    }
    this._bn = (this._bn || 0) + 1;
    if (this._bn % 120 === 1) this.log(`[snap] broadcast #${this._bn} ${total}B x${count} frags -> ${sent} peers`);
  }

  pickRoom(requested) {
    if (requested && this.rooms.includes(requested)) return requested;
    // place the player in the emptiest room
    const counts = Object.fromEntries(this.rooms.map((r) => [r, 0]));
    for (const s of this.sessions.values()) if (counts[s.roomId] != null) counts[s.roomId]++;
    return this.rooms.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
  }

  // Live lobby view built from the actually-connected players.
  lobby(limit = 15) {
    const byRoom = new Map(this.rooms.map((r) => [r, []]));
    for (const s of this.sessions.values()) {
      if (s.closed) continue;
      const list = byRoom.get(s.roomId) || byRoom.set(s.roomId, []).get(s.roomId);
      list.push({ nickname: s.nickname, bot: false, id: s.playerId });
    }
    let humans = 0;
    const rooms = this.rooms.map((id) => {
      const players = byRoom.get(id) || [];
      humans += players.length;
      return { id, available: players.length < limit, fresh: true, humans: players.length, bots: 0, players };
    });
    return { fresh: true, humans, bots: 0, playerLimit: limit, players: rooms.flatMap((r) => r.players), rooms };
  }

  // Create a peer connection as the offerer and gather a complete SDP offer.
  async join({ nickname, roomId: requestedRoom }) {
    const session = crypto.randomBytes(32).toString('hex');
    const playerId = this.nextPlayerId++;
    const roomId = this.pickRoom(requestedRoom);
    this.totalPlays++;

    const pc = new nodeDataChannel.PeerConnection(`sfoth-${playerId}`, {
      iceServers: this.iceServers,
    });

    const record = {
      session,
      playerId,
      roomId,
      nickname,
      pc,
      state: null,
      control: null,
      clockReplies: 0,
      createdAt: Date.now(),
      closed: false,
    };
    this.sessions.set(session, record);

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
      this.sim.join(playerId); // spawn the player in the authoritative world
      this.announcePlayer(record); // nametag + scoreboard names
      this.log(`[rtc ${playerId}] joined simulation`);
    });
    state.onMessage((msg) => this.onStateMessage(record, msg));

    // "control": reliable, ordered channel. The client runs the clock here.
    const control = pc.createDataChannel('control', {});
    record.control = control;
    control.onOpen(() => this.log(`[rtc ${playerId}] control open`));
    control.onMessage((msg) => this.onControlMessage(record, msg));

    const sdp = await this.gatherOffer(pc, playerId);

    return {
      session,
      roomId,
      nickname,
      playerId,
      sdp,
      type: 'offer',
      protocol: 23,
      playerLimit: 15,
      member: true,
      botLevel: 0,
    };
  }

  // Wait for ICE gathering to finish, then return the full offer SDP
  // (with candidates and a=end-of-candidates), matching the real server.
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
      // Creating the data channels above already kicked off negotiation; make
      // sure a local description exists even on older binaries.
      try {
        if (typeof pc.setLocalDescription === 'function') pc.setLocalDescription();
      } catch {
        /* already generating */
      }
      if (pc.gatheringState && pc.gatheringState() === 'complete') finish();
      setTimeout(finish, 2500); // localhost gathers fast; cap the wait
    });
  }

  // Apply the browser's SDP answer.
  answer(session, sdp) {
    const rec = this.sessions.get(session);
    if (!rec || rec.closed) return false;
    rec.pc.setRemoteDescription(sdp, 'answer');
    this.log(`[rtc ${rec.playerId}] answer applied`);
    return true;
  }

  onControlMessage(rec, msg) {
    if (!Buffer.isBuffer(msg)) return; // text frames (e.g. client chat) ignored
    const req = decodeClockRequest(msg);
    if (req) {
      const reply = encodeClockResponse(req.id, req.sentAt, this.serverTick());
      try {
        rec.control.sendMessageBinary(reply);
        rec.clockReplies++;
        if (rec.clockReplies === 1) this.log(`[rtc ${rec.playerId}] clock synced`);
      } catch {
        /* channel closing */
      }
      return;
    }
    const op = opcodeOf(msg);
    if (op === OP.INPUT) { this.sim.input(rec.playerId, msg); return; } // reliable action inputs
    // Non-framed control messages are JSON (chat, emote, ...).
    if (msg.length && msg[0] === 0x7b) {
      let j;
      try { j = JSON.parse(msg.toString('utf8')); } catch { return; }
      if (!j) return;
      if (j.kind === 'chat' && typeof j.text === 'string') this.sendChat(rec, j.text);
      else if (j.kind === 'emote' && typeof j.variant === 'string') {
        // Relay the emote to everyone so the dance plays on all clients.
        // "life" must equal the player's authoritative generation or the client
        // cancels the emote immediately.
        const life = this.sim.generation(rec.playerId);
        const out = { kind: 'emote', id: rec.playerId, variant: j.variant.slice(0, 16), life };
        this.log(`[emote] ${rec.nickname} -> ${j.variant} (life=${life})`);
        this.broadcastControlJson(out);
      } else {
        this.log(`[control-json] ${rec.playerId}: ${JSON.stringify(j).slice(0, 80)}`);
      }
    }
  }

  // Control-channel JSON messages (roster, emote, ...) are sent as binary.
  sendControlJson(rec, obj) {
    if (!rec || rec.closed || !rec.control) return;
    try { if (!rec.control.isOpen || rec.control.isOpen()) rec.control.sendMessageBinary(Buffer.from(JSON.stringify(obj), 'utf8')); } catch { /* closing */ }
  }

  broadcastControlJson(obj) {
    for (const rec of this.sessions.values()) if (!rec.closed) this.sendControlJson(rec, obj);
  }

  // Announce a player's nickname so nametags and the scoreboard are correct.
  announcePlayer(rec) {
    const info = (r) => ({ kind: 'player', id: r.playerId, nickname: r.nickname || 'Guest', bot: false, botLevel: 0 });
    this.broadcastControlJson(info(rec));                       // tell everyone about the joiner
    for (const other of this.sessions.values()) {              // tell the joiner about everyone
      if (other.joinedSim && other !== rec) this.sendControlJson(rec, info(other));
    }
  }

  // Broadcast a chat line to every player as a binary "SHAT" packet.
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
    for (const rec of this.sessions.values()) {
      if (rec.closed || !rec.control) continue;
      try { if (!rec.control.isOpen || rec.control.isOpen()) rec.control.sendMessageBinary(pkt); } catch { /* closing */ }
    }
    this.log(`[chat] ${sender.nickname}: ${text}`);
  }

  onStateMessage(rec, msg) {
    if (!Buffer.isBuffer(msg)) return;
    const op = opcodeOf(msg);
    if (op === OP.INPUT) { this.sim.input(rec.playerId, msg); return; } // movement inputs
    if (op === OP.SNAPSHOT_ACK) return; // client acking snapshots
  }

  destroy(session) {
    const rec = this.sessions.get(session);
    if (!rec || rec.closed) return;
    rec.closed = true;
    this.sessions.delete(session);
    if (rec.joinedSim) try { this.sim.leave(rec.playerId); } catch {}
    try { rec.control && rec.control.close(); } catch {}
    try { rec.state && rec.state.close(); } catch {}
    try { rec.pc.close(); } catch {}
    this.log(`[rtc ${rec.playerId}] destroyed`);
  }

  leave(session) {
    this.destroy(session);
  }

  shutdown() {
    for (const session of [...this.sessions.keys()]) this.destroy(session);
    try { this.sim && this.sim.stop(); } catch {}
    try { nodeDataChannel.cleanup(); } catch {}
  }
}
