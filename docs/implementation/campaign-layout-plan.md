# Level 01 Spatial Rebuild Implementation Plan

> **For agentic workers:** Execute the single bounded Level 01 task below. Required context: original scenario, `01-layout.md`, common design, asset audit. Root coordinates native subagents. Worker must not delegate further.

**Goal:** Make Level 01 a coherent, physically traversable opening with legible tutorial progression and correct object occlusion.

**Architecture:** Keep CampaignScene and existing durable save keys. Add a focused, pure Level 01 spatial/state module consumed by Level 01 rendering, interaction, collision, hint and restore code. Avoid a general campaign framework; Levels 02–10 keep their current logic.

**Tech Stack:** TypeScript, Phaser 3, Vite; existing raster assets, Node checks without a new dependency.

**Spec:** `docs/implementation/01-layout.md`, backed by `docs/scenario/01-forgotten-forest-edge.md`.

## Global constraints

- Implement Level 01 only. Preserve current Nhinh PNGs, save key and centered Player public position API. No remote push/merge or retained dev server.
- World 640×360; HUD y=0..58 and y=320..360. Ground anchors, stand points, solid footprints and depth ordering follow `01-layout.md`.
- New-game states follow pickup→light→read→Pulse→ring charge→latched gate→physical exit. Existing durable saves remain usable.
- Vietnamese dialogue comes from the scenario; English paths. Preserve story timing and repeat interactions.
- PASS requires actual commands; a worker report alone is not verification. Root runs final checks and obtains two independent frozen-revision reviews.

## Review focus

- Foot body versus art baseline: collision and depth must use the same ground point while idle, moving, talking and restored.
- Controls through solids/closed gates: E is reachable from intended side, with no hidden interaction behind art.
- Old saves inside newly solid objects or past a locked gate: resolve to reachable floor without deleting progress.
- Input dismissal/fast key repeats: no early Pulse, repeated one-time cutscene or gate advancement from stale active target.
- Asset anchor/state changes: open/closed gate must not jump; pickup removes exactly its own sprite; ring stays below feet.

### Task 1: Rebuild Level 01 from spatial data

**Files:** Create `src/data/forestEdgeLayout.ts` (or similarly focused name), modify Level 01 branches in `src/scenes/CampaignScene.ts`, adjust `src/actors/Player.ts` only if needed for foot placement/depth synchronization, and add focused no-dependency geometry/state checks. Update this task's report at `docs/implementation/level-01-report.md`. Do not edit level scenario, other-level puzzle logic or assets. Loader changes only if needed to reference the existing open arch from L02, which is already registered.

**Interfaces:** Spatial module exports typed object IDs, anchors/stand points, footprint rectangles, named spawn/checkpoints, foot offset, depth helper, receiver charge predicate and safe-spawn resolver. Names may follow repo idiom; values must come from the Level 01 layout. Runtime consumers share those exports. No unrelated abstract level editor, scene router or save version migration.

- [ ] Read scenario, layout, art map and relevant engine code; record deviations before implementation.
- [ ] Add pure spatial definitions and focused checks for route reachability with closed/open gate, solid interaction access, actor foot transform, safe checkpoint recovery and ring charge stages. Check runtime physics constants match these inputs; do not test a duplicate map disconnected from runtime.
- [ ] Implement Level 01 terrain/props using correct pivots, native proportions and ID-bound state images. Add trunk/base/rock/post colliders and the stateful gate passage collider. Tie every invisible physics rectangle to visible terrain/prop.
- [ ] Implement wake/nearby Lumo meeting, pickup/re-read, lit tablet requirement, post-reading Pulse discovery, charging/latched eye and explicit passage exit. Use full relevant scenario lines and repeat dialogue. Preserve active interaction checks when E is pressed; make any shared-system amendment small and compatibility-safe.
- [ ] Implement step-aware objective, H escalation and J records; show only taught controls. Follow Lumo when unassigned. Restore old saves onto reachable floor before movement; compute visual/collider states from durable flags.
- [ ] Run focused checks, `npm run build`, `git diff --check`; report exact commands/status. Root handles browser evidence separately, so do not claim playthrough from state fixtures.
- [ ] Inspect changes for scope, commit code to local feature branch after checks, write report with commit hash, files, decisions/deviations, evidence and known limits. No push/merge.

### Final validation and review (root)

- [ ] Root reruns build and focused checks on frozen worker commit.
- [ ] Root uses separate localhost origin for browser geometry/tutorial smoke; preserve user's save and stop local server afterward.
- [ ] Two independent read-only Luna high reviewers examine same frozen commit against scenario/layout; collect findings separately before reconciling.
- [ ] Worker addresses confirmed findings and checks/reviews repeat for affected revision.
- [ ] Report current Level 01 result and reviewable branch/path; Levels 02–10 remain deferred.
