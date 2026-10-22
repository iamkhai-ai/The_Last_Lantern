# Relay passage art — round 2

Delivered 2026-10-22. The runtime replacement is `../../sprites/relay-environment-base.png`.

## Change

The recess is one continuous grey-teal floor surface in [118,190,174,210), below a solid stone lintel in [118,180,174,190). The obsolete dark divider at x130 is gone. The existing aged olive-bronze fixture is redrawn within [94,178,118,210), with no bronze beyond x117. All rectangles are half-open.

Exactly 2,272 native pixels changed. Every decoded palette index outside these three rectangles is identical to the runtime image captured at task start. The door A frame columns and all other background pixels are untouched by this art edit.

## Files

- `relay-after-1x.png`: final native 640×360 view, byte-identical to runtime.
- `relay-after-5x.png`: complete room at 5× nearest.
- `relay-before-after-detail-5x.png`: local before/after comparison, before on left.
- `relay-detail-10x.png`: enlarged inspection crop.
- `relay-runtime-1x.png`: actual game with A latched and lantern off.
- `relay-runtime-a-{open,closed}-{lantern-on,lantern-off,inside-recess}-2x.png`: headless Chrome captures.
- `relay-before-v2.png`: unchanged working-tree runtime at task start.
- `relay-head-reference.png`: unchanged PNG read from HEAD.
- `relay-v2-raw-master.png`: selected built-in image-generation output, byte-for-byte.
- `generation-prompts.json`: full initial and refinement prompts.
- `export-report.json`, `verification-inputs.json`, `clearance-review.json`, `runtime-final-review.json`: export and verification evidence.

The scratchpad before-v2 file named in the request was absent; the task-start runtime capture is used for comparisons.

## Production

Built-in `image_gen.imagegen` was used for both editing passes. Its resolved model ID is not exposed; this limitation is already recorded as approved in the preceding round's art record. Generation IDs are recorded in `export-report.json`.

The edit target is the native room crop [78,160,198,224), enlarged 10× with nearest sampling. The selected raw output (1717×916) is registered back to the complete native 120×64 crop with nearest sampling. Only the three authorized rectangles are quantized and pasted onto the original indexed PNG. Quantization selects the nearest existing RGB palette entry without dithering. The original 128-entry PLTE is preserved byte-for-byte. Output is 8-bit indexed P-mode, opaque, 640×360, lossless PNG; runtime origin (0,0), depth 0.

## Verification

- PASS: `node scripts/check-path-for-two.mjs` — 58/58.
- PASS: `node scripts/check-path-entry-environment.mjs` — 9/9.
- PASS: `npx tsc --noEmit`.
- PASS: `npm run build -- --outDir artifacts/relay-art-v2-build` — tracked dist output is not replaced.
- PASS: independent Pillow inspection of mode, dimensions, opacity, palette identity, unchanged pixels outside the edit mask, and unchanged door A frame columns.
- PASS: clearance at every integer body-center x=126..150 is at least 40px; exact samples are in `clearance-review.json`.
- PASS: real keyboard travel from the reverse A pocket through the recess to the hall and back, with A latched/open and unlatched/closed. Foot body was sampled entirely inside the actual recess. Both lantern states were captured. No browser console errors or warnings.
- FAIL (known existing exporter mismatch): `python scripts/check-level05-remaining-environments.py` — only relay byte reproduction fails; the other three tests pass. The exporter and checks are unchanged by this task.

Browser verification uses isolated seeded fixtures followed by real keyboard input; it is not a complete Level 05 playthrough. No commit, merge, or deployment was performed.

## Reviewer attention

Judge the subtle contact shade under the lintel and the olive-bronze fixture in both lantern states. Offline and runtime views read as a shallow floor recess, but this material/value judgment remains the visual reviewer's decision. No full campaign playthrough was performed. The old exporter will still reconstruct the previous art if run without a native-source workflow; it was not run as a preparation step here.

