/** Native exports from the approved depth study's retained image_gen layers. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { quantize, bounds, raw, previews } = require('./export-level08-art.cjs');
const ROOT = path.resolve(__dirname, '..');
const REL = 'assets/levels/08-ruins-of-two-halves/redesign-v4';
const ART = path.join(ROOT, REL);
const OUT = path.join(ART, 'sprites');
const BASE = 'assets/levels/08-ruins-of-two-halves/redesign-v2';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const image = (data, width, height) => sharp(data, { raw: { width, height, channels: 4 } });

function family(name) {
  return name.replace(/^test-column/, 'statue').replace(/^test-moon/, 'lock-moon')
    .replace(/-notch-\d$/, '-notch').replace(/_\d$/, '')
    .replace(/-(off|on|covered|lit|open|closed|waiting|ready|latched)$/, '');
}

async function fit(entry) {
  let part = entry.name.replace(/^test-column/, 'statue').replace(/^test-moon/, 'lock-moon');
  const source = path.join(ART, 'sources/parts', part + '.png');
  const old = await raw(path.join(ROOT, BASE, 'sprites', entry.name + '.png'));
  const box = entry.name.startsWith('mirror_')
    ? { left: 2, top: 4, width: 32, height: 44 }
    : bounds(old.data, ...entry.size);
  const sourceRaw = await raw(source);
  const crop = bounds(sourceRaw.data, sourceRaw.info.width, sourceRaw.info.height);
  // A horizontal/vertical mirror retains its aspect and feet, not the old stone card.
  const fitted = await image(sourceRaw.data, sourceRaw.info.width, sourceRaw.info.height).extract(crop)
    .resize(box.width, box.height, { fit: entry.name.startsWith('mirror_') ? 'contain' : 'fill',
      position: 'bottom', background: '#00000000', kernel: 'nearest' }).raw().toBuffer();
  const data = Buffer.alloc(entry.size[0] * entry.size[1] * 4);
  for (let y = 0; y < box.height; y++) for (let x = 0; x < box.width; x++) {
    const i = (y * box.width + x) * 4;
    const target = ((y + box.top) * entry.size[0] + x + box.left) * 4;
    if (fitted[i + 3] < 192) continue;
    fitted.copy(data, target, i, i + 3); data[target + 3] = 255;
  }
  return { ...entry, family: family(entry.name), source: 'sources/parts/' + part + '.png', data };
}

async function tree(directory) {
  const files = [];
  for (const item of await fs.readdir(path.join(ROOT, directory), { withFileTypes: true })) {
    const file = directory + '/' + item.name;
    if (item.isDirectory()) files.push(...await tree(file));
    else files.push({ file, sha256: hash(await fs.readFile(path.join(ROOT, file))) });
  }
  return files.sort((a, b) => a.file.localeCompare(b.file));
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(path.join(ART, 'previews'), { recursive: true });
  const catalog = JSON.parse(await fs.readFile(path.join(ROOT, BASE, 'sources/baseline-catalog.json'), 'utf8'));
  const groups = new Map();
  for (const entry of catalog) {
    const e = await fit(entry);
    if (!groups.has(e.family)) groups.set(e.family, []);
    groups.get(e.family).push(e);
  }
  const exports = [];
  async function record(e, buffer, familyColours) {
    const { data, info } = await raw(buffer);
    assert.equal(buffer[25], 6, e.name + ': RGBA PNG');
    assert.deepEqual([info.width, info.height], e.size, e.name + ': native canvas');
    const colours = new Set(), alpha = new Set();
    for (let i = 0; i < data.length; i += 4) {
      alpha.add(data[i + 3]);
      if (data[i + 3]) colours.add(data.subarray(i, i + 3).toString('hex'));
    }
    familyColours ??= colours.size;
    assert.ok([...alpha].every(a => a === 0 || a === 255), e.name + ': binary alpha');
    assert.ok(colours.size <= 128 && familyColours <= 128, e.name + ': family palette');
    assert.equal(alpha.has(0), e.name !== 'temple-scene-base', e.name + ': exterior transparency');
    await fs.writeFile(path.join(OUT, e.name + '.png'), buffer);
    exports.push({ file: 'sprites/' + e.name + '.png', canvas: e.size, family: e.family,
      colours: colours.size, family_colours: familyColours, alpha: [...alpha].sort(),
      opaque_box: bounds(data, ...e.size), source: e.source, sha256: hash(buffer) });
  }
  for (const [name, entries] of groups) {
    const width = Math.max(...entries.map(e => e.size[0]));
    const height = entries.reduce((n, e) => n + e.size[1], 0);
    const layers = []; let top = 0;
    for (const e of entries) {
      e.top = top;
      layers.push({ input: await image(e.data, ...e.size).png().toBuffer(), left: 0, top });
      top += e.size[1];
    }
    const strip = await quantize(await sharp({ create: { width, height, channels: 4, background: '#00000000' } })
      .composite(layers).png().toBuffer());
    const decoded = await raw(strip), colours = new Set();
    for (let i = 0; i < decoded.data.length; i += 4)
      if (decoded.data[i + 3]) colours.add(decoded.data.subarray(i, i + 3).toString('hex'));
    assert.ok(colours.size <= 128, name + ': shared palette');
    for (const e of entries) await record(e, await sharp(strip)
      .extract({ left: 0, top: e.top, width: e.size[0], height: e.size[1] })
      .png({ palette: false }).toBuffer(), colours.size);
  }
  const background = await quantize(await sharp(path.join(ART, 'sources/scene-background-original.png'))
    .resize(640, 360, { fit: 'fill', kernel: 'nearest' }).ensureAlpha().png().toBuffer());
  await record({ name: 'temple-scene-base', size: [640, 360], family: 'temple',
    source: 'sources/scene-background-original.png' }, background);
  const decal = await fs.readFile(path.join(ROOT, BASE, 'sprites/inscription-under-statue.png'));
  await record({ name: 'inscription-under-statue', size: [48, 12], family: 'inscription',
    source: BASE + '/sprites/inscription-under-statue.png' }, decal);
  assert.equal(exports.length, 32);
  const protectedFiles = [...await tree('assets/levels/shared/characters/the-shadow'),
    ...await tree('assets/character'),
    ...await tree('assets/levels/08-ruins-of-two-halves/sprites')];
  for (let n = 0; n < 4; n++) {
    const file = `src/assets/mirror_${n}.png`;
    protectedFiles.push({ file, sha256: hash(await fs.readFile(path.join(ROOT, file))) });
  }
  const authoring = {};
  for (const file of ['scripts/prepare-level08-art-v4.cjs', 'scripts/export-level08-art-v4.cjs',
    'scripts/export-level08-art.cjs', REL + '/art-direction.md']) authoring[file] = hash(await fs.readFile(path.join(ROOT, file)));
  const references = [];
  for (const file of [BASE + '/sources/baseline-catalog.json',
    ...exports.map(e => BASE + '/' + e.file)]) {
    references.push({ file, sha256: hash(await fs.readFile(path.join(ROOT, file))) });
  }
  await fs.writeFile(path.join(ART, 'production-manifest.json'), JSON.stringify({
    version: 1, date: '2026-10-22', base_revision: '92ccc9320fc7b81188bb65206cb9f35d136db333',
    approval: 'User approved temple-depth-study-v2 and requested integration in the referenced chat.',
    provenance: 'Built-in image_gen edits of project art; original outputs and prompts retained. Model/version not exposed.',
    pipeline: { filter: 'nearest', alpha: 'binary 0/255', max_family_colours: 128,
      silhouette: 'Generated transparent silhouettes fitted to prior native bounds. Standalone mirror envelope 32x44; no stone surround.',
      pivot: 'Existing native canvases and runtime image centres retained.' },
    authoring_sha256: authoring, sources: await tree(REL + '/sources'),
    references, protected: protectedFiles, exports,
  }, null, 2) + '\n');
  const rows = exports.map(e => `| ${e.file.slice(8)} | ${e.canvas.join('×')} | ${e.colours} | ${e.family_colours} | ${[e.opaque_box.left,e.opaque_box.top,e.opaque_box.width,e.opaque_box.height].join(', ')} |`);
  await fs.writeFile(path.join(ART, 'asset-report.md'), [
    '# Level 08 v4 decoded-pixel report', '',
    'All outputs are RGBA PNGs with binary alpha and native canvases. The background is opaque. Every sprite has a transparent exterior. Bounds are measured from decoded pixels and lie inside the stated canvas.', '',
    '| File | Canvas | RGB colours | Family colours | Opaque box x,y,w,h |',
    '|---|---|---:|---:|---|', ...rows, '',
    'Mirror silhouettes use their generated alpha rather than the discarded stone cards. Other props use generated alpha fitted to the prior native bounds. The inscription is reused unchanged. Original puzzle shadows and shared characters are protected by hashes.', '',
  ].join('\n'));
  await previews(ART);
  console.log('PASS: 32 native RGBA exports, binary alpha, <=128 colours per family, retained source/protected hashes.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
