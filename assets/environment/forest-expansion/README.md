# Forest expansion — style-matched draft

Created for Maps 1 and 2 on the test-develop worktree. These are static art assets for review; they are not registered, positioned or tested inside the game.

## Review

[Native-size comparison](style-comparison-native.png) shows existing game trees and bush at left, revised ancient trees at right, and eight new grass variants below. It is an offline contact sheet, not an engine screenshot.

The revision uses the actual game tree, bush, ground tile and a saved gameplay screenshot as direct model references. It replaces the initial overly fine-textured oak-like rendering with larger elongated leaf clusters, olive highlights and dark teal shadow leaves. Scene night lighting is not baked into the source assets.

## Deliverables

- [Revised ancient-tree sheet](sources/ancient-trees-style-matched.png): three distinct trees.
- [Revised roadside-grass sheet](sources/roadside-grass-style-matched.png): eight variants.
- [Native export manifest](native-sprite-manifest.json): crop boxes, sizes and origins for all 11 individual PNGs in the sprites-v2 directory.
- [Art direction](art-direction.md): approved scope and style correction notes.

Individual trees use 160x192 canvases. Grass uses 48x32 canvases with approximately 12-36-pixel-wide, 8-20-pixel-high content. Exports are trimmed from the generated sheets, nearest-neighbor sampled and padded. Source alpha contains mostly 249-252 rather than 255; exports normalize alpha to 0/255 at threshold 64 for crisp sprite edges. Source PNGs remain unchanged.

Origin is bottom center, (0.5, 1). Placement, depth, collision footprint and final scale still require a separate in-engine integration pass. No gameplay, runtime source files, existing sprite files or map data were modified by this asset-generation task.
