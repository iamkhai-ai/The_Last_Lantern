import { initialLantern } from './lantern';
import type { LanternState } from './lantern';
import { followLumo } from './lumo';
import type { LumoMode } from './lumo';

export const V4_SAVE_KEY = 'last-lantern-v4-save';
export const V4_SAVE_BACKUP_KEY = 'last-lantern-v4-save-backup';
export const V4_SAVE_VERSION = 4;

/** The V4 save (puzzle-contracts §4). Derived state (beams, bridges, doors) is recomputed, never stored as live. */
export interface V4Save {
  readonly version: 4;
  readonly levelId: string;
  readonly reachedLevelIds: readonly string[];
  /** '' = the level's first checkpoint. */
  readonly checkpointId: string;
  readonly lantern: LanternState;
  readonly lumo: LumoMode;
  readonly journal: readonly string[];
  /** One-time events already played. */
  readonly events: readonly string[];
  /** Per-level state, validated by the level's own parseState(). */
  readonly levels: Readonly<Record<string, unknown>>;
}

/** The subset of the Web Storage API the save needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** A new game at `levelId`: lantern in hand and lit, Lumo following, nothing recorded yet. */
export function createDefaultSave(levelId: string): V4Save {
  return {
    version: V4_SAVE_VERSION,
    levelId,
    reachedLevelIds: [levelId],
    checkpointId: '',
    lantern: initialLantern(),
    lumo: followLumo(),
    journal: [],
    events: [],
    levels: {},
  };
}

/** Serializes a save for storage. */
export function serializeSave(save: V4Save): string {
  return JSON.stringify(save);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function hasExactKeys(o: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k));
}

/** Returns the lantern when `v` has exactly the LanternState shape, otherwise null. */
function readLantern(v: unknown): LanternState | null {
  if (!isRecord(v) || !hasExactKeys(v, ['location', 'on'])) return null;
  const on = v.on;
  const loc = v.location;
  if (typeof on !== 'boolean' || !isRecord(loc)) return null;
  if (loc.at === 'hand' && hasExactKeys(loc, ['at'])) return { location: { at: 'hand' }, on };
  const pedestalId = loc.pedestalId;
  if (loc.at === 'pedestal' && hasExactKeys(loc, ['at', 'pedestalId']) && isNonEmptyString(pedestalId)) {
    return { location: { at: 'pedestal', pedestalId }, on };
  }
  return null;
}

/** Returns Lumo's mode when `v` has exactly the LumoMode shape, otherwise null. */
function readLumo(v: unknown): LumoMode | null {
  if (!isRecord(v)) return null;
  const mode = v.mode;
  if (mode === 'follow' && hasExactKeys(v, ['mode'])) return followLumo();
  const sealId = v.sealId;
  if ((mode === 'travelling' || mode === 'holding') && hasExactKeys(v, ['mode', 'sealId']) && isNonEmptyString(sealId)) {
    return { mode, sealId };
  }
  return null;
}

/** Keeps the unique strings of `v`. Anything dropped, or a non-array, counts as a repair. */
function uniqueStrings(v: unknown): { list: string[]; repaired: boolean } {
  if (!Array.isArray(v)) return { list: [], repaired: true };
  const seen = new Set<string>();
  const list: string[] = [];
  let repaired = false;
  for (const item of v) {
    if (typeof item !== 'string' || seen.has(item)) {
      repaired = true;
      continue;
    }
    seen.add(item);
    list.push(item);
  }
  return { list, repaired };
}

/**
 * Parses and validates a stored save. Returns null when the text is unusable (not JSON, not an object,
 * wrong version, or no levelId). Any other damage is repaired and reported with `repaired: true`.
 */
export function parseSave(raw: string): { save: V4Save; repaired: boolean } | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== V4_SAVE_VERSION || !isNonEmptyString(data.levelId)) return null;

  const levelId = data.levelId;
  let repaired = false;

  const lantern = readLantern(data.lantern);
  if (lantern === null) repaired = true;

  const lumo = readLumo(data.lumo);
  if (lumo === null) repaired = true;

  let checkpointId = '';
  if (typeof data.checkpointId === 'string') {
    checkpointId = data.checkpointId;
  } else {
    repaired = true;
  }

  const reached = uniqueStrings(data.reachedLevelIds);
  if (reached.repaired) repaired = true;
  if (!reached.list.includes(levelId)) {
    reached.list.push(levelId);
    repaired = true;
  }

  const journal = uniqueStrings(data.journal);
  if (journal.repaired) repaired = true;

  const events = uniqueStrings(data.events);
  if (events.repaired) repaired = true;

  let levels: Record<string, unknown> = {};
  if (isRecord(data.levels)) {
    levels = data.levels;
  } else {
    repaired = true;
  }

  const save: V4Save = {
    version: V4_SAVE_VERSION,
    levelId,
    reachedLevelIds: reached.list,
    checkpointId,
    lantern: lantern ?? initialLantern(),
    lumo: lumo ?? followLumo(),
    journal: journal.list,
    events: events.list,
    levels,
  };
  return { save, repaired };
}

/**
 * Storage adapter for the V4 save. `storage` is null when storage is unavailable; every storage call
 * is guarded, and a throwing storage behaves like an empty one.
 */
export class V4SaveStore {
  private readonly storage: StorageLike | null;

  constructor(storage: StorageLike | null) {
    this.storage = storage;
  }

  /** True when a readable save is stored. An unreadable value does not count. */
  hasSave(): boolean {
    const raw = this.readRaw(V4_SAVE_KEY);
    return raw !== null && parseSave(raw) !== null;
  }

  /**
   * Returns the stored save, or null when there is none or it is unreadable. An unreadable or repaired
   * value is copied to the backup key, but only while that key is empty.
   */
  load(): V4Save | null {
    const raw = this.readRaw(V4_SAVE_KEY);
    if (raw === null) return null;
    const parsed = parseSave(raw);
    if (parsed === null || parsed.repaired) this.backupOnce(raw);
    return parsed === null ? null : parsed.save;
  }

  /** Writes the save. Never touches the backup. */
  save(save: V4Save): void {
    this.write(V4_SAVE_KEY, serializeSave(save));
  }

  /** Removes the save. Never touches the backup. */
  clear(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(V4_SAVE_KEY);
    } catch {
      // Storage refused the removal: treated as already empty.
    }
  }

  private readRaw(key: string): string | null {
    if (!this.storage) return null;
    try {
      const value = this.storage.getItem(key);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, value);
    } catch {
      // Storage refused the write: the save is simply not persisted.
    }
  }

  private backupOnce(raw: string): void {
    if (!this.storage) return;
    try {
      if (!this.storage.getItem(V4_SAVE_BACKUP_KEY)) this.storage.setItem(V4_SAVE_BACKUP_KEY, raw);
    } catch {
      // Backup unavailable: nothing else to do.
    }
  }
}
