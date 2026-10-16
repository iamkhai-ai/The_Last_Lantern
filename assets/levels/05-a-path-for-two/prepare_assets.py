from PIL import Image, ImageDraw, ImageEnhance
from pathlib import Path
import hashlib,json,math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'
for p in [S,P]:p.mkdir(exist_ok=True)
sprites={}; rows=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def blank(s):return Image.new('RGBA',s)
def save(n,im,kind='native',source='prepare_assets.py'):
 p=S/(n+'.png');im.save(p);sprites[n]=im
 rows.append(dict(file=p.relative_to(R).as_posix(),proposed_key='lumo_station_'+n.replace('-','_'),state=n,size=list(im.size),pivot=[.5,.5],source=source,kind=kind,sha256=sha(p)))
def bug(d,x,y,c):
 d.polygon([(x-7,y-3),(x-3,y-7),(x,y-2),(x+3,y-7),(x+7,y-3),(x+2,y+2),(x,y+8),(x-2,y+2)],fill=c)
 d.line((x,y-3,x,y+6),fill='#223b41',width=2)
for state in ['idle','sent','arrived']:
 im=blank((40,48));d=ImageDraw.Draw(im);d.polygon([(5,44),(5,15),(10,8),(30,8),(35,15),(35,44)],fill='#3b555b',outline='#83948c');d.rectangle((8,40,32,45),fill='#718580')
 c={'idle':'#91a5a1','sent':'#89dfec','arrived':'#ffe7a0'}[state];bug(d,20,23,c)
 if state=='sent':
  d.line((6,4,18,4),fill=c,width=2);d.line((23,4,33,4),fill=c,width=2);d.polygon([(30,1),(36,4),(30,7)],fill=c)
 if state=='arrived':d.line([(11,4),(17,9),(29,0)],fill=c,width=3)
 save('call-'+state,im)
for state in ['empty','occupied']:
 im=blank((44,28));d=ImageDraw.Draw(im);d.polygon([(2,13),(12,3),(32,3),(42,13),(32,24),(12,24)],fill='#354b52',outline='#9aaca0');bug(d,22,12,'#ffe7a0' if state=='occupied' else '#6ca4ad')
 if state=='occupied':d.line((6,24,38,24),fill='#ffe7a0',width=3)
 save('pressure-'+state,im)
for state in ['rest','flow','arrived']:
 im=blank((160,40));d=ImageDraw.Draw(im);pts=[(2,28),(27,28),(39,16),(80,16),(97,28),(156,28)];d.line(pts,fill='#344d4b',width=6);d.line(pts,fill={'rest':'#708d78','flow':'#80d6dc','arrived':'#d5dca0'}[state],width=2)
 if state=='flow':
  for x in [47,64,115,132]:d.line([(x,23 if x>100 else 11),(x+4,27 if x>100 else 15),(x,31 if x>100 else 19)],fill='#d4f6ef',width=2)
 save('root-cable-'+state,im)
for shape in ['straight','elbow','mouth']:
 im=blank((64,32));d=ImageDraw.Draw(im);d.rectangle((2,6,61,25),fill='#51676b',outline='#91a09a');d.rectangle((3,12,60,19),fill='#142d36')
 for x in [8,30,52]:d.rectangle((x,5,x+3,26),fill='#7d8c83')
 if shape=='elbow':d.rectangle((42,1,61,16),fill='#51676b');d.rectangle((48,0,55,18),fill='#142d36')
 if shape=='mouth':d.ellipse((0,4,22,28),fill='#8a9990');d.ellipse((4,9,18,23),fill='#0e2732')
 save('tube-'+shape,im)
for state in ['closed','open']:
 im=blank((64,88));d=ImageDraw.Draw(im);d.rectangle((6,7,57,83),fill='#1b3038');d.rectangle((2,4,12,84),fill='#65787a',outline='#a1a997');d.rectangle((51,4,61,84),fill='#65787a',outline='#a1a997');d.rectangle((2,2,61,15),fill='#84918a')
 if state=='closed':
  d.rectangle((14,17,49,80),fill='#465e63')
  for x in [17,28,39]:d.line((x,19,x,78),fill='#80918e',width=3)
 else:d.rectangle((14,16,49,24),fill='#718882');d.line((14,78,49,78),fill='#99ada2',width=2)
 save('door-'+state,im)
im=blank((64,88));d=ImageDraw.Draw(im);d.rectangle((7,8,56,13),fill='#d5b66e');d.line((9,7,9,21),fill='#f6d994',width=3);d.line((54,7,54,21),fill='#f6d994',width=3);save('door-held-overlay',im)
for state in ['unlatched','latched']:
 source=R/'assets/levels/shared/mechanisms'/('latch-west-'+state+'.png');save('latch-'+state,Image.open(source).convert('RGBA'),'reuse',source.relative_to(R).as_posix())
for state in ['dark','bright']:
 im=blank((240,48));d=ImageDraw.Draw(im);c=(100,199,231,245) if state=='dark' else (57,80,86,65)
 for x in range(8,229,20):
  y=24+round(math.sin(x/32)*6);d.line([(x,y+3),(x+9,y),(x+14,y-4)],fill=c,width=2)
 save('ink-route-'+state,im)
im=blank((40,40));d=ImageDraw.Draw(im);pts=[]
for i in range(95):
 t=i/12;r=1+i/7;pts.append((20+int(math.cos(t)*r),20+int(math.sin(t)*r)))
d.line(pts,fill='#9caeaa',width=2);save('swirl-memory-scratch',im)
# Generated scene stays explicitly scenic, never advertised as a tile or collision map.
src=B/'sources/station-original.png'
if src.exists():save('station-scene-base',Image.open(src).convert('RGBA').resize((640,360),Image.Resampling.NEAREST),'generated','sources/station-original.png')
def scene(name,bright=False):
 im=sprites['station-scene-base'].copy();im=ImageEnhance.Brightness(im).enhance(.78 if bright else .48)
 d=ImageDraw.Draw(im);d.rectangle((30,190,610,278),fill='#34494f' if bright else '#1f343e');d.line((30,278,610,278),fill='#627773',width=3)
 def put(n,x,y):im.alpha_composite(sprites[n],(x,y))
 end=name=='end-corridor';relay=name=='latched-relay';sent=name=='initial-call'
 for x in range(122,510,62):put('tube-straight',x,113)
 put('tube-mouth',104,113);put('tube-elbow',500,113)
 put('root-cable-flow' if sent else 'root-cable-arrived',80,158);put('call-sent' if sent else 'call-arrived',59,169)
 put('pressure-empty',247,176)
 # A has been released after the brace is fitted; B is the next active relay.
 if relay:
  put('call-arrived',315,169);put('root-cable-arrived',338,158);put('pressure-occupied',455,176)
 if end or name=='ink-route':
  put('call-arrived',315,169);put('root-cable-arrived',338,158);put('pressure-empty' if end else 'pressure-occupied',455,176)
 put('door-closed' if sent else 'door-open',204,200);put('latch-unlatched' if sent else 'latch-latched',273,239)
 if not sent:put('door-held-overlay',204,200)
 put('door-open' if end or relay or name=='ink-route' else 'door-closed',485,200)
 if end:put('door-held-overlay',485,200);put('latch-latched',552,239)
 put('ink-route-bright' if bright else 'ink-route-dark',288,222);put('swirl-memory-scratch',545,149)
 lumo=Image.open(R/'src/assets/lumo_0.png').convert('RGBA');im.alpha_composite(lumo,(158,111) if sent else (464,150) if not end else (546,210))
 nhinh=Image.open(R/'assets/character/nhinh_downright_lantern_on_0.png' if bright else R/'assets/character/nhinh_downright_lantern_off_0.png').convert('RGBA');im.alpha_composite(nhinh,(108,223) if sent else (308,228) if relay else (571,229))
 d=ImageDraw.Draw(im);d.rectangle((8,8,632,31),fill='#10222b');d.text((16,15),'LEVEL 05 / '+name+' / offline art study',fill='#d9dcc5');im.save(P/(name+('-bright' if bright else '-dark')+'-640x360.png'))
if src.exists():
 for n in ['initial-call','latched-relay','end-corridor']:scene(n)
 scene('ink-route',False);scene('ink-route',True)
contact=Image.new('RGBA',(640,360),'#182b34');d=ImageDraw.Draw(contact)
for i,(n,im) in enumerate([(n,im) for n,im in sprites.items() if n!='station-scene-base']):
 x=(i%4)*160;y=(i//4)*58
 if im.width>150:im=im.resize((144,29),Image.Resampling.NEAREST)
 if im.height>42:im=im.resize((int(im.width*42/im.height),42),Image.Resampling.NEAREST)
 contact.alpha_composite(im,(x+3,y));d.text((x+3,y+43),n,fill='#d6dac6')
contact.save(P/'contact-layout-640x360.png')
# Native sheet preserves every pixel, including full 240px route and 88px doors.
native=Image.new('RGBA',(800,740),'#182b34');d=ImageDraw.Draw(native)
for i,(n,im) in enumerate([(n,im) for n,im in sprites.items() if n!='station-scene-base']):
 x=(i%3)*265;y=(i//3)*92;native.alpha_composite(im,(x+3,y));d.text((x+70,y+65),n,fill='#d6dac6')
native.save(P/'states-native-1x.png');native.resize((1600,1480),Image.Resampling.NEAREST).save(P/'states-nearest-2x.png')
(B/'asset-map.json').write_text(json.dumps(rows,indent=2)+'\n')
checks=[]
for row in rows:
 p=R/row['file'];im=Image.open(p);a=im.getchannel('A'); transparent=row['kind']!='generated'
 checks.append(dict(file=row['file'],dimensions=list(im.size),mode=im.mode,path_exists=p.exists(),nonempty=bool(a.getbbox()),has_transparency=a.getextrema()[0]==0,sha256=sha(p),status='PASS' if im.mode=='RGBA' and list(im.size)==row['size'] and a.getbbox() and (not transparent or a.getextrema()[0]==0) else 'FAIL'))
(B/'validation.json').write_text(json.dumps(dict(command='python assets/levels/05-a-path-for-two/prepare_assets.py',checks=checks,previews=[dict(file=p.relative_to(R).as_posix(),dimensions=list(Image.open(p).size),sha256=sha(p)) for p in sorted(P.glob('*.png'))],scenario_sha256=sha(R/'docs/scenario/05-a-path-for-two.md'),runtime='NOT_RUN',visual='pending inspection'),indent=2)+'\n')
sources=[src,R/'src/assets/lumo_0.png',R/'assets/character/nhinh_downright_lantern_on_0.png',R/'assets/character/nhinh_downright_lantern_off_0.png',R/'assets/levels/shared/mechanisms/latch-west-unlatched.png',R/'assets/levels/shared/mechanisms/latch-west-latched.png',Path(__file__)]
(B/'provenance.json').write_text(json.dumps([dict(path=p.relative_to(R).as_posix(),sha256=sha(p)) for p in sources if p.exists()],indent=2)+'\n')
print(json.dumps(dict(exports=len(rows),checks_passed=sum(c['status']=='PASS' for c in checks),previews=len(list(P.glob('*.png'))))))
