# Level 06 — cohesive pixel-art visual study

First delivery of the 2026-10-21 graphics redesign approved in the Codex chat.
Baseline code revision: `8bf1bb0241868f9908be360d6c17e3e14c14d953`.

- `art-direction-brief.md`: style, game-scale constraints, reuse and state contracts.
- `asset-manifest.json`: candidates to reuse or produce, with source paths and
  explicit approval/verification status.
- `generation-manifest.json`: submitted prompts, tool, references and source hashes.
- `sources/`: unchanged generated scene originals.
- `previews/`: 640x360 and nearest 2x mockups and comparison sheet.
- `references/`: baseline live capture and contact sheet of exact reuse candidates.
- `validation.json`: raster command results and native-scale visual observations.

## Review images

- [Before and three state targets](previews/before-and-three-states.png).
- [Entry, native](previews/01-entry-640x360.png) / [2x](previews/01-entry-1280x720.png).
- [A+B+C live, native](previews/02-powered-640x360.png) / [2x](previews/02-powered-1280x720.png).
- [Return Flow, native](previews/03-return-flow-640x360.png) / [2x](previews/03-return-flow-1280x720.png).

The first cell in the comparison is a live gameplay capture. The other three are
offline mockups without HUD. They are not screenshots of an integrated change.

## Evidence and next production work

PASS: all three native previews decode at 640x360; all three 2x previews decode at
1280x720; each uses at most 128 colors from the same palette; six original source
hashes and 22 candidate reuse hashes match their records. Native visual inspection
covered state readability, the mirror/receiver distinction, ray continuity, chamber
framing and the Return Flow change. Three earlier drafts are retained and explicitly
marked superseded; their mechanical omissions were corrected in later sources.

The source/manifest checks cover existing reuse candidates, not newly exported
production sprites. An exploratory strict-alpha probe found 12 existing assets
with maximum alpha 253 or 254, rather than exactly 255. Each still has a real
transparent background and nonempty visible content. This observation is preserved
in `validation.json`; their alpha policy should be addressed during native sprite
export, without changing globally shared source files as part of this study.

NOT_RUN: runtime integration, production sprite extraction, HUD, animation, optical
solver/collision/save playthrough and build. This delivery adds art study files
only. Next production work is to separate environment and dynamic props, reuse the
chosen mirror/source/receiver frames, author the new prism/chamber/lever family,
and register all ground/optical anchors before engine inspection. The current
window remains bright and generated jewel/material details drift slightly between
states; both need a fixed production source family.

These are visual mockups. A composed scene image is not a playable background or
an exported sprite family. Runtime registration, collision and interaction changes
require separate integration and validation. Source art, character frames and
runtime assets outside this folder remain their existing versions.
