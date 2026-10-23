# Level 07 — The Sleeping Garden (v2)

**Tên màn:** Khu Vườn Đang Ngủ.\
**Chặng:** Cân Bằng — học dành chỗ cho bóng tối. **Chỗ thở** của đường cong, đồng thời là lần đảo luật đầu tiên.\
**Nhân vật:** Nhinh, Lumo.\
**Đầu vào:** Có Tinh thể Ký Ức và Tinh thể Hy Vọng; tháp đã trả nước.\
**Mục tiêu:** Đưa nước tới vườn ươm và mở đường vào điện thờ.\
**Kỹ năng mới:** Đảo luật. Trọng tâm là bóng tối cho sự sống và đường đi vật lý; màn 3 và 5 đã cần tắt đèn để đọc thông tin, nên đây không phải lần đầu bóng tối có ích.

**Trạng thái:** đã triển khai trên nhánh `feat/level07-scenario-v2` (§8 và các dòng thoại, H, HUD, J *(mới)*). Chưa merge vào `test-develop`. Bản v1 [docs/scenario/07-the-sleeping-garden.md](../scenario/07-the-sleeping-garden.md) được giữ nguyên làm lịch sử. Phần còn thiếu và bản tạm chờ art (bàn tay trên đá) được ghi trong [docs/implementation/07-layout.md](../implementation/07-layout.md), mục Scenario v2.

> **Thay đổi so với bản hiện tại**
>
> - **Màn này cố ý dễ hơn màn 6.** Chỉ một điều phải hiểu: gài chốt thanh chắn trước khi tắt đèn. Sau đỉnh đồng thời của màn 6, người chơi được nghỉ, và phần thưởng là âm thanh của đêm trở lại.
> - **Âm thanh là tiến trình:** mỗi bước đúng trả lại một tiếng đêm (dế, nước, tiếng dế đáp). Đây cũng là những âm sẽ trở lại ở cảnh bình minh màn 10.
> - **Lối đá phụ không bắt buộc để thấy dấu tay.** Bản hiện tại bắt gài chốt lối phụ mới cho qua cổng, dù cổng điện thờ nằm cùng phía với vườn ươm. Ở v2, người chơi có thể đi qua rễ khi tối, bật đèn ở bờ Tây rồi dùng Pulse để thấy dấu tay; lối phụ hữu ích làm đường về ổn định khi đèn bật, nhưng không bắt buộc.
> - Khi tắt đèn trên cầu rễ, Lumo bay trước dẫn đường. Đây là nhịp tin cậy, không phải một cơ chế mới.
> - HUD chỉ nêu mục tiêu.
> - Giữ nguyên: bố cục, cây, cầu rễ, luật “ánh Lumo không làm cây đổi trạng thái”, cảnh vườn ươm, cảnh bóng người ở cổng.

## 1. Không gian và nhịp cảm xúc

Hoa Nhật nở trắng dọc hàng rào, nhưng dưới chúng là những cây non chưa lớn. Một bể tích quang cũ vẫn phát ánh sáng mà tháp đã gom suốt nhiều năm. Nước mới trở lại chỉ chảy ngoài mép vườn; cống vào vườn ươm đóng kín.

Màn tạo một khoảng nghỉ sau tiếng máy trên tháp. Khi bóng tối trở lại, âm thanh côn trùng xuất hiện từng chút. Thành công được thể hiện bằng sự sống nhỏ bé, không bằng một vụ nổ ánh sáng.

Màn được thiết kế nhẹ hơn màn 6. Ý mới là bóng tối nuôi sự sống và tạo đường đi vật lý; người chơi giữ thanh chắn bằng chốt rồi đi qua cầu rễ trong tối, sau đó có thể bật đèn ở bờ Tây để dùng Pulse.

### Tiếng đêm trở lại

| Khoảnh khắc | Âm thanh |
| --- | --- |
| Che bể tích quang | Ánh nền dịu xuống, tiếng ù của bể tắt. Im lặng, rồi một tiếng dế ngắn |
| Rễ Nguyệt vươn thành cầu | Tiếng rễ cọ khẽ, một tiếng nước nhỏ dưới mương |
| Mở cống vườn ươm | Nước chảy liên tục, mềm |
| Lá non mở (cảnh vườn ươm) | Tiếng dế thứ hai trả lời |

Bật lại đèn không làm mất những tiếng đã có; chỉ cầu rễ phản ứng. Âm thanh ghi nhận tiến trình, không ghi nhận trạng thái đèn.

## 2. Mở cảnh — hoa không khép cánh

**Lumo:** “Hoa ở đây vẫn nở. Tôi tưởng vậy là tốt.”\
**Nhinh:** “Nhưng cây non dưới này không có lá mới.”\
**Lumo:** “Nước đã về rồi mà.”\
**Nhinh:** “Ánh từ bể kia vẫn chiếu xuống. Thử che nó lại xem.”

*E tại tay kéo cạnh lối vào đóng màn chắn bể tích quang. Đây là một chốt cố định, dùng được ngay. Ánh nền dịu xuống; đèn Nhinh trở thành nguồn sáng điều khiển câu đố.*

**Lumo:** “Tối đi thật.”\
**Nhinh:** “Nghe kìa.”

*Một tiếng dế ngắn vang lên rồi im.*

## 3. Khu thử an toàn — hai loại cây

Hai chậu cạnh nhau mang nhãn Hoa Nhật và Rễ Nguyệt. Đèn bật làm Hoa Nhật nâng một thanh gỗ nhỏ, Rễ Nguyệt rút lại. Đèn tắt làm hoa khép, rễ vươn qua một khe hẹp. Khe thử không cản lối đi.

**Nhinh:** “Hoa cần sáng để nâng thanh. Rễ chỉ vươn khi đèn tắt.”\
**Lumo:** “Ánh của tôi không làm rễ co lại.”\
**Nhinh:** “Cậu có thể đi cùng tôi lúc tắt đèn.”

Giữ quy tắc từ màn 5: ánh Lumo đủ để định hướng, không kích hoạt Hoa Nhật hay cản Rễ Nguyệt. Biểu tượng nở/khép trên chậu giúp nhận trạng thái mà không cần dựa vào màu sắc.

## 4. Câu đố chính — giữ một thay đổi để tạo thay đổi khác

Khu chính có thanh chắn do Hoa Nhật nâng, chốt cơ khí nằm ngay sau thanh chắn, cầu Rễ Nguyệt tới vườn ươm và cống nước phía bên kia. Ánh đèn của Nhinh điều khiển các luống qua một mạch cảm biến nối trong vườn, không phụ thuộc việc đứng sát từng cây. Bố cục giữ đúng [07-layout.md](../implementation/07-layout.md).

1. Sau khi che bể tích quang, bật đèn để Hoa Nhật nâng thanh chắn.
2. Đi qua và gài chốt cạnh cột. Thanh chắn được giữ ngay cả khi hoa khép.
3. Tắt đèn. Rễ Nguyệt vươn thành cầu qua mương tới vườn ươm.
4. Qua cầu trong bóng tối và mở cống bằng E để nước tới cây non.
5. Đi tới cổng điện thờ qua nền đất phía sau vườn.

Lối đá phụ cạnh cống vẫn có chốt. Gài nó thì có đường về bờ Tây ngay cả khi đèn bật và cầu rễ co. Bước này **không còn bắt buộc** để qua cổng.

### Điều phải hiểu ra

Đây là bài màn 4 trong hình dạng mới: một thay đổi cần ánh sáng (thanh chắn), một thay đổi cần bóng tối (cầu rễ), và chốt giữ cái thứ nhất để làm được cái thứ hai. Trọng tâm mới là bóng tối tạo sự sống và đường đi; màn 3 và 5 đã dùng bóng tối để đọc thông tin.

### Bẫy và phục hồi

- **Tắt đèn trước khi gài chốt thanh chắn:** thanh hạ xuống, cầu rễ thì vươn ra. Bật đèn lại thì thanh nâng lên và cầu co về. Không có gì mất.
- **Bật đèn khi đang đứng trên cầu:** rễ chỉ rút phần trống và chờ Nhinh tới bờ an toàn. Tắt lại đèn thì cầu khôi phục. Không có thao tác nhanh hay giới hạn thời gian.

*Khi đèn bật làm cầu rễ rút trước lúc qua:*

**Nhinh:** “Mở được cửa thì lại mất cầu.”\
**Lumo:** “Tay chốt sau cửa có giữ được thanh chắn không?”

*Sau khi gài chốt và tắt đèn:*

**Lumo:** “Cửa vẫn mở. Rễ cũng đã nối lại rồi.”\
**Nhinh:** “Giờ chúng không cần cùng phản ứng theo chiếc đèn nữa.”

*Khi Nhinh bước lên cầu rễ trong bóng tối, Lumo bay lên trước, dừng ở giữa cầu rồi ở bờ bên kia. Ánh của cậu là nguồn sáng duy nhất trên mương:*

**Lumo:** “Đi theo ánh của tôi. Nó không làm rễ co lại đâu.” *(mới)*

### Độ khó

Rubric (xem [README](README.md)): Thông tin 1 · Kế hoạch 2 · Đồng thời 0 · Không gian 1 · Đảo luật 2 = **6**, thấp hơn màn 6 (7) và màn 8 (9). Thời gian giải mục tiêu: 7–10 phút.

## 5. Vườn ươm — điều khu rừng cần

*Nhinh mở cống. Nước chảy quanh một mầm cây. Trong bóng tối, lá non chậm rãi mở; Hoa Nhật phía xa khép cánh lần đầu. Tiếng dế trở lại, lần này có tiếng thứ hai trả lời.*

**Lumo:** “Nó vừa mọc thêm một chiếc lá.”\
**Nhinh:** “Có nước. Có lúc nghỉ. Có lẽ nó đã đợi cả hai.”\
**Lumo:** “Tôi cứ nghĩ nếu làm mọi nơi sáng hơn…”\
**Nhinh:** “Cậu muốn giúp rừng tỉnh dậy.”\
**Lumo:** “Nhưng có những thứ cần được ngủ.”\
**Nhinh:** “Mình biết thêm được một điều rồi.”

*Lumo hạ xuống gần mầm cây, giữ ánh sáng thật dịu.*

**Lumo:** “Cứ ngủ đi. Chúng tôi sẽ giữ đường nước mở.”

Đoạn này làm thay đổi niềm tin của Lumo qua một kết quả nhìn thấy được. Không để cậu lập tức biết toàn bộ lời giải cho Cây Mẹ.

### Mạch phụ — bàn tay trên đá (tùy chọn, “Những dấu nhỏ” 3/5)

Sau khi cống mở, nước tràn ngược theo kênh ngang về bờ Tây và làm ướt một phiến đá cạnh bãi cỏ thử. Đi qua cầu rễ khi đèn tắt; sau đó bật đèn ở bờ Tây và dùng Pulse gần phiến đá để dấu bàn tay nhỏ ánh lên. Pulse cần đèn bật, nhưng không cần gài lối phụ. Khi đèn bật, chốt lối phụ vẫn tạo một đường về ổn định nếu người chơi muốn quay lại bờ Đông.

**Nhinh:** “Có một bàn tay nhỏ in trên đá. Nước vừa làm nó hiện lên.” *(mới)*\
**Lumo:** “Ai đó từng chơi ở đây, lúc đá còn ướt.” *(mới)*

Ghi vào trang sổ “Những dấu nhỏ” (3/5). Không trả lời bàn tay ấy là của ai.

## 6. Gợi ý H và lời thoại bổ sung

- **Mức 1 — quan sát:** “Hai chậu thử phản ứng trái ngược. Sau thanh chắn có một tay chốt.”
- **Mức 2 — quan hệ:** “Giữ thanh chắn bằng chốt, rồi tắt đèn để rễ làm cầu. Một phần đường phải tự giữ trước khi phần kia xuất hiện.”
- **Mức 3 — bước tiếp:** “Bật đèn, qua thanh chắn và gài chốt. Tắt đèn, qua cầu rễ, mở cống rồi tới điện thờ.”

Nếu bể tích quang chưa che, H chỉ hướng tay kéo trước khi nói tới đèn cá nhân. Sau khi mở cống, H hướng tới cổng điện thờ; lối đá phụ chỉ được nhắc nếu người chơi đang ở bờ Đông với đèn bật và cầu đã co.

Xem lại mầm cây: **Nhinh:** “Lá mới mềm hơn những chiếc cũ.”\
**Lumo:** “Ngày mai chắc nó sẽ lớn thêm. Khi ngày mai trở lại.”

**HUD:** “Đưa nước tới vườn ươm.” → “Tới cổng điện thờ.” *(mới)* Dòng trạng thái: hoa mở/khép, thanh chắn giữ/chưa, cầu rễ có/không. Không nêu phím F.

**Phản hồi khi còn khóa (đã có, giữ nguyên ý):** tay chốt Tây khi thanh đang hạ nói rằng thanh phải đang nâng; tay chốt Đông trước khi nước chảy nói rằng cống chưa mở. Cả hai chỉ nêu trạng thái.

## 7. Kết màn và trạng thái giữ lại

*Ở cổng điện thờ, một bóng người đi ngang vệt sáng. Bóng dừng cạnh những mầm cây, rồi biến sau tượng đá.*

*(Bóng chỉ được nhìn thấy, không gọi tên. Phần thoại bên dưới phát sau khi bóng khuất; cảnh này nằm sau mốc kể chuyện ở vườn ươm, vốn là điều kiện hoàn thành, theo quyết định D3.)*

**Lumo:** “Có ai ở đó.”\
**Nhinh:** “Người ấy vừa che ánh sáng khỏi luống cây.”\
**Lumo:** “Giống việc mình vừa làm?”\
**Nhinh:** “Mình tới hỏi xem.”

Hoàn thành khi màn chắn bể đã che, chốt thanh chắn đã gài, cống đã mở, cảnh vườn ươm đã xem và Nhinh tới cổng. Giữ màn chắn bể, cống, các chốt và cảnh mầm cây; tải lại không làm vườn bị chiếu sáng như trước. Bàn tay trên đá đã thấy được lưu vào sổ.

**Ghi chép nhận được:** Hoa Nhật và Rễ Nguyệt; cây non cần bóng tối; chốt giữ thay đổi khi đèn đổi trạng thái.\
**Chuyển tiếp:** [Level 08 — Ruins of Two Halves](08-ruins-of-two-halves.md).

## 8. Tác động triển khai

- **Logic (`sleepingGardenLayout.ts`):** bỏ `side` khỏi `completionBlock`. Lối phụ, chốt Đông và cờ `l6-return-latched` giữ nguyên.
- **Âm thanh:** bốn nhịp ở bảng §1, dùng lại các công thức `endingCue('cricket' | 'water' | 'answer')` đã có trong `src/audio/effects.ts`, để màn 10 vang lại đúng những âm này.
- **Lumo dẫn đường trên cầu:** chỉ đổi điểm bay của Lumo khi cầu đang có và đèn tắt; không chạm vào luật cây.
- **Mạch phụ:** một decal bàn tay trên phiến đá bờ Tây, hiện khi `l6-water-flowing` và Pulse; cờ mới `l6-handprint-seen`.
- **Kiểm tra:** cập nhật ca hoàn thành trong `scripts/check-sleeping-garden.mjs` (không còn đòi `l6-return-latched`); cập nhật mức 3 để đi thẳng tới điện thờ, không yêu cầu chốt lối phụ.
