import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { advancePathInkSequence, buildPathSchematic, choosePathCallAction, pathInkGlyphAt, pathInkGuideTarget, getPathBackArrival, getPathControlStand, getPathDoorFace, getPathDoorPassage, getPathElementArtRect, getPathElementSolid, getPathExitBlock, getPathLocalLeg, getPathPipePoint, getPathRouteLine, getPathThresholdBand, hasDoorPower, isActuallyReunited, isInsidePracticeAlcove, isNearPathPipeEndpoint, isPathApproachAllowed, isPathCallSpent, isPathDoorApproachAllowed, isPathElementInReach, isPathGateWalkIn, isPathInteractHeld, isPathPositionSafe, isPathRouteValid, isPathSeal, isPathThresholdOccupied, isValidPathPipeHop, nearestSafePathSpawn, parsePathRoute, pathActorBody, pathCallLabel, pathDoorShouldClose, pathPolylineLength, pathRouteCableSegments, pathRouteCorners, pathRoutePoints, pathStandingOwner, PATH_BACK_ARRIVAL_OFFSET, PATH_BODY, PATH_CHECKPOINTS, PATH_CONTROL_STANDS, PATH_DOOR_FACES, PATH_DOORS, PATH_ELEMENT_RADIUS, PATH_FLOOR_BOUNDS, PATH_INK_CORRIDOR, PATH_INK_GLYPHS, PATH_INK_HIT_RADIUS, PATH_INK_ORDER, PATH_REACH_GAP, PATH_ROOMS, PATH_ROUTE_LINES, PATH_SCHEMATIC, PATH_SCHEMATIC_ORDER, PATH_SCHEMATIC_SIZE, PATH_PIPE_ENDPOINTS, PATH_STANDING_SPACING, PATH_TUBE_MOUTHS, rectsOverlap, resolvePathRoom, shouldRebuildLegacyPathAssignment, shouldRecoverPathFollower, shouldRestorePathFollower, shouldRoutePathFollower } from '../src/data/pathForTwoLayout.ts';

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

/**
 * Geometry and world-state invariants: the shipped layout data against the contract (foot body,
 * solids, thresholds, arrival points, pipe hops, restore resolution). Kept as one named case so that
 * a regression here is reported on the same summary line and with the same exit code as a controller
 * regression, instead of aborting the run before the summary is printed.
 */
function geometryAndStateChecks() {
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
assert.deepEqual(getPathDoorFace('a','entry'),{id:'a',room:'entry',x:480,base:210,approach:'south'});
assert.deepEqual(getPathDoorFace('a','relay'),{id:'a',room:'relay',x:110,base:318,approach:'north'});
assert.deepEqual(getPathDoorFace('b','ink'),{id:'b',room:'ink',x:82,base:318,approach:'north'});
assert.deepEqual(getPathBackArrival('a'),{x:480,y:254},'returning through A lands beside its entry face, not the far room spawn');
assert.deepEqual(getPathBackArrival('b'),{x:480,y:254},'returning through B lands beside its relay face, not the far room spawn');
assert.equal(actor('entry',getPathBackArrival('a'),{a:false,b:false,c:false,practice:false}),true,'A return arrival is walkable entry floor while the door is closed');
assert.equal(actor('relay',getPathBackArrival('b'),{a:true,b:false,c:false,practice:false}),true,'B return arrival is walkable relay floor while the door is closed');
assert.equal(reach('entry',PATH_ROOMS.entry.spawn,getPathBackArrival('a'),{a:false,b:false,c:false,practice:false}),true,'A return arrival stays connected to the entry hall');
assert.equal(reach('relay',PATH_ROOMS.relay.spawn,getPathBackArrival('b'),{a:true,b:false,c:false,practice:false}),true,'B return arrival stays connected to the relay hall');

// Landing must not open a control: the engine answers within radius + INTERACTION_RADIUS_PADDING, and the
// padding lives only in the engine source, so it is read from there rather than copied.
{
  const interactionSource = readFileSync(new URL('../src/systems/InteractionSystem.ts', import.meta.url), 'utf8');
  const padding = Number(interactionSource.match(/INTERACTION_RADIUS_PADDING\s*=\s*(\d+)/)?.[1]);
  assert.ok(Number.isFinite(padding), 'the engine interaction padding is declared in InteractionSystem.ts');
  const arrivals = [
    ['relay', PATH_ROOMS.relay.entrySpawn, 'entry -> relay'],
    ['ink', PATH_ROOMS.ink.entrySpawn, 'relay -> ink'],
    ['entry', getPathBackArrival('a'), 'relay -> entry'],
    ['relay', getPathBackArrival('b'), 'ink -> relay'],
  ];
  for (const [room, point, label] of arrivals) {
    for (const stand of PATH_CONTROL_STANDS.filter((item) => item.room === room)) {
      const distance = Math.hypot(point.x - stand.x, point.y - stand.y);
      assert.ok(distance > stand.radius + padding,
        `${label} lands ${distance.toFixed(1)}px from the ${stand.id} door stand, outside ${stand.radius}+${padding}`);
    }
    for (const element of PATH_ROOMS[room].elements.filter((item) => !isPathSeal(item))) {
      const distance = Math.hypot(point.x - element.stand.x, point.y - element.stand.y);
      assert.ok(distance > PATH_ELEMENT_RADIUS + padding || !isPathApproachAllowed(room, element, point),
        `${label} landing does not open the ${element.id} prompt`);
    }
  }
}

// The reverse pocket of door A reaches the hall past the frame's posts (x 132..142). Every body centre from
// x 126 to 150 must have a clear vertical span of at least 36px, so the foot box can pass without a squeeze.
// A legal centre run of length L is a clear span of L + 6px (the foot box height). The 20px band left by the
// partition's west edge at x 130 fails this at x 126..136; a recess starting at x 118 clears it.
{
  const closed = { a: false, b: false, c: false, practice: false };
  for (let x = 126; x <= 150; x += 2) {
    let top = 200, bottom = 200;
    while (actor('relay', { x, y: top - 1 }, closed)) top -= 1;
    while (actor('relay', { x, y: bottom + 1 }, closed)) bottom += 1;
    const span = bottom - top + 6;
    assert.ok(span >= 36, `the reverse frame's passage at x=${x} is ${span}px tall; the threshold is 36px`);
  }
}

// Every control stays reachable from its room's entry while all doors are closed, so no recall can strand
// the player: this is the state in which a recall from the B call closes door A. The practice alcove is
// optional and sealed until its door opens, so its inner call is exempt.
{
  const closed = { a: false, b: false, c: false, practice: false };
  for (const room of ['entry', 'relay', 'ink']) {
    const from = PATH_ROOMS[room].entrySpawn;
    for (const element of PATH_ROOMS[room].elements.filter((item) => !isPathSeal(item) && item.id !== 'inner-call' && item.id !== 'spiral')) {
      assert.equal(reach(room, from, element.stand, closed), true,
        `${room} control ${element.id} is reachable from the room's entry with every door closed`);
    }
  }
}
assert.equal(isInsidePracticeAlcove('entry',{x:244,y:150}),true,'the practice stand sits inside the lesson alcove');
assert.equal(isInsidePracticeAlcove('entry',{x:544,y:150}),false,'the A alcove is not treated as the practice lesson area');
assert.equal(isInsidePracticeAlcove('relay',{x:100,y:150}),false,'other rooms never report the entry practice alcove');
assert.equal(isPathThresholdOccupied('entry','practice',{x:244,y:150}),true,'standing at the inside lesson call keeps the practice door open');
assert.equal(isPathThresholdOccupied('entry','practice',{x:180,y:280}),false,'the entry hall floor never counts as practice threshold occupancy');
assert.equal(isPathThresholdOccupied('entry','a',{x:480,y:190}),true,'standing in the A doorway defers its closure');
assert.equal(isPathThresholdOccupied('entry','a',{x:480,y:230}),false,'standing south of A leaves its threshold free to close');
assert.equal(actor('entry',{x:480,y:190},{a:false,b:false,c:false,practice:false}),false,'a closed A threshold blocks the doorway itself');
assert.equal(actor('entry',{x:480,y:190},{a:true,b:false,c:false,practice:false}),true,'an open A threshold lets the body occupy the doorway');
assert.equal(actor('relay',{x:480,y:190},{a:true,b:false,c:false,practice:false}),false,'a closed B threshold blocks the relay doorway');
assert.equal(actor('relay',{x:480,y:190},{a:true,b:true,c:false,practice:false}),true,'an open B threshold lets the body occupy the relay doorway');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,{x:574,y:188},{a:true,b:true,c:false,practice:false}),true,'the ink corridor reaches the final exit stand without the exit latch');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,{x:574,y:188},{a:true,b:true,c:true,practice:false}),true,'the final exit stand stays reachable after the exit latch');
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
// ONE DOOR, ONE STATION: the far-side posts that only recalled Lumo are gone from every room and every solid list.
for (const roomId of Object.keys(PATH_ROOMS)) {
  for (const id of ['call-a-far', 'call-b-far']) {
    assert.equal(PATH_ROOMS[roomId].elements.some((e) => e.id === id), false, `${roomId} no longer registers the far-side post ${id}`);
    assert.equal(PATH_ROOMS[roomId].solids.some((s) => s.elementId === id), false, `${roomId} no longer blocks for the far-side post ${id}`);
  }
}
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='call-c').stand),true,'ink room reaches C call');
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='latch-c').stand),true,'corridor reaches final side latch');
assert.equal(reach('entry',PATH_ROOMS.entry.spawn,PATH_ROOMS.entry.elements.find(e=>e.id==='inner-call').stand,{a:false,b:false,c:false,practice:true}),true,'open practice doorway connects the lower hall to its inside recovery call');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:280,pipe:'a',end:'in'}),true,'A tube pairs its authored entry and relay endpoints');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'x',end:'out'},{room:'relay',x:110,y:280,pipe:'x',end:'in'}),false,'unknown pipe labels fail closed without unsafe endpoint lookup');
assert.deepEqual(getPathPipePoint('a','entry','out'),{room:'entry',x:480,y:190,pipe:'a',end:'out'},'runtime route uses the authored A endpoint data');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'ink',x:82,y:280,pipe:'a',end:'in'}),false,'a matching label cannot hop to an unrelated room');
assert.equal(isValidPathPipeHop({room:'entry',x:479,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:280,pipe:'a',end:'in'}),false,'wrong outgoing coordinates cannot use the A room hop');
assert.equal(isValidPathPipeHop({room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:279,pipe:'a',end:'in'}),false,'wrong incoming coordinates cannot use the A room hop');
assert.equal(isValidPathPipeHop({room:'relay',x:480,y:190,pipe:'b',end:'out'},{room:'ink',x:82,y:280,pipe:'b',end:'in'}),true,'B tube pairs its authored relay and ink endpoints');
assert.equal(isNearPathPipeEndpoint({x:480,y:190},{room:'entry',x:480,y:190,pipe:'a',end:'out'}),true,'companion at the actual outgoing port may cross rooms');
assert.equal(isNearPathPipeEndpoint({x:460,y:190},{room:'entry',x:480,y:190,pipe:'a',end:'out'}),false,'companion far from the outgoing port cannot be teleported across rooms');
assert.equal(isNearPathPipeEndpoint({x:480,y:190},{room:'entry',x:480,y:190,pipe:'x',end:'out'}),false,'unknown pipe labels cannot pass outgoing endpoint checks');
assert.equal(parsePathRoute([{room:'entry',x:480,y:190,pipe:'x',end:'out'},{room:'relay',x:110,y:280,pipe:'a',end:'in'}]),undefined,'saved routes with unknown labels are rejected in full');
assert.equal(parsePathRoute([{room:'entry',x:480,y:190,pipe:'a',end:'out'},{room:'relay',x:110,y:279,pipe:'a',end:'in'}]),undefined,'saved routes with malformed endpoint coordinates are rejected in full');
assert.deepEqual(parsePathRoute([{room:'entry',x:180,y:280}]),[{room:'entry',x:180,y:280}],'valid same-room saved routes remain parseable');
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
assert.equal(shouldRecoverPathFollower({invalidSavedRoute:true,hasRoomMetadata:true,assignment:'follow',travelling:false,actuallyArrived:false}),true,'a malformed saved route restores an off-room follower beside the player');
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
}

/* ------------------------------------------------------------------ *
 * The shipped controller
 *
 * `src/levels/PathForTwoLevel.ts` imports Phaser, so a plain Node import cannot resolve it (checked
 * the same way `scripts/check-interaction-targets.mjs` does). The behaviour cases below therefore
 * pull the *shipped* method bodies out of the source with the TypeScript compiler API, transpile
 * them and bind them to a recording stand-in for the scene ports — the same technique, and the same
 * reason, as that check and `scripts/check-campaign-runtime.mjs`.
 * ------------------------------------------------------------------ */

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER_FILE = join(rootDir, 'src/levels/PathForTwoLevel.ts');
const CONTROLLER_SOURCE = readFileSync(CONTROLLER_FILE, 'utf8');
const controllerAst = ts.createSourceFile(CONTROLLER_FILE, CONTROLLER_SOURCE, ts.ScriptTarget.Latest, true);

const nodeText = (node) => node.getText(node.getSourceFile());
function walkNode(node, visit) { visit(node); node.forEachChild((child) => walkNode(child, visit)); }
function findNode(root, predicate) {
  let found = null;
  walkNode(root, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}
/** The shipped body of one method, so a rename or a moved gate fails here instead of passing. */
function methodBody(name) {
  const method = findNode(controllerAst, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === name);
  assert.ok(method, `PathForTwoLevel still declares ${name}()`);
  assert.ok(method.body, `${name}() still has a body`);
  return nodeText(method.body);
}
/** A module-local constant of the controller, read from its source, never hand-copied. */
function controllerConstant(name) {
  const declaration = findNode(controllerAst, (node) => ts.isVariableDeclaration(node) && nodeText(node.name) === name);
  assert.ok(declaration?.initializer, `PathForTwoLevel still authors ${name}`);
  const js = ts.transpileModule(`const __value = (${nodeText(declaration.initializer)});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(`"use strict";\n${js}\nreturn __value;`)();
}
/** Compile one extracted body into a method, closing over the layout symbols it uses. */
function compile(name, parameters, symbols) {
  const names = Object.keys(symbols);
  const js = ts.transpileModule(`const __unit = function (${parameters.join(', ')}) {\n${methodBody(name)}\n};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  let unit;
  try {
    unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...names.map((key) => symbols[key]));
  } catch (error) {
    throw new Error(`could not bind the shipped PathForTwoLevel.${name}(): ${error.message}`);
  }
  return unit;
}

/**
 * A stand-in for the scene ports the shipped Level 05 methods read. `stand()` places the shared
 * player probe at a standing position; every control predicate below is the shipped method, bound to
 * the layout symbols it closes over.
 */
function makePathScene(room, flags, extra = {}) {
  const scene = {
    room,
    progress: { flags: { ...flags }, counters: {} },
    player: { x: PATH_ROOMS[room].spawn.x, y: PATH_ROOMS[room].spawn.y },
    assignment: 'follow',
    lumoRoom: room,
    doorImages: new Map(),
    said: [],
    saved: 0,
    sent: [],
    recalled: 0,
    power: {},
    travelling: false,
    reunited: false,
    thresholds: {},
    interactReleasePending: false,
    interactKey: { isDown: false },
    lanternOn: false,
    ...extra,
  };
  scene.stand = (x, y) => { scene.player.x = x; scene.player.y = y; };
  scene.say = (lines) => scene.said.push(lines);
  scene.save = () => { scene.saved += 1; };
  scene.hasPower = (mark) => scene.power[mark] === true;
  scene.isTravelling = () => scene.travelling;
  scene.isActuallyReunited = () => scene.reunited;
  scene.thresholdOccupied = (id) => scene.thresholds[id] === true;
  scene.imageFor = () => undefined;
  // The companion stand-in the shipped travel methods steer: it reproduces `Lumo.update()`'s own
  // spring (the caller passes `target - 18, target + 12` and the actor adds that offset back, so the
  // sprite converges on the route point itself).
  scene.lumo = {
    sprite: {
      x: PATH_ROOMS[room].spawn.x - 22,
      y: PATH_ROOMS[room].spawn.y - 18,
      setPosition(x, y) { this.x = x; this.y = y; },
    },
    update(dt, x, y) {
      const k = Math.min(1, dt * 0.008);
      this.sprite.x += (x + 18 - this.sprite.x) * k;
      this.sprite.y += (y - 12 - this.sprite.y) * k;
    },
    setVisible() {},
  };
  scene.send = (mark) => scene.sent.push(mark);
  scene.recallToCall = () => { scene.recalled += 1; };
  scene.isInteractKeyDown = compile('isInteractKeyDown', [], {});
  scene.heldInteract = compile('heldInteract', [], { isPathInteractHeld });
  scene.elementFor = compile('elementFor', ['id'], { PATH_ROOMS });
  scene.isDoorOpen = compile('isDoorOpen', ['mark'], {});
  scene.pathReachOptions = compile('pathReachOptions', [], {});
  scene.elementApproach = compile('elementApproach', ['id', 'x', 'y'], { PATH_ROOMS, isPathApproachAllowed });
  scene.doorApproach = compile('doorApproach', ['id', 'x', 'y'], { isPathDoorApproachAllowed });
  scene.doorPrompt = compile('doorPrompt', ['id'], {});
  scene.doorEnabled = compile('doorEnabled', ['id'], {});
  scene.callMark = compile('callMark', ['id'], {});
  scene.callEligible = compile('callEligible', ['mark'], {});
  scene.latchCBlockReason = compile('latchCBlockReason', [], {
    INK_NOT_SEEN: controllerConstant('INK_NOT_SEEN'), MARK_NOT_CALLED: controllerConstant('MARK_NOT_CALLED'),
  });
  scene.interactionEnabled = compile('interactionEnabled', ['id'], { isPathCallSpent });
  scene.prompt = compile('prompt', ['id'], { PLATE_ROOMS: controllerConstant('PLATE_ROOMS'), choosePathCallAction });
  scene.interact = compile('interact', ['id'], {
    MEMORY: controllerConstant('MEMORY'), choosePathCallAction,
    LATCH_A_LINES: controllerConstant('LATCH_A_LINES'), NEXT_MARK_UNLATCHED: controllerConstant('NEXT_MARK_UNLATCHED'),
    STILL_TRAVELLING: controllerConstant('STILL_TRAVELLING'),
  });
  scene.getObjectiveText = compile('getObjectiveText', [], { PATH_ROOMS, getPathExitBlock, isInsidePracticeAlcove, pathDoorShouldClose });
  // E at a door: the held-E and approach gate, then the same `runDoor` a walk-in into the arch reaches.
  scene.useDoor = compile('useDoor', ['id'], {});
  scene.runDoor = compile('runDoor', ['id'], {
    PATH_ROOMS, getPathExitBlock, getPathBackArrival,
    STILL_TRAVELLING: controllerConstant('STILL_TRAVELLING'), MARK_NOT_CALLED: controllerConstant('MARK_NOT_CALLED'),
    TOWER_NEEDS_LUMO: controllerConstant('TOWER_NEEDS_LUMO'),
  });
  scene.walkedGate = compile('walkedGate', ['prev', 'now'], { PATH_DOOR_FACES, isPathGateWalkIn });
  return scene;
}

const saidText = (scene) => scene.said.flat().map((line) => line.text).join(' | ');

/**
 * Bind the *shipped* travel pipeline (send → route → advanceLumo → completeRoute → recall) onto a
 * fixture, replacing the recorder stubs. Used by the lesson case, which has to prove the practice
 * path really teaches send, travel, arrival and recall rather than asserting it in prose.
 */
function bindTravelPipeline(scene) {
  const plateRooms = controllerConstant('PLATE_ROOMS');
  scene.persistRoute = compile('persistRoute', [], {});
  scene.localRoute = compile('localRoute', ['mark'], { PLATE_ROOMS: plateRooms, getPathLocalLeg });
  scene.pipeRoute = compile('pipeRoute', ['from', 'to'], { getPathPipePoint });
  scene.buildAssignmentRoute = compile('buildAssignmentRoute', ['mark', 'playerPoint'], { PLATE_ROOMS: plateRooms });
  scene.send = compile('send', ['mark'], {
    SEND_LINES: controllerConstant('SEND_LINES'), LATCHED_CALL_LINES: controllerConstant('LATCHED_CALL_LINES'),
  });
  scene.recallToCall = compile('recallToCall', ['id'], {
    RECALL_LINES: controllerConstant('RECALL_LINES'), FINAL_RECALL_LINES: controllerConstant('FINAL_RECALL_LINES'),
  });
  scene.isPairedPipeHop = compile('isPairedPipeHop', ['target'], { isValidPathPipeHop, isNearPathPipeEndpoint });
  scene.cancelInvalidRoute = compile('cancelInvalidRoute', [], {});
  scene.completeRoute = compile('completeRoute', ['room'], { PRACTICE_ARRIVAL: controllerConstant('PRACTICE_ARRIVAL') });
  scene.queueStoryBeat = compile('queueStoryBeat', ['lines', 'onComplete', 'guard', 'onStale'], {});
  scene.flushPendingStoryBeat = compile('flushPendingStoryBeat', [], {});
  scene.advanceLumo = compile('advanceLumo', ['dt'], {});
  scene.isTravelling = compile('isTravelling', [], {});
  scene.pendingStoryBeats = [];
  scene.canStartStory = () => false;
  scene.power = {};
  scene.hasPower = (mark) => hasDoorPower(mark, {
    assignment: scene.assignment, lumoRoom: scene.lumoRoom, lumoX: scene.lumo.sprite.x, lumoY: scene.lumo.sprite.y,
  });
  return scene;
}

/** Every legal standing position inside a control's own trigger disc. */
function legalDisc(room, stand, radius, open = allOpen) {
  const positions = [];
  for (let x = stand.x - radius; x <= stand.x + radius; x += 1) {
    for (let y = stand.y - radius; y <= stand.y + radius; y += 1) {
      if (Math.hypot(x - stand.x, y - stand.y) > radius) continue;
      if (!actor(room, { x, y }, open)) continue;
      positions.push({ x, y });
    }
  }
  return positions;
}

const pointInRect = (point, rect) => point.x >= rect.x && point.x <= rect.x + rect.width
  && point.y >= rect.y && point.y <= rect.y + rect.height;

/** The standing props of a room (call posts and latches): every element that is not a seal or the engraving. */
const standingElements = (roomId) => PATH_ROOMS[roomId].elements.filter((item) => !isPathSeal(item) && item.approach !== 'side');
const elementOf = (roomId, id) => PATH_ROOMS[roomId].elements.find((item) => item.id === id);

/**
 * RULE_GAMES §1 oracle: the gap from the 14×6 foot body to a prop's collision solid, written here from
 * the rule itself (not imported from the shipped code) so the shipped predicate is checked against it.
 */
function oracleGap(center, solid) {
  const body = pathActorBody(center);
  const dx = Math.max(solid.x - (body.x + body.width), body.x - (solid.x + solid.width), 0);
  const dy = Math.max(solid.y - (body.y + body.height), body.y - (solid.y + solid.height), 0);
  return Math.hypot(dx, dy);
}

/**
 * The shipped standing position that places the foot body 2px off the south edge of a prop's solid,
 * centred on the prop. The authored `stand` sits 24-40px south of the solid, outside reach, so the
 * behaviour cases stand the player at this point instead. Asserted to be in reach before it is used.
 */
function inReachPoint(roomId, element) {
  const solid = getPathElementSolid(roomId, element.id);
  const point = { x: solid.x + solid.width / 2, y: solid.y + solid.height + 2 - PATH_BODY.y };
  assert.equal(isPathElementInReach(roomId, element, point), true, `${roomId}/${element.id} has an in-reach point on its south edge`);
  return point;
}

/**
 * The probe centres for the 8px and 9px edges of one solid (RULE_GAMES §1), placed so the foot body sits
 * `gap` px from the outer edge: four sides, and the four diagonals at (6,5) and (6,6), whose true gaps are
 * 7.81 (answers) and 8.49 (silent). `design` is the gap the probe was placed at.
 */
function edgeProbes(solid) {
  const cx = solid.x + solid.width / 2;
  const cy = solid.y + solid.height / 2;
  const right = solid.x + solid.width;
  const bottom = solid.y + solid.height;
  // A body centre is PATH_BODY.x / PATH_BODY.y away from the body's own top-left corner (-7, +16).
  const probes = [];
  for (const gap of [8, 9]) {
    probes.push({ side: 'north', gap, expect: gap <= 8, center: { x: cx, y: solid.y - gap - 22 } });
    probes.push({ side: 'south', gap, expect: gap <= 8, center: { x: cx, y: bottom + gap - 16 } });
    probes.push({ side: 'west', gap, expect: gap <= 8, center: { x: solid.x - gap - 7, y: cy - 19 } });
    probes.push({ side: 'east', gap, expect: gap <= 8, center: { x: right + gap + 7, y: cy - 19 } });
  }
  // Diagonals: (6,5) is 7.81px away and answers; (6,6) is 8.49px away and is silent.
  for (const [a, b] of [[6, 5], [6, 6]]) {
    const gap = Math.hypot(a, b);
    probes.push({ side: 'north-east', gap, expect: gap <= 8, center: { x: right + a + 7, y: solid.y - b - 22 } });
    probes.push({ side: 'south-east', gap, expect: gap <= 8, center: { x: right + a + 7, y: bottom + b - 16 } });
    probes.push({ side: 'south-west', gap, expect: gap <= 8, center: { x: solid.x - a - 7, y: bottom + b - 16 } });
    probes.push({ side: 'north-west', gap, expect: gap <= 8, center: { x: solid.x - a - 7, y: solid.y - b - 22 } });
  }
  return probes;
}

/**
 * Every rect the shipped controller draws with `tileSprite`, read out of the source and evaluated
 * against the layout symbol: a hand-written literal is measured exactly like a derived one, so the ink
 * case never restates the numbers it is checking.
 */
function tileSpriteRects(source) {
  const calls = [...source.matchAll(/add\.tileSprite\(([\s\S]*?)\)/g)];
  assert.ok(calls.length > 0, 'the controller still draws its native tiles with tileSprite');
  return calls.map((call) => {
    const args = call[1].split(',').map((part) => part.trim());
    assert.equal(args.length, 5, `the tile is drawn from a centre, a size and a key (got ${args.length} arguments)`);
    const [cx, cy, width, height] = args.slice(0, 4).map((arg) => new Function('PATH_INK_CORRIDOR', `return (${arg});`)(PATH_INK_CORRIDOR));
    return { x: cx - width / 2, y: cy - height / 2, width, height };
  });
}
const rectCovers = (rect, band) => rect.x <= band.x && rect.y <= band.y
  && rect.x + rect.width >= band.x + band.width && rect.y + rect.height >= band.y + band.height;
const rectInside = (rect, bounds) => rect.x >= bounds.x && rect.y >= bounds.y
  && rect.x + rect.width <= bounds.x + bounds.width && rect.y + rect.height <= bounds.y + bounds.height;

/* ------------------------------------------------------------------ *
 * Cases: the controller behaviour this task owns
 * ------------------------------------------------------------------ */

const controllerFailures = [];
let controllerCaseCount = 0;
function controllerCase(name, run) {
  controllerCaseCount += 1;
  try {
    run();
    console.log(`PASS  ${name}`);
  } catch (error) {
    controllerFailures.push(name);
    console.log(`FAIL  ${name}`);
    for (const line of String(error.message).split('\n')) console.log(`        ${line}`);
  }
}

controllerCase('geometry_and_state_invariants', geometryAndStateChecks);

controllerCase('the_whole_lesson_still_teaches_send_travel_arrival_and_recall', () => {
  // The optional lesson (D1) still teaches its four beats with the shipped code, and the lesson door
  // never closes on the player standing inside its own alcove.
  const scene = bindTravelPipeline(makePathScene('entry', {}, { player: inReachPoint('entry', elementOf('entry', 'practice-call')) }));
  const lumo = scene.lumo.sprite;

  // Beat 1 — send: E at the near call sends Lumo to the lesson plate behind the low door.
  scene.interact('practice-call');
  assert.equal(scene.progress.flags['l4-called-practice'], true, 'the lesson call records the assignment');
  assert.equal(scene.progress.flags['l4-assignment'], 'practice', 'Lumo is assigned to the lesson plate');
  assert.ok(scene.route.length > 1, `the shipped send builds a real route (${scene.route.length} waypoints)`);
  assert.deepEqual({ x: scene.route[scene.route.length - 1].x, y: scene.route[scene.route.length - 1].y }, { x: 212, y: 114 },
    'the route ends on the authored lesson plate');
  assert.equal(scene.progress.flags['l4-practice-complete'], undefined, 'sending is not the lesson: nothing completes yet');

  // Beat 2 — travel, beat 3 — arrival: the shipped per-frame travel walks the whole route.
  let frames = 0;
  while (scene.isTravelling() && frames < 900) { scene.advanceLumo(16); frames += 1; }
  assert.equal(scene.isTravelling(), false, `Lumo finishes the taught route (${frames} frames)`);
  assert.ok(Math.hypot(lumo.x - 212, lumo.y - 114) < 12, `Lumo really arrives at the plate (${lumo.x.toFixed(1)},${lumo.y.toFixed(1)})`);
  assert.equal(scene.progress.flags['l4-at-practice'], true, 'the arrival is recorded as a real arrival');
  assert.equal(hasDoorPower('practice', { assignment: scene.assignment, lumoRoom: scene.lumoRoom, lumoX: lumo.x, lumoY: lumo.y }), true,
    'the standing plate powers the lesson door');
  assert.equal(scene.progress.flags['l4-practice-complete'], undefined, 'an arrival is not yet a completed lesson');
  assert.equal(scene.pendingStoryBeats.length, 1, 'the arrival queues the lesson explanation');

  // The door is open and the player can step inside without it closing on their feet.
  const innerCall = inReachPoint('entry', elementOf('entry', 'inner-call'));
  scene.stand(innerCall.x, innerCall.y);
  assert.equal(isPathThresholdOccupied('entry', 'practice', innerCall), true,
    'standing at the inside lesson call occupies the door threshold');
  assert.equal(pathDoorShouldClose(false, true, false), false, 'so the lesson door stays open under the player');
  assert.equal(scene.prompt('inner-call'), 'E · Gọi Lumo về mốc', 'the inside call offers the recall');

  // Beat 4 — recall: E at the far-side call really recalls Lumo and that is what completes the lesson.
  scene.interact('inner-call');
  assert.equal(scene.progress.flags['l4-assignment'], 'follow', 'the recall returns Lumo to the player');
  assert.equal(scene.progress.flags['l4-practice-complete'], true, 'the real recall is the only thing that completes the lesson');
  assert.equal(scene.progress.flags['l4-at-practice'], false, 'the plate is no longer held');
  assert.equal(isPathRouteValid(scene.route), true, 'the recall route the lesson teaches is a valid published route');
  const writers = (CONTROLLER_SOURCE.match(/flags\[['"]l4-practice-complete['"]\]\s*=/g) ?? []).length;
  assert.equal(writers, 1, 'practice-complete still has exactly one writer, the real lesson recall');
});

controllerCase('skipping_the_lesson_still_lets_the_player_call_A', () => {
  const scene = makePathScene('entry', {}, { player: inReachPoint('entry', elementOf('entry', 'call-a')) });
  assert.equal(scene.callEligible('a'), true, 'calling A never requires the optional lesson');
  assert.equal(scene.interactionEnabled('call-a'), true, 'the A call is enabled without any lesson flag');
  assert.equal(scene.prompt('call-a'), 'E · Gọi Lumo tới ấn', 'the A call advertises sending Lumo to the plate');
  scene.interact('call-a');
  assert.deepEqual(scene.sent, ['a'], 'E at call A sends Lumo instead of refusing him');
  assert.equal(scene.said.length, 0, `no refusal line is played (${saidText(scene)})`);
  assert.equal(scene.progress.flags['l4-practice-complete'], undefined,
    'the skipped lesson writes no fake practice-complete flag');
  const writers = (CONTROLLER_SOURCE.match(/flags\[['"]l4-practice-complete['"]\]\s*=/g) ?? []).length;
  assert.equal(writers, 1, 'practice-complete has exactly one writer, the real lesson recall');
});

controllerCase('isPathCallSpent_is_true_only_for_a_latched_non_practice_mark', () => {
  const rows = [
    ['a', { 'l4-latch-a': true }, true], ['a', {}, false], ['a', { 'l4-latch-b': true }, false],
    ['b', { 'l4-latch-a': true }, false], ['b', { 'l4-latch-b': true }, true], ['b', { 'l4-latch-b': false }, false],
    ['c', { 'l4-latch-b': true, 'l4-latch-c': true }, true], ['c', { 'l4-latch-b': true }, false],
    ['c', { 'l4-latch-c': 'true' }, false],
    ['practice', { 'l4-latch-practice': true }, false], ['practice', {}, false],
  ];
  for (const [mark, flags, expected] of rows) {
    assert.equal(isPathCallSpent(mark, flags), expected, `isPathCallSpent(${mark}, ${JSON.stringify(flags)})`);
  }
});

controllerCase('pathCallLabel_reads_the_post_letter_and_ticks_when_spent', () => {
  assert.equal(pathCallLabel('practice', false), 'Thử');
  assert.equal(pathCallLabel('practice', true), 'Thử ✓');
  assert.equal(pathCallLabel('a', false), 'A');
  assert.equal(pathCallLabel('b', true), 'B ✓');
  assert.equal(pathCallLabel('c', false), 'C');
});

controllerCase('a_latched_call_post_is_disabled_and_silent_while_the_useful_posts_answer', () => {
  // Once its own door is latched a call post has nothing left to do: no prompt, no E, no line, no Lumo.
  const spent = [
    { room: 'entry', id: 'call-a', flags: { 'l4-latch-a': true } },
    { room: 'relay', id: 'call-b', flags: { 'l4-latch-a': true, 'l4-latch-b': true } },
    { room: 'ink', id: 'call-c', flags: { 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true } },
  ];
  for (const { room, id, flags } of spent) {
    const label = `${room}/${id} with ${JSON.stringify(flags)}`;
    const scene = makePathScene(room, flags, { player: inReachPoint(room, elementOf(room, id)) });
    assert.equal(scene.elementApproach(id, scene.player.x, scene.player.y), true, `${label}: the foot is in its reach`);
    assert.equal(scene.interactionEnabled(id), false, `${label}: the spent post is disabled`);
    const before = JSON.stringify(scene.progress.flags) + scene.sent.length + scene.said.length + scene.recalled;
    scene.interact(id);
    assert.equal(JSON.stringify(scene.progress.flags) + scene.sent.length + scene.said.length + scene.recalled, before,
      `${label}: E changes no flag, sends nothing, says nothing and recalls nothing`);
  }
  // The posts that still do something stay enabled, and the same post is live again before its latch.
  const ink = makePathScene('ink', { 'l4-latch-b': true }, { player: inReachPoint('ink', elementOf('ink', 'call-c')) });
  assert.equal(ink.interactionEnabled('call-c'), true, 'the C post stays enabled while C is not latched');
  assert.equal(ink.prompt('call-c'), 'E · Gọi Lumo tới ấn', 'the C post still advertises its call');
  // Latch C keeps recalling Lumo through its own handle, latched or not.
  const exit = makePathScene('ink', { 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true },
    { player: inReachPoint('ink', elementOf('ink', 'latch-c')) });
  assert.equal(exit.interactionEnabled('latch-c'), true, 'latch C still answers once latched');
  assert.equal(exit.prompt('latch-c'), 'E · Gọi Lumo về', 'latch C still offers the recall');
  exit.interact('latch-c');
  assert.equal(exit.recalled, 1, 'E on latch C recalls Lumo');
});

/* ------------------------------------------------------------------ *
 * ONE DOOR, ONE STATION: the latch of door A (relay) and door B (ink) is the only control for its door.
 * ------------------------------------------------------------------ */

const standAt = (room, id) => inReachPoint(room, elementOf(room, id));
const PHASER_CLAMP = { Phaser: { Math: { Clamp: (value, low, high) => Math.min(Math.max(value, low), high) } } };

/**
 * A save and reload in the middle of Lumo's travel. The progress is written and read back as JSON, and the restore
 * reads the same keys `build()` reads (normalized progress, assignment, saved route and index, Lumo's room and
 * position). `recovered` is the shipped `shouldRecoverPathFollower` gate that decides whether `build()` would reset a
 * travelling companion to a follower; a reload must not do that.
 */
function reloadPathScene(scene, room) {
  const saved = JSON.parse(JSON.stringify({ flags: scene.progress.flags, counters: scene.progress.counters }));
  const fresh = bindTravelPipeline(makePathScene(room, saved.flags, {
    player: { x: scene.player.x, y: scene.player.y },
    progress: { flags: saved.flags, counters: saved.counters },
  }));
  fresh.normalizeProgress = compile('normalizeProgress', [], { PATH_INK_ORDER });
  fresh.readRoute = compile('readRoute', [], { parsePathRoute, isPathRouteValid });
  fresh.getAssignment = compile('getAssignment', [], {});
  fresh.readLumoRoom = compile('readLumoRoom', [], {});
  fresh.getLumoPosition = compile('getLumoPosition', [], PHASER_CLAMP);
  fresh.normalizeProgress();
  const { route, invalid } = fresh.readRoute();
  fresh.assignment = fresh.getAssignment();
  fresh.lumoRoom = fresh.readLumoRoom();
  const at = fresh.getLumoPosition();
  fresh.lumo.sprite.setPosition(at.x, at.y);
  fresh.route = invalid ? [] : route;
  fresh.routeIndex = Math.max(0, Math.min(fresh.route.length, Math.floor(fresh.progress.counters['l4-route-index'] ?? 0)));
  fresh.recovered = shouldRecoverPathFollower({
    invalidSavedRoute: invalid || !isPathRouteValid(fresh.route),
    hasRoomMetadata: ['entry', 'relay', 'ink'].includes(String(fresh.progress.flags['l4-lumo-room'])),
    assignment: fresh.assignment,
    travelling: fresh.isTravelling(),
    actuallyArrived: ['practice', 'a', 'b', 'c'].some((mark) => fresh.hasPower(mark)),
  });
  return fresh;
}

controllerCase('each_latch_is_the_one_station_for_its_door', () => {
  // Relay A: no Lumo at plate A yet, so E sends him there. A call post is never a station, so the latch never recalls.
  const idle = makePathScene('relay', { 'l4-visited-relay': true }, { player: standAt('relay', 'latch-a') });
  assert.equal(idle.prompt('latch-a'), 'E · Gọi Lumo tới ấn A', 'an unlatched A station offers to call Lumo to plate A');
  assert.equal(idle.interactionEnabled('latch-a'), true, 'and answers');
  idle.interact('latch-a');
  assert.deepEqual(idle.sent, ['a'], 'E at the A station sends Lumo to plate A');
  assert.equal(idle.recalled, 0, 'the station never recalls Lumo');
  assert.equal(idle.progress.flags['l4-latch-a'], undefined, 'and latches nothing while Lumo is away');

  // Lumo holds plate A: the same station latches the door, exactly as the old latch did, and sends nothing.
  const held = makePathScene('relay', { 'l4-visited-relay': true },
    { player: standAt('relay', 'latch-a'), power: { a: true }, assignment: 'a', lumoRoom: 'entry' });
  assert.equal(held.prompt('latch-a'), 'E · Gài chốt A', 'with Lumo on plate A the station advertises the latch');
  held.interact('latch-a');
  assert.equal(held.progress.flags['l4-latch-a'], true, 'E latches door A');
  assert.deepEqual(held.said.at(-1), controllerConstant('LATCH_A_LINES'), 'with the approved latch line');
  assert.deepEqual(held.sent, [], 'and sends nothing');
  assert.equal(held.recalled, 0, 'and recalls nothing');

  // While Lumo is on his way to A the station is silent: no prompt, no answer, nothing sent or said.
  const travelling = makePathScene('relay', { 'l4-visited-relay': true },
    { player: standAt('relay', 'latch-a'), assignment: 'a', travelling: true });
  assert.equal(travelling.prompt('latch-a'), null, 'no prompt while Lumo is travelling to A');
  assert.equal(travelling.interactionEnabled('latch-a'), false, 'and the station is disabled');
  travelling.interact('latch-a');
  assert.deepEqual(travelling.sent, [], 'E sends nothing a second time');
  assert.equal(travelling.said.length, 0, 'and says nothing');

  // Lumo travelling to B does not silence the A station.
  const towardsB = makePathScene('relay', { 'l4-visited-relay': true },
    { player: standAt('relay', 'latch-a'), assignment: 'b', travelling: true });
  assert.equal(towardsB.prompt('latch-a'), 'E · Gọi Lumo tới ấn A', 'a trip to B is not a trip to A');

  // Latched: silent and disabled, as before.
  const latched = makePathScene('relay', { 'l4-visited-relay': true, 'l4-latch-a': true }, { player: standAt('relay', 'latch-a') });
  assert.equal(latched.interactionEnabled('latch-a'), false, 'a latched A station is disabled');
  latched.interact('latch-a');
  assert.equal(latched.sent.length + latched.said.length, 0, 'and E there does nothing');

  // Ink B: the same station, with the latch in the ink room and plate B in the relay room.
  const inkIdle = makePathScene('ink', { 'l4-visited-ink': true, 'l4-latch-a': true }, { player: standAt('ink', 'latch-b') });
  assert.equal(inkIdle.prompt('latch-b'), 'E · Gọi Lumo tới ấn B', 'an unlatched B station offers to call Lumo to plate B');
  inkIdle.interact('latch-b');
  assert.deepEqual(inkIdle.sent, ['b'], 'E at the B station sends Lumo to plate B');
  assert.equal(inkIdle.recalled, 0, 'the B station never recalls Lumo');
  const inkHeld = makePathScene('ink', { 'l4-visited-ink': true, 'l4-latch-a': true },
    { player: standAt('ink', 'latch-b'), power: { b: true }, assignment: 'b', lumoRoom: 'relay' });
  assert.equal(inkHeld.prompt('latch-b'), 'E · Gài chốt B', 'with Lumo on plate B the station advertises the latch');
  inkHeld.interact('latch-b');
  assert.equal(inkHeld.progress.flags['l4-latch-b'], true, 'E latches door B');
  assert.equal(inkHeld.sent.length, 0, 'and sends nothing');
  const inkTravelling = makePathScene('ink', { 'l4-visited-ink': true, 'l4-latch-a': true },
    { player: standAt('ink', 'latch-b'), assignment: 'b', travelling: true });
  assert.equal(inkTravelling.prompt('latch-b'), null, 'no prompt while Lumo is travelling to B');
  assert.equal(inkTravelling.interactionEnabled('latch-b'), false, 'and the B station is disabled');

  // A station answers only in its own room.
  assert.equal(makePathScene('relay', {}).interactionEnabled('latch-b'), false, 'the B latch is not a relay control');
  assert.equal(makePathScene('ink', { 'l4-latch-a': true }).interactionEnabled('latch-a'), false, 'the A latch is not an ink control');
});

controllerCase('the_station_objectives_say_what_to_do_about_the_latch', () => {
  const relayIdle = makePathScene('relay', {}, { player: { x: 300, y: 240 } });
  assert.equal(relayIdle.getObjectiveText(), 'Gọi Lumo tới ấn A: nhấn E ở chốt A, rồi gài chốt.', 'relay without Lumo on plate A names the latch station');
  const relayHeld = makePathScene('relay', {}, { player: { x: 300, y: 240 }, power: { a: true }, assignment: 'a', lumoRoom: 'entry' });
  assert.equal(relayHeld.getObjectiveText(), 'Gài chốt A ở mặt bên kia trước khi gọi Lumo tới B.', 'with Lumo on plate A the latch is the step');
  const relayLatched = makePathScene('relay', { 'l4-latch-a': true }, { player: { x: 300, y: 240 } });
  assert.equal(relayLatched.getObjectiveText(), 'Gọi Lumo tới ấn B.', 'once A is latched the next step is B');
  const inkIdle = makePathScene('ink', { 'l4-latch-a': true }, { player: { x: 300, y: 240 } });
  assert.equal(inkIdle.getObjectiveText(), '1/6 Gọi Lumo tới ấn B: nhấn E ở chốt B, rồi gài chốt.', 'ink without Lumo on plate B names the latch station');
  const inkHeld = makePathScene('ink', { 'l4-latch-a': true }, { player: { x: 300, y: 240 }, power: { b: true }, assignment: 'b', lumoRoom: 'relay' });
  assert.equal(inkHeld.getObjectiveText(), '1/6 Gài chốt B: nhấn E ở chốt cạnh cửa B.', 'with Lumo on plate B the latch is the step');
  // While Lumo walks there E is disabled at the latch, so the objective must not ask for it.
  const relayMoving = makePathScene('relay', {}, { player: { x: 300, y: 240 }, assignment: 'a', travelling: true, lumoRoom: 'entry' });
  assert.equal(relayMoving.getObjectiveText(), 'Lumo đang tới ấn A. Chờ cậu ấy tới nơi rồi gài chốt.', 'while Lumo travels to A the objective waits for him');
  const inkMoving = makePathScene('ink', { 'l4-latch-a': true }, { player: { x: 300, y: 240 }, assignment: 'b', travelling: true, lumoRoom: 'relay' });
  assert.equal(inkMoving.getObjectiveText(), '1/6 Lumo đang tới ấn B. Chờ cậu ấy tới nơi rồi gài chốt.', 'while Lumo travels to B the objective waits for him');
});

controllerCase('a_lost_relay_station_recovers_lumo_and_latches_after_a_reload', () => {
  // Lumo is following in the relay hall, door A is shut and latch A is unset. The only control needed is the latch.
  const player = standAt('relay', 'latch-a');
  const scene = bindTravelPipeline(makePathScene('relay', { 'l4-visited-relay': true, 'l4-room': 'relay' }, { player }));
  scene.route = []; scene.routeIndex = 0;
  assert.equal(scene.prompt('latch-a'), 'E · Gọi Lumo tới ấn A', 'the station offers the call');
  scene.interact('latch-a');
  assert.equal(scene.progress.flags['l4-assignment'], 'a', 'E sends Lumo to plate A (not a recall to follow)');
  assert.ok(scene.isTravelling(), 'Lumo is on his way');
  for (let frame = 0; frame < 40; frame += 1) scene.advanceLumo(16);
  assert.ok(scene.isTravelling(), 'Lumo is still part-way along his route');

  // Save and reload in the middle of the travel: the route is restored and nothing resets it.
  const midway = reloadPathScene(scene, 'relay');
  assert.equal(midway.recovered, false, 'a reload keeps a travelling Lumo on his route');
  assert.equal(midway.assignment, 'a', 'and his assignment');
  assert.ok(midway.isTravelling(), 'and the travel still runs');
  assert.equal(midway.prompt('latch-a'), null, 'so the station is still silent after the reload');
  assert.equal(midway.interactionEnabled('latch-a'), false, 'and disabled');

  let frames = 0;
  while (midway.isTravelling() && frames < 900) { midway.advanceLumo(16); frames += 1; }
  assert.equal(midway.isTravelling(), false, `Lumo finishes his route (${frames} frames)`);
  assert.equal(midway.lumoRoom, 'entry', 'on plate A, which lies behind door A');

  // Save and reload after arrival: Lumo still holds plate A and the station latches from the relay side.
  const arrived = reloadPathScene(midway, 'relay');
  assert.equal(arrived.recovered, false, 'an arrived Lumo is not reset by a reload');
  assert.equal(arrived.hasPower('a'), true, 'Lumo still holds plate A after the reload');
  assert.equal(arrived.prompt('latch-a'), 'E · Gài chốt A', 'the station now offers the latch');
  arrived.interact('latch-a');
  assert.equal(arrived.progress.flags['l4-latch-a'], true, 'E latches door A from the relay side');
  assert.equal(arrived.callEligible('b'), true, 'and that makes B callable');
});

controllerCase('a_lost_ink_station_recovers_lumo_and_latches_then_unlocks_C', () => {
  // Lumo is following in the ink corridor, door B is shut and latch B is unset.
  const scene = bindTravelPipeline(makePathScene('ink',
    { 'l4-visited-ink': true, 'l4-visited-relay': true, 'l4-latch-a': true, 'l4-room': 'ink', 'l4-ink-revealed': true },
    { player: standAt('ink', 'latch-b') }));
  scene.route = []; scene.routeIndex = 0;
  assert.equal(scene.prompt('latch-b'), 'E · Gọi Lumo tới ấn B', 'the B station offers the call');
  scene.interact('latch-b');
  assert.equal(scene.progress.flags['l4-assignment'], 'b', 'E sends Lumo to plate B through the B pipe');
  for (let frame = 0; frame < 40; frame += 1) scene.advanceLumo(16);
  assert.ok(scene.isTravelling(), 'Lumo is still part-way along his route');

  const midway = reloadPathScene(scene, 'ink');
  assert.equal(midway.recovered, false, 'a reload keeps Lumo travelling to B');
  assert.equal(midway.prompt('latch-b'), null, 'and the B station stays silent');

  let frames = 0;
  while (midway.isTravelling() && frames < 900) { midway.advanceLumo(16); frames += 1; }
  assert.equal(midway.isTravelling(), false, `Lumo reaches plate B (${frames} frames)`);
  assert.equal(midway.lumoRoom, 'relay', 'plate B lies in the relay room, behind door B');

  const arrived = reloadPathScene(midway, 'ink');
  assert.equal(arrived.recovered, false, 'an arrived Lumo is not reset by a reload');
  assert.equal(arrived.hasPower('b'), true, 'Lumo holds plate B after the reload');
  assert.equal(arrived.prompt('latch-b'), 'E · Gài chốt B', 'the ink station now offers the latch');
  arrived.interact('latch-b');
  assert.equal(arrived.progress.flags['l4-latch-b'], true, 'E latches door B from the ink side');

  // The C call post is then the next step, and it answers in the ink corridor.
  const next = makePathScene('ink', { ...arrived.progress.flags }, { player: standAt('ink', 'call-c') });
  assert.equal(next.callEligible('c'), true, 'the C call is eligible once B is latched');
  assert.equal(next.interactionEnabled('call-c'), true, 'and the C post answers');
  assert.equal(next.prompt('call-c'), 'E · Gọi Lumo tới ấn', 'it advertises the call');
});

controllerCase('relay_overlap_owner_rule_is_kept_on_a_sandbox_room', () => {
  // The spacing rule keeps the real pairs apart, so the owner rule is proven on a sandbox copy of the relay room. The
  // copy puts back the two props the old layout overlapped: a post with solid x204..244, y184..232 next to latch A.
  // Measured from the foot body: (197,224) is latch A's (8px away from the post), (205,216) is the post's (4px from
  // latch A) and (201,216) touches both, so the exact tie goes to the first element in the room's order.
  const original = PATH_ROOMS.relay;
  const probe = { id: 'probe-post', art: 'call-idle', x: 224, y: 232, width: 40, height: 48, stand: { x: 224, y: 256 } };
  PATH_ROOMS.relay = {
    ...original,
    elements: [probe, ...original.elements],
    solids: [...original.solids, { elementId: 'probe-post', x: 204, y: 184, width: 40, height: 48 }],
  };
  try {
    const cases = [
      { at: { x: 197, y: 224 }, owner: 'latch-a', gaps: { 'latch-a': 0, 'probe-post': 8 } },
      { at: { x: 205, y: 216 }, owner: 'probe-post', gaps: { 'latch-a': 4, 'probe-post': 0 } },
      { at: { x: 201, y: 216 }, owner: 'probe-post', gaps: { 'latch-a': 0, 'probe-post': 0 } },
    ];
    for (const probeCase of cases) {
      const { at } = probeCase;
      assert.equal(actor('relay', at), true, `(${at.x},${at.y}) is walkable floor in the sandbox`);
      for (const [id, gap] of Object.entries(probeCase.gaps)) {
        const measured = oracleGap(at, getPathElementSolid('relay', id));
        assert.ok(Math.abs(measured - gap) < 1e-9, `(${at.x},${at.y}) is ${gap}px from ${id}, measured ${measured}`);
        assert.equal(isPathElementInReach('relay', elementOf('relay', id), at), true, `(${at.x},${at.y}) is in reach of ${id}`);
      }
      assert.equal(pathStandingOwner('relay', at), probeCase.owner, `(${at.x},${at.y}) is owned by ${probeCase.owner}`);
    }
    // And the sweep finds shared spots in the sandbox, each with one owner, so the generic rule runs on a real overlap.
    const standing = standingElements('relay');
    let shared = 0;
    for (let x = PATH_FLOOR_BOUNDS.x; x <= PATH_FLOOR_BOUNDS.x + PATH_FLOOR_BOUNDS.width; x += 1) {
      for (let y = PATH_FLOOR_BOUNDS.y; y <= PATH_FLOOR_BOUNDS.y + PATH_FLOOR_BOUNDS.height; y += 1) {
        const center = { x, y };
        if (!isPathPositionSafe('relay', center)) continue;
        const inReach = standing.filter((element) => isPathElementInReach('relay', element, center));
        if (inReach.length < 2) continue;
        shared += 1;
        const least = Math.min(...inReach.map((element) => oracleGap(center, getPathElementSolid('relay', element.id))));
        const expected = inReach.find((element) => oracleGap(center, getPathElementSolid('relay', element.id)) === least);
        assert.equal(pathStandingOwner('relay', center), expected.id, `sandbox (${x},${y}): the smallest gap owns the spot`);
      }
    }
    assert.ok(shared > 0, 'the sandbox really has spots shared by two props');
  } finally {
    PATH_ROOMS.relay = original;
  }
});

controllerCase('standing_props_keep_one_door_one_station_spacing', () => {
  // Every pair of standing solids (call posts and latches) in one room is at least PATH_STANDING_SPACING apart, so no
  // foot position can be in reach of two of them (reach is PATH_REACH_GAP on each side). Measured per room.
  const rectGapOf = (a, b) => Math.hypot(
    Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0),
    Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0),
  );
  const measured = [];
  for (const roomId of ['entry', 'relay', 'ink']) {
    const props = standingElements(roomId);
    let least = Infinity;
    let pair = 'none';
    for (let i = 0; i < props.length; i += 1) {
      for (let j = i + 1; j < props.length; j += 1) {
        const gap = rectGapOf(getPathElementSolid(roomId, props[i].id), getPathElementSolid(roomId, props[j].id));
        if (gap < least) { least = gap; pair = `${props[i].id}+${props[j].id}`; }
        assert.ok(gap >= PATH_STANDING_SPACING, `${roomId}: ${props[i].id} and ${props[j].id} are ${gap.toFixed(1)}px apart, under ${PATH_STANDING_SPACING}px`);
      }
    }
    measured.push(`${roomId} ${least.toFixed(1)}px (${pair})`);
  }
  console.log(`      L05 standing solid spacing, minimum per room: ${measured.join(', ')}; required ${PATH_STANDING_SPACING}px`);
});

controllerCase('latch_B_stand_is_walkable_and_clear_of_doors_and_routes', () => {
  const element = elementOf('ink', 'latch-b');
  assert.deepEqual({ x: element.x, y: element.y, width: element.width, height: element.height }, { x: 150, y: 270, width: 28, height: 32 }, 'latch B is anchored at (150,270)');
  assert.deepEqual(element.stand, { x: 150, y: 280 }, 'latch B stands at (150,280)');
  assert.deepEqual(getPathElementSolid('ink', 'latch-b'), { elementId: 'latch-b', x: 136, y: 238, width: 28, height: 32 }, 'its solid matches the art');
  assert.equal(actor('ink', element.stand, { a: false, b: false, c: false, practice: false }), true, 'the stand is walkable with every door shut');
  for (const face of PATH_DOOR_FACES.filter((item) => item.room === 'ink')) {
    assert.equal(rectsOverlap(pathActorBody(element.stand), getPathThresholdBand(face)), false, `the stand is outside door ${face.id}'s threshold`);
    assert.equal(rectsOverlap(pathActorBody(element.stand), getPathDoorPassage(face)), false, `the stand is outside door ${face.id}'s passage`);
  }
  const solid = getPathElementSolid('ink', 'latch-b');
  for (const line of PATH_ROUTE_LINES.filter((item) => item.room === 'ink')) {
    const points = pathRoutePoints(line);
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1], to = points[index];
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y));
      for (let step = 0; step <= steps; step += 1) {
        const p = { x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps };
        assert.equal(pointInRect(p, solid), false, `route ${line.mark} (${from.x},${from.y})-(${to.x},${to.y}) does not cross latch B's solid`);
      }
    }
  }
});

controllerCase('every_call_post_in_every_room_gets_one_tracked_letter_label', () => {
  // A recording stand-in for the Phaser objects drawRoom() creates. Every chained setter returns the
  // object again, and each call is kept, so the label's text, position, origin, depth and tracking can be read.
  const fakeObject = (kind, args) => {
    const target = {
      kind, args, calls: [], data: new Map(),
      setData(key, value) { this.data.set(key, value); return this; },
      getData(key) { return this.data.get(key); },
    };
    const proxy = new Proxy(target, {
      get(obj, prop) {
        if (prop in obj) return obj[prop];
        return (...callArgs) => { obj.calls.push([prop, ...callArgs]); return proxy; };
      },
    });
    return proxy;
  };
  const postIds = [];
  for (const roomId of ['entry', 'relay', 'ink']) {
    const scene = {
      room: roomId, progress: { flags: {}, counters: {} }, objects: [], colliders: [], bodies: [], protected: [],
      interactions: new Map(), doorImages: new Map(), doorBraceImages: new Map(), doorHeaderImages: new Map(),
      doorPostImages: new Map(), doorBodies: new Map(), lanternOn: false,
      scene: {
        textures: { exists: () => true },
        add: {
          image: (x, y, key) => fakeObject('image', [x, y, key]),
          text: (x, y, text, style) => fakeObject('text', [x, y, text, style]),
          graphics: () => fakeObject('graphics', []),
          tileSprite: (...args) => fakeObject('tileSprite', args),
        },
      },
      track(object) { this.objects.push(object); },
      addCollider() {}, drawStationSchematic() {}, drawTubeRoutes() {}, drawInkPuzzle() {}, addNativeArt() {},
      addDoors() {}, registerRoomInteractions() {}, refreshArt() {},
    };
    scene.callMark = compile('callMark', ['id'], {});
    scene.depthAt = compile('depthAt', ['y'], {});
    scene.drawRoom = compile('drawRoom', [], {
      PATH_ROOMS, PATH_TUBE_MOUTHS, PATH_INK_CORRIDOR, getPathElementArtRect, pathCallLabel,
      getLevelArtKey: (_level, key) => key,
    });
    scene.drawRoom();
    const posts = PATH_ROOMS[roomId].elements.filter((item) => scene.callMark(item.id));
    const texts = scene.objects.filter((object) => object.kind === 'text');
    assert.equal(texts.length, posts.length, `${roomId}: one label per call post and no label on latches, plates, the spiral or doors`);
    for (const post of posts) {
      postIds.push(post.id);
      const image = scene.objects.find((object) => object.kind === 'image' && object.getData('path-id') === post.id);
      const label = image?.getData('call-label');
      assert.ok(label, `${roomId}/${post.id} keeps its label on its art`);
      assert.equal(scene.objects.includes(label), true, `${roomId}/${post.id}'s label is tracked, so the room rebuild destroys it`);
      const mark = scene.callMark(post.id);
      const letter = mark === 'practice' ? 'Thử' : mark.toUpperCase();
      assert.deepEqual(label.args.slice(0, 3), [post.x, post.y - post.height - 8, letter],
        `${roomId}/${post.id}: the "${letter}" label sits centred on the post, 8px above its art`);
      assert.equal(label.args[3].fontFamily, 'Segoe UI, sans-serif', `${roomId}/${post.id}: label font`);
      assert.equal(label.args[3].fontSize, '9px', `${roomId}/${post.id}: label size`);
      assert.equal(label.args[3].color, '#e0c080', `${roomId}/${post.id}: label colour`);
      assert.equal(label.args[3].stroke, '#1a1410', `${roomId}/${post.id}: label stroke`);
      assert.equal(label.args[3].strokeThickness, 2, `${roomId}/${post.id}: label stroke width`);
      assert.deepEqual(label.calls.find(([name]) => name === 'setOrigin')?.slice(1), [0.5, 1], `${roomId}/${post.id}: origin is bottom centre`);
      assert.deepEqual(label.calls.find(([name]) => name === 'setDepth')?.slice(1), [scene.depthAt(post.y) + 0.2],
        `${roomId}/${post.id}: label sits just above its art in depth`);
    }
  }
  assert.deepEqual([...postIds].sort(), ['call-a', 'call-b', 'call-c', 'inner-call', 'practice-call'],
    'every standing call post in the three rooms is labelled');
});

controllerCase('refreshArt_dims_a_spent_post_and_ticks_its_label_as_the_latch_is_set', () => {
  class SpentImage {
    constructor(key) { this.texture = key; this.alpha = 1; this.data = new Map(); }
    setTexture(key) { this.texture = key; return this; }
    setAlpha(value) { this.alpha = value; return this; }
    setData(key, value) { this.data.set(key, value); return this; }
    getData(key) { return this.data.get(key); }
  }
  class SpentText {
    constructor() { this.text = ''; this.alpha = 1; }
    setText(value) { this.text = value; return this; }
    setAlpha(value) { this.alpha = value; return this; }
  }
  const refreshArt = compile('refreshArt', [], {
    getLevelArtKey: (_level, key) => key, isPathSeal, isPathCallSpent, pathCallLabel, Phaser: { GameObjects: { Image: SpentImage } },
  });
  const post = (scene, id) => {
    const image = new SpentImage(id);
    image.setData('path-id', id);
    const label = new SpentText();
    image.setData('call-label', label);
    scene.objects.push(image, label);
    return { image, label };
  };
  const scene = {
    objects: [], progress: { flags: { 'l4-latch-b': true } }, assignment: 'b',
    power: { b: true }, hasPower(mark) { return this.power[mark] === true; }, elementFor: () => undefined, refreshArt,
  };
  const bPost = post(scene, 'call-b');
  const cPost = post(scene, 'call-c');
  scene.refreshArt();
  assert.equal(bPost.image.alpha, 0.45, 'a spent B post is dimmed, even while Lumo stands on it');
  assert.equal(bPost.image.texture, 'call-idle', 'a spent B post keeps the idle art');
  assert.equal(bPost.label.text, 'B ✓', 'the spent B label gets a tick');
  assert.equal(bPost.label.alpha, 0.45, 'the spent B label is dimmed');
  assert.equal(cPost.image.alpha, 1, 'the live C post is not dimmed');
  assert.equal(cPost.label.text, 'C', 'the live C label has no tick');
  assert.equal(cPost.label.alpha, 1, 'the live C label is not dimmed');
  // Setting C's latch later spends the C post on the very next refresh.
  scene.progress.flags['l4-latch-c'] = true;
  scene.power.c = true;
  scene.refreshArt();
  assert.equal(cPost.image.alpha, 0.45, 'latching C dims the C post on the next refresh');
  assert.equal(cPost.label.text, 'C ✓', 'and ticks its label');
  assert.equal(cPost.image.texture, 'call-idle', 'the spent C post keeps the idle art even with Lumo on it');
});

controllerCase('the_C_handle_answers_before_the_ink_is_found', () => {
  const scene = makePathScene('ink', { 'l4-latch-b': true }, { player: inReachPoint('ink', elementOf('ink', 'latch-c')) });
  assert.equal(scene.interactionEnabled('latch-c'), true, 'the exit handle answers in its own room before the ink');
  assert.equal(scene.prompt('latch-c'), 'E · Gài chốt cửa ra', 'the handle advertises its action');
  scene.interact('latch-c');
  assert.equal(scene.progress.flags['l4-latch-c'], undefined, 'an early E never latches the exit');
  assert.equal(scene.said.length, 1, 'an early E gives exactly one inspection line');
  const text = saidText(scene);
  // The approved §7 line is character speech and no longer carries the key name; the lantern key
  // stays in the existing instruction channel (objective), which this controller still writes.
  assert.equal(text, 'Những vệt trên nền còn mờ quá. Mình thử tắt đèn để xem chúng dẫn tới đâu.',
    `the early handle uses the approved missing-observation line (${text})`);
  // Step 2 (call Lumo to C) comes first in the numbered list; the lantern key appears once step 3 is current.
  assert.equal(scene.getObjectiveText(), '2/6 Gọi Lumo tới ấn C: nhấn E ở mốc có nhãn C (bên trái).',
    `before C is held the instruction is the call (${scene.getObjectiveText()})`);
  scene.power.c = true;
  assert.ok(scene.getObjectiveText().includes('F'),
    `the separate instruction channel names the lantern key once C is held (${scene.getObjectiveText()})`);
});

controllerCase('the_objective_stops_asking_for_a_C_call_once_C_is_held', () => {
  const scene = makePathScene('ink', { 'l4-latch-b': true, 'l4-called-c': true }, { player: { x: 300, y: 240 } });
  scene.power.c = true;
  const text = scene.getObjectiveText();
  assert.ok(text.includes('F'), `the instruction channel still names the lantern key (${text})`);
  assert.equal(text.includes('gọi Lumo tới ấn C'), false,
    `a legal C-before-ink call is not advertised again (${text})`);
  assert.ok(text.includes('vệt mực'), `the remaining ink instruction is still truthful (${text})`);
});

controllerCase('the_objective_follows_the_main_progress_once_A_has_started', () => {
  const fresh = makePathScene('entry', {});
  assert.ok(fresh.getObjectiveText().includes('Mốc A'),
    `the opening line names A as a way on, so a skipped lesson is not a dead end (${fresh.getObjectiveText()})`);
  const started = makePathScene('entry', { 'l4-called-a': true });
  const startedText = started.getObjectiveText();
  assert.notEqual(startedText, fresh.getObjectiveText(), 'the lesson line is replaced once A has started');
  assert.equal(startedText.includes('mốc đứng gần cậu'), false, `the lesson marker stops being named (${startedText})`);
  assert.ok(startedText.includes('mốc A'), `the objective follows A instead (${startedText})`);
});

controllerCase('the_reunion_objective_names_the_C_handle_and_lumos_travel', () => {
  const exitReady = { 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true };
  const held = makePathScene('ink', exitReady, { assignment: 'c' });
  assert.ok(held.getObjectiveText().includes('tay gọi C'), `the handle is named (${held.getObjectiveText()})`);
  const back = makePathScene('ink', exitReady, { travelling: true });
  assert.ok(back.getObjectiveText().includes('đang về'), `a travelling Lumo is reported (${back.getObjectiveText()})`);
  const near = makePathScene('ink', exitReady);
  assert.ok(near.getObjectiveText().includes('đã về'), `an arrived Lumo is reported (${near.getObjectiveText()})`);
});

controllerCase('the_lesson_door_never_closes_on_the_players_feet', () => {
  const alcove = [];
  const queue = [{ x: 244, y: 150 }];
  const seen = new Set(['244,150']);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    alcove.push(point);
    for (const [dx, dy] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isInsidePracticeAlcove('entry', next)) continue;
      if (!actor('entry', next, { ...allOpen, practice: true })) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  assert.ok(alcove.length > 200, `the lesson area is walkable (${alcove.length} positions)`);
  for (const point of alcove) {
    assert.equal(isInsidePracticeAlcove('entry', point), true, `(${point.x},${point.y}) is inside the lesson alcove`);
    const occupied = isPathThresholdOccupied('entry', 'practice', point);
    assert.equal(pathDoorShouldClose(false, occupied, false), false,
      `the lesson door stays open with Nhinh standing at (${point.x},${point.y})`);
  }
  assert.equal(CONTROLLER_SOURCE.includes('Cửa thử đang đóng'), false,
    'the unreachable "the lesson door is closed" guidance line is gone');
});

controllerCase('every_standing_prop_answers_only_inside_its_reach', () => {
  // RULE_GAMES §1: a standing prop answers while the walkable foot body is within PATH_REACH_GAP px of its own
  // solid, from any side. Every walkable position within 12px of each solid is checked against the oracle
  // (`oracleGap`, written from the rule). The layout predicate, the shipped approach helper, the prompt, the
  // enabled flag and the E press must all agree with it.
  const flags = { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true, 'l4-ink-revealed': true };
  let answers = 0;
  let silent = 0;
  for (const roomId of ['entry', 'relay', 'ink']) {
    const scene = makePathScene(roomId, flags);
    for (const element of standingElements(roomId)) {
      const solid = getPathElementSolid(roomId, element.id);
      assert.ok(solid, `${roomId}/${element.id} has its own collision solid`);
      for (let x = solid.x - 12; x <= solid.x + solid.width + 12; x += 1) {
        for (let y = solid.y - 12; y <= solid.y + solid.height + 12; y += 1) {
          const center = { x, y };
          if (!isPathPositionSafe(roomId, center)) continue;
          const gap = oracleGap(center, solid);
          if (gap > 12) continue;
          const label = `${roomId}/${element.id} at (${x},${y}) gap ${gap.toFixed(2)}px`;
          const allowed = gap <= PATH_REACH_GAP;
          assert.equal(isPathElementInReach(roomId, element, center), allowed, `${label}: the reach predicate`);
          assert.equal(isPathApproachAllowed(roomId, element, center), allowed, `${label}: the approach predicate`);
          scene.stand(x, y);
          assert.equal(scene.elementApproach(element.id, x, y), allowed, `${label}: the shipped approach helper`);
          if (allowed) {
            answers += 1;
            assert.notEqual(scene.prompt(element.id), null, `${label}: advertises the prompt`);
            continue;
          }
          // Outside reach the control must already be silent, disabled, and refuse the press.
          silent += 1;
          assert.equal(scene.prompt(element.id), null, `${label}: advertises nothing`);
          assert.equal(scene.interactionEnabled(element.id), false, `${label}: is disabled`);
          const before = JSON.stringify(scene.progress.flags) + scene.sent.length + scene.said.length + scene.recalled;
          scene.interact(element.id);
          assert.equal(JSON.stringify(scene.progress.flags) + scene.sent.length + scene.said.length + scene.recalled, before,
            `${label}: refuses E`);
        }
      }
    }
  }
  assert.ok(answers > 400, `the reach rule still leaves plenty of answering positions (${answers})`);
  console.log(`      L05 reach: ${answers} walkable positions answer, ${silent} within 12px stay silent`);
});

controllerCase('the_eight_and_nine_px_edges_of_every_standing_prop', () => {
  // RULE_GAMES §1, from the outer edge of each prop's solid: 8px answers and 9px is silent on all four sides;
  // the diagonal at (6,5) = 7.81px answers and (6,6) = 8.49px is silent. A probe that lands in masonry cannot
  // stand there, so it is tallied and asserted to stay silent instead of being skipped.
  const flags = { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true, 'l4-ink-revealed': true };
  const sides = new Map();
  const tally = (side, key) => {
    if (!sides.has(side)) sides.set(side, { walkable: 0, blocked: 0 });
    sides.get(side)[key] += 1;
  };
  for (const roomId of ['entry', 'relay', 'ink']) {
    const scene = makePathScene(roomId, flags);
    for (const element of standingElements(roomId)) {
      const solid = getPathElementSolid(roomId, element.id);
      for (const probe of edgeProbes(solid)) {
        const label = `${roomId}/${element.id} ${probe.side} ${probe.gap.toFixed(2)}px at (${probe.center.x},${probe.center.y})`;
        assert.ok(Math.abs(oracleGap(probe.center, solid) - probe.gap) < 1e-6, `${label}: the probe sits exactly ${probe.gap.toFixed(2)}px off the solid`);
        if (!isPathPositionSafe(roomId, probe.center)) {
          tally(probe.side, 'blocked');
          assert.equal(isPathElementInReach(roomId, element, probe.center), false, `${label}: masonry never answers`);
          continue;
        }
        tally(probe.side, 'walkable');
        assert.equal(isPathElementInReach(roomId, element, probe.center), probe.expect, `${label}: the reach predicate`);
        scene.stand(probe.center.x, probe.center.y);
        if (probe.expect) {
          assert.notEqual(scene.prompt(element.id), null, `${label}: advertises the prompt`);
        } else {
          assert.equal(scene.prompt(element.id), null, `${label}: advertises nothing`);
          assert.equal(scene.interactionEnabled(element.id), false, `${label}: is disabled`);
        }
      }
      // A foot body that overlaps the prop's own solid is never in reach.
      const inside = { x: solid.x + solid.width / 2, y: solid.y + solid.height / 2 - 19 };
      assert.equal(isPathElementInReach(roomId, element, inside), false, `${roomId}/${element.id} inside its own solid is never in reach`);
    }
  }
  const summary = [...sides].map(([side, counts]) => `${side} ${counts.walkable} walkable/${counts.blocked} blocked`).join(', ');
  console.log(`      L05 edge probes: ${summary}`);
});

controllerCase('every_walkable_spot_in_reach_has_exactly_one_standing_owner', () => {
  // RULE_GAMES §1: where two standing props are both in reach, the one with the smaller gap to its own solid
  // owns the spot; an exact tie goes to the first in element order. Checked for every walkable floor position,
  // with the latches as they are and with every arch latched open (the open-doorway state).
  const passes = [{ label: 'latches as stored', options: {} }, { label: 'every arch latched open', options: { latches: allOpen } }];
  let owned = 0;
  let shared = 0;
  for (const { label, options } of passes) {
    for (const roomId of ['entry', 'relay', 'ink']) {
      const props = standingElements(roomId);
      for (let x = PATH_FLOOR_BOUNDS.x; x <= PATH_FLOOR_BOUNDS.x + PATH_FLOOR_BOUNDS.width; x += 1) {
        for (let y = PATH_FLOOR_BOUNDS.y; y <= PATH_FLOOR_BOUNDS.y + PATH_FLOOR_BOUNDS.height; y += 1) {
          const center = { x, y };
          if (!isPathPositionSafe(roomId, center, options)) continue;
          const where = `${roomId} (${x},${y}) [${label}]`;
          const inReach = props.filter((element) => isPathElementInReach(roomId, element, center, options));
          const owner = pathStandingOwner(roomId, center, options);
          if (inReach.length === 0) {
            assert.equal(owner, undefined, `${where}: no prop in reach, so no owner`);
            continue;
          }
          owned += 1;
          if (inReach.length > 1) shared += 1;
          assert.ok(typeof owner === 'string' && inReach.some((element) => element.id === owner),
            `${where}: the owner is one of the props in reach (${inReach.map((e) => e.id).join(' + ')})`);
          const gaps = inReach.map((element) => oracleGap(center, getPathElementSolid(roomId, element.id)));
          const least = Math.min(...gaps);
          const expected = inReach.find((element) => oracleGap(center, getPathElementSolid(roomId, element.id)) === least);
          assert.equal(owner, expected.id, `${where}: the smallest gap (${least.toFixed(2)}px) owns the spot, ties in element order`);
        }
      }
    }
  }
  // ONE DOOR, ONE STATION: the spacing rule (`standing_props_keep_one_door_one_station_spacing`) keeps every real pair of
  // standing props out of each other's reach, so no real spot is shared. The owner rule itself is proven on a sandbox
  // room below (`relay_overlap_owner_rule_is_kept_on_a_sandbox_room`).
  assert.equal(shared, 0, 'no walkable spot in the real rooms is in reach of two standing props');
  console.log(`      L05 standing ownership: ${owned} walkable spot(s) in reach, ${shared} shared by two props, each with one owner`);
});

controllerCase('arrivals_stand_outside_every_standing_prop_reach', () => {
  // The landing rule with the new reach: no arrival point may open a standing prop's prompt.
  const arrivals = [
    ['entry', PATH_ROOMS.entry.entrySpawn], ['relay', PATH_ROOMS.relay.entrySpawn], ['ink', PATH_ROOMS.ink.entrySpawn],
    ['entry', getPathBackArrival('a')], ['relay', getPathBackArrival('b')],
  ];
  let nearest = Infinity;
  for (const [roomId, point] of arrivals) {
    for (const element of standingElements(roomId)) {
      const gap = oracleGap(point, getPathElementSolid(roomId, element.id));
      nearest = Math.min(nearest, gap);
      assert.ok(gap > PATH_REACH_GAP, `${roomId} arrival (${point.x},${point.y}) is ${gap.toFixed(2)}px from ${element.id}, inside reach`);
      assert.equal(isPathElementInReach(roomId, element, point), false, `${roomId} arrival does not open ${element.id}`);
    }
  }
  console.log(`      arrivals: nearest standing prop ${nearest.toFixed(2)}px, reach is ${PATH_REACH_GAP}px`);
});

controllerCase('the_authored_stands_are_prompt_anchors_not_reach', () => {
  // `x`/`y` of each registration is the authored stand (RULE_GAMES §1: it only anchors the prompt). Report how far
  // each stand sits from its own solid, so an anchor that is far from the player is visible in the output.
  const far = [];
  for (const roomId of ['entry', 'relay', 'ink']) {
    for (const element of standingElements(roomId)) {
      const gap = oracleGap(element.stand, getPathElementSolid(roomId, element.id));
      if (gap > PATH_REACH_GAP) far.push(`${roomId}/${element.id} ${gap.toFixed(1)}px`);
    }
  }
  console.log(`      stands outside reach (anchor only): ${far.length ? far.join(', ') : 'none'}`);
  assert.ok(standingElements('entry').length > 0, 'the authored stand table is read from the shipped layout');
});

controllerCase('door_controls_answer_only_from_their_own_room_side', () => {
  let domains = 0;
  for (const stand of PATH_CONTROL_STANDS) {
    const scene = makePathScene(stand.room, { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true });
    let usable = 0;
    for (const point of legalDisc(stand.room, stand, stand.radius)) {
      scene.stand(point.x, point.y);
      // The latch state these flags describe (A, B and C latched, practice closed): the layout predicate is given it too.
      const allowed = isPathDoorApproachAllowed(stand.room, stand.id, point, { latches: { a: true, b: true, c: true, practice: false } });
      assert.equal(scene.doorApproach(stand.id, point.x, point.y), allowed,
        `${stand.room}/door ${stand.id}: shipped helper agrees with the layout predicate at (${point.x},${point.y})`);
      if (allowed) { usable += 1; continue; }
      assert.equal(scene.doorPrompt(stand.id), null, `${stand.room}/door ${stand.id} advertises nothing at (${point.x},${point.y})`);
      assert.equal(scene.doorEnabled(stand.id), false, `${stand.room}/door ${stand.id} is disabled at (${point.x},${point.y})`);
      const before = scene.said.length + scene.saved;
      scene.useDoor(stand.id);
      assert.equal(scene.said.length + scene.saved, before, `${stand.room}/door ${stand.id} refuses E at (${point.x},${point.y})`);
    }
    assert.ok(usable > 0, `${stand.room}/door ${stand.id} keeps a usable room-side domain (${usable} legal positions)`);
    domains += usable;
  }
  // The lens the plan asks this task to measure: both controls there keep their own domain. Measured
  // with the shipped T05 selector (`scripts/check-interaction-targets.mjs`, case
  // `l05_latch_c_and_door_c_each_have_a_reachable_domain`): (559,198) selects latch C — the owner
  // keeps the position against the nearer door — and (567,208) selects door C; latch C then keeps 92
  // reachable positions and door C 100, so no coordinate had to move and the rejected (578,190)
  // remains rejected.
  assert.deepEqual(PATH_ROOMS.ink.elements.find((element) => element.id === 'latch-c').stand, { x: 550, y: 218 },
    'latch C keeps its authored stand');
  assert.deepEqual(getPathControlStand('c', 'ink')?.x, 574, 'door C keeps its authored stand');
  assert.equal(getPathControlStand('c', 'ink')?.y, 188, 'door C keeps its authored stand');
  console.log(`      L05 door domains: ${domains} room-side legal standing positions across the six door controls`);
});

controllerCase('a_held_E_cannot_ping_pong_through_the_door_just_used', () => {
  assert.equal(isPathInteractHeld(true, true), true, 'E is ignored while the key is still held after a room change');
  assert.equal(isPathInteractHeld(true, false), false, 'releasing the key clears the guard');
  assert.equal(isPathInteractHeld(false, true), false, 'without a pending release E is never ignored');

  // Geometry: the return arrival stands clear of the trigger radius a held press would fire.
  for (const [id, room] of [['a', 'entry'], ['b', 'relay']]) {
    const arrival = getPathBackArrival(id);
    const stand = getPathControlStand(id, room);
    assert.ok(stand, `${room} registers the ${id} door`);
    const distance = Math.hypot(arrival.x - stand.x, arrival.y - stand.y);
    assert.ok(distance > stand.radius,
      `the ${id} return arrival (${arrival.x},${arrival.y}) is outside the ${stand.radius}px trigger radius (${distance.toFixed(1)}px)`);
    assert.equal(arrival.y, 210 + PATH_BACK_ARRIVAL_OFFSET, 'the arrival offset is the authored one');
  }

  // Wiring: the shipped door gate refuses while the guard is armed, and works again after a release.
  const scene = makePathScene('entry', {}, { player: { x: 156, y: 221 } });
  scene.interactReleasePending = true;
  scene.interactKey.isDown = true;
  assert.equal(scene.heldInteract(), true, 'the shipped guard reports a held E');
  assert.equal(scene.doorEnabled('practice'), false, 'the arrived-through door is disabled while E is held');
  assert.equal(scene.doorPrompt('practice'), null, 'and it advertises nothing, so no prompt can contradict E');
  scene.useDoor('practice');
  scene.interact('practice-call');
  assert.equal(scene.said.length, 0, 'a held E runs no action at all');
  scene.interactKey.isDown = false;
  scene.interactReleasePending = false;
  assert.equal(scene.heldInteract(), false, 'a released key disarms the guard');
  assert.equal(scene.doorEnabled('practice'), true, 'releasing E restores the door');
  scene.useDoor('practice');
  assert.equal(scene.said.length, 1, 'a fresh press works again');

  // The room change itself must also drop the target the player was holding: `transition()` arms the
  // guard and rebuilds the room, and `drawRoom()` clears the interaction registry — which is what
  // nulls `activeTarget` — before the new room registers anything.
  const transitionBody = methodBody('transition');
  const drawRoomBody = methodBody('drawRoom');
  assert.ok(drawRoomBody.includes('this.interactions.clear()'), 'the room rebuild clears the interaction registry');
  assert.ok(transitionBody.includes('this.drawRoom()'), 'a room change rebuilds the room');
  assert.ok(transitionBody.indexOf('this.interactReleasePending=true') < transitionBody.indexOf('this.drawRoom()'),
    'the held-E guard is armed before the new room registers its controls');
});

controllerCase('an_open_C_doorway_answers_the_latch_C_prompt_only_while_open', () => {
  // RULE_GAMES §1 with the latch state: inside door C's open threshold (x552..596, y150..180) the foot body is
  // 2px from latch C's solid. Latched, that spot is walkable and the prompt answers; shut, it is a wall and silent.
  const point = { x: 563, y: 156 };
  const latch = elementOf('ink', 'latch-c');
  const open = { a: true, b: true, c: true, practice: false };
  const shut = { a: true, b: true, c: false, practice: false };
  assert.equal(actor('ink', point, open), true, 'the open C doorway is walkable once C is latched');
  assert.equal(oracleGap(point, getPathElementSolid('ink', 'latch-c')) <= PATH_REACH_GAP, true, 'the spot is within 8px of latch C');
  assert.equal(isPathElementInReach('ink', latch, point, { latches: open }), true, 'latch C reaches it with the latch state');

  const latched = makePathScene('ink', { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true }, { player: point });
  assert.equal(latched.elementApproach('latch-c', point.x, point.y), true, 'the shipped approach helper answers in the open doorway');
  assert.equal(latched.prompt('latch-c'), 'E · Gọi Lumo về', 'the latch C prompt shows inside the open doorway');
  assert.equal(latched.interactionEnabled('latch-c'), true, 'and the handle is enabled there');

  assert.equal(actor('ink', point, shut), false, 'a shut C threshold is a wall for the foot body');
  assert.equal(isPathElementInReach('ink', latch, point, { latches: shut }), false, 'and latch C does not answer through it');
  const closed = makePathScene('ink', { 'l4-latch-a': true, 'l4-latch-b': true }, { player: point });
  assert.equal(closed.elementApproach('latch-c', point.x, point.y), false, 'the shipped helper is silent while C is shut');
  assert.equal(closed.prompt('latch-c'), null, 'no prompt while C is shut');
  assert.equal(closed.interactionEnabled('latch-c'), false, 'the handle is disabled while C is shut');
  const said = closed.said.length;
  closed.interact('latch-c');
  assert.equal(closed.said.length, said, 'E there does nothing while C is shut');
  assert.equal(closed.progress.flags['l4-latch-c'], undefined, 'and latches nothing');
});

/* ------------------------------------------------------------------ *
 * Walk-in gates (RULE_GAMES §3): stepping from a threshold into an open arch is E at that door
 * ------------------------------------------------------------------ */

/** A foot-body centre whose body's top edge is at `top`: the body sits PATH_BODY.y below the centre. */
const centreAt = (x, top) => ({ x, y: top - PATH_BODY.y });

/**
 * The frames that exercise one door's walk-in rule, all read from the face's own geometry: the crossing from
 * the threshold into the passage (the only one that fires), and the frames that must not fire. Every frame is
 * a foot body, so the rule is tested on the same body the game moves.
 */
function gateFrames(face) {
  const x = face.x;
  if (face.approach === 'south') {
    // Arch opens northward from its threshold: the passage is above the band (y base-88..base-30).
    return {
      crossing: { prev: centreAt(x, face.base - 12), now: centreAt(x, face.base - 36) },
      farSide: { prev: centreAt(x, face.base - 94), now: centreAt(x, face.base - 86) },
      alongBand: { prev: centreAt(x - 10, face.base - 12), now: centreAt(x + 10, face.base - 12) },
      insidePassage: { prev: centreAt(x, face.base - 36), now: centreAt(x, face.base - 40) },
      backOut: { prev: centreAt(x, face.base - 36), now: centreAt(x, face.base - 12) },
    };
  }
  // A reverse portal: the pocket is south of its band (y base-30..base), the passage the last 8px (base-8..base).
  return {
    crossing: { prev: centreAt(x, face.base - 28), now: centreAt(x, face.base - 6) },
    farSide: { prev: centreAt(x, face.base + 4), now: centreAt(x, face.base - 6) },
    alongBand: { prev: centreAt(x - 10, face.base - 28), now: centreAt(x + 10, face.base - 28) },
    insidePassage: { prev: centreAt(x, face.base - 6), now: centreAt(x, face.base - 4) },
    backOut: { prev: centreAt(x, face.base - 6), now: centreAt(x, face.base - 28) },
  };
}

controllerCase('walk_in_fires_once_from_the_threshold_into_each_arch_and_never_otherwise', () => {
  let arches = 0;
  for (const face of PATH_DOOR_FACES) {
    const label = `${face.room}/${face.id} (${face.approach})`;
    const frames = gateFrames(face);
    const practice = face.id === 'practice';
    assert.equal(isPathGateWalkIn(face.room, face.id, frames.crossing.prev, frames.crossing.now), !practice,
      `${label}: threshold -> passage is a walk-in${practice ? ' (never, the practice door is E-only)' : ''}`);
    assert.equal(isPathGateWalkIn(face.room, face.id, frames.farSide.prev, frames.farSide.now), false, `${label}: entering from the far side is not`);
    assert.equal(isPathGateWalkIn(face.room, face.id, frames.alongBand.prev, frames.alongBand.now), false, `${label}: sliding along the band is not`);
    assert.equal(isPathGateWalkIn(face.room, face.id, frames.insidePassage.prev, frames.insidePassage.now), false, `${label}: staying in the passage is not`);
    assert.equal(isPathGateWalkIn(face.room, face.id, frames.backOut.prev, frames.backOut.now), false, `${label}: leaving the arch back into the room is not`);
    for (const room of ['entry', 'relay', 'ink'].filter((name) => name !== face.room)) {
      assert.equal(isPathGateWalkIn(room, face.id, frames.crossing.prev, frames.crossing.now), false,
        `${label}: the same crossing in ${room} is not a walk-in there`);
    }
    if (face.approach === 'north') {
      assert.equal(isPathGateWalkIn(face.room, face.id, frames.crossing.prev, frames.crossing.now), true, `${label}: moving south into the pocket is a walk-in`);
      assert.equal(isPathGateWalkIn(face.room, face.id, frames.backOut.prev, frames.backOut.now), false, `${label}: moving north out is not`);
    }
    if (!practice) arches += 1;
  }
  assert.equal(arches, PATH_DOOR_FACES.length - 1, 'every non-practice door face is covered (the two reverse portals included)');
});

controllerCase('every_arrival_stands_outside_every_gate_band_and_passage_in_its_room', () => {
  // A spawn or back arrival must never be a walk-in edge: its foot body is outside every threshold band and
  // every passage of the room it lands in, so the first frame there cannot step into an arch.
  const arrivals = [
    ['entry', PATH_ROOMS.entry.spawn, 'entry spawn'], ['entry', PATH_ROOMS.entry.entrySpawn, 'entry entry spawn'],
    ['entry', PATH_CHECKPOINTS.entry.point, 'entry checkpoint'], ['entry', getPathBackArrival('a'), 'back from relay through A'],
    ['relay', PATH_ROOMS.relay.spawn, 'relay spawn'], ['relay', PATH_ROOMS.relay.entrySpawn, 'relay entry spawn'],
    ['relay', PATH_CHECKPOINTS.relay.point, 'relay checkpoint'], ['relay', getPathBackArrival('b'), 'back from ink through B'],
    ['ink', PATH_ROOMS.ink.spawn, 'ink spawn'], ['ink', PATH_ROOMS.ink.entrySpawn, 'ink entry spawn'],
    ['ink', PATH_CHECKPOINTS.ink.point, 'ink checkpoint'],
  ];
  for (const [roomId, point, label] of arrivals) {
    const body = pathActorBody(point);
    for (const face of PATH_DOOR_FACES.filter((item) => item.room === roomId)) {
      assert.equal(rectsOverlap(body, getPathThresholdBand(face)), false, `${label} (${point.x},${point.y}) is outside ${roomId}/${face.id}'s threshold band`);
      assert.equal(rectsOverlap(body, getPathDoorPassage(face)), false, `${label} (${point.x},${point.y}) is outside ${roomId}/${face.id}'s passage`);
    }
  }
});

/**
 * A recording scene for the shipped `update()`: the per-frame systems it calls are stubs, so the only thing
 * that runs is the walk-in step itself, followed by the shipped `runDoor()` and the stubbed transition ports.
 */
function walkInScene(room, flags, prev, now, extra = {}) {
  const scene = makePathScene(room, flags, { player: { x: now.x, y: now.y, setPosition(x, y) { this.x = x; this.y = y; } }, ...extra });
  scene.prevPlayer = { x: prev.x, y: prev.y };
  scene.canStartStory = () => true;
  scene.releaseInteractGuard = compile('releaseInteractGuard', [], { isPathInteractHeld });
  for (const name of ['advanceLumo', 'updateDoors', 'updateInkProgress', 'updateInkOrder', 'updateInkSequence', 'updateInkGuide', 'updateReunion', 'flushPendingStoryBeat', 'refreshArt']) {
    scene[name] = () => {};
  }
  scene.scene = { time: { now: 0 } };
  scene.lastCheckpoint = 0;
  scene.isSafe = () => false;
  scene.transitions = [];
  scene.transition = (to, spawn, flag) => { scene.transitions.push({ to, spawn: { ...spawn }, flag }); };
  scene.exits = 0;
  scene.prepareLevelExit = () => { scene.exits += 1; };
  scene.update = compile('update', ['dt'], {});
  return scene;
}

controllerCase('walking_into_an_open_arch_is_E_at_its_door', () => {
  const entryA = getPathDoorFace('a', 'entry');
  const crossing = gateFrames(entryA).crossing;
  // Powered: Lumo stands on A's plate, so the arch is open and the step through it changes room.
  const powered = walkInScene('entry', {}, crossing.prev, crossing.now, { power: { a: true } });
  powered.update(16);
  assert.deepEqual(powered.transitions, [{ to: 'relay', spawn: PATH_ROOMS.relay.entrySpawn, flag: 'l4-visited-relay' }],
    'walking into the powered A arch carries the player to relay exactly as E at the door does');
  assert.equal(powered.said.length, 0, 'a clean walk-in speaks no line');
  powered.update(16);
  assert.equal(powered.transitions.length, 1, 'the same position on the next frame is no new edge: it fires once');

  // Latched: the same arch stays open for good.
  const latched = walkInScene('entry', { 'l4-latch-a': true }, crossing.prev, crossing.now);
  latched.update(16);
  assert.equal(latched.transitions.length, 1, 'a latched A arch is walked through the same way');

  // The far side and the band never fire, even with the arch open.
  const frames = gateFrames(entryA);
  for (const name of ['farSide', 'alongBand', 'insidePassage', 'backOut']) {
    const scene = walkInScene('entry', { 'l4-latch-a': true }, frames[name].prev, frames[name].now);
    scene.update(16);
    assert.equal(scene.transitions.length, 0, `${name} does not walk through A`);
  }

  // Reverse portals: from the relay pocket back to entry, and from ink back to relay.
  const relayA = gateFrames(getPathDoorFace('a', 'relay'));
  const pocket = walkInScene('relay', { 'l4-latch-a': true }, relayA.crossing.prev, relayA.crossing.now);
  pocket.update(16);
  assert.deepEqual(pocket.transitions, [{ to: 'entry', spawn: getPathBackArrival('a'), flag: 'l4-room' }],
    'stepping south into the relay pocket returns the player through A, as E does');
  const inkB = gateFrames(getPathDoorFace('b', 'ink'));
  const back = walkInScene('ink', { 'l4-latch-b': true }, inkB.crossing.prev, inkB.crossing.now);
  back.update(16);
  assert.deepEqual(back.transitions, [{ to: 'relay', spawn: getPathBackArrival('b'), flag: 'l4-room' }],
    'stepping south into the ink pocket returns the player through B');
  const outward = walkInScene('relay', { 'l4-latch-a': true }, relayA.backOut.prev, relayA.backOut.now);
  outward.update(16);
  assert.equal(outward.transitions.length, 0, 'leaving the relay pocket northward does not walk through A');

  // The practice door is E-only: even a powered lesson door is never walked into.
  const practice = gateFrames(getPathDoorFace('practice', 'entry'));
  const lesson = walkInScene('entry', {}, practice.crossing.prev, practice.crossing.now, { power: { practice: true } });
  lesson.update(16);
  assert.equal(lesson.transitions.length + lesson.said.length, 0, 'the practice door is never a walk-in');
});

controllerCase('walking_into_the_exit_arch_gives_the_same_blocks_as_E', () => {
  const exitC = gateFrames(getPathDoorFace('c', 'ink'));
  // No latch yet: the arch is shut, so there is no crossing to make. With the latch but no memory, the walk-in
  // speaks the memory line once and does not leave.
  const blocked = walkInScene('ink', { 'l4-latch-b': true, 'l4-latch-c': true }, exitC.crossing.prev, exitC.crossing.now);
  blocked.update(16);
  assert.equal(blocked.exits, 0, 'the exit arch does not open without the memory');
  assert.equal(blocked.said.length, 1, 'one walk-in speaks exactly one line');
  assert.match(saidText(blocked), /vết xoắn/, `the memory block is spoken (${saidText(blocked)})`);
  // A second edge (a fresh step in) is a new attempt and speaks again, but a held position speaks nothing.
  blocked.prevPlayer = { x: exitC.crossing.prev.x, y: exitC.crossing.prev.y };
  blocked.update(16);
  assert.equal(blocked.said.length, 2, 'a fresh step into the arch is a new attempt');
  blocked.update(16);
  assert.equal(blocked.said.length, 2, 'standing still in the arch speaks nothing more');

  // Latch, memory and the companion together: the walk-in leaves for the tower, like E.
  const ready = walkInScene('ink', { 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true }, exitC.crossing.prev, exitC.crossing.now, { reunited: true });
  ready.update(16);
  assert.equal(ready.exits, 1, 'with every block cleared the walk-in leaves for the tower, once');
});

controllerCase('walk_in_respects_dialogue_and_the_held_E_guard', () => {
  const crossing = gateFrames(getPathDoorFace('a', 'entry')).crossing;
  const busy = walkInScene('entry', {}, crossing.prev, crossing.now, { power: { a: true } });
  busy.canStartStory = () => false;
  busy.update(16);
  assert.equal(busy.transitions.length, 0, 'no walk-in while a line is on screen');

  const held = walkInScene('entry', {}, crossing.prev, crossing.now, { power: { a: true }, interactReleasePending: true, interactKey: { isDown: true } });
  held.update(16);
  assert.equal(held.transitions.length, 0, 'a held E arms the guard, so the walk-in is refused too');

  const released = walkInScene('entry', {}, crossing.prev, crossing.now, { power: { a: true }, interactReleasePending: true, interactKey: { isDown: false } });
  released.update(16);
  assert.equal(released.transitions.length, 1, 'once E is up the guard clears and the walk-in works');
});

controllerCase('a_room_change_arms_the_walk_in_edge_at_the_arrival', () => {
  // The shipped transition puts the arrival in prevPlayer, so the first frame in the new room cannot read the
  // old room's threshold as its previous foot position.
  const scene = makePathScene('entry', {}, { player: { x: 480, y: 254, setPosition(x, y) { this.x = x; this.y = y; } } });
  scene.routeFollowerTo = () => {};
  scene.drawRoom = () => {};
  scene.refresh = () => {};
  scene.transition = compile('transition', ['to', 'spawn', 'visitFlag'], { shouldRoutePathFollower });
  scene.transition('relay', PATH_ROOMS.relay.entrySpawn, 'l4-visited-relay');
  assert.deepEqual({ x: scene.prevPlayer.x, y: scene.prevPlayer.y }, { x: PATH_ROOMS.relay.entrySpawn.x, y: PATH_ROOMS.relay.entrySpawn.y },
    'the arrival is the previous foot position of the new room');
  assert.equal(scene.interactReleasePending, true, 'and the held-E guard is armed');
});

controllerCase('route_cables_reach_both_ends_and_bend_at_real_corners', () => {
  const expected = [
    ['entry', 'practice', 205, 2], ['entry', 'a', 215, 0], ['relay', 'b', 234, 0], ['relay', 'a', 380, 0], ['ink', 'c', 477, 3],
  ];
  for (const [room, mark, chord, corners] of expected) {
    const line = getPathRouteLine(room, mark);
    assert.ok(line, `${room}/${mark} route is authored in the layout data`);
    const points = pathRoutePoints(line);
    const length = pathPolylineLength(points);
    assert.ok(Math.abs(Math.hypot(points[points.length - 1].x - points[0].x, points[points.length - 1].y - points[0].y) - chord) < 1,
      `${room}/${mark} chord is the published ${chord}px run`);
    const pieces = pathRouteCableSegments(points);
    const covered = pieces.reduce((total, piece) => total + piece.length, 0);
    assert.ok(covered >= length - 1e-6, `${room}/${mark} cable covers the whole ${length.toFixed(1)}px run (${covered.toFixed(1)}px)`);
    assert.ok(pieces.every((piece) => piece.length <= 160 + 1e-6), `${room}/${mark} cable pieces respect the native 160px stamp`);
    const first = pieces[0], last = pieces[pieces.length - 1];
    const firstStart = { x: first.x - Math.cos(first.angle) * first.length / 2, y: first.y - Math.sin(first.angle) * first.length / 2 };
    const lastEnd = { x: last.x + Math.cos(last.angle) * last.length / 2, y: last.y + Math.sin(last.angle) * last.length / 2 };
    assert.ok(Math.hypot(firstStart.x - points[0].x, firstStart.y - points[0].y) < 1e-6, `${room}/${mark} cable starts at the call`);
    assert.ok(Math.hypot(lastEnd.x - points[points.length - 1].x, lastEnd.y - points[points.length - 1].y) < 1e-6, `${room}/${mark} cable ends at the plate`);
    assert.equal(pathRouteCorners(points).length, corners, `${room}/${mark} elbows sit at its genuine corners`);
  }
});

controllerCase('rendered_route_stamps_stay_inside_each_run_after_texture_swaps', () => {
  // Run the shipped renderer with Phaser's real frame/crop components. Layout lengths alone did not
  // catch a 32px run receiving a full 160px cable image. PNG dimensions come from IHDR, not the layout.
  const require = createRequire(import.meta.url);
  const Frame = require('phaser/src/textures/Frame.js');
  const TextureCrop = require('phaser/src/gameobjects/components/TextureCrop.js');
  const textures = new Map();
  const textureFor = (key) => {
    if (!textures.has(key)) {
      const png = readFileSync(join(rootDir, 'assets/levels/05-a-path-for-two/sprites', `${key}.png`));
      const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
      const texture = { key, source: [{ width, height }] };
      const frame = new Frame(texture, '__BASE', 0, 0, 0, width, height);
      texture.get = () => frame;
      textures.set(key, texture);
    }
    return textures.get(key);
  };
  class RouteImage {
    constructor(x, y, key) {
      Object.assign(this, { x, y, rotation: 0, scaleX: 1, scaleY: 1, flipX: false, flipY: false,
        _sizeComponent: true, _originComponent: false, renderFlags: 15, data: new Map(),
        scene: { sys: { textures: { get: textureFor } } } });
      this._crop = this.resetCropObject();
      this.setTexture(key);
    }
    setSizeToFrame() { this.width = this.frame.realWidth; this.height = this.frame.realHeight; }
    setRotation(value) { this.rotation = value; return this; }
    setDepth(value) { this.depth = value; return this; }
    setData(key, value) { this.data.set(key, value); return this; }
    getData(key) { return this.data.get(key); }
  }
  Object.assign(RouteImage.prototype, TextureCrop);
  const symbols = { getLevelArtKey: (_level, key) => key, pathRouteCableSegments, pathRouteCorners };
  const render = {
    objects: [], scene: { add: { image: (x, y, key) => new RouteImage(x, y, key) } },
    track(image) { this.objects.push(image); return image; },
    progress: { flags: {} }, elementFor: () => undefined, hasPower: () => false, assignment: 'follow',
    addTubeModules: compile('addTubeModules', ['points'], symbols),
    addCable: compile('addCable', ['mark', 'points'], symbols),
    refreshArt: compile('refreshArt', [], { ...symbols, isPathSeal, isPathCallSpent, pathCallLabel, Phaser: { GameObjects: { Image: RouteImage } } }),
  };
  const extent = (image, from, angle) => {
    const crop = image.isCropped ? image._crop : { x: 0, width: image.width };
    const middle = (image.x - from.x) * Math.cos(angle) + (image.y - from.y) * Math.sin(angle);
    return { start: middle + crop.x - image.width / 2, end: middle + crop.x + crop.width - image.width / 2 };
  };
  for (const line of PATH_ROUTE_LINES) {
    const points = pathRoutePoints(line);
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1], to = points[index];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      render.objects = [];
      render.addTubeModules([from, to]);
      render.addCable(line.mark, [from, to]);
      for (const kind of ['tube-straight', 'root-cable-rest']) {
        const images = render.objects.filter((image) => image.texture.key === kind);
        assert.ok(images.length > 0, `${line.room}/${line.mark}: ${kind} is really drawn`);
        let covered = 0;
        for (const image of images) {
          const span = extent(image, from, angle);
          assert.ok(Math.abs(span.start - covered) < 1e-6 && span.end <= length + 1e-6,
            `${line.room}/${line.mark}: ${kind} visible span ${span.start}..${span.end} must stay on run 0..${length}`);
          assert.equal(image.scaleX, 1, 'cropping must not stretch native pixel width');
          assert.equal(image.scaleY, 1, 'cropping must not stretch native pixel thickness');
          covered = span.end;
        }
        assert.ok(Math.abs(covered - length) < 1e-6, `${kind} covers the run without gaps`);
      }
      const cables = render.objects.filter((image) => image.getData('path-id') === 'cable');
      const before = cables.map((image) => extent(image, from, angle));
      for (const [state, powered, assignment] of [['flow', false, line.mark], ['arrived', true, line.mark], ['rest', false, 'follow']]) {
        render.hasPower = () => powered;
        render.assignment = assignment;
        render.refreshArt();
        assert.ok(cables.every((image) => image.texture.key === `root-cable-${state}`));
        assert.deepEqual(cables.map((image) => extent(image, from, angle)), before,
          `${state}: Phaser's real setTexture keeps the crop and visible endpoints`);
      }
    }
  }
});

controllerCase('the_controller_route_legs_run_along_the_authored_lines', () => {
  // The plate leg of Lumo's walk *is* the layout's own route tail (`PATH_ROUTE_LINES[].plate`), but
  // `pipeRoute()` still authors its between-room turn points in the controller — the shape of failure
  // this level's art history is made of, and nothing caught a drift. This case binds the shipped
  // `pipeRoute()` and `localRoute()` and proves every point either one emits is a waypoint of the
  // authored line of its own room, taken in route order along that line.
  const linePointsOf = (room) => PATH_ROUTE_LINES.filter((line) => line.room === room).map((line) => pathRoutePoints(line));
  /**
   * A leg walks along one authored line at a time: a strictly monotone run of one line (forwards or
   * backwards along it), then — when two rooms away, where the route chains two of that room's lines —
   * a run of another line of the same room.
   */
  const runLength = (points, leg, from, direction) => {
    let index = points.findIndex((authored) => authored.x === leg[from].x && authored.y === leg[from].y);
    if (index < 0) return 0;
    let taken = 1;
    while (from + taken < leg.length) {
      const next = leg[from + taken];
      const at = points.findIndex((authored) => authored.x === next.x && authored.y === next.y);
      if (at < 0 || (direction === 1 ? at <= index : at >= index)) break;
      index = at;
      taken += 1;
    }
    return taken;
  };
  const runsAlong = (lineSets, leg) => {
    if (leg.length === 0) return true;
    for (const points of lineSets) {
      for (const direction of [1, -1]) {
        const taken = runLength(points, leg, 0, direction);
        if (taken > 0 && runsAlong(lineSets, leg.slice(taken))) return true;
      }
    }
    return false;
  };
  const roomLegs = (route) => route.reduce((legs, point) => {
    const last = legs[legs.length - 1];
    if (last && last.room === point.room) last.points.push(point);
    else legs.push({ room: point.room, points: [point] });
    return legs;
  }, []);
  const scene = bindTravelPipeline(makePathScene('entry', {}));
  const rooms = ['entry', 'relay', 'ink'];
  for (const from of rooms) {
    for (const to of rooms) {
      if (from === to) continue;
      const route = scene.pipeRoute(from, to);
      assert.ok(route.length > 0, `${from} -> ${to} authors a pipe route`);
      for (const leg of roomLegs(route)) {
        assert.ok(runsAlong(linePointsOf(leg.room), leg.points),
          `${from} -> ${to}: the ${leg.room} pipe leg ${JSON.stringify(leg.points.map((point) => ({ x: point.x, y: point.y })))} is a run of that room's authored route line`);
      }
    }
  }

  // And the walk itself has to end on the plate's own floor seal — the very point `hasDoorPower()`
  // measures with Lumo standing there — in the plate's own room.
  const plateRooms = controllerConstant('PLATE_ROOMS');
  for (const mark of ['practice', 'a', 'b', 'c']) {
    const room = plateRooms[mark];
    const seal = PATH_ROOMS[room].elements.find((element) => element.id === (mark === 'practice' ? 'practice-plate' : `plate-${mark}`));
    assert.ok(seal && isPathSeal(seal), `${room} authors the floor seal the ${mark} route ends on`);
    const art = getPathElementArtRect(seal);
    const plate = { x: art.x + art.width / 2, y: art.y + art.height / 2 };
    const leg = scene.localRoute(mark);
    assert.ok(leg.length > 1, `${mark}: the walk authors its own leg inside ${room}`);
    assert.ok(leg.every((point) => point.room === room), `${mark}: every walked waypoint carries the plate's own room`);
    assert.ok(runsAlong(linePointsOf(room), leg),
      `${mark}: the walk ${JSON.stringify(leg.map((point) => ({ x: point.x, y: point.y })))} is the authored line's own plate leg`);
    const end = leg[leg.length - 1];
    assert.deepEqual({ x: end.x, y: end.y }, plate, `${mark}: the walk ends on its own seal (${plate.x},${plate.y})`);
    assert.equal(hasDoorPower(mark, { assignment: mark, lumoRoom: room, lumoX: plate.x, lumoY: plate.y }), true,
      `${mark}: that seal is the target the door power measures`);
  }
});

controllerCase('the_ink_mark_is_one_continuous_run_and_the_mouths_leave_the_passages', () => {
  // One 348×48 tile over the corridor instead of two 240×48 stamps 132px out of phase. The tile is
  // measured against the layout's own corridor rect rather than against a literal the case restates, so
  // a mark that no longer covers the walkable band — or masonry that no longer frames it — fails here.
  assert.equal(CONTROLLER_SOURCE.includes("for(const x of [304,412])"), false, 'the two out-of-phase ink stamps are gone');
  // The mark is the one floor-sized tile that covers the whole band. A stamp drawn smaller than the
  // corridor — the 240×48 pair this replaced — leaves nothing here and fails on the count; the room's
  // own background tile is not floor-sized, so it cannot stand in for the mark.
  const drawn = tileSpriteRects(CONTROLLER_SOURCE)
    .filter((rect) => rectCovers(rect, PATH_INK_CORRIDOR) && rectInside(rect, PATH_FLOOR_BOUNDS));
  assert.equal(drawn.length, 1, `exactly one floor-sized tile covers the whole ink corridor band (got ${drawn.length})`);
  assert.ok(rectCovers(drawn[0], PATH_INK_CORRIDOR),
    `the drawn ink mark ${JSON.stringify(drawn[0])} covers the layout corridor band ${JSON.stringify(PATH_INK_CORRIDOR)}`);
  const slabs = PATH_ROOMS.ink.walls.filter((wall) => wall.x === PATH_INK_CORRIDOR.x && wall.width === PATH_INK_CORRIDOR.width);
  assert.equal(slabs.length, 2, 'the corridor band is flanked by exactly its two authored 348px masonry slabs');
  assert.ok(slabs.some((wall) => wall.y + wall.height === PATH_INK_CORRIDOR.y), 'the north slab ends on the corridor band');
  assert.ok(slabs.some((wall) => wall.y === PATH_INK_CORRIDOR.y + PATH_INK_CORRIDOR.height), 'the south slab starts on it');
  const middle = { x: PATH_INK_CORRIDOR.x + PATH_INK_CORRIDOR.width / 2, y: PATH_INK_CORRIDOR.y + PATH_INK_CORRIDOR.height / 2 };
  assert.equal(actor('ink', middle), true, `the middle of the band (${middle.x},${middle.y}) is walkable for the real foot body`);
  assert.equal(actor('ink', { x: middle.x, y: PATH_INK_CORRIDOR.y - 20 }), false,
    'and the slab above it is still masonry the body cannot enter');
  assert.ok(!CONTROLLER_SOURCE.includes("path-id','ink-route'"), 'no second ink stamp object survives');

  for (const mouth of PATH_TUBE_MOUTHS) {
    const face = getPathDoorFace(mouth.tube, mouth.room);
    const art = { x: mouth.x - 32, y: mouth.y - 16, width: 64, height: 32 };
    if (mouth.tube === 'c') {
      assert.equal(rectsOverlap(art, getPathDoorPassage(face)), false,
        `the C mouth at (${mouth.x},${mouth.y}) is outside door C's passage`);
      const doorArt = { x: 574 - 32, y: 180 - 88, width: 64, height: 88 };
      assert.equal(pointInRect({ x: mouth.x, y: mouth.y }, doorArt), false,
        'and it is not stamped on the exit door frame itself');
      continue;
    }
    // A room-hop mouth marks its own authored crossing point of the visible pipe; the practice mouth
    // marks where the lesson tube crosses the partition at the low door.
    const crossing = PATH_PIPE_ENDPOINTS[mouth.tube]?.[mouth.room] ?? { x: 156, y: 190 };
    assert.deepEqual({ x: mouth.x, y: mouth.y }, crossing, `the ${mouth.room} ${mouth.tube} mouth marks its authored crossing`);
    assert.equal(face.approach === 'north' ? rectsOverlap(art, getPathDoorPassage(face)) : false, false,
      `the ${mouth.room} ${mouth.tube} mouth is outside its reverse-passage opening`);
  }
  // The removed position, kept as a regression guard: it really was stamped inside the exit passage.
  assert.equal(rectsOverlap({ x: 574 - 32, y: 136 - 16, width: 64, height: 32 },
    getPathDoorPassage(getPathDoorFace('c', 'ink'))), true,
    'the old (574,136) stamp was inside door C\'s passage');
  const inkC = PATH_TUBE_MOUTHS.find((mouth) => mouth.room === 'ink' && mouth.tube === 'c');
  assert.equal(inkC.x, 536, 'the C mouth sits where the C run leaves the corridor masonry');
  const cLine = getPathRouteLine('ink', 'c');
  const descent = pathRoutePoints(cLine).slice(-2);
  const expectedAngle = Math.atan2(descent[1].y - descent[0].y, descent[1].x - descent[0].x);
  assert.ok(Math.abs(inkC.rotation - expectedAngle) < 0.02, 'the C mouth rotation is the descent angle itself');
  const crossing = descent[0].x + (218 - descent[0].y) / (descent[1].y - descent[0].y) * (descent[1].x - descent[0].x);
  assert.ok(Math.abs(inkC.x - crossing) < 0.6, `the C mouth x is the masonry crossing (${crossing.toFixed(1)})`);
});

controllerCase('the_spiral_engraving_sits_on_the_wall_with_a_reachable_stand', () => {
  const spiral = PATH_ROOMS.ink.elements.find((element) => element.id === 'spiral');
  assert.equal(spiral.approach, 'side', 'the wall engraving carries its documented side approach in the data');
  const art = getPathElementArtRect(spiral);
  // The swirl's opaque content is inset 13/40 and 33/40 of its native 40px frame (measured from
  // swirl-memory-scratch.png), so the visible ink is what has to land on the wall face.
  const contentLeft = art.x + 13 / 40 * spiral.width;
  const contentRight = art.x + 33 / 40 * spiral.width;
  assert.ok(contentLeft >= 616, `the visible ink starts on the east wall face (${contentLeft.toFixed(2)})`);
  assert.ok(contentRight <= 640, `and ends inside the wall (${contentRight.toFixed(2)})`);
  assert.equal(actor('ink', spiral.stand), true, 'the engraving stand is legal floor in front of the wall');
  assert.equal(reach('ink', PATH_ROOMS.ink.spawn, spiral.stand), true, 'and it is reachable from the ink entrance');
  assert.equal(isPathApproachAllowed('ink', spiral, { x: spiral.stand.x, y: art.y - 40 }), false,
    'the engraving stays silent from above its own span on the wall');
  assert.equal(actor('ink', { x: spiral.stand.x, y: art.y - 40 }), true,
    'and that position is walkable floor, so only the face rule refuses it');
  assert.equal(actor('ink', { x: art.x + art.width + 20, y: spiral.stand.y }), false,
    'behind the engraving is the east wall itself, which has no floor to answer from');
  assert.equal(isPathApproachAllowed('ink', spiral, spiral.stand), true, 'it answers from the floor in front of the wall');
  assert.ok(/Documented exception \(RULE_GAMES §3\)/.test(readFileSync(join(rootDir, 'src/data/pathForTwoLayout.ts'), 'utf8')),
    'the side-approach exception carries its reason in the layout data');
});

controllerCase('the_small_schematic_comes_from_the_same_layout_data', () => {
  const plan = buildPathSchematic();
  assert.deepEqual(plan.rooms.map((room) => room.room), [...PATH_SCHEMATIC_ORDER], 'the schematic shows the three rooms in campaign order');
  const authoredSeals = PATH_SCHEMATIC_ORDER.reduce((total, room) => total
    + PATH_ROOMS[room].elements.filter((element) => element.art.startsWith('pressure-')).length, 0);
  assert.equal(plan.rooms.reduce((total, room) => total + room.seals.length, 0), authoredSeals,
    `every authored seal appears exactly once (${authoredSeals})`);
  assert.equal(plan.pipes.length, 2, 'both authored pipes appear');
  for (const room of plan.rooms) {
    assert.ok(room.frame.x >= 0 && room.frame.x + room.frame.width <= PATH_SCHEMATIC_SIZE.width, `${room.room} cell fits the schematic`);
    assert.ok(room.frame.y >= 0 && room.frame.y + room.frame.height <= PATH_SCHEMATIC_SIZE.height, `${room.room} cell fits the schematic`);
    for (const seal of room.seals) {
      assert.ok(seal.x >= room.frame.x && seal.x <= room.frame.x + room.frame.width
        && seal.y >= room.frame.y && seal.y <= room.frame.y + room.frame.height,
        `${room.room} seal sits inside its own cell`);
    }
  }
  // Each room draws it beside its own call marker, on visible masonry, clear of the walkable corridor
  // and of every authored control's art.
  const artRects = PATH_SCHEMATIC_ORDER.flatMap((room) => PATH_ROOMS[room].elements.map((element) => ({ room, element, art: getPathElementArtRect(element) })));
  for (const room of PATH_SCHEMATIC_ORDER) {
    const slot = PATH_SCHEMATIC[room];
    const walls = PATH_ROOMS[room].walls;
    assert.ok(walls.some((wall) => slot.x >= wall.x && slot.x + slot.width <= wall.x + wall.width
      && slot.y >= wall.y && slot.y + slot.height <= wall.y + wall.height),
      `${room} schematic is drawn on an authored masonry face`);
    for (const entry of artRects.filter((item) => item.room === room)) {
      assert.equal(rectsOverlap(slot, entry.art), false, `${room} schematic never covers ${entry.element.id}`);
    }
  }
  assert.ok(!/letter|chữ/.test(buildPathSchematic.toString()), 'the schematic carries no lettering');
});

controllerCase('every_door_swap_lands_on_walkable_floor_that_leads_back', () => {
  // The route is walked in both directions: for each room-to-room swap, where the shipped `useDoor()`
  // actually puts the player, whether that landing is legal floor for the 14x6 foot body, whether it
  // is clear of the trigger of the door just used (a held E must not send the player straight back),
  // and whether the control that brings the player back answers from a position the landing can walk
  // to. Reachability is measured with the door open (`allOpen`), which is the state the player is in
  // when they are standing on the far side of it.
  //
  // A reverse portal's registered stand sits inside its own threshold strip (`isPathPositionSafe`
  // always refuses that strip), so the usable domain of door A in relay and door B in ink is the band
  // just north of its own stand — measured here, not assumed. The practice door is entry-only and
  // swaps no rooms; its own approach is asserted by
  // `a_held_E_cannot_ping_pong_through_the_door_just_used`.
  const crossings = [
    { from: 'entry', door: 'a', to: 'relay', spawn: PATH_ROOMS.relay.entrySpawn },
    { from: 'relay', door: 'a', to: 'entry', spawn: getPathBackArrival('a') },
    { from: 'relay', door: 'b', to: 'ink', spawn: PATH_ROOMS.ink.entrySpawn },
    { from: 'ink', door: 'b', to: 'relay', spawn: getPathBackArrival('b') },
  ];
  const answeringStands = (room, stand, door) => legalDisc(room, stand, stand.radius)
    .filter((point) => isPathDoorApproachAllowed(room, door, point));
  for (const crossing of crossings) {
    const label = `${crossing.from} -> ${crossing.to} through ${crossing.door.toUpperCase()}`;
    const outbound = getPathControlStand(crossing.door, crossing.from);
    assert.ok(outbound, `${label}: the origin room registers that door control`);
    const outward = answeringStands(crossing.from, outbound, crossing.door);
    assert.ok(outward.length > 0, `${label}: usable from its own room side (${outward.length} legal positions)`);
    assert.equal(reach(crossing.from, PATH_ROOMS[crossing.from].spawn, outward[0]), true,
      `${label}: the origin stand (${outward[0].x},${outward[0].y}) is on the walked side of its own room`);
    assert.equal(isPathPositionSafe(crossing.to, crossing.spawn), true,
      `${label}: lands on walkable floor (${crossing.spawn.x},${crossing.spawn.y})`);
    const back = getPathControlStand(crossing.door, crossing.to);
    assert.ok(back, `${label}: the destination room registers the same control to come back`);
    const distance = Math.hypot(crossing.spawn.x - back.x, crossing.spawn.y - back.y);
    assert.ok(distance > back.radius,
      `${label}: the landing is outside the return trigger (${distance.toFixed(1)}px > r${back.radius})`);
    const homeward = answeringStands(crossing.to, back, crossing.door);
    assert.ok(homeward.length > 0,
      `${label}: the destination keeps a usable stand for the return control (${homeward.length} legal positions)`);
    const nearest = homeward.reduce((best, point) => (Math.hypot(point.x - crossing.spawn.x, point.y - crossing.spawn.y)
      < Math.hypot(best.x - crossing.spawn.x, best.y - crossing.spawn.y) ? point : best), homeward[0]);
    assert.equal(reach(crossing.to, crossing.spawn, nearest), true,
      `${label}: the landing walks back to the return control at (${nearest.x},${nearest.y})`);
  }
});

controllerCase('the_two_write_only_flags_stay_retired', () => {
  // Verified before deletion, at HEAD `ee34eba`: `pendingClose` was a private field written only in
  // `updateDoors()` (the deferred close is `body.enable` per frame), and `l4-lumo-arrived` was
  // written in `completeRoute()` and read by nothing in the repository. No external reader existed,
  // so no compatibility shim is owed and neither name may come back as a write-only flag.
  const retired = ['pendingClose', 'l4-lumo-arrived'];
  for (const name of retired) {
    assert.equal(CONTROLLER_SOURCE.includes(name), false, `PathForTwoLevel.ts no longer mentions ${name}`);
  }
  const sources = [];
  const collect = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (entry.name.endsWith('.ts')) sources.push(path);
    }
  };
  collect(join(rootDir, 'src'));
  assert.ok(sources.length > 40, `the whole src tree is scanned (${sources.length} files)`);
  for (const name of retired) {
    const readers = sources.filter((path) => readFileSync(path, 'utf8').includes(name));
    assert.deepEqual(readers, [], `${name} is gone from src (would be a reader/writer: ${readers.join(', ')})`);
  }
});

controllerCase('restore_fallbacks_are_named_safe_checkpoints', () => {
  for (const room of PATH_SCHEMATIC_ORDER) {
    const fallback = nearestSafePathSpawn(room, { x: 9999, y: 9999 }, () => false);
    assert.deepEqual(fallback, PATH_CHECKPOINTS[room].point, `${room} falls back to its own named checkpoint`);
    assert.equal(actor(room, fallback), true, `${room} checkpoint ${PATH_CHECKPOINTS[room].name} is safe for the foot body`);
    assert.equal(reach(room, PATH_ROOMS[room].spawn, fallback), true, `${room} checkpoint is on the reached side`);
  }
  assert.equal(actor('relay', { x: 180, y: 280 }), false, 'the old shared (180,280) fallback really clips the relay wall band');
  assert.equal(actor('ink', { x: 180, y: 280 }), false, 'and the ink room too');
});

controllerCase('saved_positions_restore_safely_in_every_room_and_state', () => {
  // Mid-threshold: a save inside a closed door's floor pocket must be replaced by a safe point, and
  // the door must not close on a body that is still standing in its own threshold.
  for (const stand of PATH_CONTROL_STANDS) {
    const face = getPathDoorFace(stand.id, stand.room);
    const inside = { x: face.x, y: face.base - 30 };
    const safe = nearestSafePathSpawn(stand.room, inside, (room, point) => isPathPositionSafe(room, point, { latches: {} }));
    assert.equal(isPathPositionSafe(stand.room, safe), true, `${stand.room}/${stand.id}: a mid-threshold save restores safely`);
    const body = pathActorBody(inside);
    const occupied = rectsOverlap(body, { x: face.x - 22, y: face.base - 30, width: 44, height: 30 });
    assert.equal(occupied, true, `${stand.room}/${stand.id}: the threshold strip really contains that body`);
    assert.equal(pathDoorShouldClose(false, occupied, false), false, `${stand.room}/${stand.id}: the threshold defers closure`);
  }
  // Mid-travel: a route interrupted one step in must resume, not be thrown away.
  const travelled = [
    { room: 'entry', x: 180, y: 280 },
    { room: 'entry', x: 480, y: 190, pipe: 'a', end: 'out' },
    { room: 'relay', x: 110, y: 280, pipe: 'a', end: 'in' },
    { room: 'relay', x: 480, y: 190 },
  ];
  assert.equal(isPathRouteValid(travelled), true, 'a mid-travel route is still valid');
  assert.equal(shouldRestorePathFollower({ hasRoomMetadata: true, assignment: 'a', travelling: true, actuallyArrived: false }), false,
    'a mid-travel save resumes its route');
  assert.deepEqual(parsePathRoute(travelled), travelled, 'a mid-travel route survives the save round trip');
  // Every room: a legal saved position is kept, an illegal one is replaced.
  for (const room of PATH_SCHEMATIC_ORDER) {
    const spawn = PATH_ROOMS[room].spawn;
    assert.deepEqual(nearestSafePathSpawn(room, spawn), spawn, `${room}: a legal save is kept`);
    assert.equal(isPathPositionSafe(room, nearestSafePathSpawn(room, { x: 300, y: 150 })), true,
      `${room}: an impossible save still restores onto safe floor`);
  }
});

/* ------------------------------------------------------------------ *
 * The ink glyph puzzle and its objective (Level 05 ink room)
 * ------------------------------------------------------------------ */

/** A recording stand-in for a Phaser Graphics object: each draw call is kept, and `clear()` starts a new picture. */
function recordingGraphics() {
  const graphics = { calls: [], visible: true, active: true };
  const record = (name) => (...args) => { graphics.calls.push([name, ...args]); return graphics; };
  for (const name of ['lineStyle', 'fillStyle', 'strokeCircle', 'fillCircle', 'strokeTriangle', 'fillTriangle', 'strokeRect', 'fillRect', 'setDepth']) {
    graphics[name] = record(name);
  }
  graphics.clear = () => { graphics.calls.length = 0; return graphics; };
  graphics.setVisible = (value) => { graphics.visible = value; return graphics; };
  return graphics;
}

/**
 * The shipped ink-puzzle methods (`updateInkOrder`, `updateInkSequence`, `updateInkGuide`, `drawInkPuzzle`,
 * `refreshInkGlyphs`, `floatInkText`, `queueStoryBeat`) bound for real, inside the shipped `update()` through
 * `walkInScene`. The room's other per-frame systems stay stubbed. `inkFrame` is one frame with the foot on a point.
 */
function inkPuzzleScene(flags, { at = { x: 300, y: 242 }, lantern = false, power = {}, now = 0, counters = {}, ...extra } = {}) {
  const scene = walkInScene('ink', flags, at, at, { lanternOn: lantern, power, progress: { flags: { ...flags }, counters }, ...extra });
  const texts = [];
  const tweens = [];
  scene.objects = [];
  scene.track = (object) => { scene.objects.push(object); return object; };
  scene.scene = {
    time: { now },
    add: {
      text(x, y, value) {
        const text = { x, y, value, destroyed: false, setOrigin() { return this; }, setDepth() { return this; }, destroy() { this.destroyed = true; } };
        texts.push(text);
        return text;
      },
      graphics: () => recordingGraphics(),
    },
    tweens: { add(options) { tweens.push(options); return { stop() {} }; } },
  };
  scene.pendingStoryBeats = [];
  scene.canStartStory = () => true;
  // The class fields the controller initialises in its constructor.
  scene.lastInkHintAt = -Infinity;
  scene.inkHitLast = undefined;
  scene.drawInkPuzzle = compile('drawInkPuzzle', [], {});
  scene.refreshInkGlyphs = compile('refreshInkGlyphs', [], { PATH_INK_GLYPHS, PATH_INK_ORDER });
  scene.floatInkText = compile('floatInkText', ['x', 'y', 'value'], {});
  scene.updateInkOrder = compile('updateInkOrder', [], { INK_ORDER_LINES: controllerConstant('INK_ORDER_LINES') });
  scene.updateInkSequence = compile('updateInkSequence', [], {
    PATH_INK_GLYPHS, pathInkGlyphAt, advancePathInkSequence, INK_SEALED_LINES: controllerConstant('INK_SEALED_LINES'),
  });
  scene.updateInkGuide = compile('updateInkGuide', [], { pathInkGuideTarget });
  scene.queueStoryBeat = compile('queueStoryBeat', ['lines', 'onComplete', 'guard', 'onStale'], {});
  scene.flushPendingStoryBeat = compile('flushPendingStoryBeat', [], {});
  scene.drawInkPuzzle();
  return { scene, texts, tweens };
}
/** One shipped frame with the foot body standing on `foot` at time `now` (ms). */
function inkFrame(scene, foot, now) {
  scene.stand(foot.x, foot.y - PATH_BODY.feetY);
  scene.scene.time.now = now;
  scene.update(16);
}
const glyphFoot = (id) => PATH_INK_GLYPHS.find((glyph) => glyph.id === id);
const CLEAR_FOOT = { x: 300, y: 242 };

controllerCase('ink_sequence_rules_are_pure_and_table_checked', () => {
  const [ring, triangle, square] = PATH_INK_ORDER;
  const step = (current, hit) => advancePathInkSequence(current, hit);
  assert.deepEqual(step(0, ring), { step: 1, event: 'progress' }, 'the first glyph lights');
  assert.deepEqual(step(1, triangle), { step: 2, event: 'progress' }, 'the second glyph lights');
  assert.deepEqual(step(2, square), { step: 3, event: 'done' }, 'the last glyph completes the sequence');
  assert.deepEqual(step(0, undefined), { step: 0, event: 'none' }, 'no glyph under the feet changes nothing');
  assert.deepEqual(step(2, undefined), { step: 2, event: 'none' }, 'a half-lit sequence stays lit');
  assert.deepEqual(step(1, ring), { step: 1, event: 'none' }, 'standing on the glyph just lit does not reset');
  assert.deepEqual(step(2, triangle), { step: 2, event: 'none' }, 'nor does standing on the second one');
  assert.deepEqual(step(1, square), { step: 0, event: 'reset' }, 'a wrong glyph resets to the start');
  assert.deepEqual(step(0, triangle), { step: 0, event: 'none' }, 'a wrong glyph before anything is lit is harmless: nothing to lose, no message');
  assert.deepEqual(step(0, square), { step: 0, event: 'none' }, 'the same for the other out-of-order glyph at the start');
  assert.deepEqual(step(2, ring), { step: 0, event: 'reset' }, 'an earlier glyph after two are lit resets too');
  for (const hit of [undefined, ring, triangle, square]) {
    assert.deepEqual(step(3, hit), { step: 3, event: 'none' }, `step 3 stays complete (hit ${hit})`);
  }
  const events = [];
  let current = 0;
  for (const hit of [ring, ring, triangle, triangle, square, square]) {
    const result = step(current, hit);
    events.push(result.event);
    current = result.step;
  }
  assert.deepEqual(events, ['progress', 'none', 'progress', 'none', 'done', 'none'],
    'a full run stands on each glyph for several frames and only the entries count');
});

controllerCase('ink_glyphs_hit_their_feet_and_sit_on_walkable_corridor_floor', () => {
  assert.deepEqual(PATH_INK_ORDER, ['ring', 'triangle', 'square'], 'the order is ring, triangle, square');
  assert.deepEqual(PATH_INK_GLYPHS.map((glyph) => glyph.id).sort(), [...PATH_INK_ORDER].sort(),
    'every glyph has exactly one place in the order');
  const leftToRight = [...PATH_INK_GLYPHS].sort((a, b) => a.x - b.x).map((glyph) => glyph.id);
  assert.notDeepEqual(leftToRight, [...PATH_INK_ORDER], 'the order is deliberately not left to right');
  for (const glyph of PATH_INK_GLYPHS) {
    const label = `${glyph.id} (${glyph.x},${glyph.y})`;
    assert.equal(pointInRect(glyph, PATH_INK_CORRIDOR), true, `${label} lies inside the ink corridor`);
    const center = { x: glyph.x, y: glyph.y - PATH_BODY.feetY };
    assert.equal(isPathPositionSafe('ink', center), true, `${label}: the foot position is walkable floor`);
    assert.equal(pathInkGlyphAt(center), glyph.id, `${label}: standing on it hits it`);
    assert.equal(pathInkGlyphAt({ x: center.x, y: center.y + PATH_INK_HIT_RADIUS }), glyph.id, `${label}: a foot ${PATH_INK_HIT_RADIUS}px away still hits`);
    assert.equal(pathInkGlyphAt({ x: center.x, y: center.y + PATH_INK_HIT_RADIUS + 1 }), undefined, `${label}: a foot 13px away misses`);
    assert.equal(pathInkGlyphAt({ x: center.x + PATH_INK_HIT_RADIUS + 1, y: center.y }), undefined, `${label}: sideways 13px misses`);
  }
  for (const a of PATH_INK_GLYPHS) {
    for (const b of PATH_INK_GLYPHS) {
      if (a === b) continue;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 24, `${a.id} and ${b.id} are at least 24px apart`);
    }
  }
  assert.equal(pathInkGlyphAt({ x: 0, y: 0 }), undefined, 'a point far from every glyph hits nothing');
});

controllerCase('ink_glyphs_are_avoidable_and_the_straight_walk_never_hits_one', () => {
  const centreOf = (foot) => ({ x: foot.x, y: foot.y - PATH_BODY.feetY });
  const walkable = (foot) => isPathPositionSafe('ink', centreOf(foot));
  // Straight along the corridor centre line (foot y 242), end to end: no glyph is ever touched.
  for (let x = PATH_INK_CORRIDOR.x + 8; x <= PATH_INK_CORRIDOR.x + PATH_INK_CORRIDOR.width - 8; x += 2) {
    assert.equal(walkable({ x, y: 242 }), true, `the centre line is walkable at x=${x}`);
    assert.equal(pathInkGlyphAt(centreOf({ x, y: 242 })), undefined, `walking the centre line at x=${x} touches no glyph`);
  }
  // Lanes: the upper lane (foot y 228) holds ring and square, the lower lane (foot y 256) the triangle, so
  // each glyph can be stepped on or avoided by choosing a lane. Both lanes must be walkable end to end.
  const laneHits = (y) => {
    const hits = [];
    for (let x = PATH_INK_CORRIDOR.x + 8; x <= PATH_INK_CORRIDOR.x + PATH_INK_CORRIDOR.width - 8; x += 2) {
      assert.equal(walkable({ x, y }), true, `lane y=${y} is walkable at x=${x}`);
      const hit = pathInkGlyphAt(centreOf({ x, y }));
      if (hit && hits[hits.length - 1] !== hit) hits.push(hit);
    }
    return hits;
  };
  assert.deepEqual(laneHits(228), ['square', 'ring'], 'the upper lane crosses square then ring, in that order along the corridor');
  assert.deepEqual(laneHits(256), ['triangle'], 'the lower lane crosses only the triangle');
  // The route that solves the puzzle exists without stepping on a wrong glyph: ring (upper lane), then the
  // lower lane west to the triangle, then up to the square.
  let step = 0;
  const route = [{ x: 440, y: 228 }, { x: 440, y: 242 }, { x: 400, y: 252 }, { x: 340, y: 252 }, { x: 290, y: 252 }, { x: 250, y: 256 },
    { x: 270, y: 242 }, { x: 320, y: 236 }, { x: 340, y: 228 }];
  const events = [];
  for (const foot of route) {
    assert.equal(walkable(foot), true, `route point (${foot.x},${foot.y}) is walkable`);
    const result = advancePathInkSequence(step, pathInkGlyphAt(centreOf(foot)));
    step = result.step;
    if (result.event !== 'none') events.push(result.event);
  }
  assert.deepEqual(events, ['progress', 'progress', 'done'], 'the lane route lights ring, triangle, square with no reset');
});

controllerCase('ink_guide_points_at_what_the_current_step_needs', () => {
  const artCentre = (id) => {
    const art = getPathElementArtRect(elementOf('ink', id));
    return { x: art.x + art.width / 2, y: art.y + art.height / 2 };
  };
  const base = { latchB: false, hasPowerC: false, inkRevealed: false, orderKnown: false, seals: false, step: 0,
    latchC: false, memo: false, lanternOn: false, reunited: false };
  const at = (overrides) => pathInkGuideTarget({ ...base, ...overrides });
  assert.deepEqual(at({}), artCentre('latch-b'), 'step 1 points at latch B');
  assert.deepEqual(at({ latchB: true }), artCentre('call-c'), 'step 2 points at the left call post');
  assert.deepEqual(at({ latchB: true, orderKnown: true }), { x: 192, y: 242 },
    'once Lumo has held C the call is done: the next step is the corridor, even with Lumo away');
  assert.deepEqual(at({ latchB: true, hasPowerC: true }), { x: 192, y: 242 }, 'step 3 points at the corridor entrance');
  const lit = { latchB: true, hasPowerC: true, inkRevealed: true, orderKnown: true };
  assert.deepEqual(at({ ...lit, step: 0 }), { x: 440, y: 228 }, 'step 4 points at the ring first');
  assert.deepEqual(at({ ...lit, step: 1 }), { x: 250, y: 256 }, 'then at the triangle');
  assert.deepEqual(at({ ...lit, step: 2 }), { x: 340, y: 228 }, 'then at the square');
  assert.equal(at({ ...lit, lanternOn: true }), undefined, 'with the lantern on the glyphs are hidden, so nothing is pointed at');
  assert.equal(at({ latchB: true, hasPowerC: true, inkRevealed: true, orderKnown: false }), undefined, 'an unknown order has no glyph to point at');
  assert.deepEqual(at({ ...lit, seals: true, latchC: false, hasPowerC: true }), artCentre('latch-c'), 'step 5 points at latch C');
  assert.deepEqual(at({ ...lit, seals: true, latchC: false, hasPowerC: false }), artCentre('call-c'), 'step 5 calls Lumo back to C first when he is away');
  assert.deepEqual(at({ ...lit, seals: true, latchC: true, memo: false }), artCentre('spiral'), 'step 5 then points at the spiral');
  assert.deepEqual(at({ ...lit, seals: true, latchC: true, memo: true, reunited: false }), artCentre('latch-c'), 'step 6 points at latch C to recall Lumo');
  assert.deepEqual(at({ ...lit, seals: true, latchC: true, memo: true, reunited: true }), { x: 574, y: 188 }, 'step 6 then points at the door C stand');
});

controllerCase('ink_objective_names_the_current_step_out_of_six', () => {
  const at = { x: 300, y: 240 };
  const SEALED = { 'l4-latch-b': true, 'l4-ink-revealed': true, 'l4-ink-order-known': true, 'l4-ink-seals': true };
  const LIT = { 'l4-latch-b': true, 'l4-ink-revealed': true, 'l4-ink-order-known': true };
  const EXIT = { ...SEALED, 'l4-latch-c': true, 'l4-memo': true };
  const cases = [
    ['1/6 Gọi Lumo tới ấn B: nhấn E ở chốt B, rồi gài chốt.', {}, {}],
    ['1/6 Gài chốt B: nhấn E ở chốt cạnh cửa B.', {}, { power: { b: true }, assignment: 'b', lumoRoom: 'relay' }],
    ['2/6 Gọi Lumo tới ấn C: nhấn E ở mốc có nhãn C (bên trái).', { 'l4-latch-b': true }, {}],
    ['2/6 Lumo đang tới ấn C. Chờ cậu ấy tới nơi.', { 'l4-latch-b': true }, { assignment: 'c', travelling: true }],
    ['3/6 Tắt đèn bằng F rồi bước vào hành lang để thấy vệt mực.', { 'l4-latch-b': true }, { power: { c: true } }],
    ['4/6 Chờ Lumo tới ấn C: cậu ấy sẽ cho biết thứ tự dấu mực.', { 'l4-latch-b': true, 'l4-ink-revealed': true }, { power: { c: true } }],
    ['4/6 Bước lên ba dấu mực theo thứ tự: vòng → tam giác → vuông (đã sáng 0/3).', LIT, {}],
    ['4/6 Bước lên ba dấu mực theo thứ tự: vòng → tam giác → vuông (đã sáng 2/3).', LIT, { counters: { 'l4-ink-step': 2 } }],
    ['4/6 Tắt đèn (F) để thấy ba dấu mực.', LIT, { lanternOn: true }],
    ['5/6 Gài chốt cửa ra ở đầu hành lang (nhấn E), rồi đọc vết xoắn.', SEALED, { power: { c: true } }],
    ['5/6 Gọi Lumo tới ấn C lại, rồi gài chốt cửa ra.', SEALED, {}],
    ['5/6 Đọc vết xoắn trên tường để giữ lại mảnh ký ức.', { ...SEALED, 'l4-latch-c': true }, {}],
    ['6/6 Nhấn E ở tay gọi C để gọi Lumo về, rồi chờ cậu ấy tới gần.', EXIT, { assignment: 'c' }],
    ['6/6 Lumo đã về tới nơi. Chờ cậu ấy tới gần Nhinh rồi lên tháp.', EXIT, {}],
    ['6/6 Tới bậc thang và nhấn E.', EXIT, { reunited: true }],
  ];
  for (const [expected, flags, options] of cases) {
    const { counters = {}, ...rest } = options;
    const scene = makePathScene('ink', flags, { player: at, ...rest, progress: { flags: { ...flags }, counters } });
    assert.equal(scene.getObjectiveText(), expected, `objective for ${JSON.stringify(flags)} ${JSON.stringify(options)}`);
    assert.match(scene.getObjectiveText(), /^[1-6]\/6 /, 'every ink objective leads with its step number');
  }
});

controllerCase('the_C_threshold_answers_the_door_prompt_only_while_latched', () => {
  // RULE_GAMES §1/§3: inside door C's open threshold the door prompt answers once C is latched, and is silent and
  // walled while C is shut. The shipped door gate must pass the latch state through, not just the layout predicate.
  const point = { x: 563, y: 156 };
  const latched = makePathScene('ink', { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true }, { player: point });
  assert.equal(latched.doorApproach('c', point.x, point.y), true, 'the open threshold is a room-side door position');
  assert.equal(latched.doorPrompt('c'), 'E · Lên tháp', 'the exit door prompt shows inside the open threshold');
  assert.equal(latched.doorEnabled('c'), true, 'and E there is enabled');
  const shut = { a: true, b: true, c: false, practice: false };
  assert.equal(actor('ink', point, shut), false, 'a shut C threshold is a wall for the foot body');
  const closed = makePathScene('ink', { 'l4-latch-a': true, 'l4-latch-b': true }, { player: point });
  assert.equal(closed.doorApproach('c', point.x, point.y), false, 'the shipped door gate is silent while C is shut');
  assert.equal(closed.doorPrompt('c'), null, 'no exit prompt while C is shut');
  assert.equal(closed.doorEnabled('c'), false, 'the exit door is disabled while C is shut');
  closed.useDoor('c');
  assert.equal(closed.said.length, 0, 'E there speaks nothing and runs nothing');
});

controllerCase('the_exit_latch_waits_for_the_lit_glyphs_then_latches', () => {
  const reach = inReachPoint('ink', elementOf('ink', 'latch-c'));
  const scene = makePathScene('ink', { 'l4-latch-b': true, 'l4-ink-revealed': true }, { player: reach, power: { c: true } });
  scene.interact('latch-c');
  assert.equal(scene.progress.flags['l4-latch-c'], undefined, 'the exit stays shut before the glyphs are lit');
  assert.equal(saidText(scene), 'Chốt này còn khóa. Ba dấu mực trong hành lang phải sáng theo đúng thứ tự.',
    'the exit names the glyphs as the missing step');
  scene.progress.flags['l4-ink-seals'] = true;
  scene.interact('latch-c');
  assert.equal(scene.progress.flags['l4-latch-c'], true, 'the same handle latches once the glyphs are lit');
  assert.deepEqual(scene.said.at(-1), controllerConstant('MEMORY'), 'and the memory plays at the hold, as before');
});

controllerCase('an_old_save_with_the_exit_latch_normalizes_to_solved_glyphs', () => {
  const normalize = (flags, counters) => {
    const scene = makePathScene('ink', flags, { progress: { flags: { ...flags }, counters: { ...counters } } });
    scene.normalizeProgress = compile('normalizeProgress', [], { PATH_INK_ORDER });
    scene.normalizeProgress();
    return scene.progress;
  };
  const exitHeld = normalize({ 'l4-latch-b': true, 'l4-latch-c': true }, { 'l4-ink-step': 1.6 });
  assert.equal(exitHeld.flags['l4-ink-revealed'], true, 'an old exit latch implies the corridor was seen');
  assert.equal(exitHeld.flags['l4-ink-order-known'], true, 'and the order was learned');
  assert.equal(exitHeld.flags['l4-ink-seals'], true, 'and the seals are set, so the exit is never stuck');
  assert.equal(exitHeld.counters['l4-ink-step'], 3, 'the step is 3 whatever the old counter said');
  assert.equal(normalize({ 'l4-latch-b': true, 'l4-ink-seals': true }, { 'l4-ink-step': 1 }).counters['l4-ink-step'], 3,
    'seals alone force step 3');
  assert.equal(normalize({ 'l4-latch-b': true }, { 'l4-ink-step': 9 }).counters['l4-ink-step'], 3, 'a counter above 3 clamps to 3');
  assert.equal(normalize({ 'l4-latch-b': true }, { 'l4-ink-step': -2 }).counters['l4-ink-step'], 0, 'a negative counter clamps to 0');
  assert.equal(normalize({ 'l4-latch-b': true }, { 'l4-ink-step': 1.9 }).counters['l4-ink-step'], 1, 'a fraction floors to a whole step');
  assert.equal(normalize({ 'l4-latch-b': true }, { 'l4-ink-step': Number.NaN }).counters['l4-ink-step'], 0, 'NaN reads as no progress');
  assert.equal(normalize({ 'l4-latch-b': true }, {}).counters['l4-ink-step'], 0, 'a save with no glyph counter starts at 0');
});

controllerCase('the_glyph_order_is_learned_from_plate_C_in_any_room', () => {
  // Lumo holds plate C while Nhinh is elsewhere: the flag is set, and no beat plays outside the ink room.
  const elsewhere = inkPuzzleScene({ 'l4-latch-b': true }, { power: { c: true } });
  elsewhere.scene.room = 'entry';
  inkFrame(elsewhere.scene, CLEAR_FOOT, 0);
  assert.equal(elsewhere.scene.progress.flags['l4-ink-order-known'], true, 'Lumo on plate C teaches the order from another room');
  assert.equal(elsewhere.scene.said.length, 0, 'the order beat is not spoken outside the ink room');

  // In the ink room with dialogue busy: the flag is set at once and does not wait for the beat.
  const busy = inkPuzzleScene({ 'l4-latch-b': true }, { power: { c: true } });
  busy.scene.canStartStory = () => false;
  inkFrame(busy.scene, CLEAR_FOOT, 0);
  assert.equal(busy.scene.progress.flags['l4-ink-order-known'], true, 'the flag never waits for the beat to finish');
  assert.equal(busy.scene.pendingStoryBeats.length, 1, 'the order beat waits while dialogue is busy');
  busy.scene.canStartStory = () => true;
  busy.scene.flushPendingStoryBeat();
  assert.deepEqual(busy.scene.said.at(-1), controllerConstant('INK_ORDER_LINES'), `the approved-in-spirit order beat plays once (${saidText(busy.scene)})`);
  inkFrame(busy.scene, CLEAR_FOOT, 100);
  assert.equal(busy.scene.said.length, 1, 'and it is not repeated');
});

controllerCase('unknown_order_ignores_the_glyphs_and_hints_at_most_once_per_4s', () => {
  const ring = glyphFoot('ring');
  const s = inkPuzzleScene({ 'l4-latch-b': true, 'l4-ink-revealed': true }, { now: 10000 });
  inkFrame(s.scene, ring, 10000);
  assert.equal(s.scene.progress.counters['l4-ink-step'] ?? 0, 0, 'no step is recorded before the order is known');
  assert.equal(s.texts.length, 1, 'stepping on a glyph in the dark shows one hint');
  assert.equal(s.texts[0].value, 'Chưa biết thứ tự. Nhờ Lumo tới ấn C xem.', 'the hint names the missing step');
  inkFrame(s.scene, CLEAR_FOOT, 10500);
  inkFrame(s.scene, ring, 11000);
  assert.equal(s.texts.length, 1, 'a re-entry within 4 seconds shows nothing new');
  inkFrame(s.scene, CLEAR_FOOT, 14000);
  inkFrame(s.scene, ring, 15000);
  assert.equal(s.texts.length, 2, 'after 4 seconds the hint can show again');
  assert.equal(s.scene.progress.counters['l4-ink-step'] ?? 0, 0, 'and still no progress');
});

controllerCase('the_three_glyphs_seal_the_exit_in_order_with_the_lantern_off', () => {
  const s = inkPuzzleScene({ 'l4-latch-b': true, 'l4-ink-revealed': true, 'l4-ink-order-known': true }, { lantern: true });
  const { scene } = s;
  inkFrame(scene, glyphFoot('ring'), 100);
  assert.equal(scene.progress.counters['l4-ink-step'] ?? 0, 0, 'with the lantern on the glyphs do not count');
  assert.equal(s.texts.length, 0, 'and show nothing');
  scene.lanternOn = false;
  inkFrame(scene, CLEAR_FOOT, 200);
  inkFrame(scene, glyphFoot('ring'), 300);
  assert.equal(scene.progress.counters['l4-ink-step'], 1, 'the ring lights in the dark');
  inkFrame(scene, glyphFoot('ring'), 400);
  assert.equal(scene.progress.counters['l4-ink-step'], 1, 'standing on it does not light or reset again');
  inkFrame(scene, glyphFoot('triangle'), 500);
  assert.equal(scene.progress.counters['l4-ink-step'], 2, 'the triangle is next');
  inkFrame(scene, glyphFoot('square'), 600);
  assert.equal(scene.progress.counters['l4-ink-step'], 3, 'the square completes the sequence');
  assert.equal(scene.progress.flags['l4-ink-seals'], true, 'the seals are set');
  assert.deepEqual(scene.said.at(-1), controllerConstant('INK_SEALED_LINES'), 'and Nhinh says the one line');
  assert.deepEqual(s.texts.map((text) => text.value), ['Sáng lên!', 'Sáng lên!', 'Sáng lên!'], 'each light pops a floating line');
  inkFrame(scene, glyphFoot('ring'), 700);
  assert.equal(scene.progress.counters['l4-ink-step'], 3, 'a finished sequence stays finished');

  // Saved and loaded again: the normalised progress keeps the solved state.
  const reloaded = makePathScene('ink', {}, { progress: JSON.parse(JSON.stringify(scene.progress)) });
  reloaded.normalizeProgress = compile('normalizeProgress', [], { PATH_INK_ORDER });
  reloaded.normalizeProgress();
  assert.equal(reloaded.progress.flags['l4-ink-seals'], true, 'the seals survive a save and load');
  assert.equal(reloaded.progress.counters['l4-ink-step'], 3, 'and so does the completed step');
});

controllerCase('a_wrong_glyph_resets_the_sequence_and_says_so', () => {
  const s = inkPuzzleScene({ 'l4-latch-b': true, 'l4-ink-revealed': true, 'l4-ink-order-known': true },
    { counters: { 'l4-ink-step': 1 } });
  const { scene } = s;
  const lit = () => scene.inkGlyphs.calls.filter((call) => call[0] === 'fillCircle' || call[0] === 'fillTriangle' || call[0] === 'fillRect');
  assert.equal(lit().length, 1, 'the ring is drawn filled from the saved step');
  inkFrame(scene, glyphFoot('square'), 100);
  assert.equal(scene.progress.counters['l4-ink-step'], 0, 'the square out of order resets the sequence');
  assert.equal(s.texts.at(-1).value, 'Vết mực nhòe đi. Thử lại từ đầu.', 'the reset says so, without a dialogue box');
  assert.equal(scene.said.length, 0, 'no dialogue opens for a reset');
  assert.equal(lit().length, 0, 'every glyph is drawn un-filled again');
});

controllerCase('ink_glyphs_fill_only_when_lit_and_show_only_in_the_dark', () => {
  const s = inkPuzzleScene({ 'l4-latch-b': true, 'l4-ink-revealed': true, 'l4-ink-order-known': true }, { counters: { 'l4-ink-step': 1 } });
  const { scene } = s;
  assert.equal(scene.inkGlyphs.visible, true, 'the glyphs show while the lantern is off');
  const fills = scene.inkGlyphs.calls.filter((call) => ['fillCircle', 'fillTriangle', 'fillRect'].includes(call[0]));
  assert.deepEqual(fills.map((call) => call.slice(0, 2)), [['fillCircle', 440]], 'only the ring, the first glyph, is filled');
  scene.lanternOn = true;
  scene.refreshInkGlyphs();
  assert.equal(scene.inkGlyphs.visible, false, 'the glyphs are hidden while the lantern is on');
  scene.lanternOn = false;
  scene.refreshInkGlyphs();
  assert.equal(scene.inkGlyphs.visible, true, 'and shown again when it goes off');
});

controllerCase('the_guide_ring_follows_the_step_and_only_draws_in_the_ink_room', () => {
  const s = inkPuzzleScene({}, {});
  const ringAt = () => {
    const last = s.scene.inkGuide.calls.filter((call) => call[0] === 'strokeCircle').at(-1);
    return s.scene.inkGuide.visible && last ? last.slice(1) : null;
  };
  const centreOf = (id) => {
    const art = getPathElementArtRect(elementOf('ink', id));
    return [art.x + art.width / 2, art.y + art.height / 2, 14];
  };
  inkFrame(s.scene, CLEAR_FOOT, 0);
  assert.deepEqual(ringAt(), centreOf('latch-b'), 'step 1: the ring is round latch B');
  s.scene.progress.flags['l4-latch-b'] = true;
  inkFrame(s.scene, CLEAR_FOOT, 10);
  assert.deepEqual(ringAt(), centreOf('call-c'), 'step 2: the ring moves to the call post for C');
  s.scene.power.c = true;
  inkFrame(s.scene, CLEAR_FOOT, 20);
  assert.deepEqual(ringAt(), [192, 242, 14], 'step 3: the ring is at the corridor entrance');
  s.scene.progress.flags['l4-ink-revealed'] = true;
  s.scene.progress.flags['l4-ink-order-known'] = true;
  inkFrame(s.scene, CLEAR_FOOT, 30);
  assert.deepEqual(ringAt(), [440, 228, 14], 'step 4: the ring is on the first glyph');
  s.scene.lanternOn = true;
  inkFrame(s.scene, CLEAR_FOOT, 40);
  assert.equal(ringAt(), null, 'with the lantern on there is no glyph to show, so the ring is hidden');
  assert.equal(s.tweens.length, 1, 'the guide pulses on one tween, created by the ink room build');
  assert.equal(s.tweens[0].targets, s.scene.inkGuide, 'and that tween belongs to the guide object');
});

// One summary, one exit code. A failing case is named here and turns the run red: `14/15 passed`
// followed by exit 0 would gate nothing.
console.log(`\nlevel 05 cases: ${controllerCaseCount - controllerFailures.length}/${controllerCaseCount} passed`);
if (controllerFailures.length) {
  console.log(`failed: ${controllerFailures.join(', ')}`);
  process.exit(1);
}
console.log('Level 05 geometry/state checks passed.');
