import assert from 'node:assert/strict';
import {
  WHISPERING_WOODS, RUNE_ORDER, feetAt, isWoodsCenterWalkable, isWoodsPointSafe,
  resolveWoodsSpawn, normalizeRuneProgress, activateWoodsRune, canActivateWoodsRune,
} from '../src/data/whisperingWoodsLayout.ts';

assert.deepEqual(feetAt({ x: 280, y: 286 }), { x: 280, y: 305 });
assert.deepEqual(WHISPERING_WOODS.player.body, { width: 14, height: 6, offsetX: 11, offsetY: 37 });
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
for(const id of ['practice','moon','leaf','star','poem']){
  const anchor=WHISPERING_WOODS.anchors[id],stand=WHISPERING_WOODS.stands[id];
  assert.equal(Math.hypot(anchor.x-stand.x,anchor.y-18-stand.y)<=24,true,`${id} interaction remains reachable at southern solid contact`);
  assert.equal(anchor.y-64<stand.y-20,true,`${id} prompt stays above the actor head`);
}
assert.equal(isWoodsCenterWalkable({ x: 510, y: 162 }), true, 'physical southern contact with closed threshold remains walkable');
assert.equal(isWoodsCenterWalkable({ x: 510, y: 140 }), false, 'closed threshold blocks center above contact');
assert.equal(isWoodsCenterWalkable({ x: 510, y: 140 }, true), true, 'open central gate corridor passes');
assert.equal(isWoodsCenterWalkable({ x: 456, y: 170 }, true), false, 'gate posts remain solid');
assert.equal(isWoodsPointSafe({ x: 402, y: 174 }), true, 'poem stand reachable');
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
assert.equal(resolveWoodsSpawn(WHISPERING_WOODS.stands.moon, false).x, 180);
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
// Practice has no sequence mutation path: it is a separate durable flag in CampaignScene.
console.log('Whispering Woods contract checks PASS');
