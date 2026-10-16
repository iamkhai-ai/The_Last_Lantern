# Level 06 — Ngọn Tháp Không Ngủ — task 09

Offline modular art delivery. Scenario, runtime, manifest and task checklist are unchanged. Run `python assets/levels/06-the-sleepless-tower/prepare_assets.py` to reproduce exports and technical evidence from preserved originals.

30 new PNG exports: 28 local assets and two reusable prism states in `../shared/beam-splitter/`. 22 existing assets are referenced by path without copies: Level04 shared source pedestals, receivers and G1/G2 mirrors; Level05 calls, tubes and pressure mark; original Hope crystal, Lumo and Nhinh. `asset-map.json` declares canvas, centered pivot, source/new mapping and SHA256; `provenance.json` binds sources and scenario to hashes. Exact built-in prompts and original output paths are in `generation-prompts.json`. The parent reports requested GPT-6.1 Sol / low dispatch accepted; resolved worker model and image backend are not exposed. Both image calls succeeded without fallback.

## State and assembly contract

The new triangular prism has one input and two independent output ports. Shared metadata gives local port coordinates. G0 has three explicit direction exports, labeled G0; G1/G2 reuse the upright shared mirrors with one/two fixed pedestal marks and per-angle reflector exports. Preview route coordinates are explanatory layout only. A/B use existing off/on eyes. Each A/B/C ring has separate live off/on assets; the all-currently-powered overlay is a separate current conjunction. Native beams are composed per preview and never baked into the scenery or prism.

C uses only the Level05 Lumo pressure mark and tube/call vocabulary. Occupancy is not a permanent completion state. Bind A/B/C rings to current signals on every update: no historical once-powered memory. A missing condition before lever use makes the machine wait. The Return Flow held lever is a different persistent machine mode; once switched, releasing Lumo or retrieving the lamp does not undo that mode. After-collected preview deliberately shows A/B/C off with held lever, chamber open, down-flow and dim tower lamp.

Compose chamber-open as the common body, then the separate Hope collectible inside, then chamber-grille-overlay while closed. `chamber-closed` is a convenience body+grille export. Hope is the original 41×72 crystal. `hope-collected` is intentionally fully transparent with the same 41×72 canvas, the sole allowed empty export. Crystal collection opens the record compartment; the voice record waveform panel is an interface prop, without invented transcript or historical image. Use the approved scenario dialogue at integration. The generated window prop contains only an empty forest window and a faded red child scarf. No evidence of the girl's fate, no Lumo role reveal and no new story scene was introduced.

`fountain-up/down` and `tower-intake/outflow` show visible directional chevrons; the outflow preview points left/down toward the forest/tree. `tower-lamp-white/dim` provides separate light appearance. The geometry is staging, not a final playable route or collision map.

## Preview evidence

All 12 scene previews are 640×360: direct-A/direct-B, branch-A-only/branch-B-only, C-only, AB-live-C-empty, ABC-simultaneous, condition-lost-waiting, after-return-flow, after-collected-record, and two safe test-bench states. The practice bench has no chamber, lever, C connection or main-machine rings; moving its input away makes both eyes dark. Main scene direct paths illuminate just one eye; splitter configuration keeps separate cyan/amber branches visible. The repeated AB-live-C-empty/condition-lost-waiting images intentionally show identical current signals regardless of prior progress.

The contacts are native 720×1056 and 1440×2112 nearest enlargement; sprites appear at their actual exported pixel size in the native sheet. Generated scenic raster is downsampled nearest to 640×360 and window cutout to fit 112×112. Original sources remain unchanged. Contact labels and scene captions are review aids, not in-world sprites.

PASS: PNG loading, declared canvas, RGBA, nonempty/transparent alpha (except documented collected absence and opaque scenery), reuse paths and hashes, source hashes; direct-A/B, safe bench, simultaneous, final down-flow, record and 1×/2× contacts visually inspected. The Hope crystal was corrected to render behind the closed grille; two beam origins were corrected to the prism ports.

NOT_RUN: engine, build, runtime ray solver, input interactions, collision, HUD/dialogue occlusion, save/restore and checkpoint behavior. Offline previews do not prove these. Native control surfaces are schematic and flatter than the textured backdrop; source window detail becomes small at 1×; tower scenery has a daylight forest opening despite the darkened room treatment. No animation or engine lighting shader is supplied.
