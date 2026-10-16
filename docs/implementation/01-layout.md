# Level 01 — Forgotten Forest Edge: spatial layout

Source: `docs/scenario/01-forgotten-forest-edge.md`. Current slice only; Levels 02–10 are deferred.

## Player route

Spawn at `(280,286)` in the southern clearing. The old lantern is visibly beside the tablet, to the left of the first path. Approach it at `(224,251)` and press E. Lumo emerges here: the first meeting must happen near the lantern, not speak from across the room during the opening. Press F to light the lantern, then approach the tablet at `(300,238)` and E to read revealed writing. Only now teach SPACE. A Pulse uncovers footprints leading northeast to a ring. Walk to `(410,191)` (feet at `(410,210)`), keep the lamp lit, watch the eye fill, and see the gate latch open. Walk northeast to `(486,151)` and E to enter Level 02. The route never requires walking through the tablet or a tree.

```text
NORTH — tree/wall boundary; no walkable space behind the exit

                                     gate (486,166)
                                 eye on right post
                         ring (410,210)  ↗
                               ↑
                     footprint trail
            tablet (300,230) ↗
     lamp (224,238)

                 spawn (280,286)
SOUTH — status/help safe margin
```

## Object positions and footprints

Positions are ground anchors unless a row says otherwise. Rectangles are `[left, top, width, height]` in world pixels. The player's centered sprite has feet about 19px below its center; interaction points in this table are player-center positions.

| Object | Art / anchor | Interaction / behavior | Solid footprint and layering |
| --- | --- | --- | --- |
| Player | Existing 36×42 Nhinh frames, centered sprite | Spawn `(280,286)` | Foot hitbox aligned to current frame baseline; depth by feet, including while talking |
| Lantern | `pickup-lantern`, 20×28, bottom center `(224,238)` | `(224,251)`, radius 24; pickup then inspect inscription on later E | Pickup itself is passable; ground support/shadow only; remove pickup art on acquisition, no giant ring standing in for pedestal |
| Tablet | hidden/lit beacon 48×60, bottom center `(300,230)` | `(300,238)`, radius 24; show unlit feedback until lamp lit; read/re-read exact scenario text | `[286,218,28,12]`; standing art by base y=230, so player behind is hidden and player in front is visible |
| Standing ring | `stone-standing-ring`, 58×30, bottom center `(410,225)`; visual floor center `(410,210)` | No E; player feet within 16px of center and lit lamp starts charging | Walkable, depth 3; ring remains dimly discoverable after Pulse, never draws over feet |
| Footprints | Existing pulse footprint stamps, along ground centers `(330,245),(351,234),(372,224),(392,216)` | Reveal on a valid post-tablet Pulse in range of trail; save discovery, do not require the final ring to be inside the initial Pulse | Walkable depth 3; reveal/persist notes, no collision |
| Gate | existing closed arch native scale 1, bottom center `(486,166)`; open passage cutout from existing L02 asset | Stand `(486,151)`, radius 24; closed gate E explains eye/ring without solving; open gate E advances | Posts `[422,126,25,42]` and `[525,126,25,42]` always solid; central barrier `[447,126,78,18]` only while locked. No collision across open passage. Header may cover actor behind, but actor remains visible on steps/in front |
| Sun eye | dormant/receiving/full 32×32, bottom center `(538,122)` on right post | No separate E; receiving fills for 900ms uninterrupted valid ring+lamp condition, then permanently latches | Wall mounted, no extra collider beyond post; visual beam points from ring/player lamp to eye, with receiving/full feedback |

Gate art height differs between closed/open sources. Keep bottom anchor `(486,166)` fixed, preserve each image's native aspect ratio, and use IDs rather than coordinate searching for state swaps. The post coordinates may be tightened to the opaque post feet after screenshot inspection; the 78px passage stays usable. The gate opens toward the north; tree/rock boundary behind it prevents bypass before unlock. Exit interaction is on the SOUTH approach of the barrier; do not require clipping through a closed door to read its prompt.

Implementation detail: use the permanent back-of-arch footprint `[422,96,128,30]`, joined to the north floor boundary and post tops. It closes the side route behind the passage while leaving the empty northern forest strip walkable. Keep the doorway threshold `[447,126,78,18]` conditional on the gate state; the south-side contact point `(486,128)` and E stand `(486,151)` remain reachable while closed. The backing still stops northward travel after opening, while the passage permits movement up to `(486,110)`.

## Trees, rocks and clear floor

Use existing `tree_woods` / `tree_alt`, bottom center, native scale 1. Place trees at ground anchors `(48,142),(112,102),(212,108),(358,108),(595,138),(46,230),(592,236),(76,313),(567,313)`. Footprints are 18×14 centered at `(anchor.x,anchor.y-7)`; roots block walking, foliage may be walked behind. Border shrub masses are ground decoration plus visible edge boundaries where appropriate. Do not scatter random blocking props into the teaching clearing or trail.

Two rocks, existing `rock_blocker` at bases `(122,204)` and `(531,279)`, use compact visible-base footprints (at most 26×14), never invisible oversized boxes. Keep the central clearing x=170..430, y=228..310 unobstructed except the tablet base, and the northeast path x=390..510 between ring and gate unobstructed except gate posts. Grass, mushrooms, flowers, footprints and stepping stones remain passable and below feet. No foreground canopy covers the lantern, tablet writing, ring center or gate prompt.

Authored dirt path joins spawn→lantern/tablet area→ring→gate, at least 48px clear. Use small stone/grass transition stamps or soft irregular edges from existing art; no debug grid, neon rectangles, or decorative stepping stones floating far from the path. Actual world bounds and visible vegetation keep the character out of the HUD regions.

## Tutorial and story states

1. **Wake:** opening has only Nhinh's two lines; Lumo is hidden until nearby meeting. Hint directs to lantern/tablet. F/SPACE do not expose later controls.
2. **Meeting:** approaching within 65px of lantern after opening triggers the scenario's Lumo introduction once. Save the beat; do not replay on reload. Nearby E receives lamp and reads inscription. Lumo then follows on reachable floor/air nearby.
3. **Lighting:** F unlocks after lamp pickup. Tablet shows faint unreadable marks while off; E gives actionable feedback without setting `l0-tablet-read`. With lamp on, E reads full inscription, saves tutorial progress and teaches SPACE.
4. **Discovery:** only a valid Pulse after reading tablet records footprints. An early Pulse must not permanently complete this stage or open the gate. Ring discovery/footprints are recorded in J and remain understandable when the effect ends.
5. **Receiver:** entering ring feet radius 16 with lamp on charges the eye over 900ms. Leaving/toggling off resets unfinished charge. When full, set existing `l0-gate-open` permanently, open visual and collider together, play exact scenario open dialogue once. Turning off afterward keeps gate open.
6. **Exit:** E at the opened passage runs the scenario's ending dialogue, then progresses to Level 02. No automatic advancement on entering ring/opening gate.

Keep existing durable keys (`lanternPickedUp`, `l0-tablet-read`, `l0-footprints-found`, `l0-gate-open`) and introduce only necessary one-time meeting/checkpoint flags. Old saves with lamp already picked up imply meeting complete; do not hide Lumo or replay the introduction. Old saves with open gate retain it even if earlier tutorial flags are missing. New saves cannot skip tutorial stages. Hint/HUD progresses by current step; repeated H escalates within that step and resets when progress changes. J repeats discovered facts and lamp inscription, without future-level spoilers.

## Save restoration

Store current player center as existing counters. Resolve against actual inflated footprints after rebuilding. If blocked or outside floor, find a nearby reachable floor point on the spawn side of the closed gate; never put the player beyond the locked threshold. Named fallback checkpoints: start `(280,286)`, tablet clearing `(300,250)`, discovered ring `(410,191)`, open gate approach `(486,174)`. Save during charging restores at a safe ring approach with charge reset; completed gate stays open. Loading does not automatically pick up lamp/read tablet or remove trees.

## Verification cases

- Fresh start through pickup, lit reading, post-reading Pulse, uninterrupted receiver charge, open passage and transition to 02.
- Early F/SPACE or unlit E never completes later tutorial steps.
- Walk against every trunk, tablet base, rock, post and closed passage; pass behind foliage and in front of trunk; open passage remains wide enough.
- Stand at correct ring with lamp off: eye dormant, readable hint. Leave before charge completes: eye resets; open gate then turn off and leave: gate remains open.
- Reload before pickup, after reading, after footprints, while charging, after open gate and from a stale coordinate inside a solid/behind closed threshold. Preserve progress and reachable spawn.
- Read tablet and lamp again without repeating meeting; J/H show only current discovered information. Exit E never competes with tablet/lantern actions.
- Build and focused geometry/state checks. Browser screenshots for opening clearing, behind/in-front tree, ring receiving and gate open. User will review full gameplay.
