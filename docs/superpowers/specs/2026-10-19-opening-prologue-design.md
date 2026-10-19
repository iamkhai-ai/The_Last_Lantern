# Opening Prologue — Authoritative Design Spec (Restored)

**Status:** Approved by the user on 2026-10-19. Restored in the isolated feature worktree on 2026-10-19.

**Provenance (honest reconstruction, not a byte-exact restore):** The original approved document at this path was lost when the main checkout switched branches during unrelated work. No exact copy survives in the repository. This document reconstructs the approved design from the approved design summary in the art handoff README (SHA-256 `0f4d2d06466e638b6e38e0c1996f892ced31427ed08f552176a7578bd5d615e1`) and the approved implementation plan (SHA-256 `9f15a170d18c46d3a6edbfd4d8c99431d056da66473e3b464f6892b5229c5830`), including its Global Constraints. It preserves the approved story, the four-panel/eight-line copy, and the binding constraints from those two sources. Wording that was not preserved verbatim is restated, not invented as new scope. If a detail is missing here, the approved summary and plan constraints take precedence and the gap goes back to Sol instead of being filled locally.

## 1. Goal and timing

Add a short illustrated prologue, "Tiếng gọi trong sương", before the existing Level 01 opening. It gives the opening a narrative beat without changing gameplay, saves, puzzle state, or the campaign layout.

The prologue plays for each explicit fresh campaign start: New Game from the menu, a confirmed campaign restart from the pause menu, and a confirmed campaign Play Again from the credits. It does not play for Continue (normal or completed), legacy Continue, or a direct/debug start of `CampaignScene`.

## 2. Story and continuity

Nhinh is heading home, hears a faint appeal for help, follows a small light, loses his way in fog, and rests waiting for dawn. The existing Level 01 opening then plays unchanged.

Continuity rules for all four panels:

- The same character design throughout: cream hood/cloak, brown hair, brown boots, dark trousers, red scarf, empty hands. No new gameplay sprite of Nhinh is added.
- No identifiable Lumo body, face, or wings. The light is a small golden light, not a visible companion and not a malicious lure.
- Scene 02 keeps the last sunset behind Nhinh and one tiny golden light among the trees.
- Scene 03 is safe ground-level forest floor; the path disappears into fog while Nhinh looks back. No dangerous chasm, forced jumping route, or later puzzle spoiler.
- Scene 04 is a damp clearing under roots. Nhinh rests with empty hands; an unlit old brass lantern lies on the ground left of a plain mossy tablet. The final master removed an unintended circular/crescent engraving from the tablet. The scene does not grant the lantern, an item, a flag, or ownership, and does not reveal Lumo.
- Images contain no embedded text or UI. The prologue does not replay the two `OPENING[0]` lines from Level 01: "Trời vẫn chưa sáng sao?" and "Mình nhớ con đường vào rừng… Còn đoạn sau thì mờ quá."

## 3. Art set and runtime keys

Exactly four standalone illustrations, not crops of a storyboard. Runtime files live at `assets/prologue/runtime/`:

| Panel | Runtime file | Texture key |
| --- | --- | --- |
| 01 | `01-road-home.png` | `prologue-01-road-home` |
| 02 | `02-voice-in-trees.png` | `prologue-02-voice-in-trees` |
| 03 | `03-path-disappears.png` | `prologue-03-path-disappears` |
| 04 | `04-waiting-for-morning.png` | `prologue-04-waiting-for-morning` |

Static data (panel ids, texture keys, speaker/text lines) belongs in a separate data module; it does not import Phaser or image files. The scene imports the four runtime URLs explicitly.

Runtime images are 1280×720 indexed PNGs, 256-color palette, no dithering, each at most 1 MiB and at most 4 MiB total before base64 inlining. Full source masters stay in the external art handoff; masters are never imported into Vite or the application.

## 4. Panel and dialogue copy (exact)

The prologue has exactly four panels and exactly eight dialogue lines, in this order: 1 + 3 + 2 + 2. This copy is the approved copy and is not to be rewritten during implementation.

**Panel 01 — road home.** Warm sunset and an unnamed home village ahead.

- Nhinh: "Qua khúc đường này là tới làng rồi."

**Panel 02 — voice in the trees.** At the fork, last sunset behind; Nhinh turns toward a small golden light in the forest.

- Tiếng gọi: "Có ai… nghe thấy tôi không?"
- Nhinh: "Bạn bị lạc à?"
- Nhinh: "Đợi nhé. Tôi tới đây."

**Panel 03 — path disappears.** Safe misty forest floor; the path vanishes in fog; Nhinh looks back.

- Nhinh: "Tiếng gọi vừa ở đây mà…"
- Nhinh: "Mình vừa đi từ phía nào nhỉ?"

**Panel 04 — waiting for morning.** Nhinh rests under roots in a damp clearing, unlit brass lantern on the ground left of a plain mossy tablet; still-blue pre-dawn forest.

- Nhinh: "Nghỉ một lát thôi."
- Nhinh: "Sáng lên rồi mình sẽ tìm được đường về."

After the last line, the scene fades into the existing gameplay; no closing text, pickup, or save write is added.

## 5. Presentation, input, and UI

Presentation:

- Full 640×360 logical viewport; art fills the viewport.
- Dialogue panel at the bottom, inside the UI-safe area: `x=24, y=274, w=592, h=78`; Segoe UI 12px; speaker at `y=282`; body at `y=300`; wrap width 552; at most two body lines; hint 9px at `y=344`.
- Visible skip control "[Esc] Bỏ qua" at the top-right.
- Vietnamese text must fit and must not cover faces, the lantern, or the tablet.
- Subtle image/fog effects are optional and allowed only if they do not shimmer or obscure text; fully static art is an acceptable fallback.

Advance and skip:

- Manual advance only; no auto-progress and no forced deadline. Target reading time is 45–60 seconds.
- E, Enter, Space, and click advance. Click is accepted only inside the dialogue area.
- The first advance while typing completes the current line; the next advance moves to the next line. Only the last line of a panel advances to the next panel; the last line of panel 04 finishes the prologue.
- Skip via the visible control or Esc works at any time, including during a typewriter reveal or a crossfade. Skip never bubbles into an advance.
- There is exactly one finish path: fade out (350 ms) then start `CampaignScene` with `{ newGame: true }` exactly once. Repeated finish calls, skip during a fade, or skip after finishing must not start the campaign twice.
- Panel transitions use a 450 ms crossfade. Normal advance input is ignored during a fade, but skip still works.
- Typewriter is scene-local at 24 ms per character; the shared `DialogueSystem` is not modified or generalized.

Entry-input guard:

- Enter/Space/E used to activate New Game in the menu must not advance the first prologue line until the key is released and pressed again, including on a repeat visit to the scene. A real release gate is required; a fixed delay alone is not sufficient.
- Pointer input that selected the menu entry must not advance the panel. Repeated click/double-click is debounced for at least 140 ms.
- `KeyboardEvent.repeat` is ignored. Named handlers are used. The guard resets on every `create`/`init`, not only on the first run.

## 6. Routing

- Menu New Game clears `CampaignSaveSystem` and `SaveSystem` exactly once, then starts `PrologueScene`; repeated activation must not clear or start twice. `PrologueScene` finishes into `CampaignScene` with the new-game intent.
- A confirmed campaign restart from the pause menu clears the campaign save once and routes through the prologue. Cancel does nothing.
- Credits "Play Again" for the campaign keeps its confirmation step, treats Cancel as the safe choice, clears once on confirm as before, and routes through the prologue. Legacy credits behavior is unchanged.
- Continue, completed Continue, legacy Continue, and direct/debug `CampaignScene` starts bypass the prologue.
- `CampaignScene` continues to consume the new-game intent through `consumeCampaignNewGameIntent`. Do not put the prologue inside `CampaignScene.create` based on `newGame`, because the prologue's finish data would loop back into it.
- Register `PrologueScene` in `src/config/gameConfig.ts` without changing the existing Boot/Menu scene ordering.
- Registering the scene and routing are one-shot per campaign start. No persistent "seen" flag is stored.

## 7. Save, state, and audio

- No `localStorage` key, save-schema change, migration, or second reset at finish.
- No item grant, puzzle flag, campaign progress mutation, or persistence of prologue completion.
- The scene owns only its cursor, text objects, images, input, and effects. It accepts and stores no campaign progress.
- The first version adds no sound. Do not call `SoundSystem` from the prologue, do not expand it, and do not claim its existing delayed tones can be canceled. Existing SoundSystem/mute behavior is untouched.

## 8. Missing-texture fallback and lifecycle cleanup

- If one or all four textures are missing, the affected panel falls back to the background color `#081d26` while dialogue and skip remain usable. Existing panels keep using their images. The prologue can still finish or be skipped into Level 01.
- Cleanup on scene shutdown removes only listeners, tweens, timers, and effects owned by the prologue scene. Do not use global `off`/`removeAllListeners`, and do not remove other scenes' input.
- `init()` resets cursor, finishing guard, and entry-input gate on every use. A repeated scene start must not reuse old callbacks or timers.
- Missing textures or a repeated start must not produce two scene starts, stale callbacks, or duplicated listeners.

## 9. Out of scope

- No new dependency, state-machine framework, second general dialogue system, `DialogueSystem` change, sprite sheet, or campaign layout change.
- No change to puzzle logic, `CampaignSaveSystem`, `CampaignStartIntent`, `SoundSystem`, `campaignLevels`, or the ten-level campaign guards.
- The 01–04 demo slice is a separate release slice with its own plan and approval; do not remove levels 05–10 or weaken guards to force a pass.
- No push, merge, deploy, or server action is authorized by this design.

## 10. Verification gates

- Unit/integration coverage through the shipped scene methods and a fake Phaser boundary: panel/line order and copy; advance behavior; one finish; skip in fade/typing; init reset; held entry key; repeat/double-click; per-panel fallback; cleanup after shutdown; no new sound.
- Existing campaign checks, including save/restart/Continue/legacy routing and the ten-level guards, must remain green. `npm run build` must pass.
- Browser checks are separate and must be run before any visual PASS claim: New Game from Enter/Space/E and click, view all four panels, skip at start/middle/end, held input and double-click, Continue, restart/cancel, menu re-entry, mute, and console. Check at 640×360 and a desktop viewport that Vietnamese text fits and faces/lantern/tablet are not covered, and that panning does not shimmer. Scene 02's boot tips near the dialogue area need an actual UI check; report to Sol rather than repainting or stretching art.
- A browser check that did not run is recorded as NOT_RUN. HTTP 200 or a fake renderer does not substitute for a playthrough. Full 01–04 playthrough and human art acceptance are separate gates and are not implied by prologue checks.
