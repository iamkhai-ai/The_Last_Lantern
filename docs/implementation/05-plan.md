# Level 05 Spatial Rebuild Implementation Plan

> **For agentic workers:** Execute the coupled room/controller task below using subagent-driven-development. Read the scenario and `05-layout.md` first. Steps use checkbox syntax.

**Goal:** Deliver a coherent, playable Level05 teaching Lumo cooperation through safe practice, mechanically held doors and a dark ink corridor.

**Architecture:** A focused PathForTwoLevel owns three rooms inside CampaignScene. Pure pathForTwoLayout geometry/state owns positions, bodies, gate/arrival rules and save restoration; existing render and interaction systems consume those definitions. CampaignScene integration is limited to campaign index4 and follows the existing LibraryLevel pattern.

**Tech Stack:** Existing Phaser3, TypeScript, Vite; no new package or PNG changes.

**Spec:** `docs/implementation/05-layout.md`, narrative authority `docs/scenario/05-a-path-for-two.md`.

## Global Constraints

- Scope Level05 (index4) only. Keep other scenes/levels, character frames and save key compatible.
- Existing 640×360 viewport, Vietnamese dialogue/UI, English filenames. Use existing art with preserved aspect ratio.
- Feet=center+(0,19), body14×6 offset(11,37). Full standing prop footprints are solid from all four directions. Rendering, physics, interaction and safe restore consume shared geometry.
- Three local rooms; do not repurpose Observatory roomId or create a universal framework. Follow the shared measured prompt placement contract.
- Door power is real Lumo arrival. No timers or permanent power from history. Occupied thresholds defer closure; latched doors stay open.
- No user save reset, external messaging, push or merge. Root handles final checks and two independent reviews on the same frozen source revision.

## Review Focus

- A player on either side of an unlatched entrance can recover the route; an off-room Lumo still travels and powers only the assigned plate.
- All controls can actually be reached by the foot body on the intended side; no console can latch a door through a wall.
- Reload during travel, in a closing threshold, or in a legacy coordinate restores safely without awarding a new latch or skipping a room.
- Lantern toggle in the ink corridor changes visibility without changing floor safety or discarding discovered ink.
- Other level paths in CampaignScene retain their existing spawn, Lumo, input, HUD, rendering and restart behavior.

### Task 1: Three-room Level05 slice

**Files:**
- Create `src/data/pathForTwoLayout.ts`: typed room spatial data, body/solid helpers, gate/arrival rules, restore/legacy normalization as needed.
- Create `src/levels/PathForTwoLevel.ts`: room render/physics/interactions, local companion route, story, H/J/HUD, lifecycle.
- Modify `src/art/CampaignArt.ts`: register required Level05 modules using the existing assets; no preview imports.
- Modify `src/scenes/CampaignScene.ts`: focused index4 build/update/destroy/input/HUD routing; prevent legacy index4 routines competing with controller.
- Create `scripts/check-path-for-two.mjs`: meaningful pure geometry/state regression checks using the existing node TypeScript-support pattern.
- Create `docs/implementation/level-05-report.md`: worker completion/evidence and coordinate adjustments.

**Interfaces:**
- Controller consumes scene, CampaignProgress, Player, Lumo, InteractionSystem, LanternSystem, save(), say(lines,onComplete?), nextLevel(lines) callbacks, following LibraryLevelOptions style.
- Controller exposes build(), update(dt), destroy(), startOpeningDialogue(), showHint(), showJournal(), getObjectiveText(), getStatusText(), getProtectedPromptBounds(); may expose room/companion HUD text. Its update exclusively advances Level05 Lumo.
- Pure layout exports the exact actor body, room definitions and predicates used by the controller. Export only helpers used by runtime or meaningful checks.

- [ ] Read scenario, layout and existing LibraryLevel/CampaignScene APIs. Build an explicit player route and verify every stand against full body geometry before rendering.
- [ ] Add focused pure checks that initially expose unavailable geometry/state behavior. Cover every required control's path, four-direction solid contacts, closed/open posts, actual arrival and threshold release, both recall sides, safe room/spawn restore and legacy latch normalization.
- [ ] Implement shared room geometry and focused controller. Render all blocking walls/props, keep doorway floor below feet and actual lintel/posts above as appropriate. If a published coordinate proves unreachable, make the smallest consistent adjustment and record it in layout/report before completing.
- [ ] Implement companion route and all story interactions. Keep complete scenario dialogue, safe practice, arrival checks, same-side latches, safe ink, reunion and E exit to index5. Persist committed progress without marking arrival from history.
- [ ] Integrate only index4 in CampaignScene: skip generic drawRoom/addNarrativeProps/registerLevel/barriers/beams and old Lumo arrival/return logic for this level. Route H/J/HUD/prompts and lifecycle to the controller. Ensure no second Lumo.update runs in the same frame.
- [ ] Run `node scripts/check-path-for-two.mjs` and `npm run build`. Report exact commands/results; preserve runtime/human playtest as NOT_RUN if unavailable. Revert only this task's generated dist output after build.
- [ ] Self-review, commit source and report, return commit hashes and concerns. No nested subagents.

### Root acceptance

- [ ] Review diff, run the focused checks and build on frozen worker revision; inspect separate-origin runtime if available.
- [ ] Obtain two independent read-only Luna high reviews of that same revision, one emphasizing scenario/flow and one collision/save/integration. Reconcile only after both complete; send confirmed corrections to the worker, then repeat affected checks/reviews.
- [ ] Record final checked revision, decisions, evidence and limitations. Keep branch available for the user's gameplay review; do not merge/push without a new request.

## Repair round — 2026-10-18 levels 05–10 repair, task T06

Task T06 re-verified this plan's contract against the shipped code and closed the gaps below. It also
implements the repair plan's decisions **D1 (the lesson is optional)** and **D2 (the memory stays at
latch C)**; the full coordinate list and the measured numbers live in `05-layout.md`, and the corrected
flow narrative in `level-05-flow-plan.md`.

- D1: `callEligible('a')` is independent of `l4-practice-complete`, nothing writes that flag except a real recall from the lesson plate, the entry objective/HUD stop naming the practice marker once `l4-called-a` is set, and the lesson still teaches send/travel/arrival/recall while its door never closes on the player inside the alcove.
- D2: the seven-line memory plays at latch C and the wall engraving replays it; `l4-memo` is written when the dialogue completes.
- `latch-c` is enabled in the ink room before the ink exists and refuses with the missing step, without latching early; the reunion objective names the C handle and reports travelling/arrived.
- A room change arms a held-E guard (armed before the new room registers, cleared on key release) and the room rebuild clears the interaction registry, so a held press cannot fire twice through a threshold.
- Return arrivals move from `+20` (480,230 — 9px inside the door trigger) to `+40` **(480,250)**, 29px clear and still walkable and connected in both rooms.
- The single shared (180,280) fallback is replaced by per-room named checkpoints (`PATH_CHECKPOINTS`), because (180,280) clips the relay and ink wall bands.
- The ink mark is one 348×48 tile at (358,242); root cables follow every authored waypoint in ≤160px stamps with elbows at real corners; the C tube mouth leaves door C's passage for (536,214); the spiral engraving is on the visible east wall with a reachable stand.
- A small geometry-only schematic from the same room/seal/pipe data is drawn beside each call marker; no lettering and no baked staging, and the "pillars" claim is dropped because there are no pillars in this level's wall data.
- Standing props and door controls now share one layout approach predicate across prompt, `isEnabled`, `ownsPosition` and the action (`isPathApproachAllowed` / `isPathDoorApproachAllowed`), which is what `check-interaction-targets.mjs` §bullet-3 expects of L05.
- `pendingClose` and `l4-lumo-arrived` were confirmed write-only (no reader anywhere at `ee34eba`) and deleted.
- `scripts/check-path-for-two.mjs` now counts its geometry/state invariants as a case as well (19 cases) and exits non-zero whenever any case fails, naming it on the summary line.

## Decisions and risks

Room switching is selected to keep the lesson readable; it adds local companion room/route persistence. The narrowest native door gap is44px and must be checked using body width14. Lumo.update hovers around an offset target, so route/arrival calculations must compensate for that actual behavior. Whole-prop solids must not obstruct the end foyer; the existing latch doubles as recall after C rather than adding another pedestal. The other thread's Level04 changes may later touch CampaignScene; keep index4 integration small and explicit.
