# Level 04 implementation report

## Scope and decisions

Rebuilt Shattered Moonlit Creek, campaign index3, on `codex/level-04-spatial-rebuild` from main `044655447e7df228b7ab57d40d0ad516b78e4a54`. Root read the scenario, authored `04-layout.md` and the implementation plan, inspected native mechanism assets and checked the proposed walking routes before dispatching implementation to Luna High. A separate Luna High design audit found no hard geometric contradiction.

The west bank begins with an isolated lamp/mirror/flower experiment. The main ray then reaches G1 and G2 to open bridge A; its near-side latch keeps it available while the beam is redirected through G3 on the island to bridge B. The second latch is also reachable before crossing. The player returns for the lamp, reads the complete relief conversation and enters Level05 through a separate station arch.

- `shatteredCreekLayout.ts` owns bank/span/control geometry, actual bounded ray tracing, derived progression, one-time legacy G2 migration, prospective light-loss guards and safe restoration.
- `ShatteredCreekController` owns the Level04 composition, local actions, ID-based colliders, source identity, saved lantern power, H/J, complete scenario dialogue and completion gates. CampaignScene delegates only its Level04 hooks and retains its existing scene-transition lifecycle.
- Floors and bridges render below actors; mechanism depth follows the visible ground anchor. The open arch and steps sit below actors. Compact visible prop bases and both water cuts are solid. The scenic image is cropped to distant framing; no baked permanent crossing is used as the play surface.
- Save version1 and the existing latch/mirror/memo keys remain. Practice/source/discovery facts are narrowly named additions. New source placement resets retrieval, and restoring or moving the lantern preserves its actual on/off value despite shared lantern methods forcing on.
- Legacy crossing flags never grant latches. B latched implies A latched. Exit requires both latches, current lamp in hand, retrieval and relief facts. There is no Hope Crystal award in this level.
- Native practice art reuses the mirror1 base dot; the isolated group and `Gương thử` caption distinguish it from the three main mirrors. The shared bridge sprites remain schematic; stone underlays and native quay accents reuse existing assets. No raster or character frame was regenerated.

## Review and correction history

Root's draft inspections corrected reflection mapping, water/lane collider identity, saved off-source identity, unsafe return-path changes, source/optical alignment, bridge origin, duplicate HUD, automatic dialogue timing, missing flower registration and prerequisite feedback before the first frozen review.

Round1 froze `84d82973942e52adbf6b9e871bc76d7ea1106acd`:

- Independent `/root/review_level04_a`: P2 safe restoration omitted exit post solids. A saved `(540,260)` could be accepted inside a runtime post collider.
- Independent `/root/review_level04_b`: no findings in inspected source. Browser/visual behavior remained unverified. Its transient observation of generated dist was outside the frozen diff; root restored generated output and confirmed clean source state.
- Root independently reproduced the post omission at `(540,250)` and found the proposed relief-to-exit path blocked at `(548.86,200.74)` when runtime post rectangles were included. The normal focused script passed because it shared the incomplete obstacle list. This additional probe was **FAIL** on round1 and is not hidden by the passing build.
- Root also requested compact ground footprints instead of full-height post walls, captions clear of mechanism artwork/actor feet, uncertain relief journal wording, and source recovery guidance before rerouting when the lamp has been retrieved early.

The corrections were committed in `7886ba599914b3e9d1456ce31b8eeb0940c79e79`; updated spatial requirements were committed in `7fa651d5777f6593642a75e55a7021f546f51789`. Both independent reviewers re-reviewed that same combined frozen revision in round2. Reviewer A explicitly closed the post finding; reviewer B checked post geometry, recovery, captions and wording. Neither reported a new actionable finding. The root probe also passed after correction. There are no open source findings from these rounds; live visual/gameplay acceptance remains unverified.

## Verification

Root commands on round1 `84d8297`:

- **PASS** `npm run build`: TypeScript and Vite, 436 modules. Generated `dist/index.html` restored afterward.
- **PASS** `node --experimental-strip-types scripts/check-shattered-creek.mjs`.
- **PASS** the forest-edge, whispering-woods, campaign-start-intent and interaction-prompt-layout scripts using the same Node command prefix.
- **PASS** `git diff --check`.
- **FAIL** the independent post-aware route/restore probe described above on round1; closed by the final correction and re-run below.

Root repeated all the build/script/diff commands above on final source and requirements revision `7fa651d5777f6593642a75e55a7021f546f51789`: **PASS**, including the 436-module build. The additional independent probe was **PASS** for101 relief-to-exit samples with every runtime post included; saved `(540,260)` was rejected and repaired to safe east checkpoint `(480,140)`. Generated dist was restored. Later evidence-only documentation updates do not change this checked source or the spatial requirements.

The worker reported an initial missing-helper test failure, but no root-retained first-run transcript is available. Test-first timing is not certified by the final passing checks. Build and pure-check results above come from actual root command output, not the worker's report.

## Preview and limits

Dedicated human preview: `http://127.0.0.1:5192/?level=4`, served with an external config under the current Codex visualization directory. It seeds a legitimate Level04 entry, including the previously earned Memory Crystal, once on this separate origin and backs up any prior save there. It preserves the existing port5190 Level02 preview/save. Root received HTTP200 with the intended preview bootstrap; this is serving evidence, not gameplay evidence.

Browser keyboard playthrough, live collision/occlusion, actual renderer screenshots, console audit and human acceptance: **NOT_RUN**. Work browser automation is disabled; no alternate automation bypass was used. Reviewers and worker were requested as native `gpt-6-luna` at `high`; the tool does not expose a separate resolved-model field. Reviewers share a model family and can have correlated blind spots. No remote publication is part of this slice.
