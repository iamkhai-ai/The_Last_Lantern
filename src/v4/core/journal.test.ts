import { describe, it, expect } from 'vitest';
import { addJournalEntry } from './journal';

describe('addJournalEntry', () => {
  it('appends a new entry at the end', () => {
    expect(addJournalEntry(['a', 'b'], 'c')).toEqual({ entries: ['a', 'b', 'c'], added: true });
  });

  it('adds to an empty journal', () => {
    expect(addJournalEntry([], 'a')).toEqual({ entries: ['a'], added: true });
  });

  it('does not append an entry twice', () => {
    const once = addJournalEntry(['a', 'b'], 'a');
    expect(once).toEqual({ entries: ['a', 'b'], added: false });
    const twice = addJournalEntry(once.entries, 'a');
    expect(twice.entries).toEqual(['a', 'b']);
    expect(twice.added).toBe(false);
  });

  it('keeps the order of existing entries', () => {
    const r = addJournalEntry(['z', 'a', 'm'], 'b');
    expect(r.entries).toEqual(['z', 'a', 'm', 'b']);
  });

  it('does not mutate the input array', () => {
    const entries = ['a'];
    addJournalEntry(entries, 'b');
    expect(entries).toEqual(['a']);
  });
});
