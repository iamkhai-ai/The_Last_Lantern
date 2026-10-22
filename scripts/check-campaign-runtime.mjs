/**
 * Levels 05-10 — campaign runtime behaviour checks.
 *
 * Run with:  node scripts/check-campaign-runtime.mjs
 *
 * scripts/check-observatory.mjs is a pure check: it drives synthetic world
 * states through the layout predicates, which is exactly why a *missing runtime
 * writer* is structurally invisible to it (review B1: `l8-return-loop-open` had
 * three readers and no writer, and the level could not be finished).
 *
 * This check runs the shipped code instead of a re-implementation of it:
 *
 *  - the arrow function a control hands to register() is pulled out of
 *    src/scenes/CampaignScene.ts with the TypeScript compiler API, keyed by the
 *    control's registry id, and executed against a recording stand-in for the
 *    scene's Phaser ports (say / save / flag writes / display list);
 *  - the shipped buildObservatoryRoom() body itself is run, once per room, so the
 *    registration of the room's own authored controls is proved by execution: a
 *    method that exists but is never called (review: the whole observatory
 *    registered zero controls) fails the room-build case instead of hiding;
 *  - the observatory state, the observatory world state, the completion
 *    predicate and the return-loop strip refresh are the scene's own methods,
 *    extracted the same way and run against that stand-in;
 *  - the campaign frame is the scene's own update() body, extracted the same
 *    way, stepped once per level index against a recording stand-in whose
 *    controller fields mirror the ones buildLevel() really builds.
 *
 * Grepping the scene for `flags['l8-return-loop-open'] = true` cannot pass these
 * cases: only behaviour can. A later task adds one entry to CASES.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  isObservatoryStandingProp,
  observatoryElementSolid,
  observatoryElements,
  observatoryReachOwner,
  observatoryStandingReach,
  OBSERVATORY_ALCOVES,
  OBSERVATORY_BODY,
  OBSERVATORY_RETURN_LOOP_VISUAL_ID,
  OBSERVATORY_ROOT_BED,
  isObservatoryApproachAllowed,
  observatoryBridgeBlockReason,
  observatoryCompletionReady,
  observatoryDoorBlockReason,
  observatoryDoorOpen,
  observatoryElement,
  observatoryFinalDoorBlockReason,
  observatoryGuidance,
  observatoryPrompt,
  observatoryReturnLoopLane,
  observatorySolidRects,
} from '../src/data/observatoryLayout.ts';
import { OBSERVATORY_ROOMS } from '../src/data/observatoryRooms.ts';
import { observatoryPlacedLightVisible } from '../src/data/observatoryLayout.ts';
import { CAMPAIGN_LEVELS } from '../src/data/campaignLevels.ts';
import { isRuinsPositionSafe } from '../src/data/ruinsOfTwoHalvesLayout.ts';
import {
  canReachHeartElement, getHeartElement, getHeartPrerequisiteFeedback, heartFinalActionSource, HEART_CONFIRM_ID, HEART_CORE, HEART_MAT_ID, HEART_SEAL_ID, HEART_SEAL_RADIUS, resolveHeartLumoMode,
} from '../src/data/heartOfElariaLayout.ts';
import { deriveObservatoryState } from '../src/systems/ObservatoryPuzzle.ts';
import {
  OBSERVATORY_BEAT_NO_BEAM, OBSERVATORY_BEAT_ROOTS_LIT, OBSERVATORY_CRYSTAL_LINES, OBSERVATORY_EXIT_LINES,
  OBSERVATORY_OPENING_CORRIDOR, OBSERVATORY_OPENING_ENTRANCE,
} from '../src/data/observatoryStory.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_FILE = join(rootDir, 'src/scenes/CampaignScene.ts');
const sourceFile = ts.createSourceFile(SCENE_FILE, readFileSync(SCENE_FILE, 'utf8'), ts.ScriptTarget.Latest, true);
/**
 * Level 10's controller is a separate class, so its own methods are extracted from its own file. The
 * recall callback lives there, and this is the only place a reload's flag synchronisation is proved
 * against the shipped code rather than a copy of it.
 */
const HEART_FILE = join(rootDir, 'src/levels/HeartOfElariaLevel.ts');
const heartSourceFile = ts.createSourceFile(HEART_FILE, readFileSync(HEART_FILE, 'utf8'), ts.ScriptTarget.Latest, true);

const LANTERN_FILE = join(rootDir, 'src/systems/LanternSystem.ts');
const lanternSourceFile = ts.createSourceFile(LANTERN_FILE, readFileSync(LANTERN_FILE, 'utf8'), ts.ScriptTarget.Latest, true);

const OPEN_LOOP_LINE = 'Lối đá đã khớp vào vòng. Đường về bệ đèn thông suốt ngay cả khi ánh sáng tắt.';

/* ------------------------------------------------------------------ *
 * 1. Extraction: the registered runtime callback, keyed by registry id
 * ------------------------------------------------------------------ */

const nodeText = (node) => node.getText(node.getSourceFile());

function walk(node, visit) {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

function findNode(root, predicate) {
  let found = null;
  walk(root, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}

/** True when a dispatch condition tests the local `id` against one registry id. */
function testsRegistryId(expression, registryId) {
  let matched = false;
  walk(expression, (node) => {
    if (matched || !ts.isBinaryExpression(node)) return;
    if (node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return;
    if (nodeText(node.left) !== 'id' || !ts.isStringLiteral(node.right)) return;
    if (node.right.text === registryId) matched = true;
  });
  return matched;
}

/**
 * The arrow function the scene hands to register() for one authored control.
 * Keyed by the registry id the room data uses, so moving or renaming the
 * dispatch fails with that id instead of silently losing coverage. An id may be
 * shared by one dispatch (`id === 'a' || id === 'b'`).
 */
function registeredCallbackSource(registryId) {
  const dispatch = findNode(sourceFile, (node) => ts.isIfStatement(node) && testsRegistryId(node.expression, registryId));
  assert.ok(dispatch, `CampaignScene still dispatches the ${registryId} control with an \`id === '${registryId}'\` test`);
  const call = findNode(dispatch.thenStatement, (node) => ts.isCallExpression(node) && nodeText(node.expression) === 'register');
  assert.ok(call, `the ${registryId} dispatch still registers its runtime callback with register(...)`);
  const [callback] = call.arguments;
  assert.ok(callback && ts.isArrowFunction(callback), `the ${registryId} control still registers an arrow function`);
  return nodeText(callback);
}

/** One controller method body, so the cases run the shipped state logic. */
function methodSource(methodName, file = sourceFile, owner = 'CampaignScene') {
  const method = findNode(file, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === methodName);
  assert.ok(method, `${owner} still declares ${methodName}()`);
  assert.ok(method.body, `${methodName}() still has a body`);
  return nodeText(method.body);
}

/**
 * Compile extracted scene source into a callable bound to a fake `this`: the
 * source is TypeScript, so it is transpiled first, and every layout symbol the
 * snippet closes over is passed in as a parameter. A method body runs directly;
 * an expression (an arrow callback) is created inside the wrapper so it captures
 * the fake `this` the way it captures the scene at runtime.
 */
function bind(source, symbols, label) {
  // Identity i18n: these cases assert puzzle state and copy, which stay authored in Vietnamese.
  const bound = { tr: (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text), ...symbols };
  const names = Object.keys(bound);
  const values = names.map((name) => bound[name]);
  const isBlock = source.trimStart().startsWith('{');
  const wrapper = isBlock ? `function () ${source}` : `function () { return (${source}); }`;
  let unit;
  try {
    const js = ts.transpileModule(`const __unit = ${wrapper};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...values);
  } catch (error) {
    throw new Error(`could not compile ${label} extracted from CampaignScene.ts: ${error.message}`);
  }
  return isBlock ? (self) => unit.call(self) : (self) => unit.call(self)();
}

/* ------------------------------------------------------------------ *
 * 2. The fake scene: recording ports around the real scene logic
 * ------------------------------------------------------------------ */

const NO_SYMBOLS = {};
/** Layout symbols the extracted snippets close over. */
const CALLBACK_SYMBOLS = { observatoryDoorOpen, observatoryDoorBlockReason, observatoryFinalDoorBlockReason, OBSERVATORY_CRYSTAL_LINES, OBSERVATORY_EXIT_LINES };
const STATE_SYMBOLS = { deriveObservatoryState };
const READY_SYMBOLS = { observatoryCompletionReady };
const STRIP_SYMBOLS = { observatoryDoorOpen, observatoryReturnLoopLane, OBSERVATORY_RETURN_LOOP_VISUAL_ID };

let sceneSources = null;
/** Compiled on first use, so a missing method fails the case that needs it. */
function sources() {
  if (!sceneSources) {
    sceneSources = {
      lumoRoom: bind(methodSource('getObservatoryLumoRoom'), NO_SYMBOLS, 'getObservatoryLumoRoom()'),
      state: bind(methodSource('getObservatoryState'), STATE_SYMBOLS, 'getObservatoryState()'),
      world: bind(methodSource('getObservatoryWorldState'), NO_SYMBOLS, 'getObservatoryWorldState()'),
      ready: bind(methodSource('isObservatoryCompletionReady'), READY_SYMBOLS, 'isObservatoryCompletionReady()'),
      callbacks: new Map(),
    };
  }
  return sceneSources;
}

let loopRefresh = null;
function refreshReturnLoop(scene) {
  if (!loopRefresh) loopRefresh = bind(methodSource('refreshObservatoryReturnLoop'), STRIP_SYMBOLS, 'refreshObservatoryReturnLoop()');
  return loopRefresh(scene);
}

function runRegistered(registryId, scene, symbols = {}) {
  const key = `${registryId}\u0000${Object.keys(symbols).sort().join(',')}`;
  const compiled = sources().callbacks;
  if (!compiled.has(key)) {
    compiled.set(key, bind(registeredCallbackSource(registryId), { ...CALLBACK_SYMBOLS, ...symbols }, `the ${registryId} callback`));
  }
  compiled.get(key)(scene);
}

/** Sound ports the shipped Level 10 bodies call. The checks prove state, not audio, so every port is a no-op. */
const HEART_SOUND = {
  SoundSystem: {
    playUiClick() {}, playLightPulse() {}, playPuzzleSolved() {}, playRuneActivate() {},
    playMirrorRotate() {}, playPuzzleError() {}, playMechanismLatch() {}, playLanternToggle() {},
  },
};

let heartRecall = null;
/**
 * Level 10's recall path — the shipped `callLumoToSeal()` body — run against a fake `this`. The recall
 * branch is the one the reload depends on, so this proves the real flag synchronisation, not a copy.
 */
function runHeartRecall(scene) {
  if (!heartRecall) heartRecall = bind(methodSource('callLumoToSeal', heartSourceFile, 'HeartOfElariaLevel'), HEART_SOUND, 'HeartOfElariaLevel.callLumoToSeal()');
  return heartRecall(scene);
}

let heartDrive = null;
/**
 * The shipped per-frame Lumo driver. The seal only powers on the real arrival, so the arrival itself —
 * the mode flip inside `driveLumo` — is proved against the shipped body rather than a copy of it.
 */
function runHeartDrive(scene) {
  if (!heartDrive) {
    heartDrive = bind(methodSource('driveLumo', heartSourceFile, 'HeartOfElariaLevel'), { Phaser: PHASER_PORTS, dt: 16, HEART_SEAL_RADIUS, ...HEART_SOUND }, 'HeartOfElariaLevel.driveLumo()');
  }
  return heartDrive(scene);
}

/**
 * The free identifiers `interact()` reads on the way to its confirmation-node branch. Its `element`
 * parameter is part of the signature, not the extracted body, so the pressed control comes in as a
 * symbol: this case presses the central confirmation node.
 */
const LATCH_SYMBOLS = {
  HEART_MAT_ID, HEART_SEAL_ID, HEART_CONFIRM_ID, LATCHED_LINES: [], getHeartPrerequisiteFeedback,
  element: { id: HEART_CONFIRM_ID },
  ...HEART_SOUND,
};

let heartLatch = null;
/**
 * Level 10's latch path — the shipped `interact()` body, pressed at the central confirmation node.
 * Latching ends the Lumo assignment the way a recall does, so the flags it clears must be cleared
 * before the save it writes, or a reload resurrects a phantom assignment.
 */
function runHeartLatch(scene) {
  if (!heartLatch) heartLatch = bind(methodSource('interact', heartSourceFile, 'HeartOfElariaLevel'), LATCH_SYMBOLS, 'HeartOfElariaLevel.interact()');
  return heartLatch(scene);
}

/** A chainable stand-in for the one Phaser game object the strip refresh builds. */
function makeStrip(x, y, width, height, texture) {
  return {
    kind: 'tile-sprite',
    name: '',
    destroyed: false,
    x,
    y,
    width,
    height,
    texture,
    setOrigin() { return this; },
    setTint() { return this; },
    setAlpha() { return this; },
    setDepth() { return this; },
    setName(value) { this.name = value; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setSize(nextWidth, nextHeight) { this.width = nextWidth; this.height = nextHeight; return this; },
    destroy() { this.destroyed = true; },
  };
}

/**
 * The scene's display-list port. Anything except a tile sprite is refused, so
 * "the strip refresh never repaints the room background" is enforced, not just
 * asserted: building an image or a graphics object throws inside the case.
 */
function makeAddPort(calls) {
  return new Proxy({}, {
    get(_target, method) {
      return (...args) => {
        calls.added.push(String(method));
        if (method !== 'tileSprite') {
          throw new Error(`refreshObservatoryReturnLoop built a ${String(method)}: it must only manage its own strip`);
        }
        const [x, y, width, height, texture] = args;
        const strip = makeStrip(x, y, width, height, texture);
        calls.strips.push(strip);
        return strip;
      };
    },
  });
}

/** Where Lumo rests while he holds the seal, and the point he is called back to. */
const SEAL_AT = { roomId: 'corridor', x: 320, y: 92 };
const SOURCE_AT = { roomId: 'entrance', x: 188, y: 232 };

/**
 * A recording stand-in for the CampaignScene ports the observatory callbacks
 * touch. The observatory state, the world state and the completion predicate are
 * NOT re-implemented here: they are the scene's own methods, extracted from
 * CampaignScene.ts and run against this object.
 *
 * `ports.add` lets a caller replace the display-list port: the strip cases need
 * the strict one (makeAddPort), a full room build needs the permissive one
 * (makeRoomBuildPort).
 */
function makeScene(seed = {}, ports = {}) {
  const calls = {
    say: [], save: 0, flagWrites: [], refreshedDoors: 0, refreshedLoops: 0,
    refreshedPuzzle: 0, nextLevel: [], memory: 0, lumoRoute: [], added: [], strips: [],
  };
  const flags = new Proxy({ ...(seed.flags ?? {}) }, {
    set(target, key, value) { calls.flagWrites.push({ key, value }); target[key] = value; return true; },
  });
  const scene = {
    progress: { level: 8, flags, counters: { ...(seed.counters ?? {}) }, lanternOn: seed.lanternOn ?? true },
    lantern: {
      lanternPlaced: seed.lanternPlaced ?? false,
      lanternInHand: seed.lanternInHand ?? true,
      lanternOn: seed.lanternOn ?? true,
      placedX: 0,
      placedY: 0,
      placeLanternAt(x, y) { this.lanternPlaced = true; this.lanternInHand = false; this.placedX = x; this.placedY = y; },
      retrieveLantern() { this.lanternPlaced = false; this.lanternInHand = true; },
    },
    lumo: { sprite: { x: SEAL_AT.x, y: SEAL_AT.y, setPosition(x, y) { this.x = x; this.y = y; } } },
    activeObservatoryRoom: seed.roomId === null ? null : seed.roomId ?? 'observatory',
    roomObjects: [],
    observatoryReturnLoopVisual: undefined,
    observatoryElementVisuals: new Map([['balance-crystal', { destroyed: false, destroy() { this.destroyed = true; } }]]),
    observatoryShadowVisual: { alpha: 0.9, setAlpha(value) { this.alpha = value; } },
    calls,
    save() { calls.save += 1; },
    say(lines) { calls.say.push(lines); },
    value(key) { return this.progress.counters[key] ?? 0; },
    /** Repainting door textures and colliders is check-observatory.mjs territory; here it is counted. */
    refreshObservatoryDoors() { calls.refreshedDoors += 1; },
    refreshObservatoryPuzzle() { calls.refreshedPuzzle += 1; },
    refreshObservatoryReturnLoop() { calls.refreshedLoops += 1; refreshReturnLoop(this); },
    nextLevel(lines) { calls.nextLevel.push(lines); },
    playObservatoryMemory() { calls.memory += 1; },
    callObservatoryLumo(destination) {
      calls.lumoRoute.push(destination);
      flags['l8-lumo-destination'] = destination === 'seal' ? 'lumo-seal' : 'lantern-source';
      flags['l8-lumo-arrived'] = '';
      flags['l8-lumo-recalled'] = false;
    },
    /** The world moves on its own: Lumo finishes the route the scene handed him. */
    arriveLumo(roomId, x, y) {
      flags['l8-lumo-room'] = roomId;
      flags['l8-lumo-arrived'] = flags['l8-lumo-destination'];
      flags['l8-lumo-recalled'] = flags['l8-lumo-destination'] === 'lantern-source';
      flags['l8-lumo-route-json'] = '';
      scene.lumo.sprite.x = x;
      scene.lumo.sprite.y = y;
    },
    add: (ports.add ?? makeAddPort)(calls),
  };
  scene.getObservatoryLumoRoom = () => sources().lumoRoom(scene);
  scene.getObservatoryState = () => sources().state(scene);
  scene.getObservatoryWorldState = () => sources().world(scene);
  scene.isObservatoryCompletionReady = () => sources().ready(scene);
  return scene;
}

/* ------------------------------------------------------------------ *
 * 2b. The full room build: the shipped buildObservatoryRoom() body
 * ------------------------------------------------------------------ */

/**
 * The display-list port a whole room build needs. A room build paints text, art,
 * graphics, collider stand-ins and the loop strip, so this one is permissive
 * where makeAddPort is strict — the "the strip refresh builds nothing else"
 * contract is enforced by the strip cases, which use makeAddPort. Every call is
 * recorded, and tile sprites land in the same `calls.strips` list the strip cases
 * read.
 */
function makeRoomBuildPort(calls) {
  const makeObject = () => {
    const object = {
      x: 0, y: 0, width: 0, height: 0, name: '', visible: true, scene: {},
      setOrigin() { return object; },
      setTint() { return object; },
      setAlpha() { return object; },
      setDepth() { return object; },
      setVisible() { return object; },
      setText() { return object; },
      setWordWrapWidth() { return object; },
      setName(value) { object.name = value; return object; },
      setPosition(x, y) { object.x = x; object.y = y; return object; },
      setSize(width, height) { object.width = width; object.height = height; return object; },
      getBounds() { return { x: object.x, y: object.y, width: object.width, height: object.height }; },
      destroy() { object.destroyed = true; },
    };
    return object;
  };
  return new Proxy({}, {
    get(_target, method) {
      return (...args) => {
        calls.added.push(String(method));
        const object = makeObject();
        if (method === 'tileSprite') calls.strips.push(object);
        return object;
      };
    },
  });
}

/**
 * Everything registerObservatoryInteractable() closes over. `item` is the room's
 * own data entry, handed in by the shipped build loop under test — never a list
 * written here.
 */
const REGISTER_SYMBOLS = {
  OBSERVATORY_ROOT_BED,
  isObservatoryApproachAllowed,
  isObservatoryStandingProp,
  observatoryElementSolid,
  observatoryElements,
  observatoryReachOwner,
  observatoryStandingReach,
  observatoryBridgeBlockReason,
  observatoryDoorBlockReason,
  observatoryDoorOpen,
  observatoryElement,
  observatoryFinalDoorBlockReason,
  observatoryPrompt,
  Phaser: { GameObjects: { Image: class ObservatoryArt {} } },
  // Registration only builds the callbacks; rotating a mirror is the one sound
  // port, and no case here presses a mirror.
  SoundSystem: { playMirrorRotate() {} },
};

/** The shipped per-item registration body, run against the recording scene. */
function runRegisteredItem(scene, item) {
  const run = bind(methodSource('registerObservatoryInteractable'), { ...REGISTER_SYMBOLS, item }, 'registerObservatoryInteractable()');
  return run(scene);
}

/** Everything the shipped buildObservatoryRoom() body closes over. `OPENING` is
 * passed empty because the room-build cases seed the played-intro flag: the
 * observatory's opening dialogue is not what they measure, so it never runs. */
const ROOM_BUILD_SYMBOLS = { CAMPAIGN_LEVELS, OBSERVATORY_BODY, OBSERVATORY_ROOMS, OPENING: [] };

/**
 * The visual builders buildObservatoryRoom() calls, recorded instead of run:
 * art, colliders and room geometry are check-observatory.mjs's and
 * check-interaction-targets.mjs's territory. What is *not* stubbed is the room
 * build itself, the per-item registration and the observatory state logic.
 */
const STUBBED_BUILD_PORTS = [
  'clearActiveRoom', 'drawObservatoryBackground', 'drawObservatoryWalls', 'drawObservatoryWallArt',
  'buildObservatoryStamps', 'buildObservatoryElements', 'buildObservatoryRootBed', 'buildObservatoryDoors',
  'buildObservatorySolids', 'buildObservatoryBeams', 'addObservatoryExit', 'restoreObservatoryLanternPlacement',
  'playObservatoryOpening',
];

const roomBuilds = new Map();
/**
 * Runs the shipped buildObservatoryRoom() body for one room against the
 * recording scene. Bound per room because `roomId` is a free identifier of the
 * extracted body (the method's own parameter is not part of its body).
 */
function buildRoom(scene, roomId) {
  if (!roomBuilds.has(roomId)) {
    roomBuilds.set(roomId, bind(methodSource('buildObservatoryRoom'), { ...ROOM_BUILD_SYMBOLS, roomId, spawnId: undefined }, 'buildObservatoryRoom()'));
  }
  return roomBuilds.get(roomId)(scene);
}

/**
 * makeScene()'s shipped observatory logic plus the ports the room build touches.
 * `calls.sequence` records the order of the build's own steps, so the case can
 * assert where the registration sits relative to the art and the door refresh.
 */
function makeRoomBuildScene(seed) {
  const scene = makeScene(seed, { add: makeRoomBuildPort });
  const { calls } = scene;
  Object.assign(calls, { registrations: [], sequence: [], hud: 0 });
  // The room's interaction registry, as buildObservatoryRoom() leaves it. `clear()`
  // is not modelled: clearActiveRoom() is a recorded stub, and no case here builds
  // two rooms into one scene.
  scene.interactions = { register: (config) => { calls.sequence.push('register'); calls.registrations.push(config); } };
  scene.track = (object) => object;
  scene.titleText = undefined;
  scene.lumoTarget = { x: 320, y: 265 };
  scene.player = { x: 0, y: 0, setFootPlacement() {}, setPosition(x, y) { this.x = x; this.y = y; } };
  scene.lumo.setVisible = () => undefined;
  scene.refreshHud = () => { calls.hud += 1; };
  scene.dialogue = { startDialogue: () => undefined };
  scene.refreshObservatoryDoors = () => { calls.refreshedDoors += 1; calls.sequence.push('refreshObservatoryDoors'); };
  scene.refreshObservatoryPuzzle = () => { calls.refreshedPuzzle += 1; calls.sequence.push('refreshObservatoryPuzzle'); };
  for (const name of STUBBED_BUILD_PORTS) scene[name] = () => { calls.sequence.push(name); };
  scene.resolveObservatorySpawn = (room) => {
    const [first] = room.spawns;
    return [first.position.x, first.position.y];
  };
  scene.registerObservatoryInteractable = (item) => runRegisteredItem(scene, item);
  return scene;
}

/**
 * A recording stand-in for the ports Level 10's `callLumoToSeal()` touches: its own `lumoMode`, the
 * campaign flags, `save()` and `say()`. The recall body is the shipped one; this only records it.
 */
function makeHeartRecallScene({ lumoMode = 'holding', flags = {} } = {}) {
  const calls = { save: 0, say: [] };
  return {
    lumoMode,
    progress: { flags },
    calls,
    save() { calls.save += 1; },
    say(lines) { calls.say.push(lines); },
  };
}

/**
 * A recording stand-in for the ports Level 10's `driveLumo()` touches: the seal anchor, Nhinh, Lumo's
 * sprite, `save()` and `say()`. `lumo.update` is a no-op — the case moves the sprite itself, standing
 * in for the travel that happens over several frames.
 */
function makeHeartDriveScene({ lumoMode, x, y }) {
  const calls = { save: 0, say: [] };
  return {
    lumoMode,
    sealPoint: { x: 320, y: 244 },
    player: { x: 320, y: 280 },
    lumo: { sprite: { x, y }, update() {} },
    progress: { flags: {} },
    calls,
    save() { calls.save += 1; },
    say(lines) { calls.say.push(lines); },
  };
}

/**
 * A recording stand-in for the ports Level 10's `interact()` touches on the confirmation-node branch:
 * the derived state (readiness is the puzzle's own concern), the flags, `save()`, `say()` and
 * `refresh()`. `save()` snapshots the flags, so the case can prove the clears land *before* the save.
 */
function makeHeartLatchScene({ lumoMode = 'holding', flags = {}, ready = true, latched = false } = {}) {
  const calls = { save: 0, say: [], refresh: 0, savedFlags: null };
  const scene = {
    lumoMode,
    progress: { flags },
    calls,
    state() { return { ready, latched }; },
    save() { calls.save += 1; calls.savedFlags = { ...scene.progress.flags }; },
    say(lines) { calls.say.push(lines); },
    refresh() { calls.refresh += 1; },
  };
  return scene;
}

/* ------------------------------------------------------------------ *
 * 3. Shared fixtures
 * ------------------------------------------------------------------ */

const PEDESTAL_ITEM = { id: 'lantern-pedestal', position: { x: 188, y: 232 } };

/** Mirrors g0=1, g1=2, g2=1 with the wide statue face: the shadowed splitter route. */
const PUZZLE_COUNTERS = { 'l8-g0': 1, 'l8-g1': 2, 'l8-g2': 1, 'l8-statue': 2 };

const LOOP_PREREQUISITES = { 'l8-bridge-crossed': true, 'l8-final-door-latched': true };

/** The far bank of the observatory with the beam network live and Lumo at the seal. */
function farBankSeed(extraFlags = {}) {
  return {
    flags: { 'l8-lumo-room': SEAL_AT.roomId, 'l8-lumo-destination': 'lumo-seal', 'l8-lumo-arrived': 'lumo-seal', ...extraFlags },
    counters: { ...PUZZLE_COUNTERS },
    lanternPlaced: true,
    lanternInHand: false,
    lanternOn: true,
  };
}

const stripRect = (strip) => ({ x: strip.x, y: strip.y, width: strip.width, height: strip.height });
const loopThresholds = OBSERVATORY_ALCOVES.filter((alcove) => alcove.doorId === 'return-loop').map((alcove) => alcove.threshold);
const sameRect = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/* ------------------------------------------------------------------ *
 * 3b. The campaign frame: the shipped update() body, one step per index
 * ------------------------------------------------------------------ */

/**
 * The two Phaser helpers the frame body calls. Phaser needs a canvas, so this
 * stands in for those two ports only; the dispatch under test is the scene's own
 * update() body, extracted above.
 */
const PHASER_PORTS = {
  Math: { Clamp: (value, min, max) => Math.min(Math.max(value, min), max) },
  Input: { Keyboard: { JustDown: () => false } },
};

/**
 * The dedicated controller CampaignScene builds for each campaign index
 * (buildLevel(): 2 -> libraryLevel, 3 -> shatteredCreek, 4 -> pathForTwoLevel,
 * 5 -> sleeplessTower, 6 -> gardenLevel, 7 -> ruinsLevel, 9 -> heartLevel).
 * clearActiveRoom() drops every controller before a level is rebuilt, so a frame
 * at index N has exactly the controller of N alive — which is why the frame
 * stand-in materialises that one and leaves the other six undefined.
 */
const LEVEL_CONTROLLERS = [
  { level: 2, field: 'libraryLevel' },
  { level: 3, field: 'shatteredCreek' },
  { level: 4, field: 'pathForTwoLevel' },
  { level: 5, field: 'sleeplessTower' },
  { level: 6, field: 'gardenLevel' },
  { level: 7, field: 'ruinsLevel' },
  { level: 9, field: 'heartLevel' },
];
const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
/** The generic per-frame pass a dedicated controller replaces. */
const LEGACY_PASS = ['updatePuzzle', 'updateCampaignBarriers', 'refreshCampaignPuzzleVisuals'];
/** Lumo is driven by update() at these indices; 8 routes him itself, 4/5/9 own him. */
const LUMO_LEVELS = [0, 1, 2, 3, 6, 7];

let frameStep = null;
/**
 * One authored frame step: the scene's own update() body, called with the
 * authored 16ms delta. `delta` is a closed-over parameter because the extracted
 * snippet is the method *body*; the body never reads the `time` argument.
 */
function stepFrame(scene, delta = 16) {
  if (!frameStep || frameStep.delta !== delta) {
    frameStep = { delta, run: bind(methodSource('update'), { Phaser: PHASER_PORTS, isRuinsPositionSafe, observatoryPlacedLightVisible, delta }, 'update()') };
  }
  frameStep.run(scene);
}

/**
 * A recording stand-in for the ports one CampaignScene frame touches. Everything
 * the frame calls outside the dispatch is recorded rather than re-implemented:
 * the dispatch itself, including the guard around each controller, is the
 * shipped update() body.
 */
function makeFrameScene(level, { controllers = [] } = {}) {
  const calls = {
    player: 0, lumo: [], lantern: 0, interactions: 0, dialogue: 0, hud: 0, observatoryLumo: 0,
    observatoryRefresh: 0, forestEdgeProgress: 0, forestEdgeGuide: 0, woodsFirefly: 0, legacy: [], controller: [], placedLight: [], beatFlushes: 0,
  };
  const bounds = { x: 0, y: 0, width: 36, height: 42 };
  const scene = {
    progress: { level, flags: {}, counters: {} },
    heartEnd: false,
    activeObservatoryRoom: level === 8 ? 'observatory' : null,
    lumoTarget: { x: 320, y: 272 },
    lastLumoSave: 0,
    lastPlayerSave: 0,
    time: { now: 100000 },
    dialogue: { isInputLocked: () => false, isActive: () => false, update: () => { calls.dialogue += 1; } },
    pauseMenu: { isOpen: () => false, open: () => undefined },
    // The frame hands the foot body to interactions.update() (reach-opted controls); a 14x6 stand-in suffices here.
    player: { x: 320, y: 290, update: () => { calls.player += 1; }, getFootBody: () => ({ x: 313, y: 306, width: 14, height: 6 }), sprite: { visible: true, getBounds: () => bounds } },
    lumo: {
      update: (_dt, x, y) => calls.lumo.push({ x, y }),
      sprite: { x: 300, y: 270, visible: true, getBounds: () => bounds },
    },
    lantern: {
      lanternInHand: true, lanternOn: true, lanternPlaced: false,
      update: () => { calls.lantern += 1; },
      getCooldownRatio: () => 0,
      setPlacedLightVisible: (visible) => { calls.placedLight.push(visible); },
    },
    interactions: { update: () => { calls.interactions += 1; } },
    hud: { update: () => undefined, setHidden: () => undefined },
    keys: { esc: {} },
    calls,
    /** Saving is not what this harness measures; the frame stand-in just absorbs it. */
    save: () => undefined,
    refreshHud: () => { calls.hud += 1; },
    updateWoodsFirefly: () => { calls.woodsFirefly += 1; },
    updateForestEdgeProgress: () => { calls.forestEdgeProgress += 1; },
    updateForestEdgeGuide: () => { calls.forestEdgeGuide += 1; },
    updateObservatoryLumo: () => { calls.observatoryLumo += 1; },
    resolveSafeObservatoryCheckpoint: () => undefined,
    updateObservatoryCrossingState: () => { calls.observatoryRefresh += 1; },
    refreshObservatoryDoors: () => { calls.observatoryRefresh += 1; },
    refreshObservatoryPuzzle: () => { calls.observatoryRefresh += 1; },
    flushObservatoryBeats: () => { calls.beatFlushes += 1; },
  };
  for (const name of LEGACY_PASS) scene[name] = () => calls.legacy.push(name);
  for (const field of controllers) {
    scene[field] = {
      update: (dt) => calls.controller.push({ field, level, dt }),
      getProtectedPromptBounds: () => [],
      // Mirrors the real controller API: the scene's input lock reads it every frame (Level 08's demonstration owns controls).
      isControlLocked: () => false,
    };
  }
  return scene;
}

/** The deltas the tower controller receives, one entry per campaign index. */
function towerStepPerLevel() {
  const perLevel = [];
  for (const level of LEVELS) {
    const scene = makeFrameScene(level, { controllers: ['sleeplessTower'] });
    stepFrame(scene);
    perLevel[level] = scene.calls.controller.map((call) => call.dt);
  }
  return perLevel;
}

/**
 * The level indices update()'s own guard skips for the generic pass — the
 * `this.progress.level !== N` literals on the condition that wraps
 * updatePuzzle(). Read out of the shipped condition rather than copied by hand,
 * so letting the generic pass back into a controller-owned frame fails here
 * instead of silently drifting.
 */
function legacyPassExcludedLevels() {
  const update = findNode(sourceFile, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === 'update');
  assert.ok(update?.body, 'CampaignScene still declares update()');
  const legacyCall = findNode(update.body, (node) => ts.isCallExpression(node) && nodeText(node.expression) === 'this.updatePuzzle');
  assert.ok(legacyCall, 'update() still runs the generic puzzle refresh');
  let guard = legacyCall.parent;
  while (guard && !(ts.isIfStatement(guard) && findNode(guard.thenStatement, (node) => node === legacyCall))) guard = guard.parent;
  assert.ok(guard, 'the generic puzzle refresh still sits inside a level guard');
  const excluded = [];
  walk(guard.expression, (node) => {
    if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken) return;
    if (nodeText(node.left) !== 'this.progress.level' || !ts.isNumericLiteral(node.right)) return;
    excluded.push(Number(node.right.text));
  });
  assert.ok(excluded.length, 'the guard on the generic pass still names the levels it skips');
  return excluded.sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ *
 * 4. Cases
 * ------------------------------------------------------------------ */

/** A recording stand-in for a Phaser Graphics object: it keeps every line and rounded rect drawn since the last clear. */
function makeRecorder() {
  const recorder = { lines: [], rects: [], styles: [], cleared: 0,
    clear() { recorder.lines = []; recorder.rects = []; recorder.styles = []; recorder.cleared += 1; },
    lineStyle(width, colour, alpha) { recorder.styles.push({ width, colour, alpha }); },
    fillStyle() {},
    lineBetween(x1, y1, x2, y2) { recorder.lines.push({ x1, y1, x2, y2 }); },
    fillRoundedRect(x, y, width, height) { recorder.rects.push({ x, y, width, height, kind: 'fill' }); },
    strokeRoundedRect(x, y, width, height) { recorder.rects.push({ x, y, width, height, kind: 'stroke' }); },
  };
  return recorder;
}

/** A recording stand-in for the ports Level 10's final F touches; commitFinalExtinguish is the shipped body. */
function makeHeartFinalScene({ inHand, placed, on = true, latched = true, x = 300, y = 280, overload = false } = {}) {
  const calls = { finish: 0, stopDialogue: 0, save: 0, say: [], refresh: 0 };
  const scene = {
    destroyed: false, completed: false, lanternKeyTime: 0,
    progress: { lanternOn: on, flags: { 'l9-roots': latched, 'l9-overload': overload, 'l9-lantern-placed': placed, 'l9-lantern-retrieved': inHand } },
    lantern: { lanternInHand: inHand, lanternPlaced: placed, lanternOn: on, isOverloadMode: overload, isDawnMode: false, toggleLantern: () => false },
    player: { x, y },
    calls,
    state: () => ({ latched }),
    isDialogueLocked: () => overload, isPaused: () => false, playLanternAction() {},
    say(lines) { calls.say.push(lines); },
    save() { calls.save += 1; },
    refresh() { calls.refresh += 1; },
    stopDialogue() { calls.stopDialogue += 1; },
    finish() { calls.finish += 1; },
  };
  scene.commitFinalExtinguish = (source) => bind(methodSource('commitFinalExtinguish', heartSourceFile, 'HeartOfElariaLevel'), { source }, 'HeartOfElariaLevel.commitFinalExtinguish()')(scene);
  return scene;
}
const pressHeartF = (scene) => bind(methodSource('handleLanternKey', heartSourceFile, 'HeartOfElariaLevel'),
  { heartFinalActionSource, getHeartElement, canReachHeartElement, ...HEART_SOUND }, 'HeartOfElariaLevel.handleLanternKey()')(scene);

/* ------------------------------------------------------------------ *
 * 4a. Hint ladder, level 7 -> 8 teardown, completed-save redirect, caption, Lumo clamp
 * ------------------------------------------------------------------ */

let hintShow = null;
/**
 * The shipped showHint() body against a fake `this`. The fake sits at index 8 with an observatory room, so only
 * the observatory branch runs; the other branches are never entered.
 */
function runShowHint(scene) {
  if (!hintShow) hintShow = bind(methodSource('showHint'), { observatoryGuidance }, 'CampaignScene.showHint()');
  return hintShow(scene);
}

/** buildLevel() starts with the sound teardown, which is not under test here. */
const BUILD_LEVEL_SYMBOLS = {
  SoundSystem: { startAmbient() {}, stopAmbient() {}, setFootstepSurface() {} },
  SOIL_FOOTSTEP_LEVELS: new Set(),
  AMBIENCE_BY_LEVEL: [],
};

let buildLevelRun = null;
/** The shipped buildLevel() body. Level 8 returns through buildObservatoryRoom(), which the stand-in records. */
function runBuildLevel(scene) {
  if (!buildLevelRun) buildLevelRun = bind(methodSource('buildLevel'), BUILD_LEVEL_SYMBOLS, 'CampaignScene.buildLevel()');
  return buildLevelRun(scene);
}

/** The mission plate's tallest extent, read from CampaignHud so the caption is checked against the real plate. */
function missionPlateBottom() {
  const hud = readFileSync(new URL('../src/ui/CampaignHud.ts', import.meta.url), 'utf8');
  const top = Number(hud.match(/const TOP_Y = (\d+)/)?.[1]);
  const height = Number(hud.match(/const TOP_MAX_HEIGHT = (\d+)/)?.[1]);
  assert.ok(Number.isFinite(top) && Number.isFinite(height), 'CampaignHud still declares the mission plate top and max height');
  return top + height;
}

/** The shipped showObservatoryCaption() body. Its `text` parameter is part of the signature, so it comes in as a symbol. */
function runObservatoryCaption(scene, text) {
  return bind(methodSource('showObservatoryCaption'), { text, HUD_LAYOUT: { topBottom: missionPlateBottom() } }, 'CampaignScene.showObservatoryCaption()')(scene);
}

/** A recording stand-in for the display-list and tween ports the caption touches. */
function makeCaptionScene() {
  const calls = { texts: [], tweens: [] };
  const scene = {
    roomObjects: [],
    add: {
      text(x, y, text, style) {
        calls.texts.push({ x, y, text, style });
        const label = { active: true, destroy() { this.active = false; }, setOrigin() { return this; }, setDepth() { return this; } };
        return label;
      },
    },
    tweens: { add(config) { calls.tweens.push(config); } },
    calls,
  };
  return scene;
}

const CASES = [
  {
    name: 'a_direct_load_into_the_creek_or_the_tower_can_tear_down_its_hud',
    run: () => {
      // The per-level HUD texts were folded into the shared CampaignHud. Nothing in the scene may still destroy or
      // read them, so a Continue from a fresh page load has no undefined text field to call destroy() on.
      const source = readFileSync(SCENE_FILE, 'utf8');
      assert.equal(/this\.(titleText|objectiveText|statusText|hintText|lumoStatusText)/.test(source), false, 'no per-level HUD text field remains in CampaignScene');
    },
  },
  {
    name: 'heart_final_f_commits_once_from_hand_even_mid_overload',
    run: () => {
      const scene = makeHeartFinalScene({ inHand: true, placed: false, overload: true });
      pressHeartF(scene);
      const flags = scene.progress.flags;
      assert.equal(scene.calls.finish, 1, 'F hands over to the ending exactly once');
      assert.equal(scene.calls.stopDialogue, 1, 'the running overload dialogue and its queue are dropped');
      assert.equal(flags['l9-complete'], true); assert.equal(flags['l9-overload'], false);
      assert.equal(flags['l9-ending-beat'], 'night-call', 'the ending starts at its first beat');
      assert.equal(flags['l9-lantern-placed'], false); assert.equal(flags['l9-lantern-retrieved'], true, 'the lamp is saved as held');
      assert.equal(scene.lantern.lanternOn, false); assert.equal(scene.progress.lanternOn, false); assert.equal(scene.lantern.isOverloadMode, false);
      pressHeartF(scene); scene.commitFinalExtinguish('hand');
      assert.equal(scene.calls.finish, 1, 'a second F or a stray callback cannot finish twice');
    },
  },
  {
    name: 'heart_final_f_at_the_pedestal_needs_a_valid_stand',
    run: () => {
      const stand = getHeartElement('heart-pedestal').stand;
      const near = makeHeartFinalScene({ inHand: false, placed: true, x: stand.x, y: stand.y });
      pressHeartF(near);
      assert.equal(near.calls.finish, 1, 'F at the pedestal completes at once, with no extra E');
      assert.equal(near.progress.flags['l9-lantern-placed'], true, 'the lamp stays parked, dark');
      assert.equal(near.progress.flags['l9-lantern-retrieved'], false);
      assert.equal(near.progress.lanternOn, false);
      const far = makeHeartFinalScene({ inHand: false, placed: true, x: 500, y: 280 });
      pressHeartF(far);
      assert.equal(far.calls.finish, 0, 'F from across the room cannot finish while the lamp is parked');
      assert.equal(far.progress.flags['l9-complete'], undefined);
      assert.equal(far.calls.say.length, 1, 'it says where to stand instead');
      const early = makeHeartFinalScene({ inHand: true, placed: false, latched: false });
      pressHeartF(early);
      assert.equal(early.calls.finish, 0, 'before the roots latch F is not a final action');
      assert.equal(early.progress.flags['l9-complete'], undefined);
    },
  },
  {
    name: 'heart_overload_beam_follows_the_carried_lamp_every_frame',
    run: () => {
      const lampOf = bind(methodSource('getCarriedLightPosition', lanternSourceFile, 'LanternSystem'), { playerX: 0, playerY: 0 }, 'getCarriedLightPosition()');
      const carried = (x, y) => bind(methodSource('getCarriedLightPosition', lanternSourceFile, 'LanternSystem'), { playerX: x, playerY: y }, 'getCarriedLightPosition()')({});
      assert.ok(lampOf, 'the helper compiles');
      const refresh = (scene, active) => bind(methodSource('refreshCarriedBeam', heartSourceFile, 'HeartOfElariaLevel'), { HEART_CORE, active }, 'HeartOfElariaLevel.refreshCarriedBeam()')(scene);
      const scene = { carriedBeamGraphics: makeRecorder(), player: { x: 120, y: 240 }, lantern: { getCarriedLightPosition: (x, y) => carried(x, y) } };
      refresh(scene, true);
      assert.deepEqual(scene.carriedBeamGraphics.lines[0], { x1: HEART_CORE.x, y1: HEART_CORE.y, x2: 126, y2: 242 }, 'the beam runs from the core to the carried lamp');
      scene.player.x = 400; scene.player.y = 260;
      refresh(scene, true);
      assert.equal(scene.carriedBeamGraphics.lines.length, 2, 'it is redrawn each frame (one glow, one core stroke), not accumulated');
      assert.deepEqual(scene.carriedBeamGraphics.lines.at(-1), { x1: HEART_CORE.x, y1: HEART_CORE.y, x2: 406, y2: 262 }, 'and it follows Nhinh when he walks');
      refresh(scene, false);
      assert.equal(scene.carriedBeamGraphics.lines.length, 0, 'switching the lamp off, or putting it down, removes the beam at once');
      const lanternSource = readFileSync(LANTERN_FILE, 'utf8');
      assert.ok(lanternSource.includes('this.getCarriedLightPosition(playerX, playerY)'), 'the halo uses the same helper, so there is one carried-light offset');
      const heartSource = readFileSync(HEART_FILE, 'utf8');
      assert.equal(/lantern\.placedX|lanternSpot/.test(methodSource('refreshCarriedBeam', heartSourceFile, 'HeartOfElariaLevel')), false, 'no beam is drawn from the pedestal while the lamp is carried');
      assert.ok(heartSource.includes('this.beamGraphics = this.track(this.scene.add.graphics().setDepth(6.8))'), 'puzzle beams sit at depth 6.8, under the floor cells and locks at 7');
    },
  },
  {
    name: 'heart_pocket_border_is_drawn_on_the_moon_cell',
    run: () => {
      const draw = (scene, visible) => bind(methodSource('refreshPocket', heartSourceFile, 'HeartOfElariaLevel'), { getHeartElement, visible }, 'HeartOfElariaLevel.refreshPocket()')(scene);
      const scene = { pocketGraphics: makeRecorder() };
      draw(scene, true);
      const moon = getHeartElement('heart-moon');
      const [fill, stroke] = scene.pocketGraphics.rects;
      assert.ok(fill && stroke, 'a filled pocket and its border are drawn');
      for (const rect of [fill, stroke]) {
        assert.ok(rect.x < moon.x - moon.width / 2 + 12 && rect.x + rect.width > moon.x + moon.width / 2 - 12, 'the border surrounds the Moon cell horizontally');
        assert.ok(rect.y < moon.y && rect.y + rect.height > moon.y, 'and vertically');
      }
      draw(scene, false);
      assert.equal(scene.pocketGraphics.rects.length, 0, 'a pocket that is not engaged draws nothing');
    },
  },
  {
    name: 'observatory_opening_plays_in_two_beats_once',
    run: () => {
      const source = methodSource('playObservatoryOpening');
      const symbols = { OBSERVATORY_OPENING_ENTRANCE, OBSERVATORY_OPENING_CORRIDOR, OBSERVATORY_ROOMS, roomId: undefined };
      const play = (scene, roomId) => bind(source, { ...symbols, roomId }, 'playObservatoryOpening()')(scene);
      const make = (flags = {}) => {
        const scene = makeScene({ flags });
        scene.observatoryLumoHold = null;
        scene.say = (lines, done) => { scene.calls.say.push(lines); scene.done = done; };
        return scene;
      };
      const fresh = make();
      play(fresh, 'entrance');
      assert.deepEqual(fresh.calls.say[0].map((line) => line.text), OBSERVATORY_OPENING_ENTRANCE.map((line) => line.text), 'the entrance plays its three authored lines');
      assert.equal(fresh.progress.flags['intro-8'], true);
      play(fresh, 'entrance');
      assert.equal(fresh.calls.say.length, 1, 'the entrance beat never repeats');
      assert.equal(fresh.progress.flags['intro-8-corridor'], undefined, 'the entrance does not spend the corridor beat');

      play(fresh, 'corridor');
      assert.equal(fresh.calls.say.length, 2, 'the first corridor entry plays the second beat');
      assert.deepEqual(fresh.calls.say[1].map((line) => line.text), OBSERVATORY_OPENING_CORRIDOR.map((line) => line.text));
      assert.ok(fresh.observatoryLumoHold && fresh.observatoryLumoHold.x > 90 && fresh.observatoryLumoHold.y < 140, 'Lumo hovers at the spiral tube mouth while it plays');
      fresh.done();
      assert.equal(fresh.observatoryLumoHold, null, 'and goes back to following Nhinh when it ends');
      play(fresh, 'corridor');
      assert.equal(fresh.calls.say.length, 2, 'the corridor beat never repeats');

      const past = make({ 'intro-8': true, 'l8-door-a-latched': true });
      play(past, 'corridor');
      assert.equal(past.calls.say.length, 0, 'a save already past the corridor never replays the beat');
      assert.equal(past.progress.flags['intro-8-corridor'], true, 'and records it as spent');
    },
  },
  {
    name: 'observatory_free_lumo_walks_through_doors_but_a_called_lumo_keeps_his_room',
    run: () => {
      const free = bind(methodSource('isObservatoryLumoFree'), NO_SYMBOLS, 'isObservatoryLumoFree()');
      const withSteps = (flags, counters = {}) => {
        const scene = makeScene({ flags, counters });
        scene.getObservatoryLumoSteps = () => (flags['l8-lumo-route-json'] ? JSON.parse(flags['l8-lumo-route-json']) : []);
        return scene;
      };
      assert.equal(free(withSteps({})), true, 'a fresh Lumo is free');
      assert.equal(free(withSteps({ 'l8-lumo-destination': 'lumo-seal', 'l8-lumo-arrived': 'lumo-seal' })), false, 'Lumo holding the seal stays at the seal');
      assert.equal(free(withSteps({ 'l8-lumo-destination': 'lumo-seal', 'l8-lumo-route-json': JSON.stringify([{ roomId: 'corridor', x: 1, y: 1 }]) })), false, 'a travelling Lumo keeps his route');
      assert.equal(free(withSteps({ 'l8-lumo-destination': 'lantern-source', 'l8-lumo-arrived': 'lantern-source' })), true, 'a recalled Lumo follows Nhinh again');
      const transition = methodSource('transitionObservatory');
      assert.ok(transition.includes('this.isObservatoryLumoFree()') && transition.includes("this.progress.flags['l8-lumo-room'] = exit.toRoom"),
        'transitionObservatory moves a free Lumo into the new room with Nhinh');
    },
  },
  {
    name: 'observatory_conditional_beats_fire_on_transitions_only',
    run: () => {
      const beatSource = methodSource('queueObservatoryStateBeats'); // `state` is the method parameter, so it comes in as a symbol
      const beats = (scene, state) => bind(beatSource, { OBSERVATORY_BEAT_ROOTS_LIT, OBSERVATORY_BEAT_NO_BEAM, state }, 'queueObservatoryStateBeats()')(scene);
      const make = (room = 'observatory') => {
        const scene = makeScene({ roomId: room, lanternPlaced: true, lanternInHand: false, lanternOn: true });
        scene.queued = [];
        scene.queueObservatoryBeat = (lines) => scene.queued.push(lines);
        scene.observatoryWasThroughSeal = false;
        return scene;
      };
      const direct = { activeBeamPath: { routeId: 'g2-direct-sun' }, sunDoorUnlocked: true, bridgeEligible: false, lumoAtSeal: true };
      const scene = make();
      beats(scene, direct); beats(scene, direct); beats(scene, direct);
      assert.equal(scene.queued.length, 1, 'the roots-lit pair plays once, not every frame');
      assert.deepEqual(scene.queued[0].map((line) => line.text), OBSERVATORY_BEAT_ROOTS_LIT.map((line) => line.text));
      assert.equal(scene.progress.flags['l8-beat-roots-lit'], true);
      const elsewhere = make('corridor'); beats(elsewhere, direct);
      assert.equal(elsewhere.queued.length, 0, 'the roots line belongs to the observatory');
      const split = { activeBeamPath: { routeId: 'g2-split' }, sunDoorUnlocked: true, bridgeEligible: false, lumoAtSeal: true };
      const quiet = make(); beats(quiet, split);
      assert.equal(quiet.queued.length, 0, 'the split route does not say the roots are lit');

      const turned = make('entrance');
      const through = { activeBeamPath: { routeId: 'g0-to-g1' }, sunDoorUnlocked: false, bridgeEligible: false, lumoAtSeal: true };
      const away = { activeBeamPath: { routeId: 'off' }, sunDoorUnlocked: false, bridgeEligible: false, lumoAtSeal: true };
      beats(turned, through);
      assert.equal(turned.queued.length, 0, 'a live beam through the seal says nothing');
      beats(turned, away);
      assert.equal(turned.queued.length, 1, 'turning G0 away while Lumo holds the seal makes him say so');
      assert.equal(turned.queued[0][0].text, OBSERVATORY_BEAT_NO_BEAM[0].text);
      beats(turned, away); beats(turned, away);
      assert.equal(turned.queued.length, 1, 'and only once per change');
      const dark = make('entrance'); dark.lantern.lanternOn = false;
      beats(dark, through); beats(dark, away);
      assert.equal(dark.queued.length, 0, 'switching the lamp off is not a re-aimed beam');
      const free = make('entrance');
      beats(free, through); beats(free, { ...away, lumoAtSeal: false });
      assert.equal(free.queued.length, 0, 'without a held seal there is nothing for Lumo to say');
    },
  },
  {
    name: 'observatory_frame_paints_a_parked_lamp_only_in_its_room',
    run: () => {
      for (const [room, expected] of [['entrance', true], ['corridor', false], ['observatory', false]]) {
        const scene = makeFrameScene(8);
        scene.activeObservatoryRoom = room;
        scene.lantern.lanternPlaced = true;
        stepFrame(scene);
        assert.deepEqual(scene.calls.placedLight, [expected], `${room}: a parked lamp's halo is ${expected ? 'painted' : 'hidden'}`);
        assert.equal(scene.calls.beatFlushes, 1, `${room}: queued story beats flush once per frame`);
      }
      const carried = makeFrameScene(8);
      carried.lantern.lanternPlaced = false;
      stepFrame(carried);
      assert.deepEqual(carried.calls.placedLight, [true], 'a carried lamp lights every room');
      const other = makeFrameScene(3);
      stepFrame(other);
      assert.deepEqual(other.calls.placedLight, [], 'other levels never touch the placed-light switch');
    },
  },

  {
    name: 'return_loop_action_commits_and_refreshes',
    run: () => {
      const scene = makeScene(farBankSeed(LOOP_PREREQUISITES));
      const before = scene.getObservatoryWorldState();
      assert.equal(observatoryDoorOpen('return-loop', before), false, 'the loop starts closed on the far bank');
      assert.ok(observatorySolidRects('observatory', before).some((rect) => loopThresholds.some((sill) => sameRect(rect, sill))),
        'a closed loop blocks its authored sill');

      runRegistered('stone-return-loop', scene);

      assert.equal(scene.progress.flags['l8-return-loop-open'], true,
        'the registered callback latches l8-return-loop-open');
      assert.deepEqual(scene.calls.flagWrites.map((write) => write.key), ['l8-return-loop-open'],
        'the action writes the loop flag and nothing else');
      assert.equal(scene.calls.save, 1, 'the action saves exactly once');
      assert.equal(scene.calls.refreshedDoors, 1, 'the action refreshes the doors and their colliders');
      assert.equal(scene.calls.refreshedLoops, 1, 'the action refreshes the return-loop strip');
      assert.equal(scene.calls.strips.length, 1, 'the action raises exactly one strip');

      const after = scene.getObservatoryWorldState();
      assert.equal(observatoryDoorOpen('return-loop', after), true, 'the new world state reads the loop as open');
      assert.equal(observatorySolidRects('observatory', after).some((rect) => loopThresholds.some((sill) => sameRect(rect, sill))), false,
        'the sill stops colliding once the loop is open');
      assert.equal(scene.calls.say.length, 1, 'the action answers with one line');
      assert.equal(scene.calls.say[0].length, 1, 'the answer is a single authored line');
      assert.equal(scene.calls.say[0][0].text, OPEN_LOOP_LINE, 'the success sentence is the authored Vietnamese line');
    },
  },
  {
    name: 'return_loop_missing_prerequisite_refuses_and_names_the_step',
    run: () => {
      const missing = [
        { label: 'bridge not crossed', flags: {}, step: 'Phải qua cầu rễ sang bờ bên kia trước.' },
        { label: 'final door not latched', flags: { 'l8-bridge-crossed': true }, step: 'Gài chốt cửa cuối trên bờ bên kia trước.' },
      ];
      for (const entry of missing) {
        const scene = makeScene(farBankSeed(entry.flags));
        assert.equal(scene.getObservatoryWorldState().returnLoopOpen, false, `${entry.label}: the loop starts closed`);
        runRegistered('stone-return-loop', scene);
        assert.equal(scene.progress.flags['l8-return-loop-open'], undefined, `${entry.label}: E must not latch the loop`);
        assert.equal(scene.calls.save, 0, `${entry.label}: a refused press saves nothing`);
        assert.equal(scene.calls.strips.length, 0, `${entry.label}: a refused press raises no strip`);
        assert.equal(scene.calls.say.length, 1, `${entry.label}: the control answers with one inspection line`);
        assert.ok(scene.calls.say[0][0].text.includes(entry.step),
          `${entry.label}: the line names the missing step ("${scene.calls.say[0][0].text}")`);
      }
      // Nothing is missing any more, so the inspection itself must be the step.
      const ready = makeScene(farBankSeed(LOOP_PREREQUISITES)).getObservatoryWorldState();
      const reason = observatoryDoorBlockReason('return-loop', ready);
      assert.notEqual(reason, 'Lối đá vòng chưa mở.', 'a closed loop never answers with a bare statement');
      assert.match(reason, /E/, `a closed loop names the action to take ("${reason}")`);
    },
  },
  {
    name: 'return_loop_second_press_does_not_double_commit',
    run: () => {
      const scene = makeScene(farBankSeed(LOOP_PREREQUISITES));
      runRegistered('stone-return-loop', scene);
      const [firstStrip] = scene.calls.strips;
      const writesAfterFirst = scene.calls.flagWrites.length;

      runRegistered('stone-return-loop', scene);

      assert.equal(scene.progress.flags['l8-return-loop-open'], true, 'the loop stays open');
      assert.equal(scene.calls.flagWrites.length, writesAfterFirst, 'the second press writes no flag again');
      assert.equal(scene.calls.save, 1, 'the second press does not save again');
      assert.equal(scene.calls.strips.length, 1, 'the second press builds no second strip');
      assert.equal(scene.roomObjects.filter((object) => object.name === OBSERVATORY_RETURN_LOOP_VISUAL_ID).length, 1,
        'the room keeps exactly one loop strip');
      assert.equal(scene.roomObjects[0], firstStrip, 'the second press keeps the strip it already has');
      assert.equal(scene.calls.say.length, 2, 'the second press only reports');
      assert.match(scene.calls.say[1][0].text, /đang mở/, 'an already-open loop is reported, not re-opened');
    },
  },
  {
    name: 'return_loop_restore_shows_the_strip_immediately',
    run: () => {
      for (const roomId of ['entrance', 'corridor', 'observatory']) {
        const scene = makeScene({ roomId, flags: { 'l8-return-loop-open': true } });
        // What buildObservatoryRoom() does right after it paints the background.
        scene.refreshObservatoryReturnLoop();
        assert.equal(scene.calls.strips.length, 1, `${roomId}: a save with the loop open restores its strip at once`);
        assert.deepEqual(stripRect(scene.calls.strips[0]), observatoryReturnLoopLane(roomId),
          `${roomId}: the strip is the authored lane for this room`);
        assert.equal(scene.calls.strips[0].name, OBSERVATORY_RETURN_LOOP_VISUAL_ID, `${roomId}: the strip carries its stable id`);
        assert.deepEqual(scene.calls.added, ['tileSprite'], `${roomId}: the restore repaints no room background`);
        assert.equal(scene.roomObjects.length, 1, `${roomId}: the restore adds exactly one visual`);

        scene.refreshObservatoryReturnLoop();
        scene.refreshObservatoryReturnLoop();
        assert.equal(scene.calls.strips.length, 1, `${roomId}: repeating the refresh never stacks strips`);

        const latched = makeScene({ roomId, flags: { 'l8-lantern-placed': true } });
        latched.refreshObservatoryReturnLoop();
        latched.refreshObservatoryReturnLoop();
        assert.equal(latched.calls.strips.length, 0, `${roomId}: a closed loop paints nothing`);
      }
      const reopened = makeScene({ roomId: 'observatory', flags: { 'l8-return-loop-open': true } });
      reopened.refreshObservatoryReturnLoop();
      const visual = reopened.observatoryReturnLoopVisual;
      reopened.progress.flags['l8-return-loop-open'] = false;
      reopened.refreshObservatoryReturnLoop();
      assert.equal(visual.destroyed, true, 'a loop that closes again destroys its strip');
      assert.equal(reopened.observatoryReturnLoopVisual, undefined, 'and drops the destroyed visual');
      assert.equal(reopened.roomObjects.includes(visual), false, 'the destroyed strip leaves the room object list');
    },
  },
  {
    name: 'return_loop_needs_no_lamp_and_no_lumo',
    run: () => {
      const scene = makeScene({
        flags: LOOP_PREREQUISITES,
        counters: { 'l8-g0': 2, 'l8-g1': 0, 'l8-g2': 3, 'l8-statue': 0 },
        lanternPlaced: false,
        lanternInHand: false,
        lanternOn: false,
      });
      const before = scene.getObservatoryState();
      assert.equal(before.sunDoorUnlocked, false, 'the beam network is dark with the lamp off');
      assert.equal(before.lumoAtSeal, false, 'Lumo is not holding the seal');
      assert.equal(before.lumoAtSeal || before.bridgeEligible, false, 'nothing downstream of the lamp is available');

      runRegistered('stone-return-loop', scene);

      assert.equal(scene.progress.flags['l8-return-loop-open'], true,
        'the loop opens with the lamp off, in no hand, and Lumo away');
      assert.equal(observatoryDoorOpen('return-loop', scene.getObservatoryWorldState()), true,
        'the state the rest of the level reads is open');
    },
  },
  {
    name: 'return_loop_action_unlocks_record_crystal_and_completion',
    run: () => {
      const scene = makeScene(farBankSeed({ 'l8-door-a-latched': true, 'l8-bridge-crossed': true }));

      // The authored far-bank chain, every step through its own registered callback.
      runRegistered('final-door-control', scene);
      assert.equal(scene.progress.flags['l8-final-door-latched'], true, 'the final door latches on the far bank');
      runRegistered('stone-return-loop', scene);
      assert.equal(scene.progress.flags['l8-return-loop-open'], true, 'the loop latches through its own control');
      const afterLoop = scene.getObservatoryWorldState();
      assert.equal(afterLoop.returnLoopOpen && afterLoop.finalDoorLatched, true, 'the new world state carries both latches');

      // The record is still shut by the two remaining steps, and no longer by the loop.
      runRegistered('final-record', scene);
      assert.notEqual(scene.progress.flags['l8-record-read'], true, 'the record is still shut with the lamp placed and Lumo at the seal');
      const gate = scene.calls.say.at(-1)[0].text;
      assert.ok(gate.includes('thu hồi đèn về tay') && gate.includes('gọi Lumo về bên đèn'),
        `the record names the two remaining steps ("${gate}")`);
      assert.equal(gate.includes('mở lối đá vòng'), false, 'opening the loop removed it from the record gate');

      runRegistered('lantern-pedestal', scene, { item: PEDESTAL_ITEM });
      assert.equal(scene.lantern.lanternInHand, true, 'the lamp comes back to hand');
      assert.equal(scene.progress.flags['l8-lantern-retrieved'], true, 'the retrieval is saved as a flag');
      assert.equal(scene.calls.refreshedPuzzle, 1, 'the retrieval repaints the puzzle');
      runRegistered('lumo-tube', scene, { id: 'lumo-tube' });
      assert.deepEqual(scene.calls.lumoRoute, ['recall'], 'the tube calls Lumo home');
      scene.arriveLumo(SOURCE_AT.roomId, SOURCE_AT.x, SOURCE_AT.y);
      assert.equal(scene.getObservatoryWorldState().lumoRecalled, true, 'Lumo is back beside the lamp');

      runRegistered('final-record', scene);
      assert.equal(scene.progress.flags['l8-record-read'], true, 'the record opens once its real prerequisites hold');
      assert.equal(scene.calls.memory, 1, 'reading the record plays its memory');
      runRegistered('balance-crystal', scene);
      assert.equal(scene.progress.flags['l8-balance-crystal'], true, 'the crystal becomes collectible');
      assert.equal(scene.observatoryElementVisuals.has('balance-crystal'), false, 'the crystal art leaves the room with it');
      const ready = scene.getObservatoryWorldState();
      assert.equal(observatoryCompletionReady(ready), true, 'the completion predicate holds on the real world state');
      scene.progress.counters['lumo-x'] = 300; scene.progress.counters['lumo-y'] = 120; // stale Level 09 / older generic coordinates
      runRegistered('final-door-control', scene);
      assert.equal(scene.calls.nextLevel.length, 1, 'the far-bank control hands over to the next level');
      assert.deepEqual(scene.calls.nextLevel[0].map((line) => line.text), OBSERVATORY_EXIT_LINES.map((line) => line.text), 'the handover plays the scenario\'s three exit lines');
      assert.equal(scene.progress.counters['lumo-x'], undefined, 'the stale generic Lumo coordinates are cleared for Level 10');
      assert.equal(scene.progress.counters['lumo-y'], undefined);
    },
  },
  {
    name: 'observatory_build_registers_every_authored_control',
    run: () => {
      // The defect this case exists for: buildObservatoryRoom() declared
      // registerObservatoryInteractable() and never called it, so the shipped room
      // registered zero controls — no pedestal, no mirrors, no return loop, no
      // final door — and Level 09 could not be finished. The authored lists are
      // pure data (check-observatory.mjs), so only running the shipped build body
      // can see it.
      for (const roomId of ['entrance', 'corridor', 'observatory']) {
        const room = OBSERVATORY_ROOMS[roomId];
        const scene = makeRoomBuildScene({ roomId, flags: { 'l8-lumo-room': roomId, 'intro-8': true } });
        buildRoom(scene, roomId);

        const registered = scene.calls.registrations;
        assert.equal(registered.length, room.interactables.length,
          `${roomId}: buildObservatoryRoom() must register the room's own ${room.interactables.length} authored controls, but it registered ${registered.length}`);
        assert.deepEqual(registered.map((item) => item.id), room.interactables.map((item) => `observatory-${item.id}`),
          `${roomId}: the registered controls are exactly the authored ones, in the authored order`);
        assert.deepEqual(registered.map((item) => ({ x: item.x, y: item.y })),
          room.interactables.map((item) => ({ x: item.interactionPoint.x, y: item.interactionPoint.y })),
          `${roomId}: every registered control stands on its authored interaction point`);
        assert.deepEqual(registered.map((item) => item.radius),
          room.interactables.map((item) => observatoryElement(item.id).radius),
          `${roomId}: every registered control keeps its authored interaction radius`);
        assert.ok(registered.every((item) => typeof item.onInteract === 'function'
          && typeof item.isEnabled === 'function' && typeof item.getPrompt === 'function'),
        `${roomId}: every registered control is a live E control (prompt, approach gate, action)`);
        for (const item of registered) {
          assert.ok(String(item.getPrompt()).length > 0, `${roomId}: ${item.id} renders a prompt from the live state`);
        }

        // The callbacks' first reads need a built world, and the refresh that
        // consumes them needs them to exist: registration sits between the two.
        const { sequence } = scene.calls;
        const registeredAt = sequence.indexOf('register');
        assert.ok(registeredAt > sequence.indexOf('buildObservatoryElements') && registeredAt > sequence.indexOf('buildObservatorySolids'),
          `${roomId}: the controls register after the room's art and colliders exist (${sequence.join(' -> ')})`);
        assert.ok(registeredAt < sequence.indexOf('refreshObservatoryDoors') && registeredAt < sequence.indexOf('refreshObservatoryPuzzle'),
          `${roomId}: and before the door/puzzle refresh that consumes the registered state (${sequence.join(' -> ')})`);

        assert.deepEqual(scene.calls.flagWrites, [], `${roomId}: registering the room's controls writes nothing to the save`);
        assert.equal(scene.calls.save, 1, `${roomId}: the room build still saves exactly once`);
        assert.equal(scene.calls.hud, 1, `${roomId}: the build still runs to its own HUD refresh`);
        console.log(`      ${roomId}: ${registered.length}/${room.interactables.length} authored controls registered — ${registered.map((item) => item.id).join(', ')}`);
      }
    },
  },
  {
    name: 'return_loop_writer_is_reachable_from_the_registered_control',
    run: () => {
      // T01 gave the return loop a writer. A writer nothing can reach is no writer:
      // this presses E through the control the room build itself registered.
      const scene = makeRoomBuildScene({
        roomId: 'observatory',
        flags: { 'l8-lumo-room': 'observatory', 'intro-8': true, ...LOOP_PREREQUISITES },
        counters: { ...PUZZLE_COUNTERS },
      });
      buildRoom(scene, 'observatory');

      const control = scene.calls.registrations.find((item) => item.id === 'observatory-stone-return-loop');
      assert.ok(control, 'the room build registers the stone-return-loop control');
      assert.equal(observatoryDoorOpen('return-loop', scene.getObservatoryWorldState()), false, 'the restored room starts with the loop closed');
      assert.equal(scene.calls.strips.length, 0, 'a closed loop raises no strip while the room is built');
      const savesBefore = scene.calls.save;
      const writesBefore = scene.calls.flagWrites.length;

      control.onInteract();

      assert.equal(scene.progress.flags['l8-return-loop-open'], true,
        'pressing the registered control latches l8-return-loop-open');
      assert.deepEqual(scene.calls.flagWrites.slice(writesBefore), [{ key: 'l8-return-loop-open', value: true }],
        'the reachable control writes the loop flag and nothing else');
      assert.equal(scene.calls.save, savesBefore + 1, 'the action saves exactly once');
      assert.equal(scene.calls.strips.length, 1, 'the action raises the loop strip through refreshObservatoryReturnLoop()');
      assert.equal(observatoryDoorOpen('return-loop', scene.getObservatoryWorldState()), true,
        'the world state the level reads is open, so the return route exists');
      assert.equal(scene.calls.say.at(-1)[0].text, OPEN_LOOP_LINE, 'and it answers with the authored sentence');
    },
  },
  {
    name: 'tower_controller_updates_once_per_frame',
    run: () => {
      const perLevel = towerStepPerLevel();
      assert.equal(perLevel[5].length, 1,
        `one frame at index 5 must drive the tower controller exactly once, but the spy recorded ${perLevel[5].length} calls (dt = ${perLevel[5].join(', ')})`);
      assert.equal(perLevel[5][0], 16, 'the tower controller receives the authored 16ms step once');
    },
  },
  {
    name: 'tower_controller_never_runs_at_other_levels',
    run: () => {
      const perLevel = towerStepPerLevel();
      for (const level of LEVELS) {
        if (level === 5) continue;
        assert.equal(perLevel[level].length, 0,
          `the tower spy must record nothing at index ${level}, but it recorded ${perLevel[level].length} call(s)`);
      }
    },
  },
  {
    name: 'every_controller_has_a_single_update_owner',
    run: () => {
      for (const level of LEVELS) {
        const owner = LEVEL_CONTROLLERS.find((entry) => entry.level === level);
        const scene = makeFrameScene(level, owner ? { controllers: [owner.field] } : {});
        stepFrame(scene);
        assert.equal(scene.calls.player, 1, `index ${level}: Nhinh steps exactly once per frame`);
        assert.equal(scene.calls.lantern, 1, `index ${level}: the lantern system ticks exactly once per frame`);
        assert.equal(scene.calls.lumo.length, LUMO_LEVELS.includes(level) ? 1 : 0,
          `index ${level}: Lumo ticks exactly once per frame where update() drives him`);
        assert.equal(scene.calls.observatoryLumo, level === 8 ? 1 : 0,
          `index ${level}: the observatory Lumo route runs exactly once, and only at index 8`);
        assert.equal(scene.calls.observatoryRefresh, level === 8 ? 3 : 0,
          `index ${level}: the observatory crossing/doors/puzzle refresh runs only at index 8`);
        assert.equal(scene.calls.forestEdgeProgress, 1,
          `index ${level}: the forest-edge tick is still called once per frame (it gates itself by index)`);
        assert.equal(scene.calls.forestEdgeGuide, 1,
          `index ${level}: the forest-edge guide tick is still called once per frame (it gates itself by index)`);
        assert.equal(scene.calls.woodsFirefly, level === 1 ? 1 : 0,
          `index ${level}: the firefly route ticks only at index 1`);
        assert.equal(scene.calls.controller.length, owner ? 1 : 0, owner
          ? `index ${level}: ${owner.field} must be updated exactly once per frame`
          : `index ${level}: no dedicated controller is alive, so none may be updated`);
        assert.equal(scene.calls.interactions, 1, `index ${level}: the prompt system still updates exactly once per frame`);
        assert.equal(scene.calls.hud, 1, `index ${level}: the HUD refresh still runs once per frame`);
        assert.equal(scene.calls.dialogue, 1, `index ${level}: the dialogue system still ticks once per frame`);
      }
    },
  },
  {
    name: 'legacy_campaign_pass_skipped_for_controller_levels',
    run: () => {
      const excluded = legacyPassExcludedLevels();
      for (const level of LEVELS) {
        const owner = LEVEL_CONTROLLERS.find((entry) => entry.level === level);
        const scene = makeFrameScene(level, owner ? { controllers: [owner.field] } : {});
        stepFrame(scene);
        if (excluded.includes(level)) {
          assert.ok(owner, `index ${level} skips the generic pass, so one of the dedicated controllers must own it`);
          assert.deepEqual(scene.calls.legacy, [],
            `index ${level}: ${owner.field} owns the frame, so the generic puzzle/barrier/art pass must be skipped`);
          assert.equal(scene.calls.controller.length, 1, `index ${level}: ${owner.field} receives exactly one update`);
          // shatteredCreek.update() and libraryLevel.update() take no delta at
          // all; every call site that does pass one passes the authored step.
          const [call] = scene.calls.controller;
          if (call.dt !== undefined) assert.equal(call.dt, 16, `index ${level}: ${owner.field} receives the authored 16ms step`);
        } else {
          assert.deepEqual(scene.calls.legacy, LEGACY_PASS,
            `index ${level} has no controller owning the generic pass, so the scene's own refresh still runs there`);
        }
      }
      // Index 2 is the one controller level the guard keeps on the generic pass,
      // and deliberately so: LibraryLevel owns the whole memory-ring puzzle (the
      // scene holds no level-2 puzzle methods any more), and neither updatePuzzle()
      // nor updateCampaignBarriers() branches on level 2, so the pass there does no
      // level-2 work. Every other controller level must be guarded off it.
      for (const { level, field } of LEVEL_CONTROLLERS) {
        if (level === 2) continue;
        assert.ok(excluded.includes(level),
          `index ${level}: ${field} owns the frame, so the generic pass must not run there`);
      }
    },
  },
  {
    name: 'heart_recall_drops_assignment_and_route',
    run: () => {
      // The shipped recall path: recalling a Lumo who is holding or travelling ends the assignment at
      // once — the mark and the in-flight route are dropped and the save is written immediately.
      for (const from of ['holding', 'travelling']) {
        const scene = makeHeartRecallScene({
          lumoMode: from,
          flags: { 'l9-called-heart': true, 'l9-at-heart': from === 'holding' },
        });
        runHeartRecall(scene);
        assert.equal(scene.lumoMode, 'follow', `recall from ${from}: Lumo returns to following`);
        assert.equal(scene.progress.flags['l9-called-heart'], false, `recall from ${from}: the current assignment is cleared`);
        assert.equal(scene.progress.flags['l9-at-heart'], false, `recall from ${from}: the arrival mark is cleared`);
        assert.equal(scene.calls.save, 1, `recall from ${from}: the recall saves immediately, so a reload cannot re-hold`);
        assert.equal(scene.calls.say.length, 1, `recall from ${from}: the recall answers once`);
      }
      // Calling him from follow still assigns the seal: `l9-called-heart` is the current assignment.
      const called = makeHeartRecallScene({ lumoMode: 'follow', flags: {} });
      runHeartRecall(called);
      assert.equal(called.lumoMode, 'travelling', 'calling Lumo from follow starts the route');
      assert.equal(called.progress.flags['l9-called-heart'], true, 'calling Lumo records the current assignment');
      assert.equal(called.progress.flags['l9-at-heart'], undefined, 'calling does not mark arrival before he arrives');
      assert.equal(called.calls.save, 1, 'calling Lumo saves once');
    },
  },
  {
    name: 'heart_travelling_lumo_promotes_only_on_arrival',
    run: () => {
      // A reload can leave Lumo in transit: the frame driver keeps him travelling — no power, no save —
      // until he is genuinely inside the seal radius, and only then flips him to holding.
      const travelling = makeHeartDriveScene({ lumoMode: 'travelling', x: 320, y: 184 });
      runHeartDrive(travelling);
      assert.equal(travelling.lumoMode, 'travelling', 'a Lumo 60px out is still travelling after a frame');
      assert.equal(travelling.progress.flags['l9-at-heart'], undefined, 'travel does not mark arrival');
      assert.equal(travelling.calls.save, 0, 'a frame of travel saves nothing');

      travelling.lumo.sprite.x = 320;
      travelling.lumo.sprite.y = 244;
      runHeartDrive(travelling);
      assert.equal(travelling.lumoMode, 'holding', 'arrival inside the seal radius flips him to holding');
      assert.equal(travelling.progress.flags['l9-at-heart'], true, 'the arrival marks him at the seal');
      assert.equal(travelling.calls.save, 1, 'the arrival saves once');
      assert.equal(travelling.calls.say.length, 1, 'the arrival plays its one exchange');
    },
  },
  {
    name: 'heart_latch_ends_the_assignment_before_it_saves',
    run: () => {
      // The shipped `interact()` at the confirmation node. Latching ends the assignment the way a recall
      // does: `l9-called-heart` is the *current* assignment, so it is cleared with the arrival mark and
      // both clears are in the save the latch writes — a latched reload cannot resurrect a phantom one.
      const scene = makeHeartLatchScene({
        lumoMode: 'holding',
        flags: { 'l9-called-heart': true, 'l9-at-heart': true, 'l9-lantern-placed': true },
      });
      runHeartLatch(scene);
      assert.equal(scene.progress.flags['l9-roots'], true, 'the latch still latches the root loop');
      assert.equal(scene.lumoMode, 'follow', 'the latch returns Lumo to following');
      assert.equal(scene.progress.flags['l9-called-heart'], false, 'the latch clears the current assignment');
      assert.equal(scene.progress.flags['l9-at-heart'], false, 'the latch clears the arrival mark');
      assert.equal(scene.calls.save, 1, 'the latch saves once');
      assert.equal(scene.calls.refresh, 1, 'the latch repaints once');
      assert.deepEqual(scene.calls.savedFlags, scene.progress.flags,
        'the latch saves the cleared flags, never the assignment it just ended');
      assert.equal(scene.calls.savedFlags['l9-called-heart'], false,
        'the saved assignment is already false — the clears precede the save');
      // Read back the way `build()` does: the latched save reloads Lumo following, with the roots holding.
      assert.equal(resolveHeartLumoMode({ called: scene.calls.savedFlags['l9-called-heart'] === true, distanceToSeal: 0 }), 'follow',
        'the latched save reloads Lumo following, not holding the seal');

      // A latch that is not ready still refuses and writes nothing.
      const refused = makeHeartLatchScene({ lumoMode: 'holding', flags: { 'l9-called-heart': true }, ready: false });
      runHeartLatch(refused);
      assert.equal(refused.progress.flags['l9-roots'], undefined, 'an unready configuration never latches');
      assert.equal(refused.calls.save, 0, 'an unready configuration saves nothing');
      assert.equal(refused.progress.flags['l9-called-heart'], true, 'an unready press leaves the assignment alone');
    },
  },
  {
    name: 'observatory_hint_index_follows_the_ladder_not_the_objective',
    run: () => {
      // Two sub-objectives (door A unlatched, then latched) share the network ladder: the index must carry on, not restart.
      const scene = makeScene({ lanternPlaced: true, roomId: 'entrance' });
      const base = scene.getObservatoryWorldState();
      assert.equal(base.lanternPlaced, true, 'the fixture is inside the network solve');
      let current = base;
      scene.getObservatoryWorldState = () => current;
      scene.hintIndex = 0;
      scene.observatoryHintLadderKey = '';
      const lastSaid = () => scene.calls.say.at(-1)[0].text;
      const unlatched = { ...base, doorALatched: false };
      const latched = { ...base, doorALatched: true };
      const ladder = observatoryGuidance('entrance', base).hints;
      assert.notEqual(observatoryGuidance('entrance', unlatched).objective, observatoryGuidance('entrance', latched).objective,
        'the two fixtures must show different objective rows');
      assert.deepEqual(observatoryGuidance('entrance', latched).hints, ladder, 'the two fixtures must share one ladder');
      current = unlatched;
      runShowHint(scene);
      assert.equal(lastSaid(), ladder[0], 'the first press shows Mức 1');
      current = latched;
      runShowHint(scene);
      assert.equal(lastSaid(), ladder[1],
        `a new sub-objective on the same ladder must continue at Mức 2, but the index restarted (said: ${lastSaid()})`);
    },
  },
  {
    name: 'observatory_hint_index_resets_when_the_ladder_changes',
    run: () => {
      const scene = makeScene({ lanternPlaced: true, roomId: 'entrance' });
      const base = scene.getObservatoryWorldState();
      let current = base;
      scene.getObservatoryWorldState = () => current;
      scene.hintIndex = 0;
      scene.observatoryHintLadderKey = '';
      const lastSaid = () => scene.calls.say.at(-1)[0].text;
      const ladder = observatoryGuidance('entrance', base).hints;
      const lampMissing = { ...base, lanternPlaced: false };
      const lampLadder = observatoryGuidance('entrance', lampMissing).hints;
      assert.notDeepEqual(lampLadder, ladder, 'the two fixtures must use different ladders');
      runShowHint(scene);
      runShowHint(scene);
      assert.equal(lastSaid(), ladder[1], 'the network ladder has advanced to Mức 2');
      current = lampMissing;
      runShowHint(scene);
      assert.equal(lastSaid(), lampLadder[0], 'a different ladder starts again at its own Mức 1');
      current = base;
      runShowHint(scene);
      assert.equal(lastSaid(), ladder[0], 'returning to the network ladder is a ladder change too, so it restarts at Mức 1');
    },
  },
  {
    name: 'level_seven_to_eight_releases_the_ruins_controller',
    run: () => {
      // The level-8 branch of buildLevel() returns early; the ruins controller must be released before that return.
      let destroyed = 0;
      const ruins = {
        destroy() { destroyed += 1; },
        update() { throw new Error('the ruins controller ticked after leaving level 7'); },
      };
      const observatoryBuilds = [];
      const scene = {
        progress: { level: 8, roomId: 'observatory' },
        ruinsLevel: ruins,
        buildObservatoryRoom(roomId) { observatoryBuilds.push(roomId); },
      };
      runBuildLevel(scene);
      assert.equal(destroyed, 1, `the level-7 ruins controller must be destroyed once on entering level 8, but destroy() ran ${destroyed} time(s)`);
      assert.equal(scene.ruinsLevel, undefined, 'the ruins field is nulled so no later frame can tick it');
      assert.deepEqual(observatoryBuilds, ['observatory'], 'level 8 still builds its observatory room');
    },
  },
  {
    name: 'completed_save_redirect_skips_the_frame_before_the_scene_is_built',
    run: () => {
      // create() returns before player, dialogue and interactions exist when it redirects; update() must stop at the flag.
      const redirected = { redirecting: true, progress: { level: 0, flags: {}, counters: {} } };
      stepFrame(redirected);
      const live = makeFrameScene(0);
      stepFrame(live);
      assert.equal(live.calls.player, 1, 'control: a live frame still steps the player');
    },
  },
  {
    name: 'garden_lumo_target_stays_above_the_status_band',
    run: () => {
      // Lumo's target is clamped per level; the sprite sits 12px above it, so every target must stay clear of the band at y 320.
      for (const level of LUMO_LEVELS) {
        for (const playerY of [0, 150, 290, 330, 400, 900]) {
          const scene = makeFrameScene(level);
          // The level-0 clamp applies only once Lumo has met Nhinh.
          if (level === 0) scene.progress.flags['l0-lumo-met'] = true;
          scene.player.y = playerY;
          stepFrame(scene);
          const [call] = scene.calls.lumo;
          const limit = level === 6 ? 300 : 320;
          assert.ok(call.y <= limit, `level ${level}, player y ${playerY}: Lumo's target y ${call.y} must stay at or above ${limit}`);
        }
      }
    },
  },
  {
    name: 'observatory_caption_sits_below_the_mission_plate',
    run: () => {
      const plateBottom = missionPlateBottom();
      const scene = makeCaptionScene();
      runObservatoryCaption(scene, 'Lumo: caption');
      const [caption] = scene.calls.texts;
      assert.ok(caption.y >= plateBottom,
        `the caption at y ${caption.y} must sit below the tallest mission plate (bottom y ${plateBottom})`);
    },
  },
];

/* ------------------------------------------------------------------ *
 * 5. Runner
 * ------------------------------------------------------------------ */

const failures = [];
for (const testCase of CASES) {
  try {
    testCase.run();
    console.log(`PASS  ${testCase.name}`);
  } catch (error) {
    failures.push(testCase.name);
    console.log(`FAIL  ${testCase.name}`);
    for (const line of String(error.message).split('\n')) console.log(`        ${line}`);
  }
}
console.log(`\ncampaign runtime: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
