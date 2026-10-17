# Level 04 — Shattered Moonlit Creek: deliberate spatial rebuild

## Authority, intent and scope

User request, 2026-10-17: continue with Level04 and think carefully about design before implementation. Prior instructions authorize autonomous design decisions, local implementation by Luna High, and sequential level work. This is a bounded rebuild of existing CampaignScene index3, preserving the 640×360 scene and v1 save. Story and dialogue source: `docs/scenario/04-shattered-moonlit-creek.md`. Baseline `origin/main` at `044655447e7df228b7ab57d40d0ad516b78e4a54`. Work in the existing clean worktree on new branch `codex/level-04-spatial-rebuild`; another chat owns Level03. Do not edit the dirty primary checkout, other levels, character frames or PNGs. No push or merge is authorized for this slice.

Success: a player entering the scene recognizes a small safe experiment first, learns to place and retrieve the lamp, follows the real beam to the first bridge, sees its nearby latch, reaches the island, reroutes the beam, latches the second bridge, retrieves the lamp, reads the full relief dialogue and enters Level05. Visual terrain must agree with physical crossings. No water bypass, far-side interaction or light-loss softlock.

## Rejected layouts and root findings

The old campaign renders a scenic two-channel creek but blocks one unrelated central rectangle. Its first latch is on the far side of its barrier, power requires inspecting a receiver, retrieval is blocked until both crossings, and B power omits G1. It has no independent practice mechanism, does not allow F while the lamp is placed, abbreviates the scenario dialogue, and uses a decorative exit with insufficient completion gates.

Retaining the scenic base as a walk map leaves a baked southern crossing which defeats the intended puzzle. Copying the offline previews replaces terrain with flat debug-like panels. Selected approach: compose the playable banks/water/bridges from existing tiles and transparent mechanism sprites; use the scenic source only as distant framing above the floor. Do not redraw the old permanent crosswalk underneath conditional bridges.

## Spatial composition

Ground anchors differ from player center and optical centers. Level04 adopts the established 36×42 actor frame, feet=centerY+19, body14×6 offset(11,37), exact depth `10+groundY/10`. Top HUD y0..58, bottom HUD y320..360. World floor envelope x16..624, y88..310 in feet/body coordinates. Hard outer bounds and both water cuts run through the whole envelope; neither can be bypassed above/below a span.

Three stone banks: west x16..244, island x304..396, east x456..624. Water gaps x244..304 and x396..456. Both bridge walking surfaces y230..266; player center y229 places feet at248. Each existing bridge PNG100×36 is displayed natively at depth3, center(274,248) or(426,248); 20px abutments overlap each bank, while the 60px water gap is conditional. A missing span blocks the full water gap, not just a thin invisible fence. Outside the bridge lane both water strips are always solid. Quay edges/low stone lips visibly mark the physical border. Use native stone/grass/water texture detail and optional nonblocking moss, not outline boxes, opaque tutorial panels, or painted solution arrows. Bank edges should look authored, with sightlines to their mechanisms; do not cover optical faces with canopy or shrubs.

| Object | Ground anchor / visual | Optical center | Player center stand / base |
| --- | --- | --- | --- |
| Fresh spawn | Nhinh current art | n/a | `(68,286)`; only practice source in E range |
| Practice source | `(68,291)`, source32×44 | `(68,264)` | `(68,288)`; base `[57,281,22,10]` |
| Practice mirror | `(132,289)`, upright32×40; distinct `Gương thử` caption | `(132,264)` | `(132,288)`; base `[121,279,22,10]` |
| Practice flower-eye | flower28×28 at `(132,222)`; no E activation required | `(132,208)` | Base `[122,214,20,8]`; passive opens with light |
| Main source | `(76,201)`, source32×44 | `(76,174)` | `(76,207)`; base `[65,191,22,10]` |
| G1 | `(202,199)`, mirror1 upright32×40 | `(202,174)` | `(202,205)`; base `[191,189,22,10]` |
| G2 | `(202,133)`, mirror2 upright32×40 | `(202,108)` | `(202,139)`; base `[191,123,22,10]` |
| G3 | `(350,133)`, mirror3 upright32×40 | `(350,108)` | `(350,139)`; base `[339,123,22,10]` |
| Eye A | receiver24×24 bottom `(76,120)`, always visible | `(76,108)` | Wall fixture, no E needed; base `[68,112,16,8]` |
| Eye B | receiver24×24 bottom `(350,206)`, always visible | `(350,194)` | Wall fixture, no E needed; base `[342,198,16,8]` |
| Latch A | dedicated west handle28×32 at `(224,284)` | n/a | `(224,252)`; base `[214,274,20,10]`, north/bridge approach |
| Latch B | dedicated east handle28×32 at `(374,284)` | n/a | `(374,252)`; base `[364,274,20,10]`, north/bridge approach |
| Relief | existing128×80 at `(546,182)` | n/a | `(546,188)`; base `[498,170,96,12]` |
| Station entrance | existing open-passage arch fitted88×86.625 at `(568,300)`, depth5 | n/a | `(568,286)`; side-post ground footprints `[530,278,22,22]` and `[584,278,22,22]`, repeatable locked feedback |

Practice source and mirror stands are 64px apart, distinct radius24 zones. Main source and practice source are 86px apart; no ambiguous E target. G1/G2 stands are 66px apart. G2 is near the west lip, reached again from the island via latched A; interaction is never allowed across water. Latch A and B stand centers are fully on their near bank, reachable before crossing. Central island is 92px wide; G3, B and latch B have separate approach areas. Relief and exit are 98px apart vertically, separate labels and actions. Every control radius24 also requires same-bank/clear approach. All coordinates consumed from one module, never duplicated in rendering, beam code, input, colliders or fixtures.

The practice group has a distinct `Gương thử` caption and flower feedback; main mirrors have persistent one/two/three dots and distinct G1/G2/G3 names. The existing practice art reuses the native mirror1 sprite, including its small base dot; this local slice does not edit PNGs. The caption and isolated experiment distinguish it from G1. Only one restrained source cue at the current initial teaching step; no multiple competing glows. Main source and practice source must use distinct prompts and a small low-key label. Practice source and mirror captions sit above their artwork at `(68,238)` and `(132,238)`, below moving actors in depth. The three main mirrors keep their identity marks upright when the reflector changes.

Walking route waypoints are player centers: entry `(68,286)`; practice source `(68,288)`; practice mirror `(132,288)`; main source via `(100,288)`, `(100,229)`, `(76,229)` to `(76,207)` (around the practice source base); G1 via `(76,229)`, `(202,229)`, `(202,205)` (south of the practice flower, not through it); G2 via `(168,205)`, `(168,139)`, `(202,139)` (around the solid G1 base); latch A `(224,252)`; bridge A centerline `(228,229)` to `(350,229)`; G3 from `(320,229)` to `(320,139)` to `(350,139)` (around B's base); latch B `(374,252)`; bridge B centerline `(374,229)` to `(480,229)`; relief `(546,188)`; exit `(568,286)`. The latch's interaction point is the raised handle above its ground base, intentionally approached from the north: it is within23px of the crossing centerline without obstructing it. Main-path material and sightlines should make these detours around physical props natural. Do not draw the full solution as a line.

## Beam geometry, not arbitrary numeric success

Screen coordinates: east(1,0), north(0,-1), south(0,1), west(-1,0). Use a small Level04-specific axis ray tracer over authored mirror/receiver optical centers, nearest intersection and bounded loop detection. A receiver illuminates when a powered ray actually reaches it; inspecting it is not a prerequisite. Draw only currently reached beam segments, with a dim miss endpoint. No pre-drawn successful route and no direct source-to-eye jump.

Physical reflector rules: slash `(dx,dy)->(-dy,-dx)`; backslash `(dx,dy)->(dy,dx)`; horizontal reflects north/south and absorbs a horizontal grazing hit. Three discrete native orientations, never rotate the entire mirror/dots. A loop or miss terminates without success.

- Main emitter `(76,174)` points east to G1 `(202,174)`.
- G1 slash turns east to north, reaching G2 `(202,108)`.
- Configuration A: G2 backslash turns north to west, reaching A `(76,108)`. Powered bridge A is now visible and traversable; latch A on the west bank commits it permanently.
- Configuration B: G2 slash turns north to east, reaching G3 `(350,108)`. G3 backslash turns east to south, reaching B `(350,194)`. A remains held by its latch. Both G1 and G2 must still conduct; B cannot be lit by G3 alone.
- Practice emitter `(68,264)` east to practice mirror `(132,264)`; slash turns north to flower `(132,208)`. This graph has no connection to the main source or bridges.

Native mirrors: 0 horizontal, 1 backslash, 2 slash for G1/G2; G3 uses 0 horizontal,1 slash,2 backslash to retain its legacy correct value. These are explicit visual lookup tables, not opaque magic numbers. Legacy G2 value3 maps to new slash2 only during one-time layout migration; legacy G2 value2 was a miss and maps to horizontal0. Persist `l3-layout-v2` to avoid remapping a new value2 on every load. All further rotations cycle three actual poses. Keep G1/G2/G3 counter keys for compatibility. Source and receiver visuals reflect live power; latched bridge stone/brass brace differs from temporary cyan bridge; a latch remains visibly lowered when the beam goes dark.

Native art inspection refined the ground anchors before implementation: mirror faces are at source y≈15 in a40px canvas, so their optical center is25px above the bottom anchor. The source flame is at y≈17 in a44px canvas,27px above its bottom. The table uses these offsets so rays visibly strike the glass/flame, not the pedestal stem. Flower center is14px above its bottom. Do not substitute geometric image centers for optical centers. Independent Luna High pre-review found the cardinal ray routing and two-bank gaps consistent; root also sampled proposed body/route geometry and corrected the practice-to-main detour around the solid practice source before dispatch.

## Teaching, narrative and progress

Use all original opening lines. Add one final contextual direction to the nearby practice source without revealing the bridge solution. Initial E places the lamp on the practice source whether on/off (do not force it on); F controls the current lamp even while placed, scoped only to Level04. E retrieves it freely when safe. On first flower illumination, play both original practice lines and save a durable practice-complete fact. Guide pickup after practice, then the main source. Practice is optional for old partial/complete saves and experienced players; it does not gate main mechanics.

Main flow: place lit lamp, rotate G1/G2 while following the ray, A lights automatically, show original A dialogue once, latch A, cross to island, return to G2 via stable bridge and reroute to G3, show original reroute dialogue once, rotate G3, B lights automatically, latch B on the island before crossing, return to west source, retrieve lamp, cross both held spans, read relief, E at station exit. G3 can be explored earlier without granting progression. No receiver activation action or mandatory first crossing flag is needed to power a bridge. Merely walking over a span never latches it.

Latches always give feedback: unavailable when their eye is unpowered, actionable when powered, repeatable confirmation after committed. Source E is one local toggle action: if lamp is on this source, retrieve; if held, place; if on the other source, explain where it is rather than teleport it. Retrieval is allowed before solving, not only at the end. Do not force lanternOn=true on placement/retrieval or load; preserve its saved actual on/off state around the existing LanternSystem methods.

HUD/H share a derived current step: practice-place, practice-rotate, practice-retrieve, main-place/light, route-A, latch-A, route-B, latch-B, retrieve-main, read-relief, exit. Partial/committed main progress outranks optional practice. H level3 gives only the next unfinished action, not the entire sequence. J records observed bridge principles, orientation/configuration discoveries and full relief clue after reading. Use complete scenario §5 six lines and §7 two lines; do not award Hope or reveal disaster cause. Completion requires both latches, lamp in hand and relief read, regardless of an old memo flag. Exit remains inspectable before completion with specific missing-action feedback.

Returning early for the lamp is valid after latch A. If the unfinished main path has no lamp on its source, HUD/H first guide retrieval from the practice source or placement from the hand; routing instructions resume only after the main source is restored. Journal wording preserves the relief's uncertainty: water flows in the picture, while what happened later remains unknown.

## Safety and persistence

Reuse v1 flags `l3-latch-a/b`, `l3-memo`, `l3-lantern-placed/retrieved`, counters g1/g2/g3 and existing progress, leaving unrelated flags alone. Add a source identity `l3-lamp-source` (practice/main) and narrowly named tutorial/discovery facts. Old placed-and-not-retrieved maps to main source; preserve lanternOn across `placeLanternAt` and `retrieveLantern` (these currently force on). Both latches are irreversible; B latched implies A latched as a valid reached prerequisite. Do not infer latches from stale bridge-powered/crossed flags. Preserve memo but recheck full exit requirements. Old crossing/pending transient flags do not become permanent power.

Before F/retrieve/rotation changes power, derive prospective bridge states and reject/defer a change that removes an occupied unlatched span or strands the player beyond an unlatched span needed to return to the source. Say why and keep the prior state; do not require a queued operation or global LanternSystem redesign. Both bridges need this safety, not just B. Once the player stands on safe near land, the operation can be repeated. Movement never drops or teleports the player into water. If live conditions change during restore, resolve on safe reachable land before enabling input.

Load source/lantern/mirrors/latches, derive actual rays and passable spans, then restore actor. Check body overlap, not just center. Keep safe positions when accessible; old coordinates now in water/props resolve to west source or island checkpoint only if its committed/energized return path actually exists. An unavailable bridge save resolves near-side; completed saves remain on east bank. Inaccessible far-bank stale positions must not unlock a puzzle. Save and Continue preserve lamp-off, current source, mirror poses, each latch and relief; partial and final reloads are acceptance cases. Lumo follows visibly and does not act as an unrelated stationary control in this level.

## Render layers and assets

Add only the required Level04 flower sprites and shared mechanism whitelist to CampaignArt without redefining getLevelArtKey for other levels; use a small dedicated shared-mechanism lookup. Use native PNG aspect ratios. Scenic base can frame the upper distance via display crop/mask; replace its playable-area crosswalk with authored water/banks completely. Floor/bridge depths0..5; mirror/pedestal/latch/relief depth follows ground anchor; beam layer above surfaces and below actors (e.g6). Bridge abutments do not hide a walking actor. Source lamp is on its boulder, not drawn at the actor; normalized source variants retain same anchor and size. No duplicate prop from generic addAction/createProps. All world props carry stable creek IDs for updates and exact prompt bounds. Prompt helper avoids artwork, actor, Lumo and HUD.

Standing obstacles use compact visible base footprints. Water and quay-edge solids align with the exact render boundaries. Decorative grass is passable. Any added tree has a visible solid trunk, consistent foot sorting and no canopy over tutorial/main controls. Relief is readable at128×80 and may offer an enlarged view inside dialogue only if existing UI supports it without a new UI subsystem.

Round-one source review found that restore checks omitted the exit posts while runtime collision included them. A separate root probe also found the full-height post rectangles blocked the proposed relief-to-exit route. The selected correction uses the compact post ground footprints in the table and includes every post in the shared walkability/restore geometry and route fixtures. The passage and steps render below actors, avoiding the earlier staircase occlusion failure.

## Verification before completion

Root and Luna worker run build, existing woods/forest/start/prompt checks and focused `check-shattered-creek.mjs` against runtime-consumed geometry/ray/state helpers. Cover all three reflector mappings, geometric A and B traces, G1 omission regression, unpowered/held/other-source cases, practice independence, every stand and E same-bank range, blocked water/both powered and latched routes, no bypass, props, occupied/far-side power-loss protection, migration idempotence, off-placement restore, stale bridge/memo flags and completion gate. Check initial sole E target, native art dimensions and all state sizes. Keep generated dist out of commits.

If browser control is available, inspect actual feet/occlusion/beam paths and legitimate input progression on a separate origin; do not seed solution flags as playthrough evidence. Browser control was disabled in prior turns; do not bypass it. If still disabled report runtime/visual NOT_RUN. Two independent Luna High reviewers check the same frozen source revision. Root checks user-flow design as well as code and resolves findings before reporting. Human gameplay acceptance remains the user's review. No publication until explicitly requested.
