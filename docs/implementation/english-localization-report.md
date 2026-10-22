# English localization — implementation report

**Branch:** `feat/english-localization` (from `test-develop` @ `63def874`, 2026-10-22)
**Gap fix:** `fix/english-localization-gaps` (worktree on top of `8bdbe92`, uncommitted)
**Spec:** [`docs/superpowers/specs/2026-10-22-english-localization-design.md`](../superpowers/specs/2026-10-22-english-localization-design.md)
**Plan:** [`docs/superpowers/plans/2026-10-22-english-localization.md`](../superpowers/plans/2026-10-22-english-localization.md)

## What shipped

The whole campaign now runs in Vietnamese (default) or English, chosen from the main menu or the pause
menu. Vietnamese remains the authored source; English is a catalogue layer keyed by the authored
sentence, so content modules keep their Vietnamese copy and the approved-copy regressions still assert
the same Vietnamese literals.

| Measure | Result |
| --- | --- |
| Catalogue entries | 1,470 |
| `tr()` call sites | 1,017 |
| Dialogue lines in `src/` | 573 |
| Dialogue coverage | **100 %** |
| Vietnamese copy in `src/` without a catalogue entry or `tr()` | **0** (strict gate) |
| `check-i18n.mjs --strict` | PASS |
| `check-i18n-runtime.mjs` | 7/7 |
| `scripts/check-*.mjs` | 40/40 |
| `npm run build` | PASS |

## Architecture

```
src/i18n/locale.ts                    Locale type, cached getter, own storage key
src/i18n/entry.ts                     CatalogEntry { id, vi, en } + entry()
src/i18n/catalog.ts                   CATALOG, byVi lookup, tr(), speakerLabel()
src/i18n/entries/*.ts                 translated copy grouped by chapter and area
scripts/check-i18n.mjs                static gate (keys, duplicates, coverage, speakers, untranslated copy)
scripts/check-i18n-runtime.mjs        runtime gate (default, fallback, params, persistence)
scripts/i18n-inventory.mjs            authoring aid, regenerates docs/i18n/inventory.md
tools/verify-entries.mjs              per-file translator check: keys exist byte-for-byte
```

`tr(vi, params?)` returns the authored sentence for `vi` and the catalogue row for `en`, filling
`{param}` placeholders; an unknown key returns the Vietnamese sentence, so an unfinished translation
degrades instead of breaking. `speakerLabel()` localizes only the displayed name — portraits, speaker
colour and dialogue tick audio keep using the authored id.

Rules that keep the copy honest:

- A whole sentence is one key. Copy assembled from values is one template key with `{placeholders}`
  (`tr('Cổ tự: {count}/3 …', { count })`), so word order can be translated.
- Module-level label tables (`ROOM_NAME`, `LABELS`, zone titles, `labelVi`) stay Vietnamese in the data
  and are passed through `tr()` where they render. Literals inside functions are wrapped at source.
- `--strict` fails on any Vietnamese string literal in `src/` that has no catalogue entry and is not
  inside `tr()`, so a new untranslated line cannot land silently.

## Language switch

- Main menu row `Ngôn ngữ: Tiếng Việt` / `Language: English`; the menu restarts so every label redraws.
- Pause menu row, between the level selector and restart; it restarts the scene, so the player resumes
  from the last saved checkpoint.
- The choice is stored in `last-lantern-locale-v1`, independent of the campaign save, so "New Game"
  never resets the language.

## Verification

```
node scripts/check-i18n.mjs --strict        PASS  1470 entries, 0 duplicate keys, 100 % dialogue coverage
node scripts/check-i18n-runtime.mjs         7/7
node scripts/check-*.mjs                    40/40
npm run build                               PASS
```

Changes in the gap-fix pass:

- The Level 01, 02 and 05 HUD composed lines, the observatory guidance and prompts, the quest and puzzle
  copy, the Heart, Library, Ruins, Garden, Tower and Creek copy, the journals, and the legacy
  `WorldScene` prompts now run through `tr()`.
- `check-i18n.mjs --strict` now checks for untranslated copy and counts `text: tr('…')` as dialogue.
- Seven harnesses that compile shipped source get an identity `tr()` (it interpolates `{param}` and
  returns Vietnamese unchanged), so their Vietnamese assertions still test the authored copy. Two
  harnesses had an index passed as `params` inside `.map`/`.some` callbacks; those callbacks are
  restored to their original form.

## Known gaps

1. **Gate blind spot for copy without diacritics.** The gate detects Vietnamese by its accents. Plain
   words such as `trong tay`, `Nam`, `Sao`, `xong` are not detected. The ones found by search were
   wrapped (`trong tay`, `Sao`, `xong`, `thử`/`chính`), but a full sweep needs a word list or a
   native-speaker read.
2. **Not played end to end.** No browser run of the English campaign has been done on this branch.
   Text fit in the HUD boxes, the Level 02 poem card layout, and the pause-menu restart are unverified.
3. **Translation review.** The copy was drafted against `docs/i18n/glossary.md`. It needs a native-speaker
   pass, especially the Level 02 poem (word chain kept, rhythm not) and The Shadow/Guardian register.
4. **Render sites for module-level tables.** Each table was traced to its render site for the cases
   found. A missing `tr()` at a new render site shows Vietnamese without an error.
5. **Language switch mid-level.** Switching in the pause menu restarts the scene from the last
   checkpoint. This is by design, but players lose unsaved progress in the current room.

## Rulings made during implementation

- **Narration avoids pronouns for Nhinh.** The source design notes disagree (`his` in the prologue
  spec, `her` in the observatory spec); English narration uses `Nhinh` as subject instead of guessing.
- **`Ký Ức` → `Memory`** (not "The Memory"), so the speaker label stays distinct from the Memory Crystal.
- **Runtime copy is the source of truth**, not the unapplied `*-dialogue-approved.md` files for levels
  01–04; translating those would have produced a second, conflicting script.
