import type Phaser from 'phaser';
import type { DialogueLine, Interactable } from '../../types/gameTypes';
import type { HintLadder } from '../core/hints';
import type { LevelLayout, HudText } from '../core/level';
import type { Point, Rect } from '../core/geometry';
import type { LanternState } from '../core/lantern';
import type { LumoMode } from '../core/lumo';
import type { PulseMark } from '../core/pulse';
import type { LanternLightingProfile } from '../../systems/LanternSystem';
import type { ChoicePlacement } from '../../ui/ChoiceBox';

/** What the host scene offers a level runtime. Levels never reach the save, the keys or the actors directly. */
export interface LevelHost {
  readonly scene: Phaser.Scene;
  /** The lantern as the save holds it right now. */
  getLantern(): LanternState;
  /** Replaces the lantern. Plays the toggle sound when `on` changes and requests a save. */
  setLantern(next: LanternState): void;
  /** Lumo as the save holds it right now. */
  getLumo(): LumoMode;
  /** Replaces Lumo's mode. Requests a save. */
  setLumo(next: LumoMode): void;
  /** One-time events already played (saved). */
  hasEvent(id: string): boolean;
  markEvent(id: string): void;
  /** True when the journal holds this mark id. */
  hasJournal(id: string): boolean;
  /** Adds a journal entry once (saved). The host shows the usual "written in the journal" toast when it is new. */
  addJournal(id: string): void;
  /** Makes a static-bodied zone solid for Nhinh's foot. The level toggles `zone.body.enable` for doors and gates. */
  solid(zone: Phaser.GameObjects.Zone): void;
  say(lines: DialogueLine[], onDone?: () => void): void;
  /** A small choice box. `onPick` gets the chosen index, or null when the player cancels (ESC). `placement` moves it. */
  choose(options: string[], onPick: (index: number | null) => void, placement?: ChoicePlacement): void;
  toast(text: string): void;
  /** Marks the save dirty. The host writes at most once per 300 ms, and again on shutdown. */
  requestSave(): void;
}

/** One playable V4 level as the host sees it. */
export interface V4LevelRuntime<S> {
  readonly id: string;
  readonly title: string;
  readonly layout: LevelLayout;
  defaultState(): S;
  parseState(raw: unknown): S;
  /**
   * Loads the level's textures. The host calls it from its own preload, before any build. Optional: a level with
   * only Graphics needs none.
   */
  preload?(scene: Phaser.Scene): void;
  /** Illustration texture keys shown before a new game of this level starts. Optional. */
  intro?(): readonly string[];
  /** Draws the room and creates its solids. Called once per scene start. */
  build(host: LevelHost, state: S): void;
  interactables(): Interactable[];
  /** Per frame: recompute live doors/bridges from state + lantern + Lumo, update colliders and visuals. */
  update(dt: number, foot: Rect): void;
  getState(): S;
  hud(): HudText;
  hint(): HintLadder | null;
  pulseMarks(): readonly PulseMark[];
  journalText(id: string): string;
  /** Where Lumo flies for a seal id, or null if the level has no such seal. */
  sealPosition(sealId: string): Point | null;
  lanternLightProfile(): LanternLightingProfile | undefined;
  /** World point the placed lantern's light sits on, or null. */
  pedestalPosition(pedestalId: string): Point | null;
  /** 'lantern': the darkness and lantern light are drawn. 'none': no darkness overlay at all. */
  lighting(): 'lantern' | 'none';
  /** False while Nhinh has no maintenance lantern: F and Pulse are ignored and she is drawn without a lamp. */
  lanternAvailable(): boolean;
  /** False when Lumo is not in this level at all (he first appears in level 01). Optional: absent means present. */
  lumoPresent?(): boolean;
  /** True when the foot body is in the level's exit zone and the level is finished. */
  isExitReached(foot: Rect): boolean;
  /**
   * What happens when the exit is reached. The illustrations play first, then the host starts `nextLevelId`. A level
   * id with no runtime shows the placeholder screen; a null `nextLevelId` returns to the main menu. Null here means
   * the exit is a plain one-time event (the host shows its toast).
   */
  exit(): { illustrations: string[]; nextLevelId: string | null } | null;
  destroy(): void;
}
