from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import hashlib,json,math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'; SH=R/'assets/levels/shared/garden-mechanisms'
for p in [S,P,SH]:p.mkdir(exist_ok=True)
rows=[]; refs=[]; sprites={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(R).as_posix()
def blank(w,h):return Image.new('RGBA',(w,h))
def save(n,im,source='prepare_assets.py',shared=False,pivot=None):
 p=(SH if shared else S)/(n+'.png');im.save(p);sprites[n]=im
 rows.append(dict(file=rel(p),proposed_key='garden_'+n.replace('-','_'),state=n,size=list(im.size),pivot=pivot or [.5,.5],source=source,kind='generated-normalized' if source.startswith('sources/') else 'native-state-layer',sha256=sha(p)))
def reuse(n,p):
 sprites[n]=Image.open(p).convert('RGBA');refs.append(dict(key=n,file=rel(p),size=list(sprites[n].size),pivot=[.5,.5],sha256=sha(p)))
for state in ['unlatched','latched']:
 for side in ['west','east']:reuse('latch-'+side+'-'+state,R/'assets/levels/shared/mechanisms'/('latch-'+side+'-'+state+'.png'))
reuse('lumo',R/'src/assets/lumo_0.png')
for state in ['on','off']:reuse('nhinh-'+state,R/'assets/character'/('nhinh_downright_lantern_'+state+'_0.png'))
sheet=Image.open(B/'sources/plants-original.png').convert('RGBA')
# Measured source regions, retained on disk. Alpha threshold removes low-opacity generation speckles.
crops={'sun-open':(40,40,365,650),'sun-folded':(370,180,680,650),'moon-coiled':(720,310,1052,650),'moon-extended':(1090,320,1856,650),'sprout-before':(1860,380,2125,650)}
for n,box in crops.items():
 im=sheet.crop(box);im.putalpha(im.getchannel('A').point(lambda a:255 if a>=100 else 0));im=im.crop(im.getbbox())
 size=(48,72) if n.startswith('sun') else (112,44) if n=='moon-extended' else (48,44) if n=='moon-coiled' else (32,32)
 im.thumbnail(size,Image.Resampling.NEAREST);out=blank(*size);out.alpha_composite(im,((size[0]-im.width)//2,size[1]-im.height));save(n,out,'sources/plants-original.png',True,pivot=[.5,1])
# One additional leaf, deliberately a small change rather than a glow effect.
im=blank(32,32);d=ImageDraw.Draw(im);d.line((16,19,18,9),fill='#9abf7c',width=2);d.polygon([(18,10),(17,3),(23,2),(25,5),(21,10)],fill='#b4d893',outline='#56886d');save('sprout-new-leaf-overlay',im,shared=True,pivot=[.5,1])
im=sprites['sprout-before'].copy();im.alpha_composite(sprites['sprout-new-leaf-overlay']);save('sprout-after',im,shared=True,pivot=[.5,1])
for symbol in ['sun-bloom','sun-folded','moon-open','moon-closed']:
 im=blank(16,16);d=ImageDraw.Draw(im);d.rectangle((1,1,14,14),fill='#263e45',outline='#c5c7a4')
 if symbol=='sun-bloom':
  for a in range(0,360,60):
   x=7+round(4*math.cos(math.radians(a)));y=7+round(4*math.sin(math.radians(a)));d.rectangle((x-1,y-1,x+1,y+1),fill='#f0e9cb')
  d.ellipse((5,5,9,9),fill='#dac583')
 elif symbol=='sun-folded':d.polygon([(4,4),(11,4),(9,10),(7,12),(5,10)],fill='#eee4bd')
 elif symbol=='moon-open':d.line([(2,11),(5,7),(8,11),(11,7),(14,11)],fill='#bad9d6',width=2);d.line((2,4,13,4),fill='#bad9d6',width=2)
 else:d.arc((3,2,12,12),20,330,fill='#bad9d6',width=2);d.line((5,7,10,7),fill='#bad9d6',width=2)
 save('icon-'+symbol,im,shared=True)
for state in ['off','on','held']:
 im=blank(48,32);d=ImageDraw.Draw(im)
 for y in [8,16,24]:
  end=43 if state!='off' else 11
  d.line([(2,y+2),(10,y-2),(21,y+1),(32,y-2),(end,y)],fill='#416779',width=7) if state!='off' else d.arc((1,y-5,14,y+6),20,320,fill='#416779',width=5)
  if state!='off':d.line([(2,y),(10,y-3),(21,y-1),(32,y-3),(43,y-2)],fill='#a1c4c0',width=2)
 if state=='held':d.rectangle((16,0,31,4),fill='#d7b47d');d.line((18,2,29,2),fill='#f3d79e',width=1)
 save('root-bridge-'+state,im,shared=True)
im=blank(48,32);d=ImageDraw.Draw(im);d.line((1,5,1,27),fill='#668b91',width=2);d.line((46,5,46,27),fill='#668b91',width=2);save('root-bridge-missing',im,shared=True)
for state in ['coiled','deployed']:
 im=blank(128,64);im.alpha_composite(sprites['moon-coiled'],(0,4))
 im.alpha_composite(sprites['root-bridge-on'] if state=='deployed' else sprites['root-bridge-off'],(43,16))
 im.alpha_composite(sprites['root-bridge-on'] if state=='deployed' else sprites['root-bridge-missing'],(84,16))
 im.alpha_composite(sprites['icon-moon-open'] if state=='deployed' else sprites['icon-moon-closed'],(15,47));save('moon-pot-'+state,im,shared=True)
# Reservoir glow is inside the opening. Shutter is separate and physically covers it.
im=blank(80,72);d=ImageDraw.Draw(im);d.rectangle((7,18,72,65),fill='#415960',outline='#9aaba6',width=3);d.ellipse((7,3,72,32),fill='#53686b',outline='#bdc7b4',width=2);d.rectangle((16,23,63,53),fill='#e4dfbd');d.line((18,35,60,35),fill='#fff5d3',width=3);save('reservoir-open',im)
im=blank(80,72);d=ImageDraw.Draw(im);d.rectangle((13,20,66,56),fill='#263d48',outline='#a6afa0',width=3)
for y in range(26,55,6):d.line((16,y,63,y),fill='#52676c',width=2)
save('reservoir-shutter-closed-overlay',im)
im=sprites['reservoir-open'].copy();im.alpha_composite(sprites['reservoir-shutter-closed-overlay']);save('reservoir-closed',im)
for state in ['open','closed']:
 im=blank(24,40);d=ImageDraw.Draw(im);d.rectangle((7,3,16,36),fill='#405961',outline='#96a69e');y=11 if state=='open' else 29;d.line((12,20,12,y),fill='#d5ba7e',width=3);d.rectangle((2,y-3,21,y+3),fill='#ddc68b');save('shutter-handle-'+state,im)
for state in ['lowered','raised','held']:
 im=blank(112,72);d=ImageDraw.Draw(im)
 for x in [5,100]:d.rectangle((x,24,x+7,68),fill='#4a6265',outline='#a7b5a6')
 y=16 if state!='lowered' else 48;d.rectangle((5,y,107,y+9),fill='#8a7155',outline='#d0b686');d.line((9,y+3,104,y+3),fill='#ad936e',width=2)
 if state=='held':d.rectangle((93,23,109,28),fill='#dcc28a');d.line((95,22,105,17),fill='#dcc28a',width=3)
 save('gate-bar-'+state,im)
for state in ['closed','open']:
 im=blank(52,48);d=ImageDraw.Draw(im);d.rectangle((3,4,48,42),fill='#486168',outline='#a9b8a9',width=3);d.rectangle((10,13,41,37),fill='#152f3e')
 if state=='closed':
  for x in range(12,42,7):d.line((x,13,x,37),fill='#9baaa1',width=3)
 else:d.rectangle((10,5,41,12),fill='#99aaa2');d.polygon([(23,19),(29,19),(29,27),(34,27),(26,35),(18,27),(23,27)],fill='#96c4cc')
 save('nursery-drain-'+state,im)
im=blank(128,24);d=ImageDraw.Draw(im);d.line([(0,12),(128,12)],fill='#30677a',width=14)
for x in range(8,125,24):d.line([(x,7),(x+7,12),(x,17)],fill='#9bc6ca',width=2)
save('nursery-water-delivered',im)
for state in ['closed','open']:
 im=blank(80,32);d=ImageDraw.Draw(im)
 for x in range(0,80,16):d.rectangle((x,3,x+14,28),fill='#697d7d',outline='#a5b3a6')
 if state=='closed':d.line((2,10,77,10),fill='#987759',width=6)
 else:d.rectangle((68,7,78,13),fill='#d8bd88')
 save('side-stone-path-'+state,im)
base=Image.open(B/'sources/garden-original.png').convert('RGBA').resize((640,360),Image.Resampling.NEAREST)
# Fill bottom scenic crossing with canal: it must not imply an unlocked bypass.
d=ImageDraw.Draw(base);d.rectangle((294,276,376,308),fill='#183b48');d.line((294,276,294,308),fill='#78908a',width=3);d.line((376,276,376,308),fill='#78908a',width=3)
save('garden-scene-base',base,'sources/garden-original.png')
def put(im,n,x,y):im.alpha_composite(sprites[n],(x,y))
def scene(n,caption,lantern=False,shutter=True,latch=False,roots=False,water=False,side=False,held=False,lumo=True):
 im=base.copy()
 if not lantern and shutter:im=ImageEnhance.Brightness(im).enhance(.82)
 put(im,'reservoir-closed' if shutter else 'reservoir-open',35,55);put(im,'shutter-handle-closed' if shutter else 'shutter-handle-open',117,83)
 put(im,'sun-open' if lantern or not shutter else 'sun-folded',180,124);put(im,'icon-sun-bloom' if lantern or not shutter else 'icon-sun-folded',194,188)
 put(im,'gate-bar-held' if latch else 'gate-bar-raised' if lantern else 'gate-bar-lowered',170,109)
 put(im,'latch-west-latched' if latch else 'latch-west-unlatched',260,134)
 put(im,'moon-coiled',267,207);put(im,'icon-moon-open' if roots else 'icon-moon-closed',277,243)
 for i in range(2):put(im,'root-bridge-held' if held and i==0 else 'root-bridge-on' if roots else 'root-bridge-off',307+i*43,220)
 put(im,'nursery-drain-open' if water else 'nursery-drain-closed',425,236)
 if water:put(im,'nursery-water-delivered',453,263)
 put(im,'sprout-after' if water else 'sprout-before',510,235)
 put(im,'side-stone-path-open' if side else 'side-stone-path-closed',340,279);put(im,'latch-east-latched' if side else 'latch-east-unlatched',415,281)
 # Adjacent safe teaching pots; the little gap never spans the broad foreground path.
 put(im,'sun-open' if lantern else 'sun-folded',71,220);put(im,'icon-sun-bloom' if lantern else 'icon-sun-folded',86,280)
 put(im,'moon-coiled',125,248);put(im,'icon-moon-open' if roots else 'icon-moon-closed',140,284)
 dr=ImageDraw.Draw(im);dr.rectangle((175,268,218,278),fill='#183b48')
 if roots:put(im,'root-bridge-on',174,258)
 put(im,'nhinh-on' if lantern else 'nhinh-off',320 if held else 230,207 if held else 253)
 if lumo:put(im,'lumo',370 if held else 270,205 if held else 252)
 dr=ImageDraw.Draw(im);dr.rectangle((0,0,639,21),fill='#152b36');dr.text((8,6),caption,fill='#e0e8d2');im.save(P/(n+'-640x360.png'))
scene('01-reservoir-exposed','01 Reservoir glow exposed / shutter handle available',shutter=False,lantern=True)
scene('02-shutter-closed-dark','02 Shutter closed / lantern OFF / Lumo does not retract roots',roots=True)
scene('03-lantern-on-sun-lifts','03 Lantern ON / Sun Flower lifts bar / roots coiled',lantern=True)
scene('04-first-latch-persists','04 First latch holds bar / lantern OFF / roots extend',latch=True,roots=True)
scene('05-safe-retract-occupied','05 Lantern ON on bridge / occupied portion HELD / empty retracts',lantern=True,latch=True,held=True)
scene('06-water-new-leaf','06 Drain open / one new leaf / Sun Flower folds / both latches held',latch=True,roots=True,water=True,side=True)
scene('07-lumo-only','07 Lumo dim light / lantern OFF / plants unchanged',latch=True,roots=True,lumo=True)
scene('08-dark-without-lumo','08 Same plant states without Lumo / comparison',latch=True,roots=True,lumo=False)
# True native-size contact sheet, paired nearest enlargement.
items=list(rows)+refs;w=720;h=math.ceil(len(items)/4)*114;contact=Image.new('RGBA',(w,h),'#172d38');d=ImageDraw.Draw(contact)
for i,r in enumerate(items):
 x=(i%4)*180;y=(i//4)*114;im=Image.open(R/r['file']).convert('RGBA')
 if im.size==(640,360):im=im.resize((144,81),Image.Resampling.NEAREST);label='scene thumbnail (not native)'
 else:label=Path(r['file']).stem
 contact.alpha_composite(im,(x+5,y+18));d.text((x+4,y+3),label[:28],fill='#e7ead8')
contact.save(P/'states-native-1x.png');contact.resize((w*2,h*2),Image.Resampling.NEAREST).save(P/'states-nearest-2x.png')
validation=[]
for r in rows:
 p=R/r['file'];im=Image.open(p);a=im.getchannel('A');opaque=im.size==(640,360)
 checks=dict(path=p.exists(),rgba=im.mode=='RGBA',canvas=list(im.size)==r['size'],nonempty=a.getbbox() is not None,transparent=opaque or a.getextrema()[0]==0,sha256=sha(p)==r['sha256'])
 assert all(checks.values()),(r,checks);validation.append(dict(file=r['file'],status='PASS',checks=checks))
for r in refs:assert (R/r['file']).exists() and sha(R/r['file'])==r['sha256']
(B/'asset-map.json').write_text(json.dumps(dict(exports=rows,reused=refs,crop_boxes=crops),indent=2)+'\n')
(B/'validation.json').write_text(json.dumps(dict(status='PASS',command='python assets/levels/07-the-sleeping-garden/prepare_assets.py',exports=validation,reuse_checks='PASS',runtime='NOT_RUN'),indent=2)+'\n')
sources=[B/'sources/garden-original.png',B/'sources/plants-original.png',R/'docs/scenario/07-the-sleeping-garden.md',B/'generation-prompts.json',B/'prepare_assets.py']
(B/'provenance.json').write_text(json.dumps(dict(requested_model='gpt-6.1-sol',requested_effort='low',dispatch='Parent reports accepted; worker resolved model and effort not exposed',image_backend='built-in image_gen; backend model not exposed; two successful calls, no fallback',sources=[dict(file=rel(p),sha256=sha(p)) for p in sources]),indent=2)+'\n')
(SH/'metadata.json').write_text(json.dumps(dict(exports=[r for r in rows if r['file'].startswith(rel(SH))],states={'sun':'lantern on opens and raises; off folds','moon':'lantern off deploys; on retracts only vacant portions','held':'occupied bridge span temporarily remains; not a mechanical latch','lumo':'does not alter plants'},used_by=[7,9]),indent=2)+'\n')
print(f'PASS {len(rows)} exports; {len(refs)} reuse paths/hashes; {len(list(P.glob("*.png")))} previews. Engine NOT_RUN.')
