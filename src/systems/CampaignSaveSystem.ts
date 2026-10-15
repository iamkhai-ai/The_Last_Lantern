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
    const flags = Object.fromEntries(Object.entries(data.flags ?? {}).filter((entry): entry is [string, boolean | string] => typeof entry[1] === 'boolean' || typeof entry[1] === 'string'));
    const counters = Object.fromEntries(Object.entries(data.counters ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])));
    const validRooms: ObservatoryRoomId[] = ['entrance', 'corridor', 'observatory'];
    const roomId = validRooms.includes(data.roomId as ObservatoryRoomId) ? data.roomId as ObservatoryRoomId : undefined;
    const roomSpawn = data.roomSpawn && typeof data.roomSpawn === 'object'
      && Number.isFinite(data.roomSpawn.x) && Number.isFinite(data.roomSpawn.y)
      ? { x: data.roomSpawn.x, y: data.roomSpawn.y }
      : undefined;
    return { version: 1, level: Math.max(0, Math.min(9, Math.floor(data.level!))), flags, counters, lanternOn: Boolean(data.lanternOn), lanternPickedUp: Boolean(data.lanternPickedUp), ...(roomId ? { roomId } : {}), ...(roomSpawn ? { roomSpawn } : {}) };
  }
}
