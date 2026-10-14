export class SoundSystem {
  private static ctx: AudioContext | null = null;
  private static muted = false;

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
    return this.muted;
  }

  public static isMuted(): boolean {
    return this.muted;
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
    if (on) {
      this.playTone(330, 0.16, 'triangle', 0.09, 523.25);
      this.playTone(659.25, 0.24, 'sine', 0.06, 783.99, 70);
    } else {
      this.playTone(440, 0.18, 'sine', 0.07, 246.94);
    }
  }

  public static playLightPulse(): void {
    this.playTone(293.66, 0.55, 'sine', 0.1, 587.33);
    this.playTone(440, 0.65, 'triangle', 0.06, 880, 90);
  }

  public static playRuneActivate(step: number): void {
    const notes = [440, 554.37, 659.25];
    const freq = notes[Math.min(2, Math.max(0, step - 1))];
    this.playTone(freq, 0.28, 'sine', 0.1, freq * 1.25);
  }

  public static playPuzzleError(): void {
    this.playTone(220, 0.2, 'triangle', 0.08, 164.81);
    this.playTone(164.81, 0.25, 'sine', 0.07, 130.81, 110);
  }

  public static playMirrorRotate(): void {
    this.playTone(392, 0.12, 'triangle', 0.08, 493.88);
  }

  public static playPuzzleSolved(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      this.playTone(f, 0.45, 'sine', 0.09, f * 1.02, idx * 95);
    });
  }

  public static playCrystalPickup(): void {
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.55, 'triangle', 0.09, f * 1.05, idx * 80);
    });
  }

  public static playDialogueTick(speaker: string): void {
    if (speaker === 'Lumo') {
      this.playTone(680, 0.045, 'sine', 0.035, 760);
    } else if (speaker === 'Shadow') {
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
}
