import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { PATH_CONTROL_STANDS, PATH_SCHEMATIC, buildPathSchematic, getPathDoorFace } from '../src/data/pathForTwoLayout.ts';

// The same AST technique as check-path-for-two.mjs: run the shipped method bodies without Phaser.
const file = new URL('../src/levels/PathForTwoLevel.ts', import.meta.url);
const ast = ts.createSourceFile(file.pathname, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const controller = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'PathForTwoLevel');
function methodSource(name) {
  const method = controller?.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(ast) === name);
  assert.ok(method?.body, `the shipped ${name}() exists`);
  return { method, body: method.body.getText(ast) };
}
function compile(name, symbols = {}) {
  const { method, body } = methodSource(name);
  const js = ts.transpileModule(`const unit = function(${method.parameters.map(p => p.getText(ast)).join(',')}) ${body};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(symbols), `${js}\nreturn unit;`)(...Object.values(symbols));
}

function graphics() {
  const commands = [];
  const record = name => (...args) => { commands.push([name, ...args]); };
  const g = {
    commands, mask: undefined,
    fillStyle: record('fillStyle'), fillRect: record('fillRect'), lineStyle: record('lineStyle'),
    strokeRect: record('strokeRect'), beginPath: record('beginPath'), moveTo: record('moveTo'),
    lineTo: record('lineTo'), closePath: record('closePath'), fillPath: record('fillPath'),
    strokePath: record('strokePath'), fillCircle: record('fillCircle'),
    setDepth(value) { commands.push(['setDepth', value]); return this; },
    setMask(mask) { this.mask = mask; return this; },
    createGeometryMask() { return { geometryMask: g, destroy() { this.destroyed = true; } }; },
  };
  return g;
}
function image() {
  return {
    width: 160, height: 16, mask: undefined, setRotation() { return this; }, setDepth() { return this; },
    setData() { return this; }, setCrop() { return this; }, setMask(mask) { this.mask = mask; return this; },
  };
}

const gateRects = room => PATH_CONTROL_STANDS
  .filter(stand => stand.room === room)
  .map(stand => {
    const face = getPathDoorFace(stand.id, room);
    assert.ok(face, `${room}/${stand.id} has a door face`);
    return { x: face.x - 32, y: face.base - 88, width: 64, height: 88 };
  });
const contains = (rect, point) => point.x >= rect.x && point.x <= rect.x + rect.width
  && point.y >= rect.y && point.y <= rect.y + rect.height;

function routeFixture(room) {
  const made = [], images = [];
  const level = {
    room, objects: [], images, routeGraphics: graphics(),
    track(object) { this.objects.push(object); return object; },
    addTubeModules() { made.push('tube'); }, addCable() { made.push('cable'); },
    scene: {
      make: { graphics(config) { assert.ok(!config?.add, 'mask graphics stay out of the display list'); const g = graphics(); level.maskGraphics = g; return g; } },
      add: { image: () => { const item = image(); images.push(item); return item; } },
    },
  };
  const symbols = {
    PATH_CONTROL_STANDS, getPathDoorFace, getLevelArtKey: (_level, key) => key,
    pathRouteCableSegments: points => [{ x: 50, y: 10, angle: 0, length: 40 }],
    pathRouteCorners: () => [{ x: 50, y: 10, angle: 0 }],
  };
  for (const name of ['buildGateMask', 'addTubeModules', 'addCable', 'addNativeArt']) level[name] = compile(name, symbols);
  level.buildGateMask = compile('buildGateMask', symbols);
  level.addTubeModules = compile('addTubeModules', symbols);
  level.addCable = compile('addCable', symbols);
  level.addNativeArt = compile('addNativeArt', symbols);
  return level;
}

function schematic(room) {
  const created = [];
  const level = {
    room, objects: [], track(object) { this.objects.push(object); return object; },
    scene: { add: {
      graphics: () => { const g = graphics(); created.push(g); return g; },
      text: (x, y, value, style) => ({ x, y, value, style, setOrigin() { return this; }, setDepth() { return this; } }),
    } },
  };
  level.drawStationSchematic = compile('drawStationSchematic', { PATH_SCHEMATIC, buildPathSchematic, STATION_MAP_TITLE: 'SƠ ĐỒ TRẠM' });
  level.drawStationSchematic();
  return created[0];
}

const cases = [
  ['gate mask hides the whole 64x88 doorway footprint and nothing else', () => {
    const room = 'ink';
    const level = routeFixture(room);
    level.buildGateMask();
    const gates = gateRects(room);
    assert.equal(level.gateMask?.invertAlpha, undefined, 'the mask is a positive complement, not an inverted stencil');
    const cells = level.maskGraphics.commands.filter(([name]) => name === 'fillRect').map(([, ...rect]) => rect);
    assert.ok(level.maskGraphics.commands.some(([name]) => name === 'fillStyle'), 'the complement is a filled mask');
    for (const gate of gates) {
      assert.deepEqual([gate.width, gate.height], [64, 88]);
      for (const corner of [{ x: gate.x + 1, y: gate.y + 1 }, { x: gate.x + 63, y: gate.y + 87 }]) {
        assert.equal(cells.some(rect => contains({ x: rect[0], y: rect[1], width: rect[2], height: rect[3] }, corner)), false,
          `gate corner ${corner.x},${corner.y} is masked out`);
      }
    }
    for (const point of [{ x: 5, y: 5 }, { x: 635, y: 355 }, { x: 320, y: 20 }, { x: 320, y: 340 }]) {
      assert.equal(cells.some(rect => contains({ x: rect[0], y: rect[1], width: rect[2], height: rect[3] }, point)), true,
        `open floor at ${point.x},${point.y} still shows the wires`);
    }
  }],
  ['only route, tube, cable, elbow and mouth art get the gate mask', () => {
    const room = 'entry';
    const level = routeFixture(room);
    level.buildGateMask();
    level.routeGraphics.setMask(level.gateMask);
    level.addTubeModules([{ x: 10, y: 10 }, { x: 100, y: 10 }]);
    level.addCable('practice', [{ x: 10, y: 10 }, { x: 100, y: 10 }]);
    level.addNativeArt('tube-mouth', 200, 100, 0);
    assert.equal(level.routeGraphics.mask, level.gateMask, 'routeGraphics uses the gate mask');
    assert.ok(level.images.length >= 4, 'tube, cable and mouth art is drawn');
    assert.ok(level.images.every(item => item.mask === level.gateMask), 'every wire image uses the gate mask');
    for (const name of ['addDoors', 'addDoorFrameStrips', 'addDoorBrace']) {
      const { body } = methodSource(name);
      assert.equal(body.includes('gateMask'), false, `${name}() keeps door art above the mask`);
    }
    const drawRoom = methodSource('drawRoom').body;
    assert.ok(drawRoom.indexOf('this.objects.forEach') < drawRoom.indexOf('this.gateMask?.destroy()'),
      'drawRoom clears the masked users before destroying the mask');
    assert.ok(drawRoom.includes('this.gateMaskSource?.destroy()'), 'drawRoom explicitly destroys the mask graphics');
    assert.ok(methodSource('destroy').body.includes('this.gateMask?.destroy()'), 'destroy() explicitly destroys the gate mask');
  }],
  ['the schematic is a chamfered stone plaque, not the black debug panel', () => {
    const room = 'relay';
    const plaque = schematic(room);
    const commands = plaque.commands;
    const fillColours = commands.filter(([name]) => name === 'fillStyle').map(([, colour]) => colour);
    const lineColours = commands.filter(([name]) => name === 'lineStyle').map(([, width, colour]) => ({ width, colour }));
    for (const debug of [0x101617, 0x2c4a41, 0x212728, 0x8fae9a, 0x6f8a7c, 0x9bb99a]) {
      assert.equal(fillColours.includes(debug) || lineColours.some(line => line.colour === debug), false,
        `the debug/mint palette colour ${debug.toString(16)} is gone`);
    }
    const chamferEdges = commands.filter(([name]) => name === 'closePath').length;
    assert.ok(chamferEdges >= 1, 'the outer stone edge is a closed chamfered polygon');
    assert.ok(lineColours.some(line => line.width === 1 && line.colour === 0x8a6a3b), 'the plaque keeps a 1px bronze inner edge');
    assert.equal(commands.filter(([name]) => name === 'fillCircle').length, 4, 'four tiny corner mounting pins');
    assert.ok(fillColours.includes(0x4a3b27) && lineColours.some(line => line.colour === 0xb08a52),
      'the current room is softened amber, not mint');
    assert.ok(lineColours.some(line => line.colour === 0x8c7650), 'the projected room and pipe lines are engraved brass');
    assert.ok(commands.filter(([name]) => name === 'strokeRect').length >= 3, 'all three projected room cells keep their frames');
    const slot = PATH_SCHEMATIC[room];
    assert.ok(commands.some(([name, x, y]) => name === 'moveTo' && x <= slot.x && y <= slot.y), 'the plaque frames the unchanged slot');
  }],
];

let failures = 0;
for (const [name, run] of cases) {
  try { run(); console.log(`PASS  ${name}`); }
  catch (error) { failures += 1; console.error(`FAIL  ${name}\n      ${error.message}`); }
}
console.log(`\nLevel 05 visual layering: ${cases.length - failures}/${cases.length} passed.`);
process.exitCode = failures ? 1 : 0;
