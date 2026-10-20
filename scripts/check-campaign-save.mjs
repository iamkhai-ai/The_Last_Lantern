/**
 * Levels 05-10 — campaign save repair checks.
 *
 * Run with:  node scripts/check-campaign-save.mjs
 *
 * The defect: validate() rejected the whole save for one bad optional key, load() then fell back to a fresh game, and
 * the next save() overwrote the real campaign. These cases run the shipped CampaignSaveSystem against a fake
 * window.localStorage and check that every optional key is repaired (its group dropped, the rest of the campaign kept),
 * that only an unrecoverable save falls back to the default, and that an unreadable or repaired save is copied once to
 * the backup key. The Level 09 Lumo groups are split by function: position, route and state. The last section pins the
 * consumer defaults the repairs rely on to the source of CampaignScene and ObservatoryPuzzle.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CampaignSaveSystem, readEndingBeat } from '../src/systems/CampaignSaveSystem.ts';
import { deriveObservatoryState } from '../src/systems/ObservatoryPuzzle.ts';
import { OBSERVATORY_LUMO_WAYPOINTS } from '../src/data/observatoryRooms.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'last-lantern-campaign-save-v1';
const BACKUP = 'last-lantern-campaign-save-v1-backup';
const POSITION_FLAGS = ['l8-lumo-room'];
const POSITION_COUNTERS = ['l8-lumo-x', 'l8-lumo-y'];
const STATE_FLAGS = ['l8-lumo-destination', 'l8-lumo-arrived', 'l8-lumo-recalled'];
const ROUTE_FLAGS = ['l8-lumo-route-json'];
const ROUTE_COUNTERS = ['l8-lumo-route-index'];
const ROUTE = [{ roomId: 'entrance', x: 100, y: 100 }, { roomId: 'corridor', x: 320, y: 80 }];
const SEAL = OBSERVATORY_LUMO_WAYPOINTS['lumo-seal'];

let store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
  },
};

/** A level 8 save with a Lumo transit mid-route, a placed lantern and unrelated campaign state. */
function fullSave() {
  return {
    version: 1,
    level: 8,
    furthest: 8,
    flags: {
      'intro-8': true,
      'l8-door-a-latched': true,
      'l8-lantern-placed': true,
      'l8-lumo-room': 'corridor',
      'l8-lumo-destination': 'lumo-seal',
      'l8-lumo-arrived': '',
      'l8-lumo-recalled': false,
      'l8-lumo-route-json': JSON.stringify(ROUTE),
    },
    counters: { 'player-level': 8, 'l8-g0': 1, 'l8-lumo-route-index': 1, 'l8-lumo-x': 200, 'l8-lumo-y': 150, 'l8-lantern-x': 188, 'l8-lantern-y': 176 },
    lanternOn: true,
    lanternPickedUp: true,
  };
}

const rawOf = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

/** Stores `value` (or a raw string) as the save, then loads it through the shipped code. */
function loadRaw(value) {
  store = new Map();
  store.set(KEY, rawOf(value));
  return CampaignSaveSystem.load();
}

function saveWith(edit) {
  const save = fullSave();
  edit(save);
  return save;
}

/** The Lumo state `CampaignScene` derives for the observatory puzzle; the consumer case pins this formula to source. */
function lumoRecalled(progress) {
  return progress.flags['l8-lumo-recalled'] === true || progress.flags['l8-lumo-arrived'] === 'lantern-source';
}

/** Whether ObservatoryPuzzle counts Lumo at the seal for this save (his position and his seal call). */
function lumoAtSeal(progress) {
  const flags = progress.flags;
  const counters = progress.counters;
  return deriveObservatoryState({
    mirrorRotations: { g0: 0, g1: 0, g2: 0 },
    statueOrientation: 0,
    lanternOn: true,
    lanternPlaced: true,
    doorALatched: false,
    // CampaignScene: the room is the entrance when unset, and the position is the sprite's (counters or the default).
    lumoPosition: { roomId: flags['l8-lumo-room'] ?? 'entrance', x: counters['l8-lumo-x'] ?? 0, y: counters['l8-lumo-y'] ?? 0 },
    lumoRoute: {
      destinationWaypointId: flags['l8-lumo-destination'] || null,
      arrivedAtWaypointId: flags['l8-lumo-arrived'] || null,
    },
  }).lumoAtSeal;
}

function assertPositionDropped(progress, label) {
  for (const key of POSITION_FLAGS) assert.equal(key in progress.flags, false, `${label}: ${key} is dropped with the position`);
  for (const key of POSITION_COUNTERS) assert.equal(key in progress.counters, false, `${label}: ${key} is dropped with the position`);
}

function assertPositionKept(progress, label) {
  assert.equal(progress.flags['l8-lumo-room'], 'corridor', `${label}: the position is kept`);
  assert.equal(progress.counters['l8-lumo-x'], 200, `${label}: the position is kept`);
  assert.equal(progress.counters['l8-lumo-y'], 150, `${label}: the position is kept`);
}

function assertStateKept(progress, label) {
  assert.equal(progress.flags['l8-lumo-destination'], 'lumo-seal', `${label}: the destination is kept`);
  assert.equal(progress.flags['l8-lumo-arrived'], '', `${label}: the arrival is kept`);
  assert.equal(progress.flags['l8-lumo-recalled'], false, `${label}: the recall is kept`);
}

function assertStateDropped(progress, label) {
  for (const key of STATE_FLAGS) assert.equal(key in progress.flags, false, `${label}: ${key} is dropped with the route`);
}

function assertRouteKept(progress, label) {
  assert.equal(progress.flags['l8-lumo-route-json'], JSON.stringify(ROUTE), `${label}: the route is kept`);
  assert.equal(progress.counters['l8-lumo-route-index'], 1, `${label}: the route index is kept`);
}

function assertRouteDropped(progress, label) {
  for (const key of ROUTE_FLAGS) assert.equal(key in progress.flags, false, `${label}: ${key} is dropped alone`);
  for (const key of ROUTE_COUNTERS) assert.equal(key in progress.counters, false, `${label}: ${key} is dropped alone`);
}

function assertRestKept(progress, label) {
  assert.equal(progress.level, 8, `${label}: level kept`);
  assert.equal(progress.flags['intro-8'], true, `${label}: unrelated flag kept`);
  assert.equal(progress.flags['l8-door-a-latched'], true, `${label}: unrelated flag kept`);
  assert.equal(progress.flags['l8-lantern-placed'], true, `${label}: lantern placement flag kept`);
  assert.equal(progress.counters['player-level'], 8, `${label}: unrelated counter kept`);
  assert.equal(progress.counters['l8-g0'], 1, `${label}: unrelated counter kept`);
  assert.equal(progress.lanternOn, true, `${label}: lantern state kept`);
  assert.equal(progress.lanternPickedUp, true, `${label}: lantern state kept`);
}

/** A repaired save is copied to the backup key, once, as the raw string that was stored. */
function assertBackedUp(raw, label) {
  assert.equal(store.get(BACKUP), raw, `${label}: the repaired save is copied to the backup`);
}

const POSITION_REPAIRS = [
  ['l8-lumo-room is not a room id', (s) => { s.flags['l8-lumo-room'] = 'lumo-seal'; }],
  ['l8-lumo-room is lantern-source', (s) => { s.flags['l8-lumo-room'] = 'lantern-source'; }],
  ['l8-lumo-x is off the canvas', (s) => { s.counters['l8-lumo-x'] = 641; }],
  ['l8-lumo-y is off the canvas', (s) => { s.counters['l8-lumo-y'] = 361; }],
  ['l8-lumo-x is a string', (s) => { s.counters['l8-lumo-x'] = 'left'; }],
];

/** Malformed route, before arrival: the route goes alone and the destination with it, so Lumo is free. */
const ROUTE_REPAIRS_MID_TRANSIT = [
  ['l8-lumo-route-json is malformed', (s) => { s.flags['l8-lumo-route-json'] = '[{"roomId":'; }],
  ['l8-lumo-route-json is not a string', (s) => { s.flags['l8-lumo-route-json'] = ROUTE; }],
  ['l8-lumo-route-json holds a step off the canvas', (s) => { s.flags['l8-lumo-route-json'] = JSON.stringify([{ roomId: 'corridor', x: 700, y: 80 }]); }],
  ['l8-lumo-route-json holds a step in an unknown room', (s) => { s.flags['l8-lumo-route-json'] = JSON.stringify([{ roomId: 'lumo-seal', x: 10, y: 10 }]); }],
  ['l8-lumo-route-index is past the route', (s) => { s.counters['l8-lumo-route-index'] = 3; }],
  ['l8-lumo-route-index is fractional', (s) => { s.counters['l8-lumo-route-index'] = 1.5; }],
  ['l8-lumo-route-index is negative', (s) => { s.counters['l8-lumo-route-index'] = -1; }],
];

/** Malformed state: the state goes with the route, because a route without consistent state is meaningless. */
const STATE_REPAIRS = [
  ['l8-lumo-destination is not a waypoint', (s) => { s.flags['l8-lumo-destination'] = 'door-a-eye'; }],
  ['l8-lumo-arrived is not a waypoint', (s) => { s.flags['l8-lumo-arrived'] = 'g1'; }],
  ['l8-lumo-arrived is a boolean', (s) => { s.flags['l8-lumo-arrived'] = true; }],
  ['l8-lumo-recalled is not a boolean', (s) => { s.flags['l8-lumo-recalled'] = 'yes'; }],
];

const LANTERN_REPAIRS = [
  ['l8-lantern-x is off the canvas', (s) => { s.counters['l8-lantern-x'] = 641; }],
  ['l8-lantern-y is off the canvas', (s) => { s.counters['l8-lantern-y'] = -1; }],
  ['l8-lantern-x is not a number', (s) => { s.counters['l8-lantern-x'] = 'left'; }],
];

const CASES = [
  {
    name: 'a_valid_save_round_trips_unchanged',
    run: () => {
      assert.deepEqual(loadRaw(fullSave()), fullSave());
      assert.equal(store.has(BACKUP), false, 'a valid save writes no backup');
    },
  },
  {
    name: 'a_valid_save_written_by_save_loads_without_a_backup',
    run: () => {
      store = new Map();
      CampaignSaveSystem.save(fullSave());
      assert.deepEqual(CampaignSaveSystem.load(), fullSave());
      assert.equal(store.has(BACKUP), false, 'a save written by save() is valid and writes no backup');
    },
  },
  {
    name: 'a_valid_save_with_location_round_trips_through_save',
    run: () => {
      const save = saveWith((s) => { s.roomId = 'observatory'; s.roomSpawn = { x: 42, y: 180 }; });
      const progress = loadRaw(save);
      assert.deepEqual(progress, save);
      CampaignSaveSystem.save(progress);
      assert.deepEqual(CampaignSaveSystem.load(), save, 'a save written from a loaded save reads back unchanged');
    },
  },
  {
    name: 'a_partial_lumo_group_is_valid_and_kept',
    run: () => {
      const progress = loadRaw(saveWith((s) => {
        s.flags = { 'l8-lumo-room': 'observatory' };
        s.counters = { 'l8-lumo-x': 24 };
      }));
      assert.equal(progress.flags['l8-lumo-room'], 'observatory');
      assert.equal(progress.counters['l8-lumo-x'], 24, 'absent members are not invalid; the consumer defaults them');
      assert.equal(store.has(BACKUP), false, 'a partial group is valid, so nothing is repaired');
    },
  },
  {
    name: 'a_route_index_at_the_route_end_is_valid',
    run: () => {
      const progress = loadRaw(saveWith((s) => { s.counters['l8-lumo-route-index'] = 2; }));
      assert.equal(progress.counters['l8-lumo-route-index'], 2);
      assert.equal(progress.flags['l8-lumo-route-json'], JSON.stringify(ROUTE));
      assert.equal(store.has(BACKUP), false);
    },
  },
  {
    name: 'a_finished_route_with_an_empty_json_is_valid',
    run: () => {
      const progress = loadRaw(saveWith((s) => {
        s.flags['l8-lumo-route-json'] = '';
        s.flags['l8-lumo-arrived'] = 'lumo-seal';
        s.counters['l8-lumo-route-index'] = 0;
      }));
      assert.equal(progress.flags['l8-lumo-arrived'], 'lumo-seal');
      assert.equal(progress.flags['l8-lumo-route-json'], '');
      assert.equal(store.has(BACKUP), false);
    },
  },
  ...POSITION_REPAIRS.map(([label, edit]) => ({
    name: `repairs_position_alone_when_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
    run: () => {
      const raw = rawOf(saveWith(edit));
      const progress = loadRaw(raw);
      assert.equal(progress.level, 8, `${label}: the save is still recovered`);
      assertPositionDropped(progress, label);
      assertStateKept(progress, label);
      assertRouteKept(progress, label);
      assertRestKept(progress, label);
      assertBackedUp(raw, label);
      assert.equal(CampaignSaveSystem.hasSave(), true, `${label}: the save still counts as a save`);
    },
  })),
  ...ROUTE_REPAIRS_MID_TRANSIT.map(([label, edit]) => ({
    name: `repairs_route_alone_and_frees_lumo_mid_transit_when_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
    run: () => {
      const raw = rawOf(saveWith(edit));
      const progress = loadRaw(raw);
      assert.equal(progress.level, 8, `${label}: the save is still recovered`);
      assertRouteDropped(progress, label);
      assert.equal('l8-lumo-destination' in progress.flags, false, `${label}: before arrival the destination goes too, so Lumo is free`);
      assert.equal(progress.flags['l8-lumo-arrived'], '', `${label}: the arrival marker is not an arrival`);
      assert.equal(progress.flags['l8-lumo-recalled'], false, `${label}: the recall is not set`);
      assertPositionKept(progress, label);
      assertRestKept(progress, label);
      assertBackedUp(raw, label);
    },
  })),
  ...STATE_REPAIRS.map(([label, edit]) => ({
    name: `repairs_state_with_route_when_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
    run: () => {
      const raw = rawOf(saveWith(edit));
      const progress = loadRaw(raw);
      assert.equal(progress.level, 8, `${label}: the save is still recovered`);
      assertStateDropped(progress, label);
      assertRouteDropped(progress, label);
      assertPositionKept(progress, label);
      assertRestKept(progress, label);
      assertBackedUp(raw, label);
    },
  })),
  ...LANTERN_REPAIRS.map(([label, edit]) => ({
    name: `repairs_lantern_pair_when_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
    run: () => {
      const raw = rawOf(saveWith(edit));
      const progress = loadRaw(raw);
      assert.equal('l8-lantern-x' in progress.counters, false, `${label}: the lantern pair is dropped together`);
      assert.equal('l8-lantern-y' in progress.counters, false, `${label}: the lantern pair is dropped together`);
      assert.equal(progress.flags['l8-lantern-placed'], true, `${label}: the placed flag stays; the lantern restores on its pedestal`);
      assertStateKept(progress, label);
      assertRouteKept(progress, label);
      assertPositionKept(progress, label);
      assertRestKept(progress, label);
      assertBackedUp(raw, label);
    },
  })),
  {
    name: 'a_lantern_pair_with_one_valid_side_is_still_dropped_as_a_pair',
    run: () => {
      const progress = loadRaw(saveWith((s) => { s.counters['l8-lantern-y'] = 400; }));
      assert.equal('l8-lantern-x' in progress.counters, false, 'the valid x goes with the invalid y');
      assert.equal('l8-lantern-y' in progress.counters, false);
    },
  },
  {
    name: 'a_position_malformed_after_the_recall_keeps_the_recall',
    run: () => {
      const progress = loadRaw(saveWith((s) => {
        s.flags['l8-lumo-destination'] = 'lantern-source';
        s.flags['l8-lumo-arrived'] = 'lantern-source';
        s.flags['l8-lumo-recalled'] = true;
        s.flags['l8-lumo-route-json'] = '';
        s.counters['l8-lumo-route-index'] = 0;
        s.flags['l8-lumo-room'] = 'lumo-seal';
      }));
      assertPositionDropped(progress, 'recall');
      assert.equal(progress.flags['l8-lumo-arrived'], 'lantern-source');
      assert.equal(lumoRecalled(progress), true, 'Lumo still counts as recalled');
    },
  },
  {
    name: 'a_malformed_route_after_the_recall_keeps_the_recall',
    run: () => {
      const raw = rawOf(saveWith((s) => {
        s.flags['l8-lumo-destination'] = 'lantern-source';
        s.flags['l8-lumo-arrived'] = 'lantern-source';
        s.flags['l8-lumo-recalled'] = true;
        s.flags['l8-lumo-route-json'] = '[{';
        s.counters['l8-lumo-route-index'] = 0;
      }));
      const progress = loadRaw(raw);
      assertRouteDropped(progress, 'recall');
      assert.equal(progress.flags['l8-lumo-destination'], 'lantern-source', 'the destination stands after arrival');
      assert.equal(progress.flags['l8-lumo-arrived'], 'lantern-source');
      assert.equal(progress.flags['l8-lumo-recalled'], true);
      assert.equal(lumoRecalled(progress), true, 'the route is not needed for the recall');
      assertBackedUp(raw, 'recall');
    },
  },
  {
    name: 'a_malformed_route_after_arrival_at_the_seal_keeps_lumo_at_the_seal',
    run: () => {
      const seal = (route) => saveWith((s) => {
        s.flags['l8-lumo-room'] = SEAL.roomId;
        s.counters['l8-lumo-x'] = SEAL.x;
        s.counters['l8-lumo-y'] = SEAL.y;
        s.flags['l8-lumo-destination'] = 'lumo-seal';
        s.flags['l8-lumo-arrived'] = 'lumo-seal';
        s.flags['l8-lumo-recalled'] = false;
        s.flags['l8-lumo-route-json'] = route;
        s.counters['l8-lumo-route-index'] = 0;
      });
      assert.equal(lumoAtSeal(loadRaw(seal(''))), true, 'baseline: a finished seal call counts as Lumo at the seal');
      const progress = loadRaw(seal('[{'));
      assertRouteDropped(progress, 'seal');
      assert.equal(lumoAtSeal(progress), true, 'the bridge stays grown: Lumo is still at the seal');
    },
  },
  {
    name: 'a_position_malformed_with_a_finished_seal_call_drops_the_call_with_it',
    run: () => {
      const raw = rawOf(saveWith((s) => {
        s.flags['l8-lumo-room'] = 'lumo-seal';
        s.flags['l8-lumo-arrived'] = 'lumo-seal';
        s.flags['l8-lumo-route-json'] = '';
        s.counters['l8-lumo-route-index'] = 0;
      }));
      const progress = loadRaw(raw);
      assertPositionDropped(progress, 'seal');
      assertStateDropped(progress, 'seal');
      assertRouteDropped(progress, 'seal');
      assert.equal(lumoAtSeal(progress), false, 'with no position Lumo cannot count at the seal, so the call is dropped');
      assertBackedUp(raw, 'seal');
    },
  },
  {
    name: 'a_position_malformed_with_a_live_seal_route_keeps_the_route',
    run: () => {
      const progress = loadRaw(saveWith((s) => { s.flags['l8-lumo-room'] = 'lumo-seal'; }));
      assertPositionDropped(progress, 'live seal route');
      assertStateKept(progress, 'live seal route');
      assertRouteKept(progress, 'live seal route');
    },
  },
  {
    name: 'a_seal_arrival_with_no_position_keys_drops_the_call_and_frees_lumo',
    run: () => {
      const raw = rawOf(saveWith((s) => {
        delete s.flags['l8-lumo-room'];
        delete s.counters['l8-lumo-x'];
        delete s.counters['l8-lumo-y'];
        s.flags['l8-lumo-destination'] = 'lumo-seal';
        s.flags['l8-lumo-arrived'] = 'lumo-seal';
        s.flags['l8-lumo-route-json'] = '';
        s.counters['l8-lumo-route-index'] = 0;
      }));
      const progress = loadRaw(raw);
      assert.equal(progress.level, 8, 'the save is still recovered');
      assertStateDropped(progress, 'seal arrival without position');
      assertRouteDropped(progress, 'seal arrival without position');
      assertPositionDropped(progress, 'seal arrival without position');
      assert.equal(lumoAtSeal(progress), false, 'Lumo is not parked at a seal he cannot reach');
      assertRestKept(progress, 'seal arrival without position');
      assertBackedUp(raw, 'seal arrival without position');
      store.set(KEY, rawOf(saveWith((s) => { s.counters['l8-lantern-x'] = 900; })));
      CampaignSaveSystem.load();
      assert.equal(store.get(BACKUP), raw, 'a later repaired load does not replace the backup');
    },
  },
  {
    name: 'a_seal_call_with_no_position_keys_and_no_live_route_drops_the_call',
    run: () => {
      const raw = rawOf(saveWith((s) => {
        delete s.flags['l8-lumo-room'];
        delete s.counters['l8-lumo-x'];
        delete s.counters['l8-lumo-y'];
        s.flags['l8-lumo-destination'] = 'lumo-seal';
        s.flags['l8-lumo-arrived'] = '';
        s.flags['l8-lumo-route-json'] = '';
        s.counters['l8-lumo-route-index'] = 0;
      }));
      const progress = loadRaw(raw);
      assertStateDropped(progress, 'seal call without position');
      assertRouteDropped(progress, 'seal call without position');
      assertRestKept(progress, 'seal call without position');
      assertBackedUp(raw, 'seal call without position');
    },
  },
  {
    name: 'a_seal_call_with_no_position_keys_and_a_live_route_keeps_the_route',
    run: () => {
      const progress = loadRaw(saveWith((s) => {
        delete s.flags['l8-lumo-room'];
        delete s.counters['l8-lumo-x'];
        delete s.counters['l8-lumo-y'];
      }));
      assertStateKept(progress, 'live seal route without position');
      assertRouteKept(progress, 'live seal route without position');
      assert.equal(store.has(BACKUP), false, 'an absent position with a live route is valid, so nothing is repaired');
    },
  },
  {
    name: 'a_seal_arrival_at_a_valid_corridor_position_is_unchanged',
    run: () => {
      const save = saveWith((s) => {
        s.flags['l8-lumo-room'] = SEAL.roomId;
        s.counters['l8-lumo-x'] = SEAL.x;
        s.counters['l8-lumo-y'] = SEAL.y;
        s.flags['l8-lumo-destination'] = 'lumo-seal';
        s.flags['l8-lumo-arrived'] = 'lumo-seal';
        s.flags['l8-lumo-route-json'] = '';
        s.counters['l8-lumo-route-index'] = 0;
      });
      const progress = loadRaw(save);
      assert.deepEqual(progress, save, 'a finished seal call at a valid corridor position loads unchanged');
      assert.equal(lumoAtSeal(progress), true, 'and Lumo still counts at the seal');
      assert.equal(store.has(BACKUP), false, 'a valid save writes no backup');
    },
  },
  ...['entrance', 'observatory'].map((room) => ({
    name: `repairs_seal_arrival_when_lumo_is_in_${room}`,
    run: () => {
      const raw = rawOf(saveWith((s) => {
        s.flags['l8-lumo-room'] = room;
        s.flags['l8-lumo-destination'] = 'lumo-seal';
        s.flags['l8-lumo-arrived'] = 'lumo-seal';
        s.flags['l8-lumo-route-json'] = '';
        s.counters['l8-lumo-route-index'] = 0;
      }));
      const progress = loadRaw(raw);
      assertStateDropped(progress, room);
      assertRouteDropped(progress, room);
      assert.equal(progress.flags['l8-lumo-room'], room, `${room}: the valid position is kept; Lumo is free there`);
      assertRestKept(progress, room);
      assertBackedUp(raw, room);
    },
  })),
  {
    name: 'repairs_invalid_roomId_and_keeps_the_rest',
    run: () => {
      const progress = loadRaw(saveWith((s) => { s.roomId = 'hall'; s.roomSpawn = { x: 42, y: 180 }; }));
      assert.equal('roomId' in progress, false, 'an unknown room is dropped');
      assert.deepEqual(progress.roomSpawn, { x: 42, y: 180 }, 'the valid spawn is kept');
      assertRestKept(progress, 'roomId');
      assertStateKept(progress, 'roomId');
      assertRouteKept(progress, 'roomId');
      assertPositionKept(progress, 'roomId');
    },
  },
  ...[
    ['roomSpawn off the canvas', { x: 700, y: 10 }],
    ['roomSpawn is null', null],
    ['roomSpawn is a string', 'here'],
    ['roomSpawn has a non-numeric y', { x: 10, y: 'a' }],
  ].map(([label, spawn]) => ({
    name: `repairs_roomSpawn_when_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
    run: () => {
      const progress = loadRaw(saveWith((s) => { s.roomId = 'corridor'; s.roomSpawn = spawn; }));
      assert.equal('roomSpawn' in progress, false, `${label}: the spawn is dropped`);
      assert.equal(progress.roomId, 'corridor', `${label}: the valid room is kept`);
      assertRestKept(progress, label);
    },
  })),
  {
    name: 'a_non_object_flags_or_counters_becomes_empty',
    run: () => {
      for (const [label, edit] of [
        ['flags is an array', (s) => { s.flags = ['intro-8']; }],
        ['flags is a string', (s) => { s.flags = 'intro-8'; }],
        ['flags is null', (s) => { s.flags = null; }],
        ['counters is an array', (s) => { s.counters = [8]; }],
        ['counters is a string', (s) => { s.counters = 'player-level'; }],
      ]) {
        const raw = rawOf(saveWith(edit));
        const progress = loadRaw(raw);
        assert.equal(progress.level, 8, `${label}: the save is recovered`);
        const emptied = label.startsWith('flags') ? progress.flags : progress.counters;
        assert.deepEqual(emptied, {}, `${label}: it becomes {}`);
        assert.equal(progress.lanternOn, true, `${label}: the rest is kept`);
        assertBackedUp(raw, label);
      }
    },
  },
  {
    name: 'drops_only_the_malformed_flag_and_counter_values',
    run: () => {
      const progress = loadRaw(saveWith((s) => {
        s.flags['intro-8'] = 3;
        s.flags['l8-door-a-latched'] = true;
        s.counters['l8-g0'] = null;
        s.counters['player-x'] = 120;
      }));
      assert.equal('intro-8' in progress.flags, false, 'a non-boolean, non-string flag is dropped');
      assert.equal(progress.flags['l8-door-a-latched'], true);
      assert.equal('l8-g0' in progress.counters, false, 'a non-finite counter is dropped');
      assert.equal(progress.counters['player-x'], 120);
      assertStateKept(progress, 'filter');
      assertRouteKept(progress, 'filter');
      assertPositionKept(progress, 'filter');
    },
  },
  {
    name: 'nested_arrays_and_objects_as_values_are_filtered',
    run: () => {
      const raw = rawOf(saveWith((s) => {
        s.flags['intro-8'] = [true];
        s.flags['nested'] = { a: 1 };
        s.counters['l8-g0'] = [1];
      }));
      const progress = loadRaw(raw);
      assert.equal('intro-8' in progress.flags, false, 'an array flag is dropped');
      assert.equal('nested' in progress.flags, false, 'an object flag is dropped');
      assert.equal('l8-g0' in progress.counters, false, 'an array counter is dropped');
      assert.equal(progress.flags['l8-door-a-latched'], true, 'the other flags are kept');
      assertBackedUp(raw, 'nested');
    },
  },
  {
    name: 'a_proto_key_does_not_pollute_object_prototype',
    run: () => {
      const raw = '{"version":1,"level":8,"flags":{"__proto__":{"polluted":true},"intro-8":true},"counters":{"__proto__":3,"player-level":8},"lanternOn":false,"lanternPickedUp":false}';
      const progress = loadRaw(raw);
      assert.equal({}.polluted, undefined, 'a fresh object has no polluted property');
      assert.equal(Object.prototype.polluted, undefined, 'Object.prototype is untouched');
      assert.equal(Object.getPrototypeOf(progress.flags), Object.prototype);
      assert.equal(Object.getPrototypeOf(progress.counters), Object.prototype);
      assert.equal(progress.flags['intro-8'], true, 'the other flags are kept');
      assert.equal(progress.counters['player-level'], 8, 'the other counters are kept');
      assertBackedUp(raw, 'proto');
    },
  },
  {
    name: 'an_unrecoverable_save_returns_default_and_is_backed_up',
    run: () => {
      for (const [label, value] of [
        ['version 2', saveWith((s) => { s.version = 2; })],
        ['level is a string', saveWith((s) => { s.level = '8'; })],
        ['level is missing', saveWith((s) => { delete s.level; })],
        ['the stored value is a number', 42],
      ]) {
        const raw = rawOf(value);
        const progress = loadRaw(value);
        assert.deepEqual(progress, CampaignSaveSystem.createDefaultProgress(), `${label}: default progress`);
        assert.equal(store.get(BACKUP), raw, `${label}: the raw string is copied to the backup`);
        assert.equal(store.get(KEY), raw, `${label}: the stored save is not overwritten by load`);
      }
    },
  },
  {
    name: 'unparseable_json_returns_default_and_is_backed_up',
    run: () => {
      const raw = '{"version":1,"level":8,"flags":{';
      assert.deepEqual(loadRaw(raw), CampaignSaveSystem.createDefaultProgress());
      assert.equal(store.get(BACKUP), raw, 'the unreadable text is kept');
    },
  },
  {
    name: 'the_backup_is_written_once_and_never_overwritten',
    run: () => {
      const first = JSON.stringify(saveWith((s) => { s.version = 2; }));
      const second = '{"broken":';
      loadRaw(first);
      store.set(KEY, second);
      CampaignSaveSystem.load();
      assert.equal(store.get(BACKUP), first, 'a later corruption does not replace the earlier backup');
      assert.equal(store.get(KEY), second, 'the later corrupt save is left in place');
    },
  },
  {
    name: 'a_repaired_load_writes_the_backup_once',
    run: () => {
      const first = rawOf(saveWith((s) => { s.counters['l8-lantern-x'] = 900; }));
      const second = rawOf(saveWith((s) => { s.flags['l8-lumo-recalled'] = 'yes'; }));
      loadRaw(first);
      assert.equal(store.get(BACKUP), first, 'the first repaired save is backed up');
      store.set(KEY, second);
      CampaignSaveSystem.load();
      assert.equal(store.get(BACKUP), first, 'a later repaired save does not replace the backup');
      assert.equal(store.get(KEY), second, 'the repaired save stays in place until a save overwrites it');
    },
  },
  {
    name: 'save_after_a_repaired_load_writes_the_repaired_json',
    run: () => {
      const raw = rawOf(saveWith((s) => { s.flags['l8-lumo-route-json'] = '[{'; s.counters['l8-lantern-y'] = 400; }));
      const progress = loadRaw(raw);
      CampaignSaveSystem.save(progress);
      const written = JSON.parse(store.get(KEY));
      assert.deepEqual(written, progress, 'the stored save is the repaired progress');
      assert.equal('l8-lumo-route-json' in written.flags, false, 'the dropped route is not written back');
      assert.equal('l8-lantern-y' in written.counters, false, 'the dropped lantern pair is not written back');
      assert.equal(store.get(BACKUP), raw, 'the backup still holds the raw save');
    },
  },
  {
    name: 'clear_leaves_the_backup',
    run: () => {
      store = new Map();
      store.set(KEY, '{"broken":');
      CampaignSaveSystem.load();
      assert.equal(store.get(BACKUP), '{"broken":');
      CampaignSaveSystem.clear();
      assert.equal(store.has(KEY), false, 'clear removes the save');
      assert.equal(store.get(BACKUP), '{"broken":', 'clear keeps the backup');
    },
  },
  {
    name: 'no_backup_for_a_missing_or_empty_save',
    run: () => {
      store = new Map();
      assert.deepEqual(CampaignSaveSystem.load(), CampaignSaveSystem.createDefaultProgress());
      assert.equal(store.has(BACKUP), false, 'a missing save is not backed up');
      store.set(KEY, '');
      assert.deepEqual(CampaignSaveSystem.load(), CampaignSaveSystem.createDefaultProgress());
      assert.equal(store.has(BACKUP), false, 'an empty save is not backed up');
    },
  },
  {
    name: 'hasSave_never_writes_a_backup',
    run: () => {
      for (const raw of [
        JSON.stringify(saveWith((s) => { s.version = 2; })),
        '{"broken":',
        JSON.stringify(saveWith((s) => { s.flags['l8-lumo-room'] = 'lumo-seal'; })),
        JSON.stringify(saveWith((s) => { s.roomId = 'hall'; })),
      ]) {
        store = new Map();
        store.set(KEY, raw);
        CampaignSaveSystem.hasSave();
        assert.equal(store.has(BACKUP), false, `hasSave on ${raw.slice(0, 40)} writes no backup`);
      }
    },
  },
  {
    name: 'storage_failures_never_throw_from_the_repair_path',
    run: () => {
      const real = globalThis.window.localStorage;
      try {
        globalThis.window.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
        assert.deepEqual(CampaignSaveSystem.load(), CampaignSaveSystem.createDefaultProgress());
        assert.equal(CampaignSaveSystem.hasSave(), false);
        globalThis.window.localStorage = { getItem: (key) => (key === KEY ? '{"version":2}' : null), setItem: () => { throw new Error('full'); }, removeItem: () => {} };
        assert.deepEqual(CampaignSaveSystem.load(), CampaignSaveSystem.createDefaultProgress(), 'a failed backup write still returns default');
        globalThis.window.localStorage = { getItem: (key) => (key === KEY ? JSON.stringify(saveWith((s) => { s.roomId = 'hall'; })) : null), setItem: () => { throw new Error('full'); }, removeItem: () => {} };
        assert.equal(CampaignSaveSystem.load().level, 8, 'a failed repaired-backup write still returns the repaired save');
      } finally {
        globalThis.window.localStorage = real;
      }
    },
  },
  {
    name: 'hasSave_matches_what_load_recovers',
    run: () => {
      const repairable = [saveWith((s) => { s.flags['l8-lumo-room'] = 'lumo-seal'; }), saveWith((s) => { s.roomId = 'hall'; }), saveWith((s) => { s.counters['l8-lantern-x'] = 900; })];
      for (const value of repairable) {
        loadRaw(value);
        assert.equal(CampaignSaveSystem.hasSave(), true, 'a repairable save is a save');
        assert.equal(CampaignSaveSystem.load().level, 8, 'and load recovers it');
      }
      for (const raw of [JSON.stringify(saveWith((s) => { s.version = 2; })), '{"broken":', '', null]) {
        store = new Map();
        if (raw !== null) store.set(KEY, raw);
        assert.equal(CampaignSaveSystem.hasSave(), false, `${JSON.stringify(raw)} is not a save`);
      }
    },
  },
  {
    name: 'ending_beat_normalisation_still_applies_next_to_repairs',
    run: () => {
      assert.equal(readEndingBeat({}), 'night-call');
      assert.equal(readEndingBeat({ 'l9-ending-beat': 'seated' }), 'seated');
      const completed = loadRaw({ version: 1, level: 9, flags: { 'l9-complete': true, 'l9-ending-beat': 'bogus', 'l8-lumo-room': 'lumo-seal' }, counters: {}, lanternOn: false, lanternPickedUp: true });
      assert.equal(completed.flags['l9-ending-beat'], 'night-call', 'an invalid beat on a completed save restarts the ending');
      assert.equal('l8-lumo-room' in completed.flags, false, 'the Lumo repair applies to the same save');
      const unfinished = loadRaw({ version: 1, level: 9, flags: { 'l9-ending-beat': 'bogus' }, counters: {}, lanternOn: false, lanternPickedUp: false });
      assert.equal('l9-ending-beat' in unfinished.flags, false, 'an invalid beat on an unfinished save is dropped');
    },
  },
  {
    name: 'furthest_old_save_without_the_key_reads_as_level',
    run: () => {
      const progress = loadRaw({ version: 1, level: 4, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: true });
      assert.equal(progress.furthest, 4, 'a save without furthest reads as its level');
      assert.equal(store.has(BACKUP), false, 'a missing furthest is not a repair, so no backup');
    },
  },
  {
    name: 'furthest_below_level_is_raised_and_marked_repaired',
    run: () => {
      const progress = loadRaw({ version: 1, level: 5, furthest: 2, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: true });
      assert.equal(progress.furthest, 5, 'furthest below level is raised to level');
      assert.equal(store.has(BACKUP), true, 'a repaired furthest is backed up');
    },
  },
  {
    name: 'furthest_out_of_range_or_not_integer_becomes_level_and_marked_repaired',
    run: () => {
      for (const [bad, label] of [[12, 'above 9'], [4.5, 'not an integer'], ['7', 'not a number'], [null, 'null']]) {
        const progress = loadRaw({ version: 1, level: 3, furthest: bad, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: false });
        assert.equal(progress.furthest, 3, `furthest ${label} becomes level`);
        assert.equal(store.has(BACKUP), true, `furthest ${label} is marked repaired`);
      }
    },
  },
  {
    name: 'furthest_valid_value_is_kept_without_repair',
    run: () => {
      const progress = loadRaw({ version: 1, level: 3, furthest: 7, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: true });
      assert.equal(progress.furthest, 7);
      assert.equal(store.has(BACKUP), false, 'a valid furthest writes no backup');
    },
  },
  {
    name: 'furthest_round_trips_through_save_and_load',
    run: () => {
      store = new Map();
      CampaignSaveSystem.save({ ...CampaignSaveSystem.createDefaultProgress(), level: 6, furthest: 8, lanternPickedUp: true });
      const progress = CampaignSaveSystem.load();
      assert.equal(progress.level, 6);
      assert.equal(progress.furthest, 8, 'the furthest level survives a write and a read');
    },
  },
  {
    name: 'furthest_never_decreases_when_level_is_lower',
    run: () => {
      store = new Map();
      CampaignSaveSystem.save({ ...CampaignSaveSystem.createDefaultProgress(), level: 2, furthest: 5 });
      const progress = CampaignSaveSystem.load();
      assert.equal(progress.level, 2);
      assert.equal(progress.furthest, 5, 'going back to an earlier level keeps the furthest reached');
    },
  },
  {
    name: 'furthest_is_written_as_at_least_level_and_clamped',
    run: () => {
      store = new Map();
      CampaignSaveSystem.save({ ...CampaignSaveSystem.createDefaultProgress(), level: 4 });
      assert.equal(JSON.parse(store.get(KEY)).furthest, 4, 'an absent furthest is written as level');
      store = new Map();
      CampaignSaveSystem.save({ ...CampaignSaveSystem.createDefaultProgress(), level: 7, furthest: 3 });
      assert.equal(JSON.parse(store.get(KEY)).furthest, 7, 'a stale furthest below level is raised to level');
      store = new Map();
      CampaignSaveSystem.save({ ...CampaignSaveSystem.createDefaultProgress(), level: 9, furthest: 12 });
      assert.equal(JSON.parse(store.get(KEY)).furthest, 9, 'furthest is clamped to 9');
    },
  },
  {
    // Deliberately pinned to source: these are the consumer defaults the repairs rely on. The patterns allow spacing and
    // line-break changes, so a reformat does not break them; a change of behaviour must update the pattern here.
    name: 'consumer_defaults_the_repairs_rely_on_are_still_in_CampaignScene',
    run: () => {
      const scene = readFileSync(join(rootDir, 'src/scenes/CampaignScene.ts'), 'utf8');
      for (const [pattern, why] of [
        [/return\s+saved\s*===\s*'entrance'\s*\|\|\s*saved\s*===\s*'corridor'\s*\|\|\s*saved\s*===\s*'observatory'\s*\?\s*saved\s*:\s*'entrance';/, 'a missing Lumo room is the entrance'],
        [/if\s*\(\s*typeof raw !== 'string'\s*\|\|\s*!raw\s*\)\s*return\s+\[\];/, 'a missing route is no steps (free Lumo)'],
        [/this\.value\('l8-lantern-x'\)\s*\|\|\s*OBSERVATORY_ROOMS\.entrance\.interactables/, 'a missing lantern x is the pedestal'],
        [/this\.value\('l8-lantern-y'\)\s*\|\|\s*OBSERVATORY_ROOMS\.entrance\.interactables/, 'a missing lantern y is the pedestal'],
        [/this\.value\('l8-lumo-route-index'\)\s*<\s*steps\.length\s*\)\s*return\s+false;/, 'a route-less Lumo is free to follow Nhinh'],
        [/savedLumo\s*\?[^;]*'l8-lumo-x'[^;]*:\s*this\.lumoTarget\.x/, 'a level 09 Lumo without both saved axes uses his own default'],
        [/lumoRecalled:\s*flags\['l8-lumo-recalled'\]\s*===\s*true\s*\|\|\s*flags\['l8-lumo-arrived'\]\s*===\s*'lantern-source'/, 'a recall is the flag or an arrival at the lantern (see lumoRecalled above)'],
      ]) {
        assert.match(scene, pattern, `CampaignScene still defaults: ${why}`);
      }
      assert.doesNotMatch(scene, /setPosition\(this\.progress\.counters\['l8-lumo-x'\]\s*\?\?\s*this\.progress\.counters\['lumo-x'\]/,
        'the level 09 restore never falls back to the generic lumo-x/lumo-y');
    },
  },
];

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

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
delete globalThis.window;
console.log(`\ncampaign save: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
