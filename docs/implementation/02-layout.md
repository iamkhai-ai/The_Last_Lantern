# Level 02 — Whispering Woods: spatial design

## Scope and authority

Rebuild Level 02 only: `progress.level === 1` (Library is index 2). Source story: `docs/scenario/02-whispering-woods.md`. The user authorized design decisions and Luna high implementation using the Level 01 process, with no repeated confirmation. Level 01 belongs to another chat. Work in the separate `codex/level-02-spatial-rebuild` worktree from `797c594`, which includes main `f3c23de` and the Level 01 lifecycle fix. Do not edit Level 01 behavior, raster assets, save schema or Levels 03–10. Preserve the current Nhinh frames.

## Player flow

Arrive beside the practice stone at player center `(138,286)` carrying the lantern. Hear the scenario's four opening lines, followed by a short contextual Lumo instruction pointing to the practice stone directly ahead. The active E prompt, a subtle ground halo and a specific SPACE objective identify this first action immediately. A live practice reveal changes the objective to E. On practice completion, remove its halo and direct attention to the separate poem stone immediately RIGHT of the practice area at `(236,278)`, on the same southern path. Reading the poem then moves the objective to observing the firefly order and revealing/activating the three main stones. Neither practice nor reading the poem is a hard prerequisite for a player who already understands the puzzle; partial/solved saves prioritize puzzle progress or exit over tutorial guidance.

Walk around the three tablets: Moon left, Leaf upper middle, Star right. Pulse locally identifies a sleeping tablet; E while revealed activates it. Correct tablets stay gold without a timer for the whole sequence. A wrong pick resets only sequence/activation, preserving discoveries and poem. Re-touching a correct tablet is harmless. On the third correct tablet the northern gate opens, roots release, a warm memory vignette and the exact scenario dialogue play once. The player then walks to the distinct gate approach and presses E to descend to Library. Reading the poem can never intercept this exit.

```text
NORTH — vegetation and gate backing
             tree             tree              tree
                        Leaf                        GATE
                        (320,174)                  (510,190)

            Moon                                    Star
          (180,248)                               (450,248)
    practice
   (120,276) spawn (138,286)  poem (236,278)
SOUTH — HUD/status margin
```

## Spatial contract

Coordinates below are ground anchors unless marked player centers. World 640×360. Top HUD y=0..58, bottom HUD y=320..360. Use the existing Level 01 center-to-feet transform: feet at center y+19; body 14×6 with offset (11,37) in 36×42 frames. Standing depth is `10 + feetY / 10`; prop depth uses its ground anchor. Set this placement for Level 02 only; later levels retain their current settings.

One focused module `src/data/whisperingWoodsLayout.ts` owns anchors, stand points, floor, footprints, route, gate geometry, checkpoints, sequence predicates and safe restoration. Runtime rendering, physics, Pulse range and E consume that same data. Reuse pure point/rect/depth utilities if useful without modifying Level 01's values.

| Object | Art and anchor | Player stand / interaction | Collision and depth |
| --- | --- | --- | --- |
| Nhinh | Current 36×42 frames | Spawn center `(138,286)` | Center API preserved; feet depth even while talking |
| Practice leaf | L02 `runestone_leaf_*`, source 40×52 displayed 60×78, `(120,276)` bottom center | `(120,282)`, radius 24; always inspectable, dormant E explains Pulse; E when temporarily revealed completes practice once | Base `[107,264,26,12]`; same depth rule as standing tablets; practice progress independent |
| Moon | L02 `runestone_moon_*`, `(180,248)` | `(180,254)`, radius 24 | `[167,236,26,12]`; display 60×78 |
| Leaf | L02 `runestone_leaf_*`, `(320,174)` | `(320,180)`, radius 24 | `[307,162,26,12]`; display 60×78, separated from gate |
| Star | L02 `runestone_star_*`, `(450,248)` | `(450,254)`, radius 24 | `[437,236,26,12]`; display 60×78 |
| Poem | L02 `poem_fragment`, native 48×40, `(236,278)` bottom center | `(236,284)`, radius 24; repeat full poem; first-reading dialogue refers to this near-entry stone | `[219,267,34,11]`; separate target, no duplicate mural at gate |
| Gate | Closed existing arch / L02 open-passage, fitted uniformly bottom center `(510,190)` into common 128×126 canvas | `(510,181)`, radius 24; closed E gives useful locked feedback; open E descends; prompt y=94 | Posts `[456,156,20,34]`, `[544,156,20,34]`; backing `[446,96,128,60]`; closed threshold `[476,156,68,22]`. Open central corridor remains walkable. Stairs depth 3; front header/post crops at ground depth 29; full actor visible on central approach |
| Memory | Existing `memory_vignette` | Transient warm tint and two figures during completion dialogue only | Effects above world, below dialogue/HUD; clear on completion/shutdown; no permanent duplicate figures |

Gate backing ties to the northern floor boundary. Closed threshold stops the central north approach at center y=162; opening permits center y=140 before the backing. Do not teleport the player at the barrier. Open gate foot anchor must not jump. The front header crop ends at world y<=116, above the actor at the open stop (head y=119). Crop side posts to leave at least 40px clear through the center; preserve source aspect ratio and nearest-neighbor pixels. Avoid changing Level 01 gate helpers; a local Level 02 renderer/crop cache is acceptable. Bind images by object IDs rather than coincident coordinates. Only swap textures when keys change.

Floor follows the existing woods contract: center x=12..628, body/feet restricted to y=96..310. Trees at `(48,142),(125,112),(240,106),(350,108),(600,130),(48,230),(600,240),(65,310),(568,310)`. Each trunk footprint `[baseX-9,baseY-14,18,14]`; rocks at `(100,195),(552,292)`, footprint `[baseX-13,baseY-14,26,14]`. Use existing trees/rocks at native proportions. Canopies sort by base; they can hide actors behind them, never replace trunk collision. Ground bushes, grass and flowers are passable. Keep the practice/rune/poem glyphs and stand points clear of canopies.

Stand points six pixels below each stone's base keep E available at its southern physics contact: that contact is center y=baseY-16, only 22px from the target. Practice/main rune labels now use `promptY=anchorY-92`, above the enlarged 78px artwork; poem remains `anchorY-64`, gate y=94. Keep compact stone-base footprints: enlarging the carved upper body does not require an invisible collider across its entire silhouette. Preserve aspect ratio and nearest-neighbor texture filtering. Verify the initial spawn is unobscured by the southwest canopy; adjust only that tree's ground anchor leftward if required, with its footprint updated from the same data.

Use existing grass/dirt/stone textures, with an irregular circular clearing and >=48px paths connecting spawn, practice, three rune approaches, poem and gate. Ground masks/stone stamps stay below feet; no cross-shaped debug paths or drawn route lines. Empty grass remains traversable; colliders require visible corresponding art. Props must not be baked into an opaque background and drawn again.

## Puzzle, feedback and narrative

- Play the full four-line opening from scenario §2 without mentioning the solution. Preserve durable `intro-1`.
- Practice E is discoverable while dormant (explains light/Pulse), revealed (first practice response from §3), and completed (inspect without changing sequence). Save `l1-practice-complete` independently.
- Pulse reveals nearby glyphs for 5000ms; activated runes stay gold. Seen flags persist in J after light fades, but an unactivated world glyph sleeps again and cannot activate until a new Pulse. Active reveal range is measured using spatial rune anchors consistently. Do not clear previously seen notes when a Pulse misses a rune.
- E on any sleeping rune explains how to reveal it. E on a revealed rune uses order Moon, Leaf, Star. First success gets §4 first-success dialogue; second success gets the different roots-loosening line. Activated repeats preserve progress. Wrong order resets only sequence and activated flags, retaining poem, practice and seen flags; keep any currently live Pulse revelation until its normal expiry.
- One cohort of fireflies visibly flies Moon, Leaf, Star, pausing at each symbol (approximately 1300ms rests and 1500ms flights). Reset the loop without implying a different puzzle order. Use glows/dots, not a static connecting line. Track/tidy tweens on teardown.
- On final success, save permanent `l1-open`, three activated flags and `rune-sequence=3`. Guard memory with `l1-memory-seen`, play exact §5 speakers/lines and existing vignette once, then remove temporary effects. Old open-gate saves with memory already seen never replay it. No crystal awarded in Level 02.
- Exit interaction is reachable on the near side and always gives feedback. While open, E plays all three §7 lines then enters index 2 through the existing fixed campaign lifecycle. No automatic exit on solving the third rune. Poem remains independently readable before/after opening.
- H escalates observation / relationship / next action using §6. Level-three help names only the next rune when partially solved; reset escalation when puzzle stage advances. Before requesting that hint, opening/HUD must not state the complete order. Objective changes from observe/practice to sequence progress to explicit open exit.
- J contains discovered glyphs and positions, practice, the full poem only after reading, and day/night memory only after seen; no future crystal. Existing Vietnamese scenario dialogue remains the copy source. English filenames.
- Lumo follows during this level; no stationary old-level target or unnecessary companion puzzle.

### User review correction — 2026-10-17

User found the symbol stones too small and the starting flow unclear. Supersedes prior generic observe/practice objective and distant `(280,286)` spawn. Store rune display size and tutorial stage computation in the focused Level 02 module. Stage priority: open exit, existing sequence progress, practice (SPACE or E according to its live reveal), poem, then main observation/sequence. Old saves with solved/partial progress must not be sent back to practice. Stage-specific H should reinforce the same current action; reset its escalation on stage changes. Existing correct/wrong/expiry/memory/save semantics stay intact.

Use one subtle ground cue only for the current practice/poem target; remove it when moving to the main puzzle. Do not light a sleeping glyph or label a correct main rune merely to provide direction. Preserve the firefly clue and discovery. Keep full original practice dialogue, then add one directional Lumo sentence about the poem. Initial opening may add one sentence about the nearby practice stone; no full-order spoiler. Add a visible low-key `Bia tập` label if needed to distinguish the lone training stone from the three principal stones.

### Near-entry poem correction — 2026-10-17

User found the poem too far away. Move only poem anchor/stand/base to the southern entry path as specified above. Update Lumo direction, HUD, H, route/checkpoint data and affected fixture coordinates together; remove active guidance that still says left of the northern gate. The practice-to-poem stand distance is about 116px, around one second of walking; require an unobstructed direct segment at y=284..286, distinct interaction radii and no art overlap with the enlarged Moon stone. Keep E local at radius 24 rather than enabling remote reading. Existing poem-read flags remain valid and the main puzzle/gate is unchanged. This supersedes the earlier scenario-location choice near the gate; the poem text and puzzle solution are preserved.

## Save restoration

Preserve v1 keys `l1-seen-*`, `l1-activated-*`, `l1-practice-complete`, `l1-poem-read`, `l1-open`, `l1-memory-seen`, `rune-sequence`, existing player counters. Normalize sequence to its valid activated prefix on load; a legacy `rune-sequence=3` or all three activated flags is a completed puzzle and must recover an open gate (addresses prior 3/3-but-closed saves). An explicit open flag remains open even if older flags are incomplete. Do not discard unrelated progress.

Revelation is temporary and not restored as live power from `seen` notes. Resolve old/in-solid/behind-locked-gate positions onto safe near-side floor. Named centers: start `(138,286)`, practice `(120,286)`, moon `(180,258)`, leaf `(320,184)`, star `(450,258)`, open gate approach `(510,194)`. A stale coordinate inside the gate backing must not move the player past a locked threshold. Physical contact at closed center `(510,162)` is safe and loads in place; use strict body overlap, not inclusive edge collision. Add any near-side restoration guard only to restore logic, not a mismatched invisible movement strip. Persist changed discoveries/activation before dialogue. Do not change the save key or clear the user's save.

## Acceptance and verification

Root and worker run actual commands and bind evidence to a frozen revision. Commands: `npm run build`, new `node --experimental-strip-types scripts/check-whispering-woods.mjs`, existing forest-edge/start-intent checks and `git diff --check`. Browser uses a dedicated temporary origin/context, not the user's 5184 storage.

Pure checks prove center/feet/body correspondence; routes to every stand point; gate closed/open passage and post solidity; no poem/exit target overlap; safe restore; practice independence; reveal expiration versus durable discovery; correct/repeated/wrong sequence; legacy completion normalization. Tests must exercise helpers consumed by runtime, not a disconnected model.

Actual keyboard browser run starts from a legitimate Level 02 entry save (Level 01 is owned elsewhere), without injecting Level 02 solution flags. Prove practice, expired reveal rejection, local reveal, wrong/repeated activation, correct full sequence, memory once, poem after opening, E to Library, Continue and safe restores. Separate fixtures may inspect geometry/layering; label them separately from playthrough. Screenshot opening, practice, glyph states, moving route, tree behind/in-front, closed/open stairs, memory and distinct exit prompt. Two independent read-only Luna high reviewers inspect the same source revision. Correct and re-review findings. No push/merge/publication; human acceptance remains the user's review.
