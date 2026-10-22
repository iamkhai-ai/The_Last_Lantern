/** Deterministic native exports of the retained image_gen sources. Requires sharp. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const ART = path.join(ROOT, 'assets/levels/07-the-sleeping-garden/redesign-v2');
const SRC = path.join(ART, 'sources');
const OUT = path.join(ART, 'sprites');
const PREVIEW = path.join(ART, 'previews');
const records = [];
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const transparent = (width, height) => sharp({ create: { width, height, channels: 4, background: '#00000000' } });

async function sourcePiece(file, box, size) {
  const input = await sharp(path.join(SRC, file)).ensureAlpha().extract({
    left: box[0], top: box[1], width: box[2], height: box[3],
  }).raw().toBuffer({ resolveWithObject: true });
  // The generation's low-alpha outer glow is not part of a physical sprite.
  // Preserve the original source and normalize the exported pixel edge explicitly.
  for (let i = 3; i < input.data.length; i += 4) input.data[i] = input.data[i] >= 192 ? 255 : 0;
  return sharp(input.data, { raw: input.info }).resize(size[0], size[1], { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
}

async function write(name, buffer, size, sources, transform, anchor = [0, 0]) {
  const file = `${name}.png`;
  await fs.writeFile(path.join(OUT, file), buffer);
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== size[0] || info.height !== size[1]) throw new Error(`Wrong canvas: ${file}`);
  let opaque = 0, clear = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]) opaque++; else clear++;
  }
  if (!opaque || (!clear && name !== 'garden-scene-base')) throw new Error(`Invalid sprite alpha: ${file}`);
  records.push({ file: `sprites/${file}`, canvas: size, anchor, sources, transform,
    sha256: sha(buffer), opaque_pixels: opaque, transparent_pixels: clear });
  return buffer;
}

async function frame(name, file, box, size, anchor = [0, 0]) {
  return write(name, await sourcePiece(file, box, size), size,
    [{ file: `sources/${file}`, crop_xywh: box }],
    'Authored native canvas fit with nearest sampling; source alpha >=192 becomes opaque, lower alpha becomes clear.', anchor);
}

async function main() {
  await Promise.all([OUT, PREVIEW].map((dir) => fs.mkdir(dir, { recursive: true })));
  const bg = await sharp(path.join(SRC, 'garden-scene-base-original.png')).resize(640, 360, { kernel: 'nearest' }).ensureAlpha().png().toBuffer();
  // Retain the existing authored canal repair at the return crossing. It removes
  // scenery that could imply a third, permanently available route across the canal.
  const legacy = path.join(ROOT, 'assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png');
  const canal = await sharp(legacy).extract({ left: 294, top: 276, width: 83, height: 33 }).png().toBuffer();
  const background = await sharp(bg).composite([{ input: canal, left: 294, top: 276 }]).png().toBuffer();
  await write('garden-scene-base', background, [640, 360], [
    { file: 'sources/garden-scene-base-original.png' },
    { repository_file: 'assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png', crop_xywh: [294, 276, 83, 33], purpose: 'existing canal repair' },
  ], 'Full-frame nearest normalization, then exact reuse of the legacy canal repair.', 'full-frame');

  await frame('reservoir-open', 'reservoir-family-original.png', [210, 190, 610, 550], [80, 72]);
  const closed = await frame('reservoir-closed', 'reservoir-family-original.png', [210, 815, 610, 550], [80, 72]);
  const shutter = await sharp(closed).extract({ left: 20, top: 31, width: 43, height: 34 }).png().toBuffer();
  await write('reservoir-shutter-closed-overlay', await transparent(80, 72).composite([{ input: shutter, left: 20, top: 31 }]).png().toBuffer(),
    [80, 72], [{ file: 'sprites/reservoir-closed.png', crop_xywh: [20, 31, 43, 34] }], 'Registered opaque closed-aperture layer.');

  const leverBoxes = [[220, 150, 680, 600], [220, 740, 680, 600]];
  for (const [i, state] of ['open', 'closed'].entries()) {
    await frame(`shutter-handle-${state}`, 'lever-family-original.png', leverBoxes[i], [24, 40]);
  }
  for (const side of ['west', 'east']) {
    for (const [i, state] of ['unlatched', 'latched'].entries()) {
      await frame(`latch-${side}-${state}`, 'lever-family-original.png', leverBoxes[i], [28, 32]);
    }
  }

  // Re-register generated timber components to the controller's exact crop/solid
  // contract instead of stretching an entire gate and clipping its moving beam.
  const gateSource = 'gate-family-original.png';
  const postBoxes = [[100, 56, 110, 420], [825, 56, 110, 420]];
  const posts = await Promise.all(postBoxes.map((box) => sourcePiece(gateSource, box, [16, 72])));
  const beamBox = [183, 252, 640, 81];
  const braceBox = [779, 1144, 100, 116];
  for (const state of ['lowered', 'raised', 'held']) {
    const raised = state !== 'lowered';
    const beam = await sourcePiece(gateSource, beamBox, [87, raised ? 20 : 26]);
    const layers = [
      { input: posts[0], left: 0, top: 0 }, { input: posts[1], left: 96, top: 0 },
      { input: beam, left: 13, top: raised ? 2 : 32 },
    ];
    if (state === 'held') layers.push({ input: await sourcePiece(gateSource, braceBox, [17, 19]), left: 83, top: 9 });
    const buffer = await transparent(112, 72).composite(layers).png().toBuffer();
    const raw = await sharp(buffer).raw().toBuffer();
    if (raised) {
      for (let y = 30; y < 72; y++) for (let x = 16; x < 96; x++) {
        if (raw[(y * 112 + x) * 4 + 3]) throw new Error(`Gate art intrudes into raised doorway: ${state}`);
      }
    }
    await write(`gate-bar-${state}`, buffer, [112, 72], [{ file: `sources/${gateSource}`, post_crops_xywh: postBoxes,
      beam_crop_xywh: beamBox, ...(state === 'held' ? { brace_crop_xywh: braceBox } : {}) }],
    `Authored component registration: post strips x0..15 and x96..111; beam x13..99 at y${raised ? '2..21' : '32..57'}; raised doorway clear below row 29.`);
  }

  for (const [i, state] of ['on', 'held', 'off'].entries()) {
    const box = [0, [250, 670, 1070][i], 1024, 300];
    const strip = await sourcePiece('root-bridge-family-original.png', box, [48, 20]);
    await write(`root-bridge-${state}`, await transparent(48, 32).composite([{ input: strip, left: 0, top: 6 }]).png().toBuffer(),
      [48, 32], [{ file: 'sources/root-bridge-family-original.png', crop_xywh: box }],
      'Shared registered 48x20 root deck inside a 48x32 canvas; nearest sampling and explicit alpha normalization.', [0.5, 0.5]);
  }
  // Keep the approved pot at the same world position when the root state changes.
  // The old extended sprite painted its pot at the left of a wider canvas, while
  // the main module expects it at x52. Reuse its tendril tip and the original pot.
  const plantDir = path.join(ROOT, 'assets/levels/shared/garden-mechanisms');
  const coiledPot = await fs.readFile(path.join(plantDir, 'moon-coiled.png'));
  const tendril = await sharp(path.join(plantDir, 'moon-extended.png'))
    .extract({ left: 100, top: 0, width: 12, height: 44 }).png().toBuffer();
  await write('moon-extended', await transparent(112, 44).composite([
    { input: tendril, left: 100, top: 0 }, { input: coiledPot, left: 52, top: 0 },
  ]).png().toBuffer(), [112, 44], [
    { repository_file: 'assets/levels/shared/garden-mechanisms/moon-coiled.png', destination_xy: [52, 0] },
    { repository_file: 'assets/levels/shared/garden-mechanisms/moon-extended.png', crop_xywh: [100, 0, 12, 44], destination_xy: [100, 0] },
  ], 'Exact reuse at native scale, no resampling; registered pot plus extended tendril tip.', [0.5, 1]);
  await frame('nursery-drain-closed', 'drain-family-original.png', [200, 200, 624, 520], [52, 48]);
  await frame('nursery-drain-open', 'drain-family-original.png', [200, 825, 624, 520], [52, 48]);
  await frame('side-stone-path-closed', 'side-path-family-original.png', [110, 120, 1320, 360], [80, 32]);
  await frame('side-stone-path-open', 'side-path-family-original.png', [110, 564, 1320, 360], [80, 32]);
  await frame('nursery-water-delivered', 'nursery-water-original.png', [45, 450, 1445, 165], [128, 24]);

  const sources = [];
  for (const file of (await fs.readdir(SRC)).sort()) {
    const data = await fs.readFile(path.join(SRC, file));
    const png = file.endsWith('.png') ? await sharp(data).metadata() : null;
    sources.push({ file: `sources/${file}`, sha256: sha(data), ...(png ? { canvas: [png.width, png.height], alpha: png.hasAlpha } : {}) });
  }
  const reuseFiles = ['sun-open', 'sun-folded', 'moon-coiled', 'moon-extended', 'sprout-before', 'sprout-after',
    'icon-sun-bloom', 'icon-sun-folded', 'icon-moon-open', 'icon-moon-closed', 'root-bridge-missing'];
  const reusePaths = [...reuseFiles.map((name) => `assets/levels/shared/garden-mechanisms/${name}.png`),
    'assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png'];
  const reused = await Promise.all(reusePaths.map(async (file) => {
    return { file, sha256: sha(await fs.readFile(path.join(ROOT, file))) };
  }));
  const scenario = 'docs/scenario/07-the-sleeping-garden.md';
  const garden = 'assets/levels/07-the-sleeping-garden';
  const tower = 'assets/levels/06-the-sleepless-tower/redesign-v2/previews/01-entry-640x360.png';
  const sceneSource = `${garden}/redesign-v2/sources/garden-scene-base-original.png`;
  const originalContact = `${garden}/previews/states-native-1x.png`;
  const generationInputs = {
    'garden-scene-base': [`${garden}/sprites/garden-scene-base.png`, tower],
    'reservoir-family': [sceneSource, tower, originalContact],
    'gate-family': [originalContact, tower],
    'root-bridge-family': [sceneSource, originalContact],
    'drain-family': [sceneSource, `${garden}/redesign-v2/sources/reservoir-family-original.png`],
    'lever-family': [sceneSource, `${garden}/redesign-v2/sources/drain-family-original.png`],
    'side-path-family': [sceneSource, `${garden}/redesign-v2/sources/gate-family-original.png`],
    'nursery-water': [sceneSource],
  };
  const generations = await Promise.all(Object.entries(generationInputs).map(async ([name, inputs]) => ({
    source: `sources/${name}-original.png`, prompt: `sources/${name}-prompt.txt`,
    tool: 'built-in image_gen', transparent_background: name !== 'garden-scene-base',
    references: await Promise.all(inputs.map(async (file) => ({ file, sha256: sha(await fs.readFile(path.join(ROOT, file))) }))),
  })));
  const manifest = { baseline: '9f792416d926475e6dc44924de5068aa8dca8daf', date: '2026-10-22',
    backend: 'built-in image_gen', backend_model: 'unknown; not exposed by tool',
    scenario: { file: scenario, sha256: sha(await fs.readFile(path.join(ROOT, scenario))) },
    exporter_sha256: sha(await fs.readFile(__filename)), sources, generations, exports: records, reused,
    raster_checks: { result: 'PASS', decoded_exports: records.length, dimensions: 'PASS', nonempty_alpha: 'PASS',
      transparent_prop_backgrounds: 'PASS', raised_gate_doorway: 'PASS' } };
  await fs.writeFile(path.join(ART, 'production-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const cells = records.map(async (record, i) => ({ input: await sharp(path.join(ART, record.file)).resize({ width: 150, height: 90, fit: 'inside', kernel: 'nearest' }).png().toBuffer(),
    left: (i % 4) * 160 + 5, top: Math.floor(i / 4) * 100 + 5 }));
  const contact = await sharp({ create: { width: 640, height: Math.ceil(records.length / 4) * 100,
    channels: 4, background: '#172b35' } }).composite(await Promise.all(cells)).png().toBuffer();
  await fs.writeFile(path.join(PREVIEW, 'sprites-contact.png'), contact);
  console.log(`PASS: exported and decoded ${records.length} native PNGs; manifest and contact saved.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
