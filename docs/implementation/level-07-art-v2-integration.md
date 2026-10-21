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
- **PASS** — `npm run build`, TypeScript and full Vite build; 726 transformed modules.
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

The source revision is frozen after the checks above for two separate read-only
GPT reviewer tasks, as required by the personal orchestration policy. Review
results and the exact frozen commit are recorded after both tasks complete.
