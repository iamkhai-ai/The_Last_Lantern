# Level 06 — The Sleepless Tower (v2)

**Tên màn:** Ngọn Tháp Không Ngủ.\
**Chặng:** Hy Vọng — giữ nhiều điều kiện cùng lúc. **Đỉnh thứ nhất** của đường cong.\
**Nhân vật:** Nhinh, Lumo; giọng Người Bảo Vệ trong bản ghi.\
**Đầu vào:** Đã biết đặt đèn, xoay gương, gài chốt và gọi Lumo. Từ màn 5 đã biết chốt giải phóng Lumo khỏi ấn.\
**Mục tiêu:** Giải phóng dòng nước, nhận Tinh thể Hy Vọng.\
**Kỹ năng mới:** Đồng thời. Ba điều kiện phải đúng cùng một lúc, và lần này **không có chốt nào giữ thay Lumo**.

**Trạng thái:** hướng diễn giải số đo và chơi thử đã được duyệt trong đợt góp ý; kịch bản v2 vẫn là bản nháp thiết kế, chưa triển khai vào game. Bản đang chạy là [docs/scenario/06-the-sleepless-tower.md](../scenario/06-the-sleepless-tower.md), vẫn là nguồn chuẩn hiện tại. Màn này đang làm tranh v2 ([kế hoạch](../superpowers/plans/2026-10-21-level06-art-v2-production.md)), và kế hoạch đó yêu cầu giữ bảng chân trị A/B/C, khóa lưu, lời thoại và thang gợi ý. Bản v2 không đổi bố cục, câu đố hay thoại đã có; các dòng *(mới)* là đề xuất.

> **Thay đổi so với bản hiện tại**
>
> - **Nhạc xếp lớp:** mỗi mạch đang sống thêm một lớp âm. Mất một mạch thì lớp của nó tắt ngay, nên người chơi nghe được mạch nào vừa rơi.
> - **Luật mới được nói ra:** ấn C không có chốt. Ở màn 5, chốt giải phóng Lumo; ở đây Lumo phải đứng giữ tới khi cần Trả dòng được chuyển. Cần Trả dòng chính là "chốt" của màn này.
> - Thêm một câu báo trạng thái khi Lumo rời ấn C trước lúc chuyển cần.
> - **Mạch phụ tùy chọn "Những dấu nhỏ" (2/5):** những vạch đếm đêm trên khung cửa sổ, chỉ hiện khi dùng Pulse.
> - HUD chỉ nêu mục tiêu và ba vòng A/B/C (theo kế hoạch tranh v2).

## 1. Không gian và nhịp cảm xúc

Đỉnh tháp là một vòng máy đá lớn. Giữa phòng, Tinh thể Hy Vọng nằm trong buồng dẫn năng lượng; nước chạy từ dưới lên nuôi một ngọn đèn khổng lồ. Ba thiết bị điều tiết A, B, C nối với cần chuyển chế độ ở cửa buồng. Một cửa sổ hướng về rừng có chiếc khăn trẻ con đã bạc màu.

Nhịp giải đố chậm, có tiếng máy đều. Câu chuyện cho thấy nỗi chờ đợi của Người Bảo Vệ trước khi phán xét lựa chọn của ông.

Đây là đỉnh khó đầu tiên. Màn 5 dạy giữ đường bằng các bước nối tiếp; màn 6 đòi mọi thứ đúng cùng một lúc. Tiếng máy là thước đo: một mạch là một giọng, ba mạch là một hợp âm trọn. Người chơi nghe được hệ thống trước khi hiểu nó.

## 2. Mở cảnh — ánh sáng không biết nghỉ

**Nhinh:** “Nước đang biến thành ánh sáng ở đây.”\
**Lumo:** “Ngọn tháp dẫn đường cho người đi rừng. Nó từng chỉ sáng khi trời tối.”\
**Nhinh:** “Giờ nó lấy cả phần nước của Cây Mẹ.”\
**Lumo:** “Nếu dừng nó… người lạc đường sẽ tìm về bằng gì?”\
**Nhinh:** “Mình xem cách máy hoạt động trước. Có thể nó vẫn còn một chế độ khác.”

*Bảng điều tiết ghi: “Ba mạch cùng ổn định. Sau đó mới chuyển từ giữ sáng sang trả dòng.”*

## 3. Khu thử an toàn — lăng kính

Một bàn thử có lăng kính và hai mắt nhận nhỏ. Đặt đèn vào bệ và xoay gương đầu vào cho tia đi qua lăng kính, tia sẽ tách thành hai nhánh. Cả hai mắt cùng sáng khi gương đầu vào trỏ đúng.

**Nhinh:** “Một tia có thể chia làm hai.”\
**Lumo:** “Nhưng nếu xoay gương đầu vào đi chỗ khác, cả hai nhánh đều mất.”\
**Nhinh:** “Vậy phải nhìn cả hệ thống, không chỉ chiếc gương đang xoay.”

Bàn thử không nối với buồng tinh thể. Người chơi thấy tia phản hồi ngay khi xoay, không phải đoán một tổ hợp không có dấu hiệu. Mỗi mắt nhỏ trên bàn cũng có một giọng âm riêng: một mắt sáng là một nốt, hai mắt sáng là một quãng hòa âm. Bàn thử vì vậy dạy luôn cách đọc tai của máy chính.

Chỉ có một chiếc đèn. Muốn thử ở bàn, Nhinh phải lấy đèn khỏi bệ chính, và cả máy chính tắt theo. Đây là gợi ý sớm cho chủ đề "dùng chung một nguồn" của màn 9.

## 4. Câu đố chính — ba mạch đồng thời

Mạng chính gồm bệ đèn, gương chung G0, lăng kính, hai gương nhánh G1 và G2, thiết bị ánh sáng A và B, cùng ấn C dành cho Lumo. Bố cục, tọa độ và bảng chân trị giữ đúng [06-layout.md](../implementation/06-layout.md).

- G0 có thể chiếu thẳng vào A, thẳng vào B hoặc vào lăng kính. Chiếu thẳng chỉ làm một thiết bị hoạt động.
- Khi G0 chiếu vào lăng kính, nhánh trái tới G1 và nhánh phải tới G2. Xoay G1 vào A, G2 vào B để giữ cả hai sáng.
- Mốc gọi bên máy đưa Lumo qua ống lên ấn C. C chỉ hoạt động khi Lumo còn đứng tại đó, và **không có chốt nào giữ C**.
- A, B, C không ghi nhớ việc từng sáng. Cả ba phải hoạt động cùng lúc thì Nhinh mới dùng được E ở cần “Trả dòng”.

### Âm thanh của máy

| Trạng thái | Nghe thấy |
| --- | --- |
| Không mạch nào sống | Chỉ tiếng máy đều, trầm |
| A sống | Thêm một chuông cao, lặp chậm |
| B sống | Thêm một chuông trung, lệch nhịp với A |
| C sống (Lumo ở ấn) | Thêm motif ngắn, mềm, cùng chất với tiếng thoại của Lumo |
| Cả ba | Ba lớp khớp nhịp thành một hợp âm trọn, và vòng trên tường sáng đều |
| Một mạch rơi | Lớp của nó tắt ngay, không có tiếng báo lỗi |
| Sau Trả dòng | Lớp máy dịu dần, nhường cho tiếng nước chảy xuống |

Âm thanh không thay thế dấu hiệu hình ảnh: vòng A/B/C trên tường vẫn sáng hoặc tắt theo đúng mạch. Người chơi tắt tiếng vẫn giải được.

### Lời giải

Hướng G0 vào lăng kính, G1 vào A, G2 vào B, gọi Lumo tới C. Khi cả ba vòng sáng, chuyển cần Trả dòng.

Mô hình ([puzzle-model.mjs](puzzle-model.mjs)): 54 cấu hình (G0, G1, G2 mỗi gương 3 nấc, Lumo có hoặc không ở ấn), **1** cấu hình đúng, 23 cấu hình thỏa đúng hai trong ba điều kiện. Đây là số đo không gian cấu hình theo ý đồ, không phải bằng chứng người chơi thường xuyên ở trạng thái gần lời giải. Các điều kiện có thể phụ thuộc nhau; vòng và lớp nhạc riêng giúp người chơi nhận ra trạng thái mỗi mạch. Độ khó và thời gian cần chơi thử xác nhận.

### Bẫy và phục hồi

- **Chiếu thẳng:** G0 thẳng vào A hoặc B chỉ cho một vòng sáng. Nghe được một giọng, không phải hợp âm.
- **Đổi gương đầu vào khi đã có hai nhánh:** cả A và B tắt cùng lúc, hai lớp nhạc rơi cùng nhau. Đây là bài học của bàn thử.
- **Gọi Lumo về trước khi chuyển cần:** C tắt, máy trở lại chờ, không mất gì khác.

### Thoại

*Khi chỉ một mạch sáng:*

**Lumo:** “Một vòng máy đã chạy. Hai vòng còn lại vẫn đứng.”\
**Nhinh:** “Và vòng trước dừng khi mình đổi tia. Chúng cần hoạt động cùng nhau.”

*Khi gọi Lumo tới C:*

**Nhinh:** “Cậu giữ ấn cuối nhé. Tôi chỉnh hai nhánh này.”\
**Lumo:** “Tôi ở đây. Cậu cứ thử từng gương.”\
**Lumo:** “Ở đây không có chốt nào giữ thay tôi, đúng không?” *(mới)*\
**Nhinh:** “Ừ. Cậu giữ tới khi máy chuyển chế độ.” *(mới)*

*Nếu Lumo rời ấn C trước khi chuyển cần:*

**Lumo:** “Tôi rời ấn rồi. Vòng thứ ba vừa dừng.” *(mới)*

*Khi đủ ba mạch:*

**Lumo:** “Cả ba vòng đều đang quay!”\
**Nhinh:** “Tôi sẽ chuyển cần. Cậu giữ nguyên một chút.”

*Nhinh dùng E chuyển cần. Bánh răng khóa ở chế độ Trả dòng; đèn tháp dịu xuống, nước đổi hướng chảy xuống rừng. Cửa buồng tinh thể mở.*

**Nhinh:** “Xong rồi. Máy tự giữ chế độ mới. Cậu về được rồi, Lumo.”\
**Lumo:** “Tôi nghe tiếng suối!”

Nếu một điều kiện mất trước khi chuyển cần, máy chỉ trở lại chờ. Sau khi cần đã chuyển, lấy đèn hoặc gọi Lumo về không đảo kết quả. Người chơi thu hồi đèn rồi nhận tinh thể bằng E.

### Độ khó

Rubric (xem [README](README.md)): Thông tin 1 · Kế hoạch 1 · Đồng thời 3 · Không gian 2 · Đảo luật 0 = **7**. Đây là màn đầu tiên trục Đồng thời đạt mức 3. Thời gian giải mục tiêu: 10–15 phút.

## 5. Bản ghi bên cửa sổ

*Nhận tinh thể xanh mở ngăn bản ghi dưới cửa sổ. Nhinh chạm vào; tiếng mưa và giọng đàn ông vang lên.*

**Người Bảo Vệ — bản ghi:** “Đội tìm kiếm đã trở về. Con bé vẫn chưa có mặt.”\
**Người Bảo Vệ — bản ghi:** “Tôi sẽ giữ ngọn tháp sáng thêm một đêm. Nếu con nhìn thấy, cứ đi về phía ánh đèn. Cha ở đây.”

*Tiếng máy trong bản ghi tăng lên, rồi tắt. Nhinh nhìn chiếc khăn trên bậu cửa.*

**Nhinh:** “Ông ấy đang đợi con gái.”\
**Lumo:** “Tôi nhớ chiếc khăn này. Nó từng đỏ.”\
**Nhinh:** “Cậu có nhớ cô bé trở về không?”\
**Lumo:** “Không. Tôi chỉ nhớ ánh đèn không được tắt.”\
**Nhinh:** “Mình đã trả nước cho rừng. Nhưng vẫn cần biết chuyện gì xảy ra ở Cây Mẹ.”

Không kết luận số phận cô bé; bản ghi chỉ xác nhận lý do chờ đợi. Chưa tiết lộ Lumo đã giúp duy trì ánh sáng vĩnh cửu.

*Câu “Cậu giữ tới khi máy chuyển chế độ” ở §4 được viết để vang lại câu “Tôi sẽ giữ ngọn tháp sáng thêm một đêm”. Cả Lumo lẫn Người Bảo Vệ đều đang giữ một thứ; chỉ Lumo được bảo khi nào thì thôi.*

### Mạch phụ — những vạch đếm (tùy chọn)

Dùng Pulse gần khung cửa sổ, một dãy vạch khắc nhỏ hiện ra trên gỗ.

**Nhinh:** “Những vạch đếm… nhiều quá.” *(mới)*\
**Lumo:** “Mỗi vạch là một đêm?” *(mới)*

Ghi vào trang sổ “Những dấu nhỏ” (2/5). Không ảnh hưởng tiến trình.

## 6. Gợi ý H và lời thoại bổ sung

- **Mức 1 — quan sát:** “Ba vòng trên máy nối tới hai mắt đá và ấn dành cho tôi. Bàn thử cho thấy cách tách tia.”
- **Mức 2 — quan hệ:** “Gương chung phải cấp cho lăng kính để hai nhánh cùng sáng. Tôi giữ điều kiện thứ ba.”
- **Mức 3 — bước tiếp:** “Hướng G0 vào lăng kính, G1 vào A, G2 vào B. Gọi tôi tới C rồi dùng cần Trả dòng khi cả ba sáng.”

Sau khi chuyển cần, H hướng dẫn lấy lại đèn, nhận tinh thể và nghe bản ghi còn chưa xem. Bàn thử là phần học tùy chọn: mục tiêu và H nói rõ có thể đặt đèn thẳng lên bệ chính. Cuộc đoàn tụ với Lumo (gọi về ở mốc gọi, rồi đứng gần) là mốc hoàn thành được nêu trong HUD, H và lời từ chối ở bậc thang (quyết định D3). Tương tác lại cửa sổ: **Nhinh:** “Ông đã đứng ở đây qua bao nhiêu đêm?”

**HUD:** dòng mục tiêu theo bước (“Tìm cách đổi chế độ của máy.”, “Lấy lại đèn và nhận tinh thể.”, “Đi cùng Lumo xuống khu vườn.”) *(mới)*. Dòng trạng thái theo kế hoạch tranh v2: `A ○ · B ○ · C ○ · Nước ↑/↓`. Không dòng nào khẳng định một mạch đang sống chỉ vì nó từng sống.

## 7. Kết màn và trạng thái giữ lại

*Hai người theo lối xuống phía vườn. Dòng nước chạy bên cầu thang. Qua cửa sổ cuối, những bông hoa dưới chân tháp vẫn mở bất động trong ánh trắng còn sót.*

**Lumo:** “Nước đã trở lại. Sao những cây nhỏ vẫn cúi đầu?”\
**Nhinh:** “Mình xuống gần xem.”

Hoàn thành khi đã chuyển máy, thu hồi đèn, nhận Tinh thể Hy Vọng, nghe bản ghi và Lumo đã về bên Nhinh. Giữ hướng gương, chế độ Trả dòng, tinh thể và bản ghi; không đòi lặp lại ba điều kiện khi quay lại. Vạch đếm đã thấy được lưu vào sổ.

**Ghi chép nhận được:** lăng kính chia tia; ba điều kiện đồng thời; ấn không có chốt thì phải có người giữ; bản ghi người cha đợi con.\
**Chuyển tiếp:** [Level 07 — The Sleeping Garden](07-the-sleeping-garden.md).

## 8. Tác động triển khai

- **Không đổi:** `towerLayout.ts`, bảng chân trị, khóa lưu `l5-*`, thoại và thang H đã có. Toàn bộ phần này nằm ngoài phạm vi của kế hoạch tranh v2.
- **Âm thanh:** thêm các lớp vào hệ âm thanh Web Audio hiện có (`src/audio/`), điều khiển từ `deriveTowerLive` mỗi khung hình. Lớp chỉ đổi khi trạng thái sống đổi; không phát tiếng báo lỗi.
- **Thoại:** ba dòng mới ở §4 và hai dòng của mạch phụ.
- **Mạch phụ:** một decal vạch đếm trên khung cửa sổ, hiện bằng Pulse; cờ mới `l5-tally-seen`.
- **Thứ tự:** làm sau khi tranh v2 của màn này đã gộp, để không chạm vào cùng file với kế hoạch đang chạy.
