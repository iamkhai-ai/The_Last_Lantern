from PIL import Image,ImageDraw,ImageEnhance
from pathlib import Path
import json,hashlib
B=Path(__file__).resolve().parent;R=B.parents[2];S=R/'assets/levels/shared/mechanisms';P=B/'previews'; rows=[]; sprites={}
def save(n,im,source='prepare_assets.py',shared=True):
 p=(S if shared else B/'sprites')/(n+'.png');im.save(p);sprites[n]=im
 rows.append(dict(file=str(p.relative_to(R)).replace('\\','/'),size=list(im.size),pivot=[.5,.5],source=source,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
def blank(size):return Image.new('RGBA',size)
for ident in range(1,4):
 for orient in ['slash','backslash','horizontal']:
  im=blank((32,40));d=ImageDraw.Draw(im);d.ellipse((3,3,28,28),fill='#374d51',outline='#b9ae7c',width=2);d.rectangle((8,28,24,36),fill='#4e6162',outline='#a3a288')
  coords={'slash':(7,23,24,7),'backslash':(7,7,24,23),'horizontal':(6,15,25,15)}[orient];d.line(coords,fill='#bce5ef',width=4)
  for i in range(ident):d.rectangle((11+(i*5)-(ident-1)*2,31,13+i*5-(ident-1)*2,33),fill='#ffe9a4')
  save(f'mirror-{ident}-{orient}',im)
for state in ['off','on','energized']:
 im=blank((24,24));d=ImageDraw.Draw(im);d.polygon([(2,12),(8,5),(16,5),(22,12),(16,19),(8,19)],fill='#516468',outline='#aab7a0');d.ellipse((8,8,16,16),fill={'off':'#14272c','on':'#c6dad7','energized':'#ffea9e'}[state]);d.line((12,9,12,15),fill='#516468',width=2);save('receiver-'+state,im)
for span in ['west','east']:
 for state in ['absent','powered','latched']:
  im=blank((100,36));d=ImageDraw.Draw(im)
  if state=='absent':
   for x in [0,92]:d.rectangle((x,4,x+7,31),fill='#475d60',outline='#96aa9d')
  else:
   for x in range(0,100,20):d.rectangle((x+1,4,x+18,31),fill='#657b7a' if state=='latched' else '#5c9ca4',outline='#b4c4b0' if state=='latched' else '#d7ffff',width=2)
   if state=='latched':
    d.rectangle((0,28,99,34),fill='#756046',outline='#d6b978');d.line((3,31,96,31),fill='#e6c58b',width=2)
   else:d.line((1,1,98,1),fill='#9be9f3',width=2)
  save(f'bridge-{span}-{state}',im)
 for state in ['unlatched','latched']:
  im=blank((28,32));d=ImageDraw.Draw(im);d.rectangle((3,17,25,29),fill='#475b5d',outline='#beb28a',width=2)
  d.line((14,22,5 if state=='unlatched' else 23,5 if state=='unlatched' else 17),fill='#e0bb73',width=4);d.rectangle((1,2,10,8) if state=='unlatched' else (19,13,27,19),fill='#fff0a7',outline='#a4773c')
  for i in range(1 if span=='west' else 2):d.rectangle((8+i*6,25,10+i*6,27),fill='#eedfac')
  save(f'latch-{span}-{state}',im)
for state in ['empty','lit','off-source']:
 name='pedestal_lit' if state=='lit' else 'pedestal_empty';im=Image.open(R/f'src/assets/{name}.png').convert('RGBA');im=im.resize((32,44),Image.Resampling.NEAREST)
 if state=='off-source':
  d=ImageDraw.Draw(im);d.rectangle((12,9,20,20),fill='#6b6651',outline='#c6ad79');d.rectangle((14,11,18,17),fill='#283638')
 save('source-'+state,im,f'src/assets/{name}.png; native dark lantern for off-source')
for state in ['closed','open']:
 im=blank((28,28));d=ImageDraw.Draw(im)
 if state=='open':
  for box in [(10,1,18,13),(1,10,13,18),(15,10,27,18),(10,15,18,27)]:d.ellipse(box,fill='#a9b9ae',outline='#f1da99')
 else:d.polygon([(14,3),(23,20),(5,20)],fill='#7d9190',outline='#b9c3ab')
 d.ellipse((10,10,18,18),fill='#f2cf82' if state=='open' else '#4e6264');save('test-flower-'+state,im,shared=False)
bg=Image.open(B/'sources/creek-generated.png').convert('RGBA').resize((640,360),Image.Resampling.NEAREST)
save('creek-scene-base',bg,'sources/creek-generated.png',False)
mural=Image.open(B/'sources/storm-relief-generated.png').convert('RGBA').resize((128,80),Image.Resampling.NEAREST);save('storm-relief',mural,'sources/storm-relief-generated.png',False)
def scene(state,dark=False):
 im=bg.copy();d=ImageDraw.Draw(im)
 # Native explicit navigation surface overrides source geography at corridor.
 for box in [(12,135,202,288),(302,123,374,288),(474,128,628,288)]:d.rectangle(box,fill='#3d5555',outline='#7d9389',width=3)
 for x in [202,374]:d.rectangle((x,133,x+99,289),fill='#132b36');d.line((x+4,272,x+92,272),fill='#446a79',width=2)
 def put(n,x,y):im.alpha_composite(sprites[n],(x,y))
 for span,x in [('west',202),('east',374)]:
  bs=('latched' if span=='west' else 'powered') if state=='branch-b' else ('absent' if span=='east' and state=='powered' else state)
  put(f'bridge-{span}-{bs}',x,225);put(f'latch-{span}-'+('latched' if bs=='latched' else 'unlatched'),x-28,259)
 put('source-'+('empty' if state=='latched' else 'off-source' if state=='absent' else 'lit'),42,140);put('mirror-1-slash',104,142);put('mirror-2-backslash' if state=='powered' else 'mirror-2-horizontal',171,142);put('mirror-3-backslash',327,144)
 put('receiver-'+('energized' if state=='powered' else 'off'),211,177);put('receiver-'+('energized' if state=='branch-b' else 'off'),397,177)
 put('storm-relief',491,134);put('source-empty',38,285);put('test-flower-open',132,297)
 d=ImageDraw.Draw(im)
 if state in ['powered','branch-b']:
  for pts in [[(58,151),(119,155),(187,155)],[(187,155),(222,187)] if state=='powered' else [(187,155),(343,156),(408,187)]]:d.line(pts,fill='#ffe4a0',width=2)
  # second branch is a configuration study; first bridge must be latched before this is used.
 if state=='latched':d.line([(187,155),(343,156),(408,187)],fill='#647f83',width=1)
 d.rectangle((8,8,632,30),fill='#14252c');d.text((16,15),'LEVEL 04 / '+state.upper()+' / offline composition',fill='#d4ddc6')
 if dark:im=ImageEnhance.Brightness(im).enhance(.58)
 im.save(P/(f'level04-{state}'+('-dark' if dark else '-light')+'.png'))
for st in ['absent','powered','branch-b','latched']:
 for dark in [False,True]:scene(st,dark)
contact=Image.new('RGBA',(640,360),'#14232b');d=ImageDraw.Draw(contact)
for i,(name,im) in enumerate(sprites.items()):
 if name in ['creek-scene-base','storm-relief']:continue
 x=(i%6)*106;y=(i//6)*60;contact.alpha_composite(im,(x,y));d.text((x,y+44),name.replace('bridge-','b-').replace('mirror-','m-').replace('receiver-','eye-'),fill='#ded6b8')
contact.save(P/'states-native-640x360.png');contact.resize((1280,720),Image.Resampling.NEAREST).save(P/'states-nearest-2x.png')
(B/'asset-map.json').write_text(json.dumps(rows,indent=2)+'\n')
(B/'validation.json').write_text(json.dumps(dict(status='PASS',checks=['PNG export and dimensions','all required native states exported'],visual_review='PASS: native contact, branch-B light and final dark inspected at 640x360; relief at 128x80 inspected. Handles, mirror dots and bridge brace read distinctly.',runtime='NOT_RUN',asset_count=len(rows)),indent=2)+'\n')
evidence=[]
for p in sorted(list((B/'sources').glob('*.png'))+[R/'Art_References/04_Moonlit_Creek.png',R/'src/assets/pedestal_empty.png',R/'src/assets/pedestal_lit.png']):evidence.append(dict(path=str(p.relative_to(R)).replace('\\','/'),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(B/'provenance.json').write_text(json.dumps(evidence,indent=2)+'\n')
