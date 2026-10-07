// SFOTH authoritative simulation host.
//
// Runs the real SFOTH.Simulation.ArenaWorld (Bepu physics) headless and speaks a
// tiny length-prefixed binary protocol over stdin/stdout to the Node WebRTC
// server:
//
//   Node -> Sim   [u32 len][u8 type][...]
//     type 1 join   : [i32 playerId]
//     type 2 leave  : [i32 playerId]
//     type 3 input  : [i32 playerId][raw op1 input packet bytes]
//
//   Sim -> Node   [u32 len][snapshot bytes]   (one authoritative v23 snapshot/tick)
//
// The snapshot encoder is the exact inverse of SFOTH.Protocol.FrameCodec.Decode.

using System;
using System.Collections.Generic;
using System.IO;
using System.Numerics;
using System.Threading;
using SFOTH.Simulation;

class SimHost
{
    static readonly object Gate = new();
    static ArenaWorld World = null!;
    static ArenaDefinition Arena = null!;
    static readonly Random Rng = new(12345);

    // per-player latest input + liveness
    static readonly Dictionary<int, MovementInput> Latest = new();
    static readonly HashSet<int> Active = new();
    static readonly HashSet<int> Removed = new(); // left players: hidden from snapshots

    static string Ref(string dir, string n) => File.ReadAllText(Path.Combine(dir, n));

    static void Main(string[] args)
    {
        var dir = args.Length > 0 ? args[0] : ".";
        Arena = ArenaDefinition.Parse(Ref(dir, "arena.json"));
        var physics = PhysicsProfile.Parse(Ref(dir, "physics.json"));
        var combat = CombatDefinition.Parse(Ref(dir, "combat.json"));
        var env = EnvironmentDefinition.Parse(Ref(dir, "environment.json"));
        var items = SourceToolCatalog.Parse(Ref(dir, "items.json"));
        World = new ArenaWorld(Arena, physics, combat, true, env, items, 0, new Random(1));
        Console.Error.WriteLine($"[sim] world ready, {Arena.Spawns.Length} spawns");

        var reader = new Thread(ReadLoop) { IsBackground = true };
        reader.Start();

        var stdout = Console.OpenStandardOutput();
        var lenbuf = new byte[4];
        double next = Now();
        const double dt = 1000.0 / 60.0;
        while (true)
        {
            double now = Now();
            if (now < next) { Thread.Sleep(Math.Max(0, (int)(next - now))); continue; }
            next += dt;
            if (now - next > 250) next = now; // don't spiral after a stall

            byte[] snap;
            byte[]? gens = null;
            lock (Gate)
            {
                var inputs = new Dictionary<int, MovementInput>();
                foreach (var id in Active)
                    inputs[id] = Latest.TryGetValue(id, out var mi)
                        ? mi
                        : new MovementInput((uint)World.Tick, 0f, 0f, MovementButtons.None);
                try { World.Step(inputs); }
                catch (Exception e) { Console.Error.WriteLine("[sim] step: " + e.Message); }
                MovementFrame frame;
                try { frame = World.CaptureFrame(); }
                catch (Exception e) { Console.Error.WriteLine("[sim] capture: " + e.Message); continue; }
                try { snap = Encode(frame); }
                catch (Exception e) { Console.Error.WriteLine("[sim] encode: " + e.Message); continue; }
                if (World.Tick % 15 == 0) gens = BuildGenerations(frame);
            }
            WriteFrame(stdout, lenbuf, 0, snap);                 // type 0 = snapshot
            if (gens != null) WriteFrame(stdout, lenbuf, 1, gens); // type 1 = generations
        }
    }

    // Per-active-player death count. The client's render "life" field (v[11]) is
    // PlayerMovementState.Deaths, and an emote only plays while its recorded life
    // matches it — so Node must stamp emotes with the player's current Deaths.
    static byte[]? BuildGenerations(MovementFrame f)
    {
        var ms = new MemoryStream();
        var w = new BinaryWriter(ms);
        int count = 0;
        var body = new MemoryStream();
        var bw = new BinaryWriter(body);
        foreach (var p in f.Players)
        {
            if (!Active.Contains(p.Id)) continue;
            bw.Write(p.Id);
            bw.Write(p.Deaths);
            count++;
        }
        w.Write((ushort)count);
        w.Write(body.ToArray());
        return ms.ToArray();
    }

    static void WriteFrame(Stream stdout, byte[] lenbuf, byte type, byte[] data)
    {
        int n = data.Length + 1;
        lenbuf[0] = (byte)n; lenbuf[1] = (byte)(n >> 8); lenbuf[2] = (byte)(n >> 16); lenbuf[3] = (byte)(n >> 24);
        try { stdout.Write(lenbuf, 0, 4); stdout.WriteByte(type); stdout.Write(data, 0, data.Length); stdout.Flush(); }
        catch { }
    }

    static double Now() => Environment.TickCount64;

    // ---- stdin command loop ----
    static void ReadLoop()
    {
        var stdin = Console.OpenStandardInput();
        var len = new byte[4];
        while (true)
        {
            if (!ReadFull(stdin, len, 4)) return;
            int n = len[0] | len[1] << 8 | len[2] << 16 | len[3] << 24;
            if (n < 1 || n > 1 << 20) return;
            var buf = new byte[n];
            if (!ReadFull(stdin, buf, n)) return;
            try { Handle(buf); } catch (Exception e) { Console.Error.WriteLine("[sim] cmd: " + e.Message); }
        }
    }

    static bool ReadFull(Stream s, byte[] b, int n)
    {
        int o = 0;
        while (o < n) { int r = s.Read(b, o, n - o); if (r <= 0) return false; o += r; }
        return true;
    }

    static void Handle(byte[] b)
    {
        byte type = b[0];
        int pid = b[1] | b[2] << 8 | b[3] << 16 | b[4] << 24;
        if (type == 1)
        {
            lock (Gate)
            {
                if (Active.Contains(pid)) return;
                int spawn = Arena.Spawns[Rng.Next(Arena.Spawns.Length)].Id;
                try { World.AddPlayer(pid, spawn); Active.Add(pid); Console.Error.WriteLine($"[sim] +player {pid} @spawn {spawn}"); }
                catch (Exception e) { Console.Error.WriteLine("[sim] addplayer: " + e.Message); }
            }
        }
        else if (type == 2)
        {
            // ArenaWorld has no public remove, so hide the left player (and its
            // tools) from every snapshot instead of leaving a ghost pawn.
            lock (Gate) { Active.Remove(pid); Latest.Remove(pid); Removed.Add(pid); }
        }
        else if (type == 3)
        {
            var mi = DecodeInput(b, 5);
            if (mi.HasValue) lock (Gate) { if (Active.Contains(pid)) Latest[pid] = mi.Value; }
        }
    }

    // Decode a client op1 input packet (payload starts at off). Returns the last record.
    static MovementInput? DecodeInput(byte[] b, int off)
    {
        if (b.Length - off < 8) return null;
        if (b[off] != 0x53 || b[off + 1] != 0x46) return null; // 18003 LE
        if (b[off + 2] != 23 || b[off + 3] != 1) return null;
        int count = b[off + 4];
        MovementInput? last = null;
        for (int i = 0; i < count; i++)
        {
            int r = off + 8 + i * 30;
            if (r + 30 > b.Length) break;
            uint seq = U32(b, r);
            float x = I16(b, r + 4) / 32767f;
            float z = I16(b, r + 6) / 32767f;
            byte buttons = b[r + 8];
            byte slot = b[r + 9];
            bool jump = b[r + 10] != 0;
            byte flags = b[r + 11];
            uint action = U32(b, r + 12);
            int target = (int)U32(b, r + 16);
            float? yaw = (flags & 1) != 0 ? I16(b, r + 20) / 32767f * MathF.PI : (float?)null;
            Vector2? hint = (flags & 2) != 0 ? new Vector2(F32(b, r + 22), F32(b, r + 26)) : (Vector2?)null;
            last = new MovementInput(seq, x, z, (MovementButtons)buttons, action, slot, target, jump, yaw, hint);
        }
        return last;
    }

    static uint U32(byte[] b, int o) => (uint)(b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24);
    static short I16(byte[] b, int o) => (short)(b[o] | b[o + 1] << 8);
    static float F32(byte[] b, int o) => BitConverter.ToSingle(b, o);

    // =====================================================================
    //  Snapshot encoder — exact inverse of FrameCodec.Decode (v23).
    // =====================================================================
    static readonly bool Minimal = Environment.GetEnvironmentVariable("SFOTH_FULL") != "1";

    static byte[] Encode(MovementFrame f)
    {
        var ms = new MemoryStream();
        var w = new BinaryWriter(ms);
        var players = Removed.Count == 0 ? f.Players : System.Array.FindAll(f.Players, p => !Removed.Contains(p.Id));
        int pc = players.Length;
        w.Write((ushort)18003);
        w.Write((byte)23);
        byte kind = pc > 255 ? (byte)11 : (byte)2;
        w.Write(kind);
        if (kind == 11) w.Write((ushort)pc); else w.Write((byte)pc);

        var platforms = Minimal ? System.Array.Empty<PlatformMovementState>() : f.Platforms;
        var pads = Minimal ? System.Array.Empty<PadCooldownState>() : f.PadCooldowns;
        int healing = Minimal ? 0 : (f.Environment?.HealingPads?.Length ?? 0);
        w.Write((byte)platforms.Length);
        w.Write((byte)pads.Length);
        w.Write((byte)healing);
        w.Write(f.Tick);

        foreach (var p in players) WritePlayerCore(w, p);
        foreach (var p in players) WritePlayerPhysics(w, p);

        foreach (var pl in platforms)
        {
            w.Write(pl.Id); WVec(w, pl.Position); WQuat(w, pl.Rotation); WVec(w, pl.Linear); WVec(w, pl.Angular);
        }
        foreach (var pad in pads) { w.Write(pad.Id); w.Write(pad.ReadyTick); }
        if (healing > 0)
            foreach (var hp in f.Environment!.HealingPads) { w.Write(hp.Id); WBool(w, hp.Ready); }

        if (!Minimal && f.Tools != null)
        {
            var tools = Removed.Count == 0 ? f.Tools.Items
                : System.Array.FindAll(f.Tools.Items, t => t.OwnerId == 0 || !Removed.Contains(t.OwnerId));
            WBool(w, true);
            w.Write((ushort)tools.Length);
            w.Write(f.Tools.NextId);
            foreach (var t in tools) WriteTool(w, t);
        }
        else WBool(w, false);

        if (!Minimal && f.WorldPhysics != null)
        {
            WBool(w, true);
            var wp = f.WorldPhysics;
            w.Write((byte)wp.Elevators.Length);
            w.Write((byte)wp.Plates.Length);
            w.Write(wp.RandomState);
            w.Write(wp.TriggerReadyTick);
            w.Write(wp.RegenerationTick);
            w.Write(wp.PhantomTriggerPlayerId);
            foreach (var e in wp.Elevators) { w.Write(e.Id); w.Write(e.Level); w.Write(e.Direction); w.Write(e.ReadyTick); w.Write(e.HoldY); }
            foreach (var pl in wp.Plates) { w.Write(pl.Id); w.Write((byte)pl.Phase); }
            if (wp.RegenerationBackup != null)
            {
                WBool(w, true);
                w.Write((byte)wp.RegenerationBackup.Length);
                foreach (var pl in wp.RegenerationBackup) { w.Write(pl.Id); WVec(w, pl.Position); WQuat(w, pl.Rotation); WVec(w, pl.Linear); WVec(w, pl.Angular); }
            }
            else WBool(w, false);
        }
        else WBool(w, false);

        w.Flush();
        return ms.ToArray();
    }

    static void WritePlayerCore(BinaryWriter w, PlayerMovementState p)
    {
        w.Write(p.Id);
        w.Write(p.SpawnId);
        w.Write(p.Deaths);
        w.Write(p.RespawnAt);
        w.Write(p.InputSequence);
        w.Write(p.ActionSequence);
        w.Write(p.InputAppliedTick);
        w.Write(p.ActionAppliedTick);
        if (p.PortalForce != null)
        {
            WBool(w, true);
            w.Write(p.PortalForce.PartId); w.Write(p.PortalForce.EndsAtTick); w.Write((byte)p.PortalForce.EndsAtSubstep);
        }
        else WBool(w, false);
        WBool(w, p.Alive);
        WBool(w, p.Grounded);
        WBool(w, p.IsBot);
        w.Write((byte)p.PadForces.Length);
        w.Write((byte)p.TouchedPads.Length);
        WVec(w, p.Position);
        WVec(w, p.Velocity);
        w.Write(p.Yaw);
        w.Write(p.SupportId);
        WVec(w, p.SupportNormal);
        WVec(w, p.SupportVelocity);
        w.Write(p.MoveX);
        w.Write(p.MoveZ);
        foreach (var pad in p.PadForces) { w.Write(pad.BoardId); w.Write(pad.TargetY); w.Write(pad.Velocity); w.Write(pad.Started); }
        foreach (var t in p.TouchedPads) w.Write(t);
        if (p.Combat != null) { WBool(w, true); WriteCombat(w, p.Combat); } else WBool(w, false);
        if (p.Corpse != null)
        {
            WBool(w, true);
            foreach (var c in p.Corpse) { WVec(w, c.Position); WQuat(w, c.Rotation); WVec(w, c.Linear); WVec(w, c.Angular); }
        }
        else WBool(w, false);
    }

    static void WritePlayerPhysics(BinaryWriter w, PlayerMovementState p)
    {
        var ph = p.Physics;
        w.Write(ph.ClimbId); w.Write(ph.FrozenUntil); w.Write(ph.FrozenBy);
        w.Write(ph.StabilizeUntil); w.Write(ph.TouchstoneSerial); w.Write(ph.TouchstoneReadyTick);
        WBool(w, ph.JumpHeld);
        w.Write((byte)ph.DeathStyle);
        w.Write(ph.DeathReleaseTick);
        if (ph.DeathStyle == 1) foreach (var v in ph.ScatterTargets!) WVec(w, v);
        if (p.FacingYaw != null) { WBool(w, true); w.Write(p.FacingYaw.Value); } else WBool(w, false);
    }

    static void WriteCombat(BinaryWriter w, PlayerCombatState c)
    {
        w.Write(c.Health);
        w.Write(c.MaxHealth);
        WBool(w, c.Equipped);
        w.Write(c.ShieldUntil);
        w.Write(c.KOs);
        w.Write(c.LastHitBy);
        w.Write(c.HitSerial);
        w.Write(c.MotionKind);
        w.Write(c.MotionTime);
        w.Write(c.JumpTick);
        WriteSword(w, c.Sword);
        WBool(w, c.AreaShield);
        w.Write(c.SelectedToolId);
        if (c.WindEffect != null) { WBool(w, true); w.Write(c.WindEffect.EndsAtTick); w.Write((byte)c.WindEffect.EndsAtSubstep); WVec(w, c.WindEffect.Target); }
        else WBool(w, false);
        w.Write(c.Transparency);
        w.Write(c.GhostForce);
        w.Write(c.CharacterGeneration);
        var rev = c.RevealUntil;
        byte mask = 0;
        for (int l = 0; l < 6; l++) if (rev != null && l < rev.Length && rev[l] != 0) mask |= (byte)(1 << l);
        w.Write(mask);
        for (int l = 0; l < 6; l++) if ((mask & (1 << l)) != 0) w.Write(rev![l]);
        WriteEffects(w, c.Effects);
    }

    static void WriteSword(BinaryWriter w, SwordTimeline s)
    {
        w.Write(s.Damage);
        w.Write(s.LastAttackTick);
        w.Write(s.LungeStartTick);
        w.Write(s.AnimationKind);
        w.Write(s.AnimationStartTick);
        w.Write(s.AnimationExpireTick);
        w.Write(s.AttackSerial);
        if (s.RedirectTarget != null) { WBool(w, true); WVec(w, s.RedirectTarget.Value); } else WBool(w, false);
    }

    static void WriteEffects(BinaryWriter w, CharacterEffects e)
    {
        WBool(w, true);
        if (e.Poison != null) { WBool(w, true); w.Write(e.Poison.StartedTick); w.Write(e.Poison.AttackerId); w.Write((byte)e.Poison.SavedTint); }
        else WBool(w, false);
        w.Write((byte)e.Tint);
        WBool(w, e.Healing);
        w.Write(e.ItemShieldUntil);
        w.Write(e.GhostSerial);
        w.Write(e.CloakSerial);
        w.Write(e.HealSerial);
        w.Write(e.PadSerial);
        w.Write(e.PadStarted);
        w.Write(e.PadTrailUntil);
        w.Write(e.TeleportSerial);
        w.Write(e.TeleportTick);
        w.Write((byte)e.TeleportKind);
        WVec(w, e.TeleportFrom);
        WVec(w, e.TeleportTo);
    }

    static void WriteTool(BinaryWriter w, ToolState t)
    {
        w.Write(t.Id);
        w.Write(t.TemplateId);
        w.Write(t.OwnerId);
        w.Write((byte)t.Slot);
        w.Write(t.LungeOwnerId);
        w.Write(t.IgnoreOwnerId);
        WBool(w, t.IsProxy);
        w.Write(t.GhostKills);
        WBool(w, t.GhostAwakened);
        w.Write(t.HandleTransparency);
        byte flags = 0;
        if (t.DroppedAtTick >= 0) flags |= 0x10;
        if (t.RevealCheckAt != 0) flags |= 0x02;
        if (t.Cloak != null) flags |= 0x01;
        if (t.Physics != null) flags |= 0x04;
        if (t.Utility != null) flags |= 0x08;
        w.Write(flags);
        if ((flags & 0x10) != 0) w.Write(t.DroppedAtTick);
        if ((flags & 0x02) != 0) w.Write(t.RevealCheckAt);
        if (t.Cloak != null) { w.Write(t.Cloak.CharacterId); w.Write(t.Cloak.CharacterGeneration); w.Write(t.Cloak.EndsAtTick); w.Write(t.Cloak.PopSerial); }
        if (t.Physics != null) { WBool(w, t.Physics.Charged); w.Write(t.Physics.ReadyTick); w.Write((byte)t.Physics.ChargeTicks.Length); foreach (var c in t.Physics.ChargeTicks) w.Write(c); }
        if (t.Utility != null) { w.Write(t.Utility.CharacterId); w.Write(t.Utility.CharacterGeneration); w.Write(t.Utility.StartedTick); w.Write((byte)t.Utility.SavedTint); w.Write(t.Utility.ShieldUntil); w.Write(t.Utility.ReadyTick); }
        WriteSword(w, t.Sword);
        if (t.OwnerId == 0) { WVec(w, t.Position); WQuat(w, t.Rotation); WVec(w, t.Linear); WVec(w, t.Angular); }
    }

    static void WBool(BinaryWriter w, bool v) => w.Write((byte)(v ? 1 : 0));
    static void WVec(BinaryWriter w, Vector3 v) { w.Write(v.X); w.Write(v.Y); w.Write(v.Z); }
    static void WQuat(BinaryWriter w, Quaternion q) { w.Write(q.X); w.Write(q.Y); w.Write(q.Z); w.Write(q.W); }
}
