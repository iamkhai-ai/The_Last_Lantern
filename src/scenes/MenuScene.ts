import Phaser from 'phaser';
import menuDawnUrl from '../../Art_References/07_The_Last_Dawn.png?url';
import { tr } from '../i18n/catalog.ts';
import { getLocale, otherLocale, setLocale } from '../i18n/locale.ts';
import { SoundSystem } from '../systems/SoundSystem';
import { RELEASE_POLICY } from '../config/releaseConfig';
import { V4SaveStore } from '../v4/core/save';
import { safeLocalStorage } from '../v4/scene/browserStorage';

type MenuMode = 'menu' | 'confirm-new-game';

const CONFIRM_LABELS = ['Quay lại', 'Bắt đầu lại'];
const NEW_GAME_CONFIRM_TEXT = 'Chơi mới sẽ xóa tiến trình đang lưu. Bạn có muốn tiếp tục?';

const MENU_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Bitter, serif', fontStyle: '500',
  shadow: { offsetX: 0, offsetY: 1, color: '#10180f', blur: 1, stroke: false, fill: true },
};

export class MenuScene extends Phaser.Scene {
  private selectionDot!: Phaser.GameObjects.Arc;
  private menuButtons: Phaser.GameObjects.Text[] = [];
  /** Label getters, one per menu row, so a toggle redraws every label from its live state. */
  private itemLabels: Array<() => string> = [];
  private selectedIndex = 0;
  private actions: Array<() => void> = [];
  /** Guards a held/double-fired New Game activation from clearing or starting twice. */
  private starting = false;
  /** Both build flavors confirm before deleting any existing save. */
  private menuMode: MenuMode = 'menu';
  private confirmSelectedIndex = 0;
  private confirmButtons: Phaser.GameObjects.Text[] = [];
  private confirmText?: Phaser.GameObjects.Text;
  private confirmBackdrop?: Phaser.GameObjects.Rectangle;
  private confirmDecorations: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];
  private selectedIndexBeforeConfirm = 0;
  /**
   * Keyboard confirmation needs a real release first: the key that opened the
   * warning must not also confirm it. Pointer confirmation is a distinct target
   * and does not depend on this flag.
   */
  private confirmArmed = false;
  private activationViaKey = false;
  private activationKeyCode?: string;
  /** This scene's own shutdown hook, kept so it can be removed by identity. */
  private shutdownHandler?: () => void;
  private keyListeners: Array<{ event: string; handler: (event: KeyboardEvent) => void }> = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  public preload(): void {
    if (!this.textures.exists('menu_dawn')) this.load.image('menu_dawn', menuDawnUrl);
  }

  public create(): void {
    this.selectedIndex = 0;
    this.starting = false;
    this.menuButtons = [];
    this.itemLabels = [];
    this.actions = [];
    this.confirmButtons = [];
    this.menuMode = 'menu';
    this.confirmSelectedIndex = 0;
    this.confirmArmed = false;
    this.activationViaKey = false;
    this.activationKeyCode = undefined;
    this.selectedIndexBeforeConfirm = 0;
    this.confirmText = undefined;
    this.confirmBackdrop = undefined;
    this.confirmDecorations = [];
    this.input.setTopOnly(true);

    if (this.textures.exists('menu_dawn')) {
      this.add.image(320, 180, 'menu_dawn').setDisplaySize(640, 360).setDepth(0);
    } else {
      this.add.rectangle(320, 180, 640, 360, 0x081d26).setDepth(0);
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
    this.add.text(40, 124, tr('Khu rừng ánh sáng'), {
      ...MENU_TEXT_STYLE, fontSize: '12px', color: '#efe6cf',
    }).setDepth(81);

    // Continue is offered only when a V4 save exists, and it is the default row then.
    const items: Array<{ label: () => string; action: () => void }> = [];
    if (this.hasAnySave()) items.push({ label: () => tr('Tiếp tục'), action: () => this.continueGame() });
    items.push({ label: () => tr('Hành trình mới'), action: () => this.startNewGame() });
    items.push({
      label: () => this.soundLabel(),
      action: () => { SoundSystem.toggleMute(); this.refreshMenuHighlight(); },
    });
    items.push({ label: () => this.languageLabel(), action: () => this.toggleLanguage() });
    this.selectionDot = this.add.circle(42, 198, 2.5, 0xe8c777).setDepth(82);
    items.forEach((item, idx) => {
      const btn = this.add.text(56, 198 + idx * 33, item.label(), {
        ...MENU_TEXT_STYLE, fontSize: idx === items.length - 1 ? '12px' : '15px',
        color: '#efe6cf',
      }).setOrigin(0, 0.5).setDepth(82).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        if (this.menuMode === 'confirm-new-game' || this.starting) return;
        this.selectedIndex = idx;
        this.refreshMenuHighlight();
      });
      btn.on('pointerdown', () => {
        if (this.menuMode === 'confirm-new-game' || this.starting) return;
        this.selectedIndex = idx;
        this.triggerSelected();
      });
      this.menuButtons.push(btn);
      this.itemLabels.push(item.label);
      this.actions.push(item.action);
    });
    this.refreshMenuHighlight();

    this.add.text(38, 337, tr('↑↓ Chọn · Enter Xác nhận'), {
      ...MENU_TEXT_STYLE, fontSize: '10px', color: '#efe6cf',
    }).setDepth(82);
    this.add.text(620, 347, tr(RELEASE_POLICY.buildTag), {
      ...MENU_TEXT_STYLE, fontSize: '9px', color: '#d2c4a6',
    }).setOrigin(1, 1).setDepth(82);

    this.buildNewGameConfirmation();
    this.wireInput();
  }

  /** Full-screen local warning keeps the redesigned menu visible behind it. */
  private buildNewGameConfirmation(): void {
    this.confirmBackdrop = this.add.rectangle(320, 180, 640, 360, 0x020b10, 0.78).setDepth(100);
    // Bitter is wider than the previous face: size the panel so the approved
    // warning sentence stays on one line instead of splitting "tiếp tục".
    const panel = this.add.rectangle(320, 180, 376, 170, 0x0b2027).setDepth(101);
    const title = this.add.text(168, 112, tr('Bắt đầu hành trình mới?'), {
      ...MENU_TEXT_STYLE, fontSize: '17px', color: '#f4dfad',
    }).setDepth(102);
    this.confirmText = this.add.text(168, 147, tr(NEW_GAME_CONFIRM_TEXT), {
      ...MENU_TEXT_STYLE, fontSize: '12px', color: '#efe6cf',
      wordWrap: { width: 328 }, lineSpacing: 6,
    }).setDepth(102);
    const hint = this.add.text(168, 242, tr('←→ Chọn · Enter Xác nhận · Esc Quay lại'), {
      ...MENU_TEXT_STYLE, fontSize: '10px', color: '#d2c4a6',
    }).setDepth(102);
    this.confirmDecorations = [panel, title, hint];
    CONFIRM_LABELS.forEach((label, idx) => {
      const btn = this.add.text(168 + idx * 174, 212, tr(label), {
        ...MENU_TEXT_STYLE, fontSize: '14px', color: '#efe6cf',
      }).setOrigin(0, 0.5).setDepth(102);
      // Hover must not turn the safe default into a destructive keyboard action.
      btn.on('pointerdown', this.onConfirmPointer(idx));
      this.confirmButtons.push(btn);
    });
    this.setConfirmVisible(false);
  }

  private setConfirmVisible(visible: boolean): void {
    this.confirmBackdrop?.setVisible(visible);
    if (visible) this.confirmBackdrop?.setInteractive();
    else this.confirmBackdrop?.disableInteractive();
    this.confirmText?.setVisible(visible);
    for (const object of this.confirmDecorations) object.setVisible(visible);
    for (const btn of this.confirmButtons) {
      btn.setVisible(visible);
      if (visible) btn.setInteractive({ useHandCursor: true });
      else btn.disableInteractive();
    }
    for (const btn of this.menuButtons) {
      if (visible) btn.disableInteractive();
      else btn.setInteractive({ useHandCursor: true });
    }
    this.selectionDot.setVisible(!visible);
    this.refreshMenuHighlight();
  }

  private soundLabel(): string {
    return tr(SoundSystem.isMuted() ? tr('Âm thanh: Tắt') : tr('Âm thanh: Bật'));
  }

  private languageLabel(): string {
    return tr('Ngôn ngữ: Tiếng Việt');
  }

  /** Flips the locale and rebuilds the menu, so every label is drawn in the new language. */
  private toggleLanguage(): void {
    setLocale(otherLocale(getLocale()));
    SoundSystem.playUiClick();
    this.scene.restart();
  }

  private moveSelection(delta: number): void {
    if (this.menuMode === 'confirm-new-game') {
      this.confirmSelectedIndex = (this.confirmSelectedIndex + delta + 2) % 2;
      SoundSystem.playUiClick();
      this.refreshMenuHighlight();
      return;
    }
    this.selectedIndex =
      (this.selectedIndex + delta + this.menuButtons.length) %
      this.menuButtons.length;
    SoundSystem.playUiClick();
    this.refreshMenuHighlight();
  }

  private triggerSelected(event?: KeyboardEvent): void {
    // Auto-repeats never act. A fresh-looking keydown while the activation key
    // is still physically down cannot confirm either: `confirmArmed` only flips
    // on that key's release (or when the warning was opened by pointer).
    if (event?.repeat) return;
    if (this.menuMode === 'confirm-new-game') {
      if (!this.confirmArmed) return;
      this.activateConfirm(this.confirmSelectedIndex);
      return;
    }
    this.activationViaKey = event !== undefined;
    this.activationKeyCode = event?.code;
    try {
      this.actions[this.selectedIndex]?.();
    } finally {
      this.activationViaKey = false;
    }
  }

  private activateConfirm(index: number): void {
    if (this.menuMode !== 'confirm-new-game') return;
    this.confirmSelectedIndex = index;
    if (index === 0) this.cancelNewGame();
    else this.confirmNewGame();
  }

  /** Confirm rows use a distinct target, so a click acts without the key gate. */
  private onConfirmPointer(index: number): () => void {
    return () => this.activateConfirm(index);
  }

  private refreshMenuHighlight(): void {
    if (this.menuMode === 'confirm-new-game') {
      this.confirmButtons.forEach((btn, idx) => {
        btn.setText(tr(CONFIRM_LABELS[idx]));
        btn.setColor(idx === this.confirmSelectedIndex ? '#e8c777' : '#efe6cf');
      });
      return;
    }
    this.menuButtons.forEach((btn, idx) => {
      // Label getters are absent only in the source-level harness that binds these methods directly.
      const label = this.itemLabels?.[idx]?.();
      if (label !== undefined) btn.setText(label);
      btn.setColor(idx === this.selectedIndex ? '#e8c777' : '#efe6cf');
    });
    const selected = this.menuButtons[this.selectedIndex];
    if (selected) this.selectionDot.setPosition(42, selected.y);
  }

  /**
   * Whether a readable V4 save exists. The destructive action re-queries it, so a save written after create() is still seen.
   * Old V2 save keys are neither read nor deleted.
   */
  private hasAnySave(): boolean {
    return new V4SaveStore(safeLocalStorage()).hasSave();
  }

  public startNewGame(): void {
    if (this.starting) return;
    if (this.menuMode === 'confirm-new-game') return;
    if (this.hasAnySave()) {
      this.requestNewGameConfirmation();
      return;
    }
    this.beginNewGame();
  }

  /** The only place New Game starts a new run in V4. It clears the V4 save once, then starts the scene fresh. */
  private beginNewGame(): void {
    if (this.starting) return;
    this.starting = true;
    new V4SaveStore(safeLocalStorage()).clear();
    SoundSystem.playLanternToggle(true);
    this.scene.start('V4Scene', { newGame: true });
  }

  private requestNewGameConfirmation(): void {
    if (this.menuMode === 'confirm-new-game' || this.starting) return;
    this.selectedIndexBeforeConfirm = this.selectedIndex;
    this.menuMode = 'confirm-new-game';
    this.confirmSelectedIndex = 0;
    // Opened by keyboard: the activating key must be released first. Opened by
    // a click: the next click is already a distinct target and may confirm.
    this.confirmArmed = !this.activationViaKey;
    this.confirmText?.setText(tr(NEW_GAME_CONFIRM_TEXT));
    this.setConfirmVisible(true);
    SoundSystem.playUiClick();
  }

  private cancelNewGame(): void {
    if (this.menuMode !== 'confirm-new-game') return;
    this.menuMode = 'menu';
    this.confirmSelectedIndex = 0;
    this.confirmArmed = false;
    this.selectedIndex = this.selectedIndexBeforeConfirm;
    this.setConfirmVisible(false);
    SoundSystem.playUiCancel();
  }

  private confirmNewGame(): void {
    if (this.menuMode !== 'confirm-new-game' || this.starting) return;
    this.menuMode = 'menu';
    this.confirmArmed = false;
    this.setConfirmVisible(false);
    this.beginNewGame();
  }

  /** Resumes the V4 scene from its save. Offered only when a save exists. */
  public continueGame(): void {
    if (this.menuMode === 'confirm-new-game' || this.starting) return;
    this.starting = true;
    SoundSystem.playLanternToggle(true);
    this.scene.start('V4Scene');
  }

  private wireInput(): void {
    this.clearKeyListeners();
    this.registerShutdownGuard();
    if (!this.input?.keyboard) return;
    this.onKey('keydown-UP', (event) => {
      if (event?.repeat) return;
      this.moveSelection(-1);
    });
    this.onKey('keydown-W', (event) => {
      if (event?.repeat) return;
      this.moveSelection(-1);
    });
    this.onKey('keydown-DOWN', (event) => {
      if (event?.repeat) return;
      this.moveSelection(1);
    });
    this.onKey('keydown-S', (event) => {
      if (event?.repeat) return;
      this.moveSelection(1);
    });
    this.onKey('keydown-LEFT', (event) => {
      if (!event?.repeat && this.menuMode === 'confirm-new-game') this.moveSelection(-1);
    });
    this.onKey('keydown-RIGHT', (event) => {
      if (!event?.repeat && this.menuMode === 'confirm-new-game') this.moveSelection(1);
    });
    this.onKey('keydown-ESC', (event) => {
      if (!event?.repeat) this.cancelNewGame();
    });
    this.onKey('keydown-ENTER', (event) => this.triggerSelected(event));
    this.onKey('keydown-SPACE', (event) => this.triggerSelected(event));
    this.onKey('keydown-E', (event) => this.triggerSelected(event));
    this.onKey('keyup-ENTER', (event) => this.armConfirm(event));
    this.onKey('keyup-SPACE', (event) => this.armConfirm(event));
    this.onKey('keyup-E', (event) => this.armConfirm(event));
  }

  private armConfirm(event?: KeyboardEvent): void {
    if (this.menuMode === 'confirm-new-game' && event?.code === this.activationKeyCode) {
      this.confirmArmed = true;
    }
  }

  private onKey(event: string, handler: (event: KeyboardEvent) => void): void {
    if (!this.input?.keyboard) return;
    const wrapped = (key: KeyboardEvent) => {
      key?.preventDefault?.();
      handler(key);
    };
    this.input.keyboard.on(event, wrapped);
    this.keyListeners.push({ event, handler: wrapped });
  }

  private clearKeyListeners(): void {
    if (this.input?.keyboard) {
      for (const listener of this.keyListeners) this.input.keyboard.off(listener.event, listener.handler);
    }
    this.keyListeners = [];
  }

  private registerShutdownGuard(): void {
    if (!this.events) return;
    this.clearShutdownGuard();
    this.shutdownHandler = () => this.teardownInput();
    this.events.once('shutdown', this.shutdownHandler, this);
  }

  private clearShutdownGuard(): void {
    if (!this.shutdownHandler) return;
    this.events?.off('shutdown', this.shutdownHandler, this);
    this.shutdownHandler = undefined;
  }

  private teardownInput(): void {
    this.clearKeyListeners();
    this.clearShutdownGuard();
  }

}
