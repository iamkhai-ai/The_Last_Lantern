import { describe, it, expect } from 'vitest';
import {
  callLumo,
  followLumo,
  lumoArrived,
  lumoHolds,
  recallLumo,
} from './lumo';
import type { LumoMode } from './lumo';

const travelling = (sealId: string): LumoMode => ({ mode: 'travelling', sealId });
const holding = (sealId: string): LumoMode => ({ mode: 'holding', sealId });

describe('followLumo', () => {
  it('starts following Nhinh', () => {
    expect(followLumo()).toEqual({ mode: 'follow' });
  });
});

describe('callLumo', () => {
  it('sends a following Lumo to the seal', () => {
    expect(callLumo(followLumo(), 'p')).toEqual({ mode: 'travelling', sealId: 'p' });
  });

  it('redirects a travelling Lumo to another seal', () => {
    expect(callLumo(travelling('q'), 'p')).toEqual({ mode: 'travelling', sealId: 'p' });
  });

  it('leaves a Lumo that is already travelling to that seal unchanged', () => {
    const m = travelling('p');
    expect(callLumo(m, 'p')).toBe(m);
  });

  it('leaves a Lumo that already holds that seal unchanged', () => {
    const m = holding('p');
    expect(callLumo(m, 'p')).toBe(m);
  });

  it('sends a Lumo holding another seal to the new one', () => {
    expect(callLumo(holding('q'), 'p')).toEqual({ mode: 'travelling', sealId: 'p' });
  });
});

describe('lumoArrived', () => {
  it('turns travelling into holding the same seal', () => {
    expect(lumoArrived(travelling('p'))).toEqual({ mode: 'holding', sealId: 'p' });
  });

  it('leaves following and holding unchanged', () => {
    const f = followLumo();
    expect(lumoArrived(f)).toBe(f);
    const h = holding('p');
    expect(lumoArrived(h)).toBe(h);
  });
});

describe('recallLumo', () => {
  it('always returns Lumo to following', () => {
    expect(recallLumo(followLumo())).toEqual({ mode: 'follow' });
    expect(recallLumo(travelling('p'))).toEqual({ mode: 'follow' });
    expect(recallLumo(holding('p'))).toEqual({ mode: 'follow' });
  });
});

describe('lumoHolds', () => {
  it('is true only when holding that seal', () => {
    expect(lumoHolds(holding('p'), 'p')).toBe(true);
    expect(lumoHolds(holding('p'), 'q')).toBe(false);
  });

  it('is never true while travelling, even to that seal', () => {
    expect(lumoHolds(travelling('p'), 'p')).toBe(false);
  });

  it('is false while following', () => {
    expect(lumoHolds(followLumo(), 'p')).toBe(false);
  });

  it('is false after a recall', () => {
    expect(lumoHolds(recallLumo(holding('p')), 'p')).toBe(false);
  });
});

describe('the reference path', () => {
  it('call, arrive, then hold; recall ends the hold', () => {
    const called = callLumo(followLumo(), 'p');
    expect(lumoHolds(called, 'p')).toBe(false);
    const arrived = lumoArrived(called);
    expect(lumoHolds(arrived, 'p')).toBe(true);
    expect(lumoHolds(recallLumo(arrived), 'p')).toBe(false);
  });
});
