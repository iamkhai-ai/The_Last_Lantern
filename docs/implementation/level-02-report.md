# Level 02 implementation report

## Scope

Implemented Whispering Woods at campaign index 1 only. The Level 02 data module owns the authored anchors, stands, footprints, gate geometry, movement routes, body mapping, safe restore, and rune-state helpers. `CampaignScene` consumes it for presentation, collision, timed Pulse reveals, interactions, journal and hint text, story dialogue, and progression. `DialogueLine.speaker` includes the two memory-scene speakers required by the authored story.

No raster assets, dependencies, persisted save keys or schema, Level 01 mechanics, or Levels 03–10 behavior were changed. Level 02 remains distinct from Library index 2.

## Decisions and corrections

- Kept existing `l1-*` flags and `rune-sequence`; saves normalize to the valid activated prefix. Explicit `l1-open`, sequence 3, or all three activation flags restores an open gate and three active runes. Contradictory partial flags trim conservatively.
- Durable `l1-seen-*` facts are journal knowledge only. A sleeping glyph appears and accepts E only during the five-second Pulse reveal; activated glyphs remain available after the reveal expires.
- Used stable object IDs for world geometry and separate poem and exit targets. Stand centers follow the authored revision: practice `(120,282)`, Moon `(180,254)`, Leaf `(320,180)`, Star `(450,254)`, poem `(402,167)`. Prompt labels use `anchor.y - 64`; gate prompt uses y=94.
- Gate collision uses backing `[446,96,128,60]`, posts `[456,156,20,34]` and `[544,156,20,34]`, and threshold `[476,156,68,22]`. Backing and posts stay solid for both gate states; only the threshold toggles. Strict physical overlap permits safe contact at center y=162 while closed and y=140 while open. Restore separately moves a stale closed-gate save from behind the threshold to the near side.
- The root's first real keyboard pass at commit `f984e24` completed the puzzle, memory, poem, Library transition, and Continue path with an empty console. Its geometry diagnostic caught the gate backing disabled at runtime. This correction keeps that finding distinct from the successful interaction route.
- Replaced the temporary flat path bands with an irregular mask over the existing `ground_dirt` texture. The mask geometry is hidden after it is applied, and Level 02 controls use the existing bottom-aligned y=358 row so they do not overlap status text.
- Practice response matches the authored line exactly: “Xung sáng làm hiện ký hiệu. Chạm vào thì nó trả lời.” The open-gate image remains uniformly fitted; the existing memory vignette is reused temporarily.

## Verification

- Test-first contract initially failed before the new spatial module existed (`ERR_MODULE_NOT_FOUND`), as expected.
- `node --experimental-strip-types scripts/check-whispering-woods.mjs`: PASS after the gate correction. Covers actor body/feet mapping, stand reachability, contacts, closed/open gate overlap, closed-contact restore, behind-gate restore, save normalization, rune order/repeat/reset, and reveal versus durable discovery.
- `node --experimental-strip-types scripts/check-forest-edge.mjs`: PASS.
- `node --experimental-strip-types scripts/check-campaign-start-intent.mjs`: PASS.
- `npm run build`: PASS (TypeScript and Vite; 406 modules). Generated `dist/index.html` was restored after build.
- `git diff --check`: PASS.
- Portable browser fixtures are checked in as `scripts/level02-browser.cjs` and `scripts/level02-geometry.cjs`. They accept `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `LEVEL02_BASE_URL`, and `LEVEL02_ARTIFACT_DIR`; default artifacts go to the system temporary directory. Worker did not run a browser/server. Root owns final browser verification and independent reviews for the frozen correction revision.
- The geometry fixture scopes the behind/in-front canopy pixel check to `tree-5`, so unrelated overlapping canopies cannot produce a false layering failure. Gate stair samples still inspect every world prop. The pure contract also explores the closed map on a 2-pixel grid and rejects any reachable center in the gate interior above the y=162 contact line.

## Limitations

The author's results above are distinct from root verification. Root repeated the real keyboard route and geometry/restore fixtures after corrections, and obtained two independent final reviews. Results and limitations are recorded in [level-02-verification.md](level-02-verification.md). Human acceptance remains NOT_RUN.

## Revision

Correction source revision: `2a6907d6ecbd2c172ad562fe167bac91617e04ce`. Final test revision: `c76ff7713449c73422169efa25970c9e9b12638b`; product source is identical. Root evidence is bound to those revisions in the verification document.
