/**
 * Levels 05-10 repair — T05: which control wins the E prompt, on the shipped selector.
 *
 * Run with:  node scripts/check-interaction-targets.mjs
 *
 * `src/systems/InteractionSystem.ts` imports Phaser and its own imports are extensionless, so a
 * plain `import()` of the module does not resolve under Node (verified before writing this file).
 * Exactly like scripts/check-campaign-runtime.mjs, this check therefore pulls the *shipped*
 * `update()` and `tryInteract()` method bodies out of src/systems/InteractionSystem.ts with the
 * TypeScript compiler API, transpiles them, and binds them to a recording stand-in for the prompt
 * ports. Renaming either method, or moving the selection out of `update()`, fails here loudly
 * instead of silently passing.
 *
 * The L05 and L09 cases do not re-author geometry: the delivered interactables are produced by the
 * shipped registration code (`PathForTwoLevel.registerRoomInteractions()` and
 * `CampaignScene.registerObservatoryInteractable()` run against a recording `interactions.register`)
 * and the standing positions come from each level's own walkability predicate. A target that cannot
 * be selected from a legal standing position fails this check rather than being papered over.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { layoutInteractionPrompt } from '../src/systems/interactionPromptLayout.ts';
import {
  choosePathCallAction, isPathApproachAllowed, isPathDoorApproachAllowed, isPathInteractHeld, isPathPositionSafe,
  isPathSeal, PATH_CONTROL_STANDS, PATH_DOOR_FACES, PATH_ELEMENT_RADIUS, PATH_ROOMS,
} from '../src/data/pathForTwoLayout.ts';
import { OBSERVATORY_ROOMS } from '../src/data/observatoryRooms.ts';
import {
  isObservatoryApproachAllowed, isObservatoryPositionSafe, observatoryArtRect, observatoryElement,
  observatoryElementSolid, observatoryPrompt, observatorySolidRects, OBSERVATORY_ROOT_BED,
} from '../src/data/observatoryLayout.ts';
import {
  canReachHeartElement, getHeartElement, HEART_CONFIRM_ID, HEART_CONTROL_ORDER, HEART_G0_ID, heartActorBody,
  HEART_MAT_ID, HEART_SEAL_ID, isHeartPositionSafe, isInsideHeartGate,
} from '../src/data/heartOfElariaLayout.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const INTERACTION_FILE = join(rootDir, 'src/systems/InteractionSystem.ts');
const PATH_FILE = join(rootDir, 'src/levels/PathForTwoLevel.ts');
const SCENE_FILE = join(rootDir, 'src/scenes/CampaignScene.ts');
const HEART_FILE = join(rootDir, 'src/levels/HeartOfElariaLevel.ts');
const TOWER_FILE = join(rootDir, 'src/levels/SleeplessTowerLevel.ts');
const GARDEN_FILE = join(rootDir, 'src/levels/SleepingGardenLevel.ts');
const RUINS_FILE = join(rootDir, 'src/levels/RuinsOfTwoHalvesLevel.ts');
const observatoryLayoutSource = readFileSync(join(rootDir, 'src/data/observatoryLayout.ts'), 'utf8');

const parsed = new Map();
const parse = (file) => {
  if (!parsed.has(file)) parsed.set(file, ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true));
  return parsed.get(file);
};
const INTERACTION_SOURCE = parse(INTERACTION_FILE);
const PATH_SOURCE = parse(PATH_FILE);
const SCENE_SOURCE = parse(SCENE_FILE);
const HEART_SOURCE = parse(HEART_FILE);

/** The north probe used by the L05 barrier case: above latch C's own block, inside the room band. */
const L05_NORTH_PROBE = { x: 550, y: 150 };

/* ------------------------------------------------------------------ *
 * 1. Extraction: the shipped selection logic, not a copy of it
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

function methodSource(file, methodName, owner) {
  const method = findNode(file, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === methodName);
  assert.ok(method, `${owner} still declares ${methodName}()`);
  assert.ok(method.body, `${methodName}() still has a body`);
  return nodeText(method.body);
}

function transpile(code, label) {
  try {
    return ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
  } catch (error) {
    throw new Error(`could not compile ${label}: ${error.message}`);
  }
}

function localFunction(file, name) {
  const declaration = findNode(file, (node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `${name} is still authored in its source file`);
  const js = transpile(nodeText(declaration), name);
  const radiusPadding = localConstant(file, 'INTERACTION_RADIUS_PADDING');
  return new Function('INTERACTION_RADIUS_PADDING', `"use strict";\n${js}\nreturn ${name};`)(radiusPadding);
}

/**
 * Compile one extracted method body into a callable bound to a fake `this`. The method's parameters
 * are part of its signature, not of the extracted body, so they arrive through an env object; every
 * layout symbol the body closes over is passed in as a parameter.
 */
function compile(file, methodName, owner, params, symbols) {
  const names = Object.keys(symbols);
  const body = methodSource(file, methodName, owner);
  const decl = params.map((name) => `const ${name} = __params.${name};`).join('\n');
  const js = transpile(`const __unit = function (__params) { ${decl}\n${body} };`, `${owner}.${methodName}()`);
  let unit;
  try {
    unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...names.map((name) => symbols[name]));
  } catch (error) {
    throw new Error(`could not bind ${owner}.${methodName}() extracted from its source: ${error.message}`);
  }
  const toParams = params.length
    ? (args) => Object.fromEntries(params.map((name, index) => [name, args[index]]))
    : () => ({});
  // Called as a method (`this.prompt('latch-c')`) the way the shipped code calls it.
  return function extractedMethod(...args) {
    return unit.call(this, toParams(args));
  };
}

const effectiveRadius = localFunction(INTERACTION_SOURCE, 'effectiveRadius');
const runUpdate = compile(INTERACTION_SOURCE, 'update', 'InteractionSystem',
  ['playerX', 'playerY', 'canInteract', 'playerBounds', 'protectedBounds'], { layoutInteractionPrompt, effectiveRadius });
const runTryInteract = compile(INTERACTION_SOURCE, 'tryInteract', 'InteractionSystem', ['now'], { effectiveRadius });
/** The room-change path: `drawRoom()` calls this before a room registers its own controls. */
const runClear = compile(INTERACTION_SOURCE, 'clear', 'InteractionSystem', [], {});

/**
 * The shipped Level 10 prompt predicate (`getPrompt: () => this.promptFor(element)`), extracted the
 * same way, plus the gate it consults. Using the real `promptFor()` — not a re-typed copy of the
 * gate — is what makes the case below an assertion about the layout, not about the check.
 */
const heartCanReach = compile(HEART_SOURCE, 'canReach', 'HeartOfElariaLevel', ['element'], { canReachHeartElement });
const heartPromptFor = compile(HEART_SOURCE, 'promptFor', 'HeartOfElariaLevel', ['element'], {
  MAT_MODELS: localConstant(HEART_SOURCE, 'MAT_MODELS'),
  HEART_MAT_ID, HEART_SEAL_ID, HEART_CONFIRM_ID, HEART_G0_ID,
});

/** A stand-in for the parts of HeartOfElariaLevel the shipped prompt predicate reads. */
function makeHeartLevelProbe() {
  const level = {
    player: PROBE,
    progress: { flags: {}, counters: {} },
    lantern: { lanternInHand: true, lanternPlaced: false, lanternOn: false },
    lumoMode: 'follow',
    value: () => 0,
    state: () => ({ latched: false, ready: false, g0Split: false }),
  };
  level.canReach = (element) => heartCanReach.call(level, element);
  level.promptFor = (element) => heartPromptFor.call(level, element);
  return level;
}

/** PLATE_ROOMS is module-local in PathForTwoLevel.ts; read it from the source, never hand-copied. */
function localConstant(file, name) {
  const declaration = findNode(file, (node) => ts.isVariableDeclaration(node) && nodeText(node.name) === name);
  assert.ok(declaration?.initializer, `${name} is still authored in its source file`);
  const js = transpile(`const __value = (${nodeText(declaration.initializer)});`, name);
  return new Function(`"use strict";\n${js}\nreturn __value;`)();
}

/* ------------------------------------------------------------------ *
 * 2. A recording stand-in for the prompt ports of InteractionSystem
 * ------------------------------------------------------------------ */

function makeSystem(interactables) {
  const system = {
    interactables,
    activeTarget: null,
    lastPlayerPosition: { x: 0, y: 0 },
    lastInteractTime: -1e9,
    promptText: {
      text: '',
      width: 60,
      height: 14,
      setText(value) { this.text = String(value); this.width = Math.max(12, String(value).length * 6); },
    },
    promptContainer: {
      visible: false,
      x: 0,
      y: 0,
      setVisible(value) { this.visible = value; },
      setPosition(x, y) { this.x = x; this.y = y; },
    },
    promptBg: { clear() {}, fillStyle() {}, lineStyle() {}, fillRoundedRect() {}, strokeRoundedRect() {} },
  };
  system.update = (playerX, playerY, canInteract = true) =>
    runUpdate.call(system, playerX, playerY, canInteract, undefined, []);
  system.tryInteract = (now) => runTryInteract.call(system, now);
  system.clear = () => runClear.call(system);
  return system;
}

/**
 * The stand-in player the gated controls read. The shipped controls ask the *scene* for the player
 * position (`this.player`), so the fixture shares one mutable probe with them, exactly as a moving
 * player would be shared at runtime.
 */
const PROBE = { x: 0, y: 0 };

/** Select with the shipped `update()`, with every position-driven gate seeing the same probe. */
function selectWith(system, x, y) {
  PROBE.x = x;
  PROBE.y = y;
  for (const item of system.interactables) { item.px = x; item.py = y; }
  system.update(x, y, true);
  return system.activeTarget ? system.activeTarget.id : null;
}

/* ------------------------------------------------------------------ *
 * 3. Real Level 05 and Level 09 registrations, run against a recorder
 * ------------------------------------------------------------------ */

/**
 * The ink room's real controls, produced by the shipped `registerRoomInteractions()`. The fixture
 * shares `PROBE` as the scene's `player`, so every face predicate the shipped `getPrompt`,
 * `isEnabled`, `ownsPosition` and `onInteract` consult sees one moving player, exactly as at
 * runtime. Each helper the shipped bodies call is the shipped body too (`compile` above), with the
 * layout symbols it closes over.
 */
function makePathForTwoInkRoom(flags) {
  const registered = [];
  const scene = {
    room: 'ink',
    interactions: { register: (config) => registered.push(config) },
    doorImages: new Map(),
    imageFor: () => undefined,
    player: PROBE,
    progress: { flags: { ...flags }, counters: {} },
    assignment: 'follow',
    lumoRoom: 'ink',
    interactReleasePending: false,
    interactKey: { isDown: false },
    hasPower: () => false,
    interact: () => {},
    useDoor: () => {},
    registered,
  };
  scene.isInteractKeyDown = compile(PATH_SOURCE, 'isInteractKeyDown', 'PathForTwoLevel', [], {});
  scene.heldInteract = compile(PATH_SOURCE, 'heldInteract', 'PathForTwoLevel', [], { isPathInteractHeld });
  scene.elementFor = compile(PATH_SOURCE, 'elementFor', 'PathForTwoLevel', ['id'], { PATH_ROOMS });
  scene.elementApproach = compile(PATH_SOURCE, 'elementApproach', 'PathForTwoLevel', ['id', 'x', 'y'],
    { PATH_ROOMS, isPathApproachAllowed });
  scene.doorApproach = compile(PATH_SOURCE, 'doorApproach', 'PathForTwoLevel', ['id', 'x', 'y'], { isPathDoorApproachAllowed });
  scene.doorPrompt = compile(PATH_SOURCE, 'doorPrompt', 'PathForTwoLevel', ['id'], {});
  scene.doorEnabled = compile(PATH_SOURCE, 'doorEnabled', 'PathForTwoLevel', ['id'], {});
  scene.prompt = compile(PATH_SOURCE, 'prompt', 'PathForTwoLevel', ['id'],
    { PLATE_ROOMS: localConstant(PATH_SOURCE, 'PLATE_ROOMS'), choosePathCallAction });
  scene.interactionEnabled = compile(PATH_SOURCE, 'interactionEnabled', 'PathForTwoLevel', ['id'], {});
  scene.callMark = compile(PATH_SOURCE, 'callMark', 'PathForTwoLevel', ['id'], {});
  scene.callEligible = compile(PATH_SOURCE, 'callEligible', 'PathForTwoLevel', ['mark'], {});
  compile(PATH_SOURCE, 'registerRoomInteractions', 'PathForTwoLevel', [],
    { PATH_ROOMS, PATH_CONTROL_STANDS, PATH_ELEMENT_RADIUS, isPathSeal, isPathApproachAllowed }).call(scene);
  assert.ok(registered.length >= 6, `the ink room still registers its controls (got ${registered.length})`);
  return scene;
}

/** Status of every control the observatory room authors, in a fresh, nothing-solved state. */
const OBSERVATORY_STATE = {
  doorAUnlocked: false, sunDoorUnlocked: false, rootBedShadowed: false, bridgeEligible: false,
  lumoAtSeal: false, activeBeamRoute: 'off', doorALatched: false, sunDoorLatched: false,
  finalDoorLatched: false, returnLoopOpen: false, bridgeCrossed: false, lanternPlaced: false,
  lanternOn: false, lanternRetrieved: false, lumoRecalled: false, recordRead: false,
  crystalTaken: false, miniatureViewed: false, mirrors: { g0: 0, g1: 0, g2: 0 }, statue: 0,
};

const OBSERVATORY_REGISTER_SYMBOLS = {
  observatoryElement, observatoryPrompt, isObservatoryApproachAllowed, OBSERVATORY_ROOT_BED,
  Phaser: { GameObjects: { Image: class Image {} } },
};

/** Run the shipped per-item registration against a recording scene; returns the real controls. */
function registerObservatoryControls(player = { x: 0, y: 0 }) {
  const registered = [];
  const scene = {
    roomObjects: [],
    interactions: { register: (config) => registered.push(config) },
    player,
    progress: { counters: {}, flags: {} },
    lantern: { lanternPlaced: false, lanternInHand: true, lanternOn: false },
    observatoryMiniatureIndex: 0,
    registered,
    getObservatoryWorldState: () => OBSERVATORY_STATE,
    getObservatoryState: () => ({ rootBedShadowed: false, sunDoorUnlocked: false }),
    value: () => 0,
    save: () => {}, say: () => {}, nextLevel: () => {},
    refreshObservatoryPuzzle: () => {}, refreshObservatoryDoors: () => {},
    refreshObservatoryReturnLoop: () => {}, playObservatoryMemory: () => {},
    isObservatoryCompletionReady: () => false,
  };
  const register = compile(SCENE_SOURCE, 'registerObservatoryInteractable', 'CampaignScene', ['item'],
    OBSERVATORY_REGISTER_SYMBOLS);
  for (const item of OBSERVATORY_ROOMS.observatory.interactables) register.call(scene, item);
  return { scene, registered };
}

/* ------------------------------------------------------------------ *
 * 4. Reachability: which standing positions the level actually allows
 * ------------------------------------------------------------------ */

/** Breadth-first walk over a room's own walkability predicate, seeded at its authored spawn. */
function reachablePositions(spawn, isSafe, { step = 4, max = 60000 } = {}) {
  assert.ok(isSafe(spawn), `the authored spawn (${spawn.x}, ${spawn.y}) is a legal standing position`);
  const key = (point) => `${point.x},${point.y}`;
  const seen = new Map([[key(spawn), { ...spawn }]]);
  const queue = [{ ...spawn }];
  for (let index = 0; index < queue.length && seen.size < max; index += 1) {
    const current = queue[index];
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (seen.has(key(next)) || !isSafe(next)) continue;
      seen.set(key(next), next);
      queue.push(next);
    }
  }
  return [...seen.values()];
}

/** True when the straight line from the feet to the trigger passes through a solid rectangle. */
function segmentCrossesSolid(from, to, rects) {
  const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (rects.some((rect) => x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height)) return true;
  }
  return false;
}

/** The control each legal standing position selects, plus any selection that reaches across a solid. */
function survey(positions, pick, system, targets, barriers, feetOffset) {
  const domains = new Map();
  const crossings = [];
  const byId = new Map(system.interactables.map((item) => [item.id, item]));
  for (const position of positions) {
    const id = pick(position.x, position.y);
    if (!id) continue;
    if (!domains.has(id)) domains.set(id, []);
    domains.get(id).push(position);
    if (!targets.includes(id)) continue;
    const target = byId.get(id);
    const feet = { x: position.x, y: position.y + feetOffset };
    if (segmentCrossesSolid(feet, { x: target.x, y: target.y }, barriers)) crossings.push({ id, position });
  }
  return { domains, crossings };
}

const example = (positions) => (positions && positions.length ? `(${positions[0].x}, ${positions[0].y})` : 'none');

const l05Barriers = () => [
  ...PATH_ROOMS.ink.walls,
  ...PATH_ROOMS.ink.solids,
  ...PATH_DOOR_FACES.filter((face) => face.room === 'ink')
    .map((face) => ({ x: face.x - 22, y: face.base - 30, width: 44, height: 30 })),
];

/* ------------------------------------------------------------------ *
 * 5. Real Level 10 geometry the ownership rule is exercised against
 * ------------------------------------------------------------------ */

const L10_MOON = getHeartElement('heart-moon');
const L10_STATUE = getHeartElement('heart-statue');
const L10_G0 = getHeartElement('heart-g0');
const L10_MEMORY_MIRROR = getHeartElement('heart-memory-mirror');

function moonControl(owns) {
  const hits = { value: 0 };
  return {
    id: 'heart-moon',
    x: L10_MOON.stand.x,
    y: L10_MOON.stand.y,
    radius: L10_MOON.radius,
    getPrompt: () => 'E · Kiểm tra lõi Nguyệt',
    isEnabled: () => true,
    onInteract: () => { hits.value += 1; },
    ...(owns ? { ownsPosition: (x, y) => isInsideHeartGate('heart-moon', { x, y }) } : {}),
    hits,
  };
}

function statueControl() {
  const hits = { value: 0 };
  return {
    id: 'heart-statue',
    x: L10_STATUE.stand.x,
    y: L10_STATUE.stand.y,
    radius: L10_STATUE.radius,
    getPrompt: () => 'E · Xoay tượng',
    isEnabled: () => canReachHeartElement(L10_STATUE, PROBE),
    onInteract: () => { hits.value += 1; },
    px: 0,
    py: 0,
    hits,
  };
}

/**
 * The shipped Level 10 wiring of the Moon cell (`getPrompt: () => this.promptFor(element)`,
 * `isEnabled: () => this.canReach(element)`) plus the ownership opt-in T11 adds. The prompt is the
 * real layout predicate, so this is the control T11 will register — not a fixture prompt. The
 * `imageVisible(element.id)` half of the shipped `isEnabled` is the art being on screen, which the
 * probe always satisfies.
 */
function heartMoonControl(level) {
  const element = L10_MOON;
  const hits = { value: 0 };
  return {
    id: element.id,
    x: element.stand.x,
    y: element.stand.y,
    radius: element.radius,
    getPrompt: () => level.promptFor(element),
    isEnabled: () => level.canReach(element),
    ownsPosition: (x, y) => isInsideHeartGate(element.id, { x, y }),
    onInteract: () => { hits.value += 1; },
    hits,
  };
}

/* ------------------------------------------------------------------ *
 * 6. Cases
 * ------------------------------------------------------------------ */

const CASES = [
  {
    name: 'cell_owner_keeps_the_standing_position',
    run: () => {
      const x = L10_MOON.stand.x;
      const y = L10_STATUE.stand.y + 8;
      assert.equal(isInsideHeartGate('heart-moon', { x, y }), true, 'the probe stands inside the Moon cell');
      assert.ok(Math.hypot(x - L10_STATUE.stand.x, y - L10_STATUE.stand.y) < L10_STATUE.radius,
        'the neighbouring statue is inside its own radius at the probe, so it still competes');

      const shipped = makeSystem([moonControl(false), statueControl()]);
      assert.equal(selectWith(shipped, x, y), 'heart-statue',
        'with no ownsPosition the nearer statue wins, which is exactly today\'s behaviour');

      const owned = makeSystem([moonControl(true), statueControl()]);
      assert.equal(selectWith(owned, x, y), 'heart-moon',
        'a cell that owns the standing position keeps it against a nearer neighbouring prop');
      assert.equal(owned.tryInteract(0), true, 'the E press is accepted at the in-cell position');
      assert.equal(owned.interactables[0].hits.value, 1, 'the owned cell really receives the E action');
    },
  },
  {
    name: 'cell_owner_loses_the_preference_outside_its_cell',
    run: () => {
      const x = L10_MOON.stand.x;
      const y = L10_MOON.gate.y - 10;
      assert.equal(isInsideHeartGate('heart-moon', { x, y }), false, 'the probe stands outside the Moon cell');
      assert.ok(Math.hypot(x - L10_MOON.stand.x, y - L10_MOON.stand.y) < L10_MOON.radius,
        'the cell is still within its radius, so only the ownership test can drop it');

      const owned = makeSystem([moonControl(true), statueControl()]);
      assert.equal(selectWith(owned, x, y), 'heart-statue',
        'outside its cell the owned control is an ordinary candidate and the nearer statue wins');
    },
  },
  {
    name: 'shared_interaction_margin_is_radial_and_matches_e_press',
    run: () => {
      const hits = { value: 0 };
      const target = {
        id: 'item', x: 200, y: 200, radius: 22, getPrompt: () => 'E · Vật phẩm',
        isEnabled: () => true, onInteract: () => { hits.value += 1; },
      };
      const system = makeSystem([target]);

      assert.equal(selectWith(system, 218, 224), 'item',
        'the radial boundary includes the authored 22 px radius plus the 8 px cushion');
      assert.equal(system.promptContainer.visible, true, 'the E prompt is shown at the same boundary');
      assert.equal(system.tryInteract(0), true, 'E accepts the target at that prompt boundary');
      assert.equal(hits.value, 1, 'the in-range press runs exactly one action');

      const outside = makeSystem([target]);
      assert.equal(selectWith(outside, 218, 224.01), null,
        'a position just beyond the radial boundary does not show the prompt');
      assert.equal(outside.promptContainer.visible, false, 'no E prompt is shown outside the shared range');
      assert.equal(outside.tryInteract(1000), false, 'E cannot activate a target without a matching prompt');
      assert.equal(hits.value, 1, 'the out-of-range press runs no action');
    },
  },
  {
    name: 'invalid_candidates_are_never_selected',
    run: () => {
      const owner = (extra) => {
        const hits = { value: 0 };
        return {
          id: 'cell', x: 200, y: 200, radius: 40, getPrompt: () => 'E · Ô', isEnabled: () => true,
          onInteract: () => { hits.value += 1; }, ownsPosition: () => true, hits, ...extra,
        };
      };
      const rival = () => {
        const hits = { value: 0 };
        return {
          id: 'prop', x: 230, y: 200, radius: 40, getPrompt: () => 'E · Vật', isEnabled: () => true,
          onInteract: () => { hits.value += 1; }, ownsPosition: () => true, hits,
        };
      };

      const disabled = makeSystem([owner({ isEnabled: () => false }), rival()]);
      assert.equal(selectWith(disabled, 201, 200), 'prop',
        'an owned control that is disabled is not a candidate at all');

      const farAway = makeSystem([owner({ radius: 10 }), rival()]);
      assert.equal(selectWith(farAway, 219, 200), 'prop',
        'an owned control outside its padded radius is not a candidate even though it owns the position');

      const promptless = makeSystem([owner({ getPrompt: () => null }), rival()]);
      assert.equal(selectWith(promptless, 201, 200), 'prop',
        'an owned control with no prompt is not a candidate');

      const alone = makeSystem([owner({ isEnabled: () => false, getPrompt: () => null })]);
      assert.equal(selectWith(alone, 201, 200), null,
        'when nothing valid remains the prompt is empty rather than falling back to an invalid control');
    },
  },
  {
    name: 'interact_revalidates_prompt_and_ownership',
    run: () => {
      const hits = { value: 0 };
      const owner = {
        id: 'cell', x: 200, y: 200, radius: 40, getPrompt: () => (owner.prompt ? 'E · Ô' : null),
        isEnabled: () => owner.enabled, ownsPosition: () => owner.owns,
        onInteract: () => { hits.value += 1; }, prompt: true, enabled: true, owns: true,
      };
      const system = makeSystem([owner]);

      assert.equal(selectWith(system, 205, 200), 'cell', 'the owned control is selected first');
      assert.equal(system.tryInteract(0), true, 'a press in the unchanged state runs the action');
      assert.equal(hits.value, 1, 'the action ran exactly once');

      // A state change between update() and E must be caught by the press itself.
      selectWith(system, 205, 200);
      owner.owns = false;
      assert.equal(system.tryInteract(1000), false, 'a press after the ownership is lost is refused');
      assert.equal(system.activeTarget, null, 'the refused press clears the stale target');
      assert.equal(hits.value, 1, 'the refused press runs no action');

      selectWith(system, 205, 200);
      owner.prompt = false;
      assert.equal(system.tryInteract(2000), false, 'a press after the prompt disappears is refused');
      assert.equal(hits.value, 1, 'the prompt-less press runs no action');

      owner.prompt = true;
      selectWith(system, 205, 200);
      owner.enabled = false;
      assert.equal(system.tryInteract(3000), false, 'a press after the control is disabled is refused');

      owner.enabled = true;
      selectWith(system, 205, 200);
      system.lastPlayerPosition = { x: 400, y: 200 };
      assert.equal(system.tryInteract(4000), false, 'a press after walking out of range is refused');
      assert.equal(hits.value, 1, 'only the one valid press ever ran the action');

      // A room change clears the registry, which is what drops the target a held E could have fired.
      selectWith(system, 205, 200);
      assert.equal(system.activeTarget?.id, 'cell', 'a target is held before the room change');
      system.clear();
      assert.equal(system.activeTarget, null, 'the room change clears the active target');
      assert.equal(system.interactables.length, 0, 'and the previous room\'s controls');
      assert.equal(system.promptContainer.visible, false, 'and hides the prompt, so nothing contradicts E');
      assert.equal(system.tryInteract(5000), false, 'a press with no target runs nothing');
      assert.equal(hits.value, 1, 'and still no action fired');
    },
  },
  {
    name: 'absent_ownsPosition_keeps_nearest_then_first',
    run: () => {
      const item = (id, x) => ({ id, x, y: 100, radius: 30, getPrompt: () => `E · ${id}`, isEnabled: () => true, onInteract: () => {} });
      // An exact distance tie is the only place registration order is observable.
      assert.equal(selectWith(makeSystem([item('first', 100), item('second', 140)]), 120, 100), 'first',
        'an exact tie still goes to the first registered control');
      assert.equal(selectWith(makeSystem([item('second', 140), item('first', 100)]), 120, 100), 'second',
        'the same tie the other way round goes the other way');
      // And the nearer control wins regardless of registration order.
      assert.equal(selectWith(makeSystem([item('first', 100), item('second', 140)]), 112, 100), 'first',
        'the nearer control wins when it is registered first');
      assert.equal(selectWith(makeSystem([item('second', 140), item('first', 100)]), 128, 100), 'second',
        'the nearer control wins when it is registered second');
      // Opting out explicitly is the same as not having the property at all.
      const optedOut = makeSystem([
        { ...item('first', 100), ownsPosition: () => false },
        { ...item('second', 140), ownsPosition: () => false },
      ]);
      assert.equal(selectWith(optedOut, 120, 100), 'first', 'ownsPosition() === false keeps today\'s rule');
    },
  },
  {
    name: 'g0_memory_tie_stays_stable_and_each_keeps_a_domain',
    run: () => {
      const mirror = (id, element) => {
        const control = {
          id, x: element.stand.x, y: element.stand.y, radius: element.radius,
          getPrompt: () => `E · ${id}`,
          isEnabled: () => canReachHeartElement(element, { x: control.px, y: control.py }),
          onInteract: () => {}, px: 0, py: 0,
        };
        return control;
      };
      const system = makeSystem([mirror('heart-g0', L10_G0), mirror('heart-memory-mirror', L10_MEMORY_MIRROR)]);
      const bisector = (L10_G0.stand.x + L10_MEMORY_MIRROR.stand.x) / 2;
      assert.equal(selectWith(system, bisector, L10_G0.stand.y), 'heart-g0',
        'the exact G0 / Memory tie is decided by the documented registration order');
      assert.ok(HEART_CONTROL_ORDER.indexOf('heart-g0') < HEART_CONTROL_ORDER.indexOf('heart-memory-mirror'),
        'HEART_CONTROL_ORDER still registers G0 before the Memory mirror');

      const g0Only = { x: L10_G0.stand.x, y: L10_G0.stand.y + 2 };
      assert.equal(isHeartPositionSafe(g0Only), true, 'the G0 south approach is a legal standing position');
      assert.equal(selectWith(system, g0Only.x, g0Only.y), 'heart-g0', 'G0 keeps a domain of its own');
      const memoryOnly = { x: L10_MEMORY_MIRROR.stand.x, y: L10_MEMORY_MIRROR.stand.y + 2 };
      assert.equal(isHeartPositionSafe(memoryOnly), true, 'the Memory mirror south approach is legal');
      assert.equal(selectWith(system, memoryOnly.x, memoryOnly.y), 'heart-memory-mirror',
        'the Memory mirror keeps a domain of its own');
    },
  },
  {
    name: 'l05_latch_c_and_door_c_each_have_a_reachable_domain',
    run: () => {
      const scene = makePathForTwoInkRoom({ 'l4-latch-c': true, 'l4-memo': true });
      const system = makeSystem(scene.registered);
      const positions = reachablePositions(PATH_ROOMS.ink.spawn, (point) => isPathPositionSafe('ink', point));
      assert.ok(positions.length > 400, `the ink room is walkable (${positions.length} reachable positions)`);

      const { domains, crossings } = survey(positions, (x, y) => selectWith(system, x, y), system,
        ['l4-latch-c', 'l4-door-c'], l05Barriers(), 19);
      const latchDomain = domains.get('l4-latch-c') ?? [];
      const doorDomain = domains.get('l4-door-c') ?? [];
      assert.ok(latchDomain.length > 0, `latch C (550,218) is selectable from a legal position: ${example(latchDomain)}`);
      assert.ok(doorDomain.length > 0, `door C (574,188) is selectable from a legal position: ${example(doorDomain)}`);
      assert.equal(crossings.length, 0, `E never reaches latch C or door C across a solid: ${JSON.stringify(crossings.slice(0, 4))}`);
      // The control nearest the lens the plan asks this selector to measure never answers through it.
      assert.equal(isPathPositionSafe('ink', L05_NORTH_PROBE), false,
        'the north side of latch C is walled off, so it cannot answer from behind its own block');

      for (const [x, y] of [[559, 198], [567, 208], [550, 218], [574, 188]]) {
        const legal = isPathPositionSafe('ink', { x, y });
        const id = legal ? selectWith(makeSystem(scene.registered), x, y) : null;
        console.log(`      L05 probe (${x},${y}) legal=${legal} selects=${id ?? 'nothing'}`);
      }
      console.log(`      L05 domains: latchC ${latchDomain.length} position(s) ${example(latchDomain)},`
        + ` doorC ${doorDomain.length} position(s) ${example(doorDomain)}`);
      const reachableIds = [...domains.keys()].sort();
      console.log(`      L05 selectable controls: ${reachableIds.join(', ')}`);
    },
  },
  {
    name: 'l09_statue_and_root_bed_each_have_a_reachable_domain',
    run: () => {
      const player = { x: 0, y: 0 };
      const { registered } = registerObservatoryControls(player);
      assert.equal(registered.length, OBSERVATORY_ROOMS.observatory.interactables.length,
        'every authored observatory control is handed to the interaction system');
      const system = makeSystem(registered);
      // The shipped observatory controls read the scene's live player position directly.
      const pick = (x, y) => { player.x = x; player.y = y; return selectWith(system, x, y); };
      const spawn = OBSERVATORY_ROOMS.observatory.spawns[0].position;
      const positions = reachablePositions(spawn,
        (point) => isObservatoryPositionSafe('observatory', point, OBSERVATORY_STATE));
      assert.ok(positions.length > 1000, `the observatory room is walkable (${positions.length} reachable positions)`);

      const barriers = observatorySolidRects('observatory', OBSERVATORY_STATE);
      const { domains, crossings } = survey(positions, pick, system,
        ['observatory-statue', 'observatory-root-bed'], barriers, 19);
      const statueDomain = domains.get('observatory-statue') ?? [];
      const rootDomain = domains.get('observatory-root-bed') ?? [];
      assert.ok(statueDomain.length > 0, `the statue (296,270) is selectable from a legal position: ${example(statueDomain)}`);
      assert.ok(rootDomain.length > 0, `the root bed (330,252) is selectable from a legal position: ${example(rootDomain)}`);
      assert.equal(crossings.length, 0, `E never reaches the statue or root bed across a solid: ${JSON.stringify(crossings.slice(0, 4))}`);

      // The plan's warning: moving the root stand to (352,252) would cross the bed itself.
      const movedStand = { x: 352, y: 252 };
      assert.equal(segmentCrossesSolid({ x: movedStand.x, y: movedStand.y + 19 }, movedStand, barriers), true,
        'the proposed root stand (352,252) sits inside the bed, so it must not be adopted blindly');
      assert.equal(registered.some((item) => item.x === movedStand.x), false,
        'no registered control stands on the bed');

      console.log(`      L09 domains: statue ${statueDomain.length} position(s) ${example(statueDomain)},`
        + ` root-bed ${rootDomain.length} position(s) ${example(rootDomain)}`);
      console.log(`      L09 selectable controls: ${[...domains.keys()].sort().join(', ')}`);

      // Not an assertion: a finding owned by the Level 09 task (T10). The geometry above is the
      // intended, shipped selection behaviour; whether the observatory room reaches this
      // registration at runtime is that task's call site to keep or restore.
      const callSites = (readFileSync(SCENE_FILE, 'utf8').match(/registerObservatoryInteractable\(/g) ?? []).length;
      if (callSites < 2) {
        console.log('      NOTE L09: CampaignScene declares registerObservatoryInteractable() but has no call'
          + ' site for it, and buildLevel() returns before registerLevel() at index 8, so the observatory'
          + ' room never registers these controls at runtime. Owned by the Level 09 task (T10).');
      }
    },
  },
  {
    name: 'l09_statue_answers_only_from_the_south',
    run: () => {
      const statue = observatoryElement('statue');
      const art = observatoryArtRect(statue);
      const south = { x: statue.stand.x, y: statue.stand.y };
      assert.equal(isObservatoryApproachAllowed(statue, south), true, 'the statue answers from its south edge');
      assert.equal(isObservatoryApproachAllowed(statue, { x: statue.stand.x, y: art.y - 6 }), false,
        'the statue stays silent from the north, behind its own art');
      assert.equal(isObservatoryApproachAllowed(statue, { x: art.x - 60, y: statue.stand.y }), false,
        'the statue stays silent from the west');
      assert.equal(isObservatoryApproachAllowed(statue, { x: art.x + art.width + 60, y: statue.stand.y }), false,
        'the statue stays silent from the east');
      assert.deepEqual(observatoryElementSolid(statue), art,
        'the statue\'s collider is its visible art box, never an inflated stand-in for the face rule');

      // The shipped registration must reach the same predicate this case just exercised.
      const away = registerObservatoryControls({ x: 40, y: 100 }).registered
        .find((item) => item.id === 'observatory-statue');
      assert.ok(away, 'the observatory registers a statue control');
      assert.equal(away.isEnabled(), false, 'the registered statue is disabled from outside its approach');
      const atSouth = registerObservatoryControls(south).registered
        .find((item) => item.id === 'observatory-statue');
      assert.equal(atSouth.isEnabled(), true, 'the registered statue is enabled from its own south edge');
      assert.equal(atSouth.radius, statue.radius, 'the registered statue keeps the layout radius');
      assert.equal(atSouth.x, statue.stand.x, 'the registered statue keeps the layout stand');
      assert.equal(atSouth.y, statue.stand.y, 'the registered statue keeps the layout stand');
    },
  },
  {
    name: 'side_door_and_floor_cell_exceptions_keep_their_domain_rule',
    run: () => {
      const rootBed = observatoryElement('root-bed');
      assert.equal(rootBed.approach, 'side', 'the root bed is the documented side-approach exception');
      const bed = observatoryElementSolid(rootBed);
      assert.equal(isObservatoryApproachAllowed(rootBed, { x: bed.x - 10, y: bed.y + bed.height / 2 }), true,
        'the root bed answers from its west face');
      assert.equal(isObservatoryApproachAllowed(rootBed, { x: bed.x + bed.width + 10, y: bed.y + bed.height / 2 }), true,
        'the root bed answers from its east face');
      assert.equal(isObservatoryApproachAllowed(rootBed, { x: rootBed.anchor.x, y: bed.y - 6 }), false,
        'the root bed never answers from the north through the bed itself');
      assert.ok(/Documented exception/.test(observatoryLayoutSource),
        'the side-approach exception carries its reason in the layout data');
      assert.ok(observatoryLayoutSource.includes('west/east face'),
        'the exception names the faces it allows');

      // Rule 2: the Moon cell answers only while the actor stands inside its authored gate.
      const moon = L10_MOON;
      assert.equal(canReachHeartElement(moon, { x: moon.gate.x, y: moon.gate.y }), true,
        'a floor socket answers from inside its gate');
      assert.equal(canReachHeartElement(moon, { x: moon.gate.x, y: moon.gate.y - 1 }), false,
        'a floor socket stays silent one pixel outside its gate');
      const inside = { x: moon.stand.x, y: moon.gate.y + 4 };
      assert.ok(isHeartPositionSafe(inside), 'the Moon cell gate contains a legal standing position');
      const actor = heartActorBody(inside);
      assert.ok(actor.x >= moon.gate.x && actor.x + actor.width <= moon.gate.x + moon.gate.width
        && actor.y >= moon.gate.y && actor.y + actor.height <= moon.gate.y + moon.gate.height,
        'the 14x6 foot body the gate test uses really sits inside the authored cell');
    },
  },
  {
    name: 'opted_in_cell_is_silent_outside_its_own_domain',
    run: () => {
      const level = makeHeartLevelProbe();
      const gate = L10_MOON.gate;
      const stand = L10_MOON.stand;

      // Inside its gate the shipped prompt predicate advertises the cell: the one domain where
      // ownership, prompt, enabled and the press must agree.
      PROBE.x = stand.x;
      PROBE.y = stand.y;
      assert.equal(isInsideHeartGate('heart-moon', PROBE), true, 'the authored Moon stand is inside the cell gate');
      assert.equal(level.canReach(L10_MOON), true, 'the shipped gate accepts the authored stand');
      assert.equal(level.promptFor(L10_MOON), 'E · Kiểm tra lõi Nguyệt',
        'the shipped prompt predicate advertises the cell inside its gate');

      const inside = makeSystem([heartMoonControl(level)]);
      assert.equal(selectWith(inside, stand.x, stand.y), 'heart-moon', 'inside its gate the owned cell is selected');
      assert.equal(inside.promptContainer.visible, true, 'and its prompt is shown');
      assert.equal(inside.tryInteract(0), true, 'and the very same prompt is accepted on E');
      assert.equal(inside.interactables[0].hits.value, 1, 'the cell received the E action');

      // The ownsPosition precondition: outside its own domain an opted-in control must already be
      // silent and disabled, so the prompt the selector shows is always the prompt E will accept.
      const outside = [
        { x: stand.x, y: gate.y - 1, side: 'north' },
        { x: stand.x, y: gate.y + gate.height + 1, side: 'south' },
        { x: gate.x - 1, y: stand.y, side: 'west' },
        { x: gate.x + gate.width + 1, y: stand.y, side: 'east' },
      ];
      for (const point of outside) {
        PROBE.x = point.x;
        PROBE.y = point.y;
        assert.equal(isInsideHeartGate('heart-moon', PROBE), false, `${point.side} of the gate is outside the cell`);
        assert.ok(Math.hypot(point.x - stand.x, point.y - stand.y) <= L10_MOON.radius,
          `${point.side} of the gate still sits inside the cell radius, so only the domain test can drop it`);
        assert.equal(level.promptFor(L10_MOON), null,
          `the real Level 10 prompt predicate is already null ${point.side} of the gate`);

        const system = makeSystem([heartMoonControl(level)]);
        assert.equal(selectWith(system, point.x, point.y), null,
          `an opted-in cell is not selected ${point.side} of its own gate`);
        assert.equal(system.promptContainer.visible, false,
          `no prompt is shown ${point.side} of the gate, so E can never contradict one`);
        assert.equal(system.tryInteract(1000), false, `a press ${point.side} of the gate is refused`);
        assert.equal(system.interactables[0].hits.value, 0, 'and the refused press runs no action');
      }

      console.log('      ownsPosition precondition: the real Moon cell is silent on all four sides of its'
        + ' gate, so prompt, enabled and the press agree');

      // And the same over the whole interaction disc: no position in range may show a prompt that E
      // would then refuse — the failure mode a constant prompt on an opted-in control produces.
      const advertised = [];
      for (let x = stand.x - L10_MOON.radius; x <= stand.x + L10_MOON.radius; x += 1) {
        for (let y = stand.y - L10_MOON.radius; y <= stand.y + L10_MOON.radius; y += 1) {
          if (Math.hypot(x - stand.x, y - stand.y) > L10_MOON.radius) continue;
          PROBE.x = x;
          PROBE.y = y;
          if (!level.promptFor(L10_MOON)) continue;
          advertised.push({ x, y });
          assert.equal(isInsideHeartGate('heart-moon', { x, y }), true,
            `the cell advertises itself at (${x}, ${y}) only because that is inside its gate`);
          const system = makeSystem([heartMoonControl(level)]);
          assert.equal(selectWith(system, x, y), 'heart-moon', `the prompt shown at (${x}, ${y}) belongs to the cell`);
          assert.equal(system.tryInteract(2000), true, `the prompt shown at (${x}, ${y}) is accepted on E`);
        }
      }
      assert.ok(advertised.length > 0, `the cell still advertises itself inside its gate (${advertised.length} position(s))`);
      console.log(`      ownsPosition precondition: ${advertised.length} in-range position(s) advertise the cell,`
        + ' every one of them inside its gate and pressable');
    },
  },
  {
    name: 'bullet_3_audit_of_every_level_registration',
    run: () => {
      for (const row of bullet3Audit()) console.log(`      ${row.verdict}`);
    },
  },
];

/* ------------------------------------------------------------------ *
 * 6b. Bullet 3 — does each level's shipped registration share a layout predicate?
 * ------------------------------------------------------------------ */

const LAYOUT_MODULE = /^\.\.\/data\/\w+Layout$/;

/** The names a file imports from layout data modules — read from the source, never hand-listed. */
function layoutImports(file) {
  const source = parse(file);
  const names = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!LAYOUT_MODULE.test(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) names.push(nodeText(element.name));
  }
  return names;
}

/** A registration body plus the bodies of the `this.<helper>()` methods it consults one level down. */
function registrationText(file, methodName) {
  const source = parse(file);
  const body = methodSource(source, methodName, `the ${methodName}() registration`);
  let text = body;
  const call = /this\.(\w+)\s*\(/g;
  let match = call.exec(body);
  while (match) {
    const helper = findNode(source, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === match[1]);
    if (helper?.body) text += `\n${nodeText(helper.body)}`;
    match = call.exec(body);
  }
  return text;
}

/**
 * One row per campaign level that owns a dedicated controller or scene block. `required: true` marks
 * the levels whose bullet-3 row claims the shared predicate already exists, so that claim cannot
 * silently rot; the gaps owned by other tasks print a NOTE instead of failing T05.
 */
const BULLET_3_ROWS = [
  { level: 'L05', index: 4, label: 'Path for two', owner: 'T06', file: PATH_FILE, method: 'registerRoomInteractions' },
  { level: 'L06', index: 5, label: 'Sleepless tower', owner: 'T07', file: TOWER_FILE, method: 'registerActions', required: true },
  { level: 'L07', index: 6, label: 'Sleeping garden', owner: 'T08', file: GARDEN_FILE, method: 'registerInteractions' },
  { level: 'L08', index: 7, label: 'Ruins of two halves', owner: 'T09', file: RUINS_FILE, method: 'registerInteractions' },
  { level: 'L09', index: 8, label: 'Observatory (scene block)', owner: 'T10', file: SCENE_FILE, method: 'registerObservatoryInteractable' },
  { level: 'L10', index: 9, label: 'Heart of Elaria', owner: 'T11', file: HEART_FILE, method: 'registerInteractions', required: true },
];

/** A predicate-like layout symbol: an approach/face test, not a walkability or state helper. */
const APPROACH_PREDICATE = /(approach|canreach)/i;

function bullet3Audit() {
  return BULLET_3_ROWS.map((row) => {
    const predicates = layoutImports(row.file).filter((name) => APPROACH_PREDICATE.test(name));
    const text = registrationText(row.file, row.method);
    const shared = predicates.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
    if (row.required) {
      assert.ok(shared.length > 0,
        `${row.level} (${row.label}) still routes its standing props through the layout predicate ${predicates.join('/')}`);
    }
    const where = `${row.level} (index ${row.index}, ${row.label}, ${row.owner})`;
    return {
      ...row,
      shared,
      verdict: shared.length
        ? `OK   ${where}: the shipped registration reuses the layout predicate ${shared.join(', ')}`
        : `NOTE ${where}: no layout-owned approach predicate in the standing-prop registration`
          + ` (prompt/enabled agree on state only) — owned by ${row.owner}`,
    };
  });
}

/* ------------------------------------------------------------------ *
 * 7. Runner
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
console.log(`\ninteraction targets: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
