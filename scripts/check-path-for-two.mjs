import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { buildPathSchematic, choosePathCallAction, getPathBackArrival, getPathControlStand, getPathDoorFace, getPathDoorPassage, getPathElementArtRect, getPathElementSolid, getPathExitBlock, getPathLocalLeg, getPathPipePoint, getPathRouteLine, hasDoorPower, isActuallyReunited, isInsidePracticeAlcove, isNearPathPipeEndpoint, isPathApproachAllowed, isPathDoorApproachAllowed, isPathInteractHeld, isPathPositionSafe, isPathRouteValid, isPathSeal, isPathThresholdOccupied, isValidPathPipeHop, nearestSafePathSpawn, parsePathRoute, pathActorBody, pathDoorShouldClose, pathPolylineLength, pathRouteCableSegments, pathRouteCorners, pathRoutePoints, PATH_BACK_ARRIVAL_OFFSET, PATH_BODY, PATH_CHECKPOINTS, PATH_CONTROL_STANDS, PATH_DOORS, PATH_ELEMENT_RADIUS, PATH_FLOOR_BOUNDS, PATH_INK_CORRIDOR, PATH_ROOMS, PATH_ROUTE_LINES, PATH_SCHEMATIC, PATH_SCHEMATIC_ORDER, PATH_SCHEMATIC_SIZE, PATH_PIPE_ENDPOINTS, PATH_TUBE_MOUTHS, rectsOverlap, resolvePathRoom, shouldRebuildLegacyPathAssignment, shouldRecoverPathFollower, shouldRestorePathFollower, shouldRoutePathFollower } from '../src/data/pathForTwoLayout.ts';

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
assert.deepEqual(getPathBackArrival('a'),{x:480,y:250},'returning through A lands beside its entry face, not the far room spawn');
assert.deepEqual(getPathBackArrival('b'),{x:480,y:250},'returning through B lands beside its relay face, not the far room spawn');
assert.equal(actor('entry',getPathBackArrival('a'),{a:false,b:false,c:false,practice:false}),true,'A return arrival is walkable entry floor while the door is closed');
assert.equal(actor('relay',getPathBackArrival('b'),{a:true,b:false,c:false,practice:false}),true,'B return arrival is walkable relay floor while the door is closed');
assert.equal(reach('entry',PATH_ROOMS.entry.spawn,getPathBackArrival('a'),{a:false,b:false,c:false,practice:false}),true,'A return arrival stays connected to the entry hall');
assert.equal(reach('relay',PATH_ROOMS.relay.spawn,getPathBackArrival('b'),{a:true,b:false,c:false,practice:false}),true,'B return arrival stays connected to the relay hall');
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
assert.equal(reach('ink',PATH_ROOMS.ink.spawn,PATH_ROOMS.ink.elements.find(e=>e.id==='call-b-far').stand),true,'B entrance reaches the far-side recovery call');
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
    ...extra,
  };
  scene.stand = (x, y) => { scene.player.x = x; scene.player.y = y; };
  scene.say = (lines) => scene.said.push(lines);
  scene.save = () => { scene.saved += 1; };
  scene.hasPower = (mark) => scene.power[mark] === true;
  scene.isTravelling = () => scene.travelling;
  scene.isActuallyReunited = () => scene.reunited;
  scene.thresholdOccupied = (id) => scene.thresholds[id] === true;
  scene.isDoorOpen = (mark) => scene.power[mark] === true;
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
  scene.elementApproach = compile('elementApproach', ['id', 'x', 'y'], { PATH_ROOMS, isPathApproachAllowed });
  scene.doorApproach = compile('doorApproach', ['id', 'x', 'y'], { isPathDoorApproachAllowed });
  scene.doorPrompt = compile('doorPrompt', ['id'], {});
  scene.doorEnabled = compile('doorEnabled', ['id'], {});
  scene.callMark = compile('callMark', ['id'], {});
  scene.callEligible = compile('callEligible', ['mark'], {});
  scene.latchCBlockReason = compile('latchCBlockReason', [], {});
  scene.interactionEnabled = compile('interactionEnabled', ['id'], {});
  scene.prompt = compile('prompt', ['id'], { PLATE_ROOMS: controllerConstant('PLATE_ROOMS'), choosePathCallAction });
  scene.interact = compile('interact', ['id'], { MEMORY: controllerConstant('MEMORY'), choosePathCallAction });
  scene.getObjectiveText = compile('getObjectiveText', [], { PATH_ROOMS, getPathExitBlock, isInsidePracticeAlcove, pathDoorShouldClose });
  scene.useDoor = compile('useDoor', ['id'], { getPathExitBlock, getPathBackArrival });
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
  scene.send = compile('send', ['mark'], {});
  scene.recallToCall = compile('recallToCall', ['id'], {});
  scene.isPairedPipeHop = compile('isPairedPipeHop', ['target'], { isValidPathPipeHop, isNearPathPipeEndpoint });
  scene.cancelInvalidRoute = compile('cancelInvalidRoute', [], {});
  scene.completeRoute = compile('completeRoute', ['room'], {});
  scene.queueStoryBeat = compile('queueStoryBeat', ['lines', 'onComplete'], {});
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

/** The four authored contacts of a standing prop, plus its own stand. */
function fourSides(element) {
  return {
    north: { x: element.x, y: element.y - element.height - PATH_BODY.feetY },
    east: { x: element.x + element.width / 2 + 6, y: element.y - element.height / 2 - 16 },
    south: { x: element.stand.x, y: element.stand.y },
    west: { x: element.x - element.width / 2 - 6, y: element.y - element.height / 2 - 16 },
  };
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
  const scene = bindTravelPipeline(makePathScene('entry', {}, { player: { x: 76, y: 268 } }));
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
  scene.stand(244, 150);
  assert.equal(isPathThresholdOccupied('entry', 'practice', { x: 244, y: 150 }), true,
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
  const scene = makePathScene('entry', {}, { player: { x: 384, y: 256 } });
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

controllerCase('the_C_handle_answers_before_the_ink_is_found', () => {
  const scene = makePathScene('ink', { 'l4-latch-b': true }, { player: { x: 550, y: 218 } });
  assert.equal(scene.interactionEnabled('latch-c'), true, 'the exit handle answers in its own room before the ink');
  assert.equal(scene.prompt('latch-c'), 'E · Gài chốt cửa ra', 'the handle advertises its action');
  scene.interact('latch-c');
  assert.equal(scene.progress.flags['l4-latch-c'], undefined, 'an early E never latches the exit');
  assert.equal(scene.said.length, 1, 'an early E gives exactly one inspection line');
  const text = saidText(scene);
  assert.ok(text.includes('F'), `the line names the lantern key (${text})`);
  assert.ok(text.includes('vạch mực'), `the line names the ink trail to walk (${text})`);
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

controllerCase('every_standing_prop_answers_only_from_its_own_face', () => {
  const flags = { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true, 'l4-ink-revealed': true };
  let advertised = 0;
  for (const roomId of ['entry', 'relay', 'ink']) {
    const scene = makePathScene(roomId, flags);
    for (const element of PATH_ROOMS[roomId].elements) {
      if (isPathSeal(element)) continue;
      const id = element.id;
      let face = 0;
      for (const point of legalDisc(roomId, element.stand, PATH_ELEMENT_RADIUS)) {
        scene.stand(point.x, point.y);
        const allowed = isPathApproachAllowed(roomId, element, point);
        assert.equal(scene.elementApproach(element.id, point.x, point.y), allowed,
          `${roomId}/${element.id}: the shipped approach helper agrees with the layout predicate at (${point.x},${point.y})`);
        if (allowed) {
          face += 1;
          advertised += 1;
          continue;
        }
        // Outside its own face the control must already be silent, disabled, and refuse the press.
        assert.equal(scene.prompt(id), null,
          `${roomId}/${element.id} advertises nothing at (${point.x},${point.y})`);
        assert.equal(scene.interactionEnabled(id), false,
          `${roomId}/${element.id} is disabled at (${point.x},${point.y})`);
        const before = JSON.stringify(scene.progress.flags) + scene.sent.length + scene.said.length + scene.recalled;
        scene.interact(id);
        assert.equal(JSON.stringify(scene.progress.flags) + scene.sent.length + scene.said.length + scene.recalled, before,
          `${roomId}/${element.id} refuses E at (${point.x},${point.y})`);
      }
      assert.ok(face > 0, `${roomId}/${element.id} still owns a usable south face (${face} legal positions)`);
      scene.stand(element.stand.x, element.stand.y);
      assert.ok(isPathApproachAllowed(roomId, element, element.stand), `${roomId}/${element.id} authored stand is on its face`);
      assert.notEqual(scene.prompt(id), null, `${roomId}/${element.id} advertises at its authored stand`);
    }
  }
  assert.ok(advertised > 400, `the face rule still leaves plenty of usable positions (${advertised})`);
  console.log(`      L05 faces: ${advertised} legal standing positions advertise the control whose face they are on`);
});

controllerCase('the_four_sides_of_every_standing_prop_are_quiet', () => {
  const quiet = [];
  for (const roomId of ['entry', 'relay', 'ink']) {
    const scene = makePathScene(roomId, { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-ink-revealed': true });
    for (const element of PATH_ROOMS[roomId].elements) {
      if (isPathSeal(element)) continue;
      const id = element.id;
      const sides = fourSides(element);
      // RULE_GAMES §1: a standing prop answers from its own south face and nowhere else.
      //
      // The swirl engraving is the documented §3 wall exception: it is scratched into the east wall,
      // so it has no walkable south face and answers from the floor in front of that wall face —
      // which, for an east-wall element, is this helper's `west` contact. `fourSides()` describes a
      // standing prop, so that one contact is the engraving's face rather than a side to be quiet;
      // its own case (`the_spiral_engraving_sits_on_the_wall_with_a_reachable_stand`) asserts that
      // face and that it is silent from above. Every other contact, including the engraving's, must
      // still be silent and disabled here.
      const faceSide = element.approach === 'side' ? 'west' : 'south';
      for (const side of ['north', 'east', 'west']) {
        if (side === faceSide) continue;
        const point = sides[side];
        scene.stand(point.x, point.y);
        const label = `${roomId}/${element.id} ${side} (${point.x},${point.y})`;
        assert.equal(scene.prompt(id), null, `${label}: no prompt from this side`);
        assert.equal(scene.interactionEnabled(id), false, `${label}: disabled from this side`);
        assert.equal(isPathApproachAllowed(roomId, element, point), false, `${label}: the face rule refuses it`);
        if (actor(roomId, point)) quiet.push(`${label} walkable`);
        else quiet.push(`${label} masonry`);
      }
      const face = sides[faceSide];
      scene.stand(face.x, face.y);
      assert.notEqual(scene.prompt(id), null, `${roomId}/${element.id} ${faceSide} face answers`);
      assert.equal(isPathApproachAllowed(roomId, element, face), true,
        `${roomId}/${element.id} ${faceSide} face is the authored approach of the layout predicate`);
      if (element.approach === 'side') {
        assert.equal(actor(roomId, face), true, `${roomId}/${element.id} answers from walkable floor, not masonry`);
      }
    }
  }
  console.log(`      L05 four sides: ${quiet.length} contacts checked quiet (the authored face answers on every prop)`);
});

controllerCase('door_controls_answer_only_from_their_own_room_side', () => {
  let domains = 0;
  for (const stand of PATH_CONTROL_STANDS) {
    const scene = makePathScene(stand.room, { 'l4-latch-a': true, 'l4-latch-b': true, 'l4-latch-c': true, 'l4-memo': true });
    let usable = 0;
    for (const point of legalDisc(stand.room, stand, stand.radius)) {
      scene.stand(point.x, point.y);
      const allowed = isPathDoorApproachAllowed(stand.room, stand.id, point);
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
    refreshArt: compile('refreshArt', [], { ...symbols, isPathSeal, Phaser: { GameObjects: { Image: RouteImage } } }),
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
    { from: 'entry', door: 'a', to: 'relay', spawn: { x: 110, y: 251 } },
    { from: 'relay', door: 'a', to: 'entry', spawn: getPathBackArrival('a') },
    { from: 'relay', door: 'b', to: 'ink', spawn: { x: 82, y: 251 } },
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

// One summary, one exit code. A failing case is named here and turns the run red: `14/15 passed`
// followed by exit 0 would gate nothing.
console.log(`\nlevel 05 cases: ${controllerCaseCount - controllerFailures.length}/${controllerCaseCount} passed`);
if (controllerFailures.length) {
  console.log(`failed: ${controllerFailures.join(', ')}`);
  process.exit(1);
}
console.log('Level 05 geometry/state checks passed.');
