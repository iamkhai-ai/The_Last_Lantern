# Level 02 poem access correction

> Superseded by `level-02-poem-first.md`; retained as decision history only. Do not use its practice-adjacent coordinates as current requirements.

User feedback: the reading stone is too far from the start. Base `9c50579`. Narrow correction: relocate the poem to the entry path, immediately right of practice. Existing autonomous decisions and native Luna high delegation apply. Other levels and puzzle rules stay as authored.

## Implementation brief

- Poem ground anchor `(236,278)`, player stand/checkpoint `(236,284)`, base rectangle `[219,267,34,11]`. Native poem art remains 48×40, prompt remains anchorY-64 and radius24. Shared data supplies rendering, collider, cue, action, restore and route. No remote E reading.
- Replace every current-location guidance string in Level02 with a concise direction such as `Mẩu thơ ở bên phải bia tập, ngay trên lối vào.` Preserve poem text, existing durable flags, optional practice/poem behavior, rune order, saves, and the gate exit.
- Adjust only affected test positions, including post-open poem-to-gate route (go via safe southern/eastern lane, not through Moon/Star). Add pure direct entry-to-poem route/no-footprint-overlap/target-separation proof. Old saved positions near the old poem remain ordinary walkable floor; do not reset progress.
- Run focused pure contracts, nearest existing checks, browser script syntax, build and diff check; commit a narrow patch. Browser automation remains disabled in Work settings; NOT_RUN, do not bypass. Root gets two independent read-only reviewers on the frozen patch, records evidence and restarts human preview.

Ruling: move the clue closer rather than enlarge its interaction radius — makes the entry route coherent and keeps physical approach meaningful — cost if wrong: the clue may need a different entry position after user review.

## Implementation report — 2026-10-17

Moved the shared Level02 poem anchor, stand, footprint, checkpoint, cue, interaction, and route to the authored entry-path coordinates. Updated Lumo, H, and HUD directions to place it right of the practice stone. The browser fixture now approaches it at the new location and takes the post-open exit route through the south/east lane. Added pure checks for the entry-to-poem path, distinct interaction ranges, poem/Moon art gap, and safe restoration of old poem-area saves.

Verification on the implementation revision:

- `node --experimental-strip-types scripts/check-whispering-woods.mjs` — PASS.
- `node --experimental-strip-types scripts/check-forest-edge.mjs` — PASS.
- `node --experimental-strip-types scripts/check-campaign-start-intent.mjs` — PASS.
- `node --check scripts/level02-browser.cjs` and `node --check scripts/level02-geometry.cjs` — PASS.
- `npm run build` — PASS (`tsc --noEmit`; Vite built 406 modules). Restored generated `dist/index.html` afterward.
- `git diff --check` — PASS before this report addition; rerun for the final revision.
- Real browser/runtime automation — NOT_RUN because Work browser control is disabled; no server or UI was started.

No raster, dependency, save-format, or other-level changes.

## Root closure — 2026-10-17

Checked frozen revision `2fa3b851e5bc3bdda5a91f1c3be55bf28fde73ae`. Root independently ran Level02, forest-edge and campaign-start pure checks, both browser script syntax checks, `npm run build` (406 modules) and diff check: PASS, exit 0. Restored generated tracked dist. Independent read-only Luna high reviewers A/B examined the same revision: PASS, no actionable findings. Both confirmed shared poem geometry/cue/action, direct near-entry access, distinct radius24 targets, unchanged poem/puzzle/save semantics and safe old positions. Browser runtime/visual verification: NOT_RUN because Work browser control remains disabled; earlier browser results are not reused.

Human preview is relaunched on localhost5190. The external preview config's poem-v3 marker initializes a fresh Level02 test entry, backing up prior test progress under `level02-human-preview-backup-poem-v3`; other origins are untouched. HTTP serving is checked separately from runtime gameplay. No remote publication. Closure commit is documentation only.
