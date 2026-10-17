# Level 04 mechanism art upgrade

## Request and scope

The user requested richer item artwork, specifically mirrors and bridges. This slice replaces all27 Level04 mechanism states:9 mirrors,6 bridge states,4 latches,3 lamp sources,3 receiver states and2 practice flowers. Baseline: `7f9240396929f31d2644070988ec9b7fb0651418`, branch `codex/level-04-spatial-rebuild`.

Art direction: carved mossy stone, aged brass, reflective blue glass, inset identity jewels and readable mechanical handles. Powered bridges use cyan inscriptions; latched bridges use brass braces. An empty source has an empty cradle rather than an unlit lantern housing.

Assets: `assets/levels/04-shattered-moonlit-creek/sprites/mechanisms/`. See `art-notes.md` there for the recorded prompt set, source image references and export limitations. `runtime-manifest.json` binds the final filenames, canvas sizes, alpha bounds and SHA256 hashes. Original generated images are retained in its `sources/` subfolder. Final native and4× contact sheets are in `assets/levels/04-shattered-moonlit-creek/art-previews/`.

## Integration

- CampaignArt registers only the final PNGs directly in the Level04 mechanisms folder; original atlas images and diagnostics are outside that glob.
- ShatteredCreekController resolves the new Level04 texture keys for mirrors, bridges, sources, receivers, latches and flowers. The old rectangular stepping-stone underlays were removed; the new bridge artwork supplies the visible walkway.
- Canvas sizes and existing runtime anchors remain: mirrors32×40, bridges100×36, latches28×32, sources32×44, receivers24×24, flowers28×28. Empty bridge centers retain60px of fully transparent water gap.
- Empty-source registration was finalized by root: its independent generated cradle is resized to32×30 and bottom-aligned on the32×44 frame, keeping the stone body comparable to the occupied source.
- Puzzle geometry and CampaignSaveSystem are byte-identical to the baseline. This slice changes art loading and presentation, not their rules. Existing upright main-mirror labels retain the1/2/3 identity dots.

## Corrections and evidence

The root rejected the worker's first bridge export: a three-column atlas had been interpreted as two columns, producing fragments. Final exports use row0, column1 for powered and column2 for latched. Root also rejected stray latch/flower pixels and an overlapping contact sheet; these were corrected before handoff. The independent empty-cradle generation distinguishes an empty source from a placed dark lantern.

An initial export accidentally created two new directories in the dirty primary D: checkout. The worker confirmed those exact directories were task-created and no other D: file was written. Root archived all34 task-created files outside the project, then confirmed both primary paths were clean. Other primary-checkout changes were preserved. Final assets live in the assigned C: worktree.

On the final artwork/source content:

- **PASS** `npm run build`: TypeScript and Vite,463 modules;9,197.90kB output. Generated dist restored afterward.
- **PASS** `git diff --check`.
- Native asset inventory:27 PNGs with the dimensions above. Both absent bridge center alpha crops are empty; metadata is retained in `runtime-manifest.json`.
- Root visually inspected all final families in the4× contact sheet and the running Level04 preview. Root observed empty source, placement with a lit lamp, placed-off state and retrieval; the practice ray visibly struck the new mirror face. These are limited visual observations, not a complete playthrough.
- Automated tests/full puzzle playthrough/human acceptance: **NOT_RUN** for this art slice.

## Review blocker

The required native Luna High asset worker terminated with: `Agent errored: You’ve hit your usage limit.` The service message offered retry at2:35PM without a timezone. No retry time or automatic follow-up is promised.

Two required independent Luna High reviews of this new art/code revision are **NOT_RUN / BLOCKED** by that usage limit. Earlier reviews of `7fa651d` do not cover this art slice. Root inspection and compilation do not replace those reviews. No model/provider fallback or remote publication was used. This is a local preview pending those reviews.

## Preview

Human preview: `http://127.0.0.1:5194/?level=4`. A separate origin preserves the user's existing5192 progress, which had advanced to Level05. The local preview config is outside the repository. Browser screenshot: `C:/Users/Admin/.codex/visualizations/2026/10/17/01a147ca-965d-7d43-922f-ba11579f6dae/level04-props-after.png`.
