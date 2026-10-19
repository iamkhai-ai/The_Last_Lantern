# Interaction and early puzzle guidance fixes

Date: 2026-10-19 (Asia/Saigon). User requested a separate branch and native Luna High/Xhigh implementation workers.

- Branch: `codex/interaction-guidance-01-03`.
- Base: `test-develop`, `f576f4b09e6a42f8741393cec8c6e71f1617229c`.
- Frozen source commit reviewed: `6a80ddd348df5b04e227ce13bbc8feb9a5a14c76`.
- Exact tree checked: `e9052feea16bbaf1ec179ac6ddfb731121590e62`. Root staged the source before verification, then confirmed the commit has this same tree. This report adds documentation only afterward.
- Worktree: `C:/Users/Admin/.codex/worktrees/interaction-guidance-fixes/the-last-lantern`.

## Changes and decisions

1. Shared interaction selection and E-press validation use the same radial range: the registered interaction radius plus 8 world pixels. The game has no authoritative meter-to-pixel scale; this is a modest cushion (24 becomes 32 px, 22 becomes 30 px), not a claim of a literal one-meter measurement. Authored approach anchors, enabled predicates, and control ownership remain the basis for safe interaction.
2. Level 01 draws a high-contrast direction arrow toward the lantern, then the tablet. Per the user's later correction, the decorative player-feet ring has been removed; the arrow starts outside the sprite frame. The standing-ring target appears after Pulse discovers the footprints. The cue retires after the gate opens and is hidden during dialogue/pause. Geometry is computed in world coordinates; depth 72 keeps the arrow visible above darkness.
3. Both restored and newly discovered footprint stamps rotate from their north-facing source art toward the next trail point or the standing ring.
4. Level 03's book teaches F/E layer observation, selecting at racks or occupied sockets, placing/swapping/returning pieces, the north horizon start and clockwise route, and explicit E confirmation. Prompts distinguish selecting from placing. H escalates to a concise north/east/south/west mapping only at tier 3. Objective and book do not automatically reveal the full mapping. J retains observed clues and gains time labels after solving. Actual observation flags drive guidance instead of trusting stale readiness flags; observations remain optional for solving.

## Delegation and review

Codex's active tool metadata listed `gpt-6-luna` with `high` and `xhigh` support before dispatch. Native dispatch accepted each requested configuration; the result did not independently expose a resolved model/effort, so that resolved metadata is unknown.

| Task | Requested model / effort | Scope |
| --- | --- | --- |
| `/root/interaction_radius` | gpt-6-luna / high | Shared range and focused boundary coverage |
| `/root/level1_guidance` | gpt-6-luna / high | Feet cue, footprint direction, focused checks and frame-probe compatibility |
| `/root/level3_clues` | gpt-6-luna / xhigh | Book/H/J/objective guidance and behavior coverage |
| `/root/review_a` | gpt-6-luna / high | Independent read-only review of the entire frozen source diff |
| `/root/review_b` | gpt-6-luna / high | Independent read-only review of the same frozen source diff |

Both reviewers returned no actionable findings. Findings were kept separate until both reviews finished. These were source reviews, not browser reviews or merge approvals. Read-only was a task instruction, not an enforced technical sandbox. Reviewers using the same model can share blind spots.

## Root verification

All commands below ran against the frozen source tree above and exited 0 on the final run.

| Result | Command / inspection | Evidence |
| --- | --- | --- |
| PASS | `npm run build -- --outDir <task-visualizations>/interaction-guidance-build` | TypeScript and Vite, 626 modules; standalone HTML generated outside the repository |
| PASS | `node scripts/check-forest-edge.mjs` | Geometry/state plus stage-target and footprint-direction checks |
| PASS | `node scripts/check-interaction-targets.mjs` | 13/13 cases, including radial boundary and matching E acceptance; existing L05/L09/L10 domains preserved |
| PASS | `node scripts/check-library-guidance.mjs` | Real controller methods/callbacks with rendering stubbed: book instructions, H escalation, journal visibility, stale flags, swaps, one-layer-per-tablet solve and explicit confirmation |
| PASS | `node scripts/check-interaction-prompt-layout.mjs` | Existing prompt placement cases |
| PASS | `node scripts/check-campaign-runtime.mjs` | 15/15 frame/controller cases |
| PASS | `node scripts/check-campaign-start-intent.mjs` | Existing New Game/Continue lifecycle cases |
| PASS | `git diff --cached --check` and source/index comparison | No whitespace errors or unstaged tracked source at freeze |
| PASS | Browser visual inspection on the frozen source | Lantern cue in darkness; discovered-ring cue and restored footprint direction; new book prompt; three H stages, including complete tier-3 text fitting the dialogue box |
| NOT_RUN | Full campaign playthrough / human acceptance | Browser checks used disposable prepared checkpoints, not a continuous campaign completion |

An initial integration run of `check-campaign-runtime.mjs` failed 4 cases because its extracted scene probe lacked the newly added visual method. The probe now records the guide tick and asserts one call per frame; existing assertions remain. Final run: 15/15 PASS. The shared interaction worker also corrected the focused extraction harness to bind the actual shipped radius helper rather than duplicating it.

The interaction script retains pre-existing NOTE rows for L07/L08 approach-predicate coverage; this work does not claim exhaustive gameplay coverage for every level.

## Browser evidence and cleanup

The root used the Codex in-app browser against this worktree's temporary Vite server on `127.0.0.1:5197`. A temporary HTML fixture created saves only on that test origin. Prepared states were: Level 01 before pickup; Level 01 after tablet/footprint discovery; Level 03 at the book before/after the two-layer practice. The fixture did not pre-solve the main library puzzle. Browser inspection confirms rendered cues/text, while the focused controller check exercises arrangement and confirmation behavior.

Screenshots, outside the repository:

- `C:/Users/Admin/.codex/visualizations/2026/10/19/01a1536f-384d-7091-9324-13b87e5c0bc9/level01-lantern-guide-final.png`
- `C:/Users/Admin/.codex/visualizations/2026/10/19/01a1536f-384d-7091-9324-13b87e5c0bc9/level01-ring-guide-final.png`
- `C:/Users/Admin/.codex/visualizations/2026/10/19/01a1536f-384d-7091-9324-13b87e5c0bc9/level03-hint-final.png`

The temporary fixture and preview server were removed/stopped after inspection. The primary checkout's in-progress character edits were preserved. Generated tracked `dist/index.html` from the initial build was restored; the final build went outside the repository. No push, merge, or deployment was performed.

## Follow-up: arrow only

The user first reported that the decorative feet ring overprinted Nhinh's frame, then requested removing that ring entirely. Commit `7e3ecb33d2a5d73b823bdcac3bad7d47885e2a37` (tree `2489d83570d359722137455d3f73f19982788b47`) implements the final request: no player ring, only an arrow whose ray starts 3 pixels beyond the current sprite bounds. The authored stone standing ring and puzzle progression are preserved.

Root results on this source: **PASS** production build (626 modules, output outside repo at `arrow-only-build`), `check-forest-edge.mjs`, `check-campaign-runtime.mjs` (15/15), and diff check. Browser inspection of the opening lantern objective: **PASS**, no player ring and arrow outside the sprite. Screenshot: `C:/Users/Admin/.codex/visualizations/2026/10/19/01a1536f-384d-7091-9324-13b87e5c0bc9/level01-arrow-only.png`. Full campaign replay: **NOT_RUN**.

Two fresh independent static reviewers, `/root/arrow_review_a` and `/root/arrow_review_b`, requested as `gpt-6-luna` / `high`, found no actionable issues on this exact commit. Their resolved model metadata was not exposed. The first resumed worker attempt failed with `Fatal error: application network permission was revoked`; after the user said to continue, the same Luna High worker completed successfully. No fallback model was used. The local preview on port 5197 is left running with the arrow-only tab for user inspection; the earlier cleanup statement applies to the original verification run.
