/** Deterministic pixel exports from retained image_gen sources and original alpha masks. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const ROOT=path.resolve(__dirname,'..');
const ART=path.join(ROOT,'assets/levels/08-ruins-of-two-halves/redesign-v2');
const SRC=path.join(ART,'sources'), OUT=path.join(ART,'sprites'), PRE=path.join(ART,'previews');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const image=(data,width,height)=>sharp(data,{raw:{width,height,channels:4}});
const blank=(width,height,color='#00000000')=>sharp({create:{width,height,channels:4,background:color}});
async function raw(file){return sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
function bounds(data,w,h){let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>=192){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}assert.ok(r>=l,'nonempty opaque source');return {left:l,top:t,width:r-l+1,height:b-t+1};}
function family(n){
  const key=n.replace(/-notch-\d$/,'-notch').replace(/_\d$/,'').replace(/-(off|on|covered|lit|open|closed|waiting|ready|latched)$/,'');
  return key==='test-column-notch'?'statue-notch':key==='test-moon'?'lock-moon':key;
}
/** Weighted median-cut, one RGB mapping for the whole family, no spatial dithering.
 * sharp 0.35 rounds PNG palette bit depth to 8 for a requested 128 colours, so
 * decoded pixels can still contain 256 entries. Enforce the actual budget here.
 */
async function quantize(buffer,limit=128){
  const {data,info}=await raw(buffer),hist=new Map();
  for(let i=0;i<data.length;i+=4)if(data[i+3]){const k=(data[i]<<16)|(data[i+1]<<8)|data[i+2];hist.set(k,(hist.get(k)||0)+1);}
  const values=[...hist].map(([key,count])=>({key,count,rgb:[key>>>16,(key>>>8)&255,key&255]}));
  function bucket(items){
    const low=[255,255,255],high=[0,0,0];let count=0;
    for(const p of items){count+=p.count;for(let c=0;c<3;c++){low[c]=Math.min(low[c],p.rgb[c]);high[c]=Math.max(high[c],p.rgb[c]);}}
    const ranges=high.map((v,c)=>v-low[c]),channel=ranges.indexOf(Math.max(...ranges));
    return {items,count,channel,score:Math.max(...ranges)*Math.sqrt(count)};
  }
  const buckets=[bucket(values)];
  while(buckets.length<limit){
    let index=-1;for(let i=0;i<buckets.length;i++)if(buckets[i].items.length>1&&(index<0||buckets[i].score>buckets[index].score))index=i;
    if(index<0)break;
    const b=buckets[index],sorted=b.items.sort((a,d)=>a.rgb[b.channel]-d.rgb[b.channel]||a.key-d.key);let weight=0,split=0;
    while(split<sorted.length-1&&weight<b.count/2)weight+=sorted[split++].count;
    split=Math.max(1,split);buckets.splice(index,1,bucket(sorted.slice(0,split)),bucket(sorted.slice(split)));
  }
  const mapping=new Map();
  for(const b of buckets){const mean=[0,0,0];for(const p of b.items)for(let c=0;c<3;c++)mean[c]+=p.rgb[c]*p.count;for(let c=0;c<3;c++)mean[c]=Math.round(mean[c]/b.count);for(const p of b.items)mapping.set(p.key,mean);}
  for(let i=0;i<data.length;i+=4){if(!data[i+3]){data[i]=data[i+1]=data[i+2]=0;continue;}const c=mapping.get((data[i]<<16)|(data[i+1]<<8)|data[i+2]);data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2];}
  return image(data,info.width,info.height).png({palette:false}).toBuffer();
}
async function fit(e){
  const reference=await raw(path.join(ROOT,e.baseline));
  const bb=bounds(reference.data,...e.size);
  let source=`${e.name}-original.png`;
  // Practice props are the same physical families at half native scale.
  if(e.name.startsWith('test-column-notch-'))source=e.name.replace('test-column','statue')+'-original.png';
  if(e.name.startsWith('test-moon-'))source=e.name.replace('test-moon','lock-moon')+'-original.png';
  const generated=await raw(path.join(SRC,source));
  const gb=bounds(generated.data,generated.info.width,generated.info.height);
  const fitted=await image(generated.data,generated.info.width,generated.info.height).extract(gb).resize(bb.width,bb.height,{fit:'fill',kernel:'nearest'}).raw().toBuffer();
  const out=Buffer.alloc(e.size[0]*e.size[1]*4);
  for(let y=0;y<bb.height;y++)for(let x=0;x<bb.width;x++){
    const dest=((y+bb.top)*e.size[0]+x+bb.left)*4, src=(y*bb.width+x)*4;
    if(reference.data[dest+3]<192)continue;
    // The original opaque mask fixes registration and silhouette independently
    // of generation. Tiny clear source samples become neutral material, never glow.
    // The open arch is a uniformly dark interior. Very dark source samples
    // belong to the same void as its low-alpha samples, not isolated black dots.
    const interiorVoid=e.name==='sanctuary-door-open'&&Math.max(fitted[src],fitted[src+1],fitted[src+2])<20;
    const valid=fitted[src+3]>=192&&!interiorVoid;
    const fill=e.name==='sanctuary-door-open'?[12,21,29]:[47,59,64];
    out[dest]=valid?fitted[src]:fill[0];out[dest+1]=valid?fitted[src+1]:fill[1];out[dest+2]=valid?fitted[src+2]:fill[2];out[dest+3]=255;
  }
  return {...e,data:out,source:`sources/${source}`,family:family(e.name),bbox:bb};
}
async function backdrop(){
  const file=path.join(SRC,'temple-scene-base-original.png');
  const base=await sharp(file).resize(640,360,{fit:'fill',kernel:'nearest'}).ensureAlpha().png().toBuffer();
  // Place generated material inside the exact authored walkable/solid regions.
  // The guide's buttress is a solid pier, not the model's courtyard inset.
  const floor=await sharp(base).extract({left:100,top:88,width:490,height:204}).resize(592,230,{kernel:'nearest'}).png().toBuffer();
  const pier=await sharp(base).extract({left:96,top:22,width:64,height:53}).resize(64,96,{kernel:'nearest'}).png().toBuffer();
  const cap=await sharp(base).extract({left:24,top:78,width:64,height:7}).png().toBuffer();
  return quantize(await sharp(base).composite([{input:floor,left:24,top:80},{input:pier,left:24,top:80},{input:cap,left:24,top:80}]).ensureAlpha().png().toBuffer());
}
async function writeManifest(exports){
  const sourceRecords=[];
  for(const f of (await fs.readdir(SRC)).filter(f=>f.endsWith('.png')||f.endsWith('.json')).sort()){
    const b=await fs.readFile(path.join(SRC,f));sourceRecords.push({file:`sources/${f}`,sha256:hash(b)});
  }
  const protectedFiles=[];
  const add=async dir=>{for(const f of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){const rel=dir+'/'+f.name;if(f.isDirectory())await add(rel);else if(f.name.endsWith('.png'))protectedFiles.push({file:rel,sha256:hash(await fs.readFile(path.join(ROOT,rel)))});}};
  await add('assets/levels/shared/characters/the-shadow');
  for(let n=0;n<4;n++)for(const file of [`assets/levels/08-ruins-of-two-halves/sprites/shadow-notch-${n}.png`,`src/assets/mirror_${n}.png`])protectedFiles.push({file,sha256:hash(await fs.readFile(path.join(ROOT,file)))});
  const inputs=JSON.parse(await fs.readFile(path.join(SRC,'baseline-catalog.json'),'utf8'));
  const references=[];
  for(const file of [...inputs.flatMap(e=>e.original?[e.original,e.baseline]:[e.baseline]),'assets/levels/07-the-sleeping-garden/redesign-v2/sprites/garden-scene-base.png'])references.push({file,sha256:hash(await fs.readFile(path.join(ROOT,file)))});
  const authoring={};for(const file of ['scripts/prepare-level08-art.cjs','scripts/export-level08-art.cjs','assets/levels/08-ruins-of-two-halves/redesign-v2/art-redesign-brief.txt'])authoring[file]=hash(await fs.readFile(path.join(ROOT,file)));
  const manifest={version:1,date:'2026-10-22',scope:'Level 08 art redraw only; fixed gameplay, geometry and state orientations.',base_revision:'e7824c4a54d88bf7f158bf8914e498f66b086bac',tool:'Built-in image_gen; model/version not exposed by tool',approval:'User approved the in-chat art direction in Level08 and instructed this chat to implement.',provenance:'Project-owned source sprites and style references restyled with built-in image_gen. Original tool outputs retained with metadata; technical nearest sampling, exact source-mask projection and family-wide palette quantization performed by this script.',pipeline:{filter:'nearest',alpha:'binary 0/255',max_family_colours:128,dither:false,pivot:'bottom-centre; runtime placement unchanged',decal:{center:[320,222],depth:4,status:'Asset and authoring composite only. Pulse gameplay hook is outside this art-only scope.'}},authoring_sha256:authoring,sources:sourceRecords,references,protected:protectedFiles,exports};
  await fs.writeFile(path.join(ART,'production-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const lines=['# Level 08 native asset report','','Generated from decoded PNG pixels, not declared dimensions.','','| File | Size | Colours | Opaque bounds x,y,w,h | Inside canvas | Family colours |','|---|---|---:|---|---|---:|',...exports.map(e=>`| ${e.file.split('/').pop()} | ${e.canvas.join('×')} | ${e.colours} | ${[e.opaque_box.left,e.opaque_box.top,e.opaque_box.width,e.opaque_box.height].join(', ')} | PASS | ${e.family_colours} |`),'','All props preserve the documented binary baseline mask exactly. Legacy mirror canvases are almost opaque throughout; only their four outside corner pixels are cleared, preserving rectangular extents and state orientation. The beacon baseline reproduces its physical stone body only, excluding the legacy decorative lamp. New decal uses its own authored alpha. Background is opaque; every other output has transparent pixels.'];
  await fs.writeFile(path.join(ART,'asset-report.md'),lines.join('\n')+'\n');
}
async function previews(){
  const read=n=>fs.readFile(path.join(OUT,n+'.png'));
  for(let n=0;n<4;n++){
    const solved=n===0, latched=n===2, active=n!==1;
    const layers=[];const add=async(name,x,y)=>layers.push({input:await read(name),left:x,top:y});
    await add(`sanctuary-door-${latched?'open':'closed'}`,496,4);
    await add('beacon_stone',413,34);
    await add(`seedling-curtain-${latched?'closed':'open'}`,136,104);
    await add(`lock-sun-${active?'on':'off'}`,224,92);await add(`lock-sun-${active?'on':'off'}`,384,92);
    await add(`lock-moon-${n%2===0?'covered':'lit'}`,304,92);
    await add(`test-moon-${n%2===0?'covered':'lit'}`,198,214);
    await add('test-pedestal',126,216);await add(`test-column-notch-${n}`,134,201);
    await add('inscription-under-statue',296,216);await add(`statue-notch-${n}`,288,132);
    await add(`mirror_${[1,3,0,2][n]}`,222,214);await add(`mirror_${[0,2,1,3][n]}`,382,214);
    await add(`fixed-three-route-splitter-${active?'on':'off'}`,296,214);
    await add('ruins_altar',428,210);await add(`confirmation-${latched?'latched':solved?'ready':'waiting'}`,456,218);
    const png=await sharp(await read('temple-scene-base')).composite(layers).png().toBuffer();
    await fs.writeFile(path.join(PRE,`composite-${n}-native-1x.png`),png);
    await sharp(png).resize(1280,720,{kernel:'nearest'}).png().toFile(path.join(PRE,`composite-${n}-nearest-2x.png`));
  }
  const names=(await fs.readdir(OUT)).filter(f=>f.endsWith('.png')&&!f.startsWith('temple-')).sort();
  const cells=[];for(let i=0;i<names.length;i++){
    const b=await fs.readFile(path.join(OUT,names[i]));const m=await sharp(b).metadata();
    const art=await sharp(b).resize(m.width*2,m.height*2,{kernel:'nearest'}).png().toBuffer();
    const x=(i%5)*240,y=Math.floor(i/5)*210;
    const label=Buffer.from(`<svg width="240" height="22"><text x="4" y="14" font-size="10" fill="#c1c9c7" font-family="monospace">${names[i].replace('.png','')}</text></svg>`);
    cells.push({input:label,left:x,top:y},{input:art,left:x+Math.floor((240-m.width*2)/2),top:y+28});
  }
  await blank(1200,Math.ceil(names.length/5)*210,'#222e34').composite(cells).png().toFile(path.join(PRE,'contact-nearest-2x.png'));
}
async function main(){
  await Promise.all([OUT,PRE].map(d=>fs.mkdir(d,{recursive:true})));
  const catalog=JSON.parse(await fs.readFile(path.join(SRC,'baseline-catalog.json'),'utf8'));
  const groups=new Map();for(const e of catalog){const prepared=await fit(e);if(!groups.has(prepared.family))groups.set(prepared.family,[]);groups.get(prepared.family).push(prepared);}
  const records=[];
  async function record(e,buffer,familyColours){
    assert.equal(buffer[25],6,e.name+' PNG must use RGBA colour type 6');
    await fs.writeFile(path.join(OUT,e.name+'.png'),buffer);
    const r=await raw(buffer);assert.deepEqual([r.info.width,r.info.height],e.size);
    const colors=new Set(),alpha=new Set();let clear=0;
    for(let i=0;i<r.data.length;i+=4){alpha.add(r.data[i+3]);if(r.data[i+3])colors.add(r.data.subarray(i,i+3).toString('hex'));else clear++;}
    assert.ok([...alpha].every(a=>a===0||a===255),e.name+' binary alpha');assert.ok(colors.size<=128,e.name+' colours');
    assert.ok(e.name==='temple-scene-base'?clear===0:clear>0,e.name+' transparency');
    if(e.baseline){const ref=await raw(path.join(ROOT,e.baseline));for(let i=3;i<r.data.length;i+=4)assert.equal(r.data[i],ref.data[i]>=192?255:0,e.name+' silhouette');}
    records.push({file:'sprites/'+e.name+'.png',canvas:e.size,png_colour_type:6,family:e.family,family_colours:familyColours??colors.size,colours:colors.size,opaque_box:bounds(r.data,...e.size),opaque_inside_canvas:true,alpha:[...alpha].sort(),source:e.source,baseline:e.baseline??null,sha256:hash(buffer)});
  }
  for(const [name,entries]of groups){
    const w=Math.max(...entries.map(e=>e.size[0])),h=entries.reduce((n,e)=>n+e.size[1],0);let top=0;const layers=[];
    for(const e of entries){e.top=top;layers.push({input:await image(e.data,...e.size).png().toBuffer(),left:0,top});top+=e.size[1];}
    const strip=await quantize(await blank(w,h).composite(layers).png().toBuffer());const decoded=await raw(strip);const colors=new Set();for(let i=0;i<decoded.data.length;i+=4)if(decoded.data[i+3])colors.add(decoded.data.subarray(i,i+3).toString('hex'));assert.ok(colors.size<=128,name+' family budget');
    for(const e of entries)await record(e,await sharp(strip).extract({left:0,top:e.top,width:e.size[0],height:e.size[1]}).ensureAlpha().png({palette:false}).toBuffer(),colors.size);
  }
  await record({name:'temple-scene-base',family:'temple',size:[640,360],source:'sources/temple-scene-base-original.png'},await backdrop());
  const source=await raw(path.join(SRC,'inscription-under-statue-original.png'));const bb=bounds(source.data,source.info.width,source.info.height);
  const decal=await image(source.data,source.info.width,source.info.height).extract(bb).resize(44,5,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
  for(let i=0;i<decal.length;i+=4){const a=decal[i+3]>=192?255:0;decal[i]=48;decal[i+1]=58;decal[i+2]=62;decal[i+3]=a;}
  await record({name:'inscription-under-statue',family:'inscription',size:[48,12],source:'sources/inscription-under-statue-original.png'},await blank(48,12).composite([{input:await image(decal,44,5).png().toBuffer(),left:2,top:4}]).png().toBuffer());
  assert.equal(records.length,32);await writeManifest(records);await previews();console.log('PASS: 32 RGBA native exports, exact baseline masks, binary alpha, <=128 colours per family and 4 native/2x composites.');
}
module.exports={fit};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
