# Prologue runtime art — provenance and export record

Status: the four approved runtime illustrations were copied byte-for-byte into `assets/prologue/runtime/` for Task 1. They have been decoded and hash-checked against the external runtime manifest. They have **not** been tested in Phaser, in a browser, or as a final visual pass; no human art acceptance has been recorded.

## Runtime files

| Panel | Runtime file | Output SHA-256 | Bytes |
| --- | --- | --- | --- |
| 01 road home | `runtime/01-road-home.png` | `063f5ce7caa097e1993e2317da03ce01a0ee4737a7192f205234019fb7bb2f56` | 605,474 |
| 02 voice in trees | `runtime/02-voice-in-trees.png` | `b3822538915f09edfedb918ac3efc8af210940c5ed194d0537a3ad0c2cd5fd59` | 645,430 |
| 03 path disappears | `runtime/03-path-disappears.png` | `8d07b211b56cd5512a52e279107f983c84513d5091ce6e967745fa20f54f0f51` | 653,668 |
| 04 waiting for morning | `runtime/04-waiting-for-morning.png` | `d653b16fb813dcb3d70dd98b788fc491f82a517c3ab79226cef0e8ae380dd8a3` | 610,462 |

Total: **2,515,034 bytes (2.40 MiB)**. Each file is at most 1,048,576 bytes; the total is below 4 MiB before base64 inlining. All four files are distinct.

Decoded with Pillow 12.3.0 on 2026-10-19: every file is a PNG at 1280×720, mode `P`, indexed 256-color palette, and non-blank. SHA-256 values match `runtime-manifest.json` in the external handoff exactly.

## Source masters

| Panel | External master | Master SHA-256 | Original size |
| --- | --- | --- | --- |
| 01 | `masters/01-road-home.png` | `c379a7ec2cfb37abb0427cf4a1c1154ae0dd813281884c996c4a321d2ed582b3` | 1672×941 |
| 02 | `masters/02-voice-in-trees.png` | `04f2fdfe57cdee958ecb8fc59f143c1fcd0aba19824dd251bea0fdbf36293c7a` | 1672×941 |
| 03 | `masters/03-path-disappears.png` | `ec9da518a1b71e335a7bc44f56b1bc9eadcfa768ea3dc7363d461f780d08bb13` | 1672×941 |
| 04 | `masters/04-waiting-for-morning-v2.png` | `63efe0c2caea68c62b15546a24a56262a49a9d55651c5761214b708dd5c4248e` | 1672×941 |

Full masters, the original scene 04 generation, the exporter, and the runtime manifest stay in the external art handoff (`artifacts/prologue/` in the planning checkout); they are deliberately not part of this worktree or the application bundle. Scene 04 uses the corrected v2 master, which removed the unintended circular/crescent-like engraving from the tablet. The original scene 04 master is retained only for provenance and must not be imported.

## Export parameters

- Requested generation size was 1280×720; the actual masters are 1672×941.
- Export takes the largest centered integer 16:9 crop: **1664×936 from 1672×941**, crop box `[4, 2, 1668, 938]` (left, top, right, bottom). No stretching or off-center crop.
- Nearest-neighbor resize to 1280×720.
- 256-color median-cut palette, no dithering, optimized PNG save.
- Masters are never modified. The runtime files were copied from the approved handoff, not re-exported here; copying did not change a byte.

## Copy provenance

- Source: external handoff `artifacts/prologue/runtime/*.png` plus `runtime-manifest.json`.
- Destination: `assets/prologue/runtime/` in the isolated `feat/opening-prologue` worktree.
- Copy date: 2026-10-19. Only the four PNGs were copied; no masters, storyboard, contact sheet, manifest, or exporter was added to the repo.

## Verification limits

PASS here is limited to file presence, byte-for-byte hash equality with the handoff manifest, PNG decode, 1280×720 dimensions, 256-color indexed palette, distinct content, per-image/total byte budgets, and the four source-master hashes above.

NOT_RUN: Phaser texture loading, production bundle measurement with these images, browser rendering, dialogue-UI occlusion, Vietnamese text layout, pan/shimmer behaviour, full prologue playthrough, and human art acceptance. Scene 02's boot tips sit near the planned dialogue area; that needs a real UI check and should be reported to Sol instead of repainting or stretching the art. Static inspection by Sol in the art session is not a browser test.
