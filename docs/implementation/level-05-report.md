# Level 05 implementation report

Implementation commit: `73a187c433faf99a46a4918bea78fd95e06a7fce`
Branch: `codex/level-05-spatial-rebuild`
Base: `64d8e63`

## Delivered

- Added a three-room Level 05 controller and shared geometry for campaign index 4 only. Other campaign levels keep their existing scene flow.
- Implemented the opening, practice arrival, latch A role exchange, ink observation and discovery, seven-line spiral memory, repeat journal, hints, reunion, and three-line ending from the scenario.
- Lumo travels through room-local waypoints and matching paired pipe endpoints. Live power depends on assignment, simulated room, and actual arrival. Calls, plates, cables, ink, doors, and latched braces reflect their current state.
- Added room-specific door faces, safe body placement, all-direction standing prop collision, threshold occupancy deferral, and visited-room persistence under `l4-*` state. The Observatory `roomId` is untouched.
- Recorded clearance and HUD adjustments in `05-layout.md`; added a focused pure geometry and state check.

## Verification on implementation commit

| Status | Command / review | Result |
| --- | --- | --- |
| PASS | `node scripts/check-path-for-two.mjs` | Geometry, contact, intended-side reachability, door faces and thresholds, power states, paired pipe endpoints, and safe room restore checks passed. |
| PASS | `npm run build` | TypeScript and Vite production build passed; output was `dist/index.html`. |
| PASS | `git diff --cached --check` | No whitespace errors in staged implementation changes before commit. |
| NOT_RUN | Separate-origin browser review and human end-to-end playthrough | Root handles independent runtime inspection; human puzzle acceptance remains open. |

## Limitations

- The pure check validates route endpoint pairing and geometry; visual timing, dialogue presentation, and full playthrough still need runtime review.
- No save migration writes to Observatory room state. Existing durable Level 05 latch flags establish legacy reachability; unlatched room restore relies on the new visited-room flags.

## Round 1 review corrections

Source revision: `fa4e71df43837f2f14d761e4dc63f319f47d07b2` (parent `55332121963dfe1a1e3df11af40921af96832236`). This revision addresses root findings 1–8, the H/J HUD lifecycle note, R11 dialogue overlap, R12 direct mark calls, the bounded reverse portal ruling, and the R5 backtracked-room restore case.

- Door use now accepts a committed latch without requiring Lumo to remain in that room. Actual plate arrival stays separate from durable door-open state.
- Reverse A/B faces cut the south wall only within their authored 44px gap, with a cap at y=318. The same conditional pocket is used by runtime colliders and pure safe-position checks. The ink C tube and Lumo route run on upper masonry at y=200, leaving the floor ink clear at y=242. Pressure glyphs render centered on the same points used by plate arrival.
- Beckoning waits for actual C arrival and Nhinh reaching the east end. Route-arrival and beckoning dialogue queue behind active dialogue or pause state; the memory completion callback remains attached to its original seven-line exchange.
- A same-mark call recalls. An eligible different mark sends directly, so A→B and B→C each take one interaction; prior-latch guards and completed-mark feedback remain.
- Saved entry remains entry after backtracking even with later durable latches. Missing or invalid room metadata still selects the furthest reachable durable checkpoint. Invalid/stale Lumo routes and assignments fall back to a visible follower beside the safe player spawn; valid saved plate arrival is recomputed from assignment, room and position.
- Level 05 protected prompt bounds now reach `InteractionSystem`. H/J HUD text is tracked through room rebuilds and a compact movement/F line is shown. Before Level 06 starts, reunited Lumo position is copied into the generic position and target counters.
- Prop contact checks compare against the registered solids used by runtime physics and assert those solids match each rendered prop's full bottom-anchored footprint.

## Round 1 verification on source revision `fa4e71df43837f2f14d761e4dc63f319f47d07b2`

| Status | Command / review | Result |
| --- | --- | --- |
| PASS | `node scripts/check-path-for-two.mjs` | Reverse portal open/closed traversal and cap, control reachability, registered prop solids/cardinal contact, room restore, follower restore, route pairing, plate power, direct A→B/B→C calls, and threshold behavior passed. |
| PASS | `npm run build` | `tsc --noEmit` and Vite production build passed; generated `dist/index.html` was restored afterward. |
| PASS | `git diff --check` | No whitespace errors before source commit. |
| NOT_RUN | Browser review and human end-to-end playthrough | Browser/server inspection is owned by root; human playthrough remains open. |
| NOT_RUN | Independent review of this revision | Root will repeat both independent reviews on the committed revision. |

The source and verification changes are committed as `fa4e71df43837f2f14d761e4dc63f319f47d07b2`. The report update is committed separately after this entry is written.

## Remaining limits

- The geometry/state check covers the configured layout and controller decisions, but does not exercise Phaser's live input timing or inspect rendered layering. Root's independent runtime/review pass and human end-to-end acceptance remain outstanding.
- No changes were made to player saves or Observatory `roomId`; no other level's behavior was intentionally changed.
