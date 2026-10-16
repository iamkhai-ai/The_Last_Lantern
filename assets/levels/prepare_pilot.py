"""Non-destructive crops, nearest-neighbor exports and offline review composites.
No image generation API; generated source PNGs must already exist.
"""
from pathlib import Path
import json, hashlib, subprocess, math
from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/levels'
SHARED = OUT / 'shared'
PILOT = OUT / '02-whispering-woods'
for p in [SHARED, PILOT / 'sources', PILOT / 'previews', PILOT / 'sprites']:
    p.mkdir(parents=True, exist_ok=True)
def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def rel(path):
    return path.relative_to(ROOT).as_posix()
def inspect(path):
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A')
    return {'path':rel(path), 'size':list(im.size), 'mode':Image.open(path).mode,
            'alpha_extrema':list(a.getextrema()), 'bbox':list(a.getbbox()) if a.getbbox() else None,
            'sha256':sha(path)}
def fit(im, canvas, bound=None, bottom=2):
    im=im.convert('RGBA')
    bbox=im.getchannel('A').getbbox()
    if not bbox: raise ValueError('Empty source')
    im=im.crop(bbox)
    bw,bh=bound or (canvas[0]-4,canvas[1]-4)
    scale=min(bw/im.width,bh/im.height)
    im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))), Image.Resampling.NEAREST)
    result=Image.new('RGBA',canvas)
    pos=((canvas[0]-im.width)//2,canvas[1]-bottom-im.height)
    result.alpha_composite(im,pos)
    return result, {'source_alpha_bbox':list(bbox),'fit_scale':scale,'placed_xy':list(pos),'placed_size':list(im.size)}
def largest_component(im):
    im=im.convert('RGBA'); pixels=im.load(); todo={(x,y) for y in range(im.height) for x in range(im.width) if pixels[x,y][3]>0}; components=[]
    while todo:
        start=todo.pop(); stack=[start]; found={start}
        while stack:
            x,y=stack.pop()
            for q in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if q in todo:todo.remove(q);found.add(q);stack.append(q)
        components.append(found)
    keep=max(components,key=len); removed=0
    for comp in components:
        if comp is not keep:
            for x,y in comp:pixels[x,y]=(0,0,0,0);removed+=1
    return im,removed

manifest=json.loads((ROOT/'src/art/assetManifest.json').read_text())
present=[]; missing=[]
for entry in manifest:
    p=ROOT/'src/assets'/f"{entry['key']}.png"
    if p.exists():
        rec=inspect(p); rec['key']=entry['key']; rec['manifest_size']=[entry['w'],entry['h']]
        rec['dimension_matches_manifest']=rec['size']==rec['manifest_size']; rec['class']='reusable-png-needs-visual-fit'
        present.append(rec)
    else: missing.append(entry)
dirty=subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True)
snapshot={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
          'working_tree_before_production':dirty,'manifest_entries':len(manifest),'png_manifest_present':len(present),
          'src_png_total':len(list((ROOT/'src/assets').glob('*.png'))), 'missing_png_keys':missing,
          'manifest_dimension_mismatch_count':sum(not x['dimension_matches_manifest'] for x in present),
          'assets':present, 'nhinh_prototype':{'frame_count':len(list((ROOT/'assets/character').glob('nhinh_*.png')))-1,
          'readiness':'usable-for-offline-preview; not runtime integrated; see assets/character/README.md'}}
save_json(OUT/'inventory.json',snapshot)

crop_specs=[
 {'name':'atlas_grass_sample','source':'Art_References/The_Last_Lantern_Tileset_Pack/01_terrain_water_cliffs_tileset.png','box':[110,12,185,90],'canvas':[32,32], 'use':'texture swatch only; opposite edges are not authored to wrap'},
 {'name':'atlas_stairs_sample','source':'Art_References/The_Last_Lantern_Tileset_Pack/02_ruins_architecture_tileset.png','box':[260,420,367,526],'canvas':[48,48], 'use':'candidate stairs prototype; perspective is more isometric than existing forest'},
 {'name':'atlas_rock_sample','source':'Art_References/The_Last_Lantern_Tileset_Pack/03_props_interactives_tileset.png','box':[105,921,204,985],'canvas':[36,26], 'use':'candidate noninteractive forest rock; inspect edge fringe before production'},
]
for spec in crop_specs:
    source=ROOT/spec['source']; crop=Image.open(source).convert('RGBA').crop(spec['box'])
    raw=SHARED/f"{spec['name']}_raw.png"; crop.save(raw)
    if 'grass' in spec['name']:
        exported=crop.resize(tuple(spec['canvas']),Image.Resampling.NEAREST); meta={'method':'full crop nearest resize; opaque texture'}
    else:
        cleaned,removed=largest_component(crop)
        exported,meta=fit(cleaned,tuple(spec['canvas']))
        meta['disconnected_atlas_neighbor_pixels_removed']=removed
    dest=SHARED/f"{spec['name']}.png";exported.save(dest)
    spec.update({'source_sha256':sha(source),'raw_path':rel(raw),'output_path':rel(dest),'export':meta,'pivot':[0.5,1], 'edge_cleanup':'No color-key removal; source alpha preserved; no original file changed','status':'crop-test-only'})
save_json(SHARED/'crop-metadata.json',crop_specs)
sheet=Image.new('RGB',(640,360),'#132321');d=ImageDraw.Draw(sheet)
d.text((10,8),'ATLAS CROP TEST | offline evidence | raw sources preserved',fill='#f3dfb0')
for i,spec in enumerate(crop_specs):
    x=18+i*210; im=Image.open(ROOT/spec['output_path']).convert('RGBA')
    d.text((x,35),spec['name'],fill='#d4e7db')
    for j,col in enumerate(['#0b171b','#e4d9bc']):
        d.rectangle((x,57+j*94,x+190,142+j*94),fill=col)
        sheet.paste(im,(x+10,68+j*94),im)
        big=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
        sheet.paste(big,(x+78,61+j*94),big)
grass=Image.open(SHARED/'atlas_grass_sample.png')
for yy in range(2):
    for xx in range(4):sheet.paste(grass,(18+xx*32,268+yy*32),grass)
d.text((161,272),'2x4 repeat at 1x: seams visible.',fill='#ffc985')
d.text((161,289),'Do not register as a seamless tile.',fill='#ffc985')
d.text((161,309),'Transparent props: dark/light checks above.',fill='#d4e7db')
sheet.save(SHARED/'crop-test-contact-sheet-640x360.png')
print(json.dumps({'inventory_present':len(present),'missing_keys':[x['key'] for x in missing], 'crop_count':len(crop_specs)},ensure_ascii=False))
