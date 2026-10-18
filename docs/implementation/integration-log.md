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
