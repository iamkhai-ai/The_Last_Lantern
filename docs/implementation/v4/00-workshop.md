# Màn 00 — Xưởng bên sông: thiết kế dựng và kế hoạch

Nguồn duy nhất: `docs/scenario-v4/00-prologue.md`, `00-story-bible.md`, `puzzle-contracts.md`, `RULE_GAMES.md`. Art: `assets/prologue/story-v4-art-v1/` (đợt 1). Phụ thuộc: nền tảng V4 (`docs/superpowers/plans/2026-10-24-v4-foundation.md`, Task 6 phải xong trước).

## 1. Thiết kế

### Trình tự

1. **Hành trình mới** → tranh `01-ben-suong` (E/Space để tiếp) → vào xưởng, điều khiển Nhinh. Nhinh chưa có đèn bảo trì: F và Pulse tắt.
2. **Xem đèn:** E ở bàn sửa → Nhinh: “Lõi lệch rồi. Bác có làm rơi nó không?” · Lái đò: “Sóng làm rơi. Bác chỉ cầm hộ thôi.” (một lần).
3. **Lấy linh kiện:** E ở khay bên trái → chọn `Vòng giữ` hoặc `Lò xo`. Đang cầm linh kiện mà E ở khay thì đặt trả. Không cần xem đèn trước.
4. **Sửa:** cầm vòng giữ, E ở bàn → lắp, khép vỏ, bật thử trong một tương tác; đèn khách sáng, Nhinh cầm nó. Cầm lò xo, E ở bàn → “Lò xo không vừa chốt vỏ.” (không mất gì).
5. **Trả đèn:** E ở bác lái đò → 3 câu thoại V4 → bác đi một đường ngắn ra cửa nam rồi biến mất; điều khiển không bị khóa trong lúc bác đi.
6. **Sự cố:** ngay sau đó đèn bến (góc trên phải, qua cửa sổ) chớp rồi tắt một đoạn → Mẹ: “Nhinh, xem trạm cửa sổ với mẹ.”
7. **Bảng kiểm** cạnh cửa sổ: E → ghép đầu nối lỏng; chỉ báo xưởng xanh ổn định, chỉ báo đầu nguồn vẫn đứt nhịp → 5 câu thoại V4 (Nhinh/Mẹ, kết bằng “Lần này mẹ cứ để con sửa.”) → Nhinh nhận đèn bảo trì và bản đồ.
8. **Lên đường:** cửa nam mở thành chuyển cảnh → tranh `02`→`05` → màn 01 (hiện là màn chờ “Màn 01 đang dựng”).

Nội dung không có trong V4 và được thêm tối thiểu để tuân `RULE_GAMES.md` §7 (cần bạn duyệt chữ): lời từ chối khi bấm E sai lúc, mục tiêu HUD, ghi chép J. Chúng nằm cùng một chỗ trong `workshopLogic.ts` để dễ sửa.

### Trạng thái lưu

`lamp-inspected` (sự kiện một lần), `held` (`null | 'ring' | 'spring' | 'lamp'`), và bốn cờ V4: `lamp-repaired`, `boatman-returned`, `local-line-repaired`, `assignment-received`. Thêm `incident-called`: Mẹ đã gọi Nhinh tới bảng kiểm. Bỏ qua thoại vẫn đặt cờ. Tải lại sau khi bác lái đò đã về nhưng trước khi Mẹ gọi thì đèn bến chớp rồi Mẹ gọi ngay; sau đó không gọi lại. Không nhân đôi đèn/bản đồ; bác lái đò đã về thì không xuất hiện lại.

### HUD, gợi ý H, sổ tay J

| Giai đoạn | Mục tiêu | H (quan sát → quan hệ → bước) |
| --- | --- | --- |
| Sửa đèn | Sửa chiếc đèn của bác lái đò. | Chốt vỏ đèn đang lỏng. → Tìm vòng giữ có cùng tiết diện với chốt. → Lấy vòng giữ ở khay bên trái rồi nhấn E ở bàn sửa. |
| Trả đèn | Mang đèn ra cửa cho bác lái đò. | Bác lái đò đang đợi ở cửa. → Đèn đã sáng ổn định. → Nhấn E cạnh bác lái đò. |
| Bảng kiểm | Xem trạm cửa sổ với mẹ. | Đèn bến vừa tắt một đoạn. → Bảng kiểm cạnh cửa sổ nối với đường của bến. → Nhấn E ở bảng kiểm cạnh mẹ. |
| Lên đường | Đi tới trạm ở bìa rừng. | Cửa phía nam dẫn ra bến. → Mẹ giao đèn bảo trì và bản đồ. → Đi ra cửa phía nam. |

J: `elaria-signal` — “Tín hiệu bảo trì cũ từ Elaria: đường trong xưởng đã thông, đầu nguồn vẫn đứt nhịp.”; `assignment` — “Mẹ giao: kiểm tra trạm ngoài bìa rừng. Nếu đường hỏng thì quay về; đừng cố đi khi trời tối.”

### Bố cục (640×360, theo nền đợt 1 — chỉ là chỗ đặt tạm)

Mọi tọa độ nằm trong `workshopLayout.ts`, đổi khi có nền mới.

| Vật | Loại reach | Rect | Ghi chú |
| --- | --- | --- | --- |
| Sàn đi được (world) | — | `{74,98,486,206}` | ngoài sàn là tường/kệ |
| Bàn sửa | block, rắn | `{272,172,58,34}` | đèn khách vẽ trên mặt bàn |
| Khay phụ tùng | block, rắn | `{95,214,34,22}` | |
| Bảng kiểm | block, rắn | `{541,150,22,22}` | cạnh cửa sổ phải |
| Mẹ | block, rắn | chân `(524,214)`, rect `{516,208,16,6}` | quay trái |
| Bác lái đò | block, rắn | chân `(232,288)`, rect `{224,282,16,6}` | biến mất khi đã về |
| Cửa nam | vùng ra | `{264,298,100,6}` | rắn tới khi `assignment-received` |
| Điểm xuất phát | — | tâm Nhinh `(300,250)` | |

Đèn bến chớp: một lớp tối phủ vùng `{572,90,68,70}` (góc trên phải) nhấp nháy 1.2 s rồi giữ tối 50%.

### Kết quả ghép thử và art cần làm

Ảnh: `docs/implementation/v4/previews/00-workshop-mockup-v1.png` (và bản `-debug`), dựng bằng `scripts/mockup-v4-workshop.py`.

- **Tỉ lệ sai (chặn):** nền xưởng vẽ cho nhân vật cao khoảng gấp 2–3 lần Nhinh (ghế đẩu ~25px, Nhinh ~28px). Phòng rộng và trống, Nhinh rất nhỏ. Cần **nền xưởng v2** vẽ theo tỉ lệ Nhinh.
- Bộ đồ vật (bàn, khay…) lớn hơn đồ vẽ sẵn trong nền; cần xuất lại đúng tỉ lệ cùng nền v2.
- Bảng kiểm treo tường không có chỗ treo hợp lý trong góc nhìn hiện tại; cần bản **đứng trên cột** hoặc gắn tường phải.
- Cần lớp đèn bến bật/tắt khớp nền, khung đi bộ cho bác lái đò, và trạng thái “đầu nối lỏng” riêng cho bảng kiểm.

Ghép thử trong game dùng art đợt 1 làm chỗ đặt tạm; khi có art mới chỉ cần thay file và sửa `workshopLayout.ts`.

### Đặc tả art đợt 2 (người dùng tạo)

Thước đo chung: khung Nhinh 36×42 trên màn 640×360, thân nhìn thấy cao ~28 px. Bản nguồn vẽ ở 1280×720 thì Nhinh cao ~56 px (khung 72×84).

| File | Kích thước nguồn | Yêu cầu |
| --- | --- | --- |
| Nền xưởng v2 | 1280×720, không trong suốt | Cửa cao ~2× Nhinh; mặt bàn ~0,6× Nhinh; phòng vừa khung, sàn trống ở giữa. Cửa nam ở giữa cạnh dưới, cửa sổ nhìn ra bến ở tường phải. Góc trên trái 520×172 (bản 1280) và dải 52 px dưới cùng bị HUD che: chỉ đồ trang trí. Không vẽ sẵn nhân vật, đồ tương tác, chữ, tia sáng. |
| Lớp đèn bến | 1280×720, trong suốt | Chỉ các đèn bến nhìn thấy qua cửa sổ/góc phải, đặt đúng chỗ trên nền v2. Hai file: đèn sáng và đèn tắt. |
| Bàn sửa | trong suốt | Cùng tỉ lệ nền; một chiếc, nhìn từ trên-nghiêng như nền. |
| Khay phụ tùng | trong suốt | Hai linh kiện khác hình rõ: vòng giữ và lò xo. |
| Đèn của khách | trong suốt, 3 file | Lõi lệch + chốt vỏ mở; đã khép, tắt; đã khép, sáng. |
| Bảng kiểm | trong suốt, 3 file | Đứng trên cột (hoặc gắn tường phải đúng góc nhìn). Trạng thái: đầu nối lỏng, hai chỉ báo tắt; đường xưởng đã nối, chỉ báo xưởng xanh, chỉ báo đầu nguồn cam; như trên nhưng chỉ báo đầu nguồn tắt (để nhấp nháy). |
| Bác lái đò đi bộ | trong suốt, 2–3 khung | Đi xuống phía nam, cùng tỉ lệ bộ tư thế hiện có. |

Nhân vật mẹ và bác lái đò ở đợt 1 dùng tiếp được. Art đợt 2 nằm trong `assets/prologue/story-v4-art-v2/workshop/` (thư mục chưa commit). `scripts/prepare-v4-workshop.py --art-root <thư mục assets/prologue>` đọc từ đó và xuất ra `assets/levels/00-workshop/`.

**Tích hợp đợt 2 (đã làm):** nền, bàn, khay, đèn khách, bảng kiểm, lớp đèn bến và ba khung đi của bác lái đò lấy từ đợt 2. Đèn khách hỏng là `customer-lamp-open` trên bàn; đèn đã sửa được cầm và hiện `customer-lamp-lit`. Bảng kiểm lỏng là `panel-loose`; sau khi nối nó nhấp nháy giữa `panel-fault` và `panel-off`. Đèn bến là hai lớp: sáng cho tới khi Mẹ gọi, chớp khi bác lái đò tới cửa rồi tắt. `customer-lamp-closed` đã xuất nhưng chưa được dùng, vì logic không có bước khép vỏ riêng để hiện trạng thái này. Vị trí: bàn, khay, bảng kiểm và cửa được đo lại theo chân của art đợt 2; khe cửa nam mở 272–368.

## 2. Kế hoạch dựng (cho worker)

Quy tắc chung như mục "Rules for every worker" của plan nền tảng. Level id: `prologue-workshop`. Thư mục: `src/v4/levels/prologue-workshop/`.

### W1 — Logic thuần (Phaser-free) + test

- `workshopLayout.ts`: bảng ở mục Bố cục, `WORKSHOP` frozen; `WORKSHOP_SPAWN`; ids.
- `workshopLogic.ts`:
  ```ts
  export type HeldItem = 'ring' | 'spring' | 'lamp' | null;
  export interface WorkshopState { readonly lampInspected: boolean; readonly held: HeldItem; readonly lampRepaired: boolean; readonly boatmanReturned: boolean; readonly localLineRepaired: boolean; readonly assignmentReceived: boolean }
  export type WorkshopStage = 'repair' | 'deliver' | 'panel' | 'depart';
  export type WorkshopEffect = { kind: 'dialogue'; id: 'inspect' | 'payment' | 'incident' | 'diagnosis' } | { kind: 'toast'; text: string } | { kind: 'choosePart' } | { kind: 'journal'; id: 'elaria-signal' | 'assignment' };
  export interface WorkshopResult { readonly state: WorkshopState; readonly effects: readonly WorkshopEffect[] }
  export function defaultWorkshopState(): WorkshopState
  export function parseWorkshopState(raw: unknown): WorkshopState   // repairs; keeps invariants (lamp held only if repaired and boatman not returned; parts only before repair)
  export function workshopStage(s): WorkshopStage
  export function benchPrompt(s): string | null; useBench(s): WorkshopResult
  export function trayPrompt(s): string | null;  useTray(s): WorkshopResult; takePart(s, part: 'ring' | 'spring'): WorkshopResult
  export function boatmanPrompt(s): string | null; useBoatman(s): WorkshopResult   // payment + incident effects, boatmanReturned, held null
  export function panelPrompt(s): string | null; usePanel(s): WorkshopResult       // before incident: toast 'Bảng kiểm vẫn bình thường.'; after: localLineRepaired + diagnosis + journal elaria-signal; assignment is set by completeAssignment()
  export function completeAssignment(s): WorkshopResult                              // after the diagnosis dialogue: assignmentReceived + journal assignment + toast 'Nhận đèn bảo trì và bản đồ.'
  export function motherPrompt(s): string | null; useMother(s): WorkshopResult      // toast only: before incident 'Mẹ đang sửa dở một chiếc đèn.'; panel stage 'Mẹ đang đợi ở bảng kiểm.'; depart 'Mẹ: “Mang bản đồ. Nếu đường hỏng thì quay về.”'
  export function exitOpen(s): boolean                                              // assignmentReceived
  export function workshopHud(s): HudText; workshopHint(s): HintLadder | null; WORKSHOP_JOURNAL: Record<string, string>
  export const WORKSHOP_DIALOGUE: Record<'inspect' | 'payment' | 'incident' | 'diagnosis', DialogueLine[]>  // exact V4 lines
  ```
  Bench wrong-part toast: `'Lò xo không vừa chốt vỏ.'`; bench prompt `'E: xem đèn'` / `'E: lắp vòng giữ'` / `'E: thử lò xo'`; tray `'E: lấy linh kiện'` / `'E: đặt trả linh kiện'`; boatman `'E: trả đèn'` when holding the lamp, else `'E: nói chuyện'` with toast `'Đèn của bác chưa sửa xong.'`; panel `'E: kiểm tra bảng'`. Prompts return `null` for objects not present (boatman after he left; bench after repair returns null).
- Tests: full reference path; tray return; wrong part refused; no gating on inspect; reload invariants (`parseWorkshopState` garbage → default; inconsistent combos repaired); `auditReach` (from `src/v4/core/reachAudit.ts`) clean for each stage's solids with `HUD_BANDS`; every interactable reachable from spawn with `canReachItem` in each stage.

### W2 — Xuất sprite runtime

`scripts/prepare-v4-workshop.py` (Pillow): đọc art đợt 1, cắt ô bảng (mẹ, lái đò 2×2; đồ vật 3×3) theo alpha bbox như `scripts/mockup-v4-workshop.py`, scale theo tỉ lệ ở script mockup, ghi PNG vào `assets/levels/00-workshop/sprites/` + `asset-map.json` (tên file → nguồn, kích thước, anchor chân). Nền: `01-background.png` → 1280×720 vào `assets/levels/00-workshop/sprites/workshop-bg.png`. Tranh: `illustrations/01..05` → 1280×720 vào `assets/levels/00-workshop/illustrations/`. Không sửa gì trong `assets/prologue/story-v4-art-v1/`.

### W3 — Runtime và host

- Host (`V4Scene` / `LevelHost` / `V4LevelRuntime`) thêm: `lighting(): 'lantern' | 'none'` (none: không lớp tối); `lanternAvailable(): boolean` (false: F/Pulse bị bỏ qua, Nhinh dùng sprite `_nolamp`); `choose(options: string[], onPick: (index | null) => void, placement?: ChoicePlacement)` — hộp chọn nhỏ dùng phong cách DialogueSystem, ↑/↓ chọn, E/Space xác nhận, ESC hủy; `placement` {x, y, width?} đặt góc trên trái (mặc định góc trên phải), màn xưởng đặt hộp ngay trên khay phụ tùng; `exit(): { illustrations: string[]; nextLevelId: string | null } | null` khi `isExitReached`.
- `src/v4/scene/IllustrationScene.ts`: hiện lần lượt các ảnh (key texture), E/Space/Enter để tiếp, rồi `scene.start` đích được truyền vào. Nạp ảnh bằng `?url` import + `this.load.image`.
- `WorkshopLevel.ts` implements `V4LevelRuntime<WorkshopState>`: nạp sprite W2, vẽ nền, đồ vật, NPC, đèn khách theo trạng thái (mở/tắt → sáng), lớp đèn bến chớp, bác lái đò đi tới `(314,330)` rồi ẩn (90 px/s), áp dụng `WorkshopEffect` (dialogue, toast, choose, journal) qua host.
- Registry: thứ tự chiến dịch `['prologue-workshop']`; phòng thử chỉ mở bằng `?v4level=test-room`. Hành trình mới → `IllustrationScene` [`01`] → `V4Scene` mới. Lối ra xưởng → `IllustrationScene` [`02`..`05`] → `V4Scene` placeholder màn 01 (dùng lại màn hình “bản V4 đang dựng”, chữ “Màn 01 — đang dựng”).
- Kiểm: `npx tsc --noEmit`, `npm test`, các `scripts/check-*.mjs`; lead chơi thử trong trình duyệt.
