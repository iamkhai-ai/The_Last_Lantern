# Màn 02 — Rừng đom đóm: danh sách art (V4)

Trạng thái: **danh sách đề xuất, chưa duyệt**. Nguồn: `docs/scenario-v4/02-whispering-woods.md`, runtime `src/v4/levels/whispering-woods/` (layout `whisperingWoodsLayout.ts`). Không chứa ảnh hay tọa độ mới; mọi kích thước dưới đây lấy từ runtime.

## 0. Phạm vi và cách dùng

- Thế giới 640×360. Khu rừng là `{16, 96, 608, 232}`; HUD và điều khiển chiếm đầu và cuối màn, giữ trống.
- Art không được có chữ trong ảnh. Chữ nằm ở HUD và hội thoại.
- Thư mục art 02 hiện có (`assets/levels/02-whispering-woods/`) là pilot kịch bản cũ: rune xoắn/tam giác và cổng vòm. Không dùng trực tiếp cho V4; chỉ tái dùng cây, bụi, Nhinh và Lumo.

## 1. Kích thước

| Thành phần | Kích thước trong runtime | Ghi chú |
| --- | --- | --- |
| Bia (Trăng, Lá, Sao, Nước) | khối 28×28 | Canvas 32×32, neo đáy giữa |
| Vành xoay | cùng bia | Một lớp riêng, xoay theo code ở 3 hướng |
| Tay quay X, Y, Z | 16×16 | Có ký hiệu hình khớp trục |
| Cổng đóng | 8×40 | Solid và chắn ánh khi đóng |
| Cổng mở + lẫy | 8×40 (cánh rút), lẫy khoảng 8×8 | Thanh truyền nhìn thấy được |
| Miệng nhận | 12×12 | Bốn cái, đều là dấu tối |
| Dấu Pulse (trục, khớp) | theo nét | Chỉ hiện khi Pulse |

## 2. P0 — cần để chơi và đọc câu đố

| Mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Đế bia Trăng, Lá, Sao | một ảnh mỗi bia | Đá trống, không dấu; tái dùng ký hiệu cũ chỉ khi bạn duyệt |
| Đế bia Nước | mới | Kịch bản: thêm hình giọt |
| Vành xoay ba hướng | một lớp chung, xoay bằng code | Ba vị trí notch: N, Đông Nam, Tây Nam |
| Tay quay X, Y, Z | ba ảnh | Ký hiệu hình khác nhau, không chỉ đổi màu |
| Cổng đóng | một ảnh | Cánh 8×40, không vẽ cổng vòm cũ |
| Cổng mở và lẫy | một ảnh cổng mở + một lẫy | Lẫy hiện khi cổng mở hết |
| Miệng nhận Trăng, Lá, Sao, Nước | bốn ảnh tối | Đom đóm đậu theo hướng đích; chỉ đọc khi đèn không chiếu vào |

## 3. P1 — cần cho Pulse và khám phá

- Ba trục nối: X (Trăng–Lá), Y (Lá–Sao), Z (Sao–Nước). Vẽ dưới rêu, có thể đọc khi Pulse.
- Ba dấu khớp trên tay quay, hiện khi Pulse.
- Nền rừng và đường bộ luôn đi được, tới được cả ba tay quay.
- Hốc ngủ, và vài đom đóm trưởng thành đậu sẵn. Không vẽ đom đóm non hay dấu hiệu khu vườn đã hồi phục.
- Chuông cỏ của Lumo treo trên bụi.
- Tái dùng: cây, bụi, Nhinh (khung đi và cầm đèn bật/tắt), Lumo.

## 4. P2 — làm sau

- Đom đóm trưởng thành bay quanh, vòng lặp đơn giản.
- Hiệu ứng nhẹ khi một vành khớp và khi cổng mở.
- Khung chuyển khi cổng mở hết.

## 5. Cần người duyệt

1. Ba ký hiệu bia cũ (Trăng, Lá, Sao) có giữ không, hay vẽ lại theo bộ mới.
2. Bảng màu và độ sáng của miệng nhận, để chỉ đọc được khi đèn không chiếu.
3. Cách hiện đom đóm trưởng thành trong hốc ngủ.
4. Dạng cổng mở: cánh rút, không dùng cổng vòm.

## 6. Tái dùng và không tái dùng

| Nguồn | Quyết định |
| --- | --- |
| `assets/levels/02-whispering-woods/sprites/runestone_*` | Không dùng: kịch bản cũ, hình rune khác với bia V4 |
| `assets/levels/02-whispering-woods/sprites/woods_arch_open_passage.png` | Không dùng: cổng vòm, V4 dùng cánh 8×40 |
| `assets/levels/02-whispering-woods/sprites/memory_vignette.png`, `poem_fragment.png` | Không thuộc màn này theo V4 |
| Cây, bụi, Nhinh, Lumo trong `src/assets/` và `assets/character/` | Tái dùng |

## 7. P0 đã dựng (2026-10-25)

Bộ P0 nằm trong `assets/levels/02-whispering-woods/v4/`: 15 sprite, `asset-map.json`, `generation-prompts.json`,
`asset-checks.json`, hai script và ảnh xem. `check-assets.py` PASS 15/15 về kích thước, alpha và neo.

Bốn điểm cần duyệt đã chốt:

1. **Glyph**: giữ ba ký hiệu cũ (Trăng, Lá, Sao), vẽ lại trên đế vuông V4; Nước vẽ mới cùng độ dày nét. Ảnh
   `runestone_*` cũ không dùng.
2. **Miệng nhận**: lòng gần đen, không quầng sáng; thông tin duy nhất là 2–3 chấm đom đóm 1 px ở Bắc hoặc Tây Nam.
3. **Đom đóm trong hốc ngủ**: chưa dựng, thuộc P1.
4. **Cổng mở**: cánh trượt 8×40; `gate-open` neo đỉnh, phần dưới trong suốt hoàn toàn.

Một sai khác có chủ đích: hub tay quay không nằm trong ảnh sinh mà được đóng dấu 1× bằng code, vì ở 16 px ký hiệu
vẽ rồi hạ mẫu sẽ nhoè. Cùng cách màn 01 xử lý ký hiệu hình học.

Chưa làm: P1, P2, nạp sprite vào runtime (màn 02 vẫn vẽ bằng Graphics), kiểm ánh sáng thật, chơi thử.

