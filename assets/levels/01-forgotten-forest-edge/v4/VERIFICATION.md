# Kiểm tra bộ art Level 01 V4

Ngày: 2026-10-24 (Asia/Saigon).

## Phạm vi cố định

- Nền nhánh: `6dfbfc99148afca127132433dc0d562a5eb59dd5`.
- Script xuất: SHA-256 `f71c50e386e47b8c6ae9925de1a498612f613e0d1d88d9ebdf1962abbcaa5011`.
- Asset map: SHA-256 `fbb35e9dd145c76b87dd31ee23f6c445f6a57ed692c784bc519d2daa05686b63`.
- Hash từng ảnh nguồn và ảnh xuất nằm trong asset map. Các kết quả dưới đây gắn với các file tại hai hash trên, không phải với mọi thay đổi tương lai trên nhánh.

## Kết quả thực chạy

| Kiểm | Kết quả | Bằng chứng |
| --- | --- | --- |
| Chạy script xuất bằng Node + sharp | PASS | Exit 0; “Exported 42 assets and 5 state previews.” |
| Kiểm hash nguồn và layout | PASS | asset-checks.json |
| Kích thước ảnh = 2× kích thước game, hash và nội dung không rỗng | PASS | 42 ảnh trong asset-checks.json |
| Alpha thật ngoài sprite | PASS | Đếm pixel trong suốt và lõi đục |
| Canvas và anchor của các cặp trạng thái | PASS | 8 cặp trong asset-checks.json |
| Khe A/B theo tọa độ và alpha trong lối đi | PASS | A x336..376; B x456..504; lấy mẫu ở 80% chiều cao ảnh |
| Năm bản xem kích thước 640×360 | PASS | asset-checks.json |
| Xem trực quan bản mở màn, hai cửa mở và debug | PASS | view_image; tường, khe và chân mái trạm khớp vị trí quy định |
| Chạy gameplay/animation trong engine | NOT_RUN | Chưa có tích hợp level trong phạm vi art |
| Reach audit mới | NOT_RUN | Không sửa layout; không tái sử dụng kết quả cũ như bằng chứng mới |
| Unit test/build game | NOT_RUN | Không sửa mã gameplay |

Tổng kiểm dữ liệu: **69 PASS, 0 FAIL**. Lượt kiểm dữ liệu dùng Node + sharp đọc ảnh và manifest; báo cáo không thay thế kiểm trong engine.

## Review độc lập

Hai reviewer được gọi bằng native Codex, yêu cầu model `gpt-6-luna`, effort `high`, có trong danh sách runtime cho phép. Công cụ không trả trường model/effort đã resolve, nên giá trị resolve không được xác nhận riêng.

- `/root/art_review_a`: kiểm script, crop, anchor, khe cửa/collider, trạng thái và ảnh ghép. Không có finding Required/Critical/Optional P2.
- `/root/art_review_b`: kiểm xuất ảnh, đăng ký bố cục, đủ P0/P1/P2, alpha, ký hiệu chung và ảnh xem. Không có finding.
- Cả hai xác nhận đúng hash script và manifest ở trên. Không chia sẻ finding vòng hiện tại cho reviewer còn lại trước khi cả hai hoàn tất.
- Sau lượt đầu, phù hiệu cột được tăng lên 10×10 px trong game để dễ nhận ra. Đã xuất lại, kiểm lại 69 mục và nhận hai lượt re-review độc lập trên hash cuối ở trên; cả hai không có finding.
- Chuẩn hóa cuối cùng chỉ xóa một LF thừa ở cuối script. Phép cộng lại đúng một LF tái tạo hash được review trước đó `12e9d2d8f1256668ea781749cff09500d1914c1da536fdc515b5609d67b10fab`; đã kiểm lại 42 hash ảnh không đổi. Bằng chứng tương đương byte được ghi trong asset-checks.json.
- Hai reviewer cùng model có thể có điểm mù tương quan. Đây là review theo chỉ dẫn chỉ đọc, không phải sandbox kỹ thuật.
- Review không phải quyền merge/push/release và không xác nhận art đã tích hợp.

## Cần kiểm khi tích hợp

Kiểm sắp lớp theo chân, tán cây che nhân vật, trạng thái sáng tách khỏi chốt giữ cửa, thời gian Pulse, hoạt ảnh đóng cửa có người đứng trong khe, đặt ký hiệu tại bảng kiểm xưởng và khả năng đọc ở kích thước màn hình đích.
