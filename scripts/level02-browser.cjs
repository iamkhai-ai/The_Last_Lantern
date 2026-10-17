const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const out = process.env.LEVEL02_ARTIFACT_DIR || path.join(os.tmpdir(), 'the-last-lantern-level02-browser');
const baseUrl = process.env.LEVEL02_BASE_URL || `http://127.0.0.1:${process.argv[2] || 5185}/`;
const entry = {version:1,level:1,flags:{'intro-0':true,'l0-lumo-met':true,'l0-tablet-read':true,'l0-footprints-found':true,'l0-gate-open':true},counters:{'player-level':0,'player-x':486,'player-y':151},lanternPickedUp:true,lanternOn:true};
const results=[];
const observed=new Set();
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const launchOptions={headless:true};
  if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)launchOptions.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const state=()=>page.evaluate(()=>{
    const s=window.__LAST_LANTERN_GAME__?.scene.getScene('CampaignScene');
    if(!s?.player)return null;
    const p=s.player.sprite,b=p.body;
    return {level:s.progress.level,flags:{...s.progress.flags},counters:{...s.progress.counters},x:p.x,y:p.y,depth:p.depth,body:{x:b.x,y:b.y,width:b.width,height:b.height},line:s.dialogue.fullLineText,dialogue:s.dialogue.isActive(),reveals:[...s.activeRevealedRunes],target:s.interactions.getActiveTarget()?.id,objective:s.objectiveText?.text,tutorialCue:{visible:s.woodsTutorialCue?.visible,stage:s.woodsTutorialCue?.getData('stage'),target:s.woodsTutorialCue?.getData('target')},objects:s.objects.filter(o=>o.getData?.('woodsId')).map(o=>({x:o.x,y:o.y,depth:o.depth,key:o.texture?.key,visible:o.visible,alpha:o.alpha,text:o.text,width:o.displayWidth,height:o.displayHeight,data:o.data?.getAll?.()}))};
  });
  const mark=async name=>{const sample=await state();results.push({name,status:'PASS',sample});console.log(name,JSON.stringify({level:sample.level,x:sample.x,y:sample.y,sequence:sample.counters['rune-sequence'],open:sample.flags['l1-open']}))};
  const tap=async key=>{await page.keyboard.press(key);await page.waitForTimeout(220)};
  const shot=name=>page.screenshot({path:path.join(out,`level02-${name}.png`)});
  const dismiss=async()=>{
    for(let i=0;i<100;i++){
      const s=await state();
      if(!s?.dialogue){await page.waitForTimeout(220);return}
      observed.add(s.line);await tap('e');
    }
    throw new Error('Dialogue dismissal timeout');
  };
  const axis=async(key,target)=>{
    let last=NaN,stuck=0;
    for(let i=0;i<180;i++){
      const s=await state();if(s.dialogue){await dismiss();continue}
      const d=target-s[key];if(Math.abs(d)<2.5)return;
      const button=key==='x'?(d>0?'d':'a'):(d>0?'s':'w');
      await page.keyboard.down(button);await page.waitForTimeout(Math.max(18,Math.min(90,Math.abs(d)/105*1000)));await page.keyboard.up(button);await page.waitForTimeout(35);
      stuck=Math.abs(s[key]-last)<.2?stuck+1:0;last=s[key];if(stuck>12)throw new Error(`Blocked ${key} to ${target}: ${JSON.stringify(s)}`);
    }
    throw new Error(`Move timeout ${key} ${target}`);
  };
  const move=async(x,y)=>{await axis('x',x);await axis('y',y);await page.waitForTimeout(100)};
  const sequence=async n=>assert.equal((await state()).counters['rune-sequence']||0,n);
  const pulse=async()=>{await page.waitForTimeout(3100);await tap('Space')};
  const interact=async()=>{await tap('e');await dismiss()};
  const southThen=async(x,y)=>{await axis('y',286);await move(x,y)};
  try{
    await page.addInitScript(save=>{if(!sessionStorage.getItem('level02-entry-initialized')){localStorage.setItem('last-lantern-campaign-save-v1',JSON.stringify(save));sessionStorage.setItem('level02-entry-initialized','true')}},entry);
    await page.goto(baseUrl);await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'));await tap('Enter');await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__?.scene.isActive('CampaignScene'));
    await shot('opening');await dismiss();
    const opening=await state();assert.ok(Math.abs(opening.x-138)<1&&Math.abs(opening.y-286)<1,`Expected practice-side spawn: ${JSON.stringify(opening)}`);assert.equal(opening.target,'practice-rune');assert.ok(opening.objective.includes('SPACE'));assert.deepEqual(opening.tutorialCue,{visible:true,stage:'practice-space',target:'practice'});
    for(const id of ['practice-leaf','rune-moon','rune-leaf','rune-star']){const stone=opening.objects.find(o=>o.data?.woodsId===id);assert.ok(stone,`Missing stone ${id}`);assert.equal(stone.width,60,`${id} display width`);assert.equal(stone.height,78,`${id} display height`)}
    assert.ok(opening.objects.some(o=>o.data?.woodsId==='practice-name'&&o.text==='Bia tập'));assert.ok(!opening.objective.includes('Trăng')&&!opening.objective.includes('Sao'),'Entry objective must not reveal the main order');
    for(const line of ['Đom đóm vẫn đi đúng đường cũ.','Cậu biết đường này?','Tôi biết cảm giác của nó. Có tiếng lá, tiếng trẻ con… Nhưng khi cố nhớ thì chỉ còn tiếng lá.','Mình cứ xem chúng muốn chỉ gì đã.','Bia tập ngay cạnh lối vào. Dùng SPACE để soi nét khắc nhé.'])assert.ok(observed.has(line),`Missing opening: ${line}`);
    await mark('legitimate Level02 entry, complete opening, no solution flags');
    await tap('j');assert.ok(!(await state()).line.includes('Trăng — Lá — Sao'));await dismiss();
    await move(120,286);await interact();assert.ok(!(await state()).flags['l1-practice-complete']);await sequence(0);
    await pulse();assert.ok((await state()).flags['l1-seen-practice-leaf']);assert.equal((await state()).tutorialCue.stage,'practice-e');assert.ok((await state()).objective.includes('SPACE')===false);await shot('practice-revealed');
    await page.waitForTimeout(5200);assert.equal((await state()).tutorialCue.stage,'practice-space');assert.ok((await state()).objective.includes('SPACE'));await interact();assert.ok(!(await state()).flags['l1-practice-complete'],'Expired practice revelation must not activate');
    await tap('j');assert.ok((await state()).line.includes('Lá'));await dismiss();
    await pulse();await interact();assert.equal((await state()).flags['l1-practice-complete'],true);await sequence(0);assert.equal((await state()).tutorialCue.stage,'poem');assert.ok((await state()).objective.includes('thơ'));assert.ok(observed.has('Mẩu thơ ở bên phải bia tập, ngay trên lối vào.'));await mark('practice requires live Pulse; journal survives expiry; main sequence unchanged');
    await move(236,284);await interact();assert.equal((await state()).flags['l1-poem-read'],true);assert.equal((await state()).level,1);assert.equal((await state()).tutorialCue.visible,false);assert.equal((await state()).tutorialCue.stage,'observe');await shot('poem-distinct');
    const poem='Trăng đặt giọt bạc lên lá. Lá đưa lời thì thầm lên sao. Sao khép vòng trời, chờ một sớm mai.';
    assert.ok(observed.has(poem));await tap('j');assert.ok((await state()).line.includes(poem),'Journal must keep full poem');await dismiss();await mark('separate poem and full durable journal');
    await southThen(180,258);await pulse();await page.waitForTimeout(5200);await interact();await sequence(0);assert.ok((await state()).flags['l1-seen-moon']);await mark('expired seen main rune remains inactive');
    await pulse();await interact();await sequence(1);assert.equal((await state()).tutorialCue.visible,false);assert.ok((await state()).objective.includes('Chuỗi cổ tự'));await interact();await sequence(1);await mark('first correct rune and repeat preserve prefix');
    for(let i=0;i<3;i++){await tap('h');if(i===2){const line=(await state()).line;assert.ok(line.includes('Lá'));assert.ok(!line.includes('Sao'),'Hint3 should name only next rune')}await dismiss()}
    const partial=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-lantern-campaign-save-v1')));fs.writeFileSync(path.join(out,'partial-from-play.json'),JSON.stringify(partial,null,2));
    await southThen(450,258);await pulse();await interact();await sequence(0);assert.equal((await state()).flags['l1-seen-moon'],true);assert.equal((await state()).flags['l1-poem-read'],true);assert.equal((await state()).flags['l1-practice-complete'],true);await mark('wrong pick resets only activation prefix, not discoveries');
    await southThen(180,258);await pulse();await interact();await sequence(1);
    await southThen(320,184);await pulse();await interact();await sequence(2);assert.ok(observed.has('Rễ trên cổng đang nới ra. Chúng ta đang đi đúng đường.'));await shot('two-correct');
    await southThen(450,258);await pulse();await tap('e');await shot('memory');await dismiss();await sequence(3);assert.equal((await state()).flags['l1-open'],true);assert.equal((await state()).flags['l1-memory-seen'],true);assert.equal((await state()).level,1,'Solving alone must not leave the room');
    for(const line of ['Mai mình lại ra đây nhé?','Khi mặt trời lên. Đêm nay để rừng ngủ đã.','Nơi này từng có bình minh.','Và có người đợi nó mỗi ngày.','Giọng người vừa rồi… cậu có nhận ra không?','Tôi chỉ thấy rất quen. Như một bài hát thiếu mất đoạn đầu.'])assert.ok(observed.has(line),`Missing memory: ${line}`);
    assert.equal((await state()).tutorialCue.stage,'exit');assert.ok((await state()).objective.includes('Cổng đã mở'));await mark('third correct opens gate and plays full one-time memory');
    await page.waitForTimeout(5200);const postOpenObserved=new Set(observed);observed.clear();await interact();await sequence(3);assert.ok(!observed.has('Mai mình lại ra đây nhé?'));await mark('open rune remains active and does not replay memory');for(const x of postOpenObserved)observed.add(x);
    await southThen(236,284);await interact();assert.equal((await state()).level,1);assert.ok((await state()).target==='poem');await mark('post-open poem cannot intercept gate exit');
    await axis('x',510);await move(510,181);await shot('gate-exit');assert.notEqual((await state()).target,'poem');await interact();
    assert.equal((await state()).level,2,'E at distinct stairs must enter Library');assert.ok(observed.has('Vậy xuống xem rừng đã ghi lại những gì.'));await mark('physical E at opened gate enters Library');
    await tap('Escape');const bounds=await page.locator('canvas').boundingBox();await page.mouse.click(bounds.x+320*bounds.width/640,bounds.y+241*bounds.height/360);await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'));await tap('Enter');await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__?.scene.isActive('CampaignScene'));await dismiss();assert.equal((await state()).level,2);await mark('same-runtime Continue preserves Library progress');
    assert.deepEqual(errors,[]);results.push({name:'browser console',status:'PASS',errors});
  }catch(e){console.error(e.stack);results.push({name:'Level02 browser',status:'FAIL',error:String(e),sample:await state(),errors});await shot('failure');process.exitCode=1}
  finally{fs.writeFileSync(path.join(out,'level02-browser-results.json'),JSON.stringify(results,null,2));await browser.close()}
})();
