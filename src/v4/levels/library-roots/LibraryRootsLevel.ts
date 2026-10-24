import type Phaser from 'phaser';
import type { DialogueLine, Interactable } from '../../../types/gameTypes';
import { SoundSystem } from '../../../systems/SoundSystem';
import type { HintLadder } from '../../core/hints';
import type { HudText, LevelLayout } from '../../core/level';
import { rectCenter, rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { isMarkReadable, isRectLit } from '../../core/light';
import type { Footprint, LightMark, Room } from '../../core/light';
import type { PulseMark } from '../../core/pulse';
import type { LevelHost, V4LevelRuntime } from '../../scene/LevelHost';
import {
  CRYSTAL_ID,
  DESK_ID,
  LEVER_ID,
  LIBRARY,
  LIBRARY_PRACTICE_MARKS,
  LIBRARY_PULSE_MARKS,
  LIBRARY_ROOMS,
  PULSE_FEED_ID,
  PULSE_RETURN_ID,
  PULSE_SHAFT_ID,
  RACK_IDS,
  SOCKET_IDS,
  VALVE_IDS,
  WELL_ID,
  WHEEL_ID,
  tabletRect,
} from './libraryRootsLayout';
import {
  INTRO_EVENT_ID,
  LIBRARY_JOURNAL_TEXT,
  MEMORY_EVENT_ID,
  ORIGINAL_DESIGN_JOURNAL_ID,
  STAGE_COUNT,
  defaultLibraryState,
  doorOpen,
  holderAction,
  libraryHint,
  libraryBlockers,
  libraryHud,
  markSymbol,
  parseLibraryState,
  pullLever,
  ringReport,
  stepWheel,
  takeCrystal,
  tabletMarks,
  toggleValve,
} from './libraryRootsLogic';
import type { Holder, LibraryState, MarkSymbol, StepOutcome } from './libraryRootsLogic';

/** Ambient darkness: constant for the room, never tied to F (puzzle-contracts section 1). */
const AMBIENT_DARKNESS = 0.42;
const NEXT_LEVEL_ID = 'moonlit-creek';

const INTRO_LINES: DialogueLine[] = [
  { speaker: 'Lumo', text: 'Trong sách của cậu có phần dành cho rừng không?' },
];
const MEMORY_LINES: DialogueLine[] = [
  { speaker: 'Nhinh', text: 'Bản ở xưởng chỉ còn nửa đường ống.' },
  { speaker: 'Lumo', text: 'Nửa bị mất đi đâu?' },
  { speaker: 'Nhinh', text: 'Trong bản này nó còn đường về. Mình phải xem ngoài trạm còn chảy không.' },
];
const PRACTICE_TEXT = 'Trang thực hành: mỗi phiến có hai lớp. Hình sáng chỉ hiện dưới vệt đèn; hình tối chỉ hiện ngoài vệt đèn.';

const PROMPT_EMPTY = 'E: trống';
const PROMPT_PLACE = 'E: đặt phiến';
const PROMPT_SWAP = 'E: đổi phiến';
const PROMPT_TAKE = 'E: lấy phiến';
const PROMPT_TEST = 'E: chạy thử chu kỳ';
const PROMPT_WHEEL = 'E: quay bánh xe';
const PROMPT_LEVER = 'E: kéo cần chốt';
const PROMPT_CRYSTAL_LOCKED = 'E: ngăn đang khóa';
const PROMPT_CRYSTAL = 'E: lấy tinh thể Ký Ức';
const PROMPT_PRACTICE = 'E: đọc trang thực hành';

const COLOR = {
  floor: 0x14262b,
  floorModel: 0x182d33,
  wall: 0x2c3e40,
  rack: 0x3a3426,
  holder: 0x5a4f36,
  tablet: 0x8a7a55,
  well: 0x0b1a1e,
  wellRing: 0x4b6a6a,
  socket: 0x6b5a3a,
  desk: 0x4a3c2a,
  sheet: 0xd8cfb0,
  model: 0x2b4247,
  stage: 0x35525a,
  valveUnset: 0x55606a,
  valveReturn: 0x4fb3a9,
  valveFeed: 0xd9a24a,
  door: 0x6b5a3a,
  wheel: 0x8a7a55,
  lever: 0x9c7a3e,
  leverLocked: 0xffe08a,
  crystal: 0x4fb3a9,
  crystalEmpty: 0x1c2a2c,
  exit: 0x22353a,
  fault: 0xd2574f,
  pipe: 0x7df2d4,
  mark: 0x7df2d4,
  markLit: 0xffe08a,
};

/** The library: a well with a ring of four sockets, and behind the door a four-stage model run by hand. */
export class LibraryRootsLevel implements V4LevelRuntime<LibraryState> {
  readonly id = 'library-roots';
  readonly title = 'Thư viện dưới rễ';
  readonly layout: LevelLayout = LIBRARY;

  private host!: LevelHost;
  private state: LibraryState = defaultLibraryState();
  private items: Interactable[] = [];
  private doorZone: Phaser.GameObjects.Zone | null = null;
  private statics: Phaser.GameObjects.Graphics[] = [];
  private pieces: Phaser.GameObjects.Graphics | null = null;
  private model: Phaser.GameObjects.Graphics | null = null;
  private pulses: Phaser.GameObjects.Graphics | null = null;
  private marks: Phaser.GameObjects.Graphics | null = null;
  /** Last foot rect seen, for the tablet carried in the hand. */
  private foot: Rect = { x: 0, y: 0, width: 0, height: 0 };
  /** This frame's footprints, kept for the mark readability check. */
  private footprintsNow: readonly Footprint[] = [];
  /** Door open and latch as drawn last frame, so sounds play on a change only. */
  private shownOpen: boolean | null = null;
  private shownLatched: boolean | null = null;
  /** Sockets that the last run test found wrong. Runtime only; cleared by the next holder action. */
  private lastFaults: number[] | null = null;

  defaultState(): LibraryState {
    return defaultLibraryState();
  }

  parseState(raw: unknown): LibraryState {
    return parseLibraryState(raw);
  }

  build(host: LevelHost, state: LibraryState): void {
    this.host = host;
    this.state = state;
    const scene = host.scene;
    const world = LIBRARY.world;

    const floor = scene.add.graphics().setDepth(0);
    floor.fillStyle(COLOR.floor, 1).fillRect(world.x, world.y, world.width, world.height);
    floor.fillStyle(COLOR.floorModel, 1).fillRect(352, world.y, world.x + world.width - 352, world.height);
    const walls = scene.add.graphics().setDepth(1);
    walls.fillStyle(COLOR.wall, 1);
    for (const wall of LIBRARY.walls) walls.fillRect(wall.x, wall.y, wall.width, wall.height);
    // The well: the dark shaft with a faint ring around it, and the rack rail on the west wall.
    const well = LIBRARY.well;
    const wellG = scene.add.graphics().setDepth(0.5);
    wellG.fillStyle(COLOR.well, 1).fillRect(well.x, well.y, well.width, well.height);
    wellG.lineStyle(1, COLOR.wellRing, 0.6).strokeCircle(rectCenter(well).x, rectCenter(well).y, 40);
    const rail = scene.add.graphics().setDepth(0.6);
    rail.fillStyle(COLOR.rack, 1).fillRect(20, 118, 4, 150);
    this.statics.push(floor, walls, wellG, rail);

    // Fixed blocks: rack holders, sockets, well, desk, model, valves, wheel, lever and crystal compartment.
    const fixtures = scene.add.graphics().setDepth(2);
    for (const holder of LIBRARY.rack) fixtures.fillStyle(COLOR.holder, 1).fillRect(holder.x, holder.y, holder.width, holder.height);
    for (const socket of LIBRARY.sockets) fixtures.fillStyle(COLOR.socket, 1).fillRect(socket.x, socket.y, socket.width, socket.height);
    fixtures.fillStyle(COLOR.desk, 1).fillRect(LIBRARY.desk.x, LIBRARY.desk.y, LIBRARY.desk.width, LIBRARY.desk.height);
    fixtures.fillStyle(COLOR.model, 1).fillRect(LIBRARY.model.x, LIBRARY.model.y, LIBRARY.model.width, LIBRARY.model.height);
    fixtures.fillStyle(COLOR.exit, 1).fillRect(LIBRARY.exitZone.x, LIBRARY.exitZone.y, LIBRARY.exitZone.width, LIBRARY.exitZone.height);
    this.statics.push(fixtures);

    this.pieces = scene.add.graphics().setDepth(3);
    this.model = scene.add.graphics().setDepth(2.5);
    this.pulses = scene.add.graphics().setDepth(1.8);
    this.marks = scene.add.graphics().setDepth(68.5);

    // Solids for Nhinh's foot: the walls, the blocks, and the door leaf (follows the view).
    for (const wall of LIBRARY.walls) this.solidZone(wall);
    for (const rect of [...LIBRARY.rack, ...LIBRARY.sockets, LIBRARY.well, LIBRARY.desk, LIBRARY.model, ...LIBRARY.valves, LIBRARY.wheel, LIBRARY.lever, LIBRARY.crystal]) {
      this.solidZone(rect);
    }
    this.doorZone = this.solidZone(LIBRARY.door);

    this.items = [
      ...RACK_IDS.map((id, index) => this.holderItem(id, { kind: 'rack', index }, LIBRARY.rack[index])),
      ...SOCKET_IDS.map((id, index) => this.holderItem(id, { kind: 'socket', index }, LIBRARY.sockets[index])),
      {
        id: WELL_ID,
        reach: { kind: 'block', rect: LIBRARY.well },
        getPrompt: () => PROMPT_TEST,
        onInteract: () => this.onWell(),
      },
      {
        id: DESK_ID,
        reach: { kind: 'block', rect: LIBRARY.desk },
        getPrompt: () => PROMPT_PRACTICE,
        onInteract: () => this.host.toast(PRACTICE_TEXT),
      },
      ...VALVE_IDS.map((id, stage) => ({
        id,
        reach: { kind: 'block' as const, rect: LIBRARY.valves[stage] },
        getPrompt: () => `E: van chặng ${stage + 1}`,
        onInteract: () => this.apply(toggleValve(this.state, stage)),
      })),
      {
        id: WHEEL_ID,
        reach: { kind: 'block', rect: LIBRARY.wheel },
        getPrompt: () => (this.state.modelLocked ? 'E: bánh xe đã khóa' : PROMPT_WHEEL),
        onInteract: () => this.apply(stepWheel(this.state)),
      },
      {
        id: LEVER_ID,
        reach: { kind: 'block', rect: LIBRARY.lever },
        getPrompt: () => (this.state.modelLocked ? 'E: trục hãm đã khóa' : PROMPT_LEVER),
        onInteract: () => this.apply(pullLever(this.state)),
      },
      {
        id: CRYSTAL_ID,
        reach: { kind: 'block', rect: LIBRARY.crystal },
        getPrompt: () => {
          if (this.state.crystalTaken) return null;
          return this.state.modelLocked ? PROMPT_CRYSTAL : PROMPT_CRYSTAL_LOCKED;
        },
        onInteract: () => this.onCrystal(),
      },
    ];

    if (!host.hasEvent(INTRO_EVENT_ID)) {
      host.say(INTRO_LINES, () => host.markEvent(INTRO_EVENT_ID));
    }
    this.update(0, { x: 0, y: 0, width: 0, height: 0 }, []);
  }

  interactables(): Interactable[] {
    return this.items;
  }

  update(_dt: number, foot: Rect, footprints: readonly Footprint[]): void {
    this.foot = foot;
    this.footprintsNow = footprints;
    const open = doorOpen(this.state);
    setZoneEnabled(this.doorZone, !open);
    if (this.shownOpen !== null && this.shownOpen !== open) {
      if (open) SoundSystem.playDoorOpen();
      else SoundSystem.playDoorClose();
    }
    if (this.shownLatched === false && this.state.doorLatched) SoundSystem.playMechanismLatch();
    this.shownOpen = open;
    this.shownLatched = this.state.doorLatched;

    this.drawPieces();
    this.drawModel();
    this.drawPulse();
    this.drawMarks();
  }

  getState(): LibraryState {
    return this.state;
  }

  hud(): HudText {
    return libraryHud(this.state);
  }

  hint(): HintLadder | null {
    return libraryHint(this.state);
  }

  pulseMarks(): readonly PulseMark[] {
    return LIBRARY_PULSE_MARKS;
  }

  journalText(id: string): string {
    return LIBRARY_JOURNAL_TEXT[id] ?? '';
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
    return libraryBlockers(doorOpen(this.state));
  }

  lightMarks(): readonly LightMark[] {
    return [...tabletMarks(this.state, this.foot), ...LIBRARY_PRACTICE_MARKS];
  }

  rooms(): readonly Room[] {
    return LIBRARY_ROOMS;
  }

  lighting(): 'lantern' | 'none' {
    return 'lantern';
  }

  lanternAvailable(): boolean {
    return true;
  }

  exit(): { illustrations: string[]; nextLevelId: string | null } | null {
    return { illustrations: [], nextLevelId: NEXT_LEVEL_ID };
  }

  isExitReached(foot: Rect): boolean {
    return this.state.crystalTaken && rectsOverlap(foot, LIBRARY.exitZone);
  }

  destroy(): void {
    for (const graphics of this.statics) graphics.destroy();
    this.statics = [];
    this.pieces?.destroy();
    this.model?.destroy();
    this.pulses?.destroy();
    this.marks?.destroy();
    this.pieces = null;
    this.model = null;
    this.pulses = null;
    this.marks = null;
  }

  private holderItem(id: string, holder: Holder, rect: Rect): Interactable {
    return {
      id,
      reach: { kind: 'block', rect },
      getPrompt: () => {
        const here = holder.kind === 'rack' ? this.state.rack[holder.index] : this.state.sockets[holder.index];
        if (this.state.held !== null && here === null) return PROMPT_PLACE;
        if (this.state.held !== null) return PROMPT_SWAP;
        return here === null ? PROMPT_EMPTY : PROMPT_TAKE;
      },
      onInteract: () => {
        this.lastFaults = null;
        this.apply(holderAction(this.state, holder));
      },
    };
  }

  /** Writes a changed state, requests a save, and shows the line the action returned. */
  private apply(outcome: StepOutcome): void {
    if (outcome.changed) {
      this.state = outcome.state;
      this.host.requestSave();
    }
    this.host.toast(outcome.text);
  }

  private onWell(): void {
    const report = ringReport(this.state.sockets);
    this.lastFaults = report.faults;
    this.host.toast(report.text);
  }

  private onCrystal(): void {
    const outcome = takeCrystal(this.state);
    this.apply(outcome);
    if (outcome.changed) {
      this.host.addJournal(ORIGINAL_DESIGN_JOURNAL_ID);
      if (!this.host.hasEvent(MEMORY_EVENT_ID)) {
        this.host.say(MEMORY_LINES, () => this.host.markEvent(MEMORY_EVENT_ID));
      }
    }
  }

  /** Rack holders, sockets, tablets on them, the held tablet, and the fault marks of the last run test. */
  private drawPieces(): void {
    const g = this.pieces;
    if (!g) return;
    g.clear();
    this.state.rack.forEach((tablet, i) => {
      if (tablet !== null) this.fillRect(g, tabletRect(LIBRARY.rack[i]), COLOR.tablet);
    });
    this.state.sockets.forEach((tablet, i) => {
      if (tablet !== null) this.fillRect(g, tabletRect(LIBRARY.sockets[i]), COLOR.tablet);
    });
    if (this.state.held !== null) {
      const c = rectCenter(this.foot);
      this.fillRect(g, { x: c.x - 7, y: c.y - 7, width: 14, height: 14 }, COLOR.tablet);
    }
    if (this.lastFaults) {
      g.lineStyle(2, COLOR.fault, 0.9);
      for (const i of this.lastFaults) {
        const r = LIBRARY.sockets[i];
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        g.lineBetween(cx - 5, cy - 5, cx + 5, cy + 5).lineBetween(cx + 5, cy - 5, cx - 5, cy + 5);
      }
    }
  }

  /** The model: four stage cells coloured by their valve, the valves, the wheel, the lever, the crystal compartment. */
  private drawModel(): void {
    const g = this.model;
    if (!g) return;
    g.clear();
    const s = this.state;
    for (let stage = 0; stage < STAGE_COUNT; stage++) {
      const cell = { x: LIBRARY.model.x + 6 + stage * 58, y: LIBRARY.model.y + 8, width: 46, height: 36 };
      g.fillStyle(COLOR.stage, 1).fillRect(cell.x, cell.y, cell.width, cell.height);
      const valve = s.valves[stage];
      const valveColour = valve === 'return' ? COLOR.valveReturn : valve === 'feed' ? COLOR.valveFeed : COLOR.valveUnset;
      const v = LIBRARY.valves[stage];
      g.fillStyle(valveColour, 1).fillRect(v.x, v.y, v.width, v.height);
    }
    const wheel = LIBRARY.wheel;
    const wc = rectCenter(wheel);
    g.fillStyle(COLOR.wheel, 1).fillCircle(wc.x, wc.y, wheel.width / 2);
    const stageAt = LIBRARY.model.x + 6 + s.wheel * 58 + 23;
    g.lineStyle(2, COLOR.markLit, 0.9).lineBetween(stageAt, LIBRARY.model.y + 44, stageAt, LIBRARY.model.y + 50);
    const lever = LIBRARY.lever;
    g.fillStyle(s.modelLocked ? COLOR.leverLocked : COLOR.lever, 1).fillRect(lever.x, lever.y, lever.width, lever.height);
    const crystal = LIBRARY.crystal;
    const crystalColour = s.crystalTaken ? COLOR.crystalEmpty : s.modelLocked ? COLOR.crystal : COLOR.floorModel;
    g.fillStyle(crystalColour, 1).fillRect(crystal.x, crystal.y, crystal.width, crystal.height);
    g.lineStyle(1, COLOR.wellRing, 0.8).strokeRect(crystal.x, crystal.y, crystal.width, crystal.height);
  }

  /** Pulse reveals the shaft and the two pipes: only once they are in the journal. */
  private drawPulse(): void {
    const g = this.pulses;
    if (!g) return;
    g.clear();
    if (this.host.hasJournal(PULSE_SHAFT_ID)) {
      g.lineStyle(1, COLOR.pipe, 0.45).lineBetween(196, 210, 344, 220);
    }
    if (this.host.hasJournal(PULSE_FEED_ID)) {
      g.lineStyle(1, COLOR.pipe, 0.45).lineBetween(420, 148, 420, 178);
    }
    if (this.host.hasJournal(PULSE_RETURN_ID)) {
      g.lineStyle(1, COLOR.pipe, 0.45).lineBetween(492, 148, 492, 178);
    }
  }

  /**
   * Light marks: a lit mark shows as a line glyph while it is readable under a footprint; a dark mark shows as a
   * glyph while no footprint covers it. A mark that is unreadable but already in the journal leaves an outline.
   */
  private drawMarks(): void {
    const g = this.marks;
    if (!g) return;
    g.clear();
    const blockers = libraryBlockers(doorOpen(this.state));
    for (const mark of [...tabletMarks(this.state, this.foot), ...LIBRARY_PRACTICE_MARKS]) {
      const symbol = markSymbol(mark.id);
      if (symbol === null) continue;
      if (isMarkReadable(mark, this.footprintsNow, blockers)) {
        this.drawSymbol(g, mark.rect, symbol, mark.kind === 'dark' ? COLOR.mark : COLOR.markLit);
      } else if (this.host.hasJournal(mark.id)) {
        g.lineStyle(1, COLOR.mark, 0.25).strokeRect(mark.rect.x, mark.rect.y, mark.rect.width, mark.rect.height);
      }
    }
  }

  /** Glyphs: the lit layer (sun and moon) and the dark layer (direction), each in its own shape. */
  private drawSymbol(g: Phaser.GameObjects.Graphics, rect: Rect, symbol: MarkSymbol, colour: number): void {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const r = Math.min(rect.width, rect.height) / 3;
    const top = rect.y + 1;
    const bottom = rect.y + rect.height - 1;
    switch (symbol) {
      case 'sunLow':
        g.fillStyle(colour, 0.9).fillCircle(cx, cy + 2, r);
        g.lineStyle(1, colour, 0.9).lineBetween(rect.x + 1, cy + 2, rect.x + rect.width - 1, cy + 2);
        break;
      case 'sunHigh':
        g.fillStyle(colour, 0.9).fillCircle(cx, cy, r);
        break;
      case 'moonHigh':
        g.lineStyle(1.5, colour, 0.9).strokeCircle(cx, cy, r);
        break;
      case 'arrowUp':
        g.lineStyle(1, colour, 0.9).lineBetween(cx, top + 4, cx, bottom);
        g.fillStyle(colour, 0.9).fillTriangle(cx, top, cx - 3, top + 5, cx + 3, top + 5);
        break;
      case 'arrowDown':
        g.lineStyle(1, colour, 0.9).lineBetween(cx, top, cx, bottom - 4);
        g.fillStyle(colour, 0.9).fillTriangle(cx, bottom, cx - 3, bottom - 5, cx + 3, bottom - 5);
        break;
      case 'arc':
        g.lineStyle(1.5, colour, 0.9);
        g.beginPath();
        g.arc(cx, cy + 3, r * 1.8, Math.PI, Math.PI * 2, false);
        g.strokePath();
        break;
      case 'practiceLit':
        g.lineStyle(1, colour, 0.9).lineBetween(cx - r, cy, cx + r, cy).lineBetween(cx, cy - r, cx, cy + r);
        break;
      case 'practiceDark':
        g.lineStyle(1, colour, 0.9)
          .lineBetween(rect.x + 1, cy, cx - 2, top + 1)
          .lineBetween(cx - 2, top + 1, cx + 1, bottom - 1)
          .lineBetween(cx + 1, bottom - 1, rect.x + rect.width - 1, cy);
        break;
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
}

/** Turns a zone's static body on or off. A disabled body takes no part in collisions (Arcade skips it). */
function setZoneEnabled(zone: Phaser.GameObjects.Zone | null, enabled: boolean): void {
  if (!zone) return;
  (zone as unknown as { body: { enable: boolean } }).body.enable = enabled;
}
