# Level 02 — art direction (V4)

## Khung hình và phong cách

- Camera cố định 640×360. Sprite xuất ở 1× đúng cỡ runtime; preview trong `previews/` phóng to bằng nearest.
- Rừng lam-lục tối, đá xám lạnh pha tím nhạt, đồng cũ màu mật ong, rêu lục tối ở chân vật. Cùng họ với
  `assets/levels/01-forgotten-forest-edge/v4/ART-DIRECTION.md`.
- Nhìn chính diện, orthographic, hơi thấy mặt trên. Vùng đi lại ít tương phản hơn vật tương tác.
- Không chữ trong ảnh. Chữ thuộc HUD và hội thoại.

## Ký hiệu bia

Ba glyph cũ **được giữ** — Trăng, Lá, Sao — vì kịch bản yêu cầu "ba bia đầu dùng glyph hiện có" và người chơi
phải nhận ra biểu tượng từ V2. Ảnh `runestone_*` cũ **không** được dùng: đó là silhouette của câu đố khác. Cách
làm là giữ ký hiệu, vẽ lại trên đế vuông V4. Bia Nước thêm hình giọt cùng độ dày nét, cùng khung khắc.

Glyph chiếm khoảng 40% bề ngang mặt bia và nằm giữa, chừa viền đá trống để vành xoay không che mất. Đây là lý do
bộ bia phải sinh lại lần hai.

## Vành xoay

- Một sprite dùng chung cho cả bốn bia: vành đồng rỗng, một mấu nhô ở mép trên, hai đinh tán.
- Canvas 32×32, đặt tại (3, 6), đường kính 26. Tâm quay (16, 19) — tâm mặt bia, không phải tâm canvas.
- Ba nấc: 0 = Bắc, 1 = Đông Nam, 2 = Tây Nam, mỗi nấc −120°.
- Vành nằm **trên** mặt bia và phải để lộ glyph ở trong lòng vành.

## Tay quay

- Nhìn thẳng vào mặt bánh, vành đồng dày, mặt gỗ tối, trụ gỗ ngắn ở đáy. Cỡ 16×16.
- Ba hub khác nhau về **hình**, không phải màu: X (hai thanh chéo), Y (chạc ba), Z (thanh gấp khúc).
- Hub được **đóng dấu 1× bằng code** trong `prepare-assets.py`, không hạ mẫu từ ảnh: ở 16 px, một hub vẽ rồi thu
  nhỏ sẽ thành vệt nhoè. Đây là cùng cách màn 01 xử lý "ký hiệu hình học dựng bằng code".

## Cổng và lẫy

- Cánh trượt dọc 8×40, ván gỗ tối, hai đai đồng, tấm ghi vuông ở giữa. **Không** cổng vòm, không hai cánh,
  không portcullis.
- `gate-closed` neo đáy: cánh chạm ngưỡng.
- `gate-open` neo **đỉnh**: phần cánh gom lại nằm ở 4 px trên cùng; phần còn lại trong suốt hoàn toàn để người chơi
  thấy lối đi. Hai sprite cùng canvas 8×40 và cùng vị trí đặt.
- `latch` 8×8: móc đồng trên đế đá phiến, móc quay sang trái qua keeper. Là cơ cấu giữ, không phải tay nắm cửa.

## Miệng nhận

- Bốn socket 12×12, lòng gần đen, viền đá phiến, đường đồng mảnh, rêu một góc. **Không** quầng sáng.
- Thông tin duy nhất là vị trí 2–3 chấm đom đóm 1 px màu hổ phách: Bắc hoặc Tây Nam.
- Khi vòng sáng 40 px của đèn phủ lên, sprite phải gần như không đọc được; chỉ khi không bị chiếu mới lộ hướng.
  Vì vậy không vẽ chi tiết tương phản cao trong lòng socket.
- `mouth-moon` và `mouth-water` đặt chấm ở Tây Nam; `mouth-leaf` và `mouth-star` đặt ở Bắc, khớp đích (2,0,0,2).

## Không vẽ

- Đom đóm non, dấu hiệu khu vườn đã hồi phục, cổng vòm cũ, rune xoắn/tam giác của pilot cũ.
- Nhãn, mũi tên, số, sơ đồ, chữ.
- Bóng đổ ra ngoài silhouette vật.
