# Kế hoạch: chọn lại màn trong menu tạm dừng

Ngày: 2026-10-20 · Áp dụng cả bản demo (màn 1–4) và bản đầy đủ.

## 1. Quyết định của chủ dự án (không bàn lại)

1. Chỉ chọn màn trong **menu tạm dừng** (ESC khi đang chơi). Không thêm vào menu chính, không thêm lối quay lại trong thế giới.
2. Quay lại một màn thì **giữ nguyên các câu đố đã giải** (không đặt lại cờ/trạng thái).
3. Danh sách chọn gồm **màn hiện tại và mọi màn trước đó**, cộng với các màn đã từng tới xa hơn (xem `furthest` bên dưới): người chơi lùi về màn 2 rồi vẫn có thể quay lại màn 4 mà mình đã tới. Không bao giờ hiện màn chưa từng tới.
4. **Có áp dụng cho bản demo.** Bản demo tuyệt đối không được lộ màn 5 trở đi, kể cả khi save lấy từ bản đầy đủ có `furthest` lớn.

## 2. Hiện trạng đã khảo sát (đừng khảo sát lại)

- `src/ui/PauseMenu.ts`: 4 mục cố định (TIẾP TỤC, CHƠI LẠI TỪ ĐẦU, ÂM THANH, MÀN HÌNH CHÍNH), dùng chỉ số 0–3 trong `triggerSelected()` và `refreshHighlight()`. Khung 280×220 tại (180,70), mục cách nhau 32 px từ y=145, dải điều khiển ở y≥254. **`WorldScene` cũng dùng PauseMenu** (4 mục, định tuyến phím riêng): hành vi của nó **không được đổi**.
- `src/scenes/CampaignScene.ts`: tạo PauseMenu quanh dòng 240 chỉ với 3 callback. **CampaignScene hiện không chuyển phím mũi tên/Enter vào menu** (chỉ chuột + ESC): các handler `keydown-E` / `keydown-SPACE` (dòng ~256–270) đều bỏ qua khi menu mở. Phải thêm định tuyến phím khi menu mở.
- `CampaignScene.nextLevel()` (dòng ~2529): `progress.level += 1`, đặt `lanternPickedUp`, `lanternOn`, cờ `pulse-used`, `save()`, `scene.restart()`. Ở bản demo, tại màn có chỉ số `RELEASE_POLICY.lastPlayableLevelIndex` (= 3) thì chuyển sang `ComingSoonScene` thay vì tăng màn.
- Save (`src/systems/CampaignSaveSystem.ts`): `CampaignProgress { version: 1; level; flags; counters; lanternOn; lanternPickedUp; roomId?; roomSpawn? }`. `validate()` dựng lại từng trường, `save()` ghi từng trường: thêm trường mới phải sửa **cả hai**. Giữ `version: 1` (đã có tiền lệ: cờ chuỗi `l9-ending-beat`). Save cũ không có trường mới phải đọc được bình thường.
- Cờ trạng thái mỗi màn có tiền tố riêng (`l0-…`, `l1-…`…) và được lưu, nên màn đã giải vẫn giữ trạng thái khi vào lại. Vị trí nhân vật chỉ nhớ cho màn hiện tại (`counters['player-level']`, `player-x`, `player-y`): vào màn có `player-level` khác thì xuất hiện ở điểm bắt đầu mặc định. Đây là hành vi mong muốn.
- Dòng ~238 của CampaignScene: `lantern.lanternInHand = progress.lanternPickedUp || progress.level > 0`. Vào lại màn 1 (chỉ số 0) với `lanternPickedUp = true` thì đèn nằm trong tay.
- Màn chỉ số 8 (Đài thiên văn) dùng `progress.roomId` / `roomSpawn`: khi đổi màn phải **xóa cả hai** để màn đích dựng ở mặc định (phòng `entrance`).
- Tên màn: `CAMPAIGN_LEVELS[i].title` trong `src/data/campaignLevels.ts` (tiếng Anh, dài nhất "Library Beneath the Roots").
- `RELEASE_POLICY` (`src/config/releaseConfig.ts`): `isDemo`, `lastPlayableLevelIndex` (demo = 3, đầy đủ = 9).

## 3. Thiết kế

**Save: thêm trường tùy chọn `furthest?: number`** (màn xa nhất từng tới, 0–9).
- `validate()`: nếu `data.furthest` là số nguyên trong `[level, 9]` thì giữ; nếu thiếu thì `= level` (không đánh dấu `repaired`); nếu có nhưng sai kiểu/ngoài khoảng (nhỏ hơn `level` thì nâng lên `level`; lớn hơn 9 hoặc không phải số nguyên thì `= level`), đánh dấu `repaired`.
- `save()`: ghi `furthest = clamp(max(progress.furthest ?? 0, progress.level), 0, 9)`. **Không bao giờ giảm** khi `level` giảm.

**Hàm thuần mới `src/systems/levelSelect.ts`** (không import Phaser, dùng được từ script Node):
```ts
export function reachedLevel(progress: { level: number; furthest?: number }, lastPlayable: number): number
  // max(level, furthest ?? level), rồi min(…, lastPlayable), và không nhỏ hơn 0
export function canSelectLevel(target: number, progress: {...}, lastPlayable: number): boolean
  // số nguyên, 0 <= target <= reachedLevel, target !== progress.level
export function applyLevelSelection(progress: CampaignProgress, target: number, lastPlayable: number): boolean
  // nếu canSelectLevel: furthest = max(furthest ?? 0, level cũ, reached); level = target;
  // delete roomId, roomSpawn; lanternPickedUp = true; KHÔNG đụng flags/counters khác; trả true. Ngược lại trả false và không đổi gì.
```
Bản demo bị chặn bằng `lastPlayable` (truyền `RELEASE_POLICY.lastPlayableLevelIndex`).

**PauseMenu**: thêm tham số tùy chọn `levels?: { names: readonly string[]; getCurrent(): number; getReached(): number; onSelect(index: number): void }` vào constructor.
- Khi có `levels`: 5 mục theo thứ tự TIẾP TỤC, **CHỌN MÀN**, CHƠI LẠI, ÂM THANH, MÀN HÌNH CHÍNH; mục cách nhau 26 px từ y=134. Khi không có `levels` (WorldScene): 4 mục như cũ, khoảng cách và nhãn y nguyên.
- Dùng danh sách hành động có tên (`'resume' | 'levels' | 'restart' | 'sound' | 'menu'`) thay cho chỉ số 0–3 cứng.
- Mục CHỌN MÀN hiển thị `MÀN: ◂ 03 · Library Beneath the Roots ▸` (font nhỏ hơn, 10.5–11 px, để vừa khung). Lựa chọn khởi tạo = màn hiện tại mỗi lần `open()`. Phương thức công khai `changeLevelChoice(delta)` (chỉ có tác dụng khi mục CHỌN MÀN đang được chọn; vòng tròn trong `[0, reached]`).
- Xác nhận hai bước như CHƠI LẠI: nếu lựa chọn khác màn hiện tại, lần kích hoạt đầu đổi nhãn thành `VÀO MÀN 02? NHẤN LẦN NỮA`, lần hai gọi `onSelect(choice)` rồi `close()`. Nếu lựa chọn = màn hiện tại: kích hoạt chỉ chuyển lựa chọn sang màn kế (để người dùng chuột đổi được). Di chuyển lựa chọn/mục đang chọn thì hủy trạng thái xác nhận.
- Chuột: hover chọn mục, click kích hoạt (như hiện có).

**CampaignScene**:
- Truyền `levels` vào `new PauseMenu(...)`: `names` từ `CAMPAIGN_LEVELS.map((l) => l.title)` cắt tới `lastPlayableLevelIndex + 1`... (lấy theo `getReached()` khi vẽ, đừng hardcode 4), `getCurrent: () => this.progress.level`, `getReached: () => reachedLevel(this.progress, RELEASE_POLICY.lastPlayableLevelIndex)`, `onSelect: (i) => this.selectLevel(i)`.
- `private selectLevel(target: number)`: bỏ qua nếu đang hội thoại, `heartEnd`, hoặc `redirecting`; gọi `applyLevelSelection`; nếu true thì `this.save()`, `SoundSystem.playGateOpen()`, `this.scene.restart()` (giống `nextLevel`).
- Phím khi menu **đang mở** (chỉ khi mở; không đổi hành vi khi menu đóng): `UP`/`W` → `moveSelection(-1)`, `DOWN`/`S` → `moveSelection(1)`, `LEFT`/`A` → `changeLevelChoice(-1)`, `RIGHT`/`D` → `changeLevelChoice(1)`, `ENTER` → `triggerSelected()`; `E` và `SPACE` khi menu mở cũng gọi `triggerSelected()` (hiện chúng bị bỏ qua).
- `nextLevel()` không cần đổi: `save()` tự cập nhật `furthest`.

## 4. Công việc, làm lần lượt, mỗi mục một commit riêng

**T1 — Save.** `furthest` trong `CampaignSaveSystem` (`validate` và `save`) và kiểu `CampaignProgress`. Thêm kiểm tra vào `scripts/check-campaign-save.mjs` (tìm cách script này nạp `CampaignSaveSystem` và giả lập `localStorage`, làm theo cách sẵn có): save cũ không có `furthest` đọc ra `furthest === level`; `furthest < level` được nâng; `furthest` > 9 hoặc không nguyên về `level` và đánh dấu `repaired`; vòng ghi–đọc giữ `furthest`; ghi với `level` thấp hơn `furthest` cũ **không** làm giảm `furthest`. Commit: `feat(save): remember the furthest level reached`.

**T2 — Hàm thuần.** `src/systems/levelSelect.ts` + `scripts/check-level-select.mjs` (làm theo mẫu `scripts/check-interaction-reach.mjs`). Kiểm: đầy đủ (lastPlayable 9) và demo (3); `furthest` 7 trong demo bị cắt về 3; mục tiêu âm/không nguyên/NaN/vượt `reached`/bằng màn hiện tại → `false` và không đổi `progress`; hợp lệ → `level` đổi, `roomId`/`roomSpawn` bị xóa, **`flags` và `counters` nguyên vẹn (so sánh sâu)**, `furthest` không giảm. Commit: `feat(levels): pure level-selection rules`.

**T3 — PauseMenu.** Như mục 3. Bảo đảm `WorldScene` vẫn dựng menu 4 mục (chạy `npx tsc --noEmit`). Commit: `feat(pause): level selector row`.

**T4 — CampaignScene.** Như mục 3. Nếu một script kiểm tra dựng giả `PauseMenu`/`CampaignScene` (grep `PauseMenu` trong `scripts/`: `check-campaign-hud.mjs`, `check-prologue.mjs`), cập nhật harness cho chữ ký mới, **không đổi assertion nào**. Commit: `feat(campaign): switch to an earlier level from the pause menu`.

**T5 — Kiểm chứng trong game thật.**
- Dev server đã chạy ở http://localhost:5173 (nếu không: `mcp__Claude_Browser__preview_start` với tên `last-lantern-dev`). Mở **tab riêng** (`tabs_create`), luôn truyền `tabId`, không dùng tab `seed`. Sau `navigate`, chụp một ảnh để đánh thức canvas, rồi đợi `MenuScene` (có thể mất 10–30 s). Lỗi "Missing darkness falloff texture" nghĩa là game chưa nạp xong: tải lại và đợi. Pane trình duyệt phải đang hiển thị; nếu thao tác treo, thử `mcp__ccd_view__show_pane` với `pane: "preview"`.
- Gieo save bằng `localStorage.setItem('last-lantern-campaign-save-v1', …)` (xem `scripts/browser-audit-interaction-reach.js` hàm `start` làm mẫu), `g.scene.start('CampaignScene')`.
- Kịch bản: (a) save `level: 3`, `furthest: 3`, cờ `l0-complete`, `l1-complete`, `l2-complete` → ESC → menu có mục CHỌN MÀN với 4 màn; chọn màn 2 bằng ←/→ và Enter hai lần → vào màn chỉ số 1, `progress.level === 1`, `furthest === 3`, cờ của màn đó còn nguyên; ESC lại → vẫn chọn được màn 4. (b) Save `level: 0`: menu chỉ có màn 1 (không có gì để chọn thì mục vẫn hiện nhưng không đổi được, hoặc ẩn; chọn cách hợp lý và ghi lại). (c) Bản demo: chạy `VITE_BUILD_FLAVOR=demo npx vite --port 5180`, gieo save `level: 1`, `furthest: 7` → menu chỉ liệt kê tới màn 4, không có màn 5. (d) Chụp ảnh menu có mục CHỌN MÀN để kiểm tra chữ không tràn khung.
- Ghi kết quả vào mục 6 của file này.

**T6 — Cuối.** `npx tsc --noEmit` sạch; chạy toàn bộ `scripts/check-*.mjs` từng cái một, tất cả phải pass. Commit phần ghi chú (mục 6): `docs(plan): level select results`.

## 5. Ràng buộc

- Chỉ sửa: `CampaignSaveSystem.ts`, `levelSelect.ts` (mới), `PauseMenu.ts`, `CampaignScene.ts`, các script kiểm tra liên quan, file kế hoạch này. **Không sửa** nội dung từng màn, HUD, `WorldScene`, `dist/`.
- `git add` từng file cụ thể, **không** `git add -A`; không thêm `artifacts/`, `.impeccable/`, `.claude/`. **Không push.** Không đụng thư mục `D:\Z_PROJECT\The_Last_Lantern\the-last-lantern-deploy` (worktree của nhánh `deploy`).
- Không đổi hành vi: `nextLevel`, các màn, bản demo vẫn dừng ở màn 4 với Coming Soon, `WorldScene`.
- Mỗi commit kết thúc bằng dòng trailer `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.
- Nếu một mục không đạt sau 2 lần thử, dừng, ghi lý do vào mục 6, làm tiếp mục khác. Không tự nới tiêu chí.

## 6. Nhật ký thực thi (agent điền)

**Commit:**
- T1 `4f22ebc` feat(save): remember the furthest level reached
- T2 `cca87f6` feat(levels): pure level-selection rules
- T3 `94b4a84` feat(pause): level selector row
- T4 `debe323` feat(campaign): switch to an earlier level from the pause menu

Trong T1, fixture `fullSave()` của `check-campaign-save.mjs` có thêm `furthest: 8` (save hợp lệ theo định dạng mới). Bốn ca "round-trip nguyên vẹn" cũ vẫn so deep-equal với input, không đổi assertion. Harness `check-prologue.mjs` (T4) có thêm `actions` vào hai object giả PauseMenu, không đổi assertion nào.

**T5, trình duyệt (tab riêng, dev server 5173 và bản demo 5180):**
- (a) PASS. Save `level 3, furthest 3`, cờ `l0..l2-complete`. ESC → mục CHỌN MÀN, `MÀN: ◂ 04 · Shattered Moonlit Creek ▸`. Mũi tên trái hai lần → màn 02, Enter → `VÀO MÀN 02? NHẤN LẦN NỮA`, Enter → vào `level 1`. Trong RAM và trong save: `furthest 3`, `lanternPickedUp true`. Mọi cờ cũ giữ nguyên giá trị. Counter `player-level`/`player-x` đổi sang điểm bắt đầu của màn 02 (hành vi vị trí đã định). Mở ESC lại: chọn được màn 04 (chỉ số 3), đi tới được, save `level 3, furthest 3`.
- (b) PASS. Save `level 0`: dòng hiện `MÀN: 01 · Forgotten Forest Edge` (không có mũi tên). Nhấn chọn không đổi gì và không vào bước xác nhận. Mục vẫn hiện, không ẩn.
- (c) PASS (bản demo, `VITE_BUILD_FLAVOR=demo`, cổng 5180). Save `level 1, furthest 7`. Danh sách chỉ có 4 tên (màn 01–04). Mũi tên phải dừng ở màn 04 và quay vòng về màn 01, không bao giờ hiện màn 05. Phím E khi menu mở đưa vào bước xác nhận, không chuyển màn. ESC đóng menu, save vẫn `level 1, furthest 7`.
- (d) PASS. Ảnh chụp menu với dòng CHỌN MÀN `MÀN: ◂ 04 · Shattered Moonlit Creek ▸` được tô vàng khi chọn, chữ nằm trong khung 280×220, không tràn.

**Ghi chú quan sát:**
- Khi vào một màn bằng `scene.restart()`, màn có hội thoại mở đầu nên ESC chỉ bấm qua thoại. Đây là hành vi có sẵn (cũng xảy ra với `nextLevel`), không do tính năng này.
- Chưa kiểm tra bằng chuột (hover/click vào dòng CHỌN MÀN) trong trình duyệt. Logic chuột dùng chung `setSelected` và `triggerSelected` đã được đọc lại nhưng chưa chạy thật.
- Lệnh phím có tham số `repeat` của công cụ trình duyệt chỉ gửi được một lần nhấn trong lần thử, nên các bước mũi tên đều nhấn từng lần một. Đây là giới hạn của công cụ, không phải lỗi game.
- Các cờ `l1-open`, `l1-activated-*`, `rune-sequence` được màn 02 tự ghi khi khởi tạo. Không thuộc phạm vi tính năng này.

**T6:** xem kết quả `tsc` và toàn bộ `check-*` ở phần báo cáo cuối.
