# Level 03 implementation report

## Scope and decisions

Implemented the Library Beneath the Roots in the existing CampaignScene as a level-local `LibraryLevel` controller with shared `libraryLayout` geometry. The work is limited to level index 2, its art allowlist, and its scene dispatch. Level 02 and other level mechanics remain on their existing paths.

- The room uses a 640×360 stone floor with a 14×6 actor foot body at offset `(11,37)` and feet at center+19. The pure restore resolver and Arcade bodies share the same floor, object bases, core circle, and conditional exit threshold.
- The desk moved west to `(66,246)` and the lower source rack row moved to y=236. Rack stands use y+46; this leaves the upper stand clear of the lower rack art and keeps the desk, rack sprites, and actor art from touching.
- The native well art already includes the neutral horizon mark and clockwise arrows, so the room does not add duplicate mark/arrow sprites over the north socket.
- The eastern wall spans the full floor height. The arch underlay and front crops all use the same normalized 152×156 runtime canvas. At 110px display width, the 50px side crops produce 37px collision strips and a 36px opening. The threshold begins at y=309; it opens only after both crystal and mural flags are set.
- Existing level art is loaded by explicit Level03 filename entries. The four tablets move between source racks and sockets as single identity stacks. Rack pieces sort at their base; sockets and seated stacks stay at the fixed ground depth below Nhinh. Each stack displays one current lantern layer, and its border filename maps to the matching Vietnamese identity.
- Saved slot JSON is sanitized to four unique IDs or empty slots, preserving other earned flags. Unsafe saved locations resolve to named reachable room checkpoints without changing level progress.
- The book, all rack tablets, and occupied sockets are readable/selectable with either lantern state. Observation is recorded but never required to experiment or arrange pieces. Swapping preserves all identities; only explicit E confirmation solves the ring. Crystal, mural, and east exit actions follow the scenario sequence.
- The opening includes the inscription, which also has a repeatable E interaction. J records only observed clue layers and uses separate short dialogue entries. H advances by current objective, including a third-tier arrangement hint that remains available before all clues are observed.
- The seed/leaf comparison dialogue appears only after both seed layers and both leaf layers are recorded, so it does not name information hidden by an unobserved layer.
- Lumo starts near Nhinh and follows nearby only in Level03. HUD objective and status use the Level03 controller state. Prompt protection covers the player, Lumo, tablet stacks, desk/book, shelves, mural, and exit posts while excluding the full 220px ground well.
- Controller teardown is idempotent and checks active Phaser objects before destroying them, so scene restart and transition do not depend on physics objects surviving shutdown.

## Verification

- Production build (`npm run build`): `PASS` (TypeScript check and Vite production bundle).
- `git diff --check`: `PASS` (only Git's LF-to-CRLF advisory for edited Markdown and TypeScript files).
- Automated tests: `NOT_RUN` per task instructions. Browser preview: `NOT_RUN` because local browser use is disabled by the Work settings on this runner. Human puzzle playthrough remains pending.

## Known limits

The exit requires E from the authored approach; stepping into the arch does not transition. This revision has not been played through in a browser. Root's two source reviews found no actionable findings on the previous revision; the bounded depth, arch-underlay alignment, and clue-gating corrections still require review.
