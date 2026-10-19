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

## 2026-10-19 — T06 reopened: R01 native route stamps overran short legs

**Scope:** only the tube/cable renderer and its focused regression. No path, collider, interaction,
assignment, save rule or PNG was changed. Existing dirty dist and plan progress were preserved.

**Source identity:** base `afbea4949929b072494432704bf2fcbc79e505e6` plus uncommitted patch:

| File | SHA-256 |
| --- | --- |
| `src/levels/PathForTwoLevel.ts` | `ACDEE3F9A4EFACA73DD8C952BD95E5B33419937E805A90047E95B5A81B3177B3` |
| `scripts/check-path-for-two.mjs` | `EE47BD7B807BB303F4761D47780545EAAAECFA3AF0D33662A9CBB75173B54B22` |

The old code put a native160px cable on a32px run. The fix applies a symmetric `setCrop` to the run's
actual length, keeping image scale1 and native thickness. Texture swaps preserve that crop through
Phaser's existing TextureCrop component; no generated replacement art or stretch is required.

### Verification

| Evidence | Result |
| --- | --- |
| New regression before production fix | FAIL,20/21; actual tube span exceeded its authored run |
| `node scripts/check-path-for-two.mjs` after fix | PASS,21/21, including real Phaser crop/state-swap case |
| Entire15-script `scripts/check-*.mjs` battery | PASS, all exit0 |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS,exit0 |
| `npm run build -- --outDir <artifact>/build` | PASS,exit0,625 modules; existing dist hash unchanged |
| Two independent native reviewer tasks | No actionable introduced P1/P2 findings; both checked the same hashes above |
| Targeted browser render of Entry, Relay, Ink | PASS for bounded tube/cable render; actual CampaignScene, in-memory fixture only |
| Full puzzle playthrough | NOT_RUN; remains user acceptance |

Reviewer requests: `gpt-6-luna/high` for both; resolved model/effort not returned by the tool, recorded
as unknown. Read-only is an instruction, not a claimed enforcement boundary. No reviewer findings
were shared until both completed. Both also ran the focused21-case check successfully.

Artifacts: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/repair-crop-fix/`:
`checks.log`, `build.log`, `entry.jpg`, `relay.jpg`, `ink-rest.jpg`, `ink-arrived.jpg` and the temporary
`visual-server.mjs` fixture. The initial fixture import error was corrected before accepted snapshots;
its first Flow-only seed normalized back to follow and is not credited as a visual Flow-state check.
Automated regression covers all three texture states. The fixture never writes browser saves.

R01's longitudinal overrun is fixed in the reviewed source patch. This does not close T07–T14 or
claim complete visual/flow acceptance of Level05. At verification time the patch was uncommitted;
subsequent commit/push status is recorded in Git history and the handoff message. No merge was performed.
