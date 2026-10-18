export type PathRoomId = 'entry' | 'relay' | 'ink';
export type PathMark = 'practice' | 'a' | 'b' | 'c';
export type PathApproachSide = 'north' | 'south';
export type PathElementApproach = 'south' | 'side';
export interface PathPoint { x: number; y: number; }
export interface PathRect extends PathPoint { width: number; height: number; }
export interface PathSolid extends PathRect { elementId?: string; }
export interface PathRoutePoint extends PathPoint { room: PathRoomId; pipe?: 'a'|'b'; end?: 'out'|'in'; }
export type PathPipeId = 'a'|'b';
export interface PathElement extends PathPoint { id: string; art: string; width: number; height: number; stand: PathPoint; approach?: PathElementApproach; }
export interface PathRoom { id: PathRoomId; title: string; spawn: PathPoint; entrySpawn: PathPoint; walls: readonly PathRect[]; solids: readonly PathSolid[]; elements: readonly PathElement[]; }

export const PATH_BODY = { feetY: 19, x: -7, y: 16, width: 14, height: 6 } as const;
/** The main floor every room shares: x=24..616, y=80..310 (the reverse pockets reach y=318). */
export const PATH_FLOOR_BOUNDS = { x: 24, y: 80, width: 592, height: 230 } as const;
/**
 * The ink corridor's own walkable band: the gap between the two 348px masonry slabs that flank it in
 * `PATH_ROOMS.ink.walls`, which are derived from this rect. One definition, so the drawn 348×48 mark,
 * the corridor overlap test that reveals the ink and the masonry that frames the corridor cannot drift
 * apart; `scripts/check-path-for-two.mjs` measures the tile against it.
 */
export const PATH_INK_CORRIDOR: PathRect = { x: 184, y: 218, width: 348, height: 48 };
export const PATH_DOORS = {
  practice: { room: 'entry' as const, x: 156, base: 210, target: 'entry' as const },
  a: { room: 'entry' as const, x: 480, base: 210, target: 'relay' as const },
  b: { room: 'relay' as const, x: 480, base: 210, target: 'ink' as const },
  c: { room: 'ink' as const, x: 574, base: 180, target: 'exit' as const },
};
export const PATH_PIPE_ENDPOINTS:Record<PathPipeId,Partial<Record<PathRoomId,PathPoint>>>= {
  a:{entry:{x:480,y:190},relay:{x:110,y:280}},
  b:{relay:{x:480,y:190},ink:{x:82,y:280}},
};
export function getPathPipePoint(pipe:PathPipeId,room:PathRoomId,end:'out'|'in'):PathRoutePoint{
  const point=PATH_PIPE_ENDPOINTS[pipe]?.[room];
  if(!point)return{room,x:Number.NaN,y:Number.NaN,pipe,end};
  return{room,...point,pipe,end};
}
/**
 * A door's room-side face. `south` doors stand in a room's north wall, so their floor side is below
 * the base; the two reverse portals sit in a room's south wall, so their floor side is north of the
 * threshold. Documented exception (RULE_GAMES §3): a doorway trigger is reached from inside the room
 * it opens into, not from behind the arch.
 */
export interface PathDoorFace { id:PathMark; room:PathRoomId; x:number; base:number; approach:PathApproachSide; }
export const PATH_DOOR_FACES: readonly PathDoorFace[] = [
  {id:'practice',room:'entry',x:156,base:210,approach:'south'},{id:'a',room:'entry',x:480,base:210,approach:'south'},
  {id:'a',room:'relay',x:110,base:318,approach:'north'},{id:'b',room:'relay',x:480,base:210,approach:'south'},
  {id:'b',room:'ink',x:82,base:318,approach:'north'},{id:'c',room:'ink',x:574,base:180,approach:'south'},
];
export function getPathDoorFace(id:string,room:PathRoomId):PathDoorFace|undefined{return PATH_DOOR_FACES.find((face)=>face.id===id&&face.room===room);}
/**
 * Where each door control is registered. The returned-through doors are the only controls whose
 * trigger radius overlaps a player's own room transition, so the return arrival point below is
 * measured against these numbers (`PATH_BACK_ARRIVAL_OFFSET`).
 */
export interface PathControlStand { id:PathMark; room:PathRoomId; x:number; y:number; radius:number; }
export const PATH_CONTROL_STANDS: readonly PathControlStand[] = [
  {id:'practice',room:'entry',x:156,y:221,radius:24},{id:'a',room:'entry',x:480,y:221,radius:24},
  {id:'a',room:'relay',x:110,y:280,radius:24},{id:'b',room:'relay',x:480,y:221,radius:24},
  {id:'b',room:'ink',x:82,y:280,radius:24},{id:'c',room:'ink',x:574,y:188,radius:24},
];
export const PATH_ELEMENT_RADIUS = 22;
export function getPathControlStand(id:string,room:PathRoomId):PathControlStand|undefined{
  return PATH_CONTROL_STANDS.find((stand)=>stand.id===id&&stand.room===room);
}
/**
 * Reverse arrivals land this far below the door's own floor line. Measured with the real 14×6 foot
 * body: `+20` (the old value) is 9px from the door stand at (480,221) r24, i.e. inside the prompt
 * radius the instant the player lands, so a second E sends them straight back. `+40` is 29px clear —
 * outside the radius — while (480,250) stays walkable and connected to the hall in both rooms.
 */
export const PATH_BACK_ARRIVAL_OFFSET = 40;
export function getPathBackArrival(id:'a'|'b'):PathPoint{
  const face=id==='a'?getPathDoorFace('a','entry'):getPathDoorFace('b','relay');
  return face?{x:face.x,y:face.base+PATH_BACK_ARRIVAL_OFFSET}:{x:480,y:250};
}
export function isInsidePracticeAlcove(room:PathRoomId,point:PathPoint):boolean{return room==='entry'&&point.x<320&&point.y<180;}
export function isPathThresholdOccupied(room:PathRoomId,id:string,point:PathPoint):boolean{
  const face=getPathDoorFace(id,room);
  if(!face)return false;
  if(rectsOverlap(pathActorBody(point),{x:face.x-22,y:face.base-30,width:44,height:30}))return true;
  return id==='practice'&&isInsidePracticeAlcove(room,point);
}
export function isValidPathPipeHop(from:PathRoutePoint|undefined,to:PathRoutePoint):boolean{
  if(!from||from.end!=='out'||to.end!=='in'||(from.pipe!=='a'&&from.pipe!=='b')||from.pipe!==to.pipe||from.room===to.room)return false;
  const fromEndpoint=PATH_PIPE_ENDPOINTS[from.pipe]?.[from.room];
  const toEndpoint=PATH_PIPE_ENDPOINTS[to.pipe]?.[to.room];
  return !!fromEndpoint&&!!toEndpoint
    &&from.x===fromEndpoint.x&&from.y===fromEndpoint.y
    &&to.x===toEndpoint.x&&to.y===toEndpoint.y;
}
export function isNearPathPipeEndpoint(actual:PathPoint,endpoint:PathRoutePoint,tolerance=8):boolean{
  if(endpoint.end!=='out'||(endpoint.pipe!=='a'&&endpoint.pipe!=='b'))return false;
  const authored=PATH_PIPE_ENDPOINTS[endpoint.pipe]?.[endpoint.room];
  return !!authored&&endpoint.x===authored.x&&endpoint.y===authored.y
    &&Math.hypot(actual.x-endpoint.x,actual.y-endpoint.y)<=tolerance;
}
export function isPathRouteValid(route:readonly PathRoutePoint[]):boolean{
  for(let index=1;index<route.length;index++){
    if(route[index-1].room!==route[index].room&&!isValidPathPipeHop(route[index-1],route[index]))return false;
  }
  return true;
}
export function parsePathRoute(value:unknown):PathRoutePoint[]|undefined{
  if(!Array.isArray(value))return undefined;
  const route:PathRoutePoint[]=[];
  for(const point of value){
    if(!point||typeof point!=='object'||Array.isArray(point))return undefined;
    const p=point as Record<string,unknown>;
    const room=p.room;
    const hasPipe=Object.prototype.hasOwnProperty.call(p,'pipe');
    const hasEnd=Object.prototype.hasOwnProperty.call(p,'end');
    if((room!=='entry'&&room!=='relay'&&room!=='ink')
      ||!Number.isFinite(p.x)||!Number.isFinite(p.y)
      ||(p.x as number)<24||(p.x as number)>616||(p.y as number)<80||(p.y as number)>310
      ||hasPipe!==hasEnd
      ||(hasPipe&&p.pipe!=='a'&&p.pipe!=='b')
      ||(hasEnd&&p.end!=='out'&&p.end!=='in'))return undefined;
    route.push({room,x:p.x as number,y:p.y as number,...(hasPipe?{pipe:p.pipe as PathPipeId,end:p.end as 'out'|'in'}:{})});
  }
  return isPathRouteValid(route)?route:undefined;
}
export function choosePathCallAction(assignment:string,target:'practice'|'a'|'b'|'c',eligible:boolean):'send'|'recall'{
  if(assignment===target)return'recall';
  if(assignment!=='follow'&&!eligible)return'recall';
  return'send';
}
export function shouldRestorePathFollower(state:{hasRoomMetadata:boolean;assignment:string;travelling:boolean;actuallyArrived:boolean}):boolean{
  if(!state.hasRoomMetadata)return true;
  return state.assignment!=='follow'&&!state.travelling&&!state.actuallyArrived;
}
export function shouldRecoverPathFollower(state:{invalidSavedRoute:boolean;hasRoomMetadata:boolean;assignment:string;travelling:boolean;actuallyArrived:boolean}):boolean{
  return state.invalidSavedRoute||shouldRestorePathFollower(state);
}
export function shouldRebuildLegacyPathAssignment(state:{hasRoomMetadata:boolean;assignment:string;wasCalled:boolean;eligible:boolean;returning:boolean;reunited:boolean}):boolean{
  return !state.hasRoomMetadata&&['a','b','c'].includes(state.assignment)&&state.wasCalled&&state.eligible&&!state.returning&&!state.reunited;
}
export function shouldRoutePathFollower(assignment:string):boolean{return assignment==='follow';}
export function isActuallyReunited(state:{assignment:string;travelling:boolean;playerRoom:PathRoomId;lumoRoom:PathRoomId;player:PathPoint;lumo:PathPoint}):boolean{
  return state.assignment==='follow'&&!state.travelling&&state.playerRoom===state.lumoRoom
    &&Math.hypot(state.player.x-state.lumo.x,state.player.y-state.lumo.y)<36;
}
export function getPathExitBlock(state:{latchC:boolean;memoRead:boolean;reunited:boolean}):'latch'|'memo'|'companion'|undefined{
  if(!state.latchC)return'latch';
  if(!state.memoRead)return'memo';
  if(!state.reunited)return'companion';
  return undefined;
}
const doorPosts = (x: number, base: number): PathRect[] => [
  { x: x - 32, y: base - 88, width: 10, height: 88 },
  { x: x + 22, y: base - 88, width: 10, height: 88 },
];
const doorWalls = (x: number, base: number): PathRect[] => [
  { x: x - 32, y: base - 88, width: 10, height: 58 },
  { x: x + 22, y: base - 88, width: 10, height: 58 },
];
const reversePortalWalls = (x:number):PathRect[]=>[
  {x:0,y:310,width:x-22,height:8},
  {x:x+22,y:310,width:640-(x+22),height:8},
  {x:0,y:318,width:640,height:42},
];
/** One of the two masonry slabs that leave `PATH_INK_CORRIDOR` open: same x/width, authored height. */
const inkCorridorSlab = (y: number, height: number): PathRect => ({ x: PATH_INK_CORRIDOR.x, y, width: PATH_INK_CORRIDOR.width, height });
const element = (id: string, art: string, x: number, y: number, width: number, height: number, sx: number, sy: number): PathElement => ({ id, art, x, y, width, height, stand: { x: sx, y: sy } });
const standingSolid = (elementId:string,x:number,anchorY:number,width:number,height:number):PathSolid=>({elementId,x:x-width/2,y:anchorY-height,width,height});

export const PATH_ROOMS: Record<PathRoomId, PathRoom> = {
  entry: {
    id: 'entry', title: 'Buồng Dẫn Nước', spawn: { x: 180, y: 280 }, entrySpawn: { x: 180, y: 280 },
    walls: [
      { x: 0, y: 0, width: 640, height: 80 }, { x: 0, y: 310, width: 640, height: 50 },
      { x: 0, y: 80, width: 24, height: 230 }, { x: 616, y: 80, width: 24, height: 230 },
      { x: 24, y: 180, width: 100, height: 30 }, { x: 188, y: 180, width: 260, height: 30 }, { x: 512, y: 180, width: 104, height: 30 },
      { x: 300, y: 80, width: 20, height: 100 },
      ...doorWalls(156, 210), ...doorWalls(480, 210),
    ],
    solids: [
      standingSolid('practice-call',76,254,40,48), standingSolid('inner-call',244,140,40,48), standingSolid('call-a',384,232,40,48), ...doorPosts(156,210), ...doorPosts(480,210),
    ],
    elements: [element('practice-call','call-idle',76,254,40,48,76,268), element('practice-plate','pressure-empty',212,114,44,28,212,146), element('inner-call','call-idle',244,140,40,48,244,150), element('call-a','call-idle',384,232,40,48,384,256), element('plate-a','pressure-empty',546,114,44,28,546,146)],
  },
  relay: {
    id: 'relay', title: 'Buồng Chuyển Dòng', spawn: { x: 110, y: 251 }, entrySpawn: { x: 110, y: 251 },
    walls: [
      { x: 0, y: 0, width: 640, height: 80 }, { x: 0, y: 80, width: 24, height: 230 }, { x: 616, y: 80, width: 24, height: 230 },
      { x: 24, y: 180, width: 424, height: 30 }, { x: 512, y: 180, width: 104, height: 30 },
      ...reversePortalWalls(110), { x: 24, y: 300, width: 54, height: 10 }, { x: 142, y: 300, width: 474, height: 10 },
      ...doorWalls(110,318), ...doorWalls(480,210),
    ],
    solids: [standingSolid('call-a-far',56,228,40,48),standingSolid('latch-a',180,240,28,32),standingSolid('call-b',360,232,40,48), ...doorPosts(110,318), ...doorPosts(480,210)],
    elements: [element('call-a-far','call-idle',56,228,40,48,56,252),element('latch-a','latch-unlatched',180,240,28,32,180,264),element('call-b','call-idle',360,232,40,48,360,256),element('plate-b','pressure-empty',546,114,44,28,546,146)],
  },
  ink: {
    id: 'ink', title: 'Hành Lang Mực', spawn: { x: 82, y: 251 }, entrySpawn: { x: 82, y: 251 },
    walls: [
      {x:0,y:0,width:640,height:80},{x:0,y:80,width:24,height:230},{x:616,y:80,width:24,height:230},
      ...reversePortalWalls(82),
      inkCorridorSlab(PATH_FLOOR_BOUNDS.y, PATH_INK_CORRIDOR.y - PATH_FLOOR_BOUNDS.y),
      inkCorridorSlab(PATH_INK_CORRIDOR.y + PATH_INK_CORRIDOR.height,
        PATH_FLOOR_BOUNDS.y + PATH_FLOOR_BOUNDS.height - (PATH_INK_CORRIDOR.y + PATH_INK_CORRIDOR.height)),
      {x:24,y:150,width:10,height:30},{x:130,y:150,width:54,height:30}, {x:532,y:150,width:10,height:30},{x:606,y:150,width:10,height:30},
      ...doorWalls(82,318), ...doorWalls(574,180),
    ],
    solids: [standingSolid('call-b-far',68,176,40,48),standingSolid('latch-b',158,240,28,32),standingSolid('call-c',122,190,40,48),standingSolid('latch-c',540,192,28,32),...doorPosts(82,318),...doorPosts(574,180)],
    elements: [element('call-b-far','call-idle',68,176,40,48,68,198),element('latch-b','latch-unlatched',158,240,28,32,158,264),element('call-c','call-idle',122,190,40,48,122,210),element('plate-c','pressure-empty',558,244,44,28,558,276),element('latch-c','latch-unlatched',540,192,28,32,550,218),{...element('spiral','swirl-memory-scratch',622,282,30,30,596,262),approach:'side'}],
  },
};

/** Feet of the 14×6 body: the actor's centre plus `PATH_BODY.feetY`. */
export function pathFeet(center: PathPoint): PathPoint { return { x: center.x, y: center.y + PATH_BODY.feetY }; }
/**
 * The visible box of one element. Floor seals and the wall engraving are centred on their anchor;
 * every standing prop is anchored at the bottom centre of its art. One definition, used by the
 * renderer, by the collision data above and by the approach rules below.
 */
export function getPathElementArtRect(element: PathElement): PathRect {
  const centred = isPathSeal(element) || element.approach === 'side';
  return centred
    ? { x: element.x - element.width / 2, y: element.y - element.height / 2, width: element.width, height: element.height }
    : { x: element.x - element.width / 2, y: element.y - element.height, width: element.width, height: element.height };
}
/**
 * A floor seal (a pressure plate) is walkable floor art: Lumo's arrival lights it, and E never reads
 * it. Keeping the predicate in the data keeps the renderer, the registry and the schematic agreeing
 * on the same four seals.
 */
export function isPathSeal(element: PathElement): boolean { return element.art.startsWith('pressure-'); }
/** How far beside a prop's own span a standing position may still count as its south face. */
export const PATH_APPROACH_SLACK = 12;
/**
 * RULE_GAMES §1 — a standing prop answers only while the 14×6 foot body stands in front of its own
 * south edge, inside its own horizontal span, on walkable ground.
 *
 * Documented exception (RULE_GAMES §3): the swirl engraving is scratched into the east wall, so it
 * has no walkable south face at all; it answers from the floor directly in front of that wall face
 * (`approach: 'side'` in `PATH_ROOMS.ink.elements`, reason above).
 */
export function isPathApproachAllowed(room: PathRoomId, element: PathElement, center: PathPoint): boolean {
  if (!isPathPositionSafe(room, center)) return false;
  const feet = pathFeet(center);
  const art = getPathElementArtRect(element);
  if (element.approach === 'side') {
    if (feet.y < art.y || feet.y > art.y + art.height) return false;
    return feet.x <= art.x + 6 || feet.x >= art.x + art.width - 6;
  }
  if (feet.y < art.y + art.height) return false;
  const span = element.width / 2 + PATH_APPROACH_SLACK;
  return center.x >= element.x - span && center.x <= element.x + span;
}
/** The visible passage of a door: the opening the player actually walks through. */
export function getPathDoorPassage(face: PathDoorFace): PathRect {
  return face.approach === 'north'
    ? { x: face.x - 22, y: face.base - 8, width: 44, height: 8 }
    : { x: face.x - 22, y: face.base - 88, width: 44, height: 58 };
}
/**
 * Documented gate exception (RULE_GAMES §3): a door control is reached from the room floor inside the
 * arch it opens, and is silent from behind the arch or from masonry. See `PathDoorFace.approach`.
 */
export function isPathDoorApproachAllowed(room: PathRoomId, id: string, center: PathPoint): boolean {
  const face = getPathDoorFace(id, room);
  if (!face) return false;
  if (!isPathPositionSafe(room, center)) return false;
  const feet = pathFeet(center);
  return face.approach === 'north' ? feet.y <= face.base - 8 : feet.y >= face.base - 30;
}
/**
 * Held-E guard. A room transition arms it; the controller keeps E refused (and every control silent)
 * until the key comes back up, so one held press can never act twice across a threshold. Returns true
 * while E must be ignored.
 */
export function isPathInteractHeld(releasePending: boolean, interactKeyDown: boolean): boolean {
  return releasePending && interactKeyDown;
}

/** Named safe checkpoints: the reached side of each room, used as the last-resort restore point. */
export interface PathCheckpoint { name: string; point: PathPoint; }
export const PATH_CHECKPOINTS: Record<PathRoomId, PathCheckpoint> = {
  entry: { name: 'entry-hall', point: { x: 180, y: 280 } },
  relay: { name: 'relay-hall', point: { x: 110, y: 251 } },
  ink: { name: 'ink-foyer', point: { x: 82, y: 251 } },
};

/**
 * The visible route each tube and root cable follows. `lead` runs from the line's own anchor — the
 * owning call marker, or the door/pipe the room is entered by — up to where Lumo's own walk joins it;
 * `plate` is that same line continued to the floor seal, and it is the leg Lumo really walks from the
 * player's position (`getPathLocalLeg`). `mark` is the control that owns the line.
 *
 * The renderer draws `pathRoutePoints(line)` — lead then plate — while the walk takes the `plate` tail
 * itself, so the plate leg of the route can never be a second copy of the art's coordinates. The pipe
 * legs between rooms still author their own turn points in `PathForTwoLevel.pipeRoute()`, and
 * `scripts/check-path-for-two.mjs` asserts every one of those points is a run of these lines, so a
 * drifted pipe waypoint fails a check instead of quietly disagreeing with the drawn route.
 */
export interface PathRouteLine { mark: PathMark; room: PathRoomId; lead: readonly PathPoint[]; plate: readonly PathPoint[]; }
/** The whole visible line: what the tube modules, the cable stamps and the corners are drawn along. */
export function pathRoutePoints(line: PathRouteLine): readonly PathPoint[] { return [...line.lead, ...line.plate]; }
export const PATH_ROUTE_LINES: readonly PathRouteLine[] = [
  { mark: 'practice', room: 'entry', lead: [{x:76,y:268}], plate: [{x:110,y:220},{x:156,y:186},{x:156,y:110},{x:212,y:114}] },
  { mark: 'a', room: 'entry', lead: [{x:384,y:256}], plate: [{x:440,y:232},{x:480,y:190},{x:520,y:150},{x:546,y:114}] },
  { mark: 'b', room: 'relay', lead: [{x:360,y:256}], plate: [{x:420,y:232},{x:480,y:190},{x:520,y:150},{x:546,y:114}] },
  { mark: 'a', room: 'relay', lead: [{x:110,y:280}], plate: [{x:140,y:280},{x:220,y:280},{x:320,y:250},{x:420,y:220},{x:480,y:190}] },
  { mark: 'c', room: 'ink', lead: [{x:82,y:280},{x:122,y:242},{x:122,y:210}], plate: [{x:180,y:200},{x:360,y:200},{x:520,y:200},{x:558,y:244}] },
];
export function getPathRouteLine(room: PathRoomId, mark: PathMark): PathRouteLine | undefined {
  return PATH_ROUTE_LINES.find((line) => line.room === room && line.mark === mark);
}
/**
 * The leg Lumo walks inside the plate's own room, read straight out of the authored line, so the walk
 * and the drawn tube/cable are the same waypoints rather than two lists kept equal by hand.
 */
export function getPathLocalLeg(room: PathRoomId, mark: PathMark): PathRoutePoint[] {
  const line = getPathRouteLine(room, mark);
  return line ? line.plate.map((point) => ({ room, x: point.x, y: point.y })) : [];
}
export function pathPolylineLength(points: readonly PathPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  return total;
}
export interface PathRoutePiece { x: number; y: number; angle: number; length: number; }
export function pathSegmentAngle(from: PathPoint, to: PathPoint): number { return Math.atan2(to.y - from.y, to.x - from.x); }
/**
 * Cable segments along the real waypoints: at most `maxLength` px of run per 160×40 native stamp, so
 * the root cable actually reaches the call at one end and the plate at the other instead of hanging
 * at the chord midpoint.
 */
export function pathRouteCableSegments(points: readonly PathPoint[], maxLength = 160): PathRoutePiece[] {
  const pieces: PathRoutePiece[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1], to = points[index];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const count = Math.max(1, Math.ceil(length / maxLength));
    const angle = pathSegmentAngle(from, to);
    for (let piece = 0; piece < count; piece += 1) {
      const along = (piece + 0.5) * length / count;
      pieces.push({ x: from.x + Math.cos(angle) * along, y: from.y + Math.sin(angle) * along, angle, length: length / count });
    }
  }
  return pieces;
}
/** Genuine corners: a vertex the route really turns at, carrying the incoming angle for the elbow. */
export function pathRouteCorners(points: readonly PathPoint[], minTurnDegrees = 30): PathRoutePiece[] {
  const corners: PathRoutePiece[] = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const incoming = pathSegmentAngle(points[index - 1], points[index]);
    const outgoing = pathSegmentAngle(points[index], points[index + 1]);
    let turn = Math.abs((outgoing - incoming) * 180 / Math.PI) % 360;
    if (turn > 180) turn = 360 - turn;
    if (turn >= minTurnDegrees) corners.push({ x: points[index].x, y: points[index].y, angle: incoming, length: 0 });
  }
  return corners;
}

/** Native tube mouths: where a visible pipe meets masonry, never inside a door's own passage. */
export interface PathTubeMouth { room: PathRoomId; tube: PathMark; x: number; y: number; rotation: number; }
export const PATH_TUBE_MOUTHS: readonly PathTubeMouth[] = [
  { room: 'entry', tube: 'practice', x: 156, y: 190, rotation: 0 },
  { room: 'entry', tube: 'a', x: 480, y: 190, rotation: 0 },
  { room: 'relay', tube: 'a', x: 110, y: 280, rotation: Math.PI },
  { room: 'relay', tube: 'b', x: 480, y: 190, rotation: 0 },
  { room: 'ink', tube: 'b', x: 82, y: 280, rotation: Math.PI },
  // The C pipe used to be stamped at (574,136), inside door C's own passage. It now sits where the
  // authored C run leaves the corridor masonry and descends to plate C: the (520,200)→(558,244)
  // segment crosses the masonry's floor edge y=218 at x≈535.5, and the rotation is that segment's
  // angle, so the mouth and the drawn tube are the same fact.
  { room: 'ink', tube: 'c', x: 536, y: 214, rotation: 0.858 },
];

/**
 * The small station schematic drawn beside each room's call marker. It is geometry only — three room
 * cells, the authored seals and both pipes, all projected from the same layout data — never a baked
 * background with lettering or fake props.
 */
export const PATH_SCHEMATIC_SIZE = { width: 78, height: 26 } as const;
export const PATH_SCHEMATIC: Record<PathRoomId, PathRect> = {
  entry: { x: 281, y: 182, width: PATH_SCHEMATIC_SIZE.width, height: PATH_SCHEMATIC_SIZE.height },
  relay: { x: 251, y: 182, width: PATH_SCHEMATIC_SIZE.width, height: PATH_SCHEMATIC_SIZE.height },
  ink: { x: 191, y: 88, width: PATH_SCHEMATIC_SIZE.width, height: PATH_SCHEMATIC_SIZE.height },
};
export interface PathSchematicRoom { room: PathRoomId; frame: PathRect; seals: readonly PathPoint[]; }
export interface PathSchematicPipe { pipe: PathPipeId; from: PathPoint; to: PathPoint; }
export interface PathSchematic { rooms: readonly PathSchematicRoom[]; pipes: readonly PathSchematicPipe[]; }
export const PATH_SCHEMATIC_ORDER: readonly PathRoomId[] = ['entry', 'relay', 'ink'];
export function buildPathSchematic(): PathSchematic {
  const cell = { width: 22, height: 10, gap: 6 };
  const frames = new Map<PathRoomId, PathRect>();
  PATH_SCHEMATIC_ORDER.forEach((room, index) => {
    frames.set(room, {
      x: index * (cell.width + cell.gap),
      y: (PATH_SCHEMATIC_SIZE.height - cell.height) / 2,
      width: cell.width,
      height: cell.height,
    });
  });
  const project = (room: PathRoomId, point: PathPoint): PathPoint => {
    const frame = frames.get(room);
    if (!frame) return { x: 0, y: 0 };
    return {
      x: frame.x + (point.x - PATH_FLOOR_BOUNDS.x) / PATH_FLOOR_BOUNDS.width * frame.width,
      y: frame.y + (point.y - PATH_FLOOR_BOUNDS.y) / PATH_FLOOR_BOUNDS.height * frame.height,
    };
  };
  const rooms = PATH_SCHEMATIC_ORDER.map((room) => ({
    room,
    frame: frames.get(room) as PathRect,
    seals: PATH_ROOMS[room].elements
      .filter((entry) => isPathSeal(entry))
      .map((entry) => {
        const art = getPathElementArtRect(entry);
        return project(room, { x: art.x + art.width / 2, y: art.y + art.height / 2 });
      }),
  }));
  const pipes = (['a', 'b'] as const).map((pipe) => {
    const from = PATH_PIPE_ENDPOINTS[pipe].entry ?? PATH_PIPE_ENDPOINTS[pipe].relay;
    const to = PATH_PIPE_ENDPOINTS[pipe].ink ?? PATH_PIPE_ENDPOINTS[pipe].relay;
    const fromRoom: PathRoomId = PATH_PIPE_ENDPOINTS[pipe].entry ? 'entry' : 'relay';
    const toRoom: PathRoomId = PATH_PIPE_ENDPOINTS[pipe].ink ? 'ink' : 'relay';
    return { pipe, from: project(fromRoom, from as PathPoint), to: project(toRoom, to as PathPoint) };
  });
  return { rooms, pipes };
}

export function pathActorBody(center: PathPoint): PathRect { return { x:center.x + PATH_BODY.x, y:center.y + PATH_BODY.y, width:PATH_BODY.width, height:PATH_BODY.height }; }
export function rectsOverlap(a: PathRect,b: PathRect): boolean { return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y; }
export function isPathPositionSafe(room: PathRoomId, center: PathPoint, options: { latches?: Partial<Record<'a'|'b'|'c'|'practice',boolean>>; allowThreshold?: string } = {}): boolean {
  const spec = PATH_ROOMS[room]; const body = pathActorBody(center);
  if (body.x < PATH_FLOOR_BOUNDS.x || body.x+body.width > PATH_FLOOR_BOUNDS.x+PATH_FLOOR_BOUNDS.width
    || body.y < PATH_FLOOR_BOUNDS.y || body.y+body.height > 318) return false;
  if(body.y+body.height>310){
    const portal=PATH_DOOR_FACES.find(face=>face.room===room&&face.base===318);
    if(!portal||!options.latches?.[portal.id]||body.x<portal.x-22||body.x+body.width>portal.x+22)return false;
  }
  for (const wall of spec.walls) if (rectsOverlap(body,wall)) return false;
  for (const face of PATH_DOOR_FACES) {
    if(face.room===room&&!options.latches?.[face.id]&&options.allowThreshold!==face.id
      &&rectsOverlap(body,{x:face.x-22,y:face.base-30,width:44,height:30}))return false;
  }
  return !spec.solids.some((solid) => rectsOverlap(body,solid));
}
export function getPathElementSolid(room:PathRoomId,elementId:string):PathSolid|undefined{return PATH_ROOMS[room].solids.find(solid=>solid.elementId===elementId);}
export function nearestSafePathSpawn(room: PathRoomId, point: PathPoint | undefined, allowed: (room:PathRoomId, point:PathPoint)=>boolean = (r,p)=>isPathPositionSafe(r,p)): PathPoint {
  if (point && allowed(room,point)) return {x:point.x,y:point.y};
  const spec=PATH_ROOMS[room]; if (allowed(room,spec.entrySpawn)) return {...spec.entrySpawn};
  for(let radius=12;radius<=120;radius+=12) for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8) {
    const p={x:Math.round(spec.entrySpawn.x+Math.cos(angle)*radius),y:Math.round(spec.entrySpawn.y+Math.sin(angle)*radius)};
    if(allowed(room,p)) return p;
  }
  // Last resort: the reached side of this room's own named checkpoint, never one shared point that
  // clips another room's wall band.
  return {...PATH_CHECKPOINTS[room].point};
}
export function hasDoorPower(mark:'a'|'b'|'c'|'practice', state:{assignment:string; lumoRoom:PathRoomId; lumoX:number; lumoY:number}): boolean {
  const targets={practice:{room:'entry' as PathRoomId,x:212,y:114},a:{room:'entry' as PathRoomId,x:546,y:114},b:{room:'relay' as PathRoomId,x:546,y:114},c:{room:'ink' as PathRoomId,x:558,y:244}};
  const target=targets[mark]; return state.assignment===mark && state.lumoRoom===target.room && Math.hypot(state.lumoX-target.x,state.lumoY-target.y)<=12;
}
export function resolvePathRoom(saved:unknown,visitedRelay:boolean,visitedInk:boolean,latchA:boolean,latchB:boolean,latchC:boolean):PathRoomId{
  if(saved==='entry')return'entry';
  if(saved==='relay'&&(latchA||visitedRelay))return'relay';
  if(saved==='ink'&&(latchB||latchC||visitedInk))return'ink';
  if(latchC||latchB||visitedInk)return'ink';
  if(latchA||visitedRelay)return'relay';
  return'entry';
}
export function pathDoorShouldClose(powered:boolean,occupied:boolean,latched:boolean):boolean{return !powered&&!occupied&&!latched;}
