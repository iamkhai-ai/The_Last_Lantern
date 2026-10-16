# Interaction prompts and Level 01 gate rim

## Scope and cause

User reported the lamp pickup prompt covering the lantern, asked to check similar cases, then reported walking into the gate rim. Base `d029d44`; final source `1418693b553c9d5689734b1610c93bb5d814d93a` on `codex/campaign-layout-rebuild`.

- The old prompt position was `interactionPoint.y - 32`, independent of visible artwork or actors. The lantern occupies y=210..238 while its old prompt occupied y=209..229. Tablet and long labels had the same placement problem.
- Gate side crops occupy x=410..460 and x=512..562; old post bodies occupied x=422..447 and x=525..550. A real keyboard baseline approached from the center and stopped at x=518, with feet body x=511..525 inside the right visual rim. See local `gate-rim-before.json` and screenshot.

## Changes

- Shared prompt placement measures and wraps text, chooses positions around target/actor bounds, avoids visible Lumo and HUD bands, and clamps to the viewport. Existing E selection, range, enablement and callbacks are preserved.
- Level 01 supplies precise lamp/tablet/gate bounds. Other campaign actions use bounded nearby props with live callbacks; direct Observatory, WorldScene and legacy puzzle callers bind their available sprites. Root-bed Graphics and a bridge that becomes visible later have explicit bounds.
- Permanent gate posts now use `[410,126,50,40]` and `[512,126,50,40]`; backing uses `[410,96,152,30]`. The 52px center passage remains usable, and the conditional locked threshold remains separate. Runtime physics and safe-save restoration use the same spatial data.
- No image, frame, lighting, puzzle state, or save-schema changes in this slice.

## Root verification on the final source

| Check | Result |
| --- | --- |
| `npm run build` | PASS — TypeScript and Vite, 406 modules, exit 0 |
| `node --experimental-strip-types scripts/check-interaction-prompt-layout.mjs` | PASS |
| `node --experimental-strip-types scripts/check-forest-edge.mjs` | PASS |
| `node --experimental-strip-types scripts/check-campaign-start-intent.mjs` | PASS |
| `git diff --check` | PASS |
| Browser prompt audit | PASS — 355 placements, ten levels, all three Observatory rooms, five actor approaches per currently enabled target; measured text fits, actor/known target/Lumo do not overlap, and prompts stay within safe bands |
| Dynamic Observatory bridge | PASS — bounds initially null while hidden, then become `(330,280,132,40)` when shown; prompt avoids it |
| Gate physics and stale-save browser fixtures | PASS — 28 cases across closed/open states, inner/outer/south approaches, diagonals, center stairs, and old saves inside newly widened posts |
| Actual uninterrupted keyboard tutorial/lifecycle | PASS — pickup, unlit/lit tablet, Pulse, receiver, closed gate, E to Level 02, same-runtime Continue, second New Game, confirmed pause Restart; no console errors |
| Independent read-only Luna high final reviews A/B | PASS — both reviewed the exact final source revision, no remaining actionable findings |
| Full playthrough of later puzzles, human acceptance, remote publication | NOT_RUN |

Gate inner side contact now stops actor center at x=467/505; outer contact at x=403/569; south faces stop y=150. Center north travel stops y=128 while locked and y=110 when open. Root inspected final screenshots: lamp/tablet/gate labels are clear, Nhinh remains visible on the central stairs, and the right rim contact is outside the stone footprint.

## Evidence and limits

Local directory: `C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/prompt-audit/`.

- `results.json`, `level01-pickup.png`, `level01-picked.png`, `level01-open.png`: prompt geometry and screenshots.
- `bridge-prompt-results.json`, `bridge-prompt.png`: hidden-to-visible bridge presentation fixture.
- `gate-rim-results.json`, `gate-rim-open-right.png`, `gate-stairs-open.png`: actual keyboard collision after isolated position fixtures.
- `lifecycle/level01-browser-results.json`: full keyboard tutorial without injected puzzle flags or reload before exit.

Prompt, bridge and collision diagnostics intentionally use isolated saved-state/position fixtures; they do not certify later puzzle logic or every gated state. Targets without a distinct rendered sprite fall back to actor/Lumo avoidance and HUD-safe placement. The root bridge has an additional visibility-specific check. Test origins were ports 5185/5186 with fresh Chromium contexts; the user's port 5173 localStorage was untouched. Temporary diagnostic servers were stopped; port 5173 remains available for user review.

Round 1 reviewer A found missing root-bed/bridge bounds on `d64934b`; corrected in `1418693` and independently re-reviewed. Round 1 reviewer B had no actionable findings. Earlier gate evidence that stopped at x=454/518 is superseded by the wider post geometry and these new contact checks.
