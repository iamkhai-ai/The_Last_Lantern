# Level 05 — A Path for Two (v2)

**Tên màn:** Lối Đi Hai Người.\
**Chặng:** Hy Vọng — hợp tác và tin cậy.\
**Nhân vật:** Nhinh, Lumo.\
**Đầu vào:** Đã qua Suối Trăng Vỡ: biết gài chốt để giữ một thay đổi, biết gương được đánh dấu bằng một, hai, ba chấm. Từ Thư Viện Dưới Rễ đã biết mực hiện ra khi tắt đèn.\
**Mục tiêu:** Đưa cả hai người qua trạm dẫn nước tới chân tháp.\
**Kỹ năng mới:** Ủy thác. Lumo chỉ ở được một nơi; mốc gọi không luôn nằm cạnh ấn của nó; phải giữ đường về trước khi để bạn đi.

**Trạng thái:** hướng sửa về nhận diện dấu và nhịp di chuyển đã được duyệt trong đợt góp ý; kịch bản v2 vẫn là bản nháp thiết kế, chưa triển khai vào game. Bản đang chạy trong game là [docs/scenario/05-a-path-for-two.md](../scenario/05-a-path-for-two.md) cùng [bản thoại đã chốt](../scenario/05-a-path-for-two-dialogue-approved.md), vẫn là nguồn chuẩn hiện tại. Các dòng *(mới)* hoặc *(sửa)* thuộc đề xuất v2.

> **Thay đổi so với bản hiện tại**
>
> - Mỗi mốc gọi nằm ở buồng **trước** buồng có ấn của nó: mốc hai chấm ở sảnh, mốc ba chấm ở buồng chuyển. Hành lang mực không còn mốc gọi tới ấn cuối.
> - Bỏ hai cổng chặn bằng lời: câu "Khoan đã. Tôi chưa gài chốt cửa này…" và lời từ chối ở tay chốt cửa ra. Cửa chưa gài sẽ đóng thật khi Lumo rời ấn, và đó là bài học. Mô hình ([puzzle-model.mjs](puzzle-model.mjs)) cho thấy ở bản hiện tại, bỏ các cổng chặn bằng lời thì giải được mà không cần gài chốt nào. Ở bản này cả hai chốt đều bắt buộc về mặt vật lý.
> - Mốc gọi và ấn được nối bằng **dấu chấm**. Chấm trên mốc khắc bằng đồng nên luôn nhìn thấy. Chấm trên ấn vẽ bằng mực nên chỉ hiện khi tắt đèn hoặc khi Lumo đang đậu trên ấn.
> - Biển dấu ba chấm cần dễ nhận ra ngay lần đầu người chơi tới mỗi mốc; các dấu mực trên ấn vẫn tuân theo luật hiện mực khi đèn tắt hoặc Lumo đang ở ấn.
> - Giảm việc đi lại lặp lại bằng đường về ngắn, thông thoáng và cửa đã gài dễ đọc. Lumo vẫn thực sự rời ấn, bay tới rồi tới đích; lần gặp và khám phá đầu tiên giữ nguyên. Những lần gọi quen dùng chú thích ngắn kèm âm thanh vọng qua ống, không phát lại hội thoại đầy đủ và khóa điều khiển.
> - Mực trong hành lang trở thành **thông tin** (dấu ba chấm, nét chạy ngược về ống), không còn là nghi thức bắt buộc trước khi gài chốt.
> - HUD ở buồng 2 và 3 chỉ nêu mục tiêu, không nêu tay điều khiển.
> - Giữ nguyên: ba buồng, toàn bộ tường, cửa và va chạm (art môi trường v3 đã vẽ khớp với chúng), khu thử tùy chọn (D1), cảnh ký ức tại chốt cửa ra (D2), điều kiện Lumo thực sự trở về trước khi lên tháp, và cảnh kết.

## 1. Không gian và nhịp cảm xúc

Trạm dẫn nước có ba buồng đá nối nhau bằng hai cửa lớn và những đường ống nhỏ. Nhinh đi bằng hành lang và cửa; Lumo đi bằng ống. Phía trên mỗi cửa là một hốc nhỏ có ấn hình cánh đom đóm, chỉ Lumo tới được. Dây rễ phát sáng chạy từ mỗi mốc gọi vào miệng ống gần nhất, nên người chơi thấy mốc nối vào mạng ống nhưng không thấy ngay nó dẫn tới ấn nào.

Lumo từ người dẫn đường trở thành bạn cùng giải đố. Mỗi lần gọi là một lời nhờ: Lumo bay tới bên Nhinh nghe rồi mới đi, và cậu báo lại khi đã tới nơi. Màn đi từ "nhờ" tới "tin". Nhinh phải để Lumo ở lại giữ một cánh cửa, tự đi xa, rồi quay về đúng lúc. Mỗi chuyến quay lại là một lần giữ đường cho người kia.

Nhịp màn: buồng 1 dịu và rõ ràng; buồng 2 có một thoáng bối rối rồi vỡ lẽ; buồng 3 dùng lại điều vừa học trong bóng tối mà không được nhắc. Sau đó là ký ức của Lumo và cuộc đoàn tụ thật.

### Luật của trạm (được nói qua cảnh, không hiện bảng)

1. Lumo đậu trên ấn thì cửa của ấn mở. Cậu rời ấn thì cửa đóng, trừ khi Nhinh đã gài chốt.
2. Lumo đi bằng ống, không đi qua cửa. Cửa đóng không chặn được Lumo, chỉ chặn Nhinh.
3. Khi được gọi, Lumo bay tới bên Nhinh trước rồi mới theo ống tới ấn.
4. Mốc và ấn cùng số chấm thì nối với nhau. Biển ba chấm đủ rõ để nhận diện ngay lần đầu; chấm trên ấn là mực, chỉ hiện khi tắt đèn hoặc dưới ánh của Lumo.
5. Chốt chỉ gài được khi cửa đang mở, và đã gài thì giữ cửa mãi.
6. Gọi tới ấn của một cửa đã gài thì Lumo trả lời rằng cửa ấy đã được giữ.

## 2. Mở cảnh — một lối quá nhỏ

**Nhinh:** “Cửa đóng rồi. Phía này không có tay mở.”\
**Lumo:** “Có một đường ống nhỏ bên cạnh. Tôi chui qua được.”\
**Nhinh:** “Dấu cạnh đường ống trông giống cánh của cậu.”\
**Lumo:** “Để tôi đi theo đường này xem bên kia có gì nhé?”\
**Nhinh:** “Ừ. Tôi chờ ở đây.”

*Lumo mới đề nghị đi thăm dò. Chỉ khi người chơi dùng một mốc gọi, cậu mới bắt đầu di chuyển.*

## 3. Khu thử an toàn — gọi, chờ, đọc dấu

Hốc thử nằm sau cửa thấp phía Tây sảnh. Mốc thử ngoài sảnh khắc một vòng tròn rỗng, và ấn thử trong hốc có cùng vòng tròn bằng mực. Mốc thử gửi Lumo tới ấn; cửa thấp mở khi cậu thực sự tới nơi; mốc bên trong hốc gọi cậu về. Cửa thấp không bao giờ đóng khi Nhinh còn đứng trong hốc.

Khu thử dạy đủ bốn nhịp gửi, bay, tới, gọi về, và thêm nhịp thứ năm: khi Lumo đậu trên ấn, vòng mực sáng lên dưới ánh cậu. Tắt đèn cũng làm vòng mực hiện ra.

### Khi nhờ Lumo tới dấu thử

**Nhinh:** “Lumo, cậu tới dấu kia rồi chờ tôi một chút được không?”\
**Lumo:** “Được. Tôi đi đây!”

### Khi Lumo thực sự tới nơi, cửa mở

**Lumo:** “Tôi tới rồi. Cửa có mở không?”\
**Nhinh:** “Mở rồi! May mà cậu lọt qua được khe đó.”\
**Lumo:** “Nhỏ cũng có ích chứ. Tôi chờ ở đây, cậu cứ đi đi.”\
**Nhinh:** “Dưới chân cậu có một vòng mực. Giống dấu trên mốc ngoài kia.” *(mới)*

### Khi gọi Lumo trở lại

**Nhinh:** “Xong rồi, Lumo. Cậu trở lại đây nhé.”\
**Lumo:** “Tôi về ngay.”

> **Quyết định D1, giữ nguyên:** khu thử là tùy chọn. Mốc một chấm gọi được ngay, không cần làm khu thử trước. Chỉ một lần gọi Lumo về thật từ ấn thử mới ghi `l4-practice-complete`. HUD chỉ nhắc mốc thử cho tới khi Lumo được gửi tới ấn một chấm lần đầu.

## 4. Câu đố chính — giữ đường cho nhau

### Buồng 1 — Sảnh: hai mốc, một cửa

| Vật | Vị trí đề xuất | Ghi chú |
| --- | --- | --- |
| Mốc một chấm `·` | (384,232), mốc A hiện tại | Dây rễ chạy vào miệng ống trên cửa A |
| Mốc hai chấm `··` | khoảng (230,232), **mới** | Dây rễ cũng chạy vào miệng ống trên cửa A |
| Cửa A | x=480 | Sang Buồng Chuyển Dòng |
| Ấn `·` | hốc trên cửa A (546,114) | Chấm mực hiện dưới ánh Lumo |

Hai mốc cùng nối vào một miệng ống, nên chỉ nhìn dây rễ thì chưa biết mốc nào mở cửa trước mặt.

- **Mốc `·`:** Lumo bay tới bên Nhinh, chui vào ống và đậu trên ấn sau cửa A. Cửa mở, chấm mực dưới chân Lumo sáng lên dưới ánh cậu. Người chơi học được luật chấm mà không cần ai nói.
- **Mốc `··`:** Lumo cũng chui vào ống nhưng đi mất sang buồng bên kia, tới ấn hai chấm. Cửa A vẫn đóng. Lúc đến nơi, giọng Lumo vọng qua ống:

**Lumo (vọng qua ống):** “Tôi tới một dấu rồi! Có cánh cửa vừa mở, nhưng không phải cửa trước mặt cậu.” *(mới)*

Nhấn lại mốc `··` để gọi Lumo về. Thử sai ở buồng này rất rẻ, và người chơi đã nhìn thấy mốc hai chấm, thứ sẽ cần ở buồng sau.

**Khi gửi Lumo tới ấn `·`:**\
**Nhinh:** “Cậu tới dấu bên kia giúp tôi nhé. Tôi sẽ tìm cách giữ cửa mở.”\
**Lumo:** “Được. Cậu cứ từ từ.”

### Buồng 2 — Buồng Chuyển Dòng: mốc không ở đây

| Vật | Vị trí | Ghi chú |
| --- | --- | --- |
| Chốt A | (180,240) | Giữ cửa A mãi khi đang mở |
| Mốc `·` phía xa | (56,228) | Gửi hoặc gọi Lumo ở ấn `·` từ phía này, dùng để khôi phục |
| Mốc ba chấm `···` | (360,232), vị trí của mốc B hiện tại | Dây rễ chạy vào miệng ống trên **cửa B**. Đây là mốc của ấn cuối ở hành lang mực |
| Cửa B | x=480 | Sang Hành Lang Mực |
| Ấn `··` | hốc trên cửa B (546,114) | Trống. Chấm mực chỉ hiện khi tắt đèn |

Nhinh tới nơi khi Lumo vẫn đang giữ cửa A. Cửa B đóng, ấn phía trên trống. Trong buồng có một mốc gọi, nhưng là mốc ba chấm.

Đường giải dự kiến:

1. Gài chốt A khi Lumo còn giữ ấn `·`. Lumo được tự do.
2. Tắt đèn và nhìn ấn trên cửa B: hai chấm mực. Mốc hai chấm ở ngoài sảnh.
3. Quay lại sảnh qua cửa A (đã gài nên vẫn mở) và nhấn mốc `··`. Lumo bay tới bên Nhinh rồi theo ống sang ấn `··`.
4. Trở lại buồng chuyển. Cửa B đã mở, đi qua.

**Khi Nhinh gài chốt A:**\
**Nhinh:** “Chốt đã giữ cửa rồi. Cậu có thể rời dấu đó.”\
**Lumo:** “Vậy tôi không phải đứng đây mãi nữa!”

**Lần đầu nhìn ấn trên cửa B khi đèn đang bật:**\
**Nhinh:** “Trên ấn kia có vệt gì đó, nhưng mờ quá.” *(mới)*\
**Lumo:** “Giống trang sách trong thư viện ấy.” *(sửa: chuyển từ hành lang mực về đây)*

*Câu so sánh với thư viện chỉ phát khi người chơi đã thật sự xem cả hai lớp trang sách ở màn 3 (`l2-book-lit` và `l2-book-dark`), như cách bản hiện tại đang làm. Nếu chưa, chỉ phát dòng của Nhinh.*

**Khi tắt đèn nhìn thấy dấu:**\
**Nhinh:** “Hai chấm mực.” *(mới)*\
**Lumo:** “Giống dấu trên một mốc ngoài sảnh.” *(mới)*

**Khi nhấn mốc `··` ở sảnh:**\
**Nhinh:** “Dấu hai chấm ở buồng bên kia. Cậu tới đó giúp tôi nhé?” *(sửa: thay “Bên này còn một dấu nữa…”)*\
**Lumo:** “Được. Tôi đi đây.”

#### Bẫy 1 — quên giữ đường về

Nếu Nhinh về sảnh và nhấn `··` khi chưa gài chốt A, Lumo rời ấn `·` và cửa A đóng ngay trước mặt Nhinh. Lần đầu điều này sắp xảy ra, Lumo nói ra hệ quả, không nói cách giải:

**Lumo:** “Tôi đi đây. Tôi rời ấn bên kia thì cửa của nó sẽ đóng đấy.” *(mới)*

*Cửa đóng.*

**Nhinh:** “Cửa đóng mất rồi.” *(mới)*

Cách phục hồi luôn có: nhấn lại mốc `·` để Lumo về ấn và cửa mở lại. Muốn thoát vòng lặp, người chơi phải hiểu cần gài chốt trước khi để Lumo đi. Đây là khoảnh khắc "vỡ lẽ" chính của màn.

#### Đường vòng — thử mốc ba chấm quá sớm

Nhấn `···` ở buồng chuyển thì Lumo bay vào ống trên cửa B và đi mất tới hành lang mực. Cửa A đóng nếu chưa gài. Lúc đến nơi:

**Lumo (vọng qua ống):** “Tôi tới một dấu ở xa lắm. Có cửa nào đó mở, nhưng không phải ở chỗ cậu.” *(mới)*

Nhấn lại `···` để gọi Lumo về; mốc `·` phía xa mở lại cửa A. Chi phí thấp, và người chơi đã thấy mốc này đưa Lumo đi xa hơn cửa B. Chính mốc này là chìa khóa của buồng 3.

### Buồng 3 — Hành Lang Mực: đọc trong bóng tối

| Vật | Vị trí | Ghi chú |
| --- | --- | --- |
| Chốt B | (158,240) | Gần cửa vào |
| Mốc `··` phía xa | (68,176) | Khôi phục cửa B |
| Mốc gọi tới ấn cuối | **bỏ** | Mốc (122,190) hiện tại được gỡ cùng khối va chạm của nó |
| Hành lang mực | 184..532 × 218..266 | Mực chạy dọc hành lang, có dấu ba chấm ở đầu Đông và một nét rẽ về miệng ống phía Tây |
| Ấn `···` | (558,244), tiền sảnh Đông | Mở cửa lên tháp |
| Tay chốt cửa ra | (540,192), đứng ở (550,218) | Gài chốt, rồi dùng để gọi Lumo về |
| Vết xoắn | tường Đông (622,282) | Đọc lại ký ức |

Nhinh tới nơi khi Lumo đang giữ ấn `··`. Cửa lên tháp ở đầu kia hành lang đóng, ấn trước nó trống, và trong buồng không có mốc nào gọi tới ấn ấy.

Đường giải dự kiến:

1. Gài chốt B khi Lumo còn giữ ấn `··`.
2. Tắt đèn: vạch mực dọc hành lang có dấu ba chấm ở đầu Đông, và một nét mực chạy ngược về miệng ống phía Tây, tức ống dẫn sang buồng chuyển. Mốc ba chấm ở buồng chuyển.
3. Quay lại buồng chuyển qua cửa B (đã gài) và nhấn `···`.
4. Trở lại hành lang, đi tới đầu Đông, gài chốt cửa ra khi Lumo đang đậu trên ấn `···`. Cảnh ký ức phát (§5).
5. Dùng tay chốt cửa ra gọi Lumo về và chờ cậu tới thật gần, rồi nhấn E ở cầu thang.

Người chơi đã thử `···` ở buồng 2 sẽ vỡ lẽ trước cả khi đọc mực. Đó là phần thưởng cho việc khám phá. Người chưa thử thì có mực dẫn lối.

**Lần đầu vào hành lang khi đèn bật:**\
**Nhinh:** “Trên nền có những vệt mực, nhưng mờ quá.”

**Khi tắt đèn và nhìn thấy vạch:**\
**Nhinh:** “Hiện rõ rồi! Những vạch này dẫn tới cuối hành lang.”\
**Nhinh:** “Ba chấm. Còn nét này chạy ngược về phía ống.” *(mới)*

**Nếu đã thấy vạch rồi mới bật lại đèn:**\
**Nhinh:** “Ánh đèn lại làm những vạch trên nền mờ đi rồi.”

**Khi nhấn `···` ở buồng chuyển sau khi đã thấy vạch:**\
**Nhinh:** “Cậu tới đầu bên kia nhé. Tôi sẽ theo những vạch trên nền.”\
**Lumo:** “Được. Tôi sẽ chờ cậu ở đó.”

*Nếu nhấn `···` khi chưa thấy vạch, dùng câu của đường vòng ở buồng 2. Lời nhờ không được hứa "theo những vạch" khi người chơi chưa thấy chúng.*

**Khi Nhinh tới gần cuối hành lang và Lumo đang ở ấn:**\
**Lumo:** “Ở đây, Nhinh! Cậu sắp tới rồi.”\
**Nhinh:** “Thấy cậu rồi!”

#### Bẫy 2 — để cửa B đóng sau lưng

Nếu Nhinh quay về buồng chuyển và nhấn `···` khi chưa gài chốt B, Lumo rời ấn `··` và cửa B đóng. Buồng chuyển không có mốc `··`, nên Nhinh phải về sảnh nhấn `··` để mở lại cửa B, rồi quay vào gài chốt. Mô hình tính bẫy cửa B này tốn thêm 4 hành động. Con số hai nước sai không đảo lại trong một hành động không khớp một-một với hai cảnh bẫy: bẫy A được phục hồi bằng một lần gọi; nước sai +1 là gọi C sớm khi A đã gài.

### Lời giải đầy đủ — 14 hành động (mô hình)

1. E mốc `·` ở sảnh → 2. qua cửa A → 3. E chốt A → 4. qua cửa A về sảnh → 5. E mốc `··` → 6. qua cửa A → 7. qua cửa B → 8. E chốt B → 9. qua cửa B về buồng chuyển → 10. E mốc `···` → 11. qua cửa B → 12. E tay chốt cửa ra (ký ức) → 13. E tay chốt cửa ra để gọi Lumo về → 14. E cầu thang.

Tắt đèn không nằm trong lời giải tối thiểu, vì người đoán đúng có thể đi thẳng. Với người chơi lần đầu, đó là cách nhanh nhất để biết phải đi đâu.

### Độ khó

| | Bản hiện tại | Bản v2 |
| --- | --- | --- |
| Hành động tối thiểu | 11 | 14 |
| Nước sai không thể đảo ngược bằng một hành động mô hình | 0 | 2, phạt lớn nhất +4 |
| Chốt A bắt buộc vì | câu từ chối | cửa đóng thật |
| Chốt B bắt buộc vì | câu từ chối | cửa đóng thật |
| Trạng thái kẹt | 0 | 0 |

Ba điều người chơi phải tự hiểu ra:

1. Mốc và ấn khớp nhau theo số chấm, và chấm trên ấn chỉ hiện trong bóng tối hoặc dưới ánh Lumo.
2. Phải gài chốt trước khi để Lumo rời ấn, vì mình còn phải đi qua cánh cửa ấy lần nữa.
3. Mốc của ấn tiếp theo nằm ở buồng trước. Mốc ba chấm thấy ở buồng 2 chính là chìa khóa của buồng 3.

Thời gian giải mục tiêu tạm thời: 10–14 phút cho trải nghiệm của người chơi lần đầu. Mô hình 14 hành động trừu tượng không dự đoán tổng thời gian; chơi thử sẽ ghi riêng thời gian đi bộ, bay/chờ, thoại và đoàn tụ. Không có đồng hồ, không có rơi hoặc đưa về đầu màn. Mọi bẫy đều phục hồi được trong cùng buồng hoặc buồng kế bên. Đường về cần ngắn, dễ nhìn; các lần gọi đã quen dùng chú thích ngắn và tiếng vọng thay cho hội thoại khóa điều khiển, nhưng vẫn giữ các lần phát hiện đầu tiên và chuyển động bay thật.

### Mạch phụ — hình vẽ trên tường (tùy chọn, “Những dấu nhỏ” 1/5)

Trên tường buồng chuyển, ngang tầm một đứa trẻ, có một hình vẽ phấn chỉ hiện khi tắt đèn: một con đom đóm với đôi cánh tròn.

**Nhinh:** “Ai đó từng vẽ một con đom đóm ở đây. Nét vẽ thấp, như của một đứa trẻ.” *(mới)*\
**Lumo:** “…Tôi không nhớ.” *(mới)*

Ghi vào trang sổ “Những dấu nhỏ”. Không ảnh hưởng tiến trình, không trả lời ai là người vẽ.

## 5. Mảnh ký ức — vết xoắn trong đường ống

*Đoạn này vẫn xuất hiện khi Nhinh gài chốt cửa ra, không dời sang lúc gọi Lumo trở lại.*

**Lumo:** “Vết xoắn kia… Tôi đã thấy nó rồi.”\
**Nhinh:** “Trong đêm bão à?”\
**Lumo:** “Ừ. Tôi đã bay qua đường ống này. Có người gọi bên ngoài, nhưng tôi không nhớ họ gọi tên ai.”\
**Nhinh:** “Cậu có muốn nghỉ một lát không?”\
**Lumo:** “Tôi sợ lát nữa lại quên mất.”\
**Nhinh:** “Vậy tôi ghi lại ngay. Cậu nhớ thêm gì thì cứ nói, tôi sẽ chép.”\
**Lumo:** “Ghi cả vết xoắn này nhé.”

> **Quyết định D2, giữ nguyên:** bảy dòng phát khi gài chốt cửa ra; `l4-memo` chỉ ghi khi hết bảy dòng; vết xoắn trên tường Đông đọc lại được.

Ý nghĩa mới trong bản v2: cả màn, người chơi đã gửi Lumo đi qua ống, xa khỏi tầm mắt, rồi tin cậu sẽ về. Ký ức của Lumo cũng là một lần bay qua ống vì có người nhờ. Câu đố chuẩn bị cho cảnh này mà không cần giải thích.

## 6. Gợi ý H, HUD và phản hồi

### Thang gợi ý chính

- **Mức 1 — quan sát:** “Mỗi mốc gọi và mỗi ấn đều có dấu chấm. Dấu trên ấn vẽ bằng mực, đèn sáng quá thì khó thấy.”
- **Mức 2 — quan hệ:** “Tôi rời ấn thì cửa đóng, trừ khi cậu đã gài chốt. Mốc gọi một ấn có khi nằm ở buồng phía trước.”
- **Mức 3 — bước tiếp:** “Gài chốt cửa vừa qua. Quay lại buồng trước, nhấn E ở mốc có cùng số chấm với ấn đang trống.”

### Thang theo bước

| Bước | Mức 1 | Mức 2 | Mức 3 |
| --- | --- | --- | --- |
| Sảnh | “Hai mốc gọi đều nối vào ống trên cửa.” | “Khi tôi đậu trên ấn, cậu sẽ thấy dấu của nó.” | “Nhấn E ở mốc một chấm.” |
| Buồng chuyển, chưa gài A | “Cửa sau lưng đang mở vì tôi giữ ấn.” | “Tôi rời ấn thì cửa đóng. Có chốt ở phía này.” | “Gài chốt A trước khi nhờ tôi đi nơi khác.” |
| Buồng chuyển, đã gài A | “Ấn trên cửa phía trước đang trống.” | “Tắt đèn để đọc dấu trên ấn. Mốc cùng dấu có thể ở buồng trước.” | “Về sảnh, nhấn E ở mốc hai chấm.” |
| Hành lang, chưa gài B | “Cửa sau lưng đang mở vì tôi giữ ấn.” | “Cậu sẽ còn phải quay lại buồng chuyển.” | “Gài chốt B trước khi nhờ tôi đi.” |
| Hành lang, đã gài B | “Ấn cạnh cửa lên tháp đang trống.” | “Tắt đèn và đi dọc hành lang. Vạch mực cho biết ấn ấy nối về đâu.” | “Về buồng chuyển, nhấn E ở mốc ba chấm.” |
| Đã gài chốt cửa ra | “Cửa đã giữ chắc.” | “Mình chưa thể đi mà bỏ tôi ở lại.” | “Nhấn E ở tay chốt để gọi tôi về, chờ tôi tới gần rồi lên cầu thang.” |

Nếu Lumo đang giữ một ấn, lời gợi ý phát từ vị trí của cậu; cậu không tự bay về khi hội thoại bắt đầu.

### HUD

| Bước | Dòng mục tiêu |
| --- | --- |
| Sảnh, chưa gửi Lumo | “Nhờ Lumo mở cửa: nhấn E ở một mốc gọi.” (bước dạy, được nêu phím) |
| Sảnh, cửa A đang mở | “Qua cửa.” |
| Buồng chuyển, hành lang | “Đưa cả hai người tới chân tháp.” |
| Đã gài chốt cửa ra, Lumo chưa về | “Đi cùng Lumo lên tháp.” |

Dòng trạng thái chỉ nêu sự thật hiện tại: `Lumo: giữ ấn ·· / đang bay / đi cùng Nhinh · Chốt: · ✓  ·· —  ··· —`. Không dòng nào khẳng định một điều kiện chỉ vì nó từng đúng.

### Phản hồi khi còn khóa (chỉ mô tả trạng thái, không nói lời giải)

| Tình huống | Câu |
| --- | --- |
| Cửa đóng, ấn của nó trống | **Nhinh:** “Có một dấu ở bên kia cửa. Mình thử nhờ Lumo tới đó xem.” |
| Cửa đóng, Lumo đang bay tới ấn của nó | **Nhinh:** “Lumo vẫn đang trên đường tới. Mình đợi cậu ấy một chút.” |
| Gài chốt khi cửa đang đóng | **Nhinh:** “Chốt chỉ gài được khi cửa đang mở.” *(mới)* |
| Gọi tới ấn của cửa đã gài | **Lumo:** “Cửa này đã có chốt giữ rồi. Tôi không cần đứng ở dấu nữa.” |
| Định lên tháp khi Lumo chưa về | **Nhinh:** “Mình chưa thể đi mà bỏ Lumo ở lại. Phải gọi cậu ấy về đã.” |

Hai câu đã chốt bị **bỏ** vì cổng chặn của chúng không còn: “Khoan đã. Tôi chưa gài chốt cửa này. Cậu chờ thêm một chút nhé.” và “Những vệt trên nền còn mờ quá. Mình thử tắt đèn để xem chúng dẫn tới đâu.”

### Sổ tay J

- Sau ấn `·`: “Mốc và ấn cùng số chấm thì nối với nhau. Dấu trên ấn là mực.”
- Sau lần đầu một cửa đóng vì Lumo rời ấn: “Lumo rời ấn thì cửa đóng. Muốn giữ đường, phải gài chốt trước.”
- Sau khi thấy mực hành lang: “Đèn dịu xuống thì vạch mực trên nền hiện rõ.”
- Sau ký ức: “Vết xoắn trong đường ống gợi lại đêm bão và tiếng gọi ngoài kia.”

## 7. Kết màn và trạng thái giữ lại

*Hai người đứng dưới cầu thang xoắn. Trên cao, ánh trắng chớp theo nhịp máy chạy; dưới chân họ, nước bị hút ngược vào một ống lớn.*

**Lumo:** “Tôi về rồi.”\
**Nhinh:** “Được rồi. Mình cùng lên nhé.”

*Phần trên chỉ phát khi Lumo thực sự đã trở về bên Nhinh, không phát lúc cậu còn bay trong ống. Lời gọi về dùng câu đã chốt:* **Nhinh:** “Cửa đã có chốt giữ rồi. Lumo, cậu về đây nhé.” / **Lumo:** “Tôi về ngay.”

**Nhinh:** “Nước đang bị hút lên tháp.”\
**Lumo:** “Ngọn đèn trên đó vẫn sáng…”\
**Nhinh:** “Mình lên xem có cách trả nước về suối không.”

Hoàn thành khi chốt cửa ra đã gài, ký ức đã đọc và Lumo thực sự đứng cạnh Nhinh. Khi tải lại:

- Giữ mọi chốt đã gài, ấn Lumo đang giữ và đường bay dở dang của cậu.
- Đặt Nhinh ở nền an toàn của buồng đã lưu, không bao giờ sau một cửa đang đóng.
- Mỗi buồng đều có một mốc mở lại được cửa dẫn về (sảnh: `·`; buồng chuyển: `·` phía xa; hành lang: `··` phía xa), nên không có trạng thái kẹt. Mô hình đã kiểm cả 32 trạng thái tới được.
- Save cũ của bản hiện tại: chốt và ấn Lumo đang giữ mang nghĩa như cũ, không cần chuyển đổi. Cờ `l4-ink-revealed` vẫn được ghi để giữ thoại quan sát, nhưng không còn là điều kiện.

**Ghi chép nhận được:** cách gọi Lumo; mốc và ấn khớp theo dấu chấm; gài chốt trước khi để bạn rời ấn; ánh sáng nhỏ không che mực phát quang; vết xoắn trong đường ống.\
**Chuyển tiếp:** [Level 06 — The Sleepless Tower](06-the-sleepless-tower.md).

## 8. Tác động triển khai

- **Dữ liệu (`src/data/pathForTwoLayout.ts`):** thêm mốc `··` ở sảnh, kèm điểm đứng phía nam và khối va chạm 40×48 theo luật mép nam (RULE_GAMES §1). Đổi mốc B ở buồng chuyển thành mốc `···`. Gỡ mốc gọi ấn cuối ở hành lang cùng khối va chạm. Viết lại tuyến dây và ống: dây `··` từ sảnh qua ống A sang ấn ở buồng chuyển; dây `···` từ buồng chuyển qua ống B sang ấn ở hành lang. Tường, cửa, ngưỡng và hốc không đổi, nên art môi trường v3 vẫn đúng.
- **Điều khiển (`src/levels/PathForTwoLevel.ts`):** bỏ cổng `NEXT_MARK_UNLATCHED`, bỏ điều kiện `callEligible` cho B và C, và bỏ khỏi `latchCBlockReason` hai điều kiện chốt B và đã thấy mực (giữ điều kiện Lumo đang ở ấn). Thêm luật hiện dấu: tắt đèn hoặc Lumo đậu trên ấn. Thêm câu cảnh báo lần đầu khi Lumo rời một ấn chưa gài, câu vọng qua ống khi Lumo tới ấn ở buồng khác, và nhịp cửa đóng sau lưng.
- **Art mới (nhỏ, chạy lúc runtime, không vẽ vào nền):** bốn biển đồng khắc dấu (vòng tròn, `·`, `··`, `···`) gắn lên mốc gọi; bốn dấu mực đặt trên ấn, có bản sáng và tối như cặp `ink-route-bright/dark`; một bản mực hành lang có dấu `···` và nét rẽ về miệng ống Tây; một hình vẽ phấn đom đóm cho mạch phụ, chỉ hiện khi tắt đèn (cờ mới `l4-chalk-seen`).
- **Kiểm tra:** cập nhật `scripts/check-path-for-two.mjs` (vị trí mốc, cổng chặn, khả năng khôi phục từng buồng), `scripts/check-dialogue-05.mjs` (khi bản thoại mới được chốt), `scripts/check-interaction-targets.mjs`. Thêm một ca chạy mô hình trạng thái như [puzzle-model.mjs](puzzle-model.mjs) vào check của màn, để mọi thay đổi bố cục đều chứng minh lại được là không có trạng thái kẹt.
