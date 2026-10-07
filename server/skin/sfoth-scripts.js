/* ===========================================================================
   Luminary — client script runtime
   Runs a map's client (LocalScript) code in an isolated Web Worker so a game's
   scripts cannot touch the page, the DOM, cookies or the network. Each script
   gets a small `Lum` API:
       Lum.print(...)          -> appears in the F9 developer console
       Lum.warn(...)
       Lum.wait(seconds)       -> async pause
       Lum.onStep(fn)          -> called ~30x/second with (dt, t)
       Lum.workspace           -> a read-only snapshot of the place's parts
       Lum.random(a?, b?)      -> convenience RNG
   SERVER scripts are stored with the map and run by the owning server instance;
   for safety this browser runtime never executes server scripts — it only
   previews/tests client code. window.LuminaryScripts.{test,runForMap,stopAll}.
   =========================================================================== */
(function () {
  'use strict';

  // The worker program, shipped as a Blob URL. Everything a script can see is
  // defined here; the worker global scope has no DOM, window, fetch or cookies.
  var WORKER_SRC = [
    'var STEPS=[];',
    'var API={',
    '  print:function(){postMessage({t:"print",v:Array.prototype.map.call(arguments,fmt).join(" ")});},',
    '  warn:function(){postMessage({t:"print",v:"[warn] "+Array.prototype.map.call(arguments,fmt).join(" ")});},',
    '  wait:function(s){return new Promise(function(r){setTimeout(r,Math.max(0,(+s||0)*1000));});},',
    '  onStep:function(fn){if(typeof fn==="function")STEPS.push(fn);},',
    '  random:function(a,b){if(a==null)return Math.random();if(b==null)return Math.random()*a;return a+Math.random()*(b-a);},',
    '  workspace:{}',
    '};',
    'function fmt(a){if(a&&typeof a==="object"){try{return JSON.stringify(a);}catch(e){return String(a);}}return String(a);}',
    'onmessage=function(ev){',
    '  var d=ev.data;',
    '  if(d.t==="start"){',
    '    API.workspace=d.workspace||{};',
    '    try{var f=new Function("Lum","print","wait","workspace",d.src);',
    '      Promise.resolve(f(API,API.print,API.wait,API.workspace)).then(function(){postMessage({t:"ready"});},function(e){postMessage({t:"err",v:String(e&&e.stack||e)});});',
    '    }catch(e){postMessage({t:"err",v:String(e&&e.stack||e)});}',
    '  }else if(d.t==="tick"){',
    '    for(var i=0;i<STEPS.length;i++){try{STEPS[i](d.dt,d.time);}catch(e){postMessage({t:"err",v:String(e&&e.message||e)});}}',
    '  }',
    '};'
  ].join('\n');

  var blobUrl = null;
  function workerUrl() {
    if (blobUrl) return blobUrl;
    try { blobUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })); } catch (e) {}
    return blobUrl;
  }

  var live = []; // {worker, raf} for scripts running during play

  function spawn(src, onPrint, onErr, workspace, keepTicking) {
    var url = workerUrl();
    if (!url) { onErr && onErr('Web Workers unavailable'); return null; }
    var w;
    try { w = new Worker(url); } catch (e) { onErr && onErr('worker failed: ' + e.message); return null; }
    var startedAt = performance.now();
    var rec = { worker: w, raf: 0, ticking: false };
    w.onmessage = function (ev) {
      var d = ev.data;
      if (d.t === 'print') onPrint && onPrint(d.v);
      else if (d.t === 'err') onErr && onErr(d.v);
      else if (d.t === 'ready' && keepTicking) {
        rec.ticking = true;
        var last = performance.now();
        var tick = function () {
          if (!rec.ticking) return;
          var now = performance.now(), dt = (now - last) / 1000; last = now;
          try { w.postMessage({ t: 'tick', dt: dt, time: (now - startedAt) / 1000 }); } catch (e) {}
          rec.raf = setTimeout(tick, 33);
        };
        tick();
      }
    };
    w.onerror = function (e) { onErr && onErr(e.message || 'worker error'); };
    w.postMessage({ t: 'start', src: src, workspace: workspace || {} });
    return rec;
  }

  // Quick test from the Studio script editor: run once, relay prints, auto-stop.
  function test(src, onLine) {
    onLine('▶ running (client sandbox)…');
    var rec = spawn(src, function (v) { onLine(v); }, function (e) { onLine('⛔ ' + e); }, {}, false);
    if (!rec) return;
    setTimeout(function () { try { rec.worker.terminate(); } catch (e) {} onLine('■ stopped.'); }, 2000);
  }

  // Run every client script of a map during play (server scripts are skipped).
  function runForMap(mapId, workspace) {
    stopAll();
    if (!mapId || mapId === 'heights') return;
    fetch('/api/maps/' + mapId).then(function (r) { return r.json(); }).then(function (m) {
      if (!m || !m.scripts) return;
      var toolScripts = (m.tools || []).filter(function (t) { return t.script; }).map(function (t) { return { name: t.name + 'Script', type: 'client', source: t.script }; });
      var all = m.scripts.concat(toolScripts).filter(function (s) { return s.type === 'client' && s.source; });
      var log = function (name) { return function (v) { try { console.log('[' + name + '] ' + v); } catch (e) {} }; };
      all.forEach(function (s) {
        var rec = spawn(s.source, log(s.name), function (e) { try { console.error('[' + s.name + '] ' + e); } catch (x) {} }, workspace || {}, true);
        if (rec) live.push(rec);
      });
      if (all.length) try { console.log('[Luminary] running ' + all.length + ' client script(s) for this place.'); } catch (e) {}
    }).catch(function () {});
  }

  function stopAll() {
    live.forEach(function (rec) { rec.ticking = false; clearTimeout(rec.raf); try { rec.worker.terminate(); } catch (e) {} });
    live = [];
  }

  window.LuminaryScripts = { test: test, runForMap: runForMap, stopAll: stopAll };
})();
