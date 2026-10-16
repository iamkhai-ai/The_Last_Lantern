from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import json, hashlib, math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'; SH=R/'assets/levels/shared/beam-splitter'
for p in [S,P,SH]: p.mkdir(exist_ok=True)
rows=[]; sprites={}; refs=[]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p): return p.relative_to(R).as_posix()
def blank(size): return Image.new('RGBA',size)
def save(n,im,source='prepare_assets.py',kind='native',shared=False):
 p=(SH if shared else S)/(n+'.png'); im.save(p); sprites[n]=im
 rows.append(dict(file=rel(p),proposed_key='tower_'+n.replace('-','_'),state=n,size=list(im.size),pivot=[.5,.5],source=source,kind=kind,sha256=sha(p)))
def reuse(n,p):
 sprites[n]=Image.open(p).convert('RGBA'); refs.append(dict(key=n,file=rel(p),size=list(sprites[n].size),pivot=[.5,.5],kind='reuse-reference',sha256=sha(p)))
for n in ['source-lit','source-empty','source-off-source','receiver-off','receiver-on']:
 reuse(n,R/'assets/levels/shared/mechanisms'/(n+'.png'))
for identity in [1,2]:
 for angle in ['slash','backslash','horizontal']:
  reuse('G'+str(identity)+'-'+angle,R/'assets/levels/shared/mechanisms'/('mirror-'+str(identity)+'-'+angle+'.png'))
for n in ['call-idle','call-sent','call-arrived','pressure-empty','pressure-occupied','tube-straight','tube-mouth','tube-elbow']:
 reuse(n,R/'assets/levels/05-a-path-for-two/sprites'/(n+'.png'))
reuse('hope',R/'src/assets/crystal_hope.png'); reuse('lumo',R/'src/assets/lumo_0.png')
reuse('nhinh',R/'assets/character/nhinh_downright_lantern_off_0.png')
# New reusable prism silhouette is not a mirror. Two output ports have separate origins.
for live in [False,True]:
 im=blank((48,48));d=ImageDraw.Draw(im)
 d.rectangle((5,36,42,44),fill='#485f65',outline='#97a79f')
 d.polygon([(24,3),(5,34),(42,34)],fill='#68858e' if live else '#344b59',outline='#c2d6d0')
 d.line([(24,3),(24,30),(5,34)],fill='#c4eeea' if live else '#6e8b92',width=2)
 d.line((24,30,42,34),fill='#e5d5ae' if live else '#6e8b92',width=2)
 for x,c in [(7,'#8fe6ed'),(39,'#eedcaf')]:d.rectangle((x-2,28,x+2,32),fill=c if live else '#516c76')
 save('prism-receiving' if live else 'prism-dark',im,shared=True)
for direction in ['A','B','splitter']:
 im=blank((40,48));d=ImageDraw.Draw(im);d.rectangle((5,34,35,45),fill='#526970',outline='#a2b5ab');d.ellipse((5,6,35,34),fill='#2c4653',outline='#b5d4d2',width=2)
 end={'A':(34,9),'B':(34,31),'splitter':(36,20)}[direction];d.line((20,20,*end),fill='#e9d9a9',width=3)
 d.ellipse((17,17,23,23),fill='#e9d9a9');d.text((13,36),'G0',fill='#eef2d6');save('G0-to-'+direction,im)
for identity in ['A','B','C']:
 for live in [False,True]:
  im=blank((40,40));d=ImageDraw.Draw(im);d.ellipse((2,2,37,37),fill='#1e3541',outline='#e7d6a4' if live else '#779397',width=3)
  for a in range(0,360,60):
   t=math.radians(a);x=20+int(15*math.cos(t));y=20+int(15*math.sin(t));d.rectangle((x-2,y-2,x+2,y+2),fill='#e7d6a4' if live else '#59717b')
  d.text((17,15),identity,fill='#fff4cf' if live else '#91aaa9')
  if live:d.line([(11,27),(17,31),(29,22)],fill='#faf0bf',width=2)
  save('ring-'+identity+('-on' if live else '-off'),im)
for live in [False,True]:
 im=blank((104,28));d=ImageDraw.Draw(im);d.rectangle((1,2,102,25),fill='#233c46',outline='#b6c2ad')
 for i,c in enumerate('ABC'):d.text((8+i*25,9),c,fill='#f1dfa3' if live else '#7d979a')
 if live:d.line([(79,14),(85,20),(98,7)],fill='#f5e9b2',width=3)
 else:d.line((82,14,96,14),fill='#779398',width=3)
 save('all-currently-powered' if live else 'waiting-for-live-circuits',im)
for held in [False,True]:
 im=blank((40,48));d=ImageDraw.Draw(im);d.polygon([(4,43),(10,28),(29,28),(36,43)],fill='#4c6268',outline='#9bab9d')
 end=(32,29) if held else (11,7);d.line((20,34,*end),fill='#d6bf7e',width=5);d.rectangle((end[0]-5,end[1]-3,end[0]+5,end[1]+3),fill='#f2d593')
 if held:d.rectangle((12,38,28,42),fill='#d9bd75')
 save('return-flow-held' if held else 'return-flow-waiting',im)
for opened in [False,True]:
 im=blank((80,104));d=ImageDraw.Draw(im);d.rectangle((9,13,70,91),fill='#172e38');d.rectangle((3,8,13,96),fill='#6a7e80',outline='#a6b1a0');d.rectangle((67,8,77,96),fill='#6a7e80',outline='#a6b1a0');d.rectangle((3,4,77,18),fill='#81918a');d.rectangle((9,92,71,100),fill='#81918a')
 if not opened:
  for x in [20,32,44,56]:d.line((x,20,x,90),fill='#a7c2bb',width=3)
 else:d.rectangle((16,19,64,27),fill='#8aa29c')
 save('chamber-open' if opened else 'chamber-closed',im)
im=blank((80,104));d=ImageDraw.Draw(im)
for x in [20,32,44,56]:d.line((x,20,x,90),fill='#a7c2bb',width=3)
save('chamber-grille-overlay',im)
save('hope-collected',blank(sprites['hope'].size),kind='intentional-empty-state')
for state in ['up','down']:
 im=blank((56,112));d=ImageDraw.Draw(im);d.rectangle((18,3,37,106),fill='#2c535d',outline='#8ca8a5');d.rectangle((24,3,31,106),fill='#4e9fae')
 for y in [22,53,84]:
  pts=[(22,y+5),(28,y-3),(34,y+5)] if state=='up' else [(22,y-3),(28,y+5),(34,y-3)]
  d.line(pts,fill='#c9f6ea',width=2)
 d.rectangle((8,99,47,109),fill='#6e8c8b');save('fountain-'+state,im)
for mode in ['intake','outflow']:
 im=blank((112,32));d=ImageDraw.Draw(im);d.line((4,15,106,15),fill='#416c78',width=12);d.line((4,15,106,15),fill='#73c4d3',width=4)
 for x in [24,54,84]:d.line([(x-4,10),(x+3,15),(x-4,20)] if mode=='intake' else [(x+4,10),(x-3,15),(x+4,20)],fill='#dbf8e8',width=2)
 save('tower-'+mode,im)
for dim in [False,True]:
 im=blank((72,72));d=ImageDraw.Draw(im);d.rectangle((24,13,47,57),fill='#364f5d',outline='#b6bba2');d.polygon([(21,14),(35,3),(50,14)],fill='#8a978a');d.rectangle((28,20,43,49),fill='#92b8b4' if dim else '#f9f7d9');d.rectangle((16,57,55,64),fill='#7e918a');save('tower-lamp-dim' if dim else 'tower-lamp-white',im)
for opened in [False,True]:
 im=blank((88,32));d=ImageDraw.Draw(im);d.rectangle((2,2,85,29),fill='#5c7374',outline='#9aac9f');d.rectangle((8,7,79,24),fill='#102731' if opened else '#43595f')
 if opened:d.rectangle((18,12,67,22),fill='#beae7a');d.line((24,15,60,15),fill='#715c3f',width=2)
 else:d.line((38,16,50,16),fill='#c8b57d',width=2)
 save('record-compartment-open' if opened else 'record-compartment-closed',im)
im=blank((160,72));d=ImageDraw.Draw(im);d.rectangle((2,2,157,69),fill='#273d47',outline='#bcac7a');d.rectangle((8,8,151,63),fill='#172b36')
for x,h in [(18,6),(26,13),(34,8),(42,21),(50,14),(58,7),(66,19),(74,11),(82,5),(90,18),(98,10),(106,7),(114,16),(122,9),(130,4)]:d.line((x,36-h,x,36+h),fill='#b6c8b2',width=3)
save('voice-record-panel',im)
save('tower-scene-base',Image.open(B/'sources/tower-original.png').convert('RGBA').resize((640,360),Image.Resampling.NEAREST),'sources/tower-original.png','generated')
win=B/'sources/window-original.png'
if win.exists():
 im=Image.open(win).convert('RGBA');box=im.getchannel('A').getbbox();im=im.crop(box);im.thumbnail((112,112),Image.Resampling.NEAREST);out=blank((112,112));out.alpha_composite(im,((112-im.width)//2,112-im.height));save('window-faded-red-scarf',out,'sources/window-original.png','generated-cutout')
def put(im,n,x,y): im.alpha_composite(sprites[n],(x,y))
def line(d,pts,c='#ecdfb0'):
 d.line(pts,fill='#304c54',width=6);d.line(pts,fill=c,width=2)
def main(name,route='splitter',a=False,b=False,c=False,returned=False,collected=False):
 im=ImageEnhance.Brightness(sprites['tower-scene-base']).enhance(.55);d=ImageDraw.Draw(im)
 # Scenic floor flattened only in the explanatory control area; fixed routes never baked into assets.
 d.rounded_rectangle((49,128,461,297),radius=12,fill='#203640',outline='#526b6c')
 src=(102,214);g0=(161,211);pr=(242,211);g1=(309,158);g2=(309,260);A=(403,158);BB=(403,260)
 if not collected:line(d,[src,g0])
 if route=='A' and not collected:line(d,[g0,(220,158),A])
 if route=='B' and not collected:line(d,[g0,(220,260),BB])
 if route=='splitter' and not collected:
  line(d,[g0,pr]);line(d,[(225,217),(267,158),g1],'#9ce4ed');line(d,[(257,217),(267,260),g2],'#edd7a0')
  if a:line(d,[g1,A],'#9ce4ed')
  if b:line(d,[g2,BB],'#edd7a0')
 put(im,'source-empty' if collected else 'source-lit',82,194);put(im,'G0-to-'+route,141,191)
 put(im,'prism-receiving' if route=='splitter' and not collected else 'prism-dark',218,187)
 put(im,'G1-slash' if a else 'G1-horizontal',293,142);put(im,'G2-backslash' if b else 'G2-horizontal',293,244)
 put(im,'receiver-on' if a else 'receiver-off',388,146);put(im,'receiver-on' if b else 'receiver-off',388,248)
 d=ImageDraw.Draw(im)
 for txt,x,y in [('G1',294,125),('G2',294,288),('A',422,153),('B',422,256),('C / LUMO',472,298)]:d.text((x,y),txt,fill='#e0dfc8')
 for i,k in enumerate('ABC'):put(im,'ring-'+k+('-on' if [a,b,c][i] else '-off'),330+i*43,45)
 put(im,'all-currently-powered' if a and b and c else 'waiting-for-live-circuits',339,91)
 for x in [326,388,450]:put(im,'tube-straight',x,113)
 put(im,'tube-mouth',308,113);put(im,'tube-elbow',505,113)
 put(im,'call-arrived' if c else 'call-idle',466,223);put(im,'pressure-occupied' if c else 'pressure-empty',514,271)
 if c:put(im,'lumo',525,248)
 put(im,'chamber-open',537,152)
 if not collected:put(im,'hope',556,177)
 if not returned:put(im,'chamber-grille-overlay',537,152)
 put(im,'return-flow-held' if returned else 'return-flow-waiting',489,169)
 put(im,'fountain-down' if returned else 'fountain-up',22,175);put(im,'tower-outflow' if returned else 'tower-intake',3,290)
 put(im,'tower-lamp-dim' if returned else 'tower-lamp-white',216,36)
 if 'window-faded-red-scarf' in sprites:put(im,'window-faded-red-scarf',506,28)
 put(im,'record-compartment-open' if collected else 'record-compartment-closed',519,134)
 put(im,'nhinh',166,263)
 d=ImageDraw.Draw(im);d.rectangle((6,6,633,27),fill='#10232d');d.text((13,12),'LEVEL 06 / '+name+' / offline art study',fill='#e1dec8')
 d.text((12,326),'TO TREE / DOWN' if returned else 'TOWER INTAKE / UP',fill='#d3e5d1')
 if collected:put(im,'voice-record-panel',283,282)
 im.save(P/(name+'-640x360.png'))
main('direct-A',route='A',a=True)
main('direct-B',route='B',b=True)
main('C-only',route='splitter',c=True)
main('branch-A-only',a=True)
main('branch-B-only',b=True)
main('AB-live-C-empty',a=True,b=True)
main('ABC-simultaneous',a=True,b=True,c=True)
main('condition-lost-waiting',a=True,b=True,c=False)
main('after-return-flow',a=True,b=True,c=True,returned=True)
main('after-collected-record',returned=True,collected=True)
def bench(live):
 im=ImageEnhance.Brightness(sprites['tower-scene-base']).enhance(.48);d=ImageDraw.Draw(im);d.rectangle((61,102,578,278),fill='#263d46',outline='#738a87',width=3)
 if live:
  for pts,col in [([(112,197),(210,197),(300,197)],'#eadcae'),([(283,203),(372,139),(456,139)],'#9ce4ed'),([(315,203),(372,244),(456,244)],'#edd7a0')]:line(d,pts,col)
 else:line(d,[(112,197),(210,197),(213,253)])
 put(im,'source-lit',92,183);put(im,'G0-to-splitter' if live else 'G0-to-B',190,177);put(im,'prism-receiving' if live else 'prism-dark',276,173)
 put(im,'G1-slash',356,123);put(im,'G2-backslash',356,228);put(im,'receiver-on' if live else 'receiver-off',445,128);put(im,'receiver-on' if live else 'receiver-off',445,234);put(im,'nhinh',162,282)
 d=ImageDraw.Draw(im);d.text((68,110),'SAFE TEST BENCH / NO CONNECTION TO CRYSTAL CHAMBER',fill='#e4dfc4');d.text((68,266),'TWO LIVE BRANCHES' if live else 'INPUT MOVED AWAY / BOTH EYES DARK',fill='#e4dfc4');im.save(P/(('test-bench-powered' if live else 'test-bench-input-away')+'-640x360.png'))
bench(True);bench(False)
native=Image.new('RGBA',(720,math.ceil((len(rows)-1)/4)*132),'#172e38');d=ImageDraw.Draw(native);i=0
for row in rows:
 n=row['state'];im=sprites[n]
 if n=='tower-scene-base':continue
 x=(i%4)*180;y=(i//4)*132;native.alpha_composite(im,(x+8,y+3));d.text((x+4,y+116),n,fill='#e0ddc6');i+=1
native.save(P/'states-native-1x.png');native.resize((native.width*2,native.height*2),Image.Resampling.NEAREST).save(P/'states-nearest-2x.png')
(B/'asset-map.json').write_text(json.dumps(dict(exports=rows,reuse_references=refs),indent=2)+'\n')
(SH/'metadata.json').write_text(json.dumps(dict(origin='Level06 task09',purpose='Reusable two-output prism for Levels06/08/09/10; no latched power memory',source=rel(Path(__file__)),source_sha256=sha(Path(__file__)),ports=dict(input=[24,30],left=[7,30],right=[39,30]),exports=[r for r in rows if '/shared/' in r['file']]),indent=2)+'\n')
checks=[]
for row in rows:
 p=R/row['file'];im=Image.open(p);a=im.getchannel('A');empty=row['kind']=='intentional-empty-state';opaque=row['state']=='tower-scene-base'
 ok=im.mode=='RGBA' and list(im.size)==row['size'] and (empty or a.getbbox()) and (opaque or a.getextrema()[0]==0) and sha(p)==row['sha256']
 checks.append(dict(file=row['file'],status='PASS' if ok else 'FAIL',size=list(im.size),alpha_extrema=a.getextrema(),sha256=sha(p)))
previews=[dict(file=rel(p),size=list(Image.open(p).size),sha256=sha(p)) for p in sorted(P.glob('*.png'))]
(B/'validation.json').write_text(json.dumps(dict(command='python assets/levels/06-the-sleepless-tower/prepare_assets.py',checks=checks,reuse_paths_and_hashes='PASS' if all((R/r['file']).exists() and sha(R/r['file'])==r['sha256'] for r in refs) else 'FAIL',previews=previews,scenario_sha256=sha(R/'docs/scenario/06-the-sleepless-tower.md'),visual='pending inspection',engine='NOT_RUN'),indent=2)+'\n')
inputs=[B/'sources/tower-original.png',win,Path(__file__),B/'generation-prompts.json',R/'docs/scenario/06-the-sleepless-tower.md']+[R/r['file'] for r in refs]
(B/'provenance.json').write_text(json.dumps(dict(dispatch='Parent reports requested gpt-6.1-sol / low accepted; worker-resolved identity and image backend not exposed',sources=[dict(path=rel(p),sha256=sha(p)) for p in inputs if p.exists()]),indent=2)+'\n')
print(json.dumps(dict(exports=len(rows),reuse_references=len(refs),checks_passed=sum(c['status']=='PASS' for c in checks),previews=len(previews))))
