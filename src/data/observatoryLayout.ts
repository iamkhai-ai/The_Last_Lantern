/**
 * Level 09 — Dark Moon Observatory: pure spatial + state rules.
 *
 * This module owns every authored rectangle consumed by BOTH the runtime
 * (CampaignScene) and the offline checks (scripts/check-observatory.mjs), so a
 * collider can never drift away from the visible art, a stand can never sit
 * inside a solid, and a restore can never drop Nhinh inside geometry.
 *
 * No Phaser, no DOM. Its only import is the i18n catalogue, which is plain TypeScript too, so it stays importable from plain Node.
 *
 * Conventions
 * - Room world is 640x360. Top HUD occupies y=0..58, bottom status/help y=320..360.
 * - Actor frame is 36x42 with baseline 40 => feet at (center.x, center.y + 19).
 *   The Arcade foot body is 14x6 at center + (-7, +16).
 * - A standing prop is authored by its GROUND anchor (bottom-centre of the art);
 *   its solid is exactly the fitted art rectangle, so collider == visible art and
 *   the native aspect ratio is always preserved (uniform scale, never stretched).
 * - A door is a recessed alcove: the opening is 48px wide, the flanking jambs are
 *   permanently solid, and only the threshold is solid while the door is locked.
 *   Its transit trigger sits deep inside the alcove, so the exit is unreachable
 *   while locked; a second "inspect" control sits at the alcove mouth and always
 *   states the unmet prerequisite in plain Vietnamese.
 * - Interaction triggers sit at the object's SOUTH edge (RULE_GAMES.md). Door
 *   arches use the documented gate exception and are approached from inside.
 */
import { tr } from '../i18n/catalog.ts';

export type ObservatoryRoomKey = 'entrance' | 'corridor' | 'observatory';
export type ObservatoryDoorKey = 'door-a' | 'sun-door' | 'return-loop';

export interface ObsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObsPoint {
  x: number;
  y: number;
}

export type ObsApproach = 'south' | 'side' | 'gate';

export type ObsArtRef =
  | { kind: 'texture'; key: string }
  | { kind: 'level'; level: number; file: string }
  | { kind: 'level-set'; level: number; files: readonly string[] };

export interface ObsElement {
  /** Matches the authored interactable id in observatoryRooms.ts. */
  id: string;
  roomId: ObservatoryRoomKey;
  art: ObsArtRef;
  /** Native art size, preserved: never stretched. */
  nativeWidth: number;
  nativeHeight: number;
  /** Uniform reduction so the drawn size always keeps the native aspect ratio. */
  scale: number;
  /** Ground anchor (bottom-centre) of the art. */
  anchor: ObsPoint;
  /** Trigger centre, at the object's south edge. */
  stand: ObsPoint;
  radius: number;
  approach: ObsApproach;
  /** Ground-mounted art (floor model / root mass) instead of a standing prop. */
  mount?: 'ground';
  /** Door-side state that flips the drawn frame, when the art is a 4-way set. */
  rotatesWith?: 'g0' | 'g1' | 'g2' | 'statue';
  /** Solid footprint of a ground-mounted structure, when it differs from its art. */
  solidOverride?: ObsRect;
}

export interface ObsAlcove {
  id: string;
  roomId: ObservatoryRoomKey;
  doorId: ObservatoryDoorKey;
  /** The 48px-wide recessed opening the player walks into once the door opens. */
  threshold: ObsRect;
  /** Permanent masonry flanking the opening; the passage stays 48px when open. */
  jambs: readonly ObsRect[];
  /** Room-facing standing point used by the "inspect the door" control. */
  inspect: ObsPoint;
  inspectRadius: number;
  /** Deep transit trigger; unreachable while the door is locked. */
  trigger: ObsPoint;
  triggerRadius: number;
  /** Where the drawn door arch sits (inside the alcove's outer end). */
  arch: ObsRect;
  label: string;
}

export interface ObsFloorBand extends ObsRect {
  minX: number;
  maxX: number;
}

/* ------------------------------------------------------------------ *
 * Actor body
 * ------------------------------------------------------------------ */

export const OBSERVATORY_BODY = {
  feetY: 19,
  bodyOffsetX: 11,
  bodyOffsetY: 37,
  width: 14,
  height: 6,
} as const;

export function observatoryBody(center: ObsPoint): ObsRect {
  return {
    x: center.x - OBSERVATORY_BODY.width / 2,
    y: center.y + OBSERVATORY_BODY.bodyOffsetY - 21,
    width: OBSERVATORY_BODY.width,
    height: OBSERVATORY_BODY.height,
  };
}

export function rectsOverlap(a: ObsRect, b: ObsRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectContains(outer: ObsRect, inner: ObsRect): boolean {
  return inner.x >= outer.x && inner.x + inner.width <= outer.x + outer.width
    && inner.y >= outer.y && inner.y + inner.height <= outer.y + outer.height;
}

/** Uniform fit: never distorts the native aspect ratio. */
export function fitObservatoryArt(nativeWidth: number, nativeHeight: number, scale: number): { width: number; height: number } {
  return { width: Math.round(nativeWidth * scale), height: Math.round(nativeHeight * scale) };
}

export function observatoryArtRect(element: ObsElement): ObsRect {
  const size = fitObservatoryArt(element.nativeWidth, element.nativeHeight, element.scale);
  return { x: element.anchor.x - size.width / 2, y: element.anchor.y - size.height, width: size.width, height: size.height };
}

export function observatoryElementSolid(element: ObsElement): ObsRect {
  return element.solidOverride ?? observatoryArtRect(element);
}

/* ------------------------------------------------------------------ *
 * Walkable bands and permanent masonry
 * ------------------------------------------------------------------ */

export const OBSERVATORY_FLOORS: Record<ObservatoryRoomKey, ObsFloorBand> = {
  entrance: { x: 24, y: 88, width: 592, height: 216, minX: 24, maxX: 616 },
  corridor: { x: 24, y: 88, width: 592, height: 216, minX: 24, maxX: 616 },
  // The observatory keeps a deeper north wall so the ceiling wheel and the
  // final-door head sit on masonry above the playable band (y=152..300).
  observatory: { x: 24, y: 152, width: 592, height: 148, minX: 24, maxX: 616 },
};

export const OBSERVATORY_WALLS: Record<ObservatoryRoomKey, readonly ObsRect[]> = {
  entrance: [
    { x: 0, y: 0, width: 640, height: 88 },
    { x: 0, y: 304, width: 640, height: 56 },
    { x: 0, y: 88, width: 24, height: 108 },
    { x: 0, y: 244, width: 24, height: 60 },
    { x: 616, y: 88, width: 24, height: 68 },
    { x: 616, y: 204, width: 24, height: 100 },
  ],
  corridor: [
    { x: 0, y: 0, width: 640, height: 88 },
    { x: 0, y: 304, width: 640, height: 56 },
    { x: 0, y: 88, width: 24, height: 68 },
    { x: 0, y: 204, width: 24, height: 100 },
    { x: 616, y: 88, width: 24, height: 108 },
    { x: 616, y: 244, width: 24, height: 60 },
  ],
  observatory: [
    { x: 0, y: 0, width: 640, height: 100 },
    { x: 0, y: 100, width: 468, height: 52 },
    { x: 532, y: 100, width: 108, height: 52 },
    { x: 0, y: 152, width: 24, height: 38 },
    { x: 0, y: 238, width: 24, height: 62 },
    { x: 616, y: 152, width: 24, height: 148 },
    { x: 0, y: 300, width: 488, height: 60 },
    { x: 548, y: 300, width: 92, height: 60 },
    { x: 488, y: 320, width: 64, height: 40 },
  ],
};

/* ------------------------------------------------------------------ *
 * Doors (recessed alcoves)
 * ------------------------------------------------------------------ */

/**
 * Side alcoves: jambs are thicker (24px) than the opening is tall, so the nearest
 * standing point outside a locked alcove is always further away than the trigger
 * radius. That makes "unreachable while locked" a geometric fact instead of a
 * convention: with a 28px trigger and 24px jambs the closest outside foot body is
 * at least 32px from the trigger. The south return-loop pocket (8px jambs, 16px
 * trigger) does not follow this rule; its exact geometry is checked by the "South
 * sill pocket" block in scripts/check-observatory.mjs instead.
 */
export const OBSERVATORY_JAMB_THICKNESS = 24;

export const OBSERVATORY_ALCOVES: readonly ObsAlcove[] = [
  {
    id: 'door-a-entrance', roomId: 'entrance', doorId: 'door-a',
    threshold: { x: 536, y: 156, width: 104, height: 48 },
    jambs: [{ x: 536, y: 132, width: 104, height: 24 }, { x: 536, y: 204, width: 104, height: 24 }],
    inspect: { x: 520, y: 180 }, inspectRadius: 24,
    trigger: { x: 604, y: 180 }, triggerRadius: 28,
    arch: { x: 576, y: 152, width: 48, height: 48 },
    label: 'Cửa A',
  },
  {
    id: 'door-a-corridor', roomId: 'corridor', doorId: 'door-a',
    threshold: { x: 24, y: 156, width: 104, height: 48 },
    jambs: [{ x: 24, y: 132, width: 104, height: 24 }, { x: 24, y: 204, width: 104, height: 24 }],
    inspect: { x: 144, y: 180 }, inspectRadius: 22,
    trigger: { x: 36, y: 180 }, triggerRadius: 28,
    arch: { x: 72, y: 152, width: 48, height: 48 },
    label: 'Cửa A',
  },
  {
    id: 'sun-door-corridor', roomId: 'corridor', doorId: 'sun-door',
    threshold: { x: 536, y: 196, width: 104, height: 48 },
    jambs: [{ x: 536, y: 172, width: 104, height: 24 }, { x: 536, y: 244, width: 104, height: 24 }],
    inspect: { x: 512, y: 220 }, inspectRadius: 22,
    trigger: { x: 604, y: 220 }, triggerRadius: 28,
    arch: { x: 576, y: 192, width: 48, height: 48 },
    label: 'Cửa Mặt Trời',
  },
  {
    id: 'sun-door-observatory', roomId: 'observatory', doorId: 'sun-door',
    threshold: { x: 24, y: 190, width: 80, height: 48 },
    jambs: [{ x: 24, y: 166, width: 80, height: 24 }, { x: 24, y: 238, width: 80, height: 24 }],
    inspect: { x: 118, y: 214 }, inspectRadius: 22,
    trigger: { x: 36, y: 214 }, triggerRadius: 28,
    arch: { x: 56, y: 186, width: 48, height: 48 },
    label: 'Cửa Mặt Trời',
  },
  {
    id: 'return-loop-entrance', roomId: 'entrance', doorId: 'return-loop',
    threshold: { x: 24, y: 196, width: 104, height: 48 },
    jambs: [{ x: 24, y: 172, width: 104, height: 24 }, { x: 24, y: 244, width: 104, height: 24 }],
    inspect: { x: 140, y: 220 }, inspectRadius: 22,
    trigger: { x: 36, y: 220 }, triggerRadius: 28,
    arch: { x: 72, y: 192, width: 48, height: 48 },
    label: 'Lối đá vòng',
  },
  {
    // A 20px south sill pocket (y 300..320), the only alcove shallower than 48px:
    // it must end above the bottom status band (y>=320). The floor band stops at
    // y=300, so with the loop shut the lowest legal foot-body centre is (520,278),
    // 26px from the trigger (radius 16, outside). With the loop open the body can
    // stand inside the pocket with its bottom at y=320: centre (520,298), 6px from
    // the trigger (inside). The south masonry under the sill (OBSERVATORY_WALLS,
    // y 320..360) closes the pocket from below.
    id: 'return-loop-observatory', roomId: 'observatory', doorId: 'return-loop',
    threshold: { x: 496, y: 300, width: 48, height: 20 },
    jambs: [{ x: 488, y: 300, width: 8, height: 20 }, { x: 544, y: 300, width: 8, height: 20 }],
    inspect: { x: 520, y: 262 }, inspectRadius: 22,
    trigger: { x: 520, y: 304 }, triggerRadius: 16,
    arch: { x: 496, y: 284, width: 48, height: 36 },
    label: 'Lối đá vòng',
  },
];

export function observatoryAlcoves(roomId: ObservatoryRoomKey): readonly ObsAlcove[] {
  return OBSERVATORY_ALCOVES.filter((alcove) => alcove.roomId === roomId);
}

export function observatoryAlcove(id: string): ObsAlcove | undefined {
  return OBSERVATORY_ALCOVES.find((alcove) => alcove.id === id);
}

/* ------------------------------------------------------------------ *
 * Elements (art + stand), per room
 * ------------------------------------------------------------------ */

const pedestal: ObsArtRef = { kind: 'texture', key: 'pedestal_empty' };
const receiver: ObsArtRef = { kind: 'texture', key: 'receiver_off' };
const lockSun: ObsArtRef = { kind: 'level', level: 7, file: 'lock-sun-off' };
const latchWest: ObsArtRef = { kind: 'level', level: 4, file: 'latch-unlatched' };
/**
 * The final-door plate reuses the creek mechanism pack (level index 3), which is
 * the only registered level folder that ships latch-east-* : level index 7 has no
 * such file, so pointing there would silently draw nothing.
 */
const latchEast: ObsArtRef = { kind: 'level', level: 3, file: 'mechanisms/latch-east-unlatched' };
const altar: ObsArtRef = { kind: 'texture', key: 'ruins_altar' };
const crystal: ObsArtRef = { kind: 'texture', key: 'crystal_balance' };
const tubeMouth: ObsArtRef = { kind: 'level', level: 4, file: 'tube-mouth' };
const lumoSeal: ObsArtRef = { kind: 'level', level: 7, file: 'lock-moon-covered' };
const splitter: ObsArtRef = { kind: 'level-set', level: 7, files: ['fixed-three-route-splitter-off', 'fixed-three-route-splitter-on'] };
const statue: ObsArtRef = { kind: 'level-set', level: 7, files: ['statue-notch-0', 'statue-notch-1', 'statue-notch-2', 'statue-notch-3'] };
const finalDoor: ObsArtRef = { kind: 'level-set', level: 7, files: ['sanctuary-door-closed', 'sanctuary-door-open'] };
const mirror = (index: number): ObsArtRef => ({ kind: 'texture', key: `mirror_${index}` });

export const OBSERVATORY_ELEMENTS: readonly ObsElement[] = [
  // --- entrance / lobby: source pedestal, G0, and the safe practice miniature.
  {
    id: 'lantern-pedestal', roomId: 'entrance', art: pedestal, nativeWidth: 36, nativeHeight: 39, scale: 1,
    anchor: { x: 188, y: 232 }, stand: { x: 188, y: 224 }, radius: 22, approach: 'south',
  },
  {
    id: 'g0', roomId: 'entrance', art: mirror(0), nativeWidth: 36, nativeHeight: 48, scale: 0.9,
    anchor: { x: 432, y: 236 }, stand: { x: 432, y: 228 }, radius: 22, approach: 'south', rotatesWith: 'g0',
  },
  {
    id: 'learned-marks', roomId: 'entrance', art: { kind: 'level', level: 8, file: 'learned-marks-miniature' },
    nativeWidth: 160, nativeHeight: 80, scale: 1,
    anchor: { x: 320, y: 184 }, stand: { x: 320, y: 202 }, radius: 24, approach: 'south', mount: 'ground',
  },
  // --- corridor / star-map room.
  {
    id: 'g1', roomId: 'corridor', art: mirror(1), nativeWidth: 36, nativeHeight: 48, scale: 0.9,
    anchor: { x: 240, y: 216 }, stand: { x: 240, y: 208 }, radius: 22, approach: 'south', rotatesWith: 'g1',
  },
  {
    id: 'lumo-tube', roomId: 'corridor', art: tubeMouth, nativeWidth: 64, nativeHeight: 32, scale: 1,
    anchor: { x: 105, y: 88 }, stand: { x: 105, y: 80 }, radius: 22, approach: 'south',
  },
  {
    id: 'lumo-seal', roomId: 'corridor', art: lumoSeal, nativeWidth: 32, nativeHeight: 40, scale: 1,
    anchor: { x: 320, y: 88 }, stand: { x: 320, y: 80 }, radius: 22, approach: 'south',
  },
  {
    // A latch plate on the sill of Door A: it is drawn inside the alcove, so the
    // transit passage stays 48px wide once the door is latched open.
    id: 'door-a-control', roomId: 'corridor', art: latchWest, nativeWidth: 28, nativeHeight: 32, scale: 1,
    anchor: { x: 56, y: 204 }, stand: { x: 56, y: 222 }, radius: 22, approach: 'south',
  },
  {
    id: 'sun-door-control', roomId: 'corridor', art: lockSun, nativeWidth: 32, nativeHeight: 40, scale: 1,
    anchor: { x: 500, y: 260 }, stand: { x: 500, y: 252 }, radius: 22, approach: 'south',
  },
  {
    id: 'star-map-table', roomId: 'corridor', art: altar, nativeWidth: 104, nativeHeight: 52, scale: 0.8,
    anchor: { x: 320, y: 280 }, stand: { x: 320, y: 280 }, radius: 0, approach: 'side',
  },
  // --- observatory: the combined puzzle room.
  {
    id: 'g2', roomId: 'observatory', art: mirror(2), nativeWidth: 36, nativeHeight: 48, scale: 0.9,
    anchor: { x: 168, y: 258 }, stand: { x: 168, y: 250 }, radius: 22, approach: 'south', rotatesWith: 'g2',
  },
  {
    id: 'splitter', roomId: 'observatory', art: splitter, nativeWidth: 48, nativeHeight: 48, scale: 0.8,
    anchor: { x: 240, y: 240 }, stand: { x: 240, y: 232 }, radius: 22, approach: 'south',
  },
  {
    id: 'statue', roomId: 'observatory', art: statue, nativeWidth: 64, nativeHeight: 88, scale: 0.8,
    anchor: { x: 296, y: 252 }, stand: { x: 296, y: 244 }, radius: 22, approach: 'south', rotatesWith: 'statue',
  },
  {
    id: 'sun-lock', roomId: 'observatory', art: lockSun, nativeWidth: 32, nativeHeight: 40, scale: 0.85,
    anchor: { x: 176, y: 152 }, stand: { x: 176, y: 144 }, radius: 22, approach: 'south',
  },
  {
    // The root bed is a full-depth divider: it can only be approached from its
    // west/east face, which RULE_GAMES.md section 3 allows for objects that
    // cannot be reached from the south. Documented exception.
    // The stand sits on the NEAR-bank face (west of the bed, south of the statue)
    // so the player can read why the roots will not close BEFORE crossing.
    id: 'root-bed', roomId: 'observatory', art: { kind: 'texture', key: 'root-bed' },
    nativeWidth: 44, nativeHeight: 148, scale: 1, mount: 'ground',
    anchor: { x: 362, y: 300 }, stand: { x: 330, y: 252 }, radius: 24, approach: 'side',
    solidOverride: { x: 340, y: 152, width: 44, height: 148 },
  },
  {
    // Latch plate mounted in the final-door head: drawn on the door, walkable
    // once the head opens, never a collider of its own.
    id: 'final-door-control', roomId: 'observatory', art: latchEast, nativeWidth: 28, nativeHeight: 32, scale: 1,
    anchor: { x: 500, y: 152 }, stand: { x: 500, y: 170 }, radius: 22, approach: 'south', mount: 'ground',
  },
  {
    id: 'final-door', roomId: 'observatory', art: finalDoor, nativeWidth: 104, nativeHeight: 76, scale: 0.62,
    anchor: { x: 500, y: 152 }, stand: { x: 500, y: 152 }, radius: 0, approach: 'gate', mount: 'ground',
  },
  {
    id: 'stone-return-loop', roomId: 'observatory', art: receiver, nativeWidth: 40, nativeHeight: 37, scale: 0.7,
    anchor: { x: 466, y: 252 }, stand: { x: 466, y: 244 }, radius: 22, approach: 'south',
  },
  {
    id: 'final-record', roomId: 'observatory', art: altar, nativeWidth: 104, nativeHeight: 52, scale: 0.62,
    anchor: { x: 418, y: 256 }, stand: { x: 418, y: 248 }, radius: 22, approach: 'south',
  },
  {
    id: 'balance-crystal', roomId: 'observatory', art: crystal, nativeWidth: 42, nativeHeight: 78, scale: 0.5,
    anchor: { x: 568, y: 252 }, stand: { x: 568, y: 244 }, radius: 22, approach: 'south',
  },
];

/**
 * Elements that are not colliders: wall-mounted art, walkable floor art, and the
 * two latch plates drawn on a door sill (inside a door threshold that is already
 * solid while locked).
 */
export const OBSERVATORY_NON_SOLID_IDS = [
  'lumo-tube', 'lumo-seal', 'learned-marks', 'final-door',
  'door-a-control', 'final-door-control',
] as const;

export function observatoryElements(roomId: ObservatoryRoomKey): readonly ObsElement[] {
  return OBSERVATORY_ELEMENTS.filter((element) => element.roomId === roomId);
}

export function observatoryElement(id: string): ObsElement | undefined {
  return OBSERVATORY_ELEMENTS.find((element) => element.id === id);
}

/**
 * Standing props are the level's real obstacles: anything drawn as a standing
 * object is solid, matching its visible art exactly. Wall-mounted art, walkable
 * floor art and the two latch plates drawn on a door sill are excluded, and so
 * are ground mounts: the practice miniature, and the root bed, whose solid is the
 * dynamic bed rectangle in observatorySolidRects.
 */
export function observatoryElementSolids(roomId: ObservatoryRoomKey): readonly ObsRect[] {
  return observatoryElements(roomId)
    .filter((element) => element.mount !== 'ground' && !(OBSERVATORY_NON_SOLID_IDS as readonly string[]).includes(element.id))
    .map((element) => observatoryElementSolid(element));
}

/* ------------------------------------------------------------------ *
 * Dynamic structures: root bed, bridge lane, floor stamps
 * ------------------------------------------------------------------ */

/**
 * The Shadow waits on the far bank, north of the final record and clear of the loop control, the bridge exit and
 * every stand. His footprint is a solid (the only prop that is not an ObsElement); the Guardian of the memory
 * stands one step east of him and he steps into that place during the record (scenario section 5).
 */
export const OBSERVATORY_SHADOW = {
  art: { width: 48, height: 64 },
  ground: { x: 424, y: 190 } as ObsPoint,
  footprint: { x: 410, y: 174, width: 28, height: 16 } as ObsRect,
  guardianGround: { x: 466, y: 190 } as ObsPoint,
} as const;

/**
 * The lantern's logic stays on the pedestal, but its halo is only painted in the room that holds it: a lamp parked
 * in the entrance never lights the corridor or the observatory. A carried lamp lights every room it is in.
 */
export const OBSERVATORY_PLACED_LIGHT_ROOM: ObservatoryRoomKey = 'entrance';
export function observatoryPlacedLightVisible(roomId: ObservatoryRoomKey, lanternPlaced: boolean): boolean {
  return !lanternPlaced || roomId === OBSERVATORY_PLACED_LIGHT_ROOM;
}

export const OBSERVATORY_ROOT_BED: ObsRect = { x: 340, y: 152, width: 44, height: 148 };
/** The crossing lane cut through the bed; walkable only while the bridge holds. */
export const OBSERVATORY_BRIDGE_LANE: ObsRect = { x: 340, y: 202, width: 44, height: 48 };
/** The final-door head cut into the observatory's north wall. */
export const OBSERVATORY_FINAL_DOOR_HEAD: ObsRect = { x: 468, y: 100, width: 64, height: 52 };

export interface ObsStamp extends ObsRect {
  id: string;
  depth: number;
}

/** Ground stamps: painted floor decor, always below the feet, never solid. */
export const OBSERVATORY_STAMPS: Record<ObservatoryRoomKey, readonly ObsStamp[]> = {
  entrance: [
    { id: 'loop-path', x: 128, y: 210, width: 60, height: 24, depth: 2 },
    { id: 'source-ring', x: 156, y: 214, width: 64, height: 34, depth: 1 },
  ],
  corridor: [
    { id: 'pipe-run', x: 73, y: 74, width: 215, height: 18, depth: 2 },
    { id: 'latch-grille', x: 28, y: 236, width: 56, height: 28, depth: 2 },
  ],
  observatory: [
    { id: 'pipe-run', x: 344, y: 60, width: 264, height: 18, depth: 2 },
    { id: 'pipe-drop', x: 592, y: 76, width: 18, height: 180, depth: 2 },
    { id: 'loop-path', x: 472, y: 266, width: 96, height: 32, depth: 2 },
    { id: 'final-door-sill', x: 468, y: 140, width: 64, height: 14, depth: 2 },
  ],
};

/* ------------------------------------------------------------------ *
 * Return loop: the opened door's floor strip
 * ------------------------------------------------------------------ */

/** Height of the return loop's stone strip: floor decor, never a collider. */
export const OBSERVATORY_RETURN_LOOP_LANE_HEIGHT = 18;
/** Stable object id for the strip, so room restoration can find the visual. */
export const OBSERVATORY_RETURN_LOOP_VISUAL_ID = 'observatory-return-loop';

/**
 * Where the opened return loop reads as floor: a stone lane along the south edge
 * of the room's walkable band. Drawn from OBSERVATORY_FLOORS, so it never
 * crosses masonry, the top HUD band (y<58) or the bottom status band (y>=320).
 * Collision stays in the loop's alcove thresholds, gated by
 * observatoryDoorOpen('return-loop', state) — this rectangle is decor only.
 */
export function observatoryReturnLoopLane(roomId: ObservatoryRoomKey): ObsRect {
  const floor = OBSERVATORY_FLOORS[roomId];
  return {
    x: floor.x + 20,
    y: floor.y + floor.height - OBSERVATORY_RETURN_LOOP_LANE_HEIGHT,
    width: floor.width - 40,
    height: OBSERVATORY_RETURN_LOOP_LANE_HEIGHT,
  };
}

/* ------------------------------------------------------------------ *
 * World state
 * ------------------------------------------------------------------ */

export interface ObsWorldState {
  /** Live derived gates (from ObservatoryPuzzle.deriveObservatoryState). */
  doorAUnlocked: boolean;
  sunDoorUnlocked: boolean;
  rootBedShadowed: boolean;
  bridgeEligible: boolean;
  lumoAtSeal: boolean;
  activeBeamRoute: string;
  /** Saved durable flags. */
  doorALatched: boolean;
  /**
   * The Sun Door holds itself open after the Sun lock has lit once. Without
   * this the player could strand themselves inside the observatory by turning
   * the lantern off; the puzzle still needs the LIVE Sun lock for the final
   * door and the live beam for the bridge.
   */
  sunDoorLatched: boolean;
  finalDoorLatched: boolean;
  returnLoopOpen: boolean;
  bridgeCrossed: boolean;
  lanternPlaced: boolean;
  lanternOn: boolean;
  lanternRetrieved: boolean;
  lumoRecalled: boolean;
  recordRead: boolean;
  crystalTaken: boolean;
  miniatureViewed: boolean;
  mirrors: { g0: number; g1: number; g2: number };
  statue: number;
  /** Live: the supply strip along the pipes is on (lamp placed and lit, Lumo holds the seal). */
  supplyLive: boolean;
  /** Live: the root bed's art state (scenario v2 §4). */
  rootState: 'dormant' | 'lit' | 'bridge' | 'retracted-dark';
  /** Durable: Lumo has reached the seal once; the tube and seal keep the remembered look and Lumo's first lines are spent. */
  sealRemembered: boolean;
  /** Durable: Nhinh has been in the observatory once. Drives the three-phase HUD goal. */
  observatoryReached: boolean;
  /** Durable: the margin ink on the star chart has been read (scenario v2 side path). */
  marginSeen: boolean;
  /** Live: Lumo is in the same room as Nhinh and close enough to listen to the record. */
  lumoBeside: boolean;
  /** Durable: how many of the five small marks in the learned-marks miniature have been read (0..5). */
  marksSeen: number;
}

export function observatoryDoorOpen(doorId: ObservatoryDoorKey, state: ObsWorldState): boolean {
  if (doorId === 'door-a') return state.doorAUnlocked || state.doorALatched;
  if (doorId === 'sun-door') return state.sunDoorUnlocked || state.sunDoorLatched;
  return state.returnLoopOpen;
}

export function observatoryDoorLatched(doorId: ObservatoryDoorKey, state: ObsWorldState): boolean {
  if (doorId === 'door-a') return state.doorALatched;
  if (doorId === 'sun-door') return state.sunDoorLatched;
  if (doorId === 'return-loop') return state.returnLoopOpen;
  return false;
}

/** A latched or already opened door never blocks again; an occupied sill defers closure. */
export function observatoryDoorShouldBlock(open: boolean, occupied: boolean, latched: boolean): boolean {
  if (latched) return false;
  return !open && !occupied;
}

/**
 * Every solid the foot body must respect in a room, including the closed door
 * thresholds, the root bed and the bridge lane.
 */
export function observatorySolidRects(roomId: ObservatoryRoomKey, state: ObsWorldState, occupied: readonly ObsRect[] = []): readonly ObsRect[] {
  const rects: ObsRect[] = [...OBSERVATORY_WALLS[roomId], ...observatoryElementSolids(roomId)];
  for (const alcove of observatoryAlcoves(roomId)) {
    rects.push(...alcove.jambs);
    const open = observatoryDoorOpen(alcove.doorId, state);
    const latched = observatoryDoorLatched(alcove.doorId, state);
    const occupiedSill = occupied.some((body) => rectsOverlap(body, alcove.threshold));
    if (observatoryDoorShouldBlock(open, occupiedSill, latched)) rects.push(alcove.threshold);
  }
  if (roomId === 'observatory') {
    const laneTop = OBSERVATORY_BRIDGE_LANE.y;
    const laneBottom = OBSERVATORY_BRIDGE_LANE.y + OBSERVATORY_BRIDGE_LANE.height;
    const bedBottom = OBSERVATORY_ROOT_BED.y + OBSERVATORY_ROOT_BED.height;
    // The bed always spans the full depth of the floor; only the crossing lane
    // opens, and only while the bridge is eligible or a span is held underfoot.
    rects.push({ ...OBSERVATORY_ROOT_BED, height: laneTop - OBSERVATORY_ROOT_BED.y });
    rects.push({ ...OBSERVATORY_BRIDGE_LANE, y: laneBottom, height: bedBottom - laneBottom });
    const held = occupied.some((body) => rectsOverlap(body, OBSERVATORY_BRIDGE_LANE));
    if (!state.bridgeEligible && !held) rects.push(OBSERVATORY_BRIDGE_LANE);
    if (!state.finalDoorLatched) rects.push(OBSERVATORY_FINAL_DOOR_HEAD);
    rects.push(OBSERVATORY_SHADOW.footprint);
  }
  return rects;
}

export function isObservatoryFloorWalkable(roomId: ObservatoryRoomKey, body: ObsRect, state: ObsWorldState): boolean {
  return observatoryFloorAllows(roomId, body, state);
}

function observatoryFloorAllows(roomId: ObservatoryRoomKey, body: ObsRect, state: ObsWorldState): boolean {
  const band = OBSERVATORY_FLOORS[roomId];
  // Walkable area = the room's floor band plus every OPEN door sill. A body may
  // straddle the seam between them (that is what walking through a sill is).
  const regions: ObsRect[] = [band, ...observatoryAlcoves(roomId)
    .filter((alcove) => observatoryDoorOpen(alcove.doorId, state))
    .map((alcove) => alcove.threshold)];
  const samples = [
    { x: body.x, y: body.y }, { x: body.x + body.width, y: body.y },
    { x: body.x, y: body.y + body.height }, { x: body.x + body.width, y: body.y + body.height },
    { x: body.x + body.width / 2, y: body.y + body.height / 2 },
  ];
  return samples.every((point) => regions.some((region) => point.x >= region.x - 0.01
    && point.x <= region.x + region.width + 0.01
    && point.y >= region.y - 0.01
    && point.y <= region.y + region.height + 0.01));
}

export function isObservatoryPositionSafe(
  roomId: ObservatoryRoomKey,
  center: ObsPoint,
  state: ObsWorldState,
  occupied: readonly ObsRect[] = [],
): boolean {
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return false;
  const body = observatoryBody(center);
  if (!observatoryFloorAllows(roomId, body, state)) return false;
  return !observatorySolidRects(roomId, state, occupied).some((solid) => rectsOverlap(body, solid));
}

/** Restores may never leave Nhinh standing on the retractable root bridge. */
export function isObservatoryRestoreSafe(
  roomId: ObservatoryRoomKey,
  center: ObsPoint,
  state: ObsWorldState,
): boolean {
  if (!isObservatoryPositionSafe(roomId, center, state)) return false;
  if (roomId !== 'observatory') return true;
  return !rectsOverlap(observatoryBody(center), OBSERVATORY_BRIDGE_LANE);
}

export function nearestSafeObservatorySpawn(
  roomId: ObservatoryRoomKey,
  point: ObsPoint | undefined,
  state: ObsWorldState,
  spawns: readonly { id: string; position: ObsPoint }[],
): ObsPoint {
  if (point && isObservatoryRestoreSafe(roomId, point, state)) return { x: point.x, y: point.y };
  const sorted = [...spawns].sort((a, b) => (point
    ? Math.hypot(a.position.x - point.x, a.position.y - point.y) - Math.hypot(b.position.x - point.x, b.position.y - point.y)
    : 0));
  for (const spawn of sorted) {
    if (isObservatoryRestoreSafe(roomId, spawn.position, state)) return { ...spawn.position };
  }
  const band = OBSERVATORY_FLOORS[roomId];
  const fallback = { x: Math.round(band.x + 64), y: Math.round(band.y + band.height - 46) };
  return isObservatoryRestoreSafe(roomId, fallback, state) ? fallback : { x: round1(band.x + 64), y: round1(band.y) };
}

function round1(value: number): number {
  return Math.round(value);
}

/* ------------------------------------------------------------------ *
 * Interaction approach rules (RULE_GAMES.md)
 * ------------------------------------------------------------------ */

export function observatoryFeet(center: ObsPoint): ObsPoint {
  return { x: center.x, y: center.y + OBSERVATORY_BODY.feetY };
}

/** RULE_GAMES 1: a standing prop answers from every side within this many px of its outer edge (foot body to rect). */
export const OBSERVATORY_REACH_GAP = 8;

/** Standing south-approach props answer from every side (RULE_GAMES 1). Flat ground mounts, the side and gate exceptions keep their rules. */
/** Wall-mounted controls (RULE_GAMES 2): masonry sits between them and the floor, so they keep the south-edge radius. */
const OBSERVATORY_WALL_CONTROL_IDS: readonly string[] = ['door-a-control'];

export function isObservatoryStandingProp(element: ObsElement): boolean {
  return element.approach === 'south' && element.mount !== 'ground' && !OBSERVATORY_WALL_CONTROL_IDS.includes(element.id);
}

/** The `reach` footprint of a standing prop: its solid rectangle, answered from any side within OBSERVATORY_REACH_GAP. */
export function observatoryStandingReach(element: ObsElement): { rect: ObsRect; face: 'any'; maxGap: number } {
  return { rect: observatoryElementSolid(element), face: 'any', maxGap: OBSERVATORY_REACH_GAP };
}

/** Euclidean gap between the foot body at `center` and a rect; 0 when they touch or overlap. */
function observatoryFootGap(center: ObsPoint, rect: ObsRect): number {
  const foot = observatoryBody(center);
  const dx = Math.max(foot.x - (rect.x + rect.width), rect.x - (foot.x + foot.width), 0);
  const dy = Math.max(foot.y - (rect.y + rect.height), rect.y - (foot.y + foot.height), 0);
  return Math.hypot(dx, dy);
}

/**
 * ONE OWNER PER POSITION: among the standing props of one room, the one whose outer edge is nearest the foot owns it.
 * Ties go to the first listed. Overlapping reach zones never answer for two props at once.
 */
export function observatoryReachOwner(id: string, center: ObsPoint, footprints: Readonly<Record<string, ObsRect>>): boolean {
  let owner: string | null = null;
  let best = Infinity;
  for (const [other, rect] of Object.entries(footprints)) {
    const gap = observatoryFootGap(center, rect);
    if (gap < best) { owner = other; best = gap; }
  }
  return owner === id;
}

/** True only when the player stands at the object's south edge (or its allowed side). */
export function isObservatoryApproachAllowed(element: ObsElement, center: ObsPoint): boolean {
  const feet = observatoryFeet(center);
  const solid = observatoryElementSolid(element);
  if (element.approach === 'gate') return true;
  if (element.approach === 'side') {
    if (feet.y < solid.y + 4 || feet.y > solid.y + solid.height - 4) return false;
    return feet.x <= solid.x + 6 || feet.x >= solid.x + solid.width - 6;
  }
  // Default: the trigger only appears when the body is in front of (south of)
  // the object's south edge, and inside the object's horizontal span.
  if (feet.y < solid.y + solid.height - 6) return false;
  if (center.y > solid.y + solid.height + 34) return false;
  return center.x >= solid.x - 12 && center.x <= solid.x + solid.width + 12;
}

/** Door arches use the documented gate exception: the body approaches from inside. */
export function isObservatoryGateApproachAllowed(alcove: ObsAlcove, center: ObsPoint): boolean {
  const body = observatoryBody(center);
  if (rectsOverlap(body, alcove.threshold)) return true;
  return Math.hypot(center.x - alcove.trigger.x, center.y - alcove.trigger.y) <= alcove.triggerRadius;
}

/* ------------------------------------------------------------------ *
 * Locked-door feedback and guidance text (plain Vietnamese)
 * ------------------------------------------------------------------ */

export function observatoryDoorBlockReason(doorId: ObservatoryDoorKey, state: ObsWorldState): string {
  if (observatoryDoorOpen(doorId, state)) return '';
  if (doorId === 'door-a') {
    if (!state.lanternPlaced) return tr('Đặt đèn đang bật lên bệ đá trước.');
    return tr('Đưa G0 về nấc 0 để tia sáng chiếu vào mắt cửa A.');
  }
  if (doorId === 'sun-door') {
    if (!state.lanternPlaced) return tr('Đặt đèn lên bệ đá ở tiền sảnh trước.');
    if (!state.lumoAtSeal) return tr('Gọi Lumo tới ấn ở hành lang phòng sao và để Lumo giữ ấn.');
    if (state.mirrors.g0 !== 1) return tr('Xoay G0 sang nấc 1 để tia đi qua ống tới ấn.');
    if (state.mirrors.g1 !== 2) return tr('Xoay G1 sang nấc 2 để tia phản chiếu tới G2.');
    return tr('Đưa G2 vào nấc 0 (chiếu thẳng khóa Nhật) hoặc nấc 1 (qua khung chia tia).');
  }
  if (!state.bridgeCrossed) return tr('Phải qua cầu rễ sang bờ bên kia trước.');
  if (!state.finalDoorLatched) return tr('Gài chốt cửa cuối trên bờ bên kia trước.');
  // Nothing is missing: the remaining step is the control itself, so the line
  // has to name it instead of restating that the loop is shut.
  return tr('Nhấn E tại đây để mở lối đá vòng.');
}

export function observatoryBridgeBlockReason(state: ObsWorldState): string {
  if (state.bridgeEligible) return '';
  if (!state.sunDoorUnlocked) return tr('Khóa Nhật chưa sáng: cần tia sáng đi tới đó.');
  if (!state.lumoAtSeal) return tr('Lumo chưa giữ ấn ở hành lang phòng sao.');
  if (!state.rootBedShadowed) return tr('Luống rễ còn sáng: xoay mặt rộng của tượng che nhánh giữa.');
  return tr('Cầu rễ chưa thành hình.');
}

/** Steps still missing before the record opens, in play order (Lumo's presence is checked separately). */
export function observatoryRecordMissing(state: ObsWorldState): string[] {
  const missing: string[] = [];
  if (!state.returnLoopOpen) missing.push(tr('mở lối đá vòng'));
  if (!state.lanternRetrieved || state.lanternPlaced) missing.push(tr('thu hồi đèn về tay'));
  if (!state.lumoRecalled || state.lumoAtSeal) missing.push(tr('gọi Lumo về bên đèn'));
  return missing;
}

/**
 * Why the record will not open, or '' when it will. Scenario v2 §5: the record only opens when Lumo stands beside
 * Nhinh; until then the record answers "Lumo nên nghe cùng mình."
 */
export function observatoryRecordBlockReason(state: ObsWorldState): string {
  if (state.recordRead) return '';
  const missing = observatoryRecordMissing(state);
  if (missing.length) return tr('Bản ghi chưa mở. Còn cần: {missing}.', { missing: missing.join(tr(' và ')) });
  if (!state.lumoBeside) return tr(OBSERVATORY_RECORD_NEEDS_LUMO);
  return '';
}

/** Scenario v2 §5: the record's answer while Lumo is not beside Nhinh. */
export const OBSERVATORY_RECORD_NEEDS_LUMO = 'Lumo nên nghe cùng mình.';

/** The star chart margin: a passive trigger for the ink line, centred on the table's upper face. */
export const OBSERVATORY_MARGIN_TRIGGER = { x: 320, y: 262, radius: 60 } as const;

/** Lumo must be in the same room as Nhinh and this close to her to count as beside her. */
export const OBSERVATORY_LUMO_BESIDE_RADIUS = 56;

/** Pure form of the "beside" test, shared by the runtime and the checks. */
export function observatoryLumoBeside(lumo: ObsPoint & { roomId: ObservatoryRoomKey } | null, player: ObsPoint & { roomId: ObservatoryRoomKey }): boolean {
  if (!lumo || lumo.roomId !== player.roomId) return false;
  return Math.hypot(lumo.x - player.x, lumo.y - player.y) <= OBSERVATORY_LUMO_BESIDE_RADIUS;
}

export function observatoryFinalDoorBlockReason(state: ObsWorldState): string {
  if (!state.bridgeCrossed) return tr('Chốt cửa cuối nằm ở bờ bên kia của phòng thiên văn: qua cầu rễ trước.');
  if (!observatoryCompletionReady(state)) return tr('Chưa thể rời đài. Còn cần: {missing}.', { missing: observatoryCompletionMissing(state).join(', ') });
  return '';
}

/** Remaining completion steps in play order; the first one is what a prompt or objective names. */
export function observatoryCompletionMissing(state: ObsWorldState): string[] {
  const missing: string[] = [];
  if (!state.finalDoorLatched) missing.push(tr('gài chốt cửa cuối'));
  if (!state.returnLoopOpen) missing.push(tr('mở lối đá vòng'));
  if (!state.lanternRetrieved || state.lanternPlaced) missing.push(tr('thu hồi đèn về tay'));
  if (!state.lumoRecalled || state.lumoAtSeal) missing.push(tr('gọi Lumo về bên đèn'));
  if (!state.recordRead) missing.push(tr('đọc bản ghi cuối'));
  if (!state.crystalTaken) missing.push(tr('nhận Tinh thể Cân Bằng'));
  return missing;
}

export function observatoryCompletionReady(state: ObsWorldState): boolean {
  return observatoryCompletionMissing(state).length === 0;
}

/* ------------------------------------------------------------------ *
 * HUD guidance (objective row, hint ladder, status row)
 * ------------------------------------------------------------------ */

export interface ObsGuidance {
  objective: string;
  status: string;
  hints: readonly string[];
  lumo: string;
}

export function observatoryGuidance(roomId: ObservatoryRoomKey, state: ObsWorldState): ObsGuidance {
  return {
    objective: observatoryObjective(roomId, state),
    status: observatoryStatus(roomId, state),
    hints: observatoryHints(roomId, state),
    lumo: state.lumoAtSeal ? tr('LUMO · đang giữ ấn')
      : state.lumoRecalled ? tr('LUMO · đã trở lại')
        : tr('LUMO · E gọi tới ấn / trở về'),
  };
}

const ROOM_NAME: Record<ObservatoryRoomKey, string> = { entrance: 'tiền sảnh', corridor: 'hành lang phòng sao', observatory: 'phòng thiên văn' };

/**
 * Objective row (scenario v2 HUD): only the goal, in three phases. Placement, mirror notches and door states are
 * never printed here; the H ladder names the next step when the player asks for it.
 */
export function observatoryObjective(roomId: ObservatoryRoomKey, state: ObsWorldState): string {
  if (state.crystalTaken) {
    return roomId === 'observatory'
      ? tr('Nhấn E ở chốt cửa cuối (tường phía bắc, bờ bên kia) để trở về Cây Mẹ.')
      : tr('Quay lại chốt cửa cuối ở phòng thiên văn và nhấn E để trở về Cây Mẹ.');
  }
  if (state.recordRead) return tr('Nhận tinh thể và lấy lại đèn.');
  if (state.observatoryReached) return tr('Đi cùng Lumo tới bản ghi.');
  return tr('Mở đường tới phòng thiên văn.');
}

/** Status row (scenario v2 HUD): the room and the lamp only. No notch numbers, no door states. */
export function observatoryStatus(roomId: ObservatoryRoomKey, state: ObsWorldState): string {
  const lamp = state.lanternPlaced ? tr('trên bệ') : tr('trong tay');
  return tr('Phòng: {room} · Đèn: {lamp} ({lit})', { room: tr(ROOM_NAME[roomId]), lamp, lit: state.lanternOn ? tr('bật') : tr('tắt') });
}

/**
 * Scenario 09 §7, Mức 1-3 verbatim: one H ladder for the whole network solve (lamp placed, bridge not yet
 * crossed). Stage-specific lines stay only where §7 allows them: the lamp placement step before the network
 * starts, the bridge/final-door step, and the post-solve record and crystal states.
 */
const OBSERVATORY_NETWORK_LADDER: readonly string[] = [
  'Xem các đường nối trên tường. G0 dùng cho cả cửa vào lẫn đường tia tới phòng sao.',
  'Giữ cửa vào bằng chốt rồi đổi nguồn sang phòng sao. Cửa cuối cần sáng, nhưng rễ cần bóng của tượng.',
  'Gài cửa A, gọi tôi tới ấn, hướng G0 qua G1 tới G2. Chọn đường G2 qua khung tượng, giữ luống rễ trong bóng tượng khi mạch đèn vẫn nối qua cửa, rồi qua cầu và mở lối vòng.',
];

export function observatoryHints(roomId: ObservatoryRoomKey, state: ObsWorldState): readonly string[] {
  if (state.crystalTaken) {
    return [tr('Tinh thể đã nằm trong tay.'), tr('Chốt cửa cuối ở phòng thiên văn sẽ đưa Nhinh về Cây Mẹ.'),
      tr('Quay lại chốt cửa cuối và nhấn E.')];
  }
  if (state.recordRead) {
    return [tr('The Shadow đã đặt tinh thể vào vòng trăng.'), tr('Tinh thể nằm ở bờ bên kia của phòng thiên văn.'),
      tr('Đứng trước vòng trăng và nhấn E để nhận Tinh thể Cân Bằng.')];
  }
  if (state.returnLoopOpen && state.lumoRecalled && state.lanternRetrieved) {
    return [tr('Lối đá vòng đã mở, đèn đã về tay và Lumo đã trở lại.'), tr('Lumo phải đứng cạnh cậu khi cậu đọc bản ghi cuối.'),
      tr('Đi theo lối vòng tới bàn ghi và nhấn E để đọc.')];
  }
  if (state.returnLoopOpen) {
    return [tr('Lối đá vòng nối phòng thiên văn với tiền sảnh, dùng được cả khi mạng sáng đã tắt.'),
      state.lanternPlaced ? tr('Đèn còn trên bệ: theo lối vòng về tiền sảnh và thu hồi đèn bằng E.') : tr('Lumo còn ở ấn: gọi Lumo trở về bên đèn bằng E.'),
      tr('Lối đá vòng ở bờ bên kia của phòng thiên văn.')];
  }
  if (state.bridgeCrossed) {
    return [tr('Nhinh đã qua cầu sang bờ bên kia của phòng thiên văn.'),
      state.finalDoorLatched ? tr('Lối vòng có thể mở ngay trên bệ đá này bằng E.') : tr('Chốt cửa cuối nằm ở bức tường phía bắc bờ bên kia.'),
      state.finalDoorLatched ? tr('Mở lối đá vòng rồi thu hồi đèn, gọi Lumo về, đọc bản ghi và nhận tinh thể.') : tr('Đứng trước chốt và nhấn E để gài cửa cuối.')];
  }
  if (!state.lanternPlaced) {
    return [tr('Xem các đường nối trên tường: một nguồn sáng chạy qua cả ba phòng.'),
      tr('Đèn phải nằm trên bệ đá ở tiền sảnh thì mạng sáng mới hoạt động.'),
      tr('Đứng trước bệ đá ở tiền sảnh và nhấn E để đặt đèn.')];
  }
  return OBSERVATORY_NETWORK_LADDER;
}

/** Prompt labels for every authored control; disabled gates always explain themselves. */
export function observatoryPrompt(id: string, state: ObsWorldState): string {
  switch (id) {
    case 'lantern-pedestal':
      return state.lanternPlaced ? tr('E · Thu hồi đèn về tay')
        : state.lanternOn ? tr('E · Đặt đèn lên bệ') : tr('E · Bật đèn bằng F rồi đặt lên bệ');
    case 'g0': return tr('E · Xoay G0 (nấc {step}/3)', { step: state.mirrors.g0 });
    case 'g1': return tr('E · Xoay G1 (nấc {step}/3)', { step: state.mirrors.g1 });
    case 'g2': return tr('E · Xoay G2 (nấc {step}/3)', { step: state.mirrors.g2 });
    case 'statue': return tr('E · Xoay tượng (hướng {step}/3)', { step: state.statue });
    case 'learned-marks': return tr('E · Xem lại các dấu đã học');
    case 'splitter':
      return state.activeBeamRoute === 'g2-split'
        ? tr('Khung chia tia đang nhận tia')
        : tr('E · Xem khung chia tia');
    case 'sun-lock':
      return state.sunDoorUnlocked ? tr('Khóa Nhật đang sáng') : tr('E · Kiểm tra khóa Nhật');
    case 'lumo-tube':
      return state.lumoAtSeal ? tr('E · Gọi Lumo trở về bên đèn') : tr('E · Gọi Lumo qua ống tới ấn');
    case 'lumo-seal':
      return state.lumoAtSeal ? tr('Lumo đang giữ ấn') : tr('E · Gọi Lumo tới ấn này');
    case 'door-a-control':
      if (state.doorALatched) return tr('Chốt cửa A đã gài');
      if (!state.doorAUnlocked) return tr('E · Kiểm tra chốt cửa A — {reason}', { reason: observatoryDoorBlockReason('door-a', state) });
      return tr('E · Gài chốt cửa A từ bên trong');
    case 'sun-door-control':
      return observatoryDoorOpen('sun-door', state) ? tr('Cửa Mặt Trời đang mở') : tr('E · Kiểm tra cửa Mặt Trời — {reason}', { reason: observatoryDoorBlockReason('sun-door', state) });
    case 'root-bed':
      return state.bridgeEligible ? tr('Luống rễ đã kết thành cầu')
        : tr('E · Xem luống rễ — {reason}', { reason: observatoryBridgeBlockReason(state) });
    case 'final-door-control':
      if (!state.finalDoorLatched) return state.bridgeCrossed ? tr('E · Gài chốt cửa cuối') : tr('E · Chốt cửa cuối (qua cầu rễ trước)');
      return observatoryCompletionReady(state) ? tr('E · Trở về Cây Mẹ') : tr('E · Cửa cuối đã gài — còn cần: {step}', { step: observatoryCompletionMissing(state)[0] });
    case 'stone-return-loop':
      return state.returnLoopOpen ? tr('Lối đá vòng đã mở') : tr('E · Mở lối đá vòng — {reason}', { reason: observatoryDoorBlockReason('return-loop', state) });
    case 'final-record':
      return state.recordRead ? tr('E · Đọc lại bản ghi cuối') : tr('E · Đọc bản ghi cuối — {reason}', { reason: observatoryRecordBlockReason(state) || tr('nhấn E để đọc') });
    case 'balance-crystal':
      return state.crystalTaken ? tr('Tinh thể đã được nhận') : tr('E · Nhận Tinh thể Cân Bằng');
    default: return '';
  }
}
