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

Root reproduction: both bugs confirmed. Main sync: PASS (already contains fetched main). Implementation and local focused checks: complete. Root browser proof and independent reviews: pending.

## Fix decisions and local evidence

- New Game intent is consumed once from both the `create(data)` argument and Phaser's retained `sys.settings.data`. `nextLevel()` restart and menu Continue therefore load the current save, while Menu New Game and pause Restart continue to pass an explicit reset request. Existing save schema and keys are unchanged.
- Level 01 gate uses one full-size ground image at depth 3 plus runtime-generated transparent header and side-post crops at the gate anchor depth. The source artwork is fitted uniformly and bottom-aligned in the shared native 152×156 frame; open and closed sources update all four layers together. The level's existing post, threshold, and backing colliders are unchanged. Cropped textures remain cached in Phaser's texture manager across scene restarts; their scene images are destroyed/rebuilt with the rest of the level objects.
- The gate prompt has a gate-only screen anchor at y=76 so it does not cover Nhinh on the stairs. Other interaction prompts keep their prior placement.
- Added `scripts/check-campaign-start-intent.mjs` for one-shot consumption, normal restart/Continue behavior, and explicit New Game / Restart requests.

Local checks on the implementation revision:

- PASS — `node --experimental-strip-types scripts/check-forest-edge.mjs`
- PASS — `node --experimental-strip-types scripts/check-campaign-start-intent.mjs`
- PASS — `npm run build` (`tsc --noEmit` and Vite production build)
- PASS — `git diff --check`
- NOT_RUN by worker — uninterrupted real-browser puzzle/transition, same-runtime Continue and explicit reset cases, stair screenshots, dynamic gate-layer screenshots, and post collision proof. Root owns those browser checks on the frozen source revision.

Source commit: pending.
