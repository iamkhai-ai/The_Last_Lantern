/** Actual Phaser render inspection with isolated Level 08 save fixtures; not a full playthrough. */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const LEVEL = path.join(ROOT, 'assets/levels/08-ruins-of-two-halves');
const ART = path.join(LEVEL, 'redesign-v2');
const SPRITES = path.join(ART, 'sprites');
const OUT = path.join(ART, 'previews');
const URL = process.env.LEVEL08_ART_BASE_URL || 'http://127.0.0.1:5187/';
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const entryCounters = { statue: 1, 'ruins-left': 3, 'ruins-right': 2, practice: 0 };
const solvedCounters = { statue: 0, 'ruins-left': 1, 'ruins-right': 0, practice: 0 };
// The fixtures have already seen one-off dialogue so it cannot cover the art.
const baseFlags = { 'intro-7': true, 'intro-6': true, 'l7-practice-seen': true,
  'l7-two-suns': true, 'l7-shadow-covers': true };
const placed = { 'l7-lantern-placed': true, 'l7-lantern-retrieved': false };
const latched = { ...placed, 'l7-route-latched': true, 'l7-solved': true, 'l7-curtain-shut': true,
  'l7-lantern-placed': false, 'l7-lantern-retrieved': true };
const cases = [
  { id: '01-entry-planks-waiting', flags: baseFlags, counters: entryCounters, lanternOn: true },
  { id: '02-statue-0-ready', flags: { ...baseFlags, ...placed }, counters: solvedCounters, lanternOn: true,
    expect: { statue: 0, ready: true, sunsLit: 2, moonDark: true } },
  { id: '03-statue-1', flags: { ...baseFlags, ...placed }, counters: { ...solvedCounters, statue: 1 }, lanternOn: true,
    expect: { statue: 1 } },
  { id: '04-statue-2', flags: { ...baseFlags, ...placed }, counters: { ...solvedCounters, statue: 2 }, lanternOn: true,
    expect: { statue: 2 } },
  { id: '05-statue-3', flags: { ...baseFlags, ...placed }, counters: { ...solvedCounters, statue: 3 }, lanternOn: true,
    expect: { statue: 3 } },
  { id: '06-lamp-off-locks-dark', flags: baseFlags, counters: { ...solvedCounters, statue: 0 }, lanternOn: false,
    expect: { ready: false, sunsLit: 0, moonDark: true } },
  { id: '07-latched-door-open-curtain-closed', flags: { ...baseFlags, ...latched }, counters: solvedCounters, lanternOn: true,
    expect: { ready: false, latched: true } },
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const spriteFiles = (await fs.readdir(SPRITES)).filter((file) => file.endsWith('.png')).sort();
  assert.equal(spriteFiles.length, 32, 'the approved Level 08 art pack must contain 32 PNGs');
  const artSource = await fs.readFile(path.join(ROOT, 'src/art/CampaignArt.ts'), 'utf8');
  const levelSource = await fs.readFile(path.join(ROOT, 'src/levels/RuinsOfTwoHalvesLevel.ts'), 'utf8');
  assert.match(artSource, /return getRuinsV2ArtKey\(name\) \?\? getLevelArtKey\(7, name\);/,
    'Level 08 local resolver must retain the legacy Level 08 art lookup');
  assert.match(levelSource, /if \(localKey\) return localKey;\s+return this\.scene\.textures\.exists\(name\) \? name : undefined;/,
    'local mirror/altar/beacon assets must preserve the old shared/raw texture fallback');
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const results = [];
  try {
    for (const study of cases) {
      const context = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
      page.on('requestfailed', (request) => {
        if (/\.png(?:\?|$)/i.test(request.url())) errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`);
      });
      page.on('response', (response) => {
        if (response.status() >= 400 && /\.png(?:\?|$)/i.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
      });
      const progress = { version: 1, level: 7, furthest: 7, flags: study.flags, lanternPickedUp: true,
        lanternOn: study.lanternOn, counters: { 'player-level': 7, 'player-x': 320, 'player-y': 286, ...study.counters } };
      await page.addInitScript((save) => localStorage.setItem('last-lantern-campaign-save-v1', JSON.stringify(save)), progress);
      await page.goto(URL, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'), null, { timeout: 30000 });
      await page.evaluate(() => {
        const game = window.__LAST_LANTERN_GAME__;
        for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
        game.scene.start('CampaignScene');
      });
      await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.getScene('CampaignScene')?.ruinsLevel, null, { timeout: 30000 });
      await page.waitForTimeout(400);
      const state = await page.evaluate(() => {
        const game = window.__LAST_LANTERN_GAME__;
        const scene = game.scene.getScene('CampaignScene');
        const images = scene.children.list.filter((object) => object.type === 'Image');
        const imageDetails = images.map((image) => {
          const bounds = image.getBounds();
          const source = image.texture.getSourceImage();
          return { id: image.getData('ruins-id') ?? null, key: image.texture.key,
            sourceSize: [source.width, source.height], visible: image.visible, alpha: image.alpha,
            bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
        });
        const modules = Object.fromEntries(imageDetails.filter((image) => image.id).map((image) => [image.id, image]));
        const ruins = scene.ruinsLevel;
        const puzzle = ruins.getPuzzleState();
        const localBackdrop = modules.backdrop;
        return { player: { x: scene.player.x, y: scene.player.y }, lanternOn: scene.lantern.lanternOn,
          puzzle: { statue: puzzle.statue, lightActive: puzzle.lightActive, leftLit: puzzle.leftLit, rightLit: puzzle.rightLit,
            moonDark: puzzle.moonDark, sunsLit: puzzle.sunsLit, confirmReady: puzzle.confirmReady },
          flags: { latched: scene.progress.flags['l7-route-latched'] === true,
            curtainShut: scene.progress.flags['l7-curtain-shut'] === true },
          registered: game.textures.getTextureKeys().filter((key) => key.startsWith('ruins_v2_')).sort(),
          decalAsset: (() => {
            const source = game.textures.get('ruins_v2_inscription_under_statue').getSourceImage();
            return { size: [source.width, source.height] };
          })(),
          modules, images: imageDetails,
          sceneObjects: scene.children.list.map((object) => ({ type: object.type, depth: object.depth,
            key: object.texture?.key ?? null, id: object.getData?.('ruins-id') ?? null })),
          localBackdrop: localBackdrop ? { key: localBackdrop.key, alpha: localBackdrop.alpha,
            size: localBackdrop.sourceSize, bounds: localBackdrop.bounds } : null,
          shadow: modules['shadow-npc'] ?? null,
          dialogue: scene.dialogue.isActive(),
        };
      });
      assert.equal(state.registered.length, spriteFiles.length,
        `${study.id}: expected the complete local PNG pack to be registered`);
      assert.equal(state.dialogue, false, `${study.id}: dialogue blocks the inspection`);
      assert.ok(state.localBackdrop, `${study.id}: local temple backdrop is missing`);
      assert.equal(state.localBackdrop.key, 'ruins_v2_temple_scene_base');
      assert.deepEqual(state.localBackdrop.size, [640, 360]);
      assert.deepEqual(state.localBackdrop.bounds, { x: 0, y: 0, width: 640, height: 360 });
      assert.equal(state.localBackdrop.alpha, 1, 'redrawn backdrop must render opaque');
      assert.equal(state.sceneObjects.some((object) => object.type === 'TileSprite'), false,
        'local opaque backdrop must skip the tiled floor');
      assert.equal(state.sceneObjects.some((object) => object.type === 'Graphics' && object.depth === 1), false,
        'local opaque backdrop must skip procedural masonry');
      assert.equal(state.modules.statue.key, `ruins_v2_statue_notch_${study.expect?.statue ?? study.counters.statue}`);
      assert.equal(state.modules['mirror-left'].key, `ruins_v2_mirror_${study.counters['ruins-left']}`);
      assert.equal(state.modules['mirror-right'].key, `ruins_v2_mirror_${study.counters['ruins-right']}`);
      assert.equal(state.modules.pedestal.key, 'ruins_v2_ruins_altar');
      assert.equal(state.modules['seedling-bed'].key,
        `ruins_v2_seedling_curtain_${state.flags.curtainShut ? 'closed' : 'open'}`);
      assert.equal(state.modules['north-door'].key,
        `ruins_v2_sanctuary_door_${state.flags.latched ? 'open' : 'closed'}`);
      assert.equal(state.modules.inscription.key, 'ruins_v2_beacon_stone');
      for (const [id, box] of Object.entries({
        statue: [288,132,64,88], 'mirror-left': [222,214,36,48], 'mirror-right': [382,214,36,48],
        pedestal: [428,210,104,52], 'seedling-bed': [136,104,88,48],
        inscription: [413,34,34,46], 'north-door': [496,4,104,76], confirmation: [456,218,48,36],
        splitter: [296,214,48,48], 'practice-column': [126,216,48,36],
        'practice-column-spin': [134,201,32,44], 'practice-slab': [198,214,16,20],
        'lock-left': [224,92,32,40], 'lock-moon': [304,92,32,40], 'lock-right': [384,92,32,40],
      })) {
        assert.deepEqual(state.modules[id].sourceSize, box.slice(2), `${id}: native source size`);
        assert.deepEqual(state.modules[id].bounds,
          {x:box[0],y:box[1],width:box[2],height:box[3]}, `${id}: fixed layout art box`);
      }
      assert.deepEqual(state.decalAsset.size, [48, 12], 'asset-only inscription decal keeps its approved size');
      assert.equal(state.images.some((image) => image.id === 'inscription-under-statue'), false,
        'the asset-only inscription decal must not be active in gameplay');
      assert.equal(state.modules['lock-left'].key, `ruins_v2_lock_sun_${state.puzzle.leftLit ? 'on' : 'off'}`);
      assert.equal(state.modules['lock-right'].key, `ruins_v2_lock_sun_${state.puzzle.rightLit ? 'on' : 'off'}`);
      assert.equal(state.modules['lock-moon'].key, `ruins_v2_lock_moon_${state.puzzle.moonDark ? 'covered' : 'lit'}`);
      if (study.id === '06-lamp-off-locks-dark') {
        assert.equal(state.modules['placed-lamp'].visible, false);
        assert.equal(state.puzzle.lightActive, false);
      }
      if (study.expect) {
        if ('statue' in study.expect) assert.equal(state.puzzle.statue, study.expect.statue);
        if ('ready' in study.expect) assert.equal(state.puzzle.confirmReady, study.expect.ready);
        if ('sunsLit' in study.expect) assert.equal(state.puzzle.sunsLit, study.expect.sunsLit);
        if ('moonDark' in study.expect) assert.equal(state.puzzle.moonDark, study.expect.moonDark);
        if ('latched' in study.expect) assert.equal(state.flags.latched, study.expect.latched);
      }
      assert.equal(state.modules.confirmation.key,
        `ruins_v2_confirmation_${state.flags.latched ? 'latched' : state.puzzle.confirmReady ? 'ready' : 'waiting'}`);
      assert.ok(state.shadow?.key.startsWith('shadow_'), `${study.id}: shared Shadow art must stay in use`);
      assert.deepEqual(errors, [], `${study.id}: browser or PNG errors`);

      const image = await page.locator('canvas').screenshot();
      const metadata = await sharp(image).metadata();
      assert.equal(metadata.width, 640); assert.equal(metadata.height, 360);
      await fs.writeFile(path.join(OUT, `${study.id}-640x360.png`), image);
      await sharp(image).resize(1280, 720, { kernel: 'nearest' }).png()
        .toFile(path.join(OUT, `${study.id}-1280x720.png`));
      if (['01-entry-planks-waiting', '02-statue-0-ready', '07-latched-door-open-curtain-closed'].includes(study.id)) {
        // Separate art presentation: freeze the same render and hide the HUD.
        await page.evaluate(() => {
          const scene = window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
          scene.scene.pause(); scene.hud.setHidden(true);
        });
        const art = await page.locator('canvas').screenshot();
        await fs.writeFile(path.join(OUT, `${study.id}-art-640x360.png`), art);
        await sharp(art).resize(1280, 720, { kernel: 'nearest' }).png()
          .toFile(path.join(OUT, `${study.id}-art-1280x720.png`));
        if (study.id === '02-statue-0-ready') {
          const decal = await fs.readFile(path.join(SPRITES, 'inscription-under-statue.png'));
          const composite = await sharp(art).composite([{ input: decal, left: 296, top: 216 }]).png().toBuffer();
          await fs.writeFile(path.join(OUT, 'decal-placement-authoring-640x360.png'), composite);
          await sharp(composite).resize(1280, 720, { kernel: 'nearest' }).png()
            .toFile(path.join(OUT, 'decal-placement-authoring-1280x720.png'));
        }
      }
      let interaction = null;
      if (study.id === '01-entry-planks-waiting') {
        await page.evaluate(() => {
          const scene=window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
          scene.hud.setHidden(false); scene.scene.resume();
        });
        await page.waitForTimeout(50);
        await page.keyboard.press('f');
        await page.waitForTimeout(200);
        interaction = await page.evaluate(() => {
          const scene=window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
          return {input:'F',lanternOn:scene.lantern.lanternOn,
            practiceSlab:scene.ruinsLevel.artById.get('practice-slab').texture.key};
        });
        assert.equal(interaction.lanternOn,false,'actual F input turns carried lamp off');
        assert.equal(interaction.practiceSlab,'ruins_v2_test_moon_lit','actual F input refreshes local practice Moon state');
      }
      assert.deepEqual(errors, [], `${study.id}: browser or PNG errors after inspection`);
      results.push({ id: study.id, fixture: study, status: 'PASS', ...state,
        browser_errors: errors, screenshot_sha256: sha(image),interaction });
      await context.close();
    }
  } finally { await browser.close(); }

  const checkedFiles = [
    'src/art/CampaignArt.ts', 'src/levels/RuinsOfTwoHalvesLevel.ts',
    'src/data/ruinsOfTwoHalvesLayout.ts', 'scripts/inspect-level08-art.cjs',
    'docs/scenario/08-ruins-of-two-halves.md', 'docs/scenario-v2/08-ruins-of-two-halves.md',
    'assets/levels/08-ruins-of-two-halves/redesign-v2/art-redesign-brief.txt',
    ...spriteFiles.map((file) => path.relative(ROOT, path.join(SPRITES, file)).replaceAll(path.sep, '/')),
  ];
  const checked = {};
  for (const file of checkedFiles) checked[file] = sha(await fs.readFile(path.join(ROOT, file)));
  const manifestPath = path.join(ART, 'production-manifest.json');
  const manifestHash = await fs.access(manifestPath).then(async () => sha(await fs.readFile(manifestPath))).catch(() => null);
  assert.ok(manifestHash, 'production-manifest.json is required to bind inspection to the approved art manifest');
  const protectedFiles = [
    ...['shadow-notch-0.png', 'shadow-notch-1.png', 'shadow-notch-2.png', 'shadow-notch-3.png']
      .map((file) => path.join(LEVEL, 'sprites', file)),
    ...await listPngs(path.join(ROOT, 'assets/levels/shared/characters/the-shadow/sprites')),
    ...await listPngs(path.join(ROOT, 'assets/levels/shared/mechanisms')).then((files) => files.filter((file) => /mirror/i.test(path.basename(file)))),
  ];
  const protectedHashes = {};
  for (const file of protectedFiles) protectedHashes[path.relative(ROOT, file).replaceAll(path.sep, '/')] = sha(await fs.readFile(file));
  await fs.writeFile(path.join(ART, 'browser-inspection.json'), `${JSON.stringify({ result: 'PASS',
    method: 'Seven isolated save fixtures rendered by Phaser in Chromium; actual scene textures, PNG dimensions, bounds, and visible state keys recorded. This is not a full playthrough.',
    source_and_sprite_sha256: checked, production_manifest_sha256: manifestHash,
    protected_shared_art_sha256: protectedHashes,
    decal_authoring_composite: { file: 'previews/decal-placement-authoring-640x360.png', center: { x: 320, y: 222 },
      source: 'untouched HUD-free Phaser render plus the asset-only decal for placement review' },
    assertions: ['local opaque backdrop and no procedural floor/masonry overlay', 'all four statue orientations',
      'entry plank mirrors and solved diagonal mirrors', 'lamp on/off and Sun/Moon lock state derivation',
      'confirmation waiting/ready/latched', 'door and seedling curtain closed/open', 'shared Shadow texture keys',
      'asset-only inscription decal size, 32-texture registration and inactive gameplay state; separate authoring placement composite at (320,222)',
      'legacy local-first resolver fallbacks',
      'no browser/page/PNG load errors'], studies: results }, null, 2)}\n`);
  console.log(`PASS: ${results.length} real 640x360 Level 08 renders; local sprite pack ${spriteFiles.length} PNGs; no browser/PNG errors.`);
}

async function listPngs(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => path.join(directory, entry.name)).sort();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
