import type { ObservatoryRoomId } from '../data/observatoryRooms';

export interface CampaignProgress {
  version: 1;
  level: number;
  /** The furthest level ever reached (0-9). Optional: a save without it reads as `level`. Never decreases. */
  furthest?: number;
  flags: Record<string, boolean | string>;
  counters: Record<string, number>;
  lanternOn: boolean;
  lanternPickedUp: boolean;
  roomId?: ObservatoryRoomId;
  roomSpawn?: { x: number; y: number };
}

const STORAGE_KEY = 'last-lantern-campaign-save-v1';
/** A copy of a save that could not be read or had to be repaired, written once so a later save never silently destroys it. */
const BACKUP_KEY = 'last-lantern-campaign-save-v1-backup';

const validRooms: ObservatoryRoomId[] = ['entrance', 'corridor', 'observatory'];
/** Level 09 Lumo transit, repaired by function: position, route and state are separate groups (see `validate`). */
const LUMO_POSITION_FLAGS = ['l8-lumo-room'];
const LUMO_POSITION_COUNTERS = ['l8-lumo-x', 'l8-lumo-y'];
const LUMO_STATE_FLAGS = ['l8-lumo-destination', 'l8-lumo-arrived', 'l8-lumo-recalled'];
const LUMO_ROUTE_FLAGS = ['l8-lumo-route-json'];
const LUMO_ROUTE_COUNTERS = ['l8-lumo-route-index'];
/** The lantern's placed position: repaired as one pair. */
const LANTERN_PEDESTAL_COUNTERS = ['l8-lantern-x', 'l8-lantern-y'];

/**
 * Checkpoints of the campaign ending, stored as the string flag `l9-ending-beat` (save version stays 1). The list
 * is plain strings so the save layer never imports a Phaser class; `CampaignEndingSequence` uses the same names.
 */
export const CAMPAIGN_ENDING_BEATS = ['night-call', 'night-wait', 'reassure', 'montage', 'shadow-dawn', 'tree-return', 'seated', 'trail-title', 'credits'] as const;
export type CampaignEndingBeat = (typeof CAMPAIGN_ENDING_BEATS)[number];

/** The beat a completed save resumes at: a missing or invalid value means the start of the ending. */
export function readEndingBeat(flags: Record<string, boolean | string>): CampaignEndingBeat {
  const value = flags['l9-ending-beat'];
  return typeof value === 'string' && (CAMPAIGN_ENDING_BEATS as readonly string[]).includes(value) ? value as CampaignEndingBeat : 'night-call';
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isCanvasX = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 640;
const isCanvasY = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 360;
const isRouteStep = (step: unknown): boolean => isPlainObject(step) && validRooms.includes(step.roomId as ObservatoryRoomId)
  && isCanvasX(step.x) && isCanvasY(step.y);
/** A Lumo target: a waypoint name, or empty for none. An absent key is no target either. */
const isLumoTarget = (value: unknown): boolean => value === undefined || value === '' || value === 'lumo-seal' || value === 'lantern-source';

/** The state group: the destination and the arrival are waypoint names (or empty), and `recalled` is a boolean. */
function lumoStateIsValid(flags: Record<string, unknown>): boolean {
  const recalled = flags['l8-lumo-recalled'];
  return isLumoTarget(flags['l8-lumo-destination']) && isLumoTarget(flags['l8-lumo-arrived'])
    && (recalled === undefined || typeof recalled === 'boolean');
}

/**
 * The route length, or null when the route group is malformed: the JSON must hold in-canvas steps in known rooms, and
 * the index must stay inside it. An absent or empty route is an empty route.
 */
function lumoRouteLength(flags: Record<string, unknown>, counters: Record<string, unknown>): number | null {
  let length = 0;
  const route = flags['l8-lumo-route-json'];
  if (route !== undefined) {
    if (typeof route !== 'string') return null;
    if (route) {
      let steps: unknown;
      try { steps = JSON.parse(route); } catch { return null; }
      if (!Array.isArray(steps) || !steps.every(isRouteStep)) return null;
      length = steps.length;
    }
  }
  const index = counters['l8-lumo-route-index'];
  if (index !== undefined && (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > length)) return null;
  return length;
}

/** The position group: a known room and in-canvas coordinates. An absent member is not invalid; the consumer defaults it. */
function lumoPositionIsValid(flags: Record<string, unknown>, counters: Record<string, unknown>): boolean {
  const room = flags['l8-lumo-room'];
  return (room === undefined || validRooms.includes(room as ObservatoryRoomId))
    && (counters['l8-lumo-x'] === undefined || isCanvasX(counters['l8-lumo-x']))
    && (counters['l8-lumo-y'] === undefined || isCanvasY(counters['l8-lumo-y']));
}

function lanternPedestalIsValid(counters: Record<string, unknown>): boolean {
  return (counters['l8-lantern-x'] === undefined || isCanvasX(counters['l8-lantern-x']))
    && (counters['l8-lantern-y'] === undefined || isCanvasY(counters['l8-lantern-y']));
}

/**
 * Repair policy for save v1. Only three things make a save unrecoverable, and they return null: the stored value is
 * not an object, `version` is not 1, or `level` is not a finite number. Everything else is repaired, never rejected,
 * so one bad optional key cannot erase the rest of the campaign:
 *  - `roomId` / `roomSpawn`: each is dropped alone when invalid.
 *  - Level 09 Lumo, by function:
 *    - position (`l8-lumo-room`, `-x`, `-y`) is dropped alone when malformed. Lumo then follows Nhinh from the entrance,
 *      the consumer's default.
 *    - route (`-route-json`, `-route-index`) is dropped alone when malformed. Before arrival, the destination goes too,
 *      so Lumo is free. After arrival the arrival and the recall stand; the route is not needed for them.
 *    - state (`-destination`, `-arrived`, `-recalled`) is dropped together with the route when malformed: a route
 *      without consistent state is meaningless. A seal call or arrival with no live route is dropped the same way when
 *      Lumo is not in the corridor (no room, another room, or a malformed position): the seal is in the corridor, and
 *      nothing walks him there from elsewhere.
 *  - `l8-lantern-x` / `l8-lantern-y` are dropped as a pair; the lantern restores on its pedestal.
 *  - `flags` / `counters` that are not plain objects become `{}`. Other flag values that are not boolean or string,
 *    and counters that are not finite numbers, are dropped one by one.
 *  - `l9-ending-beat` is normalised (see `readEndingBeat`).
 * `load()` never discards a save silently: a non-empty stored string that is unreadable, or that had to be repaired,
 * is copied once to BACKUP_KEY, only while that key is empty. A valid save writes no backup.
 */
export class CampaignSaveSystem {
  public static createDefaultProgress(): CampaignProgress {
    return { version: 1, level: 0, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: false };
  }

  /** Read-only: it never writes a backup. */
  public static hasSave(): boolean {
    const raw = this.readStored();
    return raw !== null && this.parse(raw) !== null;
  }

  public static isCompleted(): boolean {
    return this.load().flags['l9-complete'] === true;
  }

  public static load(): CampaignProgress {
    const raw = this.readStored();
    if (raw === null) return this.createDefaultProgress();
    const result = this.parse(raw);
    if (!result) {
      if (raw) this.backupOnce(raw);
      return this.createDefaultProgress();
    }
    if (result.repaired) this.backupOnce(raw);
    return result.progress;
  }

  public static save(progress: CampaignProgress): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        level: Math.max(0, Math.min(9, Math.floor(progress.level))),
        furthest: Math.max(0, Math.min(9, Math.floor(Math.max(progress.furthest ?? 0, progress.level)))),
        flags: progress.flags,
        counters: progress.counters,
        lanternOn: progress.lanternOn,
        lanternPickedUp: progress.lanternPickedUp,
        ...(progress.roomId ? { roomId: progress.roomId } : {}),
        ...(progress.roomSpawn ? { roomSpawn: { x: progress.roomSpawn.x, y: progress.roomSpawn.y } } : {}),
      } satisfies CampaignProgress));
    } catch { /* Storage can be unavailable in private browsing. */ }
  }

  public static clear(): void {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore storage errors. */ }
  }

  private static readStored(): string | null {
    try { return window.localStorage.getItem(STORAGE_KEY); }
    catch { return null; }
  }

  private static parse(raw: string): { progress: CampaignProgress; repaired: boolean } | null {
    try { return this.validate(JSON.parse(raw)); }
    catch { return null; }
  }

  private static backupOnce(raw: string): void {
    try {
      if (!window.localStorage.getItem(BACKUP_KEY)) window.localStorage.setItem(BACKUP_KEY, raw);
    } catch { /* Storage can be unavailable; the default or repaired progress is still returned. */ }
  }

  /** Applies the repair policy above. Returns null only for an unrecoverable save; `repaired` is true when anything was dropped or coerced. */
  private static validate(value: unknown): { progress: CampaignProgress; repaired: boolean } | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<Record<keyof CampaignProgress, unknown>>;
    if (data.version !== 1 || !Number.isFinite(data.level)) return null;

    let repaired = false;
    const drop = (target: Record<string, unknown>, keys: readonly string[]): void => {
      for (const key of keys) {
        if (key in target) {
          delete target[key];
          repaired = true;
        }
      }
    };

    const level = data.level as number;
    if (!Number.isInteger(level) || level < 0 || level > 9) repaired = true;
    if (typeof data.lanternOn !== 'boolean' || typeof data.lanternPickedUp !== 'boolean') repaired = true;

    // furthest: absent in older saves, which read as `level`. A present value must be an integer in [level, 9]; anything
    // else (below level, above 9, not an integer, not a number) is repaired to `level`.
    const clampedLevel = Math.max(0, Math.min(9, Math.floor(level)));
    let furthest = clampedLevel;
    if (data.furthest !== undefined) {
      const f = data.furthest;
      if (typeof f === 'number' && Number.isInteger(f) && f >= clampedLevel && f <= 9) furthest = f;
      else repaired = true;
    }

    const roomId = validRooms.includes(data.roomId as ObservatoryRoomId) ? data.roomId as ObservatoryRoomId : undefined;
    if (data.roomId !== undefined && roomId === undefined) repaired = true;
    const spawn = data.roomSpawn;
    const roomSpawn = isPlainObject(spawn) && isCanvasX(spawn.x) && isCanvasY(spawn.y) ? { x: spawn.x, y: spawn.y } : undefined;
    if (spawn !== undefined && roomSpawn === undefined) repaired = true;

    if (!isPlainObject(data.flags) || !isPlainObject(data.counters)) repaired = true;
    const rawFlags: Record<string, unknown> = isPlainObject(data.flags) ? data.flags : {};
    const rawCounters: Record<string, unknown> = isPlainObject(data.counters) ? data.counters : {};
    const flags: Record<string, boolean | string> = Object.fromEntries(Object.entries(rawFlags)
      .filter((entry): entry is [string, boolean | string] => typeof entry[1] === 'boolean' || typeof entry[1] === 'string'));
    const counters: Record<string, number> = Object.fromEntries(Object.entries(rawCounters)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])));
    if (Object.keys(flags).length !== Object.keys(rawFlags).length || Object.keys(counters).length !== Object.keys(rawCounters).length) {
      repaired = true;
    }

    // The checks read the raw values, so a malformed member is seen even when the filter above would have removed it.
    const stateOk = lumoStateIsValid(rawFlags);
    const routeLength = lumoRouteLength(rawFlags, rawCounters);
    const positionOk = lumoPositionIsValid(rawFlags, rawCounters);
    const routeLive = routeLength !== null && Number(rawCounters['l8-lumo-route-index'] ?? 0) < routeLength;
    // The seal is in the corridor, and isLumoAtSeal needs Lumo there. A seal call or arrival with no live route is only
    // consistent with him in the corridor: with no room (the consumer defaults it to the entrance), a malformed position,
    // or another room, nothing walks him to the seal, so the call is dropped and Lumo is free.
    const sealBound = rawFlags['l8-lumo-destination'] === 'lumo-seal' || rawFlags['l8-lumo-arrived'] === 'lumo-seal';
    const sealUnreachable = sealBound && !routeLive && (rawFlags['l8-lumo-room'] !== 'corridor' || !positionOk);
    if (!stateOk || sealUnreachable) {
      if (sealUnreachable) repaired = true;
      drop(flags, LUMO_STATE_FLAGS);
      drop(flags, LUMO_ROUTE_FLAGS);
      drop(counters, LUMO_ROUTE_COUNTERS);
    } else if (routeLength === null) {
      drop(flags, LUMO_ROUTE_FLAGS);
      drop(counters, LUMO_ROUTE_COUNTERS);
      // Before arrival, Lumo without a route is free only once the destination is gone.
      if (!rawFlags['l8-lumo-arrived']) drop(flags, ['l8-lumo-destination']);
    }
    if (!positionOk) {
      drop(flags, LUMO_POSITION_FLAGS);
      drop(counters, LUMO_POSITION_COUNTERS);
    }
    if (!lanternPedestalIsValid(rawCounters)) drop(counters, LANTERN_PEDESTAL_COUNTERS);

    // An unknown ending beat never invents a chapter: on a completed save it restarts the ending, otherwise it is dropped.
    if ('l9-ending-beat' in flags && !(CAMPAIGN_ENDING_BEATS as readonly string[]).includes(String(flags['l9-ending-beat']))) {
      repaired = true;
      if (flags['l9-complete'] === true) flags['l9-ending-beat'] = 'night-call';
      else delete flags['l9-ending-beat'];
    }
    return {
      progress: {
        version: 1,
        level: clampedLevel,
        furthest,
        flags,
        counters,
        lanternOn: Boolean(data.lanternOn),
        lanternPickedUp: Boolean(data.lanternPickedUp),
        ...(roomId ? { roomId } : {}),
        ...(roomSpawn ? { roomSpawn } : {}),
      },
      repaired,
    };
  }
}
