# Nhinh — bộ frame 8 hướng

Bộ ảnh mới được tạo từ thiết kế nhân vật hiện có của The Last Lantern bằng công cụ **image_gen tích hợp trong Codex**. File dùng tiền tố `nhinh` theo yêu cầu; tài liệu gốc của dự án gọi nhân vật là Linh.

## Nội dung

**128 frame PNG**, mỗi frame **36×42 px, RGBA, nền trong suốt**. Không ghi đè tài nguyên hiện có của game.

| Trạng thái | Frame mỗi hướng | Tên file |
|---|---:|---|
| Đứng yên | 1 | `nhinh_{direction}_idle_0.png` |
| Đi bộ | 3 | `nhinh_{direction}_walk_{0,1,2}.png` |
| Chạy | 3 | `nhinh_{direction}_run_{0,1,2}.png` |
| Bật đèn | 3 | `nhinh_{direction}_lantern_on_{0,1,2}.png` |
| Tắt đèn | 3 | `nhinh_{direction}_lantern_off_{0,1,2}.png` |
| Pulse | 3 | `nhinh_{direction}_pulse_{0,1,2}.png` |

`direction` gồm: `down`, `downleft`, `left`, `upleft`, `up`, `upright`, `right`, `downright`.

Đi bộ và chạy là các pose để lặp. Các thao tác bật/tắt/pulse đi từ frame 0 đến 2; frame cuối của thao tác bật là đèn sáng, frame cuối thao tác tắt là đèn tắt. Idle/walk/run sử dụng trạng thái đèn chưa phát sáng. Bộ này chưa có biến thể lit/unlit riêng cho mọi hoạt động.

## Cách đối chiếu

- `nhinh_contact_sheet.png`: 8 hàng theo thứ tự hướng ở trên; 16 cột theo thứ tự trạng thái trong bảng. Phóng lớn 3 lần bằng nearest-neighbor trên nền tối `#132e2b`.
- `frames.json`: ánh xạ từng file, trạng thái, số frame, ô cắt ở sheet gốc, hệ số thu nhỏ và SHA-256.
- `source_sheets/`: 8 sheet PNG gốc từ image_gen, giữ nguyên để có thể chỉnh sửa lại.
- `generation-prompts.json`: toàn bộ prompt của 8 lần tạo, kèm đường dẫn output gốc được tool trả về.
- `prepare_frames.py`: công đoạn cắt/thu nhỏ và kiểm tra file bằng Pillow; script không gọi API tạo ảnh.
- `validation.json`: kết quả kiểm tra kỹ thuật gần nhất.

## Phương pháp tạo

Tham chiếu: `Art_References/01_Character_Style_Guide.png`, `Art_References/The_Last_Lantern_Spritesheet_Pack/01_player_character_spritesheet.png` và `src/assets/player_down_unlit_0.png`. Prompt yêu cầu giữ áo choàng/mũ kem, tóc nâu, khăn đỏ, giày nâu, đèn vàng, phong cách pixel art và nền trong suốt.

Mỗi hướng được tạo thành một sheet 4×4 gồm 16 pose. Thứ tự ô từ trái qua phải, từ trên xuống là idle; walk 0–2; run 0–2; lantern_on 0–2; lantern_off 0–2; pulse 0–2. Các sheet sau tham chiếu thêm sheet down để giữ thiết kế gần nhau.

Công đoạn xử lý cắt lưới 4×4, lấy vùng nhân vật, bỏ các mảnh sáng rời bị tràn từ ô khác ở trạng thái thường, giữ alpha gốc và thu nhỏ bằng nearest-neighbor. Toàn bộ frame dùng cùng hệ số tỷ lệ, đặt giữa và căn đáy nội dung tại y=40 trên canvas 36×42. Pivot gợi ý khi nhập game là `(0.5, 1)`. Với pulse, đáy nội dung có thể gồm hạt sáng nên điểm chạm chân vẫn cần rà soát.

## Kiểm tra và giới hạn

**PASS — kiểm tra file:** đủ 128 tên theo tổ hợp 8 hướng × 16 pose; mọi frame mở được, 36×42, RGBA, có pixel trong suốt và có nội dung. Alpha gốc được giữ nguyên, một số frame có alpha cực đại 253/254 thay vì 255.

**Đã xem trực quan contact sheet:** 8 hướng chính đọc được, bộ trang phục và bảng màu bám tham chiếu; đã loại bỏ các mảnh glow rời ở đáy những ô bị ảnh hưởng khi cắt.

**Chất lượng hiện tại là prototype, cần chỉnh pixel trước production.** AI chưa khóa chính xác hình thể và tay cầm đèn qua mọi pose. Một số frame run/pulse nghiêng góc khác hướng dự kiến (đặc biệt run hướng down nghiêng sang phải); nhịp bước và điểm chạm chân có thể giật khi lặp. Pulse dùng hiệu ứng trong cùng canvas nên một số tia sáng bị giới hạn bởi ô cắt. Các chi tiết ở 36×42 bị giản lược so với sheet gốc. Chưa chạy xem animation trong engine và chưa tích hợp vào manifest hoặc code game.

Lệnh xử lý và kiểm tra đã chạy: `python assets/character/prepare_frames.py`.
