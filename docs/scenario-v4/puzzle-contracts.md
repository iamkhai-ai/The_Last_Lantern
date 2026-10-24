# V4 — Luật chung và nhịp chiến dịch

## 1. Những quy ước phải giống nhau ở mọi màn

### Đèn bảo trì, nguồn cố định và ánh sáng nền

Nhinh chỉ mang một đèn bảo trì. F bật/tắt đèn đó khi Nhinh đang cầm hoặc khi đèn được đặt trên một bệ trong cùng màn. E đặt hoặc nhặt đèn tại bệ. Đèn không có nhiên liệu. Đặt đèn ở bệ không tự tạo thêm nguồn: đầu nối, đường truyền và đầu nhận của màn phải được vẽ, và hiệu lực chỉ đi theo các đường ghi trong màn đó. Đèn cầm tay chỉ chiếu trong vệt cục bộ có rìa được đánh dấu; không mặc định nó rọi tới cảm biến ở xa.

Mỗi phòng luôn có **ánh nền môi trường** đủ để đọc đường đi, mép vực, nền an toàn, tường, cửa, bậc, vật tương tác và đường về kể cả khi mọi nguồn gameplay tắt. Đây là lớp dẫn đường, không phải nguồn cảm biến. Không dùng tăng gamma để lộ dấu, chốt hay lối chưa được đặt art/điều kiện.

**Nguồn cố định** (đèn trắng, bể sáng, đèn trạm) là một vật riêng với đèn Nhinh. Mỗi nguồn ghi ở tài liệu màn: vị trí/công tắc vật lý, phần không gian nó thật sự phủ, cảm biến nào chịu ảnh hưởng và trạng thái bắt đầu. F không điều khiển nguồn cố định. Tắt một nguồn không làm tối toàn phòng; bật một nguồn không tự cấp điện cho đầu nhận nằm ngoài phạm vi. Nếu màn không có nguồn gameplay cố định, phải ghi rõ không có; ánh nền vẫn tồn tại.

Cảm biến chỉ hoạt động khi vùng nhạy nhận nguồn được khai báo trong màn, trong đúng tầm và không bị vật chắn. Hình vẽ, cáp, ốp che và vùng nhận phải khớp với phép tính đó. Ánh sáng trang trí và ánh sáng của Lumo không cấp nguồn cảm biến. Đường năng lượng/nước chính của Cây Mẹ là hệ riêng, không được diễn tả như thể đèn bảo trì đủ cấp cho Bến Sương. Tắt F không cắt dòng chính.

Nếu đặt đèn vào đầu nối kín, nó cấp đúng mạng đã vẽ. Mỗi màn ghi rõ liệu có nhánh tràn cục bộ nào khác, nhánh ấy tới đâu và công tắc nào điều khiển nó. Không suy diễn rằng nguồn ở bệ chiếu tới cây, cầu, khóa hay lối phụ nếu màn không khai báo. Đèn đặt tại bệ không Pulse được; muốn Pulse phải nhặt đèn, bật khi đang cầm và phát trước khi đặt hoặc sau một lượt thu đèn hợp lệ. F vẫn bật/tắt đèn đặt từ xa trong cùng màn.

### Pulse, J và dấu đã phát hiện

Pulse chỉ dùng được khi đèn đang ở tay Nhinh **và đang bật**. Pulse bộc lộ dấu khắc, chân ống, trục tĩnh hoặc liên kết cố định trong phạm vi đã vẽ. Nó không cấp điện, không đổi hướng vật, không kiểm tra trạng thái hiện thời của cảm biến, không tự giải đố và không chuyển sang một chế độ máy quét. Mỗi dấu đã thật sự phát hiện được lưu trong J và có thể xem lại dưới dạng viền mờ sau khi hiệu ứng qua. Nếu người chơi chưa Pulse thì không có đường viền để xem. Không có thời hạn nhấn E sau Pulse và không yêu cầu đã mở đủ cờ khảo sát mới cho kết quả.

Dấu tĩnh là thông tin về cách mạng nối, không phải trạng thái động. Khi cấu hình, tia, cửa, nước hay cầu thay đổi, trò chơi tính lại từ thế giới hiện tại; J không ghi thay một nguồn đang bật.

### Thông tin hữu ích trong tối

Màn có thể đặt lớp thông tin chỉ lộ khi dấu ấy **không thật sự bị một vệt đèn gameplay chiếu vào**: mực phát quang, vết nước, đom đóm tụ, rãnh phản quang hoặc hình khắc dưới bụi sao. Tài liệu màn phải nói rõ dấu nào xuất hiện và footprint nào có thể che nó. Tắt F không làm tối toàn phòng, còn bật đèn ở phòng khác không che dấu xuyên phòng; chỉ nguồn có tia thật phủ lên dấu mới đổi khả năng đọc. Đây là art/trạng thái được dựng có chủ ý, không phải hình ảnh vốn tồn tại nhưng bị giấu bằng gamma. Thông tin tối có thể giúp chọn tuyến, đọc dấu hoặc đi trên một cầu đã mọc; không được tự tiết lộ toàn bộ lời giải. Đường đi và vật tương tác vẫn nhìn rõ nhờ ánh nền.

### Vệt đèn, đầu nhận và dấu sáng/tối — quy ước dựng chung

Các số dưới đây là giá trị khởi điểm dùng chung cho mọi màn. Chúng được chỉnh một lần ở phòng thử, không chỉnh riêng từng màn để làm bài dễ hoặc khó hơn.

**Footprint của đèn cầm tay** chỉ tồn tại khi đèn ở tay và F bật. Nó gồm:

- **Vệt:** hình thang đi ra phía trước từ tay cầm đèn theo hướng Nhinh đang quay (8 hướng; hướng chéo cùng chiều dài). Dài 56px, rộng 12px ở gốc và 32px ở đầu xa. Khi đứng yên, Nhinh giữ hướng quay cuối cùng; muốn rọi một vật, người chơi bước một nhịp về phía nó rồi dừng. Không có nút ngắm riêng.
- **Quầng:** vòng bán kính 12px quanh chính chiếc đèn.
- **Vật chắn:** tường và cánh cửa đang đóng chắn vệt; phần nằm sau chúng không được chiếu. Cầu, rễ, nước, NPC và Lumo không chắn.

Rìa vẽ trên màn khớp đúng footprint này. Ngoài footprint chỉ có ánh nền; không có quầng trang trí lớn hơn footprint khiến người chơi tưởng một dấu đang bị chiếu.

**Đèn đặt trên bệ** có footprint là quầng 12px quanh đèn cộng các nhánh tràn mà màn khai báo (nhánh spill của S ở 08, nhánh soi hồ sơ ở 09). Đầu nối kín không phải footprint. Không đặt mặt nhận hở hay dấu sáng/tối trong quầng của bệ, trừ khi màn ghi rõ lý do.

**Nguồn cố định** có footprint là vùng khai báo của nguồn khi công tắc/nắp cho phép; F không đổi nó.

**Độ sáng màn hình:** ánh nền của mỗi phòng là cố định, không đổi theo F. F chỉ thêm hoặc bớt footprint của đèn bảo trì. Không có lớp tối phủ toàn màn khi tắt F, và cũng không làm sáng toàn màn khi bật.

**Hai loại đầu nhận**, phân biệt bằng hình dạng, không chỉ bằng màu. Mỗi màn ghi rõ đầu nhận nào thuộc loại nào:

- **Ổ kín** (có nắp, đầu nối vẽ rõ): chỉ nhận qua bệ và mạng đã vẽ. Đèn cầm tay, nguồn cố định và Lumo không kích được. Ví dụ: cửa A/B ở 01, cầu ở 04.
- **Mặt nhận hở** (hoa, luống rễ, lá cảm biến): nhận khi bất kỳ footprint gameplay nào (vệt, quầng, nhánh tràn, nguồn cố định) chồng lên vùng nhạy. Ví dụ: hoa A ở 07, luống rễ cầu ở 07/08. Trạng thái tính lại liên tục từ footprint hiện tại, không có thời gian chờ; vật đang chịu tải vẫn giữ tới nền an toàn theo luật cầu/cửa.

**Dấu sáng và dấu tối:**

- **Dấu sáng** chỉ đọc được khi một footprint gameplay chồng lên nó: lớp thiên thể trên phiến ở 03, mặt máy và các dấu ánh ở 01.
- **Dấu tối** chỉ đọc được khi không footprint gameplay nào chồng lên nó: bào tử 01, đom đóm 02, lớp mũi tên 03, vệt khoáng 04, phấn 05, vạch khắc 06, phấn 07, mạch nước trên rễ 08, bột sao 09, đai rễ 10.
- Một dấu được tính là **đã thấy** khi nó đang đọc được và chân Nhinh ở trong 64px quanh dấu, cùng phòng. Lúc đó J ghi dấu một lần dưới dạng viền mờ và save lưu cờ đã thấy. Cờ này chỉ để xem lại; nó không bao giờ là điều kiện mở cửa, cầu, H hay cảnh truyện.

**Kiểm khi dựng:** mỗi mặt nhận hở phải có ít nhất một chỗ đứng an toàn (RULE_GAMES.md §6) mà từ đó vệt cầm tay phủ được nó. Nếu màn cần vệt chạm vật này mà không chạm vật kia (hoa A và luống cầu ở 07), chỗ đứng đó phải tồn tại và được script kiểm như tầm với E. Mỗi dấu sáng/tối phải có chỗ đứng đọc được trong mọi trạng thái mà màn cần dấu đó.

### Đèn khi chuyển màn

- Rời màn luôn mang đèn ở tay; lối ra không tự lấy đèn khỏi bệ.
- Trạng thái F đi theo người chơi qua lối ra sang màn sau. "Trạng thái đầu" ghi ở từng màn là trạng thái **mặc định** khi không có trạng thái mang theo: vào màn từ chọn màn, save phải sửa, hoặc đầu chiến dịch. Cảnh mở màn 01 là nơi duy nhất tự bật đèn (Nhinh bật thử lần đầu).
- Điểm vào và mọi checkpoint phải hợp lệ với cả F bật lẫn F tắt: không đứng trong vùng mà bật/tắt làm đổi cầu hay cửa dưới chân, và người chơi tiếp tục được từ đó với bất kỳ trạng thái F nào.

### Chu kỳ cấp chính và tháp

Thiết kế lành mạnh nạp/chia trong khoảng ban ngày, hồi về rễ ở các khoảng còn lại; kho của bến tích phần đã nhận để dùng ban đêm. Bài chia bốn phần ở màn 06 là kiểm tra trong nhịp cấp ban ngày, không ép Cây Mẹ xuất liên tục cả đêm. Lượng dùng đêm giảm theo kho đã nạp, không có kho vô hạn. Sự ngắt dòng khẩn cấp trong truyện khác với F của đèn bảo trì.

### Lumo

Ánh tự thân của Lumo đủ dẫn đường nhưng không kích mắt Nhật hay Nguyệt, không cấp khung nâng, không thay đèn bảo trì và không phá bóng cần cho rễ. Ấn chỉ có hiệu lực khi cậu thực sự tới nơi. Mỗi mốc gọi cho thấy đích và đường ống; cậu có thể đi qua ống nhỏ mà Nhinh không thể. Các đoạn giữ là việc Lumo tự nhận; gọi về luôn được đáp ứng, kể cả khi máy tạm dừng. Không dùng chịu đau làm thước đo giải puzzle.

### Chốt, cầu và cửa

Cảm biến và người giữ là điều kiện sống; chốt là hỗ trợ cơ khí. Chốt cố định không chuyển được. Chốt rời có tay cầm và được đếm từ màn 05. Cửa không tự giữ nếu hình ảnh không có bộ hãm. Cửa đã gài giữ trạng thái khi mất nguồn. Mọi thao tác chốt có thể đảo khi cần phục hồi, trừ kết quả cuối màn đã cam kết và mô tả riêng.

Cầu chỉ cho bước vào khi đang mở thật. Nếu mất điều kiện lúc người chơi đang đi, phần cầu chịu tải giữ tới bờ; không rơi và không chạy đua. Chạm cầu đã đóng không làm nó tự mọc. Mọi bờ xa có mốc gọi/cần hồi phù hợp hoặc đường bộ để khôi phục nguồn từ phía đó. Rễ sống tự mọc khi có nước và bóng tối theo điều kiện của chính màn. Rễ trên khung nâng cổ ở màn 09 cần nguồn cấp gián tiếp **và** luống trong bóng; đây là hai chỉ báo riêng, không đổi luật rễ tự nhiên của màn 07.

### Kết quả và H

Mọi cấu hình thỏa điều kiện vật lý hiện tại đều hợp lệ. Lời giải trong từng màn là đường tham khảo, không phải chuỗi thao tác bắt buộc. Không khóa vì chưa đọc bia, chưa xem gợi ý, chưa Pulse, chưa chạm đủ vật hoặc chưa đi đúng thứ tự tác giả nếu thế giới đã ở trạng thái hợp lệ. Các cảnh truyện chính tự kích hoạt một lần sau kết quả; có thể bỏ qua trình chiếu và đọc lại J.

H là tùy chọn; ba mức lần lượt giúp người chơi quan sát, nối quan hệ và chọn bước tiếp theo theo trạng thái hiện tại. H không buộc phải Pulse, đọc đủ hồ sơ, dùng đúng một vị trí đứng hoặc thử đúng thứ tự. Vật trông giống đồ tương tác phải trả lời E theo RULE_GAMES.md; phản hồi nêu sự kiện vừa xảy ra hoặc điều kiện đang thiếu, không tự nói lời giải.

## 2. Khó theo điều gì?

| Chặng | Điều người chơi phải học/chuyển giao | Khoảng thời gian thiết kế, chưa đo |
| --- | --- | --- |
| Prologue | Di chuyển, E, quan sát lỗi, quan hệ ở quê | 1–2 phút cảnh sửa đèn; đoạn dẫn sau đó riêng |
| 01 | Nguồn sáng có vị trí; cần giữ một cửa trước khi lấy nguồn đi; tắt đèn để khám phá | 6–9 phút |
| 02 | Một điều khiển ảnh hưởng nhiều bộ phận; dự đoán trước khi quay; tối giúp đọc trục chung | 8–12 phút |
| 03 | Một lớp thông tin chưa đủ; kết quả phải làm việc trong mô hình | 12–16 phút |
| 04 | Chia thành khu, giữ kết quả trung gian, Pulse liên kết trước khi cấp nguồn | 14–20 phút |
| 05 | Hỗ trợ hữu hạn; phân biệt cái gì giữ tạm và cái gì giữ lâu | 12–18 phút |
| 06 | Nguồn hữu hạn; khảo sát mạng trước khi thử và chia nhu cầu đồng thời | 15–20 phút |
| 07 | Chuẩn bị lối đi trong sáng rồi trả vùng ươm về tối | 8–12 phút |
| 08 | Qua rễ cầu khi đèn tắt, mở đường hồi, rồi giữ Nhật sáng và Nguyệt trong bóng đồng thời | 13–18 phút |
| 09 | Tắt F để khảo sát quan hệ, cấp mạng lại, giữ đường rút rồi thu hỗ trợ | 20–28 phút |
| 10 | Phân biệt khởi động có hỗ trợ và vận hành tự duy trì | 10–15 phút + kết |

Các khoảng này để kiểm soát quy mô, không phải cam kết thời lượng hay yêu cầu kéo dài người chơi. Thời gian đi bộ/đọc thoại không tính như độ khó. Một lời giải nhanh mà có suy luận rõ không phải lỗi. Màn 01 vẫn cho phép thành công sớm; màn 04 là đỉnh của demo, 06 và 09 là các đỉnh tiếp theo, 07 là khoảng thở.

Mỗi màn đưa vào tối đa một ý khó mới làm trọng tâm. Các thao tác khác tái dùng từ trước. Các phần thực hành chỉ cần xuất hiện khi luật mới chưa được quan sát; không ép làm lại bài dễ nếu người chơi đã hiểu và đi thẳng vào phần chính.

## 3. Manh mối, phản hồi và chống thử mù

- Manh mối mô tả quan hệ nhân quả: trục chung, ống hồi, chốt, đầu ra, vùng bóng. Bia không liệt kê đáp án theo thứ tự thao tác.
- Đường nối, đích, công tắc và rìa vùng chiếu có hình dạng/ký hiệu, không phân biệt chỉ bằng màu. Âm sắc đi cùng chuyển động hoặc dấu trạng thái.
- Mỗi lần đổi điều khiển thấy được những bộ phận đổi theo. Có thể xem sơ đồ tĩnh đã khám phá trong J khi nguyên nhân ở phòng khác; J không thay trạng thái đang chạy.
- Nhinh/Lumo chỉ tự nói điều vừa xảy ra; không tự nói tọa độ, nấc đúng hay chuỗi giải. H là tùy chọn và tính từ trạng thái thật.
- Không phạt thử bằng xóa ghi chép, đóng toàn bộ đường đã chốt hoặc bắt đi lại đoạn dài. Không tạo hình trang trí trông giống vật tương tác rồi không phản hồi.
- Không khóa nút xác nhận để buộc người chơi đọc đủ manh mối. Họ được đoán; cấu trúc và phản hồi phải khiến quan sát có lợi hơn thử ngẫu nhiên.
- Đặt phát hiện/cảnh ngắn sau một thay đổi thật, tránh ngắt giữa chuỗi thao tác. Một ký ức chính chỉ nên có vài lượt lời; phần hồ sơ dài để đọc thêm.

## 4. Trạng thái, lưu và ranh giới triển khai

RULE_GAMES.md vẫn áp dụng: vật đứng tương tác trong 8px từ mép footprint, mọi hướng; hốc phẳng theo quy tắc riêng; các ngoại lệ phải được ghi khi dựng. Không chốt tọa độ/collider bằng sơ đồ chữ trong tài liệu này. Mỗi khu dự kiến dùng khung 640×360 hoặc phòng ghép có đường chuyển rõ; tránh thu nhỏ vật để nhét thêm câu đố.

Lưu cấu hình gương/van/chốt, trạng thái từng nguồn cố định và công tắc, vị trí đèn (đang cầm hay đặt ở bệ), F bật/tắt, vị trí/chế độ Lumo, phiến/vật đang cầm, các dấu đã Pulse thật sự phát hiện và sự kiện một lần. Nếu màn có thông tin chỉ thấy trong tối, chỉ lưu trạng thái khám phá sau khi người chơi thực sự nhìn thấy; không biến cờ đó thành điều kiện giải. Hiệu lực tia/cầu/cửa/rễ tính lại từ cấu hình hiện tại khi tải; không khôi phục một cờ “đã sáng” thay nguồn. Hướng quay của Nhinh và footprint đèn không lưu; sau khi tải, mặt nhận hở tính lại từ hướng mặc định tại checkpoint. Checkpoint phải có vùng đứng an toàn và đường tới điều khiển phục hồi ở mọi trạng thái được yêu cầu.

Cảnh thoại có thể bỏ qua nhưng phải ghi kết quả một lần. Tải giữa cảnh chuyển dùng checkpoint trước hoặc sau cam kết; không phát lại thử tải gây hại, nhân đôi tinh thể/chốt, hoặc đưa Lumo về ấn sau khi đã gọi về. Các cờ V4 cần tên/phân phiên bản riêng khi triển khai; không đoán tương thích với save V2.

Không có nhiên liệu, timer, chết/rơi, đua phản xạ, phạt khám phá, buộc đi đúng chuỗi hay đọc đủ ghi chép. Không cấp nguồn khi đèn ở bệ mà chưa có đường nối được vẽ. Không thêm cảm biến động hoặc chế độ Pulse mới nếu một dấu tĩnh/J cùng phản hồi thế giới là đủ.

## 5. Các câu hỏi còn cần được xác nhận bằng bản dựng

Thiết kế này chưa chứng minh độ khó thực tế, thời gian, bố cục tia, tầm với hay khả năng tránh kẹt ở mọi trạng thái. Khi người dùng yêu cầu dựng/kiểm chứng, cần prototype 01–04 trước với đúng luật và thông tin, rồi quan sát người chơi mới: họ nêu được giả thuyết gì, chỗ nào thử mù, lúc nào H bị dùng vì không hiểu luật hoặc vì không nhìn thấy vật. Các bài 02 liên động và 06 chia nguồn cần đặc biệt kiểm tra khả năng đọc cơ cấu. Không lấy phản hồi demo cũ làm bằng chứng V4 đã khắc phục.
