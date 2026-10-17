import assert from 'node:assert/strict';
import { choosePathCallAction, getPathDoorFace, getPathElementSolid, getPathExitBlock, getPathPipePoint, hasDoorPower, isActuallyReunited, isNearPathPipeEndpoint, isPathPositionSafe, isPathRouteValid, isValidPathPipeHop, nearestSafePathSpawn, pathActorBody, pathDoorShouldClose, PATH_BODY, PATH_DOORS, PATH_ROOMS, rectsOverlap, resolvePathRoom, shouldRebuildLegacyPathAssignment, shouldRestorePathFollower, shouldRoutePathFollower } from '../src/data/pathForTwoLayout.ts';

const allOpen = { a: true, b: true, c: true, practice: true };
const actor = (room, point, open = allOpen) => isPathPositionSafe(room, point, { latches: open });
const reach = (room, start, target, open = allOpen) => {
  const step = 6, queue = [start], seen = new Set([`${Math.round(start.x)},${Math.round(start.y)}`]);
  for (let i = 0; i < queue.length; i += 1) {
    const p = queue[i];
    if (Math.hypot(p.x - target.x, p.y - target.y) <= 22) return true;
    for (const [dx, dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
      const next = { x: p.x + dx, y: p.y + dy }, key = `${Math.round(next.x)},${Math.round(next.y)}`;
      if (!seen.has(key) && actor(room, next, open)) { seen.add(key); queue.push(next); }
    }
  }
  return false;
};
const reachesExact = (room,start,target,open) => {
  const step=2,queue=[start],seen=new Set([`${start.x},${start.y}`]);
  for(let i=0;i<queue.length;i+=1){
    const p=queue[i];
    if(Math.hypot(p.x-target.x,p.y-target.y)<step)return true;
    for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const next={x:p.x+dx,y:p.y+dy},key=`${next.x},${next.y}`;
      if(!seen.has(key)&&actor(room,next,open)){seen.add(key);queue.push(next);}
    }
  }
  return false;
};

assert.deepEqual(PATH_BODY, { feetY: 19, x: -7, y: 16, width: 14, height: 6 });
assert.deepEqual(pathActorBody({x:180,y:280}), {x:173,y:296,width:14,height:6});
for (const [roomId, room] of Object.entries(PATH_ROOMS)) {
  for (const item of room.elements.filter((e) => e.id.startsWith('call') || e.id.startsWith('latch'))) {
    assert.equal(actor(roomId, item.stand), true, `${roomId}/${item.id} has a safe reachable-side stand`);
  }
}

// All full standing props block the authored 14x6 foot body from each cardinal direction.
for (const [roomId, room] of Object.entries(PATH_ROOMS)) {
  const controls = room.elements.filter((e) => e.id.startsWith('call') || e.id.startsWith('latch'));
  for (const e of controls) {
    const solid = getPathElementSolid(roomId,e.id);
    assert.ok(solid,`${roomId}/${e.id} uses a registered runtime solid`);
    assert.deepEqual(solid,{elementId:e.id,x:e.x-e.width/2,y:e.y-e.height,width:e.width,height:e.height},`${roomId}/${e.id} solid matches its rendered standing prop footprint`);
    const contacts = [
      {x:e.x,y:e.y-e.height-19}, {x:e.x,y:e.y-19},
      {x:e.x-e.width/2-6,y:e.y-e.height/2-16}, {x:e.x+e.width/2+6,y:e.y-e.height/2-16},
    ];
    for (const [direction,center] of contacts.entries()) {
      const body=pathActorBody(center);
      assert.equal(rectsOverlap(body,solid),true,`${roomId}/${e.id} registered footprint covers contact ${direction}`);
      assert.equal(actor(roomId,center),false,`${roomId}/${e.id} actual geometry blocks contact ${direction}`);
    }
  }
}

// A closed threshold blocks its center; real power or a permanent latch opens it.
const doorCenter = {x:PATH_DOORS.a.x,y:PATH_DOORS.a.base-42};
assert.equal(actor('entry',doorCenter,{a:false,b:false,c:false,practice:false}),false);
assert.equal(actor('entry',doorCenter,{a:true,b:false,c:false,practice:false}),true);
assert.equal(actor('entry',{x:110,y:296},{a:false,b:false,c:false,practice:false}),false,'reverse portal floor pocket stays closed without its latch');
assert.equal(actor('relay',{x:110,y:296},{a:true,b:false,c:false,practice:false}),true,'A reverse portal opens only its authored narrow floor pocket');
assert.equal(reachesExact('relay',PATH_ROOMS.relay.spawn,{x:110,y:296},{a:true,b:false,c:false,practice:false}),true,'reverse A arrival can walk through the open threshold pocket to the cap');
assert.equal(actor('ink',{x:82,y:296},{a:true,b:true,c:false,practice:false}),true,'B reverse portal opens its matching narrow floor pocket');
assert.equal(reachesExact('ink',PATH_ROOMS.ink.spawn,{x:82,y:296},{a:true,b:true,c:false,practice:false}),true,'reverse B arrival can walk through the open threshold pocket to the cap');
assert.equal(actor('ink',{x:82,y:320},{a:true,b:true,c:false,practice:false}),false,'portal cap blocks entry into the HUD and out-of-room area');
assert.equal(actor('relay',{x:150,y:296},{a:true,b:false,c:false,practice:false}),false,'open portal pocket does not widen beyond its visible 44px gap');
assert.deepEqual(getPathDoorFace('a','entry'),{id:'a',room:'entry',x:480,base:210});
assert.deepEqual(getPathDoorFace('a','relay'),{id:'a',room:'relay',x:110,base:318});
assert.deepEqual(getPathDoorFace('b','ink'),{id:'b',room:'ink',x:82,base:318});
assert.equal(pathDoorShouldClose(false,true,false),false,'occupied threshold defers closure');
assert.equal(pathDoorShouldClose(false,false,false),true,'threshold closes after the body clears');
assert.equal(pathDoorShouldClose(false,false,true),false,'latched door stays open');
assert.equal(pathDoorShouldClose(true,false,false),false,'live power keeps an unlatched door open');

assert.equal(hasDoorPower('a',{assignment:'a',lumoRoom:'entry',lumoX:546,lumoY:114}),true,'arrival at the assigned plate powers A');
assert.equal(hasDoorPower('a',{assignment:'a',lumoRoom:'relay',lumoX:546,lumoY:114}),false,'matching coordinates in another room do not power A');
assert.equal(hasDoorPower('a',{assignment:'b',lumoRoom:'entry',lumoX:546,lumoY:114}),false,'a different assignment cannot power A');
assert.equal(hasDoorPower('b',{assignment:'b',lumoRoom:'relay',lumoX:546,lumoY:114}),true,'arrival at assigned B plate powers B');
assert.equal(hasDoorPower('c',{assignment:'c',lumoRoom:'ink',lumoX:558,lumoY:244}),true,'arrival at C plate powers C');
assert.equal(hasDoorPower('c',{assignment:'follow',lumoRoom:'ink',lumoX:558,lumoY:244}),false,'recalled Lumo loses unlatched C power');

assert.equal(reach('entry',PATH_ROOMS.entry.spawn,PATH_ROOMS.entry.elements.find(e=>e.id==='call-a').stand,{a:false,b:false,c:false,practice:false}),true,'spawn reaches A call on the near side');
assert.equal(reach('entry',PATH_ROOMS.entry.spawn,PATH_ROOMS.entry.elements.find(e=>e.id==='inner-call').stand,{a:false,b:false,c:false,practice:true}),true,'live practice threshold reaches inside recovery call');
assert.equal(reach('relay',PATH_ROOMS.relay.spawn,PATH_ROOMS.relay.elements.find(e=>e.id==='latch-a').stand),true,'A entrance reaches far-side latch');
assert.equal(reach('relay',PATH_ROOMS.relay.spawn,PATH_ROOMS.relay.elements.find(e=>e.id==='call-b').stand),true,'relay reaches B call');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='latch-b').stand),true,'B entrance reaches far-side latch');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='call-b-far').stand),true,'B entrance reaches the far-side recovery call');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='call-c').stand),true,'ink room reaches C call');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='latch-c').stand),true,'corridor reaches final side latch');
assert.equal(reach('entry',PATH_ROOMS.entry.spawn,PATH_ROOMS.entry.elements.find(e=>e.id==='inner-call').stand,{a:false,b:false,c:false,practice:true}),true,'open practice doorway connects the lower hall to its inside recovery call');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:280,pipe:'a',end:'in'}),true,'A tube pairs its authored entry and relay endpoints');
assert.deepEqual(getPathPipePoint('a','entry','out'),{room:'entry',x:480,y:190,pipe:'a',end:'out'},'runtime route uses the authored A endpoint data');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'ink',x:82,y:280,pipe:'a',end:'in'}),false,'a matching label cannot hop to an unrelated room');
assert.equal(isValidPathPipeHop({room:'entry',x:479,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:280,pipe:'a',end:'in'}),false,'wrong outgoing coordinates cannot use the A room hop');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:279,pipe:'a',end:'in'}),false,'wrong incoming coordinates cannot use the A room hop');
assert.equal(isValidPathPipeHop({room:'relay',x:480,y:190,pipe:'b',end:'out'},{room:'ink',x:82,y:280,pipe:'b',end:'in'}),true,'B tube pairs its authored relay and ink endpoints');
assert.equal(isNearPathPipeEndpoint({x:480,y:190},{room:'entry',x:480,y:190,pipe:'a',end:'out'}),true,'companion at the actual outgoing port may cross rooms');
assert.equal(isNearPathPipeEndpoint({x:460,y:190},{room:'entry',x:480,y:190,pipe:'a',end:'out'}),false,'companion far from the outgoing port cannot be teleported across rooms');
assert.equal(isPathRouteValid([{room:'ink',x:558,y:244},{room:'ink',x:520,y:200},{room:'ink',x:82,y:280,pipe:'b',end:'out'},{room:'relay',x:480,y:190,pipe:'b',end:'in'}]),true,'a recalled follower uses the visible ink return pipe before entering relay');
assert.equal(isPathRouteValid([{room:'entry',x:200,y:280},{room:'ink',x:82,y:280,pipe:'b',end:'in'}]),false,'route restore rejects unpaired cross-room jumps');

assert.equal(choosePathCallAction('a','b',true),'send','one call sends Lumo from A directly to eligible B');
assert.equal(choosePathCallAction('b','c',true),'send','one call sends Lumo from B directly to eligible C');
assert.equal(choosePathCallAction('a','a',true),'recall','calling the same assigned mark recalls Lumo');
assert.equal(choosePathCallAction('a','b',false),'recall','an ineligible later mark cannot bypass the prior latch');
assert.equal(shouldRestorePathFollower({hasRoomMetadata:false,assignment:'a',travelling:false,actuallyArrived:false}),true,'legacy save without Lumo room metadata restores beside the player');
assert.equal(shouldRestorePathFollower({hasRoomMetadata:true,assignment:'a',travelling:true,actuallyArrived:false}),false,'valid current travel resumes from its saved route');
assert.equal(shouldRestorePathFollower({hasRoomMetadata:true,assignment:'a',travelling:false,actuallyArrived:true}),false,'valid current plate arrival remains assigned');
assert.equal(shouldRestorePathFollower({hasRoomMetadata:true,assignment:'a',travelling:false,actuallyArrived:false}),true,'stale assigned state without a route or real arrival restores safely');
assert.equal(shouldRebuildLegacyPathAssignment({hasRoomMetadata:false,assignment:'b',wasCalled:true,eligible:true,returning:false,reunited:false}),true,'known active legacy B assignment reconstructs companion travel');
assert.equal(shouldRebuildLegacyPathAssignment({hasRoomMetadata:false,assignment:'b',wasCalled:true,eligible:true,returning:true,reunited:false}),false,'legacy returning state falls back to a safe follower');
assert.equal(shouldRebuildLegacyPathAssignment({hasRoomMetadata:false,assignment:'b',wasCalled:true,eligible:false,returning:false,reunited:false}),false,'legacy B assignment cannot bypass A latch');
assert.equal(shouldRoutePathFollower('follow'),true,'unassigned follower receives a route on player room transitions');
assert.equal(shouldRoutePathFollower('a'),false,'assigned plate holder stays in its authored room on player transitions');
assert.equal(isPathRouteValid([getPathPipePoint('a','entry','out'),getPathPipePoint('a','relay','in')]),true,'follower room transition uses the paired visible A pipe');
assert.equal(isActuallyReunited({assignment:'follow',travelling:false,playerRoom:'ink',lumoRoom:'ink',player:{x:300,y:240},lumo:{x:330,y:240}}),true,'same-room follower within reunion distance counts as reunited');
assert.equal(isActuallyReunited({assignment:'a',travelling:false,playerRoom:'ink',lumoRoom:'ink',player:{x:300,y:240},lumo:{x:300,y:240}}),false,'a plate assignment is not a current reunion');
assert.equal(isActuallyReunited({assignment:'follow',travelling:true,playerRoom:'ink',lumoRoom:'ink',player:{x:300,y:240},lumo:{x:300,y:240}}),false,'a moving follower is not yet reunited');
assert.equal(isActuallyReunited({assignment:'follow',travelling:false,playerRoom:'entry',lumoRoom:'ink',player:{x:300,y:240},lumo:{x:300,y:240}}),false,'same coordinates in different rooms are not a reunion');
assert.equal(getPathExitBlock({latchC:false,memoRead:false,reunited:false}),'latch','locked exit first identifies missing latch');
assert.equal(getPathExitBlock({latchC:true,memoRead:false,reunited:false}),'memo','locked exit identifies unread memory');
assert.equal(getPathExitBlock({latchC:true,memoRead:true,reunited:false}),'companion','locked exit identifies missing actual reunion');
assert.equal(getPathExitBlock({latchC:true,memoRead:true,reunited:true}),undefined,'exit opens only after latch, memory and reunion');

assert.deepEqual(nearestSafePathSpawn('entry',{x:480,y:168}),PATH_ROOMS.entry.spawn,'saved actor in a closed doorway restores to a safe checkpoint');
assert.deepEqual(nearestSafePathSpawn('ink',{x:300,y:150}),PATH_ROOMS.ink.entrySpawn,'saved actor in masonry restores in the legitimately visited room');
assert.equal(resolvePathRoom('ink',false,false,false,false,false),'entry','unvisited saved room name cannot bypass A/B');
assert.equal(resolvePathRoom('ink',true,false,true,false,false),'relay','valid visited relay persists despite an unsolved A entrance');
assert.equal(resolvePathRoom(undefined,true,true,true,true,false),'ink','missing legacy room metadata falls back to the furthest durable checkpoint');
assert.equal(resolvePathRoom('entry',true,true,true,true,true),'entry','a legitimately backtracked entry room survives reload with later latches');
assert.equal(resolvePathRoom('entry',true,false,true,false,false),'entry','a B call does not infer that the player crossed from relay into ink');
assert.equal(resolvePathRoom('unknown',false,false,false,false,false),'entry','unknown room falls back to entry');

console.log('Level 05 geometry/state checks passed.');
