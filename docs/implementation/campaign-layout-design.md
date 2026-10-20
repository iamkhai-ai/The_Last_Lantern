# Campaign spatial design

## Outcome

Each level must teach its rule in a reachable safe area, expose a readable main puzzle, and lead to an unmistakable exit. The player must never walk through a trunk, pedestal, statue, shelf, closed gate or water. Paths, clues, mechanisms and rewards must occupy intentional places, with E prompts reachable from the appropriate side.

## Architecture and scope

Keep the existing Phaser `CampaignScene`, 640×360 views, ten-level sequence, existing save key, and the three-room Observatory. Use existing character frames unchanged. Introduce small typed spatial data and geometry helpers consumed by rendering, collision, interaction, beam drawing and safe checkpoints; do not maintain disconnected copies of coordinates. Preserve existing puzzle flags/counters where compatible; compute live light/companion conditions rather than treating historical arrival flags as current power.

**Implementation scope (updated by the Levels 05–10 repair):** all ten levels are implemented as spatial slices and integrated; the geometry rules below apply to every level. Per-level layout documents (`01-layout.md` … `10-layout.md`) and reports are the record of each level's authored numbers. The note below that limited work to Level 01 was true for the first slice and is kept only as history. A worker reads the Level 01 scenario and layout before coding. Two independent read-only Luna high tasks review the same final frozen revision. Root reconciles findings and reruns affected checks after corrections. Do not introduce a universal level framework for this slice; a small Level 01 spatial module is sufficient.

## Coordinate and layering contract

- World is 640×360. Top HUD occupies y=0..58; bottom status/help occupies y=320..360. Main playable floors use y=80..310. Do not place important symbols under HUD panels.
- Layout tables give **ground anchors** for standing art and **player-center positions** for spawns and interaction points. Player frames are 36×42 with baseline y=40: feet are approximately `(sprite.x, sprite.y + 19)` at the existing centered origin. Keep the public Player center-coordinate API compatible with `WorldScene`.
- Use a shared depth function `10 + groundY / 10` for standing world objects and actor feet. Backgrounds/paths/water/shadows/footprints are depths 0..7. Effects remain 68..71; prompts/HUD/dialogue remain above them. Update actor depth/shadow even while dialogue locks movement. Never sort a standing object by its texture center or top edge.
- Ground stamps (rings, root marks, sockets, ink, bridge floor) remain below feet. Trees, rocks, shelves, standing tablets, mirrors, pedestals and statues sort by their base. A player behind a tree canopy is occluded; a player in front of the trunk draws above it. Canopy never replaces trunk collision.
- A gate is not a solid rectangle across its open arch. Its two posts remain solid; the passage is blocked only while closed. Header/lintel occlusion must not hide the entire traversable doorway. Use existing cutout art; do not flatten actors into a background.
- Native dimensions and aspect ratios from asset maps are preserved. Use integer scales when possible. No distorted tall sprites squeezed into square collision boxes. Do not regenerate or edit PNG files in this task.

## Spatial data

Provide one definition per level (and reuse typed Observatory room definitions) that owns spawn, floor bounds, authored paths, standing/ground props, interaction stand points, solid footprints, dynamic barriers, and safe checkpoints. Helpers may be named to fit the repo, but rendering, interaction, beams and physics must consume these definitions. Store object IDs on runtime objects so texture changes update one intended object, not every image near a coordinate. Every solid footprint must have visible corresponding art or architectural terrain.

## Traversal and interaction

- Main corridors at least 48px wide; narrow deliberate thresholds at least 36px. Account for the player's actual foot body, not only center points. Keep 24px of usable standing space in front of every control.
- Interaction stand points and actual art positions are distinct. Radius normally 24px; neighboring controls must have distinct nearest-target areas. Revalidate enabled state and range when E is pressed. Gates/doors give useful locked feedback; they do not disappear from interaction just because prerequisites are unmet.
- Avoid target points behind solids or across water/walls. Use a clear line from player feet to control, or authored same-side approach zones for doors/latches. Poem/memo interactions can be repeated after completion without monopolizing exits.
- F is available only after obtaining the lantern; Level 01 tablet needs lit lantern; Pulse teaching follows tablet reading. Do not expose spoilers in opening dialogue/HUD. Safe practice mechanisms do not contribute to main puzzle state.
- Lumo follows while unassigned, travels visibly when called, and only powers an assigned seal after actual arrival. A live seal is lost when he leaves, except after a mechanical latch commits it. Do not use stale `at-*` flags as power. Recall must have an accessible control on the relevant bank/room.
- Unlatched bridges/doors wait while occupied before retracting/closing. A player on a bridge cannot be converted into permanent power by a crossing flag. Mechanism changes retain intermediate progress and never erase discovered clues.

## Art composition decisions

Use ground tiles and reusable cutout props for layouts whose existing flat background contradicts the required geometry. In particular, the Creek background has TWO vertical water channels while the old code blocks one unrelated central rectangle; the Garden background has a VERTICAL canal while the old code blocks a horizontal one. Do not keep misleading baked paths under new collision. Compose the authored floor with existing water/grass/stone tiles and level sprites instead, retaining the level's props and palette. Backgrounds that match authored walkable geometry may be reused with explicit baked-obstacle footprints; a baked solid object cannot also be drawn a second time as a cutout.

## Save and restoration

Keep v1 save compatibility. Restore lamp state/placement, mirrors, latches and Lumo assignment first, compute live conditions, then resolve a reachable player spawn. For old saved coordinates now inside a solid or on an unavailable bridge, use the named checkpoint on the saved reachable side; do not teleport past an unsolved gate. Clear stale route state when changing levels. Do not clear the user's browser save to inspect the game. Default verification uses a dedicated port/origin with separate storage.

## Acceptance and evidence

For each level: a trace from spawn through practice, clue, puzzle, reward/story and exit; specific art positions and solid footprints; direct feedback for every changing mechanism; no overlapping exit/read interaction; no access to far-side controls through barriers; saved committed progress and safe loading. Completion conditions must match the scenario. Keep Vietnamese dialogue and English filenames.

Verification: `npm run build`, meaningful pure geometry/state checks for collision reachability, near-side controls and safe restore, and browser inspection of layering/solid footprints if tooling is available. Full human puzzle/ending playthrough remains the user's review; do not claim it passed from injected completion flags. Report PASS / FAIL / NOT_RUN with checked revision. Local server used for inspection is stopped afterward.
