# Observatory Room Navigation Design

**Status:** Design approved in conversation; written specification pending user review.
**Date:** 2026-10-16
**Scope:** Reusable room navigation foundation and the three-room Dark Moon Observatory campaign level.

## Intent and constraints

The campaign already has ten sequential level entries, but `CampaignScene` currently renders each level as one fixed 640×360 view. The Dark Moon Observatory scenario requires three connected rooms, physical doors and a root bridge, shared light routing, a Lumo seal, a return loop, and safe recovery after reloading.

This first implementation slice will make that scenario physically traversable and establish a room model that later campaign levels can reuse. It will use existing textures and dialogue. It will not re-layout all other levels, reorganize the asset catalog, or create replacement character art.

## Approved design

### Navigation architecture

Keep one active `CampaignScene` and one player/lantern/save state. Represent each room as a fixed 640×360 view. The scene builds only the active room's background, room props, static collision geometry, doors, and interactables. The player walks to a doorway and presses E to transition; an unlocked door removes its blocking collider, while a closed door blocks movement and can only be activated from its reachable side.

Room construction and transition data should live in a small typed room-definition module instead of adding more room-specific coordinate branches to the existing large scene. A room definition identifies its background, bounds, player doorway spawns, static obstacles, and exits. The scene reuses the existing Player, InteractionSystem, LanternSystem, and CampaignSaveSystem. Rebuilding a room clears its temporary game objects, collision objects, and interactables before registering the next room.

### Observatory room graph and progression

```tex
Entrance Hall  <---- latched Door A ---->  Star-map Corridor  ---- Sun Door ---->  Observatory
     |                                          |                                  |
   pedestal/G0                              G1 + Lumo tube                    G2 + splitter/statue
                                                                                Sun lock + roots
                                                                                shadow bridge
                                                                                record + crystal
     <---------------- stone return loop opened from the Observatory ---------------->


- **Entrance Hall:** The lantern pedestal, shared source mirror G0, and Door A are present. The light route opens Door A. Nhinh enters the corridor and latches the door from its inside control; that latch preserves the return route when G0 later changes direction.
- **Star-map Corridor:** G1 and the marked Lumo tube/seal are present. Calling Lumo starts the authored route through the tube. The seal condition becomes active only when Lumo reaches the seal. The corridor remains walkable back to the entrance after Door A is latched.
- **Observatory:** G2 feeds either the Sun lock directly or the fixed splitter beside the statue. The direct route may open the Sun Door but leaves the root bed lit, so it cannot create the shadow bridge. The split route lights the Sun lock while the statue shadows the roots. The bridge is usable only while the Sun lock, shadow condition, and Lumo seal condition are simultaneously active.
- After Nhinh reaches the far bank, E opens/latches the final door and opens the stone return loop. The loop gives a walkable route to the lantern and Lumo call point. Completion requires the loop open, lantern retrieved, Lumo recalled, final record read, and Balance Crystal collected.

Mirror states and the statue orientation are saved as the source of truth. Beam connectivity, the Sun lock, and the root bridge are recomputed from those saved values and Lumo's actual room/position after each change and on load; they are not restored from stale derived flags. Door A and the final-door latch are persistent puzzle states.

### Collision, Lumo, and save recovery

Each room defines walkable floor and static obstacles. The player collides with these obstacles and with closed doors; existing world-bound collision remains active. Interactables are registered only for the active room. Door controls are reachable from their intended side.

Lumo's call routes use named room-local waypoints through the authored tube links. His saved room, current position, target, and route/arrival state determine whether a seal is held. When he is in another room, he is not rendered in the active view, but his saved route/arrival state continues to drive the puzzle correctly.

Save data records the active room and a safe room-local player checkpoint in addition to the existing lantern, mirror, statue, and Lumo data. A transition writes the destination room and its doorway spawn together. Loading restores puzzle inputs first, rebuilds the saved room, places Nhinh on reachable floor, then recomputes beams and dynamic doors/bridges before movement is enabled. If a save occurs while Nhinh is on the root bridge, reload uses the reachable near-bank floor. A bridge that should retract while Nhinh is on it remains until she reaches safe ground.

### Scope boundaries

Included:

- Typed room definitions and room lifecycle within `CampaignScene`.
- Room-local static collisions, physical doors, doorway transitions, and safe player spawns.
- The three-room Observatory layout and its shared-source mirror/splitter/statue puzzle.
- Lumo tube routing and seal arrival state for the Observatory.
- Persistent latches, save/reload reconstruction, final return loop, record, crystal, and level transition.
- Use of assets already in the repository, with procedural fallback textures retained where required.

Deferred:

- Physical room maps and route-specific puzzle rebuilding for Levels 01–08 and Level 10.
- Asset file moves, manifest dimension cleanup, missing-art creation, or new character sprites.
- Unrelated narrative edits, combat, new controls, or a camera-scrolling world.

## Acceptance criteria

1. The Observatory presents three distinct rooms connected by walkable door transitions; its relevant mirror, seal, record, and crystal objects appear in the intended rooms.
2. The player cannot walk through room walls, closed doors, or unbridged roots. Open/latching a door changes both the visible state and the collision state.
3. Door A remains traversable after G0 is changed, so the player can return to the source mirror.
4. Calling Lumo does not immediately satisfy the seal; the seal becomes active after the saved route reaches its destination.
5. A direct G2-to-Sun route opens the Sun Door but does not create the bridge. The splitter/statue route creates the bridge only when the Sun lock is lit, the root bed is shadowed, and Lumo holds the seal.
6. If a live bridge condition becomes false while Nhinh is on the bridge, it does not retract beneath her; it retracts after she reaches a safe bank.
7. The final room can be exited safely through the opened return loop to retrieve the lantern and recall Lumo. The level cannot complete before the record and Balance Crystal are handled.
8. Reloading from each room and from representative puzzle states restores a reachable spawn, lantern placement/state, mirror/statue inputs, door latches, and Lumo's room/route; dynamic beams, locks, and bridge state are recalculated before controls resume.
9. Existing campaign level progression and save compatibility continue to work; the implementation does not rename existing texture keys or move assets.
10. `npm run build` passes. A browser playthrough verifies room transitions, collision/lock behavior, all puzzle branches, save/reload checkpoints, and completion to Level 10.

## Planned verification

- Build/type check: `npm run build`.
- Manual browser playthrough: unlock/latch Door A, return after changing G0, test direct versus split G2 routes, hold and leave Lumo's seal, test bridge withdrawal at a safe bank, open the return loop, collect the lantern, recall Lumo, read the record, take the crystal, and continue.
- Save/reload checks: entrance hall, corridor, observatory before/after the bridge, and after opening the loop; confirm restore uses reachable ground and recomputes derived beam/door/bridge state.
- Static review of room transitions and state reconstruction against `docs/scenario/09-dark-moon-observatory.md`.

Browser verification depends on the local game page being accessible to the configured browser tooling. If that remains unavailable, report it as `NOT_RUN` and retain the build and manual-state evidence separately.

## Design risks and unresolved details

- The scenario does not prescribe exact numeric mirror indices for every route. The implementation must map the existing four-way mirror rotations to named, visibly indicated routes and document those mappings in room data; it must not infer success from the player's interaction order.
- Lumo's existing direct-to-target movement is not tube-aware. Waypoint routing and room handoff need to preserve his target and arrival state across room transitions and reloads.
- The current `CampaignScene` combines rendering, interaction registration, puzzle logic, and persistence. The room-definition boundary should reduce scene complexity without turning this first slice into a generic level editor.
- This slice does not close the broader campaign gap: Levels 01–08 and 10 still need their own scenario-backed room layouts and physical traversal after the Observatory foundation is established.
