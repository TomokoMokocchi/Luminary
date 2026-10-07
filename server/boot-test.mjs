// Feasibility probe: boot the shipped .NET wasm runtime under Node and dump
// the SFOTH.Browser.EntryPoint exports + their arity.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FW = path.resolve(process.argv[2] || '../SFOTH/physics-wasm/wwwroot/_framework');
process.chdir(FW);
const dotnetUrl = pathToFileURL(path.join(FW, 'dotnet.js')).href;

console.log('[boot] importing', dotnetUrl);
const { dotnet } = await import(dotnetUrl);

console.log('[boot] creating runtime...');
const runtime = await dotnet.create();
console.log('[boot] runtime created. config main =', runtime.getConfig().mainAssemblyName);

const exports = await runtime.getAssemblyExports(runtime.getConfig().mainAssemblyName);
const EP = exports?.SFOTH?.Browser?.EntryPoint;
console.log('[boot] EntryPoint present:', !!EP);
if (EP) {
  for (const k of Object.keys(EP)) {
    const v = EP[k];
    console.log(`  EntryPoint.${k}  (${typeof v}${typeof v === 'function' ? ', arity ' + v.length : ''})`);
  }
}
console.log('[boot] done');
process.exit(0);
