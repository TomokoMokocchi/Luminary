// Map store + generator.
//
// A "map" is a compact, editor-friendly definition (a list of coloured boxes
// and spawn pads). From it we generate the two reference documents the engine
// needs: arena.json (authoritative physics: parts, spawns, per-part physics)
// and scene.json (the client's visual scene graph). The other four reference
// files (physics/combat/environment/items) are map-independent and reused.
//
// The built-in "heights" map is special: it serves the original captured
// reference files unchanged, so the default experience never regresses.
//
// All user-created maps are PUBLIC: every map saved here is listed for everyone.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const SHARED_REFS = ['physics.json', 'combat.json', 'environment.json', 'items.json'];

export class MapStore {
  constructor({ refDir, storeDir, genDir, sourceSha256, log = () => {} }) {
    this.refDir = refDir;        // original SFOTH/reference
    this.storeDir = storeDir;    // where user maps (.json definitions) live
    this.genDir = genDir;        // where generated per-map refDirs are materialised
    this.sha = sourceSha256;
    this.log = log;
    this.maps = new Map();       // id -> definition
    this.activeId = 'heights';
    this._tpl = null;            // cached scene templates
  }

  async init() {
    await fsp.mkdir(this.storeDir, { recursive: true });
    await fsp.mkdir(this.genDir, { recursive: true });
    // built-in Heights
    this.maps.set('heights', {
      id: 'heights', name: 'Luminary', author: 'Shedletsky', builtin: true,
      createdAt: 0, blocks: [], spawns: [],
    });
    // load user maps
    let files = [];
    try { files = await fsp.readdir(this.storeDir); } catch {}
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const def = JSON.parse(await fsp.readFile(path.join(this.storeDir, f), 'utf8'));
        if (def && def.id) this.maps.set(def.id, def);
      } catch (e) { this.log(`[maps] bad map ${f}: ${e.message}`); }
    }
    this.log(`[maps] loaded ${this.maps.size - 1} user map(s); active=${this.activeId}`);
  }

  list() {
    return [...this.maps.values()].map((m) => ({
      id: m.id, name: m.name, author: m.author || 'anonymous', builtin: !!m.builtin,
      createdAt: m.createdAt || 0, blocks: (m.blocks || []).length, spawns: (m.spawns || []).length,
      active: m.id === this.activeId,
    }));
  }

  get(id) { return this.maps.get(id); }
  activeMap() { return this.maps.get(this.activeId) || this.maps.get('heights'); }

  // --- create a public map from editor output -----------------------------
  async create(def) {
    const id = 'map-' + Math.random().toString(36).slice(2, 9);
    const clean = {
      id,
      name: (def.name || 'Untitled').toString().slice(0, 40),
      author: (def.author || 'anonymous').toString().slice(0, 20),
      createdAt: Date.now(),
      builtin: false,
      blocks: sanitizeBlocks(def.blocks),
      spawns: sanitizeSpawns(def.spawns),
    };
    if (!clean.spawns.length) clean.spawns = [[0, 1, 0]]; // always at least one spawn
    this.maps.set(id, clean);
    await fsp.writeFile(path.join(this.storeDir, id + '.json'), JSON.stringify(clean, null, 2));
    this.log(`[maps] created "${clean.name}" (${id}) by ${clean.author}: ${clean.blocks.length} blocks, ${clean.spawns.length} spawns`);
    return clean;
  }

  async setActive(id) {
    if (!this.maps.has(id)) throw new Error('no such map');
    this.activeId = id;
    const dir = await this.materialize(id);
    this.log(`[maps] active map -> ${id}`);
    return dir;
  }

  // Return the refDir the sim should load for the active map.
  async activeRefDir() {
    if (this.activeId === 'heights') return this.refDir;
    return this.materialize(this.activeId);
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

  // --- scene.json (client visuals) for the active map ---------------------
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

    let sid = 1000;
    for (const s of def.spawns) {
      const pid = sid++;
      spawns.push({
        id: pid,
        frame: { position: [s[0], s[1], s[2]], rotation: IDENTITY.slice() },
        size: [6, 1.2, 6], duration: 3,
      });
      // a spawn is also a collidable pad so players land on something
      const bpid = addBox([s[0], s[1], s[2]], [6, 1.2, 6]);
      void bpid;
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
        // phantom + touchstoneDestination are optional (nullable); omitting them
        // keeps them null so the validator's phantom-plate checks are skipped.
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
  return blocks.slice(0, 400).map((b) => ({
    pos: [num(b.pos?.[0], 0), num(b.pos?.[1], 0), num(b.pos?.[2], 0)],
    size: [
      Math.max(0.2, Math.min(512, num(b.size?.[0], 4))),
      Math.max(0.2, Math.min(512, num(b.size?.[1], 1))),
      Math.max(0.2, Math.min(512, num(b.size?.[2], 4))),
    ],
    color: [clampByte(b.color?.[0]), clampByte(b.color?.[1]), clampByte(b.color?.[2])],
  }));
}

function sanitizeSpawns(spawns) {
  if (!Array.isArray(spawns)) return [];
  return spawns.slice(0, 32).map((s) => [num(s[0], 0), num(s[1], 1), num(s[2], 0)]);
}
