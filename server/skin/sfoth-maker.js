/* ===========================================================================
   Luminary — Studio (full-screen map maker)
   A Roblox-Studio-like editor that takes over the whole screen:
     * free-fly camera: WASD to move, Q/E down/up, right-drag (or the Orbit
       tool) to look, scroll to dolly, Shift to move faster
     * Toolbox to insert objects (block / spawn / tool / ramp / baseplate)
     * Explorer tree of everything in the place (Workspace, StarterPack, Scripts)
     * Properties for the selected object (name, position, size, colour, and for
       tools: "give on spawn" + an attached script)
     * Scripts: client (LocalScript) and server (Script), edited inline
     * Import .rbxlx / .rbxl — decompiles & converts Parts/Spawns/Tools/Scripts,
       skipping anything with no equivalent in our game
     * Save & publish a new public map, or update one you own
   window.LuminaryMaker.open(mapId?) shows it; pass a map id to edit it.
   =========================================================================== */
(function () {
  'use strict';
  var THREE_URL = '/sfoth-skin/three.min.js';   // vendored locally
  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var BASE = 128;            // baseplate span (studs)

  var PALETTE = [
    [163, 162, 165], [99, 95, 98], [27, 42, 53], [255, 255, 255], [196, 40, 28], [255, 176, 0],
    [245, 205, 48], [75, 151, 75], [40, 127, 71], [0, 162, 255], [13, 105, 172], [107, 50, 124],
    [234, 184, 146], [160, 95, 53], [218, 133, 65], [161, 196, 140], [45, 71, 156], [255, 152, 220]
  ];

  // --- per-browser ownership key (minted once, shared with the server) -----
  function lumKey() {
    try {
      var k = localStorage.getItem('lum_key');
      if (!k) { k = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2)); localStorage.setItem('lum_key', k); }
      return k;
    } catch (e) { return ''; }
  }

  var THREE = null, loading = null;
  function ensureThree() {
    if (window.THREE) { THREE = window.THREE; return Promise.resolve(THREE); }
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var tryLoad = function (url, next) {
        var s = document.createElement('script'); s.src = url; s.async = true;
        s.onload = function () { THREE = window.THREE; THREE ? res(THREE) : next(); };
        s.onerror = next;
        document.head.appendChild(s);
      };
      tryLoad(THREE_URL, function () { tryLoad(THREE_CDN, function () { rej(new Error('three.js failed to load')); }); });
    });
    return loading;
  }

  // --- document model ------------------------------------------------------
  // objects: {uid, kind:'block'|'spawn'|'tool', name, pos[3], size[3], color[3],
  //           starter?(tool), script?(tool, script name), mesh, helper}
  var M = {
    name: 'Untitled Place', mapId: null, owned: false,
    objects: [], scripts: [], sel: null, nextUid: 1,
    tool: 'select', color: [0, 162, 255].slice(), paintColor: [0, 162, 255].slice()
  };
  var root = null, V = null;
  var keys = {}; // held movement keys

  function col(rgb) { return (new THREE.Color()).setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return M.nextUid++; }

  // =========================================================================
  //  UI SHELL
  // =========================================================================
  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'lum-studio';
    root.innerHTML =
      '<div class="st-top">' +
        '<span class="st-brand"><span class="rbx-cube"></span>Luminary Studio</span>' +
        '<input id="st-name" class="st-name" maxlength="40" placeholder="Place name">' +
        '<span class="st-sp"></span>' +
        '<label class="st-import">Import .rbxlx/.rbxl<input id="st-file" type="file" accept=".rbxlx,.rbxl,.xml" hidden></label>' +
        '<span id="st-status" class="st-status"></span>' +
        '<button class="st-btn" data-act="playtest">▶ Play-test</button>' +
        '<button class="st-btn primary" data-act="save">Save &amp; publish</button>' +
        '<button class="st-btn" data-act="close">Close</button>' +
      '</div>' +
      '<div class="st-main">' +
        '<div class="st-left">' +
          '<div class="st-pane">' +
            '<div class="st-pane-h">Toolbox</div>' +
            '<input id="st-tb-search" class="st-tb-search" placeholder="Search objects…" autocomplete="off">' +
            '<div class="st-toolbox" id="st-toolbox"></div>' +
          '</div>' +
          '<div class="st-pane st-grow">' +
            '<div class="st-pane-h">Explorer <button class="st-mini" data-act="addscript">+ Script</button></div>' +
            '<div id="st-explorer" class="st-explorer"></div>' +
          '</div>' +
        '</div>' +
        '<div class="st-stage">' +
          '<div class="st-tools">' +
            '<button class="st-tool active" data-t="select" title="Select / move (drag)">✋ Select</button>' +
            '<button class="st-tool" data-t="orbit" title="Look around">👁 Look</button>' +
            '<button class="st-tool" data-t="block" title="Click a face to stack a block">▦ Build</button>' +
            '<button class="st-tool" data-t="spawn" title="Click to drop a spawn">⚑ Spawn</button>' +
            '<button class="st-tool" data-t="tool" title="Click to drop a tool">🗡 Tool</button>' +
            '<button class="st-tool" data-t="paint" title="Click to paint">🖌 Paint</button>' +
            '<button class="st-tool" data-t="delete" title="Click to delete">🗑 Delete</button>' +
          '</div>' +
          '<canvas id="st-canvas"></canvas>' +
          '<div class="st-hint">WASD move · Q/E down/up · right-drag or Look to turn · scroll zoom · Shift faster</div>' +
        '</div>' +
        '<div class="st-right">' +
          '<div class="st-pane"><div class="st-pane-h">Properties</div><div id="st-props" class="st-props"></div></div>' +
          '<div class="st-pane"><div class="st-pane-h">Colour</div><div id="st-colors" class="st-colors"></div></div>' +
        '</div>' +
      '</div>' +
      '<div id="st-scripts" class="st-script-modal"><div class="st-script-box">' +
        '<div class="st-script-head"><input id="st-sc-name" class="st-name" maxlength="60" placeholder="Script name">' +
          '<select id="st-sc-type"><option value="server">Server Script</option><option value="client">LocalScript (client)</option></select>' +
          '<span class="st-sp"></span><button class="st-btn" data-sc="docs">📖 Docs</button><button class="st-btn" data-sc="run">▶ Test</button>' +
          '<button class="st-btn primary" data-sc="ok">Done</button><button class="st-btn" data-sc="cancel">Cancel</button></div>' +
        '<div class="st-script-main"><textarea id="st-sc-src" spellcheck="false" placeholder="// Luminary script (JavaScript, Roblox-style API)\n// print(\'hi\'); make parts, GUIs, sounds, connect events.\nprint(\'hello from a script\')\n\nvar part = Instance.new(\'Part\', workspace)\npart.Position = Vector3.new(0, 10, 0)\npart.Touched.Connect(function(hit){ print(hit.Name, \'touched\') })\n\ngame.Players.PlayerAdded.Connect(function(p){ print(p.Name, \'joined\') })"></textarea>' +
          '<div id="st-sc-docs" class="st-sc-docs"></div></div>' +
        '<div id="st-sc-out" class="st-sc-out"></div>' +
      '</div></div>';
    document.body.appendChild(root);

    root.querySelector('#st-name').value = M.name;
    root.querySelector('#st-name').addEventListener('input', function (e) { M.name = e.target.value; });

    // colour palette
    var cw = root.querySelector('#st-colors');
    cw.innerHTML = PALETTE.map(function (c) { return '<button class="av-sw" data-c="' + c.join(',') + '" style="background:rgb(' + c.join(',') + ')"></button>'; }).join('');
    cw.addEventListener('click', function (e) {
      var s = e.target.closest('.av-sw'); if (!s) return;
      M.color = s.dataset.c.split(',').map(Number); M.paintColor = M.color.slice();
      cw.querySelectorAll('.av-sw').forEach(function (x) { x.classList.toggle('sel', x === s); });
      if (M.sel && M.tool !== 'paint') { M.sel.color = M.color.slice(); M.sel.mesh.material.color.copy(col(M.color)); renderProps(); }
    });

    root.querySelectorAll('.st-tool').forEach(function (b) {
      b.onclick = function () { M.tool = b.dataset.t; root.querySelectorAll('.st-tool').forEach(function (x) { x.classList.toggle('active', x === b); }); };
    });
    renderToolbox('');
    var tbs = root.querySelector('#st-tb-search');
    if (tbs) tbs.addEventListener('input', function () { renderToolbox(this.value.toLowerCase()); });

    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'close') close();
      else if (a.dataset.act === 'save') save();
      else if (a.dataset.act === 'playtest') playtest();
      else if (a.dataset.act === 'addscript') openScript(null);
    });

    // file import
    root.querySelector('#st-file').addEventListener('change', function (e) { var f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });

    buildScriptModal();
  }

  // =========================================================================
  //  3D VIEW + FREE-FLY CAMERA
  // =========================================================================
  function initViewer() {
    var canvas = root.querySelector('#st-canvas');
    var scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e1014);
    scene.fog = new THREE.Fog(0x0e1014, 400, 1200);
    var camera = new THREE.PerspectiveCamera(60, 1, 0.5, 4000);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x45505f, 1.1));
    var dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(80, 160, 60); scene.add(dir);
    var grid = new THREE.GridHelper(BASE * 2, BASE / 2, 0x2f3a46, 0x20272f); scene.add(grid);

    V = {
      scene: scene, camera: camera, renderer: renderer, grid: grid, ray: new THREE.Raycaster(),
      pos: new THREE.Vector3(0, 28, 70), yaw: Math.PI, pitch: -0.32,
      dragging: false, moved: false, button: 0, lx: 0, ly: 0, selHelper: null, last: performance.now()
    };
    applyCam();
    resize();
    window.addEventListener('resize', resize);

    var loop = function () {
      if (!V) return;
      var now = performance.now(), dt = Math.min(0.05, (now - V.last) / 1000); V.last = now;
      flyStep(dt);
      renderer.render(scene, camera);
      V.raf = requestAnimationFrame(loop);
    };
    loop();

    canvas.addEventListener('pointerdown', function (e) {
      canvas.focus(); V.dragging = true; V.moved = false; V.button = e.button; V.lx = e.clientX; V.ly = e.clientY; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!V.dragging) return;
      var dx = e.clientX - V.lx, dy = e.clientY - V.ly;
      if (Math.abs(dx) + Math.abs(dy) > 3) V.moved = true;
      var looking = V.button === 2 || V.tool === 'orbit' || M.tool === 'orbit' || e.shiftKey;
      if (looking) { V.yaw -= dx * 0.005; V.pitch = Math.max(-1.5, Math.min(1.5, V.pitch - dy * 0.005)); applyCam(); }
      else if (M.tool === 'select' && M.sel) { dragSelected(e); }
      V.lx = e.clientX; V.ly = e.clientY;
    });
    canvas.addEventListener('pointerup', function (e) {
      V.dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (x) {}
      if (!V.moved && V.button === 0) handleClick(e);
    });
    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var ray = screenRay(e);
      var hits = ray.intersectObjects(pickables(), true);
      var o = hits[0] ? objFromMesh(hits[0].object) : null;
      if (o) objectCtx(o, e.clientX, e.clientY);
      else { var pt = groundPoint(ray) || V.pos.clone().add(forward().multiplyScalar(14)); showCtx(e.clientX, e.clientY, insertMenu(pt)); }
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var f = forward(), step = (e.deltaY > 0 ? -1 : 1) * 6;
      V.pos.addScaledVector(f, step); applyCam();
    }, { passive: false });

    // keyboard for WASD fly (while studio is open)
    canvas.tabIndex = 0;
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
  }

  function onKey(e) {
    if (!root || !root.classList.contains('open')) return;
    var sc = root.querySelector('#st-scripts');
    if (sc && sc.classList.contains('open')) return; // typing a script
    if (document.activeElement && /input|textarea|select/i.test(document.activeElement.tagName)) return;
    var k = e.key.toLowerCase();
    if ('wasdqe'.indexOf(k) >= 0) { keys[k] = true; e.preventDefault(); }
    if (k === 'shift') keys.shift = true;
    if (k === 'delete' && M.sel) { removeObject(M.sel); }
    if (k === 'escape') { if (M.sel) selectObject(null); }
  }
  function onKeyUp(e) {
    var k = e.key.toLowerCase();
    if ('wasdqe'.indexOf(k) >= 0) keys[k] = false;
    if (k === 'shift') keys.shift = false;
  }

  function forward() {
    var cp = Math.cos(V.pitch);
    return new THREE.Vector3(Math.sin(V.yaw) * cp, Math.sin(V.pitch), Math.cos(V.yaw) * cp).normalize();
  }
  function rightVec() { return new THREE.Vector3(Math.sin(V.yaw - Math.PI / 2), 0, Math.cos(V.yaw - Math.PI / 2)).normalize(); }

  function flyStep(dt) {
    var sp = (keys.shift ? 120 : 45) * dt;
    var f = forward(), r = rightVec();
    if (keys.w) V.pos.addScaledVector(f, sp);
    if (keys.s) V.pos.addScaledVector(f, -sp);
    if (keys.d) V.pos.addScaledVector(r, sp);
    if (keys.a) V.pos.addScaledVector(r, -sp);
    if (keys.e) V.pos.y += sp;
    if (keys.q) V.pos.y -= sp;
    if (keys.w || keys.a || keys.s || keys.d || keys.q || keys.e) applyCam();
  }
  function applyCam() { V.camera.position.copy(V.pos); V.camera.lookAt(V.pos.clone().add(forward())); }

  function resize() {
    if (!V) return;
    var stage = root.querySelector('.st-stage');
    var w = stage.clientWidth, h = stage.clientHeight;
    V.renderer.setSize(w, h, false); V.camera.aspect = w / h; V.camera.updateProjectionMatrix();
  }

  // =========================================================================
  //  OBJECTS
  // =========================================================================
  // --- surface textures (studs on baseplates, the logo on spawns) ---------
  var _texCache = {};
  function studTexture(rgb) {
    var key = 'stud' + rgb.join(','); if (_texCache[key]) return _texCache[key];
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    g.fillStyle = 'rgb(' + rgb.join(',') + ')'; g.fillRect(0, 0, 128, 128);
    for (var y = 16; y < 128; y += 32) for (var x = 16; x < 128; x += 32) {
      g.beginPath(); g.arc(x, y, 9, 0, 7); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill();
      g.beginPath(); g.arc(x + 1, y + 1, 9, 0, 7); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.stroke();
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; _texCache[key] = t; return t;
  }
  function spawnTopTexture() {
    if (_texCache.spawn) return _texCache.spawn;
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    g.fillStyle = '#d7a300'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#f5cd30'; g.fillRect(6, 6, 116, 116);
    // classic spawn logo: white ring + arrow
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 34, 0, 7); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(64, 34); g.lineTo(80, 64); g.lineTo(70, 64); g.lineTo(70, 92); g.lineTo(58, 92); g.lineTo(58, 64); g.lineTo(48, 64); g.closePath(); g.fill();
    var t = new THREE.CanvasTexture(c); t.needsUpdate = true; _texCache.spawn = t; return t;
  }
  // Build the material(s) for an object: plain colour, studded baseplate, or a
  // spawn pad with the logo on its top face.
  function materialsFor(o) {
    if (o.kind === 'spawn') {
      var side = new THREE.MeshLambertMaterial({ color: col(o.color) });
      var top = new THREE.MeshLambertMaterial({ map: spawnTopTexture() });
      // BoxGeometry face order: +X,-X,+Y,-Y,+Z,-Z  (index 2 = top)
      return [side, side, top, side, side, side];
    }
    var isBase = o.name === 'Baseplate' || o.size[0] >= 100;
    if (isBase) {
      var tex = studTexture(o.color); tex = tex.clone(); tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, o.size[0] / 4), Math.max(1, o.size[2] / 4));
      return new THREE.MeshLambertMaterial({ map: tex });
    }
    return new THREE.MeshLambertMaterial({ color: col(o.color) });
  }

  function makeMesh(o) {
    var geo = new THREE.BoxGeometry(o.size[0], o.size[1], o.size[2]);
    var mesh = new THREE.Mesh(geo, materialsFor(o));
    mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
    mesh.userData.uid = o.uid;
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
    mesh.add(edges);
    if (o.kind === 'tool') {
      var spr = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 4), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
      spr.position.y = o.size[1] / 2 + 1; mesh.add(spr);
    }
    V.scene.add(mesh); o.mesh = mesh; return mesh;
  }

  function addObject(o) {
    o.uid = o.uid || uid();
    M.objects.push(o);
    makeMesh(o);
    renderExplorer();
    return o;
  }

  function removeObject(o) {
    var i = M.objects.indexOf(o); if (i < 0) return;
    if (o.mesh) { V.scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); }
    M.objects.splice(i, 1);
    if (M.sel === o) selectObject(null);
    renderExplorer();
  }

  function duplicateObject(o) {
    var c = { kind: o.kind, name: o.name, pos: [o.pos[0] + 4, o.pos[1], o.pos[2] + 4], size: o.size.slice(), color: o.color.slice() };
    if (o.kind === 'tool') { c.starter = o.starter; c.script = o.script || ''; }
    selectObject(addObject(c));
  }
  function renameObject(o) { var n = prompt('Rename object', o.name); if (n != null) { o.name = String(n).slice(0, 40); renderExplorer(); if (M.sel === o) renderProps(); } }

  // --- right-click context menu -------------------------------------------
  var ctxEl = null;
  function showCtx(x, y, items) {
    if (!ctxEl) { ctxEl = document.createElement('div'); ctxEl.id = 'st-ctx'; document.body.appendChild(ctxEl); document.addEventListener('mousedown', hideCtx); window.addEventListener('blur', hideCtx); }
    items = items.filter(Boolean);
    ctxEl.innerHTML = items.map(function (it, i) { return it.sep ? '<div class="st-ctx-sep"></div>' : '<div class="st-ctx-item' + (it.danger ? ' danger' : '') + '" data-i="' + i + '">' + it.label + '</div>'; }).join('');
    ctxEl.querySelectorAll('[data-i]').forEach(function (d) { d.onmousedown = function (e) { e.stopPropagation(); e.preventDefault(); var it = items[+d.dataset.i]; hideCtx(); if (it && it.fn) it.fn(); }; });
    ctxEl.style.left = Math.min(x, window.innerWidth - 210) + 'px';
    ctxEl.style.top = Math.min(y, window.innerHeight - (items.length * 30 + 20)) + 'px';
    ctxEl.classList.add('open');
  }
  function hideCtx() { if (ctxEl) ctxEl.classList.remove('open'); }
  function insertMenu(at) { return INSERTABLES.map(function (t) { return { label: t.icon + ' ' + t.name, fn: function () { insert(t.id, at); } }; }); }
  function objectCtx(o, x, y) {
    selectObject(o);
    showCtx(x, y, [
      { label: '✎ Rename', fn: function () { renameObject(o); } },
      { label: '⧉ Duplicate', fn: function () { duplicateObject(o); } },
      o.kind === 'tool' ? { label: '📜 Edit script', fn: function () { openToolScript(o); } } : null,
      o.kind === 'tool' ? { label: (o.starter ? '✓ ' : '') + '🎒 Give on spawn', fn: function () { o.starter = !o.starter; renderExplorer(); if (M.sel === o) renderProps(); } } : null,
      { sep: true },
      { label: '🗑 Delete', danger: true, fn: function () { removeObject(o); } }
    ]);
  }

  // Everything the Toolbox can insert. Block-based primitives differ only by
  // default size; spawns/tools/scripts are their own kinds. Searchable.
  var INSERTABLES = [
    { id: 'block', name: 'Part', icon: '▦', group: 'Parts' },
    { id: 'wall', name: 'Wall', icon: '▯', group: 'Parts' },
    { id: 'platform', name: 'Platform', icon: '▭', group: 'Parts' },
    { id: 'pillar', name: 'Pillar', icon: '▮', group: 'Parts' },
    { id: 'ramp', name: 'Ramp', icon: '◺', group: 'Parts' },
    { id: 'floor', name: 'Floor', icon: '⬛', group: 'Parts' },
    { id: 'baseplate', name: 'Baseplate', icon: '▦', group: 'Parts' },
    { id: 'spawn', name: 'SpawnLocation', icon: '⚑', group: 'Gameplay' },
    { id: 'tool', name: 'Tool', icon: '🗡', group: 'Gameplay' },
    { id: 'tool-starter', name: 'StarterTool', icon: '🎒', group: 'Gameplay' },
    { id: 'script-server', name: 'Script', icon: '🟩', group: 'Scripts' },
    { id: 'script-client', name: 'LocalScript', icon: '🟦', group: 'Scripts' }
  ];
  function renderToolbox(filter) {
    var box = root.querySelector('#st-toolbox'); if (!box) return;
    var items = INSERTABLES.filter(function (t) { return !filter || t.name.toLowerCase().indexOf(filter) >= 0 || t.group.toLowerCase().indexOf(filter) >= 0; });
    box.innerHTML = items.map(function (t) { return '<button class="st-ins" data-ins="' + t.id + '" title="' + t.group + '">' + t.icon + ' ' + t.name + '</button>'; }).join('') || '<div class="st-ex-empty">No objects match.</div>';
    box.querySelectorAll('.st-ins').forEach(function (b) { b.onclick = function () { insert(b.dataset.ins); }; });
  }

  // kind -> block template (size); undefined for non-block kinds
  var BLOCK_KINDS = {
    block: { name: 'Part', size: [4, 4, 4] },
    wall: { name: 'Wall', size: [12, 8, 1] },
    platform: { name: 'Platform', size: [16, 1, 16] },
    pillar: { name: 'Pillar', size: [2, 12, 2] },
    ramp: { name: 'Ramp', size: [8, 1, 12] },
    floor: { name: 'Floor', size: [32, 1, 32] }
  };

  function insert(kind, at) {
    if (!V) { status('Editor still loading…'); return; }
    var p = at || (function () { var f = forward().multiplyScalar(14); var q = V.pos.clone().add(f); q.y = Math.max(2, q.y); return q; })();
    var rx = Math.round(p.x), rz = Math.round(p.z);
    if (BLOCK_KINDS[kind]) {
      var t = BLOCK_KINDS[kind];
      selectObject(addObject({ kind: 'block', name: t.name, pos: [rx, Math.max(t.size[1] / 2, Math.round(p.y)), rz], size: t.size.slice(), color: M.color.slice() }));
    } else if (kind === 'baseplate') {
      if (M.objects.some(function (o) { return o.kind === 'block' && o.size[0] >= BASE; })) { status('Baseplate already present.'); return; }
      selectObject(addObject({ kind: 'block', name: 'Baseplate', pos: [0, -1, 0], size: [BASE, 2, BASE], color: [75, 151, 75] }));
    } else if (kind === 'spawn') {
      selectObject(addObject({ kind: 'spawn', name: 'SpawnLocation', pos: [rx, 0.6, rz], size: [6, 1.2, 6], color: [245, 205, 48] }));
    } else if (kind === 'tool' || kind === 'tool-starter') {
      selectObject(addObject({ kind: 'tool', name: 'Tool', pos: [rx, 3, rz], size: [1, 4, 1], color: [163, 162, 165], starter: kind === 'tool-starter', script: '' }));
    } else if (kind === 'script-server' || kind === 'script-client') {
      openScript(null); var sel = root.querySelector('#st-sc-type'); if (sel) sel.value = kind === 'script-client' ? 'client' : 'server';
      return;
    }
    status('Inserted ' + kind + '.');
  }

  function pickables() { return M.objects.map(function (o) { return o.mesh; }); }

  function screenRay(e) {
    var canvas = V.renderer.domElement, r = canvas.getBoundingClientRect();
    var m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    V.ray.setFromCamera(m, V.camera); return V.ray;
  }

  function handleClick(e) {
    var tool = M.tool;
    var ray = screenRay(e);
    var hits = ray.intersectObjects(pickables(), true);
    var hit = hits[0];
    var hitObj = hit ? objFromMesh(hit.object) : null;

    if (tool === 'select') { selectObject(hitObj); return; }
    if (tool === 'delete') { if (hitObj) removeObject(hitObj); return; }
    if (tool === 'paint') { if (hitObj) { hitObj.color = M.paintColor.slice(); hitObj.mesh.material.color.copy(col(hitObj.color)); if (M.sel === hitObj) renderProps(); } return; }

    // placement tools need a point: hit surface, or the ground plane y=0
    var point, normal;
    if (hit) { point = hit.point.clone(); normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0); }
    else { point = groundPoint(ray); normal = new THREE.Vector3(0, 1, 0); if (!point) return; }

    if (tool === 'block') {
      var size = [4, 4, 4];
      var p = point.add(normal.multiplyScalar(2));
      addObject({ kind: 'block', name: 'Part', pos: [Math.round(p.x), Math.max(2, Math.round(p.y)), Math.round(p.z)], size: size, color: M.color.slice() });
    } else if (tool === 'spawn') {
      addObject({ kind: 'spawn', name: 'SpawnLocation', pos: [Math.round(point.x), point.y + 0.6, Math.round(point.z)], size: [6, 1.2, 6], color: [245, 205, 48] });
    } else if (tool === 'tool') {
      addObject({ kind: 'tool', name: 'Tool', pos: [Math.round(point.x), point.y + 2, Math.round(point.z)], size: [1, 4, 1], color: [163, 162, 165], starter: false, script: '' });
    }
  }

  function groundPoint(ray) {
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var pt = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, pt) ? pt : null;
  }

  function objFromMesh(mesh) {
    while (mesh && mesh.userData.uid == null) mesh = mesh.parent;
    if (!mesh) return null;
    return M.objects.find(function (o) { return o.uid === mesh.userData.uid; }) || null;
  }

  function dragSelected(e) {
    var ray = screenRay(e);
    var pt = groundPoint(ray); if (!pt) return;
    M.sel.pos[0] = Math.round(pt.x); M.sel.pos[2] = Math.round(pt.z);
    M.sel.mesh.position.set(M.sel.pos[0], M.sel.pos[1], M.sel.pos[2]);
    if (M.sel.helper) M.sel.helper.update();
    renderProps();
  }

  function selectObject(o) {
    M.sel = o;
    if (V.selHelper) { V.scene.remove(V.selHelper); V.selHelper = null; }
    if (o && o.mesh) { V.selHelper = new THREE.BoxHelper(o.mesh, 0x00a2ff); V.scene.add(V.selHelper); o.helper = V.selHelper; }
    renderProps(); renderExplorer();
  }

  // =========================================================================
  //  EXPLORER + PROPERTIES
  // =========================================================================
  function renderExplorer() {
    var el = root.querySelector('#st-explorer'); if (!el) return;
    var ws = M.objects.filter(function (o) { return o.kind === 'block' || o.kind === 'spawn'; });
    var tools = M.objects.filter(function (o) { return o.kind === 'tool'; });
    var starter = tools.filter(function (o) { return o.starter; });
    function row(o, icon) {
      return '<div class="st-ex-row' + (M.sel === o ? ' sel' : '') + '" data-uid="' + o.uid + '"><span class="st-ex-ic">' + icon + '</span>' + esc(o.name) + '</div>';
    }
    var html = '';
    html += '<div class="st-ex-grp">🗂 Workspace</div>';
    html += ws.map(function (o) { return row(o, o.kind === 'spawn' ? '⚑' : '▦'); }).join('') || '<div class="st-ex-empty">(empty)</div>';
    html += '<div class="st-ex-grp">🎒 StarterPack</div>';
    html += (starter.map(function (o) { return row(o, '🗡'); }).join('') || '<div class="st-ex-empty">(no starter tools)</div>');
    html += '<div class="st-ex-grp">🗡 Tools in world</div>';
    html += (tools.filter(function (o) { return !o.starter; }).map(function (o) { return row(o, '🗡'); }).join('') || '<div class="st-ex-empty">(none)</div>');
    html += '<div class="st-ex-grp">📜 Scripts</div>';
    html += (M.scripts.map(function (s, i) { return '<div class="st-ex-row" data-script="' + i + '"><span class="st-ex-ic">' + (s.type === 'client' ? '🟦' : '🟩') + '</span>' + esc(s.name) + '</div>'; }).join('') || '<div class="st-ex-empty">(no scripts)</div>');
    el.innerHTML = html;
    el.querySelectorAll('[data-uid]').forEach(function (r) {
      var find = function () { return M.objects.find(function (o) { return o.uid == r.dataset.uid; }); };
      r.onclick = function () { selectObject(find()); };
      r.oncontextmenu = function (e) { e.preventDefault(); var o = find(); if (o) objectCtx(o, e.clientX, e.clientY); };
    });
    el.querySelectorAll('[data-script]').forEach(function (r) {
      r.onclick = function () { openScript(+r.dataset.script); };
      r.oncontextmenu = function (e) { e.preventDefault(); var i = +r.dataset.script; showCtx(e.clientX, e.clientY, [{ label: '✎ Edit', fn: function () { openScript(i); } }, { sep: true }, { label: '🗑 Delete', danger: true, fn: function () { M.scripts.splice(i, 1); renderExplorer(); } }]); };
    });
    // right-click empty explorer space -> insert menu
    el.oncontextmenu = function (e) { if (e.target === el || e.target.classList.contains('st-ex-grp') || e.target.classList.contains('st-ex-empty')) { e.preventDefault(); showCtx(e.clientX, e.clientY, insertMenu(null)); } };
  }

  function renderProps() {
    var el = root.querySelector('#st-props'); if (!el) return;
    var o = M.sel;
    if (!o) { el.innerHTML = '<div class="st-ex-empty">Select an object to edit its properties.</div>'; return; }
    function num(label, key, idx) { return '<label class="st-prop"><span>' + label + '</span><input type="number" step="1" data-key="' + key + '" data-idx="' + idx + '" value="' + o[key][idx] + '"></label>'; }
    var html = '<label class="st-prop"><span>Name</span><input type="text" data-name="1" value="' + esc(o.name) + '"></label>';
    html += '<div class="st-prop-row">' + num('X', 'pos', 0) + num('Y', 'pos', 1) + num('Z', 'pos', 2) + '</div>';
    html += '<div class="st-prop-row">' + num('SizeX', 'size', 0) + num('SizeY', 'size', 1) + num('SizeZ', 'size', 2) + '</div>';
    if (o.kind === 'tool') {
      html += '<label class="st-prop st-check"><input type="checkbox" data-starter="1"' + (o.starter ? ' checked' : '') + '> Give on spawn (StarterPack)</label>';
      html += '<button class="st-btn" data-editscript="1">' + (o.script ? 'Edit tool script' : '+ Add tool script') + '</button>';
    }
    html += '<button class="st-btn" data-delsel="1">Delete object</button>';
    el.innerHTML = html;
    el.querySelectorAll('input[data-key]').forEach(function (inp) {
      inp.oninput = function () {
        var v = parseFloat(inp.value); if (!isFinite(v)) return;
        o[inp.dataset.key][+inp.dataset.idx] = v;
        o.mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
        if (inp.dataset.key === 'size') {
          o.mesh.geometry.dispose();
          var old = o.mesh.children.slice();
          old.forEach(function (c) { o.mesh.remove(c); if (c.geometry) c.geometry.dispose(); });
          o.mesh.geometry = new THREE.BoxGeometry(o.size[0], o.size[1], o.size[2]);
          var edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.mesh.geometry), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
          o.mesh.add(edges);
        }
        if (o.helper) o.helper.update();
      };
    });
    var nameInp = el.querySelector('input[data-name]'); if (nameInp) nameInp.oninput = function () { o.name = nameInp.value; renderExplorer(); };
    var chk = el.querySelector('input[data-starter]'); if (chk) chk.onchange = function () { o.starter = chk.checked; renderExplorer(); };
    var del = el.querySelector('[data-delsel]'); if (del) del.onclick = function () { removeObject(o); };
    var es = el.querySelector('[data-editscript]'); if (es) es.onclick = function () { openToolScript(o); };
  }

  function status(t) { var s = root.querySelector('#st-status'); if (s) { s.textContent = t; clearTimeout(status._t); status._t = setTimeout(function () { s.textContent = ''; }, 3000); } }

  // =========================================================================
  //  SCRIPT EDITOR
  // =========================================================================
  var scTarget = null; // {type:'map', idx} or {type:'tool', obj}
  function buildScriptModal() {
    var modal = root.querySelector('#st-scripts');
    modal.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sc]'); if (!b) { if (e.target === modal) closeScript(); return; }
      if (b.dataset.sc === 'cancel') closeScript();
      else if (b.dataset.sc === 'ok') saveScript();
      else if (b.dataset.sc === 'run') testScript();
      else if (b.dataset.sc === 'docs') toggleDocs();
    });
  }
  function toggleDocs() {
    var d = root.querySelector('#st-sc-docs');
    if (d.classList.contains('open')) { d.classList.remove('open'); return; }
    if (!d.innerHTML) d.innerHTML = DOCS_HTML;
    d.classList.add('open');
  }
  var DOCS_HTML =
    '<h3>Luminary scripting</h3>' +
    '<p>Scripts are <b>JavaScript</b> with a Roblox-style API. Client (LocalScript) code runs in a sandbox in each player\'s browser and drives on-screen GUI and real audio. Waits are awaited: <code>await wait(1)</code>.</p>' +
    '<h4>Globals</h4><ul>' +
    '<li><code>game</code>, <code>workspace</code>, <code>game.GetService("Players"|"RunService"|"Lighting"|"StarterGui"|"SoundService"|"ReplicatedStorage"|...)</code></li>' +
    '<li><code>Instance.new("Part", parent?)</code> — Part, WedgePart, SpawnLocation, Model, Folder, Tool, Sound, Humanoid, ScreenGui, Frame, TextLabel, TextButton, ImageLabel, PointLight, Decal, IntValue, StringValue, BoolValue, …</li>' +
    '<li><code>Vector3.new(x,y,z)</code> (.Magnitude .Unit .add/.sub/.mul/.Dot/.Lerp), <code>Color3.fromRGB(r,g,b)</code>/<code>.new(r,g,b)</code>, <code>UDim2.new(sx,ox,sy,oy)</code>, <code>CFrame.new(x,y,z)</code>, <code>Enum.*</code></li>' +
    '<li><code>task.wait(s)</code>, <code>task.spawn(fn)</code>, <code>task.delay(s,fn)</code>, <code>wait(s)</code>, <code>tick()</code>, <code>print()</code>, <code>warn()</code>, <code>math</code>, <code>string</code></li>' +
    '</ul>' +
    '<h4>Properties</h4><p>Part: <code>Position</code> <code>Size</code> <code>Color</code> <code>Anchored</code> <code>CanCollide</code> <code>Transparency</code> <code>Material</code>. GUI: <code>Text</code> <code>TextColor3</code> <code>BackgroundColor3</code> <code>Position</code> <code>Size</code> <code>Visible</code>. Sound: <code>SoundId</code> <code>Volume</code> <code>Looped</code>.</p>' +
    '<h4>Methods</h4><p><code>:Destroy()</code> <code>:Clone()</code> <code>:FindFirstChild(name, recursive?)</code> <code>:FindFirstChildOfClass(cls)</code> <code>:GetChildren()</code> <code>:GetDescendants()</code> <code>:IsA(cls)</code> <code>:GetPropertyChangedSignal(prop)</code> <code>:ClearAllChildren()</code>. Sound: <code>:Play()</code> <code>:Pause()</code> <code>:Stop()</code>.</p>' +
    '<h4>Events</h4><p><code>inst.ChildAdded</code> <code>.ChildRemoved</code> <code>.Changed</code> <code>.Destroying</code>; Part <code>.Touched</code> <code>.TouchEnded</code>; <code>Players.PlayerAdded</code> <code>.PlayerRemoving</code>; <code>Player.CharacterAdded</code>; <code>Humanoid.Died</code> <code>.HealthChanged</code>; <code>RunService.Heartbeat</code> <code>.Stepped</code> <code>.RenderStepped</code>; <code>TextButton.MouseButton1Click</code>. Connect with <code>sig.Connect(fn)</code>; <code>sig.Wait()</code> returns a promise.</p>' +
    '<h4>Examples</h4>' +
    '<pre>// a killbrick\nvar b = Instance.new("Part", workspace)\nb.Position = Vector3.new(0, 5, 0); b.Color = Color3.fromRGB(196,40,28)\nb.Touched.Connect(function(hit){\n  var h = hit.Parent.FindFirstChildOfClass("Humanoid")\n  if (h) h.Health = 0\n})</pre>' +
    '<pre>// a score GUI that counts up\nvar gui = Instance.new("ScreenGui", game.GetService("StarterGui"))\nvar lbl = Instance.new("TextLabel", gui)\nlbl.Size = UDim2.new(0,200,0,40); lbl.Position = UDim2.new(0,20,0,20)\nlbl.BackgroundColor3 = Color3.fromRGB(0,0,0); lbl.TextColor3 = Color3.fromRGB(255,255,255)\nvar score = 0\ngame.GetService("RunService").Heartbeat.Connect(function(dt){\n  score += dt; lbl.Text = "Score: " + Math.floor(score)\n})</pre>' +
    '<pre>// background music\nvar s = Instance.new("Sound", workspace)\ns.SoundId = "12222019" // a Roblox asset id (served if available) or a URL\ns.Looped = true; s.Volume = 0.4; s.Play()</pre>' +
    '<p class="st-docnote">Server (Script) code is stored with your game but runs only where a server runtime exists — this client runtime executes LocalScripts. The world\'s physics is authoritative on the game server, so scripts here add logic, UI, sound and effects on top of it.</p>';
  function openScript(idx) {
    build();
    var modal = root.querySelector('#st-scripts');
    if (idx == null) { scTarget = { type: 'map', idx: -1 }; root.querySelector('#st-sc-name').value = 'Script'; root.querySelector('#st-sc-type').value = 'server'; root.querySelector('#st-sc-src').value = ''; }
    else { scTarget = { type: 'map', idx: idx }; var s = M.scripts[idx]; root.querySelector('#st-sc-name').value = s.name; root.querySelector('#st-sc-type').value = s.type; root.querySelector('#st-sc-src').value = s.source; }
    root.querySelector('#st-sc-type').disabled = false;
    root.querySelector('#st-sc-out').textContent = '';
    modal.classList.add('open');
  }
  function openToolScript(obj) {
    var modal = root.querySelector('#st-scripts');
    scTarget = { type: 'tool', obj: obj };
    root.querySelector('#st-sc-name').value = obj.name + 'Script';
    root.querySelector('#st-sc-type').value = 'client';
    root.querySelector('#st-sc-type').disabled = false;
    root.querySelector('#st-sc-src').value = obj.script || '';
    root.querySelector('#st-sc-out').textContent = '';
    modal.classList.add('open');
  }
  function closeScript() { root.querySelector('#st-scripts').classList.remove('open'); }
  function saveScript() {
    var name = root.querySelector('#st-sc-name').value.trim() || 'Script';
    var type = root.querySelector('#st-sc-type').value;
    var src = root.querySelector('#st-sc-src').value;
    if (scTarget.type === 'tool') { scTarget.obj.script = src; scTarget.obj.scriptType = type; }
    else if (scTarget.idx >= 0) { M.scripts[scTarget.idx] = { name: name, type: type, source: src }; }
    else { M.scripts.push({ name: name, type: type, source: src }); }
    closeScript(); renderExplorer();
  }
  function testScript() {
    var src = root.querySelector('#st-sc-src').value;
    var out = root.querySelector('#st-sc-out'); out.textContent = '';
    if (window.LuminaryScripts) {
      window.LuminaryScripts.test(src, function (line) { out.textContent += line + '\n'; });
    } else { out.textContent = 'Script runtime not loaded.'; }
  }

  // =========================================================================
  //  IMPORT  (.rbxlx XML fully; .rbxl binary best-effort → guidance)
  // =========================================================================
  function importFile(file) {
    status('Reading ' + file.name + '…');
    var r = new FileReader();
    r.onload = function () {
      var text = r.result;
      try {
        if (/^\s*<roblox[\s!]/.test(text) && text.indexOf('<Item') >= 0) importRbxlx(text);
        else if (text.indexOf('<roblox!') >= 0 || /\.rbxl$/i.test(file.name)) status('Binary .rbxl detected — please re-save in Studio as "Roblox XML (.rbxlx)" and import that. XML converts fully.');
        else status('Unrecognised file. Export as .rbxlx (Roblox XML place).');
      } catch (e) { status('Import failed: ' + e.message); }
    };
    r.readAsText(file);
  }

  // BrickColor → RGB for the most common classic colours (fallback: gray)
  var BRICK = { 1: [242, 243, 243], 5: [215, 197, 154], 21: [196, 40, 28], 23: [13, 105, 172], 24: [245, 205, 48], 26: [27, 42, 53], 28: [40, 127, 71], 102: [110, 153, 202], 104: [107, 50, 124], 105: [226, 155, 64], 106: [218, 133, 65], 107: [0, 143, 156], 119: [164, 189, 71], 141: [39, 70, 45], 192: [105, 64, 40], 194: [163, 162, 165], 199: [99, 95, 98], 208: [229, 228, 223], 1004: [255, 0, 0], 1011: [0, 16, 176] };

  function importRbxlx(xml) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('bad XML');
    var items = doc.getElementsByTagName('Item');
    var added = 0, skipped = 0, scripts = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var cls = it.getAttribute('class');
      var props = directProps(it);
      var PART_CLASSES = { Part: 1, TrussPart: 1, WedgePart: 1, CornerWedgePart: 1, MeshPart: 1, UnionOperation: 1, NegateOperation: 1, SpawnLocation: 1, Seat: 1, VehicleSeat: 1, Platform: 1, FlagStand: 1 };
      if (PART_CLASSES[cls]) {
        var pos = readVector(props, 'CFrame') || readVector(props, 'Position');
        var size = readVector(props, 'size') || readVector(props, 'Size');
        if (!pos || !size) { skipped++; continue; }
        var color = readColor(props);
        var name = readString(props, 'Name') || cls;
        if (cls === 'SpawnLocation' || cls === 'FlagStand') addObject({ kind: 'spawn', name: name, pos: pos, size: size, color: color || [245, 205, 48] });
        else addObject({ kind: 'block', name: name, pos: pos, size: size, color: color || [163, 162, 165] });
        added++;
        // a Tool's Handle sometimes carries a Sound/Script — captured below as nested Items
      } else if (cls === 'Tool' || cls === 'HopperBin') {
        var tn = readString(props, 'Name') || 'Tool';
        // pull a LocalScript source out of the tool if present (nested Item)
        var toolSrc = '';
        var kids = it.getElementsByTagName('Item');
        for (var ki = 0; ki < kids.length; ki++) { var kc = kids[ki].getAttribute('class'); if (kc === 'LocalScript' || kc === 'Script') { toolSrc = readString(directProps(kids[ki]), 'Source') || ''; break; } }
        addObject({ kind: 'tool', name: tn, pos: [0, 3 + added, 0], size: [1, 4, 1], color: [163, 162, 165], starter: hasAncestorClass(it, 'StarterPack'), script: toolSrc });
        added++;
      } else if (cls === 'Script' || cls === 'LocalScript' || cls === 'ModuleScript') {
        var sn = readString(props, 'Name') || cls;
        var src = readString(props, 'Source') || '';
        M.scripts.push({ name: sn, type: cls === 'Script' ? 'server' : 'client', source: src.slice(0, 100000) });
        scripts++;
      } else {
        skipped++; // no equivalent instance in our game — skip
      }
    }
    renderExplorer();
    status('Imported ' + added + ' parts, ' + scripts + ' scripts · skipped ' + skipped + ' unsupported.');
  }

  // Properties that belong directly to this Item (not to nested child Items).
  function directProps(item) {
    for (var c = item.firstElementChild; c; c = c.nextElementSibling) if (c.tagName === 'Properties') return c;
    return null;
  }
  function propEl(props, name) {
    if (!props) return null;
    for (var c = props.firstElementChild; c; c = c.nextElementSibling) if (c.getAttribute('name') === name) return c;
    return null;
  }
  function readString(props, name) { var e = propEl(props, name); return e ? e.textContent : null; }
  function readVector(props, name) {
    var e = propEl(props, name); if (!e) return null;
    function t(tag) { var n = e.getElementsByTagName(tag)[0]; return n ? parseFloat(n.textContent) : NaN; }
    var x = t('X'), y = t('Y'), z = t('Z');
    if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    return null;
  }
  function readColor(props) {
    var c3 = propEl(props, 'Color3uint8') || propEl(props, 'Color');
    if (c3) {
      var txt = c3.textContent.trim();
      if (/^\d+$/.test(txt)) { var v = parseInt(txt, 10) >>> 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
      var r = c3.getElementsByTagName('R')[0], g = c3.getElementsByTagName('G')[0], b = c3.getElementsByTagName('B')[0];
      if (r && g && b) return [Math.round(parseFloat(r.textContent) * 255), Math.round(parseFloat(g.textContent) * 255), Math.round(parseFloat(b.textContent) * 255)];
    }
    var bc = propEl(props, 'BrickColor') || propEl(props, 'Color3');
    if (bc && /^\d+$/.test(bc.textContent.trim())) { var idx = parseInt(bc.textContent, 10); return BRICK[idx] || [163, 162, 165]; }
    return null;
  }
  function hasAncestorClass(item, cls) {
    var p = item.parentElement;
    while (p) { if (p.tagName === 'Item' && p.getAttribute('class') === cls) return true; p = p.parentElement; }
    return false;
  }

  // =========================================================================
  //  SAVE / PLAY-TEST
  // =========================================================================
  function toMapDef() {
    var def = { name: (M.name || 'Untitled').trim(), blocks: [], spawns: [], tools: [], scripts: M.scripts.slice() };
    var hasBase = false;
    M.objects.forEach(function (o) {
      if (o.kind === 'block') { def.blocks.push({ pos: o.pos.slice(), size: o.size.slice(), color: o.color.slice() }); if (o.size[0] >= BASE) hasBase = true; }
      else if (o.kind === 'spawn') { def.spawns.push([o.pos[0], o.pos[1], o.pos[2]]); }
      else if (o.kind === 'tool') { def.tools.push({ name: o.name, color: o.color.slice(), pos: o.pos.slice(), starter: !!o.starter, script: o.script || '' }); }
    });
    if (!hasBase) def.blocks.unshift({ pos: [0, -1, 0], size: [BASE, 2, BASE], color: [75, 151, 75] });
    if (!def.spawns.length) def.spawns.push([0, 0.6, 0]);
    return def;
  }

  function save() {
    var def = toMapDef();
    if (!def.name || def.name === 'Untitled Place' || def.name === 'Untitled') { status('Name your place first.'); return; }
    status(M.mapId ? 'Saving changes…' : 'Publishing…');
    var url = M.mapId && M.owned ? '/api/maps/' + M.mapId : '/api/maps';
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-lum-key': lumKey() }, body: JSON.stringify(def) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { status('Save failed: ' + (res.j.error || 'error')); return; }
        var id = M.mapId || (res.j.map && res.j.map.id);
        status('Saved! Loading your place…');
        if (window.LuminaryGames && id) window.LuminaryGames.play(id);
        else close();
      }).catch(function (e) { status('Save failed: ' + e.message); });
  }

  function playtest() {
    // save silently (if named) then play; otherwise just play current unsaved not possible — publish first
    save();
  }

  // =========================================================================
  //  LIFECYCLE
  // =========================================================================
  function loadMap(mapId) {
    return fetch('/api/maps/' + mapId, { headers: { 'x-lum-key': lumKey() } }).then(function (r) { return r.json(); }).then(function (m) {
      if (!m || m.error) return;
      M.name = m.name || 'Untitled Place'; M.mapId = m.id; M.owned = !!m.owned;
      root.querySelector('#st-name').value = M.name;
      (m.blocks || []).forEach(function (b) { addObject({ kind: 'block', name: 'Part', pos: b.pos.slice(), size: b.size.slice(), color: (b.color || [163, 162, 165]).slice() }); });
      (m.spawns || []).forEach(function (s) { addObject({ kind: 'spawn', name: 'SpawnLocation', pos: [s[0], s[1], s[2]], size: [6, 1.2, 6], color: [245, 205, 48] }); });
      (m.tools || []).forEach(function (t) { addObject({ kind: 'tool', name: t.name || 'Tool', pos: (t.pos || [0, 3, 0]).slice(), size: [1, 4, 1], color: (t.color || [163, 162, 165]).slice(), starter: !!t.starter, script: t.script || '' }); });
      M.scripts = (m.scripts || []).slice();
      renderExplorer();
      status(M.owned ? 'Editing your place.' : 'Opened a copy (not yours — Save & publish makes a new place).');
      if (!M.owned) M.mapId = null; // can't overwrite someone else's map; publish as new
    });
  }

  function reset() {
    M.objects.forEach(function (o) { if (o.mesh) V.scene.remove(o.mesh); });
    M.objects = []; M.scripts = []; M.sel = null; M.nextUid = 1; M.name = 'Untitled Place'; M.mapId = null; M.owned = false;
    if (V && V.selHelper) { V.scene.remove(V.selHelper); V.selHelper = null; }
  }

  function open(mapId) {
    build();
    root.classList.add('open');
    document.body.classList.add('studio-open');
    ensureThree().then(function () {
      if (!V) initViewer(); else reset();
      resize();
      renderExplorer(); renderProps();
      if (mapId) loadMap(mapId);
      else if (!M.objects.length) { addObject({ kind: 'block', name: 'Baseplate', pos: [0, -1, 0], size: [BASE, 2, BASE], color: [75, 151, 75] }); addObject({ kind: 'spawn', name: 'SpawnLocation', pos: [0, 0.6, 0], size: [6, 1.2, 6], color: [245, 205, 48] }); }
    }).catch(function (e) { status('3D editor unavailable: ' + e.message); });
  }
  function close() {
    if (root) root.classList.remove('open');
    document.body.classList.remove('studio-open');
    keys = {};
  }

  window.LuminaryMaker = { open: open, close: close };
})();
