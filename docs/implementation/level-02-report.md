# Level 02 implementation report

## Scope and decisions

Implemented Whispering Woods at campaign index 1 only. `src/data/whisperingWoodsLayout.ts` owns anchors, collision footprints, stands, movement route, gate geometry, foot/body mapping, safe restore, and rune progress helpers. `CampaignScene` consumes that data for its Level 02 rendering, collision, Pulse, interaction, HUD, story, journal, and restore branches. No raster assets, dependencies, save keys/schema, Level 01 mechanics, or Levels 03–10 were changed. The dialogue speaker union in `src/types/gameTypes.ts` was extended with the two exact memory speakers required by the scenario; this is source-compatible and changes no persisted shape.

Implementation choices:

- Kept the existing v1 keys (`l1-*`, `rune-sequence`) and normalized saves to a valid activated prefix. Explicit `l1-open`, counter 3, or all activated flags recover sequence 3/open/all gold tablets. A contradictory partial save trims to the shorter valid prefix.
- Durable `l1-seen-*` facts feed J only; visuals and E eligibility depend on a live 5-second Pulse or permanent activation. Wrong picks retain discovery, practice, poem, and the live Pulse.
- Used stable `woodsId` tags instead of coordinate lookups for runes, gate layers, poem, memory, firefly, trees, and rocks. Poem and exit targets are distinct.
- Kept the open gate to a single uniform 128×126 canvas fit. The cropped header and side posts use the existing art; only the existing memory vignette is shown temporarily.
- Adopted the revised stand centers practice `(120,282)`, Moon `(180,254)`, Leaf `(320,180)`, Star `(450,254)`, poem `(402,167)` to keep E available at southern solid contact. Prompt labels use `anchor.y - 64`; gate prompt is y=94.
- Intro dialogue contains only the scenario's four opening lines. H escalates from observation to relationships to the full order, with partial progress naming only its next rune. No crystal is granted in this level.

## Verification

- Initial test-first run: expected `FAIL` before the spatial module existed (`ERR_MODULE_NOT_FOUND`); recorded before implementation.
- `node --experimental-strip-types scripts/check-whispering-woods.mjs`: PASS. Covers center/feet/body, stands and reachable routes, target separation, closed/open gate and posts, contact-range prompts, safe restore, legacy/contradictory sequence recovery, repeat/wrong/correct order, and live-reveal versus durable discovery.
- `node --experimental-strip-types scripts/check-forest-edge.mjs`: PASS.
- `node --experimental-strip-types scripts/check-campaign-start-intent.mjs`: PASS.
- `npm run build`: PASS (TypeScript and Vite; 406 modules).
- `git diff --check`: PASS.
- Browser keyboard route, screenshot fixtures, and independent reviews: NOT_RUN by worker; root owns those final gates. No runtime gameplay is claimed here.

## Risks and limitations

- Physics is verified by pure geometry assertions and build, but actual collision feel, sprite layering, prompt presentation, timing, and the complete keyboard playthrough still need root's isolated browser run.
- The scene's existing `memory_vignette` art is used as delivered; the warm overlay is transient. No art approval is asserted.
- The game has no package-script wrapper for the no-dependency assertions; they are run directly with Node's strip-types flag.

## Revision

Local implementation commit: pending checkpoint creation. Final revision and root browser/review evidence are recorded by the root task after freezing this source.
