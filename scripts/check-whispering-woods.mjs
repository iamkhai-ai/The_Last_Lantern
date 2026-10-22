import assert from 'node:assert/strict';
import {
  WHISPERING_WOODS, WOODS_RUNE_ART, WOODS_POEM_ART, WOODS_RUNE_BODY_FIT, fitWoodsRuneArt, WOODS_RUNE_PROMPT_OFFSET_Y, WOODS_POEM_PROMPT_OFFSET_Y,
  RUNE_ORDER, feetAt, getWoodsTutorialStage, isWoodsCenterWalkable, isWoodsPointSafe, isWoodsStoneInReach, woodsFootBody,
  WOODS_STONE_REACH_PADDING,
  resolveWoodsSpawn, normalizeRuneProgress, activateWoodsRune, canActivateWoodsRune,
} from '../src/data/whisperingWoodsLayout.ts';

assert.deepEqual(feetAt({ x: 280, y: 286 }), { x: 280, y: 305 });
assert.deepEqual(WHISPERING_WOODS.player.body, { width: 14, height: 6, offsetX: 11, offsetY: 37 });
assert.deepEqual(WHISPERING_WOODS.stands.spawn,{x:136,y:262});
assert.deepEqual(WHISPERING_WOODS.anchors.poem,{x:136,y:270});
assert.deepEqual(WHISPERING_WOODS.stands.poem,{x:136,y:262});
assert.deepEqual(WHISPERING_WOODS.footprints.poem,{x:102,y:246,width:68,height:24});
assert.deepEqual(WHISPERING_WOODS.anchors.moon,{x:232,y:242});
assert.deepEqual(WHISPERING_WOODS.stands.moon,{x:232,y:234});
assert.deepEqual(WHISPERING_WOODS.footprints.moon,{x:215,y:218,width:34,height:24});
assert.deepEqual(WHISPERING_WOODS.anchors.leaf,{x:326,y:174});
assert.deepEqual(WHISPERING_WOODS.stands.leaf,{x:326,y:166});
assert.deepEqual(WHISPERING_WOODS.footprints.leaf,{x:309,y:150,width:34,height:24});
assert.deepEqual(WHISPERING_WOODS.anchors.star,{x:408,y:266});
assert.deepEqual(WHISPERING_WOODS.stands.star,{x:408,y:258});
assert.deepEqual(WHISPERING_WOODS.footprints.star,{x:391,y:242,width:34,height:24});
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
const measuredRuneBounds={
  'moon-sleeping':{x:8,y:5,width:25,height:39},'moon-revealed':{x:10,y:11,width:21,height:34},'moon-active':{x:8,y:8,width:24,height:37},
  'leaf-sleeping':{x:8,y:5,width:25,height:39},'leaf-revealed':{x:10,y:12,width:21,height:34},'leaf-active':{x:8,y:9,width:22,height:36},
  'star-sleeping':{x:8,y:5,width:25,height:39},'star-revealed':{x:10,y:12,width:21,height:33},'star-active':{x:9,y:4,width:25,height:40},
};
for(const [variant,bounds] of Object.entries(measuredRuneBounds)){
  const fit=fitWoodsRuneArt(bounds);
  assert.ok(Math.abs(bounds.height*fit.scale-WOODS_RUNE_BODY_FIT.height)<1e-9,`${variant} visible body height`);
  assert.ok(Math.abs((bounds.x+bounds.width/2)*fit.scale+fit.offsetX-WOODS_RUNE_BODY_FIT.centerX)<1e-9,`${variant} visible body center`);
  assert.ok(Math.abs((bounds.y+bounds.height)*fit.scale+fit.offsetY-WOODS_RUNE_BODY_FIT.bottomY)<1e-9,`${variant} visible body baseline`);
  assert.ok(Number.isFinite(fit.scale)&&Number.isFinite(fit.offsetX)&&Number.isFinite(fit.offsetY),`${variant} finite transform`);
}
const emptyRuneFit=fitWoodsRuneArt({x:0,y:0,width:0,height:0});
assert.ok(Number.isFinite(emptyRuneFit.scale)&&Number.isFinite(emptyRuneFit.offsetX)&&Number.isFinite(emptyRuneFit.offsetY),'empty alpha bounds use a finite fallback');
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
/* ------------------------------------------------------------------ *
 * Level 02 stones: thick solid base + [E] from every side (RULE_GAMES §3)
 * ------------------------------------------------------------------ */
// Measured alpha>=96 bodies of the shipped art (Pillow, source pixels):
//   runestone_{moon,leaf,star}_sleeping.png  40x52 canvas, body 25x39 at (8,5)-(32,43)
//   runestone_*_revealed/_active             body 21..25 x 33..40, normalised to a 39px body by fitWoodsRuneArt
//   poem_fragment.png                        48x40 canvas, body 27x20 at (11,13)-(37,32)
// Runes are displayed at 1.5x (60x78) and the poem at 2x (96x80); the fitted rune body is 39px and the
// poem's on-screen body is 40px, so a 24px-deep footprint is 60-62% of that body.
const stoneIds = ['poem', 'moon', 'leaf', 'star'];
const runeIds = ['moon', 'leaf', 'star'];
for (const id of stoneIds) {
  const anchor = WHISPERING_WOODS.anchors[id], fp = WHISPERING_WOODS.footprints[id];
  assert.equal(fp.y + fp.height, anchor.y, `${id} footprint south edge stays on the anchor y`);
  assert.equal(fp.x + fp.width / 2, anchor.x, `${id} footprint stays centred on the anchor x`);
  assert.ok(fp.height >= 22 && fp.height <= 26, `${id} footprint depth ${fp.height} is the 22-26px band`);
  const fittedBody = id === 'poem' ? 20 * 2 : WOODS_RUNE_BODY_FIT.height;
  assert.ok(fp.height / fittedBody >= 0.55 && fp.height / fittedBody <= 0.65,
    `${id} depth ${fp.height} covers 55-65% of the ${fittedBody}px visible body`);
  if (id === 'poem') {
    assert.ok(fp.width >= 27 * 2, `${id} footprint width ${fp.width} covers the measured 54px visible base`);
  } else {
    assert.ok(fp.width >= 30 && fp.width <= 34, `${id} footprint width ${fp.width} matches the 30-34px visible base`);
    // The measured on-screen body widest row is 37.5px; the footprint matches the narrower visible *base*
    // (20-23 source px x 1.5 = 30-34.5px), which is what the east/west approach has to cover.
    assert.ok(fp.width / 1.5 >= 20 && fp.width / 1.5 <= 23, `${id} footprint width ${fp.width} is the measured base band`);
  }
}
assert.deepEqual(stoneIds.slice(1), [...RUNE_ORDER], 'the three rune stones are the puzzle runes');

const rectGap = (a, b) => Math.hypot(
  Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0),
  Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0),
);
const contactCenter = (id, side) => {
  // The foot body spans center.y+16..center.y+22, so side contacts line that 6px span up with the footprint.
  const fp = WHISPERING_WOODS.footprints[id], midY = fp.y + fp.height / 2 - 19;
  if (side === 'north') return { x: fp.x + fp.width / 2, y: fp.y - 22 };              // foot body bottom on the north edge
  if (side === 'south') return { x: fp.x + fp.width / 2, y: fp.y + fp.height - 16 };  // foot body top on the south edge
  if (side === 'west') return { x: fp.x - 7, y: midY };                               // foot body right on the west edge
  return { x: fp.x + fp.width + 7, y: midY };                                         // foot body left on the east edge
};
/** A walkable position 30px+ from the footprint and clear of the authored south approach. */
const farProbe = (id, side) => {
  const fp = WHISPERING_WOODS.footprints[id], stand = WHISPERING_WOODS.stands[id];
  const base = contactCenter(id, side);
  const normal = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 }, east: { x: 1, y: 0 } }[side];
  const tangent = { x: normal.y, y: normal.x };
  for (const lateral of [0, 40, -40, 80, -80]) {
    for (let out = 30; out <= 80; out += 2) {
      const p = { x: base.x + normal.x * out + tangent.x * lateral, y: base.y + normal.y * out + tangent.y * lateral };
      if (!isWoodsCenterWalkable(p)) continue;
      if (rectGap(woodsFootBody(p), fp) < 30) continue;
      return p;
    }
  }
  return null;
};
for (const id of stoneIds) {
  for (const side of ['north', 'east', 'west', 'south']) {
    const contact = contactCenter(id, side);
    assert.equal(isWoodsCenterWalkable(contact), true, `${id} ${side} contact is a walkable standing position`);
    assert.ok(rectGap(woodsFootBody(contact), WHISPERING_WOODS.footprints[id]) <= 0.001,
      `${id} ${side} contact really touches the footprint`);
    assert.equal(isWoodsStoneInReach(id, contact), true, `${id} answers E from ${side} contact`);
    const far = farProbe(id, side);
    assert.ok(far, `${id} ${side} has a walkable probe 30px+ away`);
    assert.equal(isWoodsStoneInReach(id, far), false,
      `${id} is out of reach 30px+ away on the ${side} (${far.x},${far.y})`);
    console.log(`      ${id} ${side}: contact (${contact.x},${contact.y}) reach=true, far (${far.x},${far.y}) reach=false`
      + `, gap ${rectGap(woodsFootBody(far), WHISPERING_WOODS.footprints[id]).toFixed(1)}px`);
  }
  // The reach point is the stand: the level is played from these positions, 8px below each footprint.
  assert.equal(isWoodsCenterWalkable(WHISPERING_WOODS.stands[id]), true, `${id} stand stays walkable`);
  assert.equal(isWoodsStoneInReach(id, WHISPERING_WOODS.stands[id]), true, `${id} answers E at its authored stand`);
}
// Reach is an 8px band (RULE_GAMES 1), so it cannot answer across the stones or from the exit.
assert.equal(WOODS_STONE_REACH_PADDING, 8, 'reach padding is 8px');
for (const id of stoneIds) {
  for (const other of stoneIds.filter((candidate) => candidate !== id)) {
    assert.equal(isWoodsStoneInReach(id, WHISPERING_WOODS.stands[other]), false,
      `${id} never answers from the ${other} stand`);
  }
  assert.equal(isWoodsStoneInReach(id, WHISPERING_WOODS.stands.exit), false, `${id} never answers from the exit stairs`);
  assert.ok(Math.hypot(contactCenter(id, 'north').x - WHISPERING_WOODS.stands.exit.x,
    contactCenter(id, 'north').y - WHISPERING_WOODS.stands.exit.y) > 32, `${id} north contact is outside the exit radius`);
}
// Fresh spawn (136,262): the poem is the only prompt; the spawn is its reach point.
assert.equal(isWoodsStoneInReach('poem', WHISPERING_WOODS.stands.spawn), true, 'the campaign spawn keeps the poem prompt');
for (const id of runeIds) {
  assert.equal(isWoodsStoneInReach(id, WHISPERING_WOODS.stands.spawn), false, `the spawn does not advertise ${id}`);
}
// The exit route and the firefly route are untouched, and every waypoint the player walks on is still legal.
assert.deepEqual(WHISPERING_WOODS.fireflyRoute, RUNE_ORDER.map((id) => WHISPERING_WOODS.anchors[id]),
  'the firefly route still flies rune anchor to rune anchor');
for (const waypoint of WHISPERING_WOODS.route) {
  assert.equal(isWoodsCenterWalkable(waypoint, true), true, `route waypoint (${waypoint.x},${waypoint.y}) stays walkable`);
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
assert.equal(isWoodsCenterWalkable({x:232,y:220}),false,'restore fixture point lies inside the current Moon base');
const moonBaseRestore=resolveWoodsSpawn({x:232,y:220},false);
assert.notDeepEqual(moonBaseRestore,{x:232,y:220},'unsafe Moon-base save is moved');
assert.equal(isWoodsCenterWalkable(moonBaseRestore),true,'unsafe Moon-base save resolves to safe floor');
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
