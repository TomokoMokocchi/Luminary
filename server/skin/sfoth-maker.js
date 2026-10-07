/* ===========================================================================
   Luminary — Map maker
   A Three.js voxel-style editor: build on a baseplate with coloured blocks and
   spawn pads, orbit the camera, name it and save. Saved maps are PUBLIC and
   appear in everyone's games sidebar. window.LuminaryMaker.open() shows it.
   =========================================================================== */
(function () {
  'use strict';
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var G = 4;              // grid / cube size (studs)
  var BASE = 64;         // baseplate span (studs)

  var PALETTE = [
    [163, 162, 165], [99, 95, 98], [27, 42, 53], [255, 255, 255], [196, 40, 28], [255, 176, 0],
    [245, 205, 48], [75, 151, 75], [40, 127, 71], [0, 162, 255], [13, 105, 172], [107, 50, 124],
  ];

  var THREE = null, loading = null;
  function ensureThree() {
    if (window.THREE) { THREE = window.THREE; return Promise.resolve(THREE); }
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = THREE_URL; s.async = true;
      s.onload = function () { THREE = window.THREE; res(THREE); };
      s.onerror = function () { rej(new Error('three.js failed to load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  var root = null, V = null; // viewer state
  var tool = 'block', color = [0, 162, 255].slice ? [0, 162, 255] : [0, 162, 255];
  var baseColor = [75, 151, 75];
  var blocks = new Map(); // "x,y,z" -> {x,y,z,color,mesh}
  var spawns = [];        // {x,y,z,mesh}

  function key(x, y, z) { return x + ',' + y + ',' + z; }
  function col(rgb) { return (new THREE.Color()).setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'lum-maker';
    root.innerHTML =
      '<div class="mk-modal">' +
        '<div class="mk-head"><span class="mk-title"><span class="rbx-cube"></span>Map Maker</span>' +
          '<button class="mk-x" aria-label="Close">×</button></div>' +
        '<div class="mk-body">' +
          '<div class="mk-stage"><canvas id="mk-canvas"></canvas></div>' +
          '<div class="mk-side">' +
            '<div><label>Tools</label><div class="mk-tools">' +
              '<button class="mk-tool active" data-t="block">▦ Block</button>' +
              '<button class="mk-tool" data-t="spawn">⚑ Spawn</button>' +
              '<button class="mk-tool" data-t="delete">🗑 Delete</button>' +
              '<button class="mk-tool" data-t="orbit">✋ Orbit</button>' +
            '</div></div>' +
            '<div><label>Block colour</label><div class="mk-colors" id="mk-colors"></div></div>' +
            '<div><label>Baseplate colour</label><div class="mk-colors" id="mk-base"></div></div>' +
            '<div class="mk-row"><button class="mk-btn" data-act="clear">Clear blocks</button></div>' +
            '<p class="mk-hint">Drag empty space to orbit · scroll to zoom.<br>' +
              '<b>Block</b>: click a surface to stack a cube.<br>' +
              '<b>Spawn</b>: click a surface to drop a spawn pad.<br>' +
              '<b>Delete</b>: click a cube/spawn to remove it.</p>' +
          '</div>' +
        '</div>' +
        '<div class="mk-foot">' +
          '<input type="text" id="mk-name" class="gl-search" placeholder="Map name" maxlength="40" style="max-width:260px">' +
          '<span class="mk-spacer"></span>' +
          '<span id="mk-status" class="mk-hint"></span>' +
          '<button class="mk-btn" data-act="cancel">Cancel</button>' +
          '<button class="mk-btn primary" data-act="save">Save &amp; publish</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelector('.mk-x').onclick = close;
    root.querySelector('[data-act="cancel"]').onclick = close;
    root.querySelector('[data-act="clear"]').onclick = clearBlocks;
    root.querySelector('[data-act="save"]').onclick = save;
    root.querySelectorAll('.mk-tool').forEach(function (b) {
      b.onclick = function () { tool = b.dataset.t; root.querySelectorAll('.mk-tool').forEach(function (x) { x.classList.toggle('active', x === b); }); };
    });
    // colour palettes
    var mc = root.querySelector('#mk-colors'), mb = root.querySelector('#mk-base');
    mc.innerHTML = PALETTE.map(function (c, i) { return '<button class="av-sw' + (i === 9 ? ' sel' : '') + '" data-c="' + c.join(',') + '" style="background:rgb(' + c.join(',') + ')"></button>'; }).join('');
    mb.innerHTML = PALETTE.map(function (c) { return '<button class="av-sw' + (c[0] === 75 ? ' sel' : '') + '" data-c="' + c.join(',') + '" style="background:rgb(' + c.join(',') + ')"></button>'; }).join('');
    mc.addEventListener('click', function (e) { var s = e.target.closest('.av-sw'); if (!s) return; color = s.dataset.c.split(',').map(Number); mc.querySelectorAll('.av-sw').forEach(function (x) { x.classList.toggle('sel', x === s); }); });
    mb.addEventListener('click', function (e) { var s = e.target.closest('.av-sw'); if (!s) return; baseColor = s.dataset.c.split(',').map(Number); mb.querySelectorAll('.av-sw').forEach(function (x) { x.classList.toggle('sel', x === s); }); if (V) V.base.material.color.copy(col(baseColor)); });
  }

  function initViewer() {
    var canvas = root.querySelector('#mk-canvas');
    var w = canvas.clientWidth || 560, h = 460;
    var scene = new THREE.Scene(); scene.background = new THREE.Color(0x101216);
    var camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 2000);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.05));
    var dir = new THREE.DirectionalLight(0xffffff, 0.55); dir.position.set(40, 80, 40); scene.add(dir);

    // baseplate
    var base = new THREE.Mesh(new THREE.BoxGeometry(BASE, 2, BASE), new THREE.MeshLambertMaterial({ color: col(baseColor) }));
    base.position.y = -1; scene.add(base);
    // grid overlay
    var grid = new THREE.GridHelper(BASE, BASE / G, 0x3a3f47, 0x2a2e34); grid.position.y = 0.02; scene.add(grid);

    var raycaster = new THREE.Raycaster();
    V = { scene: scene, camera: camera, renderer: renderer, base: base, ray: raycaster,
          yaw: 0.7, pitch: 0.9, dist: 90, target: new THREE.Vector3(0, 4, 0), dragging: false, moved: false };
    placeCamera();

    var loop = function () { if (!V) return; renderer.render(scene, camera); V.raf = requestAnimationFrame(loop); };
    loop();

    // input
    var lx = 0, ly = 0, down = false, button = 0;
    canvas.addEventListener('pointerdown', function (e) { down = true; V.moved = false; lx = e.clientX; ly = e.clientY; button = e.button; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      if (Math.abs(dx) + Math.abs(dy) > 3) V.moved = true;
      if (tool === 'orbit' || button === 2 || e.shiftKey) {
        V.yaw -= dx * 0.01; V.pitch = Math.max(0.15, Math.min(1.5, V.pitch - dy * 0.01)); placeCamera();
      }
      lx = e.clientX; ly = e.clientY;
    });
    canvas.addEventListener('pointerup', function (e) {
      down = false; try { canvas.releasePointerCapture(e.pointerId); } catch (x) {}
      if (!V.moved && tool !== 'orbit' && button !== 2) handleClick(e);
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); V.dist = Math.max(25, Math.min(260, V.dist + (e.deltaY > 0 ? 8 : -8))); placeCamera(); }, { passive: false });
  }

  function placeCamera() {
    var c = V.camera, t = V.target;
    c.position.set(
      t.x + V.dist * Math.cos(V.pitch) * Math.sin(V.yaw),
      t.y + V.dist * Math.sin(V.pitch),
      t.z + V.dist * Math.cos(V.pitch) * Math.cos(V.yaw)
    );
    c.lookAt(t);
  }

  function pickables() {
    var arr = [V.base];
    blocks.forEach(function (b) { arr.push(b.mesh); });
    spawns.forEach(function (s) { arr.push(s.mesh); });
    return arr;
  }

  function handleClick(e) {
    var canvas = V.renderer.domElement, r = canvas.getBoundingClientRect();
    var m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    V.ray.setFromCamera(m, V.camera);
    var hits = V.ray.intersectObjects(pickables(), false);
    if (!hits.length) return;
    var hit = hits[0];

    if (tool === 'delete') {
      var ud = hit.object.userData;
      if (ud && ud.blockKey && blocks.has(ud.blockKey)) { V.scene.remove(hit.object); blocks.delete(ud.blockKey); }
      else if (ud && ud.spawnIdx != null) { var sp = spawns[ud.spawnIdx]; if (sp) { V.scene.remove(sp.mesh); spawns.splice(ud.spawnIdx, 1); reindexSpawns(); } }
      return;
    }

    // compute placement cell from hit point + face normal
    var n = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
    var p = hit.point.clone().add(n.multiplyScalar(G * 0.5));
    var cx = Math.round(p.x / G) * G;
    var cz = Math.round(p.z / G) * G;
    // y: snap cube centers to G/2 + k*G (so a cube sits on y=0 baseplate at y=G/2)
    var cy = Math.max(G / 2, Math.round((p.y - G / 2) / G) * G + G / 2);
    var lim = BASE / 2 - G / 2;
    if (cx < -lim || cx > lim || cz < -lim || cz > lim) return;

    if (tool === 'block') addBlock(cx, cy, cz, color);
    else if (tool === 'spawn') addSpawn(cx, cz, hit);
  }

  function addBlock(cx, cy, cz, c) {
    var k = key(cx, cy, cz);
    if (blocks.has(k)) return;
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(G, G, G), new THREE.MeshLambertMaterial({ color: col(c) }));
    mesh.position.set(cx, cy, cz); mesh.userData.blockKey = k;
    // thin black edges for readability
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.25, transparent: true }));
    mesh.add(edges);
    V.scene.add(mesh);
    blocks.set(k, { x: cx, y: cy, z: cz, color: c.slice(), mesh: mesh });
  }

  function addSpawn(cx, cz, hit) {
    // place pad centre 0.6 above the surface the click landed on
    var topY = hit.point.y; // surface height
    var yc = topY + 0.6;
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 6), new THREE.MeshLambertMaterial({ color: col([245, 205, 48]) }));
    mesh.position.set(cx, yc, cz);
    var idx = spawns.length; mesh.userData.spawnIdx = idx;
    V.scene.add(mesh);
    spawns.push({ x: cx, y: yc, z: cz, mesh: mesh });
  }

  function reindexSpawns() { spawns.forEach(function (s, i) { s.mesh.userData.spawnIdx = i; }); }

  function clearBlocks() {
    blocks.forEach(function (b) { V.scene.remove(b.mesh); }); blocks.clear();
    spawns.forEach(function (s) { V.scene.remove(s.mesh); }); spawns.length = 0;
  }

  function toMapDef() {
    var out = { name: (root.querySelector('#mk-name').value || 'Untitled').trim(), blocks: [], spawns: [] };
    // baseplate first
    out.blocks.push({ pos: [0, -1, 0], size: [BASE, 2, BASE], color: baseColor.slice() });
    blocks.forEach(function (b) { out.blocks.push({ pos: [b.x, b.y, b.z], size: [G, G, G], color: b.color.slice() }); });
    spawns.forEach(function (s) { out.spawns.push([s.x, s.y, s.z]); });
    if (!out.spawns.length) out.spawns.push([0, 0.6, 0]); // ensure spawnable
    return out;
  }

  async function save() {
    var status = root.querySelector('#mk-status');
    var def = toMapDef();
    if (!def.name || def.name === 'Untitled') { status.textContent = 'Name your map first.'; return; }
    status.textContent = 'Publishing…';
    try {
      var r = await fetch('/api/maps', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(def) });
      var j = await r.json();
      if (r.ok && j.map) {
        status.textContent = 'Published! Loading your map…';
        // make the new public map the active world and reload into it
        if (window.LuminaryGames) { window.LuminaryGames.select(j.map.id); }
        else { close(); }
      } else { status.textContent = 'Save failed.'; }
    } catch (e) { status.textContent = 'Save failed: ' + e.message; }
  }

  function open() {
    build();
    root.classList.add('open');
    ensureThree().then(function () { if (!V) initViewer(); })
      .catch(function (e) { var s = root.querySelector('.mk-stage'); if (s) s.innerHTML = '<p class="av-err">3D editor unavailable (' + e.message + ')</p>'; });
  }
  function close() { if (root) root.classList.remove('open'); }

  window.LuminaryMaker = { open: open, close: close };
})();
