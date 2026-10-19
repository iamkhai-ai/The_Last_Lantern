# Level 08 — Ruins of Two Halves: implementation plan

Source of truth: `docs/scenario/08-ruins-of-two-halves.md`. Campaign index **7** (`progress.level === 7`).
Contracts: `docs/implementation/campaign-layout-design.md`, `RULE_GAMES.md`.
Pattern copied from: `src/data/pathForTwoLayout.ts` + `src/levels/PathForTwoLevel.ts` + `scripts/check-path-for-two.mjs` (level 05, index 4).

Deliverables

| File | Role |
| --- | --- |
| `src/data/ruinsOfTwoHalvesLayout.ts` | pure geometry + pure puzzle state. No Phaser import. |
| `src/levels/RuinsOfTwoHalvesLevel.ts` | focused level controller owned by `CampaignScene`. |
| `src/scenes/CampaignScene.ts` | minimal localized index-7 hooks (see "Scene hooks"). |
| `src/art/CampaignArt.ts` | adds the level-08 sprite directory to the art glob. |
| `scripts/check-ruins-of-two-halves.mjs` | pure geometry/state check script. |

No PNG is regenerated or edited. Native dimensions and aspect ratios are kept. Vietnamese story text and UI, English filenames.

## 1. Player flow (spawn → exit)

The level is a single 640×360 courtyard (the temple hall `Điện thờ`). One screen keeps the two-halves idea legible: the player always sees both Sun locks and the Moon lock at once, which is what the "two halves at the same time" rule demands. There is no room engine, no scrolling camera and no extra scene.

| # | Step | Physical action | What the player sees | Guidance shown |
| --- | --- | --- | --- | --- |
| 0 | Spawn | starts at `(120,288)`, south-west of the yard, beside the practice forecourt | the practice column on its test pedestal to the right, the statue in the middle, the two Sun locks + Moon lock across the north wall | objective row + opening dialogue (scenario §2) |
| 1 | **Safe practice area** — `tiền sảnh` | press `F` (lantern on), stand in front of the test column, press `E` to rotate it | a real beam from the wall port crosses the column; the small Moon slab on the floor goes *lit → covered*; the covered state shows the visible dark shadow patch on the slab | objective: "Thử ở tiền sảnh: bật đèn, xoay cột đá cho bóng phủ phiến Nguyệt." |
| 2 | **Clue** — the inscription | stand at the stele on the north wall east of the seedling bed, press `E` | stele text | prompt `E · Đọc bia điện thờ` |
| 3 | **Main puzzle — place the lamp** | stand at the south edge of the main pedestal (south-east of the yard), press `E` with the lantern in hand | the altar takes the lantern, the fixed three-route splitter lights up and its three branches become visible; the centre duct to the statue's foot glows | objective: "Đặt đèn lên bệ chính ở phía đông nam sân." |
| 4 | **Main puzzle — aim the mirrors** | stand at the south edge of the left mirror, press `E` until the reflection is right; same for the right mirror | the left branch ray leaves the splitter, reaches the mirror and climbs to the left Sun lock; the Sun lock lights (`lock-sun-on`) | objective: "Xoay hai gương bên để tia sáng chiếu vào hai khóa Nhật." |
| 5 | **Main puzzle — the statue shadow** | stand at the south edge of the statue (on the splitter inlay at its foot), press `E` to rotate the base through four notches | the full-screen authored shadow overlay rotates with the statue. Notch 0 lays a wide dark column over the Moon lock only; notch 1 leaves a narrow sliver; notch 2 lays a diagonal shadow across the **left** Sun lock and its beam; notch 3 lays it across the **right** Sun lock and its beam | objective: "Xoay tượng giữa sân cho bóng phủ khóa Nguyệt." |
| 6 | **Confirmation / latch** | both Sun locks lit **and** the Moon lock shadowed at the same time → the ring on the pedestal shows `confirmation-ready`; press `E` at the pedestal's south edge | ring `confirmation-ready → confirmation-latched`; the seedling curtain slides from `seedling-curtain-open` to `seedling-curtain-closed`; The Shadow stops holding his hand up | objective: "Điều kiện đã đủ. Nhấn E ở bệ chính để gài điện thờ." |
| 7 | **Reward beat — retrieve the lamp** | press `E` at the south edge of the main pedestal again | the lantern returns to Nhinh's hand; the light follows the player again | objective: "Thu hồi đèn ở bệ chính." |
| 8 | **Reward / story beat — The Shadow** | walk north-east to The Shadow, press `E` | the scenario §5 conversation (7 lines) + the spiral exchange; spiral mark on the north door becomes readable | objective: "Tới The Shadow và nhấn E." |
| 9 | **Exit** | walk to the north door, press `E` | `sanctuary-door-closed → open`, scenario §7 closing two lines, then the level advances | objective: "Tới cửa Bắc và nhấn E." |

Teaching order is deliberate: **see the shadow (practice) → read the rule (inscription) → make light (lamp + mirrors) → make dark (statue) → hold both at once (confirm)**. The practice area never contributes to main puzzle state ("Safe practice mechanisms do not contribute to main puzzle state", campaign-layout-design.md).

Locked feedback is always reachable: the exit control never disappears; before the latch it answers "Điện thờ còn khóa…", before retrieval "Cần thu hồi đèn ở bệ chính trước.", before the talk "The Shadow vẫn đang đợi ở phía đông bắc."

## 2. Object table

Coordinates are **player centers** for spawns/stands, and **ground anchors (bottom-center)** for standing art, per the coordinate contract. `depth = 10 + groundY / 10`.

| Object | Art (key @ display size) | Ground anchor | Player stand (south edge + ≥24px) | Solid? |
| --- | --- | --- | --- | --- |
| Statue | `statue-notch-{statue}` 64×88, image centre `(320,176)` | `(320,212)` | `(320,241)` r22 | **solid** `{292,148,56,64}` |
| Left mirror | `mirror_{ruins-left}` 36×48, centre `(240,238)` | `(240,262)` | `(240,286)` r22 | **solid** `{222,214,36,48}` |
| Right mirror | `mirror_{ruins-right}` 36×48, centre `(400,238)` | `(400,262)` | `(400,286)` r22 | **solid** `{382,214,36,48}` |
| Main pedestal (altar + splitter + confirmation ring) | `ruins_altar` 104×52 centred `(480,236)`; `fixed-three-route-splitter-{off\|on}` 48×48 centred `(320,238)`; `confirmation-{waiting\|ready\|latched}` 48×36 centred `(480,236)` | `(480,262)` | `(480,286)` r22 | **solid** `{428,210,104,52}` (altar only) |
| Practice column on test pedestal | `test-pedestal` 48×36 centre `(150,234)`; `test-column-notch-{practice}` 32×44 centre `(150,223)` | `(150,250)` | `(150,276)` r22 | **solid** `{126,216,48,36}` |
| Seedling bed | `seedling-curtain-{open\|closed}` 88×48 centre `(180,128)` | `(180,152)` | `(180,176)` r22 | **solid** `{136,104,88,48}` |
| The Shadow | `shadow_npc` 44×56 centre `(522,140)` | `(522,160)` | `(522,184)` r22 | **solid** `{508,124,28,36}` |
| Inscription stele | `beacon_stone` 34×46 centre `(430,57)` — flat on the north wall | wall (`y<80`) | `(430,106)` r22 | no (wall is already solid) |
| North door (exit) | `sanctuary-door-{closed\|open}` 104×76 centre `(548,42)` | wall | `(548,112)` r24 | no (wall is already solid) |
| Left Sun lock | `lock-sun-{off\|on}` 32×40 centred `(240,112)` | floor emblem | — (receiver, not a control) | no |
| Moon lock | `lock-moon-{lit\|covered}` 32×40 centred `(320,112)` | floor emblem | — | no |
| Right Sun lock | `lock-sun-{off\|on}` 32×40 centred `(400,112)` | floor emblem | — | no |
| Practice wall port | authored graphics slit at `(24..40, 216..232)` | wall | — | no |
| Practice Moon slab | `test-moon-{lit\|covered}` 16×20 centred `(206,224)` | floor emblem | — | no |
| Practice shadow patch | authored graphics rect over the slab | floor stamp | — | no |
| West buttress (architecture) | authored masonry | — | — | **solid** `{24,80,64,96}` |
| Boundary walls | authored masonry | — | — | **solid** north `{0,0,640,80}`, south `{0,310,640,50}`, west `{0,80,24,230}`, east `{616,80,24,230}` |

Every solid rectangle above is covered by visible art or visible architecture. Nothing is solid "because a rectangle says so".

## 3. Layering

| Depth band | Content |
| --- | --- |
| 0 | `temple-scene-base` backdrop (level 08 own art, drawn dimmed as ambience only) |
| 0.5 | authored `ground_stone` courtyard floor |
| 1 | authored masonry walls (mass) |
| 3 | conduit / floor grooves, practice beam scar |
| 4 | floor emblems: three locks, splitter inlay, practice slab; north door leaf |
| 5 | beams (centre + two branches), practice beam |
| 6 | **the statue's shadow region** (full-screen `shadow-notch-{statue}`) |
| 10 + base/10 | all standing props: statue `31.2`, mirrors `36.2`, pedestal `36.2`, `confirmation-*` `36.3`, practice pedestal `35.0`, practice column `35.1`, seedling bed `25.2`, The Shadow `26.0`, stele `18.0` |
| 68–71 | `LanternSystem` (darkness overlay, halo, pulse, vignette) |
| 82 | interaction prompt |
| 86–87 | HUD rows |

Objects that occlude the player: the statue (a player whose feet are north of its ground anchor `y=212`, i.e. a centre north of `y≈193`, is behind it), both mirrors, the pedestal, the practice pedestal, the seedling bed and The Shadow. No actor sprite is raised to hide a layering bug: the player keeps the standard `10 + (y+19)/10` foot depth from `Player.setFootPlacement`.

The beams (5) and the locks (4) sit **below** the shadow overlay (6), so the shadow genuinely darkens whatever it covers. That is the mechanical and the visual statement of the puzzle: the player literally sees which receiver is inside the dark region.

## 4. Statue geometry — four notches and their shadows

The four authored shadow overlays are full-screen 640×360 dark quads that all converge on the authoring anchor `(320,220)` — 5px below the statue's drawn bottom edge (`y 215`, measured) — and taper upward. Their measured extents are authored verbatim in `ruinsOfTwoHalvesLayout.ts` as quads, and the check script re-measures the PNG bytes to prove the drawn mask *is* those quads:

| Notch | Art | Shadow quad (TL, TR, BR, BL) | Meaning |
| --- | --- | --- | --- |
| 0 | `statue-notch-0` / `shadow-notch-0` | `(292,75) (348,75) (336,220) (304,220)` | wide face turned **north**, broad plane across the centre flow: a wide dark column straight over the **Moon** lock → **moon in shadow** |
| 1 | `statue-notch-1` / `shadow-notch-1` | `(316,75) (324,75) (326,220) (314,220)` | edge-on: only a 9–13px sliver, narrower than the 32px Moon receiver → **moon stays lit** |
| 2 | `statue-notch-2` / `shadow-notch-2` | `(187,76) (230,76) (336,220) (304,220)` | wide face turned up-left: the dark band lies across the **left** Sun lock `(224..256, 92..132)` and across the left branch ray `x=240` for `y≈90..141` → **left Sun blocked** |
| 3 | `statue-notch-3` / `shadow-notch-3` | `(420,76) (438,76) (326,220) (314,220)` | wide face turned up-right: the band lies across the **right** Sun lock `(384..416, 92..132)` and across the right branch ray `x=400` for `y≈103..125` → **right Sun blocked** |

Moon receiver footprint `{304,92,32,40}` (centre `320,112`). Sun receiver footprints `{224,92,32,40}` (centre `240,112`) and `{384,92,32,40}` (centre `400,112`).

Rules that make the scenario true by construction:

* **Moon covered** ⇔ the shadow quad *fully contains* the Moon footprint. True for notch 0 only. Notch 1 fails because the sliver (`314..326`) is narrower than the receiver (`304..336`); notches 2 and 3 fail because their bands are off to the sides at that height.
* **Sun blocked** ⇔ the shadow quad *intersects* the branch ray segment that climbs from the mirror to the lock. Only notch 2 touches the left ray, only notch 3 the right ray. Notch 0's column is confined to `x∈[292,348]`, so it can never touch either ray.
* Therefore: notch 2 and notch 3 both leave the Moon lit, exactly as the scenario requires ("Xoay tượng để chắn nhánh trái hoặc phải cũng không giải được").
* Both branch rays start on the branch rail `y=238` (the mirrors' reflection centres) and are axis aligned: `(320,238)→(240,238)→(240,112)` and `(320,238)→(400,238)→(400,112)`. The centre ray is `(320,238)→(320,112)` and is drawn only where the statue does not occlude it (`y 112..148` above the statue, `y 212..238` below).

Measured on the art (`check-ruins-of-two-halves.mjs` §12): the four `shadow-notch-*` masks are exactly these quads, filled opaque (`#081724`, alpha 220). The four `statue-notch-*` textures are distinct files, but notch 0↔2 differ in only 75 pixels and notch 1↔3 in 70, so a 180° rotation of the statue is nearly invisible in the statue art itself. That is acceptable here because the *readable* signal is the shadow overlay, which changes dramatically between those pairs; the mirror art is likewise verified to be the `/`, `\`, flat-plank and upright-plank faces the `RUINS_MIRROR_SOLUTION` mapping assumes (measured bright-bar slope per row).

## 5. Receiver logic (live input only)

`deriveRuinsPuzzleState(input)` is a **pure function of live world input** — the four live values are the placed-lantern state, the live lamp on/off state, the statue notch and the two mirror rotations:

```
lightActive   = lanternPlaced && lanternOn          // live lamp state, no history
shadowQuad    = SHADOW_QUADS[statue % 4]
moonCovered   = quadContainsRect(shadowQuad, moonFootprint)
moonDark      = moonCovered || !lightActive
leftAimed     = leftMirror  % 4 === 1               // "\" turns a west-going ray north
rightAimed    = rightMirror % 4 === 0               // "/" turns an east-going ray north
leftLit       = lightActive && leftAimed  && !segmentIntersectsQuad(leftRay,  shadowQuad)
rightLit      = lightActive && rightAimed && !segmentIntersectsQuad(rightRay, shadowQuad)
sunsLit       = leftLit + rightLit
confirmReady  = leftLit && rightLit && moonCovered
canLatch      = confirmReady
```

Mirror art mapping (native, no rotation): `mirror_0` = `/`, `mirror_1` = `\`, `mirror_2` = `—` (flat plank), `mirror_3` = `|` (upright plank).

Consequences, all verified by the pure check:

* Turning the lamp off makes the Moon "dark" but kills both Suns (`leftLit`/`rightLit` require `lightActive`) → **unsolvable**, matching "Tắt đèn … hai Nhật mất sáng; không giải được".
* `l7-solved`, `l7-route-latched`, past `l7-*` arrival flags and `l7-at-*` style history are **never read** by the state function. Locks do not remember a previous lit state ("Các khóa không ghi nhớ trạng thái sáng trước đó").
* The commit (`l7-route-latched`, `l7-solved`) is a one-way mechanical latch, exactly like the latches in levels 04/05: the derived condition must hold live at the moment `E` is pressed, then the route stays latched even if the player later moves the statue.

Practice area state is separate and contributes nothing:

```
practicePortLit = lanternOn                                    // live lamp
practiceBlocked = (practiceNotch % 2) === 0                    // wide face blocks
practiceSlabShadowed = practicePortLit && practiceBlocked
```

## 6. Interaction stand points (RULE_GAMES.md §1)

All controls are triggered from the object's **south** edge (`art bottom + 24`, radius 22, exit 24). No trigger sits on the object's centre and none can be reached from the north.

| Control id | Stand | Radius | Reachable from the north side? |
| --- | --- | --- | --- |
| `l7-practice-column` | `(150,276)` | 22 | no — solid `{126,216,48,36}` sits between |
| `l7-mirror-left` | `(240,286)` | 22 | no |
| `l7-mirror-right` | `(400,286)` | 22 | no |
| `l7-pedestal` | `(480,286)` | 22 | no |
| `l7-statue` | `(320,241)` | 22 | no — solid `{292,148,56,64}` |
| `l7-seedling-bed` | `(180,176)` | 22 | no — the north wall backs the bed |
| `l7-shadow-npc` | `(522,184)` | 22 | no — solid `{508,124,28,36}` |
| `l7-inscription` | `(430,106)` | 22 | no — the wall backs it |
| `l7-exit` | `(548,112)` | 24 | no — the wall backs it |

Neighbouring controls keep distinct nearest-target areas: the closest pair is The Shadow `(522,184)` ↔ the north door `(548,112)` at **76.6px**, then `statue (320,241)` ↔ `mirror-left (240,286)` at 91px; every pair is ≥ 76.6px apart, well over `22+24`, so two triggers can never fight over the same position. A pixel sweep of every walkable position inside each trigger radius (check §13) additionally proves that no position above an object's art bottom, and none beside its art span, can raise its prompt: only the south edge answers.

Deliberate exceptions and their reasons (recorded in data):

* `l7-inscription` and `l7-exit` are wall-mounted, so their trigger sits at the south edge of the wall face (26–32px south of the visible art bottom), the same authored exception the other levels use for wall doors.
* The exit is a dialogue transition through the north wall, so it needs no dynamic threshold body; the wall is solid in every state, and the door art only communicates opened/closed. No gate rectangle is laid across the passage.

## 7. Collision, corridors and restore

* Player frame 36×42, baseline 40, feet at `(x, y+19)`. `player.setFootPlacement(19, 37, 11, 14, 6)` → Arcade foot body = `{x-7, y+16, 14, 6}`, the same rectangle the pure module uses for every reachability test.
* Walkable band `x 24..616`, `y 80..310`; the foot body must stay fully inside it.
* Corridor widths (measured with the 14×6 foot body, not centre points):
  * south corridor, below the mirrors and the pedestal: `262 → 310` = **48px**
  * corridor north of the practice area, between the seedling bed (`y=152`) and the practice column (`y=201`): **49px**
  * corridor west of the practice area, `24 → 126`: **102px**
  * west buttress to the seedling bed, `88 → 136`: **48px**
* Restore order (save contract): read the durable flags → restore lamp placement (`l7-lantern-placed` → `lantern.placeLanternAt(PEDESTAL_LAMP.x, PEDESTAL_LAMP.y)`) → restore the mirror/statue/practice counters → derive the live puzzle state → resolve a reachable player spawn. `resolveRuinsSpawn(saved, { exitReady })` returns the saved centre only when the foot body is inside the floor and clear of every solid; otherwise it returns the nearest named checkpoint that is safe and unlocked. The `north-stair` checkpoint `(548,44)` sits *inside* the north wall's solid, so the floor test rejects it in every state; the `requiresExit` gate is kept as a second guard, and a reload can never place the player past the door.
* After the latch the statue and both mirrors freeze (`rotateStatue` / `rotateMirror` answer with the latched line), so the configuration the ring holds cannot be broken afterwards, and the pedestal only ever *returns* the lamp — re-placing it would undo the retrieval step and re-lock an already-opened door.
* The objective stage leaves the practice tutorial as soon as the player engages the main puzzle (lamp placed, or the statue/mirrors moved off their entry values), so someone who walks straight to the altar is not held on "Thử ở tiền sảnh" while the temple is already latched.
* v1 save key and existing flag names are untouched: `l7-solved`, `l7-lantern-placed`, `l7-inscription-read`, `l7-met-shadow`, `l7-route-latched`, counter `statue`, plus the pre-existing level-08 counters `ruins-left` / `ruins-right`. New state is additive and namespaced: counters `practice`, flags `l7-practice-seen`, `l7-two-suns`, `l7-shadow-covers`, `l7-curtain-shut`, `l7-lantern-retrieved`, `l7-shadow-talked`, `l7-shadow-spiral`.
* A legacy save whose `statue` is 2 and whose `l7-solved` is true stays solved: the latch is committed, and "Giữ cấu hình tượng, gương, màn che và cửa Bắc" (scenario §7) means the configuration is preserved rather than reset. "Preserved" is read as *preserved as the solving configuration*: `ruinsNormalizeCounters` snaps a latched save onto `statue 0, left 1, right 0`, so a resumed session still shows the three receivers reading the way the temple was left instead of a dark temple behind a latched ring. An unlatched save keeps the player's own values, and a fresh save lands on the entry values (practice slab lit, nothing pre-solved).
* A restored lamp on the altar is always lit: `placeLanternAt` switches it on and `toggleLantern` refuses while it is placed, so honouring a stale `lanternOn: false` would strand the player with a lamp they cannot relight. The scenario's "tắt đèn … không giải được" stays reachable because the lamp can be switched off in hand before it is placed.

## 8. Guidance text

**Objective row** (`getObjectiveText`, one line, live):

1. practice not seen → `Thử ở tiền sảnh: bật đèn, xoay cột đá cho bóng phủ phiến Nguyệt.`
2. lantern in hand → `Đặt đèn lên bệ chính ở phía đông nam sân.`
3. a mirror unaimed → `Xoay hai gương bên để tia sáng chiếu vào hai khóa Nhật.`
4. moon still lit → `Xoay tượng giữa sân cho bóng phủ khóa Nguyệt.`
5. ready, unlatched → `Điều kiện đã đủ. Nhấn E ở bệ chính để gài điện thờ.`
6. latched, lamp placed → `Thu hồi đèn ở bệ chính.`
7. latched, lamp held, Shadow not talked to → `Tới The Shadow ở phía đông bắc và nhấn E.`
8. talked → `Tới cửa Bắc và nhấn E để đi tiếp.`

**Status row** (`getStatusText`): `Nhật {0|1|2}/2 · Nguyệt {sáng|tối} · Bệ {đang chờ|sáng đều|đã gài} · Cửa Bắc {khóa|mở · cần đèn|mở · chờ The Shadow|mở}`. The door leaf is drawn open as soon as the ring latches, so the row names whichever completion step is still outstanding instead of claiming the exit is walkable while it is not.

**Hint ladder (`H`)** — advancing one level per press. Each stage has three levels; the suns and the moon share one ladder, the scenario 08 §6 Mức 1-3 verbatim (`MAIN_LADDER`), and every level after the first names the *currently missing* condition ("H nêu điều kiện đang thiếu nếu đã có một phần đúng"):

| Stage | Level 1 (observe) | Level 2 (relation) | Level 3 (next step) |
| --- | --- | --- | --- |
| practice | `Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.` | `Bật đèn bằng F. Mặt rộng của cột chắn ánh sáng, mặt hẹp thì ánh sáng lọt qua.` | `Đứng ở mép nam cột đá thử và nhấn E để xoay. Xem phiến Nguyệt trên nền đổi trạng thái.` |
| suns and moon (one shared ladder, `MAIN_LADDER`) | `Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.` | `Hai khóa Nhật cần sáng cùng lúc. Khóa Nguyệt cần bóng của tượng, trong khi đèn vẫn bật.` | `Đặt đèn, hướng hai gương vào hai Nhật. Xoay mặt rộng của tượng chắn luồng giữa tới Nguyệt, rồi xác nhận ở bệ.` |
| confirm | `Hai Nhật sáng và Nguyệt đã tối cùng lúc.` | `Vòng trên bệ chính đang sáng đều.` | `Đứng ở mép nam bệ chính và nhấn E để gài điện thờ.` |
| retrieve | `Điện thờ đã gài. Đèn vẫn nằm trên bệ.` | `Nhinh cần đèn trong tay để đi tiếp.` | `Đứng ở mép nam bệ chính và nhấn E để nhận lại đèn.` |
| shadow | `Màn đá đã trượt che luống mầm. The Shadow đã thôi giơ tay chắn sáng.` | `Ông đang đợi ở phía đông bắc sân.` | `Tới gần The Shadow và nhấn E để nói chuyện.` |
| exit | `The Shadow đi trước trên cầu thang Bắc.` | `Ông dừng lại mỗi khi Nhinh và Lumo chưa theo kịp.` | `Tới cửa Bắc và nhấn E.` |

**Prompts** (shown only when standing at the control's south edge): `E · Xoay cột đá thử`, `E · Xoay gương trái`, `E · Xoay gương phải`, `E · Xoay tượng`, `E · Đặt đèn lên bệ`, `E · Kiểm tra bàn xác nhận`, `E · Gài điện thờ`, `E · Nhận lại đèn`, `E · Xem luống mầm`, `E · Nói chuyện với The Shadow`, `E · Đọc bia điện thờ`, `E · Qua cửa Bắc` / `E · Kiểm tra cửa Bắc (cần gài điện thờ)`.

**Toasts (one-off, exact scenario text):**

* first time the practice slab is shadowed with the lamp on — `Nhinh`: "Không cần tắt cả chiếc đèn. Chỉ cần che đúng chỗ." + `Lumo`: "Phía ngoài vẫn sáng, còn sau cột thì tối."
* both Suns lit while the Moon is still lit — `Lumo`: "Hai bên đã đáp lại. Khóa giữa vẫn im." + `Nhinh`: "Ánh từ bệ vẫn rọi vào nó. Bức tượng có thể chắn luồng giữa."
* first time the shadow covers the Moon — `The Shadow`: "Giữ khoảng tối ấy." + `Nhinh`: "Tôi thấy rồi. Hai nửa có thể cùng tồn tại."
* latch — `Hệ thống`: "Vòng trên bệ sáng đều. Điện thờ đã gài." / "Màn đá trượt tới che luống cây. The Shadow thôi giơ tay chắn sáng." / "Dưới chân ông, lá nhỏ ngẩng lên."
* the Shadow's conversation — the seven scenario §5 lines, then the spiral exchange `Lumo`: "Dấu này ở đường hầm dẫn nước." + `Nhinh`: "Mình mang ký ức tới đài thiên văn. Có lẽ chúng sẽ ghép lại ở đó."
* exit — `Lumo`: "Tôi sợ điều mình sắp nhớ ra." + `Nhinh`: "Mình sẽ đọc cùng nhau."

No dialogue ever calls The Shadow `Người Bảo Vệ`.

## 9. Scene hooks (minimal, single-index)

`CampaignScene.ts` changes, all guarded by `level === 7` (or `progress.level !== 7` in existing guard lists):

1. `create()`: `if (this.progress.level >= 4)` → `if (this.progress.level >= 4 && this.progress.level !== 7)`, documented with a comment that other indices make the same edit and it is reconciled at integration.
2. field `private ruinsLevel?: RuinsOfTwoHalvesLevel;`
3. `buildLevel()`: extend the existing "not level 2/3/4" guards to include 7, add a `level === 7` branch that constructs and builds the controller, remove the level-7 lantern-placement line `if (level === 7 && … l7-lantern-placed) this.lantern.placeLanternAt(120,205);` (the controller owns level-08 restore now).
4. `update()`: include the controller in the protected prompt bounds, call `this.ruinsLevel?.update(dt)`, and skip the generic puzzle/barrier passes for level 7.
5. `refreshHud()`: delegate the objective/status rows to the controller for level 7.
6. `keydown-H` / `keydown-J`: delegate to `this.ruinsLevel?.showHint()` / `.showJournal()`.
7. `buildLevel()` opening dialogue: `else if (level === 7) this.ruinsLevel?.startOpeningDialogue();`

Known limit: finishing index 7 calls `nextLevel`, which advances to index 8, and index 8 is not in this slice, so the campaign still ends on `ComingSoonScene` until all levels are integrated.
