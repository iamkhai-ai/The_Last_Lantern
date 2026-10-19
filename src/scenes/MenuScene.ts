import Phaser from 'phaser';
import { getLevelArtKey, getNhinhTexture } from '../art/CampaignArt';
import { EffectsSystem } from '../systems/EffectsSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { WorldFactory } from '../world/WorldFactory';
import { CampaignSaveSystem } from '../systems/CampaignSaveSystem';
import { RELEASE_POLICY } from '../config/releaseConfig';

type MenuMode = 'menu' | 'confirm-new-game';

const CONFIRM_LABELS = ['HỦY', 'CHƠI MỚI'];
const NEW_GAME_CONFIRM_TEXT = 'Chơi mới sẽ xóa tiến trình đang lưu. Bạn có muốn tiếp tục?';

export class MenuScene extends Phaser.Scene {
  private effectsSystem!: EffectsSystem;
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private hasSavedGame = false;
  private actions: Array<() => void> = [];
  /** Guards a held/double-fired New Game activation from clearing or starting twice. */
  private starting = false;
  /**
   * Demo builds warn before New Game clears anything. `confirm` swaps the menu
   * rows for a local two-choice confirmation that defaults to Cancel; full
   * builds never enter it. It is a mode of this scene, not a second scene or a
   * general modal framework.
   */
  private menuMode: MenuMode = 'menu';
  private confirmSelectedIndex = 0;
  private confirmButtons: Phaser.GameObjects.Text[] = [];
  private confirmText?: Phaser.GameObjects.Text;
  private confirmBackdrop?: Phaser.GameObjects.Graphics;
  private selectedIndexBeforeConfirm = 0;
  /**
   * Keyboard confirmation needs a real release first: the key that opened the
   * warning must not also confirm it. Pointer confirmation is a distinct target
   * and does not depend on this flag.
   */
  private confirmArmed = false;
  private activationViaKey = false;
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
    this.selectedIndexBeforeConfirm = 0;
    this.confirmText = undefined;
    this.confirmBackdrop = undefined;

    const backdropKey = getLevelArtKey(9, 'sanctuary-base');
    if (backdropKey && this.textures.exists(backdropKey)) {
      const backdrop = this.add.image(320, 180, backdropKey);
      backdrop.setDepth(0);
      this.tweens.add({ targets: backdrop, scale: 1.06, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const veil = this.add.graphics().setDepth(10);
      veil.fillStyle(0x04121a, 0.22);
      veil.fillRect(0, 0, 640, 360);
      veil.fillStyle(0x04121a, 0.38);
      veil.fillRect(0, 0, 252, 360);
    } else {
      WorldFactory.buildZone(this, 'hub', 0, false);
    }

    const halo = this.add.image(330, 294, 'light_radial');
    halo.setDepth(19);
    halo.setScale(0.9);
    halo.setAlpha(0.8);

    const menuNhinh = getNhinhTexture('idle_lit', 'right', 0);
    if (!menuNhinh) throw new Error('Missing required Nhinh menu frame: idle_lit/right/0');
    const linh = this.add.sprite(334, 292, menuNhinh);
    linh.setDepth(22);

    const lumo = this.add.sprite(382, 264, 'lumo_0');
    lumo.setDepth(25);
    this.tweens.add({
      targets: lumo,
      y: 258,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.effectsSystem = new EffectsSystem(this);
    this.effectsSystem.setupZoneEffects('hub', false);

    // Top-left and top-right decorative HUD pills matching 00_cover.png
    const hudDecor = this.add.graphics();
    hudDecor.setDepth(75);
    hudDecor.fillStyle(0x0c1d24, 0.86);
    hudDecor.lineStyle(1, 0x3b5c63, 0.85);
    hudDecor.fillRoundedRect(14, 12, 166, 30, 5);
    hudDecor.strokeRoundedRect(14, 12, 166, 30, 5);
    hudDecor.fillRoundedRect(462, 12, 164, 30, 5);
    hudDecor.strokeRoundedRect(462, 12, 164, 30, 5);

    hudDecor.fillStyle(0xd8b869, 1);
    hudDecor.fillCircle(30, 27, 7.5);
    for (const cx of [60, 82, 104]) {
      hudDecor.fillStyle(0x3e5259, 1);
      hudDecor.beginPath();
      hudDecor.moveTo(cx, 17);
      hudDecor.lineTo(cx + 7, 27);
      hudDecor.lineTo(cx, 37);
      hudDecor.lineTo(cx - 7, 27);
      hudDecor.closePath();
      hudDecor.fillPath();
    }

    const topRightTitle = this.add.text(476, 27, RELEASE_POLICY.menuTag, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#cddbd8',
    });
    topRightTitle.setOrigin(0, 0.5);
    topRightTitle.setDepth(76);

    // Main Title Card on Left (matching 00_cover.png)
    const card = this.add.graphics();
    card.setDepth(80);
    card.fillStyle(0x07151c, 0.94);
    card.lineStyle(1.5, 0xc9be82, 0.9);
    card.fillRoundedRect(28, 38, 330, 148, 8);
    card.strokeRoundedRect(28, 38, 330, 148, 8);

    const title1 = this.add.text(46, 52, 'THE LAST\nLANTERN', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#f7dfaa',
      lineSpacing: -4,
    });
    title1.setDepth(81);

    const subVi = this.add.text(46, 134, 'KHU RỪNG ÁNH SÁNG', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#d7e6e1',
    });
    subVi.setDepth(81);

    const tagline = this.add.text(
      46,
      156,
      '2D TOP-DOWN  •  COZY MYSTERY  •  LIGHT PUZZLES',
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '9.5px',
        color: '#9eb8b2',
      }
    );
    tagline.setDepth(81);

    // Interactive Menu Panel below Title Card
    const menuPanel = this.add.graphics();
    menuPanel.setDepth(80);
    menuPanel.fillStyle(0x07151c, 0.92);
    menuPanel.lineStyle(1.2, 0x4d7370, 0.85);
    menuPanel.fillRoundedRect(28, 198, 250, 126, 7);
    menuPanel.strokeRoundedRect(28, 198, 250, 126, 7);

    const items: Array<{ label: string; action: () => void }> = [];

    if (this.hasSavedGame) {
      items.push({
        label: 'TIẾP TỤC (CONTINUE)',
        action: () => this.continueGame(),
      });
    }

    items.push({
      label: 'TRÒ CHƠI MỚI (NEW GAME)',
      action: () => this.startNewGame(),
    });

    items.push({
      label: SoundSystem.isMuted() ? 'ÂM THANH: TẮT' : 'ÂM THANH: BẬT',
      action: () => {
        SoundSystem.toggleMute();
        this.refreshMenuHighlight();
      },
    });

    items.forEach((item, idx) => {
      const btn = this.add.text(48, 218 + idx * 32, item.label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#cddbd8',
      });
      btn.setDepth(82);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        this.selectedIndex = idx;
        this.refreshMenuHighlight();
      });
      btn.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.actions[idx]?.();
      });
      this.menuButtons.push(btn);
      this.actions.push(item.action);
    });

    this.refreshMenuHighlight();

    const footerBackdrop = this.add.graphics();
    footerBackdrop.setDepth(81);
    footerBackdrop.fillStyle(0x07151c, 0.72);
    footerBackdrop.fillRoundedRect(24, 331, 336, 21, 4);

    const footerHint = this.add.text(
      28,
      338,
      'Nhấn [Enter / Space / E] hoặc Click chuột để chọn  •  [W/S] Di chuyển mục',
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#a8c4bd',
      }
    );
    footerHint.setDepth(82);

    const buildTag = this.add.text(626, 350, RELEASE_POLICY.buildTag, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '9px',
      color: '#7f9a94',
    });
    buildTag.setOrigin(1, 1);
    buildTag.setDepth(82);

    this.buildNewGameConfirmation();
    this.wireInput();
  }

  /** The local demo New Game warning, hidden until a save could be erased. */
  private buildNewGameConfirmation(): void {
    const backdrop = this.add.graphics();
    backdrop.setDepth(90);
    backdrop.fillStyle(0x07151c, 0.98);
    backdrop.lineStyle(1.5, 0xc9be82, 0.95);
    backdrop.fillRoundedRect(28, 198, 250, 126, 7);
    backdrop.strokeRoundedRect(28, 198, 250, 126, 7);
    backdrop.setVisible(false);
    this.confirmBackdrop = backdrop;

    const text = this.add.text(46, 208, NEW_GAME_CONFIRM_TEXT, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10.5px',
      fontStyle: 'bold',
      color: '#ffb4a2',
      wordWrap: { width: 214 },
      lineSpacing: 3,
    });
    text.setDepth(91);
    text.setVisible(false);
    this.confirmText = text;

    CONFIRM_LABELS.forEach((label, idx) => {
      const btn = this.add.text(48, 284 + idx * 22, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#cddbd8',
      });
      btn.setDepth(92);
      btn.setVisible(false);
      btn.on('pointerdown', this.onConfirmPointer(idx));
      this.confirmButtons.push(btn);
    });
  }

  private setConfirmVisible(visible: boolean): void {
    this.confirmBackdrop?.setVisible(visible);
    this.confirmText?.setVisible(visible);
    for (const btn of this.confirmButtons) {
      btn.setVisible(visible);
      if (visible) btn.setInteractive({ useHandCursor: true });
      else btn.disableInteractive();
    }
    for (const btn of this.menuButtons) {
      btn.setVisible(!visible);
      if (visible) btn.disableInteractive();
      else btn.setInteractive({ useHandCursor: true });
    }
    this.refreshMenuHighlight();
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
        const baseText = CONFIRM_LABELS[idx];
        if (idx === this.confirmSelectedIndex) {
          btn.setText(`▸ ${baseText}`);
          btn.setColor('#ffe680');
        } else {
          btn.setText(baseText);
          btn.setColor('#cddbd8');
        }
      });
      return;
    }
    const soundIdx = this.menuButtons.length - 1;
    this.menuButtons.forEach((btn, idx) => {
      let baseText = btn.text.replace(/^▸\s*/, '');
      if (idx === soundIdx) {
        baseText = SoundSystem.isMuted() ? 'ÂM THANH: TẮT' : 'ÂM THANH: BẬT';
      }
      if (idx === this.selectedIndex) {
        btn.setText(`▸ ${baseText}`);
        btn.setColor('#ffe680');
      } else {
        btn.setText(baseText);
        btn.setColor('#cddbd8');
      }
    });
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
    if (RELEASE_POLICY.isDemo && this.hasAnySave()) {
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
    this.onKey('keydown-ENTER', (event) => this.triggerSelected(event));
    this.onKey('keydown-SPACE', (event) => this.triggerSelected(event));
    this.onKey('keydown-E', (event) => this.triggerSelected(event));
    this.onKey('keyup-ENTER', (event) => this.armConfirm(event));
    this.onKey('keyup-SPACE', (event) => this.armConfirm(event));
    this.onKey('keyup-E', (event) => this.armConfirm(event));
  }

  private armConfirm(_event?: KeyboardEvent): void {
    if (this.menuMode === 'confirm-new-game') this.confirmArmed = true;
  }

  private onKey(event: string, handler: (event: KeyboardEvent) => void): void {
    if (!this.input?.keyboard) return;
    this.input.keyboard.on(event, handler);
    this.keyListeners.push({ event, handler });
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

  public update(_time: number, delta: number): void {
    this.effectsSystem?.update(delta);
  }
}
