import assert from 'node:assert/strict';
import {
  auditHeartGaps, auditHeartStands, deriveHeartPuzzle, getHeartElement, getHeartExitBlock, getHeartPrerequisiteFeedback,
  getHeartSolid, HEART_BLOCKERS, HEART_BODY, HEART_CELLS, HEART_CHECKPOINTS, HEART_ELEMENTS, HEART_FLOOR, HEART_MOON_SHADOW,
  HEART_OVERLOAD_CHECKPOINT, HEART_PROPS, HEART_SPAWN, HEART_STATUE_SHADOW, HEART_WORLD, heartActorBody, heartRectsOverlap,
  canExtinguishHeartLantern, isHeartFinalActionAvailable, isHeartPositionSafe, isInsideHeartGate, nearestSafeHeartSpawn, normalizeHeartProgress,
  resolveHeartRestoreState, shouldPersistHeartOverload,
} from '../src/data/heartOfElariaLayout.ts';

/* ------------------------------------------------------------------ body and floor contract */

assert.deepEqual(HEART_BODY, { feetY: 19, x: -7, y: 16, width: 14, height: 6 });
assert.deepEqual(heartActorBody({ x: 100, y: 200 }), { x: 93, y: 216, width: 14, height: 6 });
assert.equal(HEART_WORLD.hudBottom, 58);
assert.equal(HEART_WORLD.statusTop, 320);
assert.deepEqual(HEART_FLOOR, { left: 58, top: 150, right: 584, bottom: 308 });

/* ------------------------------------------------------------------ authored anchors kept */

const anchored = (id, x, y) => {
  const element = getHeartElement(id);
  assert.deepEqual({ x: element.x, y: element.y }, { x, y }, `${id} keeps its authored anchor`);
};
anchored('heart-memory', 158, 192);
anchored('heart-hope', 320, 200);
anchored('heart-balance', 480, 192);

const trunk = HEART_BLOCKERS.find((blocker) => blocker.id === 'heart-tree-trunk');
assert.deepEqual({ x: trunk.x, y: trunk.y, width: trunk.width, height: trunk.height }, { x: 232, y: 150, width: 186, height: 50 },
  'the Mother Tree collider matches the visible trunk and root fan');
assert.equal(isHeartPositionSafe({ x: 320, y: 180 }), false, 'the player can never walk through the Mother Tree trunk');
assert.equal(isHeartPositionSafe({ x: 320, y: 200 }), true, 'the player can stand in front of the trunk base');
assert.equal(isHeartPositionSafe({ x: 320, y: 120 }), false, 'the trunk band is never walkable');
assert.equal(isHeartPositionSafe({ x: 40, y: 240 }), false, 'the west bank is never walkable');
assert.equal(isHeartPositionSafe({ x: 600, y: 240 }), false, 'the east bank is never walkable');
assert.equal(isHeartPositionSafe({ x: 320, y: 330 }), false, 'the status band is never walkable');

// No authored control may sit under the HUD panels.
for (const element of HEART_ELEMENTS) {
  assert.ok(element.y - element.height / 2 >= HEART_WORLD.hudBottom, `${element.id}: art stays below the top HUD`);
  assert.ok(element.y + element.height / 2 <= HEART_WORLD.statusTop + 2, `${element.id}: art stays above the status band`);
}
for (const element of HEART_PROPS) {
  const solid = getHeartSolid(element.id);
  assert.ok(solid.y + solid.height <= HEART_WORLD.statusTop, `${element.id}: its collider stays above the status band`);
}

/* ------------------------------------------------------------------ every stand point reachable */

const standReports = auditHeartStands();
assert.equal(standReports.length, HEART_ELEMENTS.length);
for (const report of standReports) {
  assert.equal(report.reachable, true, `${report.id}: stand point is reachable from the spawn by a collision-aware search`);
  assert.equal(report.canPress, true, `${report.id}: a reachable position exists inside its trigger radius`);
  assert.equal(report.southOfArt, true, `${report.id}: trigger sits at the south edge (prop) or on the socket (cell)`);
  assert.equal(report.blindFromNorth, true, `${report.id}: no reachable position north of the art can hold the prompt open`);
  assert.equal(report.gateOnArt, true, `${report.id}: the interaction cell lies on the visible art`);
}

/* ------------------------------------------------------------------ nearest-target ownership */

for (const element of HEART_ELEMENTS) {
  const press = element.kind === 'prop' ? { x: element.stand.x, y: element.stand.y - 16 } : { x: element.stand.x, y: element.stand.y };
  assert.equal(isHeartPositionSafe(press), true, `${element.id}: its canonical press position is walkable`);
  const owned = HEART_ELEMENTS.filter((other) => {
    if (other.id === element.id) return false;
    if (other.kind === 'cell' && isInsideHeartGate(other.id, press)) return true;
    return Math.hypot(other.stand.x - press.x, other.stand.y - press.y) <= other.radius;
  }).map((other) => ({ id: other.id, distance: Math.hypot(other.stand.x - press.x, other.stand.y - press.y) }));
  const ownDistance = Math.hypot(element.stand.x - press.x, element.stand.y - press.y);
  for (const other of owned) {
    assert.ok(ownDistance < other.distance,
      `${element.id}: at its own press position it must be the nearest enabled control (${other.id} was closer)`);
  }
}

/* ------------------------------------------------------------------ solids block from four sides */

/** Probe pairs: the leading edge of the 14x6 foot body rests exactly on the visible footprint. */
const faceProbes = (rect) => {
  const centerX = rect.x + rect.width / 2;
  const outsideY = rect.y + rect.height / 2 - 19;
  return [
    { name: 'north', outside: { x: centerX, y: rect.y - 22 }, inside: { x: centerX, y: rect.y - 19 } },
    { name: 'south', outside: { x: centerX, y: rect.y + rect.height - 16 }, inside: { x: centerX, y: rect.y + rect.height - 19 } },
    { name: 'west', outside: { x: rect.x - 7, y: outsideY }, inside: { x: rect.x - 4, y: outsideY } },
    { name: 'east', outside: { x: rect.x + rect.width + 7, y: outsideY }, inside: { x: rect.x + rect.width + 4, y: outsideY } },
  ];
};

const insideFloor = (center) => {
  const body = heartActorBody(center);
  return body.x >= HEART_FLOOR.left && body.x + body.width <= HEART_FLOOR.right
    && body.y >= HEART_FLOOR.top && body.y + body.height <= HEART_FLOOR.bottom;
};

const overlappingSolids = (center, ignoreId) => {
  const body = heartActorBody(center);
  const others = [
    ...HEART_BLOCKERS.map((blocker) => ({ id: blocker.id, rect: blocker })),
    ...HEART_PROPS.filter((element) => element.id !== ignoreId && element.solid).map((element) => ({ id: element.id, rect: element.solid })),
  ];
  return others.filter((entry) => heartRectsOverlap(body, entry.rect)).map((entry) => entry.id);
};

for (const element of HEART_PROPS) {
  const solid = getHeartSolid(element.id);
  assert.ok(solid, `${element.id}: standing prop owns a registered solid footprint`);
  const art = { x: element.x - element.width / 2, y: element.y - element.height / 2, width: element.width, height: element.height };
  assert.ok(solid.x >= art.x - 0.6 && solid.x + solid.width <= art.x + art.width + 0.6,
    `${element.id}: the collider stays inside the visible art width`);
  assert.ok(solid.y >= art.y - 0.6 && solid.y + solid.height <= art.y + art.height + 0.6,
    `${element.id}: the collider stays inside the visible art height`);
  for (const probe of faceProbes(solid)) {
    // The foot body can never cross any face of the visible footprint.
    assert.equal(isHeartPositionSafe(probe.inside), false,
      `${element.id}: the foot body can never cross the ${probe.name} face`);
    if (!insideFloor(probe.outside)) continue; // that flank is against the room edge
    if (isHeartPositionSafe(probe.outside)) {
      // A flush stand exists, so the very next step into the prop must be blocked.
      assert.equal(isHeartPositionSafe(probe.inside), false, `${element.id}: ${probe.name} face blocks inward movement`);
    } else {
      // A blocked flank must be explained by another visible solid, never by a phantom collider.
      const blocking = overlappingSolids(probe.outside, element.id);
      assert.ok(blocking.length > 0, `${element.id}: the ${probe.name} flank is blocked by visible geometry (${blocking.join(', ')})`);
    }
  }
  const inside = { x: solid.x + solid.width / 2, y: solid.y + solid.height / 2 - 16 };
  assert.equal(isHeartPositionSafe(inside), false, `${element.id}: standing inside its footprint is impossible`);
}

/* ------------------------------------------------------------------ no accidental corridors */

const gaps = auditHeartGaps();
const narrowGaps = gaps.filter((report) => report.gap > 13 && report.gap < 36);
assert.deepEqual(narrowGaps, [], `no accidental sub-36px corridor between solids: ${JSON.stringify(narrowGaps)}`);
assert.ok(gaps.some((report) => report.gap >= 36), 'deliberate thresholds exist between neighbouring solids');
const southCorridor = gaps.find((report) => report.a === 'heart-south-bank' && report.b === 'heart-g0');
assert.equal(southCorridor?.gap, 48, 'the main east-west corridor in front of the prop line is 48px wide');

/* ------------------------------------------------------------------ floor sockets are rule-2 cells */

assert.equal(isInsideHeartGate('heart-memory', { x: 158, y: 192 }), true, 'standing on the Memory socket opens its prompt');
assert.equal(isInsideHeartGate('heart-memory', { x: 158, y: 240 }), false, 'standing well south of the Memory socket does not');
assert.equal(isInsideHeartGate('heart-hope', { x: 320, y: 200 }), true, 'standing on the Hope socket opens its prompt');
assert.equal(isInsideHeartGate('heart-seal', { x: 320, y: 244 }), true, 'standing on the Hope seal plate opens its prompt');
assert.equal(isInsideHeartGate('heart-seal', { x: 320, y: 210 }), false, 'the seal plate does not answer from the Hope socket');
assert.equal(isInsideHeartGate('heart-confirm', { x: 320, y: 292 }), true, 'standing on the confirmation node opens its prompt');
assert.equal(isInsideHeartGate('heart-confirm', { x: 320, y: 250 }), false, 'the confirmation node is not triggered from the seal plate');
assert.equal(isInsideHeartGate('heart-eye-right', { x: 464, y: 282 }), true, 'standing on the right sun eye opens its prompt');
assert.equal(isInsideHeartGate('heart-moon', { x: 486, y: 282 }), false, 'the Moon pocket does not answer from the right eye cell');
assert.equal(isInsideHeartGate('heart-rule-table', { x: 150, y: 284 }), true, 'standing on the rule mat opens its prompt');
assert.equal(isInsideHeartGate('heart-rule-table', { x: 150, y: 220 }), false, 'the rule mat does not answer from the prop line');

for (let i = 0; i < HEART_CELLS.length; i += 1) {
  for (let j = i + 1; j < HEART_CELLS.length; j += 1) {
    assert.equal(heartRectsOverlap(HEART_CELLS[i].gate, HEART_CELLS[j].gate), false,
      `${HEART_CELLS[i].id} and ${HEART_CELLS[j].id} interaction cells stay disjoint`);
  }
}

/* ------------------------------------------------------------------ live root latch condition */

const baseInput = () => ({
  crystals: { memory: true, hope: true, balance: true },
  lanternPlaced: true,
  lanternOn: true,
  g0: 0,
  memoryMirror: 1,
  balanceMirror: 2,
  statue: HEART_STATUE_SHADOW,
  lumo: { x: 320, y: 244 },
  latched: false,
});

const solved = deriveHeartPuzzle(baseInput());
assert.equal(solved.memory && solved.hope && solved.balance, true, 'the solved configuration holds all three branches');
assert.equal(solved.ready, true, 'the solved configuration is ready to latch');
assert.deepEqual(getHeartPrerequisiteFeedback(solved), [], 'a solved configuration has no unmet prerequisite');
assert.equal(getHeartExitBlock(solved, false), 'latched', 'the ending still requires the explicit central confirmation');
assert.equal(getHeartExitBlock(deriveHeartPuzzle({ ...baseInput(), latched: true }), false), undefined, 'after latching the ending is reachable');

const cases = [
  ['missing crystal', { crystals: { memory: false, hope: true, balance: true } }, 'ba tinh thể'],
  ['lantern not placed', { lanternPlaced: false }, 'đặt đèn đang bật'],
  ['lantern off', { lanternOn: false }, 'đặt đèn đang bật'],
  ['G0 aimed straight at Memory', { g0: 1 }, 'hướng G0 vào lăng kính'],
  ['wrong Memory mirror', { memoryMirror: 0 }, 'gương Ký Ức'],
  ['wrong Balance mirror', { balanceMirror: 0 }, 'gương Cân Bằng'],
  ['statue blocks the left eye', { statue: 1 }, 'mắt nắng trái'],
  ['statue blocks the right eye', { statue: 3 }, 'mắt nắng phải'],
  ['statue does not shadow the Moon core', { statue: 0 }, 'bóng phủ lõi Nguyệt'],
  ['Lumo left the seal', { lumo: { x: 240, y: 280 } }, 'gọi Lumo tới ấn'],
];

for (const [name, override, fragment] of cases) {
  const state = deriveHeartPuzzle({ ...baseInput(), ...override });
  assert.equal(state.ready, false, `${name}: the roots refuse to latch`);
  const feedback = getHeartPrerequisiteFeedback(state);
  assert.ok(feedback.length > 0, `${name}: the refusal names at least one unmet prerequisite`);
  assert.ok(feedback.some((line) => line.includes(fragment)), `${name}: feedback mentions "${fragment}" but was ${JSON.stringify(feedback)}`);
  assert.notEqual(getHeartExitBlock(state, false), undefined, `${name}: the ending stays locked`);
}

assert.equal(deriveHeartPuzzle({ ...baseInput(), lumo: { x: 240, y: 280 } }).hope, false, 'recalling Lumo drops the Hope condition immediately');
assert.equal(deriveHeartPuzzle({ ...baseInput(), lanternOn: false }).light, false, 'an unlit pedestal carries no light at all');
assert.equal(deriveHeartPuzzle({ ...baseInput(), g0: 1 }).balance, false, 'the straight G0 route leaves Balance without light in its eyes');
assert.equal(deriveHeartPuzzle({ ...baseInput(), g0: 1 }).memory, true, 'the straight G0 route still lights the gold branch (scenario trap route)');
assert.equal(deriveHeartPuzzle({ ...baseInput(), statue: 0 }).moonShadow, false, 'statue angle 0 leaves the Moon core lit');

const latchedState = deriveHeartPuzzle({ ...baseInput(), latched: true, lanternPlaced: false, lanternOn: false, lumo: { x: 120, y: 280 }, g0: 1, statue: 0 });
assert.equal(latchedState.memory && latchedState.hope && latchedState.balance, true, 'latched roots self-hold the three branches');

/* ------------------------------------------------------------------ lantern end-state matrix */

const pedestalLit = resolveHeartRestoreState({ roots: true, lanternPlaced: true, lanternRetrieved: false, overload: false, lanternOn: true, complete: false });
assert.deepEqual(pedestalLit, { lanternPlaced: true, lanternInHand: false, lanternOn: true, overloadActive: false, finalActionAvailable: true, spawnKind: 'checkpoint' });
assert.equal(isHeartFinalActionAvailable(deriveHeartPuzzle({ ...baseInput(), latched: true }), { inHand: false, placed: true, on: true }), true,
  'a latched loop lets F extinguish the lantern on the pedestal (already-off path)');
assert.equal(isHeartFinalActionAvailable(deriveHeartPuzzle({ ...baseInput(), latched: false }), { inHand: false, placed: true, on: true }), false,
  'before the loop is latched the pedestal lantern is not a valid final action');

const overloadRestore = resolveHeartRestoreState({ roots: true, lanternPlaced: false, lanternRetrieved: true, overload: true, lanternOn: true, complete: false });
assert.equal(overloadRestore.overloadActive, true, 'a saved overload is restored as the overload');
assert.equal(overloadRestore.lanternInHand, true, 'the overload always restores the lantern in hand');
assert.equal(overloadRestore.lanternOn, true, 'the overload always restores the lantern lit');
assert.equal(overloadRestore.finalActionAvailable, true, 'F is available immediately after an overload reload');
assert.equal(overloadRestore.spawnKind, 'overload', 'the overload reload uses the named safe pedestal bank');
assert.equal(isHeartPositionSafe(HEART_OVERLOAD_CHECKPOINT), true, 'the overload reload bank is genuine walkable floor');

const alreadyOff = resolveHeartRestoreState({ roots: true, lanternPlaced: true, lanternRetrieved: false, overload: true, lanternOn: false, complete: false });
assert.equal(alreadyOff.overloadActive, false, 'an unlit lantern never fabricates an overload');
assert.equal(alreadyOff.finalActionAvailable, true, 'the already-off path is still a valid final action');
assert.equal(alreadyOff.lanternPlaced, true, 'the already-off lantern is still resting on the pedestal');
assert.equal(alreadyOff.lanternOn, false, 'the already-off path does not force the lantern back on');
assert.equal(isHeartFinalActionAvailable(deriveHeartPuzzle({ ...baseInput(), latched: true }), { inHand: false, placed: true, on: false }), true,
  'an unlit pedestal lantern keeps the ending completable (collecting it is the final action)');
assert.equal(canExtinguishHeartLantern(deriveHeartPuzzle({ ...baseInput(), latched: true }), { inHand: true, placed: false, on: false }), false,
  'F is not offered when the lantern is already dark');

const completed = resolveHeartRestoreState({ roots: true, lanternPlaced: false, lanternRetrieved: true, overload: true, lanternOn: false, complete: true });
assert.equal(completed.overloadActive, false, 'a completed campaign never restores an overload stage');
assert.equal(getHeartExitBlock(deriveHeartPuzzle({ ...baseInput(), latched: true }), true), undefined, 'a completed campaign is never blocked from the ending');

/* ------------------------------------------------------------------ save round-trip safety */

const saveCases = [
  { 'l9-roots': true, 'l9-overload': true, 'l9-lantern-retrieved': true, 'l9-lantern-placed': false, 'l9-complete': false },
  { 'l9-roots': true, 'l9-overload': true, 'l9-lantern-retrieved': true, 'l9-complete': true },
  { 'l9-roots': true, 'l9-overload': true, 'l9-lantern-placed': true, 'l9-lantern-retrieved': false },
  { 'l9-overload': true },
  { 'l9-roots': true, 'l9-lantern-placed': true, 'l9-lantern-retrieved': false, 'l9-at-heart': true },
];
for (const flags of saveCases) {
  normalizeHeartProgress(flags);
  const once = JSON.parse(JSON.stringify(flags));
  normalizeHeartProgress(once);
  assert.deepEqual(once, flags, 'normalisation is idempotent');
  assert.equal(flags['l9-overload'] === true && flags['l9-lantern-retrieved'] !== true, false,
    'a stuck finale_overload stage is never persisted');
  const restore = resolveHeartRestoreState({
    roots: flags['l9-roots'] === true,
    lanternPlaced: flags['l9-lantern-placed'] === true,
    lanternRetrieved: flags['l9-lantern-retrieved'] === true,
    overload: flags['l9-overload'] === true,
    lanternOn: true,
    complete: flags['l9-complete'] === true,
  });
  if (restore.overloadActive) {
    assert.equal(restore.lanternInHand && restore.lanternOn && restore.finalActionAvailable, true, 'an overload reload is always finishable');
  }
}
for (let mask = 0; mask < 32; mask += 1) {
  const flags = {
    'l9-roots': (mask & 1) > 0,
    'l9-lantern-placed': (mask & 2) > 0,
    'l9-lantern-retrieved': (mask & 4) > 0,
    'l9-overload': (mask & 8) > 0,
    'l9-complete': (mask & 16) > 0,
  };
  normalizeHeartProgress(flags);
  const restore = resolveHeartRestoreState({
    roots: flags['l9-roots'] === true,
    lanternPlaced: flags['l9-lantern-placed'] === true,
    lanternRetrieved: flags['l9-lantern-retrieved'] === true,
    overload: flags['l9-overload'] === true,
    lanternOn: true,
    complete: flags['l9-complete'] === true,
  });
  if (restore.overloadActive) {
    assert.equal(restore.lanternInHand, true, `mask ${mask}: overload restores the lantern in hand`);
    assert.equal(restore.finalActionAvailable, true, `mask ${mask}: overload keeps the final action available`);
  }
  if (flags['l9-roots'] === true && flags['l9-complete'] !== true) {
    const state = deriveHeartPuzzle({ ...baseInput(), latched: true, lanternPlaced: restore.lanternPlaced, lanternOn: restore.lanternOn });
    assert.equal(isHeartFinalActionAvailable(state, { inHand: restore.lanternInHand, placed: restore.lanternPlaced, on: restore.lanternOn }), true,
      `mask ${mask}: a latched loop always keeps a finishable lantern state`);
  }
}
assert.equal(shouldPersistHeartOverload('finale_overload'), 'hub_final', 'the v1 final-overload write-back is preserved');
assert.equal(shouldPersistHeartOverload('hub_final'), 'hub_final');
assert.equal(shouldPersistHeartOverload('creek'), 'creek');

/* ------------------------------------------------------------------ safe reload positions */

assert.deepEqual(nearestSafeHeartSpawn({ x: 250, y: 284 }), { x: 250, y: 284 }, 'a safe saved position is kept');
for (const bad of [{ x: 85, y: 250 }, { x: 0, y: 0 }, { x: 320, y: 120 }, { x: 620, y: 350 }, { x: 416, y: 250 }]) {
  const spawn = nearestSafeHeartSpawn(bad);
  assert.equal(isHeartPositionSafe(spawn), true, `a saved position at ${bad.x},${bad.y} restores to a clear checkpoint`);
}
assert.deepEqual(nearestSafeHeartSpawn(undefined), { ...HEART_SPAWN }, 'a fresh save spawns on the south path');
for (const checkpoint of HEART_CHECKPOINTS) {
  assert.equal(isHeartPositionSafe(checkpoint.point), true, `checkpoint ${checkpoint.id} is clear floor`);
  assert.equal(getHeartPrerequisiteFeedback(deriveHeartPuzzle(baseInput())).length, 0);
}

/* ------------------------------------------------------------------ moon pocket shadow reach */

assert.ok(Math.abs(HEART_MOON_SHADOW.x - 416) <= 1, 'the statue shadow is centred on the Moon pocket column');
assert.ok(HEART_MOON_SHADOW.radiusX >= 20, 'the statue shadow is wide enough to read over the Moon pocket');

console.log(`Level 10 geometry/state checks passed (${HEART_ELEMENTS.length} controls, ${HEART_PROPS.length} solids, ${HEART_BLOCKERS.length} scenery blockers).`);
