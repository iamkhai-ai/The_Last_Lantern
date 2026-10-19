# Progress and decisions

## Current state — Levels 05–10 repair (2026-10-19)

- All ten levels are implemented and integrated; the repair of Levels 05–10 (tasks T00–T14 of `docs/superpowers/plans/2026-10-18-levels-05-10-repair.md`) is complete at the source level on branch `codex/levels-05-10-repair-2` (frozen source revision `84367c1659958fe3c97862c091d715d846dcbf33`). Evidence, limits and open items: [levels-05-10-repair-report.md](levels-05-10-repair-report.md).
- Not done and not claimed: independent reviews of the frozen revision (BLOCKED), browser or human playthrough of any level (only one-off Canvas-renderer looks at some scenes), sound for the ending. The older sections below are history from the Level 01–04 slices.

## Scope

Current slice: rebuild **Level 06 (The Sleepless Tower, campaign index 5)** on branch `codex/level-06-spatial-rebuild` from `test-develop` `33fa1c3`. Level 05 is handled by a separate worktree; another chat owns the remaining levels. Earlier Level 04/02/01 history below is retained as context. Main checkout contains unrelated edits and remains untouched.

## Level 06 — 2026-10-18

- Design first in [06-layout.md](06-layout.md) and [06-plan.md](06-plan.md): single tower room, splitter bench lesson, three simultaneous circuits on the main machine, one-shot Return-Flow switch, Hope Crystal, record, reunion and garden exit.
- Implemented `src/data/towerLayout.ts` (geometry, optics, live conditions, step machine, gating, spawn, migration), `src/levels/SleeplessTowerLevel.ts` (composition, interactions, beams/indicators, Lumo call/travel/recall, full scenario dialogue, H/J/HUD, save) and focused index 5 routing in `CampaignScene`; removed the coming-soon gate for index >= 4 (legacy 4-9 become reachable; record for the merge decision).
- Corrections during implementation: bench practice-2 dead stub `(118,155)` -> `(140,175)` with a check assertion; one controller TS fix (outflow hide via the visuals map). Opening dialogue runs from `build()` under `intro-5` (no `startOpeningDialogue`), matching Level 04.
- **PASS** `node scripts/check-sleepless-tower.mjs` and `npm run build` (531 modules) on the working tree; `npm ci` needed first in the fresh worktree. Generated `dist/index.html` restored per plan.
- **NOT_RUN** live browser/gameplay/visual verification and human acceptance (Work browser control disabled). Independent root reviews not yet performed; branch is local. Full evidence and limits: [06-report.md](06-report.md).
- User-requested deep audit after the first commit (offline composites + per-file PNG dimension/alpha checks; no browser): tube chute corrected to uniform 38×19 and the optics now render dormant after Return Flow (grey routing without end marks, dark prisms, receiver heads off) to match the `after-return-flow` study; check script pins it. Check + build re-PASS in the follow-up commit; browser/gameplay audit still NOT_RUN.

## Level 04 — 2026-10-17

- Item-art follow-up:27 generated mechanism sprites now use detailed mossy stone and brass. Root integrated and visually inspected the replacement set; compilation PASS(463 modules). Automated tests/full playthrough NOT_RUN for this slice. Required independent Luna High reviews are blocked by the worker's usage-limit failure; earlier geometry reviews do not cover the new art. Preview:`http://127.0.0.1:5194/?level=4`. See [art report](level-04-prop-art.md).

- Root designed the safe practice group, three banks, two true reflected-light routes, near-side latches, return route for the lantern, relief and station entrance before Luna High implementation. Decisions are in [04-layout.md](04-layout.md).
- Source correction `7886ba5` and spatial-requirements freeze `7fa651d` include shared exit-post solids, compact ground footprints, source-recovery guidance and clear practice captions.
- **PASS** root production build, five pure scripts, diff checks and the independent post-aware route/restore probe on `7fa651d`. Both independent Luna High reviewers re-reviewed that revision with no open actionable findings. The first-round P2 post omission was corrected and closed.
- **NOT_RUN** live browser/gameplay/visual verification and human acceptance: Work browser control is disabled. Existing mechanism bridge art remains schematic. Dedicated human preview serves `http://127.0.0.1:5192/?level=4`; HTTP200/bootstrap presence is serving evidence only.
- Full evidence and limits: [level-04-report.md](level-04-report.md). This Level04 slice is local; publication is not included.

## Decisions

- 2026-10-16: Retain one CampaignScene and existing three Observatory rooms. Author spatial data once and use it across art, actions, physics, beam routes and checkpoints.
- 2026-10-16: Preserve new Nhinh frames. Repair actor foot depth/body alignment in code if needed, without pixel edits.
- 2026-10-16: Compose tile/cutout rooms when flat art contradicts traversable geometry, particularly Creek and Garden. Cost: less of the panoramic background is used; benefit: every visible bank/path corresponds to physics and can occlude correctly.
- 2026-10-16: Work in chapter-sized sequential waves; do not edit the shared CampaignScene concurrently.
- 2026-10-16: User authorized design decisions and implementation without further confirmation. No remote publication is authorized by this request.
- 2026-10-16: User narrowed active scope to Level 01; defer all changes to 02–10. Audit of all assets already completed and retained as reference.
- 2026-10-16: Ruling: retain the authored gate threshold `[447,126,78,18]` inside the passage. Reject a lower threshold below the gate art because it would block the intended interaction approach. Runtime movement must stop at the collider without teleporting.
- 2026-10-16: Ruling: use exact fractional depth based on actor feet for Level 01 to avoid ten-pixel sorting ties; retain legacy actor depth outside this level. Cost if incorrect: sprites could overlap differently at a prop's base, covered by before/behind browser checks.
- 2026-10-16: Level 01 uses an authored 14×6 foot body centered at the frame's ground baseline. Body dimensions, foot offset and depth must agree in runtime and pure spatial checks.
- 2026-10-16: Existing dirt texture is clipped by an irregular path mask; no raster files regenerated. Move the Level 01 command row to y=358 so it does not overlap the status row.
- 2026-10-16: Initial ruling replaced the full-width temporary northern band with permanent arch backing `[422,96,128,30]`; see the collision follow-up below for the corrected full-rim geometry.

## State

- Context: all ten scenarios read; original geometry/render/interaction faults localized.
- Asset audit: completed by Luna high (`/root/layout_asset_audit`), read-only except its report.
- Level 01 layout/implementation: complete with Luna high (`/root/implement_level01`), source frozen at `6c3b4cd`; root browser checks used isolated contexts/origin, user's port 5173 save untouched.
- Levels 02–10: deferred by user.
- Independent final reviews A/B: PASS, separate Luna high tasks `/root/review_level01_a` and `/root/review_level01_b`, full review plus scoped corrections through frozen `6c3b4cd`; no open actionable findings.
- Baseline build: PASS at `16e01e4` (`npm run build`, 403 modules). Root final build: PASS at `6c3b4cd`, 404 modules. Pure geometry/state checks: PASS. Final full keyboard route and browser console: PASS. Geometry/arch fixtures: PASS on equivalent unchanged geometry from `0076027`. Human acceptance: NOT_RUN.
- Draft browser observations: original keyboard flow reached Level 02; geometry fixtures confirmed safe restore, real tree collision, before/behind depth, baseline alignment and transparent open arch. These runs preceded final corrections, so they do not certify the final revision. Strict repeat confirmed closed passage blocks in place at approximately `(488,128)`, then was interrupted by Vite HMR while the worker edited source. Repeat on frozen build required.
- Final evidence and correction history: [level-01-verification.md](level-01-verification.md). All repeat checks needed after corrections are complete; the draft observations above are retained as history only.

## Level 01 gate follow-up — 2026-10-16

- Fixed two user-reported regressions: stairs occluding Nhinh and retained New Game launch data resetting progress on the first gate transition. Gate ground and front layers now render separately; New Game intent is consumed once. Gate prompt moved above the approach.
- Synced latest fetched main `f3c23de` into the feature branch with merge `08b93e1`, including the new Nhinh frames. Primary checkout and its unrelated edits remain untouched.
- Final source revision `eafcc597c003ffcebc07c5724560be0e6f275568`: root build, pure checks, uninterrupted actual-keyboard New Game → Level 02 → same-runtime Continue → explicit resets, seven stair visual samples and closed/open post collision checks all PASS. Two separate Luna high final reviews found no actionable findings. Earlier reload-based lifecycle evidence is superseded.
- Detailed findings, correction history, commands, scope and evidence: [level-01-gate-fixes.md](level-01-gate-fixes.md). Human acceptance and remote publication: NOT_RUN. Levels 02–10 remain deferred.

## Level 02 completion — 2026-10-17

- User moved this chat to Level 02; Level 01 belongs to another chat. Spatial flow, object footprints, gate layers, distinct poem/exit, state/save rules and decisions are documented in [02-layout.md](02-layout.md).
- Luna high implementation: `f984e24`; root runtime findings corrected in `2a6907d`; final fixture correction `c76ff771`. No raster or other-level behavior edits.
- Root build/pure checks, complete keyboard puzzle/Library/Continue route, 27 geometry/restore fixtures, partial/completed reload and moving-firefly observations: PASS. Two independent final Luna high reviews: PASS, no remaining actionable findings. Human acceptance and remote publication: NOT_RUN.
- Full commands, checked revisions, initial failures, corrections, reviewer withdrawal, decisions and local artifacts: [level-02-verification.md](level-02-verification.md). Temporary preview stopped; generated dist restored. Levels 03–10 remain deferred.

## Level 02 user clarity feedback — 2026-10-17

- User reported small rune stones and unclear starting flow. Follow-up source `2a3d6e75`, checked revision `ab3d981`: 60×78 rune art, spawn beside the practice stone, practice SPACE/E then poem/observe guidance, unified HUD/H/ground cue, original puzzle shortcuts preserved.
- Root pure/syntax/build/diff checks PASS. Two independent Luna high reviews PASS, no actionable source findings. Static spawn/tree alpha diagnostic PASS. New browser gameplay/visual fixtures NOT_RUN because Work browser control is disabled; earlier browser results remain historical. Human acceptance pending.
- Human preview reopened on 5190 with a fresh flow-v2 test save and backup of the prior test progress. Latest decisions/evidence/limits: [level-02-flow-follow-up.md](level-02-flow-follow-up.md). No remote publication.

## Level 02 nearby poem — 2026-10-17

- User requested easier access to the poem. Moved it to `(236,278)` with stand `(236,284)`, directly right of practice on the entry path; all active directions and related geometry/fixtures updated. Radius24 and puzzle/save rules preserved.
- Frozen source `2fa3b851`: root pure/syntax/build/diff checks PASS; two independent Luna high reviews PASS. Browser runtime NOT_RUN because Work browser control is disabled. Human preview relaunched with poem-v3 test-entry marker and prior test save backup. Evidence and ruling: [level-02-poem-follow-up.md](level-02-poem-follow-up.md).

## Level 01 lighting follow-up — 2026-10-16

- Decision: Level 01 uses one cached 256×256 radial dark-falloff texture over a transparent core, plus four dark rectangles outside its bounds. Both shade and rectangles share a whole-world-pixel center to avoid visible seams on Canvas and WebGL. With lantern lit, the shade diameter is 232px (about a 33px clear core, fading to about 116px); before pickup or with lantern off, it is 76px (about a 38px outer pool). Darkness opacity is 0.92 lit / 0.94 off, with the existing additive halo reduced. The Level 01 screen vignette is hidden so it does not darken the reveal twice. No pulse, save, gate, HUD, or other-level behavior changes are intended.
- Review correction: round 2 rejected the initial WebGL-only bitmap mask because Phaser AUTO can fall back to Canvas. Replaced it with the renderer-independent texture-and-rect composition above.
- Verification: NOT_RUN by worker as requested. Root owns the production build and visual inspection, including actor/world visibility near level edges and unchanged HUD/dialogue depth.
- Final lighting source revision: `561b4286d6769f5018430cde97e621894ea6731e`. PASS — root build (405 modules), diff check and two independent Luna high reviews; manual lit/off, moving and viewport-edge previews on isolated port 5184 showed no remaining seam, with readable HUD/dialogue and no captured console errors. Forced Canvas preview, automated tests and human acceptance for that lighting slice were NOT_RUN.
- Lighting artifacts: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/lighting/`. The temporary preview was closed; the user's port 5173 save was not modified.

## Interaction prompt placement follow-up — 2026-10-16

- Root cause: the shared prompt used a fixed `target.y - 32` anchor and a single-line 20px background. That put Level 01's lamp prompt across the 20×28 lamp and its tablet prompt over the tablet, while long changing labels could run offscreen. Similar placements existed in shared campaign actions, Observatory, WorldScene, and the Woods/Creek/Ruins puzzle registrations.
- Decision: use one shared pure layout helper to place a measured, wrapped prompt around target and actor bounds, inside the 640×360 play band that avoids the HUD rows. The nearest visible bounded CampaignScene prop is captured as a live bounds callback; the Level 01 lamp, tablet, and gate use authored bounds. WorldScene, Observatory, and direct puzzle registrations provide bounds from their existing sprites. Nhinh's actual sprite bounds and visible Lumo bounds are protected. E target choice, radii, enablement, and interaction callbacks remain unchanged.
- Audit: addressed shared Level 01 and all ten campaign `addAction` levels, Observatory interactables/exits, the legacy WorldScene beacon/tree/portals, and direct Woods, Creek, and Ruins puzzle targets. Large canopy/world/background images are excluded from the shared CampaignScene bounds lookup by size.
- Regression proof added: `scripts/check-interaction-prompt-layout.mjs` covers Level 01 lamp approaches from four directions, tablet/gate approaches, Lumo above the lamp, left/right viewport and HUD edges, and a long dynamic label.
- Verification: NOT_RUN by worker per delegation. Root owns the build and browser audit across campaign/Observatory fixtures.

## Prompt and gate collision review follow-up — 2026-10-16

- Review correction: Observatory `root-bed` is a `Graphics` surface with no inferred Image bounds; it now uses the authored live bridge rectangle. The initially hidden `root-bridge` now reports current image bounds only when it becomes visible. Pure prompt regressions cover both target bounds.
- Gate collision correction: the actual runtime gate crop is 152×156 at `(410,10)` with bottom anchor `(486,166)`; its side-post strips span local x `[0,50]` and `[102,152]`. Shared permanent geometry now covers those full post strips at y=126..166 and extends the backing across the full frame width at y=96..126. The centered opening remains 52px wide; the locked threshold remains separate and conditional. Save resolution consumes the same shared `FOREST_EDGE_SOLIDS` data as runtime colliders.
- Gate proof added to `scripts/check-forest-edge.mjs`: both posts' outer and inner edges in open/closed states, centered passage clearance, upper backing coverage, stale-save recovery, and existing reachable approaches.
- Verification: NOT_RUN by worker per delegation. Root owns tests, build, reviews, and real-browser collision/prompt confirmation.
- Final prompt/rim source revision: `1418693b553c9d5689734b1610c93bb5d814d93a`. PASS — root build (406 modules), three focused pure scripts, diff check, 355 browser prompt-placement fixtures across ten campaign levels and all Observatory rooms, live bridge-visibility bounds, 28 closed/open gate collision and restore cases, and the uninterrupted keyboard New Game → Level 02 / Continue / explicit-reset regression. Two independent Luna high final reviews found no actionable findings.
- Details and verification limits: [level-01-prompt-and-rim-verification.md](level-01-prompt-and-rim-verification.md). The user's game remains running on port 5173 with the updated source. No push or merge into main performed.
