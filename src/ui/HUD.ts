import Phaser from 'phaser';
import { getObjectiveText, ZONE_TITLES } from '../data/quests';
import { GameProgress } from '../types/gameTypes';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private zoneText: Phaser.GameObjects.Text;
  private objectiveText: Phaser.GameObjects.Text;
  private controlsText: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text;
  private toastTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();

    this.zoneText = scene.add.text(476, 25, 'THE HEART TREE', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#cddbd8',
    });
    this.zoneText.setOrigin(0, 0.5);

    // Positioned cleanly below the top pills so long Vietnamese text never overlaps pills
    this.objectiveText = scene.add.text(320, 50, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#f7dfaa',
      backgroundColor: 'rgba(8, 22, 28, 0.84)',
      padding: { x: 10, y: 3 },
    });
    this.objectiveText.setOrigin(0.5, 0.5);

    this.controlsText = scene.add.text(
      320,
      348,
      'WASD/Mũi tên: Đi • Shift: Chạy • F: Bật/Tắt đèn • Space: Light Pulse • E: Tương tác • H: Gợi ý • Esc: Tạm dừng',
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '9.5px',
        color: '#a8c7bf',
        backgroundColor: 'rgba(6, 16, 20, 0.65)',
        padding: { x: 8, y: 2 },
      }
    );
    this.controlsText.setOrigin(0.5, 0.5);

    this.toastText = scene.add.text(320, 72, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10.5px',
      fontStyle: 'bold',
      color: '#ffe680',
      backgroundColor: 'rgba(9, 25, 33, 0.92)',
      padding: { x: 10, y: 4 },
    });
    this.toastText.setOrigin(0.5, 0.5);
    this.toastText.setVisible(false);

    this.container = scene.add.container(0, 0, [
      this.graphics,
      this.zoneText,
      this.objectiveText,
      this.controlsText,
      this.toastText,
    ]);
    this.container.setDepth(88);
  }

  public showToast(msg: string, durationMs = 2600): void {
    this.toastText.setText(msg);
    this.toastText.setVisible(true);
    this.toastTimer = durationMs;
  }

  public setControlsVisible(vis: boolean): void {
    this.controlsText.setVisible(vis);
  }

  public update(
    dt: number,
    progress: GameProgress,
    lanternPlaced: boolean,
    pulseCooldownRatio: number
  ): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastText.setVisible(false);
      }
    }

    const title =
      progress.stage === 'victory'
        ? 'THE LAST DAWN'
        : ZONE_TITLES[progress.currentZone];
    this.zoneText.setText(title);
    this.objectiveText.setText(getObjectiveText(progress, lanternPlaced));

    this.graphics.clear();

    // Top-left status pill matching reference screenshots (14, 10, 166x30)
    this.graphics.fillStyle(0x0c1d24, 0.88);
    this.graphics.lineStyle(1, 0x3b5c63, 0.85);
    this.graphics.fillRoundedRect(14, 10, 166, 30, 5);
    this.graphics.strokeRoundedRect(14, 10, 166, 30, 5);

    // Top-right zone title pill (462, 10, 164x30)
    this.graphics.fillStyle(0x0c1d24, 0.88);
    this.graphics.lineStyle(1, 0x3b5c63, 0.85);
    this.graphics.fillRoundedRect(462, 10, 164, 30, 5);
    this.graphics.strokeRoundedRect(462, 10, 164, 30, 5);

    // Lantern status circle at (30, 25)
    const lampColor = lanternPlaced
      ? 0x6ccff6
      : progress.lanternOn
      ? 0xd8b869
      : 0x3f5257;
    this.graphics.fillStyle(lampColor, 1);
    this.graphics.fillCircle(30, 25, 7.5);

    // Three diamond crystal icons at x = 60, 82, 104
    const slots = [
      { x: 60, active: progress.crystals.memory, color: 0xe6b842 },
      { x: 82, active: progress.crystals.hope, color: 0x4daee6 },
      { x: 104, active: progress.crystals.balance, color: 0xb96ce6 },
    ];
    for (const s of slots) {
      this.graphics.fillStyle(s.active ? s.color : 0x3e5259, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(s.x, 15);
      this.graphics.lineTo(s.x + 7, 25);
      this.graphics.lineTo(s.x, 35);
      this.graphics.lineTo(s.x - 7, 25);
      this.graphics.closePath();
      this.graphics.fillPath();
    }

    // Pulse cooldown mini-indicator inside left pill (x=124..170)
    const barW = 46;
    const readyRatio = 1 - pulseCooldownRatio;
    this.graphics.fillStyle(0x1f363d, 1);
    this.graphics.fillRect(124, 22, barW, 6);
    this.graphics.fillStyle(readyRatio >= 1 ? 0x7df2d4 : 0xd8b869, 1);
    this.graphics.fillRect(124, 22, barW * readyRatio, 6);
  }
}
