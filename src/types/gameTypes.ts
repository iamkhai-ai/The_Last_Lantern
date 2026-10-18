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
  speaker: 'Nhinh' | 'Lumo' | 'Shadow' | 'The Shadow' | 'Hệ thống' | 'Ký Ức' | 'Đứa trẻ trong ký ức' | 'Người lớn trong ký ức' | 'Người Bảo Vệ';
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
  /**
   * Optional. True while the player's feet stand inside this control's own domain (a floor cell, a
   * socket). Among the candidates that already pass enabled/prompt/range, `InteractionSystem`
   * prefers such a control over a nearer neighbouring prop, and re-checks it when E is pressed.
   * Absent means the control is an ordinary candidate: nearest wins, ties go to the first
   * registered. This is not a global priority: only the controls that opt in are affected.
   */
  ownsPosition?: (playerX: number, playerY: number) => boolean;
}
