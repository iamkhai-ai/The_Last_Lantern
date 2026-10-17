import assert from 'node:assert/strict';
import { getPathDoorFace, hasDoorPower, isPathPositionSafe, isValidPathPipeHop, nearestSafePathSpawn, pathActorBody, pathDoorShouldClose, PATH_BODY, PATH_DOORS, PATH_ROOMS, rectsOverlap, resolvePathRoom } from '../src/data/pathForTwoLayout.ts';

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
    const solid = {x:e.x-e.width/2,y:e.y-e.height,width:e.width,height:e.height};
    const contacts = [
      {x:e.x,y:e.y-e.height-19}, {x:e.x,y:e.y-19},
      {x:e.x-e.width/2-6,y:e.y-e.height/2-16}, {x:e.x+e.width/2+6,y:e.y-e.height/2-16},
    ];
    for (const [direction,center] of contacts.entries()) assert.equal(rectsOverlap(pathActorBody(center),solid),true,`${roomId}/${e.id} footprint covers contact ${direction}`);
  }
}

// A closed threshold blocks its center; real power or a permanent latch opens it.
const doorCenter = {x:PATH_DOORS.a.x,y:PATH_DOORS.a.base-42};
assert.equal(actor('entry',doorCenter,{a:false,b:false,c:false,practice:false}),false);
assert.equal(actor('entry',doorCenter,{a:true,b:false,c:false,practice:false}),true);
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
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'ink',x:82,y:280,pipe:'a',end:'in'}),false,'a matching label cannot hop to an unrelated room');
assert.equal(isValidPathPipeHop({room:'relay',x:480,y:190,pipe:'b',end:'out'},{room:'ink',x:82,y:280,pipe:'b',end:'in'}),true,'B tube pairs its authored relay and ink endpoints');

assert.deepEqual(nearestSafePathSpawn('entry',{x:480,y:168}),PATH_ROOMS.entry.spawn,'saved actor in a closed doorway restores to a safe checkpoint');
assert.deepEqual(nearestSafePathSpawn('ink',{x:300,y:150}),PATH_ROOMS.ink.entrySpawn,'saved actor in masonry restores in the legitimately visited room');
assert.equal(resolvePathRoom('ink',false,false,false,false,false),'entry','unvisited saved room name cannot bypass A/B');
assert.equal(resolvePathRoom('ink',true,false,true,false,false),'relay','valid visited relay persists despite an unsolved A entrance');
assert.equal(resolvePathRoom('entry',true,true,true,true,false),'ink','durable B latch recovers legacy room state');
assert.equal(resolvePathRoom('unknown',false,false,false,false,false),'entry','unknown room falls back to entry');

console.log('Level 05 geometry/state checks passed.');
