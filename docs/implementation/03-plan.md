# Level 03 implementation plan

User authorized implementation and routine design decisions without another approval round. Scope is Level 03 only; Level 02 has another thread. Spec: `03-layout.md` and the original scenario. Base `7997c43`, branch `codex/level-03-spatial-rebuild`, existing isolated worktree reused. Existing `tasks/plan.md` and `tasks/todo.md` belong to earlier work and are not overwritten; this level uses the project's established `docs/implementation` plan location.

## Decisions and dependencies

- Keep CampaignScene and existing v1 progress keys. Prefer a focused `LibraryLevel` controller/renderer plus pure `libraryLayout`/state helpers to contain this room's code and reduce future conflicts with Level 02. This is not a general level framework.
- Register only the existing required Level03 sprite files in CampaignArt. No PNG/frame changes, generated art, new dependency or background preview imports.
- Build on the shared measured prompt placement and existing Player foot-placement API. Level 03 opts into its authored feet; other levels keep their settings.
- Preserve all unrelated primary-checkout edits and the other thread's worktree. Do not push/merge without a new request. Stop temporary preview servers after inspection.

## Task 1 — spatial room and art

Dependencies: asset audit and approved-by-delegated-authority layout.

Likely files: `src/data/libraryLayout.ts`, `src/levels/LibraryLevel.ts`, `src/art/CampaignArt.ts`, narrow `CampaignScene.ts` integration.

- [ ] Shared spatial data owns floor bounds, spawn/checkpoints, art sizes/pivots, base solids, core shape, seat transforms and east exit passage.
- [ ] Existing assets render a coherent desk/gallery/well/mural/exit room; actor feet/depth, collision, same-side controls and prompts use those definitions.
- [ ] Safe restore uses actual permanent/conditional geometry; Level 01/02 and other-level code paths remain intact.

Verification: source inspection and production build. Automated tests are NOT_RUN unless explicitly requested. Root inspects final visual geometry and notes runtime limitations.

## Task 2 — complete scenario puzzle and story

Dependency: Task 1. Likely files: level-local controller, focused pure state helper if useful, CampaignScene hint/journal dispatch.

- [ ] Book teaches both ink layers; every tablet/occupied seat can be read and selected under either state, without mandatory observation gating; unique pieces move/swap without losing progress, and only explicit E confirmation solves.
- [ ] Crystal/panel/mural/exit follow scenario order, complete dialogue, repeat-safe beats and unchanged durable save flags.
- [ ] State-aware H/J/objective/status reveal only earned information and remain readable. Source and world views switch to exactly one light-state layer.

Verification: trace every action and save transition against the scenario; inspect relevant visuals. No test suite claimed from a worker's assertion or injected completion state.

## Task 3 — root integration and independent review

Dependency: frozen worker source.

- [ ] Root inspects the diff, runs production build, records source revision and actual result.
- [ ] Root visually inspects the room on an isolated origin; preserve user storage and distinguish fixtures from a real puzzle playthrough.
- [ ] Two independent read-only Luna high reviewers examine the same frozen revision; findings remain separate until both complete. Correct confirmed findings and re-review/recheck affected work.
- [ ] Record final spatial decisions, command outcomes, limitations and local review branch. Human acceptance remains NOT_RUN until the user plays.

## Risks

Native 220px well nearly fills the play height; seat approaches must be checked by feet, not actor center. A hidden panel PNG must not leak its underlying mural. Observation flags must never become mandatory selection gates. Single-instance tablets require correct slot swapping and old-save sanitization. Side-by-side controllers may touch CampaignScene with the Level02 thread later; keep the integration narrow and level-index-specific. New tests and broad refactoring are not part of this request.
