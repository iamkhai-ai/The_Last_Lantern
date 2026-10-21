import Phaser from 'phaser';
import { SoundSystem } from '../systems/SoundSystem';
import { getGardenArtKey, getSharedMechanismKey, getShadowArtKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import {
  GARDEN_ACTOR, GARDEN_BAR_BEAM, GARDEN_BAR_BEAM_ROWS, GARDEN_BAR_POSTS, GARDEN_BAR_SPRITE, GARDEN_BRIDGE, GARDEN_SHADOW_PATH, GARDEN_ICONS, GARDEN_MODULES, GARDEN_SIDE_PATH, GARDEN_SPANS,
  GARDEN_SPAWN, GARDEN_STANDS, GARDEN_STATIC_SOLIDS, GARDEN_WATER, NO_HELD_SPANS, barRaised, bridgeWalkable,
  crossingSideFor, crossedToFarBank, effectiveLight, gardenActorBody, gardenCompletionBlock, gardenDrainEnabled,
  gardenExitReady, gardenHandleEnabled, gardenLatchEastEnabled, gardenLatchWestEnabled, gardenPropDepth, inGateCorridor,
  isGardenPositionSafe, nearestSafeGardenSpawn, practiceLessonArmed, practiceLessonDue, onGardenBridge, readGardenState, rectsOverlap, rootsDeployed,
  sanitizeGardenState, sidePathOpen, sunOpen, updateHeldSpans,
  type GardenArtVariant, type GardenHeldSpans, type GardenModuleSpec, type GardenPoint, type GardenSpanId, type GardenState,
} from '../data/sleepingGardenLayout';

export interface SleepingGardenLevelOptions {
  scene: Phaser.Scene;
  progress: CampaignProgress;
  player: Player;
  lumo: Lumo;
  interactions: InteractionSystem;
  lantern: LanternSystem;
  save: () => void;
  say: (lines: DialogueLine[], onComplete?: () => void) => void;
  nextLevel: (lines: DialogueLine[]) => void;
  canStartStory: () => boolean;
  /** True while the pause menu is open: the silhouette freezes, the ending hand-off waits. */
  isPaused: () => boolean;
}

// Scenario §2 (source of truth): the opening poses the mystery and points at the shutter,
// without handing over the light/dark rule that the practice pots are there to teach.
const INTRO: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Hoa ở đây vẫn nở. Tôi tưởng vậy là tốt.' },
  { speaker: 'Nhinh', text: 'Nhưng cây non dưới này không có lá mới.' },
  { speaker: 'Lumo', text: 'Nước đã về rồi mà.' },
  { speaker: 'Nhinh', text: 'Ánh từ bể kia vẫn chiếu xuống. Thử che nó lại xem.' },
];
const CANOPY_BEAT: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Tối đi thật.' },
  { speaker: 'Nhinh', text: 'Nghe kìa.' },
];
const PRACTICE_OBSERVED: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Hoa cần sáng để nâng thanh. Rễ chỉ vươn khi đèn tắt.' },
  { speaker: 'Lumo', text: 'Ánh của tôi không làm rễ co lại.' },
  { speaker: 'Nhinh', text: 'Cậu có thể đi cùng tôi lúc tắt đèn.' },
];
const RETRACT_CUE: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Mở được cửa thì lại mất cầu.' },
  { speaker: 'Lumo', text: 'Tay chốt sau cửa có giữ được thanh chắn không?' },
];
const HELD_REJOINED: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Cửa vẫn mở. Rễ cũng đã nối lại rồi.' },
  { speaker: 'Nhinh', text: 'Giờ chúng không cần cùng phản ứng theo chiếc đèn nữa.' },
];
const NURSERY_SCENE: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Nó vừa mọc thêm một chiếc lá.' },
  { speaker: 'Nhinh', text: 'Có nước. Có lúc nghỉ. Có lẽ nó đã đợi cả hai.' },
  { speaker: 'Lumo', text: 'Tôi cứ nghĩ nếu làm mọi nơi sáng hơn…' },
  { speaker: 'Nhinh', text: 'Cậu muốn giúp rừng tỉnh dậy.' },
  { speaker: 'Lumo', text: 'Nhưng có những thứ cần được ngủ.' },
  { speaker: 'Nhinh', text: 'Mình biết thêm được một điều rồi.' },
  { speaker: 'Lumo', text: 'Cứ ngủ đi. Chúng tôi sẽ giữ đường nước mở.' },
];
const SIDE_LATCHED: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Chốt đá đã gài. Lối đá phụ mở rồi.' },
  { speaker: 'Lumo', text: 'Lối về này không cần ánh sáng. Cây non có nước và có lúc nghỉ.' },
];
const SPROUT_BEFORE: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Mầm cây vẫn khép. Nó cần nước và một khoảng tối để nghỉ.' }];
const SPROUT_AFTER: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Lá mới mềm hơn những chiếc cũ.' },
  { speaker: 'Lumo', text: 'Ngày mai chắc nó sẽ lớn thêm. Khi ngày mai trở lại.' },
];
// Scenario §7 verbatim. The silhouette is only seen, never named: it does not reveal who the Shadow is.
const ENDING: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Có ai ở đó.' },
  { speaker: 'Nhinh', text: 'Người ấy vừa che ánh sáng khỏi luống cây.' },
  { speaker: 'Lumo', text: 'Giống việc mình vừa làm?' },
  { speaker: 'Nhinh', text: 'Mình tới hỏi xem.' },
];

export class SleepingGardenLevel {
  private scene: Phaser.Scene;
  private progress: CampaignProgress;
  private player: Player;
  private lumo: Lumo;
  private interactions: InteractionSystem;
  private lantern: LanternSystem;
  private save: () => void;
  private say: SleepingGardenLevelOptions['say'];
  private nextLevel: SleepingGardenLevelOptions['nextLevel'];
  private canStartStory: SleepingGardenLevelOptions['canStartStory'];
  private isPaused: SleepingGardenLevelOptions['isPaused'];
  private destroyed = false;
  private lastSafe: GardenPoint = { ...GARDEN_SPAWN };

  private state: GardenState = sanitizeGardenState({ canopyShut: false, sunLatched: false, waterFlowing: false, returnLatched: false, lumoRealized: false, bridgeCrossed: false, crossingSide: null });
  private held: GardenHeldSpans = { ...NO_HELD_SPANS };
  private lastLanternOn = true;
  private traversalSide: 'west' | 'east' | null = null;

  private objects: Phaser.GameObjects.GameObject[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private barBeamBody?: Phaser.Physics.Arcade.StaticBody;
  private sidePlankBody?: Phaser.Physics.Arcade.StaticBody;
  private spanBodies = new Map<GardenSpanId, Phaser.Physics.Arcade.StaticBody>();
  private images = new Map<string, Phaser.GameObjects.Image>();
  private icons = new Map<'sunMain' | 'moonMain' | 'sunPractice' | 'moonPractice', Phaser.GameObjects.Image>();
  private protected: Phaser.GameObjects.GameObject[] = [];
  private pendingBeats: Array<{ lines: DialogueLine[]; onComplete?: () => void }> = [];
  private hintStage = '';
  private hintIndex = 0;
  private lessonPending = false;
  private shadowBeatPlaying = false;
  private shadowBeatTween?: Phaser.Tweens.Tween;
  private shadowBeatTimer?: Phaser.Time.TimerEvent;
  private shadowBeatFrozen = false;
  private shadowEndingPending = false;

  constructor(o: SleepingGardenLevelOptions) {
    this.scene = o.scene; this.progress = o.progress; this.player = o.player; this.lumo = o.lumo;
    this.interactions = o.interactions; this.lantern = o.lantern; this.save = o.save;
    this.say = o.say; this.nextLevel = o.nextLevel; this.canStartStory = o.canStartStory; this.isPaused = o.isPaused;
    this.lastLanternOn = this.lantern.lanternOn;
  }

  private get lanternOn(): boolean { return this.lantern.lanternOn; }

  public build(): void {
    this.readState();
    SoundSystem.startAmbient(this.state.waterFlowing ? 'garden-restored' : 'garden');
    this.player.setFootPlacement(GARDEN_ACTOR.feetY, 21 + GARDEN_ACTOR.bodyY, 18 + GARDEN_ACTOR.bodyX, GARDEN_ACTOR.bodyWidth, GARDEN_ACTOR.bodyHeight);
    const saved = this.progress.counters['player-level'] === 6 && Number.isFinite(this.progress.counters['player-x']) && Number.isFinite(this.progress.counters['player-y'])
      ? { x: this.progress.counters['player-x'], y: this.progress.counters['player-y'] }
      : undefined;
    const spawn = nearestSafeGardenSpawn(this.state, this.lanternOn, this.held, saved);
    this.player.setPosition(spawn.x, spawn.y);
    (this.player.sprite.body as Phaser.Physics.Arcade.Body | null)?.updateFromGameObject();
    this.lastSafe = { x: spawn.x, y: spawn.y };
    const savedLumoX = this.progress.counters['lumo-x'];
    const savedLumoY = this.progress.counters['lumo-y'];
    this.lumo.sprite.setPosition(
      Number.isFinite(savedLumoX) ? Phaser.Math.Clamp(savedLumoX as number, 36, 604) : spawn.x - 22,
      Number.isFinite(savedLumoY) ? Phaser.Math.Clamp(savedLumoY as number, 60, 288) : spawn.y - 18,
    );
    this.lumo.setVisible(true);
    this.drawStatic();
    this.createSolids();
    this.registerInteractions();
    this.updateLightState();
    this.refresh();
  }

  public startOpeningDialogue(): void { this.say(INTRO); }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shadowEndingPending = false;
    // Stop the silhouette chain so no stale tween or timer callback runs after the level is gone.
    this.shadowBeatTween?.stop();
    this.shadowBeatTween = undefined;
    this.shadowBeatTimer?.remove(false);
    this.shadowBeatTimer = undefined;
    this.lantern.isDawnMode = false;
    for (const collider of this.colliders) if (collider.active) collider.destroy();
    for (const object of this.objects) if (object.active) object.destroy();
    for (const object of this.protected) if (object.active) object.destroy();
    this.colliders = []; this.objects = []; this.protected = [];
    this.spanBodies.clear();
    this.images.clear(); this.icons.clear();
    this.interactions.clear();
  }

  public update(_dt: number): void {
    if (this.destroyed) return;
    this.readState();
    this.flushPendingBeats();
    this.holdShadowBeat(this.isPaused());
    this.flushShadowEnding();
    this.updateLightState();
    this.tryPracticeLesson();
    this.updateHeldAndTraversal();
    this.ejectFromBarBeam();
    this.rememberSafePosition();
    this.refresh();
  }

  public getProtectedPromptBounds(): PromptRect[] {
    return this.protected
      .filter((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.active && object.visible)
      .map((object) => object.getBounds());
  }

  public getObjectiveText(): string {
    const state = this.state;
    if (!state.canopyShut) return 'Tới tay màn che trong khe tường phía tây bắc và nhấn E để đóng màn che bể tích quang.';
    if (!state.sunLatched) {
      if (this.progress.flags['l6-practice-observed'] !== true) return 'Hai chậu thử ở bãi cỏ phía nam cho thấy cây phản ứng thế nào với đèn. Bật hoặc tắt đèn (F) khi đứng gần chúng.';
      return this.lanternOn
        ? 'Thanh chắn đang nâng. Vào khe tường phía tây và nhấn E ở tay chốt để giữ nó.'
        : 'Bật đèn (F) cho Hoa Nhật mở, nâng thanh chắn, rồi gài chốt trong khe tường.';
    }
    if (!state.waterFlowing) {
      if (this.lanternOn) return 'Tắt đèn (F) cho Rễ Nguyệt bắc cầu qua mương, rồi sang vườn ươm.';
      return this.player.x > 300
        ? 'Nhấn E ở cống vườn ươm để mở đường nước.'
        : 'Bóng tối đang giữ. Qua cầu rễ giữa vườn tới vườn ươm và mở cống.';
    }
    if (!state.returnLatched) return 'Gài chốt lối đá phụ cạnh cống để mở lối về không cần ánh sáng.';
    if (!state.lumoRealized) return 'Nói chuyện với Lumo bên mầm cây trong vườn ươm (nhấn E ở mầm cây).';
    return 'Tới cổng điện thờ ở góc đông bắc và nhấn E.';
  }

  public getStatusText(): string {
    const state = this.state;
    const light = effectiveLight(state, this.lanternOn);
    return `Màn che: ${state.canopyShut ? 'đóng' : 'mở'} · Hoa Nhật: ${sunOpen(state, this.lanternOn) ? 'nở' : 'gập'} · Chốt: ${state.sunLatched ? 'giữ' : 'chưa'} · Nước: ${state.waterFlowing ? 'chảy' : 'chưa'} · Lối phụ: ${state.returnLatched ? 'mở' : 'kín'} · ${state.canopyShut ? (light ? 'có sáng' : 'trong tối') : 'bể còn sáng'}`;
  }

  public showHint(): void {
    const state = this.state;
    const stage = !state.canopyShut ? 'canopy'
      : !state.sunLatched || !state.waterFlowing ? 'main'
        : !state.returnLatched ? 'side'
          : !state.lumoRealized ? 'story'
            : 'exit';
    if (stage !== this.hintStage) { this.hintStage = stage; this.hintIndex = 0; }
    // Scenario 07 §6: the main puzzle (sun, latch, dark, cross) is one stage with one verbatim Mức 1-3 ladder,
    // so lantern toggles do not restart it. Canopy and post-drain stages keep stage-specific guidance.
    const hints: Record<string, string[]> = {
      canopy: [
        'Cả khu vườn đang được bể tích quang nuôi sáng.',
        'Có một tay màn che ở khe tường phía tây bắc, cạnh bể.',
        'Đi vòng lên phía bắc, vào khe tường và nhấn E ở tay màn che.',
      ],
      main: [
        'Hai chậu thử phản ứng trái ngược. Sau thanh chắn có một tay chốt.',
        'Giữ thanh chắn bằng chốt, rồi tắt đèn để rễ làm cầu. Một phần đường phải tự giữ trước khi phần kia xuất hiện.',
        'Bật đèn, qua thanh chắn và gài chốt. Tắt đèn, qua cầu rễ, mở cống rồi gài lối đá phụ.',
      ],
      side: [
        'Nước đã chảy tới vườn ươm. Cổng điện thờ nằm ở góc đông bắc.',
        'Có một chốt đá ở lối đá phụ cạnh cống, phía đông nam vườn ươm.',
        'Nhấn E ở chốt để mở lối về không cần ánh sáng.',
      ],
      story: [
        'Lối về đã được giữ. Lumo có điều muốn nói.',
        'Lumo đang ở gần mầm cây trong vườn ươm.',
        'Nhấn E ở mầm cây để nghe Lumo.',
      ],
      exit: [
        'Cả vườn đã được chăm lại. Cổng điện thờ nằm ở góc đông bắc.',
        'Đi theo vườn ươm lên bậc đá phía đông rồi rẽ lên walkway.',
        'Tới cổng và nhấn E.',
      ],
    };
    const choices = hints[stage];
    const message = choices[Math.min(this.hintIndex, choices.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, choices.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  public showJournal(): void {
    const state = this.state;
    const notes: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Khu vườn ngủ dưới ánh của bể tích quang.' }];
    if (state.canopyShut) notes.push({ speaker: 'Nhinh', text: 'Khi màn che đóng, chỉ còn đèn của mình đánh thức được cây cối.' });
    if (state.sunLatched) notes.push({ speaker: 'Lumo', text: 'Hoa Nhật nở khi có sáng và nâng thanh chắn. Chốt đá giữ được nó cả khi tắt đèn.' });
    if (state.waterFlowing) notes.push({ speaker: 'Nhinh', text: 'Rễ Nguyệt vươn khi tối và bắc thành cầu qua mương.' });
    if (state.returnLatched) notes.push({ speaker: 'Nhinh', text: 'Vườn ươm cần nước rồi cần một khoảng tối để nghỉ. Lối đá phụ là lối về không cần sáng.' });
    if (state.lumoRealized) notes.push({ speaker: 'Lumo', text: 'Không phải chỗ nào cũng cần sáng hơn. Có nơi cần được ngủ.' });
    if (notes.length === 1) notes.push({ speaker: 'Nhinh', text: 'Chưa ghi thêm manh mối nào.' });
    this.say(notes);
  }

  private readState(): void {
    const state = readGardenState(this.progress.flags);
    this.state = state;
    if (state.canopyShut) this.progress.flags['l6-canopy-shut'] = true;
    if (state.sunLatched) { this.progress.flags['l6-sun-latched'] = true; this.progress.flags['l6-sun-open'] = true; this.progress.flags['l6-moon-open'] = true; }
    if (state.waterFlowing) this.progress.flags['l6-water-flowing'] = true;
    if (state.returnLatched) { this.progress.flags['l6-return-latched'] = true; this.progress.flags['l6-bridge-crossed'] = true; }
    if (state.lumoRealized) this.progress.flags['l6-lumo-realized'] = true;
    if (state.bridgeCrossed) this.progress.flags['l6-bridge-crossed'] = true;
  }

  private flushPendingBeats(): void {
    if (!this.pendingBeats.length || !this.canStartStory()) return;
    const next = this.pendingBeats.shift();
    if (next) this.say(next.lines, next.onComplete);
  }

  /** The ending hand-off uses the same gate as every story beat, so it never overwrites a dialogue or plays under the pause menu. */
  private flushShadowEnding(): void {
    if (!this.shadowEndingPending || this.destroyed || !this.canStartStory()) return;
    this.shadowEndingPending = false;
    this.nextLevel(ENDING);
  }

  /** Freezes the running silhouette tween or timer while paused. Idempotent per frame. */
  private holdShadowBeat(frozen: boolean): void {
    if (frozen === this.shadowBeatFrozen) return;
    this.shadowBeatFrozen = frozen;
    if (frozen) {
      this.shadowBeatTween?.pause();
      if (this.shadowBeatTimer) this.shadowBeatTimer.paused = true;
    } else {
      this.shadowBeatTween?.resume();
      if (this.shadowBeatTimer) this.shadowBeatTimer.paused = false;
    }
  }

  private queueBeat(lines: DialogueLine[], onComplete?: () => void): void {
    this.pendingBeats.push({ lines, onComplete });
    this.flushPendingBeats();
  }

  private updateLightState(): void {
    this.lantern.isDawnMode = !this.state.canopyShut;
    const lanternOn = this.lanternOn;
    if (lanternOn !== this.lastLanternOn) {
      this.lastLanternOn = lanternOn;
      this.pulsePlants();
      // The practice lesson answers the first light change in EITHER direction once the canopy is shut. If
      // the pots are not readable from where the player stands, it waits until they walk back to the lawn.
      if (practiceLessonArmed(this.state.canopyShut, this.progress.flags['l6-practice-observed'] === true)) this.lessonPending = true;
      if (lanternOn && !this.state.waterFlowing && this.progress.flags['l6-retract-cue'] !== true) {
        const center = { x: this.player.x, y: this.player.y };
        if (rectsOverlap(gardenActorBody(center), GARDEN_BRIDGE)) {
          this.progress.flags['l6-retract-cue'] = true;
          this.save();
          this.queueBeat(RETRACT_CUE);
        }
      }
      if (!lanternOn && this.state.sunLatched && !this.state.waterFlowing && !this.state.lumoRealized
        && this.progress.flags['l6-held-beat'] !== true
        && !onGardenBridge({ x: this.player.x, y: this.player.y })) {
        this.progress.flags['l6-held-beat'] = true;
        this.save();
        this.queueBeat(HELD_REJOINED);
      }
    }
  }

  private tryPracticeLesson(): void {
    if (!this.lessonPending) return;
    const observed = this.progress.flags['l6-practice-observed'] === true;
    if (!practiceLessonArmed(this.state.canopyShut, observed)) { this.lessonPending = false; return; }
    if (!practiceLessonDue(this.lessonPending, this.state.canopyShut, observed, { x: this.player.x, y: this.player.y })) return;
    this.lessonPending = false;
    this.progress.flags['l6-practice-observed'] = true;
    this.save();
    this.queueBeat(PRACTICE_OBSERVED);
  }

  private updateHeldAndTraversal(): void {
    const center = { x: this.player.x, y: this.player.y };
    this.held = updateHeldSpans(this.held, this.state, this.lanternOn, gardenActorBody(center));
    const onBridge = onGardenBridge(center);
    if (onBridge && !this.traversalSide) {
      this.traversalSide = crossingSideFor(center);
      this.progress.flags['l6-crossing-side'] = this.traversalSide;
      this.save();
    }
    if (!onBridge && this.traversalSide) {
      const far = crossedToFarBank(this.traversalSide, center);
      if (far && !this.state.bridgeCrossed) {
        this.state.bridgeCrossed = true;
        this.progress.flags['l6-bridge-crossed'] = true;
        this.save();
      }
      this.traversalSide = null;
      delete this.progress.flags['l6-crossing-side'];
      this.save();
    }
  }

  private ejectFromBarBeam(): void {
    if (barRaised(this.state, this.lanternOn)) return;
    const center = { x: this.player.x, y: this.player.y };
    if (!rectsOverlap(gardenActorBody(center), GARDEN_BAR_BEAM)) return;
    const bodyCenterY = center.y + GARDEN_ACTOR.bodyY + GARDEN_ACTOR.bodyHeight / 2;
    const beamCenterY = GARDEN_BAR_BEAM.y + GARDEN_BAR_BEAM.height / 2;
    const preferNorth = bodyCenterY < beamCenterY;
    const north: GardenPoint = { x: Phaser.Math.Clamp(center.x, 112, 152), y: GARDEN_BAR_BEAM.y - 24 };
    const south: GardenPoint = { x: Phaser.Math.Clamp(center.x, 115, 186), y: GARDEN_BAR_BEAM.y + GARDEN_BAR_BEAM.height + 8 };
    const order = preferNorth ? [north, south] : [south, north];
    for (const target of order) {
      if (isGardenPositionSafe(this.state, this.lanternOn, this.held, target)) {
        this.player.setPosition(target.x, target.y);
        (this.player.sprite.body as Phaser.Physics.Arcade.Body | null)?.updateFromGameObject();
        return;
      }
    }
  }

  private rememberSafePosition(): void {
    const center = { x: this.player.x, y: this.player.y };
    if (isGardenPositionSafe(this.state, this.lanternOn, this.held, center)) this.lastSafe = center;
  }

  private pulsePlants(): void {
    const targets = [
      this.images.get('sun-main'), this.images.get('moon-main'),
      this.images.get('practice-sun'), this.images.get('practice-moon'),
    ].filter((image): image is Phaser.GameObjects.Image => Boolean(image && image.active));
    if (!targets.length) return;
    this.scene.tweens.add({ targets, scaleX: 1.12, scaleY: 1.12, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
  }

  private artKey(variant: GardenArtVariant): string | null {
    return getGardenArtKey(variant.file, variant.shared);
  }

  private placeFor(spec: GardenModuleSpec, rect: { x: number; y: number; width: number; height: number }, variantKey?: string): { x: number; y: number; origin: [number, number] } {
    if (spec.origin === 'topleft') return { x: rect.x, y: rect.y, origin: [0, 0] };
    if (spec.origin === 'bottom') {
      // V2's 112px extended frame keeps its original 48px pot at local x52.
      // The practice module has no extendedRect: offset only the new art so its
      // pot stays at world x132. Legacy fallback retains its previous placement.
      const practiceOffset = spec.id === 'practice-moon' && variantKey === 'extended'
        && this.artKey(spec.variants.extended)?.startsWith('garden_v2_') ? -20 : 0;
      return { x: rect.x + rect.width / 2 + practiceOffset, y: rect.y + rect.height, origin: [0.5, 1] };
    }
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, origin: [0.5, 0.5] };
  }

  private addModule(spec: GardenModuleSpec, variantKey: string): Phaser.GameObjects.Image | null {
    const variant = spec.variants[variantKey];
    if (!variant) return null;
    const key = this.artKey(variant);
    if (!key) return null;
    const rect = variantKey === 'extended' && spec.extendedRect ? spec.extendedRect : spec.rect;
    const place = this.placeFor(spec, rect, variantKey);
    const depth = spec.floorArt ? 4 : spec.overhead ? 70 : gardenPropDepth(spec.rect.y + spec.rect.height);
    const image = this.scene.add.image(place.x, place.y, key).setOrigin(place.origin[0], place.origin[1]).setDepth(depth);
    image.setData('garden-id', spec.id);
    this.objects.push(image);
    this.images.set(spec.id, image);
    return image;
  }

  private setModuleVariant(spec: GardenModuleSpec, variantKey: string): void {
    const image = this.images.get(spec.id);
    const variant = spec.variants[variantKey];
    if (!image || !variant) return;
    const key = this.artKey(variant);
    if (!key) return;
    if (image.texture.key !== key) image.setTexture(key);
    const rect = variantKey === 'extended' && spec.extendedRect ? spec.extendedRect : spec.rect;
    const place = this.placeFor(spec, rect, variantKey);
    image.setPosition(place.x, place.y);
    image.setVisible(true);
  }

  private drawStatic(): void {
    for (const spec of GARDEN_MODULES) {
      if (spec.id === 'bridge') continue;
      this.addModule(spec, Object.keys(spec.variants)[0]);
    }
    const bridgeSpec = this.module('bridge');
    const bridgeKey = this.artKey(bridgeSpec.variants.off);
    for (const span of ['s1', 's2'] as const) {
      if (!bridgeKey) break;
      const place = this.placeFor(bridgeSpec, GARDEN_SPANS[span]);
      const image = this.scene.add.image(place.x, place.y, bridgeKey).setOrigin(place.origin[0], place.origin[1]).setDepth(4);
      image.setData('garden-id', `bridge-${span}`);
      this.objects.push(image);
      this.images.set(`bridge-${span}`, image);
    }
    // Retracted spans keep their curled roots and also show the bank edges (shared root-bridge-missing), so the
    // 92px gap reads as a gap rather than as an invisible wall.
    const missingKey = getSharedMechanismKey('root-bridge-missing');
    for (const span of ['s1', 's2'] as const) {
      if (!missingKey) break;
      const place = this.placeFor(bridgeSpec, GARDEN_SPANS[span]);
      const image = this.scene.add.image(place.x, place.y, missingKey).setOrigin(place.origin[0], place.origin[1]).setDepth(3.9);
      image.setData('garden-id', `bridge-missing-${span}`);
      this.objects.push(image);
      this.images.set(`bridge-missing-${span}`, image);
    }
    // Gate-bar posts sort with the world by their feet; only the beam is overhead while raised.
    const barSpec = this.module('gate-bar');
    const barKey = this.artKey(barSpec.variants.raised);
    for (const post of GARDEN_BAR_POSTS) {
      if (!barKey) break;
      const image = this.scene.add.image(GARDEN_BAR_SPRITE.x, GARDEN_BAR_SPRITE.y, barKey).setOrigin(0, 0)
        .setCrop(post.crop.x, post.crop.y, post.crop.width, post.crop.height)
        .setDepth(gardenPropDepth(GARDEN_BAR_SPRITE.y + GARDEN_BAR_SPRITE.height)).setVisible(false);
      image.setData('garden-id', `gate-post-${post.id}`);
      this.objects.push(image);
      this.images.set(`gate-post-${post.id}`, image);
    }
    for (const id of ['handle', 'latch-west', 'latch-east', 'drain', 'sprout', 'gate-bar']) {
      const image = this.images.get(id);
      if (image) this.protected.push(image);
    }
    const waterline = this.scene.add.graphics().setDepth(5);
    waterline.lineStyle(2, 0x7fb8d8, 0.75);
    waterline.lineBetween(186, 306, 202, 306);
    waterline.lineBetween(208, 306, 224, 306);
    waterline.lineStyle(1, 0xbfe1ef, 0.9);
    waterline.lineBetween(202, 304, 208, 308);
    this.objects.push(waterline);
    const iconHosts: Array<['sunMain' | 'moonMain' | 'sunPractice' | 'moonPractice', string]> = [
      ['sunMain', 'sun-main'],
      ['moonMain', 'moon-main'],
      ['sunPractice', 'practice-sun'],
      ['moonPractice', 'practice-moon'],
    ];
    const iconKey = this.artKey(GARDEN_ICONS.sunOpen);
    for (const [id, moduleId] of iconHosts) {
      const icon = this.module(moduleId).icon;
      if (!icon || !iconKey) continue;
      const image = this.scene.add.image(icon.x, icon.y, iconKey).setDepth(6);
      this.objects.push(image);
      this.icons.set(id, image);
    }
  }

  private createSolids(): void {
    const makeBody = (x: number, y: number, width: number, height: number): Phaser.Physics.Arcade.StaticBody => {
      const rect = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0, 0).setVisible(false);
      this.scene.physics.add.existing(rect, true);
      this.objects.push(rect);
      this.colliders.push(this.scene.physics.add.collider(this.player.sprite, rect));
      return rect.body as Phaser.Physics.Arcade.StaticBody;
    };
    for (const solid of GARDEN_STATIC_SOLIDS) makeBody(solid.rect.x, solid.rect.y, solid.rect.width, solid.rect.height);
    for (const rect of GARDEN_WATER) makeBody(rect.x, rect.y, rect.width, rect.height);
    this.barBeamBody = makeBody(GARDEN_BAR_BEAM.x, GARDEN_BAR_BEAM.y, GARDEN_BAR_BEAM.width, GARDEN_BAR_BEAM.height);
    this.sidePlankBody = makeBody(GARDEN_SIDE_PATH.x, GARDEN_SIDE_PATH.y, GARDEN_SIDE_PATH.width, GARDEN_SIDE_PATH.height);
    this.spanBodies.set('s1', makeBody(GARDEN_SPANS.s1.x, GARDEN_SPANS.s1.y, GARDEN_SPANS.s1.width, GARDEN_SPANS.s1.height));
    this.spanBodies.set('s2', makeBody(GARDEN_SPANS.s2.x, GARDEN_SPANS.s2.y, GARDEN_SPANS.s2.width, GARDEN_SPANS.s2.height));
  }

  private registerInteractions(): void {
    const reg = (config: Parameters<InteractionSystem['register']>[0]): void => this.interactions.register(config);
    reg({
      id: 'l6-handle', x: GARDEN_STANDS.handle.x, y: GARDEN_STANDS.handle.y, radius: GARDEN_STANDS.handle.radius,
      getPromptBounds: () => this.images.get('handle')?.getBounds() ?? null,
      getPrompt: () => this.canPullHandle() ? 'E · Kéo màn che bể tích quang' : null,
      isEnabled: () => this.canPullHandle(),
      onInteract: () => this.pullHandle(),
    });
    reg({
      id: 'l6-latch-west', x: GARDEN_STANDS.latchWest.x, y: GARDEN_STANDS.latchWest.y, radius: GARDEN_STANDS.latchWest.radius,
      getPromptBounds: () => this.images.get('latch-west')?.getBounds() ?? null,
      getPrompt: () => this.canLatchWest() ? 'E · Gài chốt thanh chắn' : this.canInspectLatchWest() ? 'E · Xem chốt đá (chưa gài được)' : null,
      isEnabled: () => this.canLatchWest() || this.canInspectLatchWest(),
      onInteract: () => { if (this.canLatchWest()) this.latchWest(); else this.say([{ speaker: 'Nhinh', text: 'Thanh chắn đang hạ nên chốt chưa khớp. Bật đèn (F) cho Hoa Nhật nâng nó lên, rồi gài chốt.' }]); },
    });
    reg({
      id: 'l6-drain', x: GARDEN_STANDS.drain.x, y: GARDEN_STANDS.drain.y, radius: GARDEN_STANDS.drain.radius,
      getPromptBounds: () => this.images.get('drain')?.getBounds() ?? null,
      getPrompt: () => this.canOpenDrain() ? 'E · Mở cống vườn ươm' : null,
      isEnabled: () => this.canOpenDrain(),
      onInteract: () => this.openDrain(),
    });
    reg({
      id: 'l6-latch-east', x: GARDEN_STANDS.latchEast.x, y: GARDEN_STANDS.latchEast.y, radius: GARDEN_STANDS.latchEast.radius,
      getPromptBounds: () => this.images.get('latch-east')?.getBounds() ?? null,
      getPrompt: () => this.canLatchEast() ? 'E · Gài chốt lối đá phụ' : this.canInspectLatchEast() ? 'E · Xem chốt lối đá phụ (chưa gài được)' : null,
      isEnabled: () => this.canLatchEast() || this.canInspectLatchEast(),
      onInteract: () => { if (this.canLatchEast()) this.latchEast(); else this.say([{ speaker: 'Nhinh', text: 'Chốt này chỉ khớp khi nước đã chảy tới vườn ươm. Mở cống trước đã.' }]); },
    });
    reg({
      id: 'l6-sprout', x: GARDEN_STANDS.sprout.x, y: GARDEN_STANDS.sprout.y, radius: GARDEN_STANDS.sprout.radius,
      getPromptBounds: () => this.images.get('sprout')?.getBounds() ?? null,
      getPrompt: () => 'E · Ngắm mầm cây',
      isEnabled: () => true,
      onInteract: () => this.inspectSprout(),
    });
    reg({
      id: 'l6-exit', x: GARDEN_STANDS.exit.x, y: GARDEN_STANDS.exit.y, radius: GARDEN_STANDS.exit.radius,
      getPromptBounds: () => null,
      getPrompt: () => this.exitReady() ? 'E · Qua cổng điện thờ' : 'Cổng điện thờ đang khép · chăm khu vườn trước',
      isEnabled: () => true,
      onInteract: () => this.tryExit(),
    });
  }

  private canPullHandle(): boolean {
    if (!gardenHandleEnabled(this.state)) return false;
    return inGateCorridor({ x: this.player.x, y: this.player.y })
      && this.distanceTo(GARDEN_STANDS.handle.x, GARDEN_STANDS.handle.y) <= GARDEN_STANDS.handle.radius;
  }

  private canLatchWest(): boolean {
    return gardenLatchWestEnabled(this.state, this.lanternOn)
      && inGateCorridor({ x: this.player.x, y: this.player.y });
  }

  private canInspectLatchWest(): boolean {
    return this.state.canopyShut && !this.state.sunLatched && !gardenLatchWestEnabled(this.state, this.lanternOn)
      && inGateCorridor({ x: this.player.x, y: this.player.y });
  }

  private canInspectLatchEast(): boolean {
    return !this.state.waterFlowing;
  }

  private canOpenDrain(): boolean {
    return gardenDrainEnabled(this.state);
  }

  private canLatchEast(): boolean {
    return gardenLatchEastEnabled(this.state);
  }

  private exitReady(): boolean {
    return gardenExitReady(this.state);
  }

  private tryExit(): void {
    if (this.exitReady()) { this.playShadowBeat(); return; }
    const block = gardenCompletionBlock(this.state);
    const text = block === 'canopy' ? 'Cổng còn khép. Mình phải che bể tích quang trước đã.'
      : block === 'bar' ? 'Thanh chắn chưa được giữ. Cần gài chốt trước khi cổng mở.'
        : block === 'drain' ? 'Vườn ươm còn thiếu nước. Mở cống rồi quay lại.'
          : block === 'side' ? 'Chưa gài chốt lối đá phụ. Lối về cần được giữ.'
            : 'Lumo vẫn đang đợi bên mầm cây.';
    this.say([{ speaker: 'Nhinh', text }]);
  }

  /** Scenario §7: a silhouette crosses the light, stops by the seedlings and slips out of sight; then the four lines. */
  private playShadowBeat(): void {
    if (this.shadowBeatPlaying) return;
    this.shadowBeatPlaying = true;
    const walk = getShadowArtKey('walk-right');
    const shield = getShadowArtKey('shielding');
    if (!walk || !shield) { this.shadowEndingPending = true; return; }
    const path = GARDEN_SHADOW_PATH;
    const sprite = this.scene.add.image(path.appear.x, path.appear.y, walk).setOrigin(0.5, 1).setAlpha(0).setDepth(gardenPropDepth(path.appear.y));
    this.objects.push(sprite);
    // Every tween and timer of the chain is created through these helpers, so a pause that is already
    // in force also holds the new one, and holdShadowBeat() can reach whichever one is running.
    const tween = (config: Phaser.Types.Tweens.TweenBuilderConfig): void => {
      const running = this.scene.tweens.add(config);
      this.shadowBeatTween = running;
      // Defensive: a frozen tween cannot normally spawn the next one, so this only covers a pause landing mid-callback.
      if (this.shadowBeatFrozen) running.pause();
    };
    const wait = (delay: number, callback: () => void): void => {
      const timer = this.scene.time.delayedCall(delay, callback);
      this.shadowBeatTimer = timer;
      // Defensive: a frozen timer cannot normally spawn the next one, so this only covers a pause landing mid-callback.
      if (this.shadowBeatFrozen) timer.paused = true;
    };
    // The hand-off itself runs from update() (flushShadowEnding) once the story gate is open.
    const finish = (): void => {
      if (this.destroyed) return;
      if (sprite.active) sprite.destroy();
      this.shadowBeatTween = undefined;
      this.shadowEndingPending = true;
    };
    const follow = (points: GardenPoint[], index: number, done: () => void): void => {
      if (this.destroyed || !sprite.active) return;
      if (index >= points.length) { done(); return; }
      const to = points[index];
      const distance = Math.hypot(to.x - sprite.x, to.y - sprite.y);
      if (Math.abs(to.x - sprite.x) > 1) sprite.setFlipX(to.x < sprite.x);
      tween({
        targets: sprite, x: to.x, y: to.y, duration: Math.max(80, (distance / path.speed) * 1000),
        onUpdate: () => sprite.setDepth(gardenPropDepth(sprite.y)),
        onComplete: () => follow(points, index + 1, done),
      });
    };
    tween({
      targets: sprite, alpha: 1, duration: 400,
      onComplete: () => follow([...path.toSeedlings], 0, () => {
        sprite.setTexture(shield).setFlipX(true);
        wait(path.stopMs, () => {
          if (this.destroyed || !sprite.active) return;
          sprite.setTexture(walk);
          follow([...path.back], 0, () => {
            tween({ targets: sprite, alpha: 0, duration: 500, onComplete: finish });
          });
        });
      }),
    });
  }

  private distanceTo(x: number, y: number): number {
    return Math.hypot(this.player.x - x, this.player.y - y);
  }

  private pullHandle(): void {
    if (this.destroyed || this.state.canopyShut) return;
    this.state.canopyShut = true;
    this.progress.flags['l6-canopy-shut'] = true;
    this.held = { ...NO_HELD_SPANS };
    this.save();
    this.pulsePlants();
    SoundSystem.playMechanismLatch();
    this.say(CANOPY_BEAT, () => {
      if (!this.destroyed && !this.state.waterFlowing) SoundSystem.playEndingCue('cricket');
    });
  }

  private latchWest(): void {
    if (this.destroyed || this.state.sunLatched) return;
    this.state.sunLatched = true;
    this.progress.flags['l6-sun-latched'] = true;
    this.progress.flags['l6-sun-open'] = true;
    this.progress.flags['l6-moon-open'] = true;
    this.save();
    SoundSystem.playMechanismLatch();
    this.say([{ speaker: 'Nhinh', text: 'Chốt đá đã giữ thanh chắn.' }, { speaker: 'Lumo', text: 'Giờ bóng tối cũng không đóng được lối này.' }]);
  }

  private openDrain(): void {
    if (this.destroyed || this.state.waterFlowing) return;
    this.state.waterFlowing = true;
    this.progress.flags['l6-water-flowing'] = true;
    this.progress.flags['l6-moon-open'] = true;
    this.save();
    SoundSystem.playMechanismLatch();
    SoundSystem.playWaterRelease();
    SoundSystem.startAmbient('garden-restored');
    this.queueBeat(NURSERY_SCENE, () => {
      this.state.lumoRealized = true;
      this.progress.flags['l6-lumo-realized'] = true;
      this.save();
    });
  }

  private latchEast(): void {
    if (this.destroyed || this.state.returnLatched) return;
    this.state.returnLatched = true;
    this.progress.flags['l6-return-latched'] = true;
    this.progress.flags['l6-bridge-crossed'] = true;
    this.save();
    SoundSystem.playMechanismLatch();
    this.say(SIDE_LATCHED);
  }

  private inspectSprout(): void {
    // The "talk to Lumo by the sprout" objective row must be satisfiable from this stand, so a
    // post-water re-read also commits the realization if the queued nursery scene was missed.
    if (this.state.waterFlowing && !this.state.lumoRealized) {
      this.state.lumoRealized = true;
      this.progress.flags['l6-lumo-realized'] = true;
      this.save();
    }
    this.say(this.state.waterFlowing ? SPROUT_AFTER : SPROUT_BEFORE);
  }

  private refresh(): void {
    const state = this.state;
    const light = effectiveLight(state, this.lanternOn);
    this.setModuleVariant(this.module('reservoir'), state.canopyShut ? 'closed' : 'open');
    const overlay = this.images.get('reservoir-overlay');
    if (overlay) overlay.setVisible(state.canopyShut);
    this.setModuleVariant(this.module('handle'), state.canopyShut ? 'closed' : 'open');
    this.setModuleVariant(this.module('sun-main'), light ? 'open' : 'folded');
    this.setModuleVariant(this.module('practice-sun'), light ? 'open' : 'folded');
    this.setModuleVariant(this.module('moon-main'), light ? 'coiled' : 'extended');
    this.setModuleVariant(this.module('practice-moon'), light ? 'coiled' : 'extended');
    this.setModuleVariant(this.module('latch-west'), state.sunLatched ? 'latched' : 'unlatched');
    this.setModuleVariant(this.module('latch-east'), state.returnLatched ? 'latched' : 'unlatched');
    this.setModuleVariant(this.module('drain'), state.waterFlowing ? 'open' : 'closed');
    this.setModuleVariant(this.module('sprout'), state.waterFlowing ? 'after' : 'before');
    this.setModuleVariant(this.module('side-path'), state.returnLatched ? 'open' : 'closed');
    const barImage = this.images.get('gate-bar');
    if (barImage) {
      const spec = this.module('gate-bar');
      const variant = !barRaised(state, this.lanternOn) ? 'lowered' : state.sunLatched ? 'held' : 'raised';
      const key = this.artKey(spec.variants[variant]);
      if (key && barImage.texture.key !== key) barImage.setTexture(key);
      barImage.setDepth(variant === 'lowered' ? gardenPropDepth(spec.rect.y + spec.rect.height) : 70);
      if (variant === 'lowered') barImage.setCrop(); else barImage.setCrop(0, 0, GARDEN_BAR_SPRITE.width, GARDEN_BAR_BEAM_ROWS);
      for (const post of GARDEN_BAR_POSTS) {
        const postImage = this.images.get(`gate-post-${post.id}`);
        if (!postImage) continue;
        postImage.setVisible(variant !== 'lowered');
        if (key && postImage.texture.key !== key) postImage.setTexture(key);
        postImage.setCrop(post.crop.x, post.crop.y, post.crop.width, post.crop.height);
      }
    }
    const water = this.images.get('water');
    if (water) water.setVisible(state.waterFlowing);
    const teaching = this.images.get('teaching-bridge');
    if (teaching) teaching.setVisible(!light && state.canopyShut);
    const sunKey = this.artKey(light ? GARDEN_ICONS.sunOpen : GARDEN_ICONS.sunFolded);
    const moonKey = this.artKey(light ? GARDEN_ICONS.moonOpen : GARDEN_ICONS.moonClosed);
    for (const [id, icon] of this.icons) {
      const isSun = id === 'sunMain' || id === 'sunPractice';
      const key = isSun ? sunKey : moonKey;
      if (key && icon.active && icon.texture.key !== key) icon.setTexture(key);
      if (icon.active) icon.setVisible(true);
    }
    this.syncDynamicBodies();
  }

  private syncDynamicBodies(): void {
    const state = this.state;
    if (this.barBeamBody) this.barBeamBody.enable = !barRaised(state, this.lanternOn);
    if (this.sidePlankBody) this.sidePlankBody.enable = !sidePathOpen(state);
    const deployed = rootsDeployed(state, this.lanternOn);
    const spec = this.module('bridge');
    for (const span of ['s1', 's2'] as const) {
      const body = this.spanBodies.get(span);
      if (body) body.enable = !bridgeWalkable(span, state, this.lanternOn, this.held);
      const image = this.images.get(`bridge-${span}`);
      if (!image) continue;
      const variant = deployed ? 'on' : this.held[span] ? 'held' : 'off';
      const key = this.artKey(spec.variants[variant]);
      if (key && image.texture.key !== key) image.setTexture(key);
      this.images.get(`bridge-missing-${span}`)?.setVisible(variant === 'off');
    }
  }

  private module(id: string): GardenModuleSpec {
    const spec = GARDEN_MODULES.find((candidate) => candidate.id === id);
    if (!spec) throw new Error(`Missing garden module: ${id}`);
    return spec;
  }
}
