// Validate the SimHost encoder by feeding a real snapshot to the client's own
// WASM decoder (PresentSnapshot). If it returns a render array without throwing,
// the v23 encoding is correct.
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const DOTNET = process.env.DOTNET || '/tmp/claude-1000/-home-ray-AI-shit/e0b96088-8708-4f04-b0bf-cb6738631adf/scratchpad/dotnet/dotnet';
const SIMDLL = path.resolve('sim/bin/Release/net10.0/SimHost.dll');
const REF = path.resolve('../SFOTH/reference');
const FW = path.resolve('../SFOTH/physics-wasm/wwwroot/_framework');

// 1) boot the wasm decoder
process.chdir(FW);
const { dotnet } = await import(pathToFileURL(path.join(FW, 'dotnet.js')).href);
const rt = await dotnet.create();
const EP = (await rt.getAssemblyExports(rt.getConfig().mainAssemblyName)).SFOTH.Browser.EntryPoint;
EP.OpenPresentation(fs.readFileSync(path.join(REF, 'combat.json'), 'utf8'), fs.readFileSync(path.join(REF, 'items.json'), 'utf8'));
console.log('[validate] decoder ready');

// 2) spawn the sim, join a player, grab snapshots
const sim = spawn(DOTNET, [SIMDLL, REF], { stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, DOTNET_ROOT: path.dirname(DOTNET) } });
function send(type, pid, extra = Buffer.alloc(0)) {
  const body = Buffer.concat([Buffer.from([type]), int32(pid), extra]);
  const len = Buffer.alloc(4); len.writeUInt32LE(body.length, 0);
  sim.stdin.write(Buffer.concat([len, body]));
}
function int32(v) { const b = Buffer.alloc(4); b.writeInt32LE(v, 0); return b; }

let buf = Buffer.alloc(0), frames = 0, tested = 0, ok = 0;
sim.stdout.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const n = buf.readUInt32LE(0);
    if (buf.length < 4 + n) break;
    const snap = buf.subarray(4, 4 + n);
    buf = buf.subarray(4 + n);
    frames++;
    if (frames % 20 === 0 && tested < 3) {
      tested++;
      try {
        const bytes = new Uint8Array(snap);
        const render = EP.PresentSnapshot(bytes);
        ok++;
        console.log(`[validate] snapshot ${snap.length}B -> render floats=${render.length}  magic=${snap[0] | (snap[1] << 8)} ver=${snap[2]} kind=${snap[3]} players=${snap[4]}`);
      } catch (e) {
        console.log(`[validate] DECODE FAILED (${snap.length}B):`, String(e.message || e).split('\n')[0]);
      }
      if (tested >= 3) finish();
    }
  }
});

setTimeout(() => send(1, 1001), 300);     // join player 1001
setTimeout(() => { if (tested === 0) finish(); }, 6000);

function finish() {
  console.log(`[validate] tested=${tested} ok=${ok}`);
  try { sim.kill(); } catch {}
  process.exit(ok > 0 && ok === tested ? 0 : 1);
}
