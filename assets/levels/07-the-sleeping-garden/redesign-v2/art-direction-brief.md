# Level 07 — The Sleeping Garden: art v2

Date: 2026-10-22. Baseline: `9f792416d926475e6dc44924de5068aa8dca8daf`
(`test-develop`). The user approved the short visual direction in this chat and
requested production. Gameplay source: `docs/scenario/07-the-sleeping-garden.md`.
The draft in `docs/scenario-v2/` is contextual, not the active gameplay contract.

## Intended experience

A quiet garden after the machinery of Level 06. Too much accumulated light keeps
the Sun Flowers open while young plants fail to grow. Covering the reservoir,
holding the gate with a latch, and crossing living roots in darkness bring water
to a seedling. The reward is a single new leaf, moving water, and a garden at rest.

## Visual direction

- Fixed elevated three-quarter pixel art, 640x360 native, nearest filtering.
- Cool slate, blue-green foliage, muted moss, cream flowers, restrained brass and
  wood; warm light belongs to the reservoir and the original character lantern.
- Clear silhouettes, sparse contact shadows, readable joints and handles; calm
  walkable floor. Follow Level 06 v2 material detail without copying its machinery.
- Sun Flower states differ by open/folded silhouette; Moon Root states differ by
  coiled/deployed geometry. Keep the existing state icons as an extra shape cue.
- The held wooden bar has a visible brace. Root spans read as interwoven roots,
  with a distinct temporary held state. The return route reads as stone, separate
  from the living bridge. The drain shows a real sluice aperture.
- Water arrives through a shallow channel. The seedling gains exactly one leaf.
- Reuse original Nhinh, Lumo, Sun Flower, Moon Root, seedling and shared Shadow
  frames where they already meet the direction. No new character design.

## Scope and dependencies

Produce versioned local background/mechanism candidates and inspect assembled
entry, light/gate, dark/bridge, safe-retraction and restored-nursery states.
Retain the original bundle for comparison and fallback. Route new local art into
the current controller only when native canvas and geometry contracts hold.

All collision rectangles, actor anchors, trigger stands, puzzle conditions,
dialogue, hints, save flags and required return latch retain their current contract.
The background must keep the existing garden outline, canal, crossings, walls,
shrine gate and floor openings. Generated scenery that drifts from those footprints
is a concept candidate and cannot replace the playable base.

## Native production constraints

- Reservoir: 80x72. Shutter handle: 24x40. Bar: 112x72. Drain: 52x48.
- Root spans: 48x32. Side path: 80x32. Latches: 28x32. Water: 128x24.
- Raised/held bar rows 0..29 are the overhead beam. West post crop is x0..15,
  y30..71; east post crop is x96..111, y30..71. Art must respect this split.
- RGBA props, stable canvases/pivots across states, no labels baked into sprites.
- Reserve top y0..57 and bottom y320..359 for the current HUD.
- Preserve source generations, exact prompts, normalization/crop records and hashes.
- Built-in image_gen is the image source. Its backend model/version is unknown.

## Verification approach

Inspect sources and native exports, confirm PNG decode/dimensions/alpha and state
alignment, run the existing build and Sleeping Garden/campaign-art checks for any
runtime integration, and inspect actual browser scenes. Code integration receives
two independent read-only GPT reviews on the same frozen source revision as
required by the user's personal policy. Record actual PASS/FAIL/NOT_RUN results.
