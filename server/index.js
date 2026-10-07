// A reconstructed content + signalling server for the 2008-era SFOTH IV
// browser client captured in ../ (sword fights on the heights).
//
// What this server does:
//   * serves the entire static client (HTML, JS, WASM, fonts, audio, textures)
//   * answers every HTTP API the client calls (config, identity, lobby,
//     availability, play-count, gems, achievements, death-map, feedback...)
//   * runs the spectator broadcast as Server-Sent Events (replay or "warming up")
//   * acts as the WebRTC *offerer* for guests: POST /api/guest/join returns a
//     real SDP offer, /api/guest/answer completes it, and the v23 clock
//     handshake runs on the "control" data channel so the client reaches the
//     "connected" state.
//
// What it does NOT do: run the authoritative Bepu physics simulation or emit
// v23 world snapshots. That logic lives in the server-side .NET assemblies,
// which are not part of this client bundle, so an actual playable match cannot
// be reconstructed from these files alone. See README.md.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { GameServer } from './webrtc.js';
import { MapStore } from './maps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBROOT = path.resolve(__dirname, '..'); // the ".../2008" directory
const PORT = Number(process.env.PORT || process.argv[2] || 80);
const HOST = process.env.HOST || '0.0.0.0';

// Content hash the client bundle expects; shared by every reference payload.
const SOURCE_SHA256 = 'a55fd43a905b6cb1d7a6180a461a38640f1e0669338543f0f2dca68a85b9b3d6';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const log = (...a) => console.log(new Date().toISOString(), ...a);
const game = new GameServer({ iceServers: ICE_SERVERS.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls])), log });

// Map store: built-in Heights + public user-created maps. Custom maps generate
// their own arena.json (physics) + scene.json (visuals); the active map's files
// are served in place of the originals and loaded by the simulation.
const maps = new MapStore({
  refDir: path.join(WEBROOT, 'SFOTH', 'reference'),
  storeDir: path.join(__dirname, 'maps-store'),
  genDir: path.join(__dirname, '.map-refs'),
  sourceSha256: SOURCE_SHA256,
  log,
});
maps.init().catch((e) => log('[maps] init failed:', e.message));

// ---------------------------------------------------------------------------
// MIME
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.dds': 'image/vnd-ms.dds',
  '.map': 'application/json; charset=utf-8',
};

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (MIME[ext]) return MIME[ext];
  // Extensionless recorded API captures are JSON documents.
  if (!ext) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function sendJson(res, status, obj, extra = {}) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store', ...extra });
  res.end(body);
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  const body = Buffer.from(text);
  res.writeHead(status, { 'content-type': type, 'content-length': body.length });
  res.end(body);
}

function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { return {}; }
}

function bearer(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

function cookie(req, name) {
  const h = req.headers['cookie'] || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return part.slice(i + 1).trim(); }
    }
  }
  return '';
}

// The player's chosen name — trusted verbatim, just length-clamped & sanitized.
function chosenName(req) {
  const raw = cookie(req, 'sfoth_name');
  const clean = raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
  return clean || '';
}

// ---------------------------------------------------------------------------
// static files
// ---------------------------------------------------------------------------
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const abs = path.normalize(path.join(WEBROOT, rel));
  if (abs !== WEBROOT && !abs.startsWith(WEBROOT + path.sep)) {
    return sendText(res, 403, 'Forbidden');
  }
  let stat;
  try {
    stat = await fsp.stat(abs);
  } catch {
    return false; // not a file — let caller fall back
  }
  if (stat.isDirectory()) {
    return serveStatic(req, res, pathname.replace(/\/?$/, '/'));
  }

  const type = mimeFor(abs);
  const headers = {
    'content-type': type,
    'cache-control': abs.includes(`${path.sep}assets${path.sep}`) || abs.includes(`${path.sep}_framework${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  };
  // Fonts/scripts the client preloads with crossorigin need permissive CORS.
  headers['access-control-allow-origin'] = '*';

  // gzip text assets on the fly when the client accepts it.
  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const compressible = /text|javascript|json|svg|wasm/.test(type);
  if (acceptsGzip && compressible && stat.size > 1024) {
    const raw = await fsp.readFile(abs);
    const gz = zlib.gzipSync(raw);
    res.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': gz.length, vary: 'Accept-Encoding' });
    return res.end(gz);
  }
  res.writeHead(200, { ...headers, 'content-length': stat.size });
  fs.createReadStream(abs).pipe(res);
  return true;
}

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------
function configPayload() {
  return {
    buildId: '20261004-232256-737079a1',
    gameDisabled: false,
    iceServers: ICE_SERVERS,
    accountsEnabled: true,
    stencilShadows: true,
    muteGuestChat: false,
    muteAllChat: false,
    artificialLatencyMs: 0,
  };
}

function identityPayload(req) {
  // No account backend: we simply trust whatever name the client set.
  const name = chosenName(req);
  return {
    authenticated: !!name,
    username: name || null,
    gemBalance: 0,
    hasFoundGem: false,
    accountsEnabled: true,
    guestClaimsEnabled: true,
    guestClaimPresent: false,
  };
}

const NICKS = ['blademaster', 'fust', 'deathgiver', 'bone_spore', 'ghostlight', 'barsentplays'];
function lobbyPayload() {
  const humans = 4 + Math.floor(Math.random() * 6);
  const bots = 11 - Math.min(humans, 11);
  const players = [];
  let id = 100;
  for (let i = 0; i < humans; i++) players.push({ nickname: NICKS[i % NICKS.length] + (i || ''), bot: false, id: id++ });
  for (let i = 0; i < bots; i++) players.push({ nickname: `Bot ${i + 1}`, bot: true, id: id++ });
  return { fresh: true, humans, bots, playerLimit: 15, players };
}

// ---------------------------------------------------------------------------
// spectator broadcast (SSE)
// ---------------------------------------------------------------------------
// Optional live replay: if server/broadcast-frames.json exists it should be a
// JSON array whose items are either frame objects (streamed as unnamed SSE
// data) or base64(gzip(json)) strings (streamed as `frame` events). Otherwise
// the stream reports "warming up", which the client renders as a waiting state.
let REPLAY = null;
try {
  const p = path.join(__dirname, 'broadcast-frames.json');
  if (fs.existsSync(p)) {
    REPLAY = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(REPLAY) || !REPLAY.length) REPLAY = null;
    else log(`[broadcast] loaded ${REPLAY.length} replay frames`);
  }
} catch (e) {
  log('[broadcast] replay load failed:', e.message);
}

function broadcastStream(req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'access-control-allow-origin': '*',
  });
  const token = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  res.write(`event: welcome\ndata: ${JSON.stringify({ token })}\n\n`);

  let closed = false;
  const epoch = Date.now();

  const sendEvent = (event, data) => {
    if (closed) return;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (event) res.write(`event: ${event}\n`);
    for (const line of payload.split('\n')) res.write(`data: ${line}\n`);
    res.write('\n');
  };

  let timer;
  if (REPLAY) {
    let i = 0;
    const tick = () => {
      if (closed) return;
      const item = REPLAY[i % REPLAY.length];
      i++;
      if (typeof item === 'string') sendEvent('frame', item);
      else sendEvent(null, { version: 1, sourceSha256: SOURCE_SHA256, epoch, ...item });
      timer = setTimeout(tick, 1000 / 20); // ~20 fps
    };
    tick();
  } else {
    const warm = () => {
      if (closed) return;
      sendEvent(null, { kind: 'waiting', epoch });
      timer = setTimeout(warm, 4000);
    };
    warm();
  }

  const keepAlive = setInterval(() => !closed && res.write(': ping\n\n'), 15000);
  req.on('close', () => { closed = true; clearTimeout(timer); clearInterval(keepAlive); });
}

// ---------------------------------------------------------------------------
// client trim + "Set name" (injected into index.html at serve time)
// ---------------------------------------------------------------------------
const CLIENT_INJECT = `
<style id="sfoth-trim">
/* strip the captured chrome; the 2016 skin rebuilds the lobby it needs */
.sfoth-page-nav,#account-upsell,.leaderboards-link-card,.hero-leaderboards,.hero-story,
#how-to-play,.lobby-feedback,#topbar-feedback,.broadcast-desk,.sword-section,.arena-stats,
#identity,#identity-retry,.hero-help,.account-actions,.create-account,.breadcrumb,
.choose-server,.site-header,[data-game-header],.hero-secondary-actions{display:none!important}
#topbar{display:none!important}
body.playing #topbar{display:revert!important}
</style>
<link rel="stylesheet" href="/sfoth-skin/sfoth-2016.css">
<script defer src="/sfoth-skin/sfoth-avatar.js"></script>
<script defer src="/sfoth-skin/sfoth-maker.js"></script>
<script defer src="/sfoth-skin/sfoth-2016.js"></script>
`;

async function serveIndex(req, res) {
  let html;
  try { html = await fsp.readFile(path.join(WEBROOT, 'SFOTH', 'index.html'), 'utf8'); }
  catch { return sendText(res, 404, 'Not found'); }
  html = html.replace('</body>', CLIENT_INJECT + '</body>');
  return sendText(res, 200, html, 'text/html; charset=utf-8');
}

// ---------------------------------------------------------------------------
// minimal placeholder pages (not captured in the dump)
// ---------------------------------------------------------------------------
function placeholderPage(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · SFOTH</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:4rem auto;padding:0 1rem;background:#0b0d12;color:#e8eaf0}a{color:#7aa2ff}h1{font-size:1.6rem}</style></head><body><p><a href="/SFOTH/">← Back to the Heights</a></p><h1>${title}</h1>${body}</body></html>`;
}

const PAGES = {
  '/SFOTH/about': placeholderPage('About', '<p>Sword Fights on the Heights IV — served locally by the reconstructed SFOTH server.</p>'),
  '/SFOTH/leaderboards': placeholderPage('Leaderboards', '<p>Leaderboards are not available on this local server.</p>'),
  '/SFOTH/changelog': placeholderPage('Changelog', '<p>Local reconstruction build.</p>'),
  '/SFOTH/legal': placeholderPage('Legal', '<p>Original game &amp; assets © their respective authors. This is a local, non-commercial reconstruction for preservation/study.</p>'),
  '/SFOTH/unavailable': placeholderPage('Unavailable', '<p>The Heights are taking a break.</p>'),
};

// ---------------------------------------------------------------------------
// routing
// ---------------------------------------------------------------------------
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization, X-SFOTH-Member-Intent, X-SFOTH-Operator',
    });
    return res.end();
  }

  // Normalise both the SFOTH-prefixed and bare API namespaces.
  const api = pathname.replace(/^\/SFOTH\/api\//, 'api/').replace(/^\/api\//, 'api/');
  const isApi = api.startsWith('api/');

  // --- dynamic JSON GET endpoints ---
  if (method === 'GET' && isApi) {
    switch (api) {
      case 'api/config': return sendJson(res, 200, configPayload());
      case 'api/identity': return sendJson(res, 200, identityPayload(req));
      case 'api/lobby': return sendJson(res, 200, game.lobby());
      case 'api/maps': return sendJson(res, 200, { maps: maps.list(), active: maps.activeId });
      case 'api/maps/active': return sendJson(res, 200, { active: maps.activeId, map: maps.list().find((m) => m.active) || null });
      case 'api/play-count': return sendJson(res, 200, { totalPlays: game.totalPlays });
      case 'api/availability': return sendJson(res, 200, { disabled: false, message: 'The Heights are taking a break. SFOTH is temporarily unavailable. Please check back later.' });
      case 'api/broadcast/stream': return broadcastStream(req, res);
      case 'api/broadcast/replay': return sendJson(res, 200, { epoch: Number(url.searchParams.get('epoch')) || Date.now(), frames: [] });
      case 'api/sfoth/death-map': return sendJson(res, 200, { source: url.searchParams.get('source') || SOURCE_SHA256, days: 30, cells: [] });
      case 'api/sfoth/lobby-gems': return sendJson(res, 200, {});
      case 'api/sfoth/achievement-rewards/recent': return sendJson(res, 200, { username: chosenName(req) || null, rewards: [] });
      case 'api/feedback-link': {
        res.writeHead(302, { location: 'https://feedback.shedletsky.com/' });
        return res.end();
      }
      default: break; // fall through to static (recorded captures)
    }
  }

  // --- leave is sent as an HTTP DELETE (keepalive) on unload ---
  if (method === 'DELETE' && api === 'api/guest/leave') {
    game.leave(bearer(req));
    return sendJson(res, 200, { left: true });
  }

  // --- dynamic POST endpoints ---
  if (method === 'POST' && isApi) {
    switch (api) {
      case 'api/guest/join': {
        const body = await readJson(req);
        const name = chosenName(req) || (body.nickname || '').toString().slice(0, 20) || `Guest ${Math.floor(Math.random() * 9000 + 1000)}`;
        try {
          const offer = await game.join({ nickname: name, roomId: body.roomId });
          offer.sourceSha256 = SOURCE_SHA256;
          log(`[join] player ${offer.playerId} -> ${offer.roomId}`);
          return sendJson(res, 200, offer);
        } catch (e) {
          log('[join] error', e);
          return sendJson(res, 500, { error: 'join failed' });
        }
      }
      case 'api/guest/answer': {
        const session = bearer(req);
        const body = await readJson(req);
        if (!body.sdp || !game.answer(session, body.sdp)) {
          return sendJson(res, 409, { error: 'no such session' });
        }
        return sendJson(res, 200, { ok: true });
      }
      case 'api/guest/ice': {
        if (!bearer(req)) return sendJson(res, 401, { error: 'unauthorized' });
        return sendJson(res, 200, { iceServers: ICE_SERVERS });
      }
      case 'api/guest/leave': {
        game.leave(bearer(req));
        return sendJson(res, 200, { left: true });
      }
      case 'api/maps': {
        // create a PUBLIC map from the editor
        const body = await readJson(req);
        try {
          const author = chosenName(req) || (body.author || 'anonymous');
          const map = await maps.create({ ...body, author });
          return sendJson(res, 200, { ok: true, map: { id: map.id, name: map.name } });
        } catch (e) {
          log('[maps] create failed:', e.message);
          return sendJson(res, 400, { error: 'invalid map' });
        }
      }
      case 'api/maps/active': {
        const body = await readJson(req);
        const id = (body.id || '').toString();
        try {
          const refDir = await maps.setActive(id);
          game.reloadMap(refDir);
          return sendJson(res, 200, { ok: true, active: maps.activeId });
        } catch (e) {
          return sendJson(res, 404, { error: 'no such map' });
        }
      }
      case 'api/guest/queue':
      case 'api/guest/network':
      case 'api/guest/performance':
      case 'api/physics/results':
      case 'api/client-reports':
      case 'api/broadcast/react':
        await readBody(req).catch(() => {});
        return sendJson(res, 200, { ok: true });
      default: break;
    }
  }

  // --- active-map reference files (custom maps generate their own geometry) ---
  if (method === 'GET' && /^\/SFOTH\/reference\/(scene|arena)\.json$/.test(pathname)) {
    if (maps.activeId !== 'heights') {
      const which = pathname.endsWith('scene.json') ? 'scene' : 'arena';
      try {
        const obj = which === 'scene' ? await maps.sceneJson(maps.activeId) : await maps.arenaJson(maps.activeId);
        if (obj) return sendJson(res, 200, obj, { 'access-control-allow-origin': '*' });
      } catch (e) { log('[maps] serve', which, 'failed:', e.message); }
    }
    // heights (or failure) -> fall through to the original static file
  }

  // --- 2016 Roblox skin bundle (served from server/skin/) ---
  if (method === 'GET' && pathname.startsWith('/sfoth-skin/')) {
    const file = pathname.slice('/sfoth-skin/'.length);
    if (/^[\w.-]+$/.test(file)) {
      const abs = path.join(__dirname, 'skin', file);
      try {
        const buf = await fsp.readFile(abs);
        return sendText(res, 200, buf, mimeFor(abs));
      } catch { return sendText(res, 404, 'Not found'); }
    }
    return sendText(res, 404, 'Not found');
  }

  // --- injected game page (title + Set name + play + server list only) ---
  if (method === 'GET' && (pathname === '/SFOTH/' || pathname === '/SFOTH/index.html')) {
    return serveIndex(req, res);
  }

  // --- placeholder HTML pages ---
  if (method === 'GET' && PAGES[pathname.replace(/\/$/, '')]) {
    return sendText(res, 200, PAGES[pathname.replace(/\/$/, '')], 'text/html; charset=utf-8');
  }
  if (method === 'GET' && (pathname === '/' )) {
    res.writeHead(302, { location: '/SFOTH/' });
    return res.end();
  }

  // --- static files (client bundle + recorded captures) ---
  if (method === 'GET' || method === 'HEAD') {
    const served = await serveStatic(req, res, pathname);
    if (served !== false) return;
    // Missing asset? mirror it from the live site so we keep it for next time.
    if (await mirrorFromUpstream(req, res, pathname)) return;
  }

  sendText(res, 404, 'Not found');
}

// Fetch an asset we don't have from the real site, cache it to disk, serve it.
const UPSTREAM = process.env.SFOTH_UPSTREAM || 'https://shedletsky.com';
const mirrorPending = new Map();
async function mirrorFromUpstream(req, res, pathname) {
  if (!/^\/(SFOTH|account)\//.test(pathname) || pathname.includes('/api/')) return false;
  const rel = decodeURIComponent(pathname);
  const abs = path.normalize(path.join(WEBROOT, rel));
  if (abs !== WEBROOT && !abs.startsWith(WEBROOT + path.sep)) return false;

  let buf;
  if (mirrorPending.has(abs)) {
    buf = await mirrorPending.get(abs);
  } else {
    const p = (async () => {
      try {
        const up = await fetch(UPSTREAM + pathname, { headers: { 'user-agent': 'sfoth-local-mirror' } });
        if (!up.ok) return null;
        const b = Buffer.from(await up.arrayBuffer());
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        await fsp.writeFile(abs, b);
        log(`[mirror] ${pathname} <- ${UPSTREAM} (${b.length}B)`);
        return b;
      } catch (e) { log(`[mirror] failed ${pathname}: ${e.message}`); return null; }
    })();
    mirrorPending.set(abs, p);
    buf = await p;
    mirrorPending.delete(abs);
  }
  if (!buf) return false;
  res.writeHead(200, { 'content-type': mimeFor(abs), 'access-control-allow-origin': '*', 'cache-control': 'no-cache' });
  res.end(method_is_head(req) ? undefined : buf);
  return true;
}
function method_is_head(req) { return req.method.toUpperCase() === 'HEAD'; }

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    log('[error]', e);
    if (!res.headersSent) sendText(res, 500, 'Internal error');
    else res.end();
  });
});

server.listen(PORT, HOST, () => {
  log(`SFOTH server on http://localhost:${PORT}/SFOTH/  (webroot: ${WEBROOT})`);
});

function shutdown() {
  log('shutting down');
  game.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
