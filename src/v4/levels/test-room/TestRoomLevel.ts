import type Phaser from 'phaser';
import { tr } from '../../../i18n/catalog.ts';
import type { Interactable } from '../../../types/gameTypes';
import type { LanternLightingProfile } from '../../../systems/LanternSystem';
import { SoundSystem } from '../../../systems/SoundSystem';
import type { HintLadder } from '../../core/hints';
import type { HudText, LevelLayout } from '../../core/level';
import { rectCenter, rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { setFixedLatch } from '../../core/latch';
import { pickUpLantern, placeLantern } from '../../core/lantern';
import { callLumo, recallLumo } from '../../core/lumo';
import type { PulseMark } from '../../core/pulse';
import type { LevelHost, V4LevelRuntime } from '../../scene/LevelHost';
import { CARVING_ID, LATCH_ID, MARKER_ID, PEDESTAL_ID, SEAL_ID, TEST_ROOM } from './testRoomLayout';
import {
  CARVING_JOURNAL_TEXT,
  defaultTestRoomState,
  deriveTestRoom,
  parseTestRoomState,
  testRoomHint,
  testRoomHud,
} from './testRoomLogic';
import type { TestRoomState, TestRoomView } from './testRoomLogic';

const PROMPT_PLACE = 'E: đặt đèn';
const PROMPT_TAKE = 'E: lấy đèn';
const PROMPT_ENGAGE = 'E: gài chốt A';
const PROMPT_RELEASE = 'E: mở chốt A';
const PROMPT_SEND = 'E: gửi Lumo tới ấn';
const PROMPT_RECALL = 'E: gọi Lumo về';
const TOAST_LATCH_REFUSED = 'Chốt chỉ gài được khi cửa đang mở.';

const COLOR = {
  floor: 0x14262b,
  wall: 0x2c3e40,
  door: 0x6b5a3a,
  pedestal: 0x8a7a55,
  latch: 0xb08a4a,
  latchEngaged: 0xffe08a,
  marker: 0x4fb3a9,
  lanternOn: 0xfff0a8,
  lanternOff: 0x3a4a4a,
  carving: 0xd8b869,
};

/**
 * The test room: one room split by door A, a pedestal that powers the door, a latch that keeps it open,
 * and gate B, which only Lumo holding the seal opens. Drawn with Graphics; solids are static zones.
 */
export class TestRoomLevel implements V4LevelRuntime<TestRoomState> {
  readonly id = 'test-room';
  readonly title = 'Phòng thử';
  readonly layout: LevelLayout = TEST_ROOM;

  private host!: LevelHost;
  private state: TestRoomState = defaultTestRoomState();
  private items: Interactable[] = [];
  private leafA: Phaser.GameObjects.Zone | null = null;
  private leafB: Phaser.GameObjects.Zone | null = null;
  private leaves: Phaser.GameObjects.Graphics | null = null;
  private fixtures: Phaser.GameObjects.Graphics | null = null;
  private carving: Phaser.GameObjects.Graphics | null = null;
  private statics: Phaser.GameObjects.Graphics[] = [];
  /** The view drawn last frame, so door and gate sounds play only on a change. */
  private shown: TestRoomView | null = null;

  defaultState(): TestRoomState {
    return defaultTestRoomState();
  }

  parseState(raw: unknown): TestRoomState {
    return parseTestRoomState(raw);
  }

  build(host: LevelHost, state: TestRoomState): void {
    this.host = host;
    this.state = state;
    const scene = host.scene;
    const world = TEST_ROOM.world;

    const floor = scene.add.graphics().setDepth(0);
    floor.fillStyle(COLOR.floor, 1).fillRect(world.x, world.y, world.width, world.height);

    const walls = scene.add.graphics().setDepth(1);
    walls.fillStyle(COLOR.wall, 1);
    for (const wall of TEST_ROOM.walls) walls.fillRect(wall.x, wall.y, wall.width, wall.height);
    const { pedestal, latchA, marker } = TEST_ROOM;
    walls.fillStyle(COLOR.pedestal, 1).fillRect(pedestal.x, pedestal.y, pedestal.width, pedestal.height);
    walls.fillStyle(COLOR.latch, 1).fillRect(latchA.x, latchA.y, latchA.width, latchA.height);
    walls.fillStyle(COLOR.marker, 1).fillRect(marker.x, marker.y, marker.width, marker.height);
    this.statics.push(floor, walls);

    const seal = scene.add.graphics().setDepth(2);
    seal.lineStyle(1.5, COLOR.marker, 0.85).strokeCircle(TEST_ROOM.seal.x, TEST_ROOM.seal.y, 6);
    this.statics.push(seal);

    // The carving is faint and shows only once it is in the journal.
    const { x: cx, y: cy } = TEST_ROOM.carving;
    this.carving = scene.add.graphics().setDepth(2).setVisible(false);
    this.carving.lineStyle(1, COLOR.carving, 0.55);
    this.carving.lineBetween(cx - 10, cy + 2, cx + 6, cy - 3);
    this.carving.lineBetween(cx + 6, cy - 3, cx + 12, cy + 4);

    this.fixtures = scene.add.graphics().setDepth(3);
    this.leaves = scene.add.graphics().setDepth(4);

    // Solids: the walls, the fixed pieces, and the two leaves, which follow the derived view.
    for (const wall of TEST_ROOM.walls) this.solidZone(wall);
    this.solidZone(pedestal);
    this.solidZone(latchA);
    this.solidZone(marker);
    this.leafA = this.solidZone(TEST_ROOM.doorA);
    this.leafB = this.solidZone(TEST_ROOM.gateB);

    this.items = [
      {
        id: PEDESTAL_ID,
        reach: { kind: 'block', rect: pedestal },
        getPrompt: () => (host.getLantern().location.at === 'hand' ? PROMPT_PLACE : PROMPT_TAKE),
        onInteract: () => this.onPedestal(),
      },
      {
        id: LATCH_ID,
        reach: { kind: 'block', rect: latchA },
        getPrompt: () => (this.state.latchA ? PROMPT_RELEASE : PROMPT_ENGAGE),
        onInteract: () => this.onLatch(),
      },
      {
        id: MARKER_ID,
        reach: { kind: 'block', rect: marker },
        getPrompt: () => (host.getLumo().mode === 'follow' ? PROMPT_SEND : PROMPT_RECALL),
        onInteract: () => this.onMarker(),
      },
    ];

    this.update(0, { x: 0, y: 0, width: 0, height: 0 });
  }

  interactables(): Interactable[] {
    return this.items;
  }

  update(_dt: number, _foot: Rect): void {
    const view = this.viewNow();
    setZoneEnabled(this.leafA, !view.doorAOpen);
    setZoneEnabled(this.leafB, !view.gateBOpen);
    if (this.shown) {
      if (!this.shown.doorAOpen && view.doorAOpen) SoundSystem.playDoorOpen();
      else if (this.shown.doorAOpen && !view.doorAOpen) SoundSystem.playDoorClose();
      if (!this.shown.gateBOpen && view.gateBOpen) SoundSystem.playGateOpen();
    }
    this.shown = view;
    this.draw(view);
  }

  getState(): TestRoomState {
    return this.state;
  }

  hud(): HudText {
    return testRoomHud(this.viewNow(), this.host.getLantern(), this.host.getLumo(), tr);
  }

  hint(): HintLadder | null {
    return testRoomHint(this.viewNow());
  }

  pulseMarks(): readonly PulseMark[] {
    return [TEST_ROOM.carving];
  }

  journalText(id: string): string {
    return id === CARVING_ID ? CARVING_JOURNAL_TEXT : '';
  }

  sealPosition(sealId: string): Point | null {
    return sealId === SEAL_ID ? { x: TEST_ROOM.seal.x, y: TEST_ROOM.seal.y } : null;
  }

  lanternLightProfile(): LanternLightingProfile | undefined {
    return undefined;
  }

  lighting(): 'lantern' | 'none' {
    return 'lantern';
  }

  lanternAvailable(): boolean {
    return true;
  }

  exit(): { illustrations: string[]; nextLevelId: string | null } | null {
    return null;
  }

  pedestalPosition(pedestalId: string): Point | null {
    return pedestalId === PEDESTAL_ID ? rectCenter(TEST_ROOM.pedestal) : null;
  }

  isExitReached(foot: Rect): boolean {
    return this.viewNow().stage === 'done' && rectsOverlap(foot, TEST_ROOM.exitZone);
  }

  destroy(): void {
    for (const graphics of this.statics) graphics.destroy();
    this.statics = [];
    this.leaves?.destroy();
    this.fixtures?.destroy();
    this.carving?.destroy();
    this.leaves = null;
    this.fixtures = null;
    this.carving = null;
  }

  /** The view from the live lantern and Lumo, recomputed on every read so a just-changed state is never stale. */
  private viewNow(): TestRoomView {
    return deriveTestRoom(this.state, this.host.getLantern(), this.host.getLumo());
  }

  private onPedestal(): void {
    const lantern = this.host.getLantern();
    const next = placeLantern(lantern, PEDESTAL_ID) ?? pickUpLantern(lantern, PEDESTAL_ID);
    if (next) this.host.setLantern(next);
  }

  private onLatch(): void {
    // Engaging needs the door open right now; releasing is always allowed (puzzle-contracts section 1, RULE_GAMES 7).
    const next = setFixedLatch(this.state.latchA, !this.state.latchA, this.viewNow().doorALive);
    if (next === null) {
      this.host.toast(TOAST_LATCH_REFUSED);
      return;
    }
    this.state = { latchA: next };
    SoundSystem.playMechanismLatch();
    this.host.requestSave();
  }

  private onMarker(): void {
    const lumo = this.host.getLumo();
    this.host.setLumo(lumo.mode === 'follow' ? callLumo(lumo, SEAL_ID) : recallLumo(lumo));
  }

  private draw(view: TestRoomView): void {
    const lantern = this.host.getLantern();
    this.leaves?.clear();
    if (!view.doorAOpen) this.fillRect(this.leaves, TEST_ROOM.doorA, COLOR.door);
    if (!view.gateBOpen) this.fillRect(this.leaves, TEST_ROOM.gateB, COLOR.door);

    this.fixtures?.clear();
    if (this.state.latchA) {
      const latch = TEST_ROOM.latchA;
      this.fillRect(this.fixtures, { x: latch.x + 4, y: latch.y + 4, width: latch.width - 8, height: latch.height - 8 }, COLOR.latchEngaged);
    }
    if (lantern.location.at === 'pedestal') {
      const c = rectCenter(TEST_ROOM.pedestal);
      this.fixtures?.fillStyle(lantern.on ? COLOR.lanternOn : COLOR.lanternOff, 1).fillCircle(c.x, c.y, 4);
    }
    this.carving?.setVisible(this.host.hasJournal(CARVING_ID));
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
