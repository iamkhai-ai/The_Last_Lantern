/**
 * Level ambience built from Web Audio nodes: wind, crickets, running water, a low drone, a warm pad and a sparse
 * composed bell theme. A theme is a mix of these layers; `startAmbience` fades it in and returns a handle that fades it out
 * and releases every node and timer. The beds are continuous nodes (no timers); only the crickets, the water bubbles
 * and music use timers, to place their events a moment ahead on the audio clock.
 */
import { noiseBuffer, tone } from './synth.ts';
import { startMusic } from './music.ts';

export type AmbienceTheme = 'forest' | 'library' | 'creek' | 'wind' | 'drone' | 'heart'
  | 'tower' | 'tower-restored' | 'garden' | 'garden-restored';

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

/** Two insects answer across the restored nursery, with long rests between pairs. */
const gardenCrickets: Layer = (ctx, _bed, events, level, _release, timers) => {
  const pair = (delay: number): void => {
    const start = ctx.currentTime + delay;
    const pitch = 4100 + Math.random() * 300;
    for (let i = 0; i < 3; i += 1) tone(ctx, events, { t: start + i * 0.09, freq: pitch, dur: 0.045, peak: 0.01 * level, attack: 0.006 });
    for (let i = 0; i < 2; i += 1) tone(ctx, events, { t: start + 0.8 + i * 0.11, freq: pitch * 0.86, dur: 0.055, peak: 0.008 * level, attack: 0.006 });
  };
  pair(1.0);
  const timer = setInterval(() => { if (Math.random() < 0.7) pair(0.05); }, 6500);
  timers.push(() => clearInterval(timer));
};

/** The tower's working machinery: a quiet rounded hum breathing with the wheel. */
const machine: Layer = (ctx, bed, _events, level, release) => {
  const motor = ctx.createOscillator();
  motor.type = 'triangle';
  motor.frequency.value = 110;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  const gain = ctx.createGain();
  gain.gain.value = 0.025 * level;
  const wheel = ctx.createOscillator();
  wheel.frequency.value = 0.8;
  const depth = ctx.createGain();
  depth.gain.value = 0.009 * level;
  wheel.connect(depth);
  depth.connect(gain.gain);
  motor.connect(filter);
  filter.connect(gain);
  gain.connect(bed);
  motor.start();
  wheel.start();
  release.push(() => { motor.stop(); wheel.stop(); });
};

/** The composed theme shares the ambience fade and lifetime, including mute and scene shutdown. */
const music: Layer = (ctx, _bed, events, level, _release, timers) => {
  timers.push(startMusic(ctx, events, level));
};

const THEMES: Record<AmbienceTheme, ReadonlyArray<readonly [Layer, number]>> = {
  forest: [[wind(420), 0.5], [crickets, 1], [music, 0.8]],
  library: [[drone, 1], [wind(300), 0.15], [music, 0.55]],
  creek: [[water, 1], [wind(350), 0.2], [music, 0.65]],
  wind: [[wind(380), 0.9], [music, 0.5]],
  drone: [[drone, 1], [music, 0.45]],
  heart: [[pad, 1], [wind(320), 0.15], [music, 0.85]],
  tower: [[wind(380), 0.25], [machine, 1], [music, 0.5]],
  'tower-restored': [[wind(380), 0.25], [water, 0.35], [music, 0.5]],
  garden: [[wind(420), 0.5], [music, 0.8]],
  'garden-restored': [[wind(420), 0.4], [water, 0.4], [gardenCrickets, 1], [music, 0.8]],
};

/** Environmental bed trims. Story water layers sit lower to leave room for dialogue and the first insects. */
const BED_TRIM: Record<AmbienceTheme, number> = {
  forest: 0.2, library: 0.25, creek: 0.17, wind: 0.12, drone: 0.25, heart: 0.6,
  tower: 0.5, 'tower-restored': 0.17, garden: 0.2, 'garden-restored': 0.17,
};

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
