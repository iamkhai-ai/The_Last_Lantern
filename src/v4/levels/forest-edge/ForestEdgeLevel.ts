import type Phaser from 'phaser';
import { tr } from '../../../i18n/catalog.ts';
import type { Interactable } from '../../../types/gameTypes';
import { SoundSystem } from '../../../systems/SoundSystem';
import type { HintLadder } from '../../core/hints';
import type { HudText, LevelLayout } from '../../core/level';
import { rectCenter } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { isMarkReadable, isRectLit } from '../../core/light';
import type { Footprint, LightMark, Room } from '../../core/light';
import { lanternFeeds } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import type { PulseMark } from '../../core/pulse';
import type { LevelHost, V4LevelRuntime } from '../../scene/LevelHost';
import {
  BRACE_B_ID,
  FOREST_EDGE,
  FOREST_EDGE_LIGHT_MARKS,
  FOREST_EDGE_PULSE_MARKS,
  FOREST_EDGE_ROOMS,
  HINGE_ID,
  LAMP_REST_ID,
  LAMP_REST_REACH,
  LATCH_A_ID,
  LATCH_TOOL_ID,
  LINE_S1_A_ID,
  S1_ID,
  S2_ID,
  SPROUT_ID,
} from './forestEdgeLayout';
import {
  AGREEMENT_JOURNAL_ID,
  CUE_EVENT,
  CUE_LINES,
  FOREST_EDGE_JOURNAL_TEXT,
  HINGE_PHASES,
  INITIAL_FOREST_LIVE,
  LAMP_TAKEN_EVENT,
  defaultForestEdgeState,
  deriveForestEdge,
  forestBlockers,
  forestEdgeFocus,
  forestEdgeHint,
  forestEdgeHud,
  forestExitReady,
  lampOnGround,
  lanternAtPedestal,
  nextHingePhase,
  parseForestEdgeState,
  pendingCue,
  stepDoors,
  takeLampFromRest,
  toggleBraceB,
  toggleLatchA,
} from './forestEdgeLogic';
import type { ForestEdgeLive, ForestEdgeState, ForestEdgeView } from './forestEdgeLogic';
import { ART_SLOTS, artKey, forestArtReady, preloadForestArt } from './forestEdgeArt';
import type { ArtSlot } from './forestEdgeArt';
import { FOREST_EDGE_TUTORIAL } from './forestEdgeTutorial';
import type { TutorialStep } from '../../core/tutorial';

/** The art textures each slot can show, by the state that picks them (asset-map.json). */
const HINGE_TEXTURES = ['hinge-closed', 'hinge-pulled', 'hinge-hooked'] as const;
/** The texture for a hinge phase's pose. */
const hingeTexture = (phase: number): string => `hinge-${HINGE_PHASES[phase].pose}`;

/** The level's ambient darkness: constant, never tied to the lantern (puzzle-contracts section 1). */
const AMBIENT_DARKNESS = 0.88;
/**
 * A live eye (its socket feeds its door) is drawn above the darkness (68) with a warm breathing glow, so the feed reads
 * at night; a dormant eye stays under it. Like the marks at 68.5, it is art the level shows on purpose.
 */
const EYE_LIVE_DEPTH = 68.6;
const EYE_GLOW_RADIUS = 20;
/** Radius of the gradient in the light_radial texture, px. */
const LIGHT_RADIAL_RADIUS = 126;
const EYE_GLOW_ALPHA_MIN = 0.35;
const EYE_GLOW_ALPHA_SPAN = 0.25;
const EYE_GLOW_PERIOD_MS = 1400;
/**
 * The old tree's crown is drawn over Nhinh (above every y-sorted depth, below the darkness) and fades to this alpha
 * while it covers her, at this rate per ms (asset-map.json: canopy).
 */
const CANOPY_DEPTH = 60;
const CANOPY_FADED_ALPHA = 0.35;
const CANOPY_FADE_PER_MS = 0.004;
/** Heights above the foot centre sampled for the crown covering Nhinh, px (feet to hood). */
const CANOPY_SAMPLES = [0, 12, 24, 34];
/** A Pulse fired within this distance of the stele lights it for this long. */
const STELE_PULSE_REACH = 48;
const STELE_PULSE_MS = 1000;
/** The route badge painted on the water column (water-column.png), in game px: lit with a warm glow for the ending. */
const ROUTE_BADGE = { x: 576, y: 66 } as const;
const ROUTE_BADGE_GLOW_RADIUS = 14;
/**
 * Door A's leaf shutting (asset-map.json: animation.doorA): each frame with the scene time since the leaf closed at which
 * it ends; the closed texture holds after the last.
 */
const DOOR_A_CLOSING = [
  { texture: 'door-a-closing-1', until: 65 },
  { texture: 'door-a-closing-2', until: 110 },
] as const;
/** Nhinh wakes against the old tree on a new game (asset-map.json: animation.waking), once. */
const WAKE_EVENT = 'forest-edge:woke';
const WAKE_FRAMES = [
  { texture: 'nhinh-sleeping', ms: 450 },
  { texture: 'nhinh-awake', ms: 300 },
  { texture: 'nhinh-rising', ms: 180 },
] as const;

/**
 * Depth of an upright prop: it sorts by its base line like Nhinh (Player: depth 10 + ground y / 10), so she passes
 * behind it when her feet are north of its base. Flat art (the yard, the doors and eyes set in the walls) stays below her.
 */
function uprightDepth(slot: keyof typeof ART_SLOTS): number {
  return 10 + ART_SLOTS[slot].position.y / 10;
}

/** The next level. Level 02 is not built yet on this branch; the host shows the placeholder for the id. */
const NEXT_LEVEL_ID = 'whispering-woods';

const COLOR = {
  floor: 0x14262b,
  yardFloor: 0x1a3236,
  wall: 0x2c3e40,
  door: 0x6b5a3a,
  pedestal: 0x8a7a55,
  pedestalSocket: 0x4c4330,
  latch: 0xb08a4a,
  latchEngaged: 0xffe08a,
  brace: 0x8a6a3a,
  braceEngaged: 0xffe08a,
  stele: 0x59666a,
  hinge: 0x7a6a4a,
  lanternOn: 0xfff0a8,
  lanternOff: 0x3a4a4a,
  sprout: 0x9be36a,
  markDark: 0x7df2d4,
  markLit: 0xffe08a,
  line: 0xd8b869,
};

const PROMPT_PLACE_S1 = 'E: đặt đèn lên bệ S1';
const PROMPT_PLACE_S2 = 'E: đặt đèn lên bệ S2';
const PROMPT_TAKE = 'E: lấy đèn';
const PROMPT_ENGAGE_A = 'E: gài chốt A';
const PROMPT_RELEASE_A = 'E: mở chốt A';
const PROMPT_ENGAGE_B = 'E: gài tay hãm B';
const PROMPT_RELEASE_B = 'E: nhả tay hãm B';
const PROMPT_TAKE_LAMP = 'E: nhặt đèn';
const PROMPT_LAMP_BY_STELE = 'E: đèn đang ở bên bia';

/**
 * Forest edge (level 01): an entry yard with pedestal S1, door A in the split wall, a middle yard with latch A, pedestal
 * S2 and brace B, and gate B to the exit. Drawn with Graphics; solids are static zones.
 */
export class ForestEdgeLevel implements V4LevelRuntime<ForestEdgeState> {
  readonly id = 'forest-edge';
  readonly title = 'Bìa rừng quên lãng';
  readonly layout: LevelLayout = FOREST_EDGE;

  private host!: LevelHost;
  private state: ForestEdgeState = defaultForestEdgeState();
  /** Door A and gate B as they stood last frame; stepDoors carries the bridge rule. */
  private live: ForestEdgeLive = INITIAL_FOREST_LIVE;
  /** The optional hinge model's phase: pull, release, hook. Cosmetic; not saved and never required. */
  private hingePhase = 0;
  /** True while a one-time dialogue cue is on screen. The exit waits for it. */
  private speaking = false;
  /** Off during build's first draw, so no cue starts while the scene is still being made. */
  private cuesEnabled = false;
  private items: Interactable[] = [];
  private leafA: Phaser.GameObjects.Zone | null = null;
  private leafB: Phaser.GameObjects.Zone | null = null;
  private leaves: Phaser.GameObjects.Graphics | null = null;
  private fixtures: Phaser.GameObjects.Graphics | null = null;
  private marks: Phaser.GameObjects.Graphics | null = null;
  private statics: Phaser.GameObjects.Graphics[] = [];
  /** The view and live doors drawn last frame, so door and gate sounds play only on a change. */
  private shown: ForestEdgeLive | null = null;
  /** This frame's footprints, kept for the mark readability check. */
  private footprintsNow: readonly Footprint[] = [];
  /** Whether the level 01 art is loaded. When it is, the placeholder fills are hidden and the sprites are drawn. */
  private artOn = false;
  /** The art sprites by slot, then by texture. Each slot shows one texture, picked from the state every frame. */
  private artImages: Record<string, Record<string, Phaser.GameObjects.Image>> = {};
  /** The warm glow behind each live eye (light_radial, additive), by slot. */
  private eyeGlows: Record<string, Phaser.GameObjects.Image> = {};
  /** The foot body this frame, for the canopy fade. */
  private footNow: Rect | null = null;
  /** Scene time until which the stele shows its Pulse glow. */
  private stelePulseUntil = 0;
  /** Scene time door A last went from open to closed; the closing frames play from it. */
  private doorAClosedAt = Number.NEGATIVE_INFINITY;
  /** The warm glow on the column's route badge, shown from the ending on. */
  private badgeGlow: Phaser.GameObjects.Image | null = null;

  /** Loads the level 01 art (asset-map.json). The host calls this before any build. */
  preload(scene: Phaser.Scene): void {
    preloadForestArt(scene);
  }

  defaultState(): ForestEdgeState {
    return defaultForestEdgeState();
  }

  parseState(raw: unknown): ForestEdgeState {
    return parseForestEdgeState(raw);
  }

  build(host: LevelHost, state: ForestEdgeState): void {
    this.host = host;
    this.state = state;
    this.live = INITIAL_FOREST_LIVE;
    const scene = host.scene;
    const world = FOREST_EDGE.world;

    const floor = scene.add.graphics().setDepth(0);
    floor.fillStyle(COLOR.floor, 1).fillRect(world.x, world.y, world.width, world.height);
    const yards = scene.add.graphics().setDepth(0.2);
    for (const room of FOREST_EDGE_ROOMS) {
      yards.fillStyle(COLOR.yardFloor, 1).fillRect(room.rect.x, room.rect.y, room.rect.width, room.rect.height);
    }

    const walls = scene.add.graphics().setDepth(1);
    walls.fillStyle(COLOR.wall, 1);
    for (const wall of FOREST_EDGE.walls) walls.fillRect(wall.x, wall.y, wall.width, wall.height);
    walls.fillStyle(COLOR.wall, 0.6);
    for (const rect of FOREST_EDGE.foliage) walls.fillRect(rect.x, rect.y, rect.width, rect.height);
    const { stele, hinge, s1, s2, latchA, braceB } = FOREST_EDGE;
    walls.fillStyle(COLOR.stele, 1).fillRect(stele.x, stele.y, stele.width, stele.height);
    walls.fillStyle(COLOR.hinge, 1).fillRect(hinge.x, hinge.y, hinge.width, hinge.height);
    walls.fillStyle(COLOR.pedestal, 1).fillRect(s1.x, s1.y, s1.width, s1.height);
    walls.fillStyle(COLOR.pedestal, 1).fillRect(s2.x, s2.y, s2.width, s2.height);
    walls.fillStyle(COLOR.latch, 1).fillRect(latchA.x, latchA.y, latchA.width, latchA.height);
    walls.fillStyle(COLOR.brace, 1).fillRect(braceB.x, braceB.y, braceB.width, braceB.height);
    this.statics.push(floor, yards, walls);

    this.leaves = scene.add.graphics().setDepth(4);
    this.fixtures = scene.add.graphics().setDepth(3);
    this.marks = scene.add.graphics().setDepth(68.5);

    // Solids: walls, the stone, pedestals, latch, brace and hinge are always solid; the two leaves follow the doors.
    for (const wall of FOREST_EDGE.walls) this.solidZone(wall);
    for (const rect of FOREST_EDGE.foliage) this.solidZone(rect);
    this.solidZone(stele);
    this.solidZone(hinge);
    this.solidZone(s1);
    this.solidZone(s2);
    this.solidZone(latchA);
    this.solidZone(braceB);
    this.leafA = this.solidZone(FOREST_EDGE.doorA);
    this.leafB = this.solidZone(FOREST_EDGE.gateB);

    this.items = [
      {
        id: S1_ID,
        reach: { kind: 'block', rect: s1 },
        getPrompt: () => this.pedestalPrompt(S1_ID),
        onInteract: () => this.onPedestal(S1_ID),
      },
      {
        id: LATCH_A_ID,
        reach: { kind: 'block', rect: latchA },
        getPrompt: () => (this.state.latchA ? PROMPT_RELEASE_A : PROMPT_ENGAGE_A),
        onInteract: () => this.onLatchA(),
      },
      {
        id: S2_ID,
        reach: { kind: 'block', rect: s2 },
        getPrompt: () => this.pedestalPrompt(S2_ID),
        onInteract: () => this.onPedestal(S2_ID),
      },
      {
        id: BRACE_B_ID,
        reach: { kind: 'block', rect: braceB },
        getPrompt: () => (this.state.braceB ? PROMPT_RELEASE_B : PROMPT_ENGAGE_B),
        onInteract: () => this.onBraceB(),
      },
      {
        id: HINGE_ID,
        reach: { kind: 'block', rect: hinge },
        getPrompt: () => HINGE_PHASES[this.hingePhase].prompt,
        onInteract: () => this.onHinge(),
      },
      {
        id: LAMP_REST_ID,
        reach: { kind: 'floor', rect: LAMP_REST_REACH },
        getPrompt: () => this.lampPrompt(),
        onInteract: () => this.onLampRest(),
      },
    ];

    // The lamp rests on the ground by the stele until the player takes it once (decision b, layout v3).
    if (!host.hasEvent(LAMP_TAKEN_EVENT)) host.setLantern(lampOnGround());
    this.artOn = forestArtReady(scene);
    if (this.artOn) {
      for (const graphics of this.statics) graphics.setVisible(false);
      this.leaves?.setVisible(false);
      this.fixtures?.setVisible(false);
      this.buildArt(scene);
    }
    this.update(0, { x: 0, y: 0, width: 0, height: 0 }, []);
    this.cuesEnabled = true;
  }

  interactables(): Interactable[] {
    return this.items;
  }

  update(dt: number, foot: Rect, footprints: readonly Footprint[]): void {
    this.footNow = foot;
    this.fadeCanopy(dt);
    const lantern = this.host.getLantern();
    const live = stepDoors(this.live, this.state, lantern, foot);
    this.live = live;
    this.footprintsNow = footprints;
    const blockers = forestBlockers(live);

    setZoneEnabled(this.leafA, !live.doorAOpen);
    setZoneEnabled(this.leafB, !live.gateBOpen);
    if (this.shown) {
      if (!this.shown.doorAOpen && live.doorAOpen) SoundSystem.playDoorOpen();
      else if (this.shown.doorAOpen && !live.doorAOpen) {
        SoundSystem.playDoorClose();
        this.doorAClosedAt = this.host.scene.time.now;
      }
      if (!this.shown.gateBOpen && live.gateBOpen) SoundSystem.playGateOpen();
    }
    this.shown = live;

    if (this.cuesEnabled && !this.speaking) {
      const sprout = FOREST_EDGE_LIGHT_MARKS.find((mark) => mark.id === SPROUT_ID);
      const sproutLit = sprout !== undefined && isMarkReadable(sprout, footprints, blockers);
      const cue = pendingCue({
        hasEvent: (id) => this.host.hasEvent(id),
        sproutLit,
        live,
        lantern,
        foot,
      });
      if (cue) {
        this.host.markEvent(CUE_EVENT[cue]);
        // The deal is written down as it starts, so a skipped line or a reload still keeps who Lumo is and the trade.
        if (cue === 'agreement') this.host.addJournal(AGREEMENT_JOURNAL_ID);
        this.speaking = true;
        this.host.say([...CUE_LINES[cue]], () => {
          this.speaking = false;
        });
      }
    }

    this.draw(live, lantern, footprints, blockers);
    this.drawMarks(blockers);
    this.drawArt(live, lantern);
  }

  /** One image per slot and texture. Only the texture the state picks is shown; see drawArt. */
  private buildArt(scene: Phaser.Scene): void {
    const add = (slot: keyof typeof ART_SLOTS, textures: readonly string[], depth: number) => {
      const s: ArtSlot = ART_SLOTS[slot];
      this.artImages[slot] = {};
      for (const texture of textures) {
        this.artImages[slot][texture] = scene.add
          .image(s.position.x, s.position.y, artKey(texture))
          .setOrigin(s.anchor[0] / s.gameSize[0], s.anchor[1] / s.gameSize[1])
          .setScale(0.5)
          .setDepth(depth)
          .setVisible(false);
      }
    };
    add('background', ['station-yard'], 0);
    add('column', ['water-column'], uprightDepth('column'));
    add('stele', ['stele-normal', 'stele-pulse'], uprightDepth('stele'));
    add('dryChannel', ['dry-channel'], 0.5);
    add('linkages', ['mechanical-linkages'], 0.5);
    add('canopy', ['canopy'], CANOPY_DEPTH);
    this.badgeGlow = scene.add
      .image(ROUTE_BADGE.x, ROUTE_BADGE.y, 'light_radial')
      .setScale(ROUTE_BADGE_GLOW_RADIUS / LIGHT_RADIAL_RADIUS)
      .setBlendMode('ADD')
      .setDepth(EYE_LIVE_DEPTH - 0.05)
      .setVisible(false);
    add('hinge', HINGE_TEXTURES, uprightDepth('hinge'));
    add('s1', ['socket-empty', 'socket-lamp-off', 'socket-lamp-on'], uprightDepth('s1'));
    add('s2', ['socket-empty', 'socket-lamp-off', 'socket-lamp-on'], uprightDepth('s2'));
    add('eyeA', ['eye-dormant', 'eye-live'], 2);
    add('eyeB', ['eye-dormant', 'eye-live'], 2);
    // The carved lines and the tool marks: a hidden line stays under the darkness; a line Pulse found, a live line and
    // the found tool marks are drawn above it, like the eyes.
    add('s1ToA', ['s1ToA-hidden', 's1ToA-revealed', 's1ToA-live'], 1);
    add('s2ToB', ['s2ToB-hidden', 's2ToB-live'], 1);
    add('latchTool', ['latch-tool-marks'], EYE_LIVE_DEPTH);
    for (const [slot, texture] of [['s1ToA', 's1ToA-revealed'], ['s1ToA', 's1ToA-live'], ['s2ToB', 's2ToB-live']] as const) {
      this.artImages[slot][texture].setDepth(EYE_LIVE_DEPTH);
    }
    for (const slot of ['eyeA', 'eyeB'] as const) {
      this.artImages[slot]['eye-live'].setDepth(EYE_LIVE_DEPTH);
      const { position } = ART_SLOTS[slot];
      this.eyeGlows[slot] = scene.add
        .image(position.x, position.y, 'light_radial')
        .setScale(EYE_GLOW_RADIUS / LIGHT_RADIAL_RADIUS)
        .setBlendMode('ADD')
        .setDepth(EYE_LIVE_DEPTH - 0.05)
        .setVisible(false);
    }
    add('sprout', ['sprout'], uprightDepth('sprout'));
    add('lantern', ['lantern-off'], uprightDepth('lantern'));
    add('latchA', ['latch-a-released', 'latch-a-engaged'], uprightDepth('latchA'));
    add('brakeB', ['brake-b-released', 'brake-b-engaged'], uprightDepth('brakeB'));
    add('doorA', ['door-a-closed', 'door-a-open', ...DOOR_A_CLOSING.map((frame) => frame.texture)], 4);
    add('gateB', ['gate-b-closed', 'gate-b-open'], 4);
    this.showArt('background', 'station-yard');
    this.showArt('column', 'water-column');
    this.showArt('stele', 'stele-normal');
    this.showArt('sprout', 'sprout');
    this.showArt('dryChannel', 'dry-channel');
    this.showArt('linkages', 'mechanical-linkages');
    this.showArt('canopy', 'canopy');
  }

  /** Door A's texture while closed: the closing frames just after it shut, then the closed leaf. */
  private doorAClosingTexture(): string {
    const since = this.host.scene.time.now - this.doorAClosedAt;
    return DOOR_A_CLOSING.find((frame) => since < frame.until)?.texture ?? 'door-a-closed';
  }

  /** Eases the crown towards CANOPY_FADED_ALPHA while any sampled point of Nhinh sits under its painted leaves. */
  private fadeCanopy(dt: number): void {
    const canopy = this.artImages.canopy?.canopy;
    const foot = this.footNow;
    if (!canopy || !foot) return;
    const key = artKey('canopy');
    const x = foot.x + foot.width / 2;
    const y = foot.y + foot.height / 2;
    // The texture is 2x: game px → texture px.
    const covered = CANOPY_SAMPLES.some((up) => (this.host.scene.textures.getPixelAlpha(x * 2, (y - up) * 2, key) ?? 0) > 64);
    const target = covered ? CANOPY_FADED_ALPHA : 1;
    const step = CANOPY_FADE_PER_MS * dt;
    canopy.setAlpha(canopy.alpha < target ? Math.min(target, canopy.alpha + step) : Math.max(target, canopy.alpha - step));
  }

  /** Shows an eye live (above the darkness, with its breathing glow) or dormant. */
  private showEye(slot: 'eyeA' | 'eyeB', live: boolean): void {
    this.showArt(slot, live ? 'eye-live' : 'eye-dormant');
    const glow = this.eyeGlows[slot];
    if (!glow) return;
    const wave = (1 - Math.cos(((this.host.scene.time.now % EYE_GLOW_PERIOD_MS) / EYE_GLOW_PERIOD_MS) * Math.PI * 2)) / 2;
    glow.setVisible(live).setAlpha(EYE_GLOW_ALPHA_MIN + EYE_GLOW_ALPHA_SPAN * wave);
  }

  /** Shows one texture of a slot and hides the rest. A null texture hides the slot. */
  private showArt(slot: string, texture: string | null): void {
    for (const [name, image] of Object.entries(this.artImages[slot] ?? {})) image.setVisible(name === texture);
  }

  /** Picks each slot's texture from the state, the live doors and the lantern. Runs every frame. */
  private drawArt(live: ForestEdgeLive, lantern: LanternState): void {
    if (!this.artOn) return;
    this.showArt('doorA', live.doorAOpen ? 'door-a-open' : this.doorAClosingTexture());
    this.showArt('gateB', live.gateBOpen ? 'gate-b-open' : 'gate-b-closed');
    this.showArt('latchA', this.state.latchA ? 'latch-a-engaged' : 'latch-a-released');
    this.showArt('brakeB', this.state.braceB ? 'brake-b-engaged' : 'brake-b-released');
    this.showArt('s1', socketTexture(lantern, S1_ID));
    this.showArt('s2', socketTexture(lantern, S2_ID));
    this.showEye('eyeA', lanternFeeds(lantern, S1_ID));
    this.showEye('eyeB', lanternFeeds(lantern, S2_ID));
    this.showArt('stele', this.host.scene.time.now < this.stelePulseUntil ? 'stele-pulse' : 'stele-normal');
    // The ending names the route mark on the column (Nhinh: "Đường này nối về bến"); from then on the column and its
    // badge read in the dark, so the player sees what she means.
    const badgeLit = this.host.hasEvent(CUE_EVENT.ending);
    this.artImages.column?.['water-column']?.setDepth(badgeLit ? EYE_LIVE_DEPTH : uprightDepth('column'));
    this.badgeGlow?.setVisible(badgeLit);
    // Pulse at the stele reveals the S1–A line and the tool marks on latch A; a fed line runs live either way.
    const s1Line = this.host.hasJournal(LINE_S1_A_ID) ? 's1ToA-revealed' : 's1ToA-hidden';
    this.showArt('s1ToA', lanternFeeds(lantern, S1_ID) ? 's1ToA-live' : s1Line);
    this.showArt('s2ToB', lanternFeeds(lantern, S2_ID) ? 's2ToB-live' : 's2ToB-hidden');
    this.showArt('latchTool', this.host.hasJournal(LATCH_TOOL_ID) ? 'latch-tool-marks' : null);
    this.showArt('hinge', hingeTexture(this.hingePhase));
    const onGround = lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID;
    this.showArt('lantern', onGround ? 'lantern-off' : null);
  }

  getState(): ForestEdgeState {
    return this.state;
  }

  hud(): HudText {
    const hud = forestEdgeHud(this.viewNow(), this.host.getLantern(), this.state);
    return { objective: tr(hud.objective), status: tr(hud.status) };
  }

  hint(): HintLadder | null {
    return forestEdgeHint(this.viewNow());
  }

  tutorial(): readonly TutorialStep[] {
    return FOREST_EDGE_TUTORIAL;
  }

  wake(): { event: string; frames: readonly { texture: string; ms: number }[] } | null {
    if (!this.artOn) return null;
    return { event: WAKE_EVENT, frames: WAKE_FRAMES.map((frame) => ({ texture: artKey(frame.texture), ms: frame.ms })) };
  }

  onPulse(origin: Point): void {
    const s = FOREST_EDGE.stele;
    const dx = Math.max(s.x - origin.x, 0, origin.x - (s.x + s.width));
    const dy = Math.max(s.y - origin.y, 0, origin.y - (s.y + s.height));
    if (Math.hypot(dx, dy) <= STELE_PULSE_REACH) this.stelePulseUntil = this.host.scene.time.now + STELE_PULSE_MS;
  }

  focus(): readonly string[] {
    return forestEdgeFocus(this.host.getLantern(), this.state);
  }

  pulseMarks(): readonly PulseMark[] {
    return FOREST_EDGE_PULSE_MARKS;
  }

  journalText(id: string): string {
    return FOREST_EDGE_JOURNAL_TEXT[id] ?? '';
  }

  sealPosition(_sealId: string): Point | null {
    return null;
  }

  ambientDarkness(): number {
    return AMBIENT_DARKNESS;
  }

  lightBlockers(): readonly Rect[] {
    return forestBlockers(this.live);
  }

  lightMarks(): readonly LightMark[] {
    return FOREST_EDGE_LIGHT_MARKS;
  }

  rooms(): readonly Room[] {
    return FOREST_EDGE_ROOMS;
  }

  lighting(): 'lantern' | 'none' {
    return 'lantern';
  }

  /**
   * The lamp is unavailable while it rests on the ground: F cannot light it, and the lantern controls and pulse stay
   * off until the one pickup. Once taken it is never on the ground again.
   */
  lanternAvailable(): boolean {
    return !this.lampOnGroundNow();
  }

  private lampOnGroundNow(): boolean {
    const lantern = this.host.getLantern();
    return lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID;
  }

  pedestalPosition(pedestalId: string): Point | null {
    if (pedestalId === S1_ID) return rectCenter(FOREST_EDGE.s1);
    if (pedestalId === S2_ID) return rectCenter(FOREST_EDGE.s2);
    return null;
  }

  isExitReached(foot: Rect): boolean {
    return !this.speaking && forestExitReady(this.live, this.host.getLantern(), foot);
  }

  exit(): { illustrations: string[]; nextLevelId: string | null } | null {
    return { illustrations: [], nextLevelId: NEXT_LEVEL_ID };
  }

  destroy(): void {
    for (const graphics of this.statics) graphics.destroy();
    this.statics = [];
    this.leaves?.destroy();
    this.fixtures?.destroy();
    this.marks?.destroy();
    this.leaves = null;
    this.fixtures = null;
    this.marks = null;
  }

  /** The view from the saved state, the live doors and the lantern, recomputed on every read. */
  private viewNow(): ForestEdgeView {
    return deriveForestEdge(this.state, this.host.getLantern(), this.live);
  }

  private pedestalPrompt(pedestalId: string): string {
    const lantern = this.host.getLantern();
    if (lantern.location.at === 'hand') return pedestalId === S1_ID ? PROMPT_PLACE_S1 : PROMPT_PLACE_S2;
    if (lantern.location.pedestalId === LAMP_REST_ID) return PROMPT_LAMP_BY_STELE;
    return lantern.location.pedestalId === pedestalId ? PROMPT_TAKE : `E: đèn đang ở bệ ${lantern.location.pedestalId === S1_ID ? 'S1' : 'S2'}`;
  }

  /** The lamp on the ground shows its prompt only while it rests there; after the one pickup the control is gone. */
  private lampPrompt(): string | null {
    const lantern = this.host.getLantern();
    return lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID ? PROMPT_TAKE_LAMP : null;
  }

  private onLampRest(): void {
    const outcome = takeLampFromRest(this.host.getLantern());
    if (!outcome.ok) {
      this.host.toast(outcome.reason);
      return;
    }
    this.host.setLantern(outcome.value);
    this.host.markEvent(LAMP_TAKEN_EVENT);
    this.host.requestSave();
  }

  private onPedestal(pedestalId: string): void {
    const outcome = lanternAtPedestal(this.host.getLantern(), pedestalId);
    if (!outcome.ok) {
      this.host.toast(outcome.reason);
      return;
    }
    this.host.setLantern(outcome.value);
  }

  private onLatchA(): void {
    const outcome = toggleLatchA(this.state, this.live.doorAOpen);
    if (!outcome.ok) {
      this.host.toast(outcome.reason);
      return;
    }
    this.state = outcome.value;
    SoundSystem.playMechanismLatch();
    this.host.requestSave();
  }

  private onBraceB(): void {
    const outcome = toggleBraceB(this.state, this.live.gateBOpen);
    if (!outcome.ok) {
      this.host.toast(outcome.reason);
      return;
    }
    this.state = outcome.value;
    SoundSystem.playMechanismLatch();
    this.host.requestSave();
  }

  private onHinge(): void {
    this.hingePhase = nextHingePhase(this.hingePhase);
    this.host.toast(HINGE_PHASES[this.hingePhase].reached);
  }

  /** Doors, pedestals, latch, brace and hinge: drawn from the state and the live doors every frame. */
  private draw(live: ForestEdgeLive, lantern: LanternState, footprints: readonly Footprint[], blockers: readonly Rect[]): void {
    this.leaves?.clear();
    if (!live.doorAOpen) this.fillRect(this.leaves, FOREST_EDGE.doorA, COLOR.door);
    if (!live.gateBOpen) this.fillRect(this.leaves, FOREST_EDGE.gateB, COLOR.door);

    const g = this.fixtures;
    if (!g) return;
    g.clear();
    // Sealed sockets: a dark cap with a lit core only while the lantern sits on it and is lit.
    for (const [rect, id] of [[FOREST_EDGE.s1, S1_ID], [FOREST_EDGE.s2, S2_ID]] as const) {
      this.fillRect(g, { x: rect.x + 3, y: rect.y + 3, width: rect.width - 6, height: rect.height - 6 }, COLOR.pedestalSocket);
      if (lantern.location.at === 'pedestal' && lantern.location.pedestalId === id) {
        const c = rectCenter(rect);
        g.fillStyle(lantern.on ? COLOR.lanternOn : COLOR.lanternOff, 1).fillCircle(c.x, c.y, 4);
      }
    }
    // The lamp resting on the ground by the stele: unlit, drawn as a dim core until it is taken.
    if (lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID) {
      const c = rectCenter(FOREST_EDGE.lampRest);
      g.fillStyle(COLOR.lanternOff, 1).fillCircle(c.x, c.y, 4);
    }
    if (this.state.latchA) {
      const r = FOREST_EDGE.latchA;
      this.fillRect(g, { x: r.x + 4, y: r.y + 4, width: r.width - 8, height: r.height - 8 }, COLOR.latchEngaged);
    }
    if (this.state.braceB) {
      const r = FOREST_EDGE.braceB;
      this.fillRect(g, { x: r.x + 4, y: r.y + 4, width: r.width - 8, height: r.height - 8 }, COLOR.braceEngaged);
    }
    // The hinge model: one short bar per phase, so the phase reads without colour alone.
    const h = FOREST_EDGE.hinge;
    g.lineStyle(2, COLOR.line, 0.9).lineBetween(h.x + 4, h.y + h.height / 2, h.x + 4 + 8 * (this.hingePhase + 1), h.y + h.height / 2);
    // The sprout is drawn only while it reads under the light.
    const sprout = FOREST_EDGE_LIGHT_MARKS.find((mark) => mark.id === SPROUT_ID);
    if (sprout && isRectLit(sprout.rect, footprints, blockers)) {
      this.fillRect(g, sprout.rect, COLOR.sprout);
    }
  }

  /** The light marks: a dark mark as speckles while it reads, a lit mark as a glyph while it reads. */
  private drawMarks(blockers: readonly Rect[]): void {
    const g = this.marks;
    if (!g) return;
    g.clear();
    for (const mark of FOREST_EDGE_LIGHT_MARKS) {
      if (mark.id === SPROUT_ID) continue;
      const { x, y, width, height } = mark.rect;
      if (isMarkReadable(mark, this.footprintsNow, blockers)) {
        g.fillStyle(COLOR.markDark, 0.9);
        for (const p of [
          { x: x + width / 2, y: y + height / 2 },
          { x: x + width / 4, y: y + height / 4 },
          { x: x + (3 * width) / 4, y: y + (3 * height) / 4 },
        ]) {
          g.fillCircle(p.x, p.y, 1.2);
        }
      } else if (this.host.hasJournal(mark.id)) {
        g.lineStyle(1, COLOR.markDark, 0.25).strokeRect(x, y, width, height);
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
}

/** The socket texture for a pedestal: empty, the lamp set on it unlit, or the lamp set on it lit. */
function socketTexture(lantern: LanternState, pedestalId: string): string {
  if (lantern.location.at !== 'pedestal' || lantern.location.pedestalId !== pedestalId) return 'socket-empty';
  return lantern.on ? 'socket-lamp-on' : 'socket-lamp-off';
}

/** Turns a zone's static body on or off. A disabled body takes no part in collisions (Arcade skips it). */
function setZoneEnabled(zone: Phaser.GameObjects.Zone | null, enabled: boolean): void {
  if (!zone) return;
  (zone as unknown as { body: { enable: boolean } }).body.enable = enabled;
}
