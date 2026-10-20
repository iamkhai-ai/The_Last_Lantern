/**
 * Pause-menu level selection: pure rules from src/systems/levelSelect.ts.
 *
 * Run with:  node scripts/check-level-select.mjs
 *
 * Full build reaches up to level 09 (lastPlayable 9); demo stops at level 04 (lastPlayable 3). A selection changes only
 * the level, the lantern hold and the room reset: flags and counters must come out deep-equal to what went in.
 */
import assert from 'node:assert/strict';
import { applyLevelSelection, canSelectLevel, reachedLevel } from '../src/systems/levelSelect.ts';

const FULL = 9;
const DEMO = 3;

const clone = (value) => structuredClone(value);

/** A mid-campaign save: several solved puzzles, a room, a held lantern. */
function midSave(overrides = {}) {
  return {
    version: 1,
    level: 2,
    furthest: 6,
    flags: { 'l0-complete': true, 'l1-complete': true, 'l2-complete': true, 'l2-note': 'read', 'l5-door': false },
    counters: { 'player-level': 2, 'player-x': 120, 'player-y': 88, 'l1-g0': 3, 'l4-lumo-x': 200 },
    lanternOn: true,
    lanternPickedUp: true,
    roomId: 'observatory',
    roomSpawn: { x: 42, y: 180 },
    ...overrides,
  };
}

const CASES = [
  {
    name: 'reachedLevel_is_the_furthest_capped_by_the_build',
    run: () => {
      assert.equal(reachedLevel({ level: 2, furthest: 6 }, FULL), 6, 'full build: furthest is the reach');
      assert.equal(reachedLevel({ level: 2, furthest: 6 }, DEMO), 3, 'demo caps the reach at level 04');
      assert.equal(reachedLevel({ level: 1, furthest: 7 }, DEMO), 3, 'demo: furthest 7 is cut to 3');
      assert.equal(reachedLevel({ level: 5 }, FULL), 5, 'no furthest key reads as the level');
      assert.equal(reachedLevel({ level: 4, furthest: 2 }, FULL), 4, 'a furthest below level never lowers the reach');
      assert.equal(reachedLevel({ level: 0 }, DEMO), 0, 'the reach is never below 0');
    },
  },
  {
    name: 'canSelectLevel_allows_only_reached_levels_other_than_the_current_one',
    run: () => {
      const progress = { level: 2, furthest: 6 };
      for (const target of [0, 1, 3, 4, 5, 6]) assert.equal(canSelectLevel(target, progress, FULL), true, `level ${target} is reached`);
      assert.equal(canSelectLevel(2, progress, FULL), false, 'the current level is not a selection');
      assert.equal(canSelectLevel(7, progress, FULL), false, 'a level never reached is not offered');
      assert.equal(canSelectLevel(9, progress, FULL), false, 'a far level is not offered');
      assert.equal(canSelectLevel(-1, progress, FULL), false, 'negative is refused');
      assert.equal(canSelectLevel(1.5, progress, FULL), false, 'non-integer is refused');
      assert.equal(canSelectLevel(Number.NaN, progress, FULL), false, 'NaN is refused');
      assert.equal(canSelectLevel(Number.POSITIVE_INFINITY, progress, FULL), false, 'infinity is refused');
    },
  },
  {
    name: 'demo_never_offers_level_05_or_later',
    run: () => {
      const progress = { level: 1, furthest: 7 };
      assert.equal(canSelectLevel(3, progress, DEMO), true, 'demo offers level 04');
      assert.equal(canSelectLevel(4, progress, DEMO), false, 'demo never offers level 05');
      assert.equal(canSelectLevel(7, progress, DEMO), false, 'demo never offers the furthest save level');
      assert.equal(canSelectLevel(0, progress, DEMO), true, 'demo can still go back to level 01');
    },
  },
  {
    name: 'applyLevelSelection_changes_only_level_room_lantern_and_furthest',
    run: () => {
      const progress = midSave();
      const before = clone(progress);
      assert.equal(applyLevelSelection(progress, 1, FULL), true, 'a reached level is accepted');
      assert.equal(progress.level, 1, 'the level becomes the target');
      assert.equal(progress.furthest, 6, 'furthest is kept');
      assert.equal('roomId' in progress, false, 'the room is cleared');
      assert.equal('roomSpawn' in progress, false, 'the room spawn is cleared');
      assert.equal(progress.lanternPickedUp, true, 'the lantern is held');
      assert.equal(progress.lanternOn, before.lanternOn, 'lanternOn is untouched');
      assert.deepEqual(progress.flags, before.flags, 'every flag is untouched (deep)');
      assert.deepEqual(progress.counters, before.counters, 'every counter is untouched (deep)');
      assert.equal(progress.version, 1, 'the version is untouched');
    },
  },
  {
    name: 'applyLevelSelection_raises_furthest_to_the_level_left_when_it_was_higher',
    run: () => {
      const progress = { version: 1, level: 4, furthest: 4, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: false };
      assert.equal(applyLevelSelection(progress, 0, FULL), true);
      assert.equal(progress.furthest, 4, 'the old level is kept as the furthest');
    },
  },
  {
    name: 'applyLevelSelection_refused_targets_change_nothing',
    run: () => {
      for (const [target, label, lastPlayable] of [
        [-1, 'negative', FULL],
        [1.5, 'non-integer', FULL],
        [Number.NaN, 'NaN', FULL],
        [7, 'beyond reached', FULL],
        [2, 'the current level', FULL],
        [4, 'demo beyond level 04', DEMO],
      ]) {
        const progress = midSave({ level: 2, furthest: 3 });
        const before = clone(progress);
        assert.equal(applyLevelSelection(progress, target, lastPlayable), false, `${label} is refused`);
        assert.deepEqual(progress, before, `${label} leaves progress unchanged`);
      }
    },
  },
  {
    name: 'demo_selection_keeps_the_saved_furthest_but_offers_only_04',
    run: () => {
      const progress = { version: 1, level: 1, furthest: 7, flags: { 'l0-complete': true }, counters: {}, lanternOn: true, lanternPickedUp: true };
      assert.equal(applyLevelSelection(progress, 3, DEMO), true, 'level 04 is selectable from a demo save');
      assert.equal(progress.level, 3);
      assert.equal(progress.furthest, 7, 'a demo selection never lowers furthest');
      assert.deepEqual(progress.flags, { 'l0-complete': true }, 'flags are kept');
    },
  },
];

const failures = [];
for (const testCase of CASES) {
  try {
    testCase.run();
    console.log(`PASS  ${testCase.name}`);
  } catch (error) {
    failures.push(testCase.name);
    console.log(`FAIL  ${testCase.name}`);
    for (const line of String(error.message).split('\n')) console.log(`        ${line}`);
  }
}
console.log(`\nlevel select: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
