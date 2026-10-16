# Complete Campaign — Design Decisions

**Status:** Approved by user direction in conversation on 2026-10-16: complete all ten levels autonomously; record decisions for later review.

## Goal

Make all ten authored campaign scenarios into a coherent, finishable game campaign. The scenario files in `docs/scenario/` are the narrative and puzzle authority. Preserve Nhinh as the protagonist and keep dialogue in Vietnamese, with English code-facing labels and documentation file names.

## Decisions

1. Keep the existing Phaser `CampaignScene` and its 640×360 room scale. Add room transitions only where the scenario requires distinct spaces (Level 09 already uses three rooms); give other levels authored traversal geometry within their current scene instead of introducing a campaign-wide scene rewrite.
2. Reuse existing art and Phaser primitives for missing set dressing, beams, gates, shadows, and state feedback. Do not block completion on a new asset pack.
3. Treat puzzle conditions as live world state where the story says light, shadow, a latch, or Lumo must be held. A past visit to a location cannot substitute for a currently held condition.
4. Persist committed progress and authored checkpoint states. On reload, restore puzzle state and place Nhinh at a safe reachable point; derive temporary beams, shadows, barriers, and bridges from saved state.
5. Keep story beats and repeat interaction feedback in Vietnamese. Use scenario text as the source; retain current short hints only where they reveal no solution prematurely.
6. Preserve the established Level 09 room architecture and ending. Fix opaque prerequisite feedback and completion gates while retaining its accepted three-room route.
7. Scope is all ten existing levels, not additional levels, new character art, a new save format, or a campaign rewrite.
8. Review corrections: Level 04 and Level 07 crossings must use real colliders, and crossing flags must be written only after Nhinh traverses the full bridge span to the far bank. Level 04 crossing detection follows the player's foot hitbox; the bridge B crossing side is saved with exact player coordinates when Nhinh first enters an already-passable span. If its puzzle state becomes invalid during that crossing, a pending-gate state keeps the span open until Nhinh reaches either bank, including after reload; overlap with a still-closed gate cannot create that state. Level 07's return latch opens a separate physical stone crossing that remains usable when the retractable root bridge closes; the full canal is rendered to match its collision bounds, approach side is inferred from the previous foot position and checkpointed atomically at first overlap, and a mid-crossing reload preserves that side. A retracting bridge stays visible and passable until Nhinh reaches a bank. Pending removal starts only after Nhinh entered a passable span; touching a closed gate cannot make it passable. Crossing-side detection uses the previous frame’s passable state if the puzzle changes during that update. Level 10 restores its placed lantern from an explicit placement flag. Observatory routes beyond Door A require Lumo to be physically holding the seal; the entrance call point sends him there on a fresh save.

## Per-level acceptance

1. **Forgotten Forest Edge:** acquire lantern; inspect tablet; learn Pulse; find footprints; illuminate the correct ground mark; open and latch gate; retain progress after reload.
2. **Whispering Woods:** discover poem and three runes through readable clues; practice Pulse safely; solve Moon→Leaf→Star; see remembered scene; retain sequence and gate after reload.
3. **Library Beneath the Roots:** inspect both light and dark layers for each mural; place four distinct stones in sockets with visible state; reveal the fifth mural and Memory Crystal only after the correct sequence; recover cleanly after reload.
4. **Shattered Moonlit Creek:** show a traversable creek route; solve and latch first beam bridge, then reroute to second receiver; cross both; preserve latch state and readable feedback.
5. **A Path for Two:** require Lumo to physically arrive at each seal; visibly open the corresponding route; make ink passage require the lantern state described in the scenario; latch the far side, recall Lumo, and require arrival beside Nhinh before exit.
6. **The Sleepless Tower:** solve the documented concurrent beam receivers with Lumo holding the upper seal; commit the water-return mechanism; show the record/story beat; retrieve the Hope Crystal; reload without losing committed progress.
7. **The Sleeping Garden:** distinguish fixed light from movable lantern light; open/latch sun route and shadow-root bridge; cross safely; operate water and return latch; show restored seedlings and Lumo dialogue.
8. **Ruins of Two Halves:** make both outer receivers and the inner shadow condition visibly simultaneous; confirmation latches the route and reveals the inscription/seedling response; include the Shadow and spiral clue beats; persist completion.
9. **Dark Moon Observatory:** retain Entrance→Corridor→Observatory; restore the Sun Door, held Lumo seal, shadow bridge, safe return loop, lantern retrieval, final record, and Balance Crystal. Every disabled gate must explain its unmet prerequisite; Lumo’s return must commit reliably across save/reload.
10. **The Heart of Elaria:** show three crystal placements and three live beam/shadow branches; require Lumo to remain at the seal while the roots lock; support the specified overload and already-off ending paths; restore the safe checkpoint and save ending completion.

## Campaign acceptance

- New game can complete all ten levels in order and reach the ending.
- No level can be advanced by a stale location flag when its scenario requires a live condition.
- Room/door/puzzle affordances communicate current state; interactions provide actionable feedback.
- Save/reload preserves committed story progress and never places Nhinh inside a closed barrier or unusable checkpoint.
- `npm run build` succeeds.
- Browser playthrough records PASS/FAIL/NOT_RUN for each level and the final ending, on the final reviewed revision. Restore the user's original save after fixtures.

## Known implementation risks

- `CampaignScene.ts` owns most level logic and can accumulate coupling; keep changes localized and use existing helpers before adding abstractions.
- Current art lacks several scenario props; programmatic scene graphics are accepted as temporary presentation.
- Playtesting ten levels takes time; record exact entry, actions, reload points, and exit evidence in the plan ledger.
