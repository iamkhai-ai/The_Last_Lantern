# Level 01 root verification

Date: 2026-10-16. Branch: `codex/campaign-layout-rebuild`.

Frozen reviewed revision: `6c3b4cd348794abd44c11c7e78636ce8d94b3961` (product changes through `af1dc43`). Baseline: `16e01e4`. Any later closure commit changes evidence/progress documents only; product code, scenario and layout remain the reviewed content.

## Commands and outcome

| Check | Outcome | Evidence / scope |
| --- | --- | --- |
| `npm run build` | PASS | Root run on frozen revision; TypeScript and Vite, 404 modules, single HTML bundle. |
| `node --experimental-strip-types scripts/check-forest-edge.mjs` | PASS | Root run on frozen revision; geometry, safe checkpoints, exact depth, 14×6 feet, gate contact/backing, teaching gate and receiver conditions. |
| `git diff --check` | PASS | Root run on frozen revision. |
| Browser keyboard flow | PASS | Root run on frozen revision, dedicated Chromium context and static preview on `http://127.0.0.1:5182/`; no flags or positions injected. Exact discovery dialogue checked, repeat Pulse does not replay it; all steps reach Level 02; zero browser console errors. |
| Browser geometry fixtures | PASS | Three invalid-location saves recover safely; actual tree collision/front-versus-behind depth; runtime foot center matches art baseline; transparent open arch. |
| Browser arch side approach | PASS | Closed side approach stops at `(557,90)`; opened passage reaches `(486,110)` and backing stops further travel. |
| Independent review A | PASS | Luna high, full review at `8f3a8a9`, two scoped re-reviews through frozen `6c3b4cd`; all findings addressed, no open actionable findings. |
| Independent review B | PASS | Separate Luna high context, same frozen revisions; all corrections reviewed, no open actionable findings. |
| Human visual/gameplay acceptance | NOT_RUN | User review follows this implementation slice. Levels 02–10 and the ending are outside this slice. |

Both reviewers were instructed read-only; this is an instruction boundary, not a runtime sandbox. Requested model/effort was `gpt-6-luna` / `high`, accepted by native dispatch. The tool did not separately expose resolved model/effort metadata.

## Browser evidence and reproducibility

Evidence folder: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/`.

- `level01-browser-check.cjs` and `level01-browser-results.json`: fresh game, no-lantern input, nearby Lumo meeting, pickup, unlit tablet rejection, no early Pulse cooldown, lit reading, discovery dialogue once, repeat Pulse, closed gate collision without teleport, continuous-light receiver, latched gate after switch-off, reload, explicit E exit to Level 02, console errors.
- `level01-geometry-browser.cjs` and `level01-geometry-browser-results.json`: isolated save fixtures and tree collision/depth screenshots. Fixtures affect only new test browser contexts; they are not playthrough evidence.
- `level01-backing-browser-results.json`: the dedicated side-route/backing check.
- Screenshots: `level01-opening.png`, `level01-trail.png`, `level01-ring-off.png`, `level01-gate-open.png`, `level01-tree-front.png`, `level01-tree-behind.png`, `level01-open-passage.png`.
- Review diff packages: `level01-review-round1.diff`, `level01-review-round2.diff`, `level01-review-round3.diff`.

Geometry/arch browser runs were on `0076027`. They remain applicable to the final revision: root checked `git diff --exit-code 0076027 6c3b4cd -- src/data/forestEdgeLayout.ts src/actors/Player.ts src/systems/InteractionSystem.ts scripts/check-forest-edge.mjs` (exit 0), and the only remaining product diff is six lines in the Pulse callback adding first-discovery dialogue. The final fresh keyboard run covers that changed callback and the complete exit path. No geometry/restore/rendering code changed after the geometry fixtures.

Earlier draft failures are not final failures: one keyboard run was interrupted by Vite HMR, one fixture page loaded while the bundle was being replaced, and an initial tree navigation script relied on fixed key durations. Root switched to a frozen static bundle and position-based navigation; final outcome is recorded above. Browser automation uses the bundled Playwright and installed Chromium; no product dependency was added.

## Resolved findings and decisions

1. Early Pulse previously spent cooldown before tablet teaching. It is now blocked before `triggerPulse`, while SPACE still advances dialogue.
2. A full-width dynamic north collision band implied an invisible wall over open grass. It was replaced with a permanent `[422,96,128,30]` backing inside the visible arch and the original conditional doorway threshold. Cost if placement is wrong: arch collision might obstruct the intended approach; pure tests and browser approach/exit checks cover this.
3. The first footprint discovery omitted the scenario's three friendship lines. It now plays the exact lines once on the durable discovery transition.
4. Level 01 actor depth follows exact feet position; no ten-pixel depth buckets. Cost if incorrect: actor/prop ordering changes near bases; front/behind runtime screenshots and depth readings verify it.
5. Keep doorway threshold `[447,126,78,18]` within the gate. Cost if incorrect: entry could block too early or permit clipping; closed contact, open passage and E exit were checked.

The scope is ready for the user's Level 01 review. No later level is marked complete by this document.

The temporary test servers were stopped after verification; ports 5181 and 5182 have no listeners. Generated `dist/index.html` was restored to the branch's tracked version after checking the build; the implementation commits contain source and documentation.
