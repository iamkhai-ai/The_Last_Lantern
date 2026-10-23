import { describe, it, expect } from 'vitest';
import { pointInRect, rectCenter, rectsOverlap } from './geometry';
import type { Rect } from './geometry';

const R: Rect = { x: 10, y: 20, width: 30, height: 40 };

describe('rectsOverlap', () => {
  it('is false when rectangles only touch along an edge', () => {
    expect(rectsOverlap(R, { x: 40, y: 20, width: 5, height: 5 })).toBe(false);
    expect(rectsOverlap(R, { x: 10, y: 60, width: 5, height: 5 })).toBe(false);
  });

  it('is true when rectangles overlap', () => {
    expect(rectsOverlap(R, { x: 39, y: 59, width: 5, height: 5 })).toBe(true);
    expect(rectsOverlap(R, R)).toBe(true);
  });
});

describe('rectCenter', () => {
  it('returns the centre of the rectangle', () => {
    expect(rectCenter(R)).toEqual({ x: 25, y: 40 });
  });
});

describe('pointInRect', () => {
  it('includes the left and top edges and excludes the right and bottom edges', () => {
    expect(pointInRect({ x: 10, y: 20 }, R)).toBe(true);
    expect(pointInRect({ x: 40, y: 20 }, R)).toBe(false);
    expect(pointInRect({ x: 10, y: 60 }, R)).toBe(false);
    expect(pointInRect({ x: 39.9, y: 59.9 }, R)).toBe(true);
  });
});
