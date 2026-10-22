# Sleeping Garden — art v2

Level 07 artwork made against `test-develop` baseline
`9f792416d926475e6dc44924de5068aa8dca8daf`, following the user's approved visual
brief and `docs/scenario/07-the-sleeping-garden.md`. The draft scenario v2 does
not replace that gameplay source in this change.

## Delivery

22 native PNGs are registered only for the Sleeping Garden. Cool slate, worn
brass, timber, woven roots and quiet water replace the older schematic mechanism
art. The garden repaint retains the existing topology, and the authored canal
repair is reused exactly at the return crossing.

| Family | Native canvas | Exports |
| --- | --- | --- |
| Garden background | 640x360 | 1 |
| Reservoir open/closed and opaque shutter aperture | 80x72 | 3 |
| Shutter lever and two independent latch instances | 24x40 / 28x32 | 6 |
| Timber gate lowered/raised/held | 112x72 | 3 |
| Root spans deployed/held/retracted | 48x32 | 3 |
| Moon Root extended, with its pot kept in place | 112x44 | 1 |
| Nursery sluice closed/open | 52x48 | 2 |
| Stone return crossing closed/open | 80x32 | 2 |
| Delivered nursery water | 128x24 | 1 |

The existing Sun Flower, coiled Moon Root, seedling before/after, state icons,
Nhinh, Lumo and shared Shadow frames are reused. The seedling still gains only
one leaf. Both required latches, dialogue, hints, save flags, collision rectangles,
interaction stands and the original puzzle remain the current versions.

## Inspect the result

- [Entry, art presentation](previews/01-entry-art-1280x720.png)
- [Darkness and living roots, art presentation](previews/03-dark-root-bridge-art-1280x720.png)
- [Water delivered and new leaf, art presentation](previews/05-nursery-restored-art-1280x720.png)
- [Native sprite contact](previews/sprites-contact.png)
- [Actual occupied-root render with HUD](previews/04-occupied-root-held-1280x720.png)

Files ending in `-art-` are the same actual Phaser scene paused with the HUD
hidden for presentation. The other five state screenshots keep the normal HUD
and are the browser inspection evidence. Each has a native 640x360 image and an
integer nearest 1280x720 enlargement. The current HUD can overlap the upper
reservoir casing; the normal entry screenshot preserves that existing condition.

## Integration

`CampaignArt.ts` registers the local pack under `garden_v2_*` and exposes
`getGardenArtKey`. Missing members fall back to their original level or shared
art. Other levels keep their own keys and shared files are unchanged.

`SleepingGardenLevel.ts` resolves its variants through that helper. The new
112px extended-root canvas reuses the 48px pot at local x52. The main module's
existing extended rectangle keeps the pot at world x252. The new practice frame
is placed 20px left of its old image centre so its pot stays at world x132;
that image-only offset applies to the local frame, with legacy fallback placement
retained. Logical geometry stays in `sleepingGardenLayout.ts` unchanged.

The gate is assembled from generated post/beam/brace pieces at the controller's
exact coordinates. Raised/held rows below y29 contain only the two outer post
strips, preserving the existing front/back sorting and empty doorway. Opening
the sluice shows an aperture and actual water ripples; no arrow icon is baked in.

## Sources and regeneration

Eight built-in `image_gen` calls produced the retained original background and
state atlases. Exact prompts are beside each original under `sources/`.
`production-manifest.json` records their hashes, reference-image hashes, native
crops, component registration, alpha treatment, output hashes and reused files.
The image backend model/version is not exposed and is recorded as unknown.

Generated soft outer glows are removed in the native prop exports by explicitly
normalizing source alpha: values at least 192 become opaque, lower values clear.
Nearest sampling fits authored prop canvases. Character images are not rescaled.
The original generated PNGs retain their original alpha and resolution.

With Node and the authoring runtime's `sharp` available on the module path:

```text
node scripts/export-level07-art.cjs
npm run build
node scripts/check-sleeping-garden.mjs
node scripts/check-campaign-art.mjs
```

For the browser inspection, run the local full-game Vite server on port 5187,
make `playwright` and `sharp` available, and run `node scripts/inspect-level07-art.cjs`.
`PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` and
`LEVEL07_ART_BASE_URL` can select an existing authoring installation/server.
No runtime package dependency was added for these authoring tools.

The browser script uses isolated save fixtures to render five states, exercises
the real F input on an occupied root span, checks local texture loading and stable
pot registration, and saves `browser-inspection.json` with checked source hashes.
This is targeted visual/runtime inspection, not a complete player walk-through.
