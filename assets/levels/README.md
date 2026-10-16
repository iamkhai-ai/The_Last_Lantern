# Đồ họa màn chơi — danh mục sản xuất

Đợt 2026-10-16 đã hoàn tất sản xuất đồ họa ngoại tuyến cho 10 màn (mục 01–16 trong `tasks/todo.md`). Các lô ban đầu dùng `gpt-6.1-sol` / high theo chỉ đạo lúc đó; những lô tiếp theo dùng low theo chỉ đạo mới hơn. Raster được tạo bằng `image_gen` tích hợp; công cụ không công bố tên backend.

Nguồn nội dung là 10 kịch bản đã duyệt trong `docs/scenario/`. Không thay nội dung kịch bản. `inventory.json` là ảnh chụp nguồn tại HEAD `6fb15893fca946f328c06c010f5869af5f7de1f7`; working tree khi lập danh mục có thay đổi chưa commit. Từ đợt tích hợp 2026-10-16, runtime nạp các ảnh được chọn trực tiếp từ `assets/levels/` và `assets/character/` qua `src/art/CampaignArt.ts`; đây là mapping runtime riêng, không sửa `assetManifest.json` cũ.

## Phân loại nguồn

| Nguồn | Phân loại / quyết định | Giới hạn |
|---|---|---|
| `src/assets/*.png` | 135 PNG thực, 147 key manifest. Reuse cây/bụi/nền/đá/cổng/gương/bệ/khóa/tinh thể/Lumo; thông tin từng file ở inventory | Canvas thực của nhiều PNG khác manifest. Cần chuẩn hóa phi phá hủy trước tích hợp. `runestone_leaf_*` thực vẽ xoắn; `runestone_star_*` thực vẽ tam giác, không dùng làm biểu tượng Lá/Sao trong pilot |
| `assets/character/` | 128 frame Nhinh 36×42 RGBA; runtime dùng idle/walk/run khi cầm đèn tắt và animation bật/tắt/pulse | Prototype; do thiếu pose lit/no-lamp, runtime tạm dùng frame nhân vật cũ khi đèn bật hoặc đã đặt xuống; một số hướng/tay đèn/điểm chân cần chỉnh, xem README |
| `Art_References/01_Character_Style_Guide.png` | Board chuẩn phong cách/nhân vật | Không nạp nguyên board thành sprite |
| `Art_References/02_Environment_Props_and_Puzzles.png` | Board vật liệu/đạo cụ | Có chữ và bố cục minh họa; concept-only |
| `Art_References/03_Whispering_Woods.png` đến `07_The_Last_Dawn.png` | Concept-only không khí màn | Không phải tilemap hay scene 640×360 có thể chơi |
| `Art_References/The_Last_Lantern_Tileset_Pack/01_terrain_water_cliffs_tileset.png` | Atlas 1254×1254 RGBA, thử crop cỏ; tiềm năng mép nước/đá/vách | Không có grid đều; cỏ crop thử thấy đường nối khi lặp, chưa đạt seamless |
| `Art_References/The_Last_Lantern_Tileset_Pack/02_ruins_architecture_tileset.png` | Atlas 1254×1254 RGBA, thử crop bậc thang; tường/cầu/cổng dùng cho lô sau | Góc nhìn hơi isometric, cần đồng bộ; giữ tọa độ thủ công |
| `Art_References/The_Last_Lantern_Tileset_Pack/03_props_interactives_tileset.png` | Atlas 1254×1254 RGBA, thử crop đá; tiềm năng rễ/cây/đèn | Các vật sát nhau, crop phải loại mảnh lân cận; không coi board là sprite sheet đều |
| `Art_References/The_Last_Lantern_Spritesheet_Pack/` | Concept-quality character/Lumo reference | Không thay Nhinh đã chọn; không giả định grid/foot baseline đồng nhất |
| `src/art/ProceduralTextures.ts` | Canvas fallback còn giữ cho các key thiếu PNG và hiệu ứng động | Game có hình không đồng nghĩa đã có PNG hoàn chỉnh. Tia/Pulse/bóng có thể tiếp tục dựng động khi tích hợp |

**12 key thiếu PNG xác nhận lại:** `heart_tree_0`, `heart_tree_1`, `heart_tree_2`, `heart_tree_3`, `heart_tree_dawn`, `beacon_stone`, `mural_tablet`, `ruins_altar`, `ruins_flower`, `shadow_npc`, `tuft_grass`, `mushroom_warm`. Có hàm Canvas dự phòng cho chúng. Không tạo thêm cỏ/nấm chỉ để lấp danh sách nếu fallback đạt yêu cầu.

## Ma trận màn / trạng thái / đầu ra

Ma trận dưới đây là danh mục mục tiêu ban đầu; kích thước/frame thực và trạng thái bàn giao nằm trong `assets/levels/asset-handoff.json` cùng asset-map của từng lô. Key trong asset-map là key bàn giao; subset được runtime ánh xạ ở `src/art/CampaignArt.ts`, không đăng ký trong `assetManifest.json`. Pivot thường `(0.5,1)` cho prop và `(0.5,0.5)` cho overlay; xem từng map để lấy giá trị cụ thể.

| Màn | Reuse có source tại `src/assets/` | Mới/crop; state cần có | Ưu tiên; canvas dự kiến; output |
|---|---|---|---|
| 01 | tree_woods, bush_woods, tile_grass/dirt, woods_arch_locked/open, lantern_hang_1 | Bia nhận đèn, dấu chân/vòng đá, mắt cổng ngủ/lộ/mở; đèn nhặt/có tay cầm | P0 bia/dấu/mắt; P1 đèn; 40×52, 32×24; `01-forgotten-forest-edge/` |
| 02 | Rừng/cổng trên; runestone_hidden, runestone_moon_rev/lit; Lumo; Nhinh prototype | Lá/Sao đúng hình ngủ/lộ/active; mẩu thơ; bia thử; ký ức; cổng đóng/mở reuse | P0 rune/cổng 40×52 và 128×126; P1 thơ 48×40, overlay 128×64; `02-whispering-woods/` |
| 03 | tile_stone, pedestal_empty/lit, crystal_memory; rễ/đá atlas | 4 phiến × lớp sáng/tối, hốc trống/có/chọn; giếng/vách đóng/mở; tranh 5 và giá sách rễ | P0 tranh/hốc 48×48; P1 phòng/tranh5 128×96; `03-library-beneath-the-roots/` |
| 04 | tree_creek, bush_creek, tile_water*, mirror_0..3, receiver_off/on, pedestal_*, stepping_stone | 2 đoạn cầu thiếu nguồn/có nguồn/giữ; chốt tự do/gài; dấu 1/2/3; hoa đá, phù điêu bão | P0 cầu 96×32/chốt 24×32; P1 phù điêu 96×64; `04-shattered-moonlit-creek/` + shared |
| 05 | tile_stone, ruin_pillar, Lumo, chốt 04; tường/cửa atlas | Mốc/ấn trống/gọi/đi/tới; ống/dây; cửa đóng/mở/giữ; mực ẩn/hiện | P0 mốc 32×32, ống module 32×32/cửa 64×80; P1 kiến trúc; `05-a-path-for-two/` |
| 06 | mirror_*, receiver_*, pedestal_*, crystal_hope, bộ 04–05 | Lăng kính thiếu/có nguồn; vòng A/B/C; cần Giữ/Trả; buồng kín/mở, nước/đèn tháp, khăn/bản ghi | P0 lăng kính 40×48/cần 32×40; P1 buồng 96×96; `06-the-sleepless-tower/` |
| 07 | tile_grass/dirt, bush_ruins, mushroom_cyan, nước/chốt 04 | Hoa Nhật mở/khép, Rễ Nguyệt co/vươn; cầu rễ module; bể che/lộ, cống đóng/mở, mầm trước/sau lá | P0 cây 40×48, cầu 32×32; P1 mầm 24×24; `07-the-sleeping-garden/` |
| 08 | tile_stone, ruin_pillar, guardian_statue, lock_sun/moon_off/on, mirror_*, bộ chia 06 | Tượng 4 nấc, bóng khớp; bệ chưa/đủ/gài; màn/cửa; Shadow chờ/che cây/di chuyển | P0 tượng 48×64/bóng động; P1 Shadow 44×56; `08-ruins-of-two-halves/` + shared |
| 09 | gương/chốt 04, mốc/ống 05, bộ chia 06, cầu rễ 07, tượng/Shadow 08, crystal_balance | 3 phòng; cửa A đóng/mở/gài; đường G0/G1/G2; lối vòng; bản đồ sao/bánh xe/bản ghi; ký ức đúng vị trí Shadow | P0 tường module 32×48/cửa 64×80; P1 bánh xe 96×96; `09-dark-moon-observatory/` |
| 10 | canopy_*, tree_hub/dawn, bush_hub/dawn, crystal_*, bộ cơ chế shared | Thân/lõi cây, ba hốc trống/có; nhánh thiếu/đủ, tự giữ/quá tải/nghỉ/bình minh; Shadow tan/montage | P0 thân 220×210/nhánh tách lớp; P1 cảnh kết 640×360; `10-the-heart-of-elaria/` |

Navigation màn 09 đã đọc tại `docs/superpowers/specs/2026-10-16-observatory-room-navigation-design.md`: 3 phòng Entrance Hall → Star-map Corridor → Observatory, cửa A chốt, đường đá quay lại. Source `CampaignScene` hiện vẫn đơn giản một view; không khóa bố cục art 09 theo placeholder source. Phải đọc lại lúc đến lô 09.

## Bằng chứng hiện có

- `shared/crop-metadata.json`: source SHA, crop box `[left,top,right,bottom)` theo pixel atlas, canvas, pivot, cách resize/loại mảnh lân cận.
- `shared/crop-test-contact-sheet-640x360.png`: sáng/tối 1× và 2×, thử nối cỏ; là ảnh kiểm tra ngoại tuyến.
- Các bộ màn 01–10 và shared: source, prompt, map, validation, README và preview được lưu theo từng thư mục; danh mục gom ở `asset-handoff.md` / `asset-handoff.json`.
- `assets/character/frames.json` / `validation.json`: mapping và PASS kỹ thuật của 128 frame; prompt và sheet gốc nằm trong cùng thư mục.
- `tasks/todo.md`: tiến độ từng lô, giới hạn và trạng thái kiểm tra.

`src/art/CampaignArt.ts` ánh xạ PNG cho runtime mà không đưa preview/source ngoại tuyến vào bundle. Các phòng dùng nền sạch có sẵn cho màn 04–08 và 10; màn 09 dùng các props cơ chế đã chọn vì các ảnh nền giao nhận có dải ghi chú/debug. CampaignScene gắn sprite cho các trạng thái câu đố đã có trong dữ liệu màn. `npm run build` PASS sau tích hợp. Browser smoke hiện xác nhận menu tải được trên cổng localhost cô lập; chưa xem trực quan đủ 10 màn hoặc xác minh mọi trạng thái trong engine. Chơi trọn câu đố và ending được để người dùng tự review.

## Trạng thái bàn giao

Asset-handoff xác nhận 15 asset maps, 268 PNG output màn chơi duy nhất, 128 frame Nhinh, 128 reuse references và 177 preview. Audit có 0 lỗi đường dẫn, kích thước, hash hoặc pivot. Hai alpha rỗng là sentinel có chủ ý; tám nhóm ảnh trùng pixel đã ghi nguyên nhân. Runtime chưa dùng hết mọi asset và không thay thế các procedural P2; giới hạn pose animation, montage, terrain và hiển thị cần rà tiếp được ghi tại README của lô tương ứng.
