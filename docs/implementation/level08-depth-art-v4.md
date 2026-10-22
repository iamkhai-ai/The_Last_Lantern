# Level 08 — approved depth concept integration

Base revision: `92ccc9320fc7b81188bb65206cb9f35d136db333`.

The user approved `redesign-v4/concepts/temple-depth-study-v2.png` and requested integration on 2026-10-22. The approved direction adds stone relief, recess depth, material detail and grounded props. Both mirror stone surrounds and black backplates must be absent.

## Scope before implementation

- Produce a separate opaque native 640×360 environment and independent RGBA state sprites in `redesign-v4`.
- Retain 128 colours per family, binary alpha, nearest filtering, existing sprite canvases and placement. Preserve measured puzzle shadow masks and shared characters.
- Preserve puzzle logic and save state. Mirror collision envelopes may shrink to the visible standalone instrument; south-only interaction and reachability must still hold.
- Switch only Level 08's local art registration to the new pack. Keep runtime light, beams, receiver glyph states and puzzle shadows separate from the backdrop.
- Preserve source image generation outputs, exact prompts, export recipe and decoded-pixel manifest. The existing unrelated Level 05 script edits are outside this change.

## Dependencies and risks

The concept is a flattened high-resolution image. A clean backdrop and transparent sprite sources are required before runtime integration. Generated sources need explicit cropping, alpha cleanup, consistent state orientation and native-scale review. Removing mirror surrounds changes their silhouette; collision and side-approach checks must match the new envelope.

## Verification and review

Baseline and final: `npm run build` and `node scripts/check-ruins-of-two-halves.mjs`. Final production checks must decode sizes, alpha, family palettes, masks, source/export hashes and protected shadow/character files. Inspect actual Phaser renders for entry, all statue/mirror orientations, lamp off, ready and latched states, plus four-side mirror approaches. Keep screenshot/evidence artifacts under the v4 pack. Two independent read-only GPT reviews will examine the same frozen revision before completion reporting.

## Implementation

The local art glob/resolver loads `redesign-v4/sprites` under `ruins_v4_*`. The existing original Level 08 and shared/raw fallbacks remain. Runtime placement, depth, texture canvases, state selection, puzzle rules and saves are unchanged. Mirror collision now covers the union of all four freestanding orientations: left `(224,218,32,44)` and right `(384,218,32,44)`; stands remain unchanged. `08-layout.md` and the geometry check record those envelopes.

Reproduce with `node scripts/prepare-level08-art-v4.cjs`, then `node scripts/export-level08-art-v4.cjs`. The manifest records decoded dimensions/alpha/palettes/bounds, retained sources, original references, protected files and authoring hashes. `sources/generation-log.json` retains the generation prompts and maps tool outputs to retained originals. See `art-direction.md` in the pack for the approved target and `asset-report.md` for the per-file report.

## Verification

- **PASS** — `npm run build -- --outDir artifacts/level08-art-v4-build` (TypeScript + Vite, 794 transformed modules).
- **PASS** — `node scripts/check-ruins-of-two-halves.mjs`, including mirror envelope measurement from all four new PNGs.
- **PASS** — `node scripts/check-campaign-art.mjs`, `node scripts/check-interaction-targets.mjs`, `node scripts/check-interaction-reach.mjs`, `node scripts/check-campaign-save.mjs` (65/65 save cases).
- **PASS** — native export checks: 32 RGBA PNGs, binary alpha, <=128 colours per family; native and nearest 2× contact/composites inspected.
- **PASS** — `node scripts/inspect-level08-art.cjs`: seven native Phaser/Chromium renders, all 32 textures, fixed image boxes, four statue/mirror orientations, waiting/ready/latched states, door/curtain changes, actual F input and E presses from four sides of both mirrors. No browser/PNG errors. Captures are in the pack's `previews` directory.
- **PASS** — `node scripts/check-level08-art-v4.cjs`: independent decode of all 32 PNGs and family palettes, mirror exterior transparency, source/reference/protected/authoring hashes and current browser bindings. Original shared art and measured shadow PNGs also compare unchanged to the base revision in Git.
- **PASS** — `git diff --check`.
- **NOT_RUN** — full human spawn-to-exit puzzle playthrough and remote CI. The browser studies use isolated saved-state fixtures on port 5187 and do not touch the user's campaign storage.

An initial browser run failed because the old inspection script expected `moonDark` to choose the covered texture. Current gameplay deliberately uses `moonCovered && lightActive` for that display. The harness was corrected to assert the current rule; gameplay was not changed.

## Independent review

Frozen code/art revision: `15371ef53f0e2a02c9e1fe8a1d46e289f62341cf`, reviewed against base `92ccc9320fc7b81188bb65206cb9f35d136db333`. Root also reran the decoded art/hash audit and geometry/state checks after freezing; both passed.

The active Codex tool metadata lists `gpt-6-luna` with `high` effort. Both independent dispatches accepted that pair with fresh, bounded contexts. The runtime did not expose resolved model/effort, so those remain unknown. Their read-only briefs did not provide a technical filesystem sandbox. Current-round findings were kept separate until both reviewers completed; reviewers sharing one model may have correlated blind spots.

- **Reviewer A — `review_level08_depth_a`: PASS**, no actionable findings. Checked the full source diff, approved concept, native/2× contacts/composites and all seven Phaser captures, mirror collision union and eight input-side tests. Independently ran Level 08 geometry/state, art v4/hash audit, campaign art and whitespace checks. No files changed.
- **Reviewer B — `review_level08_depth_b`: PASS**, no actionable findings. Independently checked runtime, authoring, inspection changes, retained generation hashes, sprite/state directions, transparency, collision and recorded Phaser captures. Ran art v4/hash audit, Level 08 geometry/state and campaign art checks. No files changed.

Build/browser regeneration by reviewers, full human playthrough and remote CI remain **NOT_RUN**. Root's actual build and browser results are above. This follow-up records evidence only; all reviewed runtime, art, requirements and test bytes remain identical to the frozen revision. No merge or deployment approval is implied.
