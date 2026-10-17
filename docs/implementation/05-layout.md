# Level 05 — A Path for Two: spatial design

Source: `docs/scenario/05-a-path-for-two.md`. Scope: Level 05 only (campaign index 4). Implementation base: `64d8e63`. Vietnamese story and UI, English filenames, current character frames and existing PNG assets remain authoritative.

The user has delegated routine design decisions and asked for careful planning followed by Luna high implementation. This document records those decisions without another approval round.

## Experience and choice

Use three 640×360 rooms inside the existing CampaignScene, owned by a focused `PathForTwoLevel` controller. A single packed view would make the practice door, two relay doors and ink route compete for space; a scrolling map would require wider camera and UI changes. Local room transitions preserve the existing scene, save format and ten-level sequence. No general room engine is needed.

Flow: entry → safe send/arrival/recall practice → send A → enter relay → latch A on the far side → send B → enter ink room → latch B → switch off lantern/read ink → send C to the far end → follow the safe corridor → latch C → spiral-memory conversation → recall and wait for Lumo → E at stairs to Level 06. All committed doors remain usable for backtracking. No timeout, fall, reset, or loss of learned clues.

## Shared geometry contract

- Floor foot bounds: x=24..616, y=80..310. Top UI ends above y=70; status/help begins y=320. Actor frame remains 36×42. Feet = center+(0,19), Arcade body 14×6 with offset (11,37), rectangle relative to center (-7,+16,14,6). Both pure geometry and actual physics consume the same rectangles.
- Main routes have at least 48px floor width. Door clear opening is 44px, with 14px actor body accounted for. Controls need reachable clear standing space; target radius normally 22px. Local interaction predicates must constrain room and intended approach side, in addition to nearest range. Revalidate on E.
- Every full standing prop silhouette footprint is solid from north/south/east/west. Do not use only the bottom few pixels of a call pedestal or standing latch. Floor pressure marks, root cables and ink are walkable. Pipe mouths in a wall use that wall's solid shape; pipes are not human passages.
- Draw stone floor from `ground_stone`, explicit masonry walls, existing pillars and Level 05 modules. Do not reuse the opaque scenic base as playable geometry: its baked intake, tanks and stairs contradict these rooms. Do not regenerate/edit PNGs or character frames. Keep native aspect ratio and nearest filtering.
- Ground route, plates, ink and cables stay below feet (depth 0..7). Standing objects use 10+groundY/10. Door floor/base stays below Nhinh; header and side-post crops occlude only their actual visible strips. Never raise all actor sprites to hide layering errors. Label panels use measured prompt placement and protect current critical props and Lumo.

Coordinates below use player centers for stands/spawns and ground anchors (bottom-center) for standing art. Native call=40×48, door=64×88, latch=28×32, pressure=44×28. A door centered x with base y has bounds [x-32,y-88,64,88], 10px permanent post strips, a 44px inner opening, and a conditional lower 30px threshold. Render and collide those exact strips; the header must not occlude the whole opening. The header is visual overhead masonry; only side posts and the powered threshold collide, so a reverse-side spawn or open practice gate can be walked through.

## Room 1 — entry / Buồng Dẫn Nước

Spawn (180,280). Main lower hall is foot y=210..310. A partition at y=180..210 separates two visible upper alcoves. Two 64px gaps are occupied by the practice door (center x=156, base y=210) and door A (x=480, base y=210). Wall spans are x=24..124,188..448,512..616. A central top partition x=300..320,y=80..180 divides the alcoves. Outer wall bounds close the room; no route around the two doorframes.

| Element | Art / floor position | Reachable stand / behavior |
| --- | --- | --- |
| Practice call | (76,254), full 40×48 prop | (76,268). E send, then E recall. Entire thin-pipe route and plate can be seen from the hall. Main progress untouched. |
| Practice plate | (212,114), floor | Only Lumo powers it. Practice gate opens on actual arrival. |
| Inside practice call | (244,130), full 40×48 prop | (244,150). Moved 16px down so its native 48px art begins below the y=70 HUD and its standing body remains above the y=180 partition. |
| Call A | (384,232), full 40×48 prop | (384,256). Practice teaches states; A remains the first main assignment. |
| Plate A | (546,114), floor behind door A | Visible cable/tube connects A call and plate. E doorway transfers to relay only when door is live or latched. |
| Door A approach | open arch around (480,187), locked feedback below arch | E clearly says enter next room; locked feedback identifies Lumo/plate. |

Main A call need not be hard-gated by practice completion: the practice area is a safe lesson, not an extra mandatory puzzle. Show practice guidance first, preserve freedom to experiment. Lumo stays assigned until another call/recall, including during dialogue.

## Room 2 — relay / Buồng Chuyển Dòng

Door A's reverse face is the southwest entrance (x=110,base y=318), arrival center (110,251), north of its threshold. The lower hall is broad and leads east to call B and north to door B (x=480,base y=210). The north partition y=180..210 has spans x=24..448 and512..616. Plate B is (546,114). All other edges are closed, including the south wall except the A opening.

| Element | Art anchor | Stand / behavior |
| --- | --- | --- |
| Far-side call A | (56,228) | (56,252), usable before A is latched; recalls/reassigns A and recovers entry door. |
| Latch A | (180,240) | (180,264), reachable only after entering this room. E permanently holds A; exact scenario exchange follows. |
| Call B | (360,232) | (360,256), send/recall B. Ask to latch A before moving Lumo to B, preventing accidental stranding. |
| Door B | x=480,base210 | Same open/locked approach logic as A; E transfers to ink room. |

Do not put latch A on the entry side in Room 1. Room changes alone never set latch flags. Show the brass held overlay on both faces after a latch commits. Both sides retain an accessible call/recovery control until latched.

## Room 3 — ink / Hành Lang Mực

Door B's reverse face is southwest (x=82,base318); arrival center (82,251). West foyer is x=24..184. East foyer is x=532..616. A real horizontal corridor connects them at foot y=218..266, width48. Visible solid masonry blocks occupy [184,80,348,138] above and [184,266,348,44] below; the floor through the middle stays safe regardless of lighting. Render ink at native scale in overlapping/trimmed segments along that actual corridor, not as a route over an obstacle.

| Element | Art anchor / target | Stand / behavior |
| --- | --- | --- |
| Far-side call B | (68,176) | (68,198), restores the B assignment before latching. Shifted west into a clear part of the west foyer to separate its art and interaction radius from call C. |
| Latch B | (148,240) | (148,264), holds B before Lumo moves to C. |
| Call C | (122,190) | (122,210), sends Lumo through the clearly drawn pipe to east foyer. |
| Plate/beacon C | (558,244), floor | Lumo's actual arrival is shown; only the dedicated seal is powered. |
| Final door / stairs C | x=574,base180 | Exit stand (574,188), distinct from latch/memory. Side wall segments x=532..542,606..616,y=150..180 close the flanks. Stairs/floor never cover Nhinh. |
| Latch C / recall handle | (540,192), full 28×32 | (550,218), reachable from corridor on this side. Shifted the art 10px west so it ends at x=554 and leaves a 42px route to the right gatepost at x=596. First E latches C after B, ink discovery and C arrival; afterward this same reachable handle recalls Lumo. Do not add a pedestal that narrows the east foyer. |
| Spiral engraving | right boundary wall at (612,282), 40×40 uniformly reduced if needed | Repeat stand (588,262). Wall already supplies collision; no phantom block for a shallow engraving. |

At corridor entrance, first lamp-on observation uses the scenario exchange about disappearing lines. With lamp off, physically entering the corridor records `l4-ink-revealed`; it is not set merely from a remote E. Turning the lamp back on dims ink only. Arrival at C and the far latch's physical approach are still required; lamp need not remain off after ink was actually discovered.

Latch C triggers the full seven-line spiral conversation once, then records `l4-memo` at completion. The separate wall inscription allows repeat reading. Recalling Lumo starts visible travel back to Nhinh; `l4-reunited` requires actual proximity after recall. Exit requires latch C and actual reunion; an unplayed memory scene is completed before leaving. Preserve all three ending lines from the scenario.

## Lumo, doors and saves

- Controller owns all Level 05 Lumo updates; skip legacy CampaignScene Level05 `called/at` update logic and generic beams/props/controls. Pass existing Lumo actor through the focused controller interface; do not change Lumo behavior in other levels.
- Use explicit assignment follow/practice/a/b/c and authored pipe waypoints with room IDs. Move the real sprite along these points, compensating for Lumo.update's (+18,-12) hover target. Room-hop only at matching authored pipe endpoints; hide the sprite when its simulated room differs from the player's room. Draw native tube modules and stateful cable art along the same routes. Movement continues remotely, allowing real arrival without teleporting at command time. No elapsed-time power flags.
- A live plate requires matching assignment, matching simulated plate room and actual sprite proximity. Called/at history is never sufficient. Recall loses unlatched power immediately. When the foot body overlaps an open threshold, defer closure until it leaves; if power returns meanwhile clear pending closure. Occupancy protects only that threshold, not a permanent latch.
- Store Level05 room/assignment/route progress under `l4-*` flags/counters, not the Observatory-only `roomId`. Preserve existing `l4-latch-a/b/c`, `l4-ink-revealed`, `l4-memo`, `l4-return-called`, `l4-reunited`, called/at compatibility and v1 save key. New state can be local to this controller. Clear generic route coordinates when finally leaving Level05 so Level06 does not inherit this assignment.
- Normalize durable latch hierarchy C→B→A and B→A without erasing achievements. Legacy saves without local room metadata choose ink for B/C, relay for A, otherwise entry. Reconstruct an old assignment from latest relevant called mark if not reunited; sanitize coordinates and re-evaluate actual arrival. Unknown room/assignment data falls back safely.
- Restore room/state/Lumo first, derive gates, then choose reachable player checkpoint using the same body/solids. Reject saved positions in masonry, full props, posts, a now-closed threshold, or a room beyond an unsolved door. A saved legitimately traversed room with an unlatched entrance remains recoverable using its far-side control; do not remove that progress. Named room-entry/call/latch/corridor-end checkpoints never bypass unsolved gates. Save room changes and route changes atomically with coordinates.

## Feedback, story and completion evidence

All complete scenario dialogue must be present at its appropriate beat, including opening, practice arrival, latch-A role exchange, ink observation, beckoning at corridor end, seven-line memory, hints and three-line ending. H advances through the scenario's three helpful levels without recalling Lumo. J retains learned calling/ink/memory facts and current assignment. HUD gives current room, next physical action and travelling/arrived/held status; it cannot claim arrival from a command. Prompt placement must protect active call/latch/door art and actors.

Required checks: production build; focused geometry/state checks for four-direction solids, reachable intended-side stands, graph reachability of every stage, thresholds losing power while occupied, actual arrival/recall, legacy/current safe restore and correct next-level index. Inspect runtime visuals on a separate localhost origin if browser tooling is available. Never touch the player's existing save. Human end-to-end puzzle acceptance remains the user's review.
