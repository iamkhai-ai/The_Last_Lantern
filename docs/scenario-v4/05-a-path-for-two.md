# 05 — Lối đi cho hai người

**Ý chính:** chỉ có một chốt rời; phải chuyển nó sau khi đã tạo hỗ trợ khác. **Quy mô:** bốn khoang ngắn ghép từ bộ hành lang hiện có. **Thời lượng thiết kế:** 12–18 phút, chưa đo.

## 1. Quan hệ nhân vật và ánh sáng

Lumo hỏi: “Cậu vẫn muốn nối nguồn để bến sáng hơn à?” Nhinh trả lời: “Tôi vẫn muốn đưa ánh sáng về nhà. Nhưng tôi sẽ không bỏ phần nước của vườn.” Câu hỏi hướng tới quyết định ở tháp, không gán việc mở cửa hành lang thành tăng tải bến. Không có lựa chọn hội thoại giả; cam kết sẽ được thể hiện bằng giữ đường đi và gọi cậu về.

Trạng thái đầu: Nhinh vào R0 cùng đèn cầm tay; F giữ trạng thái mang từ 04, mặc định tắt (puzzle-contracts §1 “Đèn khi chuyển màn”); K nằm ở đai dụng cụ; Lumo theo cô; A/B/C/D chưa được giữ bằng chốt; chốt cố định B và D đang nhả. Ánh nền hành lang giúp đọc chân cửa, khối va chạm, ống, mốc và rãnh trên nền ở cả hai trạng thái. Không có nguồn gameplay cố định; các đốm phản quang dưới ống chỉ là lớp đọc, không kích A/B/C/D. Đèn bảo trì chỉ chiếu một vệt ngắn lên vật gần thật sự nằm trong footprint; F ảnh hưởng việc đọc dấu trong vệt đó, không mở cửa hay thay vị trí Lumo. Không có bệ đèn trong màn này. Ánh tự thân của Lumo đủ dẫn đường nhưng không mở cửa; ấn chỉ hoạt động khi cậu thực sự tới nơi.

Khi đèn cầm không rọi vào đó, vệt phấn phát quang quanh tay hồi mặt sau cửa hiện rõ hơn, cùng dấu xước hình chữ K trên rãnh đang mở. Chúng cho biết chốt rời có thể chuyển và tay hồi nằm phía nào; không chỉ định cửa nào phải dùng chốt trước. Bật F ở nơi khác không che phấn xuyên phòng; chỉ vệt thật sự chạm dấu mới giảm tương phản. Ánh nền vẫn làm mọi mặt đứng và lối đi đọc được.

## 2. Sơ đồ và điều khiển

R0 — A — R1 — B — R2 — C — R3 — D — đường tới tháp.

Lumo có các ấn PA/PB/PC/PD; cậu chỉ ở một ấn. A/B/C mở theo ấn cùng tên hoặc được chống bằng K. D là cửa cuối, cần Lumo ở PD **và** đường ống đi qua cửa C đang mở. Khớp ống gắn trên cánh C nên trạng thái này nhìn thấy được. D có chốt cố định ở R3 để giải phóng Lumo sau khi mở.

| Vật | Vị trí | Chức năng |
| --- | --- | --- |
| Mốc MA và MB | R0 | Gọi Lumo tới PA hoặc PB qua hai ống khác nhau |
| Mốc MC | R1 | Gọi tới PC |
| Mốc MD | R2 | Gọi tới PD |
| Chốt rời K | Ở đai Nhinh khi vào R0 | Chống một trong A/B/C đang mở; nhặt lại từ phía tiếp cận được |
| Chốt cố định B | R2, phía sau B | Giữ B lâu dài |
| Chốt cố định D | R3, trước D | Giữ D khi cửa đang mở |

Các nút gọi chỉ gửi tới đích được vẽ; không cho gọi tới bất kỳ ấn từ bất kỳ phòng. Nút gọi về là hành động riêng. Chỉ phía xa sau khi qua cửa có tay hồi nối đến ấn của chính cửa: hồi A ở R1, hồi B ở R2, hồi C ở R3. Không đặt hồi B ở R1 hay hồi C ở R2 vì chúng sẽ thay các mốc tiến sâu và làm chốt rời mất ý nghĩa. Mặt trước chỉ có đường ống kín; mặt sau có tay bảo trì để người bị mắc có thể quay về. Đường ống đủ chỗ Lumo, không đủ cho Nhinh.

## 3. Luật và lời giải tham khảo

Pulse khi đèn cầm tay và bật có thể làm hiện dấu khắc tĩnh nối MA/MB/MC/MD với các ống tương ứng và ký hiệu hai loại chốt. Nó không báo Lumo đang ở đâu, không kích ấn và không thay việc đọc cửa. J lưu dấu đã phát hiện; không cần Pulse để gọi.

K là vật cơ khí ở đai dụng cụ, có thể mang cùng đèn. Chỉ gắn vào cửa có rãnh K khi cửa đang mở thật; gắn vào B là hợp lệ nhưng có thể phải chuyển lại. K không phát sáng hoặc kích ấn Lumo, không thể đặt vào một ấn để thay cậu ở các màn sau. Các bộ phận không tiêu hao và không tự quay về chỗ cũ.

1. MA đưa Lumo tới PA. Chống A bằng K.
2. Vẫn từ R0, MB chuyển Lumo sang PB. A giữ bằng K nên Nhinh đi qua A và B tới R2.
3. Gài chốt cố định B ở R2. Giờ B không cần Lumo/K.
4. Trở về R0 qua B/A, dùng MA để Lumo giữ A. Nhặt K tại A; đi sang R1 khi A còn được giữ.
5. Tại MC ở R1, gửi Lumo tới PC. A đóng phía sau nhưng B đã giữ, đường R1–R2 còn thông. Mang K tới chống C.
6. Từ MD ở R2, gửi Lumo tới PD. C vẫn mở nhờ K nên ống cấp tới D còn nối. Qua C tới R3, gài D.
7. Gọi Lumo về; D vẫn mở. K có thể lấy khỏi C nếu người chơi muốn mang đi. C đóng khi bỏ K; thao tác chỉ cần Nhinh đứng trên nền R3 an toàn. D đã giữ đường tới tháp, nên việc thu K không khóa lối ra. Nếu muốn quay lại R2, dùng tay hồi C ở R3 để gọi Lumo về PC và mở C; khi đó có thể đi qua hoặc gắn lại K vào cửa đang mở. K không bắt buộc cho màn 06; nếu để lại, lưu rõ chỗ gắn và không tạo softlock tương lai.

K ở A cho phép MB tại R0 mở B mà Nhinh vẫn đi qua A. K ở C giữ ống tới D nối khi PD thay PC. Chốt cố định B cho phép chuyển K; việc chuyển có lý do vật lý. Khi D đã chốt, nó không còn cần nguồn qua C. Đây là một lời giải mẫu, không phải khóa chuỗi; mọi cấu hình cửa và ống hợp lệ được chấp nhận.

## 4. Phục hồi và lưu

Gọi Lumo về luôn được; cửa chưa được giữ bằng K/chốt sẽ cập nhật theo vị trí mới của cậu, nhưng không phạt hay xóa chốt đã gài. Nếu việc gọi về làm lối trước mặt đóng, dùng mốc gọi được đặt ở phía đang đứng hoặc tay hồi bảo trì ở phía sau chính cánh cửa để đưa Lumo tới ấn phù hợp. Tay hồi A ở R1, B ở R2, C ở R3; chúng khôi phục đúng cửa đó, không gọi tự do tới mọi ấn. Hồi B ở R2 không giúp mở B lần đầu từ R1; hồi A ở R1 chỉ mở A nên không tạo cách giữ cả A/B mà bỏ K. K có thể tháo từ vị trí đang đứng khi Nhinh ở nền an toàn; không cần đặt ra điều kiện phải có đường đi sẵn sang bên kia. Nếu muốn quay lại sau khi tháo, dùng tay/mốc hồi mở cửa tương ứng rồi đi qua hoặc gắn lại K. Không gắn K vào cửa đang đóng. Không tự nhốt Nhinh trong khung cửa khi rút K.

Các vị trí mốc là phần chức năng của bài: dời MB sang R1 sẽ làm K ở A mất ý nghĩa; thêm mốc PD ở R3 vẫn không bỏ yêu cầu ống qua C. Khi dựng phải giữ đồ thị này hoặc thiết kế lại có giải thích. F chỉ ảnh hưởng footprint đèn và dấu đọc, không tắt ấn Lumo. Đèn không được dùng làm chiếc chốt thứ hai.

Lưu K đang ở đai/cửa nào, các chốt B/D, đích và vị trí Lumo, phòng, đèn và nguồn, dấu Pulse, điểm đứng/checkpoint. Có checkpoint sau B và sau D trên nền an toàn. Nếu lưu khi Lumo đang bay, tải tiếp đến đích hoặc trở về điểm đứng an toàn; không giả cậu đã giữ ấn.

## 5. Thoại, H và art

Khi K được chuyển khỏi A an toàn, Lumo: “Lần này tôi thấy được cậu đã giữ đường nào.” Nhinh: “Cậu cứ nói khi cần về. Tôi kiểm tra chốt trước.” Ở cuối: “Qua tháp rồi mình tới vườn chứ?” — “Tới vườn.”

- **Mức 1 — quan sát:** “B có bộ hãm riêng ở phía bên kia. A và C chỉ có rãnh gắn chốt rời.”
- **Mức 2 — quan hệ:** “Giữ được B bằng chốt cố định sẽ cho phép mang chốt rời đi tiếp.”
- **Mức 3 — bước tiếp:** “Chống A, gọi Lumo mở B, qua gài B. Gọi lại PA để lấy chốt A, đem nó tới C trước khi chuyển Lumo sang PD.” Chỉ nêu đoạn đang thiếu; H không buộc Pulse.

Giữ bộ đá/ống/dấu/màng/cửa và các âm gọi. Thêm khoang R3 nếu cần, K có sprite gắn/tháo, khớp ống trên C, ký hiệu D và phấn phát quang dưới tay hồi. Mỗi ký hiệu mốc/ấn đồng nhất, không dùng nhớ màu hay nhớ số phòng như đáp án. HUD: “Giữ một đường cho cả hai qua trạm.”
