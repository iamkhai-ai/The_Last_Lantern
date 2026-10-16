# Task15 — ending assets

Rebuild: `python assets/levels/10-the-heart-of-elaria/prepare_ending.py` (Pillow).

Six RGBA exports, twelve 640×360 scene previews, native/nearest 2× asset contacts and scene overview. `task15-asset-map.json` gives pivots, dimensions, exact reused paths and SHA256. `task15-provenance.json` binds source, scenario and assembly script. Task14 files are preserved; its standing proxy is superseded for seated composition by `sprites/ending-nhinh-seated-unlit-leaf.png`.

No task15 sprite has intentionally empty alpha. All six exports have visible pixels. No panoramic scene preview is included: twelve scenes are exactly 640×360; contacts are 640×360 and 1280×720, overview 1280×720.

Built-in imagegen created the seated pose from the approved right-facing off-lantern frame. The original generated transparent image is retained at `sources/task15-nhinh-seated-original.png`; crop/nearest resize exports 36×42 gameplay pose and 144×168 dialogue insert. Hood, red scarf, brown clothing, unlit brass lantern and leaf on its handle are visible. Lumo is a separate reused layer near the handle. No flame/glow is added to the lantern.

Garden, creek, tower and observatory backgrounds reuse delivered scenery. A transparent native dawn lighting overlay stages the change in time without replacing those sources. Observatory sequence uses the existing Shadow poses only after dawn, alongside the resuming wheel. Daytime forest staging reuses dawn trees/bush/canopy. It contains one Nhinh and one Lumo, an off-lantern carry pose with leaf attachment, and the exact title `THE LAST DAWN`. The girl's fate is not depicted. E/credits timing is recorded in metadata for runtime.

PASS: actual assembly command; PNG dimensions/mode/hash checks, source/reference existence, seated transparent cutout. Visual inspection of generated source, native/2× contacts, root composition, final trail/title and montage overview. Seated knees/boots, dark lantern glass and handle leaf read in the dialogue insert. Current previews are offline staging, not engine screenshots.

NOT_RUN: engine integration, animation, collision, dialogue layout, E/credits flow and save/reload. Single seated key pose; sit/stand, clipping lantern to belt and continuous walking while carrying remain runtime/animation work. Existing carry pose is a standing key frame, not a full walking cycle. Native trail terrain is schematic. Dawn overlay does not repaint source materials; plant sway, flowing water, pink tower-window light and wheel rotation require engine effects. The Shadow sequence consists of discrete sampled states. Generated hood/lantern proportions differ slightly from standing prototype.

Requested agent: `gpt-6.1-sol`, effort `low`. Runtime-resolved agent identity unknown. Built-in imagegen exposes no backend model selection/resolved identity; no fallback used. Exact prompt is saved in `task15-generation-prompts.json`.
