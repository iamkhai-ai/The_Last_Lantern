import Phaser from 'phaser';
import { getLevelArtKey, getSharedMechanismKey } from '../art/CampaignArt';
import { tr } from '../i18n/catalog.ts';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import {
  auditHeartStands, canReachHeartElement, deriveHeartPuzzle, getHeartElement, getHeartPrerequisiteFeedback, getHeartSolid,
  getHeartStage, heartArtCandidates, heartArtNativeSize, heartFinalActionAlreadyDone, heartFinalActionSource, heartSealPlateArt, HEART_BEAM_NODES, HEART_BLOCKERS, HEART_BODY, HEART_CONFIRM_ID, HEART_CORE, HEART_ELEMENTS,
  HEART_G0_ID, HEART_LANE_COLORS, HEART_MAT_ID, HEART_MOON_SHADOW, HEART_OVERLOAD_CHECKPOINT, HEART_PROPS,
  HEART_RING_LANES, HEART_SEAL_ID, HEART_SEAL_RADIUS, HEART_STATUE_BLOCKS_LEFT_EYE, HEART_STATUE_BLOCKS_RIGHT_EYE,
  HEART_STATUE_SHADOW, isHeartPositionSafe, nearestSafeHeartSpawn, normalizeHeartProgress,
  resolveHeartLumoMode, resolveHeartRestoreState, type HeartBranchId, type HeartFinalSource, type HeartElement, type HeartPoint, type HeartPuzzleState, type HeartStage,
} from '../data/heartOfElariaLayout';

export interface HeartOfElariaLevelOptions {
  scene: Phaser.Scene;
  progress: CampaignProgress;
  player: Player;
  lumo: Lumo;
  interactions: InteractionSystem;
  lantern: LanternSystem;
  save: () => void;
  say: (lines: DialogueLine[], onComplete?: () => void) => void;
  isDialogueLocked: () => boolean;
  isPaused: () => boolean;
  /** Drops the running dialogue and its queue; the final action uses it so no overload line plays after the ending starts. */
  stopDialogue: () => void;
  playLanternAction: (on: boolean) => void;
  finish: () => void;
}

/** Scenario §2 opening. */
const OPENING: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Trước đây tôi nghĩ chỉ cần đặt đủ tinh thể rồi thắp tất cả lên.' },
  { speaker: 'Nhinh', text: 'Giờ mình biết Cây Mẹ còn cần điều gì nữa.' },
  { speaker: 'Lumo', text: 'Nước, ký ức… và một đêm được đi hết.' },
  { speaker: 'Nhinh', text: 'Mình bắt đầu từ ba mạch rễ.' },
];

/** Scenario §2 after the three placements. */
const PLACED_LINES: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Các mạch đã nhận tinh thể. Nhưng chúng chưa nối thành vòng.' },
  { speaker: 'Lumo', text: 'Tôi thấy ấn của mình ở phía Hy Vọng. Cậu chỉnh đường sáng, tôi giữ phần đó.' },
];

/** Scenario §3 teaching exchange, shown once at the rule mat. */
const TEACH_LINES: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Các dấu giống những nơi mình vừa đi qua.' },
  { speaker: 'Lumo', text: 'Khu rừng đã cho mình học từng phần trước khi trở về đây.' },
];

/** Scenario §4 when all three branches hold at once. */
const STABLE_LINES: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Ba màu đã nối thành một vòng!' },
  { speaker: 'Nhinh', text: 'Tôi sẽ khóa đường rễ. Cậu giữ ở đó thêm một chút.' },
];

/** Scenario §4 when a branch stops holding. */
const DROPPED_LINES: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Có một mạch vừa ngừng. Tôi vẫn đang giữ ấn.' },
  { speaker: 'Nhinh', text: 'Đường sáng chung đã đổi. Tôi sẽ xem lại từ lăng kính.' },
];

/** Scenario §5 once the root clips hold the configuration. */
const LATCHED_LINES: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Rễ đã tự giữ rồi. Lumo, về đây.' },
  { speaker: 'Lumo', text: 'Cậu nghe không? Nó đang thở.' },
];

/** Scenario §5 while the lantern is carried back and the light is overloading. */
const OVERLOAD_LINES: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Đèn trên tay vẫn đang cấp thêm ánh sáng.' },
  { speaker: 'Lumo', text: 'Giống đêm ấy…' },
  { speaker: 'Nhinh', text: 'Cây Mẹ đã có đủ rồi.' },
];

const MAT_MODELS: readonly string[] = [
  'Mô hình gương: một mạch chỉ sáng khi tia từ bệ đèn đi đúng tới tinh thể.',
  'Mô hình chiếc ấn: màn Hy Vọng chỉ mở khi Lumo còn đang đứng giữ.',
  'Mô hình lõi Nguyệt: hai mắt Nhật ngoài phải sáng, còn lõi giữa phải nằm trong bóng tượng.',
  'Mô hình bộ chia: lăng kính gửi một nhánh sang Ký Ức và một nhánh sang Cân Bằng.',
];

const LANES_TOAST: DialogueLine[] = [
  { speaker: 'Hệ thống', text: 'Pulse làm các đường nối bị rêu che hiện ra. Thông tin đã được ghi vào sổ.' },
];

/** Scenario 10 §8 primary ladder, Mức 1-3 verbatim: the three-branch puzzle (source, seal, route, confirm) shares it. */
const PUZZLE_HINTS: string[] = [
  'Xem đường nối từ bệ và dấu sáng trên cả ba nhánh. Nhánh nào chưa giữ được trạng thái?',
  'Lăng kính phải cấp cả Ký Ức lẫn Cân Bằng. Tôi mở màn Hy Vọng; bóng tượng giữ lõi giữa tối.',
  'Gọi tôi tới ấn, hướng G0 vào lăng kính, chỉnh nhánh vàng tới tinh thể và nhánh tím qua tượng. Khi hai mắt ngoài sáng, lõi tối và ba rễ nối đều, xác nhận ở giữa.',
];

const PUZZLE_STAGES: readonly HeartStage[] = ['source', 'seal', 'route', 'confirm'];
/** The key that resets the H ladder: the puzzle stages share one key, so presses keep their order across them. */
const hintLadderOf = (stage: HeartStage): string => (PUZZLE_STAGES.includes(stage) ? 'puzzle' : stage);

const HINTS: Record<HeartStage, string[]> = {
  crystals: [
    'Ba hốc nằm quanh thân Cây Mẹ: bên trái, chính giữa và bên phải.',
    'Đứng trên từng hốc có biểu tượng tinh thể rồi nhấn E.',
    'Đặt Ký Ức vào hốc vàng, Hy Vọng vào hốc xanh, Cân Bằng vào hốc tím.',
  ],
  teach: [
    'Có một bàn rễ thấp cạnh bệ đèn ở phía tây.',
    'Nhấn E trên bàn rễ để xem lại từng mô hình quy tắc. SPACE gần đó sẽ soi các đường nối.',
    'Ba quy tắc: một mạch nhận ánh sáng, một ấn do Lumo giữ, hai mắt Nhật quanh một lõi Nguyệt cần bóng.',
  ],
  source: PUZZLE_HINTS,
  seal: PUZZLE_HINTS,
  route: PUZZLE_HINTS,
  confirm: PUZZLE_HINTS,
  retrieve: [
    'Cây Mẹ đã tự giữ mạch. Chiếc đèn không cần ở lại nữa.',
    'Bệ dẫn sáng vẫn giữ chiếc đèn ở góc tây.',
    'Đứng ở mép nam bệ và nhấn E để lấy lại đèn.',
  ],
  overload: [
    'Nhìn chiếc đèn và đường sáng còn nối từ tay cậu vào thân cây.',
    'Tinh thể đã tự nuôi mạch rễ. Ánh đèn đang làm nó nhận quá nhiều.',
    'Nhấn F để tự tay tắt đèn.',
  ],
  done: [
    'Đêm đã đi hết con đường của nó.',
    'Bình minh đang trở lại trên khu rừng.',
    'Nhấn E để đi tiếp đoạn kết.',
  ],
};

export class HeartOfElariaLevel {
  private scene: Phaser.Scene;
  private progress: CampaignProgress;
  private player: Player;
  private lumo: Lumo;
  private interactions: InteractionSystem;
  private lantern: LanternSystem;
  private save: () => void;
  private say: HeartOfElariaLevelOptions['say'];
  private isDialogueLocked: () => boolean;
  private isPaused: () => boolean;
  private readonly stopDialogue: () => void;
  private playLanternAction: (on: boolean) => void;
  private finish: () => void;

  private objects: Phaser.GameObjects.GameObject[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private images = new Map<string, Phaser.GameObjects.Image>();
  private overlays = new Map<string, Phaser.GameObjects.Image>();
  private beamGraphics?: Phaser.GameObjects.Graphics;
  /** The overload beam from the core to the lamp Nhinh is carrying; redrawn every frame from the live position. */
  private carriedBeamGraphics?: Phaser.GameObjects.Graphics;
  /** Purple border of the Moon pocket, drawn on the Moon cell's own geometry. */
  private pocketGraphics?: Phaser.GameObjects.Graphics;
  private ringGraphics?: Phaser.GameObjects.Graphics;
  private shadowGraphics?: Phaser.GameObjects.Graphics;
  private dawnOverlay?: Phaser.GameObjects.Image;
  private protected: Phaser.GameObjects.GameObject[] = [];
  private lumoMode: 'follow' | 'travelling' | 'holding' = 'follow';
  private hintIndex = 0;
  private hintStage = '';
  private lastCheckpoint = 0;
  private lanesRevealUntil = 0;
  private lanternKeyTime = 0;
  private destroyed = false;
  private completed = false;
  /** Only EndingScene owns the dawn; this level never starts it, so the flag stays false (kept for the shared art switches). */
  private readonly dawn = false;

  constructor(options: HeartOfElariaLevelOptions) {
    this.scene = options.scene;
    this.progress = options.progress;
    this.player = options.player;
    this.lumo = options.lumo;
    this.interactions = options.interactions;
    this.lantern = options.lantern;
    this.save = options.save;
    this.say = options.say;
    this.isDialogueLocked = options.isDialogueLocked;
    this.isPaused = options.isPaused;
    this.stopDialogue = options.stopDialogue;
    this.playLanternAction = options.playLanternAction;
    this.finish = options.finish;
  }

  private get sealPoint(): HeartPoint {
    return { x: 320, y: 244 };
  }

  private get lanternSpot(): HeartPoint {
    return { x: HEART_BEAM_NODES.source.x, y: HEART_BEAM_NODES.source.y };
  }

  /* ---------------------------------------------------------------- lifecycle */

  public build(): void {
    normalizeHeartProgress(this.progress.flags);
    const savedLumo = {
      x: this.progress.counters['lumo-x'],
      y: this.progress.counters['lumo-y'],
    };
    const restore = resolveHeartRestoreState({
      roots: this.progress.flags['l9-roots'] === true,
      lanternPlaced: this.progress.flags['l9-lantern-placed'] === true ? true : undefined,
      lanternRetrieved: this.progress.flags['l9-lantern-retrieved'] === true,
      overload: this.progress.flags['l9-overload'] === true,
      lanternOn: this.progress.lanternOn,
      complete: this.progress.flags['l9-complete'] === true,
    });

    this.player.setFootPlacement(HEART_BODY.feetY, 21 + HEART_BODY.y, 18 + HEART_BODY.x, HEART_BODY.width, HEART_BODY.height);
    const savedPosition = this.progress.counters['player-level'] === 9
      && Number.isFinite(this.progress.counters['player-x']) && Number.isFinite(this.progress.counters['player-y'])
      ? { x: this.progress.counters['player-x'], y: this.progress.counters['player-y'] }
      : undefined;
    const spawn = restore.overloadActive ? { ...HEART_OVERLOAD_CHECKPOINT } : nearestSafeHeartSpawn(savedPosition);
    this.player.setPosition(spawn.x, spawn.y);
    (this.player.sprite.body as Phaser.Physics.Arcade.Body | null)?.updateFromGameObject();

    // Lantern: restore placement, hand and on/off state first, then derive the live conditions.
    this.lantern.lanternPlaced = false;
    this.lantern.lanternOn = restore.lanternOn;
    this.lantern.lanternInHand = restore.lanternInHand;
    if (restore.lanternPlaced) {
      this.lantern.placeLanternAt(this.lanternSpot.x, this.lanternSpot.y);
      this.lantern.lanternOn = restore.lanternOn;
    }
    this.lantern.isOverloadMode = restore.overloadActive;
    this.lantern.isDawnMode = false;
    this.progress.lanternOn = restore.lanternOn;
    if (restore.lanternPlaced) this.progress.flags['l9-lantern-placed'] = true;

    // Lumo: restore his real position and continue a called assignment from live proximity.
    const lumoX = Number.isFinite(savedLumo.x) ? Phaser.Math.Clamp(savedLumo.x, 62, 580) : spawn.x - 20;
    const lumoY = Number.isFinite(savedLumo.y) ? Phaser.Math.Clamp(savedLumo.y, 150, 300) : spawn.y - 18;
    this.lumo.sprite.setPosition(lumoX, lumoY);
    this.lumo.setVisible(true);
    const called = this.progress.flags['l9-called-heart'] === true;
    const distanceToSeal = Math.hypot(lumoX - this.sealPoint.x, lumoY - this.sealPoint.y);
    // `l9-called-heart` is the current assignment: a recalled Lumo restores following, one saved in
    // transit resumes the route, and only a real arrival restores him holding the seal.
    this.lumoMode = resolveHeartLumoMode({ called, distanceToSeal });
    this.progress.flags['l9-at-heart'] = this.lumoMode === 'holding';

    this.drawScene();
    this.registerInteractions();
    this.refresh();
    this.save();
    // A save from the older F (roots latched, lamp parked and dark) already holds the final action: start the
    // ending instead of asking for a relight or one more E. Deferred so the scene finishes building first.
    if (heartFinalActionAlreadyDone({
      roots: this.progress.flags['l9-roots'] === true,
      lanternPlaced: this.progress.flags['l9-lantern-placed'] === true,
      lanternRetrieved: this.progress.flags['l9-lantern-retrieved'] === true,
      lanternOn: this.progress.lanternOn,
      complete: this.progress.flags['l9-complete'] === true,
    })) this.scene.time.delayedCall(0, () => this.commitFinalExtinguish('pedestal'));
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const collider of this.colliders) if (collider.active) collider.destroy();
    this.colliders = [];
    for (const object of this.objects) if (object.active) object.destroy();
    this.objects = [];
    this.images.clear();
    this.overlays.clear();
    this.interactions.clear();
  }

  public startOpeningDialogue(): void {
    this.say(OPENING);
  }

  public update(dt: number): void {
    if (this.destroyed) return;
    this.driveLumo(dt);
    this.updateBeats();
    if (this.scene.time.now - this.lastCheckpoint >= 600) {
      this.lastCheckpoint = this.scene.time.now;
      if (isHeartPositionSafe({ x: this.player.x, y: this.player.y })) {
        this.progress.counters['player-level'] = 9;
        this.progress.counters['player-x'] = Math.round(this.player.x);
        this.progress.counters['player-y'] = Math.round(this.player.y);
        this.progress.counters['lumo-x'] = Math.round(this.lumo.sprite.x);
        this.progress.counters['lumo-y'] = Math.round(this.lumo.sprite.y);
        this.save();
      }
    }
    this.refresh();
  }

  public getProtectedPromptBounds(): PromptRect[] {
    return this.protected
      .filter((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.active && object.visible)
      .map((object) => object.getBounds());
  }

  /* ---------------------------------------------------------------- state */

  private state(): HeartPuzzleState {
    return deriveHeartPuzzle({
      crystals: {
        memory: this.progress.flags['l9-memory'] === true,
        hope: this.progress.flags['l9-hope'] === true,
        balance: this.progress.flags['l9-balance'] === true,
      },
      lanternPlaced: this.lantern.lanternPlaced,
      lanternOn: this.lantern.lanternOn,
      g0: this.value('heart-g0'),
      memoryMirror: this.value('heart-memory'),
      balanceMirror: this.value('heart-balance'),
      statue: this.value('heart-statue'),
      lumo: { x: this.lumo.sprite.x, y: this.lumo.sprite.y },
      lumoHolding: this.lumoMode === 'holding',
      latched: this.progress.flags['l9-roots'] === true,
    });
  }

  private stage(): HeartStage {
    const state = this.state();
    return getHeartStage({
      crystals: state.crystals,
      taught: this.progress.flags['l9-rules-read'] === true,
      lanternPlaced: this.lantern.lanternPlaced,
      lanternInHand: this.lantern.lanternInHand,
      called: this.progress.flags['l9-called-heart'] === true && this.lumoMode !== 'follow',
      branchesAdjusted: (['heart-g0', 'heart-memory', 'heart-balance', 'heart-statue'] as const)
        .some((key) => this.progress.counters[key] !== undefined),
      ready: state.ready,
      latched: state.latched,
      retrieved: this.progress.flags['l9-lantern-retrieved'] === true,
      overload: this.progress.flags['l9-overload'] === true,
      complete: this.completed || this.progress.flags['l9-complete'] === true,
    });
  }

  private value(key: string): number {
    const value = this.progress.counters[key];
    return typeof value === 'number' && Number.isFinite(value) ? ((value % 4) + 4) % 4 : 0;
  }

  /* ---------------------------------------------------------------- HUD text */

  public getObjectiveText(): string {
    const state = this.state();
    const stage = this.stage();
    switch (stage) {
      case 'crystals': {
        const placed = (['memory', 'hope', 'balance'] as HeartBranchId[]).filter((id) => this.progress.flags[`l9-${id}`] === true).length;
        return `Đặt ba tinh thể vào ba hốc quanh Cây Mẹ (${placed}/3).`;
      }
      case 'teach': return 'Đọc bàn rễ cạnh bệ đèn để nhắc lại ba quy tắc.';
      case 'source': return 'Đặt chiếc đèn đang bật lên bệ dẫn sáng ở phía tây.';
      case 'seal':
        return this.lumoMode === 'travelling'
          ? 'Chờ Lumo tới ấn Hy Vọng và đứng giữ.'
          : 'Gọi Lumo tới ấn Hy Vọng rồi để cậu ấy giữ.';
      case 'route': {
        // Never claim the branches are ready while any prerequisite is still unmet (including Lumo's
        // live position and the lantern state, which the old filter ignored).
        const missing = getHeartPrerequisiteFeedback(state);
        return missing.length
          ? `Chỉnh đường sáng và giữ Lumo ở ấn: còn ${missing.length} điều kiện chưa đúng.`
          : 'Ba nhánh đã sẵn sàng. Tới nút rễ trung tâm ở giữa nền đất.';
      }
      case 'confirm': return 'Nhấn E ở nút rễ trung tâm để khóa cấu hình ba nhánh.';
      case 'retrieve': return 'Lấy lại chiếc đèn ở bệ dẫn sáng.';
      case 'overload': return 'Nhấn F để tắt đèn — nguồn sáng đang quá tải.';
      default: return 'Đêm đã đi hết. Nhấn E để đi tiếp đoạn kết.';
    }
  }

  public getStatusText(): string {
    const state = this.state();
    const lantern = this.lantern.lanternPlaced ? (this.lantern.lanternOn ? 'trên bệ' : 'trên bệ (đã tắt)') : this.lantern.lanternOn ? 'trên tay' : 'trên tay (đã tắt)';
    const roots = ['memory', 'hope', 'balance'].map((id) => (state[id as HeartBranchId] ? '●' : '○')).join('');
    return `Đèn: ${lantern} · Tinh thể: ${['memory', 'hope', 'balance'].filter((id) => this.progress.flags[`l9-${id}`] === true).length}/3`
      + ` · Rễ K/H/C: ${roots} · G0 ${state.g0Split ? 'vào lăng kính' : 'thẳng tới Ký Ức'}`
      + ` · Lumo: ${this.lumoMode === 'holding' ? 'đang giữ ấn' : this.lumoMode === 'travelling' ? 'đang tới ấn' : 'theo Nhinh'}`;
  }

  public getLumoStatusText(): string {
    return this.lumoMode === 'holding' ? 'LUMO · đang giữ ấn Hy Vọng'
      : this.lumoMode === 'travelling' ? 'LUMO · đang tới ấn'
        : 'LUMO · E gọi tới ấn';
  }

  public showHint(): void {
    const stage = this.stage();
    const ladder = hintLadderOf(stage);
    if (ladder !== this.hintStage) {
      this.hintStage = ladder;
      this.hintIndex = 0;
    }
    const hints = HINTS[stage];
    const message = hints[Math.min(this.hintIndex, hints.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, hints.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  public showJournal(): void {
    const notes: string[] = [];
    const placed = (['memory', 'hope', 'balance'] as HeartBranchId[]).filter((id) => this.progress.flags[`l9-${id}`] === true);
    if (placed.length) notes.push(`Tinh thể đã đặt: ${placed.map((id) => (id === 'memory' ? 'Ký Ức' : id === 'hope' ? 'Hy Vọng' : 'Cân Bằng')).join(', ')}.`);
    if (this.progress.flags['l9-rules-read'] === true) notes.push('Bàn rễ nhắc lại: một mạch nhận ánh sáng, một ấn do Lumo giữ, hai mắt Nhật quanh một lõi Nguyệt cần bóng.');
    if (this.progress.flags['l9-lanes-revealed'] === true) notes.push('Pulse soi được các đường nối bị rêu che giữa ba hốc và tâm rễ.');
    if (this.progress.flags['l9-roots'] === true) notes.push('Chốt rễ đang tự giữ cấu hình, nên Lumo không cần đứng ở ấn nữa.');
    if (this.progress.flags['l9-lantern-retrieved'] === true) notes.push('Đèn đã trở về tay Nhinh và vẫn đang cấp thêm ánh sáng.');
    this.say([{ speaker: 'Nhinh', text: notes.length ? `Sổ tay của mình.\n${notes.join('\n')}` : 'Sổ tay còn trống. Ba hốc quanh Cây Mẹ vẫn đang chờ tinh thể.' }]);
  }

  /* ---------------------------------------------------------------- pulse + F */

  public onPulse(x: number, y: number): void {
    if (this.destroyed) return;
    const nearMat = Math.hypot(x - 150, y - 284) <= 150;
    if (!nearMat && this.progress.flags['l9-lanes-revealed'] === true) return;
    this.lanesRevealUntil = this.scene.time.now + 6000;
    if (this.progress.flags['l9-lanes-revealed'] === true) return;
    this.progress.flags['l9-lanes-revealed'] = true;
    this.save();
    this.say(LANES_TOAST);
  }

  /**
   * F. Handled by Level 10 itself so the final action is available immediately during the overload,
   * exactly as the scenario requires, without waiting for dialogue to finish.
   */
  public handleLanternKey(): void {
    if (this.destroyed || this.completed) return;
    const state = this.state();
    const now = performance.now();
    if (now - this.lanternKeyTime < 140) return;
    const lamp = { inHand: this.lantern.lanternInHand, placed: this.lantern.lanternPlaced, on: this.lantern.lanternOn };
    const latched = state.latched;

    const pedestal = getHeartElement('heart-pedestal');
    const nearPedestal = Boolean(pedestal && canReachHeartElement(pedestal, { x: this.player.x, y: this.player.y }));
    const source = heartFinalActionSource(state, lamp, nearPedestal);
    if (source) {
      this.lanternKeyTime = now;
      this.commitFinalExtinguish(source);
      return;
    }
    if (latched && lamp.placed && lamp.on) {
      this.lanternKeyTime = now;
      this.say([{ speaker: 'Nhinh', text: 'Đứng ở mép nam bệ đèn rồi nhấn F để tắt đèn.' }]);
      return;
    }
    if (!latched && this.lantern.lanternPlaced) {
      this.lanternKeyTime = now;
      this.say([{ speaker: 'Nhinh', text: 'Đèn phải ở lại bệ cho tới khi ba nhánh giữ được cấu hình. Cậu giữ Lumo ở ấn nhé.' }]);
      return;
    }
    if (this.isDialogueLocked() || this.isPaused()) return;
    if (!this.lantern.lanternInHand) return;
    if (!this.lantern.toggleLantern(now)) return;
    this.lanternKeyTime = now;
    this.playLanternAction(this.lantern.lanternOn);
    this.progress.lanternOn = this.lantern.lanternOn;
    this.save();
    this.refresh();
  }

  /**
   * The only place the ending is committed (decision D6/D7): off, complete, overload cleared, the lamp's real place
   * saved, the ending checkpoint set to its first beat, and `finish()` called exactly once. EndingScene owns every
   * line and picture that follows, so this level starts no night timer and no dawn of its own.
   */
  public commitFinalExtinguish(source: HeartFinalSource): void {
    if (this.destroyed || this.completed) return;
    this.completed = true;
    // An overload line may still be on screen or queued: it must never play after the ending has started.
    this.stopDialogue();
    const flags = this.progress.flags;
    flags['l9-complete'] = true;
    flags['l9-overload'] = false;
    flags['l9-ending-beat'] = 'night-call';
    flags['l9-lantern-placed'] = source === 'pedestal';
    flags['l9-lantern-retrieved'] = source === 'hand';
    this.lantern.lanternOn = false;
    this.progress.lanternOn = false;
    this.lantern.isOverloadMode = false;
    this.lantern.isDawnMode = false;
    this.save();
    this.refresh();
    this.finish();
  }

  /* ---------------------------------------------------------------- Lumo */

  private driveLumo(dt: number): void {
    if (this.lumoMode === 'follow') {
      const targetX = Phaser.Math.Clamp(this.player.x - 20, 62, 580);
      const targetY = Phaser.Math.Clamp(this.player.y - 18, 150, 300);
      this.lumo.update(dt, targetX, targetY);
      return;
    }
    this.lumo.update(dt, this.sealPoint.x - 18, this.sealPoint.y + 12, true);
    const distance = Math.hypot(this.lumo.sprite.x - this.sealPoint.x, this.lumo.sprite.y - this.sealPoint.y);
    // Arrival is "inside the seal radius" — the same threshold the derivation and a reload use — so
    // the seal powers exactly when the mode flips to holding, and never while he is still travelling.
    if (this.lumoMode === 'travelling' && distance <= HEART_SEAL_RADIUS) {
      this.lumoMode = 'holding';
      this.progress.flags['l9-at-heart'] = true;
      this.save();
      this.say([
        { speaker: 'Lumo', text: 'Tôi tới rồi. Ấn này giữ được.' },
        { speaker: 'Nhinh', text: 'Cậu đứng yên ở đó nhé. Mình sẽ điều chỉnh đường sáng.' },
      ]);
    }
  }

  private callLumoToSeal(): void {
    if (this.lumoMode === 'holding' || this.lumoMode === 'travelling') {
      // Recall ends the assignment: drop the mark and any in-flight route at once and save, so a
      // reload right after can never re-hold the seal from a stale `l9-called-heart`.
      this.lumoMode = 'follow';
      this.progress.flags['l9-called-heart'] = false;
      this.progress.flags['l9-at-heart'] = false;
      this.save();
      this.say([{ speaker: 'Nhinh', text: 'Lumo, về đây với mình một chút.' }, { speaker: 'Lumo', text: 'Tôi về ngay.' }]);
      return;
    }
    this.lumoMode = 'travelling';
    this.progress.flags['l9-called-heart'] = true;
    this.save();
    this.say([
      { speaker: 'Nhinh', text: 'Lumo, tới ấn Hy Vọng giữ giúp mình nhé.' },
      { speaker: 'Lumo', text: 'Tôi thấy ấn của mình ở đây. Cậu chỉnh đường sáng, tôi giữ phần này.' },
    ]);
  }

  /* ---------------------------------------------------------------- beats */

  private updateBeats(): void {
    const state = this.state();
    if (state.latched) return;
    const allLive = state.memory && state.hope && state.balance;
    if (allLive && this.progress.flags['l9-branch-stable'] !== true) {
      this.progress.flags['l9-branch-stable'] = true;
      this.save();
      this.say(STABLE_LINES);
      return;
    }
    if (!allLive && this.progress.flags['l9-branch-stable'] === true && this.progress.flags['l9-branch-dropped'] !== true) {
      this.progress.flags['l9-branch-dropped'] = true;
      this.save();
      this.say(DROPPED_LINES);
    }
  }

  /* ---------------------------------------------------------------- drawing */

  private depthAt(baseY: number): number {
    return 10 + baseY / 10;
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private levelArt(filename: string, x: number, y: number, width?: number, height?: number, depth = 5): Phaser.GameObjects.Image | null {
    const key = getLevelArtKey(9, filename);
    if (!key || !this.scene.textures.exists(key)) return null;
    const image = this.scene.add.image(x, y, key).setDepth(depth);
    if (width !== undefined && height !== undefined) image.setDisplaySize(width, height);
    return this.track(image);
  }

  /**
   * Resolve a control's art. Level-10 package art first, then a documented reuse from another
   * package (level 04 pressure plates, level 08 statue notches), then a raw runtime texture
   * (`pedestal_lit`, `mirror_N`, `lock_sun_off/on`, `lock_moon_off/on`). Never returns a key the
   * texture manager does not hold, so a control can never end up invisible-but-interactive.
   */
  private artKey(name: string): string | null {
    for (const candidate of heartArtCandidates(name)) {
      const key = candidate.kind === 'texture' ? candidate.file : getLevelArtKey(candidate.level, candidate.file);
      if (key && this.scene.textures.exists(key)) return key;
    }
    return null;
  }

  /** Standing props are bottom-anchored on their base line; floor sockets stay centred on the cell. */
  private applyNativePlacement(image: Phaser.GameObjects.Image, element: HeartElement, artName: string = element.art): void {
    const native = heartArtNativeSize(artName);
    const width = native?.width ?? element.width;
    const height = native?.height ?? element.height;
    if (element.kind === 'prop') image.setOrigin(0.5, 1).setPosition(element.x, element.y + element.height / 2);
    else image.setOrigin(0.5, 0.5).setPosition(element.x, element.y);
    image.setDisplaySize(width, height);
  }

  /** One control's image at its native aspect ratio — no arbitrary stretching into a collision box. */
  private elementArt(element: HeartElement, depth: number): Phaser.GameObjects.Image | null {
    const key = this.artKey(element.art);
    if (!key) return null;
    const image = this.scene.add.image(element.x, element.y, key).setDepth(depth);
    this.applyNativePlacement(image, element);
    return this.track(image);
  }

  /** Swap a control to another state texture, keeping its native aspect ratio and its base line. */
  private swapArt(id: string, name: string, element: HeartElement): void {
    const image = this.images.get(id);
    if (!image) return;
    const key = this.artKey(name);
    if (!key) return;
    if (image.texture.key !== key) image.setTexture(key);
    this.applyNativePlacement(image, element, name);
  }

  private drawScene(): void {
    for (const object of this.objects) if (object.active) object.destroy();
    this.objects = [];
    this.images.clear();
    this.overlays.clear();

    // Full-scene state layers from the Level 10 package, registered on the same 640x360 grid.
    const channels = this.levelArt(this.completed ? 'old-white-channels-retracted' : 'old-white-channels-feeding', 0, 0, 640, 360, 2);
    if (channels) {
      channels.setOrigin(0, 0);
      this.overlays.set('channels', channels);
    }
    for (const branch of ['memory', 'hope', 'balance'] as HeartBranchId[]) {
      const layer = this.levelArt(`${branch}-root-broken`, 0, 0, 640, 360, 3);
      layer?.setOrigin(0, 0);
      if (layer) this.overlays.set(`root-${branch}`, layer);
    }
    // The packaged pocket border is a full-canvas image whose visible box sits to the right of the Moon cell, so
    // it is not used: the border is drawn on the Moon cell geometry (see refreshPocket).
    this.pocketGraphics = this.track(this.scene.add.graphics().setDepth(4.4));
    const bloom = this.levelArt('temporary-core-bloom-after-retrieval', 0, 0, 640, 360, 4.6);
    bloom?.setOrigin(0, 0).setVisible(false);
    if (bloom) this.overlays.set('bloom', bloom);
    // The overload beam follows the lamp Nhinh carries (LanternSystem.getCarriedLightPosition); the packaged line is a
    // fixed stroke from the core to one point and cannot follow him, so it is not used.
    this.carriedBeamGraphics = this.track(this.scene.add.graphics().setDepth(6.8));

    // The return ring that closes the loop between the three sockets and the central node.
    this.ringGraphics = this.track(this.scene.add.graphics().setDepth(4));
    const core = this.levelArt(this.coreArtName(this.state()), HEART_CORE.x, HEART_CORE.y, HEART_CORE.width, HEART_CORE.height, 6.2);
    if (core) this.images.set('core', core);
    const wheel = this.levelArt('day-night-wheel-resuming', HEART_CORE.x, HEART_CORE.y + 4, 96, 80, 6.5);
    wheel?.setAlpha(0).setVisible(false);
    if (wheel) this.images.set('wheel', wheel);

    this.protected.length = 0;
    // Floor sockets, props and the central node, each at its own native size.
    for (const element of HEART_ELEMENTS) {
      const standing = element.kind === 'prop';
      const depth = standing ? this.depthAt(element.stand.y) : 7;
      const image = this.elementArt(element, depth);
      if (!image) continue;
      image.setData('heart-id', element.id);
      this.images.set(element.id, image);
      if (standing || element.id === HEART_CONFIRM_ID || element.id === HEART_MAT_ID || element.id === HEART_SEAL_ID) this.protected.push(image);
    }
    // The prism is authored inside G0's mount: aiming G0 into it is the scenario's split route.
    const prismKey = getSharedMechanismKey('prism-dark');
    const prism = prismKey && this.scene.textures.exists(prismKey)
      ? this.track(this.scene.add.image(HEART_BEAM_NODES.prism.x, HEART_BEAM_NODES.prism.y, prismKey).setDepth(this.depthAt(260) + 0.2))
      : null;
    if (prism) {
      prism.setData('heart-id', 'heart-prism');
      this.images.set('heart-prism', prism);
      this.protected.push(prism);
    }
    this.shadowGraphics = this.track(this.scene.add.graphics().setDepth(6.6));
    // Beams sit just under the floor cells and locks (depth 7), so the cells are never raised over the actor to fix it.
    this.beamGraphics = this.track(this.scene.add.graphics().setDepth(6.8));
    const dawn = this.levelArt('ending-dawn-lighting-overlay', 0, 0, 640, 360, 67.5);
    if (dawn) this.dawnOverlay = dawn.setOrigin(0, 0).setVisible(false);

    // Solid colliders: every prop base and the visible scenery bands the player must never cross.
    // A prop only blocks once its own art is on screen, so a missing texture can never turn into an
    // invisible wall (the check script proves every control resolves).
    for (const element of HEART_PROPS) {
      const solid = getHeartSolid(element.id);
      if (solid && this.imageVisible(element.id)) this.addCollider(solid);
    }
    for (const band of HEART_BLOCKERS) this.addCollider(band);
  }

  private addCollider(rect: { x: number; y: number; width: number; height: number }): void {
    const object = this.scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x000000, 0);
    this.scene.physics.add.existing(object, true);
    this.track(object);
    this.colliders.push(this.scene.physics.add.collider(this.player.sprite, object));
  }

  /* ---------------------------------------------------------------- interactions */

  private registerInteractions(): void {
    for (const element of HEART_ELEMENTS) {
      const config: InteractableConfig = {
        id: element.id,
        x: element.stand.x,
        y: element.stand.y,
        radius: element.radius,
        getPromptBounds: () => this.images.get(element.id)?.getBounds() ?? null,
        getPrompt: () => this.promptFor(element),
        isEnabled: () => this.imageVisible(element.id) && this.canReach(element),
        onInteract: () => this.interact(element),
      };
      this.interactions.register(config);
    }
  }

  private imageVisible(id: string): boolean {
    const image = this.images.get(id);
    return Boolean(image?.active && image.visible);
  }

  /** Gate check, shared with the check script: rule 1 (south edge) for props, rule 2 (inside the cell) for sockets. */
  private canReach(element: HeartElement): boolean {
    return canReachHeartElement(element, { x: this.player.x, y: this.player.y });
  }

  private promptFor(element: HeartElement): string | null {
    if (!this.canReach(element)) return null;
    const state = this.state();
    const latched = state.latched;
    switch (element.id) {
      case 'heart-memory':
      case 'heart-hope':
      case 'heart-balance': {
        const branch = element.id.slice('heart-'.length) as HeartBranchId;
        const label = branch === 'memory' ? 'Ký Ức' : branch === 'hope' ? 'Hy Vọng' : 'Cân Bằng';
        return this.progress.flags[`l9-${branch}`] === true ? `E · Xem lại hốc ${label}` : `E · Đặt tinh thể ${label}`;
      }
      case HEART_MAT_ID: return `E · Xem mô hình nhắc quy tắc (${(this.value('l9-mat') % MAT_MODELS.length) + 1}/${MAT_MODELS.length})`;
      case HEART_SEAL_ID:
        if (latched) return 'Ấn Hy Vọng đã được chốt rễ giữ';
        return this.lumoMode === 'follow' ? 'E · Gọi Lumo tới ấn Hy Vọng' : 'E · Gọi Lumo về bên cạnh';
      case 'heart-eye-left': return 'E · Kiểm tra mắt nắng trái';
      case 'heart-eye-right': return 'E · Kiểm tra mắt nắng phải';
      case 'heart-moon': return 'E · Kiểm tra lõi Nguyệt';
      case HEART_CONFIRM_ID:
        if (latched) return 'Rễ đã giữ cấu hình';
        return state.ready ? 'E · Khóa vòng rễ' : 'E · Kiểm tra vòng rễ';
      case 'heart-pedestal':
        if (this.lantern.lanternPlaced) return latched ? 'E · Lấy đèn về tay' : 'Đèn đang ở trên bệ';
        return this.lantern.lanternInHand ? 'E · Đặt đèn lên bệ dẫn sáng' : null;
      case HEART_G0_ID:
        return latched ? 'E · Xem G0 (đã chốt rễ)' : `E · Xoay G0 (${state.g0Split ? 'vào lăng kính' : 'thẳng tới Ký Ức'})`;
      case 'heart-memory-mirror': return latched ? 'E · Xem gương Ký Ức (đã chốt rễ)' : `E · Xoay gương Ký Ức (${this.value('heart-memory')}/4 · 0 đông, 1 nam, 2 tây, 3 bắc)`;
      case 'heart-balance-mirror': return latched ? 'E · Xem gương Cân Bằng (đã chốt rễ)' : `E · Xoay gương Cân Bằng (${this.value('heart-balance')}/4 · 0 đông, 1 nam, 2 tây, 3 bắc)`;
      case 'heart-statue': return latched ? 'E · Xem tượng (đã chốt rễ)' : `E · Xoay tượng (${this.value('heart-statue')}/4 · 0 đông, 1 nam, 2 tây, 3 bắc)`;
      default: return null;
    }
  }

  private interact(element: HeartElement): void {
    const state = this.state();
    switch (element.id) {
      case 'heart-memory':
      case 'heart-hope':
      case 'heart-balance': {
        const branch = element.id.slice('heart-'.length) as HeartBranchId;
        if (this.progress.flags[`l9-${branch}`] === true) {
          this.say([{ speaker: 'Nhinh', text: branch === 'memory'
            ? 'Hốc Ký Ức đã khớp. Màu vàng đang chảy dọc theo rễ.'
            : branch === 'hope' ? 'Hốc Hy Vọng đã khớp. Nhánh xanh đang giữ nhịp đều.'
              : 'Hốc Cân Bằng đã khớp. Nhánh tím vẫn chờ bóng tượng.' }]);
          return;
        }
        this.progress.flags[`l9-${branch}`] = true;
        this.save();
        const remaining = (['memory', 'hope', 'balance'] as HeartBranchId[]).filter((id) => this.progress.flags[`l9-${id}`] !== true);
        this.refresh();
        if (remaining.length === 0) this.say(PLACED_LINES);
        else this.say([{ speaker: 'Nhinh', text: 'Tinh thể đã vào hốc. Màu chạy dọc rễ rồi dừng trước đoạn đứt.' }]);
        return;
      }
      case HEART_MAT_ID: {
        const index = this.value('l9-mat') % MAT_MODELS.length;
        this.progress.counters['l9-mat'] = (index + 1) % MAT_MODELS.length;
        const first = this.progress.flags['l9-rules-read'] !== true;
        this.progress.flags['l9-rules-read'] = true;
        this.save();
        this.refresh();
        this.say(first ? [TEACH_LINES[0], TEACH_LINES[1], { speaker: 'Hệ thống', text: MAT_MODELS[index] }] : [{ speaker: 'Hệ thống', text: MAT_MODELS[index] }]);
        return;
      }
      case HEART_SEAL_ID:
        if (state.latched) {
          this.say([{ speaker: 'Nhinh', text: 'Ấn Hy Vọng đã nằm trong cấu hình được chốt rễ giữ.' }]);
          return;
        }
        this.callLumoToSeal();
        return;
      case 'heart-eye-left':
      case 'heart-eye-right': {
        const side = element.id === 'heart-eye-left' ? 'trái' : 'phải';
        const lit = element.id === 'heart-eye-left' ? state.eyeLeft : state.eyeRight;
        if (lit) {
          this.say([{ speaker: 'Nhinh', text: tr('Mắt nắng {side} đang nhận tia sáng.', { side }) }]);
          return;
        }
        const reasons: string[] = [];
        if (!state.light) reasons.push(tr('đèn chưa ở trên bệ hoặc đang tắt'));
        if (!state.balanceRoute) reasons.push(tr('bộ chia chưa nhận được tia từ G0 và gương Cân Bằng'));
        if (state.balanceRoute && ((element.id === 'heart-eye-left' && this.value('heart-statue') === HEART_STATUE_BLOCKS_LEFT_EYE)
          || (element.id === 'heart-eye-right' && this.value('heart-statue') === HEART_STATUE_BLOCKS_RIGHT_EYE))) reasons.push(tr('tượng đang chắn ngay trước mắt này'));
        this.say([{ speaker: 'Nhinh', text: tr('Mắt nắng {side} vẫn tối: còn {reasons}.', { side, reasons: reasons.join('; ') }) }]);
        return;
      }
      case 'heart-moon': {
        if (state.moonShadow) {
          this.say([{ speaker: 'Nhinh', text: 'Lõi Nguyệt đang nằm trong bóng tượng.' }]);
          return;
        }
        const reasons: string[] = [];
        if (!state.light) reasons.push(tr('đèn chưa ở trên bệ hoặc đang tắt'));
        if (!state.balanceRoute) reasons.push(tr('nhánh Cân Bằng chưa nhận được tia từ bộ chia'));
        if (this.value('heart-statue') !== HEART_STATUE_SHADOW) reasons.push(tr('tượng chưa xoay cho bóng phủ lên hốc'));
        this.say([{ speaker: 'Nhinh', text: tr('Lõi Nguyệt vẫn còn sáng: còn {reasons}.', { reasons: reasons.join('; ') }) }]);
        return;
      }
      case HEART_CONFIRM_ID: {
        if (state.latched) {
          this.say([{ speaker: 'Nhinh', text: 'Chốt rễ đã giữ cấu hình. Cây Mẹ đang tự nuôi mạch.' }]);
          return;
        }
        if (state.ready) {
          this.progress.flags['l9-roots'] = true;
          // Latching ends the assignment the same way a recall does: the roots hold the configuration
          // mechanically now, so `l9-called-heart` — the *current* assignment — is cleared alongside the
          // arrival mark, and both clears land before the save so a latched reload cannot re-hold the seal.
          this.lumoMode = 'follow';
          this.progress.flags['l9-called-heart'] = false;
          this.progress.flags['l9-at-heart'] = false;
          this.save();
          this.refresh();
          this.say(LATCHED_LINES);
          return;
        }
        const missing = getHeartPrerequisiteFeedback(state);
        this.say([{
          speaker: 'Nhinh',
          text: missing.length ? `Còn thiếu: ${missing.join('; ')}.` : 'Ba nhánh chưa cùng giữ được cấu hình.',
        }]);
        return;
      }
      case 'heart-pedestal': {
        if (this.lantern.lanternPlaced) {
          if (!state.latched) {
            this.say([{ speaker: 'Nhinh', text: 'Đèn phải ở lại bệ cho tới khi ba nhánh giữ được cấu hình.' }]);
            return;
          }
          const lampWasOff = !this.lantern.lanternOn;
          this.lantern.retrieveLantern();
          this.lantern.lanternInHand = true;
          this.lantern.lanternOn = !lampWasOff;
          this.progress.flags['l9-lantern-placed'] = false;
          this.progress.flags['l9-lantern-retrieved'] = true;
          this.progress.lanternOn = this.lantern.lanternOn;
          if (lampWasOff) {
            // Defensive: a dark lamp on a latched pedestal is already the final action; restore handles saves like this.
            this.commitFinalExtinguish('hand');
            return;
          }
          this.progress.flags['l9-overload'] = true;
          this.lantern.isOverloadMode = true;
          this.save();
          this.refresh();
          this.say(OVERLOAD_LINES);
          return;
        }
        if (!this.lantern.lanternInHand) return;
        this.lantern.placeLanternAt(this.lanternSpot.x, this.lanternSpot.y);
        this.lantern.lanternInHand = false;
        this.lantern.lanternOn = true;
        // Putting the lantern back ends the carried-light stage: no overload may stay flagged.
        this.progress.flags['l9-overload'] = false;
        this.lantern.isOverloadMode = false;
        this.progress.flags['l9-lantern-placed'] = true;
        this.progress.flags['l9-lantern-retrieved'] = false;
        this.progress.lanternOn = true;
        this.save();
        this.refresh();
        this.say([{ speaker: 'Nhinh', text: 'Ánh sáng đã được đặt ở tâm dẫn.' }]);
        return;
      }
      case HEART_G0_ID: {
        if (state.latched) {
          this.say([{ speaker: 'Nhinh', text: 'G0 đang bị chốt rễ giữ. Cấu hình không đổi nữa.' }]);
          return;
        }
        this.progress.counters['heart-g0'] = (this.value('heart-g0') + 1) % 2;
        this.save();
        this.refresh();
        this.say([{ speaker: 'Hệ thống', text: this.value('heart-g0') === 0
          ? 'G0 hướng vào lăng kính: tia được chia sang cả hai nhánh.'
          : 'G0 chiếu thẳng tới Ký Ức: chỉ nhánh vàng nhận được tia.' }]);
        return;
      }
      case 'heart-memory-mirror':
      case 'heart-balance-mirror':
      case 'heart-statue': {
        if (state.latched) {
          this.say([{ speaker: 'Nhinh', text: 'Cấu hình đã được chốt rễ giữ.' }]);
          return;
        }
        const counter = element.id === 'heart-memory-mirror' ? 'heart-memory'
          : element.id === 'heart-balance-mirror' ? 'heart-balance' : 'heart-statue';
        this.progress.counters[counter] = (this.value(counter) + 1) % 4;
        this.save();
        this.refresh();
        if (element.id === 'heart-statue') {
          const value = this.value('heart-statue');
          const note = value === HEART_STATUE_SHADOW ? 'Bóng tượng đang phủ lên hốc Nguyệt.'
            : value === HEART_STATUE_BLOCKS_LEFT_EYE ? 'Tượng đang chắn mắt nắng trái.'
              : value === HEART_STATUE_BLOCKS_RIGHT_EYE ? 'Tượng đang chắn mắt nắng phải.'
                : 'Bóng tượng đã rời khỏi hốc Nguyệt.';
          this.say([{ speaker: 'Nhinh', text: note }]);
          return;
        }
        const after = this.state();
        const mirror = element.id === 'heart-memory-mirror' ? 'Ký Ức' : 'Cân Bằng';
        const aimed = element.id === 'heart-memory-mirror' ? after.memoryRoute : after.balanceRoute;
        this.say([{ speaker: 'Nhinh', text: aimed ? `Gương ${mirror} đang hướng đúng vào tinh thể.` : `Gương ${mirror} chưa hướng đúng.` }]);
        return;
      }
      default: return;
    }
  }

  /* ---------------------------------------------------------------- refresh */

  private refresh(): void {
    const state = this.state();
    this.refreshBranchArt(state);
    this.refreshLanternArt(state);
    this.refreshBeams(state);
    this.refreshHudText();
  }

  private refreshHudText(): void {
    // Objective/status text lives on the campaign HUD; CampaignScene pulls it through getObjectiveText.
  }

  /**
   * The core's art for a state, from the live state (also used for the first frame, so a restored save never flashes
   * another state). `core-dawn` is byte-identical to `core-night`, so the dawn is read from the dawn lighting overlay
   * (shown from the dawn transition on), not from a second picture.
   */
  private coreArtName(state: HeartPuzzleState): string {
    return this.completed || this.progress.flags['l9-complete'] === true ? 'core-dawn'
      : state.latched ? 'core-latched'
        : state.ready ? 'core-ready'
          : state.light ? 'core-waiting' : 'core-night';
  }

  private refreshBranchArt(state: HeartPuzzleState): void {
    for (const branch of ['memory', 'hope', 'balance'] as HeartBranchId[]) {
      const overlay = this.overlays.get(`root-${branch}`);
      const live = state[branch];
      const name = `${branch}-root-${state.latched ? 'connected' : live ? 'repaired' : 'broken'}`;
      const key = getLevelArtKey(9, name);
      if (overlay && key && this.scene.textures.exists(key) && overlay.texture.key !== key) overlay.setTexture(key);
      overlay?.setAlpha(live || state.latched ? 1 : 0.82);
    }
    const socketStates: Array<[string, string]> = [
      ['heart-memory', this.progress.flags['l9-memory'] === true ? 'memory-alcove-inserted' : 'memory-alcove-empty'],
      ['heart-hope', this.progress.flags['l9-hope'] === true ? 'hope-alcove-inserted' : 'hope-alcove-empty'],
      ['heart-balance', this.progress.flags['l9-balance'] === true ? 'balance-alcove-inserted' : 'balance-alcove-empty'],
    ];
    for (const [id, name] of socketStates) {
      const element = getHeartElement(id);
      if (element) this.swapArt(id, name, element);
    }
    const coreKey = getLevelArtKey(9, this.coreArtName(state));
    const core = this.images.get('core');
    if (core && coreKey && this.scene.textures.exists(coreKey) && core.texture.key !== coreKey) core.setTexture(coreKey);

    const nodeName = this.progress.flags['l9-roots'] === true ? 'confirmation-root-latched' : state.ready ? 'confirmation-root-ready' : 'confirmation-root-waiting';
    const nodeElement = getHeartElement(HEART_CONFIRM_ID);
    if (nodeElement) this.swapArt(HEART_CONFIRM_ID, nodeName, nodeElement);

    const leftElement = getHeartElement('heart-eye-left');
    const rightElement = getHeartElement('heart-eye-right');
    const moonElement = getHeartElement('heart-moon');
    if (leftElement) this.swapArt('heart-eye-left', state.eyeLeft ? 'lock_sun_on' : 'lock_sun_off', leftElement);
    if (rightElement) this.swapArt('heart-eye-right', state.eyeRight ? 'lock_sun_on' : 'lock_sun_off', rightElement);
    if (moonElement) this.swapArt('heart-moon', state.moonShadow ? 'lock_moon_on' : 'lock_moon_off', moonElement);

    const pedestalElement = getHeartElement('heart-pedestal');
    if (pedestalElement) this.swapArt('heart-pedestal', this.lantern.lanternPlaced ? 'pedestal_lit' : 'pedestal_empty', pedestalElement);

    const g0Element = getHeartElement(HEART_G0_ID);
    if (g0Element) this.swapArt(HEART_G0_ID, `mirror_${state.g0Split ? 0 : 1}`, g0Element);
    const prism = this.images.get('heart-prism');
    if (prism) {
      const prismKey = getSharedMechanismKey(state.light && state.g0Split ? 'prism-receiving' : 'prism-dark');
      if (prismKey && this.scene.textures.exists(prismKey) && prism.texture.key !== prismKey) prism.setTexture(prismKey);
    }
    const memoryMirrorElement = getHeartElement('heart-memory-mirror');
    const balanceMirrorElement = getHeartElement('heart-balance-mirror');
    const statueElement = getHeartElement('heart-statue');
    if (memoryMirrorElement) this.swapArt('heart-memory-mirror', `mirror_${this.value('heart-memory')}`, memoryMirrorElement);
    if (balanceMirrorElement) this.swapArt('heart-balance-mirror', `mirror_${this.value('heart-balance')}`, balanceMirrorElement);
    if (statueElement) this.swapArt('heart-statue', `statue-notch-${this.value('heart-statue')}`, statueElement);

    const sealElement = getHeartElement(HEART_SEAL_ID);
    // The plate reads occupied only while Lumo is actually holding it and settled inside the radius;
    // a travelling Lumo still paints empty, matching the state the seal itself powers from.
    if (sealElement) this.swapArt(HEART_SEAL_ID, heartSealPlateArt(state), sealElement);

    const wheel = this.images.get('wheel');
    if (wheel) {
      const show = this.dawn || this.completed;
      wheel.setVisible(show);
      wheel.setAlpha(show ? (this.dawn ? 0.9 : 0.6) : 0);
      if (show) wheel.setAngle((this.scene.time.now / 60) % 360);
    }
  }

  private refreshLanternArt(state: HeartPuzzleState): void {
    const channels = this.overlays.get('channels');
    const channelName = this.completed || this.progress.flags['l9-complete'] === true ? 'old-white-channels-retracted' : 'old-white-channels-feeding';
    const channelKey = getLevelArtKey(9, channelName);
    if (channels && channelKey && this.scene.textures.exists(channelKey) && channels.texture.key !== channelKey) channels.setTexture(channelKey);

    const bloom = this.overlays.get('bloom');
    const overloading = this.progress.flags['l9-overload'] === true && this.lantern.lanternOn && this.lantern.lanternInHand;
    bloom?.setVisible(overloading && !this.completed);
    this.refreshCarriedBeam(overloading && !this.completed);
    this.refreshPocket(state.balanceRoute || state.balance || this.progress.flags['l9-roots'] === true);
    if (this.dawnOverlay) this.dawnOverlay.setVisible(this.dawn || this.completed || this.progress.flags['l9-complete'] === true);

    if (this.shadowGraphics) {
      this.shadowGraphics.clear();
      const value = this.value('heart-statue');
      const covered = value === HEART_STATUE_SHADOW;
      this.shadowGraphics.fillStyle(0x1b2436, covered ? 0.55 : 0.22);
      this.shadowGraphics.fillEllipse(HEART_MOON_SHADOW.x, HEART_MOON_SHADOW.y + (covered ? 0 : -26), HEART_MOON_SHADOW.radiusX * 2, HEART_MOON_SHADOW.radiusY * 2);
    }
  }

  /** Core -> the lamp in Nhinh's hand, from the live position every frame; it vanishes the moment the lamp goes out or is put down. */
  private refreshCarriedBeam(active: boolean): void {
    const graphics = this.carriedBeamGraphics;
    if (!graphics) return;
    graphics.clear();
    if (!active) return;
    const lamp = this.lantern.getCarriedLightPosition(this.player.x, this.player.y);
    graphics.lineStyle(8, 0xfff0b8, 0.2);
    graphics.lineBetween(HEART_CORE.x, HEART_CORE.y, lamp.x, lamp.y);
    graphics.lineStyle(3, 0xfff6d0, 0.9);
    graphics.lineBetween(HEART_CORE.x, HEART_CORE.y, lamp.x, lamp.y);
  }

  private refreshPocket(visible: boolean): void {
    const graphics = this.pocketGraphics;
    if (!graphics) return;
    graphics.clear();
    const moon = getHeartElement('heart-moon');
    if (!visible || !moon) return;
    graphics.fillStyle(0x1b1230, 0.28);
    graphics.fillRoundedRect(moon.x - 28, moon.y - 24, 56, 44, 8);
    graphics.lineStyle(2, 0xb98cf0, 0.85);
    graphics.strokeRoundedRect(moon.x - 28, moon.y - 24, 56, 44, 8);
  }

  private refreshBeams(state: HeartPuzzleState): void {
    if (!this.beamGraphics) return;
    const graphics = this.beamGraphics;
    graphics.clear();
    const nodes = HEART_BEAM_NODES;
    const line = (points: ReadonlyArray<HeartPoint>, color: number, active: boolean, width = 3): void => {
      graphics.lineStyle(width, color, active ? 0.92 : 0.28);
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.strokePath();
    };
    const revealed = this.scene.time.now < this.lanesRevealUntil;

    if (this.ringGraphics) {
      this.ringGraphics.clear();
      for (const branch of ['memory', 'hope', 'balance'] as HeartBranchId[]) {
        const colour = HEART_LANE_COLORS[branch];
        const live = state[branch];
        this.ringGraphics.lineStyle(state.latched ? 7 : 5, colour, state.latched ? 0.85 : live ? 0.7 : revealed ? 0.45 : 0.16);
        const lane = HEART_RING_LANES[branch];
        this.ringGraphics.beginPath();
        this.ringGraphics.moveTo(lane[0].x, lane[0].y);
        for (const point of lane.slice(1)) this.ringGraphics.lineTo(point.x, point.y);
        this.ringGraphics.strokePath();
      }
    }

    if (!state.light && !state.latched) return;
    const light = state.light || state.latched;
    line([nodes.source, nodes.g0], 0xffe9a8, light);
    if (state.latched) {
      line([nodes.g0, nodes.memoryMirror], 0xf2c661, true);
      line([nodes.memoryMirror, nodes.memoryCrystal], 0xf2c661, true);
      line([nodes.g0, nodes.balanceMirror], 0xb98cf0, true);
      line([nodes.balanceMirror, nodes.eyeLeft, nodes.moon, nodes.eyeRight], 0xb98cf0, true);
      return;
    }
    if (state.g0Split) {
      line([nodes.g0, nodes.prism], 0xffe9a8, true);
      line([nodes.prism, nodes.memoryMirror], 0xffe9a8, state.memoryRoute);
      line([nodes.memoryMirror, nodes.memoryCrystal], 0xf2c661, state.memory);
      line([nodes.prism, nodes.balanceMirror], 0xffe9a8, state.balanceRoute);
    } else {
      line([nodes.g0, nodes.memoryCrystal], 0xf2c661, state.memory);
    }
    line([nodes.balanceMirror, nodes.eyeLeft], 0xb98cf0, state.eyeLeft);
    line([nodes.eyeLeft, nodes.moon], 0xb98cf0, state.moonShadow);
    line([nodes.moon, nodes.eyeRight], 0xb98cf0, state.eyeRight);
  }

  /* ---------------------------------------------------------------- diagnostics */

  /** Every authored control must stay reachable and pressable; the check script asserts the same. */
  public getStandAudit(): ReturnType<typeof auditHeartStands> {
    return auditHeartStands();
  }
}
