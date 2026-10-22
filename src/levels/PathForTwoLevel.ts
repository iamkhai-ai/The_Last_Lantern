import { tr } from '../i18n/catalog.ts';
import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import type { Player } from '../actors/Player';
import type { Lumo } from '../actors/Lumo';
import type { CampaignProgress } from '../systems/CampaignSaveSystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { LanternSystem } from '../systems/LanternSystem';
import type { DialogueLine, InteractableConfig } from '../types/gameTypes';
import type { PromptRect } from '../systems/interactionPromptLayout';
import { isFootInReach } from '../systems/interactionReach';
import { choosePathCallAction, buildPathSchematic, getPathBackArrival, getPathControlStand, getPathDoorFace, getPathElementArtRect, getPathExitBlock, getPathLocalLeg, getPathPipePoint, getPathRouteLine, hasDoorPower, isActuallyReunited, isNearPathPipeEndpoint, isPathApproachAllowed, isPathDoorApproachAllowed, isPathInteractHeld, isPathPositionSafe, isPathRouteValid, isPathSeal, isPathThresholdOccupied, isValidPathPipeHop, nearestSafePathSpawn, parsePathRoute, pathDoorShouldClose, pathRouteCableSegments, pathRouteCorners, pathRoutePoints, PATH_BODY, PATH_CONTROL_STANDS, PATH_ELEMENT_RADIUS, PATH_INK_CORRIDOR, PATH_ROOMS, PATH_ROUTE_LINES, PATH_SCHEMATIC, PATH_SCHEMATIC_SIZE, PATH_TUBE_MOUTHS, pathActorBody, rectsOverlap, resolvePathRoom, shouldRebuildLegacyPathAssignment, shouldRecoverPathFollower, shouldRoutePathFollower, type PathElement, type PathMark, type PathPoint, type PathRect, type PathRoomId, type PathRoutePoint } from '../data/pathForTwoLayout';

export interface PathForTwoLevelOptions {
  scene: Phaser.Scene; progress: CampaignProgress; player: Player; lumo: Lumo; interactions: InteractionSystem; lantern: LanternSystem;
  save: () => void; say: (lines: DialogueLine[], onComplete?: () => void) => void; nextLevel: (lines: DialogueLine[]) => void; canStartStory: () => boolean;
}
/**
 * Approved Level 05 copy — docs/scenario/05-a-path-for-two-dialogue-approved.md.
 * Every character line below is verbatim from that document; the controller predicates decide when
 * a line is allowed to speak, so speech never claims a state that has not actually happened.
 */
const INTRO: DialogueLine[] = [
  {speaker:'Nhinh',text:'Cửa đóng rồi. Phía này không có tay mở.'},
  {speaker:'Lumo',text:'Có một đường ống nhỏ bên cạnh. Tôi chui qua được.'},
  {speaker:'Nhinh',text:'Dấu cạnh đường ống trông giống cánh của cậu.'},
  {speaker:'Lumo',text:'Để tôi đi theo đường này xem bên kia có gì nhé?'},
  {speaker:'Nhinh',text:'Ừ. Tôi chờ ở đây.'},
];
const ENDING: DialogueLine[] = [
  {speaker:'Nhinh',text:'Nước đang bị hút lên tháp.'},
  {speaker:'Lumo',text:'Ngọn đèn trên đó vẫn sáng…'},
  {speaker:'Nhinh',text:'Mình lên xem có cách trả nước về suối không.'},
];
const MEMORY: DialogueLine[] = [
  {speaker:'Lumo',text:'Vết xoắn kia… Tôi đã thấy nó rồi.'},
  {speaker:'Nhinh',text:'Trong đêm bão à?'},
  {speaker:'Lumo',text:'Ừ. Tôi đã bay qua đường ống này. Có người gọi bên ngoài, nhưng tôi không nhớ họ gọi tên ai.'},
  {speaker:'Nhinh',text:'Cậu có muốn nghỉ một lát không?'},
  {speaker:'Lumo',text:'Tôi sợ lát nữa lại quên mất.'},
  {speaker:'Nhinh',text:'Vậy tôi ghi lại ngay. Cậu nhớ thêm gì thì cứ nói, tôi sẽ chép.'},
  {speaker:'Lumo',text:'Ghi cả vết xoắn này nhé.'},
];
/** A request to walk to a mark — never an arrival report (approved §2/§3/§4). */
const SEND_LINES: Record<'practice'|'a'|'b'|'c',DialogueLine[]> = {
  practice:[{speaker:'Nhinh',text:'Lumo, cậu tới dấu kia rồi chờ tôi một chút được không?'},{speaker:'Lumo',text:'Được. Tôi đi đây!'}],
  a:[{speaker:'Nhinh',text:'Cậu tới dấu bên kia giúp tôi nhé. Tôi sẽ tìm cách giữ cửa mở.'},{speaker:'Lumo',text:'Được. Cậu cứ từ từ.'}],
  b:[{speaker:'Nhinh',text:'Bên này còn một dấu nữa. Cậu tới đó giúp tôi nhé?'},{speaker:'Lumo',text:'Được. Tôi đi đây.'}],
  c:[{speaker:'Nhinh',text:'Cậu tới đầu bên kia nhé. Tôi sẽ theo những vạch trên nền.'},{speaker:'Lumo',text:'Được. Tôi sẽ chờ cậu ở đó.'}],
};
/** Approved §2 arrival: only queued when the shipped route actually reaches the practice plate. */
const PRACTICE_ARRIVAL: DialogueLine[] = [
  {speaker:'Lumo',text:'Tôi tới rồi. Cửa có mở không?'},
  {speaker:'Nhinh',text:'Mở rồi! May mà cậu lọt qua được khe đó.'},
  {speaker:'Lumo',text:'Nhỏ cũng có ích chứ. Tôi chờ ở đây, cậu cứ đi đi.'},
];
const RECALL_LINES: DialogueLine[] = [{speaker:'Nhinh',text:'Xong rồi, Lumo. Cậu trở lại đây nhé.'},{speaker:'Lumo',text:'Tôi về ngay.'}];
const FINAL_RECALL_LINES: DialogueLine[] = [{speaker:'Nhinh',text:'Cửa đã có chốt giữ rồi. Lumo, cậu về đây nhé.'},{speaker:'Lumo',text:'Tôi về ngay.'}];
/** Approved §6: only after `isActuallyReunited()` reports a real return, never on recall initiation. */
const RETURN_LINES: DialogueLine[] = [{speaker:'Lumo',text:'Tôi về rồi.'},{speaker:'Nhinh',text:'Được rồi. Mình cùng lên nhé.'}];
const LATCH_A_LINES: DialogueLine[] = [{speaker:'Nhinh',text:'Chốt đã giữ cửa rồi. Cậu có thể rời dấu đó.'},{speaker:'Lumo',text:'Vậy tôi không phải đứng đây mãi nữa!'}];
const LATCHED_CALL_LINES: DialogueLine[] = [{speaker:'Lumo',text:'Cửa này đã có chốt giữ rồi. Tôi không cần đứng ở dấu nữa.'}];
const FIRST_LIT_LINES: DialogueLine[] = [
  {speaker:'Nhinh',text:'Trên nền có những vệt mực, nhưng mờ quá.'},
  {speaker:'Lumo',text:'Thử tắt đèn xem. Giống trang sách trong thư viện ấy.'},
  {speaker:'Nhinh',text:'Ừ. Có lẽ chúng chỉ đường qua hành lang.'},
];
const DARK_LINES: DialogueLine[] = [{speaker:'Nhinh',text:'Hiện rõ rồi! Những vạch này dẫn tới cuối hành lang.'}];
const RELIT_LINES: DialogueLine[] = [{speaker:'Nhinh',text:'Ánh đèn lại làm những vạch trên nền mờ đi rồi.'}];
const BECKON_LINES: DialogueLine[] = [{speaker:'Lumo',text:'Ở đây, Nhinh! Cậu sắp tới rồi.'},{speaker:'Nhinh',text:'Thấy cậu rồi!'}];
const NEXT_MARK_UNLATCHED: DialogueLine[] = [{speaker:'Nhinh',text:'Khoan đã. Tôi chưa gài chốt cửa này. Cậu chờ thêm một chút nhé.'}];
const STILL_TRAVELLING: DialogueLine[] = [{speaker:'Nhinh',text:'Lumo vẫn đang trên đường tới. Mình đợi cậu ấy một chút.'}];
const MARK_NOT_CALLED: DialogueLine[] = [{speaker:'Nhinh',text:'Có một dấu ở bên kia cửa. Mình thử nhờ Lumo tới đó xem.'}];
const INK_NOT_SEEN: DialogueLine[] = [{speaker:'Nhinh',text:'Những vệt trên nền còn mờ quá. Mình thử tắt đèn để xem chúng dẫn tới đâu.'}];
const TOWER_NEEDS_LUMO: DialogueLine[] = [{speaker:'Nhinh',text:'Mình chưa thể đi mà bỏ Lumo ở lại. Phải gọi cậu ấy về đã.'}];
const PLATE_ROOMS: Record<'practice'|'a'|'b'|'c',PathRoomId> = {practice:'entry',a:'entry',b:'relay',c:'ink'};
const STATION_MAP_TITLE='SƠ ĐỒ TRẠM';
const STATION_MAP_CURRENT='Bạn đang ở đây';
const STATION_MAP_EXPLANATION='Các đường nối thể hiện đường ống giữa những buồng của trạm.';

export class PathForTwoLevel {
  private scene: Phaser.Scene; private progress: CampaignProgress; private player: Player; private lumo: Lumo;
  private interactions: InteractionSystem; private lantern: LanternSystem; private save: () => void;
  private say: PathForTwoLevelOptions['say']; private nextLevel: PathForTwoLevelOptions['nextLevel']; private canStartStory:PathForTwoLevelOptions['canStartStory'];
  private room: PathRoomId = 'entry'; private objects: Phaser.GameObjects.GameObject[]=[]; private colliders: Phaser.Physics.Arcade.Collider[]=[];
  private bodies: Phaser.Physics.Arcade.StaticBody[]=[]; private doorImages = new Map<string,Phaser.GameObjects.Image>();
  private doorBraceImages=new Map<string,Phaser.GameObjects.Image>();
  private doorHeaderImages=new Map<string,Phaser.GameObjects.Image>();
  private doorPostImages=new Map<string,Phaser.GameObjects.Image[]>();
  private doorBodies = new Map<string,Phaser.Physics.Arcade.StaticBody>(); private protected: Phaser.GameObjects.GameObject[]=[];
  private route: PathRoutePoint[]=[]; private routeIndex=0; private assignment='follow'; private lumoRoom:PathRoomId='entry';
  private routeGraphics?:Phaser.GameObjects.Graphics; private stationMap?:Phaser.GameObjects.Container;
  private gateMask?:Phaser.Display.Masks.GeometryMask; private gateMaskSource?:Phaser.GameObjects.Graphics;
  private inkTrail?:Phaser.GameObjects.TileSprite;
  /** Held-E guard: armed by a room change, cleared by the E key coming back up (see update()). */
  private interactReleasePending=false; private interactKey?:Phaser.Input.Keyboard.Key;
  private hintIndex=0; private hintStage=''; private destroyed=false; private lastLantern=false;
  /**
   * A queued beat carries the condition that made it true. `flushPendingStoryBeat()` re-checks that
   * condition at playback time, so an observation recorded before a light toggle, a recall, or a
   * room change cannot speak later as if the current state were the old one.
   */
  private pendingStoryBeats:Array<{lines:DialogueLine[];onComplete?:()=>void;guard?:()=>boolean;onStale?:()=>void}>=[];
  private lastCheckpoint=0; private beckoningQueued=false; private litObservationQueued=false;
  private darkObservationQueued=false; private relitQueued=false; private reunionQueued=false;
  constructor(o:PathForTwoLevelOptions){this.scene=o.scene;this.progress=o.progress;this.player=o.player;this.lumo=o.lumo;this.interactions=o.interactions;this.lantern=o.lantern;this.save=o.save;this.say=o.say;this.nextLevel=o.nextLevel;this.canStartStory=o.canStartStory;this.lastLantern=this.lantern.lanternOn;}
  private get lanternOn(){return this.lantern.lanternOn;}
  public build():void{
    this.normalizeProgress();
    this.interactKey=this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.room=this.getSavedRoom();
    this.assignment=this.getAssignment();
    const savedRoute=this.readRoute();
    this.route=savedRoute.route;
    const invalidSavedRoute=savedRoute.invalid||!isPathRouteValid(this.route);
    if(invalidSavedRoute)this.route=[];
    this.routeIndex=Math.max(0,Math.min(this.route.length,Math.floor(this.progress.counters['l4-route-index']??0)));
    const hasLumoRoomMetadata=['entry','relay','ink'].includes(String(this.progress.flags['l4-lumo-room']));
    this.lumoRoom=this.readLumoRoom();
    const savedLumo=this.getLumoPosition();
    this.lumo.sprite.setPosition(savedLumo.x,savedLumo.y);
    this.player.setFootPlacement(PATH_BODY.feetY,21+PATH_BODY.y,18+PATH_BODY.x,PATH_BODY.width,PATH_BODY.height);
    const saved=this.progress.counters['player-level']===4&&Number.isFinite(this.progress.counters['player-x'])&&Number.isFinite(this.progress.counters['player-y'])?{x:this.progress.counters['player-x'],y:this.progress.counters['player-y']}:undefined;
    const spawn=nearestSafePathSpawn(this.room,saved,this.isSafe.bind(this));
    this.player.setPosition(spawn.x,spawn.y);
    const arrived=['practice','a','b','c'].some(mark=>this.hasPower(mark as 'practice'|'a'|'b'|'c'));
    const legacyMark=this.assignment==='a'||this.assignment==='b'||this.assignment==='c'?this.assignment:undefined;
    const rebuildLegacyAssignment=shouldRebuildLegacyPathAssignment({
      hasRoomMetadata:hasLumoRoomMetadata,
      assignment:this.assignment,
      wasCalled:legacyMark?this.progress.flags[`l4-called-${legacyMark}`]===true:false,
      eligible:legacyMark==='a'||legacyMark==='b'&&this.progress.flags['l4-latch-a']===true||legacyMark==='c'&&this.progress.flags['l4-latch-b']===true,
      returning:this.progress.flags['l4-return-called']===true,
      reunited:this.progress.flags['l4-reunited']===true,
    });
    if(invalidSavedRoute){
      this.restoreFollowerBeside(spawn);
    }else if(rebuildLegacyAssignment){
      this.lumoRoom=this.room;
      this.lumo.sprite.setPosition(Phaser.Math.Clamp(spawn.x-22,30,610),Phaser.Math.Clamp(spawn.y-18,88,300));
      this.route=this.buildAssignmentRoute(this.assignment as 'a'|'b'|'c',{x:spawn.x,y:spawn.y});
      this.routeIndex=0;
      this.persistRoute();
      this.save();
    }else if(shouldRecoverPathFollower({invalidSavedRoute:false,hasRoomMetadata:hasLumoRoomMetadata,assignment:this.assignment,travelling:this.isTravelling(),actuallyArrived:arrived})){
      this.restoreFollowerBeside(spawn);
    }
    this.progress.flags['l4-room']=this.room;
    for(const mark of ['practice','a','b','c'] as const)this.progress.flags[`l4-at-${mark}`]=this.hasPower(mark);
    this.lumo.setVisible(this.lumoRoom===this.room);
    this.drawRoom();
    this.refresh();
  }
  public startOpeningDialogue():void{this.say(INTRO);}
  public destroy():void{if(this.destroyed)return;this.destroyed=true;this.colliders.forEach(c=>{if(c.active)c.destroy();});this.bodies.forEach(b=>{if(b.gameObject?.active)b.gameObject.destroy();});this.objects.forEach(o=>{if(o.active)o.destroy();});this.objects=[];this.gateMask?.destroy();this.gateMaskSource?.destroy();this.gateMask=undefined;this.gateMaskSource=undefined;this.stationMap?.destroy();this.stationMap=undefined;this.interactions.clear();this.doorImages.clear();this.doorBraceImages.clear();this.doorHeaderImages.clear();this.doorPostImages.clear();this.doorBodies.clear();}
  public update(dt:number):void{
    if(this.destroyed)return; this.releaseInteractGuard();
    this.advanceLumo(dt); this.updateDoors(); this.updateInkProgress(); this.updateReunion();
    this.flushPendingStoryBeat();
    if(this.scene.time.now-this.lastCheckpoint>=600){this.lastCheckpoint=this.scene.time.now;if(this.isSafe(this.room,{x:this.player.x,y:this.player.y})){this.progress.flags['l4-room']=this.room;this.progress.counters['player-level']=4;this.progress.counters['player-x']=Math.round(this.player.x);this.progress.counters['player-y']=Math.round(this.player.y);this.save();}}
    this.refreshArt();
  }
  public getProtectedPromptBounds():PromptRect[]{return this.protected.filter((o):o is Phaser.GameObjects.Image=>o instanceof Phaser.GameObjects.Image&&o.active&&o.visible).map(o=>o.getBounds());}
  public getObjectiveText():string{
    if(this.room==='entry'){
      if(this.assignment==='practice'&&this.isTravelling())return tr('Nhấn E ở mốc gần cậu để gọi Lumo, rồi chờ cậu ấy tới ấn sau cửa thấp.');
      if(this.assignment==='practice'&&this.hasPower('practice'))return tr('Cửa thử đã mở. Bước vào trong và nhấn E ở mốc trong để gọi Lumo về mốc.');
      if(!this.progress.flags['l4-practice-complete']&&!this.progress.flags['l4-called-a'])return tr('Nhấn E ở mốc đứng gần cậu để thử cách gọi. Mốc A trong sảnh mở đường đi tiếp khi cậu cần.');
      if(this.isDoorOpen('a'))return tr('Qua cửa A. Gài chốt ở mặt bên kia trước khi gọi Lumo tới B.');
      return tr('Nhấn E ở mốc A trong sảnh để gọi Lumo tới ấn A, rồi qua cửa A.');
    }
    if(this.room==='relay')return !this.progress.flags['l4-latch-a']?tr('Gài chốt A ở mặt bên kia trước khi gọi Lumo tới B.'):this.isDoorOpen('b')?tr('Qua cửa B tới hành lang mực.'):tr('Gọi Lumo tới ấn B.');
    if(!this.progress.flags['l4-latch-b'])return tr('Gài chốt B trước khi gọi Lumo tới cuối hành lang.');
    if(this.progress.flags['l4-latch-c']){
      const blockedBy=getPathExitBlock({latchC:true,memoRead:this.progress.flags['l4-memo']===true,reunited:this.isActuallyReunited()});
      if(blockedBy==='memo')return tr('Đọc vết xoắn để giữ lại mảnh ký ức.');
      if(blockedBy==='companion'){
        if(this.assignment==='c')return tr('Nhấn E ở tay gọi C để gọi Lumo về, rồi chờ cậu ấy tới gần.');
        if(this.isTravelling())return tr('Lumo đang về. Chờ cậu ấy tới gần Nhinh rồi lên tháp.');
        return tr('Lumo đã về tới nơi. Chờ cậu ấy tới gần Nhinh rồi lên tháp.');
      }
      return tr('Tới bậc thang và nhấn E.');
    }
    // C-before-ink is legal: once C is actually held, the instruction channel must stop asking for
    // a call that already happened. The key stays in the instruction channel, not in character speech.
    if(!this.progress.flags['l4-ink-revealed'])return this.hasPower('c')
      ?tr('Tắt đèn bằng F rồi đi theo vạch mực tới cuối hành lang.')
      :tr('Tắt đèn bằng F. Từ mốc bên trái, gọi Lumo tới ấn C rồi theo vạch mực.');
    if(!this.hasPower('c'))return tr('Từ mốc bên trái, gọi Lumo tới ấn C trước khi đi tới cuối hành lang.');
    return tr('Tới tay gài C và giữ cửa ra.');
  }
  public getStatusText():string{
    const arrival=(['practice','a','b','c'] as const).find(mark=>this.hasPower(mark));
    const lumoState=this.isTravelling()?tr('đang đi'):arrival?(arrival==='practice'?tr('đã tới ấn thử'):tr('đã tới {arrival}', { arrival: arrival.toUpperCase() })):tr('theo Nhinh');
    return tr('{room} · A {a} · B {b} · C {c} · Lumo: {lumo}', {
      room: tr(PATH_ROOMS[this.room].title),
      a: this.progress.flags['l4-latch-a'] ? tr('giữ') : tr('mở khi Lumo tới'),
      b: this.progress.flags['l4-latch-b'] ? tr('giữ') : tr('chờ'),
      c: this.progress.flags['l4-latch-c'] ? tr('giữ') : tr('chờ'),
      lumo: lumoState,
    });
  }
  public showHint():void{
    const stage=this.room==='entry'?'practice':this.room==='relay'?this.progress.flags['l4-latch-a']?'b':'a':!this.progress.flags['l4-latch-b']?'latch-b':!this.progress.flags['l4-ink-revealed']?'ink':!this.hasPower('c')?'c':'exit';
    if(stage!==this.hintStage){this.hintStage=stage;this.hintIndex=0;} const hints=[tr('Nhấn E ở mốc gọi để đưa Lumo tới ấn bên kia cửa. Mỗi buồng đều có một tay chốt giữ cửa.'),tr('Tôi giữ ấn để cậu qua cửa. Cậu nhấn E ở tay chốt, rồi tôi mới sang được nơi khác.'),tr('Nhấn E ở mốc đang mở cửa trước mặt, đi qua và gài chốt. Tới hành lang cuối, nhấn F tắt đèn để đọc vạch nền.')];
    this.say([{speaker:'Hệ thống',text:hints[Math.min(this.hintIndex++,2)]}]);
  }
  public showJournal():void{const e:DialogueLine[]=[];if(this.progress.flags['l4-called-a'])e.push({speaker:'Nhinh',text:tr('Gọi Lumo tới ấn mở cửa, rồi qua cửa để gài chốt.')});if(this.progress.flags['l4-ink-revealed'])e.push({speaker:'Nhinh',text:tr('Đèn dịu xuống thì vạch mực trên nền hiện rõ.')});if(this.progress.flags['l4-memo'])e.push({speaker:'Lumo',text:tr('Vết xoắn trong đường ống gợi lại đêm bão và tiếng gọi ngoài kia.')});this.say([{speaker:'Nhinh',text:tr('Sổ tay giữ những điều hai đứa đã học.')},...(e.length?e:[{speaker:'Nhinh' as const,text:tr('Chưa ghi thêm manh mối nào.')}])]);}
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
      this.progress.flags['l4-assignment']=this.progress.flags['l4-reunited']||this.progress.flags['l4-return-called']?'follow'
        :this.progress.flags['l4-called-c']&&!this.progress.flags['l4-latch-c']?'c'
        :this.progress.flags['l4-called-b']&&!this.progress.flags['l4-latch-b']?'b'
        :this.progress.flags['l4-called-a']&&!this.progress.flags['l4-latch-a']?'a':'follow';
    }
    this.save();
  }
  private getSavedRoom():PathRoomId{return resolvePathRoom(this.progress.flags['l4-room'],this.progress.flags['l4-visited-relay']===true,this.progress.flags['l4-visited-ink']===true,this.progress.flags['l4-latch-a']===true,this.progress.flags['l4-latch-b']===true,this.progress.flags['l4-latch-c']===true);}
  private getAssignment():string{const a=this.progress.flags['l4-assignment'];return typeof a==='string'?a:'follow';}
  private readLumoRoom():PathRoomId{const r=this.progress.flags['l4-lumo-room'];return r==='relay'||r==='ink'?r:'entry';}
  private readRoute():{route:PathRoutePoint[];invalid:boolean}{
    const raw=this.progress.flags['l4-route'];
    if(raw===undefined||raw==='')return{route:[],invalid:false};
    if(typeof raw!=='string')return{route:[],invalid:true};
    try{
      const route=parsePathRoute(JSON.parse(raw));
      return route?{route,invalid:false}:{route:[],invalid:true};
    }catch{
      return{route:[],invalid:true};
    }
  }
  private restoreFollowerBeside(spawn:PathPoint):void{
    this.assignment='follow';
    this.lumoRoom=this.room;
    this.lumo.sprite.setPosition(Phaser.Math.Clamp(spawn.x-22,30,610),Phaser.Math.Clamp(spawn.y-18,88,300));
    this.lumo.setVisible(true);
    this.route=[];
    this.routeIndex=0;
    this.progress.flags['l4-assignment']='follow';
    this.progress.flags['l4-route']='';
    this.progress.counters['l4-route-index']=0;
    this.progress.flags['l4-lumo-room']=this.room;
    this.progress.counters['l4-lumo-x']=Math.round(this.lumo.sprite.x);
    this.progress.counters['l4-lumo-y']=Math.round(this.lumo.sprite.y);
    this.save();
  }
  private getLumoPosition():PathPoint{
    const x=this.progress.counters['l4-lumo-x']??this.progress.counters['lumo-x'];
    const y=this.progress.counters['l4-lumo-y']??this.progress.counters['lumo-y'];
    return Number.isFinite(x)&&Number.isFinite(y)
      ?{x:Phaser.Math.Clamp(x as number,24,616),y:Phaser.Math.Clamp(y as number,80,310)}
      :{x:180,y:250};
  }
  private isSafe(room:PathRoomId,p:PathPoint):boolean{return isPathPositionSafe(room,p,{latches:{a:this.progress.flags['l4-latch-a']===true||this.hasPower('a'),b:this.progress.flags['l4-latch-b']===true||this.hasPower('b'),c:this.progress.flags['l4-latch-c']===true||this.hasPower('c'),practice:this.hasPower('practice')}});}
  private drawRoom():void{
    this.interactions.clear();this.colliders.forEach(c=>{if(c.active)c.destroy();});this.bodies.forEach(b=>{if(b.gameObject?.active)b.gameObject.destroy();});this.objects.forEach(o=>{if(o.active)o.destroy();});this.objects=[];this.colliders=[];this.bodies=[];this.doorImages.clear();this.doorBraceImages.clear();this.doorHeaderImages.clear();this.doorPostImages.clear();this.doorBodies.clear();this.protected=[];this.inkTrail=undefined;
    this.gateMask?.destroy();this.gateMaskSource?.destroy();this.gateMask=undefined;this.gateMaskSource=undefined;
    const def=PATH_ROOMS[this.room];
    const environmentKey=getLevelArtKey(4,`${this.room}-environment-base`);
    if(environmentKey&&this.scene.textures.exists(environmentKey)){
      this.track(this.scene.add.image(0,0,environmentKey).setOrigin(0).setDepth(0));
    }else{
      const floor=this.scene.add.tileSprite(0,0,640,360,'ground_stone').setOrigin(0).setTint(this.room==='ink'?0x8f8f87:0xb4a88d).setDepth(0);this.track(floor);
      const graphics=this.scene.add.graphics().setDepth(1);graphics.fillStyle(0x302b28,0.96);for(const wall of def.walls)graphics.fillRect(wall.x,wall.y,wall.width,wall.height);graphics.lineStyle(2,0x716351,0.7);for(const wall of def.walls)graphics.strokeRect(wall.x,wall.y,wall.width,wall.height);this.track(graphics);
    }
    for(const wall of def.walls)this.addCollider(wall);
    for(const solid of def.solids)this.addCollider(solid);
    this.routeGraphics=this.scene.add.graphics().setDepth(5);this.track(this.routeGraphics);this.drawTubeRoutes();
    this.drawStationSchematic();
    if(this.room==='ink'){
      // One continuous mark over the whole corridor, sized and placed from the layout's own corridor
      // rect: the two native 240×48 stamps used to be 132px out of phase, so the middle third showed two
      // offset dash patterns. The native texture is tiled at its own size (no scaling), so aspect and
      // dash spacing stay as authored.
      const key=getLevelArtKey(4,this.lanternOn?'ink-route-bright':'ink-route-dark');
      if(key){this.inkTrail=this.scene.add.tileSprite(PATH_INK_CORRIDOR.x+PATH_INK_CORRIDOR.width/2,
        PATH_INK_CORRIDOR.y+PATH_INK_CORRIDOR.height/2,PATH_INK_CORRIDOR.width,PATH_INK_CORRIDOR.height,key).setDepth(4);this.track(this.inkTrail);}
    }
    for(const mouth of PATH_TUBE_MOUTHS){
      if(mouth.room!==this.room)continue;
      this.addNativeArt('tube-mouth',mouth.x,mouth.y,mouth.rotation);
    }
    for(const e of def.elements){
      const key=getLevelArtKey(4,e.art);if(!key)continue;
      const art=getPathElementArtRect(e);
      const image=this.scene.add.image(art.x+art.width/2,art.y+art.height/2,key).setDisplaySize(e.width,e.height).setDepth(e.art.startsWith('call')||e.art.startsWith('latch')?this.depthAt(e.y):5);
      this.track(image);
      if(e.art.startsWith('call')||e.art.startsWith('latch')||e.id==='spiral')this.protected.push(image);
      image.setData('path-id',e.id);
    }
    this.addDoors();this.registerRoomInteractions();this.refreshArt();
  }
  private drawTubeRoutes():void{
    if(!this.routeGraphics)return;
    this.buildGateMask();
    if(this.gateMask)this.routeGraphics.setMask(this.gateMask);
    const lines=PATH_ROUTE_LINES.filter(line=>line.room===this.room);
    for(const line of lines){
      const points=pathRoutePoints(line);
      this.routeGraphics.lineStyle(10,0x403328,0.88);
      this.routeGraphics.beginPath();this.routeGraphics.moveTo(points[0].x,points[0].y);
      for(const p of points.slice(1))this.routeGraphics.lineTo(p.x,p.y);
      this.routeGraphics.strokePath();
      this.routeGraphics.lineStyle(3,0x9bb99a,0.8);
      this.routeGraphics.beginPath();this.routeGraphics.moveTo(points[0].x,points[0].y);
      for(const p of points.slice(1))this.routeGraphics.lineTo(p.x,p.y);
      this.routeGraphics.strokePath();
      this.addTubeModules(points);
      this.addCable(line.mark,points);
    }
  }
  /**
   * Positive complement of every 64×88 doorway in this room: the mask keeps the open floor and fills
   * nothing under a gate, so route art behind a whole door footprint is hidden in both door states
   * without moving the door above the player. Canvas ignores inverted stencil masks, so the grid is
   * drawn positively rather than inverting one. Rebuilt per room and destroyed with the room.
   */
  private buildGateMask():void{
    const gates=PATH_CONTROL_STANDS.filter(stand=>stand.room===this.room).flatMap(stand=>{
      const face=getPathDoorFace(stand.id,this.room);
      return face?[{x:face.x-32,y:face.base-88,width:64,height:88}]:[];
    });
    const xEdges=[0,640],yEdges=[0,360];
    for(const gate of gates){xEdges.push(gate.x,gate.x+gate.width);yEdges.push(gate.y,gate.y+gate.height);}
    const unique=(values:number[])=>[...new Set(values)].sort((a,b)=>a-b);
    const xs=unique(xEdges),ys=unique(yEdges);
    const source=this.scene.make.graphics();
    source.fillStyle(0xffffff,1);
    for(let xi=0;xi<xs.length-1;xi+=1)for(let yi=0;yi<ys.length-1;yi+=1){
      const cell={x:xs[xi],y:ys[yi],width:xs[xi+1]-xs[xi],height:ys[yi+1]-ys[yi]};
      const covered=gates.some(gate=>cell.x>=gate.x&&cell.x+cell.width<=gate.x+gate.width&&cell.y>=gate.y&&cell.y+cell.height<=gate.y+gate.height);
      if(!covered)source.fillRect(cell.x,cell.y,cell.width,cell.height);
    }
    this.gateMaskSource=source;this.gateMask=source.createGeometryMask();
  }
  private addTubeModules(points:readonly PathPoint[]):void{
    const key=getLevelArtKey(4,'tube-straight');
    if(!key)return;
    for(let i=1;i<points.length;i++){
      const start=points[i-1],end=points[i];
      const length=Math.hypot(end.x-start.x,end.y-start.y);
      const pieces=Math.max(1,Math.ceil(length/56));
      const pieceLength=length/pieces;
      const angle=Math.atan2(end.y-start.y,end.x-start.x);
      for(let piece=0;piece<pieces;piece++){
        const along=Math.min(length,(piece+0.5)*length/pieces);
        const image=this.scene.add.image(start.x+Math.cos(angle)*along,start.y+Math.sin(angle)*along,key).setRotation(angle).setDepth(4.5);
        // Keep native pixels, clipping symmetrically so the visible ends meet the run boundaries.
        image.setCrop((image.width-pieceLength)/2,0,pieceLength,image.height);
        this.track(image);
        if(this.gateMask)image.setMask(this.gateMask);
      }
    }
  }
  /**
   * The root cable follows the same waypoints as the tube, one stateful native crop per ≤160px run,
   * so it really reaches the call at one end and the plate at the other. Genuine corners get the
   * compact elbow coupling instead of fixed 90-degree arms across an arbitrary bend.
   */
  private addCable(mark:PathMark,points:readonly PathPoint[]):void{
    const cableKey=getLevelArtKey(4,'root-cable-rest');
    if(cableKey){
      for(const piece of pathRouteCableSegments(points)){
        const image=this.scene.add.image(piece.x,piece.y,cableKey)
          .setRotation(piece.angle).setDepth(6).setData('path-id','cable').setData('path-cable',mark);
        image.setCrop((image.width-piece.length)/2,0,piece.length,image.height);
        this.track(image);
        if(this.gateMask)image.setMask(this.gateMask);
      }
    }
    const elbowKey=getLevelArtKey(4,'tube-elbow');
    if(!elbowKey)return;
    for(const corner of pathRouteCorners(points)){
      const image=this.scene.add.image(corner.x,corner.y,elbowKey).setRotation(corner.angle).setDepth(4.5);
      this.track(image);
      if(this.gateMask)image.setMask(this.gateMask);
    }
  }
  /**
   * The station schematic beside this room's call marker: three room cells, the authored seals and
   * both pipes, projected from `pathForTwoLayout` — geometry only, never a baked background. It is
   * drawn as a small wall-mounted stone plaque with a chamfered edge, one bronze rule, four corner
   * pins and soft amber for the current room, so it reads as signage rather than a debug panel.
   */
  private drawStationSchematic():void{
    const slot=PATH_SCHEMATIC[this.room];
    const plan=buildPathSchematic();
    const graphics=this.scene.add.graphics().setDepth(7);
    this.track(graphics);
    const left=slot.x-5,top=slot.y-5,right=slot.x+slot.width+5,bottom=slot.y+slot.height+5,chamfer=3;
    graphics.fillStyle(0x2b2a26,0.98);
    graphics.beginPath();
    graphics.moveTo(left+chamfer,top);graphics.lineTo(right-chamfer,top);
    graphics.lineTo(right,top+chamfer);graphics.lineTo(right,bottom-chamfer);
    graphics.lineTo(right-chamfer,bottom);graphics.lineTo(left+chamfer,bottom);
    graphics.lineTo(left,bottom-chamfer);graphics.lineTo(left,top+chamfer);
    graphics.closePath();graphics.fillPath();
    graphics.lineStyle(1,0x6e6557,0.9);
    graphics.beginPath();graphics.moveTo(left+chamfer,top);graphics.lineTo(right-chamfer,top);
    graphics.lineTo(right,top+chamfer);graphics.strokePath();
    graphics.lineStyle(1,0x171512,1);
    graphics.beginPath();graphics.moveTo(left,bottom-chamfer);graphics.lineTo(left+chamfer,bottom);
    graphics.lineTo(right-chamfer,bottom);graphics.lineTo(right,bottom-chamfer);graphics.strokePath();
    graphics.lineStyle(1,0x8a6a3b,0.9);graphics.strokeRect(slot.x-1,slot.y-1,slot.width+2,slot.height+2);
    graphics.fillStyle(0xa88a56,0.9);
    for(const [x,y] of [[left+4,top+4],[right-4,top+4],[left+4,bottom-4],[right-4,bottom-4]])graphics.fillCircle(x,y,1.6);
    for(const room of plan.rooms){
      const frame={x:slot.x+room.frame.x,y:slot.y+room.frame.y,width:room.frame.width,height:room.frame.height};
      const current=room.room===this.room;
      graphics.fillStyle(current?0x4a3b27:0x25241f,current?0.8:0.9);graphics.fillRect(frame.x,frame.y,frame.width,frame.height);
      graphics.lineStyle(1,current?0xb08a52:0x75664e,0.9);graphics.strokeRect(frame.x,frame.y,frame.width,frame.height);
      graphics.fillStyle(current?0xe0b46a:0x93805c,0.95);
      for(const seal of room.seals)graphics.fillRect(slot.x+seal.x-1,slot.y+seal.y-1,3,3);
    }
    graphics.lineStyle(1,0x8c7650,0.85);
    for(const pipe of plan.pipes){
      graphics.beginPath();
      graphics.moveTo(slot.x+pipe.from.x,slot.y+pipe.from.y);
      graphics.lineTo(slot.x+pipe.to.x,slot.y+pipe.to.y);
      graphics.strokePath();
    }
    const title=this.scene.add.text(slot.x+slot.width/2,slot.y+1,STATION_MAP_TITLE,
      {fontFamily:'Segoe UI, sans-serif',fontSize:'7px',color:'#c2a06a'}).setOrigin(0.5,0.5).setDepth(7.1);
    this.track(title);
  }
  /** One clean stone/brass board, built from the same layout data as the small plaque. */
  private openStationMap():void{
    if(this.stationMap||!this.canStartStory()||this.heldInteract())return;
    this.closeStationMap();
    const panel={x:44,y:65,width:552,height:180};
    const scale=5;
    const originX=(640-PATH_SCHEMATIC_SIZE.width*scale)/2;
    const originY=88;
    const plan=buildPathSchematic();
    const container=this.scene.add.container(0,0).setDepth(90);
    this.stationMap=container;
    const graphics=this.scene.add.graphics();
    container.add(graphics);
    graphics.fillStyle(0x1b1915,0.97);graphics.fillRoundedRect(panel.x,panel.y,panel.width,panel.height,6);
    graphics.lineStyle(1,0x8a6a3b,0.9);graphics.strokeRoundedRect(panel.x,panel.y,panel.width,panel.height,6);
    graphics.lineStyle(1,0x6e6557,0.7);graphics.strokeRoundedRect(panel.x+5,panel.y+5,panel.width-10,panel.height-10,4);
    const title=this.scene.add.text(320,77,STATION_MAP_TITLE,
      {fontFamily:'Segoe UI, sans-serif',fontSize:'14px',fontStyle:'bold',color:'#e0c080'}).setOrigin(0.5,0.5);
    container.add(title);
    for(const room of plan.rooms){
      const frame={x:originX+room.frame.x*scale,y:originY+room.frame.y*scale,width:room.frame.width*scale,height:room.frame.height*scale};
      const current=room.room===this.room;
      graphics.fillStyle(current?0x4a3b27:0x25241f,0.9);graphics.fillRect(frame.x,frame.y,frame.width,frame.height);
      graphics.lineStyle(current?1.5:1,current?0xb08a52:0x75664e,0.9);graphics.strokeRect(frame.x,frame.y,frame.width,frame.height);
      graphics.fillStyle(current?0xe0b46a:0x93805c,0.95);
      for(const seal of room.seals)graphics.fillRect(originX+seal.x*scale-2,originY+seal.y*scale-2,4,4);
      const name=this.scene.add.text(frame.x+frame.width/2,originY+18*scale+14,tr(PATH_ROOMS[room.room].title),
        {fontFamily:'Segoe UI, sans-serif',fontSize:'11px',color:current?'#e0c080':'#a99b83'}).setOrigin(0.5,0.5);
      container.add(name);
      if(current){
        const mark=this.scene.add.text(name.x,originY+18*scale+32,STATION_MAP_CURRENT,
          {fontFamily:'Segoe UI, sans-serif',fontSize:'9px',color:'#d8b869'}).setOrigin(0.5,0.5);
        container.add(mark);
      }
    }
    graphics.lineStyle(2,0x8c7650,0.9);
    for(const pipe of plan.pipes){
      graphics.beginPath();
      graphics.moveTo(originX+pipe.from.x*scale,originY+pipe.from.y*scale);
      graphics.lineTo(originX+pipe.to.x*scale,originY+pipe.to.y*scale);
      graphics.strokePath();
    }
    this.say([{speaker:'Hệ thống',text:STATION_MAP_EXPLANATION}],()=>this.closeStationMap());
  }
  private closeStationMap():void{this.stationMap?.destroy();this.stationMap=undefined;}
  private addNativeArt(filename:string,x:number,y:number,rotation=0):void{
    const key=getLevelArtKey(4,filename);if(!key)return;
    const image=this.scene.add.image(x,y,key).setRotation(rotation).setDepth(4);this.track(image);
    if(filename==='tube-mouth'&&this.gateMask)image.setMask(this.gateMask);
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
    // The v2 arch reaches y44; the lower posts match the existing 10px collision columns.
    const region=layer==='header'?[0,0,64,44]:layer==='left-post'?[0,0,10,88]:[54,0,10,88];
    const context=texture.getContext();
    context.save();
    context.imageSmoothingEnabled=false;
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
  private isDoorPowered(id:string):boolean{return id==='practice'?this.hasPower('practice'):this.hasPower(id as 'a'|'b'|'c')||this.isDoorLatched(id);}
  private registerRoomInteractions():void{
    const reg=(c:InteractableConfig)=>this.interactions.register(c);const def=PATH_ROOMS[this.room];
    // Standing props: prompt, enabled and the action share one layout predicate (`isPathApproachAllowed`,
    // reached through `elementApproach`) and opt into `ownsPosition`, so the control whose face the
    // feet are on keeps the standing position in a crowded zone (RULE_GAMES §1).
    for(const e of def.elements){if(isPathSeal(e))continue;reg({id:`l4-${e.id}`,x:e.stand.x,y:e.stand.y,radius:PATH_ELEMENT_RADIUS,getPrompt:()=>this.prompt(e.id),getPromptBounds:()=>this.imageFor(e.id)?.getBounds()??null,isEnabled:()=>this.interactionEnabled(e.id),ownsPosition:(x:number,y:number)=>isPathApproachAllowed(this.room,e,{x,y}),onInteract:()=>this.interact(e.id)});}
    // Doors: the documented gate exception (RULE_GAMES §3) — one layout predicate for the room-side
    // arch approach, shared by prompt, enabled and the action.
    for(const stand of PATH_CONTROL_STANDS){if(stand.room!==this.room)continue;reg({id:`l4-door-${stand.id}`,x:stand.x,y:stand.y,radius:stand.radius,getPrompt:()=>this.doorPrompt(stand.id),getPromptBounds:()=>this.doorImages.get(stand.id)?.getBounds()??null,isEnabled:()=>this.doorEnabled(stand.id),onInteract:()=>this.useDoor(stand.id)});}
    // The station board is read only from the floor south of its own plaque; no collider is added.
    const slot=PATH_SCHEMATIC[this.room];
    reg({id:'l4-station-map',x:slot.x+slot.width/2,y:slot.y+slot.height,radius:0,getPrompt:()=>this.stationMapPrompt(),getPromptBounds:()=>this.stationPlaqueBounds(),isEnabled:()=>this.stationMapEnabled(),isInReach:(x:number,y:number)=>this.atStationPlaque(x,y),onInteract:()=>this.openStationMap()});
  }
  private stationPlaqueBounds():PathRect{const slot=PATH_SCHEMATIC[this.room];return{x:slot.x-5,y:slot.y-5,width:slot.width+10,height:slot.height+10};}
  private atStationPlaque(x:number,y:number):boolean{return isFootInReach(pathActorBody({x,y}),{rect:this.stationPlaqueBounds(),face:'south',maxGap:10});}
  private stationMapEnabled():boolean{return this.canStartStory()&&!this.heldInteract()&&this.atStationPlaque(this.player.x,this.player.y);}
  private stationMapPrompt():string|null{return this.stationMapEnabled()?tr('E · Xem sơ đồ'):null;}
  private heldInteract():boolean{return isPathInteractHeld(this.interactReleasePending,this.isInteractKeyDown());}
  private isInteractKeyDown():boolean{return this.interactKey?.isDown===true;}
  /** A room change arms the guard; E coming back up disarms it, so one held press cannot act twice. */
  private releaseInteractGuard():void{if(!isPathInteractHeld(this.interactReleasePending,this.isInteractKeyDown()))this.interactReleasePending=false;}
  private elementFor(id:string):PathElement|undefined{return PATH_ROOMS[this.room].elements.find(e=>e.id===id);}
  /** A floor seal's own mark, whatever its element id is spelled like (`plate-a`, `practice-plate`). */
  private sealMark(id:string):PathMark{
    if(id.includes('practice'))return'practice';
    if(id.includes('-a'))return'a';
    if(id.includes('-b'))return'b';
    return'c';
  }
  private elementApproach(id:string,x:number,y:number):boolean{
    const element=this.elementFor(id);
    return !!element&&isPathApproachAllowed(this.room,element,{x,y});
  }
  private doorApproach(id:string,x:number,y:number):boolean{return isPathDoorApproachAllowed(this.room,id,{x,y});}
  private doorPrompt(id:PathMark):string|null{
    if(this.heldInteract()||!this.doorApproach(id,this.player.x,this.player.y))return null;
    return id==='practice'?tr('E · Thử cửa thấp'):id==='c'?tr('E · Lên tháp'):tr('E · Qua cửa {door}', { door: id.toUpperCase() });
  }
  private doorEnabled(id:PathMark):boolean{return !this.heldInteract()&&this.doorApproach(id,this.player.x,this.player.y);}
  private prompt(id:string):string|null{
    if(this.heldInteract()||!this.elementApproach(id,this.player.x,this.player.y))return null;
    const mark=this.callMark(id);
    if(mark)return choosePathCallAction(this.assignment,mark,this.callEligible(mark))==='recall'?tr('E · Gọi Lumo về mốc'):PLATE_ROOMS[mark]===this.lumoRoom?tr('E · Gọi Lumo tới ấn'):tr('E · Gọi Lumo qua ống');
    if(id==='latch-a')return tr('E · Gài chốt A');
    if(id==='latch-b')return tr('E · Gài chốt B');
    if(id==='latch-c')return this.progress.flags['l4-latch-c']?tr('E · Gọi Lumo về'):tr('E · Gài chốt cửa ra');
    if(id==='spiral')return tr('E · Đọc vết xoắn');
    return tr('E · Tương tác');
  }
  private callMark(id:string):'practice'|'a'|'b'|'c'|undefined{
    if(id==='inner-call'||id==='practice-call')return'practice';
    if(id.includes('call-a'))return'a';
    if(id.includes('call-b'))return'b';
    if(id.includes('call-c'))return'c';
    return undefined;
  }
  /**
   * The lesson is an optional practice door (D1): A only needs the latch before it, and neither A nor
   * the lesson waits for `l4-practice-complete`, which one full practice recall writes.
   */
  private callEligible(mark:'practice'|'a'|'b'|'c'):boolean{
    if(mark==='b')return this.progress.flags['l4-latch-a']===true;
    if(mark==='c')return this.progress.flags['l4-latch-b']===true;
    return true;
  }
  private interactionEnabled(id:string):boolean{
    if(this.heldInteract()||!this.elementApproach(id,this.player.x,this.player.y))return false;
    if(id==='latch-a')return this.room==='relay'&&this.progress.flags['l4-latch-a']!==true;
    if(id==='latch-b')return this.room==='ink'&&this.progress.flags['l4-latch-b']!==true;
    // Latch C answers before the ink is found too: a locked mechanism still gives useful feedback
    // naming the step that is missing (campaign-layout-design), and afterwards this same handle recalls.
    if(id==='latch-c')return this.room==='ink';
    if(id==='spiral')return this.progress.flags['l4-latch-c']===true;
    return true;
  }
  /** What still blocks the exit latch, in flow order; undefined means the handle may be used. */
  private latchCBlockReason():string|undefined{
    if(!this.progress.flags['l4-latch-b'])return tr('Cửa B cần được gài trước.');
    if(!this.progress.flags['l4-ink-revealed'])return INK_NOT_SEEN[0].text;
    if(!this.hasPower('c'))return MARK_NOT_CALLED[0].text;
    return undefined;
  }
  private interact(id:string):void{
    if(!this.interactionEnabled(id))return;
    const mark=this.callMark(id);
    if(mark){
      if(mark!=='practice'&&this.progress.flags[`l4-latch-${mark}`]===true){this.send(mark);return;}
      const action=choosePathCallAction(this.assignment,mark,this.callEligible(mark));
      if(action==='recall'){this.recallToCall(id);return;}
      if(mark==='b'&&!this.progress.flags['l4-latch-a']){this.say(NEXT_MARK_UNLATCHED);return;}
      if(mark==='c'&&!this.progress.flags['l4-latch-b']){this.say(NEXT_MARK_UNLATCHED);return;}
      this.send(mark);
      return;
    }
    if(id==='latch-a'){if(this.room==='relay'&&this.progress.flags['l4-visited-relay']&&this.hasPower('a')){this.progress.flags['l4-latch-a']=true;this.progress.flags['l4-at-a']=false;this.say(LATCH_A_LINES);this.save();}return;}
    if(id==='latch-b'){if(this.room==='ink'&&this.progress.flags['l4-visited-ink']&&this.hasPower('b')){this.progress.flags['l4-latch-b']=true;this.progress.flags['l4-at-b']=false;this.save();}return;}
    if(id==='latch-c'){
      if(this.progress.flags['l4-latch-c']){this.recallToCall(id);return;}
      const blocked=this.latchCBlockReason();
      if(blocked){this.say([{speaker:'Nhinh',text:blocked}]);return;}
      this.progress.flags['l4-latch-c']=true;this.save();
      if(!this.progress.flags['l4-memo'])this.say(MEMORY,()=>{this.progress.flags['l4-memo']=true;this.save();});
      return;
    }
    if(id==='spiral'){
      if(this.progress.flags['l4-memo']){this.say(MEMORY);return;}
      this.say(MEMORY,()=>{this.progress.flags['l4-memo']=true;this.save();});
    }
  }
  private send(mark:'practice'|'a'|'b'|'c'):void{
    if(mark!=='practice'&&this.progress.flags[`l4-latch-${mark}`]){this.say(LATCHED_CALL_LINES);return;}
    this.assignment=mark;
    this.progress.flags['l4-assignment']=mark;
    this.progress.flags['l4-reunited']=false;
    this.progress.flags[`l4-called-${mark}`]=true;
    for(const name of ['practice','a','b','c'])this.progress.flags[`l4-at-${name}`]=false;
    this.route=this.buildAssignmentRoute(mark,{x:this.player.x,y:this.player.y});
    this.routeIndex=0;
    this.persistRoute();
    // C-before-ink is a legal path with no approved variant: §4's request promises to follow the
    // floor lines, a premise that has not happened yet. Suppress that unsupported speech (and report
    // the gap) instead of inventing copy or making the ink a requirement to call.
    const cBeforeInk=mark==='c'&&this.progress.flags['l4-ink-revealed']!==true;
    this.save();
    if(cBeforeInk)return;
    this.say(SEND_LINES[mark]);
  }
  private buildAssignmentRoute(mark:'a'|'b'|'c'|'practice',playerPoint:PathPoint):PathRoutePoint[]{
    const targetRoom=PLATE_ROOMS[mark];
    return[
      {room:this.lumoRoom,x:this.lumo.sprite.x,y:this.lumo.sprite.y},
      ...this.pipeRoute(this.lumoRoom,this.room),
      {room:this.room,x:playerPoint.x,y:playerPoint.y},
      ...this.pipeRoute(this.room,targetRoom),
      ...this.localRoute(mark),
    ];
  }
  /**
   * The leg Lumo walks inside the plate's own room: the `plate` tail of that mark's authored route line,
   * taken from the layout rather than re-typed here, so the walked route and the drawn tube/cable art
   * (`drawTubeRoutes` draws `pathRoutePoints(line)`) are one list of waypoints and cannot drift.
   */
  private localRoute(mark:'practice'|'a'|'b'|'c'):PathRoutePoint[]{
    return getPathLocalLeg(PLATE_ROOMS[mark],mark);
  }
  /**
   * The turn points between two rooms. These are the only route coordinates the controller still authors
   * itself, and every one of them has to be a waypoint of the authored route lines of its own room —
   * `scripts/check-path-for-two.mjs` proves that for all six room pairs, so a drifted pipe point fails
   * there instead of quietly disagreeing with the drawn pipe.
   */
  private pipeRoute(from:PathRoomId,to:PathRoomId):PathRoutePoint[]{
    const route:PathRoutePoint[]=[];let current=from;
    while(current!==to){
      if(current==='entry'){
        route.push({room:'entry',x:440,y:232},getPathPipePoint('a','entry','out'),
          getPathPipePoint('a','relay','in'),{room:'relay',x:140,y:280});current='relay';
      }else if(current==='ink'){
        route.push({room:'ink',x:558,y:244},{room:'ink',x:520,y:200},{room:'ink',x:360,y:200},{room:'ink',x:180,y:200},
          {room:'ink',x:122,y:210},{room:'ink',x:122,y:242},getPathPipePoint('b','ink','out'),
          getPathPipePoint('b','relay','in'),{room:'relay',x:420,y:220});current='relay';
      }else if(to==='entry'){
        route.push({room:'relay',x:320,y:250},{room:'relay',x:220,y:280},{room:'relay',x:140,y:280},getPathPipePoint('a','relay','out'),
          getPathPipePoint('a','entry','in'),{room:'entry',x:440,y:232});current='entry';
      }else{
        route.push({room:'relay',x:320,y:250},{room:'relay',x:420,y:232},getPathPipePoint('b','relay','out'),
          getPathPipePoint('b','ink','in'),{room:'ink',x:122,y:242},{room:'ink',x:122,y:210},{room:'ink',x:180,y:200});current='ink';
      }
    }
    return route;
  }
  private recallToCall(id:string):void{
    const finalRecall=id==='latch-c'&&this.progress.flags['l4-latch-c'];
    const previousAssignment=this.assignment;
    const point={x:this.player.x,y:this.player.y};
    this.assignment='follow';this.progress.flags['l4-assignment']='follow';
    this.progress.flags['l4-reunited']=false;
    if(previousAssignment==='practice')this.progress.flags['l4-practice-complete']=true;
    if(previousAssignment==='practice'||previousAssignment==='a'||previousAssignment==='b'||previousAssignment==='c')this.progress.flags[`l4-at-${previousAssignment}`]=false;
    if(finalRecall){this.progress.flags['l4-return-called']=true;this.progress.flags['l4-reunited']=false;}
    this.route=[{room:this.lumoRoom,x:this.lumo.sprite.x,y:this.lumo.sprite.y},...this.pipeRoute(this.lumoRoom,this.room),{room:this.room,x:point.x,y:point.y}];
    this.routeIndex=0;this.persistRoute();this.save();
    // The final recall has its own approved request (§6); every other recall uses §2's. Neither line
    // is the reunion: §6's "Tôi về rồi." waits for a real return in updateReunion().
    this.say(finalRecall?FINAL_RECALL_LINES:RECALL_LINES);
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
    return isValidPathPipeHop(prior,target)&&isNearPathPipeEndpoint({x:this.lumo.sprite.x,y:this.lumo.sprite.y},prior);
  }
  private cancelInvalidRoute():void{
    this.route=[];
    this.routeIndex=0;
    this.assignment='follow';
    this.progress.flags['l4-assignment']='follow';
    this.lumoRoom=this.room;
    this.lumo.sprite.setPosition(Phaser.Math.Clamp(this.player.x-22,30,610),Phaser.Math.Clamp(this.player.y-18,88,300));
    this.lumo.setVisible(true);
    this.progress.flags['l4-lumo-room']=this.room;
    this.progress.counters['l4-lumo-x']=Math.round(this.lumo.sprite.x);
    this.progress.counters['l4-lumo-y']=Math.round(this.lumo.sprite.y);
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
      if(mark==='practice')this.queueStoryBeat(
        PRACTICE_ARRIVAL,
        undefined,
        ()=>this.room==='entry'&&this.hasPower('practice'),
      );
    }
  }
  private queueStoryBeat(lines:DialogueLine[],onComplete?:()=>void,guard?:()=>boolean,onStale?:()=>void):void{
    this.pendingStoryBeats.push({lines,onComplete,guard,onStale});
    this.flushPendingStoryBeat();
  }
  private flushPendingStoryBeat():void{
    if(!this.pendingStoryBeats.length||!this.canStartStory())return;
    const next=this.pendingStoryBeats[0];
    if(next.guard&&!next.guard()){
      this.pendingStoryBeats.shift();
      next.onStale?.();
      return;
    }
    this.pendingStoryBeats.shift();
    this.say(next.lines,next.onComplete);
  }
  private isTravelling():boolean{return this.routeIndex<this.route.length;}
  private getPowerState(){return{assignment:this.assignment,lumoRoom:this.lumoRoom,lumoX:this.lumo.sprite.x,lumoY:this.lumo.sprite.y};}
  private hasPower(mark:'practice'|'a'|'b'|'c'):boolean{return hasDoorPower(mark,this.getPowerState());}
  private isDoorOpen(mark:'practice'|'a'|'b'|'c'):boolean{return this.hasPower(mark)||(mark!=='practice'&&this.progress.flags[`l4-latch-${mark}`]===true);}
  private useDoor(id:string):void{
    // Revalidate the very approach the prompt advertised, and refuse everything while the held-E
    // guard is armed (the room change has just happened).
    if(!this.doorEnabled(id as PathMark))return;
    if(id==='practice'){if(!this.hasPower('practice'))this.say(this.assignment==='practice'&&this.isTravelling()?STILL_TRAVELLING:MARK_NOT_CALLED);else this.say([{speaker:'Nhinh',text:tr('Cửa thử đã mở. Mình có thể đi qua rồi gọi Lumo về.')}]);return;}
    if(id==='c'){
      const blockedBy=getPathExitBlock({latchC:this.progress.flags['l4-latch-c']===true,memoRead:this.progress.flags['l4-memo']===true,reunited:this.isActuallyReunited()});
      if(blockedBy==='latch'){this.say([{speaker:'Nhinh',text:tr('Mình cần gài chốt C trước khi lên tháp.')}]);return;}
      if(blockedBy==='memo'){this.say([{speaker:'Nhinh',text:tr('Mình còn phải đọc vết xoắn để giữ lại ký ức.')}]);return;}
      if(blockedBy==='companion'){this.say(TOWER_NEEDS_LUMO);return;}
      this.prepareLevelExit();
      return;
    }
    const mark=id as 'a'|'b';if(!this.isDoorOpen(mark)){this.say(this.assignment===mark&&this.isTravelling()?STILL_TRAVELLING:MARK_NOT_CALLED);return;}
    if(mark==='a'&&this.room==='entry'){this.transition('relay',PATH_ROOMS.relay.entrySpawn,'l4-visited-relay');return;}
    if(mark==='a'&&this.room==='relay'){this.transition('entry',getPathBackArrival('a'),'l4-room');return;}
    if(mark==='b'&&this.room==='relay'){this.transition('ink',PATH_ROOMS.ink.entrySpawn,'l4-visited-ink');return;}
    if(mark==='b'&&this.room==='ink'){this.transition('relay',getPathBackArrival('b'),'l4-room');return;}
  }
  private transition(to:PathRoomId,spawn:PathPoint,visitFlag:string):void{
    if(visitFlag.startsWith('l4-visited'))this.progress.flags[visitFlag]=true;
    if(shouldRoutePathFollower(this.assignment))this.routeFollowerTo(to,spawn);
    this.room=to;
    this.progress.flags['l4-room']=to;
    this.progress.counters['player-x']=spawn.x;
    this.progress.counters['player-y']=spawn.y;
    this.progress.counters['player-level']=4;
    this.player.setPosition(spawn.x,spawn.y);
    // Arm the held-E guard before the new room registers its controls: the key that opened this door
    // is still down, and the arrival stand of the door just used must not answer a second time.
    this.interactReleasePending=true;
    this.save();
    this.drawRoom();
    this.refresh();
  }
  private routeFollowerTo(room:PathRoomId,spawn:PathPoint):void{
    this.route=[
      {room:this.lumoRoom,x:this.lumo.sprite.x,y:this.lumo.sprite.y},
      ...this.pipeRoute(this.lumoRoom,room),
      {room,x:spawn.x,y:spawn.y},
    ];
    this.routeIndex=0;
    this.persistRoute();
  }
  private addDoors():void{
    const ids=PATH_CONTROL_STANDS.filter(stand=>stand.room===this.room).map(stand=>stand.id);
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
    return isPathThresholdOccupied(this.room,id,{x:this.player.x,y:this.player.y});
  }
  private updateDoors():void{
    for(const [id,body] of this.doorBodies){
      const powered=this.isDoorPowered(id);
      const latched=this.isDoorLatched(id);
      const occupied=this.thresholdOccupied(id);
      body.enable=pathDoorShouldClose(powered,occupied,latched);
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
  private updateInkProgress():void{
    // The layout's own corridor rect: the band the 348×48 mark is drawn over and the masonry leaves
    // open. Every ink observation needs the player actually standing on that band.
    const atCorridor=this.isAtInkCorridor();
    if(this.room==='ink'&&!this.lanternOn&&!this.progress.flags['l4-ink-revealed']&&atCorridor){
      this.progress.flags['l4-ink-revealed']=true;
      this.save();
    }
    // First lit look (approved §4): only before the dark observation exists. It never claims the
    // trail was visible before; it says the marks are faint.
    //
    // The Lumo analogy ("Giống trang sách trong thư viện ấy.") and Nhinh's "Ừ" reply presuppose that
    // both book layers were actually observed in Library Level. The Library exit only requires
    // l2-crystal + l2-fifth-viewed, so a legal save can arrive with neither book layer. Keep the full
    // approved exchange only when the premise is real; otherwise speak the approved factual first
    // line alone (never invent a replacement, never leave the dangling reply, never add a gate).
    const bothBookLayers=this.progress.flags['l2-book-lit']===true&&this.progress.flags['l2-book-dark']===true;
    if(this.room==='ink'&&this.lanternOn&&atCorridor&&!this.progress.flags['l4-ink-revealed']
      &&!this.progress.flags['l4-ink-observed-lit']&&!this.litObservationQueued){
      this.litObservationQueued=true;
      this.queueStoryBeat(
        bothBookLayers?FIRST_LIT_LINES:[FIRST_LIT_LINES[0]],
        ()=>{this.progress.flags['l4-ink-observed-lit']=true;this.litObservationQueued=false;this.save();},
        ()=>this.room==='ink'&&this.lanternOn&&this.isAtInkCorridor()&&this.progress.flags['l4-ink-revealed']!==true,
        ()=>{this.litObservationQueued=false;},
      );
    }
    // Dark look (approved §4): recorded at the real corridor observation, and spoken only while the
    // corridor is still unlit and already revealed.
    if(this.room==='ink'&&!this.lanternOn&&atCorridor&&this.progress.flags['l4-ink-revealed']===true
      &&!this.progress.flags['l4-ink-dark-said']&&!this.darkObservationQueued){
      this.darkObservationQueued=true;
      this.queueStoryBeat(
        DARK_LINES,
        ()=>{this.progress.flags['l4-ink-dark-said']=true;this.darkObservationQueued=false;this.save();},
        ()=>this.room==='ink'&&!this.lanternOn&&this.isAtInkCorridor()&&this.progress.flags['l4-ink-revealed']===true,
        ()=>{this.darkObservationQueued=false;},
      );
    }
    // Relit look (approved §4): only once the dark trail has actually been observed.
    if(this.room==='ink'&&this.lanternOn&&atCorridor&&this.progress.flags['l4-ink-revealed']===true
      &&!this.progress.flags['l4-ink-relit-said']&&!this.relitQueued){
      this.relitQueued=true;
      this.queueStoryBeat(
        RELIT_LINES,
        ()=>{this.progress.flags['l4-ink-relit-said']=true;this.relitQueued=false;this.save();},
        ()=>this.room==='ink'&&this.lanternOn&&this.isAtInkCorridor()&&this.progress.flags['l4-ink-revealed']===true,
        ()=>{this.relitQueued=false;},
      );
    }
    // The near-end beckon needs a plate holder who is actually there; a recall before playback makes
    // the queued line stale and it is dropped instead of pretending Lumo is still waiting.
    if(this.room==='ink'&&this.player.x>=500&&this.hasPower('c')&&!this.progress.flags['l4-beckoned']&&!this.beckoningQueued){
      this.beckoningQueued=true;
      this.queueStoryBeat(
        BECKON_LINES,
        ()=>{this.progress.flags['l4-beckoned']=true;this.beckoningQueued=false;this.save();},
        ()=>this.room==='ink'&&this.player.x>=500&&this.hasPower('c'),
        ()=>{this.beckoningQueued=false;},
      );
    }
    if(this.lastLantern!==this.lanternOn){
      this.lastLantern=this.lanternOn;
      const ink=this.inkTrail;
      if(ink&&ink.active){
        const key=getLevelArtKey(4,this.lanternOn?'ink-route-bright':'ink-route-dark');
        if(key)ink.setTexture(key);
      }
    }
  }
  private isAtInkCorridor():boolean{
    return rectsOverlap(pathActorBody({x:this.player.x,y:this.player.y}),PATH_INK_CORRIDOR);
  }
  private isActuallyReunited():boolean{
    return isActuallyReunited({assignment:this.assignment,travelling:this.isTravelling(),playerRoom:this.room,lumoRoom:this.lumoRoom,
      player:{x:this.player.x,y:this.player.y},lumo:{x:this.lumo.sprite.x,y:this.lumo.sprite.y}});
  }
  private updateReunion():void{
    const reunited=this.isActuallyReunited();
    if(reunited!==Boolean(this.progress.flags['l4-reunited'])){
      this.progress.flags['l4-reunited']=reunited;
      this.save();
    }
    // Approved §6: the reunion speech is a second, later state. It is queued only after a real
    // same-room return and is re-validated at playback, never at recall initiation.
    if(reunited&&this.progress.flags['l4-return-called']===true
      &&!this.progress.flags['l4-reunion-said']&&!this.reunionQueued){
      this.reunionQueued=true;
      this.queueStoryBeat(
        RETURN_LINES,
        ()=>{this.progress.flags['l4-reunion-said']=true;this.reunionQueued=false;this.save();},
        ()=>this.isActuallyReunited()&&this.progress.flags['l4-return-called']===true,
        ()=>{this.reunionQueued=false;},
      );
    }
  }
  private refresh():void{this.refreshArt();this.updateDoors();}
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
      }else if(id.startsWith('call')||id==='inner-call'||id==='practice-call'){
        const mark=id.includes('practice')||id==='inner-call'?'practice':id.includes('-a')?'a':id.includes('-b')?'b':'c';
        const state=this.hasPower(mark as 'practice'|'a'|'b'|'c')?'arrived':this.assignment===mark?'sent':'idle';
        texture=getLevelArtKey(4,`call-${state}`);
      }else if(this.elementFor(id)&&isPathSeal(this.elementFor(id) as PathElement)){
        texture=getLevelArtKey(4,this.hasPower(this.sealMark(id))?'pressure-occupied':'pressure-empty');
      }else if(id==='cable'){
        const mark=object.getData('path-cable') as 'practice'|'a'|'b'|'c';
        const state=this.hasPower(mark)?'arrived':this.assignment===mark?'flow':'rest';
        texture=getLevelArtKey(4,`root-cable-${state}`);
      }
      if(texture)object.setTexture(texture);
    }
  }
  private prepareLevelExit():void{
    const position=this.getLumoPosition();
    this.progress.counters['lumo-x']=position.x;
    this.progress.counters['lumo-y']=position.y;
    this.progress.counters['lumo-target-x']=position.x;
    this.progress.counters['lumo-target-y']=position.y;
    this.progress.flags['l4-route']='';
    this.progress.counters['l4-route-index']=0;
    this.save();
    this.nextLevel(ENDING);
  }
  private imageFor(id:string):Phaser.GameObjects.Image|undefined{return this.objects.find(o=>o instanceof Phaser.GameObjects.Image&&o.getData('path-id')===id) as Phaser.GameObjects.Image|undefined;}
  private addCollider(rect:PathRect):void{const o=this.scene.add.rectangle(rect.x+rect.width/2,rect.y+rect.height/2,rect.width,rect.height,0,0).setVisible(false);this.scene.physics.add.existing(o,true);const body=o.body as Phaser.Physics.Arcade.StaticBody;this.track(o);this.bodies.push(body);this.colliders.push(this.scene.physics.add.collider(this.player.sprite,o));}
  private depthAt(y:number):number{return 10+y/10;}
  private track(o:Phaser.GameObjects.GameObject):void{this.objects.push(o);}
}
