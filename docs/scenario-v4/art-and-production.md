# V4 — Art và tác động sản xuất

Đây là kế hoạch dùng lại/tạo thêm theo kịch bản, chưa phải bộ art được vẽ hoặc tích hợp. Người dùng cho phép mở rộng, tạo/vẽ lại đồ họa để có kết quả tốt, ưu tiên dùng một phần có sẵn. Vì các câu đố V4 đã mở rộng, bảng dưới thay cho ước lượng sơ bộ trước đó rằng có thể giữ nguyên mọi nền.

## 1. Quyết định về quy mô

| Khu | Giữ hoặc dùng làm nền tảng | Phần phải thiết kế mới/chỉnh |
| --- | --- | --- |
| Prologue | Nhinh, đèn bảo trì, bảng màu và tranh đi đường phù hợp | Xưởng chơi được, mẹ/lái đò, đèn khách, bàn/khay/bảng kiểm; đoạn nhận nhiệm vụ |
| 01 | Rừng/bia/cổng/đèn/dấu Pulse | Sân giữa, bệ S1/S2, chốt rõ, hình đầu nối kín |
| 02 | Rừng, ba glyph, cổng, vignette phù hợp | Glyph Nước, bốn vành ba hướng, ba trục/tay quay, miệng kênh; hốc ngủ/chuông |
| 03 | Phòng giếng, phiến hai lớp, tinh thể, phù điêu | Gian mô hình bốn chặng, van/cấp/hồi/kho nhận; UI ghi chép hai lớp |
| 04 | Bộ đá/bờ/gương/cầu và phù điêu bão | Đảo/tay truyền động G1, hai hãm ở Đông và thanh nối tới A, cần hồi đúng từng bờ, T/N, phản hồi nước và liên lạc |
| 05 | Bộ hành lang/ống/màng/mốc/ấn | Khoang thứ tư khi cần, chốt rời, cửa C có khớp ống, cửa D, nút hồi phía xa |
| 06 | Phòng tháp, khoang, gương/lăng kính, luồng nước | Nhánh chia thứ hai, chỉ báo mức bằng vạch, hốc liên lạc; sửa khăn đỏ/ghi âm |
| 07 | Gần như toàn bộ bố cục vườn/hoa/rễ/bể/van | Hốc kén, con non, vài đồ dùng Lumo và pose nghỉ |
| 08 | Phế tích/tượng/khóa/Shadow | Đường quang học ngoài, hai gương trục chung, bóng khớp hình học; có thể nới sân |
| 09 | Ba phòng và họ đồ họa đài hiện có | Hốc minh họa khung nâng, tay hồi, ký ức cứu hộ/trì hoãn/khóa van; bỏ vật riêng về con gái |
| 10 | Cây/rễ/tinh thể/cơ cấu/bình minh và xưởng prologue | Khung chia cố định thứ hai sau G0 dùng lại mẫu ở 08; van chế độ, cửa chắn nguồn trắng nối thanh trung tâm, thao tác bàn giao, montage dân vận hành, pose bữa cơm |

Các đường dẫn tham khảo asset là `assets/levels/01-forgotten-forest-edge` đến `10-the-heart-of-elaria`, cùng `shared`. Nhiều thư mục có concept/offline và runtime khác nhau; khi dựng phải chọn đúng phiên bản người dùng đã duyệt, không lấy tên `v3` của art làm đồng nghĩa `V3` cốt truyện.

## 2. Quy tắc hình ảnh phục vụ suy luận

Giữ vật liệu đá, đồng, kính và rễ. Dòng bảo trì mảnh, có dấu đầu nối; đường nước/năng lượng chính dày hơn, có vạch mức và mũi tên. Nguồn thử tắt sau cam kết nhưng đường chính còn hoạt động phải phân biệt được ngay.

Mọi chốt cho nhìn được thanh cơ khí đang đỡ. Chốt rời có tay cầm, túi đai và hình gắn thống nhất. Hồi khẩn ở phía xa cửa không được trang trí thành nút gọi toàn mạng. Trục liên động vẽ liền mạch; vành cùng bị tác động chuyển cùng một nhịp. Các glyph không kiêm cả dấu định danh lẫn đáp án.

Cần làm nền theo hình học puzzle đã khóa: chiều tia, ốp kín, vùng bóng, đường chân người, lối tiếp cận van và đường rút. Không vẽ trước một phòng đẹp rồi giấu collider/đích không khớp vào đó. Khung 640×360 không đủ thì chia phòng có đường nối dễ hiểu.

Mỗi trạng thái âm thanh cần hình tương ứng; bóng tối vẫn đủ nhìn đường. Không bake chữ, nhân vật, tia sống, HUD hoặc lời giải vào nền. Dùng art cũ theo bộ phận, không coi ảnh concept ghép là background sạch.

## 3. Thứ tự dựng được đề xuất cho một đợt sau

1. Prototype xưởng và 01–04 bằng hình đủ đọc, giữ nguyên luật/manh mối; đánh giá độ khó demo trước khi làm đẹp đầy đủ.
2. Khóa giao ước một nguồn, chốt, Pulse, phạm vi sáng và tín hiệu trước khi làm 05–06.
3. Dựng 07–09 để kiểm chuyển giao rễ/bóng và liên phòng; chốt 10 dựa trên các luật người chơi thực sự đã học.
4. Hoàn thiện art, hoạt ảnh, thoại và montage sau khi bố cục hoạt động; giữ các asset được chọn làm gốc.

Đây là thứ tự đề xuất, không phải báo cáo triển khai. Cần kế hoạch kỹ thuật/save riêng nếu chuyển runtime từ V2 sang V4. Bản hiện tại không chạy build, không sửa scene, không sinh ảnh và không đo chi phí sản xuất.
