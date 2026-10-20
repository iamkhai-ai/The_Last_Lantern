export type FootstepSurface = 'grass' | 'soil';

export class SoundSystem {
  private static ctx: AudioContext | null = null;
  private static muted = false;
  private static soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private static loadedKeys = new Set<string>();
  private static walking = false;
  private static footstepSurface: FootstepSurface = 'grass';
  private static footstepSound: Phaser.Sound.BaseSound | null = null;
  private static ambientKey: string | null = null;
  private static ambientSound: Phaser.Sound.BaseSound | null = null;

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
   * Play a loaded SFX file by key. Returns false when the file is unavailable,
   * the manager is not wired yet, or the game is muted, so callers can fall
   * back to the procedural tones.
   */
  public static playSfx(key: string, volume = 0.6): boolean {
    if (this.muted) return false;
    if (!this.soundManager || !this.loadedKeys.has(key)) return false;
    try {
      return this.soundManager.play(key, { volume }) !== false;
    } catch {
      return false;
    }
  }

  /**
   * The curated footstep files are 17-21 s walking beds, not single steps.
   * Playing them per step stacked dozens of voices, so one looping instance
   * now follows real movement and stops when the player stops.
   */
  public static setFootstepSurface(surface: FootstepSurface): void {
    if (this.footstepSurface === surface) return;
    this.footstepSurface = surface;
    if (!this.walking) return;
    this.stopFootsteps();
    this.startFootstepLoop();
  }

  public static setWalking(walking: boolean): void {
    const unchanged = this.walking === walking;
    this.walking = walking;
    if (!walking) {
      this.stopFootsteps();
      return;
    }
    if (unchanged && this.footstepSound?.isPlaying) return;
    this.startFootstepLoop();
  }

  private static startFootstepLoop(): void {
    if (!this.soundManager) return;
    const key = `footstep_${this.footstepSurface}`;
    if (!this.loadedKeys.has(key) || this.footstepSound?.isPlaying) return;
    try {
      this.footstepSound = this.soundManager.add(key, { loop: true, volume: 0.22 });
      this.footstepSound.play();
    } catch {
      this.footstepSound = null;
    }
  }

  public static stopFootsteps(): void {
    const sound = this.footstepSound;
    this.footstepSound = null;
    if (!sound) return;
    try {
      sound.stop();
      sound.destroy();
    } catch {
      // Ignore teardown races when the scene is shutting down.
    }
  }

  /** Level ambience: one looping instance, replaced only when the level changes. */
  public static startAmbientCreek(): void {
    this.startAmbient('ambient_creek', 0.4);
  }

  public static startAmbient(key: string, volume = 0.4): void {
    if (this.ambientKey === key && this.ambientSound?.isPlaying) return;
    this.stopAmbient();
    if (!this.soundManager || !this.loadedKeys.has(key)) return;
    try {
      this.ambientSound = this.soundManager.add(key, { loop: true, volume });
      this.ambientSound.play();
      this.ambientKey = key;
    } catch {
      this.ambientSound = null;
      this.ambientKey = null;
    }
  }

  public static stopAmbient(): void {
    const sound = this.ambientSound;
    this.ambientSound = null;
    this.ambientKey = null;
    if (!sound) return;
    try {
      sound.stop();
      sound.destroy();
    } catch {
      // Ignore teardown races when the scene is shutting down.
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

  // Sound Effect Lab one-shots. Each keeps the old procedural cue as a fallback,
  // so a missing or undecodable file never turns an interaction silent.
  public static playUiClick(): void {
    if (!this.playSfx('ui_click', 0.4)) this.playTone(392, 0.05, 'triangle', 0.05, 493.88);
  }

  public static playUiCancel(): void {
    if (!this.playSfx('ui_cancel', 0.4)) this.playTone(330, 0.08, 'triangle', 0.05, 246.94);
  }

  public static playUiSuccess(): void {
    if (!this.playSfx('ui_success', 0.5)) this.playTone(523.25, 0.18, 'sine', 0.07, 783.99);
  }

  public static playUiLevelUp(): void {
    if (this.playSfx('ui_levelup', 0.6)) return;
    this.playTone(523.25, 0.14, 'triangle', 0.07, 659.25);
    this.playTone(783.99, 0.22, 'sine', 0.06, 1046.5, 90);
  }

  public static playUiItemGet(): void {
    if (this.playSfx('ui_item_get', 0.5)) return;
    this.playTone(587.33, 0.14, 'triangle', 0.06, 880);
    this.playTone(880, 0.2, 'sine', 0.05, 1174.66, 80);
  }

  public static playUiItemGet2(): void {
    if (this.playSfx('ui_item_get2', 0.5)) return;
    this.playTone(659.25, 0.12, 'triangle', 0.06, 987.77);
  }

  public static playDoorOpen(): void {
    if (!this.playSfx('door_open', 0.5)) this.playTone(196, 0.24, 'triangle', 0.07, 392);
  }

  public static playDoorClose(): void {
    if (!this.playSfx('door_close', 0.5)) this.playTone(330, 0.2, 'triangle', 0.07, 165);
  }

  public static playGateOpen(): void {
    if (!this.playSfx('gate_open', 0.5)) this.playTone(174.61, 0.42, 'triangle', 0.08, 392);
  }
}
