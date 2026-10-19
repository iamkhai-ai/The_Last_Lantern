# Level 07 — The Sleeping Garden: implementation report

Branch `codex/level-07-spatial-rebuild`. Scenario 07 = campaign index 6. Layout spec: `07-layout.md`; flow plan: `07-plan.md`. Runtime: `src/data/sleepingGardenLayout.ts` (pure geometry/state) + `src/levels/SleepingGardenLevel.ts` (focused controller) + `scripts/check-sleeping-garden.mjs` (pure check script), matching the level-05 pattern.

This revision is a **review + repair pass** over the shipped level (previous HEAD `ccc3a72`, this revision adds the fixes below). Nothing was pushed; all work is local on this branch.

## What was delivered

### Player flow (spawn → exit)

1. **Spawn** `(238,298)` on the south practice lawn (its foot body spans y314..320, above the shared bottom HUD status band at y320; the earlier `(238,300)` put the body inside the status row; the original `(238,336)` placed the actor behind the status line *and* the controls bar — see the review findings), walking in from the entry mouth `(216,298,42,22)`; Lumo follows. Opening dialogue = scenario §2 text (4 lines).
2. **Safe teaching area** — the two practice pots are beside the spawn (Sun Flower `70,266`, Moon Root `132,284`) with state-blossom/curl stickers, so the two-plant rule is learned in a walled corner that never blocks the route (the 22px test gap admits the 14px foot body, and both pot rows leave the lawn passable). The teaching waterline (walkable) shows the "khe thử không cản lối đi" idea.
3. **Clue / first fixed control** — the shutter handle `stand (132,132)` in the west wall gap. `E` closes the reservoir canopy over the garden, the room darkens (`lantern.isDawnMode = false`) and the bar lowers. Two-line beat. The first lantern toggle after that plays the 4-line practice observation and pulses the pots.
4. **Main puzzle** — with the lantern ON the Sun Flower opens and raises the bar; walk north through the gap (posts `99,136` / `194,136`), then `E` at the west latch `stand (142,132)` holds the bar (`l6-sun-latched`). Turn the lantern OFF: Moon Root extends and the root bridge spans the vertical canal (`s1 304..350`, `s2 347..396`, y228..248). Cross in the dark.
5. **Reward / story beat** — `E` at the drain `stand (462,286)` sends water around the sprout, one leaf opens and the 7-line nursery scene sets `l6-lumo-realized`. The distant Sun Flower visibly folds.
6. **Return & exit** — `E` at the east latch `stand (414,286)` opens the light-independent side stone path (`l6-return-latched`). Optional sprout re-read at `stand (500,280)` (which also satisfies the "talk to Lumo by the sprout" objective row if the queued scene was missed). Then leave the nursery east, up the steps into the walkway and north to the shrine gate; when every state holds, `E` under the arch `stand (574,64)` plays the shadow ending and advances to Level 08.

Order recovery, no time pressure: flipping the lantern ON while on the bridge keeps only the span under the feet (held overlay) and lets the player finish the crossing to a bank; turning it OFF restores the full bridge. The first retract-before-crossing plays a 3-line cue once. Being inside the beam when it drops ejects the actor to the north or south side and both landings stay connected (the north nook pocket reopens as soon as the lantern is switched back on — asserted in the check script).

### Object collision model

- **Solid blockers (block the 14×6 foot body from all four cardinal directions; each has matching visible art):** bar posts, reservoir, shutter handle, Sun Flower body, both latches, Moon Root body, drain, tower, tree trunk, quiet platform, both practice pots, plus all walls/bands/balustrades/canal side-walls. Arena water rects are lethal, not walk-through.
- **Dynamic solids (solid only while their live condition is unmet):** the lowered bar beam `107,136,87,26`; the retracted bridge spans; the closed side plank `304,284,80,32` (exactly the native plank art, so no invisible blocker is left at the strip's east end).
- **Walkable ground (no collider):** every authored zone, the teaching waterline, delivered-water chevrons, the sprout, state icons, the gate opening, and the bridge/side strips **once** their condition is met.
- Every stand sits at the object's **south (front) edge** per `RULE_GAMES.md`, radius 22–24, with the handle/latch pair additionally guarded to the gap band (`inGateCorridor`) — their two live guards are mutually exclusive, so the overlapping 22px circles can never fight for the nearest target. The arch exit uses the documented gate exception. `InteractionSystem.tryInteract` re-validates the enabled state and the radius at E (lines 90–102), so nothing fires stale.
- Occlusion: standing props sort by base (`10 + groundY/10`) and the actor uses the same formula (`10 + (y+19)/10`, `Player.updateGroundDepth`), so the y-sort is exact; the raised/held bar beam is overhead (70); ground stamps stay below feet.

### Readable guidance

- `getObjectiveText()` states the immediate physical action per stage (see the "Guidance per step" table in `07-plan.md`), and `CampaignScene.refreshHud` now actually shows `getStatusText()` for index 6 (it used to overwrite it with the generic `Đèn: BẬT …` row).
- H walks a plain 3-rung ladder per stage (observe → relation → next step) following scenario §6, with the two special cases (handle first before the canopy is shut; side path + gate after the drain).
- Prompts are action-first Vietnamese. The exit never disappears: while locked it reads `Cổng điện thờ đang khép · chăm khu vườn trước` and E names the specific missing step.
- J journal records the three learned facts; the 1.12× pot pulse and state stickers read in the dark (the stickers are now clear of their own pot art and of the bottom HUD strip).

## Review pass: defects found and repaired

| # | defect (evidence) | repair |
| --- | --- | --- |
| 1 | **Restore could strand the player (unwinnable).** `nearestSafeGardenSpawn` only checked solids/bounds, so a legacy save inside the nursery — e.g. `(450,280)` or the walkway/arch — was returned verbatim while the garden was still lit. With both crossings closed and the canopy open the roots never deploy, so the player was sealed east of the canal with no way back to the shutter handle. The report's old claim "96 stale-save spawn resolutions never land … past an unsolved gate" was not backed by the code. | Resolution now requires a candidate to be collision-free **and** inside `gardenReachableRegion` (a shared 4px collision-aware flood-fill from the entry); `gardenReachableRegion`/`gardenRegionReaches`/`gardenPointReachable` live in the layout module and the check script consumes the same implementation. Sealed saves now fall back to the lawn. |
| 2 | **State stickers were invisible.** Measured against the real PNGs: the moon-main sticker (262,212) was 92–97 % covered by its own pot art, practice-sun (84,316) 71 %; practice-moon (146,334) sat entirely inside the `y ≥ 320` HUD strip (behind the status line *and* the controls bar). The dark-mode, colour-independent state read the scenario asks for (`§3 "Biểu tượng nở/khép trên chậu"`) did not exist on screen. | Stickers moved to measured open floor: sun-main (252,164), moon-main (250,240), practice sun (126,275), practice moon (160,274). The script now asserts, from the module table, 0px overlap with every variant art box (including the 112px extended root), `y < 320`, `y > 58`, and no overlap with any solid/water footprint. |
| 3 | **Invisible blocker at the side crossing.** The plank solid was `304,284,92,24` while the plank art is a native 80×32 → the eastern 12px of the blocked strip had no visible art, and the doc claimed a 92×24 art box. | `GARDEN_SIDE_PATH` is the native `304,284,80,32` (`GARDEN_SIDE_STRIP` keeps the 92×24 walkable strip). The banks stay separated: the script proves the east landing is unreachable while the plank is closed. |
| 4 | **Documented stands were not the operable ones.** The handle/latch stands (132,138)/(142,144) lie in the gap's south band, which their own `inGateCorridor` guard (`100 ≤ y ≤ 136`) excludes — pressing at the documented stand point showed no prompt; the usable arc was a 14×14 pocket. | Stands moved to (132,132)/(142,132) (inside the guard, at the gap's north band), and the live guards moved into the pure layout (`gardenHandleEnabled`, `gardenLatchWestEnabled`, `gardenDrainEnabled`, `gardenLatchEastEnabled`) so the controller and the script share one definition and the script can prove the two stands are never enabled together. |
| 5 | **The level's status line never rendered.** `CampaignScene.refreshHud` set the garden status and then immediately overwrote it with the generic `Đèn: … · Lumo: đang đi cùng` row (no index-6 branch in the chain). | Added the `levelIndex === 6 && this.gardenLevel` branch to the status chain. |
| 6 | **Spawn behind the HUD.** (238,336) put the actor (sprite y315..357) under the status panel (y320..338) and the controls bar (y325..344). | Spawn and the first restore anchor moved to (238,300) (later (238,298), see Player flow); the script asserts every anchor/stand is inside the playable band `58 < y < 320`. |
| 7 | **Opening dialogue spoiled the lesson.** The shipped intro stated "Chúng cần hai điều khác nhau: ánh sáng ấm và một khoảng tối dịu" and pre-announced the practice pots, contradicting the contract's "do not expose spoilers in opening dialogue" (and the report's claim that the intro was scenario §2 text). | Intro replaced with the scenario §2 text verbatim: the mystery (blooming flowers, leafless seedlings) plus the concrete pointer to the shutter ("Ánh từ bể kia vẫn chiếu xuống. Thử che nó lại xem."). |
| 8 | **Unreachable objective row.** "Nói với Lumo bên mầm cây trong vườn ươm" could not be satisfied from the sprout stand (the sticker only committed `l6-lumo-realized` from the queued nursery scene's `onComplete`). | The post-water sprout re-read now also commits the realization, so the guidance row is truthful. |
| 9 | Two mechanisms overlap by 16×30px of art (handle `120,86,24,40` × latch-west `128,96,28,32`). Kept: the nook floor between the reservoir (ends x116) and the stone platform (starts x160) is only 44px wide and cannot hold 24+28px side by side; both are enabled mutually exclusively and the script proves it, so no target or logic conflict. Recorded here as a known cosmetic overlap. | documented (no geometry change) |

## Verification

Commands from the worktree on the final revision (`node`/`npm`/`git`, no browser):

| check | result |
| --- | --- |
| `node scripts/check-sleeping-garden.mjs` | **PASS** — 90 restore cases, 31 art boxes, 168 four-way block cells, 4px reach grid from 14,12 |
| `npm run build` (`tsc --noEmit` + Vite, 531 modules, `dist/index.html` 9.38 MB) | **PASS** |
| `git diff --check` | **PASS** (clean) |
| `node scripts/check-path-for-two.mjs` (level 05, untouched) | **PASS** |
| `node scripts/check-interaction-prompt-layout.mjs` | **PASS** |
| `node scripts/check-shattered-creek.mjs` | **PASS** |
| `node scripts/check-forest-edge.mjs` | **PASS** |
| `node scripts/check-whispering-woods.mjs` | **PASS** |
| `node scripts/check-campaign-start-intent.mjs` | **PASS** |
| full human puzzle/ending playthrough in a browser | **NOT_RUN** (no browser tooling in this session; see limits) |

`check-sleeping-garden.mjs` now covers, all from the single shared implementation:

- state derive/sanitize, body math, light model, held spans, crossing bookkeeping, and that foreign/legacy flags (`l6-at-*`, `l6-solved`, `l5-power`, `l6-sun-open` alone) never gate a mechanism or the exit;
- **per-stage reachability from the entry** for every stand and for the shrine arch (handle reachable before the canopy; the west latch unreachable with the bar down; the drain reachable only across deployed roots or the committed side path; the arch reachable only after full restoration);
- **every static solid plus every live dynamic solid blocks the 14×6 foot body from all four cardinal directions** (168 approach cells, 40+ of them isolated — i.e. the target really is the blocker);
- **restore safety as safe *and* connected**: a 9-stage × 10-stale-point matrix (90 cases) asserts the resolved spawn is collision-free, inside the entry's reachable region, and inside the playable band, plus the named sealed-save fallbacks (nursery/walkway/arch → west lawn) and the mid-bridge case;
- **prompt-side rule**: for every stand the north/east/west approach probes are outside the radius, the stand sits on the object's south edge within 20px of it, and the prompt circle stays clear of the bottom HUD strip; the arch keeps its documented exception;
- **art/footprint correspondence**: every module variant's native PNG size equals its declared art box (no stretch/squeeze), the extended Moon Root keeps its native width and stays centred, the retracted bridge stub is 48×32, the plank is 80×32 and matches its solid;
- **sticker visibility** (see defect 2) and that the practice demo corner leaves the lawn route walkable while the wall west of the entry mouth stays solid;
- **exit gating**: locked on every partial state, open only when all five committed states are present, and the arch stand unreachable until then; the locked prompt/`tryExit` text names the missing step.

Corrections the script would have caught (and now does): the sealed-save restore, the 12px plank leak, the sticker coverage, the stand/guard mismatch. The layout tables in `07-layout.md`/`07-plan.md` were updated to the shipped coordinates (spawn, both stands, sticker cells, plank box, restore rule).

## Integration & the test-develop merge

- The worktree checkpoint was committed (`wip(level-07): checkpoint before merging test-develop`), then `test-develop` was merged. Conflicts in `src/scenes/CampaignScene.ts` were resolved keeping **both** the level-07 (`gardenLevel`) hooks and test-develop's level-05 (`pathForTwoLevel`) hooks — never discarding either side. `CampaignArt.ts` auto-merged (level-07 sprite glob + shared `garden-mechanisms/*.png` glob coexist with the level-05 globs).
- The merged update loop runs both controllers and skips the generic puzzle/barrier/visual pass for `level !== 3 && level !== 4 && level !== 6`.
- `CampaignScene` keeps the level-06 hooks isolated: construct/update/hint/journal/objective/status/protected-prompt-bounds/destroy. The legacy index-6 action, barrier, crossing and visual routines were removed so nothing runs twice.
- **Playtest gate** (`create()`): `if (this.progress.level >= 4 && this.progress.level !== 6) { this.scene.start('ComingSoonScene'); return; }` — a single documented line that lets index 6 through and leaves every other index unchanged. Other branches add their own index to the same line; reconciled at integration. Known limit: **finishing index 6 still routes to the coming-soon screen** until all levels are integrated.

## Remaining limits

- **Full human puzzle/ending playthrough is NOT_RUN.** No browser/headless tooling was available in this session, so layering and solid footprints were verified by (a) the pure scripts above, (b) re-rendering the level from the real PNGs with the controller's own placement/depth/origin rules at light, dark and solved states, and (c) measuring sticker coverage pixel-by-pixel against the prop PNGs. The user's own playthrough is still the acceptance step; nothing here claims a browser smoke run.
- The shared bottom HUD strip (y ≥ 320) clips the lower 8–18px of the two practice pot bases and the whole south lawn edge; only cosmetic (the flower heads and the stickers are above it), left as-is because the band is shared by every campaign level and the base art fills the full 640×360.
- The player can walk up to y12 inside the shrine arch, under the top HUD band; there is no content there and the exit trigger (574,64) still prompts on the way.
- The ending text is the shipped 5-line paraphrase rather than scenario §7's shadow-figure beat: the level has no registered shadow-figure art (that character's sprites belong to level 08), so the beat's visual would have been invisible. The scenario's observation ("Người ấy vừa che ánh sáng khỏi luống cây") is preserved in the level's journal/nursery scene instead.
- Index 6 still ends at the coming-soon screen until all levels are integrated (the gate line reconciles at integration).
- The garden is one packed scenic room, not a multi-room level; the base art supplies the terrain while the authored zones/solids are authoritative.
- No push, no merge, no save-schema change, no PNG/character edits, `dist/index.html` excluded from every commit.
