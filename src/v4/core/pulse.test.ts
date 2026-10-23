import { describe, it, expect } from 'vitest';
import { revealMarks } from './pulse';
import type { PulseMark } from './pulse';

const ORIGIN = { x: 100, y: 100 };
const MARKS: PulseMark[] = [
  { id: 'near', x: 110, y: 100 },   // 10 away
  { id: 'edge', x: 100, y: 180 },   // exactly 80 away
  { id: 'far', x: 100, y: 181 },    // 81 away
  { id: 'diag', x: 130, y: 130 },   // about 42.4 away
];

describe('revealMarks', () => {
  it('returns ids within the radius, in marks order', () => {
    expect(revealMarks(ORIGIN, 80, MARKS, new Set())).toEqual(['near', 'edge', 'diag']);
  });

  it('includes a mark exactly on the radius and excludes one just past it', () => {
    expect(revealMarks(ORIGIN, 80, [MARKS[1]], new Set())).toEqual(['edge']);
    expect(revealMarks(ORIGIN, 80, [MARKS[2]], new Set())).toEqual([]);
  });

  it('skips marks already found', () => {
    expect(revealMarks(ORIGIN, 80, MARKS, new Set(['near', 'diag']))).toEqual(['edge']);
  });

  it('returns nothing when no mark is in range', () => {
    expect(revealMarks(ORIGIN, 5, MARKS, new Set())).toEqual([]);
  });

  it('reveals nothing with a zero radius unless the mark is exactly at the origin', () => {
    const atOrigin: PulseMark[] = [{ id: 'here', x: 100, y: 100 }];
    expect(revealMarks(ORIGIN, 0, atOrigin, new Set())).toEqual(['here']);
    expect(revealMarks(ORIGIN, 0, MARKS, new Set())).toEqual([]);
  });

  it('reveals nothing for a negative or NaN radius', () => {
    expect(revealMarks(ORIGIN, -10, MARKS, new Set())).toEqual([]);
    expect(revealMarks(ORIGIN, NaN, MARKS, new Set())).toEqual([]);
  });

  it('reports a duplicated id only once', () => {
    const dup: PulseMark[] = [
      { id: 'x', x: 101, y: 100 },
      { id: 'x', x: 102, y: 100 },
    ];
    expect(revealMarks(ORIGIN, 10, dup, new Set())).toEqual(['x']);
  });

  it('does not mutate its inputs', () => {
    const found = new Set(['near']);
    const marks = [...MARKS];
    revealMarks(ORIGIN, 80, marks, found);
    expect([...found]).toEqual(['near']);
    expect(marks).toEqual(MARKS);
  });
});
