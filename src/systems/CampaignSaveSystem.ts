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

export class CampaignSaveSystem {
  public static createDefaultProgress(): CampaignProgress {
    return { version: 1, level: 0, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: false };
  }

  public static hasSave(): boolean {
    try { return this.validate(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')) !== null; }
    catch { return false; }
  }

  public static isCompleted(): boolean {
    return this.load().flags['l9-complete'] === true;
  }

  public static load(): CampaignProgress {
    try { return this.validate(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')) ?? this.createDefaultProgress(); }
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

  private static validate(value: unknown): CampaignProgress | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<CampaignProgress>;
    if (data.version !== 1 || !Number.isFinite(data.level)) return null;
    const validRooms: ObservatoryRoomId[] = ['entrance', 'corridor', 'observatory'];
    if (data.roomId !== undefined && !validRooms.includes(data.roomId)) return null;
    if (data.roomSpawn !== undefined && (!data.roomSpawn || typeof data.roomSpawn !== 'object'
      || !Number.isFinite(data.roomSpawn.x) || !Number.isFinite(data.roomSpawn.y)
      || data.roomSpawn.x < 0 || data.roomSpawn.x > 640 || data.roomSpawn.y < 0 || data.roomSpawn.y > 360)) return null;

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
    const roomId = data.roomId as ObservatoryRoomId | undefined;
    const roomSpawn = data.roomSpawn ? { x: data.roomSpawn.x, y: data.roomSpawn.y } : undefined;
    return { version: 1, level: Math.max(0, Math.min(9, Math.floor(data.level!))), flags, counters, lanternOn: Boolean(data.lanternOn), lanternPickedUp: Boolean(data.lanternPickedUp), ...(roomId ? { roomId } : {}), ...(roomSpawn ? { roomSpawn } : {}) };
  }
}
