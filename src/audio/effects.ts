/**
 * The game's sound effects as procedural recipes. A recipe schedules its voices from time `t` into `out`; the sound
 * system supplies the context, the bus and the clock. Levels are chosen so that the effects sit within a few dB of one
 * another (about -14 dBFS peak for the main events, quieter for UI and dialogue ticks) and the footsteps stay
 * soft (about -24 dBFS): `scripts/check-sound.mjs` and the offline render keep them honest.
 */
import { bell, noise, tone } from './synth.ts';

export type Recipe = (ctx: BaseAudioContext, out: AudioNode, t: number) => void;
export type EffectSurface = 'grass' | 'soil' | 'stone' | 'root';

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

function calibratedOutput(ctx: BaseAudioContext, out: AudioNode, gain: number, t: number, duration: number): GainNode {
  const trim = ctx.createGain();
  trim.gain.value = gain;
  trim.connect(out);
  // A silent finite source releases the trim on the audio clock, including offline rendering and suspension.
  const release = ctx.createBufferSource();
  release.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  release.loop = true;
  release.connect(trim);
  release.onended = () => { release.disconnect(); trim.disconnect(); };
  release.start(t);
  release.stop(t + duration);
  return trim;
}

/** Fixed offline-calibrated output trim; voice envelopes remain within the normal per-voice range. */
function calibratedRecipe(gain: number, duration: number, recipe: Recipe): Recipe {
  return (ctx, out, t) => recipe(ctx, calibratedOutput(ctx, out, gain, t, duration), t);
}

/** Rain heard through the observatory glass: soft high spray, a lower patter, then a clean fade. */
export const observatoryRain: Recipe = calibratedRecipe(1.326, 2.55, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 2.5, peak: 0.046, attack: 0.45, type: 'bandpass', freq: 3600, endFreq: 2200, q: 0.45 });
  noise(ctx, out, { t: t + 0.1, dur: 2.35, peak: 0.023, attack: 0.35, type: 'lowpass', freq: 2200, endFreq: 1100, q: 0.5 });
  [0.28, 0.84, 1.43, 1.91].forEach((offset, i) => {
    noise(ctx, out, { t: t + offset, dur: 0.075, peak: 0.014 - i * 0.0015, attack: 0.004, type: 'bandpass', freq: 4200 - i * 230, q: 0.8 });
  });
});

/** A wheel turning somewhere far off: a few diminishing creaks rather than a mechanical loop. */
export const wheelMemory: Recipe = calibratedRecipe(1.744, 1.85, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 76, endFreq: 104, type: 'triangle', dur: 1.8, peak: 0.032, attack: 0.14, lowpass: 180 });
  [0, 0.36, 0.72, 1.08].forEach((offset, i) => {
    noise(ctx, out, {
      t: t + offset, dur: 0.66 - i * 0.08, peak: 0.046 - i * 0.009, attack: 0.08,
      type: 'bandpass', freq: 280 - i * 20, endFreq: 190 - i * 12, q: 0.55,
    });
  });
});

/** Heavy statue rotation: low stone drag and a weighted stop, with none of the mirror's glassy tick. */
export const statueRotate: Recipe = calibratedRecipe(2.17, 1.35, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 1.3, peak: 0.12, attack: 0.18, type: 'lowpass', freq: 260, endFreq: 410, q: 0.55 });
  noise(ctx, out, { t: t + 0.04, dur: 1.05, peak: 0.045, attack: 0.22, type: 'bandpass', freq: 380, endFreq: 230, q: 0.65 });
  tone(ctx, out, { t, freq: 68, endFreq: 52, type: 'triangle', dur: 1.24, peak: 0.07, attack: 0.16, lowpass: 160 });
  noise(ctx, out, { t: t + 1.05, dur: 0.16, peak: 0.095, attack: 0.003, type: 'lowpass', freq: 360, q: 0.65 });
});

/** A narrow glass tube filling with light. */
export const tubeOn: Recipe = calibratedRecipe(1.176, 0.91, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 330, endFreq: 659.25, dur: 0.78, peak: 0.14, attack: 0.12 });
  bell(ctx, out, t + 0.14, 987.77, { peak: 0.055, dur: 0.72, bright: 0.24 });
  noise(ctx, out, { t: t + 0.02, dur: 0.62, peak: 0.022, attack: 0.22, type: 'bandpass', freq: 1900, endFreq: 3200, q: 0.55 });
});

/** The tube's light drains away in one descending hum. */
export const tubeOff: Recipe = calibratedRecipe(1.091, 0.67, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 659.25, endFreq: 246.94, dur: 0.62, peak: 0.13, attack: 0.015, lowpass: 1500 });
  noise(ctx, out, { t, dur: 0.34, peak: 0.026, attack: 0.006, type: 'bandpass', freq: 2800, endFreq: 900, q: 0.7 });
});

/** Lumo zips by with a bright chirrup and a small airy flutter. */
export const lumoFly: Recipe = calibratedRecipe(1.435, 0.64, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 587.33, endFreq: 1174.66, dur: 0.43, peak: 0.11, attack: 0.025 });
  bell(ctx, out, t + 0.11, 1396.91, { peak: 0.06, dur: 0.48, bright: 0.22 });
  noise(ctx, out, { t, dur: 0.48, peak: 0.022, attack: 0.09, type: 'bandpass', freq: 2300, endFreq: 4200, q: 0.55 });
});

/** Lumo's light drifts off into the distance and ends. */
export const lumoLeave: Recipe = calibratedRecipe(0.963, 1.1, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 1174.66, endFreq: 659.25, dur: 1.05, peak: 0.07, attack: 0.06, lowpass: 3200 });
  bell(ctx, out, t + 0.12, 1567.98, { peak: 0.052, dur: 0.7, bright: 0.2 });
  noise(ctx, out, { t: t + 0.08, dur: 0.96, peak: 0.018, attack: 0.24, type: 'bandpass', freq: 4300, endFreq: 2300, q: 0.5 });
});

/** A stone slider scrapes into place and lands with a short locking clunk. */
export const stoneRing: Recipe = calibratedRecipe(1.635, 0.77, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.72, peak: 0.105, attack: 0.09, type: 'bandpass', freq: 620, endFreq: 250, q: 0.62 });
  tone(ctx, out, { t: t + 0.47, freq: 116, endFreq: 58, type: 'triangle', dur: 0.24, peak: 0.13, attack: 0.004, lowpass: 280 });
  noise(ctx, out, { t: t + 0.49, dur: 0.11, peak: 0.065, attack: 0.002, type: 'lowpass', freq: 740, endFreq: 260, q: 0.55 });
});

/** A gentle warm pulse running through roots and soil. */
export const rootsWarm: Recipe = calibratedRecipe(0.903, 1.6, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 1.55, peak: 0.07, attack: 0.4, type: 'lowpass', freq: 360, endFreq: 720, q: 0.45 });
  tone(ctx, out, { t: t + 0.08, freq: 220, endFreq: 329.63, dur: 1.28, peak: 0.12, attack: 0.42, lowpass: 1000 });
  bell(ctx, out, t + 0.25, 659.25, { peak: 0.044, dur: 0.9, bright: 0.2 });
});

/** A living bridge stretches upward into place with a slow woody groan. */
export const rootBridgeGrow: Recipe = calibratedRecipe(2.278, 2.5, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 2.45, peak: 0.13, attack: 0.3, type: 'lowpass', freq: 240, endFreq: 560, q: 0.55 });
  noise(ctx, out, { t: t + 0.08, dur: 2.25, peak: 0.052, attack: 0.32, type: 'bandpass', freq: 520, endFreq: 950, q: 0.7 });
  tone(ctx, out, { t: t + 0.06, freq: 68, endFreq: 130.81, type: 'triangle', dur: 2.35, peak: 0.065, attack: 0.35, lowpass: 220 });
});

/** The root bridge relaxes back down with the same material moving in reverse. */
export const rootBridgeRetract: Recipe = calibratedRecipe(1.982, 2.5, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 2.45, peak: 0.13, attack: 0.28, type: 'lowpass', freq: 560, endFreq: 190, q: 0.55 });
  noise(ctx, out, { t: t + 0.08, dur: 2.25, peak: 0.05, attack: 0.3, type: 'bandpass', freq: 940, endFreq: 430, q: 0.7 });
  tone(ctx, out, { t: t + 0.06, freq: 130.81, endFreq: 58.27, type: 'triangle', dur: 2.35, peak: 0.065, attack: 0.32, lowpass: 220 });
});

/** The memory arrives as a low impact with a short, distant shimmer. */
export const memoryImpact: Recipe = calibratedRecipe(1.416, 1.13, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 110, endFreq: 48, type: 'triangle', dur: 0.58, peak: 0.13, attack: 0.003, lowpass: 260 });
  noise(ctx, out, { t, dur: 0.2, peak: 0.075, attack: 0.002, type: 'lowpass', freq: 800, endFreq: 220, q: 0.6 });
  bell(ctx, out, t + 0.08, 523.25, { peak: 0.045, dur: 1.0, bright: 0.25 });
});

/** Water washes out of the memory over a few seconds. */
export const memoryWaterFade: Recipe = calibratedRecipe(1.409, 3.05, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 3.0, peak: 0.07, attack: 0.18, type: 'bandpass', freq: 1500, endFreq: 720, q: 0.42 });
  noise(ctx, out, { t: t + 0.12, dur: 2.82, peak: 0.028, attack: 0.28, type: 'lowpass', freq: 900, endFreq: 340, q: 0.45 });
  [0.45, 1.05, 1.75, 2.3, 2.66].forEach((offset, i) => {
    tone(ctx, out, { t: t + offset, freq: 1150 - i * 90, endFreq: 1550 - i * 110,
      dur: 0.06, peak: 0.014 - i * 0.0025, attack: 0.003 });
  });
});

/** Three brittle cracks in quick succession. */
export const memoryCracks: Recipe = calibratedRecipe(1.943, 0.7, (ctx, out, t) => {
  [0, 0.19, 0.43].forEach((offset, i) => {
    noise(ctx, out, { t: t + offset, dur: 0.085, peak: 0.17 - i * 0.027, attack: 0.002, type: 'bandpass', freq: 1500 + i * 650, endFreq: 3300 + i * 500, q: 0.85 });
    tone(ctx, out, { t: t + offset, freq: 1046.5 - i * 196, endFreq: 880 - i * 146, dur: 0.22, peak: 0.035 - i * 0.006, attack: 0.002, lowpass: 2600 });
  });
});

/** A bright memory bloom rises and then leaves a clear silence. */
export const memoryFlash: Recipe = calibratedRecipe(1.183, 1.35, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 1.3, peak: 0.11, attack: 0.16, type: 'bandpass', freq: 1700, endFreq: 6200, q: 0.42 });
  bell(ctx, out, t + 0.1, 1046.5, { peak: 0.085, dur: 1.15, bright: 0.32 });
  bell(ctx, out, t + 0.19, 1567.98, { peak: 0.044, dur: 0.78, bright: 0.25 });
});

/** Two remembered pitches bend toward the same note and meet. */
export const memoryMerge: Recipe = calibratedRecipe(1.019, 1.83, (ctx, out, t) => {
  tone(ctx, out, { t, freq: 329.63, endFreq: 523.25, dur: 1.4, peak: 0.1, attack: 0.12 });
  tone(ctx, out, { t, freq: 783.99, endFreq: 523.25, dur: 1.4, peak: 0.1, attack: 0.12 });
  bell(ctx, out, t + 0.98, 523.25, { peak: 0.045, dur: 0.8, bright: 0.22 });
});

/** A finite eight-second low rain and wind bed for repeatable recording; no scheduler or looping ambience is started. */
export const memoryWeather: Recipe = calibratedRecipe(1.183, 8.05, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 8, peak: 0.085, attack: 1.1, type: 'lowpass', freq: 340, endFreq: 540, q: 0.45 });
  noise(ctx, out, { t: t + 0.06, dur: 7.94, peak: 0.04, attack: 1.35, type: 'bandpass', freq: 620, endFreq: 980, q: 0.5 });
  tone(ctx, out, { t, freq: 52, endFreq: 58, dur: 8, peak: 0.035, attack: 1.4, lowpass: 110 });
});

/** A short, soft ink-and-brush scratch in the margin. */
export const marginInk: Recipe = calibratedRecipe(1.524, 0.94, (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.86, peak: 0.043, attack: 0.035, type: 'bandpass', freq: 2100, endFreq: 900, q: 0.65 });
  noise(ctx, out, { t: t + 0.17, dur: 0.72, peak: 0.028, attack: 0.08, type: 'lowpass', freq: 760, endFreq: 420, q: 0.5 });
  tone(ctx, out, { t: t + 0.04, freq: 220, endFreq: 164.81, type: 'triangle', dur: 0.64, peak: 0.018, attack: 0.04, lowpass: 500 });
});

/**
 * Forest steps are unpitched: a soft sole pressing earth, a little leaf crunch and a brief trailing brush.
 * Filters, strength and buffer offsets vary each step; running makes the contact shorter and a little firmer.
 * The legacy "soil" surface is used on indoor stone floors: a firmer unpitched sole contact and scuff, without leaves.
 */
export function footstep(ctx: BaseAudioContext, out: AudioNode, t: number, o: { surface: EffectSurface; running: boolean; foot: 0 | 1 }): void {
  const soil = o.surface === 'soil';
  const pitch = (0.93 + Math.random() * 0.14) * (o.foot === 1 ? 1.06 : 1) * (o.running ? 1.12 : 1);
  const firm = o.running ? 1.2 : 1;
  if (o.surface === 'stone') {
    const surfaceOut = calibratedOutput(ctx, out, 2.6, t, 0.14);
    const strength = firm * (0.92 + Math.random() * 0.16);
    noise(ctx, surfaceOut, { t, dur: o.running ? 0.032 : 0.045, peak: 0.058 * strength, attack: 0.002, type: 'lowpass', freq: 980 * pitch, q: 0.5 });
    noise(ctx, surfaceOut, { t: t + 0.006, dur: o.running ? 0.035 : 0.052, peak: 0.022 * strength, attack: 0.003, type: 'bandpass', freq: 2450 * pitch, q: 0.7 });
    noise(ctx, surfaceOut, { t: t + 0.022, dur: 0.055, peak: 0.009 * strength, attack: 0.008, type: 'bandpass', freq: 1450 * pitch, endFreq: 900, q: 0.55 });
    return;
  }
  if (o.surface === 'root') {
    const surfaceOut = calibratedOutput(ctx, out, 5.8, t, 0.15);
    const strength = firm * (0.92 + Math.random() * 0.16);
    noise(ctx, surfaceOut, { t, dur: o.running ? 0.05 : 0.07, peak: 0.05 * strength, attack: 0.006, type: 'lowpass', freq: 430 * pitch, q: 0.45 });
    noise(ctx, surfaceOut, { t: t + 0.012, dur: 0.075, peak: 0.021 * strength, attack: 0.014, type: 'bandpass', freq: 930 * pitch, endFreq: 520, q: 0.62 });
    noise(ctx, surfaceOut, { t: t + 0.028, dur: 0.05, peak: 0.008 * strength, attack: 0.012, type: 'bandpass', freq: 1800 * pitch, q: 0.5 });
    return;
  }
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

export interface EffectCatalogEntry {
  recipe: Recipe;
  /** Seconds from `t` until the last voice stops, including the synth's 50 ms stop margin. */
  durationSeconds: number;
  /** Approximate unmastered peak target for the offline render, in dBFS. */
  targetPeakDbfs: number;
}

/** Named observatory recipes and the bounds/peak targets used by offline sound measurement. */
export const EFFECT_CATALOG: Readonly<Record<string, EffectCatalogEntry>> = {
  observatoryRain: { recipe: observatoryRain, durationSeconds: 2.55, targetPeakDbfs: -24 },
  wheelMemory: { recipe: wheelMemory, durationSeconds: 1.85, targetPeakDbfs: -24 },
  statueRotate: { recipe: statueRotate, durationSeconds: 1.35, targetPeakDbfs: -14 },
  tubeOn: { recipe: tubeOn, durationSeconds: 0.91, targetPeakDbfs: -14 },
  tubeOff: { recipe: tubeOff, durationSeconds: 0.67, targetPeakDbfs: -16 },
  lumoFly: { recipe: lumoFly, durationSeconds: 0.64, targetPeakDbfs: -16 },
  lumoLeave: { recipe: lumoLeave, durationSeconds: 1.1, targetPeakDbfs: -20 },
  stoneRing: { recipe: stoneRing, durationSeconds: 0.77, targetPeakDbfs: -14 },
  rootsWarm: { recipe: rootsWarm, durationSeconds: 1.6, targetPeakDbfs: -18 },
  rootBridgeGrow: { recipe: rootBridgeGrow, durationSeconds: 2.5, targetPeakDbfs: -14 },
  rootBridgeRetract: { recipe: rootBridgeRetract, durationSeconds: 2.5, targetPeakDbfs: -14 },
  memoryImpact: { recipe: memoryImpact, durationSeconds: 1.13, targetPeakDbfs: -14 },
  memoryWaterFade: { recipe: memoryWaterFade, durationSeconds: 3.05, targetPeakDbfs: -22 },
  memoryCracks: { recipe: memoryCracks, durationSeconds: 0.7, targetPeakDbfs: -14 },
  memoryFlash: { recipe: memoryFlash, durationSeconds: 1.35, targetPeakDbfs: -14 },
  memoryMerge: { recipe: memoryMerge, durationSeconds: 1.83, targetPeakDbfs: -14 },
  memoryWeather: { recipe: memoryWeather, durationSeconds: 8.05, targetPeakDbfs: -22 },
  marginInk: { recipe: marginInk, durationSeconds: 0.94, targetPeakDbfs: -26 },
};

