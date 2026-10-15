# Observatory Room Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Level 09 a physically traversable three-room Observatory with live light/shadow puzzle logic, safe save recovery, and its complete return-and-crystal sequence.

**Architecture:** Keep one `CampaignScene` and rebuild only the active 640×360 room. Put typed room layout, spawn, exits, and obstacle data in a dedicated data module; let the scene own rendering, collision, and interactions. Extend campaign save data compatibly and derive Observatory gates and bridge from saved puzzle inputs plus Lumo's actual route/arrival state.

**Tech Stack:** Phaser 3, TypeScript, Vite, browser localStorage.

**Spec:** `docs/superpowers/specs/2026-10-16-observatory-room-navigation-design.md`

## Global Constraints

- Use one active `CampaignScene`; represent each room as a fixed 640×360 view.
- Implement the reusable room foundation and the three-room Observatory only; leave other campaign levels on their existing layout.
- Use existing texture keys and retain procedural fallbacks; do not move assets or rename texture keys.
- Keep existing save compatibility; persist puzzle inputs and recalculate derived beams, locks, and bridge state after load.
- Lumo satisfies a seal only after his saved route reaches the seal; a bridge that should retract waits until Nhinh reaches a safe bank.
- Do not add unrelated narrative, combat, controls, or camera scrolling.

## Review Focus

- **Legacy Level 09 save with no room fields:** load at a reachable entrance spawn and preserve existing flags/counters. Verify with the default-room migration path in Task 4.
- **Door or room transition while light routing changes:** never strand Nhinh behind a closed/latching door. Verify both directions and Door A after G0 changes in Task 2 and Task 3.
- **Lumo called from another room or saved mid-route:** do not activate the seal early or lose the route on reload. Verify arrival and resume behavior in Task 3 and Task 4.
- **Bridge condition becomes false while Nhinh is on it:** retain collision/support until she reaches a bank, then retract. Verify both bank directions in Task 3.
- **Save on a doorway, bridge, or after the return loop opens:** restore to reachable floor with coherent lantern placement, room, latches, and derived puzzle state. Verify the recovery matrix in Task 4.

---

## File Map

- Create `src/data/observatoryRooms.ts`: room IDs, 640×360 room definitions, entry spawns, exits, obstacles, interactable placement data, and room-local Lumo waypoints.
- Create `src/systems/ObservatoryPuzzle.ts`: pure derivation of route connectivity, Sun lock, root shadow, and bridge eligibility from mirror rotations, statue orientation, lantern state, and Lumo seal arrival.
- Modify `src/scenes/CampaignScene.ts`: dispatch Level 09 to room lifecycle; build and clear active-room objects/colliders; handle transitions, puzzle interactions, Lumo waypoint travel, dynamic gates/bridge, Observatory record/crystal and completion.
- Modify `src/systems/CampaignSaveSystem.ts`: validate and store optional Observatory room/checkpoint and Lumo route state while preserving version 1 saves.
- Modify `src/actors/Lumo.ts` only if needed to expose a small route-target/arrival interface; keep generic following behavior unchanged for other levels.
- No changes to `src/data/campaignLevels.ts` are required unless a precise objective/hint correction is needed to match the implemented route; if changed, keep the existing Level 09 title and progression.

## Task 1: Define the Observatory room model and puzzle derivation

**Files:**
- Create: `src/data/observatoryRooms.ts`
- Create: `src/systems/ObservatoryPuzzle.ts`

**Interfaces:**
- Produces `ObservatoryRoomId = 'entrance' | 'corridor' | 'observatory'`.
- Produces `OBSERVATORY_ROOMS: Record<ObservatoryRoomId, ObservatoryRoomDefinition>` with `width: 640`, `height: 360`, a background biome, safe entry points, room-local obstacles, exits, and interactable placements.
- Produces `deriveObservatoryState(input: ObservatoryPuzzleInput): ObservatoryDerivedState`; derived result includes active beam path, Door A unlock, Sun Door unlock, root-bed shadow, and bridge eligibility.
- Place G0/pedestal/Door A in Entrance Hall; G1 and Lumo's tube/seal in Star-map Corridor; G2/splitter/statue/Sun lock/roots/bridge/record/crystal in Observatory, following the approved three-room design.

- [ ] Define room, exit, spawn, obstacle, and waypoint types with literal room IDs and 640×360 bounds.
- [ ] Define each room's walkable exits and both sides' entry spawn coordinates; ensure each closed door control has a reachable interaction point.
- [ ] Define named beam routes from G0 through G1/G2, including direct G2-to-Sun and split G2-to-lock/root branches; document rotation values at the route data.
- [ ] Implement `deriveObservatoryState` so the direct route can light the Sun lock while leaving roots lit, and the split route can light the lock while statue orientation shadows the root bed.
- [ ] Verify the module with `npm run build`; inspect each definition against the approved diagram and `docs/scenario/09-dark-moon-observatory.md`.
- [ ] Commit as `feat: define observatory rooms and light routes`.

## Task 2: Build active rooms, physical movement, and door transitions

**Files:**
- Modify: `src/scenes/CampaignScene.ts`
- Modify: `src/systems/CampaignSaveSystem.ts` for the room checkpoint fields needed by transitions.
- Use: `src/data/observatoryRooms.ts`

**Interfaces:**
- Consumes `OBSERVATORY_ROOMS` from Task 1.
- Adds optional `roomId?: ObservatoryRoomId` and `roomSpawn?: { x: number; y: number }` to `CampaignProgress`, preserving existing version 1 saves.
- Adds scene methods `buildObservatoryRoom(roomId: ObservatoryRoomId, spawnId?: string): void`, `clearActiveRoom(): void`, and `transitionObservatory(exitId: string): void`.
- Room transitions retain the same `Player`, `LanternSystem`, `InteractionSystem`, and `CampaignProgress` instances.

- [ ] Route only `progress.level === 8` through the Observatory room builder; preserve `buildLevel()` for all other levels.
- [ ] Build the active room background, room props, static obstacle bodies, visible exits, and only that room's interactables; track all room-owned game objects and colliders for cleanup.
- [ ] Add room-local Arcade colliders between the player's existing body and room obstacles/closed doors; preserve world bounds.
- [ ] Register each exit as an E interaction that checks its current unlock/latch state, moves to the destination spawn, rebuilds the room, clears stale interactables/colliders, and saves destination room plus spawn atomically.
- [ ] Implement Door A's inside latch control and a separate stateful Sun Door; opening a door must update both appearance and collision immediately.
- [ ] Verify with `npm run build` and a browser pass for Entrance→Corridor→Observatory transitions, blocked closed doors, wall collision, reachable controls, and return through latched Door A.
- [ ] Commit as `feat: add physical observatory room navigation`.

## Task 3: Implement live light puzzle, Lumo tube, and bridge behavior

**Files:**
- Modify: `src/scenes/CampaignScene.ts`
- Modify: `src/actors/Lumo.ts` only if the existing interpolation API cannot represent room-local waypoints cleanly.
- Use: `src/systems/ObservatoryPuzzle.ts`

**Interfaces:**
- Consumes `deriveObservatoryState(input)` from Task 1.
- Adds `callObservatoryLumo(destination: 'seal' | 'recall'): void` and room-aware Lumo route state; `sealHeld` becomes true only when Lumo reaches the seal waypoint.
- Derived locks and bridge update whenever G0–G2, statue, lantern, or Lumo arrival changes.

- [ ] Register G0, G1, G2, splitter/statue, lantern placement/retrieval, Lumo seal, and latch interactions in their authored rooms; persist every input change.
- [ ] Route Lumo through the authored tube waypoint sequence across rooms; hide him outside the active view while retaining his room and route state.
- [ ] Gate Door A from the G0 route until its inside latch is set; after latching, keep it traversable when G0 is redirected.
- [ ] Apply direct and split G2 routes from the pure derivation: direct route opens Sun Door without the bridge; split route only enables the bridge when Sun lock is lit, roots are shadowed, and Lumo is physically at the seal.
- [ ] Create bridge collision/support only while eligible; if eligibility becomes false while Nhinh overlaps the bridge, defer removal until her body is on a safe bank.
- [ ] Verify with `npm run build` and browser checks for direct-vs-split routing, Lumo-before-arrival rejection, Lumo arrival activation, Door A persistence, and bridge retraction from each side.
- [ ] Commit as `feat: implement observatory light and root bridge puzzle`.

## Task 4: Persist room recovery and complete the Observatory sequence

**Files:**
- Modify: `src/systems/CampaignSaveSystem.ts`
- Modify: `src/scenes/CampaignScene.ts`

**Interfaces:**
- Consumes the optional room/checkpoint fields added in Task 2; existing `version: 1` data remains valid.
- Stores Lumo's room, route waypoint/index, target, and seal-arrival state as validated save data or typed progress counters/flags.
- Scene restore order: load inputs → choose saved room and safe spawn → build active room → restore actors/lantern → derive doors/beams/bridge → enable controls.

- [ ] Extend `CampaignSaveSystem.validate` to accept missing room/Lumo fields from older saves and reject invalid room IDs, non-finite coordinates, and invalid route indices.
- [ ] Store room destination and safe spawn together on transitions; checkpoint Nhinh to reachable floor and map bridge/doorway saves to the nearest safe bank/spawn on reload.
- [ ] Restore lantern-on-hand or lantern-on-pedestal placement, G0–G2 rotations, statue orientation, latches, Lumo room/route/arrival, record read state, and return-loop state before deriving dynamic puzzle visuals/collision.
- [ ] Keep the root bridge present under Nhinh until she reaches safe ground after a condition loss; on reload never place her on a retracted bridge or beyond a closed door.
- [ ] After she crosses the bridge, expose an Observatory-side final latch and E-operated stone return loop that stays open; ensure the loop reaches the lantern pedestal and Lumo call point even with the beam network off.
- [ ] Add final record/The Shadow interaction, crystal pickup, journal/read state, and level transition only after return loop open, lantern retrieved, Lumo recalled, record read, and Balance Crystal collected.
- [ ] Verify with `npm run build` and browser save/reload checks at entrance, corridor, observatory before/after crossing, bridge, and return-loop states; verify legacy version 1 save and completion into Level 10.
- [ ] Commit as `feat: persist observatory progress and completion`.

## Task 5: Run final acceptance playthrough and review

**Files:**
- Modify only implementation files if acceptance defects are found.

- [ ] Run `npm run build`; expected result is a clean TypeScript check and Vite production build.
- [ ] Play the Observatory from a legacy-compatible save: unlock/latch Door A, redirect G0 and return, call Lumo and wait for seal arrival, test direct and split G2 routes, cross the bridge, open the return loop, retrieve the lantern, recall Lumo, read the record, collect the crystal, and continue to Level 10.
- [ ] Reload at each recovery checkpoint and confirm reachable spawn, restored inputs, and recomputed gates/bridge before controls resume.
- [ ] Review final diff for changes outside the files in this plan; preserve pre-existing uncommitted campaign edits and do not include them in implementation commits unless their ownership is explicitly established.
- [ ] Record build and browser outcomes as `PASS`, `FAIL`, or `NOT_RUN`, bound to the final revision; if browser tooling cannot access the local page, report that evidence as `NOT_RUN`.
