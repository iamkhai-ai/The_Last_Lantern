import { describe, it, expect } from 'vitest';
import { addJournalEntry, journalTexts } from './journal';
import { WORKSHOP_JOURNAL } from '../levels/prologue-workshop/workshopLogic';
import { FOREST_EDGE_JOURNAL_TEXT } from '../levels/forest-edge/forestEdgeLogic';

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

describe('journalTexts across levels', () => {
  const readers = [
    (id: string) => FOREST_EDGE_JOURNAL_TEXT[id] ?? '',
    (id: string) => (WORKSHOP_JOURNAL as Record<string, string>)[id] ?? '',
  ];

  it('keeps the workshop assignment readable alongside forest clues, in collection order', () => {
    expect(journalTexts(['elaria-signal', 'assignment', 'line-s1-a'], readers)).toEqual([
      WORKSHOP_JOURNAL['elaria-signal'],
      WORKSHOP_JOURNAL.assignment,
      FOREST_EDGE_JOURNAL_TEXT['line-s1-a'],
    ]);
  });

  it('never reveals known text for an entry the player has not collected', () => {
    expect(journalTexts(['assignment'], readers)).toEqual([WORKSHOP_JOURNAL.assignment]);
    expect(journalTexts([], readers)).toEqual([]);
  });

  it('ignores unknown saved entries without losing the other notes', () => {
    expect(journalTexts(['unknown-old-note', 'assignment'], readers)).toEqual([WORKSHOP_JOURNAL.assignment]);
  });

  it('gives the current level priority when old local identifiers overlap', () => {
    expect(journalTexts(['shared'], [() => 'Current clue', () => 'Earlier clue'])).toEqual(['Current clue']);
  });
});
