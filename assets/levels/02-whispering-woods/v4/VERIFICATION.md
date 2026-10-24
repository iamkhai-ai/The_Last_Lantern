# Màn 02 — kiểm chứng bộ art P0

Ngày: **2026-10-25**. Phạm vi: bộ P0 trong thư mục này. Không phải kiểm chứng runtime, ánh sáng hay lối chơi.

## Việc đã chạy

| Việc | Lệnh | Kết quả |
| --- | --- | --- |
| Cắt sprite | `python prepare-assets.py` | 15 sprite ghi vào `sprites/`, `asset-checks.json` cập nhật |
| Kiểm kích thước, alpha, neo | `python check-assets.py` | **PASS** 15/15 |
| Dựng preview | (trong `check-assets.py`) | `previews/contact-sheet.png`, `stele-ring-3-positions.png`, `grove-640x360-2x.png` |

`check-assets.py` trả mã lỗi khác 0 nếu sai một trong: kích thước canvas, không có pixel đục, alpha không nhị phân,
chân bia không chạm đáy canvas, cánh cổng không chạm ngưỡng.

## Bằng chứng đo được

| Sprite | Canvas | Vùng mực | Ghi chú |
| --- | --- | --- | --- |
| `stele-moon` / `leaf` / `star` / `water` | 32×32 | 28×25, 28×26, 28×26, 28×26 | chân ở y = 32 |
| `ring` | 32×32 | 25×26 | đặt tại (3, 6) |
| `crank-x` / `y` / `z` | 16×16 | 14×16 | hub đóng dấu 1× |
| `gate-closed` | 8×40 | 8×34 | chạm ngưỡng y = 40 |
| `gate-open` | 8×40 | 8×4 | neo đỉnh, phần dưới trong suốt |
| `latch` | 8×8 | 8×6 | |
| `mouth-*` | 12×12 | 12×12 | |

Số màu mỗi sprite sau lượng tử hoá: 33–128.

## Đã xem bằng mắt

- `previews/stele-ring-3-positions.png`: vành ở ba nấc 0/1/2, mấu chỉ đúng Bắc, Đông Nam, Tây Nam; glyph còn đọc
  được trong lòng vành.
- `previews/grove-640x360-2x.png`: bốn bia, ba tay quay, bốn miệng nhận và cổng đặt đúng rect layout; cỡ tương
  quan giữa các vật đúng như layout mô tả.
- `previews/cranks-cut.png`: X, Y, Z phân biệt được ở 16×16.

## Chưa kiểm

| Việc | Trạng thái |
| --- | --- |
| Runtime nạp sprite (màn 02 vẫn vẽ bằng Graphics) | NOT_RUN |
| Chạy game, kiểm collider và tầm tương tác với art mới | NOT_RUN |
| Tương tác với vòng sáng 40 px: miệng nhận có thật sự khuất khi đèn chiếu | NOT_RUN |
| Chơi thử, đánh giá độ đọc của glyph khi di chuyển | NOT_RUN |
| Duyệt của người dùng | chưa |

Ảnh preview không được dùng thay cho bằng chứng tích hợp.

## Nguồn sinh ảnh

`built-in image_gen`, model `gpt-image-2.5-sunburst`, quality `high`. Prompt lưu nguyên văn trong
`generation-prompts.json`. Bia và tay quay được sinh lại một lần; lý do ghi ở mục `revisions` của tệp đó.
