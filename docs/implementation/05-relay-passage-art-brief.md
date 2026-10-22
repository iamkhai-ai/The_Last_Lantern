# Level 05 — Relay passage: art brief

Status: **vòng 1 đã giao (commit `92a8374`, hốc x 130–174) nhưng chưa đạt yêu cầu khe 36 px. Quyết định 2026-10-22: giữ va chạm theo vòng 2 (hốc x 118–174, rộng 56 px) và sửa art cho khớp va chạm.** Code (`PATH_ROOMS.relay.walls`), `relay-geometry.json` và `relay-geometry-guide.png` đã đồng bộ với hốc x 118–174; `check-path-for-two.mjs` đã qua. Việc còn lại: art vẽ lại hốc trong ảnh nền (xem §2). Cho tới khi có art vòng 2, ảnh hiện tại lệch va chạm 12 px ở x 118–130 (va chạm cho đi qua phần ốp đồng vẽ ở đó).

## 1. Vấn đề

Buồng chuyển (relay) có một tường ngăn phía bắc, y 180–210, vẽ trong ảnh nền `relay-environment-base.png`. Khung cửa A ở góc tây nam có hai cột (x 78–88 và x 132–142, collision y 230–288, và kéo xuống y 318 trong collision).

Đường từ hốc cửa A lên sảnh chính đi qua mép tường ngăn và đỉnh cột phải. Spec yêu cầu khe tối thiểu **36 px** (`campaign-layout-design.md`). Nhinh cao 6 px ở chân nên đi được, nhưng phải đo theo từng vị trí thân.

Trong v2, lời giải bắt buộc quay lại qua cửa A về sảnh, nên khe này nằm trên đường chơi thật (xem `docs/scenario-v2/05-a-path-for-two.md`, buồng 1 và bẫy 1).

## 2. Kết quả vòng 1 và yêu cầu vòng 2

Đo chiều cao khe theo từng vị trí tâm thân (`span = độ dài đoạn tâm hợp lệ + 6`), với hốc bắt đầu ở các x khác nhau:

| Mép trái hốc | Khe tối thiểu, tâm thân x 126–150 | Đoạn bị hẹp |
| --- | --- | --- |
| x 130 (vòng 1, đã giao) | **20 px** | x 126–136 (khoảng 11 px) |
| x 128 | 20 px | x 126–134 |
| x 124 | 20 px | x 126–130 |
| x 120 | 20 px | chỉ x 126 |
| **x 118** | **40 px** | không có |

Kết luận: mép trái hốc phải ≤ **x 118**. Đã chốt hốc **x 118–174** (rộng 56 px, cao 20 px): mép phải giữ nguyên x 174 của vòng 1, nên art chỉ phải mở rộng hốc sang trái 12 px thay vì dời cả hốc. Khe là 40 px ở mọi vị trí tâm thân x 126–150. Đã kiểm trong mô phỏng: điểm đến, hốc cửa A, mốc A (180,264) và mốc B (360,256) đều với tới được. Nút gọi A phía xa (224,256) đã bỏ ngày 2026-10-22 (một cửa, một trạm), nên không còn ảnh hưởng đến khe.

### Yêu cầu vòng 2

- **Hốc:** x 118–174, y 190–210 (56×20 px). Lintel 10 px phía trên (y 180–190, x 118–174) giữ nguyên là khối đá.
- **Ốp đồng:** trên tường ngăn có sẵn một ốp đồng (khoảng x 106–129 sau vòng 1). Vòng 2 phải thu gọn ốp đồng vào **x ≤ 117**, hoặc dời sang trái.
- **Phần còn lại** của nền giữ nguyên, y hệt vòng 1 ngoài hai vùng trên.

## 3. Yêu cầu kỹ thuật chung

- **File:** `assets/levels/05-a-path-for-two/sprites/relay-environment-base.png`, và nguồn trong `environment-v3/`: `relay-geometry.json`, `relay-geometry-guide.png`.
- **Không vẽ** cổng, vòm, bậc, đèn, mực, ống hay vật thể nào khác. Không vẽ gì đè lên khung cửa A (khung là runtime).
- **Kỹ thuật:** ảnh 640×360, opaque, nearest, bảng màu giới hạn 128 màu, không dither, gốc (0,0), depth 0 (đúng quy tắc `environment-v3/remaining-art-direction.md`).
- **Hiệu ứng cần kiểm bằng mắt:** hốc không được trông như cửa đi thông ra đâu đó. Nếu nó đọc như một lỗ hổng, cần chọn vật liệu hoặc bóng đổ khác. Phần này do art quyết.

### Bản thử bằng pixel (chỉ để kiểm bố cục)

Bản thử vòng 1 nằm ở `scratchpad/relay-environment-base-notch-candidate.png`. Nó dùng x 130–174, nên không đạt yêu cầu vòng 2. Không dùng bản này làm art.

## 4. Thay đổi code đã làm (theo vòng 1)

- `PATH_ROOMS.relay.walls` (`src/data/pathForTwoLayout.ts`): tường ngăn tách thành ba mảnh, `x 24–130`, lintel `x 130–174`, `x 174–448`. Khớp với `relay-geometry.json` do art giao.
- `scripts/check-path-for-two.mjs`: assertion mới kiểm khe ≥36 px tại mọi tâm thân x 126–150. Đang FAIL với hình học vòng 1, đúng như đo ở §2.

Đã đổi (2026-10-22) mảnh tường thành, khớp `relay-geometry.json`:

- `{ x: 24, y: 180, width: 94, height: 30 }` (x 24–118)
- `{ x: 118, y: 180, width: 56, height: 10 }` (lintel, x 118–174)
- `{ x: 174, y: 180, width: 274, height: 30 }` (x 174–448)

## 5. Việc còn lại

1. Giao art vòng 2 (§2) theo quy trình đã dùng cho vòng 1.
2. Pipeline `scripts/check-level05-remaining-environments.py` vẫn ghim master cũ và tái tạo ảnh cũ. Đây là quyết định đã chốt: giữ nguyên exporter. Chạy lại `prepare-level05-remaining-environments.py` sẽ khôi phục ảnh cũ, nên không chạy script đó trước khi pipeline được cập nhật.
3. Walls đã đổi theo §4 và check đã qua. Khi có art vòng 2: chạy lại check, `tsc`, build, và chơi thử trong trình duyệt (đường quay lại qua cửa A và đường v2). Ảnh relay mới thử ở `environment-v4/relay-native.png` đã bị loại (2026-10-22, chất lượng thấp); game tiếp tục dùng `sprites/relay-environment-base.png` cũ cho tới khi có art vòng 2.
4. Cập nhật `05-layout.md`: bỏ ghi chú "khe 20 px", thay bằng số đo mới.
