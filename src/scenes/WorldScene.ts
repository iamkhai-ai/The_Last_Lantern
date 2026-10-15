import Phaser from 'phaser';
import { Lumo } from '../actors/Lumo';
import { Player } from '../actors/Player';
import { DIALOGUE_DATA } from '../data/dialogue';
import { getLumoHint, ZONE_SUBTITLES_VI } from '../data/quests';
import { CreekMirrorPuzzle } from '../puzzles/CreekMirrorPuzzle';
import { RuinsBalancePuzzle } from '../puzzles/RuinsBalancePuzzle';
import { WoodsRunePuzzle } from '../puzzles/WoodsRunePuzzle';
import { DialogueSystem } from '../systems/DialogueSystem';
import { EffectsSystem } from '../systems/EffectsSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LanternSystem } from '../systems/LanternSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { GameProgress, ZoneId } from '../types/gameTypes';
import { HUD } from '../ui/HUD';
import { PauseMenu } from '../ui/PauseMenu';
import { WorldFactory } from '../world/WorldFactory';
import { ZONE_DEFINITIONS } from '../world/zoneDefinitions';

export class WorldScene extends Phaser.Scene {
  public questSystem!: QuestSystem;
  public player!: Player;
  public lumo!: Lumo;
  public lanternSystem!: LanternSystem;
  public interactionSystem!: InteractionSystem;
  public dialogueSystem!: DialogueSystem;
  public effectsSystem!: EffectsSystem;
  public hud!: HUD;
  public pauseMenu!: PauseMenu;

  public woodsPuzzle?: WoodsRunePuzzle;
  public creekPuzzle?: CreekMirrorPuzzle;
  public ruinsPuzzle?: RuinsBalancePuzzle;

  private heartTreeSprite?: Phaser.GameObjects.Sprite;
  private canopySprite?: Phaser.GameObjects.Image;
  private treeSprites: Phaser.GameObjects.Image[] = [];
  private bushSprites: Phaser.GameObjects.Image[] = [];
  private waterTiles: Phaser.GameObjects.TileSprite[] = [];
  private waterAnimTimer = 0;
  private waterAnimStep = 0;
  private introBeaconSprite?: Phaser.GameObjects.Sprite;
  private introFootprints: Phaser.GameObjects.Image[] = [];
  private overloadBanner?: Phaser.GameObjects.Text;
  private dawnTransitionTriggered = false;
  private zoneEnteredDialogueShown: Record<ZoneId, boolean> = {
    hub: false,
    woods: false,
    creek: false,
    ruins: false,
  };

  constructor() {
    super({ key: 'WorldScene' });
  }

  public create(data?: { progress?: GameProgress; fromZone?: ZoneId }): void {
    const initialProgress = data?.progress ?? SaveSystem.load();
    this.questSystem = new QuestSystem(initialProgress);
    this.dawnTransitionTriggered = false;

    const zoneId = this.questSystem.progress.currentZone;
    const isDawn = this.questSystem.progress.stage === 'victory';
    const crystalCount = this.questSystem.getCrystalCount();

    const built = WorldFactory.buildZone(this, zoneId, crystalCount, isDawn);
    this.heartTreeSprite = built.heartTreeSprite;
    this.canopySprite = built.canopySprite;
    this.introFootprints = built.introFootprints;
    this.treeSprites = built.treeSprites;
    this.bushSprites = built.bushSprites;
    this.waterTiles = built.waterTiles;
    this.waterAnimTimer = 0;
    this.waterAnimStep = 0;

    const zoneDef = ZONE_DEFINITIONS[zoneId];
    const fromKey = data?.fromZone ?? 'default';
    let spawn = zoneDef.spawns[fromKey] ?? zoneDef.spawns.default;
    if (zoneId === 'hub' && this.questSystem.progress.stage === 'intro' && !data?.fromZone) {
      spawn = { x: 225, y: 298 };
    }

    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player.sprite, built.colliders);

    this.lumo = new Lumo(this, spawn.x + 18, spawn.y - 14);
    if (
      this.questSystem.progress.stage === 'intro' &&
      !this.questSystem.progress.lanternPickedUp
    ) {
      this.lumo.setVisible(false);
    }

    this.effectsSystem = new EffectsSystem(this);
    this.effectsSystem.setupZoneEffects(zoneId, isDawn);

    this.lanternSystem = new LanternSystem(this);
    this.lanternSystem.lanternInHand =
      this.questSystem.progress.stage !== 'intro' ||
      Boolean(this.questSystem.progress.lanternPickedUp);
    this.lanternSystem.lanternOn = this.questSystem.progress.lanternOn;
    this.lanternSystem.isDawnMode = isDawn;

    this.interactionSystem = new InteractionSystem(this);
    this.dialogueSystem = new DialogueSystem(this);
    this.hud = new HUD(this);

    this.pauseMenu = new PauseMenu(this, {
      onResume: () => {},
      onRestart: () => {
        SaveSystem.clear();
        const fresh = SaveSystem.createDefaultProgress();
        SaveSystem.save(fresh);
        this.scene.restart({ progress: fresh });
      },
      onMainMenu: () => {
        this.scene.start('MenuScene');
      },
    });

    this.setupZoneContent(zoneId, built.bridgeBlocker);
    this.bindInputs();

    this.hud.showToast(ZONE_SUBTITLES_VI[zoneId], 2200);
    this.handleInitialZoneEvents(zoneId);
  }

  private setupZoneContent(
    zoneId: ZoneId,
    bridgeBlocker?: Phaser.GameObjects.Zone
  ): void {
    this.woodsPuzzle = undefined;
    this.creekPuzzle = undefined;
    this.ruinsPuzzle = undefined;

    const zoneDef = ZONE_DEFINITIONS[zoneId];

    for (const portal of zoneDef.portals) {
      const marker = this.add.image(portal.x, portal.y, 'particle_firefly');
      marker.setDepth(14);
      marker.setScale(1.3);
      marker.setTint(0x7df2d4);

      this.interactionSystem.register({
        id: portal.id,
        x: portal.x,
        y: portal.y,
        radius: 46,
        getPrompt: () => portal.label,
        onInteract: () => this.tryTransitionZone(portal.targetZone),
      });
    }

    if (zoneId === 'hub') {
      this.setupHubInteractions();
    } else if (zoneId === 'woods') {
      this.woodsPuzzle = new WoodsRunePuzzle(
        this,
        this.questSystem,
        this.interactionSystem,
        this.lanternSystem,
        this.dialogueSystem,
        this.effectsSystem,
        this.hud
      );
    } else if (zoneId === 'creek') {
      const disableBridgeBlocker = () => {
        if (bridgeBlocker && bridgeBlocker.body) {
          (bridgeBlocker.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        }
      };
      this.creekPuzzle = new CreekMirrorPuzzle(
        this,
        this.questSystem,
        this.interactionSystem,
        this.lanternSystem,
        this.dialogueSystem,
        this.effectsSystem,
        this.hud,
        disableBridgeBlocker
      );
    } else if (zoneId === 'ruins') {
      this.ruinsPuzzle = new RuinsBalancePuzzle(
        this,
        this.questSystem,
        this.interactionSystem,
        this.lanternSystem,
        this.dialogueSystem,
        this.effectsSystem,
        this.hud
      );
    }
  }

  private setupHubInteractions(): void {
    this.introBeaconSprite = this.add.sprite(235, 262, 'beacon_stone');
    this.introBeaconSprite.setDepth(15);

    this.interactionSystem.register({
      id: 'intro_beacon',
      x: 235,
      y: 268,
      radius: 48,
      getPrompt: () =>
        this.questSystem.progress.stage === 'intro' &&
        !this.questSystem.progress.lanternPickedUp
          ? '[E] Kiểm tra bia đá cổ & nhặt đèn lồng'
          : '[E] Xem bia đá dẫn đường của Lumo',
      onInteract: () => {
        if (
          this.questSystem.progress.stage === 'intro' &&
          !this.questSystem.progress.lanternPickedUp
        ) {
          this.questSystem.progress.lanternPickedUp = true;
          this.lanternSystem.lanternInHand = true;
          this.lumo.setVisible(true);
          this.effectsSystem.spawnBurst(235, 256, 0xffe680, 14);
          this.questSystem.save();
          this.dialogueSystem.startDialogue(DIALOGUE_DATA.intro_meet_lumo, () => {
            this.hud.showToast('Nhấn phím [F] để thắp sáng chiếc đèn lồng!');
          });
        } else {
          this.hud.showToast(
            getLumoHint(this.questSystem.progress, this.lanternSystem.lanternPlaced),
            3000
          );
        }
      },
    });

    this.lanternSystem.onPulse(() => {
      for (const fp of this.introFootprints) {
        fp.setVisible(true);
      }
      this.time.delayedCall(5000, () => {
        for (const fp of this.introFootprints) {
          if (fp && fp.scene) fp.setVisible(false);
        }
      });

      if (
        this.questSystem.progress.stage === 'intro' &&
        this.questSystem.progress.lanternOn &&
        !this.questSystem.progress.tutorialPulseDone
      ) {
        this.questSystem.progress.tutorialPulseDone = true;
        this.questSystem.save();
        this.hud.showToast(
          'Dấu chân cổ xưa đã hiện lên! Hãy đi theo lối mòn tới gốc Cây Mẹ và nhấn [E].',
          3200
        );
      }
    });

    this.interactionSystem.register({
      id: 'heart_tree_interact',
      x: 315,
      y: 178,
      radius: 56,
      isEnabled: () => this.questSystem.progress.stage !== 'finale_overload',
      getPrompt: () => {
        const count = this.questSystem.getCrystalCount();
        if (this.questSystem.isReadyForFinale()) {
          return '[E] Đặt đủ 3 Tinh thể vào Cây Mẹ (Khôi phục Bình Minh)';
        }
        return `[E] Tương tác với Cây Mẹ (${count}/3 Tinh thể)`;
      },
      onInteract: () => this.handleHeartTreeInteract(),
    });
  }

  private setCanopyTexture(key: string): void {
    if (this.canopySprite && this.textures.exists(key)) {
      this.canopySprite.setTexture(key);
    }
  }

  private handleHeartTreeInteract(): void {
    const prog = this.questSystem.progress;
    const count = this.questSystem.getCrystalCount();

    if (prog.stage === 'intro') {
      if (!prog.lanternPickedUp) {
        this.questSystem.progress.lanternPickedUp = true;
        this.lanternSystem.lanternInHand = true;
        this.lumo.setVisible(true);
      }
      if (!prog.lanternOn) {
        this.lanternSystem.lanternOn = true;
        prog.lanternOn = true;
      }
      prog.tutorialPulseDone = true;
      this.questSystem.setStage('hub_initial', true);
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.hub_first_inspect, () => {
        this.hud.showToast('Đã mở lối Bắc dẫn vào Rừng Đom Đóm (Whispering Woods)!');
      });
      return;
    }

    if (this.questSystem.isReadyForFinale()) {
      this.startFinaleOverload();
      return;
    }

    if (count === 0) {
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.hub_first_inspect);
    } else if (count === 1) {
      this.heartTreeSprite?.setTexture('heart_tree_1');
      this.setCanopyTexture('canopy_1');
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.hub_after_woods_tree);
    } else if (count === 2) {
      this.heartTreeSprite?.setTexture('heart_tree_2');
      this.setCanopyTexture('canopy_2');
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.hub_after_creek_tree);
    }
  }

  public startFinaleOverload(): void {
    this.questSystem.setStage('finale_overload', false);
    this.lanternSystem.lanternOn = true;
    this.lanternSystem.isOverloadMode = true;
    this.heartTreeSprite?.setTexture('heart_tree_3');
    this.setCanopyTexture('canopy_3');
    this.effectsSystem.spawnBurst(315, 145, 0xfff0a8, 28);

    if (!this.overloadBanner) {
      this.overloadBanner = this.add.text(
        320,
        215,
        '⚡ ÁNH SÁNG QUÁ TẢI! Nhấn [F] để tắt đèn, trả lại sự cân bằng ⚡',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12.5px',
          fontStyle: 'bold',
          color: '#081d26',
          backgroundColor: '#ffe680',
          padding: { x: 14, y: 7 },
        }
      );
      this.overloadBanner.setOrigin(0.5, 0.5);
      this.overloadBanner.setDepth(92);
    }
    this.overloadBanner.setVisible(true);

    this.dialogueSystem.startDialogue(DIALOGUE_DATA.finale_overload_start);
  }

  public beginDawnTransition(): void {
    if (this.dawnTransitionTriggered) return;
    this.dawnTransitionTriggered = true;

    this.overloadBanner?.setVisible(false);
    this.lanternSystem.lanternOn = false;
    this.lanternSystem.isOverloadMode = false;
    this.lanternSystem.isDawnMode = true;

    this.questSystem.progress.lanternOn = false;
    this.questSystem.setStage('victory', true);

    SoundSystem.playDawnChord();
    this.heartTreeSprite?.setTexture('heart_tree_dawn');
    this.setCanopyTexture('canopy_dawn');
    for (const tr of this.treeSprites) tr.setTexture('tree_dawn');
    for (const bs of this.bushSprites) bs.setTexture('bush_dawn');

    this.effectsSystem.setupZoneEffects('hub', true);
    this.effectsSystem.spawnBurst(315, 130, 0xffe680, 36);

    const dawnGlow = this.add.graphics();
    dawnGlow.setDepth(2);
    dawnGlow.fillStyle(0x45735c, 0.72);
    dawnGlow.fillRect(0, 0, 640, 360);

    this.hud.showToast('Bình minh đã trở lại với khu rừng Elaria!', 3500);

    this.dialogueSystem.startDialogue(DIALOGUE_DATA.finale_dawn_dialogue, () => {
      this.time.delayedCall(600, () => {
        this.scene.start('EndingScene');
      });
    });
  }

  public tryTransitionZone(targetZone: ZoneId): void {
    const check = this.questSystem.canEnterZone(targetZone);
    if (!check.allowed) {
      SoundSystem.playPuzzleError();
      this.hud.showToast(check.reason ?? 'Lối đi này hiện chưa mở.', 3200);
      return;
    }

    if (this.lanternSystem.lanternPlaced) {
      this.lanternSystem.retrieveLantern();
    }

    const prevZone = this.questSystem.progress.currentZone;
    this.questSystem.progress.lanternOn = this.lanternSystem.lanternOn;
    this.questSystem.setZone(targetZone);

    this.scene.restart({
      progress: this.questSystem.progress,
      fromZone: prevZone,
    });
  }

  private handleInitialZoneEvents(zoneId: ZoneId): void {
    const prog = this.questSystem.progress;

    if (zoneId === 'hub' && prog.stage === 'intro' && !prog.lanternPickedUp) {
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.intro_awaken);
      return;
    }

    if (zoneId === 'woods' && !prog.crystals.memory && !this.zoneEnteredDialogueShown.woods) {
      this.zoneEnteredDialogueShown.woods = true;
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.woods_entry);
    } else if (
      zoneId === 'creek' &&
      !prog.crystals.hope &&
      !this.zoneEnteredDialogueShown.creek
    ) {
      this.zoneEnteredDialogueShown.creek = true;
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.creek_entry);
    } else if (
      zoneId === 'ruins' &&
      !prog.crystals.balance &&
      !this.zoneEnteredDialogueShown.ruins
    ) {
      this.zoneEnteredDialogueShown.ruins = true;
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.ruins_entry);
    } else if (
      zoneId === 'hub' &&
      this.questSystem.isReadyForFinale() &&
      !this.zoneEnteredDialogueShown.hub
    ) {
      this.zoneEnteredDialogueShown.hub = true;
      this.dialogueSystem.startDialogue(DIALOGUE_DATA.hub_ready_finale_hint);
    }
  }

  private bindInputs(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-ESC', () => {
      this.pauseMenu.toggle();
    });

    this.input.keyboard.on('keydown-UP', () => {
      if (this.pauseMenu.isOpen()) this.pauseMenu.moveSelection(-1);
    });
    this.input.keyboard.on('keydown-W', () => {
      if (this.pauseMenu.isOpen()) this.pauseMenu.moveSelection(-1);
    });
    this.input.keyboard.on('keydown-DOWN', () => {
      if (this.pauseMenu.isOpen()) this.pauseMenu.moveSelection(1);
    });
    this.input.keyboard.on('keydown-S', () => {
      if (this.pauseMenu.isOpen()) this.pauseMenu.moveSelection(1);
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      const now = performance.now();
      if (this.pauseMenu.isOpen()) {
        this.pauseMenu.triggerSelected();
        return;
      }
      if (this.dialogueSystem.isActive()) {
        this.dialogueSystem.handleAdvanceInput(now);
      }
    });

    this.input.keyboard.on('keydown-E', () => {
      const now = performance.now();
      if (this.pauseMenu.isOpen()) {
        this.pauseMenu.triggerSelected();
        return;
      }
      if (this.dialogueSystem.isInputLocked(now)) {
        this.dialogueSystem.handleAdvanceInput(now);
        return;
      }
      if (this.questSystem.progress.stage === 'finale_overload') {
        this.hud.showToast('Nhấn phím [F] để tắt đèn lồng, trả lại sự cân bằng!');
        return;
      }
      this.interactionSystem.tryInteract(now);
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      const now = performance.now();
      if (this.pauseMenu.isOpen()) {
        this.pauseMenu.triggerSelected();
        return;
      }
      if (this.dialogueSystem.isInputLocked(now)) {
        this.dialogueSystem.handleAdvanceInput(now);
        return;
      }
      if (
        this.questSystem.progress.stage === 'finale_overload' ||
        this.questSystem.progress.stage === 'victory'
      ) {
        return;
      }

      if (!this.lanternSystem.lanternInHand || this.lanternSystem.lanternPlaced) {
        this.hud.showToast('Bạn cần cầm chiếc đèn lồng trên tay để phát Light Pulse!');
        return;
      }
      if (!this.lanternSystem.lanternOn) {
        this.hud.showToast('Hãy nhấn [F] thắp sáng đèn lồng trước khi phát Light Pulse [SPACE]!');
        return;
      }

      const fired = this.lanternSystem.triggerPulse(this.player.x, this.player.y);
      if (!fired) {
        this.hud.showToast('Light Pulse đang hồi năng lượng (3 giây)...', 1200);
      }
    });

    this.input.keyboard.on('keydown-F', () => {
      const now = performance.now();
      if (this.pauseMenu.isOpen()) return;

      if (this.questSystem.progress.stage === 'finale_overload') {
        if (this.dialogueSystem.isActive()) {
          this.dialogueSystem.handleAdvanceInput(now);
          if (this.dialogueSystem.isActive()) return;
        }
        this.beginDawnTransition();
        return;
      }

      if (this.dialogueSystem.isInputLocked(now)) return;
      if (this.questSystem.progress.stage === 'victory') return;

      if (!this.lanternSystem.lanternInHand) {
        this.hud.showToast('Hãy đến bia đá [E] để nhận chiếc đèn lồng trước!');
        return;
      }
      if (this.lanternSystem.lanternPlaced) {
        this.hud.showToast('Đèn đang đặt trên bệ đá! Thu hồi đèn [E] nếu muốn bật/tắt trên tay.');
        return;
      }

      const toggled = this.lanternSystem.toggleLantern(now);
      if (toggled) {
        this.questSystem.progress.lanternOn = this.lanternSystem.lanternOn;
        this.questSystem.save();

        if (
          this.questSystem.progress.stage === 'intro' &&
          this.lanternSystem.lanternOn &&
          !this.questSystem.progress.tutorialPulseDone
        ) {
          this.effectsSystem.spawnBurst(this.player.x, this.player.y, 0xffe680, 16);
          this.dialogueSystem.startDialogue(DIALOGUE_DATA.intro_after_lamp);
        }
      }
    });

    this.input.keyboard.on('keydown-H', () => {
      if (this.pauseMenu.isOpen() || this.dialogueSystem.isActive()) return;
      this.hud.showToast(
        getLumoHint(this.questSystem.progress, this.lanternSystem.lanternPlaced),
        3400
      );
    });
  }

  public update(_time: number, delta: number): void {
    if (this.pauseMenu.isOpen()) return;

    this.dialogueSystem.update(delta);
    this.hud.setControlsVisible(!this.dialogueSystem.isActive());

    const canMove =
      !this.dialogueSystem.isActive() &&
      this.questSystem.progress.stage !== 'finale_overload';

    if (
      this.questSystem.progress.stage === 'intro' &&
      !this.questSystem.progress.lanternPickedUp &&
      !this.dialogueSystem.isActive()
    ) {
      const distToBeacon = Math.hypot(this.player.x - 235, this.player.y - 268);
      if (distToBeacon < 32) {
        this.questSystem.progress.lanternPickedUp = true;
        this.lanternSystem.lanternInHand = true;
        this.lumo.setVisible(true);
        this.effectsSystem.spawnBurst(235, 256, 0xffe680, 14);
        this.questSystem.save();
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.intro_meet_lumo);
      }
    }

    this.player.update(
      delta,
      canMove,
      this.lanternSystem.lanternInHand && !this.lanternSystem.lanternPlaced,
      this.lanternSystem.lanternOn
    );

    this.lumo.update(delta, this.player.x, this.player.y);
    this.lanternSystem.update(delta, this.player.x, this.player.y);
    this.effectsSystem.update(delta);
    this.woodsPuzzle?.update(delta);
    this.updateWaterAnimation(delta);

    this.interactionSystem.update(
      this.player.x,
      this.player.y,
      canMove && !this.dialogueSystem.isActive()
    );

    this.hud.update(
      delta,
      this.questSystem.progress,
      this.lanternSystem.lanternPlaced,
      this.lanternSystem.getCooldownRatio()
    );
  }

  private static readonly WATER_FRAMES = [
    'tile_water',
    'tile_water_b',
    'tile_water_c',
    'tile_water_d',
    'tile_water_e',
  ];

  private updateWaterAnimation(dt: number): void {
    if (this.waterTiles.length === 0) return;
    // All three frames must exist, otherwise keep the static base frame.
    for (const key of WorldScene.WATER_FRAMES) {
      if (!this.textures.exists(key)) return;
    }
    this.waterAnimTimer += dt;
    if (this.waterAnimTimer < 360) return;
    this.waterAnimTimer = 0;
    this.waterAnimStep = (this.waterAnimStep + 1) % WorldScene.WATER_FRAMES.length;
    const next = WorldScene.WATER_FRAMES[this.waterAnimStep];
    for (const tile of this.waterTiles) {
      if (tile.texture.key !== next) {
        tile.setTexture(next);
      }
    }
  }
}
