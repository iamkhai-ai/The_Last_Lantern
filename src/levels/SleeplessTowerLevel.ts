import { HUD_LAYOUT } from '../ui/CampaignHud';
import { SoundSystem } from '../systems/SoundSystem';
import Phaser from 'phaser';
import { tr } from '../i18n/catalog.ts';
import { getLevelArtKey, getSharedMechanismKey, getTowerArtKey } from '../art/CampaignArt';
import { TOWER, TOWER_SOLIDS, canCompleteTower, canUseCallMark, deriveTowerLive, getTowerExitBlock, migrateTowerProgress, resolveTowerSpawn, towerCanApproach, towerCanApproachFront, type G0Pose, type MirrorPose, type Point, type Rect, type TowerLiveState, type TowerState, type TowerStep } from '../data/towerLayout';
import { CAMPAIGN_LEVELS } from '../data/campaignLevels';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';

export interface SleeplessTowerLevelOptions {
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
}

const OPENING: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Nước đang biến thành ánh sáng ở đây.' },
  { speaker: 'Lumo', text: 'Ngọn tháp dẫn đường cho người đi rừng. Nó từng chỉ sáng khi trời tối.' },
  { speaker: 'Nhinh', text: 'Giờ nó lấy cả phần nước của Cây Mẹ.' },
  { speaker: 'Lumo', text: 'Nếu dừng nó… người lạc đường sẽ tìm về bằng gì?' },
  { speaker: 'Nhinh', text: 'Mình xem cách máy hoạt động trước. Có thể nó vẫn còn một chế độ khác.' },
];

const BENCH_LESSON: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Một tia có thể chia làm hai.' },
  { speaker: 'Lumo', text: 'Nhưng nếu xoay gương đầu vào đi chỗ khác, cả hai nhánh đều mất.' },
  { speaker: 'Nhinh', text: 'Vậy phải nhìn cả hệ thống, không chỉ chiếc gương đang xoay.' },
];

const ONE_CIRCUIT: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Một vòng máy đã chạy. Hai vòng còn lại vẫn đứng.' },
  { speaker: 'Nhinh', text: 'Và vòng trước dừng khi mình đổi tia. Chúng cần hoạt động cùng nhau.' },
];

const CALL_C: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Cậu giữ ấn cuối nhé. Tôi chỉnh hai nhánh này.' },
  { speaker: 'Lumo', text: 'Tôi ở đây. Cậu cứ thử từng gương.' },
];

const THREE_CIRCUITS: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Cả ba vòng đều đang quay!' },
  { speaker: 'Nhinh', text: 'Tôi sẽ chuyển cần. Cậu giữ nguyên một chút.' },
];

const SWITCH_CAPTION = 'Bánh răng khóa ở chế độ Trả dòng. Đèn tháp dịu xuống, nước chảy xuống rừng. Cửa buồng mở.';
const RECORD_OPEN_CAPTION = 'Ngăn bản ghi mở. Tiếng mưa, rồi giọng một người đàn ông.';
const RECORD_FADE_CAPTION = 'Tiếng máy trong bản ghi tăng lên, rồi tắt. Nhinh nhìn chiếc khăn trên bậu cửa.';

const SWITCHED: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Xong rồi. Máy tự giữ chế độ mới. Cậu về được rồi, Lumo.' },
  { speaker: 'Lumo', text: 'Tôi nghe tiếng suối!' },
];

const RECORD_VOICE: DialogueLine[] = [
  { speaker: 'Người Bảo Vệ', text: 'Đội tìm kiếm đã trở về. Con bé vẫn chưa có mặt.' },
  { speaker: 'Người Bảo Vệ', text: 'Tôi sẽ giữ ngọn tháp sáng thêm một đêm. Nếu con nhìn thấy, cứ đi về phía ánh đèn. Cha ở đây.' },
];

const RECORD: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Ông ấy đang đợi con gái.' },
  { speaker: 'Lumo', text: 'Tôi nhớ chiếc khăn này. Nó từng đỏ.' },
  { speaker: 'Nhinh', text: 'Cậu có nhớ cô bé trở về không?' },
  { speaker: 'Lumo', text: 'Không. Tôi chỉ nhớ ánh đèn không được tắt.' },
  { speaker: 'Nhinh', text: 'Mình đã trả nước cho rừng. Nhưng vẫn cần biết chuyện gì xảy ra ở Cây Mẹ.' },
];

const RECORD_REPEAT: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Ông đã đứng ở đây qua bao nhiêu đêm?' },
];

const ENDING: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Nước đã trở lại. Sao những cây nhỏ vẫn cúi đầu?' },
  { speaker: 'Nhinh', text: 'Mình xuống gần xem.' },
];

/** Scenario 06 §6, Mức 1-3 verbatim: the placing step and the main puzzle (main, call, switch) share one ladder. */
const PUZZLE_HINTS: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Ba vòng trên máy nối tới hai mắt đá và ấn dành cho tôi. Bàn thử cho thấy cách tách tia.' },
  { speaker: 'Lumo', text: 'Gương chung phải cấp cho lăng kính để hai nhánh cùng sáng. Tôi giữ điều kiện thứ ba.' },
  { speaker: 'Lumo', text: 'Hướng G0 vào lăng kính, G1 vào A, G2 vào B. Gọi tôi tới C rồi dùng cần Trả dòng khi cả ba sáng.' },
];

const PUZZLE_STEPS: readonly TowerStep[] = ['place', 'main', 'call', 'switch'];
/** The key that resets the H ladder: the puzzle steps share one key, so presses keep their order across them. */
const hintLadderOf = (step: TowerStep): string => (PUZZLE_STEPS.includes(step) ? 'puzzle' : step);

const HINTS: Record<TowerStep, DialogueLine[]> = {
  practice: [
    { speaker: 'Lumo', text: 'Ba vòng trên máy nối tới hai mắt đá và ấn dành cho tôi. Bàn thử ở góc trên bên trái cho thấy cách tách tia.' },
    { speaker: 'Lumo', text: 'Bàn thử chỉ để học, không bắt buộc. Muốn thử: đặt đèn vào bệ bàn thử rồi xoay gương đầu vào cho tia đi qua lăng kính.' },
    { speaker: 'Lumo', text: 'Muốn vào thẳng máy chính: đặt đèn lên bệ giữa phòng và bật bằng F.' },
  ],
  place: PUZZLE_HINTS,
  main: PUZZLE_HINTS,
  call: PUZZLE_HINTS,
  switch: PUZZLE_HINTS,
  retrieve: [
    { speaker: 'Nhinh', text: 'Máy đã tự giữ chế độ mới. Thu hồi đèn khỏi bệ bằng E.' },
  ],
  crystal: [
    { speaker: 'Nhinh', text: 'Buồng đã mở. Nhấn E trước buồng để nhận Tinh thể Hy Vọng.' },
  ],
  record: [
    { speaker: 'Nhinh', text: 'Ngăn bản ghi dưới cửa sổ đã mở. Đứng phía trước ngăn, nhấn E để nghe.' },
  ],
  recall: [
    { speaker: 'Nhinh', text: 'Nhấn E ở mốc gọi để gọi Lumo trở về.' },
  ],
  exit: [
    { speaker: 'Nhinh', text: 'Hai đứa xuống theo bậc thang góc dưới bên trái.' },
  ],
};

const RECALL_FOLLOWING: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Lumo đang bay về. Đứng gần cậu ấy rồi xuống bậc thang góc dưới bên trái.' },
];

const OBJECTIVE: Record<TowerStep, string> = {
  practice: 'Thử lăng kính (tuỳ chọn) · Đặt đèn.',
  place: 'Đặt đèn lên bệ chính; bật bằng F.',
  main: 'Hướng G0, G1, G2 để sáng A + B.',
  call: 'A + B sáng. Gọi Lumo tới C.',
  switch: 'Ba mạch sáng. Gạt cần Trả dòng.',
  retrieve: 'Thu hồi đèn khỏi bệ bằng E.',
  crystal: 'Nhận Tinh thể Hy Vọng trong buồng.',
  record: 'Nghe bản ghi dưới cửa sổ.',
  recall: 'Gọi Lumo về ở mốc gọi.',
  exit: 'Xuống vườn qua bậc thang.',
};

const EXIT_REFUSAL: Record<'power' | 'lamp' | 'crystal' | 'record' | 'companion', string> = {
  power: 'Máy vẫn đang hút nước lên. Mình cần chuyển cần Trả dòng trước.',
  lamp: 'Đèn còn nằm trên bệ. Mình cần thu hồi đèn đã.',
  crystal: 'Buồng đã mở rồi. Mình cần nhận Tinh thể Hy Vọng.',
  record: 'Còn bản ghi dưới cửa sổ chưa nghe.',
  companion: 'Gọi Lumo về ở mốc gọi, rồi đứng gần cậu ấy mới xuống được.',
};

export class SleeplessTowerLevel {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private ownedTweens: Phaser.Tweens.Tween[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private bodies: Phaser.Physics.Arcade.StaticBody[] = [];
  private visuals = new Map<string, Phaser.GameObjects.Image>();
  private beams?: Phaser.GameObjects.Graphics;
  private panel?: Phaser.GameObjects.Image;
  private state!: TowerState;
  private route: Point[] = [];
  private routeIndex = 0;
  private hintIndex = 0;
  private stepKey = '';
  private cleaned = false;
  private pendingStoryBeats: Array<{ lines: DialogueLine[]; onComplete?: () => void }> = [];

  constructor(private readonly ctx: SleeplessTowerLevelOptions) {}

  public build(savedCenter?: Point): void {
    const { progress, lantern, lumo, player, save } = this.ctx;
    this.state = migrateTowerProgress(progress);
    SoundSystem.startAmbient(this.state.waterReturned ? 'tower-restored' : 'tower');
    progress.flags['l5-layout-v2'] = true;
    lantern.lanternInHand = this.state.source === null;
    lantern.lanternPlaced = this.state.source !== null;
    if (this.state.source) {
      const source = this.state.source === 'practice' ? TOWER.objects.benchSource : TOWER.objects.source;
      lantern.placeLanternAt(source.ground.x, source.optical.y + 6);
    }
    lantern.lanternOn = this.state.lanternOn;
    progress.lanternOn = this.state.lanternOn;
    if (this.state.lumoAssign === 'to-c') {
      this.route = [{ x: lumo.sprite.x, y: lumo.sprite.y }, ...TOWER.lumo.route.map((point) => ({ x: point.x, y: point.y }))];
      this.routeIndex = 0;
    } else if (this.state.lumoAssign === 'at-c') {
      lumo.sprite.setPosition(TOWER.lumo.seal.x - 18, TOWER.lumo.seal.y + 12);
    }
    const spawn = resolveTowerSpawn(savedCenter);
    player.setFootPlacement(19, 37, 11, 14, 6);
    player.setPosition(spawn.x, spawn.y);
    this.drawBackdrop();
    this.drawMachine();
    this.addSolids();
    this.registerActions();
    this.updateVisuals(deriveTowerLive(this.state, this.lumoPoint()));
    this.saveState();
    lumo.setVisible(true);
    if (!progress.flags['intro-5']) {
      progress.flags['intro-5'] = true;
      save();
      this.ctx.say(OPENING);
    }
  }

  public update(dt: number): void {
    if (this.cleaned) return;
    this.advanceLumo(dt);
    const live = deriveTowerLive(this.state, this.lumoPoint());
    this.updateVisuals(live);
    this.updateProgress(live);
    this.flushPendingStoryBeat();
    this.updateHud(live);
  }

  public refreshHud(): void { this.updateHud(deriveTowerLive(this.state, this.lumoPoint())); }

  public getObjectiveText(): string { return this.objectiveFor(deriveTowerLive(this.state, this.lumoPoint())); }

  public getStatusText(): string { return this.statusFor(deriveTowerLive(this.state, this.lumoPoint())); }

  public getProtectedPromptBounds(): PromptRect[] {
    return ['call', 'lever', 'chamber', 'record']
      .map((id) => this.visuals.get(id))
      .filter((image): image is Phaser.GameObjects.Image => Boolean(image?.active && image.visible))
      .map((image) => image.getBounds());
  }

  public toggleLantern(): boolean {
    if (this.ctx.lantern.lanternPlaced) {
      this.state.lanternOn = !this.state.lanternOn;
      this.ctx.lantern.lanternOn = this.state.lanternOn;
      this.saveState();
      return true;
    }
    if (!this.ctx.lantern.lanternInHand) return false;
    if (!this.ctx.lantern.toggleLantern(performance.now())) return false;
    this.state.lanternOn = this.ctx.lantern.lanternOn;
    this.saveState();
    return true;
  }

  public showHint(): void {
    const live = deriveTowerLive(this.state, this.lumoPoint());
    if (this.stepKey !== hintLadderOf(live.step)) { this.stepKey = hintLadderOf(live.step); this.hintIndex = 0; }
    const choices = this.hintsFor(live);
    const line = choices[Math.min(this.hintIndex, choices.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, choices.length - 1);
    this.ctx.say([line]);
  }

  public showJournal(): void {
    const entries: DialogueLine[] = [
      { speaker: 'Nhinh', text: 'Bảng điều tiết ghi: ba mạch cùng ổn định, sau đó mới chuyển từ giữ sáng sang trả dòng.' },
    ];
    if (this.state.practiceDone) entries.push({ speaker: 'Nhinh', text: 'Lăng kính chia một tia thành hai; xoay gương đầu vào đi chỗ khác thì cả hai nhánh tắt.' });
    if (this.state.waterReturned) entries.push({ speaker: 'Lumo', text: 'Ba vòng cùng sáng khi G0 vào lăng kính, G1 vào A, G2 vào B, và tôi giữ ấn C.' });
    if (this.state.recordRead) entries.push({ speaker: 'Nhinh', text: 'Bản ghi: người cha giữ đèn sáng thêm một đêm, đợi con theo ánh sáng về.' });
    this.ctx.say(entries);
  }

  public destroy(): void {
    if (this.cleaned) return;
    this.cleaned = true;
    this.ownedTweens.splice(0).forEach((tween) => { if (tween.isPlaying()) tween.stop(); });
    this.colliders.forEach((collider) => { if (collider.active) collider.destroy(); });
    this.objects.forEach((object) => { if (object.active) object.destroy(); });
    this.colliders = []; this.objects = []; this.visuals.clear(); this.bodies = [];
    this.panel = undefined;
    this.ctx.interactions.clear();
  }

  private point(): Point { return { x: this.ctx.player.x, y: this.ctx.player.y }; }

  private lumoPoint(): Point { return { x: this.ctx.lumo.sprite.x, y: this.ctx.lumo.sprite.y }; }

  private advanceLumo(dt: number): void {
    const { lumo, player } = this.ctx;
    if (this.state.lumoAssign === 'to-c') {
      if (this.routeIndex >= this.route.length) {
        this.state.lumoAssign = 'at-c';
        this.saveState();
      } else {
        const target = this.route[this.routeIndex];
        lumo.update(dt, target.x - 18, target.y + 12, true);
        if (Math.hypot(lumo.sprite.x - target.x, lumo.sprite.y - target.y) < 8) this.routeIndex += 1;
        return;
      }
    }
    if (this.state.lumoAssign === 'at-c') {
      const seal = TOWER.lumo.seal;
      lumo.update(dt, seal.x - 18, seal.y + 12, true);
      return;
    }
    const targetX = Phaser.Math.Clamp(player.x - 20, 32, 608);
    const targetY = Phaser.Math.Clamp(player.y - 6, 92, 302);
    lumo.update(dt, targetX, targetY, true);
  }

  private updateProgress(live: TowerLiveState): void {
    if (live.practiceLit && !this.state.practiceDone) {
      this.state.practiceDone = true;
      this.saveState();
    }
    const distance = Math.hypot(this.ctx.player.x - this.ctx.lumo.sprite.x, this.ctx.player.y - this.ctx.lumo.sprite.y);
    const canReunite = this.state.lumoAssign === 'follow';
    const reunited = this.state.reunited
      ? canReunite && distance <= TOWER.lumo.reuniteRange + 8
      : canReunite && distance <= TOWER.lumo.reuniteRange;
    if (reunited !== this.state.reunited) {
      this.state.reunited = reunited;
      this.saveState();
    }
    const circuits = Number(live.liveA) + Number(live.liveB) + Number(live.lumoAtC);
    if (this.state.source === 'main' && circuits === 1 && this.ctx.progress.flags['l5-one-seen'] !== true) {
      this.ctx.progress.flags['l5-one-seen'] = true;
      this.ctx.save();
      this.queueStoryBeat(ONE_CIRCUIT);
    }
    if (this.state.source === 'main' && live.liveA && live.liveB && live.lumoAtC && this.ctx.progress.flags['l5-three-seen'] !== true) {
      this.ctx.progress.flags['l5-three-seen'] = true;
      this.ctx.save();
      this.queueStoryBeat(THREE_CIRCUITS);
    }
  }

  private queueStoryBeat(lines: DialogueLine[], onComplete?: () => void): void {
    this.pendingStoryBeats.push({ lines, onComplete });
  }

  private flushPendingStoryBeat(): void {
    if (!this.pendingStoryBeats.length || !this.ctx.canStartStory()) return;
    const beat = this.pendingStoryBeats.shift();
    if (beat) this.ctx.say(beat.lines, beat.onComplete);
  }

  private registerActions(): void {
    const { interactions } = this.ctx;
    // RULE_GAMES §1: standing props answer E from their south face only. Props without a front rect (record, stairs) are wall or door controls.
    const add = (id: string, stand: Point, prompt: () => string, onInteract: () => void, artId: string, enabled: () => boolean = () => true, front?: Rect) => {
      const reach = (): boolean => (front ? towerCanApproachFront(this.point(), stand, front) : towerCanApproach(this.point(), stand));
      const config: InteractableConfig = {
        id: `tower-${id}`,
        x: stand.x,
        y: stand.y,
        radius: TOWER.interactionRange,
        getPrompt: () => (reach() ? prompt() : null),
        getPromptBounds: () => this.visuals.get(artId)?.getBounds() ?? null,
        isEnabled: () => reach() && enabled(),
        onInteract: () => { if (reach()) onInteract(); },
      };
      interactions.register(config);
    };
    const o = TOWER.objects;
    add('bench-source', o.benchSource.stand, () => this.sourcePrompt('practice'), () => this.useSource('practice'), 'bench-source', undefined, o.benchSource.base);
    add('bench-mirror', o.benchMirror.stand, () => 'E · Xoay gương đầu vào', () => this.rotateBench(), 'bench-mirror', undefined, o.benchMirror.base);
    add('source', o.source.stand, () => this.sourcePrompt('main'), () => this.useSource('main'), 'source', undefined, o.source.base);
    add('g0', o.g0.stand, () => 'E · Xoay gương chung G0', () => this.rotateG0(), 'g0', undefined, o.g0.base);
    add('g1', o.g1.stand, () => 'E · Xoay gương nhánh G1', () => this.rotateBranch('g1'), 'g1', undefined, o.g1.base);
    add('g2', o.g2.stand, () => 'E · Xoay gương nhánh G2', () => this.rotateBranch('g2'), 'g2', undefined, o.g2.base);
    add('call', o.call.stand, () => (this.state.lumoAssign === 'follow' ? 'E · Gọi Lumo tới ấn C' : 'E · Gọi Lumo về'), () => this.useCall(), 'call', () => canUseCallMark(this.state), o.call.base);
    add('lever', o.lever.stand, () => (this.state.waterReturned ? 'E · Cần đang giữ chế độ Trả dòng' : 'E · Gạt cần Trả dòng'), () => this.useLever(), 'lever', undefined, o.lever.base);
    add('chamber', o.chamber.stand, () => (!this.state.waterReturned ? 'E · Buồng tinh thể còn khóa' : !this.state.crystal ? 'E · Nhận Tinh thể Hy Vọng' : 'E · Ngăn chứa đã trống'), () => this.useChamber(), 'chamber', undefined, o.chamber.solid);
    add('record', o.record.stand, () => (this.state.recordRead ? 'E · Nghe lại bản ghi' : 'E · Nghe bản ghi bên cửa sổ'), () => this.useRecord(), 'record', () => this.state.crystal);
    add('exit', TOWER.stairsStand, () => (canCompleteTower(this.state) ? 'E · Xuống khu vườn' : 'E · Kiểm tra lối xuống'), () => this.useExit(), 'exit');
  }

  private sourcePrompt(which: 'practice' | 'main'): string {
    if (this.state.source && this.state.source !== which) return `E · Đèn đang ở bệ ${this.state.source === 'practice' ? 'thử' : 'chính'}`;
    if (this.state.source === which) return 'E · Thu hồi đèn';
    return 'E · Đặt đèn';
  }

  private useSource(which: 'practice' | 'main'): void {
    const { lantern } = this.ctx;
    if (this.state.source && this.state.source !== which) {
      this.ctx.say([{ speaker: 'Nhinh', text: tr('Đèn vẫn nằm trên bệ {stand}.', { stand: tr(this.state.source === 'practice' ? 'thử' : 'chính') }) }]);
      return;
    }
    if (this.state.source === which) {
      const isOn = this.state.lanternOn;
      lantern.retrieveLantern();
      lantern.lanternOn = isOn;
      this.state.source = null;
      this.state.lanternRetrieved = true;
      this.ctx.progress.lanternPickedUp = true;
      this.saveState();
      return;
    }
    const source = which === 'practice' ? TOWER.objects.benchSource : TOWER.objects.source;
    lantern.placeLanternAt(source.ground.x, source.optical.y + 6);
    lantern.lanternOn = this.state.lanternOn;
    this.state.source = which;
    this.state.lanternRetrieved = false;
    this.saveState();
    if (which === 'practice' && this.ctx.progress.flags['l5-bench-seen'] !== true) {
      this.ctx.progress.flags['l5-bench-seen'] = true;
      this.ctx.save();
      this.ctx.say(BENCH_LESSON);
    }
  }

  private rotateBench(): void {
    this.state.practice = ((this.state.practice + 1) % 3) as MirrorPose;
    this.saveState();
    SoundSystem.playMirrorRotate();
  }

  private rotateG0(): void {
    this.state.g0 = ((this.state.g0 + 1) % 3) as G0Pose;
    this.saveState();
    SoundSystem.playMirrorRotate();
  }

  private rotateBranch(id: 'g1' | 'g2'): void {
    this.state[id] = ((this.state[id] + 1) % 3) as MirrorPose;
    this.saveState();
    SoundSystem.playMirrorRotate();
  }

  private useCall(): void {
    if (!canUseCallMark(this.state)) return;
    if (this.state.lumoAssign === 'follow') {
      const lumo = this.ctx.lumo;
      this.route = [{ x: lumo.sprite.x, y: lumo.sprite.y }, ...TOWER.lumo.route.map((point) => ({ x: point.x, y: point.y }))];
      this.routeIndex = 0;
      this.state.lumoAssign = 'to-c';
      this.ctx.progress.flags['l5-called-high'] = true;
      this.saveState();
      this.ctx.say(CALL_C);
      return;
    }
    this.state.lumoAssign = 'follow';
    this.state.reunited = false;
    this.ctx.progress.flags['l5-return-called'] = true;
    this.route = [];
    this.routeIndex = 0;
    this.saveState();
  }

  private useLever(): void {
    if (this.state.waterReturned) {
      this.ctx.say([{ speaker: 'Nhinh', text: 'Máy đang tự giữ chế độ Trả dòng. Không cần chuyển lại.' }]);
      return;
    }
    const live = deriveTowerLive(this.state, this.lumoPoint());
    if (!live.canSwitch) {
      const missing: string[] = [];
      if (this.state.source === null) missing.push(tr('đặt đèn lên bệ chính'));
      else if (this.state.source === 'practice') missing.push(tr('đưa đèn sang bệ chính'));
      else if (!this.state.lanternOn) missing.push(tr('bật đèn'));
      if (!live.liveA) missing.push(tr('nối nhánh A'));
      if (!live.liveB) missing.push(tr('nối nhánh B'));
      if (!live.lumoAtC) missing.push(tr('giữ ấn C'));
      this.ctx.say([{ speaker: 'Nhinh', text: tr('Máy vẫn đang chờ. Mình còn thiếu: {missing}.', { missing: missing.join(', ') }) }]);
      return;
    }
    this.state.waterReturned = true;
    this.saveState();
    SoundSystem.playMechanismLatch();
    SoundSystem.playWaterRelease();
    SoundSystem.startAmbient('tower-restored');
    this.caption(SWITCH_CAPTION);
    this.ctx.scene.cameras.main.shake(260, 0.0015);
    this.ctx.say(SWITCHED);
  }

  private useChamber(): void {
    if (!this.state.waterReturned) {
      this.ctx.say([{ speaker: 'Nhinh', text: 'Buồng tinh thể chỉ mở khi máy chuyển sang chế độ Trả dòng.' }]);
      return;
    }
    if (this.state.crystal) {
      this.ctx.say([{ speaker: 'Nhinh', text: 'Ngăn chứa đã trống.' }]);
      return;
    }
    this.state.crystal = true;
    this.visuals.get('crystal')?.destroy();
    this.visuals.delete('crystal');
    this.saveState();
    SoundSystem.playCrystalPickup();
  }

  private useRecord(): void {
    if (!this.state.crystal) return;
    this.showPanel();
    if (this.state.recordRead) {
      this.ctx.say(RECORD_REPEAT, () => this.hidePanel());
      return;
    }
    this.state.recordRead = true;
    this.saveState();
    this.caption(RECORD_OPEN_CAPTION);
    this.ctx.say(RECORD_VOICE, () => {
      this.caption(RECORD_FADE_CAPTION);
      this.ctx.say(RECORD, () => this.hidePanel());
    });
  }

  private useExit(): void {
    const block = getTowerExitBlock(this.state);
    if (block === null) {
      this.prepareLevelExit();
      return;
    }
    this.ctx.say(block === 'companion' && this.state.lumoAssign === 'follow' ? RECALL_FOLLOWING : [{ speaker: 'Nhinh', text: EXIT_REFUSAL[block] }]);
  }

  private prepareLevelExit(): void {
    const position = this.lumoPoint();
    this.ctx.progress.counters['lumo-x'] = Math.round(position.x);
    this.ctx.progress.counters['lumo-y'] = Math.round(position.y);
    this.ctx.progress.counters['lumo-target-x'] = Math.round(position.x);
    this.ctx.progress.counters['lumo-target-y'] = Math.round(position.y);
    this.ctx.save();
    this.ctx.nextLevel(ENDING);
  }

  private hintsFor(live: TowerLiveState): DialogueLine[] {
    if (live.step === 'recall' && this.state.lumoAssign === 'follow') return RECALL_FOLLOWING;
    return HINTS[live.step];
  }

  private objectiveFor(live: TowerLiveState): string {
    const placedPower = this.state.source !== null && ['practice', 'place', 'main', 'call', 'switch'].includes(live.step);
    if (placedPower && !this.state.lanternOn) return 'Đèn tắt · Nhấn F để bật.';
    if (live.step === 'recall' && this.state.lumoAssign === 'follow') return 'Lumo đang về. Đợi cậu ấy rồi xuống vườn.';
    return OBJECTIVE[live.step];
  }

  private statusFor(live: TowerLiveState): string {
    const glyph = (on: boolean): string => (on && !this.state.waterReturned ? '●' : '○');
    return `A ${glyph(live.liveA)} · B ${glyph(live.liveB)} · C ${glyph(live.liveC)} · Nước ${this.state.waterReturned ? '↓' : '↑'}`;
  }

  private drawBackdrop(): void {
    const key = getTowerArtKey('tower-scene-base');
    if (!key || !this.ctx.scene.textures.exists(key)) return;
    const background = this.ctx.scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(640, 360).setDepth(0);
    this.keep(background);
  }

  private drawMachine(): void {
    const art5 = (filename: string): string | null => getTowerArtKey(filename);
    const art4 = (filename: string): string | null => getLevelArtKey(4, filename);
    const art3 = (filename: string): string | null => getLevelArtKey(3, `mechanisms/${filename}`);
    const shared = (filename: string): string | null => getSharedMechanismKey(filename);
    const mechanism = (filename: string): string | null => art3(filename) ?? shared(filename);
    const o = TOWER.objects;
    this.addImage('fountain', art5('fountain-up'), 307, 100, 56, 112, 8.0, 0.5);
    this.addImage('lamp', art5('tower-lamp-white'), 307, 84, 72, 72, 8.1, 0.5);
    this.addImage('ring-a', art5('ring-A-off'), TOWER.objects.rings.a.x, TOWER.objects.rings.a.y, 24, 24, 8.4, 0.5);
    this.addImage('ring-b', art5('ring-B-off'), TOWER.objects.rings.b.x, TOWER.objects.rings.b.y, 24, 24, 8.4, 0.5);
    this.addImage('ring-c', art5('ring-C-off'), TOWER.objects.rings.c.x, TOWER.objects.rings.c.y, 24, 24, 8.4, 0.5);
    this.addImage('window', art5('window-faded-red-scarf'), o.window.center.x, o.window.center.y, 112, 112, 8.2, 0.5);
    this.addImage('record', art5('record-compartment-closed'), o.record.center.x, o.record.center.y, 88, 32, 8.3, 0.5);
    this.addImage('intake', art5('tower-intake'), 66, 200, 112, 32, 6, 0.5);
    this.addImage('outflow', art5('tower-outflow'), 150, 302, 112, 32, 6, 0.5);
    this.visuals.get('outflow')?.setVisible(false);
    const tubeKey = art4('tube-straight');
    if (tubeKey && this.ctx.scene.textures.exists(tubeKey)) {
      const tube = this.ctx.scene.add.image(350, 266, tubeKey).setDisplaySize(38, 19).setRotation(Math.PI / 2).setDepth(6);
      this.visuals.set('tube', tube);
      this.keep(tube);
    }
    this.addImage('plate', art4('pressure-empty'), 350, 290, 44, 28, 6, 0.5);
    this.addImage('bench-source', mechanism('source-empty'), o.benchSource.ground.x, o.benchSource.ground.y, 32, 44, this.depthAt(o.benchSource.ground.y));
    this.addImage('bench-mirror', mechanism('mirror-1-horizontal'), o.benchMirror.ground.x, o.benchMirror.ground.y, 32, 40, this.depthAt(o.benchMirror.ground.y));
    this.addImage('bench-prism', art5('prism-dark'), o.benchPrism.center.x, o.benchPrism.center.y + 24, 48, 48, this.depthAt(o.benchPrism.center.y + 24));
    this.addImage('bench-eye-a', mechanism('receiver-off'), o.benchEyeA.ground.x, o.benchEyeA.ground.y, 24, 24, this.depthAt(o.benchEyeA.ground.y));
    this.addImage('bench-eye-b', mechanism('receiver-off'), o.benchEyeB.ground.x, o.benchEyeB.ground.y, 24, 24, this.depthAt(o.benchEyeB.ground.y));
    this.addImage('source', mechanism('source-empty'), o.source.ground.x, o.source.ground.y, 32, 44, this.depthAt(o.source.ground.y));
    this.addImage('g0', art5('G0-to-splitter'), o.g0.ground.x, o.g0.ground.y, 40, 48, this.depthAt(o.g0.ground.y));
    this.addImage('prism', art5('prism-dark'), o.prism.center.x, o.prism.center.y + 24, 48, 48, this.depthAt(o.prism.center.y + 24));
    this.addImage('g1', mechanism('mirror-1-horizontal'), o.g1.ground.x, o.g1.ground.y, 32, 40, this.depthAt(o.g1.ground.y));
    this.addImage('g2', mechanism('mirror-2-horizontal'), o.g2.ground.x, o.g2.ground.y, 32, 40, this.depthAt(o.g2.ground.y));
    this.addImage('eye-a', mechanism('receiver-off'), o.eyeA.ground.x, o.eyeA.ground.y, 24, 24, this.depthAt(o.eyeA.ground.y));
    this.addImage('eye-b', mechanism('receiver-off'), o.eyeB.ground.x, o.eyeB.ground.y, 24, 24, this.depthAt(o.eyeB.ground.y));
    this.addImage('call', art4('call-idle'), o.call.ground.x, o.call.ground.y, 40, 48, this.depthAt(o.call.ground.y));
    this.addImage('lever', art5('return-flow-waiting'), o.lever.ground.x, o.lever.ground.y, 40, 48, this.depthAt(o.lever.ground.y));
    this.addImage('chamber', art5('chamber-open'), o.chamber.ground.x, o.chamber.ground.y, 80, 104, this.depthAt(o.chamber.ground.y));
    this.addImage('grille', art5('chamber-grille-overlay'), o.chamber.ground.x, o.chamber.ground.y, 80, 104, this.depthAt(o.chamber.ground.y) + 0.2);
    if (!this.state.crystal) {
      const crystalKey = 'crystal_hope';
      if (this.ctx.scene.textures.exists(crystalKey)) {
        const crystal = this.ctx.scene.add.image(o.chamber.crystal.x, o.chamber.crystal.y, crystalKey).setDepth(this.depthAt(284) + 0.1);
        this.visuals.set('crystal', crystal);
        this.keep(crystal);
      }
    }
    this.addLabel('label-bench', 'Bàn thử', 140, 86);
    this.addLabel('label-g0', 'G0', 212, 190);
    this.addLabel('label-g1', 'G1', 251, 145);
    this.addLabel('label-g2', 'G2', 287, 238);
    this.addLabel('label-a', 'A', 477, 152);
    this.addLabel('label-b', 'B', 477, 241);
    this.beams = this.keep(this.ctx.scene.add.graphics().setDepth(7));
  }

  private addSolids(): void {
    const bounds = TOWER.bounds;
    this.addWorldCollider('bounds-n', bounds.x + bounds.width / 2, bounds.y - 6, bounds.width, 12);
    this.addWorldCollider('bounds-s', bounds.x + bounds.width / 2, bounds.y + bounds.height + 6, bounds.width, 12);
    this.addWorldCollider('bounds-w', bounds.x - 3, bounds.y + bounds.height / 2, 6, bounds.height);
    this.addWorldCollider('bounds-e', bounds.x + bounds.width + 3, bounds.y + bounds.height / 2, 6, bounds.height);
    for (const [index, solid] of TOWER_SOLIDS.entries()) {
      this.addWorldCollider(`solid-${index}`, solid.x + solid.width / 2, solid.y + solid.height / 2, solid.width, solid.height);
    }
  }

  private updateVisuals(live: TowerLiveState): void {
    const art5 = (filename: string): string | null => getTowerArtKey(filename);
    const art4 = (filename: string): string | null => getLevelArtKey(4, filename);
    const shared = (filename: string): string | null => getSharedMechanismKey(filename);
    const mechanism = (filename: string): string | null => getLevelArtKey(3, `mechanisms/${filename}`) ?? shared(filename);
    const benchDirection = (pose: MirrorPose): string => (pose === 1 ? 'slash' : pose === 2 ? 'backslash' : 'horizontal');
    const branchDirection = (pose: MirrorPose): string => (pose === 1 ? 'backslash' : pose === 2 ? 'slash' : 'horizontal');
    const set = (id: string, texture: string | null): void => {
      const image = this.visuals.get(id);
      if (image && texture && this.ctx.scene.textures.exists(texture) && image.texture.key !== texture) image.setTexture(texture);
    };
    const sourceTexture = (placed: boolean): string | null => mechanism(!placed ? 'source-empty' : this.state.lanternOn ? 'source-lit' : 'source-off-source');
    set('bench-source', sourceTexture(this.state.source === 'practice'));
    set('source', sourceTexture(this.state.source === 'main'));
    set('bench-mirror', mechanism(`mirror-1-${benchDirection(this.state.practice)}`));
    set('g1', mechanism(`mirror-1-${branchDirection(this.state.g1)}`));
    set('g2', mechanism(`mirror-2-${branchDirection(this.state.g2)}`));
    set('g0', art5(`G0-to-${this.state.g0 === 0 ? 'splitter' : this.state.g0 === 1 ? 'A' : 'B'}`));
    const benchFeed = this.state.source === 'practice' && this.state.lanternOn && this.state.practice === 1 && !this.state.waterReturned;
    const prismFeed = this.state.source === 'main' && this.state.lanternOn && this.state.g0 === 0 && !this.state.waterReturned;
    set('bench-prism', art5(benchFeed ? 'prism-receiving' : 'prism-dark'));
    set('prism', art5(prismFeed ? 'prism-receiving' : 'prism-dark'));
    set('bench-eye-a', mechanism(live.practiceLit ? 'receiver-on' : 'receiver-off'));
    set('bench-eye-b', mechanism(live.practiceLit ? 'receiver-on' : 'receiver-off'));
    set('eye-a', mechanism(live.liveA ? 'receiver-on' : 'receiver-off'));
    set('eye-b', mechanism(live.liveB ? 'receiver-on' : 'receiver-off'));
    const ring = (id: 'a' | 'b' | 'c', on: boolean): void => set(`ring-${id}`, art5(`ring-${id.toUpperCase()}-${on ? 'on' : 'off'}`));
    ring('a', live.liveA && !this.state.waterReturned);
    ring('b', live.liveB && !this.state.waterReturned);
    ring('c', live.lumoAtC && !this.state.waterReturned);
    set('lamp', art5(this.state.waterReturned ? 'tower-lamp-dim' : 'tower-lamp-white'));
    set('fountain', art5(this.state.waterReturned ? 'fountain-down' : 'fountain-up'));
    this.visuals.get('intake')?.setVisible(!this.state.waterReturned);
    this.visuals.get('outflow')?.setVisible(this.state.waterReturned);
    set('call', art4(this.state.lumoAssign === 'follow' ? 'call-idle' : this.state.lumoAssign === 'to-c' ? 'call-sent' : 'call-arrived'));
    set('plate', art4(live.lumoAtC ? 'pressure-occupied' : 'pressure-empty'));
    set('lever', art5(this.state.waterReturned ? 'return-flow-held' : 'return-flow-waiting'));
    set('record', art5(this.state.crystal ? 'record-compartment-open' : 'record-compartment-closed'));
    this.visuals.get('grille')?.setVisible(!this.state.waterReturned);
    this.beams?.clear();
    if (this.beams) {
      for (const beam of live.beams) {
        const isBranchA = beam.from.x === TOWER.objects.prism.left.x && beam.from.y === TOWER.objects.prism.left.y
          || beam.to.x === TOWER.objects.eyeA.optical.x && beam.to.y === TOWER.objects.eyeA.optical.y;
        const isBranchB = beam.from.x === TOWER.objects.prism.right.x && beam.from.y === TOWER.objects.prism.right.y
          || beam.to.x === TOWER.objects.eyeB.optical.x && beam.to.y === TOWER.objects.eyeB.optical.y;
        const color = isBranchA ? 0x7fd9df : isBranchB ? 0xb0c8ef : 0xffdf83;
        this.beams.lineStyle(beam.live ? 7 : 4, color, beam.live ? 0.13 : 0.055);
        this.beams.lineBetween(beam.from.x, beam.from.y, beam.to.x, beam.to.y);
        this.beams.lineStyle(beam.live ? 2 : 1, beam.live ? color : 0x8ca7a8, beam.live ? 0.9 : 0.4);
        this.beams.lineBetween(beam.from.x, beam.from.y, beam.to.x, beam.to.y);
        if (!beam.live && !this.state.waterReturned) { this.beams.fillStyle(0x8ca7a8, 0.45); this.beams.fillCircle(beam.to.x, beam.to.y, 2); }
      }
    }
  }

  private updateHud(live: TowerLiveState): void {
    if (this.stepKey !== hintLadderOf(live.step)) { this.stepKey = hintLadderOf(live.step); this.hintIndex = 0; }
  }

  private showPanel(): void {
    if (this.panel) return;
    const key = getTowerArtKey('voice-record-panel');
    if (!key || !this.ctx.scene.textures.exists(key)) return;
    this.panel = this.ctx.scene.add.image(320, 205, key).setDepth(80);
    this.keep(this.panel);
  }

  private hidePanel(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }

  private addWorldCollider(id: string, x: number, y: number, width: number, height: number): void {
    const object = this.ctx.scene.add.rectangle(x, y, width, height, 0, 0);
    this.ctx.scene.physics.add.existing(object, true);
    const body = object.body as Phaser.Physics.Arcade.StaticBody;
    this.bodies.push(body);
    this.colliders.push(this.ctx.scene.physics.add.collider(this.ctx.player.sprite, object));
    object.setName(id);
    this.keep(object);
  }

  private addImage(id: string, texture: string | null, x: number, y: number, width: number, height: number, depth: number, originY = 1): void {
    if (!texture || !this.ctx.scene.textures.exists(texture)) return;
    const image = this.ctx.scene.add.image(x, y, texture).setOrigin(0.5, originY).setDisplaySize(width, height).setDepth(depth);
    this.visuals.set(id, image);
    this.keep(image);
  }

  private addLabel(id: string, text: string, x: number, y: number): void {
    const label = this.ctx.scene.add.text(x, y, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#f2ddb0', backgroundColor: '#07151c88', padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(15 + y / 10);
    label.setData('towerLabel', id);
    this.keep(label);
  }

  private caption(text: string): void {
    const { scene } = this.ctx;
    const label = this.keep(scene.add.text(320, HUD_LAYOUT.topBottom + 4, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', fontStyle: 'italic', color: '#f2e6c4', stroke: '#07151c', strokeThickness: 3, padding: { x: 8, y: 4 }, align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5, 0).setDepth(84));
    const tween = scene.tweens.add({ targets: label, alpha: 0, delay: 3200, duration: 600, onComplete: () => {
      if (label.active) label.destroy();
      this.ownedTweens = this.ownedTweens.filter((owned) => owned !== tween);
    } });
    this.ownedTweens.push(tween);
  }

  private depthAt(y: number): number { return 10 + y / 10; }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private saveState(): void {
    const { progress, lantern } = this.ctx;
    this.state.lanternOn = lantern.lanternOn;
    progress.lanternOn = this.state.lanternOn;
    progress.flags['l5-layout-v2'] = true;
    progress.counters['tower-g0'] = this.state.g0;
    progress.counters['tower-g1'] = this.state.g1;
    progress.counters['tower-g2'] = this.state.g2;
    progress.counters['l5-practice'] = this.state.practice;
    progress.flags['l5-practice-ok'] = this.state.practiceDone;
    if (this.state.source !== null) progress.flags['l5-lamp-source'] = this.state.source;
    else delete progress.flags['l5-lamp-source'];
    progress.flags['l5-lantern-placed'] = this.state.source !== null;
    progress.flags['l5-lantern-retrieved'] = this.state.lanternRetrieved;
    if (this.state.waterReturned) {
      progress.flags['l5-water-returned'] = true;
      progress.flags['l5-power'] = true;
    }
    progress.flags['l5-crystal'] = this.state.crystal;
    progress.flags['l5-record-read'] = this.state.recordRead;
    progress.flags['l5-reunited'] = this.state.reunited;
    progress.flags['l5-lumo-assign'] = this.state.lumoAssign;
    this.ctx.save();
  }
}
