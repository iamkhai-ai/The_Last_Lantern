# English Localization — Design

**Status:** Proposed (awaiting approval)
**Base:** `test-develop` @ `63def874aacf104ef1d0314d55faafa60ec063be` (2026-10-22)
**Scope agreed with the user:** the first English build covers **all player-visible text**, not only dialogue. Default locale stays Vietnamese; English is opt-in.

## 1. Goal

Ship a playable English build without forking the campaign content. Vietnamese remains the authoring language and the default; English is a second layer that can be reviewed, extended to further languages, and turned off without touching gameplay logic.

**Non-goals for this slice:** voice acting, translating `docs/` (design and review notes), localizing `assets/**` prompt files, per-locale fonts or typography, numerals/dates, and automatic locale detection from the browser.

## 2. What is actually translated (evidence)

`node scripts/i18n-inventory.mjs` parses `src/**/*.ts` with the TypeScript compiler API and lists every Vietnamese string site; the generated report is committed at [`docs/i18n/inventory.md`](../../i18n/inventory.md).

| Measure | Count |
| --- | ---: |
| TypeScript files scanned | 72 |
| Files containing Vietnamese text | 33 |
| String sites | 1,640 |
| Unique strings | 1,468 |

Largest owners: `CampaignScene.ts` (253), `RuinsOfTwoHalvesLevel.ts` (154), `HeartOfElariaLevel.ts` (148), `observatoryLayout.ts` (146), `LibraryLevel.ts` (136).

Two consequences follow, and they shape the design:

1. Localizing each call site by hand would be 1,600 edits across 33 files, most of them mechanical and easy to get wrong.
2. Most of those strings are **static copy** that reaches the player through a small number of render boundaries.

## 3. Decisions

### D1 — Translate at the render boundary, not at every authoring site

Static copy is translated where it is drawn:

| Boundary | File | Covers |
| --- | --- | --- |
| Dialogue panel | `src/systems/DialogueSystem.ts` (`showLine`) | all campaign dialogue, journal entries, memory captions, inscriptions, Hints H |
| Prologue panel | `src/scenes/PrologueScene.ts` (`showLine`) | all four prologue panels |
| Interaction prompt | the single prompt `Text` drawn by `InteractionSystem` | every `[E] …` prompt on every level |
| HUD | `src/ui/CampaignHud.ts` | objective, status row, toasts, key chips |
| Menus / ending | `MenuScene`, `PauseMenu`, `EndingScene`, `ComingSoonScene` | labels built in-place (small set, per-string) |

A boundary applies `tr()` to the whole string once. Content modules keep their Vietnamese literals unchanged, so the approved-copy tests keep passing and translators never touch gameplay code.

**Dynamic copy is the exception.** Strings composed at runtime (`Máy vẫn đang chờ. Mình còn thiếu: ${missing}.`) have no catalogue entry. Their composing site becomes a template — `tr('Máy vẫn đang chờ. Mình còn thiếu: {missing}.', { missing: missing.join(', ') })` — which is a small, enumerable set (see §7).

### D2 — The Vietnamese sentence is the catalogue key

`tr(vi, params?)` looks the Vietnamese template up in a generated map. Rationale:

- **Smallest safe diff.** No content module changes, no ID churn, no rewrite of the approved-copy regression suite (`scripts/check-dialogue-0*.mjs` assert Vietnamese literals verbatim).
- **Graceful failure.** A missing or edit-stale key returns the Vietnamese string, so an untranslated build is never broken — it degrades to the current game.
- **Cheap verification.** `scripts/check-i18n.mjs` scans `src/` for `tr('…')` arguments and fails on missing keys, duplicate Vietnamese keys, empty English, and unused entries.

**Known ceiling.** Renaming Vietnamese copy silently orphans its translation. The checker catches it on the next run, which is the intended workflow while copy is still moving. When copy freezes, migrate the map to explicit IDs; the call sites do not change because they already carry the Vietnamese string. This is recorded as a `ponytail:` note in `catalog.ts`.

### D3 — Speaker identity is data; only the label is localized

`DialogueLine.speaker` stays exactly as authored (`'Nhinh' | 'Lumo' | 'Shadow' | 'The Shadow' | 'Hệ thống' | 'Ký Ức' | …`). It is used by three lookups that must not change:

- `DialogueSystem.PORTRAITS` (`Nhinh → portrait_linh`, `Lumo → portrait_lumo`),
- the speaker colour table,
- `SoundSystem.playDialogueTick(speaker)` voice selection.

Only the rendered label changes, through `speakerLabel(speaker)`:

| Authored speaker | English label |
| --- | --- |
| `Nhinh` | Nhinh |
| `Lumo` | Lumo |
| `Shadow` / `The Shadow` | The Shadow |
| `Hệ thống` | System |
| `Ký Ức` | Memory |
| `Lời dẫn` | Narrator |
| `Tiếng gọi` | A voice |
| `Người Bảo Vệ` | The Guardian |
| `Đứa trẻ trong ký ức` | The child in the memory |
| `Người lớn trong ký ức` | The grown-up in the memory |

The `The Shadow` → `The Guardian` reveal in Level 09 is preserved: the speaker stays `The Shadow`/`Người Bảo Vệ` exactly where the Vietnamese script stages the reveal, and each maps to its own English label. No line is re-attributed.

### D4 — Locale is a separate preference, not campaign progress

`localStorage` key `last-lantern-locale-v1`, independent of `last-lantern-campaign-save-v1`. "New Game" clears progress but never the language choice. The campaign save format is untouched, so no save migration and no risk to existing saves.

### D5 — No new dependency

The catalogue is a TypeScript module; `tr()` is a map lookup plus `{param}` substitution. No i18n framework, no ICU parser, no build plugin. At 1,468 strings a library would add configuration, not capability.

## 4. Architecture

```
src/i18n/locale.ts        Locale type, get/set, storage key, default 'vi'
src/i18n/catalog.ts       CATALOG entries { id, vi, en }; byVi map; tr(), speakerLabel()
src/i18n/catalog.en.ts    (optional split) English copy grouped by chapter, if catalog.ts grows past ~1,200 lines
scripts/check-i18n.mjs    coverage + duplicate + unused-key gate
scripts/i18n-inventory.mjs  authoring aid (already added)
```

`tr` contract:

```ts
export type Locale = 'vi' | 'en';

/** Translate an authored Vietnamese template for the active locale. Unknown keys fall back to `vi`. */
export function tr(vi: string, params?: Readonly<Record<string, string | number>>): string;

/** Display label for an authored speaker id; never used for logic. */
export function speakerLabel(speaker: string): string;
```

Substitution replaces `{name}` occurrences; unknown placeholders stay literal so a typo is visible rather than blank.

## 5. Language switch

- Main menu gets one row: `Ngôn ngữ: Tiếng Việt` / `Language: English`, toggled in place; all menu labels redraw immediately.
- Pause menu gets the same row. Changing it there restarts the active scene so every drawn string re-renders; campaign progress is already saved at checkpoints, so the player resumes from the last checkpoint. The pause menu states this before applying (`Đổi ngôn ngữ sẽ quay về mốc lưu gần nhất`).
- The prologue and ending pick the locale when they start; no mid-scene toggle.

## 6. Copy sourcing rules

1. **Runtime Vietnamese strings are the source of truth.** They are what ships today.
2. `docs/scenario/*-dialogue-approved.md` for levels 01–04 record approved *future* copy that was never applied to runtime. They are **not** translated in this slice; translating them would produce a second, conflicting script. A follow-up may apply them, and the catalogue would then re-key.
3. `docs/scenario-v2/` is an approved direction whose scripts remain drafts. Excluded.
4. Terms fixed by the story are translated once and reused: Mother Tree (`Cây Mẹ`), Memory/Hope/Balance Crystal, The Shadow, The Guardian, Elaria (unchanged), Nhinh and Lumo (unchanged).
5. The Level 02 poem is puzzle logic (four five-beat lines linked by repeated words, `Moon → Leaf → Star`). English must keep the word-chain and the order, not the syllable count. It gets its own review pass.
6. The lantern inscription (`Hãy giữ ánh sáng cho đến khi mọi người trở về.`) and the closing `Đó là lối đi cho hai người mà.` are narrative anchors; translate once, reuse verbatim.

## 7. Work slices

Each slice is independently shippable and verified.

| # | Slice | Content | Exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | `locale.ts`, `catalog.ts`, `tr()`, `speakerLabel()`, checker, menu row, pause row | Locale persists; switching shows English labels; checker passes with an empty catalogue |
| 2 | Dialogue boundary | `DialogueSystem` + `PrologueScene` call `tr`/`speakerLabel`; dynamic composites converted to templates | Campaign 01–05 dialogue renders in English from the catalogue; missing keys fall back cleanly |
| 3 | Dialogue content 01–05 | Prologue, campaign levels 01–05, journal, memory captions, Hints H, Level 02 poem | Full English playthrough of levels 01–05 with no Vietnamese visible |
| 4 | Dialogue content 06–10 | Same for levels 06–10 and the campaign ending | Full English playthrough of 06–10 + ending |
| 5 | Chrome | Menus, pause menu, HUD, prompts, toasts, ComingSoon | No Vietnamese string visible anywhere on a fresh English run |
| 6 | Gate | `check-i18n.mjs` wired into the repo's check set; inventory regenerated; report | Checker green, `npm run build` green, all existing checks green |

Composites to convert to templates are enumerated during slice 2 by the checker's dynamic-string report; expected owners are `SleeplessTowerLevel`, `ShatteredCreekController`, `RuinsOfTwoHalvesLevel`, `HeartOfElariaLevel`, `LibraryLevel`, `CampaignScene` journal/status builders.

## 8. Verification

- `node scripts/check-i18n.mjs` — every `tr('…')` argument exists in the catalogue; no duplicate Vietnamese keys; no empty English; no unused entries; every speaker that reaches `speakerLabel` has a label.
- Existing regression checks must stay green, unchanged: `check-dialogue-01-02`, `-03`, `-04`, `-05`, `check-prologue`, `check-campaign-ending`, `check-campaign-hud`, `check-interaction-prompt-layout`.
- `npm run build` (`tsc --noEmit && vite build`).
- Manual: one English run of the prologue through Level 01 and the Level 02 poem, one Vietnamese run of the same, and a locale switch from the pause menu.

## 9. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Vietnamese copy edited after translation | Orphaned/missing English | Checker flags missing keys; fallback keeps the build playable |
| Text overflow in fixed 640×360 boxes | Clipped UI | English is typically 15–30 % longer; every text box gets checked in the English run (prologue panel, dialogue box, HUD rows, pause rows, prompts) |
| Poem/metric loss | Puzzle reads wrong | Dedicated review pass; keep the word chain and ordering |
| Restart on language switch | Player loses in-level position | Explicit warning in the pause row; progress is checkpointed |
| Speaker label drift | Wrong voice/portrait if identity changes | Labels are display-only; portrait/colour/audio keep using the authored id |

## 10. Open questions for the user

1. Approve the design as written?
2. Word choice for `Nhinh`'s register: the Vietnamese uses `tôi`/`mình`/`cậu` to mark closeness. Proposed English: Nhinh and Lumo speak plainly and warmly (`I`/`you`), no contractions from Nhinh, light contractions from Lumo. Acceptable?
3. `Ký Ức` as a speaker — proposed `Memory`. Alternatively `The Memory`. Preference?
