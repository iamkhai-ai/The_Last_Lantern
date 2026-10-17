# Level 03 verification record

The original implementation evidence below is historical. The later user-requested four-direction collision correction is recorded in the final section and supersedes the earlier shallow prop footprints.

## Revision and scope

- Branch: `codex/level-03-spatial-rebuild`.
- Base: `7997c43b2264d01204e35410c1f8ac44b9aa71ea`.
- Final source checked: `f1d070d9a8650c08096ada2fe683402d49e3fa8b`.
- Requirements: the Level 03 scenario, `03-layout.md`, and `03-plan.md`.
- Implementation: a dedicated LibraryLevel controller, shared spatial data, existing art registration and narrow CampaignScene integration. Level 02 gameplay and its separate worktree were outside scope. No PNGs, character frames or dependencies were changed.

## Actual outcomes

| Check | Result | Evidence and limits |
| --- | --- | --- |
| Root production build | PASS | `npm run build` exited 0 on the final source revision: TypeScript and Vite, 425 modules, 9,037.11 kB bundle. The generated tracked dist file was restored after inspection; the commit contains source and documentation. |
| Root diff whitespace check | PASS | `git diff 7997c43..f1d070d --check` exited 0. |
| Reviewer A | PASS, bounded static review | Separate Luna high task reviewed the exact final revision against the scenario/layout and prior deltas; no actionable findings. The reviewer corrected an initially inverted description of the empty-rack truth table; the final interpretation matches the code. No commands or browser verification were run by this reviewer. |
| Reviewer B | PASS, bounded static review | Separate Luna high task reviewed the same final revision independently; no actionable findings. No commands or browser verification were run by this reviewer. |
| Browser visual inspection | NOT_RUN | The CUA tool returned `Local browser use is disabled in Work settings`. A temporary fixture/server on port 5193 was stopped and removed without opening a browser or accessing the user's port-5173 storage. |
| Automated tests | NOT_RUN | No tests were added or run, as required by the active task instructions. |
| Full puzzle playthrough and human acceptance | NOT_RUN | Pending player review. No injected fixture state is claimed as completion evidence. |

Both reviewers used the same model family, so correlated blind spots remain possible. Read-only was an instruction to the reviewers, not a claim of a runtime sandbox. Source review and build results do not establish runtime appearance or authorize a merge.

## Review and correction history

The first two static reviews on `83e527d` reported no actionable findings. Root separately identified seated tablets sorting above Nhinh, a comparison line revealing an unobserved leaf clue, and duplicate markers already baked into the well image. These were corrected in `65cb59c` and independently re-reviewed.

The arch underlay was also changed to share the same normalized canvas as its foreground crops. The initial suspected size mismatch came from stale manifest metadata; reading the PNGs confirmed both are actually 152×156. This change makes the render paths consistent; the suspected mismatch was not an established bug.

Root then identified that moving a source tablet left a collider without visible stand art. `f1d070d` adds a neutral backing visible exactly when the identity is in a well seat. Both reviewers re-reviewed that final revision, including source/seat swapping, restoration, depth and prompt bounds, without actionable findings. Current-round reviewer results were kept separate until both completed.

The final documentation commit changes evidence records only; it does not alter the reviewed source or requirements. The branch is local. No push or merge was performed.

## Four-direction prop collision correction

Source revision: `aab0e662442608bb15d9395f37894fec1c5577ea`, relative to `7a685f59aebb0a4c212f440d49f105b29b452a9f`.

The player reported inadequate object collision during their Level03 review. Inspection found that Arcade already enables collision on all four sides by default, but desk, shelf, source-rack and mural blockers covered only narrow bottom strips. The correction replaces these strips with full inset object footprints in `LIBRARY_SOLID_RECTS`. The Arcade bodies and saved-position resolver consume that same list. The walkable well ring and seats, blocked core, gate posts and threshold are preserved. Exact bounds are recorded in `03-layout.md`.

- Root `npm run build`: **PASS**, exit 0; TypeScript and Vite, 425 modules, 9,037.11 kB bundle. Generated `dist/index.html` was restored afterward.
- Root `git diff 7a685f5..aab0e66 --check`: **PASS**, exit 0.
- Independent Luna high reviewer A: **PASS**, bounded source review on the exact source revision; no actionable findings. Examined footprints, shared restore geometry, foot body and interaction reachability.
- Independent Luna high reviewer B: **PASS**, bounded source review on the same exact revision; no actionable findings. Examined static bodies, footprints, restore and routes to controls. Findings were kept separate until both completed. Both reviewers share a model family.
- Runtime collision inspection: **NOT_RUN**. The local browser tool again returned `Local browser use is disabled in Work settings`. These source/build results are not a claim that four-direction movement was exercised in a browser.
- Automated tests: **NOT_RUN**; none were added or run.

The existing player-review server remains running on port 5193 with the untracked `.level03-play.html` fixture preserved. Root did not access or replace browser storage. A reload loads the corrected source and recovers any saved location now inside an expanded blocker through the existing resolver. No changes were pushed or merged. The accompanying evidence-only documentation commit leaves the reviewed source and layout requirements unchanged.
