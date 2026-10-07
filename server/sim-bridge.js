// Bridge to the authoritative .NET simulation host (sim/SimHost.dll).
//
// Spawns the SimHost child process, forwards join/leave/input commands, and
// emits each authoritative v23 snapshot it produces. Framing is a 4-byte LE
// length prefix in both directions.

import { spawn, execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The .NET runtime version the prebuilt SimHost targets.
const DOTNET_CHANNEL = '10.0';
// Where we bootstrap a private runtime if the host has none (no sudo needed).
const BOOTSTRAP_DIR = path.join(__dirname, '.dotnet');

function exists(p) { try { return !!p && fs.existsSync(p); } catch { return false; } }

// The real home directory of the person running the server. Under `sudo`,
// process.env.HOME is /root but the .NET install lives in the invoking user's
// home — so prefer SUDO_USER's home. This is THE reason joining can silently
// fail: no dotnet found -> no SimHost -> no world snapshots -> the client
// errors with "The room stopped sending state".
function realHomes() {
  const homes = [];
  if (process.env.SUDO_USER) {
    homes.push(path.join('/home', process.env.SUDO_USER));
    if (process.platform === 'darwin') homes.push(path.join('/Users', process.env.SUDO_USER));
  }
  if (process.env.HOME) homes.push(process.env.HOME);
  try { homes.push(os.homedir()); } catch {}
  // any user home that has a .dotnet (handles unusual usernames)
  for (const base of ['/home', '/Users']) {
    try { for (const u of fs.readdirSync(base)) homes.push(path.join(base, u)); } catch {}
  }
  return [...new Set(homes)];
}

// Locate the .NET runtime the SimHost needs. Override with SFOTH_DOTNET.
// Searches: explicit env, DOTNET_ROOT, every real home's ~/.dotnet, PATH, and
// the usual system install locations (apt / snap / manual / macOS).
export function findDotnet() {
  if (exists(process.env.SFOTH_DOTNET)) return process.env.SFOTH_DOTNET;

  const candidates = [];
  for (const root of [process.env.DOTNET_ROOT, process.env.DOTNET_ROOT ? path.join(process.env.DOTNET_ROOT, 'x64') : null]) {
    if (root) candidates.push(path.join(root, 'dotnet'));
  }
  for (const h of realHomes()) candidates.push(path.join(h, '.dotnet', 'dotnet'));
  // PATH lookup (may be stripped by sudo secure_path, so it's only one source)
  try {
    const found = execSync('command -v dotnet 2>/dev/null || which dotnet 2>/dev/null', { encoding: 'utf8' }).trim();
    if (found) candidates.push(found);
  } catch {}
  candidates.push(
    path.join(BOOTSTRAP_DIR, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet'),
    '/usr/lib/dotnet/dotnet',
    '/usr/share/dotnet/dotnet',
    '/usr/local/share/dotnet/dotnet',
    '/opt/dotnet/dotnet',
    '/snap/dotnet-sdk/current/dotnet',
    '/snap/bin/dotnet',
    '/usr/bin/dotnet',
    '/usr/local/bin/dotnet',
  );
  return candidates.find(exists);
}

// Download + install a private .NET runtime into BOOTSTRAP_DIR using the
// official dotnet-install script — no sudo, no system changes, cached so it
// only happens once. This is what makes gameplay work on ANY host: if no .NET
// is present we fetch just the ~35MB runtime and run the SimHost against it.
// Disable with SFOTH_NO_DOTNET_BOOTSTRAP=1. Needs network access on first run.
let _bootstrapPromise = null;
async function bootstrapDotnet(log) {
  const exe = path.join(BOOTSTRAP_DIR, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
  if (exists(exe)) return exe;
  if (process.env.SFOTH_NO_DOTNET_BOOTSTRAP) return null;
  await fsp.mkdir(BOOTSTRAP_DIR, { recursive: true });
  const win = process.platform === 'win32';
  const scriptUrl = win ? 'https://dot.net/v1/dotnet-install.ps1' : 'https://dot.net/v1/dotnet-install.sh';
  const scriptPath = path.join(BOOTSTRAP_DIR, win ? 'dotnet-install.ps1' : 'dotnet-install.sh');
  log(`[sim] no .NET found — bootstrapping a private runtime (${DOTNET_CHANNEL}) into ${BOOTSTRAP_DIR} …`);
  try {
    const res = await fetch(scriptUrl);
    if (!res.ok) throw new Error('install script HTTP ' + res.status);
    await fsp.writeFile(scriptPath, Buffer.from(await res.arrayBuffer()));
    if (win) {
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
        '-Channel', DOTNET_CHANNEL, '-Runtime', 'dotnet', '-InstallDir', BOOTSTRAP_DIR],
        { stdio: 'ignore', timeout: 10 * 60 * 1000 });
    } else {
      fs.chmodSync(scriptPath, 0o755);
      execFileSync('bash', [scriptPath, '--channel', DOTNET_CHANNEL, '--runtime', 'dotnet',
        '--install-dir', BOOTSTRAP_DIR, '--no-path'],
        { stdio: 'ignore', timeout: 10 * 60 * 1000 });
    }
    if (exists(exe)) { log(`[sim] .NET runtime ready at ${exe}`); return exe; }
    log('[sim] bootstrap finished but dotnet not found where expected');
    return null;
  } catch (e) {
    log('[sim] .NET bootstrap failed: ' + (e.message || e) + ' — set SFOTH_DOTNET to a dotnet path, or install .NET ' + DOTNET_CHANNEL + ' manually.');
    return null;
  }
}

// Resolve a usable dotnet: an existing install, else a bootstrapped one.
// Cached across all instances so we download at most once.
export function ensureDotnet(log = () => {}) {
  if (_bootstrapPromise) return _bootstrapPromise;
  _bootstrapPromise = (async () => {
    const found = findDotnet();
    if (found) return found;
    return bootstrapDotnet(log);
  })();
  return _bootstrapPromise;
}

export class SimBridge {
  constructor({ refDir, log = () => {}, onSnapshot }) {
    this.refDir = refDir;
    this.log = log;
    this.onSnapshot = onSnapshot;
    this.proc = null;
    this.buf = Buffer.alloc(0);
    this.lastTick = 0;
    this.lastTickAt = 0;          // wall-clock of the last snapshot
    this.gotSnapshot = false;
    this.generations = new Map(); // playerId -> character generation
    this.ready = false;
    this.pending = [];            // commands queued while the runtime boots
    this._stopped = false;
  }

  // The sim's CURRENT authoritative tick, interpolated between snapshots. The
  // client's clock syncs to this, so it MUST stay on the sim's own epoch (ticks
  // since this sim process started, advancing at 60 Hz). Returning anything on a
  // different epoch — e.g. ticks-since-server-boot before the sim has started —
  // makes the client reconcile across a huge gap and fling the character. Before
  // the first snapshot we report 0, which matches where the sim begins.
  currentTick() {
    if (!this.gotSnapshot) return 0;
    const dt = Math.max(0, Date.now() - this.lastTickAt);
    return Math.max(0, this.lastTick + Math.round(dt * 0.06)); // 60 ticks / 1000 ms
  }

  // Resolve a runtime (bootstrapping one if needed), then spawn the SimHost.
  // Async, but callers fire-and-forget; snapshots simply begin once ready.
  async start() {
    this._stopped = false;
    const dll = path.join(__dirname, 'sim', 'bin', 'Release', 'net10.0', 'SimHost.dll');
    if (!fs.existsSync(dll)) { this.log('[sim] disabled — SimHost.dll missing (rebuild server/sim).'); return false; }

    const dotnet = await ensureDotnet(this.log);
    if (this._stopped) return false; // stopped while bootstrapping
    if (!dotnet) {
      this.log('[sim] disabled — no .NET runtime (bootstrap unavailable). Players connect but ' +
               'get "The room stopped sending state". Set SFOTH_DOTNET or allow network for the one-time runtime download.');
      return false;
    }
    this.log(`[sim] using dotnet: ${dotnet}`);
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
    // Replay commands (joins/inputs) that arrived while the runtime booted.
    const queued = this.pending; this.pending = [];
    for (const c of queued) this.send(c.type, c.pid, c.extra);
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
        if (snap.length >= 12) { this.lastTick = snap.readInt32LE(8); this.lastTickAt = Date.now(); this.gotSnapshot = true; }
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
    if (!this.ready || !this.proc || this.proc.stdin.destroyed) {
      // Queue joins/leaves (and recent inputs) until the runtime finishes
      // booting, so a player who joins during bootstrap is not lost.
      if (!this._stopped && this.pending.length < 4000) this.pending.push({ type, pid, extra });
      return;
    }
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

  stop() { this._stopped = true; this.pending = []; try { this.proc && this.proc.kill(); } catch {} }
}
