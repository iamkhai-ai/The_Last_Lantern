# Level 04 Spatial Rebuild Implementation Plan

> For agentic workers: use subagent-driven-development or executing-plans task by task. User selected Luna High implementation and authorized routine design decisions without repeated approval. Read the design before code.

**Goal:** Deliver the scenario's readable one-mirror experiment, two reflected-light bridges with near-side latches, safe lamp retrieval, relief and station exit.

**Architecture:** Keep CampaignScene and 640×360. A focused `shatteredCreekLayout.ts` owns geometry, beam physics, state derivation, safety and restoration. A Level04-only `ShatteredCreekController` owns this level's render, actions, HUD/dialogue and colliders; CampaignScene delegates its Level04 hooks rather than growing the old special-case implementation.

**Tech stack:** Existing Phaser3/TypeScript/Vite, no new dependencies or raster changes.

**Spec:** [04-layout.md](04-layout.md), read with [scenario](../scenario/04-shattered-moonlit-creek.md).

## Global constraints

- Scope internal index3 only, branch `codex/level-04-spatial-rebuild`, main baseline0446554. Another chat owns Level03.
- Existing 36×42 Nhinh frames untouched. Player feet+19; body14×6 offset11,37; depth10+feetY/10.
- Geometry/rays/actions/render/checkpoints use one spatial definition. Control radius24 with same-bank access.
- Native asset dimensions, upright identity marks, three actual reflector poses. No PNG edits, library additions, generic puzzle framework, remote publication or user-save reset.
- All subagents native `gpt-6-luna` High/xHigh only, no fallback. Worker has no child agents. Root gets two independent read-only reviewers on the same frozen revision.
- Browser automation currently disabled in Work settings: NOT_RUN if still disabled; never bypass it.

## Review focus

1. F or retrieval/reroute while on or beyond an unlatched bridge must not strand the player. Test both spans, both travel directions and remaining light.
2. Off lantern restored/placed/retrieved must remain off despite shared LanternSystem methods forcing on. Test each source and reload.
3. Old coordinates, pending/crossed flags and old G2=3 cannot grant unintended bridge power or remap new G2=2 repeatedly. Test migration idempotence and inaccessible east saves.
4. Main source, practice source, two latches and relief/exit must remain distinct local targets; tests must use body bounds and bank access, not center-only distances.
5. Actual ray geometry must drive receivers/render. Break G1 in configurationB and assert B dies; test native slash/backslash/horizontal and bounded loops.

## Task 1 — Shared geometry and puzzle model

Files: create `src/data/shatteredCreekLayout.ts`, `scripts/check-shattered-creek.mjs`; update this plan and current spec only when a contradiction is demonstrated.

Interfaces: export readonly `SHATTERED_CREEK` data with banks/water/bridges/objects/stands/routes; types for point/rect/mirror pose/lamp source and state; pure functions for reflector output, ray trace, live state derivation, stage selection, valid walkable center/same-bank approach, prospective-power safety, one-time v1 migration, and safe spawn resolution. Choose concise names and document actual signatures in the worker report; runtime imports these exact helpers. State includes source identity, lanternOn, three poses, practice pose/facts, latches/memo; source `null` means in hand. Live state exposes actual main/practice beam segments, A/B energized, bridge passability and current step.

- [ ] Write focused checks using the exact coordinates and route contracts from04-layout. A path reaches A through G1slash/G2backslash; B through G1slash/G2slash/G3backslash. Assert B dark with G1wrong, in-hand lamp or practice source. Assert test flower independent from main progress.
- [ ] Run the new script and preserve initial missing-helper failure; implement the minimal actual shared model.
- [ ] Exercise every stand and route with14×6 body, absent/temporary/latched bridge combinations and no north/south bypass. Include main-source detour around the practice source. Final practice mirror stand is132,288 (not290, outside body envelope).
- [ ] Test each power-loss/safe restore/migration/completion input in Review Focus, plus source-off and stable latches after ray loss. Require full exit preconditions, not memo alone.
- [ ] Run `node --experimental-strip-types scripts/check-shattered-creek.mjs`; commit model and checks when passing.

## Task 2 — Native composition and isolated level controller

Files: create `src/scenes/ShatteredCreekController.ts`; modify `src/art/CampaignArt.ts`, `src/scenes/CampaignScene.ts`; update focused check/prompt fixture if necessary. Keep the controller feature-specific; no changes to legacy `CreekMirrorPuzzle` used by WorldScene.

Controller context: Phaser scene, Player, Lumo, LanternSystem, InteractionSystem, mutable CampaignProgress, save callback, say callback accepting DialogueLine[] and optional completion, and existing nextLevel callback accepting dialogue. Methods: build(savedCenter?), update(), toggleLantern(), showHint(), showJournal(), destroy(). Exact names may follow local conventions; report them. The component owns its objects, colliders and idempotent cleanup. It restores source/state before deriving a safe spawn, then constructs floor/art/actions and full opening. It creates its own level HUD; generic CampaignScene HUD must not overwrite it.

- [ ] Add an explicit shared-mechanism lookup and whitelist only required mirror/source/receiver/bridge/latch native states, plus Level04 flower states. Preserve getLevelArtKey behavior for all existing levels.
- [ ] Compose the playable field from water/stone textures and native bridge mechanisms; crop scenic framing above floor. Remove the baked permanent crosswalk from the playable view. Render every solid base and water edge visibly. Never copy the offline flat panels.
- [ ] Register one local E action per source, three main mirrors, independent practice mirror, two latches, relief and exit. Exact creek IDs supply prompt artwork bounds and state updates. Near-side bank/range requirements apply at interaction time. Receivers/flower activate from live rays without E.
- [ ] Implement only controller-owned F semantics for Level04, preserving saved on/off around shared lantern methods. Prospective changes use pure safety guard before mutation, with clear refusal dialogue. Stage-specific H and J, original full dialogue and one-time beats follow the spec.
- [ ] Integrate a Level04 early build path and narrow F/H/J/update/HUD/shutdown hooks. Remove replaced index3 props/actions/barriers/ray/crossing code and creek-only fields/helpers; leave other-level code intact. Lumo follows on Level04. Maintain CampaignScene NewGame intent/nextLevel lifecycle.
- [ ] Run focused pure checks, existing forest/woods/start/prompt checks and `npm run build`; restore generated tracked dist; commit working integration.

## Task 3 — Final evidence, review and preview

Files: create/update `docs/implementation/level-04-report.md`, this plan, README/progress current-scope notes, focused script and an optional keyboard browser fixture when warranted. Do not mark unavailable browser checks PASS.

- [ ] Root examines the scene/controller diff against the spec, full dialogue, target clarity, texture swaps and native dimensions, non-overlap, two physical routes, lamp recovery, old saves and Level03/05 transitions. Correct real findings and rerun affected checks.
- [ ] Freeze exact local commit. Root runs build, four existing pure scripts, new creek script, any affected fixture syntax and `git diff --check`. Record PASS/FAIL/NOT_RUN distinctly.
- [ ] Two independent read-only Luna High reviewer tasks inspect that same frozen revision. Keep current-round findings separate until both finish. Address all actionable findings and re-review revisions as needed.
- [ ] Report source SHA, commands/output, source-equivalent documentation commits and remaining limits. Do not reuse old Level02 runtime evidence for Level04.
- [ ] If needed expose a dedicated localhost Level04 preview using an external config and separate origin, seeded only with legitimate Level04 entry including existing Memory Crystal. Preserve any existing origin's save and current5190 Level02 preview. User performs the complete gameplay acceptance. No push/merge until asked.

## Pre-implementation review

Root authored the design after reading scenario/current campaign source/assets and an independent Luna High read-only audit. An independent pre-review checked the selected cardinal ray geometry and bank/span contract with no hard contradiction. Root then refined optical ground offsets against inspected native PNGs and checked safe stands/route detours. The explicit user direction to make routine design choices supplies the execution decision; no extra approval round is required for this bounded local slice.
