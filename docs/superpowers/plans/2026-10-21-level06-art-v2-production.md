# Level 06 Art v2 Production and Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for the assigned bounded slice. The user chose Luna implementation with root planning and coordination. During recovery, root assigns Task 1 assets and Tasks 2–4 runtime to separate Luna workers with disjoint file ownership. Task 4 waits for Task 1's checked pack. Workers must not dispatch subagents.

**Goal:** Replace Level 06's schematic mechanisms with a cohesive stone/brass pixel-art assembly that runs in the game and preserves its puzzle, story and saves.

**Architecture:** Produce a clean static environment and independently registered state sprites from the approved visual target. A tower-only art resolver selects the new local family and existing detailed Level 04 mechanisms; `SleeplessTowerLevel` composes them using `towerLayout` geometry and current live signals. Keep other level controllers and shared assets unchanged.

**Tech Stack:** Existing Phaser 3, TypeScript, Vite, Python/Pillow normalization, built-in `image_gen.imagegen`; no new runtime dependency.

**Spec:** `assets/levels/06-the-sleepless-tower/redesign-v2/art-direction-brief.md`; the user approved the three delivered mockups on 2026-10-21 and requested production/integration. Gameplay authority remains `docs/scenario/06-the-sleepless-tower.md`, `docs/implementation/06-layout.md`, and `RULE_GAMES.md`.

## Execution and global constraints

- Implementer: `gpt-6-luna`, `high` or `xhigh`, as permitted by the user's personal policy. The resumed bounded asset task uses `high` with fresh context after the prior `xhigh` turn stopped making tool progress. Both pairs are listed by active Codex collaboration metadata; no model or provider rejection occurred. Record dispatch acceptance and resolved identity only if the runtime exposes it; do not infer resolution. No provider/model fallback. Root does not implement product code.
- Base commit: `8bf1bb0241868f9908be360d6c17e3e14c14d953`. The primary checkout is `D:/Z_PROJECT/The_Last_Lantern/the-last-lantern`, branch `feat/level05-environment-preview`, with concurrent Level 05 work. Work in the root-provisioned managed worktree; copy ONLY this plan and the approved `redesign-v2/` folder into it. No changes to the primary checkout's Level 05 files.
- Read `C:/Users/Admin/.codex/orchestration/gpt-only-orchestrator-v2.md` and applicable repository instructions. The user's explicit execution request supplies authorization to proceed through routine reversible implementation decisions; preserve project gates.
- Read `C:/Users/Admin/.claude/skills/create-game-assets/SKILL.md` and its relevant references, the available `imagegen` skill, and a relevant Phaser/browser skill before engine/browser work. Use native image generation/editing for illustrations. Python is for cropping, sizing, anchoring, palette/alpha normalization and QA, not substitute schematic artwork.
- One 640x360 room, nearest sampling, integer-scale reviews, Vietnamese UI/story and English filenames. Preserve exact character frames and their aspect ratio.
- Reuse Level 04 detailed `sprites/mechanisms/{mirror-*,source-*,receiver-*}.png` and Level 05 call/plate/tube families. Do not overwrite globally shared art or change another level's lookup semantics.
- Approved composed mockups are references, not runtime backgrounds. No characters, active beams, rings, lever/chamber states or recording states baked into the static environment. Preserve generated originals and submitted prompts/hashes.
- Keep all save keys and the A/B/C truth table, optional practice, recall/reunion, record/crystal ordering, scenario dialogue and next-level index 6. Before the switch, C requires actual Lumo occupancy; after the switch the held mode persists but optics/rings are dormant.
- Local commits and a separate preview server are allowed. No deployment, external messaging, save reset on ports 5195/5196, or archive/removal of needed worktrees. The user explicitly requested merging this Level 06 slice into `test-develop` on 2026-10-22; that request supersedes this plan’s interim no-push/no-merge constraint for this slice only.
- Personal policy overrides skill defaults: all subagents/reviewers are Luna high/xhigh only, no fixed review-round waiver, no model escalation/fallback. Record concise evidence in the project report rather than introducing a general registry.

## File ownership

Recovery routing ruling: the exact filenames, canvases and ports below are the fixed interface, so Tasks 2–3 may be prepared while Task 1 finishes image generation. The asset worker alone writes `redesign-v2/`, the new export/raster-check scripts and `level-06-art-v2-integration.md`. The runtime worker alone writes the four runtime source files, existing affected check scripts, `docs/implementation/level-06-art-v2-runtime.md` and `artifacts/level06-art-v2-runtime/`. Root owns this plan. Runtime worker must not stage/commit while the asset worker owns the Task 1 commit, and must not change asset files. Task 4 requires the accepted manifest/pack and all actual checks; preparation is not a gate pass. Cost if this ruling is wrong: runtime placement must be revised if production cannot satisfy the declared fixed ports/canvases; preserve the visual/gameplay requirements and recheck before readiness.

Create/extend:
- `assets/levels/06-the-sleepless-tower/redesign-v2/sources/`: new original background/prop family generations; preserve the approved scene originals.
- `assets/levels/06-the-sleepless-tower/redesign-v2/sprites/`: normalized runtime-only exports; no mockups or contacts.
- `assets/levels/06-the-sleepless-tower/redesign-v2/production-manifest.json`: roles, sources, recipes, canvas/anchors/ports, palette, alpha statistics and source/export hashes.
- `scripts/export-level06-art.py`: reproducible normalization of saved sources, stable family transforms and safe output to the local v2 sprite folder.
- `scripts/check-level06-art.py`: meaningful raster/manifest checks, including dimensions, transparency, paired registration, nonempty content and matching hashes.
- `docs/implementation/level-06-art-v2-integration.md`: decisions, progress, source revisions, actual commands/results, screenshots and limitations.

Modify:
- `src/art/CampaignArt.ts`: isolated v2 preload entries and `getTowerArtKey(filename: string): string | null`.
- `src/levels/SleeplessTowerLevel.ts`: v2 render/state lookup, local detailed reuse, quieter labels/HUD strings and restrained feedback.
- `src/data/towerLayout.ts`: only necessary chamber/lever/record geometry and its authored display anchors.
- `src/scenes/CampaignScene.ts`: Level 06-only localized short HUD title; keep other indices unchanged.
- `scripts/check-sleepless-tower.mjs`: meaningful route/front-side/save/beam assertions affected by geometry. Preserve existing semantic coverage.
- `scripts/check-campaign-art.mjs`: extend only if the new preload family needs explicit coverage.

Do not change `PathForTwoLevel.ts`, Level 05 assets/scripts, global character frames, global HUD layout or other level routes. A small tower-only presentation helper is acceptable if it materially simplifies the controller; avoid a general scene framework.

## Review focus

1. State-family silhouettes/anchors must not jump, reveal a second baked crystal, or leave an old closed grille after Return Flow.
2. Newly framed chamber, lever and record must have reachable south stands; saved positions inside moved solids must restore safely.
3. Beams must meet registered glass/receiver ports; C must not appear to be powered by an optical branch. Missing signals must immediately show waiting.
4. Entry, placed-but-off, direct A/B, A+B without C, loss of one condition, held mode, collected crystal and revisits must each render their current state.
5. HUD/prompt/dialogue and depth ordering must stay legible at native resolution; new art must not cover a usable stand or leak into other levels.

## Task 1 — produce and normalize one cohesive modular family

**Consumes:** the approved `sources/01-entry.png`, `02-powered.png`, `03-return-flow.png`, brief, reuse manifest and retained Level 04/05 references.
**Produces:** the local runtime pack and `production-manifest.json`; `export-level06-art.py` and `check-level06-art.py` command-line entry points run from the repo root.

- [x] Inspect the approved mockups at 640x360 and existing reusable sprite canvases. Record the selected production seed; no new design approval round is needed for routine corrections within this approved direction.
- [x] Generate/edit a clean `tower-scene-base.png` from the approved direction: the existing circular stone room and lower-left stairs, restrained forest/window contrast, open playable floor, no dynamic props/actors/effects. Align the static image to the existing gameplay floor, rather than moving the whole optical network to approximate illustration coordinates.
- [x] Produce missing art as small related families using reference edits: `G0-to-{splitter,A,B}` 40x48; `prism-{dark,receiving}` 48x48; `ring-{A,B,C}-{off,on}` 24x24; `tower-lamp-{white,dim}` 72x72; `fountain-{up,down}` 56x112; `return-flow-{waiting,held}` 40x48; `chamber-open` and aligned `chamber-grille-overlay` 80x104; `record-compartment-{closed,open}` 88x32; `window-faded-red-scarf` 112x112; `tower-{intake,outflow}` 112x32; a matching non-textual `voice-record-panel` at its existing intended canvas. Generate only genuinely missing assets; reuse existing detailed families without re-generating them.
- [x] Register optical landmarks to the existing solver: source 32x44 local (16,17); branch mirrors 32x40 local (16,15); receivers 24x24 local (12,12); G0 40x48 local (20,21); prism input/left/right (24,30)/(7,30)/(39,30). Use a common transform for each state family. If actual reusable art's landmarks differ, record and correct the registration locally, not the solver truth table.
- [x] Keep Hope as the original separate collectible, composed behind the removable grille. No second crystal painted into chamber art. The record opens only after collection. Plain A/B/C labels and functional UI text remain code-native.
- [x] Normalize with preserved aspect ratios, fixed canvases, bottom-center anchors for standing props and documented centered anchors for wall/floor pieces. Retain source-generated colors rather than force a common <=128-color quantization, which the production manifest records as incompatible with preserving the source glass/glow detail.
- [x] Retain the existing exploratory alpha finding: 12 candidate sources peak at alpha 253/254, not 255. Do not silently close the recorded probe or harden glass indiscriminately. If normalizing a copied local export, record that transform and inspect it; leave original sources intact.
- [x] Run `python scripts/export-level06-art.py` followed by `python scripts/check-level06-art.py`. Expected: nonzero exit on a mismatched canvas/hash/anchor/alpha contract, zero only when the declared checks pass. Save a contact sheet at 1x and nearest 2x; inspect against the actual background. Do not declare production readiness from generation alone.

## Task 2 — import and compose Level 06 art without global replacement

**Consumes:** Task 1's normalized pack, per-state names, dimensions and ports.
**Produces:** loaded tower-only texture keys and a runtime assembly with correct state updates.

- [x] Add a separate explicit glob for `../../assets/levels/06-the-sleepless-tower/redesign-v2/sprites/*.png` and unique `tower_v2_` keys in `CAMPAIGN_ART_FILES`. `getTowerArtKey(filename)` resolves this family, then the legacy Level 06 key as a missing-pack fallback. Do not let the existing path regex accidentally overwrite another family's keys.
- [x] In the tower controller use `getTowerArtKey` for new tower/prism pieces. For the detailed reused mechanism families use `getLevelArtKey(3, 'mechanisms/' + filename)` locally, with the existing shared key only as fallback. Index 3 is Level 04; the existing local variable named `art4` uses index 4 and is Level 05.
- [x] Make `drawMachine`, `drawBackdrop`, `updateVisuals`, and the recording panel use the same resolver decisions. Use data-derived ground/optical anchors and existing depth rules; retain aspect ratios and true contact with the floor. No fixed image texture should disagree with the live state.
- [x] Replace the large schematic status strip with the actual three physical rings and a subtle lever readiness cue. Ring centers become (283,120), (307,120), (331,120), displayed 24x24. All off after Return Flow. Keep tower lamp/fountain separate behind the scene's interaction depth.
- [x] Render beams dynamically from `deriveTowerLive`, never from a painted scene. Use narrow common-feed light and distinguishable branch accents, with a low-alpha underglow. Classify branch color from actual route ownership, not an arbitrary alternating segment index. Effects must not change logic or conceal endpoints.
- [x] Keep G0/G1/G2 labels available near the relevant interaction/hint rather than permanently covering props. A/B/C identifiers stay readable. Add only lightweight presentation such as contact shadows, restrained lamp/ring glow or a short lever response; clean up all owned tweens/objects on destroy.
- [x] Run `node scripts/check-campaign-art.mjs` and inspect a real engine load for missing textures, duplicated background machinery and an original Hope behind the correct grille depth.

## Task 3 — fit the right-side cluster and preserve gameplay geometry

**Consumes:** `TOWER`, `TOWER_SOLIDS`, `towerBodyRect`, `towerCanApproachFront`, `resolveTowerSpawn` and the normalized art dimensions.
**Produces:** reachable framed chamber/lever/record, with unchanged optical network and save semantics.

- [x] Keep the current source/prism/G0/G1/G2/receiver/call/C/spawn/stair positions. Mockups authorize materials and composition; they do not require copying their unvalidated gameplay coordinates.
- [x] Move the chamber center/stand/crystal x from 600 to 580: stand (580,288), solid (540,180,80,104), crystal (580,232), ground (580,284). Move lever to ground (515,232), base (504,222,22,10), stand (515,254). Move record stand to (532,192). Author window/record centers (565,92)/(565,156) in layout data and consume them in rendering and prompt protection. Chamber and window now retain at least a visible right margin.
- [x] Before accepting these candidate coordinates, extend the existing route checks to prove foot-body clearance and all stands reachable from spawn and each other. Re-evaluate the existing hardcoded lever side probes relative to the moved footprint; preserve the south-only rule and 1px tolerance. Do not delete assertions merely because coordinates changed.
- [x] Check north/east/west refusal and south acceptance for each footprinted interactable, chamber approach, record approach and return path. Check a saved position inside the moved chamber falls back safely. Preserve direct-A, direct-B, split-A/B, condition-loss, actual-C, permanent-switch and one-time migration tests.
- [x] If a candidate coordinate is unreachable, make the smallest documented adjustment using the same geometry source for visual, physics, beam, prompt and stand data. Do not claim a route passed without executing its check and runtime inspection.
- [x] Run `node scripts/check-sleepless-tower.mjs` and `node scripts/check-interaction-prompt-layout.mjs`. Expected: existing semantic assertions still pass and the moved cluster has valid routes/front faces.

## Task 4 — compact presentation and verify the actual game

**Consumes:** the integrated tower controller and existing CampaignHud API.
**Produces:** native-resolution gameplay captures with usable HUD/prompts and state transitions.

- [x] Shorten Level 06 objective/status strings so the mission plate fits within y=0..58. Keep detailed teaching text in the existing H/J flows. Preserve the scenario's authored H ladder and story dialogue exactly. Status can be `A ○ · B ○ · C ○ · Nước ↑/↓`; include stage-specific information through the goal/H flow rather than a second long HUD paragraph.
- [x] Localize only the index-5 HUD title to `06 · Ngọn Tháp Không Ngủ` in CampaignScene's existing title assignment. Retain the shared 248px plate width and existing font; do not redesign the global HUD. Measure its real height and prompt overlaps in engine for every tower step.
- [x] Start and retain the worktree preview on verified free port 5197 with --strictPort; use only a separate-origin fixture save for index 5, leaving ports 5195 and 5196 untouched.
- [x] Capture actual entry, ABC-live, and post-Return-Flow images at 640x360 and 1280x720; label fixture captures and keyboard-driven playthrough separately in the integration report.
- [ ] Capture focused visual states for placed-but-off, one direct receiver, AB-without-C, a lost condition, and collected/revisited states.
- [x] Use real game inputs for the lever south/east approaches, Hope collection, and record access; verify A/B/C indications and saved Return Flow after reload. Remove any temporary bootstrap HTML; no debug bypass in shipped product code.
- [x] Complete an uninterrupted browser playthrough through lantern pickup/retrieval and Lumo departure/arrival/recall; separately exercise the optional practice using real inputs.
- [x] Run `npm run build` plus `node scripts/check-sleepless-tower.mjs`, `node scripts/check-campaign-art.mjs`, `node scripts/check-campaign-hud.mjs`, `node scripts/check-interaction-prompt-layout.mjs`, `node scripts/check-campaign-save.mjs`, `node scripts/check-campaign-runtime.mjs`, `node scripts/check-shattered-creek.mjs`, and `node scripts/check-path-for-two.mjs`. Run additional existing checks only when a changed interface or failure justifies them. Do not add mirror-of-implementation tests.
- [x] Record commands and actual exit/output evidence as PASS/FAIL/NOT_RUN, a binding source commit/hash, screenshots, export hashes and remaining limitations in the integration report. Missing generation/browser tooling blocks its dependent deliverable; preserve the actual error and do not substitute a procedural sketch or claim a screenshot proved behavior.

## Task 5 — freeze, independent review and delivery

- [x] Self-review the owned diff and report; stage only Level 06 files and make the local commit. Keep approved originals/prompts reproducible and exclude unrelated Level 05 changes from the slice. Rebase on the latest test-develop target and run final applicable checks on the frozen candidate.
- [x] Obtain two separate independent read-only Luna reviews on frozen implementation commit cfe57ecb6345e7f75cacfdcdc9b0d154576b599c: reviewer A (gpt-6-luna, high) covers assets/state assembly/provenance; reviewer B (gpt-6-luna, xhigh) covers geometry/interactions/saves/HUD/cross-level regression.
- [x] Preserve the two reviews separately until both completed, then reconcile: both returned no findings on cfe57ecb6345e7f75cacfdcdc9b0d154576b599c. No corrections or re-review were required.
- [x] Return delivery evidence: managed worktree on test-develop, reviewed implementation commit/hash, changed-file scope, export and runtime verification, both review results, preview URL, remaining limitations, and verified remote update are recorded in the integration report and Codex task.

## Root plan self-review

- Coverage: asset family/normalization (1), isolated import/state/render/depth (2), collision/prompt/restore (3), native HUD/runtime evidence (4), independent final review/delivery (5).
- Shared interfaces: 1 supplies exact names/ports to 2; the declared names/canvases/ports permit disjoint runtime preparation during source generation. Tasks 2 and 3 consume one `TOWER` geometry; Task 4 waits for Task 1 QA and Task 3's footprints; Task 5 freezes all preceding outputs. File ownership and commit sequencing above prevent concurrent edits to shared files.
- Existing work is protected by managed-worktree isolation and narrowly scoped commits. Static mockups remain distinct from engine evidence. Existing alpha observations remain recorded rather than silently waived.
- User already selected Luna execution and approved the visual target. This plan carries that authorization into the production slice; no repeated confirmation or new style interview is needed.

## Recovery run — 2026-10-21

User request: “Hoàn thiện nốt đi”. Resume persisted sources; do not repeat completed image generations. Collaboration metadata exposes `gpt-6-luna` with `high` and `xhigh`; both workers use `high`. Dispatch acceptance is recorded in the task; resolved identity remains unknown unless exposed. Root coordinates commits, plan checkboxes and shared ledger after workers stop writing. Workers do not commit or edit this plan/shared ledger. Existing disjoint ownership permits bounded asset and runtime preparation; runtime engine verification waits for the accepted sprite pack. Personal policy controls independent review and unlimited correction/re-review; no skill model escalation, waiver or automatic merge.


## Execution status — 2026-10-22

- Tasks 1–3: PASS in the isolated local `test-develop` worktree; evidence is in `docs/implementation/level-06-art-v2-integration.md`.
- Task 4: PASS. HUD, build, automated checks, native engine captures, focused fixture states, real-input practice, and uninterrupted Level 06 progression passed; preview remains available at http://127.0.0.1:5197.
- Task 5: local commit, target rebase, final verification, both independent reviews, and user-authorized push to origin/test-develop PASS. Deployment remains out of scope.
