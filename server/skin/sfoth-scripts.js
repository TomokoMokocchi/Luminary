/* ===========================================================================
   Luminary — in-game scripting runtime  (Roblox-like)
   A sandboxed, client-side DataModel with Instances, Properties, Events,
   datatypes and services. A game's client (LocalScript) code runs here in an
   isolated Web Worker — it cannot touch the page, cookies or the network — and
   drives real on-screen GUI and real audio through a message bridge.

   Scripts are JavaScript (Luau-style API). Because JS can't yield like Lua,
   waits are awaited:  await wait(1)  /  await task.wait(0.5).

   Highlights (see the in-editor Docs for the full list):
     game, workspace, game:GetService("Players"/"RunService"/"Lighting"/…)
     Instance.new("Part"|"Sound"|"ScreenGui"|"TextButton"|"Tool"|…)
     Vector3 / Color3 / UDim2 / CFrame / Enum
     Events: .ChildAdded .ChildRemoved .Changed .Touched
             Players.PlayerAdded / .PlayerRemoving
             Player.CharacterAdded   Humanoid.Died
             RunService.Heartbeat / .Stepped / .RenderStepped
             TextButton.MouseButton1Click
     Sound.SoundId + :Play() :Pause() :Stop()   (real audio)
     GUIs (ScreenGui/Frame/TextLabel/TextButton/ImageLabel) render on screen.
   SERVER scripts are stored with the map; this browser runtime runs client
   (LocalScript) code only — server-authoritative scripting would need the .NET
   sim and is out of scope.  window.LuminaryScripts.{test,runForMap,stopAll}.
   =========================================================================== */
(function () {
  'use strict';

  // =========================================================================
  //  WORKER PROGRAM  (authored as a function, shipped via toString)
  // =========================================================================
  function workerMain() {
    'use strict';
    var DIRTY = false;              // GUI changed -> reserialize
    var SOUND_SEQ = 1;
    function post(m) { postMessage(m); }
    function reportErr(e) { post({ t: 'err', v: String((e && e.stack) || e) }); }

    // ---- datatypes --------------------------------------------------------
    function Vector3(x, y, z) { this.X = +x || 0; this.Y = +y || 0; this.Z = +z || 0; }
    Vector3.prototype.add = function (o) { return new Vector3(this.X + o.X, this.Y + o.Y, this.Z + o.Z); };
    Vector3.prototype.sub = function (o) { return new Vector3(this.X - o.X, this.Y - o.Y, this.Z - o.Z); };
    Vector3.prototype.mul = function (s) { return typeof s === 'number' ? new Vector3(this.X * s, this.Y * s, this.Z * s) : new Vector3(this.X * s.X, this.Y * s.Y, this.Z * s.Z); };
    Vector3.prototype.Dot = function (o) { return this.X * o.X + this.Y * o.Y + this.Z * o.Z; };
    Vector3.prototype.Lerp = function (o, a) { return new Vector3(this.X + (o.X - this.X) * a, this.Y + (o.Y - this.Y) * a, this.Z + (o.Z - this.Z) * a); };
    Object.defineProperty(Vector3.prototype, 'Magnitude', { get: function () { return Math.sqrt(this.X * this.X + this.Y * this.Y + this.Z * this.Z); } });
    Object.defineProperty(Vector3.prototype, 'Unit', { get: function () { var m = this.Magnitude || 1; return new Vector3(this.X / m, this.Y / m, this.Z / m); } });
    Vector3.prototype.toString = function () { return this.X + ', ' + this.Y + ', ' + this.Z; };
    var Vector3NS = function (x, y, z) { return new Vector3(x, y, z); }; Vector3NS.new = function (x, y, z) { return new Vector3(x, y, z); };
    Vector3NS.zero = new Vector3(0, 0, 0); Vector3NS.one = new Vector3(1, 1, 1);

    function Color3(r, g, b) { this.R = r || 0; this.G = g || 0; this.B = b || 0; }
    Color3.prototype.toRGB = function () { return [Math.round(this.R * 255), Math.round(this.G * 255), Math.round(this.B * 255)]; };
    Color3.prototype.toString = function () { return this.R + ', ' + this.G + ', ' + this.B; };
    var Color3NS = { new: function (r, g, b) { return new Color3(r, g, b); }, fromRGB: function (r, g, b) { return new Color3((r || 0) / 255, (g || 0) / 255, (b || 0) / 255); }, fromHSV: function (h, s, v) { var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s), m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; return new Color3(m[0], m[1], m[2]); } };

    function UDim(scale, offset) { this.Scale = scale || 0; this.Offset = offset || 0; }
    function UDim2(sx, ox, sy, oy) { this.X = new UDim(sx, ox); this.Y = new UDim(sy, oy); }
    var UDim2NS = { new: function (sx, ox, sy, oy) { return new UDim2(sx, ox, sy, oy); }, fromScale: function (x, y) { return new UDim2(x, 0, y, 0); }, fromOffset: function (x, y) { return new UDim2(0, x, 0, y); } };

    function CFrame(x, y, z) { this.Position = new Vector3(x, y, z); this.X = x || 0; this.Y = y || 0; this.Z = z || 0; }
    CFrame.prototype.mul = function (o) { if (o instanceof Vector3) return new Vector3(this.X + o.X, this.Y + o.Y, this.Z + o.Z); return new CFrame(this.X + o.X, this.Y + o.Y, this.Z + o.Z); };
    var CFrameNS = function (x, y, z) { return new CFrame(x, y, z); }; CFrameNS.new = function (x, y, z) { return new CFrame(x, y, z); };

    // Enum: a permissive proxy so Enum.Anything.Anything never throws.
    function enumToken(cat, name) { return { EnumType: cat, Name: name, Value: 0, toString: function () { return 'Enum.' + cat + '.' + name; } }; }
    var Enum = new Proxy({}, { get: function (_, cat) { return new Proxy({}, { get: function (_2, name) { return enumToken(String(cat), String(name)); } }); } });

    // ---- Signal -----------------------------------------------------------
    function Signal() { this._c = []; }
    Signal.prototype.Connect = function (fn) { var c = { fn: fn, connected: true }; c.Disconnect = function () { c.connected = false; }; c.disconnect = c.Disconnect; this._c.push(c); return c; };
    Signal.prototype.Once = function (fn) { var self = this; var c = this.Connect(function () { c.Disconnect(); fn.apply(null, arguments); }); return c; };
    Signal.prototype.Fire = function () { var a = arguments, self = this; this._c.slice().forEach(function (c) { if (c.connected) { try { c.fn.apply(null, a); } catch (e) { reportErr(e); } } }); };
    Signal.prototype.Wait = function () { var self = this; return new Promise(function (res) { var c = self.Connect(function () { c.Disconnect(); res.apply(null, arguments); }); }); };

    // ---- Instance ---------------------------------------------------------
    var PROXY = new WeakMap(); // raw -> proxy
    function raw(v) { return (v && v.__raw) ? v.__raw : v; }

    // default properties + which events each class exposes
    var CLASS = {
      Instance: { props: {}, ev: [] },
      Part: { props: { Anchored: false, CanCollide: true, Transparency: 0, Size: new Vector3(4, 1, 2), Position: new Vector3(0, 0, 0), Color: new Color3(0.64, 0.64, 0.65), Material: 'Plastic', Reflectance: 0, CastShadow: true }, ev: ['Touched', 'TouchEnded'] },
      WedgePart: { inherit: 'Part' }, TrussPart: { inherit: 'Part' }, MeshPart: { inherit: 'Part' }, CornerWedgePart: { inherit: 'Part' },
      SpawnLocation: { inherit: 'Part', props: { Neutral: true, Duration: 10, Enabled: true } },
      Seat: { inherit: 'Part', props: { Occupant: null } },
      Model: { props: { PrimaryPart: null }, ev: [] },
      Folder: { props: {}, ev: [] },
      Configuration: { props: {}, ev: [] },
      Tool: { props: { RequiresHandle: true, CanBeDropped: true, ToolTip: '', Grip: new CFrame(0, 0, 0), Enabled: true }, ev: ['Activated', 'Deactivated', 'Equipped', 'Unequipped'] },
      Script: { props: { Source: '', Enabled: true, Disabled: false }, ev: [] },
      LocalScript: { inherit: 'Script' }, ModuleScript: { props: { Source: '' }, ev: [] },
      Sound: { props: { SoundId: '', Volume: 0.5, Looped: false, Playing: false, PlaybackSpeed: 1, TimePosition: 0 }, ev: ['Ended', 'Played', 'Paused'] },
      Humanoid: { props: { Health: 100, MaxHealth: 100, WalkSpeed: 16, JumpPower: 50, DisplayName: '', RigType: 'R6' }, ev: ['Died', 'HealthChanged', 'Running', 'Jumping', 'Seated'] },
      Players: { props: { MaxPlayers: 15, NumPlayers: 0 }, ev: ['PlayerAdded', 'PlayerRemoving'] },
      Player: { props: { UserId: 0, DisplayName: '', Team: null, Character: null, Neutral: true }, ev: ['CharacterAdded', 'CharacterRemoving', 'Chatted', 'Died'] },
      Workspace: { props: { Gravity: 196.2, FallenPartsDestroyHeight: -500 }, ev: [] },
      Lighting: { props: { Brightness: 2, ClockTime: 14, FogEnd: 100000, Ambient: new Color3(0, 0, 0), OutdoorAmbient: new Color3(0.4, 0.4, 0.4) }, ev: [] },
      RunService: { props: {}, ev: ['Heartbeat', 'Stepped', 'RenderStepped'] },
      SoundService: { props: {}, ev: [] }, ReplicatedStorage: { props: {}, ev: [] }, ServerStorage: { props: {}, ev: [] },
      StarterGui: { props: {}, ev: [] }, StarterPack: { props: {}, ev: [] }, StarterPlayer: { props: {}, ev: [] },
      Teams: { props: {}, ev: [] }, Team: { props: { TeamColor: new Color3(1, 1, 1), AutoAssignable: true }, ev: ['PlayerAdded', 'PlayerRemoved'] },
      ScreenGui: { props: { Enabled: true, ResetOnSpawn: true }, ev: [] },
      Frame: { props: { Position: new UDim2(0, 0, 0, 0), Size: new UDim2(0, 100, 0, 100), BackgroundColor3: new Color3(1, 1, 1), BackgroundTransparency: 0, Visible: true, BorderSizePixel: 1, ZIndex: 1 }, ev: [] },
      TextLabel: { inherit: 'Frame', props: { Text: 'Label', TextColor3: new Color3(0, 0, 0), TextScaled: false, TextSize: 18, Font: 'SourceSans', TextXAlignment: 'Center', TextYAlignment: 'Center' } },
      TextButton: { inherit: 'TextLabel', props: {}, ev: ['MouseButton1Click', 'MouseButton1Down', 'MouseEnter', 'MouseLeave', 'Activated'] },
      TextBox: { inherit: 'TextLabel', props: { PlaceholderText: '' }, ev: ['FocusLost', 'Focused'] },
      ImageLabel: { inherit: 'Frame', props: { Image: '', ImageColor3: new Color3(1, 1, 1), ScaleType: 'Stretch' } },
      ImageButton: { inherit: 'ImageLabel', ev: ['MouseButton1Click'] },
      BillboardGui: { props: { Size: new UDim2(0, 200, 0, 50), Adornee: null, Enabled: true }, ev: [] },
      PointLight: { props: { Brightness: 1, Range: 8, Color: new Color3(1, 1, 1), Enabled: true }, ev: [] },
      Decal: { props: { Texture: '', Color3: new Color3(1, 1, 1), Transparency: 0, Face: 'Front' }, ev: [] },
      Attachment: { props: { Position: new Vector3(0, 0, 0) }, ev: [] },
      Accessory: { props: {}, ev: [] }, Accoutrement: { inherit: 'Accessory' },
      BodyVelocity: { props: { Velocity: new Vector3(0, 0, 0), MaxForce: new Vector3(4000, 4000, 4000) }, ev: [] },
      IntValue: { props: { Value: 0 }, ev: [] }, NumberValue: { props: { Value: 0 }, ev: [] },
      StringValue: { props: { Value: '' }, ev: [] }, BoolValue: { props: { Value: false }, ev: [] },
      ObjectValue: { props: { Value: null }, ev: [] }, Vector3Value: { props: { Value: new Vector3(0, 0, 0) }, ev: [] },
      Color3Value: { props: { Value: new Color3(1, 1, 1) }, ev: [] },
    };
    function classDef(cn) {
      var d = CLASS[cn] || CLASS.Instance;
      var props = {}, ev = [];
      if (d.inherit) { var p = classDef(d.inherit); Object.assign(props, p.props); ev = ev.concat(p.ev); }
      Object.assign(props, d.props || {});
      ev = ev.concat(d.ev || []);
      return { props: props, ev: ev };
    }

    var UID = 1;
    function Inst(cn) {
      this.ClassName = cn; this.Name = cn; this._children = []; this._parent = null; this._uid = UID++;
      this._props = {}; this._sig = {}; this._propsig = {}; this._conns = [];
      var def = classDef(cn);
      for (var k in def.props) this._props[k] = cloneVal(def.props[k]);
      this.ChildAdded = this.sig('ChildAdded'); this.ChildRemoved = this.sig('ChildRemoved');
      this.Changed = this.sig('Changed'); this.AncestryChanged = this.sig('AncestryChanged'); this.Destroying = this.sig('Destroying');
      var self = this;
      def.ev.forEach(function (e) { self.sig(e); });
      this._isGui = /Gui$|Frame|Label|Button|Box$/.test(cn) || cn === 'Frame';
    }
    function cloneVal(v) { if (v instanceof Vector3) return new Vector3(v.X, v.Y, v.Z); if (v instanceof Color3) return new Color3(v.R, v.G, v.B); if (v instanceof UDim2) return new UDim2(v.X.Scale, v.X.Offset, v.Y.Scale, v.Y.Offset); return v; }
    Inst.prototype.sig = function (name) { if (!this._sig[name]) this._sig[name] = new Signal(); return this._sig[name]; };
    Inst.prototype.IsA = function (cn) { var c = this.ClassName; while (c) { if (c === cn) return true; var d = CLASS[c]; c = d && d.inherit; } return cn === 'Instance'; };
    Inst.prototype.GetChildren = function () { return this._children.map(proxy); };
    Inst.prototype.GetDescendants = function () { var out = []; (function rec(n) { n._children.forEach(function (c) { out.push(proxy(c)); rec(c); }); })(this); return out; };
    Inst.prototype.FindFirstChild = function (name, recursive) { for (var i = 0; i < this._children.length; i++) if (this._children[i].Name === name) return proxy(this._children[i]); if (recursive) { var d = this.GetDescendants(); for (var j = 0; j < d.length; j++) if (raw(d[j]).Name === name) return d[j]; } return null; };
    Inst.prototype.FindFirstChildOfClass = function (cn) { for (var i = 0; i < this._children.length; i++) if (this._children[i].ClassName === cn) return proxy(this._children[i]); return null; };
    Inst.prototype.FindFirstChildWhichIsA = function (cn) { for (var i = 0; i < this._children.length; i++) if (proxy(this._children[i]).IsA(cn)) return proxy(this._children[i]); return null; };
    Inst.prototype.FindFirstAncestor = function (name) { var p = this._parent; while (p) { if (p.Name === name) return proxy(p); p = p._parent; } return null; };
    Inst.prototype.WaitForChild = function (name) { var f = this.FindFirstChild(name); if (f) return f; return f; };
    Inst.prototype.GetPropertyChangedSignal = function (prop) { if (!this._propsig[prop]) this._propsig[prop] = new Signal(); return this._propsig[prop]; };
    Inst.prototype.ClearAllChildren = function () { this._children.slice().forEach(function (c) { proxy(c).Destroy(); }); };
    Inst.prototype.Clone = function () { var c = new Inst(this.ClassName); c.Name = this.Name; for (var k in this._props) c._props[k] = cloneVal(this._props[k]); this._children.forEach(function (ch) { var cc = raw(proxy(ch).Clone()); setParent(cc, c); }); return proxy(c); };
    Inst.prototype.Destroy = function () { this.Destroying.Fire(); this.ClearAllChildren(); setParent(this, null); this._destroyed = true; markDirty(); };
    Inst.prototype.GetAttribute = function (k) { return (this._attr || {})[k]; };
    Inst.prototype.SetAttribute = function (k, v) { (this._attr = this._attr || {})[k] = v; };
    // Sound methods
    Inst.prototype.Play = function () { if (this.ClassName === 'Sound') { this._props.Playing = true; this._sndId = this._sndId || SOUND_SEQ++; post({ t: 'sound', op: 'play', uid: this._sndId, soundId: this._props.SoundId, volume: this._props.Volume, looped: this._props.Looped, speed: this._props.PlaybackSpeed }); this.sig('Played').Fire(); } };
    Inst.prototype.Pause = function () { if (this.ClassName === 'Sound') { this._props.Playing = false; post({ t: 'sound', op: 'pause', uid: this._sndId }); this.sig('Paused').Fire(); } };
    Inst.prototype.Stop = function () { if (this.ClassName === 'Sound') { this._props.Playing = false; post({ t: 'sound', op: 'stop', uid: this._sndId }); } };
    Inst.prototype.Resume = Inst.prototype.Play;
    // Model helpers
    Inst.prototype.MoveTo = function (v) { this._props.Position = v; markDirty(); };
    Inst.prototype.SetPrimaryPartCFrame = function (cf) { this._props.PrimaryPartCFrame = cf; };
    Inst.prototype.GetService = function (name) { return getService(name); };

    function setParent(child, parentRaw) {
      var old = child._parent;
      if (old) { var i = old._children.indexOf(child); if (i >= 0) old._children.splice(i, 1); old._sig.ChildRemoved && old._sig.ChildRemoved.Fire(proxy(child)); }
      child._parent = parentRaw;
      if (parentRaw) { parentRaw._children.push(child); parentRaw._sig.ChildAdded && parentRaw._sig.ChildAdded.Fire(proxy(child)); }
      child.AncestryChanged.Fire(proxy(child), parentRaw ? proxy(parentRaw) : null);
      if (child._isGui || (parentRaw && parentRaw._isGui)) markDirty();
      // tool entering a player's Backpack/Character or StarterPack is a no-op here
    }

    function proxy(rawInst) {
      if (!rawInst) return null;
      if (PROXY.has(rawInst)) return PROXY.get(rawInst);
      var p = new Proxy(rawInst, {
        get: function (t, key) {
          if (key === '__raw') return t;
          if (key === 'Parent') return t._parent ? proxy(t._parent) : null;
          if (key === 'Name' || key === 'ClassName') return t[key];
          if (key in t && typeof t[key] === 'function') return t[key].bind(t);
          if (t._sig[key]) return t._sig[key];
          if (key in t._props) return t._props[key];
          // child access by name (game.Workspace.Baseplate)
          for (var i = 0; i < t._children.length; i++) if (t._children[i].Name === key) return proxy(t._children[i]);
          if (key in t) return t[key];
          return undefined;
        },
        set: function (t, key, val) {
          if (key === 'Parent') { setParent(t, raw(val)); return true; }
          if (key === 'Name') { t.Name = val; return true; }
          var old = t._props[key];
          t._props[key] = raw(val);
          if (old !== val) {
            t.Changed.Fire(key);
            if (t._propsig[key]) t._propsig[key].Fire(val);
            if (t._isGui) markDirty();
            if (t.ClassName === 'Humanoid' && key === 'Health') { t.sig('HealthChanged').Fire(val); if (val <= 0 && old > 0) { t.sig('Died').Fire(); var plr = t._parent && t._parent._ownerPlayer; if (plr) plr.sig('Died').Fire(); } }
            if (t.ClassName === 'Sound' && key === 'Playing') { if (val) proxy(t).Play(); else proxy(t).Pause(); }
          }
          return true;
        }
      });
      PROXY.set(rawInst, p); rawInst._proxy = p; return p;
    }

    function markDirty() { DIRTY = true; }

    // ---- services + DataModel --------------------------------------------
    var SERVICES = {};
    function makeService(cn, name) { var s = new Inst(cn); s.Name = name || cn; SERVICES[s.Name] = s; return s; }
    var game = new Inst('DataModel'); game.Name = 'game';
    CLASS.DataModel = { props: { PlaceId: 0, JobId: '' }, ev: [] };
    function addService(cn, name) { var s = makeService(cn, name); setParent(s, game); return s; }
    var Workspace = addService('Workspace');
    var Players = addService('Players');
    var Lighting = addService('Lighting');
    var RunService = addService('RunService');
    var SoundService = addService('SoundService');
    var ReplicatedStorage = addService('ReplicatedStorage');
    var StarterGui = addService('StarterGui');
    var StarterPack = addService('StarterPack');
    addService('ServerStorage'); addService('Teams'); addService('StarterPlayer');
    function getService(name) { if (SERVICES[name]) return proxy(SERVICES[name]); var s = addService(name); return proxy(s); }
    game.GetService = function (name) { return getService(name); };
    Players._props.LocalPlayer = null;

    // Instance.new
    var InstanceNS = { new: function (cn, parent) { var i = new Inst(cn); if (parent) setParent(i, raw(parent)); return proxy(i); } };

    // ---- build the place from the map ------------------------------------
    function buildWorld(map, players, localName) {
      // parts (blocks) + spawns
      (map.blocks || []).forEach(function (b, i) {
        var p = new Inst('Part'); p.Name = (i === 0 && b.size && b.size[0] >= 100) ? 'Baseplate' : 'Part';
        p._props.Size = new Vector3(b.size[0], b.size[1], b.size[2]);
        p._props.Position = new Vector3(b.pos[0], b.pos[1], b.pos[2]);
        p._props.Color = new Color3((b.color[0] || 0) / 255, (b.color[1] || 0) / 255, (b.color[2] || 0) / 255);
        p._props.Anchored = true; setParent(p, Workspace);
      });
      (map.spawns || []).forEach(function (s, i) { var sp = new Inst('SpawnLocation'); sp.Name = 'SpawnLocation'; sp._props.Position = new Vector3(s[0], s[1], s[2]); sp._props.Size = new Vector3(6, 1.2, 6); sp._props.Anchored = true; setParent(sp, Workspace); });
      (map.tools || []).forEach(function (t) {
        var tool = new Inst('Tool'); tool.Name = t.name || 'Tool';
        var handle = new Inst('Part'); handle.Name = 'Handle'; handle._props.Color = new Color3((t.color ? t.color[0] : 160) / 255, (t.color ? t.color[1] : 160) / 255, (t.color ? t.color[2] : 160) / 255); setParent(handle, tool);
        setParent(tool, t.starter ? StarterPack : Workspace);
      });
      // players
      players = players || [];
      players.forEach(function (pl) { addPlayer(pl.id, pl.name, pl.name === localName); });
      if (localName && !players.some(function (p) { return p.name === localName; })) addPlayer(-1, localName, true);
    }

    function addPlayer(id, name, isLocal) {
      var exists = Players._children.filter(function (c) { return c.Name === name; })[0];
      if (exists) return proxy(exists);
      var p = new Inst('Player'); p.Name = name; p._props.DisplayName = name; p._props.UserId = id;
      setParent(p, Players);
      if (isLocal) { Players._props.LocalPlayer = proxy(p); }
      // character + humanoid
      var char = new Inst('Model'); char.Name = name; var hum = new Inst('Humanoid'); hum._ownerPlayer = p; setParent(hum, char);
      var hrp = new Inst('Part'); hrp.Name = 'HumanoidRootPart'; hrp._props.Size = new Vector3(2, 2, 1); setParent(hrp, char);
      setParent(char, Workspace); p._props.Character = proxy(char);
      Players._props.NumPlayers = Players._children.length;
      Players.sig('PlayerAdded').Fire(proxy(p));
      p.sig('CharacterAdded').Fire(proxy(char));
      return proxy(p);
    }
    function removePlayer(name) { var p = Players._children.filter(function (c) { return c.Name === name; })[0]; if (!p) return; Players.sig('PlayerRemoving').Fire(proxy(p)); var ch = raw(p._props.Character); if (ch) proxy(ch).Destroy(); proxy(p).Destroy(); Players._props.NumPlayers = Players._children.length; }

    // ---- GUI serialization ------------------------------------------------
    function udimCss(u, ax) { return 'calc(' + (u[ax].Scale * 100) + '% + ' + u[ax].Offset + 'px)'; }
    function serializeGui() {
      var out = [];
      function walk(node, z) {
        node._children.forEach(function (c) {
          var pr = c._props;
          if (c.IsA && proxy(c).IsA('GuiObject') || /Frame|Label|Button|Box|ImageLabel|ImageButton/.test(c.ClassName)) {
            var item = {
              uid: c._uid, cls: c.ClassName, name: c.Name,
              px: pr.Position ? udimCss(pr.Position, 'X') : '0', py: pr.Position ? udimCss(pr.Position, 'Y') : '0',
              sx: pr.Size ? udimCss(pr.Size, 'X') : 'auto', sy: pr.Size ? udimCss(pr.Size, 'Y') : 'auto',
              bg: pr.BackgroundColor3 ? pr.BackgroundColor3.toRGB() : null, bgt: pr.BackgroundTransparency || 0,
              text: pr.Text, tc: pr.TextColor3 ? pr.TextColor3.toRGB() : [0, 0, 0], ts: pr.TextScaled ? 0 : (pr.TextSize || 18), tscaled: !!pr.TextScaled,
              img: pr.Image || null, vis: pr.Visible !== false, z: (pr.ZIndex || 1) + z, interact: /Button/.test(c.ClassName),
              ax: pr.TextXAlignment, ay: pr.TextYAlignment
            };
            out.push(item);
          }
          walk(c, z + 1);
        });
      }
      // only ScreenGuis under StarterGui/PlayerGui that are Enabled
      StarterGui._children.concat(SERVICES.CoreGui ? SERVICES.CoreGui._children : []).forEach(function (sg) { if (sg.ClassName === 'ScreenGui' && sg._props.Enabled !== false) walk(sg, 0); });
      return out;
    }

    // ---- script execution -------------------------------------------------
    var TASKS = []; // pending timed resumes {at, res}
    function now() { return CLOCK; }
    var CLOCK = 0;
    function waitFor(sec) { return new Promise(function (res) { TASKS.push({ at: CLOCK + (sec || 0) * 1000, res: res }); }); }
    var task = { wait: function (s) { return waitFor(s); }, spawn: function (fn) { try { Promise.resolve().then(fn).catch(reportErr); } catch (e) { reportErr(e); } }, delay: function (s, fn) { waitFor(s).then(function () { try { fn(); } catch (e) { reportErr(e); } }); }, defer: function (fn) { Promise.resolve().then(fn).catch(reportErr); } };

    function env(scriptInst) {
      return {
        game: proxy(game), workspace: proxy(Workspace), Workspace: proxy(Workspace),
        Players: proxy(Players), Lighting: proxy(Lighting), RunService: proxy(RunService),
        script: proxy(scriptInst),
        Instance: InstanceNS, Vector3: Vector3NS, Color3: Color3NS, UDim2: UDim2NS, UDim: function (s, o) { return new UDim(s, o); }, CFrame: CFrameNS, Enum: Enum,
        task: task, wait: function (s) { return waitFor(s); }, delay: task.delay, spawn: task.spawn,
        tick: function () { return CLOCK / 1000; }, time: function () { return CLOCK / 1000; }, os: { time: function () { return Math.floor(Date.now() / 1000); }, clock: function () { return CLOCK / 1000; } },
        print: function () { post({ t: 'print', v: fmt(arguments) }); },
        warn: function () { post({ t: 'print', v: '[warn] ' + fmt(arguments) }); },
        error: function (m) { throw new Error(m); },
        math: Math, string: String, table: { insert: function (a, v) { a.push(v); }, remove: function (a, i) { return a.splice((i || a.length) - 1, 1)[0]; }, find: function (a, v) { var i = a.indexOf(v); return i < 0 ? null : i + 1; } },
        pairs: function (o) { return Object.entries(o); }, ipairs: function (a) { return a.map(function (v, i) { return [i + 1, v]; }); }
      };
    }
    function fmt(args) { return Array.prototype.map.call(args, function (a) { if (a && a.__raw) return a.Name + ' (' + a.ClassName + ')'; if (a && a.toString && typeof a === 'object') return a.toString(); if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } } return String(a); }).join(' '); }

    function runScript(s) {
      var inst = new Inst('LocalScript'); inst.Name = s.name; inst._props.Source = s.source;
      setParent(inst, ReplicatedStorage);
      var e = env(inst);
      var names = Object.keys(e), vals = names.map(function (k) { return e[k]; });
      try {
        var fn = new Function(names.join(','), '"use strict";return (async function(){\n' + s.source + '\n})();');
        Promise.resolve(fn.apply(null, vals)).catch(reportErr);
      } catch (err) { reportErr(err); }
    }

    // ---- main loop --------------------------------------------------------
    function step(dt) {
      CLOCK += dt * 1000;
      // resume timed tasks
      if (TASKS.length) { var ready = TASKS.filter(function (t) { return t.at <= CLOCK; }); TASKS = TASKS.filter(function (t) { return t.at > CLOCK; }); ready.forEach(function (t) { try { t.res(); } catch (e) { reportErr(e); } }); }
      try { RunService._sig.Stepped.Fire(CLOCK / 1000, dt); } catch (e) {}
      try { RunService._sig.Heartbeat.Fire(dt); } catch (e) {}
      try { RunService._sig.RenderStepped.Fire(dt); } catch (e) {}
      checkTouches();
      if (DIRTY) { DIRTY = false; post({ t: 'gui', items: serializeGui() }); }
    }

    // very light Touched: parts with a Touched connection vs. the local character root
    function checkTouches() {
      var lp = raw(Players._props.LocalPlayer); if (!lp) return;
      var ch = raw(lp._props.Character); if (!ch) return;
      var root = ch._children.filter(function (c) { return c.Name === 'HumanoidRootPart'; })[0]; if (!root) return;
      var allParts = [];
      (function rec(n) { n._children.forEach(function (c) { if (c.ClassName === 'Part' && c._sig.Touched && c._sig.Touched._c.length) allParts.push(c); rec(c); }); })(Workspace);
      allParts.forEach(function (p) { if (aabb(p, root)) { if (!p._touching) { p._touching = true; p._sig.Touched.Fire(proxy(root)); } } else if (p._touching) { p._touching = false; p._sig.TouchEnded && p._sig.TouchEnded.Fire(proxy(root)); } });
    }
    function aabb(a, b) { var ap = a._props.Position, as = a._props.Size, bp = b._props.Position, bs = b._props.Size; if (!ap || !as || !bp || !bs) return false; return Math.abs(ap.X - bp.X) < (as.X + bs.X) / 2 && Math.abs(ap.Y - bp.Y) < (as.Y + bs.Y) / 2 && Math.abs(ap.Z - bp.Z) < (as.Z + bs.Z) / 2; }

    // ---- message handling -------------------------------------------------
    onmessage = function (ev) {
      var d = ev.data;
      if (d.t === 'start') {
        try { buildWorld(d.map || {}, d.players || [], d.localName); } catch (e) { reportErr(e); }
        (d.scripts || []).forEach(runScript);
        markDirty();
        post({ t: 'ready' });
      } else if (d.t === 'tick') { step(d.dt || 0.033); }
      else if (d.t === 'playeradded') { addPlayer(d.id, d.name, false); }
      else if (d.t === 'playerremoving') { removePlayer(d.name); }
      else if (d.t === 'guievent') { var node = findByUid(d.uid); if (node && node._sig[d.event]) node._sig[d.event].Fire(); }
      else if (d.t === 'chat') { var lp = raw(Players._props.LocalPlayer); Players._children.forEach(function (pc) { if (pc.Name === d.name && pc._sig.Chatted) pc._sig.Chatted.Fire(d.text); }); }
    };
    function findByUid(uid) { var found = null; (function rec(n) { if (found) return; n._children.forEach(function (c) { if (c._uid === uid) found = c; else rec(c); }); })(game); return found; }
  } // end workerMain

  // =========================================================================
  //  MAIN THREAD
  // =========================================================================
  var WORKER_SRC = '(' + workerMain.toString() + ')()';
  var blobUrl = null;
  function workerUrl() { if (blobUrl) return blobUrl; try { blobUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })); } catch (e) {} return blobUrl; }

  var live = null;   // {worker, raf, ticking}
  var hud = null, audios = {};

  function ensureHud() {
    if (hud) return hud;
    hud = document.createElement('div'); hud.id = 'lum-script-hud'; document.body.appendChild(hud);
    return hud;
  }
  function renderGui(items) {
    var h = ensureHud(); var seen = {};
    items.forEach(function (it) {
      if (!it.vis) return;
      var el = h.querySelector('[data-uid="' + it.uid + '"]');
      if (!el) { el = document.createElement('div'); el.dataset.uid = it.uid; el.className = 'lsh-item'; h.appendChild(el); if (it.interact) { el.style.pointerEvents = 'auto'; el.addEventListener('click', (function (uid) { return function () { if (live) live.worker.postMessage({ t: 'guievent', uid: uid, event: 'MouseButton1Click' }); }; })(it.uid)); } }
      seen[it.uid] = 1;
      el.style.left = it.px; el.style.top = it.py; el.style.width = it.sx; el.style.height = it.sy; el.style.zIndex = it.z;
      el.style.background = it.bg ? ('rgba(' + it.bg[0] + ',' + it.bg[1] + ',' + it.bg[2] + ',' + (1 - (it.bgt || 0)) + ')') : 'transparent';
      if (it.img) { el.style.backgroundImage = 'url(' + resolveAsset(it.img) + ')'; el.style.backgroundSize = 'cover'; }
      if (it.text != null) { el.textContent = it.text; el.style.color = 'rgb(' + it.tc.join(',') + ')'; el.style.fontSize = (it.tscaled ? Math.max(10, parseInt(it.sy) || 18) * 0.6 : it.ts) + 'px'; el.style.display = 'flex'; el.style.alignItems = it.ay === 'Top' ? 'flex-start' : it.ay === 'Bottom' ? 'flex-end' : 'center'; el.style.justifyContent = it.ax === 'Left' ? 'flex-start' : it.ax === 'Right' ? 'flex-end' : 'center'; }
    });
    h.querySelectorAll('.lsh-item').forEach(function (el) { if (!seen[el.dataset.uid]) el.remove(); });
  }

  // Roblox asset id -> our local uploaded asset, else treat as URL/rbxassetid
  function resolveAsset(id) {
    id = String(id || '');
    var m = id.match(/(\d{3,})/);
    if (/^https?:/.test(id)) return id;
    if (m) { return '/SFOTH/roblox-assets/uploaded/' + m[1] + '.png'; }
    return id;
  }
  function resolveSound(id) {
    id = String(id || '');
    if (/^https?:/.test(id)) return id;
    var m = id.match(/(\d{3,})/);
    if (m) return '/SFOTH/roblox-assets/uploaded/' + m[1] + '.ogg';
    return id;
  }

  function handleSound(d) {
    try {
      if (d.op === 'play') {
        var a = audios[d.uid]; if (!a) { a = new Audio(); audios[d.uid] = a; }
        a.src = resolveSound(d.soundId); a.volume = Math.max(0, Math.min(1, d.volume == null ? 0.5 : d.volume)); a.loop = !!d.looped; a.playbackRate = d.speed || 1;
        a.play().catch(function () {});
      } else if (d.op === 'pause') { var p = audios[d.uid]; if (p) p.pause(); }
      else if (d.op === 'stop') { var s = audios[d.uid]; if (s) { s.pause(); s.currentTime = 0; } }
    } catch (e) {}
  }

  function spawnWorker(payload, onPrint, onErr) {
    var url = workerUrl(); if (!url) { onErr && onErr('Web Workers unavailable'); return null; }
    var w; try { w = new Worker(url); } catch (e) { onErr && onErr('worker failed: ' + e.message); return null; }
    var rec = { worker: w, raf: 0, ticking: false, started: performance.now() };
    w.onmessage = function (ev) {
      var d = ev.data;
      if (d.t === 'print') onPrint && onPrint(d.v);
      else if (d.t === 'err') onErr && onErr(d.v);
      else if (d.t === 'gui') { try { renderGui(d.items); } catch (e) {} }
      else if (d.t === 'sound') handleSound(d);
      else if (d.t === 'ready') {
        rec.ticking = true; var last = performance.now();
        var tick = function () { if (!rec.ticking) return; var now = performance.now(), dt = (now - last) / 1000; last = now; try { w.postMessage({ t: 'tick', dt: Math.min(0.1, dt) }); } catch (e) {} rec.raf = setTimeout(tick, 33); };
        tick();
      }
    };
    w.onerror = function (e) { onErr && onErr(e.message || 'worker error'); };
    w.postMessage(Object.assign({ t: 'start' }, payload));
    return rec;
  }

  // ---- public: test (Studio) --------------------------------------------
  function test(src, onLine) {
    onLine('▶ running (client sandbox)…');
    var rec = spawnWorker({ scripts: [{ name: 'Test', source: src }], map: {}, players: [], localName: 'You' }, function (v) { onLine(v); }, function (e) { onLine('⛔ ' + e); });
    if (!rec) return;
    setTimeout(function () { stop(rec); onLine('■ stopped (2s test cap).'); }, 2000);
  }

  // ---- public: run all client scripts for a map during play --------------
  var lobbyTimer = null, knownPlayers = {};
  function runForMap(mapId, localName) {
    stopAll();
    if (!mapId || mapId === 'heights') return;
    fetch('/api/maps/' + mapId).then(function (r) { return r.json(); }).then(function (m) {
      if (!m) return;
      var toolScripts = (m.tools || []).filter(function (t) { return t.script; }).map(function (t) { return { name: (t.name || 'Tool') + 'Script', source: t.script }; });
      var scripts = (m.scripts || []).filter(function (s) { return s.type === 'client' && s.source; }).map(function (s) { return { name: s.name, source: s.source }; }).concat(toolScripts);
      if (!scripts.length) return;
      var log = function (v) { try { console.log('[script] ' + v); } catch (e) {} };
      live = spawnWorker({ scripts: scripts, map: { blocks: m.blocks, spawns: m.spawns, tools: m.tools }, players: [], localName: localName || 'Player' }, log, function (e) { try { console.error('[script] ' + e); } catch (x) {} });
      try { console.log('[Luminary] running ' + scripts.length + ' client script(s).'); } catch (e) {}
      // forward player join/leave from the live lobby
      pollLobby();
    }).catch(function () {});
  }

  function pollLobby() {
    clearInterval(lobbyTimer);
    var tick = function () {
      if (!live) return;
      fetch('/api/lobby', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        var now = {}; (j.players || []).forEach(function (p) { now[p.nickname] = 1; if (!knownPlayers[p.nickname]) live.worker.postMessage({ t: 'playeradded', id: p.id, name: p.nickname }); });
        Object.keys(knownPlayers).forEach(function (n) { if (!now[n]) live.worker.postMessage({ t: 'playerremoving', name: n }); });
        knownPlayers = now;
      }).catch(function () {});
    };
    tick(); lobbyTimer = setInterval(tick, 3000);
  }

  function stop(rec) { if (!rec) return; rec.ticking = false; clearTimeout(rec.raf); try { rec.worker.terminate(); } catch (e) {} }
  function stopAll() {
    stop(live); live = null; clearInterval(lobbyTimer); knownPlayers = {};
    if (hud) hud.innerHTML = '';
    Object.keys(audios).forEach(function (k) { try { audios[k].pause(); } catch (e) {} }); audios = {};
  }

  window.LuminaryScripts = { test: test, runForMap: runForMap, stopAll: stopAll };
})();
