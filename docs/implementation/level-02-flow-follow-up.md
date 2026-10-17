# Level 02 clarity follow-up

Latest location amendment: [level-02-poem-follow-up.md](level-02-poem-follow-up.md) moves the poem from the northern gate to the entry path. Earlier gate-location wording and verification in this historical record are superseded for the poem's placement.

User review: symbol stones are too small and the entry does not communicate where to begin. Base `90ffec0`; bounded Level 02 correction. Existing autonomous-design and Luna-high implementation authorization applies. No other-level, raster, save-schema or dependency changes. Root stops its preview before edits and restarts the human preview after actual checks.

## Concrete changes

1. Display all four existing rune stones at 60×78 (1.5× source); uniform pivot, stable state swaps, nearest filtering. Keep ground anchors and compact solid bases. Lift their prompt above the enlarged art. Introduce display constants in shared spatial data.
2. Start at `(138,286)`, inside the practice interaction radius; ensure nearby canopy does not hide Nhinh. Use a subtle ground cue and clear practice name/feedback so the initial target reads immediately.
3. Compute one tutorial/objective stage from existing flags/live practice reveal and sequence. Prioritize completed or partially completed puzzle. Fresh path: practice SPACE, practice E, poem, main observe/sequence, open exit. H, HUD and target cue consume the same stage. Training/poem are guidance, not hard puzzle gates.
4. Preserve scenario dialogue, adding only one short direction at opening and after first practice completion. No order spoiler before the poem/H3. Repeated dialogue and reloads must not accumulate cues or replay completion beats.
5. Adapt meaningful pure and existing browser scripts to revised spawn/objective/scales; preserve expiry/wrong-order/repeat/legacy/exit assertions. Worker runs pure checks/build/diff. Root repeats actual applicable tooling and gets two independent read-only Luna high reviews on the same revision. Report browser tooling limits distinctly if unavailable.

Ruling: larger upper stone artwork keeps current compact base collisions — avoids blocking the approach with the full carved silhouette — cost if wrong: a base footprint may need tightening after visual review.
Ruling: use soft sequential guidance without locking the main puzzle — clear entry for first-time players while preserving experienced-player shortcuts — cost if wrong: HUD may switch between optional stages unexpectedly; stage priority checks cover partial/open saves.

## State

Implemented as a bounded Level 02 source and fixture correction on 2026-10-17. The source checkpoint hash is recorded below after commit. Prior browser evidence at `c76ff771` is historical and does not certify this follow-up.

### Verification

- `node --experimental-strip-types scripts/check-whispering-woods.mjs` — PASS. Covers spawn interaction range, 1.5× rune dimensions, prompt offsets, tutorial stage progression/expiry/partial-save priority, and existing geometry, gate, restore, legacy, and sequence contracts.
- `node --experimental-strip-types scripts/check-forest-edge.mjs` — PASS.
- `node --experimental-strip-types scripts/check-campaign-start-intent.mjs` — PASS.
- `node --check scripts/level02-browser.cjs` — PASS.
- `node --check scripts/level02-geometry.cjs` — PASS.
- `npm run build` — PASS; TypeScript and Vite, 406 modules. The generated `dist/index.html` was restored after the build.
- `git diff --check` — PASS.
- Browser fixtures were updated but NOT_RUN. Read-only browser automation is disabled in Work settings; no browser/server/UI automation was attempted. Root owns any available runtime verification and two independent read-only reviews.

### Revision

- Base: `9eb19fde4f3421a70cff4e4db37007973f03e9e8`.
- Follow-up source commit: `2a3d6e75a4e8ca11a2e66455bec5eb1ab0d1ab7d`.
- No raster, dependency, save-format, or other-level changes. No remote publication requested.

### Root verification and final review — 2026-10-17

Checked revision `ab3d981d067d5b4464cdcbb59eee9fca3cdd8904`, source/test commit `2a3d6e75a4e8ca11a2e66455bec5eb1ab0d1ab7d`. Root independently reran the Level 02 contract, forest-edge and start-intent checks, both browser-script syntax checks, `npm run build` (406 modules), and `git diff --check`: PASS, exit 0. Generated tracked `dist/index.html` was restored. Closure edits are documentation only.

Independent read-only Luna high reviews A and B examined the same frozen revision against `90ffec0`: PASS, no actionable source findings. They reviewed actual stage callers, preserved optional puzzle paths, prompts/scale, cue cleanup and test assertions; neither claimed runtime visual verification. Root also checked the actual tree/player image alpha at new spawn `(138,286)`: 432 opaque player pixels, zero covered by the southwest tree at `(65,310)`; no tree movement was needed. This is a static image overlap diagnostic, not a browser screenshot.

Browser gameplay/visual fixtures on this revision: NOT_RUN. Tool returned `Local browser use is disabled in Work settings`; root did not bypass that setting. Prior complete browser results at `c76ff771` remain historical. Human review is pending and the prior acceptance status is superseded by the user's clarity feedback.

The human preview remains on localhost port 5190 with a temporary configuration outside the repository. Its new flow-v2 marker starts a fresh Level 02 entry beside the practice stone and backs up the previous test save under `level02-human-preview-backup-flow-v2`. Other origins/saves are untouched. The page automatically enters CampaignScene; the introductory dialogue and puzzle remain for the user to play. Server/HTTP reachability is checked separately from runtime gameplay. No remote actions.
