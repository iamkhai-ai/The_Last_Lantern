# Level 03 — Task 05: tablets and sockets

Offline art delivery only. No runtime, manifest, scenario or task checklist edits.

29 RGBA sprites, two built-in `image_gen` sources, exact prompts, deterministic icon/export source, two 640×360 staging previews and two 640×360 contact sheets with 1× plus 2× nearest views.

## Assembly and puzzle contract

All tablet components use a common 48×48 origin, pivot (0.5, 0.5). Compose `tablet-body` + `border-{identity}` + the corresponding bright OR dark layer from `asset-map.json`. Convenience `tablet-{identity}-{bright|dark}` PNGs already compose these layers. Do not show bright and dark simultaneously in-world. Notebook storage and solved-only time labels require later integration; no words are included in sprites.

Chim and Thuyền literally reference the same `bright-horizon-sun` PNG; only dark movement differentiates them. Lá and Hạt literally reference the same `dark-apex-arc` PNG; only bright celestial body differentiates them. Border symbols identify tablets only. No daily activities or identity-coded socket matching hints are added. Three distinct bright clue files, three distinct dark clue files, four unique paired combinations.

Sockets: `socket-empty` remains visible in darkness. `socket-occupied` is a neutral generic seat for composition/testing; place the actual selected tablet on that seat to express identity. `socket-selected` supplies corner brackets and may be drawn above either occupancy state. `start-horizon` marks only the cycle start. Rotate `route-cue` as needed to connect consecutive sockets into a loop. Empty-cycle previews use shuffled, unplaced tablets and do not demonstrate the solved arrangement.

Test-book components use 56×40. Shared generated blank pages + native bright closed yellow flower OR native dark blue crescent. Sources are preserved at full resolution. Small icons are deterministic native raster drawing in `prepare_assets.py`, authorized to enforce exact puzzle equality; the stone and parchment art is generated with the built-in image tool. No API/CLI fallback used.

## Evidence and limitations

PASS: PNG canvas/RGBA/transparent alpha/nonempty checks, source/reference paths, exact shared pair mapping, four unique combinations; actual light/dark staging and both contact sheets inspected. All source and output hashes are recorded. Requested agent `gpt-6.1-sol` / `low`; resolved agent configuration and image backend are not exposed by the runtime.

Rim identities were enlarged into a common 19 by 12 pixel high-contrast badge: winged bird, veined leaf, sailboat and single seed. The revised contact and dark staging were inspected at actual game size; all four symbols are distinct. Notebook zoom can reuse these layers at nearest scale. Stone texture and book perspective lose detail after downsampling. Sockets are functional native outlines awaiting task 06 well architecture. Offline darkness keeps objects readable and does not simulate engine lighting; the page remains parchment-colored. No full room, fifth mural, well state or crystal art belongs to this task.

NOT_RUN: engine rendering, light switching, interactions, collision, notebook persistence and build. Runtime integration is a later task. Contact/staging captions are review-only and are not sprites.
