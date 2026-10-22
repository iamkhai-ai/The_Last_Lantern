# Level 08 — Ruins of Two Halves: layout contract (index 7)

Pure data lives in `src/data/ruinsOfTwoHalvesLayout.ts`. Everything below is that module, written out. Rendering, collision, beam drawing and the pure check script all consume these same numbers — there is no second copy.

World 640×360. Top HUD `y=0..58`. Bottom status/help `y=320..360`. Playable floor band **`y=80..310`** and walkable `x=24..616`. Player frame 36×42, baseline 40. Feet = `(center.x, center.y + 19)`.

```
RUINS_BODY = { feetY: 19, x: -7, y: 16, width: 14, height: 6 }
player.setFootPlacement(19, 37, 11, 14, 6)          // depthOffsetY, bodyOffsetY, bodyOffsetX, bodyWidth, bodyHeight
ruinsActorBody(center) = { x: center.x - 7, y: center.y + 16, width: 14, height: 6 }
```

Walkable band check on the **foot body**, not on centre points:

```
body.x >= 24 && body.x + 14 <= 616 && body.y >= 80 && body.y + 6 <= 310
```

## 1. Walls and architecture (all solid, all visible)

| id | rect (x, y, w, h) | visible as |
| --- | --- | --- |
| `north-wall` | `0, 0, 640, 80` | authored masonry band under the HUD, holding the stele and the north door |
| `south-wall` | `0, 310, 640, 50` | authored masonry band above the status/help row |
| `west-wall` | `0, 80, 24, 230` | authored masonry |
| `east-wall` | `616, 80, 24, 230` | authored masonry |
| `west-buttress` | `24, 80, 64, 96` | authored masonry pier in the north-west corner |

`player.setCollideWorldBounds(true)` is already on, but the four wall rects are still registered as real static colliders so the pure walkable test and the runtime physics agree exactly.

## 2. Standing props — art, footprint, stand, depth

`depth = 10 + groundAnchorY / 10`. Footprints are the visible silhouette, never the texture centre or top edge.

| id | art | image centre | ground anchor | footprint (x, y, w, h) | depth | reach stand (RULE_GAMES 1: every side within 8px of the footprint; wall fixtures keep r22 or r24) |
| --- | --- | --- | --- | --- | --- | --- |
| `statue` | `statue-notch-{0..3}` 64×88 | `320, 176` | `320, 212` | `292, 148, 56, 64` | 31.2 | `320, 204` |
| `mirror-left` | `mirror_{0..3}` 36×48 | `240, 238` | `240, 262` | `224, 218, 32, 44` | 36.2 | `240, 254` |
| `mirror-right` | `mirror_{0..3}` 36×48 | `400, 238` | `400, 262` | `384, 218, 32, 44` | 36.2 | `400, 254` |
| `pedestal` | `ruins_altar` 104×52 | `480, 236` | `480, 262` | `428, 210, 104, 52` | 36.2 | `480, 254` |
| `practice-column` | `test-column-notch-{0..3}` 32×44 over `test-pedestal` 48×36 | column `150, 223`, pedestal `150, 234` | `150, 250` | `126, 216, 48, 36` (the composite base) | 35.0 base / 35.1 column (`overlay.depthOffset` 0.1) | `150, 244` |
| `seedling-bed` | `seedling-curtain-{open,closed}` 88×48 | `180, 128` | `180, 152` | `136, 104, 88, 48` | 25.2 | `180, 144` |
| `shadow-npc` | `shadow_npc` 44×56 | `522, 140` | `522, 160` | `508, 124, 28, 36` (the visible cloak) | 26.0 | `522, 184` |
| `inscription` | `beacon_stone` 34×46, flat on the wall | `430, 57` | wall | none — the north wall is already solid | 18.0 | `430, 106` |
| `north-door` | `sanctuary-door-{closed,open}` 104×76, flat on the wall | `548, 42` | wall | none | 4.0 (floor band) | `548, 112` (r24) |

The statue's texture box is `y 132..220`; the opaque pixels of `statue-notch-{0..3}` actually run `x 293..347, y 140..215` (measured from the PNGs), so its solid `y 148..212` overhangs the drawn art by 8px at the head and 3px at the foot. The foot body is 6px tall, so it can only reach that head band from `y 124..125`, where the player's own sprite already ends ~13px above the statue's head: nothing visible ever clips. The horizontal overhang is 1px on each side. The authored shadow quads are anchored at `320, 220`, which is 5px below the statue's drawn bottom — the shadow therefore spreads a little past the statue's feet, which reads as contact shade.

`practice-column` is one composite object: the pedestal art carries the collision (the base that actually blocks), the column art is drawn on top at `groundAnchorY/10 + 0.1`. The whole silhouette is solid from north/east/south/west; the base is not a "few bottom pixels" collision box.

`shadow-npc` is solid because The Shadow is a standing figure the player must not walk through; he is stationary in this level, so a real footprint cannot trap the player. Nothing else about him changes.

## 3. Ground stamps (below feet, never solid)

| id | art / drawing | centre | depth |
| --- | --- | --- | --- |
| `lock-left-sun` | `lock-sun-{off,on}` 32×40 | `240, 112` | 4 |
| `lock-moon` | `lock-moon-{lit,covered}` 32×40 | `320, 112` | 4 |
| `lock-right-sun` | `lock-sun-{off,on}` 32×40 | `400, 112` | 4 |
| `splitter` | `fixed-three-route-splitter-{off,on}` 48×48 | `320, 238` | 4 |
| `confirmation-ring` | `confirmation-{waiting,ready,latched}` 48×36 | `480, 236` | 36.3 (on the altar face) |
| `practice-slab` | `test-moon-{lit,covered}` 16×20 | `206, 224` | 4 |
| `practice-port` | authored graphics slit `x 24..40, y 216..232` | — | 4 |
| `practice-shadow-patch` | authored graphics rect over the practice slab | `206, 224` | 4.5 |
| `conduit` | authored floor groove `(470,258) (410,258) (350,258) (330,252) (320,244)` | — | 3 |
| `floor` | `ground_stone` tileSprite, tinted, whole screen | — | 0.5 |
| `backdrop` | `temple-scene-base` 640×360, drawn dark as ambience | `320, 180` | 0 |

Receiver footprints (used by the pure puzzle state, not by physics):

```
moonFootprint  = { x: 304, y: 92, width: 32, height: 40 }
leftFootprint  = { x: 224, y: 92, width: 32, height: 40 }
rightFootprint = { x: 384, y: 92, width: 32, height: 40 }
```

## 4. Shadow quads (authored verbatim from the level's own shadow art)

```
SHADOW_QUADS[0] = (292, 75) (348, 75) (336,220) (304,220)   // shadow-notch-0
SHADOW_QUADS[1] = (316, 75) (324, 75) (326,220) (314,220)   // shadow-notch-1
SHADOW_QUADS[2] = (187, 76) (230, 76) (336,220) (304,220)   // shadow-notch-2
SHADOW_QUADS[3] = (420, 76) (438, 76) (326,220) (314,220)   // shadow-notch-3
```

All four converge on the authoring anchor `(320,220)` — 5px below the statue's drawn bottom edge (`y 215`). They are the actual opaque extents of the four 640×360 PNGs and were re-measured pixel by pixel: the bounding box and **every row's left/right edge** of each quad match the drawn mask within 1.5px, and the drawn fill is opaque (`#081724`, alpha 220). The check script re-derives that from the PNG bytes, so the drawn overlay and the tested region cannot drift apart.

Rendering: the corresponding `shadow-notch-{statue}` image is drawn full screen at `(320,180)`, depth **6**, above the beams (5) and the locks (4) and below every standing prop and every actor foot. When the statue rotates the overlay is swapped and the newly covered receiver visibly darkens.

## 5. Beams

```
SPLITTER = (320, 238)
centreRayY     = 112                                    // moon lock centre row
branchRailY    = 238                                    // mirror reflection centres
centreRay      = (320,238) → (320,112)
leftInbound    = (320,238) → (240,238)
leftOutbound   = (240,238) → (240,112)
rightInbound   = (400,238) → (400,238)                  // (320,238) → (400,238)
rightOutbound  = (400,238) → (400,112)
```

* Both inbound segments and both outbound segments are drawn at depth **5**; outbound segments only when their mirror is aimed.
* The centre ray is drawn only where the statue does not occlude it: `y 112..148` and `y 212..238`.
* The beam is never drawn as "lit" past a blocker: the outbound segment is skipped entirely when the shadow quad intersects it, and skipped when the mirror is not aimed. The mirror art itself shows the wrong orientation (flat plank `mirror_2`, upright plank `mirror_3`).

## 6. Practice forecourt (`tiền sảnh`, south-west)

```
port        = (28, 224)          // authored slit in the west wall, glows when the lamp is on
rayY        = 224
column axis = (150, 224)         // x 134..166, y 201..245
pedestal    = x 126..174, y 216..252
slab        = x 198..214, y 214..234
```

The beam is `(28,224) → (150,224) → (206,224)`. Wide face (`notch 0`, `notch 2`) blocks; narrow face (`notch 1`, `notch 3`) passes. `test-moon-covered` / `test-moon-lit` and the authored shadow patch make the result readable on the floor rather than by guessing the screen brightness, exactly as the scenario asks ("Ký hiệu trên phiến đổi từ khép sang mở khi đủ tối, giúp người chơi hiểu điều kiện thay vì đoán theo độ tối màn hình").

The practice area shares no counter with the main puzzle: its own counter is `practice`, and no `l7-*` puzzle flag is written from it.

## 7. Traversal

Free-standing corridor widths, measured with the 14×6 foot body:

| corridor | span | width |
| --- | --- | --- |
| south of the mirrors and the pedestal, along `y=262..310` | 262 → 310 | **48px** |
| north of the practice area, between the seedling bed (`y=152`) and the practice column (`y=201`) | 152 → 201 | **49px** |
| west of the practice area, from the west wall (`x=24`) to the practice pedestal (`x=126`) | 24 → 126 | **102px** |
| between the west buttress (`x=88`) and the seedling bed (`x=136`) | 88 → 136 | **48px** |
| east of the pedestal to the east wall, `x=532..616` | 532 → 616 | **84px** |
| north of the statue, between the locks row and the statue (`y=132..148`) | 132 → 148 | 16px — not a route; the route around the statue is the 102px and 84px side lanes |

The temple courtyard is a ring: the player can always circle the statue via the west lane (behind the practice area / seedling bed) and the east lane (The Shadow, the pedestal), so no control is on a dead end and no backtracking is required.

## 8. Check points and restore

```
CHECKPOINTS = [
  { id: 'entrance',   x: 120, y: 288 },                   // spawn
  { id: 'yard',       x: 320, y: 286 },                   // south of the splitter
  { id: 'east',       x: 570, y: 200 },                   // east lane, clear of The Shadow and the altar
  { id: 'north-stair',x: 548, y:  44, requiresExit: true} // a sentinel: inside the north wall, so never a real spawn
]
```

`north-stair` sits inside the north wall's solid, so the floor test rejects it in *every* state: a restore can never place the player beyond the door even if `exitReady` is true. The gate flag is kept as the second belt on the same braces.

`isRuinsPositionSafe(center, extraBlockers?)` = the foot body is inside the floor band and clear of every wall, every solid footprint and every runtime extra blocker (the Shadow's footprint while he is in the level).
`resolveRuinsSpawn(saved, { exitReady })` = the saved centre when it is safe; otherwise the nearest safe and unlocked checkpoint; otherwise a spiral search around the `entrance` checkpoint.

Restore order in `RuinsOfTwoHalvesLevel.build()`:

1. read durable flags and counters (`l7-solved`, `l7-route-latched`, `l7-lantern-placed`, `l7-lantern-retrieved`, `l7-met-shadow`, `l7-curtain-shut`, `l7-shadow-talked`, counters `statue`, `ruins-left`, `ruins-right`, `practice`);
2. restore the lantern placement from `l7-lantern-placed` (`lantern.placeLanternAt(480, 220)`);
3. `deriveRuinsPuzzleState(...)` from the restored live values;
4. `resolveRuinsSpawn(savedCenter, { exitReady: isRuinsExitReady(...) })`;
5. draw, register interactions, refresh.

If `l7-solved` is set, the statue/mirror configuration is **preserved** and the curtain stays closed, but the live condition is still re-derived: a stale `l7-solved` cannot make the confirmation ring read "ready" on its own, and the latch flag can never be re-derived from a moved statue. "Preserved" means preserved *as the solving configuration*: `ruinsNormalizeCounters` puts a latched save onto `statue 0, left 1, right 0` (`ruinsSnapSolvedConfiguration`) so a resumed session still shows the three receivers reading the way the temple was left, instead of a dark temple behind a latched ring. An *un*latched save keeps whatever the player had.

A lamp that is restored onto the altar is forced lit: `LanternSystem.placeLanternAt` switches it on and `toggleLantern` refuses while it is placed, so restoring a stale `lanternOn: false` would otherwise strand the player with a lamp they cannot relight. The scenario's "tắt đèn … không giải được" is still reachable, because the lamp can be switched off in hand before it is placed.

After the latch the statue and both mirrors freeze (`rotateStatue` / `rotateMirror` answer with the latched line) and the pedestal only ever *returns* the lamp — re-placing it would undo the scenario's retrieval step and re-lock a door the player has already opened.

## 9. Check script contract (`scripts/check-ruins-of-two-halves.mjs`)

Pure, no Phaser, no DOM (it does read this level's own PNG bytes with `node:fs` + `node:zlib`). Asserts:

1. body constants and `ruinsActorBody` match the arcade foot body;
2. every authored stand point is inside the floor, clear of every solid, and **reachable from the spawn** by a collision-aware BFS over the real foot body;
3. every solid prop blocks the foot body from all four cardinal directions, and each registered solid matches its rendered footprint;
4. for the statue: notch 0 covers the Moon footprint, notches 1/2/3 do not; no notch ever covers either Sun footprint; notch 2 intersects the left branch ray only; notch 3 intersects the right branch ray only; notch 0 intersects neither;
5. `deriveRuinsPuzzleState` reads only live input — the same live input gives the same answer when unknown extra history properties are attached, and `l7-solved`-style history is ignored;
6. the Sun locks go dark when the lamp is off, when the mirror is unaimed, or when the shadow crosses their ray, and light only in the intended configuration;
7. `resolveRuinsSpawn` never returns a position inside a solid or behind the wall, and never returns the `north-stair` checkpoint while the exit is unsolved;
8. the exit/confirmation control is only enabled when the scenario completion conditions hold (latch + lamp retrieved + Shadow conversation), and the confirmation only latches on the live simultaneous condition;
9. v1 save compatibility: a legacy progress object with `statue: 2` and `l7-solved: true` still loads, keeps its configuration and stays latched;
10. `ruinsNormalizeCounters` snaps a *latched* save onto the solving configuration, leaves an *un*latched save on the player's own values, and lands a fresh save on the entry values (practice slab lit, nothing pre-solved);
11. `getRuinsStage` releases the tutorial stage as soon as the player engages the main puzzle, and never lets the tutorial override the latched/retrieve flow;
12. **the drawn `shadow-notch-{0..3}` PNGs are the authored quads**: the bounding box matches exactly, and every row's left/right edge within 1.5px; the fill is opaque; the solving notch paints the whole Moon receiver and neither outer Sun receiver; the depth band puts the overlay above the receivers and the beams and below every standing prop;
13. **RULE_GAMES §1 is enforced mechanically**: for all nine controls, no walkable position whose foot body sits above the object's art bottom, and none beside the object's art span, falls inside the trigger radius — only the south edge can raise a prompt;
14. **every solid tracks the art a player can see**: the drawn art's width/height match the declared art, and the collider overhangs the drawn silhouette by ≤8px at the head and ≤4px at the foot, ≤1px on either side (the composite practice column and the procedurally drawn altar/Shadow are checked against their art boxes).

## Repair T09 — The Shadow has a place and a path

- Source of truth: `RUINS_SHADOW` in `src/data/ruinsOfTwoHalvesLayout.ts`. The old static procedural `shadow_npc` prop (east side, never moved) is gone; the registered 48x64 poses `shielding`, `turn`, `waiting`, `walk-right` and `stillness` are used at native size with a bottom-centre pivot.
- Phases: before the latch he stands guard beside the seedling bed at ground (238,164) in `shielding`; after the latch he lowers the hand (`turn`) at the same spot and is the conversation partner (stand (246,156), reach 8px from its footprint); after the conversation he walks `[(270,142),(400,122),(470,110)]` at 70px/s and stops in `waiting` at ground (470,110) (stand (470,102), reach 8px from its footprint) beside the north stair. He pauses (`stillness`) whenever the player is further than 150px, and he never disappears. A save that already met him places him on the waiting spot, unless a walk record says the walk was still in progress (see Persisted walk below).
- Collision: his footprint is a solid the whole time he is in the level, never only on a spot. It is the 28x36 rect `ruinsShadowFootprintAt(ground)` builds from his ground anchor, the same offset as both spots (guard (224,128,28,36), wait (456,74,28,36)). During the walk, `placeShadowSolid` moves the static body to his live position every frame. `ruinsShadowSolidEnabled` decides each frame. Parked, the solid is off only for real penetration of the player's 14x6 foot body shrunk by 0.5px a side, so flush contact keeps it on. While he advances, it is off whenever the footprint is within `stepPx + 1` of that body, where `stepPx` is `Player.maxSpeed` (150px/s) x dt, because the player can close one step before the next check; it is on again once clear. The walking Shadow therefore never pushes or traps the player. The pure check walks him along the whole route in 4px steps and proves every open stand, checkpoint and the north door stand stay reachable at each step, and that the footprint never overlaps a wall or a standing prop.
- Persisted walk: the walk is saved in the talk's own save. `l7-shadow-walk-step` holds the last waypoint reached (`-1` before the first) and is written after each waypoint. Reaching the last waypoint removes it, so a finished walk leaves the same state as before. On build, `ruinsShadowWalkResume` places him at that waypoint (`-1` is the guard spot) and resumes towards the next one, with the follow-range pause still applying. A counter that names the final waypoint, is out of range or is not an integer resumes nothing, and it is dropped unless the Shadow was already met.
- Leaving mid-walk: after the talk the stage is already `exit` (`getRuinsStage`), so the player may leave while he is still walking. The exit is deliberately not blocked: he pauses beyond `followRange`, so a block could strand the player. The walk counter stays in the save and the walk resumes from it only when level 7 is rebuilt, which happens when she returns.
- Restore: `resolveRuinsSpawn` treats the Shadow's footprint at his restored position as a solid, so a saved player centre inside it moves to the nearest safe spot.
- Depth: sprite depth follows `10 + ground y / 10` during the walk.
- North door refusals now name only the next missing step and its control (`ruinsNextStep`): place the lamp on the main pedestal, light both Sun locks with the mirrors, shade the Moon lock with the statue, or latch the temple; then recover the lamp; then talk to the Shadow. Every control stays inspectable.
- Legacy lamp restore `(120,205)` for index 7 in `CampaignScene` was dead (the controller overwrote it) and is removed. `l7-shadow-talked` stays written because older notes read it as a repeat marker.
- Background check: the baked arch and planter in `temple-scene-base.png` are covered by the masonry band or do not show through the floor tint; a Canvas-renderer screenshot at the start of a fresh save showed no fake gate or bed. No second exit was added. WebGL rendering and tint blends are NOT_RUN.
- NOT_RUN: the practice-slab slope/mask is still measured only by the existing bounding-box checks; no pixel mask is compared with the drawn practice shadow.
