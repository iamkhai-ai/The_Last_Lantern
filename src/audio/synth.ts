/**
 * Web Audio building blocks for the game's procedural sound. Everything is scheduled on the audio clock (`t` is in
 * seconds on `ctx.currentTime`), takes the context as a `BaseAudioContext` so it also renders in an
 * `OfflineAudioContext` (used to measure loudness), and is built only from oscillators, one shared noise buffer and
 * biquad filters: there are no audio files.
 */

export interface ToneOptions {
  t: number;
  freq: number;
  /** Glide to this frequency over the tone's length. */
  endFreq?: number;
  type?: OscillatorType;
  dur: number;
  peak: number;
  attack?: number;
  lowpass?: number;
}

export interface NoiseOptions {
  t: number;
  dur: number;
  peak: number;
  attack?: number;
  type?: BiquadFilterType;
  freq: number;
  endFreq?: number;
  q?: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise from a fixed seed, shared by every noise voice of a context. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    const length = Math.floor(ctx.sampleRate * 2);
    buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x2f6e2b1;
    for (let i = 0; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 0x80000000 - 1;
    }
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function envelope(ctx: BaseAudioContext, t: number, attack: number, dur: number, peak: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return gain;
}

/** One oscillator with a fast attack and an exponential fade, optionally gliding and low-passed. */
export function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOptions): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, o.t);
  if (o.endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.endFreq), o.t + o.dur);
  const gain = envelope(ctx, o.t, Math.min(o.attack ?? 0.01, o.dur * 0.4), o.dur, o.peak);
  if (o.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = o.lowpass;
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(out);
  osc.start(o.t);
  osc.stop(o.t + o.dur + 0.05);
}

/** A burst of filtered noise with the same kind of envelope. */
export function noise(ctx: BaseAudioContext, out: AudioNode, o: NoiseOptions): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'lowpass';
  filter.frequency.setValueAtTime(o.freq, o.t);
  if (o.endFreq !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.endFreq), o.t + o.dur);
  filter.Q.value = o.q ?? 0.7;
  const gain = envelope(ctx, o.t, Math.min(o.attack ?? 0.01, o.dur * 0.4), o.dur, o.peak);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  source.start(o.t, Math.random() * 1.5);
  source.stop(o.t + o.dur + 0.05);
}

export interface BellOptions {
  peak: number;
  dur: number;
  /** Level of the upper partials relative to the fundamental (default 0.35). */
  bright?: number;
}

/** A soft glassy bell: the fundamental rings longest, the upper partials die away sooner. */
export function bell(ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, o: BellOptions): void {
  const bright = o.bright ?? 0.35;
  tone(ctx, out, { t, freq, dur: o.dur, peak: o.peak, attack: 0.004 });
  tone(ctx, out, { t, freq: freq * 2.01, dur: o.dur * 0.55, peak: o.peak * bright, attack: 0.003 });
  tone(ctx, out, { t, freq: freq * 3.02, dur: o.dur * 0.3, peak: o.peak * bright * 0.4, attack: 0.002 });
}
