# Levels 05–10 repair — implementation report

Plan: `docs/superpowers/plans/2026-10-18-levels-05-10-repair.md`.
Input review report: `docs/implementation/review-levels-05-10.md`.

This file is the running evidence log for the repair. Each task appends its commands, exit codes and
results. A green check battery is **not** treated as a playthrough anywhere in this document.

## T00 — Baseline and repair environment

- **Branch:** `codex/levels-05-10-repair`, created from `test-develop`.
- **Full HEAD at baseline:** `b09a19d990c101b981ceac57ae8b12cdca86f4ca`.
- **Plan's review revision:** `b09a19d990c101b981ceac57ae8b12cdca86f4ca` — identical, so there is no
  delta to reconcile before the fixes.
- **Working tree at baseline:** ` M dist/index.html` (pre-existing, preserved, never staged), plus two
  untracked input documents — the review report and the plan itself. Both are committed on this branch;
  no build output is staged.
- **Worktree:** the integration worktree `D:/Z_PROJECT/The_Last_Lantern/the-last-lantern-test-develop`.
  The original `the-last-lantern` checkout is serving other work and was not touched.
- **Snapshot provenance** (recorded, not re-verified here): L05 flow-redo `c0f6da4`, L06 `2cc9c8b`,
  L07 `9aba883`, L08 `7f9b697`, L09 `4f02ce7`, L10 `301f0d3`. The `level-05-spatial-rebuild` worktree at
  `c5faa51` is an old candidate with uncommitted changes and is **not** a source to overwrite from.

### Baseline command results

All commands run in the worktree above at revision `b09a19d`.

| Command | Exit | Result |
| --- | --- | --- |
| `node scripts/check-campaign-levels.mjs` | 0 | PASS |
| `node scripts/check-campaign-start-intent.mjs` | 0 | PASS |
| `node scripts/check-forest-edge.mjs` | 0 | PASS |
| `node scripts/check-heart-of-elaria.mjs` | 0 | PASS |
| `node scripts/check-interaction-prompt-layout.mjs` | 0 | PASS |
| `node scripts/check-observatory.mjs` | 0 | PASS |
| `node scripts/check-path-for-two.mjs` | 0 | PASS |
| `node scripts/check-ruins-of-two-halves.mjs` | 0 | PASS |
| `node scripts/check-shattered-creek.mjs` | 0 | PASS |
| `node scripts/check-sleeping-garden.mjs` | 0 | PASS |
| `node scripts/check-sleepless-tower.mjs` | 0 | PASS |
| `node scripts/check-whispering-woods.mjs` | 0 | PASS |
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | PASS |

### What this baseline does and does not prove

- It confirms the starting point compiles and that every existing pure check passes.
- It does **not** show that Level 09 is completable. The blocker B1 (the return loop's only writer was
  deleted, so `l8-return-loop-open` can never become true) is invisible to
  `scripts/check-observatory.mjs`, which drives synthetic stages that already set `loopOpen: true`.
  T01 adds a regression that runs the real registered callback so the missing writer fails loudly.
- It does **not** substitute for a browser or human playthrough. No browser capability was available, so
  every visual and full-route item stays `NOT_RUN` until someone performs it.

### Evidence-honesty rules applied in this report

- A claim made by another author (for example a browser run recorded in an older level document) is
  recorded as that author's evidence, never restated as a result of this repair.
- Any check claim must name the assertion or section that implements it.
- `NOT_RUN` is written plainly, with the reason, instead of being silently upgraded to PASS.

## T01–T06 — recorded from the first pass (not re-run in detail here)

| Task | Commits | Summary |
| --- | --- | --- |
| T01 | `43dd80a`, `ee34eba` | Level 09: the return-loop control writes `l8-return-loop-open`, saves, refreshes doors/strip; the room build registers its authored controls (they had no call site). |
| T02 | `689cf4a` | The tower controller updates once per frame. |
| T03 | `33b69e2`, `879dddf` | Level 10 seal needs a current assignment and a real arrival; the latch clears the assignment before the save. |
| T04 | `60548ea`, `42f14b3` | Credits safety (Main Menu default, Play Again confirmation, fresh-press input, teardown by identity). |
| T05 | `087d472`, `31084da` | `ownsPosition` and valid-target selection. |
| T06 | `b1b9fc0`, `afbea49` | Level 05: optional practice, one ink mark, route legs from one source. |

## T07 — Level 06 (`1b7c8b1`)

G2, receiver B and their beam legs lifted 20px so G2 has 30px of standing space in front; standing props answer E from their south face (`towerCanApproachFront`, four-side raw foot probes in `check-sleepless-tower.mjs`); record stand moved to (549,192); H gives observation/relation/next action; the bench is optional in the objective and H; recall guidance changes while Lumo is flying back; the switch, record open and record fade are captions (plus a short camera shake); the title comes from `CAMPAIGN_LEVELS`; the stale lamp restore for index 5 is gone. Layout notes: `06-layout.md`.

## T08 — Level 07 (`88d3863`)

Practice lesson arms on a light change in either direction and plays only where the pots can be read; locked latches answer E with the missing step; retracted bridge shows bank-edge art; gate-bar posts sort by their feet; status row wraps; ending is the scenario's four lines after a registered-pose Shadow silhouette beat; the art registry exposes every Shadow pose. Notes: `07-layout.md`.

## T09 — Level 08 (`c57ed44`)

See `level-08-report.md`.

## T10 — Level 09 (`d3ed5d0`)

Room-aware objective/status/prompts sharing `observatoryDoorOpen`; a parked lamp's halo is painted only in its room; entrance and corridor lose their staging boards (composed floors, sill visuals for doors); the Shadow has a native-size spot with a solid footprint; the opening is two beats; a free Lumo walks through doors with Nhinh; conditional section-4 lines fire on transitions only; the record is the full sixteen lines with flash, merge and silence; the 09 → 10 handoff clears stale Lumo counters. Notes: `09-layout.md` (regenerated by `scripts/gen-observatory-layout-doc.mjs`).

## T11–T13 — Level 10 (`1373bbe`, `27d4b1c`, `312e4ae`)

See `level-10-report.md`.

## T14 — shared cleanup and final verification (`84367c1659958fe3c97862c091d715d846dcbf33`)

- Removed the unreachable legacy branches of `CampaignScene.registerLevel` (indices 2, 4, 5, 7, 8, 9), the stale index 4/5/9 blocks of `updatePuzzle`, the private helpers nothing calls any more, the never-populated `roomDoors` map and unused imports. Searched every reference in `src` and `scripts` first. Still compiled but unreachable: the level-specific branches inside the shared helpers `addNarrativeProps`, `buildCampaignBarriers`, `updateCampaignBarriers`, `refreshCampaignArtVisuals`, `refreshCampaignPuzzleVisuals` and `drawRoom` (levels 0 and 1 are the only callers); removing them is a deliberate follow-up, not done here. Art files are not deleted.
- **Bug found by the browser pass, fixed:** Continue at the creek (index 3) or the tower (index 5) from a fresh page load called `destroy()` on HUD texts that exist only when an earlier level of the same session created them, so the first frame threw. The teardown is guarded (`this.titleText?.destroy()` …) and pinned by a runtime case.

### Commands at `84367c1659958fe3c97862c091d715d846dcbf33`

| Command | Exit | Result |
| --- | --- | --- |
| `node scripts/check-*.mjs` (16 scripts, each run alone) | 0 | all PASS (art 40 PNG files, ending 19/19, runtime 24/24, targets 12/12, levels, start-intent, forest-edge, heart, prompt-layout, observatory, path-for-two, ruins, creek, garden, tower, woods) |
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | PASS |
| `npm run build` | 0 | PASS (637 modules); `dist/index.html` restored afterwards, never staged |

### Browser evidence (what was and was not looked at)

Run in the Browser pane against a local dev server (Canvas renderer, forced only in an uncommitted local edit that was reverted; the game loop was driven from the console because the pane throttles `requestAnimationFrame`). Seen once each: Level 06 (lifted G2 row, all three circuits live, status row, caption-free HUD), Level 07 (retracted bridge art, lowered bar, status row), Level 08 (Shadow guard pose, relaxed pose, walk), Level 09 (entrance, corridor and observatory composed rooms, sills, the Shadow's spot, memory overlay under the prompt, objective text), Level 10 (overload beam following Nhinh, pocket border), the ending (night call and wait, reassure, montage shots, shadow dawn, tree return with pedestal pickup, seated, trail title).

NOT_RUN: WebGL rendering of any scene; a full playthrough of any level; sound; the lesson/bridge-hold/gate-bar interactions of Level 07 by walking; the four-side prompt probes by walking in a browser (they are pure checks); the final F with a real keyboard.

### Independent review

Two read-only reviewers ran on revision `142086ef8db3b86a07fd551f2340dd039bbf3561` (diff `afbea49..142086e`). Both finished. Their findings and the fixes made in response:

- **Flow/state (reviewer 1).** Fixed: the observatory memory tween could call `setTexture` on a destroyed Shadow when the player left the room mid-tween (`CampaignScene.ts`, memory overlay `finish`). Guarded with `active`. Recorded as open: a completed-save early return in `CampaignScene.create` leaves fields unset if `update` runs in the same frame (not reachable from the menu, since completed saves route to the ending first); the garden shadow beat does not defer for pause or an open dialogue; the ruins controller is not torn down before level 8 (no visible effect found); the Ruins Shadow walk is in-memory only; `CampaignSaveSystem` nulls the whole campaign on one invalid optional key.
- **Scenario/spatial (reviewer 2).** Fixed: level 07 dialogue for §3, §4, the held/rejoined beat, the §5 nursery and the §5 sprout reflection now uses the scenario lines verbatim with the scenario speakers. Fixed: the dead ternary in the tower legacy migration (`g0` maps to 0 as before; no behaviour change). Recorded as open: the HUD band is stated as 0–58 and 0–70 in different docs; the root bed is listed as non-solid but is solid at runtime; the H ladders for levels 07 and 09 are paraphrased rather than verbatim; `campaignLevels.ts` generic hints for levels 06–10 are stale; the south-face E test does not check the body's x against the footprint.

Fixed afterwards (commit after 11f6fe7): the garden foot body is kept inside y 58..320 by two new solids (`band-status`, `band-north-gate`) and `GARDEN_BOUNDS` minY 42 / maxY 298; spawn moved to (238,298); legacy saves are clamped into the bounds before the safe-spot search; `check-sleeping-garden.mjs` sweeps every centre in six states and asserts the exact four-way block count (133). Implemented by a Haiku subagent, reviewed by a Sonnet subagent (no High/Medium findings; four Low follow-ups applied).

Also fixed afterwards: the Level 09 south return-loop pocket now sits in y 300..320 (threshold 48x20, 8px jambs, trigger (520,304) r16, south masonry from y 320). With the loop shut the nearest legal centre is 26px from the trigger (10px clear); with it open about 30x10px of legal centres reach it. `check-observatory.mjs` asserts every alcove stays in y 58..320 and scans the pocket in every stage; the 09-layout generator derives its numbers from the data. Implemented by a Haiku subagent, reviewed by a Sonnet subagent (no High/Medium findings; two Low follow-ups applied).

Checks after the fixes: `tsc --noEmit` passes, all 16 `scripts/check-*.mjs` pass, `npm run build` passes. The reviews were static; no browser playthrough was run on this revision.

### Open items carried forward

- Human playthrough of Levels 05–10 and the ending (the user is the final reviewer).
- Independent reviews of the frozen revision.
- Level 09: restore-matrix fixtures beyond the existing pure restore cases (before the bridge, mid-travel, after the bridge, after the loop) were not extended in a browser; sun-lock/loop art sizes were corrected from measured files but the old footprints were not re-reviewed visually in WebGL.
- Level 07: pot bases under the HUD were not raised (no render evidence that meaning is lost).
- Level 06: lamp/fountain wall art alpha behind the HUD title band was not measured.
- Remove the compiled-but-unreachable legacy level branches in the shared helpers listed above.
- Not changed on purpose: `l7-shadow-talked` is still written; the generic Lumo counters are now cleared at the 09 → 10 handoff.

