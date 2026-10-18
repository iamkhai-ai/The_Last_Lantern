# Level 05 — Flow, collision & guidance rebuild

Worktree: `codex/level-05-flow-redo` (base `codex/level-05-spatial-rebuild` @ c5faa51).
Scenario source: `docs/scenario/05-a-path-for-two.md`. Existing geometry spec: `docs/implementation/05-layout.md`.
Controller: `src/levels/PathForTwoLevel.ts`. Pure layout/state: `src/data/pathForTwoLayout.ts`. Checks: `scripts/check-path-for-two.mjs`.

## Player flow (shipped)

1. Entry — Buồng Dẫn Nước: press E at the near call (76,254) to send Lumo to the lesson plate (212,114); the low practice door opens on real arrival. Walk into the alcove, press E at the inside call (244,140) to recall Lumo; the door stays open while Nhinh is inside the alcove and closes once she is back in the hall. The whole stretch is **optional** (D1): A can be called at once, nothing writes `l4-practice-complete` except a real recall here, and the entry objective stops naming the practice marker as soon as A has been started.
2. Entry — press E at call A (384,232); Lumo travels through the drawn tube to plate A (546,114); door A opens. Cross door A (480,210) into relay, arriving at its reverse mouth (110,251).
3. Relay — press E at latch A (180,264) to hold door A permanently. Press E at call B (360,232); Lumo reaches plate B (546,114); door B opens. Cross door B into ink, arriving at (82,251).
4. Ink — press E at latch B (158,264). Turn the lantern off with F, walk the corridor to record the ink trail; press E at call C (122,210); Lumo crosses the drawn tube to plate C (558,244). The exit handle at (550,218) answers before that and refuses with the step that is still missing instead of disappearing; once ready it holds the exit and plays the seven-line memory scene at latch C, and the wall engraving replays that memory afterwards (D2).
5. Press E at the C handle again to recall Lumo; wait for real proximity; press E at the exit (574,188) for the three-line ending and Level 06.

Backtracking: door A and door B stay open once latched. Returning through A lands beside its entry face **(480,250)**; returning through B lands beside its relay face **(480,250)**. That arrival is 29px from the door stand (480,221) r24 — outside its trigger — and is walkable floor connected to the hall in both rooms, so a held E cannot send the player straight back. Closed doors block their doorway; open doors let the 14x6 foot body pass. A room change also arms a held-E guard (cleared when E comes back up) and clears the interaction registry, which drops the active target.

## Collision contract

- Pure geometry and Arcade physics consume the same rectangles: feet = center+(0,19), body 14x6 at (-7,+16).
- Walls, full standing props (call 40x48, latch 28x32), door posts, and the reverse-portal caps are static solids. Plates, ink and cables are walkable floor art.
- Door headers are visual only. Only the two side posts and the powered threshold collide; `pathDoorShouldClose(powered, occupied, latched)` keeps a threshold open under live power, a latch, or an occupant.
- `isPathThresholdOccupied` centralizes occupancy: the threshold strip plus the entry lesson alcove (`isInsidePracticeAlcove`) so the lesson door never closes on Nhinh.
- Reverse pockets at relay A (110,318) and ink B (82,318) stay walkable only through their 44px opening and are capped below y=318.

## Layering contract

- Depth 0 stone floor; 1 masonry walls; 2 station schematic; 4/4.5 native tube mouths and tube modules; 4 ink trail; 5 plates and spiral scratch; 6 root cables. Standing call/latch props use `10 + groundY/10` so they y-sort against the player (player uses `10 + (y+19)/10`); door posts sit at `depthAt(base)+0.1`; door headers 70; Lumo 55; HUD 86. Nothing raises all sprites to hide layering errors.
- The ink mark is one native 348×48 tile at (358,242); root cables are ≤160px stamps along the authored waypoints with elbows at the real corners; the C tube mouth is at (536,214), outside door C's passage.

## Guidance

- Objective line states the next physical action per room; the entry line names the practice marker only until A has been started, and the pre-reunion line names the C handle plus Lumo's travelling/arrived state. The old "the lesson door is closed" recovery branch is gone: it was unreachable, because the whole lesson alcove counts as threshold occupancy, so that door never closes under the player.
- H hints are action-first ("Nhấn E ở mốc…") across the three scenario levels; J journal records calling, ink and memory facts.
- Controls bar lists WASD / E / F / H / J. Prompts protect active call, latch, door and companion art.

## Verification

- `node scripts/check-path-for-two.mjs` — 20 counted cases: geometry/state invariants, threshold occupancy, backtrack arrivals, door passage in both directions, reachability, the optional-lesson gate, the C-handle inspection feedback, the reunion objective, the objective following main progress, four-side prompt/solid contacts, ink/cable/mouth art anchors, the controller's route legs running along the authored lines, the spiral stand, the schematic, the write-only flag retirement and the save restore cases. The script exits non-zero and names every failing case on its summary line.
- `node scripts/check-interaction-targets.mjs` — the shipped selector's L05 domains and the latch C / door C lens measurement ((559,198) → latch C, (567,208) → door C; 92 and 100 reachable positions).
- `node node_modules/typescript/bin/tsc --noEmit` — typecheck; `npm run build` — production single-file build.
- Runtime playthrough in a browser: **NOT_RUN**. No browser is available in this environment, so nothing was executed, no artifact exists, and no headless probe is offered as a substitute for a playthrough. The earlier claim of a confirmed Playwright/Chromium run with screenshots on the previous revision of this line was **not** evidence: it contradicts `level-05-report.md` (every round records browser review and human playthrough as `NOT_RUN`) and `integration-log.md` ("Browser playthrough | NOT_RUN | No browser automation available in this environment."). It is corrected here rather than kept as a run that cannot be evidenced. The headless equivalent that does exist is the contract above (four-side prompt/solid contacts, closed/open/occupied door cases, every reachable stand, the save cases across each room, mid-travel and mid-threshold), and the human end-to-end acceptance remains the user's review.
