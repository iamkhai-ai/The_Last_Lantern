import type { Point } from './geometry';

/** A spot that a Pulse can reveal (a carving, a pipe foot, a footprint). */
export interface PulseMark {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Ids of the marks within `radius` (inclusive) of `origin` that are not yet in `found`, in `marks` order.
 * Pulse only reveals; it never powers anything. A negative or NaN radius reveals nothing.
 */
export function revealMarks(
  origin: Point,
  radius: number,
  marks: readonly PulseMark[],
  found: ReadonlySet<string>,
): string[] {
  if (!(radius >= 0)) return [];
  const limit = radius * radius;
  const revealed: string[] = [];
  for (const mark of marks) {
    if (found.has(mark.id) || revealed.includes(mark.id)) continue;
    const dx = mark.x - origin.x;
    const dy = mark.y - origin.y;
    if (dx * dx + dy * dy <= limit) revealed.push(mark.id);
  }
  return revealed;
}
