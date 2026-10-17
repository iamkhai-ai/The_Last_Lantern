export type ZoneId = 'hub' | 'woods' | 'creek' | 'ruins';

export type QuestStage =
  | 'intro'
  | 'hub_initial'
  | 'woods'
  | 'hub_after_woods'
  | 'creek'
  | 'hub_after_creek'
  | 'ruins'
  | 'hub_final'
  | 'finale_overload'
  | 'victory';

export type CrystalId = 'memory' | 'hope' | 'balance';

export interface GameProgress {
  version: 1;
  stage: QuestStage;
  currentZone: ZoneId;
  crystals: Record<CrystalId, boolean>;
  shadowSeen: boolean;
  woodsRuneSequence: number;      // 0..3, không chứa trạng thái sai
  creekMirrors: [number, number]; // 0..3 rotation states
  creekBridgeActive: boolean;
  ruinsLockSequence: number;      // 0..3
  lanternOn: boolean;
  lanternPickedUp?: boolean;
  tutorialPulseDone?: boolean;
}

export interface DialogueLine {
  speaker: 'Nhinh' | 'Lumo' | 'Shadow' | 'The Shadow' | 'Hệ thống' | 'Ký Ức' | 'Đứa trẻ trong ký ức' | 'Người lớn trong ký ức';
  text: string;
}

export interface InteractableConfig {
  id: string;
  x: number;
  y: number;
  getPromptBounds?: () => { x: number; y: number; width: number; height: number } | null;
  radius: number;
  getPrompt: () => string | null;
  onInteract: () => void;
  isEnabled?: () => boolean;
}
