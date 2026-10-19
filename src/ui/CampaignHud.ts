import type Phaser from 'phaser';

export type HudKeyId = 'move' | 'run' | 'interact' | 'lantern' | 'pulse' | 'journal' | 'hint' | 'pause';

/** Campaign levels where SPACE really fires a lantern pulse. */
export const PULSE_LEVELS: readonly number[] = [0, 1, 8, 9];

const FONT = 'Segoe UI, sans-serif';
const PANEL_FILL = 0x0c1d24;
const PANEL_ALPHA = 0.88;
const PANEL_STROKE = 0x3b5c63;
const STROKE_ALPHA = 0.85;
const AMBER = '#f7dfaa';
const BODY = '#e5eee8';
const STATUS = '#d3e5dc';
const MINT = '#b8f5d4';
const HINT = '#ffe680';
const KEY_TEXT = '#d8e3da';
const KEY_FACE = 0x122b33;
const PULSE_READY = 0x7df2d4;
const PULSE_COOLING = 0xd8b869;
const PULSE_READY_CSS = '#7df2d4';
const PULSE_COOLING_CSS = '#d8b869';

const PANEL_RADIUS = 5;
const TOP_X = 12;
const TOP_Y = 8;
const TOP_MIN_WIDTH = 240;
const TOP_MAX_WIDTH = 420;
const TOP_MAX_HEIGHT = 100;
const TOP_PAD_X = 8;
const TOP_PAD_Y = 6;
const TOP_LINE_GAP = 2;
const LUMO_X = 628;
const LUMO_Y = 8;
const LUMO_PAD_X = 7;
const LUMO_PAD_Y = 5;
const STATUS_X = 12;
const STATUS_BOTTOM = 334;
const STATUS_PAD_X = 7;
const STATUS_PAD_Y = 2;
const STATUS_MAX_WIDTH = 540;
const ROW_LEFT = 12;
const ROW_RIGHT = 628;
const KEYS_X = 320;
const KEYS_Y = 347;
const CHIP_HEIGHT = 18;
const CHIP_GAP = 6;
const CHIP_PAD_LEFT = 5;
const CHIP_PAD_RIGHT = 6;
const CHIP_KEY_GAP = 4;
// The pulse badge lives in the 24px band between the status row (bottom 333)
// and the canvas edge, so its arc and ready ring must stay inside it.
const PULSE_BADGE_RADIUS = 8;
const PULSE_ARC_RADIUS = 10;
const PULSE_ARC_STROKE = 2;
const PULSE_FLASH_RADIUS = 11;
const PULSE_FLASH_STROKE = 1;
const PULSE_OUTER = PULSE_FLASH_RADIUS + PULSE_FLASH_STROKE / 2;
const PULSE_BADGE_X = PULSE_OUTER;
const PULSE_LABEL_X = PULSE_OUTER * 2 + CHIP_KEY_GAP;
const PULSE_FLASH_MS = 600;
const PULSE_SHAKE_MS = 320;
const PULSE_COOLDOWN_MS = 3000;
const TOAST_X = 320;
const TOAST_Y = 64;
const TOAST_GAP = 4;
const TOAST_PAD_X = 10;
const TOAST_PAD_Y = 4;
const TOAST_DEFAULT_MS = 2600;
const TOAST_MAX_WIDTH = 520;

/**
 * Fixed HUD geometry, exported so the source-only checks can prove the pulse
 * badge, its ready ring and the whole key row stay on the 640x360 canvas.
 */
export const HUD_LAYOUT = {
  rowLeft: ROW_LEFT,
  rowRight: ROW_RIGHT,
  rowCenter: KEYS_X,
  keysY: KEYS_Y,
  chipHeight: CHIP_HEIGHT,
  badgeRadius: PULSE_BADGE_RADIUS,
  arcRadius: PULSE_ARC_RADIUS,
  arcStroke: PULSE_ARC_STROKE,
  flashRadius: PULSE_FLASH_RADIUS,
  flashStroke: PULSE_FLASH_STROKE,
  statusBottom: STATUS_BOTTOM,
  toastY: TOAST_Y,
} as const;

/** Left edge of the key row: centred on KEYS_X but never outside [ROW_LEFT, ROW_RIGHT]. */
export function centerKeyRow(totalWidth: number): number {
  const centred = Math.round(KEYS_X - totalWidth / 2);
  return Math.max(ROW_LEFT, Math.min(ROW_RIGHT - totalWidth, centred));
}

const KEY_ORDER: readonly HudKeyId[] = ['move', 'run', 'interact', 'lantern', 'pulse', 'journal', 'hint', 'pause'];
const KEY_DEFS: Record<HudKeyId, { key: string; label: string }> = {
  move: { key: 'WASD', label: 'Đi' },
  run: { key: '⇧', label: 'Chạy' },
  interact: { key: 'E', label: 'Tương tác' },
  lantern: { key: 'F', label: 'Đèn' },
  pulse: { key: 'SPACE', label: 'Pulse' },
  journal: { key: 'J', label: 'Sổ tay' },
  hint: { key: 'H', label: 'Gợi ý' },
  pause: { key: 'ESC', label: 'Tạm dừng' },
};

/**
 * The campaign's single HUD. It owns every panel, chip and toast it creates and
 * reads gameplay state only through its setters, so scenes and level controllers
 * never draw their own campaign chrome.
 */
export class CampaignHud {
  private readonly scene: Phaser.Scene;
  private readonly panelLayer: Phaser.GameObjects.Container;
  private readonly chipLayer: Phaser.GameObjects.Container;
  private readonly toastLayer: Phaser.GameObjects.Container;
  private readonly panelGraphics: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly lumoText: Phaser.GameObjects.Text;
  private readonly chipGraphics: Phaser.GameObjects.Graphics;
  private readonly keyTexts = new Map<HudKeyId, Phaser.GameObjects.Text>();
  private readonly labelTexts = new Map<HudKeyId, Phaser.GameObjects.Text>();
  private readonly pulseChip: Phaser.GameObjects.Container;
  private readonly pulseGraphics: Phaser.GameObjects.Graphics;
  private readonly pulseLabel: Phaser.GameObjects.Text;
  private readonly toastGraphics: Phaser.GameObjects.Graphics;
  private readonly toastText: Phaser.GameObjects.Text;
  private keyVisibility: Record<HudKeyId, boolean> = {
    move: false, run: false, interact: false, lantern: false, pulse: false, journal: false, hint: false, pause: false,
  };
  private keySignature = '';
  private hidden = false;
  private destroyed = false;
  private toastTimer = 0;
  private pulseCooldown = 0;
  private pulseWasCooling = false;
  private pulseFlash = 0;
  private pulseShake = 0;
  private pulseVisible = false;
  private pulseX = 0;
  private pulseWidth = 0;
  private topPanelBottom = TOP_Y;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelLayer = scene.add.container(0, 0).setDepth(86);
    this.chipLayer = scene.add.container(0, 0).setDepth(87);
    this.toastLayer = scene.add.container(0, 0).setDepth(88);

    this.panelGraphics = scene.add.graphics();
    this.titleText = this.makeText(TOP_X + TOP_PAD_X, TOP_Y + TOP_PAD_Y, '', 13, AMBER, true);
    this.objectiveText = this.makeText(TOP_X + TOP_PAD_X, TOP_Y + TOP_PAD_Y, '', 10.5, BODY);
    this.statusText = this.makeText(STATUS_X + STATUS_PAD_X, STATUS_BOTTOM, '', 10, STATUS);
    this.lumoText = this.makeText(LUMO_X - LUMO_PAD_X, LUMO_Y + LUMO_PAD_Y, '', 10, MINT);
    this.titleText.setWordWrapWidth(TOP_MAX_WIDTH - TOP_PAD_X * 2, true).setMaxLines(2);
    this.objectiveText.setWordWrapWidth(TOP_MAX_WIDTH - TOP_PAD_X * 2, true).setMaxLines(4);
    this.statusText.setWordWrapWidth(STATUS_MAX_WIDTH - STATUS_PAD_X * 2, true).setMaxLines(2);
    this.lumoText.setOrigin(1, 0);
    this.panelLayer.add([this.panelGraphics, this.titleText, this.objectiveText, this.statusText, this.lumoText]);

    this.chipGraphics = scene.add.graphics();
    this.chipLayer.add(this.chipGraphics);
    for (const id of KEY_ORDER) {
      const keyText = this.makeText(0, 0, KEY_DEFS[id].key, 9, KEY_TEXT, true).setOrigin(0, 0.5).setVisible(false);
      const labelText = this.makeText(0, 0, KEY_DEFS[id].label, 9, KEY_TEXT).setOrigin(0, 0.5).setVisible(false);
      this.chipLayer.add([keyText, labelText]);
      this.keyTexts.set(id, keyText);
      this.labelTexts.set(id, labelText);
    }
    this.pulseChip = scene.add.container(0, KEYS_Y).setVisible(false);
    this.pulseGraphics = scene.add.graphics();
    this.pulseLabel = this.makeText(PULSE_LABEL_X, 0, 'Pulse', 9, PULSE_READY_CSS, true).setOrigin(0, 0.5);
    this.pulseChip.add([this.pulseGraphics, this.pulseLabel]);
    this.chipLayer.add(this.pulseChip);

    this.toastGraphics = scene.add.graphics().setVisible(false);
    this.toastText = this.makeText(TOAST_X, TOAST_Y, '', 10.5, HINT, true).setOrigin(0.5, 0.5).setVisible(false);
    this.toastText.setWordWrapWidth(TOAST_MAX_WIDTH - TOAST_PAD_X * 2, true);
    this.toastLayer.add([this.toastGraphics, this.toastText]);

    this.redrawPanels();
  }

  public setTitle(text: string): void {
    if (this.titleText.text === text) return;
    this.titleText.setText(text);
    this.redrawPanels();
  }

  public setObjective(text: string): void {
    if (this.objectiveText.text === text) return;
    this.objectiveText.setText(text);
    this.redrawPanels();
  }

  public setStatus(text: string): void {
    if (this.statusText.text === text) return;
    this.statusText.setText(text);
    this.redrawPanels();
  }

  public setLumo(text: string): void {
    if (this.lumoText.text === text) return;
    this.lumoText.setText(text);
    this.redrawPanels();
  }

  public setKeys(keys: Partial<Record<HudKeyId, boolean>>): void {
    const signature = KEY_ORDER.map((id) => keys[id] === true ? '1' : '0').join('');
    if (signature === this.keySignature) return;
    this.keySignature = signature;
    for (const id of KEY_ORDER) this.keyVisibility[id] = keys[id] === true;
    this.layoutKeys();
    this.redrawPanels();
  }

  public setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    this.panelLayer.setVisible(!hidden);
    this.chipLayer.setVisible(!hidden);
    this.toastLayer.setVisible(!hidden);
  }

  public update(dt: number, pulseCooldown: number): void {
    if (this.destroyed) return;
    const ratio = Number.isFinite(pulseCooldown) ? Math.max(0, Math.min(1, pulseCooldown)) : 0;
    const cooling = ratio > 0;
    if (this.pulseWasCooling && !cooling && this.pulseVisible) this.pulseFlash = PULSE_FLASH_MS;
    this.pulseWasCooling = cooling;
    this.pulseCooldown = ratio;
    if (this.pulseFlash > 0) this.pulseFlash = Math.max(0, this.pulseFlash - dt);
    if (this.pulseShake > 0) this.pulseShake = Math.max(0, this.pulseShake - dt);
    if (this.pulseVisible) {
      const shake = this.pulseShake > 0 ? Math.sin((PULSE_SHAKE_MS - this.pulseShake) / 18) * 3 : 0;
      const x = Math.max(ROW_LEFT, Math.min(ROW_RIGHT - this.pulseWidth, this.pulseX + shake));
      this.pulseChip.setPosition(x, KEYS_Y);
      this.drawPulseChip();
    }
    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      if (this.toastTimer === 0) this.hideToast();
    }
  }

  public notePulseBlocked(remainingMs: number): void {
    this.showToast(`Pulse còn ${(remainingMs / 1000).toFixed(1)} giây`);
    this.pulseShake = PULSE_SHAKE_MS;
  }

  public showToast(message: string, durationMs = TOAST_DEFAULT_MS): void {
    this.toastText.setText(message);
    if (message === '' || durationMs <= 0) {
      this.hideToast();
      return;
    }
    this.toastTimer = durationMs;
    this.toastText.setVisible(true);
    this.redrawToast();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pulseVisible = false;
    this.keyTexts.clear();
    this.labelTexts.clear();
    this.panelLayer.destroy();
    this.chipLayer.destroy();
    this.toastLayer.destroy();
  }

  private makeText(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: FONT, fontSize: `${size}px`, color };
    if (bold) style.fontStyle = 'bold';
    return this.scene.add.text(x, y, text, style);
  }

  private drawPanel(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillStyle(PANEL_FILL, PANEL_ALPHA);
    graphics.fillRoundedRect(x, y, width, height, PANEL_RADIUS);
    graphics.lineStyle(1, PANEL_STROKE, STROKE_ALPHA);
    graphics.strokeRoundedRect(x, y, width, height, PANEL_RADIUS);
  }

  private redrawPanels(): void {
    const graphics = this.panelGraphics;
    graphics.clear();
    this.drawTopPanel(graphics);
    this.drawStatusPanel(graphics);
    this.drawLumoChip(graphics);
  }

  private drawTopPanel(graphics: Phaser.GameObjects.Graphics): void {
    const title = this.titleText.text;
    const objective = this.objectiveText.text;
    if (title === '' && objective === '') {
      this.titleText.setVisible(false);
      this.objectiveText.setVisible(false);
      this.topPanelBottom = TOP_Y;
      return;
    }
    this.titleText.setVisible(true).setPosition(TOP_X + TOP_PAD_X, TOP_Y + TOP_PAD_Y);
    const objectiveY = TOP_Y + TOP_PAD_Y + Math.ceil(this.titleText.height) + TOP_LINE_GAP;
    this.objectiveText.setVisible(true).setPosition(TOP_X + TOP_PAD_X, objectiveY);
    const inner = Math.ceil(Math.max(this.titleText.width, this.objectiveText.width));
    const width = Math.min(TOP_MAX_WIDTH, Math.max(TOP_MIN_WIDTH, inner + TOP_PAD_X * 2));
    const height = Math.min(TOP_MAX_HEIGHT, objectiveY + Math.ceil(this.objectiveText.height) + TOP_PAD_Y - TOP_Y);
    this.topPanelBottom = TOP_Y + height;
    this.drawPanel(graphics, TOP_X, TOP_Y, width, height);
    if (this.toastText.visible) this.redrawToast();
  }

  /** Anchored to its bottom edge so a two-line status grows upward, away from the key row. */
  private drawStatusPanel(graphics: Phaser.GameObjects.Graphics): void {
    if (this.statusText.text === '') {
      this.statusText.setVisible(false);
      return;
    }
    const width = Math.min(STATUS_MAX_WIDTH, Math.ceil(this.statusText.width) + STATUS_PAD_X * 2);
    const height = Math.ceil(this.statusText.height) + STATUS_PAD_Y * 2;
    const y = STATUS_BOTTOM - height;
    this.statusText.setVisible(true).setPosition(STATUS_X + STATUS_PAD_X, y + STATUS_PAD_Y);
    this.drawPanel(graphics, STATUS_X, y, width, height);
  }

  private drawLumoChip(graphics: Phaser.GameObjects.Graphics): void {
    if (this.lumoText.text === '') {
      this.lumoText.setVisible(false);
      return;
    }
    this.lumoText.setVisible(true).setPosition(LUMO_X - LUMO_PAD_X, LUMO_Y + LUMO_PAD_Y);
    const width = Math.ceil(this.lumoText.width) + LUMO_PAD_X * 2;
    const height = Math.ceil(this.lumoText.height) + LUMO_PAD_Y * 2;
    this.drawPanel(graphics, LUMO_X - width, LUMO_Y, width, height);
  }

  private layoutKeys(): void {
    const graphics = this.chipGraphics;
    graphics.clear();
    for (const id of KEY_ORDER) {
      this.keyTexts.get(id)?.setVisible(false);
      this.labelTexts.get(id)?.setVisible(false);
    }
    this.pulseChip.setVisible(false);
    this.pulseVisible = false;

    const pulseLabelWidth = this.measurePulseLabel();
    const widths = new Map<HudKeyId, number>();
    for (const id of KEY_ORDER) {
      if (!this.keyVisibility[id]) continue;
      widths.set(id, id === 'pulse'
        ? PULSE_OUTER * 2 + CHIP_KEY_GAP + pulseLabelWidth + CHIP_PAD_RIGHT
        : this.measureChip(id));
    }
    const visible = KEY_ORDER.filter((id) => widths.has(id));
    const total = visible.reduce((sum, id) => sum + (widths.get(id) ?? 0), 0) + CHIP_GAP * Math.max(0, visible.length - 1);
    let x = centerKeyRow(total);
    for (const id of visible) {
      const width = widths.get(id) ?? 0;
      if (id === 'pulse') {
        this.pulseX = x;
        this.pulseWidth = width;
        this.pulseChip.setPosition(x, KEYS_Y).setVisible(true);
        this.pulseVisible = true;
        this.updatePulseLabel();
        this.drawPulseChip();
      } else {
        graphics.fillStyle(KEY_FACE, 1);
        graphics.fillRoundedRect(x, KEYS_Y - CHIP_HEIGHT / 2, width, CHIP_HEIGHT, 3);
        graphics.lineStyle(1, PANEL_STROKE, STROKE_ALPHA);
        graphics.strokeRoundedRect(x, KEYS_Y - CHIP_HEIGHT / 2, width, CHIP_HEIGHT, 3);
        const keyText = this.keyTexts.get(id)!;
        const labelText = this.labelTexts.get(id)!;
        keyText.setVisible(true).setPosition(x + CHIP_PAD_LEFT, KEYS_Y);
        labelText.setVisible(true).setPosition(x + CHIP_PAD_LEFT + Math.ceil(keyText.width) + CHIP_KEY_GAP, KEYS_Y);
      }
      x += width + CHIP_GAP;
    }
  }

  private measureChip(id: HudKeyId): number {
    const keyText = this.keyTexts.get(id);
    const labelText = this.labelTexts.get(id);
    if (!keyText || !labelText) return 0;
    keyText.setText(KEY_DEFS[id].key);
    labelText.setText(KEY_DEFS[id].label);
    return CHIP_PAD_LEFT + Math.ceil(keyText.width) + CHIP_KEY_GAP + Math.ceil(labelText.width) + CHIP_PAD_RIGHT;
  }

  private measurePulseLabel(): number {
    this.pulseLabel.setText('Pulse');
    return Math.ceil(this.pulseLabel.width);
  }

  private updatePulseLabel(): void {
    const cooling = this.pulseCooldown > 0;
    this.pulseLabel.setText(cooling ? `${(this.pulseCooldown * (PULSE_COOLDOWN_MS / 1000)).toFixed(1)}s` : 'Pulse');
    this.pulseLabel.setColor(cooling ? PULSE_COOLING_CSS : PULSE_READY_CSS);
  }

  private drawPulseChip(): void {
    if (!this.pulseVisible) return;
    const graphics = this.pulseGraphics;
    graphics.clear();
    graphics.fillStyle(KEY_FACE, 1);
    graphics.fillCircle(PULSE_BADGE_X, 0, PULSE_BADGE_RADIUS);
    graphics.lineStyle(1, PANEL_STROKE, STROKE_ALPHA);
    graphics.strokeCircle(PULSE_BADGE_X, 0, PULSE_BADGE_RADIUS);
    graphics.lineStyle(2, 0xd8e3da, 1);
    graphics.lineBetween(PULSE_BADGE_X - 5, 0, PULSE_BADGE_X + 5, 0);
    const cooling = this.pulseCooldown > 0;
    const sweep = (1 - this.pulseCooldown) * Math.PI * 2;
    const flash = this.pulseFlash > 0;
    graphics.lineStyle(PULSE_ARC_STROKE, cooling ? PULSE_COOLING : PULSE_READY, flash ? 1 : 0.9);
    if (sweep >= Math.PI * 2 - 0.001) {
      graphics.strokeCircle(PULSE_BADGE_X, 0, PULSE_ARC_RADIUS);
    } else if (sweep > 0.001) {
      graphics.beginPath();
      graphics.arc(PULSE_BADGE_X, 0, PULSE_ARC_RADIUS, -Math.PI / 2, -Math.PI / 2 + sweep, false);
      graphics.strokePath();
    }
    if (flash) {
      graphics.lineStyle(PULSE_FLASH_STROKE, PULSE_READY, this.pulseFlash / PULSE_FLASH_MS);
      graphics.strokeCircle(PULSE_BADGE_X, 0, PULSE_FLASH_RADIUS);
    }
    this.updatePulseLabel();
  }

  private redrawToast(): void {
    const text = this.toastText.text;
    if (text === '') {
      this.hideToast();
      return;
    }
    const width = Math.min(TOAST_MAX_WIDTH, Math.ceil(this.toastText.width) + TOAST_PAD_X * 2);
    const height = Math.ceil(this.toastText.height) + TOAST_PAD_Y * 2;
    // Keep the toast below the measured top panel so a two-line objective never
    // sits under it; TOAST_Y stays the resting position for short panels.
    const centerY = Math.max(TOAST_Y, this.topPanelBottom + TOAST_GAP + height / 2);
    this.toastText.setPosition(TOAST_X, centerY);
    const graphics = this.toastGraphics;
    graphics.clear().setVisible(true);
    this.drawPanel(graphics, TOAST_X - width / 2, centerY - height / 2, width, height);
    this.toastText.setVisible(true);
  }

  private hideToast(): void {
    this.toastTimer = 0;
    this.toastText.setVisible(false);
    this.toastGraphics.clear().setVisible(false);
  }
}
