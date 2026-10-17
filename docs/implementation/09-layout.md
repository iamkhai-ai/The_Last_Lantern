# Level 09 — The Dark Moon Observatory: spatial layout (authoritative spec)

Source: `docs/scenario/09-dark-moon-observatory.md`. Flow plan: `09-plan.md`. Runtime data: `src/data/observatoryRooms.ts` (legacy, to be hardened into `observatoryLayout.ts`) + `src/systems/ObservatoryPuzzle.ts`. Art: `assets/levels/09-dark-moon-observatory/sprites/{lobby,star-chart,observatory}-base.png`, `observatory-clean-base.png`, `learned-marks-miniature.png`, `star-chart.png`, `wheel-stopped-sun-among-stars.png`, plus shared mechanisms. Staging: `assets/levels/09-dark-moon-observatory/layout-and-restores.json` and `previews/01..10` (illustrative composites only; rectangles below are authoritative).

Conventions: 640×360 per room, native scale, nearest filtering. Actor center coordinates; body = `center + (-7, +16, 14, 6)`, feet line `center + (0, 19)`. Standing prop anchors = art top-left. Depth: floor art 4–6, standing props `10 + groundAnchorY/10`, beam graphics 7, latched door braces 12, memory overlay 95, actor `10 + (y+19)/10`, prompts 82, dialogue 95, HUD 86+. Darkness uses the shared LanternSystem overlay stack (darkness 68 / halo 69 / pulse 70 / vignette 71) driven by `lantern.isDawnMode` — no level-local overlay. HUD text occupies y=0..70 and y=320..360.

## Coordinate system and room model

Three independent 640×360 rooms: `entrance` (lobby), `corridor` (star-map corridor), `observatory`. Panorama x offset 0/640/1280 is a continuity aid only; runtime uses room-local coordinates plus `roomId`. Safe spawns per room (from `layout-and-restores.json`): lobby `(140,250)`, star-chart `(490,250)`, observatory far bank `(280,250)`.

## Zones (walkable floors)

### Room: entrance (lobby)
| id | rect (x,y,w,h) | contents |
| --- | --- | --- |
| lobby floor | 28,96,584,208 | main walkable floor |
| south band | 0,280,640,80 | approach to pedestal/door |
| entry mouth (from return loop) | 216,210,44,30 | spawn (238,224) when arriving from the loop |
| door-A approach | 520,150,120,90 | approach to Door A (east wall) |

### Room: corridor (star-map corridor)
| id | rect (x,y,w,h) | contents |
| --- | --- | --- |
| corridor floor | 28,96,584,208 | main walkable floor |
| tube alcove (north) | 80,56,60,60 | Lumo tube inlet at (105,78); stand (105,112) |
| seal alcove (north) | 296,56,60,60 | Lumo seal at (320,80); stand (320,112) |
| star-map table zone | 250,230,120,60 | table at (282,250); walkable around |

### Room: observatory
| id | rect (x,y,w,h) | contents |
| --- | --- | --- |
| near bank | 28,96,230,208 | G2, splitter, statue, Sun lock approach |
| root crossing | 0,230,150,30 (obs) / 545,230,95,30 (star) | bridge strip, walkable only while deployed/held |
| far bank | 262,230,338,80 | final door, loop control, record, crystal |
| west pillar niche | 60,16,60,70 | pillar at (74,28) |
| east pillar niche | 560,16,60,70 | pillar at (578,28) |

## Static solids (walls, structures, props)

### entrance
| id | rect | note |
| --- | --- | --- |
| band-north | 0,0,640,96 | top wall/border |
| band-south | 0,300,640,60 | bottom border (entry mouth carved) |
| band-west | 0,96,28,204 | left wall |
| band-east | 612,96,28,204 | right wall (Door A carved 554,173,618,261) |
| pillar-nw | 24,44,30,54 | top-left pillar |
| pillar-sw | 24,262,30,54 | bottom-left pillar |
| pedestal-base | 148,150,46,44 | solid furniture |
| door-A frame | 554,173,64,88 | solid until opened; becomes scenery after open |
| G0 base | 436,136,24,24 | solid prop (G0 mirror) |

### corridor
| id | rect | note |
| --- | --- | --- |
| band-north | 0,0,640,96 | top wall |
| band-south | 0,300,640,60 | bottom wall |
| band-west | 0,96,28,204 | left wall (Door A carved 8,247 entry) |
| band-east | 612,96,28,204 | right wall (Sun Door carved 590,150,50,60) |
| pillar-n | 180,22,34,48 | top pillar |
| pillar-s | 180,290,34,48 | bottom pillar |
| star-map table | 282,250,88,30 | solid furniture |
| G1 base | 223,126,24,20 | solid prop |
| Lumo tube (decor) | 90,64,30,30 | solid decor (tube inlet is the stand) |
| Lumo seal (decor) | 305,66,30,30 | solid decor |

### observatory
| id | rect | note |
| --- | --- | --- |
| band-north | 0,0,640,56 | top wall/roof |
| band-south | 0,312,640,48 | bottom border |
| band-west | 0,56,28,256 | left wall (Sun Door carved 0,150,50,60) |
| band-east | 612,56,28,256 | right wall |
| pillar-w | 74,28,34,48 | top-left pillar |
| pillar-e | 578,28,34,48 | top-right pillar |
| statue | 292,122,44,62 | solid; rotation changes shadow cone only |
| root bed (dynamic) | 330,220,132,54 | solid while roots up; walkable once bridged |
| G2 base | 132,108,24,20 | solid prop |
| splitter frame | 228,100,24,24 | solid prop (fixed splitter) |
| Sun lock | 508,84,24,24 | solid prop |
| final door frame | 185,174,64,88 | solid until opened |
| return-loop control | 540,270,24,24 | solid prop |
| record pedestal | 476,154,24,24 | solid prop |
| crystal pedestal | 562,152,24,24 | solid prop |

## Dynamic solids

| id | rect | state |
| --- | --- | --- |
| Door A (entrance↔corridor) | 554,173,64,88 | solid until `l8-door-a-latched` OR beam holds it open; after latch, scenery only |
| Sun Door (corridor↔observatory) | 590,150,50,60 (corridor) / 0,150,50,60 (observatory) | solid until `sunDoorUnlocked` (Sun lock lit) |
| root bed | 330,220,132,54 | solid while roots are up; once bridge eligible, the bed is shadowed and the bridge strip becomes walkable |
| root bridge (near side, star-chart) | 545,230,95,20 | walkable only while deployed or a span is held under the body |
| root bridge (far side, observatory) | 0,230,150,20 | same |
| final door | 185,174,64,88 | solid until `l8-final-door-latched` |
| return loop strip | per room, y=319, width ~88 | walkable only after `l8-return-loop-open` |

## Modules (art + stand + behavior)

### Room: entrance
| id | art (anchor) | solid | stand / behavior |
| --- | --- | --- | --- |
| room base | `lobby-base.png` 640×360 @ (0,0), depth 0 | — | painted room |
| learned-marks miniature | `learned-marks-miniature.png` 160×80 @ (320,150) center, depth 5 | none | E inspect; captions only; sets `l8-miniature-viewed` |
| pedestal | shared `source-empty/lit` 32×44 @ (170,166) top-left | pedestal-base | stand (170,202) r24; `E · Đặt đèn lên bệ` / `E · Thu hồi đèn`; lantern on/off state |
| G0 | shared mirror 32×40 @ (448,146) | G0 base | stand (448,184) r24; E cycles rotation 0/1/2/3; `E · Xoay G0` |
| Door A | shared latch/door art @ (560,142) | door frame | stand (555,190) r30; opens on beam hit; latch inside at (72,180) |

### Room: corridor
| id | art (anchor) | solid | stand / behavior |
| --- | --- | --- | --- |
| room base | `star-chart-base.png` 640×360 @ (0,0), depth 0 | — | painted room |
| star chart (wall) | `star-chart.png` 136×80 @ (320,162) center, depth 5 | none | decor |
| wheel (wall) | `wheel-stopped-sun-among-stars.png` 144×112 @ (500,128) center, depth 5 | none | decor; sun stopped among stars |
| G1 | shared mirror 32×40 @ (235,136) | G1 base | stand (235,176) r24; E cycles rotation; `E · Xoay G1` |
| Lumo tube inlet | decor @ (105,78) | tube decor | stand (105,112) r24; `E · Gọi Lumo qua ống` / `E · Gọi Lumo về` |
| Lumo seal | decor @ (320,80) | seal decor | no direct stand; Lumo holds it |
| Door A latch (inside) | shared latch-west @ (68,142) | none | stand (72,180) r24; `E · Gài chốt cửa A`; only when bar raised/door open |
| Sun Door | shared lock-sun @ (568,142) | door frame | stand (560,180) r24; opens on Sun lock lit |

### Room: observatory
| id | art (anchor) | solid | stand / behavior |
| --- | --- | --- | --- |
| room base (clean) | `observatory-clean-base.png` 640×360 @ (0,0), depth 0 | — | used while record unread |
| room base (memory) | `observatory-base.png` 640×360 @ (0,0), depth 0 | — | used once memory overlay is active (record + Shadow baked in) |
| G2 | shared mirror 32×40 @ (144,118) | G2 base | stand (144,158) r24; E cycles; `E · Xoay G2` |
| splitter frame | shared fixed-three-route-splitter @ (240,112) | frame | stand (240,158) r24; inspect only; `E · Xem khung chia tia` |
| statue | shared statue-notch 64×88 @ (292,122) | statue | stand (314,192) r24; E cycles facing 0..3; `E · Xoay tượng`; wide face (2) shadows roots |
| Sun lock | shared lock-sun @ (520,96) | lock | stand (520,132) r24; inspect; `E · Xem khóa Nhật` |
| root bed | graphics @ (330,220) 132×54 | dynamic | stand (396,288) r24; inspect; `E · Xem luống rễ` |
| root bridge | shared root-bridge on/off/held @ span centers (327,238)/(371.5,238) | dynamic strip | stand (398,326) r24; inspect; `E · Xem cầu rễ` |
| final door latch | shared latch-east @ (552,226) | door frame | stand (552,260) r24; `E · Gài chốt cửa cuối` |
| return-loop control | decor @ (552,282) | control | stand (520,316) r24; `E · Mở lối vòng` |
| final record | shared ruins_altar @ (488,166) | pedestal | stand (488,204) r24; `E · Đọc bản ghi` |
| Balance Crystal | shared crystal_balance @ (574,164) | pedestal | stand (574,204) r24; `E · Nhận Tinh thể Cân Bằng` |

## Beam routing (pure, derived)

Waypoints (room-local):
- `lantern-source` = entrance (170,154)
- `door-a-eye` = entrance (586,145)
- `g1` = corridor (235,136)
- `g2` = observatory (144,118)
- `sun-lock` = observatory (520,96)
- `splitter` = observatory (240,112)
- `root-branch` = observatory (396,244)
- `lumo-tube-entry` = corridor (105,78)
- `lumo-seal` = corridor (320,80)

Routes (mirror rotations required):
- `door-a`: G0=0 → lantern-source → door-a-eye (opens Door A).
- `g0-to-g1`: G0=1 → lantern-source → lumo-tube-entry → lumo-seal → g1 (requires Lumo at seal).
- `g0-to-g2`: G0=1, G1=2 → … → g2.
- `g2-direct-sun`: G0=1, G1=2, G2=0 → … → sun-lock (opens final door, lights root bed, no bridge).
- `g2-split`: G0=1, G1=2, G2=1 → … → splitter → branches: upper → sun-lock, middle → root-branch (via statue). Bridge eligible iff sun-lock lit AND statue facing 2 (root bed shadowed) AND Lumo at seal.

Statue facing convention: 0 = narrow (no shadow), 1/3 = partial, 2 = wide (full shadow over root bed). Only facing 2 shadows the full bed.

## State model (pure, in `observatoryLayout.ts`)

- `lanternOnPedestal = flags['l8-lantern-placed'] && !flags['l8-lantern-retrieved']`.
- `doorAOpen = lanternOnPedestal && G0===0` (beam) OR `flags['l8-door-a-latched']`.
- `lumoAtSeal = flags['l8-lumo-arrived'] && !flags['l8-lumo-recalled']`.
- `sunDoorUnlocked = (G0===1 && G1===2 && (G2===0 || (G2===1 && upper branch reaches)))` i.e. Sun lock lit.
- `rootBedShadowed = statueFacing === 2 && G2===1` (middle branch blocked by wide face).
- `bridgeEligible = sunDoorUnlocked && rootBedShadowed && lumoAtSeal`.
- `bridgeDeployed = bridgeEligible` (roots retract when eligibility lost, but spans held under the body wait).
- `bridgeWalkable(span, body)` = deployed OR held-span safety (body overlaps span while lantern turns on).
- `finalDoorOpen = sunDoorUnlocked` (G2=0 route also unlocks it) OR `flags['l8-final-door-latched']`.
- `returnLoopOpen = flags['l8-return-loop-open']`.
- `completionReady = finalDoorOpen && bridgeEligible && returnLoopOpen && lanternRetrieved && lumoRecalled && recordRead && crystalTaken`? No — completion (advance to Level 10) requires: final door latched, return loop open, lantern retrieved, Lumo recalled, record read, crystal taken. Bridge eligibility is needed to cross but not to finish (the loop provides backtracking).

Sanitize on load (legacy migration):
- `returnLoopOpen ⇒ finalDoorLatched`.
- `finalDoorLatched ⇒ sunDoorUnlocked` at some point, but do not force recompute if flags say latched (latch is permanent).
- `lumoRecalled ⇒ lumoAtSeal was true at some point`; on load, if `l8-lumo-recalled` is true, set `l8-lumo-arrived=false` (Lumo is back with Nhinh).
- `lanternRetrieved ⇒ lanternOnPedestal=false`.
- `bridgeCrossed ⇒ finalDoorLatched` not required, but if crossed, restore to far bank, not on bridge.
- Counters `l8-g0/g1/g2` clamped to 0..3; `l8-statue` clamped to 0..3.
- `l8-lumo-route-json` parsed as waypoint list; if invalid, drop to `[]` and reset index 0.
- `progress.roomId` must be one of entrance/corridor/observatory else reset to `entrance`; `roomSpawn` must exist in that room else use entrySpawnId.

## Prompt rules (RULE_GAMES audit)

- Every trigger sits at the south edge of its object with radius 22–30. No trigger center sits inside its own art.
- Door transitions use the documented gate/arch exception (trigger under the door, approached from inside the level).
- Latch controls are additionally guarded to the room side they belong to (Door A latch: only from inside the corridor; final door latch: only from the far bank) so they cannot be actuated through a wall.
- The miniature has no trigger inside its art; its stand is 16px below the miniature's bottom edge.
- No trigger reaches the far (north) face of any object; verified by the check script with the authored 14×6 body.

## Darkness and readability

- Lantern on the pedestal lights the beam network; the lantern's own glow stays bright above the overlay so the puzzle reads in the dark. Room bases are authored for the lit state; dimming uses the shared overlay (no level-local overlay).
- Icons are 16×16 state stickers drawn at depth 6 beside their prop, never over the actor.
- The memory overlay keeps the room visible underneath (transparent amber) at depth 95.

## Restore rules

Save `player-level/x/y`, `lumo-x/y` on the existing cadence. On load, rebuild state from flags, then place the player:
- If saved center is unsafe (inside a solid/dynamic solid, on a bridge strip without walkable bridge, or in a room unreachable with current doors), use `nearestSafeObservatorySpawn` around the saved point, then the stage anchors: lobby (140,250), star-chart (490,250), observatory far bank (280,250).
- Three documented restore cases:
  1. **Before root bridge** (not crossed): place on accessible stone in lobby or star-chart; bridge saves map to near-bank star-chart (490,250). Keep lamp position/on, G0–G2, statue, actual Lumo route/arrival and both latches. Recompute curtain/Sun/roots.
  2. **Across bridge, before loop**: place on observatory (280,250), outside threshold/bridge. Preserve even lamp off / Lumo released. Final latch and loop control reachable without power. Do not auto-restore light.
  3. **After loop**: place on the saved room's stone spawn. Loop stays open. Preserve lamp on hand/pedestal and Lumo at seal/returned. Continuous walking access to source and call regardless of power.
- If a save occurs while standing on the bridge, use the near-bank stone spawn instead of the bridge center.
- Legacy saves: old `l8-*` flags load as-is; visuals re-derive; unknown flags ignored; never write new fields outside the v1 save shape except the listed `l8-*` keys.
- Integration: `CampaignScene` owns the controller (`observatoryLevel`), level index 8 routes here, and the campaign gate now opens `ComingSoonScene` only from level ≥ 9 so level 09 is playable.
