import {
  OBSERVATORY_BEAM_ROUTES,
  OBSERVATORY_LUMO_WAYPOINTS,
  type ObservatoryBeamRouteId,
  type ObservatoryRoomPoint,
  type ObservatoryWaypointId,
} from '../data/observatoryRooms.ts';

export interface ObservatoryPuzzleInput {
  /** Four-way mirror rotations, where 0=east, 1=south, 2=west, 3=north. */
  mirrorRotations: {
    g0: number;
    g1: number;
    g2: number;
  };
  /** The statue blocks the splitter's root branch at orientation 2. */
  statueOrientation: number;
  lanternOn: boolean;
  lanternPlaced: boolean;
  /** Door A remains traversable after its inside latch is set. */
  doorALatched: boolean;
  /** The saved/live room-local Lumo position; null means he is in transit or absent. */
  lumoPosition: ObservatoryRoomPoint | null;
  /** Saved route target and arrival marker; proximity alone cannot hold the seal. */
  lumoRoute: {
    destinationWaypointId: ObservatoryWaypointId | null;
    arrivedAtWaypointId: ObservatoryWaypointId | null;
  };
  /** Durable: Lumo has reached the seal at least once (the tube and seal remember him). */
  sealRemembered: boolean;
}

export interface ObservatoryActiveBeamPath {
  routeId: ObservatoryBeamRouteId;
  waypointIds: readonly ObservatoryWaypointId[];
  branches?: readonly (readonly ObservatoryWaypointId[])[];
}

/**
 * The root bed's four authored states (scenario v2 §4, art families `root-bed`):
 * - dormant: no light reaches it;
 * - lit: amber light falls on it (direct Sun route, or the split route with the statue not shadowing it); no bridge;
 * - bridge: supply live, statue shadows the bed and Lumo holds the seal, so the bridge has grown;
 * - retracted-dark: Lumo has left the seal; the roots have drawn back and stay dark.
 */
export type ObservatoryRootState = 'dormant' | 'lit' | 'bridge' | 'retracted-dark';

export interface ObservatoryDerivedState {
  activeBeamPath: ObservatoryActiveBeamPath;
  doorAUnlocked: boolean;
  sunDoorUnlocked: boolean;
  rootBedShadowed: boolean;
  bridgeEligible: boolean;
  lumoAtSeal: boolean;
  /** The supply strip (pipe-run / pipe-drop) is live: lamp placed and lit, and Lumo holds the seal. */
  supplyLive: boolean;
  rootState: ObservatoryRootState;
}

const ROTATION_COUNT = 4;
/**
 * Lumo comes to rest at the seal waypoint with the authored hover offset
 * (-18, +12), i.e. 21.6px away. The seal must accept that resting pose, or the
 * whole beam network past Door A would read as unpowered while he visibly holds
 * the seal.
 */
const LUMO_SEAL_RADIUS = 28;

function normalizeRotation(rotation: number): number {
  return ((rotation % ROTATION_COUNT) + ROTATION_COUNT) % ROTATION_COUNT;
}

function isRouteAligned(routeId: Exclude<ObservatoryBeamRouteId, 'off'>, input: ObservatoryPuzzleInput): boolean {
  const expected = OBSERVATORY_BEAM_ROUTES[routeId].mirrorRotations;
  return Object.entries(expected).every(([mirror, rotation]) => {
    const actual = input.mirrorRotations[mirror as keyof ObservatoryPuzzleInput['mirrorRotations']];
    return normalizeRotation(actual) === rotation;
  });
}

function beamPath(routeId: Exclude<ObservatoryBeamRouteId, 'off'>): ObservatoryActiveBeamPath {
  const route = OBSERVATORY_BEAM_ROUTES[routeId];
  return { routeId: route.id, waypointIds: route.waypointIds, branches: route.branches };
}

function isLumoAtSeal(
  position: ObservatoryRoomPoint | null,
  route: ObservatoryPuzzleInput['lumoRoute'],
): boolean {
  if (route.destinationWaypointId !== 'lumo-seal' || route.arrivedAtWaypointId !== 'lumo-seal') return false;
  if (!position || position.roomId !== OBSERVATORY_LUMO_WAYPOINTS['lumo-seal'].roomId) return false;
  const seal = OBSERVATORY_LUMO_WAYPOINTS['lumo-seal'];
  return Math.hypot(position.x - seal.x, position.y - seal.y) <= LUMO_SEAL_RADIUS;
}

/**
 * Recompute Level 09 gates from the current puzzle inputs. This function has
 * no side effects, so saved derived flags can never become stale on reload.
 */
export function deriveObservatoryState(input: ObservatoryPuzzleInput): ObservatoryDerivedState {
  const lightAvailable = input.lanternOn && input.lanternPlaced;
  const lumoAtSeal = isLumoAtSeal(input.lumoPosition, input.lumoRoute);

  let activeBeamPath: ObservatoryActiveBeamPath = { routeId: 'off', waypointIds: [] };
  if (lightAvailable) {
    if (isRouteAligned('door-a', input)) {
      activeBeamPath = beamPath('door-a');
    } else if (lumoAtSeal && isRouteAligned('g2-split', input)) {
      activeBeamPath = beamPath('g2-split');
    } else if (lumoAtSeal && isRouteAligned('g2-direct-sun', input)) {
      activeBeamPath = beamPath('g2-direct-sun');
    } else if (lumoAtSeal && isRouteAligned('g0-to-g2', input)) {
      activeBeamPath = beamPath('g0-to-g2');
    } else if (lumoAtSeal && isRouteAligned('g0-to-g1', input)) {
      activeBeamPath = beamPath('g0-to-g1');
    }
  }

  const directSunRoute = activeBeamPath.routeId === 'g2-direct-sun';
  const splitRoute = activeBeamPath.routeId === 'g2-split';
  const sunDoorUnlocked = directSunRoute || splitRoute;
  const rootBedShadowed = splitRoute && normalizeRotation(input.statueOrientation) === 2;
  const bridgeEligible = sunDoorUnlocked && rootBedShadowed && lumoAtSeal;
  // Light reaches the roots through the direct route, or through the split route's middle branch when the statue
  // does not shadow it. Both routes already require Lumo at the seal, so this never lights the roots by itself.
  const rootLit = directSunRoute || (splitRoute && !rootBedShadowed);

  let rootState: ObservatoryRootState = 'dormant';
  if (bridgeEligible) rootState = 'bridge';
  else if (rootLit) rootState = 'lit';
  else if (input.sealRemembered && !lumoAtSeal) rootState = 'retracted-dark';

  return {
    activeBeamPath,
    doorAUnlocked: input.doorALatched || activeBeamPath.routeId === 'door-a',
    sunDoorUnlocked,
    rootBedShadowed,
    bridgeEligible,
    lumoAtSeal,
    supplyLive: lightAvailable && lumoAtSeal,
    rootState,
  };
}
