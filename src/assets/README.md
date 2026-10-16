# Legacy sprite assets

`src/assets/` holds 63 PNGs used by the legacy manifest and procedural fallback system. The manifest currently contains 75 keys; 12 missing entries are supplied by `src/art/ProceduralTextures.ts`.

## Nhinh

The former `player_*.png` character frames have been retired and removed from this folder and from `src/art/assetManifest.json`. The game loads Nhinh's replacement 8-direction frame set from `assets/character/` through `src/art/CampaignArt.ts`.

See [`assets/character/README.md`](../../assets/character/README.md) for the frame list, provenance, dimensions, and validation status.

## Loading

`src/art/AssetLoader.ts` loads the remaining manifest sprites and the selected campaign art. Missing legacy manifest entries continue to use procedural textures where available.
