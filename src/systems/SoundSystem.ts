export class SoundSystem {
  private static ctx: AudioContext | null = null;
  private static muted = false;
  private static soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private static loadedKeys = new Set<string>();

  public static setSoundManager(manager: Phaser.Sound.BaseSoundManager | null): void {
    this.soundManager = manager;
  }

  public static registerLoadedKey(key: string): void {
    this.loadedKeys.add(key);
  }

  public static hasSfx(key: string): boolean {
    return this.loadedKeys.has(key);
  }

  private static getContext(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public static toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.soundManager) {
      this.soundManager.mute = this.muted;
    }
    return this.muted;
  }

  public static isMuted(): boolean {
    return this.muted;
  }

  /**
   * Play a loaded SFX file by key. Falls back silently if not loaded.
   * Use this for Sound Effect Lab sounds placed in src/assets/sfx/.
   */
  public static playSfx(key: string, volume = 0.6): boolean {
    if (this.muted) return false;
    if (!this.soundManager || !this.loadedKeys.has(key)) return false;
    try {
      this.soundManager.play(key, { volume });
      return true;
    } catch {
      return false;
    }
  }

  private static playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    endFreq?: number,
    delayMs = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    setTimeout(() => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(freq, now);
        if (endFreq !== undefined) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
        }
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.02, duration * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
      } catch {
        // Ignore WebAudio errors if blocked
      }
    }, delayMs);
  }

  public static playLanternToggle(on: boolean): void {
    if (this.playSfx(on ? 'lantern_on' : 'lantern_off')) return;
    if (on) {
      this.playTone(330, 0.16, 'triangle', 0.09, 523.25);
      this.playTone(659.25, 0.24, 'sine', 0.06, 783.99, 70);
    } else {
      this.playTone(440, 0.18, 'sine', 0.07, 246.94);
    }
  }

  public static playLightPulse(): void {
    if (this.playSfx('light_pulse')) return;
    this.playTone(293.66, 0.55, 'sine', 0.1, 587.33);
    this.playTone(440, 0.65, 'triangle', 0.06, 880, 90);
  }

  public static playRuneActivate(step: number): void {
    if (this.playSfx('rune_activate')) return;
    const notes = [440, 554.37, 659.25];
    const freq = notes[Math.min(2, Math.max(0, step - 1))];
    this.playTone(freq, 0.28, 'sine', 0.1, freq * 1.25);
  }

  public static playPuzzleError(): void {
    if (this.playSfx('puzzle_error')) return;
    this.playTone(220, 0.2, 'triangle', 0.08, 164.81);
    this.playTone(164.81, 0.25, 'sine', 0.07, 130.81, 110);
  }

  public static playMirrorRotate(): void {
    if (this.playSfx('mirror_rotate')) return;
    this.playTone(392, 0.12, 'triangle', 0.08, 493.88);
  }

  public static playPuzzleSolved(): void {
    if (this.playSfx('puzzle_solved')) return;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      this.playTone(f, 0.45, 'sine', 0.09, f * 1.02, idx * 95);
    });
  }

  public static playCrystalPickup(): void {
    if (this.playSfx('crystal_pickup')) return;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.55, 'triangle', 0.09, f * 1.05, idx * 80);
    });
  }

  public static playDialogueTick(speaker: string): void {
    if (speaker === 'Lumo') {
      this.playTone(680, 0.045, 'sine', 0.035, 760);
    } else if (speaker === 'Shadow' || speaker === 'The Shadow') {
      this.playTone(175, 0.06, 'triangle', 0.045, 155);
    } else {
      this.playTone(420, 0.045, 'sine', 0.035, 450);
    }
  }

  public static playDawnChord(): void {
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    chord.forEach((f, idx) => {
      this.playTone(f, 1.4, 'sine', 0.07, f * 1.01, idx * 140);
    });
  }

  // New SFX helpers for Sound Effect Lab sounds
  public static playUiClick(): void { this.playSfx('ui_click', 0.4); }
  public static playUiCancel(): void { this.playSfx('ui_cancel', 0.4); }
  public static playUiSuccess(): void { this.playSfx('ui_success', 0.5); }
  public static playUiLevelUp(): void { this.playSfx('ui_levelup', 0.6); }
  public static playUiItemGet(): void { this.playSfx('ui_item_get', 0.5); }
  public static playUiItemGet2(): void { this.playSfx('ui_item_get2', 0.5); }
  public static playDoorOpen(): void { this.playSfx('door_open', 0.5); }
  public static playDoorClose(): void { this.playSfx('door_close', 0.5); }
  public static playGateOpen(): void { this.playSfx('gate_open', 0.5); }
  public static playFootstepGrass(): void { this.playSfx('footstep_grass', 0.3); }
  public static playFootstepSoil(): void { this.playSfx('footstep_soil', 0.3); }
  public static playAmbientCreek(): void { this.playSfx('ambient_creek', 0.4); }
}
