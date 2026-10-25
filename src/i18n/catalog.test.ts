import { describe, it, expect } from 'vitest';
import { CATALOG, entriesByVi } from './catalog';
import {
  WORKSHOP_DIALOGUE,
  WORKSHOP_JOURNAL,
  defaultWorkshopState,
  panelPrompt,
  useBench,
  takePart,
  useBoatman,
  usePanel,
  completeAssignment,
  workshopHint,
  workshopHud,
} from '../v4/levels/prologue-workshop/workshopLogic';
import type { WorkshopState } from '../v4/levels/prologue-workshop/workshopLogic';
import {
  AGREEMENT_JOURNAL_ID,
  CUE_LINES,
  FOREST_EDGE_JOURNAL_TEXT,
  INITIAL_FOREST_LIVE,
  defaultForestEdgeState,
  deriveForestEdge,
  forestEdgeHint,
  forestEdgeHud,
  lampOnGround,
} from '../v4/levels/forest-edge/forestEdgeLogic';

/** The catalogue translation of an authored Vietnamese sentence, or null. */
function englishOf(vi: string): string | null {
  return entriesByVi().get(vi)?.en ?? null;
}

/** The reference route up to the diagnosis: inspect, fit the ring, hand the lamp over, repair the local line. */
const PAST_DIAGNOSIS: WorkshopState = usePanel(
  useBoatman(
    useBench(takePart(useBench(defaultWorkshopState()).state, 'ring').state).state,
  ).state,
).state;

/** The same state after Mẹ's order: the assignment is granted and nothing is left to say. */
const ASSIGNED: WorkshopState = completeAssignment(PAST_DIAGNOSIS).state;

describe('catalogue shape', () => {
  it('has one entry per Vietnamese key and per review id', () => {
    const ids = CATALOG.map(item => item.id);
    const keys = CATALOG.map(item => item.vi);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('fills every English translation', () => {
    const empty = CATALOG.filter(item => item.en.trim() === '').map(item => item.id);
    expect(empty).toEqual([]);
  });

  it('matches placeholders between the two languages', () => {
    const broken = CATALOG
      .filter(item => /\{[a-zA-Z_]+\}/.test(item.vi) !== /\{[a-zA-Z_]+\}/.test(item.en))
      .map(item => item.id);
    expect(broken).toEqual([]);
  });
});

describe('workshop copy is translated', () => {
  it('has English for every spoken line', () => {
    const missing = Object.entries(WORKSHOP_DIALOGUE)
      .flatMap(([id, lines]) => lines.map(line => ({ id, text: line.text })))
      .filter(line => englishOf(line.text) === null)
      .map(line => `${line.id}: ${line.text}`);
    expect(missing).toEqual([]);
  });

  it('has English for both journal notes', () => {
    for (const note of Object.values(WORKSHOP_JOURNAL)) expect(englishOf(note)).not.toBeNull();
  });

  it('keeps the assignment note inside two body lines of the journal box', () => {
    // Measured on the browser: three lines pushed the "Tiếp" label into the text (528px box, 12px body).
    const vi = WORKSHOP_JOURNAL.assignment;
    const en = englishOf(vi);
    expect([...vi].length).toBeLessThanOrEqual(145);
    expect(en).not.toBeNull();
    expect([...(en ?? '')].length).toBeLessThanOrEqual(165);
  });

  it('has English for every objective and for the hint of an interrupted diagnosis', () => {
    const states: WorkshopState[] = [
      defaultWorkshopState(),
      useBench(defaultWorkshopState()).state,
      useBench(takePart(useBench(defaultWorkshopState()).state, 'ring').state).state,
      PAST_DIAGNOSIS,
      ASSIGNED,
    ];
    for (const state of states) {
      expect(englishOf(workshopHud(state).objective), workshopHud(state).objective).not.toBeNull();
      for (const step of workshopHint(state)?.steps ?? []) expect(englishOf(step), step).not.toBeNull();
    }
    // The panel of a reloaded diagnosis: the assignment hint is what the player reads there.
    expect(panelPrompt(ASSIGNED)).toBeNull();
    expect(workshopHint(PAST_DIAGNOSIS)?.key).toBe('workshop:assignment');
  });

  it('keeps the five captions short enough for the caption band', () => {
    const captions = CATALOG.filter(item => item.id.startsWith('v4.workshop.caption'));
    expect(captions).toHaveLength(5);
    for (const caption of captions) {
      // Two sentences at most, and short enough that the band does not have to shrink the type.
      expect(caption.vi.split('.').filter(part => part.trim() !== '')).toHaveLength(2);
      expect(caption.vi.length).toBeLessThanOrEqual(200);
      expect(caption.en.length).toBeLessThanOrEqual(240);
    }
  });
});

describe('forest edge opening and agreement are translated', () => {
  it('has English for the opening lines and the four agreement lines', () => {
    const lines = [...CUE_LINES.opening, ...CUE_LINES.agreement];
    expect(lines).toHaveLength(6);
    for (const line of lines) expect(englishOf(line.text), line.text).not.toBeNull();
  });

  it('has English for the journal note and for the lamp-pickup objective and hints', () => {
    expect(englishOf(FOREST_EDGE_JOURNAL_TEXT[AGREEMENT_JOURNAL_ID])).not.toBeNull();
    const view = deriveForestEdge(defaultForestEdgeState(), lampOnGround(), INITIAL_FOREST_LIVE);
    expect(view.stage).toBe('take-lantern');
    expect(englishOf(forestEdgeHud(view, lampOnGround(), defaultForestEdgeState()).objective)).not.toBeNull();
    for (const step of forestEdgeHint(view)?.steps ?? []) expect(englishOf(step), step).not.toBeNull();
  });
});
