# Level 09 offline art redraw v3

This package contains 90 offline assets: 63 generated sprite frames, 3 generated room backgrounds,
1 loop-path material derivative, and 23 explicitly mapped historical minor layers. Eighteen source
sheets and their prompt/generation records are preserved in `sources/v3/`. New output sprites are in
`sprites/v3/`; the indexed production manifest is `asset-manifest-v3.json`, and hashes and source
relationships are recorded in `provenance-v3.json`.

Prompt specifications: [`sources/v3/sprite-prompts.json`](sources/v3/sprite-prompts.json) and
[`sources/v3/background-prompts.json`](sources/v3/background-prompts.json). Recorded generator
results: [`sources/v3/generation-results-primary.json`](sources/v3/generation-results-primary.json)
and [`sources/v3/generation-results-secondary.json`](sources/v3/generation-results-secondary.json).
The frozen layout copy and frame/material mapping are
[`sources/v3/layout-contract.json`](sources/v3/layout-contract.json) and
[`sources/v3/normalization-map.json`](sources/v3/normalization-map.json).

Offline review images:

- [Three required states](previews/v3/three-required-states-native.png)
- [Memory sequence](previews/v3/memory-sequence-native.png)
- [Powered observatory bridge state](previews/v3/02-shadowed-bed-grown-bridge-observatory.png)
- [Native sprite contact sheet](previews/v3/native-sprite-contact.png)

Run from the repository root after all source images are present:

```powershell
python assets/levels/09-dark-moon-observatory/sources/v3/normalize-assets.py
python assets/levels/09-dark-moon-observatory/sources/v3/compose-reviews.py
python assets/levels/09-dark-moon-observatory/sources/v3/validate-assets.py
```

`validation-v3.json` records the exact manifest, review and script hashes checked. Its `PASS` applies
to offline raster, geometry, provenance, HUD and state checks only. Human visual approval remains
separate; runtime integration, collision and engine rendering are `NOT_RUN`.
