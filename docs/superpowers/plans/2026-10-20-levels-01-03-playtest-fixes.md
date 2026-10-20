# Levels 01–03 playtest fixes (2026-10-20)

Source: a real playthrough of Levels 1–3 on `origin/test-develop` (`2a528fe`). Branch `fix/levels-01-03-playtest`,
worktree `D:\Z_PROJECT\The_Last_Lantern\tll-playtest-fix`. Scope is these six items only; do not touch other levels.

Rules for every task:
- Keep changes minimal and local. No raster/art file edits unless a task says so.
- Do **not** commit and do **not** run `npm run build` (it rewrites tracked `dist/index.html`; the root agent runs the final build and commits).
  Type-check with `npx tsc --noEmit` and run the relevant `node scripts/check-*.mjs`.
- When a pinned assertion in a check script encodes the old (buggy) behaviour, update the assertion on purpose and say so in your report.
  Never delete an assertion just to make a check pass; replace it with one for the new behaviour.
- Browser verification (Playwright, as in `scripts/campaign-hud-browser.cjs`; `PLAYWRIGHT_MODULE` / `PLAYWRIGHT_CHROMIUM_EXECUTABLE`) is wanted for every visual item. If no browser is available, mark it `NOT_RUN` honestly; do not claim visual success.
- Report per task: files changed, checks run with PASS/FAIL, anything NOT_RUN, and any decision you had to make.

---

## Task A — Level 1: soften the path edges with more grass  (owner files: `src/data/forestDecor.ts`, `src/data/forestEdgeDecor.ts`, `scripts/check-forest-edge-decor.mjs`)

Problem: the dirt path (`FOREST_EDGE_GROUND_PATH`, Chaikin-smoothed, masked in `CampaignScene.drawForestFloor`) has a hard, flat-looking rim.
Today only every second edge slot (`EDGE_TUFT_MODULO = 2`, step 9px) gets one roadside-grass stamp.

Do:
1. Add an **opt-in** field to `ForestDecorSite`, e.g. `denseEdgeGrass?: { step: number; outward: [number, number]; inward: [number, number] }`.
   Only `forestEdgeDecorSite()` sets it. Level 02 must stay byte-identical: the extra grass must use its **own** PRNG (e.g. `createForestRandom(site.seed ^ 0x9e3779b1)`), never the shared `rand`, and must not change the order of existing `rand()` calls.
2. In `buildForestDecor`, when the field is set, add extra tufts along the smoothed path perimeter (resample at ~5–6px): for each sample put tufts straddling the rim — some just outside (outward 3–10px, found with `pointInPolygon`, not by assuming polygon winding) and some overlapping the rim (inward 1–4px) — so the dirt/grass boundary is hidden. Vary texture, flipX, and slight scale (0.9–1.2).
   Put them in `pathEdge.tufts` (or a new `pathEdge.denseTufts` and draw it in `drawForestFloor`). Depth stays below actors (`EDGE_GRASS_DEPTH` 0.62 region). Decor only: no collision, no interaction, no walkable change.
3. Keep clear: reuse `site.keepClear` points (lantern, tablet, ring, gate stands, trail marks, checkpoints) and `keepClearRects`; do not place grass on the gate threshold/opening, and do not bury the footprint trail marks or the standing ring.
4. Extend `scripts/check-forest-edge-decor.mjs`: dense grass exists, every stamp is within a band of the path edge, none lies in a keep-clear zone, deterministic across two builds. Run `check-whispering-woods-decor.mjs` and confirm Level 02 decor output is unchanged (compare a JSON hash of `buildWoodsDecor()` before/after your change — capture the "before" hash first).
5. Browser: screenshot Level 1 (`?level=` / save injected like the other browser scripts) before and after; confirm the rim looks soft and no grass sits on the tablet/lantern/ring/gate. Save screenshots under `artifacts/playtest-fixes/` (untracked).

Acceptance: path rim visibly softened on both sides along its whole length; Level 02 decor identical; checks PASS.

---

## Task B — Level 2: thicker rune stones + prompt from every side  (owner files: `src/data/whisperingWoodsLayout.ts`, `src/types/gameTypes.ts`, `src/systems/InteractionSystem.ts`, the Level 02 branch of `src/scenes/CampaignScene.ts`, `scripts/check-whispering-woods.mjs`, `scripts/check-interaction-targets.mjs`, `RULE_GAMES.md`)

### B1 — collision ("the stone is as thin as paper")
Root cause: rune art is 60×78 (visible body ≈ 39px tall) but each rune's solid footprint is only 26×12 (`WHISPERING_WOODS.footprints`, e.g. moon `{219,230,26,12}` with anchor `(232,242)`). From the north the player's feet can stand 12px behind the base while the stone covers ~27px more of the player, so the stone looks paper-thin and the player looks glued to it.

Do:
- Measure the real visible body of `runestone_*` art (alpha bbox; `CampaignScene` already computes it for `fitWoodsRuneArt`) and make each rune footprint match it: keep the **south edge on the anchor y** (stands and prompts stay valid), extend **north** to roughly 55–65% of the visible body height (≈ 22–26px deep) and widen to about the visible base width (≈ 30–34px, centred on the anchor x). Do the same for the poem slab if its art shows the same problem (it is 96×80 with a 68×14 footprint) — check visually and decide.
- Also make the stone feel solid on the east/west sides (no 1–2px gaps where the player can squeeze visually into the art).
- Update every dependent: `WHISPERING_WOODS.footprints`, pinned asserts in `check-whispering-woods.mjs`, the barriers in `CampaignScene` (`woods-footprint-*`), and decor `solids` if needed. All `stands`, the firefly route and the exit route must stay reachable (`reachableWithin` in the check script) and `isWoodsCenterWalkable(stand)` must stay true.

### B2 — interaction from any side
Today every rune/poem is a point trigger at the south stand (`stands.*`, radius 24 + 8 padding), so only the south side shows `[E]`. The user wants the prompt from **every side** of the stone (this deliberately overrides RULE_GAMES §1 for these Level 02 stones).

Do:
- Add an optional `isInReach?: (playerX: number, playerY: number) => boolean` to `InteractableConfig`. In `InteractionSystem`, when present it **replaces** the radius test, both in `update()` and in the re-validation inside `tryInteract()` (keep the `now - lastInteractTime` debounce and the `ownsPosition` logic). Nothing else changes for interactables that do not set it.
- For the Level 02 poem and 3 runes: `isInReach` = the actor's foot body rect (same 14×6 body used by `isWoodsCenterWalkable`/`bodyRect`) is within ~10–12px of the stone's footprint rect on any side (use a rect-to-rect distance helper, no sqrt per frame needed beyond that). Keep `x/y` at the stand for prompt anchoring/tie-breaks; `getPromptBounds` stays the stone image bounds so the label sits above the stone, away from Nhinh and Lumo.
- Enabled/label logic is unchanged: the rune only shows its prompt when it is currently interactable (poem read, reveal active, etc. — keep exactly the existing `canActivateWoodsRune`/tutorial gating).
- Nearest-target selection with two stones close together must stay deterministic. The fresh spawn `(136,286)` must still show only the poem prompt (existing assertion), and the three runes and the exit stairs must not steal each other's prompts.
- Add a pure check (in `check-whispering-woods.mjs` or `check-interaction-targets.mjs`): for each of poem/moon/leaf/star, sample feet positions on all four sides at contact (walkable positions only) and assert reach is true; at 30px+ away it is false.
- Update `RULE_GAMES.md`: add an explicit exception in §3 — "Level 02 poem and rune stones: prompt from all sides (`isInReach`), by design decision 2026-10-20".
- Browser: walk to each stone from N/E/W/S and confirm collision stops the player clearly outside the art and the prompt shows from every side; screenshot north contact for one stone.

Acceptance: player can no longer overlap deep into a stone from behind; prompt shows from all four sides for poem + 3 runes; pure checks and `tsc` PASS.

---

## Task C — Level 3 (Library Beneath the Roots)  (owner files: `src/levels/LibraryLevel.ts`, `src/data/libraryLayout.ts`, `scripts/check-library-*.mjs`, `scripts/check-campaign-levels.mjs` if it pins Level 3 strings, `docs/scenario/03-library-beneath-the-roots.md` only if story text must change)

### C1 — exit gate does not open after taking the crystal
Root cause: `isExitOpen()` (LibraryLevel.ts ~1122) requires `l2-crystal && l2-fifth-viewed`; the player must also walk to the east mural and read the fifth painting, which nothing tells them after the pickup dialogue. Decision: **the gate opens the moment the crystal is taken**. The fifth painting stays as optional story (still readable, still sets `l2-fifth-viewed`, still shows the "Vết nứt…" re-read line and journal entry).

Do:
- `isExitOpen()` = `l2-crystal === true`. Move the `showToast('Lối ra đã mở')` and a short visual cue (reuse `flashGlow` on the exit, glow tint already switches in `updateVisualState`) into `collectCrystal()`. Make sure `updateVisualState(true)` swaps the arch to `woods_arch_open` and disables the threshold body in the same frame.
- Update everything that encodes the old gating: `getObjectiveText` (after the crystal: go to the gate; mention the painting as optional), `hintStage`/`showHint` (the `mural` stage should no longer block `exit`; hint order: exit first, painting optional), `getStatusText`, `CampaignScene.ts` ~line 613 (check what it gates — keep save/migration behaviour sane for old saves that have the crystal but not the painting: they must now count as open), and the assertions in `scripts/check-library-guidance.mjs` (lines ~351, 422, 479) and any reachability asserts.
- Browser/pure proof: with only `l2-crystal` set the threshold is disabled, arch texture is the open one, E on the gate calls `nextLevel`.

### C2 — gate is placed so the player walks "behind" it
Root cause: the arch (`woods_arch_*`, front-facing, 110px wide) sits on the **south** wall (`LIBRARY_LAYOUT.exit = {x:566, y:286, anchorY:312}`, threshold `(548,309,36,7)`, posts south). The player must walk *into* the screen-side of the art, under its header and between posts drawn in front of them. Levels 1 and 2 put the same arch on the **north** wall so the player walks up through it.

Do: move the exit to the **north wall, top-right**, built like the Level 02 gate (`WHISPERING_WOODS.gate`: backing + left/right post solids + threshold; player walks north through the opening and is drawn correctly in front of the lower posts and behind the header):
- Target centre x ≈ 576–584, arch width ≈ 96–104, base `anchorY` ≈ 170–180 (mirror the Level 02 proportions: threshold just above the post bottoms, backing up to the wall at y=80). The existing east mural (`mural` at `(500,144)`, `muralStand (500,226)`) may move up to ~12px west if the arch overlaps it; move `muralStand` with it.
- Remove/relocate what the arch replaces: the right big shelf (`LIBRARY_LAYOUT.shelves[1]` at `(598,120)` and its solid `{560,82,76,78}`), and skip the top-wall shelf at the matching x in `drawTopWallShelves` / `LIBRARY_HANG_XS` if they collide. Re-add a shelf elsewhere only if the right wall looks empty.
- Replace all coordinates that point at the old exit: `LIBRARY_LAYOUT.exit`, `LIBRARY_EXIT_THRESHOLD`, the two exit-post entries in `LIBRARY_SOLID_RECTS`, `LIBRARY_EXIT_GLOW` (`(566,262)`), `LIBRARY_LAYOUT.checkpoints` entry `(566,286)`, the `library-exit` interaction (stand must be on the **south** side of the opening, inside the doorway approach, radius ≈ 22), `EXIT` in `scripts/check-library-reachability.mjs`, and every user-facing string saying "Đông Nam" → "Đông Bắc" (objective, hints, prompt).
- Keep `resolveLibrarySpawn` working: a saved position inside the new post/backing solids must resolve to a safe checkpoint; keep a checkpoint near the new exit approach.
- Browser: walk from the mural to the gate and through it; confirm the player is drawn in front of the gate base and passes through the opening, the closed gate blocks at the threshold, the open art matches the open state.

If the north-right placement cannot be made clean (overlaps that cannot be solved without moving other puzzle elements), stop and report the specific conflict with a screenshot rather than shipping a compromise.

### C3 — information tablet in the far top-left corner
Root cause: the inscription plaque is on the top wall at `LIBRARY_PLAQUE` `(110,78)` with its trigger at `(110,102)`; the entry is `(214,288)` bottom-centre-left, so a new player never goes there.

Do: relocate the inscription to a free-standing carved tablet **on the first path from the entry** so it is the first thing the player meets, then read it: target base ≈ `(232–240, 268–272)`, stand directly south of it (≈ `(232, 282)`, within ~20px of the entry `(214,288)` so the `E · Đọc dòng khắc` prompt appears at/just after spawn and nothing else competes for that prompt). Validate and adjust:
- Not inside rack-3's prompt reach `(180,282)` radius 22 (+8 padding), not inside the south-seat approach `(320,282)` radius 40, and does not block the entry→well/desk/rack routes (`check-library-reachability.mjs` BFS keeps a 3px margin).
- Give it a small solid footprint (≈ 20×10, south edge on the base) in `LIBRARY_SOLID_RECTS`, depth-sorted via `depthAt(base y)`, prompt label above it (`getPromptBounds` = its image bounds), Rule 1 (south-edge trigger) applies. Reuse `drawInscriptionPlaque` art (tablet-body + engraving + glow) scaled up to ≈ 30×36 as a standing stone if needed.
- Remove the old top-wall plaque, restore the top-wall bookshelf in `LIBRARY_PLAQUE_AREA`, and update `check-library-reachability.mjs` (`inscription`, `plaqueStand`) to the new stand.
- Optionally mention it once in the first objective line or the opening beat only if it fits the existing text length limits in `CampaignHud`; do not add new dialogue otherwise.
- Browser: confirm at spawn the only visible prompt is the inscription, and that it does not hide the racks/seat prompts when walking on.

---

## Final integration (root agent, not the workers)
1. `npx tsc --noEmit`, `npm run build`, then restore `dist/index.html` (`git checkout -- dist/index.html`).
2. Run every `scripts/check-*.mjs` and the browser scripts that exist for Levels 1–3.
3. Update `docs/implementation/progress.md` / add a short report; commit per task; hand back for the user's replay of Levels 1–3.
