import Phaser from 'phaser';
import { getLevelArtKey, getNhinhTexture } from '../art/CampaignArt';
import { SaveSystem } from '../systems/SaveSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { WorldFactory } from '../world/WorldFactory';
import { CampaignSaveSystem } from '../systems/CampaignSaveSystem';
import { RELEASE_POLICY } from '../config/releaseConfig';

type MenuMode = 'menu' | 'confirm-new-game';

const CONFIRM_LABELS = ['Quay lại', 'Bắt đầu lại'];
const NEW_GAME_CONFIRM_TEXT = 'Chơi mới sẽ xóa tiến trình đang lưu. Bạn có muốn tiếp tục?';

export class MenuScene extends Phaser.Scene {
  private selectionDot!: Phaser.GameObjects.Arc;
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private hasSavedGame = false;
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

  public create(): void {
    this.hasSavedGame = this.hasAnySave();
    this.selectedIndex = 0;
    this.starting = false;
    this.menuButtons = [];
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

    const backdropKey = getLevelArtKey(9, 'sanctuary-base');
    if (backdropKey && this.textures.exists(backdropKey)) {
      this.add.image(320, 180, backdropKey).setDisplaySize(640, 360).setDepth(0);
    } else {
      WorldFactory.buildZone(this, 'hub', 0, false);
    }

    // A continuous left veil, not a panel: let the forest remain the main image.
    const veil = this.add.graphics().setDepth(10);
    veil.fillStyle(0x04121a, 0.12);
    veil.fillRect(0, 0, 640, 360);
    for (let x = 0; x < 380; x += 2) {
      veil.fillStyle(0x04121a, 0.8 * Math.pow(1 - x / 380, 1.15));
      veil.fillRect(x, 0, 2, 360);
    }

    const halo = this.add.image(414, 288, 'light_radial').setDepth(19).setScale(0.8).setAlpha(0.72);
    const menuNhinh = getNhinhTexture('idle_lit', 'right', 0);
    if (!menuNhinh) throw new Error('Missing required Nhinh menu frame: idle_lit/right/0');
    this.add.sprite(418, 288, menuNhinh).setDepth(22);
    const lumo = this.add.sprite(458, 258, 'lumo_0').setDepth(25);
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      this.tweens.add({ targets: lumo, y: 254, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: halo, alpha: 0.61, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Sparse lights on the open path, not the gameplay weather over the menu text.
    for (const [index, [x, y]] of [[300, 184], [364, 235], [508, 138], [566, 270], [474, 314], [328, 94]].entries()) {
      const firefly = this.add.image(x, y, 'particle_firefly').setDepth(26).setScale(0.6).setAlpha(0.45);
      if (!reducedMotion) {
        this.tweens.add({ targets: firefly, y: y - 5, alpha: 0.75, duration: 2100 + index * 270, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    this.add.text(38, 48, 'THE LAST\nLANTERN', {
      fontFamily: 'Georgia, serif', fontSize: '29px', fontStyle: 'bold',
      color: '#f4dfad', lineSpacing: -2,
    }).setDepth(81);
    this.add.text(40, 124, 'Khu rừng ánh sáng', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#b9cec3',
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
        fontFamily: 'Segoe UI, sans-serif', fontSize: idx === items.length - 1 ? '12px' : '15px',
        color: '#c6d5ce',
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
      this.actions.push(item.action);
    });
    this.refreshMenuHighlight();

    this.add.text(38, 337, '↑↓ Chọn · Enter Xác nhận', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#b9cec3',
    }).setDepth(82);
    this.add.text(620, 347, RELEASE_POLICY.buildTag, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '9px', color: '#a8bdb5',
    }).setOrigin(1, 1).setDepth(82);

    this.buildNewGameConfirmation();
    this.wireInput();
  }

  /** Full-screen local warning keeps the redesigned menu visible behind it. */
  private buildNewGameConfirmation(): void {
    this.confirmBackdrop = this.add.rectangle(320, 180, 640, 360, 0x020b10, 0.78).setDepth(100);
    const panel = this.add.rectangle(320, 180, 360, 170, 0x0b2027).setDepth(101);
    const title = this.add.text(168, 112, 'Bắt đầu hành trình mới?', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '17px', color: '#f4dfad',
    }).setDepth(102);
    this.confirmText = this.add.text(168, 147, NEW_GAME_CONFIRM_TEXT, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#c6d5ce',
      wordWrap: { width: 304 }, lineSpacing: 6,
    }).setDepth(102);
    const hint = this.add.text(168, 242, '←→ Chọn · Enter Xác nhận · Esc Quay lại', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#a8bdb5',
    }).setDepth(102);
    this.confirmDecorations = [panel, title, hint];
    CONFIRM_LABELS.forEach((label, idx) => {
      const btn = this.add.text(168 + idx * 174, 212, label, {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#c6d5ce',
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
    return SoundSystem.isMuted() ? 'Âm thanh: Tắt' : 'Âm thanh: Bật';
  }

  private moveSelection(delta: number): void {
    if (this.menuMode === 'confirm-new-game') {
      this.confirmSelectedIndex = (this.confirmSelectedIndex + delta + 2) % 2;
      SoundSystem.playMirrorRotate();
      this.refreshMenuHighlight();
      return;
    }
    this.selectedIndex =
      (this.selectedIndex + delta + this.menuButtons.length) %
      this.menuButtons.length;
    SoundSystem.playMirrorRotate();
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
        btn.setText(CONFIRM_LABELS[idx]);
        btn.setColor(idx === this.confirmSelectedIndex ? '#ffe08b' : '#8fa8a0');
      });
      return;
    }
    this.menuButtons.forEach((btn, idx) => {
      if (idx === this.menuButtons.length - 1) btn.setText(this.soundLabel());
      btn.setColor(idx === this.selectedIndex ? '#f4dfad' : '#b9cec3');
    });
    const selected = this.menuButtons[this.selectedIndex];
    if (selected) this.selectionDot.setPosition(42, selected.y);
  }

  /**
   * Storage is re-queried at the destructive action, not only when the menu was
   * drawn: another tab can write a save after create() cached `hasSavedGame`.
   */
  private hasAnySave(): boolean {
    return CampaignSaveSystem.hasSave() || SaveSystem.hasSave();
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

  /** The only place New Game clears saves and starts the prologue. */
  private beginNewGame(): void {
    if (this.starting) return;
    this.starting = true;
    CampaignSaveSystem.clear();
    SaveSystem.clear();
    SoundSystem.playLanternToggle(true);
    this.scene.start('PrologueScene');
  }

  private requestNewGameConfirmation(): void {
    if (this.menuMode === 'confirm-new-game' || this.starting) return;
    this.selectedIndexBeforeConfirm = this.selectedIndex;
    this.menuMode = 'confirm-new-game';
    this.confirmSelectedIndex = 0;
    // Opened by keyboard: the activating key must be released first. Opened by
    // a click: the next click is already a distinct target and may confirm.
    this.confirmArmed = !this.activationViaKey;
    this.confirmText?.setText(NEW_GAME_CONFIRM_TEXT);
    this.setConfirmVisible(true);
    SoundSystem.playMirrorRotate();
  }

  private cancelNewGame(): void {
    if (this.menuMode !== 'confirm-new-game') return;
    this.menuMode = 'menu';
    this.confirmSelectedIndex = 0;
    this.confirmArmed = false;
    this.selectedIndex = this.selectedIndexBeforeConfirm;
    this.setConfirmVisible(false);
    SoundSystem.playMirrorRotate();
  }

  private confirmNewGame(): void {
    if (this.menuMode !== 'confirm-new-game' || this.starting) return;
    this.menuMode = 'menu';
    this.confirmArmed = false;
    this.setConfirmVisible(false);
    this.beginNewGame();
  }

  public continueGame(): void {
    if (this.menuMode === 'confirm-new-game' || this.starting) return;
    this.starting = true;
    if (RELEASE_POLICY.isDemo) {
      const campaignSave = CampaignSaveSystem.hasSave();
      // Out-of-range/completed campaigns are explained before any full-ending
      // dispatch; a legacy save is a different campaign the demo cannot resume.
      if (campaignSave
        && RELEASE_POLICY.isOutOfRange(CampaignSaveSystem.load().level, CampaignSaveSystem.isCompleted())) {
        this.openBlockedSaveMessage();
        return;
      }
      if (campaignSave) {
        SoundSystem.playLanternToggle(true);
        this.scene.start('CampaignScene');
        return;
      }
      if (SaveSystem.hasSave()) {
        this.openBlockedSaveMessage();
        return;
      }
    }
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

  /** Explains a save outside the demo slice without clearing or rewriting it. */
  private openBlockedSaveMessage(): void {
    SoundSystem.playLanternToggle(true);
    this.scene.start('ComingSoonScene', { mode: 'demo-save-blocked' });
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
