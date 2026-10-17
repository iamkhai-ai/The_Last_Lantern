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
