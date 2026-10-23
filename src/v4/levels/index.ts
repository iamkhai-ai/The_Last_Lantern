import type { V4LevelRuntime } from '../scene/LevelHost';
import { TestRoomLevel } from './test-room/TestRoomLevel';

/** Makes a fresh runtime for one level. Constructing it touches no Phaser object; `build()` does. */
export type V4LevelFactory = () => V4LevelRuntime<unknown>;

/** Every V4 level in play order. The first one is where a new game starts. */
export const V4_LEVELS: readonly V4LevelFactory[] = [() => new TestRoomLevel()];

/** The factory for a level id, or null when no level has that id. */
export function findLevelFactory(id: string): V4LevelFactory | null {
  return V4_LEVELS.find((factory) => factory().id === id) ?? null;
}
