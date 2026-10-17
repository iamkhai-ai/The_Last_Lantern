# Level 09 — Dark Moon Observatory: completion + review report

Worktree: `D:\Z_PROJECT\The_Last_Lantern\the-last-lantern-level09`
Branch: `codex/level-09-spatial-rebuild`
Scope: campaign index 8 only (`progress.level === 8`, prefix `l8-`). No other level was touched, nothing was pushed.

## What this revision did

The previous session stopped mid-integration: the runtime `CampaignScene` had never been wired to the
new pure layout and `tsc` had never been run against the merged tree. This revision repairs the build,
wires the runtime to the verified layout, fixes the flow and art defects found by review, and expands
`scripts/check-observatory.mjs` so the same class of defect cannot come back silently.

## Defects found and fixed

| # | Defect | Evidence | Fix |
| --- | --- | --- | --- |
| 1 | `tsc` failed: `walls.lineStyle(1, 0x12friendly as unknown as number, 0)` is not valid syntax (a leftover hack line) | `npm run build` → TS1005 | line removed; the wall outline uses a real colour |
| 2 | `tsc` failed: `this.observatoryBridgeBounds` and `this.observatoryRootBody` were used but never declared | `npx tsc --noEmit` | both declared from `OBSERVATORY_BRIDGE_LANE` |
| 3 | `refreshObservatoryDoors()` dereferenced a `null` body every frame for alcove entries → guaranteed runtime crash on the first update of the level | `buildObservatoryDoors` stored `body: null as unknown as StaticBody` | arch art is now scenery in `observatoryAlcoveVisuals`; only real door bodies are toggled |
| 4 | Door thresholds were built once and never synchronised, so an opened door stayed solid for the whole level: no door could be walked through | `syncObservatorySolids()` existed but was never called | colliders are built for the "all doors shut" state and synchronised at build, on every door refresh and every frame |
| 5 | The Door A latch control was never registered: `door-a-control` was missing from the corridor interactable list, so the mandated latch step was unreachable | type error on the dead branch + missing list entry | added to `ObservatoryInteractableId` and to the corridor interactables |
| 6 | Lumo's seal read as **not** held while he visibly held it: he comes to rest 21.6px from the waypoint, the seal radius was 20px | `updateObservatoryLumo` hover offset `(-18, +12)` | seal radius 28px, documented at the constant |
| 7 | The final-door latch plate pointed at a level-index-7 file that does not exist, so the plate silently drew nothing | new art check | points at the creek mechanism pack (`04-…/sprites/mechanisms/latch-east-unlatched.png`), which is registered |
| 8 | All observatory prompts were English (`E · Rotate G0…`, `E · Door is locked`) and every trigger used a flat 34px radius with no approach rule | code review vs `RULE_GAMES.md` 1 | prompts come from `observatoryPrompt()` in Vietnamese; radius comes from the authored 22–24px value; `isObservatoryApproachAllowed` / `isObservatoryGateApproachAllowed` gate every trigger to its authored side |
| 9 | Locked doors only said "locked"; the missing prerequisite was never shown at the locked inspect points | `observatoryDoorBlockReason` was imported but unused | every alcove has a room-facing inspect control that always names the missing condition, and the refusal dialogue repeats it |
| 10 | Turning the lantern off could strand Nhinh: `transitionObservatory` only honoured the *live* Sun lock, so the Sun Door re-closed behind her | code review | door state now comes from `observatoryDoorOpen()`; the Sun Door latches the first time the Sun lock lights (`l8-sun-door-latched`, also implied by crossing/latching the loop) |
| 11 | The lobby and corridor never painted their authored bases (`getLevelBackgroundKey(8, roomId)` returned `null` for both) | code review | `lobby-base` / `star-chart-base` are now mapped; the observatory always uses `observatory-clean-base`, and the hand-off base is refused by an explicit check |
| 12 | The root bed's solid had no art (element art `root-bed` is not a texture) and its collider was invisible; the reused splitter / moon-lock / sanctuary-door frames were referenced through a level folder that has no such files | art check | the bed is drawn procedurally on exactly its colliders (with the southern mass occluding a body in the lane), and the level-08 mechanism files are registered in `CampaignArt.ts` |
| 13 | The star-map table was drawn as furniture but had no collider (`radius > 0` was used as the "is solid" proxy) | art/collider parity review | `observatoryElementSolids()` now derives solids from standing props, so the table blocks like its art |
| 14 | The root-bed inspection stand was on the far bank only, so the reason the roots would not close was unreadable before crossing | new flow check | stand moved to the near-bank face (330,252) |
| 15 | The practice miniature, the level's own journal and the objective/status/HUD rows were never wired (`observatoryGuidance` imported but unused; status fell through to the generic "Đèn: BẬT · Lumo: đang đi cùng") | code review | HUD, objective, hint ladder, journal and the miniature captions all come from `observatoryGuidance()` / scenario §3 |
| 16 | The final memory beat had no visual: the room never showed the translucent amber memory layer and The Shadow never appeared beside the record | scenario §5 vs code | the Shadow's shared frames are registered, he waits beside the record, the memory layer plays over the visible room at depth 94 |
| 17 | `l8-lantern-retrieved` was never written (completion depended on transient in-hand state) | code review | the flag is written on retrieve/place and read through the world state |
| 18 | An undocumented extra control (`observatory-lumo-call-point`) sat 48px beside the pedestal, outside the authored layout | wiring check | removed; recall stays on the tube inlet / seal, reachable through the opened loop |
| 19 | Unassigned Lumo never followed Nhinh in this level | campaign contract "Lumo follows while unassigned" | he follows inside the active room whenever he is unassigned |

## Verification (all commands run from the worktree root)

| check | result |
| --- | --- |
| `npx tsc --noEmit` | PASS (was: 4 + a syntax cascade of errors) |
| `npm run build` | PASS (`tsc --noEmit && vite build`, 517 modules, ~10.1 MB single file) |
| `node scripts/check-observatory.mjs` | PASS — 3 rooms, 19 elements, 6 alcoves, 8 stages, 9 flow steps |
| `git diff --check` | clean |
| `node scripts/check-campaign-start-intent.mjs` | PASS (unchanged) |
| `node scripts/check-forest-edge.mjs` | PASS (unchanged) |
| `node scripts/check-interaction-prompt-layout.mjs` | PASS (unchanged) |
| `node scripts/check-path-for-two.mjs` | PASS (unchanged) |
| `node scripts/check-shattered-creek.mjs` | PASS (unchanged) |
| `node scripts/check-whispering-woods.mjs` | PASS (unchanged) |
| browser playthrough | NOT_RUN — no browser automation is installed in this environment; the level-09 review is static + pure-geometry only |

`scripts/check-observatory.mjs` now covers: the authored foot body contract; art fit and aspect ratio; a
stand at the allowed approach side for every element; every collider matching its drawn footprint;
**every** solid blocking the 14×6 foot body from all four cardinal directions in two stages; collision-aware
reachability of every spawn, stand and exit per stage; locked exits unreachable at the transit trigger while
their inspect control still answers; the far bank sealed until the bridge holds; all beam routes including the
split-with-shadow case and the "stale arrival cannot hold the seal" case; the full restore grid (every 8px
point of every room in every stage must land on safe floor, never on the bridge, never in a solid);
locked-door prerequisites; control separation; stamp bounds; **every collider mapping to an existing PNG that
`CampaignArt.ts` actually registers**; room bases registered and the hand-off base refused; **every authored
control registered and every registration authored**; scene wiring symbols; Vietnamese-only prompts; the v1
save guards; and a 9-step authored flow trace from spawn to crystal with early-completion gating.

## Documentation

`docs/implementation/09-layout.md` is now **generated** from the runtime data by
`scripts/gen-observatory-layout-doc.mjs` (`node scripts/gen-observatory-layout-doc.mjs`). The previous
revision's coordinate tables were stale (they still described the pre-rebuild layout), which is exactly the
drift the generator removes.

## Remaining limits / not done

- No browser playthrough: room transitions, animation, prompt placement on screen and save/reload were not
  executed in a real client. Everything above is static analysis plus pure-geometry/state simulation.
- The return-loop sill pocket in the observatory is at y≈300..334, so a body standing in it overlaps the
  bottom HUD *band*; the HUD is drawn at depth 86 above the actor, so nothing covers the HUD, but the actor's
  feet are partially hidden behind the status row while standing on the trigger.
- `roomDoors` is now unused (door collision comes from the alcove sills); it is left in place to keep the
  diff reviewable.
- `OBSERVATORY_ELEMENTS` still describes the root bed with `art: { kind: 'texture', key: 'root-bed' }` even
  though the scene draws it procedurally; the resolver treats it as art-free by id.
- Level 09's `observatory-base.png` (the hand-off base) is intentionally never loaded, so the "memory" version
  of the room is achieved with the clean base plus the translucent overlay rather than a baked backdrop.
