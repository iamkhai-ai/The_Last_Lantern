# Màn 02 — art V4

## Phạm vi

Toàn bộ P0, P1 và P2 của [danh sách art](../../../../docs/implementation/v4/02-whispering-woods-art.md), dựng theo bố cục
runtime `src/v4/levels/whispering-woods/whisperingWoodsLayout.ts`. Mọi kích thước và toạ độ lấy từ layout, trừ hai
prop P1 (hốc ngủ, chuông cỏ) không có rect nên đặt thủ công ngoài đường đi.

Bộ art đã được nối vào `WhisperingWoodsLevel.ts`: nền thay lớp tô phẳng, trục và dấu khớp hiện theo sổ tay,
đom đóm bay và hiệu ứng chạy bằng tween. Bộ pilot cũ trong `assets/levels/02-whispering-woods/sprites/` không bị ghi đè.

## Nội dung

| Nhóm | Sprite | Canvas | Neo |
| --- | --- | --- | --- |
| Nền | `grove-floor` | 608×232 | góc trên trái, tại `world` |
| Bia | `stele-moon`, `stele-leaf`, `stele-star`, `stele-water` | 32×32 | đáy giữa |
| Vành xoay | `ring` (dùng chung) | 32×32 | đặt tại (3, 6) |
| Tay quay | `crank-x`, `crank-y`, `crank-z` | 16×16 | đáy giữa |
| Cổng | `gate-closed`, `gate-half`, `gate-open`, `latch` | 8×40, 8×40, 8×40, 8×8 | đáy giữa / đỉnh giữa |
| Miệng nhận | `mouth-moon`, `mouth-leaf`, `mouth-star`, `mouth-water` | 12×12 | đáy giữa |
| Trục | `axle-x`, `axle-y`, `axle-z` | 80×12 | giữa |
| Dấu khớp | `mark-x`, `mark-y`, `mark-z` | 32×32 | giữa |
| Prop P1 | `hollow`, `bell` | 64×32, 16×20 | đáy giữa / giữa |
| Đom đóm bay | `firefly-0`, `firefly-1`, `firefly-2` | 8×8 | giữa |
| Hiệu ứng | `glow` | 16×16 | giữa |

`asset-map.json` ghi nguồn, ô cắt, canvas, neo và rect runtime của từng sprite. `asset-checks.json` ghi kết quả đo
sau khi cắt.

## Cách dựng lại

```
python prepare-assets.py    # cắt sources/ thành sprites/ + ghi asset-checks.json
python check-assets.py      # kiểm kích thước, alpha, neo; dựng previews/
```

`prepare-assets.py` cắt sheet theo rãnh trong suốt dọc, ngưỡng alpha để bỏ quầng mờ, hạ mẫu LANCZOS, ép alpha nhị
phân và lượng tử hoá còn tối đa 128 màu. Ba đầu ra được **dẫn xuất** chứ không cắt: `grove-floor` (hạ sáng 0.55),
`gate-half` (cánh đóng dịch lên 20 px) và `glow` (gradient tròn tự vẽ).

`check-assets.py` trả mã lỗi khác 0 khi sai kích thước, sai neo, mất alpha hoặc alpha không nhị phân.

## Ảnh xem

| Tệp | Nội dung |
| --- | --- |
| `previews/contact-sheet.png` | Toàn bộ 29 sprite |
| `previews/stele-ring-3-positions.png` | Một bia với vành ở ba nấc 0 / 1 / 2 |
| `previews/grove-640x360-2x.png` | Cả khu rừng đặt đúng rect runtime, ảnh 2× |
| `previews/grove-pulse-640x360-2x.png` | Như trên, thêm lớp Pulse: trục và dấu khớp |
| `previews/*-cut.png` | Từng sheet sau khi cắt |

Ảnh preview không phải bằng chứng đã chạy trong game.

## Runtime dùng thế nào

- Nền ở depth 0, tường vẫn vẽ bằng Graphics ở depth 1.
- Trục ở depth 2.5 (sau bia), bia 3, vành 3.1, cổng 3, lẫy 3.2, dấu khớp 3.3.
- Miệng nhận 68.5, đom đóm 68.6, hiệu ứng 68.7 — trên lớp tối 68 nên đọc được như nguồn sáng.
- Trục và dấu khớp đổi alpha theo `host.hasJournal(...)`; không còn đường vẽ tạm.
- Cổng: `gate-half` hiện 180 ms khi mở, rồi sang `gate-open`.
- Đom đóm: đổi khung mỗi 130 ms, trôi trên ellipse nhỏ quanh hốc.

## Giới hạn

- Tôi chưa chơi thử trong trình duyệt (phiên này không có trình điều khiển trình duyệt); đã kiểm bằng `tsc`,
  `vitest` (265 test) và build production.
- `latch` vẫn chưa có rect trong layout; đang đặt cạnh cổng theo toạ độ suy ra.
- Bia ở cỡ thật 28×24, glyph đọc được nhưng đây là art painterly hạ mẫu, không phải pixel art vẽ tay ở 1×.
