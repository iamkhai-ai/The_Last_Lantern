# Level 01 implementation report

Date: 2026-10-16

Scope: Level 01 only

Implementation commit: `4e2b369` (`feat(level01): rebuild forest edge layout`)

Baseline: `16e01e4`

## Result

Rebuilt the Forgotten Forest Edge with a typed spatial definition shared by rendering, physics, interaction anchors, receiver charging, ground depth and save restoration. The player keeps the center-based public position API; Level 01 uses a 14×6 body aligned to feet at `centerY + 19` and fractional depth `10 + groundY / 10`. The route uses a masked existing dirt tile with irregular edges. Trees, rocks, tablet, gate posts and the closed passage have authored collision footprints. The gate uses the existing Level 02 open passage art and requires an explicit E exit from the south side.

The closed north forest edge spans `[0,90,640,54]` and disables when the gate opens. This boundary closes the route around either gate post and gives saved-position rejection a matching runtime collider. The gate stand at `(486,151)` remains walkable. Level 01 status and command rows are separated, and the open-gate prompt reads “E · Qua cổng rừng”. No image files or later-level puzzle logic changed.

## Changed files

- `src/data/forestEdgeLayout.ts` — typed geometry, depth, receiver and safe-spawn helpers.
- `src/scenes/CampaignScene.ts` — Level 01 layout, dialogue steps, collisions, prompts, art and state flow.
- `src/actors/Player.ts` — configurable foot placement with legacy behavior outside Level 01.
- `src/systems/InteractionSystem.ts` — rechecks target enablement and range at E press.
- `scripts/check-forest-edge.mjs` — dependency-free geometry and state assertions.
- `docs/implementation/` — task-owned layout/design/asset/plan records and this report.

## Verification

- `node --experimental-strip-types scripts/check-forest-edge.mjs` — **PASS**. Checks center-to-feet mapping, 14×6 authored footprint, precise depth ordering, route access, closed gate and north-boundary rejection, open north passage, safe restore points and charging conditions.
- `npm run build` — **PASS** (`tsc --noEmit` and Vite build; 404 modules transformed).
- `git diff --check` — **PASS** before commit; staged diff check also passed.
- Root isolated-browser evidence: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/level01-browser-results.json`. It records **PASS** for tutorial controls, nearby meeting/pickup, unlit tablet feedback, lit tablet plus Pulse, and the direct closed-gate movement check. The final record is a harness-side `TypeError` reading `dialogue` from a null state after scene transition, with no browser console errors. The direct closed-gate sample stayed at `(488.25,128)` with a 14×6 body. The complete Level 01-to-Level 02 keyboard run passed on an earlier revision before the final collision/art/UI corrections; it is not evidence for the final revision. A final post-commit browser run is still required.

## Decisions and limits

- Kept the planned threshold `[447,126,78,18]` and south stand `(486,151)`. The closed forest boundary was added after inspection found north-side circumvention around the posts; it is documented in `01-layout.md`.
- Used the existing `woods_arch_open_passage` art from Level 02 without editing or regenerating assets.
- The final full gameplay transition after the last boundary/UI changes is **NOT_RUN** by the implementation worker; root owns browser verification. Levels 02–10 remain deferred.
