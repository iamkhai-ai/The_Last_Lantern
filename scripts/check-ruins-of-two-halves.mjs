import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import ts from 'typescript';
import {
  canLatchRuinsSanctuary, deriveRuinsPracticeState, deriveRuinsPuzzleState, getRuinsExitBlock, getRuinsSolid,
  getRuinsStage, isRuinsExitReady, isRuinsMainPuzzleEngaged, isRuinsPositionSafe, resolveRuinsSpawn, RUINS_BEAMS,
  RUINS_BLOCKERS, RUINS_BODY,
  RUINS_CHECKPOINTS, RUINS_ENTRY_COUNTERS, RUINS_FLOOR, RUINS_MIRROR_SOLUTION, RUINS_MIRROR_STATES, RUINS_PRACTICE,
  RUINS_PROPS, RUINS_RECEIVERS, RUINS_RECEIVER_DEPTH, RUINS_SHADOW_OVERLAY, RUINS_SHADOW_QUADS, RUINS_SOLVED_CONFIGURATION,
  RUINS_SPAWN, RUINS_STANDS, RUINS_STATUE_SOLUTION, RUINS_WALL_FIXTURES, RUINS_WALLS, ruinsActorBody, ruinsDepthAt,
  ruinsNormalizeCounters, ruinsPointInQuad, ruinsQuadContainsRect,
  ruinsRectsOverlap, ruinsSegmentIntersectsQuad,
  RUINS_SHADOW, ruinsNextStep, ruinsShadowPhase, ruinsShadowPoseFor, ruinsShadowSpotFor,
  ruinsShadowFootprintAt, ruinsShadowSolidEnabled, ruinsShadowWalkResume,
  RUINS_SHADOW_SOLID_EPS, RUINS_SHADOW_WALK_COUNTER, RUINS_SHADOW_WALK_START,
} from '../src/data/ruinsOfTwoHalvesLayout.ts';

/* -------------------------------------------------------------------------- */
/* 1. body constants                                                          */
/* -------------------------------------------------------------------------- */

assert.deepEqual(RUINS_BODY, { feetY: 19, x: -7, y: 16, width: 14, height: 6 });
assert.deepEqual(ruinsActorBody({ x: 120, y: 288 }), { x: 113, y: 304, width: 14, height: 6 });
assert.equal(ruinsActorBody({ x: 120, y: 288 }).y + 6, 310, 'spawn foot body sits exactly on the floor band edge');

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

const safe = (center) => isRuinsPositionSafe(center);

/** Collision-aware BFS over the real 14x6 foot body, stepping inside the floor band. */
const reach = (start, target, tolerance = 22) => {
  const step = 4;
  const queue = [start];
  const seen = new Set([`${Math.round(start.x)},${Math.round(start.y)}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (Math.hypot(point.x - target.x, point.y - target.y) <= tolerance) return true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${Math.round(next.x)},${Math.round(next.y)}`;
      if (seen.has(key) || !safe(next)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
};

/** Every floor point the player can occupy, for reachability from the spawn. */
const reachableFromSpawn = (target, tolerance = 22) => reach(RUINS_SPAWN, target, tolerance);

/* -------------------------------------------------------------------------- */
/* 2. every authored stand point is reachable from the spawn and collision-safe */
/* -------------------------------------------------------------------------- */

for (const stand of RUINS_STANDS) {
  assert.equal(safe({ x: stand.x, y: stand.y }), true, `stand ${stand.id} must be walkable for the foot body`);
  assert.equal(reachableFromSpawn({ x: stand.x, y: stand.y }),
    true, `stand ${stand.id} must be reachable from the spawn by a collision-aware search`);
}

// The spawn itself is walkable and inside the floor band.
assert.equal(safe(RUINS_SPAWN), true, 'spawn centre is walkable');

// Distinct nearest-target areas: no two stands overlap more than a third of their radius.
for (let i = 0; i < RUINS_STANDS.length; i += 1) {
  for (let j = i + 1; j < RUINS_STANDS.length; j += 1) {
    const a = RUINS_STANDS[i];
    const b = RUINS_STANDS[j];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    // The parked Shadow keeps a smaller (r18) talk circle beside the inscription: those pairs must not overlap, the rest keep 60px.
    const needed = a.id === 'shadow-wait' || b.id === 'shadow-wait' ? a.radius + b.radius : 60;
    assert.ok(distance >= needed, `stands ${a.id} and ${b.id} keep distinct nearest-target areas (${distance.toFixed(0)}px)`);
  }
}

/* -------------------------------------------------------------------------- */
/* 3. every standing solid blocks the foot body from all four cardinal sides   */
/* -------------------------------------------------------------------------- */

const props = Object.values(RUINS_PROPS);
for (const prop of props) {
  const solid = getRuinsSolid(prop.id);
  assert.ok(solid, `${prop.id} has a registered solid`);
  assert.deepEqual(
    { x: solid.x, y: solid.y, width: solid.width, height: solid.height },
    prop.footprint,
    `${prop.id} solid matches its rendered standing footprint`,
  );
  const centreY = solid.y + solid.height / 2;
  const contacts = [
    ['north', { x: solid.x + solid.width / 2, y: solid.y - 19 }],
    ['south', { x: solid.x + solid.width / 2, y: solid.y + solid.height - 19 }],
    ['west', { x: solid.x, y: centreY }],
    ['east', { x: solid.x + solid.width, y: centreY }],
  ];
  for (const [direction, centre] of contacts) {
    assert.equal(ruinsRectsOverlap(ruinsActorBody(centre), solid), true,
      `${prop.id} footprint covers the ${direction} contact body`);
    assert.equal(safe(centre), false, `${prop.id} actually blocks the foot body from the ${direction}`);
  }
}

// Walls and the buttress block too, and no blocker contradicts visible art.
for (const wall of RUINS_WALLS) {
  assert.equal(safe({ x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 }), false, `${wall.id} blocks its own centre`);
}
assert.equal(RUINS_BLOCKERS.length, RUINS_WALLS.length + props.length, 'every blocker is a wall or a registered prop');

// Ground stamps are walkable: the locks, the splitter inlay and the practice slab are floor art.
for (const centre of [
  { x: RUINS_RECEIVERS.left.x + 16, y: RUINS_RECEIVERS.left.y + 20 },
  { x: RUINS_RECEIVERS.moon.x + 16, y: RUINS_RECEIVERS.moon.y + 20 },
  { x: RUINS_RECEIVERS.right.x + 16, y: RUINS_RECEIVERS.right.y + 20 },
  { x: 320, y: 238 },
  { x: RUINS_PRACTICE.slab.center.x, y: RUINS_PRACTICE.slab.center.y },
]) {
  assert.equal(safe(centre), true, `ground stamp at ${centre.x},${centre.y} stays walkable`);
}

/* -------------------------------------------------------------------------- */
/* 4. the shadow region: only the Moon lock, only at the right notch           */
/* -------------------------------------------------------------------------- */

assert.equal(RUINS_SHADOW_QUADS.length, 4, 'one authored shadow region per statue notch');
for (const [notch, quad] of RUINS_SHADOW_QUADS.entries()) {
  const coversMoon = ruinsQuadContainsRect(quad, RUINS_RECEIVERS.moon);
  const coversLeft = ruinsQuadContainsRect(quad, RUINS_RECEIVERS.left);
  const coversRight = ruinsQuadContainsRect(quad, RUINS_RECEIVERS.right);
  assert.equal(coversMoon, notch === RUINS_STATUE_SOLUTION,
    `notch ${notch} covers the middle Moon receiver only at the correct orientation`);
  assert.equal(coversLeft, false, `notch ${notch} never covers the outer left Sun receiver`);
  assert.equal(coversRight, false, `notch ${notch} never covers the outer right Sun receiver`);
}

// The correct notch's shadow is a real region that actually contains the Moon lock footprint.
assert.equal(ruinsQuadContainsRect(RUINS_SHADOW_QUADS[RUINS_STATUE_SOLUTION], RUINS_RECEIVERS.moon), true);
// ... and its edges really straddle the receiver, so the drawn art and the tested region agree.
assert.equal(ruinsPointInQuad(RUINS_SHADOW_QUADS[0], { x: 320, y: 112 }), true, 'Moon receiver centre is inside the drawn shadow');

/* -------------------------------------------------------------------------- */
/* 5. the side branches: only the diagonal shadows block them                  */
/* -------------------------------------------------------------------------- */

const beamIntersection = (notch, side) => {
  const ray = side === 'left'
    ? { from: { x: 240, y: 238 }, to: { x: 240, y: 112 } }
    : { from: { x: 400, y: 238 }, to: { x: 400, y: 112 } };
  return ruinsSegmentIntersectsQuad(ray, RUINS_SHADOW_QUADS[notch]);
};
assert.equal(beamIntersection(0, 'left'), false, 'notch 0 never blocks the left branch');
assert.equal(beamIntersection(0, 'right'), false, 'notch 0 never blocks the right branch');
assert.equal(beamIntersection(1, 'left'), false, 'notch 1 never blocks the left branch');
assert.equal(beamIntersection(1, 'right'), false, 'notch 1 never blocks the right branch');
assert.equal(beamIntersection(2, 'left'), true, 'notch 2 blocks the left branch');
assert.equal(beamIntersection(2, 'right'), false, 'notch 2 leaves the right branch alone');
assert.equal(beamIntersection(3, 'left'), false, 'notch 3 leaves the left branch alone');
assert.equal(beamIntersection(3, 'right'), true, 'notch 3 blocks the right branch');

/* -------------------------------------------------------------------------- */
/* 6. receiver state is a live function of live input                          */
/* -------------------------------------------------------------------------- */

const solved = { lanternPlaced: true, lanternOn: true, statue: 0, leftMirror: 1, rightMirror: 0 };
const solvedState = deriveRuinsPuzzleState(solved);
assert.equal(solvedState.confirmReady, true, 'the intended configuration confirms');
assert.equal(solvedState.sunsLit, 2, 'both Sun receivers light in the intended configuration');
assert.equal(solvedState.moonCovered, true, 'the Moon receiver is covered in the intended configuration');
assert.equal(RUINS_MIRROR_SOLUTION.left, 1);
assert.equal(RUINS_MIRROR_SOLUTION.right, 0);

// No saved history may enter the derivation: extra fields are ignored and cannot unlock anything.
const withHistory = deriveRuinsPuzzleState({
  ...solved, l7Solved: true, 'l7-route-latched': true, previousLit: true, atLeft: true, solvedOnce: true, statue: 1,
});
assert.equal(withHistory.confirmReady, false, 'injected history cannot make a wrong statue confirm');
assert.deepEqual(
  deriveRuinsPuzzleState({ lanternPlaced: true, lanternOn: true, statue: 2, leftMirror: 1, rightMirror: 0 }),
  deriveRuinsPuzzleState({ lanternPlaced: true, lanternOn: true, statue: 2, leftMirror: 1, rightMirror: 0 }),
  'the state is deterministic in the live input alone',
);

// Lamps off: the Moon meets its condition but both Suns lose light -> unsolvable.
const lampsOff = deriveRuinsPuzzleState({ ...solved, lanternOn: false });
assert.equal(lampsOff.sunsLit, 0, 'turning the lamp off kills both Sun receivers');
assert.equal(lampsOff.moonDark, true, 'with the lamp off the Moon reads dark');
assert.equal(lampsOff.confirmReady, false, 'turning the lamp off never solves the puzzle');

// Lamp in hand instead of placed: no live power.
assert.equal(deriveRuinsPuzzleState({ ...solved, lanternPlaced: false }).sunsLit, 0, 'an unplaced lamp powers no receiver');
assert.equal(deriveRuinsPuzzleState({ ...solved, lanternPlaced: false }).confirmReady, false);

// Wrong mirror states.
for (const [, state] of [2, 3].entries()) {
  assert.equal(deriveRuinsPuzzleState({ ...solved, leftMirror: state }).leftLit, false, `left mirror state ${state} does not aim the ray`);
  assert.equal(deriveRuinsPuzzleState({ ...solved, rightMirror: state }).rightLit, false, `right mirror state ${state} does not aim the ray`);
}
assert.equal(deriveRuinsPuzzleState({ ...solved, leftMirror: 0 }).leftLit, false, 'the left mirror accepts only "\\"');
assert.equal(deriveRuinsPuzzleState({ ...solved, rightMirror: 1 }).rightLit, false, 'the right mirror accepts only "/"');

// Both wrong statue notches leave the Moon lit, exactly as the scenario describes.
for (const statue of [2, 3]) {
  const state = deriveRuinsPuzzleState({ ...solved, statue });
  assert.equal(state.moonCovered, false, `statue notch ${statue} leaves the Moon lit`);
  assert.equal(state.confirmReady, false, `statue notch ${statue} does not solve the puzzle`);
}
assert.equal(deriveRuinsPuzzleState({ ...solved, statue: 2 }).leftLit, false, 'notch 2 also costs the left Sun');
assert.equal(deriveRuinsPuzzleState({ ...solved, statue: 3 }).rightLit, false, 'notch 3 also costs the right Sun');
assert.equal(deriveRuinsPuzzleState({ ...solved, statue: 1 }).sunsLit, 2, 'notch 1 keeps both Suns lit but the Moon stays out of shadow');

/* -------------------------------------------------------------------------- */
/* 7. the practice forecourt is separate and contributes nothing               */
/* -------------------------------------------------------------------------- */

assert.equal(deriveRuinsPracticeState({ practiceNotch: 0, lanternOn: true }).slabShadowed, true, 'wide face shadows the practice slab');
assert.equal(deriveRuinsPracticeState({ practiceNotch: 2, lanternOn: true }).slabShadowed, true, 'the opposite wide face shadows it too');
assert.equal(deriveRuinsPracticeState({ practiceNotch: 1, lanternOn: true }).slabShadowed, false, 'narrow face lets the light through');
assert.equal(deriveRuinsPracticeState({ practiceNotch: 3, lanternOn: true }).slabShadowed, false, 'the opposite narrow face lets it through');
assert.equal(deriveRuinsPracticeState({ practiceNotch: 0, lanternOn: false }).slabShadowed, false, 'the practice beam needs the live lamp');
// Practice state never appears in, or influences, the main puzzle state.
assert.deepEqual(
  deriveRuinsPuzzleState(solved),
  deriveRuinsPuzzleState({ ...solved, practiceNotch: 0, practiceSlabShadowed: true }),
  'the practice area shares no state with the main puzzle',
);

/* -------------------------------------------------------------------------- */
/* 8. the latch is live, one-way and never inferred from history               */
/* -------------------------------------------------------------------------- */

assert.equal(canLatchRuinsSanctuary(solvedState, false), true, 'the latch may be taken while the live condition holds');
assert.equal(canLatchRuinsSanctuary(solvedState, true), false, 'the latch is not taken twice');
assert.equal(canLatchRuinsSanctuary(deriveRuinsPuzzleState({ ...solved, statue: 2 }), false), false, 'no latch without the Moon in shadow');
assert.equal(canLatchRuinsSanctuary(lampsOff, false), false, 'no latch with the lamp off');
assert.equal(canLatchRuinsSanctuary(deriveRuinsPuzzleState({ ...solved, lanternPlaced: false }), false), false, 'no latch without the placed lamp');

/* -------------------------------------------------------------------------- */
/* 9. safe restore                                                            */
/* -------------------------------------------------------------------------- */

assert.deepEqual(resolveRuinsSpawn(undefined, { exitReady: false }), { x: RUINS_SPAWN.x, y: RUINS_SPAWN.y });
assert.deepEqual(resolveRuinsSpawn({ x: 300, y: 288 }, { exitReady: false }), { x: 300, y: 288 }, 'a safe saved centre is kept');

const unsafeSaves = [
  { x: 320, y: 180 },   // inside the statue
  { x: 240, y: 238 },   // inside the left mirror
  { x: 480, y: 236 },   // inside the main pedestal
  { x: 180, y: 128 },   // inside the seedling bed
  { x: 150, y: 234 },   // inside the practice pedestal
  { x: 12, y: 200 },    // inside the west wall
  { x: 320, y: 20 },    // behind the north wall
];
for (const saved of unsafeSaves) {
  const spawn = resolveRuinsSpawn(saved, { exitReady: false });
  assert.equal(safe(spawn), true, `restore from ${saved.x},${saved.y} returns a walkable centre`);
  assert.notDeepEqual(spawn, saved, `restore from ${saved.x},${saved.y} does not keep an unsafe centre`);
  assert.ok(spawn.y >= RUINS_FLOOR.top, `restore from ${saved.x},${saved.y} stays on this side of the north wall`);
}

const beyondGate = RUINS_CHECKPOINTS.find((point) => point.id === 'north-stair');
assert.ok(beyondGate?.requiresExit, 'the north-stair checkpoint is gated on the open exit');
for (const exit of [false, true]) {
  const spawn = resolveRuinsSpawn({ x: beyondGate.x, y: beyondGate.y }, { exitReady: exit });
  assert.equal(safe(spawn), true, `restore behind the north wall resolves to a walkable centre (exitReady=${exit})`);
  assert.ok(spawn.y > 80, `restore never places the player past the north wall (exitReady=${exit})`);
  assert.notDeepEqual({ x: spawn.x, y: spawn.y }, { x: beyondGate.x, y: beyondGate.y }, 'never restore beyond an unsolved gate');
}

// Every open checkpoint is walkable and reachable; the gated one is a sentinel that must never be
// usable, because the north wall stands between the yard and it.
for (const checkpoint of RUINS_CHECKPOINTS) {
  if (checkpoint.requiresExit === true) {
    assert.equal(safe({ x: checkpoint.x, y: checkpoint.y }), false,
      `gated checkpoint ${checkpoint.id} is unreachable on foot, so it can never be used as a spawn`);
    assert.equal(reachableFromSpawn({ x: checkpoint.x, y: checkpoint.y }, 4), false,
      `gated checkpoint ${checkpoint.id} lies beyond the north wall`);
    continue;
  }
  assert.equal(safe({ x: checkpoint.x, y: checkpoint.y }), true, `checkpoint ${checkpoint.id} is walkable`);
  assert.equal(reachableFromSpawn({ x: checkpoint.x, y: checkpoint.y }), true,
    `checkpoint ${checkpoint.id} is reachable from the spawn by a collision-aware search`);
}

/* -------------------------------------------------------------------------- */
/* 10. completion gating of the exit and the confirmation                     */
/* -------------------------------------------------------------------------- */

assert.equal(getRuinsExitBlock({ latched: false, lanternRetrieved: false, metShadow: false }), 'latch');
assert.equal(getRuinsExitBlock({ latched: true, lanternRetrieved: false, metShadow: false }), 'lamp');
assert.equal(getRuinsExitBlock({ latched: true, lanternRetrieved: true, metShadow: false }), 'shadow');
assert.equal(getRuinsExitBlock({ latched: true, lanternRetrieved: true, metShadow: true }), undefined);
assert.equal(isRuinsExitReady({ latched: true, lanternRetrieved: true, metShadow: false }), false, 'the exit stays locked until the Shadow conversation ends');
assert.equal(isRuinsExitReady({ latched: true, lanternRetrieved: true, metShadow: true }), true, 'the exit opens on the scenario completion conditions');

// The staging that drives objective text and hints follows the same live state.
const stage = (over) => getRuinsStage({
  practiceSeen: true, lanternPlaced: false, puzzle: solvedState, latched: false,
  lanternRetrieved: false, metShadow: false, mainPuzzleEngaged: true, ...over,
});
assert.equal(stage({ practiceSeen: false, mainPuzzleEngaged: false }), 'practice');
assert.equal(stage({ practiceSeen: false, mainPuzzleEngaged: true }), 'place',
  'a player who walks past the practice forecourt is no longer held on the tutorial objective');
assert.equal(stage({ practiceSeen: false, mainPuzzleEngaged: true, latched: true, lanternPlaced: true }), 'retrieve',
  'the tutorial stage never overrides the latched/retrieve flow');
assert.equal(stage({ practiceSeen: true, lanternPlaced: false }), 'place');
assert.equal(stage({ practiceSeen: true, lanternPlaced: true, puzzle: deriveRuinsPuzzleState({ ...solved, statue: 1 }) }), 'moon');
assert.equal(stage({ practiceSeen: true, lanternPlaced: true, puzzle: deriveRuinsPuzzleState({ ...solved, leftMirror: 2 }) }), 'suns');
assert.equal(stage({ practiceSeen: true, lanternPlaced: true, puzzle: solvedState }), 'confirm');
assert.equal(stage({ practiceSeen: true, lanternPlaced: true, puzzle: solvedState, latched: true, lanternRetrieved: false }), 'retrieve');
assert.equal(stage({ practiceSeen: true, lanternPlaced: false, puzzle: solvedState, latched: true, lanternRetrieved: true }), 'shadow');
assert.equal(stage({ practiceSeen: true, lanternPlaced: false, puzzle: solvedState, latched: true, lanternRetrieved: true, metShadow: true }), 'exit');

// The tutorial is released exactly when the player reaches the main puzzle.
assert.equal(isRuinsMainPuzzleEngaged({ lanternPlaced: false, statue: 1, leftMirror: 3, rightMirror: 2 }), false,
  'a fresh save has not engaged the main puzzle');
assert.equal(isRuinsMainPuzzleEngaged({ lanternPlaced: true, statue: 1, leftMirror: 3, rightMirror: 2 }), true);
for (const [statue, left, right] of [[0, 3, 2], [1, 0, 2], [1, 3, 1]]) {
  assert.equal(isRuinsMainPuzzleEngaged({ lanternPlaced: false, statue, leftMirror: left, rightMirror: right }), true,
    `statue ${statue} / mirrors ${left},${right} counts as engaged`);
}

/* -------------------------------------------------------------------------- */
/* 11. v1 save compatibility with the existing `l7-` flags                     */
/* -------------------------------------------------------------------------- */

const legacy = {
  version: 1, level: 7, lanternOn: true, lanternPickedUp: true,
  flags: { 'l7-solved': true, 'l7-route-latched': true, 'l7-lantern-placed': false },
  counters: { statue: 2, 'ruins-left': 2, 'ruins-right': 1 },
};
assert.equal(legacy.flags['l7-solved'], true);
// A legacy solved save keeps its committed latch and its statue configuration.
const legacyLatched = legacy.flags['l7-route-latched'] === true || legacy.flags['l7-solved'] === true;
assert.equal(legacyLatched, true, 'a legacy solved save stays latched');
assert.equal(isRuinsExitReady({ latched: legacyLatched, lanternRetrieved: true, metShadow: true }), true, 'a legacy solved save can still finish');
// ... but the live derivation from that same legacy configuration is still false: history never fakes a live condition.
assert.equal(deriveRuinsPuzzleState({
  lanternPlaced: false, lanternOn: legacy.lanternOn, statue: legacy.counters.statue,
  leftMirror: legacy.counters['ruins-left'], rightMirror: legacy.counters['ruins-right'],
}).confirmReady, false, 'a stale save cannot make the live condition read solved');
// Legacy mirror values 2 and 1 are the level-08 placeholder values; they simply need rotating again.
assert.equal(deriveRuinsPuzzleState({
  lanternPlaced: true, lanternOn: true, statue: 0,
  leftMirror: legacy.counters['ruins-left'], rightMirror: legacy.counters['ruins-right'],
}).confirmReady, false, 'legacy placeholder mirror values cannot confirm without the player acting');
// And the safe restore of a legacy save never lands in a solid.
assert.equal(safe(resolveRuinsSpawn({ x: 120, y: 205 }, { exitReady: false })), true,
  'a legacy saved coordinate resolves to a walkable centre');

// A committed latch keeps the configuration that solved the temple (scenario §7), so a resumed
// session re-derives the solution instead of showing a dark temple behind a latched ring.
const resumed = { statue: 2, 'ruins-left': 2, 'ruins-right': 1 };
ruinsNormalizeCounters({ 'l7-solved': true }, resumed);
assert.deepEqual(resumed, {
  statue: RUINS_SOLVED_CONFIGURATION.statue,
  'ruins-left': RUINS_SOLVED_CONFIGURATION.leftMirror,
  'ruins-right': RUINS_SOLVED_CONFIGURATION.rightMirror,
  practice: RUINS_ENTRY_COUNTERS.practice,
}, 'a latched save is restored onto the solving configuration');
assert.equal(deriveRuinsPuzzleState({
  lanternPlaced: true, lanternOn: true, statue: resumed.statue,
  leftMirror: resumed['ruins-left'], rightMirror: resumed['ruins-right'],
}).confirmReady, true, 'the restored configuration still reads as the live solved condition');
// Snapping is not a shortcut past the puzzle: without the latch the counters keep the player's own values.
const unlatched = { statue: 2, 'ruins-left': 2, 'ruins-right': 1 };
ruinsNormalizeCounters({}, unlatched);
assert.deepEqual(unlatched, { statue: 2, 'ruins-left': 2, 'ruins-right': 1, practice: RUINS_ENTRY_COUNTERS.practice },
  'an unlatched save keeps its own (unsolved) configuration');
assert.equal(deriveRuinsPuzzleState({
  lanternPlaced: true, lanternOn: true, statue: unlatched.statue,
  leftMirror: unlatched['ruins-left'], rightMirror: unlatched['ruins-right'],
}).confirmReady, false, 'an unlatched save still has to be solved at the altar');
// A fresh save lands on the entry values: nothing is pre-solved and nothing is pre-shadowed.
const fresh = {};
ruinsNormalizeCounters({}, fresh);
assert.deepEqual(fresh, {
  statue: RUINS_ENTRY_COUNTERS.statue, 'ruins-left': RUINS_ENTRY_COUNTERS.leftMirror,
  'ruins-right': RUINS_ENTRY_COUNTERS.rightMirror, practice: RUINS_ENTRY_COUNTERS.practice,
});
assert.equal(deriveRuinsPracticeState({ practiceNotch: fresh.practice, lanternOn: true }).slabShadowed, false,
  'a fresh save starts with the practice slab lit, so the lesson still has something to teach');
assert.equal(deriveRuinsPuzzleState({
  lanternPlaced: true, lanternOn: true, statue: fresh.statue,
  leftMirror: fresh['ruins-left'], rightMirror: fresh['ruins-right'],
}).confirmReady, false, 'a fresh save starts unsolved');

/* -------------------------------------------------------------------------- */
/* 12. the drawn shadow overlay is the tested shadow region                    */
/* -------------------------------------------------------------------------- */

const SPRITES = new URL('../assets/levels/08-ruins-of-two-halves/sprites/', import.meta.url);

/** Minimal 8-bit PNG reader: alpha per pixel, so the drawn mask can be compared to the quad. */
const readAlphaMask = (file, threshold = 8) => {
  const buffer = readFileSync(file);
  let offset = 8;
  let width = 0; let height = 0; let bitDepth = 0; let colorType = 0; let interlace = 0;
  let palette = null; let transparency = null;
  const chunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const name = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (name === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (name === 'IDAT') chunks.push(data);
    else if (name === 'PLTE') palette = data;
    else if (name === 'tRNS') transparency = data;
    else if (name === 'IEND') break;
    offset += 12 + length;
  }
  assert.equal(bitDepth, 8, `${file} is an 8-bit PNG`);
  assert.equal(interlace, 0, `${file} is not interlaced`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  assert.ok(channels, `${file} has a readable colour type (${colorType})`);
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor]; cursor += 1;
    const line = raw.subarray(cursor, cursor + stride); cursor += stride;
    const previous = y === 0 ? null : out.subarray((y - 1) * stride, y * stride);
    const current = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? current[x - channels] : 0;
      const b = previous ? previous[x] : 0;
      const c = previous && x >= channels ? previous[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value = (value + a) & 255;
      else if (filter === 2) value = (value + b) & 255;
      else if (filter === 3) value = (value + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        value = (value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      current[x] = value;
    }
  }
  const alphaAt = (x, y) => {
    const i = y * stride + x * channels;
    if (colorType === 6) return out[i + 3];
    if (colorType === 4) return out[i + 1];
    if (colorType === 3) return transparency && transparency[out[i]] !== undefined ? transparency[out[i]] : 255;
    if (colorType === 0) return transparency && out[i] === 0 ? 0 : 255;
    return 255;
  };
  const rowSpans = [];
  let minX = Infinity; let minY = Infinity; let maxX = -1; let maxY = -1; let count = 0;
  for (let y = 0; y < height; y += 1) {
    let first = -1; let last = -1;
    for (let x = 0; x < width; x += 1) {
      if (alphaAt(x, y) > threshold) {
        count += 1;
        if (first < 0) first = x;
        last = x;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    rowSpans.push([first, last]);
  }
  return { width, height, alphaAt, rowSpans, minX, minY, maxX, maxY, count, palette };
};

const quadEdgeAt = (quad, y) => {
  const [tl, tr, br, bl] = quad.points;
  const t = (y - tl.y) / (bl.y - tl.y);
  return [tl.x + (bl.x - tl.x) * t, tr.x + (br.x - tr.x) * t];
};

for (const [notch, quad] of RUINS_SHADOW_QUADS.entries()) {
  const mask = readAlphaMask(new URL(`shadow-notch-${notch}.png`, SPRITES));
  assert.equal(mask.width, 640, `shadow-notch-${notch} is a full 640px-wide overlay`);
  assert.equal(mask.height, 360, `shadow-notch-${notch} is a full 360px-tall overlay`);
  // The authored quad is the drawn mask, not an approximation of it.
  const quadBox = {
    minX: Math.min(...quad.points.map((point) => point.x)),
    minY: Math.min(...quad.points.map((point) => point.y)),
    maxX: Math.max(...quad.points.map((point) => point.x)),
    maxY: Math.max(...quad.points.map((point) => point.y)),
  };
  assert.deepEqual(
    { minX: mask.minX, minY: mask.minY, maxX: mask.maxX, maxY: mask.maxY },
    quadBox,
    `notch ${notch}: the shadow quad is the drawn overlay's bounding box`,
  );
  for (let y = mask.minY; y <= mask.maxY; y += 1) {
    const [left, right] = quadEdgeAt(quad, y);
    const [drawnLeft, drawnRight] = mask.rowSpans[y];
    assert.ok(Math.abs(drawnLeft - left) <= 1.5, `notch ${notch}: row ${y} left edge ${drawnLeft} matches the quad ${left.toFixed(1)}`);
    assert.ok(Math.abs(drawnRight - right) <= 1.5, `notch ${notch}: row ${y} right edge ${drawnRight} matches the quad ${right.toFixed(1)}`);
  }
  // The overlay must actually darken the receivers rather than be a transparent decal.
  const centroid = quad.points.reduce((acc, point) => ({ x: acc.x + point.x / 4, y: acc.y + point.y / 4 }), { x: 0, y: 0 });
  const probe = mask.alphaAt(Math.round(centroid.x), Math.round(centroid.y));
  assert.ok(probe > 128, `notch ${notch}: the drawn shadow is opaque (alpha ${probe} at its centre)`);
}

// Only the solving orientation paints the middle Moon eye, and it paints neither outer Sun eye.
const solutionMask = readAlphaMask(new URL(`shadow-notch-${RUINS_STATUE_SOLUTION}.png`, SPRITES));
const maskCoversRect = (mask, rect) => {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) if (mask.alphaAt(x, y) <= 8) return false;
  }
  return true;
};
const maskTouchesRect = (mask, rect) => {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) if (mask.alphaAt(x, y) > 8) return true;
  }
  return false;
};
assert.equal(maskCoversRect(solutionMask, RUINS_RECEIVERS.moon), true,
  'the solving shadow paints the whole middle Moon receiver');
assert.equal(maskTouchesRect(solutionMask, RUINS_RECEIVERS.left), false,
  'the solving shadow never paints the outer left Sun receiver');
assert.equal(maskTouchesRect(solutionMask, RUINS_RECEIVERS.right), false,
  'the solving shadow never paints the outer right Sun receiver');
for (const notch of [1, 2, 3]) {
  const mask = readAlphaMask(new URL(`shadow-notch-${notch}.png`, SPRITES));
  assert.equal(maskCoversRect(mask, RUINS_RECEIVERS.moon), false, `notch ${notch} leaves the Moon receiver lit`);
}
// The overlay sits above the receivers and the beams and below every standing prop, so the shadow
// genuinely darkens what it covers and the statue never hides its own shadow's contact edge.
assert.ok(RUINS_RECEIVER_DEPTH < RUINS_SHADOW_OVERLAY.depth, 'the shadow is drawn above the receivers');
assert.ok(RUINS_BEAMS.depth < RUINS_SHADOW_OVERLAY.depth, 'the shadow is drawn above the beams');
for (const prop of Object.values(RUINS_PROPS)) {
  assert.ok(ruinsDepthAt(prop.groundAnchor.y) > RUINS_SHADOW_OVERLAY.depth,
    `${prop.id} is drawn above the shadow overlay`);
}

/* -------------------------------------------------------------------------- */
/* 13. RULE_GAMES §1 — a control only answers from the object's south edge      */
/* -------------------------------------------------------------------------- */

const artBoxes = {};
for (const prop of Object.values(RUINS_PROPS)) {
  artBoxes[prop.stand.id] = {
    x: prop.artCenter.x - prop.artWidth / 2, y: prop.artCenter.y - prop.artHeight / 2,
    width: prop.artWidth, height: prop.artHeight,
  };
}
for (const spot of Object.values(RUINS_SHADOW.spots)) {
  // registered Shadow poses are 48x64 with a bottom-centre pivot on the spot's ground anchor
  artBoxes[spot.stand.id] = {
    x: spot.ground.x - RUINS_SHADOW.art.width / 2, y: spot.ground.y - RUINS_SHADOW.art.height,
    width: RUINS_SHADOW.art.width, height: RUINS_SHADOW.art.height,
  };
}
for (const fixture of RUINS_WALL_FIXTURES) {
  artBoxes[fixture.stand.id] = {
    x: fixture.artCenter.x - fixture.artWidth / 2, y: fixture.artCenter.y - fixture.artHeight / 2,
    width: fixture.artWidth, height: fixture.artHeight,
  };
}

for (const stand of RUINS_STANDS) {
  const art = artBoxes[stand.id];
  const artBottom = art.y + art.height;
  let fromAbove = 0; let fromBeside = 0; let fromSouth = 0;
  const reach = Math.ceil(stand.radius) + 1;
  for (let y = stand.y - reach; y <= stand.y + reach; y += 1) {
    for (let x = stand.x - reach; x <= stand.x + reach; x += 1) {
      if (Math.hypot(x - stand.x, y - stand.y) > stand.radius) continue;
      if (!safe({ x, y })) continue;
      const body = ruinsActorBody({ x, y });
      const overlapsArtX = body.x + body.width > art.x && body.x < art.x + art.width;
      if (body.y + body.height <= artBottom) fromAbove += 1;
      else if (!overlapsArtX) fromBeside += 1;
      else fromSouth += 1;
    }
  }
  assert.ok(fromSouth > 0, `${stand.id}: the control is reachable from its own south edge`);
  assert.equal(fromAbove, 0,
    `${stand.id}: no walkable position above the object's art bottom can reach the trigger (radius ${stand.radius})`);
  assert.equal(fromBeside, 0,
    `${stand.id}: no walkable position beside the object's art span can reach the trigger (radius ${stand.radius})`);
}

/* -------------------------------------------------------------------------- */
/* 14. every solid tracks the art a player can see                             */
/* -------------------------------------------------------------------------- */

const artFiles = {
  statue: 'statue-notch-0.png',
  'mirror-left': null,
  'mirror-right': null,
  'practice-column': 'test-pedestal.png',
  'seedling-bed': 'seedling-curtain-open.png',
};
for (const [id, file] of Object.entries(artFiles)) {
  const prop = RUINS_PROPS[id];
  const solid = getRuinsSolid(id);
  if (!file) {
    // The mirrors are the shared 36x48 cards from `src/assets`; each state is fully opaque.
    const shared = readAlphaMask(new URL(`../src/assets/mirror_${RUINS_MIRROR_SOLUTION[id === 'mirror-left' ? 'left' : 'right']}.png`, import.meta.url));
    assert.equal(shared.width, prop.artWidth, `${id}: shared mirror art width matches the declared art`);
    assert.equal(shared.height, prop.artHeight, `${id}: shared mirror art height matches the declared art`);
    continue;
  }
  const mask = readAlphaMask(new URL(file, SPRITES));
  assert.equal(mask.width, prop.artWidth, `${id}: drawn art width matches the declared art`);
  assert.equal(mask.height, prop.artHeight, `${id}: drawn art height matches the declared art`);
  const artLeft = prop.artCenter.x - prop.artWidth / 2;
  const artTop = prop.artCenter.y - prop.artHeight / 2;
  const overhangTop = solid.y - (artTop + mask.minY);
  const overhangBottom = (artTop + mask.maxY) - (solid.y + solid.height);
  const overhangLeft = solid.x - (artLeft + mask.minX);
  const overhangRight = (artLeft + mask.maxX) - (solid.x + solid.width);
  assert.ok(overhangTop <= 8 && overhangBottom <= 4, `${id}: the solid tracks the art vertically (top ${overhangTop}, bottom ${overhangBottom})`);
  assert.ok(overhangLeft <= 1 && overhangRight <= 1, `${id}: the solid tracks the art horizontally (left ${overhangLeft}, right ${overhangRight})`);
}
// The composite practice column: the pedestal carries the collision while the column art rises out
// of it, and every wide/narrow face still sits inside the composite silhouette the player sees.
for (const notch of [0, 1, 2, 3]) {
  const column = readAlphaMask(new URL(`test-column-notch-${notch}.png`, SPRITES));
  const artLeft = RUINS_PROPS['practice-column'].overlay.artCenter.x - RUINS_PROPS['practice-column'].overlay.artWidth / 2;
  const artTop = RUINS_PROPS['practice-column'].overlay.artCenter.y - RUINS_PROPS['practice-column'].overlay.artHeight / 2;
  const solid = getRuinsSolid('practice-column');
  assert.ok(artLeft + column.minX >= solid.x - 8 && artLeft + column.maxX <= solid.x + solid.width + 8,
    `practice column notch ${notch} stays within the composite base width`);
  assert.ok(artTop + column.maxY >= solid.y, `practice column notch ${notch} reaches down into the solid base`);
}
// Procedurally drawn props have no PNG to measure; their solid must at least stay inside the art box.
for (const id of ['pedestal']) {
  const prop = RUINS_PROPS[id];
  const solid = getRuinsSolid(id);
  const artLeft = prop.artCenter.x - prop.artWidth / 2;
  const artTop = prop.artCenter.y - prop.artHeight / 2;
  assert.ok(solid.x >= artLeft && solid.x + solid.width <= artLeft + prop.artWidth,
    `${id}: the solid is inside the drawn art box horizontally`);
  assert.ok(solid.y >= artTop && solid.y + solid.height <= artTop + prop.artHeight,
    `${id}: the solid is inside the drawn art box vertically`);
}

console.log('Level 08 geometry/state checks passed.');

/* -------------------------------------------------------------------------- */
/* 15. repair T09 — The Shadow's state, spots and walk                         */
/* -------------------------------------------------------------------------- */

assert.equal(ruinsShadowPhase({ latched: false, metShadow: false }), 'guard', 'before the latch he guards the seedlings');
assert.equal(ruinsShadowPhase({ latched: true, metShadow: false }), 'relaxed', 'after the latch the hand comes down');
assert.equal(ruinsShadowPhase({ latched: true, metShadow: true }), 'wait', 'after the talk he waits at the stair');
assert.equal(ruinsShadowPhase({ latched: false, metShadow: true }), 'wait', 'a legacy save that met him never puts him back');
assert.deepEqual(['guard', 'relaxed', 'wait'].map(ruinsShadowPoseFor), ['shielding', 'turn', 'waiting'], 'poses come from the registered Shadow set');
assert.equal(ruinsShadowSpotFor('guard').id, 'guard'); assert.equal(ruinsShadowSpotFor('relaxed').id, 'guard'); assert.equal(ruinsShadowSpotFor('wait').id, 'wait');
const bed = RUINS_PROPS['seedling-bed'];
const guardSpot = RUINS_SHADOW.spots.guard;
assert.ok(Math.hypot(guardSpot.ground.x - (bed.footprint.x + bed.footprint.width), guardSpot.ground.y - (bed.footprint.y + bed.footprint.height)) <= 40, 'the guard spot is right beside the seedling bed');
for (const spot of Object.values(RUINS_SHADOW.spots)) {
  assert.equal(spot.footprint.x + spot.footprint.width / 2, spot.ground.x, `${spot.id}: footprint is centred on the ground anchor`);
  assert.equal(spot.footprint.y + spot.footprint.height, spot.ground.y, `${spot.id}: footprint ends on the ground anchor`);
  assert.equal(safe({ x: spot.stand.x, y: spot.stand.y }), true, `${spot.id}: stand is walkable`);
  const blockers = RUINS_BLOCKERS.filter((blocker) => ruinsRectsOverlap(blocker, spot.footprint) && !['north-wall'].includes(blocker.id));
  assert.deepEqual(blockers.map((b) => b.id), [], `${spot.id}: the Shadow footprint does not sit inside another solid`);
}
// While he stands guard his footprint is solid; every control and the north door stay reachable around it.
const withGuard = (center) => safe(center) && !ruinsRectsOverlap(ruinsActorBody(center), guardSpot.footprint);
const reachAround = (start, target, tolerance = 22) => {
  const queue = [start]; const seen = new Set([`${start.x},${start.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (Math.hypot(point.x - target.x, point.y - target.y) <= tolerance) return true;
    for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
      const next = { x: point.x + dx, y: point.y + dy }; const key = `${next.x},${next.y}`;
      if (seen.has(key) || !withGuard(next)) continue;
      seen.add(key); queue.push(next);
    }
  }
  return false;
};
for (const stand of RUINS_STANDS) assert.equal(reachAround(RUINS_SPAWN, { x: stand.x, y: stand.y }), true, `with the Shadow on guard, ${stand.id} stays reachable`);
// the Shadow walks only across open floor, beside nothing solid, and ends on the waiting spot.
const route = [guardSpot.ground, ...RUINS_SHADOW.path];
for (const point of route) {
  assert.ok(point.x >= RUINS_FLOOR.left && point.x <= RUINS_FLOOR.right && point.y >= RUINS_FLOOR.top && point.y <= RUINS_FLOOR.bottom, `waypoint ${point.x},${point.y} is inside the floor band`);
  const hit = RUINS_BLOCKERS.filter((b) => b.prop && point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height);
  assert.deepEqual(hit.map((b) => b.id), [], `waypoint ${point.x},${point.y} is not inside a standing prop`);
}
assert.deepEqual(route.at(-1), RUINS_SHADOW.spots.wait.ground, 'the walk ends on the waiting spot');
for (let index = 1; index < route.length; index += 1) {
  const a = route[index - 1]; const b = route[index];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = a.x + (b.x - a.x) * t; const y = a.y + (b.y - a.y) * t;
    const inProp = RUINS_BLOCKERS.some((blocker) => blocker.prop && x >= blocker.x && x <= blocker.x + blocker.width && y >= blocker.y && y <= blocker.y + blocker.height);
    assert.equal(inProp, false, `the walk segment ${index} stays out of standing props`);
  }
}
// the waiting spot never blocks the north door: its stand keeps its distance and the door approach stays open.
const door = RUINS_WALL_FIXTURES.find((fixture) => fixture.id === 'north-door');
const withWaiter = (center) => safe(center) && !ruinsRectsOverlap(ruinsActorBody(center), RUINS_SHADOW.spots.wait.footprint);
assert.equal(withWaiter({ x: door.stand.x, y: door.stand.y }), true, 'the north door stand is open while he waits');
// exit refusals name only the next missing step, never the whole solution.
const puzzle = (over) => deriveRuinsPuzzleState({ lanternPlaced: true, lanternOn: true, statue: 0, leftMirror: 1, rightMirror: 0, ...over });
assert.equal(ruinsNextStep(puzzle({ lanternPlaced: false })), 'place');
assert.equal(ruinsNextStep(puzzle({ leftMirror: 3, rightMirror: 2, statue: 1 })), 'suns');
assert.equal(ruinsNextStep(puzzle({ statue: 1 })), 'moon');
assert.equal(ruinsNextStep(puzzle({})), 'confirm');
/* -------------------------------------------------------------------------- */
/* 16. the Shadow's moving footprint, the persisted walk and the restore guard */
/* -------------------------------------------------------------------------- */

// Both spots share one footprint offset and size, so the footprint that follows him is the rect he stands on.
const guardSpotDef = RUINS_SHADOW.spots.guard;
const waitSpotDef = RUINS_SHADOW.spots.wait;
const footprintShape = (spot) => ({
  x: spot.footprint.x - spot.ground.x, y: spot.footprint.y - spot.ground.y,
  width: spot.footprint.width, height: spot.footprint.height,
});
assert.deepEqual(footprintShape(waitSpotDef), footprintShape(guardSpotDef), 'both Shadow spots share one footprint offset and size');
assert.deepEqual(ruinsShadowFootprintAt(guardSpotDef.ground), guardSpotDef.footprint, 'the footprint helper reproduces the guard spot');
assert.deepEqual(ruinsShadowFootprintAt(waitSpotDef.ground), waitSpotDef.footprint, 'the footprint helper reproduces the wait spot');

// The walk as the Shadow actually travels it: the guard spot, then every waypoint, sampled every 4px.
const walkRoute = [guardSpotDef.ground, ...RUINS_SHADOW.path];
const walkSamples = [];
for (let index = 1; index < walkRoute.length; index += 1) {
  const from = walkRoute[index - 1];
  const to = walkRoute[index];
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
  for (let step = 0; step < steps; step += 1) {
    walkSamples.push({ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps });
  }
}
walkSamples.push(walkRoute.at(-1));
assert.ok(walkSamples.length > 60, `the walk is sampled along its whole length (${walkSamples.length} samples)`);

// Every open stand and checkpoint, including the north door stand, that the player must keep reaching.
const openTargets = [...RUINS_STANDS, ...RUINS_CHECKPOINTS.filter((point) => !point.requiresExit)];
/** Every 4px-grid point the foot body reaches from the spawn with `extra` solids added. */
const floodFromSpawn = (extra) => {
  const queue = [{ x: RUINS_SPAWN.x, y: RUINS_SPAWN.y }];
  const seen = new Set([`${RUINS_SPAWN.x},${RUINS_SPAWN.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isRuinsPositionSafe(next, extra)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return queue;
};
for (const ground of walkSamples) {
  const footprint = ruinsShadowFootprintAt(ground);
  const where = `${ground.x.toFixed(1)},${ground.y.toFixed(1)}`;
  // The wait spot stands against the north wall (section 15 makes the same exception), so only that wall is exempt.
  const hits = RUINS_BLOCKERS.filter((blocker) => blocker.id !== 'north-wall' && ruinsRectsOverlap(footprint, blocker));
  assert.deepEqual(hits.map((blocker) => blocker.id), [], `the Shadow at ${where} never overlaps a standing prop or a side wall`);
  const reached = floodFromSpawn([footprint]);
  for (const target of openTargets) {
    assert.equal(reached.some((point) => Math.hypot(point.x - target.x, point.y - target.y) <= 22), true,
      `with the Shadow at ${where}, ${target.id} stays reachable from the spawn`);
  }
}

// The footprint is a real solid. Parked, it yields only to real penetration: a foot body that touches the edge keeps it on.
const yardFootprint = ruinsShadowFootprintAt({ x: 270, y: 142 });
const parked = (footprint, playerBody) => ruinsShadowSolidEnabled({ footprint, playerBody, moving: false, stepPx: 0 });
const walking = (footprint, playerBody, stepPx) => ruinsShadowSolidEnabled({ footprint, playerBody, moving: true, stepPx });
assert.equal(parked(yardFootprint, ruinsActorBody({ x: 270, y: 120 })), false, 'a foot body inside the footprint switches the solid off for that frame');
assert.equal(parked(yardFootprint, ruinsActorBody({ x: 270, y: 126 })), true, 'a foot body that only touches the footprint edge keeps the solid on');
assert.equal(parked(yardFootprint, ruinsActorBody({ x: 270, y: 130 })), true, 'a foot body clear below the footprint keeps the solid on');
for (const ground of walkRoute) {
  const footprint = ruinsShadowFootprintAt(ground);
  assert.equal(parked(footprint, ruinsActorBody({ x: ground.x, y: ground.y - 20 })), false,
    `a player caught under the Shadow at ${ground.x},${ground.y} yields the solid`);
}

// Flush contact is not overlap. The body is at x 40..54, y 10..16; each footprint touches one edge, or is nudged by `nudge` into it.
const solidBody = { x: 40, y: 10, width: 14, height: 6 };
const touching = (side, nudge) => ({
  left: { x: 12 + nudge, y: -5, width: 28, height: 36 },
  right: { x: 54 - nudge, y: -5, width: 28, height: 36 },
  above: { x: 33, y: -26 + nudge, width: 28, height: 36 },
  below: { x: 33, y: 16 - nudge, width: 28, height: 36 },
})[side];
for (const side of ['left', 'right', 'above', 'below']) {
  assert.equal(parked(touching(side, 0), solidBody), true, `exact flush contact on the ${side} edge keeps the parked solid on`);
  assert.equal(parked(touching(side, 1e-12), solidBody), true, `1e-12 float penetration on the ${side} edge is not overlap`);
  assert.equal(parked(touching(side, 1), solidBody), false, `1px real penetration on the ${side} edge switches the parked solid off`);
}
// Moving, the solid yields inside the step margin (stepPx + 1), flush contact included, and holds once the footprint is clear of it.
const gapped = (gap) => ({ x: 40 - gap - 28, y: -5, width: 28, height: 36 });
assert.equal(walking(gapped(1), solidBody, 2), false, 'moving with the footprint 1px from her body (stepPx 2) switches the solid off');
assert.equal(walking(gapped(0), solidBody, 2), false, 'moving with flush contact inside the step margin switches the solid off');
assert.equal(walking(gapped(2.9), solidBody, 2), false, 'moving with the footprint just inside stepPx + 1 switches the solid off');
assert.equal(walking(gapped(3.5), solidBody, 2), true, 'moving with the footprint more than stepPx + 1 clear keeps the solid on');
assert.equal(walking(gapped(10), solidBody, 2), true, 'moving with the footprint 10px from her body keeps the solid on');
// No hysteresis while parked: a solid that was off for a walk comes back on as soon as the footprint is not penetrating.
assert.equal(parked(gapped(1), solidBody), true, 'parked, the solid is on again while she stands 1px away: she cannot walk into a parked Shadow');
assert.equal(RUINS_SHADOW_SOLID_EPS, 0.5, 'the penetration inset is half a pixel per side');

// A saved walk resumes from the waypoint it had reached, and only from one the walk still crosses.
assert.equal(RUINS_SHADOW_WALK_COUNTER, 'l7-shadow-walk-step');
assert.equal(RUINS_SHADOW_WALK_START, -1);
assert.equal(ruinsShadowWalkResume(undefined), null, 'no counter: there is no walk to resume');
assert.deepEqual(ruinsShadowWalkResume(-1), { start: guardSpotDef.ground, next: 0 }, 'no waypoint reached yet: he resumes from the guard spot');
assert.deepEqual(ruinsShadowWalkResume(0), { start: RUINS_SHADOW.path[0], next: 1 }, 'first waypoint reached: he resumes from it');
assert.deepEqual(ruinsShadowWalkResume(1), { start: RUINS_SHADOW.path[1], next: 2 }, 'second waypoint reached: he resumes towards the last one');
assert.equal(ruinsShadowWalkResume(2), null, 'the last waypoint ends the walk, so nothing resumes');
for (const bad of [-2, 3, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(ruinsShadowWalkResume(bad), null, `counter ${bad} resumes nothing`);
}
for (const counter of [-1, 0, 1]) {
  const resume = ruinsShadowWalkResume(counter);
  assert.deepEqual(resume.start, walkRoute[counter + 1], `counter ${counter} starts on the route point it names`);
  assert.ok(resume.next < RUINS_SHADOW.path.length, `counter ${counter} targets a waypoint that exists`);
}

// Restore: a saved centre inside the Shadow's footprint is moved out, and a clear centre is kept as saved.
for (const ground of walkRoute) {
  const footprint = ruinsShadowFootprintAt(ground);
  const saved = { x: ground.x, y: ground.y - 20 };
  assert.equal(isRuinsPositionSafe(saved), true, `a centre inside the Shadow at ${ground.x},${ground.y} is walkable on the static floor`);
  assert.equal(isRuinsPositionSafe(saved, [footprint]), false, `a centre inside the Shadow at ${ground.x},${ground.y} is not walkable with his footprint`);
  const restored = resolveRuinsSpawn(saved, { exitReady: false, extraBlockers: [footprint] });
  assert.equal(isRuinsPositionSafe(restored, [footprint]), true, `restore moves the player out of the Shadow at ${ground.x},${ground.y}`);
  assert.deepEqual(resolveRuinsSpawn(saved, { exitReady: false }), saved, 'without the footprint the same centre is kept (the footprint is what moves it)');
}

console.log('Level 08 Shadow state, spots, walk and exit-guidance checks passed.');

// ---------------------------------------------------------------- H ladder is the scenario text (scenario 08 §6)
// suns and moon are one ladder: the scenario Mức 1-3, verbatim and in order. Shown by the shipped showHint().
{
  const md = readFileSync(new URL('../docs/scenario/08-ruins-of-two-halves.md', import.meta.url), 'utf8');
  const hits = [...md.matchAll(/^- \*\*Mức (\d)[^\n]*?\*\*:?\s*“([^”\n]+)”/gmu)].slice(0, 3);
  assert.deepEqual(hits.map((m) => Number(m[1])), [1, 2, 3], 'scenario 08 lists Mức 1, 2, 3 in order');
  const MUC = hits.map((m) => m[2].normalize('NFC'));

  const levelText = readFileSync(new URL('../src/levels/RuinsOfTwoHalvesLevel.ts', import.meta.url), 'utf8');
  const sourceFile = ts.createSourceFile('RuinsOfTwoHalvesLevel.ts', levelText, ts.ScriptTarget.Latest, true);
  const COMPILER = { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } };
  const find = (predicate) => {
    let found;
    const visit = (node) => { if (found) return; if (predicate(node)) { found = node; return; } ts.forEachChild(node, visit); };
    visit(sourceFile);
    return found;
  };
  const ladderSource = ['MAIN_LADDER', 'HINT_LADDER'].map((name) => {
    const declaration = find((node) => ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === name);
    assert.ok(declaration?.initializer, `the Ruins level still authors ${name}`);
    return ts.transpileModule(`const ${name} = ${declaration.initializer.getText(sourceFile)};`, COMPILER).outputText;
  }).join('\n');
  const { HINT_LADDER } = new Function(`"use strict";\n${ladderSource}\nreturn { HINT_LADDER };`)();
  const method = find((node) => ts.isMethodDeclaration(node) && node.name.getText(sourceFile) === 'showHint');
  assert.ok(method?.body, 'the Ruins level still authors showHint()');
  const showHintJs = ts.transpileModule(`const __unit = function () ${method.body.getText(sourceFile)};`, COMPILER).outputText;
  const showHint = new Function('HINT_LADDER', 'tr', `"use strict";\n${showHintJs}\nreturn __unit;`)(HINT_LADDER, (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text));

  const ALL_MET = { lightActive: true, leftAimed: true, rightAimed: true, moonCovered: true };
  const presses = (stages, puzzle = ALL_MET) => {
    const level = {
      stage: '', puzzle, hintStage: '', hintIndex: 0, spoken: [],
      getStage() { return this.stage; }, getPuzzleState() { return this.puzzle; },
      say(lines) { this.spoken.push(lines[0].text); },
    };
    for (const stage of stages) { level.stage = stage; showHint.call(level); }
    return level.spoken;
  };
  assert.deepEqual(presses(['suns', 'suns', 'moon', 'moon']), [MUC[0], MUC[1], MUC[2], MUC[2]], 'suns then moon: Mức 1, 2, 3 verbatim, then holds Mức 3');
  assert.deepEqual(presses(['suns', 'moon', 'moon']), [MUC[0], MUC[1], MUC[2]], 'the moon step continues the suns ladder');
  const missingLeft = { ...ALL_MET, leftAimed: false };
  const named = presses(['suns', 'suns'], missingLeft);
  assert.equal(named[0], MUC[0], 'the first press is verbatim Mức 1');
  assert.ok(named[1].startsWith(`${MUC[1]} Còn thiếu:`), 'a later press keeps Mức 2 and names the missing condition');
}

console.log('Level 08 H ladder checks passed (suns and moon share the scenario Mức 1-3, verbatim and in order).');
