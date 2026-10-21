/** Actual Phaser render inspection with isolated save fixtures; not a full playthrough. */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const ART = path.join(ROOT, 'assets/levels/07-the-sleeping-garden/redesign-v2');
const OUT = path.join(ART, 'previews');
const URL = process.env.LEVEL07_ART_BASE_URL || 'http://127.0.0.1:5187/';
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const base = { 'intro-6': true, 'l6-practice-observed': true, 'l6-retract-cue': true };
const latched = { ...base, 'l6-canopy-shut': true, 'l6-sun-latched': true };
const cases = [
  { id: '01-entry', lanternOn: true, flags: base, x: 238, y: 298 },
  { id: '02-lantern-gate-raised', lanternOn: true, flags: { ...base, 'l6-canopy-shut': true }, x: 142, y: 132 },
  { id: '03-dark-root-bridge', lanternOn: false, flags: latched, x: 294, y: 216 },
  { id: '04-occupied-root-held', lanternOn: false, flags: latched, x: 327, y: 216, toggle: true },
  { id: '05-nursery-restored', lanternOn: false, flags: { ...latched, 'l6-water-flowing': true,
    'l6-return-latched': true, 'l6-lumo-realized': true }, x: 462, y: 282 },
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const results = [];
  try {
    for (const study of cases) {
      const context = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('response', (response) => {
        if (response.status() >= 400 && /\.png(?:\?|$)/.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
      });
      const progress = { version: 1, level: 6, furthest: 6, flags: study.flags, lanternPickedUp: true,
        lanternOn: study.lanternOn, counters: { 'player-level': 6, 'player-x': study.x, 'player-y': study.y } };
      await page.addInitScript((save) => localStorage.setItem('last-lantern-campaign-save-v1', JSON.stringify(save)), progress);
      await page.goto(URL, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'), null, { timeout: 30000 });
      await page.evaluate(() => {
        const game = window.__LAST_LANTERN_GAME__;
        for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
        game.scene.start('CampaignScene');
      });
      await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.getScene('CampaignScene')?.gardenLevel, null, { timeout: 30000 });
      await page.waitForTimeout(450);
      if (study.toggle) {
        await page.keyboard.press('f');
        await page.waitForTimeout(250);
      }
      const state = await page.evaluate(() => {
        const game = window.__LAST_LANTERN_GAME__;
        const scene = game.scene.getScene('CampaignScene');
        const garden = scene.gardenLevel;
        return {
          player: { x: scene.player.x, y: scene.player.y }, lanternOn: scene.lantern.lanternOn,
          dawnMode: scene.lantern.isDawnMode, held: { ...garden.held }, state: { ...garden.state },
          dialogue: scene.dialogue.isActive(),
          registered: game.textures.getTextureKeys().filter((key) => key.startsWith('garden_v2_')),
          modules: Object.fromEntries([...garden.images].map(([id, image]) => [id, { key: image.texture.key,
            canvas: [image.texture.getSourceImage().width, image.texture.getSourceImage().height], visible: image.visible,
            left: image.x - image.width * image.originX, top: image.y - image.height * image.originY }])),
          background: scene.children.list.filter((object) => object.texture?.key === 'garden_v2_garden_scene_base').length,
        };
      });
      assert.equal(state.registered.length, 22, `${study.id}: new pack not fully loaded`);
      assert.equal(state.background, 1, `${study.id}: missing local garden background`);
      assert.equal(state.dialogue, false, `${study.id}: dialogue blocks the inspection`);
      assert.match(state.modules.reservoir.key, /^garden_v2_/, 'reservoir must use local art');
      assert.match(state.modules['sun-main'].key, /^shared_sun_/, 'approved shared flower must remain reused');
      assert.equal(state.dawnMode, !study.flags['l6-canopy-shut']);
      if (!state.lanternOn && state.state.canopyShut) {
        assert.equal(state.modules['moon-main'].left + 52, 252, 'main Moon Root pot must retain its coiled footprint');
        assert.equal(state.modules['practice-moon'].left + 52, 132, 'practice Moon Root pot must retain its coiled footprint');
      }
      if (study.toggle) {
        assert.equal(state.lanternOn, true);
        assert.deepEqual(state.held, { s1: true, s2: false }, 'occupied span must stay while empty span retracts');
        assert.equal(state.modules['bridge-s1'].key, 'garden_v2_root_bridge_held');
        assert.equal(state.modules['bridge-s2'].key, 'garden_v2_root_bridge_off');
      }
      assert.deepEqual(errors, [], `${study.id}: browser or PNG errors`);
      const image = await page.locator('canvas').screenshot();
      const metadata = await sharp(image).metadata();
      assert.equal(metadata.width, 640); assert.equal(metadata.height, 360);
      await fs.writeFile(path.join(OUT, `${study.id}-640x360.png`), image);
      await sharp(image).resize(1280, 720, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${study.id}-1280x720.png`));
      if (['01-entry', '03-dark-root-bridge', '05-nursery-restored'].includes(study.id)) {
        // Separate art presentation: freeze the same render and hide the HUD.
        // The normal screenshots above remain the evidence for actual UI overlap.
        await page.evaluate(() => {
          const scene = window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
          scene.scene.pause(); scene.hud.setHidden(true);
        });
        const art = await page.locator('canvas').screenshot();
        await fs.writeFile(path.join(OUT, `${study.id}-art-640x360.png`), art);
        await sharp(art).resize(1280, 720, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${study.id}-art-1280x720.png`));
      }
      results.push({ id: study.id, fixture: study, ...state, browser_errors: errors, screenshot_sha256: sha(image) });
      await context.close();
    }
  } finally { await browser.close(); }

  const checked = {};
  for (const file of ['src/art/CampaignArt.ts', 'src/levels/SleepingGardenLevel.ts', 'src/data/sleepingGardenLayout.ts',
    'docs/scenario/07-the-sleeping-garden.md', 'assets/levels/07-the-sleeping-garden/redesign-v2/production-manifest.json']) {
    checked[file] = sha(await fs.readFile(path.join(ROOT, file)));
  }
  await fs.writeFile(path.join(ART, 'browser-inspection.json'), `${JSON.stringify({ result: 'PASS',
    method: 'Isolated save fixtures rendered by real Phaser/Chromium; actual F input on occupied root span; not a full walk-through.',
    checked_source_sha256: checked, studies: results }, null, 2)}\n`);
  console.log(`PASS: ${results.length} real 640x360 garden renders, 22 loaded sprites, shared flower fallback, occupied-span F input, no browser/PNG errors.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
