"""Offline deterministic room/state assembly; no game runtime changes."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'; N=Image.Resampling.NEAREST
exports=[]; refs={}; states=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(R).as_posix()
def load(p):
 p=R/p;im=Image.open(p).convert('RGBA');refs[rel(p)]={'file':rel(p),'size':list(im.size),'sha256':sha(p)};return im
def save(im,n,kind='native-module',pivot=(.5,.5)):
 p=S/(n+'.png');im.save(p);exports.append({'file':rel(p),'key':'observatory_'+n.replace('-','_'),'size':list(im.size),'pivot':pivot,'kind':kind,'sha256':sha(p)});return im
def blank(w,h):return Image.new('RGBA',(w,h))
gold='#efd58b';cyan='#a8d8db';stone='#354b5b';edge='#7f96a4';dark='#101e31'
F=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',10)
shared='assets/levels/shared/';l5='assets/levels/05-a-path-for-two/sprites/';l8='assets/levels/08-ruins-of-two-halves/sprites/';shadow=shared+'characters/the-shadow/sprites/'
A={}
for k,p in {'source':shared+'mechanisms/source-lit.png','empty-source':shared+'mechanisms/source-empty.png','G0':'assets/levels/06-the-sleepless-tower/sprites/G0-to-B.png','G1':shared+'mechanisms/mirror-1-slash.png','G2':shared+'mechanisms/mirror-2-backslash.png','latch':l5+'latch-latched.png','free-latch':l5+'latch-unlatched.png','door':l5+'door-open.png','closed-door':l5+'door-closed.png','brace':l5+'door-held-overlay.png','pressure':l5+'pressure-occupied.png','empty-pressure':l5+'pressure-empty.png','call':l5+'call-idle.png','swirl':l5+'swirl-memory-scratch.png','tube':l5+'tube-straight.png','prism':shared+'beam-splitter/prism-receiving.png','dark-prism':shared+'beam-splitter/prism-dark.png','statue':l8+'statue-notch-0.png','narrow-statue':l8+'statue-notch-1.png','sun':l8+'lock-sun-on.png','dark-sun':l8+'lock-sun-off.png','roots':shared+'garden-mechanisms/root-bridge-on.png','off-roots':shared+'garden-mechanisms/root-bridge-off.png','shadow':shadow+'waiting.png','memory':shadow+'memory-overlay.png','lumo':'src/assets/lumo_0.png','crystal':'src/assets/crystal_balance.png','record':'assets/levels/06-the-sleepless-tower/sprites/voice-record-panel.png'}.items():A[k]=load(p)
scenery=load(shadow+'observatory-memory-scene-base.png');temple=load(l8+'temple-scene-base.png')
A['nhinh']=load('assets/character/nhinh_downright_idle_0.png')
def put(im,k,x,y,size=None):
 a=A[k];a=a.resize(size,N) if size else a;im.alpha_composite(a,(int(x),int(y)))
def text(im,xy,t,c=gold,font=small):ImageDraw.Draw(im).text(xy,t,fill=c,font=font)
# The wheel is a new native prop: fixed sun among star symbols; no lever/control added.
wheel=blank(144,112);d=ImageDraw.Draw(wheel);d.ellipse((17,2,127,110),fill=dark,outline=edge,width=3)
for a in range(0,360,30):
 x=72+round(43*math.cos(math.radians(a)));y=56+round(43*math.sin(math.radians(a)));d.line((72,56,x,y),fill=stone)
 d.line((x-3,y,x+3,y),fill=cyan);d.line((x,y-3,x,y+3),fill=cyan)
d.ellipse((65,7,79,21),fill=gold);d.rectangle((61,2,64,15),fill='#9c7964');save(wheel,'wheel-stopped-sun-among-stars')
chart=blank(136,80);d=ImageDraw.Draw(chart);d.rectangle((0,0,135,79),fill=dark,outline=edge)
pts=[(14,15),(45,30),(65,12),(88,52),(120,24),(105,68)];d.line(pts,fill=edge)
for x,y in pts:d.line((x-3,y,x+3,y),fill=cyan);d.line((x,y-3,x,y+3),fill=cyan)
save(chart,'star-chart')
mini=blank(160,80);d=ImageDraw.Draw(mini);d.rectangle((0,0,159,79),fill=stone,outline=edge)
for k,x in [('G1',5),('latch',34),('empty-pressure',65),('statue',96),('roots',130)]:mini.alpha_composite(A[k].resize((24,30),N),(x,14))
d.line((8,56,151,56),fill=cyan);text(mini,(8,62),'E · ghi chép đã học');save(mini,'learned-marks-miniature')
base=[]
for i,n in enumerate(['lobby','star-chart','observatory']):
 im=(scenery if i==2 else temple).copy();im=im.resize((640,360),N)
 # Explicit stone geometry masks misleading scenic doors and routes.
 d=ImageDraw.Draw(im);d.rectangle((0,120,639,339),fill=dark);d.rectangle((0,208,639,275),fill=stone,outline=edge)
 for x in range(0,640,40):d.line((x,210,x,273),fill='#435e6b')
 d.line((0,140,639,140),fill='#627485',width=2)
 if i==0:
  im.alpha_composite(mini,(260,40));put(im,'source',80,183);put(im,'G0',160,161);put(im,'door',554,173)
 if i==1:
  im.alpha_composite(chart,(185,25));put(im,'G1',75,123);put(im,'G2',215,123);put(im,'call',100,275)
  for x in range(55,360,64):put(im,'tube',x,70)
  put(im,'swirl',55,60);put(im,'empty-pressure',340,80)
 if i==2:
  im.alpha_composite(wheel,(320,5));put(im,'record',440,177,(72,50));put(im,'shadow',494,184);put(im,'swirl',230,35)
 save(im,n+'-base','scenic-reuse-native-floor');base.append(im)
def scene(state):
 rooms=[im.copy() for im in base];lobby,star,obs=rooms
 door=state.get('door','latched');power=state.get('power',True);held=state.get('lumo','seal')=='seal';route=state.get('route','frame');wide=state.get('wide',True);loop=state.get('loop',False)
 live=power and held and state.get('g0','G1')=='G1';sun=live;bridge=live and route=='frame' and wide
 put(lobby,'door' if door!='closed' else 'closed-door',554,173)
 if door=='latched':put(lobby,'brace',554,173);put(star,'latch',8,247)
 else:put(star,'free-latch',8,247)
 if not power:put(lobby,'empty-source',80,183)
 d=ImageDraw.Draw(lobby)
 if power:
  d.line((96,198,176,198,176,140),fill=gold,width=3)
  d.line((176,140,639 if state.get('g0','G1')=='G1' else 584,140),fill=gold,width=3)
 text(lobby,(525,290),'A · '+door)
 put(star,'pressure' if held else 'empty-pressure',340,80)
 if state.get('lumo','seal')!='returned':put(star,'lumo',345 if held else 190,75 if held else 77,(22,22))
 text(star,(320,112),'C · Bắc / màn '+('mở' if held else 'đóng'))
 # All mirror stations share the solid stone corridor; no root crossing needed to adjust.
 d=ImageDraw.Draw(star)
 if live:d.line((0,140,90,140,230,140),fill=gold,width=3)
 # Curtain is separately identifiable from doors and bridges.
 d.rectangle((42,127,48,156),fill=cyan if held else '#756b83');text(star,(32,160),'màn')
 d.rectangle((294,118,355,171),outline=edge,width=3);put(star,'prism' if live and route=='frame' else 'dark-prism',301,128)
 text(star,(294,174),'khung chia')
 # Physical chasm/root bed spans the second room boundary, separate from Door A.
 for im,x0,x1 in [(star,545,639),(obs,0,150)]:
  dd=ImageDraw.Draw(im);dd.rectangle((x0,208,x1,275),fill='#080f20');dd.line((x0,208,x1,208),fill=edge)
 if live and route=='direct':
  ImageDraw.Draw(star).line((230,140,639,140),fill=gold,width=3);ImageDraw.Draw(obs).line((0,140,207,140,207,107),fill=gold,width=3)
  for im,box in [(star,(545,208,639,268)),(obs,(0,208,150,268))]:ImageDraw.Draw(im).rectangle(box,fill='#80784f',outline=gold)
 if live and route=='frame':
  d.line((230,140,325,140,325,85,639,85),fill=gold,width=3);ImageDraw.Draw(obs).line((0,85,207,85),fill=gold,width=3)
  d.line((325,140,325,220,400,220),fill=gold,width=3)
  if not wide:d.line((400,220,639,220),fill=gold,width=3);ImageDraw.Draw(obs).line((0,220,150,220),fill=gold,width=3)
 put(star,'statue' if wide else 'narrow-statue',376,156)
 if bridge:
  for im,xs in [(star,[547,595]),(obs,[0,48,96])]:
   for x in xs:put(im,'roots',x,225)
  ImageDraw.Draw(star).line((440,267,638,267),fill=cyan);ImageDraw.Draw(obs).line((0,267,150,267),fill=cyan)
 else:
  put(star,'off-roots',545,225);put(obs,'off-roots',101,225)
 put(obs,'sun' if sun else 'dark-sun',191,67)
 put(obs,'door' if sun or state.get('final_latch',False) else 'closed-door',185,174)
 put(obs,'latch' if state.get('final_latch',False) else 'free-latch',270,246)
 if state.get('final_latch',False):put(obs,'brace',185,174)
 text(obs,(250,286),'E · chốt / mở lối vòng')
 # Continuous bottom stone return route exists only after the far-bank action.
 for im in rooms:
  dd=ImageDraw.Draw(im)
  if loop:dd.rectangle((0,305,639,334),fill='#657780',outline=cyan)
  else:dd.rectangle((0,305,639,334),fill=dark);dd.line((0,319,639,319),fill='#273b4b')
 if loop:
  ImageDraw.Draw(lobby).rectangle((72,259,120,332),fill='#657780',outline=cyan);ImageDraw.Draw(star).rectangle((105,259,145,332),fill='#657780',outline=cyan);ImageDraw.Draw(obs).rectangle((270,259,312,332),fill='#657780',outline=cyan)
  text(obs,(325,314),'LỐI ĐÁ VÒNG → bệ / mốc gọi')
 if state.get('lumo')=='returned':put(obs,'lumo',414,230,(22,22))
 if state.get('memory',False):
  tint=blank(640,360);ImageDraw.Draw(tint).rectangle((0,0,639,339),fill=(180,141,90,35));obs.alpha_composite(tint)
  put(obs,'memory',494,184);put(obs,'tube',212,66);put(obs,'pressure',232,86);put(obs,'lumo',242,77,(22,22))
  text(obs,(20,35),'Lumo, bay qua đường ống. Giữ mạch phía Bắc cho tôi.',font=F)
  text(obs,(20,52),'Chỉ thêm một đêm nữa.',font=F)
  # Same Guardian/Shadow anchor; present room remains visible under the record.
  text(obs,(350,260),'Người Bảo Vệ / The Shadow',font=F)
  text(obs,(220,118),'BẮC · Lumo giữ ấn',font=small)
  text(obs,(18,153),'Bánh xe bị chặn · ánh dồn về Cây Mẹ · nước cạn · ba mạch rễ nứt',font=F)
  md=ImageDraw.Draw(obs)
  for yy in (178,186,194):
   md.line((320,yy,350,yy,358,yy-3,366,yy+3,395,yy),fill=(232,202,156,180),width=2)
   md.line((357,yy-6,360,yy,357,yy+6),fill=(245,238,218,190))
 if state.get('crystal',False):put(obs,'crystal',377,202,(22,38))
 actor_room=2 if state['id']>='06' else 1 if state['id']>='02' else 0
 actor_xy=(320,229) if actor_room==2 else (490,229) if actor_room==1 else (480,229)
 put(rooms[actor_room],'nhinh',*actor_xy,(28,36))
 for i,im in enumerate(rooms):
  text(im,(8,8),['TIỀN SẢNH','PHÒNG BẢN ĐỒ SAO','PHÒNG THIÊN VĂN'][i],font=F)
  text(im,(8,344),'OFFLINE · '+state['id']+' · '+('ROOT BRIDGE' if bridge else 'NO ROOT BRIDGE'),font=small)
  im.save(P/(state['id']+'-'+['lobby','star-chart','observatory'][i]+'-640x360.png'))
 panorama=blank(1920,360)
 for i,im in enumerate(rooms):panorama.alpha_composite(im,(i*640,0))
 panorama.save(P/(state['id']+'-panorama.png'))
 states.append(dict(state,sun_derived=sun,bridge_derived=bridge,curtain_derived=held))
 return panorama
specs=[dict(id='01-door-A-powered',door='open',g0='A',lumo='travelling'),dict(id='02-door-A-latched-follow-Lumo',g0='G1',lumo='travelling'),dict(id='03-G2-direct',route='direct'),dict(id='04-frame-narrow-pre-bridge',wide=False),dict(id='05-frame-wide-bridge'),dict(id='06-far-bank-before-loop',final_latch=True),dict(id='07-loop-return',loop=True,final_latch=True),dict(id='08-lamp-retrieved-Lumo-returned',loop=True,final_latch=True,power=False,lumo='returned'),dict(id='09-final-memory',loop=True,final_latch=True,power=False,lumo='returned',memory=True),dict(id='10-after-memory-Shadow-present',loop=True,final_latch=True,power=False,lumo='returned',crystal=True)]
panels=[scene(s) for s in specs]
contact=blank(1920,360*len(panels))
for i,im in enumerate(panels):contact.alpha_composite(im,(0,i*360))
contact.save(P/'all-states-contact.png')
for name,im in [('room-contact',panels[4]),('memory-contact',panels[8])]:im.save(P/(name+'.png'))
mapping={'coordinate_system':'three 640x360 room-local views, panorama x offset 0/640/1280','source_route':{'lobby':[[96,198],[176,198],[176,140],[640,140]],'star-chart':[[0,140],[90,140],[230,140],[325,140]],'upper_branch':[[325,140],[325,85],[640,85]],'observatory_upper':[[0,85],[207,85]],'middle_branch':[[325,140],[325,220],[400,220],[640,220]],'direct':[[230,140],[640,140]]},'safe_walk':{'lobby':[[96,240],[584,240]],'star-chart':[[0,240],[520,240]],'observatory_far_bank':[[262,240],[600,240]],'root_crossing':{'star-chart':[[545,240],[640,240]],'observatory':[[0,240],[150,240]]},'return_loop_y':319,'loop_access_x':{'lobby':96,'star-chart':125,'observatory':290}},'safe_spawns':{'lobby':[140,250],'star-chart':[490,250],'observatory_far_bank':[280,250]},'door_A':{'lobby':[554,173,618,261],'inside_latch_star':[8,247]},'final_door':{'observatory':[185,174,249,262],'far_bank_controls':[270,246]},'pressure_C':{'star-chart':[340,80],'requires_actual_arrival':True},'checkpoint_restore':{'before_root_bridge':'Saved accessible stone in lobby or star-chart; bridge saves map to near-bank star-chart (490,250). Keep lamp position/on, G0-G2, statue, actual Lumo route/arrival and both latches. Recompute curtain/Sun/roots.', 'across_bridge_before_loop':'Observatory (280,250), outside threshold/bridge. Preserve even lamp off/Lumo released. Final latch and loop control reachable without power. Do not auto restore light.', 'after_loop':'Saved room stone spawn. Loop stays open. Preserve lamp on hand/pedestal and Lumo at seal/returned. Continuous walking access to source and call regardless of power.'},'state_retention':'Wrong configuration changes only current derived beam/lock/root state; retain all inputs and intermediate latches. Occupied roots wait until safe bank before retracting. Never restore onto retracting bridge.'}
(B/'layout-and-restores.json').write_text(json.dumps(mapping,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(B/'asset-map.json').write_text(json.dumps({'exports':exports,'reuse':list(refs.values()),'preview_states':states},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
checks=[]
for a in exports+list(refs.values()):
 p=R/a['file'];im=Image.open(p);checks.append({'file':a['file'],'result':'PASS' if p.exists() and im.mode=='RGBA' and list(im.size)==a['size'] and sha(p)==a['sha256'] and im.getchannel('A').getbbox() else 'FAIL','alpha_extrema':im.getchannel('A').getextrema()})
previews=list(P.glob('*.png'));assert len({x.name for x in previews})==len(previews)
for p in previews:
 im=Image.open(p);assert im.mode=='RGBA';assert im.height==360 or p.name=='all-states-contact.png'
assert states[2]['sun_derived'] and not states[2]['bridge_derived'];assert states[4]['bridge_derived'];assert states[7]['loop'] and not states[7]['bridge_derived']
(B/'validation.json').write_text(json.dumps({'technical':checks,'preview_count':len(previews),'path_uniqueness':'PASS','state_table':'PASS','visual':'PENDING','engine':'NOT_RUN; offline art only'},indent=2)+'\n')
sources=['docs/scenario/09-dark-moon-observatory.md','tasks/plan.md','src/data/campaignLevels.ts','src/scenes/CampaignScene.ts','docs/superpowers/specs/2026-10-16-observatory-room-navigation-design.md','docs/superpowers/plans/2026-10-16-observatory-room-navigation.md']
(B/'provenance.json').write_text(json.dumps({'requested_agent':{'model':'gpt-6.1-sol','reasoning':'low','resolved':'not exposed by worker runtime'},'generation':'No new imagegen call. Existing generated Level08 and task12 scenery reused with deterministic room geometry and native new wheel/chart/miniature.','inputs':[{'file':p,'sha256':sha(R/p)} for p in sources]+list(refs.values()),'script_sha256':sha(Path(__file__))},indent=2)+'\n')
print(json.dumps({'exports':len(exports),'reused':len(refs),'previews':len(previews),'technical':'PASS' if all(c['result']=='PASS' for c in checks) else 'FAIL'}))
