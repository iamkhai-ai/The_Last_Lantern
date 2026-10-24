import Phaser from 'phaser';
import { ILLUSTRATION_FILES } from './illustrationFiles';

/** What the illustration scene shows and where it goes next. */
export interface IllustrationData {
  /** Texture keys (see illustrationKey), shown one by one in order. */
  readonly illustrations: readonly string[];
  /** The scene started after the last illustration, with this data. */
  readonly next: { readonly scene: string; readonly data?: Record<string, unknown> };
}

/** Input that started the scene is ignored for this long, so a held or just-used key cannot skip a picture. */
const ARM_DELAY_MS = 300;

/** Full-screen illustrations (640x360). E, Space, Enter or a click moves on; the last one starts the next scene. */
export class IllustrationScene extends Phaser.Scene {
  private plan: IllustrationData = { illustrations: [], next: { scene: 'MenuScene' } };
  private index = 0;
  private armedAt = 0;
  private picture: Phaser.GameObjects.Image | null = null;

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
      for (const code of [codes.E, codes.SPACE, codes.ENTER]) keyboard.addKey(code);
      keyboard.on('keydown-E', (event: KeyboardEvent) => this.onAdvance(event));
      keyboard.on('keydown-SPACE', (event: KeyboardEvent) => this.onAdvance(event));
      keyboard.on('keydown-ENTER', (event: KeyboardEvent) => this.onAdvance(event));
    }
    this.input.on('pointerdown', () => this.advance());

    this.add.text(630, 352, 'E', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#9ec4bd',
    }).setOrigin(1, 1).setDepth(10);

    this.show();
  }

  private onAdvance(event: KeyboardEvent): void {
    if (event.repeat) return;
    this.advance();
  }

  private advance(): void {
    if (performance.now() < this.armedAt) return;
    this.index += 1;
    this.show();
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
  }

  private finish(): void {
    const { scene, data } = this.plan.next;
    this.scene.start(scene, data);
  }
}
