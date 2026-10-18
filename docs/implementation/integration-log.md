# Integration log — merging per-level rebuilds into `test-develop`

This file records every merge of a per-level rebuild branch into `test-develop`, the conflicts that
had to be resolved by hand, and the verification evidence captured on the merged revision.

Rules used for every merge in this log:

- A merge must never drop an earlier level's work. Where both sides changed the same shared file,
  the resolution keeps both sides unless the two changes are genuinely incompatible.
- Conflict resolutions are deliberate and recorded below with the reason.
- `dist/index.html` is a build artifact. It is reverted before committing so it does not ship from
  a feature merge.
- Verification on the merged revision always includes `npm run build` and every
  `scripts/check-*.mjs`.

## Merge 1 — `codex/level-06-spatial-rebuild` (Level 06, campaign index 5)

- Branch merged: `codex/level-06-spatial-rebuild`, tip `2cc9c8b`.
- Branch base: `33fa1c3`, which predates both the `RULE_GAMES.md` commit `1928ae6` and the Level 05
  merge `a865dc7`. Its true change set (against its own merge base) is additive: 10 files,
  +1278/−15, with no deletions. The apparent deletions in `git diff test-develop <branch>` are only
  files the branch never had, so a real merge preserves them.
- Resulting merge commit: see the `test-develop` history for the merge of
  `codex/level-06-spatial-rebuild` after `a865dc7`.

### Conflicts and resolutions

**`src/art/CampaignArt.ts`** — the two sides listed different art globs.

- Resolution: kept the branch's two globs
  `../../assets/levels/05-a-path-for-two/sprites/*.png` and
  `../../assets/levels/06-the-sleepless-tower/sprites/*.png`.
- Reason: `test-develop` listed only two Level 06 sprites (`tower-scene-base`,
  `tower-lamp-dim`) from the earlier offline art batch, but the Level 06 controller references the
  full Level 06 sprite set (`tower_*`, `chamber-*`, `window-*`, `record-compartment-*`,
  `return-flow-*`, `waiting-for-live-circuits`, `all-currently-powered`, …). The glob is required
  for Level 06 to render, and it is a superset of the Level 05 list including
  `swirl-memory-scratch.png`, which `PathForTwoLevel` uses for the spiral engraving.

**`src/scenes/CampaignScene.ts`** — five conflict hunks, all resolved by keeping both levels.

1. Controller field: kept both `private pathForTwoLevel?: PathForTwoLevel;` (Level 05) and
   `private sleeplessTower?: SleeplessTowerLevel;` (Level 06).
2. Lumo update/save gating: now
   `else if (this.progress.level !== 4 && this.progress.level !== 5) this.lumo.update(...)` and
   `if (this.progress.level !== 4 && this.time.now - this.lastLumoSave >= 600)`. Reason: both
   `PathForTwoLevel` and `SleeplessTowerLevel` own Lumo inside their level; the generic loop must
   skip both, while the generic `lumo-x`/`lumo-y` counters stay authoritative for the Level 05 →
   Level 06 handoff, which is how the Level 06 branch was written.
3. Protected prompt bounds and the generic puzzle pass: the protected-bounds list now carries both
   `...(this.pathForTwoLevel?.getProtectedPromptBounds() ?? [])` and
   `...(this.sleeplessTower?.getProtectedPromptBounds() ?? [])`; both controllers are updated each
   frame (`this.pathForTwoLevel?.update(dt)` and `this.sleeplessTower?.update(dt)`); and the generic
   campaign pass is skipped for levels 3, 4 and 5.
4. `buildLevel()` teardown: both controllers are destroyed and cleared.
5. `drawRoom()` and the shared HUD text creation are skipped for levels 2, 3, 4 and 5. Reason:
   `SleeplessTowerLevel` draws its own HUD rows (`drawHud()` at y=13/42/320 plus the controls row),
   so letting the scene also create `titleText`/`objectiveText`/`statusText`/`hintText` for level 5
   would stack two HUDs on the same pixels. `refreshHud()` already delegates to
   `sleeplessTower.refreshHud()` for level 5.

### Verification on the merged revision

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | `tsc --noEmit` clean, Vite build 533 modules. |
| `node scripts/check-campaign-start-intent.mjs` | PASS | Campaign start intent lifecycle checks passed. |
| `node scripts/check-forest-edge.mjs` | PASS | Level 01 geometry/state checks passed. |
| `node scripts/check-interaction-prompt-layout.mjs` | PASS | Interaction prompt placement checks passed. |
| `node scripts/check-path-for-two.mjs` | PASS | Level 05 geometry/state checks passed. |
| `node scripts/check-shattered-creek.mjs` | PASS | Creek geometry, route, state, migration, spawn and completion checks passed. |
| `node scripts/check-sleepless-tower.mjs` | PASS | Sleepless Tower optics, seal, steps, gates, geometry, routes, spawn and migration checks passed. |
| `node scripts/check-whispering-woods.mjs` | PASS | Whispering Woods contract checks PASS. |
| Browser playthrough | NOT_RUN | No browser automation available in this environment. |

### Known limits after this merge

- The Level 06 branch removed the `ComingSoonScene` early return for index ≥ 4. After this merge the
  legacy inline implementations for indices 6–9 are therefore reachable until Levels 07–10 are
  merged. This is expected during integration and is resolved by the remaining merges.
- Level 06 records `NOT_RUN` for browser and human playthrough.

## Merge 2 — `codex/level-07-spatial-rebuild` (Level 07, campaign index 6)

- Branch merged: `codex/level-07-spatial-rebuild`, tip `9aba883` (6 commits ahead of `a865dc7`,
  including a `test-develop` merge `f1c6b4d` taken before the Level 06 merge).
- Merge base was `a865dc7`, so this branch did not contain the Level 06 work; both sides had edited
  the same shared files.

### Conflicts and resolutions

**`src/art/CampaignArt.ts`** — two hunks, both resolved by keeping the union.

1. Level 05/06/07 sprite globs. The branch still listed Level 05 sprite files one by one and only
   two Level 06 sprites; `test-develop` had globs for 05 and 06 plus an explicit five-file list for
   07. Resolution: three globs, `05-a-path-for-two/sprites/*.png`,
   `06-the-sleepless-tower/sprites/*.png` and `07-the-sleeping-garden/sprites/*.png`. Reason: the
   Level 07 controller references the whole Level 07 sprite set (`gate-bar-*`, `shutter-handle-*`,
   `side-stone-path-*`, `nursery-*`, `reservoir-*`), so the explicit five-file list was too small.
2. Shared mechanism globs. Resolution: both `shared/beam-splitter/*.png` (Level 06) and
   `shared/garden-mechanisms/*.png` (Level 07) are registered.

**`src/scenes/CampaignScene.ts`** — five hunks, all resolved by keeping both levels.

1. Imports: both `SleeplessTowerLevel` and `SleepingGardenLevel`.
2. Playtest gate: the branch added a scoped early return
   (`level >= 4 && level !== 6`). Resolution: dropped it, because the Level 06 merge had already
   removed the coming-soon early return entirely. Every campaign index is now reachable; this is the
   intended end state and the remaining merges fill in indices 7–9.
3. `H` / `J` key handlers: kept level 3, level 5 and level 6 branches together.
4. `SHUTDOWN` handler: destroys all three controllers.
5. End of `update()`: kept `this.sleeplessTower?.update(dt);` and extended the generic-puzzle
   exclusion to levels 3, 4, 5 and 6.

### One extra repair the merge required

- The Level 07 branch deliberately deleted the legacy index-6 garden-crossing machinery, including
  the field `lastCampaignPlayerPosition` and `updateCampaignCrossingState()`. The three-way merge
  kept a single stale assignment to that now-deleted field inside the Level 06 `level === 5` build
  branch, which broke `tsc`
  (`error TS2339: Property 'lastCampaignPlayerPosition' does not exist on type 'CampaignScene'`).
  The assignment was removed; nothing else referenced the field. This is exactly the class of
  cross-level leftover that a merge of independent branches produces.

### Interaction points that were checked deliberately

- Level 6 is excluded from the generic spawn placement (`} else if (level !== 4 && level !== 6) {`)
  because `SleepingGardenLevel` resolves and applies its own spawn.
- Level 6 still runs the scene's `drawRoom()` and still gets the scene's
  `titleText`/`objectiveText`/`statusText`/`hintText`, because `SleepingGardenLevel` draws no floor
  of its own and writes its objective and status text into the scene's rows.
- Level 6 keeps the generic Lumo update and position save (the scene drives the follower from the
  level-6 `lumoTarget`), while levels 4 and 5 keep owning Lumo inside their own controllers.

### Verification on the merged revision

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | `tsc --noEmit` clean, Vite build 561 modules. |
| All eight `scripts/check-*.mjs` | PASS | start-intent, forest-edge, interaction-prompt-layout, path-for-two, shattered-creek, sleeping-garden, sleepless-tower, whispering-woods. |
| `node scripts/check-sleeping-garden.mjs` | PASS | Garden checks: 90 restore cases, 31 art boxes, 168 four-way block cells, 4px reach grid. |
| Browser playthrough | NOT_RUN | No browser automation available in this environment. |

### Known limits after this merge

- Indices 7, 8 and 9 still run their pre-rebuild implementations until the Level 08, 09 and 10
  merges land. This is transitional.
- Level 07 records `NOT_RUN` for browser and human playthrough.

## Merge 3 — `codex/level-08-spatial-rebuild` (Level 08, campaign index 7)

- Branch merged: `codex/level-08-spatial-rebuild`, tip `7f9b697`.
- Its real change set adds `src/data/ruinsOfTwoHalvesLayout.ts`,
  `src/levels/RuinsOfTwoHalvesLevel.ts`, `scripts/check-ruins-of-two-halves.mjs`,
  `docs/implementation/08-plan.md`, `docs/implementation/08-layout.md`, and a small number of
  `CampaignScene.ts` hooks. Its merge base predates this `test-develop` line, so it also carries the
  Level 05 files that are already merged here; those produced no conflicts.
- Level 08 previously had only the thin index-7 placeholder, so this is the level's real rebuild.

### Conflicts and resolutions

**`src/art/CampaignArt.ts`** — one hunk. The branch listed every Level 05 sprite by name plus a
two-file Level 06 list plus a five-file Level 07 list, and used a glob for Level 08. `test-develop`
had globs for 05, 06 and 07 and a five-file Level 08 list. Resolution: four globs, one per level
(05, 06, 07, 08). Reason: the Level 08 controller references the whole Level 08 sprite set
(`statue-notch-*`, `shadow-notch-*`, `test-column-notch-*`, `lock-moon-*`, `confirmation-*`,
`seedling-curtain-*`, `sanctuary-door-*`, `fixed-three-route-splitter-*`), so the five-file list was
too small, and the Level 07 glob is required as well.

**`src/scenes/CampaignScene.ts`** — ten hunks, all resolved by keeping both levels.

1. Controller field: kept `sleeplessTower` and added `ruinsLevel`.
2. Playtest gate: the branch added `level >= 4 && level !== 7`. Resolution: dropped it, because the
   gate had already been removed. Every campaign index stays reachable.
3. `H` handler: now chains level 3 → level 5 → level 6 → level 7 → generic. The `J` handler already
   contained the level 7 branch after auto-merge.
4. Level-6 and level-7 `lumoTarget` rows are both kept.
5. Protected prompt bounds: both `sleeplessTower` and `ruinsLevel` contribute.
6. End of `update()`: both controllers are updated in order, and the generic puzzle pass is skipped
   for levels 3, 4, 5, 6 and 7.
7. `buildLevel()` teardown: both controllers destroyed and cleared.
8. `drawRoom()` and the shared HUD text creation: `drawRoom()` is skipped for levels 2, 3, 4, 5 and 7,
   while the shared `titleText`/`objectiveText`/`statusText`/`hintText` are still created for levels
   6 and 7. Reason: unlike levels 4 and 5, the garden and ruins controllers do not draw a floor of
   their own, and they write their objective and status into the scene's rows.
9. Build branches: the `level === 6` garden branch and the `level === 7` ruins branch are both kept.
10. Opening-dialogue dispatch: both the level 6 and level 7 cases are kept.

The branch's deliberate edits elsewhere auto-merged correctly: level 7 is excluded from the generic
spawn placement, and level 7 uses its own collision-aware checkpoint
(`if (this.progress.level === 7) { if (isRuinsPositionSafe({ x, y })) { ... } }`) so a reload cannot
store a centre whose foot body sits inside a solid.

### Verification on the merged revision

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | `tsc --noEmit` clean, Vite build 587 modules. |
| All nine `scripts/check-*.mjs` | PASS | start-intent, forest-edge, interaction-prompt-layout, path-for-two, ruins-of-two-halves, shattered-creek, sleeping-garden, sleepless-tower, whispering-woods. |
| `node scripts/check-ruins-of-two-halves.mjs` | PASS | Level 08 geometry/state checks passed. |
| Conflict-marker scan | PASS | No `<<<<<<<` or `>>>>>>>` left in the two shared files. |
| Browser playthrough | NOT_RUN | No browser automation available in this environment. |

### Known limits after this merge

- Index 8 and index 9 still run their pre-rebuild implementations until the Level 09 and Level 10
  merges land. This is transitional.
- Level 08 records `NOT_RUN` for browser and human playthrough.

## Merge 4 — `codex/level-09-spatial-rebuild` (Level 09, campaign index 8)

- Branch merged: `codex/level-09-spatial-rebuild`, tip `4f02ce7`.
- This branch repaired a genuinely broken Level 09: before its review pass the level did not compile
  (`error TS2339`, a leftover `0x12friendly` literal and undeclared fields), crashed on its first
  frame in `refreshObservatoryDoors()`, had a `door-a-control` that was never registered, and shipped
  English interaction prompts with a flat 34px radius that ignored `RULE_GAMES.md` §1. All of that is
  fixed on the branch and covered by `scripts/check-observatory.mjs`.
- `src/data/observatoryRooms.ts` and `src/systems/ObservatoryPuzzle.ts` auto-merged. Only two shared
  files conflicted.

### Conflicts and resolutions

**`src/art/CampaignArt.ts`** — one hunk.

- The branch registered its Level 09 sprites one by one and also named every Level 05 sprite, the two
  Level 06 sprites, the five Level 07 sprites and a set of Level 08 mechanism frames (Sun lock, Moon
  lock, fixed splitter, sanctuary door, statue notches).
- Resolution: one glob per level for 05, 06, 07, 08 and 09
  (`'../../assets/levels/09-dark-moon-observatory/sprites/*.png'` added). The Level 08 glob already
  covers every Level 08 mechanism frame that Level 09 reuses verbatim, so no per-file entry is
  needed. The four Level 09 entries that the branch also listed individually outside the conflict
  (`observatory-clean-base`, `learned-marks-miniature`, `star-chart`,
  `wheel-stopped-sun-among-stars`) were removed as redundant, because the glob resolves to exactly
  the same seven files.
- Note: the branch still registers `observatory-base.png`. It is deliberately never used as a room
  background — the observatory always renders `observatory-clean-base.png` — and the check script
  enforces that.

**`src/scenes/CampaignScene.ts`** — two hunks.

1. Playtest gate: the branch added `if (this.progress.level >= 9) { ComingSoonScene }`. Resolution:
   dropped, because the gate had already been removed; index 9 stays reachable and is replaced by
   the real Level 10 in the next merge.
2. `refreshHud()`: kept both the Level 06 delegate (`this.sleeplessTower?.refreshHud()`) and the
   Level 09 branch that writes the room title, objective, status and Lumo row from
   `observatoryGuidance(roomId, this.getObservatoryWorldState())`.

The branch's other additions auto-merged: the two shared Shadow sprites
(`shared/characters/the-shadow/sprites/waiting.png` and `memory-overlay.png`) are registered, and the
observatory runtime now consumes the pure layout module.

### Verification on the merged revision

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | `tsc --noEmit` clean, Vite build 593 modules. |
| All ten `scripts/check-*.mjs` | PASS | Adds `check-observatory.mjs`: 3 rooms, 19 elements, 6 alcoves, 8 stages, collision-aware flood fill per stage, four-direction solid blocking, every collider mapped to a registered existing PNG, every authored control registered and vice versa, 9 authored flow steps, v1 observatory validations intact. |
| Conflict-marker scan | PASS | No `<<<<<<<` or `>>>>>>>` left in either shared file. |
| Browser playthrough | NOT_RUN | No browser automation available in this environment. |

### Known limits after this merge

- Index 9 still runs its pre-rebuild implementation until the Level 10 merge lands.
- Level 09 records `NOT_RUN` for browser playthrough and human playthrough. Its report also notes a
  cosmetic issue: the observatory's return-loop alcove trigger sits at y≈300–334, so the player's
  feet fall behind the status band. No sprite overlaps the HUD, but it is not pretty.
- Level 09 records one new flag, `l8-sun-door-latched`, alongside the existing `l8-*` set. No v1 save
  validation was weakened or removed.

## Merge 5 — `codex/level-10-spatial-rebuild` (Level 10, campaign index 9)

- Branch merged: `codex/level-10-spatial-rebuild`, tip `301f0d3`. This is the last level merge.
- Before its review pass, index 9 still ran the old inline room and the coming-soon gate blocked it,
  and three defects made the puzzle unsolvable even if entered: the guardian statue was registered as
  a collider with no visible art (an invisible wall) so the Balance branch was impossible, the Hope
  pressure plate resolved to a non-existent `art_10_*` key so it never prompted, and two state
  textures were swapped with a fixed `setDisplaySize`, distorting the art. All three are fixed on the
  branch and covered by `scripts/check-heart-of-elaria.mjs`.

### Conflicts and resolutions

**`src/art/CampaignArt.ts`** — two hunks.

1. The branch listed Levels 05–09 file by file and used a glob only for Level 10; `test-develop` had
   globs for 05–09 and a ten-file list for Level 10. Resolution: one glob per level, 05 through 10.
2. The branch side of the shared-package hunk was empty; resolution keeps
   `shared/garden-mechanisms/*.png` (Level 07) next to `shared/beam-splitter/*.png` (Level 06).

**`src/scenes/CampaignScene.ts`** — fourteen hunks.

1. Imports: kept `RuinsOfTwoHalvesLevel` + `isRuinsPositionSafe` and added `HeartOfElariaLevel`.
2. Controller field: kept `sleeplessTower`, `ruinsLevel` and added `heartLevel`.
3. Playtest gate: the branch added `level >= 4 && level !== 9`. Resolution: dropped. With every level
   implemented there is no gated index left, and `ComingSoonScene` is now unreachable from the
   campaign.
4. `F` handler: kept the Level 06 early branch (`sleeplessTower.toggleLantern()`) and the Level 10
   early branch (`heartLevel.handleLanternKey()`), then the generic toggle. The branch's own removal
   of the old `finalToggleAvailable` special case for index 9 was kept, because index 9 now returns
   before reaching the generic path.
5. `J` handler: kept Levels 5, 6 and 9.
6. Lumo update and Lumo position save: index 9 joins index 4 (and, for the update, index 5) in being
   excluded from the generic path, because `HeartOfElariaLevel` owns Lumo for its level.
7. Protected prompt bounds: `sleeplessTower`, `ruinsLevel` and `heartLevel` all contribute.
8. End of `update()`: all three controllers update in order, and the generic puzzle pass is skipped
   for levels 3, 4, 5, 6, 7 and 9.
9. `buildLevel()` teardown: all three controllers destroyed and cleared.
10. Generic spawn placement: `} else if (level !== 4 && level !== 6 && level !== 9) {`, taking the
    branch's removal of the legacy overload checkpoint (the Heart level now owns its own safe spawn
    and overload checkpoint) and adding the Level 06 garden exclusion.
11. Lantern restore on load: kept the branch's Level 07 line and its deliberate removal of the
    scene-level `l9-overload` restore, because `HeartOfElariaLevel` restores the overload checkpoint
    itself.
12. Build branches: kept the Level 06 garden, Level 07 ruins and Level 09 Heart branches together.
13. Opening-dialogue dispatch: kept Levels 6, 7 and 9.
14. `buildCampaignBarriers()`: kept only the branch's new `level === 9` early return. The garden
    barrier block that the branch still carried was NOT reintroduced, because the Level 07 merge had
    deliberately deleted it along with `gardenBridgeWasReady`, `gardenTraversalSide` and
    `gardenBridgePendingRemoval`; restoring it would have resurrected removed fields and contradicted
    `SleepingGardenLevel`, which registers those colliders itself.
15. `showHint()`: kept both the Level 09 observatory branch and the Level 10 `heartLevel.showHint()`
    branch.

### One check script needed a correction

`scripts/check-heart-of-elaria.mjs` resolved runtime art by asserting that the literal path
`<level-dir>/sprites/<file>.png` appears in the `CampaignArt.ts` source text. After this merge the
Level 08 sprites that Level 10 reuses (`statue-notch-*`, the Sun and Moon locks, the fixed splitter,
the sanctuary door) are registered by the Level 08 directory glob rather than by name, so the literal
assertion failed even though the file is registered and exists on disk:

```
AssertionError [ERR_ASSERTION]: runtime art "statue-notch-0" resolves to a real file or texture
    at scripts/check-heart-of-elaria.mjs:396:10
```

The resolver now accepts either the literal file path or the directory glob
(`<level-dir>/sprites/*.png`), and still requires the PNG to exist on disk, so the assertion keeps its
meaning. The Level 10 branch already used this glob idiom for its own level.

### Verification on the merged revision

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | `tsc --noEmit` clean, Vite build 625 modules. |
| All eleven `scripts/check-*.mjs` | PASS | Adds `check-heart-of-elaria.mjs`: 14 controls, 5 solids, 5 scenery blockers, 47 art states verified on disk. |
| Conflict-marker scan | PASS | No `<<<<<<<` or `>>>>>>>` left in either shared file. |
| Browser playthrough | NOT_RUN | No browser automation available in this environment. |

### Known limits after this merge

- `ComingSoonScene` remains in `src/config/gameConfig.ts` but nothing starts it any more; the
  campaign now dispatches every index from 0 to 9 to a real implementation.
- Legacy inline level code for indices 4–9 is still present in `CampaignScene.ts` but is unreachable:
  the build dispatch only falls through to `registerLevel()`/`buildCampaignBarriers()` for indices 0,
  1 and 3. The earlier branches kept it deliberately so the diffs stayed reviewable.
- Level 10 records `NOT_RUN` for browser playthrough and human playthrough.

## Final state after all five merges

`test-develop` now carries all ten authored levels, each rebuilt as its own spatial slice, and every
shared file was merged by hand so that no earlier level lost work.

| Index | Scenario | Level | Implementation | Dedicated pure check |
| --- | --- | --- | --- | --- |
| 0 | 01 | Forgotten Forest Edge | inline authored path (`resolveForestEdgeSpawn`) | `check-forest-edge.mjs` |
| 1 | 02 | Whispering Woods | inline authored path (`normalizeAndPersistWoodsProgress`) | `check-whispering-woods.mjs` |
| 2 | 03 | Library Beneath the Roots | `LibraryLevel` | shared prompt check only |
| 3 | 04 | Shattered Moonlit Creek | `ShatteredCreekController` | `check-shattered-creek.mjs` |
| 4 | 05 | A Path for Two | `PathForTwoLevel` | `check-path-for-two.mjs` |
| 5 | 06 | The Sleepless Tower | `SleeplessTowerLevel` | `check-sleepless-tower.mjs` |
| 6 | 07 | The Sleeping Garden | `SleepingGardenLevel` | `check-sleeping-garden.mjs` |
| 7 | 08 | Ruins of Two Halves | `RuinsOfTwoHalvesLevel` | `check-ruins-of-two-halves.mjs` |
| 8 | 09 | Dark Moon Observatory | three rooms in `CampaignScene` + `ObservatoryPuzzle` | `check-observatory.mjs` |
| 9 | 10 | The Heart of Elaria | `HeartOfElariaLevel` | `check-heart-of-elaria.mjs` |

### Integration guard

`scripts/check-campaign-levels.mjs` was added to freeze this wiring. It asserts that the campaign
defines exactly ten levels in order, that `CampaignScene` no longer diverts any index to
`ComingSoonScene`, that every index is wired to its implementation and ships its layout module and its
scenario document, that at least nine indices ship a dedicated pure check, that `nextLevel()` advances
one index at a time and stops at index 9, and that `EndingScene` is still reachable with a completed
campaign resuming at the ending.

### Small corrections made during integration

- `src/scenes/MenuScene.ts` advertised `PLAYTEST · MÀN 01–04` in the top pill and
  `PLAYTEST BUILD · MÀN 01–04` in the bottom-right tag. Both now read `MÀN 01–10`, because every level
  is playable on this branch.
- `scripts/check-heart-of-elaria.mjs` now accepts a level's sprite-directory glob as registration, in
  addition to a literal file path (see Merge 5).

### How to verify this branch

```
npm run build                        # tsc --noEmit + Vite production build
for %f in (scripts\check-*.mjs) do @node "%f"     # 12 pure checks, all PASS
```

### Remaining limits, stated plainly

- **No level has been played in a browser or by a human on this branch.** Every piece of evidence is
  a type check, a production build, a pure geometry/state check or a source-level guard. Renderer
  behaviour, on-screen prompt placement, dialogue pacing and real save/reload across level transitions
  are all unverified here.
- Index 2 has no dedicated geometry check; it relies on the shared prompt-placement check and the
  build.
- Legacy inline level code for indices 4–9 still sits in `CampaignScene.ts` and is unreachable: the
  build dispatch only falls through to `registerLevel()`/`buildCampaignBarriers()` for indices 0, 1
  and 3. Deleting it is a safe follow-up, deliberately not attempted during the merge series.
- `ComingSoonScene` is still registered in `src/config/gameConfig.ts` but nothing starts it.
- Two cosmetic issues reported by the level branches remain open: the Level 09 return-loop alcove
  trigger sits partly behind the status band, and Level 10 has two geometrically unavoidable
  nearest-target ties resolved by registration order.
- Nothing was pushed to `origin`. All five merges exist only in the local `test-develop` branch.
