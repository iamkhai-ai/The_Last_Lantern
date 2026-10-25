import { describe, it, expect } from 'vitest';
import { entriesByVi } from '../../../i18n/catalog';
import { OPENING_PAGES } from './openingNarrative';

/**
 * The picture files that ship with the build, as paths (the glob is the same one illustrationFiles.ts turns into
 * texture keys). A missing file would silently drop a page, so the test checks the pictures exist.
 */
const PICTURE_PATHS: readonly string[] = Object.keys(
  import.meta.glob('../../../../assets/levels/00-workshop/illustrations/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);

/** Lines the opening must not leak: later-level answers, the forest's own rules, and who caused the outage. */
const SPOILERS_VI = ['Shadow', 'khẩn cấp', 'tự điều tiết', 'nhịp nghỉ', 'Cây Mẹ', 'tinh thể', 'chạng vạng', 'thủ phạm'];
const SPOILERS_EN = ['Shadow', 'emergency', 'self-regulat', 'Mother Tree', 'crystal', 'culprit'];

/** The English line for a page, or null when the catalogue has no entry for its Vietnamese sentence. */
function englishOf(caption: string): string | null {
  return entriesByVi().get(caption)?.en ?? null;
}

describe('opening narrative pages', () => {
  it('has eleven pages in the order of the production plan', () => {
    expect(OPENING_PAGES.map((page) => page.key)).toEqual([
      'ill_intro-01-town',
      'ill_intro-02-night-lights',
      'ill_intro-03-elaria-source',
      'ill_intro-04-stored-sunlight',
      'ill_intro-05-storm-rescue',
      'ill_intro-06-failing-lights',
      'ill_intro-07-home-workshop',
      'ill_intro-08-mothers-lesson',
      'ill_intro-09-apprentice',
      'ill_intro-10-earned-trust',
      'ill_intro-11-boatmans-visit',
    ]);
  });

  it('gives every page a distinct picture that exists in the build', () => {
    const keys = OPENING_PAGES.map((page) => page.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      // The loader builds the key from the file name: `ill_` plus the name without the extension.
      expect(key.startsWith('ill_'), key).toBe(true);
      const file = `${key.slice('ill_'.length)}.png`;
      expect(PICTURE_PATHS.some((path) => path.endsWith(`/${file}`)), `${key} → ${file}`).toBe(true);
    }
  });

  it('gives every page a Vietnamese caption that translates to English', () => {
    for (const page of OPENING_PAGES) {
      expect(page.caption.trim(), page.key).not.toBe('');
      expect(englishOf(page.caption), page.key).not.toBeNull();
    }
  });

  it('spoils nothing about later levels', () => {
    for (const page of OPENING_PAGES) {
      const english = englishOf(page.caption) ?? '';
      for (const spoiler of SPOILERS_VI) {
        expect(page.caption.toLowerCase(), `${page.key} (vi): ${spoiler}`).not.toContain(spoiler.toLowerCase());
      }
      for (const spoiler of SPOILERS_EN) {
        expect(english.toLowerCase(), `${page.key} (en): ${spoiler}`).not.toContain(spoiler.toLowerCase());
      }
    }
  });
});
