# Level 10 — The Heart of Elaria: repair report

Scope: repair tasks T11, T12 and T13 of `docs/superpowers/plans/2026-10-18-levels-05-10-repair.md`. Source revisions: `1373bbe` (T11), `27d4b1c` (T12), `312e4ae` (T13); frozen revision `84367c1659958fe3c97862c091d715d846dcbf33`.

## What changed

- **Light and overlays (T11).** The overload beam runs from the core to the lamp Nhinh carries and follows him every frame (`LanternSystem.getCarriedLightPosition`); the Moon pocket border is drawn on the Moon cell; beams sit under the floor cells (depth 6.8); floor-cell gates equal the visible art box (±2px); `core-dawn` (identical to `core-night`) is read from the dawn overlay; the first frame takes its core art from the live state.
- **One final action (T12).** `commitFinalExtinguish` is the only commit of the ending. F with the roots latched and the lamp lit completes at once from the hand (even mid-overload) and at the pedestal from a valid stand. An older save (roots latched, lamp parked and dark) is recognised on restore without relighting the lamp.
- **The ending (T13).** A pure beat machine plus a renderer: night call, a 1.4 s unskippable silence, reassurance, a four-shot montage, the Shadow fading through the registered dawn poses, the tree at dawn, the seated scene (eight authored lines, native 36x42 pose, dark lamp with the leaf), the trail, the title and the credits. Each beat saves `l9-ending-beat` and resumes by rebuilding its stage; a lamp left on the pedestal is taken by Nhinh first.
- `scripts/check-campaign-art.mjs` measures real PNG size and alpha. It found stale declared sizes in `assetManifest.json` and in the Level 09 layout; both were corrected (see `10-layout.md` and `09-layout.md`).

## Evidence

- `check-heart-of-elaria` (including the final-action rules), `check-campaign-art` (40 files), `check-campaign-ending` (19 cases, mock-timer timeline, input rules, save defaults, art on disk), `check-campaign-runtime` (24 cases, including the shipped `commitFinalExtinguish`, `handleLanternKey`, `refreshCarriedBeam`, `refreshPocket`): all PASS at the frozen revision.
- Seen once in the Canvas renderer: the overload beam follows Nhinh and the pocket border sits on the Moon cell; every ending beat builds; the pedestal pickup saves its flags before the two lines; the title and the credits control appear.

## Limits (NOT_RUN or approximate)

- No sound: the cricket, the water and the answering voices are shown as light and motion only (no audio asset was added).
- No WebGL run, no human playthrough. The montage reuses existing scene bases, so it shows the garden, creek, tower and observatory as drawn; the painted observatory wheel is turned by drawn spokes.
- Credits and Play Again behaviour is the T04 contract (Main Menu default, confirmation for Play Again); it was not changed.
