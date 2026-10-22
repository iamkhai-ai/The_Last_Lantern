/**
 * One catalogue row. Kept in its own module so the translated content files never participate in a
 * circular import with the lookup table that consumes them.
 */
export interface CatalogEntry {
  /** Stable review handle, never used at runtime. */
  readonly id: string;
  /** Authored Vietnamese copy — also the runtime lookup key. */
  readonly vi: string;
  readonly en: string;
}

/** Terse constructor so one translated sentence reads as one line. */
export function entry(id: string, vi: string, en: string): CatalogEntry {
  return { id, vi, en };
}
