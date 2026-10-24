import type { V4LevelRuntime } from '../scene/LevelHost';
import { TestRoomLevel } from './test-room/TestRoomLevel';
import { WhisperingWoodsLevel } from './whispering-woods/WhisperingWoodsLevel';

/** Makes a fresh runtime for one level. Constructing it touches no Phaser object; `build()` does. */
export type V4LevelFactory = () => V4LevelRuntime<unknown>;

/**
 * The campaign levels in play order. The first one is where a new game starts. On the foundation branch the only
 * level is the test room; each `levelNN-v4` branch puts its level here.
 */
export const V4_LEVELS: readonly V4LevelFactory[] = [() => new TestRoomLevel()];

/** Development levels. Never in the campaign order: a new game starts in one only when the URL names it (?v4level=). */
export const DEV_LEVELS: readonly V4LevelFactory[] = [() => new WhisperingWoodsLevel()];

/** Display numbers of planned levels that have no runtime yet. The placeholder screen shows them. */
export const PLANNED_LEVEL_NUMBERS: Readonly<Record<string, string>> = {};

/** The factory for a level id among the campaign and development levels, or null when no level has that id. */
export function findLevelFactory(id: string): V4LevelFactory | null {
  return [...V4_LEVELS, ...DEV_LEVELS].find((factory) => factory().id === id) ?? null;
}

/** The development level with this id, or null. Used only for the URL switch on a new game. */
export function findDevLevelFactory(id: string): V4LevelFactory | null {
  return DEV_LEVELS.find((factory) => factory().id === id) ?? null;
}

/** Every level factory the host may need to preload art for. */
export function allLevelFactories(): readonly V4LevelFactory[] {
  return [...V4_LEVELS, ...DEV_LEVELS];
}
