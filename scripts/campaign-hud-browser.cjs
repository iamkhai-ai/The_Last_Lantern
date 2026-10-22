/**
 * Browser regression for the shared campaign HUD (src/ui/CampaignHud.ts).
 *
 * scripts/check-campaign-hud.mjs proves the *source* is wired to one HUD; this proves the HUD
 * really behaves on the running game:
 *   - layout   : on all 10 campaign levels every HUD text sits inside 640x360, no two overlap, the
 *                top panel stays in its band, and the Pulse key exists only on levels where Space works;
 *   - pulse    : the key counts the real cooldown down, an early press answers with a toast, and Space
 *                is inert on levels without a pulse;
 *   - stress   : absurdly long title/objective/status strings cannot grow the HUD over the playfield;
 *   - dialogue : the HUD hides while a line is on screen and comes back after;
 *   - world    : the legacy WorldScene runs on the same HUD (crystal pips, no journal key).
 *
 * It starts each scene straight through the Phaser scene manager, so it does not depend on the menu.
 * Assumes the default `full` build flavor (a demo build redirects levels 05-10 to ComingSoonScene).
 *
 *   PLAYWRIGHT_MODULE / PLAYWRIGHT_CHROMIUM_EXECUTABLE   as for the other browser scripts
 *   CAMPAIGN_HUD_BASE_URL                                 default http://127.0.0.1:<PORT|5173>/
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const baseUrl = process.env.CAMPAIGN_HUD_BASE_URL || `http://127.0.0.1:${process.argv[2] || process.env.PORT || 5173}/`;
const CAMPAIGN_KEY = 'last-lantern-campaign-save-v1';
const LEGACY_KEY = 'last-lantern-save-v1';
const PULSE_LEVELS = [0, 1, 7, 8, 9];
const CANVAS = { width: 640, height: 360 };

const campaignSave = (level) => ({
  version: 1,
  level,
  flags: { 'intro-0': true, 'intro-1': true, 'intro-2': true, 'intro-3': true, 'l0-lumo-met': true, 'l0-tablet-read': true },
  counters: {},
  lanternPickedUp: true,
  lanternOn: true,
});

// A legacy SaveSystem progress object, as WorldScene expects it.
const legacySave = {
  stage: 'explore', currentZone: 'hub', lanternPickedUp: true, lanternOn: true,
  crystals: { memory: true, hope: false, balance: false },
  tutorialPulseDone: true, questIndex: 0, notes: [],
};

/** Runs in the page: every visible HUD Text (depth 86-92, walking containers) with its real bounds. */
function collectHud(sceneKey) {
  const scene = window.__LAST_LANTERN_GAME__.scene.getScene(sceneKey);
  const texts = [];
  const walk = (list, depth, visible) => {
    for (const object of list) {
      const d = depth === null ? object.depth : depth;
      const v = visible && object.visible;
      if (object.type === 'Container') { walk(object.list, d, v); continue; }
      if (object.type !== 'Text' || !v || !object.text || d < 86 || d > 92) continue;
      const b = object.getBounds();
      texts.push({ text: object.text, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), depth: d });
    }
  };
  walk(scene.children.list, null, true);
  return texts;
}

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function assertLayout(texts, label) {
  assert.ok(texts.length > 0, `${label}: the HUD drew no text at all`);
  for (const t of texts) {
    assert.ok(t.x >= 0 && t.y >= 0 && t.x + t.w <= CANVAS.width && t.y + t.h <= CANVAS.height,
      `${label}: '${t.text.slice(0, 40)}' escapes the canvas at ${t.x},${t.y} ${t.w}x${t.h}`);
  }
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      assert.ok(!overlaps(texts[i], texts[j]),
        `${label}: '${texts[i].text.slice(0, 28)}' overlaps '${texts[j].text.slice(0, 28)}'`);
    }
  }
  // Top-left block (title + objective): must stay inside the authored top HUD band.
  const top = texts.filter((t) => t.depth === 86 && t.x < 100 && t.y < 90);
  assert.ok(top.length > 0, `${label}: no title/objective text`);
  assert.ok(Math.max(...top.map((t) => t.y + t.h)) <= 64, `${label}: the top panel grew past y=64`);
  // Status row: bottom-anchored, at most two lines, above the key row.
  const status = texts.filter((t) => t.depth === 86 && t.y >= 290);
  for (const t of status) {
    assert.ok(t.y >= 304 && t.y + t.h <= 336, `${label}: status text at y=${t.y}..${t.y + t.h} leaves its 304..336 band`);
  }
  const keys = texts.filter((t) => t.depth === 87);
  if (keys.length) {
    const keysTop = Math.min(...keys.map((t) => t.y));
    for (const t of status) assert.ok(t.y + t.h <= keysTop, `${label}: status text runs into the key row`);
  }
}

const keyLabels = (texts) => texts.filter((t) => t.depth === 87).map((t) => t.text);
const hasPulseKey = (labels) => labels.includes('Pulse') || labels.some((l) => /^\d\.\ds$/.test(l));

async function openScene(browser, sceneKey, { campaign, legacy, data } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(([campaignKey, campaignValue, legacyKey, legacyValue]) => {
    if (campaignValue) localStorage.setItem(campaignKey, campaignValue); else localStorage.removeItem(campaignKey);
    if (legacyValue) localStorage.setItem(legacyKey, legacyValue); else localStorage.removeItem(legacyKey);
  }, [CAMPAIGN_KEY, campaign ? JSON.stringify(campaign) : null, LEGACY_KEY, legacy ? JSON.stringify(legacy) : null]);
  await page.goto(baseUrl);
  // BootScene hands over to MenuScene only once every texture/frame is generated; stopping earlier
  // would leave later scenes without Nhinh's frames or the darkness falloff texture.
  await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await page.evaluate(([key, sceneData]) => {
    const game = window.__LAST_LANTERN_GAME__;
    for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
    game.scene.start(key, sceneData ?? undefined);
  }, [sceneKey, data ?? null]);
  await page.waitForFunction((key) => window.__LAST_LANTERN_GAME__.scene.isActive(key), sceneKey, { timeout: 30000 });
  await page.evaluate(`window.__collectHud = ${collectHud.toString()};`);
  await page.waitForTimeout(1200);
  return { page, context, errors };
}

async function dismissDialogue(page, sceneKey) {
  for (let i = 0; i < 90; i += 1) {
    const active = await page.evaluate((key) => {
      const scene = window.__LAST_LANTERN_GAME__.scene.getScene(key);
      return Boolean((scene.dialogue ?? scene.dialogueSystem)?.isActive());
    }, sceneKey);
    if (!active) return;
    await page.keyboard.press('e');
    await page.waitForTimeout(180);
  }
  throw new Error(`${sceneKey}: dialogue never closed`);
}

const hudState = (page) => page.evaluate(() => {
  const scene = window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
  const hud = scene.hud;
  return {
    cooldown: scene.lantern.getCooldownRatio(),
    label: hud.pulseLabel.text,
    pulseVisible: hud.pulseChip.visible,
    toast: hud.toastText.visible ? hud.toastText.text : null,
  };
});

const results = [];
const only = process.env.CAMPAIGN_HUD_ONLY; // run just the tests whose name contains this text
async function test(name, fn) {
  if (only && !name.includes(only)) return;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL ${name}\n     ${String(error.message).split('\n').slice(0, 14).join('\n     ')}`);
  }
}

async function withScene(browser, sceneKey, options, body) {
  const { page, context, errors } = await openScene(browser, sceneKey, options);
  try {
    await dismissDialogue(page, sceneKey);
    await page.waitForTimeout(400);
    await body(page);
    assert.deepEqual(errors, [], `console/page errors: ${errors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

(async () => {
  console.log(`Campaign HUD browser regression: ${baseUrl}`);
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(launchOptions);

  for (let level = 0; level < 10; level += 1) {
    const label = `level ${String(level + 1).padStart(2, '0')}`;
    await test(`layout: ${label} fits the canvas, nothing overlaps, Pulse key only where Space works`, () =>
      withScene(browser, 'CampaignScene', { campaign: campaignSave(level) }, async (page) => {
        const texts = await page.evaluate(() => window.__collectHud('CampaignScene'));
        assertLayout(texts, label);
        const labels = keyLabels(texts);
        for (const glyph of ['WASD', '⇧', 'E', 'F', 'J', 'H', 'ESC']) {
          assert.ok(labels.includes(glyph), `${label}: key '${glyph}' is missing from the key row`);
        }
        assert.equal(hasPulseKey(labels), PULSE_LEVELS.includes(level),
          `${label}: Pulse key presence must match the levels where Space does something`);
      }));
  }

  await test('pulse: the key counts the real cooldown down and an early press answers with a toast', () =>
    withScene(browser, 'CampaignScene', { campaign: campaignSave(1) }, async (page) => {
      const ready = await hudState(page);
      assert.equal(ready.pulseVisible, true, 'the Pulse key is visible on level 02');
      assert.equal(ready.label, 'Pulse');
      assert.equal(ready.cooldown, 0);
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);
      const cooling = await hudState(page);
      assert.ok(cooling.cooldown > 0.5, `Space starts the cooldown, got ${cooling.cooldown}`);
      assert.match(cooling.label, /^\d\.\ds$/, `the key shows the seconds left, got '${cooling.label}'`);
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      const blocked = await hudState(page);
      assert.match(blocked.toast ?? '', /^Pulse còn \d\.\d giây$/, `an early press explains itself, got '${blocked.toast}'`);
      await page.waitForTimeout(3300);
      const back = await hudState(page);
      assert.equal(back.label, 'Pulse', 'the key returns to its ready label');
      assert.equal(back.cooldown, 0);
    }));

  await test('pulse: Space is inert and the key is hidden on levels without a pulse (library)', () =>
    withScene(browser, 'CampaignScene', { campaign: campaignSave(2) }, async (page) => {
      assert.equal((await hudState(page)).pulseVisible, false, 'no Pulse key on level 03');
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);
      assert.equal((await hudState(page)).cooldown, 0, 'Space must not spend a cooldown on level 03');
    }));

  await test('stress: absurdly long title/objective/status cannot grow the HUD over the playfield', () =>
    withScene(browser, 'CampaignScene', { campaign: campaignSave(1) }, async (page) => {
      // Set and measure inside ONE evaluate: refreshHud() rewrites these strings on the next frame.
      const texts = await page.evaluate(() => {
        const hud = window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene').hud;
        hud.setTitle('Tiêu đề màn rất dài '.repeat(40));
        hud.setObjective('Mục tiêu rất dài cần cuộn xuống '.repeat(40));
        hud.setStatus('Trạng thái rất dài của căn phòng '.repeat(60));
        hud.setLumo('LUMO · E gọi tới ấn / trở về');
        return window.__collectHud('CampaignScene');
      });
      assertLayout(texts, 'stress');
    }));

  await test('dialogue: the HUD hides while a line is on screen and returns afterwards', () =>
    withScene(browser, 'CampaignScene', { campaign: campaignSave(1) }, async (page) => {
      await page.evaluate(() => window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene')
        .say([{ speaker: 'Nhinh', text: 'Thử hộp thoại.' }]));
      await page.waitForTimeout(400);
      const during = await page.evaluate(() => {
        const scene = window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
        return { dialogue: scene.dialogue.isActive(), panels: scene.hud.panelLayer.visible, chips: scene.hud.chipLayer.visible };
      });
      assert.deepEqual(during, { dialogue: true, panels: false, chips: false }, 'the HUD hides during dialogue');
      await dismissDialogue(page, 'CampaignScene');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => {
        const scene = window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');
        return { panels: scene.hud.panelLayer.visible, chips: scene.hud.chipLayer.visible };
      });
      assert.deepEqual(after, { panels: true, chips: true }, 'the HUD returns after dialogue');
    }));

  await test('world: the legacy WorldScene runs on the shared HUD (crystal pips, Pulse key, no journal key)', () =>
    // Progress goes in as scene data: a localStorage round trip is sanitised by SaveSystem and drops the crystals.
    withScene(browser, 'WorldScene', { data: { progress: legacySave } }, async (page) => {
      const info = await page.evaluate(() => {
        const hud = window.__LAST_LANTERN_GAME__.scene.getScene('WorldScene').hud;
        return { title: hud.titleText.text, crystals: hud.crystals, texts: window.__collectHud('WorldScene') };
      });
      assert.equal(info.title, 'THE HEART TREE');
      assert.deepEqual(info.crystals, { memory: true, hope: false, balance: false });
      const labels = keyLabels(info.texts);
      assert.ok(hasPulseKey(labels), 'the Pulse key is shown with the lantern in hand');
      assert.ok(!labels.includes('Sổ tay'), 'the prologue world has no journal key');
      // The zone-subtitle toast (depth 88) sits under the top panel; the layout rules apply to the rest.
      assertLayout(info.texts.filter((t) => t.depth !== 88), 'world');
    }));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(2); });
