# Level 08 depth art — approved production target

The user approved `concepts/temple-depth-study-v2.png` and requested integration on 2026-10-22 in chat `01a162dd-b31f-7963-af5e-f483f4193293`.

Use the existing moonlit slate/brass family with stronger bevels, stone relief, recesses and material detail. Remove both mirrors' grey stone surrounds and black backplates. Their silver blade, thin brass trim and small feet remain. This approval supersedes the previous v2 brief's exact silhouette requirement for these newly generated props; preserve all state meanings and measured puzzle shadow overlays.

- Phaser 3, TypeScript, Vite; fixed top-down view, native 640×360, nearest filtering.
- Opaque environment with separate 32 RGBA state/decal exports. Existing canvases, placement and anchors remain. Binary alpha, at most 128 decoded RGB colours per family, no dithering.
- Statue 0/2 and practice 0/2 show broad faces; 1/3 are narrow. Mirrors 0/1 are the two diagonals, 2 horizontal and 3 vertical.
- Sun off/on, Moon lit/covered, confirmation waiting/ready/latched, door closed/open, curtain open/closed and prism off/on remain visibly distinct. The two Sun receivers share one texture per state.
- Mirror sprites occupy a union envelope at local `(2,4,32,44)` within 36×48 canvases. The conservative collision envelope follows that union for every rotation. Keep the existing south approach and stand positions.
- Runtime light, beams, receiver state selection, measured shadow overlays, dialogue and save rules remain code-owned. Shared characters, original shadow PNGs and shared mirrors remain unchanged.
- Retain original image_gen sources and prompts. Deterministic crop/trim, nearest sizing, alpha threshold and family palette reduction are technical normalization.
- Inspect native and nearest 2× previews and actual Phaser renders; verify source/export hashes, state registration, lamp input and mirror E input from four sides. Injected state fixtures are not a complete player walkthrough.
