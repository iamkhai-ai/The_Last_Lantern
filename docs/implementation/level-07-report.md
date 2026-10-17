# Level 07 — The Sleeping Garden: implementation report

Branch `codex/level-07-spatial-rebuild`, base `1928ae6` (test-develop). Layout spec: `07-layout.md` (amended to match implementation), flow plan: `07-plan.md`. Runtime: `src/data/sleepingGardenLayout.ts` (pure) + `src/levels/SleepingGardenLevel.ts` (controller) + `scripts/check-sleeping-garden.mjs`.

## Scope and decisions

- Campaign index 6 is rebuilt on the level-05 pattern: one pure layout module owns zones, solids, stands, the light model, ride/held-span rules, spawn resolution and state sanitize; the controller owns rendering, Arcade physics, interactions (E/F/H/J), dialogue beats, HUD strings and checkpoints. `CampaignScene` keeps only the level-6 hooks (construct, update, hint, journal, objective/status/lumo-status, protected prompt bounds, destroy).
- The legacy index-6 code path was removed from `CampaignScene` so nothing runs twice: the action block (8 actions), `buildCampaignBarriers`/`updateCampaignBarriers`/`isGardenBridgeReady`, `updateCampaignCrossingState`, narrative props/art clauses, `refreshCampaignArtVisuals` clause and the HUD status clause. `clearCampaignColliders` no longer carries garden bridge fields.
- The playtest coming-soon gate changed `>= 4` → `>= 7` so index 6 (level 07) is playable in this branch; other indices' behavior is unchanged. This must reconcile when branches 05/06 land (they own indices 4/5).
- Darkness uses the shared LanternSystem: the controller sets `lantern.isDawnMode = !canopyShut` each frame; no level-local overlay was added. Plant state swaps get a 120 ms 1.12 scale pulse.
- Bridge art is drawn as two images (`bridge-s1`/`bridge-s2`) anchored to the span centers from `GARDEN_SPANS`; the generic module loop skips the `bridge` module spec so the retracted/held/on texture swap happens only in the state sync.
- Compat mirrors are still written (`l6-sun-open`, `l6-moon-open`) for older readers; sanitize derives implications on load (`returnLatched ⇒ waterFlowing`, latches `⇒ canopyShut`, `crossingSide` dropped unless `bridgeCrossed`).
- One new one-shot beat flag was introduced: `l6-held-beat` (fires on the first lantern-on→off while roots still hold the spans and the player is off the bridge).

## Coordinate adjustments made during implementation

- **Moon pot moved to the top of the forecourt** — `moon-main` solid and art `252,206,48,44` → `252,186,48,44` (extended `200,186,112,44`, icon `262,212`). At y206 the pot left a 4 px gap to the canal wall; the 14×6 body could never step from the forecourt onto the bridge, making the dark-phase crossing unreachable. The move opens a 20 px walk band under the pot, verified by the flood-fill.
- **Corridor guard corrected** — west-latch reachability uses player centers `104 ≤ x ≤ 196, 100 ≤ y ≤ 136`; the earlier draft band (`128..158`) admitted centers south of the wall where the latch must not prompt.
- **Bar beam** — authoritative solid is `GARDEN_BAR_BEAM {107,136,87,26}`; light flips inside the gap eject the player north `y112` or south `y170` (both verified safe).
- **Side path junction** — `GARDEN_SIDE_PATH {304,284,92,24}` (was 28 tall), `balu-south {396,308,216,20}` (was y292), side-path module/zone matched; canal side opening is y284..308.
- **East span width** — `s2 {347,228,49,20}`.
- **Exit stand radius** — 26 → 24 to satisfy the 20–24 rule (arch exception keeps the trigger under the arch).
- **Stage anchor** — `(160,300)` sat inside the practice moon-pot solid; replaced with `(200,300)`. All six anchors are verified safe as fallback spawns in every queried state.
- **HUD copy** — objective now `…để đóng màn che bể tích quang.` and the open-canopy status suffix reads `bể còn sáng` (both were garbled).
- `CampaignArt`: the five explicit level-07 sprite lines were replaced by the `07-the-sleeping-garden/sprites/*.png` glob and the shared `garden-mechanisms/*.png` glob was added to the shared mechanism list.

## Verification

Commands run from the worktree, all on the final working revision:

- **PASS** `npx tsc --noEmit` (no output).
- **PASS** `node scripts/check-sleeping-garden.mjs` — state derive/sanitize, body math, light model, held spans, bridge/side walkability, per-stage flood-fill reachability (fresh → handle; light → latch; dark → drain over the deployed bridge, latch unreachable behind the beam; side path two-way after `l6-return-latched`), eject targets, 96 stale-save spawn resolutions, completion order. The script found and closed the moon-pot bridge block and the bad anchor listed above.
- **PASS** `node scripts/check-interaction-prompt-layout.mjs`, `node scripts/check-shattered-creek.mjs`, `node scripts/check-forest-edge.mjs`, `node scripts/check-whispering-woods.mjs` — no cross-level regressions.
- **PASS** `npm run build` (tsc + vite, 511 modules).
- **PASS** runtime smoke with a seeded `level:6` save via headless Chromium (Playwright module resolved from a local codex worktree; preview port 5197, closed afterwards): boots into `CampaignScene` at index 6, all six probed level-07/shared textures present, intro dialogue plays and dismisses, keyboard walking moves the player north from spawn, `F` toggles the lantern, zero page errors and zero 404s. Screenshots: `%TEMP%\opencode\ll07_shots\level07-intro.png`, `level07-lawn.png`, `level07-lantern.png`. The garden base, sun/moon pots, raised bar, drain grate and closed side plank all render in their authored rects.
- Generated `dist/index.html` was restored and is not part of the source change.

**NOT_RUN**: full human playthrough and the complete in-browser puzzle solve (all five stages). Logic coverage comes from the flood-fill check script; render/boot/input from the smoke run above. No PNG, character frame, save, other-level source or the primary checkout was modified. No push or merge authorized for this slice.
