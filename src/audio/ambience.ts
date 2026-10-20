/**
 * Level ambience built from Web Audio nodes: wind, crickets, running water, a low drone, a warm pad and a sparse
 * bell melody. A theme is a mix of these layers; `startAmbience` fades it in and returns a handle that fades it out
 * and releases every node and timer. The beds are continuous nodes (no timers); only the crickets, the water bubbles
 * and the melody use timers, to place their sparse events a moment ahead on the audio clock.
 */
import { bell, noiseBuffer, tone } from './synth.ts';

export type AmbienceTheme = 'forest' | 'library' | 'creek' | 'wind' | 'drone' | 'heart';

export interface AmbienceHandle {
  stop(fadeSeconds: number): void;
}

type Release = () => void;
/** `bed` carries the continuous layers (trimmed per theme); `events` carries the sparse ones (crickets, bubbles, bells). */
type Layer = (ctx: BaseAudioContext, bed: AudioNode, events: AudioNode, level: number, release: Release[], timers: Array<() => void>) => void;

/** Low, slow wind: filtered noise whose loudness and colour drift on two very slow oscillators. */
const wind = (centre: number): Layer => (ctx, bed, _events, level, release) => {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = centre;
  band.Q.value = 0.5;
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 1100;
  const gain = ctx.createGain();
  gain.gain.value = level * 0.6;
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.06;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = level * 0.4;
  swell.connect(swellDepth);
  swellDepth.connect(gain.gain);
  const colour = ctx.createOscillator();
  colour.frequency.value = 0.045;
  const colourDepth = ctx.createGain();
  colourDepth.gain.value = centre * 0.4;
  colour.connect(colourDepth);
  colourDepth.connect(band.frequency);
  source.connect(band);
  band.connect(soften);
  soften.connect(gain);
  gain.connect(bed);
  source.start(0, Math.random() * 1.5);
  swell.start();
  colour.start();
  release.push(() => { source.stop(); swell.stop(); colour.stop(); });
};

/** Running water: a mid band of noise that breathes, a faint high hiss, and now and then a little bubble. */
const water: Layer = (ctx, bed, events, level, release, timers) => {
  const make = (type: BiquadFilterType, freq: number, gainValue: number, lfoHz: number): void => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = gainValue * level;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoHz;
    const depth = ctx.createGain();
    depth.gain.value = gainValue * level * 0.35;
    lfo.connect(depth);
    depth.connect(gain.gain);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bed);
    source.start(0, Math.random() * 1.5);
    lfo.start();
    release.push(() => { source.stop(); lfo.stop(); });
  };
  make('bandpass', 650, 0.5, 0.21);
  make('highpass', 3200, 0.02, 0.13);
  const bubbles = setInterval(() => {
    if (Math.random() > 0.45) return;
    const f = 500 + Math.random() * 400;
    tone(ctx, events, { t: ctx.currentTime + Math.random() * 0.2, freq: f, endFreq: f * 1.6, dur: 0.03 + Math.random() * 0.03, peak: 0.012 * level, attack: 0.004 });
  }, 250);
  timers.push(() => clearInterval(bubbles));
};

/** A very low, slow-breathing drone: two slightly detuned low notes and a fifth, closed in by a low-pass. */
const drone: Layer = (ctx, bed, _events, level, release) => {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  const gain = ctx.createGain();
  gain.gain.value = 0.7 * level * 0.05;
  const breath = ctx.createOscillator();
  breath.frequency.value = 0.045;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 0.3 * level * 0.05;
  breath.connect(breathDepth);
  breathDepth.connect(gain.gain);
  filter.connect(gain);
  gain.connect(bed);
  const oscillators = [[55, 1], [55.35, 0.8], [82.41, 0.5]].map(([freq, weight]) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const level_ = ctx.createGain();
    level_.gain.value = weight;
    osc.connect(level_);
    level_.connect(filter);
    osc.start();
    return osc;
  });
  breath.start();
  release.push(() => { oscillators.forEach((osc) => osc.stop()); breath.stop(); });
};

/** A warm chord that swells and sinks very slowly. */
const pad: Layer = (ctx, bed, _events, level, release) => {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0.7 * level * 0.045;
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.07;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.3 * level * 0.045;
  swell.connect(swellDepth);
  swellDepth.connect(gain.gain);
  filter.connect(gain);
  gain.connect(bed);
  const oscillators = [220, 277.18, 329.63, 440].map((freq) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const voice = ctx.createGain();
    voice.gain.value = 0.25;
    osc.connect(voice);
    voice.connect(filter);
    osc.start();
    return osc;
  });
  swell.start();
  release.push(() => { oscillators.forEach((osc) => osc.stop()); swell.stop(); });
};

/** Night crickets: a rare chirp of three short pulses, each voice at its own pitch, never a constant buzz. */
const crickets: Layer = (ctx, _bed, events, level, _release, timers) => {
  const timer = setInterval(() => {
    if (Math.random() > 0.5) return;
    const pitch = 4100 + Math.random() * 500;
    const start = ctx.currentTime + Math.random() * 0.8;
    for (let i = 0; i < 3; i += 1) tone(ctx, events, { t: start + i * 0.085, freq: pitch, endFreq: pitch * 1.03, dur: 0.04, peak: 0.012 * level, attack: 0.004 });
  }, 700);
  timers.push(() => clearInterval(timer));
};

/** A sparse, quiet bell melody: one or two notes of a pentatonic scale, then a long silence. */
const melody = (scale: readonly number[], minGap: number, maxGap: number): Layer => (ctx, _bed, events, level, _release, timers) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (): void => {
    timer = setTimeout(() => {
      const t = ctx.currentTime + 0.05;
      const first = scale[Math.floor(Math.random() * scale.length)];
      bell(ctx, events, t, first, { peak: 0.02 * level, dur: 3.2, bright: 0.25 });
      if (Math.random() < 0.5) {
        const second = scale[Math.floor(Math.random() * scale.length)];
        bell(ctx, events, t + 0.55, second, { peak: 0.016 * level, dur: 3.0, bright: 0.25 });
      }
      schedule();
    }, (minGap + Math.random() * (maxGap - minGap)) * 1000);
  };
  schedule();
  timers.push(() => { if (timer !== undefined) clearTimeout(timer); });
};

const PENTATONIC_A = [440, 493.88, 554.37, 659.25, 739.99];
const PENTATONIC_LOW = [220, 261.63, 329.63, 392];

const THEMES: Record<AmbienceTheme, ReadonlyArray<readonly [Layer, number]>> = {
  forest: [[wind(420), 0.5], [crickets, 1], [melody(PENTATONIC_A, 8, 16), 1]],
  library: [[drone, 1], [wind(300), 0.15], [melody(PENTATONIC_LOW, 7, 14), 1]],
  creek: [[water, 1], [wind(350), 0.2], [melody(PENTATONIC_A, 10, 18), 0.8]],
  wind: [[wind(380), 0.9]],
  drone: [[drone, 1], [melody(PENTATONIC_LOW, 9, 16), 0.8]],
  heart: [[pad, 1], [wind(320), 0.15], [melody(PENTATONIC_A, 6, 12), 1]],
};

/** How loud each theme's continuous bed sits (a gain on `bed`), measured so every bed lands near -37 dBFS RMS. */
const BED_TRIM: Record<AmbienceTheme, number> = { forest: 0.2, library: 0.25, creek: 0.17, wind: 0.12, drone: 0.25, heart: 0.6 };

export function startAmbience(ctx: BaseAudioContext, out: AudioNode, theme: AmbienceTheme, fadeInSeconds = 1.5): AmbienceHandle {
  const master = ctx.createGain();
  const now = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(1, now + fadeInSeconds);
  master.connect(out);
  const bed = ctx.createGain();
  bed.gain.value = BED_TRIM[theme];
  bed.connect(master);
  const events = ctx.createGain();
  events.connect(master);
  const release: Release[] = [];
  const timers: Array<() => void> = [];
  for (const [layer, level] of THEMES[theme]) layer(ctx, bed, events, level, release, timers);
  let stopped = false;
  return {
    stop(fadeSeconds: number): void {
      if (stopped) return;
      stopped = true;
      timers.forEach((clear) => clear());
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
      master.gain.linearRampToValueAtTime(0.0001, t + fadeSeconds);
      setTimeout(() => {
        for (const free of release) {
          try { free(); } catch { /* a node that already stopped */ }
        }
        try { master.disconnect(); } catch { /* already disconnected */ }
      }, fadeSeconds * 1000 + 120);
    },
  };
}
