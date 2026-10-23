import type { Reach, ReachException } from '../v4/core/reach';

export type ZoneId = 'hub' | 'woods' | 'creek' | 'ruins';

export interface DialogueLine {
  speaker: 'Nhinh' | 'Mẹ' | 'Lái đò' | 'Lumo' | 'Shadow' | 'The Shadow' | 'Hệ thống' | 'Ký Ức' | 'Đứa trẻ trong ký ức' | 'Người lớn trong ký ức' | 'Người Bảo Vệ';
  text: string;
}

/** A thing the player can act on with E. Reach is measured from the foot body (RULE_GAMES.md §1–5). */
export interface Interactable {
  readonly id: string;
  readonly reach: Reach;
  /** A declared exception to the reach rules, with its reason (RULE_GAMES.md §8). */
  readonly exception?: ReachException;
  /** Null hides the control: it is not there right now. A control that is there but cannot act still returns a prompt and explains itself in onInteract (RULE_GAMES §7). */
  getPrompt(): string | null;
  onInteract(): void;
}
