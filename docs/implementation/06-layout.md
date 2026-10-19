# Level 06 — The Sleepless Tower: spatial design

Source: `docs/scenario/06-the-sleepless-tower.md`. Art contract: `assets/levels/06-the-sleepless-tower/README.md`, `asset-map.json`, `assets/levels/shared/beam-splitter/metadata.json`. Scope: Level 06 only (campaign index 5). Implementation base: `test-develop` (`33fa1c3`). Vietnamese story and UI, English filenames; existing character frames and PNG exports remain authoritative and are used with preserved aspect ratio.

The user delegated routine design decisions, asked for a spatial plan (flow, placement, occlusion, collision, guidance) and then implementation in an isolated worktree. This document records those decisions without another approval round.

## Experience and choice

Use one 640×360 tower-top room inside the existing CampaignScene, owned by a focused `SleeplessTowerLevel` controller. The scenario describes a single circular chamber (ring machine, central conduit, three regulators, chamber door lever, window with scarf, safe test bench). Room switching is not needed; the base image `tower-scene-base.png` already stages an empty circular tower crown with a stairwell at the lower left. The controller draws the whole machine on top of that backdrop, as the offline previews do.

Flow: entry at the stairwell → opening → safe practice at the bench (place lamp, rotate input mirror, prism splits into two eyes) → place the main lamp → route G0 (direct-to-A / direct-to-B / into prism) → aim G1 at A and G2 at B through the splitter → call Lumo to seal C → hold all three live conditions → E on the Return-Flow lever → machine latches the new mode → retrieve lamp → open chamber, take Hope Crystal → listen to the record under the window → recall Lumo → E at the stairs to the garden. Nothing resets, falls or times out. A lost condition before the lever only makes the machine wait again.

Practice, migration state and the main machine stay separate: the bench is not wired to the chamber (scenario §3).

## Shared geometry contract

- Foot bounds for the full body: x=24..616, y=88..310 (`RECT(24,88,592,222)`). Feet = center+(0,19); Arcade body 14×6 rectangle relative to center (−7,+16). `bodyRect`, `walkable`, `canApproach` and the runtime colliders consume the same rectangles (Level 04 pattern).
- Main floor is fully walkable; no water, no pits. Full standing prop footprints are solid from north/south/east/west: main lamp pedestal, G0 dial, prism base, G1/G2 mirror bases, receiver bases, call pedestal, lever base, chamber full body, bench source/mirror/prism bases and both bench eye heads. Wall visuals (rings board, status strip, tower lamp, window, record compartment, tubes, chevrons, plate C) are non-solid; plate C, tubes and chevrons stay below feet (depth 0..7).
- Depth: backdrop 0; floor decor (plates, tubes, chevrons, fountain) ≤7; beams graphics 7; standing props 10+groundY/10; labels 15+h/10; actors and HUD keep existing scene depths. HUD text occupies y=0..70 and y=320..360 only; nothing playable is authored inside those bands.
- Interaction radius 24 from the authored stand point, plus nearest-wins. Standing props with a footprint answer E from their south face only (RULE_GAMES §1): `towerCanApproachFront` requires the foot body to sit at or below the footprint's bottom edge, so range alone can no longer open a prop from north, east or west. The record panel and the stairs are wall/door controls and keep the plain range rule (RULE_GAMES §3). Every control has a reachable stand whose body clears every solid; the pure check samples a route to each stand.
- No PNG regeneration, no character frame changes, no new package. Shared mirrors/receivers/sources reuse the registered level 03/04 keys; prism states come from `shared/beam-splitter/`; C vocabulary (call mark, tubes, pressure mark) reuses the level 05 keys.

## Zone A — practice bench (top left, safe)

| Element | Art anchor (bottom-center) | Solid (collision) | Stand / behavior |
| --- | --- | --- | --- |
| Bench source | (95,180), shared `source-empty/lit` 32×44 | (84,170,22,10) | (95,200). E places/retrieves the lantern; only this bench teaches split optics. |
| Bench input mirror | (140,180), shared `mirror-1-*` 32×40, optical (140,155) | (129,170,22,10) | (140,202). E rotates; pose 1 sends the beam north into the bench prism. Other poses leave both eyes dark. |
| Bench prism | center (140,116), shared `prism-dark/receiving` 48×48, ports in (140,122) left (123,122) right (157,122) | (129,128,22,8) | No interaction. Receiving art while its input beam is live. |
| Bench eyes | eyeA (123,110), eyeB (157,110), shared `receiver-off/on` 24×24, optics (123,98)/(157,98) | (115,102,16,8), (149,102,16,8) | Both light together only when the input mirror feeds the prism (scenario: one beam becomes two; input moved away, both dark). |

First lantern placement fires the §3 exchange. Reaching both-eye state once counts as practice done (counter `l5-practice`). The bench teaches the splitter and the input gating; the scenario's two branch mirrors are carried by the main machine's G1/G2, which gate A and B independently. A misaligned input mirror leaves both eyes dark; its dead stub was corrected from (118,155) to (140,175) so the dim beam exits along the angle the shown backslash actually bends (south, into the pedestal).

## Zone B — main machine (ring centre-left)

| Element | Art anchor | Solid | Stand / optical |
| --- | --- | --- | --- |
| Main lamp pedestal | (140,242), shared `source-*` 32×44 | (129,232,22,10) | (140,262); optical (140,215). |
| G0 common dial | (212,242), `tower_G0_to_*` 40×48 | (201,232,22,10) | (212,262); optical (212,215). E cycles pose: 0 splitter (rod right), 1 to-A (rod up-right), 2 to-B (rod down-right) — art states match the pointer direction. |
| Prism | center (292,209), shared prism 48×48 | (281,221,22,8) | No interaction. Ports: input (292,215), left (275,215), right (309,215). |
| G1 branch mirror A | (275,187), shared mirror-1 32×40 | (264,177,22,10) | (275,218); optical (275,162). Receives the left branch from the south; pose 2 (`slash`) reflects east to A; pose 1 backslash and pose 0 horizontal go dark. |
| G2 branch mirror B | (309,280), shared mirror-1 32×40 | (298,270,22,10) | (309,272); optical (309,255). Lifted 20px (repair T07) so 30px of standing space exists in front of it; before, the stand sat above the base's front edge and E also answered from north, east and west. Receives the right branch from the north; pose 1 (`backslash`) reflects east to B; pose 2 and 0 go dark. |
| Receiver A (stone eye) | (460,174), shared `receiver-*` 24×24 | (452,166,16,8) | optical (460,162); no interaction. |
| Receiver B (stone eye) | (460,267), shared `receiver-*` 24×24 | (452,259,16,8) | optical (460,255), lifted with G2 so branch B keeps one beam row; no interaction. |

Authored beam paths (engine graphics, never baked):
- feed: (140,215)→(212,215); splitter feed: (212,215)→(292,215) into the prism input.
- left branch: (275,215)→(275,162)→ G1; on pose 2 east to (460,162); dead stubs stay dim.
- right branch: (309,215)→(309,255)→ G2; on pose 1 east to (460,255); dead stubs stay dim.
- direct A (G0 pose 1): (212,215)→(247,180)→(292,180)→(292,162)→(460,162). The jog passes above the prism and clears G1's art and the status strip.
- direct B (G0 pose 2): (212,215)→(240,243)→(440,243)→(440,255)→(460,255).

Live conditions are recomputed every frame, never remembered, and go dormant after the Return Flow: `liveA = (source main && on && !waterReturned) && (g0==1 || (g0==0 && g1==2))`; `liveB = (source main && on && !waterReturned) && (g0==2 || (g0==0 && g2==1))`; `liveC = Lumo assignment at-C && Lumo within 8px of plate C`. Direct configurations light exactly one eye (scenario §4). After the switch the whole optics renders dormant — the authored routes stay drawn in the dim style without end marks, prisms return to dark and both receiver heads go off, matching the `after-return-flow` study; retrieving the lantern clears the beams entirely.

## Zone C — indicators, Lumo seal and lever (right side)

| Element | Art | Position | Behavior |
| --- | --- | --- | --- |
| Rings A/B/C | `tower_ring_*_off/on` 40×40 | centers (368,100), (410,100), (452,100) | Wall indicators; on iff the corresponding circuit is live; all off after Return Flow. |
| Status strip | `waiting-for-live-circuits` / `all-currently-powered` 104×28 | center (410,130) | Waiting while a circuit is missing; powered while all three live; hidden after the switch. |
| Tower lamp | `tower-lamp-white/dim` 72×72 | center (307,84), depth 20-22 behind the fountain | White while pumping; dim once water is returned. |
| Fountain column | `tower_fountain_up/down` 56×112 | center (307,100), depth 20 (behind the lamp) | Up flow while pumping; down after the switch. |
| Intake / outflow chevrons | `tower_tower_intake` / `tower_tower_outflow` 112×32 | (66,200) and (150,302), depth 6 | Intake (up) while pumping; outflow (down, toward the stairs/forest) after. |
| Call mark | `call-idle/sent/arrived` (level 05 reuse) 40×48 | (350,252) | (350,272). E sends Lumo to seal C; E again recalls. |
| Seal C + tube | `pressure-empty/occupied` 44×28 + tube straights/mouth (level 05 reuse) | plate (350,290); tube chute drawn under the pedestal, depth 6, rotated at 38×19 (uniform 0.594 scale keeps the sprite aspect) | Lumo's live third circuit. Instead of recalling mid-puzzle, the player may rotate G0 to keep A/B lit while Lumo holds C. |
| Return-Flow lever | `tower_return_flow_waiting/held` 40×48 | (540,232) | (540,254), at the chamber door. E switches only while all three circuits are live; otherwise the machine waits and Nhinh explains what is missing. After the switch it is held (persistent) and E only reports the mode. |
| Chamber | body `chamber-open` + `chamber-grille-overlay` while closed + `hope` crystal inside | ground (600,284), full body solid (560,180,80,104), crystal center (600,232) | Crystal visible behind the grille (README composition). Opens on Return Flow. E at (600,288) collects Hope once open. |
| Window + record | `window-faded-red-scarf` 112×112 center (582,92); `record-compartment-closed/open` 88×32 center (582,156) | wall visuals | Record stand (549,192) (repair T07; was (530,182)): body x542..556,y208..214 clears the chamber body (x>=560) and the lever base (y>=222), and the prompt sits in front of the panel art (y140..172). Locked before the crystal; after collection plays the §5 exchange and repeat line. |

## Entry, exit, saves and migration

- Spawn (135,272) at the stairwell foot; stand (100,272) is the exit control ("E · Xuống khu vườn"), gated on: Return Flow switched, lamp retrieved, Hope collected, record heard, Lumo recalled and actually back (`l5-reunited`). Missing pieces are named in the refusal line.
- Lumo restore: saved `lumo-x/y` counters from the Level 05 exit (generic CampaignScene handoff, unchanged). In-level assignment is `follow` (default, hovers beside Nhinh), `to-c` while travelling the authored waypoints [(400,246),(382,262),(366,276),(350,290)], `at-c` on arrival. Recall sets `follow` and, once the mode is switched, real proximity sets `l5-reunited`.
- Save namespace stays compatible: reuse `l5-lantern-placed`, `l5-lantern-retrieved`, `l5-power`, `l5-water-returned`, `l5-crystal`, `l5-record-read`, `l5-reunited`; add `l5-layout-v2`, `l5-practice-ok`, `l5-lumo-assign`, counters `tower-g0/g1/g2` (new pose space, migrated once under `l5-layout-v2`), `l5-practice`, `l5-lamp-source`. Migration maps legacy tower counters (g0==2 → splitter, g1==1 → aim A, g2==3 → aim B), `l5-power` → Return Flow held, and never rewrites the user's durable achievements. A restored save is validated against the same body/solid model; an invalid center falls back to the spawn.
- Stairs E and lever E re-validate their live conditions at interaction time (no latch from history).

## Guidance, story and checks

- Exact scenario dialogue at every beat: §2 opening five lines, §3 bench arrival three lines, §4 one-circuit exchange, call-C exchange, three-circuit exchange, switch lines + narration, §5 record exchange and repeat line, §7 ending two lines. H cycles the scenario's three levels (observation, relation, next action) for the practice, place, main, call and switch steps and gives post-switch guidance; the bench is optional learning and the objective says so; the reunion (recall → Lumo close again) is named in the HUD, H and the stairs refusal, and the refusal changes while Lumo is already flying back; J keeps learned facts (board note, split lesson, simultaneous conditions, guardian record).
- HUD: title `06  Ngọn Tháp Không Ngủ · Hy vọng`, goal line per stage, status line `A/B/C` live glyphs + nước state + lamp source, controls line at y=320. HUD must never claim a live condition from history.
- Required checks: production build; pure checks for four-direction solids, every stand reachable along a sampled route, both direct and split routes lighting the correct receivers only, condition loss reverting to waiting, C live only on actual Lumo presence, switch gating, spawn/restore fallbacks, migration idempotence and next-level index 6. Runtime/browser inspection and the human playthrough stay NOT_RUN until root reviews.

Decisions recorded: the coming-soon gate is removed for index >= 4 (mirrors `codex/level-05-flow-redo`); with Level 05 still unmerged in this branch, legacy index 4 remains the in-branch path to Level 06 so the new level is reachable and reviewable end to end. The new controller replaces the legacy index-5 routines; legacy code is bypassed, not deleted.

## Repair T07 — what changed and what stays open

- G2 cluster lifted by 20px together with receiver B and every beam leg that touched row 275 (now 255); the optical relation prism-right → G2 → receiver B is unchanged and pinned by `check-sleepless-tower.mjs`.
- Four-side raw foot-body probes for G2 (north, east, west rejected; south accepted) and the 24px front-space contract are asserted in the check; every other footprinted prop gets the same south-face rule through the shared helper.
- Machine stages that the scenario gives as stage directions are short captions, not dialogue: the Return-Flow mode change (with a brief camera shake), the record opening and the record fading out. The scarf and the flowers stay as art; the final window beat is not captioned.
- The `Hệ thống` speaker line for the switch narration was removed.
- Gaps of 18/23px between decorative bases (for example between the call base and neighbouring art) are decoration only and are not required routes; required routes keep >= 36px thresholds and >= 48px corridors.
- Not changed: the tower lamp/fountain wall art sits behind the HUD title band (depth 8 vs HUD 86); their alpha was not measured here. NOT_RUN: browser/visual check of the lifted G2 cluster and the stairs landing at the lower-left spiral staircase of `tower-scene-base.png`.
