import type Phaser from 'phaser';
import { tr } from '../i18n/catalog.ts';
import {
  CHIP_HEIGHT,
  CHIP_ORDER,
  KEYS_Y,
  PULSE_ARC_RADIUS,
  PULSE_ARC_STROKE,
  PULSE_BADGE_RADIUS,
  PULSE_FLASH_RADIUS,
  PULSE_FLASH_STROKE,
  ROW_LEFT,
  ROW_RIGHT,
  TOAST_Y,
  TOP_MAX_HEIGHT,
  TOP_WIDTH,
  TOP_X,
  TOP_Y,
  centerKeyRow,
} from './hudLayout';
import type { HudKeyId } from './hudLayout';

export type { HudKeyId } from './hudLayout';
export { HUD_LAYOUT, HUD_BANDS, centerKeyRow } from './hudLayout';

/** Anything that can surface a transient line of text; puzzles depend on this, not on the whole HUD. */
export interface ToastSink {
  showToast(message: string, durationMs?: number): void;
}

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
// One fixed-width mission plate holds chapter, objective and progress; there is no second card.
const TOP_PAD_X = 8;
const TOP_PAD_Y = 6;
const TOP_LINE_GAP = 2;
const STATUS_ALPHA = 0.72;
const LUMO_X = 628;
const LUMO_Y = 9;
const CHIP_GAP = 12;
const CHIP_KEY_PAD = 4;
const CHIP_KEY_GAP = 5;
const ESC_X = 628;
const ESC_SIZE = 8;
const PULSE_OUTER = PULSE_FLASH_RADIUS + PULSE_FLASH_STROKE / 2;
const PULSE_BADGE_X = PULSE_OUTER;
const PULSE_LABEL_X = PULSE_OUTER * 2 + CHIP_KEY_GAP;
const PULSE_FLASH_MS = 600;
const PULSE_SHAKE_MS = 320;
const PULSE_COOLDOWN_MS = 3000;
const TOAST_X = 320;
const TOAST_GAP = 4;
const TOAST_PAD_X = 10;
const TOAST_PAD_Y = 4;
const TOAST_DEFAULT_MS = 2600;
const TOAST_MAX_WIDTH = 520;
// The first-play lesson panel: centred, its bottom just above the key row.
const COACH_MAX_WIDTH = 460;
const COACH_PAD_X = 10;
const COACH_PAD_Y = 5;
const COACH_BOTTOM = KEYS_Y - CHIP_HEIGHT / 2 - 9;
const COACH_STROKE = 0xd8b869;
// Three faceted crystal pips, drawn inside the top panel's right edge (WorldScene only).
const CRYSTAL_GUTTER = 54;
const CRYSTAL_INSET = 12;
const CRYSTAL_SPACING = 16;
const CRYSTAL_RADIUS = 7;

const KEY_ORDER: readonly HudKeyId[] = ['move', 'run', 'interact', 'lantern', 'pulse', 'journal', 'hint', 'pause'];
const KEY_DEFS: Record<HudKeyId, { key: string; label: string }> = {
  move: { key: 'WASD', label: 'Đi' },
  run: { key: '⇧', label: 'Chạy' },
  interact: { key: 'E', label: 'Tương tác' },
  lantern: { key: 'F', label: 'Đèn' },
  pulse: { key: 'SPACE', label: 'Xung sáng' },
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
  private readonly escText: Phaser.GameObjects.Text;
  private readonly chipGraphics: Phaser.GameObjects.Graphics;
  private readonly keyTexts = new Map<HudKeyId, Phaser.GameObjects.Text>();
  private readonly labelTexts = new Map<HudKeyId, Phaser.GameObjects.Text>();
  private readonly pulseChip: Phaser.GameObjects.Container;
  private readonly pulseGraphics: Phaser.GameObjects.Graphics;
  private readonly pulseLabel: Phaser.GameObjects.Text;
  private readonly toastGraphics: Phaser.GameObjects.Graphics;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly coachGraphics: Phaser.GameObjects.Graphics;
  private readonly coachText: Phaser.GameObjects.Text;
  private keyVisibility: Record<HudKeyId, boolean> = {
    move: false, run: false, interact: false, lantern: false, pulse: false, journal: false, hint: false, pause: false,
  };
  private keySignature = '';
  private hidden = false;
  private destroyed = false;
  private toastTimer = 0;
  private crystals: { memory: boolean; hope: boolean; balance: boolean } | null = null;
  private pulseCooldown = 0;
  private pulseWasCooling = false;
  private pulseFlash = 0;
  private pulseShake = 0;
  private pulseVisible = false;
  private pulseSignature = '';
  private pulseX = 0;
  private pulseWidth = 0;
  private topPanelBottom = TOP_Y;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelLayer = scene.add.container(0, 0).setDepth(86);
    this.chipLayer = scene.add.container(0, 0).setDepth(87);
    this.toastLayer = scene.add.container(0, 0).setDepth(88);

    this.panelGraphics = scene.add.graphics();
    this.titleText = this.makeText(TOP_X + TOP_PAD_X, TOP_Y + TOP_PAD_Y, '', 8.5, AMBER, true);
    this.objectiveText = this.makeText(TOP_X + TOP_PAD_X, TOP_Y + TOP_PAD_Y, '', 11, BODY);
    this.statusText = this.makeText(TOP_X + TOP_PAD_X, TOP_Y + TOP_PAD_Y, '', 8.5, STATUS);
    this.lumoText = this.makeText(LUMO_X, LUMO_Y, '', 8, MINT);
    // Chapter, objective (max two lines) and the progress line share ONE plate, so the HUD has a single
    // hierarchy anchor instead of four equally weighted cards.
    const innerWidth = TOP_WIDTH - TOP_PAD_X * 2;
    this.titleText.setWordWrapWidth(innerWidth, true).setMaxLines(1);
    this.objectiveText.setWordWrapWidth(innerWidth, true).setMaxLines(2);
    this.statusText.setWordWrapWidth(innerWidth, true).setMaxLines(2).setAlpha(STATUS_ALPHA);
    this.lumoText.setOrigin(1, 0).setAlpha(0.68);
    this.panelLayer.add([this.panelGraphics, this.titleText, this.objectiveText, this.statusText, this.lumoText]);

    this.chipGraphics = scene.add.graphics();
    this.chipLayer.add(this.chipGraphics);
    for (const id of KEY_ORDER) {
      const keyText = this.makeText(0, 0, KEY_DEFS[id].key, 9, KEY_TEXT, true).setOrigin(0, 0.5).setVisible(false);
      const labelText = this.makeText(0, 0, tr(KEY_DEFS[id].label), 9, KEY_TEXT).setOrigin(0, 0.5).setVisible(false);
      this.chipLayer.add([keyText, labelText]);
      this.keyTexts.set(id, keyText);
      this.labelTexts.set(id, labelText);
    }
    this.pulseChip = scene.add.container(0, KEYS_Y).setVisible(false);
    this.pulseGraphics = scene.add.graphics();
    this.pulseLabel = this.makeText(PULSE_LABEL_X, 0, tr(KEY_DEFS.pulse.label), 9, PULSE_READY_CSS, true).setOrigin(0, 0.5);
    this.pulseChip.add([this.pulseGraphics, this.pulseLabel]);
    this.chipLayer.add(this.pulseChip);
    // Pause stays discoverable without a chip: a quiet corner label instead of a keycap in the row.
    this.escText = this.makeText(ESC_X, KEYS_Y, `${KEY_DEFS.pause.key} · ${tr(KEY_DEFS.pause.label)}`, ESC_SIZE, KEY_TEXT)
      .setOrigin(1, 0.5).setAlpha(0.6);
    this.chipLayer.add(this.escText);

    this.toastGraphics = scene.add.graphics().setVisible(false);
    this.toastText = this.makeText(TOAST_X, TOAST_Y, '', 10.5, HINT, true).setOrigin(0.5, 0.5).setVisible(false);
    this.toastText.setWordWrapWidth(TOAST_MAX_WIDTH - TOAST_PAD_X * 2, true);
    this.toastLayer.add([this.toastGraphics, this.toastText]);

    // The first-play lesson sits just above the key row, so the keys it names are right below it. It lives in the
    // panel layer: hidden with the rest of the HUD while a line is read or the pause menu is open.
    this.coachGraphics = scene.add.graphics();
    this.coachText = this.makeText(TOAST_X, COACH_BOTTOM, '', 10.5, AMBER, true).setOrigin(0.5, 1).setAlign('center')
      .setVisible(false);
    this.coachText.setWordWrapWidth(COACH_MAX_WIDTH - COACH_PAD_X * 2, true).setLineSpacing(2);
    this.panelLayer.add([this.coachGraphics, this.coachText]);

    this.redrawPanels();
  }

  /** The current first-play lesson (a Vietnamese catalog key), or null for none. */
  public setCoach(text: string | null): void {
    const localized = text === null ? '' : tr(text);
    if (this.coachText.text === localized) return;
    this.coachText.setText(localized);
    const graphics = this.coachGraphics;
    graphics.clear();
    if (localized === '') {
      this.coachText.setVisible(false);
      return;
    }
    const width = Math.ceil(this.coachText.width) + COACH_PAD_X * 2;
    const height = Math.ceil(this.coachText.height) + COACH_PAD_Y * 2;
    const x = Math.round(TOAST_X - width / 2);
    const y = COACH_BOTTOM + COACH_PAD_Y - height;
    graphics.fillStyle(PANEL_FILL, 0.94);
    graphics.fillRoundedRect(x, y, width, height, PANEL_RADIUS);
    graphics.lineStyle(1, COACH_STROKE, 0.95);
    graphics.strokeRoundedRect(x, y, width, height, PANEL_RADIUS);
    this.coachText.setVisible(true);
  }

  public setTitle(text: string): void {
    const localized = tr(text);
    if (this.titleText.text === localized) return;
    this.titleText.setText(localized);
    this.redrawPanels();
  }

  public setObjective(text: string): void {
    const localized = tr(text);
    if (this.objectiveText.text === localized) return;
    this.objectiveText.setText(localized);
    this.redrawPanels();
  }

  public setStatus(text: string): void {
    const localized = tr(text);
    if (this.statusText.text === localized) return;
    this.statusText.setText(localized);
    this.redrawPanels();
  }

  public setLumo(text: string): void {
    const localized = tr(text);
    if (this.lumoText.text === localized) return;
    this.lumoText.setText(localized);
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

  /** Three crystal pips in the top panel; pass null to hide them (most campaign levels do). */
  public setCrystals(crystals: { memory: boolean; hope: boolean; balance: boolean } | null): void {
    const same = this.crystals === null && crystals === null
      || (this.crystals !== null && crystals !== null
        && this.crystals.memory === crystals.memory && this.crystals.hope === crystals.hope
        && this.crystals.balance === crystals.balance);
    if (same) return;
    this.crystals = crystals === null ? null : { ...crystals };
    this.redrawPanels();
  }

  public setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    this.panelLayer.setVisible(!hidden);
    this.chipLayer.setVisible(!hidden);
    // Toasts stay up: they carry zone subtitles and rewards that land while a line is being read.
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
    this.showToast(tr('Xung sáng còn {seconds} giây', { seconds: (remainingMs / 1000).toFixed(1) }));
    this.pulseShake = PULSE_SHAKE_MS;
  }

  public showToast(message: string, durationMs = TOAST_DEFAULT_MS): void {
    this.toastText.setText(tr(message));
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
    this.drawLumoTag();
  }

  private drawTopPanel(graphics: Phaser.GameObjects.Graphics): void {
    const title = this.titleText.text;
    const objective = this.objectiveText.text;
    const status = this.statusText.text;
    if (title === '' && objective === '' && status === '') {
      this.titleText.setVisible(false);
      this.objectiveText.setVisible(false);
      this.statusText.setVisible(false);
      this.topPanelBottom = TOP_Y;
      return;
    }
    const left = TOP_X + TOP_PAD_X;
    const gutter = this.crystals ? CRYSTAL_GUTTER : 0;
    const wrapWidth = TOP_WIDTH - TOP_PAD_X * 2 - gutter;
    let y = TOP_Y + TOP_PAD_Y;
    if (title !== '') {
      this.titleText.setVisible(true).setPosition(left, y).setWordWrapWidth(wrapWidth, true);
      y += Math.ceil(this.titleText.height) + TOP_LINE_GAP;
    } else {
      this.titleText.setVisible(false);
    }
    if (objective !== '') {
      this.objectiveText.setVisible(true).setPosition(left, y).setWordWrapWidth(wrapWidth, true);
      y += Math.ceil(this.objectiveText.height) + TOP_LINE_GAP;
    } else {
      this.objectiveText.setVisible(false);
    }
    if (status !== '') {
      this.statusText.setVisible(true).setPosition(left, y).setWordWrapWidth(wrapWidth, true);
      y += Math.ceil(this.statusText.height);
    } else {
      this.statusText.setVisible(false);
    }
    const height = Math.min(TOP_MAX_HEIGHT, Math.ceil(y + TOP_PAD_Y - TOP_Y));
    this.topPanelBottom = TOP_Y + height;
    this.drawPanel(graphics, TOP_X, TOP_Y, TOP_WIDTH, height);
    if (this.crystals) this.drawCrystals(graphics, TOP_X + TOP_WIDTH - CRYSTAL_INSET, TOP_Y + 14);
    if (this.toastText.visible) this.redrawToast();
  }

  private drawCrystals(graphics: Phaser.GameObjects.Graphics, rightX: number, centerY: number): void {
    const pips = [
      { on: this.crystals?.memory === true, color: 0xe6b842, hi: 0xfff1a8 },
      { on: this.crystals?.hope === true, color: 0x4daee6, hi: 0xb8edff },
      { on: this.crystals?.balance === true, color: 0xb96ce6, hi: 0xeabfff },
    ];
    pips.forEach((pip, index) => {
      const x = rightX - (pips.length - 1 - index) * CRYSTAL_SPACING;
      graphics.fillStyle(pip.on ? pip.color : 0x3e5259, 1);
      graphics.beginPath();
      graphics.moveTo(x, centerY - CRYSTAL_RADIUS);
      graphics.lineTo(x + CRYSTAL_RADIUS * 0.62, centerY);
      graphics.lineTo(x, centerY + CRYSTAL_RADIUS);
      graphics.lineTo(x - CRYSTAL_RADIUS * 0.62, centerY);
      graphics.closePath();
      graphics.fillPath();
      if (!pip.on) return;
      graphics.fillStyle(pip.hi, 0.9);
      graphics.beginPath();
      graphics.moveTo(x, centerY - CRYSTAL_RADIUS * 0.55);
      graphics.lineTo(x + CRYSTAL_RADIUS * 0.3, centerY);
      graphics.lineTo(x, centerY + CRYSTAL_RADIUS * 0.55);
      graphics.lineTo(x - CRYSTAL_RADIUS * 0.3, centerY);
      graphics.closePath();
      graphics.fillPath();
    });
  }

  /** The companion name is a quiet watermark, not a second card: no fill, no stroke, no keycap. */
  private drawLumoTag(): void {
    if (this.lumoText.text === '') {
      this.lumoText.setVisible(false);
      return;
    }
    this.lumoText.setVisible(true).setPosition(LUMO_X, LUMO_Y);
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
    this.escText.setVisible(this.keyVisibility.pause);

    const pulseLabelWidth = this.measurePulseLabel();
    const widths = new Map<HudKeyId, number>();
    // Only the contextual action chips are drawn; journal/hint/pause live in the pause menu instead.
    for (const id of CHIP_ORDER) {
      if (!this.keyVisibility[id]) continue;
      widths.set(id, id === 'pulse'
        ? PULSE_OUTER * 2 + CHIP_KEY_GAP + pulseLabelWidth
        : this.measureChip(id));
    }
    const visible = CHIP_ORDER.filter((id) => widths.has(id));
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
        const keyText = this.keyTexts.get(id)!;
        const labelText = this.labelTexts.get(id)!;
        const keyWidth = Math.ceil(keyText.width) + CHIP_KEY_PAD * 2;
        // A keycap around the glyph only; the action name sits on the world with no box of its own.
        graphics.fillStyle(KEY_FACE, 0.95);
        graphics.fillRoundedRect(x, KEYS_Y - CHIP_HEIGHT / 2, keyWidth, CHIP_HEIGHT, 2);
        graphics.lineStyle(1, PANEL_STROKE, 0.5);
        graphics.strokeRoundedRect(x, KEYS_Y - CHIP_HEIGHT / 2, keyWidth, CHIP_HEIGHT, 2);
        keyText.setVisible(true).setPosition(x + CHIP_KEY_PAD, KEYS_Y);
        labelText.setVisible(true).setPosition(x + keyWidth + CHIP_KEY_GAP, KEYS_Y).setAlpha(0.85);
      }
      x += width + CHIP_GAP;
    }
  }

  private measureChip(id: HudKeyId): number {
    const keyText = this.keyTexts.get(id);
    const labelText = this.labelTexts.get(id);
    if (!keyText || !labelText) return 0;
    keyText.setText(KEY_DEFS[id].key);
    labelText.setText(tr(KEY_DEFS[id].label));
    return Math.ceil(keyText.width) + CHIP_KEY_PAD * 2 + CHIP_KEY_GAP + Math.ceil(labelText.width);
  }

  private measurePulseLabel(): number {
    this.pulseLabel.setText(tr(KEY_DEFS.pulse.label));
    return Math.ceil(this.pulseLabel.width);
  }

  private updatePulseLabel(): void {
    const cooling = this.pulseCooldown > 0;
    this.pulseLabel.setText(cooling ? `${(this.pulseCooldown * (PULSE_COOLDOWN_MS / 1000)).toFixed(1)}s` : tr(KEY_DEFS.pulse.label));
    this.pulseLabel.setColor(cooling ? PULSE_COOLING_CSS : PULSE_READY_CSS);
  }

  /**
   * Redraws only when something visible changed: the arc is quantised to 1/60 of a turn and the ready
   * flash to 50ms steps, so an idle (ready) chip costs nothing per frame instead of a Graphics rebuild.
   */
  private drawPulseChip(): void {
    if (!this.pulseVisible) return;
    const signature = `${Math.round(this.pulseCooldown * 60)}|${this.pulseFlash > 0 ? Math.ceil(this.pulseFlash / 50) : 0}`;
    if (signature === this.pulseSignature) return;
    this.pulseSignature = signature;
    const graphics = this.pulseGraphics;
    graphics.clear();
    graphics.fillStyle(KEY_FACE, 1);
    graphics.fillCircle(PULSE_BADGE_X, 0, PULSE_BADGE_RADIUS);
    graphics.lineStyle(1, PANEL_STROKE, STROKE_ALPHA);
    graphics.strokeCircle(PULSE_BADGE_X, 0, PULSE_BADGE_RADIUS);
    // Spacebar glyph (a flat open bracket). A bare dash here read as a "minus / blocked" sign.
    graphics.lineStyle(1.5, 0xd8e3da, 1);
    graphics.beginPath();
    graphics.moveTo(PULSE_BADGE_X - 4.5, -2);
    graphics.lineTo(PULSE_BADGE_X - 4.5, 2);
    graphics.lineTo(PULSE_BADGE_X + 4.5, 2);
    graphics.lineTo(PULSE_BADGE_X + 4.5, -2);
    graphics.strokePath();
    const cooling = this.pulseCooldown > 0;
    const sweep = (1 - this.pulseCooldown) * Math.PI * 2;
    const flash = this.pulseFlash > 0;
    // A faint full track under the arc so the remaining time reads as "part of a ring", not a stray tick.
    if (cooling) {
      graphics.lineStyle(PULSE_ARC_STROKE, PULSE_COOLING, 0.22);
      graphics.strokeCircle(PULSE_BADGE_X, 0, PULSE_ARC_RADIUS);
    }
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
