# Level 08 — Ruins of Two Halves: repair report

Scope: repair task T09 of `docs/superpowers/plans/2026-10-18-levels-05-10-repair.md`. Source revision of the repair: `c57ed44` (checked again at the frozen revision `84367c1659958fe3c97862c091d715d846dcbf33`).

## What changed

- The Shadow is a real character with state and path, not a static procedural prop: guard spot beside the seedling bed (`shielding`), relaxed (`turn`) after the latch, walks to the north stair after the conversation and waits there (`waiting`). Registered 48x64 poses at native size; sprite depth follows the feet. Source of truth: `RUINS_SHADOW` in `src/data/ruinsOfTwoHalvesLayout.ts`.
- The Shadow's footprint is solid only while he stands on a spot. The pure check proves every stand and the north door stay reachable while he guards and while he waits, and that his walk never crosses a standing prop.
- North-door refusals name the next missing step and its control (`ruinsNextStep`), never the whole solution.
- The dead legacy lamp restore for index 7 in `CampaignScene` was removed.

## Evidence

- `node scripts/check-ruins-of-two-halves.mjs` PASS (geometry/state sections 1–14 and the new Shadow section 15: phases, poses, spots, walk segments, door clearance, next-step guidance).
- Seen once in a browser pane with the Canvas renderer on `localhost` (fresh save, then flags set from the console): the Shadow stands beside the seedling bed in the shielding pose, turns after the latch, and walks along y=142 at about 70 px/s toward the north stair.

## Limits (NOT_RUN or approximate)

- No WebGL run; no human playthrough. The practice-slab shadow mask is still compared only by bounding boxes, not by pixels.
- `l7-shadow-talked` is still written (older notes read it as a repeat marker); it was not removed.
- The Shadow's pause when the player falls behind is checked by the pure walk geometry and by one visual run; it has no automated frame test.
