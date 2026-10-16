"""Task 06 offline native layout; never modifies task 05 outputs."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib,json,math
B=Path(__file__).resolve().parent; R=B.parents[2]; S=B/'sprites'; P=B/'previews'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v): p.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
items={}; rows=[]
def save(n,im,source,kind):
    p=S/('room-'+n+'.png');im.save(p);items[n]=im
    rows.append(dict(file=str(p.relative_to(R)).replace('\\','/'),canvas=list(im.size),pivot=[.5,.5],source=source,kind=kind,sha256=sha(p)))
def fit(p,size):
    im=Image.open(p).convert('RGBA');bb=im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();im=im.crop(bb)
    k=min((size[0]-4)/im.width,(size[1]-4)/im.height);im=im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.NEAREST)
    o=Image.new('RGBA',size);o.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2));return o
save('bookshelf',fit(B/'sources/task06-bookshelf-generated.png',(112,112)),'sources/task06-bookshelf-generated.png','generated modular root bookshelf')
save('mural-fifth',fit(B/'sources/task06-mural-generated.png',(96,136)),'sources/task06-mural-generated.png','generated anonymous Guardian mural')
def sprite(n):return Image.open(S/(n+'.png')).convert('RGBA')
for state in ['closed','open']:
    im=Image.new('RGBA',(116,148));d=ImageDraw.Draw(im)
    d.rounded_rectangle((2,2,113,145),radius=7,fill='#3b3529',outline='#aa9060',width=3)
    if state=='open':
        d.rectangle((10,6,105,141),fill='#101d20');im.alpha_composite(items['mural-fifth'],(10,6))
        for x in [3,108]:d.line((x,8,x,138),fill='#d4ba7f',width=3)
    else:
        d.rectangle((10,6,105,141),fill='#625540',outline='#8e7957',width=2)
        for y in [38,72,106]:d.line((12,y,103,y),fill='#3b382e',width=2)
        d.line((58,8,58,138),fill='#332f28',width=2)
        # Opaque shutter: no story silhouette before reveal.
    save('panel-'+state,im,'prepare_room.py','native opaque sliding stone screen' if state=='closed' else 'native frame with generated mural')
centers=[(110,34),(186,110),(110,186),(34,110)]
for state in ['closed','open']:
    im=Image.new('RGBA',(220,220));d=ImageDraw.Draw(im)
    d.ellipse((4,4,215,215),fill='#383a30',outline='#ac9e78',width=3)
    d.ellipse((14,14,205,205),outline='#736e53',width=3)
    d.ellipse((64,64,155,155),fill='#14282a' if state=='open' else '#6a6950',outline='#b3a780',width=3)
    if state=='closed':
        d.line((73,108,146,108),fill='#444b3f',width=2);d.line((109,73,109,146),fill='#444b3f',width=2)
    # Four equal seats at N/E/S/W; clockwise routing, no identity matching.
    for x,y in centers:im.alpha_composite(sprite('socket-empty'),(x-24,y-24))
    for xy,rot in [((151,49),315),((151,151),225),((49,151),135),((49,49),45)]:
        cue=sprite('route-cue').rotate(rot,expand=True,resample=Image.Resampling.NEAREST);im.alpha_composite(cue,xy)
    im.alpha_composite(sprite('start-horizon'),(100,63))
    # Deliberate central confirmation pedestal distinct from tablet seats.
    d=ImageDraw.Draw(im);d.ellipse((94,94,125,125),fill='#343e36',outline='#c2b58a',width=2);d.rectangle((104,102,115,113),outline='#d6c99e',width=2)
    save('well-'+state,im,'prepare_room.py + task05 socket-empty/start-horizon/route-cue','native circular well with exact four sequential sockets')
im=Image.new('RGBA',(80,54));d=ImageDraw.Draw(im);d.rectangle((9,19,17,50),fill='#463e2e');d.rectangle((63,19,71,50),fill='#463e2e');d.rounded_rectangle((2,4,77,34),radius=4,fill='#716044',outline='#b29a6c',width=2)
for y in [13,25]:d.line((6,y,73,y),fill='#514d39')
save('test-desk',im,'prepare_room.py','native wood desk under task05 page')
save('memory-crystal',fit(R/'src/assets/crystal_memory.png',(28,36)),'src/assets/crystal_memory.png','existing gold Memory crystal normalized nearest')
def room(panel,well,crystal=False):
    c=Image.new('RGBA',(640,360),'#252d29');d=ImageDraw.Draw(c)
    # Existing stone material reused as subdued floor, no new tile claim.
    tile=Image.open(R/'src/assets/tile_stone.png').convert('RGBA').resize((64,64),Image.Resampling.NEAREST)
    overlay=Image.new('RGBA',(640,360),'#312b20')
    for y in range(36,338,64):
        for x in range(0,640,64):c.alpha_composite(tile,(x,y))
    overlay.putalpha(150);c.alpha_composite(overlay)
    d=ImageDraw.Draw(c);d.rectangle((0,0,639,35),fill='#121e20');d.rectangle((0,338,639,359),fill='#121e20')
    for xy in [(162,40),(381,40),(500,40)]:c.alpha_composite(items['bookshelf'],xy)
    c.alpha_composite(items['panel-'+panel],(34,38));c.alpha_composite(items['well-'+well],(210,116))
    c.alpha_composite(items['test-desk'],(468,215));c.alpha_composite(sprite('test-book-dark'),(480,214))
    for n,xy in zip(['hat','thuyen','chim','la'],[(28,223),(93,260),(502,151),(557,270)]):c.alpha_composite(sprite('tablet-'+n+'-dark'),xy)
    if crystal:c.alpha_composite(items['memory-crystal'],(306,214))
    d=ImageDraw.Draw(c);d.text((10,10),'LEVEL 03 | TASK 06 | OFFLINE ROOM | '+panel.upper(),fill='#e2c994');d.text((10,342),'Empty seats / unplaced shuffled tablets | room study, not engine capture',fill='#b8bdab')
    return c
for panel,well,crystal,name in [('closed','closed',False,'library-empty-well'),('open','open',False,'library-mural-open'),('open','open',True,'library-reward-state')]:room(panel,well,crystal).convert('RGB').save(P/('task06-'+name+'-640x360.png'))
for group,names in [('panel-states',['panel-closed','panel-open']),('modules',['bookshelf','test-desk','memory-crystal']),('well-states',['well-closed','well-open']),('mural',['mural-fifth'])]:
    c=Image.new('RGBA',(640,360),'#17272a');d=ImageDraw.Draw(c);d.text((10,8),'TASK 06 | '+group+' | 1x and 2x NEAREST',fill='#ead2a0')
    if group=='panel-states':
        for i,n in enumerate(names):c.alpha_composite(items[n],(12+i*130,38))
        c.alpha_composite(items['panel-open'].resize((232,296),Image.Resampling.NEAREST),(285,40))
    elif group=='well-states':
        for i,n in enumerate(names):c.alpha_composite(items[n],(40+i*300,50))
        d.text((10,320),'Well native 220x220; full 2x sheet supplied separately.',fill='#e0d3af')
    else:
        x=12
        for n in names:
            im=items[n]; y=40 if n!='memory-crystal' else 270
            if n=='memory-crystal':x=390
            c.alpha_composite(im,(x,y));c.alpha_composite(im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST),(x+im.width+8,y));x+=im.width*3+20
    c.convert('RGB').save(P/('task06-'+group+'-contact-640x360.png'))
c=Image.new('RGBA',(920,500),'#17272a')
for i,n in enumerate(['well-closed','well-open']):c.alpha_composite(items[n].resize((440,440),Image.Resampling.NEAREST),(10+i*460,30))
c.convert('RGB').save(P/'task06-well-states-2x.png')
c=Image.new('RGBA',(640,360),'#17272a')
for i,n in enumerate(['panel-closed','panel-open']):c.alpha_composite(items[n].resize((232,296),Image.Resampling.NEAREST),(30+i*300,30))
c.convert('RGB').save(P/'task06-panel-states-2x-640x360.png')
baseline=json.loads((B/'task06-task05-baseline.json').read_text());preserved=all(sha(R/p)==h for p,h in baseline['sha256'].items())
checks=[]
for row in rows:
    im=Image.open(R/row['file']);a=im.getchannel('A');checks.append(dict(file=row['file'],result='PASS' if im.mode=='RGBA' and a.getextrema()[0]==0 and a.getbbox() else 'FAIL',alpha_extrema=a.getextrema()))
dump(B/'task06-asset-map.json',dict(sprites=rows,scenario_sha256=sha(R/'docs/scenario/03-library-beneath-the-roots.md'),socket_centers=centers,well_origin=[210,116],socket_order='clockwise from north horizon; identity not encoded',reward='independent crystal overlay; omit after collection',runtime='NOT_RUN'))
dump(B/'task06-validation.json',dict(technical_result='PASS' if preserved and all(x['result']=='PASS' for x in checks) else 'FAIL',checks=checks,task05_preserved='PASS' if preserved else 'FAIL',previews=[dict(file=str(p.relative_to(R)).replace('\\','/'),canvas=list(Image.open(p).size),sha256=sha(p)) for p in P.glob('task06*.png')],sources=[dict(file=str(p.relative_to(R)).replace('\\','/'),sha256=sha(p)) for p in (B/'sources').glob('task06*.png')],runtime='NOT_RUN',build='NOT_RUN',visual='pending inspection'))
print('PASS' if preserved else 'FAIL','task05 preserved;',len(rows),'room RGBA sprites exported')
