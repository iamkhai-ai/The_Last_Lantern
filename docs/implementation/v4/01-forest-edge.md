# Màn 01 — Bìa rừng quên lãng: layout V4 (bản 2) và danh sách art

Trạng thái: **bản nháp để duyệt**, chưa phải code. Nguồn: `docs/scenario-v4/01-forgotten-forest-edge.md` (commit `80299c9`), `puzzle-contracts.md` (mục "Vệt đèn", "Pulse, J và dấu đã phát hiện", "Đèn khi chuyển màn"), `00-prologue.md` (cảnh nghỉ cuối), `RULE_GAMES.md`. Tọa độ: `01-forest-edge-layout.json`. Ảnh blockout: `previews/01-forest-edge-blockout.png` và `-debug.png`, dựng bằng `scripts/mockup-v4-forest-edge.py`.

## 0. Thay đổi so với bản 1

| Chủ đề | Bản 1 | Bản 2 (theo kịch bản mới) |
| --- | --- | --- |
| Chỗ đặt đèn lúc đầu | "đèn dưới đất" cạnh bia | **bệ `s0` cạnh bia** (ổ kín, không có đầu nối). Xem §8 |
| Ánh nền | không nói | ánh nền rêu tĩnh; tắt F **không** phủ tối toàn màn |
| Dấu tối | không có | 3 bào tử + 3 vết chân ở sân giữa; 2 bào tử ở bản lề (§6) |
| Mầm cây và Lumo | mục P1 | cảnh mở đầu: vệt đèn chiếu mầm cây Lumo đang che (P0) |
| Vệt đèn | chưa đo | 56 px dài, gốc 12, đầu 32, 8 hướng; quầng 12 px (`light.ts`) |
| Pulse | chỉ bia | khắc đá S1→A và dấu chốt A; chỉ khi đèn ở tay và bật |
| Lối ra | cổng B | cổng B; phải cầm đèn trong tay khi qua |

## 1. Thiết kế

### Một màn hình, hai sân

Cả màn nằm trong một khung 640×360, không cuộn camera. Lý do: kịch bản yêu cầu thấy cổng B ngay từ sân đầu và thấy cửa A khép "ngay trong tầm mắt" khi nhấc đèn ở S1.

```
          [rừng 02]
   ┌──────┤cổng B├──────┐
   │  S2      hãm B  cột │   SÂN GIỮA (lát đá, rãnh khô)
   │        chốt A       │
───┴──────┤cửa A├────────┘
 cây lớn  bia s0  S1          mái trạm
 bản lề     mầm+Lumo         SÂN VÀO (cỏ, lối đất)
```

- **Sân vào:** cây lớn, bia (cạnh đó là bệ `s0`), mô hình bản lề (tùy chọn), mầm cây có Lumo che, bệ S1 cạnh cửa A, mái trạm (chỉ là cảnh).
- **Tường trạm** chạy ngang, mặt quay về người chơi. Cửa A nằm trong tường. Đường dây kín từ S1 tới mắt nhận của A ở mặt ngoài.
- **Sân giữa** (phòng `courtyard`, sau tường): chốt A ngay sau cửa, bệ S2 có đường dây tới B, tay hãm B, và cột ký hiệu tuyến nước có rãnh khô.
- **Cổng B** ở tường bắc, dẫn lên rừng 02.

### Trạng thái đầu và cảnh mở màn

- Đèn bảo trì đặt trên `s0`, **tắt**. Nhinh đã đặt nó cạnh bia trước khi nghỉ (prologue).
- Cảnh mở đầu (một lần): Nhinh nhặt đèn, bật thử, chiếu thẳng vào mầm cây Lumo đang che. Cảnh này là nơi duy nhất tự bật đèn. Đoạn đối thoại xong thì Lumo theo Nhinh và HUD đổi thành "Mở đường qua trạm."

### Trình tự tham khảo (không bắt buộc)

1. Nhặt đèn ở `s0` (E), bật (F). Cảnh mở đầu chạy một lần.
2. Đứng gần bia, E để đọc. Lần đầu bia dạy F và Pulse: nhấc đèn, bật, rồi Pulse. Pulse hiện khắc đá S1→A và dấu chốt A (§6). Dấu được ghi vào J.
3. Đặt đèn lên S1 và bật: A mở, thanh lò xo căng.
4. Đi qua A (khi A mở), E ở chốt A để gài. Chốt chỉ gài được khi A đang mở.
5. Quay ra lấy đèn từ S1; A vẫn mở nhờ chốt.
6. Đặt đèn lên S2 và bật: B mở. E ở tay hãm B để gài, khi B đang mở.
7. Lấy đèn từ S2 (B vẫn mở nhờ hãm). Lần gài B đầu tiên chạy cảnh kết ở cột tuyến nước (§5), một lần.
8. Qua B cùng Lumo, **cầm đèn trong tay**, sang màn 02.

Mô hình bản lề là tùy chọn, không đặt cờ bắt buộc. Mỗi lần nhấn E làm một bước theo vòng: kéo rồi thả (cánh tự đóng), kéo rồi cài móc (cánh giữ mở), tháo móc.

## 2. Ánh sáng và bố cục

- **Ánh nền:** rêu nhạt làm rõ mặt đường, mép cổng, chốt, bệ và tường **kể cả khi đèn tắt**. Ánh nền là tĩnh, không đổi theo F, và không phải nguồn cảm biến. Không có nguồn cố định gameplay ở màn này.
- **Vệt đèn cầm tay** (dùng `light.ts`): hình thang từ tay cầm, dài 56 px, gốc rộng 12 px, đầu rộng 32 px, theo 8 hướng. Khi đứng yên, Nhinh giữ hướng quay cuối; muốn rọi một vật, người chơi bước một nhịp rồi dừng. Vệt bị tường và cánh cửa đang đóng chắn.
- **Quầng đèn:** vòng bán kính 12 px quanh đèn. Quầng đặt trên bệ cũng bị tường và cửa chắn.
- **Đầu nối kín:** A và B là **ổ kín**. Chỉ nhận qua đúng bệ S1/S2 và đường dây đã vẽ. Đèn cầm tay không kích được. Mắt nhận sáng trên tường chỉ là chỉ báo, không là đích của vệt.
- **Bệ `s0`** không có đường dây; đèn đặt tại đó không cấp cho cửa nào. Quầng 12 px quanh `s0`, S1 và S2 không chứa dấu sáng/tối nào (kiểm bằng script, §8).

## 3. Luật và câu đố

- **Pulse** dùng được khi đèn ở tay và đang bật. Hiện khắc tĩnh `line-s1-a` (S1→A) và `latch-tool-marks` (chốt A). Pulse không bật cửa, không đổi trạng thái gì. Dấu đã phát hiện được ghi vào J với viền mờ. Không có thời hạn nhấn E sau Pulse.
- **A** mở khi S1 đang nhận nguồn, hoặc khi chốt A đang gài. **B** mở khi S2 đang nhận nguồn, hoặc khi hãm B đang gài. Hai bệ không cùng nhận vì chỉ có một đèn. Không dùng cờ "đã từng chiếu".
- **Chốt A** nằm ở sân giữa. Gài vào thanh đang mở thì A giữ, dù F tắt hoặc Nhinh lấy đèn đi.
- **Hãm B** ở sân giữa chỉ gài được khi cánh B đang mở. Sau khi gài, B giữ độc lập với đèn.
- **Lumo** theo Nhinh, chưa dạy ấn gọi. Ánh Lumo chỉ dẫn đường, không mở A/B.
- Cửa không mở vì người chơi đã từng chiếu sáng; phải có nguồn ở đúng bệ hoặc chốt đang giữ.

## 4. Sai và phục hồi

- **Nhấc đèn ở S1 trước khi gài A:** A khép ngay, trong tầm mắt. Lumo nói đúng một câu: "Thanh cửa vừa tụt xuống." Đèn đặt lại được ngay từ sân vào.
- **F ở sân giữa khi chưa gài A:** A đóng. Đèn vẫn ở S1; F từ bất kỳ vị trí nào trong màn bật lại được, nên A mở lại. Chốt A vẫn tiếp cận được khi cửa đóng, nhưng chỉ gài được khi cánh mở. Không cần đi qua cửa đã đóng để bật nguồn.
- **Đèn bật ở S1 rồi đi về S2:** A vẫn mở vì nguồn còn ở S1; B chưa có nguồn nên đóng.
- **Đèn đang trong tay ở sân giữa, A đã đóng:** không kẹt, vì S2 nằm trong sân giữa. Đặt đèn lên S2 và bật thì B mở; khi đó gài hãm B. Từ sân giữa không có đường nào khác về sân vào, nên người chơi phải dùng S2 này để đi tiếp.
- **Người đang đứng trong khung cửa khi nguồn mất:** cánh giữ mở đến nền an toàn (luật cầu/cửa chung).
- **Gài rồi mở lại chốt:** hợp lệ. S2, hãm B và đường tới S1 cùng phía B nên không kẹt khi thử sai.
- **Checkpoint:** `yard` (gốc cây lớn) và `courtyard` (giữa sân giữa). Cả hai không nằm trong khung cửa, hợp lệ với F bật lẫn F tắt.

## 5. Kết và H

Nhinh thấy ký hiệu tuyến nước trên cột giống trong xưởng. "Đường này nối về bến." Lumo nhìn rãnh khô: "Cũng từng nối về vườn tôi." Câu hỏi mang sang 02: trước đây con người và rừng đã cùng sử dụng mạng ra sao?

H, ba mức:
- **Mức 1 — quan sát:** "Thanh bên trong cửa A khác với mắt nhận sáng ở phía ngoài. Khi tắt đèn, đường bào tử nào vẫn hiện?"
- **Mức 2 — quan hệ:** "Đèn đang làm cửa mở. Một bộ phận khác có thể giữ nó khi đèn đi nơi khác."
- **Mức 3 — bước tiếp:** "Đặt đèn ở S1, qua A và gài chốt từ sân giữa; sau đó quay lại lấy đèn sang S2." Sau khi A gài, H chỉ nhắc tay hãm B nếu cần.

## 6. Dấu sáng/tối và Pulse

| Id | Loại | Vị trí (rect) | Đọc được khi | Thấy từ |
| --- | --- | --- | --- | --- |
| `sprout` | sáng | `{228,240,16,16}` | vệt đèn cầm tay chiếu vào | sân vào |
| `spores-latch-1..3` | tối | 3 cụm quanh chốt A | đèn không chiếu vào | sân giữa, A mở |
| `steps-latch-1..3` | tối | 3 vết chân từ cửa tới chốt | đèn không chiếu vào | sân giữa, A mở |
| `spores-hinge-1..2` | tối | 2 cụm cạnh bản lề | đèn không chiếu vào | sân vào |
| `line-s1-a` | Pulse (khắc) | `(310,224)` | Pulse trong 195 px | bia |
| `latch-tool-marks` | Pulse (khắc) | `(400,174)` | Pulse trong 195 px | sân giữa |

Luật chung (puzzle-contracts): dấu tối chỉ đọc được khi không có footprint nào chồng lên; dấu được **ghi là đã thấy** khi đọc được, chân Nhinh trong 64 px, cùng phòng, và không bị tường hoặc cánh đang đóng chắn. Cờ này chỉ để xem lại trong J; không là điều kiện mở cửa, cầu, H hay cảnh truyện.

Đề xuất text cho J (cần duyệt):
- `line-s1-a`: "Đường khắc nối bệ S1 với khung cửa A."
- `latch-tool-marks`: "Vết dụng cụ quanh chốt A: có người từng gài cửa này bằng tay."
- `steps-latch`: "Vết chân nhỏ đi từ cửa A tới chốt."
- `spores-latch`: "Bào tử phát sáng mờ dọc lối vào sau cửa A khi đèn tắt."
- `spores-hinge`: "Bào tử quanh bản lề vẽ một đường ngắn về phía thanh lò xo."

## 7. Trạng thái lưu

Lưu: vị trí đèn (`s0`, S1, S2, hoặc đang cầm), F bật/tắt, `latchA`, `latchB`, `hingeHooked`, vị trí và chế độ Lumo, các dấu Pulse thật sự phát hiện, các dấu tối đã thấy, và sự kiện một lần: `opening-seen`, `stele-read`, `bar-dropped-line`, `ending-seen`.

Không lưu: trạng thái cửa A/B (tính lại từ nguồn và chốt), hướng quay của Nhinh, footprint của đèn. Sau khi tải, quầng và vệt tính lại từ vị trí đèn hiện tại.

## 8. Quyết định đang mở

**Mâu thuẫn:** luật chung nói E chỉ đặt và nhặt đèn **tại bệ**. Nhưng kịch bản và cảnh cuối prologue nói đèn nằm **cạnh bia**.

- **(a) — đang dùng trong bản này:** thêm bệ `s0` cạnh bia. Bệ là ổ kín, không nối dây; đèn đặt tại đây không cấp cho gì. Giữ nguyên luật chung. Cần thêm art bệ (P0).
- **(b) — phương án thay thế:** giữ đèn trên đất cạnh bia và ghi là ngoại lệ một lần ở đầu màn. Không cần art bệ, nhưng phải thêm luật ngoại lệ vào `RULE_GAMES` và engine.

Nếu chọn (b), đổi `s0` thành một vật nhỏ không tương tác và bỏ mục bệ trong art.

## 9. Kiểm đã làm

Script kiểm nằm ở scratchpad, không commit. Dùng `reachAudit.ts`, `light.ts`, `lightAudit.ts` và `pulse.ts` từ `feat/v4-foundation`, chạy trên layout v2.

- **Reach audit** (`auditReach`): không lỗi ở cả 4 trạng thái A/B.
- **Tầm với:** `stele`, `s0`, `hinge`, `s1` tới được từ sân vào. `latchA`, `s2`, `brakeB` tới được từ sân vào khi A mở, và `brakeB`, `latchA`, `s2` tới được từ sân giữa. Lối ra chỉ mở khi B mở.
- **Dấu sáng/tối:** mỗi dấu có ít nhất một vị trí đứng thấy được và đọc được đúng trạng thái (`hasAimArea`). Dấu tối trong sân giữa chỉ kiểm khi A mở, vì đó là điều kiện thấy.
- **Quầng bệ:** không dấu tối nào nằm trong quầng 12 px của `s0`, S1 hoặc S2.
- **Pulse:** có vị trí đứng sát bia mà `line-s1-a` nằm trong 195 px.
- **Checkpoint:** cả hai đứng được và không nằm trong khung cửa.

Phép thử âm: thêm dấu tối vào quầng S1, dấu không thấy được, và Pulse ngoài tầm. Cả ba đều bị bắt, nên script có khả năng báo lỗi.

Ghi chú: mô hình ánh sáng `light.ts`/`lightAudit.ts` hiện chỉ có trên `feat/v4-foundation` (`b01034e`), chưa có trên `level01-v4`. Khi dựng màn, cần nhánh `level01-v4` dựa trên `feat/v4-foundation` hoặc merge vào.

## 10. Art cần làm

Tỉ lệ theo Nhinh (khung 36×42, thân nhìn thấy khoảng 28 px). Nền 1280×720 cho 640×360. Không bake chữ, HUD, nhân vật, ánh sáng sống, cửa hay chốt vào nền. Nền phải khớp collider trong blockout.

**Vệt và quầng đèn không cần art**: vẽ bằng code theo footprint của `light.ts`. Art chỉ cung cấp phần đèn và bệ.

### P0 — chặn việc dựng

| # | Asset | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| 1 | Nền sân trạm 640×360 | một | Sân vào, sân giữa, tường có khe cửa A và cổng B. Ánh nền rêu nhạt **đọc được khi đèn tắt**; không đốt sáng sẵn. Cùng bảng màu với tranh 03/05. |
| 2 | Cánh cửa A | đóng · mở (lò xo căng) | 40×36; lò xo phải thấy rõ là phần kéo về. |
| 3 | Chốt A | nhả · gài | 16×30; thanh cơ khí đang đỡ phải thấy rõ. |
| 4 | Cánh cổng B | đóng · mở | 48×40; có thể chung khung đá với cổng ra rừng. |
| 5 | Tay hãm B | nhả · gài | 16×28; khác hình chốt A. |
| 6 | Bệ `s0`, S1, S2 | trống · có đèn | 24×34; ổ kín có nắp. `s0` không có đầu nối. |
| 7 | Mắt nhận sáng A/B | ngủ · sống | 12×12; chỉ là chỉ báo. |
| 8 | Đèn bảo trì | bật · tắt, trên bệ | Khớp đèn trong tranh 03/05 và đèn Nhinh cầm. `pickup-lantern.png` cũ màu cam, sai kiểu. |
| 9 | **Mầm cây + Lumo che** | mầm sáng khi chiếu | Lumo đang che mầm; mầm có quầng khi bị vệt đèn chiếu. |
| 10 | **Bào tử phản quang** (dấu tối) | một kiểu, 2 cụm | Phải đọc được khi đèn tắt và biến mất khi vệt phủ lên. Tách màu với nền. |
| 11 | **Vết chân nhỏ** (dấu tối) | 3 vết | Cùng nguyên tắc với bào tử. |

### P1 — cần cho bản chơi đủ nghĩa

| # | Asset | Ghi chú |
| --- | --- | --- |
| 12 | Bia có ốp đồng và ống như tranh | Thay `beacon-stone-*` cũ. |
| 13 | Khắc đá S1→A và dấu chốt A | Lớp Pulse, nét khắc tĩnh; có thể vẽ bằng code. |
| 14 | Đường dây kín S1→A, S2→B | Dạng nét mảnh có dấu đầu nối; có thể vẽ bằng code. |
| 15 | Cột ký hiệu tuyến nước | Ký hiệu trùng ký hiệu trong xưởng. Cần chốt ký hiệu (xem §11). |
| 16 | Mô hình bản lề | Ba trạng thái: đóng, kéo mở, cài móc. |

### P2

- Nhinh ngồi tựa gốc cây và đứng dậy (1–2 khung).
- Lớp tán cây phủ phía trên, đom đóm.
- Nhịp đóng sập của cửa A khi lò xo kéo về.

### Dùng lại được

- Nhinh (240 khung) và Lumo `lumo_0..3`.
- Bộ rừng `forest-expansion/sprites-v2` và `bush_woods` cho viền rừng.
- Ô nền đất/cỏ trong `assets/ground-tiles`.

**Không dùng nữa:** cổng vòm đá `woods_arch_*`, vòng đá đứng, dấu chân Pulse cũ.

## 11. Câu chữ và thiết kế cần bạn duyệt

- **Nhắc E:**
  - Đèn và bệ: `E: nhặt đèn` / `E: đặt đèn lên bệ` / `E: lấy đèn`.
  - Chốt A: `E: gài chốt A` / `E: mở chốt A`.
  - Hãm B: `E: gài hãm B` / `E: nhả hãm B`.
  - Bia: `E: đọc bia`.
  - Bản lề: `E: kéo thử` / `E: kéo và cài móc` / `E: tháo móc`.
- **Câu từ chối:**
  - Chốt A khi cửa đóng: "Chốt chỉ ăn khi cửa A đang mở."
  - Hãm B khi cổng đóng: "Tay hãm chỉ gài được khi cánh B mở."
  - Ra cổng mà không cầm đèn: "Đèn còn trên bệ."
- **Hai dòng J đã nêu ở §6** và các dòng ở đó.
- **Ký hiệu trên cột tuyến nước:** hiện chưa có ký hiệu cụ thể. Bạn chọn ký hiệu, hoặc chỉ cho tôi ký hiệu trong nền xưởng.
- **Quyết định (a)/(b)** ở §8.

## 12. Bước tiếp theo khi dựng

- `forestEdgeLayout.ts` sinh từ JSON này.
- `forestEdgeLogic.ts` thuần, có test: tham khảo đường, nhấc đèn sớm, từ chối chốt, mở lại chốt ở sân giữa, tải lại, `auditReach` và kiểm dấu theo từng trạng thái.
- `ForestEdgeLevel.ts` dùng host V4 và `light.ts` để vẽ quầng và vệt.
- Thêm trạng thái đèn "trên bệ `s0`" nếu chọn (a); nếu chọn (b), thêm ngoại lệ đặt đèn một lần.
