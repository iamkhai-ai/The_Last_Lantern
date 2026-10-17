import Phaser from 'phaser';
import { getSharedMechanismKey, getLevelArtKey } from '../art/CampaignArt';
import { SHATTERED_CREEK, canApproach, canCompleteCreek, deriveCreekState, migrateV1Creek, resolveCreekSpawn, unsafePowerChange, type CreekLiveState, type CreekState, type MirrorPose, type Point, type RaySegment } from '../data/shatteredCreekLayout';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { LanternSystem } from '../systems/LanternSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';

type Say = (lines: DialogueLine[], done?: () => void) => void;
type Context = { scene: Phaser.Scene; player: Player; lumo: Lumo; lantern: LanternSystem; interactions: InteractionSystem; progress: CampaignProgress; save: () => void; say: Say; nextLevel: (lines: DialogueLine[]) => void; isDialogueActive: () => boolean };

const OPENING: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Mặt suối không chuyển động.' },
  { speaker: 'Lumo', text: 'Nước từng chảy qua đây tới tận rễ Cây Mẹ.' },
  { speaker: 'Nhinh', text: 'Còn cây kia… ba khoảng trống trong thân có phải chỗ đặt tinh thể không?' },
  { speaker: 'Lumo', text: 'Phải. Khi có đủ ba mảnh, chúng ta sẽ thắp sáng trái tim nó.' },
  { speaker: 'Nhinh', text: 'Trước hết, phải qua được bờ bên kia.' },
  { speaker: 'Lumo', text: 'Những chiếc cầu này nhận sức từ ánh sáng.' },
  { speaker: 'Nhinh', text: 'Thử dùng chiếc đèn của mình xem.' },
  { speaker: 'Lumo', text: 'Bệ nhỏ cạnh lối vào là nơi an toàn để thử đặt đèn và xoay gương.' },
];
const OPEN_PRACTICE: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Đặt đèn xuống thì tia giữ yên. Xoay gương mới đổi đường đi.' },
  { speaker: 'Lumo', text: 'Và mình vẫn lấy đèn lại được. Cậu thử thêm cũng không sao.' },
];
const HINTS: Record<CreekLiveState['step'], string[]> = {
  practice: ['Bệ nhỏ và gương thử cạnh lối vào không nối với cầu.', 'E đặt đèn lên bệ nhỏ; E ở gương xoay qua các hướng.', 'Xoay gương thử cho tia chạm bông hoa đá.'],
  pickup: ['Đèn đang nằm trên bệ thử. E sẽ thu hồi đèn bất cứ lúc nào an toàn.', 'Đứng cạnh bệ thử và nhấn E để lấy đèn.'],
  main: ['Đặt đèn lên bệ chính ở bờ Tây.', 'G1 và G2 điều hướng tia. Xoay từng gương bằng E rồi nhìn đường sáng.'],
  'latch-a': ['Mắt nhận A đã sáng. Tay chốt nằm cạnh chân cầu phía Tây.', 'Gài chốt A trước khi đổi hướng tia.'],
  reroute: ['Hãy giữ cầu A trước khi đổi tia.', 'Từ G2, hướng tia sang gương G3 trên đảo.'],
  'latch-b': ['Mắt nhận B đã sáng. Gài chốt thứ hai ngay trên đảo.'],
  retrieve: ['Hai chốt đã giữ cầu. Quay về bờ Tây và thu hồi đèn.'],
  relief: ['Thu hồi đèn rồi đọc phù điêu ở bờ Đông.'],
  exit: ['Đến vòm trạm dẫn nước và nhấn E.'],
};

export class ShatteredCreekController {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private bodies: Phaser.Physics.Arcade.StaticBody[] = [];
  private colliderBodies = new Map<string, Phaser.Physics.Arcade.StaticBody>();
  private visuals = new Map<string, Phaser.GameObjects.Image>();
  private beams?: Phaser.GameObjects.Graphics;
  private hintIndex = 0;
  private bridgeStoneA?: Phaser.GameObjects.TileSprite;
  private bridgeStoneB?: Phaser.GameObjects.TileSprite;
  private state!: CreekState;
  private cleaned = false;
  private hud: Phaser.GameObjects.Text[] = [];
  private stepKey = '';

  constructor(private readonly ctx: Context) {}

  public build(savedCenter?: Point): void {
    const { progress, lantern } = this.ctx;
    this.state = migrateV1Creek(progress);
    lantern.lanternOn = this.state.lanternOn;
    progress.flags['l3-latch-a'] = this.state.latchA;
    progress.flags['l3-latch-b'] = this.state.latchB;
    this.saveState();
    lantern.lanternInHand = this.state.source === null;
    lantern.lanternPlaced = this.state.source !== null;
    if (this.state.source) {
      const source = this.state.source === 'practice' ? SHATTERED_CREEK.objects.practiceSource : SHATTERED_CREEK.objects.source;
      lantern.placeLanternAt(source.ground.x, source.optical.y + 6);
      lantern.lanternOn = this.state.lanternOn;
    }
    const live = deriveCreekState(this.state);
    const spawn = resolveCreekSpawn(savedCenter, live);
    this.ctx.player.setFootPlacement(19, 37, 11, 14, 6);
    this.ctx.player.setPosition(spawn.x, spawn.y);
    this.drawGround();
    this.drawMechanisms();
    const bounds = SHATTERED_CREEK.bounds;
    this.addWorldCollider('bounds-n', bounds.x + bounds.width / 2, bounds.y - 6, bounds.width, 12);
    this.addWorldCollider('bounds-s', bounds.x + bounds.width / 2, bounds.y + bounds.height + 6, bounds.width, 12);
    this.addWorldCollider('bounds-w', bounds.x - 3, bounds.y + bounds.height / 2, 6, bounds.height);
    this.addWorldCollider('bounds-e', bounds.x + bounds.width + 3, bounds.y + bounds.height / 2, 6, bounds.height);
    for (const [index, water] of SHATTERED_CREEK.water.entries()) {
      const gap = index === 0 ? SHATTERED_CREEK.bridges.a.gap : SHATTERED_CREEK.bridges.b.gap;
      const northHeight = gap.y - water.y;
      const southY = gap.y + gap.height;
      const southHeight = water.y + water.height - southY;
      this.addWorldCollider(`water-${index}-north`, water.x + water.width / 2, water.y + northHeight / 2, water.width, northHeight);
      this.addWorldCollider(`water-${index}-south`, water.x + water.width / 2, southY + southHeight / 2, water.width, southHeight);
      this.addWorldCollider(`water-${index}-lane`, gap.x + gap.width / 2, gap.y + gap.height / 2, gap.width, gap.height, index === 0 ? !live.bridgeA : !live.bridgeB);
    }
    for (const [id, entry] of Object.entries(SHATTERED_CREEK.objects)) if ('base' in entry) this.addWorldCollider(`prop-${id}`, entry.base.x + entry.base.width / 2, entry.base.y + entry.base.height / 2, entry.base.width, entry.base.height);
    SHATTERED_CREEK.objects.exit.posts.forEach((post, index) => this.addWorldCollider(`exit-post-${index}`, post.x + post.width / 2, post.y + post.height / 2, post.width, post.height));
    this.registerActions();
    this.drawHud();
    this.updateVisuals();
    this.ctx.lumo.setVisible(true);
    if (!this.ctx.progress.flags['intro-3']) { this.ctx.progress.flags['intro-3'] = true; this.ctx.save(); this.ctx.say(OPENING); }
  }

  public update(): void {
    if (this.cleaned) return;
    const live = deriveCreekState(this.state);
    const laneA = this.colliderBodies.get('water-0-lane'); const laneB = this.colliderBodies.get('water-1-lane');
    if (laneA) laneA.enable = !live.bridgeA;
    if (laneB) laneB.enable = !live.bridgeB;
    this.updateVisuals();
    this.updateHud(live);
    let discoveryChanged = false;
    if (live.eyeA && !this.ctx.progress.flags['l3-eye-a-discovered']) { this.ctx.progress.flags['l3-eye-a-discovered'] = true; discoveryChanged = true; }
    if (live.eyeB && !this.ctx.progress.flags['l3-eye-b-discovered']) { this.ctx.progress.flags['l3-eye-b-discovered'] = true; discoveryChanged = true; }
    if (discoveryChanged) this.ctx.save();
    if (!this.ctx.isDialogueActive()) {
      if (live.practiceLit && !this.state.practiceComplete) {
        this.state.practiceComplete = true;
        this.ctx.progress.flags['l3-practice-complete'] = true;
        this.saveState();
        this.ctx.say(OPEN_PRACTICE);
      } else if (live.eyeA && !this.ctx.progress.flags['l3-eye-a-dialogue']) {
        this.ctx.progress.flags['l3-eye-a-dialogue'] = true; this.ctx.save();
        this.ctx.say([{ speaker: 'Lumo', text: 'Có đường rồi! Nhưng mới tới hòn đảo.' }, { speaker: 'Nhinh', text: 'Tay chốt này có thể giữ các phiến đá. Mình sẽ gài trước khi đổi tia.' }]);
      } else if (this.state.latchA && live.mainSegments.some((segment) => segment.hit === 'g3') && !this.ctx.progress.flags['l3-reroute-dialogue']) {
        this.ctx.progress.flags['l3-reroute-dialogue'] = true; this.ctx.save();
        this.ctx.say([{ speaker: 'Nhinh', text: 'Cầu vẫn còn. Giờ chiếc gương cuối cùng đã ở trong tầm với.' }, { speaker: 'Lumo', text: 'Mình đã mở đường cho chính mình.' }]);
      }
    }
  }

  public toggleLantern(): boolean {
    if (this.ctx.lantern.lanternPlaced || !this.ctx.lantern.lanternInHand) {
      if (!this.ctx.lantern.lanternPlaced) return false;
      const next = { ...this.state, lanternOn: !this.state.lanternOn };
      const unsafe = unsafePowerChange(this.point(), deriveCreekState(this.state), deriveCreekState(next));
      if (unsafe) { this.refuseUnsafe(unsafe); return false; }
      this.state.lanternOn = !this.state.lanternOn; this.ctx.lantern.lanternOn = this.state.lanternOn;
      this.saveState(); return true;
    }
    const next = { ...this.state, lanternOn: !this.state.lanternOn };
    const unsafe = unsafePowerChange(this.point(), deriveCreekState(this.state), deriveCreekState(next));
    if (unsafe) { this.refuseUnsafe(unsafe); return false; }
    if (!this.ctx.lantern.toggleLantern(performance.now())) return false;
    this.state.lanternOn = this.ctx.lantern.lanternOn;
    this.ctx.progress.lanternOn = this.state.lanternOn;
    this.saveState();
    return true;
  }

  public showHint(): void {
    const live = deriveCreekState(this.state);
    if (this.stepKey !== live.step) { this.stepKey = live.step; this.hintIndex = 0; }
    const choices = this.hintsFor(live); const text = choices[Math.min(this.hintIndex++, choices.length - 1)];
    this.ctx.say([{ speaker: 'Hệ thống', text }]);
  }

  public showJournal(): void {
    const discoveries: DialogueLine[] = [];
    if (this.state.practiceComplete) discoveries.push({ speaker: 'Hệ thống', text: 'Ghi chép: tia sáng đổi hướng khi gương xoay; đèn có thể thu hồi.' });
    if (this.state.latchA || this.state.latchB) discoveries.push({ speaker: 'Hệ thống', text: 'Ghi chép: chốt cơ khí giữ cầu khi tia sáng đổi hướng.' });
    if (this.ctx.progress.flags['l3-eye-a-discovered']) discoveries.push({ speaker: 'Hệ thống', text: 'Ghi chép — cấu hình A: G1 / rồi G2 \\ dẫn tia tới mắt nhận A.' });
    if (this.ctx.progress.flags['l3-eye-b-discovered']) discoveries.push({ speaker: 'Hệ thống', text: 'Ghi chép — cấu hình B: G1 /, G2 / rồi G3 \\ dẫn tia tới mắt nhận B.' });
    if (this.state.memo) discoveries.push(
      { speaker: 'Hệ thống', text: 'Ghi chép — phù điêu: những tia sáng đều hướng về Cây Mẹ. Đêm ấy có một cơn bão lớn và tiếng chuông tháp còn in trong ký ức.' },
      { speaker: 'Hệ thống', text: 'Ghi chép — dòng nước vẫn chảy sau đó; trạm phía trước có thể giữ thêm manh mối.' },
    );
    this.ctx.say(discoveries.length ? discoveries : [{ speaker: 'Hệ thống', text: 'Chưa có ghi chép mới từ suối.' }]);
  }

  public destroy(): void {
    this.cleaned = true;
    this.colliders.forEach((collider) => collider.destroy());
    this.objects.forEach((object) => object.destroy());
    this.colliders = []; this.objects = []; this.visuals.clear(); this.bodies = []; this.colliderBodies.clear(); this.hud = [];
  }

  private registerActions(): void {
    const { interactions } = this.ctx;
    const add = (id: string, x: number, y: number, prompt: () => string | null, onInteract: () => void, bank: 'west' | 'island' | 'east', artId: string) => {
      const config: InteractableConfig = { id: `creek-${id}`, x, y, radius: 24, getPrompt: () => canApproach(this.point(), { x, y }, bank) ? prompt() : null, getPromptBounds: () => this.visuals.get(artId)?.getBounds() ?? null, isEnabled: () => canApproach(this.point(), { x, y }, bank) && prompt() !== null, onInteract: () => { if (canApproach(this.point(), { x, y }, bank)) onInteract(); } };
      interactions.register(config);
    };
    const practice = SHATTERED_CREEK.objects.practiceSource.stand;
    add('practice-source', practice.x, practice.y, () => this.sourcePrompt('practice'), () => this.useSource('practice'), 'west', 'practice-source');
    const main = SHATTERED_CREEK.objects.source.stand;
    add('main-source', main.x, main.y, () => this.sourcePrompt('main'), () => this.useSource('main'), 'west', 'source');
    add('practice-mirror', 132, 288, () => 'E · Xoay gương thử', () => { this.state.practice = ((this.state.practice + 1) % 3) as MirrorPose; this.ctx.progress.counters['l3-practice'] = this.state.practice; this.saveState(); }, 'west', 'practice-mirror');
    for (const id of ['g1', 'g2', 'g3'] as const) {
      const stand = SHATTERED_CREEK.objects[id].stand;
      add(id, stand.x, stand.y, () => `${id.toUpperCase()} · Xoay gương`, () => this.rotate(id), id === 'g3' ? 'island' : 'west', id);
    }
    for (const which of ['A', 'B'] as const) {
      const id = which === 'A' ? 'latchA' : 'latchB'; const entry = SHATTERED_CREEK.objects[id];
      add(`latch-${which.toLowerCase()}`, entry.stand.x, entry.stand.y, () => (which === 'A' ? this.state.latchA : this.state.latchB) ? 'E · Chốt đã giữ chắc' : `E · Gài chốt ${which === 'A' ? 'cầu đầu' : 'cầu hai'}`, () => this.latch(which), which === 'A' ? 'west' : 'island', `latch-${which === 'A' ? 'latchA' : 'latchB'}`);
    }
    const relief = SHATTERED_CREEK.objects.relief.stand;
    add('relief', relief.x, relief.y, () => 'E · Đọc phù điêu', () => this.readRelief(), 'east', 'relief');
    const exit = SHATTERED_CREEK.objects.exit.stand;
    add('exit', exit.x, exit.y, () => canCompleteCreek(this.state) ? 'E · Qua trạm dẫn nước' : 'E · Kiểm tra trạm dẫn nước', () => this.exit(), 'east', 'exit');
  }

  private sourcePrompt(which: 'practice' | 'main'): string | null {
    const display = which === 'practice' ? 'đèn thử' : 'đèn chính';
    if (this.state.source && this.state.source !== which) return `E · Đèn đang ở bệ ${this.state.source === 'practice' ? 'thử' : 'chính'}`;
    if (this.state.source === which) return 'E · Thu hồi đèn';
    return `E · Đặt ${display}`;
  }

  private useSource(which: 'practice' | 'main'): void {
    if (this.state.source && this.state.source !== which) { this.ctx.say([{ speaker: 'Nhinh', text: `Đèn vẫn nằm trên bệ ${this.state.source === 'practice' ? 'thử' : 'chính'}.` }]); return; }
    if (this.state.source === which) {
      const next = { ...this.state, source: null };
      const unsafe = unsafePowerChange(this.point(), deriveCreekState(this.state), deriveCreekState(next));
      if (unsafe) { this.refuseUnsafe(unsafe); return; }
      const isOn = this.state.lanternOn;
      this.ctx.lantern.retrieveLantern(); this.ctx.lantern.lanternOn = isOn;
      this.state.source = null; this.state.lanternRetrieved = true;
      this.ctx.progress.flags['l3-lantern-retrieved'] = true; this.ctx.progress.lanternPickedUp = true; this.ctx.progress.lanternOn = isOn; this.saveState(); return;
    }
    const source = which === 'practice' ? SHATTERED_CREEK.objects.practiceSource : SHATTERED_CREEK.objects.source;
    this.ctx.lantern.placeLanternAt(source.ground.x, source.optical.y + 6); this.ctx.lantern.lanternOn = this.state.lanternOn;
    this.state.source = which; this.state.lanternRetrieved = false; this.ctx.progress.flags['l3-lantern-placed'] = true; this.ctx.progress.flags['l3-lantern-retrieved'] = false; this.ctx.progress.flags['l3-lamp-source'] = which; this.saveState();
  }

  private rotate(id: 'g1' | 'g2' | 'g3'): void {
    const candidate = { ...this.state, [id]: ((this.state[id] + 1) % 3) as MirrorPose };
    const unsafe = unsafePowerChange(this.point(), deriveCreekState(this.state), deriveCreekState(candidate));
    if (unsafe) { this.refuseUnsafe(unsafe); return; }
    this.state[id] = candidate[id]; this.ctx.progress.counters[id] = candidate[id]; this.saveState();
  }

  private latch(which: 'A' | 'B'): void {
    const live = deriveCreekState(this.state);
    const already = which === 'A' ? this.state.latchA : this.state.latchB;
    const powered = which === 'A' ? live.eyeA : live.eyeB;
    if (already) { this.ctx.say([{ speaker: 'Nhinh', text: 'Đã giữ chắc. Đổi ánh sáng sẽ không làm cầu này mất nữa.' }]); return; }
    if (which === 'B' && !this.state.latchA) { this.ctx.say([{ speaker: 'Nhinh', text: 'Mình cần giữ cầu đầu bằng chốt trước khi mở đoạn tiếp theo.' }]); return; }
    if (!powered) { this.ctx.say([{ speaker: 'Nhinh', text: 'Mắt nhận vẫn tối. Hãy dẫn tia tới đây trước.' }]); return; }
    if (which === 'A') {
      this.state.latchA = true; this.ctx.progress.flags['l3-latch-a'] = true;
      this.ctx.say([{ speaker: 'Nhinh', text: 'Chốt đã ăn khớp. Cầu này sẽ giữ vững khi mình đổi tia.' }]);
    } else { this.state.latchB = true; this.ctx.progress.flags['l3-latch-b'] = true; }
    this.saveState();
  }

  private readRelief(): void {
    if (!this.state.lanternRetrieved || this.state.source !== null) { this.ctx.say([{ speaker: 'Nhinh', text: 'Mình nên thu hồi đèn trước khi đọc tiếp.' }]); return; }
    const first = !this.state.memo; this.state.memo = true; this.ctx.progress.flags['l3-memo'] = true; this.saveState();
    this.ctx.say(first ? [
      { speaker: 'Nhinh', text: 'Tất cả tia sáng đều hướng về Cây Mẹ.' }, { speaker: 'Lumo', text: 'Đêm ấy có một cơn bão rất lớn.' },
      { speaker: 'Nhinh', text: 'Người này gom ánh sáng để dẫn người đi lạc về sao?' }, { speaker: 'Lumo', text: 'Tôi nhớ tiếng chuông trên tháp. Nó kêu mãi.' },
      { speaker: 'Nhinh', text: 'Nhưng dòng nước trong tranh vẫn chảy. Có điều gì xảy ra sau đó.' }, { speaker: 'Lumo', text: 'Đường dẫn nước đi qua trạm phía trước. Có lẽ còn bản ghi ở đó.' },
    ] : [{ speaker: 'Nhinh', text: 'Tất cả tia sáng đều hướng về Cây Mẹ.' }]);
  }

  private hintsFor(live: CreekLiveState): string[] {
    if (live.step === 'practice' && this.state.source === 'practice' && !this.state.lanternOn) return ['Đèn thử đang tắt. Nhấn F để bật tia sáng.'];
    if (live.step === 'main' && this.state.source === null) return ['Đèn đang ở trong tay. Tới bệ chính ở bờ Tây và nhấn E để đặt xuống.', 'Đặt đèn lên bệ chính bằng E; khi nằm yên, đèn sẽ giữ đường tia.'];
    if (live.step === 'main' && this.state.source === 'main' && !this.state.lanternOn) return ['Đèn chính đang tắt. Nhấn F để bật tia sáng.'];
    if (live.step === 'main') return ['Bệ chính ở bờ Tây. Tia cần tới G1.', `G1 ${this.state.g1 === 2 ? 'đã hướng tới G2' : 'cần chuyển sang /'}, G2 ${this.state.g2 === 1 ? 'đang hướng về mắt A' : 'chưa hướng về mắt A'}.`, 'Dẫn tia qua G1 / tới G2, rồi xoay G2 sang \\ để chiếu vào mắt A.'];
    if (live.step === 'reroute' && this.state.source === 'main' && !this.state.lanternOn) return ['Đèn đang tắt. Nhấn F để bật tia rồi tiếp tục dẫn sáng tới G3.'];
    if (live.step === 'reroute') return ['Giữ cầu A bằng chốt trước khi đổi tia.', 'Xoay G2 sang / để gửi tia tới G3.', `G3 ${this.state.g3 === 2 ? 'đang hướng về mắt B' : 'cần xoay sang \\'}.`];
    if (live.step === 'retrieve' && this.state.source === null) return ['Hai chốt đã giữ cầu. Bệ đèn chính ở bờ Tây.', 'Đặt đèn lên bệ chính rồi nhấn E lần nữa để thu hồi.'];
    return HINTS[live.step];
  }

  private exit(): void {
    if (!canCompleteCreek(this.state)) {
      const missing = [!this.state.latchA && 'gài chốt cầu đầu', !this.state.latchB && 'gài chốt cầu thứ hai', this.state.source !== null || !this.state.lanternRetrieved ? 'thu hồi đèn' : '', !this.state.memo && 'đọc phù điêu'].filter(Boolean).join(', ');
      this.ctx.say([{ speaker: 'Nhinh', text: `Trạm chưa mở. Mình còn cần ${missing}.` }]); return;
    }
    this.ctx.nextLevel([{ speaker: 'Lumo', text: 'Chỗ đó vừa sáng khi tôi tới gần.' }, { speaker: 'Nhinh', text: 'Có lẽ lần này họ đang đợi cậu.' }]);
  }

  private drawGround(): void {
    const { scene } = this.ctx;
    const backdropKey = getLevelArtKey(3, 'creek-scene-base');
    if (backdropKey && scene.textures.exists(backdropKey)) {
      const background = scene.add.image(0, 0, backdropKey).setOrigin(0, 0).setDisplaySize(640, 360).setCrop(0, 0, 640, 88).setDepth(0); this.keep(background);
    }
    const { bounds, water, bridges } = SHATTERED_CREEK;
    this.keep(scene.add.tileSprite(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width, bounds.height, 'ground_stone').setTint(0x9ea895).setDepth(0));
    for (const river of water) this.keep(scene.add.tileSprite(river.x + river.width / 2, river.y + river.height / 2, river.width, river.height, 'tile_water').setTint(0x8cc0c5).setDepth(0.1));
    for (const river of water) for (const x of [river.x, river.x + river.width]) this.keep(scene.add.tileSprite(x, river.y + river.height / 2, 4, river.height, 'stepping_stone').setTint(0x8c988b).setDepth(1));
    const gapA = bridges.a.gap; const gapB = bridges.b.gap;
    this.bridgeStoneA = this.keep(scene.add.tileSprite(gapA.x + gapA.width / 2, gapA.y + gapA.height / 2, gapA.width, gapA.height, 'stepping_stone').setDepth(2).setVisible(false));
    this.bridgeStoneB = this.keep(scene.add.tileSprite(gapB.x + gapB.width / 2, gapB.y + gapB.height / 2, gapB.width, gapB.height, 'stepping_stone').setDepth(2).setVisible(false));
    this.addBridge('a', 'west'); this.addBridge('b', 'east');
  }

  private drawMechanisms(): void {
    const { objects } = SHATTERED_CREEK;
    this.addImage('practice-source', getSharedMechanismKey('source-empty'), objects.practiceSource.ground, 32, 44);
    this.addImage('practice-mirror', getSharedMechanismKey('mirror-1-backslash'), objects.practiceMirror.ground, 32, 40);
    this.addImage('practice-eye', getLevelArtKey(3, 'test-flower-closed'), objects.practiceEye.ground, 28, 28);
    this.addImage('source', getSharedMechanismKey('source-empty'), objects.source.ground, 32, 44);
    for (const [id, mirrorIndex] of [['g1', 1], ['g2', 2], ['g3', 3]] as const) this.addImage(id, this.mirrorTexture(id, this.state[id]), objects[id].ground, 32, 40);
    this.addImage('eyeA', getSharedMechanismKey('receiver-off'), objects.eyeA.ground, 24, 24);
    this.addImage('eyeB', getSharedMechanismKey('receiver-off'), objects.eyeB.ground, 24, 24);
    this.addImage('latch-latchA', getSharedMechanismKey('latch-west-unlatched'), objects.latchA.ground, 28, 32);
    this.addImage('latch-latchB', getSharedMechanismKey('latch-east-unlatched'), objects.latchB.ground, 28, 32);
    this.addImage('relief', getLevelArtKey(3, 'storm-relief'), objects.relief.ground, 128, 80);
    this.addImage('exit', getLevelArtKey(1, 'woods_arch_open_passage'), objects.exit.ground, 88, 86.625, 5);
    for (const [id, name, x, y] of [['practice-mirror', 'Gương thử', 132, 299], ['g1', 'G1 · •', 202, 150], ['g2', 'G2 · ••', 202, 84], ['g3', 'G3 · •••', 350, 84]] as const) this.addLabel(id, name, x, y);
    this.addLabel('practice-source-label', 'Bệ thử', 112, 285);
    this.addLabel('source-label', 'Bệ đèn', 40, 214);
    this.beams = this.keep(this.ctx.scene.add.graphics().setDepth(6));
  }

  private addBridge(id: 'a' | 'b', side: 'west' | 'east'): void {
    const entry = SHATTERED_CREEK.bridges[id];
    const image = this.image(`bridge-${id}`, getSharedMechanismKey(`bridge-${side}-absent`), entry.art, 100, 36, 3);
    if (image) image.setOrigin(0.5, 0.5).setData('bridgeSide', side);
  }

  private updateVisuals(): void {
    const live = deriveCreekState(this.state);
    for (const id of ['g1', 'g2', 'g3'] as const) this.setImage(id, this.mirrorTexture(id, this.state[id]));
    this.setImage('practice-mirror', getSharedMechanismKey(`mirror-1-${this.state.practice === 0 ? 'horizontal' : this.state.practice === 1 ? 'backslash' : 'slash'}`));
    this.setImage('practice-eye', getLevelArtKey(3, live.practiceLit ? 'test-flower-open' : 'test-flower-closed'));
    this.setImage('source', getSharedMechanismKey(this.state.source === 'main' ? this.state.lanternOn ? 'source-lit' : 'source-off-source' : 'source-empty'));
    this.setImage('practice-source', getSharedMechanismKey(this.state.source === 'practice' ? this.state.lanternOn ? 'source-lit' : 'source-off-source' : 'source-empty'));
    this.setImage('eyeA', getSharedMechanismKey(live.eyeA ? 'receiver-on' : 'receiver-off'));
    this.setImage('eyeB', getSharedMechanismKey(live.eyeB ? 'receiver-on' : 'receiver-off'));
    this.setImage('latch-latchA', getSharedMechanismKey(`latch-west-${this.state.latchA ? 'latched' : 'unlatched'}`));
    this.setImage('latch-latchB', getSharedMechanismKey(`latch-east-${this.state.latchB ? 'latched' : 'unlatched'}`));
    for (const [id, side, ready, latched] of [['a', 'west', live.bridgeA, this.state.latchA], ['b', 'east', live.bridgeB, this.state.latchB]] as const) {
      const image = this.visuals.get(`bridge-${id}`); if (!image) continue;
      const key = getSharedMechanismKey(`bridge-${side}-${latched ? 'latched' : ready ? 'powered' : 'absent'}`); if (key && this.ctx.scene.textures.exists(key) && image.texture.key !== key) image.setTexture(key);
    }
    this.bridgeStoneA?.setVisible(live.bridgeA); this.bridgeStoneB?.setVisible(live.bridgeB);
    this.beams?.clear();
    if (this.beams) {
      this.drawRay(this.beams, live.practiceSegments); this.drawRay(this.beams, live.mainSegments);
    }
  }

  private drawRay(graphics: Phaser.GameObjects.Graphics, segments: RaySegment[]): void {
    for (const segment of segments) {
      graphics.lineStyle(3, segment.hit ? 0xffdf83 : 0x8ca7a8, segment.hit ? 0.9 : 0.45);
      graphics.lineBetween(segment.from.x, segment.from.y, segment.to.x, segment.to.y);
      if (!segment.hit) { graphics.fillStyle(0x8ca7a8, 0.6); graphics.fillCircle(segment.to.x, segment.to.y, 3); }
    }
  }

  private mirrorTexture(id: 'g1' | 'g2' | 'g3', pose: MirrorPose): string | null {
    const direction = pose === 0 ? 'horizontal' : id === 'g3' ? pose === 1 ? 'slash' : 'backslash' : pose === 1 ? 'backslash' : 'slash';
    return getSharedMechanismKey(`mirror-${id === 'g1' ? '1' : id === 'g2' ? '2' : '3'}-${direction}`);
  }

  private addImage(id: string, texture: string | null, ground: Point, width: number, height: number, depth = 10 + ground.y / 10): void {
    if (!texture || !this.ctx.scene.textures.exists(texture)) return;
    const image = this.ctx.scene.add.image(ground.x, ground.y, texture).setOrigin(0.5, 1).setDisplaySize(width, height).setDepth(depth);
    this.visuals.set(id, image); this.keep(image);
  }
  private image(id: string, texture: string | null, ground: Point, width: number, height: number, depth: number): Phaser.GameObjects.Image | undefined { this.addImage(id, texture, ground, width, height, depth); return this.visuals.get(id); }
  private setImage(id: string, texture: string | null): void { const image = this.visuals.get(id); if (image && texture && this.ctx.scene.textures.exists(texture) && image.texture.key !== texture) image.setTexture(texture); }
  private addWorldCollider(id: string, x: number, y: number, width: number, height: number, enabled = true): void {
    const object = this.ctx.scene.add.rectangle(x, y, width, height, 0, 0); this.ctx.scene.physics.add.existing(object, true);
    const body = object.body as Phaser.Physics.Arcade.StaticBody; body.enable = enabled; this.bodies.push(body); this.colliderBodies.set(id, body); this.colliders.push(this.ctx.scene.physics.add.collider(this.ctx.player.sprite, object)); object.setName(id); this.keep(object);
  }
  private point(): Point { return { x: this.ctx.player.x, y: this.ctx.player.y }; }
  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T { this.objects.push(object); return object; }
  private refuseUnsafe(reason: 'occupied-bridge' | 'stranded-east' | 'stranded-island'): void {
    const text = reason === 'occupied-bridge' ? 'Đi tới bờ an toàn trước khi tắt đèn hoặc đổi tia.' : 'Cấu hình này sẽ cắt đường quay về. Hãy gài chốt trước.';
    this.ctx.say([{ speaker: 'Nhinh', text }]);
  }
  private saveState(): void { this.state.lanternOn = this.ctx.lantern.lanternOn; this.ctx.progress.lanternOn = this.state.lanternOn; this.ctx.progress.counters.g1 = this.state.g1; this.ctx.progress.counters.g2 = this.state.g2; this.ctx.progress.counters.g3 = this.state.g3; this.ctx.progress.counters['l3-practice'] = this.state.practice; this.ctx.progress.flags['l3-practice-complete'] = this.state.practiceComplete; this.ctx.progress.flags['l3-latch-a'] = this.state.latchA; this.ctx.progress.flags['l3-latch-b'] = this.state.latchB; if (this.state.source) this.ctx.progress.flags['l3-lamp-source'] = this.state.source; else delete this.ctx.progress.flags['l3-lamp-source']; this.ctx.progress.flags['l3-lantern-retrieved'] = this.state.lanternRetrieved; this.ctx.save(); }

  private addLabel(id: string, text: string, x: number, y: number): void {
    const label = this.ctx.scene.add.text(x, y, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#f2ddb0', backgroundColor: '#07151c88', padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(15 + y / 10);
    label.setData('creekLabel', id); this.keep(label);
  }

  private drawHud(): void {
    const { scene } = this.ctx;
    this.hud.push(scene.add.text(16, 13, '04  Suối Trăng Vỡ · Hy vọng', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#f7dfaa', backgroundColor: '#07151cbb', padding: { x: 8, y: 5 } }).setDepth(86));
    this.hud.push(scene.add.text(16, 42, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', color: '#e5eee8', backgroundColor: '#07151cbb', padding: { x: 8, y: 5 } }).setDepth(86));
    this.hud.push(scene.add.text(16, 320, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#d3e5dc', backgroundColor: '#07151cbb', padding: { x: 8, y: 4 } }).setDepth(86));
    this.hud.push(scene.add.text(624, 320, 'E Tương tác · F Đèn · H Gợi ý · J Ghi chép · ESC Tạm dừng', { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#ffe680', backgroundColor: '#07151cbb', padding: { x: 5, y: 3 } }).setOrigin(1, 0).setDepth(86));
  }

  public refreshHud(): void { this.updateHud(deriveCreekState(this.state)); }

  private updateHud(live: CreekLiveState): void {
    if (!this.hud.length) return;
    const goals: Record<CreekLiveState['step'], string> = { practice: 'Thử đặt đèn và gương nhỏ cạnh lối vào.', pickup: 'Thu hồi đèn bằng E.', main: 'Đặt đèn chính rồi điều hướng tia qua gương.', 'latch-a': 'Gài chốt cầu đầu bên bờ Tây.', reroute: 'Giữ cầu đầu rồi điều hướng tia sang gương trên đảo.', 'latch-b': 'Gài chốt cầu thứ hai trên đảo.', retrieve: this.state.source ? 'Thu hồi đèn khỏi bệ.' : 'Đặt đèn lên bệ chính rồi thu hồi.', relief: 'Đọc phù điêu bờ Đông.', exit: 'Đến trạm dẫn nước.' };
    const placedPowerStep = ['practice', 'main', 'latch-a', 'reroute', 'latch-b'].includes(live.step) && this.state.source !== null;
    const goal = !this.state.lanternOn && placedPowerStep ? 'Đèn đang tắt. Nhấn F để bật tia sáng.' : live.step === 'main' && this.state.source === null ? 'Đặt đèn lên bệ chính bằng E.' : goals[live.step];
    this.hud[1].setText(goal);
    const glyph = (id: 'g1' | 'g2' | 'g3'): string => this.state[id] === 0 ? '—' : id === 'g3' ? this.state[id] === 1 ? '/' : '\\' : this.state[id] === 1 ? '\\' : '/';
    this.hud[2].setText(`Tập: ${this.state.practiceComplete ? 'xong' : 'thử'} · Cầu: ${Number(this.state.latchA) + Number(this.state.latchB)}/2 · G1 ${glyph('g1')} / G2 ${glyph('g2')} / G3 ${glyph('g3')}`);
    if (this.stepKey !== live.step) { this.stepKey = live.step; this.hintIndex = 0; }
  }
}
