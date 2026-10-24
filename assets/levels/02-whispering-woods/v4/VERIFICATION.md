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

## Chưa kiểm

| Việc | Trạng thái |
| --- | --- |
| Chạy game trong trình duyệt | **NOT_RUN** — phiên này không có trình điều khiển trình duyệt |
| Độ sáng nền so với lớp tối 0.82 khi vào màn thật | NOT_RUN |
| Chuyển động đom đóm và hiệu ứng có bị giật không | NOT_RUN |
| Vòng sáng 40 px có thật sự làm miệng nhận khuất | NOT_RUN |
| Chơi thử và duyệt của người dùng | chưa |

Ảnh preview không được dùng thay cho bằng chứng tích hợp.

## Nguồn sinh ảnh

`built-in image_gen`, model `gpt-image-2.5-sunburst`, quality `high`. Prompt lưu nguyên văn trong
`generation-prompts.json`, kèm ghi chú hai lần sinh lại (bia, tay quay).
