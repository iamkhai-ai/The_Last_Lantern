# Level 02 integration into main

## Authority and scope

On 2026-10-17 the user accepted Level 02 after playing the localhost preview and explicitly requested merging it into main. Integrate the approved `codex/level-02-spatial-rebuild` revision `5ca30e7` with remote main `7997c43b2264d01204e35410c1f8ac44b9aa71ea`. Preserve the newer Level01 gate, lantern darkness and shared interaction-prompt changes. Publish only after merged-source verification and two independent read-only Luna High reviews on the same frozen revision. No other worktrees or their uncommitted changes are part of this integration.

## Conflict resolution

There was one conflict in `CampaignScene.addAction`: the Level02 branch used fixed prompt heights and radius24; main introduced artwork bounds with shared prompt placement and radius24 only for Level01. Adopt main's shared placement, retain radius24 for both Levels01 and02, and resolve Level02 targets by their existing `woodsId` rather than the generic nearby-art heuristic. The gate uses `gate-base`; poem and rune actions use their own IDs. This preserves readable labels around the enlarged poem and normalized rune art while avoiding Nhinh, Lumo and HUD. Main's Level01 and other-level implementations remain unchanged. Old Level02 fixed-height values are superseded by the dynamic placement.

Update the current layout documentation and the geometry fixture's label check to assert no intersection with the actor rather than requiring every label to be above it. Add Level02 approach/contact cases to the existing shared prompt-layout check. No raster, character, dependency or save-schema changes.

## Verification

Merged candidate: woods, forest-edge, campaign-start-intent and shared prompt-layout checks PASS; both Level02 browser fixture syntax checks PASS; build PASS (407 modules, TypeScript and Vite). Generated tracked `dist/index.html` restored. Diff checks PASS. These results will be bound to the frozen integration commit in the task record. Browser automation remains NOT_RUN because Work browser control is disabled. The user's acceptance applies to the prior gameplay preview; the integration change is independently reviewed and checked as above.

## Publication approach

Frozen integration revision `94ffe8f42ce35b785c3b4328327f2e74278386ed`: root independently reran all four pure checks, both fixture syntax checks and diff check, PASS. Build completed with 407 modules in 9.42s before freezing, and the frozen source is unchanged from that build. Two independent read-only Luna High final integration reviews A and B checked this same revision against `7997c43` and reported no actionable findings. The incoming Level01 layout, procedural textures, puzzles, WorldScene, InteractionSystem, shared prompt-placement helper and LanternSystem match remote main exactly. User gameplay acceptance and explicit merge authorization are recorded above. This evidence addition is documentation only.

Fetch main again before publishing. A normal fast-forward push of the reviewed integration commit to main preserves all current remote main commits; never force-push. If main advances, synchronize and recheck affected evidence before publication. If repository protection rejects direct publication, preserve the rejection and use the repository's required pull-request route without bypassing protection. Keep the existing preview worktree and server available for the user's continued review.
