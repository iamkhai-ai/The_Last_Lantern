/**
 * Authored layout and named route data for the three-room Level 09 Observatory.
 * All positions are in the fixed 640×360 room coordinate system.
 *
 * Static collision footprints (walls and standing props) are derived from
 * `observatoryLayout.ts` so the drawn art, the Arcade bodies, the pure restore
 * predicate and `scripts/check-observatory.mjs` all consume one rectangle set.
 */
import {
  OBSERVATORY_ELEMENTS,
  OBSERVATORY_FINAL_DOOR_HEAD,
  OBSERVATORY_ROOT_BED,
  OBSERVATORY_WALLS,
  observatoryAlcove,
  observatoryElementSolids,
  type ObsRect,
} from './observatoryLayout.ts';

export type ObservatoryRoomId = 'entrance' | 'corridor' | 'observatory';

export interface RoomPoint {
  x: number;
  y: number;
}

export interface ObservatoryRoomPoint extends RoomPoint {
  roomId: ObservatoryRoomId;
}

export interface ObservatorySpawn {
  id: string;
  position: RoomPoint;
  safe: true;
}

export type ObservatoryDoorId = 'door-a' | 'sun-door' | 'return-loop';

export interface ObservatoryExit {
  id: string;
  doorId: ObservatoryDoorId;
  fromRoom: ObservatoryRoomId;
  toRoom: ObservatoryRoomId;
  /** Deep alcove trigger used by the room transition. */
  interactionPoint: RoomPoint;
  destinationSpawnId: string;
  /** Room-facing control that explains a locked door and latches Door A. */
  inspectPoint?: RoomPoint;
  /** If true, the door can be latched from this side after entering. */
  latchControl?: RoomPoint;
}

export type ObservatoryObstacleKind = 'wall' | 'pillar' | 'furniture' | 'statue' | 'root-bed';

export interface ObservatoryObstacle {
  id: string;
  kind: ObservatoryObstacleKind;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Dynamic obstacles are activated by puzzle state instead of on room build. */
  dynamic?: boolean;
}

export type ObservatoryInteractableId =
  | 'lantern-pedestal'
  | 'g0'
  | 'learned-marks'
  | 'g1'
  | 'lumo-tube'
  | 'lumo-seal'
  | 'sun-door-control'
  | 'g2'
  | 'splitter'
  | 'statue'
  | 'sun-lock'
  | 'root-bed'
  | 'final-door-control'
  | 'stone-return-loop'
  | 'final-record'
  | 'balance-crystal';

export type ObservatoryInteractableKind =
  | 'pedestal'
  | 'mirror'
  | 'marks'
  | 'door-control'
  | 'tube'
  | 'seal'
  | 'splitter'
  | 'statue'
  | 'lock'
  | 'roots'
  | 'record'
  | 'crystal';

export interface ObservatoryInteractable {
  id: ObservatoryInteractableId;
  kind: ObservatoryInteractableKind;
  /** Ground anchor (bottom-centre) of the drawn art; equals the element anchor. */
  position: RoomPoint;
  /** The E interaction is registered here: the object's south edge (RULE_GAMES). */
  interactionPoint: RoomPoint;
  textureKey?: string;
  label: string;
}

export type ObservatoryWaypointId =
  | 'lantern-source'
  | 'door-a-eye'
  | 'g1'
  | 'g2'
  | 'sun-lock'
  | 'splitter'
  | 'root-branch'
  | 'lumo-tube-entry'
  | 'lumo-seal';

export interface ObservatoryWaypoint {
  id: ObservatoryWaypointId;
  position: ObservatoryRoomPoint;
}

export interface ObservatoryRoomDefinition {
  id: ObservatoryRoomId;
  title: string;
  width: 640;
  height: 360;
  backgroundBiome: 'observatory' | 'library' | 'ruins';
  entrySpawnId: string;
  spawns: readonly ObservatorySpawn[];
  exits: readonly ObservatoryExit[];
  obstacles: readonly ObservatoryObstacle[];
  interactables: readonly ObservatoryInteractable[];
  waypoints: readonly ObservatoryWaypoint[];
}

export type ObservatoryBeamRouteId =
  | 'off'
  | 'door-a'
  | 'g0-to-g1'
  | 'g0-to-g2'
  | 'g2-direct-sun'
  | 'g2-split';

export interface ObservatoryBeamRouteDefinition {
  id: Exclude<ObservatoryBeamRouteId, 'off'>;
  /** Required four-way saved mirror indices for the named path. */
  mirrorRotations: Partial<Record<'g0' | 'g1' | 'g2', number>>;
  /** Ordered room-local waypoints before a route ends or divides. */
  waypointIds: readonly ObservatoryWaypointId[];
  /** Parallel fixed outputs after the splitter, such as the Sun lock and roots. */
  branches?: readonly (readonly ObservatoryWaypointId[])[];
}

/**
 * Rotation convention: 0=east, 1=south, 2=west, 3=north; each interaction
 * advances clockwise by one quarter-turn. G0=0 aims at Door A, G0=1 at G1;
 * G1=2 reflects to G2; G2=0 aims directly at the Sun lock and G2=1 aims at
 * the splitter. In the split route, statue orientation 2 shadows the root bed.
 */
export const OBSERVATORY_BEAM_ROUTES: Record<Exclude<ObservatoryBeamRouteId, 'off'>, ObservatoryBeamRouteDefinition> = {
  'door-a': {
    id: 'door-a',
    mirrorRotations: { g0: 0 },
    waypointIds: ['lantern-source', 'door-a-eye'],
  },
  'g0-to-g1': {
    id: 'g0-to-g1',
    mirrorRotations: { g0: 1 },
    waypointIds: ['lantern-source', 'lumo-tube-entry', 'lumo-seal', 'g1'],
  },
  'g0-to-g2': {
    id: 'g0-to-g2',
    mirrorRotations: { g0: 1, g1: 2 },
    waypointIds: ['lantern-source', 'lumo-tube-entry', 'lumo-seal', 'g1', 'g2'],
  },
  'g2-direct-sun': {
    id: 'g2-direct-sun',
    mirrorRotations: { g0: 1, g1: 2, g2: 0 },
    waypointIds: ['lantern-source', 'lumo-tube-entry', 'lumo-seal', 'g1', 'g2', 'sun-lock'],
  },
  'g2-split': {
    id: 'g2-split',
    mirrorRotations: { g0: 1, g1: 2, g2: 1 },
    waypointIds: ['lantern-source', 'lumo-tube-entry', 'lumo-seal', 'g1', 'g2', 'splitter'],
    branches: [['sun-lock'], ['root-branch']],
  },
};

export const OBSERVATORY_LUMO_WAYPOINTS = {
  'lumo-tube-entry': { roomId: 'corridor', x: 105, y: 78 },
  'lumo-seal': { roomId: 'corridor', x: 320, y: 80 },
} as const satisfies Record<'lumo-tube-entry' | 'lumo-seal', ObservatoryRoomPoint>;

const wallObstacles = (roomId: ObservatoryRoomId): ObservatoryObstacle[] =>
  OBSERVATORY_WALLS[roomId].map((rect: ObsRect, index) => ({
    id: `${roomId}-wall-${index}`, kind: 'wall' as const, ...rect,
  }));

const propObstacles = (roomId: ObservatoryRoomId): ObservatoryObstacle[] =>
  observatoryElementSolids(roomId).map((rect, index) => ({
    id: `${roomId}-prop-${index}`, kind: 'furniture' as const, ...rect,
  }));

/**
 * Static solids for a room: permanent masonry plus the exact visible footprint
 * of every standing prop. Dynamic structures (door thresholds, the root bed and
 * the bridge lane) are supplied by `observatoryLayout` per live puzzle state.
 */
export const OBSERVATORY_STATIC_OBSTACLES: Record<ObservatoryRoomId, readonly ObservatoryObstacle[]> = {
  entrance: [...wallObstacles('entrance'), ...propObstacles('entrance')],
  corridor: [...wallObstacles('corridor'), ...propObstacles('corridor')],
  observatory: [
    ...wallObstacles('observatory'),
    ...propObstacles('observatory'),
    { id: 'observatory-root-bed', kind: 'root-bed', ...OBSERVATORY_ROOT_BED, dynamic: true },
    { id: 'observatory-final-door-head', kind: 'furniture', ...OBSERVATORY_FINAL_DOOR_HEAD, dynamic: true },
  ],
};

const element = (id: string): (typeof OBSERVATORY_ELEMENTS)[number] => {
  const found = OBSERVATORY_ELEMENTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Level 09 element geometry for ${id}`);
  return found;
};

const doorTrigger = (alcoveId: string): RoomPoint => {
  const alcove = observatoryAlcove(alcoveId);
  if (!alcove) throw new Error(`Missing Level 09 alcove ${alcoveId}`);
  return { ...alcove.trigger };
};

const doorInspect = (alcoveId: string): RoomPoint => {
  const alcove = observatoryAlcove(alcoveId);
  if (!alcove) throw new Error(`Missing Level 09 alcove ${alcoveId}`);
  return { ...alcove.inspect };
};

export const OBSERVATORY_ROOMS: Record<ObservatoryRoomId, ObservatoryRoomDefinition> = {
  entrance: {
    id: 'entrance',
    title: 'Tiền sảnh',
    width: 640,
    height: 360,
    backgroundBiome: 'observatory',
    entrySpawnId: 'entrance-start',
    spawns: [
      { id: 'entrance-start', position: { x: 100, y: 268 }, safe: true },
      { id: 'entrance-from-corridor', position: { x: 500, y: 180 }, safe: true },
      { id: 'entrance-from-return-loop', position: { x: 176, y: 268 }, safe: true },
    ],
    exits: [
      {
        id: 'entrance-to-corridor', doorId: 'door-a', fromRoom: 'entrance', toRoom: 'corridor',
        interactionPoint: doorTrigger('door-a-entrance'),
        inspectPoint: doorInspect('door-a-entrance'),
        destinationSpawnId: 'corridor-from-entrance',
      },
      {
        id: 'entrance-return-loop-to-observatory', doorId: 'return-loop', fromRoom: 'entrance', toRoom: 'observatory',
        interactionPoint: doorTrigger('return-loop-entrance'),
        inspectPoint: doorInspect('return-loop-entrance'),
        destinationSpawnId: 'observatory-far-bank',
      },
    ],
    obstacles: OBSERVATORY_STATIC_OBSTACLES.entrance,
    interactables: [
      { id: 'lantern-pedestal', kind: 'pedestal', position: element('lantern-pedestal').anchor, interactionPoint: element('lantern-pedestal').stand, textureKey: 'pedestal_empty', label: 'Bệ đèn' },
      { id: 'g0', kind: 'mirror', position: element('g0').anchor, interactionPoint: element('g0').stand, textureKey: 'mirror_0', label: 'G0' },
      { id: 'learned-marks', kind: 'marks', position: element('learned-marks').anchor, interactionPoint: element('learned-marks').stand, label: 'Mô hình các dấu đã học' },
    ],
    waypoints: [
      { id: 'lantern-source', position: { roomId: 'entrance', x: 188, y: 176 } },
      { id: 'door-a-eye', position: { roomId: 'entrance', x: 604, y: 168 } },
    ],
  },
  corridor: {
    id: 'corridor',
    title: 'Hành lang phòng sao',
    width: 640,
    height: 360,
    backgroundBiome: 'library',
    entrySpawnId: 'corridor-from-entrance',
    spawns: [
      { id: 'corridor-from-entrance', position: { x: 152, y: 180 }, safe: true },
      { id: 'corridor-from-observatory', position: { x: 516, y: 190 }, safe: true },
    ],
    exits: [
      {
        id: 'corridor-to-entrance', doorId: 'door-a', fromRoom: 'corridor', toRoom: 'entrance',
        interactionPoint: doorTrigger('door-a-corridor'), destinationSpawnId: 'entrance-from-corridor',
        latchControl: element('door-a-control').stand,
      },
      {
        id: 'corridor-to-observatory', doorId: 'sun-door', fromRoom: 'corridor', toRoom: 'observatory',
        interactionPoint: doorTrigger('sun-door-corridor'),
        inspectPoint: doorInspect('sun-door-corridor'),
        destinationSpawnId: 'observatory-from-corridor',
      },
    ],
    obstacles: OBSERVATORY_STATIC_OBSTACLES.corridor,
    interactables: [
      { id: 'g1', kind: 'mirror', position: element('g1').anchor, interactionPoint: element('g1').stand, textureKey: 'mirror_1', label: 'G1' },
      { id: 'lumo-tube', kind: 'tube', position: element('lumo-tube').anchor, interactionPoint: element('lumo-tube').stand, label: 'Ống dẫn Lumo' },
      { id: 'lumo-seal', kind: 'seal', position: element('lumo-seal').anchor, interactionPoint: element('lumo-seal').stand, label: 'Ấn Lumo' },
      { id: 'sun-door-control', kind: 'lock', position: element('sun-door-control').anchor, interactionPoint: element('sun-door-control').stand, label: 'Khóa Nhật' },
    ],
    waypoints: [
      { id: 'g1', position: { roomId: 'corridor', x: 240, y: 190 } },
      { id: 'lumo-tube-entry', position: OBSERVATORY_LUMO_WAYPOINTS['lumo-tube-entry'] },
      { id: 'lumo-seal', position: OBSERVATORY_LUMO_WAYPOINTS['lumo-seal'] },
    ],
  },
  observatory: {
    id: 'observatory',
    title: 'Phòng thiên văn',
    width: 640,
    height: 360,
    backgroundBiome: 'ruins',
    entrySpawnId: 'observatory-from-corridor',
    spawns: [
      { id: 'observatory-from-corridor', position: { x: 128, y: 200 }, safe: true },
      { id: 'observatory-near-bridge', position: { x: 280, y: 276 }, safe: true },
      { id: 'observatory-far-bank', position: { x: 452, y: 276 }, safe: true },
    ],
    exits: [
      {
        id: 'observatory-to-corridor', doorId: 'sun-door', fromRoom: 'observatory', toRoom: 'corridor',
        interactionPoint: doorTrigger('sun-door-observatory'),
        inspectPoint: doorInspect('sun-door-observatory'),
        destinationSpawnId: 'corridor-from-observatory',
      },
      {
        id: 'observatory-return-loop-to-entrance', doorId: 'return-loop', fromRoom: 'observatory', toRoom: 'entrance',
        interactionPoint: doorTrigger('return-loop-observatory'),
        inspectPoint: doorInspect('return-loop-observatory'),
        destinationSpawnId: 'entrance-from-return-loop',
      },
    ],
    obstacles: OBSERVATORY_STATIC_OBSTACLES.observatory,
    interactables: [
      { id: 'g2', kind: 'mirror', position: element('g2').anchor, interactionPoint: element('g2').stand, textureKey: 'mirror_2', label: 'G2' },
      { id: 'splitter', kind: 'splitter', position: element('splitter').anchor, interactionPoint: element('splitter').stand, label: 'Khung chia tia' },
      { id: 'statue', kind: 'statue', position: element('statue').anchor, interactionPoint: element('statue').stand, label: 'Tượng chắn sáng' },
      { id: 'sun-lock', kind: 'lock', position: element('sun-lock').anchor, interactionPoint: element('sun-lock').stand, label: 'Khóa Nhật' },
      { id: 'root-bed', kind: 'roots', position: element('root-bed').anchor, interactionPoint: element('root-bed').stand, label: 'Luống rễ' },
      { id: 'final-door-control', kind: 'door-control', position: element('final-door-control').anchor, interactionPoint: element('final-door-control').stand, label: 'Chốt cửa cuối' },
      { id: 'stone-return-loop', kind: 'door-control', position: element('stone-return-loop').anchor, interactionPoint: element('stone-return-loop').stand, label: 'Lối đá vòng' },
      { id: 'final-record', kind: 'record', position: element('final-record').anchor, interactionPoint: element('final-record').stand, textureKey: 'ruins_altar', label: 'Bản ghi cuối' },
      { id: 'balance-crystal', kind: 'crystal', position: element('balance-crystal').anchor, interactionPoint: element('balance-crystal').stand, textureKey: 'crystal_balance', label: 'Tinh thể Cân Bằng' },
    ],
    waypoints: [
      { id: 'g2', position: { roomId: 'observatory', x: 168, y: 226 } },
      { id: 'sun-lock', position: { roomId: 'observatory', x: 176, y: 133 } },
      { id: 'splitter', position: { roomId: 'observatory', x: 240, y: 220 } },
      { id: 'root-branch', position: { roomId: 'observatory', x: 362, y: 226 } },
    ],
  },
};
