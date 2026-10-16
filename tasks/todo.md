# Checklist sản xuất đồ họa 10 màn

Nguồn phạm vi, danh mục từng màn và tiêu chí: [plan.md](plan.md). Theo chỉ đạo trực tiếp của người dùng ngày 16/10/2026, tiếp tục tuần tự đến hết phạm vi, không dừng ở các điểm chờ duyệt. Điều này cho phép triển khai, không đồng nghĩa người dùng đã xác nhận chất lượng từng ảnh. Tiến độ: mục 01–15 hoàn tất; mục 16 hoàn tất; mục 17 tích hợp/preview trong engine còn tiếp tục.

Các đợt sản xuất tiếp theo dùng `gpt-6.1-sol` với reasoning `low` (“Light”) theo chỉ đạo mới nhất của người dùng. Lưu cấu hình thực tế nếu runtime cung cấp; khi lỗi model/effort thì báo đúng lỗi, không đổi ngầm. Không thay kịch bản đã duyệt.

Mỗi mục nhóm tài nguyên bên dưới được tách thành lô nhỏ sau khi chốt danh mục: thường 1–3 đạo cụ hoặc tối đa khoảng 5 file xuất trong một lượt kiểm tra. Đạo cụ nhiều state có thể trải qua nhiều lô. Chỉ định một người sở hữu mỗi thư mục/lô; thư mục shared và mapping do điều phối quản lý.

## 01 — Chốt nguồn và danh mục

- [x] Đọc lại revision/source và thiết kế navigation màn 09; ghi working tree liên quan trước khi khóa bố cục.
- [x] Phân loại từng asset: PNG dùng lại, atlas cần cắt/sửa, Canvas dự phòng giữ lại hoặc thay, ảnh cần tạo mới. Ghi rõ source path.
- [x] Lập ma trận vật thể/state/màn; kích thước/pivot/key/output dự kiến; đánh dấu P0/P1/P2.

**Phụ thuộc:** kế hoạch được người dùng xem xét. **File dự kiến:** `assets/levels/README.md`, danh mục metadata (chốt định dạng khi thực hiện). **Nghiệm thu/kiểm tra:** đường dẫn nguồn tồn tại, không đếm board thành sprite, không bỏ state chỉ vì source hiện tại còn giản lược. Chốt lượng đầu ra sau phân loại, không ấn định tổng PNG trước.

## 02 — Cắt thử nguồn dùng chung

- [x] Cắt thử nền/đá/tường hoặc cầu từ ba atlas; làm sạch alpha/mép và đưa về tỷ lệ Nhinh.
- [x] Xem nối cạnh texture ở 1×; xác định tile nào dùng trực tiếp, tile nào cần dựng lại.
- [x] Ghi tọa độ crop, canvas và điểm neo cho phần được giữ.

**Phụ thuộc:** 01. **File dự kiến:** lô nhỏ trong `assets/levels/shared/`, metadata tương ứng. **Nghiệm thu/kiểm tra:** xem trên nền sáng/tối và scene 640×360, không viền nền, không lệch góc nhìn. Không sửa ảnh tham chiếu gốc.

## 03 — Pilot màn 02

- [x] Dựng preview ngoại tuyến 640×360 bằng bộ rừng sẵn và Nhinh prototype; bố trí ba bia/cổng trong vùng nhìn.
- [x] Hoàn thiện bộ bia ngủ/lộ bởi Pulse/kích hoạt giữ sáng cho ba biểu tượng; trạng thái ngủ dùng silhouette trống chung.
- [x] Thêm mẩu thơ, trạng thái cổng mở và lớp ký ức; hoàn tất prompt/mapping/contact sheet. Cổng mở mới `sprites/woods_arch_open_passage.png` 128×126 RGBA; giữ cổng đóng nguồn và preview đối chiếu.

**Phụ thuộc:** 01–02. **File:** `assets/levels/02-whispering-woods/`. **Đã tạo bằng GPT-6.1 Sol High** theo chỉ đạo ban đầu; các lô sau chuyển sang `low` theo chỉ đạo mới nhất. **PASS kỹ thuật:** đúng canvas/RGBA/alpha/nội dung cho 12 sprite, preview 640×360; đã xem trực quan bộ mở cổng/ký ức, bật/tắt/Pulse và contact. **Giới hạn:** silhouette cổng mở hơi khác cổng đóng, ký ức còn chi tiết trang phục, không có animation rễ nới dần. **NOT_RUN:** runtime/build, không sửa manifest/code/scenario. Người dùng đã chỉ đạo tiếp tục không dừng chờ duyệt; chưa ghi nhận xác nhận chất lượng pilot.

### Điểm kiểm tra A — Trước sản xuất hàng loạt

- [x] Dùng pilot hiện có làm chuẩn tạm thời theo chỉ đạo tiếp tục của người dùng; chưa xem đây là xác nhận chất lượng.
- [x] Đối chiếu bản pilot ngoại tuyến với tiêu chí 640×360; ghi lỗi/giới hạn và contact sheet. Chưa đạt kiểm tra trong engine.
- [x] Tiếp tục theo danh mục hiện có; ghi lỗi/giới hạn và hiệu chỉnh khi nghiệm thu từng lô.

## 04 — Màn 01 và phần còn lại của bộ rừng

- [x] Làm bia nhận đèn, đèn nhặt, dấu chân/vòng đá và mắt cổng; tái dùng rừng/cổng đã đạt từ 03.
- [x] Xuất các state cần thiết của chữ/dấu chân/mắt/cổng và preview mở cảnh.

**Phụ thuộc:** pilot màn 02 làm chuẩn hình ảnh. **File:** `assets/levels/01-forgotten-forest-edge/`. **PASS:** 8 PNG RGBA/alpha/nội dung, 8 prompt/nguồn, mapping và hash; 5 preview + contact 640×360, đã kiểm tra ngoại tuyến. **Giới hạn:** cổng tái dùng bằng đá thay vì gỗ; mắt Mặt Trời đặt riêng trên trụ để lối đi không bị che; nét nhỏ suy giảm khi thu nearest. **NOT_RUN:** runtime/build/collision/ánh sáng/lưu state.

## 05 — Màn 03: tranh và hốc

- [x] Làm bốn phiến với hai lớp sáng/tối; làm trang sách thử bằng cùng quy tắc hình ảnh.
- [x] Làm hốc trống/có phiến/được chọn, mốc bắt đầu và chiều nối; kiểm tra không lộ đáp án từ lớp đơn.

**Phụ thuộc:** 03. **File:** `assets/levels/03-library-beneath-the-roots/`. **PASS:** 29 sprite RGBA, hai nguồn/tám prompt, preview/contact sáng-tối; file ghép cho Chim/Thuyền lớp sáng và Lá/Hạt lớp tối dùng chung chính xác; bốn cặp còn lại phân biệt; bốn dấu viền đã sửa để đọc ở 1×. **NOT_RUN:** runtime/build, tương tác/đèn/lưu notebook.

## 06 — Màn 03: phòng và tranh thứ năm

- [x] Dựng rễ-giá sách/giếng/vách theo module đã có; làm tranh thứ năm.
- [x] Phối các state giếng/vách/tinh thể và nội dung P0 đã xong ở 05.

**Phụ thuộc:** 05. **File:** `assets/levels/03-library-beneath-the-roots/`. **PASS:** tám PNG phòng, hai nguồn/tám prompt; bốn hốc, tâm xác nhận, điểm bắt đầu và chiều vòng đọc rõ; panel đóng/mở, tinh thể và mural tách lớp; nguồn task05 còn nguyên 41 hash; 3 preview + contacts ở 640×360 đã xem. Mural Người Bảo Vệ vô diện giữ bánh xe dưới sao với vết nứt về Cây Mẹ; vết nứt nhỏ rõ hơn ở phóng đại 2×. **NOT_RUN:** engine/build/interactions/collision/save-state.

### Điểm kiểm tra B — Chặng Ký Ức

- [x] Đủ preview 01–03 và contact sheet state; đánh dấu nguồn tái dùng/tạo mới. (Ảnh phối offline; engine chưa chạy.)
- [x] Xem lại cách phân biệt state đèn/bia/cầu và khả năng đọc hai lớp tranh; ghi giới hạn trong README.

## 07 — Màn 04 và bộ cơ khí dùng chung

- [x] Làm/cắt hai đoạn cầu và bộ chốt tự do/đã giữ; dấu gương 1–2–3, mắt nhận và bệ đủ state.
- [x] Phối hai bờ/đảo/mép nước bằng nguồn sẵn; làm hoa đá thử và phù điêu bão.

**Phụ thuộc:** 02 và bộ rừng đã tạo. **File:** shared mechanisms tại `assets/levels/shared/mechanisms/`, cảnh tại `assets/levels/04-shattered-moonlit-creek/`. **PASS:** 29 export và 10 preview, 39 PNG xác nhận kích thước/alpha/hash; gương 1–2–3, receiver/bridge/latch/source phân biệt; latches riêng có tay nắm; branch B và trạng thái tối đã xem. **NOT_RUN:** runtime/interactions/collision/save-state.

## 08 — Màn 05 và bộ điều khiển Lumo

- [x] Làm mốc gọi/ấn đom đóm/dây nối/ống/cửa với state tương ứng.
- [x] Dựng hành lang mực phát quang và dấu xoắn; tái dùng kiến trúc đá/chốt.

**Phụ thuộc:** 07. **File:** `assets/levels/05-a-path-for-two/`. **PASS:** 20 export (19 module trong suốt + nền), 8 preview/contact; kiểm tra canvas/alpha/hash và xem state gọi, relay đã gài, hành lang sáng/tối. Đang bay khác đã tới; áp lực khác chốt, vạch mực sáng rõ khi đèn tắt và gần mất khi bật. **NOT_RUN:** runtime/collision/interactions/save-state.

## 09 — Màn 06 và bộ chia tia

- [x] Làm lăng kính/bộ chia có nguồn/không nguồn, ba vòng điều tiết và cần Trả dòng.
- [x] Làm buồng máy/tinh thể, cửa sổ/khăn/ngăn bản ghi; phối nước đổi hướng và đèn tháp dịu.

**Phụ thuộc:** 07–08. **File:** `assets/levels/06-the-sleepless-tower/` và `assets/levels/shared/beam-splitter/`. **PASS:** 30 PNG export, 22 asset tái dùng, 14 preview; kiểm tra canvas/alpha/hash/source; thấy rõ từng A/B/C, cùng lúc cả ba, mạch mất khi chờ, cần Trả dòng giữ độc lập; lăng kính và hai cổng ra đã căn. **Giới hạn:** điều khiển sơ đồ, khăn nhỏ, cửa sổ nền có mảng sáng ngày. **NOT_RUN:** engine/raycast/interactions/collision/save.

### Điểm kiểm tra C — Chặng Hy Vọng

- [x] Đủ preview 04–06; đối chiếu ánh sáng/bệ/cầu/chốt/mốc Lumo giữa ba màn. (Ngoại tuyến, chưa engine.)
- [x] Tái dùng cùng bộ chia/mốc/chốt cho màn sau; không tạo các bản cùng chức năng khác hình vô cớ.

## 10 — Màn 07 và bộ cây/rễ

- [x] Làm Hoa Nhật mở/khép, Rễ Nguyệt co/vươn, bộ cầu rễ theo đoạn và mầm trước/sau có lá.
- [x] Làm bể/màn chắn/cống và phối đường nước/lối đá/chốt.

**Phụ thuộc:** 07, 09. **File:** shared at `assets/levels/shared/garden-mechanisms/`, scene `assets/levels/07-the-sleeping-garden/`. **PASS:** 31 export, seven reused refs, eight 640×360 studies + native/2× contacts; state/alpha/hash verified; Sun Flower and Moon Root differ in silhouette/mark, root bridge has held/missing/deployed spans; one new leaf. Lumo comparison confirms plant states are identical with/without his light. **NOT_RUN:** runtime/interactions/collision/save.

## 11 — Màn 08: tượng và bóng

- [x] Làm tượng bốn nấc, mặt rộng/hẹp, vùng bóng khớp; bệ thử dùng thiết kế đơn giản tương ứng.
- [x] Phối hai Nhật/một Nguyệt, bệ xác nhận/màn che/cửa; dùng lại bộ chia và gương.

**Phụ thuộc:** 09–10. **File:** `assets/levels/08-ruins-of-two-halves/`. **PASS:** 29 export, 9 reuse, 8 state studies + contact; hình học xác nhận chỉ nấc mặt rộng đúng che kín Nguyệt mà không chặn hai nhánh Nhật; state live và state bệ/cửa đã kiểm tra. The Shadow để dành task 12. **NOT_RUN:** runtime/raycast/interactions/save.

## 12 — The Shadow và hình ký ức

- [x] Tạo mẫu The Shadow bám phong cách project với tư thế chờ/che cây/di chuyển cần thiết; chốt kiểu hiện trong ký ức Người Bảo Vệ.
- [x] Làm các lớp ký ức cho 08–09 và phần tan ở 10 dựa trên cùng một thiết kế.

**Phụ thuộc:** pilot, bố cục 08. **File:** `assets/levels/shared/characters/the-shadow/`. **PASS:** 26 PNG, ba nguồn/tám pose/state and ten preview, RGBA/canvas/hash; Shadow che mầm, Guardian và Shadow cùng anchor, khăn đỏ lấy đúng crop, M09 vẫn giữ Shadow sau ký ức, M10 tách 5 frame bình minh. **Giới hạn:** pose chưa đủ animation, contour vai Guardian/Shadow lệch nhẹ; cảnh đài là montage, không phải navigation. **NOT_RUN:** runtime/depth/animation/light.

## 13 — Màn 09: ba phòng và bản ghi

- [x] Chốt sơ đồ ba phòng theo kịch bản/navigation, làm bánh xe/bản đồ sao/bàn ghi; tái dùng đủ bộ cơ chế.
- [x] Xuất preview cửa A, theo Lumo, G2 thẳng/qua khung, cầu rễ/lối vòng, bản ghi và khôi phục state.

**Phụ thuộc:** 08–12 và navigation đối chiếu. **File:** `assets/levels/09-dark-moon-observatory/`. **PASS:** 6 module, 31 asset tái dùng, 30 phòng preview 640×360, 10 panorama và 3 contact; paths/hashes/state verified. Đường quay về, door brace và cầu rễ tách rõ; mapping 3 mốc restore. **Giới hạn:** source navigation đặt G2/statue/splitter khác kịch bản; art theo kịch bản, chênh được ghi trong README. **NOT_RUN:** engine/raycast/collision/save/browser/build.

### Điểm kiểm tra D — Chặng Cân Bằng

- [x] Đủ preview 07–09; cây/rễ/bóng/khóa dùng chung ngôn ngữ; preview ngoại tuyến.
- [x] Đối chiếu ba phòng với kịch bản; ghi lệch navigation và các phụ thuộc engine, không báo PASS runtime.

## 14 — Màn 10: Cây Mẹ và ba nhánh

- [x] Hoàn thiện thân/canopy theo state, ba hốc/nhánh rễ và lõi; giữ bảng màu/biểu tượng tinh thể hiện có.
- [x] Phối trạng thái tự giữ/quá tải/đèn tắt/đêm/bình minh; tái dùng mốc Lumo, gương, bộ chia, tượng/khóa.

**Phụ thuộc:** 09–13. **File:** `assets/levels/10-the-heart-of-elaria/`. **PASS:** 34 export, 35 reuse, 26 preview/contact; state conjunction, persistence, overload, tắt đèn và đêm đã kiểm tra; không ép overload khi đèn tắt. **Giới hạn:** thân/canopy là scenic patch, đường tia là sơ đồ; xem README. **NOT_RUN:** runtime/build/interaction/save.

## 15 — Đoạn kết và montage

- [x] Tái dùng cảnh vườn/suối/tháp/đài với ánh bình minh; làm pose ngồi riêng, đèn tắt và lá mắc trên quai; giữ Shadow tan theo nhịp bình minh.
- [x] Phối cảnh cuối có Lumo/đèn tắt và đường mòn ban ngày; không vẽ lại tài nguyên đã đạt.

**Phụ thuộc:** 12, 14. **File:** `assets/levels/10-the-heart-of-elaria/README-task15.md`. **PASS:** 6 export, 12 scene preview, contact native/2×; Nhinh ngồi bên rễ, Lumo riêng, đèn tắt/lá trên quai, Shadow chỉ tan trong chuỗi bình minh, đường mòn ban ngày và tựa `THE LAST DAWN`; số phận cô bé để ngỏ. **Giới hạn:** montage dùng cảnh đã có, overlay bình minh và địa hình đường mòn sơ đồ; pose mang đèn là keyframe. **NOT_RUN:** engine/animation/dialogue/save.

## 16 — Kiểm tra và bàn giao tài nguyên

- [x] Kiểm tra PNG/alpha/tên/canvas/pivot/hash/đường dẫn và source references; ghi sentinel rỗng có chủ ý và nhóm pixel lặp.
- [x] Đối chiếu kích cỡ 177 ảnh preview; tách scene 640×360, pano Observatory 1920×360 và contact sheet 1×/2×; rà soát visual evidence mỗi lô trong README/validation.
- [x] Bàn giao mapping file–key–state–màn, nguồn/reuse, provenance/prompt và giới hạn hiện còn trong handoff.

**Phụ thuộc:** mọi lô P0/P1. **File:** [asset-handoff.md](../assets/levels/asset-handoff.md), [asset-handoff.json](../assets/levels/asset-handoff.json), [character validation](../assets/character/validation.json). **PASS:** 15 asset maps, 268 PNG output duy nhất, 128 frame Nhinh (36×42 RGBA), 128 reuse references và 177 preview; 0 lỗi path/dimension/hash/pivot; 2 alpha rỗng có chủ ý và 8 nhóm pixel trùng đều được ghi lý do. Đã xem contact 8×16 frame. **Giới hạn:** frame Nhinh là prototype, procedural P2/runtime còn theo từng README; bản preview không thay thế render trong engine.

## 17 — Preview trong engine sau tích hợp

- [x] Đọc source cuối và chọn cách nối asset runtime. Các PNG mới nằm ngoài `src/assets/` nên được ánh xạ trong `src/art/CampaignArt.ts` thay vì chép/nhân đôi hoặc sửa manifest key cũ.
- [x] Nối các frame Nhinh, asset trạng thái câu đố được chọn và nền sạch cho các phòng phù hợp vào loader/scene. Không dùng ảnh nền Observatory có dải ghi chú/debug.
- [ ] Chạy `npm run dev`, xem đủ 10 màn ở độ phân giải gốc và Scale.FIT; kiểm tra depth/hitbox/tia/bóng/HUD và checkpoint liên quan. **PASS:** menu tải được trên localhost cô lập; **NOT_RUN:** kiểm tra hình ảnh đủ 10 màn và từng state mới. Người dùng tự chơi trọn câu đố/ending.
- [x] Chạy `npm run build` sau tích hợp trên working tree: **PASS** (TypeScript và Vite build).

**Phụ thuộc:** 16. **File:** `src/art/CampaignArt.ts`, `src/scenes/CampaignScene.ts`, [asset-handoff.md](../assets/levels/asset-handoff.md). **PASS:** build và menu smoke. **NOT_RUN:** render/review trực quan toàn bộ màn và states; người dùng giữ lượt playtest trọn câu đố/ending.

### Điểm kiểm tra E — Hoàn tất phạm vi đồ họa

- [ ] P0/P1 của 10 màn đã có tài nguyên hoặc quyết định tái dùng có preview đạt; P2 được ghi rõ hoàn tất hay để sau.
- [ ] Preview trong engine có bằng chứng gắn revision; ghi riêng `PASS`, `FAIL`, `NOT_RUN`, không dùng nhận xét agent thay cho kiểm tra.
- [ ] Người dùng xem bộ cảnh và các giới hạn còn lại; hoàn tất bàn giao tài nguyên, không suy ra quyền merge/release/deploy.
