import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { initialLantern, lanternFeeds, placeLantern, toggleLantern } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { groundPoint, lanternFootprints } from '../../core/light';
import {
  FOREST_EDGE,
  FOREST_EDGE_LIGHT_MARKS,
  FOREST_EDGE_PULSE_MARKS,
  BRACE_B_ID,
  LAMP_REST_ID,
  LATCH_A_ID,
  MIDDLE_CHECKPOINT_ID,
  S1_ID,
  S2_ID,
  SPROUT_ID,
  YARD_CHECKPOINT_ID,
} from './forestEdgeLayout';
import {
  CUE_EVENT,
  CUE_LINES,
  FOREST_EDGE_JOURNAL_TEXT,
  HINGE_PHASES,
  INITIAL_FOREST_LIVE,
  REFUSE_BRACE_B,
  REFUSE_LAMP_GONE,
  REFUSE_LAMP_ON_GROUND,
  REFUSE_LANTERN_ELSEWHERE,
  REFUSE_LATCH_A,
  defaultForestEdgeState,
  deriveForestEdge,
  forestEdgeHint,
  forestEdgeFocus,
  forestEdgeHud,
  forestExitReady,
  lampOnGround,
  lanternAtPedestal,
  nextHingePhase,
  parseForestEdgeState,
  pendingCue,
  stepDoors,
  takeLampFromRest,
  toggleBraceB,
  toggleLatchA,
} from './forestEdgeLogic';
import type { ForestEdgeLive, ForestEdgeState } from './forestEdgeLogic';

/** The lantern in hand and on: where a new game starts. */
const HAND_ON: LanternState = initialLantern();
/** On S1. */
const ON_S1: LanternState = placeLantern(HAND_ON, S1_ID)!;
/** On S2. */
const ON_S2: LanternState = placeLantern(HAND_ON, S2_ID)!;
/** Off on S1. */
const OFF_S1: LanternState = toggleLantern(ON_S1);

/** The spawn point of a checkpoint in the layout. */
function spawnOf(id: string) {
  const checkpoint = FOREST_EDGE.checkpoints.find(c => c.id === id);
  if (!checkpoint) throw new Error(`no checkpoint ${id}`);
  return checkpoint.spawn;
}

/** Feet (foot rects) used across the tests, by where Nhinh stands. */
const FOOT_YARD = footRectAt(spawnOf(YARD_CHECKPOINT_ID));
/** Foot overlapping threshold A (foot 14x6 at x 349..363, y 206..212 is inside 336..376 x 182..222). */
const FOOT_IN_A = footRectAt({ x: 356, y: 190 });
/** Foot in the middle yard, clear of both thresholds. */
const FOOT_MIDDLE = footRectAt(spawnOf(MIDDLE_CHECKPOINT_ID));
/** Foot overlapping threshold B on the middle side (foot at x 473..487, y 46..52 is inside 456..504 x 28..60). */
const FOOT_IN_B = footRectAt({ x: 480, y: 30 });
/** Foot in the exit zone beyond gate B (foot at x 473..487, y 10..16 is inside 456..504 x 0..20). */
const FOOT_EXIT = footRectAt({ x: 480, y: -6 });

const DEFAULT = defaultForestEdgeState();
const LATCHED: ForestEdgeState = { latchA: true, braceB: false };
const BRACED: ForestEdgeState = { latchA: true, braceB: true };

const CLOSED: ForestEdgeLive = INITIAL_FOREST_LIVE;
const A_OPEN: ForestEdgeLive = { doorAOpen: true, gateBOpen: false };
const B_OPEN: ForestEdgeLive = { doorAOpen: false, gateBOpen: true };

/** One frame of the doors. */
function frame(prev: ForestEdgeLive, state: ForestEdgeState, lantern: LanternState, foot = FOOT_YARD): ForestEdgeLive {
  return stepDoors(prev, state, lantern, foot);
}

describe('forest edge defaults and parsing', () => {
  it('starts with latch A and brace B not engaged', () => {
    expect(defaultForestEdgeState()).toEqual({ latchA: false, braceB: false });
  });

  it('repairs junk to the defaults without throwing', () => {
    for (const raw of [null, undefined, 'x', 42, [], [true]]) {
      expect(parseForestEdgeState(raw)).toEqual(DEFAULT);
    }
  });

  it('keeps a boolean field and repairs the other one field by field', () => {
    expect(parseForestEdgeState({ latchA: true })).toEqual({ latchA: true, braceB: false });
    expect(parseForestEdgeState({ braceB: true, latchA: 'yes' })).toEqual({ latchA: false, braceB: true });
  });

  it('ignores unknown keys', () => {
    expect(parseForestEdgeState({ latchA: true, hinge: 2, extra: 'x' })).toEqual({ latchA: true, braceB: false });
  });
});

describe('forest edge doors', () => {
  it('keeps both doors closed with the lantern in hand, on or off', () => {
    expect(frame(CLOSED, DEFAULT, HAND_ON)).toEqual(CLOSED);
    expect(frame(CLOSED, DEFAULT, toggleLantern(HAND_ON))).toEqual(CLOSED);
  });

  it('opens door A while S1 is fed, and only S1 feeds it', () => {
    expect(frame(CLOSED, DEFAULT, ON_S1).doorAOpen).toBe(true);
    expect(frame(CLOSED, DEFAULT, ON_S2).doorAOpen).toBe(false);
  });

  it('opens gate B while S2 is fed, and only S2 feeds it', () => {
    expect(frame(CLOSED, DEFAULT, ON_S2).gateBOpen).toBe(true);
    expect(frame(CLOSED, DEFAULT, ON_S1).gateBOpen).toBe(false);
  });

  it('closes a fed door when the lantern is off', () => {
    expect(frame(A_OPEN, DEFAULT, OFF_S1, FOOT_YARD).doorAOpen).toBe(false);
  });

  it('keeps door A open while a foot holds its threshold after the feed is gone', () => {
    const held = frame(A_OPEN, DEFAULT, OFF_S1, FOOT_IN_A);
    expect(held.doorAOpen).toBe(true);
    expect(frame(held, DEFAULT, OFF_S1, FOOT_MIDDLE).doorAOpen).toBe(false);
  });

  it('does not open a closed door for a foot in its threshold alone', () => {
    expect(frame(CLOSED, DEFAULT, HAND_ON, FOOT_IN_A).doorAOpen).toBe(false);
  });

  it('keeps door A open after the lantern leaves S1 when latch A holds it', () => {
    expect(frame(CLOSED, LATCHED, HAND_ON, FOOT_MIDDLE).doorAOpen).toBe(true);
  });

  it('keeps gate B open after the lantern leaves S2 when brace B holds it', () => {
    expect(frame(CLOSED, BRACED, HAND_ON, FOOT_MIDDLE).gateBOpen).toBe(true);
    expect(frame(CLOSED, { latchA: false, braceB: true }, HAND_ON, FOOT_MIDDLE).gateBOpen).toBe(true);
  });

  it('keeps gate B open for a foot in its threshold until the foot is clear', () => {
    const held = frame(B_OPEN, LATCHED, OFF_S1, FOOT_IN_B);
    expect(held.gateBOpen).toBe(true);
    expect(frame(held, LATCHED, OFF_S1, FOOT_EXIT).gateBOpen).toBe(false);
  });
});

describe('forest edge latch A and brace B', () => {
  it('refuses to engage latch A while door A is closed, and says why', () => {
    const outcome = toggleLatchA(DEFAULT, false);
    expect(outcome).toEqual({ ok: false, reason: REFUSE_LATCH_A });
  });

  it('engages latch A while door A is open, and writes the state', () => {
    const outcome = toggleLatchA(DEFAULT, true);
    expect(outcome).toEqual({ ok: true, value: { latchA: true, braceB: false } });
  });

  it('always releases latch A, even with the door closed', () => {
    expect(toggleLatchA(LATCHED, false)).toEqual({ ok: true, value: { latchA: false, braceB: false } });
  });

  it('refuses to engage brace B while gate B is closed, and says why', () => {
    expect(toggleBraceB(DEFAULT, false)).toEqual({ ok: false, reason: REFUSE_BRACE_B });
  });

  it('engages brace B while gate B is open, and always releases it', () => {
    expect(toggleBraceB(LATCHED, true)).toEqual({ ok: true, value: { latchA: true, braceB: true } });
    expect(toggleBraceB(BRACED, false)).toEqual({ ok: true, value: { latchA: true, braceB: false } });
  });

  it('keeps the two latches independent', () => {
    expect(toggleBraceB(LATCHED, false).ok).toBe(false);
    expect(toggleLatchA(BRACED, true)).toEqual({ ok: true, value: { latchA: false, braceB: true } });
  });
});

describe('forest edge lantern at the pedestals', () => {
  it('places the lantern from hand on S1, with its lit state kept', () => {
    expect(lanternAtPedestal(HAND_ON, S1_ID)).toEqual({ ok: true, value: ON_S1 });
    expect(lanternAtPedestal(toggleLantern(HAND_ON), S1_ID)).toEqual({
      ok: true,
      value: { location: { at: 'pedestal', pedestalId: S1_ID }, on: false },
    });
  });

  it('takes the lantern back from the pedestal it sits on', () => {
    expect(lanternAtPedestal(ON_S1, S1_ID)).toEqual({ ok: true, value: HAND_ON });
  });

  it('refuses when the lantern sits on the other pedestal, and says so', () => {
    expect(lanternAtPedestal(ON_S2, S1_ID)).toEqual({ ok: false, reason: REFUSE_LANTERN_ELSEWHERE });
    expect(lanternAtPedestal(ON_S1, S2_ID)).toEqual({ ok: false, reason: REFUSE_LANTERN_ELSEWHERE });
  });

  it('never feeds a door from the hand, however often it is placed and taken back', () => {
    const back = lanternAtPedestal(ON_S1, S1_ID);
    expect(back.ok).toBe(true);
    if (back.ok) expect(frame(CLOSED, DEFAULT, back.value).doorAOpen).toBe(false);
  });
});

describe('forest edge reference solution end to end', () => {
  it('opens every door in the one order the doc gives, and leaves through gate B', () => {
    // 1. Lantern on S1 opens door A. Nhinh crosses it.
    let live = frame(CLOSED, DEFAULT, ON_S1, FOOT_YARD);
    expect(live.doorAOpen).toBe(true);
    live = frame(live, DEFAULT, ON_S1, FOOT_IN_A);
    live = frame(live, DEFAULT, ON_S1, FOOT_MIDDLE);

    // 2. From the middle yard, latch A is engaged while door A is open.
    let state = DEFAULT;
    const latch = toggleLatchA(state, live.doorAOpen);
    expect(latch.ok).toBe(true);
    if (latch.ok) state = latch.value;

    // 3. Back in the entry yard, the lantern comes off S1; latch A keeps door A open.
    live = frame(live, state, ON_S1, FOOT_YARD);
    const taken = lanternAtPedestal(ON_S1, S1_ID);
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;
    let lantern = taken.value;
    live = frame(live, state, lantern, FOOT_IN_A);
    expect(live.doorAOpen).toBe(true);
    live = frame(live, state, lantern, FOOT_MIDDLE);
    expect(live.doorAOpen).toBe(true);

    // 4. The lantern goes on S2, gate B opens; brace B is engaged from the middle yard.
    const placed = lanternAtPedestal(lantern, S2_ID);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    lantern = placed.value;
    live = frame(live, state, lantern, FOOT_MIDDLE);
    expect(live.gateBOpen).toBe(true);
    const brace = toggleBraceB(state, live.gateBOpen);
    expect(brace.ok).toBe(true);
    if (brace.ok) state = brace.value;

    // 5. The lantern comes back into hand; brace B keeps gate B open; Nhinh walks out.
    const back = lanternAtPedestal(lantern, S2_ID);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    lantern = back.value;
    live = frame(live, state, lantern, FOOT_MIDDLE);
    expect(live.gateBOpen).toBe(true);
    live = frame(live, state, lantern, FOOT_EXIT);
    expect(forestExitReady(live, lantern, FOOT_EXIT)).toBe(true);
    expect(deriveForestEdge(state, lantern, live).stage).toBe('done');
  });
});

describe('forest edge mistakes and recovery', () => {
  it('lets the player take the lantern off S1 before latching, and the door closes once clear', () => {
    let live = frame(CLOSED, DEFAULT, ON_S1, FOOT_IN_A);
    expect(live.doorAOpen).toBe(true);
    live = frame(live, DEFAULT, HAND_ON, FOOT_YARD);
    expect(live.doorAOpen).toBe(false);
  });

  it('keeps door A open for a foot in its threshold while the lantern goes off there', () => {
    const live = frame(frame(CLOSED, DEFAULT, ON_S1, FOOT_YARD), DEFAULT, OFF_S1, FOOT_IN_A);
    expect(live.doorAOpen).toBe(true);
  });

  it('reopens door A from the middle yard by lighting the lantern on S1 again', () => {
    const offFromMiddle = frame(A_OPEN, DEFAULT, OFF_S1, FOOT_MIDDLE);
    expect(offFromMiddle.doorAOpen).toBe(false);
    const relit = frame(offFromMiddle, DEFAULT, toggleLantern(OFF_S1), FOOT_MIDDLE);
    expect(relit.doorAOpen).toBe(true);
  });

  it('lets latch A be engaged again after a release, while the door is open', () => {
    const released = toggleLatchA(LATCHED, true);
    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(released.value.latchA).toBe(false);
    const again = toggleLatchA(released.value, true);
    expect(again).toEqual({ ok: true, value: LATCHED });
  });

  it('engages latch A while door A is held open by a foot, with no feed', () => {
    const held = frame(A_OPEN, DEFAULT, HAND_ON, FOOT_IN_A);
    expect(held.doorAOpen).toBe(true);
    expect(toggleLatchA(DEFAULT, held.doorAOpen).ok).toBe(true);
  });

  it('keeps the lantern state across a refused latch, so nothing else changes', () => {
    const refused = toggleLatchA(DEFAULT, false);
    expect(refused.ok).toBe(false);
    expect(DEFAULT).toEqual({ latchA: false, braceB: false });
  });
});

describe('forest edge exit', () => {
  it('is ready only with gate B open and the lantern in hand', () => {
    expect(forestExitReady(B_OPEN, HAND_ON, FOOT_EXIT)).toBe(true);
    expect(forestExitReady(B_OPEN, ON_S2, FOOT_EXIT)).toBe(false);
    expect(forestExitReady(CLOSED, HAND_ON, FOOT_EXIT)).toBe(false);
    expect(forestExitReady(B_OPEN, HAND_ON, FOOT_MIDDLE)).toBe(false);
  });
});

describe('forest edge cues', () => {
  const none = () => false;
  const played = (...cues: (keyof typeof CUE_EVENT)[]) => (id: string) => cues.some(c => CUE_EVENT[c] === id);

  it('plays the opening when the sprout reads lit, once', () => {
    expect(pendingCue({ hasEvent: none, sproutLit: true, live: CLOSED, lantern: HAND_ON, foot: FOOT_YARD })).toBe('opening');
    expect(pendingCue({ hasEvent: played('opening'), sproutLit: true, live: CLOSED, lantern: HAND_ON, foot: FOOT_YARD })).not.toBe('opening');
  });

  it('plays the pedestal remark once the lantern is set on S1', () => {
    const input = { hasEvent: played('opening'), sproutLit: false, live: CLOSED, lantern: ON_S1, foot: FOOT_YARD };
    expect(pendingCue(input)).toBe('pedestal');
    expect(pendingCue({ ...input, hasEvent: played('opening', 'pedestal'), live: A_OPEN })).toBe('door-feed');
  });

  it('plays the door-feed line only while S1 feeds an open door A', () => {
    const base = { hasEvent: played('opening', 'pedestal'), sproutLit: false, lantern: ON_S1, foot: FOOT_YARD };
    expect(pendingCue({ ...base, live: A_OPEN })).toBe('door-feed');
    expect(pendingCue({ ...base, live: CLOSED, lantern: ON_S2 })).toBe(null);
  });

  it('plays the Lumo line when door A is open, once', () => {
    const base = { hasEvent: played('opening', 'pedestal', 'door-feed'), sproutLit: false, lantern: HAND_ON, foot: FOOT_YARD };
    expect(pendingCue({ ...base, live: A_OPEN })).toBe('lumo-door');
    expect(pendingCue({ ...base, hasEvent: played('opening', 'pedestal', 'door-feed', 'lumo-door'), live: A_OPEN })).toBe(null);
  });

  it('plays the ending when the exit is ready, once', () => {
    const base = { hasEvent: played('opening', 'pedestal', 'door-feed', 'lumo-door'), sproutLit: false, lantern: HAND_ON, foot: FOOT_EXIT };
    expect(pendingCue({ ...base, live: B_OPEN })).toBe('ending');
    expect(pendingCue({ ...base, hasEvent: played('opening', 'pedestal', 'door-feed', 'lumo-door', 'ending'), live: B_OPEN })).toBe(null);
  });

  it('keeps the doc lines verbatim', () => {
    expect(CUE_LINES.opening[0]).toEqual({ speaker: 'Lumo', text: 'Cậu có thể đừng soi vào nhà người khác không?' });
    expect(CUE_LINES.pedestal[0].text).toBe('Khớp này giống ở xưởng.');
    expect(CUE_LINES['lumo-door'][0].text).toBe('Trước đây cửa vẫn mở khi người giữ trạm tới.');
    expect(CUE_LINES.ending).toEqual([
      { speaker: 'Nhinh', text: 'Đường này nối về bến.' },
      { speaker: 'Lumo', text: 'Cũng từng nối về vườn tôi.' },
    ]);
  });
});

describe('forest edge hint ladder and HUD', () => {
  it('shows the doc hint ladder for latch A, keyed by the step', () => {
    const ladder = forestEdgeHint(deriveForestEdge(DEFAULT, HAND_ON, CLOSED));
    expect(ladder?.key).toBe('forest-edge:latch-a');
    expect(ladder?.steps[0]).toBe('Đầu cắm S1 khớp với đèn thử. Lẫy và thanh hãm ở cửa A còn nguyên; cửa đã phản ứng với nguồn chưa?');
    expect(ladder?.steps[2]).toContain('gài chốt từ sân giữa');
  });

  it('switches to the brace-B ladder once latch A holds, from the current state only', () => {
    const ladder = forestEdgeHint(deriveForestEdge(LATCHED, ON_S2, B_OPEN));
    expect(ladder?.key).toBe('forest-edge:brace-b');
    expect(ladder?.steps[2]).toContain('gài tay hãm B');
  });

  it('shows no ladder once both latch and brace hold', () => {
    expect(forestEdgeHint(deriveForestEdge(BRACED, HAND_ON, CLOSED))).toBe(null);
  });

  it('changes the objective only when both latches hold', () => {
    expect(forestEdgeHud(deriveForestEdge(DEFAULT, HAND_ON, CLOSED), HAND_ON, DEFAULT).objective).toBe('Kiểm tra trạm mất nguồn');
    expect(forestEdgeHud(deriveForestEdge(LATCHED, HAND_ON, CLOSED), HAND_ON, LATCHED).objective).toBe('Kiểm tra trạm mất nguồn');
    expect(forestEdgeHud(deriveForestEdge(BRACED, HAND_ON, CLOSED), HAND_ON, BRACED).objective).toBe('Giữ lối qua trạm để mang đèn đi tiếp');
  });

  it('names the lantern and both doors in the status line', () => {
    const hud = forestEdgeHud(deriveForestEdge(LATCHED, ON_S1, A_OPEN), ON_S1, LATCHED);
    expect(hud.status).toBe('Đèn: trên bệ S1 bật · Cửa A: mở, đã gài · Cổng B: đóng');
  });
});

describe('forest edge hinge model', () => {
  it('cycles pull, let go, pull and hook, unhook, and back', () => {
    expect(HINGE_PHASES.map(p => p.pose)).toEqual(['closed', 'pulled', 'closed', 'hooked']);
    expect(nextHingePhase(0)).toBe(1);
    expect(nextHingePhase(1)).toBe(2);
    expect(nextHingePhase(2)).toBe(3);
    expect(nextHingePhase(3)).toBe(0);
  });
});

describe('forest edge lamp on the ground by the stele', () => {
  const ON_GROUND = lampOnGround();

  it('starts unlit on the ground, and the lamp is not in hand', () => {
    expect(ON_GROUND).toEqual({ location: { at: 'pedestal', pedestalId: LAMP_REST_ID }, on: false });
  });

  it('takes the lamp from the ground into hand, still unlit', () => {
    expect(takeLampFromRest(ON_GROUND)).toEqual({ ok: true, value: { location: { at: 'hand' }, on: false } });
  });

  it('refuses to take the lamp when it is not on the ground', () => {
    expect(takeLampFromRest(HAND_ON)).toEqual({ ok: false, reason: REFUSE_LAMP_GONE });
    expect(takeLampFromRest(ON_S1)).toEqual({ ok: false, reason: REFUSE_LAMP_GONE });
  });

  it('refuses to set the lamp down on a pedestal while it rests on the ground', () => {
    expect(lanternAtPedestal(ON_GROUND, S1_ID)).toEqual({ ok: false, reason: REFUSE_LAMP_ON_GROUND });
    expect(lanternAtPedestal(ON_GROUND, S2_ID)).toEqual({ ok: false, reason: REFUSE_LAMP_ON_GROUND });
  });

  it('gives no light and no feed while it rests on the ground', () => {
    expect(lanternFeeds(ON_GROUND, S1_ID)).toBe(false);
    expect(lanternFeeds(ON_GROUND, LAMP_REST_ID)).toBe(false);
    expect(lanternFootprints(ON_GROUND, groundPoint({ x: 214, y: 236 }), () => null)).toEqual([]);
  });

  it('says where the lamp is in the status line', () => {
    const hud = forestEdgeHud(deriveForestEdge(DEFAULT, ON_GROUND, CLOSED), ON_GROUND, DEFAULT);
    expect(hud.status).toBe('Đèn: trên đất cạnh bia tắt · Cửa A: đóng · Cổng B: đóng');
  });
});

describe('forest edge journal texts', () => {
  it('has a text for every light and pulse mark of the level', () => {
    for (const mark of FOREST_EDGE_LIGHT_MARKS) {
      expect(FOREST_EDGE_JOURNAL_TEXT[mark.id], mark.id).toBeTruthy();
    }
    for (const mark of FOREST_EDGE_PULSE_MARKS) {
      expect(FOREST_EDGE_JOURNAL_TEXT[mark.id], mark.id).toBeTruthy();
    }
    expect(FOREST_EDGE_LIGHT_MARKS.some(mark => mark.id === SPROUT_ID)).toBe(true);
  });
});

describe('forest edge focus', () => {
  // The marker follows the reference route: lamp, S1, latch A, S1, S2, brace B, S2, then nothing.
  it('points at the lamp by the stele first', () => {
    expect(forestEdgeFocus(lampOnGround(), DEFAULT)).toEqual([LAMP_REST_ID]);
  });

  it('points at S1, then at latch A while S1 feeds door A', () => {
    expect(forestEdgeFocus(HAND_ON, DEFAULT)).toEqual([S1_ID]);
    expect(forestEdgeFocus(ON_S1, DEFAULT)).toEqual([LATCH_A_ID]);
  });

  it('points back at S1 when the lamp there is off, or once latch A holds', () => {
    expect(forestEdgeFocus(OFF_S1, DEFAULT)).toEqual([S1_ID]);
    expect(forestEdgeFocus(ON_S1, LATCHED)).toEqual([S1_ID]);
  });

  it('points at S2, then at brace B while S2 feeds gate B', () => {
    expect(forestEdgeFocus(HAND_ON, LATCHED)).toEqual([S2_ID]);
    expect(forestEdgeFocus(ON_S2, LATCHED)).toEqual([BRACE_B_ID]);
  });

  it('points at S2 to take the lamp back once brace B holds, then at nothing', () => {
    expect(forestEdgeFocus(ON_S2, BRACED)).toEqual([S2_ID]);
    expect(forestEdgeFocus(HAND_ON, BRACED)).toEqual([]);
  });

  it('points back at S2 for a lamp put there before latch A', () => {
    expect(forestEdgeFocus(ON_S2, DEFAULT)).toEqual([S2_ID]);
  });
});
