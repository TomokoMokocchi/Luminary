import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const FW = path.resolve('../SFOTH/physics-wasm/wwwroot/_framework');
const REF = path.resolve('../SFOTH/reference');
process.chdir(FW);
const { dotnet } = await import(pathToFileURL(path.join(FW, 'dotnet.js')).href);
const runtime = await dotnet.create();
const ex = await runtime.getAssemblyExports(runtime.getConfig().mainAssemblyName);
const EP = ex.SFOTH.Browser.EntryPoint;

function describe(label, v) {
  if (v == null) return console.log(label, '=', v);
  if (v instanceof Uint8Array || v instanceof Float64Array || Array.isArray(v)) {
    const head = Array.from(v.slice(0, 16));
    console.log(label, `= ${v.constructor.name}(len=${v.length}) head=${JSON.stringify(head)}`);
    if (v instanceof Uint8Array && v.length >= 4) {
      const dv = new DataView(v.buffer, v.byteOffset, v.byteLength);
      console.log('   as snapshot: magic=', dv.getUint16(0, true), 'ver=', dv.getUint8(2), 'op=', dv.getUint8(3));
    }
  } else if (typeof v === 'object') {
    console.log(label, '= object keys:', Object.keys(v).slice(0, 30));
    try { console.log('   json:', JSON.stringify(v).slice(0, 400)); } catch {}
  } else {
    console.log(label, `= (${typeof v})`, String(v).slice(0, 200));
  }
}

const combat = fs.readFileSync(path.join(REF, 'combat.json'), 'utf8');
const items = fs.readFileSync(path.join(REF, 'items.json'), 'utf8');

function tryCall(name, fn, argsList) {
  for (const args of argsList) {
    try {
      const r = fn(...args);
      describe(`${name}(${args.map(a => (typeof a === 'string' ? `str[${a.length}]` : JSON.stringify(a))).join(',')})`, r);
      return { ok: true, r, args };
    } catch (e) {
      console.log(`${name}(${args.map(a => typeof a).join(',')}) threw:`, String(e.message || e).split('\n')[0].slice(0, 160));
    }
  }
  return { ok: false };
}

console.log('\n==== OpenOnline ====');
tryCall('OpenOnline', EP.OpenOnline, [[], [combat, items], [combat], [JSON.parse(combat)], [0]]);

console.log('\n==== OnlineScope / Metrics / Authoritative (pre-step) ====');
tryCall('OnlineScope', EP.OnlineScope, [[]]);
tryCall('OnlineMetrics', EP.OnlineMetrics, [[]]);
tryCall('AuthoritativeOnline', EP.AuthoritativeOnline, [[]]);

console.log('\n==== QueueOnline ====');
tryCall('QueueOnline', EP.QueueOnline, [[]]);

console.log('\n==== StepOnline x3 ====');
for (let i = 0; i < 3; i++) tryCall('StepOnline', EP.StepOnline, [[]]);

console.log('\n==== AuthoritativeOnline (post-step) ====');
tryCall('AuthoritativeOnline', EP.AuthoritativeOnline, [[]]);

console.log('\n==== ApplyOnline / UpdateOnline (2 args) probes ====');
tryCall('ApplyOnline', EP.ApplyOnline, [[1, new Uint8Array(0)], [1, 0], [0, 0]]);
tryCall('UpdateOnline', EP.UpdateOnline, [[1, combat], [0, combat], [1, 0]]);

process.exit(0);
