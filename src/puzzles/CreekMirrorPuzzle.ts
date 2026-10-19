import Phaser from 'phaser';
import { DIALOGUE_DATA } from '../data/dialogue';
import { DialogueSystem } from '../systems/DialogueSystem';
import { EffectsSystem } from '../systems/EffectsSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LanternSystem } from '../systems/LanternSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { SoundSystem } from '../systems/SoundSystem';
import type { ToastSink } from '../ui/CampaignHud';

export class CreekMirrorPuzzle {
  private scene: Phaser.Scene;
  private questSystem: QuestSystem;
  private interactionSystem: InteractionSystem;
  private lanternSystem: LanternSystem;
  private dialogueSystem: DialogueSystem;
  private effectsSystem: EffectsSystem;
  private hud: ToastSink;
  private onBridgeActivated: () => void;

  private pedestalSprite!: Phaser.GameObjects.Sprite;
  private mirrorSprites: [Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite] = [
    null as unknown as Phaser.GameObjects.Sprite,
    null as unknown as Phaser.GameObjects.Sprite,
  ];
  private receiverSprite!: Phaser.GameObjects.Sprite;
  private beamGraphics!: Phaser.GameObjects.Graphics;
  private bridgeStones: Phaser.GameObjects.Image[] = [];
  private crystalSprite?: Phaser.GameObjects.Sprite;

  // Correct mirror orientations: Mirror 1 = 1 (↗ to Mirror 2), Mirror 2 = 2 (↘ to Receiver)
  public static readonly CORRECT_MIRRORS: [number, number] = [1, 2];

  private readonly pedestalPos = { x: 162, y: 242 };
  private readonly mirror1Pos = { x: 192, y: 172 };
  private readonly mirror2Pos = { x: 258, y: 92 };
  private readonly receiverPos = { x: 468, y: 136 };

  constructor(
    scene: Phaser.Scene,
    questSystem: QuestSystem,
    interactionSystem: InteractionSystem,
    lanternSystem: LanternSystem,
    dialogueSystem: DialogueSystem,
    effectsSystem: EffectsSystem,
    hud: ToastSink,
    onBridgeActivated: () => void
  ) {
    this.scene = scene;
    this.questSystem = questSystem;
    this.interactionSystem = interactionSystem;
    this.lanternSystem = lanternSystem;
    this.dialogueSystem = dialogueSystem;
    this.effectsSystem = effectsSystem;
    this.hud = hud;
    this.onBridgeActivated = onBridgeActivated;

    this.build();
  }

  private build(): void {
    const solved =
      this.questSystem.progress.creekBridgeActive ||
      this.questSystem.progress.crystals.hope;

    this.beamGraphics = this.scene.add.graphics();
    this.beamGraphics.setDepth(26);

    // Lantern Pedestal
    this.pedestalSprite = this.scene.add.sprite(
      this.pedestalPos.x,
      this.pedestalPos.y,
      'pedestal_empty'
    );
    this.pedestalSprite.setDepth(18);

    this.interactionSystem.register({
      id: 'creek_pedestal',
      x: this.pedestalPos.x,
      y: this.pedestalPos.y + 6,
      getPromptBounds: () => this.pedestalSprite.getBounds(),
      radius: 48,
      isEnabled: () => !this.questSystem.progress.creekBridgeActive,
      getPrompt: () =>
        this.lanternSystem.lanternPlaced
          ? '[E] Thu hồi đèn lồng về tay'
          : '[E] Đặt đèn lồng lên bệ chiếu sáng',
      onInteract: () => {
        if (this.lanternSystem.lanternPlaced) {
          this.lanternSystem.retrieveLantern();
          this.pedestalSprite.setTexture('pedestal_empty');
          this.hud.showToast('Đã thu hồi đèn lồng về tay.');
        } else {
          this.lanternSystem.placeLanternAt(this.pedestalPos.x, this.pedestalPos.y - 10);
          this.pedestalSprite.setTexture('pedestal_lit');
          this.hud.showToast('Đã đặt đèn lên bệ! Hãy xoay 2 gương [E] để dẫn tia sáng qua suối.');
          this.checkBeamSolution();
        }
        this.redrawBeam();
      },
    });

    // Two Rotatable Mirrors (matching 03_moonlit_creek.png)
    const mirrorCoords = [this.mirror1Pos, this.mirror2Pos];
    const orientationNames = ['Bắc - Tây', 'Đông - Bắc (↗)', 'Đông - Nam (↘)', 'Tây - Nam'];

    mirrorCoords.forEach((pos, idx) => {
      const rot = solved
        ? CreekMirrorPuzzle.CORRECT_MIRRORS[idx]
        : this.questSystem.progress.creekMirrors[idx] % 4;
      this.questSystem.progress.creekMirrors[idx] = rot;

      const sp = this.scene.add.sprite(pos.x, pos.y, `mirror_${rot}`);
      sp.setDepth(17);
      this.mirrorSprites[idx] = sp;

      this.interactionSystem.register({
        id: `creek_mirror_${idx}`,
        x: pos.x,
        y: pos.y + 8,
        getPromptBounds: () => sp.getBounds(),
        radius: 48,
        isEnabled: () => !this.questSystem.progress.creekBridgeActive,
        getPrompt: () => {
          const cur = this.questSystem.progress.creekMirrors[idx];
          return `[E] Xoay Gương ${idx + 1} (Góc hiện tại: ${orientationNames[cur]})`;
        },
        onInteract: () => {
          const next = (this.questSystem.progress.creekMirrors[idx] + 1) % 4;
          this.questSystem.progress.creekMirrors[idx] = next;
          sp.setTexture(`mirror_${next}`);
          SoundSystem.playMirrorRotate();
          this.questSystem.save();
          this.checkBeamSolution();
          this.redrawBeam();
        },
      });
    });

    // Receiver Stone on East Bank
    this.receiverSprite = this.scene.add.sprite(
      this.receiverPos.x,
      this.receiverPos.y,
      solved ? 'receiver_on' : 'receiver_off'
    );
    this.receiverSprite.setDepth(17);

    // Stepping Stones across the diagonal creek (matching 03_moonlit_creek.png)
    const stonePositions = [
      [300, 260],
      [325, 245],
      [350, 230],
      [375, 215],
      [400, 200],
      [425, 185],
      [450, 170],
      [475, 155],
    ];
    for (const [sx, sy] of stonePositions) {
      const st = this.scene.add.image(sx, sy, 'stepping_stone');
      st.setDepth(6);
      st.setVisible(solved);
      this.bridgeStones.push(st);
    }

    // Ancient Guardian Mural on East Bank
    const mural = this.scene.add.image(548, 215, 'mural_tablet');
    mural.setDepth(16);
    this.interactionSystem.register({
      id: 'creek_mural_tablet',
      x: 548,
      y: 220,
      getPromptBounds: () => mural.getBounds(),
      radius: 48,
      getPrompt: () => '[E] Xem phù điêu Người Bảo Vệ Cổ Xưa',
      onInteract: () => {
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.creek_mural);
      },
    });

    if (solved) {
      this.onBridgeActivated();
      if (!this.questSystem.progress.crystals.hope) {
        this.spawnHopeCrystal();
      }
    }

    this.redrawBeam();
  }

  private checkBeamSolution(): void {
    if (this.questSystem.progress.creekBridgeActive) return;
    if (!this.lanternSystem.lanternPlaced) return;

    const [m1, m2] = this.questSystem.progress.creekMirrors;
    if (
      m1 === CreekMirrorPuzzle.CORRECT_MIRRORS[0] &&
      m2 === CreekMirrorPuzzle.CORRECT_MIRRORS[1]
    ) {
      this.questSystem.progress.creekBridgeActive = true;
      this.receiverSprite.setTexture('receiver_on');

      for (const st of this.bridgeStones) {
        st.setVisible(true);
      }

      // Restore lantern to player automatically once bridge is formed
      this.lanternSystem.retrieveLantern();
      this.pedestalSprite.setTexture('pedestal_lit');
      this.onBridgeActivated();
      this.questSystem.save();

      SoundSystem.playPuzzleSolved();
      this.effectsSystem.spawnBurst(this.receiverPos.x, this.receiverPos.y, 0x6ccff6, 20);
      this.hud.showToast(
        'Tia sáng đã kết nối! Cầu đá qua Suối Trăng đã hiện lên và đèn lồng đã về tay bạn!'
      );
      this.spawnHopeCrystal();
    }
  }

  private spawnHopeCrystal(): void {
    if (this.crystalSprite || this.questSystem.progress.crystals.hope) return;

    this.crystalSprite = this.scene.add.sprite(508, 114, 'crystal_hope');
    this.crystalSprite.setDepth(22);

    this.scene.tweens.add({
      targets: this.crystalSprite,
      y: 108,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });

    this.interactionSystem.register({
      id: 'crystal_hope_pickup',
      x: 508,
      y: 120,
      getPromptBounds: () => this.crystalSprite?.getBounds() ?? null,
      radius: 48,
      isEnabled: () =>
        this.questSystem.progress.creekBridgeActive &&
        !this.questSystem.progress.crystals.hope,
      getPrompt: () => '[E] Thu nhận Tinh thể Hy Vọng (Xanh lam)',
      onInteract: () => {
        if (!this.questSystem.collectCrystal('hope')) return;
        SoundSystem.playCrystalPickup();
        this.effectsSystem.spawnBurst(508, 114, 0x6ccff6, 24);
        this.crystalSprite?.destroy();
        this.crystalSprite = undefined;
        this.hud.showToast('Đã nhận Tinh thể Hy Vọng (2/3)!');
        this.dialogueSystem.startDialogue(DIALOGUE_DATA.creek_crystal_hope);
      },
    });
  }

  public redrawBeam(): void {
    this.beamGraphics.clear();

    const solved = this.questSystem.progress.creekBridgeActive;
    if (!this.lanternSystem.lanternPlaced && !solved) return;

    const [m1, m2] = solved
      ? CreekMirrorPuzzle.CORRECT_MIRRORS
      : this.questSystem.progress.creekMirrors;

    // Segment 1: Pedestal -> Mirror 1
    this.drawRaySegment(
      this.pedestalPos.x,
      this.pedestalPos.y - 8,
      this.mirror1Pos.x,
      this.mirror1Pos.y
    );

    // Segment 2 from Mirror 1 based on m1 orientation (0..3)
    if (m1 === 1) {
      // Correct: Mirror 1 -> Mirror 2
      this.drawRaySegment(
        this.mirror1Pos.x,
        this.mirror1Pos.y,
        this.mirror2Pos.x,
        this.mirror2Pos.y
      );

      // Segment 3 from Mirror 2 based on m2 orientation (0..3)
      if (m2 === 2) {
        // Correct: Mirror 2 -> Receiver across creek
        this.drawRaySegment(
          this.mirror2Pos.x,
          this.mirror2Pos.y,
          this.receiverPos.x,
          this.receiverPos.y
        );
      } else {
        const missTargets: Record<number, [number, number]> = {
          0: [140, 50],
          1: [330, 35],
          3: [230, 210],
        };
        const [tx, ty] = missTargets[m2] ?? [140, 50];
        this.drawRaySegment(this.mirror2Pos.x, this.mirror2Pos.y, tx, ty);
      }
    } else {
      const miss1Targets: Record<number, [number, number]> = {
        0: [95, 130],
        2: [310, 210],
        3: [95, 225],
      };
      const [tx, ty] = miss1Targets[m1] ?? [95, 130];
      this.drawRaySegment(this.mirror1Pos.x, this.mirror1Pos.y, tx, ty);
    }
  }

  private drawRaySegment(x1: number, y1: number, x2: number, y2: number): void {
    this.beamGraphics.lineStyle(5, 0xffe680, 0.25);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(x1, y1);
    this.beamGraphics.lineTo(x2, y2);
    this.beamGraphics.strokePath();

    this.beamGraphics.lineStyle(2.2, 0xfff3b0, 0.92);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(x1, y1);
    this.beamGraphics.lineTo(x2, y2);
    this.beamGraphics.strokePath();
  }
}
