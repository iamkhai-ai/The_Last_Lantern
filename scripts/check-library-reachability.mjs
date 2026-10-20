import assert from 'node:assert/strict';
import * as layout from '../src/data/libraryLayout.ts';
import { layoutInteractionPrompt } from '../src/systems/interactionPromptLayout.ts';

const {
  LIBRARY_LAYOUT, LIBRARY_SOLID_RECTS, LIBRARY_EXIT_THRESHOLD, LIBRARY_INSCRIPTION_SOLID,
  isLibraryPositionSafe, libraryActorBody, resolveLibrarySpawn,
} = layout;

// Every route must keep the 14x6 feet body this far from solids and the exit threshold.
const MARGIN = 3;
// Mirrors INTERACTION_RADIUS_PADDING in src/systems/InteractionSystem.ts.
const INTERACTION_PADDING = 8;
const WIDTH = 640;
const HEIGHT = 360;
// The doorway interior of the north-wall arch: 16px above the closed threshold, so the player's feet
// clear it. Only the open gate makes this point routable.
const EXIT = { x: LIBRARY_LAYOUT.exit.x, y: LIBRARY_EXIT_THRESHOLD.y + LIBRARY_EXIT_THRESHOLD.height - 16 };
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

  // The inscription is a free-standing tablet beside the entry path: its south stand is the spawn prompt.
  const inscription = LIBRARY_LAYOUT.inscription;
  const inscriptionStand = { x: inscription.x, y: inscription.y };
  assert.ok(reachableOpen(inscriptionStand), `inscription standing point ${label(inscriptionStand)} is reachable`);
  assert.ok(reachableClosed(inscriptionStand), `inscription standing point ${label(inscriptionStand)} is reachable before the exit opens`);
  const entryReach = Math.hypot(inscriptionStand.x - entry.x, inscriptionStand.y - entry.y);
  assert.ok(entryReach <= 20, `inscription stand is ${entryReach.toFixed(1)}px from the entry, must be within 20px`);
  assert.ok(entryReach <= inscription.radius + INTERACTION_PADDING,
    `inscription stand is ${entryReach.toFixed(1)}px from the entry, must be within its ${inscription.radius + INTERACTION_PADDING}px reach`);
  // C3 geometry: the stone stands at (232..240, 268..272) with the stand directly south of it (Rule 1).
  assert.ok(inscription.x >= 232 && inscription.x <= 240, `the tablet base x is ${inscription.x}, must sit in 232..240`);
  assert.ok(inscription.baseY >= 268 && inscription.baseY <= 272, `the tablet base y is ${inscription.baseY}, must sit in 268..272`);
  assert.equal(inscriptionStand.x, inscription.x, 'the inscription stand is directly south of the stone');
  assert.ok(inscriptionStand.y > inscription.baseY, 'the inscription stand is south of the stone base');
  assert.ok(inscriptionStand.y - inscription.baseY <= 14,
    `the inscription stand is ${inscriptionStand.y - inscription.baseY}px south of the base, must stay within 14px`);

  // Small solid footprint: 20x10, centred on the tablet with its south edge on the base.
  const tabletSolid = LIBRARY_INSCRIPTION_SOLID;
  assert.equal(tabletSolid.width, 20, 'the inscription footprint is 20px wide');
  assert.equal(tabletSolid.height, 10, 'the inscription footprint is 10px deep');
  assert.equal(tabletSolid.y + tabletSolid.height, inscription.baseY, 'the inscription footprint ends on the tablet base');
  assert.equal(tabletSolid.x + tabletSolid.width / 2, inscription.x, 'the inscription footprint is centred on the tablet');

  // The read label anchors to the stone's image bounds and must land above it: the rack art boxes to
  // the west would otherwise push it out over the well (the shipped 1px layout system).
  const tabletBounds = {
    x: inscription.x - inscription.width / 2,
    y: inscription.baseY - inscription.height,
    width: inscription.width,
    height: inscription.height,
  };
  const actorBounds = { x: entry.x - 18, y: entry.y - 21, width: 36, height: 42 };
  const rackBoxes = LIBRARY_LAYOUT.racks.map((rack) => ({
    x: rack.x - LIBRARY_LAYOUT.art.rack / 2, y: rack.y - LIBRARY_LAYOUT.art.rack / 2,
    width: LIBRARY_LAYOUT.art.rack, height: LIBRARY_LAYOUT.art.rack,
  }));
  for (const promptWidth of [68, 111, 130]) {
    const placed = layoutInteractionPrompt(tabletBounds, actorBounds, promptWidth, 24,
      { width: WIDTH, height: HEIGHT }, rackBoxes);
    assert.ok(placed.y + placed.height <= tabletBounds.y,
      `the read label (width ${promptWidth}) sits above the stone: prompt bottom ${placed.y + placed.height}, stone top ${tabletBounds.y}`);
    assert.equal(placed.x + placed.width / 2, inscription.x, `the read label (width ${promptWidth}) stays centred on the stone`);
  }

  // Rule 1 neighbours: the tablet must not steal the Leaf rack prompt or the South seat approach.
  const leafRack = LIBRARY_LAYOUT.racks[3];
  const leafStand = { x: leafRack.x, y: leafRack.y + LIBRARY_LAYOUT.rackStandOffset };
  assert.ok(Math.hypot(inscriptionStand.x - leafStand.x, inscriptionStand.y - leafStand.y) > 22 + INTERACTION_PADDING,
    'the inscription stand is outside the Leaf rack prompt reach');
  assert.ok(Math.hypot(entry.x - leafStand.x, entry.y - leafStand.y) > 22 + INTERACTION_PADDING,
    'the spawn point stays outside the Leaf rack prompt reach');
  const southSeatApproach = LIBRARY_LAYOUT.seatApproaches[2];
  assert.ok(Math.hypot(inscriptionStand.x - southSeatApproach.x, inscriptionStand.y - southSeatApproach.y) > 40 + INTERACTION_PADDING,
    'the inscription stand is outside the South seat approach');

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

  // North-wall gate, built like the Level 02 arch: posts flank the threshold, the backing fills the
  // wall above it, and the whole arch stays clear of the mural panel.
  const exit = LIBRARY_LAYOUT.exit;
  const threshold = LIBRARY_EXIT_THRESHOLD;
  const archLeft = exit.x - exit.width / 2;
  const archRight = exit.x + exit.width / 2;
  assert.ok(exit.x >= 576 && exit.x <= 584, `arch centre x is ${exit.x}, must sit in 576..584`);
  assert.ok(exit.width >= 96 && exit.width <= 104, `arch width is ${exit.width}, must sit in 96..104`);
  assert.ok(exit.anchorY >= 170 && exit.anchorY <= 180, `arch base is ${exit.anchorY}, must sit in 170..180`);
  assert.equal(threshold.x + threshold.width / 2, exit.x, 'the threshold is centred in the arch opening');
  assert.equal(threshold.y + threshold.height, exit.anchorY - 12, 'the threshold sits just above the post bottoms');
  const posts = LIBRARY_SOLID_RECTS
    .filter((rect) => rect.y === threshold.y && rect.height === exit.anchorY - threshold.y)
    .sort((a, b) => a.x - b.x);
  assert.equal(posts.length, 2, 'two post footprints flank the threshold');
  assert.equal(posts[0].x, archLeft, 'the left post starts at the arch edge');
  assert.equal(posts[0].x + posts[0].width, threshold.x, 'the left post ends where the threshold starts');
  assert.equal(posts[1].x, threshold.x + threshold.width, 'the right post starts where the threshold ends');
  assert.equal(posts[1].x + posts[1].width, archRight, 'the right post ends at the arch edge');
  const backing = LIBRARY_SOLID_RECTS.find((rect) => rect.y === LIBRARY_LAYOUT.floor.top && rect.width === exit.width);
  assert.ok(backing, 'the arch backing sits against the north wall');
  assert.equal(backing.x, archLeft, 'the backing spans the arch width');
  assert.equal(backing.y + backing.height, threshold.y, 'the backing fills the arch above the doorway');
  // The panel moved 12px west; the arch's left column is transparent there but must not overlap the art box.
  const muralArt = {
    x: LIBRARY_LAYOUT.mural.x - LIBRARY_LAYOUT.art.panelWidth / 2,
    y: LIBRARY_LAYOUT.mural.y - LIBRARY_LAYOUT.art.panelHeight / 2,
    width: LIBRARY_LAYOUT.art.panelWidth,
    height: LIBRARY_LAYOUT.art.panelHeight,
  };
  const archBox = { x: archLeft, y: backing.y, width: exit.width, height: exit.anchorY - backing.y };
  assert.equal(intersects(muralArt, archBox), false, 'the mural panel art box stays clear of the whole arch');
  // No leftover solids from the old south-wall gate.
  for (const rect of LIBRARY_SOLID_RECTS) {
    assert.ok(rect.y + rect.height <= LIBRARY_LAYOUT.floor.bottom, 'every solid stays inside the floor');
  }
  assert.ok(!LIBRARY_SOLID_RECTS.some((rect) => rect.x >= 500 && rect.y >= LIBRARY_LAYOUT.floor.bottom - 30),
    'the old south-east gate posts are gone');

  // The gate now sits on the north wall: only its doorway interior is gated by the closed threshold,
  // and the E stand on the south side of the opening is reachable before and after it opens.
  const exitApproach = { x: exit.x, y: exit.y };
  assert.ok(reachableClosed(exitApproach), `the exit approach stand ${label(exitApproach)} is reachable while the gate is shut`);
  assert.ok(reachableOpen(exitApproach), `the exit approach stand ${label(exitApproach)} stays reachable once the gate opens`);
  const exitReach = exit.radius + INTERACTION_PADDING;
  // Rule 1/3: the prompt is a doorway-approach trigger, like the Level 02 gate (stand 8px above its
  // post base, radius 24). It covers the stand and the line where the shut threshold stops the player.
  assert.equal(exit.radius, 24, 'the gate prompt keeps the Level 02 exit radius');
  assert.ok(Math.hypot(EXIT.x - exitApproach.x, EXIT.y - exitApproach.y) <= exitReach,
    `the shut threshold stop ${label(EXIT)} keeps the exit prompt (reach ${exitReach}px)`);
  assert.ok(exitReach >= 20, `the gate reach ${exitReach}px covers the doorway approach`);
  assert.ok(exitReach <= 32, `the gate reach ${exitReach}px stays a small doorway trigger, not a room-wide one`);

  const fromMural = distancesFrom(LIBRARY_LAYOUT.muralStand, true);
  const exitLength = fromMural.at(EXIT);
  assert.ok(exitLength >= 0, `exit ${label(EXIT)} is reachable from the mural stand with exitOpen=true`);
  assert.ok(exitLength <= MAX_MURAL_TO_EXIT, `mural stand to exit is ${exitLength}px, must be <= ${MAX_MURAL_TO_EXIT}px`);

  assert.equal(reachableClosed(EXIT), false, 'the exit stays gated by the threshold while it is closed');
  assert.ok(reachableClosed(LIBRARY_LAYOUT.muralStand), 'the mural stand is reachable before the exit opens');

  // A save inside the new arch solids must resolve to a safe checkpoint (never leave the player stuck).
  const insideThreshold = { x: exit.x, y: threshold.y + 4 };
  assert.equal(isLibraryPositionSafe(insideThreshold, false), false, 'a position inside the shut threshold is unsafe');
  assert.equal(isLibraryPositionSafe(insideThreshold, true), true, 'the open threshold stops blocking the doorway');
  for (const exitOpen of [false, true]) {
    const spawn = resolveLibrarySpawn(insideThreshold, exitOpen);
    assert.ok(isLibraryPositionSafe(spawn, exitOpen), `resolveLibrarySpawn(${exitOpen}) falls back to a safe point`);
  }
  const insideBacking = { x: exit.x, y: LIBRARY_LAYOUT.floor.top + 20 };
  assert.equal(isLibraryPositionSafe(insideBacking, true), false, 'a position inside the arch backing is unsafe even when open');
  assert.ok(isLibraryPositionSafe(resolveLibrarySpawn(insideBacking, true), true),
    'a save inside the arch backing resolves to a safe point');

  return exitLength;
}

try {
  const exitLength = run();
  console.log(`Level 03 reachability checks passed (mural stand to exit: ${exitLength}px).`);
} catch (error) {
  console.error(`Level 03 reachability checks failed: ${error.message}`);
  process.exit(1);
}
