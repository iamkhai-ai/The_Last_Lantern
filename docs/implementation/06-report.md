# Level 06 implementation report

## Scope and decisions

Rebuilt The Sleepless Tower, campaign index5, on `codex/level-06-spatial-rebuild` from `test-develop` `33fa1c3`. Design was authored before implementation: `06-layout.md` holds the room geometry, optical truth tables, state machine and save/migration rules; `06-plan.md` holds the task list. Implementation follows the existing controller pattern (`ShatteredCreekController` for Level04, `PathForTwoLevel` for Level05).

- `towerLayout.ts` owns the bounded single room, 15 solid footprints, all stands, optics, actual beam routes, derived live conditions (`liveA`, `liveB`, `lumoAtC`), the step machine, switch/exit gating, safe spawn resolution and one-time legacy migration under `l5-layout-v2`.
- `SleeplessTowerLevel` owns composition, ID-based colliders, interactions, beams/rings/indicators, Lumo call/travel/recall, the complete scenario dialogue, H/J/HUD and lifecycle. CampaignScene delegates only its index 5 hooks and keeps its scene-transition lifecycle.
- One chamber: the bench teaches the splitter and input-mirror gating; on the main machine G0's direct routes light exactly one receiver (so the obvious "one beam at a time" upgrade fails), the splitter route lights A only through G1 pose2 and B only through G2 pose1, C counts only while Lumo actually waits on the seal, and the Return-Flow lever latches only while all three circuits are live, then holds permanently.
- The bench practice-2 south arm stub was corrected from the dead `(118,155)` to `(140,175)` so the shown deviated ray bends toward its pedestal; the check script pins `beams.at(-1).to == {140,175}` and `06-layout.md` records the change.
- Placing the lantern preserves its actual on/off value (as in Level04); an off placed lamp shows a dedicated objective/hint override instead of silently auto-lighting; retrieving keeps the state.
- Lumo travel math compensates for `Lumo.update`'s hover equilibrium (`target + (18,-12)`), so travel targets pass `(w.x-18, w.y+12)`, arrival is measured at the waypoint, the follow clamp is `(player.x-20, player.y-6)` inside the room band, and reunion uses a 30->38px hysteresis to avoid save churn. Reload during travel rebuilds the route from the live position; `at-c` reload snaps to the seal parking spot.
- Art: native level06 sprites plus shared mechanism modules; the splitter and receivers reuse shared assets; G2 reuses the mirror2 sprite family as the study art does; the Hope Crystal reuses the existing procedural `crystal_hope` texture (there is no `hope.png`); the chamber renders open body + grille overlay while locked + crystal until collected. `CampaignArt.ts` registers level06 sprites and the shared beam-splitter module. No raster, character frame, or other-level asset was regenerated.
- Save compatibility: existing `l5-*` keys are reused only where they still mean the same fact; practice/source/assign additions are narrowly named; migration normalizes legacy mirror counters and the legacy power/water facts once under `l5-layout-v2` without resetting user saves.
- The coming-soon early return for level index >= 4 was removed (planned; mirrors the Level05 thread) so the legacy index 4 exit enters the new room for end-to-end review. Legacy index 5 scene routines remain in the file but are bypassed for the new controller. Side effect for the eventual merge: legacy levels 4-9 become reachable; record it in the merge decision.

## Corrections during implementation

- Bench dead-stub fix above; pinned by `scripts/check-sleepless-tower.mjs` and documented in `06-layout.md`.
- One TypeScript build error fixed in the controller: `addImage` returns void, so the initial outflow hide now goes through the visuals map (`this.visuals.get('outflow')?.setVisible(false)`).
- Contract adjustment vs `06-plan.md`: the controller exposes no `startOpeningDialogue()`; OPENING fires from `build()` behind the `intro-5` flag, matching the Level04 pattern where the scene never calls it.

## Verification

- **PASS** `node scripts/check-sleepless-tower.mjs` — "Sleepless Tower optics, seal, steps, gates, geometry, routes, spawn and migration checks passed". Covers both optical systems' truth tables including the corrected bench stub, reachable routes to every stand against full body geometry, four-direction solid contacts, C-only-on-presence, switch/exit gating, spawn fallbacks and one-time legacy migration.
- **PASS** `npm run build` (`tsc --noEmit` + Vite, 531 modules) after the controller correction. `npm ci` was required first because the fresh worktree had no `node_modules`.
- **PASS** `git status`/diff inspection: only the intended sources plus the two design docs and the report/progress files changed; generated `dist/index.html` was restored after the build, per plan (dist ships via dedicated refresh commits, not this slice).

## Preview and limits

Browser keyboard playthrough, live collision/occlusion, renderer screenshots, console audit and human acceptance: **NOT_RUN**. Work browser control is disabled; no alternate automation bypass was used. No preview server was started for this slice.

Independent reviews: **not yet performed** on this revision; root owns the two required read-only reviews on the frozen commit. This slice is local; no push or merge. The user's existing save was not reset.
