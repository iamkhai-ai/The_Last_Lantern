/**
 * Active game locale.
 *
 * The choice is a player preference, not campaign progress: it lives in its own storage key so
 * "New Game" (which clears the campaign save) never resets the language. Vietnamese is the
 * authoring language and the default; English is the second layer.
 *
 * The value is cached in module memory because prompts are localized every frame; localStorage is
 * read once per page load, never inside a render call.
 */
export type Locale = 'vi' | 'en';

export const LOCALES: readonly Locale[] = ['vi', 'en'];
export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_STORAGE_KEY = 'last-lantern-locale-v1';

let current: Locale | null = null;

function isLocale(value: unknown): value is Locale {
  return value === 'vi' || value === 'en';
}

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** The active locale. Vietnamese when storage is unavailable, empty, or holds an unknown value. */
export function getLocale(): Locale {
  if (current === null) current = readStoredLocale();
  return current;
}

/** Persist and activate the locale. Storage can be unavailable in private browsing; the choice then lasts the session. */
export function setLocale(locale: Locale): void {
  current = locale;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* The in-memory choice still applies until the page reloads. */
  }
}

/** The other locale, for a two-way toggle row. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'vi' ? 'en' : 'vi';
}

/** Test seam: forget the cached value so the next getLocale() re-reads storage. */
export function resetLocaleCacheForTests(): void {
  current = null;
}
