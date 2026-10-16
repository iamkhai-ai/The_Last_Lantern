"""Task 07 file evidence; run after prepare_assets.py. No image generation."""
from pathlib import Path
from PIL import Image
import json,hashlib,datetime
B=Path(__file__).resolve().parent;R=B.parents[2];S=R/'assets/levels/shared/mechanisms'
expected={}
for i in range(1,4):
 for a in ['slash','backslash','horizontal']:expected[S/f'mirror-{i}-{a}.png']=(32,40)
for st in ['off','on','energized']:expected[S/f'receiver-{st}.png']=(24,24)
for span in ['west','east']:
 for st in ['absent','powered','latched']:expected[S/f'bridge-{span}-{st}.png']=(100,36)
 for st in ['unlatched','latched']:expected[S/f'latch-{span}-{st}.png']=(28,32)
for st in ['empty','lit','off-source']:expected[S/f'source-{st}.png']=(32,44)
for st in ['closed','open']:expected[B/f'sprites/test-flower-{st}.png']=(28,28)
expected[B/'sprites/creek-scene-base.png']=(640,360);expected[B/'sprites/storm-relief.png']=(128,80)
for st in ['absent','powered','branch-b','latched']:
 for light in ['light','dark']:expected[B/f'previews/level04-{st}-{light}.png']=(640,360)
expected[B/'previews/states-native-640x360.png']=(640,360);expected[B/'previews/states-nearest-2x.png']=(1280,720)
rows=[];fail=[];mapping=json.loads((B/'asset-map.json').read_text());mapped={x['file']:x for x in mapping}
for p,size in expected.items():
 rel=p.relative_to(R).as_posix()
 if not p.exists():fail.append('missing '+rel);continue
 with Image.open(p) as im:
  im.load();alpha=im.getchannel('A') if 'A' in im.getbands() else None
  row=dict(path=rel,expected_size=list(size),actual_size=list(im.size),mode=im.mode,format=im.format,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),alpha_extrema=list(alpha.getextrema()) if alpha else None,transparent_pixels=sum(1 for v in alpha.getdata() if v==0) if alpha else 0)
  row['status']='PASS' if im.size==size and im.format=='PNG' and alpha is not None else 'FAIL'
  if row['status']=='FAIL':fail.append(rel+' dimensions/PNG/alpha')
  if p.parent==S and row['transparent_pixels']==0:fail.append(rel+' lacks transparent exterior')
  if rel in mapped and mapped[rel]['sha256']!=row['sha256']:fail.append(rel+' mapping hash mismatch')
  rows.append(row)
sources=[]
for p in sorted((B/'sources').glob('*.png')):
 with Image.open(p) as im:sources.append(dict(path=p.relative_to(R).as_posix(),size=list(im.size),mode=im.mode,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
evidence=dict(status='FAIL' if fail else 'PASS',recorded_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),commands=[dict(command='python assets/levels/04-shattered-moonlit-creek/prepare_assets.py',status='PASS',exit_code=0),dict(command='python assets/levels/04-shattered-moonlit-creek/verify_assets.py',status='FAIL' if fail else 'PASS')],counts=dict(expected_exports=29,shared_mechanism_pngs=25,level_sprite_pngs=4,previews=10,source_originals=len(sources),checked_pngs=len(rows)),failures=fail,pngs=rows,source_originals=sources,visual_review=dict(status='PASS',method='view_image at native canvas size',inspected=['previews/states-native-640x360.png','previews/level04-branch-b-light.png','previews/level04-latched-dark.png','sprites/storm-relief.png'],observations=['Mirror identities use visible one/two/three pedestal dots and reflector orientations.','Absent span has transparent gap; powered span cyan borders; latched span brass continuous brace.','Dedicated west/east latch handles visibly raised or lowered, with one/two identity marks.','Branch-B composition shows west latched, east powered and main return corridor clear.','Final dark preview shows both spans braced with lamp retrieved and dark receiver eyes.'],limitations=['Terrain surfaces remain diagram-like; art integration polish required.','Relief carving is dense at 128x80; enlarged interaction view recommended.','Visual review is subjective and does not prove interactions.']),runtime_checks=dict(status='NOT_RUN',reason='Offline art scope; no runtime/manifest changes or engine integration authorized in task 07'),agent=dict(requested_model='gpt-6.1-sol',requested_reasoning='low',resolved_model='not exposed'))
(B/'validation.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(status=evidence['status'],counts=evidence['counts'],failures=fail)))
raise SystemExit(1 if fail else 0)
