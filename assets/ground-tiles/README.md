# Ground tiles

The campaign and legacy world backgrounds use 36×42 px repeating ground textures, matching one Nhinh frame (`assets/character/`).

| Runtime key | File | Source art |
|---|---|---|
| `ground_grass` | `src/assets/ground_grass.png` | `sources/ground_grass_generated.png`, generated with `src/assets/tile_grass.png` as style reference |
| `ground_dirt` | `src/assets/ground_dirt.png` | `sources/ground_dirt_generated.png`, generated with `src/assets/tile_dirt.png` as style reference |
| `ground_stone` | `src/assets/ground_stone.png` | `sources/ground_stone_generated.png`, generated with `src/assets/tile_stone.png` as style reference |

Runtime files are opaque RGBA PNGs at exactly 36×42 px. They are reduced with box resampling and a 16-color palette. Both `CampaignScene.drawRoom()` and `WorldFactory` render them in `TileSprite` objects at native scale; biome tinting and the existing foreground geometry remain in place. The original 184×184 px textures are retained for any remaining callers.
