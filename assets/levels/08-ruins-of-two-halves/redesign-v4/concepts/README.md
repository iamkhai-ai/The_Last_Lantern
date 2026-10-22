# Level 08 — depth and material concepts

Status: v2 approved by the user on 2026-10-22, then integrated as the Level 08 v4 local art pack. Production exports are in `../sprites`; the source concepts below remain reference images.

## Latest revision: v2 — mirror surround removed

User request: remove the grey rectangular surround visible around the mirrors.

- `temple-depth-study-v2.png` — 1672 × 941 opaque concept, edited from v1 with the user's cropped detail as a supporting reference.
- Both bulky stone surrounds and solid black backing patches are removed. The diagonal silver faces retain thin brass trim and use small independent brass feet; slate floor is visible around them.
- `prompt-mirror-refinement-v2.txt` records the exact built-in image_gen edit prompt.
- Generation: built-in image_gen, 2026-10-22; source `C:/Users/Admin/.codex/generated_images/01a162dd-b31f-7963-af5e-f483f4193293/exec-0560c489-e299-45f3-8fd5-42e861dca916.png`.
- PNG SHA-256: `335151b00ca67ce253759d64a07571c9d64a6c8515e56b08cbb00ec4a2f4e40b`.
- Visual inspection: both mirror surrounds are removed and the main scene composition is retained.
- Production integration retains transparent instrument silhouettes and matches mirror collision to their 32×44 rotation envelope inside the unchanged 36×48 canvases.

Requested direction: develop the current Level 08 graphics with more meticulous material treatment, believable form and greater depth, retaining existing objects and layout.

Reference revision: `92ccc9320fc7b81188bb65206cb9f35d136db333` (origin/test-develop on 2026-10-22).
Edit target: `../../redesign-v2/previews/composite-0-nearest-2x.png`.

## Deliverable

- `temple-depth-study-v1.png` — 1672 × 941 opaque full-scene concept.
- `prompt.txt` — exact built-in image_gen edit prompt.
- Generation: built-in image_gen, 2026-10-22; source `C:/Users/Admin/.codex/generated_images/01a162dd-b31f-7963-af5e-f483f4193293/exec-f14c174f-28c5-43df-813e-0dd7e787f9e0.png`.
- PNG SHA-256: `5e761c7678f2b8c43744ab2d7da6189bfaf36b528832ceb177260f74f3f8d21d`.

## Visual changes

- Consistent cool directional light and short contact shadows ground the plinths.
- Recessed wall masonry, niche and door frames read as separate planes.
- Stone has shaped chips, beveled edges and restrained weathering.
- Brass edges, mirror surfaces and seedling-bed depth distinguish the existing materials.
- Scene composition and object identities follow the reference.

## Production constraints

These high-resolution concept files are retained unchanged. Separate production exports enforce the 128-colour family limit, binary alpha, native canvases and nearest sampling. Runtime lighting, beams and measured puzzle shadows remain separate. Shared character sprites remain unchanged. See `docs/implementation/level08-depth-art-v4.md` for integration evidence.

Visual review: image output inspected for composition, material readability and directional shading.
Image file inspection: PASS — PNG decoded as 1672 × 941 and copied to this workspace.
Engine checks at the original concept-only delivery: NOT_RUN. Current integration results are recorded in the integration document.
