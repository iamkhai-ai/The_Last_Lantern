import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { PATH_CHALK_FIREFLY, PATH_INK_CORRIDOR, PATH_ROOMS, PATH_TUBE_MOUTHS, getPathElementArtRect, isPathSeal, pathCallLabel } from '../src/data/pathForTwoLayout.ts';

// Like check-path-for-two.mjs, execute shipped methods without importing browser-only Phaser.
const file = new URL('../src/levels/PathForTwoLevel.ts', import.meta.url);
const ast = ts.createSourceFile(file.pathname, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const controller = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'PathForTwoLevel');
function compile(name, symbols = {}) {
  const method = controller?.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(ast) === name);
  assert.ok(method?.body, `the shipped ${name}() exists`);
  const js = ts.transpileModule(`const unit = function(${method.parameters.map(p => p.getText(ast)).join(',')}) ${method.body.getText(ast)};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(symbols), `${js}\nreturn unit;`)(...Object.values(symbols));
}

/** A module-level constant of the shipped controller, read from its source (never hand-copied). */
function constant(name) {
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find((item) => item.name.getText(ast) === name);
    if (declaration?.initializer) {
      const js = ts.transpileModule(`const __value = (${declaration.initializer.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
      return new Function(`${js}\nreturn __value;`)();
    }
  }
  throw new Error(`the shipped controller declares no constant ${name}`);
}
const ENVIRONMENT_KEYS = {
  entry: 'art_05_a_path_for_two_entry_environment_base',
  relay: 'art_05_a_path_for_two_relay_environment_base',
  ink: 'art_05_a_path_for_two_ink_environment_base',
};
function render(room, key = ENVIRONMENT_KEYS[room], textureExists = true) {
  const drawn = [], collisionRects = [], overlays = [], textureLookups = [];
  const makeObject = (kind, args) => {
    const object = {
      kind, args, active: true, scaleX: 1, scaleY: 1, width: 640, height: 360, commands: [], data: new Map(),
      setOrigin(x, y = x) { this.origin = [x, y]; return this; },
      setDepth(value) { this.depth = value; return this; },
      setTint(value) { this.tint = value; return this; },
      setVisible(value) { this.visible = value; return this; },
      setRotation(value) { this.rotation = value; return this; },
      setDisplaySize(width, height) { this.displaySize = [width, height]; return this; },
      setData(name, value) { this.data.set(name, value); return this; },
      fillStyle(...values) { this.commands.push(['fillStyle', ...values]); return this; },
      fillRect(...values) { this.commands.push(['fillRect', ...values]); return this; },
      lineStyle(...values) { this.commands.push(['lineStyle', ...values]); return this; },
      strokeRect(...values) { this.commands.push(['strokeRect', ...values]); return this; },
    };
    drawn.push(object);
    return object;
  };
  const symbols = {
    tr: (text) => text,
    PATH_ROOMS, PATH_INK_CORRIDOR, PATH_TUBE_MOUTHS, getPathElementArtRect, pathCallLabel, isPathSeal, PATH_CHALK_FIREFLY,
    CALL_PLAQUES: constant('CALL_PLAQUES'), SEAL_INKS: constant('SEAL_INKS'), getPathClueArtKey: (name) => name,
    getLevelArtKey(level, filename) {
      assert.equal(level, 4, 'Level 05 uses its existing zero-based art index');
      return filename === `${room}-environment-base` ? key : filename;
    },
  };
  const level = {
    room, objects: [], colliders: [], bodies: [], protected: [], lanternOn: true,
    doorImages: new Map(), doorBraceImages: new Map(), doorHeaderImages: new Map(), doorPostImages: new Map(), doorBodies: new Map(),
    progress: { flags: {}, counters: {} }, route: [{ room, x: 100, y: 200 }], routeIndex: 0,
    player: { sprite: {}, x: 100, y: 200 }, interactions: { clear() {} },
    scene: {
      add: Object.fromEntries(['image', 'tileSprite', 'graphics', 'rectangle', 'text'].map(kind => [kind, (...args) => makeObject(kind, args)])),
      textures: { exists(value) { textureLookups.push(value); return value === ENVIRONMENT_KEYS[room] && textureExists; } },
      physics: { add: {
        existing(object, isStatic) {
          assert.equal(isStatic, true);
          const [x, y, width, height] = object.args;
          collisionRects.push({ x: x - width / 2, y: y - height / 2, width, height });
          object.body = { gameObject: object };
        },
        collider(player, object) { assert.equal(player, level.player.sprite); return { object }; },
      } },
    },
    drawTubeRoutes() { overlays.push('routes'); },
    drawStationSchematic() { overlays.push('schematic'); },
    addDoors() { overlays.push('doors'); },
    registerRoomInteractions() { overlays.push('interactions'); },
    refreshArt() { overlays.push('state-art'); },
  };
  for (const name of ['drawRoom', 'addCollider', 'addNativeArt', 'depthAt', 'track', 'callMark', 'addClueImage', 'sealMark']) level[name] = compile(name, symbols);
  const layoutBefore = structuredClone(PATH_ROOMS);
  const gameplayBefore = JSON.stringify([level.progress, level.route, level.routeIndex, level.player]);
  level.drawRoom();
  assert.deepEqual(PATH_ROOMS, layoutBefore, 'rendering never mutates layout geometry');
  assert.equal(JSON.stringify([level.progress, level.route, level.routeIndex, level.player]), gameplayBefore, 'rendering never mutates gameplay state');
  assert.deepEqual(collisionRects, [...PATH_ROOMS[room].walls, ...PATH_ROOMS[room].solids].map(({ x, y, width, height }) => ({ x, y, width, height })), 'all original walls and solids still create identical colliders');
  assert.equal(level.colliders.length, collisionRects.length);
  assert.equal(level.bodies.length, collisionRects.length);
  // The dynamic overlays (routes, schematic, doors, controls, state art) run after the environment in every room.
  const expectedOverlays = ['routes', 'schematic', 'doors', 'interactions', 'state-art'];
  assert.deepEqual(overlays, expectedOverlays, 'dynamic overlays and controls still run after the environment');
  for (const element of PATH_ROOMS[room].elements) {
    const image = drawn.find(object => object.data.get('path-id') === element.id);
    const art = getPathElementArtRect(element);
    assert.deepEqual(image?.args, [art.x + art.width / 2, art.y + art.height / 2, element.art], `${element.id} keeps its object sprite and placement`);
    assert.ok(image.depth > 1, 'object sprites stay above the environment');
  }
  if (room === 'ink') {
    // Scenario v2: the corridor route is the clue image `ink-route-dark` (lantern off) at the corridor's own centre.
    assert.ok(drawn.some(object => object.kind === 'image' && object.args[2] === 'ink-route-dark' && object.args[0] === 302 && object.args[1] === 254 && object.depth === 4),
      'the state-specific ink overlay is still drawn (scenario v2 clue art)');
  }
  return { drawn, level, textureLookups };
}

function assertOriginalMaterials(result, room) {
  const floor = result.drawn.find(object => object.kind === 'tileSprite' && object.args[4] === 'ground_stone');
  assert.ok(floor, 'the original tiled floor is drawn');
  assert.deepEqual(floor.args, [0, 0, 640, 360, 'ground_stone']);
  assert.deepEqual(floor.origin, [0, 0]);
  assert.equal(floor.tint, room === 'ink' ? 0x8f8f87 : 0xb4a88d);
  assert.equal(floor.depth, 0);
  const walls = result.drawn.find(object => object.kind === 'graphics' && object.depth === 1);
  assert.deepEqual(walls?.commands, [
    ['fillStyle', 0x302b28, 0.96],
    ...PATH_ROOMS[room].walls.map(({ x, y, width, height }) => ['fillRect', x, y, width, height]),
    ['lineStyle', 2, 0x716351, 0.7],
    ...PATH_ROOMS[room].walls.map(({ x, y, width, height }) => ['strokeRect', x, y, width, height]),
  ], 'the original wall rectangles and styles are unchanged');
  assert.equal(result.drawn.some(object => object.kind === 'image' && Object.values(ENVIRONMENT_KEYS).includes(object.args[2])), false);
}

const cases = ['entry', 'relay', 'ink'].flatMap(room => [
  [`${room} uses the available native environment image`, () => {
    const key = ENVIRONMENT_KEYS[room];
    const result = render(room);
    const background = result.drawn.find(object => object.kind === 'image' && object.args[2] === key);
    assert.ok(background, `${room} draws ${room}-environment-base when its key and texture exist`);
    assert.deepEqual(background.args, [0, 0, key]);
    assert.deepEqual(background.origin, [0, 0]);
    assert.equal(background.depth, 0);
    assert.equal(background.scaleX, 1);
    assert.equal(background.scaleY, 1);
    assert.equal(background.displaySize, undefined, 'the 640x360 source is not resized');
    assert.ok(result.level.objects.includes(background), 'the background participates in normal room cleanup');
    assert.equal(result.drawn.some(object => object.kind === 'tileSprite' && object.args[4] === 'ground_stone'), false);
    assert.equal(result.drawn.some(object => object.kind === 'graphics' && object.depth === 1), false, 'generic walls do not paint over the image');
    assert.deepEqual(result.textureLookups, [key], 'each room consults only its own environment texture');
  }],
  [`${room} missing art key retains the original materials`, () => {
    const result = render(room, null);
    assertOriginalMaterials(result, room);
    assert.deepEqual(result.textureLookups, [], 'a missing key never reaches the texture manager');
  }],
  [`${room} missing texture retains the original materials`, () => {
    const result = render(room, ENVIRONMENT_KEYS[room], false);
    assertOriginalMaterials(result, room);
    assert.deepEqual(result.textureLookups, [ENVIRONMENT_KEYS[room]]);
  }],
]);
let failures = 0;
for (const [name, run] of cases) {
  try { run(); console.log(`PASS  ${name}`); }
  catch (error) { failures += 1; console.error(`FAIL  ${name}\n      ${error.message}`); }
}
console.log(`\nLevel 05 room environments: ${cases.length - failures}/${cases.length} passed.`);
process.exitCode = failures ? 1 : 0;
