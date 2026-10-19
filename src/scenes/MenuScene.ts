import Phaser from 'phaser';
import menuDawnUrl from '../../Art_References/07_The_Last_Dawn.png?url';
import { SaveSystem } from '../systems/SaveSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { WorldFactory } from '../world/WorldFactory';
import { CampaignSaveSystem } from '../systems/CampaignSaveSystem';

const MENU_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Bitter, serif', fontStyle: '500',
  shadow: { offsetX: 0, offsetY: 1, color: '#10180f', blur: 1, stroke: false, fill: true },
};

export class MenuScene extends Phaser.Scene {
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private selectionDot!: Phaser.GameObjects.Arc;
  private selectedIndex = 0;
  private hasSavedGame = false;
  private actions: Array<() => void> = [];
  private confirmationOpen = false;
  private confirmationIndex = 0;
  private confirmationObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmationButtons: Phaser.GameObjects.Text[] = [];
  private leaving = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  public preload(): void {
    if (!this.textures.exists('menu_dawn')) this.load.image('menu_dawn', menuDawnUrl);
  }

  public create(): void {
    this.hasSavedGame = CampaignSaveSystem.hasSave() || SaveSystem.hasSave();
    this.selectedIndex = 0;
    this.menuButtons = [];
    this.actions = [];
    this.confirmationOpen = false;
    this.confirmationObjects = [];
    this.confirmationButtons = [];
    this.leaving = false;
    this.input.setTopOnly(true);

    if (this.textures.exists('menu_dawn')) {
      this.add.image(320, 180, 'menu_dawn').setDisplaySize(640, 360).setDepth(0);
    } else {
      WorldFactory.buildZone(this, 'hub', 0, false);
    }

    // Preserve the illustration's golden light and its own Nhinh/Lumo composition.
    // A moss-toned veil gives the left menu contrast without turning dawn into night.
    const veil = this.add.graphics().setDepth(10);
    veil.fillStyle(0x182318, 0.10);
    veil.fillRect(0, 0, 640, 360);
    for (let x = 0; x < 350; x += 2) {
      veil.fillStyle(0x101c15, 0.86 * Math.pow(1 - x / 350, 1.05));
      veil.fillRect(x, 0, 2, 360);
    }
    // Ground the small footer against the bright water and flowers.
    for (let y = 310; y < 360; y += 2) {
      veil.fillStyle(0x101c15, 0.55 * (y - 310) / 50);
      veil.fillRect(0, y, 640, 2);
    }

    this.add.text(38, 48, 'THE LAST\nLANTERN', {
      fontFamily: 'Georgia, serif', fontSize: '29px', fontStyle: 'bold',
      color: '#f4dfad', lineSpacing: -2,
    }).setDepth(81);
    this.add.text(40, 124, 'Khu rừng ánh sáng', {
      ...MENU_TEXT_STYLE, fontSize: '12px', color: '#efe6cf',
    }).setDepth(81);

    const items: Array<{ label: string; action: () => void }> = [];
    if (this.hasSavedGame) items.push({ label: 'Tiếp tục', action: () => this.continueGame() });
    items.push({ label: 'Hành trình mới', action: () => this.startNewGame() });
    items.push({
      label: this.soundLabel(),
      action: () => { SoundSystem.toggleMute(); this.refreshMenuHighlight(); },
    });
    this.selectionDot = this.add.circle(42, 198, 2.5, 0xe8c777).setDepth(82);
    items.forEach((item, idx) => {
      const btn = this.add.text(56, 198 + idx * 33, item.label, {
        ...MENU_TEXT_STYLE, fontSize: idx === items.length - 1 ? '12px' : '15px',
        color: '#efe6cf',
      }).setOrigin(0, 0.5).setDepth(82).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        if (this.confirmationOpen || this.leaving) return;
        this.selectedIndex = idx;
        this.refreshMenuHighlight();
      });
      btn.on('pointerdown', () => {
        if (this.confirmationOpen || this.leaving) return;
        this.selectedIndex = idx;
        this.triggerSelected();
      });
      this.menuButtons.push(btn);
      this.actions.push(item.action);
    });
    this.refreshMenuHighlight();

    this.add.text(38, 337, '↑↓ Chọn · Enter Xác nhận', {
      ...MENU_TEXT_STYLE, fontSize: '10px', color: '#efe6cf',
    }).setDepth(82);
    this.add.text(620, 347, 'Bản chơi thử · 01–10', {
      ...MENU_TEXT_STYLE, fontSize: '9px', color: '#d2c4a6',
    }).setOrigin(1, 1).setDepth(82);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown', this.handleKey, this);
      this.events.once('shutdown', () => keyboard.off('keydown', this.handleKey, this));
    }
  }

  private soundLabel(): string {
    return SoundSystem.isMuted() ? 'Âm thanh: Tắt' : 'Âm thanh: Bật';
  }

  private handleKey(event: KeyboardEvent): void {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'Enter', 'Space', 'KeyE', 'Escape'].includes(event.code)) {
      event.preventDefault();
    }
    // Holding the key that opens the dialog must never also confirm deletion.
    if (event.repeat || this.leaving) return;
    if (event.code === 'Escape') {
      if (this.confirmationOpen) this.closeConfirmation();
      return;
    }
    const direction = ['ArrowUp', 'KeyW'].includes(event.code) ? -1
      : ['ArrowDown', 'KeyS'].includes(event.code) ? 1 : 0;
    if (this.confirmationOpen) {
      if (direction || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        this.confirmationIndex = 1 - this.confirmationIndex;
        this.refreshConfirmation();
      } else if (['Enter', 'Space', 'KeyE'].includes(event.code)) {
        this.chooseConfirmation();
      }
      return;
    }
    if (direction) this.moveSelection(direction);
    else if (['Enter', 'Space', 'KeyE'].includes(event.code)) this.triggerSelected();
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + this.menuButtons.length) % this.menuButtons.length;
    SoundSystem.playMirrorRotate();
    this.refreshMenuHighlight();
  }

  private triggerSelected(): void {
    if (this.confirmationOpen || this.leaving) return;
    this.actions[this.selectedIndex]?.();
  }

  private refreshMenuHighlight(): void {
    this.menuButtons.forEach((btn, idx) => {
      if (idx === this.menuButtons.length - 1) btn.setText(this.soundLabel());
      btn.setColor(idx === this.selectedIndex ? '#e8c777' : '#efe6cf');
    });
    const selected = this.menuButtons[this.selectedIndex];
    if (selected) this.selectionDot.setPosition(42, selected.y);
  }

  public startNewGame(): void {
    if (this.confirmationOpen || this.leaving) return;
    if (CampaignSaveSystem.hasSave() || SaveSystem.hasSave()) {
      this.openConfirmation();
      return;
    }
    this.beginNewGame();
  }

  private openConfirmation(): void {
    this.confirmationOpen = true;
    this.confirmationIndex = 0; // Safe action is always the initial selection.
    this.selectionDot.setVisible(false);
    const blocker = this.add.rectangle(320, 180, 640, 360, 0x020b10, 0.78)
      .setDepth(100).setInteractive();
    const panel = this.add.rectangle(320, 180, 360, 170, 0x0b2027).setDepth(101);
    const title = this.add.text(168, 112, 'Bắt đầu hành trình mới?', {
      ...MENU_TEXT_STYLE, fontSize: '17px', color: '#f4dfad',
    }).setDepth(102);
    const warning = this.add.text(168, 147, 'Tiến trình đã lưu sẽ bị xóa.\nBạn có muốn bắt đầu lại?', {
      ...MENU_TEXT_STYLE, fontSize: '12px', color: '#efe6cf', lineSpacing: 6,
    }).setDepth(102);
    const hint = this.add.text(168, 242, '←→ Chọn · Enter Xác nhận · Esc Quay lại', {
      ...MENU_TEXT_STYLE, fontSize: '10px', color: '#d2c4a6',
    }).setDepth(102);
    this.confirmationObjects = [blocker, panel, title, warning, hint];
    this.confirmationButtons = ['Quay lại', 'Bắt đầu lại'].map((label, index) => {
      const button = this.add.text(168 + index * 174, 212, label, {
        ...MENU_TEXT_STYLE, fontSize: '14px', color: '#efe6cf',
      }).setOrigin(0, 0.5).setDepth(102).setInteractive({ useHandCursor: true });
      // A stationary cursor must not turn the safe default into a destructive Enter.
      // Mouse activation is explicit; keyboard selection changes only with direction keys.
      button.on('pointerdown', () => {
        this.confirmationIndex = index;
        this.chooseConfirmation();
      });
      this.confirmationObjects.push(button);
      return button;
    });
    this.refreshConfirmation();
  }

  private refreshConfirmation(): void {
    this.confirmationButtons.forEach((button, index) => {
      button.setColor(index === this.confirmationIndex ? '#e8c777' : '#efe6cf');
    });
  }

  private chooseConfirmation(): void {
    if (!this.confirmationOpen || this.leaving) return;
    const confirmed = this.confirmationIndex === 1;
    this.closeConfirmation();
    if (confirmed) this.beginNewGame();
  }

  private closeConfirmation(): void {
    this.confirmationOpen = false;
    this.confirmationObjects.forEach(object => object.destroy());
    this.confirmationObjects = [];
    this.confirmationButtons = [];
    this.selectionDot.setVisible(true);
    this.refreshMenuHighlight();
  }

  private beginNewGame(): void {
    if (this.leaving) return;
    this.leaving = true;
    CampaignSaveSystem.clear();
    SaveSystem.clear();
    SoundSystem.playLanternToggle(true);
    this.scene.start('CampaignScene', { newGame: true });
  }

  public continueGame(): void {
    if (this.confirmationOpen || this.leaving) return;
    this.leaving = true;
    if (CampaignSaveSystem.isCompleted()) {
      this.scene.start('EndingScene', { showCredits: true, campaign: true });
      return;
    }
    if (CampaignSaveSystem.hasSave()) {
      SoundSystem.playLanternToggle(true);
      this.scene.start('CampaignScene');
      return;
    }
    const saved = SaveSystem.load();
    SoundSystem.playLanternToggle(true);
    if (saved.stage === 'victory') {
      this.scene.start('EndingScene');
    } else {
      this.scene.start('WorldScene', { progress: saved });
    }
  }

}
