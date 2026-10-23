import { describe, it, expect } from 'vitest';
import {
  V4SaveStore,
  V4_SAVE_BACKUP_KEY,
  V4_SAVE_KEY,
  createDefaultSave,
  parseSave,
  serializeSave,
} from './save';
import type { StorageLike, V4Save } from './save';

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.has(key) ? (this.items.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const throwingStorage: StorageLike = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('denied');
  },
  removeItem() {
    throw new Error('denied');
  },
};

function fullSave(): V4Save {
  return {
    version: 4,
    levelId: 'l2',
    reachedLevelIds: ['l1', 'l2'],
    checkpointId: 'cp-3',
    lantern: { location: { at: 'pedestal', pedestalId: 'p1' }, on: false },
    lumo: { mode: 'holding', sealId: 's1' },
    journal: ['j1', 'j2'],
    events: ['e1'],
    levels: { l2: { mirrors: [1, 0] } },
  };
}

/** Raw JSON of the full save with some fields replaced (or removed when the value is undefined). */
function rawWith(patch: Record<string, unknown>): string {
  const base: Record<string, unknown> = JSON.parse(serializeSave(fullSave()));
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete base[k];
    else base[k] = v;
  }
  return JSON.stringify(base);
}

function expectRepaired(raw: string): V4Save {
  const result = parseSave(raw);
  expect(result).not.toBeNull();
  expect(result?.repaired).toBe(true);
  return result!.save;
}

describe('createDefaultSave', () => {
  it('starts a new game with the lantern in hand and Lumo following', () => {
    expect(createDefaultSave('l1')).toEqual({
      version: 4,
      levelId: 'l1',
      reachedLevelIds: ['l1'],
      checkpointId: '',
      lantern: { location: { at: 'hand' }, on: true },
      lumo: { mode: 'follow' },
      journal: [],
      events: [],
      levels: {},
    });
  });
});

describe('parseSave round trip', () => {
  it('returns the same save and does not repair it', () => {
    expect(parseSave(serializeSave(fullSave()))).toEqual({ save: fullSave(), repaired: false });
  });

  it('round-trips a default save', () => {
    const s = createDefaultSave('l1');
    expect(parseSave(serializeSave(s))).toEqual({ save: s, repaired: false });
  });

  it('keeps a lumo travelling to a seal', () => {
    const s = { ...fullSave(), lumo: { mode: 'travelling' as const, sealId: 's9' } };
    expect(parseSave(serializeSave(s))).toEqual({ save: s, repaired: false });
  });
});

describe('parseSave null cases', () => {
  it('returns null for text that is not JSON', () => {
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave('')).toBeNull();
  });

  it('returns null for JSON that is not a plain object', () => {
    expect(parseSave('null')).toBeNull();
    expect(parseSave('42')).toBeNull();
    expect(parseSave('"text"')).toBeNull();
    expect(parseSave('[]')).toBeNull();
  });

  it('returns null for a different or missing version', () => {
    expect(parseSave(rawWith({ version: 3 }))).toBeNull();
    expect(parseSave(rawWith({ version: '4' }))).toBeNull();
    expect(parseSave(rawWith({ version: undefined }))).toBeNull();
  });

  it('returns null when levelId is missing, empty or not a string', () => {
    expect(parseSave(rawWith({ levelId: '' }))).toBeNull();
    expect(parseSave(rawWith({ levelId: 7 }))).toBeNull();
    expect(parseSave(rawWith({ levelId: undefined }))).toBeNull();
  });
});

describe('parseSave repairs', () => {
  it('replaces a missing lantern with the initial lantern', () => {
    expect(expectRepaired(rawWith({ lantern: undefined })).lantern).toEqual({ location: { at: 'hand' }, on: true });
  });

  it('replaces a lantern whose on flag is not a boolean', () => {
    expect(expectRepaired(rawWith({ lantern: { location: { at: 'hand' }, on: 'yes' } })).lantern).toEqual({
      location: { at: 'hand' },
      on: true,
    });
  });

  it('replaces a pedestal lantern with an empty pedestalId', () => {
    expect(
      expectRepaired(rawWith({ lantern: { location: { at: 'pedestal', pedestalId: '' }, on: true } })).lantern,
    ).toEqual({ location: { at: 'hand' }, on: true });
  });

  it('replaces a lantern with extra keys', () => {
    expect(
      expectRepaired(rawWith({ lantern: { location: { at: 'hand' }, on: false, extra: 1 } })).lantern,
    ).toEqual({ location: { at: 'hand' }, on: true });
  });

  it('replaces a missing lumo with follow', () => {
    expect(expectRepaired(rawWith({ lumo: undefined })).lumo).toEqual({ mode: 'follow' });
  });

  it('replaces a travelling lumo without a sealId with follow', () => {
    expect(expectRepaired(rawWith({ lumo: { mode: 'travelling' } })).lumo).toEqual({ mode: 'follow' });
  });

  it('replaces an unknown lumo mode with follow', () => {
    expect(expectRepaired(rawWith({ lumo: { mode: 'sleeping' } })).lumo).toEqual({ mode: 'follow' });
  });

  it('replaces a non-string checkpointId with the first checkpoint', () => {
    expect(expectRepaired(rawWith({ checkpointId: 3 })).checkpointId).toBe('');
    expect(expectRepaired(rawWith({ checkpointId: undefined })).checkpointId).toBe('');
  });

  it('keeps only unique strings in reachedLevelIds, journal and events', () => {
    const save = expectRepaired(
      rawWith({
        reachedLevelIds: ['l1', 'l2', 'l1', 4, null, 'l2'],
        journal: ['a', 'a', 'b'],
        events: ['e', 3, 'e', 'f'],
      }),
    );
    expect(save.reachedLevelIds).toEqual(['l1', 'l2']);
    expect(save.journal).toEqual(['a', 'b']);
    expect(save.events).toEqual(['e', 'f']);
  });

  it('replaces a non-array reachedLevelIds, journal or events with an empty list', () => {
    const save = expectRepaired(rawWith({ reachedLevelIds: 'l1', journal: {}, events: null }));
    expect(save.reachedLevelIds).toEqual(['l2']);
    expect(save.journal).toEqual([]);
    expect(save.events).toEqual([]);
  });

  it('replaces levels that is not a plain object with an empty object', () => {
    expect(expectRepaired(rawWith({ levels: [1, 2] })).levels).toEqual({});
    expect(expectRepaired(rawWith({ levels: 'x' })).levels).toEqual({});
    expect(expectRepaired(rawWith({ levels: undefined })).levels).toEqual({});
  });

  it('always adds levelId to reachedLevelIds when it is missing', () => {
    const save = expectRepaired(rawWith({ reachedLevelIds: ['l1'], levelId: 'l2' }));
    expect(save.reachedLevelIds).toEqual(['l1', 'l2']);
  });
});

describe('V4SaveStore', () => {
  it('reports no save and loads null when storage is empty', () => {
    const storage = new MemoryStorage();
    const store = new V4SaveStore(storage);
    expect(store.hasSave()).toBe(false);
    expect(store.load()).toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it('saves, reports, loads and clears a save', () => {
    const storage = new MemoryStorage();
    const store = new V4SaveStore(storage);
    store.save(fullSave());
    expect(storage.items.get(V4_SAVE_KEY)).toBe(serializeSave(fullSave()));
    expect(store.hasSave()).toBe(true);
    expect(store.load()).toEqual(fullSave());
    store.clear();
    expect(store.hasSave()).toBe(false);
    expect(store.load()).toBeNull();
  });

  it('writes no backup for a valid save', () => {
    const storage = new MemoryStorage();
    const store = new V4SaveStore(storage);
    store.save(fullSave());
    expect(store.load()).toEqual(fullSave());
    expect(storage.items.has(V4_SAVE_BACKUP_KEY)).toBe(false);
  });

  it('backs up an unreadable value and loads null, leaving the value in place', () => {
    const storage = new MemoryStorage();
    storage.setItem(V4_SAVE_KEY, '{broken');
    const store = new V4SaveStore(storage);
    expect(store.hasSave()).toBe(false);
    expect(store.load()).toBeNull();
    expect(storage.items.get(V4_SAVE_BACKUP_KEY)).toBe('{broken');
    expect(storage.items.get(V4_SAVE_KEY)).toBe('{broken');
  });

  it('backs up a repaired value and loads the repaired save', () => {
    const storage = new MemoryStorage();
    const raw = rawWith({ lumo: undefined });
    storage.setItem(V4_SAVE_KEY, raw);
    const store = new V4SaveStore(storage);
    expect(store.hasSave()).toBe(true);
    const loaded = store.load();
    expect(loaded?.lumo).toEqual({ mode: 'follow' });
    expect(storage.items.get(V4_SAVE_BACKUP_KEY)).toBe(raw);
  });

  it('writes the backup once and never overwrites it', () => {
    const storage = new MemoryStorage();
    const store = new V4SaveStore(storage);
    storage.setItem(V4_SAVE_KEY, '{first');
    store.load();
    storage.setItem(V4_SAVE_KEY, '{second');
    store.load();
    storage.setItem(V4_SAVE_KEY, rawWith({ lantern: undefined }));
    store.load();
    expect(storage.items.get(V4_SAVE_BACKUP_KEY)).toBe('{first');
  });

  it('save() and clear() never touch the backup', () => {
    const storage = new MemoryStorage();
    storage.setItem(V4_SAVE_BACKUP_KEY, 'old-backup');
    const store = new V4SaveStore(storage);
    store.save(fullSave());
    expect(storage.items.get(V4_SAVE_BACKUP_KEY)).toBe('old-backup');
    store.save(createDefaultSave('l1'));
    store.clear();
    expect(storage.items.get(V4_SAVE_BACKUP_KEY)).toBe('old-backup');
    expect(storage.items.has(V4_SAVE_KEY)).toBe(false);
  });

  it('does nothing and reports no save when storage is null', () => {
    const store = new V4SaveStore(null);
    expect(store.hasSave()).toBe(false);
    expect(store.load()).toBeNull();
    expect(() => store.save(fullSave())).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });

  it('behaves like an empty storage when storage throws', () => {
    const store = new V4SaveStore(throwingStorage);
    expect(store.hasSave()).toBe(false);
    expect(store.load()).toBeNull();
    expect(() => store.save(fullSave())).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });

  it('still returns a repaired save when the backup cannot be written', () => {
    const storage = new MemoryStorage();
    storage.setItem(V4_SAVE_KEY, rawWith({ checkpointId: 9 }));
    const failingBackup: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => {
        if (key === V4_SAVE_BACKUP_KEY) throw new Error('quota');
        storage.setItem(key, value);
      },
      removeItem: (key) => storage.removeItem(key),
    };
    const store = new V4SaveStore(failingBackup);
    expect(store.load()?.checkpointId).toBe('');
    expect(storage.items.has(V4_SAVE_BACKUP_KEY)).toBe(false);
  });
});
