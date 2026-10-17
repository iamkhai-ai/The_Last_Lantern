import assert from 'node:assert/strict';
import {
  WHISPERING_WOODS, WOODS_RUNE_ART, WOODS_POEM_ART, WOODS_RUNE_PROMPT_OFFSET_Y, WOODS_POEM_PROMPT_OFFSET_Y,
  RUNE_ORDER, feetAt, getWoodsTutorialStage, isWoodsCenterWalkable, isWoodsPointSafe,
  resolveWoodsSpawn, normalizeRuneProgress, activateWoodsRune, canActivateWoodsRune,
} from '../src/data/whisperingWoodsLayout.ts';

assert.deepEqual(feetAt({ x: 280, y: 286 }), { x: 280, y: 305 });
assert.deepEqual(WHISPERING_WOODS.player.body, { width: 14, height: 6, offsetX: 11, offsetY: 37 });
assert.deepEqual(WHISPERING_WOODS.stands.spawn,{x:136,y:286});
assert.deepEqual(WHISPERING_WOODS.anchors.poem,{x:136,y:270});
assert.deepEqual(WHISPERING_WOODS.stands.poem,{x:136,y:276});
assert.deepEqual(WHISPERING_WOODS.footprints.poem,{x:102,y:256,width:68,height:14});
assert.deepEqual(WHISPERING_WOODS.anchors.moon,{x:232,y:242});
assert.deepEqual(WHISPERING_WOODS.stands.moon,{x:232,y:248});
assert.deepEqual(WHISPERING_WOODS.footprints.moon,{x:219,y:230,width:26,height:12});
assert.deepEqual(WHISPERING_WOODS.anchors.leaf,{x:326,y:174});
assert.deepEqual(WHISPERING_WOODS.stands.leaf,{x:326,y:180});
assert.deepEqual(WHISPERING_WOODS.footprints.leaf,{x:313,y:162,width:26,height:12});
assert.deepEqual(WHISPERING_WOODS.anchors.star,{x:408,y:266});
assert.deepEqual(WHISPERING_WOODS.stands.star,{x:408,y:272});
assert.deepEqual(WHISPERING_WOODS.footprints.star,{x:395,y:254,width:26,height:12});
assert.deepEqual(Object.keys(WHISPERING_WOODS.footprints).sort(),['leaf','moon','poem','star']);
assert.equal('practice' in WHISPERING_WOODS.anchors,false,'runtime layout has no practice stone');
assert.equal(Math.hypot(WHISPERING_WOODS.stands.spawn.x-WHISPERING_WOODS.stands.poem.x,WHISPERING_WOODS.stands.spawn.y-WHISPERING_WOODS.stands.poem.y)<=24,true,'fresh spawn starts inside poem interaction range');
for(const id of ['moon','leaf','star']) assert.ok(Math.hypot(WHISPERING_WOODS.stands.spawn.x-WHISPERING_WOODS.stands[id].x,WHISPERING_WOODS.stands.spawn.y-WHISPERING_WOODS.stands[id].y)>24,`poem is the only fresh-spawn target, not ${id}`);
assert.deepEqual(WOODS_RUNE_ART,{sourceWidth:40,sourceHeight:52,width:60,height:78});
assert.deepEqual(WOODS_POEM_ART,{sourceWidth:48,sourceHeight:40,width:96,height:80});
assert.equal(WOODS_POEM_ART.width/WOODS_POEM_ART.sourceWidth,2);
assert.equal(WOODS_POEM_ART.height/WOODS_POEM_ART.sourceHeight,2);
assert.equal(WOODS_RUNE_ART.width/WOODS_RUNE_ART.sourceWidth,1.5);
assert.equal(WOODS_RUNE_ART.height/WOODS_RUNE_ART.sourceHeight,1.5);
for (const stand of Object.values(WHISPERING_WOODS.stands)) assert.equal(isWoodsCenterWalkable(stand), true, `stand ${stand.x},${stand.y}`);
function reachableWithin(start,target,gateOpen=false){
  const step=4,queue=[start],seen=new Set([`${start.x},${start.y}`]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<=20)return true;
    for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const next={x:p.x+dx,y:p.y+dy},key=`${next.x},${next.y}`;
      if(!seen.has(key)&&isWoodsCenterWalkable(next,gateOpen)){seen.add(key);queue.push(next);}
    }
  }
  return false;
}
for(const [name,stand] of Object.entries(WHISPERING_WOODS.stands)) assert.equal(reachableWithin(WHISPERING_WOODS.stands.spawn,stand,name==='exit'),true,`route reaches ${name}`);
for(let y=276;y<=286;y+=2) assert.equal(isWoodsCenterWalkable({x:136,y}),true,`entry-to-poem approach clear at y=${y}`);
function pointInPolygon(point,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
function onAnyGroundPath(point){return WHISPERING_WOODS.groundPaths.some((polygon)=>pointInPolygon(point,polygon));}
for(const x of [111,136,161]) assert.equal(onAnyGroundPath({x,y:330}),true,`southern entry path is at least 50px wide around x=${x}`);
const connectorCenter={x:184,y:259},connectorNormal={x:0.224,y:0.975};
for(const sign of [-1,1]) assert.equal(onAnyGroundPath({x:connectorCenter.x+connectorNormal.x*25*sign,y:connectorCenter.y+connectorNormal.y*25*sign}),true,'poem-to-clearing connector preserves a broad 50px path');
const eastCenter={x:466,y:284},eastNormal={x:-0.136,y:0.991};
for(const sign of [-1,1]) assert.equal(onAnyGroundPath({x:eastCenter.x+eastNormal.x*25*sign,y:eastCenter.y+eastNormal.y*25*sign}),true,'eastern gate approach preserves a broad 50px path');
const poemLeft=WHISPERING_WOODS.anchors.poem.x-WOODS_POEM_ART.width/2;
const poemRight=WHISPERING_WOODS.anchors.poem.x+WOODS_POEM_ART.width/2;
const moonLeft=WHISPERING_WOODS.anchors.moon.x-WOODS_RUNE_ART.width/2;
assert.equal(moonLeft-poemRight,18,'enlarged poem and Moon silhouettes retain a visible gap');
assert.equal(poemLeft,88,'enlarged poem stays inside the entry pocket');
assert.equal(WHISPERING_WOODS.anchors.poem.y-WOODS_POEM_ART.height,190,'enlarged poem art top remains below HUD');
assert.equal(WHISPERING_WOODS.anchors.poem.y+WOODS_POEM_PROMPT_OFFSET_Y,166,'poem prompt stays above enlarged art');
assert.equal(isWoodsCenterWalkable({x:136,y:254}),true,'southern stone contact remains walkable after widening the base');
assert.equal(Math.hypot(136-136,254-276)<=24,true,'E remains in range at enlarged poem base contact');
assert.equal(WHISPERING_WOODS.anchors.star.x+WOODS_RUNE_ART.width/2<WHISPERING_WOODS.gate.backing.x,true,'star artwork clears the gate arch');
function reachableClosedGateInterior(){
  const step=2,start=WHISPERING_WOODS.stands.spawn,queue=[start],seen=new Set([`${start.x},${start.y}`]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const next={x:p.x+dx,y:p.y+dy},key=`${next.x},${next.y}`;
      if(!seen.has(key)&&isWoodsCenterWalkable(next,false)){seen.add(key);queue.push(next);}
    }
  }
  return [...seen].some((key)=>{const [x,y]=key.split(',').map(Number);return x>=483&&x<=537&&y<162;});
}
assert.equal(reachableClosedGateInterior(),false,'closed gate has no 2px-grid route through posts, backing, or threshold');
for(const id of ['moon','leaf','star','poem']){
  const anchor=WHISPERING_WOODS.anchors[id],stand=WHISPERING_WOODS.stands[id];
  assert.equal(Math.hypot(anchor.x-stand.x,anchor.y-18-stand.y)<=24,true,`${id} interaction remains reachable at southern solid contact`);
  const offset=id==='poem'?WOODS_POEM_PROMPT_OFFSET_Y:WOODS_RUNE_PROMPT_OFFSET_Y;
  assert.equal(anchor.y+offset<stand.y-20,true,`${id} prompt stays above the actor head`);
}
const tutorial=(patch={})=>getWoodsTutorialStage({open:false,sequence:0,poemRead:false,...patch});
assert.equal(tutorial(),'poem','fresh entry guides the player to read first');
assert.equal(tutorial({practiceComplete:true,practiceRevealed:true}),'poem','legacy practice flags do not alter the poem-first stage');
assert.equal(tutorial({poemRead:true}),'observe');
assert.equal(tutorial({sequence:1}),'sequence','partial sequence prioritizes the puzzle over poem guidance');
assert.equal(tutorial({sequence:1,poemRead:false}),'sequence','partial legacy save bypasses poem guidance');
assert.equal(tutorial({open:true}),'exit');
assert.equal(isWoodsCenterWalkable({ x: 510, y: 162 }), true, 'physical southern contact with closed threshold remains walkable');
assert.equal(isWoodsCenterWalkable({ x: 510, y: 140 }), false, 'closed threshold blocks center above contact');
assert.equal(isWoodsCenterWalkable({ x: 510, y: 140 }, true), true, 'open central gate corridor passes');
assert.equal(isWoodsCenterWalkable({ x: 456, y: 170 }, true), false, 'gate posts remain solid');
assert.equal(isWoodsPointSafe(WHISPERING_WOODS.stands.poem), true, 'poem stand reachable');
assert.deepEqual(resolveWoodsSpawn({ x: 402, y: 167 }, false), { x: 402, y: 167 }, 'old poem-area saves remain on ordinary walkable floor');
assert.equal(Math.hypot(WHISPERING_WOODS.stands.poem.x - WHISPERING_WOODS.stands.exit.x, WHISPERING_WOODS.stands.poem.y - WHISPERING_WOODS.stands.exit.y) > 24, true, 'poem and exit targets are distinct');
assert.deepEqual(RUNE_ORDER, ['moon', 'leaf', 'star']);
assert.equal(normalizeRuneProgress({ sequence: 3, activated: { moon: true, leaf: true, star: true }, open: false }).open, true, 'legacy 3/3 recovers open');
assert.equal(normalizeRuneProgress({ sequence: 2, activated: { moon: true, leaf: true, star: false }, open: false }).sequence, 2, 'valid activated prefix restores');
assert.equal(normalizeRuneProgress({ sequence: 2, activated: { moon: true, leaf: false, star: true }, open: false }).sequence, 1, 'contradictory flags trim to conservative prefix');
assert.equal(normalizeRuneProgress({ sequence: 0, activated: {}, open: true }).sequence, 3, 'explicit legacy open normalizes all tablets active');
assert.deepEqual(normalizeRuneProgress({ sequence: 3, activated: {}, open: false }).activated, { moon: true, leaf: true, star: true }, 'legacy sequence three restores all activations');
const restored=resolveWoodsSpawn({ x: 550, y: 120 }, false);
assert.equal(isWoodsPointSafe(restored,false),true,'invalid/backing restore resolves safely');
assert.equal(restored.y>WHISPERING_WOODS.gate.openStopY,true,'locked restore stays on near side');
assert.equal(resolveWoodsSpawn(WHISPERING_WOODS.stands.moon, false).x, 232);
assert.equal(resolveWoodsSpawn(WHISPERING_WOODS.stands.exit, true).x, 510);
assert.deepEqual(resolveWoodsSpawn({ x: 510, y: 162 }, false), { x: 510, y: 162 }, 'closed-gate safe contact restore stays in place');
assert.equal(resolveWoodsSpawn({ x: 510, y: 140 }, false).y >= 162, true, 'closed-gate save behind threshold restores near side');
assert.deepEqual(resolveWoodsSpawn({ x: 510, y: 140 }, true), { x: 510, y: 140 }, 'open-gate corridor save remains valid');
let state = normalizeRuneProgress({ sequence: 0, activated: {}, open: false });
let result = activateWoodsRune(state, 'moon'); state = result.state; assert.equal(result.kind, 'activated');
assert.equal(activateWoodsRune(state, 'moon').kind, 'repeat');
assert.equal(activateWoodsRune(state, 'star').kind, 'reset');
assert.equal(activateWoodsRune(state, 'star').state.sequence, 0);
assert.deepEqual(activateWoodsRune(normalizeRuneProgress({ sequence: 0, activated: {}, open: false }), 'leaf').state.activated, { moon: false, leaf: false, star: false });
assert.equal(activateWoodsRune(state, 'leaf').state.sequence, 2);
assert.equal(activateWoodsRune(activateWoodsRune(state, 'leaf').state, 'star').state.open, true);
assert.equal(canActivateWoodsRune(false,false),false,'durable discovery alone does not enable a sleeping glyph');
assert.equal(canActivateWoodsRune(true,false),true,'live Pulse enables activation');
assert.equal(canActivateWoodsRune(false,true),true,'activated rune stays interactable after Pulse expires');
console.log('Whispering Woods contract checks PASS');
