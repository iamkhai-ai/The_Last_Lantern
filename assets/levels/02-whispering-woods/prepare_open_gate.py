"""Export the resumed gate and offline pilot previews; no generation API calls."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import json, hashlib, shutil

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
SPRITES=BASE/'sprites'; PREVIEWS=BASE/'previews'
def load(path):return Image.open(path).convert('RGBA')
def dump(path,d):path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def rel(path):return path.relative_to(ROOT).as_posix()
def place(canvas,im,foot,size=None,alpha=1):
    im=im.copy()
    if size:im=im.resize(size,Image.Resampling.NEAREST)
    if alpha!=1:im.putalpha(im.getchannel('A').point(lambda a:round(a*alpha)))
    canvas.alpha_composite(im,(round(foot[0]-im.width/2),round(foot[1]-im.height)))

source=BASE/'sources/woods-arch-open-generated.png'
im=load(source); meaningful=im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
cropped=im.crop(meaningful)
scale=min(120/cropped.width,120/cropped.height)
size=(round(cropped.width*scale),round(cropped.height*scale))
gate=Image.new('RGBA',(128,126)); gate.alpha_composite(cropped.resize(size,Image.Resampling.NEAREST),((128-size[0])//2,124-size[1]))
gate_path=SPRITES/'woods_arch_open_passage.png';gate.save(gate_path)
gate_meta={'key_proposed':'l02_woods_arch_open_passage','file':rel(gate_path),'source':rel(source),
           'source_sha256':sha(source),'source_crop_box':list(meaningful),'canvas':[128,126],
           'scale_nearest':scale,'placed_size':list(size),'placed_xy':[(128-size[0])//2,124-size[1]],
           'pivot':[0.5,1],'alpha_method':'Original alpha preserved; bbox ignores source alpha below 16 for crop bounds only',
           'state':'open permanent passage','reuse_closed_source':'src/assets/woods_arch_locked.png',
           'integration':'NOT_RUN; proposed key only'}
dump(BASE/'open-gate-export.json',gate_meta)
prompts=json.loads((BASE/'generation-prompts.json').read_text(encoding='utf-8'))
entry=json.loads((BASE/'open-gate-prompt.json').read_text(encoding='utf-8'))
prompts['captured_prompts']=[x for x in prompts['captured_prompts'] if x['asset']!='woods-arch-open']+[entry]
dump(BASE/'generation-prompts.json',prompts)

def normalized_source(name,canvas,bound=None):
    im=load(ROOT/'src/assets'/f'{name}.png')
    todo={(x,y) for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))[3]>=16};components=[]
    while todo:
        p=todo.pop();stack=[p];found={p}
        while stack:
            x,y=stack.pop()
            for q in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if q in todo:todo.remove(q);found.add(q);stack.append(q)
        components.append(found)
    keep=max(components,key=len);clean=Image.new('RGBA',im.size)
    for x,y in keep:clean.putpixel((x,y),im.getpixel((x,y)))
    im=clean.crop(clean.getchannel('A').getbbox())
    bound=bound or (canvas[0]-4,canvas[1]-4);sc=min(bound[0]/im.width,bound[1]/im.height)
    im=im.resize((round(im.width*sc),round(im.height*sc)),Image.Resampling.NEAREST)
    result=Image.new('RGBA',canvas);result.alpha_composite(im,((canvas[0]-im.width)//2,canvas[1]-2-im.height))
    return result
closed=normalized_source('woods_arch_locked',(128,126),(120,120))
tree=normalized_source('tree_woods',(72,110));bush=normalized_source('bush_woods',(50,40))
lumo=normalized_source('lumo_0',(24,24))
grass=load(ROOT/'src/assets/tile_grass.png').crop((20,20,68,68)).resize((32,32),Image.Resampling.NEAREST)
grass=ImageEnhance.Brightness(grass).enhance(.18)
dirt=load(ROOT/'src/assets/tile_dirt.png').crop((20,20,68,68)).resize((32,32),Image.Resampling.NEAREST)
dirt=ImageEnhance.Brightness(dirt).enhance(.32)
states={'lantern-off':'sleeping','lantern-on':'sleeping','pulse':'revealed','open-memory':'active'}
positions={'moon':(190,244),'leaf':(320,218),'star':(450,244)}
for mode,state in states.items():
    canvas=Image.new('RGBA',(640,360),'#0b2022')
    for row,y in enumerate(range(36,360,32)):
        for col,x in enumerate(range(0,640,32)):
            tile=grass.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if col%2 else grass
            if row%2:tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            canvas.alpha_composite(tile,(x,y))
    # Preview-only path geometry connects the actual props; not a production asset.
    d=ImageDraw.Draw(canvas)
    mask=Image.new('L',(640,360));md=ImageDraw.Draw(mask)
    md.line([(320,339),(320,302),(320,260),(320,182)],fill=200,width=36)
    md.line([(190,247),(320,268),(450,247)],fill=180,width=24)
    path=Image.new('RGBA',(640,360))
    for row,y in enumerate(range(0,360,32)):
        for col,x in enumerate(range(0,640,32)):
            tile=dirt.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if col%2 else dirt
            if row%2:tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            path.alpha_composite(tile,(x,y))
    path.putalpha(mask);canvas=Image.alpha_composite(canvas,path)
    for p in [(38,155),(97,119),(550,121),(605,162),(35,279),(602,290),(95,361),(555,362)]:place(canvas,tree,p)
    for p in [(91,202),(556,221),(55,330),(595,343)]:place(canvas,bush,p)
    place(canvas,gate if mode=='open-memory' else closed,(320,183))
    place(canvas,load(SPRITES/'poem_fragment.png'),(387,184))
    for family,foot in positions.items():place(canvas,load(SPRITES/f'runestone_{family}_{state}.png'),foot)
    place(canvas,load(SPRITES/f'runestone_leaf_{state}.png'),(141,312),(28,36))
    nhinh_name='nhinh_down_lantern_on_2.png' if mode=='lantern-on' else 'nhinh_down_pulse_1.png' if mode=='pulse' else 'nhinh_down_idle_0.png'
    place(canvas,load(ROOT/'assets/character'/nhinh_name),(266,298))
    place(canvas,lumo,(294,283))
    d=ImageDraw.Draw(canvas)
    # Procedural dots/ring are preview cues for engine effects, not exported sprites.
    for x,y in [(194,184),(232,170),(278,159),(321,157),(362,171),(405,188),(447,184)]:
        d.point((x,y),fill='#ffe4a4');d.point((x,y+1),fill='#938663')
    if mode=='open-memory':
        wash=Image.new('RGBA',(640,360),(167,100,23,17));canvas=Image.alpha_composite(canvas,wash)
        place(canvas,load(SPRITES/'memory_vignette.png'),(440,316),alpha=.75)
    d=ImageDraw.Draw(canvas)
    # Labels exist only in previews and intentionally reserve the HUD area.
    d.rectangle((0,0,639,35),fill='#07151c')
    d.text((10,5),'LEVEL 02 | OFFLINE MOCKUP | 640x360 | '+mode.upper(),fill='#f1dbad')
    d.text((10,20),'HUD RESERVED | original assets + Nhinh prototype + new pilot props',fill='#9cb7b0')
    d.rectangle((0,338,639,359),fill='#07151c')
    d.text((10,344),'MOON > LEAF > STAR | '+('OPEN PASSAGE + MEMORY' if mode=='open-memory' else state.upper())+' | NOT IN ENGINE',fill='#d1dfd5')
    canvas.convert('RGB').save(PREVIEWS/f'level02-{mode}-640x360.png')

old=PREVIEWS/'level02-pilot-640x360.png';archive=PREVIEWS/'level02-pilot-before-open-gate-640x360.png'
if old.exists() and not archive.exists():shutil.copyfile(old,archive)
shutil.copyfile(PREVIEWS/'level02-open-memory-640x360.png',old)

contact=Image.new('RGBA',(640,360),'#102523');d=ImageDraw.Draw(contact)
d.text((10,6),'RUNE STATES | OFFLINE CONTACT SHEET | 1x + 2x nearest',fill='#eedcaf')
for x,label in [(114,'SLEEP'),(287,'PULSE REVEALED'),(481,'ACTIVE / NOTCH')]:d.text((x,30),label,fill='#bdcfc7')
for row,family in enumerate(['moon','leaf','star']):
    y=61+row*94;d.text((10,y+21),family.upper(),fill='#e4dfc2')
    for col,state in enumerate(['sleeping','revealed','active']):
        im=load(SPRITES/f'runestone_{family}_{state}.png');x=84+col*185
        contact.alpha_composite(im,(x,y+15));contact.alpha_composite(im.resize((80,104),Image.Resampling.NEAREST),(x+48,y-10))
contact.convert('RGB').save(PREVIEWS/'rune-state-contact-sheet-640x360.png')

compare=Image.new('RGBA',(640,360),'#102523');d=ImageDraw.Draw(compare)
d.text((10,7),'GATE STATES + NEW PROPS | OFFLINE CONTACT SHEET 640x360',fill='#eedcaf')
for x,label,prop in [(35,'CLOSED (REUSED)',closed),(202,'OPEN PASSAGE (NEW)',gate)]:
    d.text((x,34),label,fill='#cee0d4');compare.alpha_composite(prop,(x,55))
for i,col in enumerate(['#102523','#e5d9b9']):
    x=365;yy=50+i*142;d.rectangle((x,yy,630,yy+126),fill=col)
    compare.alpha_composite(gate,(x+6,yy));compare.alpha_composite(load(SPRITES/'poem_fragment.png'),(x+153,yy+4))
    compare.alpha_composite(load(SPRITES/'memory_vignette.png'),(x+132,yy+62))
place(compare,load(SPRITES/'poem_fragment.png'),(66,250));d.text((100,224),'POEM FRAGMENT 48x40',fill='#d6decf')
place(compare,load(SPRITES/'memory_vignette.png'),(104,330));d.text((175,288),'MEMORY 128x64',fill='#d6decf')
d.text((10,344),'Labels are review-only. Sprite PNGs contain no labels.',fill='#a7bdb3')
compare.convert('RGB').save(PREVIEWS/'gate-props-contact-sheet-640x360.png')

mapping=json.loads((BASE/'asset-map.json').read_text(encoding='utf-8'))
mapping['open_gate_state']=gate_meta
mapping['scene_previews']=[rel(PREVIEWS/f'level02-{mode}-640x360.png') for mode in states]
mapping['scene_preview']=rel(old);mapping['state_preview']=rel(PREVIEWS/'rune-state-contact-sheet-640x360.png')
mapping['review_contact']=rel(PREVIEWS/'gate-props-contact-sheet-640x360.png')
mapping['scene_positions']={'gate_foot':[320,183],'runes':positions,'poem_foot':[387,184],'test_leaf_foot':[141,312],'nhinh_foot':[266,298],'hud_reserved_rect':[0,0,640,36]}
mapping['notes']=['Offline compositions only; no runtime integration.', 'Preview effects and ground paths are review cues, not production sprites.', 'Sleeping rune copies intentionally share one unmarked silhouette.']
for row in mapping['sprites']:
    row['file']='assets/levels/'+row['file'] if row['file'].startswith('02-') else row['file']
    if row.get('source','').startswith('02-'):row['source']='assets/levels/'+row['source']
    if row.get('state')=='sleeping':
        row['source']='assets/levels/02-whispering-woods/sources/runestone-moon-generated.png';row['cell']=0
        row['intentional_reuse']='Unmarked sleeping silhouette shared across all rune families';row.pop('fit',None)
    if 'source' not in row:row['source']='assets/levels/02-whispering-woods/sources/'+('poem-fragment-generated.png' if 'poem_' in row['file'] else 'memory-vignette-generated.png')
    row['pivot']=[.5,1];row['sha256']=sha(ROOT/row['file'])
mapping['sprites']=[x for x in mapping['sprites'] if x.get('key_proposed')!='l02_woods_arch_open_passage']+[gate_meta]
dump(BASE/'asset-map.json',mapping)

checks=[]
for path in sorted(SPRITES.glob('*.png')):
    im=Image.open(path);rgba=im.convert('RGBA');a=rgba.getchannel('A');bbox=a.getbbox()
    expected=(128,126) if path.name=='woods_arch_open_passage.png' else (128,64) if 'memory' in path.name else (48,40) if 'poem' in path.name else (40,52)
    checks.append({'file':path.name,'size':list(im.size),'expected_size':list(expected),'mode':im.mode,'alpha_extrema':list(a.getextrema()),'nonempty':bbox is not None,'sha256':sha(path),
                   'result':'PASS' if im.mode=='RGBA' and a.getextrema()[0]==0 and bbox and im.size==expected else 'FAIL'})
val={'technical_result':'PASS' if len(checks)==12 and all(x['result']=='PASS' for x in checks) else 'FAIL',
     'sprite_png_count':len(checks),'expected_sprite_count':12,'checks':checks,
     'preview_checks':[{'path':rel(p),'size':list(Image.open(p).size),'result':'PASS' if Image.open(p).size==(640,360) else 'FAIL'} for p in sorted(PREVIEWS.glob('*.png'))],
     'generated_source_count':len(list((BASE/'sources').glob('*.png'))),'prompt_count':len(prompts['captured_prompts']),
     'model_requested':'gpt-6.1-sol high','image_backend_model':'not exposed by built-in image_gen',
     'runtime':'NOT_RUN','build':'NOT_RUN; no runtime changes','checkpoint_A':'PENDING USER REVIEW',
     'visual_review':'Pending visual inspection of resumed preview files; no automated claim of art approval',
     'known_limitations':['Generated open gate has slight shape/material variation from reused closed gate; animation interpolation is not provided.', 'Memory output retains clothing details rather than flat silhouettes; used at 75% alpha in preview.', 'Existing Nhinh prototype motion/alignment limitations remain.', 'Prop alignment and collision are not checked in engine.']}
dump(BASE/'validation.json',val)
print(json.dumps({'technical_result':val['technical_result'],'sprite_count':len(checks),'source_count':val['generated_source_count'],'prompt_count':val['prompt_count'],'preview_count':len(val['preview_checks'])}))
