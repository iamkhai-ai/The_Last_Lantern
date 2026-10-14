import { GameProgress, QuestStage, ZoneId } from '../types/gameTypes';

export const SAVE_STORAGE_KEY = 'last-lantern-save-v1';

const VALID_ZONES: ZoneId[] = ['hub', 'woods', 'creek', 'ruins'];
const VALID_STAGES: QuestStage[] = [
  'intro',
  'hub_initial',
  'woods',
  'hub_after_woods',
  'creek',
  'hub_after_creek',
  'ruins',
  'hub_final',
  'finale_overload',
  'victory',
];

export class SaveSystem {
  public static createDefaultProgress(): GameProgress {
    return {
      version: 1,
      stage: 'intro',
      currentZone: 'hub',
      crystals: {
        memory: false,
        hope: false,
        balance: false,
      },
      shadowSeen: false,
      woodsRuneSequence: 0,
      creekMirrors: [0, 0],
      creekBridgeActive: false,
      ruinsLockSequence: 0,
      lanternOn: false,
      lanternPickedUp: false,
      tutorialPulseDone: false,
    };
  }

  public static hasSave(): boolean {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return this.validateProgress(parsed) !== null;
    } catch {
      return false;
    }
  }

  public static load(): GameProgress {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return this.createDefaultProgress();
      const parsed = JSON.parse(raw);
      const validated = this.validateProgress(parsed);
      return validated ?? this.createDefaultProgress();
    } catch {
      return this.createDefaultProgress();
    }
  }

  public static save(progress: GameProgress): void {
    try {
      // Không lưu kẹt ở giữa finale_overload để khi reload có thể kích hoạt lại Cây Mẹ an toàn
      const safeStage: QuestStage =
        progress.stage === 'finale_overload' ? 'hub_final' : progress.stage;
      const cleanCopy: GameProgress = {
        ...progress,
        version: 1,
        stage: safeStage,
        crystals: { ...progress.crystals },
        creekMirrors: [
           ((progress.creekMirrors[0] % 4) + 4) % 4,
          ((progress.creekMirrors[1] % 4) + 4) % 4,
        ],
      };
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(cleanCopy));
    } catch {
      // Fallback an toàn nếu trình duyệt chặn localStorage
    }
  }

  public static clear(): void {
    try {
      window.localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  }

  public static validateProgress(data: unknown): GameProgress | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Partial<GameProgress>;
    if (obj.version !== 1) return null;
    if (!obj.stage || !VALID_STAGES.includes(obj.stage)) return null;
    if (!obj.currentZone || !VALID_ZONES.includes(obj.currentZone)) return null;
    if (!obj.crystals || typeof obj.crystals !== 'object') return null;

    const crystals = {
      memory: Boolean(obj.crystals.memory),
      hope: Boolean(obj.crystals.hope),
      balance: Boolean(obj.crystals.balance),
    };

    const mirrors: [number, number] = Array.isArray(obj.creekMirrors) && obj.creekMirrors.length === 2
      ? [Number(obj.creekMirrors[0]) & 3, Number(obj.creekMirrors[1]) & 3]
      : [0, 0];

    const woodsRuneSequence = crystals.memory
      ? 3
      : Math.max(0, Math.min(3, Number(obj.woodsRuneSequence ?? 0)));

    const creekBridgeActive = crystals.hope ? true : Boolean(obj.creekBridgeActive);

    const ruinsLockSequence = crystals.balance
      ? 3
      : Math.max(0, Math.min(3, Number(obj.ruinsLockSequence ?? 0)));

    const lanternPickedUp =
      obj.stage !== 'intro' ? true : Boolean(obj.lanternPickedUp);

    return {
      version: 1,
      stage: obj.stage === 'finale_overload' ? 'hub_final' : obj.stage,
      currentZone: obj.currentZone,
      crystals,
      shadowSeen: crystals.balance ? true : Boolean(obj.shadowSeen),
      woodsRuneSequence,
      creekMirrors: mirrors,
      creekBridgeActive,
      ruinsLockSequence,
      lanternOn: Boolean(obj.lanternOn),
      lanternPickedUp,
      tutorialPulseDone: obj.stage !== 'intro' ? true : Boolean(obj.tutorialPulseDone),
    };
  }
}
