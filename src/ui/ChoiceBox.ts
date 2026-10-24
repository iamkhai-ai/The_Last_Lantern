import Phaser from 'phaser';
import { tr } from '../i18n/catalog.ts';
import { SoundSystem } from '../systems/SoundSystem';

const FONT = 'Segoe UI, sans-serif';
const BOX_X = 404;
const BOX_Y = 136;
const BOX_WIDTH = 216;
const PAD = 12;
const ROW_HEIGHT = 20;
const HINT_GAP = 22;

/**
 * A small choice box in the dialogue box's style. While it is open it owns the navigation keys: the host routes
 * ↑/↓ or W/S to move, E/Space/Enter to confirm and ESC to cancel, and nothing else reaches the level.
 */
export class ChoiceBox {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private rows: Phaser.GameObjects.Text[] = [];
  private hint: Phaser.GameObjects.Text;
  private options: string[] = [];
  private selected = 0;
  private onPick: ((index: number | null) => void) | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.hint = scene.add.text(BOX_X + PAD, BOX_Y, '', {
      fontFamily: FONT,
      fontSize: '9px',
      color: '#9ec4bd',
    });
    this.container = scene.add.container(0, 0, [this.bg, this.hint]);
    this.container.setDepth(96);
    this.container.setVisible(false);
  }

  /** Shows the options with the first one selected. `onPick` runs once: with the index, or null on cancel. */
  public open(options: string[], onPick: (index: number | null) => void): void {
    if (options.length === 0) {
      onPick(null);
      return;
    }
    this.options = [...options];
    this.selected = 0;
    this.onPick = onPick;
    this.rebuild();
    this.container.setVisible(true);
  }

  public isOpen(): boolean {
    return this.onPick !== null;
  }

  /** Moves the selection by `delta` rows, stopping at the ends. */
  public move(delta: number): void {
    if (!this.isOpen()) return;
    const next = Math.max(0, Math.min(this.options.length - 1, this.selected + delta));
    if (next === this.selected) return;
    this.selected = next;
    SoundSystem.playUiClick();
    this.paintRows();
  }

  /** Confirms the selected option and closes the box. */
  public confirm(): void {
    const pick = this.onPick;
    if (!pick) return;
    const index = this.selected;
    this.close();
    SoundSystem.playUiClick();
    pick(index);
  }

  /** Closes the box without a choice. */
  public cancel(): void {
    const pick = this.onPick;
    if (!pick) return;
    this.close();
    SoundSystem.playUiCancel();
    pick(null);
  }

  private close(): void {
    this.onPick = null;
    this.options = [];
    this.container.setVisible(false);
  }

  /** Lays out the rows for the current options and redraws the frame. */
  private rebuild(): void {
    for (const row of this.rows) row.destroy();
    this.rows = this.options.map((_option, index) => {
      const text = this.scene.add.text(BOX_X + PAD, BOX_Y + PAD + index * ROW_HEIGHT, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#f5efe0',
      });
      this.container.add(text);
      return text;
    });
    this.hint.setText(tr('[↑↓ / W S] Chọn · [E] Xác nhận · [ESC] Hủy'));
    this.hint.setPosition(BOX_X + PAD, BOX_Y + PAD + this.options.length * ROW_HEIGHT + 2);
    const height = PAD * 2 + this.options.length * ROW_HEIGHT + HINT_GAP;
    this.bg.clear();
    this.bg.fillStyle(0x07141b, 0.94);
    this.bg.lineStyle(1.5, 0xd8b869, 0.85);
    this.bg.fillRoundedRect(BOX_X, BOX_Y, BOX_WIDTH, height, 7);
    this.bg.strokeRoundedRect(BOX_X, BOX_Y, BOX_WIDTH, height, 7);
    this.paintRows();
  }

  private paintRows(): void {
    this.rows.forEach((row, index) => {
      const marker = index === this.selected ? '▸ ' : '   ';
      row.setText(`${marker}${tr(this.options[index] ?? '')}`);
      row.setColor(index === this.selected ? '#f2d678' : '#f5efe0');
    });
  }
}
