# Level 01 — art V4

## Phạm vi

Tạo bộ P0 và P1 theo `docs/implementation/v4/01-forest-edge-layout.json` tại commit `6dfbfc9`. Bổ sung P2 nếu giữ được độ nhất quán. Không thay collider, cơ chế hoặc thoại. Mọi ảnh mới nằm trong thư mục `v4`, không ghi đè bộ cũ.

## Khung hình và phong cách

- Camera cố định 640×360, xuất PNG ở 2×. Nhinh có thân nhìn thấy khoảng 28 px ở 1×.
- Rừng xanh lam pha lục, đá xám lạnh, đồng cũ màu mật ong. Vùng đi lại ít tương phản hơn vật tương tác.
- Chiều sâu từ lớp rừng tối, mặt trên tường sáng nhẹ, mặt đứng tối, rêu ở khe đá và bóng tiếp xúc. Không thêm vật cản ngoài layout.
- Giữ cây lớn bên trái, mái trạm phía phải và bia có ốp đồng nối ống như tranh mở đầu.
- Cửa A và cổng B nhìn chính diện. Không dùng cổng vòm hoặc vòng đá đứng cũ.
- Các trạng thái dùng chuyển động cơ khí, vị trí thanh/móc và độ sáng; không phân biệt chỉ bằng màu.

## Ký hiệu chung

Ký hiệu tuyến nước là một ống dọc chia thành hai nhánh, kết thúc bằng hai vòng nối. Bảng nhỏ trong xưởng và cột tuyến nước dùng cùng một ảnh ký hiệu, không sinh hai bản gần giống. Đây là định nghĩa mới cho chi tiết chưa được chuẩn hóa trong art xưởng. Cần lắp bảng vào xưởng khi tích hợp.

## Xuất và kiểm

Nguồn sinh ảnh được giữ nguyên cùng prompt. Xuất sprite trong canvas cố định, alpha thật, anchor và tọa độ đặt ghi ở manifest. Dây bảo trì và ký hiệu hình học được dựng bằng code. Kiểm kích thước, alpha, hash và bố cục ở 640×360; ảnh preview không được coi là bằng chứng đã tích hợp vào game.

Phụ thuộc tích hợp: nền V4 cần level host cho forest-edge, vị trí đèn dưới đất và logic trạng thái. Công việc hiện tại cung cấp art, không triển khai level.
