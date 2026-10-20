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
   * prefers such a control over a nearer neighbouring prop (`update()`), and re-checks it when E is
   * pressed (`tryInteract()`). Absent means the control is an ordinary candidate: nearest wins, ties
   * go to the first registered. This is not a global priority: only the controls that opt in are
   * affected.
   *
   * Precondition for opting in — ownership only *ranks* and *re-checks*; it never suppresses. A
   * control is a candidate as soon as `isEnabled()` passes and its prompt is non-null, whatever
   * `ownsPosition` says: with ownership false it is simply outranked by a rival, or selected when it
   * is the only candidate. So an opted-in control **must** return a falsy prompt and be disabled
   * (`isEnabled() === false`) outside its own domain — otherwise it advertises itself outside its
   * domain, and the E press, which re-validates ownership, refuses the very prompt it just showed
   * (prompt hidden on press, shown again next frame: the "prompt shows but E does nothing" failure).
   * Prompt, enabled and the press must agree: outside the domain, nothing is shown and nothing is
   * accepted.
   */
  ownsPosition?: (playerX: number, playerY: number) => boolean;
  /**
   * Optional. Replaces the radial range test for this control: `InteractionSystem` calls it with the
   * actor position in `update()` and again in the re-validation inside `tryInteract()`, so a control
   * whose approach is not a circle (a stone answered from all four sides, a face-only approach) can
   * share one predicate between the prompt and the E press. `radius` is then unused for range but
   * `x`/`y` still anchor the prompt and break nearest-target ties. Absent means the behaviour is
   * exactly as before: the padded radius decides. Keep the debounce and `ownsPosition` semantics in
   * mind — an opted-in control must still be disabled (or return a falsy prompt) where it may not
   * answer, so `[E]` never appears without accepting the press.
   */
  isInReach?: (playerX: number, playerY: number) => boolean;
}
