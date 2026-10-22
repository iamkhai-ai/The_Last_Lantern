"""Offline art reviews, not engine captures. All placement comes from layout-contract."""
from pathlib import Path
import json, hashlib, math
from PIL import Image, ImageDraw
B=Path(__file__).resolve().parent; PKG=B.parents[1];ROOT=PKG.parents[2]
S=PKG/'sprites'/'v3';P=PKG/'previews'/'v3';P.mkdir(exist_ok=True,parents=True)
L=json.loads((B/'layout-contract.json').read_text(encoding='utf-8'))
M=json.loads((PKG/'asset-manifest-v3.json').read_text(encoding='utf-8'))
A={a['id']:Image.open(ROOT/a['path']).convert('RGBA') for a in M['assets']}
NEAR=Image.Resampling.NEAREST
PLACES=[];REVIEWS=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(ROOT).as_posix()
def put(im,name,x,y,size=None,room=None,state=None,module=None,crop=None,opacity=255):
    a=A[name]
    if crop:a=a.crop(crop)
    if opacity!=255:
        a=a.copy();a.putalpha(a.getchannel('A').point(lambda n:round(n*opacity/255)))
    # Display fit is the pre-existing authoritative layout scale, applied only to reviews.
    if size and a.size!=tuple(size):a=a.resize(tuple(size),NEAR)
    x,y=math.floor(x+.5),math.floor(y+.5);im.alpha_composite(a,(x,y))
    if module:PLACES.append(dict(review=state,room=room,module_id=module,asset=name,rect=[x,y,a.width,a.height],crop=crop,display_fit_only=True))
def prop(im,e,name,state):
    r=e['drawn_rect'];put(im,name,r['x'],r['y'],(r['width'],r['height']),e['roomId'],state,e['id'])
def actor(im,path,ground,foot=(24,62),opacity=255):
    a=Image.open(ROOT/path).convert('RGBA')
    if opacity!=255:a.putalpha(a.getchannel('A').point(lambda n:round(n*opacity/255)))
    im.alpha_composite(a,(round(ground[0]-foot[0]),round(ground[1]-foot[1])))
def save_review(im,name,kind='room',**extra):
    p=P/(name+'.png');im.save(p)
    REVIEWS.append(dict(path=rel(p),size=list(im.size),sha256=sha(p),kind=kind,contains_text=False,engine_capture=False,**extra))
    return im

STATES=[
dict(id='01-door-a-powered',door_a=True,sun=False,final=False,loop=False,power=False,lantern=True,g0=0,g1=0,g2=0,statue=0,root='dark',lumo=False),
dict(id='02-shadowed-bed-grown-bridge',door_a=True,sun=True,final=False,loop=False,power=True,lantern=True,g0=1,g1=2,g2=1,statue=2,root='bridge',lumo=True),
dict(id='03-lumo-recalled-dark-retracted-roots',door_a=True,sun=True,final=True,loop=True,power=False,lantern=True,g0=1,g1=2,g2=1,statue=2,root='retracted-dark',lumo=False),
dict(id='04-direct-light-amber-roots-no-bridge',door_a=True,sun=True,final=False,loop=False,power=True,lantern=True,g0=1,g1=2,g2=0,statue=0,root='lit',lumo=True),
]
BASE={'entrance':'lobby-base','corridor':'star-chart-base','observatory':'observatory-clean-base'}
def rooms(st):
    out={room:A[name].copy() for room,name in BASE.items()}
    for room,im in out.items():
        for stamp in L['stamps'][room]:
            n=stamp['id']
            if n=='pipe-run':asset=room+'-pipe-run-'+('on' if st['power'] else 'off')
            elif n=='pipe-drop':asset='pipe-drop-'+('on' if st['power'] else 'off')
            else:asset=room+'-'+n
            if n=='loop-path' and not st['loop']:continue
            put(im,asset,stamp['x'],stamp['y'],room=room,state=st['id'],module='stamp:'+n)
        if room=='observatory':
            put(im,'wheel-stopped-sun-among-stars',186,59,room=room,state=st['id'],module='scenery-wheel')
        for a in L['alcoves']:
            if a['roomId']!=room:continue
            opened={'door-a':st['door_a'],'sun-door':st['sun'],'return-loop':st['loop']}[a['doorId']]
            if not opened:
                r=a['threshold'];put(im,a['id']+'-threshold-closed',r['x'],r['y'],room=room,state=st['id'],module='threshold:'+a['id'])
            r=a['arch'];crop=[0,6,48,42] if a['id']=='return-loop-observatory' else None
            put(im,a['id']+('-open' if opened else '-closed'),r['x'],r['y'],room=room,state=st['id'],module='arch:'+a['id'],crop=crop)
        for e in sorted([e for e in L['elements'] if e['roomId']==room],key=lambda x:x['anchor']['y']):
            n=e['id'];asset=n
            if n=='lantern-pedestal':asset=n+('-lit' if st['lantern'] else '-empty')
            elif n in ('g0','g1','g2'):asset=n+'-'+str(st[n])
            elif n=='lumo-tube':asset=n+('-remembered' if st['lumo'] else '-dark')
            elif n=='lumo-seal':asset=n+('-revealed' if st['lumo'] else '-covered')
            elif n in ('door-a-control','final-door-control'):asset=n+('-latched' if (st['id']!='01-door-a-powered' if n=='door-a-control' else st['final']) else '-locked')
            elif n in ('sun-lock','sun-door-control'):asset=n+('-on' if st['power'] else '-off')
            elif n=='splitter':asset=n+('-on' if st['power'] and st['g2']==1 else '-off')
            elif n=='statue':asset=n+'-'+str(st['statue'])
            elif n=='root-bed':asset=n+'-'+st['root']
            elif n=='final-door':asset=n+('-open' if (st['sun'] or st['final']) else '-closed')
            elif n=='stone-return-loop':asset=n+('-open' if st['loop'] else '-closed')
            elif n=='balance-crystal':continue
            prop(im,e,asset,st['id'])
        # All characters are separate exact reused layers, never part of a background.
        if room=='observatory':actor(im,'assets/levels/shared/characters/the-shadow/sprites/waiting.png',(424,190))
        if st['lumo'] and room=='corridor':actor(im,'src/assets/lumo_0.png',(302,92),foot=(12,12))
        elif not st['lumo'] and room==('observatory' if st['loop'] else 'entrance'):
            actor(im,'src/assets/lumo_0.png',(456,264) if st['loop'] else (210,254),foot=(12,12))
    return out

ALL={}
for st in STATES:
    rs=rooms(st);ALL[st['id']]=rs
    panel=Image.new('RGBA',(1920,360))
    for i,room in enumerate(BASE):
        save_review(rs[room],st['id']+'-'+room,room=room,state=st['id'])
        panel.alpha_composite(rs[room],(640*i,0))
    save_review(panel,st['id']+'-three-rooms','three-room',state=st['id'])

# Non-textual ink preview: same table and layout scale as the real star-map-table.
ink=ALL[STATES[2]['id']]['corridor'].copy();e=next(e for e in L['elements'] if e['id']=='star-map-table')
r=e['drawn_rect'];put(ink,'star-map-table-margin-ink',r['x'],r['y'],(r['width'],r['height']))
save_review(ink,'05-margin-ink-blank-for-runtime-text',room='corridor',state='margin-ink')

current=ALL[STATES[2]['id']]['observatory'].copy()
for n,fade in ((1,255),(2,164),(3,64)):
    im=current.copy()
    # Replace the present waiting figure with a separate moving Shadow layer.
    im=rooms(STATES[2])['observatory']
    # The existing figure is removed by recomposing the small clean region from the base;
    # then the opaque present layer is placed at the memory's shared destination.
    clean=A['observatory-clean-base'].crop((400,126,449,191));im.paste(clean,(400,126))
    put(im,'memory-amber-tint',0,0,opacity=fade)
    put(im,'memory-wheel-blocked',186,59,opacity=fade)
    put(im,'memory-water-drained',30,104,opacity=fade)
    put(im,'memory-three-root-circuits-cracked',340,88,opacity=fade)
    # 3 distinct animation samples share the final foot (466,190).
    actor(im,'assets/levels/shared/characters/the-shadow/sprites/waiting.png',(466,190))
    put(im,'memory-guardian-'+str(n),442,128)
    save_review(im,'08-memory-overlap-'+str(n),room='observatory',state='memory-overlap-'+str(n),guardian_ground=[466,190],shadow_ground=[466,190])
flash=current.copy();put(flash,'memory-white-flash',0,0);save_review(flash,'07-memory-white-flash',room='observatory',state='white-flash')
after=current.copy();e=next(e for e in L['elements'] if e['id']=='balance-crystal');prop(after,e,'balance-crystal','after-memory')
save_review(after,'09-after-memory-shadow-remains-crystal-revealed',room='observatory',state='after-memory',shadow_ground=[424,190])
before=current.copy();put(before,'memory-amber-tint',0,0);put(before,'memory-wheel-blocked',186,59);put(before,'memory-water-drained',30,104);put(before,'memory-three-root-circuits-cracked',340,88);put(before,'memory-guardian-1',442,128)
save_review(before,'06-memory-record-guardian',room='observatory',state='memory-before-overlap',guardian_ground=[466,190],shadow_ground=[424,190])

state_contact=Image.new('RGBA',(1920,1080))
for i,st in enumerate(STATES[:3]):state_contact.alpha_composite(Image.open(P/(st['id']+'-three-rooms.png')),(0,i*360))
save_review(state_contact,'three-required-states-native','state-contact')
memory_names=['06-memory-record-guardian','07-memory-white-flash','08-memory-overlap-1','08-memory-overlap-2','08-memory-overlap-3','09-after-memory-shadow-remains-crystal-revealed']
memory_contact=Image.new('RGBA',(1280,1080))
for i,name in enumerate(memory_names):memory_contact.alpha_composite(Image.open(P/(name+'.png')),((i%2)*640,(i//2)*360))
save_review(memory_contact,'memory-sequence-native','memory-contact')

# Contact: exact native sprites on checkerboard with no raster labels.
cols=8;cellw=176;cellh=164;rows=math.ceil(len(M['assets'])/cols)
sheet=Image.new('RGBA',(cols*cellw,rows*cellh),(17,28,39,255));d=ImageDraw.Draw(sheet)
contact=[]
for i,a in enumerate(M['assets']):
    x=(i%cols)*cellw;y=(i//cols)*cellh;im=A[a['id']]
    for yy in range(y,y+cellh,8):
        for xx in range(x,x+cellw,8):d.rectangle((xx,yy,xx+7,yy+7),fill=(26,38,48,255) if ((xx//8+yy//8)%2) else (32,45,54,255))
    # Backgrounds/long pipes are reviewed at native size in their dedicated files.
    if im.width<=cellw-8 and im.height<=cellh-8:
        sheet.alpha_composite(im,(x+(cellw-im.width)//2,y+(cellh-im.height)//2))
        contact.append(dict(index=i,id=a['id'],cell=[x,y,cellw,cellh],shown_at_native=True))
    else:contact.append(dict(index=i,id=a['id'],cell=[x,y,cellw,cellh],shown_at_native=False,dedicated_native_file=a['path']))
save_review(sheet,'native-sprite-contact','contact')
save_review(sheet.resize((sheet.width*2,sheet.height*2),NEAR),'native-sprite-contact-nearest-2x','contact-2x',scale=2)
for name in ['01-door-a-powered-entrance','02-shadowed-bed-grown-bridge-observatory','03-lumo-recalled-dark-retracted-roots-observatory','08-memory-overlap-1']:
    im=Image.open(P/(name+'.png'));save_review(im.resize((1280,720),NEAR),name+'-nearest-2x','review-2x',scale=2)
(P/'contact-index-v3.json').write_text(json.dumps(contact,indent=2)+'\n',encoding='utf-8')
(PKG/'review-manifest-v3.json').write_text(json.dumps(dict(scope='offline composites; dynamic beams omitted and left to the runtime; state cues use separate art layers',display_fit='Native exports are unchanged. Reviews use only the existing authored display dimensions from 09-layout, nearest sampling. Half-pixel origins are rounded once, ties toward positive, for the raster preview only.',memory_sequence=memory_names,states=STATES,reviews=REVIEWS,placements=PLACES),indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reviews':len(REVIEWS),'registered_placements':len(PLACES),'engine':'NOT_RUN'}))

