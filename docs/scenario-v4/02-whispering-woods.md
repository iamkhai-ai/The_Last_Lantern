# 02 — Rừng đom đóm

**Ý chính:** ba tay quay nối bốn vành, hai vành giữa chịu tác động chung; phải dự đoán ảnh hưởng của một lần chỉnh. **Quy mô:** khoảng rừng bia cũ và vòng đường bộ ngắn tới hốc trục. **Thời lượng thiết kế:** 8–12 phút, chưa đo.

## 1. Câu chuyện

Lumo dẫn Nhinh qua chỗ đàn non từng tập bay. Bốn bia Trăng, Lá, Sao, Nước từng dẫn những nhịp gọi, giờ quay sai hướng sau khi rễ đẩy nền. Ba bia đầu dùng glyph hiện có; bia Nước thêm hình giọt. Lumo biết công dụng, không nhớ/đọc thay cấu hình thiết bị. Cậu gỡ một chiếc chuông cỏ mắc vào bụi: “Tôi vẫn treo lại. Có con thức dậy sẽ cần nó.” Nhinh kể người lái đò thường chờ cô tan học; hai người bắt đầu nói về đời sống trước cuộc đi.

Mục tiêu: nối bốn đoạn kênh tín hiệu tới cổng thư viện. Đàn đom đóm phản ứng sau khi mạng được nối; không bay ra một chuỗi đáp án để người chơi bấm theo.

## 2. Cơ cấu chính

Mỗi bia có vành ba hướng và một rãnh dẫn. Ba tay quay X/Y/Z nằm trên đường bộ luôn tới được. X nối bằng trục vật lý tới **Trăng và Lá**; Y tới **Lá và Sao**; Z tới **Sao và Nước**. Mỗi lần E quay tay theo chiều đã khắc một bước 120 độ. Lá thuộc X/Y, Sao thuộc Y/Z. Có thể quay lại bằng hai bước tiếp; không random hóa khi sai.

Quy ước tác giả: hướng 0 = Bắc, 1 = Đông Nam, 2 = Tây Nam. Điểm vào bắt đầu `(Trăng,Lá,Sao,Nước)=(0,0,0,0)`.

| Thao tác | Trăng | Lá | Sao | Nước |
| --- | --- | --- | --- | --- |
| E tay X | +1 modulo 3 | +1 modulo 3 | giữ | giữ |
| E tay Y | giữ | +1 modulo 3 | +1 modulo 3 | giữ |
| E tay Z | giữ | giữ | +1 modulo 3 | +1 modulo 3 |

Các miệng kênh cố định trên nền yêu cầu `(2,0,0,2)`. Đây là hướng hình học được vẽ rõ khi Pulse, không là mã số được nói trong thế giới. Mỗi vành đúng nối một đoạn rãnh, nhưng phải cả bốn cùng nối mới thông mạng. Miệng đi và đến của mỗi vành khác hình để không nhầm quay ngược 180 độ. Các trục quay nhìn thấy cùng chuyển động; mỗi trục có ký hiệu khớp X/Y/Z dạng hình, không chỉ màu.

## 3. Khám phá, lời giải và phản hồi

Đường vòng cho nhìn mặt sau Lá/Sao nơi các trục giao nhau. Không khóa tay quay vì chưa đi xem; có thể hiểu từ chuyển động ở phía trước. Pulse hiện miệng kênh và đường trục bị rêu che, lưu sơ đồ vào J. Tắt đèn giúp thấy đàn đom đóm đậu trên đường nối đã thông; đó là phản hồi, không nguồn tin độc quyền chỉ có âm thanh.

Một ghi chú thợ cũ: “Các vành ở giữa cùng ăn hai trục. Đừng tháo một vành ra để sửa riêng.” Không ghi số lần quay, đường giải hoặc thứ tự.

**Một lời giải:** X hai lần, Z hai lần, Y một lần, cho `(2,0,0,2)`; thứ tự các thao tác có thể hoán đổi. Có thể đi quá một vòng mà vẫn hợp lệ. Cổng mở khi cả bốn đoạn cùng thông, người chơi E gài hãm cổng từ phía rừng rồi mang đèn đi. Tay quay không cần nguồn nên không sinh khóa phụ khi F.

Lập luận thiết kế: Trăng xác định X=2, Nước xác định Z=2; hai vành giữa yêu cầu Y=1 để `(X+Y,Y+Z)=(0,0)` modulo3. Người chơi phải sửa một mạng ghép. Điều quan trọng là giữ kết quả hai đầu rồi hiểu tay giữa có thể sửa đồng thời hai phần còn lại. Không dùng số cấu hình tới được để tuyên bố độ khó đã đủ; cần quan sát liệu người chơi đọc được trục và có dự đoán trước thao tác hay không.

Lệch một đoạn thì chỉ đoạn đó hở, còn các rãnh đúng giữ phản hồi. Không reo “đúng bước1/2” như chuỗi cũ. Nếu người chơi thử liên tục, Lumo không tự giải hộ; H có sẵn.

## 4. Kết truyện

Đàn đom đóm đi qua một rãnh sáng mềm; vài con ở lại chờ bên những hốc ngủ. Bản ghi cũ ngắn cho thấy người lớn mang đèn đi khỏi vườn vào cuối ca; dùng được vignette hai bóng người hiện có, không gán họ thành cha/con của Guardian.

> **Nhinh:** “Hồi đó họ cũng đến kiểm tra đèn.”
>
> **Lumo:** “Rồi họ mang đèn về. Vườn được ngủ.”

Cổng xuống thư viện có sơ đồ một vòng gồm cả khoảng sáng và khoảng tối. Người chơi mang câu hỏi về quy trình cũ vào màn 03.

## 5. Phục hồi, H và art

Mọi tay quay và bốn bia cùng phía cổng, có đường bộ tới được trong mọi cấu hình. Sai không đặt lại máy. Lưu ba biến số vòng X/Y/Z modulo3 làm nguồn chuẩn, tính lại bốn hướng từ chúng; lưu latch cổng và các ghi chép. Sau cổng, cơ cấu hãm giữ kết quả dù quay lại chơi với trục.

- **Mức 1 — quan sát:** “Các bia ở hai đầu và hai bia ở giữa nối với cùng số trục hay khác nhau?”
- **Mức 2 — quan hệ:** “Chỉnh hai đầu bằng X và Z; tay Y có thể đổi hai bia giữa mà không đụng tới hai đầu.”
- **Mức 3 — bước tiếp:** “Căn Trăng và Nước về Tây Nam bằng X và Z, rồi dùng Y đưa cả Lá/Sao về Bắc.” Từ trạng thái đầu là X hai lần, Z hai lần, Y một lần; H tính từ trạng thái thật, không bắt reset.

Giữ rừng, cổng, ba glyph và nhân vật. Mới: glyph Nước, bốn vành quay có rãnh, ba trục/tay quay, vài hốc/chuông cỏ. Glyph vẫn là dấu nhận diện, không nhãn thứ tự. HUD: “Nối lại đường dẫn dưới rừng.”
