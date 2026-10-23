import type { StorageLike } from '../core/save';

/**
 * The browser's localStorage, or null when it is missing or refused (private windows, blocked site data).
 * Every use of it goes through the V4 save store, which treats null as an empty store.
 */
export function safeLocalStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}
