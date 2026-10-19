import type { ObservatoryRoomId } from '../data/observatoryRooms';

export interface CampaignProgress {
  version: 1;
  level: number;
  flags: Record<string, boolean | string>;
  counters: Record<string, number>;
  lanternOn: boolean;
  lanternPickedUp: boolean;
  roomId?: ObservatoryRoomId;
  roomSpawn?: { x: number; y: number };
}

const STORAGE_KEY = 'last-lantern-campaign-save-v1';

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

export class CampaignSaveSystem {
  public static createDefaultProgress(): CampaignProgress {
    return { version: 1, level: 0, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: false };
  }

  public static hasSave(): boolean {
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
      return this.validate(raw) !== null || this.recoverInvalidLocation(raw) !== null;
    }
    catch { return false; }
  }

  public static isCompleted(): boolean {
    return this.load().flags['l9-complete'] === true;
  }

  public static load(): CampaignProgress {
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
      const valid = this.validate(raw);
      if (valid) return valid;
      return this.recoverInvalidLocation(raw) ?? this.createDefaultProgress();
    }
    catch { return this.createDefaultProgress(); }
  }

  public static save(progress: CampaignProgress): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        level: Math.max(0, Math.min(9, Math.floor(progress.level))),
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

  private static recoverInvalidLocation(raw: unknown): CampaignProgress | null {
    // A corrupt optional location must not erase otherwise-valid campaign progress.
    if (!raw || typeof raw !== 'object') return null;
    const data = { ...(raw as Record<string, unknown>) };
    const validRooms: ObservatoryRoomId[] = ['entrance', 'corridor', 'observatory'];
    if (data.roomId !== undefined && !validRooms.includes(data.roomId as ObservatoryRoomId)) delete data.roomId;
    const spawn = data.roomSpawn as { x?: unknown; y?: unknown } | null | undefined;
    if (data.roomSpawn !== undefined && (!spawn || typeof spawn !== 'object'
      || !Number.isFinite(spawn.x) || !Number.isFinite(spawn.y)
      || (spawn.x as number) < 0 || (spawn.x as number) > 640
      || (spawn.y as number) < 0 || (spawn.y as number) > 360)) delete data.roomSpawn;
    return this.validate(data);
  }

  private static validate(value: unknown): CampaignProgress | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<CampaignProgress>;
    if (data.version !== 1 || !Number.isFinite(data.level)) return null;
    const validRooms: ObservatoryRoomId[] = ['entrance', 'corridor', 'observatory'];
    if (data.roomId !== undefined && !validRooms.includes(data.roomId as ObservatoryRoomId)) return null;
    if (data.roomSpawn !== undefined) {
      const spawn = data.roomSpawn as { x?: unknown; y?: unknown } | null;
      if (!spawn || typeof spawn !== 'object'
        || !Number.isFinite(spawn.x) || !Number.isFinite(spawn.y)
        || (spawn.x as number) < 0 || (spawn.x as number) > 640
        || (spawn.y as number) < 0 || (spawn.y as number) > 360) return null;
    }
    const roomId = data.roomId as ObservatoryRoomId | undefined;
    const roomSpawn = data.roomSpawn as { x: number; y: number } | undefined;

    const rawFlags = data.flags ?? {};
    const rawCounters = data.counters ?? {};
    const lumoRoom = rawFlags['l8-lumo-room'];
    if (lumoRoom !== undefined && !validRooms.includes(lumoRoom as ObservatoryRoomId)) return null;
    const destination = rawFlags['l8-lumo-destination'];
    if (destination !== undefined && destination !== '' && destination !== 'lumo-seal' && destination !== 'lantern-source') return null;
    const arrived = rawFlags['l8-lumo-arrived'];
    if (arrived !== undefined && arrived !== '' && arrived !== 'lumo-seal' && arrived !== 'lantern-source') return null;
    const routeValue = rawFlags['l8-lumo-route-json'];
    let routeLength = 0;
    if (routeValue !== undefined) {
      if (typeof routeValue !== 'string') return null;
      if (routeValue) {
        try {
          const route: unknown = JSON.parse(routeValue);
          if (!Array.isArray(route) || route.some((step) => !step || typeof step !== 'object'
            || !validRooms.includes((step as { roomId?: ObservatoryRoomId }).roomId as ObservatoryRoomId)
            || !Number.isFinite((step as { x?: number }).x) || !Number.isFinite((step as { y?: number }).y)
            || (step as { x: number }).x < 0 || (step as { x: number }).x > 640
            || (step as { y: number }).y < 0 || (step as { y: number }).y > 360)) return null;
          routeLength = route.length;
        } catch { return null; }
      }
    }
    const routeIndex = rawCounters['l8-lumo-route-index'];
    if (routeIndex !== undefined && (!Number.isInteger(routeIndex) || routeIndex < 0 || routeIndex > routeLength)) return null;
    for (const key of ['l8-lumo-x', 'l8-lantern-x']) {
      const coordinate = rawCounters[key];
      if (coordinate !== undefined && (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 640)) return null;
    }
    for (const key of ['l8-lumo-y', 'l8-lantern-y']) {
      const coordinate = rawCounters[key];
      if (coordinate !== undefined && (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 360)) return null;
    }
    const flags = Object.fromEntries(Object.entries(data.flags ?? {}).filter((entry): entry is [string, boolean | string] => typeof entry[1] === 'boolean' || typeof entry[1] === 'string'));
    const counters = Object.fromEntries(Object.entries(data.counters ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])));
    // An unknown ending beat never invents a chapter: on a completed save it restarts the ending, otherwise it is dropped.
    if ('l9-ending-beat' in flags && !(CAMPAIGN_ENDING_BEATS as readonly string[]).includes(String(flags['l9-ending-beat']))) {
      if (flags['l9-complete'] === true) flags['l9-ending-beat'] = 'night-call';
      else delete flags['l9-ending-beat'];
    }
    return { version: 1, level: Math.max(0, Math.min(9, Math.floor(data.level!))), flags, counters, lanternOn: Boolean(data.lanternOn), lanternPickedUp: Boolean(data.lanternPickedUp), ...(roomId ? { roomId } : {}), ...(roomSpawn ? { roomSpawn } : {}) };
  }
}
