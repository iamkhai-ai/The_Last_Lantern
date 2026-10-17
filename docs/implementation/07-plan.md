# Level 07 — The Sleeping Garden: implementation plan

Worktree: `codex/level-07-spatial-rebuild` (base `test-develop` @ `1928ae6`).
Scenario source: `docs/scenario/07-the-sleeping-garden.md`. Spatial spec: `docs/implementation/07-layout.md`.
Planned controller: `src/levels/SleepingGardenLevel.ts`. Pure layout/state: `src/data/sleepingGardenLayout.ts`. Checks: `scripts/check-sleeping-garden.mjs`.
Scope: campaign index 6 only. Levels 05/06 are owned by other branches; do not touch them.

## Goal

Deliver a playable, readable Level 07 in the existing scenic garden: close the reservoir canopy, learn the two-plant rule on the safe practice pots, hold the bar with its latch, turn the lantern off to grow the root bridge, water the nursery, latch the side stone path and reach the shrine gate. Player flow and object collision are the priority; every guidance line must state the next physical action in plain Vietnamese.

## World model (single packed room)

One 640×360 garden, not multiple rooms: `garden-scene-base` already paints the terrace, canals, nursery, practice lawn and shrine gate, and the puzzle never needs two simultaneous local views. The controller owns all index-6 building, updates, story, HUD text, hints, journal and save checkpoints inside the existing CampaignScene.

Light model (matches asset previews 01/02):
- `gardenLighted = canopyShut ? lanternOn : true`. The reservoir glow lights the whole garden until the shutter closes; after that Nhinh's lantern is the only switch. Lumo's light only helps orientation: it never opens Sun Flower or retracts Moon Root (scenario §3).
- Derived plant states (never persisted): Sun Flower open/folded, bar raised/lowered, Moon Root coiled/extended, root bridge on/off.

## Player flow (shipped target)

1. Spawn on the south practice lawn `(238,336)` walking in from the southern mouth; Lumo follows. Opening dialogue from scenario §2 (4 lines).
2. Practice pots (west of spawn, walled lesson corner): while the canopy is still open the pots hold the lit state. Turn west; at the fixed shutter handle `stand (132,138)` press E: the canopy closes over the reservoir, the garden darkens, bar lowers; two-line beat ("Tối đi thật."). First lantern toggle after that plays the four-line practice observation (scenario §3) and every pot shows its state icon.
3. Main gate: with the lantern ON the Sun Flower opens and the bar raises. Walk north through the bar corridor (posts at x99..106 / x194..201, beam line y150..162), then press E at the west latch `stand (142,144)` to hold the bar. It stays raised when the flower folds.
4. Turn the lantern OFF. The practice Moon Root and the main one extend; the root bridge spans the vertical canal `(x304..364, y228..248)`. Cross it in the dark to the nursery.
5. Press E at the drain `stand (462,286)`: water runs east around the sprout, one new leaf opens, the seven-line nursery scene plays (Lumo realizes some things need to sleep), `l6-lumo-realized` is recorded. The distant Sun Flower visibly folds.
6. Press E at the east latch `stand (414,286)`: the side stone path plank retracts permanently, giving a light-independent return crossing at `(x304..396, y284..312)`.
7. Optional: press E at the sprout `stand (500,280)` for the two closing lines.
8. Walk east/up the nursery steps into the eastern walkway and north to the shrine gate. When `drainOpen && sunLatched && sideLatched`, E under the arch plays the shadow ending (scenario §7) and advances to Level 08.

Failure/order recovery, no time pressure: if the player turns the lantern back ON while standing on the root bridge, only the spans under her feet stay (held overlay); empty spans retract and wait until she reaches a bank. Turning the lantern OFF restores the full bridge. The first time the bridge retracts before the drain is open, the three-line "Mở được cửa thì lại mất cầu." exchange plays once.

## Object placement, layering, occlusion

See `07-layout.md` for the full coordinate table. Summary of what is on top of what and what hides what:
- Base scenic image at depth 0. Walkable floor art (teaching waterline, delivered-water chevrons, bridge deck while retracted stubs are not floor) at depth 4–5, below feet.
- Standing props (reservoir, shutter handle, bar posts + beam, both latches, both Moon Root pots, both Sun Flower pots, drain, east latch) use `10 + groundAnchorY/10` so the player y-sorts against them.
- The bar beam is a special case: lowered it collides (solid 107,136,87,26); raised/held it is overhead art (depth 70) so the player walks beneath it and never occludes wrong. Flipping the light inside the corridor while the beam is solid ejects the player to (x,y112) north or (x,y170) south, whichever side is safe.
- Bar posts, tower, walls, balustrades and canal side-walls occlude the player only above their own painted footprint; no blanket depth raise.
- The canopy only dims the scene via the shared LanternSystem (`lantern.isDawnMode = !canopyShut`); the lantern's own glow stays bright so the puzzle reads in the dark.
- Icons (16×16 state stickers) sit at depth 6 beside their pot, on floor pixels, never over the actor.

## Collision contract

- Shared actor body: 14×6 at `center + (-7, +16)`; feet line `center + (0,19)`. Pure layout, Arcade bodies and safe-restore all consume the same rectangles.
- Canals are water: solid everywhere except an open crossing. Crossings: root bridge strip `(y228..248)` with spans `s1 304..350`, `s2 347..396` walkable only while deployed or held under the feet; side path strip `(304..396, y284..308)` walkable only after `l6-return-latched` (before that a solid plank `304,284,92,24` closes it); the sluice crossing over the horizontal canal `(x148..190, y218..258)` is permanent stone.
- Standing props are solid from all four directions using their full silhouette footprint (RULE_GAMES). Flat art (waterline, water chevrons, icons, sprout) is walkable.
- Every interaction trigger sits at the object's south edge with radius 20–24 and a `canApproach` guard where the object can be reached from more than one side (west latch: only from inside the gate corridor). Gate arch exit trigger follows the documented arch exception.
- Backtracking stays open: held bar, retracted plank and opened drain are permanent. A save inside a closed area (canal without a crossing, gate corridor with the bar lowered, nursery with both crossings closed) restores to the nearest safe point with the same body/solid predicate.

## Guidance contract

- Objective line states the immediate physical action per stage, e.g. `Kéo tay màn che bể tích quang (E) ở lối vào vườn.` → `Bật đèn (F) để Hoa Nhật nâng thanh chắn, rồi gài chốt.` → `Tắt đèn (F) cho Rễ Nguyệt bắc cầu, qua mương mở cống.` → `Gài chốt lối đá phụ cạnh cống.` → `Tới cổng điện thờ ở góc đông bắc.`
- H hints follow scenario §6 in three levels, with the two special cases: before the canopy is shut it points at the handle first; after the drain it points at the side path and the shrine gate.
- J journal records the three learned facts: Sun Flower needs light / Moon Root needs dark; the seedling needs water and a rest in the dark; latches keep a change while the lantern flips.
- Prompt labels are action-first Vietnamese (`E · Kéo màn che bể tích quang`, `E · Gài chốt thanh chắn`, `E · Mở cống vườn ươm`, `E · Gài chốt lối đá phụ`, `E · Qua cổng điện thờ`, `E · Ngắm mầm cây`).
- Controls bar lists WASD / E / F / H / J / ESC. Prompts protect the actor, Lumo and the active prop art via `getProtectedPromptBounds`.

## Guidance per step (objective row · H ladder · toast)

`getObjectiveText()` picks the row from live state + lantern; `showHint()` walks a 3-rung ladder per stage (rung text is plain Vietnamese, no solution spoiler); the exit gives locked feedback instead of a silent prompt.

| stage | objective row | H rung 1 (observe) | H rung 2 (relation) | H rung 3 (next step) | toast |
| --- | --- | --- | --- | --- | --- |
| canopy open | *Tới tay màn che trong khe tường phía tây bắc và nhấn E để đóng màn che bể tích quang.* | Cả khu vườn đang được bể tích quang nuôi sáng. | Có một tay màn che ở khe tường phía tây bắc, cạnh bể. | Đi vòng lên phía bắc, vào khe tường và nhấn E ở tay màn che. | "Tối đi thật." / "Nghe kìa." |
| canopy shut, bar not held, lantern ON | *Thanh chắn đang nâng. Vào khe tường phía tây và nhấn E ở tay chốt để giữ nó.* | Thanh chắn đang được Hoa Nhật nâng lên. | Đi qua khe tường khi thanh chắn còn nâng. | Vào trong khe tường và nhấn E ở tay chốt để giữ thanh chắn. | "Chốt đá đã giữ thanh chắn." |
| bar not held, lantern OFF | *Bật đèn (F) cho Hoa Nhật mở, nâng thanh chắn, rồi gài chốt trong khe tường.* | Vườn đã tối đi. Hai chậu thử cho thấy cây cần hai điều kiện khác nhau. | Hoa Nhật chỉ mở khi có ánh sáng. | Bật đèn bằng F rồi tới khe tường phía tây. | first toggle after shut → 4-line practice observation |
| bar held, drain not open, lantern ON | *Tắt đèn (F) cho Rễ Nguyệt bắc cầu qua mương, rồi sang vườn ươm.* | Thanh chắn đã được giữ. Giờ chỉ bóng tối mới đánh thức được Rễ Nguyệt. | Rễ Nguyệt vươn ra khi đèn tắt. | Tắt đèn bằng F rồi qua cầu rễ bắc ngang mương ở giữa vườn. | first retract-before-cross → 3-line "Mở được cửa thì lại mất cầu." |
| bar held, drain not open, lantern OFF | *Bóng tối đang giữ. Qua cầu rễ giữa vườn tới vườn ươm và mở cống.* (west bank) / *Nhấn E ở cống vườn ươm để mở đường nước.* (east bank) | Cầu rễ chỉ bắc khi đèn tắt. | Vườn ươm nằm bên kia mương, phía đông. | Qua cầu rễ tới vườn ươm và nhấn E ở cống để mở đường nước. | 7-line nursery scene (sets `l6-lumo-realized`) |
| drain open, side not latched | *Gài chốt lối đá phụ cạnh cống để mở lối về không cần ánh sáng.* | Nước đã chảy tới vườn ươm. | Có một chốt đá ở lối đá phụ cạnh cống, phía đông nam vườn ươm. | Nhấn E ở chốt để mở lối về không cần ánh sáng. | "Chốt đá đã gài. Lối đá phụ mở rồi." |
| side latched, scene pending | *Nói với Lumo bên mầm cây trong vườn ươm.* | cả vườn đã chăm lại… | …cổng điện thờ nằm ở góc đông bắc… | …đi theo vườn ươm lên bậc đá rồi rẽ lên walkway. | sprout re-read: 2 lines |
| complete | *Tới cổng điện thờ ở góc đông bắc và nhấn E.* | Cả vườn đã được chăm lại. Cổng điện thờ nằm ở góc đông bắc. | Đi theo vườn ươm lên bậc đá phía đông rồi rẽ lên walkway. | Tới cổng và nhấn E. | 5-line ending |

The exit interaction never disappears: while `gardenExitReady()` is false it shows `Cổng điện thờ đang khép · chăm khu vườn trước` and E returns the specific missing step instead of advancing.

## Dialogue beats (complete scenario text)

Opening 4 lines; canopy beat 2 lines; practice observation 4 lines (once); retract-before-crossing 3 lines (once); held+roots-rejoined 2 lines (once after latching then dark); nursery 7 lines (once, sets `l6-lumo-realized`); sprout re-read 2 lines (repeatable trigger, one-shot autoplay); ending 5 lines + shadow crossing at the gate. Cricket ambience noted in text only ("Nghe kìa."), no new audio.

## Persistence

- Reuse v1 save key and existing flag names for compatibility: `l6-canopy-shut`, `l6-sun-latched`, `l6-water-flowing`, `l6-return-latched`, `l6-lumo-realized`, `l6-bridge-crossed`, `l6-crossing-side`, plus the one-shot beats `l6-practice-observed`, `l6-retract-cue`, `l6-held-beat`; `l6-sun-open`/`l6-moon-open` are still written as compat mirrors. Plant states are always derived, never stored. Legacy saves that set old flags load safely; unknown values are ignored.
- Checkpoints: `player-level`/`player-x/y`, `lumo-x/y` saved on the existing cadence; restore uses `nearestSafeSpawn` with the current crossing states.

## Integration (CampaignScene, index 6 only)

- Construct `SleepingGardenLevel` in `buildLevel` for `level === 6` (LibraryLevel/ShatteredCreek pattern); skip generic `addNarrativeProps`, `registerLevel`, `buildCampaignBarriers`, generic spawn block and the generic `intro-6` dialogue for this level.
- Delegate `update`, H (`showHint`), J (`showJournal`), objective/status/controls text and protected prompt bounds to the controller. Remove the legacy index-6 routines so no second garden barrier/crossing/visual pass runs.
- The playtest coming-soon gate is set to `if (this.progress.level >= 4 && this.progress.level !== 6)` in this branch so index 6 is reachable; other indices keep showing ComingSoon. Final gate value reconciles at integration (other branches own 05/06 and add their own index to the same line). Recorded in the report. Known limit: finishing index 6 still routes to the coming-soon screen until every level is integrated.

## Tasks

- [x] Write layout spec `07-layout.md` with zones, solids, crossings, module table, stands and depth rules (this commit).
- [x] Create `src/data/sleepingGardenLayout.ts`: zones/solids/crossings/modules/stands, predicates (`effectiveLight`, `barRaised`, `bridgeDeployed`, `bridgeWalkable`, `sidePathOpen`, `isPositionSafe`, `nearestSafeSpawn`, `completionBlock`, crossing-side state, save sanitize).
- [x] Create `src/levels/SleepingGardenLevel.ts`: render, physics solids, interactions (E/F/H/J), story beats, HUD/objective/status/controls, light→plant visuals, bridge occupancy holding, checkpoints, destroy.
- [x] Integrate index 6 in `CampaignScene.ts`; raise the coming-soon gate; keep every other level's behavior identical. The legacy index-6 barriers/crossing/visual routines were removed with it.
- [x] Create `scripts/check-sleeping-garden.mjs`: geometry (solids vs stands, reachability flood-fill by stage), crossings by state, prompt side rules, state machine (light model, held moments, latch permanence), completion gating, restore safety. Fixes found by the script: moon pot moved to 252,186 so the west bridge approach is walkable; anchor (160,300) sat inside the practice moon pot and moved to (200,300).
- [x] Verify: `node scripts/check-sleeping-garden.mjs`, `npx tsc --noEmit`, `npm run build`. Runtime smoke with a seeded `level:6` save passed (boot, intro dialogue, walk, lantern toggle, no page errors); screenshots in `%TEMP%\opencode\ll07_shots`.
- [x] Write `docs/implementation/level-07-report.md` with exact commands/results and coordinate adjustments.
- [ ] Self-review the diff; no push, no merge, no save resets, no PNG/character edits.

## Risks and decisions

- Preview staging coordinates are illustrative, not collision-true; this plan's rects are authoritative and deviations are documented in `07-layout.md`.
- The bar gate relocates into the reservoir-gate wall so "đi qua rồi gài chốt" is physically required; the Sensor-circuit wording in the scenario covers the Sun Flower being west of the gate.
- Dark state must still be readable: darkness overlay keeps the tower HUD and prompt depths untouched and the lantern glow stays lit.
