/**
 * Export Level 01 V4 art. Requires Node 20+ and sharp (local or NODE_PATH).
 * Run from any directory: node scripts/prepare-v4-forest-art.cjs
 * Source raster images are never modified. No gameplay code or collider is changed.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/levels/01-forgotten-forest-edge/v4');
const layoutPath = path.join(ROOT, 'docs/implementation/v4/01-forest-edge-layout.json');
const files = {};
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const png = b => sharp(b).png().toBuffer();
const blank = (w, h) => sharp({ create: { width: w, height: h, channels: 4, background: transparent } });
const svg = (w, h, body) => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+body+'</svg>');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const source = name => path.join(OUT, 'sources', name + '.png');

async function save(name, buffer, meta) {
  await fs.writeFile(path.join(OUT, 'sprites', name + '.png'), buffer);
  const m = await sharp(buffer).metadata();
  files[name] = { file: 'sprites/' + name + '.png', outputSize: [m.width, m.height],
    gameSize: [m.width / 2, m.height / 2], anchor: [m.width / 4, m.height / 2],
    sha256: hash(buffer), ...meta };
  return buffer;
}
async function crop(name, box) {
  return sharp(source(name)).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).png().toBuffer();
}
// Rectilinear registration maps observed raster boundaries onto the approved layout.
// All intervals are contiguous; only resampling is performed, no painted content is invented.
async function register(buffer, xs, xd, ys, yd) {
  const layers = [];
  for (let yi = 0; yi < ys.length - 1; yi++) for (let xi = 0; xi < xs.length - 1; xi++) {
    const piece = await sharp(buffer).extract({ left: xs[xi], top: ys[yi],
      width: xs[xi+1]-xs[xi], height: ys[yi+1]-ys[yi] })
      .resize(xd[xi+1]-xd[xi], yd[yi+1]-yd[yi], { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
    layers.push({ input: piece, left: xd[xi], top: yd[yi] });
  }
  return blank(xd.at(-1), yd.at(-1)).composite(layers).png().toBuffer();
}
async function pair(sourceName, names, boxes, size, options = {}) {
  for (let i = 0; i < names.length; i++) {
    let b = await crop(sourceName, boxes[i]);
    b = await sharp(b).resize(size[0]*2, size[1]*2, { fit: 'fill' }).png().toBuffer();
    await save(names[i], b, { source: 'sources/'+sourceName+'.png', crop: boxes[i], ...options });
  }
}
async function aligned(sourceName, names, boxes, centers, canvasSize, extent, options = {}) {
  const [minX, minY, maxX] = extent;
  for (let i = 0; i < names.length; i++) {
    const [x,y,w,h] = boxes[i], [cx,base] = centers[i];
    const sx = canvasSize[0]*2/(maxX-minX), sy = canvasSize[1]*2/(-minY);
    const left = Math.round((x-cx-minX)*sx), top = Math.round((y-base-minY)*sy);
    const width = Math.min(canvasSize[0]*2-left, Math.round(w*sx));
    const height = Math.min(canvasSize[1]*2-top, Math.round(h*sy));
    const b = await sharp(await crop(sourceName, boxes[i])).resize(width,height,{fit:'fill'}).png().toBuffer();
    await save(names[i], await blank(canvasSize[0]*2,canvasSize[1]*2).composite([{input:b,left,top}]).png().toBuffer(),
      { source:'sources/'+sourceName+'.png', crop:boxes[i],
        anchor:[-minX*sx/2,canvasSize[1]], ...options });
  }
}
async function main() {
  await fs.mkdir(path.join(OUT,'sprites'),{recursive:true});
  await fs.mkdir(path.join(OUT,'previews'),{recursive:true});
  const L = JSON.parse(await fs.readFile(layoutPath,'utf8'));
  const bgInput = await fs.readFile(source('background'));
  const registration = {
    sourceX:[0,700,737,855,974,1153,1298,1570,1619,1672],
    outputX:[0,512,544,672,752,912,1008,1200,1248,1280],
    sourceY:[0,123,475,550,735,941],
    outputY:[0,104,380,428,572,720]
  };
  const bg = await register(bgInput,registration.sourceX,registration.outputX,registration.sourceY,registration.outputY);
  await save('station-yard',bg,{source:'sources/background.png',anchor:[0,0],registration});

  // Posts sit OUTSIDE the walkable gap. Source opening boundaries measured at 80% height.
  for (const [prefix,boxes,xs,xd,wh] of [
    ['door-a',[[175,100,437,378],[790,99,436,379]],[0,94,343,436],[0,28,108,136],[436,379]],
    ['gate-b',[[74,574,604,448],[725,574,604,447]],[0,142,462,604],[0,20,116,136],[604,448]]
  ]) {
    for(let i=0;i<2;i++){
      const b = await sharp(await crop('doors',boxes[i])).resize(wh[0],wh[1],{fit:'fill'}).png().toBuffer();
      const h=prefix==='door-a'?72:80;
      const out=await register(b,xs,xd,[0,wh[1]],[0,h]);
      await save(prefix+(i?'-open':'-closed'),out,{source:'sources/doors.png',crop:boxes[i],
        openingGameX:prefix==='door-a'?[14,54]:[10,58],anchor:[34,h/2],
        note:'Frame posts overlap existing wall colliders; clear passage matches layout width.'});
    }
  }
  await aligned('controls',['latch-a-released','latch-a-engaged'],
    [[169,78,239,457],[616,156,240,380]],[[289,535],[736,536]],[16,30],[-120,-457,120]);
  await aligned('controls',['brake-b-released','brake-b-engaged'],
    [[180,569,242,570],[603,754,342,385]],[[301,1139],[724,1139]],[23,28],[-121,-570,221],
    {note:'Lever sweep extends beyond the 16px collision foot; base anchor is fixed.'});
  await pair('controls',['eye-dormant','eye-live'],[[176,1215,227,231],[621,1215,227,231]],[12,12],{anchor:[6,6]});
  await pair('sockets-lantern',['socket-empty','socket-lamp-off','socket-lamp-on'],
    [[131,80,313,504],[627,79,307,504],[1099,79,310,505]],[24,34]);
  await pair('sockets-lantern',['lantern-off','lantern-on'],
    [[224,657,163,315],[688,656,167,315]],[12,18]);
  await pair('story-props',['stele-normal','stele-pulse'],[[226,82,432,446],[771,82,432,446]],[28,40]);
  await pair('story-props',['water-column-blank'],[[301,568,295,524]],[16,56]);
  await pair('story-props',['sprout'],[[904,863,242,221]],[16,16]);
  await aligned('hinge',['hinge-closed','hinge-pulled','hinge-hooked'],
    [[24,330,453,455],[539,211,458,574],[1061,211,458,574]],
    [[250,785],[768,785],[1290,785]],[24,20],[-229,-574,229]);
  const wakeBoxes=[[104,162,509,528],[752,153,517,546],[1426,157,505,526]];
  for(let i=0;i<3;i++){
    const h=[24,25,27][i]*2, b=await sharp(await crop('nhinh-waking',wakeBoxes[i])).resize({height:h}).png().toBuffer();
    const m=await sharp(b).metadata(), left=Math.floor((72-m.width)/2);
    await save(['nhinh-sleeping','nhinh-awake','nhinh-rising'][i],
      await blank(72,84).composite([{input:b,left,top:72-h}]).png().toBuffer(),
      {source:'sources/nhinh-waking.png',crop:wakeBoxes[i],anchor:[18,36],note:'End animation by switching to existing Nhinh idle sprite.'});
  }
  for(let i=0;i<2;i++){
    const b=await sharp(await crop('door-a-slam',[[109,122,554,477],[810,122,554,477]][i]))
      .resize(436,379,{fit:'fill'}).png().toBuffer();
    await save('door-a-closing-'+(i+1),await register(b,[0,94,343,436],[0,28,108,136],[0,379],[0,72]),
      {source:'sources/door-a-slam.png',anchor:[34,36],durationMs:i?45:65});
  }
  const canopy=await sharp(source('canopy')).resize(1024,432,{fit:'fill'}).png().toBuffer();
  await save('canopy',await blank(1280,720).composite([{input:canopy,left:0,top:0}]).png().toBuffer(),
    {source:'sources/canopy.png',anchor:[0,0],note:'Foreground; fade to 0.35 when it overlaps Nhinh. No collision.'});

  // Code-native vector symbols and conduit paths are intentionally deterministic.
  const glyph='<path d="M8 14V8M8 8L3 5M8 8L13 5" fill="none" stroke="#273f43" stroke-width="2"/><circle cx="3" cy="3" r="2" fill="none" stroke="#273f43" stroke-width="2"/><circle cx="13" cy="3" r="2" fill="none" stroke="#273f43" stroke-width="2"/>';
  await save('water-route-symbol',await png(svg(32,32,'<g transform="scale(2)">'+glyph+'</g>')),{source:'code-native SVG',anchor:[8,8]});
  const plaque='<rect x="1" y="1" width="30" height="30" rx="3" fill="#a77d43" stroke="#322c22" stroke-width="2"/><path d="M3 3H28" stroke="#e0bc75"/><g transform="translate(4 4) scale(1.5)">'+glyph+'</g>';
  const plaqueBuffer=await png(svg(32,32,plaque));
  await save('workshop-water-route-plaque',plaqueBuffer,{source:'code-native SVG',anchor:[8,8],
    note:'Mount beside workshop map/pipe. Uses exact same glyph as the column badge.'});
  const workshopOverlay=await blank(1280,720).composite([{input:plaqueBuffer,left:1088,top:252}]).png().toBuffer();
  await save('workshop-route-overlay',workshopOverlay,{source:'sprites/workshop-water-route-plaque.png',anchor:[0,0],
    note:'Mount at game (552,134), above the existing workshop panel at (552,172); no new collider or interaction.'});
  await sharp(path.join(ROOT,'assets/levels/00-workshop/sprites/workshop-bg.png'))
    .composite([{input:workshopOverlay,left:0,top:0},
      {input:await fs.readFile(path.join(ROOT,'assets/levels/00-workshop/sprites/panel-off.png')),left:1082,top:304}])
    .png().toFile(path.join(OUT,'previews/workshop-symbol-placement.png'));
  const column=await fs.readFile(path.join(OUT,files['water-column-blank'].file));
  const badge=await sharp(plaqueBuffer).resize(20,20,{fit:'fill'}).png().toBuffer();
  await save('water-column',await sharp(column).composite([{input:badge,left:6,top:26}]).png().toBuffer(),
    {source:['sprites/water-column-blank.png','sprites/workshop-water-route-plaque.png'],anchor:[8,56]});
  const dry=L.decor.dryChannel, dryPath=dry.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');
  await save('dry-channel',await png(svg(1280,720,'<g transform="scale(2)" fill="none"><path d="'+dryPath+'" stroke="#101f25" stroke-width="4" stroke-linecap="round"/><path d="'+dryPath+'" stroke="#6d796f" stroke-width="1" transform="translate(1.5 -1)"/><path d="'+dryPath+'" stroke="#293b3c" stroke-width="2"/></g>')),
    {source:'layout decor.dryChannel; code-native SVG',anchor:[0,0],collision:'none; flat drainage groove'});
  for(const [id,points] of Object.entries(L.lines)){
    const d=points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');
    for(const state of ['hidden','revealed','live']){
      const color={hidden:'#435346',revealed:'#a7c9c2',live:'#e9bf6c'}[state];
      const body='<g transform="scale(2)" fill="none"><path d="'+d+'" stroke="#152a2c" stroke-width="3"/><path d="'+d+'" stroke="'+color+'" stroke-width="'+(state==='hidden'?1:1.4)+'"/>'+points.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="1.3" stroke="'+color+'" stroke-width=".8"/>').join('')+'</g>';
      await save(id+'-'+state,await png(svg(1280,720,body)),{source:'layout lines.'+id+'; code-native SVG',anchor:[0,0],collision:'none'});
    }
  }
  const toolMarks='<g transform="scale(2)" stroke="#a9ded6" stroke-width="1" stroke-linecap="round"><path d="M2 8l4-5m1 6 4-5m0 6 3-3"/><path d="M2 2l2 1m8-1 2 1" opacity=".5"/></g>';
  await save('latch-tool-marks',await png(svg(32,24,toolMarks)),{source:'code-native SVG',anchor:[8,6],collision:'none; Pulse overlay'});
  const rods='<g transform="scale(2)" fill="none" stroke-linejoin="round"><path d="M374 180H385V164H400M502 42H512V62H528" stroke="#1a292c" stroke-width="3"/><path d="M374 180H385V164H400M502 42H512V62H528" stroke="#99815b" stroke-width="1.5"/><path d="M385 164h15m112-102h16" stroke="#ccb17b" stroke-width=".7"/></g>';
  await save('mechanical-linkages',await png(svg(1280,720,rods)),{source:'code-native SVG',anchor:[0,0],
    collision:'none; elevated control linkages',note:'Fixed keeper/drive connections. No new interactable or power route.'});

  const placements={
    doorA:{closed:'door-a-closed',open:'door-a-open',position:[356,214],collider:L.doorA},
    gateB:{closed:'gate-b-closed',open:'gate-b-open',position:[480,52],collider:L.gateB},
    latchA:{released:'latch-a-released',engaged:'latch-a-engaged',position:[400,182],collider:L.interactables.latchA.rect},
    brakeB:{released:'brake-b-released',engaged:'brake-b-engaged',position:[528,76],collider:L.interactables.brakeB.rect},
    s1:{empty:'socket-empty',off:'socket-lamp-off',on:'socket-lamp-on',position:[294,264],collider:L.interactables.s1.rect},
    s2:{empty:'socket-empty',off:'socket-lamp-off',on:'socket-lamp-on',position:[432,120],collider:L.interactables.s2.rect},
    eyeA:{dormant:'eye-dormant',live:'eye-live',position:[328,200]},
    eyeB:{dormant:'eye-dormant',live:'eye-live',position:[448,42]},
    stele:{normal:'stele-normal',pulse:'stele-pulse',position:[174,218],collider:L.interactables.stele.rect},
    lantern:{off:'lantern-off',on:'lantern-on',position:[214,236]},
    hinge:{closed:'hinge-closed',pulled:'hinge-pulled',hooked:'hinge-hooked',position:[124,282],collider:L.interactables.hinge.rect},
    column:{normal:'water-column',position:[576,104],collider:L.walls.waterColumn},
    sprout:{normal:'sprout',position:[244,292]}
  };
  // Ground lighting is a runtime layer; do not bake it into the yard.
  const scenes=[
    {id:'opening',a:false,b:false,lamp:'ground',on:false,la:false,lb:false,wake:true},
    {id:'a-powered',a:true,b:false,lamp:'s1',on:true,la:false,lb:false},
    {id:'a-latched',a:true,b:false,lamp:'hand',on:false,la:true,lb:false},
    {id:'both-open',a:true,b:true,lamp:'s2',on:true,la:true,lb:true},
    {id:'a-closed-b-open',a:false,b:true,lamp:'s2',on:true,la:false,lb:true}
  ];
  for(const S of scenes){
    const layers=[], props=[];
    const layer=async(name)=>layers.push({input:await fs.readFile(path.join(OUT,files[name].file)),left:0,top:0});
    const prop=async(name,x,y)=>{const f=files[name];props.push({y,input:await fs.readFile(path.join(OUT,f.file)),left:Math.round((x-f.anchor[0])*2),top:Math.round((y-f.anchor[1])*2)});};
    await layer('dry-channel');
    await layer('s1ToA-'+(S.lamp==='s1'&&S.on?'live':S.wake?'hidden':'revealed'));
    await layer('s2ToB-'+(S.lamp==='s2'&&S.on?'live':S.wake?'hidden':'revealed'));
    await layer('mechanical-linkages');
    await prop(S.a?'door-a-open':'door-a-closed',356,214);
    await prop(S.b?'gate-b-open':'gate-b-closed',480,52);
    await prop(S.la?'latch-a-engaged':'latch-a-released',400,182);
    await prop(S.lb?'brake-b-engaged':'brake-b-released',528,76);
    for(const [id,x,y] of [['s1',294,264],['s2',432,120]])await prop(S.lamp===id?(S.on?'socket-lamp-on':'socket-lamp-off'):'socket-empty',x,y);
    await prop(S.lamp==='s1'&&S.on?'eye-live':'eye-dormant',328,200);
    await prop(S.lamp==='s2'&&S.on?'eye-live':'eye-dormant',448,42);
    await prop(S.wake?'stele-normal':'stele-pulse',174,218);
    await prop('water-column',576,104);await prop('sprout',244,292);await prop(S.la?'hinge-hooked':'hinge-closed',124,282);
    if(S.lamp==='ground')await prop('lantern-off',214,236);
    if(S.wake)await prop('nhinh-awake',124,214);
    else{
      const char=await sharp(path.join(ROOT,'assets/character',S.lamp==='hand'?'nhinh_down_idle_0.png':'nhinh_down_idle_nolamp_0.png')).resize(72,84,{kernel:'nearest'}).png().toBuffer();
      props.push({y:150,input:char,left:924,top:228});
      const lumo=await sharp(path.join(ROOT,'src/assets/lumo_0.png')).resize(32,32,{kernel:'nearest'}).png().toBuffer();
      props.push({y:148,input:lumo,left:990,top:264});
    }
    props.sort((a,b)=>a.y-b.y);
    layers.push(...props.map(({y,...rest})=>rest));
    await layer('canopy');
    const scene=await sharp(bg).composite(layers).png().toBuffer();
    await fs.writeFile(path.join(OUT,'previews',S.id+'-1280x720.png'),scene);
    await sharp(scene).resize(640,360,{kernel:'nearest'}).png().toFile(path.join(OUT,'previews',S.id+'-640x360.png'));
    const rects=[...Object.entries(L.walls),...Object.entries(L.interactables).filter(([,v])=>v.solid).map(([k,v])=>[k,v.rect])];
    if(!S.a)rects.push(['doorA',L.doorA]);if(!S.b)rects.push(['gateB',L.gateB]);
    const debug=svg(1280,720,'<g transform="scale(2)" font-family="sans-serif" font-size="6">'+rects.map(([k,r])=>'<rect x="'+r.x+'" y="'+r.y+'" width="'+r.width+'" height="'+r.height+'" fill="#ff4455" fill-opacity=".12" stroke="#ff8a99" stroke-width=".5"/><text x="'+r.x+'" y="'+(r.y+5)+'" fill="white">'+k+'</text>').join('')+L.checkpoints.map(c=>'<rect x="'+c.zone.x+'" y="'+c.zone.y+'" width="'+c.zone.width+'" height="'+c.zone.height+'" fill="none" stroke="#5aff8b" stroke-width=".6"/>').join('')+'</g>');
    await sharp(scene).composite([{input:debug}]).png().toFile(path.join(OUT,'previews',S.id+'-debug.png'));
  }
  const manifest={baseRevision:'6dfbfc9',scale:2,layout:'docs/implementation/v4/01-forest-edge-layout.json',
    layoutSha256:hash(await fs.readFile(layoutPath)),filter:'Export resampling: lanczos3. Runtime and native previews: nearest (gameConfig.pixelArt=true).',
    status:'Art package; not integrated into V4 runtime',registration,placements,
    animation:{doorA:{frames:['door-a-open','door-a-closing-1','door-a-closing-2','door-a-closed'],ms:[0,65,45,70],guard:'Hold open while doorway occupied.'},
      waking:{frames:['nhinh-sleeping','nhinh-awake','nhinh-rising'],ms:[450,300,180],finish:'existing nhinh_downright_idle_nolamp_0'}},
    sources:{},assets:files};
  for(const name of await fs.readdir(path.join(OUT,'sources'))){
    const b=await fs.readFile(path.join(OUT,'sources',name));manifest.sources[name]={sha256:hash(b),tool:'built-in image_gen.imagegen',promptId:name.replace('.png','')};
  }
  await fs.writeFile(path.join(OUT,'asset-map.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('Exported '+Object.keys(files).length+' assets and '+scenes.length+' state previews.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
