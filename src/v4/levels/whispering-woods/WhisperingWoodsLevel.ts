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
  TARGET_RINGS,
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
  stone: 0x4f5e5c,
  ring: 0x9fd3c7,
  ringMatched: 0xffe08a,
  notchDim: 0x6d7d78,
  crank: 0x8a6a3a,
  crankMark: 0xd8b869,
  gate: 0x6b5a3a,
  catch: 0xb08a4a,
  catchEngaged: 0xffe08a,
  axle: 0x7f9a8a,
  firefly: 0x7df2d4,
};

/** Unit vectors for the three directions in screen space (y points down): N up, SE down-right, SW down-left. */
const DIR_VECTOR: Readonly<Record<RingDir, Point>> = {
  0: { x: 0, y: -1 },
  1: { x: 0.7071, y: 0.7071 },
  2: { x: -0.7071, y: 0.7071 },
};

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
  /** The light marks (mouths) and the Pulse-revealed axles and crank marks, drawn above the darkness. */
  private marks: Phaser.GameObjects.Graphics | null = null;
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

    this.fixtures = scene.add.graphics().setDepth(3);
    this.marks = scene.add.graphics().setDepth(68.5);

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
    this.marks?.destroy();
    this.fixtures = null;
    this.marks = null;
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

  private drawFixtures(view: WhisperingWoodsView): void {
    const g = this.fixtures;
    if (!g) return;
    g.clear();
    const { steles, cranks, gate } = WHISPERING_WOODS;
    const stones: Record<Ring, Rect> = { moon: steles.moon, leaf: steles.leaf, star: steles.star, water: steles.water };
    for (const ring of ['moon', 'leaf', 'star', 'water'] as const) {
      this.drawStele(stones[ring], view.rings[ring], view.matched[ring]);
    }
    for (const crank of ['x', 'y', 'z'] as const) {
      this.drawCrank(cranks[crank], crank);
    }
    // The gate: the leaf while closed, a bare frame while open, and the catch once the gate has been fully open.
    if (!view.gateOpen) {
      this.fillRect(g, gate, COLOR.gate);
    } else {
      g.lineStyle(1, COLOR.gate, 1).strokeRect(gate.x, gate.y, gate.width, gate.height);
    }
    if (view.gateLive || this.state.gateCatch) {
      g.fillStyle(COLOR.catchEngaged, 1).fillRect(gate.x - 4, gate.y + 14, 4, 12);
    } else {
      g.fillStyle(COLOR.catch, 1).fillRect(gate.x - 4, gate.y + 14, 4, 12);
    }
    // Pulse-revealed axles: a line under the moss between each pair of steles.
    if (this.host.hasJournal(AXLE_X_ID)) this.drawAxle(g, steles.moon, steles.leaf);
    if (this.host.hasJournal(AXLE_Y_ID)) this.drawAxle(g, steles.leaf, steles.star);
    if (this.host.hasJournal(AXLE_Z_ID)) this.drawAxle(g, steles.star, steles.water);
  }

  /** A stele: a stone block, a ring, and a notch at its current direction. A matched ring glows; only its own slot. */
  private drawStele(rect: Rect, dir: RingDir, matched: boolean): void {
    const g = this.fixtures;
    if (!g) return;
    this.fillRect(g, rect, COLOR.stone);
    const c = rectCenter(rect);
    g.lineStyle(1.5, matched ? COLOR.ringMatched : COLOR.ring, 0.9).strokeCircle(c.x, c.y, 10);
    const v = DIR_VECTOR[dir];
    g.fillStyle(matched ? COLOR.ringMatched : COLOR.notchDim, 1).fillCircle(c.x + v.x * 10, c.y + v.y * 10, 2.5);
  }

  /** A crank: a shape per axle (triangle X, square Y, diamond Z), so the mark reads without colour. */
  private drawCrank(rect: Rect, crank: Crank): void {
    const g = this.fixtures;
    if (!g) return;
    const c = rectCenter(rect);
    g.fillStyle(COLOR.crank, 1);
    if (crank === 'x') {
      g.fillTriangle(c.x, c.y - 6, c.x + 6, c.y + 5, c.x - 6, c.y + 5);
    } else if (crank === 'y') {
      g.fillRect(c.x - 5, c.y - 5, 10, 10);
    } else {
      g.fillPoints([{ x: c.x, y: c.y - 7 }, { x: c.x + 7, y: c.y }, { x: c.x, y: c.y + 7 }, { x: c.x - 7, y: c.y }], true);
    }
    const markId = crank === 'x' ? CRANK_MARK_X_ID : crank === 'y' ? CRANK_MARK_Y_ID : CRANK_MARK_Z_ID;
    if (this.host.hasJournal(markId)) g.lineStyle(1, COLOR.crankMark, 0.8).strokeCircle(c.x, c.y, 11);
  }

  private drawAxle(g: Phaser.GameObjects.Graphics, a: Rect, b: Rect): void {
    const ca = rectCenter(a);
    const cb = rectCenter(b);
    g.lineStyle(1.5, COLOR.axle, 0.9).lineBetween(ca.x, 118, cb.x, 118);
    g.lineBetween(ca.x, 118, ca.x, a.y);
    g.lineBetween(cb.x, 118, cb.x, b.y);
  }

  /**
   * The mouths: three fireflies along the target direction, shown while no footprint covers the mark. A mouth not
   * readable now but already in the journal leaves a faint outline.
   */
  private drawMarks(view: WhisperingWoodsView): void {
    const g = this.marks;
    if (!g) return;
    g.clear();
    const blockers = whisperingWoodsBlockers(view);
    for (const mark of WHISPERING_WOODS_LIGHT_MARKS) {
      const { x, y, width, height } = mark.rect;
      if (isMarkReadable(mark, this.footprintsNow, blockers)) {
        const c = rectCenter(mark.rect);
        const v = DIR_VECTOR[TARGET_RINGS[MOUTH_RING[mark.id]]];
        g.fillStyle(COLOR.firefly, 0.9);
        for (const t of [-4, 0, 4]) g.fillCircle(c.x + v.x * t, c.y + v.y * t, 1.5);
      } else if (this.host.hasJournal(mark.id)) {
        g.lineStyle(1, COLOR.firefly, 0.25).strokeRect(x, y, width, height);
      }
    }
  }

  private fillRect(graphics: Phaser.GameObjects.Graphics | null, rect: Rect, color: number): void {
    graphics?.fillStyle(color, 1).fillRect(rect.x, rect.y, rect.width, rect.height);
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
