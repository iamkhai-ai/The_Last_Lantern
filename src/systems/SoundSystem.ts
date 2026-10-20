import { startAmbience, type AmbienceHandle, type AmbienceTheme } from '../audio/ambience.ts';
import * as effects from '../audio/effects.ts';

export type FootstepSurface = effects.EffectSurface;
export type { AmbienceTheme };

/**
 * The game's whole soundscape is generated with Web Audio: there are no audio files. Effects are the recipes in
 * `audio/effects`, the level ambience is built in `audio/ambience`, and everything goes through three buses (effects,
 * footsteps, ambience) into one master gain and a gentle compressor, so loudness stays even and nothing clips.
 */
export class SoundSystem {
  private static ctx: AudioContext | null = null;
  private static master: GainNode | null = null;
  private static buses: { sfx: GainNode; steps: GainNode; ambience: GainNode } | null = null;
  private static muted = false;
  private static footstepSurface: FootstepSurface = 'grass';
  private static foot: 0 | 1 = 0;
  private static ambienceTheme: AmbienceTheme | null = null;
  private static ambience: AmbienceHandle | null = null;

  /**
   * The audio context, built on first use. Unlike `getContext`, it exists while muted so the ambience keeps running
   * silently and comes back when the sound is turned on.
   */
  private static ensureContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        const ctx = new AudioCtx();
        const master = ctx.createGain();
        master.gain.value = this.muted ? 0 : 1;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 24;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.25;
        master.connect(compressor);
        compressor.connect(ctx.destination);
        const bus = (gain: number): GainNode => {
          const node = ctx.createGain();
          node.gain.value = gain;
          node.connect(master);
          return node;
        };
        this.ctx = ctx;
        this.master = master;
        this.buses = { sfx: bus(1), steps: bus(1), ambience: bus(1) };
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** The context for one-shot sounds; null while muted so nothing new is scheduled. */
  private static getContext(): AudioContext | null {
    return this.muted ? null : this.ensureContext();
  }

  public static toggleMute(): boolean {
    this.muted = !this.muted;
    const ctx = this.ctx;
    if (ctx && this.master) {
      const now = ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 1, now + 0.08);
    }
    return this.muted;
  }

  public static isMuted(): boolean {
    return this.muted;
  }

  /** Runs one effect recipe on the effects bus, a moment ahead on the audio clock. Never throws into the game loop. */
  private static play(recipe: effects.Recipe): void {
    const ctx = this.getContext();
    if (!ctx || !this.buses) return;
    try {
      recipe(ctx, this.buses.sfx, ctx.currentTime + 0.005);
    } catch {
      // Audio is never worth an error in the game loop.
    }
  }

  public static setFootstepSurface(surface: FootstepSurface): void {
    this.footstepSurface = surface;
  }

  /**
   * One footstep, called on the feet's plants (see Player). The two feet alternate, and the step is a short soft
   * contact built on the spot, so there is nothing to loop, cut or keep in step with the animation but this call.
   */
  public static playFootstep(running = false): void {
    const ctx = this.getContext();
    if (!ctx || !this.buses) return;
    this.foot = this.foot === 0 ? 1 : 0;
    try {
      effects.footstep(ctx, this.buses.steps, ctx.currentTime + 0.003, { surface: this.footstepSurface, running, foot: this.foot });
    } catch {
      // A footstep is never worth an error in the game loop.
    }
  }

  /** Kept for scene shutdown: footsteps are one-shot voices that end on their own, so there is nothing to stop. */
  public static stopFootsteps(): void {
    this.foot = 0;
  }

  /** Level ambience: one theme at a time; asking for the one already playing changes nothing. */
  public static startAmbient(theme: AmbienceTheme): void {
    if (this.ambienceTheme === theme && this.ambience) return;
    this.stopAmbient();
    const ctx = this.ensureContext();
    if (!ctx || !this.buses) return;
    try {
      this.ambience = startAmbience(ctx, this.buses.ambience, theme);
      this.ambienceTheme = theme;
    } catch {
      this.ambience = null;
      this.ambienceTheme = null;
    }
  }

  public static startAmbientCreek(): void {
    this.startAmbient('creek');
  }

  public static stopAmbient(fadeSeconds = 0.8): void {
    const handle = this.ambience;
    this.ambience = null;
    this.ambienceTheme = null;
    if (!handle) return;
    try {
      handle.stop(fadeSeconds);
    } catch {
      // Ignore teardown races when the scene is shutting down.
    }
  }

  public static playLanternToggle(on: boolean): void {
    this.play(on ? effects.lanternOn : effects.lanternOff);
  }

  public static playLightPulse(): void {
    this.play(effects.lightPulse);
  }

  public static playRuneActivate(step: number): void {
    this.play(effects.runeActivate(step));
  }

  public static playPuzzleError(): void {
    this.play(effects.puzzleError);
  }

  public static playMirrorRotate(): void {
    this.play(effects.mirrorRotate);
  }

  public static playPuzzleSolved(): void {
    this.play(effects.puzzleSolved);
  }

  public static playCrystalPickup(): void {
    this.play(effects.crystalPickup);
  }

  public static playDialogueTick(speaker: string): void {
    this.play(effects.dialogueTick(speaker));
  }

  /** Quiet cues for the ending's silence: a cricket, running water, a second cricket answering. */
  public static playEndingCue(cue: 'cricket' | 'water' | 'answer'): void {
    this.play(effects.endingCue(cue));
  }

  public static playDawnChord(): void {
    this.play(effects.dawnChord);
  }

  public static playUiClick(): void {
    this.play(effects.uiClick);
  }

  public static playUiCancel(): void {
    this.play(effects.uiCancel);
  }

  public static playUiSuccess(): void {
    this.play(effects.uiSuccess);
  }

  public static playUiLevelUp(): void {
    this.play(effects.uiLevelUp);
  }

  public static playUiItemGet(): void {
    this.play(effects.uiItemGet);
  }

  public static playUiItemGet2(): void {
    this.play(effects.uiItemGet2);
  }

  public static playDoorOpen(): void {
    this.play(effects.doorOpen);
  }

  public static playDoorClose(): void {
    this.play(effects.doorClose);
  }

  public static playGateOpen(): void {
    this.play(effects.gateOpen);
  }

  public static playMechanismLatch(): void {
    this.play(effects.mechanismLatch);
  }

  public static playWaterRelease(): void {
    this.play(effects.waterRelease);
  }
}
