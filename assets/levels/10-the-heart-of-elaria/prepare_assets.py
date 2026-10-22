"""Reproducible native Level 10 art from retained imagegen masters; Pillow only."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import json, hashlib, math

B=Path(__file__).resolve().parent
R=B.parents[2]
S,P,V=B/'sprites',B/'previews',B/'sources/v2'
COLORS={'memory':'#f2c661','hope':'#74c8ef','balance':'#b98cf0'}
CORE=(320,115)
PATHS={'memory':[(158,192),(204,178),(246,152),CORE],
       'hope':[(320,200),(330,173),(320,146),CORE],
       'balance':[(480,192),(432,177),(388,151),CORE]}
exports=[]; sources={}; recipes={}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p): return p.relative_to(R).as_posix()
def dump(n,v): (B/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def blank(size=(640,360)): return Image.new('RGBA',size)
def load(p):
    p=Path(p)
    if not p.is_absolute(): p=R/p
    im=Image.open(p).convert('RGBA')
    sources[rel(p)]={'file':rel(p),'size':list(im.size),'sha256':sha(p)}
    return im
def save(n,a=None,kind='native-sprite',pivot=(.5,.5),recipe=None):
    p=S/(n+'.png')
    if a is not None: a.save(p,compress_level=9)
    a=Image.open(p)
    assert a.mode=='RGBA' and a.getchannel('A').getbbox(), n
    exports.append({'file':rel(p),'key':'heart_'+n.replace('-','_'),'size':list(a.size),
                    'pivot':list(pivot),'kind':kind,'alpha_bbox':list(a.getchannel('A').getbbox()),'sha256':sha(p)})
    if recipe: recipes[n]=recipe
    return a
def frame(n,grid=(1,1),i=0):
    a=load(V/(n+'.png')); w,h=a.size; c,r=grid; x,y=i%c,i//c
    a=a.crop((round(x*w/c),round(y*h/r),round((x+1)*w/c),round((y+1)*h/r)))
    alpha=a.getchannel('A').point(lambda v:255 if v>=160 else 0)
    box=alpha.getbbox(); assert box,(n,i)
    a.putalpha(alpha)
    return a.crop(box)
def native(a,size,pad=1):
    # Deliberate area preprocessing preserves features before palette/grid enforcement.
    a=a.resize((size[0]-2*pad,size[1]-2*pad),Image.Resampling.BOX)
    alpha=a.getchannel('A').point(lambda v:255 if v>=128 else 0)
    a=a.convert('RGB').quantize(colors=48,dither=Image.Dither.NONE).convert('RGBA'); a.putalpha(alpha)
    out=blank(size);out.alpha_composite(a,(pad,pad));return out
def sheet(n,master,grid,i,size,pad=1,prop=False):
    return save(n,native(frame(master,grid,i),size,pad),pivot=(.5,1) if prop else (.5,.5),
                recipe={'master':master,'grid':grid,'frame':i,'size':size,'pad':pad})
# Transfer only broad lighting from the depth study; the original pixel geometry stays registered.
load(B/'sources/mother-tree-original.png')
layout=load(V/'sanctuary-layout-reference.png')
lighting=load(V/'sanctuary-depth-lighting.png').resize(layout.size,Image.Resampling.BOX)
reference_light=layout.convert('RGB').filter(ImageFilter.GaussianBlur(10))
target_light=lighting.convert('RGB').filter(ImageFilter.GaussianBlur(10))
sanctuary=blank(layout.size)
sanctuary.putdata([tuple(max(0,min(255,round(channel*((target+12)/(reference+12))**.65)))
    for channel,target,reference in zip(pixel[:3],lit,base))+(pixel[3],)
    for pixel,lit,base in zip(layout.get_flattened_data(),target_light.get_flattened_data(),reference_light.get_flattened_data())])
save('sanctuary-base',sanctuary,'registered-scenic-background',pivot=(0,0),
     recipe={'master':'sanctuary-depth-lighting','geometry':'sanctuary-layout-reference',
             'size':[640,360],'lighting_blur':10,'lighting_strength':.65})
for n in ['mother-tree-trunk-patch','mother-tree-canopy-patch',
          'fixed-dark-pocket-purple-border','redundant-carried-lantern-line','lantern-new-leaf']:
    save(n,kind='retained-input')
basin=native(frame('socket'),(54,44),0)
for branch,c in COLORS.items():
    crystal=load('src/assets/crystal_'+branch+'.png')
    for inserted in [False,True]:
        a=blank((58,64));a.alpha_composite(basin,(2,20))
        ImageDraw.Draw(a).arc((10,28,48,58),0,180,fill=c,width=2)
        a.alpha_composite(crystal.resize((15,24),Image.Resampling.NEAREST),(22,0))
        if inserted: a.alpha_composite(crystal.resize((17,29),Image.Resampling.NEAREST),(21,28))
        save(branch+'-alcove-'+('inserted' if inserted else 'empty'),a,
             recipe={'master':'socket','crystal':branch,'inserted':inserted,'size':[58,64]})
for i in range(4):
    mirror=native(frame('mirrors',(2,2),i),(36,48))
    # Reinstate the master's directional notch on the final pixel grid: it must survive reduction.
    d=ImageDraw.Draw(mirror)
    notch=[[(28,15),(33,20),(28,25)],[(13,29),(18,35),(23,29)],
           [(8,15),(3,20),(8,25)],[(13,10),(18,4),(23,10)]][i]
    d.polygon(notch,fill='#e5bf74',outline='#312b20')
    d.point(notch[1],fill='#fff0bd')
    save('mirror_'+str(i),mirror,pivot=(.5,1),
         recipe={'master':'mirrors','grid':[2,2],'frame':i,'size':[36,48],'direction_notch':i})
    sheet('statue-notch-'+str(i),'statues',(2,2),i,(64,88),prop=True)
for i,(n,size) in enumerate([('pedestal_empty',(36,39)),('pedestal_lit',(40,56))]):
    sheet(n,'pedestal',(2,1),i,size,prop=True)
for i,n in enumerate(['prism-dark','prism-receiving']):
    prism=blank((48,48));prism.alpha_composite(native(frame('prism',(2,1),i),(30,30)),(9,0))
    save(n,prism,recipe={'master':'prism','grid':[2,1],'frame':i,'size':[48,48],
                        'visible_size':[30,30],'offset':[9,0]})
for master,prefix,size in [('sun-locks','lock_sun',(40,33)),('moon-locks','lock_moon',(40,34))]:
    for i,state in enumerate(['off','on']): sheet(prefix+'_'+state,master,(2,1),i,size)
for i,state in enumerate(['waiting','ready','latched','night','dawn']):
    sheet('core-'+state,'core-states',(3,2),i,(58,68))
for i,state in enumerate(['waiting','ready','latched']):
    sheet('confirmation-root-'+state,'confirmation',(3,1),i,(48,32),0)
for state in ['empty','occupied']:
    a=native(frame('socket'),(44,28),0);d=ImageDraw.Draw(a)
    d.ellipse((9,7,34,21),fill='#142b30',outline='#b2b09a')
    for x in [14,21,28]:d.rectangle((x,11,x+2,17),fill=COLORS['hope'] if state=='occupied' else '#536d69')
    save('pressure-'+state,a,recipe={'master':'socket','state':state,'size':[44,28]})
texture=blank();bark=load(V/'bark-material.png').resize((128,128),Image.Resampling.BOX)
for x in range(0,640,128):
    for y in range(0,360,128):texture.alpha_composite(bark,(x,y))
def root(points,color,state,white=False):
    segments=[points[:2],points[2:]] if state=='broken' else [points]
    mask=Image.new('L',(640,360));md=ImageDraw.Draw(mask);out=blank();shadow=blank()
    for pts in segments:
        ImageDraw.Draw(shadow).line([(x+2,y+3) for x,y in pts],fill=(4,12,16,115),width=17,joint='curve')
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(.8)));d=ImageDraw.Draw(out)
    for pts in segments:
        md.line(pts,fill=255,width=11,joint='curve')
        for x,y in pts:md.ellipse((x-5,y-5,x+5,y+5),fill=255)
        d.line(pts,fill='#101e23',width=15,joint='curve')
        d.line([(x-1,y-2) for x,y in pts],fill='#b49b74' if not white else '#aab9ad',width=12,joint='curve')
    mat=texture.copy()
    if white:mat=ImageOps.colorize(ImageOps.grayscale(mat),'#233537','#a4b2a0').convert('RGBA')
    mat.putalpha(mask);out.alpha_composite(mat);d=ImageDraw.Draw(out)
    for j,pts in enumerate(segments):
        if state!='broken' or j==0:
            d.line(pts,fill='#102529',width=5,joint='curve');d.line(pts,fill=color,width=3,joint='curve')
    if state=='broken':
        for x,y in [points[1],points[2]]:
            d.line((x-4,y+3,x+4,y-3),fill='#d4b99a',width=2)
    if state=='connected':
        # Runtime connected means latched. Brass clasps belong only to the self-holding state.
        x,y=points[1];d.rectangle((x-5,y-5,x+5,y+5),fill='#624c32',outline='#dfc18a')
        d.rectangle((x-2,y-7,x+2,y+7),fill='#cba266');d.line((x-1,y-6,x-1,y+5),fill='#ffdf96')
    return out
for b,c in COLORS.items():
    for state in ['broken','repaired','connected']:
        save(b+'-root-'+state,root(PATHS[b],c,state),'registered-root-layer',
             recipe={'master':'bark-material','path':PATHS[b],'color':c,'state':state,'size':[640,360]})
for name,paths,color in [
    ('old-white-channels-feeding',[[(220,8),(244,55),CORE],[(422,8),(399,58),CORE]],'#e3eee1'),
    ('old-white-channels-retracted',[[(220,8),(234,39)],[(422,8),(410,37)]],'#718a82')]:
    a=blank()
    for pts in paths:a.alpha_composite(root(pts,color,'repaired',True),(0,0))
    save(name,a,'registered-old-channel-layer')
# Only a core-local effect. Code owns the carried beam, Moon border, shadow and return ring.
a=blank();px=a.load()
for y in range(35,198):
    for x in range(238,403):
        r=math.hypot(x-320,(y-115)*1.03)
        alpha=30*math.exp(-(r/53)**2)+105*math.exp(-((r-45)/3.2)**2)+72*math.exp(-((r-27)/4.5)**2)
        px[x,y]=(255,230,156,min(155,round(alpha)))
d=ImageDraw.Draw(a)
for x,y in [(278,87),(360,91),(285,147),(353,152)]:
    d.line((x-2,y,x+2,y),fill='#fff4cb');d.line((x,y-2,x,y+2),fill='#fff4cb')
save('temporary-core-bloom-after-retrieval',a,'registered-overload-effect')
bench=native(frame('socket'),(124,48),0)
for n,x in [('mirror_1',8),('pressure-occupied',35),('lock_moon_on',64),('lock_sun_on',93)]:
    a=Image.open(S/(n+'.png'));a.thumbnail((23,30),Image.Resampling.NEAREST)
    bench.alpha_composite(a,(x,8+(30-a.height)//2))
save('root-rule-reminder-table',bench,'familiar-rule-model-composite')
sheet('day-night-wheel-resuming','wheel',(1,1),0,(96,80))
dawn=load(V/'dawn-light.png').resize((640,360),Image.Resampling.BOX)
dawn.putalpha(dawn.getchannel('A').point(lambda v:0 if v<16 else min(150,round(v*.62))))
save('ending-dawn-lighting-overlay',dawn,'ending-light-overlay')
# Exact title typography; all other text stays in the engine.
title=blank();font=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf',29);text='THE LAST DAWN';tracking=4
width=sum(font.getlength(c) for c in text)+tracking*(len(text)-1);x=(640-width)/2;d=ImageDraw.Draw(title)
for c in text:
    d.text((round(x)+1,168),c,font=font,fill=(22,30,25,230))
    d.text((round(x),166),c,font=font,fill='#f4e4b6');x+=font.getlength(c)+tracking
d.line((268,212,312,212),fill=(196,164,101,190));d.line((328,212,372,212),fill=(196,164,101,190))
title.alpha_composite(Image.open(S/'lantern-new-leaf.png'),(315,207))
save('ending-title-the-last-dawn',title,'exact-ending-title')
seated=load(B/'sources/task15-nhinh-seated-original.png')
alpha=seated.getchannel('A').point(lambda v:255 if v>=160 else 0)
box=alpha.getbbox();seated.putalpha(alpha);seated=seated.crop(box)
for n,size in [('ending-nhinh-seated-unlit-leaf',(36,42)),('ending-nhinh-seated-detail',(144,168))]:
    save(n,native(seated,size),pivot=(.5,1),recipe={'master':'../task15-nhinh-seated-original',
         'alpha_threshold':160,'crop':list(box),'size':list(size)})
for n in ['ending-nhinh-carry-off-reference','ending-leaf-handle-attachment']:
    save(n,kind='retained-ending-input',pivot=(.5,1))
# Contact captions are confined to preview files.
small=[e for e in exports if e['size'][0]<640 and e['kind']!='retained-input']
contact=Image.new('RGBA',(640,math.ceil(len(small)/8)*114),'#152b30')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',10)
for i,e in enumerate(small):
    x,y=i%8*80,i//8*114;a=Image.open(R/e['file']);a.thumbnail((78,88),Image.Resampling.NEAREST)
    contact.alpha_composite(a,(x+(80-a.width)//2,y+14+(88-a.height)//2))
    ImageDraw.Draw(contact).text((x+2,y+2),Path(e['file']).stem[:12],font=font,fill='#cfceae')
contact.save(P/'v2-assets-native.png')
contact.resize((contact.width*3,contact.height*3),Image.Resampling.NEAREST).save(P/'v2-assets-3x.png')
for e in exports:
    a=Image.open(R/e['file'])
    assert a.mode=='RGBA' and list(a.size)==e['size'] and a.getchannel('A').getbbox()
    if Path(e['file']).stem in recipes: assert list(a.size)==list(recipes[Path(e['file']).stem]['size'])
assert sha(S/'core-dawn.png')!=sha(S/'core-night.png')
for b,c in COLORS.items():
    assert tuple(bytes.fromhex(c[1:])) in {rgb for _,rgb in Image.open(S/(b+'-root-repaired.png')).convert('RGB').getcolors(640*360)}
dump('asset-map.json',{'exports':sorted(exports,key=lambda e:e['file']),'reuse':list(sources.values()),'recipes':recipes,
     'palette':COLORS,'pivots':'Props bottom-center; cells center; full-scene layers origin0,0 in engine.',
     'normalization':'Area reduction,48-color quantization,binary alpha; no native-size changes.',
     'title_text':text,'background':'Original sanctuary geometry; broad lighting transfer from retained depth study.'})
req=[R/'docs/scenario/10-the-heart-of-elaria.md',R/'docs/scenario-v2/10-the-heart-of-elaria.md',
     R/'docs/implementation/10-layout.md',R/'src/data/heartOfElariaLayout.ts',
     R/'src/levels/HeartOfElariaLevel.ts',R/'src/art/CampaignArt.ts',
     R/'src/scenes/CampaignScene.ts',R/'src/scenes/EndingScene.ts',
     R/'src/systems/CampaignEndingSequence.ts',R/'src/data/campaignEnding.ts',
     B/'generation-prompts.json',B/'capture_runtime.py',B/'prepare_ending.py',Path(__file__)]
dump('provenance.json',{'tool':'built-in image_gen for retained v2 masters; Pillow deterministic assembly',
     'rights':'New masters generated for this task; project-owned art reused. No third-party stock added.',
     'image_backend_model':'Not exposed','requirements':[{'file':rel(p),'sha256':sha(p)} for p in req],
     'sources':list(sources.values()),'background_sha256':sha(S/'sanctuary-base.png'),
     'retained_legacy':'Original sanctuary geometry, two unused scenic crops, unused border/beam and leaf come from task14 at base11a40eb. Historical prompt remains in generation-prompts.json.',
     'depth_polish':'A generated lighting study supplies broad color ratios only; all original background geometry and pixel detail come from sanctuary-layout-reference.png.',
     'seated_pose':'Original task15 source retained unchanged; low-alpha outliers removed before fitting native36x42.'})
capture=P/'runtime-v2/capture-results.json'
runtime={'status':'NOT_RUN','reason':'Capture final generated revision with capture_runtime.py.'}
if capture.exists():
    evidence=json.loads(capture.read_text(encoding='utf8'))
    required={'01-empty','02-inserted','03-lumo-holding','04-ready','05-latched','06-overload',
              '07-after-F-night','08-dawn','09-seated','10-title','11-variants-west','12-variants-north'}
    captures=evidence.get('captures',[]) if isinstance(evidence,dict) else []
    if (isinstance(evidence,dict) and evidence.get('status') in ['PASS','FAIL']
        and {c['name'] for c in captures}==required
        and evidence.get('provenance_sha256')==sha(B/'provenance.json')
        and evidence.get('sprite_hashes')=={p.name:sha(p) for p in sorted(S.glob('*.png'))}
        and all((B/c['file']).is_file() and sha(B/c['file'])==c.get('sha256') for c in captures)):
        runtime={'status':'PASS' if evidence['status']=='PASS' and not any(c['errors'] for c in captures) else 'FAIL',
                 'evidence':rel(capture),'scope':'Isolated seeded WebGL scenes and real F transition; not full playthrough.'}
dump('validation.json',{'technical':'PASS','exports':len(exports),'native_dimensions':'PASS: all local variants',
     'alpha':'PASS: all exports RGBA, nonempty','core_dawn_distinct':'PASS','palette':COLORS,'runtime':runtime,
     'visual_review':'See docs/implementation/10-art-v2-report.md and native WebGL captures.',
     'limits':['Offline historical previews predate v2 and are superseded by runtime-v2.',
               'Legacy shared-art check still measures shared statue/pressure; local sizes checked here and runtime keys captured.',
               'Seeded captures are not a full player playthrough.']})
print(json.dumps({'exports':len(exports),'sources':len(sources),'technical':'PASS','runtime':runtime['status']}))
