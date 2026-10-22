# Level 09 — redraw with depth

The user rejected v2's coarse, flat art and requested a more detailed redraw.
The previous deliverable and its checks remain historical, not approval of its appearance.

## Visual corrections

- Preserve scenario-v2 and every geometry/stand/collider from 09-layout.md.
- Use convincing top and south faces, thick stone chamfers, recessed masonry and contact shade.
- Slate has broad irregular value patches and sparse worn edges; no repeated tiny polygon tiles.
- Brass is dark and oxidized, with selective worn highlights and actual articulated joints.
- The broad statue has carved drapery and a weighty foot, rather than a flat bottle silhouette.
- Roots have twisted raised bodies, deep interstices and a readable bridge lane.
- Cool blue-white moonlight is the environmental key. Warm lantern and amber memory/root states remain local accents.
- Empty walkable floor, unchanged openings, separate state props/actors, no text or baked HUD.

## Work record

Scope: replacement visual family, source prompts, offline room/state/memory reviews, normalized assets and manifest where authorized by the size constraint.
Dependencies: scenario-v2, authoritative layout, previous frozen layout snapshot, Level08 camera and Level06 material reference.
Risk: image generation does not reliably return the requested native/2x dimensions; the first new source is 1672x941.
The user explicitly approved nearest-neighbor normalization of the new generated sources in this conversation. Originals are retained and every crop/fit is recorded. Generated art targets are reference images, not validated runtime sprites.
Verification: raster decode/alpha/dimensions/hashes, exact layout placements and masks, visual examination at game scale. Engine integration/collision/browser play remain outside this art-only task.

Selected visual target: observatory-art-target.png. The richer materials and modeled volumes are suitable as the shared style source. Extra decorative conduit segments in the north wall must be removed from production output. Do not reuse this full composite as a clean runtime background: its devices are baked in.
