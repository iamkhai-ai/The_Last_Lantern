# Nhinh Frame Replacement — Handoff

Status: WIP. Work is on branch `codex/nhinh-frame-replacement`.

## Request

Retire the old `src/assets/player_*.png` character frames. Use the newer 8-direction Nhinh pack and fill its missing persistent poses so idle, walk, and run work while the lantern is lit or not held.

## Done

- Removed all 72 tracked `src/assets/player_*.png` files and their 72 manifest keys.
- Removed procedural generation for the old `player_*` frames.
- Updated runtime selection in `src/actors/Player.ts`; campaign, menu, and ending now use `assets/character/` Nhinh frames loaded through `src/art/CampaignArt.ts`.
- Added 56 of the 112 missing variants for directions `down`, `downleft`, `up`, and `downright`. Each has `idle_lit_0`, `walk_lit_0..2`, `run_lit_0..2`, `idle_nolamp_0`, `walk_nolamp_0..2`, and `run_nolamp_0..2`.
- Source sheets and prompts/provenance are under `assets/character/source_sheets/state_variants/worker_down/` and `worker_udr/`.
- Frame workers report PASS for 36×42 RGBA, transparent background, y=40 foot baseline, unique walk/run triplets, and hashes. `nhinh_down_idle_nolamp_0.png` was enlarged to match the core idle scale.

## Blocker

The other four directions (`left`, `right`, `upleft`, `upright`) still need 56 variants. `Player.updateTexture()` currently throws if the requested state frame is missing. Do not play the game until all 112 variants exist.

## Next steps

1. Generate the 56 remaining PNGs with the exact state/frame names above. Keep the existing `nhinh_{direction}_idle_0.png` base frames; do not overwrite them. Put output and provenance in this worktree, under `assets/character/source_sheets/state_variants/worker_lr/`.
2. Confirm the expected 112 variant names exist exactly once, dimensions/mode/alpha/baseline and hashes are valid, and no `src/assets/player_*.png` remain.
3. Merge the new entries into `assets/character/frames.json` (128 core + 112 variants = 240), update `validation.json`, and create combined contact sheets for all poses and the 14 new variants per direction.
4. Update `assets/character/README.md`, `assets/levels/README.md`, and `tasks/todo.md` with current totals and limitations. Protect `prepare_frames.py` from overwriting the combined catalog.
5. Run `npm run build`, then perform two independent read-only code reviews on the same final revision. Do a menu smoke check only; the user will play all puzzles and the ending.

## Verification status at handoff

- File checks for completed frame groups: PASS (worker reports; root still needs a consolidated audit).
- `npm run build`: NOT_RUN after the latest changes.
- Runtime smoke and full 10-level visual/playthrough: NOT_RUN.
- Two fresh independent reviews: NOT_RUN.
