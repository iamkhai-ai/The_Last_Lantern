import Phaser from 'phaser';
import { Lumo } from '../../actors/Lumo';
import { Player } from '../../actors/Player';
import { getLocale, otherLocale, setLocale } from '../../i18n/locale.ts';
import { tr } from '../../i18n/catalog.ts';
import { consumeCampaignNewGameIntent } from '../../systems/CampaignStartIntent';
import { DialogueSystem } from '../../systems/DialogueSystem';
import { InteractionSystem } from '../../systems/InteractionSystem';
import { LanternSystem } from '../../systems/LanternSystem';
import { SoundSystem } from '../../systems/SoundSystem';
import { ChoiceBox } from '../../ui/ChoiceBox';
import { CampaignHud } from '../../ui/CampaignHud';
import { PauseMenu } from '../../ui/PauseMenu';
import type { DialogueLine } from '../../types/gameTypes';
import { addJournalEntry } from '../core/journal';
import { pointInRect, rectCenter } from '../core/geometry';
import type { Rect } from '../core/geometry';
import { NO_HINT_CURSOR, nextHint } from '../core/hints';
import type { HintCursor } from '../core/hints';
import { canPulse, toggleLantern } from '../core/lantern';
import type { LanternState } from '../core/lantern';
import { groundPoint, lanternFootprints, marksToRecord } from '../core/light';
import type { Footprint } from '../core/light';
import { followLumo, lumoArrived } from '../core/lumo';
import type { LumoMode } from '../core/lumo';
import { revealMarks } from '../core/pulse';
import { V4SaveStore, createDefaultSave } from '../core/save';
import type { V4Save } from '../core/save';
import {
  PLANNED_LEVEL_NUMBERS,
  V4_LEVELS,
  allLevelFactories,
  findDevLevelFactory,
  findLevelFactory,
} from '../levels';
import type { LevelHost, V4LevelRuntime } from './LevelHost';
import type { IllustrationData } from './IllustrationScene';
import { safeLocalStorage } from './browserStorage';

/** At most one save write per this many milliseconds; a write also happens on shutdown. */
const SAVE_INTERVAL_MS = 300;
/** Lumo's flight speed to a seal, px per second. */
const LUMO_FLY_SPEED = 90;
/** Lumo's hover offset from the point he follows (see Lumo.update). */
const LUMO_OFFSET = { x: 18, y: -12 };

const TOAST_EXIT = 'Đã qua phòng thử.';
const TOAST_JOURNAL_ADDED = 'Đã ghi vào sổ tay.';
const TOAST_JOURNAL_EMPTY = 'Sổ tay chưa có ghi chép.';
const TOAST_PULSE_NEEDS_LANTERN = 'Xung sáng cần đèn trong tay và đang bật.';
const TOAST_NO_HINT = 'Không còn gợi ý cho bước này.';
const TOAST_LUMO_ARRIVED = 'Lumo đã tới ấn.';

/** The URL switch that starts a new game in a development level (the test room, for one). */
const DEV_LEVEL_PARAM = 'v4level';

/** The development level named by the URL, or null when there is none or the URL cannot be read. */
function requestedDevLevelId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(DEV_LEVEL_PARAM);
  } catch {
    return null;
  }
}

/**
 * The host scene. It owns the save, the keys, the actors and the HUD, and runs whichever level the save names
 * through the V4LevelRuntime contract. A save that names a level with no runtime shows the placeholder screen.
 */
export class V4Scene extends Phaser.Scene {
  private store!: V4SaveStore;
  private save!: V4Save;
  private level!: V4LevelRuntime<unknown>;
  private player!: Player;
  private lumo!: Lumo;
  private lanternSystem!: LanternSystem;
  private interactions!: InteractionSystem;
  private dialogue!: DialogueSystem;
  private choice!: ChoiceBox;
  private hud!: CampaignHud;
  private pauseMenu!: PauseMenu;
  private hintCursor: HintCursor = NO_HINT_CURSOR;
  /** True once Lumo has flown to the seal he holds, so the hover takes over from the flight. */
  private lumoSettled = false;
  private saveDirty = false;
  private lastSaveAt = 0;
  /** Set by the pause menu's restart: the save was just cleared and must not be written back on shutdown. */
  private discardSave = false;
  /** Set when the placeholder screen replaces the level: the save names a level with no runtime. */
  private placeholderLevelId: string | null = null;
  /** Set once the exit has started the illustrations: nothing else may start a second transition. */
  private leaving = false;

  constructor() {
    super({ key: 'V4Scene' });
  }

  /** Every level's textures load before any build, so a level can be entered from any save. */
  public preload(): void {
    for (const factory of allLevelFactories()) factory().preload?.(this);
  }

  public create(data?: { newGame?: boolean }): void {
    this.discardSave = false;
    this.saveDirty = false;
    this.lastSaveAt = 0;
    this.hintCursor = NO_HINT_CURSOR;
    this.lumoSettled = false;
    this.placeholderLevelId = null;
    this.leaving = false;
    this.store = new V4SaveStore(safeLocalStorage());

    const newGame = consumeCampaignNewGameIntent(data, this.sys.settings.data);
    if (newGame) {
      const devFactory = findDevLevelFactory(requestedDevLevelId() ?? '');
      this.save = createDefaultSave((devFactory ?? V4_LEVELS[0])().id);
      this.store.save(this.save);
    } else {
      this.save = this.store.load() ?? createDefaultSave(V4_LEVELS[0]().id);
    }

    const factory = findLevelFactory(this.save.levelId);
    if (!factory) {
      this.showPlaceholder(this.save.levelId);
      return;
    }
    this.level = factory();

    // A new game may open with illustrations; they lead back here with the saved game (no new-game flag).
    const intro = newGame ? this.level.intro?.() ?? [] : [];
    if (intro.length > 0) {
      this.scene.start('IllustrationScene', { illustrations: [...intro], next: { scene: 'V4Scene' } } satisfies IllustrationData);
      return;
    }

    const state = this.level.parseState(this.save.levels[this.level.id]);

    const { layout } = this.level;
    this.physics.world.setBounds(layout.world.x, layout.world.y, layout.world.width, layout.world.height);
    const checkpoint = layout.checkpoints.find((c) => c.id === this.save.checkpointId) ?? layout.checkpoints[0];

    this.player = new Player(this, checkpoint.spawn.x, checkpoint.spawn.y);
    this.lumo = new Lumo(this, checkpoint.spawn.x + LUMO_OFFSET.x, checkpoint.spawn.y + LUMO_OFFSET.y);
    this.lumo.setVisible(this.lumoPresent());
    this.lanternSystem = new LanternSystem(this, { ambientDarkness: this.level.ambientDarkness() });
    this.lanternSystem.setLightingEnabled(this.level.lighting() === 'lantern');
    this.interactions = new InteractionSystem(this);
    this.dialogue = new DialogueSystem(this);
    this.choice = new ChoiceBox(this);
    this.hud = new CampaignHud(this);
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => undefined,
      onRestart: () => this.restartNewGame(),
      onMainMenu: () => this.scene.start('MenuScene'),
      // A locale change restarts the scene; the save is written on shutdown and read back on create.
      onLanguageChange: () => {
        setLocale(otherLocale(getLocale()));
        this.scene.restart();
      },
    });

    const host: LevelHost = {
      scene: this,
      getLantern: () => this.save.lantern,
      setLantern: (next) => this.setLantern(next),
      getLumo: () => this.save.lumo,
      setLumo: (next) => this.setLumo(next),
      hasEvent: (id) => this.save.events.includes(id),
      markEvent: (id) => this.markEvent(id),
      hasJournal: (id) => this.save.journal.includes(id),
      addJournal: (id) => this.addJournal(id),
      solid: (zone) => {
        this.physics.add.collider(this.player.sprite, zone);
      },
      say: (lines, onDone) => this.dialogue.startDialogue(lines, onDone),
      choose: (options, onPick) => this.choice.open(options, onPick),
      toast: (text) => this.hud.showToast(text),
      requestSave: () => this.requestSave(),
    };
    this.level.build(host, state);
    for (const item of this.level.interactables()) this.interactions.register(item);

    this.bindKeys();
    this.events.once('shutdown', this.onShutdown, this);
  }

  public update(_time: number, delta: number): void {
    if (this.placeholderLevelId !== null) return;
    const dt = Math.min(delta, 50);
    const now = performance.now();
    const lanternAvailable = this.level.lanternAvailable();
    const locked = this.dialogue.isInputLocked(now) || this.pauseMenu.isOpen() || this.choice.isOpen();
    const lantern = this.save.lantern;

    this.player.update(dt, !locked, lanternAvailable && lantern.location.at === 'hand', lantern.on);
    const foot = this.player.getFootBody();
    // This frame's light: the lantern (in hand or placed, lit or not) and the level's fixed sources.
    const ground = groundPoint({ x: this.player.x, y: this.player.y });
    const footprints: Footprint[] = [
      ...(lanternAvailable
        ? lanternFootprints(lantern, ground, (id) => this.level.pedestalPosition(id), this.level.lightSpills?.() ?? [])
        : []),
      ...(this.level.fixedFootprints?.() ?? []),
    ];
    this.updateLumo(dt);
    this.level.update(dt, foot, footprints);
    this.trackCheckpoint(foot);
    this.checkExit(foot);

    const blockers = this.level.lightBlockers();
    this.lanternSystem.update(dt, footprints, blockers);
    // Seen marks go into the journal once; the host writes them in the same frame they are seen.
    const found = new Set(this.save.journal);
    for (const id of marksToRecord(ground, this.level.lightMarks(), footprints, blockers, this.level.rooms?.() ?? [], found)) {
      this.addJournal(id);
    }
    this.interactions.update(foot, !locked, this.player.sprite.getBounds(), this.lumoPresent() ? [this.lumo.sprite.getBounds()] : []);
    this.dialogue.update(dt);

    const text = this.level.hud();
    this.hud.setTitle(this.level.title);
    this.hud.setObjective(text.objective);
    this.hud.setStatus(text.status);
    this.hud.setKeys({
      move: true,
      run: true,
      interact: true,
      lantern: lanternAvailable,
      pulse: lanternAvailable && this.level.pulseMarks().length > 0,
      journal: true,
      hint: true,
      pause: true,
    });
    this.hud.update(dt, this.lanternSystem.getCooldownRatio());
    this.hud.setHidden(this.dialogue.isActive() || this.pauseMenu.isOpen());

    if (this.saveDirty && now - this.lastSaveAt >= SAVE_INTERVAL_MS) this.writeSave();
  }

  /** Whether Lumo exists in the current level. */
  private lumoPresent(): boolean {
    return this.level.lumoPresent?.() ?? true;
  }

  /** Lumo follows Nhinh, flies to his seal at a constant speed, then holds it (puzzle-contracts section 1). */
  private updateLumo(dt: number): void {
    if (!this.lumoPresent()) return;
    const lumo = this.save.lumo;
    if (lumo.mode === 'follow') {
      this.lumo.update(dt, this.player.x, this.player.y);
      return;
    }
    const seal = this.level.sealPosition(lumo.sealId);
    if (!seal) {
      this.setLumo(followLumo());
      return;
    }
    if (lumo.mode === 'travelling') {
      if (this.lumo.flyTo(dt, seal.x, seal.y, LUMO_FLY_SPEED)) {
        // The seal only counts once Lumo is really there.
        this.lumoSettled = true;
        this.setLumo(lumoArrived(lumo));
        this.hud.showToast(TOAST_LUMO_ARRIVED);
      }
      return;
    }
    // Holding. After a reload he starts beside Nhinh and flies back to the seal; the saved hold stays in force.
    if (!this.lumoSettled) {
      this.lumoSettled = this.lumo.flyTo(dt, seal.x, seal.y, LUMO_FLY_SPEED);
    } else {
      this.lumo.update(dt, seal.x - LUMO_OFFSET.x, seal.y - LUMO_OFFSET.y);
    }
  }

  private setLantern(next: LanternState): void {
    if (next.on !== this.save.lantern.on) SoundSystem.playLanternToggle(next.on);
    this.save = { ...this.save, lantern: next };
    this.requestSave();
  }

  private setLumo(next: LumoMode): void {
    if (next.mode !== 'holding') this.lumoSettled = false;
    this.save = { ...this.save, lumo: next };
    this.requestSave();
  }

  private markEvent(id: string): void {
    if (this.save.events.includes(id)) return;
    this.save = { ...this.save, events: [...this.save.events, id] };
    this.requestSave();
  }

  /** Adds a journal entry once. The toast says it was written; an entry already held says nothing. */
  private addJournal(id: string): void {
    const { entries, added } = addJournalEntry(this.save.journal, id);
    if (!added) return;
    this.save = { ...this.save, journal: [...entries] };
    this.requestSave();
    this.hud.showToast(TOAST_JOURNAL_ADDED);
  }

  private requestSave(): void {
    this.saveDirty = true;
  }

  /** Records the checkpoint when the foot centre enters its zone (RULE_GAMES 6). */
  private trackCheckpoint(foot: Rect): void {
    const centre = rectCenter(foot);
    const hit = this.level.layout.checkpoints.find((c) => pointInRect(centre, c.zone));
    if (!hit || hit.id === this.save.checkpointId) return;
    this.save = { ...this.save, checkpointId: hit.id };
    this.requestSave();
  }

  private checkExit(foot: Rect): void {
    if (this.leaving || !this.level.isExitReached(foot)) return;
    const exit = this.level.exit();
    if (exit) {
      this.leaveForIllustrations(exit);
      return;
    }
    const event = `${this.level.id}-exit`;
    if (this.save.events.includes(event)) return;
    this.markEvent(event);
    this.hud.showToast(TOAST_EXIT);
  }

  /** Plays the exit's illustrations, then starts the next level (or the menu when there is none). */
  private leaveForIllustrations(exit: { illustrations: string[]; nextLevelId: string | null }): void {
    this.leaving = true;
    let next: IllustrationData['next'];
    if (exit.nextLevelId === null) {
      next = { scene: 'MenuScene' };
    } else {
      // The next level's id is saved before the illustrations, so a reload there lands on the same place.
      this.save = { ...this.save, levelId: exit.nextLevelId, checkpointId: '' };
      next = { scene: 'V4Scene' };
    }
    this.writeSave();
    this.scene.start('IllustrationScene', { illustrations: exit.illustrations, next } satisfies IllustrationData);
  }

  /** The pulse reveals marks in range and writes them to the journal. It never powers anything. */
  private pulse(): void {
    const now = performance.now();
    if (this.pauseMenu.isOpen() || this.dialogue.isInputLocked(now)) return;
    if (!this.level.lanternAvailable()) return;
    const marks = this.level.pulseMarks();
    if (marks.length === 0) return;
    const lantern = this.save.lantern;
    if (!canPulse(lantern)) {
      this.hud.showToast(TOAST_PULSE_NEEDS_LANTERN);
      return;
    }
    const origin = { x: this.player.x, y: this.player.y };
    if (!this.lanternSystem.triggerPulse(origin, lantern)) {
      const remaining = this.lanternSystem.getCooldownRatio() * LanternSystem.PULSE_COOLDOWN_MS;
      if (remaining > 0) this.hud.notePulseBlocked(remaining);
      return;
    }
    this.player.playPulseAction();
    const found = new Set(this.save.journal);
    for (const id of revealMarks(origin, LanternSystem.PULSE_MAX_RADIUS, marks, found)) this.addJournal(id);
  }

  private openJournal(): void {
    const lines: DialogueLine[] = this.save.journal
      .map((id) => this.level.journalText(id))
      .filter((text) => text !== '')
      .map((text) => ({ speaker: 'Hệ thống', text }));
    this.dialogue.startDialogue(lines.length > 0 ? lines : [{ speaker: 'Hệ thống', text: TOAST_JOURNAL_EMPTY }]);
  }

  private showHint(): void {
    const ladder = this.level.hint();
    if (!ladder) {
      this.hud.showToast(TOAST_NO_HINT);
      return;
    }
    const next = nextHint(this.hintCursor, ladder);
    this.hintCursor = next.cursor;
    this.hud.showToast(next.text);
  }

  private restartNewGame(): void {
    this.store.clear();
    this.discardSave = true;
    this.scene.start('V4Scene', { newGame: true });
  }

  /** A save that names a level with no runtime: a dark screen and a way back to the menu. Nothing is saved. */
  private showPlaceholder(levelId: string): void {
    this.placeholderLevelId = levelId;
    const number = PLANNED_LEVEL_NUMBERS[levelId] ?? levelId;
    this.add.rectangle(0, 0, 640, 360, 0x05090c).setOrigin(0, 0);
    this.add.text(320, 164, tr('Màn {number} — đang dựng', { number }), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      color: '#f7dfaa',
    }).setOrigin(0.5, 0.5);
    this.add.text(320, 196, tr('[ESC] Về màn hình chính'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#9ec4bd',
    }).setOrigin(0.5, 0.5);
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    keyboard.on('keydown-ESC', (event: KeyboardEvent) => {
      if (!event.repeat) this.scene.start('MenuScene');
    });
  }

  private writeSave(): void {
    const level = this.level;
    this.store.save({ ...this.save, levels: { ...this.save.levels, [level.id]: level.getState() } });
    this.saveDirty = false;
    this.lastSaveAt = performance.now();
  }

  private onShutdown(): void {
    if (!this.discardSave) this.writeSave();
    this.level.destroy();
    this.hud.destroy();
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const codes = Phaser.Input.Keyboard.KeyCodes;
    for (const code of [codes.E, codes.F, codes.H, codes.J, codes.SPACE, codes.ESC, codes.ENTER, codes.W, codes.S]) {
      keyboard.addKey(code);
    }

    keyboard.on('keydown-E', () => {
      const now = performance.now();
      if (this.pauseMenu.isOpen()) this.pauseMenu.triggerSelected();
      else if (this.choice.isOpen()) this.choice.confirm();
      else if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(now);
      else this.interactions.tryInteract(now);
    });
    keyboard.on('keydown-SPACE', () => {
      const now = performance.now();
      if (this.pauseMenu.isOpen()) this.pauseMenu.triggerSelected();
      else if (this.choice.isOpen()) this.choice.confirm();
      else if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(now);
      else this.pulse();
    });
    keyboard.on('keydown-F', (event: KeyboardEvent) => {
      if (event.repeat || this.dialogue.isInputLocked(performance.now()) || this.pauseMenu.isOpen()) return;
      if (this.choice.isOpen() || !this.level.lanternAvailable()) return;
      this.setLantern(toggleLantern(this.save.lantern));
      this.player.playLanternAction(this.save.lantern.on);
    });
    keyboard.on('keydown-H', (event: KeyboardEvent) => {
      if (event.repeat || this.dialogue.isInputLocked(performance.now()) || this.pauseMenu.isOpen()) return;
      if (this.choice.isOpen()) return;
      this.showHint();
    });
    keyboard.on('keydown-J', (event: KeyboardEvent) => {
      if (event.repeat || this.dialogue.isInputLocked(performance.now()) || this.pauseMenu.isOpen()) return;
      if (this.choice.isOpen()) return;
      this.openJournal();
    });
    keyboard.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.choice.isOpen()) this.choice.cancel();
      else if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else if (this.pauseMenu.isOpen()) this.pauseMenu.close();
      else this.pauseMenu.open();
    });
    // While the choice box or the pause menu is open it owns the navigation keys; the choice box ignores key repeat.
    const navigate = (delta: number) => (event: KeyboardEvent): void => {
      if (this.choice.isOpen()) {
        if (!event.repeat) this.choice.move(delta);
        return;
      }
      if (this.pauseMenu.isOpen()) this.pauseMenu.moveSelection(delta);
    };
    for (const key of ['UP', 'W']) keyboard.on(`keydown-${key}`, navigate(-1));
    for (const key of ['DOWN', 'S']) keyboard.on(`keydown-${key}`, navigate(1));
    keyboard.on('keydown-ENTER', () => {
      if (this.choice.isOpen()) this.choice.confirm();
      else if (this.pauseMenu.isOpen()) this.pauseMenu.triggerSelected();
    });
  }
}
