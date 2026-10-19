# Level 05 — art v2 integration

## Scope and decisions

- Work in `codex/levels-05-10-repair`, base `8e265694186d82649ba190f42c89d27eb130d880`.
- Activate the 19 approved source images from `redesign-v2/` through the existing
  `sprites/*.png` asset keys. Keep the sources for reproducible exports.
- User authorized scripted resizing, alpha cleanup and anchor registration.
- Keep background, room layout, saves, puzzle logic, interaction stands and character frames.
- Native sizes: call 40×48; plate 44×28; gate 64×88; latch 28×32; conduit 64×32;
  cable 160×40; ink 240×48; spiral 40×40.
- Use shared source transforms for state families. Register latch states at the pivot,
  pressure states at the rim, cables at the centerline, gates at their base.
- Remove isolated alpha debris; use a restrained shared palette and crisp native alpha.
- Fit gate posts to the existing 10px collision columns. Update visual layer crops
  to the new arch height without changing physics.
- Export the elbow as a compact coupling centered on the real bend, omitting
  fixed right-angle arms that would imply a false route at the authored bends.
- Preserve route segment crop lengths and texture-state swapping.

## Dependencies and risks

- Python/Pillow, NumPy and SciPy are available for the authorized export.
- Generated source states are not exact pixel registrations. Reuse stable structural
  pixels from each family's baseline where possible.
- Gate passage transparency and pipe joints need visual inspection at native size.
- Existing `dist/index.html` is modified before this work; preserve it and do not stage it.

## Verification and review

- Inspect native exports, alpha, dimensions and contact sheets.
- Run TypeScript/production build to an external output directory.
- Capture actual CampaignScene views with an in-memory save fixture for art review.
- Gameplay test suite: NOT_RUN unless requested; no interaction regions change.
- Freeze hashes for the changed source/art, then obtain two independent read-only
  `gpt-6-luna/high` reviews. Re-review any relevant fixes.
- Commit/push/merge are outside this request.

## Delivery — 2026-10-19

The 19 approved artworks now replace the existing Level 05 native textures.
Total native PNG size: **50,377 bytes**. High-resolution sources remain outside
the runtime import glob.

- Shared transforms retain gate bases, lever pivots, plate rims and cable axes.
  Stable baseline structures are reused for powered call/plate/cable states.
- The sent call lights its upper wings; arrival lights all four. The optional
  practice call now also selects these textures and protects its artwork from prompts.
- Gate posts fit the existing 10px collision columns and the foreground arch
  extends to y44. Physics, interaction stands and puzzle progress are unchanged.
- The tube mouth's visible art is 28×14 centered in its existing 64×32 canvas,
  so it no longer dominates the portal. Elbow joints use compact coupling caps.
- Ink states share geometry; lantern-on alpha is 28/255.

### Evidence on the final frozen content

[Final hash snapshot](../../assets/levels/05-a-path-for-two/native-v2-review-snapshot.json)
binds the script, controller, native manifest, 19 sources and 20 runtime sprites
(including the unchanged background): **42 files; 0 hash mismatches** on the final
root inspection. This is an uncommitted change set on the base above.

| Gate | Result | Evidence / limits |
| --- | --- | --- |
| Native export | PASS | `python scripts/export-level05-art.py` exported 19 PNGs; recipes, dimensions and hashes in `native-v2-manifest.json` |
| Production build | PASS | `npm run build -- --outDir C:/Users/Admin/.codex/visualizations/2026/10/15/01a1402c-9306-78e1-a991-c95a32d53f83/level05-art-v2/build`; TypeScript + Vite completed, 625 modules, output 10,742.44 kB |
| Runtime visual inspection | PASS in captured scope | Actual CampaignScene, three rooms, ink with lantern on/off; predefined in-memory saves, no persistent save change |
| Independent review A | PASS in reviewed scope | `/root/level05_native_review_a`, final 42/42 hashes matched, zero findings |
| Independent review B | PASS in reviewed scope | `/root/level05_native_review_b`, final 42/42 hashes matched, prior P2 closed, zero new findings |
| Full gameplay / puzzle test suite | NOT_RUN | No full playthrough or test suite run in this task |
| Commit / push / merge | NOT_RUN | Not requested |

Both reviewers were dispatched with the supported `gpt-6-luna/high` configuration.
The response did not expose a separately resolved model/effort. They received
independent read-only instructions on the same frozen content, not an enforced
filesystem sandbox.

Round 1: A reported no findings; B reported P2 that sent/arrived call cues were
too similar at native resolution. The export now retains idle gold lower wings
in sent and cyan lower wings on arrival. Both independent round-2 reviews accepted
the distinction. Palette regeneration changed the other PNG hashes, so all final
exports were included again in the round-2 snapshot.

### Captured views

The page screenshots include the 640×360 game canvas and fixture context.
They are visual evidence, not a recorded puzzle playthrough.

- [Entry](../../assets/levels/05-a-path-for-two/previews/native-v2-entry-page.png)
- [Relay](../../assets/levels/05-a-path-for-two/previews/native-v2-relay-page.png)
- [Ink, lantern on](../../assets/levels/05-a-path-for-two/previews/native-v2-ink-lamp-on-page.png)
- [Ink, lantern off](../../assets/levels/05-a-path-for-two/previews/native-v2-ink-lamp-off-page.png)
- [Native sprite contact sheet](../../assets/levels/05-a-path-for-two/previews/native-v2-contact-sheet.png)

The temporary visual server and tab were closed after capture. The preexisting
`dist/index.html` working-tree change was preserved; build output went outside the repository.
