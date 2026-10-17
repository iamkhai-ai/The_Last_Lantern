# Level 05 — Flow, collision & guidance rebuild

Worktree: `codex/level-05-flow-redo` (base `codex/level-05-spatial-rebuild` @ c5faa51).
Scenario source: `docs/scenario/05-a-path-for-two.md`. Existing geometry spec: `docs/implementation/05-layout.md`.
Controller: `src/levels/PathForTwoLevel.ts`. Pure layout/state: `src/data/pathForTwoLayout.ts`. Checks: `scripts/check-path-for-two.mjs`.

## Player flow (shipped)

1. Entry — Buồng Dẫn Nước: press E at the near call (76,254) to send Lumo to the lesson plate (212,114); the low practice door opens on real arrival. Walk into the alcove, press E at the inside call (244,130) to recall Lumo; the door stays open while Nhinh is inside the alcove and closes once she is back in the hall.
2. Entry — press E at call A (384,232); Lumo travels through the drawn tube to plate A (546,114); door A opens. Cross door A (480,210) into relay, arriving at its reverse mouth (110,251).
3. Relay — press E at latch A (180,264) to hold door A permanently. Press E at call B (360,232); Lumo reaches plate B (546,114); door B opens. Cross door B into ink, arriving at (82,251).
4. Ink — press E at latch B (148,264). Turn the lantern off with F, walk the corridor to record the ink trail; press E at call C (122,210); Lumo crosses the drawn tube to plate C (558,244). Press E at latch C (550,218) to hold the exit and play the seven-line memory scene.
5. Press E at the C handle again to recall Lumo; wait for real proximity; press E at the exit (574,188) for the three-line ending and Level 06.

Backtracking: door A and door B stay open once latched. Returning through A lands beside its entry face (480,230); returning through B lands beside its relay face (480,230). Closed doors block their doorway; open doors let the 14x6 foot body pass.

## Collision contract

- Pure geometry and Arcade physics consume the same rectangles: feet = center+(0,19), body 14x6 at (-7,+16).
- Walls, full standing props (call 40x48, latch 28x32), door posts, and the reverse-portal caps are static solids. Plates, ink and cables are walkable floor art.
- Door headers are visual only. Only the two side posts and the powered threshold collide; `pathDoorShouldClose(powered, occupied, latched)` keeps a threshold open under live power, a latch, or an occupant.
- `isPathThresholdOccupied` centralizes occupancy: the threshold strip plus the entry lesson alcove (`isInsidePracticeAlcove`) so the lesson door never closes on Nhinh.
- Reverse pockets at relay A (110,318) and ink B (82,318) stay walkable only through their 44px opening and are capped below y=318.

## Layering contract

- Depth 0 stone floor; 1 masonry walls; 4/4.5 native tube mouths and tube modules; 5 ink trail, plates, spiral scratch and pipe route graphics; 6 root cables.
- Standing call/latch props use `10 + groundY/10` so they y-sort against the player (player uses `10 + (y+19)/10`); door posts sit at `depthAt(base)+0.1`; door headers 70; Lumo 55; HUD 86. Nothing raises all sprites to hide layering errors.

## Guidance

- Objective line states the next physical action per room and includes a dedicated recovery line when the lesson door is closed with Nhinh inside the alcove.
- H hints are action-first ("Nhấn E ở mốc…") across the three scenario levels; J journal records calling, ink and memory facts.
- Controls bar lists WASD / E / F / H / J. Prompts protect active call, latch, door and companion art.

## Verification

- `node scripts/check-path-for-two.mjs` — geometry, threshold occupancy, backtrack arrivals, door passage, reachability, state machine.
- `npx tsc --noEmit` — typecheck.
- `npx vite build` — production single-file build.
- Runtime playthrough (Playwright + Chromium, built `dist/`, seeded save `level:4`): full flow entry→exit executed through the real scene. Confirmed in captured screenshots: prompt bubbles for call/inner-call/exit/latch-c, closed door stopping the body at y=194 vs open door letting it pass to y=64, ink trail visible with lantern off and gone with lantern on, latch brace overlay, Lumo arrival beats, memory and ending dialogues, Vietnamese text rendering. Prompt and movement are intentionally locked while a dialogue is open.
