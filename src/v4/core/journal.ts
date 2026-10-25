/**
 * Adds a journal entry once, keeping the order of existing entries.
 * When `id` is already present the same array is returned with `added: false`.
 */
export function addJournalEntry(
  entries: readonly string[],
  id: string,
): { entries: readonly string[]; added: boolean } {
  if (entries.includes(id)) return { entries, added: false };
  return { entries: [...entries, id], added: true };
}

/** Resolves only collected entries, in order. Readers put the current level first for legacy local ids. */
export function journalTexts(entries: readonly string[], readers: readonly ((id: string) => string)[]): string[] {
  return entries.flatMap((id) => {
    for (const read of readers) {
      const text = read(id);
      if (text !== '') return [text];
    }
    return [];
  });
}
