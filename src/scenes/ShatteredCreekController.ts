import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import { SHATTERED_CREEK, canApproach, canCompleteCreek, deriveCreekState, migrateV1Creek, resolveCreekSpawn, unsafePowerChange, type CreekLiveState, type CreekState, type MirrorPose, type Point, type RaySegment } from '../data/shatteredCreekLayout';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { LanternSystem } from '../systems/LanternSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';

type Say = (lines: DialogueLine[], done?: () => void) => void;
const creekMechanismArt = (filename: string): string | null => getLevelArtKey(3, `mechanisms/${filename}`);

/** Water flows south, towards the player (1 = south, -1 = north). */
const FLOW_DIRECTION = 1;
/** The creek is nearly dry when the level opens (see the opening dialogue) and runs stronger as each span is restored. */
const FLOW_BASE = 0.3;
const FLOW_PER_BRIDGE = 0.35;
/** Scroll speed in px/s at full strength, slowest (deepest) layer first. Each texture wraps vertically. */
const WATER_LAYERS = [
  { art: 'creek-water-deep', speed: 9, depth: 0.1, fadesWithFlow: false },
  { art: 'creek-water-streaks', speed: 26, depth: 0.11, fadesWithFlow: true },
  { art: 'creek-water-glints', speed: 40, depth: 0.12, fadesWithFlow: true },
] as const;
/** The painted backdrop is re-cut so its chasm mouths sit over the rivers; the yard frame fades over this many px. */
const WATER_FADE = 14;
type Context = { scene: Phaser.Scene; player: Player; lumo: Lumo; lantern: LanternSystem; interactions: InteractionSystem; progress: CampaignProgress; save: () => void; say: Say; nextLevel: (lines: DialogueLine[]) => void; isDialogueActive: () => boolean };

const OPENING: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Suối chỉ còn ngần này nước thôi sao?' },
  { speaker: 'Lumo', text: 'Trước kia, nước chảy suốt ngày đêm ở đây.' },
  { speaker: 'Nhinh', text: 'Cây lớn phía kia… là Cây Mẹ à?' },
  { speaker: 'Lumo', text: 'Ừ. Ba hốc trống trên thân là chỗ đặt những mảnh tinh thể.' },
  { speaker: 'Nhinh', text: 'Vậy mình đang đi đúng hướng. Nhưng làm sao sang được bờ bên kia?' },
  { speaker: 'Lumo', text: 'Những cây cầu ở đây cần ánh sáng mới hiện ra.' },
  { speaker: 'Nhinh', text: 'Có bệ đèn với một chiếc gương nhỏ cạnh lối vào. Mình thử ở đó trước nhé?' },
];
const OPEN_PRACTICE: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Bông hoa bằng đá mà cũng mở được!' },
  { speaker: 'Lumo', text: 'Cậu vừa dùng gương đưa ánh sáng tới nó đấy.' },
  { speaker: 'Nhinh', text: 'Vậy mình thử với những chiếc gương bên suối xem. Để tôi lấy đèn đã.' },
];
const FIRST_BRIDGE: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Có cầu rồi! Nhưng mới tới hòn đảo.' },
  { speaker: 'Nhinh', text: 'Tay chốt kia nối với chân cầu. Thử gài xem có giữ được nó không.' },
];
const LATCH_A_DONE: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Khớp rồi. Chốt đã giữ cầu lại.' }];
const REROUTE_TO_ISLAND: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Tia đã đổi hướng mà cầu vẫn còn!' },
  { speaker: 'Lumo', text: 'Giờ ánh sáng đã tới được chiếc gương trên đảo. Mình thử xoay nó nhé.' },
];
const LATCH_B_DONE: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Cả hai đoạn cầu đã giữ chắc rồi. Mình quay lại lấy đèn thôi.' }];
const LATCH_UNPOWERED: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Chốt chưa ăn khớp. Có lẽ cầu phải hiện lên trước.' }];
const LATCH_REPEAT: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Chốt vẫn chắc. Đổi hướng ánh sáng cũng không làm cầu mất nữa.' }];
const UNSAFE_ON_BRIDGE: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Khoan đã. Mình phải lên bờ trước khi đổi ánh sáng.' }];
const UNSAFE_RETURN_PATH: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Đổi tia lúc này sẽ mất đường về. Mình phải gài chốt trước đã.' }];
const RELIEF_LAMP_REMINDER: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Suýt nữa thì quên đèn. Mình quay lại lấy đã.' }];
const RELIEF_FIRST: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Những tia sáng này… đều hướng về Cây Mẹ.' },
  { speaker: 'Nhinh', text: 'Người này cũng mang một chiếc đèn. Có phải người trong bức tranh ở thư viện không?' },
  { speaker: 'Lumo', text: 'Mưa… Đêm đó mưa lớn lắm.' },
  { speaker: 'Nhinh', text: 'Có phải người này đang thắp sáng để dẫn người đi lạc về không?' },
  { speaker: 'Lumo', text: 'Tôi không biết. Tôi chỉ nhớ tiếng chuông trên tháp. Nó kêu mãi giữa tiếng mưa.' },
  { speaker: 'Nhinh', text: 'Nhưng trong hình, nước vẫn chảy tới gốc cây. Chuyện gì đã làm nó ngừng lại nhỉ?' },
  { speaker: 'Lumo', text: 'Đường nước đi qua trạm phía trước. Có lẽ ở đó còn ghi lại chuyện đã xảy ra.' },
];
const RELIEF_REPEAT: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Ánh sáng hướng về Cây Mẹ, còn nước vẫn chảy dưới chân tháp.' }];
const EXIT_LEAVE_LAMP: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Đèn vẫn còn trên bệ. Mình phải mang theo.' }];
const EXIT_UNREAD_RELIEF: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Mình chưa xem bức phù điêu kia. Biết đâu có thêm manh mối.' }];
const EXIT_NEXT: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Chỗ đó vừa sáng khi tôi tới gần.' },
  { speaker: 'Nhinh', text: 'Có lẽ trạm này vẫn còn hoạt động. Mình vào xem nhé?' },
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
  private state!: CreekState;
  private cleaned = false;
  private stepKey = '';
  private flowLayers: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number; fadesWithFlow: boolean }> = [];
  private moonGlitter?: Phaser.GameObjects.Image;
  private flowStrength = FLOW_BASE;
  private flowSnapped = false;

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
    this.updateVisuals();
    this.ctx.lumo.setVisible(true);
    this.startOpening();
  }

  public update(): void {
    if (this.cleaned) return;
    const live = deriveCreekState(this.state);
    const laneA = this.colliderBodies.get('water-0-lane'); const laneB = this.colliderBodies.get('water-1-lane');
    if (laneA) laneA.enable = !live.bridgeA;
    if (laneB) laneB.enable = !live.bridgeB;
    this.updateVisuals();
    this.animateWater(live);
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
        this.ctx.say(FIRST_BRIDGE);
      } else if (this.state.latchA && live.mainSegments.some((segment) => segment.hit === 'g3') && !this.ctx.progress.flags['l3-reroute-dialogue']) {
        this.ctx.progress.flags['l3-reroute-dialogue'] = true; this.ctx.save();
        this.ctx.say(REROUTE_TO_ISLAND);
      }
    }
  }

  private startOpening(): void {
    if (this.ctx.progress.flags['intro-3']) return;
    this.ctx.progress.flags['intro-3'] = true; this.ctx.save(); this.ctx.say(OPENING);
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
      { speaker: 'Hệ thống', text: 'Ghi chép — trong phù điêu, dòng nước vẫn chảy. Chưa rõ điều gì xảy ra sau đó; trạm phía trước có thể giữ thêm manh mối.' },
    );
    this.ctx.say(discoveries.length ? discoveries : [{ speaker: 'Hệ thống', text: 'Chưa có ghi chép mới từ suối.' }]);
  }

  public destroy(): void {
    this.cleaned = true;
    this.colliders.forEach((collider) => collider.destroy());
    this.objects.forEach((object) => object.destroy());
    this.flowLayers = []; this.moonGlitter = undefined; this.colliders = []; this.objects = []; this.visuals.clear(); this.bodies = []; this.colliderBodies.clear();
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
    if (already) { this.ctx.say(LATCH_REPEAT); return; }
    if (which === 'B' && !this.state.latchA) { this.ctx.say(LATCH_UNPOWERED); return; }
    if (!powered) { this.ctx.say(LATCH_UNPOWERED); return; }
    if (which === 'A') {
      this.state.latchA = true; this.ctx.progress.flags['l3-latch-a'] = true;
      this.ctx.say(LATCH_A_DONE);
    } else {
      this.state.latchB = true; this.ctx.progress.flags['l3-latch-b'] = true;
      this.ctx.say(LATCH_B_DONE);
    }
    this.saveState();
  }

  private readRelief(): void {
    if (!this.state.lanternRetrieved || this.state.source !== null) { this.ctx.say(RELIEF_LAMP_REMINDER); return; }
    const first = !this.state.memo; this.state.memo = true; this.ctx.progress.flags['l3-memo'] = true; this.saveState();
    this.ctx.say(first ? RELIEF_FIRST : RELIEF_REPEAT);
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
    if (this.state.source !== null || !this.state.lanternRetrieved) { this.ctx.say(EXIT_LEAVE_LAMP); return; }
    if (!this.state.memo) { this.ctx.say(EXIT_UNREAD_RELIEF); return; }
    if (!canCompleteCreek(this.state)) {
      const missing = [!this.state.latchA && 'gài chốt cầu đầu', !this.state.latchB && 'gài chốt cầu thứ hai'].filter(Boolean).join(', ');
      this.ctx.say([{ speaker: 'Nhinh', text: `Trạm chưa mở. Mình còn cần ${missing}.` }]); return;
    }
    this.ctx.nextLevel(EXIT_NEXT);
  }

  private drawGround(): void {
    const { scene } = this.ctx;
    if (this.drawComposedScene()) return;
    const backdropKey = getLevelArtKey(3, 'creek-scene-base');
    if (backdropKey && scene.textures.exists(backdropKey)) {
      const background = scene.add.image(0, 0, backdropKey).setOrigin(0, 0).setDisplaySize(640, 360).setCrop(0, 0, 640, 88).setDepth(0); this.keep(background);
    }
    const { bounds, water } = SHATTERED_CREEK;
    this.keep(scene.add.tileSprite(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width, bounds.height, 'ground_stone').setTint(0x9ea895).setDepth(0));
    for (const river of water) this.keep(scene.add.tileSprite(river.x + river.width / 2, river.y + river.height / 2, river.width, river.height, 'tile_water').setTint(0x8cc0c5).setDepth(0.1));
    for (const river of water) for (const x of [river.x, river.x + river.width]) this.keep(scene.add.tileSprite(x, river.y + river.height / 2, 4, river.height, 'stepping_stone').setTint(0x8c988b).setDepth(1));
    this.addBridge('a', 'west'); this.addBridge('b', 'east');
  }

  /**
   * One painted image for the whole yard (frame, kerbed flagstone banks, bank rims, painted chasm mouths) with the two
   * river channels transparent, over live water layers. Returns false when any art is missing so the plain tile
   * ground below still works.
   */
  private drawComposedScene(): boolean {
    const { scene } = this.ctx;
    const composite = getLevelArtKey(3, 'creek-scene-composite');
    const keys = WATER_LAYERS.map((layer) => getLevelArtKey(3, layer.art));
    const foam = getLevelArtKey(3, 'creek-water-foam');
    const moon = getLevelArtKey(3, 'creek-moon-streak');
    if (!composite || !foam || !moon || keys.some((key) => !key) || ![composite, foam, moon, ...keys].every((key) => scene.textures.exists(key as string))) return false;
    const { bounds, water } = SHATTERED_CREEK;
    const top = bounds.y - WATER_FADE;
    const height = bounds.height + WATER_FADE * 2;
    for (const river of water) {
      const cx = river.x + river.width / 2;
      const cy = top + height / 2;
      WATER_LAYERS.forEach((layer, index) => {
        const sprite = scene.add.tileSprite(cx, cy, river.width, height, keys[index] as string).setDepth(layer.depth);
        this.keep(sprite);
        this.flowLayers.push({ sprite, speed: layer.speed, fadesWithFlow: layer.fadesWithFlow });
      });
      const foamWidth = scene.textures.get(foam).getSourceImage().width;
      for (const [x, flip] of [[river.x + foamWidth / 2, false], [river.x + river.width - foamWidth / 2, true]] as const) {
        const sprite = scene.add.tileSprite(x, cy, foamWidth, height, foam).setDepth(0.13).setFlipX(flip);
        this.keep(sprite);
        this.flowLayers.push({ sprite, speed: 14, fadesWithFlow: true });
      }
    }
    // Moon glitter under the painted moon pool above the west river.
    this.moonGlitter = scene.add.image(water[0].x + water[0].width / 2, bounds.y - 4, moon).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.15);
    this.keep(this.moonGlitter);
    this.keep(scene.add.image(0, 0, composite).setOrigin(0, 0).setDisplaySize(640, 360).setDepth(0.2));
    this.addBridge('a', 'west'); this.addBridge('b', 'east');
    return true;
  }

  /** The current strengthens with each restored span; the textures scroll by integrating speed over frame time. */
  private animateWater(live: CreekLiveState): void {
    if (this.flowLayers.length === 0) return;
    const target = Math.min(1, FLOW_BASE + FLOW_PER_BRIDGE * ((live.bridgeA ? 1 : 0) + (live.bridgeB ? 1 : 0)));
    const dt = Math.min(0.05, this.ctx.scene.game.loop.delta / 1000);
    if (!this.flowSnapped) { this.flowStrength = target; this.flowSnapped = true; }
    this.flowStrength += (target - this.flowStrength) * Math.min(1, dt * 1.2);
    for (const layer of this.flowLayers) {
      layer.sprite.tilePositionY -= FLOW_DIRECTION * layer.speed * this.flowStrength * dt;
      if (layer.fadesWithFlow) layer.sprite.setAlpha(0.25 + 0.75 * this.flowStrength);
    }
    if (this.moonGlitter) {
      const t = this.ctx.scene.time.now / 1000;
      this.moonGlitter.setAlpha((0.45 + 0.25 * Math.sin(t * 1.7)) * (0.5 + 0.5 * this.flowStrength));
      this.moonGlitter.setScale(1 + 0.04 * Math.sin(t * 2.3), 1);
    }
  }

  private drawMechanisms(): void {
    const { objects } = SHATTERED_CREEK;
    this.addImage('practice-source', creekMechanismArt('source-empty'), objects.practiceSource.ground, 32, 44);
    this.addImage('practice-mirror', creekMechanismArt('mirror-1-backslash'), objects.practiceMirror.ground, 32, 40);
    this.addImage('practice-eye', creekMechanismArt('test-flower-closed'), objects.practiceEye.ground, 28, 28);
    this.addImage('source', creekMechanismArt('source-empty'), objects.source.ground, 32, 44);
    for (const [id, mirrorIndex] of [['g1', 1], ['g2', 2], ['g3', 3]] as const) this.addImage(id, this.mirrorTexture(id, this.state[id]), objects[id].ground, 32, 40);
    this.addImage('eyeA', creekMechanismArt('receiver-off'), objects.eyeA.ground, 24, 24);
    this.addImage('eyeB', creekMechanismArt('receiver-off'), objects.eyeB.ground, 24, 24);
    this.addImage('latch-latchA', creekMechanismArt('latch-west-unlatched'), objects.latchA.ground, 28, 32);
    this.addImage('latch-latchB', creekMechanismArt('latch-east-unlatched'), objects.latchB.ground, 28, 32);
    this.addImage('relief', getLevelArtKey(3, 'storm-relief'), objects.relief.ground, 128, 80);
    this.addImage('exit', getLevelArtKey(1, 'woods_arch_open_passage'), objects.exit.ground, 88, 86.625, 5);
    for (const [id, name, x, y] of [['g1', 'G1 · •', 202, 150], ['g2', 'G2 · ••', 202, 84], ['g3', 'G3 · •••', 350, 84]] as const) this.addLabel(id, name, x, y);
    this.addLabel('practice-source-label', 'Bệ thử', 68, 238, 7);
    this.addLabel('practice-mirror-label', 'Gương thử', 132, 238, 7);
    this.addLabel('source-label', 'Bệ đèn', 40, 214);
    this.beams = this.keep(this.ctx.scene.add.graphics().setDepth(6));
  }

  private addBridge(id: 'a' | 'b', side: 'west' | 'east'): void {
    const entry = SHATTERED_CREEK.bridges[id];
    const image = this.image(`bridge-${id}`, creekMechanismArt(`bridge-${side}-absent`), entry.art, 100, 36, 3);
    if (image) image.setOrigin(0.5, 0.5).setData('bridgeSide', side);
  }

  private updateVisuals(): void {
    const live = deriveCreekState(this.state);
    for (const id of ['g1', 'g2', 'g3'] as const) this.setImage(id, this.mirrorTexture(id, this.state[id]));
    this.setImage('practice-mirror', creekMechanismArt(`mirror-1-${this.state.practice === 0 ? 'horizontal' : this.state.practice === 1 ? 'backslash' : 'slash'}`));
    this.setImage('practice-eye', creekMechanismArt(live.practiceLit ? 'test-flower-open' : 'test-flower-closed'));
    this.setImage('source', creekMechanismArt(this.state.source === 'main' ? this.state.lanternOn ? 'source-lit' : 'source-off-source' : 'source-empty'));
    this.setImage('practice-source', creekMechanismArt(this.state.source === 'practice' ? this.state.lanternOn ? 'source-lit' : 'source-off-source' : 'source-empty'));
    this.setImage('eyeA', creekMechanismArt(live.eyeA ? 'receiver-on' : 'receiver-off'));
    this.setImage('eyeB', creekMechanismArt(live.eyeB ? 'receiver-on' : 'receiver-off'));
    this.setImage('latch-latchA', creekMechanismArt(`latch-west-${this.state.latchA ? 'latched' : 'unlatched'}`));
    this.setImage('latch-latchB', creekMechanismArt(`latch-east-${this.state.latchB ? 'latched' : 'unlatched'}`));
    for (const [id, side, ready, latched] of [['a', 'west', live.bridgeA, this.state.latchA], ['b', 'east', live.bridgeB, this.state.latchB]] as const) {
      const image = this.visuals.get(`bridge-${id}`); if (!image) continue;
      const key = creekMechanismArt(`bridge-${side}-${latched ? 'latched' : ready ? 'powered' : 'absent'}`); if (key && this.ctx.scene.textures.exists(key) && image.texture.key !== key) image.setTexture(key);
    }
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
    return creekMechanismArt(`mirror-${id === 'g1' ? '1' : id === 'g2' ? '2' : '3'}-${direction}`);
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
    this.ctx.say(reason === 'occupied-bridge' ? UNSAFE_ON_BRIDGE : UNSAFE_RETURN_PATH);
  }
  private saveState(): void { this.state.lanternOn = this.ctx.lantern.lanternOn; this.ctx.progress.lanternOn = this.state.lanternOn; this.ctx.progress.counters.g1 = this.state.g1; this.ctx.progress.counters.g2 = this.state.g2; this.ctx.progress.counters.g3 = this.state.g3; this.ctx.progress.counters['l3-practice'] = this.state.practice; this.ctx.progress.flags['l3-practice-complete'] = this.state.practiceComplete; this.ctx.progress.flags['l3-latch-a'] = this.state.latchA; this.ctx.progress.flags['l3-latch-b'] = this.state.latchB; if (this.state.source) this.ctx.progress.flags['l3-lamp-source'] = this.state.source; else delete this.ctx.progress.flags['l3-lamp-source']; this.ctx.progress.flags['l3-lantern-retrieved'] = this.state.lanternRetrieved; this.ctx.save(); }

  private addLabel(id: string, text: string, x: number, y: number, depth = 15 + y / 10): void {
    const label = this.ctx.scene.add.text(x, y, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#f2ddb0', backgroundColor: '#07151c88', padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(depth);
    label.setData('creekLabel', id); this.keep(label);
  }

  public getObjectiveText(): string { return this.objectiveFor(deriveCreekState(this.state)); }

  public getStatusText(): string {
    const glyph = (id: 'g1' | 'g2' | 'g3'): string => this.state[id] === 0 ? '—' : id === 'g3' ? this.state[id] === 1 ? '/' : '\\' : this.state[id] === 1 ? '\\' : '/';
    return `Tập: ${this.state.practiceComplete ? 'xong' : 'thử'} · Cầu: ${Number(this.state.latchA) + Number(this.state.latchB)}/2 · G1 ${glyph('g1')} / G2 ${glyph('g2')} / G3 ${glyph('g3')}`;
  }

  public refreshHud(): void { this.updateHud(deriveCreekState(this.state)); }

  private objectiveFor(live: CreekLiveState): string {
    const goals: Record<CreekLiveState['step'], string> = { practice: 'Thử đặt đèn và gương nhỏ cạnh lối vào.', pickup: 'Thu hồi đèn bằng E.', main: 'Đặt đèn chính rồi điều hướng tia qua gương.', 'latch-a': 'Gài chốt cầu đầu bên bờ Tây.', reroute: 'Giữ cầu đầu rồi điều hướng tia sang gương trên đảo.', 'latch-b': 'Gài chốt cầu thứ hai trên đảo.', retrieve: this.state.source ? 'Thu hồi đèn khỏi bệ.' : 'Đặt đèn lên bệ chính rồi thu hồi.', relief: 'Đọc phù điêu bờ Đông.', exit: 'Đến trạm dẫn nước.' };
    const placedPowerStep = ['practice', 'main', 'latch-a', 'reroute', 'latch-b'].includes(live.step) && this.state.source !== null;
    return !this.state.lanternOn && placedPowerStep ? 'Đèn đang tắt. Nhấn F để bật tia sáng.' : live.step === 'main' && this.state.source === null ? 'Đặt đèn lên bệ chính bằng E.' : goals[live.step];
  }

  private updateHud(live: CreekLiveState): void {
    if (this.stepKey !== live.step) { this.stepKey = live.step; this.hintIndex = 0; }
  }
}
