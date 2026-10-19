import assert from 'node:assert/strict';
import * as layout from '../src/data/libraryLayout.ts';

const { LIBRARY_LAYOUT, LIBRARY_SOLID_RECTS, LIBRARY_EXIT_THRESHOLD, isLibraryPositionSafe, libraryActorBody } = layout;

// Every route must keep the 14x6 feet body this far from solids and the exit threshold.
const MARGIN = 3;
// Mirrors INTERACTION_RADIUS_PADDING in src/systems/InteractionSystem.ts.
const INTERACTION_PADDING = 8;
const WIDTH = 640;
const HEIGHT = 360;
const EXIT = { x: 566, y: 286 };
const MAX_MURAL_TO_EXIT = 220;
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Floor and exact collision come from isLibraryPositionSafe; solids and the closed threshold also keep MARGIN px clear. */
function isRoutable(center, exitOpen) {
  if (!isLibraryPositionSafe(center, exitOpen)) return false;
  const body = libraryActorBody(center);
  const grown = { x: body.x - MARGIN, y: body.y - MARGIN, width: body.width + MARGIN * 2, height: body.height + MARGIN * 2 };
  const blockers = exitOpen ? LIBRARY_SOLID_RECTS : [...LIBRARY_SOLID_RECTS, LIBRARY_EXIT_THRESHOLD];
  return blockers.every((rect) => !intersects(grown, rect));
}

/** 1px grid BFS from start; returns the step distance to every reachable centre (-1 when unreachable). */
function distancesFrom(start, exitOpen) {
  const index = (p) => p.y * WIDTH + p.x;
  const dist = new Int32Array(WIDTH * HEIGHT).fill(-1);
  const queue = [start];
  dist[index(start)] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    for (const [dx, dy] of STEPS) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= WIDTH || next.y >= HEIGHT) continue;
      if (dist[index(next)] >= 0 || !isRoutable(next, exitOpen)) continue;
      dist[index(next)] = dist[index(current)] + 1;
      queue.push(next);
    }
  }
  return { at: (point) => dist[index(point)], cells: queue };
}

function run() {
  const entry = LIBRARY_LAYOUT.entry;
  assert.ok(isRoutable(entry, false), 'entry is a routable start point');

  const closed = distancesFrom(entry, false);
  const open = distancesFrom(entry, true);
  const reachableOpen = (point) => open.at(point) >= 0;
  const reachableClosed = (point) => closed.at(point) >= 0;
  const label = (point) => `(${point.x},${point.y})`;

  for (const [index, seat] of LIBRARY_LAYOUT.seatApproaches.entries()) {
    assert.ok(reachableOpen(seat), `seat approach ${index} ${label(seat)} is reachable`);
  }

  LIBRARY_LAYOUT.racks.forEach((rack, index) => {
    const stand = { x: rack.x, y: rack.y + LIBRARY_LAYOUT.rackStandOffset };
    assert.ok(reachableOpen(stand), `rack ${index} standing point ${label(stand)} is reachable`);
  });

  const desk = { x: 66, y: 278 };
  assert.ok(reachableOpen(desk), `book desk standing point ${label(desk)} is reachable`);

  // The inscription plaque (110,78) is read through its interaction at (110,102) with radius 22; its standing point sits west of the rack stand.
  const inscription = { x: 110, y: 102, radius: 22 };
  const plaqueStand = { x: 98, y: 88 };
  assert.ok(reachableOpen(plaqueStand), `plaque standing point ${label(plaqueStand)} is reachable`);
  assert.ok(reachableClosed(plaqueStand), `plaque standing point ${label(plaqueStand)} is reachable before the exit opens`);
  const plaqueReach = Math.hypot(plaqueStand.x - inscription.x, plaqueStand.y - inscription.y);
  assert.ok(plaqueReach <= inscription.radius + INTERACTION_PADDING,
    `plaque standing point is ${plaqueReach.toFixed(1)}px from the inscription, must be within its reach`);

  // The confirm/crystal control is the centre of a nearby standing point: the dais south edge.
  const confirm = LIBRARY_LAYOUT.confirm;
  const confirmReach = confirm.radius + INTERACTION_PADDING;
  const southSeat = LIBRARY_LAYOUT.seatApproaches[2];
  const southReach = 40 + INTERACTION_PADDING;
  const confirmStands = open.cells.filter((cell) => Math.hypot(cell.x - confirm.x, cell.y - confirm.y) <= confirmReach);
  assert.ok(confirmStands.length > 0, `a reachable standing point lies within the confirm radius of ${label(confirm)}`);
  const sharedWithSouthSeat = confirmStands.filter((cell) => Math.hypot(cell.x - southSeat.x, cell.y - southSeat.y) <= southReach);
  assert.equal(sharedWithSouthSeat.length, 0, 'no standing point is inside both the confirm and the South seat reach');

  assert.ok(reachableOpen(LIBRARY_LAYOUT.muralStand), `mural stand ${label(LIBRARY_LAYOUT.muralStand)} is reachable`);

  const fromMural = distancesFrom(LIBRARY_LAYOUT.muralStand, true);
  const exitLength = fromMural.at(EXIT);
  assert.ok(exitLength >= 0, `exit ${label(EXIT)} is reachable from the mural stand with exitOpen=true`);
  assert.ok(exitLength <= MAX_MURAL_TO_EXIT, `mural stand to exit is ${exitLength}px, must be <= ${MAX_MURAL_TO_EXIT}px`);

  assert.equal(reachableClosed(EXIT), false, 'the exit stays gated by the threshold while it is closed');
  assert.ok(reachableClosed(LIBRARY_LAYOUT.muralStand), 'the mural stand is reachable before the exit opens');

  return exitLength;
}

try {
  const exitLength = run();
  console.log(`Level 03 reachability checks passed (mural stand to exit: ${exitLength}px).`);
} catch (error) {
  console.error(`Level 03 reachability checks failed: ${error.message}`);
  process.exit(1);
}
