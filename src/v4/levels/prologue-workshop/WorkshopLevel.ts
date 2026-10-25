import type Phaser from 'phaser';
import type { LanternLightingProfile } from '../../../systems/LanternSystem';
import type { Interactable } from '../../../types/gameTypes';
import type { HintLadder } from '../../core/hints';
import type { LightMark } from '../../core/light';
import type { HudText, LevelLayout } from '../../core/level';
import { rectCenter, rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { LevelHost, V4LevelRuntime } from '../../scene/LevelHost';
import { choiceBoxHeight } from '../../../ui/ChoiceBox';
import benchUrl from '../../../../assets/levels/00-workshop/sprites/bench.png?url';
import boatmanFrontUrl from '../../../../assets/levels/00-workshop/sprites/boatman-front.png?url';
import boatmanWalk0Url from '../../../../assets/levels/00-workshop/sprites/boatman-walk-0.png?url';
import boatmanWalk1Url from '../../../../assets/levels/00-workshop/sprites/boatman-walk-1.png?url';
import boatmanWalk2Url from '../../../../assets/levels/00-workshop/sprites/boatman-walk-2.png?url';
import customerLampLitUrl from '../../../../assets/levels/00-workshop/sprites/customer-lamp-lit.png?url';
import customerLampOpenUrl from '../../../../assets/levels/00-workshop/sprites/customer-lamp-open.png?url';
import dockLightsOffUrl from '../../../../assets/levels/00-workshop/sprites/dock-lights-off.png?url';
import dockLightsOnUrl from '../../../../assets/levels/00-workshop/sprites/dock-lights-on.png?url';
import motherMapUrl from '../../../../assets/levels/00-workshop/sprites/mother-map.png?url';
import motherWorkUrl from '../../../../assets/levels/00-workshop/sprites/mother-work.png?url';
import panelFaultUrl from '../../../../assets/levels/00-workshop/sprites/panel-fault.png?url';
import panelLooseUrl from '../../../../assets/levels/00-workshop/sprites/panel-loose.png?url';
import panelOffUrl from '../../../../assets/levels/00-workshop/sprites/panel-off.png?url';
import partsTrayUrl from '../../../../assets/levels/00-workshop/sprites/parts-tray.png?url';
import workshopBgUrl from '../../../../assets/levels/00-workshop/sprites/workshop-bg.png?url';
import {
  BENCH_ID,
  BOATMAN_ID,
  MOTHER_ID,
  PANEL_ID,
  TRAY_ID,
  WORKSHOP,
} from './workshopLayout';
import { OPENING_PAGES } from './openingNarrative';
import {
  PART_LABELS,
  WORKSHOP_DIALOGUE,
  WORKSHOP_JOURNAL,
  benchPrompt,
  boatmanPrompt,
  completeAssignment,
  defaultWorkshopState,
  exitOpen,
  incidentPending,
  markGreeted,
  markIncidentCalled,
  openingPending,
  motherPrompt,
  panelPrompt,
  parseWorkshopState,
  takePart,
  trayPrompt,
  useBench,
  useBoatman,
  useMother,
  usePanel,
  useTray,
  workshopFocus,
  workshopHint,
  workshopHud,
  workshopSolids,
} from './workshopLogic';
import type {
  WorkshopDialogueId,
  WorkshopEffect,
  WorkshopJournalId,
  WorkshopPart,
  WorkshopResult,
  WorkshopState,
} from './workshopLogic';

/** Sprite files are exported at 2x (asset-map.json); the game draws them at half size. */
const SPRITE_SCALE = 0.5;
/** Texture keys of the sprites, by file name without the extension. */
const SPRITE_URLS: Readonly<Record<string, string>> = {
  'bench': benchUrl,
  'boatman-front': boatmanFrontUrl,
  'boatman-walk-0': boatmanWalk0Url,
  'boatman-walk-1': boatmanWalk1Url,
  'boatman-walk-2': boatmanWalk2Url,
  'customer-lamp-lit': customerLampLitUrl,
  'customer-lamp-open': customerLampOpenUrl,
  'dock-lights-off': dockLightsOffUrl,
  'dock-lights-on': dockLightsOnUrl,
  'mother-map': motherMapUrl,
  'mother-work': motherWorkUrl,
  'panel-fault': panelFaultUrl,
  'panel-loose': panelLooseUrl,
  'panel-off': panelOffUrl,
  'parts-tray': partsTrayUrl,
  'background': workshopBgUrl,
};

/** Boatman's walk to the south door after he is paid, px per second (00-workshop.md). */
const BOATMAN_SPEED = 90;
/** Where the boatman walks to and disappears: the foot point south of the door. */
const BOATMAN_EXIT: Point = { x: 320, y: 330 };
/** The boatman's walk cycles through three frames, one per beat. */
const BOATMAN_WALK_FRAMES = 3;
const BOATMAN_WALK_FRAME_MS = 180;
/** The dock lamps seen through the window flicker for this long once the boatman leaves, then go out (00-prologue.md). */
const HARBOR_BLINK_MS = 1200;
const HARBOR_BLINK_STEP_MS = 200;
/** The repaired panel's amber lamp blinks: fault and off alternate on this beat. */
const PANEL_BLINK_MS = 700;
/** The part choice opens just above the parts tray, so the choice sits by what it picks from. */
const PART_CHOICE_AT = {
  x: WORKSHOP.tray.x - 12,
  y: WORKSHOP.tray.y - 6 - choiceBoxHeight(2),
};
/** Where the bench lamp stands: the bench's top, centred. */
const BENCH_LAMP_AT: Point = { x: 301, y: 180 };
/** Illustrations of the new game and of the exit (texture keys, see src/v4/scene/illustrationFiles.ts). */
const INTRO_ILLUSTRATIONS: readonly string[] = OPENING_PAGES.map((page) => page.key);
const EXIT_ILLUSTRATIONS: readonly string[] = [
  'ill_02-leaving-ben-suong',
  'ill_03-maintenance-station',
  'ill_04-waiting-for-morning',
  'ill_05-morning-without-dawn',
];
/**
 * Narration under each illustration (Vietnamese catalog keys, src/i18n/entries/workshop.ts). The eleven intro pages
 * come from openingNarrative.ts, one to three sentences each, and stay inside what their picture shows. The four exit
 * pages are the journey after the workshop: two sentences at most, and only what their pictures show — the road out,
 * the station, the night by the stele, the dim morning. Not in the V4 docs: written from 00-prologue.md at the user's
 * request (2026-10-25).
 */
const ILLUSTRATION_CAPTIONS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(OPENING_PAGES.map((page) => [page.key, page.caption])),
  'ill_02-leaving-ben-suong': 'Được mẹ giao việc, Nhinh mang bản đồ và đèn bảo trì theo đường ven sông. Sau lưng cô, mẹ còn giữ đèn cho thuyền và trạm bơm.',
  'ill_03-maintenance-station': 'Trạm bìa rừng hiện ra lúc nhá nhem. Dấu bảo trì giống ở xưởng, nhưng những dòng hướng dẫn trên bia đã cũ.',
  'ill_04-waiting-for-morning': 'Nhinh muốn kiểm tra tiếp, rồi nhớ lời mẹ dặn đừng đi khi trời tối. Cô đặt đèn cạnh bia, tựa vào gốc cây và chờ sáng.',
  'ill_05-morning-without-dawn': 'Giờ này Bến Sương đã sáng. Đồng hồ của Nhinh cũng sang ngày mới, nhưng sương trong rừng không tan — buổi sáng ở Elaria vẫn như chiều tối.',
};
/** The level the south door leads to. */
const NEXT_LEVEL_ID = 'forest-edge';

/** The texture key of a workshop sprite. */
function spriteKey(name: string): string {
  return `workshop-${name}`;
}

/** Centre x of a rect, the anchor of a prop standing on it. */
function centreX(rect: Rect): number {
  return rectCenter(rect).x;
}

/** Swaps a sprite only when its texture differs, so per-frame calls stay cheap. */
function showTexture(image: Phaser.GameObjects.Image | null, key: string): void {
  if (image && image.texture.key !== key) image.setTexture(key);
}

/** Turns a zone's static body on or off. A disabled body takes no part in collisions (Arcade skips it). */
function setZoneEnabled(zone: Phaser.GameObjects.Zone, enabled: boolean): void {
  (zone as unknown as { body: { enable: boolean } }).body.enable = enabled;
}

/**
 * The repair workshop (level 00). Pure rules live in workshopLogic.ts; this runtime draws them, wires the
 * interactables to the rule functions and plays their effects through the host.
 */
export class WorkshopLevel implements V4LevelRuntime<WorkshopState> {
  readonly id = 'prologue-workshop';
  readonly title = 'Xưởng bên sông';
  readonly layout: LevelLayout = WORKSHOP;

  private host!: LevelHost;
  private scene!: Phaser.Scene;
  private state: WorkshopState = defaultWorkshopState();
  private items: Interactable[] = [];
  /** Everything this level created, destroyed on shutdown. */
  private objects: Phaser.GameObjects.GameObject[] = [];
  private boatmanZone: Phaser.GameObjects.Zone | null = null;
  private doorZone: Phaser.GameObjects.Zone | null = null;
  private background: Phaser.GameObjects.Image | null = null;
  private benchLamp: Phaser.GameObjects.Image | null = null;
  private carriedLamp: Phaser.GameObjects.Image | null = null;
  private panel: Phaser.GameObjects.Image | null = null;
  private mother: Phaser.GameObjects.Image | null = null;
  private boatman: Phaser.GameObjects.Image | null = null;
  private dockOn: Phaser.GameObjects.Image | null = null;
  private dockOff: Phaser.GameObjects.Image | null = null;
  /** The boatman's sprite position (foot point), moved by the walk. */
  private boatmanAt: Point = { x: WORKSHOP.boatman.x + WORKSHOP.boatman.width / 2, y: WORKSHOP.boatman.y + WORKSHOP.boatman.height };
  private boatmanWalking = false;
  /** Milliseconds of the boatman's walk, for its frame cycle. */
  private walkClock = 0;
  /** Milliseconds since the repaired panel started blinking. */
  private panelClock = 0;
  /** Mother shows her map while the diagnosis dialogue plays. */
  private showingMap = false;
  /**
   * The payment lines are on screen, so the boatman's sprite stays up although the save already has him gone. Not
   * saved: presentation only, cleared when the payment ends and his walk starts.
   */
  private paying = false;
  /** Milliseconds since the harbour lamp blinked, or null when no blink is running. */
  private harborBlink: number | null = null;
  /** Mother's call, held until the boatman is gone and the harbour lamp has blinked (00-prologue.md). */
  private pendingIncident: (() => void) | null = null;
  /** The boatman's opening line is still to play (set in build, played on the first update). */
  private openingDue = false;

  preload(scene: Phaser.Scene): void {
    for (const [name, url] of Object.entries(SPRITE_URLS)) {
      const key = spriteKey(name);
      if (!scene.textures.exists(key)) scene.load.image(key, url);
    }
  }

  intro(): readonly string[] {
    return INTRO_ILLUSTRATIONS;
  }

  illustrationCaption(key: string): string | null {
    return ILLUSTRATION_CAPTIONS[key] ?? null;
  }

  defaultState(): WorkshopState {
    return defaultWorkshopState();
  }

  parseState(raw: unknown): WorkshopState {
    return parseWorkshopState(raw);
  }

  build(host: LevelHost, state: WorkshopState): void {
    this.host = host;
    this.scene = host.scene;
    this.state = state;
    const scene = this.scene;

    this.background = this.image('background', 0, 0, 0).setOrigin(0, 0);
    this.dockOn = this.image('dock-lights-on', 0, 0, 1).setOrigin(0, 0);
    this.dockOff = this.image('dock-lights-off', 0, 0, 1).setOrigin(0, 0);

    this.benchLamp = this.prop('customer-lamp-open', BENCH_LAMP_AT.x, BENCH_LAMP_AT.y, 31);
    this.prop('bench', centreX(WORKSHOP.bench), WORKSHOP.bench.y + WORKSHOP.bench.height, 0);
    this.prop('parts-tray', centreX(WORKSHOP.tray), WORKSHOP.tray.y + WORKSHOP.tray.height, 0);
    this.panel = this.prop('panel-loose', centreX(WORKSHOP.panel), WORKSHOP.panel.y + WORKSHOP.panel.height, 0);
    this.mother = this.prop('mother-work', centreX(WORKSHOP.mother), WORKSHOP.mother.y + WORKSHOP.mother.height, 0);
    this.boatman = this.prop('boatman-front', this.boatmanAt.x, this.boatmanAt.y, 0);
    this.boatman.setVisible(!state.boatmanReturned);
    this.carriedLamp = scene.add.image(0, 0, spriteKey('customer-lamp-lit')).setOrigin(0.5, 1).setScale(SPRITE_SCALE).setVisible(false);
    this.objects.push(this.carriedLamp);

    // Solids: the walls and the fixed pieces are always solid; the boatman and the south door follow the state.
    for (const wall of WORKSHOP.walls) this.solidZone(wall);
    this.solidZone(WORKSHOP.bench);
    this.solidZone(WORKSHOP.tray);
    this.solidZone(WORKSHOP.panel);
    this.solidZone(WORKSHOP.mother);
    this.boatmanZone = this.solidZone(WORKSHOP.boatman);
    this.doorZone = this.solidZone(WORKSHOP.southDoor);

    this.items = [
      {
        id: BENCH_ID,
        reach: { kind: 'block', rect: WORKSHOP.bench },
        getPrompt: () => benchPrompt(this.state),
        onInteract: () => this.apply(useBench(this.state)),
      },
      {
        id: TRAY_ID,
        reach: { kind: 'block', rect: WORKSHOP.tray },
        getPrompt: () => trayPrompt(this.state),
        onInteract: () => this.apply(useTray(this.state)),
      },
      {
        id: PANEL_ID,
        reach: { kind: 'block', rect: WORKSHOP.panel },
        getPrompt: () => panelPrompt(this.state),
        onInteract: () => this.apply(usePanel(this.state)),
      },
      {
        id: MOTHER_ID,
        reach: { kind: 'block', rect: WORKSHOP.mother },
        getPrompt: () => motherPrompt(this.state),
        onInteract: () => this.apply(useMother(this.state)),
      },
      {
        id: BOATMAN_ID,
        reach: { kind: 'block', rect: WORKSHOP.boatman },
        getPrompt: () => boatmanPrompt(this.state),
        onInteract: () => this.apply(useBoatman(this.state)),
      },
    ];

    this.refresh();
    // The boatman left before the game was closed: the harbour lamp blinks, then Mẹ calls as usual.
    if (incidentPending(state)) {
      this.pendingIncident = () => this.callMother(() => undefined);
      this.harborBlink = 0;
    }
    // First time in the room: the boatman points Nhinh at his lamp, on the first frame once the scene runs.
    this.openingDue = openingPending(state);
  }

  interactables(): Interactable[] {
    return this.items;
  }

  focus(): readonly string[] {
    return workshopFocus(this.state);
  }

  update(dt: number, foot: Rect): void {
    if (this.openingDue) {
      this.openingDue = false;
      this.state = markGreeted(this.state);
      this.host.requestSave();
      this.host.say(WORKSHOP_DIALOGUE.opening, () => undefined);
    }
    this.carryLamp(foot);
    if (this.boatmanWalking) this.stepBoatman(dt);
    if (this.harborBlink !== null) {
      this.harborBlink += dt;
      if (this.harborBlink >= HARBOR_BLINK_MS) {
        this.harborBlink = null;
        this.firePendingIncident();
      }
    }
    this.animatePanel(dt);
    this.showHarbor();
  }

  getState(): WorkshopState {
    return this.state;
  }

  hud(): HudText {
    return workshopHud(this.state);
  }

  hint(): HintLadder | null {
    return workshopHint(this.state);
  }

  pulseMarks(): readonly PulseMark[] {
    return [];
  }

  journalText(id: string): string {
    return Object.prototype.hasOwnProperty.call(WORKSHOP_JOURNAL, id)
      ? WORKSHOP_JOURNAL[id as WorkshopJournalId]
      : '';
  }

  sealPosition(_sealId: string): Point | null {
    return null;
  }

  lanternLightProfile(): LanternLightingProfile | undefined {
    return undefined;
  }

  pedestalPosition(_pedestalId: string): Point | null {
    return null;
  }

  lighting(): 'lantern' | 'none' {
    return 'none';
  }

  /** No darkness overlay here (lighting() is 'none'): no ambient darkness, light blockers or light marks. */
  ambientDarkness(): number {
    return 0;
  }

  lightBlockers(): readonly Rect[] {
    return [];
  }

  lightMarks(): readonly LightMark[] {
    return [];
  }

  /** Nhinh has her maintenance lantern once the assignment is received. */
  lanternAvailable(): boolean {
    return this.state.assignmentReceived;
  }

  /** Lumo first appears in level 01 (00-story-bible.md, "Đoạn mở đầu đã tán thành"). */
  lumoPresent(): boolean {
    return false;
  }

  isExitReached(foot: Rect): boolean {
    return exitOpen(this.state) && rectsOverlap(foot, WORKSHOP.southDoor);
  }

  exit(): { illustrations: string[]; nextLevelId: string | null } | null {
    return { illustrations: [...EXIT_ILLUSTRATIONS], nextLevelId: NEXT_LEVEL_ID };
  }

  destroy(): void {
    this.pendingIncident = null;
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.boatmanZone = null;
    this.doorZone = null;
    this.background = null;
    this.benchLamp = null;
    this.carriedLamp = null;
    this.panel = null;
    this.mother = null;
    this.boatman = null;
    this.dockOn = null;
    this.dockOff = null;
  }

  /** Applies a rule result: the new state (saved), then its effects in order. */
  private apply(result: WorkshopResult): void {
    if (result.state !== this.state) {
      this.state = result.state;
      this.host.requestSave();
      this.refresh();
    }
    this.play(result.effects, () => {
      // The diagnosis dialogue grants the assignment once it has ended (completeAssignment is idempotent).
      if (result.effects.some((effect) => effect.kind === 'dialogue' && effect.id === 'diagnosis')) {
        this.apply(completeAssignment(this.state));
      }
    });
  }

  /** Plays the effects one after another. Dialogue and the choice box wait for the player; the rest are instant. */
  private play(effects: readonly WorkshopEffect[], done: () => void): void {
    const [effect, ...rest] = effects;
    if (!effect) {
      done();
      return;
    }
    const next = (): void => this.play(rest, done);
    switch (effect.kind) {
      case 'dialogue':
        this.say(effect.id, next);
        return;
      case 'toast':
        this.host.toast(effect.text);
        next();
        return;
      case 'journal':
        this.host.addJournal(effect.id);
        next();
        return;
      case 'choosePart':
        this.host.choose([PART_LABELS.ring, PART_LABELS.spring], (index) => {
          if (index !== null) {
            const part: WorkshopPart = index === 0 ? 'ring' : 'spring';
            this.apply(takePart(this.state, part));
          }
          next();
        }, PART_CHOICE_AT);
        return;
    }
  }

  private say(id: WorkshopDialogueId, onDone: () => void): void {
    if (id === 'incident') {
      // The boatman leaves, the harbour lamp blinks out, and only then does Mother call (00-prologue.md).
      // The controls stay free while he walks.
      this.pendingIncident = () => this.callMother(onDone);
      return;
    }
    if (id === 'diagnosis') this.showingMap = true;
    // He is already "returned" in the save while he pays: keep his sprite at the door until the payment lines end.
    if (id === 'payment') this.paying = true;
    this.refresh();
    this.host.say(WORKSHOP_DIALOGUE[id], () => {
      if (id === 'diagnosis') this.showingMap = false;
      if (id === 'payment') {
        this.paying = false;
        this.startBoatmanWalk();
      }
      onDone();
    });
  }

  private firePendingIncident(): void {
    const call = this.pendingIncident;
    this.pendingIncident = null;
    call?.();
  }

  /** Mẹ's call: marks it played (saved), then shows her line. */
  private callMother(onDone: () => void): void {
    this.state = markIncidentCalled(this.state);
    this.host.requestSave();
    this.host.say(WORKSHOP_DIALOGUE.incident, onDone);
  }

  private startBoatmanWalk(): void {
    if (!this.boatman) {
      // No boatman sprite to walk: the harbour lamp blinks at once.
      this.harborBlink = 0;
      return;
    }
    this.boatmanWalking = true;
    this.walkClock = 0;
    this.boatman.setVisible(true).setTexture(spriteKey('boatman-walk-0'));
  }

  private stepBoatman(dt: number): void {
    this.walkClock += dt;
    showTexture(this.boatman, spriteKey(`boatman-walk-${Math.floor(this.walkClock / BOATMAN_WALK_FRAME_MS) % BOATMAN_WALK_FRAMES}`));
    const dx = BOATMAN_EXIT.x - this.boatmanAt.x;
    const dy = BOATMAN_EXIT.y - this.boatmanAt.y;
    const distance = Math.hypot(dx, dy);
    const step = BOATMAN_SPEED * dt / 1000;
    if (distance <= step) {
      this.boatmanAt = { ...BOATMAN_EXIT };
      this.boatmanWalking = false;
      this.boatman?.setVisible(false);
      // The harbour lamp goes out right after he is gone (the incident).
      this.harborBlink = 0;
    } else {
      this.boatmanAt = { x: this.boatmanAt.x + (dx / distance) * step, y: this.boatmanAt.y + (dy / distance) * step };
    }
    this.boatman?.setPosition(this.boatmanAt.x, this.boatmanAt.y);
    this.boatman?.setDepth(10 + this.boatmanAt.y / 10);
  }

  /** Re-derives every visible piece and collision toggle from the current state. */
  private refresh(): void {
    const s = this.state;
    if (this.benchLamp) {
      const onBench = !s.boatmanReturned && s.held !== 'lamp';
      this.benchLamp.setVisible(onBench);
    }
    // The bench lamp is always broken while it stands there: once repaired it is carried, lit. The repaired panel blinks (animatePanel).
    if (!s.localLineRepaired) showTexture(this.panel, spriteKey('panel-loose'));
    this.mother?.setTexture(spriteKey(this.showingMap ? 'mother-map' : 'mother-work'));
    if (this.boatman && !this.boatmanWalking) {
      this.boatman.setVisible(!s.boatmanReturned || this.paying);
      this.boatman.setTexture(spriteKey('boatman-front'));
    }
    if (this.carriedLamp) this.carriedLamp.setVisible(s.held === 'lamp' && !s.boatmanReturned);

    const solids = new Set<Rect>(workshopSolids(s));
    if (this.boatmanZone) setZoneEnabled(this.boatmanZone, solids.has(WORKSHOP.boatman));
    if (this.doorZone) setZoneEnabled(this.doorZone, solids.has(WORKSHOP.southDoor));
  }

  /** The lamp Nhinh carries stands at her hand, just above and beside the foot. */
  private carryLamp(foot: Rect): void {
    if (!this.carriedLamp || !this.carriedLamp.visible) return;
    const x = rectCenter(foot).x + 8;
    const bottom = foot.y - 8;
    this.carriedLamp.setPosition(x, bottom).setDepth(10 + (foot.y + 3) / 10 + 0.1);
  }

  /**
   * The dock lamps through the window: lit until Mẹ's call. The boatman's exit starts a flicker that ends dark,
   * and they stay dark from the call on, also after a reload.
   */
  private showHarbor(): void {
    const lit = this.harborBlink !== null
      ? Math.floor(this.harborBlink / HARBOR_BLINK_STEP_MS) % 2 === 0
      : !this.state.incidentCalled;
    this.dockOn?.setVisible(lit);
    this.dockOff?.setVisible(!lit);
  }

  /** The repaired panel's amber lamp blinks: fault and off alternate, with the same footprint. */
  private animatePanel(dt: number): void {
    if (!this.panel || !this.state.localLineRepaired) return;
    this.panelClock += dt;
    const lit = Math.floor(this.panelClock / PANEL_BLINK_MS) % 2 === 0;
    showTexture(this.panel, spriteKey(lit ? 'panel-fault' : 'panel-off'));
  }

  private image(name: string, x: number, y: number, depth: number): Phaser.GameObjects.Image {
    const image = this.scene.add.image(x, y, spriteKey(name)).setScale(SPRITE_SCALE).setDepth(depth);
    this.objects.push(image);
    return image;
  }

  /** A prop standing on (x, bottom): bottom-centre anchored, depth from its ground line like the player's. */
  private prop(name: string, x: number, bottom: number, depth: number): Phaser.GameObjects.Image {
    const image = this.scene.add.image(x, bottom, spriteKey(name)).setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    image.setDepth(depth > 0 ? depth : 10 + bottom / 10);
    this.objects.push(image);
    return image;
  }

  /** A static zone that is solid for Nhinh's foot, registered with the host. */
  private solidZone(rect: Rect): Phaser.GameObjects.Zone {
    const zone = this.scene.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
    this.scene.physics.add.existing(zone, true);
    this.host.solid(zone);
    this.objects.push(zone);
    return zone;
  }
}
