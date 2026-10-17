# Level 07 — The Sleeping Garden: implementation report

Branch `codex/level-07-spatial-rebuild`. Scenario 07 = campaign index 6. Layout spec: `07-layout.md`; flow plan: `07-plan.md`. Runtime: `src/data/sleepingGardenLayout.ts` (pure geometry/state) + `src/levels/SleepingGardenLevel.ts` (focused controller) + `scripts/check-sleeping-garden.mjs` (pure check script), matching the level-05 pattern.

## What was delivered

### Player flow (spawn → exit)

1. **Spawn** `(238,336)` on the south practice lawn, walking in from the entry mouth `(216,348,42,12)`; Lumo follows. Opening dialogue (scenario §2, 4 lines).
2. **Safe teaching area** — the two practice pots are beside the spawn (Sun Flower `70,266`, Moon Root `132,284`) with state-blossom/curl icons, so the two-plant rule is learned in a walled corner that never blocks the route. The teaching waterline (walkable) shows the "khe thử không cản lối đi" idea.
3. **Clue / first fixed control** — the shutter handle `stand (132,138)` in the west wall gap. `E` closes the reservoir canopy over the garden, the room darkens (`lantern.isDawnMode = false`) and the bar lowers. Two-line beat. The first lantern toggle after that plays the 4-line practice observation and pulses the pots.
4. **Main puzzle** — with the lantern ON the Sun Flower opens and raises the bar; walk north through the gate corridor (posts `99,136` / `194,136`), then `E` at the west latch `stand (142,144)` holds the bar (`l6-sun-latched`). Turn the lantern OFF: Moon Root extends and the root bridge spans the vertical canal (`s1 304..350`, `s2 347..396`, y228..248). Cross in the dark.
5. **Reward / story beat** — `E` at the drain `stand (462,286)` sends water around the sprout, one leaf opens and the 7-line nursery scene sets `l6-lumo-realized`. The distant Sun Flower visibly folds.
6. **Return & exit** — `E` at the east latch `stand (414,286)` opens the light-independent side stone path (`l6-return-latched`). Optional sprout re-read at `stand (500,280)`. Then leave the nursery east, up the steps into the walkway and north to the shrine gate; when every state holds, `E` under the arch `stand (574,64)` plays the shadow ending and advances to Level 08.

Order recovery, no time pressure: flipping the lantern ON while on the bridge keeps only the span under the feet (held overlay) and lets the player finish the crossing to a bank; turning it OFF restores the full bridge. The first retract-before-crossing plays a 3-line cue once.

### Object collision model

- **Solid blockers (block the 14×6 foot body from all four cardinal directions; each has matching visible art):** bar posts, reservoir, shutter handle, Sun Flower body, both latches, Moon Root body, drain, tower, tree trunk, quiet platform, both practice pots, plus all walls/bands/balustrades/canal side-walls. Arena water rects are lethal, not walk-through.
- **Dynamic solids (solid only while their live condition is unmet):** the lowered bar beam `107,136,87,26`; the retracted bridge spans; the closed side plank `304,284,92,24`.
- **Walkable ground (no collider):** every authored zone (lawn, forecourt, terrace, west field, connector, reservoir nook, sluice crossing, nursery, steps, walkway, gate corridor, entry mouth), the teaching waterline, delivered-water chevrons, the sprout, state icons, the gate opening, and the bridge/side strips **once** their condition is met.
- Every stand point sits at the object's **south (front) edge** per `RULE_GAMES.md`, radius 22–24, with a `canApproach` guard where the object can be reached from more than one side (west latch: only inside the gate corridor). The arch exit uses the documented gate exception. `InteractionSystem.tryInteract` re-validates enabled state and range at E, so nothing fires stale.
- Occlusion: standing props sort by base (`10 + groundY/10`); the raised/held bar beam is overhead (70); ground stamps stay below feet. Bar posts, tower, trunk and walls occlude the player only above their own painted footprint.

### Readable guidance

- `getObjectiveText()` states the immediate physical action per stage (see the "Guidance per step" table in `07-plan.md`).
- H walks a plain 3-rung ladder per stage (observe → relation → next step) following scenario §6, with the two special cases (handle first before the canopy is shut; side path + gate after the drain).
- Prompts are action-first Vietnamese. The exit never disappears: while locked it reads `Cổng điện thờ đang khép · chăm khu vườn trước` and E returns the specific missing step instead of silently showing nothing.
- J journal records the three learned facts; the 1.12× pot pulse and state icons read in the dark.

## Integration & the test-develop merge

- The worktree checkpoint was committed (`wip(level-07): checkpoint before merging test-develop`), then `test-develop` was merged. Conflicts in `src/scenes/CampaignScene.ts` were resolved keeping **both** the level-07 (`gardenLevel`) hooks and test-develop's level-05 (`pathForTwoLevel`) hooks — never discarding either side. `CampaignArt.ts` auto-merged (level-07 sprite glob + shared `garden-mechanisms/*.png` glob coexist with the level-05 globs).
- The merged update loop runs both controllers and skips the generic puzzle/barrier/visual pass for `level !== 3 && level !== 4 && level !== 6`.
- `CampaignScene` keeps the level-06 hooks isolated: construct/update/hint/journal/objective/status/protected-prompt-bounds/destroy. The legacy index-6 action, barrier, crossing and visual routines were removed so nothing runs twice.
- **Playtest gate** (`create()`): `if (this.progress.level >= 4 && this.progress.level !== 6) { this.scene.start('ComingSoonScene'); return; }` — a single documented line that lets index 6 through and leaves every other index unchanged. Other branches add their own index to the same line; reconciled at integration. Known limit: **finishing index 6 still routes to the coming-soon screen** until all levels are integrated.

## Verification

Commands from the worktree on the final revision:

| check | result |
| --- | --- |
| `node scripts/check-sleeping-garden.mjs` | **PASS** |
| `npm run build` (`tsc --noEmit` + Vite, 531 modules) | **PASS** |
| `git diff --check` | **PASS** (clean) |
| `node scripts/check-path-for-two.mjs` | **PASS** |
| `node scripts/check-interaction-prompt-layout.mjs` | **PASS** |
| `node scripts/check-shattered-creek.mjs` | **PASS** |
| `node scripts/check-forest-edge.mjs` | **PASS** |
| `node scripts/check-whispering-woods.mjs` | **PASS** |
| `node scripts/check-campaign-start-intent.mjs` | **PASS** |
| full human playthrough of all five puzzle stages | **NOT_RUN** |

`check-sleeping-garden.mjs` covers: state derive/sanitize, body math, light model, held spans, bridge/side walkability, per-stage collision-aware flood-fill from the spawn (handle reachable before the canopy; latch reachable with light on and unreachable with the bar down; the drain reachable only across deployed roots; the side path a true two-way return), **every solid prop blocking the 14×6 body from all four cardinal directions**, safe restore (96 stale-save spawn resolutions never land in a solid or past an unsolved gate), live-condition gating of each mechanism including `gardenExitReady` (the exit is locked on every partial state and open only on full completion; the gate stand is unreachable while both canal crossings are closed in the light and reachable after restoration), and the eject targets. No PNG, character frame, save schema, other-level source or the primary checkout was modified. No push.

## Remaining limits

- Full human puzzle/ending playthrough is the user's review; logic coverage is from the pure flood-fill script and the previous branch's boot/input smoke run.
- Index 6 still ends at the coming-soon screen until all levels are integrated (the gate line reconciles at integration).
- The garden is one packed scenic room, not a multi-room level; the base art supplies the terrain while the authored zones/solids are authoritative.
