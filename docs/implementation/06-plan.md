# Level 06 Spatial Rebuild Implementation Plan

> **For agentic workers:** Execute the coupled controller task below using subagent-driven-development. Read the scenario and `06-layout.md` first. Steps use checkbox syntax.

**Goal:** Deliver a coherent, playable Level 06 teaching "more light is not always more help" through a safe splitter bench, a three-condition simultaneous machine and a permanent Return-Flow switch.

**Architecture:** A focused SleeplessTowerLevel owns the single tower-top room inside CampaignScene. Pure towerLayout geometry/state owns positions, bodies, optical routing rules, live-condition derivation, switch gating, restore and one-time legacy migration; existing render and interaction systems consume those definitions. CampaignScene integration is limited to campaign index 5 and follows the Level 05 controller pattern.

**Tech Stack:** Existing Phaser 3, TypeScript, Vite; no new package or PNG changes.

**Spec:** `docs/implementation/06-layout.md`, narrative authority `docs/scenario/06-the-sleepless-tower.md`.

## Global Constraints

- Scope Level 06 (index 5) only. Keep other scenes/levels, character frames and save keys compatible.
- Existing 640×360 viewport, Vietnamese dialogue/UI, English filenames. Use existing art with preserved aspect ratio; shared prism/mirrors/receivers and Level 05 C vocabulary are reused, not re-authored.
- Feet=center+(0,19), body 14×6 offset(11,37). Full standing prop footprints are solid from all four directions. Rendering, physics, interaction and safe restore consume shared geometry.
- Single local room; do not create a universal framework or repurpose other roomIds. Follow the shared measured prompt placement contract; HUD text bands y0..70/320..360 stay free of playable props.
- Live conditions are recomputed every frame from source, poses and actual Lumo presence. No timers, no latching from history; occupying a stand is not completion. The Return-Flow lever latches only while A, B and C are all live, and only once.
- Remove the coming-soon gate for index >= 4 (mirrors `codex/level-05-flow-redo`) so the legacy index 4 exit leads into the new Level 06 for end-to-end review; legacy index 5 routines are bypassed, not deleted.
- No user save reset, external messaging, push or merge. Root handles final checks and two independent reviews on the same frozen source revision.

## Review Focus

- Every control (lamp, G0, G1, G2, bench source/mirror, call, lever, chamber, record, exit) has a stand reachable by the foot body; no control can be actuated through a wall or solid prop footprint.
- Direct G0 routes light exactly one receiver; the splitter route lights A only through G1 pose 2 and B only through G2 pose 1; beams and rings show the same truth the machine acts on.
- Losing any condition before the switch makes the machine wait again; C counts only while Lumo is actually on plate C; the lever refuses with a named missing condition.
- Reload during Lumo travel, after switch, or from a legacy save restores safely without duplicating the switch, re-awarding crystal/record, or misplacing Lumo; migration runs once under `l5-layout-v2`.
- Other level paths in CampaignScene retain their existing spawn, Lumo, input, HUD, rendering and restart behavior; no second Lumo.update runs in the level 06 frame.

### Task 1: Single-room Level 06 slice

**Files:**
- Create `src/data/towerLayout.ts`: typed spatial data, body/solid helpers, optical routing and live-condition predicates, switch/exit gating, restore and legacy normalization.
- Create `src/levels/SleeplessTowerLevel.ts`: room render/physics/interactions, beams and indicators, Lumo call/travel/recall, story, H/J/HUD, lifecycle, save.
- Modify `src/art/CampaignArt.ts`: register required Level 06 and shared prism modules using existing assets; no preview imports.
- Modify `src/scenes/CampaignScene.ts`: focused index 5 build/update/destroy/input/HUD routing; bypass legacy index 5 routines; remove the coming-soon gate.
- Create `scripts/check-sleepless-tower.mjs`: meaningful pure geometry/state regression checks using the existing node TypeScript-support pattern.
- Create `docs/implementation/06-report.md`: worker completion/evidence and coordinate adjustments.

**Interfaces:**
- Controller consumes scene, CampaignProgress, Player, Lumo, InteractionSystem, LanternSystem, save(), say(lines,onComplete?), nextLevel(lines) callbacks, following PathForTwoLevelOptions style.
- Controller exposes build(), update(dt), destroy(), startOpeningDialogue(), showHint(), showJournal(), getObjectiveText(), getStatusText(), getProtectedPromptBounds(); may expose stage HUD text. Its update exclusively advances Level 06 Lumo and calls lumo.update(dt,x,y,true).
- Pure layout exports the exact actor body, room geometry, route predicates and live-condition helpers used by the controller. Export only helpers used by runtime or meaningful checks.

- [x] Read scenario, layout and existing PathForTwoLevel/CampaignScene APIs. Build an explicit player route and verify every stand against full body geometry before rendering.
- [x] Add focused pure checks that initially expose unavailable geometry/state behavior. Cover every stand route, four-direction solid contacts, direct vs split lighting truth tables, condition loss reverting to waiting, C only on actual presence, switch/exit gating, spawn/restore fallbacks and one-time migration from legacy counters.
- [x] Implement shared geometry and focused controller. Render all blocking props, keep floor decor below feet and wall visuals above as designed. If a published coordinate proves unreachable, make the smallest consistent adjustment and record it in layout/report before completing.
- [x] Implement optic routing, indicators and all story interactions. Keep complete scenario dialogue, bench practice, send/recall C, switch narration, chamber, record, exit to index 6. Persist committed progress without marking completion from history.
- [x] Integrate only index 5 in CampaignScene: skip generic drawRoom/addNarrativeProps/registerLevel/barriers/beams and old index 5 lantern/beam/crystal logic for this level. Route H/J/HUD/prompts and lifecycle to the controller. Ensure no second Lumo.update runs in the same frame. Remove the coming-soon gate for index >= 4.
- [x] Run `node scripts/check-sleepless-tower.mjs` and `npm run build`. Report exact commands/results; preserve runtime/human playtest as NOT_RUN if unavailable. Revert only this task's generated dist output after build.
- [x] Self-review, commit source and report, return commit hashes and concerns. No nested subagents.

### Root acceptance

- [ ] Review diff, run the focused checks and build on frozen worker revision; inspect separate-origin runtime if available.
- [ ] Obtain two independent read-only Luna high reviews of that same revision, one emphasizing scenario/flow and one collision/save/integration. Reconcile only after both complete; send confirmed corrections to the worker, then repeat affected checks/reviews.
- [ ] Record final checked revision, decisions, evidence and limitations. Keep branch available for the user's gameplay review; do not merge/push without a new request.

## Decisions and risks

Single room is selected because the scenario is one chamber and the base art already stages it; this keeps the lesson that simultaneous conditions change what a player can do. The bench teaches splitter and input gating only; the scenario's two branch mirrors are carried by the main machine's G1/G2, which gate A and B independently. Direct G0 routes deliberately light one eye, punishing the obvious "one beam at a time" upgrade. G1's stand sits at (275,218) to clear the prism art while remaining 24px-reachable from its optical. The fountain renders at depth 20 behind the tower lamp so water visibly rises into the light. The status strip and rings hide after the switch to match held-lever evidence. Lumo.update hovers around an offset target, so travel/arrival math must compensate for actual behavior. The other thread's Level 05 changes may later touch CampaignScene; keep index 5 integration small and explicit, and record the gate removal in the report for the eventual merge decision.
