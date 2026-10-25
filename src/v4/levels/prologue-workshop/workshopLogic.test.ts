import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { rectsOverlap } from '../../core/geometry';
import { addJournalEntry } from '../../core/journal';
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
  markGreeted,
  markIncidentCalled,
  openingPending,
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
const DELIVER: WorkshopState = { ...START, greeted: true, lampInspected: true, lampRepaired: true, held: 'lamp' };

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

    // Window panel: the local line is repaired, the signal note is written first, then the diagnosis plays.
    r = usePanel(r.state);
    expect(r.state.localLineRepaired).toBe(true);
    expect(effectKinds(r.effects)).toEqual(['journal:elaria-signal', 'dialogue:diagnosis']);
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

  it('repeats the diagnosis while the assignment is pending, re-emitting the note the journal already holds', () => {
    const once = usePanel(PANEL).state;
    const again = usePanel(once);
    // The note comes before the dialogue on the repeat too: host.addJournal ignores an id it already has.
    expect(effectKinds(again.effects)).toEqual(['journal:elaria-signal', 'dialogue:diagnosis']);
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

  it('offers her own optional script while the lamp work is going on', () => {
    for (const s of [START, DELIVER]) {
      const r = useMother(s);
      expect(effectKinds(r.effects)).toEqual(['dialogue:mother-work']);
      // Optional: talking to her changes nothing and gates nothing.
      expect(r.state).toEqual(s);
    }
  });

  it('hands over a small lamp, hears Nhinh out and asks her to work carefully', () => {
    const lines = WORKSHOP_DIALOGUE['mother-work'];
    expect(lines.map(l => l.speaker)).toEqual(['Mẹ', 'Nhinh', 'Mẹ']);
    expect(lines[0].text).toContain('đèn nhỏ');
    expect(lines[1].text).toContain('trạm');
    expect(lines[2].text).toContain('cần đèn để về');
  });

  it('gives a toast that depends on the stage once the panel is done with', () => {
    expect(effectKinds(useMother(PANEL).effects)).toEqual(['toast:Mẹ đang đợi ở bảng kiểm.']);
    expect(effectKinds(useMother(DEPART).effects)).toEqual(['toast:Mẹ: “Mang bản đồ. Nếu đường hỏng thì quay về.”']);
  });
});

describe('dialogue and journal copy', () => {
  it('keeps the five prologue diagnosis lines word for word and in order', () => {
    const texts = WORKSHOP_DIALOGUE.diagnosis.map(l => l.text);
    expect(texts).toContain('Đường trong xưởng thông rồi. Nhánh này vẫn yếu.');
    expect(texts).toContain('Từ Elaria. Lâu lắm trạm ấy mới gửi tín hiệu.');
    expect(texts).toContain('Con biết đọc mốc bảo trì. Con tới trạm ngoài rừng xem.');
    expect(texts).toContain('Mang bản đồ. Nếu đường hỏng thì quay về; đừng cố đi khi trời tối.');
    expect(texts).toContain('Lần này mẹ cứ để con sửa.');
    expect(texts.indexOf('Đường trong xưởng thông rồi. Nhánh này vẫn yếu.'))
      .toBeLessThan(texts.indexOf('Từ Elaria. Lâu lắm trạm ấy mới gửi tín hiệu.'));
    expect(texts.indexOf('Từ Elaria. Lâu lắm trạm ấy mới gửi tín hiệu.'))
      .toBeLessThan(texts.indexOf('Con biết đọc mốc bảo trì. Con tới trạm ngoài rừng xem.'));
    expect(texts.indexOf('Con biết đọc mốc bảo trì. Con tới trạm ngoài rừng xem.'))
      .toBeLessThan(texts.indexOf('Mang bản đồ. Nếu đường hỏng thì quay về; đừng cố đi khi trời tối.'));
    expect(texts.indexOf('Mang bản đồ. Nếu đường hỏng thì quay về; đừng cố đi khi trời tối.'))
      .toBeLessThan(texts.indexOf('Lần này mẹ cứ để con sửa.'));
  });

  it('adds three explanation lines: where the harbour source comes from, why Mẹ stays, what the lamp can do', () => {
    expect(WORKSHOP_DIALOGUE.diagnosis).toHaveLength(8);
    const texts = WORKSHOP_DIALOGUE.diagnosis.map(l => l.text);
    const source = texts.findIndex(t => t.includes('Elaria') && t.includes('bìa rừng') && t.includes('tuyến bảo trì'));
    expect(source).toBeGreaterThan(-1);
    expect(texts[source]).toContain('Nguồn của bến');
    const stays = texts.findIndex(t => t.includes('giữ bơm'));
    expect(stays).toBeGreaterThan(-1);
    expect(texts[stays]).toContain('Ngoài kia còn người đợi đèn để về.');
    expect(WORKSHOP_DIALOGUE.diagnosis[stays].speaker).toBe('Mẹ');
    const lamp = texts.findIndex(t => t.includes('đèn bảo trì') && t.includes('nguồn thử'));
    expect(lamp).toBeGreaterThan(-1);
    expect(texts[lamp]).toContain('không thay được nguồn của bến');
  });

  it('never claims the trip saves the world or explains the forest from the start', () => {
    const all = WORKSHOP_DIALOGUE.diagnosis.map(l => l.text).join(' ');
    for (const spoiler of ['thế giới', 'Guardian', 'Người Bảo Vệ', 'Cây Mẹ', 'thủ phạm', 'chạng vạng']) {
      expect(all).not.toContain(spoiler);
    }
  });

  it('matches the V4 prologue lines for the lamp and the payment', () => {
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
      { speaker: 'Mẹ', text: 'Nhinh, xem bảng kiểm với mẹ.' },
    ]);
  });

  it('writes the journal entry for the signal with the same facts as the diagnosis', () => {
    expect(WORKSHOP_JOURNAL['elaria-signal']).toContain('Elaria');
    expect(WORKSHOP_JOURNAL['elaria-signal']).toContain('đầu nguồn');
    expect(WORKSHOP_JOURNAL['elaria-signal']).toContain('đứt nhịp');
  });

  it('writes an assignment that carries the job, the reason and the limit of the lamp', () => {
    const note = WORKSHOP_JOURNAL.assignment;
    expect(note).toContain('trạm bìa rừng');
    expect(note).toContain('quay về');
    expect(note).toContain('không đi đêm');
    expect(note).toContain('Đèn bảo trì');
    expect(note).toContain('chỉ thử máy');
    expect(note).toContain('không cấp nguồn cho bến');
    // Short enough for the journal box: two lines of body text, clear of the "Tiếp" label.
    expect([...note].length).toBeLessThanOrEqual(145);
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

describe('opening line', () => {
  it('plays once on the first visit and is saved as played', () => {
    expect(openingPending(START)).toBe(true);
    const greeted = markGreeted(START);
    expect(openingPending(greeted)).toBe(false);
    expect(openingPending(parseWorkshopState(JSON.parse(JSON.stringify(greeted))))).toBe(false);
  });

  it('does not play once the lamp has been looked at, even from an old save without the flag', () => {
    expect(openingPending(useBench(START).state)).toBe(false);
    expect(parseWorkshopState({ lampInspected: true }).greeted).toBe(true);
  });

  it('is said by the boatman about the lamp on the bench, and about the crossing tonight', () => {
    const lines = WORKSHOP_DIALOGUE.opening;
    expect(lines[0]).toEqual({
      speaker: 'Lái đò',
      text: 'Cô thợ ơi, chiếc đèn bác để trên bàn rồi đấy. Xem giúp bác với.',
    });
    // One added line: the evening crossing through the mist, and the lamps that show the landing.
    expect(lines).toHaveLength(2);
    expect(lines[1].speaker).toBe('Lái đò');
    expect(lines[1].text).toContain('qua sương');
    expect(lines[1].text).toContain('bến');
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

  it('keeps the panel marked until the assignment, not just the repair, is complete', () => {
    expect(workshopFocus({ ...PANEL, localLineRepaired: true })).toEqual([PANEL_ID]);
    expect(workshopFocus(DEPART)).toEqual([]);
  });
});

describe('HUD and hints', () => {
  it('gives the objective of each stage from the design table', () => {
    expect(workshopHud(START).objective).toBe('Sửa chiếc đèn của bác lái đò.');
    expect(workshopHud(DELIVER).objective).toBe('Mang đèn ra cửa cho bác lái đò.');
    expect(workshopHud(PANEL).objective).toBe('Xem bảng kiểm với mẹ.');
    expect(workshopHud(DEPART).objective).toBe('Đi tới trạm ở bìa rừng.');
  });

  it('keeps a three-step hint while the assignment is pending, including after a reload', () => {
    expect(workshopHint(START)?.steps).toHaveLength(3);
    expect(workshopHint(DELIVER)?.steps[2]).toBe('Nhấn E cạnh bác lái đò.');
    expect(workshopHint(PANEL)?.steps[2]).toBe('Nhấn E ở bảng kiểm cạnh mẹ.');
    expect(workshopHint({ ...PANEL, localLineRepaired: true })?.steps).toHaveLength(3);
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

describe('interrupted assignment guidance', () => {
  it('points a restored diagnosis back to the panel until the assignment is received', () => {
    const restored = parseWorkshopState({ localLineRepaired: true });
    expect(exitOpen(restored)).toBe(false);
    expect(workshopFocus(restored)).toEqual([PANEL_ID]);
    expect(workshopHint(restored)?.key).toBe('workshop:assignment');
    expect(workshopHud(restored).objective).toBe('Nghe mẹ dặn ở bảng kiểm.');
    expect(effectKinds(usePanel(restored).effects)).toEqual(['journal:elaria-signal', 'dialogue:diagnosis']);
    expect(exitOpen(completeAssignment(restored).state)).toBe(true);
  });
});

describe('the signal note survives a reload in the middle of the diagnosis', () => {
  /** Plays the workshop's journal effects the way the host does, so a dialogue can be cut short between them. */
  function playJournal(effects: readonly WorkshopEffect[], journal: readonly string[]): string[] {
    let entries: readonly string[] = [...journal];
    for (const effect of effects) {
      if (effect.kind === 'journal') entries = addJournalEntry(entries, effect.id).entries;
    }
    return [...entries];
  }

  it('writes the note first, then replays it and grants the order, in order and without duplicates', () => {
    // E at the panel: only the note gets through; the reload interrupts the diagnosis.
    const first = usePanel(PANEL);
    expect(effectKinds(first.effects)).toEqual(['journal:elaria-signal', 'dialogue:diagnosis']);
    const journal = playJournal(first.effects.slice(0, 1), []);
    expect(journal).toEqual(['elaria-signal']);

    // The save keeps the repaired line, not the dialogue.
    const restored = parseWorkshopState(JSON.parse(JSON.stringify(first.state)));
    expect(restored.localLineRepaired).toBe(true);
    expect(restored.assignmentReceived).toBe(false);

    // Continue: E at the panel again replays the note (already held, so no duplicate) and the diagnosis.
    const replay = usePanel(restored);
    const afterReplay = playJournal(replay.effects, journal);
    expect(afterReplay).toEqual(['elaria-signal']);

    // The order is granted once, after that dialogue.
    const granted = completeAssignment(replay.state);
    const afterGrant = playJournal(granted.effects, afterReplay);
    expect(afterGrant).toEqual(['elaria-signal', 'assignment']);
    // A second grant changes nothing: no duplicate note and no duplicate order.
    expect(completeAssignment(granted.state).effects).toEqual([]);
    expect(playJournal(completeAssignment(granted.state).effects, afterGrant)).toEqual(['elaria-signal', 'assignment']);
  });

  it('re-emits the note for a save restored from before the fix, whose journal is still empty', () => {
    const restored = parseWorkshopState({ localLineRepaired: true });
    expect(restored.assignmentReceived).toBe(false);
    const replay = playJournal(usePanel(restored).effects, []);
    expect(replay).toEqual(['elaria-signal']);
    const granted = completeAssignment(usePanel(restored).state);
    expect(playJournal(granted.effects, replay)).toEqual(['elaria-signal', 'assignment']);
  });
});
