# Level 06 — visual target v2

Date: 2026-10-21. Baseline: `8bf1bb0241868f9908be360d6c17e3e14c14d953`.
User approved the cohesive pixel-art direction and the first delivery of three
matching mockups, and explicitly allowed reuse of existing mirrors and lamp bases.
This folder contains art development; it is outside the runtime sprite import glob.

## Game frame

- Player fantasy: understand an ancient tower that keeps burning because a father
  is waiting, then return its stolen water to the forest.
- Core verbs: place/retrieve a lamp, aim mirrors, split a beam, call Lumo, switch
  Return Flow, collect Hope, listen to a recording.
- Engine: Phaser 3, TypeScript, Vite; 2D browser game with `pixelArt: true`.
- View: fixed elevated three-quarter view; standing props expose their top and
  south face. No free camera, perspective switch, or new room.
- Native viewport: 640x360; review at 1x and integer 2x enlargement.
- Existing logical sizes: mirrors 32x40; sources 32x44; receivers 24x24;
  prism 48x48; lever 40x48; chamber 80x104; call station 40x48; C plate 44x28.
- Character frames, approved dialogue, puzzle semantics and saved progress are
  authoritative. Mockups are visual targets, not validated collision layouts.

## Visual system

- Shape: weighty circular stone bases, inset brass rings, readable glass facets,
  narrow articulated handles, broad structural silhouettes.
- Materials: chipped slate with sparse moss; tarnished brass with selective warm
  edge highlights; dark glass that brightens only when powered; faded red cloth.
- Edge: deliberate pixel clusters, dark colored edges, restrained internal noise.
  No flat schematic placeholders, pseudo-vector outlines or photoreal material noise.
- Value: low-contrast environment; medium-value interactive objects; concentrated
  light around Nhinh, optical endpoints and the active tower lamp.
- Palette roles: deepest shadow #101D27; stone #293E48 and #52666B; brass #806341
  and #BD975B; lantern #E8BF72; live optics #83D3D5; Hope #50B7CE;
  faded scarf #934B46. These are direction swatches, not a claim that generated
  images already obey an indexed palette.
- Lighting: cool ambient from upper right, restrained white tower illumination,
  warm local lantern light. Windows stay subordinate to the machine and actors.
- Detail density: quieter walkable floor; detail at device silhouettes, joints,
  staircase boundary and story window. Modest floor contact shadows ground props.
- Motion direction for later production: weighted mirror stops, restrained
  gear rotation, directional water pulses, a clear persistent lever latch.
- Exclude: added story events, a person/ghost in the window, any conclusion about
  the daughter, Lumo's unrevealed history, extra doors, hazards or blocked paths.

## Composition and reuse

- Keep the circular tower room and lower-left staircase recognizable.
- Separate optional practice on the left, the main optical machine in the open
  center, and chamber/lever/window/recording on the right.
- Bring the chamber fully inside the image. Any future coordinate change must
  update art, optical routes, colliders, south-side stands and reach checks together.
- Use existing Level 04 ornate stone/brass mirrors, sources and receivers as the
  material reference and candidates for exact reuse. The current tower still
  points to older shared schematic versions; generation is not required for these.
- Reuse Level 05 call/pressure/tube visual vocabulary and original character and
  Hope sprites. Do not overwrite globally shared assets to improve a single level.
- Future background exports exclude characters, beams, state indicators and dynamic
  machinery. Mockups may show these assembled for visual review.
- Reserve the top 0..58 and bottom 320..360 native-pixel bands for compact HUD text.
  Functional text and prompts stay code-native; mockups contain no baked labels.

## Three state targets

1. Entry: tower lamp white, water feeds upward; main source empty; A/B/C dormant;
   chamber closed with Hope visible; record compartment closed; Nhinh holds the
   lantern and Lumo follows.
2. Simultaneous power: lamp placed on main source; G0 feeds the prism; two distinct
   branches pass through G1/G2 to A/B; Lumo occupies C; three indicators live;
   lever still waiting and chamber still closed. Practice remains independent.
3. Return Flow, before Hope collection: lever latched; tower lamp dim; water flows
   down toward the staircase; A/B/C and beams dormant; chamber open, Hope still
   inside; lamp retrieved, Lumo following; record still closed until collection.

All images use the same room, framing and device family. Generation edits are
checked for structural drift. An attractive image cannot prove engine behavior.

## Technical contract and acceptance

- Generated originals are preserved under `sources/` with prompt and reference
  records. Normalized mockups use opaque indexed PNG at 640x360 and nearest
  1280x720. A single 128-color palette is derived from all three scenes with
  MEDIANCUT, without dithering; the exact colors are in `palette.json`.
- Any needed fitting is proportional and recorded; never stretch character frames.
- Final sprite candidates will require RGBA with real transparent background,
  stable bottom-center anchors, registered optical landmarks and per-state canvases.
- Current delivery budget is three scene sources/previews, not a complete sprite
  pack. Do not label an illustrative device as an engine-ready export.
- Raster QA: decode, dimensions, modes, hashes and palette statistics using the
  create-game-assets tooling; inspect the mockups at native scale.
- Visual checks: cohesive perspective/materials, legible actors and devices,
  unclipped chamber, quieter floor and readable differences across all states.
- In-engine checks, collision checks, complete sprite extraction, animation and
  implementation review remain NOT_RUN until those deliverables exist.

## Approval and provenance

- Direction approval: user in this Codex conversation, 2026-10-21.
- Individual generated-image approval: pending user visual review, not inferred from
  the user's approval of the approach.
- Skills: `create-game-assets` from the user's local Claude skills directory;
  built-in `imagegen` skill for image creation/editing.
- Image backend model/version is not exposed by the built-in tool; record unknown.
- Existing asset origins remain in their level manifests. This delivery does not
  assign new licensing terms or claim an additional rights review.
