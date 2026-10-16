# Level 04 — Suối Trăng Vỡ — task 07

Offline production assets only. Approved scenario remains unchanged. No runtime, manifest, or scenario files modified. Run `python assets/levels/04-shattered-moonlit-creek/prepare_assets.py` to reproduce the deterministic exports from preserved raster sources, then `python assets/levels/04-shattered-moonlit-creek/verify_assets.py` to refresh the detailed validation evidence. Preparation alone writes a compact preliminary validation record.

## Files and source mapping

`asset-map.json` records each exported PNG, dimensions, centered pivot, source and SHA256. `provenance.json` hashes originals and source references. `generation-prompts.json` preserves exact built-in imagegen prompts and original tool output paths. Agent requested configuration: GPT-6.1 Sol, low; resolved model is not exposed by this worker runtime. Imagegen succeeded twice without fallback.

New built-in raster sources: dead creek scene and storm relief. New native diagram modules in `../shared/mechanisms`: nine mirror exports, three small receiver eyes, six span exports, four dedicated handle latches, three source pedestal states. Source pedestals reuse `src/assets/pedestal_empty.png` and `pedestal_lit.png`, with native dark-lantern overlay for off-source. Existing forest/arch assets were considered; creek generation supplies its own bordering forest, so no duplicate arch asset was needed. Local native stone flower has closed/open exports. The large creek base is scenic source art, not a collision map.

## Mechanism conventions

All mirror sprites are 32×40, upright bodies, with identity dots fixed on the pedestal. `slash`, `backslash`, `horizontal` describe the visible reflector, not an engine angle. These are three discrete per-angle exports for each of G1/G2/G3. Integration must bind scenario orientations to ray directions; do not rotate whole sprites, which would rotate their identity marks. Native preview ray lines are explanatory layers, not baked into modules.

Both bridges use 100×36 canvases. Absent = two separated abutments and transparent gap; powered = pale cyan slab borders and suspended top glow; mechanically latched = solid stone slabs and continuous brass brace beneath. West/east latches are 28×32, distinct one/two marks; raised handles are unlatched, lowered handles latched. Latches are dedicated handle drawings, never receiver placeholders. Receiver off/on/energized are dark, pale, amber eye centers respectively.

## Preview reading

All stage previews are 640×360. `absent` shows lamp off and both gaps. `powered` is configuration A with only the west span powered. `branch-b` is configuration B with west mechanically held and east powered. `latched` has both spans held, lamp retrieved, receiver eyes dark. Light/dark pairs use identical geometry. Horizontal walk corridor is y=225–259; handle zones are just below it. G2 remains on the west edge next to the first span. Return route remains available after both spans are latched. Safe test source/flower is below the main network and does not require a crossing.

`states-native-640x360.png` contains actual-size state sprites; `states-nearest-2x.png` is nearest enlargement. Relief is 128×80, depicting towers, tree, diagonal storm, Guardian beside lever with belt lantern and river. It is a clue; no motive or cause is asserted.

## Validation and limitations

PASS: deterministic PNG exports, dimensions/hashes, actual-size contact and branch-B/final dark visual inspection. Bridge absence versus power versus brace, one/two/three mirror marks, dedicated handles read separately. NOT_RUN: engine integration, interaction safety, collision, checkpoint behavior or runtime tests. The native navigation surfaces are deliberately diagram-like; terrain transitions need art integration polish. The relief's detailed carving becomes small at 128×80; preserve original for an enlarged interaction view. No animation, HUD, falling punishment, dynamic ray solver, or mechanical rules are implemented here. Generated imagery is production source material and offline composition, not proof of game behavior.
