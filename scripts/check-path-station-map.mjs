import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { PATH_ROOMS, PATH_SCHEMATIC, PATH_SCHEMATIC_SIZE, buildPathSchematic, pathActorBody } from '../src/data/pathForTwoLayout.ts';
import { isFootInReach } from '../src/systems/interactionReach.ts';

// Run the shipped PathForTwoLevel method bodies without importing browser-only Phaser.
const file = new URL('../src/levels/PathForTwoLevel.ts', import.meta.url);
const ast = ts.createSourceFile(file.pathname, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const controller = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'PathForTwoLevel');
function methodSource(name) {
  const method = controller?.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(ast) === name);
  assert.ok(method?.body, `the shipped ${name}() exists`);
  return method.body.getText(ast);
}
function compile(name, symbols = {}) {
  const method = controller?.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(ast) === name);
  const js = ts.transpileModule(`const unit = function(${method.parameters.map(p => p.getText(ast)).join(',')}) ${method.body.getText(ast)};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(symbols), `${js}\nreturn unit;`)(...Object.values(symbols));
}
function controllerConstant(name) {
  const declaration = ast.statements.flatMap(node => ts.isVariableStatement(node) ? node.declarationList.declarations : [])
    .find(node => node.name.getText(ast) === name);
  assert.ok(declaration?.initializer, `PathForTwoLevel still authors ${name}`);
  const js = ts.transpileModule(`const value = (${declaration.initializer.getText(ast)});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(`${js}\nreturn value;`)();
}

function recorder() {
  const commands = [];
  const record = name => (...args) => { commands.push([name, ...args]); };
  const g = {
    commands, depth: 0,
    setDepth(value) { this.depth = value; return this; },
    fillStyle: record('fillStyle'), fillRect: record('fillRect'), lineStyle: record('lineStyle'),
    strokeRect: record('strokeRect'), fillRoundedRect: record('fillRoundedRect'), strokeRoundedRect: record('strokeRoundedRect'),
    beginPath: record('beginPath'), moveTo: record('moveTo'), lineTo: record('lineTo'),
    closePath: record('closePath'), fillPath: record('fillPath'), strokePath: record('strokePath'),
    fillCircle: record('fillCircle'), createGeometryMask() { return { destroy() {} }; },
  };
  return g;
}
function text(x, y, value, style) {
  return {
    x, y, value, style, depth: 0, destroyed: false,
    setOrigin() { return this; }, setDepth(v) { this.depth = v; return this; }, destroy() { this.destroyed = true; },
  };
}
function container() {
  return {
    depth: 0, children: [], destroyed: false, active: true,
    setDepth(v) { this.depth = v; return this; },
    add(items) { if (Array.isArray(items)) this.children.push(...items); else this.children.push(items); return this; },
    destroy() { this.destroyed = true; this.active = false; },
  };
}

const cases = [
  ['the small plaque carries one quiet native title above the diagram', () => {
    const created = { texts: [], graphics: [] };
    const level = {
      room: 'entry', objects: [], track(object) { this.objects.push(object); return object; },
      scene: { add: {
        graphics: () => { const g = recorder(); created.graphics.push(g); return g; },
        text: (x, y, value, style) => { const t = text(x, y, value, style); created.texts.push(t); return t; },
      } },
    };
    level.drawStationSchematic = compile('drawStationSchematic', { PATH_SCHEMATIC, buildPathSchematic, STATION_MAP_TITLE: controllerConstant('STATION_MAP_TITLE') });
    level.drawStationSchematic();
    const title = created.texts.find(t => t.value === controllerConstant('STATION_MAP_TITLE'));
    assert.ok(title, 'the plaque title is native world text');
    const size = Number.parseFloat(title.style.fontSize);
    assert.ok(size >= 7 && size <= 8, 'the title stays quiet at 7-8px');
    const slot = PATH_SCHEMATIC.entry;
    assert.ok(title.x === slot.x + slot.width / 2, 'the title is centred on the plaque');
    assert.ok(title.y > slot.y - 5 && title.y < slot.y + 8, 'the title sits above the diagram, inside the plaque');
    assert.equal(created.texts.length, 1, 'no room labels are crammed into the three small cells');
    assert.equal(created.graphics[0].depth, 7, 'the board sits above the route art');
    assert.ok(title.depth >= 7 && title.depth < 9, 'the title sits with the board, below actors and UI');
  }],
  ['the map reads only from the front face at every reachable room sample', () => {
    const level = {
      room: 'entry', canStartStory: () => true, heldInteract: () => false, player: { x: 0, y: 0 },
      stationPlaqueBounds: compile('stationPlaqueBounds', { PATH_SCHEMATIC }),
      atStationPlaque: compile('atStationPlaque', { pathActorBody, isFootInReach }),
    };
    level.stationMapPrompt = compile('stationMapPrompt', {});
    level.stationMapEnabled = compile('stationMapEnabled', {});
    const samples = { entry: { x: 320, y: 200 }, relay: { x: 290, y: 200 }, ink: { x: 230, y: 202 } };
    for (const room of ['entry', 'relay', 'ink']) {
      level.room = room;
      level.player = samples[room];
      assert.equal(level.atStationPlaque(level.player.x, level.player.y), true, `${room} sample stands in front of the plaque`);
      assert.equal(level.stationMapPrompt(), 'E · Xem sơ đồ', `${room} prompt is exact`);
      assert.equal(level.stationMapEnabled(), true, `${room} sample can read`);
      const slot = PATH_SCHEMATIC[room];
      level.player = { x: slot.x + slot.width / 2, y: slot.y - 20 };
      assert.equal(level.atStationPlaque(level.player.x, level.player.y), false, `${room} is not readable from the north`);
      assert.equal(level.stationMapPrompt(), null, `${room} shows no prompt from the north`);
      level.player = { x: slot.x + slot.width / 2, y: slot.y + slot.height + 20 };
      assert.equal(level.atStationPlaque(level.player.x, level.player.y), false, `${room} is not readable from far away`);
    }
    level.room = 'entry'; level.player = samples.entry;
    level.heldInteract = () => true;
    assert.equal(level.stationMapPrompt(), null, 'a held E cannot reopen the map');
    assert.equal(level.stationMapEnabled(), false, 'a held E disables the board');
    level.heldInteract = () => false; level.canStartStory = () => false;
    assert.equal(level.stationMapPrompt(), null, 'story/dialogue lock hides the prompt');
    assert.equal(level.stationMapEnabled(), false, 'story/dialogue lock disables the board');
  }],
  ['the enlarged map reuses buildPathSchematic, names every room and cleans up', () => {
    const created = { containers: [], texts: [], graphics: [] };
    let said;
    const level = {
      room: 'relay', stationMap: undefined, objects: [], progress: { flags: {}, counters: {} },
      canStartStory: () => true, heldInteract: () => false,
      track(object) { this.objects.push(object); return object; },
      scene: { add: {
        graphics: () => { const g = recorder(); created.graphics.push(g); return g; },
        text: (x, y, value, style) => { const t = text(x, y, value, style); created.texts.push(t); return t; },
        container: () => { const c = container(); created.containers.push(c); return c; },
      } },
    };
    level.closeStationMap = compile('closeStationMap', {});
    level.say = (lines, done) => { said = { lines, done }; };
    level.openStationMap = compile('openStationMap', {
      PATH_ROOMS, PATH_SCHEMATIC, PATH_SCHEMATIC_SIZE, buildPathSchematic,
      STATION_MAP_TITLE: controllerConstant('STATION_MAP_TITLE'),
      STATION_MAP_CURRENT: controllerConstant('STATION_MAP_CURRENT'),
      STATION_MAP_EXPLANATION: controllerConstant('STATION_MAP_EXPLANATION'),
    });
    const before = JSON.stringify(level.progress);
    level.openStationMap();
    const board = created.containers[0];
    assert.equal(board.depth, 90, 'the map container sits below the depth-95 dialogue');
    assert.equal(level.stationMap, board, 'the live board is held in one field');
    assert.equal(JSON.stringify(level.progress), before, 'reading the map mutates no flags or counters');
    assert.equal(level.objects.length, 0, 'the overlay is not added to the accumulating room objects');

    const values = created.texts.map(t => t.value);
    assert.ok(values.includes(controllerConstant('STATION_MAP_TITLE')), 'the enlarged board keeps its title');
    for (const room of ['entry', 'relay', 'ink']) assert.ok(values.includes(PATH_ROOMS[room].title), `${room} full name is shown`);
    const marker = created.texts.filter(t => t.value === controllerConstant('STATION_MAP_CURRENT'));
    assert.equal(marker.length, 1, 'only the current room is marked');
    const currentName = created.texts.find(t => t.value === PATH_ROOMS[level.room].title);
    assert.equal(marker[0].x, currentName.x, 'the marker is under the current room, not a colour-only cue');
    assert.ok(marker[0].y > currentName.y, 'the marker sits under the current room name');
    assert.equal(said.lines.length, 1, 'one Hệ thống line locks input and closes the map');
    assert.equal(said.lines[0].speaker, 'Hệ thống');
    assert.equal(said.lines[0].text, controllerConstant('STATION_MAP_EXPLANATION'), 'the explanation is exact');

    const plan = buildPathSchematic();
    const commands = created.graphics[0].commands;
    const cells = commands.filter(([name]) => name === 'fillRect').map(([, x, y, width, height]) => ({ x, y, width, height })).filter(cell => cell.width > 20);
    assert.equal(cells.length, 3, 'the enlarged map keeps exactly three projected room cells');
    const scale = cells[0].width / plan.rooms[0].frame.width;
    const originX = cells[0].x - plan.rooms[0].frame.x * scale;
    const originY = cells[0].y - plan.rooms[0].frame.y * scale;
    plan.rooms.forEach((room, index) => {
      assert.equal(cells[index].width, room.frame.width * scale, `${room.room} cell keeps the schematic width`);
      assert.equal(cells[index].height, room.frame.height * scale, `${room.room} cell keeps the schematic height`);
      assert.equal(cells[index].x, originX + room.frame.x * scale, `${room.room} cell keeps the schematic projection`);
      assert.equal(cells[index].y, originY + room.frame.y * scale, `${room.room} cell keeps the schematic row`);
    });
    const sealRects = commands.filter(([name, , , width]) => name === 'fillRect' && width === 4).map(([, x, y]) => ({ x, y }));
    const seals = plan.rooms.flatMap((room) => room.seals.map((seal) => ({ x: originX + seal.x * scale - 2, y: originY + seal.y * scale - 2 })));
    assert.equal(sealRects.length, seals.length, 'every authored seal is projected');
    seals.forEach((seal, index) => assert.deepEqual(sealRects[index], seal, `seal ${index} keeps the schematic projection`));
    const pipes = commands.filter(([name]) => name === 'moveTo').map(([, x, y], index) => ({ x, y, to: commands.filter(([name]) => name === 'lineTo')[index] }));
    assert.equal(pipes.length, plan.pipes.length, 'both pipe connections are projected');
    pipes.forEach((pipe, index) => {
      const source = plan.pipes[index];
      assert.equal(pipe.x, originX + source.from.x * scale, `${source.pipe} pipe starts on the same projection`);
      assert.equal(pipe.y, originY + source.from.y * scale, `${source.pipe} pipe starts on the same row`);
      assert.equal(pipe.to[1], originX + source.to.x * scale, `${source.pipe} pipe ends on the same projection`);
      assert.equal(pipe.to[2], originY + source.to.y * scale, `${source.pipe} pipe ends on the same row`);
    });

    said.done();
    assert.equal(board.destroyed, true, 'the dialogue completion destroys the map container');
    assert.equal(level.stationMap, undefined, 'the disposed overlay reference is cleared');
    for (let read = 0; read < 20; read += 1) {
      level.openStationMap();
      said.done();
    }
    assert.equal(created.containers.length, 21, 'each read builds one fresh board');
    assert.ok(created.containers.every(board => board.destroyed), 'every closed board is destroyed');
    assert.equal(level.stationMap, undefined, 'no disposed overlay survives many reads');
    assert.equal(level.objects.length, 0, 'no disposed overlay accumulates in objects');
  }],
];
let failures = 0;
for (const [name, run] of cases) {
  try { run(); console.log(`PASS  ${name}`); }
  catch (error) { failures += 1; console.error(`FAIL  ${name}\n      ${error.message}`); }
}
console.log(`\nLevel 05 station map: ${cases.length - failures}/${cases.length} passed.`);
process.exitCode = failures ? 1 : 0;
