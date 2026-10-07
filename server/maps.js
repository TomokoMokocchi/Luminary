// Map store + generator.
//
// A "map" is a compact, editor-friendly definition (a list of coloured boxes,
// spawn pads, tools and scripts). From it we generate the two reference
// documents the engine needs: arena.json (authoritative physics: parts, spawns,
// per-part physics) and scene.json (the client's visual scene graph). The other
// four reference files (physics/combat/environment/items) are map-independent
// and reused.
//
// The built-in "heights" map is special: it serves the original captured
// reference files unchanged, so the default experience never regresses.
//
// Ownership: when a player first sets a username the client mints a per-browser
// key and keeps it in localStorage. Every map records a salted hash of the key
// of whoever created it (ownerKey). Edits and deletes require the same key, so a
// creator can manage their own maps from the same browser and nobody else can.
//
// All user-created maps are PUBLIC: every map saved here is listed for everyone,
// ordered by how much they are played and liked.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const SHARED_REFS = ['physics.json', 'combat.json', 'environment.json', 'items.json'];

// Salt for owner-key / voter hashes. Kept out of the client; stable across
// restarts so existing maps keep their owners.
const KEY_SALT = 'luminary-v1-ownerkey-salt';
export function hashKey(key) {
  return crypto.createHash('sha256').update(KEY_SALT + ':' + String(key || '')).digest('hex');
}

export class MapStore {
  constructor({ refDir, storeDir, genDir, sourceSha256, log = () => {} }) {
    this.refDir = refDir;        // original SFOTH/reference
    this.storeDir = storeDir;    // where user maps (.json definitions) live
    this.genDir = genDir;        // where generated per-map refDirs are materialised
    this.sha = sourceSha256;
    this.log = log;
    this.maps = new Map();       // id -> definition
    this._tpl = null;            // cached scene templates
    this._saveTimers = new Map();
  }

  async init() {
    await fsp.mkdir(this.storeDir, { recursive: true });
    await fsp.mkdir(this.genDir, { recursive: true });
    // built-in Heights
    this.maps.set('heights', {
      id: 'heights', name: 'Luminary', author: 'Shedletsky', builtin: true,
      createdAt: 0, blocks: [], spawns: [], scripts: [], tools: [],
      plays: 0, likes: 0, dislikes: 0, votes: {}, ownerKey: null,
    });
    // load user maps
    let files = [];
    try { files = await fsp.readdir(this.storeDir); } catch {}
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const def = JSON.parse(await fsp.readFile(path.join(this.storeDir, f), 'utf8'));
        if (def && def.id) this.maps.set(def.id, this._normalizeLoaded(def));
      } catch (e) { this.log(`[maps] bad map ${f}: ${e.message}`); }
    }
    this.log(`[maps] loaded ${this.maps.size - 1} user map(s)`);
  }

  _normalizeLoaded(def) {
    def.scripts = Array.isArray(def.scripts) ? def.scripts : [];
    def.tools = Array.isArray(def.tools) ? def.tools : [];
    def.plays = Number.isFinite(def.plays) ? def.plays : 0;
    def.likes = Number.isFinite(def.likes) ? def.likes : 0;
    def.dislikes = Number.isFinite(def.dislikes) ? def.dislikes : 0;
    def.votes = def.votes && typeof def.votes === 'object' ? def.votes : {};
    def.ownerKey = def.ownerKey || null;
    return def;
  }

  // Popularity score: plays dominate, net likes break ties / give a small boost.
  _score(m) {
    return (m.plays || 0) * 3 + ((m.likes || 0) - (m.dislikes || 0));
  }

  // Public listing. `viewerKey` (hashed) lets the client learn which maps it
  // owns (so it can show edit/delete). Sorted most-played/most-popular first,
  // with the built-in arena kept at the top.
  list(viewerKeyHash = null) {
    const arr = [...this.maps.values()].map((m) => ({
      id: m.id, name: m.name, author: m.author || 'anonymous', builtin: !!m.builtin,
      createdAt: m.createdAt || 0, updatedAt: m.updatedAt || m.createdAt || 0,
      blocks: (m.blocks || []).length, spawns: (m.spawns || []).length,
      scripts: (m.scripts || []).length, tools: (m.tools || []).length,
      plays: m.plays || 0, likes: m.likes || 0, dislikes: m.dislikes || 0,
      score: this._score(m),
      owned: !!(viewerKeyHash && m.ownerKey && m.ownerKey === viewerKeyHash),
    }));
    arr.sort((a, b) => {
      if (a.builtin !== b.builtin) return a.builtin ? -1 : 1; // Heights pinned on top
      if (b.score !== a.score) return b.score - a.score;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return arr;
  }

  get(id) { return this.maps.get(id); }
  has(id) { return this.maps.has(id); }

  _persist(id) {
    const def = this.maps.get(id);
    if (!def || def.builtin) return;
    // debounce writes so rapid like/play updates don't thrash the disk
    clearTimeout(this._saveTimers.get(id));
    this._saveTimers.set(id, setTimeout(() => {
      fsp.writeFile(path.join(this.storeDir, id + '.json'), JSON.stringify(def, null, 2))
        .catch((e) => this.log(`[maps] persist ${id}: ${e.message}`));
    }, 250));
  }

  async _persistNow(id) {
    const def = this.maps.get(id);
    if (!def || def.builtin) return;
    clearTimeout(this._saveTimers.get(id));
    await fsp.writeFile(path.join(this.storeDir, id + '.json'), JSON.stringify(def, null, 2));
  }

  // --- create a public map from editor output -----------------------------
  async create(def, ownerKeyHash = null) {
    const id = 'map-' + crypto.randomBytes(5).toString('hex');
    const clean = {
      id,
      name: (def.name || 'Untitled').toString().slice(0, 40),
      author: (def.author || 'anonymous').toString().slice(0, 20),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      builtin: false,
      ownerKey: ownerKeyHash || null,
      blocks: sanitizeBlocks(def.blocks),
      spawns: sanitizeSpawns(def.spawns),
      tools: sanitizeTools(def.tools),
      scripts: sanitizeScripts(def.scripts),
      plays: 0, likes: 0, dislikes: 0, votes: {},
    };
    if (!clean.spawns.length) clean.spawns = [[0, 1, 0]]; // always at least one spawn
    this.maps.set(id, clean);
    await this._persistNow(id);
    this.log(`[maps] created "${clean.name}" (${id}) by ${clean.author}: ${clean.blocks.length} blocks, ${clean.spawns.length} spawns, ${clean.scripts.length} scripts`);
    return clean;
  }

  // --- edit an existing map (owner only) ----------------------------------
  // Returns 'ok' | 'notfound' | 'forbidden'
  async update(id, def, ownerKeyHash) {
    const m = this.maps.get(id);
    if (!m || m.builtin) return 'notfound';
    if (!m.ownerKey || m.ownerKey !== ownerKeyHash) return 'forbidden';
    if (def.name != null) m.name = def.name.toString().slice(0, 40);
    if (def.blocks != null) m.blocks = sanitizeBlocks(def.blocks);
    if (def.spawns != null) { m.spawns = sanitizeSpawns(def.spawns); if (!m.spawns.length) m.spawns = [[0, 1, 0]]; }
    if (def.tools != null) m.tools = sanitizeTools(def.tools);
    if (def.scripts != null) m.scripts = sanitizeScripts(def.scripts);
    m.updatedAt = Date.now();
    this._dropGenerated(id);
    await this._persistNow(id);
    this.log(`[maps] updated "${m.name}" (${id})`);
    return 'ok';
  }

  // --- delete a map (owner only) ------------------------------------------
  async remove(id, ownerKeyHash) {
    const m = this.maps.get(id);
    if (!m || m.builtin) return 'notfound';
    if (!m.ownerKey || m.ownerKey !== ownerKeyHash) return 'forbidden';
    this.maps.delete(id);
    this._dropGenerated(id);
    try { await fsp.unlink(path.join(this.storeDir, id + '.json')); } catch {}
    this.log(`[maps] deleted "${m.name}" (${id})`);
    return 'ok';
  }

  _dropGenerated(id) {
    const out = path.join(this.genDir, id);
    fsp.rm(out, { recursive: true, force: true }).catch(() => {});
  }

  // --- popularity ---------------------------------------------------------
  recordPlay(id) {
    const m = this.maps.get(id);
    if (!m) return;
    m.plays = (m.plays || 0) + 1;
    this._persist(id);
  }

  // Record a like/dislike. `voterHash` identifies the voter (IP + optional key)
  // so each voter counts once; re-voting the same way clears the vote (toggle).
  // Returns { likes, dislikes, vote } or null if the map is unknown.
  vote(id, voterHash, value) {
    const m = this.maps.get(id);
    if (!m || m.builtin) return null;
    const v = value > 0 ? 1 : value < 0 ? -1 : 0;
    const prev = m.votes[voterHash] || 0;
    const next = prev === v ? 0 : v; // clicking the same button again clears it
    // unapply previous
    if (prev === 1) m.likes = Math.max(0, m.likes - 1);
    else if (prev === -1) m.dislikes = Math.max(0, m.dislikes - 1);
    // apply next
    if (next === 1) m.likes++;
    else if (next === -1) m.dislikes++;
    if (next === 0) delete m.votes[voterHash];
    else m.votes[voterHash] = next;
    this._persist(id);
    return { likes: m.likes, dislikes: m.dislikes, vote: next };
  }

  voteOf(id, voterHash) {
    const m = this.maps.get(id);
    if (!m) return 0;
    return m.votes[voterHash] || 0;
  }

  // Return the refDir the sim should load for a given map.
  async refDirFor(id) {
    if (!id || id === 'heights') return this.refDir;
    if (!this.maps.has(id)) return this.refDir;
    return this.materialize(id);
  }

  // Build a refDir on disk (arena.json generated + shared files reused).
  async materialize(id) {
    if (id === 'heights') return this.refDir;
    const def = this.maps.get(id);
    if (!def) throw new Error('no such map');
    const out = path.join(this.genDir, id);
    await fsp.mkdir(out, { recursive: true });
    await fsp.writeFile(path.join(out, 'arena.json'), JSON.stringify(this.generateArena(def)));
    // reuse the map-independent reference files
    for (const f of SHARED_REFS) {
      const dst = path.join(out, f);
      try { await fsp.copyFile(path.join(this.refDir, f), dst); } catch (e) { this.log(`[maps] copy ${f}: ${e.message}`); }
    }
    return out;
  }

  // --- scene.json (client visuals) for a map ------------------------------
  async sceneJson(id) {
    if (id === 'heights') return null; // caller serves the original file
    const def = this.maps.get(id);
    if (!def) return null;
    await this._loadTemplates();
    return this.generateScene(def);
  }
  async arenaJson(id) {
    if (id === 'heights') return null;
    const def = this.maps.get(id);
    if (!def) return null;
    return this.generateArena(def);
  }

  async _loadTemplates() {
    if (this._tpl) return this._tpl;
    const scene = JSON.parse(await fsp.readFile(path.join(this.refDir, 'scene.json'), 'utf8'));
    const find = (cn) => scene.parts.find((p) => p.className === cn);
    this._tpl = {
      part: find('Part'),
      spawn: find('SpawnLocation'),
      lighting: scene.lighting,
      workspaceProps: scene.workspace.properties,
      cameraTpl: scene.camera,
    };
    return this._tpl;
  }

  // ========================================================================
  //  GENERATORS
  // ========================================================================
  generateArena(def) {
    const parts = [];
    const physParts = [];
    const spawns = [];
    let id = 2;

    const addBox = (pos, size, { motion = 'static' } = {}) => {
      const pid = id++;
      parts.push({
        id: pid, name: 'Part', assemblyId: pid, motion, shape: 'box',
        approximateShape: false,
        frame: { position: pos, rotation: IDENTITY.slice() },
        size,
      });
      const volume = Math.max(0.001, size[0] * size[1] * size[2]);
      physParts.push({
        id: pid, mass: +(0.7 * volume).toFixed(3), density: 0.7, friction: 0.3,
        elasticity: 0.2, frictionWeight: 1, elasticityWeight: 1,
        velocity: [0, 0, 0], angularVelocity: [0, 0, 0],
        climbable: false, canTouch: true, measured: true,
      });
      return pid;
    };

    for (const b of def.blocks) addBox(b.pos, b.size);

    // Spawns: in the original arena a spawn pad is ONE body that is BOTH a
    // collidable part AND the spawn record, sharing a single id — the player is
    // placed standing on top of it (heights id 50 is both). Creating a SEPARATE
    // overlapping box at the same spot (as we used to) makes the player spawn
    // *inside* a second collider and get flung. So each spawn is a single normal
    // static box (valid, computed physics) whose id the spawn record reuses.
    const padSize = [6, 1.2, 6];
    for (const s of def.spawns) {
      const pos = [s[0], s[1], s[2]];
      const pid = addBox(pos, padSize.slice()); // real part + valid physics, returns id
      parts[parts.length - 1].name = 'SpawnLocation';
      spawns.push({ id: pid, frame: { position: pos, rotation: IDENTITY.slice() }, size: padSize.slice(), duration: 3 });
    }

    return {
      formatVersion: 1,
      sourceSha256: this.sha,
      parts,
      spawns,
      wobblies: [],
      removedGuideIds: [],
      pickupProxyIds: [],
      frozenAssemblyIds: [],
      rigidJointCount: 0,
      respawnSeconds: 5,
      maxSlopeAngle: 89,
      physics: {
        parts: physParts,
        elevators: [], motors: [], freeBodyIds: [], removedHelperIds: [],
      },
    };
  }

  generateScene(def) {
    const t = this._tpl;
    const parts = [];
    const childIds = [];
    let id = 2;

    const clonePart = (tpl, { pos, size, color, name, rotation = IDENTITY }) => {
      const p = JSON.parse(JSON.stringify(tpl));
      const pid = id++;
      p.id = pid; p.name = name; p.path = 'Workspace/' + name; p.parent = 0; p.children = [];
      const P = p.properties;
      P.CFrame.value.position = pos.slice();
      P.CFrame.value.rotation = rotation.slice();
      P.size.value = size.slice();
      if (P.Color3uint8) P.Color3uint8.value = color.slice();
      if (P.Name) P.Name.value = name;
      if (P.Anchored) P.Anchored.value = true;
      if (P.CanCollide) P.CanCollide.value = true;
      if (P.Transparency) P.Transparency.value = 0;
      childIds.push(pid);
      parts.push(p);
      return pid;
    };

    for (const b of def.blocks) {
      clonePart(t.part, { pos: b.pos, size: b.size, color: b.color || [163, 162, 165], name: 'Block' });
    }
    for (const s of def.spawns) {
      clonePart(t.spawn, { pos: [s[0], s[1], s[2]], size: [6, 1.2, 6], color: [245, 205, 48], name: 'SpawnLocation' });
    }

    // a camera that frames the whole map
    const b = bounds(def);
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const span = Math.max(40, b.maxX - b.minX, b.maxZ - b.minZ);
    const camera = JSON.parse(JSON.stringify(t.cameraTpl));
    camera.properties.CFrame.value = {
      position: [cx, b.maxY + span * 0.7, cz + span * 0.9],
      rotation: [0.86, -0.17, 0.48, 0, 0.94, 0.34, -0.51, -0.29, 0.81],
    };
    if (camera.properties.Focus) camera.properties.Focus.value = { position: [cx, b.maxY, cz], rotation: IDENTITY.slice() };

    const ws = {
      id: 0, className: 'Workspace', parent: -1, name: 'Workspace',
      children: childIds.concat([camera.id]),
      properties: JSON.parse(JSON.stringify(t.workspaceProps)),
    };
    if (ws.properties.PrimaryPart) ws.properties.PrimaryPart.value = { referent: childIds[0] || 2 };

    return {
      formatVersion: 1,
      sourceSha256: this.sha,
      parts,
      lighting: t.lighting,
      camera,
      workspace: ws,
    };
  }
}

function bounds(def) {
  let minX = -20, maxX = 20, minZ = -20, maxZ = 20, minY = -2, maxY = 4;
  const acc = (pos, size) => {
    minX = Math.min(minX, pos[0] - size[0] / 2); maxX = Math.max(maxX, pos[0] + size[0] / 2);
    minY = Math.min(minY, pos[1] - size[1] / 2); maxY = Math.max(maxY, pos[1] + size[1] / 2);
    minZ = Math.min(minZ, pos[2] - size[2] / 2); maxZ = Math.max(maxZ, pos[2] + size[2] / 2);
  };
  for (const b of def.blocks || []) acc(b.pos, b.size);
  for (const s of def.spawns || []) acc([s[0], s[1], s[2]], [6, 1.2, 6]);
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const clampByte = (v) => Math.max(0, Math.min(255, Math.round(num(v, 160))));

function sanitizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.slice(0, 2000).map((b) => ({
    pos: [num(b.pos?.[0], 0), num(b.pos?.[1], 0), num(b.pos?.[2], 0)],
    size: [
      Math.max(0.2, Math.min(2048, num(b.size?.[0], 4))),
      Math.max(0.2, Math.min(2048, num(b.size?.[1], 1))),
      Math.max(0.2, Math.min(2048, num(b.size?.[2], 4))),
    ],
    color: [clampByte(b.color?.[0]), clampByte(b.color?.[1]), clampByte(b.color?.[2])],
  }));
}

function sanitizeSpawns(spawns) {
  if (!Array.isArray(spawns)) return [];
  return spawns.slice(0, 64).map((s) => [num(s[0], 0), num(s[1], 1), num(s[2], 0)]);
}

// A tool is a named, coloured handle that can be placed in the world or in the
// starter inventory, and can carry a client/server script by name.
function sanitizeTools(tools) {
  if (!Array.isArray(tools)) return [];
  return tools.slice(0, 64).map((t) => ({
    name: (t.name || 'Tool').toString().slice(0, 40),
    color: [clampByte(t.color?.[0]), clampByte(t.color?.[1]), clampByte(t.color?.[2])],
    pos: t.pos ? [num(t.pos[0], 0), num(t.pos[1], 3), num(t.pos[2], 0)] : null,
    starter: !!t.starter,
    script: t.script ? String(t.script).slice(0, 20000) : '',
  }));
}

// Scripts carry a name, a side (client/server) and source text. We store them
// verbatim (clamped); execution/sandboxing is the runtime's concern.
function sanitizeScripts(scripts) {
  if (!Array.isArray(scripts)) return [];
  return scripts.slice(0, 64).map((s) => ({
    name: (s.name || 'Script').toString().slice(0, 60),
    type: s.type === 'server' ? 'server' : 'client',
    source: String(s.source || '').slice(0, 100000),
  }));
}
