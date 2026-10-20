/**
 * Foot-to-footprint reach (RULE_GAMES.md §1): pure geometry from src/systems/interactionReach.ts.
 *
 * Run with:  node scripts/check-interaction-reach.mjs
 *
 * The foot body is the 14x6 rect the feet collide with. The object is a 48x48 block at (100,100), so its
 * south edge is y=148 and its west/east edges are x=100 and x=148.
 */
import assert from 'node:assert/strict';
import { isFootInReach, rectGap } from '../src/systems/interactionReach.ts';

const rect = { x: 100, y: 100, width: 48, height: 48 };
const FOOT_W = 14;
const FOOT_H = 6;
const foot = (x, y) => ({ x, y, width: FOOT_W, height: FOOT_H });
const south = { rect };
const any = { rect, face: 'any' };
// Feet centred under the block: x = 100 + 24 - 7.
const CENTRE_X = 117;

function run() {
  // rectGap: 0 when touching or overlapping, Euclidean otherwise.
  assert.equal(rectGap(foot(CENTRE_X, 148), rect), 0, 'feet touching the south edge have zero gap');
  assert.equal(rectGap(foot(CENTRE_X, 120), rect), 0, 'feet overlapping the block have zero gap');
  assert.equal(rectGap({ x: 0, y: 0, width: 10, height: 10 }, { x: 13, y: 14, width: 10, height: 10 }), 5, '3-4-5 corner gap');

  // (a) Feet touching the south edge, centred: in reach. Two px above the edge still counts as in front.
  assert.equal(isFootInReach(foot(CENTRE_X, 148), south), true, '(a) feet on the south edge are in reach');
  assert.equal(isFootInReach(foot(CENTRE_X, 146), south), true, '(a) feet 2px above the edge are still in front');

  // (b) 10px below the edge: in reach; 14px below: out.
  assert.equal(isFootInReach(foot(CENTRE_X, 158), south), true, '(b) feet 10px south are in reach');
  assert.equal(isFootInReach(foot(CENTRE_X, 162), south), false, '(b) feet 14px south are out of reach');

  // (c) Feet north of the block, flush against it: never in reach from the south face.
  assert.equal(isFootInReach(foot(CENTRE_X, 94), south), false, '(c) feet flush on the north face are out');
  assert.equal(isFootInReach(foot(CENTRE_X, 60), south), false, '(c) feet well north are out');

  // (d) Lateral overhang beyond sideMargin (6px): out. Within it: in.
  assert.equal(isFootInReach(foot(154, 148), south), true, '(d) 6px past the east edge is within sideMargin');
  assert.equal(isFootInReach(foot(155, 148), south), false, '(d) 7px past the east edge is out');
  assert.equal(isFootInReach(foot(80, 148), south), true, '(d) 6px past the west edge is within sideMargin');
  assert.equal(isFootInReach(foot(79, 148), south), false, '(d) 7px past the west edge is out');

  // (e) face 'any': north, east and west within maxGap (10px) are in reach; beyond it, out.
  assert.equal(isFootInReach(foot(CENTRE_X, 84), any), true, '(e) 10px north is in reach with face any');
  assert.equal(isFootInReach(foot(CENTRE_X, 80), any), false, '(e) 14px north is out with face any');
  assert.equal(isFootInReach(foot(158, 120), any), true, '(e) 10px east is in reach with face any');
  assert.equal(isFootInReach(foot(162, 120), any), false, '(e) 14px east is out with face any');
  // West: the foot's east edge (x + 14) sits 10px short of the block's west edge at x=100.
  assert.equal(isFootInReach(foot(90 - FOOT_W, 120), any), true, '(e) 10px west is in reach with face any');
  assert.equal(isFootInReach(foot(86 - FOOT_W, 120), any), false, '(e) 14px west is out with face any');

  // Custom maxGap is honoured.
  assert.equal(isFootInReach(foot(CENTRE_X, 158), { rect, maxGap: 4 }), false, 'a 4px maxGap rejects 10px south');
}

try {
  run();
  console.log('Interaction reach checks passed (foot body to footprint: south face, side margin, any-face gap).');
} catch (error) {
  console.error(`Interaction reach checks failed: ${error.message}`);
  process.exit(1);
}
