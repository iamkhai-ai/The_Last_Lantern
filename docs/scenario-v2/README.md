# Kịch bản v2 — Màn 05–10

**Trạng thái:** bản nháp thiết kế ngày 2026-10-21, **chưa duyệt**.

Bản gốc trong [docs/scenario/](../scenario/) giữ nguyên và vẫn là nguồn chuẩn của game. Các script `scripts/check-*.mjs` đọc thoại và thang gợi ý H trực tiếp từ đó, nên bản v2 đặt riêng ở thư mục này. Khi một màn v2 được duyệt, thay file gốc tương ứng, đồng thời sửa code và check của màn đó.

| Màn | File | Mức thay đổi |
| --- | --- | --- |
| 05 | [05-a-path-for-two.md](05-a-path-for-two.md) | **Câu đố mới** trên cùng bố cục |
| 06 | [06-the-sleepless-tower.md](06-the-sleepless-tower.md) | Âm thanh, một luật được nói rõ; không đổi câu đố (art v2 đang làm) |
| 07 | [07-the-sleeping-garden.md](07-the-sleeping-garden.md) | Bỏ một yêu cầu bằng lời; âm thanh; Lumo dẫn đường |
| 08 | [08-ruins-of-two-halves.md](08-ruins-of-two-halves.md) | Nhịp mới: The Shadow làm mẫu; âm thanh ba khóa |
| 09 | [09-dark-moon-observatory.md](09-dark-moon-observatory.md) | Bản ghi chờ Lumo rời ấn; nhịp ấn nhớ ra Lumo |
| 10 | [10-the-heart-of-elaria.md](10-the-heart-of-elaria.md) | Lumo tự chọn giữ; lớp âm quá tải; dòng kết có điều kiện |

Mô hình kiểm chứng: [puzzle-model.mjs](puzzle-model.mjs) (`node docs/scenario-v2/puzzle-model.mjs`).

## 1. Vì sao viết lại

1. **Màn 5 nhiều bước nhưng không có quyết định.** Theo mô hình: 11 hành động, 0 bẫy có hệ quả. Hai chốt chỉ bắt buộc vì câu từ chối. Bỏ các câu từ chối đi thì vẫn giải được mà không cần gài chốt nào, vì Lumo đi bằng ống và cửa đóng sau lưng không chặn thứ gì cần dùng tiếp.
2. **Màn 7 có cùng lỗi ở quy mô nhỏ.** Chốt lối đá phụ là điều kiện hoàn thành, nhưng cổng điện thờ nằm cùng phía với vườn ươm nên không cần lối ấy để đi tiếp.
3. **Độc canh cơ chế.** 4 trong 6 màn từ 5 tới 10 là định tuyến tia sáng. Độ khó chủ yếu tăng bằng số gương và số điều kiện đồng thời.
4. **HUD nói hộ thao tác** (ví dụ “Nhấn E ở tay gọi C…”). Điều này trái với chính quy tắc của dự án: *“Do not expose spoilers in opening dialogue/HUD”* ([campaign-layout-design.md](../implementation/campaign-layout-design.md)).
5. **Bước hụt 5 → 6.** Màn 6 đòi Lumo giữ ấn trong khi người chơi lo việc khác, nhưng màn 5 chưa từng để việc Lumo rời ấn gây ra hệ quả nào.

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
| **07** | 1 | 2 | 0 | 1 | 2 | **6** | **chỗ thở**: tắt đèn là lời giải | 7–10 phút |
| **08** | 1 | 1 | 3 | 3 | 1 | **9** | **đỉnh 2**: bóng đặt đúng chỗ | 10–15 phút |
| **09** | 1 | 3 | 3 | 3 | 1 | **11** | **đỉnh 3**: tổng hợp ba phòng | 18–25 phút |
| **10** | 1 | 1 | 3 | 2 | 3 | **10** | kết: buông | 10–15 phút + kết |

Hình dạng là **răng cưa với đỉnh tăng dần** (7 → 9 → 11), không phải một đường dốc đều. Màn 7 cố ý thấp hơn hai màn kề nó. Màn 10 cố ý nhẹ hơn màn 9 về cơ khí, để sức chú ý dồn vào khoảnh khắc cuối. Điểm số và thời gian là ước lượng thiết kế, phải hiệu chỉnh bằng playtest (§7). Màn 1–4 ngoài phạm vi; điểm của chúng chỉ để so.

### Số đo từ mô hình

| | Màn 05 hiện tại | Màn 05 v2 |
| --- | --- | --- |
| Hành động tối thiểu | 11 | 14 |
| Trạng thái tới được | 43 | 32 |
| Trạng thái kẹt | 0 | 0 |
| Bẫy có hệ quả (một bước không gỡ lại được) | 0 | 2, phạt lớn nhất +4 |
| Chốt A bắt buộc vì | câu từ chối | cửa đóng thật |
| Chốt B bắt buộc vì | câu từ chối | cửa đóng thật |

Ba hành động thêm là cái giá. Đổi lại, màn có hai bẫy có hệ quả, hai chốt có lý do vật lý và một tầng đọc dấu trong bóng tối.

| Câu đố ánh sáng | Cấu hình | Đúng | Thiếu đúng 1 điều kiện | Điều kiện đồng thời |
| --- | --- | --- | --- | --- |
| Màn 06 | 54 | 1 | 23 | 3 |
| Màn 08 | 64 | 1 | 7 | 3 |
| Màn 09 | 512 | 1 | 8 | 3, cộng ràng buộc thứ tự ở cửa A |
| Màn 10 | 256 | 1 | 82 | 3 |

Số "thiếu đúng một điều kiện" cao nghĩa là người chơi thường xuyên ở trạng thái gần đúng. Vì thế mỗi điều kiện cần phản hồi riêng biệt (vòng, màu, giọng âm), để biết đang thiếu cái nào.

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

Lumo giữ ấn, và chốt của Nhinh giải phóng cậu (5). Ấn không có chốt thì phải có người giữ tới cùng (6). The Shadow giữ bóng bằng chính tay mình, và bức tượng đứng thay ông (8). Người Bảo Vệ giữ ngọn đèn vì nỗi chờ (9). Nhinh buông chiếc đèn (10). Mỗi màn là một cách khác nhau để thôi giữ một thứ.

### Ý nghĩa của chiếc đèn

Công cụ mở mọi thứ (1–6), rồi thứ phải tắt (7), rồi thứ phải giữ sáng mà đặt bóng đúng chỗ (8), rồi một nguồn dùng chung giữa ba phòng (9), và cuối cùng là phần dư (10).

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
- **H:** ba mức (quan sát, quan hệ, bước tiếp). Giữ định dạng `- **Mức N — …:** “…”` để các check hiện có còn đọc được thang khi bản v2 thay bản gốc. Màn 6–10 giữ nguyên văn thang hiện tại.
- **J:** ghi luật đã học; ghi các dấu nhỏ đã thấy.

## 6. Ràng buộc kỹ thuật và tác động triển khai

| Màn | Ràng buộc đang có | Logic | Art mới | Âm thanh | Thoại mới | Lưu |
| --- | --- | --- | --- | --- | --- | --- |
| 05 | Art môi trường v3 đã vẽ khớp tường; không đổi tường, cửa, hốc | Dời hai mốc, bỏ cổng từ chối, luật hiện dấu | Biển dấu cho mốc, dấu mực cho ấn, mực hành lang, hình phấn | Vọng qua ống | Nhiều; một số câu đã chốt được thay hoặc bỏ | Tương thích; cờ `l4-chalk-seen` |
| 06 | Kế hoạch art v2 giữ bảng chân trị, khóa lưu, thoại, thang H | Không đổi | Vạch đếm | Ba lớp máy | 3 + 2 dòng | `l5-tally-seen` |
| 07 | Bố cục và va chạm phức tạp, đã kiểm kỹ | Bỏ `side` khỏi điều kiện hoàn thành | Bàn tay trên đá | Bốn tiếng đêm | 3 dòng | `l6-handprint-seen` |
| 08 | Bảng chân trị và đường đi của The Shadow đã kiểm | Trình kích hoạt một lần | Chữ khắc dưới tượng | Ba giọng khóa | 7 dòng | `l7-shadow-demo`, `l7-name-seen` |
| 09 | Mạng ba phòng và quy tắc khôi phục đã kiểm | Bàn ghi chờ đoàn tụ | Dòng mực bản đồ sao | Tiếng mưa ngắn | 5 dòng | `l8-seal-remembered`, `l8-margin-seen` |
| 10 | D6 (F là hành động cuối duy nhất), D7 (`EndingScene` sở hữu timeline) | Không đổi | Không | Ba lớp + lớp quá tải | 5 dòng | `l9-lumo-chose` |

**Thứ tự triển khai đề xuất:** 05 → 08 → 09 → 10 → 07 → 06.

- Màn 5 thay đổi nhiều nhất và đứng độc lập. Theo `git status` lúc đầu phiên, cây làm việc còn việc L05 chưa commit (plaque sơ đồ, art môi trường v3), nên cần commit trước.
- Màn 6 làm sau cùng, khi art v2 của nó đã gộp, để không chạm cùng file với kế hoạch đang chạy.
- Phần âm thanh có thể làm một lần cho cả 6, 8, 10, vì chúng dùng chung một bộ lớp.

## 7. Kiểm chứng

**Đã làm:** mô hình trạng thái trừu tượng ([puzzle-model.mjs](puzzle-model.mjs)).

- Màn 5 v2 giải được từ đầu; không có trạng thái kẹt trong cả 32 trạng thái tới được.
- Hai chốt bắt buộc về vật lý.
- Có hai bẫy có hệ quả. Mỗi bẫy phục hồi được trong cùng buồng hoặc buồng kế bên.
- Đã đo không gian cấu hình của màn 6, 8, 9, 10 từ bảng chân trị trong `docs/implementation/0X-layout.md`.

**Mô hình không chứng minh:** vị trí, va chạm, tầm với E, góc nhìn hay độ dễ đọc của dấu. Những thứ ấy chỉ có thể kiểm sau khi viết code, bằng các check hiện có và chơi thử thật.

**Chưa chạy (NOT_RUN):** code, build, check của game, playtest.

**Quy trình playtest đề xuất:** 3–5 người chưa chơi bản này, mỗi người chơi liền một màn. Đo:

- thời gian giải;
- số lần dùng H theo từng mức;
- số lần rơi vào mỗi bẫy;
- chỗ đứng yên quá 60 giây;
- sau màn, hỏi: “Bạn hiểu vì sao lời giải đúng không?”

Mục tiêu: trung bình không quá 1 lần H mức 3 mỗi màn, và thời gian nằm trong khoảng ở bảng §3. Vượt nhiều thì giảm độ khó (thêm phản hồi, chứ không thêm chỉ dẫn); quá nhanh mà không ai dùng H thì có thể giảm giàn giáo thêm.

## 8. Việc cần bạn quyết

1. **Câu đố mới của màn 5.** Bản thoại đã chốt ghi “Giữ nguyên câu đố”. Bản v2 đổi câu đố, nên cần bạn đồng ý thay quyết định ấy.
2. **Thoại mới:** các dòng có nhãn *(mới)* hoặc *(sửa)* ở mỗi file. Màn 5 cũng **bỏ** hai câu đã chốt có cổng chặn không còn tồn tại.
3. **HUD rút gọn** từ buồng 2 màn 5 trở đi. Việc này đảo ngược một phần các lần sửa hướng dẫn trước đây sau playtest.
4. **Màn 7: bỏ chốt lối đá phụ khỏi điều kiện hoàn thành.**
5. **Mạch phụ “Những dấu nhỏ”:** cần năm decal nhỏ và hai dòng có điều kiện trong `EndingScene`.
6. **Màn 10: vài bước tự đi trong bóng tối sau F.** Ý này chạm vào D7; mặc định là không làm.
