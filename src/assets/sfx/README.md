# Sound Effects (Sound Effect Lab)

This folder holds curated SFX downloaded from Sound Effect Lab
(効果音ラボ, https://soundeffect-lab.info/).

License: free for commercial use, no credit required, game embedding OK.
Redistribution prohibited — these files are for use inside this game only.

## How to populate

Run the download script from the project root:

    pwsh -File scripts/download-sfx.ps1

It downloads the curated list (see scripts/download-sfx.ps1) into this folder
as `<key>.mp3`. The game loads them in BootScene and plays them via SoundSystem.

If a file is missing, the game falls back to the procedural WebAudio tones
in SoundSystem, so the game always runs.

## Curated keys

ui_click, ui_cancel, ui_success, ui_levelup, ui_item_get, ui_item_get2,
lantern_on, lantern_off, light_pulse, rune_activate, puzzle_solved,
puzzle_error, mirror_rotate, door_open, door_close, gate_open,
footstep_grass, footstep_soil, ambient_creek, crystal_pickup
