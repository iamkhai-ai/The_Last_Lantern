import Phaser from 'phaser';
import { tr } from '../../i18n/catalog.ts';
import { ILLUSTRATION_FILES } from './illustrationFiles';
import { revealLines, typedCharacters } from './captionTyping';

/** What the illustration scene shows and where it goes next. */
export interface IllustrationData {
  /** Texture keys (see illustrationKey), shown one by one in order. */
  readonly illustrations: readonly string[];
  /** Narration under each illustration, same order (Vietnamese catalog keys; null or missing shows none). */
  readonly captions?: readonly (string | null)[];
  /** True when Esc may leave the rest of the pictures at once (the new-game introduction). Exit journeys leave it unset. */
  readonly skippable?: boolean;
  /** The scene started after the last illustration, with this data. */
  readonly next: { readonly scene: string; readonly data?: Record<string, unknown> };
}

/** Input that started the scene is ignored for this long, so a held or just-used key cannot skip a picture. */
const ARM_DELAY_MS = 300;
/** After each page the keys stay deaf this long, so one press cannot take two pictures. */
const PAGE_ARM_DELAY_MS = 250;
/** The narration band along the bottom of the picture: a dark strip, the text centred in it. */
const CAPTION_BAND_Y = 286;
const CAPTION_BAND_ALPHA = 0.62;
const CAPTION_WRAP = 560;
const CAPTION_LINE_SPACING = 4;
const CAPTION_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Segoe UI, sans-serif',
  fontSize: '13px',
  color: '#f2e6cc',
};
/**
 * Full-screen illustrations (640x360). E, Space, Enter or a click moves on; Esc leaves the rest of a skippable set at
 * once (the new-game introduction); the last picture starts the next scene. The narration under each picture types
 * itself out; a press while it is still typing shows the whole line, the next press moves on.
 */
export class IllustrationScene extends Phaser.Scene {
  private plan: IllustrationData = { illustrations: [], next: { scene: 'MenuScene' } };
  private index = 0;
  private armedAt = 0;
  private picture: Phaser.GameObjects.Image | null = null;
  private captionBand: Phaser.GameObjects.Rectangle | null = null;
  /** Measures and wraps the caption; never drawn. */
  private captionMeasure: Phaser.GameObjects.Text | null = null;
  /** One text per wrapped line, each placed where its finished line sits, so typing never shifts the words. */
  private captionLines: Phaser.GameObjects.Text[] = [];
  /** The current caption, wrapped, one array of characters per line. */
  private captionChars: string[][] = [];
  private captionTotal = 0;
  private captionShown = 0;
  /** Wall-clock start of the current caption's typing: the speed holds even when frames drop. */
  private typingStartedAt = 0;

  constructor() {
    super({ key: 'IllustrationScene' });
  }

  public init(data?: IllustrationData): void {
    this.plan = data ?? this.plan;
  }

  public preload(): void {
    for (const key of this.plan.illustrations) {
      if (this.textures.exists(key)) continue;
      const url = ILLUSTRATION_FILES[key];
      if (url) this.load.image(key, url);
    }
  }

  public create(): void {
    this.index = 0;
    this.picture = null;
    this.armedAt = performance.now() + ARM_DELAY_MS;
    this.add.rectangle(0, 0, 640, 360, 0x000000).setOrigin(0, 0);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      const codes = Phaser.Input.Keyboard.KeyCodes;
      for (const code of [codes.E, codes.SPACE, codes.ENTER, codes.ESC]) keyboard.addKey(code);
      keyboard.on('keydown-E', (event: KeyboardEvent) => this.onAdvance(event));
      keyboard.on('keydown-SPACE', (event: KeyboardEvent) => this.onAdvance(event));
      keyboard.on('keydown-ENTER', (event: KeyboardEvent) => this.onAdvance(event));
      keyboard.on('keydown-ESC', (event: KeyboardEvent) => this.onSkip(event));
    }
    this.input.on('pointerdown', () => this.advance());

    this.add.text(630, 352, 'E', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#9ec4bd',
    }).setOrigin(1, 1).setDepth(10);
    // The introduction can be left early: the label sits top-right on its own dark chip, so it stays readable over a
    // bright sky or a lit window in any of the pictures.
    if (this.plan.skippable) {
      this.add.text(632, 6, tr('[Esc] Bỏ qua'), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#f2e6cc',
        backgroundColor: 'rgba(0, 0, 0, 0.62)',
        padding: { x: 6, y: 3 },
      }).setOrigin(1, 0).setDepth(10);
    }

    this.captionBand = this.add.rectangle(0, CAPTION_BAND_Y, 640, 360 - CAPTION_BAND_Y, 0x000000, CAPTION_BAND_ALPHA)
      .setOrigin(0, 0).setDepth(2).setVisible(false);
    this.captionMeasure = this.add.text(0, 0, '', {
      ...CAPTION_STYLE,
      wordWrap: { width: CAPTION_WRAP, useAdvancedWrap: true },
    }).setVisible(false);
    this.captionLines = [];

    this.show();
  }

  public update(): void {
    if (this.captionShown >= this.captionTotal) return;
    this.revealTo(typedCharacters(performance.now() - this.typingStartedAt, this.captionTotal));
  }

  private onAdvance(event: KeyboardEvent): void {
    if (event.repeat) return;
    this.advance();
  }

  /** Esc: leaves the remaining pictures at once. Only a skippable set (the new-game introduction) offers it. */
  private onSkip(event: KeyboardEvent): void {
    if (!this.plan.skippable || event.repeat) return;
    if (performance.now() < this.armedAt) return;
    this.finish();
  }

  private advance(): void {
    if (performance.now() < this.armedAt) return;
    if (this.captionShown < this.captionTotal) {
      // Still typing: the press finishes the line instead of turning the page.
      this.revealTo(this.captionTotal);
    } else {
      this.index += 1;
      this.show();
    }
    // Re-armed per press: a fast double press moves one step on, never two.
    this.armedAt = performance.now() + PAGE_ARM_DELAY_MS;
  }

  /** Shows the picture at the cursor, skipping any whose texture failed to load, or starts the next scene past the end. */
  private show(): void {
    while (this.index < this.plan.illustrations.length && !this.textures.exists(this.plan.illustrations[this.index])) {
      this.index += 1;
    }
    if (this.index >= this.plan.illustrations.length) {
      this.finish();
      return;
    }
    const key = this.plan.illustrations[this.index];
    if (this.picture) {
      this.picture.setTexture(key);
    } else {
      this.picture = this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(640, 360).setDepth(1);
    }
    const caption = this.plan.captions?.[this.index] ?? null;
    this.captionBand?.setVisible(caption !== null);
    this.layoutCaption(caption === null ? '' : tr(caption));
  }

  /**
   * Wraps the caption once at its full length and lays out one text per line, each left-aligned at the x where the
   * finished, centred line starts. The block is centred vertically on the band. Every line then starts empty.
   */
  private layoutCaption(full: string): void {
    for (const line of this.captionLines) line.destroy();
    this.captionLines = [];
    this.captionChars = [];
    this.captionTotal = 0;
    this.captionShown = 0;
    this.typingStartedAt = performance.now();
    const measure = this.captionMeasure;
    if (!measure || full === '') return;
    const wrapped = measure.getWrappedText(full).map((line) => line.trimEnd()).filter((line) => line !== '');
    const lineHeight = measure.setText('Ag').height;
    const blockHeight = wrapped.length * lineHeight + (wrapped.length - 1) * CAPTION_LINE_SPACING;
    const top = CAPTION_BAND_Y + (360 - CAPTION_BAND_Y - blockHeight) / 2;
    wrapped.forEach((line, i) => {
      const width = measure.setText(line).width;
      const text = this.add.text(Math.round(320 - width / 2), Math.round(top + i * (lineHeight + CAPTION_LINE_SPACING)), '', CAPTION_STYLE)
        .setDepth(3);
      this.captionLines.push(text);
      this.captionChars.push(Array.from(line));
    });
    measure.setText('');
    this.captionTotal = this.captionChars.reduce((sum, chars) => sum + chars.length, 0);
  }

  /** Shows the first `count` characters of the caption, line by line. */
  private revealTo(count: number): void {
    this.captionShown = Math.min(count, this.captionTotal);
    revealLines(this.captionChars, this.captionShown).forEach((text, i) => this.captionLines[i]?.setText(text));
  }

  private finish(): void {
    const { scene, data } = this.plan.next;
    this.scene.start(scene, data);
  }
}
