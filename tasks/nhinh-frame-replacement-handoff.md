# Nhinh Frame Replacement — Handoff

Status: COMPLETED (pending user playthrough of 10 puzzles and ending). Changes are committed on `codex/nhinh-frame-replacement`; PR #4 is open to merge that branch into `main`.

## Request

Retire the old `src/assets/player_*.png` character frames. Use the newer 8-direction Nhinh pack and fill its missing persistent poses so idle, walk, and run work while the lantern is lit or not held.

## Done

- Removed all 72 tracked `src/assets/player_*.png` files and their 72 manifest keys.
- Removed procedural generation for the old `player_*` frames.
- Updated runtime selection in `src/actors/Player.ts`; campaign, menu, and ending now use `assets/character/` Nhinh frames loaded through `src/art/CampaignArt.ts` (with `*contact_sheet*.png` excluded from the runtime glob).
- Added all 112 missing persistent state variants across all 8 directions (`down`, `downleft`, `left`, `upleft`, `up`, `upright`, `right`, `downright`). Each direction has `idle_lit_0`, `walk_lit_0..2`, `run_lit_0..2`, `idle_nolamp_0`, `walk_nolamp_0..2`, and `run_nolamp_0..2`, without overwriting any of the 128 base `nhinh_*` frames.
- Source sheets and prompts/provenance are stored under:
  - `assets/character/source_sheets/state_variants/worker_down/` (`down`, `downleft`)
  - `assets/character/source_sheets/state_variants/worker_udr/` (`up`, `downright`)
  - `assets/character/source_sheets/state_variants/worker_lr/` (`left`, `right`, `upleft`, `upright`)
- Merged all 240 entries (128 core + 112 state variants) into `assets/character/frames.json` and updated `assets/character/validation.json` (`result: "PASS"`, `errors: []`).
- Created combined contact sheets `assets/character/nhinh_state_variants_contact_sheet.png` (`1672×1340`, 8 directions × 14 variants) and `assets/character/nhinh_all_poses_contact_sheet.png` (`3400×1340`, 8 directions × 30 poses).
- Added catalog overwrite protection in `assets/character/prepare_frames.py` (requires `ALLOW_CATALOG_OVERWRITE=1` if `frames.json` already contains > 128 frames).
- Updated `assets/character/README.md`, `assets/levels/README.md`, and `tasks/todo.md` with current 240-frame totals and prototype limitations.

## Verification status

- Consolidated 240-frame audit (`assets/character/validation.json`): PASS (`240/240` `36×42` `RGBA` PNGs, transparent background, foot baseline `y=40` on all 224 non-pulse frames, unique walk/run triplets, 240 unique SHA-256 hashes, 128 core frame hashes preserved, 0 `src/assets/player_*.png` remaining).
- `npm run build` (`tsc --noEmit && vite build`): PASS (`dist/index.html` built cleanly with 0 errors and contact sheets excluded from runtime bundle).
- Runtime menu smoke check: PASS (verified via isolated localhost server + headless Edge screenshot rendering `THE LAST LANTERN` menu and live Nhinh sprite in the background hub; full 10-level puzzle and ending playthrough reserved for the user).
- Historical review note from the earlier implementation revision: Reviewer A passed; Reviewer B could not run because of a 429 quota error, so the root agent performed a catalog audit. Current integration review status is tracked on [PR #4](https://github.com/iamkhai-ai/The_Last_Lantern/pull/4).

