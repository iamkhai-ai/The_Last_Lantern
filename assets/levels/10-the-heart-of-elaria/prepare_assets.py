"""Task14 offline art assembly. Pillow only; no engine state implementation."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, hashlib, math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'; N=Image.Resampling.NEAREST
S.mkdir(exist_ok=True); P.mkdir(exist_ok=True)
exports=[]; refs={}; rows=[]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p): return p.relative_to(R).as_posix()
def dump(n,v): (B/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def load(p):
 p=R/p; im=Image.open(p).convert('RGBA'); refs[rel(p)]={'file':rel(p),'size':list(im.size),'sha256':sha(p)}; return im
def blank(w=640,h=360): return Image.new('RGBA',(w,h))
def save(n,im,kind='native-state-layer',pivot=(.5,.5)):
 p=S/(n+'.png'); im.save(p); exports.append({'file':rel(p),'key':'heart_'+n.replace('-','_'),'size':list(im.size),'pivot':pivot,'kind':kind,'sha256':sha(p)}); return im
F=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',11)
def label(im,xy,t,c='#e6e7d3'): ImageDraw.Draw(im).text(xy,t,font=F,fill=c)
def put(im,a,xy,size=None): im.alpha_composite(a.resize(size,N) if size else a,xy)
shared='assets/levels/shared/'; l5='assets/levels/05-a-path-for-two/sprites/'; l8='assets/levels/08-ruins-of-two-halves/sprites/'; sh=shared+'characters/the-shadow/sprites/'
A={k:load(p) for k,p in {'source':shared+'mechanisms/source-lit.png','source-off':shared+'mechanisms/source-off-source.png','source-empty':shared+'mechanisms/source-empty.png','G0':'assets/levels/06-the-sleepless-tower/sprites/G0-to-B.png','mirror':shared+'mechanisms/mirror-1-slash.png','prism':shared+'beam-splitter/prism-receiving.png','sun':l8+'lock-sun-on.png','sun-off':l8+'lock-sun-off.png','moon':l8+'lock-moon-covered.png','moon-lit':l8+'lock-moon-lit.png','statue':l8+'statue-notch-0.png','narrow':l8+'statue-notch-1.png','shadow':l8+'shadow-notch-0.png','splitter':l8+'fixed-three-route-splitter-on.png','C':l5+'pressure-occupied.png','C-empty':l5+'pressure-empty.png','membrane':l5+'door-open.png','membrane-closed':l5+'door-closed.png','pipe':l5+'tube-straight.png','lumo':'src/assets/lumo_0.png','nhinh':'assets/character/nhinh_downright_lantern_on_0.png','nhinh-off':'assets/character/nhinh_downright_lantern_off_0.png'}.items()}
crystals=[load('src/assets/crystal_'+n+'.png') for n in ['memory','hope','balance']]
colors=['#efc76d','#70ccea','#bb8bef']; names=['memory','hope','balance']
orig=load(rel(B/'sources/mother-tree-original.png')); base=orig.resize((640,360),N)
save('sanctuary-base',base,'generated-source-normalized')
# Rectangular background crop modules are explicitly scenic patches, not alpha cutouts.
save('mother-tree-trunk-patch',base.crop((220,0,420,178)),'source-crop-scenic-patch',(.5,1))
save('mother-tree-canopy-patch',base.crop((90,0,550,91)),'source-crop-scenic-patch',(.5,1))
# Exact channels and roots use full-scene transparent layers, preventing registration drift.
core=(320,115); ends=[(158,192),(320,200),(480,192)]
paths=[[(158,192),(204,178),(246,152),core],[(320,200),(330,173),(320,146),core],[(480,192),(432,177),(388,151),core]]
roots={}
for i,n in enumerate(names):
 for state in ['broken','connected','repaired']:
  im=blank(); d=ImageDraw.Draw(im); pts=paths[i]
  if state=='broken':
   d.line(pts[:2],fill='#745e50',width=8); d.line(pts[2:],fill='#745e50',width=8)
   d.line(pts[:2],fill=colors[i],width=2); d.line((pts[1][0]-4,pts[1][1]+4,pts[1][0]+4,pts[1][1]-4),fill='#d2b69d',width=2)
  else:
   d.line(pts,fill='#5d5149',width=9); d.line(pts,fill=colors[i],width=3)
   if state=='repaired':
    x,y=pts[1];d.rectangle((x-5,y-5,x+5,y+5),outline='#dfd6aa',width=2); d.rectangle((x-2,y-7,x+2,y+7),fill='#9c8259')
  roots[n,state]=save(n+'-root-'+state,im)
 for occupied in [False,True]:
  im=blank(58,64);d=ImageDraw.Draw(im);d.ellipse((2,18,55,62),fill='#1b292f',outline=colors[i],width=2)
  # Approved crystal itself is the exact matching symbol: no new invented rune vocabulary.
  put(im,crystals[i],(20,0),(18,30)); d.line((9,40,15,34,21,40),fill=colors[i],width=2)
  if occupied: put(im,crystals[i],(20,28),(18,30))
  save(n+'-alcove-'+('inserted' if occupied else 'empty'),im)
white=blank();d=ImageDraw.Draw(white)
for pts in [[(220,8),(244,55),core],[(422,8),(399,58),core]]:
 d.line(pts,fill='#576a6b',width=9);d.line(pts,fill='#dcece5',width=3)
 for x,y in pts[1:]:d.polygon([(x-3,y-7),(x+3,y-7),(x,y)],fill='white')
save('old-white-channels-feeding',white)
ret=blank();d=ImageDraw.Draw(ret);d.line((220,8,234,39),fill='#71858a',width=3);d.line((422,8,410,37),fill='#71858a',width=3);save('old-white-channels-retracted',ret)
cores={}
for state in ['waiting','ready','latched','night','dawn']:
 im=blank(58,68);d=ImageDraw.Draw(im);d.ellipse((4,3,53,62),fill='#152b32',outline='#8bafa4',width=3)
 for i,c in enumerate(colors):d.arc((10+i*3,9+i*3,48-i*3,56-i*3),i*120,i*120+100,fill=c,width=3)
 if state=='waiting':d.line((20,37,26,31,32,37,38,31),fill='#657779',width=2)
 if state in ['ready','latched']:d.ellipse((23,26,35,38),fill='#dfdca2')
 if state=='latched':d.rectangle((10,46,47,52),fill='#a68c5e');d.rectangle((26,42,31,57),fill='#dfd6aa')
 cores[state]=save('core-'+state,im)
nodes={}
for state in ['waiting','ready','latched']:
 im=blank(48,32);d=ImageDraw.Draw(im);d.ellipse((1,1,46,30),fill='#304840',outline='#c2d4a4',width=2)
 for i,c in enumerate(colors):d.rectangle((9+i*11,9,15+i*11,15),fill=c if state!='waiting' else '#65716e')
 if state=='latched':d.rectangle((6,20,41,24),fill='#dfbb78');d.rectangle((22,17,26,29),fill='#dfbb78')
 nodes[state]=save('confirmation-root-'+state,im)
dark=blank();put(dark,A['shadow'],(488,207),(64,42));d=ImageDraw.Draw(dark);d.polygon([(498,210),(544,210),(551,248),(488,248)],fill='#101329',outline=colors[2],width=3);save('fixed-dark-pocket-purple-border',dark)
bloom=blank();d=ImageDraw.Draw(bloom)
for r,a in [(44,28),(32,40),(22,64)]: d.ellipse((320-r,115-r,320+r,115+r),fill=(255,238,174,a))
save('temporary-core-bloom-after-retrieval',bloom)
line=blank();d=ImageDraw.Draw(line);d.line((366,272,349,204,320,115),fill='#fff2bf',width=3);d.polygon([(343,187),(353,185),(350,176)],fill='white');save('redundant-carried-lantern-line',line)
# Compact rule reminder: same familiar modules, no extra machine.
bench=blank(124,48);d=ImageDraw.Draw(bench);d.rounded_rectangle((0,0,123,47),4,fill='#334239',outline='#859180')
for a,x in [('mirror',3),('C',35),('moon',66),('sun',96)]:put(bench,A[a],(x,5),(24,30))
save('root-rule-reminder-table',bench)
wheel=blank(96,80);d=ImageDraw.Draw(wheel);d.ellipse((10,2,85,77),fill='#253b4b',outline='#b3b7a4',width=2)
for a in range(0,360,45):
 x=48+int(30*math.cos(math.radians(a)));y=40+int(30*math.sin(math.radians(a)));d.line((48,40,x,y),fill='#768b9c')
d.ellipse((70,34,80,44),fill='#efcb87');d.arc((16,25,42,51),65,295,fill='#bccbea',width=5)
d.line((81,13,91,20,83,28),fill='#c3dfc5',width=2);save('day-night-wheel-resuming',wheel)
# All state study records are current inputs, never accumulated historical activations.
states=[('01-three-empty',dict(insert=0,C=False,route='direct',balance=False)),('02-memory-inserted',dict(insert=1,C=False,route='direct',balance=False)),('03-hope-inserted',dict(insert=2,C=True,route='direct',balance=False)),('04-three-inserted-two-incomplete',dict(insert=3,C=False,route='split',balance=False)),('05-memory-missing',dict(insert=3,C=True,route='wrong-memory',balance=True)),('06-hope-missing',dict(insert=3,C=False,route='split',balance=True)),('07-balance-missing-direct-G0',dict(insert=3,C=True,route='direct',balance=False)),('08-balance-missing-narrow',dict(insert=3,C=True,route='split',balance=False)),('09-all-concurrent-ready',dict(insert=3,C=True,route='split',balance=True)),('10-latched-lamp-on-pedestal',dict(insert=3,C=False,route='none',balance=False,latched=True)),('11-retrieved-on-redundant-overload',dict(insert=3,C=False,route='none',balance=False,latched=True,taken=True)),('12-F-off-night',dict(insert=3,C=False,route='none',balance=False,latched=True,taken=True,off=True,night=True)),('13-off-at-pedestal-alternative',dict(insert=3,C=False,route='none',balance=False,latched=True,off=True,night=True)),('14-dawn-tree',dict(insert=3,C=False,route='none',balance=False,latched=True,taken=True,off=True,dawn=True))]
def scene(n,s):
 im=base.copy();lat=s.get('latched',False);off=s.get('off',False);taken=s.get('taken',False);night=s.get('night',False);dawn=s.get('dawn',False)
 if night: im=Image.alpha_composite(im,Image.new('RGBA',im.size,(5,9,27,115)))
 if dawn: im=Image.alpha_composite(im,Image.new('RGBA',im.size,(226,161,115,36)))
 # Native staging grounds keep small mechanisms distinct from scenic roots.
 d=ImageDraw.Draw(im);d.rounded_rectangle((35,218,606,327),12,fill='#203936',outline='#466158')
 m=s['insert']>=1 and s['C'] and s['route'] in ['direct','split'];h=s['insert']>=2 and s['C'];b=s['insert']==3 and s['route'] in ['split','wrong-memory'] and s['balance']
 live=[m,h,b]; ready=all(live);over=lat and taken and not off
 for i,name in enumerate(names):
  put(im,roots[name,'repaired' if lat else 'connected' if live[i] else 'broken'],(0,0));put(im,Image.open(S/(name+'-alcove-'+('inserted' if s['insert']>i else 'empty')+'.png')).convert('RGBA'),(ends[i][0]-29,ends[i][1]-47))
 put(im,ret if off else white,(0,0));put(im,cores['dawn' if dawn else 'night' if night else 'latched' if lat else 'ready' if ready else 'waiting'],(291,81));put(im,nodes['latched' if lat else 'ready' if ready else 'waiting'],(296,221))
 # G0/source/prism/memory path and Hope-operated membrane.
 for k,xy in [('source-empty' if taken else 'source-off' if off else 'source',(53,264)),('G0',(116,252)),('prism',(205,256)),('mirror',(117,205)),('membrane' if s['C'] or lat else 'membrane-closed',(157,223)),('C' if s['C'] else 'C-empty',(273,285)),('splitter',(438,266)),('statue' if s['balance'] or lat else 'narrow',(500,264)),('sun' if b else 'sun-off',(451,216)),('sun' if b else 'sun-off',(554,216)),('moon' if s['balance'] or lat else 'moon-lit',(506,216))]:put(im,A[k],xy,(28,32) if k in ['splitter','statue','narrow','membrane','membrane-closed'] else None)
 if not lat and not off:
  d=ImageDraw.Draw(im);d.line((77,278,131,278),fill='#fff0c0',width=2)
  if s['route']=='direct':d.line((131,278,131,218,158,190),fill=colors[0],width=2)
  else:
   d.line((131,278,220,278),fill='#fff0c0',width=2);d.line((220,278,220,218,174,218),fill=colors[0],width=2);d.line((220,278,451,278,451,255),fill=colors[2],width=2)
   if s['C'] and s['route']=='split':d.line((174,218,158,190),fill=colors[0],width=2)
   if s['balance']:
    d.line((451,255,465,235),fill=colors[2],width=2);d.line((451,278,568,278,568,235),fill=colors[2],width=2)
 if s['balance'] or lat:put(im,dark,(0,0))
 if lat:
  # Explicit fixed root curtain guards darkness after Lumo leaves; never reads as live pressure.
  d=ImageDraw.Draw(im);d.line((489,207,549,207),fill='#8a7963',width=6);d.rectangle((516,201,522,213),fill='#d7be85')
 if over:
  put(im,bloom,(0,0));put(im,line,(0,0));put(im,dark,(0,0)) # protect purple border and dark pocket after bloom
  for i in [0,1]:ImageDraw.Draw(im).line(paths[i],fill='#fff0ae',width=2)
 put(im,A['nhinh-off' if off else 'nhinh'],(342,260));put(im,A['lumo'],(287,274) if s['C'] else (384,262),(15,15))
 put(im,bench,(39,164));label(im,(42,151),'E · quy tắc đã học')
 label(im,(40,332),n+' · offline state study');label(im,(216,314),'G0');label(im,(298,275),'E');label(im,(272,322),'C · Lumo');label(im,(500,303),'Nhật · Nguyệt · Nhật')
 if night or dawn: put(im,wheel,(536,13))
 if night:
  for x,y in [(230,62),(430,83),(195,137),(410,147)]:ImageDraw.Draw(im).rectangle((x,y,x+1,y+1),fill='#bbdbaa')
 out=P/(n+'-640x360.png');im.save(out);rows.append({'name':n,'inputs':s,'current':dict(memory=m,hope=h,balance=b,ready=ready,latched=lat,overload=over,white_old_channels=not off,crystal_roots_self_hold=lat,lumo_can_leave=lat),'file':rel(out),'sha256':sha(out)})
 return im
studies=[scene(n,s) for n,s in states]
# Transition reuse studies: source paths stay explicit and Shadow fades only at dawn.
for i,k in enumerate(['stillness','dawn-dissolve-1','dawn-dissolve-2','dawn-afterimage','dawn-empty']):
 im=load(sh+'observatory-dawn-scene-base.png').resize((640,360),N);put(im,wheel,(328,70));put(im,load(sh+k+'.png'),(390,170));label(im,(18,335),'Dawn only · wheel resumes · '+k);p=P/('15-dawn-shadow-'+str(i)+'-640x360.png');im.save(p);studies.append(im)
montage=blank();
for p,xy in [('assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png',(0,0)),('assets/levels/04-shattered-moonlit-creek/sprites/creek-scene-base.png',(320,0)),('assets/levels/06-the-sleepless-tower/sprites/tower-scene-base.png',(0,180)),(sh+'observatory-dawn-scene-base.png',(320,180))]:
 put(montage,load(p),xy,(320,180))
montage=Image.alpha_composite(montage,Image.new('RGBA',(640,360),(231,173,140,24)));label(montage,(12,340),'Dawn montage reuse study · moving plants/water/window/wheel require runtime');montage.save(P/'16-dawn-montage-640x360.png');studies.append(montage)
# Final staging uses approved Nhinh pose; seated animation is deliberately deferred to task15.
final=studies[13].copy();d=ImageDraw.Draw(final);d.rectangle((35,218,606,328),fill='#203936');put(final,A['nhinh-off'],(302,246));put(final,A['lumo'],(337,266),(15,15))
leaf=blank(10,10);ImageDraw.Draw(leaf).polygon([(1,7),(3,1),(8,2),(7,6)],fill='#96be76');save('lantern-new-leaf',leaf);put(final,leaf,(328,276));label(final,(52,228),'Final composition proxy: seated pose belongs to task15');label(final,(240,320),'THE LAST DAWN');final.save(P/'17-final-credits-composition-proxy-640x360.png');studies.append(final)
# Native asset contact, then exact nearest 2x. Scene contact also keeps every preview at native size.
contact=Image.new('RGBA',(1280,math.ceil(len(studies)/2)*384),'#111d2b')
for i,im in enumerate(studies):put(contact,im,((i%2)*640,(i//2)*384))
contact.save(P/'contact-scenes-native.png');contact.resize((contact.width*2,contact.height*2),N).save(P/'contact-scenes-2x.png')
small=[e for e in exports if e['size'][0]<640];sheet=Image.new('RGBA',(640,math.ceil(len(small)/4)*210),'#15222c')
for i,e in enumerate(small):
 im=Image.open(R/e['file']).convert('RGBA');x=(i%4)*160;y=(i//4)*210
 if im.width>156 or im.height>170:im.thumbnail((156,170),N)
 put(sheet,im,(x,y+25));label(sheet,(x+2,y+4),Path(e['file']).stem[:25])
sheet.save(P/'contact-assets-native.png');sheet.resize((sheet.width*2,sheet.height*2),N).save(P/'contact-assets-2x.png')
dump('asset-map.json',{'exports':exports,'reuse':list(refs.values()),'pivots':'Normalized center except bottom-centered scenic patches. Full-scene overlays pivot center and position 0,0.','symbols':'Exact approved original crystal silhouettes used as matching alcove emblems; original gold/blue/purple preserved, no invented rune.'})
dump('state-and-layout.json',{'states':rows,'core':core,'alcoves':ends,'root_paths':paths,'fixed_dark_pocket':[488,207,551,248],'overload_rule':'latched AND lantern_retrieved AND lantern_on; bloom starts after retrieval only','off_alternative':'After latch, F at pedestal is valid; old white channels retract, night begins directly, no forced relighting.','save_restore_contract':'Latched state persists. Reload overload: safe pedestal bank, Lumo beside Nhinh, lamp on; F immediately available. Final action saves completion; completed load goes to ending.','controls':'E inserts/confirm/retrieve, F immediate off, existing Lumo call/pressure only, H scenario hints. No timers/damage.'})
requirements=[R/'docs/scenario/10-the-heart-of-elaria.md',R/'tasks/plan.md',R/'tasks/todo.md',B/'generation-prompts.json',Path(__file__)]
dump('provenance.json',{'requirements':[{'file':rel(p),'sha256':sha(p)} for p in requirements],'source_crop_boxes':{'trunk':[220,0,420,178],'canopy':[90,0,550,91]},'source_normalization':'Original nearest resized to 640x360; scenic patches retain background and are not alpha-extracted sprites.','sources':list(refs.values())})
checks=[]
for e in exports:
 im=Image.open(R/e['file']);assert im.mode=='RGBA' and list(im.size)==e['size'] and im.getchannel('A').getbbox();assert sha(R/e['file'])==e['sha256'];checks.append(e['file'])
for r in refs.values():assert (R/r['file']).exists() and sha(R/r['file'])==r['sha256']
for r in rows:
 c=r['current'];assert c['ready']==(c['memory'] and c['hope'] and c['balance']);assert c['overload']==(c['latched'] and r['inputs'].get('taken',False) and not r['inputs'].get('off',False))
assert not rows[9]['current']['overload'] and rows[10]['current']['overload'] and not rows[12]['current']['overload']
preview_checks=[]
for p in P.glob('*.png'):
 im=Image.open(p);assert im.mode=='RGBA' and im.getchannel('A').getbbox();preview_checks.append({'file':rel(p),'size':list(im.size),'sha256':sha(p)})
dump('validation.json',{'technical':'PASS','exports':len(exports),'reuse':len(refs),'preview_checks':preview_checks,'branch_truth_table':'PASS: current conjunction, no historical accumulation; latch self holds; overload only retrieved on; off-at-pedestal no overload','runtime':'NOT_RUN','visual_review':'Pending contact inspection by agent','limits':['Offline staging is not a live optical solver or navigation/collision map.','Tree crop patches retain scenery, not final alpha cutouts.','Final seated pose is task15; proxy uses approved standing pose.','Wheel arrow is animation direction study, no animated runtime supplied.']})
print(json.dumps({'exports':len(exports),'reuse':len(refs),'previews':len(preview_checks),'technical':'PASS'}))
