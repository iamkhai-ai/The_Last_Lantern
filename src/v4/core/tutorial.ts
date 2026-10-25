import type { LanternState } from './lantern';

/**
 * First-play coaching: a short ordered list of control lessons a level teaches, one at a time, in a panel above the key
 * row. Each lesson is shown until the player does what it asks (a signal from the host or a state check), or for a
 * fixed time for lessons that only inform. A finished lesson is saved as the event `tutorial:<id>`, so it never comes
 * back after a reload. Pure: no Phaser.
 */

/** What the host reports the player has just done while a lesson is up. */
export type TutorialSignal = 'moved' | 'ran' | 'interacted' | 'help' | 'lantern-on' | 'pulsed';

/** The state a lesson may read to decide whether it applies or is already done. */
export interface TutorialContext {
  readonly lantern: LanternState;
}

export interface TutorialStep {
  /** Stable id; the save holds `tutorial:<id>` once it is done. */
  readonly id: string;
  /** The lesson text, a Vietnamese catalog key. */
  readonly text: string;
  /** Shown only while this holds; later lessons wait behind it. Absent: always. */
  readonly ready?: (ctx: TutorialContext) => boolean;
  /** Done at once when this holds (the player already did it some other way). */
  readonly doneWhen?: (ctx: TutorialContext) => boolean;
  /** Done when the host reports any of these while the lesson is up. */
  readonly doneOn?: readonly TutorialSignal[];
  /** Done after it has been on screen this long (informative lessons). */
  readonly expireMs?: number;
}

/** The save event that marks a lesson as done. */
export function tutorialEvent(id: string): string {
  return `tutorial:${id}`;
}

/**
 * The lesson to show now: the first one not yet done. When it does not apply yet (`ready` false), nothing shows; the
 * order is kept, so a later lesson never jumps ahead.
 */
export function currentTutorialStep(
  steps: readonly TutorialStep[],
  events: readonly string[],
  ctx: TutorialContext,
): TutorialStep | null {
  for (const step of steps) {
    if (events.includes(tutorialEvent(step.id))) continue;
    return step.ready === undefined || step.ready(ctx) ? step : null;
  }
  return null;
}

/** Whether the shown lesson is finished, given what the player did and how long it has been up. */
export function tutorialStepDone(
  step: TutorialStep,
  ctx: TutorialContext,
  signals: ReadonlySet<TutorialSignal>,
  shownMs: number,
): boolean {
  if (step.doneWhen?.(ctx)) return true;
  if (step.doneOn?.some((signal) => signals.has(signal))) return true;
  return step.expireMs !== undefined && shownMs >= step.expireMs;
}

/** Distance the player must cover, in px, before "moved" (or "ran", with Shift held) counts. */
export const TUTORIAL_MOVE_DISTANCE = 48;
