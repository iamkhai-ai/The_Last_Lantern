# Level 02 final verification

Date: 2026-10-17 (Asia/Saigon). Task scope: rebuild Whispering Woods only, internal campaign index 1. Another chat owns Level 01. Local branch: `codex/level-02-spatial-rebuild`; worktree: `C:/Users/Admin/.codex/worktrees/level-02-spatial-rebuild/the-last-lantern`.

## Checked revision

Final checked revision: `c76ff7713449c73422169efa25970c9e9b12638b`. Product source revision: `2a6907d6ecbd2c172ad562fe167bac91617e04ce`. Root verified `git diff --exit-code 2a6907d HEAD -- src assets package.json package-lock.json` exits 0: the final delta changes tests and reporting only. Production build was run on `2a6907d`; final browser runners and pure checks were run at `c76ff771` against that identical product build. Later closure edits are documentation only.

Base: `797c594`, including main `f3c23de` and the preceding campaign startup fix. No changes to Level 01 behavior, Levels 03–10 behavior, raster assets, dependencies, or save schema. No push, merge into another branch, or deployment was performed. The primary checkout and the other chat's worktree were not modified.

## Actual results

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | Root execution, TypeScript + Vite, 406 modules, exit 0; product content equivalent to final checked revision |
| `node --experimental-strip-types scripts/check-whispering-woods.mjs` | PASS | Root execution on final revision; exact foot geometry, reachable stands, strict contact, state ordering/repeats/reset/legacy normalization/restore; 2px-grid closed-interior search |
| Existing `check-forest-edge.mjs` and `check-campaign-start-intent.mjs` | PASS | Root executions, exit 0 |
| `git diff --check` | PASS | Root execution, exit 0 |
| `node scripts/level02-browser.cjs 5190` | PASS | 11 actual input-driven gameplay cases plus empty browser console; exit 0 |
| `node scripts/level02-geometry.cjs 5190` | PASS | 27 labeled geometry/restore cases; exit 0 |
| Supplementary reload/firefly diagnostic | PASS | Actual page reload of a partial save from keyboard play, completed save reload, no memory replay, no persistent live reveals, and sampled moving firefly rests in Leaf/Star/Moon loop order |
| Independent review A | PASS | `/root/review_level02_a`, requested native `gpt-6-luna` high; full source/correction review and final test delta review, no actionable findings |
| Independent review B | PASS | `/root/review_level02_b`, same permitted configuration, separate review of the same revisions, no remaining actionable findings |
| Human acceptance | NOT_RUN | User review remains |
| Remote publication | NOT_RUN | Local branch only |

Both reviewers were instructed to be read-only and received current-round findings only after both had finished. This is a review instruction, not an enforced sandbox. Their shared model family can have correlated blind spots; actual root browser checks provided separate evidence. Native dispatch accepted Luna high; backend execution internals were not exposed.

## Gameplay proof

The keyboard runner starts in an isolated browser context with a legitimate Level 02 entry save containing only completed Level 01 flags. It does not inject Level 02 puzzle solutions or reload during puzzle completion. It verifies:

- Full opening dialogue without the solution spoiler.
- Sleeping practice feedback; Pulse revelation; expiry prevents practice activation; J retains discovered knowledge; practice completion leaves the main sequence at zero.
- Separate poem target and full poem retained in J.
- An expired main glyph cannot activate; Moon succeeds after a live Pulse; repeated Moon preserves the prefix.
- Hint level three names only the next rune for partial progress.
- Choosing Star early resets activation while retaining poem, practice and discoveries.
- Moon, Leaf, Star opens the gate and plays the full scenario memory once; solving alone does not leave the level.
- Re-reading an activated rune does not replay memory; poem remains readable after opening.
- E at the distinct gate approach plays the complete ending dialogue and enters Library (index 2); Pause/Main Menu/Continue keeps that progress.

The separate geometry runner uses explicit saved-state fixtures, rather than claiming those are a full playthrough. It verifies seven closed/open stair positions with zero actor pixels obscured by world props; labels stay above the actor; closed gate stops at center y=162 and open gate at y=140; both posts stop lateral motion at x=483/537; stone bases, trunk and rock are solid; E remains available at stone contacts. Tree depth checks compare the same named tree behind/in front. Legacy sequence 3, all-activated and explicit-open saves normalize to an open gold state. Stale solid/locked passage locations restore safely; exact closed contact restores in place.

Root inspected final screenshots for the opening, textured paths, memory, distinct exit prompt and open stairs. Foreground canopies can still obscure an actor standing behind a different tree; that is the authored depth behavior, not a reason to raise the player above all vegetation.

## Correction and review history

1. Initial implementation `f984e24` passed the keyboard puzzle/exit route and both source reviews. Root's separate runtime geometry diagnostic nevertheless found the permanent gate backing disabled. A direct probe reached y=115.25 instead of y=140. Root also identified flat overlapping path bands, a paraphrased practice line and bottom control/status overlap.
2. Correction `2a6907d` enables backing/posts permanently, joins the gate rectangles, uses strict body overlap and a separate restore guard, replaces flat paths with masked existing dirt texture, restores exact practice text and separates the bottom rows.
3. The first corrected tree diagnostic counted another foreground canopy while checking an actor in front of `tree-5`. Test-only `c76ff771` scopes only that tree assertion to its named object, adding an occluder-ID assertion. Gate samples still inspect all world props. Both reviewers checked this correction and found no weakened assertions.
4. Reviewer B initially raised a Medium bypass finding for grass outside the arch. After tracing the actual enclosed passage and locked E condition, the reviewer explicitly withdrew it. Root's 2px search visited 27,237 reachable centers and found no closed interior access. No severity downgrade or waiver was granted; empty grass outside the arch stays walkable as specified.
5. The worker was interrupted by a usage-limit error during corrections. Root preserved partial work and the actual error, then resumed the same Luna high agent after the user's continue request. No fallback model/provider was used. The retry completed and final verification was rerun.

## Decisions made

- Put the gate in the northeast and the poem on its own western stone; Leaf stays upper middle. Reason: remove gate/poem/glyph overlap. Cost if wrong: layout rework following user review.
- Recover legacy completed sequences as permanently open with three gold runes; keep unsolved restores on the near side. Cost if wrong: a contradictory manually edited save may recover as solved; normal play still requires the sequence.
- Join backing, posts and threshold while keeping their lower edges and approach points unchanged. Reason: eliminate collision seams. Cost if wrong: a small upper post area may block visually empty ground; final runtime collision/screenshots were checked.

## Reproduce and artifacts

Run `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 5190 --strictPort`. The browser scripts accept `PLAYWRIGHT_MODULE` (default `playwright`), optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `LEVEL02_BASE_URL`, and `LEVEL02_ARTIFACT_DIR`. No new game dependency was added for Playwright. Root used the bundled Playwright runtime and a dedicated headless Chromium context. Ports 5184/5185 and the user's save were untouched. Root stopped the temporary preview and restored only generated tracked `dist/index.html` after verification.

Local evidence directory: `C:/Users/Admin/.codex/visualizations/2026/10/16/01a14580-4a00-7dc1-8cdc-f370f02cd14c/final/`. Contains `level02-browser-results.json`, `level02-geometry-results.json`, `level02-extra-results.json`, `partial-from-play.json`, and the actual screenshots. The supplementary runner is in the parent directory as `level02-extra.cjs`. Evidence is local, not part of the game bundle.
