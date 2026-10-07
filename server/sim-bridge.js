// Bridge to the authoritative .NET simulation host (sim/SimHost.dll).
//
// Spawns the SimHost child process, forwards join/leave/input commands, and
// emits each authoritative v23 snapshot it produces. Framing is a 4-byte LE
// length prefix in both directions.

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locate the .NET 10 runtime (the SimHost needs it). Override with SFOTH_DOTNET.
function findDotnet() {
  if (process.env.SFOTH_DOTNET && fs.existsSync(process.env.SFOTH_DOTNET)) return process.env.SFOTH_DOTNET;
  const candidates = [
    path.join(process.env.HOME || '', '.dotnet', 'dotnet'),
    '/usr/bin/dotnet',
    '/usr/local/bin/dotnet',
    '/tmp/claude-1000/-home-ray-AI-shit/e0b96088-8708-4f04-b0bf-cb6738631adf/scratchpad/dotnet/dotnet',
  ];
  return candidates.find((c) => { try { return fs.existsSync(c); } catch { return false; } });
}

export class SimBridge {
  constructor({ refDir, log = () => {}, onSnapshot }) {
    this.refDir = refDir;
    this.log = log;
    this.onSnapshot = onSnapshot;
    this.proc = null;
    this.buf = Buffer.alloc(0);
    this.lastTick = 0;
    this.generations = new Map(); // playerId -> character generation
    this.ready = false;
  }

  start() {
    const dotnet = findDotnet();
    const dll = path.join(__dirname, 'sim', 'bin', 'Release', 'net10.0', 'SimHost.dll');
    if (!dotnet || !fs.existsSync(dll)) {
      this.log(`[sim] disabled (dotnet=${dotnet} dll=${fs.existsSync(dll)}) — gameplay snapshots off`);
      return false;
    }
    this.proc = spawn(dotnet, [dll, this.refDir], {
      stdio: ['pipe', 'pipe', 'pipe'],
      // SFOTH_FULL=1 -> full snapshots (players + platforms + tools + world physics)
      env: { ...process.env, DOTNET_ROOT: path.dirname(dotnet), SFOTH_FULL: process.env.SFOTH_FULL ?? '1' },
    });
    this.ready = true;
    this.proc.stdout.on('data', (c) => this.onData(c));
    this.proc.stderr.on('data', (c) => this.log('[sim] ' + c.toString().trimEnd()));
    this.proc.on('exit', (code) => { this.ready = false; this.log(`[sim] exited ${code}`); });
    this.log('[sim] simulation host started');
    return true;
  }

  onData(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    while (this.buf.length >= 4) {
      const n = this.buf.readUInt32LE(0);
      if (this.buf.length < 4 + n) break;
      const payload = this.buf.subarray(4, 4 + n);
      this.buf = this.buf.subarray(4 + n);
      const type = payload[0];
      const data = payload.subarray(1);
      if (type === 0) {
        const snap = data;
        if (snap.length >= 12) this.lastTick = snap.readInt32LE(8);
        try { this.onSnapshot && this.onSnapshot(snap); } catch (e) { this.log('[sim] snapshot handler: ' + e.message); }
      } else if (type === 1) {
        // generations: [count u16][playerId i32, gen i32]*
        const count = data.readUInt16LE(0);
        for (let i = 0; i < count; i++) {
          const o = 2 + i * 8;
          if (o + 8 > data.length) break;
          this.generations.set(data.readInt32LE(o), data.readInt32LE(o + 4));
        }
      }
    }
  }

  generation(pid) { return this.generations.get(pid) ?? 1; }

  send(type, pid, extra) {
    if (!this.ready || !this.proc || this.proc.stdin.destroyed) return;
    const head = Buffer.alloc(5);
    head[0] = type; head.writeInt32LE(pid, 1);
    const body = extra && extra.length ? Buffer.concat([head, extra]) : head;
    const len = Buffer.alloc(4); len.writeUInt32LE(body.length, 0);
    try { this.proc.stdin.write(Buffer.concat([len, body])); } catch {}
  }

  join(pid) { this.send(1, pid); }
  leave(pid) { this.send(2, pid); }
  input(pid, packet) { this.send(3, pid, packet); }

  // Swap the loaded world (map change). Restarts the headless sim against a new
  // reference directory; snapshots pause briefly then resume on the new map.
  restart(refDir) {
    if (refDir) this.refDir = refDir;
    this.log(`[sim] restarting with refDir=${this.refDir}`);
    try { this.proc && this.proc.kill(); } catch {}
    this.proc = null; this.ready = false; this.buf = Buffer.alloc(0);
    this.generations.clear();
    return this.start();
  }

  stop() { try { this.proc && this.proc.kill(); } catch {} }
}
