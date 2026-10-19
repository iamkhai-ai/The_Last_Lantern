import Phaser from 'phaser';
import { PROLOGUE_PANELS } from '../data/prologue';
import roadHomeUrl from '../../assets/prologue/runtime/01-road-home.png';
import voiceInTreesUrl from '../../assets/prologue/runtime/02-voice-in-trees.png';
import pathDisappearsUrl from '../../assets/prologue/runtime/03-path-disappears.png';
import waitingForMorningUrl from '../../assets/prologue/runtime/04-waiting-for-morning.png';

/** The four approved runtime PNGs, imported explicitly; no master/storyboard glob. */
const PANEL_TEXTURES: Readonly<Record<string, string>> = {
  '01-road-home': roadHomeUrl,
  '02-voice-in-trees': voiceInTreesUrl,
  '03-path-disappears': pathDisappearsUrl,
  '04-waiting-for-morning': waitingForMorningUrl,
};

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 360;
const PANEL_X = 24;
const PANEL_Y = 274;
const PANEL_WIDTH = 592;
const PANEL_HEIGHT = 78;
const TEXT_LEFT = 36;
const SPEAKER_Y = 282;
const BODY_Y = 300;
const BODY_WRAP_WIDTH = 552;
const HINT_Y = 344;
const TYPE_MS = 24;
const PANEL_FADE_MS = 450;
const FINISH_FADE_MS = 350;
const POINTER_ENTRY_GATE_MS = 140;
const POINTER_DEBOUNCE_MS = 140;

const FALLBACK_COLOR = 0x081d26;

interface PanelTransition {
  readonly nextPanel: number;
  elapsed: number;
}

interface KeyListener {
  readonly event: string;
  readonly handler: (event?: KeyboardEvent) => void;
}

/**
 * Short illustrated prologue. It owns its cursor, text reveal, input and
 * effects; the shared DialogueSystem is deliberately not reused (fixed layout,
 * portraits and non-cancelable audio). There is exactly one finish path.
 */
export class PrologueScene extends Phaser.Scene {
  private panelIndex = 0;
  private lineIndex = 0;
  private revealedChars = 0;
  private charAccumulator = 0;
  private fullLine = '';
  private finishing = false;
  private started = false;
  private transition: PanelTransition | null = null;
  private elapsedMs = 0;
  private lastPointerAdvanceMs = Number.NEGATIVE_INFINITY;
  private fadeElapsed = 0;
  private fadeStartAlpha = 0;
  private heldKeys = new Set<string>();
  private lastKeyEvent: KeyboardEvent | null = null;
  private lastSkipKeyEvent: KeyboardEvent | null = null;
  private keyListeners: KeyListener[] = [];
  private shutdownHandler?: () => void;

  private background?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private incomingBackground?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private fadeOverlay?: Phaser.GameObjects.Rectangle;
  private speakerText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private skipText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PrologueScene' });
  }

  public init(): void {
    this.resetState();
  }

  public preload(): void {
    for (const panel of PROLOGUE_PANELS) {
      if (this.textures.exists(panel.textureKey)) continue;
      const url = PANEL_TEXTURES[panel.id];
      if (url) this.load.image(panel.textureKey, url);
    }
  }

  public create(): void {
    this.removeInputListeners();
    this.resetState();
    this.buildDialogueUi();
    this.registerShutdown();
    this.wireInput();
    this.showPanel(0);
  }

  public showPanel(index: number): void {
    this.panelIndex = Math.max(0, Math.min(PROLOGUE_PANELS.length - 1, Math.floor(index)));
    this.background?.destroy();
    this.incomingBackground?.destroy();
    this.incomingBackground = undefined;
    this.background = this.createBackground(this.panelIndex);
    this.showLine(0);
  }

  public showLine(index: number): void {
    const panel = PROLOGUE_PANELS[this.panelIndex];
    this.lineIndex = Math.max(0, Math.min(panel.lines.length - 1, Math.floor(index)));
    const line = panel.lines[this.lineIndex];
    this.fullLine = line.text;
    this.revealedChars = 0;
    this.charAccumulator = 0;
    this.speakerText?.setText(line.speaker);
    this.bodyText?.setText('');
  }

  public advance(): void {
    if (this.finishing || this.started || this.transition) return;
    if (this.revealedChars < this.fullLine.length) {
      this.revealedChars = this.fullLine.length;
      this.charAccumulator = 0;
      this.bodyText?.setText(this.fullLine);
      return;
    }
    const panel = PROLOGUE_PANELS[this.panelIndex];
    if (this.lineIndex < panel.lines.length - 1) {
      this.showLine(this.lineIndex + 1);
      return;
    }
    if (this.panelIndex < PROLOGUE_PANELS.length - 1) {
      this.beginPanelTransition(this.panelIndex + 1);
      return;
    }
    this.finish();
  }

  public finish(): void {
    if (this.finishing || this.started) return;
    if (this.transition) {
      this.incomingBackground?.destroy();
      this.incomingBackground = undefined;
      this.background?.setAlpha(1);
    }
    this.finishing = true;
    this.transition = null;
    this.fadeElapsed = 0;
    this.fadeStartAlpha = this.fadeOverlay?.alpha ?? 0;
    this.skipText?.disableInteractive();
  }

  public update(_time: number, delta: number): void {
    this.elapsedMs += delta;
    if (this.finishing) {
      this.fadeElapsed += delta;
      const progress = Math.min(1, this.fadeElapsed / FINISH_FADE_MS);
      this.fadeOverlay?.setAlpha(this.fadeStartAlpha + (1 - this.fadeStartAlpha) * progress);
      if (progress >= 1 && !this.started) {
        this.started = true;
        this.scene.start('CampaignScene', { newGame: true });
      }
      return;
    }
    if (this.transition) {
      this.updatePanelTransition(delta);
      return;
    }
    this.updateTypewriter(delta);
  }

  public cleanup(): void {
    this.removeInputListeners();
    this.skipText?.off('pointerdown', this.onSkipPointer);
    this.clearShutdownHandler();
    this.transition = null;
  }

  private resetState(): void {
    this.panelIndex = 0;
    this.lineIndex = 0;
    this.revealedChars = 0;
    this.charAccumulator = 0;
    this.fullLine = '';
    this.finishing = false;
    this.started = false;
    this.transition = null;
    this.elapsedMs = 0;
    this.lastPointerAdvanceMs = Number.NEGATIVE_INFINITY;
    this.fadeElapsed = 0;
    this.fadeStartAlpha = 0;
    this.heldKeys.clear();
    this.lastKeyEvent = null;
    this.lastSkipKeyEvent = null;
  }

  private buildDialogueUi(): void {
    this.fadeOverlay = this.add
      .rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0x000000)
      .setOrigin(0, 0)
      .setAlpha(0)
      .setDepth(20);

    const panel = this.add.graphics().setDepth(10);
    panel.fillStyle(0x07151c, 0.88);
    panel.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 6);
    panel.lineStyle(1, 0x4d7370, 0.8);
    panel.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 6);

    this.speakerText = this.add
      .text(TEXT_LEFT, SPEAKER_Y, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f7dfaa',
      })
      .setDepth(11);

    this.bodyText = this.add
      .text(TEXT_LEFT, BODY_Y, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#e8f2ee',
        lineSpacing: 2,
        maxLines: 2,
        wordWrap: { width: BODY_WRAP_WIDTH, useAdvancedWrap: true },
      })
      .setDepth(11);

    this.add
      .text(TEXT_LEFT, HINT_Y, 'Nhấn [E / Enter / Space] hoặc click để tiếp tục', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '9px',
        color: '#9eb8b2',
      })
      .setDepth(11);

    this.skipText = this.add
      .text(620, 12, '[Esc] Bỏ qua', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f7dfaa',
      })
      .setOrigin(1, 0)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    this.skipText.on('pointerdown', this.onSkipPointer);
  }

  private updateTypewriter(delta: number): void {
    if (this.revealedChars >= this.fullLine.length) return;
    this.charAccumulator += delta;
    if (this.charAccumulator < TYPE_MS) return;
    const characters = Math.floor(this.charAccumulator / TYPE_MS);
    this.charAccumulator -= characters * TYPE_MS;
    this.revealedChars = Math.min(this.fullLine.length, this.revealedChars + characters);
    this.bodyText?.setText(this.fullLine.slice(0, this.revealedChars));
  }

  private updatePanelTransition(delta: number): void {
    const transition = this.transition;
    if (!transition) return;
    transition.elapsed += delta;
    const progress = Math.min(1, transition.elapsed / PANEL_FADE_MS);
    this.incomingBackground?.setAlpha(progress);
    this.background?.setAlpha(1 - progress);
    if (transition.elapsed < PANEL_FADE_MS) return;

    this.background?.destroy();
    this.background = this.incomingBackground;
    this.background?.setAlpha(1);
    this.incomingBackground = undefined;
    this.panelIndex = transition.nextPanel;
    this.transition = null;
    this.showLine(0);
  }

  private beginPanelTransition(nextPanel: number): void {
    this.incomingBackground?.destroy();
    this.incomingBackground = this.createBackground(nextPanel);
    this.incomingBackground.setAlpha(0);
    this.transition = { nextPanel, elapsed: 0 };
  }

  private createBackground(index: number): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const panel = PROLOGUE_PANELS[index];
    return this.textures.exists(panel.textureKey)
      ? this.add.image(0, 0, panel.textureKey).setOrigin(0, 0).setDisplaySize(VIEW_WIDTH, VIEW_HEIGHT).setDepth(0)
      : this.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, FALLBACK_COLOR).setOrigin(0, 0).setDepth(0);
  }

  private removeInputListeners(): void {
    const keyboard = this.input?.keyboard;
    if (keyboard) {
      for (const listener of this.keyListeners) keyboard.off(listener.event, listener.handler);
    }
    this.keyListeners = [];
    this.input?.off('pointerdown', this.onPointerDown);
  }

  private wireInput(): void {
    const keyboard = this.input?.keyboard;
    if (keyboard) {
      this.bindKey(keyboard, 'keydown-E', this.onAdvanceKey);
      this.bindKey(keyboard, 'keydown-ENTER', this.onAdvanceKey);
      this.bindKey(keyboard, 'keydown-SPACE', this.onAdvanceKey);
      this.bindKey(keyboard, 'keydown-ESC', this.onEscapeKey);
      this.bindKey(keyboard, 'keyup-E', this.onReleaseKey);
      this.bindKey(keyboard, 'keyup-ENTER', this.onReleaseKey);
      this.bindKey(keyboard, 'keyup-SPACE', this.onReleaseKey);
    }
    this.input?.on('pointerdown', this.onPointerDown);
  }

  private bindKey(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
    event: string,
    handler: (event?: KeyboardEvent) => void,
  ): void {
    keyboard.on(event, handler);
    this.keyListeners.push({ event, handler });
  }

  private registerShutdown(): void {
    this.clearShutdownHandler();
    this.shutdownHandler = () => this.cleanup();
    this.events?.once('shutdown', this.shutdownHandler);
  }

  private clearShutdownHandler(): void {
    if (!this.shutdownHandler) return;
    this.events?.off('shutdown', this.shutdownHandler);
    this.shutdownHandler = undefined;
  }

  private readonly onAdvanceKey = (event?: KeyboardEvent): void => {
    const code = event?.code;
    if (event?.repeat) {
      if (code) this.heldKeys.add(code);
      return;
    }
    if (code && this.heldKeys.has(code)) return;
    if (event && event === this.lastKeyEvent) return;
    if (event) this.lastKeyEvent = event;
    if (this.finishing || this.started || this.transition) return;
    this.advance();
  };

  private readonly onReleaseKey = (event?: KeyboardEvent): void => {
    if (event?.code) this.heldKeys.delete(event.code);
  };

  private readonly onEscapeKey = (event?: KeyboardEvent): void => {
    if (event?.repeat) return;
    if (event && event === this.lastSkipKeyEvent) return;
    if (event) this.lastSkipKeyEvent = event;
    this.finish();
  };

  private readonly onSkipPointer = (): void => {
    this.finish();
  };

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer) return;
    if (this.finishing || this.started || this.transition) return;
    if (this.elapsedMs < POINTER_ENTRY_GATE_MS) return;
    const insideDialogue = pointer.x >= PANEL_X
      && pointer.x <= PANEL_X + PANEL_WIDTH
      && pointer.y >= PANEL_Y
      && pointer.y <= PANEL_Y + PANEL_HEIGHT;
    if (!insideDialogue) return;
    if (this.elapsedMs - this.lastPointerAdvanceMs < POINTER_DEBOUNCE_MS) return;
    this.lastPointerAdvanceMs = this.elapsedMs;
    this.advance();
  };
}
