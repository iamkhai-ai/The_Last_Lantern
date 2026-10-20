import { tone } from './synth.ts';

/** Original sixteen-bar theme: a small light finding its way through a sleeping forest. */
export const MUSIC_BPM = 65;
const BEAT_SECONDS = 60 / MUSIC_BPM;
export const MUSIC_LOOP_BEATS = 64;
export const MUSIC_LOOP_SECONDS = MUSIC_LOOP_BEATS * BEAT_SECONDS;

export interface MusicNote {
  beat: number;
  midi: number;
  beats: number;
  velocity: number;
  voice: 'pad' | 'melody';
}

// Aadd9 / F#m7 / Dmaj9 / Esus2. Open voicings leave room for the forest and dialogue.
const HARMONY = [
  [45, 52, 59, 61], [42, 57, 61, 64], [50, 57, 61, 64], [47, 52, 59, 66],
  [45, 52, 59, 61], [50, 57, 61, 64], [42, 57, 61, 64], [47, 52, 59, 66],
];

// Beat, pitch, duration: a recurring A–B–C# motif with breathing room between phrases.
const MELODY: ReadonlyArray<readonly [number, number, number]> = [
  [1, 69, 1.5], [3, 71, 1], [4.5, 73, 2], [7, 76, 2],
  [10, 73, 1.5], [12, 71, 1], [13.5, 69, 2.5],
  [17, 69, 1.5], [19.5, 73, 1.5], [22, 76, 2],
  [25, 78, 1.5], [27.5, 76, 1.5], [30, 71, 2],
  [33, 69, 1.5], [35, 71, 1], [36.5, 73, 2], [39, 76, 2],
  [42, 73, 1.5], [44, 69, 1.5], [46, 68, 2],
  [49, 66, 2], [52, 69, 1.5], [54.5, 73, 2],
  [57, 71, 1.5], [59.5, 68, 1.5], [62, 64, 1.5],
];

export const MUSIC_SCORE: readonly MusicNote[] = [
  ...HARMONY.flatMap((chord, i) => chord.map((midi, voice): MusicNote => ({
    beat: i * 8, midi, beats: 8.25, velocity: voice === 0 ? 0.65 : 1, voice: 'pad',
  }))),
  ...MELODY.map(([beat, midi, beats], i): MusicNote => ({
    beat, midi, beats, velocity: i % 3 === 0 ? 1 : 0.82, voice: 'melody',
  })),
].sort((a, b) => a.beat - b.beat);

/** Shared by the live scheduler and the offline listening preview. */
export function playMusicNote(ctx: BaseAudioContext, out: AudioNode, t: number, note: MusicNote, level = 1): void {
  const freq = 440 * 2 ** ((note.midi - 69) / 12);
  const dur = note.beats * BEAT_SECONDS;
  if (note.voice === 'pad') {
    tone(ctx, out, { t, freq, dur, peak: 0.007 * note.velocity * level, attack: 1.7 });
  } else {
    // Rounded fundamental and a faint upper partial, with no sharp bell attack.
    tone(ctx, out, { t, freq, dur, peak: 0.023 * note.velocity * level, attack: 0.025 });
    tone(ctx, out, { t, freq: freq * 2.002, dur: dur * 0.45, peak: 0.002 * note.velocity * level, attack: 0.018 });
  }
}

/** Schedule only a short distance ahead, using the audio clock rather than accumulating timer drift. */
export function startMusic(ctx: BaseAudioContext, out: AudioNode, level = 1): () => void {
  const origin = ctx.currentTime + 0.05;
  let cycle = 0;
  let index = 0;
  const pump = (): void => {
    const now = ctx.currentTime;
    const currentCycle = Math.max(0, Math.floor((now - origin) / MUSIC_LOOP_SECONDS));
    // A background tab may miss several timer callbacks; skip old notes instead of replaying a backlog.
    if (currentCycle > cycle) { cycle = currentCycle; index = 0; }
    for (;;) {
      const note = MUSIC_SCORE[index];
      const t = origin + cycle * MUSIC_LOOP_SECONDS + note.beat * BEAT_SECONDS;
      if (t > now + 0.3) break;
      if (t >= now - 0.02) playMusicNote(ctx, out, Math.max(now + 0.005, t), note, level);
      index += 1;
      if (index === MUSIC_SCORE.length) { index = 0; cycle += 1; }
    }
  };
  pump();
  const timer = setInterval(pump, 100);
  return () => clearInterval(timer);
}
