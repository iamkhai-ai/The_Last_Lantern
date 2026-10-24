import type Phaser from 'phaser';
import { tr } from '../../../i18n/catalog.ts';
import type { DialogueLine, Interactable } from '../../../types/gameTypes';
import { SoundSystem } from '../../../systems/SoundSystem';
import type { HintLadder } from '../../core/hints';
import type { HudText, LevelLayout } from '../../core/level';
import { rectCenter, rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { pickUpLantern, placeLantern } from '../../core/lantern';
import { isMarkReadable } from '../../core/light';
import type { Footprint, LightMark, Room } from '../../core/light';
import type { PulseMark } from '../../core/pulse';
import type { LevelHost, V4LevelRuntime } from '../../scene/LevelHost';
import {
  CRANK_G1_ID,
  CRANK_G2_ID,
  DIAGRAM_ID,
  G1_CENTRE,
  G2_CENTRE,
  LATCH_A_ID,
  LATCH_B_ID,
  MOONLIT_CREEK,
  MOONLIT_LIGHT_MARKS,
  MOONLIT_PULSE_MARKS,
  MOONLIT_ROOMS,
  PEDESTAL_S_ID,
  RESTORE_A_ID,
  RESTORE_B_ID,
  STOP_ID,
  TEST_T_ID,
  VALVE_N_ID,
} from './moonlitCreekLayout';
import {
  INITIAL_CROSSINGS,
  MOONLIT_JOURNAL_TEXT,
  PRESENTATION_MS,
  defaultMoonlitState,
  deriveMoonlit,
  driveG1,
  driveG2,
  exitMissing,
  moonlitBlockers,
  moonlitHint,
  moonlitHud,
  parseMoonlitState,
  raySegmentStrip,
  raySegments,
  rayFootprints,
  restoreA,
  restoreB,
  settleTest,
  stepCrossings,
  stepLatch,
  stepStop,
  stepTest,
  toggleN,
} from './moonlitCreekLogic';
import type { CrossingLive, MoonlitState, MoonlitView, StepOutcome } from './moonlitCreekLogic';

/** Ambient darkness of the creek: constant, never tied to F (puzzle-contracts §1). */
const AMBIENT_DARKNESS = 0.42;

/** One-time events: the sample is recorded (coordination), and the mother's ending lines have played. */
const EVENT_SAMPLE = 'moonlit-creek-sample';
const EVENT_ENDING = 'moonlit-creek-ending';

/**
 * The mother's speaker id is in the catalogue's speaker labels but missing from the DialogueLine union. Cast here
 * until the union gains it (see the level report).
 */
const MOTHER = 'Mẹ' as DialogueLine['speaker'];

/** The ending lines (04 §4), quoted from the level doc. */
const ENDING_LINES: DialogueLine[] = [
  { speaker: MOTHER, text: 'Đèn bến sáng rồi, Nhinh. Mọi người đang gọi tên con đấy.' },
  { speaker: 'Lumo', text: 'Nhinh… nước bên này đang rút.' },
  { speaker: 'Nhinh', text: 'Lúc lấy mẫu, van hồi đã mở. Đường về chưa đứt… nhưng phần nước vẫn hụt.' },
  { speaker: MOTHER, text: 'Mẹ đang đưa những chuyến thuyền cuối vào bến. Con nói mẹ nghe bên đó thế nào.' },
  { speaker: 'Nhinh', text: 'Tôi cứ nghĩ nối lại được là sửa xong.' },
  { speaker: 'Lumo', text: 'Giờ cậu đã thấy cả bên này rồi.' },
];

const PROMPT_PLACE = 'E: đặt đèn lên bệ S';
const PROMPT_TAKE = 'E: lấy đèn từ bệ S';
const PROMPT_CRANK_G1 = 'E: quay tay G1';
const PROMPT_CRANK_G2 = 'E: quay tay G2';
const PROMPT_RESTORE_A = 'E: cần hồi A';
const PROMPT_RESTORE_B = 'E: cần hồi B';
const PROMPT_ENGAGE = 'E: gài chốt';
const PROMPT_RELEASE = 'E: nhả chốt';
const PROMPT_VALVE_OPEN = 'E: mở van N';
const PROMPT_VALVE_CLOSE = 'E: đóng van N';
const PROMPT_TEST = 'E: thử trạm T';
const PROMPT_SEE_RESULT = 'E: xem kết quả T';
const PROMPT_STOP = 'E: dừng trình bày';

const COLOR = {
  floor: 0x132a2e,
  ground: 0x1d3a3e,
  chasm: 0x05090c,
  wall: 0x2c3e40,
  deck: 0x6b7f3f,
  deckStub: 0x3a4a2a,
  pedestal: 0x8a7a55,
  mirror: 0xbfd9e0,
  mirrorAim: 0xffe08a,
  crank: 0x9c7b4a,
  crankLink: 0x4a5a5a,
  latch: 0xb08a4a,
  latchEngaged: 0xffe08a,
  valveOpen: 0x7fd6a9,
  valveShut: 0x4a4a4a,
  station: 0x6a5a8a,
  stationFed: 0xb9a4ff,
  board: 0x1b2a2e,
  barIdle: 0x3a4a4a,
  barRise: 0xffb866,
  barFall: 0x7db7ff,
  stop: 0xb0403a,
  ray: 0xfff0a8,
  markDark: 0x7df2d4,
  exit: 0x8a7a55,
};

/** The creek: two bridges fed by a mirror network from the pedestal S, latches and valve N on the East bank, and a test station T. */
export class MoonlitCreekLevel implements V4LevelRuntime<MoonlitState> {
  readonly id = 'moonlit-creek';
  readonly title = 'Con suối dưới trăng vỡ';
  readonly layout: LevelLayout = MOONLIT_CREEK;

  private host!: LevelHost;
  private state: MoonlitState = defaultMoonlitState();
  private items: Interactable[] = [];
  private deckAZone: Phaser.GameObjects.Zone | null = null;
  private deckBZone: Phaser.GameObjects.Zone | null = null;
  private statics: Phaser.GameObjects.Graphics[] = [];
  private decks: Phaser.GameObjects.Graphics | null = null;
  private fixtures: Phaser.GameObjects.Graphics | null = null;
  private rays: Phaser.GameObjects.Graphics | null = null;
  private marks: Phaser.GameObjects.Graphics | null = null;
  /** The bridges' walkable state, carried frame to frame. */
  private crossings: CrossingLive = INITIAL_CROSSINGS;
  /** Presentation time left, ms. Runtime only: a reload settles the test to safe. */
  private presentLeft = 0;
  /** Whether the foot was in the exit zone last frame, so the "what is missing" line shows once per entry. */
  private inExit = false;
  /** This frame's footprints, kept for the mark readability check. */
  private footprintsNow: readonly Footprint[] = [];
  /** The view drawn last frame, so sounds play only on a change. */
  private shown: MoonlitView | null = null;

  defaultState(): MoonlitState {
    return defaultMoonlitState();
  }

  parseState(raw: unknown): MoonlitState {
    return parseMoonlitState(raw);
  }

  build(host: LevelHost, state: MoonlitState): void {
    this.host = host;
    this.state = state;
    const scene = host.scene;
    const m = MOONLIT_CREEK;

    const floor = scene.add.graphics().setDepth(0);
    floor.fillStyle(COLOR.floor, 1).fillRect(m.world.x, m.world.y, m.world.width, m.world.height);
    floor.fillStyle(COLOR.ground, 1).fillRect(0, 0, 208, 360).fillRect(272, 0, 96, 360).fillRect(432, 0, 208, 360);

    const walls = scene.add.graphics().setDepth(1);
    walls.fillStyle(COLOR.wall, 1);
    for (const wall of m.walls) walls.fillRect(wall.x, wall.y, wall.width, wall.height);

    const chasm = scene.add.graphics().setDepth(0.5);
    chasm.fillStyle(COLOR.chasm, 1);
    for (const r of [m.chasmANorth, m.chasmASouth, m.chasmBNorth, m.chasmBSouth]) {
      chasm.fillRect(r.x, r.y, r.width, r.height);
    }

    const board = scene.add.graphics().setDepth(1.5);
    board.fillStyle(COLOR.board, 1).fillRect(m.board.x, m.board.y, m.board.width, m.board.height);
    this.statics.push(floor, walls, chasm, board);

    this.decks = scene.add.graphics().setDepth(1.6);
    this.fixtures = scene.add.graphics().setDepth(2);
    this.rays = scene.add.graphics().setDepth(2.5);
    this.marks = scene.add.graphics().setDepth(68.5);

    for (const wall of m.walls) this.solidZone(wall);
    for (const r of [m.chasmANorth, m.chasmASouth, m.chasmBNorth, m.chasmBSouth]) this.solidZone(r);
    for (const r of [m.pedestalS, m.mirrorG1, m.mirrorG2, m.crankG1, m.crankG2, m.restoreA, m.restoreB, m.latchA, m.latchB, m.valveN, m.testT, m.stop]) {
      this.solidZone(r);
    }
    this.deckAZone = this.solidZone(m.deckA);
    this.deckBZone = this.solidZone(m.deckB);

    const pedestal = m.pedestalS;
    this.items = [
      {
        id: PEDESTAL_S_ID,
        reach: { kind: 'block', rect: pedestal },
        getPrompt: () => (host.getLantern().location.at === 'hand' ? PROMPT_PLACE : PROMPT_TAKE),
        onInteract: () => this.onPedestal(),
      },
      {
        id: RESTORE_A_ID,
        reach: { kind: 'block', rect: m.restoreA },
        getPrompt: () => PROMPT_RESTORE_A,
        onInteract: () => this.apply(restoreA(this.state), true),
      },
      {
        id: CRANK_G1_ID,
        reach: { kind: 'block', rect: m.crankG1 },
        getPrompt: () => PROMPT_CRANK_G1,
        onInteract: () => this.apply(driveG1(this.state), true),
      },
      {
        id: CRANK_G2_ID,
        reach: { kind: 'block', rect: m.crankG2 },
        getPrompt: () => PROMPT_CRANK_G2,
        onInteract: () => this.apply(driveG2(this.state), true),
      },
      {
        id: RESTORE_B_ID,
        reach: { kind: 'block', rect: m.restoreB },
        getPrompt: () => PROMPT_RESTORE_B,
        onInteract: () => this.apply(restoreB(this.state), true),
      },
      {
        id: LATCH_A_ID,
        reach: { kind: 'block', rect: m.latchA },
        getPrompt: () => (this.state.latchA ? PROMPT_RELEASE : PROMPT_ENGAGE),
        onInteract: () => this.onLatch('A'),
      },
      {
        id: LATCH_B_ID,
        reach: { kind: 'block', rect: m.latchB },
        getPrompt: () => (this.state.latchB ? PROMPT_RELEASE : PROMPT_ENGAGE),
        onInteract: () => this.onLatch('B'),
      },
      {
        id: VALVE_N_ID,
        reach: { kind: 'block', rect: m.valveN },
        getPrompt: () => (this.state.nOpen ? PROMPT_VALVE_CLOSE : PROMPT_VALVE_OPEN),
        onInteract: () => this.apply(toggleN(this.state), true),
      },
      {
        id: TEST_T_ID,
        reach: { kind: 'block', rect: m.testT },
        getPrompt: () => (this.state.test === 'idle' ? PROMPT_TEST : PROMPT_SEE_RESULT),
        onInteract: () => this.onTest(),
      },
      {
        id: STOP_ID,
        reach: { kind: 'block', rect: m.stop },
        getPrompt: () => PROMPT_STOP,
        onInteract: () => this.apply(stepStop(this.state), false),
      },
    ];

    this.update(0, { x: 0, y: 0, width: 0, height: 0 }, []);
  }

  interactables(): Interactable[] {
    return this.items;
  }

  update(dt: number, foot: Rect, footprints: readonly Footprint[]): void {
    this.footprintsNow = footprints;
    let view = this.viewNow();

    // The presentation runs out on its own; loss of power or N closing ends it sooner (settleTest).
    if (this.state.test === 'running') this.presentLeft -= dt;
    const settled = settleTest(this.state, view, this.presentLeft <= 0);
    if (settled !== this.state) {
      this.state = settled;
      this.host.requestSave();
      view = this.viewNow();
    }

    const crossings = stepCrossings(this.crossings, view, foot);
    setZoneEnabled(this.deckAZone, !crossings.a);
    setZoneEnabled(this.deckBZone, !crossings.b);
    if (this.shown) {
      if (!this.shown.bridgeAOpen && view.bridgeAOpen) SoundSystem.playDoorOpen();
      else if (this.shown.bridgeAOpen && !view.bridgeAOpen) SoundSystem.playDoorClose();
      if (!this.shown.bridgeBOpen && view.bridgeBOpen) SoundSystem.playDoorOpen();
      else if (this.shown.bridgeBOpen && !view.bridgeBOpen) SoundSystem.playDoorClose();
    }
    this.crossings = crossings;
    this.shown = view;

    // Entering the exit with the exit not ready shows one line naming what is missing (RULE_GAMES §7).
    const inExit = rectsOverlap(foot, MOONLIT_CREEK.exitZone);
    if (inExit && !this.inExit) {
      const missing = exitMissing(this.state, this.host.getLantern().location.at === 'hand');
      if (missing !== null) this.host.toast(missing);
    }
    this.inExit = inExit;

    this.draw(view, crossings);
    this.drawMarks();
  }

  getState(): MoonlitState {
    return this.state;
  }

  hud(): HudText {
    return moonlitHud(this.state, this.viewNow(), this.host.getLantern(), tr);
  }

  hint(): HintLadder | null {
    return moonlitHint(this.state);
  }

  pulseMarks(): readonly PulseMark[] {
    return MOONLIT_PULSE_MARKS;
  }

  journalText(id: string): string {
    return MOONLIT_JOURNAL_TEXT[id] ?? '';
  }

  sealPosition(_sealId: string): Point | null {
    return null;
  }

  ambientDarkness(): number {
    return AMBIENT_DARKNESS;
  }

  lightBlockers(): readonly Rect[] {
    return moonlitBlockers();
  }

  lightMarks(): readonly LightMark[] {
    return MOONLIT_LIGHT_MARKS;
  }

  rooms(): readonly Room[] {
    return MOONLIT_ROOMS;
  }

  fixedFootprints(): readonly Footprint[] {
    return rayFootprints(this.state, this.viewNow());
  }

  lighting(): 'lantern' | 'none' {
    return 'lantern';
  }

  lanternAvailable(): boolean {
    return true;
  }

  exit(): { illustrations: string[]; nextLevelId: string | null } | null {
    // The demo's last level: the exit ends the demo and returns to the menu.
    return { illustrations: [], nextLevelId: null };
  }

  pedestalPosition(pedestalId: string): Point | null {
    return pedestalId === PEDESTAL_S_ID ? rectCenter(MOONLIT_CREEK.pedestalS) : null;
  }

  isExitReached(foot: Rect): boolean {
    if (!rectsOverlap(foot, MOONLIT_CREEK.exitZone)) return false;
    return exitMissing(this.state, this.host.getLantern().location.at === 'hand') === null;
  }

  destroy(): void {
    for (const graphics of this.statics) graphics.destroy();
    this.statics = [];
    this.decks?.destroy();
    this.fixtures?.destroy();
    this.rays?.destroy();
    this.marks?.destroy();
    this.decks = null;
    this.fixtures = null;
    this.rays = null;
    this.marks = null;
  }

  /** The view from the live lantern, recomputed on every read so a just-changed state is never stale. */
  private viewNow(): MoonlitView {
    return deriveMoonlit(this.state, this.host.getLantern());
  }

  /** Applies one E outcome: a changed state is saved, and the line says what happened or what is missing. */
  private apply(outcome: StepOutcome, sound: boolean): void {
    if (outcome.ok && outcome.state !== this.state) {
      this.state = outcome.state;
      this.host.requestSave();
      if (sound) SoundSystem.playMechanismLatch();
    }
    this.host.toast(outcome.message);
  }

  private onPedestal(): void {
    const lantern = this.host.getLantern();
    const next = placeLantern(lantern, PEDESTAL_S_ID) ?? pickUpLantern(lantern, PEDESTAL_S_ID);
    if (next) this.host.setLantern(next);
  }

  private onLatch(which: 'A' | 'B'): void {
    const view = this.viewNow();
    const live = which === 'A' ? view.bridgeALive : view.bridgeBLive;
    const inHand = this.host.getLantern().location.at === 'hand';
    this.apply(stepLatch(this.state, which, live, inHand), true);
  }

  private onTest(): void {
    const outcome = stepTest(this.state, this.viewNow());
    if (outcome.ok && outcome.state.test === 'running') {
      // The one sample: the presentation starts now, the coordination event is saved, and the ending plays once.
      this.presentLeft = PRESENTATION_MS;
      if (!this.host.hasEvent(EVENT_SAMPLE)) this.host.markEvent(EVENT_SAMPLE);
      if (!this.host.hasEvent(EVENT_ENDING)) {
        this.host.markEvent(EVENT_ENDING);
        this.host.say(ENDING_LINES);
      }
    }
    this.apply(outcome, false);
  }

  private draw(view: MoonlitView, crossings: CrossingLive): void {
    const m = MOONLIT_CREEK;
    const lantern = this.host.getLantern();

    this.decks?.clear();
    this.drawDeck(m.deckA, crossings.a);
    this.drawDeck(m.deckB, crossings.b);

    const f = this.fixtures;
    if (!f) return;
    f.clear();
    // Mirror links: a visible mechanical line from the island cranks to G1 and G2, drawn over the water.
    f.lineStyle(1, COLOR.crankLink, 0.9).lineBetween(rectCenter(m.crankG1).x, rectCenter(m.crankG1).y, G1_CENTRE.x, G1_CENTRE.y);
    f.lineStyle(1, COLOR.crankLink, 0.9).lineBetween(rectCenter(m.crankG2).x, rectCenter(m.crankG2).y, G2_CENTRE.x, G2_CENTRE.y);
    f.lineStyle(1, COLOR.latch, 0.7).lineBetween(rectCenter(m.latchA).x, rectCenter(m.latchA).y, m.deckA.x + m.deckA.width, m.deckA.y + m.deckA.height / 2);

    f.fillStyle(COLOR.pedestal, 1).fillRect(m.pedestalS.x, m.pedestalS.y, m.pedestalS.width, m.pedestalS.height);
    if (lantern.location.at === 'pedestal') {
      const c = rectCenter(m.pedestalS);
      f.fillStyle(lantern.on ? 0xfff0a8 : 0x3a4a4a, 1).fillCircle(c.x, c.y, 4);
    }
    this.drawMirror(m.mirrorG1, this.state.g1);
    this.drawMirror(m.mirrorG2, this.state.g2);
    f.fillStyle(COLOR.crank, 1);
    for (const r of [m.crankG1, m.crankG2, m.restoreA, m.restoreB]) f.fillRect(r.x, r.y, r.width, r.height);

    const latchA = m.latchA;
    const latchB = m.latchB;
    f.fillStyle(this.state.latchA ? COLOR.latchEngaged : COLOR.latch, 1).fillRect(latchA.x, latchA.y, latchA.width, latchA.height);
    f.fillStyle(this.state.latchB ? COLOR.latchEngaged : COLOR.latch, 1).fillRect(latchB.x, latchB.y, latchB.width, latchB.height);

    const v = m.valveN;
    f.fillStyle(this.state.nOpen ? COLOR.valveOpen : COLOR.valveShut, 1).fillRect(v.x, v.y, v.width, v.height);

    const t = m.testT;
    f.fillStyle(view.testFed ? COLOR.stationFed : COLOR.station, 1).fillRect(t.x, t.y, t.width, t.height);
    f.fillStyle(COLOR.stop, 1).fillRect(m.stop.x, m.stop.y, m.stop.width, m.stop.height);
    this.drawBoard();

    this.rays?.clear();
    for (const seg of raySegments(this.state, view)) {
      this.rays?.fillStyle(COLOR.ray, 0.45).fillPoints(raySegmentStrip(seg), true, true);
    }

    // The exit steps: a plain stone stair toward the tower, always visible.
    f.fillStyle(COLOR.exit, 1).fillRect(m.exitZone.x, m.exitZone.y, m.exitZone.width, m.exitZone.height);
  }

  private drawDeck(deck: Rect, walkable: boolean): void {
    const g = this.decks;
    if (!g) return;
    if (walkable) {
      g.fillStyle(COLOR.deck, 1).fillRect(deck.x, deck.y, deck.width, deck.height);
    } else {
      // Retracted stubs at each bank: the deck is not there while it is closed.
      g.fillStyle(COLOR.deckStub, 1).fillRect(deck.x, deck.y, 6, deck.height);
      g.fillStyle(COLOR.deckStub, 1).fillRect(deck.x + deck.width - 6, deck.y, 6, deck.height);
    }
  }

  /** A mirror with its aim: a bright line across the block, toward the bridge or G2 it aims at. */
  private drawMirror(rect: Rect, aim: 'A' | 'G2' | 'B' | 'T'): void {
    const f = this.fixtures;
    if (!f) return;
    f.fillStyle(COLOR.mirror, 1).fillRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);
    const c = rectCenter(rect);
    const target = aim === 'A' ? MOONLIT_CREEK.eyeA : aim === 'B' ? MOONLIT_CREEK.eyeB : aim === 'T' ? MOONLIT_CREEK.eyeT : G2_CENTRE;
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    f.lineStyle(2, COLOR.mirrorAim, 0.9).lineBetween(c.x - (dx / len) * 6, c.y - (dy / len) * 6, c.x + (dx / len) * 6, c.y + (dy / len) * 6);
  }

  /** The presentation board: idle grey bars; running or safe, Bến rises and Rễ falls, with the catch shown when safe. */
  private drawBoard(): void {
    const f = this.fixtures;
    if (!f) return;
    const b = MOONLIT_CREEK.board;
    const shown = this.state.test;
    const ben = shown === 'idle' ? COLOR.barIdle : COLOR.barRise;
    const re = shown === 'idle' ? COLOR.barIdle : COLOR.barFall;
    f.fillStyle(ben, 1).fillRect(b.x + 4, b.y + 4, 10, 14);
    f.fillStyle(re, 1).fillRect(b.x + 20, b.y + 8, 10, 10);
    if (shown === 'safe') f.fillStyle(COLOR.latchEngaged, 1).fillRect(b.x + 28, b.y + 2, 3, 4);
  }

  /**
   * The light marks: a dark mark shows as speckles while it is readable. A mark that is not readable but already in
   * the journal leaves a faint outline.
   */
  private drawMarks(): void {
    const g = this.marks;
    if (!g) return;
    g.clear();
    const blockers = this.lightBlockers();
    for (const mark of MOONLIT_LIGHT_MARKS) {
      const { x, y, width, height } = mark.rect;
      if (isMarkReadable(mark, this.footprintsNow, blockers)) {
        g.fillStyle(COLOR.markDark, 0.9);
        for (const p of [
          { x: x + width / 2, y: y + height / 2 },
          { x: x + width / 4, y: y + height / 4 },
          { x: x + (3 * width) / 4, y: y + height / 4 },
          { x: x + width / 4, y: y + (3 * height) / 4 },
          { x: x + (3 * width) / 4, y: y + (3 * height) / 4 },
        ]) {
          g.fillCircle(p.x, p.y, 1.2);
        }
      } else if (this.host.hasJournal(mark.id)) {
        g.lineStyle(1, COLOR.markDark, 0.25).strokeRect(x, y, width, height);
      }
    }
    // The diagram stays faintly visible once Pulse has found it.
    if (this.host.hasJournal(DIAGRAM_ID)) {
      const d = MOONLIT_CREEK.diagram;
      g.lineStyle(1, COLOR.markDark, 0.35).strokeCircle(d.x, d.y, 5);
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
}

/** Turns a zone's static body on or off. A disabled body takes no part in collisions (Arcade skips it). */
function setZoneEnabled(zone: Phaser.GameObjects.Zone | null, enabled: boolean): void {
  if (!zone) return;
  (zone as unknown as { body: { enable: boolean } }).body.enable = enabled;
}

