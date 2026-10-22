# Ruins of Two Halves — art redraw v2

32 native RGBA PNGs restyle the fixed Level 08 layout in the approved Level 07
garden material family. Runtime keys use `ruins_v2_*`; the original files remain
the fallback. The four measured `shadow-notch` overlays and shared character
frames are reused byte-for-byte.

The full user brief is [art-redesign-brief.txt](art-redesign-brief.txt).
The measured delivery table is [asset-report.md](asset-report.md).
Sources, prompts, reference hashes, protected input hashes, export dimensions,
alpha and family palettes are recorded in [production-manifest.json](production-manifest.json).

## Art direction

- Existing shallow top-down camera and native object placement.
- Cool muted slate-grey stone, worn desaturated brass, dark timber supports;
  moss only in joints, restrained clusters, quiet open courtyard floor.
- Sun hardware uses warm brass, Moon hardware uses blue-violet material.
  Brightness and structural spoke/bracket/ring changes preserve state readability.
- Exact original binary alpha silhouettes for state props. Broad statue/practice
  notches 0/2, edge-on 1/3; original mirror slash/backslash/flat/upright mapping.
- No emitted light, glow, rays, lamp, cast shadow, readable text, character or UI
  is part of a production PNG. State marks are physical engraved/bracket hardware.
- Selected visual target: generated `statue-notch-0-original.png` and temple
  material from the approved Level 07 garden. The user delegated production
  decisions when approving the existing in-chat direction.

## Authoring

Built-in `image_gen` produced the retained `sources/*-original.png` files;
tool/model version is not exposed. Generation requests are retained in
`sources/*prompts.json`. Originals retain tool metadata. `sources/guides/`
are nearest-enlarged existing sprites and an exact geometry guide, not generated
production art. The altar/beacon baselines reproduce their procedural body
geometry; the beacon's decorative lamp is excluded as required by the brief.

Practice column states reuse the corresponding generated statue material;
the two small Moon slabs reuse the full Moon receiver family at their native
size. The exporter projects these sources through each prop's original alpha
mask, then quantizes each state family together with dithering disabled.
Nearest sampling and binary alpha remove blended edge pixels. The legacy mirror
canvases are almost opaque across their entire rectangle. Their baseline clears
only the four outside corner pixels, retaining all rectangular extents and the
same plank direction in every state. This explicit alpha cleanup is recorded
alongside the original source hashes.

```powershell
$env:NODE_PATH='<bundled Node packages directory containing sharp>'
node scripts/prepare-level08-art.cjs
node scripts/export-level08-art.cjs
```

`prepare` regenerates guides only. Live image generation is not replayed by the
exporter. `export` reads the retained source PNGs and writes native sprites,
four native 640×360 authoring composites, nearest 2× composites, contact sheet,
manifest and measured asset report. Authoring composites cover all prop states;
they show asset placement and do not claim a playable state.

## Runtime and decal scope

Local mirrors, altar and beacon resolve before shared/procedural versions.
The local opaque backdrop replaces the old procedural floor/masonry artwork;
all collision geometry, placements, state logic, beams and shadow drawing use
the existing layout and code paths.

`inscription-under-statue.png` is the requested 48×12 asset. Its proposed centre
is `(320,222)`, ground depth 4, below the statue. It appears only in authoring
placement composites. The v2 scenario's Pulse discovery, notebook entry and
Shadow demonstration are gameplay work beyond this art-only brief; this change
does not implement those behaviors.

## Inspection

`scripts/inspect-level08-art.cjs` renders real Phaser scenes in Chromium from
isolated saves. It records native texture keys, sizes, bounds, live lock states,
source/export hashes and PNG/page errors in `browser-inspection.json`. The
normal screenshots retain the HUD. Separate `*-art-*` images hide only the HUD
after freezing the same scene. `decal-placement-authoring-*` additionally places
the asset-only inscription on a screenshot; this is clearly labeled authoring.
These fixtures are not a full spawn-to-exit playthrough.
