# Level04 mechanism art

The 27 runtime sprites in this folder replace the schematic Level04 mechanisms. Five transparent family atlases and one additional empty-cradle image were generated with the built-in image_gen tool and retained in `sources/`. These are Level04-only assets. Runtime registration and texture lookup changes are documented in `docs/implementation/level-04-prop-art.md`.

## Atlas prompts

Prompt 1 — `sources/exec-6dd1d11c-b32a-481a-b9e0-f01ac3f32feb.png` (mirrors):
> Create nine coherent variants of the same small ornate forest mechanism: a round optical mirror in a detailed carved gray mossy-stone pedestal, aged brass trim, tiny colored identity jewel on the pedestal (identity 1 amber, identity 2 blue, identity 3 green), readable angled mirror face. Transparent 3-column by 3-row atlas, columns identity 1/2/3, rows horizontal/backslash/slash. Keep pedestal bottom-aligned and silhouette/scale stable; optical glass center at 50% width and 37.5% height. Crisp premium hand-pixel art; no labels, borders, geometric placeholders, vector art, or background.

Prompt 2 — `sources/exec-740b7269-a086-4ee8-be8c-da7774e17b2a.png` (bridges):
> Create a regular transparent 3-column by 2-row atlas for absent/powered/latched creek bridges. A low horizontal top-down stone walkway spans its full sprite width. Mossy carved stone paving, aged brass abutments. Powered uses subtle cyan engravings; latched uses engaged brass braces with no cyan. No tall rails, steps, perspective, scene, text, or placeholders. Keep walkway silhouette and centerline stable.

The resulting1983×793 atlas has three661px columns: the first is empty, the second powered and the third latched. The final export uses row0 columns1/2 for both west/east spans. The initial two-column interpretation produced clipped fragments and was rejected before the final export.

Prompt 3 — `sources/exec-902d84ce-884f-4a0b-94e5-e85ba8f5463c.png` (latches):
> Create four transparent cells in a 2-by-2 atlas: west/east unlatched, west/east latched. Small interactive creek bridge latch on mossy carved stone plinth, weathered brass, hand-pixel detail. Same 28-by-32 target silhouette, scale and bottom anchor. Handle lifts when unlatched and turns down into its socket when latched. Dark eye when unlatched, softly cyan when latched; tiny amber/blue identity jewel for west/east. No labels, borders, geometric placeholders, or vector shapes.

Prompt 4 — `sources/exec-f83e4c57-8838-4d53-9bb1-4a4ff5276cf2.png` (sources):
> Create three transparent cells in one row: source-empty, source-lit, source-off-source. One forest lamp pedestal on a round mossy gray stone boulder, brass/gold lantern cup, matching carved pixel-art style. Keep silhouette, scale and bottom anchor stable; flame center at 50% width and 38.6% height for a 32-by-44 target. Empty has no flame; lit has a small warm gold flame; off-source has dark glass. No backdrop, labels, borders, placeholder art, or large glow haze.

Prompt 5 — `sources/exec-bbadf43b-65d8-48e9-bcc9-60c2dfc4de3a.png` (receivers and flowers):
> Create five transparent cells in one row: receiver off/energized/on, then carved-stone blossom closed/open. Receiver is a small round eye in carved mossy stone with a delicate brass frame; dark, restrained cyan, then pale-gold states. Flower is a small interactive blossom on a low mossy stone nub; closed/open with a pale-gold center. Center each optical eye/flower in its cell. Crisp, detailed hand-pixel art, stable family scale, no labels, borders, placeholders, or background.

Additional empty-cradle direction — `sources/source-empty-cradle.png` (generated output `exec-dd60173f-8381-4d52-ab8b-541964eb613b.png`): an empty brass cradle on the matching mossy boulder, with no lantern housing. This is the recorded direction summary; the worker reached its usage limit before retaining the exact sixth tool prompt. The other prompt descriptions above were supplied by the worker.

## Export and geometry

- Final exports isolate the authored subject within the correct atlas cells. The worker removed loose neighboring strips/specks from latch and flower exports using the main connected component. Art colors were not repainted. Exact intermediate crop rectangles were not retained before the worker's usage failure; final files are bound by SHA256 in `runtime-manifest.json`.
- Registration uses fixed canvases, nearest-neighbor export and stable ground anchors. Bridges share one crop/resize transform into100×36. Empty source uses a separate registration correction described below; it is not enlarged independently to fill the occupied lantern's height. No sprite illustration was drawn by a script.
- Mirrors: 9 files, each32×40, bottom registered. The intended optical landmark is(16,15); root visually observed the practice beam striking the new mirror face. Identity is indicated by amber/blue/green inset jewels; existing upright world labels retain the1/2/3 dot count.
- Bridges: 6 files, each 100×36; powered and latched west/east use the authored full-width horizontal walkway. The atlas did not contain absent art, so each absent file uses the latched source's two 20-pixel bank-edge pieces; the middle 60 pixels are fully transparent. This is a deterministic alpha mask, not replacement art.
- Latches: 4 files, each 28×32; west/east identity and raised/lowered handle poses are preserved.
- Sources: 3 files, each32×44. Lit/off share their occupied housing and ground anchor. The additional empty-cradle art is normalized from its saved32×44 intermediate to32×30, then pasted at(0,14) on the fixed32×44 canvas, keeping its stone body near the occupied source's20px body height. The input is retained as `sources/source-empty-before-normalization.png`; the transform is recorded in `runtime-manifest.json`. Root inspected empty, lit and placed-off appearances in the running preview.
- Receivers: 3 files, each 24×24; optical center at (12,12). Practice flowers: 2 files, each 28×28; blossom center at (14,14).
- Final contact sheets are in sibling `art-previews/`, outside the runtime sprite glob: `mechanisms-native-contact.png` and `mechanisms-4x-contact.png`. Cells accommodate the full100px bridge width; the earlier overlapping8× diagnostic was archived outside the project.

## Limits

These assets are generated artwork reduced to small gameplay canvases, so fine atlas detail merges at native scale. The absent bridge's edge abutments are masked from the latched image; the central60px are transparent. Source atlases are retained unchanged. No art-generation fallback or procedural illustration was used. Required independent Luna High reviews are NOT_RUN/BLOCKED after the worker failed with `You’ve hit your usage limit.`; root's inspection and build do not replace those reviews.
