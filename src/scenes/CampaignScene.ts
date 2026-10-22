import Phaser from 'phaser';
import { getLevelArtKey, getLevelBackgroundKey, getShadowArtKey } from '../art/CampaignArt';
import { Lumo } from '../actors/Lumo';
import { Player } from '../actors/Player';
import { CAMPAIGN_LEVELS } from '../data/campaignLevels';
import { activateWoodsRune, canActivateWoodsRune, fitWoodsRuneArt, getWoodsTutorialStage, isWoodsStoneInReach, normalizeRuneProgress, resolveWoodsSpawn, RUNE_ORDER, WHISPERING_WOODS, WOODS_POEM_ART, WOODS_RUNE_ART, WOODS_RUNE_BODY_FIT, worldDepth as woodsDepth, type RuneId, type WoodsStoneId, type WoodsTutorialStage } from '../data/whisperingWoodsLayout';
import { buildWoodsDecor } from '../data/whisperingWoodsDecor';
import { buildForestEdgeDecor } from '../data/forestEdgeDecor';
import { FOREST_ART_ORIGIN, FOREST_DECOR_TEXTURES, FOREST_MOSS_COLOR, FOREST_MOTTLE_COLOR, type ForestDecor } from '../data/forestDecor';
import { LIBRARY_LAYOUT, resolveLibrarySpawn } from '../data/libraryLayout';
import { LibraryLevel } from '../levels/LibraryLevel';
import { PathForTwoLevel } from '../levels/PathForTwoLevel';
import { RuinsOfTwoHalvesLevel } from '../levels/RuinsOfTwoHalvesLevel';
import { isRuinsPositionSafe } from '../data/ruinsOfTwoHalvesLayout';
import { HeartOfElariaLevel } from '../levels/HeartOfElariaLevel';
import { canChargeForestEdgeReceiver, canUseForestEdgePulse, feetAt, FOREST_EDGE, FOREST_EDGE_GATE_SLOT, FOREST_EDGE_LANTERN_PEDESTAL, FOREST_EDGE_SOLIDS, isForestEdgeCenterWalkable, resolveForestEdgeSpawn, worldDepth } from '../data/forestEdgeLayout';
import { forestEdgeFootprintRotation, forestEdgeGuideTarget } from '../data/forestEdgeGuidance';
import { OBSERVATORY_ROOMS, type ObservatoryExit, type ObservatoryRoomId, type ObservatoryRoomPoint, type ObservatoryWaypointId } from '../data/observatoryRooms';
import {
  OBSERVATORY_ALCOVES,
  OBSERVATORY_BODY,
  OBSERVATORY_BRIDGE_LANE,
  OBSERVATORY_RETURN_LOOP_VISUAL_ID,
  OBSERVATORY_ROOT_BED,
  OBSERVATORY_STAMPS,
  OBSERVATORY_WALLS,
  fitObservatoryArt,
  OBSERVATORY_SHADOW,
  observatoryPlacedLightVisible,
  isObservatoryApproachAllowed,
  isObservatoryGateApproachAllowed,
  nearestSafeObservatorySpawn,
  observatoryAlcoves,
  observatoryArtRect,
  observatoryBody,
  observatoryBridgeBlockReason,
  observatoryCompletionReady,
  observatoryDoorBlockReason,
  observatoryDoorOpen,
  observatoryElement,
  observatoryElements,
  observatoryFinalDoorBlockReason,
  observatoryGuidance,
  observatoryPrompt,
  observatoryReturnLoopLane,
  observatorySolidRects,
  rectsOverlap,
  type ObsElement,
  type ObsRect,
  type ObsWorldState,
} from '../data/observatoryLayout';
import { DialogueSystem } from '../systems/DialogueSystem';
import { getLocale, otherLocale, setLocale } from '../i18n/locale.ts';
import { InteractionSystem } from '../systems/InteractionSystem';
import type { ReachFootprint } from '../systems/interactionReach';
import { LanternSystem, LIBRARY_LIGHTING } from '../systems/LanternSystem';
import { CampaignProgress, CampaignSaveSystem } from '../systems/CampaignSaveSystem';
import { consumeCampaignNewGameIntent } from '../systems/CampaignStartIntent';
import { RELEASE_POLICY } from '../config/releaseConfig';
import { applyLevelSelection, reachedLevel } from '../systems/levelSelect';
import { deriveObservatoryState, type ObservatoryDerivedState } from '../systems/ObservatoryPuzzle';
import {
  OBSERVATORY_BEAT_NO_BEAM, OBSERVATORY_BEAT_ROOTS_LIT, OBSERVATORY_CRYSTAL_LINES, OBSERVATORY_EXIT_LINES,
  OBSERVATORY_MEMORY_CAPTION, OBSERVATORY_MEMORY_LUMO, OBSERVATORY_MEMORY_MERGE_CAPTION, OBSERVATORY_MEMORY_RECORDING,
  OBSERVATORY_MEMORY_SHADOW, OBSERVATORY_OPENING_CORRIDOR, OBSERVATORY_OPENING_ENTRANCE, type ObservatoryLine,
} from '../data/observatoryStory';
import { SoundSystem, type AmbienceTheme } from '../systems/SoundSystem';
import { DialogueLine } from '../types/gameTypes';
import { PauseMenu } from '../ui/PauseMenu';
import { CampaignHud, HUD_LAYOUT, PULSE_LEVELS } from '../ui/CampaignHud';
import { ShatteredCreekController } from './ShatteredCreekController';
import { SleeplessTowerLevel } from '../levels/SleeplessTowerLevel';
import { SleepingGardenLevel } from '../levels/SleepingGardenLevel';

export { PULSE_LEVELS };

type KeySet = { e: Phaser.Input.Keyboard.Key; f: Phaser.Input.Keyboard.Key; h: Phaser.Input.Keyboard.Key; j: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key; esc: Phaser.Input.Keyboard.Key };

// Forest visual constants, shared by Level 01 (Forgotten Forest Edge) and Level 02 (Whispering Woods).
// Rendering only; layout and collision live in whisperingWoodsLayout.ts and forestEdgeLayout.ts.
const WOODS_GRASS_TINT = 0x5c7663;
const WOODS_PATH_TINT = 0x8a7558;
const WOODS_PATH_ALPHA = 0.62;
const WOODS_GLOW_DEPTH = 69.2;
const WOODS_GLOW_CYAN = 0x7df2d4;
const WOODS_GLOW_WARM = 0xffe680;
const WOODS_GATE_GLOW = { x: 510, y: 150 };
const WOODS_POEM_GLOW = { x: 136, y: 236 };
const WOODS_RUNE_GLOW_Y_OFFSET = -30;
// Level 01 accent glows. Positions are authored for the Level 01 art; visibility follows progress or the live art.
const FOREST_EDGE_LANTERN_GLOW = { x: FOREST_EDGE.objects.lantern.anchor.x, y: FOREST_EDGE.objects.lantern.anchor.y - 12 };
const FOREST_EDGE_GATE_GLOW = { x: 486, y: 126 };
const FOREST_EDGE_EYE_GLOW = { x: 538, y: 122 };
const FOREST_EDGE_TABLET_GLOW = { x: FOREST_EDGE.objects.tablet.anchor.x, y: FOREST_EDGE.objects.tablet.anchor.y - 30 };
const FOREST_EDGE_RING_GLOW = { x: 410, y: 210 };
/** Path depth: Level 01 keeps its original 0.6; Level 02 keeps 0.55. */
const FOREST_EDGE_PATH_DEPTH = 0.6;
const WOODS_PATH_DEPTH = 0.55;
/** Indoor / stone floors use the soil footstep bed; every outdoor level uses grass. */
const SOIL_FOOTSTEP_LEVELS = new Set<number>([2, 5, 7, 8, 9]);
/** Level index -> ambience theme (see audio/ambience.ts): the forest levels, the library, the creek, the tower's wind, ruins and observatory drones, and the heart tree's pad. */
const AMBIENCE_BY_LEVEL: readonly AmbienceTheme[] = ['forest', 'forest', 'library', 'creek', 'forest', 'tower', 'garden', 'drone', 'drone', 'heart'];

const OPENING: DialogueLine[][] = [
  [{ speaker: 'Nhinh', text: 'Trời vẫn chưa sáng sao?' }, { speaker: 'Nhinh', text: 'Sương vẫn dày quá… Không biết con đường về làng nằm ở phía nào.' }],
  [
    { speaker: 'Nhinh', text: 'Chúng cứ bay quanh những tấm bia kia.' },
    { speaker: 'Lumo', text: 'Tôi nhớ đã từng thấy chúng bay như thế…' },
    { speaker: 'Nhinh', text: 'Ở chỗ này sao?' },
    { speaker: 'Lumo', text: 'Ừ. Hình như hồi đó còn có tiếng trẻ con cười.' },
    { speaker: 'Nhinh', text: 'Bây giờ yên ắng quá.' },
    { speaker: 'Lumo', text: 'Ừ… Kia có một mẩu bia bên lối vào. Mình tới xem nhé?' },
  ],
  [{ speaker: 'Nhinh', text: 'Sách mọc giữa rễ cây. Bốn bức tranh đã bị tháo khỏi vòng ngày đêm.' }, { speaker: 'Lumo', text: 'Người Elaria gửi ký ức vào đây. Hãy xem từng bức dưới ánh đèn và trong bóng tối.' }],
  [{ speaker: 'Nhinh', text: 'Mặt suối không chuyển động. Cây Mẹ đang chờ ba tinh thể.' }, { speaker: 'Lumo', text: 'Những chiếc cầu nhận sức từ ánh sáng. Đặt đèn lên bệ rồi dẫn tia qua các gương.' }],
  [{ speaker: 'Nhinh', text: 'Cửa không có tay mở ở phía này.' }, { speaker: 'Lumo', text: 'Tôi thấy một dấu giống cánh của tôi phía sau khe đá. Cậu gọi tôi tới đó nhé?' }],
  [{ speaker: 'Nhinh', text: 'Tháp vẫn đang hút nước và phát sáng.' }, { speaker: 'Lumo', text: 'Tôi có thể giữ ấn ở trên cao. Cậu nối hai luồng sáng còn lại nhé.' }],
  [{ speaker: 'Nhinh', text: 'Khu vườn đã ngủ quá lâu. Cây nắng và rễ trăng vẫn còn đây.' }, { speaker: 'Lumo', text: 'Chúng cần hai điều khác nhau: ánh sáng ấm và một khoảng tối dịu.' }],
  [{ speaker: 'Nhinh', text: 'Hai mắt ngoài hướng về bàn cân. Mắt ở giữa lại nằm trong một hốc tối.' }, { speaker: 'Lumo', text: 'Có lẽ câu đố cần cả ánh sáng lẫn một vùng không có ánh sáng.' }],
  [...OBSERVATORY_OPENING_ENTRANCE],
  [{ speaker: 'Nhinh', text: 'Ba tinh thể đã tìm được đường về đây.' }, { speaker: 'Lumo', text: 'Trái tim Cây Mẹ cần chúng ta cùng giữ ánh sáng và bóng tối cân bằng.' }],
];

export class CampaignScene extends Phaser.Scene {
  private progress!: CampaignProgress;
  private player!: Player;
  private lumo!: Lumo;
  private lumoTarget = { x: 345, y: 265 };
  /** Set when create() redirects a completed save to the ending: no player, dialogue or interactions exist yet. */
  private redirecting = false;
  private lantern!: LanternSystem;
  private interactions!: InteractionSystem;
  private dialogue!: DialogueSystem;
  private pauseMenu!: PauseMenu;
  private keys!: KeySet;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomColliders: Phaser.Physics.Arcade.Collider[] = [];
  private campaignColliders: Phaser.Physics.Arcade.Collider[] = [];
  private campaignBodies = new Map<string, Phaser.Physics.Arcade.StaticBody>();
  private activeObservatoryRoom: ObservatoryRoomId | null = null;
  /** Door-arch scenery per alcove (never a collider; the sill carries collision). */
  private observatoryAlcoveVisuals = new Map<string, Phaser.GameObjects.Image>();
  private observatoryPuzzleVisuals = new Map<string, Phaser.GameObjects.GameObject>();
  private observatoryElementVisuals = new Map<string, Phaser.GameObjects.Image>();
  /** Every Level 09 collider, keyed by id, mirrored from observatorySolidRects(). */
  private observatorySolids = new Map<string, { rect: ObsRect; body: Phaser.Physics.Arcade.StaticBody }>();
  /** The authored crossing lane: the only walkable cut through the root bed. */
  private readonly observatoryBridgeBounds = new Phaser.Geom.Rectangle(
    OBSERVATORY_BRIDGE_LANE.x, OBSERVATORY_BRIDGE_LANE.y, OBSERVATORY_BRIDGE_LANE.width, OBSERVATORY_BRIDGE_LANE.height);
  /** The root bed's crossing-lane body, removed once the bridge holds. */
  private observatoryRootBody: Phaser.Physics.Arcade.StaticBody | null = null;
  private observatoryShadowVisual?: Phaser.GameObjects.Image;
  private observatoryMemoryOverlay?: Phaser.GameObjects.Rectangle;
  /** The opened return loop's floor strip: exactly one per room, never a collider. */
  private observatoryReturnLoopVisual?: Phaser.GameObjects.TileSprite;
  private observatoryBridgeStones: Phaser.GameObjects.Image[] = [];
  private footprintTrail?: Phaser.GameObjects.Graphics;
  private forestEdgeGuide?: Phaser.GameObjects.Graphics;
  /** Level 01 accent glows. Each is rebuilt by buildLevel(); visibility follows progress or the live eye/tablet art. */
  private forestEdgeLanternGlow?: Phaser.GameObjects.Image;
  private forestEdgeEyeGlow?: Phaser.GameObjects.Image;
  private forestEdgeTabletGlow?: Phaser.GameObjects.Image;
  private forestEdgeRingGlow?: Phaser.GameObjects.Image;
  private campaignBeamGraphics?: Phaser.GameObjects.Graphics;
  private observatoryBridgePendingRemoval = false;
  private observatoryBridgeTraversalSide: 'near' | 'far' | null = null;
  private observatoryMiniatureIndex = 0;
  /** Opened door sills: wall-coloured while the door is shut, floor-coloured once it is open. */
  private observatorySillVisuals = new Map<string, Phaser.GameObjects.Graphics>();
  /** While set, an unassigned Lumo hovers here instead of following Nhinh (the corridor opening beat). */
  private observatoryLumoHold: { x: number; y: number } | null = null;
  private observatoryBeats: ObservatoryLine[][] = [];
  private observatoryWasThroughSeal = false;
  /** Hint ladder (joined text) the observatory hint index belongs to; the objective row is not part of it. */
  private observatoryHintLadderKey = '';
  private hintIndex = 0;
  private heartEnd = false;
  private hud!: CampaignHud;
  /** Guards the demo boundary so a re-fired exit callback cannot stack screens. */
  private demoCompleteShown = false;
  private lastGateCheck = 0;
  private lastLumoSave = 0;
  private lastPlayerSave = 0;
  private runeRevealExpiresAt = 0;
  private readonly activeRevealedRunes = new Set<string>();
  private forestEdgeChargeMs = 0;
  private forestEdgeWasInRing = false;
  private forestEdgeHintStep = '';
  private woodsHintStep = '';
  private woodsFlyIndex = 0;
  private woodsFlyPhase = 0;
  private woodsMemoryOverlay?: Phaser.GameObjects.Graphics;
  private woodsTutorialCue?: Phaser.GameObjects.Graphics;
  private woodsCueStage?: WoodsTutorialStage;
  /** Level 02 rune accent glows, keyed by rune; state is driven by updateRuneRevealVisuals(). */
  private readonly woodsRuneGlows = new Map<RuneId, Phaser.GameObjects.Image>();
  private libraryLevel?: LibraryLevel;
  private shatteredCreek?: ShatteredCreekController;
  private gardenLevel?: SleepingGardenLevel;
  private pathForTwoLevel?: PathForTwoLevel;
  private sleeplessTower?: SleeplessTowerLevel;
  private ruinsLevel?: RuinsOfTwoHalvesLevel;
  private heartLevel?: HeartOfElariaLevel;

  constructor() { super({ key: 'CampaignScene' }); }

  public create(data?: { newGame?: boolean }): void {
    const newGameRequested = consumeCampaignNewGameIntent(data, this.sys.settings.data);
    if (newGameRequested) {
      this.progress = CampaignSaveSystem.createDefaultProgress();
      CampaignSaveSystem.save(this.progress);
    } else {
      this.progress = CampaignSaveSystem.load();
    }
    // A demo build must not build the world, dispatch the full ending, or write
    // anything for a saved run outside its four-level slice. Checking here also
    // covers a direct scene start that bypasses the menu.
    if (this.isBlockedDemoResume(newGameRequested)) {
      this.scene.start('ComingSoonScene', { mode: 'demo-save-blocked' });
      return;
    }
    this.redirecting = !newGameRequested && this.progress.flags['l9-complete'] === true;
    if (this.redirecting) {
      this.scene.start('EndingScene', { campaign: true });
      return;
    }
    this.hintIndex = 0;
    this.heartEnd = false;
    this.demoCompleteShown = false;
    this.lastPlayerSave = 0;
    this.runeRevealExpiresAt = 0;
    this.activeRevealedRunes.clear();
    this.player = new Player(this, 320, 290);
    this.lumoTarget = this.getSavedLumoTarget();
    this.lumo = new Lumo(this, this.progress.counters['lumo-x'] ?? this.lumoTarget.x, this.progress.counters['lumo-y'] ?? this.lumoTarget.y);
    if (this.progress.level === 0 && !this.progress.lanternPickedUp && !this.progress.flags['l0-gate-open']) this.lumo.setVisible(false);
    if (this.progress.level === 0 && (this.progress.lanternPickedUp || this.progress.flags['l0-gate-open'])) this.progress.flags['l0-lumo-met'] = true;
    this.lantern = new LanternSystem(this, this.progress.level === 0, this.progress.level === 1, this.progress.level === 2 ? LIBRARY_LIGHTING : undefined);
    this.lantern.lanternOn = this.progress.lanternOn;
    this.lantern.lanternInHand = this.progress.lanternPickedUp || this.progress.level > 0;
    this.interactions = new InteractionSystem(this);
    this.dialogue = new DialogueSystem(this);
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => undefined,
      onRestart: () => { CampaignSaveSystem.clear(); this.scene.start('PrologueScene'); },
      onMainMenu: () => this.scene.start('MenuScene'),
      // A locale change rebuilds the scene so every drawn string re-renders; progress resumes from the save.
      onLanguageChange: () => { setLocale(otherLocale(getLocale())); this.scene.restart(); },
    }, {
      // The demo build lists only its own slice of level titles; the reach is capped at the same index.
      names: CAMPAIGN_LEVELS.slice(0, RELEASE_POLICY.lastPlayableLevelIndex + 1).map((level) => level.title),
      getCurrent: () => this.progress.level,
      getReached: () => reachedLevel(this.progress, RELEASE_POLICY.lastPlayableLevelIndex),
      onSelect: (index) => this.selectLevel(index),
    });
    this.hud = new CampaignHud(this);
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = {
      e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      f: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      h: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      j: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
    keyboard.on('keydown-E', () => {
      if (this.pauseMenu.isOpen()) this.pauseMenu.triggerSelected();
      else if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else this.interactions.tryInteract(performance.now());
    });
    keyboard.on('keydown-SPACE', () => {
      if (this.pauseMenu.isOpen()) {
        this.pauseMenu.triggerSelected();
        return;
      }
      if (this.dialogue.isActive()) {
        this.dialogue.handleAdvanceInput(performance.now());
        return;
      }
      if (this.pauseMenu.isOpen() || !PULSE_LEVELS.includes(this.progress.level)) return;
      if (this.progress.level === 0 && !canUseForestEdgePulse(this.progress.flags['l0-tablet-read'] === true)) return;
      if (this.lantern.triggerPulse(this.player.x, this.player.y)) {
        this.player.playPulseAction();
        return;
      }
      const remaining = this.lantern.getCooldownRatio() * LanternSystem.PULSE_COOLDOWN_MS;
      if (remaining > 0) this.hud.notePulseBlocked(remaining);
    });
    keyboard.on('keydown-F', () => {
      if (this.progress.level === 3) {
        if (!this.dialogue.isInputLocked(performance.now()) && !this.pauseMenu.isOpen() && this.shatteredCreek?.toggleLantern()) this.player.playLanternAction(this.lantern.lanternOn);
        return;
      }
      if (this.progress.level === 5) {
        if (!this.dialogue.isInputLocked(performance.now()) && !this.pauseMenu.isOpen() && this.sleeplessTower?.toggleLantern()) this.player.playLanternAction(this.lantern.lanternOn);
        return;
      }
      // Level 10 owns F: the final action must work the instant the overload starts, even mid-dialogue.
      if (this.progress.level === 9) {
        if (!this.pauseMenu.isOpen()) this.heartLevel?.handleLanternKey();
        return;
      }
      if (!this.dialogue.isInputLocked(performance.now()) && !this.pauseMenu.isOpen()) {
        if (this.lantern.toggleLantern(performance.now())) {
          this.player.playLanternAction(this.lantern.lanternOn);
          this.progress.lanternOn = this.lantern.lanternOn;
          this.save();
        }
      }
    });
    keyboard.on('keydown-H', () => { if (!this.dialogue.isActive() && !this.pauseMenu.isOpen()) this.progress.level === 3 ? this.shatteredCreek?.showHint() : this.progress.level === 5 ? this.sleeplessTower?.showHint() : this.progress.level === 6 ? this.gardenLevel?.showHint() : this.progress.level === 7 ? this.ruinsLevel?.showHint() : this.showHint(); });
    keyboard.on('keydown-J', () => {
      if (this.dialogue.isActive() || this.pauseMenu.isOpen()) return;
      if (this.progress.level === 3) this.shatteredCreek?.showJournal();
      else if (this.progress.level === 5) this.sleeplessTower?.showJournal();
      else if (this.progress.level === 6) this.gardenLevel?.showJournal();
      else if (this.progress.level === 9) this.heartLevel?.showJournal();
      else if (this.progress.level === 8) this.showObservatoryJournal();
      else if (this.progress.level === 2) this.libraryLevel?.showJournal();
      else if (this.progress.level === 4) this.pathForTwoLevel?.showJournal();
      else if (this.progress.level === 7) this.ruinsLevel?.showJournal();
      else if (this.progress.level === 1) this.showRuneJournal();
      else if (this.progress.level === 0) this.showOpeningJournal();
    });
    keyboard.on('keydown-ESC', () => {
      if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else if (!this.pauseMenu.isOpen()) this.pauseMenu.open();
      else this.pauseMenu.close();
    });
    // While the pause menu is open it owns the navigation keys. Each handler does nothing when the menu is closed.
    const whenPaused = (action: () => void) => (): void => { if (this.pauseMenu.isOpen()) action(); };
    for (const key of ['UP', 'W']) keyboard.on(`keydown-${key}`, whenPaused(() => this.pauseMenu.moveSelection(-1)));
    for (const key of ['DOWN', 'S']) keyboard.on(`keydown-${key}`, whenPaused(() => this.pauseMenu.moveSelection(1)));
    for (const key of ['LEFT', 'A']) keyboard.on(`keydown-${key}`, whenPaused(() => this.pauseMenu.changeLevelChoice(-1)));
    for (const key of ['RIGHT', 'D']) keyboard.on(`keydown-${key}`, whenPaused(() => this.pauseMenu.changeLevelChoice(1)));
    keyboard.on('keydown-ENTER', whenPaused(() => this.pauseMenu.triggerSelected()));

    this.lantern.onPulse((x, y, radius) => {
      this.progress.flags['pulse-used'] = true;
      if (this.progress.level === 0 && this.progress.flags['l0-tablet-read'] && FOREST_EDGE.objects.trail.some((mark) => Math.hypot(x - mark.x, y - mark.y) <= radius)) {
        const firstDiscovery = this.progress.flags['l0-footprints-found'] !== true;
        this.progress.flags['l0-footprints-found'] = true;
        this.footprintTrail?.setVisible(true);
        this.revealForestEdgeFootprints();
        this.hintIndex = 0;
        if (firstDiscovery) this.say([
          { speaker: 'Nhinh', text: 'Có dấu chân thật! Chúng dẫn về phía cổng.' },
          { speaker: 'Lumo', text: 'Có lẽ trước đây người ta cũng đi lối này.' },
          { speaker: 'Nhinh', text: 'Mình theo thử xem.' },
        ]);
      }
      if (this.progress.level === 1) {
        this.activeRevealedRunes.clear();
        this.runeRevealExpiresAt = this.time.now + 5000;
        for (const [id, pos] of Object.entries(WHISPERING_WOODS.anchors).filter(([id]) => ['moon','leaf','star'].includes(id))) {
          if (Math.hypot(pos.x - x, pos.y - y) <= radius) {
            this.activeRevealedRunes.add(id);
            this.progress.flags[`l1-seen-${id}`] = true;
          }
        }
        this.updateRuneRevealVisuals();
      } else if (this.progress.level === 8) {
        for (const [id, pos] of Object.entries(this.getRunePositions())) {
          if (Math.hypot(pos.x - x, pos.y - y) <= radius) this.progress.flags[`revealed-${id}`] = true;
        }
      } else if (this.progress.level === 9) {
        // Scenario §3: Pulse near the root-rule table reveals the moss-covered root lanes.
        this.heartLevel?.onPulse(x, y);
      }
      this.save();
      this.refreshHud();
    });
    this.buildLevel();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shatteredCreek?.destroy();
      this.sleeplessTower?.destroy();
      this.gardenLevel?.destroy();
      SoundSystem.stopFootsteps();
      SoundSystem.stopAmbient();
    });
  }

  public update(_time: number, delta: number): void {
    if (this.redirecting) return;
    const dt = Math.min(delta, 50);
    const locked = this.dialogue.isInputLocked(performance.now()) || this.pauseMenu.isOpen() || this.heartEnd;
    this.player.update(dt, !locked, this.lantern.lanternInHand, this.lantern.lanternOn);
    if (this.progress.level === 0 && this.progress.flags['l0-lumo-met']) {
      this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 18, 24, 616), y: Phaser.Math.Clamp(this.player.y - 20, 58, 305) };
    }
    if (this.progress.level === 1) {
      this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 20, 28, 610), y: Phaser.Math.Clamp(this.player.y - 24, 72, 295) };
      this.updateWoodsFirefly(dt);
    }
    if (this.progress.level === 2) {
      this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 22, 36, 600), y: Phaser.Math.Clamp(this.player.y - 18, 88, 300) };
    }
    if (this.progress.level === 3) this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 18, 24, 616), y: Phaser.Math.Clamp(this.player.y - 20, 88, 305) };
    if (this.progress.level === 6) this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 22, 36, 600), y: Phaser.Math.Clamp(this.player.y - 18, 80, 300) };
    if (this.progress.level === 7) this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 20, 30, 610), y: Phaser.Math.Clamp(this.player.y - 22, 84, 302) };
    if (this.progress.level === 8) this.updateObservatoryLumo(dt);
    else if (this.progress.level !== 4 && this.progress.level !== 5 && this.progress.level !== 9) this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y);
    if (this.progress.level !== 4 && this.progress.level !== 9 && this.time.now - this.lastLumoSave >= 600) {
      this.lastLumoSave = this.time.now;
      const x = Math.round(this.lumo.sprite.x);
      const y = Math.round(this.lumo.sprite.y);
      const lumoXKey = this.progress.level === 8 ? 'l8-lumo-x' : 'lumo-x';
      const lumoYKey = this.progress.level === 8 ? 'l8-lumo-y' : 'lumo-y';
      if (Math.abs((this.progress.counters[lumoXKey] ?? x) - x) > 3 || Math.abs((this.progress.counters[lumoYKey] ?? y) - y) > 3) {
        this.progress.counters[lumoXKey] = x;
        this.progress.counters[lumoYKey] = y;
        this.save();
      }
    }
    if (this.progress.level !== 4 && this.progress.level !== 9 && this.time.now - this.lastPlayerSave >= 600) {
      this.lastPlayerSave = this.time.now;
      const x = Math.round(this.player.x);
      const y = Math.round(this.player.y);
      if (this.progress.level === 8 && this.activeObservatoryRoom) {
        const checkpoint = this.resolveSafeObservatoryCheckpoint(this.activeObservatoryRoom, x, y);
        if (checkpoint) {
          this.progress.roomId = this.activeObservatoryRoom;
          this.progress.roomSpawn = checkpoint;
        }
      }
      // Level 08 keeps its own collision-aware checkpoint: never store a centre whose foot body
      // sits inside a solid, so a reload cannot restore the player out of bounds.
      if (this.progress.level === 7) {
        if (isRuinsPositionSafe({ x, y })) {
          this.progress.counters['player-level'] = this.progress.level;
          this.progress.counters['player-x'] = x;
          this.progress.counters['player-y'] = y;
          this.save();
        }
      } else if (this.progress.counters['player-level'] !== this.progress.level || Math.abs((this.progress.counters['player-x'] ?? x) - x) > 3 || Math.abs((this.progress.counters['player-y'] ?? y) - y) > 3) {
        this.progress.counters['player-level'] = this.progress.level;
        this.progress.counters['player-x'] = x;
        this.progress.counters['player-y'] = y;
        this.save();
      }
    }
    if (this.progress.level === 8 && this.activeObservatoryRoom) {
      this.lantern.setPlacedLightVisible(observatoryPlacedLightVisible(this.activeObservatoryRoom, this.lantern.lanternPlaced));
      this.flushObservatoryBeats();
    }
    this.lantern.update(dt, this.player.x, this.player.y);
    this.updateForestEdgeProgress(dt);
    this.updateForestEdgeGuide(locked);
    if (this.progress.level === 8 && this.activeObservatoryRoom) {
      this.updateObservatoryCrossingState();
      this.refreshObservatoryDoors();
      this.refreshObservatoryPuzzle();
    }
    if (this.progress.level === 3) this.shatteredCreek?.update();
    if (this.progress.level === 5) this.sleeplessTower?.update(dt);
    this.interactions.update(
      this.player.x,
      this.player.y,
      !locked,
      this.player.sprite.getBounds(),
      [
        ...(this.lumo.sprite.visible ? [this.lumo.sprite.getBounds()] : []),
        ...(this.libraryLevel?.getProtectedPromptBounds() ?? []),
        ...(this.gardenLevel?.getProtectedPromptBounds() ?? []),
        ...(this.pathForTwoLevel?.getProtectedPromptBounds() ?? []),
        ...(this.sleeplessTower?.getProtectedPromptBounds() ?? []),
        ...(this.ruinsLevel?.getProtectedPromptBounds() ?? []),
        ...(this.heartLevel?.getProtectedPromptBounds() ?? []),
      ],
      this.player.getFootBody(),
    );
    this.libraryLevel?.update();
    if (this.progress.level === 6) this.gardenLevel?.update(dt);
    this.pathForTwoLevel?.update(dt);
    this.ruinsLevel?.update(dt);
    this.heartLevel?.update(dt);
    if (this.progress.level !== 3 && this.progress.level !== 4 && this.progress.level !== 5 && this.progress.level !== 6 && this.progress.level !== 7 && this.progress.level !== 9) {
      this.updatePuzzle(dt);
      this.updateCampaignBarriers();
      this.refreshCampaignPuzzleVisuals();
    }
    this.dialogue.update(dt);
    this.refreshHud();
    this.hud.update(dt, this.lantern.getCooldownRatio());
    this.hud.setHidden(this.dialogue.isActive() || this.pauseMenu.isOpen());
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) && !locked && !this.pauseMenu.isOpen()) this.pauseMenu.open();
  }

  private updateForestEdgeProgress(dt: number): void {
    if (this.progress.level !== 0) return;
    const center = { x: this.player.x, y: this.player.y };
    const feet = feetAt(center);
    if (!this.progress.lanternPickedUp && !this.progress.flags['l0-lumo-met'] && !this.dialogue.isActive()
      && Math.hypot(center.x - FOREST_EDGE.objects.lantern.stand.x, center.y - FOREST_EDGE.objects.lantern.stand.y) <= 65) {
      this.progress.flags['l0-lumo-met'] = true;
      this.lumo.setVisible(true);
      this.lumoTarget = { x: center.x + 18, y: center.y - 12 };
      this.progress.counters['lumo-x'] = this.lumoTarget.x;
      this.progress.counters['lumo-y'] = this.lumoTarget.y;
      this.save();
      this.say([
        { speaker: 'Lumo', text: 'Này! Ở đây!' },
        { speaker: 'Nhinh', text: 'Ai vừa nói đấy?' },
        { speaker: 'Lumo', text: 'Cạnh chiếc đèn này! Tôi là Lumo.' },
        { speaker: 'Nhinh', text: 'Một con đom đóm… biết nói?' },
        { speaker: 'Lumo', text: 'Còn cậu? Sao lại ngủ ở đây?' },
        { speaker: 'Nhinh', text: 'Tôi là Nhinh. Tôi bị lạc. Cậu có biết đường ra khỏi rừng không?' },
        { speaker: 'Lumo', text: 'Đây là Elaria. Tôi từng biết các lối ở đây, nhưng giờ chẳng nhớ rõ nữa.' },
        { speaker: 'Nhinh', text: 'Tôi định chờ trời sáng rồi tìm đường. Mà chờ mãi…' },
        { speaker: 'Lumo', text: 'Ở đây đã lâu không có bình minh rồi.' },
        { speaker: 'Nhinh', text: 'Không có bình minh? Vậy cứ ngồi đợi cũng chẳng ích gì.' },
        { speaker: 'Lumo', text: 'Tôi còn nhớ Cây Mẹ, ở sâu trong rừng. Có lẽ tới đó, tôi sẽ nhớ thêm được điều gì.' },
        { speaker: 'Nhinh', text: 'Vậy mình tới đó thử xem. Cậu đi cùng tôi nhé?' },
        { speaker: 'Lumo', text: 'Tất nhiên rồi! Nhưng mang chiếc đèn này theo nhé. Trong rừng tối lắm.' },
      ]);
    }
    const ring = FOREST_EDGE.objects.ring.ground;
    const inRing = Math.hypot(feet.x - ring.x, feet.y - ring.y) <= FOREST_EDGE.objects.ring.radius;
    if (inRing && !this.lantern.lanternOn && this.progress.lanternPickedUp && this.progress.flags['l0-tablet-read'] && this.progress.flags['l0-footprints-found'] && !this.progress.flags['l0-ring-dark-cued']) {
      this.progress.flags['l0-ring-dark-cued'] = true;
      this.say([{ speaker: 'Lumo', text: 'Cậu thử thắp đèn lên nhé. Từ chỗ đó, ánh sáng có thể chiếu tới mắt đá.' }]);
    }
    if (!inRing) this.progress.flags['l0-ring-dark-cued'] = false;
    const canCharge = canChargeForestEdgeReceiver(
      feet, this.lantern.lanternOn, this.progress.flags['l0-tablet-read'] === true,
      this.progress.flags['l0-footprints-found'] === true, this.progress.flags['l0-gate-open'] === true,
    );
    if (canCharge) {
      this.forestEdgeChargeMs += dt;
      this.setForestEdgeArt('sun-eye', this.forestEdgeChargeMs >= FOREST_EDGE.chargeMs ? 'sun-eye-full' : 'sun-eye-receiving');
      if (this.forestEdgeChargeMs >= FOREST_EDGE.chargeMs && !this.progress.flags['l0-gate-open']) {
        this.progress.flags['l0-gate-open'] = true;
        this.forestEdgeChargeMs = 0;
        this.save();
        this.setForestEdgeArt('sun-eye', 'sun-eye-full');
        this.say([{ speaker: 'Nhinh', text: 'Mắt đá sáng lên… Cổng mở rồi!' }, { speaker: 'Lumo', text: 'Tôi biết mà! Ánh sáng vẫn đánh thức được những thứ trong khu rừng này.' }]);
      }
    } else {
      this.forestEdgeChargeMs = 0;
      this.setForestEdgeArt('sun-eye', this.progress.flags['l0-gate-open'] ? 'sun-eye-full' : 'sun-eye-dormant');
    }
    this.forestEdgeWasInRing = inRing;
  }

  private updateForestEdgeGuide(gameplayLocked: boolean): void {
    const guide = this.forestEdgeGuide;
    if (!guide) return;
    if (this.progress.level !== 0 || gameplayLocked || this.dialogue.isInputLocked(performance.now())
      || this.pauseMenu.isOpen() || this.heartEnd) {
      guide.clear().setVisible(false);
      return;
    }

    const target = forestEdgeGuideTarget(this.getForestEdgeStep());
    if (!target) {
      guide.clear().setVisible(false);
      return;
    }

    const targetPoint = target === 'lantern' ? FOREST_EDGE.objects.lantern.anchor
      : target === 'tablet' ? FOREST_EDGE.objects.tablet.anchor : FOREST_EDGE.objects.ring.ground;
    const feet = feetAt({ x: this.player.x, y: this.player.y });
    const dx = targetPoint.x - feet.x;
    const dy = targetPoint.y - feet.y;
    const distance = Math.hypot(dx, dy);
    guide.clear().setPosition(0, 0).setDepth(72);
    if (distance > 0.01) {
      const ux = dx / distance;
      const uy = dy / distance;
      const bounds = this.player.sprite.getBounds();
      const xExit = Math.abs(ux) > 0.001
        ? ((ux > 0 ? bounds.right : bounds.left) - feet.x) / ux : Number.POSITIVE_INFINITY;
      const yExit = Math.abs(uy) > 0.001
        ? ((uy > 0 ? bounds.bottom : bounds.top) - feet.y) / uy : Number.POSITIVE_INFINITY;
      const actorExit = Math.max(0, Math.min(xExit > 0 ? xExit : Number.POSITIVE_INFINITY, yExit > 0 ? yExit : Number.POSITIVE_INFINITY));
      const startDistance = actorExit + 3;
      const startX = feet.x + ux * startDistance;
      const startY = feet.y + uy * startDistance;
      const tipX = feet.x + ux * (startDistance + 13);
      const tipY = feet.y + uy * (startDistance + 13);
      const backX = tipX - ux * 4;
      const backY = tipY - uy * 4;
      const left = { x: backX - uy * 4, y: backY + ux * 4 };
      const right = { x: backX + uy * 4, y: backY - ux * 4 };
      guide.lineStyle(4, 0x07151c, 0.95);
      guide.lineBetween(startX, startY, tipX, tipY);
      guide.lineBetween(tipX, tipY, left.x, left.y);
      guide.lineBetween(tipX, tipY, right.x, right.y);
      guide.lineStyle(2, 0xffe680, 1);
      guide.lineBetween(startX, startY, tipX, tipY);
      guide.lineBetween(tipX, tipY, left.x, left.y);
      guide.lineBetween(tipX, tipY, right.x, right.y);
    }
    guide.setVisible(true);
  }

  private buildLevel(): void {
    // Ambience and footstep surface belong to the level being built, so drop any
    // loop left over from the previous one before the room is torn down.
    // The ambience belongs to the level being built: crossfade to its theme (asking for the one already playing is a no-op).
    // Tower and garden choose their theme after restoring their normalized puzzle state.
    if (this.progress.level !== 5 && this.progress.level !== 6) {
      SoundSystem.startAmbient(AMBIENCE_BY_LEVEL[this.progress.level] ?? 'forest');
    }
    SoundSystem.setFootstepSurface(SOIL_FOOTSTEP_LEVELS.has(this.progress.level) ? 'soil' : 'grass');
    // Level 8 returns before the teardown further down, so the level-7 ruins controller is released first.
    this.ruinsLevel?.destroy();
    this.ruinsLevel = undefined;
    if (this.progress.level === 8) {
      this.buildObservatoryRoom(this.progress.roomId ?? 'entrance');
      return;
    }
    this.clearCampaignColliders();
    this.libraryLevel?.destroy();
    this.libraryLevel = undefined;
    this.shatteredCreek?.destroy();
    this.shatteredCreek = undefined;
    this.gardenLevel?.destroy();
    this.gardenLevel = undefined;
    this.pathForTwoLevel?.destroy();
    this.pathForTwoLevel = undefined;
    this.sleeplessTower?.destroy();
    this.sleeplessTower = undefined;
    this.heartLevel?.destroy();
    this.heartLevel = undefined;
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.woodsRuneGlows.clear();
    this.forestEdgeGuide = undefined;
    this.forestEdgeLanternGlow = undefined;
    this.forestEdgeEyeGlow = undefined;
    this.forestEdgeTabletGlow = undefined;
    this.forestEdgeRingGlow = undefined;
    this.interactions.clear();
    const level = this.progress.level;
    const definition = CAMPAIGN_LEVELS[level];
    if (level !== 2 && level !== 3 && level !== 4 && level !== 5 && level !== 7) this.drawRoom(definition.biome);
    if (level === 3) {
      this.shatteredCreek = new ShatteredCreekController({
        scene: this, player: this.player, lumo: this.lumo, lantern: this.lantern, interactions: this.interactions,
        progress: this.progress, save: () => this.save(), say: (lines, done) => this.say(lines, done), nextLevel: (lines) => this.nextLevel(lines), isDialogueActive: () => this.dialogue.isActive(),
      });
      const saved = this.progress.counters['player-level'] === level && Number.isFinite(this.progress.counters['player-x']) && Number.isFinite(this.progress.counters['player-y'])
        ? { x: this.progress.counters['player-x'], y: this.progress.counters['player-y'] } : undefined;
      this.shatteredCreek.build(saved);
      SoundSystem.startAmbientCreek();
      this.refreshHud();
      return;
    }
    if (level === 5) {
      this.sleeplessTower = new SleeplessTowerLevel({
        scene: this, progress: this.progress, player: this.player, lumo: this.lumo, interactions: this.interactions,
        lantern: this.lantern, save: () => this.save(), say: (lines, done) => this.say(lines, done), nextLevel: (lines) => this.nextLevel(lines), canStartStory: () => !this.dialogue.isActive(),
      });
      const saved = this.progress.counters['player-level'] === level && Number.isFinite(this.progress.counters['player-x']) && Number.isFinite(this.progress.counters['player-y'])
        ? { x: this.progress.counters['player-x'], y: this.progress.counters['player-y'] } : undefined;
      this.sleeplessTower.build(saved);
      this.refreshHud();
      return;
    }
    const savedPlayerX = this.progress.counters['player-level'] === level ? this.progress.counters['player-x'] : undefined;
    const savedPlayerY = this.progress.counters['player-level'] === level ? this.progress.counters['player-y'] : undefined;
    const defaultPlayerX = [320, 320, 320, 90, 90, 90, 90, 320, 320, 320][level];
    if (level === 0) {
      this.player.setFootPlacement(FOREST_EDGE.player.footOffsetY, FOREST_EDGE.player.body.offsetY, FOREST_EDGE.player.body.offsetX, FOREST_EDGE.player.body.width, FOREST_EDGE.player.body.height);
      const spawn = resolveForestEdgeSpawn(
        typeof savedPlayerX === 'number' && typeof savedPlayerY === 'number' ? { x: savedPlayerX, y: savedPlayerY } : undefined,
        { tabletRead: this.progress.flags['l0-tablet-read'] === true, footprintsFound: this.progress.flags['l0-footprints-found'] === true, gateOpen: this.progress.flags['l0-gate-open'] === true },
      );
      this.player.setPosition(spawn.x, spawn.y);
      this.forestEdgeChargeMs = 0;
      this.forestEdgeWasInRing = false;
      this.forestEdgeGuide = this.track(this.add.graphics().setDepth(72).setVisible(false));
    } else if (level === 1) {
      this.player.setFootPlacement(WHISPERING_WOODS.player.footOffsetY, WHISPERING_WOODS.player.body.offsetY, WHISPERING_WOODS.player.body.offsetX, WHISPERING_WOODS.player.body.width, WHISPERING_WOODS.player.body.height);
      const state = this.normalizeAndPersistWoodsProgress();
      const saved = typeof savedPlayerX === 'number' && typeof savedPlayerY === 'number' ? { x: savedPlayerX, y: savedPlayerY } : undefined;
      const spawn = resolveWoodsSpawn(saved, state.open);
      this.player.setPosition(spawn.x, spawn.y);
    } else if (level === 2) {
      this.player.setFootPlacement(LIBRARY_LAYOUT.actor.feetY, LIBRARY_LAYOUT.actor.bodyY,
        LIBRARY_LAYOUT.actor.bodyX, LIBRARY_LAYOUT.actor.bodyWidth, LIBRARY_LAYOUT.actor.bodyHeight);
      const spawn = resolveLibrarySpawn(
        typeof savedPlayerX === 'number' && typeof savedPlayerY === 'number' ? { x: savedPlayerX, y: savedPlayerY } : undefined,
        // The gate opens with the crystal alone; a legacy save with the crystal but no fifth painting counts as open.
        this.progress.flags['l2-crystal'] === true,
      );
      this.player.setPosition(spawn.x, spawn.y);
    } else if (level !== 4 && level !== 6 && level !== 9) {
      this.player.setFootPlacement(0, 27);
      this.player.setPosition(
        typeof savedPlayerX === 'number' ? Phaser.Math.Clamp(savedPlayerX, 24, 616) : defaultPlayerX,
        typeof savedPlayerY === 'number' ? Phaser.Math.Clamp(savedPlayerY, 58, 305) : 290,
      );
    }
    // Level 10 (index 9) owns its own foot body, lantern state, Lumo and safe spawn: HeartOfElariaLevel.build().
    (this.player.sprite.body as Phaser.Physics.Arcade.Body | null)?.updateFromGameObject();
    this.lumoTarget = level === 2
      ? { x: Phaser.Math.Clamp(this.player.x - 22, 36, 600), y: Phaser.Math.Clamp(this.player.y - 18, 88, 300) }
      : this.getSavedLumoTarget();
    this.lumo.sprite.setPosition(level === 2 ? this.lumoTarget.x : this.progress.counters['lumo-x'] ?? this.lumoTarget.x,
      level === 2 ? this.lumoTarget.y : this.progress.counters['lumo-y'] ?? this.lumoTarget.y);
    this.lumo.setVisible(level !== 0 || this.progress.lanternPickedUp || this.progress.flags['l0-gate-open'] === true || this.progress.flags['l0-lumo-met'] === true);
    this.lantern.lanternInHand = this.progress.lanternPickedUp || level > 0;
    this.lantern.lanternOn = this.progress.lanternOn;
    this.lantern.lanternPlaced = false;
    this.lantern.isDawnMode = false;
    this.lantern.isOverloadMode = false;
    if (level === 2) {
      this.libraryLevel = new LibraryLevel({
        scene: this, progress: this.progress, player: this.player, interactions: this.interactions,
        lantern: this.lantern, save: () => this.save(), say: (lines, done) => this.say(lines, done),
        nextLevel: (lines) => this.nextLevel(lines),
      });
      this.libraryLevel.build();
    } else if (level === 4) {
      this.pathForTwoLevel = new PathForTwoLevel({ scene: this, progress: this.progress, player: this.player, lumo: this.lumo,
        interactions: this.interactions, lantern: this.lantern, save: () => this.save(), say: (lines, done) => this.say(lines, done),
        nextLevel: (lines) => this.nextLevel(lines), canStartStory: () => !this.dialogue.isActive() && !this.pauseMenu.isOpen() });
      this.pathForTwoLevel.build();
    } else if (level === 6) {
      this.gardenLevel = new SleepingGardenLevel({
        scene: this, progress: this.progress, player: this.player, lumo: this.lumo,
        interactions: this.interactions, lantern: this.lantern, save: () => this.save(),
        say: (lines, done) => this.say(lines, done), nextLevel: (lines) => this.nextLevel(lines),
        canStartStory: () => !this.dialogue.isActive() && !this.pauseMenu.isOpen(),
        isPaused: () => this.pauseMenu.isOpen(),
      });
      this.gardenLevel.build();
    } else if (level === 7) {
      this.ruinsLevel = new RuinsOfTwoHalvesLevel({ scene: this, progress: this.progress, player: this.player, lumo: this.lumo,
        interactions: this.interactions, lantern: this.lantern, save: () => this.save(), say: (lines, done) => this.say(lines, done),
        nextLevel: (lines) => this.nextLevel(lines), canStartStory: () => !this.dialogue.isActive() && !this.pauseMenu.isOpen() });
      this.ruinsLevel.build();
    } else if (level === 9) {
      // Level 10 owns the whole room: art, colliders, interactions, Lumo, HUD text and the ending.
      this.heartLevel = new HeartOfElariaLevel({
        scene: this, progress: this.progress, player: this.player, lumo: this.lumo, interactions: this.interactions,
        lantern: this.lantern, save: () => this.save(), say: (lines, done) => this.say(lines, done),
        isDialogueLocked: () => this.dialogue.isInputLocked(performance.now()),
        stopDialogue: () => this.dialogue.stop(),
        isPaused: () => this.pauseMenu.isOpen(),
        playLanternAction: (on) => this.player.playLanternAction(on),
        finish: () => this.finishHeartCampaign(),
      });
      this.heartLevel.build();
    } else {
      this.addNarrativeProps(level);
      this.registerLevel(level);
      this.buildCampaignBarriers(level);
    }
    if (level === 1) this.updateRuneRevealVisuals();
    if (!this.progress.flags[`intro-${level}`]) {
      this.progress.flags[`intro-${level}`] = true;
      this.save();
      if (level === 2) this.libraryLevel?.startOpeningDialogue();
      else if (level === 4) this.pathForTwoLevel?.startOpeningDialogue();
      else if (level === 6) this.gardenLevel?.startOpeningDialogue();
      else if (level === 7) this.ruinsLevel?.startOpeningDialogue();
      else if (level === 9) this.heartLevel?.startOpeningDialogue();
      else {
        this.dialogue.startDialogue(OPENING[level]);
      }
    }
    this.refreshHud();
  }

  public buildObservatoryRoom(roomId: ObservatoryRoomId, spawnId?: string): void {
    const room = OBSERVATORY_ROOMS[roomId];
    this.clearActiveRoom();
    this.activeObservatoryRoom = roomId;
    // The actor's foot body must match the authored 36x42 frame, baseline 40.
    this.player.setFootPlacement(OBSERVATORY_BODY.feetY, OBSERVATORY_BODY.bodyOffsetY,
      OBSERVATORY_BODY.bodyOffsetX, OBSERVATORY_BODY.width, OBSERVATORY_BODY.height);
    this.observatoryMiniatureIndex = 0;
    this.drawObservatoryBackground(roomId);
    this.refreshObservatoryReturnLoop();
    this.drawObservatoryWalls(roomId);
    this.drawObservatoryWallArt(roomId);
    this.buildObservatoryStamps(roomId);
    this.buildObservatoryElements(roomId);
    this.buildObservatoryRootBed(roomId);
    this.buildObservatoryDoors(roomId);
    this.buildObservatorySolids(roomId);
    this.buildObservatoryBeams();

    // Every control the room authored registers here, from the room's own data:
    // after the room's art (buildObservatoryElements) and colliders
    // (buildObservatorySolids) exist, so each control resolves its own visual and
    // its first reads see a built world, and before the door/puzzle refresh below
    // consumes the registered state. Without this call the room registers no
    // controls at all: no pedestal, no mirrors, no return loop, no final door.
    for (const item of room.interactables) this.registerObservatoryInteractable(item);

    for (const exit of room.exits) this.addObservatoryExit(exit);
    const safeSpawn = this.resolveObservatorySpawn(room, spawnId);
    this.player.setPosition(...safeSpawn);
    this.restoreObservatoryLanternPlacement();
    if (!['entrance', 'corridor', 'observatory'].includes(String(this.progress.flags['l8-lumo-room']))) this.progress.flags['l8-lumo-room'] = 'entrance';
    const lumoRoom = this.getObservatoryLumoRoom();
    this.lumo.setVisible(lumoRoom === roomId);
    // Both saved axes or neither: the generic lumo-x/lumo-y are stale from earlier levels and never used here.
    const savedLumo = this.progress.counters['l8-lumo-x'] !== undefined && this.progress.counters['l8-lumo-y'] !== undefined;
    this.lumo.sprite.setPosition(savedLumo ? this.progress.counters['l8-lumo-x'] : this.lumoTarget.x, savedLumo ? this.progress.counters['l8-lumo-y'] : this.lumoTarget.y);
    this.progress.roomId = roomId;
    this.progress.roomSpawn = { x: safeSpawn[0], y: safeSpawn[1] };
    this.save();
    this.refreshObservatoryDoors();
    this.refreshObservatoryPuzzle();
    this.playObservatoryOpening(roomId);
    this.refreshHud();
  }

  /**
   * Scenario section 2 in two beats: the wheel and the arrival in the entrance, then the recognition at the spiral tube
   * the first time the corridor is entered. Lumo is really in the corridor for the second beat and hovers at the tube
   * mouth while it plays; a save that is already past the corridor never replays it.
   */
  private playObservatoryOpening(roomId: ObservatoryRoomId): void {
    const flags = this.progress.flags;
    if (flags['intro-8'] !== true) {
      flags['intro-8'] = true;
      this.save();
      if (roomId === 'entrance') { this.say([...OBSERVATORY_OPENING_ENTRANCE]); return; }
    }
    if (roomId === 'corridor' && flags['intro-8-corridor'] !== true) {
      flags['intro-8-corridor'] = true;
      this.save();
      if (flags['l8-door-a-latched'] === true) return;
      const tube = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-tube-entry')!.position;
      this.observatoryLumoHold = { x: tube.x + 6, y: tube.y + 22 };
      this.say([...OBSERVATORY_OPENING_CORRIDOR], () => { this.observatoryLumoHold = null; });
    }
  }

  private showObservatoryCaption(text: string): void {
    // Below the mission plate's tallest extent, so a two-line objective never sits under the caption.
    const label = this.add.text(320, HUD_LAYOUT.topBottom + 4, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', fontStyle: 'italic', color: '#f2e6c4', stroke: '#07151c', strokeThickness: 3, padding: { x: 8, y: 4 }, align: 'center', wordWrap: { width: 480 } })
      .setOrigin(0.5, 0).setDepth(85);
    this.roomObjects.push(label);
    this.tweens.add({ targets: label, alpha: 0, delay: 3600, duration: 600, onComplete: () => { if (label.active) label.destroy(); } });
  }

  private queueObservatoryBeat(lines: readonly ObservatoryLine[]): void {
    this.observatoryBeats.push([...lines]);
  }

  private flushObservatoryBeats(): void {
    if (!this.observatoryBeats.length || this.dialogue.isActive() || this.pauseMenu.isOpen()) return;
    const next = this.observatoryBeats.shift();
    if (next) this.say(next);
  }

  /** True when Lumo is not on a called route or holding the seal, so he walks with Nhinh between rooms. */
  private isObservatoryLumoFree(): boolean {
    const steps = this.getObservatoryLumoSteps();
    if (steps.length > 0 && this.value('l8-lumo-route-index') < steps.length) return false;
    return this.progress.flags['l8-lumo-destination'] !== 'lumo-seal';
  }

  /** Visible masonry for every permanent solid, so colliders always match art. */
  private drawObservatoryWalls(roomId: ObservatoryRoomId): void {
    // Permanent masonry only: the thresholds are doors and get their own sill visual that follows the door state.
    const rects: ObsRect[] = [
      ...OBSERVATORY_WALLS[roomId],
      ...observatoryAlcoves(roomId).flatMap((alcove) => [...alcove.jambs]),
    ];
    const walls = this.add.graphics().setDepth(1);
    for (const rect of rects) this.paintObservatoryWall(walls, rect);
    this.roomObjects.push(walls);
    for (const alcove of observatoryAlcoves(roomId)) {
      const sill = this.add.graphics().setDepth(1.2);
      this.roomObjects.push(sill);
      this.observatorySillVisuals.set(alcove.id, sill);
      this.paintObservatorySill(sill, alcove.threshold, observatoryDoorOpen(alcove.doorId, this.getObservatoryWorldState()));
    }
  }

  private paintObservatoryWall(graphics: Phaser.GameObjects.Graphics, rect: ObsRect): void {
    graphics.fillStyle(0x232a34, 0.85);
    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    graphics.fillStyle(0x39485a, 0.95);
    graphics.fillRect(rect.x, rect.y, rect.width, Math.min(8, rect.height));
    graphics.lineStyle(1, 0x0d1a22, 0.65);
    graphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  /** A shut door's threshold reads as masonry; an open one reads as walkable floor (a sill), never as a wall. */
  private paintObservatorySill(graphics: Phaser.GameObjects.Graphics, rect: ObsRect, open: boolean): void {
    graphics.clear();
    if (!open) { this.paintObservatoryWall(graphics, rect); return; }
    graphics.fillStyle(0x56677a, 0.9);
    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    graphics.lineStyle(1, 0x9bd8dd, 0.45);
    for (let x = rect.x + 12; x < rect.x + rect.width; x += 24) graphics.lineBetween(x, rect.y + 2, x, rect.y + rect.height - 2);
    graphics.lineBetween(rect.x, rect.y + rect.height / 2, rect.x + rect.width, rect.y + rect.height / 2);
  }

  private drawObservatoryWallArt(roomId: ObservatoryRoomId): void {
    if (roomId === 'corridor') {
      this.addObservatoryArt('star-chart', 320, 48, 136, 80);
      this.addObservatoryArt('wheel-stopped-sun-among-stars', 524, 44, 113, 88);
    }
    if (roomId === 'observatory') {
      this.addObservatoryArt('wheel-stopped-sun-among-stars', 272, 96, 144, 112);
    }
  }

  private buildObservatoryStamps(roomId: ObservatoryRoomId): void {
    for (const stamp of OBSERVATORY_STAMPS[roomId]) {
      const graphic = this.add.graphics().setDepth(stamp.depth ?? 2).setAlpha(0.3);
      graphic.fillStyle(stamp.id.startsWith('pipe') ? 0x7a6a49 : 0x8fa8b5, 1);
      graphic.fillRoundedRect(stamp.x, stamp.y, stamp.width, stamp.height, 4);
      this.roomObjects.push(graphic);
    }
  }

  private buildObservatoryElements(roomId: ObservatoryRoomId): void {
    for (const element of observatoryElements(roomId)) {
      const rect = observatoryArtRect(element);
      const texture = this.resolveObservatoryTexture(element);
      if (!texture || !this.textures.exists(texture)) continue;
      const image = this.add.image(element.anchor.x, element.anchor.y, texture)
        .setOrigin(0.5, 1)
        .setDisplaySize(rect.width, rect.height)
        .setDepth(element.mount === 'ground' ? 3 : 10 + element.anchor.y / 10);
      this.roomObjects.push(image);
      this.observatoryElementVisuals.set(element.id, image);
      if (['g0', 'g1', 'g2', 'sun-lock', 'lantern-pedestal', 'statue', 'splitter', 'lumo-seal', 'final-door'].includes(element.id)) {
        this.observatoryPuzzleVisuals.set(element.id, image);
      }
    }
    if (roomId === 'observatory') {
      // The Shadow waits beside the final record; the translucent memory frame
      // replaces the waiting pose once the record has been read.
      const shadowKey = getShadowArtKey('waiting');
      if (shadowKey && this.textures.exists(shadowKey)) {
        // Native 48x64 pose on a spot clear of every control; the memory pose is used only while the record plays.
        const shadow = this.add.image(OBSERVATORY_SHADOW.ground.x, OBSERVATORY_SHADOW.ground.y, shadowKey).setOrigin(0.5, 1)
          .setDepth(10 + OBSERVATORY_SHADOW.ground.y / 10).setAlpha(0.95);
        this.roomObjects.push(shadow);
        this.observatoryShadowVisual = shadow;
      }
      // Under the interaction prompt (82) and the HUD (86): the memory tints the room without hiding the controls.
      const overlay = this.add.rectangle(320, 180, 640, 360, 0xf0b463, 0.14).setDepth(84).setVisible(false);
      this.roomObjects.push(overlay);
      this.observatoryMemoryOverlay = overlay;
    }
  }

  private resolveObservatoryTexture(element: ObsElement): string | null {
    const art = element.art;
    // The root bed is drawn procedurally by buildObservatoryRootBed() so its
    // art and its dynamic solid always share the authored rectangle.
    if (element.id === 'root-bed') return null;
    if (art.kind === 'texture') {
      if (element.rotatesWith === 'g0' || element.rotatesWith === 'g1' || element.rotatesWith === 'g2') {
        const index = ((this.value(`l8-${element.rotatesWith}`) % 4) + 4) % 4;
        return `mirror_${index}`;
      }
      if (element.id === 'sun-lock') return this.getObservatoryState().sunDoorUnlocked ? 'lock_sun_on' : 'lock_sun_off';
      if (element.id === 'lantern-pedestal') return this.lantern.lanternPlaced ? 'pedestal_lit' : 'pedestal_empty';
      if (element.id === 'balance-crystal') return 'crystal_balance';
      return art.key;
    }
    if (art.kind === 'level') {
      // Lumo's seal reads its own live state: covered while he holds it.
      if (element.id === 'lumo-seal') return getLevelArtKey(art.level, this.getObservatoryState().lumoAtSeal ? 'lock-moon-lit' : art.file);
      return getLevelArtKey(art.level, art.file);
    }
    // Set art: the statue follows its saved facing, the final door follows its
    // latch, everything else keeps the first frame until its state flips.
    let variant = 0;
    if (element.rotatesWith === 'statue') variant = ((this.value('l8-statue') % 4) + 4) % 4;
    else if (element.id === 'final-door') variant = this.getObservatoryWorldState().finalDoorLatched ? 1 : 0;
    const file = art.files[Math.min(variant, art.files.length - 1)];
    return getLevelArtKey(art.level, file);
  }

  private buildObservatoryDoors(roomId: ObservatoryRoomId): void {
    // The arch is scenery: the passage itself is blocked by the alcove threshold
    // inside observatorySolidRects(), which is what the restore/check model uses.
    for (const alcove of observatoryAlcoves(roomId)) {
      const archTexture = observatoryDoorOpen(alcove.doorId, this.getObservatoryWorldState()) ? 'woods_arch_open' : 'woods_arch_locked';
      const fit = fitObservatoryArt(128, 126, Math.min(alcove.arch.width / 128, alcove.arch.height / 126));
      const image = this.add.image(alcove.arch.x + alcove.arch.width / 2, alcove.arch.y + alcove.arch.height / 2, archTexture)
        .setDisplaySize(fit.width, fit.height)
        .setDepth(3);
      this.roomObjects.push(image);
      this.observatoryAlcoveVisuals.set(alcove.id, image);
    }
  }

  private buildObservatorySolids(roomId: ObservatoryRoomId): void {
    // Build every collider the room can ever need (all doors shut), then let
    // syncObservatorySolids() enable exactly the ones the live state allows.
    const state = this.closedObservatoryWorldState(this.getObservatoryWorldState());
    const rects = observatorySolidRects(roomId, state, []);
    rects.forEach((rect, index) => {
      const object = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x000000, 0);
      this.physics.add.existing(object, true);
      const body = object.body as Phaser.Physics.Arcade.StaticBody;
      this.roomObjects.push(object);
      this.roomColliders.push(this.physics.add.collider(this.player.sprite, object));
      this.observatorySolids.set(`${roomId}-solid-${index}`, { rect, body });
    });
    this.syncObservatorySolids();
  }

  /** Every door shut, for building the full collider set once. */
  private closedObservatoryWorldState(state: ObsWorldState): ObsWorldState {
    return {
      ...state,
      doorAUnlocked: false,
      doorALatched: false,
      sunDoorUnlocked: false,
      sunDoorLatched: false,
      finalDoorLatched: false,
      returnLoopOpen: false,
      bridgeEligible: false,
    };
  }

  private buildObservatoryBeams(): void {
    const beams = this.add.graphics().setDepth(7);
    this.roomObjects.push(beams);
    this.observatoryPuzzleVisuals.set('beams', beams);
  }

  /** Mirror every authored solid into the live Arcade bodies for the current state. */
  private syncObservatorySolids(): void {
    const roomId = this.activeObservatoryRoom;
    if (!roomId) return;
    const state = this.getObservatoryWorldState();
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body | null;
    const occupied = body ? [{ x: body.x, y: body.y, width: body.width, height: body.height }] : [];
    const solids = observatorySolidRects(roomId, state, occupied);
    for (const entry of this.observatorySolids.values()) {
      const rect = entry.rect;
      const active = solids.some((candidate) => Math.abs(candidate.x - rect.x) < 0.01
        && Math.abs(candidate.y - rect.y) < 0.01
        && candidate.width === rect.width && candidate.height === rect.height);
      if (entry.body.enable !== active) {
        entry.body.enable = active;
        entry.body.updateFromGameObject();
      }
    }
  }

  public clearActiveRoom(): void {
    for (const collider of this.roomColliders) collider.destroy();
    this.roomColliders = [];
    this.observatoryRootBody = null;
    this.observatoryBridgePendingRemoval = false;
    this.observatoryBridgeTraversalSide = null;
    this.observatoryPuzzleVisuals.clear();
    this.observatoryElementVisuals.clear();
    this.observatoryAlcoveVisuals.clear();
    this.observatorySolids.clear();
    this.observatoryBridgeStones = [];
    this.observatoryShadowVisual = undefined;
    this.observatorySillVisuals.clear();
    this.observatoryLumoHold = null;
    this.observatoryMemoryOverlay = undefined;
    this.observatoryReturnLoopVisual = undefined;
    for (const object of this.roomObjects) object.destroy();
    this.roomObjects = [];
    this.activeObservatoryRoom = null;
    this.interactions.clear();
  }

  /**
   * The root bed is a full-depth divider: its two solid masses are drawn exactly
   * on top of their colliders, and the crossing lane cut between them is the only
   * place the player may pass. The bed sorts so its southern mass occludes a
   * player standing in the lane.
   */
  private buildObservatoryRootBed(roomId: ObservatoryRoomId): void {
    if (roomId !== 'observatory') return;
    const laneTop = OBSERVATORY_BRIDGE_LANE.y;
    const laneBottom = OBSERVATORY_BRIDGE_LANE.y + OBSERVATORY_BRIDGE_LANE.height;
    const bedBottom = OBSERVATORY_ROOT_BED.y + OBSERVATORY_ROOT_BED.height;
    const masses: ObsRect[] = [
      { ...OBSERVATORY_ROOT_BED, height: laneTop - OBSERVATORY_ROOT_BED.y },
      { ...OBSERVATORY_ROOT_BED, y: laneBottom, height: bedBottom - laneBottom },
    ];
    const visual = this.add.graphics();
    for (const mass of masses) {
      visual.fillStyle(0x385044, 1);
      visual.fillRoundedRect(mass.x, mass.y, mass.width, mass.height, 6);
      visual.lineStyle(2, 0x83a65f, 0.85);
      for (let y = mass.y + 10; y < mass.y + mass.height; y += 18) {
        visual.lineBetween(mass.x + 3, y, mass.x + mass.width - 3, y + 7);
      }
    }
    visual.setDepth(10 + bedBottom / 10);
    this.roomObjects.push(visual);
    this.observatoryPuzzleVisuals.set('root-bed', visual);

    // The lane itself carries the collider that disappears once the bridge holds.
    const laneObject = this.add.rectangle(
      OBSERVATORY_BRIDGE_LANE.x + OBSERVATORY_BRIDGE_LANE.width / 2,
      OBSERVATORY_BRIDGE_LANE.y + OBSERVATORY_BRIDGE_LANE.height / 2,
      OBSERVATORY_BRIDGE_LANE.width, OBSERVATORY_BRIDGE_LANE.height, 0x000000, 0);
    this.physics.add.existing(laneObject, true);
    this.observatoryRootBody = laneObject.body as Phaser.Physics.Arcade.StaticBody;
    this.roomObjects.push(laneObject);
    this.roomColliders.push(this.physics.add.collider(this.player.sprite, laneObject));

    // The deployed bridge deck: floor decor under the feet, never a standing prop.
    const deck = this.add.graphics().setDepth(6).setVisible(false);
    deck.fillStyle(0x6b7f5c, 0.95);
    deck.fillRoundedRect(OBSERVATORY_BRIDGE_LANE.x - 4, OBSERVATORY_BRIDGE_LANE.y, OBSERVATORY_BRIDGE_LANE.width + 8, OBSERVATORY_BRIDGE_LANE.height, 5);
    this.roomObjects.push(deck);
    this.observatoryPuzzleVisuals.set('root-bridge', deck);
    // Native-size stones (34x24) laid along the lane: the sprite is never stretched.
    for (let index = 0; index < 2; index += 1) {
      const stone = this.add.image(
        OBSERVATORY_BRIDGE_LANE.x + OBSERVATORY_BRIDGE_LANE.width / 2,
        OBSERVATORY_BRIDGE_LANE.y + 12 + index * 24,
        'stepping_stone',
      ).setDepth(6.1).setVisible(false);
      this.roomObjects.push(stone);
      this.observatoryBridgeStones.push(stone);
    }
  }

  private registerObservatoryInteractable(item: (typeof OBSERVATORY_ROOMS)[ObservatoryRoomId]['interactables'][number]): void {
    const { id, interactionPoint } = item;
    const element = observatoryElement(id);
    const visual = this.roomObjects.find((object): object is Phaser.GameObjects.Image =>
      object instanceof Phaser.GameObjects.Image && object.visible
      && Math.abs(object.x - item.position.x) < 0.1 && Math.abs(object.y - item.position.y) < 0.1,
    );
    const getPromptBounds = (): { x: number; y: number; width: number; height: number } | null => {
      if (id === 'root-bed') return { ...OBSERVATORY_ROOT_BED };
      return visual?.getBounds() ?? null;
    };
    /**
     * RULE_GAMES.md 1: the prompt exists only from the authored approach side, at
     * the object's south edge (or its documented side). Radius and approach both
     * come from observatoryLayout, the same rectangles the checks verify.
     */
    const register = (onInteract: () => void): void => {
      const radius = element && element.radius > 0 ? element.radius : 24;
      this.interactions.register({
        id: `observatory-${id}`,
        x: interactionPoint.x,
        y: interactionPoint.y,
        radius,
        getPromptBounds,
        getPrompt: () => observatoryPrompt(id, this.getObservatoryWorldState()),
        isEnabled: () => (element ? isObservatoryApproachAllowed(element, { x: this.player.x, y: this.player.y }) : true),
        onInteract,
      });
    };

    if (id === 'g0' || id === 'g1' || id === 'g2') {
      const mirror = id;
      const counter = `l8-${mirror}`;
      register(
        () => { this.progress.counters[counter] = (this.value(counter) + 1) % 4; this.save(); this.refreshObservatoryPuzzle(); SoundSystem.playMirrorRotate(); },
      );
    } else if (id === 'statue') {
      const counter = 'l8-statue';
      register(
        () => { this.progress.counters[counter] = (this.value(counter) + 1) % 4; this.save(); this.refreshObservatoryPuzzle(); SoundSystem.playMirrorRotate(); },
      );
    } else if (id === 'splitter') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: 'Bộ chia cố định gửi một nhánh lên khóa Nhật, nhánh giữa đi qua vị trí tượng tới luống rễ.' }]),
      );
    } else if (id === 'learned-marks') {
      // The safe practice model recalls marks the player already met: it teaches
      // nothing new and never touches a puzzle flag beyond "viewed".
      const captions: DialogueLine[][] = [
        [{ speaker: 'Nhinh', text: 'Dấu gương: một tia vào, nhiều hướng ra tuỳ nấc xoay.' }],
        [{ speaker: 'Nhinh', text: 'Dấu chốt: chốt giữ được cửa, nhưng cảm biến và ấn thì không tự giữ.' }],
        [{ speaker: 'Lumo', text: 'Dấu ấn: chỉ khi tôi thật sự đứng ở đó thì đường sáng mới đi tiếp.' }],
        [{ speaker: 'Nhinh', text: 'Dấu tượng: mặt rộng của tượng che được nhánh giữa, phía sau nó là một khoảng tối.' }],
        [{ speaker: 'Nhinh', text: 'Dấu rễ: rễ chỉ nối lại khi có bóng, có ấn và khóa còn sáng.' }],
      ];
      register(
        () => {
          const lines = captions[this.observatoryMiniatureIndex % captions.length];
          this.observatoryMiniatureIndex = (this.observatoryMiniatureIndex + 1) % captions.length;
          if (this.progress.flags['l8-miniature-viewed'] !== true && this.observatoryMiniatureIndex === 0) {
            this.progress.flags['l8-miniature-viewed'] = true;
            this.save();
            this.say([...lines,
              { speaker: 'Nhinh', text: 'Một đường vào, một người giữ ấn, một khoảng tối để rễ nối lại.' },
              { speaker: 'Lumo', text: 'Và chiếc đèn phải đi qua cùng những chiếc gương. Mình không thể giải mỗi phòng rồi quên phòng trước.' },
              { speaker: 'Nhinh', text: 'Vậy mình đi từng bước và giữ lại từng chốt.' }]);
            return;
          }
          this.say(lines);
        },
      );
    } else if (id === 'lantern-pedestal') {
      register(
        () => {
          if (this.lantern.lanternPlaced) {
            this.lantern.retrieveLantern();
            this.progress.flags['l8-lantern-placed'] = false;
            this.progress.flags['l8-lantern-retrieved'] = true;
          } else if (this.lantern.lanternInHand) {
            this.lantern.placeLanternAt(item.position.x, item.position.y);
            this.progress.flags['l8-lantern-placed'] = true;
            this.progress.flags['l8-lantern-retrieved'] = false;
          }
          this.progress.lanternOn = this.lantern.lanternOn;
          this.progress.counters['l8-lantern-x'] = this.lantern.placedX;
          this.progress.counters['l8-lantern-y'] = this.lantern.placedY;
          this.save();
          this.refreshObservatoryPuzzle();
        },
      );
    } else if (id === 'lumo-tube' || id === 'lumo-seal') {
      register(
        () => {
          if (this.getObservatoryState().lumoAtSeal) {
            if (id === 'lumo-tube') this.callObservatoryLumo('recall');
            else this.say([{ speaker: 'Lumo', text: 'Tôi đang giữ ấn. Đứng ở đầu ống hoặc gài xong cửa cuối rồi gọi tôi về nhé.' }]);
          } else this.callObservatoryLumo('seal');
        },
      );
    } else if (id === 'door-a-control') {
      register(
        () => {
          const state = this.getObservatoryWorldState();
          if (observatoryDoorOpen('door-a', state)) {
            this.progress.flags['l8-door-a-latched'] = true;
            this.save();
            this.refreshObservatoryDoors();
            this.say([{ speaker: 'Nhinh', text: 'Chốt đã gài. Cửa A giữ mở dù tia sáng đi hướng khác.' }]);
            return;
          }
          this.say([{ speaker: 'Nhinh', text: `Chốt chưa gài được. ${observatoryDoorBlockReason('door-a', state)}` }]);
        },
      );
    } else if (id === 'sun-door-control') {
      register(
        () => {
          const state = this.getObservatoryWorldState();
          this.say([{ speaker: 'Nhinh', text: observatoryDoorOpen('sun-door', state)
            ? 'Cửa Mặt Trời đã nhận ánh sáng và đang mở.'
            : `Cửa Mặt Trời còn khép. ${observatoryDoorBlockReason('sun-door', state)}` }]);
        },
      );
    } else if (id === 'sun-lock') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: this.getObservatoryState().sunDoorUnlocked
          ? 'Khóa Nhật đang sáng.'
          : 'Khóa Nhật cần một đường tia đi tới đây.' }]),
      );
    } else if (id === 'root-bed') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: this.getObservatoryState().rootBedShadowed
          ? 'Bóng của tượng đã phủ kín luống rễ.'
          : `Luống rễ vẫn còn sáng. ${observatoryBridgeBlockReason(this.getObservatoryWorldState())}` }]),
      );
    } else if (id === 'final-door-control') {
      register(
        () => {
          const state = this.getObservatoryWorldState();
          if (!this.progress.flags['l8-final-door-latched']) {
            if (!state.bridgeCrossed) {
              this.say([{ speaker: 'Nhinh', text: observatoryFinalDoorBlockReason(state) }]);
              return;
            }
            this.progress.flags['l8-final-door-latched'] = true;
            this.save();
            this.refreshObservatoryDoors();
            this.say([{ speaker: 'Nhinh', text: 'Chốt đá đã gài. Lối đá vòng có thể mở ngay từ bệ này.' }]);
            return;
          }
          if (this.isObservatoryCompletionReady()) {
            // Companion handoff: Level 10 places Lumo from its own authored entry. Room-local Level 09 coordinates and
            // the stale generic Lumo counters mean nothing there, so they are cleared instead of carried across.
            for (const key of ['lumo-x', 'lumo-y', 'lumo-target-x', 'lumo-target-y']) delete this.progress.counters[key];
            this.nextLevel([...OBSERVATORY_EXIT_LINES]);
          } else {
            this.say([{ speaker: 'Nhinh', text: observatoryFinalDoorBlockReason(state) }]);
          }
        },
      );
    } else if (id === 'stone-return-loop') {
      register(
        () => {
          const state = this.getObservatoryWorldState();
          if (observatoryDoorOpen('return-loop', state)) {
            this.say([{ speaker: 'Nhinh', text: 'Lối đá vòng đang mở. Đường về bệ đèn thông suốt.' }]);
            return;
          }
          // The loop is purely a floor route: it needs the crossing and the far
          // latch, never the lantern's current place or Lumo's current position.
          if (!state.bridgeCrossed || !state.finalDoorLatched) {
            this.say([{ speaker: 'Nhinh', text: `Lối đá vòng chưa mở được. ${observatoryDoorBlockReason('return-loop', state)}` }]);
            return;
          }
          this.progress.flags['l8-return-loop-open'] = true;
          this.save();
          this.refreshObservatoryDoors();
          this.refreshObservatoryReturnLoop();
          this.say([{ speaker: 'Nhinh', text: 'Lối đá đã khớp vào vòng. Đường về bệ đèn thông suốt ngay cả khi ánh sáng tắt.' }]);
        },
      );
    } else if (id === 'final-record') {
      register(
        () => {
          if (this.progress.flags['l8-record-read'] === true) {
            this.say([{ speaker: 'Nhinh', text: 'Bản ghi đã được chép vào sổ. The Shadow là phần ký ức còn mắc lại trong đêm cuối.' }]);
            return;
          }
          const state = this.getObservatoryWorldState();
          const missing: string[] = [];
          if (this.lantern.lanternPlaced || !this.lantern.lanternInHand) missing.push('thu hồi đèn về tay');
          if (!state.lumoRecalled || state.lumoAtSeal) missing.push('gọi Lumo về bên đèn');
          if (!state.returnLoopOpen) missing.push('mở lối đá vòng');
          if (missing.length) {
            this.say([{ speaker: 'Nhinh', text: `Bản ghi chưa mở. Còn cần: ${missing.join(' và ')}.` },
              { speaker: 'Lumo', text: 'Tôi sẽ ở cạnh cậu khi mọi thứ đã sẵn sàng.' }]);
            return;
          }
          this.progress.flags['l8-record-read'] = true;
          this.save();
          this.playObservatoryMemory();
        },
      );
    } else if (id === 'balance-crystal') {
      register(
        () => {
          const state = this.getObservatoryWorldState();
          if (state.crystalTaken) {
            this.say([{ speaker: 'Nhinh', text: 'Tinh thể Cân Bằng đã nằm trong tay mình.' }]);
            return;
          }
          if (!state.recordRead) {
            this.say([{ speaker: 'The Shadow', text: 'Khoan đã. Nghe bản ghi của ta trước rồi hãy nhận vòng ngày đêm.' }]);
            return;
          }
          this.progress.flags['l8-balance-crystal'] = true;
          this.save();
          this.observatoryElementVisuals.get('balance-crystal')?.destroy();
          this.observatoryElementVisuals.delete('balance-crystal');
          // The Shadow stays beside the record until dawn (scenario §6).
          this.observatoryShadowVisual?.setAlpha(0.95);
          this.say([...OBSERVATORY_CRYSTAL_LINES]);
        },
      );
    }
  }

  /**
   * The last record (scenario section 5): the room stays visible under a translucent amber layer while the Guardian's
   * recording and the memory exchange play; a white flash erases the end; Lumo remembers; The Shadow steps into the
   * place the Guardian stood, the two figures overlap and the memory dissolves; The Shadow answers, and the scene stops
   * on his last line. Nothing is added about the girl.
   */
  private playObservatoryMemory(): void {
    const shadow = this.observatoryShadowVisual;
    const overlay = this.observatoryMemoryOverlay;
    const memoryKey = getShadowArtKey('memory-overlay');
    const waitingKey = getShadowArtKey('waiting');
    const guardianKey = getShadowArtKey('guardian-waiting');
    overlay?.setVisible(true);
    if (shadow?.active && memoryKey && this.textures.exists(memoryKey)) shadow.setTexture(memoryKey);
    let guardian: Phaser.GameObjects.Image | undefined;
    if (guardianKey && this.textures.exists(guardianKey)) {
      guardian = this.add.image(OBSERVATORY_SHADOW.guardianGround.x, OBSERVATORY_SHADOW.guardianGround.y, guardianKey)
        .setOrigin(0.5, 1).setDepth(10 + OBSERVATORY_SHADOW.guardianGround.y / 10 + 0.05).setAlpha(0);
      this.roomObjects.push(guardian);
      this.tweens.add({ targets: guardian, alpha: 0.65, duration: 700 });
    }
    // The room may be torn down mid-tween (exit taken): every callback checks the objects it touches.
    const finish = (): void => {
      if (overlay?.active) overlay.setVisible(false);
      if (shadow?.active && waitingKey && this.textures.exists(waitingKey)) shadow.setTexture(waitingKey);
      if (guardian?.active) guardian.destroy();
    };
    this.say([...OBSERVATORY_MEMORY_RECORDING], () => {
      this.showObservatoryCaption(OBSERVATORY_MEMORY_CAPTION);
      this.cameras.main.flash(500, 255, 245, 220, true);
      if (guardian?.active) this.tweens.add({ targets: guardian, alpha: 0.35, duration: 600 });
      this.say([...OBSERVATORY_MEMORY_LUMO], () => {
        this.showObservatoryCaption(OBSERVATORY_MEMORY_MERGE_CAPTION);
        const home = OBSERVATORY_SHADOW.ground.x;
        if (shadow?.active) {
          this.tweens.add({
            targets: shadow, x: OBSERVATORY_SHADOW.guardianGround.x, duration: 900,
            onComplete: () => {
              if (guardian?.active) this.tweens.add({ targets: guardian, alpha: 0, duration: 800 });
              this.tweens.add({
                targets: overlay ?? [], alpha: 0, duration: 800, delay: 400,
                onComplete: () => { if (overlay?.active) overlay.setAlpha(1); finish(); },
              });
              this.tweens.add({ targets: shadow, x: home, duration: 700, delay: 1000 });
            },
          });
        } else finish();
        this.time.delayedCall(2200, () => this.say([...OBSERVATORY_MEMORY_SHADOW]));
      });
    });
  }

  public callObservatoryLumo(destination: 'seal' | 'recall'): void {
    if (this.progress.level !== 8 || !this.activeObservatoryRoom) return;
    const lumoRoom = this.getObservatoryLumoRoom();
    const steps: ObservatoryRoomPoint[] = [];
    const add = (roomId: ObservatoryRoomId, x: number, y: number): void => { steps.push({ roomId, x, y }); };
    if (destination === 'seal') {
      if (lumoRoom === 'observatory') {
        add('observatory', 24, 180);
        add('corridor', 596, 180);
      } else if (lumoRoom === 'entrance') {
        add('entrance', 586, 145);
        add('corridor', 42, 180);
      }
      const tube = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-tube-entry')!.position;
      const seal = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-seal')!.position;
      add(tube.roomId, tube.x, tube.y);
      add(seal.roomId, seal.x, seal.y);
    } else {
      if (lumoRoom === 'observatory') {
        add('observatory', 24, 180);
        add('corridor', 596, 180);
      }
      if (lumoRoom !== 'entrance') {
        const tube = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-tube-entry')!.position;
        add(tube.roomId, tube.x, tube.y);
        add('entrance', 586, 145);
      }
      const source = OBSERVATORY_ROOMS.entrance.waypoints.find((waypoint) => waypoint.id === 'lantern-source')!.position;
      add(source.roomId, source.x, source.y);
    }
    this.progress.flags['l8-lumo-destination'] = destination === 'seal' ? 'lumo-seal' : 'lantern-source';
    this.progress.flags['l8-lumo-arrived'] = '';
    this.progress.flags['l8-lumo-route-json'] = JSON.stringify(steps);
    this.progress.counters['l8-lumo-route-index'] = 0;
    this.progress.flags['l8-lumo-recalled'] = false;
    this.save();
    this.say([{ speaker: 'Nhinh', text: destination === 'seal' ? 'Lumo, đi theo ống sáng tới ấn giúp mình nhé.' : 'Lumo, trở về bên bệ đèn nhé.' }, { speaker: 'Lumo', text: 'Tôi sẽ đi theo đường đã mở.' }]);
  }

  public transitionObservatory(exitId: string): void {
    if (this.progress.level !== 8 || !this.activeObservatoryRoom) return;
    const exit = OBSERVATORY_ROOMS[this.activeObservatoryRoom].exits.find((item) => item.id === exitId);
    if (!exit) return;
    const state = this.getObservatoryWorldState();
    if (!observatoryDoorOpen(exit.doorId, state)) {
      this.say([{ speaker: 'Nhinh', text: observatoryDoorBlockReason(exit.doorId, state) }]);
      return;
    }
    const destination = OBSERVATORY_ROOMS[exit.toRoom].spawns.find((spawn) => spawn.id === exit.destinationSpawnId);
    if (!destination) return;
    // A free Lumo goes through the door with Nhinh; a called or sealing Lumo keeps his own route and room.
    if (this.isObservatoryLumoFree()) {
      this.progress.flags['l8-lumo-room'] = exit.toRoom;
      this.progress.counters['l8-lumo-x'] = destination.position.x - 20;
      this.progress.counters['l8-lumo-y'] = destination.position.y - 18;
    }
    this.progress.roomId = exit.toRoom;
    this.progress.roomSpawn = { ...destination.position };
    this.progress.counters['player-level'] = 8;
    this.progress.counters['player-x'] = destination.position.x;
    this.progress.counters['player-y'] = destination.position.y;
    this.save();
    this.buildObservatoryRoom(exit.toRoom, destination.id);
  }

  private resolveObservatorySpawn(room: typeof OBSERVATORY_ROOMS[ObservatoryRoomId], spawnId?: string): [number, number] {
    const requestedSpawnId = spawnId ?? (this.progress.roomId === room.id ? undefined : room.entrySpawnId);
    const spawn = requestedSpawnId ? room.spawns.find((candidate) => candidate.id === requestedSpawnId) : undefined;
    if (spawn) return [spawn.position.x, spawn.position.y];
    if (this.progress.roomId === room.id && this.progress.roomSpawn) {
      const safe = this.resolveSafeObservatoryCheckpoint(room.id, this.progress.roomSpawn.x, this.progress.roomSpawn.y);
      if (safe) return [safe.x, safe.y];
    }
    const entry = room.spawns.find((candidate) => candidate.id === room.entrySpawnId) ?? room.spawns[0];
    return [entry.position.x, entry.position.y];
  }

  /**
   * Restore safety is delegated to the pure predicate the checks verify: the
   * result is never inside a solid, never on the retractable root bridge and
   * never outside the room. A save taken on the bridge is moved to the near-bank
   * stone (documented restore case 1/2).
   */
  private resolveSafeObservatoryCheckpoint(roomId: ObservatoryRoomId, x: number, y: number): { x: number; y: number } | null {
    const room = OBSERVATORY_ROOMS[roomId];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < 0 || x > room.width || y < 0 || y > room.height) {
      return { ...nearestSafeObservatorySpawn(roomId, undefined, this.getObservatoryWorldState(), room.spawns) };
    }
    const point = { x, y };
    const body = observatoryBody(point);
    if (roomId === 'observatory' && rectsOverlap(body, OBSERVATORY_BRIDGE_LANE)) {
      const bank = room.spawns.find((spawn) => spawn.id === 'observatory-near-bridge');
      if (bank) {
        const safe = nearestSafeObservatorySpawn(roomId, bank.position, this.getObservatoryWorldState(), room.spawns);
        return safe;
      }
    }
    return { ...nearestSafeObservatorySpawn(roomId, point, this.getObservatoryWorldState(), room.spawns) };
  }

  private drawObservatoryBackground(roomId: ObservatoryRoomId): void {
    const room = OBSERVATORY_ROOMS[roomId];
    const tint: Record<string, number> = { observatory: 0x7182a0, library: 0xd5bd87, ruins: 0x82918c };
    const backgroundKey = getLevelBackgroundKey(8, roomId);
    const hasCustomBg = backgroundKey !== null && this.textures.exists(backgroundKey);
    if (hasCustomBg) {
      this.roomObjects.push(this.add.image(0, 0, backgroundKey).setOrigin(0).setDisplaySize(room.width, room.height).setDepth(0));
    } else {
      this.roomObjects.push(this.add.tileSprite(0, 0, room.width, room.height, 'ground_stone').setOrigin(0).setTint(tint[room.backgroundBiome]).setDepth(0));
      this.roomObjects.push(this.add.tileSprite(28, 148, room.width - 56, 84, 'ground_stone').setOrigin(0).setTint(0xb5c6ce).setAlpha(0.42).setDepth(0.5));
      for (const [tx, ty] of [[36, 54], [604, 54], [36, 306], [604, 306]] as Array<[number, number]>) {
        this.roomObjects.push(this.add.image(tx, ty, 'ruin_pillar').setAlpha(0.85).setScale(0.9).setDepth(3));
      }
    }
    const decor = this.add.graphics().setDepth(1);
    decor.fillStyle(0x07151c, hasCustomBg ? 0.08 : 0.16);
    decor.fillRect(0, 0, room.width, room.height);
    this.roomObjects.push(decor);
  }

  private addObservatoryArt(filename: string, x: number, y: number, width: number, height: number): void {
    const key = getLevelArtKey(8, filename);
    if (!key || !this.textures.exists(key)) return;
    this.roomObjects.push(this.add.image(x, y, key).setDisplaySize(width, height).setDepth(5));
  }

  /**
   * A door gets two controls: the deep transit trigger inside the alcove (only
   * reachable once the sill is walkable) and a room-facing inspect control at the
   * alcove mouth that always names the missing prerequisite in plain Vietnamese.
   * Collision comes from observatorySolidRects(), never from this method.
   */
  private addObservatoryExit(exit: ObservatoryExit): void {
    const alcove = OBSERVATORY_ALCOVES.find((candidate) => candidate.roomId === exit.fromRoom && candidate.doorId === exit.doorId);
    const archBounds = alcove ? this.observatoryAlcoveVisuals.get(alcove.id)?.getBounds() ?? null : null;
    const title = OBSERVATORY_ROOMS[exit.toRoom].title;
    this.interactions.register({
      id: `observatory-exit-${exit.id}`,
      x: exit.interactionPoint.x,
      y: exit.interactionPoint.y,
      radius: alcove ? alcove.triggerRadius : 28,
      getPromptBounds: () => archBounds,
      getPrompt: () => this.isObservatoryExitOpen(exit)
        ? `E · Đi sang ${title}`
        : `E · ${alcove?.label ?? 'Cửa'} đang khóa — ${observatoryDoorBlockReason(exit.doorId, this.getObservatoryWorldState())}`,
      isEnabled: () => (alcove ? isObservatoryGateApproachAllowed(alcove, { x: this.player.x, y: this.player.y }) : true),
      onInteract: () => this.transitionObservatory(exit.id),
    });
    if (!alcove) return;
    this.interactions.register({
      id: `observatory-inspect-${alcove.id}`,
      x: alcove.inspect.x,
      y: alcove.inspect.y,
      radius: alcove.inspectRadius,
      getPromptBounds: () => archBounds,
      getPrompt: () => (this.isObservatoryExitOpen(exit)
        ? `E · ${alcove.label} đang mở`
        : `E · Kiểm tra ${alcove.label} — ${observatoryDoorBlockReason(exit.doorId, this.getObservatoryWorldState())}`),
      onInteract: () => this.say([{ speaker: 'Nhinh', text: this.isObservatoryExitOpen(exit)
        ? `${alcove.label} đã mở. Nhấn E để đi sang ${title}.`
        : `${alcove.label} còn đóng. ${observatoryDoorBlockReason(exit.doorId, this.getObservatoryWorldState())}` }]),
    });
  }

  private isObservatoryExitOpen(exit: ObservatoryExit): boolean {
    return observatoryDoorOpen(exit.doorId, this.getObservatoryWorldState());
  }

  private refreshObservatoryDoors(): void {
    const state = this.getObservatoryWorldState();
    // The beam latches the Sun Door open the first time it lights it: the player
    // can never be stranded inside the observatory with the lantern off.
    if (state.sunDoorUnlocked && this.progress.flags['l8-sun-door-latched'] !== true) {
      this.progress.flags['l8-sun-door-latched'] = true;
      this.save();
    }
    for (const alcove of OBSERVATORY_ALCOVES) {
      const image = this.observatoryAlcoveVisuals.get(alcove.id);
      if (!image) continue;
      const open = observatoryDoorOpen(alcove.doorId, state);
      image.setTexture(open ? 'woods_arch_open' : 'woods_arch_locked');
      image.setAlpha(open ? 0.5 : 1);
    }
    for (const alcove of OBSERVATORY_ALCOVES) {
      const sill = this.observatorySillVisuals.get(alcove.id);
      if (sill) this.paintObservatorySill(sill, alcove.threshold, observatoryDoorOpen(alcove.doorId, state));
    }
    this.syncObservatorySolids();
  }

  /**
   * Keeps exactly one visual for the opened return loop: a stone strip along the
   * south edge of the room's own floor band, so the route reads as floor rather
   * than as a second copy of the background. Collision is not built here — the
   * loop's alcove thresholds inside observatorySolidRects() are already gated by
   * observatoryDoorOpen('return-loop', state), the single reader of the flag this
   * control writes. Safe to call on every E press and on every room build or
   * restore: it creates, reuses or destroys one id-tracked strip.
   */
  public refreshObservatoryReturnLoop(): void {
    const roomId = this.activeObservatoryRoom;
    const open = roomId !== null && observatoryDoorOpen('return-loop', this.getObservatoryWorldState());
    const current = this.observatoryReturnLoopVisual;
    if (!open || roomId === null) {
      if (!current) return;
      this.roomObjects = this.roomObjects.filter((object) => object !== current);
      current.destroy();
      this.observatoryReturnLoopVisual = undefined;
      return;
    }
    const lane = observatoryReturnLoopLane(roomId);
    if (current) {
      // Same room, same lane: leave the strip alone so repeated presses and
      // repeated restores never stack a second one.
      if (current.x !== lane.x || current.y !== lane.y || current.width !== lane.width || current.height !== lane.height) {
        current.setPosition(lane.x, lane.y);
        current.setSize(lane.width, lane.height);
      }
      return;
    }
    const visual = this.add.tileSprite(lane.x, lane.y, lane.width, lane.height, 'ground_stone')
      .setOrigin(0).setTint(0x9bd8dd).setAlpha(0.55).setDepth(0.8);
    visual.setName(OBSERVATORY_RETURN_LOOP_VISUAL_ID);
    this.roomObjects.push(visual);
    this.observatoryReturnLoopVisual = visual;
  }

  /**
   * The single world-state object consumed by observatoryLayout: live gates from
   * the pure derivation, durable latches from saved flags. Nothing derived is
   * ever written back to the save.
   */
  private getObservatoryWorldState(): ObsWorldState {
    const puzzle = this.getObservatoryState();
    const flags = this.progress.flags;
    const sunDoorWasOpen = flags['l8-sun-door-latched'] === true
      || flags['l8-bridge-crossed'] === true
      || flags['l8-final-door-latched'] === true
      || flags['l8-return-loop-open'] === true;
    return {
      doorAUnlocked: puzzle.doorAUnlocked,
      sunDoorUnlocked: puzzle.sunDoorUnlocked,
      rootBedShadowed: puzzle.rootBedShadowed,
      bridgeEligible: puzzle.bridgeEligible,
      lumoAtSeal: puzzle.lumoAtSeal,
      activeBeamRoute: puzzle.activeBeamPath.routeId,
      doorALatched: flags['l8-door-a-latched'] === true,
      // A door that has accepted the beam once stays usable, so turning the
      // lantern off can never strand Nhinh behind it.
      sunDoorLatched: sunDoorWasOpen,
      finalDoorLatched: flags['l8-final-door-latched'] === true,
      returnLoopOpen: flags['l8-return-loop-open'] === true,
      bridgeCrossed: flags['l8-bridge-crossed'] === true,
      lanternPlaced: this.lantern.lanternPlaced,
      lanternOn: this.lantern.lanternOn,
      lanternRetrieved: flags['l8-lantern-retrieved'] === true
        || (flags['l8-lantern-placed'] !== true && this.lantern.lanternInHand),
      lumoRecalled: flags['l8-lumo-recalled'] === true || flags['l8-lumo-arrived'] === 'lantern-source',
      recordRead: flags['l8-record-read'] === true,
      crystalTaken: flags['l8-balance-crystal'] === true,
      miniatureViewed: flags['l8-miniature-viewed'] === true,
      mirrors: { g0: this.value('l8-g0'), g1: this.value('l8-g1'), g2: this.value('l8-g2') },
      statue: this.value('l8-statue'),
    };
  }

  private getObservatoryState() {
    const routeTarget = this.progress.flags['l8-lumo-destination'];
    const arrived = this.progress.flags['l8-lumo-arrived'];
    const waypointIds: ObservatoryWaypointId[] = ['lantern-source', 'door-a-eye', 'g1', 'g2', 'sun-lock', 'splitter', 'root-branch', 'lumo-tube-entry', 'lumo-seal'];
    return deriveObservatoryState({
      mirrorRotations: { g0: this.value('l8-g0'), g1: this.value('l8-g1'), g2: this.value('l8-g2') },
      statueOrientation: this.value('l8-statue'), lanternOn: this.lantern.lanternOn, lanternPlaced: this.lantern.lanternPlaced,
      doorALatched: this.progress.flags['l8-door-a-latched'] === true,
      lumoPosition: this.getObservatoryLumoRoom() ? { roomId: this.getObservatoryLumoRoom()!, x: this.lumo.sprite.x, y: this.lumo.sprite.y } : null,
      lumoRoute: {
        destinationWaypointId: typeof routeTarget === 'string' && waypointIds.includes(routeTarget as ObservatoryWaypointId) ? routeTarget as ObservatoryWaypointId : null,
        arrivedAtWaypointId: typeof arrived === 'string' && waypointIds.includes(arrived as ObservatoryWaypointId) ? arrived as ObservatoryWaypointId : null,
      },
    });
  }

  private getObservatoryLumoRoom(): ObservatoryRoomId {
    const saved = this.progress.flags['l8-lumo-room'];
    return saved === 'entrance' || saved === 'corridor' || saved === 'observatory' ? saved : 'entrance';
  }

  private getObservatoryLumoSteps(): ObservatoryRoomPoint[] {
    const raw = this.progress.flags['l8-lumo-route-json'];
    if (typeof raw !== 'string' || !raw) return [];
    try {
      const steps = JSON.parse(raw) as unknown;
      if (!Array.isArray(steps)) return [];
      return steps.filter((step): step is ObservatoryRoomPoint => Boolean(step && typeof step === 'object'
        && ['entrance', 'corridor', 'observatory'].includes((step as ObservatoryRoomPoint).roomId)
        && Number.isFinite((step as ObservatoryRoomPoint).x) && Number.isFinite((step as ObservatoryRoomPoint).y)));
    } catch { return []; }
  }

  private updateObservatoryLumo(dt: number): void {
    const activeRoom = this.activeObservatoryRoom;
    if (!activeRoom) return;
    let lumoRoom = this.getObservatoryLumoRoom();
    this.lumo.setVisible(lumoRoom === activeRoom);
    const steps = this.getObservatoryLumoSteps();
    const routeIndex = Math.max(0, Math.floor(this.value('l8-lumo-route-index')));
    const step = steps[routeIndex];
    if (step && routeIndex < steps.length) {
      if (lumoRoom !== step.roomId) {
        // Room changes follow the authored tube/door links; the waypoint is the safe landing point.
        lumoRoom = step.roomId;
        this.progress.flags['l8-lumo-room'] = lumoRoom;
        this.lumo.sprite.setPosition(step.x, step.y);
        this.progress.counters['l8-lumo-x'] = step.x;
        this.progress.counters['l8-lumo-y'] = step.y;
        this.lumo.setVisible(lumoRoom === activeRoom);
        this.save();
        return;
      }
      this.lumoTarget = { x: step.x - 18, y: step.y + 12 };
      this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y, true);
      if (Math.hypot(this.lumo.sprite.x - step.x, this.lumo.sprite.y - step.y) <= 8) {
        this.lumo.sprite.setPosition(step.x, step.y);
        this.progress.counters['l8-lumo-route-index'] = routeIndex + 1;
        this.progress.counters['l8-lumo-x'] = step.x;
        this.progress.counters['l8-lumo-y'] = step.y;
        if (routeIndex + 1 >= steps.length) {
          const destination = this.progress.flags['l8-lumo-destination'];
          this.progress.flags['l8-lumo-arrived'] = destination === 'lumo-seal' ? 'lumo-seal' : 'lantern-source';
          this.progress.flags['l8-lumo-recalled'] = destination === 'lantern-source';
          this.progress.flags['l8-lumo-route-json'] = '';
          this.progress.counters['l8-lumo-route-index'] = 0;
        }
        this.save();
      }
    } else {
      const destination = this.progress.flags['l8-lumo-destination'];
      const destinationWaypoint = destination === 'lumo-seal' ? OBSERVATORY_ROOMS.corridor.waypoints.find((point) => point.id === 'lumo-seal')?.position
        : destination === 'lantern-source' ? OBSERVATORY_ROOMS.entrance.waypoints.find((point) => point.id === 'lantern-source')?.position : undefined;
      const unassigned = !destinationWaypoint || this.progress.flags['l8-lumo-arrived'] === 'lantern-source';
      if (unassigned) {
        // Unassigned Lumo follows Nhinh inside the active room, like Levels 01-08 (and through the doors: see
        // transitionObservatory). The corridor opening beat parks him at the tube mouth while it plays.
        this.lumoTarget = this.observatoryLumoHold ?? {
          x: Phaser.Math.Clamp(this.player.x - 20, 28, 610),
          y: Phaser.Math.Clamp(this.player.y - 22, 58, 300),
        };
        this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y, true);
      } else if (destinationWaypoint.roomId === lumoRoom) {
        this.lumoTarget = { x: destinationWaypoint.x - 18, y: destinationWaypoint.y + 12 };
        this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y, true);
      }
    }
    this.lumo.setVisible(lumoRoom === activeRoom);
  }

  private updateObservatoryCrossingState(): void {
    if (this.activeObservatoryRoom !== 'observatory' || this.progress.flags['l8-bridge-crossed']) return;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    const onBridge = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.observatoryBridgeBounds);
    if (onBridge && this.getObservatoryState().bridgeEligible && this.observatoryBridgeTraversalSide === null) {
      this.observatoryBridgeTraversalSide = playerBounds.centerX < this.observatoryBridgeBounds.centerX ? 'near' : 'far';
    }
    if (!onBridge && this.observatoryBridgeTraversalSide === 'near' && playerBounds.left >= this.observatoryBridgeBounds.right
      || !onBridge && this.observatoryBridgeTraversalSide === 'far' && playerBounds.right <= this.observatoryBridgeBounds.left) {
      this.progress.flags['l8-bridge-crossed'] = true;
      this.observatoryBridgeTraversalSide = null;
      this.save();
      return;
    }
    if (!onBridge && (playerBounds.right < this.observatoryBridgeBounds.left || playerBounds.left > this.observatoryBridgeBounds.right)) {
      this.observatoryBridgeTraversalSide = null;
    }
  }

  private isObservatoryCompletionReady(): boolean {
    return observatoryCompletionReady(this.getObservatoryWorldState());
  }

  private showObservatoryJournal(): void {
    const state = this.getObservatoryWorldState();
    const room = this.activeObservatoryRoom ? OBSERVATORY_ROOMS[this.activeObservatoryRoom].title : 'tiền sảnh';
    const facts: string[] = [`Nơi đang đứng: ${room}.`, 'Một nguồn sáng ở tiền sảnh chạy qua cả ba phòng nhờ các gương.'];
    if (state.miniatureViewed) facts.push('Mô hình ở tiền sảnh: gương đổi hướng tia, chốt giữ cửa, ấn cần Lumo đứng thật, tượng che được nhánh giữa, rễ cần bóng.');
    facts.push(state.lumoAtSeal ? 'Lumo đang giữ ấn ở hành lang phòng sao.' : 'Ấn chỉ hoạt động khi Lumo thật sự đứng ở đó.');
    if (state.doorALatched) facts.push('Cửa A đã gài chốt từ bên trong nên giữ mở dù G0 đổi hướng.');
    facts.push(state.rootBedShadowed
      ? 'Luống rễ đang nằm trong bóng của mặt tượng rộng.'
      : 'Luống rễ vẫn cần một khoảng tối để nối lại.');
    if (state.bridgeEligible) facts.push('Khóa Nhật sáng, rễ trong bóng và Lumo giữ ấn: cầu rễ đã mọc.');
    if (state.bridgeCrossed) facts.push('Đã qua cầu sang bờ bên kia phòng thiên văn.');
    if (state.finalDoorLatched) facts.push('Chốt cửa cuối đã gài.');
    if (state.returnLoopOpen) facts.push('Lối đá vòng đang mở: đường bộ về bệ đèn và mốc gọi Lumo vẫn thông khi mạng sáng tắt.');
    if (state.lanternPlaced) facts.push('Đèn còn trên bệ đá ở tiền sảnh.');
    if (state.recordRead) {
      facts.push('Bản ghi cuối: Người Bảo Vệ đã giữ ngày đêm đứng yên vì sợ mất người thân. Lumo đã giữ mạch phía Bắc theo lời ông, và khi Cây Mẹ vỡ thì ký ức của cậu cũng vỡ theo.');
      facts.push('The Shadow là phần ký ức còn mắc lại trong đêm ấy; ông ở lại bên cửa sổ tới khi đêm này kết thúc.');
    } else {
      facts.push('Bản ghi cuối ở phòng thiên văn chưa được đọc: cần mở lối vòng, thu hồi đèn và gọi Lumo về trước.');
    }
    if (state.crystalTaken) facts.push('Tinh thể Cân Bằng đã nằm trong tay Nhinh.');
    this.say([{ speaker: 'Nhinh', text: `Sổ tay của mình.\n· ${facts.join('\n· ')}` }]);
  }

  private restoreObservatoryLanternPlacement(): void {
    if (this.progress.flags['l8-lantern-placed'] !== true) return;
    if (!this.lantern.lanternPlaced) {
      const x = this.value('l8-lantern-x') || OBSERVATORY_ROOMS.entrance.interactables.find((item) => item.id === 'lantern-pedestal')!.position.x;
      const y = this.value('l8-lantern-y') || OBSERVATORY_ROOMS.entrance.interactables.find((item) => item.id === 'lantern-pedestal')!.position.y;
      this.lantern.placeLanternAt(x, y);
    }
    this.lantern.lanternOn = this.progress.lanternOn;
  }

  /**
   * Scenario section 4's conditional lines, each tied to a real transition so they never replay every frame:
   * the roots-lit pair plays once when the far door opens on the direct route; the no-beam line plays when a live,
   * parked lantern's beam stops reaching Lumo's seal while he still holds it.
   */
  private queueObservatoryStateBeats(state: ObservatoryDerivedState): void {
    const routeId = state.activeBeamPath.routeId;
    if (this.activeObservatoryRoom === 'observatory' && state.sunDoorUnlocked && !state.bridgeEligible && routeId === 'g2-direct-sun'
      && this.progress.flags['l8-beat-roots-lit'] !== true) {
      this.progress.flags['l8-beat-roots-lit'] = true;
      this.save();
      this.queueObservatoryBeat(OBSERVATORY_BEAT_ROOTS_LIT);
    }
    const throughSeal = routeId !== 'off' && routeId !== 'door-a';
    if (this.observatoryWasThroughSeal && !throughSeal && state.lumoAtSeal && this.lantern.lanternPlaced && this.lantern.lanternOn) {
      this.queueObservatoryBeat(OBSERVATORY_BEAT_NO_BEAM);
    }
    this.observatoryWasThroughSeal = throughSeal;
  }

  private refreshObservatoryPuzzle(): void {
    if (!this.activeObservatoryRoom) return;
    const state = this.getObservatoryState();
    const world = this.getObservatoryWorldState();
    for (const id of ['g0', 'g1', 'g2']) {
      const mirror = this.observatoryPuzzleVisuals.get(id);
      if (mirror instanceof Phaser.GameObjects.Image) mirror.setTexture(`mirror_${((this.value(`l8-${id}`) % 4) + 4) % 4}`);
    }
    const statue = this.observatoryPuzzleVisuals.get('statue');
    if (statue instanceof Phaser.GameObjects.Image) {
      // The four authored frames are the facing; the sprite is never rotated.
      const facing = ((this.value('l8-statue') % 4) + 4) % 4;
      const statueElement = observatoryElement('statue');
      if (statueElement && statueElement.art.kind === 'level-set') {
        const texture = getLevelArtKey(statueElement.art.level, statueElement.art.files[facing]);
        if (texture && this.textures.exists(texture)) statue.setTexture(texture);
        else statue.setAngle(facing * 90);
      }
    }
    this.queueObservatoryStateBeats(state);
    const lock = this.observatoryPuzzleVisuals.get('sun-lock');
    if (lock instanceof Phaser.GameObjects.Image) lock.setTexture(state.sunDoorUnlocked ? 'lock_sun_on' : 'lock_sun_off');
    const pedestal = this.observatoryPuzzleVisuals.get('lantern-pedestal');
    if (pedestal instanceof Phaser.GameObjects.Image) pedestal.setTexture(this.lantern.lanternPlaced ? 'pedestal_lit' : 'pedestal_empty');
    const seal = this.observatoryPuzzleVisuals.get('lumo-seal');
    if (seal instanceof Phaser.GameObjects.Image) {
      const sealTexture = getLevelArtKey(7, state.lumoAtSeal ? 'lock-moon-lit' : 'lock-moon-covered');
      if (sealTexture && this.textures.exists(sealTexture)) seal.setTexture(sealTexture);
    }
    const finalDoor = this.observatoryPuzzleVisuals.get('final-door');
    if (finalDoor instanceof Phaser.GameObjects.Image) {
      const doorTexture = getLevelArtKey(7, world.finalDoorLatched ? 'sanctuary-door-open' : 'sanctuary-door-closed');
      if (doorTexture && this.textures.exists(doorTexture)) finalDoor.setTexture(doorTexture);
    }
    const splitter = this.observatoryPuzzleVisuals.get('splitter');
    if (splitter instanceof Phaser.GameObjects.Image) {
      const splitterTexture = getLevelArtKey(7, state.activeBeamPath.routeId === 'g2-split' ? 'fixed-three-route-splitter-on' : 'fixed-three-route-splitter-off');
      if (splitterTexture && this.textures.exists(splitterTexture)) splitter.setTexture(splitterTexture);
    }

    const roots = this.observatoryPuzzleVisuals.get('root-bed');
    if (roots instanceof Phaser.GameObjects.Graphics) roots.setAlpha(state.rootBedShadowed ? 0.5 : 1);
    const bridge = this.observatoryPuzzleVisuals.get('root-bridge');
    if (bridge instanceof Phaser.GameObjects.Graphics) {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      const playerOnBridge = Phaser.Geom.Rectangle.Overlaps(this.observatoryBridgeBounds, playerBounds);
      if (!state.bridgeEligible && bridge.visible && playerOnBridge) this.observatoryBridgePendingRemoval = true;
      if (state.bridgeEligible) this.observatoryBridgePendingRemoval = false;
      const deployed = state.bridgeEligible || this.observatoryBridgePendingRemoval;
      bridge.setVisible(deployed);
      for (const stone of this.observatoryBridgeStones) stone.setVisible(deployed);
      if (this.observatoryRootBody) {
        this.observatoryRootBody.enable = !deployed;
        this.observatoryRootBody.updateFromGameObject();
      }
      if (this.observatoryBridgePendingRemoval && !playerOnBridge) {
        this.observatoryBridgePendingRemoval = false;
        bridge.setVisible(false);
        for (const stone of this.observatoryBridgeStones) stone.setVisible(false);
        if (this.observatoryRootBody) this.observatoryRootBody.enable = true;
      }
    }

    const beams = this.observatoryPuzzleVisuals.get('beams');
    if (beams instanceof Phaser.GameObjects.Graphics) {
      beams.clear();
      const points = new Map<ObservatoryWaypointId, ObservatoryRoomPoint>();
      for (const room of Object.values(OBSERVATORY_ROOMS)) for (const waypoint of room.waypoints) points.set(waypoint.id, waypoint.position);
      const drawPath = (ids: readonly ObservatoryWaypointId[]): void => {
        const visible = ids.map((waypointId) => points.get(waypointId)).filter((point): point is ObservatoryRoomPoint => point?.roomId === this.activeObservatoryRoom);
        if (ids.length === 1) {
          const split = points.get('splitter');
          const target = points.get(ids[0]);
          if (split?.roomId === this.activeObservatoryRoom && target?.roomId === this.activeObservatoryRoom) {
            beams.lineStyle(3, 0xffdc77, 0.78);
            beams.lineBetween(split.x, split.y, target.x, target.y);
          }
        }
        if (visible.length < 2) return;
        beams.lineStyle(3, 0xffdc77, 0.78);
        for (let index = 1; index < visible.length; index += 1) beams.lineBetween(visible[index - 1].x, visible[index - 1].y, visible[index].x, visible[index].y);
      };
      drawPath(state.activeBeamPath.waypointIds);
      for (const branch of state.activeBeamPath.branches ?? []) drawPath(branch);
    }
  }

  private drawRoom(biome: string): void {
    const backgroundKey = getLevelBackgroundKey(this.progress.level);
    const hasCampaignBackground = backgroundKey !== null && this.textures.exists(backgroundKey);
    const tiles = biome === 'creek' || biome === 'library' || biome === 'ruins' || biome === 'observatory'
      ? 'ground_stone'
      : biome === 'tower'
        ? 'ground_dirt'
        : 'ground_grass';
    const tint: Record<string, number> = { woods: 0x728f73, library: 0xb9a882, creek: 0x809dad, tower: 0x9b9078, garden: 0xb2c68e, ruins: 0x82918c, observatory: 0x7182a0, heart: 0xd8b978 };
    // Forest decor (Level 01 and Level 02) is generated once per build and shared by the floor and the decor passes below.
    const forestDecor: ForestDecor | undefined = hasCampaignBackground ? undefined
      : this.progress.level === 0 ? buildForestEdgeDecor()
        : this.progress.level === 1 ? buildWoodsDecor() : undefined;
    if (hasCampaignBackground) {
      this.track(this.add.image(0, 0, backgroundKey).setOrigin(0).setDisplaySize(640, 360).setDepth(0));
    } else {
      const groundTint = forestDecor ? WOODS_GRASS_TINT : (tint[biome] ?? 0xffffff);
      this.track(this.add.tileSprite(0, 0, 640, 360, tiles).setOrigin(0).setTint(groundTint).setDepth(0));
      if (forestDecor) {
        this.drawForestFloor(forestDecor, this.progress.level === 0 ? FOREST_EDGE_PATH_DEPTH : WOODS_PATH_DEPTH);
      }
    }
    const decor = this.add.graphics().setDepth(1);
    if (!hasCampaignBackground && this.progress.level !== 0) {
      decor.fillStyle(biome === 'creek' ? 0x183f59 : 0x07151c, 0.16);
      decor.fillRect(0, 0, 640, 360);
    }
    if (this.progress.level === 0) {
      // The Level 01 dirt path is drawn by drawForestFloor() with the same Chaikin-smoothed recipe as Level 02.
      const ring = FOREST_EDGE.objects.ring.ground;
      decor.lineStyle(2, 0xffe680, this.progress.flags['l0-footprints-found'] ? 0.5 : 0.16);
      decor.strokeCircle(ring.x, ring.y, 17);
      decor.fillStyle(0xffe680, this.progress.flags['l0-footprints-found'] ? 0.12 : 0.035);
      decor.fillCircle(ring.x, ring.y, 15);
      this.footprintTrail = this.add.graphics().setDepth(4);
      this.footprintTrail.fillStyle(0xd7e6dc, 0.8);
      this.footprintTrail.fillStyle(0xe5f0d5, 0.16);
      this.footprintTrail.fillEllipse(FOREST_EDGE.pulseDiscovery.center.x, FOREST_EDGE.pulseDiscovery.center.y - 3, 150, 31);
      this.footprintTrail.setVisible(this.progress.flags['l0-footprints-found'] === true);
      this.track(this.footprintTrail);
    }
    this.track(decor);
    if (!hasCampaignBackground && this.progress.level === 1) {
      for (const tree of WHISPERING_WOODS.trees) {
        const texture = this.textures.exists('tree_woods') ? 'tree_woods' : 'tree_alt';
        const image = this.add.image(tree.x, tree.y, texture).setOrigin(0.5,1).setDepth(woodsDepth(tree.y)); image.setData('woodsId', tree.id); this.track(image);
      }
      for (const rock of WHISPERING_WOODS.rocks) {
        const image = this.add.image(rock.x, rock.y, 'rock_blocker').setOrigin(0.5,1).setDepth(woodsDepth(rock.y)); image.setData('woodsId', rock.id); this.track(image);
      }
      if (forestDecor) this.drawForestDecor(forestDecor);
    }
    if (!hasCampaignBackground && this.progress.level === 0) {
      for (const [index, tree] of FOREST_EDGE.objects.trees.entries()) {
        const treeKey = index % 2 === 1 && this.textures.exists('tree_alt') ? 'tree_alt' : 'tree_woods';
        const image = this.add.image(tree.anchor.x, tree.anchor.y, treeKey).setOrigin(0.5, 1).setDepth(worldDepth(tree.anchor.y));
        image.setData('forestEdgeId', tree.id); this.track(image);
      }
      for (const rock of FOREST_EDGE.objects.rocks) {
        const image = this.add.image(rock.anchor.x, rock.anchor.y, 'rock_blocker').setOrigin(0.5, 1).setDepth(worldDepth(rock.anchor.y));
        image.setData('forestEdgeId', rock.id); this.track(image);
      }
      if (forestDecor) this.drawForestDecor(forestDecor);
    } else if (!hasCampaignBackground && this.progress.level !== 1) {
      // Forest levels (01 and 02) replace this legacy border/bush/grass scatter with drawForestDecor(); other biomes keep it.
      const isStoneRoom = biome === 'library' || biome === 'ruins' || biome === 'observatory';
      const tree = isStoneRoom ? 'ruin_pillar' : 'tree_woods';
      const borderSpots: Array<[number, number]> = isStoneRoom
        ? [[42, 68], [598, 68], [42, 276], [598, 276]]
        : [[38, 56], [112, 44], [528, 44], [602, 56], [34, 165], [606, 165], [44, 286], [596, 286]];
      borderSpots.forEach(([x, y], idx) => {
        const key = !isStoneRoom && idx % 2 === 1 && this.textures.exists('tree_alt') ? 'tree_alt' : tree;
        this.track(this.add.image(x, y, key).setAlpha(0.92).setScale(0.88).setDepth(3 + Math.floor(y / 24)));
      });
      if (!isStoneRoom) {
        for (const [bx, by] of [[92, 316], [206, 326], [434, 326], [548, 316], [156, 82], [484, 82]] as Array<[number, number]>) {
          this.track(this.add.image(bx, by, 'bush_woods').setAlpha(0.9).setDepth(4));
        }
        for (let i = 0; i < 16; i++) {
          const gx = 54 + ((i * 83 + 29) % 532);
          const gy = 52 + ((i * 59 + 17) % 256);
          if (this.progress.level === 1 && gx >= 90 && gx <= 180 && gy >= 200 && gy <= 310) continue;
          this.track(this.add.image(gx, gy, 'tuft_grass').setAlpha(0.75).setDepth(1.2));
          if (i % 4 === 0) {
            this.track(this.add.image(Math.min(590, gx + 12), Math.min(315, gy + 6), i % 8 === 0 ? 'mushroom_cyan' : 'mushroom_warm').setAlpha(0.85).setDepth(1.5));
          }
        }
      }
      if (this.progress.level !== 1) for (const [sx, sy] of [[320, 298], [316, 266], [322, 152], [320, 114]] as Array<[number, number]>) {
        this.track(this.add.image(sx, sy, 'stepping_stone').setAlpha(0.72).setScale(0.85).setDepth(1.3));
      }
    }
  }

  private addNarrativeProps(level: number): void {
    const props: Array<[string, number, number]> = level === 0 ? [
      ['beacon_stone', FOREST_EDGE.objects.tablet.anchor.x, FOREST_EDGE.objects.tablet.anchor.y],
      ['woods_arch_locked', FOREST_EDGE.objects.gate.anchor.x, FOREST_EDGE.objects.gate.anchor.y],
      ['pedestal_empty', FOREST_EDGE.objects.ring.anchor.x, FOREST_EDGE.objects.ring.anchor.y],
    ]
      : [];
    for (const [key, x, y] of props) {
      this.addProp(key, x, y, level === 0 || key === 'woods_arch_locked' || key === 'heart_tree_0' ? 1 : 0.9);
    }
    if (level === 0) {
      const eye = this.addLevelArt('sun-eye-dormant', FOREST_EDGE.objects.eye.anchor.x, FOREST_EDGE.objects.eye.anchor.y, 32, 32, worldDepth(FOREST_EDGE.objects.gate.anchor.y) + 0.1);
      eye?.setData('forestEdgeId', 'sun-eye');
      if (!this.progress.lanternPickedUp) {
        const pickup = this.addLevelArt('pickup-lantern', FOREST_EDGE.objects.lantern.anchor.x, FOREST_EDGE.objects.lantern.anchor.y, 20, 28, worldDepth(FOREST_EDGE.objects.lantern.anchor.y));
        pickup?.setData('forestEdgeId', 'lantern');
      }
      if (this.progress.flags['l0-footprints-found']) for (const { x, y } of FOREST_EDGE.objects.trail) {
        const index = FOREST_EDGE.objects.trail.findIndex((point) => point.x === x && point.y === y);
        const stamp = this.addLevelArt('footprints-pulse', x, y, 20, 28, 4);
        stamp?.setOrigin(0.5, 0.5).setRotation(forestEdgeFootprintRotation(index, FOREST_EDGE.objects.trail, FOREST_EDGE.objects.ring.ground)).setAlpha(0.8).setData('forestEdgeId', `footprint-${index}`);
      }
      this.addForestEdgeGlows();
    } else if (level === 1) {
      this.addWoodsGate();
      for (const id of RUNE_ORDER) this.addWoodsArt(`rune-${id}`, `runestone_${id}_sleeping`, WHISPERING_WOODS.anchors[id], WOODS_RUNE_ART.width, WOODS_RUNE_ART.height);
      this.addWoodsArt('poem', 'poem_fragment', WHISPERING_WOODS.anchors.poem, WOODS_POEM_ART.width, WOODS_POEM_ART.height);
      this.addWoodsGlows();
      this.createWoodsTutorialCue();
      this.updateRuneRevealVisuals();
    }
    if (level === 1) this.drawFireflyRoute();
  }

  private registerLevel(level: number): void {
    const action = (id: string, label: string | (() => string), x: number, y: number, fn: () => void, enabled: () => unknown = () => true, texture = 'beacon_stone', isInReach?: (playerX: number, playerY: number) => boolean, reach?: ReachFootprint) => this.addAction(id, label, x, y, fn, enabled, texture, isInReach, reach);
    if (level === 0) {
      action('lamp', 'E · Nhận đèn lồng', FOREST_EDGE.objects.lantern.stand.x, FOREST_EDGE.objects.lantern.stand.y, () => {
        this.progress.lanternPickedUp = true; this.progress.lanternOn = false; this.lantern.lanternInHand = true; this.lantern.lanternOn = false;
        SoundSystem.playUiItemGet();
        const pickup = getLevelArtKey(0, 'pickup-lantern');
        this.objects.find((object) => object instanceof Phaser.GameObjects.Image && object.texture.key === pickup)?.destroy();
        this.forestEdgeLanternGlow?.setVisible(false);
        this.say([
          { speaker: 'Nhinh', text: 'Trên quai có khắc một dòng chữ…' },
          { speaker: 'Nhinh', text: 'Hãy giữ ánh sáng cho đến khi mọi người trở về.' },
          { speaker: 'Nhinh', text: 'Không biết ai đã để nó lại đây.' },
          { speaker: 'Lumo', text: 'Tôi cũng không nhớ… Cậu thử thắp lên xem. Có khi nó vẫn còn dùng được.' },
        ]);
        this.hintIndex = 0; this.save();
      }, () => !this.progress.lanternPickedUp && this.progress.flags['l0-lumo-met'] === true, 'pedestal_empty', undefined, { rect: FOREST_EDGE_LANTERN_PEDESTAL });
      action('lantern-inscription', 'E · Xem dòng khắc trên đèn', FOREST_EDGE.objects.lantern.stand.x, FOREST_EDGE.objects.lantern.stand.y, () => {
        this.say([{ speaker: 'Nhinh', text: 'Quai đèn đã mòn nhẵn. Chắc trước đây có người mang nó bên mình suốt.' }]);
      }, () => this.progress.lanternPickedUp, 'pedestal_empty', undefined, { rect: FOREST_EDGE_LANTERN_PEDESTAL });
      action('tablet', 'E · Đọc bia đá', FOREST_EDGE.objects.tablet.stand.x, FOREST_EDGE.objects.tablet.stand.y, () => {
        const inscription = 'Khách qua rừng, hãy tìm dấu chân dưới lớp sương. Ánh sáng đánh thức điều mắt thường bỏ quên.';
        if (!this.lantern.lanternOn) {
          this.say([{ speaker: 'Nhinh', text: 'Có chữ trên bia, nhưng tối quá. Mình không đọc được.' }, { speaker: 'Lumo', text: 'Thử soi đèn vào xem.' }]);
          return;
        }
        const firstRead = !this.progress.flags['l0-tablet-read'];
        this.progress.flags['l0-tablet-read'] = true;
        this.hintIndex = 0; this.save();
        this.say(firstRead
          ? [
            { speaker: 'Nhinh', text: 'Nhìn kìa. Những nét khắc đang sáng lên!' },
            { speaker: 'Nhinh', text: inscription },
            { speaker: 'Nhinh', text: 'Dấu chân dưới lớp sương… Nhưng quanh đây có thấy gì đâu.' },
            { speaker: 'Lumo', text: 'Ánh đèn chưa tới được đó. Cậu thử phát một xung sáng xem.' },
          ]
          : [{ speaker: 'Nhinh', text: inscription }]);
      }, () => this.progress.lanternPickedUp, 'beacon_stone', undefined, { rect: FOREST_EDGE.objects.tablet.solid });
      action('gate', () => this.progress.flags['l0-gate-open'] ? 'E · Qua cổng rừng' : 'E · Kiểm tra cổng', FOREST_EDGE.objects.gate.exit.x, FOREST_EDGE.objects.gate.exit.y, () => {
        if (this.progress.flags['l0-gate-open']) {
          this.nextLevel([
            { speaker: 'Nhinh', text: 'Đàn đom đóm đang bay sâu vào rừng.' },
            { speaker: 'Lumo', text: 'Tôi nhớ chúng vẫn thường đi lối này.' },
            { speaker: 'Nhinh', text: 'Vậy mình theo chúng nhé. Cậu đi cạnh tôi được không?' },
            { speaker: 'Lumo', text: 'Được chứ. Tôi ở ngay đây.' },
          ]);
        } else {
          this.say([
            { speaker: 'Nhinh', text: 'Cổng đóng rồi. Không thấy ổ khóa đâu cả.' },
            { speaker: 'Lumo', text: 'Cậu nhìn con mắt đá trên kia xem. Nó hướng về vòng đá dưới đất.' },
            { speaker: 'Nhinh', text: 'Có lẽ mình phải đứng ở đó?' },
          ]);
        }
      }, () => true, 'woods_arch_open', undefined, { rect: FOREST_EDGE_GATE_SLOT, face: 'south', sideMargin: 0 });
    } else if (level === 1) {
      const stands=WHISPERING_WOODS.stands;
      // RULE_GAMES.md §3 exception (2026-10-20): the poem and the three rune stones answer E from every
      // side their foot body can touch, not only from the south stand. The stand still anchors the prompt
      // and breaks ties, and each control keeps its existing enabled/label gating untouched.
      const stoneReach = (id: WoodsStoneId) => (playerX: number, playerY: number) => isWoodsStoneInReach(id, { x: playerX, y: playerY });
      const poemLines: DialogueLine[] = [
        { speaker: 'Hệ thống', text: 'Trăng soi qua kẽ lá,\nLá gọi sao về đây.' },
        { speaker: 'Hệ thống', text: 'Sao canh rừng yên giấc,\nChờ nắng mai vén mây.' },
      ];
      action('poem', 'E · Đọc mẩu bia thơ', stands.poem.x, stands.poem.y, () => {
        const first=!this.progress.flags['l1-poem-read']; this.progress.flags['l1-poem-read']=true; this.save();
        this.say(first ? [...poemLines,
          {speaker:'Nhinh',text:'Trăng, lá, sao… Không biết có liên quan đến những tấm bia kia không.'},
          {speaker:'Lumo',text:'Mình thử soi chúng xem. Chiếc đèn đã giúp cậu tìm thấy dấu chân mà.'}] : [...poemLines]);
      }, undefined, 'mural_tablet', stoneReach('poem'));
      for (const id of RUNE_ORDER) action(`rune-${id}`, `E · Cổ tự ${id==='moon'?'Trăng':id==='leaf'?'Lá':'Sao'}`, stands[id].x, stands[id].y, () => this.activateRune(id), undefined, `runestone_${id}_lit`, stoneReach(id));
      action('stairs', () => this.progress.flags['l1-open'] ? 'E · Xuống Thư viện' : 'E · Kiểm tra cổng', stands.exit.x, stands.exit.y, () => {
        if (!this.progress.flags['l1-open']) { this.say([{speaker:'Nhinh',text:'Rễ cây quấn kín cả lối xuống rồi.'},{speaker:'Lumo',text:'Ở cổng ngoài, chiếc đèn đã mở được đường. Có lẽ những tấm bia ở đây cũng cần ánh sáng.'}]); return; }
        this.nextLevel([
          {speaker:'Nhinh',text:'Có bậc thang dưới những rễ cây này.'},
          {speaker:'Lumo',text:'Thư viện… Đúng rồi, dưới này có một thư viện!'},
          {speaker:'Nhinh',text:'Cậu nhớ ra rồi à?'},
          {speaker:'Lumo',text:'Một chút. Người Elaria từng lưu lại chuyện của khu rừng ở đó.'},
          {speaker:'Nhinh',text:'Biết đâu có gì giúp mình tìm đường. Mình xuống xem nhé?'},
        ]);
      }, undefined, 'woods_arch_open', undefined, { rect: WHISPERING_WOODS.gate.threshold, face: 'south', sideMargin: 0 });
    }
  }

  private updatePuzzle(dt: number): void {
    if (this.progress.level === 1 && this.runeRevealExpiresAt > 0 && this.time.now >= this.runeRevealExpiresAt) {
      this.activeRevealedRunes.clear();
      this.runeRevealExpiresAt = 0;
      this.updateRuneRevealVisuals();
    }
    if (this.progress.level === 0 && this.lantern.lanternInHand) this.lantern.isDawnMode = false;
    if (dt > 0 && this.time.now - this.lastGateCheck > 1000) { this.lastGateCheck = this.time.now; }
  }

  private normalizeAndPersistWoodsProgress(): ReturnType<typeof normalizeRuneProgress> {
    const state = normalizeRuneProgress({ sequence: this.value('rune-sequence'), activated: Object.fromEntries(RUNE_ORDER.map((id) => [id, this.progress.flags[`l1-activated-${id}`] === true])), open: this.progress.flags['l1-open'] === true });
    let changed = this.value('rune-sequence') !== state.sequence || this.progress.flags['l1-open'] !== state.open;
    this.progress.counters['rune-sequence'] = state.sequence;
    this.progress.flags['l1-open'] = state.open;
    for (const id of RUNE_ORDER) {
      if (this.progress.flags[`l1-activated-${id}`] !== state.activated[id]) changed = true;
      this.progress.flags[`l1-activated-${id}`] = state.activated[id];
    }
    if (changed) this.save();
    return state;
  }

  private activateRune(id: RuneId): void {
    if (!canActivateWoodsRune(this.activeRevealedRunes.has(id), this.progress.flags[`l1-activated-${id}`]===true)) {
      this.say([{ speaker:'Nhinh', text:'Nét khắc mờ quá. Mình thử soi lại bằng xung sáng xem.' }]); return;
    }
    const before = this.normalizeAndPersistWoodsProgress();
    const result = activateWoodsRune(before,id);
    if (result.kind === 'open') { this.say([{speaker:'Nhinh',text:'Chúng vẫn sáng. Cổng cũng không đóng lại nữa.'}]); return; }
    if (result.kind === 'repeat') { this.say([{speaker:'Nhinh',text:'Bia này vẫn sáng. Mình xem tấm tiếp theo thôi.'}]); return; }
    this.progress.counters['rune-sequence']=result.state.sequence;
    this.progress.flags['l1-open']=result.state.open;
    for (const rune of RUNE_ORDER) this.progress.flags[`l1-activated-${rune}`]=result.state.activated[rune];
    this.save(); this.updateRuneRevealVisuals(); this.hintIndex=0;
    if (result.kind==='wrong') {
      this.say([{speaker:'Nhinh',text:'Bia không sáng lên…'},{speaker:'Lumo',text:'Mình thử nhìn xem đàn đom đóm bắt đầu từ đâu nhé.'}]); return;
    }
    if (result.kind==='reset') {
      this.say([{speaker:'Nhinh',text:'Những bia vừa sáng đều tắt rồi.'},{speaker:'Lumo',text:'Không sao. Mình thử lại từ đầu. Đàn đom đóm vẫn đang chỉ đường.'}]); return;
    }
    if (result.state.sequence===1) { this.say([{speaker:'Nhinh',text:'Bia vẫn sáng, dù xung sáng đã tan rồi!'},{speaker:'Lumo',text:'Nhìn đàn đom đóm kìa. Chúng đang bay sang tấm tiếp theo.'}]); return; }
    if (result.state.sequence===2) { this.say([{speaker:'Lumo',text:'Nhìn kìa! Rễ cây trên cổng đang nới ra!'}]); return; }
    if (result.state.sequence===3) {
      if (this.progress.flags['l1-memory-seen'] !== true) {
        this.progress.flags['l1-memory-seen']=true; this.save(); this.showWoodsMemory();
      }
    }
  }

  private showWoodsMemory(): void {
    const overlay=this.add.graphics().setDepth(80); overlay.fillStyle(0xf3a84f,0.24); overlay.fillRect(0,0,640,360);
    this.woodsMemoryOverlay=overlay; this.objects.push(overlay);
    const vignetteKey=getLevelArtKey(1,'memory_vignette');
    if(vignetteKey&&this.textures.exists(vignetteKey)){const vignette=this.add.image(480,248,vignetteKey).setOrigin(.5,1).setDisplaySize(128,64).setDepth(80);vignette.setData('woodsId','memory-vignette');this.objects.push(vignette);}
    const clear=()=>{ this.woodsMemoryOverlay?.destroy(); this.woodsMemoryOverlay=undefined; this.objects.find((o)=>o.getData('woodsId')==='memory-vignette')?.destroy(); };
    this.say([
      {speaker:'Đứa trẻ trong ký ức',text:'Mai mình lại ra đây chơi nhé?'},
      {speaker:'Người lớn trong ký ức',text:'Ừ. Đợi mặt trời lên nhé. Giờ về thôi, để rừng ngủ.'},
      {speaker:'Nhinh',text:'Lumo… Cậu cũng nhìn thấy chứ?'},
      {speaker:'Lumo',text:'Ừ. Đã lâu rồi tôi không nghe tiếng cười ở đây.'},
      {speaker:'Nhinh',text:'Cậu biết những người đó à?'},
      {speaker:'Lumo',text:'Tôi không nhớ. Nhưng giọng nói ấy… quen lắm.'},
      {speaker:'Nhinh',text:'Không sao. Nếu nhớ thêm điều gì, cậu cứ kể tôi nghe nhé.'},
      {speaker:'Lumo',text:'Ừ. Tôi sẽ kể.'},
    ],clear);
  }

  private updateWoodsFirefly(dt: number): void {
    const fly=this.objects.find((o)=>o.getData('woodsId')==='firefly') as Phaser.GameObjects.Arc | undefined;
    const glow=this.objects.find((o)=>o.getData('woodsId')==='firefly-glow') as Phaser.GameObjects.Arc | undefined;
    if (!fly || !glow) return;
    const route=WHISPERING_WOODS.fireflyRoute, target=route[(this.woodsFlyIndex+1)%route.length], origin=route[this.woodsFlyIndex];
    this.woodsFlyPhase+=dt;
    if (this.woodsFlyPhase>=2800) { this.woodsFlyPhase=0; this.woodsFlyIndex=(this.woodsFlyIndex+1)%route.length; }
    const progress=Math.min(1,this.woodsFlyPhase/1500), t=this.woodsFlyPhase<1500?progress:1;
    const x=origin.x+(target.x-origin.x)*t, y=origin.y+(target.y-origin.y)*t;
    fly.setPosition(x,y); glow.setPosition(x,y);
  }

  private getLumoMark(mark: string, x?: number, y?: number): { x: number; y: number } {
    if (x !== undefined && y !== undefined) return { x, y };
    const positions: Record<string, { x: number; y: number }> = { a: { x: 220, y: 130 }, b: { x: 420, y: 130 }, c: { x: 320, y: 218 }, high: { x: 320, y: 80 }, observatory: { x: 320, y: 114 }, heart: { x: 320, y: 125 } };
    return positions[mark] ?? { x: 350, y: 260 };
  }

  private getSavedLumoTarget(): { x: number; y: number } {
    const targetX = this.progress.counters['lumo-target-x'];
    const targetY = this.progress.counters['lumo-target-y'];
    if (typeof targetX === 'number' && typeof targetY === 'number') return { x: targetX, y: targetY };
    if (this.progress.level === 5 && this.progress.flags['l5-called-high']) return this.getLumoMark('high');
    if (this.progress.level === 8 && this.progress.flags['l8-called-observatory']) return this.getLumoMark('observatory');
    if (this.progress.level === 9 && this.progress.flags['l9-called-heart']) return this.getLumoMark('heart');
    if ((this.progress.level === 4 && this.progress.flags['l4-return-called']) || (this.progress.level === 5 && this.progress.flags['l5-return-called'])) return { x: this.player.x - 18, y: this.player.y - 20 };
    if (this.progress.level === 4) {
      for (const mark of ['c', 'b', 'a']) if (this.progress.flags[`l4-called-${mark}`]) return this.getLumoMark(mark);
    }
    return { x: 350, y: 260 };
  }

  private addAction(id: string, label: string | (() => string), x: number, y: number, onInteract: () => void, isEnabled: () => unknown = () => true, texture = 'beacon_stone', isInReach?: (playerX: number, playerY: number) => boolean, reach?: ReachFootprint): void {
    if ((id.includes('exit') || id === 'stairs') && this.progress.level !== 1) {
      const hasGateProp = this.objects.some((object) =>
        object instanceof Phaser.GameObjects.Image
        && (object.getData('forestEdgeId') === 'gate'
          || object.texture.key === 'woods_arch_locked'
          || object.texture.key === 'woods_arch_open'
          || object.texture.key.includes('woods_arch_open_passage'))
        && Math.abs(object.x - x) < 0.1
        && Math.abs(object.y - y) < 0.1,
      );
      if (!hasGateProp) this.addProp(texture, x, y, 0.8);
    }
    this.interactions.register({ id, x, y, getPromptBounds: this.getActionPromptBounds(id, x, y), radius: this.progress.level === 0 || this.progress.level === 1 ? 24 : 35, getPrompt: () => isEnabled() ? (typeof label === 'function' ? label() : label) : null, onInteract, isEnabled: () => Boolean(isEnabled()), ...(isInReach ? { isInReach } : {}), ...(reach ? { reach } : {}) });
  }

  private getActionPromptBounds(id: string, x: number, y: number): (() => { x: number; y: number; width: number; height: number } | null) | undefined {
    if (this.progress.level === 0) {
      if (id === 'lamp' || id === 'lantern-inscription') return () => ({ ...FOREST_EDGE_LANTERN_PEDESTAL });
      if (id === 'tablet') return () => ({
        x: FOREST_EDGE.objects.tablet.anchor.x - 24, y: FOREST_EDGE.objects.tablet.anchor.y - 60, width: 48, height: 60,
      });
      if (id === 'gate') return () => ({ x: 410, y: 10, width: 152, height: 156 });
    }

    if (this.progress.level === 1) {
      const woodsId = id === 'stairs' ? 'gate-base' : id;
      const target = this.objects.find((object): object is Phaser.GameObjects.Image =>
        object instanceof Phaser.GameObjects.Image && object.getData('woodsId') === woodsId,
      );
      return () => target?.scene && target.active && target.visible ? target.getBounds() : null;
    }

    const target = this.objects
      .filter((object): object is Phaser.GameObjects.Image =>
        object instanceof Phaser.GameObjects.Image && object.active && object.visible && object !== this.player.sprite,
      )
      .map((object) => ({ object, bounds: object.getBounds() }))
      .filter(({ bounds }) => bounds.width <= 140 && bounds.height <= 140
        && Math.abs(bounds.centerX - x) <= 56 && Math.abs(bounds.centerY - y) <= 56,
      )
      .sort((a, b) => Math.hypot(a.bounds.centerX - x, a.bounds.centerY - y) - Math.hypot(b.bounds.centerX - x, b.bounds.centerY - y))[0]?.object;
    if (!target) return undefined;
    return () => target.scene && target.active && target.visible ? target.getBounds() : null;
  }

  private clearCampaignColliders(): void {
    for (const collider of this.campaignColliders) collider.destroy();
    this.campaignColliders = [];
    this.campaignBodies.clear();
  }

  private addCampaignBarrier(id: string, x: number, y: number, width: number, height: number, enabled = true): void {
    const object = this.add.rectangle(x, y, width, height, 0x000000, 0);
    this.physics.add.existing(object, true);
    const body = object.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = enabled;
    this.campaignBodies.set(id, body);
    this.campaignColliders.push(this.physics.add.collider(this.player.sprite, object));
    this.objects.push(object);
  }

  private buildCampaignBarriers(level: number): void {
    if (level === 0) {
      this.addCampaignBarrier('forest-north-boundary', 320, 91, 640, 10);
      this.addCampaignBarrier('forest-south-boundary', 320, 315, 640, 10);
      this.addCampaignBarrier('forest-west-boundary', 5, 200, 10, 220);
      this.addCampaignBarrier('forest-east-boundary', 635, 200, 10, 220);
      FOREST_EDGE_SOLIDS.forEach((rect, index) => {
        this.addCampaignBarrier(`forest-solid-${index}`, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
      });
      const barrier = FOREST_EDGE.objects.gate.threshold;
      this.addCampaignBarrier('forest-gate-threshold', barrier.x + barrier.width / 2, barrier.y + barrier.height / 2, barrier.width, barrier.height, !this.progress.flags['l0-gate-open']);
    } else if (level === 1) {
      this.addCampaignBarrier('woods-north-boundary',320,91,640,10);
      this.addCampaignBarrier('woods-south-boundary',320,315,640,10);
      this.addCampaignBarrier('woods-west-boundary',2.5,200,5,220);
      this.addCampaignBarrier('woods-east-boundary',637.5,200,5,220);
      [...WHISPERING_WOODS.trees,...WHISPERING_WOODS.rocks].forEach((obstacle)=>{
        const r=obstacle.footprint; this.addCampaignBarrier(`woods-${obstacle.id}`,r.x+r.width/2,r.y+r.height/2,r.width,r.height);
      });
      for(const [id,r] of Object.entries(WHISPERING_WOODS.footprints)) this.addCampaignBarrier(`woods-footprint-${id}`,r.x+r.width/2,r.y+r.height/2,r.width,r.height);
      for (const [id,r] of [['woods-gate-left',WHISPERING_WOODS.gate.leftPost],['woods-gate-right',WHISPERING_WOODS.gate.rightPost],['woods-gate-backing',WHISPERING_WOODS.gate.backing],['woods-gate-threshold',WHISPERING_WOODS.gate.threshold]] as const) {
        this.addCampaignBarrier(id,r.x+r.width/2,r.y+r.height/2,r.width,r.height,id==='woods-gate-threshold'?!this.progress.flags['l1-open']:true);
      }
    } else if (level === 9) {
      // Level 10 registers its own colliders from HeartOfElariaLevel's layout (props + scenery bands),
      // so the generic campaign barriers must not add a second, contradictory set of walls here.
      return;
    }
  }

  private updateCampaignBarriers(): void {
    const setEnabled = (id: string, enabled: boolean): void => {
      const body = this.campaignBodies.get(id);
      if (body) body.enable = enabled;
    };
    if (this.progress.level === 0) {
      setEnabled('forest-gate-threshold', !this.progress.flags['l0-gate-open']);
    } else if (this.progress.level === 1) {
      if (this.progress.flags['l1-open']) setEnabled('woods-gate-threshold',false);
      else setEnabled('woods-gate-threshold',true);
      setEnabled('woods-gate-backing',true);
      setEnabled('woods-gate-left',true); setEnabled('woods-gate-right',true);
    }
  }

  private addProp(key: string, x: number, y: number, scale: number): void {
    if (this.progress.level === 0 && (key === 'woods_arch_locked' || key === 'woods_arch_open')) {
      this.addForestEdgeGate(key, x, y);
      return;
    }
    const artTexture = this.resolveLevelPropTexture(key);
    const depth = this.progress.level === 0 && key === 'pedestal_empty' ? 3 : this.progress.level === 0 ? worldDepth(y) : 8 + Math.floor(y / 10);
    const image = this.add.image(x, y, artTexture ?? key).setScale(scale).setDepth(depth);
    if (this.progress.level === 0) image.setOrigin(0.5, 1);
    if (this.progress.level === 0 && key === 'beacon_stone') image.setData('forestEdgeId', 'tablet');
    if (this.progress.level === 0 && key === 'pedestal_empty') image.setData('forestEdgeId', 'standing-ring');
    if (this.progress.level === 0 && (key === 'woods_arch_locked' || key === 'woods_arch_open')) image.setData('forestEdgeId', 'gate');
    image.setInteractive({ useHandCursor: false });
    this.objects.push(image);
    if (key.startsWith('crystal_')) this.tweens.add({ targets: image, y: y - 4, duration: 900, yoyo: true, repeat: -1 });
  }

  private addForestEdgeGate(key: string, x: number, y: number): void {
    const anchorDepth = worldDepth(y);
    const sourceKey = this.resolveLevelPropTexture(key) ?? key;
    const base = this.add.image(x, y, this.forestGateLayerKey(sourceKey, 'base')).setOrigin(0.5, 1).setDisplaySize(152, 156).setDepth(3);
    base.setData('forestEdgeId', 'gate');
    this.objects.push(base);
    for (const layer of ['header', 'left-post', 'right-post'] as const) {
      const image = this.add.image(x, y, this.forestGateLayerKey(sourceKey, layer))
        .setOrigin(0.5, 1).setDisplaySize(152, 156).setDepth(anchorDepth);
      image.setData('forestEdgeId', `gate-${layer}`);
      this.objects.push(image);
    }
  }

  private setForestEdgeGateTextures(sourceKey: string): void {
    for (const object of this.objects) {
      const id = object.getData('forestEdgeId');
      if (!(object instanceof Phaser.GameObjects.Image)) continue;
      const layer = id === 'gate' ? 'base'
        : id === 'gate-header' ? 'header'
          : id === 'gate-left-post' ? 'left-post'
            : id === 'gate-right-post' ? 'right-post' : null;
      if (!layer) continue;
      const textureKey = this.forestGateLayerKey(sourceKey, layer);
      if (object.texture.key !== textureKey) object.setTexture(textureKey);
    }
  }

  private forestGateLayerKey(sourceKey: string, layer: 'base' | 'header' | 'left-post' | 'right-post'): string {
    const key = `forest-gate-${sourceKey}-${layer}`;
    if (this.textures.exists(key)) return key;
    const source = this.textures.get(sourceKey).getSourceImage() as CanvasImageSource;
    const texture = this.textures.createCanvas(key, 152, 156);
    if (!texture) throw new Error(`Unable to create forest gate layer: ${key}`);
    const context = texture.getContext();
    context.clearRect(0, 0, 152, 156);
    context.save();
    if (layer === 'header') context.rect(0, 0, 152, 82);
    else if (layer === 'left-post') context.rect(0, 0, 50, 156);
    else if (layer === 'right-post') context.rect(102, 0, 50, 156);
    else context.rect(0, 0, 152, 156);
    context.clip();
    const sourceWidth = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width;
    const sourceHeight = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height;
    const scale = Math.min(152 / sourceWidth, 156 / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    context.drawImage(source, (152 - drawWidth) / 2, 156 - drawHeight, drawWidth, drawHeight);
    context.restore();
    texture.refresh();
    return key;
  }

  private resolveLevelPropTexture(key: string): string | null {
    const level = this.progress.level;
    if (level === 0 && key === 'beacon_stone') {
      return getLevelArtKey(level, this.progress.flags['l0-footprints-found'] ? 'beacon-stone-illuminated' : 'beacon-stone-hidden');
    }
    if (level === 0 && key === 'pedestal_empty') return getLevelArtKey(level, 'stone-standing-ring');
    if (level === 0 && (key === 'woods_arch_locked' || key === 'woods_arch_open') && this.progress.flags['l0-gate-open']) return getLevelArtKey(1, 'woods_arch_open_passage');
    if (level === 1) {
      const rune = key.match(/^runestone_(moon|leaf|star)_(?:rev|lit)$/);
      if (rune) {
        const id = rune[1];
        const activated = this.progress.flags[`l1-activated-${id}`] === true;
        const revealed = this.progress.flags[`l1-seen-${id}`] === true || this.activeRevealedRunes.has(id);
        return getLevelArtKey(level, `runestone_${id}_${activated ? 'active' : revealed ? 'revealed' : 'sleeping'}`);
      }
      if (key === 'mural_tablet') return getLevelArtKey(level, 'poem_fragment');
      if ((key === 'woods_arch_locked' || key === 'woods_arch_open') && this.progress.flags['l1-open']) return getLevelArtKey(level, 'woods_arch_open_passage');
    }
    if (level === 7 && key === 'guardian_statue') return getLevelArtKey(level, `statue-notch-${this.value('statue') % 4}`);
    return null;
  }

  private addLevelArt(
    filename: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    depth = 8 + Math.floor(y / 10),
  ): Phaser.GameObjects.Image | null {
    const key = getLevelArtKey(this.progress.level, filename);
    if (!key || !this.textures.exists(key)) return null;
    const image = this.add.image(x, y, key).setDepth(depth);
    if (this.progress.level === 0) image.setOrigin(0.5, 1);
    if (width !== undefined && height !== undefined) image.setDisplaySize(width, height);
    this.objects.push(image);
    return image;
  }

  private refreshCampaignArtVisuals(level: number): void {
    if (level === 0) {
      const gateOpen = this.progress.flags['l0-gate-open'] === true;
      const gateY = FOREST_EDGE.objects.gate.anchor.y;
      const gateX = FOREST_EDGE.objects.gate.anchor.x;
      const openArt = getLevelArtKey(1, 'woods_arch_open_passage');
      const gate = this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image
        && object.getData('forestEdgeId') === 'gate' && Math.abs(object.x - gateX) < 0.1 && Math.abs(object.y - gateY) < 0.1);
      if (gate) {
        const texture = gateOpen && openArt && this.textures.exists(openArt) ? openArt : gateOpen ? 'woods_arch_open' : 'woods_arch_locked';
        this.setForestEdgeGateTextures(texture);
        gate.setData('forestEdgeId', 'gate');
      }
    } else if (level===1) {
      const source=getLevelArtKey(1,this.progress.flags['l1-open']?'woods_arch_open_passage':'woods_arch_locked')??(this.progress.flags['l1-open']?'woods_arch_open':'woods_arch_locked');
      for(const layer of ['base','header','left-post','right-post'] as const){
        const image=this.objects.find((o):o is Phaser.GameObjects.Image=>o instanceof Phaser.GameObjects.Image&&o.getData('woodsId')===`gate-${layer}`);
        const key=this.woodsGateLayerTexture(source,layer);if(image&&image.texture.key!==key)image.setTexture(key);
      }
      this.updateRuneRevealVisuals();
    }
    if (level === 0) {
      const tablet = this.objects.find((object) => object.getData('forestEdgeId') === 'tablet');
      const tabletKey = getLevelArtKey(0, this.progress.lanternOn ? 'beacon-stone-illuminated' : 'beacon-stone-hidden');
      if (tablet instanceof Phaser.GameObjects.Image && tabletKey && this.textures.exists(tabletKey) && tablet.texture.key !== tabletKey) tablet.setTexture(tabletKey);
      this.syncForestEdgeTabletGlow();
      this.setForestEdgeArt('sun-eye', this.progress.flags['l0-gate-open'] ? 'sun-eye-full' : this.forestEdgeChargeMs > 0 ? 'sun-eye-receiving' : 'sun-eye-dormant');
    }
  }

  private setForestEdgeArt(id: string, filename: string): void {
    const key = getLevelArtKey(0, filename);
    if (!key || !this.textures.exists(key)) return;
    const image = this.objects.find((object) => object.getData('forestEdgeId') === id);
    if (image instanceof Phaser.GameObjects.Image && image.texture.key !== key) image.setTexture(key);
    // The eye glow is driven from the same call that sets the eye art, so it always matches the texture on screen.
    if (id === 'sun-eye') this.syncForestEdgeEyeGlow(filename);
  }

  /** Level 01 accent glows (ADD blend, WOODS_GLOW_DEPTH). Rendering only: no forestEdgeId, no interaction, no collision. */
  private addForestEdgeGlows(): void {
    const lantern = this.track(this.add.image(FOREST_EDGE_LANTERN_GLOW.x, FOREST_EDGE_LANTERN_GLOW.y, 'light_radial')
      .setTint(WOODS_GLOW_WARM).setScale(0.45).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH)
      .setVisible(!this.progress.lanternPickedUp));
    this.tweens.add({ targets: lantern, alpha: { from: 0.4, to: 0.6 }, duration: 1600, yoyo: true, repeat: -1 });
    this.forestEdgeLanternGlow = lantern;
    this.track(this.add.image(FOREST_EDGE_GATE_GLOW.x, FOREST_EDGE_GATE_GLOW.y, 'light_radial')
      .setScale(0.6).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH));
    this.forestEdgeEyeGlow = this.track(this.add.image(FOREST_EDGE_EYE_GLOW.x, FOREST_EDGE_EYE_GLOW.y, 'light_radial')
      .setTint(WOODS_GLOW_WARM).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH).setVisible(false));
    this.forestEdgeTabletGlow = this.track(this.add.image(FOREST_EDGE_TABLET_GLOW.x, FOREST_EDGE_TABLET_GLOW.y, 'light_radial')
      .setTint(0x9fe8d8).setScale(0.3).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH).setVisible(false));
    this.forestEdgeRingGlow = this.track(this.add.image(FOREST_EDGE_RING_GLOW.x, FOREST_EDGE_RING_GLOW.y, 'light_radial')
      .setTint(WOODS_GLOW_CYAN).setScale(0.25).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH)
      .setVisible(this.progress.flags['l0-footprints-found'] === true));
    this.syncForestEdgeTabletGlow();
  }

  /** Eye glow follows the eye art: hidden while dormant, brighter while the charge is received and once the gate is full. */
  private syncForestEdgeEyeGlow(filename: string): void {
    const glow = this.forestEdgeEyeGlow;
    if (!glow) return;
    if (filename === 'sun-eye-receiving') glow.setVisible(true).setScale(0.25).setAlpha(0.45);
    else if (filename === 'sun-eye-full') glow.setVisible(true).setScale(0.35).setAlpha(0.7);
    else glow.setVisible(false);
  }

  /** Tablet glow shows only while the tablet displays its illuminated art. It reads the live texture, so every texture choice stays in sync. */
  private syncForestEdgeTabletGlow(): void {
    const lit = getLevelArtKey(0, 'beacon-stone-illuminated');
    const tablet = this.objects.find((object) => object.getData('forestEdgeId') === 'tablet');
    this.forestEdgeTabletGlow?.setVisible(tablet instanceof Phaser.GameObjects.Image && lit !== null && tablet.texture.key === lit);
  }

  private revealForestEdgeFootprints(): void {
    this.forestEdgeRingGlow?.setVisible(true);
    FOREST_EDGE.objects.trail.forEach((point, index) => {
      if (this.objects.some((object) => object.getData('forestEdgeId') === `footprint-${index}`)) return;
      const stamp = this.addLevelArt('footprints-pulse', point.x, point.y, 20, 28, 4);
      stamp?.setOrigin(0.5, 0.5).setRotation(forestEdgeFootprintRotation(index, FOREST_EDGE.objects.trail, FOREST_EDGE.objects.ring.ground)).setAlpha(0.8).setData('forestEdgeId', `footprint-${index}`);
    });
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T { this.objects.push(object); return object; }

  private say(lines: DialogueLine[], onComplete?: () => void): void { this.dialogue.startDialogue(lines, onComplete); }

  /**
   * True when a loaded (not explicitly new) campaign save belongs outside this
   * build's playable slice. In demo that is index 4+ or a completed campaign;
   * in full mode no save is ever blocked.
   */
  private isBlockedDemoResume(newGameRequested: boolean): boolean {
    if (newGameRequested) return false;
    return RELEASE_POLICY.isOutOfRange(this.progress.level, this.progress.flags['l9-complete'] === true);
  }

  private nextLevel(lines: DialogueLine[]): void {
    if (this.progress.level >= 9) return;
    this.say(lines, () => {
      // Demo slice: the authored Shattered Creek exit still plays in full, then
      // the run stops on index 3. No increment, no lantern grant, no save as 4.
      if (RELEASE_POLICY.isDemo && this.progress.level >= RELEASE_POLICY.lastPlayableLevelIndex) {
        if (this.demoCompleteShown) return;
        this.demoCompleteShown = true;
        this.scene.start('ComingSoonScene', { mode: 'demo-complete' });
        return;
      }
      this.progress.level += 1;
      this.progress.lanternPickedUp = true;
      this.progress.lanternOn = true;
      this.progress.flags['pulse-used'] = true;
      this.save();
      SoundSystem.playGateOpen();
      this.scene.restart();
    });
  }

  /**
   * Travels from the pause menu to a level already reached. The puzzles stay solved (see applyLevelSelection). Nothing
   * runs while a conversation, the ending or the redirect is on screen.
   */
  private selectLevel(target: number): void {
    if (this.dialogue.isActive() || this.heartEnd || this.redirecting) return;
    if (!applyLevelSelection(this.progress, target, RELEASE_POLICY.lastPlayableLevelIndex)) return;
    this.save();
    SoundSystem.playGateOpen();
    this.scene.restart();
  }

  /** Level 10's ending: HeartOfElariaLevel has already saved `l9-complete`, so only the scene switch is left. */
  private finishHeartCampaign(): void {
    this.progress.flags['l9-complete'] = true;
    this.save();
    this.heartEnd = true;
    this.scene.start('EndingScene', { campaign: true });
  }

  private refreshCampaignPuzzleVisuals(): void {
    const level = this.progress.level;
    this.refreshCampaignArtVisuals(level);
    if (level !== 0) return; // every later level draws its own beams in its controller
    if (!this.campaignBeamGraphics || !this.campaignBeamGraphics.active) {
      this.campaignBeamGraphics = this.add.graphics().setDepth(6);
      this.track(this.campaignBeamGraphics);
    }
    const graphics = this.campaignBeamGraphics;
    graphics.clear();
    if (this.forestEdgeChargeMs > 0) {
      const t = Math.min(1, this.forestEdgeChargeMs / FOREST_EDGE.chargeMs);
      graphics.lineStyle(2 + t, 0xffe680, 0.35 + t * 0.55);
      graphics.beginPath(); graphics.moveTo(this.player.x + 6, this.player.y + 2); graphics.lineTo(FOREST_EDGE.objects.eye.anchor.x, FOREST_EDGE.objects.eye.anchor.y - 8); graphics.strokePath();
      graphics.fillStyle(0xffe680, 0.25 + t * 0.45); graphics.fillCircle(FOREST_EDGE.objects.eye.anchor.x, FOREST_EDGE.objects.eye.anchor.y - 8, 3 + t * 4);
    }
  }

  private isRuinsOuterBeamReady(side: 'left' | 'right'): boolean {
    const mirrorReady = side === 'left' ? this.value('ruins-left') === 2 : this.value('ruins-right') === 1;
    return this.lantern.lanternPlaced && this.lantern.lanternOn && mirrorReady;
  }
  private value(key: string): number { return this.progress.counters[key] ?? 0; }
  private save(): void { CampaignSaveSystem.save(this.progress); }
  private getRunePositions(): Record<string, { x: number; y: number }> { return { moon: { x: 180, y: 204 }, leaf: { x: 320, y: 125 }, star: { x: 460, y: 204 } }; }

  private updateRuneRevealVisuals(): void {
    for (const id of RUNE_ORDER) {
      const image = this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.getData('woodsId')===`rune-${id}`);
      const active = this.progress.flags[`l1-activated-${id}`] === true;
      const revealed = active || this.activeRevealedRunes.has(id);
      const art = getLevelArtKey(1, `runestone_${id}_${active ? 'active' : revealed ? 'revealed' : 'sleeping'}`);
      const fittedArt = art && this.textures.exists(art) ? this.normalizedWoodsRuneTexture(art) : undefined;
      if (image && fittedArt && image.texture.key!==fittedArt) image.setTexture(fittedArt).setDisplaySize(WOODS_RUNE_ART.width,WOODS_RUNE_ART.height);
      // The glow follows the same active / revealed / sleeping state as the rune art it sits behind.
      const glow = this.woodsRuneGlows.get(id);
      if (glow) {
        glow.setVisible(revealed);
        if (active) glow.clearTint().setScale(0.45).setAlpha(0.6);
        else glow.setTint(WOODS_GLOW_CYAN).setScale(0.42).setAlpha(0.55);
      }
    }
  }

  /** Level 02 accent glows for the gate, the poem, and each rune. Rendering only; no woodsId. */
  private addWoodsGlows(): void {
    const gate = this.track(this.add.image(WOODS_GATE_GLOW.x, WOODS_GATE_GLOW.y, 'light_radial')
      .setScale(0.75).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH));
    this.tweens.add({ targets: gate, alpha: { from: 0.45, to: 0.6 }, duration: 1800, yoyo: true, repeat: -1 });
    this.track(this.add.image(WOODS_POEM_GLOW.x, WOODS_POEM_GLOW.y, 'light_radial')
      .setTint(0x9fe8d8).setScale(0.32).setAlpha(0.30).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH));
    this.woodsRuneGlows.clear();
    for (const id of RUNE_ORDER) {
      const anchor = WHISPERING_WOODS.anchors[id];
      const glow = this.track(this.add.image(anchor.x, anchor.y + WOODS_RUNE_GLOW_Y_OFFSET, 'light_radial')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH).setVisible(false));
      this.woodsRuneGlows.set(id, glow);
    }
  }

  /**
   * Shared forest floor for Level 01 and Level 02: soft mottling, the Chaikin-smoothed dirt path as a geometry mask,
   * and path-edge breakup stamps. The caller draws the base grass tile first. Rendering only.
   */
  private drawForestFloor(decor: ForestDecor, pathDepth: number): void {
    const mottle = this.add.graphics().setDepth(0.3);
    // Each patch is two nested ellipses so its edge reads soft rather than hard-stroked.
    for (const patch of decor.mottling.shadows) {
      mottle.fillStyle(FOREST_MOTTLE_COLOR, patch.alpha * 0.6).fillEllipse(patch.x, patch.y, patch.width, patch.height);
      mottle.fillStyle(FOREST_MOTTLE_COLOR, patch.alpha * 0.6).fillEllipse(patch.x, patch.y, patch.width * 0.6, patch.height * 0.6);
    }
    for (const patch of decor.mottling.moss) {
      mottle.fillStyle(FOREST_MOSS_COLOR, patch.alpha * 0.6).fillEllipse(patch.x, patch.y, patch.width, patch.height);
      mottle.fillStyle(FOREST_MOSS_COLOR, patch.alpha * 0.6).fillEllipse(patch.x, patch.y, patch.width * 0.6, patch.height * 0.6);
    }
    this.track(mottle);
    const paths = this.add.graphics().setDepth(pathDepth);
    paths.fillStyle(0xffffff, 1);
    for (const polygon of decor.paths) paths.fillPoints(polygon.map(({ x, y }) => new Phaser.Geom.Point(x, y)), true);
    const mask = paths.createGeometryMask();
    const pathTexture = this.add.tileSprite(0, 0, 640, 360, 'ground_dirt').setOrigin(0).setTint(WOODS_PATH_TINT).setAlpha(WOODS_PATH_ALPHA).setDepth(pathDepth).setMask(mask);
    paths.setVisible(false);
    this.track(paths); this.track(pathTexture);
    // Edge shadows must sit just above the dirt overlay to soften its rim. Level 02 (path 0.55) keeps its pinned 0.58;
    // Level 01 (path 0.6) lifts them to 0.61, still below the edge tufts (0.62).
    for (const stamp of decor.pathEdge.shadows) {
      this.track(this.add.image(stamp.x, stamp.y, stamp.texture).setScale(stamp.scale).setTint(stamp.tint).setAlpha(stamp.alpha).setDepth(Math.max(stamp.depth, pathDepth + 0.01)));
    }
    for (const stamp of decor.pathEdge.tufts) {
      this.track(this.forestArtImage(stamp.x, stamp.y, stamp.texture).setScale(stamp.scale).setTint(stamp.tint).setAlpha(stamp.alpha).setFlipX(stamp.flipX).setDepth(stamp.depth));
    }
    // Opt-in dense rim band (Level 01): the same grass art packed along both sides of the edge, below every actor and
    // prop. Decor only: no collision, no interaction, no walkable data.
    for (const stamp of decor.pathEdge.denseTufts ?? []) {
      this.track(this.forestArtImage(stamp.x, stamp.y, stamp.texture).setScale(stamp.scale).setTint(stamp.tint).setAlpha(stamp.alpha).setFlipX(stamp.flipX).setDepth(stamp.depth));
    }
  }

  /**
   * Forest decor art at a decor point. Generated sprites sit on FOREST_ART_ORIGIN (their content bottom). A missing
   * texture falls back to tree_woods (trees) or tuft_grass (grass), both bottom-anchored, so no missing-texture box shows.
   */
  private forestArtImage(x: number, y: number, texture: string): Phaser.GameObjects.Image {
    const ancient = (FOREST_DECOR_TEXTURES.ancientTrees as readonly string[]).includes(texture);
    const grass = (FOREST_DECOR_TEXTURES.roadsideGrass as readonly string[]).includes(texture);
    if (this.textures.exists(texture)) {
      const originY = ancient ? FOREST_ART_ORIGIN.ancientTreeY : grass ? FOREST_ART_ORIGIN.roadsideGrassY : 1;
      return this.add.image(x, y, texture).setOrigin(0.5, originY);
    }
    return this.add.image(x, y, grass ? 'tuft_grass' : 'tree_woods').setOrigin(0.5, 1);
  }

  /** Shared forest decor for Level 01 and Level 02: back canopy rows, ancient side trees, bottom bushes, ground cover. No actor or walkable meaning. */
  private drawForestDecor(decor: ForestDecor): void {
    for (const t of [...decor.backTrees, ...decor.sideTrees]) {
      this.track(this.forestArtImage(t.x, t.baseY, t.texture).setFlipX(t.flipX)
        .setScale(t.scale).setTint(t.tint).setDepth(woodsDepth(t.baseY)));
    }
    for (const bush of decor.frontBushes) {
      this.track(this.add.image(bush.x, bush.baseY, FOREST_DECOR_TEXTURES.bush).setOrigin(0.5, 1).setScale(bush.scale).setTint(bush.tint)
        .setAlpha(bush.alpha).setDepth(woodsDepth(bush.baseY)));
    }
    for (const tuft of decor.groundCover.tufts) {
      this.track(this.forestArtImage(tuft.x, tuft.y, tuft.texture).setScale(tuft.scale).setTint(tuft.tint).setAlpha(tuft.alpha)
        .setFlipX(tuft.flipX).setDepth(tuft.depth));
    }
    for (const mushroom of decor.groundCover.mushrooms) {
      this.track(this.add.image(mushroom.x, mushroom.y, mushroom.texture).setScale(mushroom.scale).setTint(mushroom.tint)
        .setAlpha(mushroom.alpha).setDepth(mushroom.depth));
      if (mushroom.texture === FOREST_DECOR_TEXTURES.mushroomCyan) {
        // Small additive glow on the cap (mushroom y - 5). The mushroom sprite stays under actors, but the glow must sit
        // above the darkness overlay (68-68.5) or it is swallowed; being additive light, it never hides anything.
        this.track(this.add.image(mushroom.x, mushroom.y - 5, 'light_radial').setScale(0.05).setTint(WOODS_GLOW_CYAN)
          .setAlpha(0.65).setBlendMode(Phaser.BlendModes.ADD).setDepth(WOODS_GLOW_DEPTH));
      }
    }
  }

  private normalizedWoodsRuneTexture(sourceKey: string): string {
    const key=`woods-rune-normalized-${sourceKey}`;
    if(this.textures.exists(key))return key;
    const source=this.textures.get(sourceKey).getSourceImage() as CanvasImageSource;
    const texture=this.textures.createCanvas(key,WOODS_RUNE_ART.sourceWidth,WOODS_RUNE_ART.sourceHeight);
    if(!texture)return sourceKey;
    const ctx=texture.getContext();
    const width=WOODS_RUNE_ART.sourceWidth,height=WOODS_RUNE_ART.sourceHeight;
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
    let minX:number=width,minY:number=height,maxX:number=-1,maxY:number=-1;
    try{
      ctx.drawImage(source,0,0,width,height);
      const pixels=ctx.getImageData(0,0,width,height).data;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>=WOODS_RUNE_BODY_FIT.alphaThreshold){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    }catch{/* If source pixels cannot be read, the pure fit helper supplies a finite full-canvas fallback. */}
    const bounds=maxX>=minX&&maxY>=minY?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:undefined;
    const fit=fitWoodsRuneArt(bounds);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(source,fit.offsetX,fit.offsetY,width*fit.scale,height*fit.scale);
    texture.refresh();
    return key;
  }

  private showRuneJournal(): void {
    if (this.progress.level !== 1) return;
    const discovered: string[] = (['moon', 'leaf', 'star'] as const).filter((id) => this.progress.flags[`l1-seen-${id}`]);
    const labels: Record<string, string> = { moon: 'Trăng — bia bên trái', leaf: 'Lá — bia ở giữa phía trên', star: 'Sao — bia bên phải' };
    const lines: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Sổ tay của mình.' }];
    if (discovered.length) lines.push({ speaker: 'Nhinh', text: `Các dấu đã ghi:\n${discovered.map((id) => `• ${labels[id]}`).join('\n')}` });
    if (this.progress.flags['l1-poem-read']) {
      lines.push(
        { speaker: 'Nhinh', text: 'Bài thơ:' },
        { speaker: 'Hệ thống', text: 'Trăng soi qua kẽ lá,\nLá gọi sao về đây.' },
        { speaker: 'Hệ thống', text: 'Sao canh rừng yên giấc,\nChờ nắng mai vén mây.' },
      );
    }
    if (this.progress.flags['l1-memory-seen']) lines.push({ speaker: 'Nhinh', text: 'Ký ức: một đứa trẻ hẹn ngày mai; người lớn bảo đợi mặt trời lên rồi về để rừng ngủ.' });
    if (lines.length === 1) lines.push({ speaker: 'Nhinh', text: 'Sổ tay chưa ghi cổ tự nào. Đọc mẩu thơ rồi dùng SPACE gần ba bia đá.' });
    this.say(lines);
  }

  private showOpeningJournal(): void {
    const notes = [
      this.progress.lanternPickedUp ? 'Dòng khắc trên đèn: “Hãy giữ ánh sáng cho đến khi mọi người trở về.”' : '',
      this.progress.flags['l0-tablet-read'] ? 'Bia đá nhắc rằng ánh sáng đánh thức điều mắt thường bỏ quên.' : '',
      this.progress.flags['l0-footprints-found'] ? 'Dấu chân hiện lên sau Light Pulse và dẫn tới vòng đá.' : '',
      this.progress.flags['l0-gate-open'] ? 'Mắt đá giữ cổng mở sau khi nhận ánh sáng.' : '',
    ].filter(Boolean);
    this.say([{ speaker: 'Nhinh', text: notes.length ? `Sổ tay của mình.\n${notes.join('\n')}` : 'Sổ tay còn trống.' }]);
  }

  private getForestEdgeStep(): 'wake' | 'pickup' | 'light' | 'tablet' | 'pulse' | 'ring' | 'exit' {
    if (this.progress.flags['l0-gate-open']) return 'exit';
    if (!this.progress.flags['l0-lumo-met']) return 'wake';
    if (!this.progress.lanternPickedUp) return 'pickup';
    if (!this.lantern.lanternOn && !this.progress.flags['l0-tablet-read']) return 'light';
    if (!this.progress.flags['l0-tablet-read']) return 'tablet';
    if (!this.progress.flags['l0-footprints-found']) return 'pulse';
    return 'ring';
  }

  private drawFireflyRoute(): void {
    this.woodsFlyIndex = 0; this.woodsFlyPhase = 0;
    const start = WHISPERING_WOODS.fireflyRoute[0];
    const glow = this.add.circle(start.x, start.y, 10, 0xffd96d, 0.12).setDepth(5); glow.setData('woodsId','firefly-glow'); this.track(glow);
    const firefly = this.add.circle(start.x, start.y, 3, 0xfff0a1, 0.95).setDepth(6); firefly.setData('woodsId','firefly'); this.track(firefly);
    this.tweens.add({ targets: [glow, firefly], alpha: { from: 0.4, to: 1 }, scale: { from: 0.8, to: 1.25 }, duration: 650, yoyo: true, repeat: -1 });
  }

  private createWoodsTutorialCue(): void {
    this.woodsTutorialCue = this.track(this.add.graphics().setDepth(4));
    this.woodsTutorialCue.setData('woodsId', 'tutorial-cue');
    this.woodsCueStage = undefined;
  }

  private updateWoodsTutorialCue(stage: WoodsTutorialStage): void {
    if (!this.woodsTutorialCue || this.woodsCueStage === stage) return;
    this.woodsCueStage = stage;
    this.woodsTutorialCue.clear();
    const target = stage === 'poem' ? WHISPERING_WOODS.anchors.poem : undefined;
    this.woodsTutorialCue.setData('stage', stage);
    this.woodsTutorialCue.setData('target', target ? 'poem' : null);
    this.woodsTutorialCue.setVisible(Boolean(target));
    if (!target) return;
    const color = 0xb4dfb2;
    const cueWidth = WOODS_POEM_ART.width - 10;
    this.woodsTutorialCue.fillStyle(color, 0.12);
    this.woodsTutorialCue.fillEllipse(target.x, target.y - 2, cueWidth, 18);
    this.woodsTutorialCue.lineStyle(2, color, 0.55);
    this.woodsTutorialCue.strokeEllipse(target.x, target.y - 2, cueWidth, 18);
  }

  private getWoodsTutorialStage(): WoodsTutorialStage {
    return getWoodsTutorialStage({
      open: this.progress.flags['l1-open'] === true,
      sequence: this.value('rune-sequence'),
      poemRead: this.progress.flags['l1-poem-read'] === true,
    });
  }

  private addWoodsArt(id: string, filename: string, anchor: {x:number;y:number}, width: number, height: number): Phaser.GameObjects.Image | null {
    const key = getLevelArtKey(1, filename);
    if (!key || !this.textures.exists(key)) return null;
    const image = this.add.image(anchor.x, anchor.y, key).setOrigin(0.5,1).setDisplaySize(width,height).setDepth(woodsDepth(anchor.y));
    image.setData('woodsId', id); this.objects.push(image); return image;
  }

  private addWoodsGate(): void {
    const anchor = WHISPERING_WOODS.anchors.gate;
    const source = getLevelArtKey(1, this.progress.flags['l1-open'] ? 'woods_arch_open_passage' : 'woods_arch_locked') ?? (this.progress.flags['l1-open'] ? 'woods_arch_open' : 'woods_arch_locked');
    for (const layer of ['base','header','left-post','right-post'] as const) {
      const key = this.woodsGateLayerTexture(source,layer);
      const depth = layer==='base' ? 3 : woodsDepth(anchor.y);
      const image=this.add.image(anchor.x,anchor.y,key).setOrigin(0.5,1).setDisplaySize(128,126).setDepth(depth);
      image.setData('woodsId',`gate-${layer}`); this.objects.push(image);
    }
  }

  private woodsGateLayerTexture(source: string, layer: 'base'|'header'|'left-post'|'right-post'): string {
    const key=`woods-gate-l1-${source}-${layer}`; if(this.textures.exists(key)) return key;
    const sourceImage=this.textures.get(source).getSourceImage() as CanvasImageSource;
    const dimensions=this.textures.get(source).getSourceImage() as {naturalWidth?:number;naturalHeight?:number;width:number;height:number};
    const sw=dimensions.naturalWidth||dimensions.width, sh=dimensions.naturalHeight||dimensions.height;
    const scale=Math.min(128/sw,126/sh),dw=sw*scale,dh=sh*scale,ox=(128-dw)/2,oy=126-dh;
    const texture=this.textures.createCanvas(key,128,126); if(!texture)return source;
    const ctx=texture.getContext();ctx.clearRect(0,0,128,126);ctx.save();
    if(layer==='header')ctx.rect(0,0,128,47);else if(layer==='left-post')ctx.rect(0,0,38,126);else if(layer==='right-post')ctx.rect(90,0,38,126);else ctx.rect(0,0,128,126);
    ctx.clip();ctx.drawImage(sourceImage,ox,oy,dw,dh);ctx.restore();texture.refresh();return key;
  }

  private showHint(): void {
    if (this.progress.level === 2) { this.libraryLevel?.showHint(); return; }
    if (this.progress.level === 4) { this.pathForTwoLevel?.showHint(); return; }
    if (this.progress.level === 9) { this.heartLevel?.showHint(); return; }
    if (this.progress.level === 8 && this.activeObservatoryRoom) {
      const guidance = observatoryGuidance(this.activeObservatoryRoom, this.getObservatoryWorldState());
      // Keyed on the ladder text, not the objective row: one ladder serves several sub-objectives of the network solve.
      const ladderKey = guidance.hints.join('\n');
      if (this.observatoryHintLadderKey !== ladderKey) {
        this.observatoryHintLadderKey = ladderKey;
        this.hintIndex = 0;
      }
      const index = Math.min(this.hintIndex, guidance.hints.length - 1);
      const message = guidance.hints[index];
      this.hintIndex = Math.min(this.hintIndex + 1, guidance.hints.length - 1);
      this.say([{ speaker: 'Hệ thống', text: message }]);
      return;
    }
    if (this.progress.level === 0) {
      const step = this.getForestEdgeStep();
      if (this.forestEdgeHintStep !== step) { this.forestEdgeHintStep = step; this.hintIndex = 0; }
      const hints: Record<string, string[]> = {
        wake: ['Nhìn kỹ khu đất trước mặt.', 'Một chiếc đèn cũ nằm cạnh bia đá.', 'Đến gần chiếc đèn để xem ai đang ở bên trong.'],
        pickup: ['Quan sát chiếc đèn cạnh bia đá.', 'Có lẽ Lumo muốn Nhinh nhấc chiếc đèn lên.', 'Đứng cạnh đèn và nhấn E.'],
        light: ['Chiếc đèn đang ở trong tay Nhinh.', 'Dòng chữ trên quai nhắc đến ánh sáng.', 'Bật đèn bằng F.'],
        tablet: ['Bia đá đứng ngay cạnh chiếc đèn.', 'Ánh đèn sẽ làm hiện chữ trên bia.', 'Đứng cạnh bia và nhấn E khi đèn đang bật.'],
        pulse: ['Những dấu chân có thể ẩn dưới lớp sương.', this.lantern.lanternOn ? 'Dòng khắc bảo rằng ánh sáng đánh thức điều bị bỏ quên.' : 'Bật đèn bằng F trước khi dùng Pulse.', this.lantern.lanternOn ? 'Dùng SPACE để Pulse gần lối mòn.' : 'Giữ đèn bật bằng F, rồi nhấn SPACE gần lối mòn.'],
        ring: ['Nhìn phần đất ngay trước cổng. Những dấu chân dừng ở đâu?', 'Mắt đá cần ánh sáng từ một người đứng đúng vị trí.', 'Dùng Pulse tìm vòng đá, đứng vào vòng rồi bật đèn bằng F.'],
        exit: ['Cổng đã mở. Hãy bước tới lối đi.', 'Lối đi nằm giữa hai trụ cổng.', 'Đến cổng và nhấn E để đi tiếp.'],
      };
      const stageHints = hints[step];
      const message = stageHints[Math.min(this.hintIndex, stageHints.length - 1)];
      this.hintIndex = Math.min(this.hintIndex + 1, stageHints.length - 1);
      this.say([{ speaker: 'Hệ thống', text: message }]);
      return;
    }
    if (this.progress.level===1) {
      const count=this.value('rune-sequence');
      const stage=this.getWoodsTutorialStage();
      const step=stage==='sequence' ? count===1?'next-leaf':'next-star' : stage;
      if(step!==this.woodsHintStep){this.woodsHintStep=step;this.hintIndex=0;}
      const hints:Record<string,string[]>={
        poem:['Mẩu thơ ngay trước mặt. Đứng cạnh rồi nhấn E để đọc.','Bài thơ nằm ở hốc ngay lối vào.','Đọc mẩu thơ bằng E.'],
        observe:['Đứng gần bia và nhấn SPACE để soi ký hiệu. Khi ký hiệu còn sáng, nhấn E để kích hoạt.','Đàn đom đóm dừng ở ba bia theo một đường cố định. Mẩu thơ ghi lại ba hình.','Soi bia rồi kích hoạt theo thứ tự Trăng bên trái, Lá ở giữa phía trên, Sao bên phải.'],
        sequence:['Đứng gần bia và nhấn SPACE để soi ký hiệu. Khi ký hiệu còn sáng, nhấn E để kích hoạt.','Đàn đom đóm dừng ở ba bia theo một đường cố định. Mẩu thơ ghi lại ba hình.','Soi bia rồi kích hoạt theo thứ tự Trăng bên trái, Lá ở giữa phía trên, Sao bên phải.'],
        'next-leaf':['Đom đom vẫn chỉ đường từ bia này sang bia kế tiếp.','Bia kế tiếp nằm giữa phía trên. Dùng Pulse để đọc dấu trước khi chạm.','Bước tiếp theo là Lá ở giữa phía trên. Soi bia rồi kích hoạt khi nét còn sáng.'],
        'next-star':['Đom đom vẫn chỉ đường từ bia này sang bia kế tiếp.','Bia cuối cùng nằm bên phải. Dùng Pulse để đọc dấu trước khi chạm.','Bước tiếp theo là Sao bên phải. Soi bia rồi kích hoạt khi nét còn sáng.'],
        exit:['Cổng đã mở. Hãy bước tới lối đi giữa hai trụ đá.','Bậc thang dẫn xuống dưới cổng.','Đến lối đi và nhấn E để xuống Thư viện.'],
      };
      const choices=hints[step],message=choices[Math.min(this.hintIndex,choices.length-1)];this.hintIndex=Math.min(this.hintIndex+1,choices.length-1);this.say([{speaker:'Hệ thống',text:message}]);return;
    }
    const hints = CAMPAIGN_LEVELS[this.progress.level].hint;
    if (!hints) return;
    const message = hints[Math.min(this.hintIndex, hints.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, hints.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  private refreshHud(): void {
    const index = this.progress.level;
    const level = CAMPAIGN_LEVELS[index];
    const padded = String(index + 1).padStart(2, '0');
    let objective = level.objective;
    let status = '';
    let lumo = '';
    if (index === 7 && this.ruinsLevel) {
      objective = this.ruinsLevel.getObjectiveText();
      status = this.ruinsLevel.getStatusText();
      lumo = 'NHINH + LUMO';
    } else if (index === 3 && this.shatteredCreek) {
      objective = this.shatteredCreek.getObjectiveText();
      status = this.shatteredCreek.getStatusText();
    } else if (index === 5 && this.sleeplessTower) {
      objective = this.sleeplessTower.getObjectiveText();
      status = this.sleeplessTower.getStatusText();
    } else if (index === 8 && this.activeObservatoryRoom) {
      const roomId = this.activeObservatoryRoom;
      const guidance = observatoryGuidance(roomId, this.getObservatoryWorldState());
      objective = guidance.objective;
      status = guidance.status;
      lumo = guidance.lumo;
    } else if (index === 4 && this.pathForTwoLevel) {
      objective = this.pathForTwoLevel.getObjectiveText();
      status = this.pathForTwoLevel.getStatusText();
      lumo = this.progress.flags['l4-reunited'] ? 'LUMO · đã trở lại' : 'LUMO · E gọi tới mốc / trở về';
    } else if (index === 9 && this.heartLevel) {
      objective = this.heartLevel.getObjectiveText();
      status = this.heartLevel.getStatusText();
      lumo = this.heartLevel.getLumoStatusText();
    } else if (index === 0) {
      const step = this.getForestEdgeStep();
      if (step !== this.forestEdgeHintStep) { this.forestEdgeHintStep = step; this.hintIndex = 0; }
      const objectives: Record<string, string> = {
        wake: 'Tới gần chiếc đèn cũ và bia đá.', pickup: 'Gặp Lumo rồi nhận chiếc đèn bằng E.', light: 'Bật đèn bằng F để đọc bia đá.',
        tablet: 'Đứng cạnh bia và đọc dòng chữ.', pulse: 'Bật đèn rồi dùng SPACE để tìm dấu chân.',
        ring: 'Đứng trong vòng đá và giữ đèn bật.', exit: 'Cổng đã mở. Đi tới lối đi và nhấn E.',
      };
      objective = objectives[step];
      status = `Bia: ${this.progress.flags['l0-tablet-read'] ? 'đã đọc' : 'chưa đọc'} · Dấu chân: ${this.progress.flags['l0-footprints-found'] ? 'đã thấy' : 'chưa thấy'} · Cổng: ${this.progress.flags['l0-gate-open'] ? 'mở' : 'đóng'}`;
      lumo = 'NHINH + LUMO';
    } else if (index === 1) {
      const count = this.value('rune-sequence');
      const stage = this.getWoodsTutorialStage();
      this.updateWoodsTutorialCue(stage);
      const objectives: Record<WoodsTutorialStage, string> = {
        exit: 'Cổng đã mở. Đến bậc thang và nhấn E để xuống Thư viện.',
        sequence: `Chuỗi cổ tự: ${count}/3. Soi bia kế tiếp rồi nhấn E khi nét còn sáng.`,
        poem: 'Mẩu thơ ngay trước mặt. Đọc bằng E.',
        observe: 'Theo lối vào khoảng đất trống. Dùng SPACE để soi ba bia.',
      };
      objective = objectives[stage];
      status = `Cổ tự: ${count}/3 · Bài thơ: ${this.progress.flags['l1-poem-read'] ? 'đã đọc' : 'chưa đọc'} · Cổng: ${this.progress.flags['l1-open'] ? 'mở' : 'đóng'} · J sổ tay`;
      lumo = 'NHINH + LUMO';
    } else if (index === 2 && this.libraryLevel) {
      objective = this.libraryLevel.getObjectiveText();
      status = this.libraryLevel.getStatusText();
      lumo = 'NHINH + LUMO';
    } else if (index === 6 && this.gardenLevel) {
      objective = this.gardenLevel.getObjectiveText();
      status = this.gardenLevel.getStatusText();
      lumo = 'LUMO · đi cùng Nhinh';
    }
    // Level names and chapter tags stay in English everywhere; only the body copy is Vietnamese.
    this.hud.setTitle(index === 5 ? '06 · Ngọn Tháp Không Ngủ' : `${padded}  ${level.title}   ·   ${level.chapter}`);
    this.hud.setObjective(objective);
    this.hud.setStatus(status);
    this.hud.setLumo(lumo);
    this.hud.setKeys({
      move: true,
      run: true,
      interact: true,
      lantern: this.progress.lanternPickedUp,
      pulse: PULSE_LEVELS.includes(index) && this.lantern.lanternInHand && this.lantern.lanternOn
        && (index !== 0 || this.progress.flags['l0-tablet-read'] === true),
      journal: true,
      hint: true,
      pause: true,
    });
  }
}
