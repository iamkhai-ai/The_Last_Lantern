const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const os=require('node:os'),out=process.env.LEVEL02_ARTIFACT_DIR||path.join(os.tmpdir(),'the-last-lantern-level02-geometry'),results=[];
const base=process.env.LEVEL02_BASE_URL||`http://127.0.0.1:${process.argv[2]||5185}/`;
fs.mkdirSync(out,{recursive:true});
const entry=(flags={},counters={})=>({version:1,level:1,flags:{'intro-0':true,'intro-1':true,...flags},counters:{'player-level':1,'player-x':280,'player-y':286,...counters},lanternPickedUp:true,lanternOn:true});
(async()=>{
const launchOptions={headless:true};if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)launchOptions.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;const browser=await chromium.launch(launchOptions);
let page,context;
const launch=async(save)=>{if(context)await context.close();context=await browser.newContext({viewport:{width:1280,height:720}});page=await context.newPage();await page.addInitScript(s=>localStorage.setItem('last-lantern-campaign-save-v1',JSON.stringify(s)),save);await page.goto(base);await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene'));await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__LAST_LANTERN_GAME__?.scene.isActive('CampaignScene'));await page.waitForTimeout(350)};
const read=()=>page.evaluate(()=>{const s=window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');return{x:s.player.x,y:s.player.y,depth:s.player.sprite.depth,flags:{...s.progress.flags},counters:{...s.progress.counters},line:s.dialogue.fullLineText,target:s.interactions.getActiveTarget()?.id,objective:s.objectiveText?.text,tutorialCue:{visible:s.woodsTutorialCue?.visible,stage:s.woodsTutorialCue?.getData('stage'),target:s.woodsTutorialCue?.getData('target')},objects:s.objects.filter(o=>o.getData?.('woodsId')).map(o=>({id:o.getData('woodsId'),width:o.displayWidth,height:o.displayHeight,text:o.text}))}});
const runeBodies=()=>page.evaluate(()=>{const s=window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene');return s.objects.filter(o=>/^rune-(moon|leaf|star)$/.test(o.getData?.('woodsId')||'')).map(o=>{const source=o.texture.getSourceImage(),width=source.naturalWidth||source.width,height=source.naturalHeight||source.height,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height).data;let minX=width,minY=height,maxX=-1,maxY=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>=96){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}if(maxX<minX||maxY<minY)return{id:o.getData('woodsId'),key:o.texture.key,body:null};const sx=o.displayWidth/width,sy=o.displayHeight/height,left=o.x-o.originX*o.displayWidth+minX*sx,right=o.x-o.originX*o.displayWidth+(maxX+1)*sx,top=o.y-o.originY*o.displayHeight+minY*sy,bottom=o.y-o.originY*o.displayHeight+(maxY+1)*sy;return{id:o.getData('woodsId'),key:o.texture.key,body:{left,right,top,bottom,height:bottom-top,centerX:(left+right)/2}}})});
const assertRuneFit=async(label,expected)=>{const bodies=await runeBodies(),anchors={moon:{x:232,y:242},leaf:{x:326,y:174},star:{x:408,y:266}};assert.equal(bodies.length,3,`${label}: three runes`);for(const item of bodies){const id=item.id.slice(5),anchor=anchors[id];assert.ok(item.body,`${label}: ${id} alpha body exists`);assert.ok(Math.abs(item.body.height-58.5)<=2,`${label}: ${id} body height: ${JSON.stringify(item)}`);assert.ok(Math.abs(item.body.centerX-(anchor.x+.75))<=2,`${label}: ${id} body center: ${JSON.stringify(item)}`);assert.ok(Math.abs(item.body.bottom-(anchor.y-12))<=2,`${label}: ${id} base: ${JSON.stringify(item)}`);if(expected)assert.ok(item.key.includes(`_${id}_${expected[id]}`),`${label}: ${id} expected ${expected[id]}, key=${item.key}`)}return bodies};
const moveAxis=async(axis,target)=>{for(let i=0;i<70;i++){const s=await read(),d=target-s[axis];if(Math.abs(d)<2.6)return;const key=axis==='x'?(d>0?'d':'a'):(d>0?'s':'w');await page.keyboard.down(key);await page.waitForTimeout(Math.max(18,Math.min(70,Math.abs(d)/105*1000)));await page.keyboard.up(key);await page.waitForTimeout(70)}throw new Error(`Failed move ${axis} ${target}: ${JSON.stringify(await read())}`)};
const hold=async(key,ms=650)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(100)};
const sample=(focusWoodsId)=>page.evaluate((focusWoodsId)=>{
 const s=window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene'),p=s.player.sprite;
 const pixels=o=>{const a=o.texture.getSourceImage(),c=document.createElement('canvas');c.width=a.width;c.height=a.height;const x=c.getContext('2d');x.drawImage(a,0,0);return{w:c.width,h:c.height,data:x.getImageData(0,0,c.width,c.height).data}};
 const pp=pixels(p),b=p.getBounds();let opaque=0,covered=0;
 const above=s.objects.filter(o=>o.texture&&o.visible&&o.alpha>.5&&o.depth>p.depth&&o.depth<60&&(!focusWoodsId||o.getData('woodsId')===focusWoodsId)).map(o=>({key:o.texture.key,woodsId:o.getData('woodsId'),pixels:pixels(o),bounds:o.getBounds()}));
 const keys=new Set(),ids=new Set();
 for(let y=0;y<pp.h;y++)for(let x=0;x<pp.w;x++){
  if(pp.data[(y*pp.w+x)*4+3]<96)continue;opaque++;
  const wx=b.x+(x+.5)*b.width/pp.w,wy=b.y+(y+.5)*b.height/pp.h;
  for(const o of above){const px=Math.floor((wx-o.bounds.x)*o.pixels.w/o.bounds.width),py=Math.floor((wy-o.bounds.y)*o.pixels.h/o.bounds.height);if(px>=0&&py>=0&&px<o.pixels.w&&py<o.pixels.h&&o.pixels.data[(py*o.pixels.w+px)*4+3]>96){covered++;keys.add(o.key);if(o.woodsId)ids.add(o.woodsId);break}}
 }
 const prompt=s.interactions.promptContainer,pb=prompt.getBounds();return{x:p.x,y:p.y,depth:p.depth,opaque,covered,coverKeys:[...keys],coverIds:[...ids],promptVisible:prompt.visible,promptBottom:pb.bottom,actorTop:b.top,layers:s.objects.filter(o=>o.texture&&/woods.*gate|gate.*woods/.test(o.texture.key)).map(o=>({key:o.texture.key,depth:o.depth}))};
},focusWoodsId);
try{
 await launch(entry({}, {'player-level':0}));
 const spawn=await read();assert.ok(Math.abs(spawn.x-136)<1&&Math.abs(spawn.y-286)<1,`Poem-side spawn ${JSON.stringify(spawn)}`);assert.equal(spawn.target,'poem');assert.ok(spawn.objective.includes('thơ'));assert.deepEqual(spawn.tutorialCue,{visible:true,stage:'poem',target:'poem'});
 const poem=spawn.objects.find(o=>o.id==='poem');assert.ok(poem);assert.equal(poem.width,96);assert.equal(poem.height,80);
 const stones=spawn.objects.filter(o=>/^rune-(moon|leaf|star)$/.test(o.id));assert.equal(stones.length,3,'Exactly three main rune stones');for(const stone of stones){assert.equal(stone.width,60);assert.equal(stone.height,78)}
 await assertRuneFit('fresh sleeping art',{moon:'sleeping',leaf:'sleeping',star:'sleeping'});
 assert.ok(!spawn.objects.some(o=>o.id==='practice-leaf'||o.id==='practice-name'||o.id==='practice-rune'));
 const spawnPixels=await sample();assert.equal(spawnPixels.covered,0,`Spawn must remain unobscured: ${JSON.stringify(spawnPixels)}`);await page.screenshot({path:path.join(out,'level02-poem-entry.png')});results.push({name:'poem-first entry, exactly three enlarged stones and clear spawn',status:'PASS',data:spawn});
 await launch(entry({'l1-poem-read':true,'l1-activated-moon':true},{'player-level':0,'rune-sequence':1}));
 const partial=await read();assert.equal(partial.tutorialCue.stage,'sequence');assert.equal(partial.tutorialCue.visible,false);assert.ok(partial.objective.includes('1/3'),'Partial save must bypass practice and poem guidance');await assertRuneFit('partial save restores Moon active',{moon:'active',leaf:'sleeping',star:'sleeping'});results.push({name:'partial save prioritizes main puzzle stage and normalized active body',status:'PASS',data:partial});
 await launch(entry({'l1-practice-complete':true,'l1-seen-practice-leaf':true},{'player-level':1,'player-x':120,'player-y':282}));
 const legacy=await read();assert.equal(legacy.tutorialCue.stage,'poem');assert.equal(legacy.target,'poem');assert.equal(legacy.flags['l1-practice-complete'],true);assert.equal(legacy.flags['l1-seen-practice-leaf'],true);await page.keyboard.press('j');await page.waitForTimeout(100);const legacyJournal=await read();assert.ok(!legacyJournal.line.includes('bia tập'),'Legacy practice flags remain inert in J');await page.keyboard.press('e');await page.waitForTimeout(220);results.push({name:'legacy practice flags stay inert and preserved',status:'PASS',data:legacy});
 for(const open of [false,true]){
  await launch(entry({'l1-open':open,'l1-memory-seen':open},{'player-x':510,'player-y':210}));
  await assertRuneFit(`${open?'open':'closed'} gate restored rune art`,open?{moon:'active',leaf:'active',star:'active'}:{moon:'sleeping',leaf:'sleeping',star:'sleeping'});
  for(const y of open?[210,181,162,140]:[210,181,162]){
   if(y===(open?140:162))await hold('w',1000);else await moveAxis('y',y);const data=await sample();assert.ok(Math.abs(data.y-y)<3,`Stair position mismatch: ${JSON.stringify(data)}`);assert.ok(data.opaque>0);assert.equal(data.covered,0,`Stair obstruction: ${JSON.stringify(data)}`);if(data.promptVisible)assert.ok(data.promptBottom<data.actorTop,'Gate label covers actor');await page.screenshot({path:path.join(out,`level02-stairs-${open?'open':'closed'}-${y}.png`)});results.push({name:`${open?'open':'closed'} stairs ${y}`,status:'PASS',data});
  }
  await hold('w');const stop=await read();assert.ok(Math.abs(stop.y-(open?140:162))<1);results.push({name:`${open?'open':'closed'} central gate contact`,status:'PASS',sample:stop});
  await moveAxis('y',170);await hold('a');const left=await read();assert.ok(Math.abs(left.x-483)<1,`Left gate post ${JSON.stringify(left)}`);await hold('d',1000);const right=await read();assert.ok(Math.abs(right.x-537)<1,`Right gate post ${JSON.stringify(right)}`);results.push({name:`${open?'open':'closed'} solid gate posts`,status:'PASS',left,right});
 }
 for(const [name,x,startY,stopY,target] of [['moon',232,248,226,'rune-moon'],['leaf',326,184,158,'rune-leaf'],['star',408,272,250,'rune-star'],['poem',136,286,254,'poem'],['tree',48,244,214,null],['rock',100,215,179,null]]){
  await launch(entry({}, {'player-x':x,'player-y':startY}));await hold('w',1000);const data=await read();assert.ok(Math.abs(data.y-stopY)<1,`Solid ${name}: ${JSON.stringify(data)}`);if(target){assert.equal(data.target,target,`E must remain available at ${name} contact`);const visual=await sample();assert.ok(visual.promptVisible);assert.ok(visual.promptBottom<visual.actorTop,`Contact label covers actor: ${JSON.stringify(visual)}`)}results.push({name:`${name} collision/contact prompt`,status:'PASS',data});
 }
 for(const [name,y,expected] of [['behind-tree',188,true],['in-front-tree',232,false]]){
  await launch(entry({}, {'player-x':48,'player-y':y}));const data=await sample('tree-5');assert.equal(data.covered>0,expected,`${name}: ${JSON.stringify(data)}`);if(expected)assert.ok(data.coverIds.includes('tree-5'),`${name} should be occluded by tree-5: ${JSON.stringify(data)}`);await page.screenshot({path:path.join(out,`level02-${name}.png`)});results.push({name,status:'PASS',data});
 }
 for(const [name,save,open] of [
  ['legacy 3/3 counter',entry({}, {'rune-sequence':3}),true],
  ['legacy all activated',entry({'l1-activated-moon':true,'l1-activated-leaf':true,'l1-activated-star':true}),true],
  ['explicit open incomplete flags',entry({'l1-open':true,'l1-memory-seen':true}),true],
  ['unsolved stale inside gate',entry({}, {'player-x':510,'player-y':140}),false],
  ['closed contact restores in place',entry({}, {'player-x':510,'player-y':162}),false],
  ['unsolved inside moon',entry({}, {'player-x':232,'player-y':220}),false],
  ['completed stale in backing',entry({'l1-open':true,'l1-memory-seen':true}, {'player-x':510,'player-y':120}),true],
 ]){
  await launch(save);const data=await read();assert.equal(data.flags['l1-open']===true,open);if(open){assert.equal(data.counters['rune-sequence'],3);assert.ok(['moon','leaf','star'].every(id=>data.flags[`l1-activated-${id}`]===true))}if(!open)assert.ok(data.y>=162,'Unsolved restore must be near side');if(name.includes('contact restores')){assert.equal(data.x,510);assert.equal(data.y,162)}if(name.includes('inside moon'))assert.ok(!(data.x===232&&data.y===220));if(name.includes('backing'))assert.ok(data.y>=140);results.push({name,status:'PASS',data});
 }
}catch(e){console.error(e.stack);results.push({name:'geometry/restore fixture',status:'FAIL',error:String(e),sample:page?await read():null});if(page)await page.screenshot({path:path.join(out,'level02-geometry-failure.png')});process.exitCode=1}
finally{fs.writeFileSync(path.join(out,'level02-geometry-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close()}
})();
