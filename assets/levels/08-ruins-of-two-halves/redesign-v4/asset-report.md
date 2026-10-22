# Level 08 v4 decoded-pixel report

All outputs are RGBA PNGs with binary alpha and native canvases. The background is opaque. Every sprite has a transparent exterior. Bounds are measured from decoded pixels and lie inside the stated canvas.

| File | Canvas | RGB colours | Family colours | Opaque box x,y,w,h |
|---|---|---:|---:|---|
| confirmation-latched.png | 48×36 | 105 | 128 | 3, 7, 43, 27 |
| confirmation-ready.png | 48×36 | 107 | 128 | 3, 7, 43, 27 |
| confirmation-waiting.png | 48×36 | 75 | 128 | 3, 7, 43, 27 |
| fixed-three-route-splitter-off.png | 48×48 | 112 | 128 | 5, 1, 38, 44 |
| fixed-three-route-splitter-on.png | 48×48 | 112 | 128 | 5, 1, 38, 44 |
| lock-moon-covered.png | 32×40 | 102 | 128 | 2, 5, 29, 34 |
| lock-moon-lit.png | 32×40 | 96 | 128 | 2, 5, 29, 34 |
| test-moon-covered.png | 16×20 | 77 | 128 | 1, 2, 14, 17 |
| test-moon-lit.png | 16×20 | 73 | 128 | 1, 2, 14, 17 |
| lock-sun-off.png | 32×40 | 102 | 128 | 2, 5, 29, 34 |
| lock-sun-on.png | 32×40 | 123 | 128 | 2, 5, 29, 34 |
| sanctuary-door-closed.png | 104×76 | 119 | 128 | 1, 1, 102, 74 |
| sanctuary-door-open.png | 104×76 | 126 | 128 | 1, 1, 102, 74 |
| seedling-curtain-closed.png | 88×48 | 120 | 128 | 1, 1, 86, 46 |
| seedling-curtain-open.png | 88×48 | 125 | 128 | 1, 1, 86, 46 |
| statue-notch-0.png | 64×88 | 128 | 128 | 5, 8, 55, 76 |
| statue-notch-1.png | 64×88 | 122 | 128 | 5, 8, 55, 76 |
| statue-notch-2.png | 64×88 | 128 | 128 | 5, 8, 55, 76 |
| statue-notch-3.png | 64×88 | 126 | 128 | 5, 8, 55, 76 |
| test-column-notch-0.png | 32×44 | 113 | 128 | 2, 4, 28, 38 |
| test-column-notch-1.png | 32×44 | 96 | 128 | 2, 4, 28, 38 |
| test-column-notch-2.png | 32×44 | 111 | 128 | 2, 4, 28, 38 |
| test-column-notch-3.png | 32×44 | 110 | 128 | 2, 4, 28, 38 |
| test-pedestal.png | 48×36 | 128 | 128 | 3, 6, 43, 27 |
| mirror_0.png | 36×48 | 108 | 128 | 2, 6, 32, 42 |
| mirror_1.png | 36×48 | 113 | 128 | 2, 6, 32, 42 |
| mirror_2.png | 36×48 | 86 | 128 | 2, 8, 32, 40 |
| mirror_3.png | 36×48 | 95 | 128 | 8, 4, 20, 44 |
| ruins_altar.png | 104×52 | 128 | 128 | 8, 6, 88, 42 |
| beacon_stone.png | 34×46 | 128 | 128 | 6, 4, 18, 38 |
| temple-scene-base.png | 640×360 | 128 | 128 | 0, 0, 640, 360 |
| inscription-under-statue.png | 48×12 | 1 | 1 | 2, 5, 44, 4 |

Mirror silhouettes use their generated alpha rather than the discarded stone cards. Other props use generated alpha fitted to the prior native bounds. The inscription is reused unchanged. Original puzzle shadows and shared characters are protected by hashes.
