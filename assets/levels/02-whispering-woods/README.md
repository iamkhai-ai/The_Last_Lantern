# Màn 02 — pilot đồ họa Rừng Đom Đóm

Trạng thái: **pilot đã có đủ tài nguyên để người dùng xem tại Điểm kiểm tra A; chưa được duyệt**. Subagent tiếp tục bằng cấu hình yêu cầu **GPT-6.1 Sol High**, tạo state cổng mở bằng công cụ `image_gen` tích hợp. Công cụ ảnh không công bố backend model riêng. Không gọi CLI/API.

## Tài sản

- `sprites/runestone_{moon,leaf,star}_{sleeping,revealed,active}.png`: 9 PNG 40×52 RGBA. Ngủ là bia chưa có dấu; Pulse lộ biểu tượng cyan; kích hoạt chuyển vàng và có notch. Trạng thái ngủ dùng cùng silhouette đá trống cho ba rune.
- `sprites/poem_fragment.png`: mẩu bia nhỏ có biểu tượng Trăng–Lá–Sao, không chứa chữ giải đố giả.
- `sprites/memory_vignette.png`: overlay ký ức hai bóng người, không xác định danh tính.
- `sprites/woods_arch_open_passage.png`: state cổng mở mới, 128×126 RGBA; lối đi tối và bậc thang rõ, rễ nép ngoài hai trụ. Cổng đóng dùng lại `src/assets/woods_arch_locked.png` và chuẩn hóa về cùng canvas chỉ trong preview.
- `sources/`: 6 ảnh nguồn `image_gen`, giữ bản gốc. `generation-prompts.json` hiện có **6 prompt chính xác**. Prompt Trăng/Sao được khôi phục nguyên văn từ tool session còn lưu; `recovered-prompt-evidence.json` ghi bằng chứng. `open-gate-prompt.json` ghi riêng lần tạo mới và đường dẫn gốc do tool trả.
- `previews/level02-pilot-640x360.png`: bản mở cổng/ký ức ngoại tuyến mới nhất. **Không phải ảnh trong engine.** Bản đang dở cũ được giữ ở `level02-pilot-before-open-gate-640x360.png`.
- `previews/level02-{lantern-off,lantern-on,pulse,open-memory}-640x360.png`: đối chiếu 4 trạng thái, giữ trống vùng HUD y=0–35 và vùng controls y=338–359. Các vị trí là đề xuất art, chưa phải tọa độ runtime.
- `previews/rune-state-contact-sheet-640x360.png`: ma trận 3 biểu tượng × 3 trạng thái, cập nhật từ PNG thực; xem 1× và 2× nearest.
- `previews/gate-props-contact-sheet-640x360.png`: cổng đóng/mở, mẩu thơ và ký ức, đối chiếu nền sáng/tối tại 1×. Chữ chỉ có trong preview.
- `asset-map.json`, `validation.json`: đường dẫn, canvas và kết quả kiểm tra.
- `open-gate-export.json`: source SHA-256, bbox cắt, tỷ lệ nearest, canvas, pivot và alpha. `prepare_open_gate.py`: xuất/cắt/phối/kiểm tra file, không gọi model tạo ảnh.

## Tái sử dụng và giới hạn

Dùng cây/bụi/cổng/Lumo từ `src/assets/` và Nhinh từ `assets/character/`. Không lấy nguyên board concept làm sprite. Rune cũ `runestone_leaf_*` thực là xoắn ốc, `runestone_star_*` là tam giác nên pilot tạo hình Lá/Sao đúng tên. `woods_arch_open.png` được xem trực tiếp nhưng vẫn là cổng kín; không giả làm đường mở.

Trạng thái ngủ của ba rune cố ý dùng cùng ảnh bia trống từ sheet Trăng; không phải 3 kết quả tạo độc lập. Pulse lộ nét cyan, active có nét vàng và notch. Metadata đã sửa source của các bản ngủ về sheet Trăng. Cổng mở mới có chênh nhẹ silhouette/vật liệu so với cổng đóng gốc; đây là nội dung cần người dùng xem trước khi làm hoạt ảnh chuyển tiếp. Chưa có animation rễ nới dần.

Ký ức sinh ra còn chi tiết áo/quần, chưa thành bóng phẳng hoàn toàn; preview dùng alpha 75% để đọc như lớp ký ức. Nền/path preview tái dùng crop từ `tile_grass.png`/`tile_dirt.png`, lặp lật đối xứng để giảm đường nối; không đăng ký chúng như bộ tile seamless mới. Các chấm đom đóm/path là cue xem bố cục. Đèn bật/tắt đổi frame Nhinh; preview không mô phỏng chính xác shader ánh sáng, bán kính Pulse, collision, hội thoại hay save-state của engine.

Atlas crop thử nằm ở `../shared/`, có tọa độ và ảnh nguồn trong `crop-metadata.json`. Crop cỏ có đường nối, chưa dùng làm tile.

## Kết quả hiện tại

**PASS kỹ thuật** cho 12 sprite pilot: đúng canvas khai báo, RGBA, có alpha trong suốt, nội dung không rỗng. Có 6 nguồn và 6 prompt chính xác. 8 PNG preview/evidence hiện có đều 640×360; số này bao gồm bản draft cũ được bảo lưu, không phải 8 sprite production.

Đã xem trực quan preview mở/ký ức, tắt/bật đèn, Pulse, contact rune và cổng/props ở 640×360: cổng mới đọc được là lối mở, ba glyph phân biệt, vật thể không đè vùng HUD dự kiến, alpha không có nền hình chữ nhật. Chất lượng tổng thể vẫn là pilot; khác biệt silhouette cổng và chi tiết ký ức được ghi để duyệt, không tự coi là production-ready.

Lệnh đã chạy: `python assets/levels/02-whispering-woods/prepare_open_gate.py`. **NOT_RUN** trong engine/build; chưa nối manifest hoặc sửa runtime. **Checkpoint A chờ người dùng xem và chốt** palette/tỷ lệ/độ sáng/pivot trước khi sang màn tiếp theo.
