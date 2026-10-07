/* ===========================================================================
   SFOTH IV — "2016 Roblox" skin behaviour
     * loads the Source Sans Pro webfont
     * builds the decorative Roblox top navigation bar (lobby only)
     * builds the "Set name" field (name trusted verbatim, saved as cookie + LS)
     * relabels the long guest-play button to a clean "Play"
     * adds a 2016-style heading above the running-games list
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

  // =========================================================================
  //  F9 DEVELOPER CONSOLE  (built first so it can capture early logs)
  // =========================================================================
  var DC = (function () {
    var MAX = 500;
    var rows = [];              // {kind,text,time}
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

    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

    function updateBadges() {
      if (el.warnBadge) el.warnBadge.textContent = counts.warn;
      if (el.errBadge) el.errBadge.textContent = counts.err;
    }

    function setFilter(f) {
      filter = f;
      [['all', el.tabAll], ['warn', el.tabWarn], ['err', el.tabErr], ['cmd', el.tabCmd]].forEach(function (p) {
        if (p[1]) p[1].classList.toggle('active', filter === p[0] || (p[0] === 'cmd' && filter === 'cmd'));
      });
      render();
    }

    function build() {
      if (built) return;
      var root = document.createElement('div');
      root.id = 'rbx-devconsole';
      root.innerHTML =
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
      document.body.appendChild(root);

      el.root = root;
      el.body = root.querySelector('.dc-body');
      el.input = root.querySelector('.dc-cmdline input');
      el.tabAll = root.querySelector('[data-f="all"]');
      el.tabWarn = root.querySelector('[data-f="warn"]');
      el.tabErr = root.querySelector('[data-f="err"]');
      el.warnBadge = el.tabWarn.querySelector('.dc-badge');
      el.errBadge = el.tabErr.querySelector('.dc-badge');

      root.addEventListener('click', function (ev) {
        var t = ev.target.closest('[data-f],[data-act]');
        if (!t) return;
        if (t.dataset.f) setFilter(t.dataset.f);
        else if (t.dataset.act === 'clear') { rows.length = 0; counts.warn = counts.err = 0; render(); updateBadges(); }
        else if (t.dataset.act === 'close') toggle(false);
      });

      // command history
      var hist = [], hi = -1;
      el.input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          var cmd = el.input.value.trim();
          if (!cmd) return;
          hist.push(cmd); hi = hist.length;
          el.input.value = '';
          add('cmd', '> ' + cmd);
          try {
            // indirect eval → runs in global scope
            var out = (0, eval)(cmd);
            Promise.resolve(out).then(function (v) { add('ret', fmt([v])); },
                                      function (e) { add('err', String(e)); });
          } catch (e) { add('err', String(e)); }
        } else if (ev.key === 'ArrowUp') {
          if (hi > 0) { hi--; el.input.value = hist[hi] || ''; ev.preventDefault(); }
        } else if (ev.key === 'ArrowDown') {
          if (hi < hist.length - 1) { hi++; el.input.value = hist[hi] || ''; }
          else { hi = hist.length; el.input.value = ''; }
        }
        ev.stopPropagation(); // keep game keybinds from firing while typing
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

    // patch console + global error handlers
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

  // F9 toggles the console — IN-GAME ONLY, no button anywhere (capture phase so
  // the game never swallows the key).
  window.addEventListener('keydown', function (ev) {
    if (ev.key !== 'F9') return;
    if (!document.body.classList.contains('playing')) return; // lobby: ignore
    ev.preventDefault(); ev.stopPropagation(); DC.toggle();
  }, true);

  DC.add('info', 'Luminary developer console ready (F9 in-game).');

  // =========================================================================
  //  LOBBY DECOR + SET NAME
  // =========================================================================
  function getName() { try { return localStorage.getItem('sfoth_name') || ''; } catch (e) { return ''; } }
  function setCookie(v) { document.cookie = 'sfoth_name=' + encodeURIComponent(v) + ';path=/;max-age=31536000;samesite=lax'; }

  function mountTopNav() {
    if (document.getElementById('rbx-topnav')) return;
    var bar = document.createElement('div');
    bar.id = 'rbx-topnav';
    bar.innerHTML =
      '<button id="lum-sidetoggle" title="Games">☰ Games</button>' +
      '<a class="rbx-logo" href="/SFOTH/"><span class="rbx-cube"></span>Luminary</a>' +
      '<nav><a href="/SFOTH/">Play</a><a href="#" id="rbx-nav-avatar">Avatar</a></nav>' +
      '<span class="rbx-spacer"></span>' +
      '<span class="rbx-robux"><b>L</b><span id="rbx-online">—</span> online</span>';
    document.body.appendChild(bar);
    var av = bar.querySelector('#rbx-nav-avatar');
    if (av) av.onclick = function (e) { e.preventDefault(); if (window.LuminaryAvatar) window.LuminaryAvatar.open(); };
    var tg = bar.querySelector('#lum-sidetoggle');
    if (tg) tg.onclick = function () { var s = document.getElementById('lum-gamelist'); if (s) s.classList.toggle('show'); };
    // mirror the live player count into the nav
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
      // keep it reactive: the client may rewrite the label, so re-apply on change
      var apply = function () { if (join.textContent.trim() !== 'Play') join.textContent = 'Play'; };
      apply();
      new MutationObserver(apply).observe(join, { childList: true, characterData: true, subtree: true });
    }
  }

  function mountServerHead() {
    var grid = document.getElementById('server-grid');
    if (!grid || document.getElementById('rbx-serverhead')) return;
    var h = document.createElement('div');
    h.id = 'rbx-serverhead';
    h.innerHTML = '<span class="rbx-dot"></span>Running games <small>— join a live server</small>';
    var anchor = document.getElementById('rbx-servers') || grid;
    grid.parentNode.insertBefore(h, grid);
    // anchor target for the nav "Servers" link
    h.id = 'rbx-serverhead'; h.setAttribute('name', 'rbx-servers');
    var a = document.createElement('a'); a.id = 'rbx-servers'; a.style.position = 'relative'; a.style.top = '-60px';
    h.parentNode.insertBefore(a, h);
  }

  function mountSetName() {
    if (document.getElementById('set-name-box')) return;
    var join = document.getElementById('join');
    var name = getName();
    if (name) setCookie(name);
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
    function save() {
      var v = input.value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20);
      try { localStorage.setItem('sfoth_name', v); } catch (e) {}
      setCookie(v);
      location.reload();
    }
    box.querySelector('#set-name-save').onclick = save;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // ---- games sidebar (map selection) -------------------------------------
  var GAMES = { list: [], active: 'heights', filter: '' };
  function gameName() { var g = GAMES.list.find(function (m) { return m.id === GAMES.active; }); return g ? g.name : 'Luminary'; }

  async function fetchGames() {
    try { var r = await fetch('/api/maps'); var j = await r.json(); GAMES.list = j.maps || []; GAMES.active = j.active || 'heights'; }
    catch (e) {}
  }

  function buildSidebar() {
    if (document.getElementById('lum-gamelist')) { renderSidebar(); return; }
    var s = document.createElement('div'); s.id = 'lum-gamelist';
    s.innerHTML =
      '<div class="gl-top"><div class="gl-title">GAMES</div>' +
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
      var meta = m.builtin ? 'The original arena' : (m.blocks + ' blocks · ' + m.spawns + ' spawns');
      return '<div class="gl-item' + (m.id === GAMES.active ? ' active' : '') + '" data-id="' + m.id + '">' +
        '<div class="gl-name">' + esc(m.name) + (m.builtin ? ' <span class="gl-badge">OG</span>' : '') + '</div>' +
        '<div class="gl-meta">by ' + esc(m.author) + ' · ' + meta + '</div></div>';
    }).join('');
    list.querySelectorAll('.gl-item').forEach(function (it) { it.onclick = function () { selectGame(it.dataset.id); }; });
  }

  async function selectGame(id) {
    if (id === GAMES.active) return;
    try {
      var r = await fetch('/api/maps/active', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id }) });
      if (r.ok) {
        // the world geometry (scene.json/arena.json) is fetched once at page
        // init, so reload to load the newly-selected map + show it as backdrop.
        location.reload();
      }
    } catch (e) {}
  }

  // re-fetch the game list; select() switches the active world + reloads
  window.LuminaryGames = {
    refresh: async function () { await fetchGames(); renderSidebar(); rebrand(); },
    select: selectGame,
  };

  // Rebrand the hero/topbar to the active game's name.
  function rebrand() {
    var name = gameName();
    try { document.title = name === 'Luminary' ? 'Luminary' : ('Luminary — ' + name); } catch (e) {}
    var title = document.getElementById('title-name');
    if (title) { var up = (name || 'Luminary').toUpperCase(); if (title.textContent.trim() !== up) title.innerHTML = esc(up); }
    document.querySelectorAll('.brand').forEach(function (el) {
      if (el.textContent.trim() !== 'Luminary') el.textContent = 'Luminary';
    });
    var kicker = document.querySelector('.hero-kicker');
    if (kicker && kicker.textContent !== 'FIGHT ON THE FLOATING HEIGHTS') kicker.textContent = 'FIGHT ON THE FLOATING HEIGHTS';
  }

  // Fix "pixely until resize" first-join: nudge the engine to re-measure the
  // canvas once the game view becomes visible.
  function watchPlaying() {
    var fire = function () { for (var i = 0; i < 4; i++) setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, i * 250); };
    try {
      new MutationObserver(function () { if (document.body.classList.contains('playing')) fire(); })
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }

  async function mountLobby() {
    mountTopNav();
    mountSetName();
    relabelPlay();
    mountServerHead();
    watchPlaying();
    await fetchGames();
    buildSidebar();
    rebrand();
  }

  if (document.readyState !== 'loading') mountLobby();
  else document.addEventListener('DOMContentLoaded', mountLobby);

  // the server list + in-game topbar render asynchronously — keep re-applying
  var tries = 0;
  var iv = setInterval(function () {
    mountServerHead(); relabelPlay(); rebrand();
    if (++tries > 80) clearInterval(iv);
  }, 500);
})();
