import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { rectsOverlap } from '../../core/geometry';
import { HUD_BANDS } from '../../../ui/hudLayout';
import { auditReach, canReachItem, reachableFeet, isFootWalkable } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import {
  WORKSHOP_DIALOGUE,
  WORKSHOP_JOURNAL,
  benchPrompt,
  boatmanPrompt,
  completeAssignment,
  defaultWorkshopState,
  exitOpen,
  motherPrompt,
  panelPrompt,
  parseWorkshopState,
  incidentPending,
  markIncidentCalled,
  takePart,
  trayPrompt,
  useBench,
  useBoatman,
  useMother,
  usePanel,
  useTray,
  workshopFocus,
  workshopHint,
  workshopHud,
  workshopItems,
  workshopSolids,
  workshopStage,
} from './workshopLogic';
import type { WorkshopEffect, WorkshopState } from './workshopLogic';
import { BENCH_ID, BOATMAN_ID, PANEL_ID, TRAY_ID, WORKSHOP, WORKSHOP_SPAWN } from './workshopLayout';

const START: WorkshopState = defaultWorkshopState();

/** The lamp repaired and in hand, boatman still here. */
const DELIVER: WorkshopState = { ...START, lampInspected: true, lampRepaired: true, held: 'lamp' };

/** Boatman has returned and Mẹ has called Nhinh to the panel. */
const PANEL: WorkshopState = { ...DELIVER, held: null, boatmanReturned: true, incidentCalled: true };

/** Boatman has just walked off; Mẹ has not called yet. */
const WALKED_OFF: WorkshopState = { ...DELIVER, held: null, boatmanReturned: true };

/** Diagnosis done; the assignment is granted. */
const DEPART: WorkshopState = { ...PANEL, localLineRepaired: true, assignmentReceived: true };

const STAGE_STATES: readonly WorkshopState[] = [START, DELIVER, PANEL, DEPART];

function auditInput(s: WorkshopState): AuditInput {
  return { world: WORKSHOP.world, solids: workshopSolids(s), hudBands: HUD_BANDS, items: workshopItems(s) };
}

function effectKinds(effects: readonly WorkshopEffect[]): string[] {
  return effects.map(e => (e.kind === 'dialogue' ? `dialogue:${e.id}` : e.kind === 'toast' ? `toast:${e.text}` : e.kind === 'journal' ? `journal:${e.id}` : e.kind));
}

describe('reference path', () => {
  it('runs from the bench, through the tray and the boatman, to the assignment', () => {
    // First look at the lamp: the two inspect lines, nothing repaired yet.
    let r = useBench(START);
    expect(r.state.lampInspected).toBe(true);
    expect(r.state.lampRepaired).toBe(false);
    expect(effectKinds(r.effects)).toEqual(['dialogue:inspect']);

    // Tray: the choice opens, then Vòng giữ goes into the hand.
    r = useTray(r.state);
    expect(effectKinds(r.effects)).toEqual(['choosePart']);
    r = takePart(r.state, 'ring');
    expect(r.state.held).toBe('ring');
    expect(benchPrompt(r.state)).toBe('E: lắp vòng giữ');

    // Fit it: the lamp is repaired and Nhinh holds it.
    r = useBench(r.state);
    expect(r.state.lampRepaired).toBe(true);
    expect(r.state.held).toBe('lamp');
    expect(r.effects).toEqual([]);
    expect(workshopStage(r.state)).toBe('deliver');

    // Hand over the lamp: payment, then the call to the window.
    expect(boatmanPrompt(r.state)).toBe('E: trả đèn');
    r = useBoatman(r.state);
    expect(effectKinds(r.effects)).toEqual(['dialogue:payment', 'dialogue:incident']);
    expect(r.state.boatmanReturned).toBe(true);
    expect(r.state.held).toBeNull();
    expect(workshopStage(r.state)).toBe('panel');

    // Window panel: the local line is repaired, the diagnosis plays and the Elaria journal entry is written.
    r = usePanel(r.state);
    expect(r.state.localLineRepaired).toBe(true);
    expect(effectKinds(r.effects)).toEqual(['dialogue:diagnosis', 'journal:elaria-signal']);
    expect(r.state.assignmentReceived).toBe(false);
    expect(exitOpen(r.state)).toBe(false);

    // After the diagnosis: the assignment is granted once.
    r = completeAssignment(r.state);
    expect(r.state.assignmentReceived).toBe(true);
    expect(effectKinds(r.effects)).toEqual(['journal:assignment', `toast:Nhận đèn bảo trì và bản đồ.`]);
    expect(exitOpen(r.state)).toBe(true);
    expect(workshopStage(r.state)).toBe('depart');
  });
});

describe('tray', () => {
  it('returns a held part to the tray', () => {
    const held = takePart(START, 'spring').state;
    expect(trayPrompt(held)).toBe('E: đặt trả linh kiện');
    const back = useTray(held);
    expect(back.state.held).toBeNull();
    expect(back.effects).toEqual([]);
    expect(trayPrompt(back.state)).toBe('E: lấy linh kiện');
  });

  it('asks which part to take when the hand is empty', () => {
    expect(trayPrompt(START)).toBe('E: lấy linh kiện');
    expect(effectKinds(useTray(START).effects)).toEqual(['choosePart']);
  });

  it('refuses a second part while one is already held', () => {
    const held = takePart(START, 'ring').state;
    expect(takePart(held, 'spring')).toEqual({ state: held, effects: [] });
  });

  it('has no prompt once the lamp is repaired', () => {
    expect(trayPrompt(DELIVER)).toBeNull();
    expect(useTray(DELIVER)).toEqual({ state: DELIVER, effects: [] });
  });
});

describe('bench', () => {
  it('refuses the spring with a toast and loses nothing', () => {
    const held = takePart(START, 'spring').state;
    const r = useBench(held);
    expect(r.state.held).toBe('spring');
    expect(r.state.lampRepaired).toBe(false);
    expect(effectKinds(r.effects)).toEqual(['dialogue:inspect', 'toast:Lò xo không vừa chốt vỏ.']);
    expect(benchPrompt(r.state)).toBe('E: thử lò xo');
  });

  it('does not gate the parts on the inspection', () => {
    expect(START.lampInspected).toBe(false);
    const withRing = takePart(START, 'ring').state;
    expect(useTray(START).effects).toEqual([{ kind: 'choosePart' }]);
    const r = useBench(withRing);
    expect(r.state.lampRepaired).toBe(true);
    expect(r.state.lampInspected).toBe(true);
  });

  it('plays the inspect lines only once', () => {
    const first = useBench(START);
    const second = useBench(first.state);
    expect(second.effects).toEqual([]);
  });

  it('shows the bench prompt on the lamp and has none after the repair', () => {
    expect(benchPrompt(START)).toBe('E: xem đèn');
    expect(benchPrompt(DELIVER)).toBeNull();
    expect(useBench(DELIVER)).toEqual({ state: DELIVER, effects: [] });
  });
});

describe('boatman', () => {
  it('says the lamp is not ready when Nhinh holds nothing', () => {
    const r = useBoatman(START);
    expect(r.state).toEqual(START);
    expect(effectKinds(r.effects)).toEqual(['toast:Đèn của bác chưa sửa xong.']);
    expect(boatmanPrompt(START)).toBe('E: nói chuyện');
  });

  it('has no prompt and no effects after he has returned', () => {
    expect(boatmanPrompt(PANEL)).toBeNull();
    expect(useBoatman(PANEL)).toEqual({ state: PANEL, effects: [] });
  });
});

describe('panel', () => {
  it('reads normal before the incident', () => {
    const r = usePanel(DELIVER);
    expect(r.state).toEqual(DELIVER);
    expect(effectKinds(r.effects)).toEqual(['toast:Bảng kiểm vẫn bình thường.']);
  });

  it('does not grant the assignment before the diagnosis is over', () => {
    const r = usePanel(PANEL);
    expect(r.state.assignmentReceived).toBe(false);
    expect(panelPrompt(r.state)).toBe('E: kiểm tra bảng');
  });

  it('repeats only the diagnosis while the assignment is pending, with no second journal entry', () => {
    const once = usePanel(PANEL).state;
    const again = usePanel(once);
    expect(effectKinds(again.effects)).toEqual(['dialogue:diagnosis']);
    expect(again.state).toEqual(once);
  });

  it('has no prompt after the assignment', () => {
    expect(panelPrompt(DEPART)).toBeNull();
    expect(usePanel(DEPART)).toEqual({ state: DEPART, effects: [] });
  });
});

describe('completeAssignment', () => {
  it('does nothing before the local line is repaired', () => {
    expect(completeAssignment(PANEL)).toEqual({ state: PANEL, effects: [] });
  });

  it('grants the assignment only once', () => {
    const once = completeAssignment({ ...PANEL, localLineRepaired: true });
    expect(effectKinds(once.effects)).toEqual(['journal:assignment', 'toast:Nhận đèn bảo trì và bản đồ.']);
    expect(completeAssignment(once.state)).toEqual({ state: once.state, effects: [] });
  });
});

describe('mother', () => {
  it('has a prompt at every stage', () => {
    for (const s of STAGE_STATES) expect(motherPrompt(s)).toBe('E: nói chuyện');
  });

  it('gives a toast that depends on the stage', () => {
    expect(effectKinds(useMother(START).effects)).toEqual(['toast:Mẹ đang sửa dở một chiếc đèn.']);
    expect(effectKinds(useMother(DELIVER).effects)).toEqual(['toast:Mẹ đang sửa dở một chiếc đèn.']);
    expect(effectKinds(useMother(PANEL).effects)).toEqual(['toast:Mẹ đang đợi ở bảng kiểm.']);
    expect(effectKinds(useMother(DEPART).effects)).toEqual(['toast:Mẹ: “Mang bản đồ. Nếu đường hỏng thì quay về.”']);
  });
});

describe('dialogue and journal copy', () => {
  it('matches the V4 prologue lines exactly', () => {
    expect(WORKSHOP_DIALOGUE.inspect).toEqual([
      { speaker: 'Nhinh', text: 'Lõi lệch rồi. Bác có làm rơi nó không?' },
      { speaker: 'Lái đò', text: 'Sóng làm rơi. Bác chỉ cầm hộ thôi.' },
    ]);
    expect(WORKSHOP_DIALOGUE.payment).toEqual([
      { speaker: 'Lái đò', text: 'Bao nhiêu tiền công đây, cô thợ?' },
      { speaker: 'Nhinh', text: 'Trừ vào tiền đò bác chưa lấy của cháu.' },
      { speaker: 'Lái đò', text: 'Thế bác còn phải sửa đèn ở đây lâu đấy.' },
    ]);
    expect(WORKSHOP_DIALOGUE.incident).toEqual([
      { speaker: 'Mẹ', text: 'Nhinh, xem trạm cửa sổ với mẹ.' },
    ]);
    expect(WORKSHOP_DIALOGUE.diagnosis).toHaveLength(5);
    expect(WORKSHOP_DIALOGUE.diagnosis[4]).toEqual({ speaker: 'Nhinh', text: 'Lần này mẹ cứ để con sửa.' });
    expect(WORKSHOP_JOURNAL['elaria-signal']).toBe('Tín hiệu bảo trì cũ từ Elaria: đường trong xưởng đã thông, đầu nguồn vẫn đứt nhịp.');
  });
});

describe('reload invariants', () => {
  it('reads anything that is not an object as the default state', () => {
    for (const raw of [null, undefined, 'garbage', 42, true, [], [START]]) {
      expect(parseWorkshopState(raw)).toEqual(START);
    }
  });

  it('treats unknown values as their defaults', () => {
    expect(parseWorkshopState({ lampRepaired: 'yes', held: 'pizza', lampInspected: 1 })).toEqual(START);
  });

  it('does not hold the lamp before it is repaired', () => {
    expect(parseWorkshopState({ held: 'lamp' }).held).toBeNull();
  });

  it('keeps parts only before the repair, and holds the lamp after it', () => {
    expect(parseWorkshopState({ held: 'ring' }).held).toBe('ring');
    expect(parseWorkshopState({ lampRepaired: true, held: 'ring' }).held).toBe('lamp');
  });

  it('clears the held item once the boatman has returned', () => {
    const s = parseWorkshopState({ lampRepaired: true, boatmanReturned: true, held: 'lamp' });
    expect(s.held).toBeNull();
    expect(s.lampInspected).toBe(true);
  });

  it('completes the flags forward from the assignment', () => {
    const s = parseWorkshopState({ assignmentReceived: true });
    expect(s).toEqual(DEPART);
    expect(workshopStage(s)).toBe('depart');
  });

  it('completes the flags forward from the local line', () => {
    expect(parseWorkshopState({ localLineRepaired: true })).toEqual({ ...PANEL, held: null, assignmentReceived: false, localLineRepaired: true });
  });

  it('does not replay the incident after a reload past it', () => {
    const s = parseWorkshopState({ lampRepaired: true, boatmanReturned: true, incidentCalled: true });
    expect(incidentPending(s)).toBe(false);
    expect(boatmanPrompt(s)).toBeNull();
    expect(workshopStage(s)).toBe('panel');
    expect(effectKinds(useMother(s).effects)).toEqual(['toast:Mẹ đang đợi ở bảng kiểm.']);
  });

  it('plays the call of Mẹ once after the boatman leaves, and never again', () => {
    expect(incidentPending(WALKED_OFF)).toBe(true);
    expect(incidentPending(markIncidentCalled(WALKED_OFF))).toBe(false);
    expect(incidentPending(START)).toBe(false);
  });

  it('plays the pending call after a reload while the boatman walks off', () => {
    const reloaded = parseWorkshopState(JSON.parse(JSON.stringify(WALKED_OFF)));
    expect(incidentPending(reloaded)).toBe(true);
    const called = markIncidentCalled(reloaded);
    expect(incidentPending(parseWorkshopState(JSON.parse(JSON.stringify(called))))).toBe(false);
  });

  it('round-trips a mid-game state through JSON', () => {
    const mid = takePart(START, 'ring').state;
    expect(parseWorkshopState(JSON.parse(JSON.stringify(mid)))).toEqual(mid);
    expect(parseWorkshopState(JSON.parse(JSON.stringify(PANEL)))).toEqual(PANEL);
  });
});

describe('focus marker', () => {
  it('points at the bench first, then the tray, then the bench again with the ring', () => {
    expect(workshopFocus(START)).toEqual([BENCH_ID]);
    const inspected = useBench(START).state;
    expect(workshopFocus(inspected)).toEqual([TRAY_ID]);
    expect(workshopFocus(takePart(inspected, 'ring').state)).toEqual([BENCH_ID]);
  });

  it('points a held spring back to the tray', () => {
    expect(workshopFocus(takePart(useBench(START).state, 'spring').state)).toEqual([TRAY_ID]);
  });

  it('points at the boatman with the lamp, and at the panel only once Mẹ has called', () => {
    expect(workshopFocus(DELIVER)).toEqual([BOATMAN_ID]);
    expect(workshopFocus(WALKED_OFF)).toEqual([]);
    expect(workshopFocus(PANEL)).toEqual([PANEL_ID]);
  });

  it('marks nothing once the local line is repaired', () => {
    expect(workshopFocus({ ...PANEL, localLineRepaired: true })).toEqual([]);
    expect(workshopFocus(DEPART)).toEqual([]);
  });
});

describe('HUD and hints', () => {
  it('gives the objective of each stage from the design table', () => {
    expect(workshopHud(START).objective).toBe('Sửa chiếc đèn của bác lái đò.');
    expect(workshopHud(DELIVER).objective).toBe('Mang đèn ra cửa cho bác lái đò.');
    expect(workshopHud(PANEL).objective).toBe('Xem trạm cửa sổ với mẹ.');
    expect(workshopHud(DEPART).objective).toBe('Đi tới trạm ở bìa rừng.');
  });

  it('gives a three-step hint in each stage and none after the diagnosis is pending', () => {
    expect(workshopHint(START)?.steps).toHaveLength(3);
    expect(workshopHint(DELIVER)?.steps[2]).toBe('Nhấn E cạnh bác lái đò.');
    expect(workshopHint(PANEL)?.steps[2]).toBe('Nhấn E ở bảng kiểm cạnh mẹ.');
    expect(workshopHint({ ...PANEL, localLineRepaired: true })).toBeNull();
    expect(workshopHint(DEPART)?.steps[2]).toBe('Đi ra cửa phía nam.');
  });
});

describe('workshop reach audit and reachability', () => {
  for (const [name, s] of [['repair', START], ['deliver', DELIVER], ['panel', PANEL], ['depart', DEPART]] as const) {
    it(`is clean in the ${name} stage`, () => {
      expect(auditReach(auditInput(s))).toEqual([]);
    });

    it(`reaches every interactable from the spawn in the ${name} stage`, () => {
      const input = { world: WORKSHOP.world, solids: workshopSolids(s) };
      for (const item of workshopItems(s)) {
        expect(canReachItem(WORKSHOP_SPAWN, item, input), item.id).toBe(true);
      }
    });
  }

  it('keeps the spawn walkable in every stage', () => {
    for (const s of STAGE_STATES) {
      expect(isFootWalkable(footRectAt(WORKSHOP_SPAWN), { world: WORKSHOP.world, solids: workshopSolids(s) })).toBe(true);
    }
  });

  it('closes the south door until the assignment is received, and then reaches it', () => {
    const closed = { world: WORKSHOP.world, solids: workshopSolids(PANEL) };
    const open = { world: WORKSHOP.world, solids: workshopSolids(DEPART) };
    expect(workshopSolids(PANEL)).toContainEqual(WORKSHOP.southDoor);
    expect(workshopSolids(DEPART)).not.toContainEqual(WORKSHOP.southDoor);
    // A walkable foot that overlaps the door strip is the way out.
    const footsOverDoor = (feet: Set<string>) => [...feet].filter(key => {
      const [x, y] = key.split(',').map(Number);
      return rectsOverlap(footRectAt({ x, y }), WORKSHOP.southDoor);
    });
    expect(footsOverDoor(reachableFeet(WORKSHOP_SPAWN, closed))).toEqual([]);
    expect(footsOverDoor(reachableFeet(WORKSHOP_SPAWN, open)).length).toBeGreaterThan(0);
  });

  it('drops the boatman from the solids and the items once he has returned', () => {
    expect(workshopSolids(PANEL)).not.toContainEqual(WORKSHOP.boatman);
    expect(workshopItems(PANEL).map(i => i.id)).not.toContain('boatman');
    expect(workshopSolids(DELIVER)).toContainEqual(WORKSHOP.boatman);
  });
});
