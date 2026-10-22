/**
 * Localization catalogue.
 *
 * The authored Vietnamese sentence is the key: content modules keep their Vietnamese literals, and the
 * render boundaries call `tr()` once on the string they are about to draw. A missing entry falls back
 * to Vietnamese, so an unfinished translation degrades to the current game instead of breaking it.
 *
 * ponytail: keyed by the Vietnamese text, so renaming Vietnamese copy orphans its translation.
 * `scripts/check-i18n.mjs` flags that on the next run. When copy freezes, move to explicit ids;
 * call sites do not change because they already carry the Vietnamese string.
 */
import { getLocale } from './locale.ts';
import { CHROME_ENTRIES } from './entries/chrome.ts';
import { PROLOGUE_ENTRIES } from './entries/prologue.ts';
import { LEGACY_DIALOGUE_ENTRIES } from './entries/legacyDialogue.ts';
import { LIBRARY_AND_PATH_ENTRIES } from './entries/libraryAndPath.ts';
import { CAMPAIGN_SCENE_ENTRIES } from './entries/campaignScene.ts';
import { TOWER_GARDEN_CREEK_ENTRIES } from './entries/towerGardenCreek.ts';
import { RUINS_HEART_OBSERVATORY_ENTRIES } from './entries/ruinsHeartObservatory.ts';
import { CAMPAIGN_LEVEL_ENTRIES } from './entries/campaignLevels.ts';
import { FRAGMENT_ENTRIES } from './entries/fragments.ts';
import { OBSERVATORY_TEXT_ENTRIES } from './entries/observatoryText.ts';
import { HEART_AND_STATE_ENTRIES } from './entries/heartAndStates.ts';
import { PUZZLE_AND_QUEST_ENTRIES } from './entries/puzzleAndQuestText.ts';
import { COMPOSED_AND_TABLE_ENTRIES } from './entries/composedAndTables.ts';
import type { CatalogEntry } from './entry.ts';

export type { CatalogEntry } from './entry.ts';

export const CATALOG: readonly CatalogEntry[] = [
  ...PROLOGUE_ENTRIES,
  ...LEGACY_DIALOGUE_ENTRIES,
  ...CAMPAIGN_SCENE_ENTRIES,
  ...LIBRARY_AND_PATH_ENTRIES,
  ...TOWER_GARDEN_CREEK_ENTRIES,
  ...RUINS_HEART_OBSERVATORY_ENTRIES,
  ...CAMPAIGN_LEVEL_ENTRIES,
  ...FRAGMENT_ENTRIES,
  ...CHROME_ENTRIES,
  ...OBSERVATORY_TEXT_ENTRIES,
  ...HEART_AND_STATE_ENTRIES,
  ...PUZZLE_AND_QUEST_ENTRIES,
  ...COMPOSED_AND_TABLE_ENTRIES,
];

const byVi = new Map<string, CatalogEntry>();
for (const item of CATALOG) {
  if (byVi.has(item.vi)) {
    // Two ids for one key is a catalogue bug: the second translation would be dead.
    console.warn(`i18n: duplicate Vietnamese key "${item.vi}" (${byVi.get(item.vi)!.id} and ${item.id})`);
    continue;
  }
  byVi.set(item.vi, item);
}

function interpolate(template: string, params?: Readonly<Record<string, string | number>>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
}

/**
 * Translate an authored Vietnamese template for the active locale. Unknown keys and unknown
 * placeholders are returned verbatim rather than blanked, so a gap is visible, never silent.
 */
export function tr(vi: string, params?: Readonly<Record<string, string | number>>): string {
  if (getLocale() === 'vi') return interpolate(vi, params);
  const hit = byVi.get(vi);
  return interpolate(hit ? hit.en : vi, params);
}

/** Display label for an authored speaker id. Identity stays Vietnamese; only the label is localized. */
const SPEAKER_LABELS_EN: Readonly<Record<string, string>> = {
  'Nhinh': 'Nhinh',
  'Lumo': 'Lumo',
  'Shadow': 'The Shadow',
  'The Shadow': 'The Shadow',
  'Hệ thống': 'System',
  'Ký Ức': 'Memory',
  'Lời dẫn': 'Narrator',
  'Tiếng gọi': 'A voice',
  'Người Bảo Vệ': 'The Guardian',
  'Đứa trẻ trong ký ức': 'The child in the memory',
  'Người lớn trong ký ức': 'The grown-up in the memory',
};

export function speakerLabel(speaker: string): string {
  if (getLocale() === 'vi') return speaker;
  return SPEAKER_LABELS_EN[speaker] ?? speaker;
}

/** Read-only view for checks: the catalogue keyed by its Vietnamese sentence. */
export function entriesByVi(): ReadonlyMap<string, CatalogEntry> {
  return byVi;
}
