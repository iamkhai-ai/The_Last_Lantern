# Level 02 task 1 report

## Scope and implementation

Completed Task 1 for campaign index 1 (Whispering Woods). The typed spatial/state module is shared by the runtime and assertion script. `CampaignScene` now uses distinct practice, rune, poem, and exit targets; authored tree/rock/glyph/gate geometry; depth sorted foot placement; sleeping/revealed/activated rune states; local timed reveals; persistent discovery; sequence reset/repeat behavior; legacy save recovery; moving Moon–Leaf–Star fireflies; memory vignette and exact scenario dialogue; stage-aware HUD/H/J; and a safe open-gate exit.

No raster, dependency, save-format, Level 01, or Level 03–10 edits. Shared `DialogueLine.speaker` gained the required exact memory speaker names.

## Decisions and deviations

- Root supplied revised southern stand centers to ensure the E radius includes the southern solid contact; those centers and prompt offsets are used in data-driven interaction registration.
- Invalid or behind-locked-gate restores resolve to the nearest safe named near-side stand. Explicit open saves, legacy `rune-sequence=3`, or all three activated flags recover to an open gate and three active runes.
- No other deviation from `docs/implementation/02-layout.md` or the Vietnamese scenario was identified.

## Verification

- Test-first contract was first executed before its module existed and failed as expected with `ERR_MODULE_NOT_FOUND`.
- Final focused Level 02 assertions: PASS.
- Existing Level 01 forest-edge assertions: PASS.
- Existing campaign start-intent lifecycle assertions: PASS.
- `npm run build`: PASS (TypeScript and Vite, 406 modules).
- `git diff --check`: PASS.
- Actual browser playthrough and two independent reviews: NOT_RUN by worker; owned by root.

## Commit and status

Checkpoint commit pending. Root must bind browser and review evidence to the frozen commit hash. Worker did not use injected progress flags or claim gameplay verification.
