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
