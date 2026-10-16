# Progress and decisions

## Scope

Current slice: rebuild **Level 01 only**, then let the user review before later levels. Baseline `16e01e4`. Isolated managed worktree, branch `codex/campaign-layout-rebuild`. Main checkout contains unrelated uncommitted art/source edits; they are outside this worktree.

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

## Level 01 lighting follow-up — 2026-10-16

- Decision: Level 01 uses one cached 256×256 radial dark-falloff texture over a transparent core, plus four dark rectangles outside its bounds. Both shade and rectangles share a whole-world-pixel center to avoid visible seams on Canvas and WebGL. With lantern lit, the shade diameter is 232px (about a 33px clear core, fading to about 116px); before pickup or with lantern off, it is 76px (about a 38px outer pool). Darkness opacity is 0.92 lit / 0.94 off, with the existing additive halo reduced. The Level 01 screen vignette is hidden so it does not darken the reveal twice. No pulse, save, gate, HUD, or other-level behavior changes are intended.
- Review correction: round 2 rejected the initial WebGL-only bitmap mask because Phaser AUTO can fall back to Canvas. Replaced it with the renderer-independent texture-and-rect composition above.
- Verification: NOT_RUN by worker as requested. Root owns the production build and visual inspection, including actor/world visibility near level edges and unchanged HUD/dialogue depth.

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
- Final source revision: `561b4286d6769f5018430cde97e621894ea6731e`. PASS — root `npm run build` (TypeScript and Vite, 405 modules, exit 0), `git diff --check`, and two independent read-only Luna high reviews on that exact revision with no remaining actionable findings.
- PASS — root manual browser preview on isolated origin port 5184: lantern pickup and toggling through the normal UI, lit/off local falloff, movement, right viewport edge coverage, readable HUD/prompts/dialogue, and no captured console errors. A fractional-coordinate seam observed on `da82885` was corrected by rounding the shade and rectangle center together; final moving screenshots show no seam. The temporary preview and tab were closed afterward; the user's port 5173 save was not modified.
- NOT_RUN — automated tests, forced Canvas runtime preview, later-level playthrough and human acceptance for the new lighting. Canvas uses the same renderer-independent image/rectangle composition and was reviewed in source; this does not claim a forced Canvas browser run.
- Local preview evidence: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/lighting/level01-lantern-on.jpg`, `level01-lantern-off.jpg`, and `level01-edge.jpg`; `join-before.jpg` retains the earlier seam. No push or merge into main performed.
