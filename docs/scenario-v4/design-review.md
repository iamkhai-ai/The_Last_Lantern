# V4 — Ghi nhận rà soát thiết kế

Ngày: **2026-10-24**. Phạm vi là tài liệu truyện, prologue và 10 màn, không phải một bản game V4 đã dựng.

**Lưu ý phiên bản:** các mục từ “Nguồn và phân công” tới bảng hash đầu tiên dưới đây là hồ sơ lượt biên soạn trước đợt chỉnh ánh sáng/Pulse. Những PASS đó chỉ áp dụng bản đã đọc lúc ấy; không chứng nhận bản đang sửa hoặc runtime hiện tại. Bằng chứng mới nằm ở mục “Đợt chỉnh ánh sáng và Pulse” cuối tài liệu.

## Nguồn và phân công

- Đã đọc hướng V2, các màn hiện có và `RULE_GAMES.md`. Mốc nhánh tham khảo đã đọc là `origin/test-develop` tại `3e9c12fabff160f1d7919db97ac24ec3130a066b`; không coi đó là HEAD của working tree đang mở.
- Bài toán xuất phát từ phản hồi người dùng cung cấp về demo 01–04: quá dễ và chưa đủ chiều sâu truyện. Chưa có bản ghi lượt chơi hoặc số liệu định lượng.
- Luna lưu bản biên soạn cốt truyện/phần 2, sau đó đọc riêng các luật, lời giải và phục hồi do root viết. Root đối chiếu nhận xét với tài liệu và sửa. Đây là lượt rà tài liệu có phân công, không phải hai lượt review code độc lập.
- Model/effort đã yêu cầu là `gpt-6-luna` / `xhigh`, dispatch được chấp nhận; công cụ không công bố danh tính resolved. Chỉ dẫn đọc không phải sandbox kỹ thuật.
- Các thay đổi trong công việc này nằm ở `docs/scenario-v4/`. Working tree có các thay đổi code/art từ trước; chúng không phải sản phẩm của đợt viết kịch bản này.

## Những điểm đã sửa qua rà soát

| Vấn đề | Quyết định trong bản hiện tại |
| --- | --- |
| Một đèn nhỏ dễ bị hiểu là nguồn đủ cho cả bến | Tách mạch thử/điều khiển khỏi ống năng lượng chính; nguồn cố định vẫn sáng khi F tắt. |
| M02 dễ trở thành thao tác theo chuỗi được kể sẵn | Bốn vành, ba tay quay có trục chung. Từ đầu `(0,0,0,0)`, X×2, Z×2, Y×1 đạt `(2,0,0,2)`. Miệng kênh cho biết đích; người chơi suy ra tác động. Nhận xét cho bản ba vành trước đó không được dùng thay cho bản này. |
| M04 thiếu đoạn di chuyển từ Đông về các tay điều khiển trên đảo | Lời giải ghi đủ lượt Đông → đảo → Đông trước khi thử T và chuyến về Tây lấy đèn rồi trở lại Đông. |
| M04 lẫn điều kiện thử T với việc giữ đường để thu đèn | T chỉ cần nguồn và van hồi thông. A có thể gài sau lần thử; phải giữ A độc lập với nguồn để mang đèn từ Tây sang Đông. Lấy đèn sớm ở Tây vẫn đặt lại được. |
| M04 biến thử tải thành lỗi bắt buộc gây hại | Báo trước tác dụng, có van dừng, máy tự trả tải thấp; dừng sớm vẫn nhận kết quả. Không dùng phản xạ hoặc để Lumo chịu lâu làm điều kiện thắng. |
| M05 nút gọi ở phía gần có thể bỏ qua vai trò chốt rời | Cần hồi từng cửa chỉ ở phía xa tương ứng. B có chốt cố định ở R2; một chốt rời chuyển từ A sang C. C giữ khớp ống thật để D có thể mở. |
| M06 chia nguồn có nguy cơ bị đọc thành xuất liên tục cả đêm | Bốn phần là ngân sách trong nhịp cấp ban ngày; bến tích phần nhận và giảm nhu cầu. Bàn giao với mẹ là phối hợp thật, không phải đọc đủ thoại. |
| M07 có thể thành vòng phụ thuộc nước–cầu–van | Rễ cầu đã nhận nước sau 06. Van bên Đông chỉ cấp nhánh ươm còn khô. |
| M08 lấy đèn đi không tắt được nguồn trắng cũ | Sau xác nhận, tượng được giữ mặt rộng bằng cơ khí, tiếp tục che cây khi Shadow rời đi. |
| M09 rễ dễ bị hiểu là đổi luật so với 07 | Phân biệt rễ sống và khung nâng cần nguồn gián tiếp; chỉ báo riêng nguồn/bóng. Đường vòng O–P mở được trước khi thu tinh thể hoặc gọi Lumo về. |
| M10 sơ đồ ba nhánh chưa chỉ đủ bộ chia | G0 trái qua G1 tới vàng; G0 phải qua một khung chia cố định thứ hai tới hai Nhật. Nguyệt ở dưới nguồn trắng cố định được tượng che. Art ghi rõ hai vật chia riêng. |
| M10 F dễ bị hiểu là chiếc đèn nhỏ điều khiển mặt trời | E tháo chặn và cam kết chu kỳ mới. F ngừng mạch thử và mở nhịp kết. Thanh trung tâm nối cơ khí tới cửa chắn nguồn trắng; Lumo/đèn rời đi không hủy hệ đã tự giữ. |
| Shadow phai có thể bị hiểu thành một cái chết mới | Cảnh thể hiện ý thức được giải phóng khỏi ca trực; hồ sơ và trách nhiệm vẫn còn. Không tự thêm thân xác trở lại. |

## Kết quả và giới hạn

| Việc xem xét | Trạng thái | Phạm vi bằng chứng |
| --- | --- | --- |
| Lưu nguyên văn cốt truyện và đề xuất mở đầu | **PASS** | Root lấy hai `agentMessage.text` từ đúng thread bằng `read_thread` và so sánh phần sau dấu phân cách trong hai file lưu trữ: khớp toàn bộ, chỉ thêm một newline cuối file. Phần nguồn gốc nằm ngoài nội dung trích. |
| Đọc, đối chiếu điều kiện với đường giải mẫu và đường phục hồi được mô tả | **PASS trong phạm vi đường mẫu** | Root đọc luật và lần theo các thao tác; Luna đọc riêng và nêu các điểm mơ hồ đã được sửa như trên. Không phải duyệt hết không gian trạng thái. |
| Đối chiếu phép quay M02 | **PASS** | Tính tay: `(0,0,0,0)` → X×2 `(2,2,0,0)` → Z×2 `(2,2,2,2)` → Y×1 `(2,0,0,2)`. |
| Đối chiếu phép quay cặp gương M08 | **PASS** | Tính tay: `(0,2)` cộng hai bước modulo 3 cho `(2,1)`. Chưa chứng minh hình học tia của một phòng đã dựng. |
| Kiểm tra bằng mô hình trạng thái hoặc test tự động V4 | **NOT_RUN** | Chưa có mô hình thực thi V4; không tái dùng PASS của V2. |
| Build, chạy game, kiểm tia/collider/tầm tương tác, save/reload | **NOT_RUN** | Công việc hiện tại chỉ viết tài liệu. |
| Chơi thử với người mới, đo thời gian, độ khó và cảm xúc | **NOT_RUN** | Các khoảng phút là mục tiêu quy mô, chưa phải kết quả đo. |

Không kết luận “không thể kẹt ở mọi trạng thái” từ một lời giải hợp lệ. Cần giữ phân biệt này khi dùng tài liệu để triển khai.

Luna đã đọc lại các sửa cuối ở 04 (vị trí điều khiển, lượt qua lại và thu đèn), 10 (bộ chia, cửa chắn nguồn trắng), bảng art và mô tả 02 trong mục lục; không nêu mâu thuẫn mới trong các đoạn đó. Root giữ các giới hạn runtime/playtest ở trên.

## Những việc cần xác nhận ở bản dựng sau

1. Người chơi nhìn ra quan hệ trục chung ở 02, đường điều khiển từ xa ở 04 và chốt rời ở 05; độ khó không đến từ vật quá nhỏ hoặc đầu nối không thấy được.
2. Tia, vùng bóng, cửa chắn và đường chân người thực sự khớp bố cục. Đặc biệt kiểm 08–10 và điều kiện có nguồn khi cửa đang mở ở 09.
3. Phục hồi sau F, lấy đèn sớm, gọi Lumo về, đổi chốt hoặc tải save giữa chừng; kiểm cả trạng thái chưa đạt mục tiêu và sau cam kết.
4. Demo 01–04 tạo được giả thuyết, phát hiện và kết quả cảm xúc; không chỉ kéo dài thời gian đi bộ. Gợi ý H cần phản ứng đúng cấu hình hiện tại.
5. Cảnh yên tĩnh 07 và kết 10 có đủ khoảng thở; phần 1 tự kết thúc trọn vẹn dù phần 2 chưa được làm.

Nếu đổi luật, bố cục hoặc điều kiện, phải đọc lại các lời giải và đường phục hồi liên quan. Dấu vân tay tài liệu ở cuối chỉ định bản được root chốt cho lượt đọc này, không chứng nhận runtime hoặc phê duyệt sản xuất.


## Bản tài liệu tại lúc chốt lượt đọc

Đã liệt kê **19 file Markdown** và kiểm tra các liên kết Markdown tới file: **PASS**, không có đích file bị thiếu. Đây là kiểm tra tài liệu, không phải test game. SHA-256 dưới đây lấy trực tiếp từ file; không bao gồm chính bản ghi rà soát này.

| File | SHA-256 |
| --- | --- |
| 00-original-prologue-verbatim.md | `d8a260a1318aa6fc297d22a0ef5d5b2f3cb82676fc572dd00b5dcb45f4520269` |
| 00-original-story-verbatim.md | `61c20514b3333640e8616a8cfcefb85d76afc571a3bb1f48caa5b863d1234109` |
| 00-prologue.md | `4647da5287671d08f5dcdd40e4b127b432f9429d4a6add7c6a5a64c520f1c033` |
| 00-story-bible.md | `921a6c88f30ae8aecd7d71a8d9309531bbd5f7c0bc3f27ec09b39d91f7d04da9` |
| 01-forgotten-forest-edge.md | `c6726829030eea17834c26c494376d6bd7259b0c9367f37a6b0d28aa1afb3494` |
| 02-whispering-woods.md | `89a0d7c47eb9d881bd970f6a8bfa58eef2281922d57a14bb1ed9dca925bb2b5c` |
| 03-library-beneath-the-roots.md | `e336520577e9fc6be1608c4552a57b4de4dfe498d11176d3117bdd743cf6aaec` |
| 04-shattered-moonlit-creek.md | `49066f02304cbc3d3e85fded315d2322ea7826b6ee06ecba18c074a2dab2a730` |
| 05-a-path-for-two.md | `0713e3c99abd1de29dbcfdd58fb76b4d63bf947c869db9041175d18cc4f93336` |
| 06-the-sleepless-tower.md | `266ec3c14d74f62a82909a87e3e2ee0e335ec655116bbbfe45824ab24b7e7fe6` |
| 07-the-sleeping-garden.md | `cbb7da7899ba69ed5e3623d06a3595e1db0f13c2514dea77b83992b09d6b7fe3` |
| 08-ruins-of-two-halves.md | `1e1f3caaf1bfef82c94a507d45a49af4477736d2df3e5ad175eab901fa38ef2d` |
| 09-dark-moon-observatory.md | `45cae2dc940700d583890bb3a1c95de236fc6d8e1ab969a756bd96172948a785` |
| 10-the-heart-of-elaria.md | `31ad08f7b304e69e15a086942d32a7311ac292d8ce967aa22382d8c65b97cb84` |
| art-and-production.md | `411f6e2804f8a1ab7cf7a0a24d38607be43d81185e0e71a785a5f71531a43690` |
| phase-2-outline.md | `920be54aa7effd03bf21c852b9e61743cb21f600300b279b47c4cc9ed8bfd07b` |
| puzzle-contracts.md | `b59b1f11b75e6d49ed5b48452370d55e2337072b84f1181989e565f916d8fe26` |
| README.md | `dc29af7199cf5d211d4fea84eaf2fcc33260be85648c592a96c951d19ca6d5b6` |


## Đợt chỉnh ánh sáng và Pulse — 2026-10-24

### Phạm vi và bản được đọc

Đợt này thực hiện yêu cầu đã duyệt về vai trò của F/Pulse trong kịch bản. Nhánh làm việc là `feat/v4-foundation`, HEAD nền `515e723c12ce587fe1ef7e7da53193f786530053`; các bản sửa là working diff, chưa commit hoặc push. Phạm vi gồm 10 màn, `puzzle-contracts.md`, `art-and-production.md`, `README.md` và bản ghi này. Không sửa runtime, art, nhiên liệu, prologue, cốt truyện biên soạn hoặc phần 2.

Luna implementer được yêu cầu `gpt-6-luna` / `xhigh`; Luna reviewer riêng được yêu cầu `gpt-6-luna` / `high`. Các cặp này có trong danh sách công cụ Codex và dispatch được chấp nhận. Công cụ chỉ trả tên task, không trả model/effort resolved: **unknown**. Reviewer nhận chỉ dẫn chỉ đọc; không có bằng chứng sandbox kỹ thuật. Root rà đường mẫu và chỉnh các câu mâu thuẫn trước khi đóng băng 13 tài liệu nội dung cho lượt đọc độc lập.

### Các quyết định và lỗi đã sửa trong lượt viết

| Điểm cần làm rõ | Quyết định trong bản sửa |
| --- | --- |
| F có thể thành công tắc tối toàn phòng | Ánh nền luôn đủ nhìn đường; vùng nguồn cầm/đặt/cố định được khai báo riêng. Dấu tối phụ thuộc ánh sáng thật tại dấu. |
| Pulse trùng thông tin với tối hoặc trở thành bước bắt buộc | Pulse đọc liên kết tĩnh, chỉ khi cầm đèn bật; J giữ dấu đã phát hiện. M02 dành hướng đầu nhận cho lớp tối; không kiểm cờ quét để cho giải. |
| M01 nhặt đèn sai phía hoặc dùng ánh cầm vượt ổ kín | Nhặt S1 là đang ở sân vào; có thể đặt lại ngay. A/B chỉ nhận qua đúng bệ hoặc được chốt giữ. |
| M05 lắp lại K khi cửa đã đóng | Dùng mốc/tay hồi mở cửa trước khi lắp lại; có thể tháo từ nền an toàn rồi đi tiếp qua D đã giữ. Không thêm bệ đèn. |
| M07 nguồn W vô tình thay toàn bộ vai trò F | W chỉ phủ luống cầu/ươm. Hoa A cần đèn cầm; chốt giữ cửa sau khi ánh rời hoa. Luống đầu cầu nằm trong vệt khi tiến vào, nên cần để tối trước khi bắt đầu qua. |
| M08 có pha tối nhưng chưa có thao tác đặt lại nguồn | Qua rễ tới tay R/Z/tượng ở Đông, mở lối đá hồi; trở về Nam, E đặt đèn S rồi bật. D0/D1 là hai khớp chia thật; Z là nguồn chuẩn cho cặp gương. |
| M09 chỉnh G0 từ sai phòng hoặc thu đèn từ xa | Khảo sát tối tại H; đi H–P qua A đã chốt để chỉnh G0 rồi trở lại H. Vòng chỉ mở từ O; phải đi bộ về S lấy đèn và đoàn tụ Lumo trước bản ghi. |
| M10 thiếu dấu tự giữ hoặc đèn/Lumo xuất hiện qua cắt cảnh | Đai và chỉ báo chính xác nhận tự giữ ngay sau E. F, thu đèn và gọi Lumo đổi thứ tự được; cảnh chuyển thể hiện việc lấy đèn/gọi Lumo thực tế trước khi rời. |

### Kiểm tra áp dụng cho đợt này

| Kiểm tra | Trạng thái | Phạm vi bằng chứng |
| --- | --- | --- |
| `git -c core.safecrlf=false diff --check -- docs/scenario-v4` | **PASS** | Lệnh root chạy trên bản nội dung đóng băng, không có lỗi whitespace. |
| Liên kết file trong tài liệu biên soạn | **PASS** | Kiểm 17 Markdown ngoài hai bản nguyên văn: 19 liên kết tới file, không thiếu đích. |
| Liên kết trong hai bản nguyên văn | **FAIL — tồn tại từ trước** | Liên kết tuyệt đối tới `docs/scenario-v3/README.md` trong `00-original-story-verbatim.md` không có đích trong checkout này. Bản nguyên văn được giữ nguyên; lỗi không nằm trong nội dung sửa. |
| Giữ nguyên truyện, mở đầu, phần 2 và hồ sơ gốc | **PASS** | SHA-256 của hai file nguyên văn, `00-story-bible.md`, `00-prologue.md`, `phase-2-outline.md` khớp giá trị root đọc đầu đợt. |
| Đọc độc lập bản sửa | **PASS trong phạm vi đọc** | Task `review_v4_lighting` đọc riêng 13 file sửa, không nêu finding cụ thể. Reviewer báo đã đối chiếu hash đầu/cuối; root kiểm lại toàn bộ hash nội dung trước khi chốt. Đây không phải hai lượt review code độc lập và không chứng nhận mọi trạng thái. |
| Build/test runtime, kiểm collider/tia/save, playtest và đo độ khó | **NOT_RUN** | Công việc chỉ sửa tài liệu. Đường mẫu và review không chứng minh mọi trạng thái hay chất lượng trải nghiệm thực tế. |

### Dấu vân tay bản nội dung đóng băng

Bảng này lấy trực tiếp từ working files, không gồm chính `design-review.md`. Các bảng/kết quả ở phần lịch sử phía trên không thay thế bằng chứng của bản này. Nếu sửa nội dung sau lượt đọc, cập nhật hash và đọc lại phần liên quan.

| File | SHA-256 |
| --- | --- |
| 00-original-prologue-verbatim.md | `b93039c88505fae187be470f04f08d1c71c46fc110d71f7dd6d122761c934d32` |
| 00-original-story-verbatim.md | `8dedad8060472f697991c2dfd01a551d0d6051413ee6686696a02683877dc150` |
| 00-prologue.md | `316a0a9c7b3104036290452aa91cce17349851270fab845c170ec6c57220b913` |
| 00-story-bible.md | `8a4989738a045ee950aa70524deda14da1ea8adcebfe5068690747e12f9741d8` |
| 01-forgotten-forest-edge.md | `e88add8ada9cb7af72b914568bf500d1bf393aa21ff502b9dcbed44f6f1f88dc` |
| 02-whispering-woods.md | `5aeb3d1740353d03f4fdc68d9eb74aa8fb72a1047cca8ab86fe0ff71a01c4968` |
| 03-library-beneath-the-roots.md | `04461f1ec8ed5006df5dc7f773d671d2cb633181741d0658eef3be62b193a478` |
| 04-shattered-moonlit-creek.md | `3b7de69e785a3a0b789ff232f0b7241f5e8f09a4f343e16a31b8e4e00062cd96` |
| 05-a-path-for-two.md | `f278c72eb39065d208f2e2a5115dd5ac17b04648590e071c05984e97c59d4135` |
| 06-the-sleepless-tower.md | `74b13614aebcee6539352c2636e678192fb24a430bf1f07e822a3943f6734fd8` |
| 07-the-sleeping-garden.md | `8ca13fbd404a2bd9a96e6231796004cbe7dedc1e2cea7b6c14bab2f1057a66ad` |
| 08-ruins-of-two-halves.md | `e349f0b7f6ddc4aa98e49de65f525c0305437bf2699aff00479d7f923feec47e` |
| 09-dark-moon-observatory.md | `db3b84bea7b6b94f32eac2207d0b91532d87a077e18f5eef35854c00a5dc3620` |
| 10-the-heart-of-elaria.md | `1ec5e35edd44224e57380495d6bb88053809c2aaaf51d05ec03da74d1087d354` |
| art-and-production.md | `f1330e0da0ee8d076b9575d85be44636b257fafb1a344a8067fbd9fd24d633e7` |
| phase-2-outline.md | `0ba5a207d77096eb801c68512d7798a834ba5f2250bd95ab3539b5b92c4fffb5` |
| puzzle-contracts.md | `de271a9f05b334b8f93cf131733b5785dbac25e8d7e6f0cfd3e765496a1fbb75` |
| README.md | `a0d971660688b6d4ae3270fca3017e87a2f3a406a70da750e6a1b8204b8e6856` |

## Đợt chốt quy ước đèn — 2026-10-24

Nền: `feat/v4-foundation` tại `3fb28d8`. Đợt này chốt các điểm mà đợt ánh sáng/Pulse để ngỏ, để có thể dựng chung cho mọi màn. Không đổi luật, lời giải hay cốt truyện của màn nào.

| Điểm còn ngỏ | Quyết định |
| --- | --- |
| Vệt đèn cầm tay rộng bao nhiêu, theo hướng nào | Hình thang 56px, gốc 12px, đầu xa 32px, theo 8 hướng quay của Nhinh; quầng 12px quanh đèn. Tường và cửa đóng chắn vệt. Rìa vẽ khớp footprint; không có quầng trang trí lớn hơn. |
| Đèn trên bệ có footprint không | Chỉ quầng 12px cộng nhánh tràn màn khai báo; đầu nối kín không chiếu. |
| F có làm tối/sáng cả màn không | Không. Ánh nền mỗi phòng cố định; F chỉ thêm/bớt footprint. |
| Đèn cầm tay kích được cảm biến nào | Chỉ mặt nhận hở (hoa, luống rễ, lá cảm biến); ổ kín chỉ nhận qua bệ và mạng đã vẽ. |
| Dấu “đọc được” và “đã thấy” | Dấu sáng cần footprint chồng lên; dấu tối cần không footprint nào. Đã thấy = đọc được và chân Nhinh trong 64px, cùng phòng; chỉ để J xem lại. |
| Trạng thái F khi vào màn (05/07 ghi tắt, 10 ghi mang theo) | F đi theo người chơi qua lối ra; “trạng thái đầu” của màn là mặc định khi không có trạng thái mang theo. Điểm vào và checkpoint phải hợp lệ với cả hai trạng thái F. Đã sửa câu ở 05, 07, 08 cho khớp. |
| Lỗi chữ | Tách số dính chữ ở 06 và 10; HUD màn 08 đổi “vùng ươm” thành “vạt cây” cho khớp nội dung màn. |

Các số 56/12/32/64px là giá trị khởi điểm, chỉnh một lần ở phòng thử cho mọi màn. Chưa build, chưa playtest; bảng kiểm script cho chỗ đứng rọi mặt nhận hở là việc của bản dựng.

Dấu vân tay các file sửa trong đợt này (file khác giữ hash của bảng trước):

| File | SHA-256 |
| --- | --- |
| puzzle-contracts.md | `6bd2c738f894e795a6aea43e4b749016eec89f010874c68c818c43ea1150bf17` |
| 05-a-path-for-two.md | `2cdfbe75beb507da9b4906f29d57944acaafb95319567852ec7cd3aab475fbca` |
| 06-the-sleepless-tower.md | `a97895b300059088dfc541b42a865d752129cc682e7fb2a8ffa28cd20777f850` |
| 07-the-sleeping-garden.md | `0a8354605db5b4572616769dab4b7590871bd6576d1b7922b1cafe40a2775814` |
| 08-ruins-of-two-halves.md | `8ac133adf5209adf0767593026bfce1a39be0926073d6b5619a0b1b9a4bad891` |
| 10-the-heart-of-elaria.md | `cedad31f7e7051120636cdd301aaf2f72d7cc688e26a1009240f4a73a613a399` |
