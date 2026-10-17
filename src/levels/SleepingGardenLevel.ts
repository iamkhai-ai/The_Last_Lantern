import Phaser from 'phaser';
import { getLevelArtKey, getSharedMechanismKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import {
  GARDEN_ACTOR, GARDEN_BAR_BEAM, GARDEN_BRIDGE, GARDEN_ICONS, GARDEN_MODULES, GARDEN_SIDE_PATH, GARDEN_SPANS,
  GARDEN_SPAWN, GARDEN_STANDS, GARDEN_STATIC_SOLIDS, GARDEN_WATER, NO_HELD_SPANS, barRaised, bridgeWalkable,
  crossingSideFor, crossedToFarBank, effectiveLight, gardenActorBody, gardenPropDepth, inGateCorridor,
  isGardenPositionSafe, nearestSafeGardenSpawn, onGardenBridge, readGardenState, rectsOverlap, rootsDeployed,
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
}

const INTRO: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Khu vườn đã ngủ quá lâu. Cây nắng và rễ trăng vẫn còn đây.' },
  { speaker: 'Lumo', text: 'Chúng cần hai điều khác nhau: ánh sáng ấm và một khoảng tối dịu.' },
  { speaker: 'Nhinh', text: 'Bể tích quang vẫn đang hứng sáng. Khu vườn nhờ nó mà thức.' },
  { speaker: 'Lumo', text: 'Hai chậu nhỏ trước mặt là bản thử. Mình xem chúng trước nhé.' },
];
const CANOPY_BEAT: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Tối đi thật.' },
  { speaker: 'Nhinh', text: 'Nghe kìa.' },
];
const PRACTICE_OBSERVED: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Hai chậu thử này giống hệt hai cây lớn ngoài vườn.' },
  { speaker: 'Lumo', text: 'Một chậu mở ra khi có sáng…' },
  { speaker: 'Nhinh', text: '…chậu kia vươn ra khi tối.' },
  { speaker: 'Lumo', text: 'Chúng cần hai điều khác nhau. Mình nhớ rồi.' },
];
const RETRACT_CUE: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Cầu rễ đang rút lại!' },
  { speaker: 'Lumo', text: 'Mở được cửa thì lại mất cầu…' },
  { speaker: 'Nhinh', text: 'Mình tắt đèn để qua, tới bờ bên kia rồi tính.' },
];
const HELD_REJOINED: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Thanh chắn vẫn giữ. Rễ cũng đang vươn ra.' },
  { speaker: 'Nhinh', text: 'Một bên cần sáng, một bên cần tối. Giờ mình đi được cả hai lối.' },
];
const NURSERY_SCENE: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Nước đã chảy tới vườn ươm. Chiếc lá mới vừa mở.' },
  { speaker: 'Lumo', text: 'Tôi cứ nghĩ nếu làm mọi nơi sáng hơn…' },
  { speaker: 'Nhinh', text: 'Cậu muốn giúp khu vườn tỉnh dậy.' },
  { speaker: 'Lumo', text: 'Nhưng có những thứ cần được ngủ.' },
  { speaker: 'Nhinh', text: 'Hoa Nhật mở trong sáng. Rễ Nguyệt vươn trong tối.' },
  { speaker: 'Lumo', text: 'Vậy mà chúng vẫn lớn lên cạnh nhau.' },
  { speaker: 'Lumo', text: 'Cứ ngủ đi. Chúng tôi sẽ giữ đường nước mở.' },
];
const SIDE_LATCHED: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Chốt đá đã gài. Lối đá phụ mở rồi.' },
  { speaker: 'Lumo', text: 'Lối về này không cần ánh sáng. Cây non có nước và có lúc nghỉ.' },
];
const SPROUT_BEFORE: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Mầm cây vẫn khép. Nó cần nước và một khoảng tối để nghỉ.' }];
const SPROUT_AFTER: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Lá mới đã mở hẳn.' },
  { speaker: 'Lumo', text: 'Cứ để nó ngủ thêm. Mình giữ nước cho nó.' },
];
const ENDING: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Cổng điện thờ sáng lên rồi.' },
  { speaker: 'Lumo', text: 'Bóng của tôi… dài hơn trước.' },
  { speaker: 'Nhinh', text: 'Cậu thấy gì phía sau cánh cổng?' },
  { speaker: 'Lumo', text: 'Một nửa khác của chính tôi. Nó vẫn đang ngủ.' },
  { speaker: 'Nhinh', text: 'Vậy mình qua đó đánh thức nó — lần này là để thức đúng lúc.' },
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

  constructor(o: SleepingGardenLevelOptions) {
    this.scene = o.scene; this.progress = o.progress; this.player = o.player; this.lumo = o.lumo;
    this.interactions = o.interactions; this.lantern = o.lantern; this.save = o.save;
    this.say = o.say; this.nextLevel = o.nextLevel; this.canStartStory = o.canStartStory;
    this.lastLanternOn = this.lantern.lanternOn;
  }

  private get lanternOn(): boolean { return this.lantern.lanternOn; }

  public build(): void {
    this.readState();
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
      Number.isFinite(savedLumoY) ? Phaser.Math.Clamp(savedLumoY as number, 60, 330) : spawn.y - 18,
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
    this.updateLightState();
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
    if (!state.lumoRealized) return 'Nói với Lumo bên mầm cây trong vườn ươm.';
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
      : !state.sunLatched ? (this.lanternOn ? 'latch' : 'sun')
        : !state.waterFlowing ? (this.lanternOn ? 'dark' : 'cross')
          : !state.returnLatched ? 'side'
            : 'exit';
    if (stage !== this.hintStage) { this.hintStage = stage; this.hintIndex = 0; }
    const hints: Record<string, string[]> = {
      canopy: [
        'Cả khu vườn đang được bể tích quang nuôi sáng.',
        'Có một tay màn che ở khe tường phía tây bắc, cạnh bể.',
        'Đi vòng lên phía bắc, vào khe tường và nhấn E ở tay màn che.',
      ],
      sun: [
        'Vườn đã tối đi. Hai chậu thử cho thấy cây cần hai điều kiện khác nhau.',
        'Hoa Nhật chỉ mở khi có ánh sáng.',
        'Bật đèn bằng F rồi tới khe tường phía tây.',
      ],
      latch: [
        'Thanh chắn đang được Hoa Nhật nâng lên.',
        'Đi qua khe tường khi thanh chắn còn nâng.',
        'Vào trong khe tường và nhấn E ở tay chốt để giữ thanh chắn.',
      ],
      dark: [
        'Thanh chắn đã được giữ. Giờ chỉ bóng tối mới đánh thức được Rễ Nguyệt.',
        'Rễ Nguyệt vươn ra khi đèn tắt.',
        'Tắt đèn bằng F rồi qua cầu rễ bắc ngang mương ở giữa vườn.',
      ],
      cross: [
        'Cầu rễ chỉ bắc khi đèn tắt.',
        'Vườn ươm nằm bên kia mương, phía đông.',
        'Qua cầu rễ tới vườn ươm và nhấn E ở cống để mở đường nước.',
      ],
      side: [
        'Nước đã chảy tới vườn ươm.',
        'Có một chốt đá ở lối đá phụ cạnh cống, phía đông nam vườn ươm.',
        'Nhấn E ở chốt để mở lối về không cần ánh sáng.',
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
      if (lanternOn && this.state.canopyShut && this.progress.flags['l6-practice-observed'] !== true) {
        this.progress.flags['l6-practice-observed'] = true;
        this.save();
        this.queueBeat(PRACTICE_OBSERVED);
      }
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
    return variant.shared ? getSharedMechanismKey(variant.file) : getLevelArtKey(6, variant.file);
  }

  private placeFor(spec: GardenModuleSpec, rect: { x: number; y: number; width: number; height: number }): { x: number; y: number; origin: [number, number] } {
    if (spec.origin === 'topleft') return { x: rect.x, y: rect.y, origin: [0, 0] };
    if (spec.origin === 'bottom') return { x: rect.x + rect.width / 2, y: rect.y + rect.height, origin: [0.5, 1] };
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, origin: [0.5, 0.5] };
  }

  private addModule(spec: GardenModuleSpec, variantKey: string): Phaser.GameObjects.Image | null {
    const variant = spec.variants[variantKey];
    if (!variant) return null;
    const key = this.artKey(variant);
    if (!key) return null;
    const rect = variantKey === 'extended' && spec.extendedRect ? spec.extendedRect : spec.rect;
    const place = this.placeFor(spec, rect);
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
    const place = this.placeFor(spec, rect);
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
      getPrompt: () => this.canLatchWest() ? 'E · Gài chốt thanh chắn' : null,
      isEnabled: () => this.canLatchWest(),
      onInteract: () => this.latchWest(),
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
      getPrompt: () => this.canLatchEast() ? 'E · Gài chốt lối đá phụ' : null,
      isEnabled: () => this.canLatchEast(),
      onInteract: () => this.latchEast(),
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
      getPrompt: () => this.exitReady() ? 'E · Qua cổng điện thờ' : null,
      isEnabled: () => this.exitReady(),
      onInteract: () => this.nextLevel(ENDING),
    });
  }

  private canPullHandle(): boolean {
    if (this.state.canopyShut) return false;
    return inGateCorridor({ x: this.player.x, y: this.player.y })
      && this.distanceTo(GARDEN_STANDS.handle.x, GARDEN_STANDS.handle.y) <= GARDEN_STANDS.handle.radius;
  }

  private canLatchWest(): boolean {
    return this.state.canopyShut && !this.state.sunLatched && barRaised(this.state, this.lanternOn)
      && inGateCorridor({ x: this.player.x, y: this.player.y });
  }

  private canOpenDrain(): boolean {
    return !this.state.waterFlowing && (this.state.bridgeCrossed || sidePathOpen(this.state));
  }

  private canLatchEast(): boolean {
    return this.state.waterFlowing && !this.state.returnLatched;
  }

  private exitReady(): boolean {
    const state = this.state;
    return state.canopyShut && state.sunLatched && state.waterFlowing && state.returnLatched && state.lumoRealized;
  }

  private distanceTo(x: number, y: number): number {
    return Math.hypot(this.player.x - x, this.player.y - y);
  }

  private pullHandle(): void {
    this.state.canopyShut = true;
    this.progress.flags['l6-canopy-shut'] = true;
    this.held = { ...NO_HELD_SPANS };
    this.save();
    this.pulsePlants();
    this.say(CANOPY_BEAT);
  }

  private latchWest(): void {
    this.state.sunLatched = true;
    this.progress.flags['l6-sun-latched'] = true;
    this.progress.flags['l6-sun-open'] = true;
    this.progress.flags['l6-moon-open'] = true;
    this.save();
    this.say([{ speaker: 'Nhinh', text: 'Chốt đá đã giữ thanh chắn.' }, { speaker: 'Lumo', text: 'Giờ bóng tối cũng không đóng được lối này.' }]);
  }

  private openDrain(): void {
    this.state.waterFlowing = true;
    this.progress.flags['l6-water-flowing'] = true;
    this.progress.flags['l6-moon-open'] = true;
    this.save();
    this.queueBeat(NURSERY_SCENE, () => {
      this.state.lumoRealized = true;
      this.progress.flags['l6-lumo-realized'] = true;
      this.save();
    });
  }

  private latchEast(): void {
    this.state.returnLatched = true;
    this.progress.flags['l6-return-latched'] = true;
    this.progress.flags['l6-bridge-crossed'] = true;
    this.save();
    this.say(SIDE_LATCHED);
  }

  private inspectSprout(): void {
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
    }
  }

  private module(id: string): GardenModuleSpec {
    const spec = GARDEN_MODULES.find((candidate) => candidate.id === id);
    if (!spec) throw new Error(`Missing garden module: ${id}`);
    return spec;
  }
}
