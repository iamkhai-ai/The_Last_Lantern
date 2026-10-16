# Kế hoạch đồ họa cho 10 màn — The Last Lantern

Ngày lập: 16/10/2026. Trạng thái: người dùng đã chỉ đạo tiếp tục sản xuất lần lượt đến hết phạm vi ngày 16/10/2026.

## Mục tiêu và phạm vi

Tạo bộ đồ họa đủ để nhận ra từng màn, đọc được câu đố và thấy rõ kết quả thao tác ở độ phân giải game 640×360. Giữ thiết kế Nhinh vừa được người dùng chấp nhận. Tận dụng PNG hiện có và kho ảnh của project; chỉ tạo thêm khi tài nguyên hiện có không thể hiện đúng vật thể hoặc trạng thái trong kịch bản.

Nguồn nội dung là toàn bộ `docs/scenario/01-*.md` đến `10-*.md` đã được người dùng duyệt. Kế hoạch này không chỉnh cốt truyện, lời thoại hay luật giải đố. Đợt hiện tại chỉ lập kế hoạch; sản xuất ảnh và tích hợp game là các bước tiếp theo.

**Model phụ trách các đợt sản xuất tiếp theo: `gpt-6.1-sol`, reasoning `low` (“Light”), theo chỉ đạo mới nhất của người dùng ngày 16/10/2026; thay mức `high` ban đầu.** Model này đọc tham chiếu, lập prompt, chỉ đạo công cụ tạo ảnh và kiểm tra kết quả. Công cụ tạo ảnh tích hợp thực hiện dựng raster; không mặc định nó có cùng tên model với agent. Mỗi đợt lưu model/effort mà runtime trả về, prompt, ảnh tham chiếu và đầu ra. Nếu lựa chọn model/effort bị từ chối, giữ lỗi và báo bước phụ thuộc bị chặn, không tự đổi model.

## Căn cứ và hiện trạng

Đã đối chiếu `src/art/assetManifest.json`, `src/art/AssetLoader.ts`, `src/art/ProceduralTextures.ts`, `src/scenes/BootScene.ts`, phần dựng phòng/đạo cụ của `CampaignScene.ts`, `src/data/campaignLevels.ts`, `src/actors/Player.ts`, `src/config/gameConfig.ts`, các README của kho ảnh và bộ Nhinh.

Mốc Git khi đọc: `6fb15893fca946f328c06c010f5869af5f7de1f7`; working tree có thay đổi chưa commit, gồm cả campaign. Đây là ảnh chụp hiện trạng đọc tại ngày lập, không phải bằng chứng kiểm tra toàn bộ runtime. Trước tích hợp phải đọc lại revision thực tế.

| Nguồn | Có thể dùng thế nào | Giới hạn |
| --- | --- | --- |
| `src/assets/` | 135 PNG hiện có: nhân vật cũ, Lumo, cây/bụi, đá, gương, cổ tự, khóa Nhật–Nguyệt, bệ, mắt nhận, cổng, tinh thể, nền | 147 entry trong manifest; 12 key chưa có PNG. File có sẵn vẫn cần xem ở đúng kích thước game trước khi chốt dùng |
| `assets/character/` | Bộ Nhinh mới: 128 frame 36×42, 8 hướng, idle/walk/run/bật/tắt/pulse; dùng làm mốc thiết kế và thử trên cảnh | README xác định là prototype, chưa tích hợp; idle/walk/run chưa có biến thể lit/unlit riêng, điểm chân và một số hướng cần sửa |
| `Art_References/01_Character_Style_Guide.png` | Chuẩn nhân vật, bảng màu và tỷ lệ | Là board tham chiếu, không đưa nguyên board vào game |
| `Art_References/02_Environment_Props_and_Puzzles.png` | Hướng mỹ thuật đèn, đá, gương, cầu, đồ trang trí | Board có chữ, nền và bố cục minh họa; phải dựng/cắt thành tài nguyên phù hợp |
| `Art_References/03_Whispering_Woods.png` đến `07_The_Last_Dawn.png` | Không khí rừng, suối, tàn tích, Cây Mẹ, bình minh | README xác nhận là concept, không phải tilemap hay sprite sẵn sàng sản xuất |
| `Art_References/The_Last_Lantern_Tileset_Pack/` | Ba atlas terrain/water/cliffs, ruins/architecture, props/interactives; ưu tiên lấy cỏ, đá, mép nước, tường, cầu thang, cổng và đạo cụ | Có nguồn hình trực tiếp để làm prototype; chưa có tọa độ cắt, lưới/collision/meta. Cần làm sạch mép, alpha, tỷ lệ và kiểm tra nối cạnh |
| `Art_References/The_Last_Lantern_Spritesheet_Pack/` | Nguồn tham chiếu hoặc cắt thử Lumo/nhân vật | README gọi là concept-quality; không mặc định mọi ô là frame đồng nhất. Các bản player JPG/hooded keeper chỉ là phương án tham khảo, không đổi thiết kế Nhinh đã chọn |

12 key manifest thiếu PNG: `heart_tree_0`, `heart_tree_1`, `heart_tree_2`, `heart_tree_3`, `heart_tree_dawn`, `beacon_stone`, `mural_tablet`, `ruins_altar`, `ruins_flower`, `shadow_npc`, `tuft_grass`, `mushroom_warm`. Các key này hiện có hàm vẽ Canvas dự phòng; game hiển thị được không có nghĩa đã có đồ họa PNG hoàn chỉnh. Cỏ/nấm trang trí có thể tiếp tục dùng dự phòng nếu đã đạt hình thức, không bắt buộc sản xuất cả 12 chỉ để lấp danh sách.

`src/assets/README.md` cũ ghi tổng 82 file, tiêu đề nhân vật 36 file/4 hướng nhưng bảng lại liệt kê 72 frame/8 hướng và dẫn tới `src/assets/index.json`. Loader thực tế dùng `src/art/assetManifest.json` cùng glob PNG ở `src/assets/`. Dùng dữ liệu thực tế làm chuẩn khi lập danh mục mới.

Campaign hiện chia thành 8 giá trị biome: woods, library, creek, tower, garden, ruins, observatory, heart. `drawRoom()` chủ yếu phóng một texture nền thành 640×360, nhuộm màu và đặt cây/cột ở bốn góc. Nhiều tương tác dùng `receiver_off`, `stepping_stone`, `lock_*`, thậm chí `shadow_npc` cho vai trò khác nhau. Đây là placeholder cần gắn đúng nghĩa khi tích hợp, không phải bằng chứng đã đủ hình cho trạm nước, cầu rễ hay ấn Lumo. Màn 09 trong source đang đơn giản hơn ba phòng trong kịch bản; không dùng source giản lược để bỏ yêu cầu hình của kịch bản.

## Cách sản xuất được đề xuất

1. **Tái dùng và bổ sung theo bộ cơ chế — chọn cách này.** Giữ PNG tốt, cắt/sửa nguồn atlas khi phù hợp, tạo mới phần còn thiếu. Rừng phục vụ 01–02; kiến trúc trạm/tháp phục vụ 05–06; bộ gương, chốt, mốc Lumo, cầu rễ và tượng phục vụ nhiều màn. Bố cục/ánh sáng/đạo cụ trọng tâm tạo khác biệt cho từng màn.
2. Dựng riêng một ảnh nền lớn cho mỗi màn: nhanh có hình tổng thể, nhưng khó thay trạng thái, che khuất đường đi và thiếu khả năng tái dùng. Chỉ dùng ảnh tổng thể làm bản xem trước bố cục.
3. Làm lại toàn bộ kho tài nguyên: đồng nhất hơn nhưng tốn sản xuất và dễ lệch bộ Nhinh đã chấp nhận. Chưa có lý do để chọn.

Đề xuất cấu trúc sản xuất ở `assets/levels/`: `shared/` chứa bộ dùng chung, `01-forgotten-forest-edge/` đến `10-the-heart-of-elaria/` chứa tài nguyên riêng, `sources/` giữ ảnh gốc, `previews/` giữ bản phối cảnh. Metadata đặt ngay trong bộ liên quan, ghi nguồn, kích thước, pivot, trạng thái, màn sử dụng và key dự kiến. Đây là cấu trúc đề xuất; chưa tạo thư mục ảnh trong đợt lập kế hoạch.

`assets/levels/` là nơi bàn giao sản xuất. Runtime hiện chỉ tự tìm PNG đã khai báo trong manifest tại `src/assets/`; chuyển/copy bản đã duyệt và nối các trạng thái vào scene là một công việc tích hợp có kiểm soát ở bước sau. Không coi việc lưu ảnh là đã tích hợp.

## Quy ước hình ảnh dùng chung

- Pixel art top-down bám board và Nhinh: áo/mũ kem, khăn đỏ, đèn vàng; rừng xanh đêm, điểm tương tác vàng/cyan; bóng tối vẫn có mép vật thể đọc được. Giảm chi tiết nền ở vùng di chuyển và quanh ký hiệu câu đố.
- Giữ góc nhìn, độ lớn nét, chất liệu đá/gỗ và độ sáng đồng nhất. Khi dùng atlas lớn phải thử thu nhỏ bằng nearest-neighbor trước; không coi việc thu nhỏ là tự đạt chất lượng pixel art.
- Đạo cụ tách thân, ký hiệu và hiệu ứng khi cần đổi trạng thái độc lập. Tia sáng, bóng tượng và hạt Pulse ưu tiên tiếp tục dùng hiệu ứng engine nếu đạt hình thức; không đặt mục tiêu vẽ lại mọi hiệu ứng thành PNG.
- Chốt cơ khí phải khác mắt nhận sáng; mốc gọi Lumo/ấn đom đóm phải khác khóa Nguyệt; đường có thể đi phải khác họa tiết nền. Dùng hình dạng/nấc/mở–khép bên cạnh màu sáng.
- Trạng thái `revealed` do Pulse khác `active` đã kích hoạt; `powered` do còn nguồn khác `latched` đã giữ cơ khí. Chọn lớp phủ hoặc frame thay thế theo bảng trạng thái, tránh nhân toàn bộ cảnh thành nhiều PNG.

## Danh mục theo màn

P0: hình ảnh quyết định đọc luật/đường đi. P1: tạo bản sắc và kể chuyện. P2: trang trí/animation phụ, thực hiện sau khi P0/P1 đọc rõ. Các tên tài nguyên mới dưới đây mô tả nhóm việc, chưa phải tên file đã tồn tại.

### 01 — Rìa Rừng Quên Lãng

- **Mục tiêu hình:** khoảnh cỏ ẩm dễ quan sát, bia rêu cạnh đèn, cổng có mắt mặt trời phía Bắc; vệt sáng trắng xa tạo câu hỏi đầu game.
- **Tái dùng:** `tile_grass`, `tile_dirt`, `tree_woods`, `bush_woods`, `tree_alt`, `bush_alt`, `mushroom_cyan`, `pedestal_empty/lit`, `woods_arch_locked/open`, `receiver_off/on`; cắt nguồn cây/gốc/đá từ atlas nếu cần. Cổng hiện có là nền để sửa sang gỗ/mắt đá theo kịch bản, chưa mặc định đúng hình hoàn chỉnh.
- **Bổ sung:** bia `beacon_stone` từ dự phòng thành bản mỹ thuật, đèn nhặt riêng, dấu chân/vòng đá và mắt cổng nối sáng; lớp sương/cành trước cảnh chỉ khi không cản đường.
- **Trạng thái:** đèn chưa lấy/đã lấy; chữ ẩn/được chiếu; dấu chân hiện theo Pulse; mắt đang nhận/đầy; cổng đóng/mở đã giữ. Phải thấy điểm đứng đúng khi Pulse đã hết theo yêu cầu kịch bản.
- **Ưu tiên:** P0 bia–đèn–dấu chân–mắt–cổng; P1 bố cục mở cảnh và vệt trắng; P2 cành/sương.

### 02 — Rừng Đom Đóm

- **Mục tiêu hình:** ba bia quanh khoảng rừng tròn, phân biệt vị trí Trăng/Lá/Sao; đàn đom đóm dẫn nhìn đúng thứ tự.
- **Tái dùng:** bộ rừng 01, `runestone_hidden`, `runestone_{moon,leaf,star}_{rev,lit}`, `woods_arch_locked/open`, `lantern_hang_1..3`; hạt đom đóm dự phòng hoặc nguồn Lumo.
- **Bổ sung:** mẩu bia bài thơ, bia lá thử không tính chuỗi; phân biệt rõ lớp ký hiệu vừa hiện với bia đã được kích hoạt; bóng trẻ em/người lớn trong ký ức và lớp hổ phách; rễ cổng nới ra nếu cổng hiện có chưa diễn đạt được.
- **Trạng thái:** bia ngủ → Pulse lộ nét → kích hoạt giữ sáng; chọn sai dịu lại; cổng đóng/mở; ký ức chỉ phủ tạm trên cảnh. Bóng ký ức cần đọc được nhưng không thành nhân vật tương tác.
- **Ưu tiên:** P0 các bia/cổng; P1 ký ức và đường bay; P2 chuyển động lá. **Chọn làm pilot** vì có nhiều PNG sẵn và kiểm tra tốt quy tắc sáng/tối/trạng thái.

### 03 — Thư Viện Dưới Rễ

- **Mục tiêu hình:** không gian ấm dưới rễ, giếng tròn và giá sách tự nhiên; tương phản giữa hai lớp mực phải đọc được.
- **Tái dùng:** `tile_stone`, `pedestal_empty/lit`, `crystal_memory`; nguồn rễ/đá/bàn từ atlas. `mural_tablet` hiện chỉ là dự phòng chung, không thay cho bộ tranh.
- **Bổ sung:** giá sách-rễ, bàn/trang thử, vòng giếng bốn hốc có mốc bắt đầu và chiều nối, bốn phiến Chim/Lá/Thuyền/Hạt với lớp sáng/tối, vách tranh thứ năm và tranh Người Bảo Vệ giữ bánh xe.
- **Trạng thái:** tối thiểu 8 nội dung lớp tranh theo 4 phiến × 2 điều kiện quan sát; số PNG có thể giảm bằng lớp phủ chung. Chim/Thuyền phải có lớp sáng tương đương; Lá/Hạt có lớp tối tương đương. Không thêm cảnh/nhãn khiến một lớp tự lộ lời giải. Hốc trống/có phiến/được chọn; giếng kín/mở; vách kín/mở; tinh thể còn/đã nhận.
- **Ưu tiên:** P0 tranh và hốc; P1 phòng và tranh thứ năm; P2 giấy/bụi. Đây là điểm kiểm tra rủi ro quan trọng sau pilot.

### 04 — Suối Trăng Vỡ

- **Mục tiêu hình:** hai bờ, đảo giữa và hai đoạn cầu đọc rõ; mặt nước gần như chết, phản trăng đứt.
- **Tái dùng:** `tree_creek`, `bush_creek`, `tile_stone`, `tile_water` và `tile_water_b..e`, `rock_blocker`, `mirror_0..3`, `receiver_off/on`, `pedestal_empty/lit`, `stepping_stone`; atlas terrain cung cấp mép bờ, đá/nước, atlas kiến trúc cung cấp cầu.
- **Bổ sung:** bộ đoạn cầu ánh sáng/đá và hai tay chốt cơ khí dùng chung, dấu 1/2/3 trên gương, hoa đá ở khu thử, phù điêu đêm bão; bóng Cây Mẹ xa có thể lấy lại từ bộ 10 sau khi hoàn thành.
- **Trạng thái:** cầu chưa hiện/đang nhận năng lượng/được chốt giữ; chốt tự do/đã gài; mắt tắt/sáng; gương theo hướng thực; bệ trống/có đèn tắt/có đèn sáng. `stepping_stone` chỉ tái dùng như viên đá, không đại diện toàn bộ cầu/chốt.
- **Ưu tiên:** P0 mạng tia–cầu–chốt–mép bờ; P1 phù điêu/nước chết; P2 phản chiếu/hơi nước.

### 05 — Lối Đi Hai Người

- **Mục tiêu hình:** trạm nước có hành lang cho Nhinh, ống nhỏ cho Lumo; nhìn thấy quan hệ mốc gọi → ấn → cửa.
- **Tái dùng:** `tile_stone`, `ruin_pillar`, đá/tường/cửa/cầu thang trong atlas, bộ chốt 04, `lumo_0..3`. `lock_moon_*`/`receiver_*` hiện chỉ làm mốc tạm cho ấn/cửa trong scene.
- **Bổ sung:** module ống/máng nước, mốc gọi và ấn đom đóm dùng chung, dây rễ nối, cửa nâng; hành lang mực phát quang và dấu vòng xoắn; chân cầu thang xoắn.
- **Trạng thái:** mốc nghỉ/đang gọi/Lumo đang đi/đã tới; ấn trống/có Lumo; cửa đóng/mở bằng ấn/đã giữ bằng chốt; mực chìm khi đèn bật/hiện khi tắt, vẫn thấy dưới ánh Lumo; nước bị hút ngược.
- **Ưu tiên:** P0 ống–mốc–ấn–cửa–mực; P1 kiến trúc trạm/vết xoắn; P2 dòng nước và độ rung máy.

### 06 — Ngọn Tháp Không Ngủ

- **Mục tiêu hình:** vòng máy đá, buồng tinh thể, nguồn sáng trắng quá dai dẳng; người chơi thấy cả ba mạch A/B/C cùng hoạt động.
- **Tái dùng:** kiến trúc/ống/mốc Lumo 05, `mirror_0..3`, `receiver_off/on`, `pedestal_empty/lit`, `crystal_hope`, bộ chốt. Dùng đúng một thiết kế lăng kính cho các màn sau.
- **Bổ sung:** lăng kính tách tia, ba vòng điều tiết và cần Trả dòng, buồng máy/tinh thể, đèn tháp, cửa sổ/khăn bạc/ngăn bản ghi. Cần nguồn riêng cho lăng kính; không tiếp tục dùng một gương làm biểu tượng thay thế.
- **Trạng thái:** lăng kính thiếu nguồn/có nguồn và hai nhánh; A/B tắt/sáng, C trống/Lumo giữ; máy Giữ sáng/Trả dòng, cửa buồng đóng/mở; nước lên/xuống; đèn tháp trắng gắt/dịu; tinh thể còn/đã lấy.
- **Ưu tiên:** P0 ba mạch/lăng kính/cần phản hồi tức thời; P1 máy và cửa sổ kể chuyện; P2 bánh răng/giọt nước.

### 07 — Khu Vườn Đang Ngủ

- **Mục tiêu hình:** hoa nở trắng nhưng cây non thiếu sức; khi che bể và trả nước, sự sống nhỏ trở lại trong bóng tối.
- **Tái dùng:** `tile_grass`, `tile_dirt`, `bush_ruins`, `mushroom_cyan`, nguồn hoa/mầm/rễ từ atlas, nước 04 và chốt 04. `ruins_flower` chưa có PNG và dù có cũng chưa đủ hai loại cây phản ứng đối nghịch.
- **Bổ sung:** Hoa Nhật/Rễ Nguyệt có biểu tượng nở–khép, bể tích quang/màn chắn/tay kéo, thanh chắn, cầu rễ theo đoạn, cống và mầm có lá mới; lối đá phụ lấy lại module đá đã có.
- **Trạng thái:** bể lộ/được che; Hoa Nhật mở/nâng thanh hoặc khép; Rễ Nguyệt co/vươn, gồm trạng thái chuyển tiếp chờ người tới bờ nếu runtime cần; chốt chưa/đã gài; cống kín/mở; nước khô/chảy; mầm trước/sau ra lá.
- **Ưu tiên:** P0 cây–cầu–màn–cống và dấu trạng thái; P1 mầm phát triển; P2 sinh động lá/đom đóm. Cầu rễ tái dùng ở 09.

### 08 — Tàn Tích Của Hai Nửa

- **Mục tiêu hình:** hai khóa Nhật bên ngoài và khóa Nguyệt giữa; hình bóng ban đầu bí ẩn nhưng hành động che cây dễ hiểu.
- **Tái dùng:** `tile_stone`, `ruin_pillar`, `guardian_statue`, `lock_sun_off/on`, `lock_moon_off/on`, `mirror_0..3`, `pedestal_empty/lit`, lăng kính/bộ chia 06, cây non 07 và kiến trúc atlas. `ruins_altar`/`shadow_npc` đang dự phòng.
- **Bổ sung:** tượng xoay đủ bốn nấc với mặt rộng/hẹp rõ, đế xoay và hình vùng bóng; bệ xác nhận/bộ chia ba luồng, màn đá che cây; The Shadow ở tư thế chờ/che ánh/đi theo lối ra, cột xoay thử là bản đơn giản của tượng.
- **Trạng thái:** hai Nhật tắt/sáng độc lập; Nguyệt bị chiếu/đủ bóng; bốn hướng tượng và bóng tương ứng; bệ chưa đủ/đủ/đã gài; cửa/màn đóng/mở giữ. Vùng bóng phải thực sự khớp mục tiêu, không chỉ là vệt trang trí.
- **Ưu tiên:** P0 tượng–bóng–ba khóa; P1 Shadow và màn che; P2 bụi/rêu. Không thêm tạo hình đe dọa hay hiệu ứng chiến đấu.

### 09 — Đài Thiên Văn Hắc Nguyệt

- **Mục tiêu hình:** ba phòng có liên kết nguồn sáng nhìn thấy; bánh xe ngày đêm dừng sai vị trí là hình trung tâm.
- **Tái dùng:** kiến trúc đá 05/08, gương/mắt/bệ/chốt 04, mốc/ấn/ống 05, bộ chia 06, cầu rễ 07, tượng/bóng và Shadow 08, `crystal_balance`; nguồn sao/trăng từ board làm tham chiếu.
- **Bổ sung:** module tường/cửa ba phòng, bản đồ sao/bánh xe ngày đêm, khung chia tia quen thuộc, màn dẫn tia, sơ đồ thu nhỏ và bàn ghi; hình ký ức Người Bảo Vệ khớp vị trí Shadow, bản ghi dừng bánh xe/rạn rễ. Không cần ba bộ đạo cụ độc lập cho ba phòng.
- **Trạng thái:** cửa A đóng/mở/đã chốt; màn theo Lumo; G0 đổi cửa/đường phòng sao, G2 thẳng/qua khung; khóa Nhật và cầu rễ phản hồi đồng thời; cửa cuối/chốt/lối vòng; ký ức trong suốt/Shadow vẫn còn sau khi trao tinh thể; tinh thể còn/đã lấy. Khi tải lại, hình phải theo cấu hình đã khôi phục.
- **Ưu tiên:** P0 ba phòng, đường nối và đường bộ quay lại; P1 bánh xe/bản ghi/Shadow; P2 chuyển động sao. Cần đọc lại thiết kế navigation đang có trong `docs/superpowers/` trước khi khóa bố cục, tránh hai phương án phòng mâu thuẫn.

### 10 — Trái Tim Elaria

- **Mục tiêu hình:** ba nhánh rễ nối vòng, cây tự ổn định; quá tải phân biệt được, đêm dịu rồi bình minh trở về.
- **Tái dùng:** `canopy_0..3`, `canopy_dawn`, `tree_hub/tree_dawn`, `bush_hub/bush_dawn`, ba `crystal_*`, gương/bệ/khóa, lăng kính 06, ấn 05 và tượng/bóng 08. Board `06_Heart_Tree_Sanctuary.png`/`07_The_Last_Dawn.png` định hướng cảnh.
- **Bổ sung:** thân/lõi Cây Mẹ dựa trên 5 key `heart_tree_*` còn thiếu PNG, ba hốc theo biểu tượng tinh thể và nhánh rễ tách lớp, bàn mô hình quy tắc, nguồn trắng dư/đường ngày đêm; pose ngồi/cài đèn chỉ nếu cần dựng đúng đoạn kết bằng sprite. Dùng lại cảnh vườn/suối/tháp/đài trong montage thay vì vẽ lại bốn thế giới.
- **Trạng thái:** hốc trống/có tinh thể; từng nhánh thiếu nguồn/đủ; vòng chưa khóa/đã tự giữ; đèn trên bệ/trên tay/tắt; lõi thường/quá tải/đêm nghỉ/bình minh. Cả ba màu cần khác cả ký hiệu và nhịp, không chỉ màu. Shadow tan ở bình minh, không biến mất sớm tại 09.
- **Ưu tiên:** P0 lõi–nhánh–quá tải và phản hồi tắt đèn; P1 bình minh/montage; P2 lá/chuyển động ngồi. Số frame cây/transition chốt sau pilot, không coi 5 tên manifest là đủ mọi nội dung cảnh cuối.

## Thứ tự làm và điểm dừng kiểm tra

| Giai đoạn | Đầu ra | Phụ thuộc và điểm kiểm tra |
| --- | --- | --- |
| A. Khóa danh mục | Bảng reuse/cắt-sửa/tạo mới; ma trận state; kích thước/pivot/key; bố cục thô của 10 màn | Đọc lại source và mọi thiết kế navigation đang phát triển; chốt trạng thái tạm và giữ vĩnh viễn |
| B. Pilot màn 02 | Một cảnh phối 640×360 có Nhinh, ba bia/cổng và ba trạng thái bia; contact sheet các vật thể | Tái dùng PNG rừng trước, chỉ tạo lớp thiếu; xem cả đèn bật/tắt/Pulse; duyệt tỷ lệ/nét/độ sáng trước khi nhân rộng |
| C. Rừng và thư viện | Hoàn thiện 01–03; bộ tranh sáng/tối | Sau pilot; kiểm tra tranh không tiết lộ đáp án chỉ qua một lớp |
| D. Suối, trạm và tháp | 04–06 cùng bộ chốt/cầu, mốc Lumo/ống, lăng kính/máy | 04 → 05 → 06; kiểm tra quan hệ nguồn chung và ba điều kiện đồng thời |
| E. Vườn, điện thờ và đài | 07–09, dùng chung cầu rễ/tượng/bóng/Shadow | 07 → 08 → 09; khóa bố cục ba phòng trước xuất tài nguyên riêng |
| F. Cây Mẹ và đoạn kết | 10, các lớp cây/rễ/nguồn, tái dùng cảnh montage | Dùng bộ cơ chế đã ổn định; kiểm tra tiến trình sáng → dư → nghỉ → bình minh |
| G. Bàn giao và preview game | Ảnh đã duyệt, mapping key/state và bản xem trực tiếp trong engine | Tích hợp là bước sau riêng; chỉ báo hoàn tất đồ họa game khi preview đạt |

Pilot nhỏ được đề xuất gồm bố cục bằng tài nguyên rừng sẵn, một mẫu bia có đủ ngủ/lộ/kích hoạt, một mẩu bia thơ, kiểm tra cổng đóng/mở và lớp ký ức hổ phách. Trước tiên kiểm tra một bia; sau khi đạt mới áp dụng cho Trăng/Lá/Sao. Đây là phạm vi đề xuất, không phải đếm ảnh mới bắt buộc. Nếu PNG hiện có đã đạt thì giữ nguyên.

Phân công song song khi sản xuất: sau A/B, một agent làm môi trường thư viện; một agent làm bộ cơ khí suối/trạm/tháp; một agent làm nhân vật Shadow/đạo cụ kể chuyện. Tất cả agent sản xuất theo `gpt-6.1-sol high`; mỗi người có thư mục sở hữu riêng. Gốc điều phối giữ danh mục shared và mapping runtime, tránh cùng sửa manifest/scene. Không mở agent sản xuất ảnh trong đợt lập kế hoạch này.

Chưa ước lượng tổng PNG hoặc thời gian vì atlas chưa có số ô cắt đã xác nhận, nhiều state có thể dùng layer/engine và layout 09 còn phụ thuộc navigation. Con số có căn cứ hiện tại là 10 kịch bản, 8 biome, 147 entry/135 PNG, 12 PNG thiếu và 128 frame Nhinh đã tạo. Khi A kết thúc, tính khối lượng bằng **tài nguyên duy nhất × biến thể thật sự cần**, trừ phần tái dùng và hiệu ứng engine; không nhân số đạo cụ theo số lần xuất hiện trong màn.

## Tiêu chí chấp nhận đề xuất cho sản xuất

Các tiêu chí dưới đây dùng để duyệt ảnh ở bước sau, chưa phải kết quả đã đạt.

1. **Bám kịch bản:** mỗi vật thể P0 có đủ phản hồi để đọc luật và kết quả. Không dùng một hình giống nhau cho chốt, mốc gọi, cống và mắt nhận. Không thêm chi tiết lộ danh tính/động cơ hoặc số phận cô bé sớm hơn kịch bản.
2. **Đọc trên cảnh tối:** xem đúng 640×360, cả đèn bật/tắt/Pulse và các màu biome. Nhinh, chân cầu, tay chốt, viền hốc và biểu tượng quan trọng vẫn nhận ra khi không zoom. Vật thể tương tác sáng hơn nền đủ để phân biệt hình; không dùng tăng glow toàn cảnh làm mất vùng tối cần thiết. Chụp đối chiếu có HUD/hội thoại để biết vật thể có bị che.
3. **Đúng chất pixel:** cạnh rõ, tỷ lệ nét/góc nhìn thống nhất, thu phóng nearest-neighbor; xem bản 1× và phóng lớn để phát hiện rìa mờ hoặc chi tiết vụn. Đạo cụ/sprite là PNG RGBA có nền trong suốt thật; texture nền được phép đục. Kiểm tra trên nền tối và sáng để bắt viền trắng/đen và alpha lỗi. Glow nếu dùng phải là chủ ý/lớp riêng.
4. **Đúng file/frame:** mở được PNG, tên duy nhất, đúng canvas đã thỏa thuận, pivot/điểm tiếp đất nhất quán, không cắt mất đèn/tia/tóc, không lọt hình ô bên cạnh. Animation đủ tên/số frame đã chốt, không có frame rỗng hoặc lặp vô ý; đi/chạy giữ hướng và tay cầm đèn ổn định. Các state có cùng điểm neo; số frame không được suy ra chỉ từ số file trong folder.
5. **Nguồn và metadata:** giữ ảnh gốc/prompt/reference/phiên bản xuất, đánh dấu reuse/cắt-sửa/tạo mới. Mỗi key có mapping tới file và state; cảnh preview/contact sheet không được nạp nhầm thành sprite. Đường dẫn phải tồn tại, kích thước khai báo khớp PNG.
6. **Preview trong engine:** sau khi nối mapping, xem đủ 10 màn bằng `npm run dev` ở 640×360 và cửa sổ FIT; kiểm tra thứ tự che khuất, chân/hitbox, tia/bóng bám đúng vật thể và thao tác đổi state/reload checkpoint. Các đạo cụ P0 không âm thầm trở về bản Canvas thiếu chi tiết. Sau thay đổi runtime mới chạy kiểm tra/build phù hợp project; đợt tài liệu hiện tại không cần build/test.

Ảnh trên contact sheet đạt kỹ thuật chỉ là điều kiện bàn giao, không thay cho preview trong engine. Nếu cảnh runtime chưa có đường render cho trạng thái theo kịch bản, ghi rõ preview đó `NOT_RUN`/bị phụ thuộc tích hợp; không gán `PASS` nhờ mockup.

## Rủi ro và quyết định còn mở

| Điểm cần xử lý | Ảnh hưởng | Cách xử lý trong kế hoạch |
| --- | --- | --- |
| Atlas khác tỷ lệ/không có lưới cắt chuẩn | Sprite nhỏ không đọc rõ hoặc nối nền lộ mép | Cắt thử ít mẫu trong A/B; chỉ xuất phần đủ tốt, dựng lại phần hỏng |
| Campaign mới khác kịch bản và có chỉnh sửa đồng thời | Đẹp trên mockup nhưng sai chỗ trong game | Đọc lại source/navigation trước khóa layout và trước tích hợp; không tự sửa kịch bản để khớp placeholder |
| Bộ Nhinh mới chưa có đủ lit/unlit khi di chuyển | Hình đèn/nhân vật không khớp state cảnh | Dùng mẫu hiện có để so tỷ lệ, ghi nhu cầu bổ sung riêng; tránh tự tạo lại cả 128 frame |
| Rễ, bóng và ánh sáng bị gộp vào nền | Không đổi được state theo puzzle | Tách lớp cần biến đổi, giữ đường tia/bóng động trong engine nếu phù hợp |
| Source có sẵn vẫn là concept hoặc Canvas dự phòng | Đếm nhầm tài nguyên hoàn chỉnh | Danh mục ghi rõ nguồn và mức sẵn sàng; reviewer xem preview thật |

Các điểm chưa chốt chỉ ảnh hưởng sản xuất tương ứng: kích thước lưới/crop sau cắt thử; frame count cho hoạt ảnh môi trường; mức dùng engine thay PNG cho tia/bóng; bố cục ba phòng theo navigation thực tế; mức dựng sprite so với panel minh họa cho ký ức/montage. Đề xuất mặc định dùng module và lớp phủ ít nhất đủ đọc cảnh, giữ nội dung kịch bản. Không cần mỗi màn có bộ cây, đá hoặc ảnh nền độc quyền.

## Trạng thái xác nhận của đợt lập kế hoạch

- Đã đọc và đối chiếu các nguồn liệt kê; đã xác nhận hai đường dẫn `tasks/plan.md`/`tasks/todo.md` chưa tồn tại trước khi ghi.
- Chỉ thêm tài liệu kế hoạch và checklist. Chưa sản xuất ảnh, chưa sửa runtime.
- Kiểm tra hình ảnh/in-engine/build cho bộ đồ họa mới: **NOT_RUN** vì bộ này chưa được sản xuất. Không có kết quả PASS về chất lượng đồ họa game trong đợt lập kế hoạch.

Checklist thực hiện: [todo.md](todo.md).
