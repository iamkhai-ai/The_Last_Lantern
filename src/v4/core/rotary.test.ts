import { describe, it, expect } from 'vitest';
import { stepMod } from './rotary';

describe('stepMod', () => {
  it('moves forward and wraps past the last position', () => {
    expect(stepMod(0, 1, 3)).toBe(1);
    expect(stepMod(2, 1, 3)).toBe(0);
  });

  it('matches the Level 02 check: (0 + 2) mod 3 = 2', () => {
    expect(stepMod(0, 2, 3)).toBe(2);
  });

  it('moves backward and wraps below zero', () => {
    expect(stepMod(0, -1, 3)).toBe(2);
    expect(stepMod(1, -1, 3)).toBe(0);
  });

  it('handles deltas larger than the ring in either direction', () => {
    expect(stepMod(1, 7, 3)).toBe(2);
    expect(stepMod(1, -7, 3)).toBe(0);
    expect(stepMod(0, -6, 3)).toBe(0);
  });

  it('returns 0 on a single-position ring', () => {
    expect(stepMod(0, 5, 1)).toBe(0);
    expect(stepMod(0, -5, 1)).toBe(0);
  });

  it('never returns a negative value', () => {
    for (let v = 0; v < 4; v++) {
      for (let d = -9; d <= 9; d++) {
        const r = stepMod(v, d, 4);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(4);
      }
    }
  });

  it('throws when steps is below 1', () => {
    expect(() => stepMod(0, 1, 0)).toThrow(RangeError);
    expect(() => stepMod(0, 1, -2)).toThrow(RangeError);
  });

  it('throws on non-integer input', () => {
    expect(() => stepMod(0.5, 1, 3)).toThrow(RangeError);
    expect(() => stepMod(0, 1.5, 3)).toThrow(RangeError);
    expect(() => stepMod(0, 1, 2.5)).toThrow(RangeError);
    expect(() => stepMod(NaN, 1, 3)).toThrow(RangeError);
  });
});
