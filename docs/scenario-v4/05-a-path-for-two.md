# 05 — Lối đi cho hai người

**Ý chính:** chỉ có một chốt rời; phải chuyển nó sau khi đã tạo hỗ trợ khác. **Quy mô:** bốn khoang ngắn ghép từ bộ hành lang hiện có. **Thời lượng thiết kế:** 12–18 phút, chưa đo.

## 1. Quan hệ nhân vật

Lumo hỏi: “Cậu vẫn muốn nối nguồn để bến sáng hơn à?” Nhinh trả lời: “Tôi vẫn muốn đưa ánh sáng về nhà. Nhưng tôi sẽ không bỏ phần nước của vườn.” Câu hỏi hướng tới quyết định ở tháp, không gán việc mở cửa hành lang thành tăng tải bến. Không có lựa chọn hội thoại giả; cam kết sẽ được thể hiện bằng giữ đường đi và gọi cậu về.

## 2. Sơ đồ và điều khiển

`R0 — A — R1 — B — R2 — C — R3 — D — đường tới tháp`.

Lumo có các ấn PA/PB/PC/PD; cậu chỉ ở một ấn. A/B/C mở theo ấn cùng tên, hoặc được chống. D là cửa cuối, cần Lumo ở PD **và đường ống đi qua cửa C đang mở**. Khớp ống gắn trên cánh C nên trạng thái này nhìn thấy được. D có chốt cố định ở R3 để giải phóng Lumo sau khi mở.

| Vật | Vị trí | Chức năng |
| --- | --- | --- |
| Mốc MA và MB | R0 | Gọi Lumo tới PA hoặc PB qua hai ống khác nhau |
| Mốc MC | R1 | Gọi tới PC |
| Mốc MD | R2 | Gọi tới PD |
| Chốt rời K | R0 lúc đầu | Chống một trong A/B/C đang mở; nhặt lại được từ hai phía |
| Chốt cố định B | R2, phía sau B | Giữ B lâu dài |
| Chốt cố định D | R3, trước D | Giữ D khi cửa đang mở |

Các nút gọi chỉ gửi tới đích được vẽ; không cho gọi tới bất kỳ ấn từ bất kỳ phòng. Nút gọi về là hành động riêng. Chỉ **phía xa sau khi qua cửa** có nút hồi nối đến ấn của chính cửa: hồi A ở R1, hồi B ở R2, hồi C ở R3. Không đặt hồi B ở R1 hay hồi C ở R2 vì chúng sẽ thay các mốc tiến sâu và làm chốt rời mất ý nghĩa. Mặt trước chỉ có đường ống kín; mặt sau có tay bảo trì để người bị mắc có thể quay về. Đường ống đủ chỗ Lumo, không đủ cho Nhinh.

## 3. Luật và lời giải tham khảo

K là một vật cơ khí ở đai dụng cụ, có thể mang cùng đèn. Chỉ gắn vào cửa có rãnh K đang mở thật; gắn vào B là hợp lệ nhưng có thể phải chuyển lại. K không phát sáng hoặc kích ấn Lumo, không thể đặt vào một ấn để thay cậu ở các màn sau. Các bộ phận không tiêu hao và không tự quay về chỗ cũ.

1. MA đưa Lumo tới PA. Chống A bằng K.
2. Vẫn từ R0, MB chuyển Lumo sang PB. A giữ bằng K nên Nhinh đi qua A và B tới R2.
3. Gài chốt cố định B ở R2. Giờ B không cần Lumo/K.
4. Trở về R0 qua B/A, dùng MA để Lumo giữ A. Nhặt K tại A; đi sang R1 khi A còn được giữ.
5. Tại MC ở R1, gửi Lumo tới PC. A đóng phía sau nhưng B đã giữ, đường R1–R2 còn thông. Mang K tới chống C.
6. Từ MD ở R2, gửi Lumo tới PD. C vẫn mở nhờ K nên ống cấp tới D còn nối. Qua C tới R3, gài D.
7. Gọi Lumo về, D vẫn mở; quay lại lấy K khỏi C nếu muốn mang đi. C đóng khi bỏ K nên phải lấy từ phía R3 và ở lại phía này; đèn luôn đi cùng Nhinh hoặc có thể thu hồi bằng đường đã mở trước thao tác. Chốt K không là vật bắt buộc cho màn 06; nếu để lại, được ghi như một lựa chọn chống cửa, không tạo softlock tương lai.

K ở A là cần thiết để MB tại R0 mở B mà vẫn đi qua A. K ở C là cần thiết để PD thay PC mà ống tới D còn nối. Chốt cố định B cho phép chuyển K; việc chuyển có lý do vật lý. Khi D đã chốt, nó không còn cần nguồn qua C.

## 4. Phục hồi

Gọi về quá sớm làm cửa chưa chống đóng; nút hồi phía xa đưa Lumo về ấn để người chơi quay lại. Phía gần khôi phục bằng mốc gốc trong khu trước đó. Hồi B ở R2 không giúp mở B lần đầu từ R1; hồi A ở R1 chỉ mở A nên không tạo cách giữ cả A/B mà bỏ K. K có thể lấy từ bên đang đứng nếu cửa giữ bằng Lumo, hoặc rút rồi khôi phục cửa bằng mốc/nút hồi đúng phía. Không được tự nhốt Nhinh trong khung cửa khi rút K.

Các vị trí mốc là phần chức năng của bài: dời MB sang R1 sẽ làm K ở A mất ý nghĩa; thêm mốc PD ở R3 vẫn không được bỏ yêu cầu ống qua C. Khi dựng phải giữ đồ thị này hoặc thiết kế lại có giải thích. F chỉ ảnh hưởng đọc mực/dấu, không tắt ấn Lumo. Đèn không được dùng làm chiếc chốt thứ hai.

Lưu K đang ở đai/cửa nào, các chốt B/D, đích và vị trí Lumo, room, đèn. Có checkpoint sau B và sau D. Lưu khi Lumo đang bay thì tải tiếp đến đích hoặc trở về điểm đứng an toàn, không giả cậu đã giữ ấn.

## 5. Thoại, H, art

Khi K được chuyển khỏi A an toàn, Lumo: “Lần này tôi thấy được cậu đã giữ đường nào.” Nhinh: “Cậu cứ nói khi cần về. Tôi kiểm tra chốt trước.” Ở cuối: “Qua tháp rồi mình tới vườn chứ?” — “Tới vườn.”

- **Mức 1 — quan sát:** “B có bộ hãm riêng ở phía bên kia. A và C chỉ có rãnh gắn chốt rời.”
- **Mức 2 — quan hệ:** “Giữ được B bằng chốt cố định sẽ cho phép mang chốt rời đi tiếp.”
- **Mức 3 — bước tiếp:** “Chống A, gọi Lumo mở B, qua gài B. Gọi lại PA để lấy chốt A, đem nó tới C trước khi chuyển Lumo sang PD.” Chỉ nêu đoạn người chơi đang thiếu.

Giữ bộ đá/ống/dấu/màng/cửa và các âm gọi. Thêm khoang R3 nếu cần, K có sprite gắn/tháo, khớp ống trên C và ký hiệu D. Mỗi ký hiệu mốc/ấn đồng nhất, không dùng nhớ màu hay nhớ số phòng như đáp án. HUD “Giữ một đường cho cả hai qua trạm.”
