# English Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an English build of the whole campaign, with Vietnamese still authored, still default, and still authoritative.

**Architecture:** A hand-written i18n module (`src/i18n/`) keyed by the authored Vietnamese template. Content modules keep their Vietnamese literals; a handful of render boundaries (`DialogueSystem`, `PrologueScene`, the interaction prompt, `CampaignHud`, menus) call `tr()` once per displayed string. Dynamic copy is converted to `{param}` templates at its composing site.

**Tech Stack:** TypeScript 5.4, Phaser 3.80, Vite 5, Node ESM check scripts using the TypeScript compiler API. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-22-english-localization-design.md`

## Global Constraints

- Default locale is `vi`; English is opt-in. Locale persists under `last-lantern-locale-v1`, never inside the campaign save.
- `DialogueLine.speaker` values are data identity: never translated, never renamed. Only `speakerLabel()` output is localized.
- `src/data/**` Vietnamese literals stay byte-identical. Approved-copy checks (`scripts/check-dialogue-0*.mjs`) must keep passing **unmodified**.
- No new npm dependency.
- Every visible English string must render without clipping at 640×360.
- `npm run build` and every existing `scripts/check-*.mjs` must pass at each task boundary.
- Commit style: `feat(i18n): …`, `test(i18n): …`, `docs(i18n): …`.

## Review Focus

- **Long English text in fixed boxes.** The prologue panel (552 px wide, 2 lines max), the dialogue box (466/528 px), HUD rows and pause rows are sized for Vietnamese. English runs 15–30 % longer; overflow clips silently.
- **Missing catalogue entry.** A key the checker cannot see (a string built by concatenation) silently falls back to Vietnamese mid-English-run.
- **Placeholder mismatch.** `{missing}` in Vietnamese but `{name}` in English renders a literal brace to the player.
- **Speaker identity drift.** Localizing `speaker` itself would break portraits, colour, and tick audio.
- **Locale switch mid-run.** Restarting a scene must not wipe unsaved in-level progress.

---

### Task 1: i18n foundation and gate

**Files:**
- Create: `src/i18n/locale.ts`, `src/i18n/catalog.ts`, `scripts/check-i18n.mjs`
- Test: `scripts/check-i18n.mjs` (it is its own gate)

**Interfaces:**
- Produces: `type Locale = 'vi' | 'en'`, `LOCALES`, `getLocale(): Locale`, `setLocale(l: Locale): void`, `LOCALE_STORAGE_KEY`, `tr(vi: string, params?: Record<string, string|number>): string`, `speakerLabel(speaker: string): string`, `CATALOG: readonly CatalogEntry[]`.

- [ ] **Step 1:** Write `src/i18n/locale.ts` with `getLocale()` reading `localStorage` and defaulting to `'vi'`, `setLocale()` writing it, both wrapped in try/catch like `CampaignSaveSystem`.
- [ ] **Step 2:** Write `src/i18n/catalog.ts` exporting `CatalogEntry { id: string; vi: string; en: string }`, an empty `CATALOG`, a `byVi` map built at module load (throw on duplicate `vi` in dev), `tr()` (vi → returns template with params; en → lookup, fallback to `vi`), and `speakerLabel()` with the table from the spec §D3.
- [ ] **Step 3:** Write `scripts/check-i18n.mjs`: scans `src/**/*.ts` for `tr('…')` string arguments; asserts every one exists in `CATALOG`; asserts no duplicate `vi`, no empty `en`, no entry whose `vi` never appears in `src/`; asserts every literal speaker in `src/data/**` has a `speakerLabel` mapping. Prints counts and a non-zero exit on failure.
- [ ] **Step 4:** Run `node scripts/check-i18n.mjs` with the empty catalogue → expect FAIL listing the keys (proves the gate works), then create the first entries for the prologue to get a green run.
- [ ] **Step 5:** `npx tsc --noEmit` → exit 0. Commit.

### Task 2: Language row in menu and pause menu

**Files:**
- Modify: `src/scenes/MenuScene.ts` (menu item list), `src/ui/PauseMenu.ts` (`PauseAction` union, rows, label), `src/config/gameConfig.ts` only if a restart hook is needed.

**Interfaces:**
- Consumes: `getLocale`, `setLocale`, `tr` from Task 1.
- Produces: `localeLabel(): string` in both files; pause action `'language'`.

- [ ] **Step 1:** Menu gets a row rendered from `localeLabel()`; selecting it toggles the locale and rebuilds the menu labels in place (`scene.restart()` is acceptable and simplest).
- [ ] **Step 2:** Pause menu gets the same row between `sound` and `menu`; selecting toggles, persists, and restarts the active scene so all drawn text re-renders.
- [ ] **Step 3:** Manual check on the dev server: toggle in menu → labels change language; toggle in pause → scene restarts at the last checkpoint.
- [ ] **Step 4:** `npm run build`; commit.

### Task 3: Dialogue boundary

**Files:**
- Modify: `src/systems/DialogueSystem.ts:89-123` (`showLine`), `src/scenes/PrologueScene.ts:110-119` (`showLine`)

**Interfaces:**
- Consumes: `tr`, `speakerLabel`.
- Produces: nothing new; both boundaries render localized text.

- [ ] **Step 1:** In `DialogueSystem.showLine`, replace `this.fullLineText = line.text` with `this.fullLineText = tr(line.text)` and `line.speaker.toUpperCase()` with `speakerLabel(line.speaker).toUpperCase()`. Keep `speakerColors[line.speaker]`, `PORTRAITS[line.speaker]`, and `playDialogueTick(line.speaker)` on the authored id.
- [ ] **Step 2:** Same two edits in `PrologueScene.showLine`.
- [ ] **Step 3:** Run `node scripts/check-dialogue-01-02.mjs`, `-03`, `-04`, `-05`, `check-prologue.mjs` → all still pass (they assert source literals, which are untouched).
- [ ] **Step 4:** Add a temporary English entry for one Level 01 line and confirm it renders in English on the dev server, then remove it. Commit.

### Task 4: Dialogue content, prologue and levels 01–05

**Files:**
- Modify only: `src/i18n/catalog.ts` (entries grouped by chapter)

- [ ] **Step 1:** Translate the prologue (42 strings) and levels 01–05 runtime dialogue, journal entries, memory captions, inscriptions and Hint-H ladders. Source = runtime strings, never the unapplied `*-dialogue-approved.md`.
- [ ] **Step 2:** Level 02 poem: keep the four-line, word-chain structure (`Moon → Leaf → Star`) and the dawn callback; do not force syllable count.
- [ ] **Step 3:** `node scripts/check-i18n.mjs` → green, and every key used on these levels exists.
- [ ] **Step 4:** `npx tsc --noEmit`; commit.

### Task 5: Dialogue content, levels 06–10 and ending

**Files:** `src/i18n/catalog.ts`

- [ ] **Step 1:** Translate levels 06–10 (`SleeplessTower`, `SleepingGarden`, `RuinsOfTwoHalves`, `HeartOfElaria`, observatory story/captions) and `campaignEnding.ts`.
- [ ] **Step 2:** Keep narrative anchors verbatim across reuse: lantern inscription, "a path for two", "let the night walk its road".
- [ ] **Step 3:** `node scripts/check-i18n.mjs`; `npx tsc --noEmit`; commit.

### Task 6: Chrome — HUD, prompts, menus, ending, ComingSoon

**Files:**
- Modify: `src/ui/CampaignHud.ts`, `src/ui/PauseMenu.ts`, `src/scenes/MenuScene.ts`, `src/scenes/ComingSoonScene.ts`, `src/scenes/EndingScene.ts`, `src/systems/InteractionSystem.ts` (prompt draw), `src/scenes/CampaignScene.ts` (prompt/toast call sites that compose text), `src/data/campaignLevels.ts` (via `tr()` at the HUD boundary, not in the data), `src/data/quests.ts` (WorldScene legacy path — optional, same boundary rule).

- [ ] **Step 1:** Wrap HUD objective/status/toast/hint rendering in `tr()`.
- [ ] **Step 2:** Wrap the single interaction-prompt draw in `tr()`.
- [ ] **Step 3:** Convert menu/pause/ending/ComingSoon labels to `tr()` and add their entries.
- [ ] **Step 4:** `node scripts/check-i18n.mjs`; `npm run build`; commit.

### Task 7: Dynamic composites

**Files:** composers in `src/levels/*.ts`, `src/scenes/CampaignScene.ts`, `src/scenes/ShatteredCreekController.ts`

- [ ] **Step 1:** List every composer the checker reports as dynamic (template literals with `${}` that reach a boundary).
- [ ] **Step 2:** Convert each to `tr('… {x} …', { x })` at the composing site, preserving the Vietnamese literal as the key.
- [ ] **Step 3:** `node scripts/check-i18n.mjs` reports zero dynamic leaks; commit.

### Task 8: Verification and handoff

- [ ] **Step 1:** Run the full check set (`node scripts/check-*.mjs`) and `npm run build`; record results.
- [ ] **Step 2:** English manual run: prologue → Level 01 → Level 02 poem; switch locale from pause; confirm no Vietnamese remains and no text clips.
- [ ] **Step 3:** Regenerate `docs/i18n/inventory.md`; write `docs/implementation/english-localization-report.md` with what shipped, what is deferred (legacy `WorldScene` path), and screenshots.
- [ ] **Step 4:** Commit and report.

## Open questions carried from the spec

1. Nhinh/Lumo register: plain and warm, no contractions from Nhinh, light contractions from Lumo.
2. `Ký Ức` → `Memory` (vs `The Memory`).
