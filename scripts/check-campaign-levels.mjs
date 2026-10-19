/**
 * Campaign integration check — all ten authored levels are present, dispatched and verified.
 *
 * This is a structural guarantee, not a playthrough. It asserts that:
 *   - `CampaignScene` no longer routes anywhere to the "coming soon" scene;
 *   - every campaign index 0..9 reaches a real implementation, either a dedicated level controller
 *     or the authored inline path;
 *   - every level has its scenario document and its pure layout module on disk;
 *   - `CAMPAIGN_LEVELS` still describes exactly the ten scenarios in order;
 *   - the campaign can advance from index 0 to index 9 and stops there.
 *
 * Per-level geometry, collision, prompt-side, restore and guidance behaviour is covered by the
 * `scripts/check-<level>.mjs` scripts; this file only guards the wiring that joins them.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGN_LEVELS } from '../src/data/campaignLevels.ts';
import { DEMO_LEVEL_COUNT, FULL_LEVEL_COUNT, RELEASE_POLICY } from '../src/config/releaseConfig.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');

const scene = read('src/scenes/CampaignScene.ts');
const config = read('src/config/gameConfig.ts');
const scenarioDocs = readdirSync(path.join(ROOT, 'docs/scenario'));

/**
 * One row per authored level. `marker` is the source token proving the index reaches a real
 * implementation; `check` is the dedicated pure check script, or null when the level is covered by a
 * shared check instead of its own.
 */
const LEVELS = [
  { index: 0, scenario: '01', title: 'Forgotten Forest Edge', marker: 'resolveForestEdgeSpawn(', module: 'src/data/forestEdgeLayout.ts', check: 'scripts/check-forest-edge.mjs' },
  { index: 1, scenario: '02', title: 'Whispering Woods', marker: 'normalizeAndPersistWoodsProgress(', module: 'src/data/whisperingWoodsLayout.ts', check: 'scripts/check-whispering-woods.mjs' },
  { index: 2, scenario: '03', title: 'Library Beneath the Roots', marker: 'new LibraryLevel(', module: 'src/data/libraryLayout.ts', check: null },
  { index: 3, scenario: '04', title: 'Shattered Moonlit Creek', marker: 'new ShatteredCreekController(', module: 'src/data/shatteredCreekLayout.ts', check: 'scripts/check-shattered-creek.mjs' },
  { index: 4, scenario: '05', title: 'A Path for Two', marker: 'new PathForTwoLevel(', module: 'src/data/pathForTwoLayout.ts', check: 'scripts/check-path-for-two.mjs' },
  { index: 5, scenario: '06', title: 'The Sleepless Tower', marker: 'new SleeplessTowerLevel(', module: 'src/data/towerLayout.ts', check: 'scripts/check-sleepless-tower.mjs' },
  { index: 6, scenario: '07', title: 'The Sleeping Garden', marker: 'new SleepingGardenLevel(', module: 'src/data/sleepingGardenLayout.ts', check: 'scripts/check-sleeping-garden.mjs' },
  { index: 7, scenario: '08', title: 'Ruins of Two Halves', marker: 'new RuinsOfTwoHalvesLevel(', module: 'src/data/ruinsOfTwoHalvesLayout.ts', check: 'scripts/check-ruins-of-two-halves.mjs' },
  { index: 8, scenario: '09', title: 'Dark Moon Observatory', marker: 'buildObservatoryRoom(', module: 'src/data/observatoryRooms.ts', check: 'scripts/check-observatory.mjs' },
  { index: 9, scenario: '10', title: 'The Heart of Elaria', marker: 'new HeartOfElariaLevel(', module: 'src/data/heartOfElariaLayout.ts', check: 'scripts/check-heart-of-elaria.mjs' },
];

/* ------------------------------------------------------- the campaign is a complete ten-level run */

assert.equal(CAMPAIGN_LEVELS.length, 10, 'the campaign defines exactly ten levels');
for (const level of LEVELS) {
  assert.equal(CAMPAIGN_LEVELS[level.index].title, level.title,
    `campaign index ${level.index} is "${level.title}"`);
}

/* --------------------------- the only "coming soon" route is the demo boundary */

// The default build has no VITE_BUILD_FLAVOR, so it must still be the full
// campaign. The demo boundary is behavioral, not source-only:
// scripts/check-demo-release.mjs runs nextLevel() in both injected modes and
// proves demo index 3 stops while full index 3 advances to 4 and saves.
assert.equal(RELEASE_POLICY.isDemo, false,
  'the default build (no VITE_BUILD_FLAVOR) is the full ten-level campaign');
assert.equal(RELEASE_POLICY.lastPlayableLevelIndex, 9,
  'full mode keeps all ten levels playable');
assert.equal(FULL_LEVEL_COUNT, 10, 'the full campaign defines ten levels');
assert.equal(DEMO_LEVEL_COUNT, 4, 'the demo slice defines four levels');
assert.equal((scene.match(/ComingSoonScene/g) ?? []).length, 2,
  'CampaignScene references ComingSoonScene only for the demo resume guard and the demo slice boundary');

/* --------------------------------------------------- every index reaches a real implementation */

for (const level of LEVELS) {
  assert.ok(existsSync(path.join(ROOT, level.module)),
    `campaign index ${level.index} (${level.title}) ships its layout module ${level.module}`);
  assert.ok(scene.includes(level.marker),
    `campaign index ${level.index} (${level.title}) is wired to its implementation via ${level.marker}`);
}

/* ------------------------------------------- one per-frame update owner per controller */

// update() is the only place a level controller is driven every frame. The tower
// controller used to be driven there twice — once from its own index guard, once
// from the list that reconciles the other controllers — which double-stepped the
// whole level. scripts/check-campaign-runtime.mjs proves the count at runtime;
// this keeps the dispatch itself single-sourced for every controller.
const updateBody = scene.slice(scene.indexOf('public update('), scene.indexOf('private updateForestEdgeProgress('));
assert.ok(updateBody.includes('this.progress.level === 5') && updateBody.includes('this.sleeplessTower?.update('),
  'update() still drives the tower controller from its index-5 guard');
for (const driver of [
  'this.player.update(', 'this.lumo.update(', 'this.lantern.update(',
  'this.libraryLevel?.update(', 'this.shatteredCreek?.update(', 'this.pathForTwoLevel?.update(',
  'this.sleeplessTower?.update(', 'this.gardenLevel?.update(', 'this.ruinsLevel?.update(', 'this.heartLevel?.update(',
]) {
  const callSites = updateBody.split(driver).length - 1;
  assert.equal(callSites, 1,
    `update() must drive ${driver.slice(5, -1)} exactly once per frame, found ${callSites} call sites`);
}

/* ------------------------------------------- every level still has its authored scenario on disk */

for (const level of LEVELS) {
  const doc = scenarioDocs.find((file) => file.startsWith(`${level.scenario}-`) && file.endsWith('.md'));
  assert.ok(doc, `campaign index ${level.index} keeps its scenario document docs/scenario/${level.scenario}-*.md`);
}

/* ------------------------------------------------------------------ per-level pure check coverage */

const covered = [];
const sharedOnly = [];
for (const level of LEVELS) {
  if (level.check) {
    assert.ok(existsSync(path.join(ROOT, level.check)),
      `campaign index ${level.index} ships its pure check ${level.check}`);
    covered.push(level.index);
  } else {
    sharedOnly.push(level.index);
  }
}
assert.ok(covered.length >= 9, 'at least nine of the ten indices ship a dedicated pure check');

/* ------------------------------------------- the campaign can advance 0..9 and stops at index 9 */

const nextLevelStart = scene.indexOf('private nextLevel(');
const nextLevelEnd = scene.indexOf('private finishHeartCampaign(');
assert.ok(nextLevelStart >= 0 && nextLevelEnd > nextLevelStart, 'nextLevel() is still declared before the ending helpers');
const nextLevelBody = scene.slice(nextLevelStart, nextLevelEnd);
assert.ok(nextLevelBody.includes('this.progress.level >= 9'), 'nextLevel() stops advancing past index 9');
assert.ok(nextLevelBody.includes('this.progress.level += 1'), 'nextLevel() advances one index at a time');
assert.ok(nextLevelBody.includes('RELEASE_POLICY.isDemo'),
  'the only early next-level stop is the demo build boundary');

/* --------------------------------------------------------- the ending is still reachable and wired */

assert.ok(config.includes('CampaignScene'), 'the game registers CampaignScene');
assert.ok(config.includes('EndingScene'), 'the game registers EndingScene');
assert.ok(scene.includes("this.scene.start('EndingScene'"), 'the campaign can reach EndingScene');
assert.ok(scene.includes("flags['l9-complete'] === true"), 'a completed campaign resumes at the ending');

console.log('Campaign integration checks passed:');
console.log(`  levels        : ${LEVELS.length} authored indices, all dispatched and all with layout modules`);
console.log(`  scenario docs : ${LEVELS.length}/${LEVELS.length} present`);
console.log(`  pure checks   : ${covered.length}/${LEVELS.length} dedicated (index ${covered.join(', ')})`);
console.log(`  shared cover  : index ${sharedOnly.join(', ')} rely on the shared interaction-prompt check and the build`);
console.log('  gating        : full build keeps all ten levels; the only coming-soon route is the demo slice boundary');
console.log('  frame owners  : each controller, Lumo and the lantern system has one update() call site');
console.log('  ending        : EndingScene reachable, completed campaigns resume at the ending');
