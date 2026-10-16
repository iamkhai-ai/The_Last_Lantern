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
