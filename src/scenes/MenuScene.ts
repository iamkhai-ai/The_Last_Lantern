import Phaser from 'phaser';
import { EffectsSystem } from '../systems/EffectsSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { WorldFactory } from '../world/WorldFactory';
import { CampaignSaveSystem } from '../systems/CampaignSaveSystem';

export class MenuScene extends Phaser.Scene {
  private effectsSystem!: EffectsSystem;
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private hasSavedGame = false;
  private actions: Array<() => void> = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  public create(): void {
    this.hasSavedGame = CampaignSaveSystem.hasSave() || SaveSystem.hasSave();
    this.selectedIndex = 0;
    this.menuButtons = [];
    this.actions = [];

    // Build atmospheric Heart Tree Night scene matching 00_cover.png
    WorldFactory.buildZone(this, 'hub', 0, false);

    // Linh & Lumo standing before the Heart Tree with warm lantern glow
    const halo = this.add.image(312, 298, 'light_radial');
    halo.setDepth(19);
    halo.setScale(0.85);
    halo.setAlpha(0.85);

    const linh = this.add.sprite(306, 295, 'player_right_lit_0');
    linh.setDepth(22);

    const lumo = this.add.sprite(362, 268, 'lumo_0');
    lumo.setDepth(25);
    this.tweens.add({
      targets: lumo,
      y: 262,
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

    const topRightTitle = this.add.text(476, 27, 'THE HEART TREE', {
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

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => this.moveSelection(-1));
      this.input.keyboard.on('keydown-W', () => this.moveSelection(-1));
      this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(1));
      this.input.keyboard.on('keydown-S', () => this.moveSelection(1));
      this.input.keyboard.on('keydown-ENTER', () => this.triggerSelected());
      this.input.keyboard.on('keydown-SPACE', () => this.triggerSelected());
      this.input.keyboard.on('keydown-E', () => this.triggerSelected());
    }
  }

  private moveSelection(delta: number): void {
    this.selectedIndex =
      (this.selectedIndex + delta + this.menuButtons.length) %
      this.menuButtons.length;
    SoundSystem.playMirrorRotate();
    this.refreshMenuHighlight();
  }

  private triggerSelected(): void {
    this.actions[this.selectedIndex]?.();
  }

  private refreshMenuHighlight(): void {
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

  public startNewGame(): void {
    CampaignSaveSystem.clear();
    SaveSystem.clear();
    SoundSystem.playLanternToggle(true);
    this.scene.start('CampaignScene', { newGame: true });
  }

  public continueGame(): void {
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

  public update(_time: number, delta: number): void {
    this.effectsSystem?.update(delta);
  }
}
