# Level 09 — The Dark Moon Observatory: spatial layout (authoritative spec)

> **Generated from the runtime data.** Every rectangle, stand, radius and prompt below comes from
> `src/data/observatoryLayout.ts` + `src/data/observatoryRooms.ts` via
> `scripts/gen-observatory-layout-doc.mjs`, so this document cannot drift from the colliders the game
> uses. Verify with `node scripts/check-observatory.mjs` and `npm run build`.

- Scenario: `docs/scenario/09-dark-moon-observatory.md` · flow plan: `09-plan.md`
- Geometry, state, prompts: `src/data/observatoryLayout.ts`
- Rooms, spawns, exits, waypoints: `src/data/observatoryRooms.ts`
- Pure state derivation: `src/systems/ObservatoryPuzzle.ts`
- Runtime controller: `src/scenes/CampaignScene.ts` (`buildObservatoryRoom`, `transitionObservatory`,
  `updateObservatoryLumo`, `updateObservatoryCrossingState`, `refreshObservatoryDoors`,
  `refreshObservatoryPuzzle`, `resolveSafeObservatoryCheckpoint`, `clearActiveRoom`, `callObservatoryLumo`)
- Art: `assets/levels/09-dark-moon-observatory/sprites/` plus reused Level 05/08 mechanism frames
  registered in `src/art/CampaignArt.ts`. Staging files (`layout-and-restores.json`, `previews/01..10`)
  are illustrative composites and are **never loaded at runtime**.

## Conventions

- Each room is an independent 640×360 view; runtime uses room-local coordinates plus `roomId`.
- Native art sizes are preserved. Standing props are fitted by a **uniform** factor
  (`fitObservatoryArt`), so no sprite is stretched; wall/floor art keeps its authored ratio.
- Actor frame 36×42 with baseline 40: feet at `center + (0, 19)`; the Arcade foot body
  is **14×6** at `center + (-7, +16)`.
- Depth: floor art 0..7, door arches 3, ground-mounted art 3, bridge deck 6, standing props
  `10 + groundAnchorY/10`, memory overlay 94, prompt container 82, HUD 86. Darkness uses the shared
  `LanternSystem` overlay stack (68..71) instead of a level-local overlay.
- HUD text occupies y=0..58 and y=320..360. No stand, transit circle, inspect control, door threshold, arch or
  walkable floor sits in those bands (checked for every alcove by `scripts/check-observatory.mjs`). Outer masonry
  may run under the status band as solid wall that is never walkable. Every world sprite sorts below the
  prompt/HUD depth so nothing can draw over the HUD.
- A door is a recessed alcove: a 48px opening, permanent jambs
  (24px thick on the side alcoves, 8px on the south sill pocket), and a threshold that is solid only while the door is shut. The transit
  trigger sits deep inside the alcove, so it is geometrically unreachable while locked, and a
  room-facing inspect control at the alcove mouth always names the missing prerequisite in Vietnamese.

## Walkable floors and permanent masonry

| room | floor band (x,y,w,h) | minX..maxX |
| --- | --- | --- |
| tiền sảnh (composed stone floor; the `lobby-base` staging board is not used) | 24,88,592,216 | 24..616 |
| hành lang phòng sao (composed stone floor; the `star-chart-base` staging board is not used) | 24,88,592,216 | 24..616 |
| phòng thiên văn (`observatory-clean-base`) | 24,152,592,148 | 24..616 |

### Masonry — tiền sảnh (composed stone floor; the `lobby-base` staging board is not used)

| rect (x,y,w,h) |
| --- |
| 0,0,640,88 |
| 0,304,640,56 |
| 0,88,24,108 |
| 0,244,24,60 |
| 616,88,24,68 |
| 616,204,24,100 |

### Masonry — hành lang phòng sao (composed stone floor; the `star-chart-base` staging board is not used)

| rect (x,y,w,h) |
| --- |
| 0,0,640,88 |
| 0,304,640,56 |
| 0,88,24,68 |
| 0,204,24,100 |
| 616,88,24,108 |
| 616,244,24,60 |

### Masonry — phòng thiên văn (`observatory-clean-base`)

| rect (x,y,w,h) |
| --- |
| 0,0,640,100 |
| 0,100,468,52 |
| 532,100,108,52 |
| 0,152,24,38 |
| 0,238,24,62 |
| 616,152,24,148 |
| 0,300,488,60 |
| 548,300,92,60 |
| 488,320,64,40 |

### Door alcoves

| id | room | door | threshold | jambs | inspect (r) | transit trigger (r) | arch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `door-a-entrance` | entrance | door-a | 536,156,104,48 | 536,132,104,24 · 536,204,104,24 | 520,180 (24) | 604,180 (28) | 576,152,48,48 |
| `door-a-corridor` | corridor | door-a | 24,156,104,48 | 24,132,104,24 · 24,204,104,24 | 144,180 (22) | 36,180 (28) | 72,152,48,48 |
| `sun-door-corridor` | corridor | sun-door | 536,196,104,48 | 536,172,104,24 · 536,244,104,24 | 512,220 (22) | 604,220 (28) | 576,192,48,48 |
| `sun-door-observatory` | observatory | sun-door | 24,190,80,48 | 24,166,80,24 · 24,238,80,24 | 118,214 (22) | 36,214 (28) | 56,186,48,48 |
| `return-loop-entrance` | entrance | return-loop | 24,196,104,48 | 24,172,104,24 · 24,244,104,24 | 140,220 (22) | 36,220 (28) | 72,192,48,48 |
| `return-loop-observatory` | observatory | return-loop | 496,300,48,20 | 488,300,8,20 · 544,300,8,20 | 520,262 (22) | 520,304 (16) | 496,284,48,36 |

## Modules (art + stand + behaviour)

The stand is the E trigger. A standing prop answers from every side within 8px of its solid (RULE_GAMES.md 1, 2026-10-22); its stand is the reach point 8px above its base line, and the documented
side. A standing prop sorts at `10 + anchor.y/10`; ground-mounted art sits at depth 3.

### tiền sảnh (composed stone floor; the `lobby-base` staging board is not used)

| id | art | native × scale | anchor | drawn rect | stand (radius) | approach |
| --- | --- | --- | --- | --- | --- | --- |
| `lantern-pedestal` | texture `pedestal_empty` | 36×39 ×1 | 188,232 | 170,193,36,39 | 188,224 (22) | south |
| `g0` | texture `mirror_0` | 36×48 ×0.9 | 432,236 | 416,193,32,43 | 432,228 (22) | south |
| `learned-marks` | level 8 `learned-marks-miniature` | 160×80 ×1 | 320,184 | 240,104,160,80 | 320,202 (24) | south, ground mount |

### hành lang phòng sao (composed stone floor; the `star-chart-base` staging board is not used)

| id | art | native × scale | anchor | drawn rect | stand (radius) | approach |
| --- | --- | --- | --- | --- | --- | --- |
| `g1` | texture `mirror_1` | 36×48 ×0.9 | 240,216 | 224,173,32,43 | 240,208 (22) | south |
| `lumo-tube` | level 4 `tube-mouth` | 64×32 ×1 | 105,88 | 73,56,64,32 | 105,80 (22) | south |
| `lumo-seal` | level 7 `lock-moon-covered` | 32×40 ×1 | 320,88 | 304,48,32,40 | 320,80 (22) | south |
| `door-a-control` | level 4 `latch-unlatched` | 28×32 ×1 | 56,204 | 42,172,28,32 | 56,222 (22) | south |
| `sun-door-control` | level 7 `lock-sun-off` | 32×40 ×1 | 500,260 | 484,220,32,40 | 500,252 (22) | south |
| `star-map-table` | texture `ruins_altar` | 104×52 ×0.8 | 320,280 | 278.5,238,83,42 | 320,280 (—) | side |

### phòng thiên văn (`observatory-clean-base`)

| id | art | native × scale | anchor | drawn rect | stand (radius) | approach |
| --- | --- | --- | --- | --- | --- | --- |
| `g2` | texture `mirror_2` | 36×48 ×0.9 | 168,258 | 152,215,32,43 | 168,250 (22) | south |
| `splitter` | level 7 set `fixed-three-route-splitter-off / fixed-three-route-splitter-on` | 48×48 ×0.8 | 240,240 | 221,202,38,38 | 240,232 (22) | south |
| `statue` | level 7 set `statue-notch-0 / statue-notch-1 / statue-notch-2 / statue-notch-3` | 64×88 ×0.8 | 296,252 | 270.5,182,51,70 | 296,244 (22) | south |
| `sun-lock` | level 7 `lock-sun-off` | 32×40 ×0.85 | 176,152 | 162.5,118,27,34 | 176,144 (22) | south |
| `root-bed` | texture `root-bed` | 44×148 ×1 | 362,300 | 340,152,44,148 | 330,252 (24) | side, ground mount |
| `final-door-control` | level 3 `mechanisms/latch-east-unlatched` | 28×32 ×1 | 500,152 | 486,120,28,32 | 500,170 (22) | south, ground mount |
| `final-door` | level 7 set `sanctuary-door-closed / sanctuary-door-open` | 104×76 ×0.62 | 500,152 | 468,105,64,47 | 500,152 (—) | gate, ground mount |
| `stone-return-loop` | texture `receiver_off` | 40×37 ×0.7 | 466,252 | 452,226,28,26 | 466,244 (22) | south |
| `final-record` | texture `ruins_altar` | 104×52 ×0.62 | 418,256 | 386,224,64,32 | 418,248 (22) | south |
| `balance-crystal` | texture `crystal_balance` | 42×78 ×0.5 | 568,252 | 557.5,213,21,39 | 568,244 (22) | south |

Rooms, spawns, exits and beam waypoints:

- **tiền sảnh (composed stone floor; the `lobby-base` staging board is not used)**
  - spawns: `entrance-start` 100,268 · `entrance-from-corridor` 500,180 · `entrance-from-return-loop` 176,268
  - exits: `entrance-to-corridor` (door-a; trigger 604,180; inspect 520,180 → corridor / corridor-from-entrance) · `entrance-return-loop-to-observatory` (return-loop; trigger 36,220; inspect 140,220 → observatory / observatory-far-bank)
  - waypoints: `lantern-source` (entrance 188,176) · `door-a-eye` (entrance 604,168)
- **hành lang phòng sao (composed stone floor; the `star-chart-base` staging board is not used)**
  - spawns: `corridor-from-entrance` 152,180 · `corridor-from-observatory` 516,190
  - exits: `corridor-to-entrance` (door-a; trigger 36,180; latch 56,222 → entrance / entrance-from-corridor) · `corridor-to-observatory` (sun-door; trigger 604,220; inspect 512,220 → observatory / observatory-from-corridor)
  - waypoints: `g1` (corridor 240,190) · `lumo-tube-entry` (corridor 105,78) · `lumo-seal` (corridor 320,80)
- **phòng thiên văn (`observatory-clean-base`)**
  - spawns: `observatory-from-corridor` 128,200 · `observatory-near-bridge` 280,276 · `observatory-far-bank` 452,276
  - exits: `observatory-to-corridor` (sun-door; trigger 36,214; inspect 118,214 → corridor / corridor-from-observatory) · `observatory-return-loop-to-entrance` (return-loop; trigger 520,304; inspect 520,262 → entrance / entrance-from-return-loop)
  - waypoints: `g2` (observatory 168,226) · `sun-lock` (observatory 176,133) · `splitter` (observatory 240,220) · `root-branch` (observatory 362,226)

## Dynamic structures

| id | rect | state |
| --- | --- | --- |
| root bed | 340,152,44,148 | full-depth divider drawn by `buildObservatoryRootBed()`; both masses stay solid and are painted exactly on their colliders, and the southern mass occludes a body standing in the lane |
| root bridge lane | 340,202,44,48 | the only cut through the bed: solid until `bridgeEligible`; a span held under the body waits for a bank before retracting |
| final door head | 468,100,64,52 | solid until `finalDoorLatched` |
| `door-a-entrance` threshold | 536,156,104,48 | solid until the door-a opens or latches |
| `door-a-corridor` threshold | 24,156,104,48 | solid until the door-a opens or latches |
| `sun-door-corridor` threshold | 536,196,104,48 | solid until the sun-door opens or latches |
| `sun-door-observatory` threshold | 24,190,80,48 | solid until the sun-door opens or latches |
| `return-loop-entrance` threshold | 24,196,104,48 | solid until the return-loop opens or latches |
| `return-loop-observatory` threshold | 496,300,48,20 | solid until the return-loop opens or latches |

Ground stamps (painted floor decor, below the feet, never solid):

- entrance: `loop-path` 128,210,60,24 depth 2 · `source-ring` 156,214,64,34 depth 1
- corridor: `pipe-run` 73,74,215,18 depth 2 · `latch-grille` 28,236,56,28 depth 2
- observatory: `pipe-run` 344,60,264,18 depth 2 · `pipe-drop` 592,76,18,180 depth 2 · `loop-path` 472,266,96,32 depth 2 · `final-door-sill` 468,140,64,14 depth 2

Non-colliding art — wall-mounted modules, walkable floor art and the two latch plates painted on a door
sill: `lumo-tube`, `lumo-seal`, `learned-marks`, `final-door`, `door-a-control`, `final-door-control`. The root bed is solid and is not listed here (see Dynamic structures).

## Beam routing (pure, derived)

- Waypoints: `lantern-source` entrance 188,176 · `door-a-eye` entrance 604,168 · `g1` corridor 240,190 ·
  `lumo-tube-entry` corridor 105,78 · `lumo-seal` corridor 320,80 · `g2` observatory 168,226 ·
  `sun-lock` observatory 176,133 · `splitter` observatory 240,220 · `root-branch` observatory 362,226.
- Routes (mirror rotations required): `door-a` G0=0 → Door A eye · `g0-to-g1` G0=1 → tube → seal → G1 ·
  `g0-to-g2` G0=1,G1=2 → … → G2 · `g2-direct-sun` +G2=0 → Sun lock · `g2-split` +G2=1 → splitter, with the
  fixed branches `[sun-lock]` and `[root-branch]`.
- Every route past Door A also requires Lumo **physically** at the seal: his saved route must target and
  have reached `lumo-seal` while his live position is inside the seal radius (28px, which covers his
  authored resting hover 21.6px from the waypoint). A stale arrival flag cannot hold the seal.
- Statue facing: 0 narrow (no shadow), 1/3 partial, 2 wide (full shadow over the bed).

## State model

| state | rule |
| --- | --- |
| `doorAUnlocked` | live beam reaches the Door A eye, or `l8-door-a-latched` |
| `sunDoorUnlocked` | live beam reaches the Sun lock (direct route or splitter upper branch) |
| `rootBedShadowed` | split route live AND statue facing 2 |
| `bridgeEligible` | Sun lock lit AND bed shadowed AND Lumo at the seal |
| `bridgeCrossed` | durable: the body entered the lane with a live bridge and left on the far bank |
| `finalDoorLatched` | durable `l8-final-door-latched`, settable only from the far bank |
| `returnLoopOpen` | durable `l8-return-loop-open`, settable only from the far bank |
| completion | final door latched AND loop open AND lantern retrieved AND Lumo recalled AND record read AND crystal taken |

Durable door state keeps the level un-strandable: `l8-door-a-latched` holds Door A after G0 moves, and
the Sun Door latches the first time the Sun lock lights (`l8-sun-door-latched`, also implied by
`l8-bridge-crossed` / `l8-final-door-latched` / `l8-return-loop-open`), so turning the lantern off can
never lock Nhinh out of the corridor or in the observatory.

Derived values are recomputed from flags, mirror/statue rotations and Lumo's live position on every
load and after every change; they are never persisted.

## Prompts (RULE_GAMES audit)

| id | prompt while its condition is unmet |
| --- | --- |
| `lantern-pedestal` | E · Đặt đèn lên bệ |
| `g0` | E · Xoay G0 (nấc 0/3) |
| `learned-marks` | E · Xem lại các dấu đã học |
| `g1` | E · Xoay G1 (nấc 0/3) |
| `lumo-tube` | E · Gọi Lumo qua ống tới ấn |
| `lumo-seal` | E · Gọi Lumo tới ấn này |
| `door-a-control` | E · Kiểm tra chốt cửa A — Đặt đèn đang bật lên bệ đá trước. |
| `sun-door-control` | E · Kiểm tra cửa Mặt Trời — Đặt đèn lên bệ đá ở tiền sảnh trước. |
| `g2` | E · Xoay G2 (nấc 0/3) |
| `splitter` | E · Xem khung chia tia |
| `statue` | E · Xoay tượng (hướng 0/3) |
| `sun-lock` | E · Kiểm tra khóa Nhật |
| `root-bed` | E · Xem luống rễ — Khóa Nhật chưa sáng: cần tia sáng đi tới đó. |
| `final-door-control` | E · Chốt cửa cuối (qua cầu rễ trước) |
| `stone-return-loop` | E · Mở lối đá vòng — Phải qua cầu rễ sang bờ bên kia trước. |
| `final-record` | E · Đọc bản ghi cuối — Bản ghi chưa mở. Còn cần: mở lối đá vòng và gọi Lumo về bên đèn. |
| `balance-crystal` | E · Nhận Tinh thể Cân Bằng |

- Standing props answer from every side within 8px of their solid; flat ground mounts keep the south edge, or the documented side/gate
  exception; control radii stay 22..24 for the exceptions and the approach predicate.
- Transit circles are 28px, except the south sill pocket (16px): its centre (520,304) sits 26px from the nearest
  foot-body centre while the loop is shut, so the 16px circle keeps a 10px margin and still ends above y=320.
- Every locked door and disabled control states the unmet prerequisite in Vietnamese via
  `observatoryDoorBlockReason`, `observatoryBridgeBlockReason`, `observatoryRecordBlockReason` and
  `observatoryFinalDoorBlockReason`.
- The Door A latch plate is painted inside the alcove sill and only answers from the corridor side; the
  final-door plate only answers from the far bank, so neither can be reached through a wall.

## Guidance (objective / status / hints / journal)

`observatoryGuidance(roomId, state)` feeds the objective row, the status row, the Lumo badge and the
three-step H ladder; `J` lists the learned facts and, once read, the final record. Locked gates always
say what is still missing, and no HUD row asserts a live condition from history.

## Restore rules

Restores are resolved by `nearestSafeObservatorySpawn()` — the predicate the checks verify, so the
result is never inside a solid, never inside the root-bridge rectangle and never outside the room.

1. **Before the bridge** — the saved room's reachable stone spawn. Lantern position/power, mirrors,
   statue, Lumo route/arrival and both latches are kept; beam, roots and bridge are recomputed.
2. **Across the bridge, before the loop** — the far-bank stone `(452,276)`, or the near-bank stone
   `(280,276)` when the save was taken on the bridge itself. Final latch and loop control stay reachable.
3. **After the loop** — the saved room's stone spawn; the loop stays open and both the lantern and
   Lumo keep the state they were saved in.

`progress.roomId` ∈ {entrance, corridor, observatory} and `roomSpawn` inside 0..640 / 0..360 remain
validated by `CampaignSaveSystem` (save v1), and the `l8-lumo-*` fields keep their existing validation.

## Verification

- `node scripts/check-observatory.mjs` — per-stage collision-aware reachability, four-way blocking of
  every solid, art registration, control parity, scene wiring and save guards.
- `npm run build` — `tsc --noEmit` plus the Vite production build.
- Playtest is a manual step: no automated browser run is claimed here.

## Repair T10 — Shadow, placed light, sills, guidance, story

- The Shadow stands at ground (424,190) as a native 48x64 pose, with a solid footprint (410,174,28,16) on the far bank, north of the final record and clear of every stand and of the passage leaving the bridge. The Guardian of the memory stands at (466,190); the Shadow steps into that place during the record and walks back.
- A lamp parked on its pedestal is painted only in the `entrance` room (`observatoryPlacedLightVisible`); its logic (beam source at the pedestal) is unchanged. A carried lamp lights every room.
- The entrance and the corridor have no painted base. They are composed from `ground_stone` tiles, masonry from `OBSERVATORY_WALLS` and the real controls, so no fake G0, lamp, door or caption panel is printed under the room. The observatory keeps `observatory-clean-base`.
- Door thresholds are drawn as sills: wall-coloured while the door is shut, floor-coloured once open (`paintObservatorySill`). Jambs stay permanent masonry. `final-door-head` is one rectangle in both the pure model and the engine, solid until the final door is latched.
- Objective, status and prompts are room-aware and share `observatoryDoorOpen`: a latched Sun door reads "đã gài (giữ mở)" with the beam off; the final-door control reads "E · Trở về Cây Mẹ" only when `observatoryCompletionReady`, otherwise it names the first missing step.
- Opening (scenario section 2): beat one (three lines) in the entrance; beat two (four lines) the first time the corridor is entered, with Lumo really in the corridor hovering at the tube mouth. A free Lumo walks through doors with Nhinh; a called or sealing Lumo keeps his route and room.
- Conditional lines (section 4): the roots-lit pair plays once when the far door opens on the direct route; the no-beam line plays when a live, parked lamp stops reaching the seal while Lumo still holds it.
- Record (section 5): all sixteen spoken lines in three parts with a white flash, the merge of the two figures and a final silence; no line about the girl. Companion handoff: leaving for Level 10 clears the generic Lumo counters so Level 10 places him from its own entry.
- NOT_RUN: raster review of the composed entrance/corridor against the old boards, the sill art, and the white-flash/merge timing in WebGL (checked once in the Canvas renderer only).
