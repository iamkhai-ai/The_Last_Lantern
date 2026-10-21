# Level 06 art v2 — integration evidence

Status: implementation, focused runtime verification, practice exercise, and uninterrupted Level 06 playthrough are complete on local test-develop; independent reviews and the requested remote branch update are pending.

## Revisions and scope

- Target baseline: origin/test-develop at bf197311a33ca96157c0c13eef3bc037e1462f62; the Level 06 slice is integrated on top of that latest target.
- Source snapshot: `c94bf0c41582598b44e3b46afb93b0fbcdd7f2fc`, parent `8bf1bb0241868f9908be360d6c17e3e14c14d953`.
- The snapshot is a worktree archive commit, not a named art branch. Its Level 06 changes were applied selectively with a three-way patch on `test-develop`; the generated `dist/index.html` and temporary `level06-fixture.html` were excluded. No Level 05 source or asset changes were carried over.
- Scope includes the Level 06 v2 source/export pack, isolated texture lookup and runtime composition, local geometry changes, focused checks, reproducible exporter/raster checker, and this report.

## Implementation

The pack contains 26 runtime PNG canvases, retained image sources and prompts, export/QA manifests, 1x/2x contact sheets, and engine captures. `CampaignArt` registers only `redesign-v2/sprites/*.png` under `tower_v2_` keys; Level 04 mechanism art is resolved locally for the tower, with legacy Level 06 fallback. The tower uses registered ring centers, the moved lever/chamber, and authored window/record anchors. Dynamic beams remain driven by live puzzle state.

The first raster-check run exposed two checker defects: manifest source paths were relative to the art pack but resolved from repo root, and edge permissions were read from the previous loop entry. The checker now resolves sources from the art directory and checks declared edge contacts per asset. The exporter declares the visually reviewed frame/anchor contacts; other unexpected edge contacts still fail. The 1x and 2x sheets were inspected after export.

## Verification — rebased target tree before independent review

- PASS `python scripts/export-level06-art.py` — exported 26 assets.
- PASS `python scripts/check-level06-art.py` — 26 canvases, source/export hashes, alpha, optical ports, paired registration, and previews.
- PASS `npm run build` — TypeScript passed; Vite transformed 704 modules and built successfully. The tracked `dist/index.html` output was restored and is excluded.
- PASS `node scripts/check-sleepless-tower.mjs` — optics, live seal, steps, gates, geometry, routes, spawn, migration, and authored H ladder.
- PASS `node scripts/check-campaign-art.mjs` — 40 PNGs measured; isolated Level 06 art family assertions passed.
- PASS `node scripts/check-campaign-hud.mjs`.
- PASS `node scripts/check-interaction-prompt-layout.mjs`.
- PASS `node scripts/check-campaign-save.mjs` — 65/65 cases.
- PASS `node scripts/check-campaign-runtime.mjs` — 30/30 cases.
- PASS `node scripts/check-shattered-creek.mjs`.
- PASS `node scripts/check-path-for-two.mjs` — 22/22 cases.
- PASS `git diff --check`.

## Engine inspection — isolated origin http://127.0.0.1:5197

The full 640x360 Phaser scene loaded with all 26 tower_v2_ textures and no browser page errors. Initial, ABC-live, and post-Return-Flow images also exist at 1280x720. A keyboard run walked from the authored spawn to the lever south face and pressed E: all three live rings turned off, the objective changed to retrieval, and l5-water-returned was saved. Pressing E from the lever east side did not switch the mode. After reload, Level 06 restored Return Flow and all three rings remained off. Real E input from the chamber approach collected Hope; E at the record stand opened the voice panel and set the record-read state.

The preview is running at http://127.0.0.1:5197, started with --strictPort on a verified free port and retained for review. Ports 5195 and 5196 were left untouched. Browser fixtures used only this local origin.

An uninterrupted Level 06 playthrough used real keyboard input from the Level 06 entry save through lamp placement and lighting, G1/G2 alignment, Lumo call and arrival, Return Flow, lamp retrieval, crystal collection, record playback, Lumo recall and reunion, and the stair approach. The state reached all completion prerequisites; browser page errors were []. A separate real-input practice run placed the lantern on the practice stand while off, lit it, rotated the entry mirror to split the beam, latched practiceDone, retrieved the lantern, and placed it on the main stand. Its browser page errors were also []. These runs began from a local fixture save at Level 06; they were not full-campaign runs.

Fixture captures show placed-but-off, direct A, direct B, A+B without C, a lost branch, held Return Flow, crystal collected, and revisited completion state. Fixture captures are named runtime-fixture-*.png; keyboard-driven practice and full-playthrough captures use runtime-practice-*.png and runtime-playthrough-*.png.

Captures in assets/levels/06-the-sleepless-tower/redesign-v2/previews/:

- runtime-entry-640x360.png, runtime-entry-1280x720.png
- runtime-abc-live-640x360.png, runtime-abc-live-1280x720.png
- runtime-post-return-640x360.png, runtime-post-return-1280x720.png
- runtime-playthrough-lever-south-640x360.png
- runtime-post-return-reloaded-640x360.png
- runtime-record-open-640x360.png
- runtime-practice-placed-off-640x360.png, runtime-practice-split-live-640x360.png
- runtime-playthrough-entry-640x360.png, runtime-playthrough-abc-live-640x360.png, runtime-playthrough-post-return-640x360.png, runtime-playthrough-record-open-640x360.png, runtime-playthrough-complete-640x360.png
- runtime-fixture-placed-off-640x360.png, runtime-fixture-direct-A-640x360.png, runtime-fixture-direct-B-640x360.png, runtime-fixture-AB-without-C-640x360.png, runtime-fixture-condition-lost-640x360.png, runtime-fixture-held-mode-640x360.png, runtime-fixture-crystal-collected-640x360.png, runtime-fixture-revisited-640x360.png
## Historical orchestration note

The earlier implementation report recorded that dispatch to `/root/level06_art_impl` (`gpt-6-luna`, requested `xhigh`) hit the account usage limit. The actual runtime error was: “You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/settings/usage to purchase more credits or try again at 2:24 PM.” The runtime supplied no date/time zone; none is inferred. The later archive snapshot nevertheless contains the Level 06 implementation files. This task used those files, did not regenerate existing art, and did not use another model/provider.

## Remaining gates

- NOT_RUN: independent read-only Luna review A (assets, state assembly, provenance).
- NOT_RUN: independent read-only Luna review B (geometry, interactions, saves, HUD, cross-level behavior).
- PASS: uninterrupted Level 06 playthrough, optional practice, lantern pickup/retrieval, and Lumo call/arrival/recall used real inputs; browser page errors were empty.
- NOT_RUN: final verification and both independent reviews on this rebased revision.
- Final frozen commit and remote `origin/test-develop` update are pending the two required reviews and any corrections.
