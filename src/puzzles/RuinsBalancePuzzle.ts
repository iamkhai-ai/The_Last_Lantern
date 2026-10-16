import Phaser from 'phaser';
import { DIALOGUE_DATA } from '../data/dialogue';
import { DialogueSystem } from '../systems/DialogueSystem';
import { EffectsSystem } from '../systems/EffectsSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LanternSystem } from '../systems/LanternSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { HUD } from '../ui/HUD';

interface BalanceLockNode {
  index: number;
  symbol: 'sun' | 'moon';
  requiresLanternOn: boolean;
  labelVi: string;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Sprite;
}

export class RuinsBalancePuzzle {
  private scene: Phaser.Scene;
  private questSystem: QuestSystem;
  private interactionSystem: InteractionSystem;
  private lanternSystem: LanternSystem;
  private dialogueSystem: DialogueSystem;
  private effectsSystem: EffectsSystem;
  private hud: HUD;

  private locks: BalanceLockNode[] = [];
  private shadowSprite?: Phaser.GameObjects.Sprite;
  private crystalSprite?: Phaser.GameObjects.Sprite;

  // Blueprint sequence: Sun (Lantern ON) -> Moon (Lantern OFF) -> Sun (Lantern ON)
  private readonly lockDefs: Array<{
    symbol: 'sun' | 'moon';
    requiresLanternOn: boolean;
    labelVi: string;
    x: number;
    y: number;
  }> = [
    {
      symbol: 'sun',
      requiresLanternOn: true,
      labelVi: 'Khóa Nhật I (Cần Đèn BẬT)',
      x: 205,
      y: 222,
    },
    {
      symbol: 'moon',
      requiresLanternOn: false,
      labelVi: 'Khóa Nguyệt II (Cần Đèn TẮT)',
      x: 320,
      y: 256,
    },
    {
      symbol: 'sun',
      requiresLanternOn: true,
      labelVi: 'Khóa Nhật III (Cần Đèn BẬT)',
      x: 435,
      y: 222,
    },
  ];

  constructor(
    scene: Phaser.Scene,
    questSystem: QuestSystem,
    interactionSystem: InteractionSystem,
    lanternSystem: LanternSystem,
    dialogueSystem: DialogueSystem,
    effectsSystem: EffectsSystem,
    hud: HUD
  ) {
    this.scene = scene;
    this.questSystem = questSystem;
    this.interactionSystem = interactionSystem;
    this.lanternSystem = lanternSystem;
    this.dialogueSystem = dialogueSystem;
    this.effectsSystem = effectsSystem;
    this.hud = hud;

    this.build();
  }

  private build(): void {
    // Ruins altar at top of pentagon courtyard (matching 04_silent_ruins.png)
    const altar = this.scene.add.image(358, 122, 'ruins_altar');
    altar.setDepth(14);

    // Inscription stone
    this.interactionSystem.register({
      id: 'ruins_inscription_stone',
      x: 260,
      y: 165,
      radius: 44,
      getPrompt: () => '[E] Đọc bia cổ Cân Bằng Sáng & Tối',
      onInteract: () => {
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.ruins_inscription);
      },
    });

    const curProgress = this.questSystem.progress.crystals.balance
      ? 3
      : this.questSystem.progress.ruinsLockSequence;

    this.lockDefs.forEach((def, idx) => {
      const isLit = idx < curProgress;
      const sp = this.scene.add.sprite(
        def.x,
        def.y,
        `lock_${def.symbol}_${isLit ? 'on' : 'off'}`
      );
      sp.setDepth(17);

      const node: BalanceLockNode = {
        index: idx,
        symbol: def.symbol,
        requiresLanternOn: def.requiresLanternOn,
        labelVi: def.labelVi,
        x: def.x,
        y: def.y,
        sprite: sp,
      };
      this.locks.push(node);

      this.interactionSystem.register({
        id: `ruins_lock_${idx}`,
        x: def.x,
        y: def.y + 8,
        getPromptBounds: () => sp.getBounds(),
        radius: 46,
        isEnabled: () => this.questSystem.progress.ruinsLockSequence < 3,
        getPrompt: () => {
          if (idx < this.questSystem.progress.ruinsLockSequence) {
            return `${def.labelVi} (Đã mở khóa)`;
          }
          return `[E] Kích hoạt ${def.labelVi}`;
        },
        onInteract: () => this.handleLockInteract(node),
      });
    });

    if (curProgress >= 3) {
      if (!this.questSystem.progress.shadowSeen) {
        this.spawnShadow();
      } else if (!this.questSystem.progress.crystals.balance) {
        this.spawnBalanceCrystal();
      }
    }
  }

  private handleLockInteract(node: BalanceLockNode): void {
    const seq = this.questSystem.progress.ruinsLockSequence;
    if (seq >= 3) return;

    if (node.index < seq) {
      this.hud.showToast(`${node.labelVi} đã được mở khóa.`);
      return;
    }

    if (node.index > seq) {
      // Wrong order -> reset cleanly
      this.questSystem.progress.ruinsLockSequence = 0;
      this.refreshLockTextures();
      SoundSystem.playPuzzleError();
      this.hud.showToast(
        'Sai thứ tự khóa! Hãy kích hoạt lần lượt: Khóa Nhật I -> Khóa Nguyệt II -> Khóa Nhật III.'
      );
      return;
    }

    // Correct lock index, now verify lantern F state!
    if (this.lanternSystem.lanternOn !== node.requiresLanternOn) {
      SoundSystem.playPuzzleError();
      if (node.requiresLanternOn) {
        this.hud.showToast('Khóa Mặt Trời cần ánh sáng! Hãy nhấn [F] BẬT đèn lồng rồi thử lại.');
      } else {
        this.hud.showToast('Khóa Mặt Trăng chỉ mở trong bóng tối! Hãy nhấn [F] TẮT đèn lồng rồi thử lại.');
      }
      return;
    }

    // Advance sequence!
    this.questSystem.progress.ruinsLockSequence = seq + 1;
    this.refreshLockTextures();
    SoundSystem.playRuneActivate(seq + 1);
    this.effectsSystem.spawnBurst(
      node.x,
      node.y,
      node.symbol === 'sun' ? 0xffe07d : 0xd28cff,
      14
    );

    if (this.questSystem.progress.ruinsLockSequence === 3) {
      this.questSystem.save();
      SoundSystem.playPuzzleSolved();
      this.hud.showToast('Ba khóa Cân Bằng đã mở! Một hình bóng cổ xưa xuất hiện nơi điện thờ...');
      this.spawnShadow();
    } else {
      this.hud.showToast(
        `Đã mở ${node.labelVi} (${this.questSystem.progress.ruinsLockSequence}/3)!`
      );
    }
  }

  private refreshLockTextures(): void {
    const seq = this.questSystem.progress.ruinsLockSequence;
    for (const l of this.locks) {
      const lit = l.index < seq;
      l.sprite.setTexture(`lock_${l.symbol}_${lit ? 'on' : 'off'}`);
    }
  }

  private spawnShadow(): void {
    if (this.shadowSprite || this.questSystem.progress.shadowSeen) return;

    this.shadowSprite = this.scene.add.sprite(366, 156, 'shadow_npc');
    this.shadowSprite.setDepth(21);
    this.effectsSystem.spawnBurst(366, 156, 0xd28cff, 18);

    this.interactionSystem.register({
      id: 'ruins_shadow_npc',
      x: 366,
      y: 162,
      getPromptBounds: () => this.shadowSprite?.getBounds() ?? null,
      radius: 52,
      isEnabled: () => !this.questSystem.progress.shadowSeen,
      getPrompt: () => '[E] Lắng nghe Hình Bóng (The Shadow)',
      onInteract: () => {
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.ruins_shadow_encounter, () => {
          this.questSystem.progress.shadowSeen = true;
          this.questSystem.save();
          if (this.shadowSprite) {
            this.scene.tweens.add({
              targets: this.shadowSprite,
              alpha: 0,
              y: 142,
              duration: 700,
              onComplete: () => {
                this.shadowSprite?.destroy();
                this.shadowSprite = undefined;
              },
            });
          }
          this.spawnBalanceCrystal();
        });
      },
    });
  }

  private spawnBalanceCrystal(): void {
    if (this.crystalSprite || this.questSystem.progress.crystals.balance) return;

    this.crystalSprite = this.scene.add.sprite(366, 114, 'crystal_balance');
    this.crystalSprite.setDepth(24);

    this.scene.tweens.add({
      targets: this.crystalSprite,
      y: 108,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });

    this.interactionSystem.register({
      id: 'crystal_balance_pickup',
      x: 366,
      y: 132,
      getPromptBounds: () => this.crystalSprite?.getBounds() ?? null,
      radius: 52,
      isEnabled: () =>
        this.questSystem.progress.shadowSeen &&
        !this.questSystem.progress.crystals.balance,
      getPrompt: () => '[E] Thu nhận Tinh thể Cân Bằng (Tím)',
      onInteract: () => {
        if (!this.questSystem.collectCrystal('balance')) return;
        SoundSystem.playCrystalPickup();
        this.effectsSystem.spawnBurst(366, 114, 0xd28cff, 26);
        this.crystalSprite?.destroy();
        this.crystalSprite = undefined;
        this.hud.showToast('Đã thu thập đủ 3/3 Tinh thể! Hãy trở về Cây Mẹ!');
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.ruins_crystal_balance);
      },
    });
  }
}
