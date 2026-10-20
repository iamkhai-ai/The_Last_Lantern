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
- `prepare_frames.py`: tái tạo đủ 240 frame, ba contact sheet, catalog và validation từ các sheet đã lưu trong repo. Trên PowerShell, chạy `$env:ALLOW_CATALOG_OVERWRITE='1'; python assets/character/prepare_frames.py` (cần Python và Pillow); cờ này cho phép ghi đè có chủ đích catalog kết hợp. Script không phụ thuộc đường dẫn output image_gen trên máy tạo ảnh.
- `body-scale-anchors.json`: 112 cặp mốc đỉnh mũ–đế giày trong ô nguồn và tên frame lõi cùng hướng/pose để đối chiếu tỷ lệ. Tọa độ là pixel nguồn, mốc dưới không bao gồm pixel tại chính tọa độ đó.
- Pipeline kiểm tra component alpha ≥80 lớn nhất của cả 112 ô biến thể để xác nhận mốc cơ thể, loại vùng pixel rời ngoài component khỏi crop và căn giữa. Có hai ô chứa pixel thừa phía trên/trái: `downleft_run_lit_1` và `downleft_run_lit_2`; đỉnh mũ thật ở `y=51` và `y=53`, không phải `y=0`. `validation.json` ghi đầy đủ bounding box trước/sau loại vùng thừa.
- `validation.json`: kết quả kiểm tra kỹ thuật cho toàn bộ 240 frame.

## Phương pháp tạo

Tham chiếu: `Art_References/01_Character_Style_Guide.png`, `Art_References/The_Last_Lantern_Spritesheet_Pack/01_player_character_spritesheet.png` và các frame mẫu đầu tiên. Prompt yêu cầu giữ áo choàng/mũ kem, tóc nâu, khăn đỏ, giày nâu, đèn vàng, phong cách pixel art và nền trong suốt.

Bộ lõi (128 frame) dùng 8 sheet 4×4 gồm 16 pose/hướng (`idle`; `walk 0–2`; `run 0–2`; `lantern_on 0–2`; `lantern_off 0–2`; `pulse 0–2`). Bộ biến thể trạng thái (112 frame) dùng 16 sheet 4×2 gồm 7 pose/sheet (`idle`, `walk 0–2`, `run 0–2`, ô thứ 8 để trống) cho hai trạng thái `lit` và `nolamp` ở cả 8 hướng.

Công đoạn xử lý cắt theo lưới ô, lấy vùng nhân vật có alpha, thu nhỏ bằng nearest-neighbor, đặt giữa và căn đáy nội dung tại `y=40` trên canvas `36×42`. Pivot gợi ý khi nhập game là `(0.5, 1)`. Với `pulse`, đáy nội dung có thể gồm hạt sáng nên điểm chạm chân vẫn cần rà soát.

Trong lần chuẩn hóa tỷ lệ trước đây, 128 frame lõi giữ nguyên tỷ lệ nguồn chung và dữ liệu PNG. 112 biến thể chuyển động được tái tạo trực tiếp từ sheet gốc, dùng tỷ lệ đồng nhất theo cả hai trục để chiều cao từ đỉnh mũ đến đế giày bằng frame lõi cùng hướng, trạng thái chuyển động và số frame. Các mốc nguồn trong `body-scale-anchors.json` đã được đối chiếu trên ảnh: đèn nằm dưới đỉnh mũ và trên đế giày ở các pose này. Không dùng chiều rộng khăn/đèn hoặc kích thước hiệu ứng pulse để quyết định tỷ lệ cơ thể; không ép mọi bounding box alpha giống nhau. Pipeline dừng nếu nội dung vượt vùng an toàn 34×40 px, thay vì tự thu nhỏ hoặc cắt mất nội dung. `frames.json` lưu crop, tỷ lệ thực tế, bounding box đầu ra, mốc cơ thể, frame tham chiếu và hash mới. Các file provenance/prompt gốc là lịch sử lần tạo ảnh; hash frame trong đó mô tả kết quả cũ, catalog hiện tại là `frames.json`.

## Kiểm tra và giới hạn

**PASS — kiểm tra file:** đủ 240 tên duy nhất (128 lõi + 112 biến thể); mọi frame mở được, `36×42`, `RGBA`, có pixel trong suốt và có nội dung; toàn bộ frame ngoài `pulse` đều có đáy nội dung tại `y=40`; chiều cao cơ thể của 112 biến thể bằng frame lõi cùng hướng/pose; mọi bộ 3 frame `walk`/`run` đều có 3 hash khác nhau (240/240 hash duy nhất); không còn file `src/assets/player_*.png` nào. Generator chỉ ghi kết quả kiểm tra kỹ thuật; trường `visual_review` không tự tuyên bố đã xem ảnh.

Kiểm tra chiều cao dùng bounding box của mask cơ thể nguồn sau cùng phép crop/resize/căn đáy (`output_body_bbox`), đồng thời đo lại component alpha ≥80 lớn nhất trong PNG đầu ra. Cả hai phải đúng chiều cao tham chiếu và đáy `y=40`; bounding box alpha toàn ảnh không đủ để kết luận vì có thể gồm pixel thừa.

**Đã xem trực quan contact sheet:** đã kiểm tra `nhinh_contact_sheet.png`, `nhinh_state_variants_contact_sheet.png` và `nhinh_all_poses_contact_sheet.png`; cả 8 hướng đều đọc rõ trạng thái đèn tắt, đèn sáng (`_lit`) và tay không (`_nolamp`).

**Chất lượng hiện tại là prototype, cần chỉnh pixel trước production.** Đã sửa việc biến thể `down_lit`, `down_nolamp` (walk/run) và `downleft_lit` bị thu nhỏ độc lập bằng cách chuẩn hóa toàn bộ 112 biến thể theo pose lõi. AI vẫn chưa khóa chính xác hình thể và tay cầm đèn qua mọi pose: tỷ lệ đầu/thân, dáng nghiêng và chi tiết pixel của sheet gốc có thể khác nhau dù chiều cao cơ thể đã khớp; một số frame run/pulse nghiêng góc khác hướng dự kiến; nhịp bước và điểm chạm chân có thể giật khi lặp. Game nạp 240 frame runtime qua `src/art/CampaignArt.ts` (đã loại trừ các file `*contact_sheet*.png` khỏi bundle runtime); chưa rà animation trực quan trong engine cho đủ 8 hướng × mọi trạng thái.


## Sửa nhịp bước ngang — 2026-10-20

Đã sửa 36 frame `left`/`right` × `walk`/`run` × ba trạng thái đèn. Pha 0 đặt chân gần phía trước, pha 1 đi qua giữa, pha 2 đưa chân gần về sau và chân xa lên trước. Runtime lặp `0 → 1 → 2 → 1` cho hai hướng ngang; sáu hướng còn lại giữ vòng ba frame hiện có.

Phần chân dùng boot cutout từ ảnh `image_gen` và xử lý PNG bằng Python theo sự cho phép của người dùng. Các khớp chân gần/xa được đặt riêng để đổi vai ở hai nửa chu kỳ; hướng mũi giày giữ theo hướng nhân vật. 32 hàng pixel phía trên giữ nguyên, cùng các vùng bảo toàn gấu áo, tay, khăn và đèn. 36 frame vẫn 36×42 RGBA, chân chạm hàng 40; 204 frame còn lại giữ nguyên dữ liệu pixel và hash.

Phần sửa được ghi vào sáu source sheet gốc. `prepare_frames.py` tiếp tục tái tạo đủ 240 frame, catalog và contact sheet từ những sheet này, không có override runtime. Prompt, ảnh tham chiếu được chọn và tọa độ xử lý nằm trong `source_sheets/side-gait/`; các prompt/provenance cũ là lịch sử trước lần sửa này. Model thực tế sau công cụ tích hợp không được công cụ công bố.

Kiểm tra vòng animation bằng `node scripts/check-player-gait.mjs`. Kiểm tra file và tái tạo bằng lệnh `ALLOW_CATALOG_OVERWRITE=1` đã nêu ở trên. Hash khác nhau chỉ xác nhận file khác nhau; kiểm tra hình học/tọa độ chân và xem animation mới xác nhận nhịp đổi chân. Lần sửa này không xác nhận chất lượng animation của sáu hướng còn lại.


Theo phản hồi về gót bị khuyết, mẫu giày5×4 đã được sửa gót và đế: hai hàng dưới đầy đủ5 pixel alpha255, không còn hàng đế thu về một pixel. Đã loại phần chân cũ còn sót ngoài vùng ghép. Tọa độ khớp và vòng bước giữ nguyên; ghi chú theo sau nằm trong `source_sheets/side-gait/provenance.json`.
