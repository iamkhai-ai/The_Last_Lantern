import Phaser from 'phaser';
import { Lumo } from '../actors/Lumo';
import { Player } from '../actors/Player';
import { CAMPAIGN_LEVELS } from '../data/campaignLevels';
import { OBSERVATORY_ROOMS, type ObservatoryExit, type ObservatoryRoomId, type ObservatoryRoomPoint, type ObservatoryWaypointId } from '../data/observatoryRooms';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LanternSystem } from '../systems/LanternSystem';
import { CampaignProgress, CampaignSaveSystem } from '../systems/CampaignSaveSystem';
import { deriveObservatoryState } from '../systems/ObservatoryPuzzle';
import { SoundSystem } from '../systems/SoundSystem';
import { DialogueLine } from '../types/gameTypes';
import { PauseMenu } from '../ui/PauseMenu';

type KeySet = { e: Phaser.Input.Keyboard.Key; f: Phaser.Input.Keyboard.Key; h: Phaser.Input.Keyboard.Key; j: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key; esc: Phaser.Input.Keyboard.Key };

const OPENING: DialogueLine[][] = [
  [{ speaker: 'Nhinh', text: 'Trời vẫn chưa sáng sao? Mình nhớ con đường vào rừng… còn đoạn sau thì mờ quá.' }, { speaker: 'Lumo', text: 'Cuối cùng cũng có người nghe thấy tôi! Tôi là Lumo. Đây là Elaria. Đáng lẽ giờ này sương phải tan rồi.' }, { speaker: 'Nhinh', text: 'Vậy mình cùng tìm Cây Mẹ. Nhưng trước hết, chiếc đèn này là của ai?' }],
  [{ speaker: 'Lumo', text: 'Đom đóm vẫn đi đúng đường cũ. Tôi nhớ tiếng lá và tiếng trẻ con, nhưng không nhớ rõ hơn.' }, { speaker: 'Nhinh', text: 'Mình xem những bia đá muốn chỉ gì đã. Bài thơ nhắc Trăng, Lá, rồi Sao.' }],
  [{ speaker: 'Nhinh', text: 'Sách mọc giữa rễ cây. Bốn bức tranh đã bị tháo khỏi vòng ngày đêm.' }, { speaker: 'Lumo', text: 'Người Elaria gửi ký ức vào đây. Hãy xem từng bức dưới ánh đèn và trong bóng tối.' }],
  [{ speaker: 'Nhinh', text: 'Mặt suối không chuyển động. Cây Mẹ đang chờ ba tinh thể.' }, { speaker: 'Lumo', text: 'Những chiếc cầu nhận sức từ ánh sáng. Đặt đèn lên bệ rồi dẫn tia qua các gương.' }],
  [{ speaker: 'Nhinh', text: 'Cửa không có tay mở ở phía này.' }, { speaker: 'Lumo', text: 'Tôi thấy một dấu giống cánh của tôi phía sau khe đá. Cậu gọi tôi tới đó nhé?' }],
  [{ speaker: 'Nhinh', text: 'Tháp vẫn đang hút nước và phát sáng.' }, { speaker: 'Lumo', text: 'Tôi có thể giữ ấn ở trên cao. Cậu nối hai luồng sáng còn lại nhé.' }],
  [{ speaker: 'Nhinh', text: 'Khu vườn đã ngủ quá lâu. Cây nắng và rễ trăng vẫn còn đây.' }, { speaker: 'Lumo', text: 'Chúng cần hai điều khác nhau: ánh sáng ấm và một khoảng tối dịu.' }],
  [{ speaker: 'Nhinh', text: 'Hai mắt ngoài hướng về bàn cân. Mắt ở giữa lại nằm trong một hốc tối.' }, { speaker: 'Lumo', text: 'Có lẽ câu đố cần cả ánh sáng lẫn một vùng không có ánh sáng.' }],
  [{ speaker: 'Nhinh', text: 'Ba phòng quan sát cùng hướng về Cây Mẹ.' }, { speaker: 'Lumo', text: 'Tôi nghe tiếng mưa trong ký ức. Có ai đó đã gọi tôi từ tòa tháp này.' }],
  [{ speaker: 'Nhinh', text: 'Ba tinh thể đã tìm được đường về đây.' }, { speaker: 'Lumo', text: 'Trái tim Cây Mẹ cần chúng ta cùng giữ ánh sáng và bóng tối cân bằng.' }],
];

export class CampaignScene extends Phaser.Scene {
  private progress!: CampaignProgress;
  private player!: Player;
  private lumo!: Lumo;
  private lumoTarget = { x: 345, y: 265 };
  private lantern!: LanternSystem;
  private interactions!: InteractionSystem;
  private dialogue!: DialogueSystem;
  private pauseMenu!: PauseMenu;
  private keys!: KeySet;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomColliders: Phaser.Physics.Arcade.Collider[] = [];
  private activeObservatoryRoom: ObservatoryRoomId | null = null;
  private roomDoors = new Map<string, { image: Phaser.GameObjects.Image; body: Phaser.Physics.Arcade.StaticBody; exit: ObservatoryExit }>();
  private observatoryPuzzleVisuals = new Map<string, Phaser.GameObjects.GameObject>();
  private observatoryRootBody: Phaser.Physics.Arcade.StaticBody | null = null;
  private observatoryBridgeBounds = new Phaser.Geom.Rectangle(330, 280, 132, 40);
  private observatoryBridgePendingRemoval = false;
  private observatoryBridgeTraversalSide: 'near' | 'far' | null = null;
  private hintIndex = 0;
  private selectedStone = -1;
  private heartEnd = false;
  private titleText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private lumoStatusText!: Phaser.GameObjects.Text;
  private lastGateCheck = 0;
  private lastLumoSave = 0;
  private lastPlayerSave = 0;
  private runeRevealExpiresAt = 0;
  private readonly activeRevealedRunes = new Set<string>();

  constructor() { super({ key: 'CampaignScene' }); }

  public create(data?: { newGame?: boolean }): void {
    if (data?.newGame) {
      this.progress = CampaignSaveSystem.createDefaultProgress();
      CampaignSaveSystem.save(this.progress);
    } else {
      this.progress = CampaignSaveSystem.load();
    }
    this.hintIndex = 0;
    this.selectedStone = -1;
    this.heartEnd = false;
    this.lastPlayerSave = 0;
    this.runeRevealExpiresAt = 0;
    this.activeRevealedRunes.clear();
    this.player = new Player(this, 320, 290);
    this.lumoTarget = this.getSavedLumoTarget();
    this.lumo = new Lumo(this, this.progress.counters['lumo-x'] ?? this.lumoTarget.x, this.progress.counters['lumo-y'] ?? this.lumoTarget.y);
    this.lantern = new LanternSystem(this);
    this.lantern.lanternOn = this.progress.lanternOn;
    this.lantern.lanternInHand = this.progress.lanternPickedUp || this.progress.level > 0;
    this.interactions = new InteractionSystem(this);
    this.dialogue = new DialogueSystem(this);
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => undefined,
      onRestart: () => { CampaignSaveSystem.clear(); this.scene.restart({ newGame: true }); },
      onMainMenu: () => this.scene.start('MenuScene'),
    });
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = {
      e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      f: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      h: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      j: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
    keyboard.on('keydown-E', () => {
      if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else if (!this.pauseMenu.isOpen()) this.interactions.tryInteract(performance.now());
    });
    keyboard.on('keydown-SPACE', () => {
      if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else if (!this.pauseMenu.isOpen()) this.lantern.triggerPulse(this.player.x, this.player.y);
    });
    keyboard.on('keydown-F', () => {
      const finalToggleAvailable = this.progress.level === 9 && this.progress.flags['l9-roots'] && ((this.progress.flags['l9-overload'] && this.lantern.lanternInHand && this.lantern.lanternOn) || this.lantern.lanternPlaced);
      if ((!this.dialogue.isInputLocked(performance.now()) || finalToggleAvailable) && !this.pauseMenu.isOpen()) {
        if (this.progress.level === 9 && this.progress.flags['l9-roots'] && this.lantern.lanternPlaced) {
          this.lantern.lanternOn = false;
          this.progress.lanternOn = false;
          this.lantern.isOverloadMode = false;
          SoundSystem.playLanternToggle(false);
          this.save();
          this.finishHeart();
          return;
        }
        if (this.lantern.toggleLantern(performance.now())) {
          this.progress.lanternOn = this.lantern.lanternOn;
          this.save();
          if (this.progress.level === 9 && this.progress.flags['l9-roots'] && this.progress.flags['l9-overload'] && !this.lantern.lanternOn) {
            this.lantern.isOverloadMode = true;
            this.finishHeart();
          }
        }
      }
    });
    keyboard.on('keydown-H', () => { if (!this.dialogue.isActive() && !this.pauseMenu.isOpen()) this.showHint(); });
    keyboard.on('keydown-J', () => { if (!this.dialogue.isActive() && !this.pauseMenu.isOpen()) this.progress.level === 8 ? this.showObservatoryJournal() : this.showRuneJournal(); });
    keyboard.on('keydown-ESC', () => {
      if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else if (!this.pauseMenu.isOpen()) this.pauseMenu.open();
      else this.pauseMenu.close();
    });

    this.lantern.onPulse((x, y, radius) => {
      this.progress.flags['pulse-used'] = true;
      if (this.progress.level === 0 && this.progress.flags['l0-tablet-read'] && Math.hypot(x - 320, y - 214) <= radius) this.progress.flags['l0-footprints-found'] = true;
      if (this.progress.level === 1) {
        this.activeRevealedRunes.clear();
        this.runeRevealExpiresAt = this.time.now + 5000;
        for (const [id, pos] of Object.entries(this.getRunePositions())) {
          if (Math.hypot(pos.x - x, pos.y - y) <= radius) {
            this.activeRevealedRunes.add(id);
            this.progress.flags[`l1-seen-${id}`] = true;
          }
        }
        this.updateRuneRevealVisuals();
      } else if (this.progress.level === 8) {
        for (const [id, pos] of Object.entries(this.getRunePositions())) {
          if (Math.hypot(pos.x - x, pos.y - y) <= radius) this.progress.flags[`revealed-${id}`] = true;
        }
      }
      this.save();
      this.refreshHud();
    });
    this.buildLevel();
  }

  public update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    const locked = this.dialogue.isInputLocked(performance.now()) || this.pauseMenu.isOpen() || this.heartEnd;
    this.player.update(dt, !locked, this.lantern.lanternInHand, this.lantern.lanternOn);
    if (this.progress.level === 8) this.updateObservatoryLumo(dt);
    else this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y);
    if (this.time.now - this.lastLumoSave >= 600) {
      this.lastLumoSave = this.time.now;
      const x = Math.round(this.lumo.sprite.x);
      const y = Math.round(this.lumo.sprite.y);
      const lumoXKey = this.progress.level === 8 ? 'l8-lumo-x' : 'lumo-x';
      const lumoYKey = this.progress.level === 8 ? 'l8-lumo-y' : 'lumo-y';
      if (Math.abs((this.progress.counters[lumoXKey] ?? x) - x) > 3 || Math.abs((this.progress.counters[lumoYKey] ?? y) - y) > 3) {
        this.progress.counters[lumoXKey] = x;
        this.progress.counters[lumoYKey] = y;
        this.save();
      }
    }
    if (this.time.now - this.lastPlayerSave >= 600) {
      this.lastPlayerSave = this.time.now;
      const x = Math.round(this.player.x);
      const y = Math.round(this.player.y);
      if (this.progress.level === 8 && this.activeObservatoryRoom) {
        const checkpoint = this.resolveSafeObservatoryCheckpoint(this.activeObservatoryRoom, x, y);
        if (checkpoint) {
          this.progress.roomId = this.activeObservatoryRoom;
          this.progress.roomSpawn = checkpoint;
        }
      }
      if (this.progress.counters['player-level'] !== this.progress.level || Math.abs((this.progress.counters['player-x'] ?? x) - x) > 3 || Math.abs((this.progress.counters['player-y'] ?? y) - y) > 3) {
        this.progress.counters['player-level'] = this.progress.level;
        this.progress.counters['player-x'] = x;
        this.progress.counters['player-y'] = y;
        this.save();
      }
    }
    this.lantern.update(dt, this.player.x, this.player.y);
    if (this.progress.level === 8 && this.activeObservatoryRoom) {
      this.updateObservatoryCrossingState();
      this.refreshObservatoryDoors();
      this.refreshObservatoryPuzzle();
    }
    this.interactions.update(this.player.x, this.player.y, !locked);
    this.updatePuzzle(dt);
    this.dialogue.update(dt);
    this.refreshHud();
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) && !locked && !this.pauseMenu.isOpen()) this.pauseMenu.open();
  }

  private buildLevel(): void {
    if (this.progress.level === 8) {
      this.buildObservatoryRoom(this.progress.roomId ?? 'entrance');
      return;
    }
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.interactions.clear();
    const level = this.progress.level;
    const definition = CAMPAIGN_LEVELS[level];
    this.selectedStone = -1;
    this.drawRoom(definition.biome);
    this.titleText = this.track(this.add.text(16, 13, `${String(level + 1).padStart(2, '0')}  ${definition.title}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#f7dfaa', backgroundColor: '#07151cbb', padding: { x: 8, y: 5 } }).setDepth(86));
    this.objectiveText = this.track(this.add.text(16, 42, definition.objective, { fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', color: '#e5eee8', backgroundColor: '#07151cbb', padding: { x: 8, y: 5 } }).setDepth(86));
    this.statusText = this.track(this.add.text(16, 320, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#d3e5dc', backgroundColor: '#07151cbb', padding: { x: 8, y: 4 } }).setDepth(86));
    this.hintText = this.track(this.add.text(624, 320, 'H · Gợi ý', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#ffe680', backgroundColor: '#07151cbb', padding: { x: 8, y: 4 } }).setOrigin(1, 0).setDepth(86));
    this.lumoStatusText = this.track(this.add.text(624, 13, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#b8f5d4', backgroundColor: '#07151cbb', padding: { x: 7, y: 5 } }).setOrigin(1, 0).setDepth(86));
    const overloadCheckpoint = level === 9 && this.progress.flags['l9-roots'] && this.progress.flags['l9-overload'];
    const savedPlayerX = this.progress.counters['player-level'] === level ? this.progress.counters['player-x'] : undefined;
    const savedPlayerY = this.progress.counters['player-level'] === level ? this.progress.counters['player-y'] : undefined;
    this.player.setPosition(
      overloadCheckpoint ? 130 : typeof savedPlayerX === 'number' ? Phaser.Math.Clamp(savedPlayerX, 24, 616) : 320,
      overloadCheckpoint ? 205 : typeof savedPlayerY === 'number' ? Phaser.Math.Clamp(savedPlayerY, 58, 305) : 290,
    );
    this.lumoTarget = overloadCheckpoint ? { x: 165, y: 205 } : this.getSavedLumoTarget();
    this.lumo.sprite.setPosition(overloadCheckpoint ? this.lumoTarget.x : this.progress.counters['lumo-x'] ?? this.lumoTarget.x, overloadCheckpoint ? this.lumoTarget.y : this.progress.counters['lumo-y'] ?? this.lumoTarget.y);
    this.lumo.setVisible(true);
    this.lantern.lanternInHand = this.progress.lanternPickedUp || level > 0;
    this.lantern.lanternOn = this.progress.lanternOn;
    this.lantern.lanternPlaced = false;
    this.lantern.isDawnMode = false;
    this.lantern.isOverloadMode = false;
    if (level === 9 && this.progress.flags['l9-roots'] && !this.progress.flags['l9-overload']) this.lantern.placeLanternAt(100, 205);
    if (level === 9 && this.progress.flags['l9-overload']) this.lantern.isOverloadMode = true;
    if (level === 7 && this.progress.flags['l7-lantern-placed'] && !this.progress.flags['l7-solved']) this.lantern.placeLanternAt(120, 205);
    if (level === 3 && this.progress.flags['l3-lantern-placed'] && !this.progress.flags['l3-lantern-retrieved']) this.lantern.placeLanternAt(120, 205);
    this.addNarrativeProps(level);
    this.registerLevel(level);
    if (level === 1) this.updateRuneRevealVisuals();
    if (!this.progress.flags[`intro-${level}`]) {
      this.progress.flags[`intro-${level}`] = true;
      this.save();
      this.dialogue.startDialogue(OPENING[level]);
    }
    this.refreshHud();
  }

  public buildObservatoryRoom(roomId: ObservatoryRoomId, spawnId?: string): void {
    const room = OBSERVATORY_ROOMS[roomId];
    this.clearActiveRoom();
    this.activeObservatoryRoom = roomId;
    if (!this.titleText || !this.titleText.scene) {
      const level = CAMPAIGN_LEVELS[8];
      this.titleText = this.track(this.add.text(16, 13, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#f7dfaa', backgroundColor: '#07151cbb', padding: { x: 8, y: 5 } }).setDepth(86));
      this.objectiveText = this.track(this.add.text(16, 42, level.objective, { fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', color: '#e5eee8', backgroundColor: '#07151cbb', padding: { x: 8, y: 5 } }).setDepth(86));
      this.statusText = this.track(this.add.text(16, 320, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#d3e5dc', backgroundColor: '#07151cbb', padding: { x: 8, y: 4 } }).setDepth(86));
      this.hintText = this.track(this.add.text(624, 320, 'H · Gợi ý', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#ffe680', backgroundColor: '#07151cbb', padding: { x: 8, y: 4 } }).setOrigin(1, 0).setDepth(86));
      this.lumoStatusText = this.track(this.add.text(624, 13, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#b8f5d4', backgroundColor: '#07151cbb', padding: { x: 7, y: 5 } }).setOrigin(1, 0).setDepth(86));
    }
    this.titleText.setText(`09  ${room.title} · ${CAMPAIGN_LEVELS[8].chapter}`);
    this.drawObservatoryBackground(roomId);
    this.buildObservatoryRootBed(roomId);

    for (const obstacle of room.obstacles) {
      if (obstacle.dynamic) continue;
      const texture = obstacle.kind === 'statue' ? 'guardian_statue' : obstacle.kind === 'pillar' ? 'ruin_pillar' : 'rock_blocker';
      const image = this.add.image(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, texture)
        .setDisplaySize(obstacle.width, obstacle.height).setDepth(8 + Math.floor((obstacle.y + obstacle.height) / 10));
      this.roomObjects.push(image);
      const bodyObject = this.add.rectangle(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width, obstacle.height, 0x000000, 0);
      this.physics.add.existing(bodyObject, true);
      const body = bodyObject.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(obstacle.width, obstacle.height);
      this.roomObjects.push(bodyObject);
      this.roomColliders.push(this.physics.add.collider(this.player.sprite, bodyObject));
    }

    for (const item of room.interactables) {
      if (item.textureKey && item.id !== 'statue') {
        const image = this.add.image(item.position.x, item.position.y, item.textureKey).setScale(0.9).setDepth(8 + Math.floor(item.position.y / 10));
        if (item.id !== 'balance-crystal' || this.progress.flags['l8-balance-crystal'] !== true) this.roomObjects.push(image);
        else image.destroy();
        if (item.id === 'g0' || item.id === 'g1' || item.id === 'g2' || item.id === 'sun-lock' || item.id === 'lantern-pedestal') this.observatoryPuzzleVisuals.set(item.id, image);
      }
      if (item.id === 'statue') {
        const statue = this.add.image(item.position.x, item.position.y, 'guardian_statue').setScale(0.9).setDepth(8 + Math.floor(item.position.y / 10));
        this.roomObjects.push(statue);
        this.observatoryPuzzleVisuals.set('statue', statue);
      }
      if (roomId === 'corridor' && (item.id === 'door-a-control' || item.id === 'sun-door-control')) {
        const control = this.add.image(item.position.x, item.position.y, 'receiver_off').setScale(0.62).setDepth(9 + Math.floor(item.position.y / 10));
        this.roomObjects.push(control);
      }
      this.registerObservatoryInteractable(item);
    }

    for (const exit of room.exits) this.addObservatoryExit(exit);
    const safeSpawn = this.resolveObservatorySpawn(room, spawnId);
    this.player.setPosition(...safeSpawn);
    this.restoreObservatoryLanternPlacement();
    if (!['entrance', 'corridor', 'observatory'].includes(String(this.progress.flags['l8-lumo-room']))) this.progress.flags['l8-lumo-room'] = 'entrance';
    const lumoRoom = this.getObservatoryLumoRoom();
    this.lumo.setVisible(lumoRoom === roomId);
    this.lumo.sprite.setPosition(this.progress.counters['l8-lumo-x'] ?? this.progress.counters['lumo-x'] ?? this.lumoTarget.x, this.progress.counters['l8-lumo-y'] ?? this.progress.counters['lumo-y'] ?? this.lumoTarget.y);
    this.progress.roomId = roomId;
    this.progress.roomSpawn = { x: safeSpawn[0], y: safeSpawn[1] };
    this.save();
    this.refreshObservatoryDoors();
    this.refreshObservatoryPuzzle();
    if (!this.progress.flags['intro-8']) {
      this.progress.flags['intro-8'] = true;
      this.save();
      this.dialogue.startDialogue(OPENING[8]);
    }
    this.refreshHud();
  }

  public clearActiveRoom(): void {
    for (const collider of this.roomColliders) collider.destroy();
    this.roomColliders = [];
    this.observatoryRootBody = null;
    this.observatoryBridgePendingRemoval = false;
    this.observatoryBridgeTraversalSide = null;
    this.observatoryPuzzleVisuals.clear();
    for (const object of this.roomObjects) object.destroy();
    this.roomObjects = [];
    this.roomDoors.clear();
    this.activeObservatoryRoom = null;
    this.interactions.clear();
  }

  private buildObservatoryRootBed(roomId: ObservatoryRoomId): void {
    if (roomId !== 'observatory') return;
    const roots = this.add.graphics().setDepth(15);
    roots.fillStyle(0x385044, 1);
    roots.fillRoundedRect(this.observatoryBridgeBounds.x, this.observatoryBridgeBounds.y, this.observatoryBridgeBounds.width, this.observatoryBridgeBounds.height, 8);
    roots.lineStyle(3, 0x83a65f, 0.9);
    for (let x = this.observatoryBridgeBounds.x + 12; x < this.observatoryBridgeBounds.right; x += 24) {
      roots.lineBetween(x, this.observatoryBridgeBounds.y + 4, x + 10, this.observatoryBridgeBounds.bottom - 4);
    }
    this.roomObjects.push(roots);
    this.observatoryPuzzleVisuals.set('root-bed', roots);

    const rootBodyObject = this.add.rectangle(
      this.observatoryBridgeBounds.centerX,
      this.observatoryBridgeBounds.centerY,
      this.observatoryBridgeBounds.width,
      this.observatoryBridgeBounds.height,
      0x000000,
      0,
    );
    this.physics.add.existing(rootBodyObject, true);
    this.observatoryRootBody = rootBodyObject.body as Phaser.Physics.Arcade.StaticBody;
    this.roomObjects.push(rootBodyObject);
    this.roomColliders.push(this.physics.add.collider(this.player.sprite, rootBodyObject));

    const bridge = this.add.image(this.observatoryBridgeBounds.centerX, this.observatoryBridgeBounds.centerY, 'stepping_stone')
      .setDisplaySize(this.observatoryBridgeBounds.width, this.observatoryBridgeBounds.height)
      .setDepth(16)
      .setVisible(false);
    this.roomObjects.push(bridge);
    this.observatoryPuzzleVisuals.set('root-bridge', bridge);
  }

  private registerObservatoryInteractable(item: (typeof OBSERVATORY_ROOMS)[ObservatoryRoomId]['interactables'][number]): void {
    const { id, interactionPoint } = item;
    const register = (onInteract: () => void, getPrompt: () => string, isEnabled?: () => boolean): void => {
      this.interactions.register({ id: `observatory-${id}`, x: interactionPoint.x, y: interactionPoint.y, radius: 34, getPrompt, isEnabled, onInteract });
    };

    if (id === 'g0' || id === 'g1' || id === 'g2') {
      const mirror = id;
      register(
        () => { this.progress.counters[mirror] = (this.value(mirror) + 1) % 4; this.save(); this.refreshObservatoryPuzzle(); SoundSystem.playMirrorRotate(); },
        () => `E · Rotate ${mirror.toUpperCase()} (${this.value(mirror)} · 0 east, 1 south, 2 west, 3 north)`,
      );
    } else if (id === 'statue') {
      register(
        () => { this.progress.counters.statue = (this.value('statue') + 1) % 4; this.save(); this.refreshObservatoryPuzzle(); SoundSystem.playMirrorRotate(); },
        () => `E · Turn statue (${this.value('statue')})`,
      );
    } else if (id === 'splitter') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: 'Bộ chia cố định gửi một nhánh tới khóa Mặt Trời, nhánh kia qua bóng pho tượng.' }]),
        () => 'E · Inspect fixed splitter',
      );
    } else if (id === 'lantern-pedestal') {
      register(
        () => {
          if (this.lantern.lanternPlaced) {
            this.lantern.retrieveLantern();
            this.progress.flags['l8-lantern-placed'] = false;
          } else if (this.lantern.lanternInHand) {
            this.lantern.placeLanternAt(item.position.x, item.position.y);
            this.progress.flags['l8-lantern-placed'] = true;
          }
          this.progress.lanternOn = this.lantern.lanternOn;
          this.progress.counters['l8-lantern-x'] = this.lantern.placedX;
          this.progress.counters['l8-lantern-y'] = this.lantern.placedY;
          this.save();
          this.refreshObservatoryPuzzle();
        },
        () => this.lantern.lanternPlaced ? 'E · Retrieve lantern' : this.lantern.lanternInHand ? 'E · Place lantern on pedestal' : 'Lantern unavailable',
        () => this.lantern.lanternPlaced || this.lantern.lanternInHand,
      );
      this.interactions.register({
        id: 'observatory-lumo-call-point', x: interactionPoint.x + 48, y: interactionPoint.y, radius: 30,
        getPrompt: () => this.progress.flags['l8-lumo-recalled'] === true ? 'E · Call Lumo to the seal' : 'E · Recall Lumo to the lantern',
        onInteract: () => this.callObservatoryLumo(this.progress.flags['l8-lumo-recalled'] === true ? 'seal' : 'recall'),
      });
    } else if (id === 'lumo-tube' || id === 'lumo-seal') {
      register(
        () => {
          if (id === 'lumo-tube' && this.getObservatoryState().lumoAtSeal) this.callObservatoryLumo('recall');
          else if (this.getObservatoryState().lumoAtSeal) this.say([{ speaker: 'Lumo', text: 'Tôi đang giữ ấn. Gọi tôi về bệ đèn khi cần.' }]);
          else this.callObservatoryLumo('seal');
        },
        () => id === 'lumo-tube' && this.getObservatoryState().lumoAtSeal ? 'E · Recall Lumo through the tube' : this.getObservatoryState().lumoAtSeal ? 'Lumo holds the seal' : 'E · Call Lumo through the tube',
      );
    } else if (id === 'door-a-control') {
      register(
        () => { this.progress.flags['l8-door-a-latched'] = true; this.save(); this.refreshObservatoryDoors(); },
        () => this.progress.flags['l8-door-a-latched'] ? 'Door A is latched open' : 'E · Latch Door A from this side',
        () => this.activeObservatoryRoom === 'corridor' && !this.progress.flags['l8-door-a-latched'],
      );
    } else if (id === 'sun-door-control') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: this.getObservatoryState().sunDoorUnlocked ? 'Cánh cửa đã nhận ánh sáng.' : 'Cánh cửa vẫn đòi hỏi một đường sáng hoàn chỉnh.' }]),
        () => this.getObservatoryState().sunDoorUnlocked ? 'Sun Door is open' : 'Sun Door is sealed',
      );
    } else if (id === 'sun-lock') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: this.getObservatoryState().sunDoorUnlocked ? 'Khóa Mặt Trời đang được chiếu sáng.' : 'Khóa cần tia sáng đi tới đây.' }]),
        () => this.getObservatoryState().sunDoorUnlocked ? 'Sun lock lit' : 'E · Inspect Sun lock',
      );
    } else if (id === 'root-bridge') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: this.getObservatoryState().bridgeEligible ? 'Bóng rễ đã kết thành cầu.' : 'Cầu chỉ thành hình khi khóa Mặt Trời sáng, rễ nằm trong bóng và Lumo giữ ấn.' }]),
        () => this.getObservatoryState().bridgeEligible ? 'Root bridge is stable' : 'E · Inspect root bridge',
      );
    } else if (id === 'root-bed') {
      register(
        () => this.say([{ speaker: 'Nhinh', text: this.getObservatoryState().rootBedShadowed ? 'Pho tượng đã che bóng lên rễ.' : 'Rễ vẫn đang cản lối.' }]),
        () => this.getObservatoryState().rootBedShadowed ? 'Roots are in shadow' : 'E · Inspect root bed',
      );
    } else if (id === 'final-door-control') {
      register(
        () => {
          if (!this.progress.flags['l8-final-door-latched']) {
            this.progress.flags['l8-final-door-latched'] = true;
            this.save();
            this.say([{ speaker: 'Nhinh', text: 'Chốt đá đã gài. Lối vòng có thể được mở từ bên này.' }]);
            return;
          }
          if (this.isObservatoryCompletionReady()) {
            this.nextLevel([{ speaker: 'Nhinh', text: 'Bản ghi đã được giữ, Lumo trở về và Tinh thể Cân Bằng đã sáng. Mình hãy đưa nó về Cây Mẹ.' }, { speaker: 'Lumo', text: 'Lần này mình đi cùng nhau.' }]);
          } else {
            this.say([{ speaker: 'Nhinh', text: 'Lối vòng vẫn mở. Mình cần thu hồi đèn, gọi Lumo về, đọc bản ghi và nhận Tinh thể Cân Bằng trước khi rời đài.' }]);
          }
        },
        () => this.progress.flags['l8-final-door-latched'] ? (this.isObservatoryCompletionReady() ? 'E · Trở về Cây Mẹ' : 'E · Kiểm tra hành trình trở về') : 'E · Gài chốt cửa cuối',
        () => this.progress.flags['l8-bridge-crossed'] === true,
      );
    } else if (id === 'stone-return-loop') {
      this.interactions.register({
        id: 'observatory-stone-return-loop-control', x: 500, y: 286, radius: 30,
        getPrompt: () => this.progress.flags['l8-return-loop-open'] ? 'The stone return loop is open' : 'E · Open the stone return loop',
        isEnabled: () => this.progress.flags['l8-final-door-latched'] === true,
        onInteract: () => {
          if (!this.progress.flags['l8-return-loop-open']) {
            this.progress.flags['l8-return-loop-open'] = true;
            this.save();
            this.refreshObservatoryDoors();
            this.say([{ speaker: 'Nhinh', text: 'Lối đá đã khớp vào vòng. Đường về bệ đèn vẫn thông ngay cả khi ánh sáng tắt.' }]);
          }
        },
      });
    } else if (id === 'final-record') {
      register(
        () => {
          if (this.progress.flags['l8-record-read']) {
            this.say([{ speaker: 'Nhinh', text: 'Bản ghi đã được chép vào sổ. The Shadow chỉ là ký ức mắc lại trong đêm cuối.' }]);
            return;
          }
          this.progress.flags['l8-record-read'] = true;
          this.save();
          this.say([
            { speaker: 'Nhinh', text: 'E · Bản ghi cuối. Người Bảo Vệ đã nhờ Lumo giữ mạch phía Bắc thêm một đêm, nhưng nỗi sợ đã giữ cả khu rừng trong bóng tối.' },
            { speaker: 'Lumo', text: 'Tôi tưởng mình đang giúp ông ấy đưa mọi người về. Tôi đã quên rằng khu rừng cũng cần được nghỉ.' },
            { speaker: 'The Shadow', text: 'Ta là phần ký ức còn mắc lại trong đêm ấy. Ta muốn dẫn một người về nhà, rồi giữ mọi người ở lại cùng nỗi chờ của mình.' },
          ]);
        },
        () => this.progress.flags['l8-record-read'] ? 'E · Đọc lại bản ghi cuối' : 'E · Đọc bản ghi với The Shadow',
        () => this.progress.flags['l8-return-loop-open'] === true
          && this.lantern.lanternInHand && !this.lantern.lanternPlaced
          && this.progress.flags['l8-lumo-recalled'] === true
          && this.progress.flags['l8-lumo-arrived'] === 'lantern-source',
      );
    } else if (id === 'balance-crystal') {
      register(
        () => {
          this.progress.flags['l8-balance-crystal'] = true;
          this.save();
          const image = this.roomObjects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.texture.key === 'crystal_balance');
          image?.destroy();
          this.say([{ speaker: 'The Shadow', text: 'Đưa vòng ngày đêm đi tiếp. Khi tới lúc buông tay, đừng để nỗi sợ giữ tay con lại.' }, { speaker: 'Lumo', text: 'Tinh thể Cân Bằng. Bây giờ mình có thể trở về Cây Mẹ.' }]);
        },
        () => 'E · Nhận Tinh thể Cân Bằng',
        () => this.progress.flags['l8-record-read'] === true && this.progress.flags['l8-balance-crystal'] !== true,
      );
    }
  }

  public callObservatoryLumo(destination: 'seal' | 'recall'): void {
    if (this.progress.level !== 8 || !this.activeObservatoryRoom) return;
    const lumoRoom = this.getObservatoryLumoRoom();
    const steps: ObservatoryRoomPoint[] = [];
    const add = (roomId: ObservatoryRoomId, x: number, y: number): void => { steps.push({ roomId, x, y }); };
    if (destination === 'seal') {
      if (lumoRoom === 'observatory') {
        add('observatory', 24, 180);
        add('corridor', 596, 180);
      } else if (lumoRoom === 'entrance') {
        add('entrance', 586, 145);
        add('corridor', 42, 180);
      }
      const tube = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-tube-entry')!.position;
      const seal = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-seal')!.position;
      add(tube.roomId, tube.x, tube.y);
      add(seal.roomId, seal.x, seal.y);
    } else {
      if (lumoRoom === 'observatory') {
        add('observatory', 24, 180);
        add('corridor', 596, 180);
      }
      if (lumoRoom !== 'entrance') {
        const tube = OBSERVATORY_ROOMS.corridor.waypoints.find((waypoint) => waypoint.id === 'lumo-tube-entry')!.position;
        add(tube.roomId, tube.x, tube.y);
        add('entrance', 586, 145);
      }
      const source = OBSERVATORY_ROOMS.entrance.waypoints.find((waypoint) => waypoint.id === 'lantern-source')!.position;
      add(source.roomId, source.x, source.y);
    }
    this.progress.flags['l8-lumo-destination'] = destination === 'seal' ? 'lumo-seal' : 'lantern-source';
    this.progress.flags['l8-lumo-arrived'] = '';
    this.progress.flags['l8-lumo-route-json'] = JSON.stringify(steps);
    this.progress.counters['l8-lumo-route-index'] = 0;
    this.progress.flags['l8-lumo-recalled'] = false;
    this.save();
    this.say([{ speaker: 'Nhinh', text: destination === 'seal' ? 'Lumo, đi theo ống sáng tới ấn giúp mình nhé.' : 'Lumo, trở về bên bệ đèn nhé.' }, { speaker: 'Lumo', text: 'Tôi sẽ đi theo đường đã mở.' }]);
  }

  public transitionObservatory(exitId: string): void {
    if (this.progress.level !== 8 || !this.activeObservatoryRoom) return;
    const exit = OBSERVATORY_ROOMS[this.activeObservatoryRoom].exits.find((item) => item.id === exitId);
    if (!exit) return;
    const state = this.getObservatoryState();
    const unlocked = exit.doorId === 'door-a' ? state.doorAUnlocked
      : exit.doorId === 'sun-door' ? state.sunDoorUnlocked
      : this.progress.flags['l8-return-loop-open'] === true;
    if (!unlocked) {
      this.say([{ speaker: 'Nhinh', text: exit.doorId === 'door-a' ? 'Door A đang khóa từ phía này.' : exit.doorId === 'sun-door' ? 'Cánh cửa Mặt Trời vẫn đang khép.' : 'Lối đá vẫn chưa hiện ra.' }]);
      return;
    }
    const destination = OBSERVATORY_ROOMS[exit.toRoom].spawns.find((spawn) => spawn.id === exit.destinationSpawnId);
    if (!destination) return;
    this.progress.roomId = exit.toRoom;
    this.progress.roomSpawn = { ...destination.position };
    this.progress.counters['player-level'] = 8;
    this.progress.counters['player-x'] = destination.position.x;
    this.progress.counters['player-y'] = destination.position.y;
    this.save();
    this.buildObservatoryRoom(exit.toRoom, destination.id);
  }

  private resolveObservatorySpawn(room: typeof OBSERVATORY_ROOMS[ObservatoryRoomId], spawnId?: string): [number, number] {
    const requestedSpawnId = spawnId ?? (this.progress.roomId === room.id ? undefined : room.entrySpawnId);
    const spawn = requestedSpawnId ? room.spawns.find((candidate) => candidate.id === requestedSpawnId) : undefined;
    if (spawn) return [spawn.position.x, spawn.position.y];
    if (this.progress.roomId === room.id && this.progress.roomSpawn) {
      const safe = this.resolveSafeObservatoryCheckpoint(room.id, this.progress.roomSpawn.x, this.progress.roomSpawn.y);
      if (safe) return [safe.x, safe.y];
    }
    const entry = room.spawns.find((candidate) => candidate.id === room.entrySpawnId) ?? room.spawns[0];
    return [entry.position.x, entry.position.y];
  }

  private resolveSafeObservatoryCheckpoint(roomId: ObservatoryRoomId, x: number, y: number): { x: number; y: number } | null {
    const room = OBSERVATORY_ROOMS[roomId];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const exactSpawn = room.spawns.find((spawn) => Math.hypot(spawn.position.x - x, spawn.position.y - y) < 2);
    if (exactSpawn) return { ...exactSpawn.position };

    const playerBody = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(
      x + playerBody.x - this.player.x,
      y + playerBody.y - this.player.y,
      playerBody.width,
      playerBody.height,
    );

    const nearestSpawn = (): { x: number; y: number } => {
      const spawn = [...room.spawns].sort((a, b) => Math.hypot(a.position.x - x, a.position.y - y) - Math.hypot(b.position.x - x, b.position.y - y))[0];
      return { ...spawn.position };
    };
    if (x < 0 || x > room.width || y < 0 || y > room.height) return nearestSpawn();
    if (roomId === 'observatory' && Phaser.Geom.Rectangle.Overlaps(this.observatoryBridgeBounds, playerBounds)) {
      const bankId = playerBounds.centerX < this.observatoryBridgeBounds.centerX ? 'observatory-near-bridge' : 'observatory-far-bank';
      const bank = room.spawns.find((candidate) => candidate.id === bankId)!;
      return { ...bank.position };
    }
    if (room.exits.some((exit) => Math.hypot(exit.interactionPoint.x - x, exit.interactionPoint.y - y) < 38)) return nearestSpawn();
    const intersectsObstacle = room.obstacles.some((obstacle) => !obstacle.dynamic && Phaser.Geom.Rectangle.Overlaps(
      playerBounds,
      new Phaser.Geom.Rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height),
    ));
    return intersectsObstacle ? nearestSpawn() : { x, y };
  }

  private drawObservatoryBackground(roomId: ObservatoryRoomId): void {
    const room = OBSERVATORY_ROOMS[roomId];
    const tint: Record<string, number> = { observatory: 0x7182a0, library: 0xd5bd87, ruins: 0x82918c };
    this.roomObjects.push(this.add.image(0, 0, 'tile_stone').setOrigin(0).setDisplaySize(room.width, room.height).setTint(tint[room.backgroundBiome]).setDepth(0));
    const decor = this.add.graphics().setDepth(1);
    decor.fillStyle(0x07151c, 0.18); decor.fillRect(0, 0, room.width, room.height);
    decor.lineStyle(2, 0xd8b869, 0.45); decor.strokeRoundedRect(7, 7, room.width - 14, room.height - 14, 12);
    decor.lineStyle(1, 0xc6e7dc, 0.12); decor.strokeCircle(room.width / 2, room.height / 2, 100);
    this.roomObjects.push(decor);
    const beams = this.add.graphics().setDepth(7);
    this.roomObjects.push(beams);
    this.observatoryPuzzleVisuals.set('beams', beams);
    this.roomObjects.push(this.add.text(320, 344, 'WASD / ←↑→↓ Move    E Interact    F Lantern    SPACE Pulse    H Hint    ESC Pause', { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#d8e3da', backgroundColor: '#07151ccc', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(87));
  }

  private addObservatoryExit(exit: ObservatoryExit): void {
    const horizontalEdge = exit.interactionPoint.x < 50 || exit.interactionPoint.x > 590;
    const bottomEdge = !horizontalEdge && exit.interactionPoint.y > 310;
    const x = horizontalEdge ? (exit.interactionPoint.x < 50 ? 14 : 626) : exit.interactionPoint.x;
    const y = horizontalEdge ? exit.interactionPoint.y : bottomEdge ? 342 : exit.interactionPoint.y;
    const image = this.add.image(x, y, exit.doorId === 'sun-door' ? 'lock_sun_off' : (this.isObservatoryExitOpen(exit) ? 'woods_arch_open' : 'woods_arch_locked')).setDisplaySize(horizontalEdge || !bottomEdge ? 22 : 54, horizontalEdge || !bottomEdge ? 58 : 22).setDepth(12);
    this.roomObjects.push(image);
    const doorBodyObject = this.add.rectangle(x, y, horizontalEdge || !bottomEdge ? 16 : 48, horizontalEdge || !bottomEdge ? 54 : 16, 0x000000, 0);
    this.physics.add.existing(doorBodyObject, true);
    const body = doorBodyObject.body as Phaser.Physics.Arcade.StaticBody;
    this.roomObjects.push(doorBodyObject);
    this.roomColliders.push(this.physics.add.collider(this.player.sprite, doorBodyObject));
    this.roomDoors.set(exit.id, { image, body, exit });
    this.interactions.register({
      id: `observatory-exit-${exit.id}`, x: exit.interactionPoint.x, y: exit.interactionPoint.y, radius: 38,
      getPrompt: () => this.isObservatoryExitOpen(exit) ? `E · Enter ${OBSERVATORY_ROOMS[exit.toRoom].title}` : 'E · Door is locked',
      onInteract: () => this.transitionObservatory(exit.id),
    });
  }

  private isObservatoryExitOpen(exit: ObservatoryExit): boolean {
    const state = this.getObservatoryState();
    return exit.doorId === 'door-a' ? state.doorAUnlocked : exit.doorId === 'sun-door' ? state.sunDoorUnlocked : this.progress.flags['l8-return-loop-open'] === true;
  }

  private refreshObservatoryDoors(): void {
    for (const [id, door] of this.roomDoors) {
      const open = this.isObservatoryExitOpen(door.exit);
      door.body.enable = !open;
      door.image.setTexture(open ? (door.exit.doorId === 'sun-door' ? 'lock_sun_on' : 'woods_arch_open') : (door.exit.doorId === 'sun-door' ? 'lock_sun_off' : 'woods_arch_locked'));
      door.image.setAlpha(open ? 0.45 : 1);
      if (open) door.body.reset(door.body.x, door.body.y);
    }
  }

  private getObservatoryState() {
    const routeTarget = this.progress.flags['l8-lumo-destination'];
    const arrived = this.progress.flags['l8-lumo-arrived'];
    const waypointIds: ObservatoryWaypointId[] = ['lantern-source', 'door-a-eye', 'g1', 'g2', 'sun-lock', 'splitter', 'root-branch', 'lumo-tube-entry', 'lumo-seal'];
    return deriveObservatoryState({
      mirrorRotations: { g0: this.value('g0'), g1: this.value('g1'), g2: this.value('g2') },
      statueOrientation: this.value('statue'), lanternOn: this.lantern.lanternOn, lanternPlaced: this.lantern.lanternPlaced,
      doorALatched: this.progress.flags['l8-door-a-latched'] === true,
      lumoPosition: this.getObservatoryLumoRoom() ? { roomId: this.getObservatoryLumoRoom()!, x: this.lumo.sprite.x, y: this.lumo.sprite.y } : null,
      lumoRoute: {
        destinationWaypointId: typeof routeTarget === 'string' && waypointIds.includes(routeTarget as ObservatoryWaypointId) ? routeTarget as ObservatoryWaypointId : null,
        arrivedAtWaypointId: typeof arrived === 'string' && waypointIds.includes(arrived as ObservatoryWaypointId) ? arrived as ObservatoryWaypointId : null,
      },
    });
  }

  private getObservatoryLumoRoom(): ObservatoryRoomId {
    const saved = this.progress.flags['l8-lumo-room'];
    return saved === 'entrance' || saved === 'corridor' || saved === 'observatory' ? saved : 'entrance';
  }

  private getObservatoryLumoSteps(): ObservatoryRoomPoint[] {
    const raw = this.progress.flags['l8-lumo-route-json'];
    if (typeof raw !== 'string' || !raw) return [];
    try {
      const steps = JSON.parse(raw) as unknown;
      if (!Array.isArray(steps)) return [];
      return steps.filter((step): step is ObservatoryRoomPoint => Boolean(step && typeof step === 'object'
        && ['entrance', 'corridor', 'observatory'].includes((step as ObservatoryRoomPoint).roomId)
        && Number.isFinite((step as ObservatoryRoomPoint).x) && Number.isFinite((step as ObservatoryRoomPoint).y)));
    } catch { return []; }
  }

  private updateObservatoryLumo(dt: number): void {
    const activeRoom = this.activeObservatoryRoom;
    if (!activeRoom) return;
    let lumoRoom = this.getObservatoryLumoRoom();
    this.lumo.setVisible(lumoRoom === activeRoom);
    const steps = this.getObservatoryLumoSteps();
    const routeIndex = Math.max(0, Math.floor(this.value('l8-lumo-route-index')));
    const step = steps[routeIndex];
    if (step && routeIndex < steps.length) {
      if (lumoRoom !== step.roomId) {
        // Room changes follow the authored tube/door links; the waypoint is the safe landing point.
        lumoRoom = step.roomId;
        this.progress.flags['l8-lumo-room'] = lumoRoom;
        this.lumo.sprite.setPosition(step.x, step.y);
        this.progress.counters['l8-lumo-x'] = step.x;
        this.progress.counters['l8-lumo-y'] = step.y;
        this.lumo.setVisible(lumoRoom === activeRoom);
        this.save();
        return;
      }
      this.lumoTarget = { x: step.x - 18, y: step.y + 12 };
      this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y, true);
      if (Math.hypot(this.lumo.sprite.x - step.x, this.lumo.sprite.y - step.y) <= 8) {
        this.lumo.sprite.setPosition(step.x, step.y);
        this.progress.counters['l8-lumo-route-index'] = routeIndex + 1;
        this.progress.counters['l8-lumo-x'] = step.x;
        this.progress.counters['l8-lumo-y'] = step.y;
        if (routeIndex + 1 >= steps.length) {
          const destination = this.progress.flags['l8-lumo-destination'];
          this.progress.flags['l8-lumo-arrived'] = destination === 'lumo-seal' ? 'lumo-seal' : 'lantern-source';
          this.progress.flags['l8-lumo-recalled'] = destination === 'lantern-source';
          this.progress.flags['l8-lumo-route-json'] = '';
          this.progress.counters['l8-lumo-route-index'] = 0;
        }
        this.save();
      }
    } else {
      const destination = this.progress.flags['l8-lumo-destination'];
      const destinationWaypoint = destination === 'lumo-seal' ? OBSERVATORY_ROOMS.corridor.waypoints.find((point) => point.id === 'lumo-seal')?.position
        : destination === 'lantern-source' ? OBSERVATORY_ROOMS.entrance.waypoints.find((point) => point.id === 'lantern-source')?.position : undefined;
      if (destinationWaypoint && destinationWaypoint.roomId === lumoRoom) {
        this.lumoTarget = { x: destinationWaypoint.x - 18, y: destinationWaypoint.y + 12 };
        this.lumo.update(dt, this.lumoTarget.x, this.lumoTarget.y, true);
      }
    }
    this.lumo.setVisible(lumoRoom === activeRoom);
  }

  private updateObservatoryCrossingState(): void {
    if (this.activeObservatoryRoom !== 'observatory' || this.progress.flags['l8-bridge-crossed']) return;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    const onBridge = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.observatoryBridgeBounds);
    if (onBridge && this.getObservatoryState().bridgeEligible && this.observatoryBridgeTraversalSide === null) {
      this.observatoryBridgeTraversalSide = playerBounds.centerX < this.observatoryBridgeBounds.centerX ? 'near' : 'far';
    }
    if (!onBridge && this.observatoryBridgeTraversalSide === 'near' && playerBounds.left >= this.observatoryBridgeBounds.right
      || !onBridge && this.observatoryBridgeTraversalSide === 'far' && playerBounds.right <= this.observatoryBridgeBounds.left) {
      this.progress.flags['l8-bridge-crossed'] = true;
      this.observatoryBridgeTraversalSide = null;
      this.save();
      return;
    }
    if (!onBridge && (playerBounds.right < this.observatoryBridgeBounds.left || playerBounds.left > this.observatoryBridgeBounds.right)) {
      this.observatoryBridgeTraversalSide = null;
    }
  }

  private isObservatoryCompletionReady(): boolean {
    return this.progress.flags['l8-return-loop-open'] === true
      && this.lantern.lanternInHand && !this.lantern.lanternPlaced
      && this.progress.flags['l8-lumo-recalled'] === true
      && this.progress.flags['l8-lumo-arrived'] === 'lantern-source'
      && this.progress.flags['l8-record-read'] === true
      && this.progress.flags['l8-balance-crystal'] === true;
  }

  private showObservatoryJournal(): void {
    const text = this.progress.flags['l8-record-read'] === true
      ? 'Bản ghi cuối: Người Bảo Vệ đã giữ ngày đêm đứng yên vì sợ mất người thân. Lumo đã giữ mạch sáng theo lời ông. The Shadow là ký ức còn mắc lại trong đêm ấy.'
      : 'Sổ tay chưa ghi bản cuối. Hãy mở lối vòng rồi đọc bản ghi cạnh The Shadow.';
    this.say([{ speaker: 'Nhinh', text: `Sổ tay của mình.\n${text}` }]);
  }

  private restoreObservatoryLanternPlacement(): void {
    if (this.progress.flags['l8-lantern-placed'] !== true) return;
    if (!this.lantern.lanternPlaced) {
      const x = this.value('l8-lantern-x') || OBSERVATORY_ROOMS.entrance.interactables.find((item) => item.id === 'lantern-pedestal')!.position.x;
      const y = this.value('l8-lantern-y') || OBSERVATORY_ROOMS.entrance.interactables.find((item) => item.id === 'lantern-pedestal')!.position.y;
      this.lantern.placeLanternAt(x, y);
    }
    this.lantern.lanternOn = this.progress.lanternOn;
  }

  private refreshObservatoryPuzzle(): void {
    if (!this.activeObservatoryRoom) return;
    const state = this.getObservatoryState();
    for (const id of ['g0', 'g1', 'g2']) {
      const mirror = this.observatoryPuzzleVisuals.get(id);
      if (mirror instanceof Phaser.GameObjects.Image) mirror.setTexture(`mirror_${((this.value(id) % 4) + 4) % 4}`);
    }
    const statue = this.observatoryPuzzleVisuals.get('statue');
    if (statue instanceof Phaser.GameObjects.Image) statue.setAngle(((this.value('statue') % 4) + 4) % 4 * 90);
    const lock = this.observatoryPuzzleVisuals.get('sun-lock');
    if (lock instanceof Phaser.GameObjects.Image) lock.setTexture(state.sunDoorUnlocked ? 'lock_sun_on' : 'lock_sun_off');
    const pedestal = this.observatoryPuzzleVisuals.get('lantern-pedestal');
    if (pedestal instanceof Phaser.GameObjects.Image) pedestal.setTexture(this.lantern.lanternPlaced ? 'pedestal_lit' : 'pedestal_empty');

    const roots = this.observatoryPuzzleVisuals.get('root-bed');
    if (roots instanceof Phaser.GameObjects.Graphics) roots.setAlpha(state.rootBedShadowed ? 0.48 : 1);
    const bridge = this.observatoryPuzzleVisuals.get('root-bridge');
    if (bridge instanceof Phaser.GameObjects.Image) {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      const playerOnBridge = Phaser.Geom.Rectangle.Overlaps(this.observatoryBridgeBounds, playerBounds);
      if (!state.bridgeEligible && bridge.visible && playerOnBridge) this.observatoryBridgePendingRemoval = true;
      if (state.bridgeEligible) this.observatoryBridgePendingRemoval = false;
      bridge.setVisible(state.bridgeEligible || this.observatoryBridgePendingRemoval);
      if (this.observatoryRootBody) {
        this.observatoryRootBody.enable = !state.bridgeEligible && !this.observatoryBridgePendingRemoval;
        this.observatoryRootBody.updateFromGameObject();
      }
      if (this.observatoryBridgePendingRemoval && !playerOnBridge) {
        this.observatoryBridgePendingRemoval = false;
        bridge.setVisible(false);
        if (this.observatoryRootBody) this.observatoryRootBody.enable = true;
      }
    }

    const beams = this.observatoryPuzzleVisuals.get('beams');
    if (beams instanceof Phaser.GameObjects.Graphics) {
      beams.clear();
      const points = new Map<ObservatoryWaypointId, ObservatoryRoomPoint>();
      for (const room of Object.values(OBSERVATORY_ROOMS)) for (const waypoint of room.waypoints) points.set(waypoint.id, waypoint.position);
      const drawPath = (ids: readonly ObservatoryWaypointId[]): void => {
        const visible = ids.map((waypointId) => points.get(waypointId)).filter((point): point is ObservatoryRoomPoint => point?.roomId === this.activeObservatoryRoom);
        if (ids.length === 1) {
          const split = points.get('splitter');
          const target = points.get(ids[0]);
          if (split?.roomId === this.activeObservatoryRoom && target?.roomId === this.activeObservatoryRoom) {
            beams.lineStyle(3, 0xffdc77, 0.78);
            beams.lineBetween(split.x, split.y, target.x, target.y);
          }
        }
        if (visible.length < 2) return;
        beams.lineStyle(3, 0xffdc77, 0.78);
        for (let index = 1; index < visible.length; index += 1) beams.lineBetween(visible[index - 1].x, visible[index - 1].y, visible[index].x, visible[index].y);
      };
      drawPath(state.activeBeamPath.waypointIds);
      for (const branch of state.activeBeamPath.branches ?? []) drawPath(branch);
    }
  }

  private drawRoom(biome: string): void {
    const tiles = biome === 'creek' ? 'tile_stone' : biome === 'library' || biome === 'ruins' || biome === 'observatory' ? 'tile_stone' : biome === 'tower' ? 'tile_dirt' : 'tile_grass';
    const tint: Record<string, number> = { woods: 0x829b80, library: 0xd5bd87, creek: 0x809dad, tower: 0x9b9078, garden: 0xb2c68e, ruins: 0x82918c, observatory: 0x7182a0, heart: 0xd8b978 };
    this.track(this.add.image(0, 0, tiles).setOrigin(0).setDisplaySize(640, 360).setTint(tint[biome] ?? 0xffffff).setDepth(0));
    const decor = this.add.graphics().setDepth(1);
    decor.fillStyle(biome === 'creek' ? 0x183f59 : 0x07151c, 0.18);
    decor.fillRect(0, 0, 640, 360);
    decor.lineStyle(2, 0xd8b869, 0.45);
    decor.strokeRoundedRect(7, 7, 626, 346, 12);
    decor.lineStyle(1, 0xc6e7dc, 0.12);
    decor.strokeCircle(320, 185, 100);
    if (this.progress.level === 0) {
      decor.lineStyle(2, 0xffe680, 0.8);
      decor.strokeCircle(320, 246, 15);
      decor.fillStyle(0xffe680, 0.14);
      decor.fillCircle(320, 246, 14);
    }
    this.track(decor);
    const tree = biome === 'ruins' || biome === 'observatory' ? 'ruin_pillar' : 'tree_woods';
    for (const [x, y] of [[60, 80], [580, 82], [66, 270], [574, 270]] as Array<[number, number]>) {
      this.track(this.add.image(x, y, tree).setAlpha(0.8).setScale(0.85).setDepth(3));
    }
    this.track(this.add.text(320, 344, 'WASD / ←↑→↓ Move    E Interact    F Lantern    SPACE Pulse    H Hint    ESC Pause', { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#d8e3da', backgroundColor: '#07151ccc', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(87));
    const path = this.add.graphics().setDepth(2);
    path.lineStyle(16, biome === 'creek' ? 0x304d5c : 0x586751, 0.62);
    path.beginPath(); path.moveTo(320, 335); path.lineTo(320, 275); path.lineTo(320, 220); path.lineTo(320, 130); path.strokePath();
    this.track(path);
  }

  private addNarrativeProps(level: number): void {
    const props: Array<[string, number, number]> = level === 0 ? [['beacon_stone', 320, 206], ['pedestal_empty', 274, 210], ['woods_arch_locked', 320, 72]]
      : level === 1 ? [['woods_arch_locked', 320, 70], ['runestone_moon_rev', 180, 204], ['runestone_leaf_rev', 320, 125], ['runestone_star_rev', 460, 204]]
      : level === 2 ? [['mural_tablet', 320, 72], ['pedestal_empty', 320, 190], ['receiver_off', 530, 194]]
      : level === 3 ? [['pedestal_lit', 120, 205], ['mirror_1', 225, 180], ['mirror_2', 320, 120], ['mirror_3', 420, 180], ['receiver_off', 520, 180], ['stepping_stone', 320, 246]]
      : level === 4 ? [['receiver_off', 320, 85], ['lock_moon_off', 220, 130], ['lock_moon_off', 420, 130], ['lock_sun_off', 320, 218]]
      : level === 5 ? [['mirror_1', 210, 170], ['mirror_2', 320, 130], ['receiver_off', 445, 168], ['lock_sun_off', 320, 80]]
      : level === 6 ? [['ruins_flower', 220, 160], ['ruins_flower', 420, 160], ['stepping_stone', 320, 225], ['receiver_off', 320, 100]]
      : level === 7 ? [['guardian_statue', 320, 170], ['lock_sun_off', 200, 126], ['lock_sun_off', 440, 126], ['lock_moon_off', 320, 222], ['ruins_altar', 320, 82], ['pedestal_empty', 120, 205], ['mirror_1', 220, 175], ['mirror_1', 420, 175], ['receiver_off', 200, 126], ['receiver_off', 440, 126]]
      : level === 8 ? [['mirror_0', 220, 175], ['mirror_2', 420, 175], ['shadow_npc', 320, 114], ['crystal_balance', 320, 68]]
      : [['heart_tree_0', 320, 157], ['crystal_memory', 190, 260], ['crystal_hope', 320, 260], ['crystal_balance', 450, 260], ['pedestal_empty', 100, 205], ['mirror_0', 220, 220], ['mirror_0', 420, 220], ['mirror_1', 320, 200], ['receiver_off', 180, 145], ['receiver_off', 460, 145], ['guardian_statue', 400, 125], ['lock_sun_off', 180, 145], ['lock_sun_off', 460, 145], ['lock_moon_off', 320, 125]];
    for (const [key, x, y] of props) this.addProp(key, x, y, key === 'woods_arch_locked' || key === 'heart_tree_0' ? 1 : 0.9);
  }

  private registerLevel(level: number): void {
    const action = (id: string, label: string, x: number, y: number, fn: () => void, enabled: () => unknown = () => true, texture = 'beacon_stone') => this.addAction(id, label, x, y, fn, enabled, texture);
    if (level === 0) {
      action('lamp', 'E · Nhận đèn lồng', 274, 210, () => { this.progress.lanternPickedUp = true; this.progress.lanternOn = false; this.lantern.lanternInHand = true; this.say([{ speaker: 'Nhinh', text: 'Hãy giữ ánh sáng cho đến khi mọi người trở về.' }, { speaker: 'Lumo', text: 'Thử thắp đèn lên nhé.' }]); this.save(); }, () => !this.progress.lanternPickedUp, 'pedestal_empty');
      action('tablet', 'E · Đọc bia đá', 320, 206, () => { this.progress.flags['l0-tablet-read'] = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Khách qua rừng, hãy tìm dấu chân dưới lớp sương. Ánh sáng đánh thức điều mắt thường bỏ quên.' }, { speaker: 'Lumo', text: 'Thử để ánh sáng lan ra một lần.' }]); }, () => this.progress.lanternPickedUp && !this.progress.flags['l0-tablet-read'], 'beacon_stone');
      action('gate', 'E · Qua cổng rừng', 320, 72, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Đom đóm đang dẫn đường. Mình cứ theo chúng trước.' }, { speaker: 'Lumo', text: 'Đi cùng nhau.' }]), () => this.progress.flags['l0-gate-open'], 'woods_arch_open');
    } else if (level === 1) {
      action('poem', 'E · Đọc bài thơ', 320, 70, () => { this.progress.flags['l1-poem-read'] = true; this.save(); this.say([{ speaker: 'Hệ thống', text: 'Trăng đặt giọt bạc lên lá. Lá đưa lời thì thầm lên sao. Sao khép vòng trời, chờ một sớm mai.' }, { speaker: 'Nhinh', text: 'Trăng, Lá, Sao. Ba hình này cũng có ở bia ngoài kia.' }]); }, () => !this.progress.flags['l1-open'], 'mural_tablet');
      const positions = this.getRunePositions();
      (['moon', 'leaf', 'star'] as const).forEach((id, index) => action(`rune-${id}`, `E · Cổ tự ${id === 'moon' ? 'Trăng' : id === 'leaf' ? 'Lá' : 'Sao'}`, positions[id].x, positions[id].y, () => this.activateRune(id, index), () => this.progress.flags['l1-open'] || this.activeRevealedRunes.has(id) || this.progress.flags[`l1-activated-${id}`], `runestone_${id}_lit`));
      action('stairs', 'E · Xuống thư viện', 320, 70, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Có một căn phòng dưới gốc cây.' }, { speaker: 'Lumo', text: 'Thư viện. Tôi nhớ từ đó.' }]), () => this.progress.flags['l1-open'], 'woods_arch_open');
    } else if (level === 2) {
      const stones = ['bird', 'leaf', 'boat', 'seed'];
      const xs = [170, 270, 370, 470];
      stones.forEach((stone, i) => action(`picture-${stone}`, `E · Xem phiến ${this.stoneLabel(stone)}`, xs[i], 115, () => this.inspectStone(stone), () => !this.progress.flags['l2-memory'], i === 0 ? 'runestone_leaf_rev' : i === 1 ? 'ruins_flower' : i === 2 ? 'stepping_stone' : 'runestone_moon_rev'));
      const socketXs = [190, 280, 360, 450];
      socketXs.forEach((x, i) => action(`socket-${i}`, `E · Đặt phiến vào hốc ${i + 1}`, x, 255, () => this.placeStone(i), () => !this.progress.flags['l2-memory'], 'pedestal_empty'));
      action('check-memory', 'E · Kiểm tra vòng ngày đêm', 320, 190, () => this.checkMemory(), () => !this.progress.flags['l2-memory'], 'receiver_off');
      action('memory-crystal', 'E · Nhận Tinh thể Ký Ức', 320, 190, () => this.finishMemory(), () => this.progress.flags['l2-memory'] === true && !this.progress.flags['l2-crystal'], 'crystal_memory');
      action('library-exit', 'E · Qua lối rễ cây', 530, 194, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Mình phải tìm đường qua suối.' }, { speaker: 'Lumo', text: 'Trạm dẫn nước nằm phía Đông.' }]), () => this.progress.flags['l2-crystal'] === true, 'receiver_on');
    } else if (level === 3) {
      this.registerMirror('g1', 'G1', 225, 180, 2);
      this.registerMirror('g2', 'G2', 320, 120, 1);
      this.registerMirror('g3', 'G3', 420, 180, 2);
      action('place-creek-lantern', 'E · Đặt đèn đang bật lên bệ', 120, 205, () => { this.lantern.placeLanternAt(120, 205); this.progress.lanternOn = true; this.progress.flags['l3-lantern-placed'] = true; this.progress.flags['l3-lantern-retrieved'] = false; this.save(); }, () => this.lantern.lanternInHand && this.lantern.lanternOn && !this.lantern.lanternPlaced && !this.progress.flags['l3-lantern-retrieved'], 'pedestal_lit');
      action('receiver-a', 'E · Kiểm tra mắt A', 520, 180, () => { if (this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('g1') === 2 && this.value('g2') === 1) { this.progress.flags['l3-bridge-a'] = true; this.say([{ speaker: 'Lumo', text: 'Có đường rồi! Nhưng mới tới hòn đảo.' }]); this.save(); } else this.say([{ speaker: 'Nhinh', text: 'Đặt đèn đang bật lên bệ rồi dẫn tia qua G1 và G2.' }]); }, () => !this.progress.flags['l3-latch-a'], 'receiver_off');
      action('latch-a', 'E · Gài chốt cầu đầu', 295, 243, () => { this.progress.flags['l3-latch-a'] = true; this.save(); }, () => this.progress.flags['l3-bridge-a'] === true && !this.progress.flags['l3-latch-a'], 'stepping_stone');
      action('receiver-b', 'E · Kiểm tra mắt B', 520, 180, () => { if (this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('g2') === 3 && this.value('g3') === 2) { this.progress.flags['l3-bridge-b'] = true; this.save(); } else this.say([{ speaker: 'Nhinh', text: 'Đèn vẫn phải sáng trên bệ; đổi đường từ G2 qua G3 tới mắt B.' }]); }, () => this.progress.flags['l3-latch-a'] === true && !this.progress.flags['l3-latch-b'], 'receiver_off');
      action('latch-b', 'E · Gài chốt cầu hai', 410, 243, () => { this.progress.flags['l3-latch-b'] = true; this.save(); }, () => this.progress.flags['l3-bridge-b'] === true && !this.progress.flags['l3-latch-b'], 'stepping_stone');
      action('retrieve-creek-lantern', 'E · Thu hồi đèn', 120, 205, () => { this.lantern.retrieveLantern(); this.progress.lanternOn = true; this.progress.flags['l3-lantern-retrieved'] = true; this.save(); }, () => this.lantern.lanternPlaced && this.progress.flags['l3-latch-a'] && this.progress.flags['l3-latch-b'], 'pedestal_lit');
      action('mural', 'E · Đọc phù điêu', 560, 85, () => { this.progress.flags['l3-memo'] = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Tất cả tia sáng đều hướng về Cây Mẹ.' }, { speaker: 'Lumo', text: 'Đêm ấy có một cơn bão rất lớn. Tôi nhớ tiếng chuông trên tháp.' }]); }, () => this.progress.flags['l3-lantern-retrieved'] === true, 'mural_tablet');
      action('creek-exit', 'E · Qua trạm dẫn nước', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Có lẽ lần này họ đang đợi cậu.' }, { speaker: 'Lumo', text: 'Tôi sẽ thử đi trước.' }]), () => this.progress.flags['l3-memo'] === true, 'receiver_on');
    } else if (level === 4) {
      for (const [id, x, y] of [['a', 220, 130], ['b', 420, 130], ['c', 320, 218]] as Array<[string, number, number]>) {
        action(`call-${id}`, `E · Gọi Lumo tới mốc ${id.toUpperCase()}`, x, y, () => this.callLumo(id, x, y), undefined, 'lock_moon_on');
      }
      action('latch-a', 'E · Gài chốt cửa A', 320, 160, () => { this.progress.flags['l4-latch-a'] = true; this.save(); }, () => this.progress.flags['l4-at-a'] && !this.progress.flags['l4-latch-a'], 'receiver_off');
      action('latch-b', 'E · Gài chốt cửa B', 320, 198, () => { this.progress.flags['l4-latch-b'] = true; this.save(); }, () => this.progress.flags['l4-at-b'] && this.progress.flags['l4-latch-a'] && !this.progress.flags['l4-latch-b'], 'receiver_off');
      action('latch-c', 'E · Gài chốt cửa ra', 320, 245, () => { this.progress.flags['l4-latch-c'] = true; this.save(); }, () => this.progress.flags['l4-at-c'] && !this.progress.flags['l4-latch-c'], 'receiver_off');
      action('spiral', 'E · Đọc vết xoắn', 500, 85, () => { this.progress.flags['l4-memo'] = true; this.save(); this.say([{ speaker: 'Lumo', text: 'Tôi đã đi qua đây trong đêm bão. Có ai đó đứng ngoài gọi… nhưng tôi không nghe rõ tên.' }, { speaker: 'Nhinh', text: 'Mình ghi lại. Cậu không cần giữ tất cả một mình.' }]); }, () => this.progress.flags['l4-latch-c'] === true && !this.progress.flags['l4-memo'], 'mural_tablet');
      action('tower-stairs', 'E · Lên tháp', 500, 85, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Tháp vẫn đang lấy nước.' }, { speaker: 'Lumo', text: 'Mình lên xem nó đang đợi điều gì.' }]), () => this.progress.flags['l4-memo'] === true, 'woods_arch_open');
    } else if (level === 5) {
      this.registerMirror('tower-g1', 'Gương A', 210, 170, 1);
      this.registerMirror('tower-g2', 'Gương B', 320, 130, 3);
      action('call-high-seal', 'E · Gọi Lumo tới ấn cao', 320, 80, () => this.callLumo('high', 320, 80), undefined, 'lock_sun_on');
      action('tower-check', 'E · Kích hoạt bộ chia sáng', 445, 168, () => {
        if (this.value('tower-g1') === 1 && this.value('tower-g2') === 3 && this.progress.flags['l5-at-high']) {
          this.progress.flags['l5-power'] = true; this.say([{ speaker: 'Nhinh', text: 'Ba luồng đã cùng sáng.' }, { speaker: 'Lumo', text: 'Tôi nhớ cái tên này: Tinh thể Hy Vọng.' }]); this.save();
        } else this.say([{ speaker: 'Nhinh', text: 'Tháp chưa nhận đủ ba luồng sáng.' }]);
      }, () => !this.progress.flags['l5-power'], 'receiver_off');
      action('hope-crystal', 'E · Nhận Tinh thể Hy Vọng', 445, 168, () => { this.progress.flags['l5-crystal'] = true; this.save(); }, () => this.progress.flags['l5-power'] === true && !this.progress.flags['l5-crystal'], 'crystal_hope');
      action('tower-exit', 'E · Ra khu vườn', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Cây Mẹ đã có Ký Ức và Hy Vọng.' }, { speaker: 'Lumo', text: 'Còn một mảnh cuối trong khu vườn bên kia.' }]), () => this.progress.flags['l5-crystal'] === true, 'woods_arch_open');
    } else if (level === 6) {
      action('sun-gate', 'E · Đánh thức cây nắng', 220, 160, () => this.setFlag('l6-sun-open'), () => this.lantern.lanternOn && !this.progress.flags['l6-sun-open'], 'ruins_flower');
      action('moon-gate', 'E · Đánh thức rễ trăng', 420, 160, () => this.setFlag('l6-moon-open'), () => !this.lantern.lanternOn && !this.progress.flags['l6-moon-open'], 'ruins_flower');
      action('root-latch', 'E · Gài chốt cầu rễ', 320, 225, () => this.setFlag('l6-root-latched'), () => this.progress.flags['l6-sun-open'] && this.progress.flags['l6-moon-open'] && !this.progress.flags['l6-root-latched'], 'stepping_stone');
      action('garden-water', 'E · Mở cống tới vườn ươm', 320, 100, () => { this.progress.flags['l6-water-flowing'] = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Nước đã chảy tới vườn ươm.' }, { speaker: 'Lumo', text: 'Mầm cây đang thức dậy. Lối vào điện thờ cũng mở rồi.' }]); }, () => this.progress.flags['l6-root-latched'] && !this.progress.flags['l6-water-flowing'], 'receiver_off');
      action('garden-exit', 'E · Qua cổng vườn', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Đường vào điện thờ đã mở.' }, { speaker: 'Lumo', text: 'Mình cùng xem điều gì đang chờ ở đó.' }]), () => this.progress.flags['l6-water-flowing'], 'woods_arch_open');
    } else if (level === 7) {
      this.registerMirror('ruins-left', 'Gương trái', 220, 175, 2);
      this.registerMirror('ruins-right', 'Gương phải', 420, 175, 1);
      action('place-ruins-lantern', 'E · Đặt đèn lên bệ', 120, 205, () => { this.lantern.placeLanternAt(120, 205); this.progress.lanternOn = true; this.progress.flags['l7-lantern-placed'] = true; this.save(); }, () => this.lantern.lanternInHand && !this.lantern.lanternPlaced, 'pedestal_empty');
      action('retrieve-ruins-lantern', 'E · Nhận lại đèn', 120, 205, () => { this.lantern.retrieveLantern(); this.progress.lanternOn = true; this.progress.flags['l7-lantern-placed'] = false; this.save(); }, () => this.lantern.lanternPlaced && this.progress.flags['l7-solved'], 'pedestal_lit');
      action('ruins-eye-left', 'E · Kích hoạt mắt nắng trái', 200, 126, () => { this.progress.flags['l7-eye-left'] = true; this.save(); }, () => this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('ruins-left') === 2 && !this.progress.flags['l7-eye-left'], 'receiver_off');
      action('ruins-eye-right', 'E · Kích hoạt mắt nắng phải', 440, 126, () => { this.progress.flags['l7-eye-right'] = true; this.save(); }, () => this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('ruins-right') === 1 && !this.progress.flags['l7-eye-right'], 'receiver_off');
      action('statue', 'E · Xoay tượng chắn sáng', 320, 170, () => { this.progress.counters['statue'] = (this.value('statue') + 1) % 4; this.save(); }, undefined, 'guardian_statue');
      action('balance-lock', 'E · Thử bàn cân', 320, 82, () => {
        if (this.lantern.lanternOn && this.lantern.lanternPlaced && this.progress.flags['l7-eye-left'] && this.progress.flags['l7-eye-right'] && this.value('ruins-left') === 2 && this.value('ruins-right') === 1 && this.value('statue') === 2) { this.progress.flags['l7-solved'] = true; this.say([{ speaker: 'Nhinh', text: 'Hai mắt ngoài sáng lên. Tia giữa nằm gọn trong bóng của pho tượng.' }, { speaker: 'Lumo', text: 'Cân bằng không có nghĩa là mọi thứ phải giống nhau.' }]); this.save(); }
        else this.say([{ speaker: 'Nhinh', text: 'Bàn cân chưa ổn định. Cần đặt đèn lên bệ, chỉnh hai gương và để tượng che hốc giữa.' }]);
      }, () => !this.progress.flags['l7-solved'], 'ruins_altar');
      action('shadow-seal', 'E · Chạm vào ấn của The Shadow', 320, 82, () => { this.progress.flags['l7-met-shadow'] = true; this.save(); this.say([{ speaker: 'The Shadow', text: 'Ánh sáng không phải thứ duy nhất giữ thế giới cân bằng.' }, { speaker: 'Nhinh', text: 'Cậu biết điều gì đã xảy ra với bình minh?' }]); }, () => this.progress.flags['l7-solved'] && !this.progress.flags['l7-met-shadow'], 'shadow_npc');
      action('ruins-exit', 'E · Vào đài thiên văn', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Đường này dẫn lên đài thiên văn.' }, { speaker: 'Lumo', text: 'Tôi nghe thấy tiếng mưa trong ký ức.' }]), () => this.progress.flags['l7-met-shadow'], 'woods_arch_open');
    } else if (level === 8) {
      this.registerMirror('obs-east', 'Gương Đông', 220, 175, 2);
      this.registerMirror('obs-west', 'Gương Tây', 420, 175, 1);
      action('observatory-1', 'E · Mở phòng quỹ đạo', 320, 260, () => { if (this.value('obs-east') === 2 && this.value('obs-west') === 1) this.setFlag('l8-room-one'); else this.say([{ speaker: 'Nhinh', text: 'Hai đường sáng chưa gặp nhau.' }]); }, undefined, 'receiver_off');
      action('observatory-2', 'E · Gọi Lumo giữ ấn', 320, 114, () => this.callLumo('observatory', 320, 114), () => this.progress.flags['l8-room-one'] === true && !this.progress.flags['l8-room-two'], 'shadow_npc');
      action('shadow-bridge', 'E · Bước qua cầu bóng', 320, 222, () => { if (!this.lantern.lanternOn && this.progress.flags['l8-room-two']) this.progress.flags['l8-room-three'] = true; else this.say([{ speaker: 'Nhinh', text: 'Cầu chỉ hiện khi đèn tắt và Lumo giữ ấn.' }]); }, () => this.progress.flags['l8-room-two'] && !this.progress.flags['l8-room-three'], 'stepping_stone');
      action('balance-crystal', 'E · Nhận Tinh thể Cân Bằng', 320, 68, () => { this.progress.flags['l8-crystal'] = true; this.save(); }, () => this.progress.flags['l8-room-three'] && !this.progress.flags['l8-crystal'], 'crystal_balance');
      action('observatory-exit', 'E · Trở về Cây Mẹ', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Ba tinh thể đã trở lại. Mình hãy đưa chúng về Cây Mẹ.' }, { speaker: 'Lumo', text: 'Tôi sẽ không để cậu đi một mình.' }]), () => this.progress.flags['l8-crystal'], 'woods_arch_open');
    } else {
      (['memory', 'hope', 'balance'] as const).forEach((name, i) => action(`heart-${name}`, `E · Đặt tinh thể ${name === 'memory' ? 'Ký Ức' : name === 'hope' ? 'Hy Vọng' : 'Cân Bằng'}`, [190, 320, 450][i], 260, () => this.setFlag(`l9-${name}`), () => !this.progress.flags[`l9-${name}`], `crystal_${name}`));
      action('heart-lantern-place', 'E · Đặt đèn lên bệ dẫn sáng', 100, 205, () => { this.lantern.placeLanternAt(100, 205); this.progress.lanternOn = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Ánh sáng đã được đặt ở tâm dẫn.' }]); }, () => this.lantern.lanternInHand && !this.lantern.lanternPlaced && !this.progress.flags['l9-roots'], 'pedestal_empty');
      this.registerMirror('heart-memory', 'Gương Ký Ức', 220, 220, 1);
      this.registerMirror('heart-balance', 'Gương Cân Bằng', 420, 220, 2);
      this.registerMirror('heart-prism', 'Lăng kính', 320, 200, 1);
      action('heart-left-eye', 'E · Chỉnh mắt nắng trái', 180, 145, () => { this.progress.counters['heart-left-eye'] = (this.value('heart-left-eye') + 1) % 2; this.save(); }, () => !this.progress.flags['l9-roots'], 'receiver_off');
      action('heart-right-eye', 'E · Chỉnh mắt nắng phải', 460, 145, () => { this.progress.counters['heart-right-eye'] = (this.value('heart-right-eye') + 1) % 2; this.save(); }, () => !this.progress.flags['l9-roots'], 'receiver_off');
      action('heart-statue', 'E · Xoay tượng vào hốc trăng', 400, 125, () => { this.progress.counters['heart-statue'] = (this.value('heart-statue') + 1) % 4; this.save(); }, () => !this.progress.flags['l9-roots'], 'guardian_statue');
      action('heart-call-lumo', 'E · Gọi Lumo tới ấn hy vọng', 320, 125, () => this.callLumo('heart', 320, 125), () => !this.progress.flags['l9-at-heart'] && !this.progress.flags['l9-roots'], 'shadow_npc');
      action('heart-roots', 'E · Cân bằng hai mắt và hốc trăng', 320, 85, () => {
        const ready = this.progress.flags['l9-memory'] && this.progress.flags['l9-hope'] && this.progress.flags['l9-balance'] && this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('heart-memory') === 1 && this.value('heart-balance') === 2 && this.value('heart-prism') === 1 && this.progress.flags['l9-at-heart'] && this.value('heart-left-eye') === 1 && this.value('heart-right-eye') === 1 && this.value('heart-statue') === 2;
        if (ready) { this.progress.flags['l9-roots'] = true; this.say([{ speaker: 'Nhinh', text: 'Hai mắt cùng sáng, còn hốc trăng được giữ trong bóng. Cây Mẹ đã nhận đủ ba tinh thể.' }, { speaker: 'Lumo', text: 'Tôi ở đây. Hãy lấy đèn về; chúng ta sẽ cùng khép vòng.' }]); this.save(); }
        else this.say([{ speaker: 'Nhinh', text: 'Còn điều gì đó chưa cân bằng: tinh thể, hai gương, mắt nắng, bóng tượng hoặc vị trí Lumo.' }]);
      }, () => !this.progress.flags['l9-roots'], 'heart_tree_0');
      action('heart-lantern-retrieve', 'E · Nhận đèn và giữ nguồn sáng', 100, 205, () => { this.lantern.retrieveLantern(); this.progress.lanternOn = true; this.progress.flags['l9-overload'] = true; this.lantern.isOverloadMode = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Nguồn sáng trở về tay mình. Nó đang dâng quá ngưỡng!' }, { speaker: 'Lumo', text: 'Đừng buông tay. Khi đã sẵn sàng, hãy tắt đèn để ánh sáng tràn qua Cây Mẹ.' }]); }, () => this.progress.flags['l9-roots'] && this.lantern.lanternPlaced && !this.progress.flags['l9-overload'], 'pedestal_lit');
    }
  }

  private updatePuzzle(dt: number): void {
    if (this.progress.level === 1 && this.runeRevealExpiresAt > 0 && this.time.now >= this.runeRevealExpiresAt) {
      this.activeRevealedRunes.clear();
      this.runeRevealExpiresAt = 0;
      this.updateRuneRevealVisuals();
    }
    if (this.progress.level === 0 && !this.progress.flags['l0-gate-open'] && this.progress.lanternPickedUp && this.progress.flags['l0-tablet-read'] && this.progress.flags['l0-footprints-found'] && this.lantern.lanternOn && Math.hypot(this.player.x - 320, this.player.y - 246) < 30) {
      this.progress.flags['l0-gate-open'] = true; this.save();
      for (const object of this.objects) {
        if (object instanceof Phaser.GameObjects.Image && object.texture.key === 'woods_arch_locked') object.setTexture('woods_arch_open');
      }
      this.say([{ speaker: 'Nhinh', text: 'Nó nhận ra chiếc đèn.' }, { speaker: 'Lumo', text: 'Đưa ánh sáng trở lại, mọi thứ sẽ thức dậy.' }]);
    }
    if (this.progress.level === 4 || this.progress.level === 5) {
      const current = { x: this.lumo.sprite.x, y: this.lumo.sprite.y };
      for (const mark of ['a', 'b', 'c', 'high', 'observatory']) {
        const p = this.getLumoMark(mark);
        if (Math.hypot(current.x - p.x, current.y - p.y) < 36) {
          const flag = `l${this.progress.level}-at-${mark}`;
          if (this.progress.flags[`l${this.progress.level}-called-${mark}`] && !this.progress.flags[flag]) { this.progress.flags[flag] = true; this.save(); }
        }
      }
    }
    if (this.progress.level === 9) {
      const mark = this.getLumoMark('heart');
      if (this.progress.flags['l9-called-heart'] && !this.progress.flags['l9-at-heart'] && Math.hypot(this.lumo.sprite.x - mark.x, this.lumo.sprite.y - mark.y) < 36) {
        this.progress.flags['l9-at-heart'] = true;
        this.save();
      }
    }
    if (this.progress.level === 0 && this.lantern.lanternInHand) this.lantern.isDawnMode = false;
    if (dt > 0 && this.time.now - this.lastGateCheck > 1000) { this.lastGateCheck = this.time.now; }
  }

  private activateRune(id: 'moon' | 'leaf' | 'star', index: number): void {
    if (this.progress.flags['l1-open']) {
      this.say([{ speaker: 'Nhinh', text: 'Chúng vẫn sáng. Đường này sẽ còn mở cho người đến sau.' }]);
      return;
    }
    const expected = [0, 1, 2];
    const current = this.value('rune-sequence');
    if (this.progress.flags[`l1-activated-${id}`]) {
      this.say([{ speaker: 'Nhinh', text: 'Ký hiệu này đã được ghi vào sổ và ngân đúng lúc.' }]);
      return;
    }
    if (expected[current] === index) {
      this.progress.flags[`l1-activated-${id}`] = true;
      this.progress.counters['rune-sequence'] = current + 1;
      this.updateRuneRevealVisuals();
      if (current === 2) { this.progress.flags['l1-open'] = true; this.say([{ speaker: 'Nhinh', text: 'Những rễ cây đang nới ra.' }, { speaker: 'Lumo', text: 'Mình đã tìm được đường xuống thư viện.' }]); }
      else this.say([{ speaker: 'Nhinh', text: 'Âm thanh này khác lúc thử.' }, { speaker: 'Lumo', text: 'Một tiếng gọi đã được nghe thấy.' }]);
      this.save();
    } else if (current !== 0) {
      this.progress.counters['rune-sequence'] = 0;
      for (const rune of ['moon', 'leaf', 'star']) this.progress.flags[`l1-activated-${rune}`] = false;
      this.activeRevealedRunes.clear();
      this.runeRevealExpiresAt = 0;
      this.updateRuneRevealVisuals(); this.save();
      this.say([{ speaker: 'Nhinh', text: 'Mình đã làm đứt chuỗi.' }, { speaker: 'Lumo', text: 'Không sao. Đom đóm vẫn đang kể lại từ đầu.' }]);
    } else {
      this.activeRevealedRunes.clear();
      this.runeRevealExpiresAt = 0;
      this.updateRuneRevealVisuals();
      this.say([{ speaker: 'Nhinh', text: `${id === 'moon' ? 'Trăng' : id === 'leaf' ? 'Lá' : 'Sao'}… chưa phải dấu mở đầu.` }]);
    }
  }

  private inspectStone(stone: string): void {
    if (this.progress.flags[`l2-${stone}-lit`] && this.progress.flags[`l2-${stone}-dark`]) {
      this.selectedStone = ['bird', 'leaf', 'boat', 'seed'].indexOf(stone);
      this.say([{ speaker: 'Hệ thống', text: `Đã chọn phiến ${this.stoneLabel(stone)}. Hãy đặt vào một trong bốn hốc.` }]);
      return;
    }
    const layer = this.lantern.lanternOn ? 'lit' : 'dark';
    this.progress.flags[`l2-${stone}-${layer}`] = true;
    const other = layer === 'lit' ? 'dark' : 'lit';
    const lines: DialogueLine[] = [{ speaker: 'Nhinh', text: layer === 'lit' ? `${this.stoneLabel(stone)}: lớp mực sáng cho thấy thiên thể và vị trí của nó.` : `${this.stoneLabel(stone)}: lớp mực tối cho thấy đường chuyển động.` }];
    if (this.progress.flags[`l2-${stone}-${other}`]) lines.push({ speaker: 'Lumo', text: 'Hai lớp ghép lại mới cho biết thời điểm trong ngày.' });
    this.save();
    const allSeen = ['bird', 'leaf', 'boat', 'seed'].every((name) => this.progress.flags[`l2-${name}-lit`] && this.progress.flags[`l2-${name}-dark`]);
    if (allSeen) { this.progress.flags['l2-clues-ready'] = true; this.save(); lines.push({ speaker: 'Nhinh', text: 'Bây giờ mình có đủ manh mối để đặt lại cả vòng.' }); }
    else lines.push({ speaker: 'Hệ thống', text: 'Đã ghi lớp mực này. Đổi trạng thái đèn bằng F để xem lớp còn lại.' });
    this.say(lines);
  }

  private placeStone(socket: number): void {
    if (this.selectedStone < 0) { this.say([{ speaker: 'Hệ thống', text: 'Hãy chọn một phiến tranh trước.' }]); return; }
    const slots = this.readMemorySlots();
    const oldSlot = slots.indexOf(this.selectedStone);
    if (oldSlot >= 0) slots[oldSlot] = slots[socket];
    slots[socket] = this.selectedStone;
    this.progress.flags['memory-slots-json'] = JSON.stringify(slots) as unknown as boolean;
    this.progress.counters['memory-slots'] = slots.filter((x) => x >= 0).length;
    this.selectedStone = -1; this.save();
    this.say([{ speaker: 'Nhinh', text: `Đã đặt phiến vào hốc ${socket + 1}.` }]);
  }

  private checkMemory(): void {
    const slots = this.readMemorySlots();
    if (slots.join(',') === '0,1,2,3') {
      this.progress.flags['l2-memory'] = true; this.say([{ speaker: 'Nhinh', text: 'Bình minh, ngày, chiều… rồi đêm.' }, { speaker: 'Lumo', text: 'Tôi đã quên khu rừng từng đổi màu đẹp thế nào.' }]); this.save();
    } else this.say([{ speaker: 'Nhinh', text: 'Vòng này chưa liền mạch.' }, { speaker: 'Lumo', text: 'Mình xem lại đường đi của mặt trời trên từng tranh nhé.' }]);
  }

  private finishMemory(): void {
    this.progress.flags['l2-crystal'] = true; this.save();
    this.say([{ speaker: 'Lumo', text: 'Ký Ức. Tôi nhớ rồi… đây là một trong ba mảnh trái tim Cây Mẹ.' }, { speaker: 'Nhinh', text: 'Mình giữ mảnh này cẩn thận. Rồi tìm đường tới hai mảnh còn lại.' }, { speaker: 'Nhinh', text: 'Người trong bức tranh đang giữ bánh xe mặt trời.' }]);
  }

  private registerMirror(id: string, label: string, x: number, y: number, goal: number): void {
    this.addAction(`mirror-${id}`, `E · Xoay ${label} (${this.value(id)})`, x, y, () => {
      this.progress.counters[id] = (this.value(id) + 1) % 4; this.save();
    }, () => true, 'mirror_1');
    this.addAction(`inspect-${id}`, `E · Xem hướng ${label}`, x, y - 30, () => this.say([{ speaker: 'Nhinh', text: `${label} đang ở hướng ${this.value(id)} trên bốn nấc.` }, { speaker: 'Hệ thống', text: `Gợi ý: hướng đích ${goal}.` }]), () => false, 'receiver_off');
  }

  private callLumo(mark: string, x: number, y: number): void {
    this.lumoTarget = this.getLumoMark(mark, x, y);
    this.progress.counters['lumo-target-x'] = this.lumoTarget.x;
    this.progress.counters['lumo-target-y'] = this.lumoTarget.y;
    const key = `l${this.progress.level}-called-${mark}`;
    this.progress.flags[key] = true; this.save();
    this.say([{ speaker: 'Nhinh', text: `Lumo, cậu tới mốc ${mark.toUpperCase()} giúp mình nhé?` }, { speaker: 'Lumo', text: 'Được! Tôi sẽ chờ tới khi cậu gọi.' }]);
  }

  private getLumoMark(mark: string, x?: number, y?: number): { x: number; y: number } {
    if (x !== undefined && y !== undefined) return { x, y };
    const positions: Record<string, { x: number; y: number }> = { a: { x: 220, y: 130 }, b: { x: 420, y: 130 }, c: { x: 320, y: 218 }, high: { x: 320, y: 80 }, observatory: { x: 320, y: 114 }, heart: { x: 320, y: 125 } };
    return positions[mark] ?? { x: 350, y: 260 };
  }

  private getSavedLumoTarget(): { x: number; y: number } {
    const targetX = this.progress.counters['lumo-target-x'];
    const targetY = this.progress.counters['lumo-target-y'];
    if (typeof targetX === 'number' && typeof targetY === 'number') return { x: targetX, y: targetY };
    if (this.progress.level === 5 && this.progress.flags['l5-called-high']) return this.getLumoMark('high');
    if (this.progress.level === 8 && this.progress.flags['l8-called-observatory']) return this.getLumoMark('observatory');
    if (this.progress.level === 9 && this.progress.flags['l9-called-heart']) return this.getLumoMark('heart');
    if (this.progress.level === 4) {
      for (const mark of ['c', 'b', 'a']) if (this.progress.flags[`l4-called-${mark}`]) return this.getLumoMark(mark);
    }
    return { x: 350, y: 260 };
  }

  private addAction(id: string, label: string, x: number, y: number, onInteract: () => void, isEnabled: () => unknown = () => true, texture = 'beacon_stone'): void {
    if (id.includes('exit') || id === 'stairs') this.addProp(texture, x, y, 0.8);
    this.interactions.register({ id, x, y, radius: 35, getPrompt: () => isEnabled() ? label : null, onInteract, isEnabled: () => Boolean(isEnabled()) });
  }

  private addProp(key: string, x: number, y: number, scale: number): void {
    const image = this.add.image(x, y, key).setScale(scale).setDepth(8 + Math.floor(y / 10));
    image.setInteractive({ useHandCursor: false });
    this.objects.push(image);
    if (key.startsWith('crystal_')) this.tweens.add({ targets: image, y: y - 4, duration: 900, yoyo: true, repeat: -1 });
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T { this.objects.push(object); return object; }

  private say(lines: DialogueLine[], onComplete?: () => void): void { this.dialogue.startDialogue(lines, onComplete); }

  private nextLevel(lines: DialogueLine[]): void {
    if (this.progress.level >= 9) return;
    this.say(lines, () => {
      this.progress.level += 1;
      this.progress.lanternPickedUp = true;
      this.progress.lanternOn = true;
      this.progress.flags['pulse-used'] = true;
      this.save();
      this.scene.restart();
    });
  }

  private finishHeart(): void {
    if (this.progress.flags['l9-complete']) return;
    this.heartEnd = true;
    this.progress.flags['l9-complete'] = true;
    this.save();
    this.say([{ speaker: 'Nhinh', text: 'Mình đã đi đủ xa. Bình minh có thể bắt đầu lại.' }, { speaker: 'Lumo', text: 'Và lần này, chúng ta sẽ cùng nhìn thấy nó.' }], () => this.scene.start('EndingScene', { campaign: true }));
  }

  private setFlag(flag: string): void { this.progress.flags[flag] = true; this.save(); SoundSystem.playMirrorRotate(); }
  private value(key: string): number { return this.progress.counters[key] ?? 0; }
  private readMemorySlots(): number[] {
    const raw = this.progress.flags['memory-slots-json'];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((x) => Number.isInteger(x) && x >= -1 && x < 4)) return parsed as number[];
    } catch { /* Invalid save falls back to empty sockets. */ }
    return [-1, -1, -1, -1];
  }
  private save(): void { CampaignSaveSystem.save(this.progress); }
  private stoneLabel(stone: string): string { return ({ bird: 'Chim', leaf: 'Lá', boat: 'Thuyền', seed: 'Hạt' } as Record<string, string>)[stone] ?? stone; }
  private getRunePositions(): Record<string, { x: number; y: number }> { return { moon: { x: 180, y: 204 }, leaf: { x: 320, y: 125 }, star: { x: 460, y: 204 } }; }

  private updateRuneRevealVisuals(): void {
    for (const id of ['moon', 'leaf', 'star']) {
      const image = this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && (object.texture.key === `runestone_${id}_rev` || object.texture.key === `runestone_${id}_lit`));
      image?.setTexture(this.activeRevealedRunes.has(id) || this.progress.flags[`l1-activated-${id}`] ? `runestone_${id}_lit` : `runestone_${id}_rev`);
    }
  }

  private showRuneJournal(): void {
    if (this.progress.level !== 1) return;
    const discovered = (['moon', 'leaf', 'star'] as const).filter((id) => this.progress.flags[`l1-seen-${id}`]);
    const labels: Record<string, string> = { moon: 'Trăng — bia bên trái', leaf: 'Lá — bia ở giữa phía trên', star: 'Sao — bia bên phải' };
    const notes = discovered.length ? `Các dấu đã ghi:\n${discovered.map((id) => `• ${labels[id]}`).join('\n')}` : 'Sổ tay chưa ghi cổ tự nào.';
    const poem = this.progress.flags['l1-poem-read'] ? '\n\nBài thơ bên cổng: “Trăng, Lá, rồi Sao.”' : '';
    const text = discovered.length || this.progress.flags['l1-poem-read']
      ? `${notes}${poem}`
      : 'Sổ tay chưa ghi cổ tự nào. Dùng SPACE để Pulse gần các bia đá.';
    this.say([{ speaker: 'Nhinh', text: `Sổ tay của mình.\n${text}` }]);
  }

  private showHint(): void {
    const hints = this.progress.level === 9 && this.progress.flags['l9-roots']
      ? (this.progress.flags['l9-overload'] ? ['Tắt đèn bằng F để giải phóng nguồn sáng đang quá tải.'] : ['Nhận lại đèn ở bệ dẫn sáng để đưa nguồn sáng trở về tay Nhinh.', 'Khi ánh sáng dâng quá ngưỡng, nhấn F để tắt đèn và khép vòng.'])
      : CAMPAIGN_LEVELS[this.progress.level].hint;
    const message = hints[Math.min(this.hintIndex, hints.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, hints.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  private refreshHud(): void {
    const level = CAMPAIGN_LEVELS[this.progress.level];
    if (this.titleText) this.titleText.setText(this.progress.level === 8 && this.activeObservatoryRoom
      ? `09  ${OBSERVATORY_ROOMS[this.activeObservatoryRoom].title}   ·   ${level.chapter}`
      : `${String(this.progress.level + 1).padStart(2, '0')}  ${level.title}   ·   ${level.chapter}`);
    if (this.statusText) {
      const state = this.progress.level === 2 ? `Phiến tranh: ${this.progress.counters['memory-slots'] ?? 0}/4 · Lớp đã đọc: ${['bird', 'leaf', 'boat', 'seed'].filter((s) => this.progress.flags[`l2-${s}-lit`] && this.progress.flags[`l2-${s}-dark`]).length}/4`
        : this.progress.level === 1 ? `Cổ tự: ${this.value('rune-sequence')}/3 đã sáng · SPACE Pulse · J sổ tay`
        : this.progress.level === 3 ? `Cầu: ${Number(Boolean(this.progress.flags['l3-latch-a'])) + Number(Boolean(this.progress.flags['l3-latch-b']))}/2 · Gương: G1 ${this.value('g1')} / G2 ${this.value('g2')} / G3 ${this.value('g3')}`
        : this.progress.level === 9 ? `Tinh thể: ${['memory', 'hope', 'balance'].filter((s) => this.progress.flags[`l9-${s}`]).length}/3 · F bật/tắt đèn`
        : `Đèn: ${this.lantern.lanternOn ? 'BẬT' : 'TẮT'} · Lumo: ${this.progress.level >= 4 ? 'theo mốc đã gọi' : 'đang đi cùng'}`;
      this.statusText.setText(state);
    }
    if (this.lumoStatusText) this.lumoStatusText.setText(this.progress.level >= 4 ? 'LUMO · E gọi tới mốc' : 'NHINH + LUMO');
  }
}
