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

## Nền rừng và đường bộ (P1)

- Một tấm nền 608×232 phủ đúng rect `world`: đường đất vào từ mép trái, rẽ nhánh lên hàng bia và xuống hàng tay quay, rồi chạy tới cổng bên phải.
- Tấm nền bị hạ sáng **0.55 lần** lúc cắt để giữ đúng độ sáng cũ của màn (`0x17261f`); nhờ vậy vật tương tác vẫn nổi trên nền.
- Tấm nền không chứa vật thể, không bóng đổ của vật.

## Trục và dấu khớp (P1)

- Ba thanh trục 80×12 nối tâm hai bia liền kề, đặt ở `y = 140` để thanh chui sau chân bia; chỉ hiện khi sổ tay đã ghi mục tương ứng.
- Ảnh trục bị **kéo ngang** cho đủ 80 px (hình gốc ~3.5:1). Chấp nhận được vì thanh chỉ hiện lúc Pulse, và nếu để đúng tỉ lệ thì thanh không chạm được hai bia.
- Dấu khớp 32×32: một vòng mảnh chứa **hai glyph của cặp bia** mà tay quay điều khiển, nối bằng một thanh ngang. Đây là cách nói "tay X quay Trăng và Lá" bằng hình, không bằng màu.

## Hốc ngủ và chuông cỏ (P1)

- Hốc 64×32 đặt tại (444, 100), tựa vào dải dương xỉ trên cùng; có ba con đom đóm trưởng thành **đậu sẵn**. Không phải vật cản.
- Chuông cỏ 16×20 đặt tại (58, 140), gần lối vào. Không phải vật cản.
- Không vẽ con non, không vẽ dấu hiệu khu vườn đã hồi phục.

## Đom đóm bay và hiệu ứng (P2)

- Ba khung 8×8 (cánh lên, cánh ngang, cánh xuống), đổi khung mỗi 130 ms; mỗi con trôi trên một ellipse nhỏ quanh hốc.
- Đom đóm và hiệu ứng nằm **trên lớp tối** (depth 68.6 và 68.7) nên vẫn đọc như nguồn sáng.
- Hiệu ứng dùng chung một ảnh `glow` 16×16: phóng to và mờ dần trong 420 ms, cho cả lúc vành vừa khớp và lúc cổng mở.
- Khung chuyển cổng: `gate-half` chính là cánh cổng đóng, **dịch lên 20 px** rồi cắt theo canvas, hiện 180 ms trước khi sang `gate-open`. Không sinh ảnh riêng để khỏi lệch thiết kế.

