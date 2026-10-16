# Level 03 — Library Beneath the Roots

Source of truth: `docs/scenario/03-library-beneath-the-roots.md`. User authorized rebuilding this level next; Level 02 belongs to another thread. Base main `7997c43`. Keep existing PNGs, Vietnamese dialogue, English filenames and v1 save keys. This is a single 640×360 CampaignScene room.

## Intended experience

Enter from the southwest and find a book on a low desk. Viewing it with E under each lamp state teaches two layers of ink without changing the main puzzle. Four identifiable tablets nearby can be inspected and selected with E at any time; observing both layers is useful, never a prerequisite to experimenting. Arrange them in the four equal seats around the well, starting at the neutral horizon mark and following the clockwise links. E at the central confirmation point explicitly checks the order. Wrong attempts preserve all pieces. Correct order opens the well; E collects Memory. Only collection opens the opaque mural screen. Read the complete fifth-mural conversation, then E at the distinct southeast/east exit continues to Level 04.

## Coordinates and player route

All art positions below are image centers unless stated; stand points are centered Nhinh positions. Native Nhinh is 36×42; feet are center+19px. Use the Level 01 14×6 foot body (offset 11,37), fractional `10 + feetY / 10` depth, and update shadows/depth while dialogue locks movement. Floor foot bounds are x=24..616,y=80..310. Top HUD ends before y=70, status begins y=320.

| Element | Art / geometry | E stand and role |
| --- | --- | --- |
| Entry | Spawn `(180,288)`; open southwest aisle | Approach desk via its east/south side; never spawn inside the well |
| Test desk | Native 80×54 at `(66,246)`; book 56×40 at `(66,235)`; desk foot solid approximately `[28,260,76,14]` | `(66,278)`, radius 22; E records currently visible bright/dark book layer |
| Four source racks | Native 48×48 at `(132,126),(180,126),(132,236),(180,236)`; shuffled identities Thuyền, Chim, Hạt, Lá | Below each, center y+46, radius 22; shallow standing tablet bases at each bottom, about 32×8. The lower row leaves a clear visual gap below upper-row approaches and to the desk. When a tablet moves, a neutral socket-empty backing appears on its source stand; it is hidden while the tablet is present |
| Central well | Native 220×220 at `(320,188)`, bounds `[210,78,220,220]`; seat centers derive from native local coordinates | North `(320,112)`, east `(396,188)`, south `(320,264)`, west `(244,188)`; clockwise N/E/S/W is solution index 0/1/2/3 |
| Seat approaches | Stony outer ring and seats are walkable ground; inner well is always solid | N `(320,112)`, E `(420,184)`, S `(320,282)`, W `(220,184)`, radius 22. Validate exact foot-body access and distinct nearest-target zones |
| Well core | Visible inner circle centered `(320,188)`, radius about 46. Prefer matching circular static collision and pure circle/body geometry; a narrow consistent footprint may be used if documented | Confirmation/reward stand `(320,224)`, radius 22, south of the inner core. The E point is the reachable rim approach, not the inaccessible image center |
| Bookshelves | Existing root bookshelf at left `(50,150)` and northeast `(598,120)`, display 80×80, native aspect preserved | Bottom root/base footprints only (about 56×14); walking behind upper shelves occludes Nhinh, stepping through their bases is blocked. Keep the desk and tablet approaches clear |
| Fifth mural screen | Existing closed/open panel at `(500,144)`, uniform scale .75 (87×111); open PNG already contains mural | Front stand `(500,226)`, radius 22; shallow base solid around y=188..200. Closed PNG is fully opaque and stays closed until Memory is collected; no separate visible mural/caption before that |
| Eastern exit | Existing stone open/locked arch near bottom-right, anchor `(566,312)`, display 110×113 from a uniform 152×156 source frame. Front header and post crops match the existing forest-gate split. | `(566,286)`, radius 22; always offers useful locked feedback, opens after crystal AND mural-read. Permanent post strips are 37px each, leaving a 36px visible opening; conditional threshold begins at y=309. E transitions; stepping nearby does not |

Route: entry → desk → lower/upper source racks → around the well to N/E/S/W seats → south confirmation rim → reward at same rim → mural front → eastern exit. Reach the north seat via the clear strip north of the inner core, and other seats around its sides; never require crossing the core. The southwest desk is skirted on its east side. The east exit lane does not pass through the mural's base.

These are the final authored coordinates after checking actor-image clearance around the west desk and between both rack rows. The eastern wall spans the playable height and the static exit-post rectangles use the actual visible side crops; the floor, exit threshold, restore helper and Arcade bodies share these bounds. Rendering, physics, prompts and restore use the final shared spatial exports, not copies of this table. No invisible full-room blocker without corresponding visible architecture.

## Layering and art contract

- Compose the floor with existing stone tiles and restrained root/edge details. Do not display preview/contact-sheet captions or procedural placeholder grids.
- The well art already contains the neutral horizon mark and clockwise arrows; do not draw duplicate markers over the north seat. Socket state and tablet stacks remain separate ground overlays below feet. Its inner hole/cover blocks movement in both states. Do not use a solid rectangle around the entire 220px ring.
- Tablet image components share a 48×48 center. Rack stacks sort by their base; socket images and seated stacks use a fixed ground depth below Nhinh. Draw body + identity border + exactly one current light-state clue, or use the existing equivalent composites. Chim/Thuyền share the same bright horizon; Lá/Hạt share the same dark apex. Never show both clues together in the world or label times before solving.
- Move the actual tablet representation from source rack to its occupied socket. Keep empty source stands neutral; do not create duplicate physical tablets. Occupied seats remain inspectable/selectable, so a placed piece can be moved, swapped or read in the other light state.
- Desk/book, shelves, panel and exit posts sort by their visible base. A separate book on the desktop stays over the desk while the actor behind it is occluded. Gate stairs must not cover Nhinh; reuse cached layer splitting rather than globally raising actor depth.
- Prompt bounds refer to actual control/tablet/book/mural art, not the whole ground well. Reuse shared measured prompt placement; protect other critical Library sprites through the existing protected-bounds input where needed. No prompt hides the page, tablet clues, Nhinh or Lumo.
- The open panel already contains the mural. Avoid drawing a second mural on top. Ensure it is readable during inspection or in the notebook; native/nearest enlargement is allowed without modifying the PNG.

## Puzzle and dialogue

Preserve `l2-{bird|leaf|boat|seed}-{lit|dark}`, `memory-slots-json`, `memory-slots`, `l2-memory`, `l2-crystal`, `l2-fifth-viewed` and `intro-2`. Add only focused book/inscription/story-beat flags if needed. Selected identity may remain ephemeral; arrangements and observations persist.

- Include the scenario's full opening and well inscription; provide a repeatable way to read the inscription without competing with confirmation. A short intro conversation may include the inscription, with J retaining it afterward.
- Book E saves the current layer. The first complete two-layer observation triggers the exact safe-practice exchange once. It does not auto-complete, gate, or assign any main tablet.
- Tablet E always records/re-reads its current clue and selects it, including before both layers have been observed. Inspecting an occupied seat works the same when nothing is selected. E with a selected piece at a seat places/swaps it; an overwritten unplaced piece returns to its source rack. Keep one occurrence per identity, unlimited retries, no automatic checking.
- Correct order is `[bird,leaf,boat,seed]` clockwise N/E/S/W. Before E confirmation, a correct arrangement alone does nothing. Wrong E keeps arrangement and clues intact. Correct E latches solved state, opens the center cover and shows an independent crystal overlay until collected.
- Collection uses the full scenario conversation including Lumo's plan to revive the forest; then opens the screen. Fifth-mural first reading uses all scenario lines, including Lumo's silence and uncertainty. Repeat reads use the specified Nhinh line. Do not infer the Guardian's motive or Lumo's identity.
- H follows practice/arrangement/reward/mural/exit state and the scenario's three escalating hints. J stores only observed layers until solved; only then may it associate four time labels with identities. Also retain the inscription, crystal plan and fifth-mural note after their actual story beats.
- Objective/status show current task, selection/occupied count and observed progress without long text over props. Keep controls visible and status/help non-overlapping. No time label or answer-coded socket before solve, apart from the explicitly requested third-tier H hint.

## Save, collision and compatibility

Load and sanitize old four-slot JSON as four unique valid IDs/empty values. Keep durable old solved/reward flags; do not replay already completed first-time dialogue or erase prior progress. Recover old coordinates in a shelf, desk, panel, core or locked exit to a reachable named checkpoint on the playable side. Do not reset the campaign or advance to 04 while restoring. Save lamp state, observed layers and arrangement normally. The exit requires both crystal and mural flags; a stray mural flag alone must not unlock it.

Named checkpoints include entry, desk approach, south rim, mural front and exit approach. Geometry helper and actual Arcade bodies agree on foot offset, circle/rect boundaries and conditional passage state. Keep Level 01 and Level 02 behavior unchanged; Level 04 onward remains outside this slice.

## Acceptance and verification

Read the script against scenario and this layout. Build and static review are allowed; do not add or run tests unless the user asks for verification. Preserve prior checks without invoking them as part of an unsolicited suite. Root may visually inspect the implementation to ensure the requested appearance is present. Full human puzzle playthrough remains user review.

Required inspection focus: reachable controls on the intended side, all object bases solid, central ring walkable/core blocked, correctly sorted actors in front/behind shelves, bright/dark clues and source/seat moves consistent, no duplicate tablet or story reveal, locked/open exit accessible without overlap, and compatibility handling explicit. Report verification honestly as PASS/FAIL/NOT_RUN on the frozen source revision.
