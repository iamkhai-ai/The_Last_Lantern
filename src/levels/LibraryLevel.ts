import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import { LIBRARY_EXIT_THRESHOLD, LIBRARY_LAYOUT, LIBRARY_SOLID_RECTS, LIBRARY_WALL_RECTS, libraryActorBody, isLibraryPositionSafe, sanitizeLibrarySlots } from '../data/libraryLayout';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';

const STONES = ['bird', 'leaf', 'boat', 'seed'] as const;
type Stone = typeof STONES[number];
const LABELS: Record<Stone, string> = { bird: 'Chim', leaf: 'Lá', boat: 'Thuyền', seed: 'Hạt' };
const RACK_ORDER: Stone[] = ['boat', 'bird', 'seed', 'leaf'];
const CLUES: Record<Stone, { lit: string; dark: string }> = {
  bird: { lit: 'Mặt trời sát chân trời trên mặt nước.', dark: 'Một vạch đi từ dưới lên qua chân trời.' },
  leaf: { lit: 'Mặt trời ở cao. Đường cung quanh nó bị khuyết.', dark: 'Đường cung lên tới đỉnh; thiên thể không còn hiện.' },
  boat: { lit: 'Mặt trời sát chân trời trên mặt nước.', dark: 'Một vạch đi từ trên xuống qua chân trời.' },
  seed: { lit: 'Mặt trăng ở cao. Đường cung quanh nó bị khuyết.', dark: 'Đường cung lên tới đỉnh; thiên thể không còn hiện.' },
};
const TIME_LABELS: Record<Stone, string> = { bird: 'Bình minh', leaf: 'Ban ngày', boat: 'Hoàng hôn', seed: 'Ban đêm' };
const INTRO: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Sách mọc giữa rễ cây.' },
  { speaker: 'Lumo', text: 'Người Elaria gửi ký ức vào đây. Tôi nhớ mùi giấy này.' },
  { speaker: 'Nhinh', text: 'Bốn chỗ trống, bốn bức tranh. Ai đã lấy chúng xuống?' },
  { speaker: 'Lumo', text: 'Có thể cơn chấn động đêm ấy… Tôi không biết.' },
  { speaker: 'Nhinh', text: 'Đặt một ngày trở lại đúng vòng của nó. Đừng bỏ quên giờ nghỉ của những chiếc lá.' },
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
  private bookLayers: Phaser.GameObjects.Image[] = [];
  private bookSeenThisVisit = new Set<string>();
  private selectedStone: number | null = null;
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
  }

  public getProtectedPromptBounds(): PromptRect[] {
    const bounds = [...this.protectedImages].filter((image) => image.active && image.visible).map((image) => image.getBounds());
    for (const stack of this.tabletStacks.values()) if (stack.active && stack.visible) bounds.push(stack.getBounds());
    return bounds;
  }

  public getObjectiveText(): string {
    if (this.progress.flags['l2-memory'] && !this.progress.flags['l2-crystal']) return 'Đứng ở bệ phía nam giếng và nhận Tinh thể Ký Ức bằng E.';
    if (this.progress.flags['l2-crystal'] && !this.progress.flags['l2-fifth-viewed']) return 'Đọc bức tranh sau vách rễ bằng E.';
    if (this.isExitOpen()) return 'Tới lối phía Đông và nhấn E.';
    if (!this.progress.flags['l2-book-practice']) return 'Đọc trang thử bằng E, rồi đổi đèn bằng F.';
    if (!this.progress.flags['l2-memory']) return 'Đọc các lớp mực, xếp phiến quanh giếng và xác nhận ở bệ giữa.';
    return 'Khám phá thư viện.';
  }

  public getStatusText(): string {
    const slots = this.readSlots();
    const placed = slots.filter((slot) => slot >= 0).length;
    const observed = STONES.reduce((count, stone) => count
      + Number(this.progress.flags[`l2-${stone}-lit`] === true)
      + Number(this.progress.flags[`l2-${stone}-dark`] === true), 0);
    if (this.progress.flags['l2-memory']) return `Vòng: đã phục hồi · Tinh thể: ${this.progress.flags['l2-crystal'] ? 'đã nhận' : 'chưa nhận'} · Tranh: ${this.progress.flags['l2-fifth-viewed'] ? 'đã đọc' : 'chưa đọc'}`;
    const selected = this.selectedStone === null ? '' : ` · Đang chọn: ${LABELS[STONES[this.selectedStone]]}`;
    return `Phiến ở giếng ${placed}/4 · Lớp đã đọc ${observed}/8${selected}`;
  }

  public showHint(): void {
    const stage = this.hintStage();
    if (stage !== this.stageKey) { this.stageKey = stage; this.hintIndex = 0; }
    const hints: Record<string, string[]> = {
      book: ['Trang sách ở bàn cho thấy mực thay đổi khi cậu tắt đèn.', 'Trang có hai lớp hình chồng lên nhau.', 'Đứng cạnh sách và nhấn E khi đèn bật, rồi thử lại khi đèn tắt.'],
      clues: ['Mỗi phiến có thể được đọc dưới cả hai trạng thái đèn.', 'Bật đèn để nhận ra thiên thể và vị trí. Tắt đèn để xem đường chuyển động.', 'Từ hốc chân trời sáng, đặt Chim, Lá, Thuyền rồi Hạt; dùng bệ giữa để kiểm tra.'],
      arrange: ['Hốc có dấu chân trời là điểm bắt đầu của vòng.', 'Lần theo mũi tên quanh giếng theo chiều kim đồng hồ.', 'Từ hốc chân trời sáng, đặt Chim, Lá, Thuyền rồi Hạt; dùng bệ giữa để kiểm tra.'],
      crystal: ['Giếng đã mở ở giữa vòng.', 'Đứng ở mép phía nam để tới tinh thể.', 'Nhấn E tại bệ giữa để nhận Tinh thể Ký Ức.'],
      mural: ['Ánh sáng đã mở vách sau rễ cây.', 'Tới trước tấm vách ở phía đông bắc.', 'Đứng trước vách và nhấn E để đọc bức tranh thứ năm.'],
      exit: ['Đường rễ cây dẫn ra phía đông.', 'Lối đi nằm dưới bức tranh thứ năm.', 'Tới cổng ở góc đông nam và nhấn E để đi tiếp.'],
    };
    const choices = hints[stage];
    const message = choices[Math.min(this.hintIndex, choices.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, choices.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  public showJournal(): void {
    const entries: DialogueLine[] = [];
    if (this.progress.flags['l2-inscription-read']) entries.push({ speaker: 'Nhinh', text: 'Dòng khắc: “Đặt một ngày trở lại đúng vòng của nó. Đừng bỏ quên giờ nghỉ của những chiếc lá.”' });
    if (this.progress.flags['l2-book-lit']) entries.push({ speaker: 'Nhinh', text: 'Trang sách · Đèn bật: cánh hoa khép màu vàng.' });
    if (this.progress.flags['l2-book-dark']) entries.push({ speaker: 'Nhinh', text: 'Trang sách · Đèn tắt: hiện nét mực xanh hình trăng lưỡi liềm.' });
    for (const stone of STONES) {
      for (const [state, label] of [['lit', 'Đèn bật'], ['dark', 'Đèn tắt']] as const) {
        if (!this.progress.flags[`l2-${stone}-${state}`]) continue;
        const answer = this.progress.flags['l2-memory'] ? ` · ${TIME_LABELS[stone]}` : '';
        entries.push({ speaker: 'Nhinh', text: `${LABELS[stone]} · ${label}${answer}: ${CLUES[stone][state]}` });
      }
    }
    if (this.progress.flags['l2-memory']) entries.push({ speaker: 'Nhinh', text: 'Vòng ngày đêm: Chim — bình minh; Lá — ban ngày; Thuyền — hoàng hôn; Hạt — ban đêm.' });
    if (this.progress.flags['l2-plan-recorded']) entries.push({ speaker: 'Lumo', text: 'Tìm đủ ba tinh thể để thắp sáng trái tim Cây Mẹ. Rừng sẽ hồi sinh.' });
    if (this.progress.flags['l2-fifth-viewed']) entries.push({ speaker: 'Nhinh', text: 'Vết nứt bắt đầu từ lúc vòng ngày đêm dừng lại.' });
    const lines = entries.length ? entries : [{ speaker: 'Nhinh' as const, text: 'Sổ tay chưa ghi trang sách hay phiến tranh nào.' }];
    this.say([{ speaker: 'Nhinh', text: 'Sổ tay thư viện. Mỗi trang giữ một manh mối đã quan sát.' }, ...lines]);
  }

  private drawFloorAndRoom(): void {
    const floor = this.scene.add.tileSprite(0, 0, 640, 360, 'ground_stone').setOrigin(0).setTint(0xb6a887).setDepth(0);
    this.track(floor);
    const light = this.scene.add.graphics().setDepth(0.5);
    light.fillStyle(0x9d835c, 0.12);
    light.fillRoundedRect(32, 70, 576, 240, 20);
    light.lineStyle(2, 0xb88b4c, 0.18);
    light.strokeRoundedRect(34, 72, 572, 236, 18);
    light.lineStyle(1, 0x5a4330, 0.25);
    light.lineBetween(32, 74, 32, 306);
    light.lineBetween(608, 74, 608, 306);
    this.track(light);
  }

  private createObstacles(): void {
    for (const rect of [...LIBRARY_WALL_RECTS, ...LIBRARY_SOLID_RECTS]) this.addRectCollider(rect);
    const core = this.scene.add.circle(LIBRARY_LAYOUT.core.x, LIBRARY_LAYOUT.core.y, LIBRARY_LAYOUT.core.radius, 0x000000, 0).setVisible(false);
    this.scene.physics.add.existing(core, true);
    const body = core.body as Phaser.Physics.Arcade.StaticBody;
    body.setCircle(LIBRARY_LAYOUT.core.radius);
    this.objects.push(core);
    this.bodies.push(body);
    this.colliders.push(this.scene.physics.add.collider(this.player.sprite, core));
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
    const [leftShelf, rightShelf] = LIBRARY_LAYOUT.shelves;
    this.addImage('room-bookshelf', leftShelf.x, leftShelf.y, 80, 80, this.depthAt(leftShelf.y + 40), true);
    this.addImage('room-bookshelf', rightShelf.x, rightShelf.y, 80, 80, this.depthAt(rightShelf.y + 40), true);
    this.addImage('room-test-desk', LIBRARY_LAYOUT.desk.x, LIBRARY_LAYOUT.desk.y,
      LIBRARY_LAYOUT.desk.width, LIBRARY_LAYOUT.desk.height, this.depthAt(LIBRARY_LAYOUT.desk.y + 27), true);
    const inscription = this.scene.add.text(110, 82, 'DÒNG KHẮC', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '8px', color: '#9db3a0',
      backgroundColor: '#142018aa', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 0).setDepth(10);
    this.objects.push(inscription);
    this.bookLayers = [
      this.addImage('test-book-body', LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 56, 40, this.depthAt(273), true),
      this.addImage('test-book-bright-layer', LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 56, 40, this.depthAt(273) + 0.1, true),
      this.addImage('test-book-dark-layer', LIBRARY_LAYOUT.book.x, LIBRARY_LAYOUT.book.y, 56, 40, this.depthAt(273) + 0.1, true),
    ];
    this.bookLayers[1].setVisible(false);
    this.bookLayers[2].setVisible(false);
    const mural = this.addImage(this.isMuralOpen() ? 'room-panel-open' : 'room-panel-closed',
      LIBRARY_LAYOUT.mural.x, LIBRARY_LAYOUT.mural.y, LIBRARY_LAYOUT.art.panelWidth,
      LIBRARY_LAYOUT.art.panelHeight, this.depthAt(200), true);
    mural.setData('library-mural', true);
    this.addExitArt();
  }

  private drawTabletsAndSockets(): void {
    const well = this.addImage('room-well-closed', LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y,
      LIBRARY_LAYOUT.well.width, LIBRARY_LAYOUT.well.height, 5);
    well.setData('library-well', true);
    for (let i = 0; i < LIBRARY_LAYOUT.seats.length; i += 1) {
      const point = LIBRARY_LAYOUT.seats[i];
      const socket = this.addImage('socket-empty', point.x, point.y, 48, 48, 7 + Math.floor(point.y / 10));
      socket.setData('library-socket', i);
      this.socketImages.push(socket);
    }
    const start = this.addImage('start-horizon', 320, 130, 20, 16, 8);
    start.setData('library-start-marker', true);
    const arrows = [
      { x: 374, y: 132, rotation: Math.PI / 4 },
      { x: 374, y: 244, rotation: 3 * Math.PI / 4 },
      { x: 266, y: 244, rotation: 5 * Math.PI / 4 },
      { x: 266, y: 132, rotation: 7 * Math.PI / 4 },
    ];
    for (const arrow of arrows) {
      const image = this.addImage('route-cue', arrow.x, arrow.y, 24, 12, 8);
      image.setRotation(arrow.rotation);
    }
    if (this.progress.flags['l2-memory'] && !this.progress.flags['l2-crystal']) {
      const crystal = this.addImage('room-memory-crystal', LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y, 28, 36, 35);
      crystal.setData('library-crystal', true);
    }
    this.redrawTabletStacks();
  }

  private registerInteractions(): void {
    this.register({ id: 'library-inscription', x: 110, y: 102, radius: 22,
      getPrompt: () => 'E · Đọc dòng khắc', getPromptBounds: () => ({ x: 102, y: 82, width: 16, height: 24 }),
      onInteract: () => {
        this.progress.flags['l2-inscription-read'] = true;
        this.save();
        this.say([{ speaker: 'Nhinh', text: '“Đặt một ngày trở lại đúng vòng của nó. Đừng bỏ quên giờ nghỉ của những chiếc lá.”' }]);
      } });
    this.register({ id: 'library-book', x: LIBRARY_LAYOUT.book.x, y: 278, radius: 22,
      getPrompt: () => 'E · Đọc trang thử', getPromptBounds: () => this.bookLayers[0]?.getBounds() ?? null,
      onInteract: () => this.readBook() });
    LIBRARY_LAYOUT.racks.forEach((point, rackIndex) => this.register({
      id: `library-rack-${rackIndex}`, x: point.x, y: point.y + LIBRARY_LAYOUT.rackStandOffset, radius: 22,
      getPrompt: () => {
        const stone = this.rackStone(rackIndex);
        return stone ? `E · Xem phiến ${LABELS[stone]}` : 'Giá đá trống';
      },
      getPromptBounds: () => this.tabletStacks.get(this.rackKey(rackIndex))?.getBounds() ?? null,
      onInteract: () => { const stone = this.rackStone(rackIndex); if (stone) this.inspectAndSelect(stone); },
      isEnabled: () => true,
    }));
    LIBRARY_LAYOUT.seatApproaches.forEach((point, seatIndex) => this.register({
      id: `library-seat-${seatIndex}`, x: point.x, y: point.y, radius: 22,
      getPrompt: () => {
        const stone = this.readSlots()[seatIndex];
        if (this.progress.flags['l2-memory']) return stone >= 0 ? `E · Đọc phiến ${LABELS[STONES[stone]]}` : 'Hốc trống';
        return stone >= 0 ? (this.selectedStone === null ? `E · Xem phiến ${LABELS[STONES[stone]]}` : 'E · Đặt hoặc đổi phiến') : 'E · Đặt phiến đã chọn';
      },
      getPromptBounds: () => this.tabletStacks.get(this.seatKey(seatIndex))?.getBounds() ?? this.socketImages[seatIndex].getBounds(),
      onInteract: () => this.interactWithSeat(seatIndex),
      isEnabled: () => true,
    }));
    this.register({ id: 'library-confirm', x: LIBRARY_LAYOUT.confirm.x, y: LIBRARY_LAYOUT.confirm.y, radius: 22,
      getPrompt: () => this.progress.flags['l2-memory'] ? 'Vòng ngày đêm đã phục hồi' : 'E · Kiểm tra vòng ngày đêm',
      getPromptBounds: () => ({ x: 314, y: 182, width: 12, height: 12 }),
      onInteract: () => this.checkMemory(), isEnabled: () => this.progress.flags['l2-memory'] !== true });
    this.register({ id: 'library-crystal', x: LIBRARY_LAYOUT.confirm.x, y: LIBRARY_LAYOUT.confirm.y, radius: 22,
      getPrompt: () => 'E · Nhận Tinh thể Ký Ức',
      getPromptBounds: () => this.objects.find((object) => object.getData('library-crystal') === true) instanceof Phaser.GameObjects.Image
        ? (this.objects.find((object) => object.getData('library-crystal') === true) as Phaser.GameObjects.Image).getBounds() : null,
      onInteract: () => this.collectCrystal(), isEnabled: () => this.progress.flags['l2-memory'] === true && this.progress.flags['l2-crystal'] !== true });
    this.register({ id: 'library-mural', x: LIBRARY_LAYOUT.muralStand.x, y: LIBRARY_LAYOUT.muralStand.y, radius: 22,
      getPrompt: () => this.progress.flags['l2-fifth-viewed'] ? 'E · Đọc lại bức tranh' : 'E · Đọc bức tranh sau vách',
      getPromptBounds: () => this.objects.find((object) => object.getData('library-mural') === true) instanceof Phaser.GameObjects.Image
        ? (this.objects.find((object) => object.getData('library-mural') === true) as Phaser.GameObjects.Image).getBounds() : null,
      onInteract: () => this.readMural(), isEnabled: () => this.progress.flags['l2-crystal'] === true });
    this.register({ id: 'library-exit', x: LIBRARY_LAYOUT.exit.x, y: LIBRARY_LAYOUT.exit.y, radius: 22,
      getPrompt: () => this.isExitOpen() ? 'E · Qua lối rễ cây' : 'E · Kiểm tra cổng phía Đông',
      getPromptBounds: () => this.exitImages[0]?.getBounds() ?? null,
      onInteract: () => this.useExit(), isEnabled: () => true });
  }

  private register(config: InteractableConfig): void { this.interactions.register(config); }

  private readBook(): void {
    const state = this.lantern.lanternOn ? 'lit' : 'dark';
    this.progress.flags[`l2-book-${state}`] = true;
    this.bookSeenThisVisit.add(state);
    this.save();
    let lines: DialogueLine[] = state === 'lit'
      ? [{ speaker: 'Nhinh', text: 'Bật đèn thì thấy cánh hoa khép màu vàng.' }]
      : [{ speaker: 'Nhinh', text: 'Tắt đèn mới thấy những nét mực xanh hình trăng lưỡi liềm.' }];
    if (!this.progress.flags['l2-book-practice'] && this.progress.flags['l2-book-lit'] && this.progress.flags['l2-book-dark']) {
      this.progress.flags['l2-book-practice'] = true;
      this.save();
      lines = [
        { speaker: 'Nhinh', text: 'Bật đèn thì thấy cánh hoa. Tắt đi mới thấy mặt trăng.' },
        { speaker: 'Lumo', text: 'Có cả hai lớp trên cùng một trang.' },
        { speaker: 'Nhinh', text: 'Vậy mình phải xem cả hai.' },
      ];
    }
    this.say(lines);
  }

  private inspectAndSelect(stone: Stone): void {
    const state = this.lantern.lanternOn ? 'lit' : 'dark';
    const other = state === 'lit' ? 'dark' : 'lit';
    const otherLayerWasSeen = this.progress.flags[`l2-${stone}-${other}`] === true;
    this.progress.flags[`l2-${stone}-${state}`] = true;
    this.selectedStone = STONES.indexOf(stone);
    const lines: DialogueLine[] = [{ speaker: 'Nhinh', text: `${LABELS[stone]}: ${CLUES[stone][state]}` }];
    if (stone === 'seed' && state === 'lit') {
      lines[0] = { speaker: 'Nhinh', text: 'Một mặt trăng trên cao. Đường quanh nó bị mất một đoạn.' };
    }
    if (stone === 'seed' && state === 'dark' && otherLayerWasSeen) {
      lines[0] = { speaker: 'Nhinh', text: 'Đường cung hiện rồi. Giống phiến Lá, nhưng ở đó là mặt trời.' };
      lines.push({ speaker: 'Lumo', text: 'Lớp này cho thấy đường đi. Mình phải nhớ cả thiên thể ở lớp kia nữa.' });
    } else if (otherLayerWasSeen) lines.push({ speaker: 'Lumo', text: 'Hai lớp ghép lại mới cho biết thời điểm trong ngày.' });
    const pair = (a: Stone, b: Stone) => ['lit', 'dark'].every((layer) => this.progress.flags[`l2-${a}-${layer}`] && this.progress.flags[`l2-${b}-${layer}`]);
    if (!this.progress.flags['l2-horizon-pair-read'] && pair('bird', 'boat')) {
      this.progress.flags['l2-horizon-pair-read'] = true;
      lines.push({ speaker: 'Nhinh', text: 'Cùng một mặt trời sát chân trời. Một bức đang lên, một bức đang lặn.' },
        { speaker: 'Lumo', text: 'Nếu chỉ để đèn sáng, chúng giống hệt nhau.' });
    }
    this.save();
    this.redrawTabletStacks();
    const allSeen = STONES.every((name) => this.progress.flags[`l2-${name}-lit`] && this.progress.flags[`l2-${name}-dark`]);
    if (allSeen && !this.progress.flags['l2-clues-ready']) {
      this.progress.flags['l2-clues-ready'] = true;
      lines.push({ speaker: 'Nhinh', text: 'Bây giờ mình có đủ manh mối để đặt lại cả vòng.' });
    }
    this.save();
    this.say(lines);
  }

  private interactWithSeat(seatIndex: number): void {
    const slots = this.readSlots();
    const occupying = slots[seatIndex];
    if (this.progress.flags['l2-memory']) {
      if (occupying >= 0) this.inspectAndSelect(STONES[occupying]);
      else this.say([{ speaker: 'Hệ thống', text: 'Hốc này đang trống.' }]);
      return;
    }
    if (this.selectedStone === null) {
      if (occupying >= 0) this.inspectAndSelect(STONES[occupying]);
      else this.say([{ speaker: 'Hệ thống', text: 'Hãy chọn một phiến ở giá đá trước.' }]);
      return;
    }
    const oldSeat = slots.indexOf(this.selectedStone);
    if (oldSeat >= 0) slots[oldSeat] = occupying;
    slots[seatIndex] = this.selectedStone;
    this.selectedStone = null;
    this.writeSlots(slots);
    this.say([{ speaker: 'Nhinh', text: `Đã đặt phiến vào hốc ${seatIndex + 1}.` }]);
  }

  private checkMemory(): void {
    if (this.progress.flags['l2-memory']) return;
    const slots = this.readSlots();
    if (slots.join(',') !== '0,1,2,3') {
      this.say([{ speaker: 'Nhinh', text: 'Vòng này chưa liền mạch.' }, { speaker: 'Lumo', text: 'Mình xem lại đường đi của mặt trời trên từng tranh nhé.' }]);
      return;
    }
    this.progress.flags['l2-memory'] = true;
    this.save();
    this.updateVisualState(true);
    this.say([{ speaker: 'Nhinh', text: 'Bình minh, ngày, chiều… rồi đêm.' }, { speaker: 'Lumo', text: 'Tôi đã quên khu rừng từng đổi màu đẹp thế nào.' }]);
  }

  private collectCrystal(): void {
    if (!this.progress.flags['l2-memory'] || this.progress.flags['l2-crystal']) return;
    this.progress.flags['l2-crystal'] = true;
    this.progress.flags['l2-plan-recorded'] = true;
    this.save();
    this.objects.find((object) => object.getData('library-crystal') === true)?.destroy();
    this.updateVisualState(true);
    this.say([
      { speaker: 'Nhinh', text: 'Nhận Tinh thể Ký Ức.' },
      { speaker: 'Lumo', text: 'Ký Ức. Tôi nhớ rồi… đây là một trong ba mảnh trái tim Cây Mẹ.' },
      { speaker: 'Nhinh', text: 'Vậy còn hai mảnh nữa?' },
      { speaker: 'Lumo', text: 'Hy Vọng và Cân Bằng. Những cái tên ấy được khắc trên rễ cây.' },
      { speaker: 'Lumo', text: 'Tìm đủ ba tinh thể, chúng ta sẽ thắp sáng trái tim nó. Rừng sẽ hồi sinh.' },
      { speaker: 'Nhinh', text: 'Mình giữ mảnh này cẩn thận. Rồi tìm đường tới hai mảnh còn lại.' },
    ]);
  }

  private readMural(): void {
    if (!this.progress.flags['l2-crystal']) return;
    if (this.progress.flags['l2-fifth-viewed']) {
      this.say([{ speaker: 'Nhinh', text: 'Vết nứt bắt đầu từ lúc vòng ngày đêm dừng lại.' }]);
      return;
    }
    this.say([
      { speaker: 'Nhinh', text: 'Người này đang giữ bánh xe lại.' },
      { speaker: 'Lumo', text: '…' },
      { speaker: 'Nhinh', text: 'Cậu nhớ ra điều gì à?' },
      { speaker: 'Lumo', text: 'Tôi nghe thấy mưa. Và ai đó bảo đừng để đèn tắt.' },
      { speaker: 'Nhinh', text: 'Giống dòng chữ trên chiếc đèn.' },
      { speaker: 'Lumo', text: 'Có lẽ… Nhưng tôi vẫn không thấy mặt người ấy.' },
      { speaker: 'Nhinh', text: 'Mình mang ký ức này theo. Chưa cần đoán phần còn thiếu.' },
    ], () => {
      this.progress.flags['l2-fifth-viewed'] = true;
      this.save();
      this.updateVisualState(true);
    });
  }

  private useExit(): void {
    if (!this.isExitOpen()) {
      const missing = !this.progress.flags['l2-crystal'] ? 'Nhận Tinh thể Ký Ức trước.' : 'Đọc bức tranh sau vách rễ trước.';
      this.say([{ speaker: 'Nhinh', text: missing }]);
      return;
    }
    this.nextLevel([
      { speaker: 'Lumo', text: 'Đường nước tới Cây Mẹ nằm phía đó. Tinh thể tiếp theo chắc ở ngọn tháp cuối dòng.' },
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
    }
    const mural = this.objects.find((object) => object.getData('library-mural') === true);
    if (mural instanceof Phaser.GameObjects.Image) {
      const key = this.textureKey(this.isMuralOpen() ? 'room-panel-open' : 'room-panel-closed');
      if (mural.texture.key !== key) mural.setTexture(key);
    }
    const well = this.objects.find((object) => object.getData('library-well') === true);
    if (well instanceof Phaser.GameObjects.Image) {
      const key = this.textureKey(this.progress.flags['l2-memory'] ? 'room-well-open' : 'room-well-closed');
      if (well.texture.key !== key) well.setTexture(key);
    }
    this.syncCrystal();
    if (this.exitThresholdBody) this.exitThresholdBody.enable = !exitOpen;
    this.updateExitTextures(exitOpen);
  }

  private redrawTabletStacks(): void {
    for (const stack of this.tabletStacks.values()) {
      stack.destroy();
      this.objects = this.objects.filter((object) => object !== stack);
    }
    this.tabletStacks.clear();
    const slots = this.readSlots();
    const occupied = new Set(slots.filter((id) => id >= 0));
    for (let index = 0; index < LIBRARY_LAYOUT.racks.length; index += 1) {
      const identity = STONES.indexOf(RACK_ORDER[index]);
      if (occupied.has(identity)) continue;
      const pos = LIBRARY_LAYOUT.racks[index];
      this.tabletStacks.set(this.rackKey(index), this.createTabletStack(identity, pos.x, pos.y, this.depthAt(pos.y + 24), this.selectedStone === identity));
    }
    for (let index = 0; index < slots.length; index += 1) {
      const pos = LIBRARY_LAYOUT.seats[index];
      this.socketImages[index].setTexture(this.textureKey(slots[index] >= 0 ? 'socket-occupied' : 'socket-empty'));
      if (slots[index] >= 0) this.tabletStacks.set(this.seatKey(index), this.createTabletStack(slots[index], pos.x, pos.y, this.depthAt(pos.y + 24), this.selectedStone === slots[index]));
    }
    this.lastLanternState = !this.lantern.lanternOn;
    this.updateVisualState(true);
  }

  private createTabletStack(identity: number, x: number, y: number, depth: number, selected: boolean): Phaser.GameObjects.Container {
    const stone = STONES[identity];
    const body = this.scene.add.image(0, 0, this.textureKey('tablet-body'));
    const borderName: Record<Stone, string> = { bird: 'border-chim', leaf: 'border-la', boat: 'border-thuyen', seed: 'border-hat' };
    const border = this.scene.add.image(0, 0, this.textureKey(borderName[stone]));
    const clue = this.scene.add.image(0, 0, this.textureKey(this.clueFilename(stone, this.lantern.lanternOn))).setData('library-clue', true);
    const selection = this.scene.add.image(0, 0, this.textureKey('socket-selected')).setVisible(selected).setData('library-selection', true);
    const stack = this.scene.add.container(x, y, [body, clue, border, selection]).setDepth(depth);
    stack.setData('library-identity', identity);
    this.objects.push(stack);
    return stack;
  }

  private addExitArt(): void {
    const scale = LIBRARY_LAYOUT.exit.width / 152;
    const height = 156 * scale;
    this.exitBaseImage = this.scene.add.image(LIBRARY_LAYOUT.exit.x, LIBRARY_LAYOUT.exit.anchorY, 'woods_arch_locked')
      .setOrigin(0.5, 1).setDisplaySize(LIBRARY_LAYOUT.exit.width, height).setDepth(4).setData('library-exit', true);
    this.objects.push(this.exitBaseImage);
    this.artImages.push(this.exitBaseImage);
    const layers = ['header', 'left-post', 'right-post'];
    this.exitImages = layers.map((layer) => {
      const key = this.createArchLayerTexture('woods_arch_locked', layer);
      const image = this.scene.add.image(LIBRARY_LAYOUT.exit.x, LIBRARY_LAYOUT.exit.anchorY, key)
        .setOrigin(0.5, 1).setDisplaySize(LIBRARY_LAYOUT.exit.width, height)
        .setDepth(layer === 'header' ? this.depthAt(LIBRARY_LAYOUT.exit.anchorY - 54) : this.depthAt(LIBRARY_LAYOUT.exit.anchorY))
        .setData('library-exit', true);
      this.objects.push(image);
      this.artImages.push(image);
      if (layer !== 'header') this.protectedImages.add(image);
      return image;
    });
  }

  private createArchLayerTexture(textureKey: string, layer: string): string {
    const key = `library-${textureKey}-${layer}`;
    if (this.scene.textures.exists(key)) return key;
    const source = this.scene.textures.get(textureKey).getSourceImage() as HTMLImageElement;
    const texture = this.scene.textures.createCanvas(key, 152, 156);
    if (!texture) throw new Error(`Could not create Level 03 arch layer: ${layer}`);
    const regions: Record<string, [number, number, number, number]> = {
      header: [0, 0, 152, 82], 'left-post': [0, 0, 50, 156], 'right-post': [102, 0, 50, 156],
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
    if (this.exitBaseImage && this.exitBaseImage.texture.key !== texture) this.exitBaseImage.setTexture(texture);
    const layers = ['header', 'left-post', 'right-post'];
    this.exitImages.forEach((image, index) => {
      const key = this.createArchLayerTexture(texture, layers[index]);
      if (image.texture.key !== key) image.setTexture(key);
    });
  }

  private syncCrystal(): void {
    const existing = this.objects.find((object) => object.getData('library-crystal') === true);
    if (this.progress.flags['l2-memory'] === true && this.progress.flags['l2-crystal'] !== true) {
      if (!existing) {
        const crystal = this.addImage('room-memory-crystal', LIBRARY_LAYOUT.well.x, LIBRARY_LAYOUT.well.y, 28, 36, 35, true);
        crystal.setData('library-crystal', true);
      }
    } else if (existing) {
      existing.destroy();
      this.objects = this.objects.filter((object) => object !== existing);
      if (existing instanceof Phaser.GameObjects.Image) this.protectedImages.delete(existing);
    }
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
  private isExitOpen(): boolean { return this.progress.flags['l2-crystal'] === true && this.progress.flags['l2-fifth-viewed'] === true; }

  private updateVisualStateForceExit(): void {
    if (this.exitThresholdBody) this.exitThresholdBody.enable = !this.isExitOpen();
    this.updateExitTextures(this.isExitOpen());
  }

  private hintStage(): string {
    if (this.progress.flags['l2-memory'] && !this.progress.flags['l2-crystal']) return 'crystal';
    if (this.progress.flags['l2-crystal'] && !this.progress.flags['l2-fifth-viewed']) return 'mural';
    if (this.isExitOpen()) return 'exit';
    if (!this.progress.flags['l2-book-practice']) return 'book';
    if (!this.progress.flags['l2-memory'] && !this.progress.flags['l2-clues-ready']) return 'clues';
    return 'arrange';
  }

  private saveHudHintState(): void {
    // Visual state is refreshed by the CampaignScene HUD on the same frame.
  }

  private sanitizeSavedSlots(): void {
    const sanitized = sanitizeLibrarySlots(this.progress.flags['memory-slots-json']);
    const serialized = JSON.stringify(sanitized);
    if (this.progress.flags['memory-slots-json'] !== serialized) {
      this.progress.flags['memory-slots-json'] = serialized;
      this.progress.counters['memory-slots'] = sanitized.filter((slot) => slot >= 0).length;
      this.save();
    }
  }

  private readSlots(): number[] { return sanitizeLibrarySlots(this.progress.flags['memory-slots-json']); }

  private writeSlots(slots: number[]): void {
    const sanitized = sanitizeLibrarySlots(slots);
    this.progress.flags['memory-slots-json'] = JSON.stringify(sanitized);
    this.progress.counters['memory-slots'] = sanitized.filter((slot) => slot >= 0).length;
    this.save();
    this.redrawTabletStacks();
  }
}
