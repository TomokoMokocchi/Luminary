/* ===========================================================================
   SFOTH IV — "2016 Roblox" skin behaviour
     * loads the Source Sans Pro webfont
     * builds the Roblox-style top navigation bar (lobby only)
     * "Set name" field — trusted verbatim, and mints a per-browser ownership
       KEY on first use so a creator can edit/delete their own maps
     * left Games sidebar: search + create, sorted by most-played / most-popular,
       like / dislike (IP-guarded on the server), and Edit/Delete for maps you own
     * per-map server browser: pick a live instance (server-1, server-2, …) or
       start a fresh one; the big Play joins an instance of the selected map
     * F9 developer console: captured log/warn/error tabs + a live command line
   =========================================================================== */
(function () {
  'use strict';

  // --- webfont ------------------------------------------------------------
  try {
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;800&display=swap';
    document.head.appendChild(f);
  } catch (e) {}

  // --- per-browser identity key ------------------------------------------
  function lumKey() {
    try {
      var k = localStorage.getItem('lum_key');
      if (!k) { k = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2)); localStorage.setItem('lum_key', k); }
      return k;
    } catch (e) { return ''; }
  }
  function keyHeaders() { var k = lumKey(); return k ? { 'x-lum-key': k } : {}; }

  // =========================================================================
  //  F9 DEVELOPER CONSOLE  (built first so it can capture early logs)
  // =========================================================================
  var DC = (function () {
    var MAX = 500;
    var rows = [];
    var counts = { warn: 0, err: 0 };
    var filter = 'all';
    var el = {};
    var built = false;

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function stamp() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }

    function fmt(args) {
      return Array.prototype.map.call(args, function (a) {
        if (a instanceof Error) return a.stack || (a.name + ': ' + a.message);
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }).join(' ');
    }

    function add(kind, text) {
      rows.push({ kind: kind, text: text, time: stamp() });
      if (rows.length > MAX) rows.shift();
      if (kind === 'warn') counts.warn++;
      if (kind === 'err') counts.err++;
      if (built) { render(); updateBadges(); }
    }

    function visible(kind) {
      if (filter === 'all') return true;
      if (filter === 'warn') return kind === 'warn';
      if (filter === 'err') return kind === 'err';
      return true;
    }

    function render() {
      if (!el.body) return;
      var atBottom = el.body.scrollTop + el.body.clientHeight >= el.body.scrollHeight - 30;
      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!visible(r.kind)) continue;
        html += '<div class="dc-row ' + r.kind + '"><span class="dc-time">' + r.time + '</span>' + esc(r.text) + '</div>';
      }
      el.body.innerHTML = html;
      if (atBottom) el.body.scrollTop = el.body.scrollHeight;
    }

    function updateBadges() {
      if (el.warnBadge) el.warnBadge.textContent = counts.warn;
      if (el.errBadge) el.errBadge.textContent = counts.err;
    }

    function setFilter(ff) {
      filter = ff;
      [['all', el.tabAll], ['warn', el.tabWarn], ['err', el.tabErr]].forEach(function (p) {
        if (p[1]) p[1].classList.toggle('active', filter === p[0]);
      });
      render();
    }

    function build() {
      if (built) return;
      var r = document.createElement('div');
      r.id = 'rbx-devconsole';
      r.innerHTML =
        '<div class="dc-head">' +
          '<span class="dc-title"><span class="rbx-cube"></span>Developer Console</span>' +
          '<button class="dc-tab active" data-f="all">Output</button>' +
          '<button class="dc-tab warn" data-f="warn">Warnings <span class="dc-badge">0</span></button>' +
          '<button class="dc-tab err" data-f="err">Errors <span class="dc-badge">0</span></button>' +
          '<span class="dc-spacer"></span>' +
          '<button class="dc-btn" data-act="clear">Clear</button>' +
          '<button class="dc-btn" data-act="close">Close (F9)</button>' +
        '</div>' +
        '<div class="dc-body"></div>' +
        '<div class="dc-cmdline"><span class="dc-prompt">&gt;</span>' +
          '<input type="text" spellcheck="false" autocomplete="off" placeholder="run JavaScript — e.g. SFOTH.room  or  location.reload()"></div>';
      document.body.appendChild(r);

      el.root = r;
      el.body = r.querySelector('.dc-body');
      el.input = r.querySelector('.dc-cmdline input');
      el.tabAll = r.querySelector('[data-f="all"]');
      el.tabWarn = r.querySelector('[data-f="warn"]');
      el.tabErr = r.querySelector('[data-f="err"]');
      el.warnBadge = el.tabWarn.querySelector('.dc-badge');
      el.errBadge = el.tabErr.querySelector('.dc-badge');

      r.addEventListener('click', function (ev) {
        var t = ev.target.closest('[data-f],[data-act]');
        if (!t) return;
        if (t.dataset.f) setFilter(t.dataset.f);
        else if (t.dataset.act === 'clear') { rows.length = 0; counts.warn = counts.err = 0; render(); updateBadges(); }
        else if (t.dataset.act === 'close') toggle(false);
      });

      var hist = [], hi = -1;
      el.input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          var cmd = el.input.value.trim();
          if (!cmd) return;
          hist.push(cmd); hi = hist.length;
          el.input.value = '';
          add('cmd', '> ' + cmd);
          try {
            var out = (0, eval)(cmd);
            Promise.resolve(out).then(function (v) { add('ret', fmt([v])); }, function (e) { add('err', String(e)); });
          } catch (e) { add('err', String(e)); }
        } else if (ev.key === 'ArrowUp') {
          if (hi > 0) { hi--; el.input.value = hist[hi] || ''; ev.preventDefault(); }
        } else if (ev.key === 'ArrowDown') {
          if (hi < hist.length - 1) { hi++; el.input.value = hist[hi] || ''; }
          else { hi = hist.length; el.input.value = ''; }
        }
        ev.stopPropagation();
      });

      built = true;
      render(); updateBadges();
    }

    function toggle(force) {
      if (!built) build();
      var open = typeof force === 'boolean' ? force : !el.root.classList.contains('open');
      el.root.classList.toggle('open', open);
      if (open) setTimeout(function () { el.input && el.input.focus(); }, 0);
    }

    ['log', 'info', 'warn', 'error', 'debug'].forEach(function (m) {
      var orig = console[m] ? console[m].bind(console) : function () {};
      console[m] = function () {
        try { add(m === 'error' ? 'err' : m === 'warn' ? 'warn' : m === 'info' ? 'info' : 'log', fmt(arguments)); } catch (e) {}
        return orig.apply(console, arguments);
      };
    });
    window.addEventListener('error', function (ev) {
      add('err', (ev.message || 'Error') + (ev.filename ? '  (' + ev.filename.split('/').pop() + ':' + ev.lineno + ')' : ''));
    });
    window.addEventListener('unhandledrejection', function (ev) {
      add('err', 'Unhandled promise rejection: ' + fmt([ev.reason]));
    });

    return { toggle: toggle, add: add };
  })();

  window.addEventListener('keydown', function (ev) {
    if (ev.key !== 'F9') return;
    if (!document.body.classList.contains('playing')) return;
    ev.preventDefault(); ev.stopPropagation(); DC.toggle();
  }, true);

  DC.add('info', 'Luminary developer console ready (F9 in-game).');

  // =========================================================================
  //  LOBBY DECOR + SET NAME
  // =========================================================================
  function getName() { try { return localStorage.getItem('sfoth_name') || ''; } catch (e) { return ''; } }
  function setCookie(k, v) { document.cookie = k + '=' + encodeURIComponent(v) + ';path=/;max-age=31536000;samesite=lax'; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function mountTopNav() {
    if (document.getElementById('rbx-topnav')) return;
    var bar = document.createElement('div');
    bar.id = 'rbx-topnav';
    bar.innerHTML =
      '<button id="lum-sidetoggle" title="Games">☰ Games</button>' +
      '<a class="rbx-logo" href="/SFOTH/"><span class="rbx-cube"></span>Luminary</a>' +
      '<nav><a href="/SFOTH/">Play</a><a href="#" id="rbx-nav-create">Create</a><a href="#" id="rbx-nav-avatar">Avatar</a></nav>' +
      '<span class="rbx-spacer"></span>' +
      '<span class="rbx-robux"><b>L</b><span id="rbx-online">—</span> online</span>';
    document.body.appendChild(bar);
    var av = bar.querySelector('#rbx-nav-avatar');
    if (av) av.onclick = function (e) { e.preventDefault(); if (window.LuminaryAvatar) window.LuminaryAvatar.open(); };
    var cr = bar.querySelector('#rbx-nav-create');
    if (cr) cr.onclick = function (e) { e.preventDefault(); if (window.LuminaryMaker) window.LuminaryMaker.open(); };
    var tg = bar.querySelector('#lum-sidetoggle');
    if (tg) tg.onclick = function () { var s = document.getElementById('lum-gamelist'); if (s) s.classList.toggle('show'); };
    var src = document.getElementById('hero-player-count-value');
    if (src) {
      var sync = function () { var o = document.getElementById('rbx-online'); if (o) o.textContent = (src.textContent || '—').trim(); };
      sync();
      new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
    }
  }

  function relabelPlay() {
    var join = document.getElementById('join');
    if (join && !join.dataset.rbxLabel) {
      join.dataset.rbxLabel = '1';
      var apply = function () { if (join.textContent.trim() !== 'Play') join.textContent = 'Play'; };
      apply();
      new MutationObserver(apply).observe(join, { childList: true, characterData: true, subtree: true });
    }
  }

  function mountSetName() {
    if (document.getElementById('set-name-box')) return;
    var join = document.getElementById('join');
    var name = getName();
    if (name) { setCookie('sfoth_name', name); lumKey(); }
    var box = document.createElement('div');
    box.id = 'set-name-box';
    box.innerHTML =
      '<label for="set-name-input">Username</label>' +
      '<input id="set-name-input" maxlength="20" placeholder="Enter your name" autocomplete="off">' +
      '<button id="set-name-save" type="button">Set name</button>' +
      '<span class="cur"></span>';
    var anchor = join ? (join.closest('.hero-play-row') || join) : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
    else (document.querySelector('.hero-copy') || document.body).appendChild(box);
    var input = box.querySelector('#set-name-input'), cur = box.querySelector('.cur');
    input.value = name;
    cur.textContent = name ? ('Playing as ' + name) : 'No name set';
    function saveName() {
      var v = input.value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20);
      try { localStorage.setItem('sfoth_name', v); } catch (e) {}
      setCookie('sfoth_name', v);
      lumKey(); // mint the per-browser key now, so this browser owns its maps
      location.reload();
    }
    box.querySelector('#set-name-save').onclick = saveName;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveName(); } });
  }

  // =========================================================================
  //  GAMES SIDEBAR  +  SERVER BROWSER
  // =========================================================================
  var GAMES = { list: [], selected: 'heights', filter: '' };
  function selectedGame() { return GAMES.list.find(function (m) { return m.id === GAMES.selected; }) || GAMES.list.find(function (m) { return m.id === 'heights'; }); }

  async function fetchGames() {
    try {
      var r = await fetch('/api/maps', { headers: keyHeaders() });
      var j = await r.json();
      GAMES.list = j.maps || [];
      GAMES.selected = j.selected || 'heights';
    } catch (e) {}
  }

  function buildSidebar() {
    if (document.getElementById('lum-gamelist')) { renderSidebar(); return; }
    var s = document.createElement('div'); s.id = 'lum-gamelist';
    s.innerHTML =
      '<div class="gl-top"><div class="gl-title">GAMES <small>most played</small></div>' +
        '<input class="gl-search" id="gl-search" placeholder="Search games…" autocomplete="off">' +
        '<button class="gl-create" id="gl-create">+ Create a game</button></div>' +
      '<div class="gl-list" id="gl-list"></div>';
    document.body.appendChild(s);
    s.querySelector('#gl-search').addEventListener('input', function (e) { GAMES.filter = e.target.value.toLowerCase(); renderSidebar(); });
    s.querySelector('#gl-create').onclick = function () { if (window.LuminaryMaker) window.LuminaryMaker.open(); };
    renderSidebar();
  }

  function renderSidebar() {
    var list = document.getElementById('gl-list'); if (!list) return;
    var items = GAMES.list.filter(function (m) { return !GAMES.filter || m.name.toLowerCase().indexOf(GAMES.filter) >= 0; });
    if (!items.length) { list.innerHTML = '<div class="gl-empty">No games match your search.</div>'; return; }
    list.innerHTML = items.map(function (m) {
      var meta = m.builtin ? 'The original arena' : (m.blocks + ' parts · ' + (m.scripts ? m.scripts + ' scripts · ' : '') + m.plays + ' plays');
      var likeBtns = m.builtin ? '' :
        '<div class="gl-social">' +
          '<button class="gl-like" data-vote="1" data-id="' + m.id + '">▲ ' + m.likes + '</button>' +
          '<button class="gl-like" data-vote="-1" data-id="' + m.id + '">▼ ' + m.dislikes + '</button>' +
          (m.owned ? '<span class="gl-sp"></span><button class="gl-own" data-edit="' + m.id + '">Edit</button><button class="gl-own del" data-del="' + m.id + '">Delete</button>' : '') +
        '</div>';
      return '<div class="gl-item' + (m.id === GAMES.selected ? ' active' : '') + '" data-id="' + m.id + '">' +
        '<div class="gl-name" data-pick="' + m.id + '">' + esc(m.name) + (m.builtin ? ' <span class="gl-badge">OG</span>' : '') + (m.owned ? ' <span class="gl-badge own">YOURS</span>' : '') + '</div>' +
        '<div class="gl-meta" data-pick="' + m.id + '">by ' + esc(m.author) + ' · ' + meta + '</div>' +
        likeBtns + '</div>';
    }).join('');
    list.querySelectorAll('[data-pick]').forEach(function (it) { it.onclick = function () { selectGame(it.dataset.pick); }; });
    list.querySelectorAll('[data-vote]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); vote(b.dataset.id, +b.dataset.vote); }; });
    list.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); if (window.LuminaryMaker) window.LuminaryMaker.open(b.dataset.edit); }; });
    list.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); delMap(b.dataset.del); }; });
  }

  async function vote(id, v) {
    try {
      var r = await fetch('/api/maps/' + id + '/vote', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, keyHeaders()), body: JSON.stringify({ vote: v }) });
      var j = await r.json();
      if (j.ok) { var m = GAMES.list.find(function (x) { return x.id === id; }); if (m) { m.likes = j.likes; m.dislikes = j.dislikes; } renderSidebar(); }
    } catch (e) {}
  }

  async function delMap(id) {
    var m = GAMES.list.find(function (x) { return x.id === id; });
    if (!m || !confirm('Delete "' + m.name + '"? This cannot be undone.')) return;
    try {
      var r = await fetch('/api/maps/' + id, { method: 'DELETE', headers: keyHeaders() });
      if (r.ok) { if (GAMES.selected === id) { await setSelected('heights'); return; } await fetchGames(); renderSidebar(); }
      else { alert('Could not delete (not your map, or already gone).'); }
    } catch (e) {}
  }

  // Selecting a game pins it for this browser (cookie) and reloads so the
  // client loads that place's geometry; the server browser then lists its
  // instances. (Maps are per-browser, not global — many players can be on
  // many maps at once.)
  async function setSelected(id) {
    try { await fetch('/api/maps/select', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id }) }); } catch (e) {}
    // Clear any stale ?room so the big Play joins a fresh instance of THIS map.
    try { var u = new URL(location.href); u.searchParams.delete('room'); location.href = u.pathname + u.hash; }
    catch (e) { location.reload(); }
  }
  function selectGame(id) { if (id === GAMES.selected) { renderServers(); return; } setSelected(id); }

  // --- server browser (per selected map) ----------------------------------
  // Mount it in the MAIN lobby column (full width), not next to the cramped
  // captured #server-grid, and hide that native server/broadcast chrome.
  function mountServerHead() {
    var main = document.querySelector('#join-screen main') || document.getElementById('join-screen');
    if (!main) return;
    if (!document.getElementById('lum-servers')) {
      var wrap = document.createElement('div');
      wrap.id = 'lum-servers';
      wrap.innerHTML =
        '<div id="rbx-serverhead"><span class="rbx-dot"></span>Servers <small id="lum-serverfor"></small>' +
          '<span class="rbx-spacer"></span><button class="lum-srv-new" id="lum-new-server">+ New server</button>' +
          '<button class="lum-srv-new ghost" id="lum-refresh-servers" title="Refresh">↻</button></div>' +
        '<div id="lum-server-list" class="lum-server-list"></div>';
      var hero = main.querySelector('.lobby-hero');
      if (hero && hero.nextSibling) main.insertBefore(wrap, hero.nextSibling);
      else main.appendChild(wrap);
      wrap.querySelector('#lum-new-server').onclick = function () { joinRoom('map:' + GAMES.selected); };
      wrap.querySelector('#lum-refresh-servers').onclick = function () { renderServers(); };
    }
    renderServers();
  }

  async function renderServers() {
    var host = document.getElementById('lum-server-list'); if (!host) return;
    var forEl = document.getElementById('lum-serverfor');
    var g = selectedGame();
    if (forEl) forEl.textContent = '— ' + (g ? g.name : 'Luminary');
    var servers = [];
    try { var r = await fetch('/api/servers?map=' + encodeURIComponent(GAMES.selected)); var j = await r.json(); servers = j.servers || []; } catch (e) {}
    if (!servers.length) {
      host.innerHTML = '<div class="lum-noservers">No live servers yet. Press <b>Play</b> or <b>+ New server</b> to start one.</div>';
      return;
    }
    host.innerHTML = servers.map(function (s) {
      var pct = Math.round((s.humans / s.playerLimit) * 100);
      return '<div class="lum-srv">' +
        '<div class="lum-srv-top"><b>' + esc(s.id) + '</b><span>' + s.humans + '/' + s.playerLimit + '</span></div>' +
        '<div class="lum-srv-bar"><i style="width:' + pct + '%"></i></div>' +
        '<button class="lum-srv-join" data-room="' + s.id + '"' + (s.available ? '' : ' disabled') + '>' + (s.available ? 'Join' : 'Full') + '</button>' +
        '</div>';
    }).join('');
    host.querySelectorAll('[data-room]').forEach(function (b) { b.onclick = function () { joinRoom(b.dataset.room); }; });
  }

  // Drive the native client join flow by seeding ?room= and submitting the form.
  function joinRoom(room) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('room', room);
      history.replaceState(null, '', u);
    } catch (e) {}
    var join = document.getElementById('join');
    var form = document.getElementById('join-form');
    if (form && form.requestSubmit) form.requestSubmit();
    else if (join) join.click();
  }

  // re-fetch + rebrand; play(id) switches this browser to a map and reloads
  window.LuminaryGames = {
    refresh: async function () { await fetchGames(); renderSidebar(); renderServers(); rebrand(); },
    select: setSelected,
    play: setSelected
  };

  function gameName() { var g = selectedGame(); return g ? g.name : 'Luminary'; }
  function rebrand() {
    var name = gameName();
    try { document.title = name === 'Luminary' ? 'Luminary' : ('Luminary — ' + name); } catch (e) {}
    var title = document.getElementById('title-name');
    if (title) { var up = (name || 'Luminary').toUpperCase(); if (title.textContent.trim() !== up) title.innerHTML = esc(up); }
    document.querySelectorAll('.brand').forEach(function (el) { if (el.textContent.trim() !== 'Luminary') el.textContent = 'Luminary'; });
    var kicker = document.querySelector('.hero-kicker');
    if (kicker && kicker.textContent !== 'FIGHT ON THE FLOATING HEIGHTS') kicker.textContent = 'FIGHT ON THE FLOATING HEIGHTS';
  }

  // Fix "pixely until resize" first-join + start client scripts for the map.
  function watchPlaying() {
    var fire = function () { for (var i = 0; i < 4; i++) setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, i * 250); };
    try {
      new MutationObserver(function () {
        if (document.body.classList.contains('playing')) {
          fire();
          inGameTweaks(); // the HUD (nametags, health, stats button) only exists while playing
          if (window.LuminaryScripts && GAMES.selected && GAMES.selected !== 'heights') window.LuminaryScripts.runForMap(GAMES.selected, getName() || 'Player');
        } else if (window.LuminaryScripts) { window.LuminaryScripts.stopAll(); }
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }

  // ---- in-game HUD tweaks ------------------------------------------------
  function inGameTweaks() {
    // Don't capture/lock the mouse on click by default — only an intentional
    // shift-lock should grab the pointer. The client treats any stored value
    // other than 'off' as "lock on click", so default it to 'off' (the player
    // can still turn it on in the in-game settings).
    try { if (localStorage.getItem('sfoth:lock-mouse-on-click') == null) localStorage.setItem('sfoth:lock-mouse-on-click', 'off'); } catch (e) {}

    // mark the body so CSS can drop SFOTH-only UI (KOs/Wipeouts) on custom games
    var custom = GAMES.selected && GAMES.selected !== 'heights';
    document.body.classList.toggle('lum-custom', !!custom);

    // Hide YOUR OWN overhead nameplate (name + health), keep everyone else's —
    // like Roblox. Nameplates are .nameplate divs in #nametags; match the one
    // whose text starts with your username.
    var me = getName();
    var tag = function () {
      if (!me) return;
      document.querySelectorAll('#nametags .nameplate').forEach(function (np) {
        var txt = (np.textContent || '').trim();
        np.classList.toggle('lum-self', txt === me || txt.indexOf(me + ' ') === 0 || txt.indexOf(me) === 0);
      });
    };
    var nt = document.getElementById('nametags');
    if (nt && !nt.dataset.lumObs) { nt.dataset.lumObs = '1'; try { new MutationObserver(tag).observe(nt, { childList: true, subtree: true, characterData: true }); } catch (e) {} }
    tag();

    // A health bar at the top of the player list (Roblox-style). Mirror the
    // engine's #health-value / #health-fill into the list header.
    mountHealthInList();
  }

  function mountHealthInList() {
    var list = document.getElementById('player-list');
    if (!list || document.getElementById('lum-list-health')) { syncListHealth(); return; }
    var hp = document.createElement('div'); hp.id = 'lum-list-health';
    hp.innerHTML = '<span class="lh-label">Health</span><div class="lh-track"><i class="lh-fill"></i></div><span class="lh-val">100</span>';
    var title = list.querySelector('.players-title');
    if (title && title.nextSibling) list.insertBefore(hp, title.nextSibling); else list.insertBefore(hp, list.firstChild);
    syncListHealth();
    try { new MutationObserver(syncListHealth).observe(document.getElementById('health') || document.body, { attributes: true, childList: true, subtree: true, characterData: true }); } catch (e) {}
  }
  function syncListHealth() {
    var fillSrc = document.getElementById('health-fill');
    var valSrc = document.getElementById('health-value');
    var fill = document.querySelector('#lum-list-health .lh-fill');
    var val = document.querySelector('#lum-list-health .lh-val');
    if (fill && fillSrc) fill.style.width = (fillSrc.style.width || '100%');
    if (val && valSrc) val.textContent = (valSrc.textContent || '100').trim();
  }

  // A framed "live map" window directly under the Play button. The lobby
  // renders the selected map full-screen as a backdrop; this frame is a clean
  // window onto it (the card above is translucent), so the play screen shows a
  // smaller, cropped view of the map instead of a tall empty panel.
  function mountMapFrame() {
    if (document.getElementById('lum-map-frame')) return;
    var hero = document.querySelector('.lobby-hero');
    var copy = hero && hero.querySelector('.hero-copy');
    if (!hero || !copy) return;
    var f = document.createElement('div');
    f.id = 'lum-map-frame';
    f.innerHTML = '<span class="lmf-tag"><i></i>LIVE</span><span class="lmf-hint">preview of ' + esc(gameName()) + '</span>';
    if (copy.nextSibling) hero.insertBefore(f, copy.nextSibling); else hero.appendChild(f);
  }

  async function mountLobby() {
    mountTopNav();
    mountSetName();
    relabelPlay();
    mountMapFrame();
    watchPlaying();
    inGameTweaks();
    await fetchGames();
    buildSidebar();
    mountServerHead();
    rebrand();
  }

  if (document.readyState !== 'loading') mountLobby();
  else document.addEventListener('DOMContentLoaded', mountLobby);

  // the server list + in-game topbar render asynchronously — keep re-applying,
  // and refresh the server list periodically so counts stay live
  var tries = 0;
  var iv = setInterval(function () {
    mountServerHead(); relabelPlay(); rebrand();
    if (++tries % 6 === 0 && !document.body.classList.contains('playing')) renderServers();
    if (tries > 120) clearInterval(iv);
  }, 500);
})();
