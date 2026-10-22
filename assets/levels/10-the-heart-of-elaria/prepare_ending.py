"""Task15: deterministic export/composition of existing art and generated seated pose."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json,subprocess,sys
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'; N=Image.Resampling.NEAREST
refs={}; exports=[]; scenes=[]
subprocess.run([sys.executable,str(B/'prepare_assets.py')],check=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(R).as_posix()
def load(p):
 p=R/p; a=Image.open(p).convert('RGBA');refs[rel(p)]={'file':rel(p),'size':list(a.size),'sha256':sha(p)};return a
def save(n,a,kind='transparent-layer',pivot=(.5,1)):
 p=S/('ending-'+n+'.png');a.save(p,compress_level=9);exports.append({'file':rel(p),'size':list(a.size),'pivot':pivot,'kind':kind,'sha256':sha(p)});return a
def put(a,b,xy,size=None):a.alpha_composite(b.resize(size,N) if size else b,xy)
def scene(n,a,state):
 p=P/('task15-'+n+'-640x360.png');a.save(p);scenes.append({'file':rel(p),'size':[640,360],'state':state,'sha256':sha(p)})
def dump(n,v):(B/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
src=load(rel(B/'sources/task15-nhinh-seated-original.png'))
seated=save('nhinh-seated-unlit-leaf',load(rel(B/'sprites/ending-nhinh-seated-unlit-leaf.png')))
detail=save('nhinh-seated-detail',load(rel(B/'sprites/ending-nhinh-seated-detail.png')),'dialogue-insert')
lumo=load('src/assets/lumo_0.png').resize((12,12),N)
root=load(rel(B/'sprites/sanctuary-base.png'));scene_root=root.copy()
# Runtime-style native lighting overlay; source pixels stay unchanged on disk.
dawn=load(rel(B/'sprites/ending-dawn-lighting-overlay.png'))
save('dawn-lighting-overlay',dawn,'lighting-overlay',(.5,.5));put(scene_root,dawn,(0,0))
put(scene_root,seated,(309,122));put(scene_root,lumo,(337,140))
scene('01-seated-by-roots',scene_root,{'lantern':'off-held-in-lap','leaf':'on-handle','lumo':'beside-handle','pose':'seated','time':'dawn'})
close=Image.new('RGBA',(640,360),'#233a32');put(close,detail,(240,100));put(close,lumo,(363,177),(24,24))
scene('02-seated-detail',close,{'purpose':'dialogue-detail','lantern':'off','leaf':'on-handle'})
base_paths=[('garden','assets/levels/07-the-sleeping-garden/sprites/garden-scene-base.png'),('creek','assets/levels/04-shattered-moonlit-creek/sprites/creek-scene-base.png'),('tower','assets/levels/06-the-sleepless-tower/sprites/tower-scene-base.png')]
for k,p in base_paths:
 a=load(p).resize((640,360),N);put(a,dawn,(0,0));scene('03-montage-'+k,a,{'time':'dawn-sequence','location':k,'movement':'runtime-required','lighting':'native-overlay'})
sh='assets/levels/shared/characters/the-shadow/sprites/'
obs=load(sh+'observatory-dawn-scene-base.png').resize((640,360),N);wheel=load(rel(B/'sprites/day-night-wheel-resuming.png'))
for i,k in enumerate(['stillness','dawn-dissolve-1','dawn-dissolve-2','dawn-afterimage','dawn-empty']):
 a=obs.copy();put(a,wheel,(328,70));put(a,load(sh+k+'.png'),(390,170));scene('04-wheel-resumes-shadow-'+str(i),a,{'time':'dawn','wheel':'resuming','shadow':k,'never_before_dawn':True})
# Native daytime forest staging uses project dawn vegetation. No source scene repaint.
trail=Image.new('RGBA',(640,360),'#779c68');d=ImageDraw.Draw(trail)
d.polygon([(270,0),(365,0),(460,360),(150,360)],fill='#b6ae7c')
for name,points in [('tree_dawn',[(0,35),(520,0),(55,150),(490,150)]),('bush_dawn',[(90,270),(460,285),(25,335)]),('canopy_dawn',[(0,0),(340,0)])]:
 art=load('src/assets/'+name+'.png')
 for xy in points:put(trail,art,xy)
put(trail,lumo,(342,268))
# Explicit unlit carry attachment uses approved existing off pose as staging; leaf anchors handle.
carry=load('assets/character/nhinh_right_lantern_off_2.png');save('nhinh-carry-off-reference',carry,'existing-pose-reuse')
leaf=load(rel(B/'sprites/lantern-new-leaf.png'));save('leaf-handle-attachment',leaf,'attachment')
put(trail,carry,(300,254));put(trail,leaf,(324,278),(4,4))
scene('05-daytime-trail',trail,{'time':'day','lantern':'off-carried','leaf':'handle-attachment','pose':'existing-carry-pose-staging','girl_fate':'not-depicted'})
title=load(rel(B/'sprites/ending-title-the-last-dawn.png'));txt='THE LAST DAWN'
save('title-the-last-dawn',title,'title-overlay',(.5,.5));final=trail.copy();put(final,title,(0,0));scene('06-final-title',final,{'title':txt,'continue':'E','credits':'text-runtime-required'})
native=Image.new('RGBA',(640,360),'#263634')
for i,e in enumerate(exports):
 a=Image.open(R/e['file']);a.thumbnail((180,170),N);put(native,a,(20+(i%3)*205,12+(i//3)*175))
native.save(P/'task15-contact-native.png');native.resize((1280,720),N).save(P/'task15-contact-2x.png')
contact=Image.new('RGBA',(1280,720),'#263634')
for i,row in enumerate(scenes):put(contact,Image.open(R/row['file']),(i%4*320,i//4*180),(320,180))
contact.save(P/'task15-scene-overview.png')
checks=[]
for e in exports+scenes:
 p=R/e['file'];a=Image.open(p);assert a.mode=='RGBA' and list(a.size)==e['size'] and sha(p)==e['sha256'];checks.append({'file':e['file'],'status':'PASS'})
assert seated.getextrema()[3][0]==0 and seated.getbbox() is not None
dump('task15-asset-map.json',{'exports':exports,'scenes':scenes,'reuse':list(refs.values())})
dump('task15-provenance.json',{'source_generation_metadata':'task15-generation-prompts.json','assembly_agent':'active GPT configuration','resolved_agent':'unknown: not exposed by runtime','image_backend_model':'unknown: built-in tool does not expose resolved model','tool':'retained image_gen source; Pillow normalization','fallback':False,'source':rel(B/'sources/task15-nhinh-seated-original.png'),'reference':'assets/character/nhinh_right_lantern_off_2.png','normalization':'Alpha160 crop and native palette normalization in prepare_assets.py; original source unchanged.','script_sha256':sha(Path(__file__)),'scenario_sha256':sha(R/'docs/scenario/10-the-heart-of-elaria.md'),'references':refs})
dump('task15-validation.json',{'technical':'PASS','exports':len(exports),'scene_previews':len(scenes),'checks':checks,'transparency':'PASS seated cutout retains transparent pixels','visual_review':'See10-art-v2-report.md and runtime-v2; task15 previews are offline historical staging.','runtime_evidence':'previews/runtime-v2/capture-results.json binds final sprite hashes; regenerate capture after any change.','animation':'NOT_RUN: sit/stand and clip-to-belt animations do not exist.','limitations':['Single seated pose, no sit/stand or clip-to-belt animation.','Historical montage/trail previews are offline staging; runtime-v2 captures show actual engine composition.','Existing carry pose remains a standing keyframe.']})
print('PASS',len(exports),'exports',len(scenes),'scenes',len(refs),'references')
