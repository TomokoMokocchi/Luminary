# SFOTH IV — reconstructed server

A server for the captured *Sword Fights on the Heights IV* browser client in
`../` (the `2008/` dump). It serves the client, answers its whole HTTP API, runs
the spectator broadcast, and acts as the **WebRTC offerer** so a guest actually
connects to a game room and completes the v23 clock handshake.

## Run

```bash
cd server
npm install           # installs node-datachannel (a real WebRTC/SCTP stack)
PORT=8099 npm start   # then open http://localhost:8099/SFOTH/
```

`PORT` defaults to `8080`; override it if that port is busy. `HOST` defaults to
`0.0.0.0`.

## What works

- **Static client** — HTML, JS, Babylon.js engine, the .NET **physics WASM**
  (`application/wasm`), fonts, audio, Roblox-asset textures, and all the
  `reference/*.json` content (scene, arena, combat, items, physics).
- **HTTP API** — `config`, `identity`, `lobby` (live-ish player counts),
  `availability`, `play-count`, `sfoth/lobby-gems`, `sfoth/achievement-rewards`,
  `sfoth/death-map`, `feedback-link`, plus `account/game-header` and
  `admin/sfoth/game` (served from the recorded captures).
- **Spectator broadcast** — `GET /SFOTH/api/broadcast/stream` is a real SSE
  endpoint. It sends the `welcome` token then a `waiting` ("WARMING UP") state,
  which the lobby renders as *"This arena is alive — waiting for a running
  game…"*. Drop a `broadcast-frames.json` next to `index.js` to replay a real
  captured frame stream as a live spectator view (see below).
- **WebRTC guest connection** — `POST /SFOTH/api/guest/join` returns a genuine
  SDP **offer** with two data channels (`state`: unreliable/unordered;
  `control`: reliable). `POST /SFOTH/api/guest/answer` applies the browser's
  answer, ICE/DTLS/SCTP comes up, and the client's clock handshake on `control`
  is answered with protocol-v23 clock responses. Observed end to end:

  ```
  [rtc 735] answer applied
  [rtc 735] connection connected
  [rtc 735] control open
  [rtc 735] clock synced
  ```

## Names, lobby & trimmed UI

- **Set name (no accounts).** The login/sign-up flow is gone. The game page
  (served via `index.js`, injected at request time) is trimmed to just the
  title, a **Set name** box, the **Play** button, the live player count and the
  server list. The name is kept in `localStorage` + a `sfoth_name` cookie and is
  **trusted verbatim** — `/api/identity` returns it as the username and
  `/api/guest/join` uses it as the nickname.
- **Live lobby.** `/api/lobby` is built from the actually-connected players
  (`GameServer.lobby()`), so rooms show real people by name. `/api/play-count`
  is a real counter. The stale captured values (gems, achievements for "jetray",
  death map, `51198` plays) are replaced with honest/empty responses.
- **Leave** is an HTTP `DELETE` (keepalive on unload) and returns `{"left":true}`.

## It's playable

The server now runs the **authoritative simulation** and streams real v23
snapshots, so joining actually drops you into the arena: your character spawns,
walks (WASD / arrows + Space), has health and spawn protection, holds a sword,
and **chat works** (log + in-world speech bubbles). Requires the .NET 10 runtime
for the sim host (see below); if it's missing the server still runs as a
content/spectator server.

How it fits together:

```
browser  --WebRTC datachannels-->  Node server  --stdio-->  SimHost (.NET 10)
  inputs (op1) ----------------------------->  ArenaWorld.Step()
  <---------- v23 snapshots (op8 transport, op3 fragments) -- CaptureFrame()/Encode()
  chat {kind:chat} --> Node --> "SHAT" binary broadcast --> all clients
```

Chat + emotes + names:
- Chat `{kind:chat}` is relayed to all players as a binary **"SHAT"** packet.
- Emotes (`/e wave|point|cheer|laugh|dance|dance2|dance3`) arrive as
  `{kind:emote,variant}` and are rebroadcast as `{kind:emote,id,variant,life}`,
  so the dance/wave plays on every client. The relay is variant-agnostic, so all
  emotes work.
- On join the server announces `{kind:player,id,nickname}` to everyone (and the
  existing roster to the joiner), so nametags and the scoreboard show real names.

**Auto-mirroring assets:** some assets (4 fonts, the `classic-emotes` module,
...) aren't in the dump. On a 404 under `/SFOTH/`, the server fetches the file
from the live site (`SFOTH_UPSTREAM`, default `https://shedletsky.com`), saves it
to disk, and serves it — so each missing asset is downloaded once and kept.

Key protocol details that make the client accept snapshots:
- Each authoritative frame is wrapped in a 20-byte **transport envelope**
  (opcode 8, mode 0 = full keyframe: `[18003,23,8, mode, 0,0,0, frameId,
  baselineId=0, uncompressedLen, compressedLen=0, innerSnapshot]`) and then
  **fragmented** (opcode 3, ≤1000-byte payloads, `frameId` == fragment id).
  The inner snapshot is the exact inverse of `FrameCodec.Decode`.
- The `state` channel must be unordered with `maxRetransmits:0`; `control` is
  reliable. Client inputs (opcode 1) arrive on both and are decoded to
  `MovementInput`.

### Running the sim host

`SimBridge` auto-spawns `sim/bin/Release/net10.0/SimHost.dll` using the .NET 10
runtime (set `SFOTH_DOTNET` to point at a `dotnet` binary; `SFOTH_FULL=0` falls
back to lean players-only snapshots). Build it with:

```bash
cd sim && dotnet build -c Release   # needs .NET 10 SDK + the extracted SFOTH/Bepu DLLs
```

Known limitations: `ArenaWorld` exposes no public *remove-player*, so a player
who disconnects leaves an idle pawn until the process restarts; the scoreboard
shows generic names (per-player roster messages aren't sent yet) though chat
uses the correct nickname.

## How the simulation was recovered

The real win: the shipped `.wasm` files are **real .NET 10 assemblies**, and
`SFOTH.Simulation.ArenaWorld` — the full authoritative multiplayer sim with
Bepu physics — runs headless. Proven in `scratchpad/simtest` (reflection host):

```
new ArenaWorld(arena, physics, combat, true, environment, items, 0, rng)
world.AddPlayer(id, spawnId)
world.Step(Dictionary<int, MovementInput>)   // 60 Hz
world.CaptureFrame() -> MovementFrame
```

The reference files under `SFOTH/reference/` are exactly the constructor inputs
(`arena.json`, `physics.json`, `combat.json`, `environment.json`, `items.json`).
A test player spawns, falls and moves under real physics.

What remains to stream it to the client:
1. **Frame encoder** — `MovementFrame → bytes`. The shipped `FrameCodec.Decode`
   gives the exact little-endian layout (magic `18003`, ver `23`, kind `2/11`);
   the encoder is its inverse. (`FrameCodec.Encode` was not shipped — only the
   client's decode side is.)
2. **Input decode** — client input packets → `MovementInput`, fed to `Step`.
3. **Bridge** — a .NET sim host driven by the Node WebRTC server: inputs in,
   fragmented v23 snapshots out on the `state` channel; `AddPlayer`/`Respawn`
   on join/death.

Toolchain for that work (already set up in the scratchpad): .NET 10 SDK +
ilspycmd; the assemblies are extracted from the wasm wrappers to real PE DLLs.

## The boundary (what this server does NOT do *yet*)

After the clock syncs, the client waits for **authoritative world snapshots** on
the `state` channel. Those snapshots are produced by the server-side Bepu
physics simulation and encoded by the `SFOTH.Simulation` / `SFOTH.Protocol`
.NET assemblies — which are **not part of this client bundle**. The browser
build only ships the *decoder* (`SFOTH.Browser.EntryPoint.PresentSnapshot`), not
the simulator or the snapshot *encoder*. Reconstructing a playable, authoritative
match would mean reimplementing that simulation and wire format from scratch.

So with no snapshots flowing, the client connects, enters the room, and after
~10s reports **"The room stopped sending state"**. That error confirms the full
transport + clock path is real and working; only the gameplay simulation is
absent.

### Protocol notes (reverse-engineered from the client)

All data-channel packets start with `uint16 magic=18003 ("SF")`,
`uint8 version=23`, `uint8 opcode` (little-endian). Opcodes: `4` clock request
(client→server, 16 B), `5` clock response (server→client, 20 B), `6` combat
event (40 B), `7` snapshot ack, `2`/`11` snapshots, `3`/`10` snapshot fragments.
Snapshots are fragmented into ≤1000-byte pieces, reassembled, acked with op 7,
then handed to the WASM decoder. See `protocol.js`.

## Optional: live spectator replay

The SSE `frame` events are `base64(gzip(JSON))`, and the JSON carries a `render`
float array, `tick`, `room`, `viewers`, and `sourceSha256` (must equal
`a55fd43a905b6cb1d7a6180a461a38640f1e0669338543f0f2dca68a85b9b3d6`). Capture a
run of these from a real server and save them as a JSON array in
`server/broadcast-frames.json` (either the decoded frame objects, or the raw
base64 strings). The server will then loop them on the broadcast stream and the
client will render a real match in the spectator view — no WebRTC needed.

## Known gaps

- Four `.woff2` fonts referenced by the page are not in the dump
  (`site-mono-*`, `source-sans-pro-{semibold,bold}`); the browser falls back to
  system fonts. Everything else loads.
