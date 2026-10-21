# Level 05 scenario-v2 clue art

Completed 15-sprite art pack for the approved Level 05 scenario-v2 clues: four brass plaques, eight seal-ink states, two corridor states, and one chalk decal. Source masters and all generated iterations stay byte-for-byte in `sources/`; deterministic native exports and hashes are listed in `manifest.json`. Exact generation prompts and parent references are in [prompt-transcript.json](prompt-transcript.json). The image tool does not expose its model ID. No runtime integration or gameplay changes are included.

## Brass call plaques

Four 40×48 transparent overlays share source crop `[86,145,1689,748]`, nearest-neighbor motif size 28×10, offset `(6,17)`, and pivot `(20,24)`: hollow practice ring, one dot, two dots, three dots. The regenerated practice ring retains its clear hollow center at native size.

## Pressure-seal ink

Each 44×28 overlay uses the common source crop `[681,337,1304,472]`, nearest-neighbor motif size 20×4, offset `(12,12)`, and pivot `(22,14)`. Vivid assets are used with the lantern off or Lumo on the seal; dim variants use the same silhouette at maximum alpha 28/255 when the lantern is on and the seal is empty. All eight states are exported. The repaired two-dot master is preserved as sources/ink-2dots-master-v2.png; its native export discards alpha below 16 before generating the dim state, leaving a fully transparent central gap. The superseded dirty master remains preserved for provenance.

## Corridor route and chalk

The corridor mark uses one non-tiled 460×72 canvas at world rect `(72,218,460,72)`. Its source crop is reduced to 460×40 and placed at y=22 so the horizontal stroke is near world y=242 and the west tail reaches near `(82,280)`. The route also has a lantern-on dim export at maximum alpha 28/255.

The child chalk firefly uses a transparent 64×40 canvas, preserving source ratio inside a 44×28 allowance. Its proposed wall mount is centered at `(410,195)`; the visible motif lies within the relay partition. This is an offline art-composite candidate pending gameplay placement review.

`previews/clue-art-contact-1x.png` and `previews/clue-art-contact-4x.png` are labeled offline composites, not gameplay-through evidence. The route preview contains one image and does not tile it.

## Final delivery

The contact board shows every sprite and both room contexts at their native sizes; the 4x board is a nearest-neighbor enlargement. Older candidate previews are retained as exploration history, while manifest.previews lists the final review views. The complete built-in image tool prompt set is saved in prompt-transcript.json.

## Runtime placement handoff

The approved target is `docs/scenario-v2/05-a-path-for-two.md`, sections 3, 4, and 8. These are overlay assets: retain the host pedestal or seal art beneath them, including its sent/arrived or occupied state.

| Room / element | Plaque | Matching seal |
| --- | --- | --- |
| Entry: `practice-call` and `inner-call` | `plaque-practice-ring.png` | Entry `practice-plate` at (212,114): `ink-practice-ring-*` |
| Entry: `call-a`; relay: `call-a-far` | `plaque-1dot.png` | Entry `plate-a` at (546,114): `ink-1dot-*` |
| New entry marker near (230,232); ink: `call-b-far` | `plaque-2dots.png` | Relay `plate-b` at (546,114): `ink-2dots-*` |
| Relay: current `call-b`, reassigned to the final seal | `plaque-3dots.png` | Ink `plate-c` at (558,244): `ink-3dots-*` |

The new entry marker position is a scenario proposal; its collision and southern approach must be validated during layout integration. The old ink-room `call-c` and its solid are removed by that integration.

Align each 40x48 plaque with the full host call image. The current renderer uses the center of `getPathElementArtRect(element)`: for a standing call marker this is `(element.x, element.y - 24)`. Align each 44x28 seal overlay with its floor seal at `(element.x, element.y)`. Use nearest-neighbor rendering at native size.

- Seal `*-dark.png`: lantern off **or** Lumo actually on that seal. Seal `*-bright.png`: lantern on and seal empty. A latched door by itself does not reveal its seal mark.
- Corridor: draw one 460x72 image at top-left (72,218), or center (302,254), and switch between `ink-route-dark.png` and `ink-route-bright.png` with the lantern. Do not tile it.
- Chalk: draw `chalk-firefly.png` at proposed center (410,195) only while the lantern is off. The proposed position and discovery flag `l4-chalk-seen` still require runtime integration.
