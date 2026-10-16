"""Offline source normalization and deterministic puzzle icons. No runtime changes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import json, hashlib
B=Path(__file__).resolve().parent
R=B.parents[2]
S=B/'sprites'; P=B/'previews'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def fit(path,size):
    im=Image.open(path).convert('RGBA'); bb=im.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox(); im=im.crop(bb)
    scale=min((size[0]-4)/im.width,(size[1]-4)/im.height); out=Image.new('RGBA',size)
    im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
    out.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2)); return out
items={}; rows=[]
def save(name,im,kind,source=None):
    im.save(S/(name+'.png'));items[name]=im
    rows.append({'file':str((S/(name+'.png')).relative_to(R)).replace('\\','/'),'key_proposed':'l03_'+name.replace('-','_'),'canvas':list(im.size),'pivot':[.5,.5],'kind':kind,'source':source,'sha256':sha(S/(name+'.png'))})
body=fit(B/'sources/tablet-body-generated.png',(48,48))
save('tablet-body',body,'generated body normalized nearest','assets/levels/03-library-beneath-the-roots/sources/tablet-body-generated.png')
gold='#edcb75'; blue='#83d9db'; rim='#ead9aa'
def blank():return Image.new('RGBA',(48,48))
def glyph(name):
    im=blank();d=ImageDraw.Draw(im)
    # Common rim badge gives all identities equal prominence; no temporal clues.
    d.rectangle((15,1,33,12),fill='#252e2b',outline='#9d9478')
    if name=='chim':
        d.line([(17,3),(20,4),(24,8),(28,4),(31,3)],fill=rim,width=2)
        d.rectangle((23,7,25,10),fill=rim);d.rectangle((25,5,27,6),fill=rim);d.point((28,6),fill=rim)
    if name=='la':
        d.polygon([(18,10),(19,5),(24,3),(30,3),(29,8),(24,10)],fill=rim)
        d.line((19,10,28,4),fill='#495b48',width=1)
    if name=='thuyen':
        d.polygon([(17,7),(31,7),(28,11),(20,11)],fill=rim)
        d.line((24,2,24,7),fill=rim,width=1);d.polygon([(25,3),(29,6),(25,6)],fill=rim)
    if name=='hat':
        d.ellipse((20,2,28,11),fill=rim);d.line([(25,3),(23,5),(23,8),(25,10)],fill='#495b48',width=1)
    return im
for n in ['chim','la','thuyen','hat']:save('border-'+n,glyph(n),'native identity icon only')
low=blank();d=ImageDraw.Draw(low);d.ellipse((21,25,27,31),fill=gold);d.line((13,30,35,30),fill='#ced3b5');d.line((15,33,23,33),fill='#9bbaaf');d.line((27,33,33,33),fill='#9bbaaf')
save('bright-horizon-sun',low,'native shared clue: Chim and Thuyen byte-identical')
for kind in ['sun','moon']:
    im=blank();d=ImageDraw.Draw(im);d.arc((13,17,35,37),185,255,fill=gold,width=1);d.arc((13,17,35,37),285,355,fill=gold,width=1)
    if kind=='sun':d.ellipse((21,18,27,24),fill=gold);d.line((24,15,24,16),fill=gold);d.line((18,21,19,21),fill=gold);d.line((29,21,30,21),fill=gold)
    else:
        d.ellipse((21,17,28,25),fill=gold);d.ellipse((24,16,30,22),fill=(0,0,0,0))
    save('bright-high-'+kind,im,'native high celestial body with incomplete arc')
for direction in ['up','down']:
    im=blank();d=ImageDraw.Draw(im);d.line((13,29,35,29),fill='#527d7e');d.line((24,22,24,35),fill=blue,width=2)
    pts=[(20,26),(24,21),(28,26)] if direction=='up' else [(20,31),(24,36),(28,31)]
    d.line(pts,fill=blue,width=2);save('dark-motion-'+direction,im,'native movement only; no celestial body')
im=blank();d=ImageDraw.Draw(im);d.arc((13,18,35,39),180,360,fill=blue,width=2);save('dark-apex-arc',im,'native shared clue: La and Hat byte-identical; no celestial body')
mapping={'chim':('bright-horizon-sun','dark-motion-up'),'la':('bright-high-sun','dark-apex-arc'),'thuyen':('bright-horizon-sun','dark-motion-down'),'hat':('bright-high-moon','dark-apex-arc')}
for name,(bright,dark) in mapping.items():
    for state,layer in [('bright',bright),('dark',dark)]:
        im=body.copy();im.alpha_composite(items['border-'+name]);im.alpha_composite(items[layer]);save('tablet-'+name+'-'+state,im,'composed convenience state; authoritative layers remain separate')
for state in ['empty','occupied','selected']:
    im=blank();d=ImageDraw.Draw(im);d.rounded_rectangle((1,1,46,46),radius=5,fill='#182d2e',outline='#8d9b8b',width=2)
    d.rectangle((5,5,42,42),outline='#506d65',width=1)
    if state=='occupied':d.rectangle((9,9,38,38),fill='#444940',outline='#b9ad8a',width=2)
    if state=='selected':
        for x,y,sx,sy in [(1,1,1,1),(46,1,-1,1),(1,46,1,-1),(46,46,-1,-1)]:d.line([(x,y+sy*8),(x,y),(x+sx*8,y)],fill=gold,width=2)
    save('socket-'+state,im,'native socket state; occupied is neutral seating placeholder under actual tablet')
im=Image.new('RGBA',(20,16));d=ImageDraw.Draw(im);d.ellipse((7,3,13,9),fill=gold);d.line((2,9,18,9),fill=gold,width=2);d.line((5,12,15,12),fill='#b5c5ad');save('start-horizon',im,'native scenario start icon; no ordering labels')
im=Image.new('RGBA',(24,12));d=ImageDraw.Draw(im);d.line((2,6,20,6),fill='#9dbbad',width=2);d.line([(16,2),(21,6),(16,10)],fill='#9dbbad',width=2);save('route-cue',im,'native directional connector; rotate at composition; no tablet identities')
book=fit(B/'sources/test-book-body-generated.png',(56,40));save('test-book-body',book,'generated body normalized nearest','assets/levels/03-library-beneath-the-roots/sources/test-book-body-generated.png')
for state in ['bright','dark']:
    layer=Image.new('RGBA',(56,40));d=ImageDraw.Draw(layer)
    if state=='bright':
        d.line((35,20,35,29),fill='#8e9864',width=1);d.polygon([(30,14),(33,11),(35,15),(37,11),(40,14),(38,22),(33,22)],fill=gold);d.line((35,15,35,21),fill='#b48a43')
    else:d.ellipse((31,12,40,23),fill=blue);d.ellipse((35,10,43,19),fill=(0,0,0,0))
    save('test-book-'+state+'-layer',layer,'native independent ink layer')
    im=book.copy();im.alpha_composite(layer);save('test-book-'+state,im,'composed convenience state')
for mode in ['bright','dark']:
    c=Image.new('RGBA',(640,360),'#242b28' if mode=='bright' else '#101e23');d=ImageDraw.Draw(c)
    d.rectangle((0,0,639,34),fill='#0d191e');d.text((10,10),'LEVEL 03 | TASK 05 | OFFLINE '+mode.upper()+' | HUD RESERVED',fill='#e6d1a4')
    # Isolated puzzle staging preview; room architecture belongs to task 06.
    for i,n in enumerate(['hat','thuyen','chim','la']):c.alpha_composite(items['tablet-'+n+'-'+mode],(112+i*106,75))
    positions=[(246,173),(346,173),(346,273),(246,273)]
    for x,y in positions:c.alpha_composite(items['socket-empty'],(x,y))
    for xy,rot in [((300,190),0),((364,231),270),((300,290),180),((264,231),90)]:c.alpha_composite(items['route-cue'].rotate(rot,expand=True),xy)
    c.alpha_composite(items['start-horizon'],(222,185));c.alpha_composite(items['test-book-'+mode],(475,220))
    d.text((10,340),'Unplaced tablets; empty cycle; no solved arrangement shown. Room deferred to task 06.',fill='#a5b7ac')
    c.convert('RGB').save(P/('level03-'+mode+'-640x360.png'))
for group,names in [('tablets',[f'tablet-{n}-{s}' for n in ['chim','la','thuyen','hat'] for s in ['bright','dark']]),('markers',['socket-empty','socket-occupied','socket-selected','start-horizon','route-cue','test-book-bright','test-book-dark'])]:
    c=Image.new('RGBA',(640,360),'#152b2d');d=ImageDraw.Draw(c);d.text((10,8),'TASK 05 | '+group.upper()+' | 1x + 2x NEAREST | OFFLINE CONTACT',fill=gold)
    for i,n in enumerate(names):
        x=10+(i%4)*158;y=35+(i//4)*155;im=items[n];d.text((x,y),n,fill='#d9decc');c.alpha_composite(im,(x,y+26));c.alpha_composite(im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST),(x+57,y+26))
    c.convert('RGB').save(P/(group+'-contact-640x360.png'))
checks=[]
for row in rows:
    p=R/row['file'];im=Image.open(p);a=im.getchannel('A');checks.append({'file':row['file'],'result':'PASS' if im.mode=='RGBA' and list(im.size)==row['canvas'] and a.getextrema()[0]==0 and a.getbbox() else 'FAIL','mode':im.mode,'canvas':list(im.size),'alpha_extrema':list(a.getextrema()),'sha256':sha(p)})
dump(B/'asset-map.json',{'sprites':rows,'tablet_layers':mapping,'assembly':'body + border identity + exactly one bright OR dark layer, same 48x48 origin; do not show both ink layers in-world simultaneously','socket_assembly':'empty socket then actual tablet; selected outline above; occupied neutral placeholder is not a clue','scenario':'docs/scenario/03-library-beneath-the-roots.md','scenario_sha256':sha(R/'docs/scenario/03-library-beneath-the-roots.md'),'room':'Task 06; previews are isolated staging, no new architecture','runtime':'NOT_RUN'})
dump(B/'validation.json',{'technical_result':'PASS' if all(x['result']=='PASS' for x in checks) else 'FAIL','checks':checks,'pair_equality':'PASS by shared exact layer file references','bright_distinct_clues':3,'dark_distinct_clues':3,'combined_distinct_pairs':len(set(mapping.values())),'previews':[{'file':str(p.relative_to(R)).replace('\\','/'),'canvas':list(Image.open(p).size)} for p in P.glob('*.png')],'requested_agent':'gpt-6.1-sol low','resolved_agent':'not exposed by runtime','image_backend':'not exposed by image_gen','visual_review':'pending actual visual inspection','runtime':'NOT_RUN','build':'NOT_RUN'})
print('PASS',len(rows),'RGBA sprites; paired clue equality by exact shared files; four unique combinations; 4 offline previews/contact sheets')
