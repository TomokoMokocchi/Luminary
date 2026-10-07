This is NOT Roblox and has no affiliation or code from Roblox

This project was inspired and pulled from https://shedletsky.com/SFOTH/ 

There is no intention to monetize this, steal this, or sell this. It will remain FOSS and be runnable via a browser.

Programming (and creating maps)

Maps are made in the full-screen Luminary Studio (the "Create a game" button, or
Create in the top nav). It works like a tiny Roblox Studio: a free-fly camera
(WASD to move, Q/E down/up, right-drag or the Look tool to turn, scroll to zoom,
Shift to go faster), a Toolbox to insert objects, an Explorer tree, a Properties
panel, and a colour palette. You can place blocks, ramps, spawns and Tools; mark
a Tool "give on spawn" to put it in the StarterPack; and attach scripts.

Scripting is integrated as client (LocalScript) and server (Script) scripts, plus
per-Tool scripts. Client scripts run in an isolated Web Worker sandbox in the
player's browser with a small `Lum` API (print / wait / onStep / workspace /
random) — they cannot touch the page, cookies or the network. Server scripts are
stored with the map and run by the owning server instance. The Studio script
editor has a "Test (client)" button that runs a script in the sandbox and shows
its output; in-game, client output goes to the F9 developer console.

You can also import a Roblox place: the Studio "Import .rbxlx/.rbxl" button
decompiles and converts Parts / Spawns / Tools / Scripts and skips anything with
no equivalent in our game. (XML `.rbxlx` places convert fully; for a binary
`.rbxl`, re-save it in Studio as "Roblox XML (.rbxlx)" first.)

Servers &amp; ownership: every map can host many live instances (server-1,
server-2, …); a fresh one starts when the others are full and is torn down when
it empties, and the lobby shows a server browser for the selected map. When you
first set a username your browser is given a key so you can edit and delete the
maps you create (and nobody else can). Maps are ranked by plays and likes, and
players can like/dislike each game (one vote per IP).

Currently I don't have a domain or VPS so I don't have a way to publicly run this
but I will get there eventually.

For now host locally and port forward or use ngrok or hamachi (playit.gg locked tcp hosting behind a paywall.)

Host cmd example:

pkill -f "node index.js"; sleep 1; PORT=80 sudo node index.js
