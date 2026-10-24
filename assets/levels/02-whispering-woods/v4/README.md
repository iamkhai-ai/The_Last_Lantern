# Màn 02 — art V4

## Phạm vi

Bộ P0 của [danh sách art](../../../../docs/implementation/v4/02-whispering-woods-art.md), dựng theo bố cục runtime
`src/v4/levels/whispering-woods/whisperingWoodsLayout.ts`. Mọi kích thước và toạ độ lấy từ layout, không tự đặt.

Màn 02 hiện vẽ bằng `Phaser.GameObjects.Graphics`. Thư mục này cung cấp art để thay các lệnh vẽ đó; nó **không**
sửa runtime, collider, cơ chế hay thoại. Bộ pilot cũ trong `assets/levels/02-whispering-woods/sprites/` không bị ghi đè.

## Nội dung

| Nhóm | Sprite | Canvas | Neo |
| --- | --- | --- | --- |
| Bia | `stele-moon`, `stele-leaf`, `stele-star`, `stele-water` | 32×32 | đáy giữa |
| Vành xoay | `ring` (dùng chung) | 32×32 | đặt tại (3, 6) |
| Tay quay | `crank-x`, `crank-y`, `crank-z` | 16×16 | đáy giữa |
| Cổng | `gate-closed`, `gate-open` | 8×40 | đáy giữa / **đỉnh giữa** |
| Lẫy | `latch` | 8×8 | đáy giữa |
| Miệng nhận | `mouth-moon`, `mouth-leaf`, `mouth-star`, `mouth-water` | 12×12 | đáy giữa |

`asset-map.json` ghi nguồn, ô cắt, canvas, neo và rect runtime của từng sprite. `asset-checks.json` ghi kết quả đo
sau khi cắt.

## Cách dựng lại

```
python prepare-assets.py    # cắt sources/ thành sprites/ + ghi asset-checks.json
python check-assets.py      # kiểm kích thước, alpha, neo; dựng previews/
```

`prepare-assets.py` cắt sheet theo rãnh trong suốt dọc, ngưỡng alpha để bỏ quầng mờ quanh vật, hạ mẫu LANCZOS,
ép alpha nhị phân và lượng tử hoá còn tối đa 128 màu. `check-assets.py` trả mã lỗi khác 0 khi một sprite sai
kích thước, sai neo, mất alpha hoặc alpha không nhị phân.

## Ảnh xem

| Tệp | Nội dung |
| --- | --- |
| `previews/contact-sheet.png` | Toàn bộ 15 sprite, phóng 6× |
| `previews/stele-ring-3-positions.png` | Một bia với vành ở ba nấc 0 / 1 / 2 |
| `previews/grove-640x360-2x.png` | Cả khu rừng đặt đúng rect runtime, ảnh 2× |
| `previews/steles-cut.png`, `cranks-cut.png`, `gate-latch-cut.png`, `mouths-cut.png` | Từng sheet sau khi cắt |

Ảnh preview không phải bằng chứng đã tích hợp vào game.

## Giới hạn

- Chưa có runtime nào nạp các sprite này; chưa chơi thử trong trình duyệt.
- Chưa có P1 (trục nối, dấu khớp Pulse, hốc ngủ, chuông cỏ) và P2.
- `latch` chưa có rect trong layout, nên chưa xác nhận được chỗ đặt.
- Bia ở cỡ thật 28×24: glyph còn đọc được, nhưng đây là art painterly hạ mẫu, không phải pixel art vẽ tay ở 1×.
