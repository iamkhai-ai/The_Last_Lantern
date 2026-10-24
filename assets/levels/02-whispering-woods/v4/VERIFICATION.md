# Màn 02 — kiểm chứng bộ art

Ngày: **2026-10-25**. Phạm vi: bộ P0 + P1 + P2 trong thư mục này, và phần nối vào `WhisperingWoodsLevel.ts`.

## Việc đã chạy

| Việc | Lệnh | Kết quả |
| --- | --- | --- |
| Cắt sprite | `python prepare-assets.py` | 29 sprite ghi vào `sprites/`, `asset-checks.json` cập nhật |
| Kiểm kích thước, alpha, neo | `python check-assets.py` | **PASS 29/29** |
| Type-check | `node node_modules/typescript/bin/tsc --noEmit` | sạch |
| Unit test | `node node_modules/vitest/vitest.mjs run` | **265/265 pass**, 21 tệp |
| Build production | `vite build --outDir %TEMP%\v4-build-check-l02` | 770 module, không lỗi |
| Chạy trong trình duyệt | Chrome headless + DevTools Protocol | màn nạp, vẽ và chạy đúng — chi tiết bên dưới |

`check-assets.py` trả mã lỗi khác 0 nếu sai một trong: kích thước canvas, không có pixel đục, alpha không nhị phân,
chân bia không chạm đáy canvas, cánh cổng không chạm ngưỡng, `gate-half` không đúng nửa.

`whisperingWoodsArt.test.ts` chặn hai lỗi hay gặp: đếm đủ 29 texture trong build, và mỗi key runtime phải có URL.
Nếu một ảnh không được Vite glob nhận, test đỏ ngay.

## Bằng chứng đo được

| Nhóm | Canvas | Vùng mực |
| --- | --- | --- |
| Bia | 32×32 | 28×25 … 28×26, chân ở y = 32 |
| Vành | 32×32 | 25×26, đặt tại (3, 6) |
| Tay quay | 16×16 | 14×16 |
| Cổng đóng / nửa / mở | 8×40 | 8×34 / 8×20 / 8×4 |
| Lẫy | 8×8 | 8×6 |
| Miệng nhận | 12×12 | 12×12 |
| Nền | 608×232 | kín khung |
| Trục | 80×12 | 80×12 (kéo ngang cho đủ nhịp) |
| Dấu khớp | 32×32 | 32×32 |
| Hốc / chuông | 64×32, 16×20 | 44×32, 16×18 |
| Đom đóm | 8×8 | 4×7, 8×4, 6×4 |
| Quầng sáng | 16×16 | 16×16 |

## Đã xem bằng mắt

- `previews/stele-ring-3-positions.png`: vành ở ba nấc, mấu chỉ đúng Bắc / Đông Nam / Tây Nam, glyph vẫn đọc được.
- `previews/grove-640x360-2x.png`: nền, bốn bia, ba tay quay, bốn miệng nhận, hốc ngủ, chuông cỏ, cổng — đúng rect.
- `previews/grove-pulse-640x360-2x.png`: trục chạy sau chân bia, dấu khớp nằm dưới mỗi tay quay.
- `previews/crank-marks-cut.png`: phân biệt được cặp Trăng–Lá, Lá–Sao, Sao–Nước ở 32 px.

## Chạy thật trong trình duyệt (2026-10-25)

Chrome headless 155, cửa sổ 1280×800, điều khiển qua DevTools Protocol; dev server Vite ở `127.0.0.1:5183`.
Màn được nạp bằng save `levelId: 'whispering-woods'`, rồi bấm E để đóng thoại mở màn, đi bộ, bấm Space (Pulse),
bấm F, và đặt trạng thái đã giải để mở cổng.

| Việc | Kết quả |
| --- | --- |
| Màn nạp và vẽ | Có: nền, bốn bia + vành, bốn miệng nhận, ba tay quay, hốc ngủ, chuông cỏ, cổng |
| Nền và đường bộ | Đọc được khi tắt F: đường đất, rêu, dương xỉ, chân cây, hốc |
| Pulse | Trục hiện sau chân bia; ba dấu khớp hiện dưới tay quay; toast `Đã ghi vào sổ tay.` |
| Đom đóm bay | Khung đổi sau 160 ms: `[1,1,2]` → `[2,0,0]` |
| Khung chuyển cổng | `wwd-gate-closed → wwd-gate-half` (3 mẫu) `→ wwd-gate-open`, lấy mẫu mỗi 45 ms |
| Hiệu ứng mở cổng | Quầng sáng xuất hiện đúng tại cổng ở khung hình chuyển |
| Kết màn | Vào trạng thái giải thì thoại kết (`Hồi đó họ cũng đến kiểm tra đèn.`) chạy |
| Trạng thái sprite | `axle-x.alpha = 1`, `mark-x.alpha = 1` sau Pulse; `floor` và `hollow` nạp đúng texture |

Ảnh chụp: `previews/runtime-pulse-640x360.png`, `previews/runtime-lantern-off-640x360.png`,
`previews/runtime-gate-open-640x360.png`.

## Chưa kiểm

| Việc | Trạng thái |
| --- | --- |
| Chơi trọn một lượt bằng tay (quay tay quay, gài cổng) | **NOT_RUN** — trạng thái đã giải được đặt qua console, không quay đủ 5 nấc |
| Độ tương phản của dấu khớp và trục ở các góc màn | chưa đo |
| Chuyển động đom đóm có bị giật khi khung hình dao động | chưa đo |
| Chơi thử và duyệt của người dùng | chưa |

Ảnh preview không được dùng thay cho bằng chứng tích hợp.

## Nguồn sinh ảnh

`built-in image_gen`, model `gpt-image-2.5-sunburst`, quality `high`. Prompt lưu nguyên văn trong
`generation-prompts.json`, kèm ghi chú hai lần sinh lại (bia, tay quay).
