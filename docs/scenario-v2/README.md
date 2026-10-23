# Kịch bản v2 — Màn 05–10

**Trạng thái:** sáu hướng chỉnh sửa trong đợt góp ý đã được duyệt, và cả sáu màn 05–10 đã triển khai theo v2 trên nhánh `integrate/scenario-v2-05-10` (2026-10-23): 08 và 09 có từ trước trên `test-develop`, 05, 06, 07 và 10 mỗi màn một commit. Với các màn này, bản v2 là nguồn chuẩn; `scripts/check-*.mjs` của từng màn và thang H dự phòng trong `check-campaign-levels` đọc từ đây (riêng 08 vẫn đọc bản gốc vì thang H không đổi). Bản gốc trong [docs/scenario/](../scenario/) được giữ làm lịch sử. Chưa chơi thử thật; các số đo ở §3 và quy trình chơi thử ở §7 vẫn là việc còn lại. Vạch đếm (06) và bàn tay (07) đang là decal vẽ tạm lúc chạy, chờ art.

| Màn | File | Mức thay đổi |
| --- | --- | --- |
| 05 | [05-a-path-for-two.md](05-a-path-for-two.md) | **Câu đố mới** trên cùng bố cục |
| 06 | [06-the-sleepless-tower.md](06-the-sleepless-tower.md) | Âm thanh, một luật được nói rõ; không đổi câu đố (tranh v2 đang làm) |
| 07 | [07-the-sleeping-garden.md](07-the-sleeping-garden.md) | Bỏ một yêu cầu bằng lời; âm thanh; Lumo dẫn đường |
| 08 | [08-ruins-of-two-halves.md](08-ruins-of-two-halves.md) | Nhịp mới: The Shadow làm mẫu; âm thanh ba khóa |
| 09 | [09-dark-moon-observatory.md](09-dark-moon-observatory.md) | Bản ghi chờ Lumo rời ấn; nhịp ấn nhớ ra Lumo |
| 10 | [10-the-heart-of-elaria.md](10-the-heart-of-elaria.md) | Lumo tự chọn giữ; lớp âm quá tải; dòng kết có điều kiện |

Mô hình kiểm chứng: [puzzle-model.mjs](puzzle-model.mjs) (`node docs/scenario-v2/puzzle-model.mjs`).

## 1. Vì sao viết lại

1. **Màn 5 nhiều bước nhưng chưa buộc người chơi quản lý đường về.** Mốc gọi được dời để chốt cửa có lý do vật lý. Biển ba chấm cần dễ nhận diện lần đầu; đường về ngắn, cửa đã gài dễ đọc, và các lần gọi quen dùng chú thích ngắn cùng tiếng vọng, trong khi các lần khám phá đầu và chuyển động bay thật vẫn được giữ.
2. **Màn 7 cần phân biệt lối phụ hữu ích với lối bắt buộc.** Người chơi có thể qua cầu rễ khi tối, bật đèn ở bờ Tây rồi dùng Pulse để thấy dấu tay. Lối đá phụ vẫn là đường về ổn định khi đèn bật.
3. **Các màn tổng hợp cần nối cơ chế với câu chuyện và phản hồi rõ ràng.** Các bảng cấu hình mô tả ý đồ và phạm vi tìm kiếm, không tự chứng minh độ khó thực tế.
4. **HUD nói hộ thao tác** (ví dụ “Nhấn E ở tay gọi C…”). Bản v2 đề xuất giữ hướng dẫn phím trong phần dạy và để HUD nêu mục tiêu, theo nguyên tắc dự án *“Do not expose spoilers in opening dialogue/HUD”* ([campaign-layout-design.md](../implementation/campaign-layout-design.md)).
5. **Bước chuyển 5 → 6.** Màn 5 v2 làm rõ hệ quả cửa đóng khi Lumo rời ấn; màn 6 tiếp tục bằng ấn không có chốt.

## 2. Nguyên tắc

1. **Khó nghĩa là phải hiểu ra điều gì đó**, không phải nhiều bước hay thao tác nhanh. Luật nền giữ nguyên: không đồng hồ, không sát thương hay rơi, không đưa về đầu màn; sai thì vẫn giữ tiến trình.
2. **Mỗi màn thêm đúng một ý:** một động từ mới hoặc một luật đảo, không cả hai.
3. **Sai phải có hệ quả nhìn thấy được và đảo ngược được**, như cầu biến mất ở màn 4. Câu khi còn khóa chỉ mô tả trạng thái (“Ấn phía sau cửa đang trống”), không nói lời giải và không chặn một hành động hợp lệ.
4. **Giàn giáo rút dần.** HUD nêu mục tiêu, không nêu tay điều khiển, trừ phần dạy (buồng đầu màn 5 và các khu thử). H có 3 mức là lưới an toàn. J ghi luật đã học, không ghi lời giải trước khi giải.
5. **Phản hồi nằm trong thế giới:** lớp nhạc, ánh Lumo, tư thế The Shadow, giọng của các khóa. Mọi phản hồi bằng âm đều có phản hồi hình tương ứng, nên tắt tiếng vẫn chơi được.
6. **Cơ chế mang cảm xúc.** Câu đố và câu chuyện nói cùng một điều. Mỗi lần Lumo giữ ấn là một hành động tin cậy có giá, để lời thú nhận ở màn 9 và lời buông tay ở màn 10 có sức nặng.

## 3. Đường cong độ khó

Năm trục, mỗi trục 0–3: **Thông tin** (đọc, ghép manh mối), **Kế hoạch** (thứ tự, dự trù đường về), **Đồng thời** (giữ nhiều điều kiện cùng lúc), **Không gian** (tia, bóng, hình học), **Đảo luật** (phải bỏ một thói quen đã luyện).

| Màn | TT | KH | ĐT | KG | ĐL | Tổng | Vai trò | Thời gian mục tiêu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | 1 | 0 | 0 | 0 | 0 | 1 | dạy đèn | — |
| 02 | 2 | 1 | 0 | 0 | 0 | 3 | thứ tự từ manh mối | — |
| 03 | 3 | 1 | 0 | 0 | 0 | 4 | ghép hai lớp sáng/tối | — |
| 04 | 1 | 2 | 0 | 2 | 0 | 5 | tia + gài chốt trước khi đổi | — |
| **05** | 2 | 3 | 1 | 0 | 0 | **6** | ủy thác, giữ đường về | 10–14 phút |
| **06** | 1 | 1 | 3 | 2 | 0 | **7** | **đỉnh 1**: đồng thời | 10–15 phút |
| **07** | 1 | 2 | 0 | 1 | 2 | **6** | **chỗ thở**: bóng tối nuôi cây và mở lối | 7–10 phút |
| **08** | 1 | 1 | 3 | 3 | 1 | **9** | **đỉnh 2**: bóng đặt đúng chỗ | 10–15 phút |
| **09** | 1 | 3 | 3 | 3 | 1 | **11** | **đỉnh 3**: tổng hợp ba phòng | 18–25 phút |
| **10** | 1 | 1 | 3 | 2 | 3 | **10** | kết: buông | 10–15 phút + kết |

Tổng rubric và thời gian là giả thuyết thiết kế, không phải thước đo đã xác nhận. Ý đồ là các đỉnh tăng dần 7 → 9 → 11, với màn 7 làm chỗ thở và màn 10 nhẹ hơn về cơ khí để dành chú ý cho kết thúc. Chơi thử cần xác nhận trải nghiệm thực tế (§7). Màn 1–4 ngoài phạm vi; điểm của chúng chỉ để so.

### Số đo từ mô hình

| | Màn 05 hiện tại | Màn 05 v2 |
| --- | --- | --- |
| Hành động tối thiểu | 11 | 14 |
| Trạng thái tới được | 43 | 32 |
| Trạng thái kẹt | 0 | 0 |
| Nước sai không đảo ngược được bằng một hành động mô hình | 0 | 2, phạt lớn nhất +4 |
| Chốt A bắt buộc vì | câu từ chối | cửa đóng thật |
| Chốt B bắt buộc vì | câu từ chối | cửa đóng thật |

Con số 14 là số hành động trừu tượng trong mô hình; nó không dự đoán tổng thời gian người chơi. Chơi thử sẽ ghi riêng thời gian hiểu ra ý chính với thời gian đi bộ, bay/chờ, thoại và đoàn tụ. Hai chốt cần thiết vì cửa sẽ đóng nếu Lumo rời ấn trước khi chốt được gài. Số 2 trong mô hình là các nước sai không đảo lại bằng một hành động: bẫy A được phục hồi bằng một lần gọi và bị loại khỏi số này; nước sai còn lại là gọi C sớm khi A đã gài (+1); bẫy B là rời ấn `··` trước khi gài B (+4). Vì vậy số đo không khớp một-một với hai cảnh bẫy.

| Câu đố ánh sáng | Cấu hình | Đúng | Thỏa đúng 2/3 điều kiện | Điều kiện đồng thời |
| --- | --- | --- | --- | --- |
| Màn 06 | 54 | 1 | 23 | 3 |
| Màn 08 | 64 | 1 | 7 | 3 |
| Màn 09 | 512 | 1 | 7 | 3, cộng ràng buộc thứ tự ở cửa A |
| Màn 10 | 256 | 1 | 82 | 3 |

Tổng điểm rubric, số cấu hình và số trạng thái thỏa đúng hai trong ba điều kiện mô tả ý đồ cùng không gian tìm kiếm. Chúng không đo độ khó, xác suất gặp trạng thái đó, tần suất người chơi mắc lỗi hay khoảng cách một hành động tới lời giải; các điều kiện phụ thuộc nhau. Phản hồi riêng cho mỗi điều kiện (vòng, màu, giọng âm) vẫn giúp người chơi hiểu trạng thái hiện tại.

## 4. Những mạch xuyên suốt

### Lumo — từ được nhờ tới tự buông

| Màn | Lumo | Câu then chốt |
| --- | --- | --- |
| 05 | Được nhờ, đi xa khỏi tầm mắt, tin rằng Nhinh sẽ giữ đường về | “Tôi rời ấn bên kia thì cửa của nó sẽ đóng đấy.” |
| 06 | Giữ một ấn không có chốt | “Ở đây không có chốt nào giữ thay tôi, đúng không?” |
| 07 | Dẫn đường trong bóng tối, học rằng có thứ cần được ngủ | “Đi theo ánh của tôi.” |
| 08 | Thấy một người khác cũng đã giữ quá lâu | “Có thứ giữ thay thì người giữ mới được nghỉ.” |
| 09 | Rời đúng chiếc ấn đêm bão, rồi nhớ ra mình đã làm gì | “Tôi đã giữ ấn.” |
| 10 | Tự chọn giữ, rồi được gọi về đúng lúc | “Lần này là tôi tự chọn giữ.” |

### Giữ và buông

Lumo giữ ấn, và chốt của Nhinh giải phóng cậu (5). Ấn không có chốt thì phải có người giữ tới cùng (6). The Shadow tự che luồng sáng; khi người chơi chủ động xin minh họa phù hợp, cảnh cho thấy ông làm mẫu, rồi người chơi có thể dùng tượng thay ông (8). Người Bảo Vệ giữ ngọn đèn vì nỗi chờ (9). Nhinh buông chiếc đèn (10). Mỗi màn là một cách khác nhau để thôi giữ một thứ.

### Ý nghĩa của chiếc đèn

Đèn mở nhiều lối (1–6); màn 3 và 5 cũng dùng bóng tối để đọc thông tin; màn 7 mở rộng vai trò của bóng tối sang sự sống và đường đi; màn 8 giữ nguồn sáng trong khi đặt bóng đúng chỗ; màn 9 dùng chung một nguồn qua ba phòng; màn 10 nhấn vào đủ năng lượng, rễ tự giữ và lời hứa cho Lumo rời ấn.

### Ngôn ngữ hình ảnh tái sử dụng

- **Dấu chấm:** gương 1/2/3 chấm ở màn 4 thành mốc và ấn 1/2/3 chấm ở màn 5.
- **Mực hiện trong bóng tối:** trang sách màn 3, dấu trên ấn và vạch hành lang màn 5, dòng chữ bên lề bản đồ sao màn 9.
- **Vết xoắn:** đường ống màn 5, cửa Bắc màn 8, miệng ống và ấn màn 9 (đã có, giữ nguyên).

### Âm thanh như một mạch kể

- **Màn 6 dạy:** mỗi mạch một giọng, ba mạch là một hợp âm.
- **Màn 7 trả lại đêm:** dế, nước, tiếng dế đáp.
- **Màn 8:** hai giọng sáng cho hai Nhật, một giọng trầm cho Nguyệt.
- **Màn 10 dùng tất cả:** ba lớp của ba nhánh, một lớp thứ tư chói lên từ chiếc đèn khi quá tải. F tắt hết, rồi đúng những tiếng đêm của màn 7 trở lại trước hợp âm bình minh.

Hệ âm thanh Web Audio hiện có (`src/audio/`) đã có sẵn `endingCue('cricket' | 'water' | 'answer')` và `dawnChord`.

### Mạch phụ tùy chọn — “Những dấu nhỏ”

Năm dấu nhỏ, mỗi màn từ 5 tới 9 một dấu. Mỗi dấu chỉ hiện trong bóng tối hoặc khi dùng Pulse, nên hai kỹ năng của màn 1–3 còn có đất dùng. Không dấu nào chặn tiến trình.

| # | Màn | Dấu | Cách thấy |
| --- | --- | --- | --- |
| 1 | 05 | Hình phấn vẽ đom đóm, ngang tầm một đứa trẻ | Tắt đèn |
| 2 | 06 | Vạch đếm đêm trên khung cửa sổ | Pulse |
| 3 | 07 | Bàn tay nhỏ trên phiến đá ướt | Sau khi nước chảy, Pulse |
| 4 | 08 | Cái tên mòn dưới đế tượng | Pulse |
| 5 | 09 | “Đêm nay con sẽ thấy đèn.” bên lề bản đồ sao | Tắt đèn |

Tìm đủ năm dấu thì cảnh ngồi cạnh rễ cây ở màn 10 thêm hai dòng. Không dấu nào và không dòng nào trả lời số phận cô bé, đúng tinh thần kịch bản màn 9: *“sự thiếu vắng câu trả lời là điều Người Bảo Vệ phải chấp nhận”*.

## 5. Quy ước hướng dẫn và phản hồi

- **HUD, dòng mục tiêu:** chỉ nêu mục tiêu. Riêng phần dạy được nêu phím.
- **HUD, dòng trạng thái:** chỉ sự thật hiện tại, như Lumo đang giữ ấn nào, đang bay hay đi cùng, và chốt nào đã gài. Không bao giờ khẳng định một điều kiện chỉ vì nó từng đúng.
- **Khi còn khóa:** mô tả trạng thái đang thiếu, không nói bước giải, không biến mất khỏi tương tác.
- **H:** ba mức (quan sát, quan hệ, bước tiếp). Giữ định dạng `- **Mức N — …:** “…”` để các check hiện có còn đọc được thang khi bản v2 thay bản gốc. Màn 6 giữ nguyên thang; các màn 7–10 chỉ đổi mức H đã được duyệt trong đợt góp ý.
- **J:** ghi luật đã học; ghi các dấu nhỏ đã thấy.

## 6. Ràng buộc kỹ thuật và tác động triển khai

| Màn | Ràng buộc đang có | Logic | Art mới | Âm thanh | Thoại mới | Lưu |
| --- | --- | --- | --- | --- | --- | --- |
| 05 | Art môi trường v3 đã vẽ khớp tường; không đổi tường, cửa, hốc | Dời hai mốc, bỏ cổng từ chối, luật hiện dấu | Biển dấu cho mốc, dấu mực cho ấn, mực hành lang, hình phấn | Vọng qua ống | Nhiều; một số câu đã chốt được thay hoặc bỏ | Tương thích; cờ `l4-chalk-seen` |
| 06 | Kế hoạch tranh v2 giữ bảng chân trị, khóa lưu, thoại, thang H | Không đổi | Vạch đếm | Ba lớp máy | 3 + 2 dòng | `l5-tally-seen` |
| 07 | Bố cục, lối qua cầu và Pulse bờ Tây đã kiểm thiết kế | Bỏ `side` khỏi điều kiện hoàn thành | Bàn tay trên đá | Bốn tiếng đêm | 3 dòng | `l6-handprint-seen` |
| 08 | Giữ nguyên bảng chân trị; chỉ minh họa theo yêu cầu đủ điều kiện | Cảnh trợ giúp một lần | Chữ khắc dưới tượng | Ba giọng khóa | 7 dòng | `l7-shadow-demo`, `l7-name-seen` |
| 09 | Mạng ba phòng; mạch đèn còn nối qua cửa Lumo giữ và bóng rễ cùng cần thiết | Bàn ghi chờ đoàn tụ | Dòng mực bản đồ sao | Tiếng mưa ngắn | 5 dòng | `l8-seal-remembered`, `l8-margin-seen` |
| 10 | D6/D7; F sớm dùng chung chuyển tiếp kết trong `EndingScene` | F tự nguyện; không cần đoàn tụ | Không | Ba lớp; lớp quá tải chỉ trên đường lấy đèn | 5 dòng | `l9-lumo-chose` |

**Thứ tự triển khai gợi ý:** 05 → 08 → 09 → 10 → 07 → 06. Đây là thứ tự thiết kế, không phải phê duyệt triển khai. Màn 5 giữ nguyên tranh nền, tường và các chốt cần thiết về mặt vật lý; không thêm lối tắt ngoài phần hình ảnh. Màn 6 giữ bảng chân trị, dữ liệu lưu, thoại và H theo kế hoạch tranh v2; chỉ làm sau khi phần tranh v2 đang thực hiện được tích hợp.

## 7. Kiểm chứng

**Đã làm:** mô hình trạng thái trừu tượng ([puzzle-model.mjs](puzzle-model.mjs)); kết quả của nó mô tả phạm vi mô hình được mã hóa, không xác nhận gameplay hay độ khó thực tế.

- Màn 5 v2 giải được từ đầu; không có trạng thái kẹt trong cả 32 trạng thái tới được.
- Hai chốt bắt buộc về vật lý.
- Mô hình L05 ghi 2 nước sai không đảo bằng một hành động; đây không phải số cảnh bẫy. Bẫy 1 phục hồi bằng một lần gọi và bị loại khỏi số; +1 là gọi C sớm khi A đã gài; bẫy 2 là rời ấn `··` trước khi gài B (+4).
- Đã đếm cấu hình màn 6, 8, 9, 10 theo bảng chân trị; L09 còn so sánh đủ 512 cấu hình với hàm thuần của game để bắt sai lệch mô hình.

**Mô hình không chứng minh:** vị trí, va chạm, tầm với E, góc nhìn hay độ dễ đọc của dấu. Những thứ ấy chỉ có thể kiểm sau khi viết code, bằng các check hiện có và chơi thử thật.

**Trạng thái kiểm chứng:** mô hình trừu tượng PASS sau các sửa đổi tài liệu này: L05 có 32 trạng thái tới được, 0 trạng thái kẹt, lời giải 14 hành động; các bảng L06/L08/L09/L10 lần lượt có 54/64/512/256 cấu hình, và đối chiếu L09 đủ 512 cấu hình PASS. Kiểm tra cú pháp JavaScript và khoảng trắng diff PASS. Kiểm tra tham chiếu cục bộ FAIL (38/39): thiếu `../superpowers/plans/2026-10-21-level06-art-v2-production.md`, là kế hoạch có trong workspace gốc nhưng không được chép vào worktree chỉ phục vụ sửa tài liệu này. Build game, check gameplay và chơi thử: NOT_RUN vì phạm vi chỉ gồm tài liệu thiết kế.

**Quy trình chơi thử đề xuất:** dùng 3–5 người chơi lần đầu để bổ sung lượt chơi nối tiếp các màn 05–10 theo đúng thứ tự. Có thể chia thành nhiều buổi nhưng giữ dữ liệu lưu và không giới thiệu trước lời giải ở đoạn chuyển màn. Ghi riêng thời gian tìm ra ý chính với thời gian đi bộ, bay/chờ và thoại; số lần H theo từng mức ở mỗi giai đoạn; thời gian dừng quá 60 giây, điểm bối rối và cách người chơi giải thích lời giải. Quan sát chuyển giao kỹ năng 05→06, 07→08, 08→09 và 09→10; ở màn 10 xác nhận cả đường F sớm lẫn đường sau khi lấy đèn đều giữ được nhịp cảm xúc. Các lượt chơi từng màn riêng vẫn hữu ích bổ sung, cần ghi kỹ năng người chơi đã có. Mục tiêu tạm thời: trung bình không quá một lần H mức 3 mỗi màn và thời gian trong khoảng ở bảng §3. Nếu người chơi giải nhanh nhưng hiểu ngay thì không tự tăng độ khó. Mọi mục tiêu vẫn cần dữ liệu chơi thử xác nhận.

## 8. Quyết định và phạm vi

Đã duyệt sáu hướng sửa trong đợt góp ý: L08 minh họa bóng theo yêu cầu; L09 cầu cần mạch đèn còn nối và rễ trong bóng, với thoại chính xác; L05 dấu/mốc rõ và giảm lặp lại di chuyển, cùng cách đọc số đo; L07 lối phụ không bắt buộc và mô tả đúng vai trò bóng tối; L10 giữ F sớm và lời hứa với Lumo trong một chuyển tiếp của `EndingScene`, không thêm đi tự do; chơi thử 05–10 theo chuỗi cùng các giới hạn của số đo.

Các thoại mới/sửa, art decal, âm thanh và mọi nội dung khác trong sáu bản v2 vẫn là đề xuất thiết kế. Chưa có quyết định đưa toàn bộ các màn này vào game; các nguồn `docs/scenario/` tiếp tục là chuẩn hiện hành.
