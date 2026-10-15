/**
 * Authored layout and named route data for the three-room Level 09 Observatory.
 * All positions are in the fixed 640×360 room coordinate system.
 */
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
  interactionPoint: RoomPoint;
  destinationSpawnId: string;
  /** If true, the door can be latched from this side after entering. */
  latchControl?: RoomPoint;
}

export type ObservatoryObstacleKind = 'pillar' | 'furniture' | 'statue' | 'root-bed';

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
  | 'door-a-control'
  | 'g1'
  | 'lumo-tube'
  | 'lumo-seal'
  | 'sun-door-control'
  | 'g2'
  | 'splitter'
  | 'statue'
  | 'sun-lock'
  | 'root-bed'
  | 'root-bridge'
  | 'final-door-control'
  | 'stone-return-loop'
  | 'final-record'
  | 'balance-crystal';

export type ObservatoryInteractableKind =
  | 'pedestal'
  | 'mirror'
  | 'door-control'
  | 'tube'
  | 'seal'
  | 'splitter'
  | 'statue'
  | 'lock'
  | 'roots'
  | 'bridge'
  | 'record'
  | 'crystal';

export interface ObservatoryInteractable {
  id: ObservatoryInteractableId;
  kind: ObservatoryInteractableKind;
  position: RoomPoint;
  /** The E interaction is registered here, which may be offset from the art. */
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

export const OBSERVATORY_ROOMS: Record<ObservatoryRoomId, ObservatoryRoomDefinition> = {
  entrance: {
    id: 'entrance',
    title: 'Entrance Hall',
    width: 640,
    height: 360,
    backgroundBiome: 'observatory',
    entrySpawnId: 'entrance-start',
    spawns: [
      { id: 'entrance-start', position: { x: 72, y: 180 }, safe: true },
      { id: 'entrance-from-corridor', position: { x: 566, y: 180 }, safe: true },
      { id: 'entrance-from-return-loop', position: { x: 238, y: 224 }, safe: true },
    ],
    exits: [{
      id: 'entrance-to-corridor', doorId: 'door-a', fromRoom: 'entrance', toRoom: 'corridor',
      interactionPoint: { x: 602, y: 180 }, destinationSpawnId: 'corridor-from-entrance',
    }],
    obstacles: [
      { id: 'entrance-north-pillar', kind: 'pillar', x: 24, y: 44, width: 30, height: 54 },
      { id: 'entrance-south-pillar', kind: 'pillar', x: 24, y: 262, width: 30, height: 54 },
      { id: 'pedestal-base', kind: 'furniture', x: 148, y: 150, width: 46, height: 44 },
    ],
    interactables: [
      { id: 'lantern-pedestal', kind: 'pedestal', position: { x: 170, y: 166 }, interactionPoint: { x: 170, y: 202 }, textureKey: 'pedestal_empty', label: 'Lantern pedestal' },
      { id: 'g0', kind: 'mirror', position: { x: 448, y: 146 }, interactionPoint: { x: 448, y: 184 }, textureKey: 'mirror_0', label: 'G0' },
      { id: 'door-a-control', kind: 'door-control', position: { x: 560, y: 142 }, interactionPoint: { x: 555, y: 190 }, label: 'Door A' },
    ],
    waypoints: [
      { id: 'lantern-source', position: { roomId: 'entrance', x: 170, y: 154 } },
      { id: 'door-a-eye', position: { roomId: 'entrance', x: 586, y: 145 } },
    ],
  },
  corridor: {
    id: 'corridor',
    title: 'Star-map Corridor',
    width: 640,
    height: 360,
    backgroundBiome: 'library',
    entrySpawnId: 'corridor-from-entrance',
    spawns: [
      { id: 'corridor-from-entrance', position: { x: 42, y: 180 }, safe: true },
      { id: 'corridor-from-observatory', position: { x: 596, y: 180 }, safe: true },
    ],
    exits: [
      {
        id: 'corridor-to-entrance', doorId: 'door-a', fromRoom: 'corridor', toRoom: 'entrance',
        interactionPoint: { x: 24, y: 180 }, destinationSpawnId: 'entrance-from-corridor',
        latchControl: { x: 72, y: 180 },
      },
      {
        id: 'corridor-to-observatory', doorId: 'sun-door', fromRoom: 'corridor', toRoom: 'observatory',
        interactionPoint: { x: 616, y: 180 }, destinationSpawnId: 'observatory-from-corridor',
      },
    ],
    obstacles: [
      { id: 'corridor-north-pillar', kind: 'pillar', x: 180, y: 22, width: 34, height: 48 },
      { id: 'corridor-south-pillar', kind: 'pillar', x: 180, y: 290, width: 34, height: 48 },
      { id: 'star-map-table', kind: 'furniture', x: 282, y: 250, width: 88, height: 30 },
    ],
    interactables: [
      { id: 'g1', kind: 'mirror', position: { x: 235, y: 136 }, interactionPoint: { x: 235, y: 176 }, textureKey: 'mirror_1', label: 'G1' },
      { id: 'lumo-tube', kind: 'tube', position: { x: 105, y: 78 }, interactionPoint: { x: 105, y: 112 }, label: 'Lumo tube' },
      { id: 'lumo-seal', kind: 'seal', position: { x: 320, y: 80 }, interactionPoint: { x: 320, y: 112 }, label: 'Lumo seal' },
      { id: 'door-a-control', kind: 'door-control', position: { x: 68, y: 142 }, interactionPoint: { x: 72, y: 180 }, label: 'Door A latch' },
      { id: 'sun-door-control', kind: 'door-control', position: { x: 568, y: 142 }, interactionPoint: { x: 560, y: 180 }, label: 'Sun Door' },
    ],
    waypoints: [
      { id: 'g1', position: { roomId: 'corridor', x: 235, y: 136 } },
      { id: 'lumo-tube-entry', position: OBSERVATORY_LUMO_WAYPOINTS['lumo-tube-entry'] },
      { id: 'lumo-seal', position: OBSERVATORY_LUMO_WAYPOINTS['lumo-seal'] },
    ],
  },
  observatory: {
    id: 'observatory',
    title: 'Observatory',
    width: 640,
    height: 360,
    backgroundBiome: 'ruins',
    entrySpawnId: 'observatory-from-corridor',
    spawns: [
      { id: 'observatory-from-corridor', position: { x: 44, y: 180 }, safe: true },
      { id: 'observatory-near-bridge', position: { x: 270, y: 276 }, safe: true },
      { id: 'observatory-far-bank', position: { x: 470, y: 276 }, safe: true },
    ],
    exits: [
      {
        id: 'observatory-to-corridor', doorId: 'sun-door', fromRoom: 'observatory', toRoom: 'corridor',
        interactionPoint: { x: 24, y: 180 }, destinationSpawnId: 'corridor-from-observatory',
      },
      {
        id: 'observatory-return-loop-to-entrance', doorId: 'return-loop', fromRoom: 'observatory', toRoom: 'entrance',
        interactionPoint: { x: 520, y: 316 }, destinationSpawnId: 'entrance-from-return-loop',
      },
    ],
    obstacles: [
      { id: 'observatory-west-pillar', kind: 'pillar', x: 74, y: 28, width: 34, height: 48 },
      { id: 'observatory-east-pillar', kind: 'pillar', x: 578, y: 28, width: 34, height: 48 },
      { id: 'observatory-statue', kind: 'statue', x: 292, y: 122, width: 44, height: 62 },
      { id: 'root-bed', kind: 'root-bed', x: 330, y: 220, width: 132, height: 54, dynamic: true },
    ],
    interactables: [
      { id: 'g2', kind: 'mirror', position: { x: 144, y: 118 }, interactionPoint: { x: 144, y: 158 }, textureKey: 'mirror_2', label: 'G2' },
      { id: 'splitter', kind: 'splitter', position: { x: 240, y: 112 }, interactionPoint: { x: 240, y: 158 }, label: 'Fixed splitter' },
      { id: 'statue', kind: 'statue', position: { x: 314, y: 128 }, interactionPoint: { x: 314, y: 192 }, textureKey: 'guardian_statue', label: 'Statue' },
      { id: 'sun-lock', kind: 'lock', position: { x: 520, y: 96 }, interactionPoint: { x: 520, y: 132 }, textureKey: 'lock_sun_off', label: 'Sun lock' },
      { id: 'root-bed', kind: 'roots', position: { x: 396, y: 244 }, interactionPoint: { x: 396, y: 288 }, label: 'Root bed' },
      { id: 'root-bridge', kind: 'bridge', position: { x: 398, y: 300 }, interactionPoint: { x: 398, y: 326 }, label: 'Root bridge' },
      { id: 'final-door-control', kind: 'door-control', position: { x: 552, y: 226 }, interactionPoint: { x: 552, y: 260 }, label: 'Final door latch' },
      { id: 'stone-return-loop', kind: 'door-control', position: { x: 552, y: 282 }, interactionPoint: { x: 520, y: 316 }, label: 'Stone return loop' },
      { id: 'final-record', kind: 'record', position: { x: 488, y: 166 }, interactionPoint: { x: 488, y: 204 }, textureKey: 'ruins_altar', label: 'Final record' },
      { id: 'balance-crystal', kind: 'crystal', position: { x: 574, y: 164 }, interactionPoint: { x: 574, y: 204 }, textureKey: 'crystal_balance', label: 'Balance Crystal' },
    ],
    waypoints: [
      { id: 'g2', position: { roomId: 'observatory', x: 144, y: 118 } },
      { id: 'sun-lock', position: { roomId: 'observatory', x: 520, y: 96 } },
      { id: 'splitter', position: { roomId: 'observatory', x: 240, y: 112 } },
      { id: 'root-branch', position: { roomId: 'observatory', x: 396, y: 244 } },
    ],
  },
};
