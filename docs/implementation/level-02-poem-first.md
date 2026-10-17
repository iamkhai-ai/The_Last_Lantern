# Level 02 — poem-first entrance redesign

## User intent and ruling

The user rejected the entrance flow: a fourth symbol stone is confusing, and the poem must be the first object a new player finds and reads. This is a bounded redesign of the existing Level 02 spatial flow. The user previously authorized autonomous decisions and Luna High implementation. This brief supersedes the practice-first and near-entry-poem corrections in `02-layout.md`, `level-02-flow-follow-up.md`, and `level-02-poem-follow-up.md`.

Selected design: an entrance reading nook feeding a three-stone clearing, with a separate northeastern exit. Remove the separate practice stone. Level 01 already teaches Pulse; the first main stone can reinforce it without adding a fourth symbol. Keep the three-stone puzzle, poem text, firefly clue, memory, gate and Library transition. Do not change other levels, character frames, raster assets, dependencies or save schema.

## Spatial contract

World 640×360; retain the existing feet/body/depth contract and floor limits. Ground anchors and center stand points are separate. Render, interaction, collision, fireflies, guidance and restoration consume the shared Level 02 module.

| Object | Ground anchor | Player center target | Base collider |
| --- | --- | --- | --- |
| Fresh spawn | n/a | `(136,286)` | Existing player foot body |
| Poem | `(136,270)`, displayed 96×80 from native 48×40 | `(136,276)`, radius 24 | `[102,256,68,14]` |
| Moon | `(232,242)` | `(232,248)`, radius 24 | `[219,230,26,12]` |
| Leaf | `(326,174)` | `(326,180)`, radius 24 | `[313,162,26,12]` |
| Star | `(408,266)` | `(408,272)`, radius 24 | `[395,254,26,12]` |
| Gate | `(510,190)` | `(510,181)`, radius 24 | Existing backing, posts and closed threshold |

The poem slab displays at 96×80 from its unchanged native 48×40 source; the three symbol stones remain 60×78. The poem and Moon silhouettes have an 18px horizontal gap. Star's right edge is x438, leaving 8px to the gate canvas at x446. Poem is the only E target within the fresh spawn's radius: it is 10px away. The player sees the poem immediately above the entry position without a canopy hiding either object. Do not place a foreground bush, bright decoration or symbol stone in this entry pocket. The poem prompt sits 24px above the enlarged art top. Widen its visible base footprint to `[102,256,68,14]`; the southern collision contact remains walkable and within E radius.

The entry dirt path comes from the southern edge into the poem nook. From there a continuous broad path bends east into the clearing near Moon. An irregular clearing connects all three main stones without drawn arrows, numbered labels or a line that gives away their order. A separate east-side path reaches the gate from the south. Use the existing masked dirt texture. Clear widths are at least 48px; important stands and the actor's feet remain on visible ground. Keep existing trees/rocks only where they neither hide the entry clue nor block these routes. Trees/rocks stay solid at their bases; foliage remains passable; feet determine actor/prop ordering. Gate stairs stay below the actor and arch posts/header retain their established front layers.

Path/checkpoint data and fixture walking routes must avoid the enlarged silhouettes and physical stone bases. The gate must not be reachable through its closed threshold. Its existing geometry and restore guard are unchanged.

## Player flow and guidance

1. Enter beside the poem. After the original opening dialogue, Lumo points to the writing directly ahead. Initial objective and H say to read it with E. One restrained ground cue marks the poem only while unread and before main progress.
2. Read the full original poem locally with E. Preserve the original first-reading exchanges, then give a short practical direction to the three stones and SPACE. Reading adds the poem to J. Do not require or refer to a separate practice stone.
3. Walk along the dirt path to the clearing, reveal glyphs with SPACE and use E. Three stones and the firefly loop communicate one puzzle. Keep Moon–Leaf–Star order and all expiry/repeat/wrong-sequence rules.
4. Solve, see the original memory once, then walk along the distinct eastern approach and E at the open gate to reach Library.

Tutorial stage priority: completed/open exit; partial sequence; unread poem; main observation. A fresh save must never start with a SPACE/practice objective. Do not add a poem hard lock to rune activation: old partial/completed saves and experienced players retain valid progress. After a wrong reset, guide according to poem-read status. HUD, H, cue, opening and J must agree. Remove practice art, collider, E action, Pulse target, persistent label and active journal/guidance references. Preserve old practice flags as inert save data, without mutating unrelated flags. Adapt the first-main-success line that formerly compared the sound with practice; it must make sense without a practice interaction.

## Implementation and evidence

Worker: one native `gpt-6-luna` High agent, no child agents, in the existing `codex/level-02-spatial-rebuild` worktree. Scope: the Level 02 module, Level 02 branches in CampaignScene, affected checks/fixtures, and current Level 02 documentation. No concurrent source edits. Freeze a local commit for two independent read-only Luna High reviews; address findings and re-review as needed. No push or merge.

Verification: existing woods, forest-edge and campaign-start-intent checks; affected browser-script syntax; build; diff check. Update authorized focused checks to prove poem-first target/stage, exactly three main stones, absent practice footprint, reachability, silhouette separation, meaningful collision/depth, old-save recovery and existing puzzle semantics. Restore generated tracked `dist/index.html` after build. Browser runtime is currently NOT_RUN because Work browser control is disabled; do not bypass it or reuse historical playthrough results for this revision. Human preview can reload the existing localhost5190 page with a new external preview marker and backup of the old test save.

Risk: removing the optional scenario practice beat changes its teaching rhythm. Decision: reinforce Pulse after reading and on the first main stone instead; this preserves one clear three-stone puzzle and meets the user's explicit poem-first direction. Actual visual acceptance remains pending the user's review.

## Implementation report — 2026-10-17

Implemented in `src/data/whisperingWoodsLayout.ts` and the Level 02 branches of `src/scenes/CampaignScene.ts`. The fresh spawn now faces the poem; the runtime has exactly three rune objects and no practice art, action, reveal state, journal entry, HUD field, or tutorial stage. The shared module owns the new anchors, stands, footprints, poem-first priority, firefly route, and masked path polygons. The irregular masked dirt connects the southern entry, poem nook, clearing, and eastern gate approach. The eastern path was widened after a focused 50px cross-section assertion found a narrow segment. The original four opening lines and poem text remain; Lumo directs the player to the poem, then to Pulse and the three stones. The first-main-success line no longer mentions practice. Legacy practice flags remain untouched and inert.

Rewrote `docs/implementation/02-layout.md` as the current poem-first specification, updated the Level 02 scenario, and marked `level-02-flow-follow-up.md` and `level-02-poem-follow-up.md` as superseded history. Updated the pure contract and existing browser/geometry fixture assertions for fresh poem target, three rune silhouettes, new routes, and legacy flags. Root-provided geometry and browser fixtures were not executed in a browser because Work browser control is disabled.

### Verification

- `node --experimental-strip-types scripts/check-whispering-woods.mjs` — PASS (`Whispering Woods contract checks PASS`), including 50px ground-path cross sections, spawn/poem separation, route reachability, gate collision/restore, and puzzle/save semantics.
- `node --experimental-strip-types scripts/check-forest-edge.mjs` — PASS (`Level 01 geometry/state checks passed`).
- `node --experimental-strip-types scripts/check-campaign-start-intent.mjs` — PASS (`Campaign start intent lifecycle checks passed`).
- `node --check scripts/level02-browser.cjs` — PASS.
- `node --check scripts/level02-geometry.cjs` — PASS.
- `npm run build` — PASS; TypeScript check and Vite build completed, 406 modules transformed. Restored generated `dist/index.html` after the build.
- `git diff --check` — PASS.
- Real browser runtime — NOT_RUN; browser automation is disabled in Work settings. No server or browser session was started.

The first build attempt found a TypeScript widening error in the new dynamic opening dialogue array. Annotating it as `DialogueLine[]` resolved the error; the completed build above passed. The final source revision is recorded by its commit SHA in the implementation task report.

## Follow-up decision — 2026-10-17

User review found the poem slab too small to show its Moon, Leaf, and Star glyphs clearly. Existing high-resolution generated source art already contains all three glyphs, so no image regeneration or raster edit is needed. Enlarge only its runtime display to 96×80 (2× native), keeping anchor `(136,270)`, spawn `(136,286)`, stand `(136,276)`, and interaction radius 24 unchanged. Set the shared prompt offset to `-104`, which places its label above art top y=190. Widen the visible base collider to `[102,256,68,14]` while keeping bottom y=270; this preserves southern contact y=254 and E range. Widen only the poem cue ellipse to 86px. Keep tree anchors, story, flow, puzzle, saves, and other levels unchanged.

## Root verification and review — 2026-10-17

Checked frozen source revision `2e8a91754ff1a8b59594c8b556c9cb4365258fc0`. Root independently ran the woods, forest-edge and campaign-start-intent checks, both browser fixture syntax checks, `npm run build` (406 modules, Vite 9.39s), and `git diff --check 252aef0 HEAD`: PASS. Only generated tracked `dist/index.html` changed during build and was restored. Source scope is restricted to the Level02 module and Level02-specific CampaignScene branches; character frames and raster assets are unchanged.

Two independent read-only Luna High tasks reviewed the same frozen revision. Review B reported no actionable findings. Review A initially reported P2: the connector-to-clearing polygon overlap appeared narrower than the 48px path contract. Root sampled a perpendicular 48px swath along the connecting centerline across the join, at 0.5px intervals: all 12,901 points were inside the union of visible ground paths. Review A independently reproduced that result and withdrew the finding: polygon overlap width is not traversable union width. Review A then reported no other actionable findings. No source correction was needed for this finding; its disposition is preserved here rather than silently removed.

Browser runtime/visual verification: NOT_RUN because Work browser control is disabled. The historical playthrough is not reused. Human visual acceptance remains pending. The external localhost5190 preview configuration now uses `level02-human-preview-poem-first-v4`; on the next load of `?level=2` it backs up the previous test save under `level02-human-preview-backup-poem-first-v4` and initializes a legitimate fresh Level02 entry once. HTTP serving returned 200 and included the new marker. HTTP checks do not establish gameplay correctness. The preview configuration is outside the repository. No push, merge or remote publication.

This closure is evidence only. The product source, requirements, scripts and assets checked above remain at the reviewed revision.
