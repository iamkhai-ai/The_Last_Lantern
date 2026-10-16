from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'
rows=[]; refs=[]; sprites={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(R).as_posix()
def blank(w,h):return Image.new('RGBA',(w,h))
def save(n,im,pivot=(.5,.5),kind='native-symbolic-module'):
 p=S/(n+'.png');im.save(p);sprites[n]=im
 rows.append(dict(file=rel(p),key='ruins_'+n.replace('-','_'),state=n,size=list(im.size),pivot=pivot,kind=kind,sha256=sha(p)))
def reuse(n,p):
 sprites[n]=Image.open(p).convert('RGBA');refs.append(dict(key=n,file=rel(p),size=list(sprites[n].size),sha256=sha(p)))
for n,f in {'prism-on':'beam-splitter/prism-receiving.png','prism-off':'beam-splitter/prism-dark.png','mirror-left':'mechanisms/mirror-1-slash.png','mirror-right':'mechanisms/mirror-2-backslash.png','source-on':'mechanisms/source-lit.png','source-off':'mechanisms/source-off-source.png','latch':'mechanisms/latch-west-latched.png','sprout':'garden-mechanisms/sprout-after.png','rock':'atlas_rock_sample.png'}.items():reuse(n,R/'assets/levels/shared'/f)
stone='#4c6872'; edge='#a3b9b4'; dark='#1b303e'; gold='#f6db8b'; cyan='#bbdfdb'
original=Image.open(B/'sources/temple-original.png').convert('RGBA')
column_texture=original.crop((int(original.width*.85),int(original.height*.16),int(original.width*.91),int(original.height*.77)))
def rune(im,xy,typ,on):
 d=ImageDraw.Draw(im);x,y=xy;c=gold if typ=='sun' and on else cyan if on else '#687f8d'
 if typ=='sun':
  d.ellipse((x-4,y-4,x+4,y+4),fill=c if on else dark,outline=c)
  for a in range(0,360,45):
   dx=round(math.cos(math.radians(a))*7);dy=round(math.sin(math.radians(a))*7);d.line((x+dx,y+dy,x+round(dx*1.35),y+round(dy*1.35)),fill=c)
  if on:d.line((x-7,y+12,x+7,y+12),fill=c,width=2)
 else:
  d.ellipse((x-7,y-8,x+7,y+8),fill=c);d.ellipse((x-2,y-10,x+10,y+4),fill=dark)
  d.line((x-9,y+12,x+9,y+12),fill=c,width=2)
  if on:d.line((x-9,y+12,x-9,y+7),fill=c,width=2);d.line((x+9,y+12,x+9,y+7),fill=c,width=2)
for typ,states in [('sun',['off','on']),('moon',['lit','covered'])]:
 for st in states:
  im=blank(32,40);d=ImageDraw.Draw(im);d.polygon([(3,5),(27,5),(30,32),(16,38),(2,32)],fill=stone,outline=edge);d.rectangle((5,7,26,33),fill=dark);rune(im,(16,18),typ,st in ['on','covered']);save('lock-'+typ+'-'+st,im)
# Physical front width and unequal side bevel distinguish all four indexed notches.
widths=[36,12,36,12]; centers=[32,32,32,32]
for i,w in enumerate(widths):
 im=blank(64,88);d=ImageDraw.Draw(im);d.ellipse((5,58,59,82),fill=dark,outline=edge)
 for j,(x,y) in enumerate([(32,59),(57,70),(32,81),(7,70)]):d.rectangle((x-2,y-2,x+2,y+2),fill=gold if j==i else stone)
 x=32-w//2;d.polygon([(x,17),(x+w,17),(x+w+5,58),(x+3,66),(x-3,57)],fill=stone,outline=edge)
 d.polygon([(x+w,17),(x+w+5,21),(x+w+5,58),(x+w,61)],fill='#29414f')
 d.rectangle((x+3,24,x+w-3,54),outline='#79939b');d.line((x+4,30,x+w-4,30),fill=edge,width=2)
 texture=column_texture.resize((max(2,w-6),29),Image.Resampling.NEAREST)
 im.alpha_composite(texture,(x+3,25));d.rectangle((x+2,23,x+w-2,55),outline=edge)
 # Crown asymmetry records orientation, including the opposite broad face.
 d.polygon([(x,17),(x+5,8),(x+w-5,8),(x+w,17)],fill='#758d92',outline=edge)
 d.rectangle((x+3 if i<2 else x+w-7,12,x+7 if i<2 else x+w-3,16),fill=gold)
 save('statue-notch-'+str(i),im,(.5,70/88))
 im2=im.resize((32,44),Image.Resampling.NEAREST);save('test-column-notch-'+str(i),im2,(.5,35/44))
# Mask coordinates are scene-local, in a 640x360 canvas. Rays originate at (320,295).
# Only notch 0 reaches the entire Moon receiver box [304,89,335,128].
polys=[[(304,220),(336,220),(348,75),(292,75)],[(314,220),(326,220),(324,75),(316,75)],[(304,220),(336,220),(230,76),(187,76)],[(314,220),(326,220),(438,76),(420,76)]]
for i,poly in enumerate(polys):
 im=blank(640,360);ImageDraw.Draw(im).polygon(poly,fill=(8,23,36,220),outline=cyan);save('shadow-notch-'+str(i),im,kind='exact-shadow-mask')
for st in ['waiting','ready','latched']:
 im=blank(48,36);d=ImageDraw.Draw(im);d.ellipse((3,7,45,33),fill=stone,outline=edge)
 for a in range(0,360,30):
  x=24+round(15*math.cos(math.radians(a)));y=19+round(8*math.sin(math.radians(a)));d.rectangle((x-1,y-1,x+1,y+1),fill=gold if st!='waiting' else dark)
 if st=='latched':d.rectangle((17,12,31,24),fill='#a9865b',outline=gold);d.line((19,15,29,21),fill=gold,width=3)
 else:d.ellipse((20,15,28,23),fill=dark,outline=edge)
 save('confirmation-'+st,im)
for typ,size in [('sanctuary-door',(104,76)),('seedling-curtain',(88,48))]:
 for st in ['open','closed']:
  im=blank(*size);d=ImageDraw.Draw(im);w,h=size;d.rectangle((1,1,w-2,h-2),fill=dark,outline=edge)
  d.rectangle((2,2,9,h-3),fill=stone);d.rectangle((w-10,2,w-3,h-3),fill=stone)
  if st=='closed':
   d.rectangle((10,4,w-11,h-3),fill=stone,outline=edge)
   for x in range(16,w-10,12):d.line((x,5,x,h-4),fill='#324f5d')
  else:d.rectangle((10,3,w-11,12),fill=stone,outline=edge)
  save(typ+'-'+st,im)
im=blank(48,36);d=ImageDraw.Draw(im);d.ellipse((3,6,45,32),fill=stone,outline=edge);d.line((7,20,40,20),fill=gold,width=2);save('test-pedestal',im)
im=sprites['lock-moon-lit'].resize((16,20),Image.Resampling.NEAREST);save('test-moon-lit',im)
im=sprites['lock-moon-covered'].resize((16,20),Image.Resampling.NEAREST);save('test-moon-covered',im)
# Same design prism, exact extra through-port; fixed three paths are separate from mirrors.
for state in ['on','off']:
 im=sprites['prism-'+state].copy();d=ImageDraw.Draw(im);d.line((24,30,24,2),fill=gold if state=='on' else '#58727c',width=3);d.rectangle((21,1,27,4),fill=cyan);save('fixed-three-route-splitter-'+state,im)
base=original.crop((0,0,int(original.width*.82),original.height)).resize((640,360),Image.Resampling.NEAREST)
save('temple-scene-base',base,kind='generated-normalized')
def put(im,n,x,y):im.alpha_composite(sprites[n],(x,y))
states=[]
def scene(n,notch=0,power=True,left=True,right=True,latched=False):
 im=base.copy();d=ImageDraw.Draw(im)
 # Neutral floor inset guarantees readable exact ray geometry over scenic texture.
 d.polygon([(155,75),(480,75),(505,312),(135,312)],fill='#2d4653',outline='#69808a')
 put(im,'sanctuary-door-open' if latched else 'sanctuary-door-closed',518,43)
 # Seedlings sit behind central statue; curtain has its own state and mechanical hold.
 put(im,'seedling-curtain-closed' if latched else 'seedling-curtain-open',284,28)
 if not latched:put(im,'sprout',299,42);put(im,'sprout',330,42)
 paths=[[(320,295),(190,295),(190,110)],[(320,295),(450,295),(450,110)],[(320,295),(320,110)]]
 for k,path in enumerate(paths):
  d.line(path,fill='#65747c',width=1)
  if power and (k==2 or k==0 and left or k==1 and right):d.line(path,fill=gold,width=3)
 if power:im.alpha_composite(sprites['shadow-notch-'+str(notch)])
 covered=not power or notch==0
 sunl=power and left and notch!=2;sunr=power and right and notch!=3
 put(im,'lock-sun-on' if sunl else 'lock-sun-off',174,90);put(im,'lock-sun-on' if sunr else 'lock-sun-off',434,90)
 put(im,'lock-moon-covered' if covered else 'lock-moon-lit',304,89)
 put(im,'statue-notch-'+str(notch),288,150)
 put(im,'mirror-left',174,266);put(im,'mirror-right',434,266)
 put(im,'fixed-three-route-splitter-on' if power else 'fixed-three-route-splitter-off',296,265)
 put(im,'source-on' if power else 'source-off',304,307)
 ready=sunl and sunr and covered
 put(im,'confirmation-latched' if latched else 'confirmation-ready' if ready else 'confirmation-waiting',365,252)
 if latched:put(im,'latch',413,255)
 # Entrance test is separate from main network.
 put(im,'test-pedestal',42,263);put(im,'test-column-notch-'+str(notch),50,214);put(im,'test-moon-covered' if notch==0 else 'test-moon-lit',58,183)
 if power:
  dd=ImageDraw.Draw(im);dd.line((66,286,66,255),fill=gold,width=2)
  dd.polygon([(58,249),(74,249),(78,181),(54,181)] if notch==0 else [(63,249),(69,249),(68,181),(64,181)],outline=cyan)
 im.save(P/(n+'-640x360.png'));states.append(dict(file=n+'-640x360.png',notch=notch,lamp=power,sun_left=sunl,sun_right=sunr,moon_covered=covered,ready=ready,latched=latched))
scene('01-correct-wide');scene('02-wrong-narrow',1);scene('03-wrong-wide-left',2);scene('04-wrong-narrow-right',3);scene('05-lamp-off',0,False);scene('06-left-route-lost',0,True,False);scene('07-sanctuary-latched',0,True,True,True,True);scene('08-latched-lamp-off',0,False,True,True,True)
# Opaque native mask sheets are documented as 640x360 layers; sprites stay actual size.
items=[r for r in rows if r['size']!=[640,360]]+refs
w=768;h=math.ceil(len(items)/6)*112;contact=Image.new('RGBA',(w,h),dark);dd=ImageDraw.Draw(contact)
for i,r in enumerate(items):
 x=i%6*128;y=i//6*112;im=Image.open(R/r['file']).convert('RGBA');contact.alpha_composite(im,(x+4,y+18));dd.text((x+3,y+3),Path(r['file']).stem[:21],fill=edge)
contact.save(P/'contact-native-1x.png');contact.resize((w*2,h*2),Image.Resampling.NEAREST).save(P/'contact-nearest-2x.png')
grid=Image.new('RGBA',(1280,1440),dark)
for i,state in enumerate(states):grid.alpha_composite(Image.open(P/state['file']),(i%2*640,i//2*360))
grid.save(P/'states-native-1x.png');grid.resize((2560,2880),Image.Resampling.NEAREST).save(P/'states-nearest-2x.png')
checks=[]
for r in rows:
 im=Image.open(R/r['file']);assert im.mode=='RGBA' and list(im.size)==r['size'] and im.getbbox() and sha(R/r['file'])==r['sha256'];checks.append(dict(file=r['file'],status='PASS',canvas_alpha_hash=True))
for r in refs:assert sha(R/r['file'])==r['sha256']
# Inclusive rectangle test: central Moon entirely within mask 0, side ray x positions untouched.
mask=Image.new('1',(640,360));ImageDraw.Draw(mask).polygon(polys[0],fill=1)
assert all(mask.getpixel((x,y)) for x in range(304,336) for y in range(89,129))
assert not any(mask.getpixel((x,y)) for x in [190,450] for y in range(110,296))
assert sum(s['ready'] for s in states)==2 and not states[4]['sun_left'] and not states[4]['ready']
(B/'asset-map.json').write_text(json.dumps(dict(exports=rows,reused=refs,states=states,geometry=dict(source=[320,295],moon_box=[304,89,335,128],sun_paths=paths if False else [[[320,295],[190,295],[190,110]],[[320,295],[450,295],[450,110]]],shadow_polygons=polys),semantics='Locks are live simultaneous conditions, never latched. Only confirmation latches door and seedling curtain. Sun left/right use exactly the same lock-sun files.'),indent=2)+'\n')
(B/'validation.json').write_text(json.dumps(dict(status='PASS',command='python assets/levels/08-ruins-of-two-halves/prepare_assets.py',exports=checks,reused_hashes='PASS',geometry='PASS: full central box covered by notch0; side paths outside footprint',runtime='NOT_RUN',raycast='NOT_RUN',interactions='NOT_RUN',collision='NOT_RUN',save_restore='NOT_RUN'),indent=2)+'\n')
print('PASS',len(rows),'exports',len(refs),'reuse references; exact geometry checks. Runtime NOT_RUN.')
