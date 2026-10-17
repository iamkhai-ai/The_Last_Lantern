import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import { getPathDoorFace, hasDoorPower, isPathPositionSafe, isValidPathPipeHop, nearestSafePathSpawn, pathDoorShouldClose, PATH_BODY, PATH_ROOMS, pathActorBody, rectsOverlap, resolvePathRoom, type PathPoint, type PathRect, type PathRoomId, type PathRoutePoint } from '../data/pathForTwoLayout';

export interface PathForTwoLevelOptions {
  scene: Phaser.Scene; progress: CampaignProgress; player: Player; lumo: Lumo; interactions: InteractionSystem; lantern: LanternSystem;
  save: () => void; say: (lines: DialogueLine[], onComplete?: () => void) => void; nextLevel: (lines: DialogueLine[]) => void;
}
const INTRO: DialogueLine[] = [
  {speaker:'Nhinh',text:'Cửa không có tay mở ở phía này.'},{speaker:'Lumo',text:'Tôi thấy ánh sáng sau khe đá. Để tôi nhìn thử.'},
  {speaker:'Nhinh',text:'Cậu vừa chui qua đó thật à?'},{speaker:'Lumo',text:'Nhỏ cũng có ích chứ. Bên này có một dấu giống cánh của tôi.'},
  {speaker:'Nhinh',text:'Trên mốc ngoài này cũng có. Mình thử nối chúng lại nhé?'},
];
const ENDING: DialogueLine[] = [{speaker:'Nhinh',text:'Tháp vẫn đang lấy nước.'},{speaker:'Lumo',text:'Và vẫn sáng, dù chẳng còn ai trên đó.'},{speaker:'Nhinh',text:'Mình lên xem nó đang đợi điều gì.'}];
const MEMORY: DialogueLine[] = [
  {speaker:'Lumo',text:'Tôi đã đi qua đây.'},{speaker:'Nhinh',text:'Trong đêm bão?'},{speaker:'Lumo',text:'Tôi nhớ mình rất vội. Có ai đó đứng ngoài gọi… nhưng tôi không nghe rõ tên.'},
  {speaker:'Nhinh',text:'Cậu có muốn nghỉ một chút không?'},{speaker:'Lumo',text:'Nếu đứng yên, tôi sợ sẽ quên mất.'},{speaker:'Nhinh',text:'Vậy mình ghi lại. Cậu không cần giữ tất cả một mình.'},{speaker:'Lumo',text:'Ghi cả vết xoắn này nhé.'},
];
const PLATE_ROOMS: Record<'practice'|'a'|'b'|'c',PathRoomId> = {practice:'entry',a:'entry',b:'relay',c:'ink'};
const PLATE_POINTS: Record<'practice'|'a'|'b'|'c',PathPoint> = {practice:{x:212,y:114},a:{x:546,y:114},b:{x:546,y:114},c:{x:558,y:244}};

export class PathForTwoLevel {
  private scene: Phaser.Scene; private progress: CampaignProgress; private player: Player; private lumo: Lumo;
  private interactions: InteractionSystem; private lantern: LanternSystem; private save: () => void;
  private say: PathForTwoLevelOptions['say']; private nextLevel: PathForTwoLevelOptions['nextLevel'];
  private room: PathRoomId = 'entry'; private objects: Phaser.GameObjects.GameObject[]=[]; private colliders: Phaser.Physics.Arcade.Collider[]=[];
  private bodies: Phaser.Physics.Arcade.StaticBody[]=[]; private doorImages = new Map<string,Phaser.GameObjects.Image>();
  private doorBraceImages=new Map<string,Phaser.GameObjects.Image>();
  private doorHeaderImages=new Map<string,Phaser.GameObjects.Image>();
  private doorPostImages=new Map<string,Phaser.GameObjects.Image[]>();
  private doorBodies = new Map<string,Phaser.Physics.Arcade.StaticBody>(); private protected: Phaser.GameObjects.GameObject[]=[];
  private route: PathRoutePoint[]=[]; private routeIndex=0; private assignment='follow'; private lumoRoom:PathRoomId='entry';
  private pendingClose=new Set<string>(); private roomTitle?:Phaser.GameObjects.Text; private roomObjective?:Phaser.GameObjects.Text; private routeGraphics?:Phaser.GameObjects.Graphics;
  private hintIndex=0; private hintStage=''; private destroyed=false; private lastLantern=false;
  private lastCheckpoint=0;
  constructor(o:PathForTwoLevelOptions){this.scene=o.scene;this.progress=o.progress;this.player=o.player;this.lumo=o.lumo;this.interactions=o.interactions;this.lantern=o.lantern;this.save=o.save;this.say=o.say;this.nextLevel=o.nextLevel;this.lastLantern=this.lantern.lanternOn;}
  private get lanternOn(){return this.lantern.lanternOn;}
  public build():void{
    this.normalizeProgress(); this.room=this.getSavedRoom(); this.assignment=this.getAssignment(); this.route=this.readRoute(); this.routeIndex=Math.max(0,Math.min(this.route.length,Math.floor(this.progress.counters['l4-route-index']??0)));
    this.lumoRoom=this.readLumoRoom(); const lp=this.getLumoPosition();
    this.lumo.sprite.setPosition(lp.x,lp.y); this.lumo.setVisible(this.lumoRoom===this.room);
    this.player.setFootPlacement(PATH_BODY.feetY,21+PATH_BODY.y,18+PATH_BODY.x,PATH_BODY.width,PATH_BODY.height);
    const saved=this.progress.counters['player-level']===4&&Number.isFinite(this.progress.counters['player-x'])&&Number.isFinite(this.progress.counters['player-y'])?{x:this.progress.counters['player-x'],y:this.progress.counters['player-y']}:undefined;
    const spawn=nearestSafePathSpawn(this.room,saved,this.isSafe.bind(this)); this.player.setPosition(spawn.x,spawn.y); this.drawRoom(); this.refresh();
  }
  public startOpeningDialogue():void{this.say(INTRO);}
  public destroy():void{if(this.destroyed)return;this.destroyed=true;this.colliders.forEach(c=>{if(c.active)c.destroy();});this.bodies.forEach(b=>{if(b.gameObject?.active)b.gameObject.destroy();});this.objects.forEach(o=>{if(o.active)o.destroy();});this.objects=[];this.interactions.clear();this.doorImages.clear();this.doorBraceImages.clear();this.doorHeaderImages.clear();this.doorPostImages.clear();this.doorBodies.clear();}
  public update(dt:number):void{
    if(this.destroyed)return; this.advanceLumo(dt); this.updateDoors(); this.updateInkProgress(); this.updateReunion();
    if(this.scene.time.now-this.lastCheckpoint>=600){this.lastCheckpoint=this.scene.time.now;if(this.isSafe(this.room,{x:this.player.x,y:this.player.y})){this.progress.flags['l4-room']=this.room;this.progress.counters['player-level']=4;this.progress.counters['player-x']=Math.round(this.player.x);this.progress.counters['player-y']=Math.round(this.player.y);this.save();}}
    this.refreshArt();this.roomTitle?.setText(`05  ${PATH_ROOMS[this.room].title}`); this.roomObjective?.setText(this.getObjectiveText()); this.refreshStatus();
  }
  public getProtectedPromptBounds():PromptRect[]{return this.protected.filter((o):o is Phaser.GameObjects.Image=>o instanceof Phaser.GameObjects.Image&&o.active&&o.visible).map(o=>o.getBounds());}
  public getObjectiveText():string{
    if(this.room==='entry'){
      if(this.assignment==='practice'&&this.isTravelling())return'Chờ Lumo tới ấn thử.';
      if(this.assignment==='practice'&&this.hasPower('practice'))return'Cửa thử đã mở. Quan sát rồi gọi Lumo về mốc.';
      if(!this.progress.flags['l4-practice-complete']&&!this.progress.flags['l4-called-a'])return'Thử gọi Lumo ở mốc gần cậu, rồi chờ cậu ấy xác nhận.';
      if(this.hasPower('a'))return'Qua cửa A. Gài chốt ở mặt bên kia trước khi gọi Lumo tới B.';
      return'Gọi Lumo tới ấn A sau cửa đầu.';
    }
    if(this.room==='relay')return !this.progress.flags['l4-latch-a']?'Gài chốt A ở mặt bên kia trước khi gọi Lumo tới B.':this.hasPower('b')?'Qua cửa B tới hành lang mực.':'Gọi Lumo tới ấn B.';
    if(!this.progress.flags['l4-latch-b'])return 'Gài chốt B trước khi gọi Lumo tới cuối hành lang.';
    if(!this.progress.flags['l4-ink-revealed'])return 'Tắt đèn bằng F rồi bước lên vạch mực trong hành lang.';
    if(!this.hasPower('c'))return 'Gọi Lumo tới ấn C ở đầu kia của hành lang.';
    if(!this.progress.flags['l4-latch-c'])return 'Tới tay gài C và giữ cửa ra.';
    if(!this.progress.flags['l4-reunited'])return 'Gọi Lumo trở lại, rồi chờ cậu ấy tới gần.';
    return 'Tới bậc thang và nhấn E.';
  }
  public getStatusText():string{return `Buồng ${PATH_ROOMS[this.room].title} · A ${this.progress.flags['l4-latch-a']?'giữ':'mở khi Lumo tới'} · B ${this.progress.flags['l4-latch-b']?'giữ':'chờ'} · C ${this.progress.flags['l4-latch-c']?'giữ':'chờ'} · Lumo: ${this.isTravelling()?'đang đi':this.hasPower('a')||this.hasPower('b')||this.hasPower('c')||this.hasPower('practice')?'đã tới':'theo Nhinh'}`;}
  public showHint():void{
    const stage=this.room==='entry'?'practice':this.room==='relay'?this.progress.flags['l4-latch-a']?'b':'a':!this.progress.flags['l4-latch-b']?'latch-b':!this.progress.flags['l4-ink-revealed']?'ink':!this.hasPower('c')?'c':'exit';
    if(stage!==this.hintStage){this.hintStage=stage;this.hintIndex=0;} const hints=['Dây rễ từ mốc gọi nối tới ấn bên kia cửa. Trong mỗi buồng còn có một tay chốt.','Tôi giữ ấn để cậu qua cửa. Cậu gài chốt rồi tôi mới có thể sang nơi khác.','Gọi tôi tới ấn đang mở cửa trước mặt, đi qua và gài chốt. Tại hành lang cuối, tắt đèn để đọc vạch nền.'];
    this.say([{speaker:'Hệ thống',text:hints[Math.min(this.hintIndex++,2)]}]);
  }
  public showJournal():void{const e:DialogueLine[]=[];if(this.progress.flags['l4-called-a'])e.push({speaker:'Nhinh',text:'Gọi Lumo tới ấn mở cửa, rồi qua cửa để gài chốt.'});if(this.progress.flags['l4-ink-revealed'])e.push({speaker:'Nhinh',text:'Đèn dịu xuống thì vạch mực trên nền hiện rõ.'});if(this.progress.flags['l4-memo'])e.push({speaker:'Lumo',text:'Vết xoắn trong đường ống gợi lại đêm bão và tiếng gọi ngoài kia.'});this.say([{speaker:'Nhinh',text:'Sổ tay giữ những điều hai đứa đã học.'},...(e.length?e:[{speaker:'Nhinh' as const,text:'Chưa ghi thêm manh mối nào.'}])]);}
  private normalizeProgress():void{
    if(this.progress.flags['l4-latch-c'])this.progress.flags['l4-latch-b']=true;
    if(this.progress.flags['l4-latch-b'])this.progress.flags['l4-latch-a']=true;
    if(this.progress.flags['l4-latch-a'])this.progress.flags['l4-visited-relay']=true;
    if(this.progress.flags['l4-latch-b']||this.progress.flags['l4-latch-c'])this.progress.flags['l4-visited-ink']=true;
    if(this.progress.flags['l4-at-a']!==true)this.progress.flags['l4-at-a']=false;
    if(this.progress.flags['l4-at-b']!==true)this.progress.flags['l4-at-b']=false;
    if(this.progress.flags['l4-at-c']!==true)this.progress.flags['l4-at-c']=false;
    if(!this.progress.flags['l4-room'])this.progress.flags['l4-room']=this.progress.flags['l4-latch-b']||this.progress.flags['l4-latch-c']?'ink':this.progress.flags['l4-latch-a']?'relay':'entry';
    const assignment=this.progress.flags['l4-assignment'];
    if(!['follow','practice','a','b','c'].includes(String(assignment))){
      this.progress.flags['l4-assignment']=this.progress.flags['l4-reunited']?'follow':this.progress.flags['l4-called-c']?'c':this.progress.flags['l4-called-b']?'b':this.progress.flags['l4-called-a']?'a':'follow';
    }
    this.save();
  }
  private getSavedRoom():PathRoomId{return resolvePathRoom(this.progress.flags['l4-room'],this.progress.flags['l4-visited-relay']===true,this.progress.flags['l4-visited-ink']===true,this.progress.flags['l4-latch-a']===true,this.progress.flags['l4-latch-b']===true,this.progress.flags['l4-latch-c']===true);}
  private getAssignment():string{const a=this.progress.flags['l4-assignment'];return typeof a==='string'?a:'follow';}
  private readLumoRoom():PathRoomId{const r=this.progress.flags['l4-lumo-room'];return r==='relay'||r==='ink'?r:'entry';}
  private readRoute():PathRoutePoint[]{const raw=this.progress.flags['l4-route'];if(typeof raw!=='string')return[];try{const v=JSON.parse(raw);return Array.isArray(v)?v.filter((p):p is PathRoutePoint=>p&&['entry','relay','ink'].includes(p.room)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=24&&p.x<=616&&p.y>=80&&p.y<=310):[];}catch{return[];}}
  private getLumoPosition():PathPoint{return{x:this.progress.counters['l4-lumo-x']??this.progress.counters['lumo-x']??180,y:this.progress.counters['l4-lumo-y']??this.progress.counters['lumo-y']??250};}
  private isSafe(room:PathRoomId,p:PathPoint):boolean{return isPathPositionSafe(room,p,{latches:{a:this.progress.flags['l4-latch-a']===true||this.hasPower('a'),b:this.progress.flags['l4-latch-b']===true||this.hasPower('b'),c:this.progress.flags['l4-latch-c']===true||this.hasPower('c'),practice:this.hasPower('practice')}});}
  private drawRoom():void{
    this.interactions.clear();this.colliders.forEach(c=>{if(c.active)c.destroy();});this.bodies.forEach(b=>{if(b.gameObject?.active)b.gameObject.destroy();});this.objects.forEach(o=>{if(o.active)o.destroy();});this.objects=[];this.colliders=[];this.bodies=[];this.doorImages.clear();this.doorBraceImages.clear();this.doorHeaderImages.clear();this.doorPostImages.clear();this.doorBodies.clear();this.protected=[];
    const def=PATH_ROOMS[this.room]; const floor=this.scene.add.tileSprite(0,0,640,360,'ground_stone').setOrigin(0).setTint(this.room==='ink'?0x8f8f87:0xb4a88d).setDepth(0);this.track(floor);
    const graphics=this.scene.add.graphics().setDepth(1);graphics.fillStyle(0x302b28,0.96);for(const wall of def.walls)graphics.fillRect(wall.x,wall.y,wall.width,wall.height);graphics.lineStyle(2,0x716351,0.7);for(const wall of def.walls)graphics.strokeRect(wall.x,wall.y,wall.width,wall.height);this.track(graphics);
    for(const wall of def.walls)this.addCollider(wall);
    for(const solid of def.solids)this.addCollider(solid);
    this.routeGraphics=this.scene.add.graphics().setDepth(5);this.track(this.routeGraphics);this.drawTubeRoutes();
    if(this.room==='ink'){
      for(const x of [304,412]){const ink=this.scene.add.image(x,242,getLevelArtKey(4,this.lanternOn?'ink-route-bright':'ink-route-dark')??'').setDepth(4).setData('path-id','ink-route');this.track(ink);}
      this.addNativeArt('tube-mouth',82,280,Phaser.Math.DegToRad(180));
      this.addNativeArt('tube-mouth',574,136,0);
    }else if(this.room==='relay'){
      this.addNativeArt('tube-mouth',110,280,Phaser.Math.DegToRad(180));this.addNativeArt('tube-mouth',480,190,0);
    }else{
      this.addNativeArt('tube-mouth',156,190,0);this.addNativeArt('tube-mouth',480,190,0);
    }
    for(const e of def.elements){const key=getLevelArtKey(4,e.art);if(!key)continue;const centerY=e.id==='spiral'?e.y:e.y-e.height/2;const image=this.scene.add.image(e.x,centerY,key).setDisplaySize(e.width,e.height).setDepth(e.art.startsWith('call')||e.art.startsWith('latch')?this.depthAt(e.y):5);this.track(image);if(e.id.startsWith('call')||e.id.startsWith('latch')||e.id==='spiral')this.protected.push(image);image.setData('path-id',e.id);}
    this.addDoors();this.drawRoomHud();this.registerRoomInteractions();this.refreshArt();
  }
  private drawTubeRoutes():void{
    if(!this.routeGraphics)return;
    const routes:PathPoint[][]=this.room==='entry'?
      [[{x:76,y:268},{x:110,y:220},{x:156,y:190},{x:180,y:146},{x:212,y:114}],
       [{x:384,y:256},{x:440,y:232},{x:480,y:190},{x:520,y:150},{x:546,y:114}]]:
      this.room==='relay'?
      [[{x:360,y:256},{x:420,y:232},{x:480,y:190},{x:520,y:150},{x:546,y:114}],
       [{x:110,y:280},{x:140,y:280},{x:220,y:280},{x:320,y:250},{x:420,y:220},{x:480,y:190}]]:
      [[{x:82,y:280},{x:122,y:242},{x:122,y:210},{x:180,y:242},{x:360,y:242},{x:558,y:244}]];
    for(const points of routes){
      this.routeGraphics.lineStyle(10,0x403328,0.88);
      this.routeGraphics.beginPath();this.routeGraphics.moveTo(points[0].x,points[0].y);
      for(const p of points.slice(1))this.routeGraphics.lineTo(p.x,p.y);
      this.routeGraphics.strokePath();
      this.routeGraphics.lineStyle(3,0x9bb99a,0.8);
      this.routeGraphics.beginPath();this.routeGraphics.moveTo(points[0].x,points[0].y);
      for(const p of points.slice(1))this.routeGraphics.lineTo(p.x,p.y);
      this.routeGraphics.strokePath();
      this.addTubeModules(points);
    }
    if(this.room==='entry'){
      this.addCable('practice',routes[0][0],routes[0][routes[0].length-1]);
      this.addCable('a',routes[1][0],routes[1][routes[1].length-1]);
    }else if(this.room==='relay'){
      this.addCable('b',routes[0][0],routes[0][routes[0].length-1]);
      this.addCable('a',routes[1][0],routes[1][routes[1].length-1]);
    }else{
      this.addCable('c',{x:180,y:242},{x:558,y:244});
    }
  }
  private addTubeModules(points:PathPoint[]):void{
    const key=getLevelArtKey(4,'tube-straight');
    if(!key)return;
    for(let i=1;i<points.length;i++){
      const start=points[i-1],end=points[i];
      const length=Math.hypot(end.x-start.x,end.y-start.y);
      const pieces=Math.max(1,Math.ceil(length/56));
      const angle=Math.atan2(end.y-start.y,end.x-start.x);
      for(let piece=0;piece<pieces;piece++){
        const along=Math.min(length,(piece+0.5)*length/pieces);
        const image=this.scene.add.image(start.x+Math.cos(angle)*along,start.y+Math.sin(angle)*along,key).setRotation(angle).setDepth(4.5);
        this.track(image);
      }
    }
  }
  private addCable(mark:'practice'|'a'|'b'|'c',start:PathPoint,end:PathPoint):void{
    const key=getLevelArtKey(4,'root-cable-rest');
    if(!key)return;
    const image=this.scene.add.image((start.x+end.x)/2,(start.y+end.y)/2,key)
      .setRotation(Math.atan2(end.y-start.y,end.x-start.x)).setDepth(6).setData('path-id','cable').setData('path-cable',mark);
    this.track(image);
  }
  private addNativeArt(filename:string,x:number,y:number,rotation=0):void{
    const key=getLevelArtKey(4,filename);if(!key)return;
    const image=this.scene.add.image(x,y,key).setRotation(rotation).setDepth(4);this.track(image);
  }
  private addDoorFrameStrips(face:{id:string;x:number;base:number}):void{
    const artKey=getLevelArtKey(4,'door-open');
    if(!artKey)return;
    const x=face.x,y=face.base-44;
    const header=this.scene.add.image(x,y,this.createDoorLayerTexture(artKey,'header')).setDisplaySize(64,88).setDepth(70);
    this.track(header);
    this.doorHeaderImages.set(face.id,header);
    const posts=(['left-post','right-post'] as const).map(layer=>{
      const image=this.scene.add.image(x,y,this.createDoorLayerTexture(artKey,layer)).setDisplaySize(64,88).setDepth(this.depthAt(face.base)+0.1);
      this.track(image);
      return image;
    });
    this.doorPostImages.set(face.id,posts);
  }
  private createDoorLayerTexture(artKey:string,layer:'header'|'left-post'|'right-post'):string{
    const textureKey=`path05-${artKey}-${layer}`;
    if(this.scene.textures.exists(textureKey))return textureKey;
    const source=this.scene.textures.get(artKey).getSourceImage() as HTMLImageElement;
    const texture=this.scene.textures.createCanvas(textureKey,64,88);
    if(!texture)throw new Error(`Could not create Level 05 door frame layer: ${layer}`);
    const region=layer==='header'?[0,0,64,24]:layer==='left-post'?[0,0,14,88]:[50,0,14,88];
    const context=texture.getContext();
    context.save();
    context.beginPath();
    context.rect(region[0],region[1],region[2],region[3]);
    context.clip();
    context.drawImage(source,0,0,64,88);
    context.restore();
    texture.refresh();
    return textureKey;
  }
  private addDoorBrace(face:{id:string;x:number;base:number},latched:boolean):void{
    const key=getLevelArtKey(4,'door-held-overlay');if(!key)return;
    const image=this.scene.add.image(face.x,face.base-44,key).setDisplaySize(64,88).setDepth(72).setVisible(latched);
    image.setData('door-brace',face.id);this.track(image);this.doorBraceImages.set(face.id,image);
  }
  private isDoorLatched(id:string):boolean{return id==='a'?this.progress.flags['l4-latch-a']===true:id==='b'?this.progress.flags['l4-latch-b']===true:id==='c'?this.progress.flags['l4-latch-c']===true:false;}
  private isDoorPowered(id:string):boolean{return id==='practice'?this.hasPower('practice'):id==='a'?this.hasPower('a'):id==='b'?this.hasPower('b'):this.hasPower('c');}
  private drawRoomHud():void{const t=this.scene.add.text(16,13,`05  ${PATH_ROOMS[this.room].title}`,{fontFamily:'Segoe UI, sans-serif',fontSize:'13px',fontStyle:'bold',color:'#f7dfaa',backgroundColor:'#07151cbb',padding:{x:8,y:5}}).setDepth(86);this.track(t);this.roomTitle=t;this.roomObjective=this.scene.add.text(16,42,'',{fontFamily:'Segoe UI, sans-serif',fontSize:'11px',color:'#e5eee8',backgroundColor:'#07151cbb',padding:{x:8,y:5}}).setDepth(86);this.track(this.roomObjective);const status=this.scene.add.text(16,320,'',{fontFamily:'Segoe UI, sans-serif',fontSize:'9px',color:'#d3e5dc',backgroundColor:'#07151cbb',padding:{x:8,y:4}}).setDepth(86);this.track(status);this.scene.add.text(624,320,'H · Gợi ý     J · Sổ tay',{fontFamily:'Segoe UI, sans-serif',fontSize:'9px',color:'#ffe680',backgroundColor:'#07151cbb',padding:{x:8,y:4}}).setOrigin(1,0).setDepth(86);}
  private registerRoomInteractions():void{
    const reg=(c:InteractableConfig)=>this.interactions.register(c);const def=PATH_ROOMS[this.room];
    for(const e of def.elements){if(e.id.startsWith('plate-'))continue;reg({id:`l4-${e.id}`,x:e.stand.x,y:e.stand.y,radius:22,getPrompt:()=>this.prompt(e.id),getPromptBounds:()=>this.imageFor(e.id)?.getBounds()??null,isEnabled:()=>this.interactionEnabled(e.id),onInteract:()=>this.interact(e.id)});}
    const doors=this.room==='entry'?[['practice',156,221],['a',480,221]]:this.room==='relay'?[['a',110,280],['b',480,221]]:[['b',82,280],['c',574,188]];
    for(const [id,x,y] of doors as Array<[string,number,number]>)reg({id:`l4-door-${id}`,x,y,radius:34,getPrompt:()=>id==='practice'?'E · Thử cửa thấp':id==='c'?'E · Lên tháp':`E · Qua cửa ${id.toUpperCase()}`,getPromptBounds:()=>this.doorImages.get(id)?.getBounds()??null,onInteract:()=>this.useDoor(id),isEnabled:()=>true});
  }
  private prompt(id:string):string{if(id.includes('call'))return this.assignment==='follow'?'E · Gọi Lumo qua ống':'E · Gọi Lumo về mốc';if(id==='latch-a')return this.progress.flags['l4-latch-a']?'Cửa A đã giữ':'E · Gài chốt A';if(id==='latch-b')return this.progress.flags['l4-latch-b']?'Cửa B đã giữ':'E · Gài chốt B';if(id==='latch-c')return this.progress.flags['l4-latch-c']?'E · Gọi Lumo về':'E · Gài chốt cửa ra';if(id==='spiral')return 'E · Đọc vết xoắn';return 'E · Tương tác';}
  private interactionEnabled(id:string):boolean{if(id==='latch-a')return this.room==='relay'&&this.progress.flags['l4-latch-a']!==true;if(id==='latch-b')return this.room==='ink'&&this.progress.flags['l4-latch-b']!==true;if(id==='latch-c')return this.room==='ink'&&(this.progress.flags['l4-latch-c']===true||this.hasPower('c')&&this.progress.flags['l4-latch-b']===true&&this.progress.flags['l4-ink-revealed']===true);if(id==='spiral')return this.progress.flags['l4-latch-c']===true;return true;}
  private interact(id:string):void{
    if(id.startsWith('call')||id==='inner-call'){if(this.assignment!=='follow'){this.recallToCall(id);return;}if(id==='practice-call'||id==='inner-call')this.send('practice');else if(id.includes('call-a'))this.send('a');else if(id.includes('call-b')){if(!this.progress.flags['l4-latch-a']){this.say([{speaker:'Nhinh',text:'Mình nên giữ cửa A trước khi Lumo rời ấn.'}]);return;}this.send('b');}else if(id.includes('call-c')){if(!this.progress.flags['l4-latch-b']){this.say([{speaker:'Nhinh',text:'Cửa B cần được gài trước.'}]);return;}this.send('c');}return;}
    if(id==='latch-a'){if(this.room==='relay'&&this.progress.flags['l4-visited-relay']&&this.hasPower('a')){this.progress.flags['l4-latch-a']=true;this.progress.flags['l4-at-a']=false;this.say([{speaker:'Nhinh',text:'Cửa đã giữ được rồi. Cậu qua mốc tiếp theo nhé.'},{speaker:'Lumo',text:'Lần này cậu giữ đường cho tôi.'}]);this.save();}return;}
    if(id==='latch-b'){if(this.room==='ink'&&this.progress.flags['l4-visited-ink']&&this.hasPower('b')){this.progress.flags['l4-latch-b']=true;this.progress.flags['l4-at-b']=false;this.save();}return;}
    if(id==='latch-c'){if(!this.progress.flags['l4-latch-c']){if(this.hasPower('c')&&this.progress.flags['l4-latch-b']&&this.progress.flags['l4-ink-revealed']){this.progress.flags['l4-latch-c']=true;this.save();if(!this.progress.flags['l4-memo'])this.say(MEMORY,()=>{this.progress.flags['l4-memo']=true;this.save();});}}else this.recallToCall(id);return;}
    if(id==='spiral'){this.progress.flags['l4-memo']=true;this.save();this.say(MEMORY);}
  }
  private send(mark:'practice'|'a'|'b'|'c'):void{
    if(mark!=='practice'&&this.progress.flags[`l4-latch-${mark}`]){this.say([{speaker:'Lumo',text:'Đường này đã giữ rồi. Tôi có thể đi cùng cậu.'}]);return;}
    this.assignment=mark;
    this.progress.flags['l4-assignment']=mark;
    this.progress.flags[`l4-called-${mark}`]=true;
    for(const name of ['practice','a','b','c'])this.progress.flags[`l4-at-${name}`]=false;
    const targetRoom=PLATE_ROOMS[mark];
    this.route=[{room:this.lumoRoom,x:this.lumo.sprite.x,y:this.lumo.sprite.y},...this.pipeRoute(this.lumoRoom,this.room),{room:this.room,x:this.player.x,y:this.player.y},...this.pipeRoute(this.room,targetRoom),...this.localRoute(mark)];
    this.routeIndex=0;
    this.persistRoute();
    this.say([{speaker:'Nhinh',text:'Lumo, cậu ở lại dấu đó một chút được không?'},{speaker:'Lumo',text:'Được! Tôi sẽ chờ tới khi cậu gọi.'}]);this.save();
  }
  private localRoute(mark:'practice'|'a'|'b'|'c'):PathRoutePoint[]{
    const room=PLATE_ROOMS[mark], plate=PLATE_POINTS[mark];
    if(mark==='practice')return[{room,x:110,y:220},{room,x:156,y:190},{room,x:180,y:146},{room,...plate}];
    if(mark==='a')return[{room,x:440,y:232},{room,x:480,y:190},{room,x:520,y:150},{room,...plate}];
    if(mark==='b')return[{room,x:420,y:232},{room,x:480,y:190},{room,x:520,y:150},{room,...plate}];
    return[{room,x:180,y:242},{room,x:360,y:242},{room,...plate}];
  }
  private pipeRoute(from:PathRoomId,to:PathRoomId):PathRoutePoint[]{
    const route:PathRoutePoint[]=[];let current=from;
    while(current!==to){
      if(current==='entry'){
        route.push({room:'entry',x:440,y:232},{room:'entry',x:480,y:190,pipe:'a',end:'out'},
          {room:'relay',x:110,y:280,pipe:'a',end:'in'},{room:'relay',x:140,y:280});current='relay';
      }else if(current==='ink'){
        route.push({room:'ink',x:558,y:244},{room:'ink',x:360,y:242},{room:'ink',x:180,y:242},
          {room:'ink',x:122,y:210},{room:'ink',x:122,y:242},{room:'ink',x:82,y:280,pipe:'b',end:'out'},
          {room:'relay',x:480,y:190,pipe:'b',end:'in'},{room:'relay',x:420,y:220});current='relay';
      }else if(to==='entry'){
        route.push({room:'relay',x:320,y:250},{room:'relay',x:220,y:280},{room:'relay',x:140,y:280},{room:'relay',x:110,y:280,pipe:'a',end:'out'},
          {room:'entry',x:480,y:190,pipe:'a',end:'in'},{room:'entry',x:440,y:232});current='entry';
      }else{
        route.push({room:'relay',x:320,y:250},{room:'relay',x:420,y:232},{room:'relay',x:480,y:190,pipe:'b',end:'out'},
          {room:'ink',x:82,y:280,pipe:'b',end:'in'},{room:'ink',x:122,y:242},{room:'ink',x:122,y:210});current='ink';
      }
    }
    return route;
  }
  private recallToCall(id:string):void{
    const finalRecall=id==='latch-c'&&this.progress.flags['l4-latch-c'];
    const previousAssignment=this.assignment;
    const point={x:this.player.x,y:this.player.y};
    this.assignment='follow';this.progress.flags['l4-assignment']='follow';
    if(previousAssignment==='practice')this.progress.flags['l4-practice-complete']=true;
    if(previousAssignment==='practice'||previousAssignment==='a'||previousAssignment==='b'||previousAssignment==='c')this.progress.flags[`l4-at-${previousAssignment}`]=false;
    if(finalRecall){this.progress.flags['l4-return-called']=true;this.progress.flags['l4-reunited']=false;}
    this.route=[{room:this.lumoRoom,x:this.lumo.sprite.x,y:this.lumo.sprite.y},...this.pipeRoute(this.lumoRoom,this.room),{room:this.room,x:point.x,y:point.y}];
    this.routeIndex=0;this.persistRoute();this.save();
  }
  private persistRoute():void{this.progress.flags['l4-route']=JSON.stringify(this.route);this.progress.counters['l4-route-index']=this.routeIndex;this.progress.flags['l4-lumo-room']=this.lumoRoom;}
  private advanceLumo(dt:number):void{
    if(this.routeIndex<this.route.length){
      const target=this.route[this.routeIndex];
      if(target.room!==this.lumoRoom&&!this.isPairedPipeHop(target)){
        this.cancelInvalidRoute();
        return;
      }
      if(target.room!==this.lumoRoom){
        this.lumoRoom=target.room;
        this.lumo.sprite.setPosition(target.x,target.y);
        this.progress.flags['l4-lumo-room']=this.lumoRoom;
        this.save();
      }
      this.lumo.setVisible(this.lumoRoom===this.room);
      this.lumo.update(dt,target.x-18,target.y+12,true);
      if(Math.hypot(this.lumo.sprite.x-target.x,this.lumo.sprite.y-target.y)<8){
        this.lumo.sprite.setPosition(target.x,target.y);
        this.routeIndex++;
        this.progress.counters['l4-route-index']=this.routeIndex;
        this.progress.counters['l4-lumo-x']=target.x;
        this.progress.counters['l4-lumo-y']=target.y;
        if(this.routeIndex>=this.route.length)this.completeRoute(target.room);
        this.save();
      }
    }else if(this.assignment==='follow'&&this.lumoRoom===this.room){
      const targetX=Phaser.Math.Clamp(this.player.x-22,30,610);
      const targetY=Phaser.Math.Clamp(this.player.y-18,88,300);
      this.lumo.update(dt,targetX,targetY,true);
    }
    this.lumo.setVisible(this.lumoRoom===this.room);
    this.progress.counters['l4-lumo-x']=Math.round(this.lumo.sprite.x);
    this.progress.counters['l4-lumo-y']=Math.round(this.lumo.sprite.y);
  }
  private isPairedPipeHop(target:PathRoutePoint):boolean{
    const prior=this.route[this.routeIndex-1];
    return isValidPathPipeHop(prior,target);
  }
  private cancelInvalidRoute():void{
    this.route=[];
    this.routeIndex=0;
    this.assignment='follow';
    this.progress.flags['l4-assignment']='follow';
    this.progress.flags['l4-route']='';
    this.progress.counters['l4-route-index']=0;
    this.save();
  }
  private completeRoute(room:PathRoomId):void{
    const mark=this.assignment;
    this.route=[];
    this.routeIndex=0;
    this.progress.flags['l4-route']='';
    this.progress.counters['l4-route-index']=0;
    this.lumoRoom=room;
    this.progress.flags['l4-lumo-room']=room;
    if(mark==='practice'||mark==='a'||mark==='b'||mark==='c'){
      this.progress.flags[`l4-at-${mark}`]=true;
      this.progress.flags['l4-lumo-arrived']=mark;
      this.say([
        {speaker:'Lumo',text:'Tôi tới rồi. Cửa có mở không?'},
        {speaker:'Nhinh',text:'Có. Khi cậu rời dấu, nó sẽ đóng lại đúng không?'},
        {speaker:'Lumo',text:'Vậy trước khi gọi tôi về, hãy xem cậu có cần nó nữa không.'},
      ]);
    }
  }
  private isTravelling():boolean{return this.routeIndex<this.route.length;}
  private getPowerState(){return{assignment:this.assignment,lumoRoom:this.lumoRoom,lumoX:this.lumo.sprite.x,lumoY:this.lumo.sprite.y};}
  private hasPower(mark:'practice'|'a'|'b'|'c'):boolean{if(this.progress.flags[`l4-latch-${mark}`]===true)return true;return hasDoorPower(mark,this.getPowerState());}
  private useDoor(id:string):void{
    if(id==='practice'){if(!this.hasPower('practice'))this.say([{speaker:'Nhinh',text:'Cửa thử chỉ mở khi Lumo đã tới ấn bên kia.'}]);else this.say([{speaker:'Nhinh',text:'Cửa thử đã mở. Mình có thể đi qua rồi gọi Lumo về.'}]);return;}
    if(id==='c'){if(this.progress.flags['l4-latch-c']&&this.progress.flags['l4-reunited']&&this.progress.flags['l4-memo'])this.nextLevel(ENDING);return;}
    const mark=id as 'a'|'b';if(!this.hasPower(mark)){this.say([{speaker:'Nhinh',text:`Cần Lumo ở ấn ${mark.toUpperCase()} trước khi qua cửa.`}]);return;}
    if(mark==='a'&&this.room==='entry'&&this.lumoRoom==='entry'){this.transition('relay',{x:110,y:251},'l4-visited-relay');return;}
    if(mark==='a'&&this.room==='relay'){this.transition('entry',{x:180,y:280},'l4-room');return;}
    if(mark==='b'&&this.room==='relay'&&this.lumoRoom==='relay'){this.transition('ink',{x:82,y:251},'l4-visited-ink');return;}
    if(mark==='b'&&this.room==='ink'){this.transition('relay',{x:110,y:251},'l4-room');return;}
  }
  private transition(to:PathRoomId,spawn:PathPoint,visitFlag:string):void{
    if(visitFlag.startsWith('l4-visited'))this.progress.flags[visitFlag]=true;this.room=to;this.progress.flags['l4-room']=to;this.progress.counters['player-x']=spawn.x;this.progress.counters['player-y']=spawn.y;this.progress.counters['player-level']=4;this.player.setPosition(spawn.x,spawn.y);this.save();this.drawRoom();this.refresh();if(to==='ink'&&this.lanternOn&&!this.progress.flags['l4-ink-observed-lit']){this.progress.flags['l4-ink-observed-lit']=true;this.save();this.say([{speaker:'Nhinh',text:'Đường vạch lại biến mất.'},{speaker:'Lumo',text:'Giống những trang sách dưới rễ cây.'},{speaker:'Nhinh',text:'Mình tắt đèn. Cậu chờ ở đầu bên kia nhé.'}]);}}
  private addDoors():void{
    const ids=this.room==='entry'?['practice','a']:this.room==='relay'?['a','b']:['b','c'];
    for(const id of ids){
      const face=getPathDoorFace(id,this.room);
      if(!face)continue;
      const latched=this.isDoorLatched(id);
      const occupied=this.thresholdOccupied(id);
      const open=this.isDoorPowered(id)||latched||occupied;
      const key=getLevelArtKey(4,open?'door-open':'door-closed');
      const image=this.scene.add.image(face.x,face.base-44,key??'').setDisplaySize(64,88).setDepth(4);
      this.track(image);
      this.doorImages.set(id,image);
      const threshold=this.scene.add.rectangle(face.x,face.base-15,44,30,0,0).setVisible(false);
      this.scene.physics.add.existing(threshold,true);
      const body=threshold.body as Phaser.Physics.Arcade.StaticBody;
      body.enable=pathDoorShouldClose(this.isDoorPowered(id),occupied,latched);
      this.track(threshold);
      this.bodies.push(body);
      this.colliders.push(this.scene.physics.add.collider(this.player.sprite,threshold));
      this.doorBodies.set(id,body);
      this.addDoorBrace({...face,id},latched);
      this.addDoorFrameStrips({...face,id});
    }
  }
  private thresholdOccupied(id:string):boolean{
    const face=getPathDoorFace(id,this.room);
    return face?rectsOverlap(pathActorBody({x:this.player.x,y:this.player.y}),{x:face.x-22,y:face.base-30,width:44,height:30}):false;
  }
  private updateDoors():void{
    for(const [id,body] of this.doorBodies){
      const powered=this.isDoorPowered(id);
      const latched=this.isDoorLatched(id);
      const occupied=this.thresholdOccupied(id);
      body.enable=pathDoorShouldClose(powered,occupied,latched);
      if(!powered&&!latched&&occupied)this.pendingClose.add(id);
      else this.pendingClose.delete(id);
      const image=this.doorImages.get(id);
      const texture=getLevelArtKey(4,powered||latched||occupied?'door-open':'door-closed');
      if(image&&texture){
        image.setTexture(texture);
        const header=this.doorHeaderImages.get(id);
        if(header)header.setTexture(this.createDoorLayerTexture(texture,'header'));
        const posts=this.doorPostImages.get(id)??[];
        posts[0]?.setTexture(this.createDoorLayerTexture(texture,'left-post'));
        posts[1]?.setTexture(this.createDoorLayerTexture(texture,'right-post'));
      }
      this.doorBraceImages.get(id)?.setVisible(latched);
    }
  }
  private updateInkProgress():void{if(this.room==='ink'&&!this.lanternOn&&!this.progress.flags['l4-ink-revealed']&&rectsOverlap(pathActorBody({x:this.player.x,y:this.player.y}),{x:184,y:218,width:348,height:48})){this.progress.flags['l4-ink-revealed']=true;this.save();this.say([{speaker:'Lumo',text:'Ở đây, Nhinh! Cậu sắp tới rồi.'},{speaker:'Nhinh',text:'Thấy cậu rồi.'}]);}if(this.lastLantern!==this.lanternOn){this.lastLantern=this.lanternOn;const i=this.objects.find(o=>o instanceof Phaser.GameObjects.Image&&o.getData('path-id')==='ink-route');if(i instanceof Phaser.GameObjects.Image){const k=getLevelArtKey(4,this.lanternOn?'ink-route-bright':'ink-route-dark');if(k)i.setTexture(k);}}}
  private updateReunion():void{if(this.progress.flags['l4-return-called']&&!this.progress.flags['l4-reunited']&&this.room===this.lumoRoom&&Math.hypot(this.player.x-this.lumo.sprite.x,this.player.y-this.lumo.sprite.y)<36){this.progress.flags['l4-reunited']=true;this.save();}}
  private refresh():void{this.refreshArt();this.updateDoors();this.refreshStatus();}
  private refreshArt():void{
    for(const object of this.objects){
      if(!(object instanceof Phaser.GameObjects.Image))continue;
      const id=object.getData('path-id');
      if(typeof id!=='string')continue;
      let texture:string|null|undefined;
      if(id.startsWith('latch-')){
        const latch=id.slice(6);
        texture=getLevelArtKey(4,this.progress.flags[`l4-latch-${latch}`]===true?'latch-latched':'latch-unlatched');
      }else if(id==='spiral'&&this.progress.flags['l4-memo']){
        object.setAlpha(0.62);
      }else if(id.startsWith('call')||id==='inner-call'){
        const mark=id.includes('practice')||id==='inner-call'?'practice':id.includes('-a')?'a':id.includes('-b')?'b':'c';
        const state=this.hasPower(mark as 'practice'|'a'|'b'|'c')?'arrived':this.assignment===mark?'sent':'idle';
        texture=getLevelArtKey(4,`call-${state}`);
      }else if(id.startsWith('plate-')){
        const mark=id.slice('plate-'.length) as 'practice'|'a'|'b'|'c';
        texture=getLevelArtKey(4,this.hasPower(mark)?'pressure-occupied':'pressure-empty');
      }else if(id==='ink-route'){
        texture=getLevelArtKey(4,this.lanternOn?'ink-route-bright':'ink-route-dark');
      }else if(id==='cable'){
        const mark=object.getData('path-cable') as 'practice'|'a'|'b'|'c';
        const state=this.hasPower(mark)?'arrived':this.assignment===mark?'flow':'rest';
        texture=getLevelArtKey(4,`root-cable-${state}`);
      }
      if(texture)object.setTexture(texture);
    }
  }
  private refreshStatus():void{const status=this.objects.find(o=>o instanceof Phaser.GameObjects.Text&&o.y===320);if(status instanceof Phaser.GameObjects.Text)status.setText(this.getStatusText());}
  private imageFor(id:string):Phaser.GameObjects.Image|undefined{return this.objects.find(o=>o instanceof Phaser.GameObjects.Image&&o.getData('path-id')===id) as Phaser.GameObjects.Image|undefined;}
  private addCollider(rect:PathRect):void{const o=this.scene.add.rectangle(rect.x+rect.width/2,rect.y+rect.height/2,rect.width,rect.height,0,0).setVisible(false);this.scene.physics.add.existing(o,true);const body=o.body as Phaser.Physics.Arcade.StaticBody;this.track(o);this.bodies.push(body);this.colliders.push(this.scene.physics.add.collider(this.player.sprite,o));}
  private depthAt(y:number):number{return 10+y/10;}
  private track(o:Phaser.GameObjects.GameObject):void{this.objects.push(o);}
}
