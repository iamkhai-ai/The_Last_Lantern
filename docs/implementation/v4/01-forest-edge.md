# Màn 01 — Bìa rừng quên lãng: layout V4 và danh sách art

Nguồn duy nhất: `docs/scenario-v4/01-forgotten-forest-edge.md`, `puzzle-contracts.md`, `00-prologue.md` (cảnh nghỉ cuối), `RULE_GAMES.md`. Tọa độ nằm trong `01-forest-edge-layout.json`. Ảnh blockout: `previews/01-forest-edge-blockout.png` (và bản `-debug`), dựng bằng `scripts/mockup-v4-forest-edge.py`.

**Art cũ không dùng làm bố cục.** Thư mục `assets/levels/01-forgotten-forest-edge/` trên `test-develop` giống hệt nhánh này. Nó thuộc thiết kế cũ (vòng đá đứng, mắt Nhật trên cổng vòm đá, dấu chân Pulse). Màn 01 khi chơi trên `test-develop` (`previews/01-reference-test-develop-ingame.png`) ghép từ bộ rừng, bia, đèn và cổng vòm cũ, và không có sân giữa, bệ hay chốt. V4 chỉ giữ được bộ rừng, Nhinh, Lumo và một phần bia/đèn.

**Mốc liên tục:** tranh `03-maintenance-station` và `05-morning-without-dawn` của đợt prologue V4 đã định sân trạm: cây lớn bên trái (chỗ Nhinh ngủ), bia đá có ốp đồng và ống đồng, đèn đặt cạnh bia, mái trạm gỗ phía sau. Màn 01 mở đúng chỗ đó.

## 1. Thiết kế

### Một màn hình, hai sân

Cả màn nằm gọn trong một khung 640×360, không cuộn camera. Lý do:

- Kịch bản cần người chơi thấy cổng B ngay từ sân đầu.
- Kịch bản cần người chơi thấy cửa A khép "ngay trong tầm mắt" khi nhấc đèn ở S1.
- Phép kiểm HUD của `RULE_GAMES` §6 tính theo tọa độ màn hình.

```
          [rừng 02]
   ┌──────┤cổng B├──────┐
   │  S2      hãm B  cột │   SÂN GIỮA (lát đá, rãnh khô)
   │        chốt A       │
───┴──────┤cửa A├────────┘
 cây lớn  bia đèn  S1          mái trạm
 bản lề        mầm+Lumo        SÂN VÀO (cỏ, lối đất)
```

- **Sân vào** (sân cũ, hình chữ L, giữ khoảng rộng như tranh): cây lớn, bia, đèn đặt dưới đất, mô hình bản lề, mầm cây có Lumo, bệ S1 cạnh cửa A, mái trạm (chỉ là cảnh).
- **Tường trạm** chạy ngang, mặt quay về người chơi. Cửa A nằm trong tường đó. Mắt nhận sáng của A ở mặt ngoài, cạnh trái khung cửa. Đường dây S1→A chạy sát đất từ ổ kín của S1 tới mắt nhận.
- **Sân giữa** sau tường:
  - Chốt A dựng ngay sau tường, phía đông cửa. Đầu chốt nhô qua đỉnh tường nên đứng ở sân vào vẫn thấy, nhưng chỉ chạm được từ sân giữa.
  - Bệ S2, có đường dây chạy tới mắt nhận của B.
  - Tay hãm B nằm phía đông cổng.
  - Cột ký hiệu tuyến nước có rãnh khô chạy ra.
- **Cổng B** ở tường bắc, mặt quay về người chơi, dẫn lên rừng 02.

### Trình tự (một đường tham khảo; mọi cấu hình hợp lệ đều được chấp nhận)

1. Nhinh tựa gốc cây lớn, vừa tỉnh. Đồng hồ đã qua giờ sáng. Đèn bảo trì đặt dưới đất cạnh bia, đang tắt. HUD: "Kiểm tra trạm bìa rừng."
2. E ở đèn để nhặt. Lần đầu đèn bật (F, khi cầm hoặc khi đặt trên bệ), thoại Lumo trong kịch bản §1 chạy một lần: Lumo hiện rõ giữa lá ở mầm cây, rồi tới thỏa thuận. Xong thoại, Lumo theo Nhinh và HUD đổi thành "Mở đường qua trạm."
3. Bia: E đọc. Hai lần quan sát ngắn dạy F và Pulse. Pulse đứng gần S1 sẽ lộ đường dây S1→A (nửa chìm trong rêu) và dấu dụng cụ ở chốt A. Bán kính 195 phủ tới chốt A qua tường. Cả hai dấu được ghi vào J.
4. Đặt đèn lên S1 và bật: A mở, thanh lò xo căng. Nếu nhấc đèn trước khi gài chốt, A khép ngay. Lumo nói đúng một câu: “Thanh cửa vừa tụt xuống.”
5. Đi qua A, E ở chốt A để gài (chỉ gài được khi A đang mở). Quay ra lấy đèn; A vẫn mở.
6. Đặt đèn lên S2 và bật: B mở. E ở tay hãm B để gài (chỉ khi cánh B mở thật). Lấy đèn đi.
7. Gài B lần đầu thì chạy cảnh kết §5 một lần, ở cột tuyến nước: “Đường này nối về bến.” / “Cũng từng nối về vườn tôi.”
8. Đi qua B cùng Lumo để sang màn 02. Muốn rời màn phải cầm đèn trong tay (xem các câu cần duyệt).

Mô hình bản lề là tùy chọn và không đặt cờ bắt buộc. Mỗi lần nhấn E làm một bước theo vòng: kéo rồi thả (cánh tự đóng), kéo rồi cài móc (cánh giữ mở), tháo móc.

### Luật và phục hồi

- `A_open = S1_live || latchA`; `B_open = S2_live || latchB`; `S_live = đèn trên bệ đó && đang bật`. Không dùng cờ "đã từng chiếu". Đèn cầm tay không cấp vào ổ kín.
- Cánh cửa đang có người đứng giữa thì giữ mở tới khi người qua hết (puzzle-contracts, phần Cầu/cửa).
- **Đèn không thể mang vào sân giữa khi A chưa gài.** Nhấc đèn ở S1 là A đóng, mà S1 cách cửa khoảng 30px.
- **F ở sân giữa làm A đóng** (khi chưa gài): F bật lại được từ bất kỳ đâu trong màn. Chốt A vẫn chạm được khi cửa đóng; bấm E lúc đó thì nhận câu từ chối.
- **Mở lại chốt A khi đèn đang ở sân giữa:** A đóng, nhưng mọi thứ còn cần (S2, hãm B, lối ra) đều ở phía B nên vẫn đi tiếp được. Đây đúng là câu "S2, tay hãm B … cùng phía B nên không kẹt" của kịch bản.
- Chốt B giữ vĩnh viễn sau khi rời màn.

### Trạng thái lưu

Dùng `levels['forest-edge']`:

- `lantern`: vị trí (`ground` cạnh bia, `s1`, `s2` hoặc trong tay) và `on`.
- `latchA`, `latchB`, `hingeHooked`.
- Sự kiện một lần: `lumo-met`, `stele-read`, `bar-dropped-line`, `ending-seen`.
- Dấu đã thấy trong J: `line-s1-a`, `latch-tool-marks`.

Cửa/cổng tính lại từ trạng thái, không lưu. Checkpoint `yard` (gốc cây) và `courtyard` (giữa sân giữa) đều không nằm trong ô cửa.

**Lưu ý cho nền tảng:** `LanternLocation` hiện chỉ có tay hoặc bệ. Màn này cần thêm vị trí "đặt dưới đất" (một ô nghỉ không cấp nguồn cho gì) và trạng thái bắt đầu là tắt.

### HUD, gợi ý H, sổ tay J

| Giai đoạn | Mục tiêu | H (quan sát → quan hệ → bước) |
| --- | --- | --- |
| Trước khi gặp Lumo | Kiểm tra trạm bìa rừng. | (không có gợi ý, chỉ cần nhặt và bật đèn) |
| Chưa gài A | Mở đường qua trạm. | Thanh bên trong cửa A khác với mắt nhận sáng ở phía ngoài. → Đèn đang làm cửa mở. Một bộ phận khác có thể giữ nó khi đèn đi nơi khác. → Để đèn ở S1, qua A gài chốt, rồi quay lại lấy đèn sang S2. |
| Đã gài A, chưa gài B | Mở đường qua trạm. | H1 và H2 như trên, áp vào cổng B. H3 chỉ nhắc tay hãm B (kịch bản §5). |
| Đã gài B | Mở đường qua trạm. | (nhắc mang đèn qua cổng B) |

J (chữ cần duyệt, kịch bản không có sẵn):

- `line-s1-a`: “Đường dây kín chạy từ bệ S1 tới mắt nhận của cửa A.”
- `latch-tool-marks`: “Vết dụng cụ quanh chốt A: người bảo trì từng gài cửa này bằng tay.”

### Bố cục (640×360; chỗ đặt tạm, chốt lại khi có nền)

| Vật | Loại reach | Rect `{x,y,w,h}` | Ghi chú |
| --- | --- | --- | --- |
| World | — | `{16,0,608,330}` | đáy 330, trên dải phím (333) |
| Bia | block, rắn | `{160,206,28,12}` | cạnh đèn |
| Đèn dưới đất | block, không rắn | `{208,228,12,8}` | biến mất sau khi nhặt |
| Mô hình bản lề | block, rắn | `{112,268,24,14}` | tùy chọn |
| Bệ S1 | block, rắn | `{282,240,24,24}` | ổ kín, đường dây tới mắt A |
| Cửa A (cánh) | — | `{336,190,40,24}` | rắn khi đóng; khe trong tường `y 190..214` |
| Chốt A | block, rắn | `{392,166,16,16}` | chỉ chạm được từ sân giữa |
| Bệ S2 | block, rắn | `{420,96,24,24}` | đường dây tới mắt B |
| Cổng B (cánh) | — | `{456,36,48,16}` | rắn khi đóng; khe trong tường bắc |
| Tay hãm B | block, rắn | `{520,60,16,16}` | |
| Cột tuyến nước | rắn (chân cột) | `{568,88,16,16}` | cột cao khoảng 56px; cảnh kết |
| Lối ra | vùng | `{456,0,48,20}` | bắc cổng B |
| Checkpoint `yard` | — | spawn `(124,214)`, vùng `{80,190,110,80}` | gốc cây lớn |
| Checkpoint `courtyard` | — | spawn `(480,150)`, vùng `{440,120,90,50}` | |

Tường, cây lớn và mái trạm có số liệu đầy đủ trong `01-forest-edge-layout.json`. Đỉnh trái màn hình (dưới bảng nhiệm vụ HUD) là tán cây, không đặt vật tương tác.

**Đã kiểm bằng `src/v4/core/reachAudit.ts`:**

- Không có lỗi ở cả 4 trạng thái A/B.
- Từ `yard` tới được bia, đèn, bản lề và S1.
- Từ `courtyard` tới được chốt A, S2 và hãm B.
- Chốt A và S2 chỉ tới được từ sân vào khi A mở.
- Lối ra chỉ tới được khi B mở.

Kịch bản kiểm tạm này chưa commit; khi dựng sẽ chuyển thành test của màn.

## 2. Art cần làm

Tỉ lệ theo Nhinh (khung 36×42, thân nhìn thấy khoảng 28px). Xuất ở 2× như xưởng: nền 1280×720, sprite gấp đôi kích thước trong bảng. Không bake chữ, HUD, nhân vật, ánh sáng sống hay cửa/chốt vào nền. Nền phải khớp collider trong blockout; có thể vẽ đè lên `01-forest-edge-blockout-debug.png`.

### P0 — chặn việc dựng

| # | Asset | Trạng thái | Cỡ 1× (ước) | Ghi chú |
| --- | --- | --- | --- | --- |
| 1 | **Nền sân trạm** | một | 640×360 | Sân vào: cây lớn trái, cỏ, lối đất, hoa, mái trạm. Hai bức tường trạm (ngang và bắc) có khe trống ở chỗ cửa A và cổng B. Sân giữa lát đá, có rãnh khô. Cùng bảng màu với tranh 03/05. Để trống chỗ các vật bên dưới. |
| 2 | **Cánh cửa A** có thanh lò xo | đóng · mở (lò xo căng) | 40×36 | Cửa nhìn chính diện. Thanh lò xo phải thấy rõ là phần kéo cửa về. |
| 3 | **Chốt A** (chốt cố định) | nhả · gài (móc ăn vào cửa) | 16×30 | Dựng sau tường, đầu nhô qua đỉnh tường. Phải thấy rõ thanh cơ khí đang đỡ. |
| 4 | **Cánh cổng B** | đóng · mở | 48×40 | Cùng họ với A, lớn hơn. Có thể dùng chung khung đá với cổng ra rừng. |
| 5 | **Tay hãm B** | nhả · gài | 16×28 | Khác hình với chốt A để người chơi không nhầm. |
| 6 | **Bệ S1/S2** có ổ kín | trống · có đèn | 24×34 | Ổ có ốp che kín và đầu ra cho đường dây. Đèn trên bệ phải giống đèn Nhinh cầm. Lúc bật chỉ cần thêm quầng sáng (dựng bằng code). |
| 7 | **Mắt nhận sáng** cho A và B | ngủ · sống | 12×12 | Gắn trên mặt tường. Có thể thu nhỏ `sun-eye-dormant/full` cũ nếu bạn thấy hợp. |
| 8 | **Đèn bảo trì đặt dưới đất** | tắt | 12×18 | Phải khớp đèn trong tranh 03/05 và đèn trong frame Nhinh cầm. `pickup-lantern.png` cũ có màu cam và kiểu khác. |

### P1 — cần cho bản chơi đủ nghĩa

| # | Asset | Trạng thái | Cỡ 1× | Ghi chú |
| --- | --- | --- | --- | --- |
| 9 | **Bia trạm** (có ốp đồng và ống đồng như tranh) | thường · chữ sáng | 28×40 | Thay `beacon-stone-*` cũ, vốn không có ốp đồng/ống. |
| 10 | **Đường dây bảo trì** S1→A, S2→B | chìm rêu · lộ (viền mờ) · sống | theo đường | Dạng nét mảnh có dấu đầu nối. Có thể vẽ bằng code nếu bạn muốn bớt việc. |
| 11 | **Dấu dụng cụ** ở chốt A (lớp Pulse) | lộ | 16×12 | Kiểu nét sáng như các dấu Pulse khác. |
| 12 | **Cột ký hiệu tuyến nước** | một | 16×56 | **Ký hiệu phải trùng ký hiệu trong xưởng.** Bạn chọn/định ký hiệu nào thì vẽ ký hiệu đó. |
| 13 | **Mô hình bản lề** | đóng · kéo mở · cài móc | 24×20 | Đồ vật nhỏ trên giá. Ba trạng thái phải đọc được ngay. |
| 14 | **Mầm cây** Lumo che | một | 16×16 | Có thể dùng `garden-mechanisms/sprout-before` nếu hợp tỉ lệ. |

### P2 — có thì đẹp hơn

- Nhinh ngồi tựa gốc cây và đứng dậy (1–2 khung). Không có thì dùng mờ dần.
- Lớp tán cây phủ phía trên (để Nhinh đi "dưới" lá) và đom đóm.
- Nhịp đóng sập của cửa A khi thanh lò xo kéo về (2–3 khung).

### Dùng lại được

- Nhinh (240 khung) và Lumo `lumo_0..3`.
- Bộ rừng `forest-expansion/sprites-v2` (cây cổ thụ, cỏ ven đường) và `bush_woods`, cho viền rừng nếu nền không vẽ sẵn.
- Ô nền đất/cỏ trong `assets/ground-tiles`.

**Không dùng nữa:** cổng vòm đá `woods_arch_*` (152×156, quá to và không có cánh hay thanh hãm), vòng đá đứng và dấu chân Pulse.

## 3. Câu chữ cần bạn duyệt (V4 không có, thêm tối thiểu cho `RULE_GAMES` §7)

- Nhắc E:
  - Đèn và bệ: `E: nhặt đèn` / `E: đặt đèn lên bệ` / `E: lấy đèn`.
  - Chốt A: `E: gài chốt A` / `E: mở chốt A`.
  - Hãm B: `E: gài hãm B` / `E: nhả hãm B`.
  - Bia: `E: đọc bia`.
  - Bản lề: `E: kéo thử` / `E: kéo và cài móc` / `E: tháo móc`.
- Câu từ chối:
  - Chốt A khi cửa đóng: “Chốt chỉ ăn khi cửa A đang mở.”
  - Hãm B khi cổng đóng: “Tay hãm chỉ gài được khi cánh B mở.”
  - Ra cổng mà không cầm đèn: “Đèn còn trên bệ.”
- Hai dòng J ở trên. Hai câu bia (dạy F, dạy Pulse) cần viết theo giọng V4.

## 4. Bước tiếp theo khi dựng (sau khi có art P0)

- `forestEdgeLayout.ts` sinh từ JSON này.
- `forestEdgeLogic.ts` thuần, có test (tham khảo đường, nhấc đèn sớm, từ chối chốt, mở lại chốt ở sân giữa, tải lại, `auditReach` theo từng trạng thái).
- `ForestEdgeLevel.ts` dùng host V4.
- Thêm vị trí đèn "dưới đất" vào nền tảng.
