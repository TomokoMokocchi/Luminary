# Luminary scripting

Games you make in Luminary Studio can carry **scripts**. Scripts are written in
**JavaScript** with a **Roblox-style API** (a DataModel of Instances with
Properties, Methods and Events). The preference was LuaU; a full LuaU VM in the
browser is heavy, so the API mirrors Roblox closely while the language is JS.

There are two kinds of script, chosen in the Studio script editor:

- **LocalScript (client)** — runs in **each player's browser**, in an isolated
  Web Worker sandbox. It cannot touch the page, cookies or the network. It can
  create and drive on-screen GUI, play real audio, read the DataModel, and
  react to events. This is what actually executes today.
- **Script (server)** — stored with your game for a server-side runtime. The
  authoritative world (physics/combat) runs in the game server, which this
  reconstruction does not let user code extend, so server scripts are saved but
  not executed in-browser. Use LocalScripts for logic, UI, sound and effects.

Because JavaScript can't yield like Lua, **waits are awaited**:

```js
await wait(1)        // or: await task.wait(0.5)
```

Your whole script runs as an async function, so top-level `await` works.

## Globals

| Global | What it is |
| --- | --- |
| `game` | the DataModel. `game.GetService("Players")`, `game.Workspace`, … |
| `workspace` | shortcut for `game.Workspace` |
| `Players`, `Lighting`, `RunService` | pre-resolved common services |
| `script` | the running script Instance |
| `Instance.new(className, parent?)` | create an Instance |
| `Vector3`, `Color3`, `UDim2`, `CFrame`, `Enum` | datatypes |
| `task.wait/spawn/delay/defer`, `wait`, `tick`, `time` | scheduling |
| `print`, `warn`, `error`, `math`, `string`, `table` | utilities |

### Services (`game.GetService("…")`)

`Players`, `Workspace`, `Lighting`, `RunService`, `SoundService`,
`ReplicatedStorage`, `ServerStorage`, `StarterGui`, `StarterPack`,
`StarterPlayer`, `Teams`.

## Instance types

Parts & world: `Part`, `WedgePart`, `TrussPart`, `CornerWedgePart`, `MeshPart`,
`SpawnLocation`, `Seat`, `Model`, `Folder`, `Configuration`, `Tool`, `Accessory`,
`Attachment`, `PointLight`, `Decal`, `BodyVelocity`.

Logic & values: `Script`, `LocalScript`, `ModuleScript`, `IntValue`,
`NumberValue`, `StringValue`, `BoolValue`, `ObjectValue`, `Vector3Value`,
`Color3Value`.

Characters: `Humanoid`, `Player`, `Team`.

Audio: `Sound` (`SoundId`, `Volume`, `Looped`, `PlaybackSpeed`) with `:Play()`,
`:Pause()`, `:Stop()`.

GUI (rendered on screen): `ScreenGui`, `Frame`, `TextLabel`, `TextButton`,
`TextBox`, `ImageLabel`, `ImageButton`, `BillboardGui`.

## Datatypes

```js
Vector3.new(x, y, z)          // .X .Y .Z .Magnitude .Unit
                              // .add(v) .sub(v) .mul(n|v) .Dot(v) .Lerp(v,a)
Color3.fromRGB(r, g, b)       // 0–255   |  Color3.new(r,g,b)  // 0–1  | .fromHSV(h,s,v)
UDim2.new(sx, ox, sy, oy)     // .fromScale(x,y) .fromOffset(x,y)
CFrame.new(x, y, z)
Enum.Material.Neon            // any Enum.Category.Name resolves to a token
```

## Methods (on any Instance)

`:Destroy()`, `:Clone()`, `:FindFirstChild(name, recursive?)`,
`:FindFirstChildOfClass(cls)`, `:FindFirstChildWhichIsA(cls)`,
`:FindFirstAncestor(name)`, `:GetChildren()`, `:GetDescendants()`, `:IsA(cls)`,
`:GetPropertyChangedSignal(prop)`, `:ClearAllChildren()`,
`:GetAttribute(k)`/`:SetAttribute(k,v)`.

Children are also reachable by name: `workspace.Baseplate`,
`game.Players.LocalPlayer`.

## Events

Connect with `signal.Connect(fn)`; `signal.Wait()` returns a promise you can
`await`; `signal.Once(fn)` fires at most once.

| Event | Fires |
| --- | --- |
| `inst.ChildAdded(child)` / `inst.ChildRemoved(child)` | tree changes |
| `inst.Changed(prop)` / `:GetPropertyChangedSignal(p)(value)` | property changes |
| `inst.Destroying()` | just before `:Destroy()` |
| `part.Touched(otherPart)` / `part.TouchEnded(otherPart)` | the local character enters/leaves the part |
| `Players.PlayerAdded(player)` / `Players.PlayerRemoving(player)` | players join/leave (from the live lobby) |
| `player.CharacterAdded(character)` | a character spawns |
| `humanoid.Died()` / `humanoid.HealthChanged(h)` | `Health` reaches 0 / changes |
| `RunService.Heartbeat(dt)` / `.Stepped(t, dt)` / `.RenderStepped(dt)` | every frame (~30 fps) |
| `textButton.MouseButton1Click()` | a GUI button is clicked |

## Examples

### Killbrick

```js
var b = Instance.new("Part", workspace)
b.Position = Vector3.new(0, 5, 0)
b.Color = Color3.fromRGB(196, 40, 28)
b.Touched.Connect(function (hit) {
  var h = hit.Parent.FindFirstChildOfClass("Humanoid")
  if (h) h.Health = 0
})
```

### A score GUI that counts up

```js
var gui = Instance.new("ScreenGui", game.GetService("StarterGui"))
var lbl = Instance.new("TextLabel", gui)
lbl.Size = UDim2.new(0, 200, 0, 40)
lbl.Position = UDim2.new(0, 20, 0, 20)
lbl.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
lbl.TextColor3 = Color3.fromRGB(255, 255, 255)

var score = 0
game.GetService("RunService").Heartbeat.Connect(function (dt) {
  score += dt
  lbl.Text = "Score: " + Math.floor(score)
})
```

### Background music

```js
var s = Instance.new("Sound", workspace)
s.SoundId = "12222019"   // a Roblox asset id (served locally if present) or a URL
s.Looped = true
s.Volume = 0.4
s.Play()
```

### Greet players

```js
game.Players.PlayerAdded.Connect(function (p) {
  print(p.Name + " joined!")
})
```

## Tools

In Studio, insert a **Tool**, and in its Properties tick **Give on spawn
(StarterPack)** to put it in every player's inventory, or leave it unticked to
place it in the world. A Tool can carry its own LocalScript (edit it from the
Tool's properties), which runs when the game loads.

## Importing from Roblox

The Studio **Import .rbxlx/.rbxl** button converts a Roblox place: Parts (and
Wedge/Truss/Corner/Mesh/Union/Spawn/Seat/Platform), Tools (with a nested
LocalScript), and Script/LocalScript/ModuleScript sources are converted; a
Tool's `StarterPack` ancestry is preserved. Anything with no equivalent is
skipped. Binary `.rbxl` should be re-saved in Studio as **Roblox XML (.rbxlx)**
first — XML converts fully.
