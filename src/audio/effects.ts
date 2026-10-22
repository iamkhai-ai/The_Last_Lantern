/**
 * The game's sound effects as procedural recipes. A recipe schedules its voices from time `t` into `out`; the sound
 * system supplies the context, the bus and the clock. Levels are chosen so that the effects sit within a few dB of one
 * another (about -14 dBFS peak for the main events, quieter for UI and dialogue ticks) and the footsteps stay
 * soft (about -24 dBFS): `scripts/check-sound.mjs` and the offline render keep them honest.
 */
import { bell, noise, tone } from './synth.ts';

export type Recipe = (ctx: BaseAudioContext, out: AudioNode, t: number) => void;
export type EffectSurface = 'grass' | 'soil';

/** A voice that is held until `release`: it fades out over the given time, then disconnects its nodes. */
export interface HeldVoice { release(fadeSeconds: number): void; }
export type HeldRecipe = (ctx: BaseAudioContext, out: AudioNode, t: number) => HeldVoice;

/**
 * Lock tones of Level 08 (scenario 08 §4 "Âm thanh của ba khóa"). The right Sun sits a perfect fourth (3:4) below the
 * left one, so the three together read as one chord. The Moon voice is shared with the practice slab.
 */
export const LOCK_TONE_HZ = { sunLeft: 880, sunRight: 660, moon: 220 } as const;

function heldTone(ctx: BaseAudioContext, out: AudioNode, t: number, o: {
  freq: number; type: OscillatorType; peak: number; attack: number; lowpass?: number;
}): HeldVoice {
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.freq, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(o.peak, t + o.attack);
  const filter = o.lowpass ? ctx.createBiquadFilter() : null;
  if (filter && o.lowpass) {
    filter.type = 'lowpass';
    filter.frequency.value = o.lowpass;
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(out);
  osc.start(t);
  let released = false;
  return {
    release(fadeSeconds: number): void {
      if (released) return;
      released = true;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
      osc.stop(now + fadeSeconds + 0.02);
      osc.onended = () => {
        osc.disconnect();
        filter?.disconnect();
        gain.disconnect();
      };
    },
  };
}

/** Left Sun lit: a bright, high, held tone. */
export const lockSunLeftVoice: HeldRecipe = (ctx, out, t) =>
  heldTone(ctx, out, t, { freq: LOCK_TONE_HZ.sunLeft, type: 'triangle', peak: 0.05, attack: 0.15, lowpass: 3200 });

/** Right Sun lit: the same bright voice, a perfect fourth lower. */
export const lockSunRightVoice: HeldRecipe = (ctx, out, t) =>
  heldTone(ctx, out, t, { freq: LOCK_TONE_HZ.sunRight, type: 'triangle', peak: 0.05, attack: 0.15, lowpass: 3200 });

/** Moon covered (and the lamp lit): a low, held tone. The practice slab shadowed by its column uses this same voice. */
export const lockMoonVoice: HeldRecipe = (ctx, out, t) =>
  heldTone(ctx, out, t, { freq: LOCK_TONE_HZ.moon, type: 'triangle', peak: 0.08, attack: 0.2, lowpass: 700 });

export const lanternOn: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.3, peak: 0.03, attack: 0.06, type: 'bandpass', freq: 500, endFreq: 2200, q: 0.9 });
  bell(ctx, out, t + 0.02, 659.25, { peak: 0.1, dur: 0.7 });
  bell(ctx, out, t + 0.09, 987.77, { peak: 0.07, dur: 0.8 });
};

export const lanternOff: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.26, peak: 0.035, attack: 0.03, type: 'bandpass', freq: 1800, endFreq: 350, q: 0.9 });
  tone(ctx, out, { t, freq: 392, endFreq: 246.94, dur: 0.32, peak: 0.11, attack: 0.02, lowpass: 900 });
};

export const lightPulse: Recipe = (ctx, out, t) => {
  tone(ctx, out, { t, freq: 260, endFreq: 780, dur: 0.55, peak: 0.13, attack: 0.04 });
  bell(ctx, out, t + 0.12, 880, { peak: 0.08, dur: 1.1 });
  bell(ctx, out, t + 0.2, 1318.5, { peak: 0.055, dur: 1.2 });
  noise(ctx, out, { t, dur: 0.6, peak: 0.016, attack: 0.2, type: 'bandpass', freq: 3000, q: 0.6 });
};

export const runeActivate = (step: number): Recipe => (ctx, out, t) => {
  const notes = [440, 554.37, 659.25];
  const freq = notes[Math.min(2, Math.max(0, step - 1))];
  bell(ctx, out, t, freq, { peak: 0.12, dur: 1.2, bright: 0.3 });
};

export const puzzleError: Recipe = (ctx, out, t) => {
  tone(ctx, out, { t, freq: 196, endFreq: 146.83, type: 'triangle', dur: 0.22, peak: 0.13, lowpass: 700 });
  tone(ctx, out, { t: t + 0.11, freq: 146.83, endFreq: 110, dur: 0.3, peak: 0.11, lowpass: 600 });
};

export const mirrorRotate: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.03, peak: 0.07, attack: 0.002, type: 'bandpass', freq: 2400, q: 1.2 });
  tone(ctx, out, { t, freq: 330, endFreq: 440, type: 'triangle', dur: 0.09, peak: 0.1, attack: 0.004, lowpass: 1600 });
};

export const puzzleSolved: Recipe = (ctx, out, t) => {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => bell(ctx, out, t + i * 0.09, freq, { peak: 0.1, dur: 1.4 }));
};

export const crystalPickup: Recipe = (ctx, out, t) => {
  [587.33, 739.99, 880, 1174.66].forEach((freq, i) => bell(ctx, out, t + i * 0.07, freq, { peak: 0.09, dur: 1.3 }));
  noise(ctx, out, { t, dur: 0.8, peak: 0.01, attack: 0.1, type: 'bandpass', freq: 4000, q: 0.8 });
};

export const dialogueTick = (speaker: string): Recipe => (ctx, out, t) => {
  if (speaker === 'Lumo') tone(ctx, out, { t, freq: 680, endFreq: 760, dur: 0.05, peak: 0.018, attack: 0.006 });
  else if (speaker === 'Shadow' || speaker === 'The Shadow') tone(ctx, out, { t, freq: 175, endFreq: 155, type: 'triangle', dur: 0.06, peak: 0.024, attack: 0.006, lowpass: 500 });
  else tone(ctx, out, { t, freq: 420, endFreq: 450, dur: 0.045, peak: 0.018, attack: 0.006, lowpass: 1200 });
};

/** Quiet cues for the ending's silence: a cricket, running water, a second cricket answering. */
export const endingCue = (cue: 'cricket' | 'water' | 'answer'): Recipe => (ctx, out, t) => {
  if (cue === 'cricket') {
    for (let i = 0; i < 3; i += 1) tone(ctx, out, { t: t + i * 0.09, freq: 4200, endFreq: 4400, dur: 0.05, peak: 0.018, attack: 0.004 });
  } else if (cue === 'answer') {
    for (let i = 0; i < 2; i += 1) tone(ctx, out, { t: t + i * 0.11, freq: 3600, endFreq: 3800, dur: 0.06, peak: 0.014, attack: 0.004 });
  } else {
    for (let i = 0; i < 6; i += 1) tone(ctx, out, { t: t + i * 0.11, freq: 500 + i * 70, endFreq: 380 + i * 50, dur: 0.35, peak: 0.012, attack: 0.02 });
  }
};

export const dawnChord: Recipe = (ctx, out, t) => {
  [261.63, 329.63, 392.0, 523.25, 659.25, 783.99].forEach((freq, i) => bell(ctx, out, t + i * 0.14, freq, { peak: 0.06, dur: 2.6, bright: 0.25 }));
};

export const uiClick: Recipe = (ctx, out, t) => {
  tone(ctx, out, { t, freq: 520, endFreq: 690, type: 'triangle', dur: 0.04, peak: 0.09, attack: 0.003, lowpass: 3000 });
};

export const uiCancel: Recipe = (ctx, out, t) => {
  tone(ctx, out, { t, freq: 330, endFreq: 250, type: 'triangle', dur: 0.07, peak: 0.09, attack: 0.003, lowpass: 2200 });
};

export const uiSuccess: Recipe = (ctx, out, t) => {
  bell(ctx, out, t, 523.25, { peak: 0.08, dur: 0.5 });
  bell(ctx, out, t + 0.09, 783.99, { peak: 0.08, dur: 0.6 });
};

export const uiLevelUp: Recipe = (ctx, out, t) => {
  [523.25, 659.25, 783.99].forEach((freq, i) => bell(ctx, out, t + i * 0.08, freq, { peak: 0.08, dur: 0.8 }));
};

export const uiItemGet: Recipe = (ctx, out, t) => {
  bell(ctx, out, t, 587.33, { peak: 0.08, dur: 0.7 });
  bell(ctx, out, t + 0.08, 880, { peak: 0.07, dur: 0.8 });
};

export const uiItemGet2: Recipe = (ctx, out, t) => {
  bell(ctx, out, t, 659.25, { peak: 0.09, dur: 0.6 });
};

export const doorOpen: Recipe = (ctx, out, t) => {
  tone(ctx, out, { t, freq: 90, endFreq: 140, type: 'sawtooth', dur: 0.55, peak: 0.08, attack: 0.12, lowpass: 360 });
  noise(ctx, out, { t, dur: 0.5, peak: 0.07, attack: 0.1, type: 'lowpass', freq: 250 });
};

export const doorClose: Recipe = (ctx, out, t) => {
  tone(ctx, out, { t, freq: 120, endFreq: 55, dur: 0.2, peak: 0.1, attack: 0.004 });
  noise(ctx, out, { t, dur: 0.06, peak: 0.04, attack: 0.002, type: 'lowpass', freq: 900 });
};

export const gateOpen: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 1.0, peak: 0.09, attack: 0.25, type: 'lowpass', freq: 260, endFreq: 520 });
  tone(ctx, out, { t, freq: 70, endFreq: 110, dur: 1.0, peak: 0.1, attack: 0.25, lowpass: 300 });
  bell(ctx, out, t + 0.55, 523.25, { peak: 0.07, dur: 1.2 });
  bell(ctx, out, t + 0.7, 783.99, { peak: 0.06, dur: 1.2 });
};

/** A small mechanical latch: an unpitched contact and a short scrape, without a success fanfare. */
export const mechanismLatch: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.045, peak: 0.075, attack: 0.003, type: 'lowpass', freq: 1100, q: 0.5 });
  noise(ctx, out, { t: t + 0.035, dur: 0.14, peak: 0.035, attack: 0.012, type: 'bandpass', freq: 730, endFreq: 380, q: 0.7 });
};

/** A gentle opening rush; the level's continuous water bed takes over as this tail ends. */
export const waterRelease: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 1.7, peak: 0.1, attack: 0.3, type: 'bandpass', freq: 700, endFreq: 1000, q: 0.5 });
  noise(ctx, out, { t: t + 0.15, dur: 1.25, peak: 0.025, attack: 0.2, type: 'bandpass', freq: 2600, q: 0.5 });
};

/**
 * Forest steps are unpitched: a soft sole pressing earth, a little leaf crunch and a brief trailing brush.
 * Filters, strength and buffer offsets vary each step; running makes the contact shorter and a little firmer.
 * The legacy "soil" surface is used on indoor stone floors: a firmer unpitched sole contact and scuff, without leaves.
 */
export function footstep(ctx: BaseAudioContext, out: AudioNode, t: number, o: { surface: EffectSurface; running: boolean; foot: 0 | 1 }): void {
  const soil = o.surface === 'soil';
  const pitch = (0.93 + Math.random() * 0.14) * (o.foot === 1 ? 1.06 : 1) * (o.running ? 1.12 : 1);
  const firm = o.running ? 1.2 : 1;
  if (!soil) {
    const strength = firm * (0.92 + Math.random() * 0.16);
    const length = o.running ? 0.8 : 1;
    noise(ctx, out, { t, dur: 0.075 * length, peak: 0.065 * strength, attack: 0.007, type: 'lowpass', freq: 620 * pitch, q: 0.5 });
    noise(ctx, out, { t: t + 0.008, dur: 0.085 * length, peak: 0.026 * strength, attack: 0.009, type: 'bandpass', freq: 1550 * pitch, q: 0.65 });
    noise(ctx, out, { t: t + 0.025, dur: 0.065 * length, peak: 0.012 * strength, attack: 0.012, type: 'bandpass', freq: 3000 * pitch, q: 0.5 });
    return;
  }
  const strength = firm * (0.92 + Math.random() * 0.16);
  noise(ctx, out, { t, dur: o.running ? 0.035 : 0.045, peak: 0.07 * strength, attack: 0.002, type: 'lowpass', freq: 1250 * pitch, q: 0.5 });
  noise(ctx, out, {
    t: t + 0.009, dur: o.running ? 0.035 : 0.05, peak: 0.025 * strength, attack: 0.004,
    type: 'bandpass', freq: 2300 * pitch, q: 0.55,
  });
}

