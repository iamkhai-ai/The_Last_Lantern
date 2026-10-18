# Review — Levels 05–10 (campaign indices 4–9)

Consolidated defect report for the six levels rebuilt and merged into `test-develop`.

- **Revision reviewed:** `test-develop` @ `b09a19d`
- **Method:** read-only review of scenario, `RULE_GAMES.md`, `campaign-layout-design.md`, each level's
  own layout/plan/report, the level data modules, the level controllers, the shared systems and the
  art registry; plus the pure check scripts, `tsc --noEmit`, and a static audit of save-flag writers.
- **No browser or human playthrough exists on this branch.** Every renderer-level conclusion below is
  static. Items that can only be settled on screen are collected in Appendix D.
- Line numbers refer to the reviewed revision. Items marked `[verified]` were re-checked directly by
  the reviewer of this document; the rest are as reported by the per-level reviews and are consistent
  with the code that was read.

---

## 1. Severity summary

| Severity | Count |
| --- | --- |
| Blocker | 1 |
| Major | 21 |
| Minor | 77 |
| Cosmetic | 15 |
| Systemic / process | 5 |

Per level: Level 05 has 3 major, 14 minor and 4 cosmetic findings; Level 06 has 3 major, 15 minor and
2 cosmetic; Level 07 has 3 major, 13 minor and 5 cosmetic; **Level 08 has no blocker and no major
finding** (5 minor and 1 cosmetic); Level 09 has 8 major (plus the blocker), 17 minor and 2 cosmetic;
Level 10 has 4 major, 13 minor and 1 cosmetic.

**Overall:** five of the six levels are completable. **Level 09 is not.** Level 08 has no blocker and
no major finding. The single blocker, plus one merge-introduced double-update in Level 06 and two
design-breaking defects in Level 10, should be fixed before anything else.

---

## 2. BLOCKER

### B1. Level 09 cannot be completed — `l8-return-loop-open` has no writer anywhere

`[verified]`

The flag `l8-return-loop-open` appears exactly three times in the whole `src/` tree, and all three are
reads: `src/scenes/CampaignScene.ts:1258`, `:1351`, `:1364`. Nothing ever writes it.

The only control that could plausibly do so — the `stone-return-loop` handler at
`src/scenes/CampaignScene.ts:1061-1071` — merely *reports* state:

```ts
} else if (id === 'stone-return-loop') {
  register(
    () => {
      const state = this.getObservatoryWorldState();
      if (!observatoryDoorOpen('return-loop', state)) {
        this.say([{ speaker: 'Nhinh', text: `Lối đá vòng chưa mở được. ${observatoryDoorBlockReason('return-loop', state)}` }]);
        return;
      }
      this.say([{ speaker: 'Nhinh', text: 'Lối đá vòng đang mở. Đường về bệ đèn thông suốt.' }]);
    },
  );
}
```

Consequences, in order:

- `state.returnLoopOpen` is permanently `false`, so `observatoryDoorOpen('return-loop', …)` is always
  false. The control therefore always takes the first branch.
- `observatoryDoorBlockReason('return-loop', …)` falls through to a bare `'Lối đá vòng chưa mở.'`
  (`src/data/observatoryLayout.ts:645-651`), so the on-screen message becomes
  *"Lối đá vòng chưa mở được. Lối đá vòng chưa mở."* — a statement with no actionable step, which the
  scenario explicitly forbids.
- `observatoryRecordBlockReason` adds *"mở lối đá vòng"* (`observatoryLayout.ts:653-661`), so the
  final record can never be opened (`CampaignScene.ts:1079-1088`).
- `l8-balance-crystal` can never be set, so `observatoryCompletionReady`
  (`observatoryLayout.ts:678-681`) is permanently false.
- The only `nextLevel` call for index 8 is gated on that ready check
  (`CampaignScene.ts:1051-1058`), so **Level 09 can never hand over to Level 10**.
- `CampaignScene.ts:1258` also means the return loop's stone strip is never painted.

The pure check passes anyway because `scripts/check-observatory.mjs` drives eight *synthetic* stages
that include `loopOpen: true`, so a missing runtime writer is structurally invisible to it.

**Fix**

1. `src/scenes/CampaignScene.ts:1062-1070` — make the control latch the loop:

```ts
() => {
  const state = this.getObservatoryWorldState();
  if (observatoryDoorOpen('return-loop', state)) {
    this.say([{ speaker: 'Nhinh', text: 'Lối đá vòng đang mở. Đường về bệ đèn thông suốt.' }]);
    return;
  }
  if (!state.bridgeCrossed || !state.finalDoorLatched) {
    this.say([{ speaker: 'Nhinh', text: `Lối đá vòng chưa mở được. ${observatoryDoorBlockReason('return-loop', state)}` }]);
    return;
  }
  this.progress.flags['l8-return-loop-open'] = true;
  this.save();
  this.refreshObservatoryDoors();
  this.say([{ speaker: 'Nhinh', text: 'Lối đá đã khớp vào vòng. Đường về bệ đèn thông suốt ngay cả khi ánh sáng tắt.' }]);
}
```

2. `src/data/observatoryLayout.ts:645-651` — replace the final fall-through line with an actionable
   one: `'Nhấn E tại đây để mở lối đá vòng.'`
3. `scripts/check-observatory.mjs` — add an assertion that the `CampaignScene` source contains
   `flags['l8-return-loop-open'] = true`, so the writer cannot be deleted again silently.

---

## 3. MAJOR

### Level 05 — A Path for Two (index 4)

#### M01. A document claims a browser playthrough that cannot have happened

`docs/implementation/level-05-flow-plan.md:41` states:

> Runtime playthrough (Playwright + Chromium, built `dist/`, seeded save `level:4`): full flow
> entry→exit executed through the real scene. Confirmed in captured screenshots: prompt bubbles …
> closed door stopping the body at y=194 vs open door letting it pass to y=64 …

There is no Playwright dependency in `package.json`, no `node_modules/playwright`, no level-05 browser
probe in `scripts/` (only `level01-browser-regression.cjs` and `level02-browser.cjs` exist), and no
screenshot artefact. `level-05-report.md` records `NOT_RUN` for browser review in all three rounds, and
`docs/implementation/integration-log.md` states explicitly that no level has been played in a browser.
The quoted numbers are exactly what the pure predicate implies, so the paragraph reads as a
hand-derivation presented as a run.

**Fix:** replace line 41 with an explicit `NOT_RUN` row, or attach real artefacts and correct
`level-05-report.md`. The two documents must not assert opposite verification statuses.

#### M02. Door A is hard-gated on practice completion, contradicting the level's own decision

`src/levels/PathForTwoLevel.ts:340` — `callEligible('a')` returns `l4-practice-complete || l4-called-a`.
`l4-called-a` can only be set by a successful `send('a')`, which `interact()` refuses at `:352`; and
`l4-practice-complete` is set only inside `recallToCall()` when the previous assignment was `practice`
(`:421`). The player must therefore complete one full send-then-recall cycle at the practice door before
Door A can ever open.

`docs/implementation/05-layout.md:43` decided the opposite:

> Main A call need not be hard-gated by practice completion: the practice area is a safe lesson, not an
> extra mandatory puzzle. Show practice guidance first, preserve freedom to experiment.

The scenario (§3–§4) also lists no practice prerequisite. Impact is bounded — the objective row guides
the player and the refusal names the prerequisite — but it makes the level stricter than the scenario
and contradicts its own spec.

**Fix:** either return `true` for `'a'` at `PathForTwoLevel.ts:340` (keeping the practice objective
first), or amend `05-layout.md:43` to state that the lesson is mandatory.

#### M03. Published coordinates drifted from the code with no follow-up documentation commit

Commit `c0f6da4` changed geometry but touched only `src/data/pathForTwoLayout.ts`,
`src/levels/PathForTwoLevel.ts` and `dist/index.html`. No documentation commit followed, and two earlier
source changes (`b16a9b3`, `c0f6da4`) have no report round.

| Published | Actual code | Location |
| --- | --- | --- |
| `inner-call` anchor `(244,130)` | `y = 140` | `pathForTwoLayout.ts:136` vs `05-layout.md:31` |
| `latch-b` `(148,240)` / `(148,264)` | `(158,240)` / `(158,264)` | `pathForTwoLayout.ts:159-160` vs `05-layout.md:58`, `level-05-flow-plan.md:12` |
| spiral `40×40` | element `30×30` (uniform 0.75) | `pathForTwoLayout.ts:160` vs `05-layout.md:63` |
| ink stamps depth 5 | depth 4 | `PathForTwoLevel.ts:195` vs `level-05-flow-plan.md:27` |
| door approach "open arch around (480,187)" | door stands `(156,221)`, `(480,221)`, `(110,280)`, `(480,221)`, `(82,280)`, `(574,188)` | `PathForTwoLevel.ts:320` — the room tables list no door stands at all |
| implementation base `64d8e63` | `64d8e63` is stale | `05-layout.md:3` |

**Fix:** update `05-layout.md:31/58/63` and `level-05-flow-plan.md:12/27`, add the two per-room door
stand rows, and add a report round covering `b16a9b3` and `c0f6da4`.

### Level 06 — The Sleepless Tower (index 5)

#### M04. The Level 06 controller runs twice per frame (merge-introduced)

`[verified]`

`src/scenes/CampaignScene.ts:348` and `src/scenes/CampaignScene.ts:367` both call the controller:

```ts
348:  if (this.progress.level === 5) this.sleeplessTower?.update(dt);
...
367:  this.sleeplessTower?.update(dt);
```

Line 348 is the level's own guard from commit `12c6230`. Line 367 was added by the integration merge
`a9c30d7` when the other controllers' unconditional update list was reconciled. Level 06 is the only
controller driven twice: `shatteredCreek` (347) and `gardenLevel` (365) are each called once.

`SleeplessTowerLevel.update()` runs `advanceLumo`, `deriveTowerLive`, `updateVisuals`,
`updateProgress`, `flushPendingStoryBeat` and `updateHud`. Because `Lumo.update` accumulates
`timeElapsed += dt * 0.004` and lerps its position per call, Lumo's hover bob and his travel along the
authored waypoints converge at roughly double the authored rate, and every per-frame derivation is
computed twice.

**Fix:** delete `src/scenes/CampaignScene.ts:367` (keep the guarded call at 348), then re-run
`node scripts/check-sleepless-tower.mjs`.

#### M05. The G2 branch-mirror prompt can be raised from behind the mirror — `RULE_GAMES.md` §1

`src/data/towerLayout.ts:25` gives G2 the footprint `base: rect(298,290,22,10)` — only 10 px tall,
while the mirror art spans y 260–300. Measured against the shipped collision model, 83 walkable centres
inside the 24 px trigger radius have their whole foot body north of that pedestal, from `(309,264)` to
`(322,268)`. At those positions the player is drawn *behind* the mirror (player depth `10 + (y+19)/10`
= 38.3 vs mirror depth 40) yet *"E · Xoay gương nhánh G2"* is shown.

`RULE_GAMES.md` §1: the trigger centre must sit on the south edge and must not reach the north side;
standing behind an object must not show a prompt.

**Fix:** `src/data/towerLayout.ts:25` → `base: rect(298, 272, 22, 28)`. The art is 260–300, so the
taller footprint stays inside the visible sprite; the stand `(309,288)` (body 304–310) remains walkable
and the sampled approach route still clears it. Do not move the mirror itself — the branch beam leg at
y=275 must stay aligned with eye B's optical point at (460,275).

#### M06. The record stand is not at the panel's south edge, so its prompt appears from the west

`src/data/towerLayout.ts:31` — `record: { stand: p(530,182) }`. The panel is drawn centred at
`(582,156)` at 88×32 (`SleeplessTowerLevel.ts:531`), i.e. art rect x 538–626, y 140–172. The stand is
8 px **west** of the panel's left edge and only 10 px below its bottom. A 24 px radius then reaches
sideways: 923 walkable centres inside the trigger circle have their entire foot body west of the panel,
for example `(530,170)` (body x 523–537) and `(524,159)`.

**Fix:** `record: { stand: p(549, 192) }` — under the panel and 20 px below its south edge, matching the
+20 px convention used by every other control. Verified walkable: the body at (542–556, 208–214) is
clear of the chamber solid `(560,180,80,104)` and the lever base `(529,222,22,10)`. Update
`docs/implementation/06-layout.md` Zone C accordingly.

### Level 07 — The Sleeping Garden (index 6)

#### M07. The scenario §7 ending is missing, and its replacement contradicts §7 and spoils Levels 08 and 09

`src/levels/SleepingGardenLevel.ts:78-84` (`ENDING`) does not contain the four mandated lines from
scenario §7:

> Lumo: "Có ai ở đó." / Nhinh: "Người ấy vừa che ánh sáng khỏi luống cây." / Lumo: "Giống việc mình
> vừa làm?" / Nhinh: "Mình tới hỏi xem."

nor the stage direction about a figure crossing the light, stopping by the seedlings and vanishing
behind the stone statue. The shipped text instead says *"Bóng của tôi… dài hơn trước."* and *"Một nửa
khác của chính tôi. Nó vẫn đang ngủ."*

That replacement is wrong on two counts. Scenario §7 deliberately withholds the figure's identity
("Mình tới hỏi xem"). Level 08 introduces The Shadow as a separate character who shields seedlings, and
scenario 08's "hai nửa" refers to Sun and Moon, not to Lumo; Level 09 is where his identity is revealed.
So the extra lines contradict Level 07's own scenario and leak a later reveal.

**Fix:** replace `ENDING` with §7's four lines verbatim and add the crossing beat. The art already
exists and is level-agnostic: `getShadowArtKey('waiting' | 'memory-overlay')` in
`src/art/CampaignArt.ts:103-111,152-155` resolves for any level, and
`assets/levels/shared/characters/the-shadow/sprites/` contains `waiting.png`, `walk-right.png`,
`shielding.png`, `stillness.png`, `turn.png`. Draw `shadow_waiting` at about `(574,84)` behind the arch,
tween it to about `(596,120)` and fade it out when `tryExit()` starts the ending.

#### M08. The scenario §3 teaching exchange can never play on the guided route

`src/levels/SleepingGardenLevel.ts:295-299` fires the four-line `PRACTICE_OBSERVED` only on an
**off→on** lantern toggle after the canopy is shut.

The level is entered with the lantern already on (`CampaignScene.ts:2534-2535` and `:172-173`). The
guided route is: close the canopy with the lantern still on, latch the bar, then follow the objective
row which orders *"Tắt đèn (F) cho Rễ Nguyệt bắc cầu qua mương…"*. From that point nothing on the route
requires the lantern on again — the east latch, the sprout and the exit are all light-independent. So
the only toggle is on→off, the beat is silently skipped, and `l6-practice-observed` is never written.
`07-plan.md:23` describes this beat as firing on the first toggle after the canopy closes, which is not
what the code does.

**Fix:** drop the direction test at `:298`, so the first toggle in either direction after the canopy
closes plays the beat:

```ts
if (this.state.canopyShut && this.progress.flags['l6-practice-observed'] !== true) { … }
```

#### M09. Two claims in `level-07-report.md` are false

`docs/implementation/level-07-report.md:91` contains two statements that the code refutes:

- *"the level has no registered shadow-figure art (that character's sprites belong to level 08), so the
  beat's visual would have been invisible"* — false. `CampaignArt.ts:103-111` globs
  `assets/levels/shared/characters/the-shadow/sprites/*` into `CAMPAIGN_ART_FILES` for the whole
  campaign, the PNGs exist (14 files), and `getShadowArtKey()` is level-agnostic. The stated blocker
  does not exist.
- *"The scenario's observation ('Người ấy vừa che ánh sáng khỏi luống cây') is preserved in the level's
  journal/nursery scene instead"* — false. Neither `showJournal()` (`:217-230`) nor `NURSERY_SCENE`
  (`:60-68`) contains that sentence or its sense; the journal's six possible lines are unrelated.

**Fix:** delete or rewrite both bullets. The honest statement is "§7's shadow beat is not implemented —
neither art nor text", which is M07.

### Level 09 — Dark Moon Observatory (index 8)

#### M10. The entire scenario §2 opening is missing

`src/scenes/CampaignScene.ts:71` still holds the pre-rebuild two-line placeholder:
*"Ba phòng quan sát cùng hướng về Cây Mẹ."* / *"Tôi nghe tiếng mưa trong ký ức. Có ai đó đã gọi tôi từ
tòa tháp này."*

None of the eight mandated §2 lines exist anywhere in `src/` (a grep for `bánh xe`, `tiếng nó từng
quay`, `Chính đường này`, `đi chậm lại`, `cậu ở gần` returns nothing). The Lumo tube-flight beat is also
absent — `callObservatoryLumo` is only invoked by an E interaction (`CampaignScene.ts:992-1000`).

**Fix:** replace `OPENING[8]` with the eight lines verbatim, and play the tube-flight beat on first entry
from `buildObservatoryRoom` (set `l8-lumo-room = 'corridor'`, place Lumo at the `lumo-tube-entry`
waypoint `(105,78)`, set no route flag).

#### M11. Three required lines are missing from the §5 memory scene

`playObservatoryMemory()` (`CampaignScene.ts:1133-1146`) implements 12 of the 15 authored lines. It
drops:

- Lumo: *"Và tôi đã giúp ông. Nếu tôi làm sai lần nữa thì sao?"*
- Nhinh: *"Ở khu vườn, cậu đã giúp tôi tắt đèn. Ở điện thờ, cậu đã giữ bóng cho những mầm cây."*
- Nhinh: *"Lần này mình biết nhiều hơn. Mình cũng có thể dừng lại khi thấy điều gì không đúng."*

It also merges §5's *"Tôi đã giữ ấn."* and *"Tôi tưởng mình đang giúp ông ấy đưa mọi người về."* into a
single line at `:1138`. These three lines are the reply that makes the record's silence land.

**Fix:** insert the three lines in scenario order between `:1140` and `:1141`.

#### M12. The §7 closing exchange is missing, and two §4 conditional exchanges are missing

The final exit dialogue at `CampaignScene.ts:1052-1055` plays *"Bản ghi đã được giữ…"* plus *"Lần này
mình đi cùng nhau."* instead of the mandated §7 trio (*"Tôi vẫn sợ." / "Cậu cứ nói khi sợ. Mình sẽ cùng
nhìn lại đường đi." / "Vậy… mình về Cây Mẹ thôi."* — a grep for `vẫn sợ` finds nothing).

Two §4 conditional exchanges are also absent:

- *"Cửa đã mở. Ánh sáng lại đang phủ lên rễ." / "Có đường qua khung tượng. Ở điện thờ mình từng giữ được
  một vùng tối như thế."* — the direct-G2 case has no dialogue at all, only an H hint.
- *"Tôi vẫn giữ ấn. Đường sáng từ tiền sảnh đang hướng đi chỗ khác."* — reachable only by interacting
  with the seal, and that line is worded differently. Redirecting G0 is silent.

**Fix:** use the §7 trio for the exit; fire the first §4 pair once when
`sunDoorUnlocked && !bridgeEligible && !l8-direct-route-told`; fire the second when `lumoAtSeal` and the
live route goes `off` while `mirrors.g0 !== 1`.

#### M13. The objective row is not room-aware for the Door A latch step

`observatoryObjective` returns the same string in all three rooms. At the un-latched stage it says
*"Đi tới cửa A ở tường phía đông và nhấn E để sang hành lang phòng sao."* (`observatoryLayout.ts:718`).
The latch step requires standing in the corridor, where Door A is on the **west** wall — so the row
tells the player to head east into the room they are already in, and shows the same text in the
observatory.

**Fix:** branch on `roomId` for that stage, e.g. in `corridor` →
`'Gài chốt cửa A ở chân cửa phía tây hành lang bằng E để giữ cửa mở lâu dài.'`

#### M14. The status row lies about the Sun Door

`observatoryStatus` (`observatoryLayout.ts:734`) prints
`state.sunDoorUnlocked ? 'đang mở' : 'đang khóa'` — the **live beam only**. The door itself uses the
durable latch (`observatoryDoorOpen` → `sunDoorUnlocked || sunDoorLatched`, and
`observatoryDoorBlockReason` correctly returns `''`). After the Sun Door latches and the lantern is
retrieved — the completion sequence — the HUD reads *"Cửa Mặt Trời đang khóa"* for a door the player
walks through.

**Fix:** `const sun = observatoryDoorOpen('sun-door', state) ? 'đang mở' : 'đang khóa';`

#### M15. A placed lantern's light pool is drawn in whichever room the player is standing in

`LanternSystem.update` (`src/systems/LanternSystem.ts:118-119`) computes
`lightX = lanternPlaced ? placedX : playerX + 6` and draws the halo at depth 69, and
`CampaignScene.ts:340` calls it every frame regardless of room.
`restoreObservatoryLanternPlacement()` re-places the lantern on every room build
(`CampaignScene.ts:1517-1525`). Level 09 is the only three-room level, so while Nhinh is in the corridor
or the observatory with the lantern on the entrance pedestal at `(188,232)`, a bright halo glows at
`(188,226)` in a room where no lantern exists.

**Fix (level-scoped):** in `buildObservatoryRoom`, when `activeObservatoryRoom !== 'entrance' &&
lanternPlaced`, skip `restoreObservatoryLanternPlacement()` or point `placedX/placedY` at the player; or
add a room guard inside `LanternSystem` so the halo only follows a placed lantern in its own room.

#### M16. Every door sill is painted as opaque masonry even when the door is open

`drawObservatoryWalls` (`CampaignScene.ts:659-674`) fills `alcove.threshold` with `0x232a34` at alpha
0.85 and strokes a permanent outline. `buildObservatoryDoors` / `refreshObservatoryDoors`
(`:755-767`, `:1316-1338`) only swap the arch texture and its alpha. An **open** doorway therefore reads
as a solid wall block with a translucent arch on top, including the sill the player must walk into to
reach the transit trigger (for example `door-a-entrance 536,156,104,48`).

**Fix:** exclude `alcove.threshold` from the wall fill (or re-fill it with the floor colour) and repaint
it in `refreshObservatoryDoors` when the door opens or closes.

#### M17. The entrance and corridor backgrounds are staging mock-ups with baked debug annotations

Measured on disk:

- `assets/levels/09-dark-moon-observatory/sprites/lobby-base.png` (640×360) carries a caption panel with
  icons and the literal annotation **"E · ghi chép đã học"** at roughly x 256–480, y 38–122, plus
  placeholder props in the play area (a pedestal glyph at about (95,190), a "G0" label at about
  (190,190), a grey door at about x 545–605, y 180–258).
- `assets/levels/09-dark-moon-observatory/sprites/star-chart-base.png` (640×360) carries baked **"G1"**
  labels at about (95,190) and (240,190), mirror icons, a star-chart panel with annotation polylines at
  about x 195–310, y 25–80, and a placeholder floor ladder at about y 205–270.
- `observatory-clean-base.png` is the only clean plate, and `observatory-base.png` (the hand-off base
  with the caption strip) is correctly never loaded.

The debug-plate ban is therefore honoured for the observatory room but **not** for the other two rooms.
The baked placeholders also contradict the authored layout the player actually collides with (baked G0
at x≈190 vs the authored 432; baked floor ladder y 205–270 vs the authored floor band y 88–304).

**Fix:** replace `lobby-base.png` and `star-chart-base.png` with clean plates, or force the no-base
fallback path (`CampaignScene.ts:1251-1257`) for those two rooms until clean art exists.

### Level 10 — The Heart of Elaria (index 9)

#### M18. A merely following Lumo already satisfies the Hope seal

`[verified]`

`src/data/heartOfElariaLayout.ts:511`:

```ts
const lumoAtSeal = Math.hypot(input.lumo.x - 320, input.lumo.y - 244) <= HEART_SEAL_RADIUS;
```

This measures live distance only; it never requires Lumo to be holding the seal. In follow mode
`HeartOfElariaLevel.ts:497-502` drives him toward `player.x - 20, player.y - 18`, and `Lumo.update`
(`src/actors/Lumo.ts:31-35`) adds `+18 / −12`, so his sprite settles at `player + (−2, −30)`. Standing at
about `(320,274)` therefore puts him inside the seal radius.

An exhaustive scan over `HEART_FLOOR` with the branch configuration solved
(`g0=0, memoryMirror=1, balanceMirror=2, statue=2, lantern placed and lit, three crystals`) found **1093
reachable positions (y 254…286)** where Lumo counts as at the seal while still in follow mode, with
`ready === true` at all of them; 929 of those lie inside the `heart-confirm` gate (x 302…342,
y 262…286). So the player can press E on the central node — whose prompt *"E · Khóa vòng rễ"* is live
there — without ever calling Lumo, which contradicts scenario §4 step 1 (*"Gọi Lumo tới ấn Hy Vọng"*)
and the Hope row's condition *"Lumo còn đứng ở ấn"*.

Two secondary symptoms: `updateBeats` (`HeartOfElariaLevel.ts:539-544`) fires `STABLE_LINES` (*"Ba màu
đã nối thành một vòng!"*) from the same coincidence, and `refreshBranchArt` (`:1010-1011`) draws
`pressure-empty` because `lumoMode === 'follow'` while the Hope root is drawn `repaired`.

**Fix:** add `lumoHolding: boolean` to `HeartPuzzleInput` (`heartOfElariaLayout.ts:275-287`) and change
line 511 to `const lumoAtSeal = input.lumoHolding && Math.hypot(...) <= HEART_SEAL_RADIUS;`; pass
`lumoHolding: this.lumoMode === 'holding'` from `HeartOfElariaLevel.state()` (`:293-309`); set
`lumoHolding: true` in the check's `baseInput()` and add a negative case (Lumo on the plate with
`lumoHolding: false` must give `ready === false`). Reload keeps working because `build()` already
promotes to `'holding'` when the saved Lumo position is within 20 px of the seal (`:239-242`).

#### M19. The optional rule-mat step gates the objective row and the whole H ladder

`heartOfElariaLayout.ts:569-573` returns `'teach'` when `!taught`, **before** the lantern, seal and route
tests. `HeartOfElariaLevel.ts:315` sets `taught` from `l9-rules-read`, which only the rule mat sets
(`:777-783`). Scenario §3 states the mat is optional — it "chỉ nhắc quy tắc… Người chơi có thể bỏ qua
nếu đã nhớ".

Consequence: a player who skips it sees *"Đọc bàn rễ cạnh bệ đèn để nhắc lại ba quy tắc."* (`:342`)
through the entire lantern and branch phase, and H only serves `HINTS.teach` (`:96-100`), so the
scenario's own route ladder and the *"còn N điều kiện chưa đúng"* counter (`:351-354`) are unreachable.

**Fix:** make `teach` non-blocking: `heartOfElariaLayout.ts:570` →
`if (!input.taught && !input.lanternPlaced && !input.called) return 'teach';`

#### M20. The scenario §7 closing dialogue is missing from the ending

`src/scenes/EndingScene.ts:126-130` defines exactly three text pages. Page 1 (`:128`) ends at Lumo's
*"Lần này, chúng ta đã để đêm đi hết con đường của nó."* and omits Nhinh's reply *"Và bình minh tự tìm
được đường về."* The whole §7 lantern exchange (*"Cậu vẫn mang nó theo chứ?" / "Có. Trên đường chắc sẽ
còn lúc cần một ngọn đèn." / "Còn khi không cần nữa?" / "Mình sẽ tắt đi."*) is absent.

**Fix:** append Nhinh's line to page 1 and insert a fourth page with the §7 lantern exchange before the
`this.scene.restart({ showCredits: true, … })` call at `:137`.

#### M21. On the campaign credits, one E press wipes the completed save

`[verified]`

`EndingScene.ts:12` and `:22` both set `selectedIndex = 0`, which is
`PLAY AGAIN (CHƠI LẠI TỪ ĐẦU)`. The credits state binds `E`, `SPACE`, `ENTER` and the arrow keys
(`:146-153`) and `triggerSelected()` runs the highlighted action (`:163-169`), which calls
`CampaignSaveSystem.clear()` and starts a new campaign (`:184-188`). The player arrives at the credits
by pressing E three times to page through, so the reflex "press E to continue" destroys `l9-complete`
and the ending can never be reached again from that save.

**Fix:** default `selectedIndex` to `1` (main menu) for the campaign credits, or require a second
confirmation for `PLAY AGAIN`.

---

## 4. MINOR

### Level 05 (14)

1. Two controls fight over the nearest target at the ink exit: `l4-latch-c` at `(550,218)` r22
   (`PathForTwoLevel.ts:319`) and `l4-door-c` at `(574,188)` r24 (`:321`) are 38.4 apart, less than
   22+24. Disputed zone x 552–570, y 197–211; at `(559,198)` the exit wins, at `(567,208)` the latch
   wins, and the 3 exact ties resolve to the latch by registration order.
   **Fix:** move `l4-door-c` to `(578,190)` and update the `reach(…, {x:574, y:188})` assertions in
   `scripts/check-path-for-two.mjs:80-81`.
2. `latch-c` goes completely silent instead of giving locked feedback: `interactionEnabled('latch-c')`
   (`PathForTwoLevel.ts:345`) is false until the ink has been discovered, and `InteractionSystem` skips
   disabled items, so pressing E does nothing at all. This contradicts
   `campaign-layout-design.md` ("Gates/doors give useful locked feedback; they do not disappear from
   interaction just because prerequisites are unmet").
   **Fix:** always enable it in the `ink` room and add an explicit refusal in `interact`, naming the
   missing step (turn the lantern off with F and walk the corridor to read the ink).
3. The ink trail is drawn twice, 132 px out of phase: `PathForTwoLevel.ts:195` places two native 240×48
   stamps at x 304 and 412, so the middle third of the corridor (x 292–424) shows two offset dash
   patterns. **Fix:** one stamp at `(358,242)`, or a `TileSprite` over the 348×48 corridor.
4. Root cables never reach the objects they connect: `addCable()` (`PathForTwoLevel.ts:258-264`) draws
   one native 160×40 image at the chord midpoint, while the authored chords are 205–380 px long.
   **Fix:** emit one image per ≤160 px polyline segment along the route.
5. The seven-line memory scene fires at latch C rather than while Lumo travels back through the last
   pipe (`PathForTwoLevel.ts:360` vs scenario §4 step 6 and §5). **Fix:** move the `say(MEMORY, …)`
   call into the recall branch, or record the deliberate reorder in `05-layout.md`.
6. Return-arrival spawns sit 9 px inside the door prompt radius: `getPathBackArrival()` returns
   `(480,230)` while the door stands are `(480,221)` r24 (`pathForTwoLayout.ts:33-36`). Held E can
   ping-pong the player between rooms. **Fix:** `{ x: face.x, y: face.base + 40 }` → `(480,250)`, and
   update `check-path-for-two.mjs:43-46`.
7. The pre-reunion objective does not name the control: *"Gọi Lumo trở lại, rồi chờ cậu ấy tới gần."*
   (`PathForTwoLevel.ts:114`). **Fix:** *"Nhấn E ở tay gài C để gọi Lumo trở lại, rồi chờ cậu ấy tới
   gần."*
8. Unreachable branch: `PathForTwoLevel.ts:104`'s recovery line can never display, because
   `isPathThresholdOccupied('entry','practice',…)` returns true for any position with `x<320 && y<180`,
   so `pathDoorShouldClose` is always false while the player is in the alcove — yet `05-layout.md`
   advertises that line. **Fix:** delete the branch or change the occupancy rule.
9. `pendingClose` (`PathForTwoLevel.ts:40`) is written and never read; the deferred close is actually
   implemented by `body.enable` per frame. **Fix:** delete.
10. `l4-lumo-arrived` is written at `PathForTwoLevel.ts:490` and read nowhere in the repo. **Fix:**
    delete.
11. `nearestSafePathSpawn`'s last-resort fallback `(180,280)` (`pathForTwoLayout.ts:188`) clips the
    relay room's lower wall band `{142,300,474,10}`. Unreachable in practice, but it is the one
    fallback that is not safe in every room. **Fix:** make it room-aware
    (`PATH_ROOMS[room].entrySpawn`).
12. `scripts/check-path-for-two.mjs` does not assert RULE_GAMES §1 (prompt side), nearest-target
    distinctness, or any literal coordinate, so M03's drift and item 1 pass unnoticed. **Fix:** add a
    per-control table of legal body positions on all four sides, an overlap assertion, a back-arrival
    distance assertion, and a literal expected-value table for every anchor/stand/solid.
13. The spiral engraving is half on the floor: element `(612,282)` scaled 0.75 puts its visible content
    at x 607–621, y 275–292, while the east wall begins at x=616 (`pathForTwoLayout.ts:154,160`).
    **Fix:** set the element x to about 622 and the repeat stand to about `(596,262)`, then update
    `05-layout.md:63`.
14. A pipe mouth is drawn in the middle of the exit doorway: `addNativeArt('tube-mouth', 574, 136, 0)`
    (`PathForTwoLevel.ts:197`) sits over door C's 64×88 frame. `tube-elbow.png` is registered but never
    referenced. **Fix:** remove or move the mouth; use or drop the elbow.

### Level 06 (15)

1. The record interaction disappears entirely before the crystal is collected:
   `SleeplessTowerLevel.ts:351` passes `enabled: () => this.state.crystal`, so there is no prompt and no
   refusal. **Fix:** drop the enable guard and mirror the chamber's locked prompt plus a refusal line in
   `useRecord()`.
2. The exit condition is stronger than scenario §7: `getTowerExitBlock` (`towerLayout.ts:162`) adds a
   fifth `'companion'` gate and `deriveTowerStep` adds a `'recall'` step, so a player who did exactly
   what the scenario lists can be stopped at the stairs. **Fix:** record it as a justified strengthening,
   or remove it and update the check's assertions.
3. Two scenario narration beats are missing: §5's *"Tiếng máy trong bản ghi tăng lên, rồi tắt. Nhinh
   nhìn chiếc khăn trên bậu cửa."* (`SleeplessTowerLevel.ts:63-71`) and §7's opening narration about the
   flowers under the tower — the hook Level 07 pays off (`:77-80`). **Fix:** insert both using the
   existing `'Hệ thống'` speaker convention.
4. The §3 bench exchange is skippable: `deriveTowerStep` only returns `'practice'` when the lamp source
   is not `'main'`, so carrying the lamp straight to the main pedestal skips `BENCH_LESSON`. **Fix:**
   also fire it on first proximity (< 40 px) to the bench mirror stand.
5. The H ladder is shorter than the scenario's three levels for `main`, `call` and `switch`:
   `HINTS` (`SleeplessTowerLevel.ts:91-102`) starts at the level-2 text, so the scenario's level-3 line
   appears on the second press instead of the third. **Fix:** prepend the §6 level-1 observation line.
6. HUD title deviates from the campaign format: `SleeplessTowerLevel.ts:648` hardcodes
   `'06  Ngọn Tháp Không Ngủ · Hy vọng'`, while every other level renders
   `${NN}  ${CAMPAIGN_LEVELS[n].title}   ·   ${chapter}`. **Fix:** build it from `CAMPAIGN_LEVELS[5]`
   or align the literal.
7. Wall art intrudes into the top HUD band: fountain-up reaches y 47 and tower-lamp-white y 51
   (`SleeplessTowerLevel.ts:524-525`), and window-faded-red-scarf reaches y 36 (`:530`), while the
   longest objective string paints its backdrop across that x-band. **Fix:** move the fountain and lamp
   centres down (about y 122 and 106), keep the window's top below y 58, or shorten the objective rows.
8. Doc/code depth drift: `06-layout.md` Zone C says the tower lamp is depth 20–22 behind the fountain
   and the fountain depth 20, but the code draws fountain 8.0 and lamp 8.1 — i.e. the lamp is in front.
   **Fix:** correct both tables to 8.0 / 8.1 and state that both sit below the standing-prop band.
9. `06-report.md` and `06-layout.md` overstate the check: "four-direction solid contacts" is in fact two
   point assertions, and the claimed "next-level index 6" assertion does not exist. **Fix:** add a
   per-solid four-direction sweep and either a next-level assertion or delete the claim.
10. No check can catch M05/M06: nothing in the pure layer encodes "prompt only from the south edge".
    **Fix:** export an `interactiveStands` list with art rects and assert, for every walkable centre
    inside the radius, that the body is not behind and not entirely beside the art.
11. The player's head can be drawn inside the top HUD band: `TOWER.bounds` (`towerLayout.ts:18`)
    constrains only the 6 px foot body, so the centre reaches y 72 and the 42 px sprite reaches y 51.
    **Fix:** raise the north bound to `rect(24,110,592,200)`.
12. Two decorative gaps are narrower than the contract's 36 px minimum: 18 px between the two bench eye
    bases and 23 px between the bench source and mirror bases. Neither is on a required route.
    **Fix:** separate the eye heads (e.g. x 118 / 166) or record them as deliberate.
13. Dead leftovers in the level-06 path: `CampaignScene.ts:543` places the lantern at legacy
    coordinates `(120,205)` for index 5 although that branch returns earlier at `:494`;
    `CAMPAIGN_LEVELS[5]` (`campaignLevels.ts:15`) still carries the pre-rebuild objective and hints;
    `useCall()` writes the legacy `l5-called-high` / `l5-return-called` flags which only the dead legacy
    block and the pre-v2 migration read. **Fix:** delete the stale placement line, refresh
    `CAMPAIGN_LEVELS[5]`, and drop or comment the legacy flag writes.
14. `06-layout.md`'s save section omits the flags the code actually writes (`l5-one-seen`,
    `l5-three-seen`, `l5-bench-seen`, `l5-called-high`, `l5-return-called`, `intro-5`). **Fix:** update.
15. `06-plan.md`'s acceptance criterion "no second `Lumo.update` runs in the level 06 frame" was
    invalidated by the merge (M04) and no document records it. **Fix:** record it, then fix M04.

### Level 07 (13)

1. Objective rows and H rungs hand over the solution before the practice pots teach anything, e.g.
   *"Bật đèn (F) cho Hoa Nhật mở, nâng thanh chắn, rồi gài chốt trong khe tường."*
   (`SleepingGardenLevel.ts:182-192`) and H rung 2 *"Hoa Nhật chỉ mở khi có ánh sáng."* (`:215-260`).
   `campaign-layout-design.md` requires no spoilers in HUD. **Fix:** gate the mechanism wording on
   `l6-practice-observed`.
2. The retracted root bridge blocks nursery floor with no visible art: `GARDEN_SPANS.s2` plus `s1` is
   95 px of collider, but `root-bridge-off.png` has an opaque bbox of only x 1–13, so roughly x 364–396,
   y 228–248 is solid with zero pixels of art — contradicting `07-layout.md`'s "no invisible blocker sits
   over open floor". **Fix:** use the already-shipped, currently unused
   `shared/garden-mechanisms/root-bridge-missing.png` (opaque bbox x 1–47) as the `off` variant, or add a
   mirrored stub per span. Do not shrink `s2`'s west edge — that is the canal slot.
3. The raised/held bar image contains both posts but is drawn at depth 70, so it overdraws the actor at
   player centres about 114–125 and 176–187 (`SleepingGardenLevel.ts:605-625`). **Fix:** draw the posts
   as separate images at prop depth and keep only the beam at 70.
4. The garden status row and the shared controls bar overlap: the status row at y 320 is about 21 px
   tall and the controls bar at y 344 (origin bottom) about 17 px, with the garden's long status string
   about 370 px wide (`CampaignScene.ts:462`, `:1727-1730`, `SleepingGardenLevel.ts:201-206`).
   **Fix:** shorten the status string (e.g. `Màn:đóng · Nhật:nở · Chốt:giữ · Nước:chảy · Lối phụ:mở`) or
   raise the row, after a browser check.
5. The H row is missing the "talk to Lumo" stage: `stage` becomes `'exit'` as soon as `returnLatched`
   even while `lumoRealized` is false (`SleepingGardenLevel.ts:209-213`), so H contradicts the objective
   row. **Fix:** add a `'scene'` stage with rungs pointing at the sprout stand `(500,280)`.
6. Pressing E at a disabled mechanism is silent: `getPrompt()` returns null and `isEnabled()` false, so
   the handle, west latch and drain vanish from interaction with no feedback
   (`SleepingGardenLevel.ts:472-520`). **Fix:** give disabled controls a locked label.
7. `lumoRealized` makes completion stricter than the scenario: `gardenCompletionBlock` returns `'scene'`
   until it is set, while scenario §7 lists only drain, both latches and reaching the gate.
   **Fix:** accept as design and document it next to `completionBlock`, or drop it.
8. The drain and sprout prompt circles overlap: `(462,286)` r24 and `(500,280)` r24 are 38.5 apart.
   Measured: 7 reachable cells have both in range, and the drain is nearer in all 7, so the mandatory
   control is never shadowed. **Fix (optional):** `sprout: { x: 510, y: 278, radius: 20 }`.
9. `07-layout.md`, `07-plan.md` and `level-07-report.md` still describe the removed coming-soon gate and
   the "finishing index 6 routes to the coming-soon screen" limit, both stale. **Fix:** update.
10. `level-07-report.md`'s remaining-limits section claims verification by re-rendering the level from
    the real PNGs and by pixel-measuring sticker coverage; no such script or artefact exists. **Fix:**
    delete the claim (the sticker part is now covered by the committed script).
11. `07-layout.md`'s prompt-rules section claims the script verifies a 20–24 radius band and the
    northern-face rule with the authored 14×6 body; it asserts neither. **Fix:** correct the doc or add
    the assertions.
12. `07-plan.md`'s guidance table lists eight stages including a separate "side latched, scene pending"
    row; the code has seven (item 5). **Fix:** align.
13. `07-layout.md` has no table for `GARDEN_WATER` (the three lethal rects `312,96,44,132`,
    `312,248,44,36`, `28,226,120,24` are prose only). **Fix:** add the table.

### Level 08 (5)

1. The exit refusal names only the first unmet prerequisite:
   `RuinsOfTwoHalvesLevel.ts:633-639` and `:796-809` resolve a single block via `getRuinsExitBlock`
   (`ruinsOfTwoHalvesLayout.ts:453-459`), so a player missing both the latch and The Shadow only sees
   *"Điện thờ còn khóa"* (`:799`), while `usePedestal` (`:741-748`) correctly enumerates all conditions.
   **Fix:** build a `missing[]` from `{latched, lanternRetrieved, metShadow}` and name all three.
2. A stale level-7 lantern restore line survives: `CampaignScene.ts:542` places the lantern at
   `(120,205)` when `l7-lantern-placed`, which `08-plan.md:227` explicitly said to remove. It is
   harmless today because `restoreLanternPlacement()` (`RuinsOfTwoHalvesLevel.ts:269-280`) overrides it
   with `placeLanternAt(480,220)` in the same synchronous frame, but it is a live path using a
   hard-coded legacy coordinate. **Fix:** delete line 542.
3. Dead flag `l7-shadow-talked` is written at `RuinsOfTwoHalvesLevel.ts:782` and read nowhere.
   **Fix:** read it (e.g. gate the journal's spiral line) or drop the write.
4. The check does not assert the mirror-art orientation it is credited with, and one collider credit is
   weaker than described: `08-plan.md:106` claims a bright-bar slope verification that does not exist in
   `check-ruins-of-two-halves.mjs` (only width/height of `mirror_1`/`mirror_0` is asserted at `:588-592`),
   and `08-layout.md:182` claims an overhang bound that `:617-627` does not measure. **Fix:** add the
   assertions or correct both documents.
5. Doc typo: `08-layout.md:99` writes `rightInbound = (400,238) → (400,238)`; the code
   (`ruinsOfTwoHalvesLayout.ts:222`) is `(320,238) → (400,238)`. **Fix:** correct.

### Level 09 (17)

1. The return-loop alcove sits inside the status band. Exact geometry: threshold `496,300,48,34`, jambs
   `488,300,8,60` and `548,300,8,60`, inspect `520,262` r22, trigger `520,318` r28, arch `496,300,48,34`,
   plus masonry `496,334,48,26`. The floor band ends at y 300 and the foot body is 14×6 at centre
   `+(-7,+16)`, so the deepest walkable centre is y 312 and the 42 px sprite spans 291–333 — the lower
   1–13 px are painted over by the status row at y 320.
   **Fix:** move the pocket north — threshold `496,262,48,34`, jambs y 262, arch `496,262,48,34`, inspect
   `(520,224)`, trigger `(520,280)`, and replace wall `496,334,48,26` with `496,296,48,26`. Sill depth
   stays 34, so the existing `depth >= 34` assertion still holds. Regenerate `09-layout.md` afterwards.
2. Statue and root-bed prompts fight over the nearest target: stand `(296,270)` r22
   (`observatoryLayout.ts:336-341`) and `(330,252)` r24 (`:349-357`) are 38.5 apart, and both approach
   guards hold inside the lens. Disputed zone about x 313–318, y 259–263; the tie point is `(313,261)`,
   where first-registered wins (statue). **Fix:** move the root-bed stand to `(352,252)`.
3. One sprite is stretched: `observatoryLayout.ts:342-344` declares `nativeWidth 36, nativeHeight 44`
   for `lock-sun-off`, while the real PNG is 32×40 — a 12.5 % / 10 % stretch. The check's aspect
   assertion (`:169-172`) compares the declaration with itself, so it can never catch this. **Fix:** set
   `nativeWidth: 32, nativeHeight: 40` for `sun-door-control` and `sun-lock`, and add a `measurePng()`
   comparison against the resolved file path.
4. The memory overlay tints the HUD and prompt layers: `CampaignScene.ts:720` creates the amber
   rectangle at depth 94, above the prompt container (82) and HUD (86), contradicting `09-layout.md`'s
   own "nothing can draw over the HUD". **Fix:** draw it at depth 84.
5. The Shadow's waiting pose overlaps the loop receiver: anchor `(468,250)` with 36×48 art spans
   450–486 × 202–250, while the `stone-return-loop` art is 452–480 × 218–252 at depth 35.2 versus the
   Shadow's 35.0 — so the receiver draws over his legs and he stands on the loop control instead of
   beside the record. **Fix:** move him to about `(445,262)`.
6. The final-door prompt loses its E affordance exactly when it becomes the level exit:
   `observatoryPrompt('final-door-control')` returns `'Chốt cửa cuối đã gài'` once latched
   (`observatoryLayout.ts:827`). **Fix:** `'E · Trở về Cây Mẹ'` when latched and completion-ready,
   otherwise `'Chốt cửa cuối đã gài — E để trở về Cây Mẹ khi đủ điều kiện'`.
7. `roomDoors` is dead: declared `CampaignScene.ts:91`, cleared `:841`, iterated `:1331`, never set.
   **Fix:** delete the field and the loop.
8. `CAMPAIGN_LEVELS[8]` still holds the pre-rebuild objective and hints, and the hint contradicts the
   shipped rule (it says the stair-shadow appears when the lantern is off, while the bridge actually
   needs the lantern on, the Sun lock lit, the statue shadow and Lumo at the seal). It is written into
   the HUD for one frame at `CampaignScene.ts:617` before `refreshHud()` replaces it. **Fix:** update the
   entry.
9. Level 10 receives a stale Lumo position: level 09 saves only `l8-lumo-x/y`
   (`CampaignScene.ts:305-306`), while `HeartOfElariaLevel.build()` reads `lumo-x`/`lumo-y`
   (`HeartOfElariaLevel.ts:199-202,235-237`), which were last written by level 08. **Fix:** also write
   the generic counters before `scene.restart()`.
10. Engine and pure model disagree at the final-door head: `observatorySolidRects` drops
    `OBSERVATORY_FINAL_DOOR_HEAD (468,100,64,52)` once `finalDoorLatched`
    (`observatoryLayout.ts:522`), but the floor band starts at y 152 and no sill covers that rect, so
    `observatoryFloorAllows` still calls the pocket unwalkable (`:529-548`). The engine lets the player
    stand there; the checkpoint then stores a different spawn, so there is no strand, but the model and
    the engine disagree. **Fix:** add the rect to the walkable regions when latched and to the check's
    floor union.
11. RULE_GAMES §1 tolerance is loose for wall-mounted art: `isObservatoryApproachAllowed`
    (`observatoryLayout.ts:605-615`) requires `feet.y >= solid.y + solid.height - 6`, so for
    `learned-marks` the prompt can appear with the feet up to 6 px inside the art band. **Fix:** clamp to
    `feet.y >= solid.y + solid.height` for wall art.
12. The observatory's south masonry (`0,300,488,60`, `548,300,92,60`) and the loop arch occupy the
    y 320–360 band. No art covers the HUD, but the band is not free of world art, and the check only
    asserts this for elements, not for alcove arches and walls (`check-observatory.mjs:559-566`).
    **Fix:** extend the assertion or accept.
13. The retracted bridge leaves a bare 44×48 gap in the drawn root bed, and the doc's claim that "the
    southern mass occludes a body standing in the lane" is imprecise — the lane is y 202–250 and a
    42 px sprite at the deepest walkable centre reaches y≈249. The procedural masses' rounded corners
    also shave relative to the collider. **Fix:** paint the lane or adjust the claim.
14. `09-plan.md` is stale in four ways: it plans a separate `src/levels/ObservatoryLevel.ts` (none
    exists — the level is a block inside `CampaignScene.ts`), "icons (16×16 state stickers) at depth 6"
    (no icons exist), an `observatory-lumo-call-point` control (deliberately removed), and a coming-soon
    gate "raised from >= 4 to >= 9" (no gate exists). **Fix:** rewrite.
15. `level-09-report.md` over-claims twice: "art fit and aspect ratio" is circular (see item 3), and
    "control separation" only asserts `distance > 24` while radii sum to 44–46
    (`check-observatory.mjs:471`), which is why item 2 passes. It also omits the deleted return-loop
    writer entirely. **Fix:** correct the report and strengthen the assertions.
16. `check-observatory.mjs` has no runtime-writer assertion for any flag: it drives eight synthetic
    stages including `loopOpen: true`, so a flag with no writer is structurally invisible. **Fix:** add
    the writer assertion for every gating flag (see B1).
17. Delivered art the level was designed around is unregistered and unused:
    `assets/levels/shared/characters/the-shadow/sprites/observatory-memory-scene-base.png` and
    `observatory-dawn-scene-base.png` (both 640×360) are not in `CampaignArt.ts` — the memory beat is
    faked with a flat translucent rectangle. Also `09-layout.md` prose is wrong in three places
    (the southern-mass occlusion claim, "nothing can draw over the HUD", and the prompt-side note for
    wall art), and `assets/levels/09-dark-moon-observatory/validation.json` / `asset-handoff.json` list
    `observatory-base.png` as a delivered module without recording the "never loaded at runtime" rule.
    **Fix:** register or delete the two scene bases; correct the three prose claims; annotate the asset
    records.

### Level 10 (13)

1. Inside the Moon pocket, the neighbouring statue's prompt wins for six rows: the statue is strictly
   nearer at y 264–270 across x 394–438 — 245 reachable positions that are inside the `heart-moon` gate
   (`heartOfElariaLayout.ts:198`) and on the visible `lock_moon_*` art. So `10-layout.md:94-95`'s "stand
   on a pocket therefore always gives the pocket prompt" is false; the pocket owns only y 271–286.
   **Fix:** give a floor socket containing the player precedence — add an optional
   `ownsPosition?: () => boolean` to `InteractableConfig`, pass
   `ownsPosition: () => isInsideHeartGate(element.id, { x: this.player.x, y: this.player.y })` for cells
   in `registerInteractions` (`HeartOfElariaLevel.ts:696-708`), and rank in
   `src/systems/InteractionSystem.ts:52-65` by `(ownsPosition ? 0 : 1, distance, registration order)`.
2. The scenario's already-off final action needs a second key press: `extinguishAtPedestal`
   (`HeartOfElariaLevel.ts:447-459`) only turns the lamp off, and the night/dawn starts only when E then
   collects the lantern (`:849-863` → `finishAfterAlreadyOffLantern` `:930-940`). Scenario §8 says
   extinguishing at the pedestal after the roots lock is itself a valid final action.
   **Fix:** call the completion path from `extinguishAtPedestal` too; `normalizeHeartProgress`
   (`heartOfElariaLayout.ts:622`) and `resolveHeartRestoreState` (`:602`) already handle
   `complete && !retrieved`.
3. Two of the check's rule-1 assertions are tautological, so rule 1 is asserted but never proved:
   `promptLeaksBehindArt` (`heartOfElariaLayout.ts:419-431`) skips every probe with
   `probe.y >= element.y - 2` and then calls `canReachHeartElement`, whose last clause (`:358`) is
   exactly `player.y >= element.y - 2` — the function cannot return true. The property does hold
   (an independent scan found zero enabled positions north of any prop base line), but the test is
   vacuous. **Fix:** compute the leak predicate locally from raw numbers instead of calling the function
   under test.
4. `core-dawn.png` is a byte copy of `core-night.png` (identical sha256 in
   `assets/levels/10-the-heart-of-elaria/asset-map.json`), so the post-completion core has no distinct
   art. **Fix:** give it real art or drop the swap and rely on the overlay.
5. Initial prop art is a different state from the initial counter value: `heartOfElariaLayout.ts:185-188`
   declares G0 and both mirrors as `mirror_1` and the statue as `statue-notch-2`, while the counters
   start at 0. Nothing wrong is rendered — `refresh()` swaps them inside `build()`
   (`HeartOfElariaLevel.ts:244-246`) — but `element.art` is not the resting state. **Fix:** declare the
   true resting art.
6. Beam lines are painted over the lock sprites: `beamGraphics` is depth 7 (`HeartOfElariaLevel.ts:672`),
   the same as every floor cell (`:654`), and is created after the elements, so beams draw on top of
   `lock_sun_*` / `lock_moon_*` and the alcoves. Also `lanternSpot = (85,206)` (`:191-193`) places the
   halo about 32 px above the top of the `pedestal_lit` art (232–260), so both the halo and the beam
   origin float in the air. **Fix:** `beamGraphics.setDepth(6.8)` and move the source node to about
   `(85,236)`.
7. State-switch sizes are unverified for the level-10 package variants:
   `check-heart-of-elaria.mjs:397-404` only compares sizes for names present in `HEART_TEXTURE_NATIVE` /
   `HEART_REUSED_ART`, so `memory/hope/balance-alcove-inserted`, `confirmation-root-ready/latched` and
   `core-*` are only checked for existence. **Fix:** extend the loop over every name in `RUNTIME_ART`.
8. Three floor-socket gates exceed their visible art by 1–2 px: `heart-seal` gate y 228–260 vs art
   230–258; `heart-eye-left/right` y 264–300 vs 265.5–298.5; `heart-moon` y 264–300 vs 265–299.
   Scan: 180 / 174 / 133 / 174 reachable in-gate positions lie outside the drawn socket, so
   RULE_GAMES §2's "inside the cell" is exceeded. **Fix:** half-heights 14 (seal), 16 (eyes), 17 (moon).
9. `assetManifest.json` declares stale sizes for textures the level swaps: `pedestal_empty` /
   `pedestal_lit` as 36×46 (real 36×39 / 40×56) and all four `lock_*` as 36×44 (real 40×33 / 40×34).
   Inert at runtime, but the procedural fallback would render at the wrong aspect if a PNG were missing.
   **Fix:** correct the six entries.
10. Dead data and imports: `HEART_ROOT_LANES` is imported unused (`HeartOfElariaLevel.ts:14`) and
    `HEART_CELLS` (`:12`) is unused, yet `10-layout.md:101-104` claims the root lanes are drawn from
    `HEART_ROOT_LANES` (they are drawn by the full-scene `{branch}-root-*` layers). **Fix:** remove the
    dead imports or correct the doc.
11. Legacy index-9 blocks in `CampaignScene.ts` are unreachable but carry no "unreachable" note, unlike
    the index-7 and index-8 blocks: `1768/1770-1771`, `1802-1808`, `1950-1995` (18 registers including
    `heart-roots`, `heart-lantern-retrieve` and `finishHeart`), `2030-2036`, `2502-2507`, `2627-2636`,
    `2550-2556`, `2932`. `CAMPAIGN_LEVELS[9].hint` is likewise dead because `showHint()` returns early
    for index 9 (`:2802`). **Fix:** annotate or delete.
12. Doc drift in `10-layout.md` / `10-plan.md`: prism depth 36 vs actual 36.2; "every collider ends at or
    above y = 320" vs the south-bank blocker `0,308,640,52`; "the walkable part of the three alcove
    cells is y ≥ 184" true only for the Hope alcove (the Memory/Balance gates y 172–212 are fully
    walkable); the Pulse window claim omits that after the first reveal any pulse refreshes it anywhere;
    `10-plan.md:113` lists five checkpoints while the code and `10-layout.md:151-153` list six (missing
    `west`); `10-plan.md:60-63` omits the `latched ||` term; `l9-branch-stable` / `l9-branch-dropped`
    appear in neither document; `10-plan.md:119-120` says the journal lists lantern state and current
    assignment, which `showJournal` (`:390-399`) does not. **Fix:** align the documents.
13. Eight delivered level-10 sprites are never drawn: `ending-title-the-last-dawn.png`,
    `ending-nhinh-carry-off-reference.png`, `ending-nhinh-seated-detail.png`,
    `ending-nhinh-seated-unlit-leaf.png`, `ending-leaf-handle-attachment.png`, `lantern-new-leaf.png`,
    plus the deliberately unused `mother-tree-trunk-patch.png` / `mother-tree-canopy-patch.png` (the last
    two are explained at `10-layout.md:20-22`). **Fix:** use at least the title plate and the seated/leaf
    art in the credits, or record the staging as out of scope.

---

## 5. COSMETIC

### Level 05 (4)

1. `05-layout.md` claims the room is built from "existing pillars and Level 05 modules", but no pillars
   are drawn in any of the three rooms. **Fix:** add them or drop the word.
2. Scenario §1's "room schematic beside each call marker" has no art counterpart — only the firefly
   carving on the call markers. **Fix:** add the module or record the diagrams as UI-only.
3. `tube-elbow.png` (64×32) is registered for the level and never referenced by any code path.
   **Fix:** use it at the ink corridor corners or remove it from the level's expectations.
4. `level-05-report.md` ends at round 3 (`ddf7e152`) and never records `b16a9b3` or `c0f6da4`.
   **Fix:** add the rounds.

### Level 06 (2)

1. The exit stand's prompt appears over plain floor rather than over an identifiable stair or opening —
   the base plate's lower-left bright feature sits at x≈60–100, y≈300–355, partly under the status band.
   **Fix:** reposition the exit art or accept, after a browser check.
2. The bench eye gap and source-mirror gap are narrower than the contract (see Minor 12 for Level 06) —
   recorded here as a cosmetic reading rather than a flow defect since neither is on a required route.

### Level 07 (5)

1. §5's "the distant Sun Flower folds" is not a consequence of opening the drain: `sun-main` follows
   `effectiveLight` every frame (`SleepingGardenLevel.ts:605-614`), so the flower is already folded as
   soon as the canopy shuts or the lantern goes off — normally long before the drain, since the player
   crosses in the dark. **Fix:** one-shot a fold cue on `openDrain()`, or reword the report.
2. Practice-pot art is clipped by the shared bottom band: `practice-sun` art box y 266–338 (18 px below
   y 320) and `practice-moon` y 284–328 (8 px below). No game-relevant pixels are lost (the flower heads
   and stickers at (126,275) and (160,274) survive). **Fix (optional):** raise both pots by 12 px and
   re-run the check.
3. `addNarrativeProps` / `registerLevel` / `buildCampaignBarriers` have no index-6 case at all, so
   "index 6 is excluded everywhere" relies on unreachability rather than an explicit guard. **Fix:**
   optionally assert in `check-campaign-levels.mjs` that no `level === 6` case exists in those legacy
   functions.
4. `dist/index.html` is dirty in the working tree at HEAD `b09a19d`. **Fix:** leave it out of commits;
   regenerate only when a real build is intended.
5. `assets/levels/shared/garden-mechanisms/root-bridge-missing.png` and `moon-pot-coiled/deployed.png`
   are shipped but unused by the level (the first is the natural fix for Minor 2). **Fix:** use or
   document.

### Level 08 (1)

1. The background plate carries baked features that do not match the authored geometry:
   `temple-scene-base.png` has a central archway/stairs and a top-right planting bed, while the authored
   north exit is at x=548 and the authored seedling bed is at `(180,128)` (top-left). The plate is
   heavily dimmed at alpha 0.72 and its upper band is covered by the level's own masonry, so impact is
   low, but two planting beds and a baked arch that is not the exit are potentially misleading.
   **Fix (optional):** dim or crop further, or use a plate without baked structure.

### Level 09 (2)

1. No level-09 browser script exists although levels 01 and 02 have one. **Fix:** add one when browser
   tooling is available.
2. `09-layout.md`'s prompt table is generated by `gen-observatory-layout-doc.mjs`, which genuinely
   derives it from `observatoryLayout.ts` — the "no drift" claim for coordinates is sound, but the
   generated prose repeats the three incorrect claims listed under Minor 17. **Fix:** move those claims
   out of the generator.

### Level 10 (1)

1. The two documented nearest-target ties are confirmed exactly: `heart-g0` + `heart-memory-mirror` on
   x = 226 across y 249–271 (G0 wins, as `10-layout.md:91-95` says) and `heart-moon` + `heart-statue` on
   y = 271 across x 395–437 (the pocket wins). They are geometrically unavoidable with two stands on the
   same column or row; the resolution is by registration order, not by a rule. **Fix:** the shared
   `ownsPosition` mechanism proposed in Minor 1 for Level 10 removes the second tie as a side effect.

---

## 6. Systemic causes and process fixes

### S1. Pure checks cannot see a missing runtime writer

`check-observatory.mjs` drives eight synthetic stages that include `loopOpen: true`, so it verified the
pure state machine while the runtime writer was gone (B1). This is the defect class most likely to ship
an unplayable level, because it makes a whole level unreachable while every automated gate reports PASS.

**Fix:** add `scripts/check-flag-writers.mjs`. A static audit of the 35 completion-critical flags for
indices 4–9 on this revision (Appendix A) found exactly one flag with no writer, and it is
`l8-return-loop-open`. Wire the audit into the check battery so the next deletion fails loudly. A
per-level variant is also cheap: assert that the `CampaignScene` source contains
`flags['lX-<flag>'] = ` for every flag the level's layout reads.

### S2. RULE_GAMES §1 is not actually asserted anywhere for levels 05–10

Level 06 has two real violations (M05, M06) and every check passes. Level 10's two rule-1 assertions are
tautological (Minor 3).

**Fix:** export an `interactiveStands` list of `(stand, artRect, radius)` from each layout module and
assert, for every walkable centre inside the radius, that the foot body is not behind the art and not
entirely east or west of it while inside the art's vertical band.

### S3. "Nearest target distinctness" is asserted only as `distance > 24`

Radii sum to 44–46, so Levels 05, 09 and 10 all ship overlapping prompt zones that the checks cannot
see. **Fix:** assert `distance >= r1 + r2` for every pair, or declare the exceptions in data with a
reason.

### S4. Documents over-claim the evidence

Four of six levels have documentation that asserts verification the scripts do not perform (Level 05's
non-existent Playwright run; Level 06's "four-direction solid contacts" and "next-level index" claims;
Level 07's phantom re-render and pixel-measurement; Level 08's mirror-slope claim; Level 09's circular
aspect check and `distance > 24` "control separation"). **Fix:** each "verified by check X" line must
name the section or assertion that implements it. Add a documentation rule that any browser claim must
link an artefact.

### S5. Shared documentation is stale

`docs/implementation/README.md` still says the current slice is Level 04 and that "Levels 05–10 remain
deferred"; `progress.md` says the slice is Level 06, states Level 05 belongs to another worktree, and
has no Level 05 completion entry at all; `CAMPAIGN_LEVELS` entries 5 and 8 carry pre-rebuild
objectives and hints (the index-8 hint also contradicts the shipped rule); `09-plan.md` describes a
controller and a gate that do not exist. **Fix:** one documentation pass over
`docs/implementation/README.md`, `progress.md`, `campaignLevels.ts` entries 5 and 8, and `09-plan.md`,
plus the two missing per-level reports (`level-08-report.md`, `level-10-report.md`).

---

## 7. Recommended fix order

1. **B1** — the blocker, plus the writer assertion so it cannot regress.
2. **M04** — the Level 06 double-update; one line, merge-introduced, affects feel immediately.
3. **M18** and **M21** — the Hope-seal bypass breaks the intended design, and the credits E press
   destroys a completed save.
4. **M05, M06** (rule-1 violations) and the Level 05 / 09 / 10 nearest-target ties, plus the S2 and S3
   assertions so the class stops recurring.
5. **M07, M08, M10, M11, M12, M20** — restore the scenario dialogue verbatim.
6. **M13, M14, M15, M16, M17, M19** — guidance, HUD truthfulness and the two rooms whose backgrounds
   still carry baked debug annotations.
7. **M01, M03, M09, S4, S5** — document integrity, plus `level-08-report.md` and `level-10-report.md`.
8. The remaining minor and cosmetic items, level by level.

A sensible commit split: (a) blocker + double-update + writer audit; (b) rule-1 and nearest-target
fixes plus their assertions; (c) scenario dialogue, HUD and art; (d) documentation. Re-run
`npm run build` and all `scripts/check-*.mjs` after each commit.

---

## Appendix A — Flag-writer audit (indices 4–9, completion-critical flags)

Static audit of every flag that gates a level's completion. "Writer" means a real assignment
(`flags['<name>'] = …`), not a comparison. Audited on `test-develop` @ `b09a19d`.

| Flag | Writers | Status |
| --- | --- | --- |
| `l4-latch-a`, `l4-latch-b`, `l4-latch-c` | 3, 3, 2 | ok |
| `l4-memo` | 3 | ok |
| `l4-reunited` | 6 | ok |
| `l4-ink-revealed` | 2 | ok |
| `l4-practice-complete` | 1 | ok |
| `l5-power`, `l5-water-returned` | 2, 2 | ok |
| `l5-crystal`, `l5-record-read`, `l5-reunited` | 2, 2, 2 | ok |
| `l6-canopy-shut`, `l6-sun-latched`, `l6-moon-open` | 2, 2, 3 | ok |
| `l6-bridge-crossed`, `l6-water-flowing` | 4, 2 | ok |
| `l6-return-latched`, `l6-lumo-realized` | 2, 3 | ok |
| `l7-solved`, `l7-route-latched` | 3, 3 | ok |
| `l7-lantern-retrieved`, `l7-met-shadow` | 2, 2 | ok |
| `l8-return-loop-open` | **0** | **BLOCKER (B1)** |
| `l8-final-door-latched`, `l8-record-read`, `l8-balance-crystal` | 1, 1, 1 | ok |
| `l8-door-a-latched`, `l8-bridge-crossed`, `l8-sun-door-latched` | 1, 1, 1 | ok |
| `l9-roots`, `l9-overload`, `l9-complete` | 2, 9, 4 | ok |
| `l9-lantern-placed`, `l9-lantern-retrieved` | 8, 4 | ok |

Level 08 additionally audited every `l7-*` flag it reads; all have writers. Its only write-only flag is
`l7-shadow-talked` (Minor 3 for Level 08), which is harmless.

---

## Appendix B — Independently verified, and found correct

These were checked directly while consolidating the report, on top of the per-level reviews:

- **Flag writer audit** (Appendix A): all 35 completion-critical flags for indices 4–9 have a real
  runtime writer except `l8-return-loop-open`.
- **No English interaction prompts survive in the six levels.** A scan of `src/` for prompt-shaped
  English strings (`is locked`, `is open`, `holds the seal`, `Sun Door`, `Rotate`, `Retrieve`,
  `Inspect`, `Recall Lumo`, `Pedestal`, `east, 1 south`) matched only code identifiers, comments and
  internal names, never a player-facing string.
- **No control in levels 05–10 exceeds a 32 px interaction radius.** Every `radius:` above 32 in
  `src/` belongs to the legacy path (`src/puzzles/*`, `src/scenes/WorldScene.ts`, 44–56 px) or to
  Level 03's `library-seat` (40 px, gated by `isPlayerInCell`), which is outside this review's scope.
- **Guidance coverage is complete for all six levels**: each controller exposes `getObjectiveText`,
  `getStatusText`, `showHint` and `showJournal` (Level 09 supplies them through `observatoryGuidance`
  plus the scene's level-8 branches), and Level 10 additionally exposes `getLumoStatusText` and
  `handleLanternKey`.
- **Dialogue volume is present**: Levels 05, 06, 07, 08 and 10 ship 24, 53, 42, 63 and 48 authored
  lines respectively in their own controllers.
- **Every level's layout module and every level controller exist on disk**, and the campaign dispatch
  reaches all ten indices with no coming-soon diversion — re-confirmed by
  `node scripts/check-campaign-levels.mjs`.
- **Build and battery are green at `b09a19d`**: `npm run build` passes (625 modules) and all twelve
  `scripts/check-*.mjs` pass. Green here does **not** imply playable — see B1.

Per-level reviews additionally reported these as verified correct, in summary:

- **Level 05:** all scenario lines present verbatim; every control's stand is south of its prop with the
  prompt geometrically unreachable from north/east/west; no soft lock found; every texture key resolves
  with native aspect preserved; depths correct prop by prop; no background plate is drawn at all (the
  floor is a `ground_stone` tileSprite).
- **Level 06:** all quoted scenario lines present and reachable; G0/G1/G2 truth tables match the
  scenario, and the mirror PNG rod orientations were confirmed by pixel correlation to match the
  `/`-vs-`\` mapping the puzzle assumes; all 15 solid footprints sit inside their visible art and no two
  overlap; a 1 px flood fill over the whole room produced **one** connected component with every
  authored stand reachable — no islands, no dead-end pockets.
- **Level 07:** all six puzzle steps implemented in the authored order; the held-span rule is verified
  algebraically so the roots can never retract under a player on the bridge; every stand's south-edge
  probes are outside its radius; `07-layout.md` matches the code **exactly** for all 16 zone rects, 34
  static solids, every module art/solid/stand/radius, the spans, the spawn and every flag name; the
  background plate has no annotation strip (row-luminance scan).
- **Level 08:** shadow geometry verified — `RUINS_SHADOW_QUADS[0]` fully contains the Moon footprint,
  the other three notches never cover it, and only notches 2 and 3 intersect the left and right outer
  rays; the **drawn** `shadow-notch-{0..3}.png` masks are those same quads (bounding box exact, row
  edges within 1.5 px). All nine stands are at least 76.6 px apart. Every `l7-*` flag has a writer.
  No irreversible configuration: all rotations are 4-state and reversible before the latch.
- **Level 09:** `09-layout.md` has zero coordinate drift from the code and is genuinely generated from
  the runtime modules; save validation in `CampaignSaveSystem` is intact for `roomId`, `roomSpawn`,
  `l8-lumo-room`, `l8-lumo-destination`, `l8-lumo-arrived`, `l8-lumo-route-json`, `l8-lumo-route-index`
  and the coordinate counters; the four pre-rebuild regressions have not returned (no leftover
  `0x12friendly`, no null-body door dereference, `door-a-control` is registered, prompts are Vietnamese
  with authored radii).
- **Level 10:** only one owner drives the player, Lumo and `LanternSystem`; the reported art-distortion
  fix holds via `applyNativePlacement`/`swapArt`; the invisible-statue-collider and invisible-Hope-plate
  defects are fixed; the overload is never restored stuck and the already-off path completes; `F` works
  mid-dialogue as the scenario requires; every coordinate in `10-layout.md` equals the code.

---

## Appendix C — Documentation gaps

1. **`docs/implementation/level-08-report.md` does not exist.** Index 8 was reviewed once by an agent
   that ran out of turns before writing its report, then again for this review. Without the report there
   is no PASS/FAIL/NOT_RUN statement for the level.
2. **`docs/implementation/level-10-report.md` does not exist**, so the level ships without its
   verification statement, and the "two dead legacy hint rows" claim is untraceable — the real dead-code
   inventory is much larger (Minor 11 for Level 10).
3. Naming inconsistency: Level 05 and Level 07 use `level-0X-report.md`, Level 06 uses `06-report.md`.
4. `docs/implementation/README.md` and `progress.md` are stale (S5).
5. `CAMPAIGN_LEVELS` entries 5, 8 and 9 carry pre-rebuild text (Minor 13 for Level 06, Minor 8 for
   Level 09, Minor 11 for Level 10).
6. `docs/implementation/integration-log.md` mis-states the Level 10 art reuse: the reused packages are
   Level 05's `pressure-empty/occupied` and Level 08's `statue-notch-0..3`; the Sun and Moon locks come
   from `src/assets` via `assetManifest.json` (not Level 08), the splitter comes from
   `assets/levels/shared/beam-splitter` (not Level 08), and no "sanctuary door" is used at all.
7. `src/art/assetManifest.json` declares wrong sizes for six entries (Minor 9 for Level 10).

---

## Appendix D — Needs runtime confirmation

Nothing in this report can be confirmed visually on this branch, because no browser tooling is available
and no human playthrough has been performed. The following are the highest-value things to look at once
one is:

1. **B1 after the fix:** does the return loop open, does its stone strip paint, does the record then
   unlock, does the Balance Crystal become collectable, and does the level restart into Level 10 with
   the lantern in hand.
2. **M04 after the fix:** Lumo's travel speed and hover bob in Level 06 should match Level 05's pacing.
3. **M05/M06 after the fix:** standing north of the G2 mirror and west of the record panel must show no
   prompt.
4. **M15 and M16:** the stray halo in the corridor with the lantern parked in the entrance, and whether
   an open doorway still reads as a wall.
5. **M17:** the baked annotations in `lobby-base.png` and `star-chart-base.png` as actually rendered, and
   whether the runtime G0/G1/G2 sprites sit on top of the baked placeholders.
6. **Level 05's overlapping prompt lens**: walk the east foyer from `(545,218)` to `(580,190)` and record
   which bubble appears at `(559,198)` and `(567,208)`.
7. **Level 07's invisible bridge blocker**: walk the nursery's west edge at centre y 206–232 with the
   roots retracted and confirm the invisible wall reads as a bank edge.
8. **Level 10's beams over locks and the floating halo** (Minor 6) and the authored dark pocket at
   `[488,207,551,248]` versus the statue-shadow ellipse at `(416,276)`.
9. **HUD band collisions** in Levels 06 and 07, whose exact overlaps depend on Segoe UI metrics:
   objective panels against the tower lamp and fountain art, and the garden status row against the
   shared controls bar.
10. **Save and reload across every stage**, including reload mid-dialogue after latching, reload inside
    a closing threshold, reload in a reverse portal pocket, reload mid-Lumo-travel, and the Level 05 →
    06, 06 → 07, 07 → 08, 08 → 09 and 09 → 10 hand-offs.
