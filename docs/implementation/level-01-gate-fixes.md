# Level 01 gate regressions

## Scope and base

User request: fix Nhinh being hidden by the gate steps, fix E at the gate restarting a fresh game, and synchronize with latest main. Work from `1171027` on `codex/campaign-layout-rebuild`. `git fetch origin` resolved `origin/main` to `16e01e4`; `git merge --no-edit origin/main` reports already up to date. Do not discard local level rebuild or unrelated main-checkout changes. No push/remote merge requested.

Use systematic-debugging and a narrow patch. Luna high owns product edits sequentially; root owns reproduction, integration and verification. Only gate presentation and campaign startup/transition lifecycle are in scope. Reuse existing PNGs; no sprite regeneration.

## Root-cause evidence before implementation

Root browser reproduction on `1171027`, isolated Chromium context at localhost:5182:

1. Enter actual New Game from MenuScene, then place a test fixture at the open gate to isolate the two bugs. This fixture is diagnosis, not a complete puzzle playthrough.
2. At player center `(486,128)`, player depth is `24.7`; the single gate image has depth `26.6`. Its opaque stairs paint above the actor. Ground stairs and the standing arch currently share one image/depth.
3. Scene settings data is `{newGame:true}`. Press E and finish transition dialogue: progress returns to level `0`, lantern pickup is false, settings data is still `{newGame:true}`.
4. Installed Phaser `Systems.start(data)` only replaces settings data when `data` is truthy. `nextLevel()` calls `scene.restart()` without data, so the original new-game request is replayed by `create()`. `MenuScene.continueGame()` also starts the existing scene without fresh data and must not replay a previous new-game request in the same runtime.

Local evidence: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/gate-bugs-before.json` and `gate-bugs-before.png`.

## Required fix and verification

- Treat new-game intent as a one-shot explicit request. Normal campaign transitions and Continue must load current progress, while explicit New Game / pause Restart still reset. Fix the owning lifecycle, including any retained Phaser scene data; preserve save compatibility.
- Render stairs as walkable ground and the arch/posts/lintel at appropriate occluding depths. Nhinh remains visible while walking up the central stairs and into the open passage; standing posts still occlude from behind. Closed gate still blocks, open gate still transitions through E. Do not globally raise actor depth over all world props, move player physics to fake height, or use a teleport workaround.
- Keep dynamic texture changes, layer cropping/pivots and teardown correct for both closed/open variants and for level restart. No duplicate gate sprite obscures the character.
- Add a focused meaningful regression check for a fresh New Game → Level 02 transition without page reload, Continue after returning to menu in the same runtime, and explicit Restart / subsequent New Game resets. Prior test reloaded before exiting and therefore missed retained launch data.
- Verify stairs using read-only runtime layer/actor data and actual screenshots at several approach positions; test closed/open passage and post collision.
- Run `node --experimental-strip-types scripts/check-forest-edge.mjs`, relevant new checks, `npm run build`, and `git diff --check`. Root runs actual browser proof on a frozen revision and gets two independent Luna high reviews.

## Status

Root reproduction: both bugs confirmed. Final main sync: PASS (`f3c23de2453230bbd90b0d73381ba43e4fb654ed`, merged in `08b93e1`). Implementation, root verification and both independent final reviews are complete on source revision `eafcc597c003ffcebc07c5724560be0e6f275568`. Human acceptance: NOT_RUN.

## Fix decisions and local evidence

- New Game intent is consumed once from both the `create(data)` argument and Phaser's retained `sys.settings.data`. `nextLevel()` restart and menu Continue therefore load the current save, while Menu New Game and pause Restart continue to pass an explicit reset request. Existing save schema and keys are unchanged.
- Level 01 gate uses one full-size ground image at depth 3 plus runtime-generated transparent header and side-post crops at the gate anchor depth. The source artwork is fitted uniformly and bottom-aligned in a shared 152×156 canvas; open and closed sources update all four layers together. The level's existing post, threshold, and backing colliders are unchanged. Cropped textures remain cached in Phaser's texture manager across scene restarts; their scene images are destroyed/rebuilt with the rest of the level objects.
- The gate prompt has a gate-only screen anchor at y=76 so it does not cover Nhinh on the stairs. Other interaction prompts keep their prior placement.
- Added `scripts/check-campaign-start-intent.mjs` for one-shot consumption, normal restart/Continue behavior, and explicit New Game / Restart requests.

Local checks on the implementation revision:

- PASS — `node --experimental-strip-types scripts/check-forest-edge.mjs`
- PASS — `node --experimental-strip-types scripts/check-campaign-start-intent.mjs`
- PASS — `npm run build` (`tsc --noEmit` and Vite production build)
- PASS — `git diff --check`
- NOT_RUN by worker — uninterrupted real-browser puzzle/transition, same-runtime Continue and explicit reset cases, stair screenshots, dynamic gate-layer screenshots, and post collision proof. Root owns those browser checks on the frozen source revision.

Verified source commit: `600ac1dc81db369a4c45dec96778ce7daa4c6ece`.

## Independent review follow-up

Round 1 found two issues:

- P3: gate textures were rebound on every visual refresh. `setForestEdgeGateTextures` now compares each generated layer's current texture key and only calls `setTexture` when the open/closed state actually changes.
- P2: the checked-in start-intent helper test did not exercise Phaser's real scene and menu lifecycle. Added `scripts/level01-browser-regression.cjs`, adapted from the root's successful keyboard playthrough. It drives the actual uninterrupted tutorial and gate puzzle, exits to Level 02 with E, returns through the in-game Pause → Main Menu → Continue path, then verifies a second New Game and confirmed Pause Restart each reset progress. It does not inject puzzle flags or reload the page.

Run the browser regression against a running local game server with:

```powershell
node scripts/level01-browser-regression.cjs 5182
```

The runner resolves Playwright with `require('playwright')` by default; `PLAYWRIGHT_MODULE` can point to another resolvable Playwright module, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects a Chromium executable. `LEVEL01_BASE_URL` can replace the port argument. `LEVEL01_ARTIFACT_DIR` chooses the screenshot/results folder; otherwise a new folder is created under the system temporary directory. The runner prints the chosen URL and artifact folder.

The authoring agent did not run this browser script per the delegated task; root owns verification on the final revision.

## Final root verification — 2026-10-16

Source revision: `eafcc597c003ffcebc07c5724560be0e6f275568`. Main was fetched again after browser verification; `origin/main` remained `f3c23de2453230bbd90b0d73381ba43e4fb654ed` and is an ancestor of the source revision. New Nhinh frames from main were included in every final check. No raster assets were edited by this fix.

| Check | Result | Evidence |
| --- | --- | --- |
| `node --experimental-strip-types scripts/check-forest-edge.mjs` | PASS | Geometry/state assertions, exit 0 |
| `node --experimental-strip-types scripts/check-campaign-start-intent.mjs` | PASS | One-shot intent assertions, exit 0 |
| `npm run build` | PASS | TypeScript and Vite, 405 modules, exit 0 |
| `git diff --check` | PASS | Exit 0 |
| Checked-in `level01-browser-regression.cjs 5183` | PASS | Actual uninterrupted New Game tutorial/puzzle → E → Level 02 (internal index 1); same-runtime Continue stays at index 1; second New Game and confirmed pause Restart return to index 0 with lantern uncollected; console errors empty |
| Separate gate visual/physics browser regression | PASS | Seven approach samples: closed y≈174/151/128, open y≈174/151/128/110; no opaque actor pixels covered by gate layers in the central stairway; active E prompt stays above actor |
| Gate collision in actual browser | PASS | Closed passage stops at center y=128; open passage reaches backing at y=110; left/right posts stop sideways movement at x=454/518 in both gate states |
| Independent final review A | PASS | `/root/review_gate_fix_a`, Luna high, read-only review of exact source revision; no actionable findings |
| Independent final review B | PASS | `/root/review_gate_fix_b`, Luna high, separate read-only review of exact source revision; no actionable findings |
| Human acceptance / remote publication | NOT_RUN | User review remains; no push or merge into main performed |

Browser checks used an isolated Chromium context and temporary preview on port 5183. The user's port 5173 localStorage was not touched. Root inspected final closed/open stair screenshots. The preview was stopped after verification.

Local artifacts: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/gate-fixes/`. The checked-in browser run is under `final/level01-browser-results.json`; stair screenshots and `gate-visual-results.json` are in the parent folder. The visual diagnostic uses explicit saved-state fixtures; the checked-in lifecycle run completes the puzzle with real keyboard input and no injected puzzle flags or page reload.

One initial post-collision diagnostic failed because its timed movement stopped below the post's collision footprint. The diagnostic now uses position feedback to reach y≈148 before moving sideways; the repeated check passed. This was a fixture setup correction and required no product source change. Both round 1 review findings were corrected and independently re-reviewed. Prior Level 01 browser evidence that reloaded before exiting did not cover the retained New Game bug; this uninterrupted run supersedes that lifecycle claim.
