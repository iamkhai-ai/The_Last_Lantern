# Kế hoạch: sửa vùng tương tác (hiện nút E) ở màn 1–4

Ngày: 2026-10-20 · Phạm vi: màn 1 (Forest Edge), 2 (Whispering Woods), 3 (Library), 4 (Shattered Creek). **Không đụng màn 5–10.**

## 1. Lỗi

Người chơi đứng sát vật thể (chạm chân đế) nhưng không thấy `E`. Ví dụ màn 3: đứng ngay dưới phiến đá ở giá trên cùng.

## 2. Nguyên nhân (đã tái hiện trong game thật)

`InteractionSystem.update()` chọn mục tiêu bằng `hypot(player.x - item.x, player.y - item.y) <= item.radius + 8`.

- `player.x/y` là **tâm sprite**, còn thân va chạm (bàn chân 14×6) nằm thấp hơn tâm khoảng **16–19 px** (`body.y = sprite.y + 16`).
- Điểm neo `item.x/y` đặt ở "chỗ đứng" phía nam vật, cách mép nam của khối va chạm thêm 20 px trở lên.
- Hệ quả: vị trí sát vật nhất vẫn nằm ngoài bán kính.

Số đo bằng `scripts/browser-audit-interaction-reach.js` (extraGap = số px bàn chân phải cách mép nam vật trước khi `E` hiện; 0 là đúng):

| Màn | Mục | Kết quả đo |
| --- | --- | --- |
| 3 | `library-rack-0..3` | extraGap = **15** |
| 3 | `library-mural` | không hiện ở 4/14 cột sát mép (2 đầu bức tranh) |
| 3 | `library-exit` | không hiện ở 2/13 cột |
| 1 | `gate` | không hiện ở 14/25 cột (cổng vòm: xem mục 5) |
| 2 | `stairs` (cổng ra) | không hiện ở 10/21 cột (cổng vòm) |
| 2 | `poem`, `rune-*` | OK (đã có `isInReach` bốn phía, giữ nguyên) |
| 4 | `creek-practice-source` | không hiện ở 3/5 cột |
| 4 | `creek-latch-a`, `creek-latch-b` | không hiện ở 4/4 cột (vật sát nước, đứng từ phía đường đi) |
| 4 | `creek-g1`, `creek-g2`, `creek-relief`, `creek-exit` | đo phía nam không có ô đi được: phải đo theo `stand` riêng |

Thư viện: `library-book`, `library-inscription`, `creek-main-source`, `creek-practice-mirror`, `creek-g3` đã đạt (extraGap ≤ 2).

## 3. Thiết kế sửa (opt-in, không đổi hành vi các mục khác)

Đo tầm với bằng **khoảng cách giữa thân bàn chân và khối va chạm của vật**, giống cách màn 2 đã làm cho bia đá (`isWoodsStoneInReach`, `WOODS_STONE_REACH_PADDING = 11` trong `src/data/whisperingWoodsLayout.ts`).

1. **File mới `src/systems/interactionReach.ts`** (hàm thuần, không import Phaser):
   ```ts
   export interface ReachRect { x: number; y: number; width: number; height: number }
   export interface ReachFootprint {
     rect: ReachRect;            // khối va chạm của vật
     face?: 'south' | 'any';     // mặc định 'south'
     maxGap?: number;            // mặc định 10 (px, từ thân bàn chân tới rect)
     sideMargin?: number;        // mặc định 6, chỉ dùng cho face 'south'
   }
   export function rectGap(a: ReachRect, b: ReachRect): number;      // khoảng cách Euclid giữa hai hình chữ nhật, 0 nếu chạm/chồng
   export function isFootInReach(foot: ReachRect, reach: ReachFootprint): boolean;
   ```
   - `'any'`: `rectGap(foot, rect) <= maxGap`.
   - `'south'`: `foot.y >= rect.y + rect.height - 2` (chân không nằm cao hơn mép nam) **và** khoảng cách ngang ≤ `sideMargin` **và** khoảng cách dọc ≤ `maxGap`.
2. **`src/types/gameTypes.ts`**: thêm vào `InteractableConfig` trường tùy chọn `reach?: ReachFootprint` (comment: thay thế bán kính khi có thân bàn chân; `isInReach` tự định nghĩa vẫn ưu tiên cao hơn).
3. **`src/systems/InteractionSystem.ts`**:
   - `update(playerX, playerY, canInteract, playerBounds?, protectedBounds = [], footBody?: ReachRect)`. Lưu `footBody` vào `lastFootBody`.
   - Thứ tự quyết định `inReach`: `item.isInReach` → (`item.reach` **và** có `footBody`) dùng `isFootInReach` → bán kính cũ. Khi không có `footBody` (test cũ) rơi về bán kính để không vỡ script hiện có.
   - `tryInteract()` kiểm lại đúng cùng điều kiện (dùng `lastFootBody`).
4. **`src/actors/Player.ts`**: thêm `getFootBody(): ReachRect` đọc từ `this.sprite.body` (`x, y, width, height`).
5. **`src/scenes/CampaignScene.ts`** (chỗ gọi `this.interactions.update(` khoảng dòng 433): truyền thêm `this.player.getFootBody()` làm tham số cuối.
6. Mỗi vật ở màn 1–4 cần sửa thì thêm `reach: { rect: <khối va chạm của nó> }` khi `register`. Lấy `rect` từ dữ liệu layout (không tự bịa số): `LIBRARY_SOLID_RECTS` (`src/data/libraryLayout.ts`), `FOREST_EDGE_SOLIDS` (`src/data/forestEdgeLayout.ts`), `WHISPERING_WOODS.footprints` (`src/data/whisperingWoodsLayout.ts`), `SHATTERED_CREEK` (`src/data/shatteredCreekLayout.ts`). Giữ nguyên `x, y, radius` cũ (chúng vẫn dùng khi không có `footBody`, và để xếp thứ tự ứng viên).

## 4. Công việc, làm lần lượt, mỗi mục một commit riêng

**T0 — Chuẩn bị.** Chạy `git status` (phải sạch ở các file `src/`, `scripts/`). Mở **tab trình duyệt riêng** (`mcp__Claude_Browser__tabs_create`) tới `http://localhost:5173` (máy chủ dev đã chạy; nếu không, `preview_start` với tên `last-lantern-dev`). Luôn truyền `tabId` của tab đó; **không đụng tab `seed`**. Sau khi `navigate`, chụp ảnh một lần để đánh thức canvas, rồi đợi `MenuScene`. Dán nội dung `scripts/browser-audit-interaction-reach.js` vào trang, chạy `await __reachAudit.start(2, {'l0-complete':true,'l1-complete':true})` rồi `__reachAudit.report()` để xác nhận số đo bảng mục 2 (màn 3). Ghi các số đo "trước" vào cuối file này (mục 8).

**T1 — Hạ tầng.** Làm mục 3.1–3.5. Thêm `scripts/check-interaction-reach.mjs` kiểm hàm thuần (xem mục 6). Chạy `npx tsc --noEmit` và `node scripts/check-interaction-reach.mjs`. Commit: `feat(interaction): foot-to-footprint reach for opted-in controls`.

**T2 — Màn 3 (Library).** Trong `LibraryLevel.registerInteractions` (khoảng dòng 540–580):
- `library-rack-0..3`: `reach.rect` = bốn khối giá trong `LIBRARY_SOLID_RECTS` (`{108,102,48,48}`, `{156,102,48,48}`, `{108,212,48,48}`, `{156,212,48,48}` tương ứng 0,1,2,3).
- `library-mural`: `reach.rect` = `{446,90,84,110}` (khối tranh trong `LIBRARY_SOLID_RECTS`).
- `library-exit`: cổng vòm (mục 5). `reach.rect` = lối vào giữa hai trụ: `LIBRARY_EXIT_THRESHOLD` (`{564,144,32,22}`), `face: 'south'`, `sideMargin: 0`.
- Giữ nguyên `library-seat-*` (luật 2: chỉ trong ô), `library-confirm`, `library-crystal`, `library-book`, `library-inscription`.
Chạy audit màn 3 → đạt tiêu chí mục 6. Chạy `node scripts/check-library-reachability.mjs scripts/check-library-guidance.mjs scripts/check-interaction-targets.mjs`. Commit: `fix(level03): E prompt shows flush against racks, mural and gate`.

**T3 — Màn 1 (Forest Edge).** Các `addAction` của màn 0 (`lamp`, `lantern-inscription`, `tablet`, `gate`) trong `CampaignScene.ts` (khoảng dòng 2031–2230, `addAction`/`action`). Thêm `reach` cho `lamp`, `lantern-inscription`, `tablet`, `gate` bằng rect tương ứng trong `FOREST_EDGE_SOLIDS`/`FOREST_EDGE.objects`; `gate` theo mục 5. Audit màn 1 hai lần: có đèn (`lantern=true`) và chưa nhặt đèn (`lantern=false`, `lamp` mới bật). Chạy `node scripts/check-forest-edge.mjs scripts/level01-browser-regression.cjs` nếu chạy được. Commit: `fix(level01): ...`.

**T4 — Màn 2 (Woods).** Chỉ sửa `stairs` (cổng ra, mục 5). **Không đổi** `poem`/`rune-*` (đã bốn phía theo RULE_GAMES mục 3). Audit màn 2. Commit: `fix(level02): ...`.

**T5 — Màn 4 (Creek).** Trong `src/scenes/ShatteredCreekController.ts` (đăng ký `creek-*`). Với mỗi mục lấy `rect` từ `SHATTERED_CREEK` (solids/objects):
- `creek-practice-source`: face `'south'` như thường.
- `creek-latch-a`, `creek-latch-b`: vật sát nước, không đứng từ nam được. Dùng `face: 'any'` nhưng **chỉ ở phía đường đi**: nếu khó, giữ `stand`/`canApproach` hiện có (ghi chú trong code vì sao) và chỉ bảo đảm prompt hiện **đúng tại `stand` và trong 6 px quanh nó**.
- `creek-g1`, `creek-g2`, `creek-relief`, `creek-exit`: đo tại `stand` của chúng trong `SHATTERED_CREEK.objects` (không đo phía nam). Tiêu chí: tại chính `stand` prompt hiện; cách `stand` > 24 px thì không hiện.
Audit màn 4 với `{'l0-complete':true,'l1-complete':true,'l2-complete':true}` (nhiều mục bị khóa theo tiến trình, script đã ép bật). Chạy `node scripts/check-shattered-creek.mjs`. Commit: `fix(level04): ...`.

**T6 — Luật + kiểm tra cuối.** Sửa `RULE_GAMES.md` mục 1: thêm câu "tầm với đo bằng khoảng cách thân bàn chân tới khối va chạm (`reach`, ≤10 px, mép nam), không đo từ tâm sprite". Chạy toàn bộ: `npx tsc --noEmit` và `for f in scripts/check-*.mjs; do node $f; done` (tất cả phải pass). Commit: `docs(rules): reach is measured from the foot body`.

## 5. Ngoại lệ: cổng vòm / lối ra

Cổng vòm là ngoại lệ luật 3 (RULE_GAMES): chỉ cần prompt hiện **ngay dưới lối vào** (phần rộng bằng khe giữa hai trụ), không cần ở toàn bộ chiều rộng hình vẽ. Vì vậy `reach.rect` của cổng là **khe lối vào**, không phải cả ảnh. Audit sẽ báo `noPrompt` > 0 cho các cột ở hai bên trụ; chấp nhận được nếu mọi cột nằm trong khe đều hiện.

## 6. Tiêu chí hoàn thành

Với mỗi mục đã sửa, khi chạy `__reachAudit.report()` (đã ép bật mọi mục):
- `extraGap ≤ 4` và `noPrompt = 0` (trừ cổng vòm theo mục 5 và vật sát nước theo T5).
- `northHits = 0` ở mọi mục, **trừ** `poem`/`rune-*` của màn 2 (bốn phía theo thiết kế).
- Không có mục ở màn 1–4 xấu đi so với số đo "trước".
- `scripts/check-interaction-reach.mjs` (mới) kiểm: (a) chân chạm mép nam, giữa vật → `true`; (b) cách 10 px → `true`, cách 14 px → `false`; (c) phía bắc sát vật → `false` với face `'south'`; (d) lệch ngang > `sideMargin` → `false`; (e) face `'any'` ở phía bắc/đông/tây ≤ `maxGap` → `true`.
- `tsc` sạch, 100% `scripts/check-*.mjs` pass.

## 7. Ràng buộc

- Chỉ sửa file thuộc màn 1–4 và hạ tầng ở mục 3. **Không sửa** `src/levels/{SleepingGarden,SleeplessTower,PathForTwo,RuinsOfTwoHalves,HeartOfElaria}Level.ts`, `Observatory*`, `CampaignHud.ts`.
- Không đổi hành vi mục không có `reach` (màn 5–10 phải y nguyên).
- `git add` từng file cụ thể. **Không** `git add -A`, không thêm `artifacts/`, `.impeccable/`, `.claude/`, `dist/`.
- **Không push.** Không build vào `dist/` (nếu cần build: `npm run build -- --outDir <thư mục tạm>`).
- Nếu một mục không đạt được trong 2 lần thử, dừng mục đó, ghi lý do vào mục 8 và làm tiếp mục khác.

## 8. Nhật ký thực thi (agent điền)

### 8.0 Commit đã tạo

| Mục | Commit | Nội dung |
| --- | --- | --- |
| T1 | `edcfb41` | feat(interaction): foot-to-footprint reach for opted-in controls (kèm sửa harness `check-interaction-targets.mjs`: thêm tham số `footBody` và `isInRange`, không đổi assertion) |
| T2 | `eed861f` | fix(level03): E prompt shows flush against racks, mural and gate (mural/cổng: xem 8.3) |
| T3 | `fef21a5` | fix(level01): E prompt shows flush against lantern pedestal, tablet and gate slot |
| T4 | `1abb835` | fix(level02): E prompt shows flush against the woods gate slot |
| T5 | — | Không đổi code (xem 8.4) |
| (phụ) | `a4c7ff0` | test(campaign): frame stand-in provides getFootBody (check-campaign-runtime bị T1 làm lỗi; đã sửa, không đổi assertion) |
| T6 | (commit này) | docs(rules): reach is measured from the foot body; ghi mục 8 |

### 8.1 Về bộ đo `scripts/browser-audit-interaction-reach.js` (chưa commit, file untracked)

Bộ đo gốc không đo đúng runtime nên đã sửa hai điểm (tiêu chí giữ nguyên):

1. Truyền thân bàn chân vào `I.update(...)` như `CampaignScene` (tham số thứ 6). Bản gốc gọi `update(x, y, true)`, nên mọi mục có `reach` bị đo bằng bán kính cũ.
2. Với mục có `reach`, "mép nam" là mép nam của `reach.rect` (bản gốc: mép dưới ảnh prompt). Chỉ ảnh hưởng `library-exit` (178 → 166) và `stairs` (190 → 178); các mục khác có mép trùng nhau.

Hai hiện tượng của chế độ "ép bật mọi mục" làm số đo không phản ánh game (đã kiểm chứng bằng probe trạng thái thật, không ép bật, di chuyển sprite nếu cần):

- Cạnh tranh giả: mục đăng ký trước thắng khi hòa (`lamp` thắng `lantern-inscription`), và `library-seat-1` luôn được ép hiện prompt nên thắng `library-mural` ở hai cột mép trái. Trong game, các mục này loại trừ nhau hoặc seat bị khóa bởi ô.
- Màn 4: các predicate creek (`canApproach`) đọc `this.point()` (vị trí người chơi thật), không đọc tham số `x, y`. Chế độ ép bật thay các predicate đó bằng `true`, nên số đo màn 4 chỉ còn là bán kính radial quanh `stand`. Số đo creek không dùng để kết luận.

### 8.2 Bảng số đo trước/sau

Trước = T0 (code gốc `877b1f7`, bộ đo gốc). Sau = HEAD sau T4 (bộ đo đã sửa). Ký hiệu: `extraGap` (99 = không hiện ở vài cột), `noPrompt` = cột đi được nhưng không hiện E / tổng cột, `northHits` = cột phía bắc hiện E / tổng.

| Màn | Mục | Trước: extraGap, noPrompt, northHits | Sau: extraGap, noPrompt, northHits | Trạng thái thật (probe) |
| --- | --- | --- | --- | --- |
| 1 | lamp | 0, 0/3, 0/3 | 0, 0/3, 0/3 | Hiện từ chân y 236–248 (đế bệ 238). Đạt |
| 1 | lantern-inscription | 99, 3/3, 0/3 | 99, 3/3, 0/3 (artefact: lamp thắng khi hòa) | Khi đã nhặt đèn: hiện y 236–248. Đạt thật, không đạt theo bộ đo ép bật |
| 1 | tablet | 0, 0/7, 0/7 | 0, 0/7, 0/7 | Hiện y 228–240 (mép nam 230). Đạt |
| 1 | gate | 99, 14/25, 0/25 | 99, 14/25, 0/25 (14 cột ngoài trụ, §5) | Trong khe: hiện từ mép ngưỡng (y 168–176); không hiện ở 178. Đạt theo §5 |
| 2 | poem, rune-moon, rune-leaf, rune-star | 0 (không đổi, bốn phía) | 0 (không đổi) | Không đổi |
| 2 | stairs | 99, 10/21, 0/21 | 99, 12/21, 0/21 (12 cột ngoài khe, §5) | Trong khe x 486–534: hiện y 180–188; không hiện từ 190. Đạt theo §5 |
| 3 | library-rack-0..3 | 15, 0/7, 0/7 (mỗi mục) | 0, 0/7, 0/7 (mỗi mục) | Đạt (theo đo chính thức) |
| 3 | library-mural | 99, 4/14, 0/13 | 99, 2/14, 0/13 (2 cột: seat-1 ép bật; bộ đo dao động 2–3/14 giữa các lần) | Không ép bật, bật `l2-crystal`: hiện y 202–210 ở mọi cột 449–527; không hiện ở 212. Đạt thật |
| 3 | library-exit | 99, 2/13, 0/0 | 99, 10/13, 0/0 (cột ngoài trụ, §5) | Trong khe x 572–588: hiện y 168–176; không hiện ở 178. Đạt theo §5 |
| 3 | inscription, book, seat-0..3, confirm, crystal | không đổi | không đổi | Ngoài phạm vi (plan: giữ nguyên). `library-confirm` 5/11 không có trong bảng kế hoạch |
| 4 | practice-source | 0, 0/5, 0/5 | 0, 0/5, 0/5 (không đổi) | Chưa đổi code (xem 8.4) |
| 4 | latch-a, latch-b | 0, 0/4, 4/4 | không đổi | Thật: hiện tại stand (mép bắc của bệ, đường đi), và trong 18–24 px trên bờ; tắt từ 28 px |
| 4 | g1, g2, main-source, exit | không đổi | không đổi | Thật: hiện tại stand và đến khoảng 18 px; tắt từ 28 px |
| 4 | relief | 99, 10/21, 0/21 | không đổi | Thật: chỉ hiện quanh stand (x 540–550). Xem 8.4 |

Ghi chú bảng kế hoạch mục 2 không khớp đo lại (không sửa số, chỉ ghi): `creek-practice-source` đo 0/5 (bảng ghi 3/5); `creek-latch-a/b` đo hiện từ phía bắc 4/4 (bảng ghi không hiện 4/4).

### 8.3 Tiêu chí mục 6 — kết quả

- Mục đã sửa, `extraGap ≤ 4` và `noPrompt = 0`: racks (có), tablet (có), lamp (có). Không đạt theo bộ đo chính thức, nhưng đạt khi probe trạng thái thật: mural (artefact seat-1), lantern-inscription (artefact tie với lamp). Không đạt theo bộ đo và cũng không đạt theo ngoại lệ: không có.
- Cổng vòm (§5): gate, stairs, library-exit đạt điều kiện "mọi cột trong khe đều hiện" đã kiểm chứng bằng probe; cột ngoài trụ mất E như ngoại lệ cho phép. Lưu ý: stairs và library-exit có số cột thiếu E tăng so với trước (10→12, 2→10) vì bán kính cũ từng phủ một phần phía ngoài trụ.
- `northHits = 0` ở mọi mục đã sửa: có. (Seat 3/7 là mục không sửa; latch có "bắc" là chính `stand`, là phía tiếp cận theo §3.)
- "Không xấu đi": racks, tablet, lamp, mural cải thiện hoặc giữ nguyên. Gate giữ 14/25 (không đổi). Stairs và library-exit tăng cột thiếu E ở phía ngoài trụ (ngoại lệ §5; xem trên). Các mục khác không đổi.
- `scripts/check-interaction-reach.mjs` (mới): đạt (a)–(e).
- `tsc --noEmit`: sạch. Toàn bộ `scripts/check-*.mjs`: xem 8.5.

### 8.4 T5 (màn 4): không đổi code

Lý do: đo trạng thái thật (không ép bật) cho thấy các `creek-*` đã đạt tiêu chí stand của kế hoạch (T5): hiện tại `stand` và đến khoảng 18 px trên đúng bờ, tắt từ 28 px. Đây là cơ chế `canApproach` (24 px quanh `stand` + bờ), vẫn là bán kính gốc; không cần thêm `reach`.

- `creek-practice-source`: nếu thêm `reach` (face south, base 57,281,22,10), mép nam là y 291, còn `stand` có chân ở y 304 (cách 13 px > maxGap 10). Sẽ làm mất E ngay tại `stand` và tại điểm spawn (68,286 → chân 302, cách 11 px). Không thêm.
- `creek-latch-a/b`: E hiện tại `stand` (mép bắc của bệ, đúng phía đường đi) và trong 6 px quanh. Đây là ngoại lệ vật sát nước §3. Số "bắc 4/4" của bộ đo là đúng thiết kế, không phải lỗi. Không thêm.
- `creek-relief`: **phát hiện cần quyết định.** Mép nam bệ (y 182) đi được ở x 500–530 (chân từ y 184), nhưng ở đó không có E; E chỉ hiện quanh `stand` (546,188). Kế hoạch giả định "phía nam không có ô đi được" là không đúng với mục này. Sửa đúng cần thay cơ chế `canApproach` của relief (vì `canApproach` chặn prompt ngoài 24 px quanh `stand` dù có `reach`), tức là thiết kế lại. Chưa làm; đề nghị người dùng quyết định.
- Creek không có thay đổi code, nên không có commit T5. `check-shattered-creek.mjs`: đạt.

### 8.5 Kiểm tra cuối

- `npx tsc --noEmit`: sạch.
- Toàn bộ `scripts/check-*.mjs` (mỗi script riêng): xem dòng kết quả ở báo cáo cuối (chạy sau T6).
- `scripts/level01-browser-regression.cjs`: không chạy được vì dự án không có module `playwright` (không cài thêm gói). Chưa kiểm được bằng script này.
- Không push, không đụng `artifacts/`, `.impeccable/`, `.claude/`, `dist/`, màn 5–10, HUD.
