const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const ART = path.join(ROOT, 'assets/levels/08-ruins-of-two-halves/redesign-v2');
const SRC = path.join(ART, 'sources');
async function main() {
  await fs.mkdir(path.join(SRC, 'guides'), { recursive: true });
  const entries = [];
  const old = 'assets/levels/08-ruins-of-two-halves/sprites';
  for (const file of await fs.readdir(path.join(ROOT, old))) {
    if (!file.endsWith('.png') || file.startsWith('shadow-') || file.startsWith('temple-')) continue;
    entries.push({ name: file.slice(0, -4), baseline: `${old}/${file}` });
  }
  for (let n=0; n<4; n++) entries.push({ name: `mirror_${n}`, baseline: `src/assets/mirror_${n}.png` });
  // The legacy altar and beacon are procedural. Reproduce their physical geometry
  // as authoring guides; the beacon guide excludes its decorative hanging lamp.
  for (const [name,w,h,rects] of [
    ['ruins_altar',104,52,[[8,12,88,36,'#444659'],[14,6,76,8,'#5c5f78']]],
    ['beacon_stone',34,46,[[8,8,14,34,'#586366'],[6,5,18,5,'#758285'],[8,4,14,3,'#52614f']]],
  ]) {
    const svg = `<svg width="${w}" height="${h}">${rects.map(([x,y,width,height,fill])=>`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`).join('')}</svg>`;
    await sharp(Buffer.from(svg)).ensureAlpha().png().toFile(path.join(SRC, `${name}-baseline.png`));
    entries.push({name,baseline:`assets/levels/08-ruins-of-two-halves/redesign-v2/sources/${name}-baseline.png`,procedural:true});
  }
  for (const e of entries) {
    const m=await sharp(path.join(ROOT,e.baseline)).metadata();
    e.size=[m.width,m.height];
    await sharp(path.join(ROOT,e.baseline)).resize(m.width*8,m.height*8,{kernel:'nearest'}).png().toFile(path.join(SRC,'guides',`${e.name}-8x.png`));
    if(e.name.startsWith('mirror_')) {
      // Legacy mirror canvases are almost opaque from corner to corner. Keep
      // their rectangle and extents, clearing only the four outside corner pixels
      // so the physical panel has a transparent exterior and binary alpha.
      e.original=e.baseline;
      const r=await sharp(path.join(ROOT,e.baseline)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      for(let i=3;i<r.data.length;i+=4)r.data[i]=255;
      for(const [x,y]of [[0,0],[m.width-1,0],[0,m.height-1],[m.width-1,m.height-1]])r.data[(y*m.width+x)*4+3]=0;
      e.baseline=`assets/levels/08-ruins-of-two-halves/redesign-v2/sources/${e.name}-baseline.png`;
      await sharp(r.data,{raw:r.info}).png().toFile(path.join(ROOT,e.baseline));
    }
  }
  const svg='<svg width="640" height="360"><rect width="640" height="360" fill="#222d32"/><rect x="24" y="80" width="592" height="230" fill="#343c3e"/><rect x="24" y="80" width="64" height="96" fill="#222b31"/><rect x="396" y="34" width="68" height="46" fill="#151e24"/><rect x="496" y="4" width="104" height="76" fill="#121a21"/></svg>';
  await sharp(Buffer.from(svg)).png().toFile(path.join(SRC,'guides','backdrop-layout.png'));
  await fs.writeFile(path.join(SRC,'baseline-catalog.json'),JSON.stringify(entries,null,2)+'\n');
  console.log(`Prepared ${entries.length} sprite guides and exact backdrop layout.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
