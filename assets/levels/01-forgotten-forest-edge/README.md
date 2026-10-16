# Level 01 — Rìa Rừng Quên Lãng

Asset batch only; no runtime, manifest, scene or scenario changes. Scenario remains `docs/scenario/01-forgotten-forest-edge.md`; its SHA-256 is recorded in `asset-map.json`.

## Deliverables

- Eight generated sources preserved in `sources/`, with eight exact prompts and original tool output paths in `generation-prompts.json`.
- Eight modular RGBA sprites in `sprites/`: beacon stone hidden/illuminated (48×60), separate pickup lantern (20×28), Pulse footprints (20×28), standing stone ring (58×30), Sun-eye dormant/receiving/full (32×32).
- Five offline scene previews at 640×360 in `previews/`: opening, lantern-on, Pulse, receiving, open-latched. One 640×360 contact sheet shows sprites at 1×/2× on light/dark backgrounds.
- `prepare_assets.py` performs crop, nearest-neighbor sizing, alpha-preserving export, composition and file validation. It does not call generation APIs.
- `asset-map.json` records proposed keys, original/source hashes, crop bounds, scales, pivots, reuse and state semantics. These keys are proposals, not manifest entries.

Collected lantern is represented by removing the pickup and using existing Nhinh held-lantern frames; no empty collected PNG is needed. Footprints are shown only in Pulse preview. The ring identifies the standing position. Eye receiving shows partial amber iris; full state fills the iris and lights the sun rays. Open-latched preview represents a persistent open gate; persistence is not implemented by these images. Abstract illuminated inscription strokes indicate readable text; actual Vietnamese inscription remains in the scenario/dialogue, not invented in the raster.

## Reuse and model provenance

Forest trees/bushes, tile grass/dirt, Lumo and closed arch are reused from `src/assets/`; open arch is reused from accepted Level 02 pilot. Existing Nhinh prototype provides character frames. No reference board was used as a sprite. Requested production agent: `gpt-6.1-sol`, effort `low` (Light). Resolved model/effort are not exposed to this worker. Built-in `image_gen` generated all eight raster sources; its backend model is not exposed. No fallback provider/CLI was used. All generation calls returned successfully.

## Validation and limitations

**PASS** — actual `python assets/levels/01-forgotten-forest-edge/prepare_assets.py` run: eight PNG sprites open, match declared canvases, are nonempty RGBA and contain transparent pixels; all six preview/contact PNGs are 640×360. Source/prompt counts are both eight. Hashes bind evidence to the exported files.

**PASS within offline art scope** — visually inspected sprite contact sheet and all five scene states: stone blank/lit and eye dormant/receiving/full differ, cyan footprint trail leads to empty stone ring, pickup sits beside beacon, and open passage stays clear after moving modular Sun-eye to the side pillar. No sprite background rectangles were visible. HUD and controls strips are reserved. This is an art inspection, not production or user approval.

**NOT_RUN** — in-engine preview, runtime/build checks, collisions, lighting/Pulse radius, collection persistence and latch persistence; batch does not integrate assets.

Known limitations: reused arch is stone while scenario describes a wooden gate; a dedicated wood variant remains a future integration/art choice. Its existing central circular decoration is retained in closed preview; the new functional eye sits on the side pillar. Closed/open inherited arches differ in materials/silhouette. AI edits shift small texture details between states, and nearest reduction simplifies inscription and eye detail. Footprints read as luminous impressions rather than detailed boot soles. The distant white glimmer, withered grass, beam and ground-path mask are offline composition cues, not newly exported assets. No fog animation or gate-opening animation was generated. Existing character prototype limitations remain. Assets are suitable for integration review with these caveats, not claimed production-ready.
