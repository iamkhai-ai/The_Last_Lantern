# Level 07 — The Sleeping Garden: spatial layout (authoritative spec)

Source: `docs/scenario/07-the-sleeping-garden.md`. Flow plan: `07-plan.md`. Runtime: `src/data/sleepingGardenLayout.ts` + `src/levels/SleepingGardenLevel.ts`.
Base art: `assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png`. Preview staging (`previews/01..08`) is illustrative; the rectangles below are authoritative and the check script validates them.

Conventions: 640×360, native scale, nearest filtering. Actor center coordinates; body = `center + (-7, +16, 14, 6)`, feet line `center + (0, 19)`. Standing prop anchors = art top-left. Depth: floor art 4–6, standing props `10 + groundAnchorY/10`, raised bar beam 70, actor `10 + (y+19)/10`, darkness overlay 30 (below HUD 82+).

## Zones (walkable floors)

| id | rect (x,y,w,h) | contents |
| --- | --- | --- |
| Z1 practice lawn | 28,266,276,82 | spawn (238,336), practice pots, teaching waterline, entry mouth (216,348,42,12) |
| Z2 forecourt | 218,186,86,64 | moon pot, O1 to Z1 (246,250,36,16), west bridge approach |
| Z3 terrace | 208,96,96,90 | sun flower, bar gate corridor zone above |
| gate corridor | 104,136,92,20 | shutter handle stand, west latch stand (only when bar raised) |
| Z4 west field | 28,156,164,62 | sluice approach, sun flower sightline |
| connector | 192,156,26,42 | Z4 ↔ Z2 above the tower |
| Z5 reservoir nook | 28,56,132,80 + 160,56,48,30 | reservoir, shutter handle arm |
| sluice crossing | 148,218,42,48 | permanent stone crossing of the horizontal canal |
| bridge strip | 304,228,92,20 | conditional: root bridge deck (west span 304..350, east span 347..396) |
| side strip | 304,284,92,28 | conditional: side stone path (closed by plank until `l6-return-latched`) |
| nursery | 364,96,160,196 | drain, sprout, east latch, delivered water |
| steps | 524,252,12,40 | nurseg ↔ walkway |
| walkway | 536,96,76,196 | route to the shrine gate |
| gate opening | 552,0,44,96 | exit trigger (574,64) r26 (arch exception, RULE_GAMES §3) |
| entry mouth | 216,348,42,12 | south entrance |

## Static solids (walls, structures, props)

| id | rect | note |
| --- | --- | --- |
| band-north-a/b | 0,0,552,56 · 596,0,44,56 | pond, railing, gate roof |
| band-west | 0,56,28,304 | dark woods |
| band-south | 0,348,216,12 · 258,348,382,12 | entry mouth carved at 216..258 |
| south-east-band | 304,312,336,48 | bushes/water below balustrade |
| east-band | 612,96,28,264 | east water |
| pond-railing | 208,56,328,40 | stone/flowers/trees band |
| gate-west-wall | 520,56,32,40 | arch side |
| gate-east-wall | 596,56,44,40 | arch side |
| wall-nw | 28,136,76,20 | west of bar gate |
| wall-nw-east | 196,136,12,20 | east of bar gate (to terrace edge) |
| platform-stone | 160,86,56,50 | stone L-platform in the nook |
| tower | 192,198,26,64 | sluice tower between lawn and forecourt |
| wall-lawn-north-west | 28,250,120,16 | canal south wall, west of sluice |
| wall-lawn-north-east-a/b | 218,250,28,16 · 282,250,22,16 | O1 opening between |
| wall-canal-north | 28,218,120,8 | canal north wall, west of sluice |
| wall-walkway-west | 524,96,12,156 | nursery ↔ walkway wall; steps opening below y252 |
| balu-south | 396,292,216,20 | nursery/walkway south balustrade |
| canal-west-wall | 304,96,8,132 · 304,248,8,36 · 304,312,8,36 | openings: bridge y228..248, side y284..312 |
| canal-east-wall | 356,96,8,132 · 356,248,8,36 · 356,312,8,36 | same openings |
| tree-trunk-sw | 40,296,24,24 | SW tree trunk under canopy |
| wall-lawn-south-west | 120,330,72,18 | wall + lantern west of the entry mouth |
| bar posts | 99,128,8,48 · 194,128,8,48 | full-silhouette solids, always |

## Dynamic solids

| id | rect | state |
| --- | --- | --- |
| bar beam | 106,150,88,12 | solid while the bar is lowered (no effective light and not held) |
| bridge gate | 304,228,92,20 | solid while the bridge is not walkable (coiled; or light-on with no foot on a span) |
| side plank | 304,288,92,20 | solid until `l6-return-latched` |

## Modules

| id | art (top-left, size) | solid | stand / behavior |
| --- | --- | --- | --- |
| reservoir | reservoir-open/closed 36,58 80×72 | full | glow when open; canopy closes permanently via handle |
| shutter handle | shutter-handle-open/closed 120,86 24×40 | full | stand (132,138) r22, corridor; `E · Kéo màn che bể tích quang`; once |
| sun (main) | sun-open/folded 196,124 48×72 | 200,152,40,44 | state follows effective light; icon at (208,198) |
| bar gate | gate-bar-lowered/raised/held 94,104 112×72 | posts + beam | lowered y150..162; raised/held beam overhead depth 70 |
| latch west | latch-west-unlatched/latched 128,96 28×32 | full | stand (142,144) r22, only inside the corridor and only when bar raised; `E · Gài chốt thanh chắn` |
| moon (main) | moon-coiled 252,206 48×44 · moon-extended 200,206 112×44 | full (coiled body) | extended reaches toward the canal; icon at (262,242) |
| root bridge | root-bridge-off/on/held 304,220 + 347,220 48×32 | dynamic strip | walkable when deployed; held spans stay under the feet |
| drain | nursery-drain-closed/open 436,224 52×48 | full | stand (462,286) r24; `E · Mở cống vườn ươm`; once |
| delivered water | nursery-water-delivered 466,262 128×24 | none (depth 4) | shown after drain; flows through the steps opening |
| sprout | sprout-before/after 484,232 32×32 | none | examine stand (500,280) r24; `E · Ngắm mầm cây` |
| side path | side-stone-path-closed/open 304,284 80×32 | dynamic strip | tiles always visible; plank blocks until latched |
| latch east | latch-east-unlatched/latched 400,240 28×32 | full | stand (414,286) r22; `E · Gài chốt lối đá phụ`; once |
| exit trigger | arch, no art | — | (574,64) r26; `E · Qua cổng điện thờ`; enabled on completion |
| practice sun pot | sun-open/folded 70,266 48×72 | 74,294,40,44 | lit-state demo; icon (84,314) |
| practice moon pot | moon-coiled/extended 132,284 48×44 | 136,290,40,38 | dark-state demo; icon (144,332) |
| teaching waterline | graphics 184,300,46,10 | none | "khe thử không cản lối đi" — walkable |
| teaching bridge | root-bridge-on 182,288 48×32 | none | appears with the first dark state, demo only |

## State model (pure, in `sleepingGardenLayout.ts`)

- `canopyOpen = !flags['l6-canopy-shut']`; `effectiveLight = canopyOpen || lanternOn`.
- `barRaised = effectiveLight || flags['l6-sun-latched']`; posts always solid; beam solid iff `!barRaised`.
- `rootsDeployed = !canopyOpen && !lanternOn`; bridge walkable iff `rootsDeployed` or (`!effectiveLight`… no: deployed) or a span is held under the player's body; spans `s1 (304,228,46,20)`, `s2 (347,228,48,20)`.
- held rule: when `lanternOn` turns true while the body overlaps a span, that span keeps its solid+held visual until the body leaves it; other span retracts. Turning the lantern off restores both.
- `sidePathOpen = flags['l6-return-latched']`; `drainOpen = flags['l6-water-flowing']`; `realized = flags['l6-lumo-realized']`.
- Crossing bookkeeping: entering the bridge strip records `l6-crossing-side` = west/east by body center (x<334); leaving at the far bank sets `l6-bridge-crossed`; clearing the strip deletes the side flag (legacy-compatible).
- `completionBlock`: canopy → bar(latch) → drain → side → scene; the exit needs all five.

## Prompt rules (RULE_GAMES audit)

- Every trigger sits at the south edge of its object (handle 12px below arm, latches 12–14px below body, drain 14px below, sprout 16px below). Radius 20–24. No trigger center sits inside its own art.
- West latch is additionally guarded to the gate corridor (`104 ≤ x ≤ 196`, `128 ≤ y ≤ 158`) so it can only be used after stepping through the raised gate; north/south approaches outside that band never prompt.
- The arch exit uses the documented gate exception (trigger under the arch, approached from inside the level).
- No trigger reaches the far (north) face of any object; verified by the check script with the 36×42 actor frame.

## Darkness and readability

- After `l6-canopy-shut`: overlay alpha ≈0.42 above floor art and props but below prompts/HUD; reservoir glow removed; lantern halo stays bright above the overlay so the dark puzzle remains readable. Plant state changes get a 120ms scale pulse so they read even in darkness.
- Icons are 16×16 state stickers (open/closed bloom, open/closed curl) drawn at depth 6 beside their pot, never over the actor.

## Restore rules

- Save `player-level/x/y`, `lumo-x/y` on the existing cadence.
- On load, rebuild state from flags, then place the player: if the saved center is unsafe (inside a solid/dynamic solid, on a canal without walkable crossing, or in a zone unreachable with current crossings/bar), use `nearestSafeSpawn` around the saved point, then around the stage default (238,336 → stage anchors (238,336), (150,300), (280,300), (440,280), (574,150), (574,64)).
- Legacy saves: old `l6-*` flags load as-is; plant visuals re-derive; unknown flags ignored; never write new fields outside the v1 save shape except the listed `l6-*` keys.
