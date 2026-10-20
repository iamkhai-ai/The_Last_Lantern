import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import { LIBRARY_DAIS, LIBRARY_EXIT_THRESHOLD, LIBRARY_LAYOUT, LIBRARY_SOLID_RECTS, LIBRARY_WALL_RECTS, libraryActorBody, isLibraryPositionSafe, sanitizeLibrarySlots } from '../data/libraryLayout';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import { SoundSystem } from '../systems/SoundSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import { createForestRandom } from '../data/forestDecor';
import { inkOverlayFade } from './libraryInkFade';

const STONES = ['bird', 'leaf', 'boat', 'seed'] as const;
type Stone = typeof STONES[number];
const LABELS: Record<Stone, string> = { bird: 'Chim', leaf: 'Lá', boat: 'Thuyền', seed: 'Hạt' };
const ANSWER_HINT = 'Bắc: Chim (bình minh, mũi tên lên) · Đông: Lá (ban ngày) · Nam: Thuyền (hoàng hôn, mũi tên xuống) · Tây: Hạt (ban đêm). E chọn ở giá đá; E đặt ở hốc; E kiểm tra ở bệ giữa.';
/** Names the time order without naming any tablet; shown before the answer is unlocked. */
const RULE_HINT = 'Bắt đầu ở hốc có dấu mặt trời, rồi đi theo chiều kim đồng hồ: bình minh, ban ngày, hoàng hôn, ban đêm.';
const INSCRIPTION = '“Mặt trời lên, ngày bắt đầu. Mặt trời lặn, đêm nối tiếp. Hãy đưa bốn thời khắc trở lại vòng ngày đêm.”';
const RACK_ORDER: Stone[] = ['boat', 'bird', 'seed', 'leaf'];
const CLUES: Record<Stone, { lit: string; dark: string }> = {
  bird: { lit: 'Mặt trời ở sát đường chân trời, ngay trên mặt nước.', dark: 'Một mũi tên hướng lên, vượt qua đường chân trời.' },
  leaf: { lit: 'Mặt trời ở trên cao. Đường cung quanh nó còn thiếu một đoạn.', dark: 'Đường cung vươn tới đỉnh. Nhưng không thấy mặt trời hay mặt trăng.' },
  boat: { lit: 'Mặt trời ở sát đường chân trời, ngay trên mặt nước.', dark: 'Một mũi tên hướng xuống, qua đường chân trời.' },
  seed: { lit: 'Mặt trăng ở trên cao. Đường cung quanh nó còn thiếu một đoạn.', dark: 'Đường cung vươn tới đỉnh. Nhưng không thấy mặt trời hay mặt trăng.' },
};
/** Pressing E on the open book shows the layer the current lantern state reveals. */
const BOOK_OBSERVATION: Record<'lit' | 'dark', string> = {
  lit: 'Một bông hoa màu vàng. Những cánh hoa đều khép lại.',
  dark: 'Có hình trăng lưỡi liềm bằng mực xanh trên trang giấy.',
};
/** The two-layer realisation plays once, on the read that completes both book observations. */
const BOOK_LAYERS_SEEN: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Vẫn trang giấy ấy, mà bật đèn với tắt đèn lại thấy hai hình khác nhau.' },
  { speaker: 'Lumo', text: 'Có những nét chỉ hiện ra trong bóng tối.' },
  { speaker: 'Nhinh', text: 'Mình thử xem những phiến đá kia có giống vậy không.' },
];
/** Comparison after both layers of the two horizon tablets (Chim and Thuyền), in either observation order. */
const HORIZON_PAIR: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Thảo nào hai hình trông giống nhau. Một bên mặt trời đang lên, một bên lại đang lặn.' },
  { speaker: 'Lumo', text: 'Nếu cứ để đèn sáng thì mình đã bỏ sót những mũi tên rồi.' },
];
/** Comparison after both layers of the two arc tablets (Lá and Hạt), in either observation order. */
const ARC_PAIR: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Khi tắt đèn, hai đường cung này giống hệt nhau.' },
  { speaker: 'Lumo', text: 'Nhưng dưới ánh đèn, một phiến là mặt trời, một phiến là mặt trăng.' },
];
/** Spoken once, only while the ring is still unsolved, after all eight tablet layers are actually seen. */
const ALL_LAYERS: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Mình đã xem đủ cả hai lớp rồi. Giờ thử xếp chúng lại xem.' },
];
const TIME_LABELS: Record<Stone, string> = { bird: 'Bình minh', leaf: 'Ban ngày', boat: 'Hoàng hôn', seed: 'Ban đêm' };
/** Seat names follow the seat order: North, East, South, West. */
const SEAT_NAMES = ['Bắc', 'Đông', 'Nam', 'Tây'];
const TOAST_MS = 1800;
const LIBRARY_CELL_HALF = 26;
// Room decor (rendering only; colliders and interactions live in libraryLayout.ts and registerInteractions).
// Glows sit above the lantern darkness (depth 68); dark-ink copies sit above it too, at 69.3.
// Ink copies fade out near the player (see inkOverlayFade) so they never cover the actor.
const LIBRARY_FLOOR_SEED = 0x2b7f;
const LIBRARY_WALL_DEPTH = 0.2;
const LIBRARY_GLOW_DEPTH = 69.2;
const LIBRARY_INK_DEPTH = 69.3;
const INK_OVERLAY_ALPHA = 0.92;
const LIBRARY_CYAN = 0x7df2d4;
const LIBRARY_WARM = 0xffe680;
/** Gap between the warm seat flashes of a correct arrangement, clockwise from the North seat. */
const SEAT_FLASH_STEP_MS = 120;
// The inscription stands on the floor beside the entry path (geometry in LIBRARY_LAYOUT.inscription).
// It is a warmer stone than the puzzle tablets and carries gold engraving, so it never reads as a fifth blank tablet.
const LIBRARY_TABLET_STONE = 0xe6c995;
const LIBRARY_TABLET_GOLD = 0xd8b869;
/** The north-wall arch spans this x range; top-wall shelves and hanging lanterns skip it. */
const LIBRARY_ARCH_CLEAR = { min: 532, max: 628 };
const LIBRARY_HANG_XS = [230, 306, 382, 458];
/** Warm cue inside the new north-wall doorway; also the flash position when the crystal opens it. */
const LIBRARY_EXIT_GLOW = { x: 580, y: 140 };
const LIBRARY_MURAL_SUN = { x: 475, y: 118 };
const BORDER_NAMES: Record<Stone, string> = { bird: 'border-chim', leaf: 'border-la', boat: 'border-thuyen', seed: 'border-hat' };
const INTRO: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Rễ cây ôm cả những giá sách…' },
  { speaker: 'Lumo', text: 'Mùi giấy này… Tôi vẫn còn nhớ.' },
  { speaker: 'Nhinh', text: 'Còn bốn phiến đá kia? Trông chúng vừa với những hốc quanh giếng.' },
  { speaker: 'Lumo', text: 'Trên bệ có chữ. Cậu đọc thử xem.' },
  { speaker: 'Hệ thống', text: INSCRIPTION },
  { speaker: 'Nhinh', text: 'Bốn phiến đá, bốn thời khắc… Có lẽ mình phải xếp chúng lại.' },
  { speaker: 'Lumo', text: 'Có cuốn sách đang mở trên bàn kia. Biết đâu nó chỉ cách đọc những hình này.' },
];

export interface LibraryLevelOptions {
  scene: Phaser.Scene;
  progress: CampaignProgress;
  player: Player;
  interactions: InteractionSystem;
  lantern: LanternSystem;
  save: () => void;
  say: (lines: DialogueLine[], onComplete?: () => void) => void;
  nextLevel: (lines: DialogueLine[]) => void;
}

export class LibraryLevel {
  private readonly scene: Phaser.Scene;
  private readonly progress: CampaignProgress;
  private readonly player: Player;
  private readonly interactions: InteractionSystem;
  private readonly lantern: LanternSystem;
  private readonly save: () => void;
  private readonly say: LibraryLevelOptions['say'];
  private readonly nextLevel: LibraryLevelOptions['nextLevel'];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private bodies: Phaser.Physics.Arcade.StaticBody[] = [];
  private tabletStacks = new Map<string, Phaser.GameObjects.Container>();
  private socketImages: Phaser.GameObjects.Image[] = [];
  private rackEmptyStands: Phaser.GameObjects.Image[] = [];
  private bookLayers: Phaser.GameObjects.Image[] = [];
  /** Dark-ink copy of the book page, shown above the darkness only while the lantern is off. */
  private bookInkOverlay?: Phaser.GameObjects.Container;
  /** Well core glow; warm when the lantern is on, cyan when it is off. */
  private coreGlow?: Phaser.GameObjects.Image;
  /** Golden pulse on the memory crystal; exists only while the crystal rests on the well (owned by syncCrystal). */
  private crystalGlow?: Phaser.GameObjects.Image;
  private crystalGlowTween?: Phaser.Tweens.Tween;
  /** Soft warm glow on the open mural's painted sun; visible only while the mural is open. */
  private muralSunGlow?: Phaser.GameObjects.Image;
  /** Gentle warm pulse on the reading desk; visible only until the book has been practised. */
  private bookGlow?: Phaser.GameObjects.Image;
  /** The free-standing inscription tablet: its image bounds anchor the read prompt. */
  private inscriptionImage?: Phaser.GameObjects.Image;
  /** Exit glow: dim and cool while the stone gate is shut, bright once it opens. */
  private exitGlow?: Phaser.GameObjects.Image;
  /** Brighter core pulse shown while all four seats are filled and before the arrangement is checked. */
  private corePulseTween?: Phaser.Tweens.Tween;
  private readonly glowTweens: Phaser.Tweens.Tween[] = [];
  private selectedStone: number | null = null;
  /** `${stone}-${state}` of the last layer read; a second E on the same rack tablet in the same light deselects it. */
  private lastInspected = '';
  private toast?: Phaser.GameObjects.Text;
  private toastTimer?: Phaser.Time.TimerEvent;
  private stageKey = '';
  private hintIndex = 0;
  private exitThresholdBody?: Phaser.Physics.Arcade.StaticBody;
  private exitImages: Phaser.GameObjects.Image[] = [];
  private exitBaseImage?: Phaser.GameObjects.Image;
  private lastLanternState = false;
  private lastExitOpen = false;
  private destroyed = false;
  private readonly artImages: Phaser.GameObjects.Image[] = [];
  private readonly protectedImages = new Set<Phaser.GameObjects.Image>();
  /** Parsed memory slots; per-frame reads reuse them. slotsSource is the saved JSON string they were parsed from. */
  private slots: readonly number[] = [-1, -1, -1, -1];
  private slotsSource: unknown = undefined;

  public constructor(options: LibraryLevelOptions) {
    this.scene = options.scene;
    this.progress = options.progress;
    this.player = options.player;
    this.interactions = options.interactions;
    this.lantern = options.lantern;
    this.save = options.save;
    this.say = options.say;
    this.nextLevel = options.nextLevel;
  }

  public build(): void {
    this.sanitizeSavedSlots();
    this.drawFloorAndRoom();
    this.createObstacles();
    this.drawRoomArt();
    this.drawTabletsAndSockets();
    this.registerInteractions();
    this.updateVisualState(true);
  }

  public startOpeningDialogue(): void {
    this.progress.flags['l2-inscription-read'] = true;
    this.save();
    this.say(INTRO);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.glowTweens.forEach((tween) => tween.stop());
    this.glowTweens.length = 0;
    this.toastTimer?.remove(false);
    if (this.toast?.active) this.toast.destroy();
    this.toast = undefined;
    this.colliders.forEach((collider) => { if (collider.active) collider.destroy(); });
    this.bodies.forEach((body) => { if (body.gameObject?.active) body.gameObject.destroy(); });
    this.objects.forEach((object) => { if (object.active) object.destroy(); });
    this.objects = [];
    this.colliders = [];
    this.bodies = [];
    this.tabletStacks.clear();
    this.protectedImages.clear();
    this.interactions.clear();
  }

  public update(): void {
    this.updateVisualState(false);
    this.updateInkFade();
  }

  public getProtectedPromptBounds(): PromptRect[] {
    const bounds = [...this.protectedImages].filter((image) => image.active && image.visible).map((image) => image.getBounds());
    for (const stack of this.tabletStacks.values()) if (stack.active && stack.visible) bounds.push(stack.getBounds());
    return bounds;
  }

  public getObjectiveText(): string {
    if (this.progress.flags['l2-memory'] && !this.progress.flags['l2-crystal']) return 'Nhấn E ở mép nam bệ giữa để nhận Tinh thể Ký Ức.';
    // The gate opens the moment the crystal is taken; the fifth painting is optional story.
    if (this.isExitOpen()) return 'Tới cổng đá phía Đông Bắc và nhấn E. (Tranh thứ năm: tùy chọn)';
    if (!this.progress.flags['l2-memory'] && this.allSeatsFilled()) return 'Đủ bốn phiến. Nhấn E ở bệ giữa để kiểm tra.';
    if (this.isBookStage()) return 'Đọc cuốn sách trên bàn, nhấn F đổi đèn rồi đọc lại.';
    if (!this.progress.flags['l2-memory'] && !this.allTabletLayersSeen() && !this.anyTabletPlaced()) return 'Đọc cả hai lớp (đèn bật/tắt) của bốn phiến trên giá.';
    if (!this.progress.flags['l2-memory']) return 'Đặt bốn phiến vào bốn hốc theo vòng một ngày.';
    return 'Khám phá thư viện.';
  }

  public getStatusText(): string {
    const slots = this.readSlots();
    const placed = slots.filter((slot) => slot >= 0).length;
    const observed = STONES.reduce((count, stone) => count
      + Number(this.progress.flags[`l2-${stone}-lit`] === true)
      + Number(this.progress.flags[`l2-${stone}-dark`] === true), 0);
    if (this.progress.flags['l2-memory']) return `Vòng: đã phục hồi · Tinh thể: ${this.progress.flags['l2-crystal'] ? 'đã nhận' : 'chưa nhận'} · Cổng: ${this.isExitOpen() ? 'mở' : 'đóng'} · Tranh thứ năm: ${this.progress.flags['l2-fifth-viewed'] ? 'đã đọc' : 'chưa đọc'}`;
    const selected = this.selectedStone === null ? '' : ` · Đang chọn: ${LABELS[STONES[this.selectedStone]]}`;
    return `Phiến trong hốc ${placed}/4 · Lớp đã đọc ${observed}/8${selected}`;
  }

  public showHint(): void {
    const stage = this.hintStage();
    if (stage !== this.stageKey) { this.stageKey = stage; this.hintIndex = 0; }
    const observedLayers = this.tabletLayerCount();
    // The final tier names the answer only after every layer is read or a check has failed.
    const finalHint = this.isAnswerUnlocked() ? ANSWER_HINT : RULE_HINT;
    const clueHints = observedLayers === 0
      ? [
        'Đi tới từng giá đá và nhấn E để xem phiến dưới lớp đèn hiện tại; nhấn F rồi E lần nữa để so sánh lớp kia.',
        'Bật đèn để thấy thiên thể và vị trí; tắt đèn để thấy đường chuyển động. Ghép hai lớp của cùng một phiến.',
        finalHint,
      ]
      : [
        `Đã đọc ${observedLayers}/8 lớp. Nhấn F đổi đèn, rồi E đọc các phiến còn thiếu ở giá đá; vẫn có thể thử xếp bất cứ lúc nào.`,
        this.getObservedPairHint(),
        finalHint,
      ];
    const hints: Record<string, string[]> = {
      book: [
        'Đứng cạnh bàn rồi nhấn E để đọc trang dưới lớp đèn đang hiện. Nhấn F đổi đèn, sau đó E đọc lại.',
        'Bật đèn bằng F để thấy thiên thể và vị trí; tắt đèn để thấy đường chuyển động. Nhấn E trên trang hoặc phiến để ghi lớp đang thấy.',
        'Bắt đầu ở hốc có dấu mặt trời phía Bắc. E ở giá đá để chọn phiến; E lần nữa trên phiến đó để bỏ chọn. E ở hốc để đặt hoặc đổi chỗ; E ở bệ giữa để kiểm tra.',
      ],
      clues: clueHints,
      arrange: [
        'Bắt đầu ở hốc có dấu mặt trời phía Bắc, rồi đi theo chiều kim đồng hồ.',
        'So từng phiến với lớp đã đọc. Hốc theo chiều kim đồng hồ là Bắc, Đông, Nam, Tây.',
        finalHint,
      ],
      crystal: ['Đứng ở mép nam của bệ giữa để tới tinh thể.', 'Nhấn E ở bệ giữa để nhận Tinh thể Ký Ức.'],
      exit: [
        'Đi lên phía đông bắc, tới vòm cổng đá trên vách bắc.',
        'Tới cổng đá phía Đông Bắc và nhấn E để đi tiếp.',
        'Bức tranh thứ năm sau vách rễ là tùy chọn; cổng đã mở từ khi nhận tinh thể.',
      ],
    };
    const choices = hints[stage];
    const message = choices[Math.min(this.hintIndex, choices.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, choices.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  public showJournal(): void {
    const entries: DialogueLine[] = [];
    if (this.progress.flags['l2-inscription-read']) entries.push({ speaker: 'Nhinh', text: `Dòng khắc: ${INSCRIPTION}` });
    if (this.progress.flags['l2-book-lit']) entries.push({ speaker: 'Nhinh', text: `Trang sách · Đèn bật: ${BOOK_OBSERVATION.lit}` });
    if (this.progress.flags['l2-book-dark']) entries.push({ speaker: 'Nhinh', text: `Trang sách · Đèn tắt: ${BOOK_OBSERVATION.dark}` });
    for (const stone of STONES) {
      for (const [state, label] of [['lit', 'Đèn bật'], ['dark', 'Đèn tắt']] as const) {
        if (!this.progress.flags[`l2-${stone}-${state}`]) continue;
        const answer = this.progress.flags['l2-memory'] ? ` · ${TIME_LABELS[stone]}` : '';
        entries.push({ speaker: 'Nhinh', text: `${LABELS[stone]} · ${label}${answer}: ${CLUES[stone][state]}` });
      }
    }
    if (this.progress.flags['l2-memory']) entries.push({ speaker: 'Nhinh', text: 'Vòng ngày đêm: Chim — bình minh; Lá — ban ngày; Thuyền — hoàng hôn; Hạt — ban đêm.' });
    if (this.progress.flags['l2-plan-recorded']) entries.push({ speaker: 'Lumo', text: 'Tìm đủ ba tinh thể để thắp sáng trái tim Cây Mẹ. Rừng sẽ hồi sinh.' });
    if (this.progress.flags['l2-fifth-viewed']) entries.push({ speaker: 'Nhinh', text: 'Những đường nứt chạy từ bánh xe về phía Cây Mẹ.' });
    const lines = entries.length ? entries : [{ speaker: 'Nhinh' as const, text: 'Sổ tay chưa ghi trang sách hay phiến nào.' }];
    this.say([{ speaker: 'Nhinh', text: 'Sổ tay thư viện. Mỗi trang giữ một manh mối đã quan sát.' }, ...lines]);
  }

  private drawFloorAndRoom(): void {
    const { left, right, top, bottom } = LIBRARY_LAYOUT.floor;
    // Masonry outside the walkable floor: a top band, side columns and a bottom band.
    this.track(this.scene.add.tileSprite(0, 0, 640, top, 'ground_stone').setOrigin(0).setTint(0x4a4236).setDepth(LIBRARY_WALL_DEPTH));
    this.track(this.scene.add.tileSprite(0, top, left, bottom - top, 'ground_stone').setOrigin(0).setTint(0x3d362c).setDepth(LIBRARY_WALL_DEPTH));
    this.track(this.scene.add.tileSprite(right, top, 640 - right, bottom - top, 'ground_stone').setOrigin(0).setTint(0x3d362c).setDepth(LIBRARY_WALL_DEPTH));
    this.track(this.scene.add.tileSprite(0, bottom, 640, 360 - bottom, 'ground_stone').setOrigin(0).setTint(0x332d25).setDepth(LIBRARY_WALL_DEPTH));
    this.track(this.scene.add.tileSprite(left, top, right - left, bottom - top, 'ground_stone').setOrigin(0).setTint(0x8a7c62).setDepth(0));
    const ledges = this.scene.add.graphics().setDepth(0.25);
    ledges.fillStyle(0x2b251e, 1);
    ledges.fillRect(0, top - 8, 640, 8);
    ledges.fillStyle(0x1c1812, 0.9);
    ledges.fillRect(0, bottom, 640, 2);
    this.track(ledges);
    this.drawFloorInnerShadow();
    this.drawFloorMottling();
    const lip = this.scene.add.graphics().setDepth(0.5);
    lip.fillStyle(0x7a6a50, 0.6);
    lip.fillRect(left, top, right - left, 1);
    this.track(lip);
    // Worn ring and contact shadow under the well; the well art itself is drawn at depth 5.
    const well = LIBRARY_LAYOUT.well;
    this.track(this.scene.add.ellipse(well.x, well.y, 250, 120, 0x6b5a40, 0.18).setDepth(4.7));
    this.track(this.scene.add.ellipse(well.x, well.y + 20, 230, 90, 0x000000, 0.25).setDepth(4.9));
  }

  /** Soft shadow along the four walls: five stacked strips, each 4px shorter, so the tint fades inward from the wall. */
  private drawFloorInnerShadow(): void {
    const { left, right, top, bottom } = LIBRARY_LAYOUT.floor;
    const shadow = this.scene.add.graphics().setDepth(0.35);
    shadow.fillStyle(0x0b0906, 0.08);
    for (let step = 0; step < 5; step += 1) {
      const reach = 20 - step * 4;
      shadow.fillRect(left, top, right - left, reach);
      shadow.fillRect(left, bottom - reach, right - left, reach);
      shadow.fillRect(left, top, reach, bottom - top);
      shadow.fillRect(right - reach, top, reach, bottom - top);
    }
    this.track(shadow);
  }

  /** Sixteen soft dark blotches on the floor, placed by a fixed seed so every load looks the same. */
  private drawFloorMottling(): void {
    const { left, right, top, bottom } = LIBRARY_LAYOUT.floor;
    const rand = createForestRandom(LIBRARY_FLOOR_SEED);
    const mottle = this.scene.add.graphics().setDepth(0.4);
    for (let index = 0; index < 16; index += 1) {
      const width = 36 + rand() * 60;
      const height = width * (0.3 + rand() * 0.2);
      const x = left + 6 + width / 2 + rand() * (right - left - width - 12);
      const y = top + 6 + height / 2 + rand() * (bottom - top - height - 12);
      mottle.fillStyle(0x120e0a, 0.12 + rand() * 0.08);
      mottle.fillEllipse(x, y, width, height);
    }
    this.track(mottle);
  }

  private createObstacles(): void {
    for (const rect of [...LIBRARY_WALL_RECTS, ...LIBRARY_SOLID_RECTS]) this.addRectCollider(rect);
    const threshold = this.scene.add.rectangle(LIBRARY_EXIT_THRESHOLD.x + LIBRARY_EXIT_THRESHOLD.width / 2,
      LIBRARY_EXIT_THRESHOLD.y + LIBRARY_EXIT_THRESHOLD.height / 2, LIBRARY_EXIT_THRESHOLD.width,
      LIBRARY_EXIT_THRESHOLD.height, 0x000000, 0).setVisible(false);
    this.scene.physics.add.existing(threshold, true);
    this.exitThresholdBody = threshold.body as Phaser.Physics.Arcade.StaticBody;
    this.objects.push(threshold);
    this.bodies.push(this.exitThresholdBody);
    this.colliders.push(this.scene.physics.add.collider(this.player.sprite, threshold));
  }

  private drawRoomArt(): void {
    for (const shelf of LIBRARY_LAYOUT.shelves) {
      this.addImage('room-bookshelf', shelf.x, shelf.y, 80, 80, this.depthAt(shelf.y + 40), true);
    }
    this.drawTopWallShelves();
    this.drawHangingLanterns();
    this.drawInscriptionTablet();
    this.addImage('room-test-desk', LIBRARY_LAYOUT.desk.x, LIBRARY_LAYOUT.desk.y,
      LIBRARY_LAYOUT.desk.width, LIBRARY_LAYOUT.desk.height, this.depthAt(LIBRARY_LAYOUT.desk.y + 27), true);
    this.bookLayers = [
      this.addImage('test-book-body', LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 56, 40, this.depthAt(273), true),
      this.addImage('test-book-bright-layer', LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 56, 40, this.depthAt(273) + 0.1, true),
      this.addImage('test-book-dark-layer', LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 56, 40, this.depthAt(273) + 0.1, true),
    ];
    this.bookLayers[1].setVisible(false);
    this.bookLayers[2].setVisible(false);
    this.bookInkOverlay = this.createBookInkOverlay();
    this.createBookGlow();
    const mural = this.addImage(this.isMuralOpen() ? 'room-panel-open' : 'room-panel-closed',
      LIBRARY_LAYOUT.mural.x, LIBRARY_LAYOUT.mural.y, LIBRARY_LAYOUT.art.panelWidth,
      LIBRARY_LAYOUT.art.panelHeight, this.depthAt(200), true);
    mural.setData('library-mural', true);
    const sunGlow = this.scene.add.image(LIBRARY_MURAL_SUN.x, LIBRARY_MURAL_SUN.y, 'light_radial')
      .setTint(LIBRARY_WARM).setBlendMode(Phaser.BlendModes.ADD).setScale(0.36).setAlpha(0.5)
      .setDepth(LIBRARY_GLOW_DEPTH).setVisible(this.isMuralOpen());
    this.track(sunGlow);
    this.muralSunGlow = sunGlow;
    this.glowTweens.push(this.scene.tweens.add({
      targets: sunGlow, alpha: { from: 0.5, to: 0.72 }, duration: 2000,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    }));
    this.addExitArt();
  }

  /** A row of bookshelves along the top wall; the north-wall arch stays clear and the big shelf is drawn separately. */
  private drawTopWallShelves(): void {
    for (let x = 40; x <= 600; x += 76) {
      if (x + 32 > LIBRARY_ARCH_CLEAR.min && x - 32 < LIBRARY_ARCH_CLEAR.max) continue;
      this.track(this.scene.add.image(x, 80, this.textureKey('room-bookshelf'))
        .setOrigin(0.5, 1).setDisplaySize(64, 64).setTint(0x9a8f80).setDepth(this.depthAt(78)));
    }
  }

  /** Lanterns hang on the top wall between the shelves, each with a slowly breathing warm glow. */
  private drawHangingLanterns(): void {
    const keys = ['lantern_hang_1', 'lantern_hang_2', 'lantern_hang_3'].filter((key) => this.scene.textures.exists(key));
    LIBRARY_HANG_XS.forEach((x, index) => {
      if (keys.length > 0) this.track(this.scene.add.image(x, 62, keys[index % keys.length]).setDisplaySize(16, 33).setDepth(this.depthAt(78)));
      const glow = this.scene.add.image(x, 62, 'light_radial')
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.32).setAlpha(0.5).setDepth(LIBRARY_GLOW_DEPTH);
      this.track(glow);
      this.glowTweens.push(this.scene.tweens.add({
        targets: glow, alpha: { from: 0.4, to: 0.55 }, duration: 1800 + index * 150,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: index * 260,
      }));
    });
  }

  /**
   * Carved inscription tablet standing on the floor beside the entry path: a warm stone with a sun
   * glyph and three engraved lines on top, depth-sorted by its base like every other prop.
   * The interaction and its prompt bounds are registered in registerInteractions().
   */
  private drawInscriptionTablet(): void {
    const { x, baseY, width, height } = LIBRARY_LAYOUT.inscription;
    const centerY = baseY - height / 2;
    const depth = this.depthAt(baseY);
    // Contact shadow so the free-standing stone reads as standing on the floor.
    this.track(this.scene.add.ellipse(x, baseY - 2, width * 0.8, 6, 0x000000, 0.28).setDepth(depth - 0.1));
    this.inscriptionImage = this.addImage('tablet-body', x, centerY, width, height, depth).setTint(LIBRARY_TABLET_STONE);
    const engraving = this.scene.add.graphics().setDepth(depth + 0.05);
    engraving.lineStyle(1, LIBRARY_TABLET_GOLD, 0.8);
    // Sun glyph: a half-disc on a short horizon line in the upper part of the tablet.
    const horizonY = centerY - 12;
    engraving.beginPath();
    engraving.arc(x, horizonY, 4, Math.PI, Math.PI * 2, false);
    engraving.strokePath();
    engraving.lineBetween(x - 8, horizonY, x + 8, horizonY);
    // Three engraved lines of text below the sun, each a little shorter than the last.
    engraving.lineBetween(x - 8, centerY + 4, x + 8, centerY + 4);
    engraving.lineBetween(x - 7, centerY + 9, x + 7, centerY + 9);
    engraving.lineBetween(x - 8, centerY + 14, x + 6, centerY + 14);
    this.track(engraving);
    this.track(this.scene.add.image(x, centerY, 'light_radial')
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.26).setAlpha(0.5).setDepth(LIBRARY_GLOW_DEPTH));
  }

  /** Dark-ink copy of the book page with a small cyan glow; visible only while the lantern is off. */
  private createBookInkOverlay(): Phaser.GameObjects.Container {
    const glow = this.scene.add.image(0, 0, 'light_radial').setTint(LIBRARY_CYAN)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0.45);
    const layer = this.scene.add.image(0, 0, this.textureKey('test-book-dark-layer')).setDisplaySize(56, 40);
    const overlay = this.scene.add.container(LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, [glow, layer])
      .setDepth(LIBRARY_INK_DEPTH).setVisible(false);
    this.setInkFade(overlay, this.player.x, this.player.y);
    this.track(overlay);
    return overlay;
  }

  /** Gentle warm pulse that marks the reading desk; updateVisualState hides it once the book is practised. */
  private createBookGlow(): void {
    const glow = this.scene.add.image(LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 'light_radial')
      .setTint(LIBRARY_WARM).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setAlpha(0.4).setDepth(LIBRARY_GLOW_DEPTH);
    this.track(glow);
    this.bookGlow = glow;
    this.glowTweens.push(this.scene.tweens.add({
      targets: glow, alpha: { from: 0.3, to: 0.6 }, duration: 1600,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    }));
  }

  private drawTabletsAndSockets(): void {
    const well = this.addImage('room-well-closed', LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y,
      LIBRARY_LAYOUT.well.width, LIBRARY_LAYOUT.well.height, 5);
    well.setData('library-well', true);
    this.coreGlow = this.scene.add.image(LIBRARY_LAYOUT.core.x, LIBRARY_LAYOUT.core.y, 'light_radial')
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.45).setAlpha(0.3).setDepth(LIBRARY_GLOW_DEPTH);
    this.track(this.coreGlow);
    for (let i = 0; i < LIBRARY_LAYOUT.seats.length; i += 1) {
      const point = LIBRARY_LAYOUT.seats[i];
      const socket = this.addImage('socket-empty', point.x, point.y, 48, 48, LIBRARY_LAYOUT.groundDepth);
      socket.setData('library-socket', i);
      this.socketImages.push(socket);
    }
    this.drawCycleMarks();
    for (const point of LIBRARY_LAYOUT.racks) {
      const stand = this.addImage('socket-empty', point.x, point.y, LIBRARY_LAYOUT.art.rack, LIBRARY_LAYOUT.art.rack,
        this.depthAt(point.y + LIBRARY_LAYOUT.art.rack / 2), true).setVisible(false);
      this.rackEmptyStands.push(stand);
    }
    if (this.progress.flags['l2-memory'] && !this.progress.flags['l2-crystal']) {
      const crystal = this.addImage('room-memory-crystal', LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y, 28, 36, 35, true);
      crystal.setData('library-crystal', true);
    }
    this.redrawTabletStacks();
  }

  private drawCycleMarks(): void {
    const start = LIBRARY_LAYOUT.seats[0];
    const markY = start.y + 36;
    // Dark backing disc above the well art keeps the start sun readable on the carved lid.
    const backing = this.scene.add.graphics().setDepth(LIBRARY_LAYOUT.groundDepth - 0.45);
    backing.fillStyle(0x0d1414, 0.75);
    backing.fillCircle(start.x, markY, 13);
    this.track(backing);
    this.addImage('bright-horizon-sun', start.x, markY, 30, 30, LIBRARY_LAYOUT.groundDepth - 0.4).setTint(LIBRARY_WARM);
    // Soft warm glow above the darkness so the start marker stays visible with the lantern off.
    const glow = this.scene.add.image(start.x, markY, 'light_radial')
      .setTint(LIBRARY_WARM).setBlendMode(Phaser.BlendModes.ADD).setScale(0.18).setAlpha(0.45).setDepth(LIBRARY_GLOW_DEPTH);
    this.track(glow);
    const graphics = this.scene.add.graphics().setDepth(LIBRARY_LAYOUT.groundDepth - 0.4);
    graphics.fillStyle(0xd8b869, 0.55);
    graphics.lineStyle(3, 0xd8b869, 0.55);
    const radius = LIBRARY_LAYOUT.core.radius + 16;
    for (const angle of [315, 45, 135, 225]) {
      const radians = Phaser.Math.DegToRad(angle);
      const px = LIBRARY_LAYOUT.core.x + Math.cos(radians) * radius;
      const py = LIBRARY_LAYOUT.core.y + Math.sin(radians) * radius;
      const dx = -Math.sin(radians);
      const dy = Math.cos(radians);
      graphics.lineBetween(px - dx * 10, py - dy * 10, px + dx * 2, py + dy * 2);
      graphics.fillTriangle(px + dx * 8, py + dy * 8, px + dx - dy * 5, py + dy + dx * 5, px + dx + dy * 5, py + dy - dx * 5);
    }
    this.track(graphics);
  }

  private registerInteractions(): void {
    const inscription = LIBRARY_LAYOUT.inscription;
    this.register({ id: 'library-inscription', x: inscription.x, y: inscription.y, radius: inscription.radius,
      getPrompt: () => 'E · Đọc dòng khắc',
      // Rule 1: the stand sits on the tablet's south edge; the label anchors to the stone's own bounds.
      getPromptBounds: () => this.inscriptionImage?.getBounds() ?? null,
      onInteract: () => {
        this.progress.flags['l2-inscription-read'] = true;
        this.save();
        this.say([{ speaker: 'Hệ thống', text: INSCRIPTION }]);
      } });
    this.register({ id: 'library-book', x: LIBRARY_LAYOUT.book.x, y: 278, radius: 22,
      getPrompt: () => 'E · Xem lớp mực (F đổi đèn)', getPromptBounds: () => this.bookLayers[0]?.getBounds() ?? null,
      onInteract: () => this.readBook() });
    LIBRARY_LAYOUT.racks.forEach((point, rackIndex) => this.register({
      id: `library-rack-${rackIndex}`, x: point.x, y: point.y + LIBRARY_LAYOUT.rackStandOffset, radius: 22,
      getPrompt: () => {
        const stone = this.rackStone(rackIndex);
        return stone ? `E · Xem và chọn phiến ${LABELS[stone]}` : '';
      },
      getPromptBounds: () => this.tabletStacks.get(this.rackKey(rackIndex))?.getBounds()
        ?? this.rackEmptyStands[rackIndex]?.getBounds() ?? null,
      onInteract: () => this.pressRack(rackIndex),
      // An empty rack has no tablet to read, so it offers no prompt at all.
      isEnabled: () => this.rackStone(rackIndex) !== null,
    }));
    LIBRARY_LAYOUT.seatApproaches.forEach((point, seatIndex) => this.register({
      id: `library-seat-${seatIndex}`, x: point.x, y: point.y, radius: 40,
      getPrompt: () => (this.isPlayerInCell(LIBRARY_LAYOUT.seats[seatIndex], LIBRARY_CELL_HALF) ? this.seatPrompt(seatIndex) : ''),
      getPromptBounds: () => this.tabletStacks.get(this.seatKey(seatIndex))?.getBounds() ?? this.socketImages[seatIndex].getBounds(),
      onInteract: () => this.interactWithSeat(seatIndex),
      isEnabled: () => true,
    }));
    this.register({ id: 'library-confirm', x: LIBRARY_LAYOUT.confirm.x, y: LIBRARY_LAYOUT.confirm.y, radius: LIBRARY_LAYOUT.confirm.radius,
      getPrompt: () => this.progress.flags['l2-memory'] ? 'Vòng ngày đêm đã phục hồi' : 'E · Kiểm tra vòng ở bệ giữa',
      getPromptBounds: () => ({ ...LIBRARY_DAIS }),
      onInteract: () => this.checkMemory(), isEnabled: () => this.progress.flags['l2-memory'] !== true });
    this.register({ id: 'library-crystal', x: LIBRARY_LAYOUT.confirm.x, y: LIBRARY_LAYOUT.confirm.y, radius: LIBRARY_LAYOUT.confirm.radius,
      getPrompt: () => 'E · Nhận Tinh thể Ký Ức',
      getPromptBounds: () => this.objects.find((object) => object.getData('library-crystal') === true) instanceof Phaser.GameObjects.Image
        ? (this.objects.find((object) => object.getData('library-crystal') === true) as Phaser.GameObjects.Image).getBounds() : null,
      onInteract: () => this.collectCrystal(), isEnabled: () => this.progress.flags['l2-memory'] === true && this.progress.flags['l2-crystal'] !== true });
    this.register({ id: 'library-mural', x: LIBRARY_LAYOUT.muralStand.x, y: LIBRARY_LAYOUT.muralStand.y, radius: 22,
      getPrompt: () => this.progress.flags['l2-fifth-viewed'] ? 'E · Đọc lại bức tranh thứ năm' : 'E · Đọc bức tranh thứ năm sau vách rễ',
      getPromptBounds: () => this.objects.find((object) => object.getData('library-mural') === true) instanceof Phaser.GameObjects.Image
        ? (this.objects.find((object) => object.getData('library-mural') === true) as Phaser.GameObjects.Image).getBounds() : null,
      onInteract: () => this.readMural(), isEnabled: () => this.progress.flags['l2-crystal'] === true });
    this.register({ id: 'library-exit', x: LIBRARY_LAYOUT.exit.x, y: LIBRARY_LAYOUT.exit.y, radius: LIBRARY_LAYOUT.exit.radius,
      getPrompt: () => this.isExitOpen() ? 'E · Qua cổng đá' : 'E · Kiểm tra cổng đá phía Đông Bắc',
      getPromptBounds: () => this.exitImages[0]?.getBounds() ?? null,
      onInteract: () => this.useExit(), isEnabled: () => true });
  }

  private register(config: InteractableConfig): void { this.interactions.register(config); }

  private readBook(): void {
    const state = this.lantern.lanternOn ? 'lit' : 'dark';
    this.progress.flags[`l2-book-${state}`] = true;
    this.save();
    const observation: DialogueLine[] = [{ speaker: 'Nhinh', text: BOOK_OBSERVATION[state] }];
    const bothLayersSeen = this.progress.flags['l2-book-lit'] === true && this.progress.flags['l2-book-dark'] === true;
    // The realisation belongs to the first read that completes both observations, in either order.
    if (bothLayersSeen && !this.progress.flags['l2-book-practice']) {
      this.progress.flags['l2-book-practice'] = true;
      this.save();
      this.updateVisualState(true);
      this.say([...observation, ...BOOK_LAYERS_SEEN]);
      return;
    }
    // A re-read repeats only the observation; control keys stay in the instruction channel.
    this.say(observation);
  }

  /** E on a rack: read and select the tablet; a second E on it in the same light deselects it. */
  private pressRack(rackIndex: number): void {
    const stone = this.rackStone(rackIndex);
    if (!stone) return;
    const state = this.lantern.lanternOn ? 'lit' : 'dark';
    if (this.selectedStone === STONES.indexOf(stone) && this.lastInspected === `${stone}-${state}`) {
      this.selectedStone = null;
      this.redrawTabletStacks();
      this.showToast(`Bỏ chọn phiến ${LABELS[stone]}`);
      return;
    }
    this.inspectAndSelect(stone);
  }

  private inspectAndSelect(stone: Stone): void {
    this.selectedStone = STONES.indexOf(stone);
    const lines = this.readTablet(stone);
    this.redrawTabletStacks();
    this.say(lines);
  }

  /**
   * Records the layer currently shown and returns its reading. The layer itself is always spoken;
   * the approved pair and all-layers remarks are added only when their observations actually exist.
   */
  private readTablet(stone: Stone): DialogueLine[] {
    const state = this.lantern.lanternOn ? 'lit' : 'dark';
    this.progress.flags[`l2-${stone}-${state}`] = true;
    this.lastInspected = `${stone}-${state}`;
    // The approved line is the observation itself; the tablet name lives in the prompt and journal.
    const lines: DialogueLine[] = [{ speaker: 'Nhinh', text: CLUES[stone][state] }];
    // A pair remark waits until both layers of both tablets have really been observed, in any order.
    // The flags guard repetition; checking on every read also lets a save made before this remark existed play it.
    const pairSeen = (a: Stone, b: Stone) => ['lit', 'dark'].every((layer) => this.progress.flags[`l2-${a}-${layer}`] === true
      && this.progress.flags[`l2-${b}-${layer}`] === true);
    if (!this.progress.flags['l2-horizon-pair-read'] && pairSeen('bird', 'boat')) {
      this.progress.flags['l2-horizon-pair-read'] = true;
      lines.push(...HORIZON_PAIR);
    }
    if (!this.progress.flags['l2-arc-pair-read'] && pairSeen('leaf', 'seed')) {
      this.progress.flags['l2-arc-pair-read'] = true;
      lines.push(...ARC_PAIR);
    }
    // The "arrange them now" remark would be false after the ring is already restored.
    if (!this.progress.flags['l2-memory'] && this.allTabletLayersSeen() && !this.progress.flags['l2-clues-ready']) {
      this.progress.flags['l2-clues-ready'] = true;
      lines.push(...ALL_LAYERS);
    }
    this.save();
    return lines;
  }

  /** E on a seat: read the tablet there, select it when nothing is selected, or place the selected one. */
  private interactWithSeat(seatIndex: number): void {
    const slots = [...this.readSlots()];
    const occupying = slots[seatIndex];
    // After the check the ring is fixed: a seat only reads its tablet and never selects one.
    if (this.progress.flags['l2-memory']) {
      if (occupying >= 0) this.say(this.readTablet(STONES[occupying]));
      else this.showToast('Hốc này đang trống.');
      return;
    }
    if (this.selectedStone === null) {
      if (occupying >= 0) this.inspectAndSelect(STONES[occupying]);
      else this.showToast('Hãy chọn một phiến ở giá đá trước.');
      return;
    }
    // The selected tablet already sits in this seat: reading it is all E does here.
    if (occupying === this.selectedStone) {
      this.say(this.readTablet(STONES[occupying]));
      return;
    }
    const oldSeat = slots.indexOf(this.selectedStone);
    if (oldSeat >= 0) slots[oldSeat] = occupying;
    slots[seatIndex] = this.selectedStone;
    this.selectedStone = null;
    this.writeSlots(slots);
    SoundSystem.playRuneActivate(seatIndex + 1);
    this.showToast(`Đã đặt phiến vào hốc ${SEAT_NAMES[seatIndex]}`);
  }

  private seatPrompt(seatIndex: number): string {
    const occupant = this.readSlots()[seatIndex];
    if (this.progress.flags['l2-memory']) return occupant >= 0 ? `E · Đọc phiến ${LABELS[STONES[occupant]]}` : 'Hốc trống';
    if (occupant >= 0 && occupant === this.selectedStone) return `E · Đọc phiến ${LABELS[STONES[occupant]]}`;
    if (occupant >= 0) return this.selectedStone === null ? `E · Chọn phiến ${LABELS[STONES[occupant]]}` : 'E · Đặt hoặc đổi phiến';
    if (this.selectedStone === null) return 'Hốc trống · Chọn phiến ở giá đá trước';
    return seatIndex === 0 ? 'E · Đặt phiến ở hốc có dấu mặt trời' : 'E · Đặt phiến đã chọn';
  }

  /** Short non-blocking confirmation near the top centre; a new toast replaces the one on screen. */
  private showToast(message: string): void {
    this.toastTimer?.remove(false);
    if (this.toast?.active) this.toast.destroy();
    this.toast = this.scene.add.text(320, 80, message, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', color: '#f7dfaa', backgroundColor: '#07151cdd', padding: { x: 9, y: 5 },
    }).setOrigin(0.5, 0.5).setDepth(88);
    this.toastTimer = this.scene.time.delayedCall(TOAST_MS, () => {
      if (this.toast?.active) this.toast.destroy();
      this.toast = undefined;
    });
  }

  private checkMemory(): void {
    if (this.progress.flags['l2-memory']) return;
    const slots = this.readSlots();
    if (slots.join(',') !== '0,1,2,3') {
      if (slots.includes(-1)) {
        this.showToast('Vẫn còn hốc trống. Hãy đặt đủ bốn phiến trước khi kiểm tra.');
        return;
      }
      this.progress.flags['l2-check-failed'] = true;
      this.save();
      SoundSystem.playPuzzleError();
      const isRotationOf = (base: readonly number[]) => base.some((_, shift) => base.every((value, index) => slots[(index + shift) % base.length] === value));
      if (isRotationOf([0, 1, 2, 3])) {
        this.say([
          { speaker: 'Nhinh', text: 'Các thời khắc đã nối đúng nhau, nhưng mình bắt đầu nhầm chỗ rồi.' },
          { speaker: 'Lumo', text: 'Hốc có dấu mặt trời phải là lúc một ngày vừa bắt đầu.' },
        ]);
        return;
      }
      if (isRotationOf([0, 3, 2, 1])) {
        this.say([{ speaker: 'Nhinh', text: 'Mình đang đi ngược những mũi tên quanh giếng. Thử đổi chiều xem.' }]);
        return;
      }
      this.say([
        { speaker: 'Nhinh', text: 'Chưa được rồi. Có chỗ nào đó không khớp.' },
        { speaker: 'Lumo', text: 'Mình xem lại từng phiến nhé. Nhớ cả hình dưới ánh đèn lẫn những nét hiện trong bóng tối.' },
      ]);
      return;
    }
    this.progress.flags['l2-memory'] = true;
    // The ring is fixed now, so no tablet stays selected.
    this.selectedStone = null;
    this.save();
    SoundSystem.playPuzzleSolved();
    this.celebrateSolve();
    this.updateVisualState(true);
    this.say([{ speaker: 'Nhinh', text: 'Bình minh, ban ngày, hoàng hôn… rồi đêm.' }, { speaker: 'Lumo', text: 'Tôi đã quên khu rừng từng đổi màu đẹp thế nào.' }]);
  }

  /** Correct arrangement: warm glows run clockwise through the four seats (N, E, S, W) as the well opens. */
  private celebrateSolve(): void {
    LIBRARY_LAYOUT.seats.forEach((seat, index) => this.flashGlow(seat.x, seat.y, index * SEAT_FLASH_STEP_MS, 0.3, 0.9));
  }

  /** A brief warm ADD glow that swells and fades; tracked so destroy() stops its tween and removes it. */
  private flashGlow(x: number, y: number, delay: number, scale: number, peakAlpha: number): void {
    const glow = this.scene.add.image(x, y, 'light_radial')
      .setTint(LIBRARY_WARM).setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(0).setDepth(LIBRARY_GLOW_DEPTH);
    this.track(glow);
    this.glowTweens.push(this.scene.tweens.add({
      targets: glow, alpha: { from: 0, to: peakAlpha }, duration: 120, delay, hold: 60, yoyo: true,
      ease: 'Sine.easeOut', onComplete: () => { if (glow.active) glow.destroy(); },
    }));
  }

  private collectCrystal(): void {
    if (!this.progress.flags['l2-memory'] || this.progress.flags['l2-crystal']) return;
    this.progress.flags['l2-crystal'] = true;
    this.progress.flags['l2-plan-recorded'] = true;
    this.save();
    SoundSystem.playCrystalPickup();
    this.removeCrystalImage();
    // Taking the crystal opens the gate: this call swaps the arch art and disables the threshold
    // body in the same frame as the pickup.
    this.updateVisualState(true);
    // The mural's sun and the gate both brighten once as the crystal opens the wall.
    this.flashGlow(LIBRARY_MURAL_SUN.x, LIBRARY_MURAL_SUN.y, 0, 0.5, 0.9);
    this.flashGlow(LIBRARY_EXIT_GLOW.x, LIBRARY_EXIT_GLOW.y, 0, 0.7, 0.9);
    this.showToast('Lối ra đã mở');
    this.say([
      { speaker: 'Nhinh', text: 'Viên tinh thể này vẫn còn sáng.' },
      { speaker: 'Lumo', text: 'Ký Ức… Tôi nhớ ra rồi! Đây là một mảnh trái tim Cây Mẹ.' },
      { speaker: 'Nhinh', text: 'Trái tim của cây đã vỡ sao?' },
      { speaker: 'Lumo', text: 'Ừ. Có ba mảnh: Ký Ức, Hy Vọng và Cân Bằng. Những cái tên ấy được khắc trên rễ cây.' },
      { speaker: 'Nhinh', text: 'Nếu mang đủ ba mảnh về, Cây Mẹ có hồi phục được không?' },
      { speaker: 'Lumo', text: 'Tôi tin là được. Chúng ta sẽ thắp sáng lại trái tim nó. Khu rừng sẽ hồi sinh.' },
      { speaker: 'Nhinh', text: 'Vậy mình thử nhé. Tôi cũng muốn thấy nơi này lúc trời sáng.' },
      { speaker: 'Nhinh', text: 'Mảnh này để tôi giữ. Mình cùng tìm hai mảnh còn lại.' },
    ]);
  }

  private readMural(): void {
    if (!this.progress.flags['l2-crystal']) return;
    if (this.progress.flags['l2-fifth-viewed']) {
      this.say([{ speaker: 'Nhinh', text: 'Những đường nứt chạy từ bánh xe về phía Cây Mẹ.' }]);
      return;
    }
    this.say([
      { speaker: 'Nhinh', text: 'Người này đang giữ một bánh xe có hình mặt trời.' },
      { speaker: 'Nhinh', text: 'Trời đã đầy sao mà mặt trời vẫn chưa lặn…' },
      { speaker: 'Lumo', text: '…' },
      { speaker: 'Nhinh', text: 'Cậu sao thế, Lumo?' },
      { speaker: 'Lumo', text: 'Tôi chợt nhớ tiếng mưa. Và có ai đó nói… đừng để đèn tắt.' },
      { speaker: 'Nhinh', text: 'Chiếc đèn này cũng có lời nhắn phải giữ ánh sáng.' },
      { speaker: 'Lumo', text: 'Có thể có liên quan. Nhưng tôi không nhớ người nói là ai.' },
      { speaker: 'Nhinh', text: 'Mình ghi lại đã. Cậu không cần cố nhớ ngay đâu.' },
    ], () => {
      // Optional story only: the gate already opened when the crystal was taken.
      this.progress.flags['l2-fifth-viewed'] = true;
      this.save();
      this.updateVisualState(true);
    });
  }

  private useExit(): void {
    if (!this.isExitOpen()) {
      this.say([{ speaker: 'Nhinh', text: this.exitBlockedMessage() }]);
      return;
    }
    this.nextLevel([
      { speaker: 'Lumo', text: 'Lối này dẫn ra suối. Dòng nước từng chảy tới tận rễ Cây Mẹ.' },
      { speaker: 'Nhinh', text: 'Còn hai mảnh tinh thể thì sao?' },
      { speaker: 'Lumo', text: 'Tôi nhớ có một ngọn tháp ở cuối dòng. Có lẽ mình nên tới đó tìm.' },
      { speaker: 'Nhinh', text: 'Vậy trước hết mình phải tìm đường qua suối.' },
    ]);
  }

  private updateVisualState(force: boolean): void {
    const lit = this.lantern.lanternOn;
    const exitOpen = this.isExitOpen();
    if (!force && lit === this.lastLanternState && exitOpen === this.lastExitOpen) return;
    this.lastLanternState = lit;
    this.lastExitOpen = exitOpen;
    this.bookLayers[1]?.setVisible(lit);
    this.bookLayers[2]?.setVisible(!lit);
    this.bookInkOverlay?.setVisible(!lit);
    this.bookGlow?.setVisible(this.progress.flags['l2-book-practice'] !== true);
    this.exitGlow?.setTint(exitOpen ? 0xffffff : LIBRARY_CYAN).setAlpha(exitOpen ? 0.4 : 0.15);
    this.coreGlow?.setTint(lit ? LIBRARY_WARM : LIBRARY_CYAN);
    this.syncCorePulse();
    for (const [key, stack] of this.tabletStacks) {
      const identity = stack.getData('library-identity') as number | undefined;
      if (identity === undefined) continue;
      const clue = stack.list.find((child) => child instanceof Phaser.GameObjects.Image && child.getData('library-clue') === true);
      if (clue instanceof Phaser.GameObjects.Image) {
        const stone = STONES[identity];
        const filename = this.clueFilename(stone, lit);
        const texture = this.textureKey(filename);
        if (clue.texture.key !== texture) clue.setTexture(texture);
      }
      const selected = identity === this.selectedStone;
      const marker = stack.list.find((child) => child instanceof Phaser.GameObjects.Image && child.getData('library-selection') === true);
      if (marker instanceof Phaser.GameObjects.Image) marker.setVisible(selected);
      const ink = stack.getData('library-ink') as Phaser.GameObjects.Container | undefined;
      if (ink) this.syncInkOverlay(ink, STONES[identity], lit, selected);
    }
    const mural = this.objects.find((object) => object.getData('library-mural') === true);
    if (mural instanceof Phaser.GameObjects.Image) {
      const key = this.textureKey(this.isMuralOpen() ? 'room-panel-open' : 'room-panel-closed');
      if (mural.texture.key !== key) mural.setTexture(key);
    }
    this.muralSunGlow?.setVisible(this.isMuralOpen());
    const well = this.objects.find((object) => object.getData('library-well') === true);
    if (well instanceof Phaser.GameObjects.Image) {
      const key = this.textureKey(this.progress.flags['l2-memory'] ? 'room-well-open' : 'room-well-closed');
      if (well.texture.key !== key) well.setTexture(key);
    }
    this.syncCrystal();
    if (this.exitThresholdBody) this.exitThresholdBody.enable = !exitOpen;
    this.updateExitTextures(exitOpen);
  }

  /** Brightens the well core while all four seats are filled, until the arrangement is checked. */
  private syncCorePulse(): void {
    const ready = this.progress.flags['l2-memory'] !== true && this.allSeatsFilled();
    if (ready && !this.corePulseTween && this.coreGlow) {
      this.corePulseTween = this.scene.tweens.add({
        targets: this.coreGlow, alpha: { from: 0.3, to: 0.6 }, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.glowTweens.push(this.corePulseTween);
    } else if (!ready && this.corePulseTween) {
      this.corePulseTween.stop();
      const index = this.glowTweens.indexOf(this.corePulseTween);
      if (index >= 0) this.glowTweens.splice(index, 1);
      this.corePulseTween = undefined;
      this.coreGlow?.setAlpha(0.3);
    }
  }

  private redrawTabletStacks(): void {
    for (const stack of this.tabletStacks.values()) this.destroyTabletStack(stack);
    this.tabletStacks.clear();
    const slots = this.readSlots();
    const occupied = new Set(slots.filter((id) => id >= 0));
    for (let index = 0; index < LIBRARY_LAYOUT.racks.length; index += 1) {
      const identity = STONES.indexOf(RACK_ORDER[index]);
      this.rackEmptyStands[index].setVisible(occupied.has(identity));
      if (occupied.has(identity)) continue;
      const pos = LIBRARY_LAYOUT.racks[index];
      this.tabletStacks.set(this.rackKey(index), this.createTabletStack(identity, pos.x, pos.y, this.depthAt(pos.y + 24), this.selectedStone === identity));
    }
    for (let index = 0; index < slots.length; index += 1) {
      const pos = LIBRARY_LAYOUT.seats[index];
      this.socketImages[index].setTexture(this.textureKey(slots[index] >= 0 ? 'socket-occupied' : 'socket-empty'));
      if (slots[index] >= 0) this.tabletStacks.set(this.seatKey(index), this.createTabletStack(slots[index], pos.x, pos.y, LIBRARY_LAYOUT.groundDepth, this.selectedStone === slots[index]));
    }
    this.lastLanternState = !this.lantern.lanternOn;
    this.updateVisualState(true);
  }

  private destroyTabletStack(stack: Phaser.GameObjects.Container): void {
    const ink = stack.getData('library-ink') as Phaser.GameObjects.Container | undefined;
    if (ink) {
      ink.destroy();
      this.objects = this.objects.filter((object) => object !== ink);
    }
    stack.destroy();
    this.objects = this.objects.filter((object) => object !== stack);
  }

  private createTabletStack(identity: number, x: number, y: number, depth: number, selected: boolean): Phaser.GameObjects.Container {
    const stone = STONES[identity];
    const body = this.scene.add.image(0, 0, this.textureKey('tablet-body'));
    const border = this.scene.add.image(0, 0, this.textureKey(BORDER_NAMES[stone]));
    const clue = this.scene.add.image(0, 0, this.textureKey(this.clueFilename(stone, this.lantern.lanternOn))).setData('library-clue', true);
    const selection = this.scene.add.image(0, 0, this.textureKey('socket-selected')).setVisible(selected).setData('library-selection', true);
    const stack = this.scene.add.container(x, y, [body, clue, border, selection]).setDepth(depth);
    stack.setData('library-identity', identity);
    this.objects.push(stack);
    const ink = this.createInkOverlay(stone, x, y, selected);
    stack.setData('library-ink', ink);
    this.objects.push(ink);
    return stack;
  }

  /**
   * Dark-ink copy of a tablet's border, clue and selection marker, drawn above the darkness with a cyan glow.
   * It mirrors the stack at the same position; syncInkOverlay() keeps it visible only while the lantern is off.
   */
  private createInkOverlay(stone: Stone, x: number, y: number, selected: boolean): Phaser.GameObjects.Container {
    const glow = this.scene.add.image(0, 0, 'light_radial').setTint(LIBRARY_CYAN)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.22).setAlpha(0.45);
    const border = this.scene.add.image(0, 0, this.textureKey(BORDER_NAMES[stone]));
    const clue = this.scene.add.image(0, 0, this.textureKey(this.clueFilename(stone, this.lantern.lanternOn))).setData('library-ink-clue', true);
    const selection = this.scene.add.image(0, 0, this.textureKey('socket-selected'))
      .setVisible(selected).setData('library-ink-selection', true);
    const ink = this.scene.add.container(x, y, [glow, clue, border, selection])
      .setDepth(LIBRARY_INK_DEPTH).setVisible(false);
    // Start at the faded alpha for the current player position: a stack redrawn beside the player
    // (e.g. just seated) must not flash over her for one frame before update() runs.
    this.setInkFade(ink, this.player.x, this.player.y);
    return ink;
  }

  /**
   * Every frame, fades each visible dark-ink overlay by its distance from the player: hidden within
   * INK_FADE_NEAR so the copy never covers the actor, fully shown beyond INK_FADE_FAR.
   */
  private updateInkFade(): void {
    const px = this.player.x;
    const py = this.player.y;
    if (this.bookInkOverlay?.visible) this.setInkFade(this.bookInkOverlay, px, py);
    for (const stack of this.tabletStacks.values()) {
      const ink = stack.getData('library-ink') as Phaser.GameObjects.Container | undefined;
      if (ink?.visible) this.setInkFade(ink, px, py);
    }
  }

  private setInkFade(ink: Phaser.GameObjects.Container, px: number, py: number): void {
    const fade = inkOverlayFade(Math.hypot(ink.x - px, ink.y - py));
    ink.setAlpha(INK_OVERLAY_ALPHA * fade);
  }

  private syncInkOverlay(ink: Phaser.GameObjects.Container, stone: Stone, lit: boolean, selected: boolean): void {
    ink.setVisible(!lit);
    const inkClue = ink.list.find((child) => child instanceof Phaser.GameObjects.Image && child.getData('library-ink-clue') === true);
    if (inkClue instanceof Phaser.GameObjects.Image) {
      const texture = this.textureKey(this.clueFilename(stone, lit));
      if (inkClue.texture.key !== texture) inkClue.setTexture(texture);
    }
    const inkSelection = ink.list.find((child) => child instanceof Phaser.GameObjects.Image && child.getData('library-ink-selection') === true);
    if (inkSelection instanceof Phaser.GameObjects.Image) inkSelection.setVisible(selected);
  }

  private addExitArt(): void {
    const scale = LIBRARY_LAYOUT.exit.width / 152;
    const height = 156 * scale;
    const baseKey = this.createArchLayerTexture('woods_arch_locked', 'base');
    this.exitBaseImage = this.scene.add.image(LIBRARY_LAYOUT.exit.x, LIBRARY_LAYOUT.exit.anchorY, baseKey)
      .setOrigin(0.5, 1).setDisplaySize(LIBRARY_LAYOUT.exit.width, height).setDepth(4).setData('library-exit', true);
    this.objects.push(this.exitBaseImage);
    this.artImages.push(this.exitBaseImage);
    const layers = ['header', 'left-post', 'right-post'];
    this.exitImages = layers.map((layer) => {
      const key = this.createArchLayerTexture('woods_arch_locked', layer);
      // Header and posts share the arch base depth: north of the base the player is drawn behind them.
      const image = this.scene.add.image(LIBRARY_LAYOUT.exit.x, LIBRARY_LAYOUT.exit.anchorY, key)
        .setOrigin(0.5, 1).setDisplaySize(LIBRARY_LAYOUT.exit.width, height)
        .setDepth(this.depthAt(LIBRARY_LAYOUT.exit.anchorY))
        .setData('library-exit', true);
      this.objects.push(image);
      this.artImages.push(image);
      if (layer !== 'header') this.protectedImages.add(image);
      return image;
    });
    this.exitGlow = this.scene.add.image(LIBRARY_EXIT_GLOW.x, LIBRARY_EXIT_GLOW.y, 'light_radial')
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.15).setTint(LIBRARY_CYAN)
      .setDepth(LIBRARY_GLOW_DEPTH);
    this.track(this.exitGlow);
  }

  private createArchLayerTexture(textureKey: string, layer: string): string {
    const key = `library-${textureKey}-${layer}`;
    if (this.scene.textures.exists(key)) return key;
    const source = this.scene.textures.get(textureKey).getSourceImage() as HTMLImageElement;
    const texture = this.scene.textures.createCanvas(key, 152, 156);
    if (!texture) throw new Error(`Could not create Level 03 arch layer: ${layer}`);
    const regions: Record<string, [number, number, number, number]> = {
      base: [0, 0, 152, 156], header: [0, 0, 152, 82],
      'left-post': [0, 0, 50, 156], 'right-post': [102, 0, 50, 156],
    };
    const [x, y, width, height] = regions[layer];
    const context = texture.getContext();
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    const fit = Math.min(152 / source.width, 156 / source.height);
    const drawWidth = source.width * fit;
    const drawHeight = source.height * fit;
    context.drawImage(source, (152 - drawWidth) / 2, 156 - drawHeight, drawWidth, drawHeight);
    context.restore();
    texture.refresh();
    return key;
  }

  private updateExitTextures(open: boolean): void {
    const texture = open ? 'woods_arch_open' : 'woods_arch_locked';
    const baseKey = this.createArchLayerTexture(texture, 'base');
    if (this.exitBaseImage && this.exitBaseImage.texture.key !== baseKey) this.exitBaseImage.setTexture(baseKey);
    const layers = ['header', 'left-post', 'right-post'];
    this.exitImages.forEach((image, index) => {
      const key = this.createArchLayerTexture(texture, layers[index]);
      if (image.texture.key !== key) image.setTexture(key);
    });
  }

  private syncCrystal(): void {
    if (this.progress.flags['l2-memory'] === true && this.progress.flags['l2-crystal'] !== true) {
      if (!this.objects.some((object) => object.getData('library-crystal') === true)) {
        const crystal = this.addImage('room-memory-crystal', LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y, 28, 36, 35, true);
        crystal.setData('library-crystal', true);
      }
      if (!this.crystalGlow) this.createCrystalGlow();
    } else {
      this.removeCrystalImage();
      this.destroyCrystalGlow();
    }
  }

  /** Destroys the crystal image and drops it from objects and the protected prompt bounds; used by collection and sync alike. */
  private removeCrystalImage(): void {
    const crystal = this.objects.find((object) => object.getData('library-crystal') === true);
    if (!crystal) return;
    crystal.destroy();
    this.objects = this.objects.filter((object) => object !== crystal);
    this.protectedImages.delete(crystal as Phaser.GameObjects.Image);
  }

  /** Warm golden pulse marking the memory crystal on the well; created and removed only by syncCrystal(). */
  private createCrystalGlow(): void {
    const glow = this.scene.add.image(LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y, 'light_radial')
      .setTint(LIBRARY_WARM).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35).setAlpha(0.45).setDepth(LIBRARY_GLOW_DEPTH);
    this.track(glow);
    this.crystalGlow = glow;
    this.crystalGlowTween = this.scene.tweens.add({
      targets: glow, alpha: { from: 0.45, to: 0.8 }, duration: 1100,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.glowTweens.push(this.crystalGlowTween);
  }

  private destroyCrystalGlow(): void {
    const glow = this.crystalGlow;
    const tween = this.crystalGlowTween;
    if (!glow) return;
    if (tween) {
      tween.stop();
      const index = this.glowTweens.indexOf(tween);
      if (index >= 0) this.glowTweens.splice(index, 1);
    }
    glow.destroy();
    this.objects = this.objects.filter((object) => object !== glow);
    this.crystalGlow = undefined;
    this.crystalGlowTween = undefined;
  }

  private addRectCollider(rect: { x: number; y: number; width: number; height: number }): void {
    const object = this.scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2,
      rect.width, rect.height, 0x000000, 0).setVisible(false);
    this.scene.physics.add.existing(object, true);
    const body = object.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(rect.width, rect.height);
    this.objects.push(object);
    this.bodies.push(body);
    this.colliders.push(this.scene.physics.add.collider(this.player.sprite, object));
  }

  private addImage(filename: string, x: number, y: number, width: number, height: number, depth: number, protect = false): Phaser.GameObjects.Image {
    const image = this.scene.add.image(x, y, this.textureKey(filename)).setDisplaySize(width, height).setDepth(depth);
    this.objects.push(image);
    this.artImages.push(image);
    if (protect) this.protectedImages.add(image);
    return image;
  }

  private textureKey(filename: string): string {
    const key = getLevelArtKey(2, filename);
    if (!key || !this.scene.textures.exists(key)) throw new Error(`Missing required Level 03 art: ${filename}`);
    return key;
  }

  private isPlayerInCell(point: { x: number; y: number }, half: number): boolean {
    return Math.abs(this.player.x - point.x) <= half && Math.abs(this.player.y - point.y) <= half;
  }

  private depthAt(y: number): number { return 10 + y / 10; }
  private track(object: Phaser.GameObjects.GameObject): void { this.objects.push(object); }
  private rackKey(index: number): string { return `rack-${index}`; }
  private seatKey(index: number): string { return `seat-${index}`; }
  private rackStone(rackIndex: number): Stone | null {
    const identity = STONES.indexOf(RACK_ORDER[rackIndex]);
    return this.readSlots().includes(identity) ? null : RACK_ORDER[rackIndex];
  }
  private clueFilename(stone: Stone, lit: boolean): string {
    if (stone === 'bird') return lit ? 'bright-horizon-sun' : 'dark-motion-up';
    if (stone === 'leaf') return lit ? 'bright-high-sun' : 'dark-apex-arc';
    if (stone === 'boat') return lit ? 'bright-horizon-sun' : 'dark-motion-down';
    return lit ? 'bright-high-moon' : 'dark-apex-arc';
  }
  private isMuralOpen(): boolean { return this.progress.flags['l2-crystal'] === true; }
  private allSeatsFilled(): boolean { return this.readSlots().every((slot) => slot >= 0); }
  /** The locked-exit line names the next missing step for the player's current stage. */
  private exitBlockedMessage(): string {
    if (!this.progress.flags['l2-memory']) return 'Cổng đá vẫn đóng. Có lẽ phải khôi phục vòng ngày đêm ở giữa phòng trước.';
    // Approved side copy: the crystal still rests on the well. The gate opens with the crystal alone,
    // so "crystal taken, painting unread" is no longer a closed-gate state and has no line here.
    return 'Viên tinh thể vẫn còn trên bệ. Mình mang theo đã.';
  }
  /** The gate opens the moment the crystal is taken; the fifth painting is optional story, never a key. */
  private isExitOpen(): boolean { return this.progress.flags['l2-crystal'] === true; }

  private hintStage(): string {
    if (this.progress.flags['l2-memory'] && !this.progress.flags['l2-crystal']) return 'crystal';
    // The exit comes first once it is open: reading the mural must never block the way forward.
    if (this.isExitOpen()) return 'exit';
    if (this.isBookStage()) return 'book';
    if (!this.allTabletLayersSeen() && !this.anyTabletPlaced()) return 'clues';
    return 'arrange';
  }

  /** The book stage ends once every layer is read or any tablet is seated; getObjectiveText and hintStage share it. */
  private isBookStage(): boolean {
    return !this.progress.flags['l2-book-practice'] && !this.allTabletLayersSeen() && !this.anyTabletPlaced();
  }

  private anyTabletPlaced(): boolean {
    return this.readSlots().some((slot) => slot >= 0);
  }

  /** The answer is spoken only after all eight layers are read or a check has failed. */
  private isAnswerUnlocked(): boolean {
    return this.allTabletLayersSeen() || this.progress.flags['l2-check-failed'] === true;
  }

  private tabletLayerCount(): number {
    return STONES.reduce((count, stone) => count
      + Number(this.progress.flags[`l2-${stone}-lit`] === true)
      + Number(this.progress.flags[`l2-${stone}-dark`] === true), 0);
  }

  private allTabletLayersSeen(): boolean {
    return STONES.every((stone) => this.progress.flags[`l2-${stone}-lit`] === true
      && this.progress.flags[`l2-${stone}-dark`] === true);
  }

  private getObservedPairHint(): string {
    const birdBoatBrightSeen = this.progress.flags['l2-bird-lit'] === true && this.progress.flags['l2-boat-lit'] === true;
    const leafSeedDarkSeen = this.progress.flags['l2-leaf-dark'] === true && this.progress.flags['l2-seed-dark'] === true;
    if (birdBoatBrightSeen && leafSeedDarkSeen) {
      return 'Xem lớp tối của Chim và Thuyền, rồi lớp sáng của Lá và Hạt để phân biệt từng cặp.';
    }
    if (birdBoatBrightSeen) {
      return 'Xem mũi tên của Chim và Thuyền khi tắt đèn. Xem cả hai lớp của Lá và Hạt.';
    }
    if (leafSeedDarkSeen) {
      return 'Bật đèn để xem Lá và Hạt là mặt trời hay mặt trăng. Xem cả hai lớp của Chim và Thuyền.';
    }
    return 'So Chim với Thuyền ở cả hai lớp, vì chúng giống nhau khi đèn bật. Với Lá và Hạt, xem lớp sáng: chúng giống nhau khi tắt đèn.';
  }

  private sanitizeSavedSlots(): void {
    const sanitized = sanitizeLibrarySlots(this.progress.flags['memory-slots-json']);
    const serialized = JSON.stringify(sanitized);
    if (this.progress.flags['memory-slots-json'] !== serialized) {
      this.progress.flags['memory-slots-json'] = serialized;
      this.save();
    }
    this.slots = sanitized;
    this.slotsSource = serialized;
  }

  /**
   * The memory slots, parsed once per saved value. Prompts and the HUD call this every frame, so the
   * saved string is compared first and JSON is parsed only when it has really changed.
   */
  private readSlots(): readonly number[] {
    const raw = this.progress.flags['memory-slots-json'];
    if (raw !== this.slotsSource) {
      this.slotsSource = raw;
      this.slots = sanitizeLibrarySlots(raw);
    }
    return this.slots;
  }

  private writeSlots(slots: readonly number[]): void {
    const sanitized = sanitizeLibrarySlots(slots);
    const serialized = JSON.stringify(sanitized);
    this.progress.flags['memory-slots-json'] = serialized;
    this.slots = sanitized;
    this.slotsSource = serialized;
    this.save();
    this.redrawTabletStacks();
  }
}
