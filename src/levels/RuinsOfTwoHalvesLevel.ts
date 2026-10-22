import Phaser from 'phaser';
import { getLevelArtKey, getShadowArtKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import { SoundSystem } from '../systems/SoundSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import {
  canLatchRuinsSanctuary, deriveRuinsPracticeState, deriveRuinsPuzzleState, getRuinsExitBlock, getRuinsSolid,
  getRuinsStage, isRuinsExitReady, isRuinsMainPuzzleEngaged, resolveRuinsSpawn, RUINS_BEAMS, RUINS_CONDUIT,
  RUINS_DEPTH, RUINS_FOOT_PLACEMENT,
  RUINS_MIRROR_STATES, RUINS_PEDESTAL_LAMP, RUINS_PRACTICE, RUINS_PROPS, RUINS_RECEIVERS, RUINS_RECEIVER_DEPTH,
  RUINS_SHADOW, RUINS_SHADOW_OVERLAY, RUINS_SPLITTER, RUINS_STATUE_NOTCHES, RUINS_WALL_FIXTURES,
  ruinsNextStep, ruinsShadowFootprintAt, ruinsShadowPhase, ruinsShadowPoseFor, ruinsShadowSolidEnabled,
  ruinsShadowSpotFor, ruinsShadowWalkResume, RUINS_SHADOW_WALK_COUNTER, RUINS_SHADOW_WALK_START,
  RUINS_WALLS, ruinsActorBody, ruinsDepthAt, ruinsNormalizeCounters, ruinsStandingOwner, ruinsStandingReach,
  ruinsNormalizeNotch, type RuinsPoint, type RuinsPuzzleState, type RuinsRect, type RuinsStage,
} from '../data/ruinsOfTwoHalvesLayout';

export interface RuinsOfTwoHalvesLevelOptions {
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

/** Textures that live in `src/assets` (or are procedural) instead of the level-08 art directory. */
const BASE_TEXTURES = new Set(['ruins_altar', 'beacon_stone', 'lantern_hang_2']);

/** Which progress counter drives each rotating prop's `{n}` art placeholder. */
const PROP_COUNTER: Record<string, string> = {
  statue: 'statue',
  'mirror-left': 'ruins-left',
  'mirror-right': 'ruins-right',
  'practice-column': 'practice',
};

const OPENING: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Hình bóng đó lại ở kia.' },
  { speaker: 'Nhinh', text: 'Nó không tiến về phía mình. Nó đang nhìn xuống đất.' },
  { speaker: 'The Shadow', text: 'Hạ ánh sáng xuống.' },
  { speaker: 'Lumo', text: 'Chúng tôi đến để cứu Cây Mẹ!' },
  { speaker: 'The Shadow', text: 'Vậy hãy nhìn thứ đang ở dưới chân ngươi.' },
  { speaker: 'Nhinh', text: 'Cây non. Giống trong khu vườn.' },
  { speaker: 'Lumo', text: 'Chúng ta sẽ giữ đèn cách xa.' },
];

const LATCH_BEAT: DialogueLine[] = [
  { speaker: 'Hệ thống', text: 'Vòng trên bệ sáng đều. Điện thờ đã gài.' },
  { speaker: 'Hệ thống', text: 'Màn đá trượt tới che luống cây. The Shadow thôi giơ tay chắn sáng.' },
  { speaker: 'Hệ thống', text: 'Dưới chân ông, lá nhỏ ngẩng lên.' },
];

const SHADOW_TALK: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Ông đã bảo vệ chúng suốt thời gian này?' },
  { speaker: 'The Shadow', text: 'Chúng là những mầm cuối cùng còn biết chờ đêm.' },
  { speaker: 'Lumo', text: 'Tôi tưởng ông muốn giữ rừng trong bóng tối.' },
  { speaker: 'The Shadow', text: 'Ta chỉ còn nhớ cách che cho chúng. Có quá nhiều điều ta đã đánh mất.' },
  { speaker: 'Nhinh', text: 'Chúng tôi tìm được hai tinh thể. Mảnh cuối ở đâu?' },
  { speaker: 'The Shadow', text: 'Trên đài nhìn trăng. Nơi ta đã dừng vòng trời.' },
  { speaker: 'Lumo', text: 'Ông nói… ta?' },
  { speaker: 'The Shadow', text: 'Hãy đọc bản ghi. Đừng chỉ nghe điều ta còn có thể nói.' },
  { speaker: 'Hệ thống', text: 'The Shadow chạm vào một dấu vòng xoắn trên cửa Bắc.' },
  { speaker: 'Lumo', text: 'Dấu này ở đường hầm dẫn nước.' },
  { speaker: 'Nhinh', text: 'Mình mang ký ức tới đài thiên văn. Có lẽ chúng sẽ ghép lại ở đó.' },
];

const ENDING: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Tôi sợ điều mình sắp nhớ ra.' },
  { speaker: 'Nhinh', text: 'Mình sẽ đọc cùng nhau.' },
];

const INSCRIPTION = 'Mặt trời giữ đường đi. Mặt trăng giữ giờ nghỉ. Đừng đặt một bên vào chỗ của cả hai.';

/** Scenario 08 §6, Mức 1-3 verbatim: the two-sun and moon puzzle is one ladder (suns and moon share it). */
const MAIN_LADDER: [string, string, string] = [
  'Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.',
  'Hai khóa Nhật cần sáng cùng lúc. Khóa Nguyệt cần bóng của tượng, trong khi đèn vẫn bật.',
  'Đặt đèn, hướng hai gương vào hai Nhật. Xoay mặt rộng của tượng chắn luồng giữa tới Nguyệt, rồi xác nhận ở bệ.',
];

const HINT_LADDER: Record<RuinsStage, [string, string, string]> = {
  practice: [
    'Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.',
    'Bật đèn bằng F. Mặt rộng của cột chắn ánh sáng, mặt hẹp thì ánh sáng lọt qua.',
    'Đứng ở mép nam cột đá thử và nhấn E để xoay. Xem phiến Nguyệt trên nền đổi trạng thái.',
  ],
  place: [
    'Khóa Nhật cần ánh sáng từ bệ chính.',
    'Bộ chia tia trên bệ chỉ chạy khi đèn nằm ngay trên bệ.',
    'Đứng ở mép nam bệ chính và nhấn E để đặt đèn.',
  ],
  suns: MAIN_LADDER,
  moon: MAIN_LADDER,
  confirm: [
    'Hai Nhật sáng và Nguyệt đã tối cùng lúc.',
    'Vòng trên bệ chính đang sáng đều.',
    'Đứng ở mép nam bệ chính và nhấn E để gài điện thờ.',
  ],
  retrieve: [
    'Điện thờ đã gài. Đèn vẫn nằm trên bệ.',
    'Nhinh cần đèn trong tay để đi tiếp.',
    'Đứng ở mép nam bệ chính và nhấn E để nhận lại đèn.',
  ],
  shadow: [
    'Màn đá đã trượt che luống mầm. The Shadow đã thôi giơ tay chắn sáng.',
    'Ông đang đứng cạnh luống mầm, ở phía tây bắc sân.',
    'Tới gần The Shadow và nhấn E để nói chuyện.',
  ],
  exit: [
    'The Shadow đi trước trên cầu thang Bắc.',
    'Ông dừng lại mỗi khi Nhinh và Lumo chưa theo kịp.',
    'Tới cửa Bắc và nhấn E.',
  ],
};

export class RuinsOfTwoHalvesLevel {
  private scene: Phaser.Scene;
  private progress: CampaignProgress;
  private player: Player;
  private lumo: Lumo;
  private interactions: InteractionSystem;
  private lantern: LanternSystem;
  private save: () => void;
  private say: RuinsOfTwoHalvesLevelOptions['say'];
  private nextLevel: RuinsOfTwoHalvesLevelOptions['nextLevel'];
  private canStartStory: RuinsOfTwoHalvesLevelOptions['canStartStory'];

  private objects: Phaser.GameObjects.GameObject[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private bodies: Phaser.Physics.Arcade.StaticBody[] = [];
  private artById = new Map<string, Phaser.GameObjects.Image>();
  private protectedArt: Phaser.GameObjects.GameObject[] = [];
  private beamGraphics?: Phaser.GameObjects.Graphics;
  private conduitGraphics?: Phaser.GameObjects.Graphics;
  private practiceGraphics?: Phaser.GameObjects.Graphics;
  private bedCue?: Phaser.GameObjects.Graphics;
  private lockLabels = new Map<string, Phaser.GameObjects.Text>();
  private pendingBeats: Array<{ lines: DialogueLine[]; onComplete?: () => void }> = [];
  private hintIndex = 0;
  private hintStage = '';
  private destroyed = false;
  private lastLanternOn = false;
  private shadowImage?: Phaser.GameObjects.Image;
  private shadowSolid?: Phaser.GameObjects.Rectangle;
  private shadowTalk?: InteractableConfig;
  private shadowWalk: { index: number } | null = null;
  /** Ground anchor and footprint the solid body was last placed at; it is re-placed only when the ground moves. */
  private shadowSolidAt?: { ground: RuinsPoint; footprint: RuinsRect };
  /** The player's largest step this frame in px (max speed x dt), used by the Shadow's solid. */
  private playerStepPx = 0;

  constructor(options: RuinsOfTwoHalvesLevelOptions) {
    this.scene = options.scene;
    this.progress = options.progress;
    this.player = options.player;
    this.lumo = options.lumo;
    this.interactions = options.interactions;
    this.lantern = options.lantern;
    this.save = options.save;
    this.say = options.say;
    this.nextLevel = options.nextLevel;
    this.canStartStory = options.canStartStory;
  }

  /* ---------------------------------------------------------------------- */
  /* lifecycle                                                              */
  /* ---------------------------------------------------------------------- */

  public build(): void {
    this.normalizeProgress();
    this.player.setFootPlacement(
      RUINS_FOOT_PLACEMENT.depthOffsetY, RUINS_FOOT_PLACEMENT.bodyOffsetY,
      RUINS_FOOT_PLACEMENT.bodyOffsetX, RUINS_FOOT_PLACEMENT.bodyWidth, RUINS_FOOT_PLACEMENT.bodyHeight,
    );
    const saved = this.progress.counters['player-level'] === 7
      && Number.isFinite(this.progress.counters['player-x']) && Number.isFinite(this.progress.counters['player-y'])
      ? { x: this.progress.counters['player-x'], y: this.progress.counters['player-y'] }
      : undefined;
    // The Shadow's footprint is solid on the restored floor too: a saved centre inside it moves to the nearest safe spot.
    const spawn = resolveRuinsSpawn(saved, {
      exitReady: isRuinsExitReady(this.getExitInput()),
      extraBlockers: [ruinsShadowFootprintAt(this.shadowStart().ground)],
    });
    this.player.setPosition(spawn.x, spawn.y);
    this.restoreLanternPlacement();
    this.placeFollower(spawn);

    this.lastLanternOn = this.lantern.lanternOn;

    this.drawWorld();
    this.refresh();
    this.save();
  }

  public startOpeningDialogue(): void {
    this.showBedCue(true);
    this.say(OPENING, () => this.showBedCue(false));
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearVisuals();
    this.interactions.clear();
  }

  public update(dt: number): void {
    if (this.destroyed) return;
    this.updateStoryBeats();
    this.playerStepPx = (this.player.maxSpeed * dt) / 1000;
    this.advanceShadowWalk(dt);
    this.refreshArt();
    this.flushPendingBeats();
  }

  /* ---------------------------------------------------------------------- */
  /* progress                                                               */
  /* ---------------------------------------------------------------------- */

  private normalizeProgress(): void {
    // Counter defaults, and — once the latch is committed — the configuration that solved the temple
    // ("Giữ cấu hình tượng, gương, màn che và cửa Bắc", scenario §7). A resumed session therefore
    // re-derives its live state from the solved configuration, so the three receivers still read the
    // way the player left them instead of showing a dark temple behind an already-latched ring.
    ruinsNormalizeCounters(this.progress.flags, this.progress.counters);
    // A walk record only resumes after the talk and while it names a waypoint the walk still crosses. Anything else is dropped.
    if (this.progress.flags['l7-met-shadow'] !== true || ruinsShadowWalkResume(this.progress.counters[RUINS_SHADOW_WALK_COUNTER]) === null) {
      delete this.progress.counters[RUINS_SHADOW_WALK_COUNTER];
    }
    // A committed latch always keeps `l7-solved` and the slid curtain, whichever of the two flags a save carries.
    if (this.progress.flags['l7-route-latched'] === true) this.progress.flags['l7-solved'] = true;
    if (this.progress.flags['l7-solved'] === true) this.progress.flags['l7-route-latched'] = true;
    if (this.progress.flags['l7-solved'] === true) this.progress.flags['l7-curtain-shut'] = true;
  }

  private getExitInput(): { latched: boolean; lanternRetrieved: boolean; metShadow: boolean } {
    return {
      latched: this.progress.flags['l7-route-latched'] === true,
      lanternRetrieved: this.progress.flags['l7-lantern-retrieved'] === true || !this.lantern.lanternPlaced,
      metShadow: this.progress.flags['l7-met-shadow'] === true,
    };
  }

  public getPuzzleState(): RuinsPuzzleState {
    return deriveRuinsPuzzleState({
      lanternPlaced: this.lantern.lanternPlaced,
      lanternOn: this.lantern.lanternOn,
      statue: this.progress.counters['statue'] ?? 0,
      leftMirror: this.progress.counters['ruins-left'] ?? 0,
      rightMirror: this.progress.counters['ruins-right'] ?? 0,
    });
  }

  private getPracticeState() {
    return deriveRuinsPracticeState({
      practiceNotch: this.progress.counters['practice'] ?? 0,
      lanternOn: this.lantern.lanternOn,
    });
  }

  private getStage(): RuinsStage {
    return getRuinsStage({
      practiceSeen: this.progress.flags['l7-practice-seen'] === true,
      lanternPlaced: this.lantern.lanternPlaced,
      puzzle: this.getPuzzleState(),
      latched: this.progress.flags['l7-route-latched'] === true,
      lanternRetrieved: this.progress.flags['l7-lantern-retrieved'] === true || !this.lantern.lanternPlaced,
      metShadow: this.progress.flags['l7-met-shadow'] === true,
      mainPuzzleEngaged: isRuinsMainPuzzleEngaged({
        lanternPlaced: this.lantern.lanternPlaced,
        statue: this.progress.counters['statue'] ?? 0,
        leftMirror: this.progress.counters['ruins-left'] ?? 0,
        rightMirror: this.progress.counters['ruins-right'] ?? 0,
      }),
    });
  }

  private restoreLanternPlacement(): void {
    this.lantern.lanternPlaced = false;
    this.lantern.placedX = 0;
    this.lantern.placedY = 0;
    if (this.progress.flags['l7-lantern-placed'] !== true) return;
    if (this.progress.flags['l7-lantern-retrieved'] === true) return;
    // A lamp sitting on the altar is lit by construction: `placeLanternAt` turns it on and
    // `LanternSystem.toggleLantern` refuses to switch it off while it is placed. Restoring a stale
    // `lanternOn: false` would leave the lamp on the altar, switched off and impossible to relight
    // ("Tắt đèn … hai Nhật mất sáng; không giải được"), so the invariant is enforced here.
    this.lantern.placeLanternAt(RUINS_PEDESTAL_LAMP.x, RUINS_PEDESTAL_LAMP.y);
  }

  /** Lumo follows the player through the scene's generic follower; this only fixes the entry position. */
  private placeFollower(spawn: RuinsPoint): void {
    const x = Phaser.Math.Clamp(spawn.x - 24, 34, 606);
    const y = Phaser.Math.Clamp(spawn.y - 20, 86, 300);
    this.lumo.sprite.setPosition(x, y);
    this.lumo.setVisible(true);
    this.progress.counters['lumo-x'] = Math.round(x);
    this.progress.counters['lumo-y'] = Math.round(y);
  }

  /* ---------------------------------------------------------------------- */
  /* drawing                                                                */
  /* ---------------------------------------------------------------------- */

  private artKey(name: string): string | undefined {
    if (name.startsWith('mirror_') || BASE_TEXTURES.has(name)) {
      return this.scene.textures.exists(name) ? name : undefined;
    }
    return getLevelArtKey(7, name) ?? undefined;
  }

  private addImage(id: string, name: string, x: number, y: number, depth: number): Phaser.GameObjects.Image | undefined {
    const key = this.artKey(name);
    if (!key) return undefined;
    const image = this.scene.add.image(x, y, key).setDepth(depth);
    image.setData('ruins-id', id);
    this.artById.set(id, image);
    this.track(image);
    return image;
  }

  private drawWorld(): void {
    this.clearVisuals();
    this.interactions.clear();

    this.addImage('backdrop', 'temple-scene-base', 320, 180, RUINS_DEPTH.backdrop)?.setAlpha(0.72);

    const floor = this.scene.add.tileSprite(0, 0, 640, 360, 'ground_stone')
      .setOrigin(0).setTint(0x9a8f79).setAlpha(0.72).setDepth(RUINS_DEPTH.floor);
    this.track(floor);

    const masonry = this.scene.add.graphics().setDepth(RUINS_DEPTH.masonry);
    masonry.fillStyle(0x261f1c, 0.94);
    for (const wall of RUINS_WALLS) masonry.fillRect(wall.x, wall.y, wall.width, wall.height);
    masonry.lineStyle(2, 0x746352, 0.55);
    for (const wall of RUINS_WALLS) masonry.strokeRect(wall.x, wall.y, wall.width, wall.height);
    masonry.lineStyle(1, 0x8a7a63, 0.24);
    for (let y = 92; y < 304; y += 22) masonry.lineBetween(26, y, 126, y);
    for (let y = 92; y < 304; y += 22) masonry.lineBetween(534, y, 614, y);
    for (let y = 60; y < 80; y += 10) masonry.lineBetween(0, y, 640, y);
    this.track(masonry);

    this.conduitGraphics = this.scene.add.graphics().setDepth(RUINS_DEPTH.conduit);
    this.track(this.conduitGraphics);

    this.addImage('lock-left', 'lock-sun-off', RUINS_RECEIVERS.left.x + 16, RUINS_RECEIVERS.left.y + 20, RUINS_RECEIVER_DEPTH);
    this.addImage('lock-moon', 'lock-moon-lit', RUINS_RECEIVERS.moon.x + 16, RUINS_RECEIVERS.moon.y + 20, RUINS_RECEIVER_DEPTH);
    this.addImage('lock-right', 'lock-sun-off', RUINS_RECEIVERS.right.x + 16, RUINS_RECEIVERS.right.y + 20, RUINS_RECEIVER_DEPTH);
    this.addImage('splitter', 'fixed-three-route-splitter-off', RUINS_SPLITTER.center.x, RUINS_SPLITTER.center.y, RUINS_SPLITTER.depth);
    this.addImage('practice-slab', 'test-moon-lit', RUINS_PRACTICE.slab.center.x, RUINS_PRACTICE.slab.center.y, RUINS_PRACTICE.slab.depth);

    this.practiceGraphics = this.scene.add.graphics().setDepth(RUINS_PRACTICE.depths.shadow);
    this.track(this.practiceGraphics);
    this.beamGraphics = this.scene.add.graphics().setDepth(RUINS_BEAMS.depth);
    this.track(this.beamGraphics);

    const statueNotch = ruinsNormalizeNotch(this.progress.counters['statue'] ?? 0);
    this.addImage('shadow', `shadow-notch-${statueNotch}`,
      RUINS_SHADOW_OVERLAY.center.x, RUINS_SHADOW_OVERLAY.center.y, RUINS_SHADOW_OVERLAY.depth);

    this.drawProps();
    this.drawShadow();
    this.drawWallFixtures();
    this.drawLockLabels();
    this.addColliders();

    this.bedCue = this.scene.add.graphics().setDepth(RUINS_DEPTH.prompt - 1).setVisible(false);
    this.track(this.bedCue);

    this.registerInteractions();
  }

  private propArt(propId: string): string {
    const prop = RUINS_PROPS[propId];
    if (prop.id === 'seedling-bed') {
      return prop.art.replace('{curtain}', this.progress.flags['l7-curtain-shut'] === true ? 'closed' : 'open');
    }
    if (prop.art.includes('{n}')) {
      const counter = PROP_COUNTER[prop.id];
      return prop.art.replace('{n}', String(ruinsNormalizeNotch(this.progress.counters[counter] ?? 0)));
    }
    return prop.art;
  }

  private drawProps(): void {
    for (const prop of Object.values(RUINS_PROPS)) {
      const depth = ruinsDepthAt(prop.groundAnchor.y);
      const primary = this.addImage(prop.id, this.propArt(prop.id), prop.artCenter.x, prop.artCenter.y, depth);
      if (primary) this.protectedArt.push(primary);
      if (prop.overlay) {
        const overlayId = 'practice-column-spin';
        const overlay = this.addImage(overlayId,
          prop.overlay.art.replace('{n}', String(ruinsNormalizeNotch(this.progress.counters['practice'] ?? 0))),
          prop.overlay.artCenter.x, prop.overlay.artCenter.y, depth + prop.overlay.depthOffset);
        if (overlay) this.protectedArt.push(overlay);
      }
    }

    const pedestalDepth = ruinsDepthAt(RUINS_PROPS.pedestal.groundAnchor.y);
    const ring = this.addImage('confirmation', `confirmation-${this.confirmationArt()}`,
      RUINS_PROPS.pedestal.artCenter.x, RUINS_PROPS.pedestal.artCenter.y, pedestalDepth + 0.1);
    if (ring) this.protectedArt.push(ring);

    const lamp = this.addImage('placed-lamp', 'lantern_hang_2', RUINS_PEDESTAL_LAMP.x, RUINS_PEDESTAL_LAMP.y - 12, pedestalDepth + 0.2);
    lamp?.setVisible(false);
    if (lamp) this.protectedArt.push(lamp);
  }

  private drawWallFixtures(): void {
    for (const fixture of RUINS_WALL_FIXTURES) {
      const art = fixture.id === 'north-door'
        ? fixture.art.replace('{open}', this.progress.flags['l7-route-latched'] === true ? 'open' : 'closed')
        : fixture.art;
      const depth = fixture.id === 'north-door' ? RUINS_DEPTH.groundStamp : ruinsDepthAt(80);
      const image = this.addImage(fixture.id, art, fixture.artCenter.x, fixture.artCenter.y, depth);
      if (image) this.protectedArt.push(image);
    }
  }

  /**
   * Compact captions directly above each receiver. Kept on one short line each (7px, y=80) so the
   * three labels never overlap and never collide with the statue art below them.
   */
  private drawLockLabels(): void {
    const entries: Array<[string, number, string]> = [
      ['left', RUINS_RECEIVERS.left.x + 16, 'NHẬT TRÁI · TẮT'],
      ['moon', RUINS_RECEIVERS.moon.x + 16, 'NGUYỆT · SÁNG'],
      ['right', RUINS_RECEIVERS.right.x + 16, 'NHẬT PHẢI · TẮT'],
    ];
    for (const [id, x, base] of entries) {
      const label = this.scene.add.text(x, 80, base, {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '7px', fontStyle: 'bold', color: '#f2e6c4',
        backgroundColor: '#0b1a20dd', padding: { x: 3, y: 1 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(8);
      this.track(label);
      this.lockLabels.set(id, label);
    }
  }

  private drawConduit(): void {
    if (!this.conduitGraphics) return;
    const live = this.getPuzzleState().lightActive;
    const graphics = this.conduitGraphics;
    graphics.clear();
    graphics.lineStyle(7, 0x3a3128, 0.9);
    graphics.beginPath();
    graphics.moveTo(RUINS_CONDUIT[0].x, RUINS_CONDUIT[0].y);
    for (const point of RUINS_CONDUIT.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.strokePath();
    graphics.lineStyle(2, live ? 0xffd98a : 0x6b6152, live ? 0.9 : 0.5);
    graphics.beginPath();
    graphics.moveTo(RUINS_CONDUIT[0].x, RUINS_CONDUIT[0].y);
    for (const point of RUINS_CONDUIT.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.strokePath();
  }

  private drawBeams(): void {
    const state = this.getPuzzleState();

    if (this.practiceGraphics) {
      const practice = this.getPracticeState();
      const graphics = this.practiceGraphics;
      const [toColumn, toSlab] = RUINS_PRACTICE.beam;
      graphics.clear();
      if (practice.portLit) {
        graphics.lineStyle(3, 0xffe0a8, 0.85);
        graphics.beginPath();
        graphics.moveTo(toColumn.from.x, toColumn.from.y);
        graphics.lineTo(toColumn.to.x, toColumn.to.y);
        graphics.strokePath();
        if (!practice.blocked) {
          graphics.beginPath();
          graphics.moveTo(toSlab.from.x, toSlab.from.y);
          graphics.lineTo(toSlab.to.x, toSlab.to.y);
          graphics.strokePath();
        }
      }
      if (practice.slabShadowed) {
        const patch = RUINS_PRACTICE.shadowPatch;
        graphics.fillStyle(0x0d1a22, 0.85);
        graphics.fillEllipse(patch.center.x, patch.center.y, patch.width + 8, patch.height + 8);
      }
    }

    if (!this.beamGraphics) return;
    const graphics = this.beamGraphics;
    graphics.clear();
    if (!state.lightActive) return;

    const segment = (from: RuinsPoint, to: RuinsPoint, colour: number, alpha: number): void => {
      graphics.lineStyle(3, colour, alpha);
      graphics.beginPath();
      graphics.moveTo(from.x, from.y);
      graphics.lineTo(to.x, to.y);
      graphics.strokePath();
    };

    if (state.moonCovered) {
      // the centre flow dies where the statue's shadow begins
      segment(RUINS_BEAMS.centreVisible[0].from, RUINS_BEAMS.centreVisible[0].to, 0x8b7a52, 0.55);
    } else {
      for (const part of RUINS_BEAMS.centreVisible) segment(part.from, part.to, 0xffdf83, 0.9);
    }

    segment(RUINS_BEAMS.leftInbound.from, RUINS_BEAMS.leftInbound.to, 0xffdf83, state.leftAimed ? 0.85 : 0.4);
    segment(RUINS_BEAMS.rightInbound.from, RUINS_BEAMS.rightInbound.to, 0xffdf83, state.rightAimed ? 0.85 : 0.4);
    if (state.leftAimed) {
      segment(RUINS_BEAMS.leftOutbound.from, RUINS_BEAMS.leftOutbound.to,
        state.leftLit ? 0xffdf83 : 0x4f6a72, state.leftLit ? 0.9 : 0.55);
    }
    if (state.rightAimed) {
      segment(RUINS_BEAMS.rightOutbound.from, RUINS_BEAMS.rightOutbound.to,
        state.rightLit ? 0xffdf83 : 0x4f6a72, state.rightLit ? 0.9 : 0.55);
    }
  }

  private confirmationArt(): 'waiting' | 'ready' | 'latched' {
    if (this.progress.flags['l7-route-latched'] === true) return 'latched';
    return this.getPuzzleState().confirmReady ? 'ready' : 'waiting';
  }

  private showBedCue(visible: boolean): void {
    if (!this.bedCue) return;
    this.bedCue.clear();
    this.bedCue.setVisible(visible);
    if (!visible) return;
    this.bedCue.lineStyle(2, 0xd8b869, 0.9);
    this.bedCue.strokeRoundedRect(132, 100, 96, 56, 5);
    this.bedCue.lineStyle(1, 0x8ce0c8, 0.6);
    this.bedCue.lineBetween(180, 156, 180, 172);
  }

  /* ---------------------------------------------------------------------- */
  /* physics                                                                */
  /* ---------------------------------------------------------------------- */

  private addColliders(): void {
    for (const wall of RUINS_WALLS) this.addBlocker(wall.x, wall.y, wall.width, wall.height);
    for (const prop of Object.values(RUINS_PROPS)) {
      const solid = getRuinsSolid(prop.id);
      if (solid) this.addBlocker(solid.x, solid.y, solid.width, solid.height);
    }
    // The Shadow's footprint follows his live ground position, on the spot and during the walk (see placeShadowSolid).
    const footprint = ruinsShadowFootprintAt(this.shadowGround());
    this.addBlocker(footprint.x, footprint.y, footprint.width, footprint.height);
    this.shadowSolid = this.objects[this.objects.length - 1] as Phaser.GameObjects.Rectangle;
    this.placeShadowSolid();
  }

  private addBlocker(x: number, y: number, width: number, height: number): void {
    const rectangle = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0, 0).setVisible(false);
    this.scene.physics.add.existing(rectangle, true);
    const body = rectangle.body as Phaser.Physics.Arcade.StaticBody;
    this.track(rectangle);
    this.bodies.push(body);
    this.colliders.push(this.scene.physics.add.collider(this.player.sprite, rectangle));
  }

  /* ---------------------------------------------------------------------- */
  /* interactions                                                           */
  /* ---------------------------------------------------------------------- */

  private registerInteractions(): void {
    const register = (config: InteractableConfig): void => this.interactions.register(config);
    const prop = (id: string) => RUINS_PROPS[id];

    register({
      id: 'l7-practice-column',
      x: prop('practice-column').stand.x, y: prop('practice-column').stand.y, radius: prop('practice-column').stand.radius,
      reach: ruinsStandingReach(prop('practice-column').footprint), ownsPosition: (x, y) => ruinsStandingOwner('practice-column', { x, y }, this.ruinsReachFootprints()),
      getPrompt: () => 'E · Xoay cột đá thử',
      getPromptBounds: () => this.artById.get('practice-column-spin')?.getBounds() ?? null,
      isEnabled: () => true,
      onInteract: () => this.rotatePracticeColumn(),
    });

    register({
      id: 'l7-statue',
      x: prop('statue').stand.x, y: prop('statue').stand.y, radius: prop('statue').stand.radius,
      reach: ruinsStandingReach(prop('statue').footprint), ownsPosition: (x, y) => ruinsStandingOwner('statue', { x, y }, this.ruinsReachFootprints()),
      getPrompt: () => 'E · Xoay tượng',
      getPromptBounds: () => this.artById.get('statue')?.getBounds() ?? null,
      isEnabled: () => true,
      onInteract: () => this.rotateStatue(),
    });

    for (const side of ['left', 'right'] as const) {
      register({
        id: `l7-mirror-${side}`,
        x: prop(`mirror-${side}`).stand.x, y: prop(`mirror-${side}`).stand.y, radius: prop(`mirror-${side}`).stand.radius,
        reach: ruinsStandingReach(prop(`mirror-${side}`).footprint), ownsPosition: (x, y) => ruinsStandingOwner(`mirror-${side}`, { x, y }, this.ruinsReachFootprints()),
        getPrompt: () => `E · Xoay gương ${side === 'left' ? 'trái' : 'phải'}`,
        getPromptBounds: () => this.artById.get(`mirror-${side}`)?.getBounds() ?? null,
        isEnabled: () => true,
        onInteract: () => this.rotateMirror(side),
      });
    }

    register({
      id: 'l7-pedestal',
      x: prop('pedestal').stand.x, y: prop('pedestal').stand.y, radius: prop('pedestal').stand.radius,
      reach: ruinsStandingReach(prop('pedestal').footprint), ownsPosition: (x, y) => ruinsStandingOwner('pedestal', { x, y }, this.ruinsReachFootprints()),
      getPrompt: () => this.pedestalPrompt(),
      getPromptBounds: () => this.artById.get('confirmation')?.getBounds() ?? this.artById.get('pedestal')?.getBounds() ?? null,
      isEnabled: () => true,
      onInteract: () => this.usePedestal(),
    });

    register({
      id: 'l7-seedling-bed',
      x: prop('seedling-bed').stand.x, y: prop('seedling-bed').stand.y, radius: prop('seedling-bed').stand.radius,
      reach: ruinsStandingReach(prop('seedling-bed').footprint), ownsPosition: (x, y) => ruinsStandingOwner('seedling-bed', { x, y }, this.ruinsReachFootprints()),
      getPrompt: () => 'E · Xem luống mầm',
      getPromptBounds: () => this.artById.get('seedling-bed')?.getBounds() ?? null,
      isEnabled: () => true,
      onInteract: () => this.inspectBed(),
    });

    // x/y/radius are live: syncShadow moves the stand with him, InteractionSystem reads them every frame.
    const talkSpot = ruinsShadowSpotFor(this.shadowPhase());
    this.shadowTalk = {
      id: 'l7-shadow-npc',
      x: talkSpot.stand.x, y: talkSpot.stand.y, radius: talkSpot.stand.radius,
      reach: ruinsStandingReach(talkSpot.footprint), ownsPosition: (x, y) => ruinsStandingOwner('shadow-npc', { x, y }, this.ruinsReachFootprints()),
      getPrompt: () => (this.shadowWalk ? null : 'E · Nói chuyện với The Shadow'),
      getPromptBounds: () => this.artById.get('shadow-npc')?.getBounds() ?? null,
      isEnabled: () => !this.shadowWalk,
      onInteract: () => this.talkToShadow(),
    };
    register(this.shadowTalk);

    const fixture = (id: string, prompt: () => string, handler: () => void): void => {
      const entry = RUINS_WALL_FIXTURES.find((item) => item.id === id);
      if (!entry) return;
      register({
        id: `l7-${id}`,
        x: entry.stand.x, y: entry.stand.y, radius: entry.stand.radius,
        getPrompt: prompt,
        getPromptBounds: () => this.artById.get(id)?.getBounds() ?? null,
        isEnabled: () => true,
        onInteract: handler,
      });
    };
    fixture('inscription', () => 'E · Đọc bia điện thờ', () => this.readInscription());
    fixture('north-door', () => this.exitPrompt(), () => this.useExit());
  }

  private pedestalPrompt(): string {
    const latched = this.progress.flags['l7-route-latched'] === true;
    if (latched) return this.lantern.lanternPlaced ? 'E · Nhận lại đèn' : 'E · Bệ chính (đèn đã thu hồi)';
    if (!this.lantern.lanternPlaced) {
      return this.lantern.lanternInHand ? 'E · Đặt đèn lên bệ' : 'E · Bệ chính (cần đèn trong tay)';
    }
    return this.getPuzzleState().confirmReady ? 'E · Gài điện thờ' : 'E · Kiểm tra bàn xác nhận';
  }

  private exitPrompt(): string {
    const block = getRuinsExitBlock(this.getExitInput());
    if (!block) return 'E · Qua cửa Bắc';
    if (block === 'latch') return 'E · Cửa Bắc (cần gài điện thờ)';
    if (block === 'lamp') return 'E · Cửa Bắc (cần thu hồi đèn)';
    return 'E · Cửa Bắc (cần gặp The Shadow)';
  }

  /* ---------------------------------------------------------------------- */
  /* control actions                                                        */
  /* ---------------------------------------------------------------------- */

  private rotatePracticeColumn(): void {
    this.progress.counters['practice'] = (ruinsNormalizeNotch(this.progress.counters['practice'] ?? 0) + 1) % RUINS_STATUE_NOTCHES;
    this.save();
    SoundSystem.playMirrorRotate();
    const practice = this.getPracticeState();
    if (!practice.portLit) {
      this.say([{ speaker: 'Nhinh', text: 'Cột đã xoay, nhưng chưa có ánh sáng nào đi qua đây. Bật đèn bằng F.' }]);
      return;
    }
    if (practice.slabShadowed) {
      this.say([{ speaker: 'Nhinh', text: 'Bóng đã phủ phiến Nguyệt. Ánh sáng không tới được nữa.' }]);
      return;
    }
    this.say([{ speaker: 'Lumo', text: 'Mặt hẹp của cột để ánh sáng lọt qua. Phiến Nguyệt lại sáng.' }]);
  }

  private rotateStatue(): void {
    if (this.progress.flags['l7-route-latched'] === true) {
      this.say([{ speaker: 'Nhinh', text: 'Vòng trên bệ đã giữ. Mình không cần xoay tượng nữa.' }]);
      return;
    }
    this.progress.counters['statue'] = (ruinsNormalizeNotch(this.progress.counters['statue'] ?? 0) + 1) % RUINS_STATUE_NOTCHES;
    this.save();
    SoundSystem.playMirrorRotate();
    const state = this.getPuzzleState();
    this.refresh();
    if (state.moonCovered) {
      this.say([{ speaker: 'Nhinh', text: 'Bóng của tượng phủ trọn khóa Nguyệt.' }]);
      return;
    }
    this.say([{ speaker: 'Lumo', text: 'Bóng nghiêng đi. Khóa Nguyệt vẫn nằm ngoài vùng tối.' }]);
  }

  private rotateMirror(side: 'left' | 'right'): void {
    if (this.progress.flags['l7-route-latched'] === true) {
      // Scenario §7 keeps the configuration that solved the temple. Turning a mirror now would
      // drop a Sun receiver that the latched ring already accounts for.
      this.say([{ speaker: 'Nhinh', text: 'Vòng trên bệ đã giữ. Hai gương đang đúng hướng, mình để nguyên vậy.' }]);
      return;
    }
    const key = side === 'left' ? 'ruins-left' : 'ruins-right';
    this.progress.counters[key] = (ruinsNormalizeNotch(this.progress.counters[key] ?? 0) + 1) % RUINS_MIRROR_STATES;
    this.save();
    SoundSystem.playMirrorRotate();
    const state = this.getPuzzleState();
    this.refresh();
    const aimed = side === 'left' ? state.leftAimed : state.rightAimed;
    const lit = side === 'left' ? state.leftLit : state.rightLit;
    const label = side === 'left' ? 'Gương trái' : 'Gương phải';
    if (!this.lantern.lanternPlaced) {
      this.say([{ speaker: 'Nhinh', text: `${label} đã xoay, nhưng bệ chính chưa có đèn.` }]);
      return;
    }
    if (!aimed) {
      this.say([{ speaker: 'Nhinh', text: `${label} chưa hướng tia lên khóa Nhật.` }]);
      return;
    }
    if (!lit) {
      this.say([{ speaker: 'Nhinh', text: `${label} đã hướng đúng, nhưng bóng của tượng chắn mất tia.` }]);
      return;
    }
    this.say([{ speaker: 'Nhinh', text: `${label} đã bật tia tới khóa Nhật.` }]);
  }

  private usePedestal(): void {
    if (this.progress.flags['l7-route-latched'] === true) {
      if (this.lantern.lanternPlaced) {
        this.lantern.retrieveLantern();
        this.progress.lanternOn = true;
        this.progress.flags['l7-lantern-placed'] = false;
        this.progress.flags['l7-lantern-retrieved'] = true;
        this.save();
        this.refresh();
        this.say([{ speaker: 'Nhinh', text: 'Đèn đã về tay. Tới The Shadow thôi.' }]);
        return;
      }
      // The temple is already latched, so the lamp stays in hand: re-placing it would undo the
      // scenario's retrieval step and re-lock the north door the player has already opened.
      this.say([{ speaker: 'Nhinh', text: 'Điện thờ đã gài. Đèn ở trong tay rồi, mình tới The Shadow.' }]);
      return;
    }
    if (!this.lantern.lanternPlaced) {
      if (!this.lantern.lanternInHand) {
        this.say([{ speaker: 'Nhinh', text: 'Đèn không nằm trong tay. Mình cần tìm lại nó.' }]);
        return;
      }
      this.lantern.placeLanternAt(RUINS_PEDESTAL_LAMP.x, RUINS_PEDESTAL_LAMP.y);
      this.progress.lanternOn = true;
      this.progress.flags['l7-lantern-placed'] = true;
      this.progress.flags['l7-lantern-retrieved'] = false;
      this.save();
      this.refresh();
      this.say([{ speaker: 'Lumo', text: 'Bộ chia tia đã hiện đường nhánh. Hai nhánh bên đi qua hai gương.' }]);
      return;
    }
    const state = this.getPuzzleState();
    if (!canLatchRuinsSanctuary(state, false)) {
      const missing: string[] = [];
      if (!state.lightActive) missing.push('đặt đèn đang bật lên bệ');
      if (state.sunsLit < 2) missing.push('cho hai khóa Nhật sáng cùng lúc');
      if (!state.moonCovered) missing.push('cho bóng tượng phủ khóa Nguyệt');
      SoundSystem.playPuzzleError();
      this.say([{ speaker: 'Nhinh', text: `Bàn xác nhận chưa sáng đều. Mình còn phải ${missing.join(', ')}.` }]);
      return;
    }
    this.progress.flags['l7-route-latched'] = true;
    this.progress.flags['l7-solved'] = true;
    this.progress.flags['l7-curtain-shut'] = true;
    this.save();
    SoundSystem.playPuzzleSolved();
    this.refresh();
    this.queueBeat(LATCH_BEAT);
  }

  private inspectBed(): void {
    if (this.progress.flags['l7-curtain-shut'] === true) {
      this.say([{ speaker: 'Nhinh', text: 'Màn đá đã che kín luống mầm. Bên trong chỉ còn một khoảng tối dịu.' }]);
      return;
    }
    this.say([{ speaker: 'Nhinh', text: 'Cây non. Giống trong khu vườn.' }, { speaker: 'Lumo', text: 'Chúng ta sẽ giữ đèn cách xa.' }]);
  }

  private talkToShadow(): void {
    if (this.progress.flags['l7-met-shadow'] === true) {
      this.say([{ speaker: 'The Shadow', text: 'Đừng chỉ nghe điều ta còn có thể nói. Hãy đọc bản ghi trên đài nhìn trăng.' }]);
      return;
    }
    if (this.progress.flags['l7-route-latched'] !== true) {
      this.say([{ speaker: 'The Shadow', text: 'Hạ ánh sáng xuống. Điện thờ còn khóa, và luống mầm vẫn chờ một khoảng tối.' }]);
      return;
    }
    if (this.lantern.lanternPlaced) {
      this.say([{ speaker: 'Nhinh', text: 'Mình phải thu hồi đèn ở bệ chính trước đã.' }]);
      return;
    }
    this.say(SHADOW_TALK, () => {
      this.progress.flags['l7-met-shadow'] = true;
      this.progress.flags['l7-shadow-talked'] = true;
      this.progress.flags['l7-shadow-spiral'] = true;
      // The walk is recorded in the same save as the talk, so a reload at any point resumes it instead of snapping him to the wait spot.
      this.progress.counters[RUINS_SHADOW_WALK_COUNTER] = RUINS_SHADOW_WALK_START;
      this.save();
      // Start the walk before refreshing: a refresh with no walk running would move him straight to the wait spot.
      this.startShadowWalk();
      this.refresh();
    });
  }

  private readInscription(): void {
    this.progress.flags['l7-inscription-read'] = true;
    this.save();
    this.hintIndex = 0;
    this.say([{ speaker: 'Hệ thống', text: `Bia đá: ${INSCRIPTION}` }]);
  }

  private useExit(): void {
    const block = getRuinsExitBlock(this.getExitInput());
    if (block === 'latch') {
      const next = ruinsNextStep(this.getPuzzleState());
      const text = next === 'place' ? 'Cửa Bắc còn khóa. Bệ chính đang trống: đứng ở mép nam bệ và nhấn E để đặt đèn lên.'
        : next === 'suns' ? 'Cửa Bắc còn khóa. Hai khóa Nhật chưa cùng sáng: xoay các gương (E ở mép nam từng gương).'
          : next === 'moon' ? 'Cửa Bắc còn khóa. Khóa Nguyệt chưa nằm trong bóng: xoay tượng giữa sân (E ở mép nam tượng).'
            : 'Mọi khóa đã đúng. Nhấn E ở mép nam bệ chính để gài điện thờ.';
      this.say([{ speaker: 'Nhinh', text }]);
      return;
    }
    if (block === 'lamp') {
      this.say([{ speaker: 'Nhinh', text: 'Đèn vẫn nằm trên bệ chính. Đứng ở mép nam bệ và nhấn E để thu hồi trước khi lên cầu thang.' }]);
      return;
    }
    if (block === 'shadow') {
      this.say([{ speaker: 'Lumo', text: 'The Shadow đang đứng cạnh luống mầm, phía tây bắc sân. Mình nhấn E để nói chuyện với ông trước.' }]);
      return;
    }
    this.progress.counters['lumo-x'] = Math.round(this.lumo.sprite.x);
    this.progress.counters['lumo-y'] = Math.round(this.lumo.sprite.y);
    this.save();
    this.nextLevel(ENDING);
  }

  /* ---------------------------------------------------------------------- */
  /* live story beats                                                       */
  /* ---------------------------------------------------------------------- */

  private updateStoryBeats(): void {
    const practice = this.getPracticeState();
    const state = this.getPuzzleState();

    // Each beat is guarded by its own one-off flag rather than by a transition, so a reload that
    // already satisfies a live condition still gets the explanation exactly once.
    if (practice.slabShadowed && this.progress.flags['l7-practice-seen'] !== true) {
      this.progress.flags['l7-practice-seen'] = true;
      this.save();
      this.queueBeat([
        { speaker: 'Nhinh', text: 'Không cần tắt cả chiếc đèn. Chỉ cần che đúng chỗ.' },
        { speaker: 'Lumo', text: 'Phía ngoài vẫn sáng, còn sau cột thì tối.' },
      ]);
    }

    if (state.sunsLit === 2 && !state.moonCovered && this.progress.flags['l7-two-suns'] !== true) {
      this.progress.flags['l7-two-suns'] = true;
      this.save();
      this.queueBeat([
        { speaker: 'Lumo', text: 'Hai bên đã đáp lại. Khóa giữa vẫn im.' },
        { speaker: 'Nhinh', text: 'Ánh từ bệ vẫn rọi vào nó. Bức tượng có thể chắn luồng giữa.' },
      ]);
    }

    if (state.moonCovered && this.progress.flags['l7-shadow-covers'] !== true) {
      this.progress.flags['l7-shadow-covers'] = true;
      this.save();
      this.queueBeat([
        { speaker: 'The Shadow', text: 'Giữ khoảng tối ấy.' },
        { speaker: 'Nhinh', text: 'Tôi thấy rồi. Hai nửa có thể cùng tồn tại.' },
      ]);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* The Shadow                                                             */
  /* ---------------------------------------------------------------------- */

  private shadowPhase() {
    return ruinsShadowPhase({
      latched: this.progress.flags['l7-route-latched'] === true,
      metShadow: this.progress.flags['l7-met-shadow'] === true,
    });
  }

  private shadowKey(pose: ReturnType<typeof ruinsShadowPoseFor>): string | undefined {
    return getShadowArtKey(pose) ?? undefined;
  }

  /**
   * Where he is when the level is built: his story spot, or, when a walk was saved mid-way, the waypoint it had
   * reached, with the walk resuming from the next one.
   */
  private shadowStart(): { ground: RuinsPoint; walk: { index: number } | null } {
    const resume = ruinsShadowWalkResume(this.progress.counters[RUINS_SHADOW_WALK_COUNTER]);
    if (resume) return { ground: resume.start, walk: { index: resume.next } };
    return { ground: ruinsShadowSpotFor(this.shadowPhase()).ground, walk: null };
  }

  private drawShadow(): void {
    const start = this.shadowStart();
    const phase = this.shadowPhase();
    const key = this.shadowKey(ruinsShadowPoseFor(phase));
    if (!key) return;
    const image = this.scene.add.image(start.ground.x, start.ground.y, key).setOrigin(0.5, 1).setDepth(ruinsDepthAt(start.ground.y));
    image.setData('ruins-id', 'shadow-npc');
    this.artById.set('shadow-npc', image);
    this.shadowImage = image;
    this.shadowWalk = start.walk;
    this.track(image);
    this.protectedArt.push(image);
  }

  /** Ground anchor of the Shadow as he stands now, or his story spot before any sprite exists. */
  private shadowGround(): RuinsPoint {
    const image = this.shadowImage;
    if (image && image.active) return { x: image.x, y: image.y };
    return ruinsShadowSpotFor(this.shadowPhase()).ground;
  }

  /**
   * Moves the solid to his live footprint and sets whether it is on this frame. `moving` is true on a frame in which he
   * advanced; then the solid yields to a player who is within one step of it (see ruinsShadowSolidEnabled), so a
   * walking Shadow never pushes or traps the player. The body is re-placed only when his ground moves; the enable
   * state is evaluated on every call. Uses the static-body path that `addBlocker` creates: `updateFromGameObject`
   * re-reads the rect in Phaser 3.90 (node_modules/phaser/src/physics/arcade/StaticBody.js), and `World.separate`
   * skips bodies with `enable === false`.
   */
  private placeShadowSolid(moving = false): void {
    const solid = this.shadowSolid;
    if (!solid || !solid.active) return;
    const body = solid.body as Phaser.Physics.Arcade.StaticBody | null;
    if (!body) return;
    const ground = this.shadowGround();
    let placed = this.shadowSolidAt;
    if (!placed || placed.ground.x !== ground.x || placed.ground.y !== ground.y) {
      const footprint = ruinsShadowFootprintAt(ground);
      solid.setPosition(footprint.x + footprint.width / 2, footprint.y + footprint.height / 2);
      body.updateFromGameObject();
      placed = { ground, footprint };
      this.shadowSolidAt = placed;
    }
    body.enable = ruinsShadowSolidEnabled({
      footprint: placed.footprint,
      playerBody: ruinsActorBody({ x: this.player.x, y: this.player.y }),
      moving,
      stepPx: this.playerStepPx,
    });
  }

  /** Puts the sprite, solid and stand where the story says he is, unless he is mid-walk. */
  private syncShadow(): void {
    const image = this.shadowImage;
    if (!image || !image.active || this.shadowWalk) return;
    const phase = this.shadowPhase();
    const spot = ruinsShadowSpotFor(phase);
    const key = this.shadowKey(ruinsShadowPoseFor(phase));
    if (key && image.texture.key !== key) image.setTexture(key);
    image.setFlipX(false);
    if (image.x !== spot.ground.x || image.y !== spot.ground.y) {
      image.setPosition(spot.ground.x, spot.ground.y).setDepth(ruinsDepthAt(spot.ground.y));
    }
    this.placeShadowSolid();
    if (this.shadowTalk) {
      this.shadowTalk.x = spot.stand.x; this.shadowTalk.y = spot.stand.y; this.shadowTalk.radius = spot.stand.radius;
      this.shadowTalk.reach = ruinsStandingReach(spot.footprint);
    }
  }

  /** Footprints that can own a standing position: every prop, and the Shadow only while he is parked and talkable. */
  private ruinsReachFootprints(): Record<string, RuinsRect> {
    const footprints: Record<string, RuinsRect> = {};
    for (const prop of Object.values(RUINS_PROPS)) footprints[prop.id] = prop.footprint;
    if (!this.shadowWalk) footprints['shadow-npc'] = ruinsShadowSpotFor(this.shadowPhase()).footprint;
    return footprints;
  }

  /** After the conversation he walks to the north stair; he pauses whenever the player falls behind (scenario §7). */
  private startShadowWalk(): void {
    if (!this.shadowImage || !this.shadowImage.active) return;
    this.shadowWalk = { index: 0 };
    this.placeShadowSolid();
  }

  /**
   * Records the walk after each waypoint. The counter holds the last waypoint reached (`-1` before the first). Reaching
   * the final one ends the walk: the counter is removed and he is on the waiting spot, exactly as a finished walk is.
   */
  private persistShadowWalk(): void {
    const walk = this.shadowWalk;
    if (!walk) return;
    if (walk.index < RUINS_SHADOW.path.length) {
      this.progress.counters[RUINS_SHADOW_WALK_COUNTER] = walk.index - 1;
    } else {
      delete this.progress.counters[RUINS_SHADOW_WALK_COUNTER];
      this.shadowWalk = null;
      this.syncShadow();
    }
    this.save();
  }

  private advanceShadowWalk(dt: number): void {
    const walk = this.shadowWalk;
    const image = this.shadowImage;
    if (!walk || !image || !image.active) return;
    const path = RUINS_SHADOW.path;
    if (walk.index >= path.length) { this.persistShadowWalk(); return; }
    const near = Math.hypot(this.player.x - image.x, this.player.y - (image.y - 20)) <= RUINS_SHADOW.followRange;
    const walking = this.shadowKey('walk-right');
    const waiting = this.shadowKey('stillness');
    if (!near) {
      const key = waiting ?? walking;
      if (key && image.texture.key !== key) image.setTexture(key);
      this.placeShadowSolid();
      return;
    }
    const target = path[walk.index];
    const dx = target.x - image.x;
    const dy = target.y - image.y;
    const distance = Math.hypot(dx, dy);
    const step = (RUINS_SHADOW.speed * Math.min(dt, 50)) / 1000;
    if (walking && image.texture.key !== walking) image.setTexture(walking);
    if (Math.abs(dx) > 0.5) image.setFlipX(dx < 0);
    if (distance <= step) {
      image.setPosition(target.x, target.y);
      walk.index += 1;
      this.persistShadowWalk();
    } else {
      image.setPosition(image.x + (dx / distance) * step, image.y + (dy / distance) * step);
    }
    image.setDepth(ruinsDepthAt(image.y));
    this.placeShadowSolid(true);
  }

  private queueBeat(lines: DialogueLine[], onComplete?: () => void): void {
    this.pendingBeats.push({ lines, onComplete });
    this.flushPendingBeats();
  }

  private flushPendingBeats(): void {
    if (!this.pendingBeats.length || !this.canStartStory()) return;
    const next = this.pendingBeats.shift();
    if (next) this.say(next.lines, next.onComplete);
  }

  /* ---------------------------------------------------------------------- */
  /* refresh                                                                */
  /* ---------------------------------------------------------------------- */

  private refresh(): void {
    this.refreshArt();
    this.drawConduit();
    this.drawBeams();
  }

  private refreshArt(): void {
    const state = this.getPuzzleState();
    const practice = this.getPracticeState();
    const latched = this.progress.flags['l7-route-latched'] === true;

    this.setArt('statue', this.propArt('statue'));
    this.setArt('mirror-left', this.propArt('mirror-left'));
    this.setArt('mirror-right', this.propArt('mirror-right'));
    this.setArt('practice-column-spin', `test-column-notch-${ruinsNormalizeNotch(this.progress.counters['practice'] ?? 0)}`);
    this.setArt('lock-left', state.leftLit ? 'lock-sun-on' : 'lock-sun-off');
    this.setArt('lock-right', state.rightLit ? 'lock-sun-on' : 'lock-sun-off');
    this.setArt('lock-moon', state.moonDark ? 'lock-moon-covered' : 'lock-moon-lit');
    this.setArt('splitter', state.lightActive ? 'fixed-three-route-splitter-on' : 'fixed-three-route-splitter-off');
    this.setArt('practice-slab', practice.slabShadowed ? 'test-moon-covered' : 'test-moon-lit');
    this.setArt('confirmation', `confirmation-${this.confirmationArt()}`);
    this.setArt('seedling-bed', this.propArt('seedling-bed'));
    this.setArt('north-door', `sanctuary-door-${latched ? 'open' : 'closed'}`);
    this.setArt('shadow', `shadow-notch-${state.statue}`);
    this.artById.get('placed-lamp')?.setVisible(this.lantern.lanternPlaced);
    this.syncShadow();

    this.lockLabels.get('left')?.setText(`NHẬT TRÁI · ${state.leftLit ? 'SÁNG' : 'TẮT'}`);
    this.lockLabels.get('right')?.setText(`NHẬT PHẢI · ${state.rightLit ? 'SÁNG' : 'TẮT'}`);
    this.lockLabels.get('moon')?.setText(`NGUYỆT · ${state.moonDark ? 'TỐI' : 'SÁNG'}`);

    if (this.lastLanternOn !== this.lantern.lanternOn) {
      this.lastLanternOn = this.lantern.lanternOn;
      this.drawConduit();
    }
  }

  private setArt(id: string, name: string): void {
    const image = this.artById.get(id);
    if (!image) return;
    const key = this.artKey(name);
    if (!key || image.texture.key === key) return;
    image.setTexture(key);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private clearVisuals(): void {
    this.colliders.forEach((collider) => { if (collider.active) collider.destroy(); });
    this.bodies.forEach((body) => { if (body.gameObject?.active) body.gameObject.destroy(); });
    this.objects.forEach((object) => { if (object.active) object.destroy(); });
    this.objects = [];
    this.colliders = [];
    this.bodies = [];
    this.artById.clear();
    this.protectedArt = [];
    this.lockLabels.clear();
    this.shadowImage = undefined;
    this.shadowSolid = undefined;
    this.shadowSolidAt = undefined;
    this.shadowTalk = undefined;
    this.shadowWalk = null;
  }

  /* ---------------------------------------------------------------------- */
  /* HUD text                                                               */
  /* ---------------------------------------------------------------------- */

  public getObjectiveText(): string {
    const stage = this.getStage();
    const state = this.getPuzzleState();
    switch (stage) {
      case 'practice': return 'Thử ở tiền sảnh: bật đèn, xoay cột đá cho bóng phủ phiến Nguyệt.';
      case 'place': return 'Đặt đèn lên bệ chính ở phía đông nam sân.';
      case 'suns':
        return !state.lightActive ? 'Đặt đèn đang bật lên bệ chính.'
          : state.sunsLit === 0 ? 'Xoay hai gương bên để tia sáng chiếu vào hai khóa Nhật.'
            : 'Một khóa Nhật đã sáng. Xoay gương còn lại cho tia bật lên khóa kia.';
      case 'moon': return 'Xoay tượng giữa sân cho bóng phủ khóa Nguyệt.';
      case 'confirm': return 'Điều kiện đã đủ. Nhấn E ở bệ chính để gài điện thờ.';
      case 'retrieve': return 'Thu hồi đèn ở bệ chính.';
      case 'shadow': return 'Tới The Shadow ở phía đông bắc và nhấn E.';
      default: return 'Tới cửa Bắc và nhấn E để đi tiếp.';
    }
  }

  public getStatusText(): string {
    const state = this.getPuzzleState();
    const latched = this.progress.flags['l7-route-latched'] === true;
    const ring = latched ? 'đã gài' : state.confirmReady ? 'sáng đều' : 'đang chờ';
    // The door leaf is drawn open as soon as the ring latches, but leaving also needs the lamp back
    // in hand and the Shadow conversation, so the row names whichever step is still outstanding.
    const block = getRuinsExitBlock(this.getExitInput());
    const north = block === undefined ? 'mở'
      : block === 'lamp' ? 'mở · cần đèn'
        : block === 'shadow' ? 'mở · chờ The Shadow'
          : 'khóa';
    return `Nhật ${state.sunsLit}/2 · Nguyệt ${state.moonDark ? 'tối' : 'sáng'} · Bệ ${ring} · Cửa Bắc ${north}`;
  }

  public showHint(): void {
    const stage = this.getStage();
    // suns and moon are one Mức 1-3 ladder, so the move from the suns to the moon step does not restart it.
    const ladderStage = stage === 'moon' ? 'suns' : stage;
    if (ladderStage !== this.hintStage) {
      this.hintStage = ladderStage;
      this.hintIndex = 0;
    }
    const ladder = HINT_LADDER[stage];
    const state = this.getPuzzleState();
    const missing: string[] = [];
    if (stage === 'suns') {
      if (!state.lightActive) missing.push('đèn chưa nằm trên bệ');
      else if (!state.leftAimed) missing.push('gương trái chưa hướng tia lên khóa Nhật trái');
      else if (!state.rightAimed) missing.push('gương phải chưa hướng tia lên khóa Nhật phải');
    }
    if (stage === 'moon' && !state.moonCovered) missing.push('bóng tượng chưa phủ khóa Nguyệt');
    const index = Math.min(this.hintIndex, ladder.length - 1);
    this.hintIndex = Math.min(this.hintIndex + 1, ladder.length - 1);
    const suffix = index > 0 && missing.length ? ` Còn thiếu: ${missing.join(', ')}.` : '';
    this.say([{ speaker: 'Hệ thống', text: ladder[index] + suffix }]);
  }

  public showJournal(): void {
    const lines: DialogueLine[] = [];
    if (this.progress.flags['l7-practice-seen'] === true) {
      lines.push({ speaker: 'Nhinh', text: 'Một vật chắn sáng tạo ra một vùng tối. Mặt rộng của cột chắn, mặt hẹp thì không.' });
    }
    if (this.progress.flags['l7-inscription-read'] === true) lines.push({ speaker: 'Nhinh', text: `Bia đá: ${INSCRIPTION}` });
    if (this.progress.flags['l7-two-suns'] === true) lines.push({ speaker: 'Lumo', text: 'Hai khóa Nhật sáng cùng lúc vẫn chưa đủ. Khóa Nguyệt cần ở trong bóng.' });
    if (this.progress.flags['l7-shadow-covers'] === true) lines.push({ speaker: 'Nhinh', text: 'Bóng đổ có thể bảo vệ một vùng. Ba khóa phải đúng cùng một lúc.' });
    if (this.progress.flags['l7-shadow-spiral'] === true) lines.push({ speaker: 'Lumo', text: 'Dấu vòng xoắn trên cửa Bắc giống dấu ở đường hầm dẫn nước.' });
    if (this.progress.flags['l7-met-shadow'] === true) lines.push({ speaker: 'The Shadow', text: 'Trên đài nhìn trăng. Nơi ta đã dừng vòng trời.' });
    this.say([
      { speaker: 'Nhinh', text: 'Sổ tay giữ những điều hai đứa đã học.' },
      ...(lines.length ? lines : [{ speaker: 'Nhinh' as const, text: 'Chưa ghi thêm manh mối nào.' }]),
    ]);
  }

  public getProtectedPromptBounds(): PromptRect[] {
    return this.protectedArt
      .filter((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.active && object.visible)
      .map((image) => image.getBounds());
  }
}
