/**
 * The campaign ending as pure data and a pure beat machine (scenario 10, sections 6 and 7). No Phaser import:
 * `CampaignEndingSequence` draws what this module decides, and `scripts/check-campaign-ending.mjs` drives the very
 * same machine with mock timers, so the timeline the check proves is the timeline the game runs.
 */
import { CAMPAIGN_ENDING_BEATS, type CampaignEndingBeat } from '../systems/CampaignSaveSystem.ts';

export type { CampaignEndingBeat };
export { CAMPAIGN_ENDING_BEATS };

export interface EndingLine {
  speaker: 'Nhinh' | 'Lumo' | 'The Shadow';
  text: string;
}

/** Section 6, the call into the dark. Nothing else is on screen: no objective, no counter. */
export const NIGHT_CALL_LINES: readonly EndingLine[] = [{ speaker: 'Nhinh', text: 'Lumo?' }];

/** The silence is real time: it is not skipped by E or Space, and it does not count while the scene is paused. */
export const NIGHT_WAIT_MS = 1400;

/**
 * Scenario 10 v2 §6: the night returns only after the silence. From the start of the reassurance, the cricket, the water
 * and the answering cricket play one by one, then the dawn chord; Lumo's light and the fireflies ramp over `NIGHT_RETURN_MS`.
 */
export const NIGHT_SOUND_STEPS: ReadonlyArray<{ at: number; cue: 'cricket' | 'water' | 'answer' | 'dawn' }> = [
  { at: 0, cue: 'cricket' },
  { at: 450, cue: 'water' },
  { at: 900, cue: 'answer' },
  { at: 1400, cue: 'dawn' },
];
export const NIGHT_RETURN_MS = 1400;

export const REASSURE_LINES: readonly EndingLine[] = [
  { speaker: 'Lumo', text: 'Tôi đây.' },
  { speaker: 'Nhinh', text: 'Tôi vẫn thấy cậu.' },
];

/** The camera visits the garden, the creek, the tower and the observatory; each shot has a beat to be looked at. */
export const MONTAGE_SHOTS = ['garden', 'creek', 'tower', 'observatory'] as const;
export type MontageShot = (typeof MONTAGE_SHOTS)[number];
export const MONTAGE_SHOT_MIN_MS = 1500;
export const MONTAGE_SHOT_MS = 3400;

export const SHADOW_DAWN_LINES: readonly EndingLine[] = [{ speaker: 'The Shadow', text: 'Trời sáng rồi.' }];
/** Registered Shadow poses, in order: he looks at the horizon, then fades with the dawn. The wheel keeps turning. */
export const SHADOW_DAWN_POSES = ['dawn-afterimage', 'dawn-dissolve-1', 'dawn-dissolve-2', 'dawn-empty'] as const;
export const SHADOW_DAWN_POSE_MS = 650;

export const TREE_RETURN_LINES: readonly EndingLine[] = [
  { speaker: 'Lumo', text: 'Lần này… chúng ta đã để đêm đi hết con đường của nó.' },
  { speaker: 'Nhinh', text: 'Và bình minh tự tìm được đường về.' },
];

/** Scenario 10 v2 §7: the five small marks of the "Những dấu nhỏ" side thread, each set by its own level. */
export const SMALL_MARK_FLAGS = ['l4-chalk-seen', 'l5-tally-seen', 'l6-handprint-seen', 'l7-name-seen', 'l8-margin-seen'] as const;

/** Scenario 10 v2 §7: two lines before the seated lines, spoken only when every small mark was found. */
export const SMALL_MARK_LINES: readonly EndingLine[] = [
  { speaker: 'Nhinh', text: 'Một người đếm từng đêm. Một người từng vẽ đom đóm lên tường. Mình không biết họ có gặp lại nhau không.' },
  { speaker: 'Lumo', text: 'Nhưng cả hai đều đã chờ.' },
];

/** True only when all five small-mark flags are set (read by exact name; other levels write them). */
export function hasAllSmallMarks(flags: Readonly<Record<string, unknown>>): boolean {
  return SMALL_MARK_FLAGS.every((flag) => flags[flag] === true);
}

/** Section 7, in order. The girl's fate is not mentioned anywhere in the ending. */
export const SEATED_LINES: readonly EndingLine[] = [
  { speaker: 'Lumo', text: 'Cậu vẫn mang nó theo chứ?' },
  { speaker: 'Nhinh', text: 'Có. Trên đường chắc sẽ còn lúc cần một ngọn đèn.' },
  { speaker: 'Lumo', text: 'Còn khi không cần nữa?' },
  { speaker: 'Nhinh', text: 'Mình sẽ tắt đi.' },
  { speaker: 'Lumo', text: 'Cậu định đi đâu?' },
  { speaker: 'Nhinh', text: 'Trước hết, đi xem khu rừng vào ban ngày.' },
  { speaker: 'Lumo', text: 'Tôi đi cùng được không?' },
  { speaker: 'Nhinh', text: 'Đó là lối đi cho hai người mà.' },
];

/** Two figures walk away on the trail, then the title appears; only then does E lead to the credits. */
export const TRAIL_TITLE_MS = 3600;

export const ENDING_PROMPT_CONTINUE = 'E / Space · Tiếp tục';
export const ENDING_PROMPT_CREDITS = 'E · Xem credits';

/** Dialogue shown on entering a beat, or null. `smallMarks` adds the two side-thread lines before the seated scene. */
export function endingBeatLines(beat: CampaignEndingBeat, options: { smallMarks?: boolean } = {}): readonly EndingLine[] | null {
  switch (beat) {
    case 'night-call': return NIGHT_CALL_LINES;
    case 'reassure': return REASSURE_LINES;
    case 'shadow-dawn': return SHADOW_DAWN_LINES;
    case 'tree-return': return TREE_RETURN_LINES;
    case 'seated': return options.smallMarks === true ? [...SMALL_MARK_LINES, ...SEATED_LINES] : SEATED_LINES;
    default: return null;
  }
}

/** The beat that follows an input-driven finish of `beat`, or null after the credits. */
export function nextEndingBeat(beat: CampaignEndingBeat): CampaignEndingBeat | null {
  const index = CAMPAIGN_ENDING_BEATS.indexOf(beat);
  return index >= 0 && index < CAMPAIGN_ENDING_BEATS.length - 1 ? CAMPAIGN_ENDING_BEATS[index + 1] : null;
}

/**
 * Where a saved checkpoint resumes. Every beat rebuilds its whole stage first; the silence and the montage restart
 * from their start, the seated and trail scenes come back unlit with the leaf, and the credits stay the credits.
 */
export function endingResumeBeat(saved: CampaignEndingBeat): CampaignEndingBeat {
  return saved;
}

/** Effects the machine asks its renderer for. */
export type EndingEffect =
  | { type: 'enter'; beat: CampaignEndingBeat; lines: readonly EndingLine[] | null }
  | { type: 'shot'; index: number }
  | { type: 'pose'; index: number }
  | { type: 'title' }
  | { type: 'ambient'; progress: number }
  | { type: 'cue'; cue: 'cricket' | 'water' | 'answer' | 'dawn' };

/**
 * The beat machine. It owns time and input rules only. `tick` is driven by the scene's update; `press` by a fresh key
 * press or a click; `dialogueFinished` by the dialogue system. Paused ticks do not count.
 */
export class EndingMachine {
  public beat: CampaignEndingBeat = 'night-call';
  public elapsed = 0;
  public dialogueDone = true;
  public shot = 0;
  public shotElapsed = 0;
  public poseIndex = 0;
  public poseElapsed = 0;
  public titleShown = false;
  /** Set by the scene from the save: all five small marks found, so the seated scene opens with the two side lines. */
  public smallMarks = false;
  private readonly cuesPlayed = new Set<string>();

  public begin(beat: CampaignEndingBeat): EndingEffect[] {
    this.beat = beat;
    this.elapsed = 0;
    const lines = endingBeatLines(beat, { smallMarks: this.smallMarks });
    this.dialogueDone = lines === null;
    this.shot = 0; this.shotElapsed = 0;
    this.poseIndex = 0; this.poseElapsed = 0;
    this.titleShown = false;
    this.cuesPlayed.clear();
    return [{ type: 'enter', beat, lines }];
  }

  public dialogueFinished(): void {
    this.dialogueDone = true;
  }

  /** Whether E / Space / a click moves the ending on right now. */
  public canAdvance(): boolean {
    switch (this.beat) {
      case 'night-wait': return false;
      case 'montage': return this.shotElapsed >= MONTAGE_SHOT_MIN_MS;
      case 'shadow-dawn': return this.dialogueDone && this.poseIndex >= SHADOW_DAWN_POSES.length;
      case 'trail-title': return this.titleShown;
      case 'credits': return false;
      default: return this.dialogueDone;
    }
  }

  public prompt(): string | null {
    if (!this.canAdvance()) return null;
    return this.beat === 'trail-title' ? ENDING_PROMPT_CREDITS : ENDING_PROMPT_CONTINUE;
  }

  public press(): EndingEffect[] {
    if (!this.canAdvance()) return [];
    if (this.beat === 'montage') return this.nextShot();
    const next = nextEndingBeat(this.beat);
    return next ? this.begin(next) : [];
  }

  public tick(deltaMs: number, paused: boolean): EndingEffect[] {
    if (paused || deltaMs <= 0) return [];
    this.elapsed += deltaMs;
    const effects: EndingEffect[] = [];
    switch (this.beat) {
      case 'night-wait':
        // The silence is quiet and dark: nothing returns until it ends.
        if (this.elapsed >= NIGHT_WAIT_MS) effects.push(...this.begin('reassure'));
        break;
      case 'reassure':
        for (const step of NIGHT_SOUND_STEPS) {
          if (this.elapsed >= step.at && !this.cuesPlayed.has(step.cue)) {
            this.cuesPlayed.add(step.cue);
            effects.push({ type: 'cue', cue: step.cue });
          }
        }
        effects.push({ type: 'ambient', progress: Math.min(1, this.elapsed / NIGHT_RETURN_MS) });
        break;
      case 'montage':
        this.shotElapsed += deltaMs;
        if (this.shotElapsed >= MONTAGE_SHOT_MS) effects.push(...this.nextShot());
        break;
      case 'shadow-dawn':
        if (this.dialogueDone && this.poseIndex < SHADOW_DAWN_POSES.length) {
          this.poseElapsed += deltaMs;
          const index = Math.min(SHADOW_DAWN_POSES.length, Math.floor(this.poseElapsed / SHADOW_DAWN_POSE_MS));
          if (index > this.poseIndex) {
            this.poseIndex = index;
            effects.push({ type: 'pose', index: Math.min(index, SHADOW_DAWN_POSES.length) - 1 });
          }
        }
        break;
      case 'trail-title':
        if (!this.titleShown && this.elapsed >= TRAIL_TITLE_MS) {
          this.titleShown = true;
          effects.push({ type: 'title' });
        }
        break;
      default: break;
    }
    return effects;
  }

  private nextShot(): EndingEffect[] {
    if (this.shot < MONTAGE_SHOTS.length - 1) {
      this.shot += 1;
      this.shotElapsed = 0;
      return [{ type: 'shot', index: this.shot }];
    }
    return this.begin('shadow-dawn');
  }
}

/** Art every beat needs, so a check can prove each file exists at its native size before the scene asks for it. */
export const ENDING_ART_REQUIREMENTS: ReadonlyArray<{ level: number; file: string; width: number; height: number }> = [
  { level: 9, file: 'sanctuary-base', width: 640, height: 360 },
  { level: 9, file: 'ending-dawn-lighting-overlay', width: 640, height: 360 },
  { level: 9, file: 'ending-nhinh-carry-off-reference', width: 36, height: 42 },
  { level: 9, file: 'ending-nhinh-seated-unlit-leaf', width: 36, height: 42 },
  { level: 9, file: 'ending-leaf-handle-attachment', width: 10, height: 10 },
  { level: 9, file: 'ending-title-the-last-dawn', width: 640, height: 360 },
  { level: 6, file: 'garden-scene-base', width: 640, height: 360 },
  { level: 3, file: 'creek-scene-base', width: 640, height: 360 },
  { level: 5, file: 'tower-scene-base', width: 640, height: 360 },
  { level: 8, file: 'observatory-clean-base', width: 640, height: 360 },
];

/** The registered Shadow poses the ending uses (48x64, bottom-centre pivot). */
export const ENDING_SHADOW_POSES = ['stillness', ...SHADOW_DAWN_POSES] as const;
