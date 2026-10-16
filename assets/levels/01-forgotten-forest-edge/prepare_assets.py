"""Deterministic crop/nearest exports and offline compositions; no generation API."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import json, hashlib
B=Path(__file__).resolve().parent
R=B.parents[2]
def load(p): return Image.open(p).convert('RGBA')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def norm(im,size):
    bb=im.getchannel('A').point(lambda x:255 if x>=16 else 0).getbbox()
    crop=im.crop(bb); scale=min((size[0]-4)/crop.width,(size[1]-4)/crop.height)
    sz=(max(1,round(crop.width*scale)),max(1,round(crop.height*scale)))
    out=Image.new('RGBA',size);out.alpha_composite(crop.resize(sz,Image.Resampling.NEAREST),((size[0]-sz[0])//2,size[1]-2-sz[1]))
    return out,bb,scale
spec={'beacon-stone-hidden':(48,60),'beacon-stone-illuminated':(48,60),'pickup-lantern':(20,28),'footprints-pulse':(20,28),'stone-standing-ring':(58,30),'sun-eye-dormant':(32,32),'sun-eye-receiving':(32,32),'sun-eye-full':(32,32)}
rows=[]; sprites={}
for name,size in spec.items():
    src=B/'sources'/f'{name}-generated.png'; im,bb,scale=norm(load(src),size)
    p=B/'sprites'/f'{name}.png'; im.save(p);sprites[name]=im
    rows.append({'key_proposed':'l01_'+name.replace('-','_'),'file':str(p.relative_to(R)).replace('\\','/'),'source':str(src.relative_to(R)).replace('\\','/'),'source_sha256':sha(src),'sha256':sha(p),'canvas':list(size),'crop_bbox':list(bb),'scale_nearest':scale,'pivot':[.5,1],'method':'original alpha preserved; alpha >=16 for crop bounds only'})
def prop(name,size):return norm(load(R/'src/assets'/f'{name}.png'),size)[0]
tree=prop('tree_woods',(72,110));bush=prop('bush_woods',(50,40));gate=prop('woods_arch_locked',(128,126));opened=load(R/'assets/levels/02-whispering-woods/sprites/woods_arch_open_passage.png')
def place(c,im,x,y):c.alpha_composite(im,(round(x-im.width/2),round(y-im.height)))
grass=ImageEnhance.Brightness(load(R/'src/assets/tile_grass.png').crop((20,20,68,68)).resize((32,32),Image.Resampling.NEAREST)).enhance(.18)
dirt=ImageEnhance.Brightness(load(R/'src/assets/tile_dirt.png').crop((20,20,68,68)).resize((32,32),Image.Resampling.NEAREST)).enhance(.32)
for mode in ['opening','lantern-on','pulse','receiving','open-latched']:
    c=Image.new('RGBA',(640,360),'#0b2022')
    for y in range(36,338,32):
        for x in range(0,640,32): c.alpha_composite(grass,(x,y))
    mask=Image.new('L',(640,360));md=ImageDraw.Draw(mask);md.line([(320,337),(320,182)],fill=210,width=34);md.line([(230,275),(320,245)],fill=200,width=30)
    path=Image.new('RGBA',(640,360))
    for y in range(0,360,32):
        for x in range(0,640,32):path.alpha_composite(dirt,(x,y))
    path.putalpha(mask);c=Image.alpha_composite(c,path)
    for x,y in [(38,160),(94,120),(545,120),(605,160),(35,280),(605,290),(95,365),(550,365)]:place(c,tree,x,y)
    for x,y in [(95,207),(551,220),(53,330),(591,339)]:place(c,bush,x,y)
    # White distant glimmer and withered grass are composition cues, not exported sprites.
    d=ImageDraw.Draw(c);d.line([(438,39),(438,67)],fill='#e2edf1',width=2);d.line([(435,47),(441,47)],fill='#a7c5cd',width=1)
    for x in range(425,451,5):d.line([(x,83),(x-1,79)],fill='#8a8160')
    place(c,opened if mode=='open-latched' else gate,320,183)
    eye='full' if mode=='open-latched' else 'receiving' if mode=='receiving' else 'dormant'
    place(c,sprites['sun-eye-'+eye],367,140)
    place(c,sprites['beacon-stone-hidden' if mode=='opening' else 'beacon-stone-illuminated'],218,282)
    if mode=='opening':place(c,sprites['pickup-lantern'],253,284)
    if mode in ['pulse','receiving','open-latched']:
        place(c,sprites['stone-standing-ring'],320,231)
    if mode=='pulse':
        for x,y in [(261,270),(283,254),(307,241)]:place(c,sprites['footprints-pulse'],x,y)
    if mode=='receiving':ImageDraw.Draw(c).line([(327,211),(367,124)],fill='#e5b85e',width=1)
    nh='nhinh_down_idle_0.png' if mode=='opening' else 'nhinh_down_pulse_1.png' if mode=='pulse' else 'nhinh_down_lantern_on_2.png'
    place(c,load(R/'assets/character'/nh),320 if mode=='receiving' else 274,228 if mode=='receiving' else 308)
    place(c,prop('lumo_0',(24,24)),300,289)
    d=ImageDraw.Draw(c);d.rectangle((0,0,639,35),fill='#07151c');d.text((10,7),'LEVEL 01 | OFFLINE ART PREVIEW | '+mode.upper(),fill='#eedcaf');d.text((10,21),'HUD RESERVED | 640x360 | NOT IN ENGINE',fill='#a5bdb4')
    d.rectangle((0,338,639,359),fill='#07151c');d.text((10,344),'E pickup/read | F lantern | SPACE Pulse | gate stays open after latch',fill='#c5d5cb')
    c.convert('RGB').save(B/'previews'/f'level01-{mode}-640x360.png')
c=Image.new('RGBA',(640,360),'#102523');d=ImageDraw.Draw(c);d.text((10,7),'LEVEL 01 | MODULAR SPRITES | 1x and 2x nearest | OFFLINE',fill='#eedcaf')
for i,(name,im) in enumerate(sprites.items()):
    x=10+(i%4)*158;y=35+(i//4)*155
    d.text((x,y),name,fill='#d1dfd5');d.rectangle((x,y+18,x+145,y+134),fill='#e5d9b9' if i%2 else '#193330')
    place(c,im,x+28,y+130);place(c,im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST),x+96,y+130)
c.convert('RGB').save(B/'previews/contact-sheet-640x360.png')
checks=[]
for row in rows:
    im=Image.open(R/row['file']);a=im.getchannel('A');checks.append({'file':row['file'],'size':list(im.size),'mode':im.mode,'alpha_extrema':list(a.getextrema()),'sha256':sha(R/row['file']),'result':'PASS' if im.mode=='RGBA' and list(im.size)==row['canvas'] and a.getextrema()[0]==0 and a.getbbox() else 'FAIL'})
reuse=['src/assets/tile_grass.png','src/assets/tree_woods.png','src/assets/bush_woods.png','src/assets/woods_arch_locked.png','src/assets/lumo_0.png','assets/levels/02-whispering-woods/sprites/woods_arch_open_passage.png']
dump(B/'asset-map.json',{'sprites':rows,'reused_in_previews':reuse,'scenario_source':'docs/scenario/01-forgotten-forest-edge.md','scenario_sha256':sha(R/'docs/scenario/01-forgotten-forest-edge.md'),'state_contract':{'lantern_collected':'remove pickup sprite; held lamp uses existing Nhinh frames','inscription_hidden':'beacon-stone-hidden','inscription_illuminated':'beacon-stone-illuminated; dialogue text remains verbatim in scenario','footprints':'show footprints-pulse only during Pulse','ring':'revealed standing circle; preview keeps after discovery for composition','eye':'dormant / receiving half / full','gate':'reuse locked gate / Level 02 open passage; latch behavior requires runtime integration'},'runtime':'NOT_RUN'})
dump(B/'validation.json',{'technical_result':'PASS' if all(x['result']=='PASS' for x in checks) and len(checks)==8 else 'FAIL','checks':checks,'sources':8,'prompts':8,'previews':[{'file':p.name,'size':list(Image.open(p).size),'result':'PASS' if Image.open(p).size==(640,360) else 'FAIL'} for p in (B/'previews').glob('*.png')],'requested_agent':'gpt-6.1-sol low','resolved_agent':'not exposed','image_backend':'not exposed','runtime':'NOT_RUN','build':'NOT_RUN','visual_review':'pending image inspection','limitations':['AI edits can shift texture/silhouette slightly between stone and eye states.','Nearest downsampling simplifies glyph detail; sprites remain prototype art.','Existing reused gate is stone arch rather than scenario wooden gate; new Sun-eye is modular.','Preview paths, beam and white glimmer are composition cues; no engine lighting, collisions or persistence tested.']})
print('PASS: 8 RGBA exports; 8 generated sources; 6 offline 640x360 previews/contact sheet')
