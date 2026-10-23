# RULE_GAMES.md — Luật tương tác và không gian (bắt buộc cho mọi agent)

## 0. Phạm vi và thứ bậc

File này quy định **khi nào và ở đâu người chơi tương tác được với một vật**: tầm với, chỗ đứng, phân xử, phản hồi và cách kiểm tra. Nó không quy định truyện, câu đố hay luật gameplay.

Khi các tài liệu khác nhau, thứ tự quyết định là:

1. Tài liệu màn trong `docs/scenario-v4/` — truyện, bố cục, câu đố, lời giải, trạng thái lưu của từng màn.
2. `docs/scenario-v4/puzzle-contracts.md` — luật gameplay chung: đèn, Pulse, Lumo, chốt, cầu, manh mối, lưu game.
3. File này — luật kỹ thuật cho tương tác và không gian, áp dụng như nhau cho mọi màn.

File này không nêu tên màn, file màn, tọa độ hay hằng số của một màn cụ thể. Mọi điều riêng của một màn nằm trong data của màn đó (xem mục 8).

Vi phạm một luật dưới đây chỉ được chấp nhận khi đã khai báo là ngoại lệ theo mục 8.

## 1. Thân bàn chân

- Mọi phép đo tầm với và chỗ đứng dùng **thân bàn chân**: hình chữ nhật 14×6 px ở chân nhân vật, cũng là phần va chạm với đồ vật.
- Kích thước và vị trí thân bàn chân được khai báo **một lần duy nhất** trong `Player`. Màn chơi không tự khai báo lại hay đặt kích thước khác.

## 2. Tầm với: 8px từ mép khối, mọi hướng

- Mỗi vật đứng (bệ, cột, tay quay, gương, bia, máy…) có một **khối va chạm** khớp với chân đế nhìn thấy trên hình.
- Nút `[E]` hiện khi khoảng cách giữa thân bàn chân và khối va chạm **≤ 8px**; ẩn khi lớn hơn 8px.
- Khoảng cách đo giữa hai hình chữ nhật, tính từ **mép ngoài cùng** của khối, ở cả bốn phía. Ở góc, khoảng cách đo theo đường chéo. Thân bàn chân chạm hoặc chồng lên khối thì khoảng cách là 0.
- Mọi vật tương tác **bắt buộc** khai báo tầm với theo luật này. Không dùng bán kính quanh tâm vật, tâm sprite hay một điểm đứng để quyết định hiện nút.
- Tọa độ truyền khi đăng ký vật chỉ dùng để neo vị trí nút `[E]` và để phân xử (mục 5).

## 3. Vật phẳng trên nền

- Vật phẳng là vật người chơi đi lên được: ô, hốc, phiến đặt dưới sàn, tấm nhấn.
- Nút `[E]` hiện khi **tâm thân bàn chân nằm trong hình chữ nhật của ô**. Đứng ngoài ô, kể cả sát mép, thì nút ẩn.
- Bệ hoặc trụ có khối nhô lên khỏi nền không phải vật phẳng; chúng theo mục 2.

## 4. Cổng, cửa và điều khiển gắn tường

- Vật chỉ tiếp cận được từ một số mặt (tay gạt trên tường, khóa ở cánh cửa, cần ở mép nước) phải khai báo **các mặt tiếp cận được**.
- Nút `[E]` hiện khi thân bàn chân ở phía ngoài của một mặt tiếp cận được và cách mặt đó ≤ 8px. Đứng ở phía trong tường, sau cửa hay dưới nước thì không tính.
- Lối chuyển cảnh không dùng E: chuyển cảnh xảy ra khi thân bàn chân đi vào vùng kích hoạt đặt ngay trong lòng lối ra, ở phía người chơi đi tới.
- Không đặt điều khiển trên phần có thể biến mất hoặc di chuyển: mặt cầu, cánh cửa, rễ mọc, khung nâng. Điều khiển luôn nằm trên nền cố định.

## 5. Phân xử khi vùng tầm với chồng nhau

- Khi thân bàn chân nằm trong tầm của nhiều vật, vật có khoảng cách nhỏ hơn thắng. Bằng nhau thì vật đăng ký trước thắng.
- Nên đặt các khối va chạm cách nhau hơn 16px để hai vùng 8px không chồng nhau.
- Một vật đang được chọn mất quyền ngay khi thân bàn chân ra khỏi tầm của nó.

## 6. Chỗ đứng

- **Đi được:** chỗ đứng tương tác phải là vị trí thân bàn chân không chồng lên tường hay khối va chạm nào. Vị trí không đi được không bao giờ hiện nút.
- **Không bị HUD che:** khối va chạm, chỗ đứng và nút `[E]` của mọi vật tương tác nằm ngoài vùng các tấm HUD (`HUD_LAYOUT` trong `CampaignHud`). Nút `[E]` nằm trọn trong khung 640×360.
- **Tới được ở mọi trạng thái cần dùng:** với mỗi trạng thái thế giới mà một điều khiển còn thay đổi được điều gì, hoặc là đường phục hồi theo tài liệu màn, phải có đường đi bộ từ vị trí người chơi có thể đang đứng (kể cả điểm tải checkpoint) tới một chỗ đứng hợp lệ của nó.
- **Checkpoint:** điểm tải là vị trí đi được, không nằm trong khung cửa, trên cầu hay trong vùng có thể đóng lại.

## 7. Phản hồi

- Vật trông giống đồ tương tác thì phải trả lời E. Không có đồ trang trí giống vật tương tác mà không phản hồi.
- Điều khiển chưa dùng được vẫn hiện nút và khi nhấn E thì nói rõ **điều kiện còn thiếu**, không im lặng.
- Lời phản hồi chỉ nêu điều vừa xảy ra hoặc điều kiện còn thiếu, không nêu lời giải (theo `puzzle-contracts.md` mục 3).

## 8. Ngoại lệ

- Mọi ngoại lệ với mục 1–7 được khai báo **trong data của vật**, kèm một trường lý do bằng chữ. Không chấp nhận ngoại lệ chỉ ghi trong comment hay trong tài liệu.
- Script kiểm tra (mục 9) đọc trường này, bỏ qua luật bị miễn cho đúng vật đó và in danh sách ngoại lệ trong báo cáo.
- Ngoại lệ không được dùng để né luật vì bố cục khó; khi đó sửa bố cục.

## 9. Kiểm tra

Sau mọi thay đổi vật tương tác, khối va chạm hoặc bố cục:

1. Chạy `npm run build`.
2. Chạy script kiểm tra tương tác dùng chung cho mọi màn. Script phải xác nhận, cho từng vật:
   - lấy mẫu vị trí thân bàn chân quanh khối va chạm: nút hiện **khi và chỉ khi** vị trí đi được và khoảng cách ≤ 8px (mục 2–4);
   - phân xử đúng ở những chỗ hai vùng chồng nhau (mục 5);
   - chỗ đứng không bị HUD che và tới được ở mọi trạng thái mà mô hình trạng thái của màn đánh dấu là cần dùng (mục 6).
3. Khi thêm một **loại** vật mới, chơi thử: đứng ở bốn phía và bốn góc, xác nhận nút hiện trong 8px và ẩn khi xa hơn.
