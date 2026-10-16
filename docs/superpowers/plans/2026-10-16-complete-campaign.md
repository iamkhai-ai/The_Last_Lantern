# Complete Campaign — Implementation Plan

**Spec:** [Complete Campaign — Design Decisions](../specs/2026-10-16-complete-campaign-design.md)
**Goal:** Complete and verify the ten campaign levels in order.
**Workspace:** Continue in the managed `codex/observatory-room-navigation` worktree.

## Global constraints

- Scenario files `docs/scenario/01…10` govern authored beats and puzzle intent.
- Do not alter the approved Level 09 spec or discard its existing implementation/review history.
- Keep current 640×360 Phaser campaign architecture; prefer localized scene geometry and visual state.
- No new asset dependency. Use existing assets/Phaser graphics for missing affordances.
- Maintain protagonist name Nhinh and Vietnamese game dialogue.
- Do not introduce a save version migration unless existing save shape cannot support the requirement; preserve existing local saves.
- Every meaningful latch, solved puzzle, record, and crystal is saved; derived state is rebuilt on load.
- Work level-by-level. After a level slice, build and exercise its required route before proceeding; rerun after subsequent code changes that affect evidence.

## Tasks

### Task 1 — Shared campaign presentation and save safety

Inspect helpers and document exact state conventions. Add only reusable helpers required for visible beams, obstacle/door state, safe spawn and interactable prerequisite feedback. Fix cross-level protagonist/story inconsistencies (including any remaining obsolete name references). Do not prebuild an engine for speculative level types.

**Files:** `src/scenes/CampaignScene.ts`, supporting systems/types only when needed, scenario or decision docs only when required.
**Complete when:** common visuals reflect state; save/reload never restores invalid player position; no gameplay dialogue calls Nhinh by an obsolete name.

### Task 2 — Level 01: Forgotten Forest Edge

Complete the guided opening: readable tablet repeat interaction, Pulse tutorial, footprint path, gate receiver feedback/latch, journal entry, and gate traversal completion.

### Task 3 — Level 02: Whispering Woods

Add safe Pulse practice and firefly route cue; give each rune readable reveal/order feedback; show memory beat and persist gate unlock.

### Task 4 — Level 03: Library Beneath the Roots

Make both mural layers inspectable and visible, socket occupancy visible, fifth mural reveal staged, and Memory Crystal/exit gated by the completed sequence.

### Task 5 — Level 04: Shattered Moonlit Creek

Add navigable banks/island or equivalent route geometry. Render beam and bridge state for two sequential crossings; make latches hold and route back safely; persist both crossings.

### Task 6 — Level 05: A Path for Two

Implement seals, doors, and ink corridor as navigable space. Arrival must be physical; latch/recall route must be explicit; require Lumo’s return beside Nhinh before completion.

### Task 7 — Level 06: The Sleepless Tower

Implement concurrent light branches and Lumo seal, committed water reversal, record/story beat and Hope Crystal. Remove historical-arrival shortcut.

### Task 8 — Level 07: The Sleeping Garden

Implement fixed-light/shutter distinction, sun barrier and shadow bridge, traversal and return latch, water interaction, visible seedlings and story dialogue.

### Task 9 — Level 08: Ruins of Two Halves

Compute three simultaneous receiver states from current beams and statue shadow, latch the solved route, show the inscription/seedling response, and deliver Shadow/spiral beats.

### Task 10 — Level 09: Dark Moon Observatory completion

Finish the outstanding playtest gaps from the prior Level 09 ledger; clarify every blocked prerequisite; make Lumo endpoint arrival atomic and reload-safe; verify record, Balance Crystal, Level 10 transition.

### Task 11 — Level 10: The Heart of Elaria

Render crystal sockets and live three-branch puzzle feedback; require Lumo to hold the live seal; support both authored final lantern states and safe reload checkpoints; ensure ending completion resumes at ending, not a replayed puzzle.

### Task 12 — Full campaign integration, verification, and final review

Run `npm run build`, manually play Levels 01–10 and ending in browser, exercise save/reload at authored checkpoints, record PASS/FAIL/NOT_RUN for each. Restore exact original browser save. Freeze final revision, get two independent read-only reviews, reconcile findings, then run final affected checks and record evidence in ledger.

## Preflight conflict scan

| Pair / task | Shared dependency | Scan result / ruling |
|---|---|---|
| Task 1 → Tasks 2–11 | Shared scene helpers, progress/save conventions | Task 1 is restricted to evidenced cross-level needs; each level owns its own behavior. No parallel edits to `CampaignScene.ts`. |
| Tasks 2–11 → Task 12 | Same campaign scene, shared save and progression | Verification occurs after all code tasks; prior evidence is invalidated by later source changes. |
| Tasks 4, 5, 6, 7, 8, 9, 10, 11 | Shared `CampaignScene.ts` helpers and puzzle state | Execute sequentially, retain distinct per-level prefixes, rebuild derived visuals from flags/counters. |
| Task 1 internal | Name consistency/save safety vs established APIs | Preserve `CampaignProgress` version 1 and current save compatibility unless a demonstrated need prevents it. |
| Tasks 2–11 internal | Scenario route vs existing one-scene layout | Keep current scene layout and add route geometry; only Level 09 retains multi-room architecture. |
| Task 12 internal | Browser fixture vs user's local save | Save exact raw save value, use isolated temporary fixture, restore and verify original value after playthrough. |

## Task state

- Task 1: complete — shared campaign feedback, safe spawn, save compatibility, and Nhinh dialogue identity updated.
- Task 2: complete — opening tablet, repeatable journal, Pulse footprint reveal, receiver latch, and gate route implemented.
- Task 3: complete — safe Pulse practice, firefly route cue, rune sequence feedback, memory beat, and saved gate implemented.
- Task 4: complete — both mural layers, socket state, staged fifth mural, crystal, and exit conditions implemented.
- Task 5: complete — creek route and sequential latched beam bridges implemented with visible beam/bridge state.
- Task 6: complete — ordered Lumo seals, dark-only ink trail, far latch, return requirement, and memory note implemented.
- Task 7: complete — concurrent beam branches, live Lumo seal, committed water return, crystal, and record implemented.
- Task 8: complete — fixed canopy state, sun/shadow route, bridge, water, return latch, seedlings, and Lumo beat implemented.
- Task 9: complete — live receiver/shadow conditions, solved latch, inscription, and Shadow beat implemented.
- Task 10: complete — retained three-room observatory, explicit blocked prerequisites, return loop, record, crystal, and Level 10 transition implemented.
- Task 11: complete — live root prerequisites, safe overload restore, both authored lantern end states, and completion resume implemented.
- Task 12: in progress — production build passed after bridge corrections. Level 01 opening dialogue and fixture-based scene-entry smoke for all ten level indices passed on the current candidate. Full puzzle routes remain unplayed. Review fixes add creek/garden collision routes, foot-hitbox far-bank crossing commits, atomically checkpointed bridge approach state, pending removal only after an already-open crossing becomes invalid, safe gate removal on creek/garden bridges, Heart lantern restoration, and the live Observatory seal gate. The temporary test-origin save was cleared and verified at the title screen. Two final read-only reviews found no issues on the frozen candidate. Full manual route through all levels remains NOT_RUN.

## Verification record

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | PASS | TypeScript check and Vite production build succeeded after campaign changes. |
| `git diff --check` | PASS | Clean after bridge-gate fixes and documentation updates. |
| Level 01 browser smoke | PASS (partial) | On isolated 127.0.0.1:5174, New Game and Nhinh/Lumo opening dialogue rendered on current candidate. Level 01 gate and Level 02 transition not played. |
| Level 01–10 scene entry smoke | PASS | On isolated 127.0.0.1:5174, fixture saves rendered all ten level indices. Level 09 smoke used Entrance Hall only; no puzzle routes tested. |
| Full Level 01–10 routes and ending | NOT_RUN | No end-to-end route evidence on this revision. |
| Save restoration | PASS | Temporary test save cleared on isolated 127.0.0.1:5174; title screen showed New Game only. User tab on port 5173 was not used. |
| Final reviewers | PASS | Two independent read-only reviews found no actionable issues on HEAD `e24373c4da02c8700b82e500b35652206e6a3833` and frozen unstaged diff `393db850b80a46e5c9ccdb1f7880ca6e1c7fd63f`. |

## Known limits

- Full Level 01–10 playthrough and save checkpoints have not been verified manually.
- Several non-observatory rooms outside Levels 04 and 07 use state-driven route affordances without full physical collision topology; the approved single-scene architecture remains in place.
- New character art/assets were outside this scope; existing textures and Phaser primitives are used.
