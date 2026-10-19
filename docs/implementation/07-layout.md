# Level 07 — The Sleeping Garden: spatial layout (authoritative spec)

Source: `docs/scenario/07-the-sleeping-garden.md`. Flow plan: `07-plan.md`. Runtime: `src/data/sleepingGardenLayout.ts` + `src/levels/SleepingGardenLevel.ts`.
Base art: `assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png`. Preview staging (`previews/01..08`) is illustrative; the rectangles below are authoritative and the check script validates them.

Conventions: 640×360, native scale, nearest filtering. Actor center coordinates; body = `center + (-7, +16, 14, 6)`, feet line `center + (0, 19)`. Standing prop anchors = art top-left. **HUD bands:** the foot body must stay inside `y 58..320` (`GARDEN_HUD_BAND`; top panels end at 58, status row starts at 320), the same foot-body rule as RUINS_FLOOR and HEART_FLOOR. Centre bounds derive from it: `GARDEN_BOUNDS = { minX 14, maxX 626, minY 42, maxY 298 }` (body top 58, body bottom 320), and the bands are physical solids (`band-north-*`, `band-status`) so walking cannot enter them. Depth: floor art 4–6, standing props `10 + groundAnchorY/10`, raised bar beam 70, actor `10 + (y+19)/10`, prompts 82, dialogue 95, HUD 86+. Darkness uses the shared LanternSystem overlay stack (darkness 68 / halo 69 / pulse 70 / vignette 71) driven by `lantern.isDawnMode = !canopyShut` — no level-local overlay.

## Zones (walkable floors)

| id | rect (x,y,w,h) | contents |
| --- | --- | --- |
| Z1 practice lawn | 28,266,276,32 | spawn (238,298), practice pots, teaching waterline, entry mouth (216,298,42,22); the lawn ends at the lowest in-band centre y=298 |
| Z2 forecourt | 218,186,86,64 | moon pot at the top of the court, west bridge approach runs under it |
| Z3 terrace | 208,96,96,90 | sun flower, bar gate corridor zone above |
| gate corridor | 104,136,92,20 | shutter handle stand, west latch stand (only when bar raised) |
| Z4 west field | 28,156,164,62 | sluice approach, sun flower sightline |
| connector | 192,156,26,42 | Z4 ↔ Z2 above the tower |
| Z5 reservoir nook | 28,56,132,80 + 160,56,48,30 | reservoir, shutter handle arm |
| sluice crossing | 148,218,44,48 | permanent stone crossing of the horizontal canal |
| bridge strip | 304,228,92,20 | conditional: root bridge deck (west span 304..350, east span 347..396) |
| side strip | 304,284,92,24 | conditional: side stone path (closed by plank until `l6-return-latched`) |
| nursery | 364,96,160,196 | drain, sprout, east latch, delivered water |
| steps | 524,252,12,40 | nursery ↔ walkway |
| walkway | 536,96,76,196 | route to the shrine gate |
| gate opening | 552,58,44,38 | walkable below the top HUD band (y 58..96); exit trigger (574,64) r24 (arch exception, RULE_GAMES §3). The trigger centre is 6px below the band edge; its r24 circle reaches into the band, which is a trigger radius, not body placement |
| entry mouth | 216,298,42,22 | south entrance: the lowest in-band lawn strip above the status row (was 216,348,42,12, inside the status row) |

## Static solids (walls, structures, props)

| id | rect | note |
| --- | --- | --- |
| band-north-a/b | 0,0,552,58 · 596,0,44,58 | pond, railing, gate roof; the top HUD band (y<58) is solid |
| band-north-gate | 552,0,44,58 | closes the gate opening over the top HUD band; the arch is walkable from y=58 |
| band-status | 0,320,640,40 | the bottom HUD status row (y>=320) is solid; no art, the UI draws over it |
| band-west | 0,56,28,304 | dark woods |
| band-south | 0,348,216,12 · 258,348,382,12 | below band-status; no longer walkable (the entry mouth is at 298..320) |
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
| balu-south | 396,308,216,20 | nursery/walkway south balustrade |
| canal-west-wall | 304,96,8,132 · 304,248,8,36 · 304,312,8,36 | openings: bridge y228..248, side y284..308 |
| canal-east-wall | 356,96,8,132 · 356,248,8,36 · 356,312,8,36 | same openings |
| tree-trunk-sw | 40,296,24,24 | SW tree trunk under canopy |
| wall-lawn-south-west | 120,330,72,18 | wall + lantern west of the entry mouth |
| bar posts | 99,136,8,40 · 194,136,8,40 | full-silhouette solids, always |

## Dynamic solids

| id | rect | state |
| --- | --- | --- |
| bar beam | 107,136,87,26 | solid while the bar is lowered (no effective light and not held); ejected player lands at y112 (north) or y170 (south) |
| bridge gate | 304,228,92,20 | solid while the bridge is not walkable (coiled; or light-on with no foot on a span) |
| side plank | 304,284,80,32 | solid until `l6-return-latched` (matches the visible 80×32 plank exactly) |

## Modules

| id | art (top-left, size) | solid | stand / behavior |
| --- | --- | --- | --- |
| reservoir | reservoir-open/closed 36,58 80×72 | full | glow when open; canopy closes permanently via handle |
| shutter handle | shutter-handle-open/closed 120,86 24×40 | full | stand (132,132) r22, gap band; `E · Kéo màn che bể tích quang`; once |
| sun (main) | sun-open/folded 196,124 48×72 | 200,152,40,44 | state follows effective light; icon at (252,164) |
| bar gate | gate-bar-lowered/raised/held 94,104 112×72 | posts + beam | beam solid 107,136,87,26 while lowered; raised/held beam overhead depth 70 |
| latch west | latch-west-unlatched/latched 128,96 28×32 | full | stand (142,132) r22, only inside the gap band and only when bar raised; `E · Gài chốt thanh chắn` |
| moon (main) | moon-coiled 252,186 48×44 · moon-extended 200,186 112×44 | full (coiled body) | sits at the top of the forecourt; extended reaches toward the canal; icon at (250,240); the 20px band under it is the west bridge approach |
| root bridge | root-bridge-off/on/held, two images at span centers (327,238) · (371.5,238) | dynamic strip | walkable when deployed; held spans stay under the feet |
| drain | nursery-drain-closed/open 436,224 52×48 | full | stand (462,286) r24; `E · Mở cống vườn ươm`; once |
| delivered water | nursery-water-delivered 466,262 128×24 | none (depth 4) | shown after drain; flows through the steps opening |
| sprout | sprout-before/after 484,232 32×32 | none | examine stand (500,280) r24; `E · Ngắm mầm cây` |
| side path | side-stone-path-closed/open 304,284 **80×32 native** | dynamic strip 304,284,80,32 | tiles always visible; the plank blocks only where it is drawn (walkable strip stays 304..396 until `l6-return-latched`) |
| latch east | latch-east-unlatched/latched 400,240 28×32 | full | stand (414,286) r22; `E · Gài chốt lối đá phụ`; once |
| exit trigger | arch, no art | — | (574,64) r24; `E · Qua cổng điện thờ`; enabled on completion |
| practice sun pot | sun-open/folded 70,266 48×72 | 74,294,40,44 | lit-state demo; icon (126,275) |
| practice moon pot | moon-coiled/extended 132,284 48×44 | 136,290,40,38 | dark-state demo; icon (160,274) |
| teaching waterline | graphics y306, runs 186..202 · 208..224 + spark | none | "khe thử không cản lối đi" — walkable |
| teaching bridge | root-bridge-on 182,288 48×32 | none | appears with the first dark state, demo only |

## Draw order & occlusion

Depth = `10 + groundAnchorY/10` for standing props and actor feet; ground stamps are 0..7; the raised bar beam is overhead at 70; effects 68..71; prompts 82; dialogue 95; HUD 86+. Sorted explicitly:

- **Ground stamps (0..7, always below feet):** base scenic image (0), teaching waterline + delivered-water chevrons (4–5), root-bridge deck + side-stone-path tiles while not solid (4), state icons (6).
- **Standing props (10 + groundY/10):** reservoir, shutter handle, bar posts, both latches, both Moon Root pots, both Sun Flower pots, drain, tower, tree trunk, quiet platform. The player y-sorts against every one of them: standing north of a prop draws behind it, walking south past its ground anchor draws in front.
- **Overhead (70):** the raised/held bar beam only, so the player walks under the doorway and is never wrongly hidden by it. Lowered, the beam drops to `10 + groundY/10` and is solid.
- **Occludes the player:** bar posts (99..107 / 194..202 × y136..176), tower (192..218 × y198..262), tree trunk (40..64 × y296..320), walls, balustrades and canal side-walls — each only above its own painted footprint; no blanket depth raise and no canopy replaces a trunk collider.
- **Never occludes / walkable ground:** waterline, delivered water, icons, the sprout, bridge deck and side-path tiles (flat art), the gate header (kept above the traversable doorway).

## Solid blockers vs walkable ground

- **Solid (blocks the 14×6 foot body from all four sides):** every rect in `GARDEN_STATIC_SOLIDS` with visible art — bar posts, reservoir, shutter handle, sun flower body, both latches, moon pot body, drain, tower, tree trunk, quiet platform, both practice pots, plus walls/bands/balustrades/canal side-walls. Water rects (`GARDEN_WATER`) are lethal. Checked 4-directionally by `check-sleeping-garden.mjs`.
- **Dynamic solids:** the lowered bar beam, the retracted bridge spans, and the closed side plank — solid only while their live condition is unmet.
- **Walkable ground (no collider):** practice lawn/forecourt/terrace/walkway/nursery zones, gate corridor, sluice crossing, entry mouth, teaching waterline, delivered-water chevrons, sprout, icons, gate opening, and the bridge/side strips once their condition is met.
- **Every solid footprint has matching visible art**, except the two HUD band solids (`band-north-*`, `band-status`): they stand for the UI bands, which have no scenic art, and they are the physical enforcement of the 58..320 foot-body rule. `check-sleeping-garden.mjs` sweeps every 1px centre whose body would enter a band and asserts a solid blocks it.

## State model (pure, in `sleepingGardenLayout.ts`)

- `canopyShut = flags['l6-canopy-shut']`; `effectiveLight = !canopyShut || lanternOn`.
- `barRaised = effectiveLight || flags['l6-sun-latched']`; posts always solid; beam solid iff `!barRaised`.
- `rootsDeployed = canopyShut && !lanternOn`; bridge walkable iff `rootsDeployed` or a span is held under the player's body; spans `s1 (304,228,46,20)`, `s2 (347,228,49,20)`.
- held rule: when `lanternOn` turns true while the body overlaps a span, that span keeps its solid+held visual until the body leaves it; other span retracts. Turning the lantern off restores both. A one-shot beat (`l6-held-beat`) fires on the first lantern-on→off while roots are still holding and the player is off the bridge.
- `sidePathOpen = flags['l6-return-latched']`; `drainOpen = flags['l6-water-flowing']`; `realized = flags['l6-lumo-realized']`.
- Sanitize on load: `returnLatched ⇒ waterFlowing`; `waterFlowing && returnLatched ⇒ bridgeCrossed`; `sunLatched || returnLatched ⇒ canopyShut`; `crossingSide` is dropped unless `bridgeCrossed`. Compat: `l6-sun-open` / `l6-moon-open` are still written for older readers.
- Crossing bookkeeping: entering the bridge strip records `l6-crossing-side` = west/east by body center (x<334); leaving at the far bank sets `l6-bridge-crossed`; clearing the strip deletes the side flag (legacy-compatible).
- `completionBlock`: canopy → bar(latch) → drain → side → scene; `gardenExitReady = completionBlock === null` gates the shrine arch. The archive never advances until every committed state is present, and the locked prompt names the missing step.

## Prompt rules (RULE_GAMES audit)

- Every trigger sits at the south edge of its object (handle 6px below the body, latches 4–14px below, drain 14px below, sprout 16px below). Radius 20–24. No trigger center sits inside its own art.
- The handle/latch pair sits north of the wall gap, so both are worked from the gap band (player centers `104 ≤ x ≤ 196`, `100 ≤ y ≤ 136`): the documented stands are (132,132) and (142,132) and the live guards (`gardenHandleEnabled` / `gardenLatchWestEnabled`) are mutually exclusive, so the two overlapping 22px circles can never fight for the nearest target. The corridor's south band (`y 136..156`) never prompts.
- The arch exit uses the documented gate exception (trigger under the arch, approached from inside the level).
- No trigger reaches the far (north) face of any object; verified by the check script with the authored 14×6 body.

## Darkness and readability

- After `l6-canopy-shut`: `lantern.isDawnMode = false`, so the shared LanternSystem overlay dims the room (no level-local overlay); reservoir glow removed; the lantern halo stays bright above the overlay so the dark puzzle remains readable. Plant state changes get a 120ms scale pulse (1.12) so they read even in darkness.
- Icons are 16×16 state stickers drawn at depth 6 on open floor beside their pot, never over the actor, never under their own pot art (including the 112px extended Moon Root art) and never inside the bottom HUD strip `y ≥ 320`: sun-main (252,164), moon-main (250,240), practice sun (126,275), practice moon (160,274). The check script asserts all four conditions from the module table.

## Restore rules

- Save `player-level/x/y`, `lumo-x/y` on the existing cadence.
- On load, rebuild state from flags, then place the player: if the saved center is unsafe (inside a solid/dynamic solid, on a canal without walkable crossing, or in a zone unreachable with current crossings/bar), use `nearestSafeGardenSpawn` around the saved point, then the stage anchors (238,298), (200,298), (258,298), (440,282), (576,150), (574,64).
- **Reachability is part of "safe".** A collision-free point can still be sealed behind an unsolved crossing — a legacy save inside the nursery/walkway/arch while the garden is still lit would strand the player east of the canal with the shutter handle unreachable and the level unwinnable. `nearestSafeGardenSpawn` therefore accepts a candidate only when it is collision-free *and* belongs to `gardenReachableRegion` (the shared 4px collision-aware flood-fill from the entry, `GARDEN_REACH_ORIGIN` 14,42, which is `GARDEN_BOUNDS` minX/minY). The entry (238,298) is walkable in every state, so the fallback is always the west lawn; the anchor list is only reached when the saved point is unusable.
- The spawn itself is (238,298). The foot body is 314..320, the lowest centre that keeps the body above the shared bottom HUD strip (`statusText` y320, controls bar y344). The earlier (238,300) put the body at 316..322, inside the status row, and (238,336) put the actor behind two panels. Walking south from the spawn now stops at y=298 (solid `band-status` below), not y=348.
- Legacy saves: old `l6-*` flags load as-is; plant visuals re-derive; unknown flags ignored; never write new fields outside the v1 save shape except the listed `l6-*` keys.
- Integration: `CampaignScene` owns the controller (`gardenLevel`), level index 6 routes here, and the playtest gate still reads `if (this.progress.level >= 4 && this.progress.level !== 6) start('ComingSoonScene')` — index 6 is playable, every other unfinished index keeps the coming-soon screen (reconciled at integration where 05/06 add their own index to the same line).

## Repair T08 — lesson, gap art, bar depth, silhouette

- Practice lesson (`PRACTICE_OBSERVED`): the first light change in either direction after the canopy is shut arms it (`practiceLessonArmed`). It plays only while the player stands in `GARDEN_OBSERVATION_ZONE` (the south lawn, zone `z1-lawn`, where the pots can be read); otherwise it waits and plays when the player next walks through the lawn. The `l6-practice-observed` flag is written when the beat plays, so a reload after the beat never repeats it and a reload before it re-arms on the next toggle. Before the lesson the objective only points at observing the two pots.
- H follows the scenario's three levels for every stage and gains a `story` stage (return latched, Lumo not yet realized): objective and H send the player to the sprout to talk to Lumo. The story gate stays part of completion (decision D3).
- Locked controls answer E with a specific reason instead of going silent: the west stone latch while the bar is down (switch the lantern on first) and the east latch before the water flows (open the drain first). Neither can steal a neighbouring live control: the west inspection exists only while the handle is disabled and the latch itself is not live.
- Retracted bridge: the 92px gap keeps its solid; each span now draws `root-bridge-off` (curled root) plus `root-bridge-missing` (bank edge marks) so the gap reads as a gap. Held/deployed spans hide the marks.
- Gate bar: the 112x72 sprite is split. Raised or held, only rows 0..29 (the beam) are drawn at depth 70; the two posts are cropped copies sorted by their feet (y=176, depth 27.6) so Nhinh is not painted over a post. Lowered, the whole sprite sorts by its feet as before.
- Status row: on this level the status text wraps at 470px (two rows at most inside y320..360) so it can no longer run under the right-hand `H · Gợi ý` hint.
- Ending (§7): the old four lines that named Lumo's "other half" are replaced by the scenario's four lines. A Shadow silhouette (registered poses `walk-right`, `shielding`, native 48x64) appears at the shrine gate, walks to the seedlings, stops, goes back and fades by the gate pillar, then the lines play and the level changes. There is no statue art in this room; the fade at the gate pillar stands in for "behind the statue". Waypoints are `GARDEN_SHADOW_PATH` and are asserted to be open floor in the solved state.
- Ending hand-off: `finish()` only marks the ENDING pending; `update()` calls `nextLevel` once `canStartStory()` is true (no dialogue, pause menu closed). While the pause menu is open (`isPaused`) the running silhouette tween or stop timer is paused and resumes on close; an open dialogue does not freeze it.
- Drain: the nursery scene only describes what is visible (water, the new leaf); it does not reset a folded sunflower. Pot bases under the HUD were not raised: NOT_RUN, no render evidence that meaning is lost.
- NOT_RUN: browser/visual check of bar front/back, bridge retracted/extended, nursery status row and the silhouette beat.
