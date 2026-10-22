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
- **NOT_RUN** — independent frozen-revision reviews (pending freeze).
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

Two separate read-only reviewer tasks will inspect the same frozen revision
after production export and applicable checks. Their current-round findings
will remain separate until both finish. Prompts do not enforce a read-only
runtime sandbox, and reviewers sharing a model may have correlated blind spots.
