// Focused cold-boot ordering and cached FontFace checks. Run: node scripts/check-menu-font.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source.replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

// The existing asynchronous boot boundary must wait before constructing menu text.
const starts = [];
let releaseFont, fontCalls = 0;
const ready = new Promise(resolve => { releaseFont = resolve; });
const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8');
const BootScene = new Function('Phaser', 'AssetLoader', 'ProceduralTextures', 'loadMenuFont', `${transpile(bootSource)}\nreturn BootScene;`)(
  { Scene: class { scene = { start: key => starts.push(key) }; } },
  { load: async () => ({ loaded: [], missing: [] }) },
  { generateAll() {} },
  () => { fontCalls++; return ready; },
);
const boot = new BootScene();
const task = boot.boot();
await Promise.resolve(); await Promise.resolve();
assert.equal(fontCalls, 1, 'cold boot requests the locally embedded font');
assert.deepEqual(starts, [], 'MenuScene cannot create text before font readiness');
releaseFont(); await task;
assert.deepEqual(starts, ['MenuScene']);

// Returning to the menu reuses the loaded face, without network or duplicate registration.
const fontSource = readFileSync(new URL('../src/art/MenuFont.ts', import.meta.url), 'utf8');
const faces = [], registered = [];
let releaseFace;
const faceReady = new Promise(resolve => { releaseFace = resolve; });
class FontFacePort {
  constructor(family, source, descriptors) { Object.assign(this, { family, source, descriptors }); faces.push(this); }
  load() { return faceReady; }
}
const loadMenuFont = new Function('FontFace', 'document', 'bitterUrl', `${transpile(fontSource)}\nreturn loadMenuFont;`)(
  FontFacePort, { fonts: { add: face => registered.push(face) } }, 'data:font/ttf;base64,local-test',
);
const first = loadMenuFont(), concurrent = loadMenuFont();
assert.equal(first, concurrent, 'concurrent loads share one readiness promise');
assert.equal(faces.length, 1);
assert.equal(faces[0].family, 'Bitter');
assert.equal(faces[0].descriptors.weight, '500');
assert.match(faces[0].source, /^url\("data:font\/ttf/);
assert.equal(registered.length, 0, 'face is not registered while loading');
releaseFace(faces[0]); await first;
assert.deepEqual(registered, [faces[0]]);
assert.equal(loadMenuFont(), first, 'menu re-entry uses already-loaded font');
assert.equal(faces.length, 1);
console.log('PASS: Bitter Medium cold-boot gate, single registration, concurrent load and menu re-entry cache');
