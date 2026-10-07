/* ===========================================================================
   Luminary — Avatar editor
     * a 2016-Roblox-style "Customize" modal
     * a live 3D render of the classic R6 character (Three.js), auto-rotating
     * pick Skin / Shirt / Pants colours from a classic BrickColor palette
     * Randomize / Reset / Save — persisted to localStorage + cookie
   window.LuminaryAvatar.open() shows it; getAppearance() returns the saved look.
   =========================================================================== */
(function () {
  'use strict';

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  // classic Roblox BrickColor-ish palette
  var PALETTE = [
    [245, 205, 48], [248, 217, 109], [204, 142, 105], [234, 184, 146], [170, 127, 110],
    [160, 95, 53], [105, 64, 40], [245, 243, 215], [255, 255, 255], [163, 162, 165],
    [99, 95, 98], [27, 42, 53], [0, 0, 0], [196, 40, 28], [255, 89, 89],
    [218, 134, 122], [255, 176, 0], [218, 133, 65], [245, 125, 32], [255, 245, 115],
    [75, 151, 75], [40, 127, 71], [161, 196, 140], [0, 143, 156], [0, 162, 255],
    [13, 105, 172], [45, 71, 156], [107, 50, 124], [163, 75, 139], [255, 152, 220],
  ];

  var DEFAULT = { skin: [245, 205, 48], shirt: [0, 162, 255], pants: [40, 127, 71] };

  function load() {
    try { var a = JSON.parse(localStorage.getItem('luminary_avatar')); if (a && a.skin) return a; } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function save(a) {
    try { localStorage.setItem('luminary_avatar', JSON.stringify(a)); } catch (e) {}
    try { document.cookie = 'luminary_avatar=' + encodeURIComponent(JSON.stringify(a)) + ';path=/;max-age=31536000;samesite=lax'; } catch (e) {}
  }

  var state = load();
  var THREE = null, loading = null;
  var viewer = null; // {scene,camera,renderer,parts,raf}

  function ensureThree() {
    if (THREE) return Promise.resolve(THREE);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = THREE_URL; s.async = true;
      s.onload = function () { THREE = window.THREE; resolve(THREE); };
      s.onerror = function () { reject(new Error('three.js failed to load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function col(rgb) { return (new THREE.Color()).setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }

  // classic smiley face as a canvas texture (transparent bg, drawn in front)
  function faceTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#1b1b1b';
    g.beginPath(); g.ellipse(46, 54, 7, 10, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(82, 54, 7, 10, 0, 0, 7); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#1b1b1b'; g.lineCap = 'round';
    g.beginPath(); g.arc(64, 70, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    var t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  function buildCharacter(scene) {
    var parts = {};
    var mk = function (w, h, d, color) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col(color) }));
      scene.add(m); return m;
    };
    // R6 proportions (studs): torso 2x2x1, head 1.4 cube-ish, limbs 1x2x1
    parts.torso = mk(2, 2, 1, state.shirt); parts.torso.position.y = 1;
    parts.head = mk(1.4, 1.4, 1.4, state.skin); parts.head.position.y = 2.7;
    parts.armL = mk(1, 2, 1, state.shirt); parts.armL.position.set(-1.5, 1, 0);
    parts.armR = mk(1, 2, 1, state.shirt); parts.armR.position.set(1.5, 1, 0);
    parts.legL = mk(1, 2, 1, state.pants); parts.legL.position.set(-0.5, -1, 0);
    parts.legR = mk(1, 2, 1, state.pants); parts.legR.position.set(0.5, -1, 0);
    // face
    var face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4),
      new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true }));
    face.position.set(0, 2.7, 0.705); parts.head.add(face); face.position.set(0, 0, 0.705);
    parts.face = face;
    return parts;
  }

  function applyColors() {
    if (!viewer) return;
    var p = viewer.parts;
    p.head.material.color.copy(col(state.skin));
    p.torso.material.color.copy(col(state.shirt));
    p.armL.material.color.copy(col(state.shirt));
    p.armR.material.color.copy(col(state.shirt));
    p.legL.material.color.copy(col(state.pants));
    p.legR.material.color.copy(col(state.pants));
  }

  function initViewer(canvas) {
    var scene = new THREE.Scene();
    var w = canvas.clientWidth || 360, h = canvas.clientHeight || 420;
    var camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(0, 1.4, 11);
    camera.lookAt(0, 1.2, 0);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.05));
    var dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(4, 8, 6); scene.add(dir);
    var pivot = new THREE.Group(); scene.add(pivot);
    var parts = buildCharacter(pivot);
    viewer = { scene: scene, camera: camera, renderer: renderer, parts: parts, pivot: pivot, raf: 0, dragging: false, rot: 0 };
    var loop = function () {
      if (!viewer) return;
      if (!viewer.dragging) viewer.rot += 0.012;
      pivot.rotation.y = viewer.rot;
      renderer.render(scene, camera);
      viewer.raf = requestAnimationFrame(loop);
    };
    loop();
    // drag to spin
    var lastX = 0;
    canvas.addEventListener('pointerdown', function (e) { viewer.dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (viewer.dragging) { viewer.rot += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
    canvas.addEventListener('pointerup', function (e) { viewer.dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (x) {} });
  }

  // --- UI -----------------------------------------------------------------
  var root = null, activeGroup = 'skin';

  function swatchGrid() {
    return PALETTE.map(function (c) {
      var sel = JSON.stringify(state[activeGroup]) === JSON.stringify(c);
      return '<button class="av-sw' + (sel ? ' sel' : '') + '" data-c="' + c.join(',') + '" ' +
        'style="background:rgb(' + c.join(',') + ')" title="' + c.join(',') + '"></button>';
    }).join('');
  }

  function renderPanel() {
    var grid = root.querySelector('#av-swatches');
    if (grid) grid.innerHTML = swatchGrid();
    root.querySelectorAll('.av-group').forEach(function (b) {
      b.classList.toggle('active', b.dataset.g === activeGroup);
    });
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
              '<button class="av-group active" data-g="skin">Skin</button>' +
              '<button class="av-group" data-g="shirt">Shirt</button>' +
              '<button class="av-group" data-g="pants">Pants</button>' +
            '</div>' +
            '<div id="av-swatches" class="av-swatches"></div>' +
            '<div class="av-actions">' +
              '<button class="av-btn" data-act="random">🎲 Randomize</button>' +
              '<button class="av-btn" data-act="reset">Reset</button>' +
              '<button class="av-btn primary" data-act="save">Save avatar</button>' +
            '</div>' +
            '<p class="av-note">Saved to your browser. Your look shows here in the editor.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelector('.av-x').onclick = close;
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.querySelectorAll('.av-group').forEach(function (b) {
      b.onclick = function () { activeGroup = b.dataset.g; renderPanel(); };
    });
    root.addEventListener('click', function (e) {
      var sw = e.target.closest('.av-sw');
      if (sw) { state[activeGroup] = sw.dataset.c.split(',').map(Number); renderPanel(); applyColors(); return; }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'random') {
        state.skin = PALETTE[(Math.random() * PALETTE.length) | 0];
        state.shirt = PALETTE[(Math.random() * PALETTE.length) | 0];
        state.pants = PALETTE[(Math.random() * PALETTE.length) | 0];
        renderPanel(); applyColors();
      } else if (act.dataset.act === 'reset') {
        state = JSON.parse(JSON.stringify(DEFAULT)); renderPanel(); applyColors();
      } else if (act.dataset.act === 'save') {
        save(state);
        var b = act; var t = b.textContent; b.textContent = 'Saved ✓';
        setTimeout(function () { b.textContent = t; }, 1200);
      }
    });
  }

  function open() {
    build();
    root.classList.add('open');
    renderPanel();
    ensureThree().then(function () {
      var canvas = root.querySelector('#av-canvas');
      if (!viewer) initViewer(canvas); else applyColors();
    }).catch(function (e) {
      var stage = root.querySelector('.av-stage');
      if (stage) stage.innerHTML = '<p class="av-err">3D preview unavailable (' + e.message + ')</p>';
    });
  }
  function close() { if (root) root.classList.remove('open'); }

  window.LuminaryAvatar = { open: open, close: close, getAppearance: function () { return JSON.parse(JSON.stringify(state)); } };
})();
