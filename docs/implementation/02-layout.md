# Level 02 — Whispering Woods: poem-first layout

## Current authority

The poem-first redesign in `level-02-poem-first.md` is the current user-authorized design for Level 02 (`progress.level === 1`; Library is index 2). It supersedes the practice-first and near-entry-poem corrections recorded in `level-02-flow-follow-up.md` and `level-02-poem-follow-up.md`. Level 01 and Levels 03–10 remain unchanged. Do not edit raster assets, character frames, dependencies, save schema, or remote state.

The older scenario’s standalone practice-stone beat is removed from the playable flow. Level 01 already teaches Pulse. The poem text, three-rune puzzle, memory, gate, and Library transition remain. `l1-practice-complete` and `l1-seen-practice-leaf` survive as inert legacy flags: do not read, display, mutate, or clear them.

## Player flow

1. Fresh entry center is `(136,286)`, directly below the poem. It is within radius 24 of the poem and outside radius 24 of every rune and gate target. After the original four opening lines, Lumo points to the poem; objective, H, prompt, and a restrained ground cue all direct E to the poem.
2. E reads the full original Vietnamese poem and the existing first-reading exchanges. Lumo then points toward the three main stones and explains SPACE to reveal their marks and E to activate a lit mark. J records the poem only after reading.
3. Three stones only: Moon, Leaf, Star. A nearby SPACE Pulse reveals sleeping glyphs for 5000ms; discovery notes remain in J, while unactivated glyphs sleep again after expiry. E on a sleeping glyph explains Pulse. Correct activations remain lit, repeats preserve progress, and a wrong pick resets only the activation sequence and active flags. Poem and discoveries remain.
4. After the first correct activation, dialogue reinforces that Pulse revealed the mark without mentioning a training stone. On the third correct activation, open the gate, save all three active flags and sequence `3`, and show the existing memory vignette/dialogue once. The player walks to the eastern/southern gate approach and presses E to enter Library. No automatic exit.

Tutorial priority is open exit, partial sequence, unread poem, then main observation. Old partial and solved saves never return to poem guidance; reading the poem is not a puzzle prerequisite. H, HUD, opening direction, cue, and J use this flow. No active player-facing text refers to the removed practice stone.

```text
NORTH — trees and unchanged gate arch
                       Leaf (326,174)            GATE (510,190)

             Moon (232,242)             Star (408,266)  → east/south exit

SOUTH ENTRY       Poem (136,270)
                  Nhinh (136,286)
```

## Spatial contract

Coordinates are ground anchors unless marked player centers. World size is 640×360. HUD occupies y=0..58 and y=320..360. Level02 uses the established center-to-feet transform: feet at center y+19; body 14×6 at offset (11,37) in 36×42 frames; standing depth is `10 + feetY/10`; prop depth uses its ground anchor.

One focused `src/data/whisperingWoodsLayout.ts` owns anchors, stands, visible base footprints, route waypoints, masked ground paths, firefly route, gate geometry, checkpoint restore, tutorial priority, and rune state. Runtime art, physics, interaction, guidance, fireflies, and restore consume this shared data.

| Object | Art and ground anchor | Center / target | Base footprint |
| --- | --- | --- | --- |
| Fresh spawn | Nhinh’s current frames | `(136,286)` | Existing player body |
| Poem | Native 48×40, `(136,270)` | `(136,276)`, radius 24 | `[119,259,34,11]` |
| Moon | 60×78, `(232,242)` | `(232,248)`, radius 24 | `[219,230,26,12]` |
| Leaf | 60×78, `(326,174)` | `(326,180)`, radius 24 | `[313,162,26,12]` |
| Star | 60×78, `(408,266)` | `(408,272)`, radius 24 | `[395,254,26,12]` |
| Gate | Existing fitted 128×126 art, `(510,190)` | `(510,181)`, radius 24; prompt y=94 | Existing backing/posts/threshold |

Poem and Moon silhouettes have a 42px horizontal gap. Star ends at x=438, 8px from the gate canvas. Keep all stands and the actor’s feet on visible ground. The southern entry dirt path runs from the world edge to the poem nook, bends east toward Moon, then joins an irregular clearing that contains all three runes. An eastern path reaches the open gate from the south. Use the existing masked dirt texture with natural edges, minimum 48px clear widths, and no arrows, numbered labels, or drawn solution line. Keep the poem pocket clear of canopies, bright decor, rune art, and extra stones. Gate geometry and layers stay as previously authored.

Floor bounds and solid trees/rocks remain in the shared module. Preserve body-to-foot agreement, trunk collision, passable foliage, actor/prop depth ordering, and the closed-gate center contact at y=162. The closed threshold blocks the arch; the open passage allows the center to y=140. Gate backing, posts, prompt, and save guard remain unchanged.

## Persistence and restoration

Keep v1 keys and counters. Normalize a valid activated prefix on load. Legacy sequence `3`, all three active flags, or explicit `l1-open` recover an open gate with all runes active. An explicit open flag remains authoritative. Keep poem-read and discovery flags. Old practice flags are inert and preserved unchanged.

Temporary Pulse power is never restored from durable seen notes. Resolve unsafe or behind-locked-gate player positions to safe near-side floor; safe contact at closed threshold `(510,162)` loads in place. Prior practice and poem positions remain ordinary walkable floor where safe. Do not reset saves or add a poem prerequisite to rune actions.

## Verification and review

Run the existing woods, forest-edge, and campaign-start-intent checks, affected browser-script syntax checks, `npm run build`, and `git diff --check`. Focused contracts prove poem is the fresh first target; exactly three main stones and no practice art/footprint/target; stage priority; direct poem approach; three rune positions and routes; no silhouette overlap; tree/rock collisions and depth; open/closed gate contact; restore compatibility; and correct/repeat/wrong/legacy puzzle behavior.

Browser runtime is NOT_RUN while Work browser control is disabled. Do not bypass that setting or reuse browser results from an earlier revision. Restore only generated tracked `dist/index.html` after build. Freeze a local commit for two independent read-only Luna High reviews; no push or merge. User visual acceptance remains pending.
