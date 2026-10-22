/** Crop retained image_gen layers into references; no artistic repainting. */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const ART = path.join(ROOT, 'assets/levels/08-ruins-of-two-halves/redesign-v4');
const SRC = path.join(ART, 'sources');
const REFS = path.join(SRC, 'references');
const PARTS = path.join(SRC, 'parts');
// Coordinates on the retained 1672×941 extraction output, inspected before export.
const CROPS = {
  'sanctuary-door-closed': [1260, 50, 370, 275],
  beacon_stone: [1105, 160, 95, 155],
  'seedling-curtain-open': [275, 365, 285, 165],
  'lock-sun-on': [560, 335, 110, 120],
  'lock-moon-covered': [780, 335, 120, 120],
  'statue-notch-0': [735, 450, 205, 270],
  'practice-composite': [215, 650, 165, 180],
  'test-moon-covered': [435, 675, 85, 90],
  mirror_1: [525, 675, 145, 185],
  mirror_0: [1025, 675, 140, 185],
  'fixed-three-route-splitter-on': [755, 720, 160, 145],
  'ruins-altar-with-ring': [1200, 670, 355, 185],
  'confirmation-ready': [1280, 725, 190, 100],
};
function bounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 192) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw Error('Empty crop');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
async function main() {
  await fs.mkdir(REFS, { recursive: true });
  await fs.mkdir(PARTS, { recursive: true });
  const input = path.join(SRC, 'prop-layer-original.png');
  const meta = await sharp(input).metadata();
  if (meta.width !== 1672 || meta.height !== 941 || !meta.hasAlpha) throw Error('Unexpected layer canvas/alpha');
  const catalog = [];
  const layers = [];
  let index = 0;
  for (const [name, rect] of Object.entries(CROPS)) {
    const [left, top, width, height] = rect;
    const raw = await sharp(input).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer();
    const visible = bounds(raw, width, height);
    const file = path.join(REFS, name + '.png');
    const buffer = await sharp(raw, { raw: { width, height, channels: 4 } }).extract(visible).png().toBuffer();
    await fs.writeFile(file, buffer);
    await fs.writeFile(path.join(PARTS, name + '.png'), buffer);
    catalog.push({ name, source: 'prop-layer-original.png', crop: rect, visible });
    const preview = await sharp(buffer).resize(220, 190, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
    layers.push({ input: preview, left: (index % 4) * 240 + 10, top: Math.floor(index / 4) * 230 + 25 });
    index++;
  }
  await fs.writeFile(path.join(SRC, 'crop-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  async function trimPart(file, name, region) {
    let pipeline = sharp(path.join(SRC, file));
    if (region) pipeline = pipeline.extract(region);
    const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    await sharp(data, { raw: info }).extract(bounds(data, info.width, info.height)).png()
      .toFile(path.join(PARTS, name + '.png'));
  }
  for (const [file, prefix] of [['statue-states-original.png', 'statue-notch-'], ['mirror-states-original.png', 'mirror_']]) {
    const m = await sharp(path.join(SRC, file)).metadata();
    for (let n = 0; n < 4; n++) {
      const width = Math.floor(m.width / 2), height = Math.floor(m.height / 2);
      await trimPart(file, prefix + n, { left: (n % 2) * width, top: Math.floor(n / 2) * height, width, height });
    }
  }
  for (const [name, file] of Object.entries({
    'mirror_2': 'mirror-horizontal-original.png',
    'sanctuary-door-open': 'sanctuary-door-open-original.png',
    'seedling-curtain-closed': 'seedling-curtain-closed-original.png',
    ruins_altar: 'ruins_altar-original.png',
    'lock-sun-off': 'lock-sun-off-original.png',
    'lock-moon-lit': 'lock-moon-lit-original.png',
    'fixed-three-route-splitter-off': 'fixed-three-route-splitter-off-original.png',
  })) await trimPart(file, name);
  const ringFile = 'confirmation-states-original.png';
  const ringMeta = await sharp(path.join(SRC, ringFile)).metadata();
  for (const [index, state] of ['waiting', 'ready', 'latched'].entries()) {
    const width = Math.floor(ringMeta.width / 3);
    await trimPart(ringFile, 'confirmation-' + state, { left: index * width, top: 0, width, height: ringMeta.height });
  }
  const statue = await sharp(path.join(PARTS, 'statue-notch-0.png')).metadata();
  const baseHeight = Math.round(statue.height * 0.28);
  await sharp(path.join(PARTS, 'statue-notch-0.png'))
    .extract({ left: 0, top: statue.height - baseHeight, width: statue.width, height: baseHeight })
    .png().toFile(path.join(PARTS, 'test-pedestal.png'));
  await sharp({ create: { width: 960, height: Math.ceil(index / 4) * 230, channels: 4, background: '#24313b' } })
    .composite(layers).png().toFile(path.join(ART, 'source-contact.png'));
  console.log('Prepared transparent prop references and complete state families.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
