# Level 08 art v2 integration

Scope: the approved 32-PNG art redraw from `redesign-v2/art-redesign-brief.txt`.
Base code/art revision: `e7824c4a54d88bf7f158bf8914e498f66b086bac`.
Work branch: `codex/level08-art-v2`.

## Constraints and approach

The Level 07 garden supplies the visual family. Existing native alpha masks,
state orientation and layout numbers supply registration. Generation supplies
new material; deterministic native export enforces binary alpha and at most
128 colours in each family. The original overlays and shared Shadow sprites
remain protected inputs. The procedural beacon's decorative lamp is excluded
from its new level-local stone-body guide to satisfy the no-lamp rule.

Local asset registration/selection and background drawing are the only runtime
changes. New local mirrors/altar/beacon take priority at Level 08. The opaque
background supplies the same wall and floor regions as the collision layout,
including the solid west buttress. Existing sprite placement uses native image
centres corresponding to the brief's bottom-centre boxes; no anchor changes.

The new inscription is delivered as an asset and placement preview only. Pulse
discovery/flags/dialogue and other v2 gameplay changes are outside this scope.

## Verification state

- **PASS** — repository Level 08 geometry/state/Shadow/H-ladder command after
  dependency setup: `node scripts/check-ruins-of-two-halves.mjs`.
- **PASS** — `node scripts/export-level08-art.cjs`: 32 measured RGBA type-6
  PNGs, native dimensions, binary alpha, documented masks and at most 128
  colours per family; four native composites and nearest 2× versions.
- **PASS** — `npm run build -- --outDir artifacts/level08-art-build`: TypeScript
  and Vite build, 758 transformed modules, output outside the tracked dist.
- **PASS** — `node scripts/check-campaign-art.mjs`: existing campaign art facts.
- **PASS** — `scripts/inspect-level08-art.cjs`: seven real Phaser/Chromium
  640×360 scenes, all 32 textures loaded, every prop's fixed box/native dimensions,
  local state keys, real F input on the carried lamp, no browser/PNG load errors.
  Separate native/nearest-2× previews retain the HUD; art presentation images
  hide only that HUD. These are saved-state fixtures, not a full playthrough.
- **PASS** — `git diff --check`; comparison with the base revision shows no
  changes to original Level 08 sprites, shared assets, Level 07 artwork,
  `src/assets/mirror_0..3.png` or the Level 08 layout data.
- **PASS** — two independent read-only reviewer tasks completed on the frozen
  revision below, with no actionable findings in their checked scopes.
- **NOT_RUN** — complete manual spawn-to-exit playthrough and remote CI.

An initial Level 08 check could not start before `npm ci` because TypeScript was
missing from the fresh worktree. Dependency setup completed and the check above
then passed. This was an environment setup failure, not a source check pass.

The first palette export was rejected: sharp 0.35 rounded the requested PNG
palette budget to 8-bit/256 entries. Weighted median-cut now enforces a shared
128-colour RGB map per family with no spatial dithering, verified after decode.
The first browser run completed six fixtures but rejected the last because its
save omitted the one-off dialogue flags; that fixture now carries those flags
and the full seven-scene run passes. Neither rejected run is counted as PASS.

Mirror inputs have almost opaque alpha across the entire canvas. Their binary
baselines retain the rectangular extents and clear only four outside corner
pixels; this is an explicit transparency cleanup. The beacon body baseline
excludes its original decorative lamp. Every other prop retains its original
binary alpha mask. State orientations and all native canvases remain fixed.

## Delegation

Native Codex dispatch accepted `gpt-6-luna` / `high` for the bounded integration
worker. Availability was exposed by active Codex tool metadata before dispatch.
The runtime does not expose resolved model/effort; those remain unknown. Root
owns the art/export files, while the worker owned only the two runtime files and
the browser inspection harness. No concurrent edits to those files occurred.

## Frozen revision and independent reviews

Code/art revision: `e9d180d465974246417b50faf2f750b8005ba354`.
Both reviewers checked this exact revision against the base above. Their
current-round results were kept separate until both completed. Both native
dispatches accepted `gpt-6-luna` / `high`; resolved model/effort were not exposed
and remain unknown. Read-only instructions were not an enforced runtime sandbox.
Reviewers sharing a model may have correlated blind spots.

- **Reviewer A — `review_level08_a`:** no actionable findings. Reviewed all
  runtime and authoring changes, requirements, native/2× imagery and evidence.
  **PASS:** Level 08 and campaign-art commands, whitespace, independent decoded
  PNG dimensions/RGBA/binary-alpha/family palette/baseline-mask audit, all
  manifest/browser hashes and protected-art comparison to the base.
  **NOT_RUN:** build and Chromium rerun by this reviewer; full playthrough/CI.
- **Reviewer B — `review_level08_b`:** no actionable findings. Independently
  reviewed runtime/export/inspection code, native entry/ready/latched captures,
  all statue/mirror directions, backdrop, contact sheet and evidence.
  **PASS:** independent decoded PNG and hash audit for all 32 exports, source,
  reference, protected, authoring, manifest and all seven screenshot bindings;
  whitespace. **NOT_RUN:** build/browser/Level 08/campaign commands by this
  reviewer; full playthrough/CI. An initial audit assumption expected HUD-free
  files for all seven cases; the corrected audit checked the three explicitly
  intended HUD-free cases and all seven ordinary screenshots and passed. This
  was not a repository finding.

Root additionally verified all generation/export/reference/protected hashes,
authoring hashes and browser input/manifest bindings against the frozen working
tree. Build and browser results above apply to these final code/art bytes.
The follow-up documentation commit records review evidence only; runtime,
sprites, source images, authoring tools and requirements remain identical to
the reviewed revision.
