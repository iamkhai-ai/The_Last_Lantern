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

## Round 2 review corrections

Source revision: `9f7bc90a6c3645482faa4bf287da9d0864df340a` (parent `6a466f5f26c26c666c09779d80f2ea0265ac854c`). This revision addresses R13/R14, Reviewer A's lit-observation and legacy-assignment findings, and Reviewer B's exact-pipe-endpoint finding.

- Final objective and exit gating now use Lumo's current assignment, route state, room, and proximity. The stairs explain whether C is unlatched, the spiral memory is unread, or Lumo has not actually returned. After C is latched, an unread memory objective points to the accessible spiral. First reading marks the memory complete only when its dialogue finishes; repeat readings preserve completion.
- Following Lumo now travels through authored paired pipe waypoints when Nhinh changes rooms, including while a recall route was already in progress. Lumo assigned to a plate stays there while Nhinh crosses rooms.
- The full lit-ink observation exchange is queued once when the player first sees the ink room lit, including when the lantern is switched on later. Existing dialogue/pause deferral remains in use.
- Legacy assignment reconstruction is separate from player-room selection. A known, eligible, active A/B/C assignment with no Level 05 companion-room metadata starts from a safe position beside Nhinh and follows an authored route to its mark. Returning/reunited, ineligible, or ambiguous state uses the safe follower recovery. Player room still resolves only from saved room, visited rooms, and durable latches; `called-b` does not imply the player crossed into ink.
- A/B pipe endpoint coordinates now come from one shared definition used by runtime routes and validation. Cross-room hops require both exact authored endpoints and Lumo within 8px of the outgoing endpoint. Invalid routes recover Lumo visibly beside the safe player position.
- The focused checks cover wrong endpoint coordinates, wrong outgoing Lumo position, legacy assignment reconstruction and player-room preservation, follower versus plate-holder transition policy, current reunion, locked-exit priority, and unread memory stage.

## Round 2 verification on source revision `9f7bc90a6c3645482faa4bf287da9d0864df340a`

| Status | Command / review | Result |
| --- | --- | --- |
| PASS | `node scripts/check-path-for-two.mjs` | Geometry/state and new R2 regressions passed, including endpoint coordinates/proximity, legacy player and companion state, room-follow policy, actual reunion, and exit requirements. |
| PASS | `npm run build` | `tsc --noEmit` and Vite production build passed; generated `dist/index.html` was restored afterward. |
| PASS | `git diff --check` | No whitespace errors before source commit. |
| NOT_RUN | Browser review and human end-to-end playthrough | Root owns the fixture review; human playthrough remains open. |
| NOT_RUN | Independent review of this revision | Root will run both independent reviews on the frozen revision. |

The source and regression changes are committed as `9f7bc90a6c3645482faa4bf287da9d0864df340a`. The report update is committed separately after this entry is written.

## Remaining limits

- The focused script verifies the route and state predicates but does not execute live Phaser movement or dialogue timing. Root's runtime check and independent review remain the next gates.
- No user save or Observatory `roomId` was changed, and the changes remain scoped to Level 05 controller/geometry and its focused check.

## Round 3 review corrections

Source revision: `ddf7e152b74bcf25dba1a7302053ff8742a93151` (parent `adf3ac8f82e3ca0b47fb26ea84a51b7ac2564a85`). This revision addresses Reviewer B's malformed saved-pipe route finding.

- Saved routes are now parsed atomically: unknown pipe/end labels, unpaired labels, invalid coordinates, and invalid cross-room endpoints reject the whole route. The controller then restores Lumo visibly beside Nhinh as a same-room follower, including when saved assignment metadata says follow or points to an off-room companion.
- Pure pipe-hop and endpoint proximity predicates reject unknown labels before endpoint lookup. Missing endpoint data cannot throw during route recovery.
- Focused regressions cover unknown labels, malformed endpoint coordinates, whole-route rejection, valid same-room route parsing, and invalid-route follower recovery.
- The requested R3 review-note path was not present in the workspace (`Get-Content C:/Users/Admin/AppData/Local/Temp/last-lantern-level05-root-r3.md` returned “Cannot find path”). Implementation followed the concrete findings relayed by root in the task message.

## Round 3 verification

| Status | Command / review | Result |
| --- | --- | --- |
| PASS | `node scripts/check-path-for-two.mjs` | Geometry/state checks and R3 malformed-route regressions passed. |
| PASS | `npm run build` | TypeScript and Vite production build passed; generated `dist/index.html` was restored afterward. |
| PASS | `git diff --check` | No whitespace errors before source commit. |
| NOT_RUN | Browser review and human end-to-end playthrough | Root owns runtime inspection; human playthrough remains open. |
| NOT_RUN | Independent review of this revision | Root will run independent reviews on the frozen R3 revision. |

The source and regression changes are committed as `ddf7e152b74bcf25dba1a7302053ff8742a93151`. The report update is committed separately after this entry is written.

## Remaining limits

- The focused script validates malformed saved route recovery and endpoint predicates but does not execute live Phaser movement or browser rendering. Root's runtime and review gates remain outstanding.
- No user save was modified. The R3 changes remain scoped to the Level 05 route parser/recovery and focused check.
