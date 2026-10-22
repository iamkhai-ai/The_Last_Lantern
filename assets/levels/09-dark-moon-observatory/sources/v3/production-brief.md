# Level 09 redraw v3 — offline art contract

## Authority and scope

The visual and story source is `docs/scenario-v2/09-dark-moon-observatory.md`. Every room, wall,
alcove, stand, anchor and root-lane rectangle comes from the byte-verified copy of
`sources/v2/layout-contract.json`; its authority inputs are hashed again at normalization and
validation time. This package changes offline artwork only. Runtime code, registration, shared
assets and collision data are outside scope.

## Art direction

Use finely modeled pixel art with convincing stone top and south faces, thick chamfers, recessed
mortar, irregular broad value patches and sparse worn edges. Brass is dark and oxidized, with
selective highlights on articulated joints. Cool blue-white moonlight is the environmental key;
lantern and amber memory/root states remain local accents. Keep floors quiet and empty, preserve
all openings, and keep devices, actors, state props and HUD out of the architectural backgrounds.
No text, labels, pseudo-writing, baked beam or HUD.

## Source and normalization contract

The eighteen generated sprite family sheets and three generated clean-room backgrounds in
`sources/v3/` are retained unchanged. The user explicitly approved nearest-neighbor normalization
of these generated originals. `normalize-assets.py` discovers low-alpha sheet gutters, crops
content whose bounds are found using alpha >=128 while preserving the original source alpha within
each crop; it uniformly fits sprites to frozen native canvases and records source hashes, cell
bounds, crop sizes, fit sizes, offsets and anchors. Room backgrounds use the generated source's
floor and masonry material samples, placed only inside the frozen floor, alcove-threshold, wall and
jamb rectangles; the frozen door recess remains open, and exact HUD bands are set to the contract's
flat void color. The source plate uses nearest-neighbor uniform cover before sampling, and floor
texture receives a modest brightness/contrast reduction to keep walkable surfaces quiet. No generated
pixels are silently stretched. Existing Level 09 v2 files are reused only
where `normalization-map.json` explicitly permits minor floor/path/threshold stamps, transparent
memory/blank derivatives or unchanged shared actor references.

Standing objects retain bottom-center pivots. Pipe frame order is recorded explicitly: horizontal
on/off, then vertical on/off. Each straight source segment is uniformly fitted to its native
cross-axis and repeated along its run. The wheel appears as a separate observatory layer. The final
door preview opens when sun power is active or the final latch is solved. The observatory loop path
uses generated floor material under its exact historical v2 alpha mask. The root bed remains 44×148
with its central lane at relative y=50..98. The bridge state alone has a deck; the unpowered shadowed state is dark and
retracted. The Lumo tube reserves its first 2 canvas rows and the seal its first 10 rows as
transparent. The observatory return-loop arch retains a 48×48 canvas with visible content limited
to the 48×36 geometry rectangle and six transparent rows at top and bottom.

## Reviews and validation

`compose-reviews.py` creates offline 640×360 room/state/memory boards and native contact sheets.
They are placement evidence, not engine captures. `validate-assets.py` checks raster decode, exact
sizes and alpha, hashes and provenance links, source-family coverage, frozen authority hashes,
HUD bands, layout placements, root lane/state differences, special alpha clearances and malformed
asset negative controls. These machine checks do not decide visual quality. Human inspection
remains pending until recorded in `visual-review-v3.json`.

## Status boundary

This is an offline art package. `engine`, `collision`, browser play and runtime rendering remain
`NOT_RUN`; this document does not grant asset appearance approval or runtime readiness.
