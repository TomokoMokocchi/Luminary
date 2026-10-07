/* ===========================================================================
   Luminary — Avatar Editor  (full customizer)
     * A real 3D character (Classic R6 or Slim) rendered with three.js, built
       from proper proportions, soft lighting and a ground shadow — not a flat
       box toy.
     * 3D accessories you actually wear: HAIR, HATS and FACE ACCESSORIES, all
       built procedurally from meshes (no external asset downloads) and tinted
       to any colour.
     * A big CLOTHING library drawn as template textures across real styles —
       y2k, goth, scene, emo, punk, preppy, streetwear, formal, feminine and
       masculine looks — for shirts and pants, each colourable.
     * Faces, skin tones, hair/clothing colours, and one-click full-outfit
       PACKAGES (Y2K, Goth, Scene, Emo, Preppy, Punk, Streetwear, Formal, …).
     * Everything is categorised like the Roblox avatar page, live-previewed,
       saved per browser, and broadcast to the running game.
   window.LuminaryAvatar.open() shows it; getAppearance() returns the look.
   =========================================================================== */
(function () {
  'use strict';

  var THREE_URL = '/sfoth-skin/three.min.js';
  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  // ---- palettes ----------------------------------------------------------
  var SKIN = [
    [255, 204, 153], [245, 205, 48], [248, 217, 109], [234, 184, 146], [204, 142, 105],
    [170, 127, 110], [160, 95, 53], [120, 80, 55], [105, 64, 40], [80, 50, 35],
    [245, 243, 215], [255, 255, 255], [163, 162, 165], [120, 160, 180], [180, 150, 220]
  ];
  var HAIR_COLORS = [
    [30, 22, 18], [60, 40, 28], [90, 56, 35], [120, 80, 45], [160, 110, 60], [205, 160, 95],
    [240, 220, 150], [255, 255, 255], [150, 150, 155], [20, 20, 22],
    [196, 40, 28], [230, 90, 150], [150, 70, 200], [60, 120, 220], [40, 180, 160], [120, 200, 70]
  ];
  var CLOTH_COLORS = [
    [27, 42, 53], [0, 0, 0], [255, 255, 255], [163, 162, 165], [99, 95, 98],
    [196, 40, 28], [230, 90, 150], [255, 120, 180], [255, 176, 0], [245, 205, 48],
    [75, 151, 75], [40, 127, 71], [0, 162, 255], [13, 105, 172], [45, 71, 156],
    [150, 70, 200], [107, 50, 124], [120, 200, 70], [255, 100, 60], [90, 210, 200]
  ];

  // ---- catalogs ----------------------------------------------------------
  var FACES = ['smile', 'happy', 'cool', 'wink', 'kawaii', 'uwu', 'cheeky', 'serious', 'surprised', 'angry', 'dead', 'robot'];
  var HAIR = ['none', 'buzz', 'short', 'spiky', 'mohawk', 'afro', 'long', 'ponytail', 'pigtails', 'bun', 'emoswoop', 'scene', 'curtains'];
  var HATS = ['none', 'beanie', 'cap', 'tophat', 'cowboy', 'crown', 'halo', 'horns', 'catears', 'bunnyears', 'headphones', 'mohawkspike'];
  var FACEACC = ['none', 'sunglasses', 'glasses', '3dglasses', 'eyepatch', 'mask', 'heartglasses', 'monocle'];
  var SHIRTS = ['plain', 'tee', 'hoodie', 'stripes', 'flannel', 'tuxedo', 'goth', 'y2k', 'scene', 'emo', 'punk', 'preppy', 'croptop', 'tanktop', 'graphic', 'corset', 'varsity'];
  var PANTS = ['plain', 'jeans', 'cargo', 'skirt', 'ripped', 'plaid', 'stripes', 'shorts', 'fishnet', 'overalls', 'sweats', 'leggings'];

  var DEFAULT = {
    bodyType: 'classic', skin: [255, 204, 153], face: 'smile',
    hair: { style: 'short', color: [60, 40, 28] },
    hat: 'none', faceAcc: 'none',
    shirt: { style: 'tee', color: [0, 162, 255] },
    pants: { style: 'jeans', color: [45, 71, 156] },
    costume: 'none'
  };

  // one-click full outfits
  var PACKAGES = [
    { name: 'Classic', look: { bodyType: 'classic', skin: [255, 204, 153], face: 'smile', hair: { style: 'short', color: [60, 40, 28] }, hat: 'none', faceAcc: 'none', shirt: { style: 'tee', color: [0, 162, 255] }, pants: { style: 'jeans', color: [45, 71, 156] } } },
    { name: 'Y2K Girl', look: { bodyType: 'slim', skin: [234, 184, 146], face: 'kawaii', hair: { style: 'pigtails', color: [240, 220, 150] }, hat: 'none', faceAcc: 'heartglasses', shirt: { style: 'croptop', color: [255, 120, 180] }, pants: { style: 'jeans', color: [120, 180, 230] } } },
    { name: 'Goth', look: { bodyType: 'slim', skin: [220, 210, 215], face: 'serious', hair: { style: 'emoswoop', color: [20, 20, 22] }, hat: 'none', faceAcc: 'none', shirt: { style: 'goth', color: [20, 20, 22] }, pants: { style: 'fishnet', color: [10, 10, 12] } } },
    { name: 'Scene Kid', look: { bodyType: 'slim', skin: [245, 205, 170], face: 'uwu', hair: { style: 'scene', color: [230, 90, 150] }, hat: 'none', faceAcc: 'glasses', shirt: { style: 'scene', color: [20, 20, 22] }, pants: { style: 'skinny', color: [20, 20, 22] } } },
    { name: 'Emo', look: { bodyType: 'slim', skin: [230, 210, 200], face: 'dead', hair: { style: 'emoswoop', color: [20, 20, 22] }, hat: 'none', faceAcc: 'none', shirt: { style: 'emo', color: [20, 20, 22] }, pants: { style: 'ripped', color: [25, 25, 30] } } },
    { name: 'Preppy', look: { bodyType: 'classic', skin: [234, 184, 146], face: 'happy', hair: { style: 'curtains', color: [120, 80, 45] }, hat: 'none', faceAcc: 'glasses', shirt: { style: 'preppy', color: [255, 255, 255] }, pants: { style: 'plain', color: [45, 71, 156] } } },
    { name: 'Punk', look: { bodyType: 'classic', skin: [204, 142, 105], face: 'angry', hair: { style: 'mohawk', color: [196, 40, 28] }, hat: 'none', faceAcc: 'sunglasses', shirt: { style: 'punk', color: [20, 20, 22] }, pants: { style: 'plaid', color: [120, 30, 30] } } },
    { name: 'Streetwear', look: { bodyType: 'classic', skin: [160, 110, 70], face: 'cool', hair: { style: 'short', color: [20, 20, 22] }, hat: 'cap', faceAcc: 'none', shirt: { style: 'hoodie', color: [40, 40, 45] }, pants: { style: 'cargo', color: [90, 90, 80] } } },
    { name: 'Formal', look: { bodyType: 'slim', skin: [234, 184, 146], face: 'cool', hair: { style: 'short', color: [60, 40, 28] }, hat: 'tophat', faceAcc: 'monocle', shirt: { style: 'tuxedo', color: [255, 255, 255] }, pants: { style: 'plain', color: [27, 42, 53] } } },
    { name: 'E-girl', look: { bodyType: 'slim', skin: [245, 210, 190], face: 'uwu', hair: { style: 'pigtails', color: [230, 90, 150] }, hat: 'catears', faceAcc: 'none', shirt: { style: 'corset', color: [20, 20, 22] }, pants: { style: 'fishnet', color: [20, 20, 22] } } },
    { name: 'E-boy', look: { bodyType: 'slim', skin: [230, 200, 185], face: 'serious', hair: { style: 'curtains', color: [20, 20, 22] }, hat: 'none', faceAcc: 'none', shirt: { style: 'flannel', color: [120, 30, 30] }, pants: { style: 'ripped', color: [20, 20, 25] } } },
    { name: 'Vaporwave', look: { bodyType: 'classic', skin: [200, 180, 220], face: 'cool', hair: { style: 'long', color: [150, 70, 200] }, hat: 'none', faceAcc: '3dglasses', shirt: { style: 'graphic', color: [230, 90, 150] }, pants: { style: 'plain', color: [90, 210, 200] } } }
  ];

  var CATS = [
    { id: 'packages', label: 'Packages' },
    { id: 'costume', label: 'Costumes' },
    { id: 'body', label: 'Body' },
    { id: 'face', label: 'Face' },
    { id: 'hair', label: 'Hair' },
    { id: 'hats', label: 'Hats' },
    { id: 'faceacc', label: 'Face' },
    { id: 'shirt', label: 'Shirts' },
    { id: 'pants', label: 'Pants' }
  ];

  // ---- persistence -------------------------------------------------------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function migrate(a) {
    if (!a || typeof a !== 'object') return clone(DEFAULT);
    if (Array.isArray(a.shirt)) a.shirt = { style: 'tee', color: a.shirt };
    if (Array.isArray(a.pants)) a.pants = { style: 'plain', color: a.pants };
    if (typeof a.hair !== 'object') a.hair = clone(DEFAULT.hair);
    for (var k in DEFAULT) if (a[k] == null) a[k] = clone(DEFAULT[k]);
    if (a.shirt && !a.shirt.style) a.shirt.style = 'tee';
    if (a.pants && !a.pants.style) a.pants.style = 'plain';
    if (a.costume == null) a.costume = 'none';
    return a;
  }
  function load() { try { var a = JSON.parse(localStorage.getItem('luminary_avatar')); if (a) return migrate(a); } catch (e) {} return clone(DEFAULT); }
  function save(a) {
    try { localStorage.setItem('luminary_avatar', JSON.stringify(a)); } catch (e) {}
    try { document.cookie = 'luminary_avatar=' + encodeURIComponent(JSON.stringify(a)) + ';path=/;max-age=31536000;samesite=lax'; } catch (e) {}
  }

  var state = load();
  var THREE = null, loading = null, viewer = null;

  function ensureThree() {
    if (window.THREE) { THREE = window.THREE; return Promise.resolve(THREE); }
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var tryLoad = function (url, next) {
        var s = document.createElement('script'); s.src = url; s.async = true;
        s.onload = function () { THREE = window.THREE; THREE ? resolve(THREE) : next(); };
        s.onerror = next; document.head.appendChild(s);
      };
      tryLoad(THREE_URL, function () { tryLoad(THREE_CDN, function () { reject(new Error('three.js failed to load')); }); });
    });
    return loading;
  }

  function col(rgb) { return (new THREE.Color()).setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }
  function rgbCss(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function shade(c, k) { return c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); }); }

  // =========================================================================
  //  REAL AVATAR MESHES  (the actual Roblox R6 geometry + accessory costumes)
  // =========================================================================
  // The engine ships every mesh — the R6 head/torso/limbs AND the robot
  // accessory costumes — inline inside roblox-assets/runtime.json
  // ({ meshes:{ path -> {positions,normals,uvs,indices} }, botAppearances }).
  // We load that once and render the SAME geometry the game uses, so the editor
  // preview is the real avatar, not a stand-in. Costumes come straight from
  // botAppearances (mesh + texture + body colours).
  var RT = { data: null, promise: null, geo: {}, costumes: [] };
  // The game (and its asset tree) is mounted under /SFOTH/ on this server.
  var ASSET_BASE = '/SFOTH/roblox-assets/';
  function loadRuntime() {
    if (RT.promise) return RT.promise;
    RT.promise = fetch(ASSET_BASE + 'runtime.json').then(function (r) { return r.json(); }).then(function (d) {
      RT.data = d;
      var ba = d.botAppearances || {};
      RT.costumes = Object.keys(ba).map(function (k) {
        var b = ba[k];
        return { id: 'bot-' + k, name: b.name, mesh: b.mesh, texture: b.texture, colors: b.colors };
      });
      if (d.botHat && d.botHat.mesh) RT.costumes.push({ id: 'bothat', name: d.botHat.name || 'Spy Hat', mesh: d.botHat.mesh, texture: d.botHat.texture, colors: d.botHat.colors });
      return d;
    }).catch(function () { RT.data = null; return null; });
    return RT.promise;
  }
  function meshData(path) { return RT.data && RT.data.meshes ? RT.data.meshes[path] : null; }
  // Build (and cache) a THREE.BufferGeometry from a runtime mesh record.
  function meshGeo(path) {
    if (RT.geo[path]) return RT.geo[path];
    var m = meshData(path); if (!m) return null;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.positions), 3));
    if (m.normals && m.normals.length === m.positions.length) g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(m.normals), 3));
    if (m.uvs) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(m.uvs), 2));
    if (m.indices) g.setIndex(m.indices);
    if (!m.normals || m.normals.length !== m.positions.length) g.computeVertexNormals();
    RT.geo[path] = g; return g;
  }
  // Roblox mesh textures use a top-left UV origin; keep flipY off so they map
  // the same way the game maps them.
  var _texCache = {};
  function assetTexture(path) {
    if (_texCache[path]) return _texCache[path];
    var t = new THREE.TextureLoader().load(ASSET_BASE + path);
    t.flipY = false; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = 3001;
    _texCache[path] = t; return t;
  }
  function costumeById(id) { for (var i = 0; i < RT.costumes.length; i++) if (RT.costumes[i].id === id) return RT.costumes[i]; return null; }

  // =========================================================================
  //  TEXTURES
  // =========================================================================
  function faceTexture(kind) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'); g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#1b1b1b'; g.strokeStyle = '#1b1b1b'; g.lineCap = 'round';
    function eye(x, w, h) { g.beginPath(); g.ellipse(x, 54, w, h, 0, 0, 7); g.fill(); }
    function smile(up) { g.lineWidth = 6; g.beginPath(); g.arc(64, up ? 66 : 70, 20, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke(); }
    function blush() { g.fillStyle = 'rgba(255,120,150,.55)'; g.beginPath(); g.ellipse(38, 72, 10, 6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(90, 72, 10, 6, 0, 0, 7); g.fill(); g.fillStyle = '#1b1b1b'; }
    if (kind === 'robot') { g.fillRect(34, 46, 20, 14); g.fillRect(74, 46, 20, 14); g.lineWidth = 6; g.beginPath(); g.moveTo(44, 84); g.lineTo(84, 84); g.stroke(); }
    else if (kind === 'cool') { g.fillRect(32, 48, 64, 14); g.fillRect(28, 52, 8, 7); g.fillRect(92, 52, 8, 7); smile(true); }
    else if (kind === 'wink') { eye(46, 7, 10); g.lineWidth = 5; g.beginPath(); g.moveTo(74, 54); g.lineTo(90, 54); g.stroke(); smile(false); }
    else if (kind === 'kawaii') { eye(46, 8, 11); eye(82, 8, 11); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(48, 51, 3, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(84, 51, 3, 3, 0, 0, 7); g.fill(); g.fillStyle = '#1b1b1b'; smile(false); blush(); }
    else if (kind === 'uwu') { g.lineWidth = 5; g.beginPath(); g.arc(46, 56, 8, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); g.beginPath(); g.arc(82, 56, 8, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); g.beginPath(); g.moveTo(58, 72); g.lineTo(64, 78); g.lineTo(70, 72); g.stroke(); blush(); }
    else if (kind === 'cheeky') { eye(46, 7, 10); eye(82, 7, 10); smile(false); blush(); }
    else if (kind === 'serious') { eye(46, 7, 7); eye(82, 7, 7); g.lineWidth = 6; g.beginPath(); g.moveTo(50, 82); g.lineTo(78, 82); g.stroke(); }
    else if (kind === 'surprised') { eye(46, 8, 10); eye(82, 8, 10); g.beginPath(); g.ellipse(64, 82, 8, 11, 0, 0, 7); g.fill(); }
    else if (kind === 'angry') { g.lineWidth = 6; g.beginPath(); g.moveTo(38, 44); g.lineTo(56, 52); g.moveTo(90, 44); g.lineTo(72, 52); g.stroke(); eye(48, 7, 8); eye(80, 7, 8); g.beginPath(); g.arc(64, 84, 16, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
    else if (kind === 'dead') { g.lineWidth = 5; g.beginPath(); g.moveTo(40, 48); g.lineTo(52, 60); g.moveTo(52, 48); g.lineTo(40, 60); g.moveTo(76, 48); g.lineTo(88, 60); g.moveTo(88, 48); g.lineTo(76, 60); g.stroke(); g.beginPath(); g.arc(64, 84, 10, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }
    else if (kind === 'happy') { eye(46, 7, 11); eye(82, 7, 11); smile(false); }
    else { eye(46, 7, 10); eye(82, 7, 10); smile(false); } // smile
    var t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  // Clothing template textures. region: 'torso' | 'arm' | 'leg'.
  function clothTexture(style, color, region) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    var base = color, dk = shade(color, 0.68), lt = shade(color, 1.22);
    g.fillStyle = rgbCss(base); g.fillRect(0, 0, 256, 256);
    function band(y, h, cc) { g.fillStyle = rgbCss(cc); g.fillRect(0, y, 256, h); }
    function collar() { if (region === 'torso') { g.fillStyle = rgbCss(dk); g.fillRect(84, 0, 88, 24); g.fillStyle = rgbCss(base); g.fillRect(98, 0, 60, 14); } }

    switch (style) {
      case 'tee': collar(); if (region === 'arm') band(0, 16, dk); break;
      case 'stripes': for (var y = 0; y < 256; y += 40) band(y, 20, lt); break;
      case 'flannel': case 'plaid':
        g.fillStyle = rgbCss(dk); for (var x = 0; x < 256; x += 48) g.fillRect(x, 0, 24, 256);
        for (var yy = 0; yy < 256; yy += 48) g.fillRect(0, yy, 256, 24);
        g.fillStyle = 'rgba(255,255,255,.18)'; for (var x2 = 24; x2 < 256; x2 += 48) g.fillRect(x2, 0, 6, 256); break;
      case 'hoodie':
        g.fillStyle = rgbCss(dk);
        if (region === 'torso') { g.fillRect(0, 0, 256, 44); g.fillStyle = rgbCss(lt); g.fillRect(112, 44, 8, 150); g.fillRect(136, 44, 8, 150); g.fillStyle = rgbCss(dk); g.fillRect(70, 150, 116, 40); }
        else band(230, 26, dk); break;
      case 'tuxedo':
        g.fillStyle = rgbCss(dk); g.fillRect(0, 0, 256, 256);
        if (region === 'torso') { g.fillStyle = rgbCss(base); g.beginPath(); g.moveTo(96, 0); g.lineTo(160, 0); g.lineTo(128, 160); g.closePath(); g.fill(); g.fillStyle = '#111'; g.fillRect(116, 18, 24, 16); g.fillStyle = '#0a0a0a'; g.fillRect(66, 0, 18, 256); g.fillRect(172, 0, 18, 256); } break;
      case 'goth':
        g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = '#2a2a30'; g.lineWidth = 4;
        if (region === 'torso') { for (var s = 40; s < 220; s += 40) { g.beginPath(); g.moveTo(40, s); g.lineTo(216, s); g.stroke(); } g.fillStyle = '#7a7a86'; for (var b = 0; b < 4; b++) g.fillRect(118, 50 + b * 42, 20, 10); }
        else { g.fillStyle = '#7a7a86'; g.fillRect(0, 60, 256, 8); g.fillRect(0, 150, 256, 8); } break;
      case 'y2k':
        g.fillStyle = rgbCss(base); g.fillRect(0, 0, 256, 256);
        // sparkle + butterfly vibe
        g.fillStyle = 'rgba(255,255,255,.5)'; for (var i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 2, 0, 7); g.fill(); }
        if (region === 'torso') { g.fillStyle = rgbCss(shade(base, 1.4)); g.beginPath(); g.ellipse(100, 120, 22, 16, -0.4, 0, 7); g.ellipse(156, 120, 22, 16, 0.4, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(126, 108, 4, 28); } break;
      case 'scene':
        // neon zebra
        g.fillStyle = '#121214'; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = rgbCss(shade(base, 1.5)); g.lineWidth = 10;
        for (var z = -60; z < 300; z += 34) { g.beginPath(); g.moveTo(z, 0); g.quadraticCurveTo(z + 30, 128, z, 256); g.stroke(); } break;
      case 'emo':
        g.fillStyle = '#0d0d10'; g.fillRect(0, 0, 256, 256);
        if (region === 'torso') { g.fillStyle = '#e4e4e8'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('♥', 128, 110); g.fillRect(78, 130, 100, 6); g.fillStyle = '#9a9aa2'; g.font = '14px sans-serif'; g.fillText('x_x', 128, 160); } break;
      case 'punk':
        g.fillStyle = '#141416'; g.fillRect(0, 0, 256, 256);
        g.fillStyle = '#c0c0c8'; for (var sx = 30; sx < 226; sx += 28) for (var sy = 30; sy < 226; sy += 50) { g.beginPath(); g.arc(sx, sy, 4, 0, 7); g.fill(); }
        g.strokeStyle = '#c0392b'; g.lineWidth = 6; if (region === 'torso') { g.beginPath(); g.moveTo(60, 40); g.lineTo(196, 210); g.stroke(); } break;
      case 'preppy':
        if (region === 'torso') { collar(); g.fillStyle = rgbCss(shade(base, 0.6)); g.fillRect(118, 24, 8, 120); g.fillStyle = rgbCss([196, 40, 28]); g.fillRect(96, 20, 64, 12); } break;
      case 'croptop':
        g.fillStyle = region === 'torso' ? rgbCss(base) : 'rgba(0,0,0,0)';
        if (region === 'torso') { g.clearRect(0, 150, 256, 106); g.fillStyle = rgbCss(base); g.fillRect(0, 0, 256, 150); g.fillStyle = rgbCss(dk); g.fillRect(70, 0, 20, 150); g.fillRect(166, 0, 20, 150); }
        else { g.clearRect(0, 0, 256, 256); } break;
      case 'tanktop':
        if (region === 'torso') { g.fillStyle = rgbCss(base); g.fillRect(0, 0, 256, 256); g.clearRect(0, 0, 90, 70); g.clearRect(166, 0, 90, 70); }
        else g.clearRect(0, 0, 256, 256); break;
      case 'corset':
        g.fillStyle = '#121214'; g.fillRect(0, 0, 256, 256);
        if (region === 'torso') { g.strokeStyle = '#d0d0d8'; g.lineWidth = 3; for (var l = 60; l < 200; l += 22) { g.beginPath(); g.moveTo(108, l); g.lineTo(148, l + 10); g.moveTo(148, l); g.lineTo(108, l + 10); g.stroke(); } } break;
      case 'varsity':
        band(0, 60, dk); band(196, 60, dk);
        if (region === 'arm') { band(90, 26, lt); band(140, 26, lt); } break;
      case 'graphic':
        g.fillStyle = rgbCss(base); g.fillRect(0, 0, 256, 256);
        if (region === 'torso') { g.fillStyle = rgbCss(shade(base, 1.5)); g.fillRect(78, 70, 100, 100); g.fillStyle = '#111'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('☆', 128, 140); } break;
      default: break; // plain
    }
    // soft fabric shading
    var grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, 'rgba(255,255,255,.07)'); grd.addColorStop(1, 'rgba(0,0,0,.16)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    var t = new THREE.CanvasTexture(c); t.needsUpdate = true; t.anisotropy = 4; return t;
  }

  function clothMat(spec, region) {
    var transparent = (spec.style === 'croptop' || spec.style === 'tanktop');
    return new THREE.MeshLambertMaterial({ map: clothTexture(spec.style, spec.color, region), transparent: transparent });
  }

  // =========================================================================
  //  3D ACCESSORY BUILDERS  (all return THREE.Group, head-local coords)
  // =========================================================================
  function mat(color) { return new THREE.MeshLambertMaterial({ color: col(color) }); }
  function mesh(geo, color, pos, rot, scale) {
    var m = new THREE.Mesh(geo, color.isMaterial ? color : mat(color));
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    return m;
  }

  function buildHair(style, color, hs) {
    var g = new THREE.Group(); if (style === 'none') return g;
    var top = hs / 2, half = hs / 2;
    var cap = function () { g.add(mesh(new THREE.BoxGeometry(hs + 0.12, hs * 0.4, hs + 0.12), color, [0, top - hs * 0.08, 0])); };
    if (style === 'buzz') g.add(mesh(new THREE.BoxGeometry(hs + 0.08, hs * 0.22, hs + 0.08), color, [0, top - hs * 0.02, 0]));
    else if (style === 'short') { cap(); g.add(mesh(new THREE.BoxGeometry(hs + 0.1, hs * 0.5, 0.18), color, [0, hs * 0.05, -half - 0.02])); }
    else if (style === 'spiky') { cap(); for (var i = 0; i < 7; i++) { var a = (i / 6 - 0.5) * hs; g.add(mesh(new THREE.ConeGeometry(0.12, 0.4, 5), color, [a, top + 0.18, (i % 2 ? 0.15 : -0.15)])); } }
    else if (style === 'mohawk') { for (var m2 = 0; m2 < 6; m2++) g.add(mesh(new THREE.BoxGeometry(0.16, 0.3 + (3 - Math.abs(m2 - 2.5)) * 0.12, 0.5), color, [0, top + 0.12, -half * 0.5 + m2 * (hs / 6)])); }
    else if (style === 'mohawkspike') { for (var m3 = 0; m3 < 6; m3++) g.add(mesh(new THREE.ConeGeometry(0.1, 0.5, 4), color, [0, top + 0.22, -half * 0.5 + m3 * (hs / 6)])); }
    else if (style === 'afro') g.add(mesh(new THREE.SphereGeometry(hs * 0.78, 12, 12), color, [0, top + 0.05, 0]));
    else if (style === 'long') { cap(); g.add(mesh(new THREE.BoxGeometry(hs + 0.12, hs * 1.3, 0.2), color, [0, -hs * 0.35, -half - 0.02])); g.add(mesh(new THREE.BoxGeometry(0.2, hs * 1.1, hs * 0.7), color, [-half - 0.02, -hs * 0.2, 0])); g.add(mesh(new THREE.BoxGeometry(0.2, hs * 1.1, hs * 0.7), color, [half + 0.02, -hs * 0.2, 0])); }
    else if (style === 'ponytail') { cap(); var pt = mesh(new THREE.BoxGeometry(0.28, hs * 1.1, 0.28), color, [0, -hs * 0.1, -half - 0.25], [0.5, 0, 0]); g.add(pt); }
    else if (style === 'pigtails') { cap(); g.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, hs * 0.9, 8), color, [-half - 0.12, -hs * 0.2, 0], [0, 0, 0.5])); g.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, hs * 0.9, 8), color, [half + 0.12, -hs * 0.2, 0], [0, 0, -0.5])); }
    else if (style === 'bun') { cap(); g.add(mesh(new THREE.SphereGeometry(0.28, 10, 10), color, [0, top + 0.22, -0.1])); }
    else if (style === 'emoswoop') { cap(); g.add(mesh(new THREE.BoxGeometry(hs * 0.8, hs * 0.5, 0.12), color, [hs * 0.12, hs * 0.18, half + 0.02], [0, 0, 0.35])); g.add(mesh(new THREE.BoxGeometry(hs + 0.1, hs, 0.18), color, [0, -hs * 0.1, -half - 0.02])); }
    else if (style === 'scene') { cap(); g.add(mesh(new THREE.BoxGeometry(hs * 0.9, hs * 0.55, 0.14), color, [0, hs * 0.2, half + 0.02], [0, 0, 0])); for (var sp = 0; sp < 5; sp++) g.add(mesh(new THREE.ConeGeometry(0.1, 0.35, 4), color, [(sp - 2) * (hs / 5), top + 0.16, -0.1])); g.add(mesh(new THREE.BoxGeometry(hs + 0.1, hs * 1.1, 0.18), color, [0, -hs * 0.15, -half - 0.02])); }
    else if (style === 'curtains') { cap(); g.add(mesh(new THREE.BoxGeometry(hs * 0.45, hs * 0.6, 0.14), color, [-hs * 0.28, hs * 0.12, half + 0.02], [0, 0, -0.3])); g.add(mesh(new THREE.BoxGeometry(hs * 0.45, hs * 0.6, 0.14), color, [hs * 0.28, hs * 0.12, half + 0.02], [0, 0, 0.3])); }
    return g;
  }

  function buildHat(style, hs) {
    var g = new THREE.Group(); if (style === 'none') return g;
    var top = hs / 2;
    if (style === 'beanie') g.add(mesh(new THREE.SphereGeometry(hs * 0.62, 14, 10, 0, 6.3, 0, Math.PI / 1.7), [196, 40, 28], [0, top - 0.05, 0]));
    else if (style === 'cap') { g.add(mesh(new THREE.SphereGeometry(hs * 0.6, 14, 10, 0, 6.3, 0, Math.PI / 2), [13, 105, 172], [0, top, 0])); g.add(mesh(new THREE.BoxGeometry(hs * 0.9, 0.08, hs * 0.55), [13, 105, 172], [0, top - 0.02, half(hs) + 0.25])); }
    else if (style === 'tophat') { g.add(mesh(new THREE.CylinderGeometry(hs * 0.5, hs * 0.5, hs * 0.9, 16), [20, 20, 22], [0, top + hs * 0.4, 0])); g.add(mesh(new THREE.CylinderGeometry(hs * 0.85, hs * 0.85, 0.06, 16), [20, 20, 22], [0, top, 0])); }
    else if (style === 'cowboy') { g.add(mesh(new THREE.ConeGeometry(hs * 0.5, hs * 0.6, 16), [120, 80, 45], [0, top + hs * 0.28, 0])); g.add(mesh(new THREE.CylinderGeometry(hs * 1.0, hs * 1.0, 0.06, 20), [120, 80, 45], [0, top, 0], [1, 1, 0.8])); }
    else if (style === 'crown') { g.add(mesh(new THREE.CylinderGeometry(hs * 0.52, hs * 0.52, hs * 0.3, 14), [245, 205, 48], [0, top + 0.1, 0])); for (var s = 0; s < 8; s++) { var a = s / 8 * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(0.08, 0.22, 4), [245, 205, 48], [Math.cos(a) * hs * 0.52, top + 0.3, Math.sin(a) * hs * 0.52])); } }
    else if (style === 'halo') { var h = mesh(new THREE.TorusGeometry(hs * 0.5, 0.05, 8, 20), [255, 245, 140], [0, top + 0.45, 0], [Math.PI / 2, 0, 0]); h.material = new THREE.MeshBasicMaterial({ color: col([255, 245, 140]) }); g.add(h); }
    else if (style === 'horns') { g.add(mesh(new THREE.ConeGeometry(0.12, 0.4, 8), [230, 230, 220], [-hs * 0.3, top + 0.2, 0], [0, 0, 0.3])); g.add(mesh(new THREE.ConeGeometry(0.12, 0.4, 8), [230, 230, 220], [hs * 0.3, top + 0.2, 0], [0, 0, -0.3])); }
    else if (style === 'catears') { g.add(mesh(new THREE.ConeGeometry(0.18, 0.34, 4), [40, 40, 45], [-hs * 0.28, top + 0.16, 0])); g.add(mesh(new THREE.ConeGeometry(0.18, 0.34, 4), [40, 40, 45], [hs * 0.28, top + 0.16, 0])); }
    else if (style === 'bunnyears') { g.add(mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.1, 0.5, 4, 8) : new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), [255, 255, 255], [-hs * 0.22, top + 0.4, 0], [0, 0, 0.12])); g.add(mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.1, 0.5, 4, 8) : new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), [255, 255, 255], [hs * 0.22, top + 0.4, 0], [0, 0, -0.12])); }
    else if (style === 'headphones') { g.add(mesh(new THREE.TorusGeometry(hs * 0.6, 0.06, 8, 16, Math.PI), [30, 30, 34], [0, top + 0.05, 0])); g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), [30, 30, 34], [-half(hs) - 0.05, 0.05, 0], [0, 0, Math.PI / 2])); g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), [30, 30, 34], [half(hs) + 0.05, 0.05, 0], [0, 0, Math.PI / 2])); }
    return g;
  }
  function half(hs) { return hs / 2; }

  function buildFaceAcc(style, hs) {
    var g = new THREE.Group(); if (style === 'none') return g;
    var z = hs / 2 + 0.03, ey = 0.08;
    if (style === 'sunglasses') { g.add(mesh(new THREE.BoxGeometry(hs * 0.8, 0.26, 0.08), [15, 15, 18], [0, ey, z])); }
    else if (style === 'glasses') { var m = new THREE.MeshBasicMaterial({ color: 0x222228 }); g.add(mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 14), m, [-0.26, ey, z], [0, 0, 0])); g.add(mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 14), m, [0.26, ey, z], [0, 0, 0])); g.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), [34, 34, 40], [0, ey, z])); }
    else if (style === '3dglasses') { g.add(mesh(new THREE.BoxGeometry(hs * 0.38, 0.24, 0.06), [196, 40, 28], [-0.2, ey, z])); g.add(mesh(new THREE.BoxGeometry(hs * 0.38, 0.24, 0.06), [13, 105, 172], [0.2, ey, z])); }
    else if (style === 'heartglasses') { var hm = new THREE.MeshBasicMaterial({ color: 0xff5aa0 }); g.add(mesh(new THREE.BoxGeometry(0.3, 0.26, 0.05), hm, [-0.24, ey, z])); g.add(mesh(new THREE.BoxGeometry(0.3, 0.26, 0.05), hm, [0.24, ey, z])); }
    else if (style === 'eyepatch') { g.add(mesh(new THREE.BoxGeometry(0.28, 0.3, 0.06), [10, 10, 12], [-0.26, ey, z])); g.add(mesh(new THREE.TorusGeometry(hs * 0.52, 0.02, 4, 16), [10, 10, 12], [0, ey, 0], [0, 0, 0.4])); }
    else if (style === 'monocle') { g.add(mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 14), new THREE.MeshBasicMaterial({ color: 0xd4b24a }), [0.26, ey, z])); }
    else if (style === 'mask') { g.add(mesh(new THREE.BoxGeometry(hs * 0.7, 0.34, 0.1), [230, 230, 235], [0, -0.22, z - 0.02])); }
    return g;
  }

  // =========================================================================
  //  CHARACTER
  // =========================================================================
  function dims() {
    if (state.bodyType === 'slim') return { torso: [1.6, 2, 0.9], head: 1.3, arm: [0.78, 2, 0.78], leg: [0.82, 2, 0.82], armX: 1.19, legX: 0.46 };
    return { torso: [2, 2, 1], head: 1.4, arm: [1, 2, 1], leg: [1, 2, 1], armX: 1.5, legX: 0.5 };
  }

  // Material for a real mesh part. DoubleSide so winding never hides a face in
  // the preview; a plain colour unless a texture is given.
  function meshMat(color) { return new THREE.MeshLambertMaterial({ color: col(color), side: THREE.DoubleSide }); }
  function texMat(path) { return new THREE.MeshLambertMaterial({ map: assetTexture(path), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }); }
  function rtMesh(path, material, pos, scale) {
    var g = meshGeo(path); if (!g) return null;
    var m = new THREE.Mesh(g, material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    return m;
  }

  function buildCharacter(pivot) {
    var parts = {};
    var cz = costumeById(state.costume);          // active full costume (or null)
    var haveMesh = !!meshData('builtin/avatar/meshes/torso.mesh');

    // ---- REAL R6 geometry (the same meshes the game renders) ---------------
    if (haveMesh) {
      var slim = state.bodyType === 'slim';
      var sx = slim ? 0.72 : 1;                    // slim narrows torso/limbs on X/Z
      var skinCol = cz ? cz.colors.head : state.skin;
      var torsoMat = cz ? meshMat(cz.colors.torso) : clothMat(state.shirt, 'torso');
      var armMat = function () { return cz ? meshMat(cz.colors.arms) : clothMat(state.shirt, 'arm'); };
      var legMat = function () { return cz ? meshMat(cz.colors.legs) : clothMat(state.pants, 'leg'); };

      parts.torso = rtMesh('builtin/avatar/meshes/torso.mesh', torsoMat, [0, 0, 0], [sx, 1, sx]); pivot.add(parts.torso);
      parts.head = rtMesh('builtin/avatar/heads/head.mesh', meshMat(skinCol), [0, 1.6, 0]); pivot.add(parts.head);
      parts.armL = rtMesh('builtin/avatar/meshes/leftarm.mesh', armMat(), [-1.5 * sx, 0, 0], [sx, 1, sx]); pivot.add(parts.armL);
      parts.armR = rtMesh('builtin/avatar/meshes/rightarm.mesh', armMat(), [1.5 * sx, 0, 0], [sx, 1, sx]); pivot.add(parts.armR);
      parts.legL = rtMesh('builtin/avatar/meshes/leftleg.mesh', legMat(), [-0.5 * sx, -2, 0], [sx, 1, sx]); pivot.add(parts.legL);
      parts.legR = rtMesh('builtin/avatar/meshes/rightleg.mesh', legMat(), [0.5 * sx, -2, 0], [sx, 1, sx]); pivot.add(parts.legR);

      // face decal on the rounded head front (head mesh bounds ~ ±0.6)
      if (parts.head) {
        var face = mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: faceTexture(state.face), transparent: true }), [0, 0.06, 0.63]);
        parts.head.add(face); parts.face = face;
      }

      if (cz) {
        // the robot costume shell, overlaid at the character root (torso centre)
        var cm = rtMesh(cz.mesh, texMat(cz.texture), [0, 0, 0]);
        if (cm) { pivot.add(cm); parts.costume = cm; }
      } else if (parts.head) {
        // procedural accessories only when not wearing a full costume
        parts.hair = buildHair(state.hair.style, state.hair.color, 1.2); parts.head.add(parts.hair);
        parts.hat = buildHat(state.hat, 1.2); parts.head.add(parts.hat);
        parts.faceAcc = buildFaceAcc(state.faceAcc, 1.2); parts.head.add(parts.faceAcc);
      }
      return parts;
    }

    // ---- fallback: block avatar (runtime.json not loaded yet) --------------
    var d = dims();
    parts.torso = mesh(new THREE.BoxGeometry(d.torso[0], d.torso[1], d.torso[2]), clothMat(state.shirt, 'torso'), [0, 1, 0]); pivot.add(parts.torso);
    parts.head = mesh(new THREE.BoxGeometry(d.head, d.head, d.head), mat(state.skin), [0, 1 + d.torso[1] / 2 + d.head / 2, 0]); pivot.add(parts.head);
    parts.armL = mesh(new THREE.BoxGeometry(d.arm[0], d.arm[1], d.arm[2]), clothMat(state.shirt, 'arm'), [-d.armX, 1, 0]); pivot.add(parts.armL);
    parts.armR = mesh(new THREE.BoxGeometry(d.arm[0], d.arm[1], d.arm[2]), clothMat(state.shirt, 'arm'), [d.armX, 1, 0]); pivot.add(parts.armR);
    parts.legL = mesh(new THREE.BoxGeometry(d.leg[0], d.leg[1], d.leg[2]), clothMat(state.pants, 'leg'), [-d.legX, -1, 0]); pivot.add(parts.legL);
    parts.legR = mesh(new THREE.BoxGeometry(d.leg[0], d.leg[1], d.leg[2]), clothMat(state.pants, 'leg'), [d.legX, -1, 0]); pivot.add(parts.legR);
    var face2 = mesh(new THREE.PlaneGeometry(d.head, d.head), new THREE.MeshBasicMaterial({ map: faceTexture(state.face), transparent: true }), [0, 0, d.head / 2 + 0.006]);
    parts.head.add(face2); parts.face = face2;
    parts.hair = buildHair(state.hair.style, state.hair.color, d.head); parts.head.add(parts.hair);
    parts.hat = buildHat(state.hat, d.head); parts.head.add(parts.hat);
    parts.faceAcc = buildFaceAcc(state.faceAcc, d.head); parts.head.add(parts.faceAcc);
    return parts;
  }

  function disposeDeep(o) {
    o.traverse(function (n) {
      if (n.geometry) n.geometry.dispose();
      if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); }
    });
  }
  function rebuild() {
    if (!viewer) return;
    var old = viewer.charGroup;
    if (old) { viewer.pivot.remove(old); disposeDeep(old); }
    var cg = new THREE.Group(); viewer.pivot.add(cg);
    viewer.parts = buildCharacter(cg);
    viewer.charGroup = cg;
  }

  function initViewer(canvas) {
    var scene = new THREE.Scene();
    var w = canvas.clientWidth || 380, h = canvas.clientHeight || 460;
    var camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 12); camera.lookAt(0, 1.0, 0);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h, false);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.0));
    var dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(5, 10, 7); scene.add(dir);
    var rim = new THREE.DirectionalLight(0x88aaff, 0.3); rim.position.set(-6, 3, -4); scene.add(rim);
    var pivot = new THREE.Group(); scene.add(pivot);
    // ground shadow
    var shadow = mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }), [0, -3.02, 0], [-Math.PI / 2, 0, 0]); scene.add(shadow);
    viewer = { scene: scene, camera: camera, renderer: renderer, pivot: pivot, parts: {}, charGroup: null, raf: 0, dragging: false, rot: 0 };
    rebuild();
    // Load the real avatar meshes; rebuild with them (and populate the costume
    // catalog) the moment they arrive. Until then the block avatar shows.
    loadRuntime().then(function () { if (viewer) { rebuild(); if (root && cat === 'costume') renderPanel(); } });
    var loop = function () { if (!viewer) return; if (!viewer.dragging) viewer.rot += 0.01; pivot.rotation.y = viewer.rot; renderer.render(scene, camera); viewer.raf = requestAnimationFrame(loop); };
    loop();
    var lastX = 0;
    canvas.addEventListener('pointerdown', function (e) { viewer.dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (viewer.dragging) { viewer.rot += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
    canvas.addEventListener('pointerup', function (e) { viewer.dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (x) {} });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); camera.position.z = Math.max(7, Math.min(18, camera.position.z + (e.deltaY > 0 ? 1 : -1))); }, { passive: false });
  }

  // =========================================================================
  //  UI
  // =========================================================================
  var root = null, cat = 'packages';

  function iconFor(category, item) {
    var map = {
      hair: { none: '🚫', buzz: '🧑', short: '💇', spiky: '🦔', mohawk: '🎸', mohawkspike: '⚡', afro: '🧑‍🦱', long: '👩', ponytail: '🎀', pigtails: '🎎', bun: '🥟', emoswoop: '🖤', scene: '🌈', curtains: '✂️' },
      hats: { none: '🚫', beanie: '🧢', cap: '🧢', tophat: '🎩', cowboy: '🤠', crown: '👑', halo: '😇', horns: '😈', catears: '🐱', bunnyears: '🐰', headphones: '🎧', mohawkspike: '⚡' },
      faceacc: { none: '🚫', sunglasses: '🕶️', glasses: '👓', '3dglasses': '🎦', eyepatch: '🏴‍☠️', mask: '😷', heartglasses: '💖', monocle: '🧐' },
      face: { smile: '🙂', happy: '😄', cool: '😎', wink: '😉', kawaii: '🥰', uwu: '😚', cheeky: '😊', serious: '😐', surprised: '😮', angry: '😠', dead: '😵', robot: '🤖' }
    };
    return (map[category] && map[category][item]) || '•';
  }

  function cardsHtml(items, sel, category, colorable) {
    return items.map(function (it) {
      var on = (it === sel);
      var thumb;
      if (category === 'shirt' || category === 'pants') {
        thumb = '<canvas class="av-thumb" width="40" height="40" data-style="' + it + '" data-region="' + (category === 'shirt' ? 'torso' : 'leg') + '"></canvas>';
      } else {
        thumb = '<span class="av-thumb-ic">' + iconFor(category, it) + '</span>';
      }
      return '<button class="av-card' + (on ? ' sel' : '') + '" data-item="' + it + '">' + thumb + '<span class="av-card-nm">' + it + '</span></button>';
    }).join('');
  }

  function colorRowHtml(colors, sel, tag) {
    return '<div class="av-colorrow">' + colors.map(function (c) {
      var on = JSON.stringify(c) === JSON.stringify(sel);
      return '<button class="av-sw' + (on ? ' sel' : '') + '" data-color="' + c.join(',') + '" data-ctag="' + tag + '" style="background:' + rgbCss(c) + '"></button>';
    }).join('') + '</div>';
  }

  function renderPanel() {
    var body = root.querySelector('#av-catbody'); if (!body) return;
    var html = '';
    if (cat === 'packages') {
      html = '<div class="av-pkgs">' + PACKAGES.map(function (p, i) { return '<button class="av-pkg" data-pkg="' + i + '">' + p.name + '</button>'; }).join('') + '</div>';
    } else if (cat === 'costume') {
      if (!RT.data) html = '<div class="av-sublbl">Loading real costumes…</div>';
      else {
        var cc = '<button class="av-card' + (state.costume === 'none' ? ' sel' : '') + '" data-costume="none"><span class="av-thumb-ic">🚫</span><span class="av-card-nm">None</span></button>';
        cc += RT.costumes.map(function (c) {
          return '<button class="av-card' + (state.costume === c.id ? ' sel' : '') + '" data-costume="' + c.id + '"><img class="av-thumb-img" src="' + ASSET_BASE + c.texture + '" alt="" loading="lazy"><span class="av-card-nm">' + c.name + '</span></button>';
        }).join('');
        html = '<div class="av-grid">' + cc + '</div><div class="av-sublbl">Real Roblox mesh costumes — geometry, texture &amp; body colours straight from the game.</div>';
      }
    } else if (cat === 'body') {
      html = '<div class="av-seg"><button class="av-chip' + (state.bodyType === 'classic' ? ' sel' : '') + '" data-body="classic">Classic</button><button class="av-chip' + (state.bodyType === 'slim' ? ' sel' : '') + '" data-body="slim">Slim</button></div>' +
        '<div class="av-sublbl">Skin tone</div>' + colorRowHtml(SKIN, state.skin, 'skin');
    } else if (cat === 'face') {
      html = '<div class="av-grid">' + cardsHtml(FACES, state.face, 'face') + '</div>';
    } else if (cat === 'hair') {
      html = '<div class="av-grid">' + cardsHtml(HAIR, state.hair.style, 'hair') + '</div><div class="av-sublbl">Hair colour</div>' + colorRowHtml(HAIR_COLORS, state.hair.color, 'hair');
    } else if (cat === 'hats') {
      html = '<div class="av-grid">' + cardsHtml(HATS, state.hat, 'hats') + '</div>';
    } else if (cat === 'faceacc') {
      html = '<div class="av-grid">' + cardsHtml(FACEACC, state.faceAcc, 'faceacc') + '</div>';
    } else if (cat === 'shirt') {
      html = '<div class="av-grid">' + cardsHtml(SHIRTS, state.shirt.style, 'shirt') + '</div><div class="av-sublbl">Shirt colour</div>' + colorRowHtml(CLOTH_COLORS, state.shirt.color, 'shirt');
    } else if (cat === 'pants') {
      html = '<div class="av-grid">' + cardsHtml(PANTS, state.pants.style, 'pants') + '</div><div class="av-sublbl">Pants colour</div>' + colorRowHtml(CLOTH_COLORS, state.pants.color, 'pants');
    }
    body.innerHTML = html;
    // paint clothing thumbnails
    body.querySelectorAll('canvas.av-thumb').forEach(function (cv) {
      try {
        var spec = { style: cv.dataset.style, color: cat === 'shirt' ? state.shirt.color : state.pants.color };
        var tex = clothTexture(spec.style, spec.color, cv.dataset.region);
        var img = tex.image; var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 40, 40);
      } catch (e) {}
    });
    root.querySelectorAll('.av-cat').forEach(function (b) { b.classList.toggle('active', b.dataset.cat === cat); });
  }

  function apply() { rebuild(); }

  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'lum-avatar';
    root.innerHTML =
      '<div class="av-modal">' +
        '<div class="av-head"><span class="av-title"><span class="rbx-cube"></span>Avatar Editor</span><button class="av-x" aria-label="Close">×</button></div>' +
        '<div class="av-body">' +
          '<div class="av-stage"><canvas id="av-canvas"></canvas><div class="av-hint">drag to rotate · scroll to zoom</div></div>' +
          '<div class="av-side">' +
            '<div class="av-cats">' + CATS.map(function (c) { return '<button class="av-cat' + (c.id === cat ? ' active' : '') + '" data-cat="' + c.id + '">' + c.label + '</button>'; }).join('') + '</div>' +
            '<div id="av-catbody" class="av-catbody"></div>' +
            '<div class="av-actions"><button class="av-btn" data-act="random">🎲 Randomize</button><button class="av-btn" data-act="reset">Reset</button><button class="av-btn primary" data-act="save">Save</button></div>' +
            '<p class="av-note">Saved to your browser & applied to your look.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    root.querySelector('.av-x').onclick = close;
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.querySelectorAll('.av-cat').forEach(function (b) { b.onclick = function () { cat = b.dataset.cat; renderPanel(); }; });
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-item],[data-color],[data-body],[data-pkg],[data-act],[data-costume]'); if (!t) return;
      if (t.dataset.costume != null) {
        state.costume = t.dataset.costume; renderPanel(); apply();
      } else if (t.dataset.item != null) {
        var it = t.dataset.item;
        if (cat === 'face') state.face = it;
        else if (cat === 'hair') state.hair.style = it;
        else if (cat === 'hats') state.hat = it;
        else if (cat === 'faceacc') state.faceAcc = it;
        else if (cat === 'shirt') state.shirt.style = it;
        else if (cat === 'pants') state.pants.style = it;
        renderPanel(); apply();
      } else if (t.dataset.color != null) {
        var c = t.dataset.color.split(',').map(Number), tag = t.dataset.ctag;
        if (tag === 'skin') state.skin = c; else if (tag === 'hair') state.hair.color = c; else if (tag === 'shirt') state.shirt.color = c; else if (tag === 'pants') state.pants.color = c;
        renderPanel(); apply();
      } else if (t.dataset.body) { state.bodyType = t.dataset.body; renderPanel(); apply(); }
      else if (t.dataset.pkg != null) { state = migrate(clone(PACKAGES[+t.dataset.pkg].look)); cat = 'body'; renderPanel(); apply(); setTimeout(function () { cat = 'packages'; renderPanel(); }, 0); }
      else if (t.dataset.act === 'random') { randomize(); renderPanel(); apply(); }
      else if (t.dataset.act === 'reset') { state = clone(DEFAULT); renderPanel(); apply(); }
      else if (t.dataset.act === 'save') { save(state); sendToGame(); var tx = t.textContent; t.textContent = 'Saved ✓'; setTimeout(function () { t.textContent = tx; }, 1200); }
    });
  }

  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function randomize() {
    state.bodyType = Math.random() < 0.5 ? 'classic' : 'slim';
    state.skin = pick(SKIN).slice(); state.face = pick(FACES);
    state.hair = { style: pick(HAIR), color: pick(HAIR_COLORS).slice() };
    state.hat = Math.random() < 0.5 ? pick(HATS) : 'none';
    state.faceAcc = Math.random() < 0.5 ? pick(FACEACC) : 'none';
    state.shirt = { style: pick(SHIRTS), color: pick(CLOTH_COLORS).slice() };
    state.pants = { style: pick(PANTS), color: pick(CLOTH_COLORS).slice() };
  }

  function sendToGame() {
    try { window.dispatchEvent(new CustomEvent('luminary-avatar', { detail: clone(state) })); } catch (e) {}
    try { if (window.Luminary && window.Luminary.setAppearance) window.Luminary.setAppearance(clone(state)); } catch (e) {}
  }

  function open() {
    build(); root.classList.add('open'); renderPanel();
    ensureThree().then(function () { var cv = root.querySelector('#av-canvas'); if (!viewer) initViewer(cv); else apply(); })
      .catch(function (e) { var s = root.querySelector('.av-stage'); if (s) s.innerHTML = '<p class="av-err">3D preview unavailable (' + e.message + ')</p>'; });
  }
  function close() { if (root) root.classList.remove('open'); }

  window.LuminaryAvatar = { open: open, close: close, getAppearance: function () { return clone(state); }, sendToGame: sendToGame };
})();
