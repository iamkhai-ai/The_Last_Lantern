# Màn 01 — Bìa rừng quên lãng: layout V4 (bản 3) và danh sách art

Trạng thái: **bản nháp để duyệt**, chưa phải code. Nguồn: `docs/scenario-v4/01-forgotten-forest-edge.md` và `puzzle-contracts.md` trên `develop-v4` (commit `f7d7ea8`, `e7a7107`), `00-prologue.md` (cảnh nghỉ cuối), `RULE_GAMES.md`, `art-and-production.md`. Tọa độ: `01-forest-edge-layout.json`. Ảnh blockout: `previews/01-forest-edge-blockout.png` và `-debug.png`, dựng bằng `scripts/mockup-v4-forest-edge.py`.

Quyết định đã chọn: **(b)**, đèn nằm trên đất cạnh bia và Nhinh tự nhặt (xem §8). Phần kịch bản và luật chung còn ghi "không nhặt đèn trên đất", nên phải sửa theo (b) trước khi dựng.

## 0. Thay đổi so với bản 2

| Chủ đề | Bản 2 | Bản 3 (theo kịch bản mới và quyết định b) |
| --- | --- | --- |
| Chỗ đặt đèn lúc đầu | bệ `s0` cạnh bia (ổ kín) | **đèn trên đất** cạnh bia (`lampRest`), không có bệ; người chơi nhặt bằng E một lần |
| Vòng sáng đèn cầm tay | vệt 56 px, gốc 12, đầu 32 | **vòng tròn bán kính 40 px** quanh chân Nhinh; không theo hướng quay |
| Bệ S1/S2 | ổ kín có nắp | hộp có nắp, đầu nối kín; chỉ quầng 12 px lọt ra |
| Đầu cắm S1 | — | hình khớp với đèn bảo trì |
| Đường nguồn thường | — | có đoạn tối đứt nhịp ở đầu vào S1 |
| Cửa A/B | — | lẫy, lò xo, thanh hãm còn nguyên, không gãy |
| Bào tử bản lề | dấu tối | tạo đường chạy của lò xo khi tắt đèn |
| Ánh nền | ánh nền rêu tĩnh | giữ; tắt F không phủ tối toàn màn |
| Dấu tối | 3 bào tử + 3 vết chân ở sân giữa; 2 bào tử ở bản lề | giữ |
| Mầm cây và Lumo | cảnh mở đầu | Lumo đọc được bằng ánh tự thân, kể cả khi vòng đèn đã rời mầm |
| Pulse | khắc đá S1→A và dấu chốt A | giữ |
| Lối ra | cổng B; cầm đèn khi qua | giữ |

## 1. Thiết kế

### Một màn hình, hai sân

Cả màn nằm trong một khung 640×360, không cuộn camera. Lý do: kịch bản yêu cầu thấy cổng B ngay từ sân đầu và thấy cửa A khép "ngay trong tầm mắt" khi nhấc đèn ở S1.

```
          [rừng 02]
   ┌──────┤cổng B├──────┐
   │  S2      hãm B  cột │   SÂN GIỮA (lát đá, rãnh khô)
   │        chốt A       │
───┴──────┤cửa A├────────┘
 cây lớn  bia đèn  S1         mái trạm
 bản lề     mầm+Lumo         SÂN VÀO (cỏ, lối đất)
```

- **Sân vào:** cây lớn, bia (cạnh đó là đèn nằm trên đất, `lampRest`), mô hình bản lề (tùy chọn), mầm cây có Lumo che, bệ S1 cạnh cửa A, mái trạm (chỉ là cảnh).
- **Tường trạm** chạy ngang, mặt quay về người chơi. Cửa A nằm trong tường. Đường dây kín từ S1 tới mắt nhận của A ở mặt ngoài.
- **Sân giữa** (phòng `courtyard`, sau tường): chốt A ngay sau cửa, bệ S2 có đường dây tới B, tay hãm B, và cột ký hiệu tuyến nước có rãnh khô.
- **Cổng B** ở tường bắc, dẫn lên rừng 02.

### Trạng thái đầu và cảnh mở màn

- Đèn bảo trì nằm **trên đất** tại `lampRest`, cạnh bia, **tắt**. Nhinh đã đặt nó ở đó trước khi nghỉ (prologue).
- Người chơi nhặt đèn bằng E (ngoại lệ một lần, §8). Đèn chỉ được nhặt từ vị trí này một lần; sau đó không còn đèn trên đất.
- Cảnh mở đầu (một lần) chạy khi lần bật đèn đầu tiên trong tay: Nhinh chiếu vòng sáng vào mầm cây Lumo đang che. Đoạn đối thoại xong thì Lumo theo Nhinh và HUD đổi thành "Mở đường qua trạm." **Đề xuất, cần duyệt:** kịch bản hiện viết "Nhinh nhặt đèn" trong cảnh mở; với quyết định b, người chơi tự nhặt, nên cảnh gắn với lần bật đầu thay vì lần nhặt.

### Trình tự tham khảo (không bắt buộc)

1. Nhặt đèn ở `lampRest` (E), bật (F). Cảnh mở đầu chạy một lần.
2. Đứng gần bia, E để đọc. Lần đầu bia dạy F và Pulse: bật đèn, rồi Pulse. Pulse hiện khắc đá S1→A và dấu chốt A (§6). Dấu được ghi vào J.
3. Đặt đèn lên S1 và bật: A mở, thanh lò xo căng.
4. Đi qua A (khi A mở), E ở chốt A để gài. Chốt chỉ gài được khi A đang mở.
5. Quay ra lấy đèn từ S1; A vẫn mở nhờ chốt.
6. Đặt đèn lên S2 và bật: B mở. E ở tay hãm B để gài, khi B đang mở.
7. Lấy đèn từ S2 (B vẫn mở nhờ hãm). Lần gài B đầu tiên chạy cảnh kết ở cột tuyến nước (§5), một lần.
8. Qua B cùng Lumo, **cầm đèn trong tay**, sang màn 02.

Mô hình bản lề là tùy chọn, không đặt cờ bắt buộc. Mỗi lần nhấn E làm một bước theo vòng: kéo rồi thả (cánh tự đóng), kéo rồi cài móc (cánh giữ mở), tháo móc.

## 2. Ánh sáng và bố cục

- **Ánh nền:** rêu nhạt làm rõ mặt đường, mép cổng, chốt, bệ và tường **kể cả khi đèn tắt**. Ánh nền là tĩnh, không đổi theo F, và không phải nguồn cảm biến. Không có nguồn cố định gameplay ở màn này.
- **Vòng sáng đèn cầm tay** (dùng `light.ts`): hình tròn bán kính 40 px quanh bụng Nhinh (`LANTERN_LIFT` = 14 px phía trên tâm khối chân), không phụ thuộc hướng quay, không có vệt hình nón. Muốn rọi hay tránh một vật, người chơi đi lại gần, lùi ra xa hoặc tắt F. Vòng sáng bị tường và cánh cửa đang đóng chắn, tính từ tâm khối chân.
- **Đèn trên đất** (`lampRest`) tắt, không có footprint. Chỉ đèn đang bật trong tay hoặc trên bệ mới có ánh.
- **Quầng bệ:** vòng bán kính 12 px quanh đèn đặt trên bệ, cũng bị tường và cửa chắn.
- **Đầu nối kín:** A và B là **ổ kín**. Chỉ nhận qua đúng bệ S1/S2 và đường dây đã vẽ. Đèn cầm tay không kích được. Mắt nhận sáng trên tường chỉ là chỉ báo, không là đích của vòng sáng.
- **Bệ S1/S2** là hộp có nắp, đầu nối kín. Quầng 12 px quanh S1, S2 không chứa dấu sáng/tối nào (kiểm bằng script, §9).

## 3. Luật và câu đố

- **Pulse** dùng được khi đèn ở tay và đang bật. Hiện khắc tĩnh `line-s1-a` (S1→A) và `latch-tool-marks` (chốt A). Pulse không bật cửa, không đổi trạng thái gì. Dấu đã phát hiện được ghi vào J với viền mờ. Không có thời hạn nhấn E sau Pulse.
- **A** mở khi S1 đang nhận nguồn, hoặc khi chốt A đang gài. **B** mở khi S2 đang nhận nguồn, hoặc khi hãm B đang gài. Hai bệ không cùng nhận vì chỉ có một đèn. Không dùng cờ "đã từng chiếu".
- **Đường nguồn thường** của trạm có đoạn tối đứt nhịp ở đầu vào S1. Đầu cắm S1 khớp hình đèn bảo trì. Lẫy, lò xo và thanh hãm còn nguyên: đây là chứng cứ cơ cấu cửa vẫn tốt, chỉ đường cấp thường bị gián đoạn.
- **Chốt A** nằm ở sân giữa. Gài vào thanh đang mở thì A giữ, dù F tắt hoặc Nhinh lấy đèn đi.
- **Hãm B** ở sân giữa chỉ gài được khi cánh B đang mở. Sau khi gài, B giữ độc lập với đèn.
- **Lumo** theo Nhinh, chưa dạy ấn gọi. Ánh tự thân của Lumo chỉ dẫn đường, không mở A/B.
- Cửa không mở vì người chơi đã từng chiếu sáng; phải có nguồn ở đúng bệ hoặc chốt đang giữ.

## 4. Sai và phục hồi

- **Nhấc đèn ở S1 trước khi gài A:** A khép ngay, trong tầm mắt. Lumo nói đúng một câu: "Thanh cửa vừa tụt xuống." Đèn đặt lại được ngay từ sân vào.
- **F ở sân giữa khi chưa gài A:** A đóng. Đèn vẫn ở S1; F từ bất kỳ vị trí nào trong màn bật lại được, nên A mở lại. Chốt A vẫn tiếp cận được khi cửa đóng, nhưng chỉ gài được khi cánh mở. Không cần đi qua cửa đã đóng để bật nguồn.
- **Đèn bật ở S1 rồi đi về S2:** A vẫn mở vì nguồn còn ở S1; B chưa có nguồn nên đóng.
- **Đèn đang trong tay ở sân giữa, A đã đóng:** không kẹt, vì S2 nằm trong sân giữa. Đặt đèn lên S2 và bật thì B mở; khi đó gài hãm B. Từ sân giữa không có đường nào khác về sân vào, nên người chơi phải dùng S2 này để đi tiếp.
- **Đèn đã nhặt khỏi `lampRest`:** không quay lại được vị trí đó để nhặt lần nữa. Đèn luôn ở tay hoặc trên bệ S1/S2.
- **Người đang đứng trong khung cửa khi nguồn mất:** cánh giữ mở đến nền an toàn (luật cầu/cửa chung).
- **Gài rồi mở lại chốt:** hợp lệ. S2, hãm B và đường tới S1 cùng phía B nên không kẹt khi thử sai.
- **Checkpoint:** `yard` (gốc cây lớn) và `courtyard` (giữa sân giữa). Cả hai không nằm trong khung cửa, hợp lệ với F bật lẫn F tắt. Sau khi tải, nếu đèn đã nhặt khỏi `lampRest` thì đèn ở tay hoặc trên bệ đúng như lúc lưu.

## 5. Kết và H

Nhinh thấy ký hiệu tuyến nước trên cột giống trong xưởng. "Đường này nối về bến." Lumo nhìn rãnh khô: "Cũng từng nối về vườn tôi." Câu hỏi mang sang 02: trước đây con người và rừng đã cùng sử dụng mạng ra sao?

H, ba mức:
- **Mức 1 — quan sát:** "Đầu cắm S1 khớp với đèn thử. Lẫy và thanh hãm ở cửa A còn nguyên; cửa đã phản ứng với nguồn chưa?"
- **Mức 2 — quan hệ:** "Nguồn thử mở cửa A, còn chốt cơ khí có thể giữ kết quả khi đèn được chuyển sang S2."
- **Mức 3 — bước tiếp:** "Đặt đèn ở S1, qua A, gài chốt từ sân giữa rồi quay lại lấy đèn sang S2. Khi B mở, dùng tay hãm ở phía sân giữa." H chỉ gợi bước còn thiếu theo trạng thái hiện tại.

## 6. Dấu sáng/tối và Pulse

| Id | Loại | Vị trí (rect) | Đọc được khi | Thấy từ |
| --- | --- | --- | --- | --- |
| `sprout` | sáng | `{228,240,16,16}` | vòng đèn cầm tay chiếu vào | sân vào |
| `spores-latch-1..3` | tối | 3 cụm quanh chốt A | đèn không chiếu vào | sân giữa, A mở |
| `steps-latch-1..3` | tối | 3 vết chân từ cửa tới chốt | đèn không chiếu vào | sân giữa, A mở |
| `spores-hinge-1..2` | tối | 2 cụm cạnh bản lề, tạo đường chạy của lò xo | đèn không chiếu vào | sân vào |
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

Lưu: vị trí đèn (`lampRest`, S1, S2, hoặc đang cầm), F bật/tắt, `latchA`, `latchB`, `hingeHooked`, vị trí và chế độ Lumo, các dấu Pulse thật sự phát hiện, các dấu tối đã thấy, và sự kiện một lần: `opening-seen`, `stele-read`, `bar-dropped-line`, `ending-seen`, `lamp-taken` (đèn đã nhặt khỏi đất một lần; chưa có sự kiện này thì đèn nằm trên đất khi tải).

Không lưu: trạng thái cửa A/B (tính lại từ nguồn và chốt), hướng quay của Nhinh, footprint của đèn. Sau khi tải, vòng sáng và quầng tính lại từ vị trí đèn hiện tại.

## 8. Quyết định

**Đã chọn (b):** đèn nằm trên đất cạnh bia, người chơi tự nhặt.

Ngoại lệ cần ghi (chưa sửa tài liệu chung):
- E nhặt đèn trên đất **chỉ tại `lampRest`** và chỉ khi đèn còn ở đó.
- Không đặt đèn xuống đất. Đặt đèn chỉ tại bệ S1/S2, như luật chung.
- Cảnh mở đầu chạy khi vòng sáng đầu tiên phủ lên mầm Lumo (runtime hiện tại). Đề xuất gắn với lần bật đầu, cần duyệt.

Đã làm theo (b):
- `puzzle-contracts.md`, `RULE_GAMES.md` mục 8 và `01-forgotten-forest-edge.md` §1/§4 trên `develop-v4` (`7b1b7d0`).
- Runtime: `LAMP_REST_EXCEPTION` trong `forestEdgeLayout.ts`, nhặt một lần bằng E, sự kiện `forest-edge:lamp-taken`, đặt đèn lên bệ bị từ chối khi đèn còn trên đất.

## 9. Kiểm đã làm

JSON v4 và `forestEdgeLayout.ts` đã đồng bộ theo bố cục art (cổng B ở tường bắc). Một test đọc JSON và so với runtime: tường, cửa, ngưỡng, lối ra, vật, phòng, checkpoint và dấu. Test chạy trên file đã commit.

- **Toàn bộ test:** 301 test pass; `tsc` sạch (nhánh `level01-v4`, đã merge foundation).
- **Reach audit** (`auditReach`): sạch ở cả 4 trạng thái A/B. Tầm với tới `s1`, `hinge`, `lampRest` từ sân vào; `latchA` khi A mở; `s2`, `braceB` từ sân giữa. Lối ra chỉ tới được khi B mở.
- **Tách sân:** khi A đóng, không chân nào từ sân vào nằm trong phòng sân giữa, và chốt A không tới được từ sân vào.
- **Checkpoint:** cả hai đứng được ở mọi trạng thái và nằm trong vùng lưu.
- **Ngưỡng và bệ:** từ mọi vị trí trong ngưỡng A, S1 ngoài tầm với; trong ngưỡng B, S2 ngoài tầm. Hai bệ cách mọi dấu hơn 12 px.
- **Pulse:** Pulse xuất phát từ tâm Nhinh, không từ bia. Test kiểm có một vị trí đứng ở sân vào, bia nằm trong tầm E từ đó, và cả hai dấu nằm trong 195 px. Dấu `latch-tool-marks` đã dời từ (400,174) sang (386,168) để đạt điều kiện này.
- **Dấu sáng (`sprout`):** đọc được từ điểm tải sân vào bằng `hasAimArea`.
- **Dấu tối:** 8 dấu, mỗi dấu có điểm đọc được và nhìn thấy được, và có vùng đứng 8 px thấy dấu theo `hasAimArea`, kiểm từ điểm tải của phòng chứa dấu. Trước khi sửa foundation, test này không đạt (dấu đầu tiên lỗi là `spores-hinge-1`). Sau khi sửa ở `a208839` (vùng đứng tìm trong 64 px với dấu tối), cả 8 dấu đạt.
- **Ảnh ghép đối chiếu** (`01-forest-edge-art-vs-runtime.png`, xem bằng mắt): tường đỏ khớp tường sân giữa và rừng trong art; cửa A và cổng B khớp các khe tường; khung magenta (collider của art) trùng vị trí các vật runtime: chốt A, S2, hãm B, cột nước, bia, bản lề, S1. Không thấy lệch đáng kể.

Ghi chú: mô hình ánh sáng `light.ts`/`lightAudit.ts` đã có trên `feat/v4-foundation` (`4f9fd4a`, vòng 40 px) và đã được merge vào `level01-v4` qua `ccef8f9`.

## 10. Art cần làm

Tỉ lệ theo Nhinh (khung 36×42, thân nhìn thấy khoảng 28 px). Nền 1280×720 cho 640×360. Không bake chữ, HUD, nhân vật, ánh sáng sống, cửa hay chốt vào nền. Nền phải khớp collider trong blockout.

**Vòng sáng và quầng đèn không cần art**: vẽ bằng code theo footprint của `light.ts`. Art chỉ cung cấp phần đèn, bệ và vật thể.

### P0 — chặn việc dựng

| # | Asset | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| 1 | Nền sân trạm 640×360 | một | Sân vào, sân giữa, tường có khe cửa A và cổng B. Ánh nền rêu nhạt **đọc được khi đèn tắt**; không đốt sáng sẵn. Cùng bảng màu với tranh 03/05. |
| 2 | Cánh cửa A | đóng · mở (lò xo căng) | 40×36; lẫy và lò xo vẽ **còn nguyên**, lò xo phải thấy rõ là phần kéo về. |
| 3 | Chốt A | nhả · gài | 16×30; thanh cơ khí đang đỡ phải thấy rõ. |
| 4 | Cánh cổng B | đóng · mở | 48×40; có thể chung khung đá với cổng ra rừng. |
| 5 | Tay hãm B | nhả · gài | 16×28; khác hình chốt A. |
| 6 | Bệ S1, S2 | trống · có đèn | 24×34; hộp có nắp, đầu nối kín. **Đầu cắm S1 khớp hình đèn bảo trì:** thiết kế cùng lúc với #8. |
| 7 | Mắt nhận sáng A/B | ngủ · sống | 12×12; ổ kín có nắp; chỉ là chỉ báo. |
| 8 | Đèn bảo trì | bật · tắt; trên đất · trên bệ · trong tay | Khớp đèn trong tranh 03/05 và đèn Nhinh cầm. Hình dạng phải khớp đầu cắm S1. `pickup-lantern.png` cũ màu cam, sai kiểu. |
| 9 | **Mầm cây + Lumo che** | mầm sáng khi chiếu | Lumo đang che mầm. Lumo phải đọc được bằng ánh tự thân khi vòng đèn đã rời mầm. |
| 10 | **Bào tử phản quang** (dấu tối) | một kiểu, 2 cụm bản lề + 3 cụm chốt | Phải đọc được khi đèn tắt và biến mất khi vòng sáng phủ lên. Cụm bản lề phải xếp thành đường chạy của lò xo. Tách màu với nền. |
| 11 | **Vết chân nhỏ** (dấu tối) | 3 vết | Cùng nguyên tắc với bào tử. |

### P1 — cần cho bản chơi đủ nghĩa

| # | Asset | Ghi chú |
| --- | --- | --- |
| 12 | Bia có ốp đồng và ống như tranh | Thay `beacon-stone-*` cũ. |
| 13 | Khắc đá S1→A và dấu chốt A | Lớp Pulse, nét khắc tĩnh; có thể vẽ bằng code. |
| 14 | Đường dây kín S1→A, S2→B | Dạng nét mảnh có dấu đầu nối; có thể vẽ bằng code. |
| 15 | Cột ký hiệu tuyến nước | Ký hiệu trùng ký hiệu trong xưởng. Cần chốt ký hiệu (xem §11). |
| 16 | Mô hình bản lề | Ba trạng thái: đóng, kéo mở, cài móc. |
| 17 | Đường nguồn thường có đoạn tối ở đầu vào S1 | Đoạn đứt nhịp, đọc được là "chỉ báo gián đoạn". |

### P2

- Nhinh ngồi tựa gốc cây và đứng dậy (1–2 khung).
- Lớp tán cây phủ phía trên, đom đóm.
- Nhịp đóng sập của cửa A khi lò xo kéo về.

### Dùng lại được

- Nhinh (240 khung) và Lumo `lumo_0..3`.
- Bộ rừng `forest-expansion/sprites-v2` và `bush_woods` cho viền rừng.
- Ô nền đất/cỏ trong `assets/ground-tiles`.

**Không dùng nữa:** cổng vòm đá `woods_arch_*`, vòng đá đứng, dấu chân Pulse cũ, và bệ `s0` (đã bỏ theo (b)).

## 11. Câu chữ và thiết kế cần bạn duyệt

- **Nhắc E:**
  - Đèn: `E: nhặt đèn` (trên đất tại `lampRest`, hoặc trên bệ) / `E: đặt đèn lên bệ` / `E: lấy đèn`.
  - Chốt A: `E: gài chốt A` / `E: mở chốt A`.
  - Hãm B: `E: gài hãm B` / `E: nhả hãm B`.
  - Bia: `E: đọc bia`.
  - Bản lề: `E: kéo thử` / `E: kéo và cài móc` / `E: tháo móc`.
- **Câu từ chối:**
  - Chốt A khi cửa đóng: "Chốt chỉ ăn khi cửa A đang mở."
  - Hãm B khi cổng đóng: "Tay hãm chỉ gài được khi cánh B mở."
  - Ra cổng mà không cầm đèn: "Đèn còn trên bệ."
  - Đặt đèn xuống đất: "Đèn chỉ đặt được trên bệ." (mới, cần duyệt)
- **Hai dòng J đã nêu ở §6** và các dòng ở đó.
- **Ký hiệu trên cột tuyến nước:** hiện chưa có ký hiệu cụ thể. Bạn chọn ký hiệu, hoặc chỉ cho tôi ký hiệu trong nền xưởng.
- **Cảnh mở đầu gắn với lần bật đầu** thay vì lần nhặt (§1, đề xuất).

## 12. Bước tiếp theo khi dựng

- Đã xong: tài liệu chung trên `develop-v4` (`7b1b7d0`). Runtime có `lampRest`, nhặt một lần bằng E, và test cho ngoại lệ này. Toàn bộ 301 test pass, `tsc` sạch.
- Đã đồng bộ: runtime, JSON v4 và art dùng chung một topology: sân vào ở dưới, sân giữa có tường bao ở trên, cửa A ở tường nam sân giữa, cổng B ở tường bắc dẫn sang màn 02. JSON không có rãnh khô, mắt ổ kín, dây S1/S2 và decor cũ, vì runtime chưa có.
- Lỗi audit ở foundation (bán kính ứng viên `hasAimArea` cho dấu tối) đã sửa ở `a208839`; xem §9.
- Chưa kiểm trong trình duyệt.
