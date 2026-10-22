import { observatoryDoorOpen, type ObsWorldState } from '../data/observatoryLayout.ts';
import type { ObservatoryDerivedState } from './ObservatoryPuzzle.ts';
import type { ObservatoryCue } from './SoundSystem.ts';

export interface ObservatoryAudioState {
  supply: boolean;
  split: boolean;
  roots: ObsWorldState['rootState'];
  bridge: boolean;
  doorA: boolean;
  sunDoor: boolean;
  finalDoor: boolean;
  returnLoop: boolean;
}

/** Snapshot actual presentation, including the safety hold while Nhinh is still on a retracting bridge. */
export function observatoryAudioState(world: ObsWorldState, puzzle: ObservatoryDerivedState, bridgeHeld: boolean): ObservatoryAudioState {
  return {
    supply: world.supplyLive,
    split: puzzle.activeBeamPath.routeId === 'g2-split',
    roots: world.rootState,
    bridge: world.bridgeEligible || bridgeHeld,
    doorA: observatoryDoorOpen('door-a', world),
    sunDoor: observatoryDoorOpen('sun-door', world),
    finalDoor: world.finalDoorLatched,
    returnLoop: observatoryDoorOpen('return-loop', world),
  };
}

export type ObservatoryStateCue = ObservatoryCue | 'doorOpen' | 'doorClose' | 'lightPulse';

/** Initial load and identical refreshes are silent; room changes keep the previous snapshot. */
export function observatoryAudioChanges(previous: ObservatoryAudioState | null, next: ObservatoryAudioState): ObservatoryStateCue[] {
  if (!previous) return [];
  const cues: ObservatoryStateCue[] = [];
  if (previous.supply !== next.supply) cues.push(next.supply ? 'tubeOn' : 'tubeOff');
  if (!previous.split && next.split) cues.push('lightPulse');
  if (previous.roots !== 'lit' && next.roots === 'lit') cues.push('rootsWarm');
  if (previous.bridge !== next.bridge) cues.push(next.bridge ? 'rootBridgeGrow' : 'rootBridgeRetract');
  // A Sun door and Door A can change together; one stone sound is clearer than two identical overlaps.
  if ((!previous.doorA && next.doorA) || (!previous.sunDoor && next.sunDoor) || (!previous.finalDoor && next.finalDoor)) cues.push('doorOpen');
  if ((previous.doorA && !next.doorA) || (previous.sunDoor && !next.sunDoor)) cues.push('doorClose');
  if (!previous.returnLoop && next.returnLoop) cues.push('stoneRing');
  return cues;
}
