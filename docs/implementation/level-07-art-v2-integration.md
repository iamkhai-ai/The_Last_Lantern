# Level 07 art v2 — integration and evidence

Date: 2026-10-22. Baseline `9f792416d926475e6dc44924de5068aa8dca8daf`
(`test-develop`). Work branch: `codex/level07-art-v2`.

## Scope

The approved garden direction is implemented as 22 local native PNGs, eight
retained image_gen sources with exact prompts, a reproducible exporter, and
five actual in-engine state studies. Sources, hashes and transformations are in
`assets/levels/07-the-sleeping-garden/redesign-v2/production-manifest.json`.

Only `CampaignArt.ts` and `SleepingGardenLevel.ts` change runtime source. The
garden resolver selects the new local pack and retains shared/legacy fallback.
The extended Moon Root art keeps the original pot fixed; the local practice
frame receives an image-only x offset. `sleepingGardenLayout.ts`, scenario,
collision/trigger data, puzzle state, hints and save schema remain unchanged.

The active source is `docs/scenario/07-the-sleeping-garden.md`. This delivery does
not implement the draft scenario-v2 changes such as an optional return latch,
the wet handprint or Lumo leading across the bridge.

## Verification

- **PASS** — native export/PNG decoding: 22 canvases, nonempty sprite alpha,
  transparent prop backgrounds and clear raised-gate doorway below row 29.
- **PASS** — `npm run build`, then a repeat on the frozen revision with
  `npm run build -- --outDir artifacts/level07-art-build`; TypeScript and full
  Vite build, 726 transformed modules. The repeated build uses an ignored output
  directory and leaves the tracked distribution unchanged.
- **PASS** — `node scripts/check-sleeping-garden.mjs`: 90 restore cases, 31 existing
  art boxes, 133 four-direction block cells, reach grid, lesson timing, gate post
  crops, gap art, Shadow path/pause/destroy and the canonical H ladder.
- **PASS** — `node scripts/check-campaign-art.mjs`: 40 measured existing campaign
  PNGs. The separate native export check above covers the 22 new pack members.
- **PASS** — `scripts/inspect-level07-art.cjs`: five actual Chromium/Phaser renders
  at 640x360, all 22 local textures loaded, original Sun Flower fallback, both
  Moon Root pots fixed in dark state, actual F input while standing on a root
  span, occupied span held while the empty span retracts, no page/PNG errors.
- **PASS** — `git diff --check`.
- **NOT_RUN** — complete manual spawn-to-exit play-through and remote CI.

The browser script renders isolated saved-state fixtures rather than claiming a
complete play-through. `browser-inspection.json` binds the screenshots to source
and manifest hashes. Native and nearest 2x screenshots are retained with the HUD;
three extra presentation images pause those same scenes and hide only the HUD.

The current top HUD overlaps the upper reservoir casing in the normal entry
render. That existing HUD condition is recorded, not hidden by the evidence;
the separate art presentation shows the full reservoir.

## Independent review

Frozen code/art revision: `f9166b4fc2cb25465b0c0cf286f21b3c2b24384b`.
Both independent native review tasks checked that same revision against baseline
`9f792416d926475e6dc44924de5068aa8dca8daf`, with no current-round findings shared
between them. Both requested `gpt-6-luna` / `high`; native dispatch accepted both
calls. Resolved model/effort were not exposed and remain unknown.

- **Reviewer A** (`review_level07_a`): no actionable findings in the checked
  scope. Reviewed runtime fallback/registration, crops, native assets, screenshots,
  provenance and scenario constraints. **PASS** — Sleeping Garden checks,
  campaign-art checks, and source/export/browser-input hash comparisons.
  **NOT_RUN** — build and browser inspection by that reviewer.
- **Reviewer B** (`review_level07_b`): no actionable findings in the checked
  scope. Confirmed frozen revision and reviewed runtime/authoring code, manifests,
  entry/dark/restored renders and sprite contact. **PASS** — revision match and
  static review; visual previews inspected. **NOT_RUN** — build, gameplay checks,
  exporter, browser inspection, and optional pixel-difference check (sharp was
  not on that review command's module path).

The tasks were instructed to review read-only; no enforced read-only runtime is
claimed. Both requested the same model family, so correlated blind spots remain.

Root verification on the frozen worktree also confirmed every source, export,
reused-input and generation-reference hash, plus the browser inspection's source
bindings. The final follow-up commit records this evidence only; runtime, art,
authoring scripts and gameplay requirements remain at the reviewed revision.
