import Phaser from 'phaser';
import { DIALOGUE_DATA } from '../data/dialogue';
import { DialogueSystem } from '../systems/DialogueSystem';
import { EffectsSystem } from '../systems/EffectsSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LanternSystem } from '../systems/LanternSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { HUD } from '../ui/HUD';

type RuneId = 'moon' | 'leaf' | 'star';

interface RuneNode {
  id: RuneId;
  labelVi: string;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Sprite;
  labelText: Phaser.GameObjects.Text;
  activated: boolean;
}

export class WoodsRunePuzzle {
  private scene: Phaser.Scene;
  private questSystem: QuestSystem;
  private interactionSystem: InteractionSystem;
  private lanternSystem: LanternSystem;
  private dialogueSystem: DialogueSystem;
  private effectsSystem: EffectsSystem;
  private hud: HUD;

  public archSprite!: Phaser.GameObjects.Sprite;
  private beamGraphics!: Phaser.GameObjects.Graphics;
  private crystalSprite?: Phaser.GameObjects.Sprite;
  private nodes: RuneNode[] = [];
  private revealRemainingMs = 0;
  private readonly correctSequence: RuneId[] = ['moon', 'leaf', 'star'];

  public static readonly REVEAL_DURATION_MS = 5000;

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
    const solved =
      this.questSystem.progress.woodsRuneSequence >= 3 ||
      this.questSystem.progress.crystals.memory;

    this.beamGraphics = this.scene.add.graphics();
    this.beamGraphics.setDepth(16);

    // Circular Stone Sun-Gate (matching 03_Whispering_Woods.png)
    this.archSprite = this.scene.add.sprite(
      370,
      126,
      solved ? 'woods_arch_open' : 'woods_arch_locked'
    );
    this.archSprite.setDepth(14);

    // Gate inscription hint
    this.interactionSystem.register({
      id: 'woods_inscription',
      x: 312,
      y: 164,
      getPromptBounds: () => this.archSprite.getBounds(),
      radius: 44,
      getPrompt: () => '[E] Đọc bia gợi ý cổng cổ',
      onInteract: () => {
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.woods_gate_inscription);
      },
    });

    // Three Mossy Runestones matching 03_Whispering_Woods.png
    const defs: Array<{ id: RuneId; labelVi: string; x: number; y: number }> = [
      { id: 'moon', labelVi: 'Cổ tự Mặt Trăng', x: 162, y: 196 },
      { id: 'leaf', labelVi: 'Cổ tự Chiếc Lá', x: 265, y: 120 },
      { id: 'star', labelVi: 'Cổ tự Ngôi Sao', x: 520, y: 196 },
    ];

    const currentProgress = this.questSystem.progress.woodsRuneSequence;

    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const isLit = solved || i < currentProgress;
      const tex = isLit ? `runestone_${d.id}_lit` : 'runestone_hidden';

      const sp = this.scene.add.sprite(d.x, d.y, tex);
      sp.setDepth(15);

      const lbl = this.scene.add.text(d.x, d.y - 28, d.labelVi, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '9.5px',
        color: '#b8f5d4',
        backgroundColor: 'rgba(8, 26, 24, 0.85)',
        padding: { x: 4, y: 2 },
      });
      lbl.setOrigin(0.5, 0.5);
      lbl.setDepth(80);
      lbl.setVisible(isLit);

      const node: RuneNode = {
        id: d.id,
        labelVi: d.labelVi,
        x: d.x,
        y: d.y,
        sprite: sp,
        labelText: lbl,
        activated: isLit,
      };
      this.nodes.push(node);

      this.interactionSystem.register({
        id: `rune_${d.id}`,
        x: d.x,
        y: d.y + 8,
        getPromptBounds: () => sp.getBounds(),
        radius: 46,
        isEnabled: () =>
          !this.questSystem.progress.crystals.memory &&
          this.questSystem.progress.woodsRuneSequence < 3,
        getPrompt: () => {
          if (node.activated) return `${d.labelVi} (Đã thắp sáng)`;
          if (this.revealRemainingMs > 0) return `[E] Kích hoạt ${d.labelVi}`;
          return 'Bia đá ẩn — Nhấn [SPACE] phát Light Pulse để soi ký hiệu';
        },
        onInteract: () => this.handleRuneInteract(node),
      });
    }

    this.lanternSystem.onPulse(() => {
      if (this.questSystem.progress.woodsRuneSequence >= 3) return;
      this.revealRemainingMs = WoodsRunePuzzle.REVEAL_DURATION_MS;
      this.refreshNodeTextures();
      this.hud.showToast('Các cổ tự ẩn trên bia đá đã lộ diện trong 5 giây!', 2200);
    });

    this.refreshNodeTextures();

    if (solved && !this.questSystem.progress.crystals.memory) {
      this.spawnMemoryCrystal();
    }
  }

  private handleRuneInteract(node: RuneNode): void {
    if (this.questSystem.progress.woodsRuneSequence >= 3) return;

    if (this.revealRemainingMs <= 0 && !node.activated) {
      this.hud.showToast('Ký hiệu đang ẩn! Hãy bật đèn và nhấn [SPACE] phát Light Pulse trước.');
      SoundSystem.playPuzzleError();
      return;
    }

    if (node.activated) {
      this.hud.showToast(`${node.labelVi} đã được kích hoạt.`);
      return;
    }

    const idx = this.questSystem.progress.woodsRuneSequence;
    const expected = this.correctSequence[idx];

    if (node.id === expected) {
      node.activated = true;
      this.questSystem.progress.woodsRuneSequence = idx + 1;
      SoundSystem.playRuneActivate(idx + 1);
      this.effectsSystem.spawnBurst(node.x, node.y, 0xffe680, 12);
      this.refreshNodeTextures();

      if (this.questSystem.progress.woodsRuneSequence === 3) {
        this.unlockGate();
      } else {
        this.hud.showToast(
          `Đã thắp sáng ${node.labelVi} (${this.questSystem.progress.woodsRuneSequence}/3)!`
        );
      }
    } else {
      this.questSystem.progress.woodsRuneSequence = 0;
      for (const n of this.nodes) {
        n.activated = false;
      }
      SoundSystem.playPuzzleError();
      this.refreshNodeTextures();
      this.hud.showToast('Thứ tự chưa đúng... Gợi ý: “Trăng soi lá, lá dẫn sao.”');
    }
  }

  private unlockGate(): void {
    this.questSystem.save();
    this.archSprite.setTexture('woods_arch_open');
    SoundSystem.playPuzzleSolved();
    this.effectsSystem.spawnBurst(370, 120, 0xffe680, 24);
    this.hud.showToast('Cổng đá cổ đã mở! Tinh thể Ký Ức xuất hiện!');
    this.spawnMemoryCrystal();
  }

  private spawnMemoryCrystal(): void {
    if (this.crystalSprite || this.questSystem.progress.crystals.memory) return;

    this.crystalSprite = this.scene.add.sprite(370, 174, 'crystal_memory');
    this.crystalSprite.setDepth(22);

    this.scene.tweens.add({
      targets: this.crystalSprite,
      y: 168,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });

    this.interactionSystem.register({
      id: 'crystal_memory_pickup',
      x: 370,
      y: 174,
      getPromptBounds: () => this.crystalSprite?.getBounds() ?? null,
      radius: 46,
      isEnabled: () => !this.questSystem.progress.crystals.memory,
      getPrompt: () => '[E] Thu nhận Tinh thể Ký Ức (Vàng)',
      onInteract: () => {
        if (!this.questSystem.collectCrystal('memory')) return;
        SoundSystem.playCrystalPickup();
        this.effectsSystem.spawnBurst(370, 174, 0xffe680, 24);
        this.crystalSprite?.destroy();
        this.crystalSprite = undefined;
        this.hud.showToast('Đã nhận Tinh thể Ký Ức (1/3)!');
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.woods_crystal_memory);
      },
    });
  }

  private refreshNodeTextures(): void {
    const solved =
      this.questSystem.progress.woodsRuneSequence >= 3 ||
      this.questSystem.progress.crystals.memory;
    const revealed = this.revealRemainingMs > 0;

    this.beamGraphics.clear();

    for (const n of this.nodes) {
      if (solved || n.activated) {
        n.sprite.setTexture(`runestone_${n.id}_lit`);
        n.labelText.setVisible(true);
        // Project golden light beam into the Circular Sun-Gate (matching 03_Whispering_Woods.png!)
        this.beamGraphics.lineStyle(3.5, 0xffb838, 0.28);
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(n.x, n.y - 4);
        this.beamGraphics.lineTo(370, 120);
        this.beamGraphics.strokePath();

        this.beamGraphics.lineStyle(1.5, 0xfff3b0, 0.88);
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(n.x, n.y - 4);
        this.beamGraphics.lineTo(370, 120);
        this.beamGraphics.strokePath();
      } else if (revealed) {
        n.sprite.setTexture(`runestone_${n.id}_rev`);
        n.labelText.setVisible(true);
      } else {
        n.sprite.setTexture('runestone_hidden');
        n.labelText.setVisible(false);
      }
    }
  }

  public update(dt: number): void {
    if (this.revealRemainingMs > 0) {
      this.revealRemainingMs = Math.max(0, this.revealRemainingMs - dt);
      if (this.revealRemainingMs === 0) {
        this.refreshNodeTextures();
      }
    }
  }
}
