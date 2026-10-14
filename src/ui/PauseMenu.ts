import Phaser from 'phaser';
import { SoundSystem } from '../systems/SoundSystem';

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private items: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private active = false;
  private confirmRestart = false;

  private onResume: () => void;
  private onRestart: () => void;
  private onMainMenu: () => void;

  constructor(
    scene: Phaser.Scene,
    callbacks: {
      onResume: () => void;
      onRestart: () => void;
      onMainMenu: () => void;
    }
  ) {
    this.scene = scene;
    this.onResume = callbacks.onResume;
    this.onRestart = callbacks.onRestart;
    this.onMainMenu = callbacks.onMainMenu;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x051014, 0.88);
    this.bg.fillRect(0, 0, 640, 360);
    this.bg.fillStyle(0x091921, 0.96);
    this.bg.lineStyle(1.5, 0xd8b869, 0.9);
    this.bg.fillRoundedRect(180, 70, 280, 220, 8);
    this.bg.strokeRoundedRect(180, 70, 280, 220, 8);

    const title = scene.add.text(320, 102, 'TẠM DỪNG (PAUSED)', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f7dfaa',
    });
    title.setOrigin(0.5, 0.5);

    const labels = [
      'TIẾP TỤC (RESUME)',
      'CHƠI LẠI TỪ ĐẦU (RESTART)',
      'ÂM THANH: BẬT',
      'MÀN HÌNH CHÍNH (MAIN MENU)',
    ];

    this.items = labels.map((label, idx) => {
      const txt = scene.add.text(320, 145 + idx * 32, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#cddbd8',
      });
      txt.setOrigin(0.5, 0.5);
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => {
        this.selectedIndex = idx;
        this.refreshHighlight();
      });
      txt.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.triggerSelected();
      });
      return txt;
    });

    this.container = scene.add.container(0, 0, [this.bg, title, ...this.items]);
    this.container.setDepth(98);
    this.container.setVisible(false);
  }

  public isOpen(): boolean {
    return this.active;
  }

  public toggle(): void {
    if (this.active) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.active = true;
    this.confirmRestart = false;
    this.selectedIndex = 0;
    this.refreshHighlight();
    this.container.setVisible(true);
  }

  public close(): void {
    this.active = false;
    this.confirmRestart = false;
    this.container.setVisible(false);
  }

  public moveSelection(delta: number): void {
    if (!this.active) return;
    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.confirmRestart = false;
    this.refreshHighlight();
  }

  public triggerSelected(): void {
    if (!this.active) return;
    if (this.selectedIndex === 0) {
      this.close();
      this.onResume();
    } else if (this.selectedIndex === 1) {
      if (!this.confirmRestart) {
        this.confirmRestart = true;
        this.refreshHighlight();
      } else {
        this.close();
        this.onRestart();
      }
    } else if (this.selectedIndex === 2) {
      SoundSystem.toggleMute();
      this.refreshHighlight();
    } else if (this.selectedIndex === 3) {
      this.close();
      this.onMainMenu();
    }
  }

  private refreshHighlight(): void {
    const muteLabel = SoundSystem.isMuted() ? 'ÂM THANH: TẮT' : 'ÂM THANH: BẬT';
    const restartLabel = this.confirmRestart
      ? 'XÁC NHẬN CHƠI LẠI? (NHẤN LẦN NỮA)'
      : 'CHƠI LẠI TỪ ĐẦU (RESTART)';

    const baseLabels = [
      'TIẾP TỤC (RESUME)',
      restartLabel,
      muteLabel,
      'MÀN HÌNH CHÍNH (MAIN MENU)',
    ];

    this.items.forEach((item, idx) => {
      const selected = idx === this.selectedIndex;
      item.setText(selected ? `▸ ${baseLabels[idx]} ◂` : baseLabels[idx]);
      item.setColor(selected ? '#ffe680' : '#cddbd8');
    });
  }
}
