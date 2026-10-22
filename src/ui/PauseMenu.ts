import Phaser from 'phaser';
import { tr } from '../i18n/catalog.ts';
import { SoundSystem } from '../systems/SoundSystem';

type PauseAction = 'resume' | 'levels' | 'language' | 'restart' | 'sound' | 'menu';

/**
 * The level selector row, offered by CampaignScene only. `names` holds every level title; the row shows the level
 * chosen, and the choice stays within [0, getReached()]. WorldScene passes no selector and keeps its four rows.
 */
export interface PauseLevelSelector {
  readonly names: readonly string[];
  getCurrent(): number;
  getReached(): number;
  onSelect(index: number): void;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private items: Phaser.GameObjects.Text[] = [];
  private readonly actions: readonly PauseAction[];
  private readonly levels?: PauseLevelSelector;
  private selectedIndex = 0;
  private active = false;
  private confirmRestart = false;
  /** The level the selector row points at. Reset to the current level on every open(). */
  private levelChoice = 0;
  /** Set after the first press on a different level; the second press travels. */
  private confirmLevel = false;

  private onResume: () => void;
  private onRestart: () => void;
  private onMainMenu: () => void;
  /** Applies a locale change: the owner persists it and restarts the scene so every label redraws. */
  private onLanguageChange: () => void;

  constructor(
    scene: Phaser.Scene,
    callbacks: {
      onResume: () => void;
      onRestart: () => void;
      onMainMenu: () => void;
      onLanguageChange: () => void;
    },
    levels?: PauseLevelSelector
  ) {
    this.scene = scene;
    this.onResume = callbacks.onResume;
    this.onRestart = callbacks.onRestart;
    this.onMainMenu = callbacks.onMainMenu;
    this.onLanguageChange = callbacks.onLanguageChange;
    this.levels = levels;
    this.actions = levels
      ? ['resume', 'levels', 'language', 'restart', 'sound', 'menu']
      : ['resume', 'language', 'restart', 'sound', 'menu'];

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x051014, 0.88);
    this.bg.fillRect(0, 0, 640, 360);
    this.bg.fillStyle(0x091921, 0.96);
    this.bg.lineStyle(1.5, 0xd8b869, 0.9);
    this.bg.fillRoundedRect(180, 70, 280, 220, 8);
    this.bg.strokeRoundedRect(180, 70, 280, 220, 8);
    // The HUD keeps only contextual action chips, so the full key map lives here.
    this.bg.lineStyle(1, 0x3b5c63, 0.7);
    this.bg.lineBetween(196, 254, 444, 254);

    const title = scene.add.text(320, 102, tr('TẠM DỪNG (PAUSED)'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f7dfaa',
    });
    title.setOrigin(0.5, 0.5);

    // Six rows (with the language row) need a tighter step so they still clear the control legend.
    const rowStep = this.actions.length >= 6 ? 22 : levels ? 26 : 32;
    const rowTop = this.actions.length >= 6 ? 128 : levels ? 134 : 145;

    this.items = this.actions.map((action, idx) => {
      const txt = scene.add.text(320, rowTop + idx * rowStep, this.labelFor(action), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: action === 'levels' ? '11px' : '13px',
        color: '#cddbd8',
      });
      txt.setOrigin(0.5, 0.5);
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => {
        this.setSelected(idx);
        this.refreshHighlight();
      });
      txt.on('pointerdown', () => {
        this.setSelected(idx);
        this.triggerSelected();
      });
      return txt;
    });

    const controls = [
      tr('WASD/↑↓←→ Đi · ⇧ Chạy · E Tương tác · F Đèn'),
      tr('SPACE Xung sáng · J Sổ tay · H Gợi ý · ESC Tạm dừng'),
    ].map((line, idx) => {
      const txt = scene.add.text(320, 264 + idx * 13, line, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '8.5px',
        color: '#8fa9a4',
      });
      txt.setOrigin(0.5, 0.5);
      return txt;
    });

    this.container = scene.add.container(0, 0, [this.bg, title, ...this.items, ...controls]);
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
    this.confirmLevel = false;
    this.selectedIndex = 0;
    this.levelChoice = this.levels ? this.levels.getCurrent() : 0;
    this.refreshHighlight();
    this.container.setVisible(true);
  }

  public close(): void {
    this.active = false;
    this.confirmRestart = false;
    this.confirmLevel = false;
    this.container.setVisible(false);
  }

  public moveSelection(delta: number): void {
    if (!this.active) return;
    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.confirmRestart = false;
    this.confirmLevel = false;
    SoundSystem.playUiClick();
    this.refreshHighlight();
  }

  /** Steps the level choice on the selector row, within [0, reached] and wrapping. Only works while that row is selected. */
  public changeLevelChoice(delta: number): void {
    if (!this.active || !this.levels || this.actions[this.selectedIndex] !== 'levels') return;
    const count = this.levels.getReached() + 1;
    this.levelChoice = (((this.levelChoice + delta) % count) + count) % count;
    this.confirmLevel = false;
    SoundSystem.playUiClick();
    this.refreshHighlight();
  }

  public triggerSelected(): void {
    if (!this.active) return;
    SoundSystem.playUiClick();
    const action = this.actions[this.selectedIndex];
    if (action === 'resume') {
      this.close();
      this.onResume();
    } else if (action === 'levels') {
      this.activateLevels();
    } else if (action === 'language') {
      this.close();
      this.onLanguageChange();
    } else if (action === 'restart') {
      if (!this.confirmRestart) {
        this.confirmRestart = true;
        this.refreshHighlight();
      } else {
        this.close();
        this.onRestart();
      }
    } else if (action === 'sound') {
      SoundSystem.toggleMute();
      this.refreshHighlight();
    } else if (action === 'menu') {
      this.close();
      this.onMainMenu();
    }
  }

  /**
   * On the current level, a press only steps the choice to the next reached level, so a mouse can change it. On a
   * different level, the first press asks for confirmation and the second travels.
   */
  private activateLevels(): void {
    if (!this.levels) return;
    if (this.levelChoice === this.levels.getCurrent()) {
      this.changeLevelChoice(1);
      return;
    }
    if (!this.confirmLevel) {
      this.confirmLevel = true;
      this.refreshHighlight();
      return;
    }
    this.levels.onSelect(this.levelChoice);
    this.close();
  }

  /** Hover or click moves the selection. Moving to another row cancels a pending level confirmation. */
  private setSelected(idx: number): void {
    if (idx !== this.selectedIndex) this.confirmLevel = false;
    this.selectedIndex = idx;
  }

  private labelFor(action: PauseAction): string {
    if (action === 'resume') return tr('TIẾP TỤC (RESUME)');
    if (action === 'levels') return this.levelLabel();
    if (action === 'language') return tr('Ngôn ngữ: Tiếng Việt');
    if (action === 'restart') {
      return tr(this.confirmRestart ? tr('XÁC NHẬN CHƠI LẠI? (NHẤN LẦN NỮA)') : tr('CHƠI LẠI TỪ ĐẦU (RESTART)'));
    }
    if (action === 'sound') return tr(SoundSystem.isMuted() ? tr('ÂM THANH: TẮT') : tr('ÂM THANH: BẬT'));
    return tr('MÀN HÌNH CHÍNH (MAIN MENU)');
  }

  private levelLabel(): string {
    if (!this.levels) return '';
    const number = pad2(this.levelChoice + 1);
    if (this.confirmLevel) return tr('VÀO MÀN {number}? NHẤN LẦN NỮA', { number });
    const name = this.levels.names[this.levelChoice] ?? '';
    // With nothing else reachable there is nothing to step through, so the arrows are left off.
    return this.levels.getReached() > 0
      ? tr('MÀN: ◂ {number} · {name} ▸', { number, name })
      : tr('MÀN: {number} · {name}', { number, name });
  }

  private refreshHighlight(): void {
    this.items.forEach((item, idx) => {
      const action = this.actions[idx];
      const selected = idx === this.selectedIndex;
      // The level row carries its own arrows, so it is marked by colour alone.
      const label = this.labelFor(action);
      item.setText(selected && action !== 'levels' ? `▸ ${label} ◂` : label);
      item.setColor(selected ? '#ffe680' : '#cddbd8');
    });
  }
}
