import Phaser from 'phaser';
import { getLevelArtKey, getLevelBackgroundKey } from '../art/CampaignArt';
import { Lumo } from '../actors/Lumo';
import { Player } from '../actors/Player';
import { CAMPAIGN_LEVELS } from '../data/campaignLevels';
import { canChargeForestEdgeReceiver, feetAt, FOREST_EDGE, FOREST_EDGE_SOLIDS, isForestEdgeCenterWalkable, resolveForestEdgeSpawn, worldDepth } from '../data/forestEdgeLayout';
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
  [{ speaker: 'Nhinh', text: 'Trời vẫn chưa sáng sao?' }, { speaker: 'Nhinh', text: 'Mình nhớ con đường vào rừng… Còn đoạn sau thì mờ quá.' }],
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
  private campaignColliders: Phaser.Physics.Arcade.Collider[] = [];
  private campaignBodies = new Map<string, Phaser.Physics.Arcade.StaticBody>();
  private lastCampaignPlayerPosition = { x: 0, y: 0 };
  private creekBridgeBPendingRemoval = false;
  private creekBridgeBWasPassable = false;
  private creekBridgeBTraversalSide: 'west' | 'east' | null = null;
  private gardenBridgePendingRemoval = false;
  private gardenBridgeWasReady = false;
  private gardenTraversalSide: 'north' | 'south' | null = null;
  private activeObservatoryRoom: ObservatoryRoomId | null = null;
  private roomDoors = new Map<string, { image: Phaser.GameObjects.Image; body: Phaser.Physics.Arcade.StaticBody; exit: ObservatoryExit }>();
  private observatoryPuzzleVisuals = new Map<string, Phaser.GameObjects.GameObject>();
  private footprintTrail?: Phaser.GameObjects.Graphics;
  private memoryLayerLabels = new Map<string, Phaser.GameObjects.Text>();
  private memorySocketLabels = new Map<number, Phaser.GameObjects.Text>();
  private campaignBeamGraphics?: Phaser.GameObjects.Graphics;
  private observatoryRootBody: Phaser.Physics.Arcade.StaticBody | null = null;
  private observatoryBridgeBounds = new Phaser.Geom.Rectangle(330, 280, 132, 40);
  private observatoryBridgePendingRemoval = false;
  private observatoryBridgeTraversalSide: 'near' | 'far' | null = null;
  private hintIndex = 0;
  private selectedStone = -1;
  private heartEnd = false;
  private titleText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private lumoStatusText!: Phaser.GameObjects.Text;
  private lastGateCheck = 0;
  private lastLumoSave = 0;
  private lastPlayerSave = 0;
  private runeRevealExpiresAt = 0;
  private readonly activeRevealedRunes = new Set<string>();
  private forestEdgeChargeMs = 0;
  private forestEdgeWasInRing = false;
  private forestEdgeHintStep = '';

  constructor() { super({ key: 'CampaignScene' }); }

  public create(data?: { newGame?: boolean }): void {
    if (data?.newGame) {
      this.progress = CampaignSaveSystem.createDefaultProgress();
      CampaignSaveSystem.save(this.progress);
    } else {
      this.progress = CampaignSaveSystem.load();
    }
    if (!data?.newGame && this.progress.flags['l9-complete'] === true) {
      this.scene.start('EndingScene', { campaign: true });
      return;
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
    if (this.progress.level === 0 && !this.progress.lanternPickedUp && !this.progress.flags['l0-gate-open']) this.lumo.setVisible(false);
    if (this.progress.level === 0 && (this.progress.lanternPickedUp || this.progress.flags['l0-gate-open'])) this.progress.flags['l0-lumo-met'] = true;
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
      else if (!this.pauseMenu.isOpen() && this.lantern.triggerPulse(this.player.x, this.player.y)) this.player.playPulseAction();
    });
    keyboard.on('keydown-F', () => {
      const finalToggleAvailable = this.progress.level === 9 && this.progress.flags['l9-roots'] && this.progress.flags['l9-overload'] && this.lantern.lanternInHand && this.lantern.lanternOn;
      if ((!this.dialogue.isInputLocked(performance.now()) || finalToggleAvailable) && !this.pauseMenu.isOpen()) {
        if (this.lantern.toggleLantern(performance.now())) {
          this.player.playLanternAction(this.lantern.lanternOn);
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
    keyboard.on('keydown-J', () => {
      if (this.dialogue.isActive() || this.pauseMenu.isOpen()) return;
      if (this.progress.level === 8) this.showObservatoryJournal();
      else if (this.progress.level === 1) this.showRuneJournal();
      else if (this.progress.level === 0) this.showOpeningJournal();
    });
    keyboard.on('keydown-ESC', () => {
      if (this.dialogue.isActive()) this.dialogue.handleAdvanceInput(performance.now());
      else if (!this.pauseMenu.isOpen()) this.pauseMenu.open();
      else this.pauseMenu.close();
    });

    this.lantern.onPulse((x, y, radius) => {
      this.progress.flags['pulse-used'] = true;
      if (this.progress.level === 0 && this.progress.flags['l0-tablet-read'] && FOREST_EDGE.objects.trail.some((mark) => Math.hypot(x - mark.x, y - mark.y) <= radius)) {
        this.progress.flags['l0-footprints-found'] = true;
        this.footprintTrail?.setVisible(true);
        this.revealForestEdgeFootprints();
        this.hintIndex = 0;
      }
      if (this.progress.level === 1) {
        this.activeRevealedRunes.clear();
        this.runeRevealExpiresAt = this.time.now + 5000;
        for (const [id, pos] of Object.entries(this.getRunePositions())) {
          if (Math.hypot(pos.x - x, pos.y - y) <= radius) {
            this.activeRevealedRunes.add(id);
            this.progress.flags[`l1-seen-${id}`] = true;
          }
        }
        const practice = { x: 80, y: 265 };
        if (Math.hypot(practice.x - x, practice.y - y) <= radius) {
          this.activeRevealedRunes.add('practice-leaf');
          this.progress.flags['l1-seen-practice-leaf'] = true;
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
    if (this.progress.level === 0 && this.progress.flags['l0-lumo-met']) {
      this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 18, 24, 616), y: Phaser.Math.Clamp(this.player.y - 20, 58, 305) };
    }
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
    this.updateForestEdgeProgress(dt);
    if (this.progress.level === 8 && this.activeObservatoryRoom) {
      this.updateObservatoryCrossingState();
      this.refreshObservatoryDoors();
      this.refreshObservatoryPuzzle();
    }
    this.interactions.update(this.player.x, this.player.y, !locked);
    this.updatePuzzle(dt);
    this.updateCampaignCrossingState();
    this.updateCampaignBarriers();
    this.refreshCampaignPuzzleVisuals();
    this.dialogue.update(dt);
    this.refreshHud();
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) && !locked && !this.pauseMenu.isOpen()) this.pauseMenu.open();
  }

  private updateForestEdgeProgress(dt: number): void {
    if (this.progress.level !== 0) return;
    const center = { x: this.player.x, y: this.player.y };
    const feet = feetAt(center);
    if (!this.progress.lanternPickedUp && !this.progress.flags['l0-lumo-met'] && !this.dialogue.isActive()
      && Math.hypot(center.x - FOREST_EDGE.objects.lantern.stand.x, center.y - FOREST_EDGE.objects.lantern.stand.y) <= 65) {
      this.progress.flags['l0-lumo-met'] = true;
      this.lumo.setVisible(true);
      this.lumoTarget = { x: center.x + 18, y: center.y - 12 };
      this.progress.counters['lumo-x'] = this.lumoTarget.x;
      this.progress.counters['lumo-y'] = this.lumoTarget.y;
      this.save();
      this.say([
        { speaker: 'Lumo', text: 'Cuối cùng cũng có người nghe thấy tôi!' },
        { speaker: 'Nhinh', text: 'Cậu vừa nói à?' },
        { speaker: 'Lumo', text: 'Ừ. Tôi là Lumo. Cậu có thể nhấc chiếc đèn đó lên không?' },
        { speaker: 'Nhinh', text: 'Tôi là Nhinh. Cậu biết đây là đâu chứ?' },
        { speaker: 'Lumo', text: 'Elaria. Rừng của chúng tôi. Đáng lẽ giờ này sương phải tan rồi.' },
        { speaker: 'Nhinh', text: 'Bình minh biến mất từ khi nào?' },
        { speaker: 'Lumo', text: 'Tôi không nhớ. Nhưng tôi nhớ Cây Mẹ. Nếu tới được đó, chúng ta sẽ tìm ra cách.' },
      ]);
    }
    const ring = FOREST_EDGE.objects.ring.ground;
    const inRing = Math.hypot(feet.x - ring.x, feet.y - ring.y) <= FOREST_EDGE.objects.ring.radius;
    if (inRing && !this.lantern.lanternOn && this.progress.lanternPickedUp && this.progress.flags['l0-tablet-read'] && this.progress.flags['l0-footprints-found'] && !this.progress.flags['l0-ring-dark-cued']) {
      this.progress.flags['l0-ring-dark-cued'] = true;
      this.say([{ speaker: 'Lumo', text: 'Đúng chỗ rồi. Mắt đá vẫn chưa nhận được ánh sáng.' }]);
    }
    if (!inRing) this.progress.flags['l0-ring-dark-cued'] = false;
    const canCharge = canChargeForestEdgeReceiver(
      feet, this.lantern.lanternOn, this.progress.flags['l0-tablet-read'] === true,
      this.progress.flags['l0-footprints-found'] === true, this.progress.flags['l0-gate-open'] === true,
    );
    if (canCharge) {
      this.forestEdgeChargeMs += dt;
      this.setForestEdgeArt('sun-eye', this.forestEdgeChargeMs >= FOREST_EDGE.chargeMs ? 'sun-eye-full' : 'sun-eye-receiving');
      if (this.forestEdgeChargeMs >= FOREST_EDGE.chargeMs && !this.progress.flags['l0-gate-open']) {
        this.progress.flags['l0-gate-open'] = true;
        this.forestEdgeChargeMs = 0;
        this.save();
        this.setForestEdgeArt('sun-eye', 'sun-eye-full');
        this.say([{ speaker: 'Nhinh', text: 'Nó nhận ra chiếc đèn.' }, { speaker: 'Lumo', text: 'Thấy chưa? Đưa ánh sáng trở lại, mọi thứ sẽ thức dậy.' }]);
      }
    } else {
      this.forestEdgeChargeMs = 0;
      this.setForestEdgeArt('sun-eye', this.progress.flags['l0-gate-open'] ? 'sun-eye-full' : 'sun-eye-dormant');
    }
    this.forestEdgeWasInRing = inRing;
  }

  private buildLevel(): void {
    if (this.progress.level === 8) {
      this.buildObservatoryRoom(this.progress.roomId ?? 'entrance');
      return;
    }
    this.clearCampaignColliders();
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.memoryLayerLabels.clear();
    this.memorySocketLabels.clear();
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
    const defaultPlayerX = [320, 320, 320, 90, 90, 90, 90, 320, 320, 320][level];
    if (level === 0) {
      this.player.setFootPlacement(FOREST_EDGE.player.footOffsetY, FOREST_EDGE.player.body.offsetY, FOREST_EDGE.player.body.offsetX, FOREST_EDGE.player.body.width, FOREST_EDGE.player.body.height);
      const spawn = resolveForestEdgeSpawn(
        typeof savedPlayerX === 'number' && typeof savedPlayerY === 'number' ? { x: savedPlayerX, y: savedPlayerY } : undefined,
        { tabletRead: this.progress.flags['l0-tablet-read'] === true, footprintsFound: this.progress.flags['l0-footprints-found'] === true, gateOpen: this.progress.flags['l0-gate-open'] === true },
      );
      this.player.setPosition(spawn.x, spawn.y);
      this.forestEdgeChargeMs = 0;
      this.forestEdgeWasInRing = false;
    } else {
      this.player.setFootPlacement(0, 27);
      this.player.setPosition(
        overloadCheckpoint ? 130 : typeof savedPlayerX === 'number' ? Phaser.Math.Clamp(savedPlayerX, 24, 616) : defaultPlayerX,
        overloadCheckpoint ? 205 : typeof savedPlayerY === 'number' ? Phaser.Math.Clamp(savedPlayerY, 58, 305) : level === 6 ? 160 : 290,
      );
    }
    (this.player.sprite.body as Phaser.Physics.Arcade.Body | null)?.updateFromGameObject();
    this.lastCampaignPlayerPosition = { x: this.player.x, y: this.player.y };
    this.lumoTarget = overloadCheckpoint ? { x: 165, y: 205 } : this.getSavedLumoTarget();
    this.lumo.sprite.setPosition(overloadCheckpoint ? this.lumoTarget.x : this.progress.counters['lumo-x'] ?? this.lumoTarget.x, overloadCheckpoint ? this.lumoTarget.y : this.progress.counters['lumo-y'] ?? this.lumoTarget.y);
    this.lumo.setVisible(level !== 0 || this.progress.lanternPickedUp || this.progress.flags['l0-gate-open'] === true || this.progress.flags['l0-lumo-met'] === true);
    this.lantern.lanternInHand = this.progress.lanternPickedUp || level > 0;
    this.lantern.lanternOn = this.progress.lanternOn;
    this.lantern.lanternPlaced = false;
    this.lantern.isDawnMode = false;
    this.lantern.isOverloadMode = false;
    if (level === 9 && this.progress.flags['l9-overload']) this.lantern.isOverloadMode = true;
    if (level === 7 && this.progress.flags['l7-lantern-placed']) this.lantern.placeLanternAt(120, 205);
    if (level === 3 && this.progress.flags['l3-lantern-placed'] && !this.progress.flags['l3-lantern-retrieved']) this.lantern.placeLanternAt(120, 205);
    if (level === 5 && this.progress.flags['l5-lantern-placed'] && !this.progress.flags['l5-lantern-retrieved']) this.lantern.placeLanternAt(120, 205);
    const heartLanternShouldBePlaced = this.progress.flags['l9-lantern-placed'] === true
      || (this.progress.flags['l9-lantern-placed'] === undefined && this.progress.flags['l9-roots'] === true && !this.progress.flags['l9-lantern-retrieved']);
    if (level === 9 && heartLanternShouldBePlaced && !this.progress.flags['l9-lantern-retrieved'] && !this.progress.flags['l9-overload']) {
      const savedLampState = this.progress.lanternOn;
      this.lantern.placeLanternAt(100, 205);
      this.lantern.lanternOn = savedLampState;
    }
    this.addNarrativeProps(level);
    if (level === 2) this.drawMemoryProgress();
    this.registerLevel(level);
    this.buildCampaignBarriers(level);
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
    if (roomId === 'entrance') this.addObservatoryArt('learned-marks-miniature', 320, 150, 128, 64);
    if (roomId === 'corridor') {
      this.addObservatoryArt('star-chart', 320, 162, 124, 73);
      this.addObservatoryArt('wheel-stopped-sun-among-stars', 500, 128, 72, 56);
    }
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
      const counter = `l8-${mirror}`;
      register(
        () => { this.progress.counters[counter] = (this.value(counter) + 1) % 4; this.save(); this.refreshObservatoryPuzzle(); SoundSystem.playMirrorRotate(); },
        () => `E · Rotate ${mirror.toUpperCase()} (${this.value(counter)} · 0 east, 1 south, 2 west, 3 north)`,
      );
    } else if (id === 'statue') {
      const counter = 'l8-statue';
      register(
        () => { this.progress.counters[counter] = (this.value(counter) + 1) % 4; this.save(); this.refreshObservatoryPuzzle(); SoundSystem.playMirrorRotate(); },
        () => `E · Turn statue (${this.value(counter)})`,
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
        getPrompt: () => this.getObservatoryState().lumoAtSeal ? 'E · Recall Lumo to the lantern' : 'E · Call Lumo to the seal',
        onInteract: () => this.callObservatoryLumo(this.getObservatoryState().lumoAtSeal ? 'recall' : 'seal'),
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
          const missing: string[] = [];
          if (!this.lantern.lanternInHand || this.lantern.lanternPlaced) missing.push('thu hồi đèn về tay');
          if (this.progress.flags['l8-lumo-recalled'] !== true || this.progress.flags['l8-lumo-arrived'] !== 'lantern-source') missing.push('chờ Lumo về tới nguồn đèn');
          if (missing.length) {
            this.say([{ speaker: 'Nhinh', text: `Bản ghi chưa mở. Còn cần: ${missing.join(' và ')}.` }, { speaker: 'Lumo', text: 'Tôi sẽ báo khi đã về tới đèn.' }]);
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
        () => this.progress.flags['l8-return-loop-open'] === true,
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
    const backgroundKey = getLevelBackgroundKey(8, roomId);
    const hasCustomBg = backgroundKey !== null && this.textures.exists(backgroundKey);
    if (hasCustomBg) {
      this.roomObjects.push(this.add.image(0, 0, backgroundKey).setOrigin(0).setDisplaySize(room.width, room.height).setDepth(0));
    } else {
      this.roomObjects.push(this.add.tileSprite(0, 0, room.width, room.height, 'ground_stone').setOrigin(0).setTint(tint[room.backgroundBiome]).setDepth(0));
      this.roomObjects.push(this.add.tileSprite(28, 148, room.width - 56, 84, 'ground_stone').setOrigin(0).setTint(0xb5c6ce).setAlpha(0.42).setDepth(0.5));
      for (const [tx, ty] of [[36, 54], [604, 54], [36, 306], [604, 306]] as Array<[number, number]>) {
        this.roomObjects.push(this.add.image(tx, ty, 'ruin_pillar').setAlpha(0.85).setScale(0.9).setDepth(3));
      }
    }
    if (this.progress.flags['l8-return-loop-open'] === true) {
      this.roomObjects.push(this.add.tileSprite(44, 286, room.width - 88, 38, 'ground_stone').setOrigin(0).setTint(0x9bd8dd).setAlpha(0.55).setDepth(0.8));
    }
    const decor = this.add.graphics().setDepth(1);
    decor.fillStyle(0x07151c, hasCustomBg ? 0.08 : 0.16);
    decor.fillRect(0, 0, room.width, room.height);
    this.roomObjects.push(decor);
    const beams = this.add.graphics().setDepth(7);
    this.roomObjects.push(beams);
    this.observatoryPuzzleVisuals.set('beams', beams);
    this.roomObjects.push(this.add.text(320, 344, 'WASD / ←↑→↓ Move    E Interact    F Lantern    SPACE Pulse    H Hint    ESC Pause', { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#d8e3da', backgroundColor: '#07151ccc', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(87));
  }

  private addObservatoryArt(filename: string, x: number, y: number, width: number, height: number): void {
    const key = getLevelArtKey(8, filename);
    if (!key || !this.textures.exists(key)) return;
    this.roomObjects.push(this.add.image(x, y, key).setDisplaySize(width, height).setDepth(5));
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
      mirrorRotations: { g0: this.value('l8-g0'), g1: this.value('l8-g1'), g2: this.value('l8-g2') },
      statueOrientation: this.value('l8-statue'), lanternOn: this.lantern.lanternOn, lanternPlaced: this.lantern.lanternPlaced,
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
      if (mirror instanceof Phaser.GameObjects.Image) mirror.setTexture(`mirror_${((this.value(`l8-${id}`) % 4) + 4) % 4}`);
    }
    const statue = this.observatoryPuzzleVisuals.get('statue');
    if (statue instanceof Phaser.GameObjects.Image) statue.setAngle(((this.value('l8-statue') % 4) + 4) % 4 * 90);
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
    const backgroundKey = getLevelBackgroundKey(this.progress.level);
    const hasCampaignBackground = backgroundKey !== null && this.textures.exists(backgroundKey);
    const tiles = biome === 'creek' || biome === 'library' || biome === 'ruins' || biome === 'observatory'
      ? 'ground_stone'
      : biome === 'tower'
        ? 'ground_dirt'
        : 'ground_grass';
    const tint: Record<string, number> = { woods: 0x728f73, library: 0xb9a882, creek: 0x809dad, tower: 0x9b9078, garden: 0xb2c68e, ruins: 0x82918c, observatory: 0x7182a0, heart: 0xd8b978 };
    if (hasCampaignBackground) {
      this.track(this.add.image(0, 0, backgroundKey).setOrigin(0).setDisplaySize(640, 360).setDepth(0));
    } else {
      this.track(this.add.tileSprite(0, 0, 640, 360, tiles).setOrigin(0).setTint(tint[biome] ?? 0xffffff).setDepth(0));
      if (this.progress.level === 1) {
        this.track(this.add.tileSprite(282, 78, 76, 260, 'ground_dirt').setOrigin(0).setTint(0x9a8f7c).setAlpha(0.72).setDepth(0.4));
        this.track(this.add.tileSprite(148, 176, 344, 58, 'ground_dirt').setOrigin(0).setTint(0x9a8f7c).setAlpha(0.68).setDepth(0.4));
        this.track(this.add.tileSprite(256, 158, 128, 92, 'ground_stone').setOrigin(0).setTint(0x95a4a0).setAlpha(0.52).setDepth(0.5));
      } else if (this.progress.level === 2) {
        this.track(this.add.tileSprite(96, 64, 448, 244, 'ground_stone').setOrigin(0).setTint(0xd8c69c).setAlpha(0.42).setDepth(0.4));
        this.track(this.add.tileSprite(276, 76, 88, 232, 'ground_stone').setOrigin(0).setTint(0xefe0ba).setAlpha(0.35).setDepth(0.5));
      }
    }
    const decor = this.add.graphics().setDepth(1);
    if (!hasCampaignBackground && this.progress.level !== 0) {
      decor.fillStyle(biome === 'creek' ? 0x183f59 : 0x07151c, 0.16);
      decor.fillRect(0, 0, 640, 360);
    }
    if (this.progress.level === 0) {
      const pathMask = this.add.graphics();
      pathMask.fillStyle(0xffffff, 1);
      pathMask.fillPoints([
        new Phaser.Geom.Point(248, 304), new Phaser.Geom.Point(221, 282), new Phaser.Geom.Point(195, 265),
        new Phaser.Geom.Point(192, 252), new Phaser.Geom.Point(198, 243), new Phaser.Geom.Point(238, 234),
        new Phaser.Geom.Point(280, 235), new Phaser.Geom.Point(319, 230), new Phaser.Geom.Point(341, 221),
        new Phaser.Geom.Point(365, 207), new Phaser.Geom.Point(389, 197), new Phaser.Geom.Point(405, 191),
        new Phaser.Geom.Point(431, 171), new Phaser.Geom.Point(468, 151), new Phaser.Geom.Point(504, 151),
        new Phaser.Geom.Point(511, 160), new Phaser.Geom.Point(494, 178), new Phaser.Geom.Point(454, 197),
        new Phaser.Geom.Point(420, 220), new Phaser.Geom.Point(399, 226), new Phaser.Geom.Point(379, 234),
        new Phaser.Geom.Point(357, 248), new Phaser.Geom.Point(333, 258), new Phaser.Geom.Point(288, 263),
        new Phaser.Geom.Point(255, 262), new Phaser.Geom.Point(252, 272), new Phaser.Geom.Point(282, 293),
      ], true);
      const path = this.add.tileSprite(0, 0, 640, 360, 'ground_dirt').setOrigin(0).setTint(0xb9a783).setAlpha(0.88).setDepth(0.6);
      path.setMask(pathMask.createGeometryMask());
      pathMask.setVisible(false);
      this.track(pathMask);
      this.track(path);
      const ring = FOREST_EDGE.objects.ring.ground;
      decor.lineStyle(2, 0xffe680, this.progress.flags['l0-footprints-found'] ? 0.5 : 0.16);
      decor.strokeCircle(ring.x, ring.y, 17);
      decor.fillStyle(0xffe680, this.progress.flags['l0-footprints-found'] ? 0.12 : 0.035);
      decor.fillCircle(ring.x, ring.y, 15);
      this.footprintTrail = this.add.graphics().setDepth(4);
      this.footprintTrail.fillStyle(0xd7e6dc, 0.8);
      this.footprintTrail.fillStyle(0xe5f0d5, 0.16);
      this.footprintTrail.fillEllipse(360, 232, 78, 31);
      this.footprintTrail.setVisible(this.progress.flags['l0-footprints-found'] === true);
      this.track(this.footprintTrail);
    }
    this.track(decor);
    if (!hasCampaignBackground && this.progress.level === 0) {
      for (const [index, tree] of FOREST_EDGE.objects.trees.entries()) {
        const treeKey = index % 2 === 1 && this.textures.exists('tree_alt') ? 'tree_alt' : 'tree_woods';
        const image = this.add.image(tree.anchor.x, tree.anchor.y, treeKey).setOrigin(0.5, 1).setDepth(worldDepth(tree.anchor.y));
        image.setData('forestEdgeId', tree.id); this.track(image);
      }
      for (const rock of FOREST_EDGE.objects.rocks) {
        const image = this.add.image(rock.anchor.x, rock.anchor.y, 'rock_blocker').setOrigin(0.5, 1).setDepth(worldDepth(rock.anchor.y));
        image.setData('forestEdgeId', rock.id); this.track(image);
      }
      for (const [x, y] of [[90, 180], [160, 260], [346, 260], [552, 205], [340, 144], [270, 178], [205, 238], [260, 230], [322, 216], [365, 190], [438, 160], [500, 194]] as Array<[number, number]>) {
        this.track(this.add.image(x, y, 'tuft_grass').setAlpha(0.75).setDepth(3));
      }
    } else if (!hasCampaignBackground) {
      const isStoneRoom = biome === 'library' || biome === 'ruins' || biome === 'observatory';
      const tree = isStoneRoom ? 'ruin_pillar' : 'tree_woods';
      const borderSpots: Array<[number, number]> = isStoneRoom
        ? [[42, 68], [598, 68], [42, 276], [598, 276]]
        : [[38, 56], [112, 44], [528, 44], [602, 56], [34, 165], [606, 165], [44, 286], [596, 286]];
      borderSpots.forEach(([x, y], idx) => {
        const key = !isStoneRoom && idx % 2 === 1 && this.textures.exists('tree_alt') ? 'tree_alt' : tree;
        this.track(this.add.image(x, y, key).setAlpha(0.92).setScale(0.88).setDepth(3 + Math.floor(y / 24)));
      });
      if (!isStoneRoom) {
        for (const [bx, by] of [[92, 316], [206, 326], [434, 326], [548, 316], [156, 82], [484, 82]] as Array<[number, number]>) {
          this.track(this.add.image(bx, by, 'bush_woods').setAlpha(0.9).setDepth(4));
        }
        for (let i = 0; i < 16; i++) {
          const gx = 54 + ((i * 83 + 29) % 532);
          const gy = 52 + ((i * 59 + 17) % 256);
          this.track(this.add.image(gx, gy, 'tuft_grass').setAlpha(0.75).setDepth(1.2));
          if (i % 4 === 0) {
            this.track(this.add.image(Math.min(590, gx + 12), Math.min(315, gy + 6), i % 8 === 0 ? 'mushroom_cyan' : 'mushroom_warm').setAlpha(0.85).setDepth(1.5));
          }
        }
      }
      for (const [sx, sy] of [[320, 298], [316, 266], [322, 152], [320, 114]] as Array<[number, number]>) {
        this.track(this.add.image(sx, sy, 'stepping_stone').setAlpha(0.72).setScale(0.85).setDepth(1.3));
      }
    }
    const controls = this.progress.level === 0
      ? `WASD Move    E Interact${this.progress.lanternPickedUp ? '    F Lantern' : ''}${this.progress.flags['l0-tablet-read'] ? '    SPACE Pulse' : ''}    J Journal    H Hint    ESC Pause`
      : 'WASD / ←↑→↓ Move    E Interact    F Lantern    SPACE Pulse    J Journal    H Hint    ESC Pause';
    this.controlsText = this.track(this.add.text(320, this.progress.level === 0 ? 358 : 344, controls, { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#d8e3da', backgroundColor: '#07151ccc', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(87));
    const stage = this.progress.level;
    const landscape = this.add.graphics().setDepth(1.5);
    if (!hasCampaignBackground && stage === 3) {
      landscape.fillStyle(0x123d58, 0.82); landscape.fillRect(245, 145, 175, 195);
      landscape.fillStyle(0x66bfd0, 0.25); landscape.fillEllipse(330, 195, 140, 22); landscape.fillEllipse(300, 300, 120, 18);
      landscape.fillStyle(0xa1b79a, 0.72); landscape.fillRect(235, 218, 195, 12);
      landscape.lineStyle(2, 0x9bd8dd, 0.22); landscape.lineBetween(260, 162, 405, 162); landscape.lineBetween(258, 176, 400, 176);
    } else if (!hasCampaignBackground && stage === 4) {
      landscape.lineStyle(7, 0x7c786a, 0.56); landscape.lineBetween(295, 86, 295, 280); landscape.lineBetween(440, 86, 440, 280);
      landscape.lineStyle(1, 0xb8a87d, 0.42); landscape.lineBetween(300, 100, 435, 100); landscape.lineBetween(300, 270, 435, 270);
      landscape.lineStyle(3, this.lantern.lanternOn ? 0x8b8d76 : 0x88e4d4, this.lantern.lanternOn ? 0.25 : 0.8);
      landscape.beginPath(); landscape.moveTo(300, 230); landscape.lineTo(350, 230); landscape.lineTo(385, 245); landscape.lineTo(435, 245); landscape.strokePath();
    } else if (!hasCampaignBackground && stage === 5) {
      landscape.lineStyle(2, 0xd1ba83, 0.42); landscape.strokeCircle(320, 175, 128); landscape.strokeCircle(320, 175, 92);
      landscape.fillStyle(0x1f5567, 0.55); landscape.fillRect(535, 82, 12, 202); landscape.lineStyle(3, 0x6acfe0, 0.6); landscape.lineBetween(541, 278, 541, 98);
    } else if (!hasCampaignBackground && stage === 6) {
      landscape.fillStyle(0x245263, 0.78); landscape.fillRect(0, 246, 640, 28);
      landscape.lineStyle(2, 0x66bfd0, 0.45); landscape.lineBetween(0, 246, 640, 246); landscape.lineBetween(0, 274, 640, 274);
      landscape.lineStyle(2, 0xb9d08b, 0.5); landscape.lineBetween(70, 185, 570, 185); landscape.lineBetween(70, 292, 570, 292);
    } else if (!hasCampaignBackground && stage === 7) {
      landscape.lineStyle(3, 0xa9a18d, 0.32); landscape.strokeCircle(320, 180, 122); landscape.strokeCircle(320, 180, 76);
      landscape.lineStyle(1, 0xd1bf94, 0.2); landscape.lineBetween(320, 58, 320, 300); landscape.lineBetween(198, 180, 442, 180);
    } else if (!hasCampaignBackground && stage === 9) {
      landscape.lineStyle(3, 0xe9d18b, 0.55); landscape.strokeCircle(320, 160, 76); landscape.strokeCircle(320, 160, 110);
      landscape.lineStyle(2, 0x74bd95, 0.5); landscape.lineBetween(320, 210, 320, 292); landscape.lineBetween(270, 238, 190, 275); landscape.lineBetween(370, 238, 450, 275);
    }
    this.track(landscape);
  }

  private addNarrativeProps(level: number): void {
    const props: Array<[string, number, number]> = level === 0 ? [['beacon_stone', 300, 230], ['woods_arch_locked', 486, 166], ['pedestal_empty', 410, 225]]
      : level === 1 ? [['woods_arch_locked', 320, 70], ['runestone_moon_rev', 180, 204], ['runestone_leaf_rev', 320, 125], ['runestone_star_rev', 460, 204], ['runestone_leaf_rev', 80, 265]]
      : level === 2 ? [['mural_tablet', 320, 72], ['pedestal_empty', 320, 190], ['receiver_off', 530, 194]]
      : level === 3 ? [['pedestal_lit', 120, 205], ['mirror_1', 180, 165], ['mirror_2', 220, 120], ['mirror_3', 345, 236], ['receiver_off', 220, 180], ['stepping_stone', 280, 236], ['stepping_stone', 372, 236]]
      : level === 4 ? [['receiver_off', 320, 85], ['lock_moon_off', 220, 130], ['lock_moon_off', 420, 130], ['lock_sun_off', 320, 218]]
      : level === 5 ? [['pedestal_lit', 120, 205], ['mirror_0', 160, 170], ['mirror_1', 250, 170], ['mirror_2', 350, 170], ['receiver_off', 470, 145], ['receiver_off', 470, 205], ['lock_sun_off', 320, 80], ['mural_tablet', 535, 86]]
      : level === 6 ? [['ruins_flower', 220, 160], ['ruins_flower', 420, 160], ['receiver_off', 320, 100]]
      : level === 7 ? [['guardian_statue', 320, 170], ['lock_sun_off', 200, 126], ['lock_sun_off', 440, 126], ['lock_moon_off', 320, 222], ['ruins_altar', 320, 82], ['pedestal_empty', 120, 205], ['mirror_1', 220, 175], ['mirror_1', 420, 175], ['receiver_off', 200, 126], ['receiver_off', 440, 126], ...(this.progress.flags['l7-solved'] ? [['shadow_npc', 320, 98] as [string, number, number]] : [])]
      : level === 8 ? [['mirror_0', 220, 175], ['mirror_2', 420, 175], ['shadow_npc', 320, 114], ['crystal_balance', 320, 68]]
      : [['heart_tree_0', 320, 157], ['crystal_memory', 190, 260], ['crystal_hope', 320, 260], ['crystal_balance', 450, 260], ['pedestal_empty', 100, 205], ['mirror_0', 220, 220], ['mirror_0', 420, 220], ['mirror_1', 320, 200], ['receiver_off', 180, 145], ['receiver_off', 460, 145], ['guardian_statue', 400, 125], ['lock_sun_off', 180, 145], ['lock_sun_off', 460, 145], ['lock_moon_off', 320, 125]];
    for (const [key, x, y] of props) {
      if (level === 9 && key === 'heart_tree_0') continue;
      this.addProp(key, x, y, level === 0 || key === 'woods_arch_locked' || key === 'heart_tree_0' ? 1 : 0.9);
    }
    if (level === 0) {
      const eye = this.addLevelArt('sun-eye-dormant', FOREST_EDGE.objects.eye.anchor.x, FOREST_EDGE.objects.eye.anchor.y, 32, 32, worldDepth(FOREST_EDGE.objects.gate.anchor.y) + 0.1);
      eye?.setData('forestEdgeId', 'sun-eye');
      if (!this.progress.lanternPickedUp) {
        const pickup = this.addLevelArt('pickup-lantern', FOREST_EDGE.objects.lantern.anchor.x, FOREST_EDGE.objects.lantern.anchor.y, 20, 28, worldDepth(FOREST_EDGE.objects.lantern.anchor.y));
        pickup?.setData('forestEdgeId', 'lantern');
      }
      if (this.progress.flags['l0-footprints-found']) for (const { x, y } of FOREST_EDGE.objects.trail) {
        const index = FOREST_EDGE.objects.trail.findIndex((point) => point.x === x && point.y === y);
        const stamp = this.addLevelArt('footprints-pulse', x, y, 20, 28, 4); stamp?.setAlpha(0.8).setData('forestEdgeId', `footprint-${index}`);
      }
    } else if (level === 1) {
      this.addLevelArt('poem_fragment', 320, 70, 52, 42, 18);
      this.updateRuneRevealVisuals();
    } else if (level === 2) {
      this.addLevelArt('room-bookshelf', 74, 143, undefined, undefined, 4);
      this.addLevelArt('room-bookshelf', 566, 143, undefined, undefined, 4);
      this.addLevelArt('room-test-desk', 208, 134, 96, 68, 4);
      // Keep the portrait artwork proportional within its existing vertical slots.
      this.addLevelArt('room-mural-fifth', 432, 92, 62 * 96 / 136, 62, 4);
      this.addLevelArt(this.progress.flags['l2-secret'] ? 'room-panel-open' : 'room-panel-closed', 432, 152, 58 * 116 / 148, 58, 4);
      this.addLevelArt(this.progress.flags['l2-memory'] ? 'room-well-open' : 'room-well-closed', 548, 194, 112, 112, 4);
    } else if (level === 3) {
      this.addLevelArt('storm-relief', 560, 85, 96, 64, 8);
    } else if (level === 4) {
      this.addLevelArt('call-idle', 320, 85, 26, 26, 8);
    } else if (level === 5) {
      this.addLevelArt('tower-lamp-dim', 541, 108, 48, 48, 8);
    } else if (level === 6) {
      this.addLevelArt(this.progress.flags['l6-canopy-shut'] ? 'reservoir-shutter-closed-overlay' : 'reservoir-open', 320, 236, 80, 72, 5);
      this.addLevelArt(this.progress.flags['l6-water-flowing'] ? 'nursery-water-delivered' : 'nursery-drain-closed', 480, 178, 88, 20, 8);
    } else if (level === 9) {
      for (const [name, x] of [['memory', 190], ['hope', 320], ['balance', 450]] as const) {
        const state = this.progress.flags[`l9-${name}`] ? 'inserted' : 'empty';
        this.addLevelArt(`${name}-alcove-${state}`, x, 260, 52, 52, 8);
      }
      const core = this.progress.flags['l9-roots'] ? 'core-latched' : this.progress.flags['l9-overload'] ? 'core-ready' : 'core-night';
      this.addLevelArt(core, 320, 154, 46, 46, 8);
    }
    if (level === 1) this.drawFireflyRoute();
    if (level === 2 && this.progress.flags['l2-memory'] === true) this.addProp('crystal_memory', 320, 190, 0.9);
    if (level === 2 && this.progress.flags['l2-crystal'] === true) this.drawFifthMural();
    if (level === 5 && this.progress.flags['l5-power'] === true && !this.progress.flags['l5-crystal']) this.addProp('crystal_hope', 445, 168, 0.9);
  }

  private registerLevel(level: number): void {
    const action = (id: string, label: string | (() => string), x: number, y: number, fn: () => void, enabled: () => unknown = () => true, texture = 'beacon_stone') => this.addAction(id, label, x, y, fn, enabled, texture);
    if (level === 0) {
      action('lamp', 'E · Nhận đèn lồng', FOREST_EDGE.objects.lantern.stand.x, FOREST_EDGE.objects.lantern.stand.y, () => {
        this.progress.lanternPickedUp = true; this.progress.lanternOn = false; this.lantern.lanternInHand = true; this.lantern.lanternOn = false;
        const pickup = getLevelArtKey(0, 'pickup-lantern');
        this.objects.find((object) => object instanceof Phaser.GameObjects.Image && object.texture.key === pickup)?.destroy();
        this.say([{ speaker: 'Nhinh', text: 'Hãy giữ ánh sáng cho đến khi mọi người trở về.' }, { speaker: 'Lumo', text: 'Một lời nhắn tốt mà. Cậu thử thắp đèn đi.' }]);
        this.hintIndex = 0; this.save();
      }, () => !this.progress.lanternPickedUp && this.progress.flags['l0-lumo-met'] === true, 'pedestal_empty');
      action('lantern-inscription', 'E · Xem dòng khắc trên đèn', FOREST_EDGE.objects.lantern.stand.x, FOREST_EDGE.objects.lantern.stand.y, () => {
        this.say([{ speaker: 'Nhinh', text: 'Chữ đã mòn ở chỗ ngón tay thường chạm vào. Người chủ hẳn mang nó lâu lắm.' }]);
      }, () => this.progress.lanternPickedUp, 'pedestal_empty');
      action('tablet', 'E · Đọc bia đá', FOREST_EDGE.objects.tablet.stand.x, FOREST_EDGE.objects.tablet.stand.y, () => {
        const inscription = 'Khách qua rừng, hãy tìm dấu chân dưới lớp sương. Ánh sáng đánh thức điều mắt thường bỏ quên.';
        if (!this.lantern.lanternOn) {
          this.say([{ speaker: 'Nhinh', text: 'Những vết khắc vẫn còn đó, nhưng mình chưa đọc được.' }, { speaker: 'Lumo', text: 'Thắp đèn bằng F. Chữ sẽ hiện ra.' }]);
          return;
        }
        const firstRead = !this.progress.flags['l0-tablet-read'];
        this.progress.flags['l0-tablet-read'] = true;
        this.hintIndex = 0; this.save();
        this.say(firstRead
          ? [{ speaker: 'Nhinh', text: inscription }, { speaker: 'Nhinh', text: 'Nét chữ vừa xuất hiện.' }, { speaker: 'Lumo', text: 'Chiếc đèn này còn làm được hơn thế. Thử để ánh sáng lan ra một lần.' }]
          : [{ speaker: 'Nhinh', text: inscription }]);
      }, () => this.progress.lanternPickedUp, 'beacon_stone');
      action('gate', () => this.progress.flags['l0-gate-open'] ? 'E · Qua cổng rừng' : 'E · Kiểm tra cổng', FOREST_EDGE.objects.gate.exit.x, FOREST_EDGE.objects.gate.exit.y, () => {
        if (this.progress.flags['l0-gate-open']) {
          this.nextLevel([{ speaker: 'Nhinh', text: 'Chúng đang dẫn đường à?' }, { speaker: 'Lumo', text: 'Chúng nhớ những đường mà tôi đã quên.' }, { speaker: 'Nhinh', text: 'Vậy mình cứ theo chúng trước.' }]);
        } else {
          this.say([{ speaker: 'Nhinh', text: 'Không có ổ khóa. Chỉ có con mắt bằng đá.' }, { speaker: 'Lumo', text: 'Nó quay về phía chiếc vòng kia. Có lẽ nó đang đợi ai đứng vào đó.' }]);
        }
      }, () => true, 'woods_arch_open');
    } else if (level === 1) {
      action('poem', 'E · Đọc bài thơ', 320, 70, () => { this.progress.flags['l1-poem-read'] = true; this.save(); this.say([{ speaker: 'Hệ thống', text: 'Trăng đặt giọt bạc lên lá. Lá đưa lời thì thầm lên sao. Sao khép vòng trời, chờ một sớm mai.' }, { speaker: 'Nhinh', text: 'Trăng, Lá, Sao. Ba hình này cũng có ở bia ngoài kia.' }]); }, undefined, 'mural_tablet');
      const positions = this.getRunePositions();
      action('practice-rune', 'E · Chạm bia lá đã soi', 80, 265, () => {
        this.progress.flags['l1-practice-complete'] = true;
        this.save();
        this.say([{ speaker: 'Nhinh', text: 'Xung sáng làm hiện ký hiệu. Chạm vào thì bia ngân lên.' }, { speaker: 'Lumo', text: 'Những bia còn lại chắc cũng đang chờ như vậy.' }]);
      }, () => !this.progress.flags['l1-practice-complete'] && this.activeRevealedRunes.has('practice-leaf'), 'runestone_leaf_lit');
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
      action('fifth-mural', 'E · Xem bức tranh sau vách rễ', 432, 92, () => {
        this.progress.flags['l2-fifth-viewed'] = true;
        this.save();
        this.say([{ speaker: 'Nhinh', text: 'Người này đang giữ bánh xe lại.' }, { speaker: 'Lumo', text: 'Tôi nghe thấy mưa. Và ai đó bảo đừng để đèn tắt.' }, { speaker: 'Nhinh', text: 'Giống dòng chữ trên chiếc đèn. Mình mang ký ức này theo, chưa cần đoán phần còn thiếu.' }]);
      }, () => this.progress.flags['l2-crystal'] === true && this.progress.flags['l2-fifth-viewed'] !== true, 'shadow_npc');
      action('library-exit', 'E · Qua lối rễ cây', 530, 194, () => this.nextLevel([{ speaker: 'Lumo', text: 'Đường nước tới Cây Mẹ nằm phía đó. Tinh thể tiếp theo chắc ở ngọn tháp cuối dòng.' }, { speaker: 'Nhinh', text: 'Vậy trước hết mình phải tìm đường qua suối.' }]), () => this.progress.flags['l2-fifth-viewed'] === true, 'receiver_on');
    } else if (level === 3) {
      this.registerMirror('g1', 'G1', 180, 165, 2);
      this.registerMirror('g2', 'G2', 220, 120, 1);
      this.registerMirror('g3', 'G3', 345, 236, 2);
      action('place-creek-lantern', 'E · Đặt đèn đang bật lên bệ', 120, 205, () => { this.lantern.placeLanternAt(120, 205); this.progress.lanternOn = true; this.progress.flags['l3-lantern-placed'] = true; this.progress.flags['l3-lantern-retrieved'] = false; this.save(); }, () => this.lantern.lanternInHand && this.lantern.lanternOn && !this.lantern.lanternPlaced && !this.progress.flags['l3-lantern-retrieved'], 'pedestal_lit');
      action('receiver-a', 'E · Kiểm tra mắt A', 220, 180, () => { if (this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('g1') === 2 && this.value('g2') === 1) { this.progress.flags['l3-bridge-a'] = true; this.say([{ speaker: 'Lumo', text: 'Có đường rồi! Nhưng mới tới hòn đảo.' }]); this.save(); } else this.say([{ speaker: 'Nhinh', text: 'Đặt đèn đang bật lên bệ rồi dẫn tia qua G1 và G2.' }]); }, () => !this.progress.flags['l3-latch-a'], 'receiver_off');
      action('latch-a', 'E · Gài chốt cầu đầu', 295, 243, () => { this.progress.flags['l3-latch-a'] = true; this.save(); }, () => this.progress.flags['l3-bridge-a'] === true && this.isCreekBridgeAReady() && !this.progress.flags['l3-latch-a'], 'stepping_stone');
      action('receiver-b', 'E · Kiểm tra mắt B', 325, 243, () => { if (this.isCreekBridgeBReady()) { this.progress.flags['l3-bridge-b'] = true; this.save(); } else this.say([{ speaker: 'Nhinh', text: 'Đèn vẫn phải sáng trên bệ; đổi đường từ G2 qua G3 tới mắt B.' }]); }, () => this.progress.flags['l3-bridge-a-crossed'] === true && !this.progress.flags['l3-latch-b'], 'receiver_off');
      action('latch-b', 'E · Gài chốt cầu hai', 410, 243, () => { this.progress.flags['l3-latch-b'] = true; this.save(); }, () => this.progress.flags['l3-bridge-b-crossed'] === true && !this.progress.flags['l3-latch-b'], 'stepping_stone');
      action('retrieve-creek-lantern', 'E · Thu hồi đèn', 120, 205, () => { this.lantern.retrieveLantern(); this.progress.lanternOn = true; this.progress.flags['l3-lantern-retrieved'] = true; this.save(); }, () => this.lantern.lanternPlaced && this.progress.flags['l3-latch-a'] && this.progress.flags['l3-latch-b'] && this.progress.flags['l3-bridge-a-crossed'] && this.progress.flags['l3-bridge-b-crossed'], 'pedestal_lit');
      action('mural', 'E · Đọc phù điêu', 560, 85, () => { this.progress.flags['l3-memo'] = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Tất cả tia sáng đều hướng về Cây Mẹ.' }, { speaker: 'Lumo', text: 'Đêm ấy có một cơn bão rất lớn. Tôi nhớ tiếng chuông trên tháp.' }]); }, () => this.progress.flags['l3-lantern-retrieved'] === true && this.progress.flags['l3-bridge-b-crossed'] === true, 'mural_tablet');
      action('creek-exit', 'E · Qua trạm dẫn nước', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Có lẽ lần này họ đang đợi cậu.' }, { speaker: 'Lumo', text: 'Tôi sẽ thử đi trước.' }]), () => this.progress.flags['l3-memo'] === true, 'receiver_on');
    } else if (level === 4) {
      action('call-a', 'E · Gọi Lumo tới mốc A', 220, 130, () => this.callLumo('a', 220, 130), () => !this.progress.flags['l4-latch-a'], 'lock_moon_on');
      action('call-b', 'E · Gọi Lumo tới mốc B', 420, 130, () => this.callLumo('b', 420, 130), () => this.progress.flags['l4-latch-a'] === true && !this.progress.flags['l4-latch-b'], 'lock_moon_on');
      action('call-c', 'E · Gọi Lumo tới mốc C', 320, 218, () => this.callLumo('c', 320, 218), () => this.progress.flags['l4-latch-b'] === true && !this.progress.flags['l4-latch-c'], 'lock_moon_on');
      action('latch-a', 'E · Gài chốt cửa A', 320, 160, () => { this.progress.flags['l4-latch-a'] = true; this.save(); }, () => this.progress.flags['l4-at-a'] && !this.progress.flags['l4-latch-a'], 'receiver_off');
      action('latch-b', 'E · Gài chốt cửa B', 320, 198, () => { this.progress.flags['l4-latch-b'] = true; this.save(); }, () => this.progress.flags['l4-at-b'] && this.progress.flags['l4-latch-a'] && !this.progress.flags['l4-latch-b'], 'receiver_off');
      action('ink-trail', 'E · Soi vạch mực dưới nền', 405, 245, () => {
        this.progress.flags['l4-ink-revealed'] = true;
        this.save();
        this.say([{ speaker: 'Nhinh', text: 'Vạch mực chỉ hiện khi đèn tắt.' }, { speaker: 'Lumo', text: 'Ánh của tôi đủ để cậu thấy đường. Tôi đang chờ ở đầu kia.' }]);
      }, () => this.progress.flags['l4-at-c'] === true && !this.lantern.lanternOn && !this.progress.flags['l4-ink-revealed'], 'receiver_on');
      action('latch-c', 'E · Gài chốt cửa ra', 500, 275, () => { this.progress.flags['l4-latch-c'] = true; this.save(); }, () => this.progress.flags['l4-at-c'] && this.progress.flags['l4-latch-b'] && this.progress.flags['l4-ink-revealed'] && !this.lantern.lanternOn && !this.progress.flags['l4-latch-c'], 'receiver_off');
      action('recall-lumo', 'E · Gọi Lumo trở lại', 320, 275, () => {
        this.progress.flags['l4-return-called'] = true;
        this.progress.flags['l4-reunited'] = false;
        this.lumoTarget = { x: this.player.x - 18, y: this.player.y - 20 };
        this.save();
        this.say([{ speaker: 'Nhinh', text: 'Lumo, cửa đã giữ rồi. Cậu về đây với mình nhé?' }, { speaker: 'Lumo', text: 'Tôi tới ngay.' }]);
      }, () => this.progress.flags['l4-latch-c'] === true && !this.progress.flags['l4-reunited'], 'shadow_npc');
      action('spiral', 'E · Đọc vết xoắn', 500, 85, () => { this.progress.flags['l4-memo'] = true; this.save(); this.say([{ speaker: 'Lumo', text: 'Tôi đã đi qua đây trong đêm bão. Có ai đó đứng ngoài gọi… nhưng tôi không nghe rõ tên.' }, { speaker: 'Nhinh', text: 'Mình ghi lại. Cậu không cần giữ tất cả một mình.' }]); }, () => this.progress.flags['l4-latch-c'] === true && !this.progress.flags['l4-memo'], 'mural_tablet');
      action('tower-stairs', 'E · Lên tháp', 500, 85, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Tháp vẫn đang lấy nước.' }, { speaker: 'Lumo', text: 'Mình lên xem nó đang đợi điều gì.' }]), () => this.progress.flags['l4-memo'] === true && this.progress.flags['l4-reunited'] === true, 'woods_arch_open');
    } else if (level === 5) {
      this.registerMirror('tower-g0', 'Gương chung G0', 160, 170, 2);
      this.registerMirror('tower-g1', 'Gương A', 210, 170, 1);
      this.registerMirror('tower-g2', 'Gương B', 320, 130, 3);
      action('tower-lantern-place', 'E · Đặt đèn lên bệ máy', 120, 205, () => {
        this.lantern.placeLanternAt(120, 205);
        this.progress.flags['l5-lantern-placed'] = true;
        this.progress.flags['l5-lantern-retrieved'] = false;
        this.progress.lanternOn = true;
        this.save();
      }, () => this.lantern.lanternInHand && this.lantern.lanternOn && !this.lantern.lanternPlaced && !this.progress.flags['l5-power'], 'pedestal_lit');
      action('call-high-seal', 'E · Gọi Lumo tới ấn cao', 320, 80, () => this.callLumo('high', 320, 80), () => !this.progress.flags['l5-power'], 'lock_sun_on');
      action('tower-return-flow', 'E · Gạt cần Trả dòng', 445, 168, () => {
        const lumoHoldingSeal = this.progress.flags['l5-called-high'] === true
          && Math.hypot(this.lumo.sprite.x - 320, this.lumo.sprite.y - 80) < 36;
        const branchesReady = this.lantern.lanternPlaced && this.lantern.lanternOn
          && this.value('tower-g0') === 2 && this.value('tower-g1') === 1 && this.value('tower-g2') === 3;
        if (branchesReady && lumoHoldingSeal) {
          this.progress.flags['l5-power'] = true;
          this.progress.flags['l5-water-returned'] = true;
          this.addProp('crystal_hope', 445, 168, 0.9);
          this.say([{ speaker: 'Lumo', text: 'Cả ba vòng đều đang quay!' }, { speaker: 'Nhinh', text: 'Chuyển cần. Cậu giữ nguyên một chút.' }, { speaker: 'Nhinh', text: 'Nước đã đổi hướng. Máy tự giữ chế độ Trả dòng.' }, { speaker: 'Lumo', text: 'Tôi nghe tiếng suối!' }]);
          this.save();
        } else this.say([{ speaker: 'Nhinh', text: 'Cần vẫn khóa. Cần cả hai nhánh sáng cùng lúc và Lumo giữ ấn C.' }]);
      }, () => !this.progress.flags['l5-power'], 'receiver_off');
      action('tower-lantern-retrieve', 'E · Thu hồi đèn', 120, 205, () => { this.lantern.retrieveLantern(); this.progress.flags['l5-lantern-retrieved'] = true; this.progress.lanternOn = true; this.save(); }, () => this.progress.flags['l5-power'] === true && this.lantern.lanternPlaced && !this.progress.flags['l5-lantern-retrieved'], 'pedestal_lit');
      action('hope-crystal', 'E · Nhận Tinh thể Hy Vọng', 445, 168, () => { this.progress.flags['l5-crystal'] = true; this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.texture.key === 'crystal_hope')?.destroy(); this.save(); this.say([{ speaker: 'Nhinh', text: 'Tinh thể Hy Vọng đã được giải phóng.' }]); }, () => this.progress.flags['l5-power'] === true && this.progress.flags['l5-lantern-retrieved'] === true && !this.progress.flags['l5-crystal'], 'crystal_hope');
      action('tower-recall-lumo', 'E · Gọi Lumo trở lại', 320, 80, () => { this.progress.flags['l5-return-called'] = true; this.lumoTarget = { x: this.player.x - 18, y: this.player.y - 20 }; this.save(); this.say([{ speaker: 'Nhinh', text: 'Cậu về được rồi, Lumo.' }, { speaker: 'Lumo', text: 'Tôi nghe thấy nước. Tôi tới ngay.' }]); }, () => this.progress.flags['l5-power'] === true && !this.progress.flags['l5-reunited'], 'shadow_npc');
      action('tower-record', 'E · Nghe bản ghi bên cửa sổ', 535, 86, () => { this.progress.flags['l5-record-read'] = true; this.save(); this.say([{ speaker: 'Ký Ức', text: 'Đội tìm kiếm đã trở về. Con bé vẫn chưa có mặt. Cha sẽ giữ ngọn tháp sáng thêm một đêm. Nếu con nhìn thấy, cứ đi về phía ánh đèn. Cha ở đây.' }, { speaker: 'Nhinh', text: 'Ông ấy đang đợi con gái.' }, { speaker: 'Lumo', text: 'Tôi nhớ chiếc khăn này. Nó từng đỏ.' }, { speaker: 'Nhinh', text: 'Mình đã trả nước cho rừng. Chuyện ở Cây Mẹ vẫn cần được biết.' }]); }, () => this.progress.flags['l5-crystal'] === true && !this.progress.flags['l5-record-read'], 'mural_tablet');
      action('tower-exit', 'E · Ra khu vườn', 560, 300, () => this.nextLevel([{ speaker: 'Lumo', text: 'Nước đã trở lại. Sao những cây nhỏ vẫn cúi đầu?' }, { speaker: 'Nhinh', text: 'Mình xuống gần xem.' }]), () => this.progress.flags['l5-record-read'] === true && this.progress.flags['l5-reunited'] === true, 'woods_arch_open');
    } else if (level === 6) {
      action('sun-shutter', 'E · Kéo màn che bể tích quang', 320, 75, () => { this.progress.flags['l6-canopy-shut'] = true; this.save(); this.say([{ speaker: 'Lumo', text: 'Tối đi thật.' }, { speaker: 'Nhinh', text: 'Nghe kìa.' }]); }, () => !this.progress.flags['l6-canopy-shut'], 'lock_sun_off');
      action('sun-gate', 'E · Đánh thức cây nắng', 220, 160, () => this.setFlag('l6-sun-open'), () => this.progress.flags['l6-canopy-shut'] && this.lantern.lanternOn && !this.progress.flags['l6-sun-open'], 'ruins_flower');
      action('moon-gate', 'E · Đánh thức rễ trăng', 420, 160, () => this.setFlag('l6-moon-open'), () => this.progress.flags['l6-canopy-shut'] && !this.lantern.lanternOn && !this.progress.flags['l6-moon-open'], 'ruins_flower');
      action('sun-latch', 'E · Gài chốt thanh chắn', 310, 185, () => { this.progress.flags['l6-sun-latched'] = true; this.save(); this.say([{ speaker: 'Lumo', text: 'Cửa vẫn mở. Cậu giữ được thanh chắn rồi.' }]); }, () => this.progress.flags['l6-sun-open'] && !this.progress.flags['l6-sun-latched'], 'receiver_off');
      action('garden-water', 'E · Mở cống tới vườn ươm', 320, 300, () => { this.progress.flags['l6-water-flowing'] = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Nước đã chảy tới vườn ươm.' }, { speaker: 'Lumo', text: 'Một chiếc lá vừa mở ra.' }]); }, () => this.progress.flags['l6-bridge-crossed'] && !this.progress.flags['l6-water-flowing'], 'receiver_off');
      action('return-latch', 'E · Gài chốt lối đá phụ', 480, 300, () => { this.progress.flags['l6-return-latched'] = true; this.save(); this.say([{ speaker: 'Lumo', text: 'Cầu rễ rút lại được rồi. Lối đá phụ vẫn thông.' }, { speaker: 'Nhinh', text: 'Cây non có nước và có lúc nghỉ.' }]); }, () => this.progress.flags['l6-water-flowing'] && !this.progress.flags['l6-return-latched'], 'receiver_on');
      action('garden-reflection', 'E · Nói với Lumo bên mầm cây', 450, 155, () => { this.progress.flags['l6-lumo-realized'] = true; this.save(); this.say([{ speaker: 'Lumo', text: 'Tôi cứ nghĩ nếu làm mọi nơi sáng hơn…' }, { speaker: 'Nhinh', text: 'Cậu muốn giúp rừng tỉnh dậy.' }, { speaker: 'Lumo', text: 'Nhưng có những thứ cần được ngủ.' }, { speaker: 'Nhinh', text: 'Mình biết thêm được một điều rồi.' }, { speaker: 'Lumo', text: 'Cứ ngủ đi. Chúng tôi sẽ giữ đường nước mở.' }]); }, () => this.progress.flags['l6-return-latched'] && !this.progress.flags['l6-lumo-realized'], 'ruins_flower');
      action('garden-exit', 'E · Qua cổng vườn', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Đường vào điện thờ đã mở.' }, { speaker: 'Lumo', text: 'Mình cùng xem điều gì đang chờ ở đó.' }]), () => this.progress.flags['l6-lumo-realized'] === true, 'woods_arch_open');
    } else if (level === 7) {
      this.registerMirror('ruins-left', 'Gương trái', 220, 175, 2);
      this.registerMirror('ruins-right', 'Gương phải', 420, 175, 1);
      action('place-ruins-lantern', 'E · Đặt đèn lên bệ', 120, 205, () => { this.lantern.placeLanternAt(120, 205); this.progress.lanternOn = true; this.progress.flags['l7-lantern-placed'] = true; this.save(); }, () => this.lantern.lanternInHand && !this.lantern.lanternPlaced, 'pedestal_empty');
      action('retrieve-ruins-lantern', 'E · Nhận lại đèn', 120, 205, () => { this.lantern.retrieveLantern(); this.progress.lanternOn = true; this.progress.flags['l7-lantern-placed'] = false; this.save(); }, () => this.lantern.lanternPlaced && this.progress.flags['l7-solved'], 'pedestal_lit');
      action('ruins-eye-left', 'E · Kiểm tra mắt nắng trái', 200, 126, () => { this.say([{ speaker: 'Nhinh', text: this.isRuinsOuterBeamReady('left') ? 'Mắt trái đang nhận tia.' : 'Mắt trái chưa nhận đủ ánh sáng.' }]); }, () => !this.progress.flags['l7-solved'], 'receiver_off');
      action('ruins-eye-right', 'E · Kiểm tra mắt nắng phải', 440, 126, () => { this.say([{ speaker: 'Nhinh', text: this.isRuinsOuterBeamReady('right') ? 'Mắt phải đang nhận tia.' : 'Mắt phải chưa nhận đủ ánh sáng.' }]); }, () => !this.progress.flags['l7-solved'], 'receiver_off');
      action('ruins-inscription', 'E · Đọc bia điện thờ', 320, 300, () => { this.progress.flags['l7-inscription-read'] = true; this.save(); this.say([{ speaker: 'Hệ thống', text: 'Mặt trời giữ đường đi. Mặt trăng giữ giờ nghỉ. Đừng đặt một bên vào chỗ của cả hai.' }]); }, () => !this.progress.flags['l7-inscription-read'], 'beacon_stone');
      action('statue', 'E · Xoay tượng chắn sáng', 320, 170, () => { this.progress.counters['statue'] = (this.value('statue') + 1) % 4; this.save(); }, undefined, 'guardian_statue');
      action('balance-lock', 'E · Thử bàn cân', 320, 82, () => {
        if (this.isRuinsOuterBeamReady('left') && this.isRuinsOuterBeamReady('right') && this.value('statue') === 2) { this.progress.flags['l7-solved'] = true; this.progress.flags['l7-route-latched'] = true; this.say([{ speaker: 'Nhinh', text: 'Hai mắt ngoài sáng lên. Tia giữa nằm gọn trong bóng của pho tượng.' }, { speaker: 'Lumo', text: 'Cân bằng không có nghĩa là mọi thứ phải giống nhau.' }]); this.save(); }
        else this.say([{ speaker: 'Nhinh', text: 'Bàn cân chưa ổn định. Cần hai mắt ngoài sáng đồng thời và bóng tượng phủ hốc giữa.' }]);
      }, () => !this.progress.flags['l7-solved'], 'ruins_altar');
      action('shadow-seal', 'E · Trò chuyện với The Shadow', 320, 98, () => { this.progress.flags['l7-met-shadow'] = true; this.save(); this.say([{ speaker: 'The Shadow', text: 'Ánh sáng không phải thứ duy nhất giữ thế giới cân bằng.' }, { speaker: 'Lumo', text: 'Tôi sợ điều mình sắp nhớ ra.' }, { speaker: 'Nhinh', text: 'Mình sẽ đọc cùng nhau.' }, { speaker: 'The Shadow', text: 'Dấu xoắn dưới đài dẫn tới nơi có thể nhìn thấy cả ba phòng.' }]); }, () => this.progress.flags['l7-solved'] && !this.progress.flags['l7-met-shadow'], 'shadow_npc');
      action('ruins-exit', 'E · Vào đài thiên văn', 560, 300, () => this.nextLevel([{ speaker: 'Nhinh', text: 'Đường này dẫn lên đài thiên văn.' }, { speaker: 'Lumo', text: 'Tôi nghe thấy tiếng mưa trong ký ức.' }]), () => this.progress.flags['l7-met-shadow'] === true && this.progress.flags['l7-lantern-placed'] !== true, 'woods_arch_open');
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
      action('heart-lantern-place', 'E · Đặt đèn lên bệ dẫn sáng', 100, 205, () => { this.lantern.placeLanternAt(100, 205); this.progress.lanternOn = true; this.progress.flags['l9-lantern-placed'] = true; this.save(); this.say([{ speaker: 'Nhinh', text: 'Ánh sáng đã được đặt ở tâm dẫn.' }]); }, () => this.lantern.lanternInHand && !this.lantern.lanternPlaced && !this.progress.flags['l9-roots'], 'pedestal_empty');
      this.registerMirror('heart-memory', 'Gương Ký Ức', 220, 220, 1);
      this.registerMirror('heart-balance', 'Gương Cân Bằng', 420, 220, 2);
      this.registerMirror('heart-prism', 'Lăng kính', 320, 200, 1);
      action('heart-left-eye', 'E · Chỉnh mắt nắng trái', 180, 145, () => { this.progress.counters['heart-left-eye'] = (this.value('heart-left-eye') + 1) % 2; this.save(); }, () => !this.progress.flags['l9-roots'], 'receiver_off');
      action('heart-right-eye', 'E · Chỉnh mắt nắng phải', 460, 145, () => { this.progress.counters['heart-right-eye'] = (this.value('heart-right-eye') + 1) % 2; this.save(); }, () => !this.progress.flags['l9-roots'], 'receiver_off');
      action('heart-statue', 'E · Xoay tượng vào hốc trăng', 400, 125, () => { this.progress.counters['heart-statue'] = (this.value('heart-statue') + 1) % 4; this.save(); }, () => !this.progress.flags['l9-roots'], 'guardian_statue');
      action('heart-call-lumo', 'E · Gọi Lumo tới ấn hy vọng', 320, 125, () => this.callLumo('heart', 320, 125), () => !this.progress.flags['l9-roots'], 'shadow_npc');
      action('heart-roots', 'E · Cân bằng hai mắt và hốc trăng', 320, 85, () => {
        const lumoHoldingSeal = this.progress.flags['l9-called-heart'] === true
          && Math.hypot(this.lumo.sprite.x - 320, this.lumo.sprite.y - 125) < 36;
        const ready = this.progress.flags['l9-memory'] && this.progress.flags['l9-hope'] && this.progress.flags['l9-balance'] && this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('heart-memory') === 1 && this.value('heart-balance') === 2 && this.value('heart-prism') === 1 && lumoHoldingSeal && this.value('heart-left-eye') === 1 && this.value('heart-right-eye') === 1 && this.value('heart-statue') === 2;
        if (ready) { this.progress.flags['l9-roots'] = true; this.say([{ speaker: 'Nhinh', text: 'Hai mắt cùng sáng, còn hốc trăng được giữ trong bóng. Cây Mẹ đã nhận đủ ba tinh thể.' }, { speaker: 'Lumo', text: 'Tôi ở đây. Hãy lấy đèn về; chúng ta sẽ cùng khép vòng.' }]); this.save(); }
        else {
          const missing: string[] = [];
          if (!this.progress.flags['l9-memory'] || !this.progress.flags['l9-hope'] || !this.progress.flags['l9-balance']) missing.push('đặt đủ ba tinh thể');
          if (!this.lantern.lanternPlaced || !this.lantern.lanternOn) missing.push('đặt đèn đang bật lên bệ');
          if (this.value('heart-memory') !== 1 || this.value('heart-balance') !== 2 || this.value('heart-prism') !== 1) missing.push('hướng lăng kính và hai nhánh đúng');
          if (this.value('heart-left-eye') !== 1 || this.value('heart-right-eye') !== 1) missing.push('chiếu sáng cả hai mắt nắng');
          if (this.value('heart-statue') !== 2) missing.push('để tượng phủ bóng lên hốc trăng');
          if (!lumoHoldingSeal) missing.push('gọi Lumo tới ấn và chờ cậu ấy giữ vị trí');
          this.say([{ speaker: 'Nhinh', text: `Còn thiếu: ${missing.join('; ')}.` }]);
        }
      }, () => !this.progress.flags['l9-roots'], 'heart_tree_0');
      action('heart-lantern-retrieve', 'E · Nhận đèn và giữ nguồn sáng', 100, 205, () => {
        const lampWasAlreadyOff = !this.lantern.lanternOn;
        this.lantern.retrieveLantern();
        this.progress.flags['l9-lantern-placed'] = false;
        this.progress.flags['l9-lantern-retrieved'] = true;
        if (lampWasAlreadyOff) {
          this.lantern.lanternOn = false;
          this.progress.lanternOn = false;
          this.lantern.isOverloadMode = false;
          this.save();
          this.finishHeart();
          return;
        }
        this.progress.lanternOn = true;
        this.progress.flags['l9-overload'] = true;
        this.lantern.isOverloadMode = true;
        this.save();
        this.say([{ speaker: 'Nhinh', text: 'Nguồn sáng trở về tay mình. Nó đang dâng quá ngưỡng!' }, { speaker: 'Lumo', text: 'Đừng buông tay. Khi đã sẵn sàng, hãy tắt đèn để ánh sáng tràn qua Cây Mẹ.' }]);
      }, () => this.progress.flags['l9-roots'] && this.lantern.lanternPlaced && this.progress.flags['l9-lantern-retrieved'] !== true, 'pedestal_lit');
    }
  }

  private updatePuzzle(dt: number): void {
    if (this.progress.level === 1 && this.runeRevealExpiresAt > 0 && this.time.now >= this.runeRevealExpiresAt) {
      this.activeRevealedRunes.clear();
      this.runeRevealExpiresAt = 0;
      this.updateRuneRevealVisuals();
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
    if (this.progress.level === 4 && this.progress.flags['l4-return-called'] === true && this.progress.flags['l4-reunited'] !== true) {
      this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 18, 24, 616), y: Phaser.Math.Clamp(this.player.y - 20, 58, 305) };
      if (Math.hypot(this.lumo.sprite.x - this.lumoTarget.x, this.lumo.sprite.y - this.lumoTarget.y) < 30) {
        this.progress.flags['l4-reunited'] = true;
        this.save();
        this.say([{ speaker: 'Lumo', text: 'Tôi về rồi. Mình cùng lên tháp nhé.' }]);
      }
    }
    if (this.progress.level === 5 && this.progress.flags['l5-return-called'] === true && this.progress.flags['l5-reunited'] !== true) {
      this.lumoTarget = { x: Phaser.Math.Clamp(this.player.x - 18, 24, 616), y: Phaser.Math.Clamp(this.player.y - 20, 58, 305) };
      if (Math.hypot(this.lumo.sprite.x - this.lumoTarget.x, this.lumo.sprite.y - this.lumoTarget.y) < 30) {
        this.progress.flags['l5-reunited'] = true;
        this.save();
        this.say([{ speaker: 'Lumo', text: 'Tôi đã trở lại. Mình cùng xuống vườn nhé.' }]);
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
      if (current === 2) {
        this.progress.flags['l1-open'] = true;
        this.progress.flags['l1-memory-seen'] = true;
        this.say([{ speaker: 'Nhinh', text: 'Những rễ cây đang nới ra.' }, { speaker: 'Lumo', text: 'Nhìn kìa… có một người lớn đang treo đèn lên cành.' }, { speaker: 'Ký Ức', text: 'Mai mình lại ra đây nhé? Khi mặt trời lên. Đêm nay để rừng ngủ đã.' }, { speaker: 'Nhinh', text: 'Nơi này từng có bình minh.' }, { speaker: 'Lumo', text: 'Tôi chỉ thấy rất quen. Như một bài hát thiếu mất đoạn đầu.' }]);
      }
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
    const layerClues: Record<string, { lit: string; dark: string }> = {
      bird: { lit: 'Mặt trời sát chân trời trên mặt nước.', dark: 'Một vạch đi từ dưới lên qua chân trời.' },
      leaf: { lit: 'Mặt trời ở cao. Đường cung quanh nó bị khuyết.', dark: 'Đường cung lên tới đỉnh; thiên thể không còn hiện.' },
      boat: { lit: 'Mặt trời sát chân trời trên mặt nước.', dark: 'Một vạch đi từ trên xuống qua chân trời.' },
      seed: { lit: 'Mặt trăng ở cao. Đường cung quanh nó bị khuyết.', dark: 'Đường cung lên tới đỉnh; thiên thể không còn hiện.' },
    };
    const lines: DialogueLine[] = [{ speaker: 'Nhinh', text: `${this.stoneLabel(stone)}: ${layerClues[stone][layer]}` }];
    if (this.progress.flags[`l2-${stone}-${other}`]) lines.push({ speaker: 'Lumo', text: 'Hai lớp ghép lại mới cho biết thời điểm trong ngày.' });
    this.save();
    this.drawMemoryProgress();
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
    this.drawMemoryProgress();
    this.say([{ speaker: 'Nhinh', text: `Đã đặt phiến vào hốc ${socket + 1}.` }]);
  }

  private checkMemory(): void {
    const slots = this.readMemorySlots();
    if (slots.join(',') === '0,1,2,3') {
      this.progress.flags['l2-memory'] = true;
      if (!this.objects.some((object) => object instanceof Phaser.GameObjects.Image && object.texture.key === 'crystal_memory')) this.addProp('crystal_memory', 320, 190, 0.9);
      this.say([{ speaker: 'Nhinh', text: 'Bình minh, ngày, chiều… rồi đêm.' }, { speaker: 'Lumo', text: 'Tôi đã quên khu rừng từng đổi màu đẹp thế nào.' }]); this.save();
    } else this.say([{ speaker: 'Nhinh', text: 'Vòng này chưa liền mạch.' }, { speaker: 'Lumo', text: 'Mình xem lại đường đi của mặt trời trên từng tranh nhé.' }]);
    this.drawMemoryProgress();
  }

  private finishMemory(): void {
    this.progress.flags['l2-crystal'] = true; this.save();
    this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && object.texture.key === 'crystal_memory')?.destroy();
    this.drawFifthMural();
    this.say([{ speaker: 'Lumo', text: 'Ký Ức. Tôi nhớ rồi… đây là một trong ba mảnh trái tim Cây Mẹ.' }, { speaker: 'Nhinh', text: 'Vậy còn hai mảnh nữa?' }, { speaker: 'Lumo', text: 'Hy Vọng và Cân Bằng. Những cái tên ấy được khắc trên rễ cây.' }, { speaker: 'Nhinh', text: 'Mình giữ mảnh này cẩn thận. Rồi tìm đường tới hai mảnh còn lại.' }]);
  }

  private drawMemoryProgress(): void {
    for (const [stone, x] of [['bird', 170], ['leaf', 270], ['boat', 370], ['seed', 470]] as Array<[string, number]>) {
      let label = this.memoryLayerLabels.get(stone);
      if (!label || !label.scene) {
        label = this.add.text(x, 145, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#fff1b0', backgroundColor: '#07151ccc', padding: { x: 3, y: 2 }, align: 'center' }).setOrigin(0.5).setDepth(22);
        this.memoryLayerLabels.set(stone, label);
        this.track(label);
      }
      const lit = this.progress.flags[`l2-${stone}-lit`] === true;
      const dark = this.progress.flags[`l2-${stone}-dark`] === true;
      label.setText(`${lit ? '☀' : '·'} ${dark ? '☾' : '·'}`);
    }
    const slots = this.readMemorySlots();
    for (let index = 0; index < slots.length; index += 1) {
      let label = this.memorySocketLabels.get(index);
      if (!label || !label.scene) {
        label = this.add.text([190, 280, 360, 450][index], 278, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#f5efe0', backgroundColor: '#07151ccc', padding: { x: 3, y: 2 }, align: 'center' }).setOrigin(0.5).setDepth(22);
        this.memorySocketLabels.set(index, label);
        this.track(label);
      }
      label.setText(slots[index] < 0 ? `Hốc ${index + 1}` : this.stoneLabel(['bird', 'leaf', 'boat', 'seed'][slots[index]]));
    }
  }

  private drawFifthMural(): void {
    if (this.objects.some((object) => object instanceof Phaser.GameObjects.Graphics && object.getData('campaign-fifth-mural') === true)) return;
    const muralArt = getLevelArtKey(2, 'room-mural-fifth');
    const hasMuralCaption = this.objects.some((object) =>
      object instanceof Phaser.GameObjects.Text && object.getData('campaign-fifth-mural-caption') === true,
    );
    if (!hasMuralCaption) {
      const caption = this.add.text(432, 53, 'BẢO VỆ · BÁNH XE MẶT TRỜI', { fontFamily: 'Segoe UI, sans-serif', fontSize: '7px', color: '#ffe7a4', backgroundColor: '#07151ccc', padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(22);
      caption.setData('campaign-fifth-mural-caption', true);
      this.track(caption);
    }
    if (muralArt && this.textures.exists(muralArt)) return;
    const muralWidth = 62 * 96 / 136;
    const mural = this.add.graphics().setDepth(17).setPosition(432, 92);
    mural.setData('campaign-fifth-mural', true);
    mural.fillStyle(0x283342, 0.95); mural.fillRoundedRect(-muralWidth / 2, -31, muralWidth, 62, 4);
    mural.lineStyle(2, 0xe4c477, 0.8); mural.strokeRoundedRect(-muralWidth / 2 + 1, -30, muralWidth - 2, 60, 3);
    mural.lineStyle(1, 0x9fb1bd, 0.45);
    for (const [x, y] of [[-14, -23], [8, -24], [16, -13], [-15, 18], [15, 23]] as Array<[number, number]>) mural.strokeCircle(x, y, 1);
    mural.fillStyle(0x1a1c25, 0.95); mural.fillEllipse(0, 13, 12, 24); mural.fillCircle(0, -10, 5);
    mural.lineStyle(2, 0xf4d574, 0.85); mural.strokeCircle(0, -6, 14);
    this.track(mural);
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
    if ((this.progress.level === 4 && this.progress.flags['l4-return-called']) || (this.progress.level === 5 && this.progress.flags['l5-return-called'])) return { x: this.player.x - 18, y: this.player.y - 20 };
    if (this.progress.level === 4) {
      for (const mark of ['c', 'b', 'a']) if (this.progress.flags[`l4-called-${mark}`]) return this.getLumoMark(mark);
    }
    return { x: 350, y: 260 };
  }

  private addAction(id: string, label: string | (() => string), x: number, y: number, onInteract: () => void, isEnabled: () => unknown = () => true, texture = 'beacon_stone'): void {
    if (id.includes('exit') || id === 'stairs') {
      const hasGateProp = this.objects.some((object) =>
        object instanceof Phaser.GameObjects.Image
        && Math.abs(object.x - x) < 0.1
        && Math.abs(object.y - y) < 0.1
        && (object.texture.key === 'woods_arch_locked'
          || object.texture.key === 'woods_arch_open'
          || object.texture.key.includes('woods_arch_open_passage')),
      );
      if (!hasGateProp) this.addProp(texture, x, y, 0.8);
    }
    this.interactions.register({ id, x, y, radius: this.progress.level === 0 ? 24 : 35, getPrompt: () => isEnabled() ? (typeof label === 'function' ? label() : label) : null, onInteract, isEnabled: () => Boolean(isEnabled()) });
  }

  private clearCampaignColliders(): void {
    for (const collider of this.campaignColliders) collider.destroy();
    this.campaignColliders = [];
    this.campaignBodies.clear();
    this.creekBridgeBPendingRemoval = false;
    this.creekBridgeBWasPassable = false;
    this.gardenBridgePendingRemoval = false;
    this.gardenBridgeWasReady = false;
    this.gardenTraversalSide = null;
  }

  private addCampaignBarrier(id: string, x: number, y: number, width: number, height: number, enabled = true): void {
    const object = this.add.rectangle(x, y, width, height, 0x000000, 0);
    this.physics.add.existing(object, true);
    const body = object.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = enabled;
    this.campaignBodies.set(id, body);
    this.campaignColliders.push(this.physics.add.collider(this.player.sprite, object));
    this.objects.push(object);
  }

  private buildCampaignBarriers(level: number): void {
    if (level === 0) {
      this.addCampaignBarrier('forest-north-boundary', 320, 91, 640, 10);
      this.addCampaignBarrier('forest-south-boundary', 320, 315, 640, 10);
      this.addCampaignBarrier('forest-west-boundary', 5, 200, 10, 220);
      this.addCampaignBarrier('forest-east-boundary', 635, 200, 10, 220);
      FOREST_EDGE_SOLIDS.forEach((rect, index) => {
        this.addCampaignBarrier(`forest-solid-${index}`, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
      });
      const closedForestBoundary = FOREST_EDGE.objects.closedForestBoundary;
      this.addCampaignBarrier('forest-closed-forest-boundary', closedForestBoundary.x + closedForestBoundary.width / 2, closedForestBoundary.y + closedForestBoundary.height / 2, closedForestBoundary.width, closedForestBoundary.height, !this.progress.flags['l0-gate-open']);
      const barrier = FOREST_EDGE.objects.gate.threshold;
      this.addCampaignBarrier('forest-gate-threshold', barrier.x + barrier.width / 2, barrier.y + barrier.height / 2, barrier.width, barrier.height, !this.progress.flags['l0-gate-open']);
    } else if (level === 3) {
      // The creek runs from the top to the bottom edge; the only crossing is its narrow stone lane.
      this.addCampaignBarrier('creek-upper-water', 332.5, 110, 175, 220);
      this.addCampaignBarrier('creek-lower-water', 332.5, 306, 175, 108);
      this.addCampaignBarrier('creek-bridge-a-gate', 315, 236, 12, 32, !this.progress.flags['l3-latch-a']);
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerOnBridgeB = Boolean(body && Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
        new Phaser.Geom.Rectangle(335, 220, 75, 32),
      ));
      const savedCreekSide = this.progress.flags['l3-bridge-b-crossing-side'];
      this.creekBridgeBTraversalSide = playerOnBridgeB && (savedCreekSide === 'west' || savedCreekSide === 'east')
        ? savedCreekSide
        : null;
      const creekPendingFlag = this.progress.flags['l3-bridge-b-pending'] === true;
      this.creekBridgeBWasPassable = this.isCreekBridgeBOpen();
      this.creekBridgeBPendingRemoval = playerOnBridgeB && !this.creekBridgeBWasPassable
        && creekPendingFlag && this.creekBridgeBTraversalSide !== null;
      if (!playerOnBridgeB && savedCreekSide) {
        delete this.progress.flags['l3-bridge-b-crossing-side'];
        this.creekBridgeBTraversalSide = null;
        this.save();
      }
      if (this.creekBridgeBPendingRemoval && !creekPendingFlag) {
        this.progress.flags['l3-bridge-b-pending'] = true;
        this.savePlayerCheckpoint();
      } else if (!playerOnBridgeB && this.progress.flags['l3-bridge-b-pending']) {
        delete this.progress.flags['l3-bridge-b-pending'];
        this.save();
      }
      this.addCampaignBarrier('creek-bridge-b-gate', 370, 236, 12, 32, !this.isCreekBridgeBOpen() && !this.creekBridgeBPendingRemoval);
    } else if (level === 6) {
      // The retractable root bridge and latched stone return path are the only canal crossings.
      this.addCampaignBarrier('garden-west-water', 135, 260, 270, 30);
      // The return latch opens a separate stone crossing, independent of the retractable root bridge.
      this.addCampaignBarrier('garden-east-water-near', 415, 260, 90, 30);
      this.addCampaignBarrier('garden-east-water-far', 580, 260, 120, 30);
      this.addCampaignBarrier('garden-return-path-gate', 490, 260, 75, 30, !this.progress.flags['l6-return-latched']);
      const bridgeReady = this.isGardenBridgeReady();
      this.gardenBridgeWasReady = bridgeReady;
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerOnRootBridge = Boolean(body && Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
        new Phaser.Geom.Rectangle(270, 245, 100, 30),
      ));
      const savedCrossingSide = this.progress.flags['l6-crossing-side'];
      this.gardenTraversalSide = playerOnRootBridge && (savedCrossingSide === 'north' || savedCrossingSide === 'south')
        ? savedCrossingSide
        : null;
      this.gardenBridgePendingRemoval = !bridgeReady && playerOnRootBridge && this.gardenTraversalSide !== null;
      if (!playerOnRootBridge && savedCrossingSide) {
        delete this.progress.flags['l6-crossing-side'];
        this.gardenTraversalSide = null;
        this.save();
      }
      this.addCampaignBarrier('garden-root-bridge-gate', 320, 260, 100, 30, !bridgeReady && !this.gardenBridgePendingRemoval);
    }
  }

  private isGardenBridgeReady(): boolean {
    return this.progress.flags['l6-sun-latched'] === true
      && this.progress.flags['l6-moon-open'] === true
      && !this.lantern.lanternOn;
  }

  private isCreekBridgeAReady(): boolean {
    return this.lantern.lanternPlaced && this.lantern.lanternOn && this.value('g1') === 2 && this.value('g2') === 1;
  }

  private isCreekBridgeBReady(): boolean {
    return this.progress.flags['l3-bridge-a-crossed'] === true
      && this.lantern.lanternPlaced && this.lantern.lanternOn
      && this.value('g2') === 3 && this.value('g3') === 2;
  }

  private isCreekBridgeBOpen(): boolean {
    return (this.progress.flags['l3-bridge-b'] === true && this.isCreekBridgeBReady()) || this.progress.flags['l3-latch-b'] === true
      || (this.progress.flags['l3-bridge-b-crossed'] === true && this.player.x > 370);
  }

  private updateCampaignBarriers(): void {
    const setEnabled = (id: string, enabled: boolean): void => {
      const body = this.campaignBodies.get(id);
      if (body) body.enable = enabled;
    };
    if (this.progress.level === 0) {
      setEnabled('forest-gate-threshold', !this.progress.flags['l0-gate-open']);
    } else if (this.progress.level === 3) {
      setEnabled('creek-bridge-a-gate', !this.progress.flags['l3-latch-a']);
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerOnBridgeB = Boolean(body && Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
        new Phaser.Geom.Rectangle(335, 220, 75, 32),
      ));
      if (!this.isCreekBridgeBOpen() && playerOnBridgeB && this.creekBridgeBTraversalSide !== null && !this.creekBridgeBPendingRemoval) {
        this.creekBridgeBPendingRemoval = true;
        this.progress.flags['l3-bridge-b-pending'] = true;
        this.savePlayerCheckpoint();
      }
      if (this.isCreekBridgeBOpen() && this.creekBridgeBPendingRemoval) {
        this.creekBridgeBPendingRemoval = false;
        delete this.progress.flags['l3-bridge-b-pending'];
        this.save();
      }
      setEnabled('creek-bridge-b-gate', !this.isCreekBridgeBOpen() && !this.creekBridgeBPendingRemoval);
    } else if (this.progress.level === 6) {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerOnBridge = Boolean(body && Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
        new Phaser.Geom.Rectangle(270, 245, 100, 30),
      ));
      if (!this.isGardenBridgeReady() && playerOnBridge && this.gardenTraversalSide !== null) this.gardenBridgePendingRemoval = true;
      if (this.isGardenBridgeReady()) this.gardenBridgePendingRemoval = false;
      if (this.gardenBridgePendingRemoval && !playerOnBridge) this.gardenBridgePendingRemoval = false;
      setEnabled('garden-root-bridge-gate', !this.isGardenBridgeReady() && !this.gardenBridgePendingRemoval);
      setEnabled('garden-return-path-gate', !this.progress.flags['l6-return-latched']);
    }
  }

  private updateCampaignCrossingState(): void {
    const previous = this.lastCampaignPlayerPosition;
    const x = this.player.x;
    const y = this.player.y;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const bodyOffsetX = body ? body.x - x : 0;
    const bodyOffsetY = body ? body.y - y : 0;
    const bodyHeight = body?.height ?? 0;
    const bodyLeft = body?.left ?? 0;
    const bodyRight = body?.right ?? 0;
    const playerOnBridgeB = Boolean(body && Phaser.Geom.Rectangle.Overlaps(
      new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
      new Phaser.Geom.Rectangle(335, 220, 75, 32),
    ));
    const creekLaneOverlaps = (playerY: number): boolean => playerY + bodyOffsetY < 252
      && playerY + bodyOffsetY + bodyHeight > 220;
    if (this.progress.level === 3 && playerOnBridgeB && this.creekBridgeBTraversalSide === null
      && (this.isCreekBridgeBOpen() || this.creekBridgeBWasPassable || this.creekBridgeBPendingRemoval)) {
      const previousBodyLeft = previous.x + bodyOffsetX;
      const previousBodyRight = previousBodyLeft + (body?.width ?? 0);
      this.creekBridgeBTraversalSide = previousBodyRight <= 335 ? 'west'
        : previousBodyLeft >= 410 ? 'east'
          : x > previous.x ? 'west' : 'east';
      this.progress.flags['l3-bridge-b-crossing-side'] = this.creekBridgeBTraversalSide;
      this.savePlayerCheckpoint();
    }
    if (this.progress.level === 3 && body && creekLaneOverlaps(y) && creekLaneOverlaps(previous.y)) {
      if (!this.progress.flags['l3-bridge-a-crossed'] && previous.x < 315 && x >= 315 && this.progress.flags['l3-latch-a']) {
        this.progress.flags['l3-bridge-a-crossed'] = true;
        this.save();
      }
      const reachedCreekFarBank = this.creekBridgeBTraversalSide === 'west' && bodyLeft >= 410;
      if (!this.progress.flags['l3-bridge-b-crossed'] && reachedCreekFarBank
        && (this.progress.flags['l3-bridge-b'] === true || this.progress.flags['l3-bridge-b-pending'] === true)) {
        this.progress.flags['l3-bridge-b-crossed'] = true;
        this.save();
      }
      const reachedCreekBank = this.creekBridgeBTraversalSide === 'west'
        ? bodyLeft >= 410 || bodyRight <= 335
        : this.creekBridgeBTraversalSide === 'east' && (bodyRight <= 335 || bodyLeft >= 410);
      if (reachedCreekBank) {
        this.creekBridgeBTraversalSide = null;
        this.creekBridgeBPendingRemoval = false;
        delete this.progress.flags['l3-bridge-b-crossing-side'];
        delete this.progress.flags['l3-bridge-b-pending'];
        this.save();
      }
    } else if (this.progress.level === 6) {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      const playerOnBridge = Boolean(body && Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
        new Phaser.Geom.Rectangle(270, 245, 100, 30),
      ));
      if (playerOnBridge && (this.isGardenBridgeReady() || this.gardenBridgeWasReady) && this.gardenTraversalSide === null) {
        const previousBodyTop = previous.y + bodyOffsetY;
        const previousBodyBottom = previousBodyTop + bodyHeight;
        this.gardenTraversalSide = previousBodyBottom <= 245 ? 'north'
          : previousBodyTop >= 275 ? 'south'
            : y > previous.y ? 'north' : 'south';
        this.progress.flags['l6-crossing-side'] = this.gardenTraversalSide;
        this.savePlayerCheckpoint();
      }
      const crossedToOtherBank = !playerOnBridge && (
        this.gardenTraversalSide === 'north' && this.player.y > 243
        || this.gardenTraversalSide === 'south' && this.player.y < 208
      );
      if (crossedToOtherBank && !this.progress.flags['l6-bridge-crossed']) {
        this.progress.flags['l6-bridge-crossed'] = true;
        this.save();
      }
      if (!playerOnBridge && (this.player.y < 208 || this.player.y > 243) && this.gardenTraversalSide !== null) {
        this.gardenTraversalSide = null;
        delete this.progress.flags['l6-crossing-side'];
        this.save();
      }
    }
    this.lastCampaignPlayerPosition = { x, y };
    if (this.progress.level === 3) this.creekBridgeBWasPassable = this.isCreekBridgeBOpen();
    if (this.progress.level === 6) this.gardenBridgeWasReady = this.isGardenBridgeReady();
  }

  private addProp(key: string, x: number, y: number, scale: number): void {
    const artTexture = this.resolveLevelPropTexture(key);
    const depth = this.progress.level === 0 && key === 'pedestal_empty' ? 3 : this.progress.level === 0 ? worldDepth(y) : 8 + Math.floor(y / 10);
    const image = this.add.image(x, y, artTexture ?? key).setScale(scale).setDepth(depth);
    if (this.progress.level === 0) image.setOrigin(0.5, 1);
    if (this.progress.level === 0 && key === 'beacon_stone') image.setData('forestEdgeId', 'tablet');
    if (this.progress.level === 0 && key === 'pedestal_empty') image.setData('forestEdgeId', 'standing-ring');
    if (this.progress.level === 0 && (key === 'woods_arch_locked' || key === 'woods_arch_open')) image.setData('forestEdgeId', 'gate');
    image.setInteractive({ useHandCursor: false });
    this.objects.push(image);
    if (key.startsWith('crystal_')) this.tweens.add({ targets: image, y: y - 4, duration: 900, yoyo: true, repeat: -1 });
  }

  private resolveLevelPropTexture(key: string): string | null {
    const level = this.progress.level;
    if (level === 0 && key === 'beacon_stone') {
      return getLevelArtKey(level, this.progress.flags['l0-footprints-found'] ? 'beacon-stone-illuminated' : 'beacon-stone-hidden');
    }
    if (level === 0 && key === 'pedestal_empty') return getLevelArtKey(level, 'stone-standing-ring');
    if (level === 0 && (key === 'woods_arch_locked' || key === 'woods_arch_open') && this.progress.flags['l0-gate-open']) return getLevelArtKey(1, 'woods_arch_open_passage');
    if (level === 1) {
      const rune = key.match(/^runestone_(moon|leaf|star)_(?:rev|lit)$/);
      if (rune) {
        const id = rune[1];
        const activated = this.progress.flags[`l1-activated-${id}`] === true;
        const revealed = this.progress.flags[`l1-seen-${id}`] === true || this.activeRevealedRunes.has(id);
        return getLevelArtKey(level, `runestone_${id}_${activated ? 'active' : revealed ? 'revealed' : 'sleeping'}`);
      }
      if (key === 'mural_tablet') return getLevelArtKey(level, 'poem_fragment');
      if ((key === 'woods_arch_locked' || key === 'woods_arch_open') && this.progress.flags['l1-open']) return getLevelArtKey(level, 'woods_arch_open_passage');
    }
    if (level === 2 && key === 'mural_tablet') return getLevelArtKey(level, 'tablet-body');
    if (level === 7 && key === 'guardian_statue') return getLevelArtKey(level, `statue-notch-${this.value('statue') % 4}`);
    return null;
  }

  private addLevelArt(
    filename: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    depth = 8 + Math.floor(y / 10),
  ): Phaser.GameObjects.Image | null {
    const key = getLevelArtKey(this.progress.level, filename);
    if (!key || !this.textures.exists(key)) return null;
    const image = this.add.image(x, y, key).setDepth(depth);
    if (this.progress.level === 0) image.setOrigin(0.5, 1);
    if (width !== undefined && height !== undefined) image.setDisplaySize(width, height);
    this.objects.push(image);
    return image;
  }

  private setLevelArtAt(x: number, y: number, filename: string): void {
    const key = getLevelArtKey(this.progress.level, filename);
    if (!key || !this.textures.exists(key)) return;
    const image = this.objects.find((object): object is Phaser.GameObjects.Image =>
      object instanceof Phaser.GameObjects.Image
      && object.texture.key.startsWith('art_')
      && Math.abs(object.x - x) < 0.1
      && Math.abs(object.y - y) < 0.1,
    );
    if (image && image.texture.key !== key) image.setTexture(key);
  }

  private refreshCampaignArtVisuals(level: number): void {
    if (level === 0 || level === 1) {
      const gateOpen = level === 0 ? this.progress.flags['l0-gate-open'] === true : this.progress.flags['l1-open'] === true;
      const gateY = level === 0 ? FOREST_EDGE.objects.gate.anchor.y : 70;
      const gateX = level === 0 ? FOREST_EDGE.objects.gate.anchor.x : 320;
      const openArt = getLevelArtKey(level === 0 ? 1 : level, 'woods_arch_open_passage');
      const gate = this.objects.find((object): object is Phaser.GameObjects.Image =>
        object instanceof Phaser.GameObjects.Image
        && Math.abs(object.x - gateX) < 0.1
        && Math.abs(object.y - gateY) < 0.1
        && (object.texture.key === 'woods_arch_locked'
          || object.texture.key === 'woods_arch_open'
          || object.texture.key.includes('woods_arch_open_passage')),
      );
      if (gate) {
        const texture = gateOpen && openArt && this.textures.exists(openArt) ? openArt : gateOpen ? 'woods_arch_open' : 'woods_arch_locked';
        if (gate.texture.key !== texture) gate.setTexture(texture);
        if (level === 0) gate.setData('forestEdgeId', 'gate');
      }
    }
    if (level === 0) {
      const tablet = this.objects.find((object) => object.getData('forestEdgeId') === 'tablet');
      const tabletKey = getLevelArtKey(0, this.progress.lanternOn ? 'beacon-stone-illuminated' : 'beacon-stone-hidden');
      if (tablet instanceof Phaser.GameObjects.Image && tabletKey && this.textures.exists(tabletKey) && tablet.texture.key !== tabletKey) tablet.setTexture(tabletKey);
      this.setForestEdgeArt('sun-eye', this.progress.flags['l0-gate-open'] ? 'sun-eye-full' : this.forestEdgeChargeMs > 0 ? 'sun-eye-receiving' : 'sun-eye-dormant');
    } else if (level === 2) {
      this.setLevelArtAt(548, 194, this.progress.flags['l2-memory'] ? 'room-well-open' : 'room-well-closed');
    } else if (level === 6) {
      this.setLevelArtAt(320, 236, this.progress.flags['l6-canopy-shut'] ? 'reservoir-shutter-closed-overlay' : 'reservoir-open');
      this.setLevelArtAt(480, 178, this.progress.flags['l6-water-flowing'] ? 'nursery-water-delivered' : 'nursery-drain-closed');
    } else if (level === 7) {
      this.setLevelArtAt(320, 170, `statue-notch-${this.value('statue') % 4}`);
    } else if (level === 9) {
      for (const [name, x] of [['memory', 190], ['hope', 320], ['balance', 450]] as const) {
        this.setLevelArtAt(x, 260, `${name}-alcove-${this.progress.flags[`l9-${name}`] ? 'inserted' : 'empty'}`);
      }
      const core = this.progress.flags['l9-roots'] ? 'core-latched' : this.progress.flags['l9-overload'] ? 'core-ready' : 'core-night';
      this.setLevelArtAt(320, 154, core);
    }
  }

  private setForestEdgeArt(id: string, filename: string): void {
    const key = getLevelArtKey(0, filename);
    if (!key || !this.textures.exists(key)) return;
    const image = this.objects.find((object) => object.getData('forestEdgeId') === id);
    if (image instanceof Phaser.GameObjects.Image && image.texture.key !== key) image.setTexture(key);
  }

  private revealForestEdgeFootprints(): void {
    FOREST_EDGE.objects.trail.forEach((point, index) => {
      if (this.objects.some((object) => object.getData('forestEdgeId') === `footprint-${index}`)) return;
      const stamp = this.addLevelArt('footprints-pulse', point.x, point.y, 20, 28, 4);
      stamp?.setAlpha(0.8).setData('forestEdgeId', `footprint-${index}`);
    });
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

  private refreshCampaignPuzzleVisuals(): void {
    const level = this.progress.level;
    this.refreshCampaignArtVisuals(level);
    if (![0, 3, 4, 5, 6, 7, 9].includes(level)) return;
    if (!this.campaignBeamGraphics || !this.campaignBeamGraphics.active) {
      this.campaignBeamGraphics = this.add.graphics().setDepth(6);
      this.track(this.campaignBeamGraphics);
    }
    const graphics = this.campaignBeamGraphics;
    graphics.clear();
    const line = (points: Array<[number, number]>, active: boolean): void => {
      graphics.lineStyle(3, active ? 0xffdf83 : 0x52636a, active ? 0.9 : 0.32);
      graphics.beginPath();
      graphics.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) graphics.lineTo(x, y);
      graphics.strokePath();
    };
    if (level === 0) {
      graphics.clear();
      if (this.forestEdgeChargeMs > 0) {
        const t = Math.min(1, this.forestEdgeChargeMs / FOREST_EDGE.chargeMs);
        graphics.lineStyle(2 + t, 0xffe680, 0.35 + t * 0.55);
        graphics.beginPath(); graphics.moveTo(this.player.x + 6, this.player.y + 2); graphics.lineTo(FOREST_EDGE.objects.eye.anchor.x, FOREST_EDGE.objects.eye.anchor.y - 8); graphics.strokePath();
        graphics.fillStyle(0xffe680, 0.25 + t * 0.45); graphics.fillCircle(FOREST_EDGE.objects.eye.anchor.x, FOREST_EDGE.objects.eye.anchor.y - 8, 3 + t * 4);
      }
      return;
    }
    const light = this.lantern.lanternPlaced && this.lantern.lanternOn;
    if (level === 3) {
      const a = light && this.value('g1') === 2 && this.value('g2') === 1;
      const b = light && this.progress.flags['l3-bridge-a-crossed'] === true && this.value('g2') === 3 && this.value('g3') === 2;
      const bridgeA = (this.progress.flags['l3-bridge-a'] === true && this.isCreekBridgeAReady()) || this.progress.flags['l3-latch-a'] === true;
      const bridgeB = this.isCreekBridgeBOpen() || this.creekBridgeBPendingRemoval;
      line([[120, 205], [180, 165], [220, 120], [220, 180]], a);
      line([[220, 120], [345, 236], [325, 243]], b);
      graphics.fillStyle(bridgeA ? 0xffdf83 : 0x38505a, bridgeA ? 0.85 : 0.35); graphics.fillRect(245, 230, 70, 12);
      graphics.fillStyle(bridgeB ? 0xffdf83 : 0x38505a, bridgeB ? 0.85 : 0.35); graphics.fillRect(335, 230, 75, 12);
    } else if (level === 4) {
      graphics.lineStyle(5, 0x8b8d76, 0.78);
      graphics.lineBetween(295, 80, 295, 280); graphics.lineBetween(440, 80, 440, 280);
      graphics.lineStyle(3, this.progress.flags['l4-latch-a'] ? 0x83d6a2 : 0xffdf83, 0.85); graphics.lineBetween(295, 150, 295, 195);
      graphics.lineStyle(3, this.progress.flags['l4-latch-b'] ? 0x83d6a2 : 0xffdf83, 0.85); graphics.lineBetween(440, 155, 440, 200);
      graphics.lineStyle(2, this.lantern.lanternOn ? 0x8b8d76 : 0x88e4d4, this.lantern.lanternOn ? 0.22 : 0.85);
      graphics.beginPath(); graphics.moveTo(300, 230); graphics.lineTo(350, 230); graphics.lineTo(385, 245); graphics.lineTo(435, 245); graphics.strokePath();
      if (!this.lantern.lanternOn) {
        graphics.lineStyle(3, 0x88e4d4, 0.9);
        graphics.beginPath(); graphics.moveTo(350, 230); graphics.lineTo(385, 245); graphics.lineTo(430, 245); graphics.lineTo(475, 265); graphics.strokePath();
        graphics.fillStyle(0x88e4d4, 0.82);
        for (const [x, y] of [[350, 230], [385, 245], [430, 245], [475, 265]] as Array<[number, number]>) graphics.fillCircle(x, y, 3);
      }
      for (const [mark, x, y] of [['a', 220, 130], ['b', 420, 130], ['c', 320, 218]] as Array<[string, number, number]>) {
        const arrived = this.progress.flags[`l4-at-${mark}`] === true;
        graphics.fillStyle(arrived ? 0xffdf83 : 0x52636a, arrived ? 0.9 : 0.35); graphics.fillCircle(x, y, 7);
      }
      if (this.progress.flags['l4-latch-c']) { graphics.lineStyle(3, 0x83d6a2, 0.85); graphics.lineBetween(430, 275, 500, 275); }
    } else if (level === 5) {
      const common = light && this.value('tower-g0') === 2;
      const a = common && this.value('tower-g1') === 1;
      const b = common && this.value('tower-g2') === 3;
      const c = this.progress.flags['l5-called-high'] === true && Math.hypot(this.lumo.sprite.x - 320, this.lumo.sprite.y - 80) < 36;
      line([[120, 205], [160, 170]], light);
      line([[160, 170], [250, 170], [470, 145]], a);
      line([[160, 170], [250, 170], [350, 170], [470, 205]], b);
      graphics.fillStyle(c ? 0xffdf83 : 0x52636a, c ? 0.9 : 0.32); graphics.fillCircle(320, 80, 9);
      if (this.progress.flags['l5-water-returned']) {
        graphics.lineStyle(3, 0x57cbe0, 0.85); graphics.beginPath(); graphics.moveTo(575, 100); graphics.lineTo(575, 280); graphics.strokePath();
      }
    } else if (level === 6) {
      graphics.fillStyle(this.progress.flags['l6-canopy-shut'] ? 0x243645 : 0xffefad, this.progress.flags['l6-canopy-shut'] ? 0.8 : 0.35); graphics.fillRoundedRect(295, 62, 50, 16, 5);
      graphics.fillStyle(this.progress.flags['l6-sun-open'] ? 0xffdf83 : 0x52636a, this.progress.flags['l6-sun-open'] ? 0.9 : 0.32); graphics.fillCircle(220, 160, 18);
      const gardenBridge = this.isGardenBridgeReady() || this.gardenBridgePendingRemoval;
      graphics.fillStyle(gardenBridge ? 0x99c8ed : 0x52636a, gardenBridge ? 0.88 : 0.5); graphics.fillRect(270, 253, 100, 14);
      const returnPathOpen = this.progress.flags['l6-return-latched'] === true;
      graphics.fillStyle(returnPathOpen ? 0x83d6a2 : 0x52636a, returnPathOpen ? 0.9 : 0.42);
      graphics.fillRect(460, 253, 60, 14);
      if (returnPathOpen) {
        graphics.lineStyle(2, 0xc8e8ce, 0.9);
        graphics.lineBetween(468, 256, 468, 264);
        graphics.lineBetween(484, 256, 484, 264);
        graphics.lineBetween(500, 256, 500, 264);
        graphics.lineBetween(516, 256, 516, 264);
      }
      if (this.progress.flags['l6-water-flowing']) { graphics.lineStyle(4, 0x57cbe0, 0.8); graphics.beginPath(); graphics.moveTo(320, 95); graphics.lineTo(320, 275); graphics.strokePath(); }
      if (returnPathOpen) { graphics.fillStyle(0x83d6a2, 0.8); graphics.fillRoundedRect(465, 192, 30, 8, 3); }
      if (this.progress.flags['l6-water-flowing']) {
        graphics.lineStyle(3, 0x83d6a2, 0.95); graphics.beginPath(); graphics.moveTo(450, 175); graphics.lineTo(450, 145); graphics.strokePath();
        graphics.fillStyle(0xa3e29e, 0.95); graphics.fillEllipse(440, 151, 16, 8); graphics.fillEllipse(460, 158, 16, 8);
      } else {
        graphics.fillStyle(0x6e855c, 0.7); graphics.fillEllipse(450, 175, 16, 7);
      }
    } else if (level === 7) {
      const left = this.isRuinsOuterBeamReady('left');
      const right = this.isRuinsOuterBeamReady('right');
      line([[120, 205], [320, 170], [200, 126]], left);
      line([[120, 205], [320, 170], [440, 126]], right);
      graphics.fillStyle(this.value('statue') === 2 ? 0x283743 : 0xffdf83, this.value('statue') === 2 ? 0.88 : 0.2);
      graphics.fillEllipse(320, 221, 42, 18);
      graphics.fillStyle(left && right ? 0xffdf83 : 0x52636a, left && right ? 0.95 : 0.4);
      graphics.fillCircle(200, 126, 8); graphics.fillCircle(440, 126, 8);
    } else {
      const memory = light && this.value('heart-memory') === 1;
      const balance = light && this.value('heart-balance') === 2;
      const lumo = this.progress.flags['l9-called-heart'] === true && Math.hypot(this.lumo.sprite.x - 320, this.lumo.sprite.y - 125) < 36;
      line([[100, 205], [320, 200]], light);
      line([[320, 200], [220, 220], [180, 145]], memory);
      line([[320, 200], [420, 220], [460, 145]], balance);
      graphics.fillStyle(this.value('heart-statue') === 2 ? 0x283743 : 0xffdf83, this.value('heart-statue') === 2 ? 0.88 : 0.2); graphics.fillEllipse(320, 125, 42, 18);
      graphics.fillStyle(lumo ? 0xffdf83 : 0x52636a, lumo ? 0.9 : 0.35); graphics.fillCircle(320, 125, 7);
      graphics.fillStyle(this.progress.flags['l9-roots'] ? 0x83d6a2 : 0x52636a, this.progress.flags['l9-roots'] ? 0.85 : 0.3); graphics.fillRoundedRect(270, 152, 100, 9, 4);
    }
  }

  private isRuinsOuterBeamReady(side: 'left' | 'right'): boolean {
    const mirrorReady = side === 'left' ? this.value('ruins-left') === 2 : this.value('ruins-right') === 1;
    return this.lantern.lanternPlaced && this.lantern.lanternOn && mirrorReady;
  }
  private value(key: string): number { return this.progress.counters[key] ?? 0; }
  private savePlayerCheckpoint(): void {
    this.progress.counters['player-level'] = this.progress.level;
    this.progress.counters['player-x'] = this.player.x;
    this.progress.counters['player-y'] = this.player.y;
    this.save();
  }
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
      const position = this.getRunePositions()[id];
      const image = this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && Math.abs(object.x - position.x) < 0.1 && Math.abs(object.y - position.y) < 0.1);
      const active = this.progress.flags[`l1-activated-${id}`] === true;
      const revealed = active || this.activeRevealedRunes.has(id) || this.progress.flags[`l1-seen-${id}`] === true;
      const art = getLevelArtKey(1, `runestone_${id}_${active ? 'active' : revealed ? 'revealed' : 'sleeping'}`);
      if (image) image.setTexture(art && this.textures.exists(art) ? art : `runestone_${id}_${revealed ? 'lit' : 'rev'}`);
    }
    const practice = this.objects.find((object): object is Phaser.GameObjects.Image => object instanceof Phaser.GameObjects.Image && Math.abs(object.x - 80) < 0.1 && Math.abs(object.y - 265) < 0.1);
    const practiceActive = this.progress.flags['l1-practice-complete'] === true;
    const practiceRevealed = practiceActive || this.activeRevealedRunes.has('practice-leaf') || this.progress.flags['l1-seen-practice-leaf'] === true;
    const practiceArt = getLevelArtKey(1, `runestone_leaf_${practiceActive ? 'active' : practiceRevealed ? 'revealed' : 'sleeping'}`);
    if (practice) practice.setTexture(practiceArt && this.textures.exists(practiceArt) ? practiceArt : `runestone_leaf_${practiceRevealed ? 'lit' : 'rev'}`);
  }

  private showRuneJournal(): void {
    if (this.progress.level !== 1) return;
    const discovered: string[] = (['moon', 'leaf', 'star'] as const).filter((id) => this.progress.flags[`l1-seen-${id}`]);
    const labels: Record<string, string> = { moon: 'Trăng — bia bên trái', leaf: 'Lá — bia ở giữa phía trên', star: 'Sao — bia bên phải' };
    if (this.progress.flags['l1-seen-practice-leaf']) labels['practice-leaf'] = 'Lá — bia tập bên lối vào';
    if (this.progress.flags['l1-seen-practice-leaf']) discovered.push('practice-leaf');
    const notes = discovered.length ? `Các dấu đã ghi:\n${discovered.map((id) => `• ${labels[id]}`).join('\n')}` : 'Sổ tay chưa ghi cổ tự nào.';
    const poem = this.progress.flags['l1-poem-read'] ? '\n\nBài thơ bên cổng: “Trăng, Lá, rồi Sao.”' : '';
    const text = discovered.length || this.progress.flags['l1-poem-read']
      ? `${notes}${poem}`
      : 'Sổ tay chưa ghi cổ tự nào. Dùng SPACE để Pulse gần các bia đá.';
    this.say([{ speaker: 'Nhinh', text: `Sổ tay của mình.\n${text}` }]);
  }

  private showOpeningJournal(): void {
    const notes = [
      this.progress.lanternPickedUp ? 'Dòng khắc trên đèn: “Hãy giữ ánh sáng cho đến khi mọi người trở về.”' : '',
      this.progress.flags['l0-tablet-read'] ? 'Bia đá nhắc rằng ánh sáng đánh thức điều mắt thường bỏ quên.' : '',
      this.progress.flags['l0-footprints-found'] ? 'Dấu chân hiện lên sau Light Pulse và dẫn tới vòng đá.' : '',
      this.progress.flags['l0-gate-open'] ? 'Mắt đá giữ cổng mở sau khi nhận ánh sáng.' : '',
    ].filter(Boolean);
    this.say([{ speaker: 'Nhinh', text: notes.length ? `Sổ tay của mình.\n${notes.join('\n')}` : 'Sổ tay còn trống.' }]);
  }

  private getForestEdgeStep(): 'wake' | 'pickup' | 'light' | 'tablet' | 'pulse' | 'ring' | 'exit' {
    if (this.progress.flags['l0-gate-open']) return 'exit';
    if (!this.progress.flags['l0-lumo-met']) return 'wake';
    if (!this.progress.lanternPickedUp) return 'pickup';
    if (!this.lantern.lanternOn && !this.progress.flags['l0-tablet-read']) return 'light';
    if (!this.progress.flags['l0-tablet-read']) return 'tablet';
    if (!this.progress.flags['l0-footprints-found']) return 'pulse';
    return 'ring';
  }

  private drawFireflyRoute(): void {
    const route = this.add.graphics().setDepth(3);
    route.lineStyle(1, 0xffe680, 0.22);
    route.beginPath(); route.moveTo(180, 204); route.lineTo(320, 125); route.lineTo(460, 204); route.strokePath();
    this.track(route);
    for (let index = 0; index < 3; index += 1) {
      const firefly = this.add.circle([180, 320, 460][index], [204, 125, 204][index], 3, 0xffe680, 0.9).setDepth(6);
      this.tweens.add({ targets: firefly, alpha: 0.25, scale: 1.7, duration: 650, yoyo: true, repeat: -1, delay: index * 220 });
      this.track(firefly);
    }
  }

  private showHint(): void {
    if (this.progress.level === 0) {
      const step = this.getForestEdgeStep();
      if (this.forestEdgeHintStep !== step) { this.forestEdgeHintStep = step; this.hintIndex = 0; }
      const hints: Record<string, string[]> = {
        wake: ['Nhìn kỹ khu đất trước mặt.', 'Một chiếc đèn cũ nằm cạnh bia đá.', 'Đến gần chiếc đèn để xem ai đang ở bên trong.'],
        pickup: ['Quan sát chiếc đèn cạnh bia đá.', 'Có lẽ Lumo muốn Nhinh nhấc chiếc đèn lên.', 'Đứng cạnh đèn và nhấn E.'],
        light: ['Chiếc đèn đang ở trong tay Nhinh.', 'Dòng chữ trên quai nhắc đến ánh sáng.', 'Bật đèn bằng F.'],
        tablet: ['Bia đá đứng ngay cạnh chiếc đèn.', 'Ánh đèn sẽ làm hiện chữ trên bia.', 'Đứng cạnh bia và nhấn E khi đèn đang bật.'],
        pulse: ['Những dấu chân có thể ẩn dưới lớp sương.', this.lantern.lanternOn ? 'Dòng khắc bảo rằng ánh sáng đánh thức điều bị bỏ quên.' : 'Bật đèn bằng F trước khi dùng Pulse.', this.lantern.lanternOn ? 'Dùng SPACE để Pulse gần lối mòn.' : 'Giữ đèn bật bằng F, rồi nhấn SPACE gần lối mòn.'],
        ring: ['Nhìn phần đất ngay trước cổng. Những dấu chân dừng ở đâu?', 'Mắt đá cần ánh sáng từ một người đứng đúng vị trí.', 'Dùng Pulse tìm vòng đá, đứng vào vòng rồi bật đèn bằng F.'],
        exit: ['Cổng đã mở. Hãy bước tới lối đi.', 'Lối đi nằm giữa hai trụ cổng.', 'Đến cổng và nhấn E để đi tiếp.'],
      };
      const stageHints = hints[step];
      const message = stageHints[Math.min(this.hintIndex, stageHints.length - 1)];
      this.hintIndex = Math.min(this.hintIndex + 1, stageHints.length - 1);
      this.say([{ speaker: 'Hệ thống', text: message }]);
      return;
    }
    const hints = this.progress.level === 9 && this.progress.flags['l9-roots']
      ? (this.progress.flags['l9-overload'] ? ['Tắt đèn bằng F để giải phóng nguồn sáng đang quá tải.'] : ['Nhận lại đèn ở bệ dẫn sáng để đưa nguồn sáng trở về tay Nhinh.', 'Khi ánh sáng dâng quá ngưỡng, nhấn F để tắt đèn và khép vòng.'])
      : CAMPAIGN_LEVELS[this.progress.level].hint;
    const message = hints[Math.min(this.hintIndex, hints.length - 1)];
    this.hintIndex = Math.min(this.hintIndex + 1, hints.length - 1);
    this.say([{ speaker: 'Hệ thống', text: message }]);
  }

  private refreshHud(): void {
    const level = CAMPAIGN_LEVELS[this.progress.level];
    if (this.progress.level === 0) {
      const step = this.getForestEdgeStep();
      if (step !== this.forestEdgeHintStep) { this.forestEdgeHintStep = step; this.hintIndex = 0; }
      const objective: Record<string, string> = {
        wake: 'Tới gần chiếc đèn cũ và bia đá.', pickup: 'Gặp Lumo rồi nhận chiếc đèn bằng E.', light: 'Bật đèn bằng F để đọc bia đá.',
        tablet: 'Đứng cạnh bia và đọc dòng chữ.', pulse: 'Bật đèn rồi dùng SPACE để tìm dấu chân.',
        ring: 'Đứng trong vòng đá và giữ đèn bật.', exit: 'Cổng đã mở. Đi tới lối đi và nhấn E.',
      };
      if (this.objectiveText) this.objectiveText.setText(objective[step]);
      if (this.controlsText) this.controlsText.setText(`WASD Move    E Interact${this.progress.lanternPickedUp ? '    F Lantern' : ''}${this.progress.flags['l0-tablet-read'] ? '    SPACE Pulse' : ''}    J Journal    H Hint    ESC Pause`);
    }
    if (this.titleText) this.titleText.setText(this.progress.level === 8 && this.activeObservatoryRoom
      ? `09  ${OBSERVATORY_ROOMS[this.activeObservatoryRoom].title}   ·   ${level.chapter}`
      : `${String(this.progress.level + 1).padStart(2, '0')}  ${level.title}   ·   ${level.chapter}`);
    if (this.statusText) {
      const levelIndex = this.progress.level;
      const state = levelIndex === 0 ? `Bia: ${this.progress.flags['l0-tablet-read'] ? 'đã đọc' : 'chưa đọc'} · Dấu chân: ${this.progress.flags['l0-footprints-found'] ? 'đã thấy' : 'chưa thấy'} · Cổng: ${this.progress.flags['l0-gate-open'] ? 'mở' : 'đóng'}`
        : levelIndex === 1 ? `Cổ tự: ${this.value('rune-sequence')}/3 · Bia tập: ${this.progress.flags['l1-practice-complete'] ? 'đã thử' : 'SPACE soi rồi E chạm'} · J sổ tay`
        : levelIndex === 2 ? `Phiến: ${this.value('memory-slots') ?? 0}/4 · Hai lớp: ${['bird', 'leaf', 'boat', 'seed'].filter((s) => this.progress.flags[`l2-${s}-lit`] && this.progress.flags[`l2-${s}-dark`]).length}/4 · Tranh sau vách: ${this.progress.flags['l2-fifth-viewed'] ? 'đã xem' : 'chưa xem'}`
        : levelIndex === 3 ? `Cầu: ${Number(Boolean(this.progress.flags['l3-latch-a'])) + Number(Boolean(this.progress.flags['l3-latch-b']))}/2 · G1 ${this.value('g1')} / G2 ${this.value('g2')} / G3 ${this.value('g3')}`
        : levelIndex === 4 ? `Cửa: ${Number(Boolean(this.progress.flags['l4-latch-a'])) + Number(Boolean(this.progress.flags['l4-latch-b'])) + Number(Boolean(this.progress.flags['l4-latch-c']))}/3 · Lumo: ${this.progress.flags['l4-reunited'] ? 'đã trở lại' : 'theo mốc'}`
        : levelIndex === 5 ? `Nhánh A/B: ${this.value('tower-g1') === 1 && this.value('tower-g0') === 2 && this.lantern.lanternOn ? 'A sáng' : 'A tắt'} / ${this.value('tower-g2') === 3 && this.value('tower-g0') === 2 && this.lantern.lanternOn ? 'B sáng' : 'B tắt'} · Nước: ${this.progress.flags['l5-water-returned'] ? 'đã trả' : 'đang bị hút'}`
        : levelIndex === 6 ? `Màn che: ${this.progress.flags['l6-canopy-shut'] ? 'đóng' : 'mở'} · Cầu rễ: ${this.progress.flags['l6-bridge-crossed'] ? 'đã qua' : 'chưa qua'} · Nước: ${this.progress.flags['l6-water-flowing'] ? 'đã chảy' : 'chưa chảy'}`
        : levelIndex === 7 ? `Mắt: ${Number(this.isRuinsOuterBeamReady('left')) + Number(this.isRuinsOuterBeamReady('right'))}/2 · Bóng giữa: ${this.value('statue') === 2 ? 'đúng' : 'chưa đúng'} · Điện thờ: ${this.progress.flags['l7-solved'] ? 'mở' : 'khóa'}`
        : levelIndex === 9 ? `Tinh thể: ${['memory', 'hope', 'balance'].filter((s) => this.progress.flags[`l9-${s}`]).length}/3 · Nhánh: ${Number(this.value('heart-memory') === 1) + Number(this.value('heart-balance') === 2)}/2 · Lumo: ${this.progress.flags['l9-at-heart'] ? 'đang tới ấn' : 'chưa gọi'}`
        : `Đèn: ${this.lantern.lanternOn ? 'BẬT' : 'TẮT'} · Lumo: đang đi cùng`;
      this.statusText.setText(state);
    }
    if (this.lumoStatusText) this.lumoStatusText.setText(this.progress.level === 4
      ? (this.progress.flags['l4-reunited'] ? 'LUMO · đã trở lại' : 'LUMO · E gọi tới mốc / trở về')
      : this.progress.level >= 5 && this.progress.level !== 8 ? 'LUMO · E gọi tới ấn' : 'NHINH + LUMO');
  }
}
