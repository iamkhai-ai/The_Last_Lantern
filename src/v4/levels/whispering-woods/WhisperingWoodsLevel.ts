import type Phaser from 'phaser';
import { tr } from '../../../i18n/catalog.ts';
import type { DialogueLine, Interactable } from '../../../types/gameTypes';
import { SoundSystem } from '../../../systems/SoundSystem';
import type { HintLadder } from '../../core/hints';
import type { HudText, LevelLayout } from '../../core/level';
import { rectCenter } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { isMarkReadable } from '../../core/light';
import type { Footprint, LightMark } from '../../core/light';
import type { PulseMark } from '../../core/pulse';
import type { LevelHost, V4LevelRuntime } from '../../scene/LevelHost';
import {
  AXLE_X_ID,
  AXLE_Y_ID,
  AXLE_Z_ID,
  CRANK_MARK_X_ID,
  CRANK_MARK_Y_ID,
  CRANK_MARK_Z_ID,
  CRANK_X_ID,
  CRANK_Y_ID,
  CRANK_Z_ID,
  LEAF_ID,
  MOON_ID,
  MOUTH_LEAF_ID,
  MOUTH_MOON_ID,
  MOUTH_STAR_ID,
  MOUTH_WATER_ID,
  STAR_ID,
  WATER_ID,
  WHISPERING_WOODS,
  WHISPERING_WOODS_LIGHT_MARKS,
  WHISPERING_WOODS_PULSE_MARKS,
} from './whisperingWoodsLayout';
import {
  WHISPERING_WOODS_JOURNAL_TEXT,
  defaultWhisperingWoodsState,
  deriveWhisperingWoods,
  inExitZone,
  parseWhisperingWoodsState,
  turnCrank,
  whisperingWoodsBlockers,
  whisperingWoodsHint,
  whisperingWoodsHud,
} from './whisperingWoodsLogic';
import type { Crank, Ring, RingDir, WhisperingWoodsState, WhisperingWoodsView } from './whisperingWoodsLogic';
import { GROVE_SPRITE_KEYS, GROVE_SPRITE_URLS, RING_PIVOT } from './whisperingWoodsArt';

/** The grove's ambient darkness: constant, never tied to the lantern (puzzle-contracts §1). */
const AMBIENT_DARKNESS = 0.82;

/** One-time events (saved). */
const BELL_EVENT = 'whispering-woods:bell';
const PAIR_EVENT = 'whispering-woods:pair';
const END_EVENT = 'whispering-woods:end';

/** The next level in the demo. */
const NEXT_LEVEL_ID = 'library-roots';

/** Lines the story plays once (doc section 1, section 3 and section 4). */
const BELL_LINES: DialogueLine[] = [{ speaker: 'Lumo', text: 'Tôi vẫn treo lại. Có con thức dậy sẽ cần nó.' }];
const PAIR_LINES: DialogueLine[] = [{ speaker: 'Nhinh', text: 'Hai chiếc cùng đi. Chúng còn chung trục.' }];
const END_LINES: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Hồi đó họ cũng đến kiểm tra đèn.' },
  { speaker: 'Lumo', text: 'Rồi họ mang đèn về. Vườn được ngủ.' },
];

const PROMPT_STELE: Record<Ring, string> = {
  moon: 'E: xem bia Trăng',
  leaf: 'E: xem bia Lá',
  star: 'E: xem bia Sao',
  water: 'E: xem bia Nước',
};
const PROMPT_CRANK: Record<Crank, string> = {
  x: 'E: quay tay X',
  y: 'E: quay tay Y',
  z: 'E: quay tay Z',
};
const STELE_TOAST = 'Vành đứng yên trên bia; hướng của nó đổi khi tay quay đi cùng bia.';

const COLOR = {
  floor: 0x17261f,
  wall: 0x2c3e40,
  ringMatched: 0xffe08a,
  latchOff: 0x6b6b6b,
  crankMark: 0xd8b869,
  axle: 0x7f9a8a,
};

/** The grove's rings and cranks, in order. */
const RINGS: readonly Ring[] = ['moon', 'leaf', 'star', 'water'];
const CRANKS: readonly Crank[] = ['x', 'y', 'z'];

/** Clockwise turn from N for each direction: N 0, SE 135° (down-right), SW 225° (down-left). Phaser rotates in radians. */
const RING_ANGLE: Readonly<Record<RingDir, number>> = {
  0: 0,
  1: (3 * Math.PI) / 4,
  2: (5 * Math.PI) / 4,
};

/** Alpha of a mouth that is no longer readable but is already in the journal: a faint trace of where it was. */
const FAINT_MOUTH_ALPHA = 0.25;

/** The sprites of one build. Positions come from the layout; each frame changes only rotation, tint and texture. */
interface GroveArt {
  readonly steles: Record<Ring, Phaser.GameObjects.Image>;
  readonly rings: Record<Ring, Phaser.GameObjects.Image>;
  readonly cranks: Record<Crank, Phaser.GameObjects.Image>;
  readonly gate: Phaser.GameObjects.Image;
  readonly latch: Phaser.GameObjects.Image;
  /** Keyed by mark id. */
  readonly mouths: Record<string, Phaser.GameObjects.Image>;
}

/**
 * The whispering grove: four steles, three cranks and a gate. The rings are computed from the crank counters, the gate
 * opens once every ring faces its mouth, and a catch holds it open afterwards. Drawn with Graphics; solids are static zones.
 */
export class WhisperingWoodsLevel implements V4LevelRuntime<WhisperingWoodsState> {
  readonly id = 'whispering-woods';
  readonly title = 'Rừng đom đóm';
  readonly layout: LevelLayout = WHISPERING_WOODS;

  private host!: LevelHost;
  private state: WhisperingWoodsState = defaultWhisperingWoodsState();
  private items: Interactable[] = [];
  private gateZone: Phaser.GameObjects.Zone | null = null;
  private statics: Phaser.GameObjects.Graphics[] = [];
  /** Steles, cranks, gate and catch: redrawn each frame from the view. */
  private fixtures: Phaser.GameObjects.Graphics | null = null;
  private art: GroveArt | null = null;
  /** The light marks (mouths) and the Pulse-revealed axles and crank marks, drawn above the darkness. */
  /** The view drawn last frame, so the gate sounds play only on a change. */
  private shown: WhisperingWoodsView | null = null;
  /** The opening line plays on the first frame, not during build. */
  private openingPending = true;
  /** This frame's footprints, kept for the mark readability check. */
  private footprintsNow: readonly Footprint[] = [];

  defaultState(): WhisperingWoodsState {
    return defaultWhisperingWoodsState();
  }

  parseState(raw: unknown): WhisperingWoodsState {
    return parseWhisperingWoodsState(raw);
  }

  preload(scene: Phaser.Scene): void {
    for (const [key, url] of Object.entries(GROVE_SPRITE_URLS)) {
      if (!scene.textures.exists(key)) scene.load.image(key, url);
    }
  }

  build(host: LevelHost, state: WhisperingWoodsState): void {
    this.host = host;
    this.state = state;
    const scene = host.scene;
    const world = WHISPERING_WOODS.world;
    const { steles, cranks, gate } = WHISPERING_WOODS;

    const floor = scene.add.graphics().setDepth(0);
    floor.fillStyle(COLOR.floor, 1).fillRect(world.x, world.y, world.width, world.height);

    const walls = scene.add.graphics().setDepth(1);
    walls.fillStyle(COLOR.wall, 1);
    for (const wall of WHISPERING_WOODS.walls) walls.fillRect(wall.x, wall.y, wall.width, wall.height);
    this.statics.push(floor, walls);

    this.fixtures = scene.add.graphics().setDepth(3.4);
    this.art = this.createArt();

    // Solids: walls, steles and cranks always; the gate while closed (its zone follows the view in update).
    for (const wall of WHISPERING_WOODS.walls) this.solidZone(wall);
    for (const rect of [steles.moon, steles.leaf, steles.star, steles.water]) this.solidZone(rect);
    for (const rect of [cranks.x, cranks.y, cranks.z]) this.solidZone(rect);
    this.gateZone = this.solidZone(gate);

    this.items = [
      ...(['moon', 'leaf', 'star', 'water'] as const).map((ring): Interactable => ({
        id: ringId(ring),
        reach: { kind: 'block', rect: steles[ring] },
        getPrompt: () => PROMPT_STELE[ring],
        onInteract: () => host.toast(STELE_TOAST),
      })),
      ...(['x', 'y', 'z'] as const).map((crank): Interactable => ({
        id: crankId(crank),
        reach: { kind: 'block', rect: cranks[crank] },
        getPrompt: () => PROMPT_CRANK[crank],
        onInteract: () => this.onCrank(crank),
      })),
    ];

    this.refresh(this.viewNow());
  }

  interactables(): Interactable[] {
    return this.items;
  }

  update(_dt: number, _foot: Rect, footprints: readonly Footprint[]): void {
    if (this.openingPending) {
      this.openingPending = false;
      if (!this.host.hasEvent(BELL_EVENT)) {
        this.host.markEvent(BELL_EVENT);
        this.host.say(BELL_LINES);
      }
    }
    this.footprintsNow = footprints;
    const view = this.viewNow();
    if (this.shown) {
      if (!this.shown.gateOpen && view.gateOpen) SoundSystem.playGateOpen();
      if (!this.shown.gateLive && view.gateLive) SoundSystem.playMechanismLatch();
    }
    if (view.gateOpen && !this.host.hasEvent(END_EVENT)) {
      this.host.markEvent(END_EVENT);
      this.host.say(END_LINES);
    }
    this.refresh(view);
  }

  getState(): WhisperingWoodsState {
    return this.state;
  }

  hud(): HudText {
    return whisperingWoodsHud(this.viewNow(), tr);
  }

  hint(): HintLadder | null {
    return whisperingWoodsHint(this.state);
  }

  pulseMarks(): readonly PulseMark[] {
    return WHISPERING_WOODS_PULSE_MARKS;
  }

  journalText(id: string): string {
    return WHISPERING_WOODS_JOURNAL_TEXT[id] ?? '';
  }

  sealPosition(_sealId: string): Point | null {
    return null;
  }

  pedestalPosition(_pedestalId: string): Point | null {
    return null;
  }

  ambientDarkness(): number {
    return AMBIENT_DARKNESS;
  }

  lightBlockers(): readonly Rect[] {
    return whisperingWoodsBlockers(this.viewNow());
  }

  lightMarks(): readonly LightMark[] {
    return WHISPERING_WOODS_LIGHT_MARKS;
  }

  lighting(): 'lantern' | 'none' {
    return 'lantern';
  }

  lanternAvailable(): boolean {
    return true;
  }

  isExitReached(foot: Rect): boolean {
    return this.viewNow().gateOpen && inExitZone(foot);
  }

  exit(): { illustrations: string[]; nextLevelId: string | null } | null {
    return { illustrations: [], nextLevelId: NEXT_LEVEL_ID };
  }

  destroy(): void {
    for (const graphics of this.statics) graphics.destroy();
    this.statics = [];
    this.fixtures?.destroy();
    this.fixtures = null;
    this.destroyArt();
    this.gateZone = null;
  }

  /** The view from the saved state, recomputed on every read so a just-turned crank is never stale. */
  private viewNow(): WhisperingWoodsView {
    return deriveWhisperingWoods(this.state);
  }

  /** E on a crank: one notch (always works). Saves, then the first turn plays Nhinh's line once. */
  private onCrank(crank: Crank): void {
    const result = turnCrank(this.state, crank);
    this.state = result.state;
    this.host.requestSave();
    SoundSystem.playMirrorRotate();
    if (!this.host.hasEvent(PAIR_EVENT)) {
      this.host.markEvent(PAIR_EVENT);
      this.host.say(PAIR_LINES);
    }
  }

  /** Applies the zone and the drawing for a view. Used by build and by every frame. */
  private refresh(view: WhisperingWoodsView): void {
    if (this.gateZone) this.setZoneEnabled(this.gateZone, !view.gateOpen);
    this.drawFixtures(view);
    this.drawMarks(view);
    this.shown = view;
  }

  /** Creates the sprites once per build, at the layout rects. */
  private createArt(): GroveArt {
    const scene = this.host.scene;
    const { steles, cranks, gate } = WHISPERING_WOODS;
    // A stele and its ring share the ring pivot: the ring turns about the centre of the stele rect.
    const pivoted = (key: string, rect: Rect, depth: number): Phaser.GameObjects.Image => {
      const c = rectCenter(rect);
      return scene.add.image(c.x, c.y, key).setOrigin(RING_PIVOT.x, RING_PIVOT.y).setDepth(depth);
    };
    const at = (key: string, x: number, y: number, depth: number): Phaser.GameObjects.Image =>
      scene.add.image(x, y, key).setOrigin(0, 0).setDepth(depth);

    const steleArt = {} as Record<Ring, Phaser.GameObjects.Image>;
    const ringArt = {} as Record<Ring, Phaser.GameObjects.Image>;
    for (const ring of RINGS) {
      steleArt[ring] = pivoted(GROVE_SPRITE_KEYS.steles[ring], steles[ring], 3);
      ringArt[ring] = pivoted(GROVE_SPRITE_KEYS.ring, steles[ring], 3.1);
    }
    const crankArt = {} as Record<Crank, Phaser.GameObjects.Image>;
    for (const crank of CRANKS) {
      crankArt[crank] = at(GROVE_SPRITE_KEYS.cranks[crank], cranks[crank].x, cranks[crank].y, 3);
    }
    const mouths: Record<string, Phaser.GameObjects.Image> = {};
    for (const mark of WHISPERING_WOODS_LIGHT_MARKS) {
      mouths[mark.id] = at(GROVE_SPRITE_KEYS.mouths[MOUTH_RING[mark.id]], mark.rect.x, mark.rect.y, 68.5).setAlpha(0);
    }
    return {
      steles: steleArt,
      rings: ringArt,
      cranks: crankArt,
      gate: at(GROVE_SPRITE_KEYS.gateClosed, gate.x, gate.y, 3),
      // The catch sits on the gate's inner edge, a little below its middle.
      latch: at(GROVE_SPRITE_KEYS.latch, gate.x - 8, gate.y + 16, 3.2),
      mouths,
    };
  }

  private destroyArt(): void {
    const art = this.art;
    if (!art) return;
    const images = [
      ...Object.values(art.steles),
      ...Object.values(art.rings),
      ...Object.values(art.cranks),
      art.gate,
      art.latch,
      ...Object.values(art.mouths),
    ];
    for (const image of images) image.destroy();
    this.art = null;
  }

  private drawFixtures(view: WhisperingWoodsView): void {
    const g = this.fixtures;
    const art = this.art;
    if (!g || !art) return;
    g.clear();
    this.drawArt(view, art);
    // Pulse-revealed match marks on each crank, and axles under the moss between each pair of steles.
    const { steles, cranks } = WHISPERING_WOODS;
    for (const crank of CRANKS) {
      const markId = crank === 'x' ? CRANK_MARK_X_ID : crank === 'y' ? CRANK_MARK_Y_ID : CRANK_MARK_Z_ID;
      if (this.host.hasJournal(markId)) {
        const c = rectCenter(cranks[crank]);
        g.lineStyle(1, COLOR.crankMark, 0.8).strokeCircle(c.x, c.y, 11);
      }
    }
    if (this.host.hasJournal(AXLE_X_ID)) this.drawAxle(g, steles.moon, steles.leaf);
    if (this.host.hasJournal(AXLE_Y_ID)) this.drawAxle(g, steles.leaf, steles.star);
    if (this.host.hasJournal(AXLE_Z_ID)) this.drawAxle(g, steles.star, steles.water);
  }

  /**
   * The view on the sprites: each ring turns to its direction and glows only when it matches its own mouth; the gate
   * shows its leaf or its open frame; the catch is lit once it holds.
   */
  private drawArt(view: WhisperingWoodsView, art: GroveArt): void {
    for (const ring of RINGS) {
      const image = art.rings[ring];
      image.setRotation(RING_ANGLE[view.rings[ring]]);
      if (view.matched[ring]) image.setTint(COLOR.ringMatched);
      else image.clearTint();
    }
    const gateKey = view.gateOpen ? GROVE_SPRITE_KEYS.gateOpen : GROVE_SPRITE_KEYS.gateClosed;
    if (art.gate.texture.key !== gateKey) art.gate.setTexture(gateKey);
    if (view.gateLive || this.state.gateCatch) art.latch.clearTint();
    else art.latch.setTint(COLOR.latchOff);
  }

  private drawAxle(g: Phaser.GameObjects.Graphics, a: Rect, b: Rect): void {
    const ca = rectCenter(a);
    const cb = rectCenter(b);
    g.lineStyle(1.5, COLOR.axle, 0.9).lineBetween(ca.x, 118, cb.x, 118);
    g.lineBetween(ca.x, 118, ca.x, a.y);
    g.lineBetween(cb.x, 118, cb.x, b.y);
  }

  /**
   * The mouths show while no footprint covers them; the sprite carries its own fireflies, pointing at the target. A
   * mouth no longer readable but already in the journal leaves a faint trace.
   */
  private drawMarks(view: WhisperingWoodsView): void {
    const art = this.art;
    if (!art) return;
    const blockers = whisperingWoodsBlockers(view);
    for (const mark of WHISPERING_WOODS_LIGHT_MARKS) {
      const image = art.mouths[mark.id];
      if (isMarkReadable(mark, this.footprintsNow, blockers)) image.setAlpha(1);
      else image.setAlpha(this.host.hasJournal(mark.id) ? FAINT_MOUTH_ALPHA : 0);
    }
  }

  /** A static zone that is solid for Nhinh, registered with the host. */
  private solidZone(rect: Rect): Phaser.GameObjects.Zone {
    const scene = this.host.scene;
    const zone = scene.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
    scene.physics.add.existing(zone, true);
    this.host.solid(zone);
    return zone;
  }

  /** Turns a zone's static body on or off. A disabled body takes no part in collisions (Arcade skips it). */
  private setZoneEnabled(zone: Phaser.GameObjects.Zone, enabled: boolean): void {
    (zone as unknown as { body: { enable: boolean } }).body.enable = enabled;
  }
}

/** Ids of the interactables, matching the layout's item ids. */
function ringId(ring: Ring): string {
  return ring === 'moon' ? MOON_ID : ring === 'leaf' ? LEAF_ID : ring === 'star' ? STAR_ID : WATER_ID;
}

function crankId(crank: Crank): string {
  return crank === 'x' ? CRANK_X_ID : crank === 'y' ? CRANK_Y_ID : CRANK_Z_ID;
}

/** Which ring each mouth belongs to. */
const MOUTH_RING: Readonly<Record<string, Ring>> = {
  [MOUTH_MOON_ID]: 'moon',
  [MOUTH_LEAF_ID]: 'leaf',
  [MOUTH_STAR_ID]: 'star',
  [MOUTH_WATER_ID]: 'water',
};
