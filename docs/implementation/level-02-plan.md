# Level 02 Spatial Rebuild Implementation Plan

> **For agentic workers:** Implement the single bounded Level 02 task; root owns delegation, independent review and final browser evidence. Do not spawn subagents.

**Goal:** A coherent Whispering Woods puzzle with readable clues, reachable controls, solid obstacles, correct layering and an unmistakable Library exit.

**Architecture:** Keep CampaignScene and v1 progress. Add one focused spatial/state module for index 1, consume it from index-1 rendering, interaction, collision, reveal, hints and restore. Preserve all other level branches and current assets.

**Tech Stack:** TypeScript, Phaser 3, Vite, Node assertion scripts without new product dependencies.

**Spec:** `docs/implementation/02-layout.md`, backed by `docs/scenario/02-whispering-woods.md`.

## Global constraints

- Worktree `C:/Users/Admin/.codex/worktrees/level-02-spatial-rebuild/the-last-lantern`, branch `codex/level-02-spatial-rebuild`, base `797c594`. Another chat owns Level 01.
- Scope Level 02 = internal index 1. No raster regeneration, changes to Level 01 behavior, later levels, save schema, remote actions, retained test server or new dependencies.
- Exact geometry, timers, Vietnamese copy, discovery/state behavior and evidence requirements come from the spec.
- User has already delegated design decisions and selected Luna high execution. Approval prompts are unnecessary; record concrete decisions/deviations.

## Review focus

- Poem/exit must have distinct target regions, including when the gate opens and during key repeats.
- Historical discovery cannot substitute for a live Pulse; activated tablets persist through expiration while journal facts survive wrong picks.
- Correct prefix / old 3-of-3 saves must restore consistently, without reopening the prior stuck gate or bypassing an unsolved one.
- Gate steps never cover the central actor, posts stay solid, and body/depth share the authored foot point while talking.
- Memory is once-only, scene effects/tweens clean up across transitions, full scenario dialogue and next-step hints remain accurate.

### Task 1: Implement Level 02 from shared spatial/state data

**Files:** Create `src/data/whisperingWoodsLayout.ts`, `scripts/check-whispering-woods.mjs`; modify only index-1 branches/integration in `src/scenes/CampaignScene.ts`. Add a focused Level 02 renderer module if needed to keep it legible. Modify shared interfaces only if unavoidable and compatibility-safe; report them. Existing `Player.setFootPlacement`, registered L02 assets and `InteractableConfig.promptY` should suffice. Do not modify `forestEdgeLayout.ts` or shared darkness behavior.

**Interfaces:** Export typed rune IDs, the authored world/body/anchors/stands/footprints/route/checkpoints; pure walkability and safe-spawn helpers; puzzle normalization and rune activation results consumed by the runtime. Exact helper names may follow repo conventions; do not create a general campaign framework.

- [ ] Read scenario/spec/current index-1 code. Record risks and deviations before changing product code.
- [ ] Add focused failing checks for the spec's geometry, ordering/repeats/wrong resets, practice independence, expiration/discovery distinction, legacy completion and safe restore. Make assertions cover actual helpers used by scene code; record the initial result.
- [ ] Implement spatial/state helpers and pass the checks. Keep durable keys and normalize contradictory old progress conservatively.
- [ ] Implement natural paths, correct pivots/depths and footprints, distinct poem/exit, stateful gate layers/barrier, moving fireflies and transient memory art. Use data for all related coordinates and stable runtime object IDs. No PNG changes.
- [ ] Implement full story/practice/revelation/order/repeats/reset/memory/exit, step-aware H/HUD/J and Lumo following per spec. Sleeping objects remain inspectable for useful feedback.
- [ ] Run focused checks, existing forest-edge/start-intent checks, `npm run build` and `git diff --check`; distinguish PASS/FAIL/NOT_RUN. Do not claim actual browser gameplay from injected flags.
- [ ] Self-review scope and commit local source. Write `docs/implementation/level-02-report.md` with decisions, exact verification results, commit(s), limitations and known questions. Return concise status/hash/commands.

### Final validation and review (root)

- [ ] Freeze source and rerun commands. Use an isolated temporary preview and real keyboard Level 02 puzzle route, plus labeled collision/layer/restore fixtures.
- [ ] Obtain two separate independent Luna high reviews of the same revision; keep findings separate until both complete.
- [ ] Route confirmed corrections to the original worker, repeat affected verification and independent reviews until complete.
- [ ] Record final evidence and decisions, stop the test server, restore generated tracked build output only, and leave a clean reviewable local branch. No remote actions.

## Preflight and state

| Task / dependency | Producer / consumer | Check |
| --- | --- | --- |
| Task 1 geometry/state | Data module / CampaignScene and assertion script | Same exported definitions; no duplicate test map |
| Task 1 rendering/physics | Spatial anchors / sprites, action stands, solids, restore | Shared feet offset and distinct poem/exit; no Level 01 edits |
| Task 1 verification | Source commit / root browser and two reviewers | Freeze before checking; source changes invalidate affected evidence |

Ruling: use a northeastern gate and independent western poem stone, keeping Leaf upper-middle — avoids the existing gate/rune/poem collision — cost if wrong: art/layout rework after user review.

Ruling: legacy completed sequence reopens its gate on load while unsolved saves remain on the near side — durable completion should not be lost — cost if wrong: contradictory manual saves may recover as solved; normal play still requires the sequence.

Status: design and implementation brief prepared. Product implementation and final verification NOT_RUN.
