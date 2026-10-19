const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = process.env.LEVEL01_ARTIFACT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'last-lantern-level01-'));
fs.mkdirSync(out, { recursive: true });
const baseUrl = process.env.LEVEL01_BASE_URL || `http://127.0.0.1:${process.argv[2] || process.env.PORT || 5181}/`;
const results = [];
const observedDialogue = new Set();
console.log(`Level 01 browser regression: ${baseUrl}`);
console.log(`Artifacts: ${out}`);
(async () => {
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => {
    const g = window.__LAST_LANTERN_GAME__;
    const s = g?.scene.getScene('CampaignScene');
    if (!s?.player) return null;
    const p = s.player.sprite;
    const body = p.body;
    return { level: s.progress.level, flags: { ...s.progress.flags }, picked: s.progress.lanternPickedUp, lampOn: s.lantern.lanternOn,
      dialogue: s.dialogue.isActive(), inputLocked: s.dialogue.isInputLocked(performance.now()), line: s.dialogue.fullLineText,
      x: p.x, y: p.y, body: { x: body.x, y: body.y, width: body.width, height: body.height }, depth: p.depth,
      target: s.interactions.getActiveTarget()?.id ?? null, objective: s.hud?.objectiveText?.text, charge: s.forestEdgeChargeMs,
      lumoVisible: s.lumo.sprite.visible, pulseCooldown: s.lantern.getCooldownRatio(),
      objects: s.objects.filter(o => o.texture && o.getData('forestEdgeId')).map(o => ({ id:o.getData('forestEdgeId'),x:o.x,y:o.y,depth:o.depth,texture:o.texture.key })) };
  });
  const mark = async name => { const s = await state(); results.push({ name, status: 'PASS', state: s }); console.log(name, JSON.stringify({x:s.x,y:s.y,picked:s.picked,lampOn:s.lampOn,flags:s.flags})); };
  const shot = name => page.screenshot({ path: path.join(out, `level01-${name}.png`) });
  const tap = async key => { await page.keyboard.press(key); await page.waitForTimeout(230); };
  const dismiss = async () => {
    for (let i=0;i<100;i++) {
      const s = await state();
      if (!s?.dialogue) { await page.waitForTimeout(250); return; }
      observedDialogue.add(s.line);
      await tap('e');
    }
    throw new Error('Dialogue did not finish');
  };
  const moveAxis = async (axis, target) => {
    let stuck = 0, last = NaN;
    for(let i=0;i<180;i++) {
      const s = await state();
      if(s.dialogue) { await dismiss(); continue; }
      const d = target-s[axis];
      if(Math.abs(d)<3) return;
      const key = axis==='x' ? (d>0?'d':'a') : (d>0?'s':'w');
      await page.keyboard.down(key);
      await page.waitForTimeout(Math.max(18,Math.min(100,Math.abs(d)/105*1000)));
      await page.keyboard.up(key);
      await page.waitForTimeout(22);
      if(Math.abs(s[axis]-last)<0.2) stuck++; else stuck=0;
      last=s[axis];
      if(stuck>12) throw new Error(`Blocked moving ${axis} to ${target}: ${JSON.stringify(s)}`);
    }
    throw new Error(`Move timeout: ${axis} ${target}`);
  };
  const move = async (x,y,first='x') => { if(first==='x') { await moveAxis('x',x); await moveAxis('y',y); } else { await moveAxis('y',y); await moveAxis('x',x); } await page.waitForTimeout(90); };
  try {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'));
    await tap('Enter');
    await page.waitForFunction(() => window.__LAST_LANTERN_GAME__?.scene.isActive('CampaignScene'));
    await shot('opening');
    await dismiss();
    let s=await state(); assert.equal(s.level,0); assert.equal(s.picked,false);
    await tap('f'); await tap('Space');
    s=await state(); assert.equal(s.lampOn,false); assert.ok(!s.flags['l0-tablet-read']); assert.ok(!s.flags['l0-footprints-found']);
    await mark('early controls do not skip tutorial');
    await move(224,251); await dismiss(); await tap('e'); await dismiss();
    s=await state(); assert.equal(s.picked,true); assert.equal(s.lampOn,false);
    await mark('nearby meeting and lantern pickup');
    await move(300,250); await moveAxis('y',238); await tap('e'); await dismiss();
    assert.ok(!(await state()).flags['l0-tablet-read']);
    await mark('unlit tablet remains unread');
    await tap('f'); await tap('Space'); assert.ok(!(await state()).flags['l0-footprints-found']); assert.equal((await state()).pulseCooldown,0,'Pulse must not fire or consume cooldown before tablet teaches it');
    await tap('e'); await dismiss(); assert.equal((await state()).flags['l0-tablet-read'],true);
    await page.waitForTimeout(3100); await tap('Space'); await dismiss();
    assert.equal((await state()).flags['l0-footprints-found'],true);
    for(const line of ['Có người từng đi qua đây.','Và họ để lại đường cho chúng ta. Đi cùng tôi nhé?','Đi cùng nhau.']) assert.ok(observedDialogue.has(line),`Missing first-discovery dialogue: ${line}`);
    await page.waitForTimeout(3100); await tap('Space'); assert.equal((await state()).dialogue,false,'Repeated Pulse must not replay footprint discovery dialogue');
    await shot('trail'); await mark('lit tablet then Pulse reveals trail');
    await tap('f');
    await move(486,191); await moveAxis('y',151);
    await page.keyboard.down('w'); await page.waitForTimeout(800); await page.keyboard.up('w'); await page.waitForTimeout(120);
    s=await state(); assert.ok(!s.flags['l0-gate-open']); assert.ok(Math.abs(s.x-486)<3,`closed gate must block in place, not teleport: ${s.x},${s.y}`); assert.ok(s.y>120 && s.y<160,`closed gate failed: ${s.y}`);
    await mark('closed passage blocks northward movement');
    await moveAxis('y',191); await moveAxis('x',410);
    await shot('ring-off'); assert.ok(!(await state()).flags['l0-gate-open']);
    await tap('f'); await page.waitForTimeout(100); await tap('f');
    assert.ok(!(await state()).flags['l0-gate-open']);
    await tap('f'); await page.waitForTimeout(1100); await dismiss();
    assert.equal((await state()).flags['l0-gate-open'],true);
    await shot('gate-open'); await mark('ring charges only with continuous light and latches gate');
    await tap('f'); assert.equal((await state()).flags['l0-gate-open'],true);
    await mark('fresh uninterrupted new-game session reaches gate');
    await moveAxis('y',191); await moveAxis('x',486); await moveAxis('y',151); await tap('e'); await dismiss();
    assert.equal((await state()).level,1); await mark('physical exit transitions to Level 02');
    const clickWorld=async(x,y)=>{const r=await page.locator('canvas').boundingBox();await page.mouse.click(r.x+x*r.width/640,r.y+y*r.height/360);await page.waitForTimeout(300)};
    await tap('Escape'); await clickWorld(320,241);
    await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__.scene.isActive('MenuScene'));
    await tap('Enter'); await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__.scene.isActive('CampaignScene'));await dismiss();
    assert.equal((await state()).level,1,'Continue in same runtime must keep Level02'); await mark('same-runtime Continue preserves progress');
    await tap('Escape'); await clickWorld(320,241);
    await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__.scene.isActive('MenuScene'));
    await tap('s'); await tap('Enter');await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__.scene.isActive('CampaignScene'));await dismiss();
    assert.equal((await state()).level,0);assert.equal((await state()).picked,false);assert.ok(!(await state()).flags['l0-gate-open']);await mark('explicit second NewGame resets progress');
    await move(224,251);await dismiss();await tap('e');await dismiss();assert.equal((await state()).picked,true);
    await tap('Escape');await clickWorld(320,177);await clickWorld(320,177);await page.waitForTimeout(300);await dismiss();
    assert.equal((await state()).level,0);assert.equal((await state()).picked,false);await mark('confirmed pause Restart resets progress');
    assert.deepEqual(errors,[]);
    results.push({ name:'browser console',status:'PASS',errors });
  } catch(e) {
    console.error(e.stack); results.push({name:'browser check',status:'FAIL',error:String(e),state:await state(),errors});
    await shot('failure'); process.exitCode=1;
  } finally {
    results.unshift({ name: 'run configuration', baseUrl, artifactsDirectory: out });
    fs.writeFileSync(path.join(out,'level01-browser-results.json'), JSON.stringify(results,null,2));
    await browser.close();
  }
})();
