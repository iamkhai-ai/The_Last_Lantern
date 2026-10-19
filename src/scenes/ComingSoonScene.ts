import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import { EffectsSystem } from '../systems/EffectsSystem';
import { SoundSystem } from '../systems/SoundSystem';

/**
 * Two authored demo modes share the existing composition:
 *  - `demo-complete`: the demo slice ended after Shattered Creek (index 3);
 *  - `demo-save-blocked`: the saved run is outside the demo slice (or legacy),
 *    and nothing on this screen may clear, rewrite or clamp it.
 *
 * `unavailable` is the neutral fallback if a caller ever routes here without a
 * mode. It makes no claim that later levels are undeveloped: all ten levels are
 * authored in the full build. This screen has no save-system dependency at all.
 */
type ComingSoonMode = 'demo-complete' | 'demo-save-blocked' | 'unavailable';

interface ComingSoonCopy {
  title: string;
  subtitle: string;
  body: string;
  note: string;
}

const COPY: Record<ComingSoonMode, ComingSoonCopy> = {
  'demo-complete': {
    title: 'BẢN CHƠI THỬ ĐẾN ĐÂY LÀ HẾT',
    subtitle: 'MÀN 01–04 · BẢN CHƠI THỬ',
    body: 'Cảm ơn bạn đã khám phá 4 màn đầu tiên. Hành trình của Nhinh và Lumo vẫn còn tiếp tục.',
    note: '',
  },
  'demo-save-blocked': {
    title: 'BẢN LƯU NÀY NGOÀI BẢN CHƠI THỬ',
    subtitle: 'TIẾN TRÌNH HIỆN TẠI KHÔNG THUỘC 4 MÀN ĐẦU',
    body: 'Bản lưu hiện tại nằm ngoài phạm vi bản chơi thử hoặc thuộc phiên bản cũ.',
    note: 'Tiến trình của bạn vẫn được giữ nguyên — chưa có thao tác nào xóa hay ghi đè.',
  },
  unavailable: {
    title: 'MÀN NÀY CHƯA MỞ TRONG BẢN CHƠI NÀY',
    subtitle: '',
    body: 'Bản chơi hiện tại không mở màn này.',
    note: 'Không có dữ liệu lưu nào bị thay đổi.',
  },
};

const BUTTON_LABEL = '▸ VỀ MÀN HÌNH CHÍNH';

export class ComingSoonScene extends Phaser.Scene {
  private effectsSystem!: EffectsSystem;
  private button!: Phaser.GameObjects.Text;
  private leaving = false;
  /** This scene's own shutdown hook, kept so it can be removed by identity. */
  private shutdownHandler?: () => void;
  private keyListeners: Array<{ event: string; handler: (event: KeyboardEvent) => void }> = [];

  constructor() {
    super({ key: 'ComingSoonScene' });
  }

  public create(data?: { mode?: ComingSoonMode }): void {
    const mode: ComingSoonMode = data?.mode === 'demo-complete' || data?.mode === 'demo-save-blocked'
      ? data.mode
      : 'unavailable';
    const copy = COPY[mode];
    this.leaving = false;

    const backdropKey = getLevelArtKey(4, 'station-scene-base');
    if (backdropKey && this.textures.exists(backdropKey)) {
      const backdrop = this.add.image(320, 180, backdropKey);
      backdrop.setDepth(0);
      backdrop.setTint(0x8fa3ae);
      this.tweens.add({ targets: backdrop, scale: 1.05, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const veil = this.add.graphics().setDepth(10);
    veil.fillStyle(0x04121a, 0.6);
    veil.fillRect(0, 0, 640, 360);

    this.effectsSystem = new EffectsSystem(this);
    this.effectsSystem.setupZoneEffects('creek', false);

    const panel = this.add.graphics().setDepth(80);
    panel.fillStyle(0x07151c, 0.94);
    panel.lineStyle(1.5, 0xc9be82, 0.9);
    panel.fillRoundedRect(88, 74, 464, 212, 10);
    panel.strokeRoundedRect(88, 74, 464, 212, 10);

    const overline = this.add.text(320, 94, 'THE LAST LANTERN · BẢN CHƠI THỬ', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '9.5px',
      color: '#9eb8b2',
    });
    overline.setOrigin(0.5);
    overline.setDepth(81);

    const title = this.add.text(320, 122, copy.title, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: mode === 'demo-complete' ? '19px' : '17px',
      fontStyle: 'bold',
      color: '#f7dfaa',
    });
    title.setOrigin(0.5);
    title.setDepth(81);

    const divider = this.add.graphics().setDepth(81);
    divider.lineStyle(1, 0x3b5c63, 0.9);
    divider.lineBetween(150, 144, 490, 144);

    const subtitle = this.add.text(320, 160, copy.subtitle, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#d7e6e1',
    });
    subtitle.setOrigin(0.5);
    subtitle.setDepth(81);

    const body = this.add.text(320, 192, copy.body, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#cddbd8',
      align: 'center',
      wordWrap: { width: 400 },
    });
    body.setOrigin(0.5);
    body.setDepth(81);

    const note = this.add.text(320, 224, copy.note, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10.5px',
      color: '#9eb8b2',
      align: 'center',
      wordWrap: { width: 400 },
    });
    note.setOrigin(0.5);
    note.setDepth(81);
    note.setVisible(copy.note !== '');

    this.button = this.add.text(320, 258, BUTTON_LABEL, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffe680',
    });
    this.button.setOrigin(0.5);
    this.button.setDepth(82);
    this.button.setInteractive({ useHandCursor: true });
    this.button.on('pointerover', () => this.button.setColor('#fff3bd'));
    this.button.on('pointerout', () => this.button.setColor('#ffe680'));
    this.button.on('pointerdown', () => this.backToMenu());

    const hint = this.add.text(320, 338, '[E / Enter / ESC] Quay về màn hình chính', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#a8c4bd',
    });
    hint.setOrigin(0.5);
    hint.setDepth(82);

    this.wireInput();
  }

  private wireInput(): void {
    this.clearKeyListeners();
    this.registerShutdownGuard();
    if (!this.input?.keyboard) return;
    this.onKey('keydown-E', () => this.backToMenu());
    this.onKey('keydown-ENTER', () => this.backToMenu());
    this.onKey('keydown-SPACE', () => this.backToMenu());
    this.onKey('keydown-ESC', () => this.backToMenu());
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

  /**
   * Removes this scene's hook and nothing else. `this.events` is
   * `scene.sys.events`, where every core scene plugin registers its teardown at
   * scene START; `off(event)` with no handler would clear those too.
   */
  private clearShutdownGuard(): void {
    if (!this.shutdownHandler) return;
    this.events?.off('shutdown', this.shutdownHandler, this);
    this.shutdownHandler = undefined;
  }

  private teardownInput(): void {
    this.clearKeyListeners();
    this.clearShutdownGuard();
  }

  private backToMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    SoundSystem.playLanternToggle(true);
    this.scene.start('MenuScene');
  }

  public update(_time: number, delta: number): void {
    this.effectsSystem?.update(delta);
  }
}
