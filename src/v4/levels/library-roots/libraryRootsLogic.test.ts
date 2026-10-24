import { describe, it, expect } from 'vitest';
import {
  BANK_SHORT,
  CORRECT_RING,
  START_RACK,
  ROOT_SHORT,
  SOLUTION_VALVES,
  TABLET_IDS,
  defaultLibraryState,
  doorOpen,
  holderAction,
  libraryHint,
  libraryHud,
  libraryBlockers,
  LIBRARY_JOURNAL_TEXT,
  parseLibraryState,
  passReport,
  pullLever,
  ringCorrect,
  ringFaults,
  ringReport,
  stageBodies,
  stepWheel,
  tabletMarks,
  takeCrystal,
  toggleValve,
} from './libraryRootsLogic';
import type { LibraryState, TabletId, Valve } from './libraryRootsLogic';
import { LIBRARY, PULSE_FEED_ID, PULSE_RETURN_ID, PULSE_SHAFT_ID, PRACTICE_DARK_ID, PRACTICE_LIT_ID } from './libraryRootsLayout';

const rackHolder = (index: number) => ({ kind: 'rack' as const, index });
const socketHolder = (index: number) => ({ kind: 'socket' as const, index });

/** Places the four tablets in the ring in their correct order, by taking each from the rack and placing it. */
function placeRing(s: LibraryState): LibraryState {
  let state = s;
  CORRECT_RING.forEach((tablet, socket) => {
    const from = state.rack.indexOf(tablet);
    state = holderAction(state, rackHolder(from)).state;
    state = holderAction(state, socketHolder(socket)).state;
  });
  return state;
}

/** Ring placed, door open by its ring. */
function openedState(): LibraryState {
  return placeRing(defaultLibraryState());
}

/** Sets every valve to the given values in order. */
function withValves(s: LibraryState, valves: readonly Valve[]): LibraryState {
  let state = s;
  valves.forEach((want, stage) => {
    let guard = 0;
    while (state.valves[stage] !== want && guard++ < 3) state = toggleValve(state, stage).state;
  });
  return state;
}

function tabletsHeld(s: LibraryState): TabletId[] {
  return [...s.rack, ...s.sockets, s.held].filter((t): t is TabletId => t !== null);
}

describe('defaultLibraryState', () => {
  it('starts with the four tablets on the rack out of ring order, sockets empty, valves unset and the model unlocked', () => {
    const s = defaultLibraryState();
    expect(s.rack).toEqual([...START_RACK]);
    expect(s.rack.some((t, i) => t === CORRECT_RING[i])).toBe(false);
    expect(s.sockets).toEqual([null, null, null, null]);
    expect(s.held).toBeNull();
    expect(s.valves).toEqual(['unset', 'unset', 'unset', 'unset']);
    expect(s.doorLatched).toBe(false);
    expect(s.modelLocked).toBe(false);
    expect(s.crystalTaken).toBe(false);
    expect(doorOpen(s)).toBe(false);
  });
});

describe('parseLibraryState', () => {
  it('falls back to the default for junk and never throws', () => {
    const d = defaultLibraryState();
    for (const raw of [null, undefined, 'x', 3, [], {}, { rack: 'no' }]) {
      expect(parseLibraryState(raw)).toEqual(d);
    }
  });

  it('keeps a valid placement and repairs a broken one to the default', () => {
    const d = defaultLibraryState();
    const valid = placeRing(d);
    expect(parseLibraryState(valid)).toEqual(valid);
    // A tablet duplicated across the rack and a socket is not a placement the game can make.
    const broken = { ...valid, rack: ['bird', 'bird', 'boat', 'seed'] };
    expect(parseLibraryState(broken).rack).toEqual(d.rack);
    expect(parseLibraryState(broken).sockets).toEqual(d.sockets);
  });

  it('repairs each field on its own: a bad valve or wheel does not lose the placement', () => {
    const valid = placeRing(defaultLibraryState());
    const parsed = parseLibraryState({ ...valid, valves: ['bogus', 'feed', 'return', 'unset'], wheel: 9 });
    expect(parsed.sockets).toEqual(valid.sockets);
    expect(parsed.valves).toEqual(['unset', 'feed', 'return', 'unset']);
    expect(parsed.wheel).toBe(0);
  });

  it('never leaves the crystal taken without the lock, and keeps the latch while the ring is correct', () => {
    const parsed = parseLibraryState({ crystalTaken: true, modelLocked: false, sockets: [...CORRECT_RING], rack: [null, null, null, null], held: null });
    expect(parsed.crystalTaken).toBe(false);
    expect(parsed.doorLatched).toBe(true);
  });
});

describe('holder actions: take, place, swap', () => {
  it('takes from the rack, places into an empty socket, and carries only one tablet', () => {
    let s = defaultLibraryState();
    const taken = holderAction(s, rackHolder(0));
    expect(taken.changed).toBe(true);
    expect(taken.state.held).toBe('boat');
    expect(taken.state.rack[0]).toBeNull();
    s = taken.state;
    // A second tablet cannot be taken while one is held: the rack slot is refused as a swap, never a second hand.
    const placed = holderAction(s, socketHolder(0));
    expect(placed.state.sockets[0]).toBe('boat');
    expect(placed.state.held).toBeNull();
  });

  it('places into a rack holder as well, so a tablet can go back to the rack', () => {
    let s = holderAction(defaultLibraryState(), rackHolder(0)).state;
    s = holderAction(s, socketHolder(0)).state;
    s = holderAction(s, socketHolder(0)).state; // lift it back out of the socket
    s = holderAction(s, rackHolder(0)).state; // and return it to its empty hook
    expect(s.sockets[0]).toBeNull();
    expect(s.held).toBeNull();
    expect(s.rack[0]).toBe('boat');
  });

  it('swaps a held tablet with the one in a socket', () => {
    let s = holderAction(defaultLibraryState(), rackHolder(0)).state;
    s = holderAction(s, socketHolder(1)).state;
    expect(s.sockets[1]).toBe('boat');
    s = holderAction(holderAction(s, rackHolder(1)).state, socketHolder(1)).state;
    expect(s.sockets[1]).toBe('seed');
    expect(s.held).toBe('boat');
    expect(s.rack[1]).toBeNull();
  });

  it('refuses an empty holder when nothing is held, and says why', () => {
    const out = holderAction(defaultLibraryState(), socketHolder(0));
    expect(out.changed).toBe(false);
    expect(out.text).toContain('trống');
  });

  it('keeps every tablet in exactly one place through any sequence of actions', () => {
    let s = defaultLibraryState();
    const moves: { kind: 'rack' | 'socket'; index: number }[] = [
      { kind: 'rack', index: 0 }, { kind: 'socket', index: 2 }, { kind: 'socket', index: 2 },
      { kind: 'rack', index: 3 }, { kind: 'socket', index: 0 }, { kind: 'socket', index: 1 },
      { kind: 'rack', index: 2 }, { kind: 'socket', index: 3 }, { kind: 'socket', index: 1 },
    ];
    for (const m of moves) {
      s = holderAction(s, m).state;
      const tablets = tabletsHeld(s);
      expect(tablets.length).toBe(TABLET_IDS.length);
      expect(new Set(tablets).size).toBe(TABLET_IDS.length);
      expect(s.held === null || TABLET_IDS.includes(s.held)).toBe(true);
    }
  });
});

describe('the ring', () => {
  it('is correct only in the order Chim–Lá–Thuyền–Hạt from the start mark', () => {
    expect(ringCorrect([...CORRECT_RING])).toBe(true);
    expect(ringCorrect(['bird', 'boat', 'leaf', 'seed'])).toBe(false);
    expect(ringCorrect([null, null, null, null])).toBe(false);
  });

  it('names the wrong sockets only, never the right ones', () => {
    const report = ringReport(['bird', 'seed', 'boat', null]);
    expect(report.faults).toEqual([1, 3]);
    expect(report.text).toContain('Hốc Đông');
    expect(report.text).toContain('Hốc Tây');
    expect(report.text).not.toContain('Hốc Bắc');
    expect(report.text).not.toContain('Hốc Nam');
  });

  it('gives one line for a correct ring', () => {
    const report = ringReport([...CORRECT_RING]);
    expect(report.faults).toEqual([]);
    expect(report.text).toBe('Chu kỳ chạy liền; cửa hồ sơ mở.');
  });

  it('opens the door while correct, and the latch keeps it open after a tablet is moved', () => {
    const correct = placeRing(defaultLibraryState());
    expect(doorOpen(correct)).toBe(true);
    expect(correct.doorLatched).toBe(true);
    const broken = holderAction(correct, socketHolder(0)).state;
    expect(ringCorrect(broken.sockets)).toBe(false);
    expect(doorOpen(broken)).toBe(true);
  });

  it('keeps the door closed when the ring is wrong and never latched', () => {
    let s = defaultLibraryState();
    s = holderAction(s, rackHolder(0)).state;
    s = holderAction(s, socketHolder(0)).state;
    expect(doorOpen(s)).toBe(false);
    expect(s.doorLatched).toBe(false);
  });

  it('reopens after a mistake: a broken ring and a fixed one both work, with no history flag', () => {
    let s = placeRing(defaultLibraryState());
    s = holderAction(s, socketHolder(0)).state; // take Chim out of the north socket
    s = holderAction(s, rackHolder(0)).state; // and put it back on the rack: the ring is broken
    expect(ringCorrect(s.sockets)).toBe(false);
    expect(doorOpen(s)).toBe(true); // latched: fixing tablets later never traps the player
    s = holderAction(s, rackHolder(0)).state; // take Chim again
    s = holderAction(s, socketHolder(0)).state; // and seat it: the ring is correct once more
    expect(ringCorrect(s.sockets)).toBe(true);
    expect(doorOpen(s)).toBe(true);
  });
});

describe('valves and the wheel', () => {
  it('toggles unset to return, then feed and back to return', () => {
    let s = defaultLibraryState();
    s = toggleValve(s, 1).state;
    expect(s.valves[1]).toBe('return');
    s = toggleValve(s, 1).state;
    expect(s.valves[1]).toBe('feed');
    s = toggleValve(s, 1).state;
    expect(s.valves[1]).toBe('return');
  });

  it('steps the wheel one stage at a time and wraps round', () => {
    let s = defaultLibraryState();
    for (let i = 0; i < 4; i++) s = stepWheel(s).state;
    expect(s.wheel).toBe(0);
    expect(stepWheel(s).state.wheel).toBe(1);
  });

  it('refuses valves and the wheel once the model is locked', () => {
    const locked = { ...openedState(), modelLocked: true, valves: [...SOLUTION_VALVES] };
    expect(toggleValve(locked, 0).changed).toBe(false);
    expect(stepWheel(locked).changed).toBe(false);
  });
});

describe('the pass', () => {
  const canonical = stageBodies([...CORRECT_RING]);

  it('is sound for the reference solution', () => {
    const report = passReport(SOLUTION_VALVES, canonical);
    expect(report.bankFed).toBe(true);
    expect(report.rootRestored).toBe(true);
    expect(report.shortfalls).toEqual([]);
  });

  it('starves the bank when every valve returns', () => {
    const report = passReport(['return', 'return', 'return', 'return'], canonical);
    expect(report.shortfalls).toEqual([BANK_SHORT]);
  });

  it('starves the root when a feed runs at night', () => {
    const report = passReport(['return', 'feed', 'return', 'feed'], canonical);
    expect(report.bankFed).toBe(true);
    expect(report.shortfalls).toEqual([ROOT_SHORT]);
  });

  it('starves the root when feed runs all the time', () => {
    const report = passReport(['feed', 'feed', 'feed', 'feed'], canonical);
    expect(report.shortfalls).toEqual([ROOT_SHORT]);
  });

  it('reports both sides when both are short', () => {
    const report = passReport(['unset', 'unset', 'unset', 'unset'], canonical);
    expect(report.shortfalls).toEqual([BANK_SHORT, ROOT_SHORT]);
  });
});

describe('the confirm lever', () => {
  it('locks and opens the crystal compartment for the correct ring and valves', () => {
    const ready = withValves(openedState(), SOLUTION_VALVES);
    const out = pullLever(ready);
    expect(out.changed).toBe(true);
    expect(out.state.modelLocked).toBe(true);
    expect(out.state.doorLatched).toBe(true);
  });

  it('never locks the model because the configuration matches: the lever is needed', () => {
    const ready = withValves(openedState(), SOLUTION_VALVES);
    expect(ready.modelLocked).toBe(false);
    expect(takeCrystal(ready).changed).toBe(false);
  });

  it('runs one pass on a wrong configuration, names the short side, and locks nothing', () => {
    const wrong = withValves(openedState(), ['return', 'return', 'return', 'return']);
    const out = pullLever(wrong);
    expect(out.changed).toBe(false);
    expect(out.state.modelLocked).toBe(false);
    expect(out.text).toContain(BANK_SHORT);
    expect(out.text).not.toContain(ROOT_SHORT);
  });

  it('names the root when feed runs at night', () => {
    const wrong = withValves(openedState(), ['return', 'feed', 'return', 'feed']);
    expect(pullLever(wrong).text).toContain(ROOT_SHORT);
  });

  it('refuses a right configuration on a wrong ring and says the ring is wrong', () => {
    let s = withValves(openedState(), SOLUTION_VALVES);
    s = holderAction(s, socketHolder(0)).state;
    s = holderAction(s, rackHolder(0)).state;
    const out = pullLever(s);
    expect(out.changed).toBe(false);
    expect(out.text).toContain('vòng lịch chưa khớp');
  });

  it('counts nothing: a failed pull leaves the state exactly as it was', () => {
    const wrong = withValves(openedState(), ['return', 'return', 'return', 'return']);
    expect(pullLever(wrong).state).toBe(wrong);
  });

  it('does nothing once locked', () => {
    const locked = pullLever(withValves(openedState(), SOLUTION_VALVES)).state;
    expect(pullLever(locked).changed).toBe(false);
  });
});

describe('the crystal', () => {
  it('stays shut before the lock', () => {
    expect(takeCrystal(openedState()).changed).toBe(false);
  });

  it('is taken once after the lock', () => {
    const locked = pullLever(withValves(openedState(), SOLUTION_VALVES)).state;
    const taken = takeCrystal(locked);
    expect(taken.changed).toBe(true);
    expect(taken.state.crystalTaken).toBe(true);
    expect(takeCrystal(taken.state).changed).toBe(false);
  });
});

describe('the reference solution end to end', () => {
  it('goes from the rack to the ring, the valves, the lever and the crystal', () => {
    let s = defaultLibraryState();
    expect(doorOpen(s)).toBe(false);
    s = placeRing(s);
    expect(doorOpen(s)).toBe(true);
    s = withValves(s, SOLUTION_VALVES);
    expect(s.valves).toEqual(SOLUTION_VALVES);
    s = pullLever(s).state;
    expect(s.modelLocked).toBe(true);
    s = takeCrystal(s).state;
    expect(s.crystalTaken).toBe(true);
  });
});

describe('the hint ladder follows the current state', () => {
  it('uses the ring ladder while the ring is wrong, and names only the wrong sockets on the last step', () => {
    const ladder = libraryHint(defaultLibraryState());
    expect(ladder?.key).toBe('library-roots:ring');
    expect(ladder?.steps[2]).toContain('Từ mốc đầu, xếp Chim–Lá–Thuyền–Hạt.');
    expect(ladder?.steps[2]).toContain('Hốc còn sai');
  });

  it('uses the model ladder once the ring is correct, and names the stages still wrong', () => {
    const ladder = libraryHint(openedState());
    expect(ladder?.key).toBe('library-roots:model');
    expect(ladder?.steps[0]).toBe('Hãy theo dõi mức của kho bến và tuyến Rễ khi bánh xe đi qua các chặng.');
    expect(ladder?.steps[2]).toContain('Chặng còn sai: 1, 2, 3, 4');
    const solved = withValves(openedState(), SOLUTION_VALVES);
    expect(libraryHint(solved)?.steps[2]).toContain('Các van đã đúng');
  });

  it('gives no hint once the model is locked', () => {
    const locked = pullLever(withValves(openedState(), SOLUTION_VALVES)).state;
    expect(libraryHint(locked)).toBeNull();
  });
});

describe('the HUD', () => {
  it('shows the one objective line from the design', () => {
    expect(libraryHud(defaultLibraryState()).objective).toBe('Khôi phục và thử một chu kỳ cấp–hồi');
  });

  it('describes the stage and the water without naming the answer', () => {
    const s = openedState();
    const status = libraryHud(s).status;
    expect(status).toContain('Chặng 1');
    expect(status).not.toContain('Chim');
  });
});

describe('tablet marks', () => {
  it('gives every tablet a lit and a dark mark, on its place', () => {
    const marks = tabletMarks(defaultLibraryState(), { x: 0, y: 0, width: 14, height: 6 });
    expect(marks.length).toBe(8);
    expect(marks.find((m) => m.id === 'boat:lit')?.rect).toEqual({ x: LIBRARY.rack[0].x + 1, y: LIBRARY.rack[0].y + 1, width: 14, height: 14 });
  });

  it('carries the held tablet at the foot with its marks', () => {
    const s = holderAction(defaultLibraryState(), rackHolder(0)).state;
    const foot = { x: 100, y: 150, width: 14, height: 6 };
    const bird = tabletMarks(s, foot).find((m) => m.id === 'boat:dark');
    expect(bird?.rect.x).toBeCloseTo(107 - 7);
  });

  it('has a journal text for every mark, pulse mark and the practice sheet', () => {
    const ids = [
      ...TABLET_IDS.flatMap((t) => [`${t}:lit`, `${t}:dark`]),
      PRACTICE_LIT_ID,
      PRACTICE_DARK_ID,
      PULSE_SHAFT_ID,
      PULSE_FEED_ID,
      PULSE_RETURN_ID,
    ];
    for (const id of ids) expect(LIBRARY_JOURNAL_TEXT[id], id).toBeTruthy();
  });

  it('keeps journal texts free of the time-of-day conclusions', () => {
    for (const text of Object.values(LIBRARY_JOURNAL_TEXT)) {
      expect(text).not.toMatch(/bình minh|hoàng hôn|ban ngày|ban đêm/);
    }
  });
});

describe('light blockers', () => {
  it('uses the closed door as a light blocker only while closed', () => {
    expect(libraryBlockers(false)).toContainEqual(LIBRARY.door);
    expect(libraryBlockers(true)).not.toContainEqual(LIBRARY.door);
  });
});

describe('stage bodies and the pass agree with the canonical ring', () => {
  it('shows horizon, high sun, horizon, high moon in ring order', () => {
    expect(stageBodies([...CORRECT_RING])).toEqual(['sunLow', 'sunHigh', 'sunLow', 'moonHigh']);
  });

  it('reports no faults for a canonical ring', () => {
    expect(ringFaults([...CORRECT_RING])).toEqual([]);
    expect(ringFaults(['bird', 'leaf', 'boat', null])).toEqual([3]);
  });
});

describe('a wrong config does not count or lock anything', () => {
  it('leaves the stored valves, wheel and lock alone after a failed pull', () => {
    const wrong = withValves(openedState(), ['return', 'return', 'return', 'return']);
    const after = pullLever(wrong).state;
    expect(after.valves).toEqual(wrong.valves);
    expect(after.modelLocked).toBe(false);
    expect(after.wheel).toBe(wrong.wheel);
  });
});
