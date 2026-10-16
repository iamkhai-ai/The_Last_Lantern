# Level 01 implementation report

Date: 2026-10-16

Scope: Level 01 only

Implementation commit: `af1dc43` (`fix(level01): play footprint discovery dialogue`)

Baseline: `16e01e4`

## Result

Rebuilt the Forgotten Forest Edge with a typed spatial definition shared by rendering, physics, interaction anchors, receiver charging, ground depth and save restoration. The player keeps the center-based public position API; Level 01 uses a 14×6 body aligned to feet at `centerY + 19` and fractional depth `10 + groundY / 10`. The route uses a masked existing dirt tile with irregular edges. Trees, rocks, tablet, gate posts and the closed passage have authored collision footprints. The gate uses the existing Level 02 open passage art and requires an explicit E exit from the south side.

The permanent back-of-arch footprint `[422,96,128,30]` joins the north floor boundary to the gate posts. It blocks entry behind the arch while preserving the empty forest strip beyond it. The doorway threshold `[447,126,78,18]` is conditional on gate state; the closed-gate contact `(486,128)` remains valid, and opening permits northward movement to `(486,110)` where the backing stops travel. The gate stand at `(486,151)` remains walkable. Level 01 status and command rows are separated, and the open-gate prompt reads “E · Qua cổng rừng”. The first successful post-reading Pulse now plays the scenario's three footprint-discovery lines once, keyed by the durable discovery flag. No image files or later-level puzzle logic changed.

## Changed files

- `src/data/forestEdgeLayout.ts` — typed geometry, depth, receiver and safe-spawn helpers.
- `src/scenes/CampaignScene.ts` — Level 01 layout, dialogue steps, collisions, prompts, art and state flow.
- `src/actors/Player.ts` — configurable foot placement with legacy behavior outside Level 01.
- `src/systems/InteractionSystem.ts` — rechecks target enablement and range at E press.
- `scripts/check-forest-edge.mjs` — dependency-free geometry and state assertions.
- `docs/implementation/` — task-owned layout/design/asset/plan records and this report.

## Verification

- `node --experimental-strip-types scripts/check-forest-edge.mjs` — **PASS**. Checks center-to-feet mapping, 14×6 authored footprint, precise depth ordering, route access, closed threshold/backing and contact-point behavior, open north passage up to backing, safe restore points, Pulse tutorial gate and charging conditions. The Level 01 SPACE guard short-circuits before `triggerPulse` until the tablet is read, avoiding both cooldown and pulse animation.
- `npm run build` — **PASS** (`tsc --noEmit` and Vite build; 404 modules transformed).
- `git diff --check` — **PASS** before commit; staged diff check also passed.
- Root isolated-browser evidence: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/level01-browser-results.json`. On implementation revision `8f3a8a9`, root reports **PASS** for the full Level 01 keyboard flow and explicit transition to Level 02, including an in-place closed-gate stop at `(488.25,128)` with a 14×6 body; browser console errors: none. An earlier harness run ended with a null-state sampling error during HMR; this was not a gameplay failure. These checks preceded the review fixes recorded below and are not evidence for the next revision.

## Decisions and limits

- Kept the planned threshold `[447,126,78,18]` and south stand `(486,151)`. Round 1 reviewers: Reviewer A found that SPACE triggered Pulse and cooldown before the tablet taught it; Reviewer B found no issues. This revision gates Level 01 Pulse until tablet reading while preserving SPACE dialogue advancement and other-level behavior. Root also identified that the prior full-width closed forest boundary had no matching continuous art and removed open forest space; this revision replaces it with the permanent arch backing in `01-layout.md`.
- Used the existing `woods_arch_open_passage` art from Level 02 without editing or regenerating assets.
- Final post-review browser verification is owned by root and must be rebound after this scenario-dialogue correction. Levels 02–10 remain deferred.
