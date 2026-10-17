# Level 10 — The Heart of Elaria: spatial rebuild plan

Source of truth: `docs/scenario/10-the-heart-of-elaria.md` (campaign index 9). Coordinate, layering,
collision, interaction and save contracts: `docs/implementation/campaign-layout-design.md` and
`RULE_GAMES.md`. Approved acceptance: `docs/superpowers/specs/2026-10-16-complete-campaign-design.md`
item 10.

Implementation base: `a865dc7` (`test-develop`). The worktree already carried uncommitted Level 10
work in `src/scenes/CampaignScene.ts` (alcove/core anchors moved to the authored coordinates from
`assets/levels/10-the-heart-of-elaria/state-and-layout.json`, plus a first pass of Level 10
barriers). This plan continues that work; it does not restart it.

## Experience and shape

One 640×360 room, owned by a focused `HeartOfElariaLevel` controller and a pure
`src/data/heartOfElariaLayout.ts` module, following the Level 05 pattern
(`PathForTwoLevel` + `pathForTwoLayout` + `check-path-for-two.mjs`). The scenario needs one space
where three crystal sockets, three live root branches, the shared light pedestal, the confirmation
node and the ending all stay visible at once, so no room system is introduced.

Authoritative art anchors (from the asset package `state-and-layout.json`) are kept exactly:
core `(320,115)`, alcoves Memory `(158,192)`, Hope `(320,200)`, Balance `(480,192)`. The three
authored root paths from each socket up to the core are rendered with the package's own
`memory/hope/balance-root-{broken,repaired,connected}` full-scene layers.

## Player flow (spawn → ending), in order

| # | Stage | Where | Player action | Live result |
| --- | --- | --- | --- | --- |
| 0 | Reload gate | — | — | `l9-complete` → `EndingScene` immediately (never replays the puzzle) |
| 1 | Arrival | South path, spawn `(360,284)` | — | Opening dialogue (§2 four lines). Lumo follows beside Nhinh |
| 2 | Three placements | Memory / Hope / Balance sockets | Walk into each socket cell, E | `l9-memory`, `l9-hope`, `l9-balance`; scenario's two follow-up lines after the third |
| 3 | Safe teaching area | Root-rule reminder table, south-west | E cycles the four mini-models; SPACE (Pulse) near the table | Rules recalled, moss-covered root lanes revealed for a few seconds, journal note. Never solves the main net |
| 4 | Light source | Lantern pedestal, west | E with the lantern in hand | Lantern placed and lit → the shared beam leaves the pedestal |
| 5 | Hope seal | Pressure plate on the Hope lane | E calls Lumo, he physically travels and stands | `l9-called-heart` is only a record: the live condition is his *current* position |
| 6 | Beam work | G0 → prism → Memory mirror / Balance mirror | E rotates G0 (2 aims), the Memory mirror, the Balance mirror, the statue | Beams and the statue shadow update live; branch feedback is per prerequisite |
| 7 | Confirmation | Central root node, bottom centre | Walk onto the node with all three branches live, E | `l9-roots`: brass clips hold the configuration, the Hope seal no longer needs Lumo |
| 8 | Retrieve | Lantern pedestal | E takes the lantern back (still lit) | `l9-lantern-retrieved` + `l9-overload`; the carried-lantern line and the core bloom appear; F is available at once, even during dialogue |
| 9 | Final action | Anywhere | F extinguishes the lantern | Completion saved immediately, white channels retract, night, the day/night wheel resumes, then dawn → `EndingScene` |
| 9b | Alternate path | Lantern pedestal (lantern still placed, loop latched) | F extinguishes the lantern on the pedestal, then E collects it | No fake overload: straight to night → dawn → ending |

Backtracking is always allowed; nothing in the room closes behind the player and no timer, damage or
alarm exists (scenario §1).

## Puzzle: the exact live condition set

All beam conditions are `light = lanternPlaced && lanternOn`. Nothing is read from an `at-*` flag.

```
g0Split      = g0 aim === 'split'      // G0 turned into the prism
g0Direct     = g0 aim === 'direct'     // G0 straight at the Memory crystal (the trap route)
memoryRoute  = g0Split && memoryMirror === 1
balanceRoute = g0Split && balanceMirror === 2
lumoAtSeal   = hypot(lumo sprite, hope seal plate) <= 20   // live position only

eyeLeft      = light && balanceRoute && statue !== 1
eyeRight     = light && balanceRoute && statue !== 3
moonShadow   = light && balanceRoute && statue === 2

memory  = light && lumoAtSeal && (g0Direct || memoryRoute)   // beam reaches gold through the open membrane
hope    = light && lumoAtSeal                                 // blue root keeps an even rhythm
balance = eyeLeft && eyeRight && moonShadow
ready   = crystals(3) && memory && hope && balance
latched (l9-roots) => the three branch conditions are mechanically held by the brass root clips
```

The scenario's own failure modes are therefore all represented: straight G0 lights Memory while
Balance stays dark; recalling Lumo closes the membrane and drops both Memory and Hope; a wrong
statue angle either lights the Moon core (0) or blocks one outer eye (1 / 3).

## Feedback for every unmet prerequisite (central node, E)

One line naming *every* missing prerequisite, in this order:

| Condition | Vietnamese feedback fragment |
| --- | --- |
| `!crystals(3)` | `đặt đủ ba tinh thể vào ba hốc quanh Cây Mẹ` |
| `!light` | `đặt đèn đang bật lên bệ dẫn sáng` |
| `!lumoAtSeal` | `gọi Lumo tới ấn Hy Vọng và để cậu ấy đứng giữ` |
| `g0Direct` | `hướng G0 vào lăng kính, đừng chiếu thẳng` |
| `!memory && light && lumoAtSeal` | `chỉnh gương Ký Ức cho tia tới tinh thể vàng` |
| `!balanceRoute` | `chỉnh gương Cân Bằng tới bộ chia trước tượng` |
| `!eyeLeft \|\| !eyeRight` | `giữ cả hai mắt nắng nhận sáng` |
| `!moonShadow` | `xoay tượng để bóng phủ lõi Nguyệt` |

Branch controls give their own local feedback: each sun eye inspection names *why* it is dark
(`bộ chia chưa được cấp sáng` / `tượng đang chắn` / `đèn chưa ở trên bệ`), the Moon core inspection
says whether the shadow covers it, and the statue rotation reports what the new angle does. Locked
or solved controls never disappear: they answer with a line.

## Lantern end-state matrix

| State | `l9-lantern-placed` | `l9-lantern-retrieved` | `l9-overload` | `lanternOn` | in hand | F behaviour |
| --- | --- | --- | --- | --- | --- | --- |
| On pedestal, root net unsolved | true | false | false | true | false | F refused with feedback (`đèn phải ở lại bệ…`) |
| On pedestal, loop latched, still lit | true | false | false | true | false | **F extinguishes it in place** (scenario §8 valid final action) → already-off path |
| Taken back lit (overload) | false | true | true | true | true | F → darkness + dawn + completion save |
| Taken back while already off | false | true | false | false | true | E to retrieve already ended the campaign (no fake overload) |
| After the final F | false | true | false | false | true | campaign complete; reload goes to the ending |

Reload inside the overload restores a **safe** state, never a stuck one: lantern in hand, still lit,
`isOverloadMode` on, Nhinh at the named pedestal-bank checkpoint, Lumo beside her, and F immediately
available. `l9-overload` is never written together with `!l9-lantern-retrieved` (normalised on
build), which is the campaign equivalent of the v1 `finale_overload → hub_final` write-back.

## Save and restore order

1. Restore flags, compute the live conditions from restored positions.
2. Restore the crystal states, the lantern placement (`l9-lantern-placed`, with the legacy fallback
   `undefined + l9-roots + !l9-lantern-retrieved`), the lantern on/off, Lumo's position and the
   assignment flag.
3. Resolve a reachable spawn: the saved position when it is clear of every solid, else the nearest
   named checkpoint (`spawn`, `pedestal-bank`, `seal`, `confirm`, `east`). Never inside a solid.

## Guidance text (objective row, H ladder, journal)

Objective rows follow the stage: crystals → teach → source → seal → route → confirm → retrieve →
overload. `H` uses the scenario's three levels verbatim for the puzzle and the overload, and
three-level ladders for the earlier stages. `J` lists what was learned (placements, rules read, Pulse
lines, lantern state, current assignment). No stage text names the solution before the player has the
pieces (the scenario's own level-3 hints are the deepest allowed).

## Scope and non-goals

No new assets, no PNG edits, no new save format, no room system, no timers. Level 10 only; the
coming-soon gate is relaxed for index 9 only, in one documented line.
