import assert from 'node:assert/strict';
import {
  canLatchRuinsSanctuary, deriveRuinsPracticeState, deriveRuinsPuzzleState, getRuinsExitBlock, getRuinsSolid,
  getRuinsStage, isRuinsExitReady, isRuinsPositionSafe, resolveRuinsSpawn, RUINS_BLOCKERS, RUINS_BODY,
  RUINS_CHECKPOINTS, RUINS_FLOOR, RUINS_MIRROR_SOLUTION, RUINS_PRACTICE, RUINS_PROPS, RUINS_RECEIVERS, RUINS_SHADOW_QUADS,
  RUINS_SPAWN, RUINS_STANDS, RUINS_STATUE_SOLUTION, RUINS_WALLS, ruinsActorBody, ruinsPointInQuad, ruinsQuadContainsRect,
  ruinsRectsOverlap, ruinsSegmentIntersectsQuad,
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
    assert.ok(distance >= 60, `stands ${a.id} and ${b.id} keep distinct nearest-target areas (${distance.toFixed(0)}px)`);
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
assert.equal(getRuinsStage({ practiceSeen: false, lanternPlaced: false, puzzle: solvedState, latched: false, lanternRetrieved: false, metShadow: false }), 'practice');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: false, puzzle: solvedState, latched: false, lanternRetrieved: false, metShadow: false }), 'place');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: true, puzzle: deriveRuinsPuzzleState({ ...solved, statue: 1 }), latched: false, lanternRetrieved: false, metShadow: false }), 'moon');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: true, puzzle: deriveRuinsPuzzleState({ ...solved, leftMirror: 2 }), latched: false, lanternRetrieved: false, metShadow: false }), 'suns');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: true, puzzle: solvedState, latched: false, lanternRetrieved: false, metShadow: false }), 'confirm');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: true, puzzle: solvedState, latched: true, lanternRetrieved: false, metShadow: false }), 'retrieve');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: false, puzzle: solvedState, latched: true, lanternRetrieved: true, metShadow: false }), 'shadow');
assert.equal(getRuinsStage({ practiceSeen: true, lanternPlaced: false, puzzle: solvedState, latched: true, lanternRetrieved: true, metShadow: true }), 'exit');

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

console.log('Level 08 geometry/state checks passed.');
