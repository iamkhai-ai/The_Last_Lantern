# V4 — Ghi nhận rà soát thiết kế

Ngày: **2026-10-24**. Phạm vi là tài liệu truyện, prologue và 10 màn, không phải một bản game V4 đã dựng.

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

