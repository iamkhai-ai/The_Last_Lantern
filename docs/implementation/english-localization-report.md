# English localization — implementation report

**Branch:** `feat/english-localization` (from `test-develop` @ `63def874`, 2026-10-22)
**Spec:** [`docs/superpowers/specs/2026-10-22-english-localization-design.md`](../superpowers/specs/2026-10-22-english-localization-design.md)
**Plan:** [`docs/superpowers/plans/2026-10-22-english-localization.md`](../superpowers/plans/2026-10-22-english-localization.md)

## What shipped

The whole campaign now runs in Vietnamese (default) or English, chosen from the main menu or the pause
menu. Vietnamese remains the authored source; English is a catalogue layer keyed by the authored
sentence, so content modules are untouched and the approved-copy regressions still assert the same
Vietnamese literals.

| Measure | Result |
| --- | --- |
| Catalogue entries | 1,094 |
| Dialogue lines in `src/` | 551 |
| Dialogue coverage | **100 %** |
| `tr()` call sites | 70 |
| Existing checks | all pass, unmodified assertions |
| `npm run build` | passes |

## Architecture

```
src/i18n/locale.ts              Locale type, cached getter, own storage key
src/i18n/entry.ts               CatalogEntry { id, vi, en } + entry()
src/i18n/catalog.ts             CATALOG, byVi lookup, tr(), speakerLabel()
src/i18n/entries/*.ts           translated copy grouped by chapter
scripts/check-i18n.mjs          static gate (keys, duplicates, coverage, speakers)
scripts/check-i18n-runtime.mjs  runtime gate (default, fallback, params, persistence)
scripts/i18n-inventory.mjs      authoring aid, regenerates docs/i18n/inventory.md
tools/verify-entries.mjs        per-file translator check: keys exist byte-for-byte
```

`tr(vi, params?)` returns the authored sentence for `vi` and the catalogue row for `en`, filling
`{param}` placeholders; an unknown key returns the Vietnamese sentence, so an unfinished translation
degrades instead of breaking. `speakerLabel()` localizes only the displayed name — portraits, speaker
colour and dialogue tick audio keep using the authored id.

Render boundaries (one `tr()` each):

- `DialogueSystem.showLine` — every campaign line, journal entry, caption and H hint.
- `PrologueScene.showLine` — the four prologue panels.
- `InteractionSystem` — every `[E] …` prompt.
- `CampaignHud` — objective, status, toasts, key chips.
- Menus, ending and ComingSoon — their own labels.

Dynamic copy that cannot be a single key (journal lines, "still missing" reasons, mirror labels) is
composed from translated fragments with a `{placeholder}` template; those fragments live in
`entries/fragments.ts`.

## Language switch

- Main menu row `Ngôn ngữ: Tiếng Việt` / `Language: English`; the menu restarts so every label redraws.
- Pause menu row, between the level selector and restart; it restarts the scene, so the player resumes
  from the last saved checkpoint.
- The choice is stored in `last-lantern-locale-v1`, independent of the campaign save, so "New Game"
  never resets the language.

## Verification

```
node scripts/check-i18n.mjs           PASS  1094 entries, 0 duplicate keys, 100 % dialogue coverage
node scripts/check-i18n-runtime.mjs   7/7   default, resolution, params, fallback, speakers, persistence
node scripts/check-*.mjs              all   (40 scripts)
npm run build                         PASS
```

Note: the source-level harnesses bind shipped method bodies directly, so the ones touching localized
paths now receive an identity `tr` stub that interpolates `{param}` — identity keeps their Vietnamese
copy assertions meaningful.

## Known gaps and follow-ups

1. **Two journal composites stay partly Vietnamese.** The Level 01 journal (`Các dấu đã ghi: …`) and
   the Observatory journal (`Sổ tay của mình. · <facts>`) assemble many short facts; their wrapper is
   templated but the fact strings are not yet in the catalogue. They fall back as designed.
2. **Legacy `WorldScene` path.** `src/data/dialogue.ts` is fully translated, but that scene's HUD,
   quest text and prompts are not wired through `tr()`. It only opens for a pre-campaign save.
3. **Translation review.** The copy was produced slice by slice against `docs/i18n/glossary.md`. It
   needs a native-speaker pass, especially the Level 02 poem (word chain preserved, rhythm not) and
   The Shadow/Guardian register.
4. **Text fit.** No clipping was seen in the static review, but the English run has not been played
   end to end in a browser on this branch.

## Rulings made during implementation

- **Narration avoids pronouns for Nhinh.** The source design notes disagree (`his` in the prologue
  spec, `her` in the observatory spec); English narration uses `Nhinh` as subject instead of guessing.
- **`Ký Ức` → `Memory`** (not "The Memory"), so the speaker label stays distinct from the Memory Crystal.
- **Runtime copy is the source of truth**, not the unapplied `*-dialogue-approved.md` files for levels
  01–04; translating those would have produced a second, conflicting script.
