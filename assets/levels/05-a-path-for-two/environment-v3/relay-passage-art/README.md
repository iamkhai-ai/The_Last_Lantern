# Relay partition floor recess

Art delivery based on `bf19731`; scope is the relay background and its authored art geometry. The source art is unchanged between that revision and the inspected `test-develop` revision `9f79241`.

## Deliverables

- Runtime image: `../../sprites/relay-environment-base.png`.
- Updated geometry: `../relay-geometry.json` and `../relay-geometry-guide.png`.
- Unmodified generation output: `relay-passage-raw-master.png`.
- Original runtime image: `relay-before.png`.
- Review images: `relay-after-1x.png`, `relay-after-5x.png`, and `relay-before-after-5x.png`.
- Full prompt, reference ID, source/output SHA-256 hashes, registration, and check results: `export-report.json`.

The built-in image tool does not expose its model ID. The user explicitly approved using that tool with this limitation recorded. Generation reference: `exec-4bdcdd09-0428-412e-97ae-47caed47a9b1`.

## Export recipe

1. Preserve the generated PNG byte-for-byte as the raw master. Resize its complete 1672x941 frame to 640x360 using nearest sampling.
2. Quantize the generated recess crop `[130,190,174,210)` and fixture crop `[106,178,130,210)` against the original runtime image palette, with no dithering. Paste their palette indices onto a copy of the original P-mode image.
3. Retain the original lintel indices at `[130,180,174,190)` exactly. Save the opaque P-mode PNG with the original palette and optimized PNG encoding.

All coordinates use half-open rectangles. No changed palette index or RGB pixel falls outside `[106,178,174,210)`. There are 1,586 changed pixels. The original 128-color palette is byte-identical. PNG file bytes change because the image is re-encoded; the outside-region identity check compares decoded palette indices and RGB bytes.

## Visual choices and limits

The recess uses the hall's muted grey-teal flagstone with restrained mineral wear. Its flat floor values continue into the lower hall; no door furniture, cavity shadow, luminous mark, or guide color is included. The stone cap remains intact and the brass fixture ends before x130. The 1x and 5x offline views read as a small floor recess beneath the stone cap.

Runtime frame composition and traversal remain unverified; collision integration belongs to the subsequent task.

The requested `python scripts/check-level05-remaining-environments.py` was run and reports **FAIL** only for relay byte reproduction: its exporter still reconstructs the previous image from the previous pinned master. The other three tests report **PASS**. This delivery does not change that exporter or weaken the check. Re-running the old preparation script will restore the old relay image until its pipeline is updated.
