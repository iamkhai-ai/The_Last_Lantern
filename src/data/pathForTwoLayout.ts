export type PathRoomId = 'entry' | 'relay' | 'ink';
export interface PathPoint { x: number; y: number; }
export interface PathRect extends PathPoint { width: number; height: number; }
export interface PathSolid extends PathRect { elementId?: string; }
export interface PathRoutePoint extends PathPoint { room: PathRoomId; pipe?: 'a'|'b'; end?: 'out'|'in'; }
export type PathPipeId = 'a'|'b';
export interface PathElement extends PathPoint { id: string; art: string; width: number; height: number; stand: PathPoint; }
export interface PathRoom { id: PathRoomId; title: string; spawn: PathPoint; entrySpawn: PathPoint; walls: readonly PathRect[]; solids: readonly PathSolid[]; elements: readonly PathElement[]; }

export const PATH_BODY = { feetY: 19, x: -7, y: 16, width: 14, height: 6 } as const;
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
export interface PathDoorFace { id:'practice'|'a'|'b'|'c'; room:PathRoomId; x:number; base:number; }
export const PATH_DOOR_FACES: readonly PathDoorFace[] = [
  {id:'practice',room:'entry',x:156,base:210},{id:'a',room:'entry',x:480,base:210},
  {id:'a',room:'relay',x:110,base:318},{id:'b',room:'relay',x:480,base:210},
  {id:'b',room:'ink',x:82,base:318},{id:'c',room:'ink',x:574,base:180},
];
export function getPathDoorFace(id:string,room:PathRoomId):PathDoorFace|undefined{return PATH_DOOR_FACES.find((face)=>face.id===id&&face.room===room);}
export function getPathBackArrival(id:'a'|'b'):PathPoint{
  const face=id==='a'?getPathDoorFace('a','entry'):getPathDoorFace('b','relay');
  return face?{x:face.x,y:face.base+20}:{x:480,y:230};
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
      standingSolid('practice-call',76,254,40,48), standingSolid('inner-call',244,130,40,48), standingSolid('call-a',384,232,40,48), ...doorPosts(156,210), ...doorPosts(480,210),
    ],
    elements: [element('practice-call','call-idle',76,254,40,48,76,268), element('practice-plate','pressure-empty',212,114,44,28,212,146), element('inner-call','call-idle',244,130,40,48,244,150), element('call-a','call-idle',384,232,40,48,384,256), element('plate-a','pressure-empty',546,114,44,28,546,146)],
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
      ...reversePortalWalls(82),{x:184,y:80,width:348,height:138},{x:184,y:266,width:348,height:44},
      {x:24,y:150,width:10,height:30},{x:130,y:150,width:54,height:30}, {x:532,y:150,width:10,height:30},{x:606,y:150,width:10,height:30},
      ...doorWalls(82,318), ...doorWalls(574,180),
    ],
    solids: [standingSolid('call-b-far',68,176,40,48),standingSolid('latch-b',148,240,28,32),standingSolid('call-c',122,190,40,48),standingSolid('latch-c',540,192,28,32),...doorPosts(82,318),...doorPosts(574,180)],
    elements: [element('call-b-far','call-idle',68,176,40,48,68,198),element('latch-b','latch-unlatched',148,240,28,32,148,264),element('call-c','call-idle',122,190,40,48,122,210),element('plate-c','pressure-empty',558,244,44,28,558,276),element('latch-c','latch-unlatched',540,192,28,32,550,218),element('spiral','swirl-memory-scratch',612,282,30,30,588,262)],
  },
};

export function pathActorBody(center: PathPoint): PathRect { return { x:center.x + PATH_BODY.x, y:center.y + PATH_BODY.y, width:PATH_BODY.width, height:PATH_BODY.height }; }
export function rectsOverlap(a: PathRect,b: PathRect): boolean { return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y; }
export function isPathPositionSafe(room: PathRoomId, center: PathPoint, options: { latches?: Partial<Record<'a'|'b'|'c'|'practice',boolean>>; allowThreshold?: string } = {}): boolean {
  const spec = PATH_ROOMS[room]; const body = pathActorBody(center);
  if (body.x < 24 || body.x+body.width > 616 || body.y < 80 || body.y+body.height > 318) return false;
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
  return {x:180,y:280};
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
