/**
 * Moves a rotary selector by `delta` steps on a ring of `steps` positions and wraps around.
 * Throws when `steps` is below 1 or when any argument is not an integer.
 */
export function stepMod(value: number, delta: number, steps: number): number {
  if (!Number.isInteger(value) || !Number.isInteger(delta) || !Number.isInteger(steps)) {
    throw new RangeError(`stepMod needs integers, got value=${value}, delta=${delta}, steps=${steps}`);
  }
  if (steps < 1) {
    throw new RangeError(`stepMod needs steps >= 1, got ${steps}`);
  }
  return ((value + delta) % steps + steps) % steps;
}
