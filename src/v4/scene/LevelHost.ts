import type Phaser from 'phaser';
import type { DialogueLine, Interactable } from '../../types/gameTypes';
import type { HintLadder } from '../core/hints';
import type { LevelLayout, HudText } from '../core/level';
import type { Point, Rect } from '../core/geometry';
import type { LanternState } from '../core/lantern';
import type { LumoMode } from '../core/lumo';
import type { PulseMark } from '../core/pulse';
import type { Footprint, LightMark, Room, SpillDecl } from '../core/light';
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

/** A waking pose: frames shown in order, then the event that marks it played. */
export interface WakePose {
  readonly event: string;
  readonly frames: readonly { readonly texture: string; readonly ms: number }[];
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
  /**
   * Ids of the interactables the player most likely needs next on the reference route; the host marks each with a
   * floor ring and a bobbing arrow. A pointer only: the route is a reference, never a required order (puzzle-contracts §1).
   * Optional: absent or empty draws no marker.
   */
  focus?(): readonly string[];
  /**
   * A one-time waking pose Nhinh plays where she spawns, before the player can move: texture keys in order with their
   * ms, drawn in her frame's place, then her idle sprite. `event` marks it played (saved). Optional: absent or null
   * plays nothing.
   */
  wake?(): WakePose | null;
  /** Called once for each Pulse that fires, with its origin (Nhinh's centre). Art only: never a gameplay condition. Optional. */
  onPulse?(origin: Point): void;
  /**
   * Per frame: recompute live doors/bridges from state + lantern + Lumo, update colliders and visuals.
   * `footprints` are every gameplay footprint this frame (the lantern's and the fixed sources').
   */
  update(dt: number, foot: Rect, footprints: readonly Footprint[]): void;
  getState(): S;
  hud(): HudText;
  hint(): HintLadder | null;
  pulseMarks(): readonly PulseMark[];
  journalText(id: string): string;
  /** Where Lumo flies for a seal id, or null if the level has no such seal. */
  sealPosition(sealId: string): Point | null;
  /** World point the placed lantern's light sits on, or null. */
  pedestalPosition(pedestalId: string): Point | null;
  /** Ambient darkness for this level; constant, never tied to F (puzzle-contracts §1). */
  ambientDarkness(): number;
  /** Light blockers now: walls and closed door/gate leaves. */
  lightBlockers(): readonly Rect[];
  /** Lit and dark marks; the host records seen ones in J. */
  lightMarks(): readonly LightMark[];
  /** Rooms for the "seen" rule. Optional: absent means no room check. */
  rooms?(): readonly Room[];
  /** Declared pedestal spills. Optional. */
  lightSpills?(): readonly SpillDecl[];
  /** Fixed sources' footprints now. Optional. */
  fixedFootprints?(): readonly Footprint[];
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
