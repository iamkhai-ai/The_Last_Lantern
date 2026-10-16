# Nhinh — bộ frame 8 hướng

Bộ ảnh mới được tạo từ thiết kế nhân vật hiện có của The Last Lantern bằng công cụ **image_gen tích hợp trong Codex**. File dùng tiền tố `nhinh` theo yêu cầu; tài liệu gốc của dự án gọi nhân vật là Linh.

## Nội dung

**240 frame PNG** (128 frame lõi + 112 biến thể trạng thái đèn sáng / không cầm đèn), mỗi frame **36×42 px, RGBA, nền trong suốt**. Toàn bộ 72 file `src/assets/player_*.png` cũ đã được gỡ bỏ.

| Trạng thái | Frame mỗi hướng | Tên file |
|---|---:|---|
| Đứng yên (cầm đèn tắt) | 1 | `nhinh_{direction}_idle_0.png` |
| Đi bộ (cầm đèn tắt) | 3 | `nhinh_{direction}_walk_{0,1,2}.png` |
| Chạy (cầm đèn tắt) | 3 | `nhinh_{direction}_run_{0,1,2}.png` |
| Bật đèn | 3 | `nhinh_{direction}_lantern_on_{0,1,2}.png` |
| Tắt đèn | 3 | `nhinh_{direction}_lantern_off_{0,1,2}.png` |
| Pulse | 3 | `nhinh_{direction}_pulse_{0,1,2}.png` |
| Đứng yên (đèn sáng) | 1 | `nhinh_{direction}_idle_lit_0.png` |
| Đi bộ (đèn sáng) | 3 | `nhinh_{direction}_walk_lit_{0,1,2}.png` |
| Chạy (đèn sáng) | 3 | `nhinh_{direction}_run_lit_{0,1,2}.png` |
| Đứng yên (không cầm đèn) | 1 | `nhinh_{direction}_idle_nolamp_0.png` |
| Đi bộ (không cầm đèn) | 3 | `nhinh_{direction}_walk_nolamp_{0,1,2}.png` |
| Chạy (không cầm đèn) | 3 | `nhinh_{direction}_run_nolamp_{0,1,2}.png` |

`direction` gồm: `down`, `downleft`, `left`, `upleft`, `up`, `upright`, `right`, `downright`.

Đi bộ và chạy là các pose để lặp. Các thao tác bật/tắt/pulse đi từ frame 0 đến 2; frame cuối của thao tác bật là đèn sáng, frame cuối thao tác tắt là đèn tắt. Các pose không hậu tố dùng khi cầm đèn tắt; hậu tố `_lit` dùng khi đèn đang bật sáng trong tay; hậu tố `_nolamp` dùng khi chưa nhặt hoặc đã đặt đèn xuống bệ. Runtime (`src/actors/Player.ts`) dùng trọn bộ 240 frame Nhinh cho cả 8 hướng.

## Cách đối chiếu

- `nhinh_contact_sheet.png`: 8 hàng × 16 cột cho 128 frame lõi. Phóng lớn 3 lần bằng nearest-neighbor trên nền tối `#132e2b`.
- `nhinh_state_variants_contact_sheet.png`: 8 hàng × 14 cột cho 112 biến thể trạng thái (`idle_lit_0`, `walk_lit_0..2`, `run_lit_0..2`, `idle_nolamp_0`, `walk_nolamp_0..2`, `run_nolamp_0..2`).
- `nhinh_all_poses_contact_sheet.png`: 8 hàng × 30 cột hợp nhất toàn bộ 240 frame (16 pose lõi + 14 biến thể mỗi hướng).
- `frames.json`: ánh xạ toàn bộ 240 file (128 core + 112 state variants), trạng thái, số frame, ô cắt ở sheet gốc, bounding box và SHA-256.
- `source_sheets/`: 8 sheet PNG gốc 4×4 cho 128 frame lõi, cùng `source_sheets/state_variants/` (`worker_down/`, `worker_udr/`, `worker_lr/`) chứa 16 sheet PNG gốc 4×2 và file provenance/prompt của 112 biến thể.
- `generation-prompts.json`: toàn bộ prompt của 8 lần tạo bộ lõi, kèm đường dẫn output gốc được tool trả về.
- `prepare_frames.py`: công đoạn cắt/thu nhỏ cho 128 frame lõi. Nếu phát hiện catalog hoặc file biến thể, script từ chối ghi đè trừ khi đặt chính xác `ALLOW_CATALOG_OVERWRITE=1`; khi bật, nó chỉ xuất bản kết quả nếu đủ 112 biến thể đúng tên, PNG và SHA-256 cùng tổng 240 frame đều qua kiểm tra. Frame lõi và manifest được dựng, kiểm tra trong thư mục tạm trước khi thay file hiện hành. Contact sheet cần được xem lại sau khi tái tạo; kiểm tra kỹ thuật không thay thế đánh giá hình ảnh.
- `validation.json`: kết quả kiểm tra kỹ thuật cho toàn bộ 240 frame.

## Phương pháp tạo

Tham chiếu: `Art_References/01_Character_Style_Guide.png`, `Art_References/The_Last_Lantern_Spritesheet_Pack/01_player_character_spritesheet.png` và các frame mẫu đầu tiên. Prompt yêu cầu giữ áo choàng/mũ kem, tóc nâu, khăn đỏ, giày nâu, đèn vàng, phong cách pixel art và nền trong suốt.

Bộ lõi (128 frame) dùng 8 sheet 4×4 gồm 16 pose/hướng (`idle`; `walk 0–2`; `run 0–2`; `lantern_on 0–2`; `lantern_off 0–2`; `pulse 0–2`). Bộ biến thể trạng thái (112 frame) dùng 16 sheet 4×2 gồm 7 pose/sheet (`idle`, `walk 0–2`, `run 0–2`, ô thứ 8 để trống) cho hai trạng thái `lit` và `nolamp` ở cả 8 hướng.

Công đoạn xử lý cắt theo lưới ô, lấy vùng nhân vật có alpha, thu nhỏ bằng nearest-neighbor, đặt giữa và căn đáy nội dung tại `y=40` trên canvas `36×42`. Pivot gợi ý khi nhập game là `(0.5, 1)`. Với `pulse`, đáy nội dung có thể gồm hạt sáng nên điểm chạm chân vẫn cần rà soát.

## Kiểm tra và giới hạn

**PASS — kiểm tra file:** đủ 240 tên duy nhất (128 lõi + 112 biến thể); mọi frame mở được, `36×42`, `RGBA`, có pixel trong suốt và có nội dung; toàn bộ frame ngoài `pulse` đều có đáy nội dung tại `y=40`; mọi bộ 3 frame `walk`/`run` đều có 3 hash khác nhau (240/240 hash duy nhất); không còn file `src/assets/player_*.png` nào.

**Đã xem trực quan contact sheet:** đã kiểm tra `nhinh_contact_sheet.png`, `nhinh_state_variants_contact_sheet.png` và `nhinh_all_poses_contact_sheet.png`; cả 8 hướng đều đọc rõ trạng thái đèn tắt, đèn sáng (`_lit`) và tay không (`_nolamp`).

**Chất lượng hiện tại là prototype, cần chỉnh pixel trước production.** AI chưa khóa chính xác hình thể và tay cầm đèn qua mọi pose; tỷ lệ nhân vật ở các biến thể `down_lit`, `down_nolamp` (walk/run) và `downleft_lit` hơi nhỏ hơn frame lõi cùng hướng; một số frame run/pulse nghiêng góc khác hướng dự kiến; nhịp bước và điểm chạm chân có thể giật khi lặp. Game nạp 240 frame runtime qua `src/art/CampaignArt.ts` (đã loại trừ các file `*contact_sheet*.png` khỏi bundle runtime); chưa rà animation trực quan trong engine cho đủ 8 hướng × mọi trạng thái.
