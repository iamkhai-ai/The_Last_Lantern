import { describe, expect, it } from 'vitest';
import { entriesByVi } from '../../i18n/catalog';
import { WORKSHOP_TUTORIAL } from '../levels/prologue-workshop/workshopTutorial';
import { FOREST_EDGE_TUTORIAL } from '../levels/forest-edge/forestEdgeTutorial';
import { LAMP_REST_ID, S1_ID } from '../levels/forest-edge/forestEdgeLayout';
import { revealLines, typedCharacters } from '../scene/captionTyping';
import { currentTutorialStep, tutorialEvent, tutorialStepDone } from './tutorial';
import type { TutorialContext, TutorialSignal, TutorialStep } from './tutorial';
import type { LanternState } from './lantern';

const ON_GROUND: LanternState = { location: { at: 'pedestal', pedestalId: LAMP_REST_ID }, on: false };
const HAND_OFF: LanternState = { location: { at: 'hand' }, on: false };
const HAND_ON: LanternState = { location: { at: 'hand' }, on: true };
const ON_S1: LanternState = { location: { at: 'pedestal', pedestalId: S1_ID }, on: true };
const ctx = (lantern: LanternState): TutorialContext => ({ lantern });
const none = new Set<TutorialSignal>();

/** The save events of lessons already finished. */
function done(_steps: readonly TutorialStep[], ids: readonly string[]): string[] {
  return ids.map((id) => tutorialEvent(id));
}

describe('tutorial core', () => {
  it('shows the first unfinished lesson and keeps the order', () => {
    const events = done(WORKSHOP_TUTORIAL, ['workshop-move']);
    expect(currentTutorialStep(WORKSHOP_TUTORIAL, [], ctx(HAND_OFF))?.id).toBe('workshop-move');
    expect(currentTutorialStep(WORKSHOP_TUTORIAL, events, ctx(HAND_OFF))?.id).toBe('workshop-run');
  });

  it('shows nothing once every lesson is done', () => {
    const events = done(WORKSHOP_TUTORIAL, WORKSHOP_TUTORIAL.map((s) => s.id));
    expect(currentTutorialStep(WORKSHOP_TUTORIAL, events, ctx(HAND_OFF))).toBeNull();
  });

  it('finishes on a signal, a state check or the timer, and not otherwise', () => {
    const [move, run] = WORKSHOP_TUTORIAL;
    expect(tutorialStepDone(move, ctx(HAND_OFF), none, 60000)).toBe(false);
    expect(tutorialStepDone(move, ctx(HAND_OFF), new Set<TutorialSignal>(['moved']), 0)).toBe(true);
    expect(tutorialStepDone(run, ctx(HAND_OFF), none, 1000)).toBe(false);
    expect(tutorialStepDone(run, ctx(HAND_OFF), none, run.expireMs ?? 0)).toBe(true);
  });
});

describe('level 00 lessons', () => {
  it('teach moving, running, E and the help keys', () => {
    expect(WORKSHOP_TUTORIAL.map((s) => s.id)).toEqual(['workshop-move', 'workshop-run', 'workshop-interact', 'workshop-help']);
    const text = WORKSHOP_TUTORIAL.map((s) => s.text).join(' ');
    for (const key of ['WASD', 'Shift', 'E', 'H', 'J', 'Esc']) expect(text).toContain(key);
  });
});

describe('level 01 lantern lessons', () => {
  const at = (id: string) => FOREST_EDGE_TUTORIAL.find((s) => s.id === id)!;

  it('starts with picking up the lamp and never lights it for the player', () => {
    expect(currentTutorialStep(FOREST_EDGE_TUTORIAL, [], ctx(ON_GROUND))?.id).toBe('forest-edge-take');
    expect(tutorialStepDone(at('forest-edge-take'), ctx(HAND_OFF), none, 0)).toBe(true);
    const events = done(FOREST_EDGE_TUTORIAL, ['forest-edge-take']);
    const light = currentTutorialStep(FOREST_EDGE_TUTORIAL, events, ctx(HAND_OFF));
    expect(light?.id).toBe('forest-edge-light');
    expect(tutorialStepDone(light!, ctx(HAND_OFF), none, 60000)).toBe(false);
    expect(tutorialStepDone(light!, ctx(HAND_ON), none, 0)).toBe(true);
  });

  it('waits to explain the light until it is lit in hand', () => {
    const events = done(FOREST_EDGE_TUTORIAL, ['forest-edge-take', 'forest-edge-light']);
    expect(currentTutorialStep(FOREST_EDGE_TUTORIAL, events, ctx(HAND_OFF))).toBeNull();
    expect(currentTutorialStep(FOREST_EDGE_TUTORIAL, events, ctx(HAND_ON))?.id).toBe('forest-edge-see');
  });

  it('teaches the pulse, then setting the lamp on a pedestal and taking it back', () => {
    expect(tutorialStepDone(at('forest-edge-pulse'), ctx(HAND_ON), new Set<TutorialSignal>(['pulsed']), 0)).toBe(true);
    expect(tutorialStepDone(at('forest-edge-pedestal'), ctx(HAND_ON), none, 60000)).toBe(false);
    expect(tutorialStepDone(at('forest-edge-pedestal'), ctx(ON_S1), none, 0)).toBe(true);
    expect(tutorialStepDone(at('forest-edge-retrieve'), ctx(ON_S1), none, 0)).toBe(false);
    expect(tutorialStepDone(at('forest-edge-retrieve'), ctx(HAND_ON), none, 0)).toBe(true);
    const text = FOREST_EDGE_TUTORIAL.map((s) => s.text).join(' ');
    for (const key of ['E', 'F', 'Space']) expect(text).toContain(key);
  });
});

describe('lesson catalogue', () => {
  it('has an English line for every lesson, short enough for the panel', () => {
    for (const step of [...WORKSHOP_TUTORIAL, ...FOREST_EDGE_TUTORIAL]) {
      const entry = entriesByVi().get(step.text);
      expect(entry, step.id).toBeDefined();
      expect(step.text.length, step.id).toBeLessThanOrEqual(170);
      expect(entry!.en.length, step.id).toBeLessThanOrEqual(170);
    }
  });
});

describe('caption typing', () => {
  it('reveals one character at a time and stops at the end', () => {
    expect(typedCharacters(0, 10, 25)).toBe(0);
    expect(typedCharacters(1, 10, 25)).toBe(1);
    expect(typedCharacters(50, 10, 25)).toBe(3);
    expect(typedCharacters(10000, 10, 25)).toBe(10);
  });

  it('fills the wrapped lines in reading order', () => {
    const lines = [Array.from('Bến Sương'), Array.from('bên sông')];
    expect(revealLines(lines, 3)).toEqual(['Bến', '']);
    expect(revealLines(lines, 11)).toEqual(['Bến Sương', 'bê']);
    expect(revealLines(lines, 99)).toEqual(['Bến Sương', 'bên sông']);
  });
});
