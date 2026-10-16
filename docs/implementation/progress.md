# Progress and decisions

## Scope

Current slice: rebuild **Level 02 only**, per the user's subsequent request; another chat owns Level 01. Isolated managed worktree `level-02-spatial-rebuild`, branch `codex/level-02-spatial-rebuild`, from `797c594` including main `f3c23de`. Earlier Level 01 history below is retained as context. Main checkout contains unrelated edits and remains untouched.

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
- 2026-10-16: Ruling: replace the full-width temporary northern band with permanent arch backing `[422,96,128,30]`; the empty grass remains traversable and collider/restore geometry shares the same solids. Cost if wrong: an arch approach could be obstructed; real closed/open movement checks passed.

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

## Level 01 lighting follow-up — 2026-10-16

- Decision: Level 01 uses a cached 256×256 radial alpha mask, inverted over the dark overlay and vignette so the nearby world is revealed through a soft actual transparency falloff. With lantern lit, the display diameter is 232px (about a 33px clear core, fading to about 116px); before pickup or with lantern off, it is 76px (about a 38px outer pool). Darkness opacity is 0.92 lit / 0.94 off, with the existing additive halo reduced. The mask is generated once with other procedural textures and reused; no pulse, save, gate, HUD, or other-level behavior changes are intended.
- Renderer limit: Phaser bitmap masks require WebGL. Canvas fallback keeps the previous lighter global dimming/glow so the scene remains playable without per-frame raster work.
- Verification: NOT_RUN by worker as requested. Root owns the production build and visual inspection, including actor/world visibility near level edges and unchanged HUD/dialogue depth.
