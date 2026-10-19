# Level 05 — item art source pack v2

Created: 2026-10-19. Base code revision: `8e265694186d82649ba190f42c89d27eb130d880`.

## Delivery

19 regenerated PNG source images for **A Path for Two**, produced with the built-in
`image_gen.imagegen` tool. The tool does not expose its backend model; the user
explicitly accepted that limitation. Do not label these as confirmed GPT Image 2.5 output.

This directory keeps the **high-resolution sources**. Their normalized native
exports are now active under `../sprites/`, using the game's existing asset keys.
The background and character frames are outside this pack.

## Visual direction

Ancient waterworks: chipped dark slate, aged brass mechanisms, restrained moss,
root-wrapped power lines and a large readable firefly sigil. Turquoise marks
energy; warm amber marks mechanical engagement. State changes retain the same
subject and use reference-image edits.

## Contents

| Group | Files | Intended logical canvas |
| --- | --- | --- |
| Call station | [idle](call-idle.png), [sent](call-sent.png), [arrived](call-arrived.png) | 40 × 48 |
| Pressure plate | [empty](pressure-empty.png), [occupied](pressure-occupied.png) | 44 × 28 |
| Gate | [closed](door-closed.png), [open](door-open.png), [held overlay](door-held-overlay.png) | 64 × 88 |
| Latch | [unlatched](latch-unlatched.png), [latched](latch-latched.png) | 28 × 32 |
| Conduit | [straight](tube-straight.png), [elbow](tube-elbow.png), [mouth](tube-mouth.png) | 64 × 32 |
| Root cable | [rest](root-cable-rest.png), [flow](root-cable-flow.png), [arrived](root-cable-arrived.png) | 160 × 40 |
| Memory ink | [visible with lantern off](ink-route-dark.png), [faded with lantern on](ink-route-bright.png) | 240 × 48 |
| Memory engraving | [spiral](swirl-memory-scratch.png) | 40 × 40 |

[Generation manifest and prompt set](generation-manifest.json) records actual
pixel dimensions, alpha statistics, SHA-256 hashes, references and prompts. The
first gate prompt is recorded as a summary; subsequent prompt records are the
submitted text.

## Native export and integration

Run `python scripts/export-level05-art.py` from the repository. The authorized
technical export requires Pillow, NumPy and SciPy. It leaves these sources intact.

- Native canvas sizes match the table above; state families share transforms and
  stable structural silhouettes. The pressure pair's source height difference is
  absorbed by the shared crop.
- Detached alpha debris is removed before shrinking. A common 96-color palette
  and native hard alpha preserve crisp edges without dithering.
- Gate posts fit the existing 10px collision columns. The opening remains clear;
  the runtime foreground crop follows the new arch to y44.
- The elbow supplies a compact coupling at each real bend, without fixed-angle
  arms implying an incorrect route. Straight pipes and cables preserve their
  native thickness and authored crop lengths.
- Both ink states use the same paint geometry. The lantern-on export limits ink
  alpha to 28/255 instead of the source's maximum 98.
- Room layout, interaction stands, saves, puzzles and character frames retain
  their existing contracts. The optional practice call now displays its visual
  sent/arrived state and participates in prompt protection.

[Native output manifest](../native-v2-manifest.json) records recipes, dimensions
and source/output hashes. [Native contact sheet](../previews/native-v2-contact-sheet.png)
shows the exported sprites on a dark swatch.

## Evidence

- **PASS — source inspection:** all 19 PNG files decode, use RGBA and contain
  transparent pixels. Actual sizes and hashes are in the manifest.
- Build, visual captures and independent review evidence are recorded in
  `docs/implementation/level-05-art-v2-integration.md`.
- **NOT_RUN — full gameplay playthrough:** the visual fixture uses in-memory
  predefined states and does not prove a complete puzzle run.
