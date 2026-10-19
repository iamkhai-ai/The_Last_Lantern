# Level 10 — The Heart of Elaria: spatial layout

Campaign index **9** (`progress.level === 9`), flags prefixed `l9-`. Owner: `src/levels/HeartOfElariaLevel.ts`
(runtime) over `src/data/heartOfElariaLayout.ts` (pure data + pure functions). Scenario:
`docs/scenario/10-the-heart-of-elaria.md`. Contracts: `RULE_GAMES.md`,
`docs/implementation/campaign-layout-design.md`. Every number below is the number the code uses; the
check script asserts them (`node scripts/check-heart-of-elaria.mjs`).

## 1. Room, floor and layers

| Space | Bounds | Notes |
| --- | --- | --- |
| World | 640 × 360 | one room, no room system (`HEART_WORLD`) |
| Top HUD | y = 0..58 | title / objective / Lumo status |
| Bottom status + help | y = 320..360 | status row, `H · Gợi ý` on the right |
| Walkable foot bounds | x 58..584, y 150..308 | `HEART_FLOOR`; the 14×6 foot body must stay inside |

The room background is `sanctuary-base.png`, drawn by `CampaignScene.drawRoom()` at depth 0
(`getLevelBackgroundKey(9)`), because every level's baked background is owned by one shared code path.
`mother-tree-trunk-patch.png` / `mother-tree-canopy-patch.png` are **not** drawn: they are rectangular
scenic crops with their source background retained, so compositing them would paste a rectangle over
the sanctuary. The trunk is instead a real collider plus baked art.

Depth contract (`10 + groundY / 10` for standing art, 0..7 for ground/effects):

| Depth | Content |
| --- | --- |
| 0 | `sanctuary-base` (CampaignScene) |
| 2 | `old-white-channels-{feeding,retracted}` full-scene layer |
| 3 | `{memory,hope,balance}-root-{broken,repaired,connected}` full-scene layers |
| 4 | return-ring graphics (socket → central node) |
| 4.4 / 4.6 / 4.8 | `fixed-dark-pocket-purple-border`, `temporary-core-bloom-after-retrieval`, `redundant-carried-lantern-line` |
| 6.2 / 6.5 / 6.6 | core art, `day-night-wheel-resuming`, statue-shadow graphics |
| 7 | ground stamps (every `cell`) and the shared-light beam graphics |
| 10 + 26 = 36 | standing props (base line y = 260) |
| 67.5 | `ending-dawn-lighting-overlay` |
| 82 / 86 / 87 | interaction prompt, HUD text, controls row |

Nothing is placed under the HUD bands: the tallest prop (statue, y 172..260) stays below y = 58 and
every collider ends at or above y = 320 (checked for all 14 controls and 5 props).

## 2. Ground stamps (walkable cells, no collider)

Rule 2 of `RULE_GAMES.md`: the prompt appears **only** while Nhinh's centre stands inside the authored
cell (`isInsideHeartGate`). All art is native size, centred on the cell.

| id | centre | art (native) | cell gate | stand / radius | interaction |
| --- | --- | --- | --- | --- | --- |
| `heart-memory` | 158,192 | `memory-alcove-{empty,inserted}` 58×64 | x 136..180, y 172..212 | 158,192 (r 32, cell-gated) | place / re-read the Memory crystal |
| `heart-hope` | 320,200 | `hope-alcove-{empty,inserted}` 58×64 | x 298..342, y 180..220 | 320,200 | place / re-read the Hope crystal |
| `heart-balance` | 480,192 | `balance-alcove-{empty,inserted}` 58×64 | x 458..502, y 172..212 | 480,192 | place / re-read the Balance crystal |
| `heart-seal` | 320,244 | `pressure-{empty,occupied}` 44×28 (reused from level 04) | x 298..342, y 228..260 | 320,244 | call Lumo to the seal / recall him |
| `heart-eye-left` | 368,282 | `lock_sun_{off,on}` 40×33 | x 346..390, y 264..300 | 368,282 | inspect the left sun eye |
| `heart-moon` | 416,282 | `lock_moon_{off,on}` 40×34 | x 394..438, y 264..300 | 416,282 | inspect the Moon core |
| `heart-eye-right` | 464,282 | `lock_sun_{off,on}` 40×33 | x 442..486, y 264..300 | 464,282 | inspect the right sun eye |
| `heart-confirm` | 320,278 | `confirmation-root-{waiting,ready,latched}` 48×32 | x 298..342, y 262..294 | 320,278 | latch the root loop / read the refusal |
| `heart-rule-table` | 150,284 | `root-rule-reminder-table` 124×48 | x 110..190, y 266..302 | 150,284 (r 46) | cycle the four rule models |

The walkable part of the three alcove cells is y ≥ 184 (the trunk band blocks the body above that),
and the southern bank starts at y = 308, so every cell keeps usable standing room.

## 3. Standing props (solid base + south-edge trigger)

Rule 1 of `RULE_GAMES.md`: the trigger centre is the **south edge** of the visible base; standing
north of the art can never open the prompt (`canReachHeartElement` is shared by the runtime and the
check script, and `promptLeaksBehindArt` proves no reachable position above the art centre answers).
Art is bottom-anchored on the base line at native size — a prop is never stretched into its footprint.

| id | x | art (native) | solid footprint | stand / radius | interaction |
| --- | --- | --- | --- | --- | --- |
| `heart-pedestal` | 85 | `pedestal_lit` / `pedestal_empty` (40×56 / 36×39) | 71..99 × 238..260 | 85,260 (r 24) | place the lit lantern / take it back |
| `heart-g0` | 207 | `mirror_0` / `mirror_1` (36×48) | 192..222 × 238..260 | 207,260 (r 22) | aim G0: split at the prism ↔ straight at Memory |
| `heart-memory-mirror` | 245 | `mirror_N` (36×48) | 230..260 × 238..260 | 245,260 (r 22) | rotate the Memory mirror (goal 1 = nam) |
| `heart-statue` | 416 | `statue-notch-N` (64×88, reused from level 08) | 392..440 × 238..260 | 416,260 (r 24) | rotate the statue that shadows the Moon pocket |
| `heart-balance-mirror` | 530 | `mirror_N` (36×48) | 515..545 × 238..260 | 530,260 (r 22) | rotate the Balance mirror (goal 2 = tây) |
| `heart-prism` | 207,214 | `shared_prism_{dark,receiving}` (48×48) | none (mounted inside G0) | none | passive: glows once G0 splits a live beam |

Every footprint is backed by visible art (the prop's own base) and blocks the 14×6 foot body from all
four sides; the check script probes each face. Scenery blockers (`HEART_BLOCKERS`, all baked art):
north thicket (0,80,640,70), west bank (0,150,58,158), east bank (584,150,56,158), south bank and
status band (0,308,640,52), Mother Tree trunk and root fan (232,150,186,50).

Corridors: the east–west lane in front of the prop line is 48 px tall (y 260..308); the only narrow
gaps are the 8 px slot between G0 and the Memory mirror (`> 0` and `< 13`, so the foot body cannot
enter) and the deliberate 36 px+ thresholds elsewhere — asserted by `auditHeartGaps()`.

## 4. Target ownership between neighbours

`InteractionSystem` keeps the strictly nearest enabled control and the first registered one on an
exact tie; registration order is `HEART_CONTROL_ORDER` = cells first, then props. Consequences, all
asserted: every control owns a reachable position where it is the strict nearest; overlapping discs
are bounded to a single line (the perpendicular bisector); two such lines exist — **x = 226** between
G0 and the Memory mirror (G0 wins, both props) and **y = 271** between the statue and the Moon pocket
(the pocket wins, cells register first). Standing on a pocket therefore always gives the pocket
prompt, and standing between G0 and the mirror gives G0.

## 5. Beams, root lanes and the live latch condition

Beam waypoints (`HEART_BEAM_NODES`): source (85,206) → G0 (207,244) → prism (207,214) → Memory mirror
(245,244) → Memory crystal (158,192); G0 → Balance mirror (530,244) → left eye (368,282) → Moon
(416,282) → right eye (464,282). Root lanes (socket → core) and return lanes (socket → central node)
are drawn from `HEART_ROOT_LANES` / `HEART_RING_LANES` in the three lane colours (gold 0xf2c661, blue
0x74c8ef, purple 0xb98cf0). Pulse near the table (within 150 px of 150,284) reveals the moss-covered
lanes for 6 s and records the fact in the journal.

```
light        = lanternPlaced && lanternOn
g0Split      = g0 === 0 (into the prism)      g0Direct = g0 === 1 (straight at Memory)
memoryRoute  = g0Split && memoryMirror === 1
balanceRoute = g0Split && balanceMirror === 2
lumoAtSeal   = hypot(lumo.x - 320, lumo.y - 244) <= 20      // live position only, never an at-* flag
eyeLeft      = light && balanceRoute && statue !== 1
eyeRight     = light && balanceRoute && statue !== 3
moonShadow   = light && balanceRoute && statue === 2
memory       = latched || (light && lumoAtSeal && (g0Direct || memoryRoute))
hope         = latched || (light && lumoAtSeal)
balance      = latched || (eyeLeft && eyeRight && moonShadow)
crystals     = memory && hope && balance crystals placed
ready        = crystals && (latched || (memory && hope && balance))
```

`l9-roots` (brass root clips) holds the three branches mechanically; the Hope seal no longer needs
Lumo, the Balance dark pocket is fixed, and the configuration can no longer be rotated.

Refusal feedback lists **every** unmet prerequisite, in this order: three crystals → lit lantern on
the pedestal → Lumo at the seal → G0 must use the prism → Memory mirror → Balance mirror → both sun
eyes → statue shadow over the Moon core. Branch controls add local reasons (`đèn chưa ở trên bệ`,
`bộ chia chưa nhận được tia`, `tượng đang chắn ngay trước mắt này`, `tượng chưa xoay cho bóng phủ lên
hốc`). Locked controls never disappear: they answer with a line.

## 6. Lantern state matrix

| state | `l9-lantern-placed` | `l9-lantern-retrieved` | `l9-overload` | `lanternOn` | in hand | F |
| --- | --- | --- | --- | --- | --- | --- |
| on pedestal, loop unsolved | true | false | false | true | false | refused with feedback |
| on pedestal, loop latched, still lit | true | false | false | true | false | extinguishes it **in place** → already-off path |
| taken back lit (overload) | false | true | true | true | true | darkness → dawn → completion save |
| taken back while already off | false | true | false | false | true | completion already saved on pickup |
| after the final F | false | true | false | false | true | campaign complete; reload goes to the ending |
| put back on the pedestal | true | false | false | true | false | overload flag cleared, F works there again |

Reload inside the overload restores a safe, finishable state: lantern in hand and lit, overload on,
Nhinh at the pedestal-bank checkpoint (150,244), Lumo beside her, F available immediately. `l9-overload`
is never persisted together with `!l9-lantern-retrieved` (normalised by `normalizeHeartProgress`, the
campaign equivalent of the v1 `finale_overload → hub_final` write-back). `l9-complete` restores
straight into `EndingScene` and never replays the puzzle; the "already-off" branch completes through
`finishAfterAlreadyOffLantern` without faking an overload.

## 7. Checkpoints and reload

Named safe points (`HEART_CHECKPOINTS`, all verified walkable): spawn (250,284), pedestal-bank
(150,244), seal (320,270), confirm (320,284), east (520,286), west (130,220). `nearestSafeHeartSpawn`
keeps a saved position when it is clear of every solid and falls back to the nearest checkpoint; the
overload always uses `HEART_OVERLOAD_CHECKPOINT` (150,244). Restore order: flags → crystals → lantern
placement/state → Lumo's position and assignment (`l9-called-heart`, `l9-at-heart` derived from live
proximity) → safe spawn → live conditions → HUD. CampaignScene saves Nhinh/Lumo counters for level 9
from inside the controller (levels 4..8 keep the shared path untouched).

## 8. Player flow (spawn → ending) and its gates

1. Spawn (250,284) on the open south lane; opening dialogue (§2), Lumo following.
2. Root-rule table (150,284): E cycles the four models, SPACE (Pulse, needs the lit lantern in hand)
   reveals the moss lanes. Optional; never solves the net.
3. Three crystal sockets: walk into each cell, E. Any order, no wrong-order state exists.
4. Lantern pedestal (85,260): E with the lantern in hand places and lights it.
5. Hope seal (320,244): E calls Lumo; the live condition is his position, not the flag.
6. G0 / Memory mirror / Balance mirror / statue: E rotates; the three branch lanes and the beams
   update from live state; every unmet prerequisite is named.
7. Central node (320,278): E with all three live writes `l9-roots`, recalls Lumo, fixes the clips.
8. Pedestal again: E retrieves the lit lantern → overload, carried-lantern line, core bloom; F works
   immediately, even mid-dialogue.
9. F: completion is saved, white channels retract, night, the day/night wheel resumes, dawn, ending.

Nothing closes behind the player; there is no timer, damage or alarm. The only F refusal is "lantern
must stay on the pedestal" before the loop is latched, and it always answers with a line. Lumo can be
recalled and re-called from the same seal at any time, so no call state is unrecoverable.

## 9. Guidance

Objective rows follow the stage (crystals → teach → source → seal → route → confirm → retrieve →
overload → done) and never name the solution before the pieces are in hand; the route row shows how
many conditions are still unmet instead of claiming readiness. `H` gives three ladders per stage —
the puzzle and overload ladders are the scenario's own text verbatim, including "Nhấn F để tự tay
tắt đèn." `J` lists what was learned. All text is Vietnamese and lives in
`HeartOfElariaLevel.ts` (`HINTS`, `MAT_MODELS`, journal).

## 10. Verification

```
node scripts/check-heart-of-elaria.mjs   # geometry, reachability, latch matrix, save round-trip, art
npm run build                            # tsc --noEmit && vite build
git diff --check                         # whitespace
```

The check script proves: every stand is reachable from the spawn by a collision-aware search with the
real 14×6 foot body; every solid blocks that body from all four faces; each control owns a strict
nearest-target position and no prompt leaks from behind a prop; every referenced art name resolves to a
real PNG (47 states checked against the IHDR pixel sizes) and no control's box is stretched; the latch
condition rejects each single missing prerequisite with specific feedback; the save round-trip never
persists a stuck overload and always keeps a finishable lantern state; the already-off path and the
ending gate match the scenario.

Not covered by the script (needs a browser playthrough): rendered layering/occlusion looks, dialogue
timing, and the full human puzzle solve.

## Repair T11 — light and overlays follow live geometry

- Overload beam: a Graphics line from the core (320,115) to `LanternSystem.getCarriedLightPosition(player)` is redrawn every frame at depth 6.8, so it follows Nhinh and disappears the moment the lamp goes out or is put down. The packaged `redundant-carried-lantern-line` (a fixed stroke from the core to one point) and the pedestal are not used while the lamp is carried. The halo shares the same helper, so there is one carried-light offset (+6,+2).
- Moon pocket: the packaged `fixed-dark-pocket-purple-border` is a full-canvas image whose visible box starts right of the Moon cell (x 488+ against a cell ending at x 436), so it is not used. The border is a rounded rectangle centred on the Moon cell (`heart-moon`, 416,282), shown with the same condition as before.
- Depth: puzzle beams moved from 7 to 6.8, under the floor cells and locks (7), instead of raising the cells over the actor.
- Floor-cell gates now equal the alpha box of their own art (measured from the PNG, ±2px): seal plate (300..340 x 233..255), floor eyes and Moon lock. They previously reached 3–5px past what the player sees.
- `core-dawn` is byte-identical to `core-night`; the dawn reads from the existing `ending-dawn-lighting-overlay`, now shown from the dawn transition on and when the level is complete. The first frame takes its core art from the live state (`coreArtName`), never from a fixed `core-night`.
- Measured art facts live in `scripts/check-campaign-art.mjs` (IHDR size and decoded alpha of the real files): runtime textures against `assetManifest.json` and the layout, Level 10 package art, floor-cell gates, and the Level 09 elements. It found stale declared sizes: the manifest listed the pedestal and the four locks wrongly (corrected), and the Level 09 layout scaled the mirrors, sun locks, loop receiver and the balance crystal from wrong native sizes, stretching them (the crystal was drawn at 42x30 from a 42x78 file). The native sizes are corrected; their footprints changed with them and every observatory stand check still passes.
- Moon ownership (T05) is unchanged. NOT_RUN: WebGL look of the overload beam and the pocket border (checked once in the Canvas renderer: the beam follows Nhinh, the border sits on the Moon cell).
