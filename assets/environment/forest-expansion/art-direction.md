# Wild Margins

Natural form interrupts rigid geometry. The silhouette carries the first impression: uneven tufts, broken borders, branching roots, and asymmetric crowns. Empty space is as intentional as the foliage, with meticulously crafted separation between every individual sprite.

Muted moss, olive, forest green, and deep teal establish a quiet woodland palette. Bark is dark, earthy, and weathered; restrained yellow-green accents describe upper surfaces without becoming luminous. Painstaking attention to pixel clusters keeps the material language coherent with the existing environment.

Scale expresses age rather than mere enlargement. Broad trunks, exposed roots, and layered crowns communicate ancient growth, while grasses establish a varied low rhythm. Master-level execution requires each silhouette to remain recognizable when reduced to gameplay scale.

Composition balances reusable modules with organic difference. Grasses vary in height, density, and direction instead of forming repeated straight strips. Trees remain complete, independent objects with breathing room around every branch and root. The conceptual thread is a forest reclaiming the artificial boundaries of a path; the artwork contains no lettering or annotations.

## Style correction after reviewing the game

The actual game renders at 640x360 with pixelArt enabled. Existing tree sprites are approximately 60-101 pixels wide and 94-107 pixels high and are used at native size in Maps 1 and 2. Their foliage is made of readable, elongated leaf shapes in olive and yellow-green highlights over dark teal-green shadows, rather than the dense tiny oak-leaf texture of the initial generated drafts. Gameplay screenshots already contain scene lighting, so their final darkness must not be baked into the source assets a second time.

Use original tree_woods, tree_alt, bush_woods, the grass tile and a saved gameplay screenshot as direct visual references. New giant trees should be prepared on approximately 160x192 transparent canvases, retaining the existing leaf vocabulary and growing through anatomy rather than photographic detail. New grass should be short, sparse and modular, approximately 12-38 pixels wide and 8-20 pixels tall, with neither opaque ground rectangles nor a hedge-like silhouette. Native-size inspection is an offline comparison, not proof of runtime integration.

Initial source sheets are retained as superseded drafts; revised sheets and native-size exports will be kept separately.

## Approved scope

- Eight distinct roadside grass sprites on a transparent sheet, arranged in four columns and two rows.
- Three distinct ancient forest tree sprites on a transparent sheet, arranged in three columns and one row.
- Match the existing top-down / three-quarter pixel-art environment of The Last Lantern, Maps 1 and 2.
- Static sprites, not animation sequences. No map, collision, gameplay, or source-code modifications.
- Generated sheets require visual review and preparation before runtime integration.
