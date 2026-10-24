# Màn 01 — Bìa rừng quên lãng: layout V4 (bản 3) và danh sách art

Trạng thái: **DONE** (2026-10-25). Đã dựng trên `level01-v4` và gộp vào `develop-v4`, `demo-v4`. §0–§12 là bản thiết kế (bản 3), giữ làm lịch sử; chỗ nào runtime khác thiết kế, §13 là bản đúng. Nguồn: `docs/scenario-v4/01-forgotten-forest-edge.md` và `puzzle-contracts.md` trên `develop-v4` (commit `f7d7ea8`, `e7a7107`), `00-prologue.md` (cảnh nghỉ cuối), `RULE_GAMES.md`, `art-and-production.md`. Tọa độ: `01-forest-edge-layout.json`. Ảnh blockout: `previews/01-forest-edge-blockout.png` và `-debug.png`, dựng bằng `scripts/mockup-v4-forest-edge.py`.

Quyết định đã chọn: **(b)**, đèn nằm trên đất cạnh bia và Nhinh tự nhặt (xem §8). Kịch bản và luật chung đã sửa theo (b).

## 0. Thay đổi so với bản 2

| Chủ đề | Bản 2 | Bản 3 (theo kịch bản mới và quyết định b) |
| --- | --- | --- |
| Chỗ đặt đèn lúc đầu | bệ `s0` cạnh bia (ổ kín) | **đèn trên đất** cạnh bia (`lampRest`), không có bệ; người chơi nhặt bằng E một lần |
| Vòng sáng đèn cầm tay | vệt 56 px, gốc 12, đầu 32 | **vòng tròn bán kính 40 px** quanh bụng Nhinh (14 px trên tâm khối chân); không theo hướng quay |
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
- **Vòng sáng đèn cầm tay** (dùng `light.ts`): hình tròn bán kính 40 px quanh tâm khối chân Nhinh, không phụ thuộc hướng quay, không có vệt hình nón. Muốn rọi hay tránh một vật, người chơi đi lại gần, lùi ra xa hoặc tắt F. Vòng sáng bị tường và cánh cửa đang đóng chắn.
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
| `sprout` | sáng | `{236,256,16,16}` | vòng đèn cầm tay chiếu vào | sân vào |
| `spores-latch-1..3` | tối | 3 cụm quanh chốt A | đèn không chiếu vào | sân giữa, A mở |
| `steps-latch-1..3` | tối | 3 vết chân từ cửa tới chốt | đèn không chiếu vào | sân giữa, A mở |
| `spores-hinge-1..2` | tối | 2 cụm cạnh bản lề, tạo đường chạy của lò xo | đèn không chiếu vào | sân vào |
| `line-s1-a` | Pulse (khắc) | `(310,224)` | Pulse trong 195 px | bia |
| `latch-tool-marks` | Pulse (khắc) | `(386,168)` | Pulse trong 195 px | sân giữa |

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

Ngoại lệ (đã ghi vào tài liệu chung):
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

## 11. Câu chữ trong runtime (chờ bạn duyệt)

Các câu dưới đây là bản đang chạy (nguồn: `forestEdgeLogic.ts`, `ForestEdgeLevel.ts`). Đề xuất cũ của bản 3 đã được thay bằng các câu này; sửa câu nào thì sửa ở hai file đó.

### 11.1 Nhắc phím E

Hiện khi đứng gần vật tương tác, theo trạng thái lúc đó.

| Đứng ở | Trạng thái | Nhắc |
|---|---|---|
| Đèn trên đất cạnh bia | Đèn còn nằm đó | `E: nhặt đèn` |
| Bệ S1 hoặc S2 | Đang cầm đèn | `E: đặt đèn lên bệ S1` (hoặc `S2`) |
| Bệ S1 hoặc S2 | Đèn đang nằm trên bệ này | `E: lấy đèn` |
| Bệ S1 hoặc S2 | Đèn đang nằm trên bệ kia | `E: đèn đang ở bệ S1` (hoặc `S2`, theo bệ đang có đèn) |
| Bệ S1 hoặc S2 | Đèn còn nằm trên đất cạnh bia | `E: đèn đang ở bên bia` |
| Chốt A | Chưa gài / đã gài | `E: gài chốt A` / `E: mở chốt A` |
| Tay hãm B | Chưa gài / đã gài | `E: gài tay hãm B` / `E: nhả tay hãm B` |
| Mô hình bản lề | Bốn bước, lặp lại | `E: kéo thử bản lề` → `E: thả bản lề` → `E: kéo và cài móc` → `E: tháo móc` → quay lại bước đầu |

Bia không có E; bấm Space (Pulse) ngay cạnh bia.

### 11.2 Thông báo khi E không làm được

Hiện khi bấm E mà chưa đủ điều kiện.

| Khi nào | Câu |
|---|---|
| Gài chốt A khi cửa A đang đóng | Chốt A chỉ gài được khi cửa A đang mở. |
| Gài tay hãm B khi cổng B đang đóng | Tay hãm B chỉ gài được khi cổng B đang mở. |
| Bấm E ở bệ S1 hoặc S2 khi đèn còn trên đất cạnh bia | Đèn còn trên đất cạnh bia; nhặt đèn trước. |
| Bấm E ở bệ S1 hoặc S2 khi đèn đang ở bệ kia | Đèn đang đặt ở bệ khác. |
| Bấm E ở chỗ đèn trên đất khi đèn không còn ở đó | Đèn không còn ở chỗ cạnh bia. (Dự phòng: nhắc E thường đã ẩn lúc này.) |

### 11.3 Bản lề

Thông báo hiện sau mỗi lần bấm E ở mô hình bản lề.

| Bấm E ở bước | Thông báo sau đó |
|---|---|
| 1. `E: kéo thử bản lề` | Bản lề: kéo mở; lò xo đang kéo về. |
| 2. `E: thả bản lề` | Bản lề: thả ra, lò xo kéo cánh đóng lại. |
| 3. `E: kéo và cài móc` | Bản lề: cài móc, cánh giữ mở. |
| 4. `E: tháo móc` | Bản lề: tháo móc, cánh đóng lại. |

### 11.4 Gợi ý (H)

Bấm H để xem gợi ý tiếp theo. Mỗi lần bấm lên một mức, đến mức ba thì giữ nguyên.

| Mục tiêu | Mức 1 | Mức 2 | Mức 3 |
|---|---|---|---|
| Chốt A | Đầu cắm S1 khớp với đèn thử. Lẫy và thanh hãm ở cửa A còn nguyên; cửa đã phản ứng với nguồn chưa? | Nguồn thử mở cửa A, còn chốt cơ khí có thể giữ kết quả khi đèn được chuyển sang S2. | Đặt đèn ở S1, qua A, gài chốt từ sân giữa rồi quay lại lấy đèn sang S2. Khi B mở, dùng tay hãm ở phía sân giữa. |
| Tay hãm B | Cổng B nhận nguồn từ S2, như cửa A nhận từ S1. | Tay hãm B chỉ gài được khi cổng B đang mở; sau khi gài, B giữ dù đèn ở đâu. | Đặt đèn bật ở S2 để mở B, gài tay hãm B từ sân giữa, rồi lấy đèn đi qua cổng. |

### 11.5 Nhật ký (J)

Các mục ghi vào nhật ký khi Nhinh gặp vật đó. Mã trong ngoặc là tên dùng trong code.

| Vật (mã) | Nội dung |
|---|---|
| Mầm cây (`sprout`) | Mầm cây dưới vệt đèn: Lumo đang che nó. |
| Bào tử cạnh bản lề (`spores-hinge-1`, `-2`) | Bào tử tối cạnh mô hình bản lề: chỉ hiện ngoài vệt đèn cầm tay. |
| Bào tử cạnh chốt A (`spores-latch-1` đến `-3`) | Bào tử tối cạnh chốt A: chỉ hiện ngoài vệt đèn cầm tay. |
| Vết chân (`steps-latch-1` đến `-3`) | Vết chân phía sân giữa dẫn tới chốt A. |
| Đường khắc S1–A (`line-s1-a`) | Đường khắc S1–A: đầu nối kín của bệ S1 đi tới cửa A. |
| Vết dụng cụ (`latch-tool-marks`) | Vết dụng cụ quanh chốt A. |

### 11.6 Lời thoại

Mỗi đoạn chỉ hiện một lần. Lời thoại theo thứ tự xuất hiện trong màn.

| Khi nào | Người nói | Câu |
|---|---|---|
| Lần đầu vệt đèn cầm tay phủ lên mầm cây | Lumo | Cậu có thể đừng soi vào nhà người khác không? |
| | Nhinh | Xin lỗi. Tôi đến đây để kiểm tra trạm. |
| Lần đầu đặt đèn lên bệ S1 | Nhinh | Khớp này giống ở xưởng. |
| Lần đầu đèn bật trên S1 nuôi được cửa A | Nhinh | Cửa còn chạy. Đường cấp của trạm mới là thứ đang thiếu. |
| Lần đầu cửa A mở | Lumo | Trước đây cửa vẫn mở khi người giữ trạm tới. |
| Lúc kết màn, khi đã tới lối ra | Nhinh | Đường này nối về bến. |
| | Lumo | Cũng từng nối về vườn tôi. |

Lưu ý: câu xin lỗi của Nhinh (dòng đầu) là bản diễn đạt lại; kịch bản không có câu gốc. Cần duyệt riêng.

### 11.7 Ký hiệu và cảnh mở đầu

- **Ký hiệu trên cột tuyến nước:** đã chốt theo bộ art: ống chia hai nhánh, hai đầu nối tròn (`water-column.png`, cùng mẫu với bảng xưởng).
- **Cảnh mở đầu:** lời thoại dòng đầu ở 11.6 chạy khi vòng đèn cầm tay phủ lên mầm cây; lần bật đầu ngay chỗ nhặt đèn làm việc đó (§13). Cảnh Nhinh ngồi dậy khi bắt đầu game không có chữ.

## 12. Bước tiếp theo khi dựng

- Đã xong: tài liệu chung trên `develop-v4` (`7b1b7d0`). Runtime có `lampRest`, nhặt một lần bằng E, và test cho ngoại lệ này. Toàn bộ 301 test pass, `tsc` sạch.
- Đã đồng bộ: runtime, JSON v4 và art dùng chung một topology: sân vào ở dưới, sân giữa có tường bao ở trên, cửa A ở tường nam sân giữa, cổng B ở tường bắc dẫn sang màn 02. JSON không có rãnh khô, mắt ổ kín, dây S1/S2 và decor cũ, vì runtime chưa có.
- Lỗi audit ở foundation (bán kính ứng viên `hasAimArea` cho dấu tối) đã sửa ở `a208839`; xem §9.
- Đã kiểm trong trình duyệt: xem §13.

## 13. Trạng thái runtime (DONE)

Bản đúng của màn 01 trên `level01-v4`. Chỗ nào khác §0–§12, theo mục này.

**Đã dựng**
- Bố cục theo art: sân vào ở dưới, sân giữa có tường bao, cửa A ở tường nam, cổng B ở tường bắc sang màn 02. JSON (`01-forest-edge-layout.json`) và runtime khớp, có test so hai bên.
- Đèn trên đất tại `lampRest`, nhặt một lần bằng E; F không tác động khi đèn còn trên đất. Đèn chỉ đặt được trên S1/S2.
- Vòng đèn cầm tay 40 px quanh bụng Nhinh (`LANTERN_LIFT` = 14 px trên tâm khối chân); tường và cửa đóng chặn tính từ tâm khối chân. Quầng bệ 12 px.
- Ánh sáng vẽ kiểu v3: nền đêm 0.88 cố định; lõi sáng khớp footprint, quầng mềm ngoài lõi chỉ trang trí; quầng nhỏ quanh Nhinh khi trong tay không có đèn sáng; vật tương tác sáng mờ.
- Mầm cây ở `{236,256,16,16}`: lần bật đèn đầu tiên ngay chỗ nhặt đèn phủ lên mầm và chạy cảnh mở đầu (có test).
- Pulse (Space, đèn trong tay và bật) gần bia làm hiện dây S1→A (nét xanh) và vết dụng cụ ở chốt A, ghi vào J. Bia không có E.
- Đèn bật trên S1/S2: mắt A/B sáng xuyên lớp tối, dây S1→A / S2→B chuyển vàng. Không có nguồn: mắt và dây chìm dưới lớp tối.
- Chốt A, tay hãm B, mô hình bản lề (ba pha, minh họa tùy chọn), H ba mức theo trạng thái, HUD theo kịch bản.
- Mũi tên chỉ dẫn (`focus()`), chỉ có ở màn 01: đèn → S1 → chốt A → S1 → S2 → tay hãm B → S2. Không khóa gì.
- Va chạm: tán thấp, bụi và mép rừng là khối đặc nhưng không chặn sáng (`foliage`); gốc cây và mái trạm khớp art. Vật dựng sắp lớp theo chân đế, nên Nhinh đi ra sau bia, bệ, chốt.
- Mở màn: game mới, Nhinh ngồi tựa gốc cây rồi đứng dậy (ba pose của bộ art, 450/300/180 ms, sự kiện `forest-edge:woke`); trong lúc đó chưa điều khiển được.
- Bia sáng (`stele-pulse`) một giây khi Pulse phát trong 48 px quanh bia.
- Rãnh khô và các thanh liên kết cơ khí: lớp trang trí phẳng dưới nhân vật, không va chạm, không tương tác.
- Tán cây phủ trên Nhinh (dưới lớp tối), mờ xuống 0.35 khi che cô. Với khối đặc hiện tại, Nhinh hầu như không đi tới chỗ tán phủ.
- Cảnh kết ("Đường này nối về bến"): cột tuyến nước và huy hiệu ký hiệu sáng xuyên lớp tối từ lúc đó.
- Mô hình bản lề: vòng bốn bước kéo thử → thả (tự đóng) → kéo và cài móc (giữ) → tháo móc.
- Cửa A đóng có nhịp: `door-a-closing-1` (65 ms) → `door-a-closing-2` (45 ms) → đóng. Cánh vẫn giữ mở theo luật cầu/cửa khi còn người trong ngưỡng.

**Lưu:** vị trí đèn và F, `latchA`, `braceB`, checkpoint (`yard`, `middle`), J (dấu đã thấy, dấu Pulse), sự kiện một lần `forest-edge:woke`, `lamp-taken`, `opening`, `pedestal`, `door-feed`, `lumo-door`, `ending`. Pha mô hình bản lề không lưu.

**Kiểm:** 311 test và `tsc` sạch trên `level01-v4`. Reach audit, `hasAimArea` cho mọi dấu, tách sân, ngưỡng/bệ, checkpoint. Đã chơi trọn trong trình duyệt theo lời giải tham khảo: nhặt đèn → bật (cảnh Lumo) → Pulse → S1 → chốt A → lấy đèn → S2 → tay hãm B → lấy đèn → qua B; đủ sáu cảnh thoại.

**Còn lại:** câu chữ ở §11 chờ bạn duyệt. Art của màn đã dùng hết trừ `water-column-blank` (bản nền để chỉnh ký hiệu), `water-route-symbol` và hai file bảng xưởng (thuộc màn 00),.

