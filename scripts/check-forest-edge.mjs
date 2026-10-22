import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canChargeForestEdgeReceiver,
  canUseForestEdgePulse,
  feetAt,
  FOREST_EDGE,
  isForestEdgeCenterWalkable,
  resolveForestEdgeSpawn,
  worldDepth,
} from '../src/data/forestEdgeLayout.ts';
import { forestEdgeFootprintRotation, forestEdgeGuideTarget } from '../src/data/forestEdgeGuidance.ts';

const campaignScene = readFileSync(new URL('../src/scenes/CampaignScene.ts', import.meta.url), 'utf8');
const guideMethodStart = campaignScene.indexOf('private updateForestEdgeGuide(');
const guideMethodEnd = campaignScene.indexOf('\n  private buildLevel(', guideMethodStart);
const guideMethod = campaignScene.slice(guideMethodStart, guideMethodEnd);

const close = (a, b) => Math.abs(a - b) < 1e-9;
assert.deepEqual(feetAt({ x: 410, y: 191 }), { x: 410, y: 210 });
assert.equal(FOREST_EDGE.player.body.height, 6, 'runtime footprint uses the authored six-pixel height');
// Keep the opening cluster 72 px west of its old layout; the destination stays put.
assert.deepEqual(FOREST_EDGE.player.spawn, { x: 208, y: 286 }, 'fresh start moves left with the opening path');
assert.deepEqual(FOREST_EDGE.objects.lantern.anchor, { x: 152, y: 238 }, 'lantern moves 72 px left');
assert.deepEqual(FOREST_EDGE.objects.lantern.stand, { x: 152, y: 251 }, 'lantern keeps its south-face interaction: a floor pedestal on the path (RULE_GAMES 2)');
assert.deepEqual(FOREST_EDGE.objects.tablet.anchor, { x: 228, y: 230 }, 'tablet moves 72 px left');
assert.deepEqual(FOREST_EDGE.objects.tablet.stand, { x: 228, y: 222 }, 'tablet answers from 8px around its solid (RULE_GAMES 1)');
assert.deepEqual(FOREST_EDGE.objects.tablet.solid, { x: 214, y: 218, width: 28, height: 12 }, 'tablet collider follows its art');
assert.deepEqual(FOREST_EDGE.checkpoints.start, FOREST_EDGE.player.spawn, 'start checkpoint follows the new spawn');
assert.deepEqual(FOREST_EDGE.checkpoints.tablet, { x: 228, y: 250 }, 'tablet checkpoint moves with the opening cluster');
assert.deepEqual(FOREST_EDGE.objects.ring.ground, { x: 410, y: 210 }, 'standing destination does not move');
assert.deepEqual(FOREST_EDGE.objects.gate.anchor, { x: 486, y: 166 }, 'exit gate does not move');
assert.ok(FOREST_EDGE.objects.ring.ground.x - FOREST_EDGE.objects.tablet.stand.x >= 180,
  'tablet-to-ring horizontal separation leaves the destination outside the main lantern box');
assert.ok(FOREST_EDGE.objects.trail.length >= 6, 'longer approach has enough footprint marks to follow');
assert.ok(FOREST_EDGE.objects.trail[0].x - FOREST_EDGE.objects.tablet.anchor.x <= 35,
  'the first revealed footprints start near the relocated tablet');
for (let i = 1; i < FOREST_EDGE.objects.trail.length; i += 1) {
  const prev = FOREST_EDGE.objects.trail[i - 1];
  const next = FOREST_EDGE.objects.trail[i];
  assert.ok(next.x > prev.x && Math.hypot(next.x - prev.x, next.y - prev.y) <= 35,
    'footprints form a continuous eastbound trail to the unchanged ring');
}
assert.equal(canUseForestEdgePulse(false), false, 'SPACE cannot pulse before the tablet teaches it');
assert.equal(canUseForestEdgePulse(true), true, 'reading the tablet enables Pulse');
assert.equal(forestEdgeGuideTarget('wake'), 'lantern', 'opening points toward the lantern');
assert.equal(forestEdgeGuideTarget('pickup'), 'lantern', 'pickup objective keeps pointing toward the lantern');
assert.equal(forestEdgeGuideTarget('light'), 'tablet', 'after pickup the guide points toward the tablet');
assert.equal(forestEdgeGuideTarget('tablet'), 'tablet', 'tablet objective stays targeted');
assert.equal(forestEdgeGuideTarget('pulse'), null, 'the ring stays untargeted until Pulse discovers it');
assert.equal(forestEdgeGuideTarget('ring'), 'ring', 'the discovered standing objective points toward its ring');
assert.equal(forestEdgeGuideTarget('exit'), null, 'the spatial guide retires when the objective is complete');
assert.ok(guideMethodStart >= 0 && guideMethodEnd > guideMethodStart, 'Level 01 guide update method is present');
assert.doesNotMatch(guideMethod, /strokeEllipse|strokeCircle/, 'the spatial guide draws no ring around the player');
assert.match(guideMethod, /guide\.clear\(\)\.setPosition\(0, 0\)\.setDepth\(72\)/,
  'the direction pointer stays above Level 01 darkness layers');
assert.match(guideMethod, /const bounds = this\.player\.sprite\.getBounds\(\);[\s\S]*const startDistance = actorExit \+ 3;/,
  'the visible pointer starts outside the character frame');
for (const [index, point] of FOREST_EDGE.objects.trail.entries()) {
  const next = FOREST_EDGE.objects.trail[index + 1] ?? FOREST_EDGE.objects.ring.ground;
  assert.ok(close(forestEdgeFootprintRotation(index, FOREST_EDGE.objects.trail, FOREST_EDGE.objects.ring.ground), Math.atan2(next.y - point.y, next.x - point.x) + Math.PI / 2),
    `footprint ${index} points toward its next mark or the ring`);
}
assert.ok(worldDepth(230 - 1) < worldDepth(230));
assert.ok(worldDepth(230 + 1) > worldDepth(230));
assert.equal(isForestEdgeCenterWalkable(FOREST_EDGE.player.spawn, false), true);
assert.equal(isForestEdgeCenterWalkable(FOREST_EDGE.objects.tablet.stand, false), true, 'tablet interaction point must remain south of its base');
assert.equal(isForestEdgeCenterWalkable(FOREST_EDGE.objects.gate.exit, false), true, 'closed gate prompt must be reachable from the south');
assert.equal(isForestEdgeCenterWalkable({ x: 486, y: 127 }, false), false, 'closed threshold blocks the north approach');
assert.equal(isForestEdgeCenterWalkable({ x: 486, y: 130 }, false), true, 'south side remains walkable up to the threshold');
assert.equal(isForestEdgeCenterWalkable({ x: 486, y: 128 }, false), true, 'actual closed-threshold contact remains a valid saved position');
for (const gateOpen of [false, true]) {
  assert.equal(isForestEdgeCenterWalkable({ x: 454, y: 140 }, gateOpen), false, 'left rim inner stone is solid');
  assert.equal(isForestEdgeCenterWalkable({ x: 518, y: 140 }, gateOpen), false, 'right rim inner stone is solid');
  assert.equal(isForestEdgeCenterWalkable({ x: 404, y: 140 }, gateOpen), false, 'left outer pillar approach is solid');
  assert.equal(isForestEdgeCenterWalkable({ x: 568, y: 140 }, gateOpen), false, 'right outer pillar approach is solid');
  assert.equal(isForestEdgeCenterWalkable({ x: 468, y: 140 }, gateOpen), true, 'left side of centered passage remains clear');
  assert.equal(isForestEdgeCenterWalkable({ x: 504, y: 140 }, gateOpen), true, 'right side of centered passage remains clear');
}
assert.equal(isForestEdgeCenterWalkable({ x: 486, y: 110 }, false), false, 'arch backing blocks a saved position behind the closed gate');
assert.equal(isForestEdgeCenterWalkable({ x: 416, y: 109 }, true), false, 'expanded backing blocks walking behind the outer left post');
assert.equal(isForestEdgeCenterWalkable({ x: 556, y: 109 }, true), false, 'expanded backing blocks walking behind the outer right post');
assert.equal(isForestEdgeCenterWalkable({ x: 570, y: 110 }, false), true, 'empty northern forest strip remains walkable beyond the arch backing');
assert.equal(isForestEdgeCenterWalkable({ x: 486, y: 110 }, true), true, 'open passage permits travel to the backing wall');
assert.equal(isForestEdgeCenterWalkable({ x: 486, y: 109 }, true), false, 'arch backing remains a permanent north limit after opening');
assert.equal(isForestEdgeCenterWalkable(FOREST_EDGE.checkpoints.gate, true), true);
assert.equal(isForestEdgeCenterWalkable(FOREST_EDGE.checkpoints.gate, false), true);
assert.deepEqual(resolveForestEdgeSpawn({ x: 486, y: 128 }, { gateOpen: false }), { x: 486, y: 128 }, 'save at actual closed-gate contact restores in place');
assert.deepEqual(resolveForestEdgeSpawn({ x: 454, y: 140 }, { gateOpen: false, footprintsFound: true }), FOREST_EDGE.checkpoints.ring, 'stale save inside the new left rim resolves to the reachable ring checkpoint');
assert.deepEqual(resolveForestEdgeSpawn({ x: 518, y: 140 }, { gateOpen: true }), FOREST_EDGE.checkpoints.gate, 'stale save inside the new right rim resolves to the open-gate approach');

function reachableWithin(start, target, gateOpen) {
  const step = 4;
  const queue = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (Math.hypot(current.x - target.x, current.y - target.y) <= 20) return true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isForestEdgeCenterWalkable(next, gateOpen)) continue;
      seen.add(key); queue.push(next);
    }
  }
  return false;
}

assert.ok(reachableWithin(FOREST_EDGE.player.spawn, FOREST_EDGE.objects.lantern.stand, false), 'spawn reaches lantern');
assert.ok(reachableWithin(FOREST_EDGE.player.spawn, FOREST_EDGE.objects.tablet.stand, false), 'spawn reaches tablet');
assert.ok(reachableWithin(FOREST_EDGE.player.spawn, FOREST_EDGE.objects.ring.stand, false), 'spawn reaches receiver ring with gate closed');
assert.ok(reachableWithin(FOREST_EDGE.objects.ring.stand, FOREST_EDGE.objects.gate.exit, false), 'ring reaches the closed gate prompt');
assert.ok(reachableWithin(FOREST_EDGE.objects.ring.stand, FOREST_EDGE.objects.gate.exit, true), 'open passage remains reachable');

const ringFeet = FOREST_EDGE.objects.ring.ground;
assert.equal(canChargeForestEdgeReceiver(ringFeet, true, true, true, false), true);
assert.equal(canChargeForestEdgeReceiver(ringFeet, false, true, true, false), false, 'lamp off resets the receiver');
assert.equal(canChargeForestEdgeReceiver(ringFeet, true, false, true, false), false, 'tablet reading is required');
assert.equal(canChargeForestEdgeReceiver(ringFeet, true, true, false, false), false, 'footprints are required');
assert.equal(canChargeForestEdgeReceiver(ringFeet, true, true, true, true), false, 'latched gate does not recharge');
assert.equal(canChargeForestEdgeReceiver({ x: ringFeet.x + 17, y: ringFeet.y }, true, true, true, false), false, 'receiver radius is 16 feet pixels');

const restoredNorth = resolveForestEdgeSpawn({ x: 486, y: 110 }, { tabletRead: true, footprintsFound: false, gateOpen: false });
assert.ok(restoredNorth.y >= FOREST_EDGE.objects.gate.exit.y);
assert.equal(isForestEdgeCenterWalkable(restoredNorth, false), true);
const restoredInsideTablet = resolveForestEdgeSpawn({ x: FOREST_EDGE.objects.tablet.anchor.x, y: 200 }, { tabletRead: true, footprintsFound: false, gateOpen: false });
assert.deepEqual(restoredInsideTablet, FOREST_EDGE.checkpoints.tablet);
assert.deepEqual(resolveForestEdgeSpawn({ x: 300, y: 250 }, { tabletRead: true }), { x: 300, y: 250 },
  'valid saves from the old tablet approach still restore in place');
assert.deepEqual(resolveForestEdgeSpawn({ x: 228, y: 204 }, { tabletRead: true }), FOREST_EDGE.checkpoints.tablet,
  'a saved position inside the relocated tablet falls back to its new south checkpoint');
const restoredDuringCharge = resolveForestEdgeSpawn(FOREST_EDGE.objects.ring.stand, { tabletRead: true, footprintsFound: true, gateOpen: false });
assert.deepEqual(restoredDuringCharge, FOREST_EDGE.objects.ring.stand);
const restoredOpenGate = resolveForestEdgeSpawn(undefined, { gateOpen: true });
assert.deepEqual(restoredOpenGate, FOREST_EDGE.checkpoints.gate);
assert.ok(close(FOREST_EDGE.chargeMs, 900));

console.log('Level 01 geometry/state checks passed.');
