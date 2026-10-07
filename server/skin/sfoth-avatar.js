/* ===========================================================================
   Luminary — Avatar editor  (rebuilt)
     * 2016-Roblox-style "Customize" modal with a live, drag-to-rotate 3D preview
     * Body type: Classic R6 (blocky) or Slim R6 (thinner limbs + torso)
     * Skin colour, classic faces, and REAL clothing textures (shirt + pants)
       drawn as procedural "template" textures (solid / tee / stripes / plaid /
       tuxedo / overalls / hoodie), so clothes actually show up with texture.
     * A few ready-made Packages (one-click looks).
     * Randomize / Reset / Save — persisted to localStorage + cookie and applied
       live. getAppearance() returns the saved look; sendToGame() pushes it to
       the running client so other players' rosters can pick it up.
   =========================================================================== */
(function () {
  'use strict';

  // Served locally so the editor works with no external CDN / offline.
  var THREE_URL = '/sfoth-skin/three.min.js';
  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  // classic Roblox BrickColor-ish palette
  var PALETTE = [
    [245, 205, 48], [248, 217, 109], [204, 142, 105], [234, 184, 146], [170, 127, 110],
    [160, 95, 53], [105, 64, 40], [245, 243, 215], [255, 255, 255], [163, 162, 165],
    [99, 95, 98], [27, 42, 53], [0, 0, 0], [196, 40, 28], [255, 89, 89],
    [218, 134, 122], [255, 176, 0], [218, 133, 65], [245, 125, 32], [255, 245, 115],
    [75, 151, 75], [40, 127, 71], [161, 196, 140], [0, 143, 156], [0, 162, 255],
    [13, 105, 172], [45, 71, 156], [107, 50, 124], [163, 75, 139], [255, 152, 220]
  ];

  // clothing "template" patterns, drawn on a canvas and mapped onto the body
  var PATTERNS = ['solid', 'tee', 'stripes', 'plaid', 'tuxedo', 'overalls', 'hoodie'];
  var FACES = ['smile', 'happy', 'cool', 'surprised', 'cheeky', 'serious', 'robot'];

  var DEFAULT = {
    bodyType: 'classic',
    skin: [245, 205, 48],
    face: 'smile',
    shirt: { color: [0, 162, 255], pattern: 'tee' },
    pants: { color: [40, 127, 71], pattern: 'solid' }
  };

  // one-click looks
  var PACKAGES = [
    { name: 'Classic', bodyType: 'classic', skin: [245, 205, 48], face: 'smile', shirt: { color: [0, 162, 255], pattern: 'tee' }, pants: { color: [40, 127, 71], pattern: 'solid' } },
    { name: 'Ninja (slim)', bodyType: 'slim', skin: [234, 184, 146], face: 'serious', shirt: { color: [27, 42, 53], pattern: 'hoodie' }, pants: { color: [27, 42, 53], pattern: 'solid' } },
    { name: 'Tuxedo', bodyType: 'slim', skin: [234, 184, 146], face: 'cool', shirt: { color: [255, 255, 255], pattern: 'tuxedo' }, pants: { color: [27, 42, 53], pattern: 'solid' } },
    { name: 'Lumberjack', bodyType: 'classic', skin: [204, 142, 105], face: 'happy', shirt: { color: [196, 40, 28], pattern: 'plaid' }, pants: { color: [45, 71, 156], pattern: 'overalls' } },
    { name: 'Robot', bodyType: 'classic', skin: [163, 162, 165], face: 'robot', shirt: { color: [99, 95, 98], pattern: 'solid' }, pants: { color: [99, 95, 98], pattern: 'solid' } },
    { name: 'Sporty (slim)', bodyType: 'slim', skin: [248, 217, 109], face: 'cheeky', shirt: { color: [255, 176, 0], pattern: 'stripes' }, pants: { color: [13, 105, 172], pattern: 'solid' } }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try { var a = JSON.parse(localStorage.getItem('luminary_avatar')); if (a && a.skin) return migrate(a); } catch (e) {}
    return clone(DEFAULT);
  }
  function migrate(a) {
    // tolerate the old {skin,shirt:[r,g,b],pants:[r,g,b]} format
    if (Array.isArray(a.shirt)) a.shirt = { color: a.shirt, pattern: 'tee' };
    if (Array.isArray(a.pants)) a.pants = { color: a.pants, pattern: 'solid' };
    if (!a.bodyType) a.bodyType = 'classic';
    if (!a.face) a.face = 'smile';
    if (!a.shirt) a.shirt = clone(DEFAULT.shirt);
    if (!a.pants) a.pants = clone(DEFAULT.pants);
    return a;
  }
  function save(a) {
    try { localStorage.setItem('luminary_avatar', JSON.stringify(a)); } catch (e) {}
    try { document.cookie = 'luminary_avatar=' + encodeURIComponent(JSON.stringify(a)) + ';path=/;max-age=31536000;samesite=lax'; } catch (e) {}
  }

  var state = load();
  var THREE = null, loading = null;
  var viewer = null;

  function ensureThree() {
    if (window.THREE) { THREE = window.THREE; return Promise.resolve(THREE); }
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var tryLoad = function (url, next) {
        var s = document.createElement('script');
        s.src = url; s.async = true;
        s.onload = function () { THREE = window.THREE; THREE ? resolve(THREE) : next(); };
        s.onerror = next;
        document.head.appendChild(s);
      };
      tryLoad(THREE_URL, function () {
        tryLoad(THREE_CDN, function () { reject(new Error('three.js failed to load')); });
      });
    });
    return loading;
  }

  function col(rgb) { return (new THREE.Color()).setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }
  function rgbCss(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function shade(c, k) { return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)].map(function (v) { return Math.max(0, Math.min(255, v)); }); }

  // --- face texture --------------------------------------------------------
  function faceTexture(kind) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#1b1b1b'; g.strokeStyle = '#1b1b1b'; g.lineCap = 'round';
    function eye(x, w, h) { g.beginPath(); g.ellipse(x, 52, w, h, 0, 0, 7); g.fill(); }
    function mouth(arc, up) { g.lineWidth = 6; g.beginPath(); g.arc(64, up ? 64 : 74, 22, arc ? 0.15 * Math.PI : 1.15 * Math.PI, arc ? 0.85 * Math.PI : 1.85 * Math.PI); g.stroke(); }
    if (kind === 'robot') {
      g.fillRect(36, 44, 18, 14); g.fillRect(74, 44, 18, 14);
      g.lineWidth = 6; g.beginPath(); g.moveTo(44, 82); g.lineTo(84, 82); g.stroke();
      g.fillRect(58, 70, 12, 4);
    } else if (kind === 'cool') {
      g.fillRect(34, 46, 60, 14); g.fillRect(30, 50, 8, 6); g.fillRect(90, 50, 8, 6); // shades
      mouth(true, true);
    } else if (kind === 'surprised') {
      eye(46, 7, 9); eye(82, 7, 9); g.beginPath(); g.ellipse(64, 80, 9, 12, 0, 0, 7); g.fill();
    } else if (kind === 'cheeky') {
      eye(46, 7, 10); eye(82, 7, 10); mouth(true, false);
      g.fillStyle = 'rgba(255,120,120,.5)'; g.beginPath(); g.ellipse(40, 70, 9, 6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(88, 70, 9, 6, 0, 0, 7); g.fill();
    } else if (kind === 'serious') {
      eye(46, 7, 7); eye(82, 7, 7); g.lineWidth = 6; g.beginPath(); g.moveTo(48, 80); g.lineTo(80, 80); g.stroke();
    } else if (kind === 'happy') {
      eye(46, 7, 11); eye(82, 7, 11); mouth(true, false);
    } else { // smile (classic)
      eye(46, 7, 10); eye(82, 7, 10); mouth(true, false);
    }
    var t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  // --- clothing texture ----------------------------------------------------
  // Draws a 256x256 template for a body panel. `region` is 'torso'|'arm'|'leg'
  // so patterns can add collars, sleeves, cuffs etc.
  function clothTexture(spec, region) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    var base = spec.color, dark = shade(base, 0.72), light = shade(base, 1.18);
    g.fillStyle = rgbCss(base); g.fillRect(0, 0, 256, 256);
    var p = spec.pattern || 'solid';

    if (p === 'stripes') {
      g.fillStyle = rgbCss(light);
      for (var y = 0; y < 256; y += 40) g.fillRect(0, y, 256, 20);
    } else if (p === 'plaid') {
      g.fillStyle = rgbCss(dark);
      for (var x = 0; x < 256; x += 48) g.fillRect(x, 0, 24, 256);
      for (var yy = 0; yy < 256; yy += 48) g.fillRect(0, yy, 256, 24);
      g.fillStyle = 'rgba(0,0,0,.12)';
      for (var x2 = 24; x2 < 256; x2 += 48) g.fillRect(x2, 0, 6, 256);
    } else if (p === 'tee') {
      // a plain tee with a contrast collar on the torso
      if (region === 'torso') { g.fillStyle = rgbCss(dark); g.fillRect(84, 0, 88, 26); g.fillStyle = rgbCss(base); g.fillRect(96, 0, 64, 16); }
      if (region === 'arm') { g.fillStyle = rgbCss(dark); g.fillRect(0, 0, 256, 18); }
    } else if (p === 'hoodie') {
      g.fillStyle = rgbCss(dark);
      if (region === 'torso') { g.fillRect(0, 0, 256, 40); g.fillStyle = rgbCss(light); g.fillRect(112, 40, 10, 160); g.fillRect(134, 40, 10, 160); } // hood + drawstrings
      if (region === 'arm') { g.fillRect(0, 230, 256, 26); } // cuffs
      if (region === 'leg') { g.fillStyle = rgbCss(dark); g.fillRect(0, 230, 256, 26); }
    } else if (p === 'tuxedo') {
      if (region === 'torso') {
        g.fillStyle = rgbCss(dark); g.fillRect(0, 0, 256, 256);
        g.fillStyle = rgbCss(base); g.beginPath(); g.moveTo(96, 0); g.lineTo(160, 0); g.lineTo(128, 150); g.closePath(); g.fill(); // shirt front
        g.fillStyle = '#111'; g.fillRect(118, 20, 20, 18); // bow tie
        g.fillStyle = '#111'; g.fillRect(70, 0, 16, 256); g.fillRect(170, 0, 16, 256); // lapels
      } else { g.fillStyle = rgbCss(dark); g.fillRect(0, 0, 256, 256); }
    } else if (p === 'overalls') {
      g.fillStyle = rgbCss(dark);
      if (region === 'torso') { g.fillRect(0, 70, 256, 186); g.fillRect(96, 0, 24, 90); g.fillRect(136, 0, 24, 90); g.fillStyle = '#d9b600'; g.fillRect(104, 110, 10, 10); g.fillRect(142, 110, 10, 10); }
      if (region === 'leg') { g.fillRect(0, 0, 256, 256); }
    }
    // subtle fabric shading on all clothes
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(255,255,255,.06)'); grd.addColorStop(1, 'rgba(0,0,0,.14)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);

    var t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  function dims() {
    // R6 proportions in studs
    if (state.bodyType === 'slim') {
      return { torso: [1.6, 2, 0.9], head: 1.3, arm: [0.8, 2, 0.8], leg: [0.8, 2, 0.8], armX: 1.2, legX: 0.45 };
    }
    return { torso: [2, 2, 1], head: 1.4, arm: [1, 2, 1], leg: [1, 2, 1], armX: 1.5, legX: 0.5 };
  }

  function clothMat(spec, region) {
    return new THREE.MeshLambertMaterial({ map: clothTexture(spec, region) });
  }

  function buildCharacter(scene) {
    var d = dims();
    var parts = {};
    var mk = function (w, h, dp, material) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), material);
      scene.add(m); return m;
    };
    parts.torso = mk(d.torso[0], d.torso[1], d.torso[2], clothMat(state.shirt, 'torso')); parts.torso.position.y = 1;
    parts.head = mk(d.head, d.head, d.head, new THREE.MeshLambertMaterial({ color: col(state.skin) })); parts.head.position.y = 1 + d.torso[1] / 2 + d.head / 2;
    parts.armL = mk(d.arm[0], d.arm[1], d.arm[2], clothMat(state.shirt, 'arm')); parts.armL.position.set(-d.armX, 1, 0);
    parts.armR = mk(d.arm[0], d.arm[1], d.arm[2], clothMat(state.shirt, 'arm')); parts.armR.position.set(d.armX, 1, 0);
    parts.legL = mk(d.leg[0], d.leg[1], d.leg[2], clothMat(state.pants, 'leg')); parts.legL.position.set(-d.legX, -1, 0);
    parts.legR = mk(d.leg[0], d.leg[1], d.leg[2], clothMat(state.pants, 'leg')); parts.legR.position.set(d.legX, -1, 0);
    // face
    var face = new THREE.Mesh(new THREE.PlaneGeometry(d.head, d.head),
      new THREE.MeshBasicMaterial({ map: faceTexture(state.face), transparent: true }));
    face.position.set(0, 0, d.head / 2 + 0.005); parts.head.add(face);
    parts.face = face;
    return parts;
  }

  function rebuild() {
    if (!viewer) return;
    // dispose old
    Object.keys(viewer.parts).forEach(function (k) {
      var m = viewer.parts[k];
      if (!m) return;
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
    });
    viewer.parts = buildCharacter(viewer.pivot);
  }

  function applyLive() {
    // body type change needs a rebuild; everything else can rebuild too (cheap)
    rebuild();
  }

  function initViewer(canvas) {
    var scene = new THREE.Scene();
    var w = canvas.clientWidth || 360, h = canvas.clientHeight || 440;
    var camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(0, 1.4, 11);
    camera.lookAt(0, 1.2, 0);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.05));
    var dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(4, 8, 6); scene.add(dir);
    var pivot = new THREE.Group(); scene.add(pivot);
    viewer = { scene: scene, camera: camera, renderer: renderer, parts: {}, pivot: pivot, raf: 0, dragging: false, rot: 0 };
    viewer.parts = buildCharacter(pivot);
    var loop = function () {
      if (!viewer) return;
      if (!viewer.dragging) viewer.rot += 0.012;
      pivot.rotation.y = viewer.rot;
      renderer.render(scene, camera);
      viewer.raf = requestAnimationFrame(loop);
    };
    loop();
    var lastX = 0;
    canvas.addEventListener('pointerdown', function (e) { viewer.dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (viewer.dragging) { viewer.rot += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
    canvas.addEventListener('pointerup', function (e) { viewer.dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (x) {} });
  }

  // --- UI -----------------------------------------------------------------
  var root = null, tab = 'body';

  function swatchGrid(sel, attr) {
    return PALETTE.map(function (c) {
      var on = JSON.stringify(sel) === JSON.stringify(c);
      return '<button class="av-sw' + (on ? ' sel' : '') + '" data-pick="' + attr + '" data-c="' + c.join(',') + '" style="background:' + rgbCss(c) + '" title="' + c.join(',') + '"></button>';
    }).join('');
  }

  function patternRow(which) {
    var cur = state[which].pattern;
    return PATTERNS.map(function (p) {
      return '<button class="av-chip' + (p === cur ? ' sel' : '') + '" data-pattern="' + which + '" data-v="' + p + '">' + p + '</button>';
    }).join('');
  }
  function faceRow() {
    return FACES.map(function (f) {
      return '<button class="av-chip' + (f === state.face ? ' sel' : '') + '" data-face="' + f + '">' + f + '</button>';
    }).join('');
  }

  function renderPanel() {
    var body = root.querySelector('#av-tabbody');
    if (!body) return;
    if (tab === 'body') {
      body.innerHTML =
        '<label class="av-lbl">Body type</label>' +
        '<div class="av-seg">' +
          '<button class="av-chip' + (state.bodyType === 'classic' ? ' sel' : '') + '" data-body="classic">Classic R6</button>' +
          '<button class="av-chip' + (state.bodyType === 'slim' ? ' sel' : '') + '" data-body="slim">Slim R6</button>' +
        '</div>' +
        '<label class="av-lbl">Skin colour</label><div class="av-swatches">' + swatchGrid(state.skin, 'skin') + '</div>' +
        '<label class="av-lbl">Face</label><div class="av-chips">' + faceRow() + '</div>';
    } else if (tab === 'shirt') {
      body.innerHTML =
        '<label class="av-lbl">Shirt colour</label><div class="av-swatches">' + swatchGrid(state.shirt.color, 'shirt') + '</div>' +
        '<label class="av-lbl">Shirt template</label><div class="av-chips">' + patternRow('shirt') + '</div>';
    } else if (tab === 'pants') {
      body.innerHTML =
        '<label class="av-lbl">Pants colour</label><div class="av-swatches">' + swatchGrid(state.pants.color, 'pants') + '</div>' +
        '<label class="av-lbl">Pants template</label><div class="av-chips">' + patternRow('pants') + '</div>';
    } else if (tab === 'packages') {
      body.innerHTML = '<label class="av-lbl">Quick looks</label><div class="av-packages">' +
        PACKAGES.map(function (p, i) { return '<button class="av-pkg" data-pkg="' + i + '">' + p.name + '</button>'; }).join('') + '</div>';
    }
    root.querySelectorAll('.av-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
  }

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'lum-avatar';
    root.innerHTML =
      '<div class="av-modal">' +
        '<div class="av-head"><span class="av-title"><span class="rbx-cube"></span>Avatar Editor</span>' +
          '<button class="av-x" aria-label="Close">×</button></div>' +
        '<div class="av-body">' +
          '<div class="av-stage"><canvas id="av-canvas"></canvas><div class="av-hint">drag to rotate</div></div>' +
          '<div class="av-panel">' +
            '<div class="av-groups">' +
              '<button class="av-tab active" data-tab="body">Body</button>' +
              '<button class="av-tab" data-tab="shirt">Shirt</button>' +
              '<button class="av-tab" data-tab="pants">Pants</button>' +
              '<button class="av-tab" data-tab="packages">Packages</button>' +
            '</div>' +
            '<div id="av-tabbody" class="av-tabbody"></div>' +
            '<div class="av-actions">' +
              '<button class="av-btn" data-act="random">🎲 Randomize</button>' +
              '<button class="av-btn" data-act="reset">Reset</button>' +
              '<button class="av-btn primary" data-act="save">Save avatar</button>' +
            '</div>' +
            '<p class="av-note">Saved to your browser and applied to your in-game look.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelector('.av-x').onclick = close;
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.querySelectorAll('.av-tab').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; renderPanel(); }; });

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pick],[data-pattern],[data-face],[data-body],[data-pkg],[data-act]');
      if (!t) return;
      if (t.dataset.pick) {
        var c = t.dataset.c.split(',').map(Number);
        if (t.dataset.pick === 'skin') state.skin = c; else state[t.dataset.pick].color = c;
        renderPanel(); applyLive();
      } else if (t.dataset.pattern) {
        state[t.dataset.pattern].pattern = t.dataset.v; renderPanel(); applyLive();
      } else if (t.dataset.face) {
        state.face = t.dataset.face; renderPanel(); applyLive();
      } else if (t.dataset.body) {
        state.bodyType = t.dataset.body; renderPanel(); applyLive();
      } else if (t.dataset.pkg != null) {
        state = clone(PACKAGES[+t.dataset.pkg]); renderPanel(); applyLive();
      } else if (t.dataset.act === 'random') {
        state.skin = PALETTE[(Math.random() * PALETTE.length) | 0].slice();
        state.shirt = { color: PALETTE[(Math.random() * PALETTE.length) | 0].slice(), pattern: PATTERNS[(Math.random() * PATTERNS.length) | 0] };
        state.pants = { color: PALETTE[(Math.random() * PALETTE.length) | 0].slice(), pattern: PATTERNS[(Math.random() * PATTERNS.length) | 0] };
        state.face = FACES[(Math.random() * FACES.length) | 0];
        state.bodyType = Math.random() < 0.5 ? 'classic' : 'slim';
        renderPanel(); applyLive();
      } else if (t.dataset.act === 'reset') {
        state = clone(DEFAULT); renderPanel(); applyLive();
      } else if (t.dataset.act === 'save') {
        save(state); sendToGame();
        var b = t; var tx = b.textContent; b.textContent = 'Saved ✓';
        setTimeout(function () { b.textContent = tx; }, 1200);
      }
    });
  }

  // Push appearance to the running game if it exposes a hook (best-effort).
  function sendToGame() {
    try { window.dispatchEvent(new CustomEvent('luminary-avatar', { detail: clone(state) })); } catch (e) {}
    try { if (window.Luminary && typeof window.Luminary.setAppearance === 'function') window.Luminary.setAppearance(clone(state)); } catch (e) {}
  }

  function open() {
    build();
    root.classList.add('open');
    renderPanel();
    ensureThree().then(function () {
      var canvas = root.querySelector('#av-canvas');
      if (!viewer) initViewer(canvas); else applyLive();
    }).catch(function (e) {
      var stage = root.querySelector('.av-stage');
      if (stage) stage.innerHTML = '<p class="av-err">3D preview unavailable (' + e.message + ')</p>';
    });
  }
  function close() { if (root) root.classList.remove('open'); }

  window.LuminaryAvatar = { open: open, close: close, getAppearance: function () { return clone(state); }, sendToGame: sendToGame };
})();
