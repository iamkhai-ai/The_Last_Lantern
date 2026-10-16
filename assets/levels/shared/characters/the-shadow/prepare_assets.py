"""Deterministic crop/composition only; generated raster sources remain unchanged."""
from PIL import Image, ImageDraw
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[5]
B=Path(__file__).resolve().parent
N=Image.Resampling.NEAREST
records=[]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,name,kind='deterministic-export',source=None,extra=None):
 p=B/name;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
 rec={'file':str(p.relative_to(R)).replace('\\','/'),'size':list(im.size),'mode':im.mode,'sha256':sha(p),'kind':kind}
 if source: rec['source']=source
 if extra: rec.update(extra)
 records.append(rec)
def load(p): return Image.open(R/p).convert('RGBA')
src=Image.open(B/'sources/shadow-guardian-original.png').convert('RGBA')
zones=[(50,315),(345,730),(760,1045),(1115,1380),(1515,1760),(1870,2110)]
names=['waiting','shielding','walk-right','turn','stillness','guardian-waiting']
frames={}
for (l,r),name in zip(zones,names):
 crop=src.crop((l,110,r,610));a=crop.getchannel('A').point(lambda v:255 if v>=160 else 0)
 # Keep the single largest connected opaque component; discard generated background specks.
 pix=a.load();seen=set();parts=[]
 for y in range(a.height):
  for x in range(a.width):
   if pix[x,y] and (x,y) not in seen:
    part=[];stack=[(x,y)];seen.add((x,y))
    while stack:
     xx,yy=stack.pop();part.append((xx,yy))
     for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
      if 0<=nx<a.width and 0<=ny<a.height and pix[nx,ny] and (nx,ny) not in seen:seen.add((nx,ny));stack.append((nx,ny))
    parts.append(part)
 mask=Image.new('L',a.size);mp=mask.load()
 for x,y in max(parts,key=len):mp[x,y]=255
 crop.putalpha(mask);box=mask.getbbox();crop=crop.crop(box)
 size=(round(crop.width*54/crop.height),54);crop=crop.resize(size,N)
 # Binary alpha and zero RGB in transparent pixels prevent filtering halos.
 clean=Image.new('RGBA',crop.size);clean.paste(crop,(0,0),crop.getchannel('A'));crop=clean
 canvas=Image.new('RGBA',(48,64));canvas.alpha_composite(crop,((48-crop.width)//2,8))
 frames[name]=canvas
 save(canvas,'sprites/'+name+'.png',source='sources/shadow-guardian-original.png',extra={'pivot_pixels':[24,62],'pivot':[0.5,0.96875],'crop_source_xyxy':[l+box[0],110+box[1],l+box[2],110+box[3]],'alpha_cleanup':'threshold160-largest-connected-component-nearest','state':name})
for name,opacity in [('memory-overlay',155),('dawn-dissolve-1',165),('dawn-dissolve-2',75),('dawn-afterimage',22)]:
 f=frames['guardian-waiting' if name=='memory-overlay' else 'stillness'].copy();f.putalpha(f.getchannel('A').point(lambda v:round(v*opacity/255)))
 frames[name]=f;save(f,'sprites/'+name+'.png',source='sprites/guardian-waiting.png' if name=='memory-overlay' else 'sprites/stillness.png',extra={'pivot_pixels':[24,62],'state':name,'intentional_uniform_alpha':opacity})
empty=Image.new('RGBA',(48,64));save(empty,'sprites/dawn-empty.png',extra={'pivot_pixels':[24,62],'state':'empty-at-dawn-only','intentional_empty':True})
def at(im,frame,foot): im.alpha_composite(frames[frame],(foot[0]-24,foot[1]-62))
def caption(im,text):
 d=ImageDraw.Draw(im);d.rectangle((0,340,640,360),fill=(8,15,22,255));d.text((8,346),'CONCEPT / PROTOTYPE - '+text,fill=(216,213,182,255));return im
room=Image.open(B/'sources/observatory-original.png').convert('RGBA').resize((640,360),N)
save(room,'sprites/observatory-memory-scene-base.png',source='sources/observatory-original.png')
# Exact reused scarf visual, separately overlaid rather than repainted.
scarf=load('assets/levels/06-the-sleepless-tower/sprites/window-faded-red-scarf.png')
scarfonly=scarf.crop((68,64,85,99))
sp=scarfonly.load()
for sy in range(scarfonly.height):
 for sx in range(scarfonly.width):
  rr,gg,bb,aa=sp[sx,sy]
  if not (rr>45 and rr>gg*1.2 and rr>bb*1.2):sp[sx,sy]=(0,0,0,0)
save(scarfonly,'sprites/faded-red-scarf-reuse.png',source='assets/levels/06-the-sleepless-tower/sprites/window-faded-red-scarf.png',extra={'crop_source_xyxy':[68,64,85,99],'role':'exact-existing-faded-red-cloth-crop'})
lumo=load('src/assets/lumo_0.png');foot=(174,231)
def scene(state,mem=False):
 im=room.copy();im.alpha_composite(scarfonly,(192,185));at(im,state,foot)
 if mem:
  im.alpha_composite(lumo,(584-lumo.width//2,244-lumo.height//2))
  # Existing plate is connected by the source pipe; the firefly sits on its spiral mark.
 return im
for file,state,mem,label in [('09-present','waiting',False,'09 PRESENT - IDENTITY UNRESOLVED'),('09-memory','memory-overlay',True,'09 MEMORY - WAITING GUARDIAN / LUMO HOLDS MARK'),('09-reveal-overlap','waiting',True,'09 REVEAL - SHARED FOOT ANCHOR'),('09-after-memory','waiting',False,'09 AFTER MEMORY / CRYSTAL - SHADOW REMAINS')]:
 im=scene(state,mem)
 if file=='09-reveal-overlap':at(im,'memory-overlay',foot)
 save(caption(im,label),'previews/'+file+'-640x360.png','offline-concept-composition',extra={'character_foot':list(foot),'runtime':'NOT_RUN'})
temple=load('assets/levels/08-ruins-of-two-halves/sprites/temple-scene-base.png')
beam=Image.new('RGBA',(640,360));bd=ImageDraw.Draw(beam);bd.polygon([(555,25),(565,29),(514,82),(503,77)],fill=(236,243,242,115));temple.alpha_composite(beam);at(temple,'shielding',(496,124))
save(caption(temple,'08 PRESENT SHADOW - SHELTERING SEEDLINGS'),'previews/08-shadow-640x360.png','offline-concept-composition')
if (B/'sources/observatory-dawn-original.png').exists():
 dawn=Image.open(B/'sources/observatory-dawn-original.png').convert('RGBA').resize((640,360),N)
 save(dawn,'sprites/observatory-dawn-scene-base.png',source='sources/observatory-dawn-original.png')
 for i,state in enumerate(['stillness','dawn-dissolve-1','dawn-dissolve-2','dawn-afterimage','empty']):
  im=dawn.copy()
  if state!='empty':at(im,state,foot)
  save(caption(im,'10 DAWN - '+state.upper()),'previews/10-dawn-'+str(i)+'-640x360.png','offline-concept-composition',extra={'character_foot':list(foot),'runtime':'NOT_RUN'})
# Contacts at native scale and nearest 2x with two contrast grounds.
contact=Image.new('RGBA',(640,230),(22,40,47,255));d=ImageDraw.Draw(contact)
for i,(name,f) in enumerate(frames.items()):
 x=8+(i%6)*104;y=10+(i//6)*110
 d.rectangle((x,y,x+47,y+63),fill=(191,191,173,255));contact.alpha_composite(f,(x,y));contact.alpha_composite(f,(x+48,y));d.text((x,y+69),name,fill=(240,230,200,255))
save(contact,'previews/contact-1x.png','contact-not-runtime');save(contact.resize((1280,460),N),'previews/contact-2x.png','contact-not-runtime')
sources=[{'file':str(p.relative_to(R)).replace('\\','/'),'sha256':sha(p),'size':list(Image.open(p).size)} for p in (B/'sources').glob('*.png')]
refs=['assets/levels/06-the-sleepless-tower/sprites/window-faded-red-scarf.png','assets/levels/08-ruins-of-two-halves/sprites/temple-scene-base.png','src/assets/lumo_0.png']
sources.extend({'file':p,'sha256':sha(R/p),'size':list(Image.open(R/p).size),'kind':'reused-reference'} for p in refs)
(B/'asset-map.json').write_text(json.dumps({'scope':'task12 concept/prototype assets only','exports':records,'sources':sources,'anchor_contract':{'canvas':[48,64],'foot':[24,62],'09_10_preview_foot':[174,231]},'reveal_sequence':['waiting','memory-overlay','waiting+memory-overlay','waiting'],'dissolution':'Level10 dawn only; never crystal pickup'},indent=2)+'\n')
checks=[]
for rec in records:
 im=Image.open(R/rec['file']);checks.append({'file':rec['file'],'result':'PASS' if list(im.size)==rec['size'] and im.mode=='RGBA' and sha(R/rec['file'])==rec['sha256'] else 'FAIL'})
(B/'validation.json').write_text(json.dumps({'technical':checks,'visual':'PASS: native and nearest 2x contacts, 08 shielding, 09 memory/overlap, 10 dissolution/afterimage/empty inspected; source hood contains no face; silhouette contours differ slightly at shoulders','engine':'NOT_RUN; asset-only scope','review':'NOT_RUN; user authorized sequential production'},indent=2)+'\n')
print(json.dumps({'exports':len(records),'sources':len(sources),'technical':'PASS' if all(c['result']=='PASS' for c in checks) else 'FAIL'}))
