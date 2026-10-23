import type { Point, Rect } from './geometry';

/** A place the player restarts at. The first checkpoint of a level is its default. */
export interface Checkpoint {
  readonly id: string;
  /** Actor centre where the player appears. */
  readonly spawn: Point;
  /** Area the checkpoint covers; its spawn lies inside it. */
  readonly zone: Rect;
}

/** The static geometry of a level: bounds, always-solid walls and the checkpoints. */
export interface LevelLayout {
  /** Walkable bounds, normally {0,0,640,360}. */
  readonly world: Rect;
  /** Always solid. */
  readonly walls: readonly Rect[];
  /** The first checkpoint is the default. */
  readonly checkpoints: readonly Checkpoint[];
}

/** The two lines the HUD shows for a level: what to do next and the state of the room. */
export interface HudText {
  readonly objective: string;
  readonly status: string;
}
