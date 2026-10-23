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
