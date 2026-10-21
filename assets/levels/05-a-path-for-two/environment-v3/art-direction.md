# Level 05 entry environment — visual target

Status: first-room preview; direction approved by the user on 2026-10-21, final art pending review.

## Scope

Replace only the entry room environment. Keep all current v2 object sprites, three-room topology, walls/solids, calls, thresholds, stands, Lumo routes, dialogue, saves and HUD unchanged. Relay and ink rooms remain on their existing rendering until the entry target is accepted. No changes to Levels 01–04 or the shared lighting system.

## Technical frame

- Phaser 3, TypeScript, top-down 2D RPG view; fixed 640×360 native canvas.
- One opaque 640×360 environment base at origin (0,0), behind runtime object sprites; nearest filtering, no mipmaps.
- Low-contrast 592×230 main floor at x24..616/y80..310. Architecture must follow `PATH_ROOMS.entry.walls` exactly.
- Existing doorway sprites occupy x124..188/y122..210 and x448..512/y122..210. The 44px clear passages stay unobstructed; do not bake gates, arches, posts or fake controls into the background.
- Existing actor is 36×42 with a 14×6 foot body. No new standing decorative props, pits, steps or water surfaces on walkable ground.
- Runtime owns calls/plates/doors/latches/pipe/root-cable state, schematic, actors, lighting and UI. The painted base contains none of them.
- Source masters and geometry reference live outside sprites/*.png so they are not inlined into the game bundle.

## Visual system

Old waterworks beneath the forest, damp slate masonry and aged brass, quiet and approachable rather than horror. Three values: dark architectural framing, subdued mid-value flagstone floor, highest local detail/contrast reserved for existing objects. Cool slate/teal-grey stone, desaturated moss only in joints, restrained warm-grey worn walking lanes. Large hand-placed stone clusters rather than uniformly noisy small cobble. Directional contact shading and masonry caps communicate thickness without changing the floor silhouette.

The water station is running nearly dry: mineral tide marks, damp seams, small stains and shallow carved channels within solid masonry; no large decorative pools or luminous cyan markings that imply gameplay. No new doors or stairs. Keep the floor around each control quiet and level. Top y0..80 and bottom y310..360 are subdued architectural/HUD-safe framing.

Style references are the project's station-scene-base.png (materials only, NOT its geometry), current entry runtime screenshot (placement only), and the geometry plate. Never reuse the base's baked tanks, intake, stairway or pillars.

## Production and acceptance

Use GPT Image 2.5 Sunburst as a controlled reference edit. Preserve the raw returned source and tool/model/reference IDs. Normalize with Pillow using nearest-neighbor, preserve any embedded metadata where supported, and track hashes/processing in the manifest. No claims about legal terms beyond generated-by-tool provenance; release rights require project-owner review.

Inspect the native asset, then the actual entry room with the current v2 objects under lantern on/off and closed/open gates. Check absence of baked objects/UI, exact footprint alignment, readable paths and small sprites, and door clearance. Run focused renderer check, full existing Node checks, TypeScript and production build outside tracked dist/. Final art approval remains with the user.
