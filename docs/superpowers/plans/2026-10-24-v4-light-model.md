# V4 light model — plan

Source of truth: `docs/scenario-v4/puzzle-contracts.md` §1 "Vệt đèn, đầu nhận và dấu sáng/tối" and "Đèn khi chuyển màn" (commits e75e951, 80299c9). Branch: `feat/v4-foundation`. Goal: the shared light model, applied to the test room, before any level uses it.

## Rules for every worker

- Do not commit, push, switch branches, or touch `assets/`.
- Do not run `npm run build` or `npm run verify` (they rewrite the tracked `dist/index.html`).
- `npx tsc --noEmit` and `npm test` must pass. Also run every `node scripts/check-*.mjs` and report results.
- Pure modules (`src/v4/core/*`, `*Layout.ts`, `*Logic.ts`) import no Phaser, window or localStorage.
- Player-facing copy is Vietnamese. Match the surrounding code: JSDoc on exports, same naming and comment density.
- Use exactly the numbers, rects and names below. If a test you are told to write fails with the given geometry, do not change the geometry: report the failure with numbers.

## Design decisions (lead)

- **Ground plane.** All light math runs on the floor. The lantern's light origin is the **foot centre** (`groundPoint(actor) = rectCenter(footRectAt(actor))` = actor + (0, 19)), not the hand. A hand-height origin sits 14px north of the feet and would poke through a wall Nhinh stands against. The line of sight for "seen" uses the same ground point.
- **Beam:** trapezoid from the ground point along the facing: root width 12, far width 32, length 56. 8 facings, same strings as `Player.FacingDirection`. Diagonals are unit vectors (same length).
- **Halo:** circle radius 12 around the ground point (hand) or the pedestal point (placed).
- **Blockers:** walls and closed door/gate leaves only. A blocker hides a point when the segment from the footprint origin to the point passes through the blocker's open interior (touching an edge does not block). Both beam and halo, and pedestal spills, are clipped this way. Fixed-source areas with `origin: null` are authored and not clipped.
- **Rendering = gameplay.** The renderer draws the lit area by testing 2px cells with the same `isPointLit`, so the drawn edge and the rule cut along the same line. Ambient darkness is constant per level and never depends on F.
- **Seen:** readable now, foot centre within 64px of the mark centre, same room (if the level declares rooms), and no blocker on the segment ground point → mark centre. The host records seen lit/dark marks in J. Pulse marks still need a Pulse.

## Task L1 — `src/v4/core/light.ts` and `src/v4/core/lightAudit.ts` (pure) + tests

### light.ts

```ts
import { footRectAt } from './body';
import { rectCenter } from './geometry';
import type { Point, Rect } from './geometry';
import type { LanternState } from './lantern';

export type Facing = 'up' | 'upright' | 'right' | 'downright' | 'down' | 'downleft' | 'left' | 'upleft';
export const BEAM_LENGTH = 56;
export const BEAM_ROOT_WIDTH = 12;
export const BEAM_FAR_WIDTH = 32;
export const HALO_RADIUS = 12;
export const SEEN_RADIUS = 64;

/** Unit vector of a facing; screen y grows downward; diagonals are (±√½, ±√½). */
export function facingVector(f: Facing): Point
/** The floor point under Nhinh: the centre of her foot body. Light and line of sight start here. */
export function groundPoint(actor: Point): Point
/** The beam's four corners, in order: root-left, far-left, far-right, root-right (left/right relative to the facing). */
export function beamPolygon(origin: Point, facing: Facing): Point[]

export type Footprint =
  | { readonly kind: 'beam'; readonly origin: Point; readonly facing: Facing }
  | { readonly kind: 'halo'; readonly center: Point; readonly radius: number }
  /** A declared area (pedestal spill or fixed source). `origin` is where its light comes from (clipped by blockers); null = authored, never clipped. */
  | { readonly kind: 'area'; readonly points: readonly Point[]; readonly origin: Point | null };

/** A pedestal's declared spill (puzzle-contracts §1): a convex polygon lit while the lantern is lit on that pedestal. */
export interface SpillDecl { readonly pedestalId: string; readonly points: readonly Point[] }

/**
 * The lantern's footprints now. Off: none. In hand: beam + halo at `ground`, along `facing`.
 * On a pedestal: a halo at `pedestalAt(id)` plus that pedestal's spills, each with origin = the pedestal point.
 * A pedestal with no position gives no footprints.
 */
export function lanternFootprints(lantern: LanternState, ground: Point, facing: Facing,
  pedestalAt: (pedestalId: string) => Point | null, spills: readonly SpillDecl[] = []): Footprint[]

/** Point in a convex polygon; points on the boundary count as inside. Works for either winding. */
export function pointInConvexPolygon(p: Point, polygon: readonly Point[]): boolean
/** True when the segment a→b passes through the open interior of some blocker (Liang–Barsky, strict). */
export function segmentBlocked(a: Point, b: Point, blockers: readonly Rect[]): boolean
/** Inside some footprint's shape (halo: distance ≤ radius) and not hidden from that footprint's origin by a blocker. */
export function isPointLit(p: Point, footprints: readonly Footprint[], blockers: readonly Rect[]): boolean
/**
 * True when any sample point of the rect is lit. Samples: x = rect.x, rect.x+step, … and always rect.x+width;
 * same for y. Default step 2.
 */
export function isRectLit(rect: Rect, footprints: readonly Footprint[], blockers: readonly Rect[], step = 2): boolean

export type LightMarkKind = 'lit' | 'dark';
/** A lit mark reads only under a footprint; a dark mark only when no footprint covers it. */
export interface LightMark { readonly id: string; readonly kind: LightMarkKind; readonly rect: Rect }
export interface Room { readonly id: string; readonly rect: Rect }

export function isMarkReadable(mark: LightMark, footprints: readonly Footprint[], blockers: readonly Rect[]): boolean
/** The id of the first room (in list order) whose rect contains the point (half-open), or null. */
export function roomAt(p: Point, rooms: readonly Room[]): string | null
/**
 * Whether Nhinh, standing with her ground point at `ground`, can see the mark: distance ground → mark centre ≤ SEEN_RADIUS,
 * same room when `rooms` is non-empty (roomAt of both points equal and not null), and no blocker on the segment ground → mark centre.
 * Readability is checked separately.
 */
export function canSeeMark(ground: Point, mark: LightMark, blockers: readonly Rect[], rooms: readonly Room[] = []): boolean
/** Ids, in `marks` order, of marks that are readable, seen, and not yet in `found`. */
export function marksToRecord(ground: Point, marks: readonly LightMark[], footprints: readonly Footprint[],
  blockers: readonly Rect[], rooms: readonly Room[], found: ReadonlySet<string>): string[]
```

Beam polygon: with d = facingVector(facing) and n = (-d.y, d.x): root corners = origin ± n·(BEAM_ROOT_WIDTH/2); far corners = origin + d·BEAM_LENGTH ± n·(BEAM_FAR_WIDTH/2). Order them consistently so the polygon is convex.

`segmentBlocked`: for each rect, clip t ∈ [0,1] against both slabs. When a direction component is 0 and the coordinate is ≤ the slab min or ≥ the slab max, the segment misses that rect. Blocked when, after clipping, tEnter < tExit.

### lightAudit.ts

```ts
import type { Facing, LightMark, Room } from './light';
export const AIM_AREA = 8;
export interface AimGoal {
  /** Every rect here must be lit. */
  readonly hit: readonly Rect[];
  /** No rect here may be lit. */
  readonly avoid: readonly Rect[];
  /** When set, the position must also see this mark and the mark must be readable. */
  readonly seen?: LightMark;
  readonly rooms?: readonly Room[];
}
export interface AimInput {
  readonly world: Rect;
  /** Solids for walkability (walls, closed leaves, chasms...). */
  readonly solids: readonly Rect[];
  /** Light blockers (walls, closed leaves). */
  readonly blockers: readonly Rect[];
  /** Actor centre the player walks from. */
  readonly start: Point;
}
/** Top-left actor centre of an AIM_AREA×AIM_AREA block of standing positions that all meet the goal with one facing. */
export interface AimArea { readonly facing: Facing; readonly x: number; readonly y: number }
export function findAimAreas(goal: AimGoal, input: AimInput): AimArea[]
export function hasAimArea(goal: AimGoal, input: AimInput): boolean
```

Algorithm: candidates = `reachableFeet(input.start, input, 2)` (from `reachAudit.ts`), keeping only positions whose ground point is within `BEAM_LENGTH + HALO_RADIUS` px of the centre of some `hit` rect (or of the `seen` mark when `hit` is empty). For each facing, a position is good when, with footprints = `lanternFootprints({location:{at:'hand'},on:true}, groundPoint(pos), facing, () => null)`, every hit rect is lit, no avoid rect is lit, and (if `seen`) the mark is readable and `canSeeMark(groundPoint(pos), …)`. An area exists at (x, y, facing) when all 25 positions (x+i, y+j), i, j ∈ {0,2,4,6,8}, are good. `hasAimArea` may stop at the first area. Keep it fast: the test-room tests below must finish in a few seconds.

### Tests (light.test.ts, lightAudit.test.ts)

- `facingVector`: all 8 have length 1 (±1e-9); `up` = (0,-1); `downright` = (√½, √½).
- `groundPoint({x:100,y:100})` = (100, 119).
- `beamPolygon({x:100,y:200}, 'up')` contains exactly (94,200), (106,200), (84,144), (116,144) (any order the function documents).
- `isPointLit` with a hand beam facing up from (100,200), no blockers: (100,150) lit; (100,143) not; (100,205) lit (halo, 5px behind the lamp); (100,213) not; at y=150 (distance 50) the beam half-width is 6+10·50/56 ≈ 14.93: x=114 lit, x=115 not. Diagonal `upright`: the point at distance 50 along the diagonal is lit, at 57 not.
- Blockers: wall {98,170,4,10} between (100,200) and (100,150) → (100,150) unlit, (110,150) still lit. Halo clipped: wall {95,195,10,2} → (100,192) unlit although within 12px. A segment running exactly along a blocker edge is not blocked.
- `lanternFootprints`: off → []; hand → one beam + one halo at the ground point; pedestal 'a' at (50,50) with spills for 'a' and 'b' → halo at (50,50) + only 'a''s spill with origin (50,50); unknown pedestal position → [].
- Spill clipping: a spill area behind a wall (from the pedestal point) is unlit; an `area` with origin null is never clipped.
- `isRectLit`: a rect only touched by the beam at one corner sample is lit; a rect fully outside is not.
- `isMarkReadable`: lit mark under beam → true, without → false; dark mark the opposite.
- `canSeeMark`: 64px exactly → true, 65 → false; wall between → false; different rooms → false; no rooms → room check skipped.
- `marksToRecord`: skips found ids, keeps list order, skips unreadable and unseen marks.
- `lightAudit`: in an empty 200×200 world, a target 30px north of the start → `hasAimArea` true with facing `up` among the areas; an `avoid` rect that contains the `hit` rect → false; a target reachable only from a 4px-wide pocket (walls leave a pocket where the standing positions cannot form an 8×8 block) → false.

## Task L2 — the test room's light corner (pure) + tests

Files: `src/v4/levels/test-room/testRoomLayout.ts`, `testRoomLogic.ts`, `testRoomLayout.test.ts`, new `testRoomLight.test.ts`.

### Geometry (add to `TEST_ROOM`; keep everything that exists)

Add three walls to `walls` (they enclose the north-west corner):

```ts
{ x: 16, y: 150, width: 88, height: 8 },    // corner wall, west of door C
{ x: 134, y: 150, width: 16, height: 8 },   // corner wall, east of door C
{ x: 150, y: 96, width: 8, height: 62 },    // corner east wall
```

New fields on `TestRoomLayout` (JSDoc each):

```ts
doorC: { x: 104, y: 150, width: 30, height: 8 },            // leaf; solid and a light blocker while closed
doorCThreshold: { x: 104, y: 146, width: 30, height: 16 },  // a foot overlapping it holds door C open (bridge rule)
chasmNorth: { x: 46, y: 96, width: 34, height: 16 },        // always solid
chasmSouth: { x: 46, y: 136, width: 34, height: 14 },       // always solid
bridgeDeck: { x: 46, y: 112, width: 34, height: 24 },       // solid unless the root bridge is walkable
rootBed: { x: 80, y: 112, width: 12, height: 24 },          // open-face sensor on the floor; not solid
flowerSouth: { x: 96, y: 160, width: 8, height: 8 },        // open face of flower C, west-room side; not solid
flowerNorth: { x: 96, y: 140, width: 8, height: 8 },        // open face of flower C, corner side; not solid
```

Exports:

```ts
export const DOOR_C_ID = 'doorC'; export const FLOWER_ID = 'flowerC'; export const ROOT_BED_ID = 'rootBed';
export const SPORES_ID = 'spores'; export const ETCHING_ID = 'etching'; export const SCRATCH_ID = 'scratch';
export const TEST_ROOM_LIGHT_MARKS: readonly LightMark[] = [
  { id: SPORES_ID, kind: 'dark', rect: { x: 22, y: 104, width: 10, height: 8 } },   // alcove, past the root bridge
  { id: ETCHING_ID, kind: 'lit', rect: { x: 22, y: 132, width: 10, height: 8 } },   // alcove
  { id: SCRATCH_ID, kind: 'dark', rect: { x: 162, y: 110, width: 8, height: 8 } },  // west room, just east of the corner wall
];
export const TEST_ROOM_ROOMS: readonly Room[] = [
  { id: 'corner', rect: { x: 16, y: 96, width: 134, height: 54 } },
  { id: 'west', rect: { x: 16, y: 96, width: 300, height: 232 } },
  { id: 'east', rect: { x: 324, y: 96, width: 268, height: 232 } },
];
```

Layout of the corner, for the reader: alcove x 16..46 · chasm x 46..80 with a root bridge at y 112..136 · junction yard x 80..150 with the root bed at the bridge head · door C in the corner's south wall at x 104..134. Flower C has a face on each side of the wall, west of the door.

### Logic (`testRoomLogic.ts`)

```ts
/** Live, unsaved state of the light corner. Recomputed every frame; the bridge rule needs the previous frame. */
export interface CornerLive { readonly flowerLit: boolean; readonly doorCOpen: boolean; readonly bedLit: boolean; readonly bridgeWalkable: boolean }
export const INITIAL_CORNER: CornerLive = { flowerLit: false, doorCOpen: false, bedLit: false, bridgeWalkable: true };
/**
 * One frame of the corner. flowerLit = either flower face is lit; door C = stepBridge(prev.doorCOpen, flowerLit, foot overlaps doorCThreshold);
 * bedLit = rootBed is lit; bridge = stepBridge(prev.bridgeWalkable, !bedLit, foot overlaps bridgeDeck). Water is always present.
 */
export function stepCorner(prev: CornerLive, footprints: readonly Footprint[], blockers: readonly Rect[], foot: Rect): CornerLive
/** Light blockers now: every wall, plus door A, gate B and door C leaves while closed. */
export function testRoomBlockers(v: TestRoomView, corner: CornerLive): Rect[]
```

Change `testRoomSolids(v)` to `testRoomSolids(v, corner: CornerLive = INITIAL_CORNER)`: add `chasmNorth`, `chasmSouth`, `doorC` while closed, `bridgeDeck` while not walkable. Existing callers keep working.

Journal text (Vietnamese, exported like `CARVING_JOURNAL_TEXT`), as a map `LIGHT_MARK_JOURNAL_TEXT: Record<string, string>`:
- spores: `Bào tử phát quang trong hốc: chỉ hiện khi không có vệt đèn chiếu vào.`
- etching: `Nét khắc ánh trong hốc: chỉ đọc được dưới vệt đèn.`
- scratch: `Vết xước sau vách góc: phải đứng cùng phía mới thấy.`

HUD, hints and saved state stay as they are: the corner is optional and keeps no saved state (puzzle-contracts §4: only configuration is saved; footprints and facing are not).

### Tests (`testRoomLight.test.ts`; keep all existing tests green)

Use `findAimAreas` / `hasAimArea` with `world: TEST_ROOM.world`, `start` = the `start` checkpoint spawn, and the "door C open" state: solids = `testRoomSolids(INITIAL view, {…INITIAL_CORNER, doorCOpen: true})`, blockers = `testRoomBlockers(INITIAL view, {…, doorCOpen: true})`.

1. Aim from the west room: `hasAimArea({ hit: [flowerSouth], avoid: [rootBed] })` is true.
2. Aim from the corner: `hasAimArea({ hit: [flowerNorth], avoid: [rootBed] })` is true, **and** the tension is real: some reachable corner position (`roomAt(groundPoint(pos), TEST_ROOM_ROOMS) === 'corner'`) and facing lights both `flowerNorth` and `rootBed` (scan reachable positions with footprints from `lanternFootprints`).
3. Approach to the bridge: from actor (110,110), facing `left` lights `rootBed`; facing `up` does not.
4. Door closed blocks: with door C closed, from actor (100,128) facing `down`, `flowerNorth` is lit and `flowerSouth` is not.
5. `stepCorner`: flower lit → door opens; flower dark and foot in threshold while open → stays open; flower dark and foot away → closes. Bed lit → bridge not walkable unless the foot is on the deck and it was walkable (holds); bed dark → walkable.
6. A position is "in the corner" when `roomAt(groundPoint(pos), TEST_ROOM_ROOMS) === 'corner'`, and "in the alcove" when it is in the corner and its ground x < 46. With door C closed, no corner position is reachable from `start` (`reachableFeet`). With door C open and the bridge walkable, an alcove position is reachable; with door C open and the bridge not walkable, none is.
7. Seen: `canSeeMark` for SCRATCH is false from every reachable corner position (as defined in 6, with rooms and blockers), and true from actor (190,120) in the west room. SPORES is readable with no footprints and seen from some reachable alcove/yard position. ETCHING: `hasAimArea({ hit: [etching.rect], avoid: [], seen: ETCHING mark, rooms })` is true.
8. `auditReach` stays `[]` for the initial view, the fully-open view, and both with the corner fully open (door C open, bridge walkable).

## Task L3 — renderer, host and test-room runtime (Phaser)

### LanternSystem (`src/systems/LanternSystem.ts`)

- `LanternLightingProfile` becomes `{ readonly ambientDarkness: number }`. `FOREST_LIGHTING = { ambientDarkness: 0.5 }`, `LIBRARY_LIGHTING = { ambientDarkness: 0.42 }`, new `DEFAULT_LIGHTING = { ambientDarkness: 0.42 }`.
- Remove the halo sprite, the falloff-box branch and its texture requirement; keep the vignette (constant) and the Pulse wave, cooldown and `triggerPulse` exactly as they are.
- New `update(dt: number, footprints: readonly Footprint[], blockers: readonly Rect[]): void`:
  - When lighting is enabled: an ambient overlay (fill 0x040b12, alpha = `ambientDarkness`, 640×360, depth 68), the same every frame whatever F is.
  - The lit area at depth 69, blend mode ADD: over the bounding box of all footprints (beam polygon corners, halo ±radius, area points), test each 2px cell centre with `isPointLit`; lit cells fill 0xffe6a0 at alpha 0.26; lit cells with an unlit 4-neighbour (the rim) at alpha 0.5. Multiply both alphas by a gentle flicker (±3%, the current formula).
  - When lighting is disabled: draw nothing but the Pulse wave.
- Remove `getCarriedLightPosition` if nothing else uses it.

### Host (`LevelHost.ts`, `V4Scene.ts`)

`V4LevelRuntime` changes:

```ts
/** Ambient darkness for this level; constant, never tied to F (puzzle-contracts §1). Replaces lanternLightProfile(). */
ambientDarkness(): number;
/** Light blockers now: walls and closed door/gate leaves. */
lightBlockers(): readonly Rect[];
/** Lit and dark marks; the host records seen ones in J. */
lightMarks(): readonly LightMark[];
/** Rooms for the "seen" rule. Optional: absent means no room check. */
rooms?(): readonly Room[];
/** Declared pedestal spills. Optional. */
lightSpills?(): readonly SpillDecl[];
/** Fixed sources' footprints now. Optional. */
fixedFootprints?(): readonly Footprint[];
/** Per frame. `footprints` are every gameplay footprint this frame (lantern + fixed sources). */
update(dt: number, foot: Rect, footprints: readonly Footprint[]): void;
```

`V4Scene.update`, after `player.update`:
1. `ground = groundPoint({x: player.x, y: player.y})`.
2. `footprints = [...(lanternAvailable ? lanternFootprints(lantern, ground, player.facing, id => level.pedestalPosition(id), level.lightSpills?.() ?? []) : []), ...(level.fixedFootprints?.() ?? [])]`.
3. `level.update(dt, foot, footprints)`.
4. `blockers = level.lightBlockers()`; `lanternSystem.update(dt, footprints, blockers)`.
5. For each id in `marksToRecord(ground, level.lightMarks(), footprints, blockers, level.rooms?.() ?? [], new Set(save.journal))`: `addJournal(id)`.
Create the LanternSystem with `{ ambientDarkness: level.ambientDarkness() }`. Pulse is unchanged.

### TestRoomLevel

- Keep everything that exists. Hold `private corner: CornerLive = INITIAL_CORNER`.
- `update(dt, foot, footprints)`: `corner = stepCorner(corner, footprints, testRoomBlockers(view, corner), foot)`; enable/disable the door C leaf and bridge deck zones (static zones like leaf A); add always-solid zones for `chasmNorth`/`chasmSouth` and the three new walls (walls already loop over `TEST_ROOM.walls`). Sounds: door C open/close like door A.
- Draw: chasm 0x05090c; bridge roots 0x5a6b3a when walkable (two thin retracted stubs at each bank when not); root bed 0x3d5a2a, with a lighter 0x6f8f4a tint while lit; flower faces: petals 0xf2c46a while lit, 0x8a6a3a while dark; door C leaf like door A.
- Marks (depth 68.5, above the ambient overlay so they read as self-lit): a dark mark drawn as a bright 0x7df2d4 speckle while readable; a lit mark as a 0xffe08a line glyph while readable; when not readable but already in J, a faint outline (alpha 0.25) of its rect. Readability from `isMarkReadable` with this frame's footprints and blockers.
- `lightBlockers()` = `testRoomBlockers(viewNow(), corner)`; `lightMarks()` = `TEST_ROOM_LIGHT_MARKS`; `rooms()` = `TEST_ROOM_ROOMS`; `ambientDarkness()` = 0.42.
- `journalText(id)`: carving text, or `LIGHT_MARK_JOURNAL_TEXT[id]`, or ''.

## Task L4 — lead

Review each task's diff, run `npx tsc --noEmit`, `npm test`, `scripts/check-*.mjs`, build, and play the test room in the browser preview: 8 directions, beam and halo cut at walls and closed door C, the scratch mark not recorded from the corner, aiming at flower C while avoiding the root bed, crossing the root bridge with F off, F state persisting after reload.
