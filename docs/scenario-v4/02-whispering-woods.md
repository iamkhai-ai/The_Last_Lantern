# 02 — Rừng đom đóm

**Ý chính:** ba tay quay nối bốn vành, hai vành giữa chịu tác động chung; phải dự đoán ảnh hưởng của một lần chỉnh. Pulse hiện liên kết trục; đèn tắt giúp đọc hướng đầu nhận. **Quy mô:** khoảng rừng bia cũ và vòng đường bộ ngắn tới hốc trục. **Thời lượng thiết kế:** 8–12 phút, chưa đo.

## 1. Câu chuyện và ánh sáng

Lumo dẫn Nhinh qua chỗ đàn non từng tập bay. Bốn bia Trăng, Lá, Sao, Nước từng dẫn những nhịp gọi, giờ quay sai hướng sau khi rễ đẩy nền. Ba bia đầu dùng glyph hiện có; bia Nước thêm hình giọt. Lumo biết công dụng, không nhớ/đọc thay cấu hình thiết bị. Cậu gỡ một chiếc chuông cỏ mắc vào bụi: “Tôi vẫn treo lại. Có con thức dậy sẽ cần nó.” Nhinh kể người lái đò thường chờ cô tan học; hai người bắt đầu nói về đời sống trước cuộc đi.

Ánh nền rừng cho thấy đường đất, bia, tay quay, chân cây và hốc kể cả khi F tắt. Không có nguồn gameplay cố định trong khu này. Bật đèn cầm tay tạo vệt ngắn có biên để đọc mặt vành; nó không phải nguồn cấp cho tay quay hay cổng. Lumo cũng không cấp các bia.

Trạng thái đầu: Nhinh vào rừng với đèn cầm tay bật, bốn vành ở (0,0,0,0), ba tay quay ở nấc đầu, cổng xuống thư viện đóng, Lumo đi cùng. Người chơi được tắt F hoặc Pulse ngay; không có cờ khảo sát phải hoàn tất.

Khi đèn tắt và không có vệt sáng rọi vào, đom đóm đậu ở các miệng nhận cố định và làm lộ hướng rãnh mà từng vành phải nối tới. Đích hình học là (2,0,0,2), nhưng dấu tối không nói phải quay bao nhiêu lần hay tay nào tác động lên vành nào. Khi đèn bật, đàn tránh vệt chiếu nên các miệng nhận không lộ. Ánh nền và đường vòng vẫn thấy đủ trong cả hai trạng thái.

## 2. Cơ cấu chính

Mỗi bia có vành ba hướng và một rãnh dẫn. Ba tay quay X/Y/Z nằm trên đường bộ luôn tới được. X nối bằng trục vật lý tới Trăng và Lá; Y tới Lá và Sao; Z tới Sao và Nước. Mỗi lần E quay tay theo chiều đã khắc một bước 120 độ. Lá thuộc X/Y, Sao thuộc Y/Z. Có thể quay lại bằng hai bước tiếp; không random hóa khi sai.

Quy ước tác giả: hướng 0 = Bắc, 1 = Đông Nam, 2 = Tây Nam. Điểm vào bắt đầu (Trăng,Lá,Sao,Nước) = (0,0,0,0).

| Thao tác | Trăng | Lá | Sao | Nước |
| --- | --- | --- | --- | --- |
| E tay X | +1 modulo 3 | +1 modulo 3 | giữ | giữ |
| E tay Y | giữ | +1 modulo 3 | +1 modulo 3 | giữ |
| E tay Z | giữ | giữ | +1 modulo 3 | +1 modulo 3 |

Các miệng kênh cố định trên nền yêu cầu hướng (2,0,0,2). Hướng nhận lộ bằng dấu đom đóm/mực phát quang khi đèn không chiếu vào; không ghi số trong thế giới. Mỗi vành đúng nối một đoạn rãnh, nhưng phải cả bốn cùng nối mới thông mạng. Miệng đi và đến của mỗi vành khác hình để không nhầm quay ngược 180 độ. Các trục quay nhìn thấy cùng chuyển động; mỗi trục có ký hiệu khớp X/Y/Z dạng hình, không chỉ màu.

## 3. Khám phá, Pulse và lời giải

Đường vòng cho nhìn mặt sau Lá/Sao nơi các trục giao nhau. Pulse khi đèn đang cầm và bật làm hiện đường trục bị rêu che, dấu khớp của ba tay quay và những cặp vành dùng chung từng trục. Nó ghi cấu trúc tĩnh vào J, không cho cấu hình đang chạy và không làm lộ hướng đích ở miệng nhận. Tắt đèn sau Pulse không xóa dấu; có thể bật lại để Pulse tiếp. Không có bệ đặt đèn trong màn này. Không khóa tay quay vì chưa đi xem; có thể hiểu từ chuyển động ở phía trước.

Một ghi chú thợ cũ nói: “Các vành ở giữa cùng ăn hai trục. Đừng tháo một vành ra để sửa riêng.” Không ghi số lần quay, đường giải hoặc thứ tự. Dấu tối chỉ cho biết hướng từng miệng nhận; không thêm thông tin về tay quay hay cặp liên kết.

**Một lời giải tham khảo:** X hai lần, Z hai lần, Y một lần, cho (2,0,0,2); thứ tự các thao tác có thể hoán đổi. Có thể quay quá một vòng mà vẫn hợp lệ. Cổng mở khi cả bốn đoạn cùng thông; người chơi E gài hãm cổng từ phía rừng rồi mang đèn đi. Tay quay không cần nguồn nên không sinh khóa phụ khi F.

Lập luận thiết kế: Trăng xác định X=2, Nước xác định Z=2; hai vành giữa yêu cầu Y=1 để (X+Y,Y+Z)=(0,0) modulo 3. Người chơi phải sửa một mạng ghép. Điều quan trọng là giữ kết quả hai đầu rồi hiểu tay giữa có thể sửa đồng thời hai phần còn lại. Tối giúp đọc hướng đích; Pulse giúp đọc liên kết trục. Không lớp nào nêu số lần quay.

Lệch một đoạn thì chỉ đoạn đó hở, còn các rãnh đúng giữ phản hồi. Nếu người chơi thử liên tục, Lumo không tự giải hộ; H có sẵn.

## 4. Kết truyện

Đàn đom đóm đi qua một rãnh sáng mềm; vài con ở lại chờ bên những hốc ngủ. Bản ghi cũ ngắn cho thấy người lớn mang đèn đi khỏi vườn vào cuối ca; dùng được vignette hai bóng người hiện có, không gán họ thành cha/con của Guardian.

> **Nhinh:** “Hồi đó họ cũng đến kiểm tra đèn.”
>
> **Lumo:** “Rồi họ mang đèn về. Vườn được ngủ.”

Cổng xuống thư viện có sơ đồ một vòng gồm cả khoảng sáng và khoảng tối. Người chơi mang câu hỏi về quy trình cũ vào màn 03.

## 5. Phục hồi, H và art

Mọi tay quay và bốn bia cùng phía cổng, có đường bộ tới được trong mọi cấu hình. Sai không đặt lại máy. Lưu ba biến số vòng X/Y/Z modulo 3 làm nguồn chuẩn, tính lại bốn hướng từ chúng; lưu latch cổng, đèn, vị trí người chơi, dấu Pulse thật sự đã phát hiện và các ghi chép. Sau cổng, cơ cấu hãm giữ kết quả dù quay lại chơi với trục.

- **Mức 1 — quan sát:** “Các bia ở hai đầu và hai bia ở giữa nối với cùng số trục hay khác nhau? Tắt đèn để thấy hướng của miệng nhận.”
- **Mức 2 — quan hệ:** “Chỉnh hai đầu bằng X và Z; tay Y có thể đổi hai bia giữa mà không đụng tới hai đầu.”
- **Mức 3 — bước tiếp:** “Căn Trăng và Nước về Tây Nam bằng X và Z, rồi dùng Y đưa cả Lá/Sao về Bắc.” Từ trạng thái đầu là X hai lần, Z hai lần, Y một lần; H tính từ trạng thái thật, không bắt reset.

Giữ rừng, cổng, ba glyph và nhân vật. Mới: glyph Nước, bốn vành ba hướng, ba trục/tay quay, miệng nhận phát quang chỉ đọc khi không có vệt đèn, hốc đom đóm và vài chuông cỏ. Pulse chỉ làm lộ các liên kết trục, không lộ hướng đích; hai lớp không chồng lên nhau thành đáp án. Glyph vẫn là dấu nhận diện, không nhãn thứ tự. HUD: “Nối lại đường dẫn dưới rừng.”
