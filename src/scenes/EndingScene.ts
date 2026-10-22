import Phaser from 'phaser';
import { getNhinhTexture } from '../art/CampaignArt';
import { tr } from '../i18n/catalog.ts';
import { EffectsSystem } from '../systems/EffectsSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { CampaignSaveSystem, readEndingBeat, type CampaignEndingBeat, type CampaignProgress } from '../systems/CampaignSaveSystem';
import { CampaignEndingSequence } from '../systems/CampaignEndingSequence';
import { DialogueSystem } from '../systems/DialogueSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { WorldFactory } from '../world/WorldFactory';

/**
 * The credits menu has two modes. `credits` is the two-choice menu; `confirm`
 * is the "are you sure" step that guards Play Again. Keeping them in one state
 * (instead of a second scene) means there is exactly one place that decides what
 * a highlighted row does.
 */
type EndingMenuMode = 'credits' | 'confirm';

export class EndingScene extends Phaser.Scene {
  private effectsSystem!: EffectsSystem;
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private campaignEnding = false;
  private menuMode: EndingMenuMode = 'credits';
  private restartConfirmed = false;
  /**
   * This scene's own `shutdown` hook, kept so it can be removed by identity.
   * `this.events` is `scene.sys.events`, where every core scene plugin registers
   * its own teardown at scene START (before `create()` runs), so the hook must
   * always be removed by naming this function and this scene — never by clearing
   * the event, which would strip Phaser's teardown with it.
   */
  private shutdownHandler?: () => void;
  private keyListeners: Array<{ event: string; handler: (event: KeyboardEvent) => void }> = [];
  private bodyText?: Phaser.GameObjects.Text;
  private quoteText?: Phaser.GameObjects.Text;
  private confirmText?: Phaser.GameObjects.Text;
  /** Campaign cinematic: the beat machine's renderer, the dialogue box it speaks through, and its input gate. */
  private sequence?: CampaignEndingSequence;
  private dialogue?: DialogueSystem;
  private promptText?: Phaser.GameObjects.Text;
  private pauseText?: Phaser.GameObjects.Text;
  private paused = false;
  /** False after a key press has been used, until that key is released: one release between any two actions. */
  private pressReady = true;

  constructor() {
    super({ key: 'EndingScene' });
  }

  public create(data?: { showCredits?: boolean; campaign?: boolean }): void {
    this.campaignEnding = data?.campaign === true;
    // A completed campaign resumes at the saved ending beat; only the credits beat (or an explicit request) shows the menu.
    const progress = this.campaignEnding ? CampaignSaveSystem.load() : undefined;
    const resumeBeat = progress ? readEndingBeat(progress.flags) : 'night-call';
    const cinematic = Boolean(progress) && data?.showCredits !== true && resumeBeat !== 'credits';
    const showCredits = !cinematic;
    // The campaign credits default to the safe row; the legacy ending keeps its
    // established default because it never pages through closing text first.
    this.selectedIndex = this.campaignEnding ? 1 : 0;
    this.menuMode = 'credits';
    this.restartConfirmed = false;
    this.buttons = [];
    if (cinematic && progress) {
      this.createCinematic(progress, resumeBeat);
      return;
    }

    // Build Dawn Heart Tree backdrop matching 05_final_dawn.png
    WorldFactory.buildZone(this, 'hub', 3, true);

    const endingNhinh = getNhinhTexture('idle', 'up', 0);
    if (!endingNhinh) throw new Error('Missing required Nhinh ending frame: idle/up/0');
    const linh = this.add.sprite(306, 295, endingNhinh);
    linh.setDepth(22);

    const lumo = this.add.sprite(348, 266, 'lumo_0');
    lumo.setDepth(25);
    this.tweens.add({
      targets: lumo,
      y: 260,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.effectsSystem = new EffectsSystem(this);
    this.effectsSystem.setupZoneEffects('hub', true);

    // Victory & Credits Card
    const card = this.add.graphics();
    card.setDepth(85);
    card.fillStyle(0x081b21, 0.9);
    card.lineStyle(1.5, 0xf2d58b, 0.95);
    card.fillRoundedRect(90, 42, 460, 276, 10);
    card.strokeRoundedRect(90, 42, 460, 276, 10);

    const header = this.add.text(320, 74, tr('THE LAST DAWN — BÌNH MINH TRỞ LẠI'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffe6b0',
    });
    header.setOrigin(0.5, 0.5);
    header.setDepth(86);

    const quote = this.add.text(
      320,
      114,
      '“Even the smallest light can lead us home.”',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        fontStyle: 'italic',
        color: '#f2d58b',
      }
    );
    quote.setOrigin(0.5, 0.5);
    quote.setDepth(86);
    this.quoteText = quote;

    const body = this.add.text(
      320,
      168,
      tr('Ba mảnh trái tim Ký Ức • Hy Vọng • Cân Bằng đã hợp nhất.\nKhi Nhinh tự tay tắt ngọn đèn lồng, bóng tối và ánh sáng\nđã tìm lại nhịp thở hài hòa trên khắp khu rừng Elaria.\n\nCảm ơn bạn đã hoàn thành The Last Lantern — Khu Rừng Ánh Sáng!'),
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11.5px',
        color: '#dfeee8',
        align: 'center',
        lineSpacing: 5,
      }
    );
    body.setOrigin(0.5, 0.5);
    body.setDepth(86);
    this.bodyText = body;

    // Confirmation sentence, hidden until Play Again is chosen.
    const confirmText = this.add.text(320, 304, tr('Chơi lại từ đầu sẽ xóa tiến trình hiện tại.'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10.5px',
      fontStyle: 'bold',
      color: '#ffb4a2',
      align: 'center',
    });
    confirmText.setOrigin(0.5, 0.5);
    confirmText.setDepth(88);
    confirmText.setVisible(false);
    this.confirmText = confirmText;

    this.inputOptions().forEach((opt, idx) => {
      const btn = this.add.text(320, 248 + idx * 32, tr(opt.label), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#cddbd8',
      });
      btn.setOrigin(0.5, 0.5);
      btn.setDepth(87);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        this.selectedIndex = idx;
        this.refreshHighlight();
      });
      btn.on('pointerdown', () => {
        this.activateIndex(idx);
      });
      this.buttons.push(btn);
      btn.setVisible(showCredits);
    });

    this.wireInput(showCredits);

    this.refreshHighlight();
  }

  /** The rows the menu currently shows: the credits pair, or the confirm pair. */
  private inputOptions(): Array<{ label: string; action: () => void }> {
    if (this.menuMode === 'confirm') {
      return [
        { label: 'Hủy', action: () => this.cancelPlayAgain() },
        { label: 'Chơi lại', action: () => this.confirmPlayAgain() },
      ];
    }
    return [
      { label: 'PLAY AGAIN (CHƠI LẠI TỪ ĐẦU)', action: () => this.requestPlayAgain() },
      { label: 'MAIN MENU (MÀN HÌNH CHÍNH)', action: () => this.goToMainMenu() },
    ];
  }

  /** Routes both keyboard and pointer activation through the same confirmation step. */
  private activateIndex(index: number): void {
    this.selectedIndex = index;
    this.inputOptions()[index]?.action();
  }

  private triggerSelected(): void {
    this.inputOptions()[this.selectedIndex]?.action();
  }

  /** Play Again never acts straight away: it opens the confirmation, defaulting to Cancel. */
  private requestPlayAgain(): void {
    if (this.menuMode === 'confirm') return;
    this.menuMode = 'confirm';
    this.selectedIndex = 0;
    this.confirmText?.setText(tr('Chơi lại từ đầu sẽ xóa tiến trình hiện tại.'));
    this.confirmText?.setVisible(true);
    SoundSystem.playMirrorRotate();
    this.refreshHighlight();
  }

  private cancelPlayAgain(): void {
    this.menuMode = 'credits';
    this.selectedIndex = this.campaignEnding ? 1 : 0;
    this.confirmText?.setVisible(false);
    SoundSystem.playMirrorRotate();
    this.refreshHighlight();
  }

  /** Only this method may call playAgain, and only once. */
  private confirmPlayAgain(): void {
    if (this.menuMode !== 'confirm' || this.restartConfirmed) return;
    this.restartConfirmed = true;
    this.confirmText?.setVisible(false);
    this.playAgain();
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + 2) % 2;
    SoundSystem.playMirrorRotate();
    this.refreshHighlight();
  }

  private refreshHighlight(): void {
    const labels = this.inputOptions().map((option) => option.label);
    this.buttons.forEach((btn, idx) => {
      const sel = idx === this.selectedIndex;
      btn.setText(sel ? `▸ ${tr(labels[idx])} ◂` : tr(labels[idx]));
      btn.setColor(sel ? '#ffe680' : '#cddbd8');
    });
  }

  private wireInput(showCredits: boolean): void {
    this.clearKeyListeners();
    this.registerShutdownGuard();
    if (!this.input?.keyboard) return;
    if (showCredits) this.wireCreditsInput();
    else this.wireSequenceInput();
  }

  private wireCreditsInput(): void {
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
    this.onKey('keydown-ENTER', (event) => this.handleAdvance(event));
    this.onKey('keydown-SPACE', (event) => this.handleAdvance(event));
    this.onKey('keydown-E', (event) => this.handleAdvance(event));
  }

  /**
   * The cinematic's input. E, Space and Enter share one handler (registered by identifier, so the credits handlers
   * stay the only arrows for those events): a press acts only when it is a fresh keydown that follows a real
   * release, it advances the dialogue box first and the beat machine after it, and it can never skip the silence.
   */
  private wireSequenceInput(): void {
    const press = (event?: KeyboardEvent): void => this.handleSequencePress(event);
    const release = (): void => { this.pressReady = true; };
    for (const code of ['keydown-E', 'keydown-SPACE', 'keydown-ENTER']) this.onKey(code, press);
    for (const code of ['keyup-E', 'keyup-SPACE', 'keyup-ENTER']) this.onKey(code, release);
    this.onKey('keydown-ESC', (event) => { if (!event?.repeat) this.togglePause(); });
  }

  private handleSequencePress(event?: KeyboardEvent): void {
    if (event?.repeat || !this.pressReady || this.paused) return;
    this.pressReady = false;
    this.advanceSequence();
  }

  private advanceSequence(): void {
    if (this.paused) return;
    if (this.dialogue?.isActive()) {
      this.dialogue.handleAdvanceInput(performance.now());
      return;
    }
    this.sequence?.advance();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.pauseText?.setVisible(this.paused);
  }

  private createCinematic(progress: CampaignProgress, beat: CampaignEndingBeat): void {
    this.cameras.main.setBackgroundColor(0x050b16);
    this.paused = false;
    this.pressReady = true;
    this.dialogue = new DialogueSystem(this);
    this.sequence = new CampaignEndingSequence({
      scene: this,
      progress,
      save: () => CampaignSaveSystem.save(progress),
      showDialogue: (lines, onComplete) => this.dialogue?.startDialogue(lines, onComplete),
      stopDialogue: () => this.dialogue?.stop(),
      showCredits: () => this.scene.restart({ campaign: true, showCredits: true }),
    });
    const style = { fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffe680', backgroundColor: '#07151ccc', padding: { x: 8, y: 4 } };
    const click = (): void => this.advanceSequence();
    this.promptText = this.add.text(628, 352, '', style).setOrigin(1, 1).setDepth(96).setVisible(false);
    this.promptText.setInteractive({ useHandCursor: true });
    this.promptText.on('pointerdown', click);
    this.pauseText = this.add.text(320, 24, tr('Tạm dừng · ESC để tiếp tục'), style).setOrigin(0.5, 0).setDepth(97).setVisible(false);
    this.wireInput(false);
    this.sequence.start(beat);
  }

  /**
   * A key that is still held cannot act on the menu. The shipped runtime already
   * delivers that, without any bookkeeping of ours: while a key stays down the
   * browser keeps sending auto-repeat keydowns, and every one of them carries
   * `event.repeat`, which is ignored here; and once a `Key` object exists for the
   * code, Phaser's plugin drops those repeats before a handler sees them at all
   * (`emitOnRepeat` is false by default). So the only press that can act is a
   * fresh one — a keydown that follows a real release.
   */
  private handleAdvance(event?: KeyboardEvent): void {
    if (event?.repeat) return;
    this.triggerSelected();
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
   * `scene.sys.events` and the emitter's `off(event)` with no handler clears
   * *every* listener for that event, which would take the teardown that each
   * core scene plugin registered at scene START with it (InputPlugin,
   * CameraManager, DisplayList, UpdateList, TweenManager, Clock, ...).
   */
  private clearShutdownGuard(): void {
    if (!this.shutdownHandler) return;
    this.events?.off('shutdown', this.shutdownHandler, this);
    this.shutdownHandler = undefined;
  }

  private teardownInput(): void {
    this.clearKeyListeners();
    this.clearShutdownGuard();
    // The cinematic's timers and dialogue die with the scene: nothing of it can fire into the next one.
    this.sequence?.destroy();
    this.sequence = undefined;
    this.dialogue?.stop();
    this.dialogue = undefined;
  }

  public playAgain(): void {
    if (this.campaignEnding) {
      CampaignSaveSystem.clear();
      SoundSystem.playLanternToggle(true);
      this.scene.start('PrologueScene');
      return;
    }
    SaveSystem.clear();
    const fresh = SaveSystem.createDefaultProgress();
    SaveSystem.save(fresh);
    SoundSystem.playLanternToggle(true);
    this.scene.start('WorldScene', { progress: fresh });
  }

  public goToMainMenu(): void {
    SoundSystem.playMirrorRotate();
    this.scene.start('MenuScene');
  }

  public update(_time: number, delta: number): void {
    this.effectsSystem?.update(delta);
    if (!this.sequence) return;
    const dt = Math.min(delta, 50);
    if (!this.paused) this.dialogue?.update(dt);
    this.sequence.update(dt, this.paused);
    const prompt = this.paused ? null : this.sequence.getPrompt();
    this.promptText?.setText(prompt ? tr(prompt) : '').setVisible(prompt !== null);
  }
}
