import { describe, it, expect } from 'vitest';
import { initialLantern, placeLantern, pickUpLantern, toggleLantern } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { MOONLIT_CREEK, PEDESTAL_S_ID, DIAGRAM_ID, PIPE_BEN_WEST_ID, PIPE_RE_EAST_ID } from './moonlitCreekLayout';
import {
  INITIAL_CROSSINGS,
  LATCH_RELEASE_REFUSED,
  MOONLIT_JOURNAL_TEXT,
  PRESENTATION_MS,
  defaultMoonlitState,
  deriveMoonlit,
  driveG1,
  driveG2,
  exitMissing,
  moonlitHint,
  moonlitHud,
  parseMoonlitState,
  raySegments,
  rayFootprints,
  restoreA,
  restoreB,
  settleTest,
  stepCrossings,
  stepLatch,
  stepStop,
  stepTest,
  toggleN,
} from './moonlitCreekLogic';
import type { CrossingLive, MoonlitState, MoonlitView } from './moonlitCreekLogic';

const ON_S: LanternState = placeLantern(initialLantern(), PEDESTAL_S_ID)!;
const OFF_S: LanternState = toggleLantern(ON_S);
const HAND: LanternState = initialLantern();

const view = (s: MoonlitState, lantern: LanternState): MoonlitView => deriveMoonlit(s, lantern);

describe('defaults and parsing', () => {
  it('starts with the lantern in hand, G1 at A, G2 at B, both latches off, N closed, no test', () => {
    expect(defaultMoonlitState()).toEqual({ latchA: false, latchB: false, g1: 'A', g2: 'B', nOpen: false, test: 'idle' });
  });

  it('falls back to defaults for junk, never throws', () => {
    expect(parseMoonlitState(null)).toEqual(defaultMoonlitState());
    expect(parseMoonlitState('x')).toEqual(defaultMoonlitState());
    expect(parseMoonlitState([1, 2])).toEqual(defaultMoonlitState());
  });

  it('repairs each field on its own', () => {
    const s = parseMoonlitState({ latchA: true, latchB: 'yes', g1: 'Z', g2: 'T', nOpen: 1, test: 'bogus' });
    expect(s).toEqual({ latchA: true, latchB: false, g1: 'A', g2: 'T', nOpen: false, test: 'idle' });
  });

  it('brings a test saved mid-presentation back safe, with the catch on (04 §5)', () => {
    const s = parseMoonlitState({ latchA: true, latchB: true, g1: 'G2', g2: 'T', nOpen: true, test: 'running' });
    expect(s.test).toBe('safe');
    expect(s.nOpen).toBe(true);
  });
});

describe('deriving the network', () => {
  it('feeds nothing while the lantern is in hand', () => {
    const v = view(defaultMoonlitState(), HAND);
    expect(v.feeds).toBe(false);
    expect(v.bridgeALive).toBe(false);
  });

  it('feeds nothing while the lantern sits on S unlit', () => {
    expect(view(defaultMoonlitState(), OFF_S).feeds).toBe(false);
  });

  it('opens bridge A when on S, lit, and G1 aims A', () => {
    const v = view(defaultMoonlitState(), ON_S);
    expect(v.bridgeALive).toBe(true);
    expect(v.bridgeBLive).toBe(false);
    expect(v.testFed).toBe(false);
  });

  it('opens bridge B only when G1 aims G2 and G2 aims B', () => {
    expect(view({ ...defaultMoonlitState(), g1: 'G2' }, ON_S).bridgeBLive).toBe(true);
    expect(view({ ...defaultMoonlitState(), g1: 'G2', g2: 'T' }, ON_S).bridgeBLive).toBe(false);
  });

  it('feeds T only when G1 aims G2 and G2 aims T', () => {
    expect(view({ ...defaultMoonlitState(), g1: 'G2', g2: 'T' }, ON_S).testFed).toBe(true);
    expect(view({ ...defaultMoonlitState(), g1: 'A', g2: 'T' }, ON_S).testFed).toBe(false);
  });

  it('keeps a bridge open through its latch with the network dark', () => {
    const v = view({ ...defaultMoonlitState(), latchA: true }, HAND);
    expect(v.bridgeALive).toBe(false);
    expect(v.bridgeAOpen).toBe(true);
  });
});

describe('rays and crossings', () => {
  it('draws only S→G1 while G1 aims A and the lantern is off', () => {
    expect(raySegments(defaultMoonlitState(), view(defaultMoonlitState(), OFF_S))).toEqual([]);
    expect(raySegments(defaultMoonlitState(), view(defaultMoonlitState(), ON_S))).toHaveLength(2);
  });

  it('draws the full chain S→G1→G2→T when routed to the test station', () => {
    const s = { ...defaultMoonlitState(), g1: 'G2' as const, g2: 'T' as const };
    expect(raySegments(s, view(s, ON_S))).toHaveLength(3);
    expect(rayFootprints(s, view(s, ON_S))).toHaveLength(3);
  });

  it('keeps a bridge walkable while a foot stays on its deck (stepBridge)', () => {
    const v = view(defaultMoonlitState(), HAND);
    const onDeck = { x: MOONLIT_CREEK.deckA.x + 10, y: MOONLIT_CREEK.deckA.y + 4, width: 14, height: 6 };
    const off = { x: 0, y: 0, width: 14, height: 6 };
    const open: CrossingLive = { a: true, b: false };
    const closed = stepCrossings(open, { ...v, bridgeAOpen: false }, onDeck);
    expect(closed.a).toBe(true);
    expect(stepCrossings(closed, { ...v, bridgeAOpen: false }, off).a).toBe(false);
    expect(stepCrossings(INITIAL_CROSSINGS, { ...v, bridgeAOpen: false }, onDeck).a).toBe(false);
  });
});

describe('the drive and restore cranks', () => {
  it('toggles G1 between A and G2 and G2 between B and T', () => {
    const s1 = driveG1(defaultMoonlitState()).state;
    expect(s1.g1).toBe('G2');
    expect(driveG1(s1).state.g1).toBe('A');
    const s2 = driveG2(defaultMoonlitState()).state;
    expect(s2.g2).toBe('T');
  });

  it('refuses restore A when G1 already aims A, and says so', () => {
    const out = restoreA(defaultMoonlitState());
    expect(out.ok).toBe(false);
    expect(out.message).toContain('đã hướng cầu A');
  });

  it('restore A brings G1 back to A without engaging any latch', () => {
    const s: MoonlitState = { ...defaultMoonlitState(), g1: 'G2', latchA: false };
    const out = restoreA(s);
    expect(out.ok).toBe(true);
    expect(out.state.g1).toBe('A');
    expect(out.state.latchA).toBe(false);
  });

  it('restore B aims G1 at G2 and G2 at B in one step', () => {
    const out = restoreB({ ...defaultMoonlitState(), g1: 'A', g2: 'T' });
    expect(out.state.g1).toBe('G2');
    expect(out.state.g2).toBe('B');
  });

  it('refuses restore B when that route is already set', () => {
    const out = restoreB({ ...defaultMoonlitState(), g1: 'G2', g2: 'B' });
    expect(out.ok).toBe(false);
  });
});

describe('latches', () => {
  it('engages only while the bridge is live', () => {
    const out = stepLatch(defaultMoonlitState(), 'A', false, true);
    expect(out.ok).toBe(false);
    expect(out.message).toContain('chưa mở thật');
    const ok = stepLatch(defaultMoonlitState(), 'A', true, true);
    expect(ok.ok).toBe(true);
    expect(ok.state.latchA).toBe(true);
  });

  it('releases freely when the lantern sits on S', () => {
    const engaged = { ...defaultMoonlitState(), latchB: true };
    const out = stepLatch(engaged, 'B', false, true);
    expect(out.ok).toBe(true);
    expect(out.state.latchB).toBe(false);
  });

  it('refuses to release while the lantern is not on S, and says why', () => {
    const engaged = { ...defaultMoonlitState(), latchA: true };
    const out = stepLatch(engaged, 'A', false, false);
    expect(out.ok).toBe(false);
    expect(out.state.latchA).toBe(true);
    expect(out.message).toBe(LATCH_RELEASE_REFUSED);
  });

  it('every bridge released with the lantern on S opens again from the far side', () => {
    // Release A while G1 aims G2: A closes; the island drive brings G1 back to A.
    let s: MoonlitState = { ...defaultMoonlitState(), latchA: true, latchB: true, g1: 'G2' };
    s = stepLatch(s, 'A', false, true).state;
    expect(view(s, ON_S).bridgeAOpen).toBe(false);
    expect(view(driveG1(s).state, ON_S).bridgeAOpen).toBe(true);
    // Release B while G1 aims A: B closes; restore B on the East bank routes G1 to G2 and G2 to B.
    s = { ...defaultMoonlitState(), latchA: true, latchB: true, g1: 'A', g2: 'T' };
    s = stepLatch(s, 'B', false, true).state;
    expect(view(s, ON_S).bridgeBOpen).toBe(false);
    expect(view(restoreB(s).state, ON_S).bridgeBOpen).toBe(true);
  });

  it('latch A holds bridge A open after G1 leaves A (independent of the ray)', () => {
    const s = { ...defaultMoonlitState(), latchA: true, g1: 'G2' as const };
    expect(view(s, ON_S).bridgeAOpen).toBe(true);
    expect(view(s, HAND).bridgeAOpen).toBe(true);
  });
});

describe('the one sample at T', () => {
  const fedNoValve: MoonlitState = { ...defaultMoonlitState(), g1: 'G2', g2: 'T' };
  const ready: MoonlitState = { ...fedNoValve, nOpen: true };

  it('does not start without power, and says so, without consuming the sample', () => {
    const out = stepTest(defaultMoonlitState(), view(defaultMoonlitState(), ON_S));
    expect(out.ok).toBe(false);
    expect(out.state.test).toBe('idle');
    expect(out.message).toContain('chưa nhận nguồn đúng tuyến');
  });

  it('does not start with N closed, and says so', () => {
    const out = stepTest(fedNoValve, view(fedNoValve, ON_S));
    expect(out.ok).toBe(false);
    expect(out.message).toContain('van hồi N đang đóng');
    expect(out.state.test).toBe('idle');
  });

  it('records the pair and starts the presentation on the first valid E', () => {
    const out = stepTest(ready, view(ready, ON_S));
    expect(out.ok).toBe(true);
    expect(out.state.test).toBe('running');
    expect(out.message).toContain('Bến tăng');
    expect(out.message).toContain('Rễ hạ');
  });

  it('only shows the recorded pair once the test is safe, and never restarts', () => {
    const safe: MoonlitState = { ...ready, test: 'safe' };
    const out = stepTest(safe, view(safe, ON_S));
    expect(out.ok).toBe(false);
    expect(out.state.test).toBe('safe');
    expect(out.message).toContain('Kết quả đã ghi');
  });

  it('a second E while running does nothing', () => {
    const running: MoonlitState = { ...ready, test: 'running' };
    expect(stepTest(running, view(running, ON_S)).ok).toBe(false);
  });

  it('after a refusal, the same sample is still available once power and N are right', () => {
    const first = stepTest(fedNoValve, view(fedNoValve, ON_S));
    expect(first.state.test).toBe('idle');
    const second = stepTest({ ...first.state, nOpen: true }, view({ ...first.state, nOpen: true }, ON_S));
    expect(second.ok).toBe(true);
  });
});

describe('stopping, power loss and N during the presentation', () => {
  const running: MoonlitState = { ...defaultMoonlitState(), g1: 'G2', g2: 'T', nOpen: true, test: 'running' };

  it('the presentation ends safe when its time runs out', () => {
    expect(settleTest(running, view(running, ON_S), true).test).toBe('safe');
    expect(PRESENTATION_MS).toBeGreaterThan(0);
  });

  it('the stop button ends it early and leaves N as it was', () => {
    const out = stepStop(running);
    expect(out.ok).toBe(true);
    expect(out.state.test).toBe('safe');
    expect(out.state.nOpen).toBe(true);
  });

  it('the stop button says so when no test runs', () => {
    const out = stepStop(defaultMoonlitState());
    expect(out.ok).toBe(false);
    expect(out.message).toContain('Không có trình bày');
  });

  it('losing test power (lantern off on S) settles the test safe', () => {
    expect(settleTest(running, view(running, OFF_S), false).test).toBe('safe');
  });

  it('closing N settles the test safe, and N stays closed', () => {
    const closed: MoonlitState = { ...running, nOpen: false };
    const v = view(closed, ON_S);
    expect(settleTest(closed, v, false).test).toBe('safe');
    expect(settleTest(closed, v, false).nOpen).toBe(false);
  });

  it('leaves a running test alone while it still has power, N is open and time remains', () => {
    expect(settleTest(running, view(running, ON_S), false)).toBe(running);
  });

  it('after a settle, reopening N does not restart the test', () => {
    const safe = settleTest(running, view(running, OFF_S), false);
    const reopened = toggleN({ ...safe, nOpen: false });
    expect(reopened.state.nOpen).toBe(true);
    expect(stepTest(reopened.state, view(reopened.state, ON_S)).ok).toBe(false);
  });

  it('a reload during the presentation comes back safe with the pair kept', () => {
    const saved = { ...running, test: 'running' as const };
    const loaded = parseMoonlitState(saved);
    expect(loaded.test).toBe('safe');
  });

  it('closing N through E makes the valve toggle and reports it', () => {
    const out = toggleN(defaultMoonlitState());
    expect(out.state.nOpen).toBe(true);
    expect(out.message).toBe('Van hồi N mở.');
  });
});

describe('exit', () => {
  const ready: MoonlitState = { ...defaultMoonlitState(), g1: 'G2', g2: 'T', nOpen: true, test: 'safe' };

  it('is ready only with a sample, T safe, N open and the lantern in hand', () => {
    expect(exitMissing(ready, true)).toBeNull();
  });

  it('names the missing sample first', () => {
    expect(exitMissing({ ...ready, test: 'idle' }, true)).toBe('Chưa có mẫu thử tại trạm T.');
  });

  it('names T not yet safe', () => {
    expect(exitMissing({ ...ready, test: 'running' }, true)).toBe('Trạm T chưa về tải thấp.');
  });

  it('names N closed', () => {
    expect(exitMissing({ ...ready, nOpen: false }, true)).toContain('Van hồi N đang đóng');
  });

  it('names the lantern not in hand', () => {
    expect(exitMissing(ready, false)).toContain('Đèn chưa ở tay');
  });

  it('does not check any history flag: latches and journal are not needed', () => {
    expect(exitMissing({ ...ready, latchA: false, latchB: false }, true)).toBeNull();
  });
});

describe('the full reference solution, end to end', () => {
  it('reaches the exit by the physical route, with every state in the doc\'s order', () => {
    let s = defaultMoonlitState();
    let lantern = HAND;

    // 1. Place the lantern on S, lit: G1 aims A, so bridge A opens.
    lantern = placeLantern(lantern, PEDESTAL_S_ID)!;
    expect(view(s, lantern).bridgeAOpen).toBe(true);

    // 2. On the island: G1 to G2 so bridge B opens.
    s = driveG1(s).state;
    expect(view(s, lantern).bridgeBOpen).toBe(true);

    // 3. At the East bank: latch B engages while B is live.
    let out = stepLatch(s, 'B', view(s, lantern).bridgeBLive, true);
    expect(out.ok).toBe(true);
    s = out.state;

    // 4. Back on the island over latched B: G1 to A, so bridge A is fed again.
    s = driveG1(s).state;
    expect(view(s, lantern).bridgeALive).toBe(true);

    // 5. At the East bank: latch A engages from afar while A is fed.
    out = stepLatch(s, 'A', view(s, lantern).bridgeALive, true);
    expect(out.ok).toBe(true);
    s = out.state;

    // 6. Back on the island: G1 to G2, G2 to T, then N open, then the sample.
    s = driveG1(s).state;
    s = driveG2(s).state;
    expect(view(s, lantern).testFed).toBe(true);
    s = toggleN(s).state;
    out = stepTest(s, view(s, lantern));
    expect(out.ok).toBe(true);
    s = out.state;

    // 7. The presentation runs out: T goes safe with the catch on.
    s = settleTest(s, view(s, lantern), true);
    expect(s.test).toBe('safe');

    // 8. Walk back to West, take the lantern, carry it over both latched bridges.
    lantern = pickUpLantern(lantern, PEDESTAL_S_ID)!;
    expect(lantern.location.at).toBe('hand');
    expect(s.latchA && s.latchB).toBe(true);
    expect(exitMissing(s, lantern.location.at === 'hand')).toBeNull();
  });

  it('a stop early still passes the exit, with the pair recorded', () => {
    const s: MoonlitState = { ...defaultMoonlitState(), g1: 'G2', g2: 'T', nOpen: true, test: 'running' };
    const stopped = stepStop(s).state;
    expect(exitMissing(stopped, true)).toBeNull();
  });
});

describe('recovery cases', () => {
  it('reopens a latch after a mistaken release, with no history flag', () => {
    let s = { ...defaultMoonlitState(), latchB: true };
    s = stepLatch(s, 'B', false, true).state;
    expect(s.latchB).toBe(false);
    const again = stepLatch(s, 'B', true, true);
    expect(again.ok).toBe(true);
    expect(again.state.latchB).toBe(true);
  });

  it('a lantern taken early can be placed back on S, and the network is live again', () => {
    const lantern = pickUpLantern(placeLantern(HAND, PEDESTAL_S_ID)!, PEDESTAL_S_ID)!;
    expect(view(defaultMoonlitState(), lantern).feeds).toBe(false);
    const back = placeLantern(lantern, PEDESTAL_S_ID)!;
    expect(view(defaultMoonlitState(), back).bridgeALive).toBe(true);
  });

  it('F from afar turns the network off and on without touching any state', () => {
    const s = { ...defaultMoonlitState(), latchA: true };
    expect(view(s, ON_S).feeds).toBe(true);
    expect(view(s, OFF_S).feeds).toBe(false);
    expect(view(s, toggleLantern(OFF_S)).feeds).toBe(true);
    expect(view(s, OFF_S).bridgeAOpen).toBe(true);
  });

  it('the stranded island case is served by the drive cranks, not by the lantern in hand', () => {
    // Lantern in hand with both latches off would strand Nhinh; the release rule prevents that path.
    const s = { ...defaultMoonlitState(), latchA: true, latchB: true };
    expect(stepLatch(s, 'A', false, false).ok).toBe(false);
    expect(stepLatch(s, 'B', false, false).ok).toBe(false);
  });
});

describe('hint ladder per stage', () => {
  it('uses the doc\'s three levels before the sample, computed from the state', () => {
    const ladder = moonlitHint(defaultMoonlitState());
    expect(ladder.key).toBe('moonlit:sample');
    expect(ladder.steps).toHaveLength(3);
    expect(ladder.steps[2]).toContain('E hợp lệ đầu tiên tại T ghi cặp kết quả');
  });

  it('switches to the running ladder while the presentation runs', () => {
    const ladder = moonlitHint({ ...defaultMoonlitState(), test: 'running' });
    expect(ladder.key).toBe('moonlit:running');
    expect(ladder.steps).toHaveLength(3);
  });

  it('switches to the after-sample ladder once the test is safe', () => {
    const ladder = moonlitHint({ ...defaultMoonlitState(), test: 'safe' });
    expect(ladder.key).toBe('moonlit:after');
    expect(ladder.steps[2]).toContain('lối ra Đông');
  });

  it('never tells the player the solution in the first level', () => {
    const first = moonlitHint(defaultMoonlitState()).steps[0];
    expect(first).not.toMatch(/quay|gài/);
  });
});

describe('HUD lines', () => {
  it('follows the doc\'s objective sequence', () => {
    const v = view(defaultMoonlitState(), ON_S);
    expect(moonlitHud(defaultMoonlitState(), v, ON_S).objective).toBe('Kiểm tra tuyến Bến và tuyến Rễ');
    expect(moonlitHud({ ...defaultMoonlitState(), test: 'running' }, v, ON_S).objective).toBe('Đưa trạm thử về mức an toàn');
    expect(moonlitHud({ ...defaultMoonlitState(), test: 'safe' }, v, ON_S).objective).toBe('Mở van hồi N');
    const open = { ...defaultMoonlitState(), test: 'safe' as const, nOpen: true };
    expect(moonlitHud(open, v, HAND).objective).toBe('Thu đèn và tiếp tục tới tháp');
  });
});

describe('journal text', () => {
  it('has text for the diagram and every pipe mark, and the pipe marks name their branch', () => {
    expect(MOONLIT_JOURNAL_TEXT[DIAGRAM_ID]).toContain('Bến');
    expect(MOONLIT_JOURNAL_TEXT[PIPE_BEN_WEST_ID]).toContain('Bến');
    expect(MOONLIT_JOURNAL_TEXT[PIPE_RE_EAST_ID]).toContain('Rễ');
  });
});
